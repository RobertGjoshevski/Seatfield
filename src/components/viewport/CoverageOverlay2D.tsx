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

  const width = grid.maxX - grid.minX
  const height = grid.maxY - grid.minY

  return (
    <image
      data-testid="coverage-overlay-2d"
      href={imageUrl}
      x={grid.minX}
      y={-grid.maxY}
      width={width}
      height={height}
      opacity={0.72}
      preserveAspectRatio="none"
      style={{ pointerEvents: 'none' }}
    />
  )
}
