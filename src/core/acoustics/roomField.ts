import type { RoomObject, SpaceKind, Speaker, Vec2, Vec3 } from '../types'
import { clamp, degToRad } from '../../lib/math'
import {
  coverageDirectivity,
  effectiveCoverageDeg,
} from './directivity'
import { MIN_SPL_DB } from './directField'
import { axisAlignedRectangle } from '../geometry/dimensions'
import { pointInPolygon } from '../geometry/polygon'
import { sourceAtRadiator } from './radiator'
import { wavePressureAtPoint } from './waveSolver'
import {
  extraReflectionPaths,
  horizontalSurfaceCovered,
  pointInSolid,
  segmentBlockedBySolids,
  solidBoxes,
  type SolidBox,
} from './reflections'

export const SPEED_OF_SOUND_M_S = 343
export const WALL_ABSORPTION = 0.1
export const REFLECTION_COEFFICIENT = Math.sqrt(1 - WALL_ABSORPTION)
export const MODAL_FADE_LOW_HZ = 200
export const MODAL_FADE_HIGH_HZ = 400
export const DEFAULT_PREVIEW_FREQUENCY_HZ = 80

export const IRREGULAR_ROOM_WARNING =
  'Bass follows this floor plan. Above 400 Hz the map uses specular reflections.'

export const OBJECT_REFLECTION_WARNING =
  'Solid objects block and reflect sound, so the empty-room bass model is turned off.'

export interface FieldOptions {
  objects?: readonly RoomObject[]
  reflectionOrder?: number
  /** Open space skips walls, the ceiling, and the bass mode solve. */
  kind?: SpaceKind
  /**
   * Rectangular bass modes built once for a preview.
   * Absent means each sample builds its own list.
   */
  preparedModes?: PreparedModes | null
}

export function normalizeReflectionOrder(order: number | undefined): number {
  if (typeof order !== 'number' || !Number.isFinite(order)) return 1
  return Math.min(3, Math.max(0, Math.round(order)))
}

const MIN_DISTANCE_M = 0.05
const MAX_MODES = 5000

export type FieldModel = 'modes' | 'wave' | 'reflections' | 'blend'

export interface RoomShell {
  boundary: readonly Vec2[]
  height: number
  kind?: SpaceKind
}

export interface PathContribution {
  /** Linear gain before spherical spreading. Includes directivity and R. */
  linearGain: number
  distanceM: number
}

interface Complex {
  re: number
  im: number
}

interface Mode {
  nx: number
  ny: number
  nz: number
  omega: number
}

interface PreparedModes {
  modes: Mode[]
  volume: number
  t60: number
  lx: number
  ly: number
  lz: number
  minX: number
  minY: number
}

export function fieldModelFor(
  frequencyHz: number,
  rectangular: boolean,
): FieldModel {
  if (frequencyHz >= MODAL_FADE_HIGH_HZ) return 'reflections'
  if (frequencyHz <= MODAL_FADE_LOW_HZ) return rectangular ? 'modes' : 'wave'
  return 'blend'
}

export function fieldModelLabel(model: FieldModel, rectangular: boolean): string {
  if (model === 'modes') return 'modes'
  if (model === 'wave') return 'standing waves'
  if (model === 'reflections') return 'reflections'
  return rectangular ? 'modes + reflections' : 'standing waves + reflections'
}

export function roomFieldWarning(
  boundary: readonly Vec2[],
  kind?: SpaceKind,
): string | null {
  if (kind === 'open') return null
  if (boundary.length < 3) return null
  if (axisAlignedRectangle(boundary)) return null
  return IRREGULAR_ROOM_WARNING
}

/**
 * Coherent sum of spherical paths at one frequency.
 * Level is relative to 1 m, on axis, with a linear gain of 1.
 */
export function coherentPathLevelDb(
  paths: readonly PathContribution[],
  frequencyHz: number,
): number {
  return levelFromComplex(sumPaths(paths, frequencyHz))
}

export function levelAtPoint(
  room: RoomShell,
  source: Speaker,
  point: Vec3,
  frequencyHz: number,
  options?: FieldOptions,
): number {
  return levelFromComplex(pressureAtPoint(room, source, point, frequencyHz, options))
}

