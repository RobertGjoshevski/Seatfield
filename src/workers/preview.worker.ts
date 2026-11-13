import {
  OBJECT_REFLECTION_WARNING,
  roomFieldWarning,
} from '../core/acoustics/roomField'
import { evaluateCoverage } from '../core/geometry/coverage'
import type { PreviewRequest, PreviewResponse } from './previewMessages'

interface WorkerScope {
  onmessage: ((event: MessageEvent<PreviewRequest>) => void) | null
  postMessage: (message: PreviewResponse) => void
}

// The DOM lib types `self` as Window, so narrow it to the worker surface
// we actually use. This keeps the worker compilable without mixing the
// DOM and WebWorker libs in the project.
const scope = self as unknown as WorkerScope

scope.onmessage = (event) => {
  const request = event.data
  if (!request || request.type !== 'preview') return

  const startedAt = performance.now()

  try {
    const grid = evaluateCoverage(
      request.boundary,
      request.spacing,
      request.listenerZ,
      request.speakers,
      request.roomHeight,
      request.frequencyHz,
      {
        objects: request.objects ?? [],
        reflectionOrder: request.reflectionOrder,
        kind: request.roomKind ?? 'room',
      },
    )
    if (!grid) {
      throw new Error('Draw a room with at least three points before previewing.')
    }

    const warnings: string[] = []
    if (request.roomKind !== 'open') {
      const irregular = roomFieldWarning(request.boundary)
      if (irregular) warnings.push(irregular)
    }
    if ((request.objects ?? []).length > 0) warnings.push(OBJECT_REFLECTION_WARNING)
    const enabled = request.speakers.filter((speaker) => speaker.enabled)
    if (enabled.length === 0) {
      warnings.push('No enabled speakers. Add a speaker to see coverage.')
    }
    if (enabled.length > 0 && !grid.values.some((value) => Number.isFinite(value))) {
      warnings.push('The coverage grid has no points inside the room.')
    }

    const response: PreviewResponse = {
      type: 'preview-result',
      requestId: request.requestId,
      grid,
      elapsedMs: performance.now() - startedAt,
      warnings,
    }
    scope.postMessage(response)
  } catch (error) {
    const response: PreviewResponse = {
      type: 'preview-error',
      requestId: request.requestId,
      message: error instanceof Error ? error.message : 'Preview failed.',
    }
    scope.postMessage(response)
  }
}
