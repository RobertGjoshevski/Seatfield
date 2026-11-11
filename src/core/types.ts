export type Vec2 = { x: number; y: number }
export type Vec3 = { x: number; y: number; z: number }

export type Tool = 'select' | 'room' | 'speaker' | 'listener'
export type ViewMode = '2d' | '3d'

export interface Room {
  id: string
  name: string
  boundary: Vec2[]
  height: number
  wallThickness: number
}

export interface Speaker {
  id: string
  name: string
  position: Vec3
  yawDeg: number
  gainDb: number
  coverageHorizontalDeg: number
  radiatorDiameterM: number
  enabled: boolean
}

export interface Listener {
  id: string
  name: string
  position: Vec2
  earHeight: number
}

export interface Project {
  schemaVersion: 1
  id: string
  name: string
  room: Room
  speakers: Speaker[]
  listener: Listener
}
