import { Headphones, MousePointer2, PenLine, Speaker } from 'lucide-react'
import type { Tool } from '../../core/types'
import { useProjectStore } from '../../store/projectStore'

const tools: { id: Tool; label: string; Icon: typeof MousePointer2 }[] = [
  { id: 'select', label: 'Select', Icon: MousePointer2 },
  { id: 'room', label: 'Room', Icon: PenLine },
  { id: 'speaker', label: 'Speaker', Icon: Speaker },
  { id: 'listener', label: 'Listener', Icon: Headphones },
]

export function ToolRail() {
  const activeTool = useProjectStore((state) => state.activeTool)
  const setTool = useProjectStore((state) => state.setTool)

  return (
    <aside className="flex w-14 shrink-0 flex-col items-center gap-1 border-r border-slate-800 py-2">
      {tools.map(({ id, label, Icon }) => (
        <button
          key={id}
          data-testid={`tool-${id}`}
          title={label}
          aria-label={label}
          className={`flex h-10 w-10 items-center justify-center rounded ${
            activeTool === id
              ? 'bg-teal-500 text-slate-950'
              : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
          }`}
          onClick={() => setTool(id)}
        >
          <Icon size={18} />
        </button>
      ))}
    </aside>
  )
}
