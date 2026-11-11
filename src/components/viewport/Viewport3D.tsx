import { Canvas } from '@react-three/fiber'
import { Grid, OrbitControls } from '@react-three/drei'
import { RoomMesh } from './RoomMesh'

export function Viewport3D() {
  return (
    <div data-testid="viewport-3d" className="h-full w-full">
      <Canvas
        shadows
        camera={{ position: [7, -7, 6], fov: 50 }}
        onCreated={({ camera }) => {
          camera.up.set(0, 0, 1)
          camera.lookAt(2, 2, 1.5)
        }}
      >
        <color attach="background" args={['#0b0f14']} />
        <ambientLight intensity={1.1} />
        <directionalLight
          position={[5, -5, 12]}
          intensity={2}
          castShadow
        />
        <Grid
          args={[20, 20]}
          position={[0, 0, -0.01]}
          rotation={[Math.PI / 2, 0, 0]}
          cellSize={0.5}
          cellColor="#1e293b"
          sectionSize={2}
          sectionColor="#334155"
          fadeDistance={30}
          fadeStrength={1}
          infiniteGrid
        />
        <RoomMesh />
        <OrbitControls makeDefault target={[2, 2, 1.5]} />
      </Canvas>
    </div>
  )
}
