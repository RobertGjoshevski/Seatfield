import { describe, expect, it } from 'vitest'
import {
  buildCoverageRgba,
  colorForDb,
  computeCoverageStats,
} from '../../src/lib/heatmap'
import type { CoverageGrid } from '../../src/core/geometry/coverage'

describe('heatmap helpers', () => {
  it('computes stats while ignoring NaN cells', () => {
    const stats = computeCoverageStats(
      new Float32Array([Number.NaN, -10, -20, -10]),
    )
    expect(stats).not.toBeNull()
    if (!stats) throw new Error('Expected stats')

    expect(stats.count).toBe(3)
    expect(stats.minDb).toBe(-20)
    expect(stats.maxDb).toBe(-10)
    expect(stats.meanDb).toBeCloseTo(-13.333, 3)
    expect(stats.stdDevDb).toBeCloseTo(4.714, 3)
  })

  it('returns null when no cell has a level', () => {
    expect(
      computeCoverageStats(
        new Float32Array([Number.NaN, Number.NaN]),
      ),
    ).toBeNull()
  })

  it('maps levels into viridis with transparent outside cells', () => {
    expect(colorForDb(Number.NaN, -30, 0)[3]).toBe(0)

    const low = colorForDb(-60, -30, 0)
    const high = colorForDb(10, -30, 0)
    expect(low[3]).toBe(210)
    expect(high[3]).toBe(210)
    expect(high[0]).toBeGreaterThan(low[0])
  })

  it('builds RGBA data with transparent outside cells', () => {
    const grid: CoverageGrid = {
      minX: 0,
      minY: 0,
      maxX: 2,
      maxY: 1,
      spacing: 1,
      nx: 2,
      ny: 1,
      listenerZ: 1.2,
      values: new Float32Array([0, Number.NaN]),
    }

    const rgba = buildCoverageRgba(grid)
    expect(rgba).toHaveLength(8)
    expect(rgba[3]).toBe(210)
    expect(rgba[7]).toBe(0)
  })

  it('flips rows for image consumers when asked', () => {
    const grid: CoverageGrid = {
      minX: 0,
      minY: 0,
      maxX: 1,
      maxY: 2,
      spacing: 1,
      nx: 1,
      ny: 2,
      listenerZ: 1.2,
      values: new Float32Array([0, Number.NaN]),
    }

    const normal = buildCoverageRgba(grid)
    const flipped = buildCoverageRgba(grid, -30, 0, true)
    expect(normal[3]).toBe(210)
    expect(normal[7]).toBe(0)
    expect(flipped[3]).toBe(0)
    expect(flipped[7]).toBe(210)
  })
})
