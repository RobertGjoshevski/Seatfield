export type Vec2 = { x: number; y: number }
export type Vec3 = { x: number; y: number; z: number }

export type Tool = 'select' | 'room' | 'object' | 'speaker' | 'listener'
export type ViewMode = '2d' | '3d'
export type RoomShape = 'polygon' | 'rectangle'
export type SpaceKind = 'room' | 'open'
export type ResolutionMultiplier = 0.5 | 1 | 2

/** Cabinet size drawn on the map. The radiator diameter stays acoustic. */
export const DEFAULT_SPEAKER_WIDTH_M = 0.6
export const DEFAULT_SPEAKER_DEPTH_M = 0.5
export const DEFAULT_SPEAKER_HEIGHT_M = 0.7

export interface Room {
  id: string
  name: string
  boundary: Vec2[]
  height: number
  wallThickness: number
  /** Open treats the outline as an audience area with no walls. */
  kind: SpaceKind
}

export interface Speaker {
  id: string
  name: string
  position: Vec3
  yawDeg: number
  gainDb: number
  /** True inverts the speaker, a 180° phase flip. */
  phaseInverted: boolean
  /** Playback delay. Shifts this speaker against the others. */
  delayMs: number
  coverageHorizontalDeg: number
  radiatorDiameterM: number
  /** Front width, metres. */
  widthM: number
  /** Front-to-back depth, metres. */
  depthM: number
  /** Cabinet height, metres. */
  heightM: number
  enabled: boolean
}

export interface Listener {
  id: string
  name: string
  position: Vec2
  earHeight: number
}

/** Axis-aligned solid. Position is the minimum corner; height rises from Z. */
export interface RoomObject {
  id: string
  name: string
  position: Vec3
  width: number
  depth: number
  height: number
}

export interface Project {
  schemaVersion: 1
  id: string
  name: string
  room: Room
  objects: RoomObject[]
  speakers: Speaker[]
  listener: Listener
}