/**
 * Speakers are summed with phase kept, so a phase flip or a delay
 * moves the peaks and nulls wherever more than one speaker is on.
 */
export function speakersLevelAtPoint(
  room: RoomShell,
  speakers: readonly Speaker[],
  point: Vec3,
  frequencyHz: number,
  options?: FieldOptions,
): number {
  const sum: Complex = { re: 0, im: 0 }
  for (const speaker of speakers) {
    if (!speaker.enabled) continue
    const pressure = pressureAtPoint(room, speaker, point, frequencyHz, options)
    sum.re += pressure.re
    sum.im += pressure.im
  }
  return levelFromComplex(sum)
}

function pressureAtPoint(
  room: RoomShell,
  source: Speaker,
  point: Vec3,
  frequencyHz: number,
  options?: FieldOptions,
): Complex {
  if (!source.enabled) return { re: 0, im: 0 }
  if (!Number.isFinite(frequencyHz) || frequencyHz <= 0) return { re: 0, im: 0 }
  if (room.boundary.length < 3) return { re: 0, im: 0 }

  source = sourceAtRadiator(source)
  const boxes = solidBoxes(options?.objects)
  const reflectionOrder = normalizeReflectionOrder(options?.reflectionOrder)
  if (boxes.length > 0) {
    for (const box of boxes) {
      if (pointInSolid(point, box) || pointInSolid(source.position, box)) {
        return { re: 0, im: 0 }
      }
    }
  }

  if (room.kind === 'open') {
    return applyDrive(
      openPressure(source, point, frequencyHz, boxes, reflectionOrder),
      source,
      frequencyHz,
    )
  }

  const rectangular = axisAlignedRectangle(room.boundary) !== null
  const model = fieldModelFor(frequencyHz, rectangular)
  let pressure: Complex
  const image = () =>
    imagePressure(room, source, point, frequencyHz, boxes, reflectionOrder)

  if (boxes.length > 0) {
    pressure = image()
  } else if (model === 'modes') {
    pressure = modalPressureFor(room, source, point, frequencyHz, options)
  } else if (model === 'wave') {
    pressure = wavePressureAtPoint(
      room.boundary,
      room.height,
      source,
      point,
      frequencyHz,
    )
  } else if (model === 'reflections') {
    pressure = image()
  } else {
    const low = rectangular
      ? modalPressureFor(room, source, point, frequencyHz, options)
      : wavePressureAtPoint(
          room.boundary,
          room.height,
          source,
          point,
          frequencyHz,
        )
    pressure = blendPressures(low, image(), frequencyHz)
  }

  return applyDrive(pressure, source, frequencyHz)
}

function blendPressures(
  low: Complex,
  high: Complex,
  frequencyHz: number,
): Complex {
  const weight = clamp(
    (frequencyHz - MODAL_FADE_LOW_HZ) / (MODAL_FADE_HIGH_HZ - MODAL_FADE_LOW_HZ),
    0,
    1,
  )
  const lowWeight = Math.sqrt(1 - weight)
  const highWeight = Math.sqrt(weight)
  return {
    re: lowWeight * low.re + highWeight * high.re,
    im: lowWeight * low.im + highWeight * high.im,
  }
}

/** Polarity and delay rotate this speaker against the others. */
function applyDrive(
  pressure: Complex,
  source: Speaker,
  frequencyHz: number,
): Complex {
  const flip = source.phaseInverted ? -1 : 1
  const delaySec = Number.isFinite(source.delayMs) ? source.delayMs / 1000 : 0
  const phase = -2 * Math.PI * frequencyHz * delaySec
  const re = flip * Math.cos(phase)
  const im = flip * Math.sin(phase)
  return {
    re: pressure.re * re - pressure.im * im,
    im: pressure.re * im + pressure.im * re,
  }
}

function sumPaths(
  paths: readonly PathContribution[],
  frequencyHz: number,
): Complex {
  const acc: Complex = { re: 0, im: 0 }
  const k = (2 * Math.PI * frequencyHz) / SPEED_OF_SOUND_M_S
  for (const path of paths) {
    if (!Number.isFinite(path.linearGain) || path.linearGain === 0) continue
    if (!Number.isFinite(path.distanceM) || path.distanceM <= 0) continue
    addSpherical(acc, path.linearGain, path.distanceM, k)
  }
  return acc
}

