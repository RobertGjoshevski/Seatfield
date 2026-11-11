import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { Listener, Project, Room, Speaker, Tool, Vec2, ViewMode } from '../core/types'
import { isSimplePolygon } from '../core/geometry/polygon'

export function createDefaultProject(): Project {
  return {
    schemaVersion: 1,
    id: crypto.randomUUID(),
    name: 'Untitled Room',
    room: {
      id: crypto.randomUUID(),
      name: 'Room',
      boundary: [],
      height: 3,
      wallThickness: 0.1,
    },
    speakers: [],
    listener: {
      id: crypto.randomUUID(),
      name: 'Listener',
      position: { x: 2, y: 2 },
      earHeight: 1.2,
    },
  }
}

interface ProjectState {
  project: Project
  activeTool: Tool
  viewMode: ViewMode
  roomDraft: Vec2[]
  selectedId: string | null
  coverageSpacing: number
  previewNonce: number
  setTool: (tool: Tool) => void
  setViewMode: (mode: ViewMode) => void
  updateRoom: (patch: Partial<Room>) => void
  addRoomPoint: (point: Vec2) => void
  closeRoom: () => void
  cancelRoom: () => void
  addSpeaker: (point: Vec2) => void
  updateSpeaker: (id: string, patch: Partial<Speaker>) => void
  setListener: (point: Vec2) => void
  updateListener: (patch: Partial<Listener>) => void
  setCoverageSpacing: (spacing: number) => void
  bumpPreview: () => void
  select: (id: string | null) => void
  replaceProject: (project: Project) => void
  reset: () => void
}

export const useProjectStore = create<ProjectState>()(
  immer((set) => ({
    project: createDefaultProject(),
    activeTool: 'room',
    viewMode: '2d',
    roomDraft: [],
    selectedId: null,
    coverageSpacing: 0.25,
    previewNonce: 0,

    setTool: (tool) =>
      set((state) => {
        state.activeTool = tool
        state.roomDraft = []
      }),

    setViewMode: (mode) =>
      set((state) => {
        state.viewMode = mode
      }),

    updateRoom: (patch) =>
      set((state) => {
        Object.assign(state.project.room, patch)
      }),

    addRoomPoint: (point) =>
      set((state) => {
        state.roomDraft.push(point)
      }),

    closeRoom: () =>
      set((state) => {
        if (state.roomDraft.length >= 3 && isSimplePolygon(state.roomDraft)) {
          state.project.room.boundary = state.roomDraft
          state.roomDraft = []
          state.activeTool = 'select'
        }
      }),

    cancelRoom: () =>
      set((state) => {
        state.roomDraft = []
        state.activeTool = 'select'
      }),

    addSpeaker: (point) =>
      set((state) => {
        const speaker: Speaker = {
          id: crypto.randomUUID(),
          name: `Speaker ${state.project.speakers.length + 1}`,
          position: { x: point.x, y: point.y, z: 1 },
          yawDeg: 0,
          gainDb: 0,
          coverageHorizontalDeg: 90,
          radiatorDiameterM: 0.13,
          enabled: true,
        }
        state.project.speakers.push(speaker)
        state.selectedId = speaker.id
        state.activeTool = 'select'
      }),

    updateSpeaker: (id, patch) =>
      set((state) => {
        const speaker = state.project.speakers.find((item) => item.id === id)
        if (speaker) Object.assign(speaker, patch)
      }),

    setListener: (point) =>
      set((state) => {
        state.project.listener.position = point
        state.selectedId = state.project.listener.id
        state.activeTool = 'select'
      }),

    updateListener: (patch) =>
      set((state) => {
        Object.assign(state.project.listener, patch)
      }),

    setCoverageSpacing: (spacing) =>
      set((state) => {
        state.coverageSpacing = spacing
      }),

    bumpPreview: () =>
      set((state) => {
        state.previewNonce += 1
      }),

    select: (id) =>
      set((state) => {
        state.selectedId = id
      }),

    replaceProject: (project) =>
      set((state) => {
        state.project = project
        state.activeTool = 'select'
        state.viewMode = '2d'
        state.roomDraft = []
        state.selectedId = null
      }),

    reset: () =>
      set((state) => {
        state.project = createDefaultProject()
        state.activeTool = 'room'
        state.viewMode = '2d'
        state.roomDraft = []
        state.selectedId = null
        state.coverageSpacing = 0.25
        state.previewNonce = 0
      }),
  })),
)
