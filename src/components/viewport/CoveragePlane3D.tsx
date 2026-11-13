import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Line } from '@react-three/drei'
import { useCoverageHeatmap } from '../../hooks/useCoverageHeatmap'

export function CoveragePlane3D() {
  const { grid, rgba } = useCoverageHeatmap()
  const textureRef = useRef<THREE.DataTexture | null>(null)

  const texture = useMemo(() => {
    if (!grid || !rgba) return null
    const next = new THREE.DataTexture(
      rgba,
      grid.nx,
      grid.ny,
      THREE.RGBAFormat,
    )
    next.needsUpdate = true
    next.magFilter = THREE.LinearFilter
    next.minFilter = THREE.LinearFilter
    next.colorSpace = THREE.SRGBColorSpace
    return next
  }, [grid, rgba])

  useEffect(() => {
    const previous = textureRef.current
    textureRef.current = texture
    if (previous && previous !== texture) previous.dispose()
  }, [texture])

  if (!grid || !texture) return null

  const width = Math.max(grid.maxX - grid.minX, grid.spacing)
  const height = Math.max(grid.maxY - grid.minY, grid.spacing)

  return (
    <group
      position={[
        (grid.minX + grid.maxX) / 2,
        (grid.minY + grid.maxY) / 2,
        grid.listenerZ,
      ]}
    >
      <mesh>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial
          map={texture}
          transparent
          opacity={0.82}
          side={THREE.DoubleSide}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <Line
        points={[
          [-width / 2, -height / 2, 0.005],
          [width / 2, -height / 2, 0.005],
          [width / 2, height / 2, 0.005],
          [-width / 2, height / 2, 0.005],
          [-width / 2, -height / 2, 0.005],
        ]}
        color="#2dd4bf"
        lineWidth={1}
        transparent
        opacity={0.45}
      />
    </group>
  )
}
