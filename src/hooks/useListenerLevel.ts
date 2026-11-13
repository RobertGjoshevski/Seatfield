import { useMemo } from 'react'
import { prepareFieldModes } from '../core/acoustics/roomField'
import { levelAtListener } from '../core/geometry/coverage'
import { useProjectStore } from '../store/projectStore'

/** Exact preview level at the listener. Independent of the heatmap grid. */
export function useListenerLevel(): number | undefined {
  const boundary = useProjectStore((state) => state.project.room.boundary)
  const height = useProjectStore((state) => state.project.room.height)
  const kind = useProjectStore((state) => state.project.room.kind)
  const speakers = useProjectStore((state) => state.project.speakers)
  const objects = useProjectStore((state) => state.project.objects)
  const x = useProjectStore((state) => state.project.listener.position.x)
  const y = useProjectStore((state) => state.project.listener.position.y)
  const earHeight = useProjectStore((state) => state.project.listener.earHeight)
  const frequencyHz = useProjectStore((state) => state.previewFrequencyHz)
  const reflectionOrder = useProjectStore((state) => state.reflectionOrder)

  const preparedModes = useMemo(
    () => prepareFieldModes({ boundary, height, kind }, frequencyHz),
    [boundary, height, kind, frequencyHz],
  )

  return useMemo(
    () =>
      levelAtListener(
        { boundary, height, kind },
        speakers,
        { x, y, z: earHeight },
        frequencyHz,
        { objects, reflectionOrder, kind, preparedModes },
      ),
    [
      boundary,
      height,
      kind,
      speakers,
      objects,
      x,
      y,
      earHeight,
      frequencyHz,
      reflectionOrder,
      preparedModes,
    ],
  )
}
