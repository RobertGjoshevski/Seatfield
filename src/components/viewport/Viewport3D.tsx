import { Canvas } from '@react-three/fiber'
import { Grid, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { polygonBounds } from '../../core/geometry/polygon'
import { useProjectStore } from '../../store/projectStore'
import { ObjectMeshes } from './ObjectMeshes'
import { RoomMesh } from './RoomMesh'
import { SpeakerMesh } from './SpeakerMesh'
import { ListenerMarker } from './ListenerMarker'
import { CoveragePlane3D } from './CoveragePlane3D'

export function Viewport3D() {
  const boundary = useProjectStore((state) => state.project.room.boundary)
  const bounds = boundary.length >= 3 ? polygonBounds(boundary) : null
  const span = bounds
    ? Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY, 20)
    : 20
  const target: [number, number, number] = bounds
    ? [
        (bounds.minX + bounds.maxX) / 2,
        (bounds.minY + bounds.maxY) / 2,
        1.2,
      ]
    : [2, 2, 1.5]

  return (
    <div data-testid="viewport-3d" className="h-full w-full">
      <Canvas
        shadows={{ type: THREE.PCFShadowMap }}
        camera={{ position: [8, -8, 7], fov: 45 }}
        onCreated={({ camera }) => {
          camera.up.set(0, 0, 1)
          camera.lookAt(target[0], target[1], target[2])
        }}
      >
        <color attach="background" args={['#0b0f14']} />
        <ambientLight intensity={1.1} />
        <directionalLight
          position={[5, -5, 12]}
          intensity={2}
          castShadow
        />
        <directionalLight position={[-6, 8, 5]} intensity={0.7} color="#38bdf8" />
        <Grid
          args={[span, span]}
          position={[0, 0, -0.01]}
          rotation={[Math.PI / 2, 0, 0]}
          cellSize={span > 40 ? 1 : 0.5}
          cellColor="#1e293b"
          sectionSize={span > 40 ? 5 : 2}
          sectionColor="#334155"
          fadeDistance={Math.max(30, span * 1.5)}
          fadeStrength={1}
          infiniteGrid
        />
        <RoomMesh />
        <ObjectMeshes />
        <CoveragePlane3D />
        <SpeakerMesh />
        <ListenerMarker />
        <OrbitControls makeDefault target={target} />
      </Canvas>
    </div>
  )
}
