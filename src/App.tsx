export default function App() {
  return (
    <div className="flex h-screen w-screen flex-col bg-slate-950 text-slate-100">
      <header className="flex h-12 items-center border-b border-slate-800 px-4">
        <h1 className="text-sm font-semibold tracking-wide">Room Response Studio</h1>
      </header>
      <div className="flex min-h-0 flex-1">
        <aside className="w-14 border-r border-slate-800" />
        <main className="flex-1" />
        <aside className="w-72 border-l border-slate-800" />
      </div>
      <footer className="h-40 border-t border-slate-800" />
    </div>
  )
}
