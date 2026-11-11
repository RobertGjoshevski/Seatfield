import { beforeEach, describe, expect, it } from 'vitest'
import { useProjectStore } from '../../src/store/projectStore'

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
})
