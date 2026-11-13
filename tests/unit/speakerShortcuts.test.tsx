import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useSpeakerShortcuts } from '../../src/hooks/useSpeakerShortcuts'
import { useProjectStore } from '../../src/store/projectStore'

function Harness() {
  useSpeakerShortcuts()
  return null
}

describe('speaker shortcuts', () => {
  beforeEach(() => {
    useProjectStore.getState().reset()
    useProjectStore.setState((state) => {
      state.project.speakers = []
      state.selectedId = null
      state.selectedIds = []
    })
  })

  it('copies and pastes the selected speakers', () => {
    render(<Harness />)
    const store = useProjectStore.getState()
    store.addSpeaker({ x: 1, y: 2 })
    const first = useProjectStore.getState().project.speakers[0].id
    store.addSpeaker({ x: 3, y: 4 })
    store.select(first, 'toggle')

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', ctrlKey: true }))
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'v', ctrlKey: true }))

    const speakers = useProjectStore.getState().project.speakers
    expect(speakers).toHaveLength(4)
    expect(speakers[2].position).toEqual({ x: 1.5, y: 2.5, z: 1 })
    expect(speakers[3].position).toEqual({ x: 3.5, y: 4.5, z: 1 })
  })

  it('leaves the clipboard alone while typing', () => {
    render(
      <>
        <Harness />
        <input aria-label="Name" />
      </>,
    )
    useProjectStore.getState().addSpeaker({ x: 1, y: 1 })
    const input = document.querySelector('input')
    input?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'c', ctrlKey: true, bubbles: true }),
    )
    expect(useProjectStore.getState().speakerClipboard).toBeNull()
  })

  it('deletes every selected speaker', () => {
    render(<Harness />)
    const store = useProjectStore.getState()
    store.addSpeaker({ x: 1, y: 1 })
    const first = useProjectStore.getState().project.speakers[0].id
    store.addSpeaker({ x: 2, y: 2 })
    store.select(first, 'toggle')

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete' }))

    expect(useProjectStore.getState().project.speakers).toHaveLength(0)
    expect(useProjectStore.getState().selectedIds).toEqual([])
  })
})
