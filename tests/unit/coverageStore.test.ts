import { beforeEach, describe, expect, it } from 'vitest'
import {
  buildCoverageGrid,
  computeCoverage,
} from '../../src/core/geometry/coverage'
import { useProjectStore } from '../../src/store/projectStore'

const boundary = [
  { x: 0, y: 0 },
  { x: 4, y: 0 },
  { x: 4, y: 3 },
  { x: 0, y: 3 },
]

function makeGrid() {
  const grid = buildCoverageGrid(boundary, 1, 1.2)
  if (!grid) throw new Error('Expected a grid')
  return computeCoverage(grid, [])
}

describe('coverage state', () => {
  beforeEach(() => {
    useProjectStore.getState().reset()
  })

  it('stores the latest preview result', () => {
    const store = useProjectStore.getState()
    store.beginCoverage(1)
    store.finishCoverage(1, makeGrid(), 12, ['note'])

    const coverage = useProjectStore.getState().coverage
    expect(coverage.status).toBe('ready')
    expect(coverage.grid).not.toBeNull()
    expect(coverage.elapsedMs).toBe(12)
    expect(coverage.warnings).toEqual(['note'])
  })

  it('ignores stale results and records failures', () => {
    const store = useProjectStore.getState()
    store.beginCoverage(2)
    store.finishCoverage(1, makeGrid(), 12, [])
    expect(useProjectStore.getState().coverage.status).toBe('running')

    store.failCoverage(2, 'Worker failed')
    const coverage = useProjectStore.getState().coverage
    expect(coverage.status).toBe('error')
    expect(coverage.error).toBe('Worker failed')
  })

  it('clears coverage on reset', () => {
    useProjectStore.getState().beginCoverage(1)
    useProjectStore.getState().reset()

    const coverage = useProjectStore.getState().coverage
    expect(coverage.status).toBe('idle')
    expect(coverage.grid).toBeNull()
  })
})
