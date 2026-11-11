import { powerSumDb, splAtPoint } from '../acoustics/directField'
import type { Speaker, Vec2 } from '../types'
import { pointInPolygon, polygonBounds } from './polygon'

export interface CoverageGrid {
  minX: number
  minY: number
  spacing: number
  nx: number
  ny: number
  listenerZ: number
  /**
   * Row-major grid values. Before evaluation, inside cells are 0 and
   * outside cells are NaN. After evaluation, inside cells hold relative
   * dB SPL and outside cells stay NaN.
   */
  values: Float32Array
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
  const nx = Math.max(
    2,
    Math.ceil((bounds.maxX - bounds.minX) / spacing) + 1,
  )
  const ny = Math.max(
    2,
    Math.ceil((bounds.maxY - bounds.minY) / spacing) + 1,
  )
  const values = new Float32Array(nx * ny)
  values.fill(Number.NaN)

  for (let iy = 0; iy < ny; iy++) {
    const y = bounds.minY + iy * spacing
    for (let ix = 0; ix < nx; ix++) {
      const x = bounds.minX + ix * spacing
      if (pointInPolygon({ x, y }, boundary)) {
        values[iy * nx + ix] = 0
      }
    }
  }

  return {
    minX: bounds.minX,
    minY: bounds.minY,
    spacing,
    nx,
    ny,
    listenerZ,
    values,
  }
}

export function computeCoverage(
  grid: CoverageGrid,
  speakers: readonly Speaker[],
): CoverageGrid {
  const active = speakers.filter((speaker) => speaker.enabled)
  const values = new Float32Array(grid.values.length)
  values.fill(Number.NaN)

  if (active.length === 0) {
    return { ...grid, values }
  }

  const levels: number[] = []

  for (let iy = 0; iy < grid.ny; iy++) {
    const y = grid.minY + iy * grid.spacing
    for (let ix = 0; ix < grid.nx; ix++) {
      const index = iy * grid.nx + ix
      if (Number.isNaN(grid.values[index])) continue

      const point = {
        x: grid.minX + ix * grid.spacing,
        y,
        z: grid.listenerZ,
      }
      levels.length = 0
      for (const current of active) {
        levels.push(splAtPoint(current, point))
      }
      values[index] = powerSumDb(levels)
    }
  }

  return { ...grid, values }
}

export function evaluateCoverage(
  boundary: Vec2[],
  spacing: number,
  listenerZ: number,
  speakers: readonly Speaker[],
): CoverageGrid | null {
  const grid = buildCoverageGrid(boundary, spacing, listenerZ)
  return grid ? computeCoverage(grid, speakers) : null
}
