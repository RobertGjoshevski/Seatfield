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
  const minDb = stats?.minDb ?? DEFAULT_HEATMAP_MIN_DB
  const maxDb = stats?.maxDb ?? DEFAULT_HEATMAP_MAX_DB
  const rgba = useMemo(
    () => (grid ? buildCoverageRgba(grid, minDb, maxDb) : null),
    [grid, minDb, maxDb],
  )
  const gradientCss = useMemo(() => heatmapGradientCss(), [])

  return {
    grid,
    status,
    stats,
    rgba,
    minDb,
    maxDb,
    gradientCss,
  }
}
