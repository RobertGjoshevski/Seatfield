import { clamp, degToRad } from '../../lib/math'
import type { Vec3 } from '../types'
import { coverageDirectivity } from './directivity'

/** Floor for relative levels so heatmaps and sums stay finite. */
export const MIN_SPL_DB = -120
export const REFERENCE_DISTANCE_M = 1

export interface DirectFieldSource {
  position: Vec3
  yawDeg: number
  gainDb: number
  coverageHorizontalDeg: number
}

/**
 * Phase 0 direct-field level relative to 1 m on axis at 0 dB source gain.
 * Horizontal coverage is modeled; elevation is ignored. Air absorption is
 * intentionally deferred to the Phase 1 solver.
 */
export function splAtPoint(
  source: DirectFieldSource,
  point: Vec3,
): number {
  const dx = point.x - source.position.x
  const dy = point.y - source.position.y
  const dz = point.z - source.position.z
  const distance = Math.hypot(dx, dy, dz)
  if (distance < 1e-6) return MIN_SPL_DB

  const horizontal = Math.hypot(dx, dy)
  const yaw = degToRad(source.yawDeg)
  const aimX = -Math.sin(yaw)
  const aimY = -Math.cos(yaw)
  const cosOffAxis =
    horizontal < 1e-9
      ? 1
      : (dx * aimX + dy * aimY) / horizontal
  const offAxis = Math.acos(clamp(cosOffAxis, -1, 1))
  const directivity = coverageDirectivity(
    offAxis,
    source.coverageHorizontalDeg,
  )
  if (directivity <= 0) return MIN_SPL_DB

  const referenceDistance = Math.max(distance, 0.5)
  const level =
    source.gainDb +
    20 * Math.log10(directivity) -
    20 * Math.log10(referenceDistance / REFERENCE_DISTANCE_M)

  return Math.max(MIN_SPL_DB, level)
}

/** Incoherent power sum of independent source levels. */
export function powerSumDb(levelsDb: readonly number[]): number {
  if (levelsDb.length === 0) return MIN_SPL_DB

  let energy = 0
  for (const level of levelsDb) {
    if (!Number.isFinite(level)) continue
    energy += Math.pow(10, level / 10)
  }

  if (energy <= 0) return MIN_SPL_DB
  return Math.max(MIN_SPL_DB, 10 * Math.log10(energy))
}
