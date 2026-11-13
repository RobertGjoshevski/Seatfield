import type { RoomObject, Speaker, Vec2, Vec3 } from '../types'
import { clamp, degToRad } from '../../lib/math'
import { pointInPolygon } from '../geometry/polygon'
import {
  coverageDirectivity,
  effectiveCoverageDeg,
} from './directivity'

export interface SolidBox {
  id: string
  minX: number
  minY: number
  minZ: number
  maxX: number
  maxY: number
  maxZ: number
}

interface ReflectionPath {
  linearGain: number
  distanceM: number
}

interface VerticalPlane {
  kind: 'vertical'
  id: string
  owner: string
  ax: number
  ay: number
  bx: number
  by: number
  z0: number
  z1: number
  nx: number
  ny: number
}

interface HorizontalPlane {
  kind: 'horizontal'
  id: string
  owner: string
  z: number
  normalZ: 1 | -1
  room: boolean
  minX: number
  minY: number
  maxX: number
  maxY: number
}

type Plane = VerticalPlane | HorizontalPlane

const SIDE_EPS = 1e-3

export function solidBoxes(objects: readonly RoomObject[] | undefined): SolidBox[] {
  if (!objects || objects.length === 0) return []
  const boxes: SolidBox[] = []
  for (const object of objects) {
    const { width, depth, height, position } = object
    if (!(width > 0) || !(depth > 0) || !(height > 0)) continue
    if (
      !Number.isFinite(position.x) ||
      !Number.isFinite(position.y) ||
      !Number.isFinite(position.z)
    ) {
      continue
    }
    boxes.push({
      id: object.id,
      minX: position.x,
      minY: position.y,
      minZ: position.z,
      maxX: position.x + width,
      maxY: position.y + depth,
      maxZ: position.z + height,
    })
  }
  return boxes
}

export function pointInSolid(point: Vec3, box: SolidBox): boolean {
  return (
    point.x > box.minX + 1e-4 &&
    point.x < box.maxX - 1e-4 &&
    point.y > box.minY + 1e-4 &&
    point.y < box.maxY - 1e-4 &&
    point.z > box.minZ + 1e-4 &&
    point.z < box.maxZ - 1e-4
  )
}

/** True when the open segment passes through the interior of a solid. */
export function segmentBlockedBySolids(
  from: Vec3,
  to: Vec3,
  boxes: readonly SolidBox[],
): boolean {
  for (const box of boxes) {
    if (segmentHitsBox(from, to, box)) return true
  }
  return false
}

export function horizontalSurfaceCovered(
  x: number,
  y: number,
  boxes: readonly SolidBox[],
  which: 'floor' | 'ceiling',
  roomHeight: number,
): boolean {
  for (const box of boxes) {
    const touches =
      which === 'floor' ? box.minZ <= SIDE_EPS : box.maxZ >= roomHeight - SIDE_EPS
    if (!touches) continue
    if (x > box.minX && x < box.maxX && y > box.minY && y < box.maxY) return true
  }
  return false
}

/**
 * Object-face bounces, plus second- and third-order bounces off the room
 * and those faces. First-order room bounces stay in the original collector
 * so an empty room keeps its previous result.
 */
export function extraReflectionPaths(
  room: { boundary: readonly Vec2[]; height: number },
  source: Speaker,
  point: Vec3,
  frequencyHz: number,
  boxes: readonly SolidBox[],
  reflectionOrder: number,
  reflectionCoefficient: number,
): ReflectionPath[] {
  if (reflectionOrder < 1) return []
  if (reflectionOrder < 2 && boxes.length === 0) return []

  const planes = buildPlanes(room, boxes, reflectionOrder)
  if (planes.length === 0) return []

  const paths: ReflectionPath[] = []
  const gain = Math.pow(10, source.gainDb / 20)
  for (let i = 0; i < planes.length; i++) {
    if (reflectionOrder >= 1 && planes[i].owner !== 'room') {
      pushPath(
        paths,
        trace(
          [planes[i]],
          room,
          source,
          point,
          frequencyHz,
          boxes,
          gain,
          reflectionCoefficient,
        ),
      )
    }
    if (reflectionOrder < 2) continue
    for (let j = 0; j < planes.length; j++) {
      if (j === i) continue
      pushPath(
        paths,
        trace(
          [planes[i], planes[j]],
          room,
          source,
          point,
          frequencyHz,
          boxes,
          gain,
          reflectionCoefficient,
        ),
      )
      if (reflectionOrder < 3) continue
      for (let k = 0; k < planes.length; k++) {
        if (k === j) continue
        pushPath(
          paths,
          trace(
            [planes[i], planes[j], planes[k]],
            room,
            source,
            point,
            frequencyHz,
            boxes,
            gain,
            reflectionCoefficient,
          ),
        )
      }
    }
  }
  return paths
}

