import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { Inspector } from '../../src/components/layout/Inspector'
import { useProjectStore } from '../../src/store/projectStore'

describe('Inspector', () => {
  beforeEach(() => {
    useProjectStore.getState().reset()
  })

  it('updates the room height', () => {
    render(<Inspector />)
    fireEvent.change(screen.getByLabelText('Room height'), {
      target: { value: '4.2' },
    })
    expect(useProjectStore.getState().project.room.height).toBe(4.2)
  })

  it('shows speaker fields when a speaker is selected', () => {
    useProjectStore.getState().addSpeaker({ x: 1, y: 1 })
    render(<Inspector />)
    expect(screen.getByLabelText('Speaker name')).toHaveValue('Speaker 1')
    expect(screen.getByLabelText('Gain')).toHaveValue(0)
  })

  it('updates the listener ear height', () => {
    render(<Inspector />)
    fireEvent.change(screen.getByLabelText('Ear height'), {
      target: { value: '1.7' },
    })
    expect(useProjectStore.getState().project.listener.earHeight).toBe(1.7)
  })
})
