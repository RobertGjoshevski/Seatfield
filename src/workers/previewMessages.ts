import type { CoverageGrid } from '../core/geometry/coverage'
import type { Speaker, Vec2 } from '../core/types'

export interface PreviewRequest {
  type: 'preview'
  requestId: number
  boundary: Vec2[]
  spacing: number
  listenerZ: number
  speakers: Speaker[]
}

export interface PreviewResult {
  type: 'preview-result'
  requestId: number
  grid: CoverageGrid
  elapsedMs: number
  warnings: string[]
}

export interface PreviewError {
  type: 'preview-error'
  requestId: number
  message: string
}

export type PreviewResponse = PreviewResult | PreviewError
