import type { Speaker, Vec2, Vec3 } from '../types'
import { polygonArea, polygonBounds, pointInPolygon } from '../geometry/polygon'

const SPEED_OF_SOUND_M_S = 343
const WALL_ABSORPTION = 0.1

/**
 * Bass field for a floor plan that is not a rectangle.
 * The room is a straight-up extrusion, so each vertical mode is a 2D
 * Helmholtz problem on the outline. Walls are rigid apart from Sabine loss.
 * Pressure uses the same 4π free-field convention as the rectangle solver.
 */

const MAX_CELLS = 7000
const MAX_VERTICAL_MODES = 6
const SOLVER_TOLERANCE = 1e-4
const SOLVER_ITERATIONS = 400
const CACHE_LIMIT = 4

interface Complex {
  re: number
  im: number
}

interface Mesh {
  nx: number
  ny: number
  dx: number
  dy: number
  minX: number
  minY: number
  count: number
  /** Unknown index of each grid slot, or -1 when the cell is outside. */
  slot: Int32Array
  /** Grid slot of each unknown. */
  slotOf: Int32Array
  /** Four neighbors per unknown, -1 when the face is a wall. */
  neighbor: Int32Array
  /** 1/dx² or 1/dy² for each stored neighbor. */
  coeff: Float64Array
  /** Minus the sum of neighbor coefficients. Laplacian diagonal. */
  degree: Float64Array
  area: number
  t60: number
}

interface ModeField {
  n: number
  re: Float64Array
  im: Float64Array
}

interface WaveSolution {
  key: string
  mesh: Mesh
  modes: ModeField[]
}

const cache: WaveSolution[] = []

export function wavePressureAtPoint(
  boundary: readonly Vec2[],
  height: number,
  source: Speaker,
  point: Vec3,
  frequencyHz: number,
): Complex {
  if (boundary.length < 3 || !(height > 0)) return { re: 0, im: 0 }
  if (!Number.isFinite(frequencyHz) || frequencyHz <= 0) return { re: 0, im: 0 }
  if (!pointInPolygon(point, boundary)) return { re: 0, im: 0 }
  if (!pointInPolygon(source.position, boundary)) return { re: 0, im: 0 }

  const solution = solutionFor(boundary, height, source, frequencyHz)
  if (!solution || solution.modes.length === 0) return { re: 0, im: 0 }

  let re = 0
  let im = 0
  for (const mode of solution.modes) {
    const sample = sampleMode(solution.mesh, mode, point.x, point.y)
    const vertical = Math.cos((mode.n * Math.PI * point.z) / height)
    re += sample.re * vertical
    im += sample.im * vertical
  }

  const gain = Math.pow(10, (Number.isFinite(source.gainDb) ? source.gainDb : 0) / 20)
  return { re: re * gain, im: im * gain }
}

function solutionFor(
  boundary: readonly Vec2[],
  height: number,
  source: Speaker,
  frequencyHz: number,
): WaveSolution | null {
  const key = solutionKey(boundary, height, source, frequencyHz)
  const found = cache.findIndex((entry) => entry.key === key)
  if (found >= 0) {
    const hit = cache[found]
    cache.splice(found, 1)
    cache.push(hit)
    return hit
  }

  const mesh = buildMesh(boundary, height, frequencyHz)
  if (!mesh) return null

  const sourceIndex = nearestUnknown(
    mesh,
    source.position.x,
    source.position.y,
  )
  if (sourceIndex < 0) return null

  const omega = 2 * Math.PI * frequencyHz
  const k2 = (omega * omega) / (SPEED_OF_SOUND_M_S * SPEED_OF_SOUND_M_S)
  const q = Math.max((mesh.t60 * frequencyHz) / 2.2, 1)
  const damping = (omega * omega) / (q * SPEED_OF_SOUND_M_S * SPEED_OF_SOUND_M_S)
  const cellArea = mesh.dx * mesh.dy
  const modeCount = verticalModeCount(height, frequencyHz)
  const modes: ModeField[] = []

  for (let n = 0; n < modeCount; n++) {
    const kz = (n * Math.PI) / height
    const kappaRe = k2 - kz * kz
    const cosSource = Math.cos((n * Math.PI * source.position.z) / height)
    const epsilon = n === 0 ? 1 : 2
    const rhs = -(4 * Math.PI * (epsilon / height) * cosSource) / cellArea
    const field = solveMode(mesh, kappaRe, -damping, sourceIndex, rhs)
    modes.push({ n, re: field.re, im: field.im })
  }

  const solution = { key, mesh, modes }
  cache.push(solution)
  while (cache.length > CACHE_LIMIT) cache.shift()
  return solution
}

