import { Line } from '@react-three/drei'
import { useProjectStore } from '../../store/projectStore'

export function ListenerMarker() {
  const listener = useProjectStore((state) => state.project.listener)

  return (
    <group
      position={[listener.position.x, listener.position.y, listener.earHeight]}
    >
      <mesh>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="#38bdf8" />
      </mesh>
      <Line
        points={[
          [0, 0, 0],
          [0, 0, -listener.earHeight],
        ]}
        color="#38bdf8"
        lineWidth={2}
      />
    </group>
  )
}
