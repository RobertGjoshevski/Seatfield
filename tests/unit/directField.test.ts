import { describe, expect, it } from 'vitest'
import { coverageDirectivity } from '../../src/core/acoustics/directivity'
import {
  MIN_SPL_DB,
  powerSumDb,
  splAtPoint,
} from '../../src/core/acoustics/directField'
import type { DirectFieldSource } from '../../src/core/acoustics/directField'

const source: DirectFieldSource = {
  position: { x: 0, y: 0, z: 1.5 },
  yawDeg: 0,
  gainDb: 0,
  coverageHorizontalDeg: 90,
}

describe('coverage directivity', () => {
  it('normalizes on axis and reaches one half at the nominal edge', () => {
    expect(coverageDirectivity(0, 90)).toBeCloseTo(1)
    expect(coverageDirectivity(Math.PI / 4, 90)).toBeCloseTo(0.5)
  })

  it('is silent outside the forward hemisphere', () => {
    expect(coverageDirectivity(Math.PI / 2, 90)).toBe(0)
    expect(coverageDirectivity(Math.PI, 90)).toBe(0)
  })

  it('widens with a larger coverage angle', () => {
    expect(coverageDirectivity(Math.PI / 4, 120)).toBeGreaterThan(
      coverageDirectivity(Math.PI / 4, 90),
    )
  })

  it('treats a 180 degree pattern as omni', () => {
    expect(coverageDirectivity(Math.PI / 2, 180)).toBe(1)
  })
})

describe('direct field', () => {
  it('is 0 dB at 1 m on axis with unity gain', () => {
    expect(splAtPoint(source, { x: 0, y: -1, z: 1.5 })).toBeCloseTo(0)
  })

  it('drops about 6 dB per doubling of distance', () => {
    expect(splAtPoint(source, { x: 0, y: -2, z: 1.5 })).toBeCloseTo(-6.0206, 3)
  })

  it('applies source gain', () => {
    expect(
      splAtPoint({ ...source, gainDb: 6 }, { x: 0, y: -1, z: 1.5 }),
    ).toBeCloseTo(6)
  })

  it('applies the coverage pattern off axis', () => {
    const offset = Math.SQRT1_2
    expect(
      splAtPoint(source, { x: offset, y: -offset, z: 1.5 }),
    ).toBeCloseTo(-6.0206, 3)
  })

  it('returns the floor behind the source', () => {
    expect(splAtPoint(source, { x: 0, y: 1, z: 1.5 })).toBe(MIN_SPL_DB)
  })

  it('power sums independent sources', () => {
    expect(powerSumDb([0, 0])).toBeCloseTo(3.0103, 3)
    expect(powerSumDb([-10, -10])).toBeCloseTo(-6.9897, 3)
    expect(powerSumDb([])).toBe(MIN_SPL_DB)
  })
})
