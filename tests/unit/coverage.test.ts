import { describe, expect, it } from 'vitest'
import {
  buildCoverageGrid,
  computeCoverage,
} from '../../src/core/geometry/coverage'
import type { CoverageGrid } from '../../src/core/geometry/coverage'
import type { Speaker } from '../../src/core/types'

const rectangle = [
  { x: 0, y: 0 },
  { x: 4, y: 0 },
  { x: 4, y: 3 },
  { x: 0, y: 3 },
]

const lRoom = [
  { x: 0, y: 0 },
  { x: 4, y: 0 },
  { x: 4, y: 1 },
  { x: 1, y: 1 },
  { x: 1, y: 3 },
  { x: 0, y: 3 },
]

const speaker: Speaker = {
  id: 'speaker-1',
  name: 'Speaker 1',
  position: { x: 0.5, y: 0.5, z: 1.2 },
  yawDeg: -90,
  gainDb: 0,
  coverageHorizontalDeg: 90,
  radiatorDiameterM: 0.13,
  enabled: true,
}

function indexOf(grid: CoverageGrid, x: number, y: number): number {
  return (
    Math.round((x - grid.minX) / grid.spacing) +
    Math.round((y - grid.minY) / grid.spacing) * grid.nx
  )
}

describe('coverage grid', () => {
  it('builds a grid over the room bounds', () => {
    const grid = buildCoverageGrid(rectangle, 1, 1.2)
    expect(grid).not.toBeNull()
    if (!grid) throw new Error('Expected a grid')

    expect(grid.minX).toBe(0)
    expect(grid.minY).toBe(0)
    expect(grid.nx).toBe(5)
    expect(grid.ny).toBe(4)
    expect(grid.spacing).toBe(1)
    expect(grid.values).toHaveLength(20)
    expect(grid.values[indexOf(grid, 2, 1)]).toBe(0)
  })

  it('marks cells outside an L-shaped room as NaN', () => {
    const grid = buildCoverageGrid(lRoom, 0.5, 1.2)
    if (!grid) throw new Error('Expected a grid')

    expect(grid.values[indexOf(grid, 0.5, 0.5)]).toBe(0)
    expect(grid.values[indexOf(grid, 2.5, 2.5)]).toBeNaN()
  })

  it('computes levels inside and preserves outside cells', () => {
    const grid = buildCoverageGrid(lRoom, 0.5, 1.2)
    if (!grid) throw new Error('Expected a grid')

    const result = computeCoverage(grid, [
      { ...speaker, coverageHorizontalDeg: 180 },
    ])
    expect(Number.isFinite(result.values[indexOf(result, 0.5, 2.5)])).toBe(
      true,
    )
    expect(result.values[indexOf(result, 2.5, 2.5)]).toBeNaN()
  })

  it('power sums multiple speakers', () => {
    const grid = buildCoverageGrid(rectangle, 0.5, 1.2)
    if (!grid) throw new Error('Expected a grid')

    const one = computeCoverage(grid, [speaker])
    const two = computeCoverage(grid, [speaker, { ...speaker, id: 'speaker-2' }])
    const index = indexOf(grid, 2.5, 0.5)

    expect(one.values[index]).toBeCloseTo(-6.0206, 2)
    expect(two.values[index] - one.values[index]).toBeCloseTo(3.0103, 2)
  })

  it('returns no coverage when every speaker is disabled', () => {
    const grid = buildCoverageGrid(rectangle, 1, 1.2)
    if (!grid) throw new Error('Expected a grid')

    const result = computeCoverage(grid, [{ ...speaker, enabled: false }])
    expect(Array.from(result.values).every((value) => Number.isNaN(value))).toBe(
      true,
    )
  })

  it('returns null without a room', () => {
    expect(buildCoverageGrid([], 0.25, 1.2)).toBeNull()
  })
})
