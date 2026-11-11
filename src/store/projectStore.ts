import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { Listener, Project, Room, Speaker, Tool, Vec2, ViewMode } from '../core/types'
import type { CoverageGrid } from '../core/geometry/coverage'
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

export interface CoverageState {
  status: 'idle' | 'running' | 'ready' | 'error'
  grid: CoverageGrid | null
  error: string | null
  warnings: string[]
  elapsedMs: number | null
  requestId: number
}

export function createCoverageState(): CoverageState {
  return {
    status: 'idle',
    grid: null,
    error: null,
    warnings: [],
    elapsedMs: null,
    requestId: 0,
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
  coverage: CoverageState
  setTool: (tool: Tool) => void
  setViewMode: (mode: ViewMode) => void
  updateRoom: (patch: Partial<Room>) => void
  addRoomPoint: (point: Vec2) => void
  closeRoom: () => void
  cancelRoom: () => void
  addSpeaker: (point: Vec2) => void
  updateSpeaker: (id: string, patch: Partial<Speaker>) => void
  removeSpeaker: (id: string) => void
  setListener: (point: Vec2) => void
  updateListener: (patch: Partial<Listener>) => void
  setCoverageSpacing: (spacing: number) => void
  beginCoverage: (requestId: number) => void
  finishCoverage: (
    requestId: number,
    grid: CoverageGrid,
    elapsedMs: number,
    warnings: string[],
  ) => void
  failCoverage: (requestId: number, message: string) => void
  clearCoverage: () => void
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
    coverage: createCoverageState(),

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

    removeSpeaker: (id) =>
      set((state) => {
        state.project.speakers = state.project.speakers.filter(
          (speaker) => speaker.id !== id,
        )
        if (state.selectedId === id) state.selectedId = null
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

    beginCoverage: (requestId) =>
      set((state) => {
        state.coverage.status = 'running'
        state.coverage.error = null
        state.coverage.warnings = []
        state.coverage.elapsedMs = null
        state.coverage.requestId = requestId
      }),

    finishCoverage: (requestId, grid, elapsedMs, warnings) =>
      set((state) => {
        if (requestId !== state.coverage.requestId) return
        state.coverage.status = 'ready'
        state.coverage.grid = grid
        state.coverage.error = null
        state.coverage.warnings = warnings
        state.coverage.elapsedMs = elapsedMs
      }),

    failCoverage: (requestId, message) =>
      set((state) => {
        if (requestId !== state.coverage.requestId) return
        state.coverage.status = 'error'
        state.coverage.grid = null
        state.coverage.error = message
        state.coverage.warnings = []
        state.coverage.elapsedMs = null
      }),

    clearCoverage: () =>
      set((state) => {
        state.coverage = createCoverageState()
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
        state.coverage = createCoverageState()
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
        state.coverage = createCoverageState()
      }),
  })),
)
