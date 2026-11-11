import { Inspector } from './components/layout/Inspector'
import { ResultsPanel } from './components/layout/ResultsPanel'
import { ToolRail } from './components/layout/ToolRail'
import { TopBar } from './components/layout/TopBar'
import { Viewport2D } from './components/viewport/Viewport2D'
import { Viewport3D } from './components/viewport/Viewport3D'
import { useCoverage } from './hooks/useCoverage'
import { useProjectPersistence } from './hooks/useProjectPersistence'
import { useProjectStore } from './store/projectStore'

export default function App() {
  const viewMode = useProjectStore((state) => state.viewMode)
  const persistenceStatus = useProjectPersistence()
  useCoverage()

  return (
    <div className="flex h-screen w-screen flex-col bg-slate-950 text-slate-100">
      <TopBar persistenceStatus={persistenceStatus} />
      <div className="flex min-h-0 flex-1">
        <ToolRail />
        <main className="min-w-0 flex-1">
          {viewMode === '2d' ? <Viewport2D /> : <Viewport3D />}
        </main>
        <Inspector />
      </div>
      <ResultsPanel />
    </div>
  )
}
