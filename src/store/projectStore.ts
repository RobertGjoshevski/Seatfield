import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import {
  DEFAULT_PREVIEW_FREQUENCY_HZ,
  normalizeReflectionOrder,
} from '../core/acoustics/roomField'
import {
  normalizeResolutionMultiplier,
} from '../core/geometry/coverage'
import type { CoverageGrid } from '../core/geometry/coverage'
import {
  axisAlignedRectangle,
  openAudienceBoundary,
  pointAtDistance,
  rectangleFromCorner,
  resizeEdge,
  resizeRectangle,
} from '../core/geometry/dimensions'
import { isSimplePolygon } from '../core/geometry/polygon'
import { clamp } from '../lib/math'
import type { PersistedProject } from '../lib/persistence'
import {
  DEFAULT_SPEAKER_DEPTH_M,
  DEFAULT_SPEAKER_HEIGHT_M,
  DEFAULT_SPEAKER_WIDTH_M,
  type Listener,
  type Project,
  type ResolutionMultiplier,
  type Room,
  type RoomObject,
  type RoomShape,
  type SpaceKind,
  type Speaker,
  type Tool,
  type Vec2,
  type ViewMode,
} from '../core/types'

function createSpeaker(
  point: Vec2,
  name: string,
  z = 1,
): Speaker {
  return {
    id: crypto.randomUUID(),
    name,
    position: { x: point.x, y: point.y, z },
    yawDeg: 0,
    gainDb: 0,
    phaseInverted: false,
    delayMs: 0,
    coverageHorizontalDeg: 90,
    radiatorDiameterM: 0.13,
    widthM: DEFAULT_SPEAKER_WIDTH_M,
    depthM: DEFAULT_SPEAKER_DEPTH_M,
    heightM: DEFAULT_SPEAKER_HEIGHT_M,
    enabled: true,
  }
}

