import { z } from 'zod'
import type { Project } from '../core/types'

const vec2Schema = z.object({
  x: z.number(),
  y: z.number(),
})

const vec3Schema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
})

const roomSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  boundary: z.array(vec2Schema),
  height: z.number().positive(),
  wallThickness: z.number().positive(),
})

const speakerSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  position: vec3Schema,
  yawDeg: z.number(),
  gainDb: z.number(),
  coverageHorizontalDeg: z.number().min(1).max(360),
  radiatorDiameterM: z.number().positive(),
  enabled: z.boolean(),
})

const listenerSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  position: vec2Schema,
  earHeight: z.number().positive(),
})

export const projectSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().min(1),
  name: z.string(),
  room: roomSchema,
  speakers: z.array(speakerSchema),
  listener: listenerSchema,
})

export const persistedProjectSchema = z.object({
  project: projectSchema,
  coverageSpacing: z.number().min(0.05).max(2),
})

export interface PersistedProject {
  project: Project
  coverageSpacing: number
}

export const STORAGE_KEY = 'room-response-studio:project:v1'

export function savePersistedProject(value: PersistedProject): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export function loadPersistedProject(): PersistedProject | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const parsed = persistedProjectSchema.safeParse(JSON.parse(raw))
    if (!parsed.success) return null

    return {
      project: parsed.data.project,
      coverageSpacing: parsed.data.coverageSpacing,
    }
  } catch {
    return null
  }
}

export function clearPersistedProject(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Storage can be unavailable in private browsing; persistence is optional.
  }
}
