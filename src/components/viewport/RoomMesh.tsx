import { useMemo } from 'react'
import * as THREE from 'three'
import { useProjectStore } from '../../store/projectStore'
import { buildWallMeshes } from '../../core/geometry/walls'

export function RoomMesh() {
  const room = useProjectStore((state) => state.project.room)
  const shape = useMemo(() => {
    if (room.boundary.length < 3) return null
    const next = new THREE.Shape()
    room.boundary.forEach((point, index) => {
      if (index === 0) next.moveTo(point.x, point.y)
      else next.lineTo(point.x, point.y)
    })
    next.closePath()
    return next
  }, [room.boundary])

  const walls = useMemo(() => buildWallMeshes(room), [room])

  if (!shape) return null

  return (
    <group>
      <mesh receiveShadow>
        <shapeGeometry args={[shape]} />
        <meshStandardMaterial color="#111827" side={THREE.DoubleSide} />
      </mesh>
      {walls.map((wall, index) => (
        <mesh
          key={index}
          position={[wall.center.x, wall.center.y, wall.center.z]}
          rotation={[0, 0, wall.angleRad]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[wall.size.x, wall.size.y, wall.size.z]} />
          <meshStandardMaterial
            color="#334155"
            transparent
            opacity={0.72}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  )
}
