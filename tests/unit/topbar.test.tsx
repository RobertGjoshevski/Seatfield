import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TopBar } from '../../src/components/layout/TopBar'
import { serializePersistedProject } from '../../src/lib/persistence'
import {
  createDefaultProject,
  useProjectStore,
} from '../../src/store/projectStore'

describe('TopBar setup files', () => {
  beforeEach(() => {
    useProjectStore.getState().reset()
    localStorage.clear()
  })

  it('loads an exported setup into the project', async () => {
    const project = createDefaultProject()
    project.name = 'Imported studio'
    const file = new File(
      [
        serializePersistedProject({
          project,
          coverageSpacing: 0.5,
          resolutionMultiplier: 2,
          previewFrequencyHz: 63,
          reflectionOrder: 3,
          viewMode: '3d',
        }),
      ],
      'imported-studio.rrs.json',
      { type: 'application/json' },
    )

    render(<TopBar />)
    await userEvent.upload(screen.getByTestId('load-setup-file'), file)

    await waitFor(() => {
      expect(useProjectStore.getState().project.name).toBe('Imported studio')
    })
    expect(useProjectStore.getState().viewMode).toBe('3d')
    expect(useProjectStore.getState().previewFrequencyHz).toBe(63)
    expect(screen.queryByTestId('setup-error')).not.toBeInTheDocument()
  })

  it('reports a file that is not a setup', async () => {
    render(<TopBar />)
    const file = new File(['{}'], 'notes.json', { type: 'application/json' })
    await userEvent.upload(screen.getByTestId('load-setup-file'), file)
    expect(await screen.findByTestId('setup-error')).toHaveTextContent(
      'Could not load that setup',
    )
  })

  it('downloads the current setup', async () => {
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {})
    useProjectStore.setState({
      project: { ...useProjectStore.getState().project, name: 'Live room' },
    })

    render(<TopBar />)
    await userEvent.click(screen.getByTestId('export-setup'))

    expect(click).toHaveBeenCalled()
    click.mockRestore()
  })
})
