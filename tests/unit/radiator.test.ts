import { describe, expect, it } from 'vitest'
import { radiatorPosition } from '../../src/core/acoustics/radiator'
import { levelAtPoint } from '../../src/core/acoustics/roomField'
import type { Speaker } from '../../src/core/types'

function speaker(partial: Partial<Speaker> = {}): Speaker {
  return {
    id: 'speaker-1',
    name: 'Speaker 1',
    position: { x: 0, y: 0, z: 1.2 },
    yawDeg: 0,
    gainDb: 0,
    coverageHorizontalDeg: 180,
    radiatorDiameterM: 0.13,
    widthM: 0.6,
    depthM: 0.5,
    heightM: 0.7,
    phaseInverted: false,
    delayMs: 0,
    enabled: true,
    ...partial,
  }
}

const open = {
  boundary: [
    { x: -10, y: -10 },
    { x: 10, y: -10 },
    { x: 10, y: 10 },
    { x: -10, y: 10 },
  ],
  height: 3,
  kind: 'open' as const,
}

describe('radiator position', () => {
  it('sits on the front face, half a cabinet depth along the aim', () => {
    const box = speaker()
    expect(radiatorPosition(box)).toEqual({ x: 0, y: -0.25, z: 1.2 })
    const reversed = radiatorPosition({ ...box, yawDeg: 180 })
    expect(reversed.x).toBeCloseTo(0)
    expect(reversed.y).toBeCloseTo(0.25)
    expect(reversed.z).toBe(1.2)
    expect(radiatorPosition({ ...box, yawDeg: 90 }).x).toBeCloseTo(-0.25)
    expect(radiatorPosition({ ...box, yawDeg: 90 }).y).toBeCloseTo(0)
  })

  it('is louder just in front of the arrow than the same distance behind the cabinet', () => {
    const box = speaker()
    const ahead = levelAtPoint(open, box, { x: 0, y: -1, z: 1.2 }, 1000, {
      reflectionOrder: 0,
    })
    const behind = levelAtPoint(open, box, { x: 0, y: 1, z: 1.2 }, 1000, {
      reflectionOrder: 0,
    })
    expect(ahead).toBeGreaterThan(behind)
  })
})
