import { Line } from '@react-three/drei'
import { useProjectStore } from '../../store/projectStore'
import { degToRad } from '../../lib/math'

export function SpeakerMesh() {
  const speakers = useProjectStore((state) => state.project.speakers)
  const selectedId = useProjectStore((state) => state.selectedId)
  const select = useProjectStore((state) => state.select)

  return (
    <>
      {speakers.map((speaker) => {
        const selected = selectedId === speaker.id
        return (
          <group
            key={speaker.id}
            position={[
              speaker.position.x,
              speaker.position.y,
              speaker.position.z,
            ]}
            rotation={[0, 0, degToRad(speaker.yawDeg)]}
            onClick={(event) => {
              event.stopPropagation()
              select(speaker.id)
            }}
          >
            {selected && (
              <mesh>
                <torusGeometry args={[0.22, 0.012, 8, 32]} />
                <meshBasicMaterial color="#fde68a" />
              </mesh>
            )}
            <mesh castShadow>
              <boxGeometry args={[0.25, 0.3, 0.25]} />
              <meshStandardMaterial
                color="#f59e0b"
                emissive={selected ? '#f59e0b' : '#000000'}
                emissiveIntensity={selected ? 0.35 : 0}
              />
            </mesh>
            <Line
              points={[
                [0, 0, 0],
                [0, -0.6, 0],
              ]}
              color="#fbbf24"
              lineWidth={2}
            />
            <mesh position={[0, -0.64, 0]} rotation={[Math.PI, 0, 0]}>
              <coneGeometry args={[0.05, 0.12, 12]} />
              <meshStandardMaterial color="#fbbf24" />
            </mesh>
          </group>
        )
      })}
    </>
  )
}