function solutionKey(
  boundary: readonly Vec2[],
  height: number,
  source: Speaker,
  frequencyHz: number,
): string {
  const parts = [
    height.toFixed(4),
    frequencyHz.toFixed(3),
    source.position.x.toFixed(4),
    source.position.y.toFixed(4),
    source.position.z.toFixed(4),
  ]
  for (const point of boundary) {
    parts.push(point.x.toFixed(4), point.y.toFixed(4))
  }
  return parts.join('|')
}

function verticalModeCount(height: number, frequencyHz: number): number {
  const k = (2 * Math.PI * frequencyHz) / SPEED_OF_SOUND_M_S
  const propagating = Math.ceil((height * k) / Math.PI)
  return Math.min(MAX_VERTICAL_MODES, Math.max(1, propagating + 1))
}

function shortestEdge(boundary: readonly Vec2[]): number {
  let shortest = Infinity
  for (let i = 0; i < boundary.length; i++) {
    const a = boundary[i]
    const b = boundary[(i + 1) % boundary.length]
    shortest = Math.min(shortest, Math.hypot(b.x - a.x, b.y - a.y))
  }
  return shortest
}

function chooseSpacing(
  spanX: number,
  spanY: number,
  shortest: number,
  frequencyHz: number,
): number {
  const wavelength = SPEED_OF_SOUND_M_S / Math.max(frequencyHz, 20)
  let spacing = Math.min(0.1, wavelength / 10, Math.max(shortest / 3, 0.05))
  spacing = Math.max(spacing, 0.05)

  for (let guard = 0; guard < 12; guard++) {
    const nx = Math.max(4, Math.round(spanX / spacing))
    const ny = Math.max(4, Math.round(spanY / spacing))
    if (nx * ny <= MAX_CELLS) break
    spacing *= 1.25
  }
  return spacing
}

