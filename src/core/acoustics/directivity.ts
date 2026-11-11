import { degToRad } from '../../lib/math'

/**
 * Smooth coverage-angle directivity for the Phase 0 preview.
 * The nominal coverage angle is treated as the -6 dB beamwidth.
 *
 * Returns a linear amplitude normalized to 1 on axis. A 180 degree
 * pattern is omni; everything behind the source is silent.
 */
export function coverageDirectivity(
  offAxisRad: number,
  coverageDeg: number,
): number {
  const coverage = Number.isFinite(coverageDeg) ? coverageDeg : 90
  if (coverage >= 180) return 1

  const cosine = Math.cos(Math.abs(offAxisRad))
  if (cosine <= 1e-12) return 0

  const halfAngle = degToRad(Math.max(coverage, 1) / 2)
  const exponent = Math.log(0.5) / Math.log(Math.cos(halfAngle))
  return Math.pow(cosine, exponent)
}
