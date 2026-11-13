import { Edges } from '@react-three/drei'
import { useProjectStore } from '../../store/projectStore'

export function ObjectMeshes() {
  const objects = useProjectStore((state) => state.project.objects)
  const selectedIds = useProjectStore((state) => state.selectedIds)
  const select = useProjectStore((state) => state.select)

  return (
    <group>
      {objects.map((object) => {
        if (!(object.width > 0) || !(object.depth > 0) || !(object.height > 0)) {
          return null
        }
        const selected = selectedIds.includes(object.id)
        return (
          <mesh
            key={object.id}
            position={[
              object.position.x + object.width / 2,
              object.position.y + object.depth / 2,
              object.position.z + object.height / 2,
            ]}
            castShadow
            receiveShadow
            onClick={(event) => {
              event.stopPropagation()
              if (event.ctrlKey || event.metaKey) {
                select(object.id, 'toggle')
                return
              }
              if (selected && selectedIds.length > 1) return
              select(object.id)
            }}
          >
            <boxGeometry args={[object.width, object.depth, object.height]} />
            <meshStandardMaterial
              color={selected ? '#fbbf24' : '#c2410c'}
              roughness={0.55}
              metalness={0.04}
            />
            <Edges color={selected ? '#fde68a' : '#fdba74'} />
          </mesh>
        )
      })}
    </group>
  )
}