/** 5 m × 4 m room. Yaw 0 aims toward −Y, so the pair sits on the far wall. */
export function createDefaultProject(): Project {
  return {
    schemaVersion: 1,
    id: crypto.randomUUID(),
    name: 'Untitled Room',
    room: {
      id: crypto.randomUUID(),
      name: 'Room',
      boundary: [
        { x: 0, y: 0 },
        { x: 5, y: 0 },
        { x: 5, y: 4 },
        { x: 0, y: 4 },
      ],
      height: 3,
      wallThickness: 0.1,
      kind: 'room',
    },
    objects: [],
    speakers: [
      createSpeaker({ x: 1.5, y: 3.2 }, 'Left', 1.2),
      createSpeaker({ x: 3.5, y: 3.2 }, 'Right', 1.2),
    ],
    listener: {
      id: crypto.randomUUID(),
      name: 'Listener',
      position: { x: 2.5, y: 1.2 },
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

interface SketchState {
  roomDraft: Vec2[]
  rectangleAnchor: Vec2 | null
  rectangleWidth: number
  rectangleDepth: number
  rectangleWidthLocked: boolean
  rectangleDepthLocked: boolean
  segmentLengthM: number | null
}

function clearSketch(state: SketchState) {
  state.roomDraft = []
  state.rectangleAnchor = null
  state.rectangleWidth = 0
  state.rectangleDepth = 0
  state.rectangleWidthLocked = false
  state.rectangleDepthLocked = false
  state.segmentLengthM = null
}

export type SelectionEdit = 'replace' | 'add' | 'toggle' | 'subtract'

interface ProjectState extends SketchState {
  project: Project
  activeTool: Tool
  viewMode: ViewMode
  roomShape: RoomShape
  selectedId: string | null
  selectedIds: string[]
  /** Speakers copied with Ctrl+C. Paste offsets each generation. */
  speakerClipboard: SpeakerClipboard | null
  cursorWorld: Vec2 | null
  coverageSpacing: number
  resolutionMultiplier: ResolutionMultiplier
  previewFrequencyHz: number
  previewNonce: number
  coverage: CoverageState
  setTool: (tool: Tool) => void
  setViewMode: (mode: ViewMode) => void
  setRoomShape: (shape: RoomShape) => void
  setSpaceKind: (kind: SpaceKind) => void
  updateRoom: (patch: Partial<Room>) => void
  addRoomPoint: (point: Vec2) => void
  closeRoom: () => void
  cancelRoom: () => void
  beginRectangle: (anchor: Vec2) => void
  updateRectanglePointer: (point: Vec2, square?: boolean) => void
  setRectangleWidth: (width: number) => void
  setRectangleDepth: (depth: number) => void
  commitRectangle: (point?: Vec2) => void
  commitObject: (point?: Vec2, square?: boolean) => void
  updateObject: (id: string, patch: Partial<RoomObject>) => void
  removeObject: (id: string) => void
  removeObjects: (ids: string[]) => void
  setSegmentLength: (length: number | null) => void
  placeTypedSegment: () => boolean
  setCursorWorld: (point: Vec2 | null) => void
  setRoomWidth: (width: number) => void
  setRoomDepth: (depth: number) => void
  resizeRoomEdge: (edgeIndex: number, length: number) => void
  setPreviewFrequencyHz: (frequencyHz: number) => void
  reflectionOrder: number
  setReflectionOrder: (order: number) => void
  objectSquare: boolean
  setObjectSquare: (square: boolean) => void
  addSpeaker: (point: Vec2) => void
  updateSpeaker: (id: string, patch: Partial<Speaker>) => void
  moveSpeakers: (moves: { id: string; x: number; y: number }[]) => void
  movePlanItems: (moves: {
    speakers?: { id: string; x: number; y: number }[]
    objects?: { id: string; x: number; y: number }[]
    listener?: { x: number; y: number } | null
  }) => void
  removeSpeaker: (id: string) => void
  removeSpeakers: (ids: string[]) => void
  copySpeakers: () => void
  pasteSpeakers: () => void
  setListener: (point: Vec2) => void
  updateListener: (patch: Partial<Listener>) => void
  setCoverageSpacing: (spacing: number) => void
  setResolutionMultiplier: (multiplier: number) => void
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
  select: (id: string | null, mode?: 'replace' | 'toggle') => void
  selectMany: (ids: string[], mode?: SelectionEdit) => void
  replaceProject: (project: Project) => void
  applySnapshot: (snapshot: PersistedProject) => void
  reset: () => void
}

function squareExtents(
  width: number,
  depth: number,
  widthLocked: boolean,
  depthLocked: boolean,
): { width: number; depth: number } {
  const side = widthLocked
    ? Math.abs(width)
    : depthLocked
      ? Math.abs(depth)
      : Math.max(Math.abs(width), Math.abs(depth))
  return {
    width: widthLocked ? width : (Math.sign(width) || 1) * side,
    depth: depthLocked ? depth : (Math.sign(depth) || 1) * side,
  }
}

/** Each paste steps the copies this far so they do not sit on the originals. */
export const SPEAKER_PASTE_STEP_M = 0.5

interface SpeakerClipboard {
  speakers: Speaker[]
  generation: number
}

interface SelectionState {
  selectedId: string | null
  selectedIds: string[]
}

function replaceSelection(state: SelectionState, id: string | null) {
  state.selectedId = id
  state.selectedIds = id ? [id] : []
}

function isSelectable(state: ProjectState, id: string): boolean {
  if (state.project.listener.id === id) return true
  if (state.project.speakers.some((speaker) => speaker.id === id)) return true
  return state.project.objects.some((object) => object.id === id)
}

/** A speaker stays in the inspector when the marquee also caught objects. */
function focusSelection(state: ProjectState, ids: string[]): string | null {
  const speaker = state.project.speakers.find((item) => ids.includes(item.id))
  if (speaker) return speaker.id
  const object = state.project.objects.find((item) => ids.includes(item.id))
  if (object) return object.id
  return ids.at(-1) ?? null
}

function dropSelection(state: ProjectState, ids: ReadonlySet<string>) {
  state.selectedIds = state.selectedIds.filter((id) => !ids.has(id))
  if (state.selectedId && ids.has(state.selectedId)) {
    state.selectedId = focusSelection(state, state.selectedIds)
  }
}

function speakerSnapshot(speaker: Speaker): Speaker {
  return {
    id: speaker.id,
    name: speaker.name,
    position: {
      x: speaker.position.x,
      y: speaker.position.y,
      z: speaker.position.z,
    },
    yawDeg: speaker.yawDeg,
    gainDb: speaker.gainDb,
    phaseInverted: speaker.phaseInverted,
    delayMs: speaker.delayMs,
    coverageHorizontalDeg: speaker.coverageHorizontalDeg,
    radiatorDiameterM: speaker.radiatorDiameterM,
    widthM: speaker.widthM,
    depthM: speaker.depthM,
    heightM: speaker.heightM,
    enabled: speaker.enabled,
  }
}

function copiedSpeakerName(name: string, taken: Set<string>): string {
  const base = `${name} copy`
  if (!taken.has(base)) {
    taken.add(base)
    return base
  }
  let index = 2
  while (taken.has(`${base} ${index}`)) index += 1
  const next = `${base} ${index}`
  taken.add(next)
  return next
}

function fitObject(object: RoomObject, roomHeight: number) {
  const limit = Math.max(0.05, roomHeight)
  object.width = Math.max(0.05, object.width)
  object.depth = Math.max(0.05, object.depth)
  object.height = Math.max(0.05, object.height)
  object.position.z = clamp(object.position.z, 0, limit - 0.05)
  if (object.position.z + object.height > limit) {
    object.height = Math.max(0.05, limit - object.position.z)
  }
}

export const useProjectStore = create<ProjectState>()(
  immer((set) => ({
    project: createDefaultProject(),
    activeTool: 'select',
    viewMode: '2d',
    roomShape: 'polygon',
    roomDraft: [],
    rectangleAnchor: null,
    rectangleWidth: 0,
    rectangleDepth: 0,
    rectangleWidthLocked: false,
    rectangleDepthLocked: false,
    segmentLengthM: null,
    cursorWorld: null,
    selectedId: null,
    selectedIds: [],
    speakerClipboard: null,
    coverageSpacing: 0.25,
    resolutionMultiplier: 1,
    previewFrequencyHz: DEFAULT_PREVIEW_FREQUENCY_HZ,
    reflectionOrder: 1,
    objectSquare: false,
    previewNonce: 0,
    coverage: createCoverageState(),

    setTool: (tool) =>
      set((state) => {
        state.activeTool = tool
        clearSketch(state)
      }),

    setRoomShape: (shape) =>
      set((state) => {
        if (state.roomShape === shape) return
        state.roomShape = shape
        clearSketch(state)
      }),

    setSpaceKind: (kind) =>
      set((state) => {
        state.project.room.kind = kind
        if (kind === 'open' && state.project.room.boundary.length < 3) {
          state.project.room.boundary = openAudienceBoundary()
        }
      }),

    setViewMode: (mode) =>
      set((state) => {
        state.viewMode = mode
      }),

    updateRoom: (patch) =>
      set((state) => {
        Object.assign(state.project.room, patch)
        for (const object of state.project.objects) {
          fitObject(object, state.project.room.height)
        }
      }),

    addRoomPoint: (point) =>
      set((state) => {
        state.roomDraft.push(point)
      }),

    closeRoom: () =>
      set((state) => {
        if (state.roomDraft.length >= 3 && isSimplePolygon(state.roomDraft)) {
          state.project.room.boundary = state.roomDraft
          clearSketch(state)
          state.activeTool = 'select'
        }
      }),

    cancelRoom: () =>
      set((state) => {
        clearSketch(state)
        state.activeTool = 'select'
      }),

    beginRectangle: (anchor) =>
      set((state) => {
        state.rectangleAnchor = anchor
        state.rectangleWidth = 0
        state.rectangleDepth = 0
        state.rectangleWidthLocked = false
        state.rectangleDepthLocked = false
      }),

    updateRectanglePointer: (point, square = false) =>
      set((state) => {
        if (!state.rectangleAnchor) return
        let width = state.rectangleWidth
        let depth = state.rectangleDepth
        if (!state.rectangleWidthLocked) {
          width = point.x - state.rectangleAnchor.x
        }
        if (!state.rectangleDepthLocked) {
          depth = point.y - state.rectangleAnchor.y
        }
        if (square) {
          const squared = squareExtents(
            width,
            depth,
            state.rectangleWidthLocked,
            state.rectangleDepthLocked,
          )
          width = squared.width
          depth = squared.depth
        }
        state.rectangleWidth = width
        state.rectangleDepth = depth
      }),

    setRectangleWidth: (width) =>
      set((state) => {
        state.rectangleWidth = width
        state.rectangleWidthLocked = true
      }),

    setRectangleDepth: (depth) =>
      set((state) => {
        state.rectangleDepth = depth
        state.rectangleDepthLocked = true
      }),

    commitRectangle: (point) =>
      set((state) => {
        if (!state.rectangleAnchor) return
        let width = state.rectangleWidth
        let depth = state.rectangleDepth
        if (point) {
          if (!state.rectangleWidthLocked) {
            width = point.x - state.rectangleAnchor.x
          }
          if (!state.rectangleDepthLocked) {
            depth = point.y - state.rectangleAnchor.y
          }
        }
        const boundary = rectangleFromCorner(state.rectangleAnchor, width, depth)
        if (!boundary || !isSimplePolygon(boundary)) return
        state.project.room.boundary = boundary
        clearSketch(state)
        state.activeTool = 'select'
      }),

    commitObject: (point, square = false) =>
      set((state) => {
        if (!state.rectangleAnchor) return
        let width = state.rectangleWidth
        let depth = state.rectangleDepth
        if (point) {
          if (!state.rectangleWidthLocked) {
            width = point.x - state.rectangleAnchor.x
          }
          if (!state.rectangleDepthLocked) {
            depth = point.y - state.rectangleAnchor.y
          }
        }
        if (square) {
          const squared = squareExtents(
            width,
            depth,
            state.rectangleWidthLocked,
            state.rectangleDepthLocked,
          )
          width = squared.width
          depth = squared.depth
        }
        const footprint = rectangleFromCorner(state.rectangleAnchor, width, depth)
        if (!footprint) return
        const object: RoomObject = {
          id: crypto.randomUUID(),
          name: `Object ${state.project.objects.length + 1}`,
          position: { x: footprint[0].x, y: footprint[0].y, z: 0 },
          width: footprint[1].x - footprint[0].x,
          depth: footprint[2].y - footprint[0].y,
          height: Math.max(0.05, state.project.room.height),
        }
        fitObject(object, state.project.room.height)
        state.project.objects.push(object)
        replaceSelection(state, object.id)
        clearSketch(state)
        state.activeTool = 'select'
      }),

    updateObject: (id, patch) =>
      set((state) => {
        const object = state.project.objects.find((item) => item.id === id)
        if (!object) return
        const selected = new Set(state.selectedIds)
        const targets = selected.has(id)
          ? state.project.objects.filter((item) => selected.has(item.id))
          : [object]
        const origin = {
          x: object.position.x,
          y: object.position.y,
          z: object.position.z,
        }
        for (const target of targets) {
          if (patch.position) {
            target.position.x += patch.position.x - origin.x
            target.position.y += patch.position.y - origin.y
            target.position.z += patch.position.z - origin.z
          }
          if (patch.width !== undefined) target.width = patch.width
          if (patch.depth !== undefined) target.depth = patch.depth
          if (patch.height !== undefined) target.height = patch.height
          if (patch.name !== undefined && target.id === id) target.name = patch.name
          fitObject(target, state.project.room.height)
        }
      }),

    removeObject: (id) =>
      set((state) => {
        state.project.objects = state.project.objects.filter(
          (object) => object.id !== id,
        )
        dropSelection(state, new Set([id]))
      }),

    removeObjects: (ids) =>
      set((state) => {
        if (ids.length === 0) return
        const drop = new Set(ids)
        state.project.objects = state.project.objects.filter(
          (object) => !drop.has(object.id),
        )
        dropSelection(state, drop)
      }),

    setSegmentLength: (length) =>
      set((state) => {
        state.segmentLengthM =
          length !== null && Number.isFinite(length) ? length : null
      }),

    placeTypedSegment: () => {
      let placed = false
      set((state) => {
        const length = state.segmentLengthM
        const cursor = state.cursorWorld
        if (
          length === null ||
          length <= 0 ||
          !cursor ||
          state.roomDraft.length === 0
        ) {
          return
        }
        const next = pointAtDistance(
          state.roomDraft[state.roomDraft.length - 1],
          cursor,
          length,
        )
        if (!next) return
        state.roomDraft.push(next)
        state.segmentLengthM = null
        placed = true
      })
      return placed
    },

    setCursorWorld: (point) =>
      set((state) => {
        state.cursorWorld = point
      }),

    setRoomWidth: (width) =>
      set((state) => {
        const current = axisAlignedRectangle(state.project.room.boundary)
        if (!current) return
        const next = resizeRectangle(state.project.room.boundary, width, current.depth)
        if (next) state.project.room.boundary = next
      }),

    setRoomDepth: (depth) =>
      set((state) => {
        const current = axisAlignedRectangle(state.project.room.boundary)
        if (!current) return
        const next = resizeRectangle(state.project.room.boundary, current.width, depth)
        if (next) state.project.room.boundary = next
      }),

    resizeRoomEdge: (edgeIndex, length) =>
      set((state) => {
        const next = resizeEdge(state.project.room.boundary, edgeIndex, length)
        if (next) state.project.room.boundary = next
      }),

    setPreviewFrequencyHz: (frequencyHz) =>
      set((state) => {
        if (!Number.isFinite(frequencyHz)) return
        state.previewFrequencyHz = clamp(frequencyHz, 20, 8000)
      }),

    setReflectionOrder: (order) =>
      set((state) => {
        state.reflectionOrder = normalizeReflectionOrder(order)
      }),

    setObjectSquare: (square) =>
      set((state) => {
        state.objectSquare = square
        if (!square || !state.rectangleAnchor) return
        const squared = squareExtents(
          state.rectangleWidth,
          state.rectangleDepth,
          state.rectangleWidthLocked,
          state.rectangleDepthLocked,
        )
        state.rectangleWidth = squared.width
        state.rectangleDepth = squared.depth
      }),

    addSpeaker: (point) =>
      set((state) => {
        const speaker = createSpeaker(
          point,
          `Speaker ${state.project.speakers.length + 1}`,
        )
        state.project.speakers.push(speaker)
        replaceSelection(state, speaker.id)
        state.activeTool = 'select'
      }),

    updateSpeaker: (id, patch) =>
      set((state) => {
        const speaker = state.project.speakers.find((item) => item.id === id)
        if (!speaker) return
        const selected = new Set(state.selectedIds)
        const targets = selected.has(id)
          ? state.project.speakers.filter((item) => selected.has(item.id))
          : [speaker]
        const origin = {
          x: speaker.position.x,
          y: speaker.position.y,
          z: speaker.position.z,
        }
        const { position, name, ...rest } = patch
        delete rest.id
        for (const target of targets) {
          if (position) {
            target.position.x += position.x - origin.x
            target.position.y += position.y - origin.y
            target.position.z += position.z - origin.z
          }
          Object.assign(target, rest)
          if (name !== undefined && target.id === id) target.name = name
        }
      }),

    moveSpeakers: (moves) =>
      set((state) => {
        for (const move of moves) {
          const speaker = state.project.speakers.find((item) => item.id === move.id)
          if (!speaker) continue
          speaker.position.x = move.x
          speaker.position.y = move.y
        }
      }),

    movePlanItems: ({ speakers = [], objects = [], listener = null }) =>
      set((state) => {
        for (const move of speakers) {
          const speaker = state.project.speakers.find((item) => item.id === move.id)
          if (!speaker) continue
          speaker.position.x = move.x
          speaker.position.y = move.y
        }
        for (const move of objects) {
          const object = state.project.objects.find((item) => item.id === move.id)
          if (!object) continue
          object.position.x = move.x
          object.position.y = move.y
        }
        if (listener) {
          state.project.listener.position.x = listener.x
          state.project.listener.position.y = listener.y
        }
      }),

    removeSpeaker: (id) =>
      set((state) => {
        state.project.speakers = state.project.speakers.filter(
          (speaker) => speaker.id !== id,
        )
        dropSelection(state, new Set([id]))
      }),

    removeSpeakers: (ids) =>
      set((state) => {
        if (ids.length === 0) return
        const drop = new Set(ids)
        state.project.speakers = state.project.speakers.filter(
          (speaker) => !drop.has(speaker.id),
        )
        dropSelection(state, drop)
      }),

    copySpeakers: () =>
      set((state) => {
        const selected = new Set(state.selectedIds)
        const speakers = state.project.speakers.filter((speaker) =>
          selected.has(speaker.id),
        )
        if (speakers.length === 0) return
        state.speakerClipboard = {
          speakers: speakers.map(speakerSnapshot),
          generation: 0,
        }
      }),

    pasteSpeakers: () =>
      set((state) => {
        const clipboard = state.speakerClipboard
        if (!clipboard || clipboard.speakers.length === 0) return
        const generation = clipboard.generation + 1
        const offset = SPEAKER_PASTE_STEP_M * generation
        const taken = new Set(state.project.speakers.map((speaker) => speaker.name))
        const created: string[] = []
        for (const source of clipboard.speakers) {
          const speaker: Speaker = {
            ...speakerSnapshot(source),
            id: crypto.randomUUID(),
            name: copiedSpeakerName(source.name, taken),
            position: {
              x: source.position.x + offset,
              y: source.position.y + offset,
              z: source.position.z,
            },
          }
          state.project.speakers.push(speaker)
          created.push(speaker.id)
        }
        clipboard.generation = generation
        state.selectedIds = created
        state.selectedId = created.at(-1) ?? null
        state.activeTool = 'select'
      }),

    setListener: (point) =>
      set((state) => {
        state.project.listener.position = point
        replaceSelection(state, state.project.listener.id)
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

    setResolutionMultiplier: (multiplier) =>
      set((state) => {
        state.resolutionMultiplier = normalizeResolutionMultiplier(multiplier)
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

    select: (id, mode = 'replace') =>
      set((state) => {
        if (mode !== 'toggle' || id === null || !isSelectable(state, id)) {
          replaceSelection(state, id)
          return
        }
        if (state.selectedIds.includes(id)) {
          dropSelection(state, new Set([id]))
          return
        }
        state.selectedIds.push(id)
        state.selectedId = id
      }),

    selectMany: (ids, mode = 'replace') =>
      set((state) => {
        const unique = [...new Set(ids)].filter((id) => isSelectable(state, id))
        let next: string[]
        if (mode === 'replace') {
          next = unique
        } else if (mode === 'add') {
          next = [...state.selectedIds]
          for (const id of unique) {
            if (!next.includes(id)) next.push(id)
          }
        } else if (mode === 'subtract') {
          const drop = new Set(unique)
          next = state.selectedIds.filter((id) => !drop.has(id))
        } else {
          next = [...state.selectedIds]
          for (const id of unique) {
            const index = next.indexOf(id)
            if (index >= 0) next.splice(index, 1)
            else next.push(id)
          }
        }
        state.selectedIds = next
        state.selectedId = focusSelection(state, next)
      }),

    replaceProject: (project) =>
      set((state) => {
        state.project = project
        state.activeTool = 'select'
        state.viewMode = '2d'
        clearSketch(state)
        state.cursorWorld = null
        replaceSelection(state, null)
        state.coverage = createCoverageState()
      }),

    applySnapshot: (snapshot) =>
      set((state) => {
        state.project = snapshot.project
        state.coverageSpacing = snapshot.coverageSpacing
        state.resolutionMultiplier = snapshot.resolutionMultiplier
        state.previewFrequencyHz = snapshot.previewFrequencyHz
        state.reflectionOrder = snapshot.reflectionOrder
        state.viewMode = snapshot.viewMode
        state.activeTool = 'select'
        clearSketch(state)
        state.cursorWorld = null
        replaceSelection(state, null)
        state.speakerClipboard = null
        state.coverage = createCoverageState()
      }),

    reset: () =>
      set((state) => {
        state.project = createDefaultProject()
        state.activeTool = 'select'
        state.viewMode = '2d'
        state.roomShape = 'polygon'
        clearSketch(state)
        state.cursorWorld = null
        replaceSelection(state, null)
        state.speakerClipboard = null
        state.coverageSpacing = 0.25
        state.resolutionMultiplier = 1
        state.previewFrequencyHz = DEFAULT_PREVIEW_FREQUENCY_HZ
        state.reflectionOrder = 1
        state.objectSquare = false
        state.previewNonce = 0
        state.coverage = createCoverageState()
      }),
  })),
)