function addSpherical(
  acc: Complex,
  linearGain: number,
  distance: number,
  k: number,
): void {
  const amplitude = linearGain / Math.max(distance, MIN_DISTANCE_M)
  const phase = -k * Math.max(distance, 1e-4)
  acc.re += amplitude * Math.cos(phase)
  acc.im += amplitude * Math.sin(phase)
}

function levelFromComplex(value: Complex): number {
  const magnitude = Math.hypot(value.re, value.im)
  if (magnitude <= 1e-12) return MIN_SPL_DB
  return Math.max(MIN_SPL_DB, 20 * Math.log10(magnitude))
}

function sourceGain(source: Speaker): number {
  return Math.pow(10, source.gainDb / 20)
}

function horizontalDirectivity(
  source: Speaker,
  from: Vec3,
  to: Vec3,
  frequencyHz: number,
): number {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const horizontal = Math.hypot(dx, dy)
  const yaw = degToRad(source.yawDeg)
  const aimX = -Math.sin(yaw)
  const aimY = -Math.cos(yaw)
  const cosine =
    horizontal < 1e-9 ? 1 : clamp((dx * aimX + dy * aimY) / horizontal, -1, 1)
  const offAxis = Math.acos(cosine)
  return coverageDirectivity(
    offAxis,
    effectiveCoverageDeg(source.coverageHorizontalDeg, frequencyHz),
  )
}

function imagePressure(
  room: RoomShell,
  source: Speaker,
  point: Vec3,
  frequencyHz: number,
  boxes: readonly SolidBox[],
  reflectionOrder: number,
): Complex {
  const paths: PathContribution[] = []
  const gain = sourceGain(source)
  const directivity = horizontalDirectivity(
    source,
    source.position,
    point,
    frequencyHz,
  )
  const directDistance = Math.hypot(
    point.x - source.position.x,
    point.y - source.position.y,
    point.z - source.position.z,
  )
  if (
    directivity > 0 &&
    directDistance > 0 &&
    segmentInside(room.boundary, source.position, point) &&
    !segmentBlockedBySolids(source.position, point, boxes)
  ) {
    paths.push({ linearGain: gain * directivity, distanceM: directDistance })
  }

  if (reflectionOrder >= 1) {
    collectSurfaceImages(room, source, point, frequencyHz, gain, paths, boxes)
    if (reflectionOrder >= 2 || boxes.length > 0) {
      const extra = extraReflectionPaths(
        room,
        source,
        point,
        frequencyHz,
        boxes,
        reflectionOrder,
        REFLECTION_COEFFICIENT,
      )
      for (const path of extra) paths.push(path)
    }
  }
  return sumPaths(paths, frequencyHz)
}

function collectSurfaceImages(
  room: RoomShell,
  source: Speaker,
  point: Vec3,
  frequencyHz: number,
  gain: number,
  paths: PathContribution[],
  boxes: readonly SolidBox[],
): void {
  const boundary = room.boundary
  for (let index = 0; index < boundary.length; index++) {
    const start = boundary[index]
    const end = boundary[(index + 1) % boundary.length]
    addWallImage(room, start, end, source, point, frequencyHz, gain, paths, boxes)
  }

  if (!(room.height > 0)) return
  addFloorImage(room, source, point, frequencyHz, gain, paths, boxes)
  addCeilingImage(room, source, point, frequencyHz, gain, paths, boxes)
}

function addWallImage(
  room: RoomShell,
  start: Vec2,
  end: Vec2,
  source: Speaker,
  point: Vec3,
  frequencyHz: number,
  gain: number,
  paths: PathContribution[],
  boxes: readonly SolidBox[],
): void {
  const image = mirror2D(source.position, start, end)
  if (!image) return

  const hit = raySegmentHit(point, image, start, end)
  if (!hit) return

  const bounceZ = point.z + hit.t * (source.position.z - point.z)
  const height = room.height > 0 ? room.height : Infinity
  if (bounceZ < -1e-3 || bounceZ > height + 1e-3) return

  const bounce = { x: hit.x, y: hit.y, z: bounceZ }
  if (
    !segmentInside(room.boundary, source.position, bounce) ||
    !segmentInside(room.boundary, bounce, point) ||
    segmentBlockedBySolids(source.position, bounce, boxes) ||
    segmentBlockedBySolids(bounce, point, boxes)
  ) {
    return
  }

  const directivity = horizontalDirectivity(
    source,
    source.position,
    bounce,
    frequencyHz,
  )
  if (directivity <= 0) return

  const distance = Math.hypot(
    point.x - image.x,
    point.y - image.y,
    point.z - source.position.z,
  )
  paths.push({
    linearGain: gain * directivity * REFLECTION_COEFFICIENT,
    distanceM: distance,
  })
}

