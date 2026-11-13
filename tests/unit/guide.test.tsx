import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  GUIDE_STORAGE_KEY,
  Guide,
  useGuideOpen,
} from '../../src/components/layout/Guide'
import { TopBar } from '../../src/components/layout/TopBar'
import { useProjectStore } from '../../src/store/projectStore'

function Harness() {
  const guide = useGuideOpen()
  return (
    <>
      <TopBar onShowGuide={guide.show} />
      <Guide open={guide.open} onDismiss={guide.dismiss} />
    </>
  )
}

describe('first-visit guide', () => {
  beforeEach(() => {
    localStorage.clear()
    useProjectStore.getState().reset()
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('shows the workflow until it is dismissed', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    const guide = screen.getByTestId('guide')
    expect(guide).toHaveTextContent('Draw the room')
    expect(guide).toHaveTextContent('Place sound')
    expect(guide).toHaveTextContent('Read the map')

    await user.click(screen.getByTestId('dismiss-guide'))

    expect(screen.queryByTestId('guide')).not.toBeInTheDocument()
    expect(localStorage.getItem(GUIDE_STORAGE_KEY)).toBe('dismissed')
  })

  it('stays hidden after it has been dismissed', () => {
    localStorage.setItem(GUIDE_STORAGE_KEY, 'dismissed')
    render(<Harness />)
    expect(screen.queryByTestId('guide')).not.toBeInTheDocument()
  })

  it('opens again from the top bar', async () => {
    const user = userEvent.setup()
    localStorage.setItem(GUIDE_STORAGE_KEY, 'dismissed')
    render(<Harness />)

    await user.click(screen.getByTestId('show-guide'))

    expect(screen.getByTestId('guide')).toBeInTheDocument()
  })

  it('closes for this visit when storage rejects the flag', async () => {
    const user = userEvent.setup()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage blocked')
    })
    render(<Harness />)

    await user.click(screen.getByTestId('dismiss-guide'))

    expect(screen.queryByTestId('guide')).not.toBeInTheDocument()
  })
})
