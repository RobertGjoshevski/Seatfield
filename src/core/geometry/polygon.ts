import type { Vec2 } from '../types'

export interface Bounds2 {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export function polygonArea(points: Vec2[]): number {
  if (points.length < 3) return 0
  let sum = 0
  for (let i = 0; i < points.length; i++) {
    const a = points[i]
    const b = points[(i + 1) % points.length]
    sum += a.x * b.y - b.x * a.y
  }
  return sum / 2
}

export function polygonBounds(points: Vec2[]): Bounds2 {
  if (points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 }
  }
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const point of points) {
    minX = Math.min(minX, point.x)
    minY = Math.min(minY, point.y)
    maxX = Math.max(maxX, point.x)
    maxY = Math.max(maxY, point.y)
  }
  return { minX, minY, maxX, maxY }
}

export function pointInPolygon(point: Vec2, polygon: Vec2[]): boolean {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x
    const yi = polygon[i].y
    const xj = polygon[j].x
    const yj = polygon[j].y
    const intersects =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi
    if (intersects) inside = !inside
  }
  return inside
}

function orientation(a: Vec2, b: Vec2, c: Vec2): number {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)
}

function onSegment(a: Vec2, b: Vec2, c: Vec2): boolean {
  return (
    Math.min(a.x, b.x) <= c.x &&
    c.x <= Math.max(a.x, b.x) &&
    Math.min(a.y, b.y) <= c.y &&
    c.y <= Math.max(a.y, b.y)
  )
}

function segmentsIntersect(a: Vec2, b: Vec2, c: Vec2, d: Vec2): boolean {
  const o1 = orientation(a, b, c)
  const o2 = orientation(a, b, d)
  const o3 = orientation(c, d, a)
  const o4 = orientation(c, d, b)
  const eps = 1e-9

  if (Math.abs(o1) < eps && onSegment(a, b, c)) return true
  if (Math.abs(o2) < eps && onSegment(a, b, d)) return true
  if (Math.abs(o3) < eps && onSegment(c, d, a)) return true
  if (Math.abs(o4) < eps && onSegment(c, d, b)) return true

  return o1 * o2 < 0 && o3 * o4 < 0
}

export function isSimplePolygon(points: Vec2[]): boolean {
  if (points.length < 3) return false
  const n = points.length
  for (let i = 0; i < n; i++) {
    const a = points[i]
    const b = points[(i + 1) % n]
    for (let j = i + 1; j < n; j++) {
      if (i === j) continue
      if ((i + 1) % n === j) continue
      if ((j + 1) % n === i) continue
      const c = points[j]
      const d = points[(j + 1) % n]
      if (segmentsIntersect(a, b, c, d)) return false
    }
  }
  return true
}
