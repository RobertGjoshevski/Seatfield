import { z } from 'zod'
import {
  DEFAULT_SPEAKER_DEPTH_M,
  DEFAULT_SPEAKER_HEIGHT_M,
  DEFAULT_SPEAKER_WIDTH_M,
  type Project,
  type ViewMode,
} from '../core/types'

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
  kind: z.enum(['room', 'open']).default('room'),
})

const speakerSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  position: vec3Schema,
  yawDeg: z.number(),
  gainDb: z.number(),
  phaseInverted: z.boolean().default(false),
  delayMs: z.number().min(0).max(100).default(0),
  coverageHorizontalDeg: z.number().min(1).max(360),
  radiatorDiameterM: z.number().positive(),
  widthM: z.number().positive().max(5).default(DEFAULT_SPEAKER_WIDTH_M),
  depthM: z.number().positive().max(5).default(DEFAULT_SPEAKER_DEPTH_M),
  heightM: z.number().positive().max(5).default(DEFAULT_SPEAKER_HEIGHT_M),
  enabled: z.boolean(),
})

const listenerSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  position: vec2Schema,
  earHeight: z.number().positive(),
})

const roomObjectSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  position: vec3Schema,
  width: z.number().positive(),
  depth: z.number().positive(),
  height: z.number().positive(),
})

export const projectSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().min(1),
  name: z.string(),
  room: roomSchema,
  objects: z.array(roomObjectSchema).default([]),
  speakers: z.array(speakerSchema),
  listener: listenerSchema,
})

export const persistedProjectSchema = z.object({
  project: projectSchema,
  coverageSpacing: z.number().min(0.05).max(2),
  resolutionMultiplier: z.union([z.literal(0.5), z.literal(1), z.literal(2)]).default(1),
  previewFrequencyHz: z.number().min(20).max(8000).default(80),
  reflectionOrder: z.number().int().min(0).max(3).default(1),
  viewMode: z.enum(['2d', '3d']).default('2d'),
})

export interface PersistedProject {
  project: Project
  coverageSpacing: number
  resolutionMultiplier: 0.5 | 1 | 2
  previewFrequencyHz: number
  reflectionOrder: number
  viewMode: ViewMode
}

export const STORAGE_KEY = 'seatfield:project:v1'

export function serializePersistedProject(value: PersistedProject): string {
  return JSON.stringify(value, null, 2)
}

export function parsePersistedProject(raw: string): PersistedProject | null {
  try {
    const parsed = persistedProjectSchema.safeParse(JSON.parse(raw))
    if (!parsed.success) return null

    return {
      project: {
        ...parsed.data.project,
        objects: parsed.data.project.objects ?? [],
      },
      coverageSpacing: parsed.data.coverageSpacing,
      resolutionMultiplier: parsed.data.resolutionMultiplier,
      previewFrequencyHz: parsed.data.previewFrequencyHz,
      reflectionOrder: parsed.data.reflectionOrder,
      viewMode: parsed.data.viewMode,
    }
  } catch {
    return null
  }
}

export function setupFileName(projectName: string): string {
  const slug = projectName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `${slug || 'room-setup'}.rrs.json`
}

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
    return parsePersistedProject(raw)
  } catch {
    return null
  }
}

export function downloadPersistedProject(value: PersistedProject): void {
  const blob = new Blob([serializePersistedProject(value)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = setupFileName(value.project.name)
  link.click()
  URL.revokeObjectURL(url)
}

export function clearPersistedProject(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Storage can be unavailable in private browsing; persistence is optional.
  }
}
