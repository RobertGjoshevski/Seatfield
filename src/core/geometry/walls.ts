import type { Room, Vec3 } from '../types'

export interface WallMesh {
  center: Vec3
  size: { x: number; y: number; z: number }
  angleRad: number
  length: number
}

export function buildWallMeshes(room: Room): WallMesh[] {
  const boundary = room.boundary
  if (boundary.length < 3) return []

  return boundary.map((start, index) => {
    const end = boundary[(index + 1) % boundary.length]
    const dx = end.x - start.x
    const dy = end.y - start.y
    const length = Math.hypot(dx, dy)
    const angleRad = Math.atan2(dy, dx)
    const nx = dy / length
    const ny = -dx / length
    const thickness = room.wallThickness
    return {
      center: {
        x: (start.x + end.x) / 2 + (nx * thickness) / 2,
        y: (start.y + end.y) / 2 + (ny * thickness) / 2,
        z: room.height / 2,
      },
      size: {
        x: length + thickness,
        y: thickness,
        z: room.height,
      },
      angleRad,
      length,
    }
  })
}
