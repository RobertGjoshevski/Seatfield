import { TopBar } from './components/layout/TopBar'
import { ToolRail } from './components/layout/ToolRail'
import { Inspector } from './components/layout/Inspector'
import { Viewport2D } from './components/viewport/Viewport2D'
import { Viewport3D } from './components/viewport/Viewport3D'
import { useProjectStore } from './store/projectStore'

export default function App() {
  const viewMode = useProjectStore((state) => state.viewMode)

  return (
    <div className="flex h-screen w-screen flex-col bg-slate-950 text-slate-100">
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <ToolRail />
        <main className="min-w-0 flex-1">
          {viewMode === '2d' ? <Viewport2D /> : <Viewport3D />}
        </main>
        <Inspector />
      </div>
      <footer className="h-40 border-t border-slate-800" />
    </div>
  )
}
