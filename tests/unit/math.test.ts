import { describe, expect, it } from 'vitest'
import { clamp, degToRad, distance2d, snap } from '../../src/lib/math'

describe('math helpers', () => {
  it('clamps values', () => {
    expect(clamp(5, 0, 10)).toBe(5)
    expect(clamp(-1, 0, 10)).toBe(0)
    expect(clamp(11, 0, 10)).toBe(10)
  })

  it('snaps to a step', () => {
    expect(snap(0.37, 0.25)).toBe(0.25)
    expect(snap(0.38, 0.25)).toBe(0.5)
    expect(snap(-0.13, 0.25)).toBe(-0.25)
  })

  it('computes 2D distance', () => {
    expect(distance2d({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5)
  })

  it('converts degrees to radians', () => {
    expect(degToRad(180)).toBeCloseTo(Math.PI)
  })
})