function pushPath(paths: ReflectionPath[], path: ReflectionPath | null) {
  if (path) paths.push(path)
}

function buildPlanes(
  room: { boundary: readonly Vec2[]; height: number },
  boxes: readonly SolidBox[],
  reflectionOrder: number,
): Plane[] {
  const planes: Plane[] = []
  if (reflectionOrder >= 2) addRoomPlanes(planes, room)
  if (reflectionOrder >= 1) addObjectPlanes(planes, boxes, room.height)
  return planes
}

function addRoomPlanes(
  planes: Plane[],
  room: { boundary: readonly Vec2[]; height: number },
): void {
  const boundary = room.boundary
  const height = room.height
  if (!(height > 0) || boundary.length < 3) return

  for (let index = 0; index < boundary.length; index++) {
    const start = boundary[index]
    const end = boundary[(index + 1) % boundary.length]
    const normal = interiorNormal(start, end, boundary)
    if (!normal) continue
    planes.push({
      kind: 'vertical',
      id: `room-wall-${index}`,
      owner: 'room',
      ax: start.x,
      ay: start.y,
      bx: end.x,
      by: end.y,
      z0: 0,
      z1: height,
      nx: normal.nx,
      ny: normal.ny,
    })
  }

  planes.push({
    kind: 'horizontal',
    id: 'room-floor',
    owner: 'room',
    z: 0,
    normalZ: 1,
    room: true,
    minX: 0,
    minY: 0,
    maxX: 0,
    maxY: 0,
  })
  planes.push({
    kind: 'horizontal',
    id: 'room-ceiling',
    owner: 'room',
    z: height,
    normalZ: -1,
    room: true,
    minX: 0,
    minY: 0,
    maxX: 0,
    maxY: 0,
  })
}

function addObjectPlanes(
  planes: Plane[],
  boxes: readonly SolidBox[],
  roomHeight: number,
): void {
  for (const box of boxes) {
    const corners = [
      { x: box.minX, y: box.minY },
      { x: box.maxX, y: box.minY },
      { x: box.maxX, y: box.maxY },
      { x: box.minX, y: box.maxY },
    ]
    for (let index = 0; index < corners.length; index++) {
      const start = corners[index]
      const end = corners[(index + 1) % corners.length]
      const dx = end.x - start.x
      const dy = end.y - start.y
      const length = Math.hypot(dx, dy)
      if (length < 1e-4 || box.maxZ - box.minZ < 1e-4) continue
      planes.push({
        kind: 'vertical',
        id: `${box.id}-side-${index}`,
        owner: box.id,
        ax: start.x,
        ay: start.y,
        bx: end.x,
        by: end.y,
        z0: box.minZ,
        z1: box.maxZ,
        nx: dy / length,
        ny: -dx / length,
      })
    }

    if (box.maxZ < roomHeight - SIDE_EPS) {
      planes.push({
        kind: 'horizontal',
        id: `${box.id}-top`,
        owner: box.id,
        z: box.maxZ,
        normalZ: 1,
        room: false,
        minX: box.minX,
        minY: box.minY,
        maxX: box.maxX,
        maxY: box.maxY,
      })
    }
    if (box.minZ > SIDE_EPS) {
      planes.push({
        kind: 'horizontal',
        id: `${box.id}-bottom`,
        owner: box.id,
        z: box.minZ,
        normalZ: -1,
        room: false,
        minX: box.minX,
        minY: box.minY,
        maxX: box.maxX,
        maxY: box.maxY,
      })
    }
  }
}

