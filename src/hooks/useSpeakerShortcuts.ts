import { useEffect } from 'react'
import { useProjectStore } from '../store/projectStore'

function isTextEntry(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    return true
  }
  return target.isContentEditable
}

export function useSpeakerShortcuts() {
  const copySpeakers = useProjectStore((state) => state.copySpeakers)
  const pasteSpeakers = useProjectStore((state) => state.pasteSpeakers)
  const removeSpeakers = useProjectStore((state) => state.removeSpeakers)
  const removeObjects = useProjectStore((state) => state.removeObjects)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTextEntry(event.target)) return
      const meta = event.ctrlKey || event.metaKey
      const key = event.key.toLowerCase()
      if (meta && key === 'c') {
        const state = useProjectStore.getState()
        const speakerIds = new Set(
          state.project.speakers.map((speaker) => speaker.id),
        )
        if (!state.selectedIds.some((id) => speakerIds.has(id))) return
        event.preventDefault()
        copySpeakers()
        return
      }
      if (meta && key === 'v') {
        const clipboard = useProjectStore.getState().speakerClipboard
        if (!clipboard || clipboard.speakers.length === 0) return
        event.preventDefault()
        pasteSpeakers()
        return
      }
      if (event.key !== 'Delete' && event.key !== 'Backspace') return
      if (meta || event.altKey) return
      const state = useProjectStore.getState()
      const speakerIds = new Set(state.project.speakers.map((speaker) => speaker.id))
      const objectIds = new Set(state.project.objects.map((object) => object.id))
      const speakers = state.selectedIds.filter((id) => speakerIds.has(id))
      const objects = state.selectedIds.filter((id) => objectIds.has(id))
      if (speakers.length === 0 && objects.length === 0) return
      event.preventDefault()
      if (speakers.length > 0) removeSpeakers(speakers)
      if (objects.length > 0) removeObjects(objects)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [copySpeakers, pasteSpeakers, removeSpeakers, removeObjects])
}
