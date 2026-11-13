import { beforeEach, describe, expect, it } from 'vitest'
import {
  SPEAKER_PASTE_STEP_M,
  useProjectStore,
} from '../../src/store/projectStore'

describe('project store', () => {
  beforeEach(() => {
    useProjectStore.getState().reset()
  })

  it('closes a simple room', () => {
    const store = useProjectStore.getState()
    store.addRoomPoint({ x: 0, y: 0 })
    store.addRoomPoint({ x: 4, y: 0 })
    store.addRoomPoint({ x: 4, y: 3 })
    store.addRoomPoint({ x: 0, y: 3 })
    store.closeRoom()

    const state = useProjectStore.getState()
    expect(state.project.room.boundary).toHaveLength(4)
    expect(state.roomDraft).toHaveLength(0)
    expect(state.activeTool).toBe('select')
  })

  it('rejects a self-intersecting room', () => {
    const store = useProjectStore.getState()
    store.addRoomPoint({ x: 0, y: 0 })
    store.addRoomPoint({ x: 4, y: 3 })
    store.addRoomPoint({ x: 4, y: 0 })
    store.addRoomPoint({ x: 0, y: 3 })
    store.closeRoom()
    expect(useProjectStore.getState().project.room.boundary).toHaveLength(0)
  })

  it('updates room properties', () => {
    useProjectStore.getState().updateRoom({ height: 4.2, wallThickness: 0.2 })
    const room = useProjectStore.getState().project.room
    expect(room.height).toBe(4.2)
    expect(room.wallThickness).toBe(0.2)
  })

  it('adds a speaker and moves the listener', () => {
    const store = useProjectStore.getState()
    store.addSpeaker({ x: 1, y: 2 })
    store.setListener({ x: 3, y: 4 })

    const state = useProjectStore.getState()
    expect(state.project.speakers).toHaveLength(1)
    expect(state.project.speakers[0].name).toBe('Speaker 1')
    expect(state.project.listener.position).toEqual({ x: 3, y: 4 })
    expect(state.selectedId).toBe(state.project.listener.id)
  })

  it('moves, disables, and removes a speaker', () => {
    const store = useProjectStore.getState()
    store.addSpeaker({ x: 1, y: 2 })
    const id = useProjectStore.getState().project.speakers[0].id

    store.updateSpeaker(id, {
      position: { x: 3, y: 4, z: 1.5 },
      enabled: false,
    })
    let speaker = useProjectStore.getState().project.speakers[0]
    expect(speaker.position).toEqual({ x: 3, y: 4, z: 1.5 })
    expect(speaker.enabled).toBe(false)

    store.removeSpeaker(id)
    expect(useProjectStore.getState().project.speakers).toHaveLength(0)
    expect(useProjectStore.getState().selectedId).toBeNull()
    expect(useProjectStore.getState().selectedIds).toEqual([])
  })

  it('copies and pastes one or more speakers', () => {
    const store = useProjectStore.getState()
    store.addSpeaker({ x: 1, y: 2 })
    const first = useProjectStore.getState().project.speakers[0].id
    store.updateSpeaker(first, {
      name: 'Left',
      gainDb: -6,
      yawDeg: 30,
      phaseInverted: true,
      delayMs: 2.5,
      position: { x: 1, y: 2, z: 1.8 },
    })
    store.addSpeaker({ x: 4, y: 5 })
    const second = useProjectStore.getState().project.speakers[1].id

    store.select(first)
    store.select(second, 'toggle')
    expect(useProjectStore.getState().selectedIds).toEqual([first, second])
    expect(useProjectStore.getState().selectedId).toBe(second)

    store.select(second, 'toggle')
    expect(useProjectStore.getState().selectedIds).toEqual([first])
    store.select(second, 'toggle')

    store.copySpeakers()
    store.pasteSpeakers()

    let speakers = useProjectStore.getState().project.speakers
    expect(speakers).toHaveLength(4)
    expect(speakers[2].name).toBe('Left copy')
    expect(speakers[2].gainDb).toBe(-6)
    expect(speakers[2].yawDeg).toBe(30)
    expect(speakers[2].phaseInverted).toBe(true)
    expect(speakers[2].delayMs).toBe(2.5)
    expect(speakers[2].position).toEqual({
      x: 1 + SPEAKER_PASTE_STEP_M,
      y: 2 + SPEAKER_PASTE_STEP_M,
      z: 1.8,
    })
    expect(speakers[3].name).toBe('Speaker 2 copy')
    expect(speakers[3].position.x).toBeCloseTo(4 + SPEAKER_PASTE_STEP_M)
    expect(speakers[2].id).not.toBe(first)
    expect(useProjectStore.getState().selectedIds).toEqual([
      speakers[2].id,
      speakers[3].id,
    ])

    store.pasteSpeakers()
    speakers = useProjectStore.getState().project.speakers
    expect(speakers).toHaveLength(6)
    expect(speakers[4].name).toBe('Left copy 2')
    expect(speakers[4].position.x).toBeCloseTo(1 + SPEAKER_PASTE_STEP_M * 2)
    expect(speakers[0].position).toEqual({ x: 1, y: 2, z: 1.8 })

    const pasted = speakers.slice(2).map((speaker) => speaker.id)
    store.removeSpeakers(pasted)
    expect(useProjectStore.getState().project.speakers).toHaveLength(2)
    expect(useProjectStore.getState().selectedIds).toEqual([])

    store.select(useProjectStore.getState().project.listener.id, 'toggle')
    expect(useProjectStore.getState().selectedIds).toEqual([
      useProjectStore.getState().project.listener.id,
    ])
    store.copySpeakers()
    expect(useProjectStore.getState().speakerClipboard?.speakers).toHaveLength(2)
  })

  it('moves a group of speakers together', () => {
    const store = useProjectStore.getState()
    store.addSpeaker({ x: 1, y: 2 })
    const first = useProjectStore.getState().project.speakers[0].id
    store.addSpeaker({ x: 3, y: 4 })
    const second = useProjectStore.getState().project.speakers[1].id
    store.select(first)
    store.select(second, 'toggle')
    store.moveSpeakers([
      { id: first, x: 1.5, y: 2.5 },
      { id: second, x: 3.5, y: 4.5 },
    ])
    const speakers = useProjectStore.getState().project.speakers
    expect(speakers[0].position).toEqual({ x: 1.5, y: 2.5, z: 1 })
    expect(speakers[1].position).toEqual({ x: 3.5, y: 4.5, z: 1 })
  })

  it('places a typed segment and commits a sized rectangle', () => {
    const store = useProjectStore.getState()
    store.setTool('room')
    store.addRoomPoint({ x: 0, y: 0 })
    store.setCursorWorld({ x: 3, y: 0 })
    store.setSegmentLength(2.5)
    expect(store.placeTypedSegment()).toBe(true)

    const draft = useProjectStore.getState().roomDraft
    expect(draft[1].x).toBeCloseTo(2.5)
    expect(draft[1].y).toBeCloseTo(0)
    expect(useProjectStore.getState().segmentLengthM).toBeNull()

    store.setRoomShape('rectangle')
    store.beginRectangle({ x: 1, y: 2 })
    store.setRectangleWidth(5)
    store.setRectangleDepth(4)
    store.commitRectangle()

    expect(useProjectStore.getState().project.room.boundary).toEqual([
      { x: 1, y: 2 },
      { x: 6, y: 2 },
      { x: 6, y: 6 },
      { x: 1, y: 6 },
    ])

    useProjectStore.getState().setRoomWidth(8)
    const resized = useProjectStore.getState().project.room.boundary
    expect(resized[0]).toEqual({ x: 1, y: 2 })
    expect(resized[1]).toEqual({ x: 9, y: 2 })
    expect(resized[3]).toEqual({ x: 1, y: 6 })
  })

  it('draws a rectangular solid and edits its height and position', () => {
    const store = useProjectStore.getState()
    store.setTool('object')
    store.beginRectangle({ x: 1, y: 2 })
    store.updateRectanglePointer({ x: 3, y: 1 }, true)
    store.commitObject()

    const object = useProjectStore.getState().project.objects[0]
    expect(object.position.x).toBeCloseTo(1)
    expect(object.position.y).toBeCloseTo(0)
    expect(object.position.z).toBe(0)
    expect(object.width).toBeCloseTo(2)
    expect(object.depth).toBeCloseTo(2)
    expect(object.height).toBe(3)
    expect(useProjectStore.getState().selectedId).toBe(object.id)

    store.updateObject(object.id, {
      position: { x: 1.5, y: 1, z: 0.4 },
      height: 1.2,
    })
    const edited = useProjectStore.getState().project.objects[0]
    expect(edited.position).toEqual({ x: 1.5, y: 1, z: 0.4 })
    expect(edited.height).toBe(1.2)

    store.removeObject(object.id)
    expect(useProjectStore.getState().project.objects).toHaveLength(0)
  })

  it('applies speaker edits to every selected speaker', () => {
    const store = useProjectStore.getState()
    store.addSpeaker({ x: 1, y: 2 })
    const first = useProjectStore.getState().project.speakers[0].id
    store.addSpeaker({ x: 4, y: 5 })
    const second = useProjectStore.getState().project.speakers[1].id
    store.addSpeaker({ x: 8, y: 8 })
    const third = useProjectStore.getState().project.speakers[2].id
    store.select(first)
    store.select(second, 'toggle')

    store.updateSpeaker(first, {
      name: 'Left',
      gainDb: -6,
      yawDeg: 45,
      enabled: false,
      position: { x: 2, y: 2, z: 1.5 },
    })

    const speakers = useProjectStore.getState().project.speakers
    expect(speakers[0].name).toBe('Left')
    expect(speakers[1].name).toBe('Speaker 2')
    expect(speakers[0].gainDb).toBe(-6)
    expect(speakers[1].gainDb).toBe(-6)
    expect(speakers[0].yawDeg).toBe(45)
    expect(speakers[1].yawDeg).toBe(45)
    expect(speakers[0].enabled).toBe(false)
    expect(speakers[1].enabled).toBe(false)
    expect(speakers[0].position).toEqual({ x: 2, y: 2, z: 1.5 })
    expect(speakers[1].position).toEqual({ x: 5, y: 5, z: 1.5 })
    expect(speakers[2].id).toBe(third)
    expect(speakers[2].gainDb).toBe(0)
    expect(speakers[2].position).toEqual({ x: 8, y: 8, z: 1 })
  })

  it('selects speakers and objects inside a rectangle', () => {
    const store = useProjectStore.getState()
    store.addSpeaker({ x: 1, y: 1 })
    const speaker = useProjectStore.getState().project.speakers[0].id
    store.beginRectangle({ x: 4, y: 4 })
    store.setRectangleWidth(1)
    store.setRectangleDepth(1)
    store.commitObject()
    const object = useProjectStore.getState().project.objects[0].id
    const listener = useProjectStore.getState().project.listener.id

    store.selectMany([speaker, object, listener], 'replace')
    expect(useProjectStore.getState().selectedIds).toEqual([
      speaker,
      object,
      listener,
    ])
    expect(useProjectStore.getState().selectedId).toBe(speaker)

    store.selectMany([object], 'subtract')
    expect(useProjectStore.getState().selectedIds).toEqual([speaker, listener])
    expect(useProjectStore.getState().selectedId).toBe(speaker)

    store.selectMany([speaker], 'toggle')
    expect(useProjectStore.getState().selectedIds).toEqual([listener])
    expect(useProjectStore.getState().selectedId).toBe(listener)

    store.selectMany([], 'replace')
    expect(useProjectStore.getState().selectedIds).toEqual([])
    expect(useProjectStore.getState().selectedId).toBeNull()
  })

  it('applies object size to every selected object and shifts the group', () => {
    const store = useProjectStore.getState()
    store.beginRectangle({ x: 0, y: 0 })
    store.setRectangleWidth(1)
    store.setRectangleDepth(1)
    store.commitObject()
    const first = useProjectStore.getState().project.objects[0]
    store.beginRectangle({ x: 3, y: 1 })
    store.setRectangleWidth(1)
    store.setRectangleDepth(1)
    store.commitObject()
    const second = useProjectStore.getState().project.objects[1].id
    store.select(first.id)
    store.select(second, 'toggle')

    store.updateObject(first.id, {
      name: 'Stage',
      height: 1.2,
      position: { x: 0.5, y: 0, z: 0 },
    })

    const objects = useProjectStore.getState().project.objects
    expect(objects[0].name).toBe('Stage')
    expect(objects[1].name).toBe('Object 2')
    expect(objects[0].height).toBe(1.2)
    expect(objects[1].height).toBe(1.2)
    expect(objects[0].position.x).toBeCloseTo(0.5)
    expect(objects[1].position.x).toBeCloseTo(3.5)
    expect(objects[1].position.y).toBeCloseTo(1)
  })

  it('replaces the whole project', () => {
    const current = useProjectStore.getState().project
    useProjectStore.getState().replaceProject({
      ...current,
      name: 'Imported room',
      room: { ...current.room, height: 4 },
    })
    const state = useProjectStore.getState()
    expect(state.project.name).toBe('Imported room')
    expect(state.project.room.height).toBe(4)
    expect(state.activeTool).toBe('select')
  })

  it('applies a saved setup, including the view', () => {
    const current = useProjectStore.getState().project
    useProjectStore.getState().applySnapshot({
      project: { ...current, name: 'Loaded room' },
      coverageSpacing: 0.5,
      resolutionMultiplier: 2,
      previewFrequencyHz: 100,
      reflectionOrder: 0,
      viewMode: '3d',
    })
    const state = useProjectStore.getState()
    expect(state.project.name).toBe('Loaded room')
    expect(state.coverageSpacing).toBe(0.5)
    expect(state.resolutionMultiplier).toBe(2)
    expect(state.previewFrequencyHz).toBe(100)
    expect(state.reflectionOrder).toBe(0)
    expect(state.viewMode).toBe('3d')
    expect(state.activeTool).toBe('select')
  })
})
