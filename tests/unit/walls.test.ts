import { describe, expect, it } from 'vitest'
import { buildWallMeshes } from '../../src/core/geometry/walls'
import type { Room } from '../../src/core/types'

const room: Room = {
  id: 'room',
  name: 'Room',
  boundary: [
    { x: 0, y: 0 },
    { x: 4, y: 0 },
    { x: 4, y: 3 },
    { x: 0, y: 3 },
  ],
  height: 3,
  wallThickness: 0.1,
}

describe('wall mesh generation', () => {
  it('creates one wall per boundary edge', () => {
    const walls = buildWallMeshes(room)
    expect(walls).toHaveLength(4)
  })

  it('sizes the first wall correctly', () => {
    const [first] = buildWallMeshes(room)
    expect(first.size.x).toBeCloseTo(4.1)
    expect(first.size.y).toBeCloseTo(0.1)
    expect(first.size.z).toBeCloseTo(3)
    expect(first.center.z).toBeCloseTo(1.5)
    expect(first.angleRad).toBeCloseTo(0)
  })

  it('returns no walls for an empty boundary', () => {
    expect(buildWallMeshes({ ...room, boundary: [] })).toEqual([])
  })
})
