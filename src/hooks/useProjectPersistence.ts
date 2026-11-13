import { useCallback, useEffect, useState } from 'react'
import {
  loadPersistedProject,
  savePersistedProject,
  type PersistedProject,
} from '../lib/persistence'
import { useProjectStore } from '../store/projectStore'

export type PersistenceStatus = 'loading' | 'saving' | 'saved' | 'error'

export function captureProjectSnapshot(): PersistedProject {
  const state = useProjectStore.getState()
  return {
    project: state.project,
    coverageSpacing: state.coverageSpacing,
    resolutionMultiplier: state.resolutionMultiplier,
    previewFrequencyHz: state.previewFrequencyHz,
    reflectionOrder: state.reflectionOrder,
    viewMode: state.viewMode,
  }
}

export function useProjectPersistence(): {
  status: PersistenceStatus
  saveNow: () => boolean
} {
  const [status, setStatus] = useState<PersistenceStatus>('loading')
  const [ready, setReady] = useState(false)

  const project = useProjectStore((state) => state.project)
  const coverageSpacing = useProjectStore((state) => state.coverageSpacing)
  const resolutionMultiplier = useProjectStore(
    (state) => state.resolutionMultiplier,
  )
  const previewFrequencyHz = useProjectStore((state) => state.previewFrequencyHz)
  const reflectionOrder = useProjectStore((state) => state.reflectionOrder)
  const viewMode = useProjectStore((state) => state.viewMode)

  useEffect(() => {
    const loaded = loadPersistedProject()
    if (loaded) useProjectStore.getState().applySnapshot(loaded)
    setStatus('saved')
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready) return

    setStatus('saving')
    const timer = window.setTimeout(() => {
      const saved = savePersistedProject(captureProjectSnapshot())
      setStatus(saved ? 'saved' : 'error')
    }, 400)

    return () => window.clearTimeout(timer)
  }, [
    project,
    coverageSpacing,
    resolutionMultiplier,
    previewFrequencyHz,
    reflectionOrder,
    viewMode,
    ready,
  ])

  useEffect(() => {
    const flush = () => {
      savePersistedProject(captureProjectSnapshot())
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') flush()
    }

    window.addEventListener('beforeunload', flush)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      window.removeEventListener('beforeunload', flush)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  const saveNow = useCallback(() => {
    const saved = savePersistedProject(captureProjectSnapshot())
    setStatus(saved ? 'saved' : 'error')
    return saved
  }, [])

  return { status, saveNow }
}
