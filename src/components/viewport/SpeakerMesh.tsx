import { useProjectStore } from '../../store/projectStore'
import { degToRad } from '../../lib/math'
import {
  DEFAULT_SPEAKER_DEPTH_M,
  DEFAULT_SPEAKER_HEIGHT_M,
  DEFAULT_SPEAKER_WIDTH_M,
} from '../../core/types'

function cabinetSize(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? value : fallback
}

export function SpeakerMesh() {
  const speakers = useProjectStore((state) => state.project.speakers)
  const selectedIds = useProjectStore((state) => state.selectedIds)
  const select = useProjectStore((state) => state.select)

  return (
    <>
      {speakers.map((speaker) => {
        const selected = selectedIds.includes(speaker.id)
        const width = cabinetSize(speaker.widthM, DEFAULT_SPEAKER_WIDTH_M)
        const depth = cabinetSize(speaker.depthM, DEFAULT_SPEAKER_DEPTH_M)
        const height = cabinetSize(speaker.heightM, DEFAULT_SPEAKER_HEIGHT_M)
        const coneLength = Math.max(0.08, depth * 0.45)
        const coneRadius = Math.max(0.04, width * 0.22)
        return (
          <group
            key={speaker.id}
            position={[
              speaker.position.x,
              speaker.position.y,
              speaker.position.z,
            ]}
            rotation={[0, 0, -degToRad(speaker.yawDeg)]}
            onClick={(event) => {
              event.stopPropagation()
              if (event.ctrlKey || event.metaKey) {
                select(speaker.id, 'toggle')
                return
              }
              if (selected && selectedIds.length > 1) return
              select(speaker.id)
            }}
          >
            {selected && (
              <mesh>
                <torusGeometry
                  args={[0.55 * Math.hypot(width, depth), 0.012, 8, 32]}
                />
                <meshBasicMaterial color="#fde68a" />
              </mesh>
            )}
            <mesh castShadow>
              <boxGeometry args={[width, depth, height]} />
              <meshStandardMaterial
                color="#f59e0b"
                emissive={selected ? '#f59e0b' : '#000000'}
                emissiveIntensity={selected ? 0.35 : 0}
              />
            </mesh>
            <mesh
              position={[0, -(depth / 2 + coneLength / 2), 0]}
              rotation={[Math.PI, 0, 0]}
              castShadow
            >
              <coneGeometry args={[coneRadius, coneLength, 12]} />
              <meshStandardMaterial color="#fbbf24" />
            </mesh>
          </group>
        )
      })}
    </>
  )
}
