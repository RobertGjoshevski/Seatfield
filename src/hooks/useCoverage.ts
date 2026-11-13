import { useEffect, useRef } from 'react'
import { coverageSpacingFor } from '../core/geometry/coverage'
import { polygonBounds } from '../core/geometry/polygon'
import { useProjectStore } from '../store/projectStore'
import type {
  PreviewRequest,
  PreviewResponse,
} from '../workers/previewMessages'

export function useCoverage() {
  const workerRef = useRef<Worker | null>(null)
  const requestIdRef = useRef(0)

  const boundary = useProjectStore((state) => state.project.room.boundary)
  const roomHeight = useProjectStore((state) => state.project.room.height)
  const speakers = useProjectStore((state) => state.project.speakers)
  const objects = useProjectStore((state) => state.project.objects)
  const listenerZ = useProjectStore((state) => state.project.listener.earHeight)
  const roomKind = useProjectStore((state) => state.project.room.kind)
  const resolutionMultiplier = useProjectStore(
    (state) => state.resolutionMultiplier,
  )
  const frequencyHz = useProjectStore((state) => state.previewFrequencyHz)
  const reflectionOrder = useProjectStore((state) => state.reflectionOrder)
  const previewNonce = useProjectStore((state) => state.previewNonce)

  useEffect(() => {
    const worker = new Worker(
      new URL('../workers/preview.worker.ts', import.meta.url),
      { type: 'module' },
    )
    workerRef.current = worker

    return () => {
      worker.terminate()
      workerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (boundary.length < 3) {
      useProjectStore.getState().clearCoverage()
      return
    }

    const worker = workerRef.current
    if (!worker) return

    requestIdRef.current += 1
    const requestId = requestIdRef.current
    const spacing = coverageSpacingFor(
      polygonBounds(boundary),
      resolutionMultiplier,
    ).spacing
    const request: PreviewRequest = {
      type: 'preview',
      requestId,
      boundary,
      spacing,
      listenerZ,
      roomHeight,
      frequencyHz,
      speakers,
      objects,
      reflectionOrder,
      roomKind,
    }

    const handleMessage = (event: MessageEvent) => {
      const response = event.data as PreviewResponse
      if (response.requestId !== requestId) return

      if (response.type === 'preview-result') {
        useProjectStore
          .getState()
          .finishCoverage(
            response.requestId,
            response.grid,
            response.elapsedMs,
            response.warnings,
          )
      } else {
        useProjectStore
          .getState()
          .failCoverage(response.requestId, response.message)
      }
    }

    const handleError = (event: ErrorEvent) => {
      useProjectStore
        .getState()
        .failCoverage(requestId, event.message || 'Preview worker crashed.')
    }

    worker.addEventListener('message', handleMessage)
    worker.addEventListener('error', handleError)

    useProjectStore.getState().beginCoverage(requestId)
    const timer = window.setTimeout(() => {
      worker.postMessage(request)
    }, 120)

    return () => {
      window.clearTimeout(timer)
      worker.removeEventListener('message', handleMessage)
      worker.removeEventListener('error', handleError)
    }
  }, [
    boundary,
    roomHeight,
    speakers,
    objects,
    listenerZ,
    roomKind,
    resolutionMultiplier,
    frequencyHz,
    reflectionOrder,
    previewNonce,
  ])
}
