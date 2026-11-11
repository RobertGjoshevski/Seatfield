import { describe, expect, it } from 'vitest'
import {
  isSimplePolygon,
  pointInPolygon,
  polygonArea,
  polygonBounds,
} from '../../src/core/geometry/polygon'

const rectangle = [
  { x: 0, y: 0 },
  { x: 4, y: 0 },
  { x: 4, y: 3 },
  { x: 0, y: 3 },
]

describe('polygon utilities', () => {
  it('computes signed area and bounds', () => {
    expect(polygonArea(rectangle)).toBe(12)
    expect(polygonBounds(rectangle)).toEqual({
      minX: 0,
      minY: 0,
      maxX: 4,
      maxY: 3,
    })
  })

  it('detects points inside and outside', () => {
    expect(pointInPolygon({ x: 2, y: 1.5 }, rectangle)).toBe(true)
    expect(pointInPolygon({ x: 5, y: 1.5 }, rectangle)).toBe(false)
    expect(pointInPolygon({ x: -1, y: -1 }, rectangle)).toBe(false)
  })

  it('accepts a simple polygon', () => {
    expect(isSimplePolygon(rectangle)).toBe(true)
  })

  it('rejects a self-intersecting polygon', () => {
    const bowtie = [
      { x: 0, y: 0 },
      { x: 4, y: 3 },
      { x: 4, y: 0 },
      { x: 0, y: 3 },
    ]
    expect(isSimplePolygon(bowtie)).toBe(false)
  })
})
