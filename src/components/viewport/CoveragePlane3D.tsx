import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
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

  const width = Math.max((grid.nx - 1) * grid.spacing, grid.spacing)
  const height = Math.max((grid.ny - 1) * grid.spacing, grid.spacing)

  return (
    <mesh
      position={[
        grid.minX + width / 2,
        grid.minY + height / 2,
        grid.listenerZ,
      ]}
    >
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={0.78}
        side={THREE.DoubleSide}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  )
}
