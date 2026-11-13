import { useMemo } from 'react'
import * as THREE from 'three'
import { Edges } from '@react-three/drei'
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
        <meshStandardMaterial color="#0f1b24" side={THREE.DoubleSide} />
      </mesh>
      {room.kind !== 'open' && walls.map((wall, index) => (
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
            opacity={0.5}
            side={THREE.DoubleSide}
          />
          <Edges color="#475569" />
        </mesh>
      ))}
    </group>
  )
}
