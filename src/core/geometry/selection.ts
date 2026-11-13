import type { Project, RoomObject, Speaker, Vec2 } from '../types'
import { degToRad } from '../../lib/math'

export interface Aabb {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

/** Left-to-right keeps items fully inside. Right-to-left also keeps items it crosses. */
export type MarqueePick = 'window' | 'crossing'

export function marqueePick(start: Vec2, end: Vec2): MarqueePick {
  return end.x < start.x ? 'crossing' : 'window'
}

export function aabbFromPoints(a: Vec2, b: Vec2): Aabb {
  return {
    minX: Math.min(a.x, b.x),
    minY: Math.min(a.y, b.y),
    maxX: Math.max(a.x, b.x),
    maxY: Math.max(a.y, b.y),
  }
}

export function aabbContains(outer: Aabb, inner: Aabb): boolean {
  return (
    inner.minX >= outer.minX &&
    inner.maxX <= outer.maxX &&
    inner.minY >= outer.minY &&
    inner.maxY <= outer.maxY
  )
}

export function aabbIntersects(a: Aabb, b: Aabb): boolean {
  return a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY
}

export function marqueeHits(target: Aabb, marquee: Aabb, pick: MarqueePick): boolean {
  return pick === 'window' ? aabbContains(marquee, target) : aabbIntersects(marquee, target)
}

function boundsOf(points: ReadonlyArray<Vec2>): Aabb {
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

/** Plan bounds of the rotated cabinet. Local −Y is the aim, matching the 2D marker. */
export function speakerAabb(speaker: Speaker): Aabb {
  const halfWidth = speaker.widthM / 2
  const halfDepth = speaker.depthM / 2
  const theta = degToRad(speaker.yawDeg)
  const cos = Math.cos(theta)
  const sin = Math.sin(theta)
  const corners: Array<readonly [number, number]> = [
    [-halfWidth, -halfDepth],
    [halfWidth, -halfDepth],
    [halfWidth, halfDepth],
    [-halfWidth, halfDepth],
  ]
  return boundsOf(
    corners.map(([lx, ly]) => ({
      x: speaker.position.x + lx * cos + ly * sin,
      y: speaker.position.y - lx * sin + ly * cos,
    })),
  )
}

export function objectAabb(object: Pick<RoomObject, 'position' | 'width' | 'depth'>): Aabb {
  return boundsOf([
    { x: object.position.x, y: object.position.y },
    { x: object.position.x + object.width, y: object.position.y + object.depth },
  ])
}

export function pointAabb(point: Vec2, radius: number): Aabb {
  const reach = Math.max(0, radius)
  return {
    minX: point.x - reach,
    minY: point.y - reach,
    maxX: point.x + reach,
    maxY: point.y + reach,
  }
}

export function idsInsideMarquee(
  project: Pick<Project, 'speakers' | 'objects' | 'listener'>,
  start: Vec2,
  end: Vec2,
  listenerRadius: number,
): string[] {
  const marquee = aabbFromPoints(start, end)
  const pick = marqueePick(start, end)
  const ids: string[] = []
  for (const speaker of project.speakers) {
    if (marqueeHits(speakerAabb(speaker), marquee, pick)) ids.push(speaker.id)
  }
  for (const object of project.objects) {
    if (marqueeHits(objectAabb(object), marquee, pick)) ids.push(object.id)
  }
  if (marqueeHits(pointAabb(project.listener.position, listenerRadius), marquee, pick)) {
    ids.push(project.listener.id)
  }
  return ids
}