function addFloorImage(
  room: RoomShell,
  source: Speaker,
  point: Vec3,
  frequencyHz: number,
  gain: number,
  paths: PathContribution[],
  boxes: readonly SolidBox[],
): void {
  const denom = point.z + source.position.z
  if (denom <= 1e-6) return
  const t = point.z / denom
  if (t <= 1e-4 || t >= 1 - 1e-4) return

  const bounce = {
    x: point.x + t * (source.position.x - point.x),
    y: point.y + t * (source.position.y - point.y),
    z: 0,
  }
  if (!pointInPolygon(bounce, room.boundary)) return
  if (horizontalSurfaceCovered(bounce.x, bounce.y, boxes, 'floor', room.height)) return
  if (
    !segmentInside(room.boundary, source.position, bounce) ||
    !segmentInside(room.boundary, bounce, point) ||
    segmentBlockedBySolids(source.position, bounce, boxes) ||
    segmentBlockedBySolids(bounce, point, boxes)
  ) {
    return
  }

  const directivity = horizontalDirectivity(
    source,
    source.position,
    bounce,
    frequencyHz,
  )
  if (directivity <= 0) return

  const imageZ = -source.position.z
  paths.push({
    linearGain: gain * directivity * REFLECTION_COEFFICIENT,
    distanceM: Math.hypot(
      point.x - source.position.x,
      point.y - source.position.y,
      point.z - imageZ,
    ),
  })
}

function addCeilingImage(
  room: RoomShell,
  source: Speaker,
  point: Vec3,
  frequencyHz: number,
  gain: number,
  paths: PathContribution[],
  boxes: readonly SolidBox[],
): void {
  const height = room.height
  const imageZ = 2 * height - source.position.z
  const denom = imageZ - point.z
  if (Math.abs(denom) < 1e-6) return
  const t = (height - point.z) / denom
  if (t <= 1e-4 || t >= 1 - 1e-4) return

  const bounce = {
    x: point.x + t * (source.position.x - point.x),
    y: point.y + t * (source.position.y - point.y),
    z: height,
  }
  if (!pointInPolygon(bounce, room.boundary)) return
  if (horizontalSurfaceCovered(bounce.x, bounce.y, boxes, 'ceiling', room.height)) return
  if (
    !segmentInside(room.boundary, source.position, bounce) ||
    !segmentInside(room.boundary, bounce, point) ||
    segmentBlockedBySolids(source.position, bounce, boxes) ||
    segmentBlockedBySolids(bounce, point, boxes)
  ) {
    return
  }

  const directivity = horizontalDirectivity(
    source,
    source.position,
    bounce,
    frequencyHz,
  )
  if (directivity <= 0) return

  paths.push({
    linearGain: gain * directivity * REFLECTION_COEFFICIENT,
    distanceM: Math.hypot(
      point.x - source.position.x,
      point.y - source.position.y,
      point.z - imageZ,
    ),
  })
}

function mirror2D(point: Vec2, start: Vec2, end: Vec2): Vec2 | null {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const length2 = dx * dx + dy * dy
  if (length2 < 1e-12) return null
  const t = ((point.x - start.x) * dx + (point.y - start.y) * dy) / length2
  const projX = start.x + t * dx
  const projY = start.y + t * dy
  return { x: projX * 2 - point.x, y: projY * 2 - point.y }
}

interface RayHit {
  x: number
  y: number
  t: number
}