function buildMesh(
  boundary: readonly Vec2[],
  height: number,
  frequencyHz: number,
): Mesh | null {
  const bounds = polygonBounds(boundary)
  const spanX = bounds.maxX - bounds.minX
  const spanY = bounds.maxY - bounds.minY
  if (!(spanX > 0) || !(spanY > 0)) return null

  const area = Math.abs(polygonArea(boundary))
  if (!(area > 1e-6)) return null

  let perimeter = 0
  for (let i = 0; i < boundary.length; i++) {
    const a = boundary[i]
    const b = boundary[(i + 1) % boundary.length]
    perimeter += Math.hypot(b.x - a.x, b.y - a.y)
  }

  const spacing = chooseSpacing(spanX, spanY, shortestEdge(boundary), frequencyHz)
  const nx = Math.max(4, Math.round(spanX / spacing))
  const ny = Math.max(4, Math.round(spanY / spacing))
  const dx = spanX / nx
  const dy = spanY / ny
  const slot = new Int32Array(nx * ny)
  slot.fill(-1)
  const slotList: number[] = []

  for (let iy = 0; iy < ny; iy++) {
    for (let ix = 0; ix < nx; ix++) {
      const x = bounds.minX + (ix + 0.5) * dx
      const y = bounds.minY + (iy + 0.5) * dy
      if (!pointInPolygon({ x, y }, boundary)) continue
      slot[iy * nx + ix] = slotList.length
      slotList.push(iy * nx + ix)
    }
  }

  const count = slotList.length
  if (count === 0) return null

  const slotOf = Int32Array.from(slotList)
  const neighbor = new Int32Array(count * 4)
  const coeff = new Float64Array(count * 4)
  const degree = new Float64Array(count)
  const invDx2 = 1 / (dx * dx)
  const invDy2 = 1 / (dy * dy)
  const steps = [
    [1, 0, invDx2],
    [-1, 0, invDx2],
    [0, 1, invDy2],
    [0, -1, invDy2],
  ]

  for (let i = 0; i < count; i++) {
    const cell = slotOf[i]
    const ix = cell % nx
    const iy = Math.floor(cell / nx)
    let weight = 0
    for (let k = 0; k < 4; k++) {
      const [stepX, stepY, weightK] = steps[k]
      const jx = ix + stepX
      const jy = iy + stepY
      const at = k + i * 4
      if (jx < 0 || jy < 0 || jx >= nx || jy >= ny) {
        neighbor[at] = -1
        continue
      }
      const next = slot[jy * nx + jx]
      neighbor[at] = next
      if (next < 0) continue
      coeff[at] = weightK
      weight += weightK
    }
    degree[i] = -weight
  }

  const surface = perimeter * height + 2 * area
  const absorption = surface * WALL_ABSORPTION
  const t60 =
    absorption > 0 ? (0.161 * area * height) / absorption : 0.3

  return {
    nx,
    ny,
    dx,
    dy,
    minX: bounds.minX,
    minY: bounds.minY,
    count,
    slot,
    slotOf,
    neighbor,
    coeff,
    degree,
    area,
    t60,
  }
}

function nearestUnknown(mesh: Mesh, x: number, y: number): number {
  const ix = clampIndex(Math.floor((x - mesh.minX) / mesh.dx), mesh.nx)
  const iy = clampIndex(Math.floor((y - mesh.minY) / mesh.dy), mesh.ny)
  const direct = mesh.slot[iy * mesh.nx + ix]
  if (direct >= 0) return direct

  let best = -1
  let bestDistance = Infinity
  for (let i = 0; i < mesh.count; i++) {
    const cell = mesh.slotOf[i]
    const cx = mesh.minX + ((cell % mesh.nx) + 0.5) * mesh.dx
    const cy = mesh.minY + (Math.floor(cell / mesh.nx) + 0.5) * mesh.dy
    const distance = (cx - x) * (cx - x) + (cy - y) * (cy - y)
    if (distance < bestDistance) {
      bestDistance = distance
      best = i
    }
  }
  return best
}

function clampIndex(index: number, count: number): number {
  if (index < 0) return 0
  if (index >= count) return count - 1
  return index
}

function sampleMode(mesh: Mesh, mode: ModeField, x: number, y: number): Complex {
  const unknown = nearestUnknown(mesh, x, y)
  if (unknown < 0) return { re: 0, im: 0 }
  return { re: mode.re[unknown], im: mode.im[unknown] }
}

function solveMode(
  mesh: Mesh,
  kappaRe: number,
  diagIm: number,
  sourceIndex: number,
  rhs: number,
): { re: Float64Array; im: Float64Array } {
  const count = mesh.count
  const re = new Float64Array(count)
  const im = new Float64Array(count)
  if (rhs === 0 || !Number.isFinite(rhs)) return { re, im }

  const diagRe = new Float64Array(count)
  for (let i = 0; i < count; i++) diagRe[i] = mesh.degree[i] + kappaRe

  const size = count * 2
  const b = new Float64Array(size)
  b[sourceIndex] = rhs
  const x = new Float64Array(size)
  const tmpRe = new Float64Array(count)
  const tmpIm = new Float64Array(count)
  const tmp = new Float64Array(size)

  const apply = (src: Float64Array, dest: Float64Array) => {
    applyReal(mesh, diagRe, diagIm, src, tmpRe, tmpIm, tmp)
    applyJacobi(diagRe, diagIm, tmp, dest, count)
  }

  applyJacobi(diagRe, diagIm, b, tmp, count)
  const rhsHat = tmp.slice()
  bicgstab(size, apply, rhsHat, x)

  re.set(x.subarray(0, count))
  im.set(x.subarray(count))
  return { re, im }
}

