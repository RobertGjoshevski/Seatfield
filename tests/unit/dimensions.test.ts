import { describe, expect, it } from 'vitest'
import {
  axisAlignedRectangle,
  edgeLengths,
  isAxisAlignedRectangle,
  pointAtDistance,
  rectangleFromCorner,
  resizeEdge,
  resizeRectangle,
} from '../../src/core/geometry/dimensions'

describe('room dimensions', () => {
  it('builds a 5 by 4 rectangle and resizes width from the near corner', () => {
    const boundary = rectangleFromCorner({ x: 1, y: 2 }, 5, 4)
    expect(boundary).toEqual([
      { x: 1, y: 2 },
      { x: 6, y: 2 },
      { x: 6, y: 6 },
      { x: 1, y: 6 },
    ])
    expect(edgeLengths(boundary ?? [])).toEqual([5, 4, 5, 4])

    const resized = resizeRectangle(boundary ?? [], 8, 4)
    expect(resized?.[0]).toEqual({ x: 1, y: 2 })
    expect(resized?.[1]).toEqual({ x: 9, y: 2 })
    expect(resized?.[2]).toEqual({ x: 9, y: 6 })
    expect(resized?.[3]).toEqual({ x: 1, y: 6 })
    expect(axisAlignedRectangle(resized ?? [])?.width).toBe(8)
  })

  it('places a typed segment at the requested length', () => {
    const next = pointAtDistance({ x: 0, y: 0 }, { x: 0, y: 3 }, 2.5)
    expect(next).toEqual({ x: 0, y: 2.5 })
    expect(pointAtDistance({ x: 1, y: 1 }, { x: 1, y: 1 }, 2)).toBeNull()
  })

  it('rejects an irregular quad as a rectangle and can resize one edge', () => {
    const irregular = [
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 3, y: 2 },
      { x: 0, y: 3 },
    ]
    expect(isAxisAlignedRectangle(irregular)).toBe(false)

    const longer = resizeEdge(irregular, 0, 6)
    expect(longer?.[1]).toEqual({ x: 6, y: 0 })
    expect(longer?.[0]).toEqual({ x: 0, y: 0 })
    expect(resizeEdge(irregular, 0, 0)).toBeNull()
  })
})