function interiorNormal(
  start: Vec2,
  end: Vec2,
  boundary: readonly Vec2[],
): { nx: number; ny: number } | null {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const length = Math.hypot(dx, dy)
  if (length < 1e-6) return null
  const left = { nx: -dy / length, ny: dx / length }
  const mid = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 }
  const probe = { x: mid.x + left.nx * 0.05, y: mid.y + left.ny * 0.05 }
  if (pointInPolygon(probe, boundary)) return left
  return { nx: -left.nx, ny: -left.ny }
}

function trace(
  sequence: Plane[],
  room: { boundary: readonly Vec2[]; height: number },
  source: Speaker,
  point: Vec3,
  frequencyHz: number,
  boxes: readonly SolidBox[],
  gain: number,
  reflectionCoefficient: number,
): ReflectionPath | null {
  if (!onReflectingSide(sequence[0], source.position)) return null

  const images: Vec3[] = [source.position]
  for (const plane of sequence) {
    images.push(mirrorPoint(plane, images[images.length - 1]))
  }

  let cursor = point
  const reversed: Vec3[] = []
  for (let index = sequence.length - 1; index >= 0; index--) {
    if (!onReflectingSide(sequence[index], cursor)) return null
    const hit = hitPlane(sequence[index], cursor, images[index + 1], room.boundary)
    if (!hit) return null
    reversed.push(hit)
    cursor = hit
  }
  const hits = reversed.reverse()

  for (let index = 0; index < sequence.length; index++) {
    const before = index === 0 ? source.position : hits[index - 1]
    const after = index === sequence.length - 1 ? point : hits[index + 1]
    if (
      !onReflectingSide(sequence[index], before) ||
      !onReflectingSide(sequence[index], after)
    ) {
      return null
    }
  }

  const legs: Vec3[] = [source.position, ...hits, point]
  for (let index = 0; index < legs.length - 1; index++) {
    const from = legs[index]
    const to = legs[index + 1]
    if (!segmentInside(room.boundary, from, to)) return null
    if (segmentBlockedBySolids(from, to, boxes)) return null
  }

  const directivity = horizontalDirectivity(
    source,
    source.position,
    hits[0],
    frequencyHz,
  )
  if (directivity <= 0) return null

  const image = images[images.length - 1]
  const distance = Math.hypot(point.x - image.x, point.y - image.y, point.z - image.z)
  if (!(distance > 0)) return null

  return {
    linearGain: gain * directivity * reflectionCoefficient ** sequence.length,
    distanceM: distance,
  }
}

function onReflectingSide(plane: Plane, point: Vec3): boolean {
  if (plane.kind === 'vertical') {
    const side = (point.x - plane.ax) * plane.nx + (point.y - plane.ay) * plane.ny
    return side > SIDE_EPS
  }
  return (point.z - plane.z) * plane.normalZ > SIDE_EPS
}

function mirrorPoint(plane: Plane, point: Vec3): Vec3 {
  if (plane.kind === 'vertical') {
    const mirrored = mirror2D(point, { x: plane.ax, y: plane.ay }, { x: plane.bx, y: plane.by })
    if (!mirrored) return point
    return { x: mirrored.x, y: mirrored.y, z: point.z }
  }
  return { x: point.x, y: point.y, z: 2 * plane.z - point.z }
}

