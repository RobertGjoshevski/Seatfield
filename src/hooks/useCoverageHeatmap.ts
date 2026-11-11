import { useMemo } from 'react'
import {
  DEFAULT_HEATMAP_MAX_DB,
  DEFAULT_HEATMAP_MIN_DB,
  buildCoverageRgba,
  computeCoverageStats,
  heatmapGradientCss,
} from '../lib/heatmap'
import { useProjectStore } from '../store/projectStore'

export function useCoverageHeatmap() {
  const grid = useProjectStore((state) => state.coverage.grid)
  const status = useProjectStore((state) => state.coverage.status)

  const stats = useMemo(
    () => (grid ? computeCoverageStats(grid.values) : null),
    [grid],
  )
  const rgba = useMemo(
    () => (grid ? buildCoverageRgba(grid) : null),
    [grid],
  )
  const gradientCss = useMemo(() => heatmapGradientCss(), [])

  return {
    grid,
    status,
    stats,
    rgba,
    minDb: DEFAULT_HEATMAP_MIN_DB,
    maxDb: DEFAULT_HEATMAP_MAX_DB,
    gradientCss,
  }
}