function applyReal(
  mesh: Mesh,
  diagRe: Float64Array,
  diagIm: number,
  src: Float64Array,
  tmpRe: Float64Array,
  tmpIm: Float64Array,
  dest: Float64Array,
): void {
  const count = mesh.count
  applyLaplacian(mesh, diagRe, src, 0, tmpRe)
  applyLaplacian(mesh, diagRe, src, count, tmpIm)
  for (let i = 0; i < count; i++) {
    dest[i] = tmpRe[i] - diagIm * src[count + i]
    dest[count + i] = tmpIm[i] + diagIm * src[i]
  }
}

function applyLaplacian(
  mesh: Mesh,
  diagRe: Float64Array,
  src: Float64Array,
  offset: number,
  dest: Float64Array,
): void {
  const { count, neighbor, coeff } = mesh
  for (let i = 0; i < count; i++) {
    let sum = diagRe[i] * src[offset + i]
    const base = i * 4
    for (let k = 0; k < 4; k++) {
      const next = neighbor[base + k]
      if (next < 0) continue
      sum += coeff[base + k] * src[offset + next]
    }
    dest[i] = sum
  }
}

/** Inverse of the 2×2 diagonal block. This is division by the complex diagonal. */
function applyJacobi(
  diagRe: Float64Array,
  diagIm: number,
  src: Float64Array,
  dest: Float64Array,
  count: number,
): void {
  for (let i = 0; i < count; i++) {
    const real = src[i]
    const imag = src[count + i]
    const dr = diagRe[i]
    const den = dr * dr + diagIm * diagIm
    if (den < 1e-30) {
      dest[i] = 0
      dest[count + i] = 0
      continue
    }
    dest[i] = (real * dr + imag * diagIm) / den
    dest[count + i] = (imag * dr - real * diagIm) / den
  }
}

function bicgstab(
  size: number,
  apply: (src: Float64Array, dest: Float64Array) => void,
  b: Float64Array,
  x: Float64Array,
): void {
  const r = new Float64Array(size)
  const rhat = new Float64Array(size)
  const p = new Float64Array(size)
  const v = new Float64Array(size)
  const s = new Float64Array(size)
  const t = new Float64Array(size)
  r.set(b)
  rhat.set(b)

  let rho = 1
  let alpha = 1
  let omega = 1
  const bnorm = Math.sqrt(dot(b, b))
  if (bnorm === 0) return

  for (let iteration = 0; iteration < SOLVER_ITERATIONS; iteration++) {
    const rhoNext = dot(rhat, r)
    if (Math.abs(rhoNext) < 1e-30) return
    const beta = (rhoNext / rho) * (alpha / omega)
    for (let i = 0; i < size; i++) {
      p[i] = r[i] + beta * (p[i] - omega * v[i])
    }
    apply(p, v)
    const rhatV = dot(rhat, v)
    if (Math.abs(rhatV) < 1e-30) return
    alpha = rhoNext / rhatV
    for (let i = 0; i < size; i++) s[i] = r[i] - alpha * v[i]
    if (Math.sqrt(dot(s, s)) / bnorm < SOLVER_TOLERANCE) {
      for (let i = 0; i < size; i++) x[i] += alpha * p[i]
      return
    }
    apply(s, t)
    const tt = dot(t, t)
    if (tt < 1e-30) return
    omega = dot(t, s) / tt
    if (Math.abs(omega) < 1e-30) return
    for (let i = 0; i < size; i++) {
      x[i] += alpha * p[i] + omega * s[i]
      r[i] = s[i] - omega * t[i]
    }
    if (Math.sqrt(dot(r, r)) / bnorm < SOLVER_TOLERANCE) return
    rho = rhoNext
  }
}

function dot(a: Float64Array, b: Float64Array): number {
  let sum = 0
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i]
  return sum
}
