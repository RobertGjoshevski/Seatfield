import { useMemo } from 'react'
import { useCoverageHeatmap } from '../../hooks/useCoverageHeatmap'
import { buildCoverageDataUrl } from '../../lib/heatmap'

export function CoverageOverlay2D() {
  const { grid, minDb, maxDb } = useCoverageHeatmap()
  const imageUrl = useMemo(
    () =>
      grid ? buildCoverageDataUrl(grid, minDb, maxDb) : null,
    [grid, minDb, maxDb],
  )

  if (!grid || !imageUrl) return null

  const width = (grid.nx - 1) * grid.spacing
  const height = (grid.ny - 1) * grid.spacing

  return (
    <image
      data-testid="coverage-overlay-2d"
      href={imageUrl}
      x={grid.minX}
      y={-(grid.minY + height)}
      width={width}
      height={height}
      opacity={0.72}
      preserveAspectRatio="none"
      style={{ pointerEvents: 'none' }}
    />
  )
}