function hitPlane(
  plane: Plane,
  from: Vec3,
  image: Vec3,
  boundary: readonly Vec2[],
): Vec3 | null {
  if (plane.kind === 'vertical') {
    const hit = raySegmentHit(
      from,
      image,
      { x: plane.ax, y: plane.ay },
      { x: plane.bx, y: plane.by },
    )
    if (!hit) return null
    const z = from.z + hit.t * (image.z - from.z)
    if (z < plane.z0 - SIDE_EPS || z > plane.z1 + SIDE_EPS) return null
    return { x: hit.x, y: hit.y, z }
  }

  const denom = image.z - from.z
  if (Math.abs(denom) < 1e-8) return null
  const t = (plane.z - from.z) / denom
  if (t <= 1e-4 || t >= 1 - 1e-4) return null
  const x = from.x + t * (image.x - from.x)
  const y = from.y + t * (image.y - from.y)
  if (plane.room) {
    if (!pointInPolygon({ x, y }, boundary)) return null
  } else if (
    x < plane.minX - SIDE_EPS ||
    x > plane.maxX + SIDE_EPS ||
    y < plane.minY - SIDE_EPS ||
    y > plane.maxY + SIDE_EPS
  ) {
    return null
  }
  return { x, y, z: plane.z }
}

function mirror2D(point: Vec2, start: Vec2, end: Vec2): Vec2 | null {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const length2 = dx * dx + dy * dy
  if (length2 < 1e-12) return null
  const t = ((point.x - start.x) * dx + (point.y - start.y) * dy) / length2
  const projX = start.x + t * dx
  const projY = start.y + t * dy
  return { x: projX * 2 - point.x, y: projY * 2 - point.y }
}

interface RayHit {
  x: number
  y: number
  t: number
}

function raySegmentHit(origin: Vec2, through: Vec2, start: Vec2, end: Vec2): RayHit | null {
  const dx = through.x - origin.x
  const dy = through.y - origin.y
  const sx = end.x - start.x
  const sy = end.y - start.y
  const denom = dx * sy - dy * sx
  if (Math.abs(denom) < 1e-12) return null

  const ox = start.x - origin.x
  const oy = start.y - origin.y
  const t = (ox * sy - oy * sx) / denom
  const u = (ox * dy - oy * dx) / denom
  if (t <= 1e-4 || t >= 1 - 1e-4) return null
  if (u < -1e-3 || u > 1 + 1e-3) return null
  return { x: start.x + u * sx, y: start.y + u * sy, t }
}

function segmentInside(boundary: readonly Vec2[], from: Vec2, to: Vec2): boolean {
  for (let step = 1; step <= 3; step++) {
    const t = step / 4
    const sample = {
      x: from.x + (to.x - from.x) * t,
      y: from.y + (to.y - from.y) * t,
    }
    if (!pointInPolygon(sample, boundary)) return false
  }
  return true
}

function horizontalDirectivity(
  source: Speaker,
  from: Vec3,
  to: Vec3,
  frequencyHz: number,
): number {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const horizontal = Math.hypot(dx, dy)
  const yaw = degToRad(source.yawDeg)
  const aimX = -Math.sin(yaw)
  const aimY = -Math.cos(yaw)
  const cosine =
    horizontal < 1e-9 ? 1 : clamp((dx * aimX + dy * aimY) / horizontal, -1, 1)
  return coverageDirectivity(
    Math.acos(cosine),
    effectiveCoverageDeg(source.coverageHorizontalDeg, frequencyHz),
  )
}

function segmentHitsBox(from: Vec3, to: Vec3, box: SolidBox): boolean {
  const delta = { x: to.x - from.x, y: to.y - from.y, z: to.z - from.z }
  const origin = { x: from.x, y: from.y, z: from.z }
  const min = { x: box.minX, y: box.minY, z: box.minZ }
  const max = { x: box.maxX, y: box.maxY, z: box.maxZ }
  let tMin = 0
  let tMax = 1
  const axes = ['x', 'y', 'z'] as const
  for (const axis of axes) {
    const component = delta[axis]
    const start = origin[axis]
    if (Math.abs(component) < 1e-12) {
      if (start <= min[axis] + 1e-6 || start >= max[axis] - 1e-6) return false
      continue
    }
    let t1 = (min[axis] - start) / component
    let t2 = (max[axis] - start) / component
    if (t1 > t2) {
      const swap = t1
      t1 = t2
      t2 = swap
    }
    tMin = Math.max(tMin, t1)
    tMax = Math.min(tMax, t2)
    if (tMin > tMax) return false
  }
  const lo = Math.max(tMin, 1e-3)
  const hi = Math.min(tMax, 1 - 1e-3)
  return hi - lo > 1e-3
}
