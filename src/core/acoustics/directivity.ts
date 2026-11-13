import { clamp, degToRad } from '../../lib/math'

/** Bass is omnidirectional. The nominal beamwidth is reached by 2 kHz. */
export const OMNI_BELOW_HZ = 200
export const NOMINAL_BEAM_HZ = 2000

/**
 * Widen the coverage angle toward a full 180 degrees as frequency falls.
 * At and below 200 Hz the source is omnidirectional.
 */
export function effectiveCoverageDeg(
  nominalDeg: number,
  frequencyHz: number,
): number {
  const nominal = Number.isFinite(nominalDeg) ? nominalDeg : 90
  const frequency = Number.isFinite(frequencyHz) ? frequencyHz : OMNI_BELOW_HZ
  if (frequency <= OMNI_BELOW_HZ) return 180
  if (frequency >= NOMINAL_BEAM_HZ) return nominal

  const t =
    Math.log2(frequency / OMNI_BELOW_HZ) /
    Math.log2(NOMINAL_BEAM_HZ / OMNI_BELOW_HZ)
  return 180 * (1 - t) + nominal * clamp(t, 0, 1)
}

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
