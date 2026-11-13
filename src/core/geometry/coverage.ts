import {
  prepareFieldModes,
  speakersLevelAtPoint,
  type FieldOptions,
} from '../acoustics/roomField'
import { pointInSolid, solidBoxes } from '../acoustics/reflections'
import type { ResolutionMultiplier, Speaker, Vec2 } from '../types'
import type { Bounds2 } from './polygon'
import { pointInPolygon, polygonBounds } from './polygon'

/** Samples along the longest side at 1×, before the multiplier and the cap. */
const LONG_SIDE_SAMPLES = 64
const SPACING_MIN_M = 0.15
const SPACING_MAX_M = 2

export interface CoverageResolution {
  spacing: number
  nx: number
  ny: number
  /** True when the cell cap grew the spacing past the requested multiplier. */
  capped: boolean
}

export function normalizeResolutionMultiplier(
  value: number,
): ResolutionMultiplier {
  if (!Number.isFinite(value)) return 1
  if (value >= 1.5) return 2
  if (value <= 0.75) return 0.5
  return 1
}

function cellCapFor(multiplier: ResolutionMultiplier): number {
  if (multiplier === 0.5) return 2500
  if (multiplier === 2) return 10000
  return 6000
}

function gridCounts(spanX: number, spanY: number, spacing: number) {
  const nx = Math.max(1, Math.ceil(spanX / spacing))
  const ny = Math.max(1, Math.ceil(spanY / spacing))
  return { nx, ny }
}

/**
 * Cell size for a heatmap. 1× aims for 64 samples on the long side.
 * The resolution multiplier divides that spacing, then a cell cap
 * coarsens the grid when the area would still be too heavy.
 */
export function coverageSpacingFor(
  bounds: Bounds2,
  multiplier: number,
): CoverageResolution {
  const spanX = bounds.maxX - bounds.minX
  const spanY = bounds.maxY - bounds.minY
  const factor = normalizeResolutionMultiplier(multiplier)
  if (!(spanX > 0) || !(spanY > 0)) {
    return { spacing: SPACING_MIN_M, nx: 1, ny: 1, capped: false }
  }

  const longest = Math.max(spanX, spanY)
  const base = Math.min(SPACING_MAX_M, Math.max(SPACING_MIN_M, longest / LONG_SIDE_SAMPLES))
  let spacing = base / factor
  let { nx, ny } = gridCounts(spanX, spanY, spacing)
  const cap = cellCapFor(factor)
  let capped = false

  for (let guard = 0; guard < 32 && nx * ny > cap; guard++) {
    capped = true
    spacing *= Math.max(Math.sqrt((nx * ny) / cap), 1.02)
    ;({ nx, ny } = gridCounts(spanX, spanY, spacing))
  }

  return { spacing, nx, ny, capped }
}

export interface CoverageGrid {
  minX: number
  minY: number
  maxX: number
  maxY: number
  spacing: number
  nx: number
  ny: number
  listenerZ: number
  /**
   * Row-major grid values. Before evaluation, inside cells are 0 and
   * outside cells are NaN. After evaluation, inside cells hold relative
   * dB SPL and outside cells stay NaN.
   * Cell (ix, iy) covers [min + i * span / n, min + (i + 1) * span / n)
   * and is sampled at its center, so the raster meets the room bounds.
   */
  values: Float32Array
}

/** Center of cell (ix, iy). The raster for that cell fills its full span. */
export function gridSample(
  grid: Pick<CoverageGrid, 'minX' | 'minY' | 'maxX' | 'maxY' | 'nx' | 'ny'>,
  ix: number,
  iy: number,
): { x: number; y: number } {
  const cellX = grid.nx > 0 ? (grid.maxX - grid.minX) / grid.nx : 0
  const cellY = grid.ny > 0 ? (grid.maxY - grid.minY) / grid.ny : 0
  return {
    x: grid.minX + (ix + 0.5) * cellX,
    y: grid.minY + (iy + 0.5) * cellY,
  }
}

export function buildCoverageGrid(
  boundary: Vec2[],
  spacing: number,
  listenerZ: number,
): CoverageGrid | null {
  if (boundary.length < 3) return null
  if (!Number.isFinite(spacing) || spacing <= 0) {
    throw new RangeError('Coverage spacing must be a positive number.')
  }

  const bounds = polygonBounds(boundary)
  const spanX = bounds.maxX - bounds.minX
  const spanY = bounds.maxY - bounds.minY
  if (spanX <= 0 || spanY <= 0) return null

  const nx = Math.max(1, Math.ceil(spanX / spacing))
  const ny = Math.max(1, Math.ceil(spanY / spacing))
  const values = new Float32Array(nx * ny)
  values.fill(Number.NaN)

  const grid = {
    minX: bounds.minX,
    minY: bounds.minY,
    maxX: bounds.maxX,
    maxY: bounds.maxY,
    nx,
    ny,
  }

  for (let iy = 0; iy < ny; iy++) {
    for (let ix = 0; ix < nx; ix++) {
      const sample = gridSample(grid, ix, iy)
      if (pointInPolygon(sample, boundary)) {
        values[iy * nx + ix] = 0
      }
    }
  }

  return {
    ...grid,
    spacing,
    listenerZ,
    values,
  }
}

