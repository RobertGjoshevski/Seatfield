import type { Vec2 } from '../types'
import { isSimplePolygon, polygonArea, polygonBounds } from './polygon'

const AXIS_TOLERANCE_M = 0.001

export interface RectangleSize {
  minX: number
  minY: number
  width: number
  depth: number
}

/** 30 m × 20 m audience. The front edge is y = 0; yaw 0 aims into −Y. */
export function openAudienceBoundary(): Vec2[] {
  return [
    { x: -15, y: 0 },
    { x: 15, y: 0 },
    { x: 15, y: -20 },
    { x: -15, y: -20 },
  ]
}

export function edgeLength(a: Vec2, b: Vec2): number {
  return Math.hypot(b.x - a.x, b.y - a.y)
}

export function edgeLengths(points: readonly Vec2[]): number[] {
  if (points.length < 2) return []
  return points.map((start, index) =>
    edgeLength(start, points[(index + 1) % points.length]),
  )
}

/**
 * Place a point `distance` metres from `origin` toward `toward`.
 * Returns null when the direction or the distance is unusable.
 */
export function pointAtDistance(
  origin: Vec2,
  toward: Vec2,
  distance: number,
): Vec2 | null {
  if (!Number.isFinite(distance) || distance <= 0) return null
  const dx = toward.x - origin.x
  const dy = toward.y - origin.y
  const length = Math.hypot(dx, dy)
  if (length < 1e-9) return null
  return {
    x: origin.x + (dx / length) * distance,
    y: origin.y + (dy / length) * distance,
  }
}

function near(a: number, b: number, tolerance: number): boolean {
  return Math.abs(a - b) <= tolerance
}

/**
 * Axis-aligned rectangle, in any vertex order.
 * Width is the X extent and depth is the Y extent.
 */
export function axisAlignedRectangle(
  points: readonly Vec2[],
  tolerance = AXIS_TOLERANCE_M,
): RectangleSize | null {
  if (points.length !== 4) return null

  const bounds = polygonBounds(points)
  const width = bounds.maxX - bounds.minX
  const depth = bounds.maxY - bounds.minY
  if (width <= tolerance || depth <= tolerance) return null
  if (Math.abs(polygonArea(points)) <= tolerance * tolerance) return null

  const corners = [
    { x: bounds.minX, y: bounds.minY },
    { x: bounds.maxX, y: bounds.minY },
    { x: bounds.maxX, y: bounds.maxY },
    { x: bounds.minX, y: bounds.maxY },
  ]
  const onCorner = points.every((point) =>
    corners.some(
      (corner) =>
        near(point.x, corner.x, tolerance) && near(point.y, corner.y, tolerance),
    ),
  )
  if (!onCorner) return null

  for (let index = 0; index < points.length; index++) {
    const start = points[index]
    const end = points[(index + 1) % points.length]
    const dx = Math.abs(end.x - start.x)
    const dy = Math.abs(end.y - start.y)
    const axisAligned =
      (dx <= tolerance && dy > tolerance) || (dy <= tolerance && dx > tolerance)
    if (!axisAligned) return null
  }

  return { minX: bounds.minX, minY: bounds.minY, width, depth }
}

export function isAxisAlignedRectangle(
  points: readonly Vec2[],
  tolerance = AXIS_TOLERANCE_M,
): boolean {
  return axisAlignedRectangle(points, tolerance) !== null
}

/** Four counter-clockwise corners. Width and depth are signed extents. */
export function rectangleFromCorner(
  anchor: Vec2,
  width: number,
  depth: number,
): Vec2[] | null {
  if (!Number.isFinite(width) || !Number.isFinite(depth)) return null
  if (Math.abs(width) < 1e-4 || Math.abs(depth) < 1e-4) return null

  const minX = Math.min(anchor.x, anchor.x + width)
  const maxX = Math.max(anchor.x, anchor.x + width)
  const minY = Math.min(anchor.y, anchor.y + depth)
  const maxY = Math.max(anchor.y, anchor.y + depth)
  return [
    { x: minX, y: minY },
    { x: maxX, y: minY },
    { x: maxX, y: maxY },
    { x: minX, y: maxY },
  ]
}

/**
 * Resize an axis-aligned rectangle, keeping the minimum corner fixed.
 * Width and depth are positive metres.
 */
export function resizeRectangle(
  points: readonly Vec2[],
  width: number,
  depth: number,
): Vec2[] | null {
  const current = axisAlignedRectangle(points)
  if (!current) return null
  if (!Number.isFinite(width) || !Number.isFinite(depth)) return null
  if (width <= 0 || depth <= 0) return null
  return rectangleFromCorner(
    { x: current.minX, y: current.minY },
    width,
    depth,
  )
}

/**
 * Move one edge's end point along the edge so the edge has `length` metres.
 * Returns null when the result would self-intersect or the length is invalid.
 */
export function resizeEdge(
  points: readonly Vec2[],
  edgeIndex: number,
  length: number,
): Vec2[] | null {
  if (points.length < 3) return null
  if (!Number.isInteger(edgeIndex) || edgeIndex < 0 || edgeIndex >= points.length) {
    return null
  }
  if (!Number.isFinite(length) || length <= 0) return null

  const start = points[edgeIndex]
  const endIndex = (edgeIndex + 1) % points.length
  const end = points[endIndex]
  const dx = end.x - start.x
  const dy = end.y - start.y
  const current = Math.hypot(dx, dy)
  if (current < 1e-9) return null

  const scale = length / current
  const next = points.map((point) => ({ x: point.x, y: point.y }))
  next[endIndex] = {
    x: start.x + dx * scale,
    y: start.y + dy * scale,
  }
  if (!isSimplePolygon(next)) return null
  return next
}
