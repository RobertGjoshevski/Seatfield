import { useEffect, useState } from 'react'
import {
  loadPersistedProject,
  savePersistedProject,
} from '../lib/persistence'
import { useProjectStore } from '../store/projectStore'

export type PersistenceStatus = 'loading' | 'saving' | 'saved' | 'error'

export function useProjectPersistence(): PersistenceStatus {
  const [status, setStatus] = useState<PersistenceStatus>('loading')
  const [ready, setReady] = useState(false)

  const project = useProjectStore((state) => state.project)
  const coverageSpacing = useProjectStore((state) => state.coverageSpacing)

  useEffect(() => {
    const loaded = loadPersistedProject()
    if (loaded) {
      useProjectStore.getState().replaceProject(loaded.project)
      useProjectStore.getState().setCoverageSpacing(loaded.coverageSpacing)
    }
    setStatus('saved')
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready) return

    setStatus('saving')
    const timer = window.setTimeout(() => {
      const saved = savePersistedProject({
        project: useProjectStore.getState().project,
        coverageSpacing: useProjectStore.getState().coverageSpacing,
      })
      setStatus(saved ? 'saved' : 'error')
    }, 400)

    return () => window.clearTimeout(timer)
  }, [project, coverageSpacing, ready])

  useEffect(() => {
    const handleBeforeUnload = () => {
      savePersistedProject({
        project: useProjectStore.getState().project,
        coverageSpacing: useProjectStore.getState().coverageSpacing,
      })
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])

  return status
}