/** Intersection of origin→through with the finite segment, with t in (0, 1). */
function raySegmentHit(
  origin: Vec2,
  through: Vec2,
  start: Vec2,
  end: Vec2,
): RayHit | null {
  const dx = through.x - origin.x
  const dy = through.y - origin.y
  const sx = end.x - start.x
  const sy = end.y - start.y
  const denom = dx * sy - dy * sx
  if (Math.abs(denom) < 1e-12) return null

  const ox = start.x - origin.x
  const oy = start.y - origin.y
  const t = (ox * sy - oy * sx) / denom
  const u = (ox * dy - oy * dx) / denom
  if (t <= 1e-4 || t >= 1 - 1e-4) return null
  if (u < -1e-3 || u > 1 + 1e-3) return null

  return { x: start.x + u * sx, y: start.y + u * sy, t }
}

function segmentInside(
  boundary: readonly Vec2[],
  from: Vec2,
  to: Vec2,
): boolean {
  for (let step = 1; step <= 3; step++) {
    const t = step / 4
    const sample = {
      x: from.x + (to.x - from.x) * t,
      y: from.y + (to.y - from.y) * t,
    }
    if (!pointInPolygon(sample, boundary)) return false
  }
  return true
}

/** Bass modes for one preview. Open space and non-rectangles return null. */
export function prepareFieldModes(
  room: RoomShell,
  frequencyHz: number,
): PreparedModes | null {
  if (room.kind === 'open') return null
  if (!Number.isFinite(frequencyHz) || frequencyHz <= 0) return null
  return prepareModes(room, Math.max(MODAL_FADE_HIGH_HZ, 2 * frequencyHz))
}

function storedModes(
  room: RoomShell,
  frequencyHz: number,
  options: FieldOptions | undefined,
): PreparedModes | null {
  if (options && 'preparedModes' in options) return options.preparedModes ?? null
  return prepareModes(room, Math.max(MODAL_FADE_HIGH_HZ, 2 * frequencyHz))
}

function modalPressureFor(
  room: RoomShell,
  source: Speaker,
  point: Vec3,
  frequencyHz: number,
  options?: FieldOptions,
): Complex {
  const prepared = storedModes(room, frequencyHz, options)
  if (!prepared) return { re: 0, im: 0 }
  return modalPressure(prepared, source, point, frequencyHz)
}

function openPressure(
  source: Speaker,
  point: Vec3,
  frequencyHz: number,
  boxes: readonly SolidBox[],
  reflectionOrder: number,
): Complex {
  const paths: PathContribution[] = []
  const gain = sourceGain(source)
  const directivity = horizontalDirectivity(
    source,
    source.position,
    point,
    frequencyHz,
  )
  const directDistance = Math.hypot(
    point.x - source.position.x,
    point.y - source.position.y,
    point.z - source.position.z,
  )
  if (
    directivity > 0 &&
    directDistance > 0 &&
    !segmentBlockedBySolids(source.position, point, boxes)
  ) {
    paths.push({ linearGain: gain * directivity, distanceM: directDistance })
  }

  if (reflectionOrder >= 1) {
    addOpenGround(source, point, frequencyHz, gain, paths, boxes)
  }
  return sumPaths(paths, frequencyHz)
}

/** Infinite ground. The bounce does not have to land inside the audience. */
function addOpenGround(
  source: Speaker,
  point: Vec3,
  frequencyHz: number,
  gain: number,
  paths: PathContribution[],
  boxes: readonly SolidBox[],
): void {
  const denom = point.z + source.position.z
  if (denom <= 1e-6) return
  const t = point.z / denom
  if (t <= 1e-4 || t >= 1 - 1e-4) return

  const bounce = {
    x: point.x + t * (source.position.x - point.x),
    y: point.y + t * (source.position.y - point.y),
    z: 0,
  }
  if (horizontalSurfaceCovered(bounce.x, bounce.y, boxes, 'floor', 1)) return
  if (
    segmentBlockedBySolids(source.position, bounce, boxes) ||
    segmentBlockedBySolids(bounce, point, boxes)
  ) {
    return
  }

  const directivity = horizontalDirectivity(
    source,
    source.position,
    bounce,
    frequencyHz,
  )
  if (directivity <= 0) return

  const imageZ = -source.position.z
  paths.push({
    linearGain: gain * directivity * REFLECTION_COEFFICIENT,
    distanceM: Math.hypot(
      point.x - source.position.x,
      point.y - source.position.y,
      point.z - imageZ,
    ),
  })
}

