import { TopBar } from './components/layout/TopBar'
import { Viewport2D } from './components/viewport/Viewport2D'
import { Viewport3D } from './components/viewport/Viewport3D'
import { useProjectStore } from './store/projectStore'

export default function App() {
  const viewMode = useProjectStore((state) => state.viewMode)

  return (
    <div className="flex h-screen w-screen flex-col bg-slate-950 text-slate-100">
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <aside className="w-14 border-r border-slate-800" />
        <main className="min-w-0 flex-1">
          {viewMode === '2d' ? <Viewport2D /> : <Viewport3D />}
        </main>
        <aside className="w-72 border-l border-slate-800" />
      </div>
      <footer className="h-40 border-t border-slate-800" />
    </div>
  )
}