export function computeCoverage(
  grid: CoverageGrid,
  speakers: readonly Speaker[],
  room: { boundary: readonly Vec2[]; height: number; kind?: FieldOptions['kind'] },
  frequencyHz: number,
  options?: FieldOptions,
): CoverageGrid {
  const active = speakers.filter((speaker) => speaker.enabled)
  const values = new Float32Array(grid.values.length)
  values.fill(Number.NaN)
  const boxes = solidBoxes(options?.objects)
  const fieldOptions: FieldOptions = {
    ...options,
    preparedModes:
      options && 'preparedModes' in options
        ? options.preparedModes
        : prepareFieldModes(
            {
              boundary: room.boundary,
              height: room.height,
              kind: room.kind,
            },
            frequencyHz,
          ),
  }

  if (active.length === 0) {
    return { ...grid, values }
  }

  for (let iy = 0; iy < grid.ny; iy++) {
    for (let ix = 0; ix < grid.nx; ix++) {
      const index = iy * grid.nx + ix
      if (Number.isNaN(grid.values[index])) continue

      const sample = gridSample(grid, ix, iy)
      const listener = { x: sample.x, y: sample.y, z: grid.listenerZ }
      if (boxes.some((box) => pointInSolid(listener, box))) continue
      values[index] = speakersLevelAtPoint(
        room,
        active,
        listener,
        frequencyHz,
        fieldOptions,
      )
    }
  }

  return { ...grid, values }
}

/** Relative dB of the heatmap cell that contains this floor position. */
export function levelOnCoverageGrid(
  grid: Pick<
    CoverageGrid,
    'minX' | 'minY' | 'maxX' | 'maxY' | 'nx' | 'ny' | 'values'
  >,
  x: number,
  y: number,
): number | undefined {
  if (grid.nx < 1 || grid.ny < 1) return undefined
  const cellX = (grid.maxX - grid.minX) / grid.nx
  const cellY = (grid.maxY - grid.minY) / grid.ny
  if (!(cellX > 0) || !(cellY > 0)) return undefined
  if (x < grid.minX || y < grid.minY || x > grid.maxX || y > grid.maxY) {
    return undefined
  }
  const ix = Math.min(
    grid.nx - 1,
    Math.max(0, Math.floor((x - grid.minX) / cellX)),
  )
  const iy = Math.min(
    grid.ny - 1,
    Math.max(0, Math.floor((y - grid.minY) / cellY)),
  )
  const value = grid.values[iy * grid.nx + ix]
  return Number.isFinite(value) ? value : undefined
}

/**
 * Relative dB at the listener's ear. This is the field solver at that
 * point, so moving the listener updates the value without rebuilding
 * the heatmap.
 */
export function levelAtListener(
  room: {
    boundary: readonly Vec2[]
    height: number
    kind?: FieldOptions['kind']
  },
  speakers: readonly Speaker[],
  point: { x: number; y: number; z: number },
  frequencyHz: number,
  options?: FieldOptions,
): number | undefined {
  if (room.boundary.length < 3) return undefined
  if (!pointInPolygon(point, room.boundary)) return undefined
  if (!speakers.some((speaker) => speaker.enabled)) return undefined

  const boxes = solidBoxes(options?.objects)
  if (boxes.some((box) => pointInSolid(point, box))) return undefined

  const shell = {
    boundary: room.boundary,
    height: room.height,
    kind: room.kind,
  }
  const fieldOptions: FieldOptions = {
    ...options,
    kind: room.kind,
    preparedModes:
      options && 'preparedModes' in options
        ? options.preparedModes
        : prepareFieldModes(shell, frequencyHz),
  }
  const level = speakersLevelAtPoint(
    shell,
    speakers,
    point,
    frequencyHz,
    fieldOptions,
  )
  return Number.isFinite(level) ? level : undefined
}

export function evaluateCoverage(
  boundary: Vec2[],
  spacing: number,
  listenerZ: number,
  speakers: readonly Speaker[],
  roomHeight: number,
  frequencyHz: number,
  options?: FieldOptions,
): CoverageGrid | null {
  const room = {
    boundary,
    height: roomHeight,
    kind: options?.kind ?? 'room',
  }
  const grid = buildCoverageGrid(boundary, spacing, listenerZ)
  if (!grid) return null
  return computeCoverage(grid, speakers, room, frequencyHz, {
    ...options,
    kind: room.kind,
    preparedModes: prepareFieldModes(room, frequencyHz),
  })
}
