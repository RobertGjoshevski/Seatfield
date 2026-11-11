import { beforeEach, describe, expect, it } from 'vitest'
import {
  STORAGE_KEY,
  loadPersistedProject,
  savePersistedProject,
} from '../../src/lib/persistence'
import { createDefaultProject } from '../../src/store/projectStore'

describe('project persistence', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('round-trips a project and the grid spacing', () => {
    const project = createDefaultProject()
    project.name = 'Studio A'
    project.room.boundary = [
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 4, y: 3 },
      { x: 0, y: 3 },
    ]

    expect(
      savePersistedProject({ project, coverageSpacing: 0.5 }),
    ).toBe(true)

    const loaded = loadPersistedProject()
    expect(loaded?.project.name).toBe('Studio A')
    expect(loaded?.project.room.boundary).toHaveLength(4)
    expect(loaded?.coverageSpacing).toBe(0.5)
  })

  it('returns null for malformed JSON', () => {
    localStorage.setItem(STORAGE_KEY, '{not json')
    expect(loadPersistedProject()).toBeNull()
  })

  it('rejects an invalid project', () => {
    const project = createDefaultProject()
    project.room.height = -1
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ project, coverageSpacing: 0.25 }),
    )
    expect(loadPersistedProject()).toBeNull()
  })
})
