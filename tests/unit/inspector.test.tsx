import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_PREVIEW_FREQUENCY_HZ } from '../../src/core/acoustics/roomField'
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

  it('edits a solid and the reflection order', () => {
    const store = useProjectStore.getState()
    store.beginRectangle({ x: 1, y: 1 })
    store.setRectangleWidth(2)
    store.setRectangleDepth(1)
    store.commitObject()
    render(<Inspector />)

    fireEvent.change(screen.getByLabelText('Height'), {
      target: { value: '1.5' },
    })
    fireEvent.change(screen.getByLabelText('Position Z'), {
      target: { value: '0.4' },
    })
    fireEvent.click(screen.getByRole('button', { name: '2nd' }))

    const object = useProjectStore.getState().project.objects[0]
    expect(object.height).toBe(1.5)
    expect(object.position.z).toBe(0.4)
    expect(useProjectStore.getState().reflectionOrder).toBe(2)
  })

  it('updates the listener ear height', () => {
    render(<Inspector />)
    fireEvent.change(screen.getByLabelText('Ear height'), {
      target: { value: '1.7' },
    })
    expect(useProjectStore.getState().project.listener.earHeight).toBe(1.7)
  })

  it('edits a speaker position, disables it, and removes it', () => {
    useProjectStore.getState().addSpeaker({ x: 1, y: 1 })
    render(<Inspector />)

    fireEvent.change(screen.getByLabelText('Position X'), {
      target: { value: '2.5' },
    })
    expect(
      useProjectStore.getState().project.speakers[0].position.x,
    ).toBe(2.5)

    fireEvent.click(screen.getByLabelText('Enabled'))
    expect(useProjectStore.getState().project.speakers[0].enabled).toBe(false)

    fireEvent.click(screen.getByText('Remove speaker'))
    expect(useProjectStore.getState().project.speakers).toHaveLength(0)
  })

  it('edits the cabinet size', () => {
    useProjectStore.getState().addSpeaker({ x: 1, y: 1 })
    render(<Inspector />)

    fireEvent.change(screen.getByLabelText('Cabinet width'), {
      target: { value: '1.2' },
    })
    fireEvent.change(screen.getByLabelText('Cabinet depth'), {
      target: { value: '0.8' },
    })
    fireEvent.change(screen.getByLabelText('Cabinet height'), {
      target: { value: '1.1' },
    })

    const cabinet = useProjectStore.getState().project.speakers[0]
    expect(cabinet.widthM).toBe(1.2)
    expect(cabinet.depthM).toBe(0.8)
    expect(cabinet.heightM).toBe(1.1)
  })

  it('lets a frequency be typed before the minimum is reached', async () => {
    const user = userEvent.setup()
    render(<Inspector />)
    const input = screen.getByLabelText('Frequency')

    await user.clear(input)
    await user.type(input, '5')
    expect(input).toHaveValue(5)
    expect(useProjectStore.getState().previewFrequencyHz).toBe(
      DEFAULT_PREVIEW_FREQUENCY_HZ,
    )

    await user.type(input, '0')
    expect(input).toHaveValue(50)
    expect(useProjectStore.getState().previewFrequencyHz).toBe(50)
  })

  it('clamps an unfinished frequency when the field is left', async () => {
    const user = userEvent.setup()
    render(<Inspector />)
    const input = screen.getByLabelText('Frequency')

    await user.clear(input)
    await user.type(input, '5')
    await user.tab()

    expect(useProjectStore.getState().previewFrequencyHz).toBe(20)
    expect(input).toHaveValue(20)
  })

  it('opens a stage and sets the resolution multiplier', () => {
    render(<Inspector />)
    fireEvent.click(screen.getByTestId('space-open'))

    const room = useProjectStore.getState().project.room
    expect(room.kind).toBe('open')
    expect(room.boundary).toHaveLength(4)
    expect(screen.getByTestId('ground-bounce')).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    fireEvent.click(screen.getByTestId('resolution-2'))
    expect(useProjectStore.getState().resolutionMultiplier).toBe(2)
    expect(screen.getByText(/m · \d+×\d+/)).toBeInTheDocument()
  })

  it('copies and pastes the selected speakers', () => {
    const store = useProjectStore.getState()
    store.addSpeaker({ x: 1, y: 1 })
    const first = useProjectStore.getState().project.speakers[0].id
    store.addSpeaker({ x: 2, y: 3 })
    store.select(first, 'toggle')
    render(<Inspector />)

    expect(screen.getByText(/2 speakers selected/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Paste speakers' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Copy speakers' }))
    fireEvent.click(screen.getByRole('button', { name: 'Paste speakers' }))

    const speakers = useProjectStore.getState().project.speakers
    expect(speakers).toHaveLength(4)
    expect(speakers[2].position).toEqual({ x: 1.5, y: 1.5, z: 1 })
    expect(speakers[3].name).toBe('Speaker 2 copy')
    expect(screen.getByRole('button', { name: 'Remove speakers' })).toBeInTheDocument()
  })

  it('writes speaker parameters onto every selected speaker', () => {
    const store = useProjectStore.getState()
    store.addSpeaker({ x: 1, y: 1 })
    const first = useProjectStore.getState().project.speakers[0].id
    store.addSpeaker({ x: 4, y: 2 })
    store.select(first, 'toggle')
    render(<Inspector />)

    fireEvent.change(screen.getByLabelText('Gain'), { target: { value: '-6' } })
    fireEvent.change(screen.getByLabelText('Position X'), { target: { value: '2' } })
    fireEvent.change(screen.getByLabelText('Speaker name'), {
      target: { value: 'Left' },
    })

    const speakers = useProjectStore.getState().project.speakers
    expect(speakers[0].name).toBe('Left')
    expect(speakers[1].name).toBe('Speaker 2')
    expect(speakers[0].gainDb).toBe(-6)
    expect(speakers[1].gainDb).toBe(-6)
    expect(speakers[0].position.x).toBe(2)
    expect(speakers[1].position.x).toBe(5)
    expect(speakers[1].position.y).toBe(2)
  })
})
