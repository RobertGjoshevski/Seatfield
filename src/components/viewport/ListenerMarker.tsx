import { Line } from '@react-three/drei'
import { useProjectStore } from '../../store/projectStore'

export function ListenerMarker() {
  const listener = useProjectStore((state) => state.project.listener)
  const selectedIds = useProjectStore((state) => state.selectedIds)
  const select = useProjectStore((state) => state.select)
  const selected = selectedIds.includes(listener.id)

  return (
    <group
      position={[listener.position.x, listener.position.y, listener.earHeight]}
      onClick={(event) => {
        event.stopPropagation()
        if (event.ctrlKey || event.metaKey) {
          select(listener.id, 'toggle')
          return
        }
        if (selected && selectedIds.length > 1) return
        select(listener.id)
      }}
    >
      {selected && (
        <mesh>
          <torusGeometry args={[0.16, 0.01, 8, 32]} />
          <meshBasicMaterial color="#7dd3fc" />
        </mesh>
      )}
      <mesh>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial
          color="#38bdf8"
          emissive={selected ? '#38bdf8' : '#000000'}
          emissiveIntensity={selected ? 0.5 : 0}
        />
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
