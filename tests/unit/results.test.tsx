import { act, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { SPEED_OF_SOUND_M_S } from '../../src/core/acoustics/roomField'
import { ResultsPanel } from '../../src/components/layout/ResultsPanel'
import {
  buildCoverageGrid,
  computeCoverage,
} from '../../src/core/geometry/coverage'
import type { Speaker } from '../../src/core/types'
import { useProjectStore } from '../../src/store/projectStore'

const boundary = [
  { x: 0, y: 0 },
  { x: 4, y: 0 },
  { x: 4, y: 3 },
  { x: 0, y: 3 },
]

const speaker: Speaker = {
  id: 'speaker-1',
  name: 'Speaker 1',
  position: { x: 0.5, y: 0.5, z: 1.2 },
  yawDeg: 180,
  gainDb: 0,
  coverageHorizontalDeg: 180,
  radiatorDiameterM: 0.13,
  widthM: 0.6,
  depthM: 0.5,
  heightM: 0.7,
  phaseInverted: false,
  delayMs: 0,
  enabled: true,
}

describe('ResultsPanel', () => {
  beforeEach(() => {
    useProjectStore.getState().reset()
  })

  it('shows coverage statistics after a result', () => {
    const grid = buildCoverageGrid(boundary, 0.5, 1.2)
    if (!grid) throw new Error('Expected a grid')

    const store = useProjectStore.getState()
    store.beginCoverage(1)
    store.finishCoverage(
      1,
      computeCoverage(grid, [speaker], { boundary, height: 3 }, 80),
      12,
      [],
    )

    render(<ResultsPanel />)

    expect(screen.getByTestId('coverage-status')).toHaveTextContent('Ready')
    expect(screen.getByTestId('coverage-points')).not.toHaveTextContent('—')
    expect(screen.getByTestId('coverage-min')).not.toHaveTextContent('—')
  })

  it('shows the error state', () => {
    const store = useProjectStore.getState()
    store.beginCoverage(2)
    store.failCoverage(2, 'Worker failed')

    render(<ResultsPanel />)

    expect(screen.getByTestId('coverage-status')).toHaveTextContent('Error')
    expect(screen.getByText('Worker failed')).toBeInTheDocument()
  })

  it('updates the listener level when the listener moves', () => {
    const store = useProjectStore.getState()
    store.updateRoom({ boundary, height: 2.5 })
    store.addSpeaker({ x: 0.5, y: 0.5 })
    store.setPreviewFrequencyHz(SPEED_OF_SOUND_M_S / 8)
    store.setListener({ x: 0.2, y: 1.5 })

    render(<ResultsPanel />)

    const first = screen.getByTestId('listener-level').textContent
    expect(first).not.toBe('—')

    act(() => {
      useProjectStore.getState().setListener({ x: 2, y: 1.5 })
    })

    expect(screen.getByTestId('listener-level').textContent).not.toBe(first)
  })
})
