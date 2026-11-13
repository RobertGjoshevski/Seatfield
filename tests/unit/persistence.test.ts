import { beforeEach, describe, expect, it } from 'vitest'
import {
  STORAGE_KEY,
  loadPersistedProject,
  parsePersistedProject,
  savePersistedProject,
  serializePersistedProject,
  setupFileName,
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
      savePersistedProject({
        project,
        coverageSpacing: 0.5,
        resolutionMultiplier: 2,
        previewFrequencyHz: 125,
        reflectionOrder: 2,
        viewMode: '3d',
      }),
    ).toBe(true)

    const loaded = loadPersistedProject()
    expect(loaded?.project.name).toBe('Studio A')
    expect(loaded?.project.room.boundary).toHaveLength(4)
    expect(loaded?.coverageSpacing).toBe(0.5)
    expect(loaded?.resolutionMultiplier).toBe(2)
    expect(loaded?.previewFrequencyHz).toBe(125)
    expect(loaded?.reflectionOrder).toBe(2)
    expect(loaded?.viewMode).toBe('3d')
    expect(loaded?.project.objects).toEqual([])
  })

  it('exports a setup file that can be loaded again', () => {
    const project = createDefaultProject()
    project.name = 'Studio A'
    const raw = serializePersistedProject({
      project,
      coverageSpacing: 0.5,
      resolutionMultiplier: 1,
      previewFrequencyHz: 80,
      reflectionOrder: 1,
      viewMode: '2d',
    })

    expect(setupFileName(project.name)).toBe('studio-a.rrs.json')
    expect(parsePersistedProject(raw)?.project.name).toBe('Studio A')
    expect(parsePersistedProject('{not json')).toBeNull()
  })

  it('defaults a missing preview frequency to 80 Hz', () => {
    const project = createDefaultProject()
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ project, coverageSpacing: 0.25 }),
    )
    expect(loadPersistedProject()?.previewFrequencyHz).toBe(80)
    expect(loadPersistedProject()?.reflectionOrder).toBe(1)
    expect(loadPersistedProject()?.viewMode).toBe('2d')
    expect(loadPersistedProject()?.project.objects).toEqual([])
  })

  it('defaults phase and delay on speakers saved before those fields existed', () => {
    const project = createDefaultProject()
    project.speakers = [
      {
        id: 'speaker-1',
        name: 'Speaker 1',
        position: { x: 1, y: 1, z: 1 },
        yawDeg: 0,
        gainDb: 0,
        coverageHorizontalDeg: 90,
        radiatorDiameterM: 0.13,
        widthM: 0.6,
        depthM: 0.5,
        heightM: 0.7,
        enabled: true,
        phaseInverted: false,
        delayMs: 0,
      },
    ]
    const saved = JSON.parse(JSON.stringify({ project, coverageSpacing: 0.25 }))
    delete saved.project.speakers[0].phaseInverted
    delete saved.project.speakers[0].delayMs
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved))

    const loaded = loadPersistedProject()
    expect(loaded?.project.speakers[0].phaseInverted).toBe(false)
    expect(loaded?.project.speakers[0].delayMs).toBe(0)
  })

  it('defaults the space kind, cabinet size, and resolution multiplier', () => {
    const project = createDefaultProject()
    project.speakers = [
      {
        id: 'speaker-1',
        name: 'Speaker 1',
        position: { x: 1, y: 1, z: 1 },
        yawDeg: 0,
        gainDb: 0,
        coverageHorizontalDeg: 90,
        radiatorDiameterM: 0.13,
        widthM: 0.6,
        depthM: 0.5,
        heightM: 0.7,
        enabled: true,
        phaseInverted: false,
        delayMs: 0,
      },
    ]
    const saved = JSON.parse(JSON.stringify({ project, coverageSpacing: 0.25 }))
    delete saved.project.room.kind
    delete saved.project.speakers[0].widthM
    delete saved.project.speakers[0].depthM
    delete saved.project.speakers[0].heightM
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved))

    const loaded = loadPersistedProject()
    expect(loaded?.resolutionMultiplier).toBe(1)
    expect(loaded?.project.room.kind).toBe('room')
    expect(loaded?.project.speakers[0].widthM).toBe(0.6)
    expect(loaded?.project.speakers[0].depthM).toBe(0.5)
    expect(loaded?.project.speakers[0].heightM).toBe(0.7)
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