function prepareModes(room: RoomShell, maxHz: number): PreparedModes | null {
  const rectangle = axisAlignedRectangle(room.boundary)
  if (!rectangle || !(room.height > 0)) return null

  const lx = rectangle.width
  const ly = rectangle.depth
  const lz = room.height
  const modes = enumerateModes(lx, ly, lz, maxHz)
  const surface =
    2 * (lx * ly + ly * lz + lz * lx)
  const volume = lx * ly * lz
  const absorption = surface * WALL_ABSORPTION
  if (absorption <= 0 || volume <= 0) return null

  return {
    modes,
    volume,
    t60: (0.161 * volume) / absorption,
    lx,
    ly,
    lz,
    minX: rectangle.minX,
    minY: rectangle.minY,
  }
}

function enumerateModes(
  lx: number,
  ly: number,
  lz: number,
  maxHz: number,
): Mode[] {
  const modes: Mode[] = []
  const nxMax = Math.max(0, Math.floor((2 * maxHz * lx) / SPEED_OF_SOUND_M_S))
  const nyMax = Math.max(0, Math.floor((2 * maxHz * ly) / SPEED_OF_SOUND_M_S))
  const nzMax = Math.max(0, Math.floor((2 * maxHz * lz) / SPEED_OF_SOUND_M_S))

  for (let nx = 0; nx <= nxMax; nx++) {
    for (let ny = 0; ny <= nyMax; ny++) {
      for (let nz = 0; nz <= nzMax; nz++) {
        if (nx === 0 && ny === 0 && nz === 0) continue
        const frequency =
          (SPEED_OF_SOUND_M_S / 2) *
          Math.hypot(nx / lx, ny / ly, nz / lz)
        if (frequency > maxHz) continue
        modes.push({ nx, ny, nz, omega: 2 * Math.PI * frequency })
        if (modes.length >= MAX_MODES) return modes
      }
    }
  }
  return modes
}

function modeNorm(nx: number, ny: number, nz: number): number {
  const epsilon = (index: number) => (index === 0 ? 1 : 2)
  return 1 / (epsilon(nx) * epsilon(ny) * epsilon(nz))
}

function modeShape(
  mode: Mode,
  x: number,
  y: number,
  z: number,
  lx: number,
  ly: number,
  lz: number,
): number {
  return (
    Math.cos((mode.nx * Math.PI * x) / lx) *
    Math.cos((mode.ny * Math.PI * y) / ly) *
    Math.cos((mode.nz * Math.PI * z) / lz)
  )
}

/**
 * Rigid-wall modal Green's function, scaled so a free-field monopole
 * would read 0 dB at 1 m. The bulk (0,0,0) mode is omitted.
 */
function modalPressure(
  prepared: PreparedModes,
  source: Speaker,
  point: Vec3,
  frequencyHz: number,
): Complex {
  const omega = 2 * Math.PI * frequencyHz
  const c2 = SPEED_OF_SOUND_M_S * SPEED_OF_SOUND_M_S
  const gain = sourceGain(source)
  const fourPiC2 = 4 * Math.PI * c2
  const sx = source.position.x - prepared.minX
  const sy = source.position.y - prepared.minY
  const sz = source.position.z
  const rx = point.x - prepared.minX
  const ry = point.y - prepared.minY
  const rz = point.z
  const acc: Complex = { re: 0, im: 0 }

  for (const mode of prepared.modes) {
    const psiSource = modeShape(
      mode,
      sx,
      sy,
      sz,
      prepared.lx,
      prepared.ly,
      prepared.lz,
    )
    const psiReceiver = modeShape(
      mode,
      rx,
      ry,
      rz,
      prepared.lx,
      prepared.ly,
      prepared.lz,
    )
    const coupling = psiSource * psiReceiver
    if (coupling === 0) continue

    const q = Math.max((prepared.t60 * (mode.omega / (2 * Math.PI))) / 2.2, 1)
    const denomRe = mode.omega * mode.omega - omega * omega
    const denomIm = (omega * mode.omega) / q
    const denomMag = denomRe * denomRe + denomIm * denomIm
    if (denomMag <= 0) continue

    const factor =
      (fourPiC2 * coupling * gain) /
      (prepared.volume * modeNorm(mode.nx, mode.ny, mode.nz) * denomMag)
    acc.re += factor * denomRe
    acc.im += factor * -denomIm
  }

  return acc
}
