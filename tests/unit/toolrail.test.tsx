import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { ToolRail } from '../../src/components/layout/ToolRail'
import { useProjectStore } from '../../src/store/projectStore'

describe('ToolRail', () => {
  beforeEach(() => {
    useProjectStore.getState().reset()
  })

  it('renders every tool', () => {
    render(<ToolRail />)
    expect(screen.getByTestId('tool-select')).toBeInTheDocument()
    expect(screen.getByTestId('tool-room')).toBeInTheDocument()
    expect(screen.getByTestId('tool-object')).toBeInTheDocument()
    expect(screen.getByTestId('tool-speaker')).toBeInTheDocument()
    expect(screen.getByTestId('tool-listener')).toBeInTheDocument()
  })
})
