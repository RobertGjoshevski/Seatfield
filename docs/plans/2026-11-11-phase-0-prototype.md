# Room Response Studio — Phase 0 Prototype Implementation Plan

> **For agentic workers:** implement this plan task-by-task, in order, checking off each step as it lands. Steps use checkbox (`- [ ]`) syntax for tracking. Dispatch a fresh subagent per task where tasks are independent; otherwise execute inline with a review checkpoint after each task.

**Goal:** Deliver a working browser prototype that draws a polygonal room in 2D, extrudes it in 3D, places a full-range speaker and a listener, and shows a direct-field coverage heatmap.

**Architecture:** React + Vite SPA. Document state lives in Zustand with Immer. The 2D editor is SVG; the 3D viewport uses React Three Fiber. A Web Worker computes direct-field coverage behind a typed request/response contract. Phase 0 uses a TypeScript reference solver; Phase 1 replaces the worker internals with Rust/WASM without changing the UI contract.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS v4, Three.js, React Three Fiber, Drei, Zustand, Immer, Zod, Vitest, Testing Library, Playwright.

**Scope note:** This plan covers Phase 0 only. It intentionally does not include object extrusion, booleans, materials, a speaker model library, first-order reflections, room modes, RT60, multi-project persistence, or Rust/WASM. Those are Phase 1+ plans built on this foundation.

---

## File map

| Path | Responsibility |
|---|---|
| `package.json` | Scripts and dependencies |
| `index.html` | Vite entry |
| `tsconfig.json` | Strict TypeScript config |
| `vite.config.ts` | React + Tailwind plugins |
| `vitest.config.ts` | Unit test config |
| `playwright.config.ts` | E2E config |
| `src/main.tsx` | React root |
| `src/App.tsx` | App shell and worker/persistence hooks |
| `src/styles.css` | Tailwind import and base theme |
| `src/core/types.ts` | Shared document types |
| `src/lib/math.ts` | Clamp, snap, distance, angle conversion |
| `src/core/geometry/polygon.ts` | Area, bounds, point-in-polygon, simple-polygon check |
| `src/store/projectStore.ts` | Project, tools, draft room, coverage state |
| `src/hooks/useSvgViewport.ts` | SVG pan/zoom and screen-to-world conversion |
| `src/components/layout/TopBar.tsx` | Project status, 2D/3D toggle, reset |
| `src/components/layout/ToolRail.tsx` | Tool selection |
| `src/components/layout/Inspector.tsx` | Room/speaker/listener properties |
| `src/components/layout/ResultsPanel.tsx` | Coverage status, stats, legend |
| `src/components/ui/NumberField.tsx` | Numeric input |
| `src/components/viewport/Viewport2D.tsx` | SVG room editor and 2D overlays |
| `src/components/viewport/CoverageOverlay2D.tsx` | 2D coverage raster overlay |
| `src/components/viewport/Viewport3D.tsx` | R3F scene |
| `src/components/viewport/RoomMesh.tsx` | Floor and wall meshes |
| `src/components/viewport/SpeakerMesh.tsx` | Speaker box and aim line |
| `src/components/viewport/ListenerMarker.tsx` | Listener marker |
| `src/components/viewport/CoveragePlane3D.tsx` | Coverage texture plane |
| `src/core/geometry/walls.ts` | Pure wall-segment generation |
| `src/core/acoustics/directivity.ts` | Coverage-angle directivity model |
| `src/core/acoustics/directField.ts` | Direct SPL calculation |
| `src/core/geometry/coverage.ts` | Coverage grid generation |
| `src/workers/previewMessages.ts` | Worker request/response types |
| `src/workers/preview.worker.ts` | Coverage worker |
| `src/hooks/useCoverage.ts` | Worker lifecycle and debounced requests |
| `src/lib/heatmap.ts` | Color mapping, stats, data URL |
| `src/hooks/useCoverageHeatmap.ts` | Shared heatmap view data |
| `src/lib/persistence.ts` | Zod schema and localStorage |
| `src/hooks/useProjectPersistence.ts` | Load/save lifecycle |
| `tests/unit/*.test.ts` | Unit tests |
| `tests/e2e/prototype.spec.ts` | End-to-end flow |
| `README.md` | Run/test instructions |

---

## Task 1: Scaffold the Vite app

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/styles.css`
- Create: `.gitignore`

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "room-response-studio",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run:

```powershell
npm install react react-dom three @react-three/fiber @react-three/drei zustand immer zod lucide-react
npm install -D vite @vitejs/plugin-react typescript @types/react @types/react-dom @types/three @types/node tailwindcss @tailwindcss/vite vitest jsdom @testing-library/react @testing-library/dom @testing-library/jest-dom @testing-library/user-event @playwright/test
```

Expected: both commands exit 0 and `package-lock.json` is created.

- [ ] **Step 3: Write `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Room Response Studio</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 4: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "types": ["vite/client", "vitest/globals", "@testing-library/jest-dom", "node"]
  },
  "include": ["src", "tests", "vite.config.ts", "vitest.config.ts", "playwright.config.ts"]
}
```

- [ ] **Step 5: Write `vite.config.ts`**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```

- [ ] **Step 6: Write `src/styles.css`**

```css
@import "tailwindcss";

:root {
  color-scheme: dark;
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
  background: #0b0f14;
  color: #e6edf3;
}

html,
body,
#root {
  height: 100%;
  margin: 0;
}

body {
  overflow: hidden;
}

button,
input,
select {
  font: inherit;
}
```

- [ ] **Step 7: Write `src/main.tsx`**

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

- [ ] **Step 8: Write a minimal `src/App.tsx`**

```tsx
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
```

- [ ] **Step 9: Verify the build**

Run:

```powershell
npm run build
```

Expected: `tsc --noEmit` completes with no errors, and Vite reports `built in ...`.

- [ ] **Step 10: Write `.gitignore`**

```gitignore
node_modules
dist
dist-ssr
*.local
.vite
playwright-report
test-results
```

- [ ] **Step 11: Commit**

```powershell
git add package.json package-lock.json index.html tsconfig.json vite.config.ts .gitignore src
git commit -m "chore: scaffold React Vite app"
```

---

## Task 2: Add core types and math helpers

**Files:**
- Create: `src/core/types.ts`
- Create: `src/lib/math.ts`
- Test: `tests/unit/math.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/math.test.ts
import { describe, expect, it } from 'vitest'
import { clamp, degToRad, distance2d, snap } from '../../src/lib/math'

describe('math helpers', () => {
  it('clamps values', () => {
    expect(clamp(5, 0, 10)).toBe(5)
    expect(clamp(-1, 0, 10)).toBe(0)
    expect(clamp(11, 0, 10)).toBe(10)
  })

  it('snaps to a step', () => {
    expect(snap(0.37, 0.25)).toBe(0.25)
    expect(snap(0.38, 0.25)).toBe(0.5)
    expect(snap(-0.13, 0.25)).toBe(-0.25)
  })

  it('computes 2D distance', () => {
    expect(distance2d({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5)
  })

  it('converts degrees to radians', () => {
    expect(degToRad(180)).toBeCloseTo(Math.PI)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```powershell
npm test -- tests/unit/math.test.ts
```

Expected: FAIL because `src/lib/math.ts` does not exist.

- [ ] **Step 3: Write `src/core/types.ts`**

```ts
export type Vec2 = { x: number; y: number }
export type Vec3 = { x: number; y: number; z: number }

export type Tool = 'select' | 'room' | 'speaker' | 'listener'
export type ViewMode = '2d' | '3d'

export interface Room {
  id: string
  name: string
  boundary: Vec2[]
  height: number
  wallThickness: number
}

export interface Speaker {
  id: string
  name: string
  position: Vec3
  yawDeg: number
  gainDb: number
  coverageHorizontalDeg: number
  radiatorDiameterM: number
  enabled: boolean
}

export interface Listener {
  id: string
  name: string
  position: Vec2
  earHeight: number
}

export interface Project {
  schemaVersion: 1
  id: string
  name: string
  room: Room
  speakers: Speaker[]
  listener: Listener
}
```

- [ ] **Step 4: Write `src/lib/math.ts`**

```ts
import type { Vec2 } from '../core/types'

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function snap(value: number, step: number): number {
  return Math.round(value / step) * step
}

export function distance2d(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180
}

export function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run:

```powershell
npm test -- tests/unit/math.test.ts
```

Expected: PASS, 4 tests.

- [ ] **Step 6: Commit**

```powershell
git add src/core/types.ts src/lib/math.ts tests/unit/math.test.ts
git commit -m "feat: add core types and math helpers"
```

---

## Task 3: Add polygon utilities

**Files:**
- Create: `src/core/geometry/polygon.ts`
- Test: `tests/unit/polygon.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/polygon.test.ts
import { describe, expect, it } from 'vitest'
import {
  isSimplePolygon,
  pointInPolygon,
  polygonArea,
  polygonBounds,
} from '../../src/core/geometry/polygon'

const rectangle = [
  { x: 0, y: 0 },
  { x: 4, y: 0 },
  { x: 4, y: 3 },
  { x: 0, y: 3 },
]

describe('polygon utilities', () => {
  it('computes signed area and bounds', () => {
    expect(polygonArea(rectangle)).toBe(12)
    expect(polygonBounds(rectangle)).toEqual({
      minX: 0,
      minY: 0,
      maxX: 4,
      maxY: 3,
    })
  })

  it('detects points inside and outside', () => {
    expect(pointInPolygon({ x: 2, y: 1.5 }, rectangle)).toBe(true)
    expect(pointInPolygon({ x: 5, y: 1.5 }, rectangle)).toBe(false)
    expect(pointInPolygon({ x: -1, y: -1 }, rectangle)).toBe(false)
  })

  it('accepts a simple polygon', () => {
    expect(isSimplePolygon(rectangle)).toBe(true)
  })

  it('rejects a self-intersecting polygon', () => {
    const bowtie = [
      { x: 0, y: 0 },
      { x: 4, y: 3 },
      { x: 4, y: 0 },
      { x: 0, y: 3 },
    ]
    expect(isSimplePolygon(bowtie)).toBe(false)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```powershell
npm test -- tests/unit/polygon.test.ts
```

Expected: FAIL because `src/core/geometry/polygon.ts` does not exist.

- [ ] **Step 3: Write `src/core/geometry/polygon.ts`**

```ts
import type { Vec2 } from '../types'

export interface Bounds2 {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export function polygonArea(points: Vec2[]): number {
  if (points.length < 3) return 0
  let sum = 0
  for (let i = 0; i < points.length; i++) {
    const a = points[i]
    const b = points[(i + 1) % points.length]
    sum += a.x * b.y - b.x * a.y
  }
  return sum / 2
}

export function polygonBounds(points: Vec2[]): Bounds2 {
  if (points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 }
  }
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const point of points) {
    minX = Math.min(minX, point.x)
    minY = Math.min(minY, point.y)
    maxX = Math.max(maxX, point.x)
    maxY = Math.max(maxY, point.y)
  }
  return { minX, minY, maxX, maxY }
}

export function pointInPolygon(point: Vec2, polygon: Vec2[]): boolean {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x
    const yi = polygon[i].y
    const xj = polygon[j].x
    const yj = polygon[j].y
    const intersects =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi
    if (intersects) inside = !inside
  }
  return inside
}

function orientation(a: Vec2, b: Vec2, c: Vec2): number {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)
}

function onSegment(a: Vec2, b: Vec2, c: Vec2): boolean {
  return (
    Math.min(a.x, b.x) <= c.x &&
    c.x <= Math.max(a.x, b.x) &&
    Math.min(a.y, b.y) <= c.y &&
    c.y <= Math.max(a.y, b.y)
  )
}

function segmentsIntersect(a: Vec2, b: Vec2, c: Vec2, d: Vec2): boolean {
  const o1 = orientation(a, b, c)
  const o2 = orientation(a, b, d)
  const o3 = orientation(c, d, a)
  const o4 = orientation(c, d, b)
  const eps = 1e-9

  if (Math.abs(o1) < eps && onSegment(a, b, c)) return true
  if (Math.abs(o2) < eps && onSegment(a, b, d)) return true
  if (Math.abs(o3) < eps && onSegment(c, d, a)) return true
  if (Math.abs(o4) < eps && onSegment(c, d, b)) return true

  return o1 * o2 < 0 && o3 * o4 < 0
}

export function isSimplePolygon(points: Vec2[]): boolean {
  if (points.length < 3) return false
  const n = points.length
  for (let i = 0; i < n; i++) {
    const a = points[i]
    const b = points[(i + 1) % n]
    for (let j = i + 1; j < n; j++) {
      if (i === j) continue
      if ((i + 1) % n === j) continue
      if ((j + 1) % n === i) continue
      const c = points[j]
      const d = points[(j + 1) % n]
      if (segmentsIntersect(a, b, c, d)) return false
    }
  }
  return true
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```powershell
npm test -- tests/unit/polygon.test.ts
```

Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```powershell
git add src/core/geometry/polygon.ts tests/unit/polygon.test.ts
git commit -m "feat: add polygon geometry utilities"
```

## Task 4: Add the project store

**Files:**
- Create: `src/store/projectStore.ts`
- Test: `tests/unit/store.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/store.test.ts
import { beforeEach, describe, expect, it } from 'vitest'
import { useProjectStore } from '../../src/store/projectStore'

describe('project store', () => {
  beforeEach(() => {
    useProjectStore.getState().reset()
  })

  it('closes a simple room', () => {
    const store = useProjectStore.getState()
    store.addRoomPoint({ x: 0, y: 0 })
    store.addRoomPoint({ x: 4, y: 0 })
    store.addRoomPoint({ x: 4, y: 3 })
    store.addRoomPoint({ x: 0, y: 3 })
    store.closeRoom()

    const state = useProjectStore.getState()
    expect(state.project.room.boundary).toHaveLength(4)
    expect(state.roomDraft).toHaveLength(0)
    expect(state.activeTool).toBe('select')
  })

  it('rejects a self-intersecting room', () => {
    const store = useProjectStore.getState()
    store.addRoomPoint({ x: 0, y: 0 })
    store.addRoomPoint({ x: 4, y: 3 })
    store.addRoomPoint({ x: 4, y: 0 })
    store.addRoomPoint({ x: 0, y: 3 })
    store.closeRoom()
    expect(useProjectStore.getState().project.room.boundary).toHaveLength(0)
  })

  it('updates room properties', () => {
    useProjectStore.getState().updateRoom({ height: 4.2, wallThickness: 0.2 })
    const room = useProjectStore.getState().project.room
    expect(room.height).toBe(4.2)
    expect(room.wallThickness).toBe(0.2)
  })

  it('adds a speaker and moves the listener', () => {
    const store = useProjectStore.getState()
    store.addSpeaker({ x: 1, y: 2 })
    store.setListener({ x: 3, y: 4 })

    const state = useProjectStore.getState()
    expect(state.project.speakers).toHaveLength(1)
    expect(state.project.speakers[0].name).toBe('Speaker 1')
    expect(state.project.listener.position).toEqual({ x: 3, y: 4 })
    expect(state.selectedId).toBe(state.project.listener.id)
  })

  it('replaces the whole project', () => {
    const current = useProjectStore.getState().project
    useProjectStore.getState().replaceProject({
      ...current,
      name: 'Imported room',
      room: { ...current.room, height: 4 },
    })
    const state = useProjectStore.getState()
    expect(state.project.name).toBe('Imported room')
    expect(state.project.room.height).toBe(4)
    expect(state.activeTool).toBe('select')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```powershell
npm test -- tests/unit/store.test.ts
```

Expected: FAIL because `src/store/projectStore.ts` does not exist.

- [ ] **Step 3: Write `src/store/projectStore.ts`**

```ts
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { Listener, Project, Room, Speaker, Tool, Vec2, ViewMode } from '../core/types'
import { isSimplePolygon } from '../core/geometry/polygon'

export function createDefaultProject(): Project {
  return {
    schemaVersion: 1,
    id: crypto.randomUUID(),
    name: 'Untitled Room',
    room: {
      id: crypto.randomUUID(),
      name: 'Room',
      boundary: [],
      height: 3,
      wallThickness: 0.1,
    },
    speakers: [],
    listener: {
      id: crypto.randomUUID(),
      name: 'Listener',
      position: { x: 2, y: 2 },
      earHeight: 1.2,
    },
  }
}

interface ProjectState {
  project: Project
  activeTool: Tool
  viewMode: ViewMode
  roomDraft: Vec2[]
  selectedId: string | null
  coverageSpacing: number
  previewNonce: number
  setTool: (tool: Tool) => void
  setViewMode: (mode: ViewMode) => void
  updateRoom: (patch: Partial<Room>) => void
  addRoomPoint: (point: Vec2) => void
  closeRoom: () => void
  cancelRoom: () => void
  addSpeaker: (point: Vec2) => void
  updateSpeaker: (id: string, patch: Partial<Speaker>) => void
  setListener: (point: Vec2) => void
  updateListener: (patch: Partial<Listener>) => void
  setCoverageSpacing: (spacing: number) => void
  bumpPreview: () => void
  select: (id: string | null) => void
  replaceProject: (project: Project) => void
  reset: () => void
}

export const useProjectStore = create<ProjectState>()(
  immer((set) => ({
    project: createDefaultProject(),
    activeTool: 'room',
    viewMode: '2d',
    roomDraft: [],
    selectedId: null,
    coverageSpacing: 0.25,
    previewNonce: 0,

    setTool: (tool) =>
      set((state) => {
        state.activeTool = tool
        state.roomDraft = []
      }),

    setViewMode: (mode) =>
      set((state) => {
        state.viewMode = mode
      }),

    updateRoom: (patch) =>
      set((state) => {
        Object.assign(state.project.room, patch)
      }),

    addRoomPoint: (point) =>
      set((state) => {
        state.roomDraft.push(point)
      }),

    closeRoom: () =>
      set((state) => {
        if (state.roomDraft.length >= 3 && isSimplePolygon(state.roomDraft)) {
          state.project.room.boundary = state.roomDraft
          state.roomDraft = []
          state.activeTool = 'select'
        }
      }),

    cancelRoom: () =>
      set((state) => {
        state.roomDraft = []
        state.activeTool = 'select'
      }),

    addSpeaker: (point) =>
      set((state) => {
        const speaker: Speaker = {
          id: crypto.randomUUID(),
          name: `Speaker ${state.project.speakers.length + 1}`,
          position: { x: point.x, y: point.y, z: 1 },
          yawDeg: 0,
          gainDb: 0,
          coverageHorizontalDeg: 90,
          radiatorDiameterM: 0.13,
          enabled: true,
        }
        state.project.speakers.push(speaker)
        state.selectedId = speaker.id
        state.activeTool = 'select'
      }),

    updateSpeaker: (id, patch) =>
      set((state) => {
        const speaker = state.project.speakers.find((item) => item.id === id)
        if (speaker) Object.assign(speaker, patch)
      }),

    setListener: (point) =>
      set((state) => {
        state.project.listener.position = point
        state.selectedId = state.project.listener.id
        state.activeTool = 'select'
      }),

    updateListener: (patch) =>
      set((state) => {
        Object.assign(state.project.listener, patch)
      }),

    setCoverageSpacing: (spacing) =>
      set((state) => {
        state.coverageSpacing = spacing
      }),

    bumpPreview: () =>
      set((state) => {
        state.previewNonce += 1
      }),

    select: (id) =>
      set((state) => {
        state.selectedId = id
      }),

    replaceProject: (project) =>
      set((state) => {
        state.project = project
        state.activeTool = 'select'
        state.viewMode = '2d'
        state.roomDraft = []
        state.selectedId = null
      }),

    reset: () =>
      set((state) => {
        state.project = createDefaultProject()
        state.activeTool = 'room'
        state.viewMode = '2d'
        state.roomDraft = []
        state.selectedId = null
        state.coverageSpacing = 0.25
        state.previewNonce = 0
      }),
  })),
)
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```powershell
npm test -- tests/unit/store.test.ts
```

Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```powershell
git add src/store/projectStore.ts tests/unit/store.test.ts
git commit -m "feat: add project store and room actions"
```

---

## Task 5: Add SVG viewport pan and zoom

**Files:**
- Create: `src/hooks/useSvgViewport.ts`

- [ ] **Step 1: Write the hook**

```ts
// src/hooks/useSvgViewport.ts
import { useCallback, useRef, useState } from 'react'
import type {
  PointerEvent as ReactPointerEvent,
  WheelEvent as ReactWheelEvent,
} from 'react'

export interface ViewBox {
  x: number
  y: number
  w: number
  h: number
}

interface PanState {
  startX: number
  startY: number
  view: ViewBox
}

export function useSvgViewport(initial: ViewBox) {
  const [view, setView] = useState<ViewBox>(initial)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const panRef = useRef<PanState | null>(null)

  const onWheel = useCallback((event: ReactWheelEvent<SVGSVGElement>) => {
    event.preventDefault()
    const rect = event.currentTarget.getBoundingClientRect()
    setView((current) => {
      const fractionX = (event.clientX - rect.left) / rect.width
      const fractionY = (event.clientY - rect.top) / rect.height
      const worldX = current.x + fractionX * current.w
      const worldY = current.y + fractionY * current.h
      const scale = Math.exp(event.deltaY * 0.001)
      const nextW = current.w * scale
      const nextH = current.h * scale
      return {
        x: worldX - fractionX * nextW,
        y: worldY - fractionY * nextH,
        w: nextW,
        h: nextH,
      }
    })
  }, [])

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      if (event.button !== 1 && !event.shiftKey) return
      event.currentTarget.setPointerCapture(event.pointerId)
      panRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        view,
      }
    },
    [view],
  )

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      const pan = panRef.current
      if (!pan) return
      const rect = event.currentTarget.getBoundingClientRect()
      const dx = ((event.clientX - pan.startX) / rect.width) * pan.view.w
      const dy = ((event.clientY - pan.startY) / rect.height) * pan.view.h
      setView({
        ...pan.view,
        x: pan.view.x - dx,
        y: pan.view.y - dy,
      })
    },
    [],
  )

  const onPointerUp = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      panRef.current = null
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }
    },
    [],
  )

  const screenToWorld = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const point = svg.createSVGPoint()
    point.x = clientX
    point.y = clientY
    const matrix = svg.getScreenCTM()
    if (!matrix) return { x: 0, y: 0 }
    const transformed = point.matrixTransform(matrix.inverse())
    return { x: transformed.x, y: -transformed.y }
  }, [])

  return {
    view,
    setView,
    svgRef,
    onWheel,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    screenToWorld,
  }
}
```

- [ ] **Step 2: Verify the build**

Run:

```powershell
npm run typecheck
```

Expected: PASS with no errors.

- [ ] **Step 3: Commit**

```powershell
git add src/hooks/useSvgViewport.ts
git commit -m "feat: add svg viewport pan and zoom hook"
```

---

## Task 6: Draw the room in 2D

**Files:**
- Create: `src/components/viewport/Viewport2D.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Write `src/components/viewport/Viewport2D.tsx`**

```tsx
import { useEffect } from 'react'
import { useProjectStore } from '../../store/projectStore'
import { useSvgViewport } from '../../hooks/useSvgViewport'
import { snap } from '../../lib/math'

export function Viewport2D() {
  const project = useProjectStore((state) => state.project)
  const activeTool = useProjectStore((state) => state.activeTool)
  const roomDraft = useProjectStore((state) => state.roomDraft)
  const addRoomPoint = useProjectStore((state) => state.addRoomPoint)
  const closeRoom = useProjectStore((state) => state.closeRoom)
  const cancelRoom = useProjectStore((state) => state.cancelRoom)
  const {
    view,
    svgRef,
    onWheel,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    screenToWorld,
  } = useSvgViewport({ x: -2, y: -8, w: 12, h: 10 })

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter' && activeTool === 'room') {
        closeRoom()
      }
      if (event.key === 'Escape') {
        cancelRoom()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [activeTool, closeRoom, cancelRoom])

  const handleClick = (event: React.MouseEvent<SVGSVGElement>) => {
    if (event.button !== 0 || event.shiftKey) return
    if (activeTool !== 'room') return
    const point = screenToWorld(event.clientX, event.clientY)
    addRoomPoint({ x: snap(point.x, 0.25), y: snap(point.y, 0.25) })
  }

  const step = view.w > 24 ? 2 : view.w > 12 ? 1 : 0.25
  const gridLines: React.ReactNode[] = []
  const startX = Math.floor(view.x / step) * step
  const endX = view.x + view.w
  for (let x = startX; x <= endX; x += step) {
    gridLines.push(
      <line
        key={`x-${x}`}
        x1={x}
        y1={view.y}
        x2={x}
        y2={view.y + view.h}
        stroke="#1e293b"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />,
    )
  }
  const startY = Math.floor(view.y / step) * step
  const endY = view.y + view.h
  for (let y = startY; y <= endY; y += step) {
    gridLines.push(
      <line
        key={`y-${y}`}
        x1={view.x}
        y1={y}
        x2={view.x + view.w}
        y2={y}
        stroke="#1e293b"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />,
    )
  }

  const roomPoints = project.room.boundary
    .map((point) => `${point.x},${-point.y}`)
    .join(' ')
  const draftPoints = roomDraft
    .map((point) => `${point.x},${-point.y}`)
    .join(' ')

  return (
    <div className="relative h-full w-full">
      <svg
        ref={svgRef}
        data-testid="viewport-2d"
        className="h-full w-full touch-none"
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onClick={handleClick}
        style={{ cursor: activeTool === 'room' ? 'crosshair' : 'default' }}
      >
        <rect
          x={view.x}
          y={view.y}
          width={view.w}
          height={view.h}
          fill="#0b0f14"
        />
        {gridLines}
        {project.room.boundary.length >= 3 && (
          <polygon
            points={roomPoints}
            fill="rgba(20, 184, 166, 0.08)"
            stroke="#2dd4bf"
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          />
        )}
        {roomDraft.length >= 2 && (
          <polyline
            points={draftPoints}
            fill="none"
            stroke="#fbbf24"
            strokeWidth={2}
            strokeDasharray="6 4"
            vectorEffect="non-scaling-stroke"
          />
        )}
        {roomDraft.map((point, index) => (
          <circle
            key={`draft-${index}`}
            cx={point.x}
            cy={-point.y}
            r={view.w * 0.006}
            fill="#fbbf24"
          />
        ))}
      </svg>
      {activeTool === 'room' && (
        <div className="pointer-events-none absolute bottom-3 left-3 rounded bg-slate-900/90 px-3 py-2 text-xs text-slate-300 ring-1 ring-slate-700">
          Click to place points. Press Enter to close. Esc to cancel.
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Replace `src/App.tsx` to mount the viewport**

```tsx
import { Viewport2D } from './components/viewport/Viewport2D'

export default function App() {
  return (
    <div className="flex h-screen w-screen flex-col bg-slate-950 text-slate-100">
      <header className="flex h-12 items-center border-b border-slate-800 px-4">
        <h1 className="text-sm font-semibold tracking-wide">Room Response Studio</h1>
      </header>
      <div className="flex min-h-0 flex-1">
        <aside className="w-14 border-r border-slate-800" />
        <main className="min-w-0 flex-1">
          <Viewport2D />
        </main>
        <aside className="w-72 border-l border-slate-800" />
      </div>
      <footer className="h-40 border-t border-slate-800" />
    </div>
  )
}
```

- [ ] **Step 3: Verify the build**

Run:

```powershell
npm run build
```

Expected: PASS with no TypeScript errors.

- [ ] **Step 4: Manual smoke test**

Run:

```powershell
npm run dev
```

Open the printed local URL. Click four points, press Enter. Expected: the polygon appears and the draft disappears.

- [ ] **Step 5: Commit**

```powershell
git add src/components/viewport/Viewport2D.tsx src/App.tsx
git commit -m "feat: add 2D room drawing viewport"
```

## Task 7: Extrude the room in 3D

**Files:**
- Create: `src/core/geometry/walls.ts`
- Test: `tests/unit/walls.test.ts`
- Create: `src/components/viewport/RoomMesh.tsx`
- Create: `src/components/viewport/Viewport3D.tsx`
- Create: `src/components/layout/TopBar.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Write the failing wall test**

```ts
// tests/unit/walls.test.ts
import { describe, expect, it } from 'vitest'
import { buildWallMeshes } from '../../src/core/geometry/walls'
import type { Room } from '../../src/core/types'

const room: Room = {
  id: 'room',
  name: 'Room',
  boundary: [
    { x: 0, y: 0 },
    { x: 4, y: 0 },
    { x: 4, y: 3 },
    { x: 0, y: 3 },
  ],
  height: 3,
  wallThickness: 0.1,
}

describe('wall mesh generation', () => {
  it('creates one wall per boundary edge', () => {
    const walls = buildWallMeshes(room)
    expect(walls).toHaveLength(4)
  })

  it('sizes the first wall correctly', () => {
    const [first] = buildWallMeshes(room)
    expect(first.size.x).toBeCloseTo(4.1)
    expect(first.size.y).toBeCloseTo(0.1)
    expect(first.size.z).toBeCloseTo(3)
    expect(first.center.z).toBeCloseTo(1.5)
    expect(first.angleRad).toBeCloseTo(0)
  })

  it('returns no walls for an empty boundary', () => {
    expect(buildWallMeshes({ ...room, boundary: [] })).toEqual([])
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```powershell
npm test -- tests/unit/walls.test.ts
```

Expected: FAIL because `src/core/geometry/walls.ts` does not exist.

- [ ] **Step 3: Write `src/core/geometry/walls.ts`**

```ts
import type { Room, Vec3 } from '../types'

export interface WallMesh {
  center: Vec3
  size: { x: number; y: number; z: number }
  angleRad: number
  length: number
}

export function buildWallMeshes(room: Room): WallMesh[] {
  const boundary = room.boundary
  if (boundary.length < 3) return []

  return boundary.map((start, index) => {
    const end = boundary[(index + 1) % boundary.length]
    const dx = end.x - start.x
    const dy = end.y - start.y
    const length = Math.hypot(dx, dy)
    const angleRad = Math.atan2(dy, dx)
    const nx = dy / length
    const ny = -dx / length
    const thickness = room.wallThickness
    return {
      center: {
        x: (start.x + end.x) / 2 + (nx * thickness) / 2,
        y: (start.y + end.y) / 2 + (ny * thickness) / 2,
        z: room.height / 2,
      },
      size: {
        x: length + thickness,
        y: thickness,
        z: room.height,
      },
      angleRad,
      length,
    }
  })
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```powershell
npm test -- tests/unit/walls.test.ts
```

Expected: PASS, 3 tests.

- [ ] **Step 5: Write `src/components/viewport/RoomMesh.tsx`**

```tsx
import { useMemo } from 'react'
import * as THREE from 'three'
import { useProjectStore } from '../../store/projectStore'
import { buildWallMeshes } from '../../core/geometry/walls'

export function RoomMesh() {
  const room = useProjectStore((state) => state.project.room)
  const shape = useMemo(() => {
    if (room.boundary.length < 3) return null
    const next = new THREE.Shape()
    room.boundary.forEach((point, index) => {
      if (index === 0) next.moveTo(point.x, point.y)
      else next.lineTo(point.x, point.y)
    })
    next.closePath()
    return next
  }, [room.boundary])

  const walls = useMemo(() => buildWallMeshes(room), [room])

  if (!shape) return null

  return (
    <group>
      <mesh receiveShadow>
        <shapeGeometry args={[shape]} />
        <meshStandardMaterial color="#111827" side={THREE.DoubleSide} />
      </mesh>
      {walls.map((wall, index) => (
        <mesh
          key={index}
          position={[wall.center.x, wall.center.y, wall.center.z]}
          rotation={[0, 0, wall.angleRad]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[wall.size.x, wall.size.y, wall.size.z]} />
          <meshStandardMaterial
            color="#334155"
            transparent
            opacity={0.72}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  )
}
```

- [ ] **Step 6: Write `src/components/viewport/Viewport3D.tsx`**

```tsx
import { Canvas } from '@react-three/fiber'
import { Grid, OrbitControls } from '@react-three/drei'
import { RoomMesh } from './RoomMesh'

export function Viewport3D() {
  return (
    <div data-testid="viewport-3d" className="h-full w-full">
      <Canvas
        shadows
        camera={{ position: [7, -7, 6], fov: 50 }}
        onCreated={({ camera }) => {
          camera.up.set(0, 0, 1)
          camera.lookAt(2, 2, 1.5)
        }}
      >
        <color attach="background" args={['#0b0f14']} />
        <ambientLight intensity={1.1} />
        <directionalLight
          position={[5, -5, 12]}
          intensity={2}
          castShadow
        />
        <Grid
          args={[20, 20]}
          position={[0, 0, -0.01]}
          rotation={[Math.PI / 2, 0, 0]}
          cellSize={0.5}
          cellColor="#1e293b"
          sectionSize={2}
          sectionColor="#334155"
          fadeDistance={30}
          fadeStrength={1}
          infiniteGrid
        />
        <RoomMesh />
        <OrbitControls makeDefault target={[2, 2, 1.5]} />
      </Canvas>
    </div>
  )
}
```

- [ ] **Step 7: Write `src/components/layout/TopBar.tsx`**

```tsx
import { polygonArea } from '../../core/geometry/polygon'
import { useProjectStore } from '../../store/projectStore'

export function TopBar() {
  const project = useProjectStore((state) => state.project)
  const roomDraft = useProjectStore((state) => state.roomDraft)
  const viewMode = useProjectStore((state) => state.viewMode)
  const setViewMode = useProjectStore((state) => state.setViewMode)
  const reset = useProjectStore((state) => state.reset)

  const boundary = project.room.boundary
  const area = boundary.length >= 3 ? Math.abs(polygonArea(boundary)) : 0

  return (
    <header className="flex h-12 shrink-0 items-center gap-4 border-b border-slate-800 px-4">
      <h1 className="text-sm font-semibold tracking-wide">Room Response Studio</h1>
      <span data-testid="room-status" className="text-xs text-slate-400">
        {boundary.length >= 3
          ? `Room: ${boundary.length} vertices · ${area.toFixed(1)} m²`
          : roomDraft.length > 0
            ? `Drawing: ${roomDraft.length} points`
            : 'No room yet'}
      </span>
      <div className="ml-auto flex items-center gap-1 rounded bg-slate-900 p-1">
        <button
          data-testid="view-2d"
          className={`rounded px-3 py-1 text-xs ${
            viewMode === '2d' ? 'bg-teal-500 text-slate-950' : 'text-slate-300'
          }`}
          onClick={() => setViewMode('2d')}
        >
          2D
        </button>
        <button
          data-testid="view-3d"
          className={`rounded px-3 py-1 text-xs ${
            viewMode === '3d' ? 'bg-teal-500 text-slate-950' : 'text-slate-300'
          }`}
          onClick={() => setViewMode('3d')}
        >
          3D
        </button>
      </div>
      <button
        className="rounded border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:bg-slate-800"
        onClick={reset}
      >
        New
      </button>
    </header>
  )
}
```

- [ ] **Step 8: Update `src/App.tsx` to switch views**

```tsx
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
```

- [ ] **Step 9: Verify build and tests**

Run:

```powershell
npm run typecheck
npm test -- tests/unit/walls.test.ts
npm run build
```

Expected: all pass. If TypeScript rejects the `Canvas` camera/up combination, keep the `onCreated` camera-up code and remove any `up` prop from the camera object.

- [ ] **Step 10: Commit**

```powershell
git add src/core/geometry/walls.ts tests/unit/walls.test.ts src/components/viewport/RoomMesh.tsx src/components/viewport/Viewport3D.tsx src/components/layout/TopBar.tsx src/App.tsx
git commit -m "feat: add 3D room extrusion and viewport"
```

## Task 8: Place speakers and listeners

**Files:**
- Create: `vitest.config.ts`
- Create: `tests/setup.ts`
- Create: `src/components/layout/ToolRail.tsx`
- Test: `tests/unit/toolrail.test.tsx`
- Create: `src/components/viewport/SpeakerMesh.tsx`
- Create: `src/components/viewport/ListenerMarker.tsx`
- Modify: `src/components/viewport/Viewport2D.tsx`
- Modify: `src/components/viewport/Viewport3D.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Add Vitest DOM setup**

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/unit/**/*.test.{ts,tsx}'],
  },
})
```

```ts
// tests/setup.ts
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 2: Write the failing tool rail test**

```tsx
// tests/unit/toolrail.test.tsx
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { ToolRail } from '../../src/components/layout/ToolRail'
import { useProjectStore } from '../../src/store/projectStore'

describe('ToolRail', () => {
  beforeEach(() => {
    useProjectStore.getState().reset()
  })

  it('renders every tool', () => {
    render(<ToolRail />)
    expect(screen.getByTestId('tool-select')).toBeInTheDocument()
    expect(screen.getByTestId('tool-room')).toBeInTheDocument()
    expect(screen.getByTestId('tool-speaker')).toBeInTheDocument()
    expect(screen.getByTestId('tool-listener')).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run:

```powershell
npm test -- tests/unit/toolrail.test.tsx
```

Expected: FAIL because `src/components/layout/ToolRail.tsx` does not exist.

- [ ] **Step 4: Write `src/components/layout/ToolRail.tsx`**

```tsx
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
```

- [ ] **Step 5: Run the test to verify it passes**

Run:

```powershell
npm test -- tests/unit/toolrail.test.tsx
```

Expected: PASS, 1 test.

- [ ] **Step 6: Write `src/components/viewport/SpeakerMesh.tsx`**

```tsx
import { Line } from '@react-three/drei'
import { useProjectStore } from '../../store/projectStore'
import { degToRad } from '../../lib/math'

export function SpeakerMesh() {
  const speakers = useProjectStore((state) => state.project.speakers)

  return (
    <>
      {speakers.map((speaker) => (
        <group
          key={speaker.id}
          position={[speaker.position.x, speaker.position.y, speaker.position.z]}
          rotation={[0, 0, degToRad(speaker.yawDeg)]}
        >
          <mesh castShadow>
            <boxGeometry args={[0.25, 0.3, 0.25]} />
            <meshStandardMaterial color="#f59e0b" />
          </mesh>
          <Line
            points={[
              [0, 0, 0],
              [0, -0.6, 0],
            ]}
            color="#fbbf24"
            lineWidth={2}
          />
          <mesh position={[0, -0.64, 0]} rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[0.05, 0.12, 12]} />
            <meshStandardMaterial color="#fbbf24" />
          </mesh>
        </group>
      ))}
    </>
  )
}
```

- [ ] **Step 7: Write `src/components/viewport/ListenerMarker.tsx`**

```tsx
import { Line } from '@react-three/drei'
import { useProjectStore } from '../../store/projectStore'

export function ListenerMarker() {
  const listener = useProjectStore((state) => state.project.listener)

  return (
    <group
      position={[listener.position.x, listener.position.y, listener.earHeight]}
    >
      <mesh>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="#38bdf8" />
      </mesh>
      <Line
        points={[
          [0, 0, 0],
          [0, 0, -listener.earHeight],
        ]}
        color="#38bdf8"
        lineWidth={2}
      />
    </group>
  )
}
```

- [ ] **Step 8: Update `Viewport3D` to include the markers**

Replace the `<RoomMesh />` line with:

```tsx
        <RoomMesh />
        <SpeakerMesh />
        <ListenerMarker />
```

Add imports at the top:

```tsx
import { SpeakerMesh } from './SpeakerMesh'
import { ListenerMarker } from './ListenerMarker'
```

- [ ] **Step 9: Update `Viewport2D` to render and place speakers/listeners**

Add imports:

```tsx
import { degToRad } from '../../lib/math'
```

Add store actions inside the component:

```tsx
  const addSpeaker = useProjectStore((state) => state.addSpeaker)
  const setListener = useProjectStore((state) => state.setListener)
  const select = useProjectStore((state) => state.select)
```

Replace the click handler with:

```tsx
  const handleClick = (event: React.MouseEvent<SVGSVGElement>) => {
    if (event.button !== 0 || event.shiftKey) return
    const point = screenToWorld(event.clientX, event.clientY)
    const snapped = { x: snap(point.x, 0.25), y: snap(point.y, 0.25) }
    if (activeTool === 'room') addRoomPoint(snapped)
    if (activeTool === 'speaker') addSpeaker(snapped)
    if (activeTool === 'listener') setListener(snapped)
  }
```

Add the speaker/listener markers after the draft circles, before `</svg>`:

```tsx
        {project.speakers.map((speaker) => {
          const angle = degToRad(speaker.yawDeg)
          const dx = -Math.sin(angle)
          const dy = -Math.cos(angle)
          return (
            <g
              key={speaker.id}
              transform={`translate(${speaker.position.x},${-speaker.position.y})`}
              className="cursor-pointer"
              onClick={(event) => {
                event.stopPropagation()
                select(speaker.id)
              }}
            >
              <circle
                r={view.w * 0.012}
                fill="#f59e0b"
                stroke="#fbbf24"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
              <line
                x1={0}
                y1={0}
                x2={dx * view.w * 0.04}
                y2={dy * view.w * 0.04}
                stroke="#fbbf24"
                strokeWidth={2}
                vectorEffect="non-scaling-stroke"
              />
            </g>
          )
        })}
        <g
          transform={`translate(${project.listener.position.x},${-project.listener.position.y})`}
          className="cursor-pointer"
          onClick={(event) => {
            event.stopPropagation()
            select(project.listener.id)
          }}
        >
          <circle
            r={view.w * 0.012}
            fill="#0b0f14"
            stroke="#38bdf8"
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          />
          <line
            x1={-view.w * 0.008}
            y1={0}
            x2={view.w * 0.008}
            y2={0}
            stroke="#38bdf8"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
          <line
            x1={0}
            y1={-view.w * 0.008}
            x2={0}
            y2={view.w * 0.008}
            stroke="#38bdf8"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        </g>
```

Update the hint text to match the active tool:

```tsx
      {activeTool !== 'select' && (
        <div className="pointer-events-none absolute bottom-3 left-3 rounded bg-slate-900/90 px-3 py-2 text-xs text-slate-300 ring-1 ring-slate-700">
          {activeTool === 'room'
            ? 'Click to place points. Press Enter to close. Esc to cancel.'
            : activeTool === 'speaker'
              ? 'Click to place a speaker.'
              : 'Click to place the listener.'}
        </div>
      )}
```

- [ ] **Step 10: Update `App.tsx` to use the tool rail**

Replace the empty `<aside className="w-14 ..." />` with `<ToolRail />`, and add the import:

```tsx
import { ToolRail } from './components/layout/ToolRail'
```

- [ ] **Step 11: Verify tests and build**

Run:

```powershell
npm test -- tests/unit/toolrail.test.tsx tests/unit/store.test.ts
npm run typecheck
npm run build
```

Expected: all pass.

- [ ] **Step 12: Commit**

```powershell
git add vitest.config.ts tests/setup.ts tests/unit/toolrail.test.tsx src/components/layout/ToolRail.tsx src/components/viewport/SpeakerMesh.tsx src/components/viewport/ListenerMarker.tsx src/components/viewport/Viewport2D.tsx src/components/viewport/Viewport3D.tsx src/App.tsx
git commit -m "feat: add speaker and listener placement"
```

## Task 9: Add the inspector

**Files:**
- Create: `src/components/ui/NumberField.tsx`
- Create: `src/components/layout/Inspector.tsx`
- Test: `tests/unit/inspector.test.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Write the failing inspector test**

```tsx
// tests/unit/inspector.test.tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { Inspector } from '../../src/components/layout/Inspector'
import { useProjectStore } from '../../src/store/projectStore'

describe('Inspector', () => {
  beforeEach(() => {
    useProjectStore.getState().reset()
  })

  it('updates the room height', () => {
    render(<Inspector />)
    fireEvent.change(screen.getByLabelText('Room height'), {
      target: { value: '4.2' },
    })
    expect(useProjectStore.getState().project.room.height).toBe(4.2)
  })

  it('shows speaker fields when a speaker is selected', () => {
    useProjectStore.getState().addSpeaker({ x: 1, y: 1 })
    render(<Inspector />)
    expect(screen.getByLabelText('Speaker name')).toHaveValue('Speaker 1')
    expect(screen.getByLabelText('Gain')).toHaveValue(0)
  })

  it('updates the listener ear height', () => {
    render(<Inspector />)
    fireEvent.change(screen.getByLabelText('Ear height'), {
      target: { value: '1.7' },
    })
    expect(useProjectStore.getState().project.listener.earHeight).toBe(1.7)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```powershell
npm test -- tests/unit/inspector.test.tsx
```

Expected: FAIL because `Inspector` does not exist.

- [ ] **Step 3: Write `src/components/ui/NumberField.tsx`**

```tsx
import { useId } from 'react'

interface NumberFieldProps {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  unit?: string
}

export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 0.1,
  unit,
}: NumberFieldProps) {
  const id = useId()

  return (
    <div className="flex items-center justify-between gap-3">
      <label htmlFor={id} className="text-xs text-slate-400">
        {label}
      </label>
      <div className="flex items-center gap-1">
        <input
          id={id}
          type="number"
          className="w-24 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-right text-xs text-slate-100 outline-none focus:border-teal-500"
          value={Number.isFinite(value) ? value : 0}
          min={min}
          max={max}
          step={step}
          onChange={(event) => {
            const next = Number(event.target.value)
            if (Number.isFinite(next)) onChange(next)
          }}
        />
        {unit && <span className="w-5 text-[10px] text-slate-500">{unit}</span>}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Write `src/components/layout/Inspector.tsx`**

```tsx
import { polygonArea } from '../../core/geometry/polygon'
import { useProjectStore } from '../../store/projectStore'
import { NumberField } from '../ui/NumberField'

export function Inspector() {
  const project = useProjectStore((state) => state.project)
  const selectedId = useProjectStore((state) => state.selectedId)
  const updateRoom = useProjectStore((state) => state.updateRoom)
  const updateSpeaker = useProjectStore((state) => state.updateSpeaker)
  const updateListener = useProjectStore((state) => state.updateListener)
  const setCoverageSpacing = useProjectStore((state) => state.setCoverageSpacing)
  const coverageSpacing = useProjectStore((state) => state.coverageSpacing)

  const speaker = project.speakers.find((item) => item.id === selectedId)
  const boundary = project.room.boundary
  const area = boundary.length >= 3 ? Math.abs(polygonArea(boundary)) : 0

  return (
    <aside
      data-testid="inspector"
      className="flex w-72 shrink-0 flex-col gap-5 overflow-y-auto border-l border-slate-800 p-4"
    >
      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Room
        </h2>
        <div className="text-xs text-slate-500">
          {boundary.length >= 3
            ? `${boundary.length} vertices · ${area.toFixed(2)} m²`
            : 'Draw a room in the 2D view.'}
        </div>
        <NumberField
          label="Room height"
          value={project.room.height}
          min={1}
          max={20}
          onChange={(value) => {
            updateRoom({ height: value })
          }}
          unit="m"
        />
        <NumberField
          label="Wall thickness"
          value={project.room.wallThickness}
          min={0.01}
          max={1}
          step={0.01}
          onChange={(value) => {
            updateRoom({ wallThickness: value })
          }}
          unit="m"
        />
      </section>

      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {speaker ? 'Speaker' : 'Listener'}
        </h2>
        {speaker ? (
          <>
            <label className="flex items-center justify-between gap-3 text-xs text-slate-400">
              Speaker name
              <input
                className="w-40 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-right text-xs text-slate-100 outline-none focus:border-teal-500"
                value={speaker.name}
                onChange={(event) =>
                  updateSpeaker(speaker.id, { name: event.target.value })
                }
              />
            </label>
            <NumberField
              label="Gain"
              value={speaker.gainDb}
              min={-60}
              max={20}
              step={0.5}
              onChange={(value) => updateSpeaker(speaker.id, { gainDb: value })}
              unit="dB"
            />
            <NumberField
              label="Acoustic height"
              value={speaker.position.z}
              min={0.1}
              max={project.room.height}
              step={0.05}
              onChange={(value) =>
                updateSpeaker(speaker.id, {
                  position: { ...speaker.position, z: value },
                })
              }
              unit="m"
            />
            <NumberField
              label="Yaw"
              value={speaker.yawDeg}
              min={-180}
              max={180}
              step={5}
              onChange={(value) => updateSpeaker(speaker.id, { yawDeg: value })}
              unit="°"
            />
            <NumberField
              label="Coverage"
              value={speaker.coverageHorizontalDeg}
              min={30}
              max={180}
              step={5}
              onChange={(value) =>
                updateSpeaker(speaker.id, { coverageHorizontalDeg: value })
              }
              unit="°"
            />
          </>
        ) : (
          <>
            <label className="flex items-center justify-between gap-3 text-xs text-slate-400">
              Listener name
              <input
                className="w-40 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-right text-xs text-slate-100 outline-none focus:border-teal-500"
                value={project.listener.name}
                onChange={(event) =>
                  updateListener({ name: event.target.value })
                }
              />
            </label>
            <NumberField
              label="Ear height"
              value={project.listener.earHeight}
              min={0.5}
              max={2.5}
              step={0.05}
              onChange={(value) => updateListener({ earHeight: value })}
              unit="m"
            />
            <div className="text-xs text-slate-500">
              Select a speaker in the 2D or 3D view to edit it.
            </div>
          </>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Preview
        </h2>
        <label className="flex items-center justify-between gap-3 text-xs text-slate-400">
          Grid spacing
          <select
            className="w-24 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-right text-xs text-slate-100 outline-none focus:border-teal-500"
            value={coverageSpacing}
            onChange={(event) => setCoverageSpacing(Number(event.target.value))}
          >
            <option value={0.1}>0.10 m</option>
            <option value={0.25}>0.25 m</option>
            <option value={0.5}>0.50 m</option>
            <option value={1}>1.00 m</option>
          </select>
        </label>
      </section>
    </aside>
  )
}
```

- [ ] **Step 5: Update `App.tsx` to use the inspector**

Replace the empty `<aside className="w-72 ..." />` with `<Inspector />`, and add:

```tsx
import { Inspector } from './components/layout/Inspector'
```

- [ ] **Step 6: Run tests and build**

Run:

```powershell
npm test -- tests/unit/inspector.test.tsx
npm run typecheck
npm run build
```

Expected: 3 inspector tests pass and the build succeeds.

- [ ] **Step 7: Commit**

```powershell
git add src/components/ui/NumberField.tsx src/components/layout/Inspector.tsx tests/unit/inspector.test.tsx src/App.tsx
git commit -m "feat: add room speaker and listener inspector"
```

---

## Task 10: Add direct-field acoustics

**Files:**
- Create: `src/core/acoustics/directivity.ts`
- Create: `src/core/acoustics/directField.ts`
- Test: `tests/unit/directField.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/directField.test.ts
import { describe, expect, it } from 'vitest'
import { coverageDirectivity } from '../../src/core/acoustics/directivity'
import {
  MIN_SPL_DB,
  powerSumDb,
  splAtPoint,
} from '../../src/core/acoustics/directField'
import type { DirectFieldSource } from '../../src/core/acoustics/directField'

const source: DirectFieldSource = {
  position: { x: 0, y: 0, z: 1.5 },
  yawDeg: 0,
  gainDb: 0,
  coverageHorizontalDeg: 90,
}

describe('coverage directivity', () => {
  it('normalizes on axis and reaches one half at the nominal edge', () => {
    expect(coverageDirectivity(0, 90)).toBeCloseTo(1)
    expect(coverageDirectivity(Math.PI / 4, 90)).toBeCloseTo(0.5)
  })

  it('is silent outside the forward hemisphere', () => {
    expect(coverageDirectivity(Math.PI / 2, 90)).toBe(0)
    expect(coverageDirectivity(Math.PI, 90)).toBe(0)
  })

  it('widens with a larger coverage angle', () => {
    expect(coverageDirectivity(Math.PI / 4, 120)).toBeGreaterThan(
      coverageDirectivity(Math.PI / 4, 90),
    )
  })

  it('treats a 180 degree pattern as omni', () => {
    expect(coverageDirectivity(Math.PI / 2, 180)).toBe(1)
  })
})

describe('direct field', () => {
  it('is 0 dB at 1 m on axis with unity gain', () => {
    expect(splAtPoint(source, { x: 0, y: -1, z: 1.5 })).toBeCloseTo(0)
  })

  it('drops about 6 dB per doubling of distance', () => {
    expect(splAtPoint(source, { x: 0, y: -2, z: 1.5 })).toBeCloseTo(-6.0206, 3)
  })

  it('applies source gain', () => {
    expect(
      splAtPoint({ ...source, gainDb: 6 }, { x: 0, y: -1, z: 1.5 }),
    ).toBeCloseTo(6)
  })

  it('applies the coverage pattern off axis', () => {
    const offset = Math.SQRT1_2
    expect(
      splAtPoint(source, { x: offset, y: -offset, z: 1.5 }),
    ).toBeCloseTo(-6.0206, 3)
  })

  it('returns the floor behind the source', () => {
    expect(splAtPoint(source, { x: 0, y: 1, z: 1.5 })).toBe(MIN_SPL_DB)
  })

  it('power sums independent sources', () => {
    expect(powerSumDb([0, 0])).toBeCloseTo(3.0103, 3)
    expect(powerSumDb([-10, -10])).toBeCloseTo(-6.9897, 3)
    expect(powerSumDb([])).toBe(MIN_SPL_DB)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```powershell
npm test -- tests/unit/directField.test.ts
```

Expected: FAIL because the acoustics modules do not exist.

- [ ] **Step 3: Write `src/core/acoustics/directivity.ts`**

```ts
import { degToRad } from '../../lib/math'

/**
 * Smooth coverage-angle directivity for the Phase 0 preview.
 * The nominal coverage angle is treated as the -6 dB beamwidth.
 *
 * Returns a linear amplitude normalized to 1 on axis. A 180 degree
 * pattern is omni; everything behind the source is silent.
 */
export function coverageDirectivity(
  offAxisRad: number,
  coverageDeg: number,
): number {
  const coverage = Number.isFinite(coverageDeg) ? coverageDeg : 90
  if (coverage >= 180) return 1

  const cosine = Math.cos(Math.abs(offAxisRad))
  if (cosine <= 1e-12) return 0

  const halfAngle = degToRad(Math.max(coverage, 1) / 2)
  const exponent = Math.log(0.5) / Math.log(Math.cos(halfAngle))
  return Math.pow(cosine, exponent)
}
```

- [ ] **Step 4: Write `src/core/acoustics/directField.ts`**

```ts
import { clamp, degToRad } from '../../lib/math'
import type { Vec3 } from '../types'
import { coverageDirectivity } from './directivity'

/** Floor for relative levels so heatmaps and sums stay finite. */
export const MIN_SPL_DB = -120
export const REFERENCE_DISTANCE_M = 1

export interface DirectFieldSource {
  position: Vec3
  yawDeg: number
  gainDb: number
  coverageHorizontalDeg: number
}

/**
 * Phase 0 direct-field level relative to 1 m on axis at 0 dB source gain.
 * Horizontal coverage is modeled; elevation is ignored. Air absorption is
 * intentionally deferred to the Phase 1 solver.
 */
export function splAtPoint(
  source: DirectFieldSource,
  point: Vec3,
): number {
  const dx = point.x - source.position.x
  const dy = point.y - source.position.y
  const dz = point.z - source.position.z
  const distance = Math.hypot(dx, dy, dz)
  if (distance < 1e-6) return MIN_SPL_DB

  const horizontal = Math.hypot(dx, dy)
  const yaw = degToRad(source.yawDeg)
  const aimX = -Math.sin(yaw)
  const aimY = -Math.cos(yaw)
  const cosOffAxis =
    horizontal < 1e-9
      ? 1
      : (dx * aimX + dy * aimY) / horizontal
  const offAxis = Math.acos(clamp(cosOffAxis, -1, 1))
  const directivity = coverageDirectivity(
    offAxis,
    source.coverageHorizontalDeg,
  )
  if (directivity <= 0) return MIN_SPL_DB

  const referenceDistance = Math.max(distance, 0.5)
  const level =
    source.gainDb +
    20 * Math.log10(directivity) -
    20 * Math.log10(referenceDistance / REFERENCE_DISTANCE_M)

  return Math.max(MIN_SPL_DB, level)
}

/** Incoherent power sum of independent source levels. */
export function powerSumDb(levelsDb: readonly number[]): number {
  if (levelsDb.length === 0) return MIN_SPL_DB

  let energy = 0
  for (const level of levelsDb) {
    if (!Number.isFinite(level)) continue
    energy += Math.pow(10, level / 10)
  }

  if (energy <= 0) return MIN_SPL_DB
  return Math.max(MIN_SPL_DB, 10 * Math.log10(energy))
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run:

```powershell
npm test -- tests/unit/directField.test.ts
```

Expected: PASS, 10 tests.

- [ ] **Step 6: Commit**

```powershell
git add src/core/acoustics/directivity.ts src/core/acoustics/directField.ts tests/unit/directField.test.ts
git commit -m "feat: add direct-field acoustics"
```

---

## Task 11: Generate the coverage grid

**Files:**
- Create: `src/core/geometry/coverage.ts`
- Test: `tests/unit/coverage.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/coverage.test.ts
import { describe, expect, it } from 'vitest'
import {
  buildCoverageGrid,
  computeCoverage,
} from '../../src/core/geometry/coverage'
import type { CoverageGrid } from '../../src/core/geometry/coverage'
import type { Speaker } from '../../src/core/types'

const rectangle = [
  { x: 0, y: 0 },
  { x: 4, y: 0 },
  { x: 4, y: 3 },
  { x: 0, y: 3 },
]

const lRoom = [
  { x: 0, y: 0 },
  { x: 4, y: 0 },
  { x: 4, y: 1 },
  { x: 1, y: 1 },
  { x: 1, y: 3 },
  { x: 0, y: 3 },
]

const speaker: Speaker = {
  id: 'speaker-1',
  name: 'Speaker 1',
  position: { x: 0.5, y: 0.5, z: 1.2 },
  yawDeg: -90,
  gainDb: 0,
  coverageHorizontalDeg: 90,
  radiatorDiameterM: 0.13,
  enabled: true,
}

function indexOf(grid: CoverageGrid, x: number, y: number): number {
  return (
    Math.round((x - grid.minX) / grid.spacing) +
    Math.round((y - grid.minY) / grid.spacing) * grid.nx
  )
}

describe('coverage grid', () => {
  it('builds a grid over the room bounds', () => {
    const grid = buildCoverageGrid(rectangle, 1, 1.2)
    expect(grid).not.toBeNull()
    if (!grid) throw new Error('Expected a grid')

    expect(grid.minX).toBe(0)
    expect(grid.minY).toBe(0)
    expect(grid.nx).toBe(5)
    expect(grid.ny).toBe(4)
    expect(grid.spacing).toBe(1)
    expect(grid.values).toHaveLength(20)
    expect(grid.values[indexOf(grid, 2, 1)]).toBe(0)
  })

  it('marks cells outside an L-shaped room as NaN', () => {
    const grid = buildCoverageGrid(lRoom, 0.5, 1.2)
    if (!grid) throw new Error('Expected a grid')

    expect(grid.values[indexOf(grid, 0.5, 0.5)]).toBe(0)
    expect(grid.values[indexOf(grid, 2.5, 2.5)]).toBeNaN()
  })

  it('computes levels inside and preserves outside cells', () => {
    const grid = buildCoverageGrid(lRoom, 0.5, 1.2)
    if (!grid) throw new Error('Expected a grid')

    const result = computeCoverage(grid, [
      { ...speaker, coverageHorizontalDeg: 180 },
    ])
    expect(Number.isFinite(result.values[indexOf(result, 0.5, 2.5)])).toBe(
      true,
    )
    expect(result.values[indexOf(result, 2.5, 2.5)]).toBeNaN()
  })

  it('power sums multiple speakers', () => {
    const grid = buildCoverageGrid(rectangle, 0.5, 1.2)
    if (!grid) throw new Error('Expected a grid')

    const one = computeCoverage(grid, [speaker])
    const two = computeCoverage(grid, [speaker, { ...speaker, id: 'speaker-2' }])
    const index = indexOf(grid, 2.5, 0.5)

    expect(one.values[index]).toBeCloseTo(-6.0206, 2)
    expect(two.values[index] - one.values[index]).toBeCloseTo(3.0103, 2)
  })

  it('returns no coverage when every speaker is disabled', () => {
    const grid = buildCoverageGrid(rectangle, 1, 1.2)
    if (!grid) throw new Error('Expected a grid')

    const result = computeCoverage(grid, [{ ...speaker, enabled: false }])
    expect(Array.from(result.values).every((value) => Number.isNaN(value))).toBe(
      true,
    )
  })

  it('returns null without a room', () => {
    expect(buildCoverageGrid([], 0.25, 1.2)).toBeNull()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```powershell
npm test -- tests/unit/coverage.test.ts
```

Expected: FAIL because `src/core/geometry/coverage.ts` does not exist.

- [ ] **Step 3: Write `src/core/geometry/coverage.ts`**

```ts
import { powerSumDb, splAtPoint } from '../acoustics/directField'
import type { Speaker, Vec2 } from '../types'
import { pointInPolygon, polygonBounds } from './polygon'

export interface CoverageGrid {
  minX: number
  minY: number
  spacing: number
  nx: number
  ny: number
  listenerZ: number
  /**
   * Row-major grid values. Before evaluation, inside cells are 0 and
   * outside cells are NaN. After evaluation, inside cells hold relative
   * dB SPL and outside cells stay NaN.
   */
  values: Float32Array
}

export function buildCoverageGrid(
  boundary: Vec2[],
  spacing: number,
  listenerZ: number,
): CoverageGrid | null {
  if (boundary.length < 3) return null
  if (!Number.isFinite(spacing) || spacing <= 0) {
    throw new RangeError('Coverage spacing must be a positive number.')
  }

  const bounds = polygonBounds(boundary)
  const nx = Math.max(
    2,
    Math.ceil((bounds.maxX - bounds.minX) / spacing) + 1,
  )
  const ny = Math.max(
    2,
    Math.ceil((bounds.maxY - bounds.minY) / spacing) + 1,
  )
  const values = new Float32Array(nx * ny)
  values.fill(Number.NaN)

  for (let iy = 0; iy < ny; iy++) {
    const y = bounds.minY + iy * spacing
    for (let ix = 0; ix < nx; ix++) {
      const x = bounds.minX + ix * spacing
      if (pointInPolygon({ x, y }, boundary)) {
        values[iy * nx + ix] = 0
      }
    }
  }

  return {
    minX: bounds.minX,
    minY: bounds.minY,
    spacing,
    nx,
    ny,
    listenerZ,
    values,
  }
}

export function computeCoverage(
  grid: CoverageGrid,
  speakers: readonly Speaker[],
): CoverageGrid {
  const active = speakers.filter((speaker) => speaker.enabled)
  const values = new Float32Array(grid.values.length)
  values.fill(Number.NaN)

  if (active.length === 0) {
    return { ...grid, values }
  }

  const levels: number[] = []

  for (let iy = 0; iy < grid.ny; iy++) {
    const y = grid.minY + iy * grid.spacing
    for (let ix = 0; ix < grid.nx; ix++) {
      const index = iy * grid.nx + ix
      if (Number.isNaN(grid.values[index])) continue

      const point = {
        x: grid.minX + ix * grid.spacing,
        y,
        z: grid.listenerZ,
      }
      levels.length = 0
      for (const current of active) {
        levels.push(splAtPoint(current, point))
      }
      values[index] = powerSumDb(levels)
    }
  }

  return { ...grid, values }
}

export function evaluateCoverage(
  boundary: Vec2[],
  spacing: number,
  listenerZ: number,
  speakers: readonly Speaker[],
): CoverageGrid | null {
  const grid = buildCoverageGrid(boundary, spacing, listenerZ)
  return grid ? computeCoverage(grid, speakers) : null
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```powershell
npm test -- tests/unit/coverage.test.ts
```

Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```powershell
git add src/core/geometry/coverage.ts tests/unit/coverage.test.ts
git commit -m "feat: add coverage grid generation"
```

---

## Task 12: Run coverage in a worker

**Files:**
- Create: `src/workers/previewMessages.ts`
- Create: `src/workers/preview.worker.ts`
- Test: `tests/unit/coverageStore.test.ts`
- Modify: `src/store/projectStore.ts`
- Create: `src/hooks/useCoverage.ts`
- Modify: `src/App.tsx`

- [ ] **Step 1: Write `src/workers/previewMessages.ts`**

```ts
import type { CoverageGrid } from '../core/geometry/coverage'
import type { Speaker, Vec2 } from '../core/types'

export interface PreviewRequest {
  type: 'preview'
  requestId: number
  boundary: Vec2[]
  spacing: number
  listenerZ: number
  speakers: Speaker[]
}

export interface PreviewResult {
  type: 'preview-result'
  requestId: number
  grid: CoverageGrid
  elapsedMs: number
  warnings: string[]
}

export interface PreviewError {
  type: 'preview-error'
  requestId: number
  message: string
}

export type PreviewResponse = PreviewResult | PreviewError
```

- [ ] **Step 2: Write `src/workers/preview.worker.ts`**

```ts
import { evaluateCoverage } from '../core/geometry/coverage'
import type { PreviewRequest, PreviewResponse } from './previewMessages'

interface WorkerScope {
  onmessage: ((event: MessageEvent<PreviewRequest>) => void) | null
  postMessage: (message: PreviewResponse) => void
}

// The DOM lib types `self` as Window, so narrow it to the worker surface
// we actually use. This keeps the worker compilable without mixing the
// DOM and WebWorker libs in the project.
const scope = self as unknown as WorkerScope

scope.onmessage = (event) => {
  const request = event.data
  if (!request || request.type !== 'preview') return

  const startedAt = performance.now()

  try {
    const grid = evaluateCoverage(
      request.boundary,
      request.spacing,
      request.listenerZ,
      request.speakers,
    )
    if (!grid) {
      throw new Error('Draw a room with at least three points before previewing.')
    }

    const warnings: string[] = []
    const enabled = request.speakers.filter((speaker) => speaker.enabled)
    if (enabled.length === 0) {
      warnings.push('No enabled speakers. Add a speaker to see coverage.')
    }
    if (enabled.length > 0 && !grid.values.some((value) => Number.isFinite(value))) {
      warnings.push('The coverage grid has no points inside the room.')
    }

    const response: PreviewResponse = {
      type: 'preview-result',
      requestId: request.requestId,
      grid,
      elapsedMs: performance.now() - startedAt,
      warnings,
    }
    scope.postMessage(response)
  } catch (error) {
    const response: PreviewResponse = {
      type: 'preview-error',
      requestId: request.requestId,
      message: error instanceof Error ? error.message : 'Preview failed.',
    }
    scope.postMessage(response)
  }
}
```

- [ ] **Step 3: Write the failing store test**

```ts
// tests/unit/coverageStore.test.ts
import { beforeEach, describe, expect, it } from 'vitest'
import {
  buildCoverageGrid,
  computeCoverage,
} from '../../src/core/geometry/coverage'
import { useProjectStore } from '../../src/store/projectStore'

const boundary = [
  { x: 0, y: 0 },
  { x: 4, y: 0 },
  { x: 4, y: 3 },
  { x: 0, y: 3 },
]

function makeGrid() {
  const grid = buildCoverageGrid(boundary, 1, 1.2)
  if (!grid) throw new Error('Expected a grid')
  return computeCoverage(grid, [])
}

describe('coverage state', () => {
  beforeEach(() => {
    useProjectStore.getState().reset()
  })

  it('stores the latest preview result', () => {
    const store = useProjectStore.getState()
    store.beginCoverage(1)
    store.finishCoverage(1, makeGrid(), 12, ['note'])

    const coverage = useProjectStore.getState().coverage
    expect(coverage.status).toBe('ready')
    expect(coverage.grid).not.toBeNull()
    expect(coverage.elapsedMs).toBe(12)
    expect(coverage.warnings).toEqual(['note'])
  })

  it('ignores stale results and records failures', () => {
    const store = useProjectStore.getState()
    store.beginCoverage(2)
    store.finishCoverage(1, makeGrid(), 12, [])
    expect(useProjectStore.getState().coverage.status).toBe('running')

    store.failCoverage(2, 'Worker failed')
    const coverage = useProjectStore.getState().coverage
    expect(coverage.status).toBe('error')
    expect(coverage.error).toBe('Worker failed')
  })

  it('clears coverage on reset', () => {
    useProjectStore.getState().beginCoverage(1)
    useProjectStore.getState().reset()

    const coverage = useProjectStore.getState().coverage
    expect(coverage.status).toBe('idle')
    expect(coverage.grid).toBeNull()
  })
})
```

- [ ] **Step 4: Run the test to verify it fails**

Run:

```powershell
npm test -- tests/unit/coverageStore.test.ts
```

Expected: FAIL because the coverage state and actions do not exist.

- [ ] **Step 5: Add coverage state to `src/store/projectStore.ts`**

Add the import near the top:

```ts
import type { CoverageGrid } from '../core/geometry/coverage'
```

Add these definitions before `interface ProjectState`:

```ts
export interface CoverageState {
  status: 'idle' | 'running' | 'ready' | 'error'
  grid: CoverageGrid | null
  error: string | null
  warnings: string[]
  elapsedMs: number | null
  requestId: number
}

export function createCoverageState(): CoverageState {
  return {
    status: 'idle',
    grid: null,
    error: null,
    warnings: [],
    elapsedMs: null,
    requestId: 0,
  }
}
```

Add these fields to `ProjectState`:

```ts
  coverage: CoverageState
  beginCoverage: (requestId: number) => void
  finishCoverage: (
    requestId: number,
    grid: CoverageGrid,
    elapsedMs: number,
    warnings: string[],
  ) => void
  failCoverage: (requestId: number, message: string) => void
  clearCoverage: () => void
```

Add `coverage: createCoverageState(),` next to `previewNonce: 0,` in the initial state.

Add these actions after `setCoverageSpacing`:

```ts
    beginCoverage: (requestId) =>
      set((state) => {
        state.coverage.status = 'running'
        state.coverage.error = null
        state.coverage.warnings = []
        state.coverage.elapsedMs = null
        state.coverage.requestId = requestId
      }),

    finishCoverage: (requestId, grid, elapsedMs, warnings) =>
      set((state) => {
        if (requestId !== state.coverage.requestId) return
        state.coverage.status = 'ready'
        state.coverage.grid = grid
        state.coverage.error = null
        state.coverage.warnings = warnings
        state.coverage.elapsedMs = elapsedMs
      }),

    failCoverage: (requestId, message) =>
      set((state) => {
        if (requestId !== state.coverage.requestId) return
        state.coverage.status = 'error'
        state.coverage.grid = null
        state.coverage.error = message
        state.coverage.warnings = []
        state.coverage.elapsedMs = null
      }),

    clearCoverage: () =>
      set((state) => {
        state.coverage = createCoverageState()
      }),
```

In `replaceProject`, add:

```ts
        state.coverage = createCoverageState()
```

In `reset`, add:

```ts
        state.coverage = createCoverageState()
```

- [ ] **Step 6: Run the test to verify it passes**

Run:

```powershell
npm test -- tests/unit/coverageStore.test.ts
```

Expected: PASS, 3 tests.

- [ ] **Step 7: Write `src/hooks/useCoverage.ts`**

```ts
import { useEffect, useRef } from 'react'
import { useProjectStore } from '../store/projectStore'
import type {
  PreviewRequest,
  PreviewResponse,
} from '../workers/previewMessages'

export function useCoverage() {
  const workerRef = useRef<Worker | null>(null)
  const requestIdRef = useRef(0)

  const boundary = useProjectStore((state) => state.project.room.boundary)
  const speakers = useProjectStore((state) => state.project.speakers)
  const listenerZ = useProjectStore((state) => state.project.listener.earHeight)
  const spacing = useProjectStore((state) => state.coverageSpacing)
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
    const request: PreviewRequest = {
      type: 'preview',
      requestId,
      boundary,
      spacing,
      listenerZ,
      speakers,
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
  }, [boundary, speakers, listenerZ, spacing, previewNonce])
}
```

- [ ] **Step 8: Wire the worker into `src/App.tsx`**

```tsx
import { useCoverage } from './hooks/useCoverage'
```

Call it inside `App`, next to the view-mode selector:

```tsx
  const viewMode = useProjectStore((state) => state.viewMode)
  useCoverage()
```

- [ ] **Step 9: Verify tests, types, and build**

Run:

```powershell
npm test -- tests/unit/coverageStore.test.ts tests/unit/coverage.test.ts tests/unit/directField.test.ts
npm run typecheck
npm run build
```

Expected: all pass. If the worker file fails typechecking, keep the `WorkerScope` cast and do not add the WebWorker lib alongside the DOM lib.

- [ ] **Step 10: Commit**

```powershell
git add src/workers/previewMessages.ts src/workers/preview.worker.ts src/hooks/useCoverage.ts src/store/projectStore.ts tests/unit/coverageStore.test.ts src/App.tsx
git commit -m "feat: compute coverage in a web worker"
```

---

## Task 13: Add heatmap utilities

**Files:**
- Create: `src/lib/heatmap.ts`
- Test: `tests/unit/heatmap.test.ts`
- Create: `src/hooks/useCoverageHeatmap.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/heatmap.test.ts
import { describe, expect, it } from 'vitest'
import {
  buildCoverageRgba,
  colorForDb,
  computeCoverageStats,
} from '../../src/lib/heatmap'
import type { CoverageGrid } from '../../src/core/geometry/coverage'

describe('heatmap helpers', () => {
  it('computes stats while ignoring NaN cells', () => {
    const stats = computeCoverageStats(
      new Float32Array([Number.NaN, -10, -20, -10]),
    )
    expect(stats).not.toBeNull()
    if (!stats) throw new Error('Expected stats')

    expect(stats.count).toBe(3)
    expect(stats.minDb).toBe(-20)
    expect(stats.maxDb).toBe(-10)
    expect(stats.meanDb).toBeCloseTo(-13.333, 3)
    expect(stats.stdDevDb).toBeCloseTo(4.714, 3)
  })

  it('returns null when no cell has a level', () => {
    expect(
      computeCoverageStats(
        new Float32Array([Number.NaN, Number.NaN]),
      ),
    ).toBeNull()
  })

  it('maps levels into viridis with transparent outside cells', () => {
    expect(colorForDb(Number.NaN, -30, 0)[3]).toBe(0)

    const low = colorForDb(-60, -30, 0)
    const high = colorForDb(10, -30, 0)
    expect(low[3]).toBe(210)
    expect(high[3]).toBe(210)
    expect(high[0]).toBeGreaterThan(low[0])
  })

  it('builds RGBA data with transparent outside cells', () => {
    const grid: CoverageGrid = {
      minX: 0,
      minY: 0,
      spacing: 1,
      nx: 2,
      ny: 1,
      listenerZ: 1.2,
      values: new Float32Array([0, Number.NaN]),
    }

    const rgba = buildCoverageRgba(grid)
    expect(rgba).toHaveLength(8)
    expect(rgba[3]).toBe(210)
    expect(rgba[7]).toBe(0)
  })

  it('flips rows for image consumers when asked', () => {
    const grid: CoverageGrid = {
      minX: 0,
      minY: 0,
      spacing: 1,
      nx: 1,
      ny: 2,
      listenerZ: 1.2,
      values: new Float32Array([0, Number.NaN]),
    }

    const normal = buildCoverageRgba(grid)
    const flipped = buildCoverageRgba(grid, -30, 0, true)
    expect(normal[3]).toBe(210)
    expect(normal[7]).toBe(0)
    expect(flipped[3]).toBe(0)
    expect(flipped[7]).toBe(210)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```powershell
npm test -- tests/unit/heatmap.test.ts
```

Expected: FAIL because `src/lib/heatmap.ts` does not exist.

- [ ] **Step 3: Write `src/lib/heatmap.ts`**

```ts
import type { CoverageGrid } from '../core/geometry/coverage'
import { clamp } from './math'

export const DEFAULT_HEATMAP_MIN_DB = -30
export const DEFAULT_HEATMAP_MAX_DB = 0

export interface CoverageStats {
  minDb: number
  maxDb: number
  meanDb: number
  stdDevDb: number
  count: number
}

// Viridis sample points. Interpolated at runtime so the heatmap stays
// colorblind-safe without pulling in a color-scale dependency.
const VIRIDIS_STOPS = [
  [68, 1, 84],
  [72, 40, 120],
  [62, 73, 137],
  [49, 104, 142],
  [38, 130, 142],
  [31, 158, 137],
  [53, 183, 121],
  [109, 205, 89],
  [180, 222, 44],
  [253, 231, 37],
] as const

export function viridisColor(t: number): [number, number, number] {
  const scaled = clamp(t, 0, 1) * (VIRIDIS_STOPS.length - 1)
  const index = Math.min(
    Math.floor(scaled),
    VIRIDIS_STOPS.length - 2,
  )
  const fraction = scaled - index
  const from = VIRIDIS_STOPS[index]
  const to = VIRIDIS_STOPS[index + 1]

  return [
    Math.round(from[0] + (to[0] - from[0]) * fraction),
    Math.round(from[1] + (to[1] - from[1]) * fraction),
    Math.round(from[2] + (to[2] - from[2]) * fraction),
  ]
}

export function colorForDb(
  valueDb: number,
  minDb: number,
  maxDb: number,
): [number, number, number, number] {
  if (!Number.isFinite(valueDb)) return [0, 0, 0, 0]

  const span = Math.max(maxDb - minDb, 0.001)
  const [red, green, blue] = viridisColor((valueDb - minDb) / span)
  return [red, green, blue, 210]
}

export function computeCoverageStats(
  values: ArrayLike<number>,
): CoverageStats | null {
  let count = 0
  let minDb = Infinity
  let maxDb = -Infinity
  let sum = 0
  let sumSquares = 0

  for (let index = 0; index < values.length; index++) {
    const value = values[index]
    if (!Number.isFinite(value)) continue

    count += 1
    minDb = Math.min(minDb, value)
    maxDb = Math.max(maxDb, value)
    sum += value
    sumSquares += value * value
  }

  if (count === 0) return null

  const meanDb = sum / count
  const variance = Math.max(sumSquares / count - meanDb * meanDb, 0)
  return {
    minDb,
    maxDb,
    meanDb,
    stdDevDb: Math.sqrt(variance),
    count,
  }
}

/**
 * Row-major RGBA pixels. Pass `flipY` for canvas/images, whose first row
 * is the top of the image. DataTexture consumers keep the natural order.
 */
export function buildCoverageRgba(
  grid: CoverageGrid,
  minDb = DEFAULT_HEATMAP_MIN_DB,
  maxDb = DEFAULT_HEATMAP_MAX_DB,
  flipY = false,
): Uint8ClampedArray {
  const rgba = new Uint8ClampedArray(grid.nx * grid.ny * 4)

  for (let row = 0; row < grid.ny; row++) {
    const sourceRow = flipY ? grid.ny - 1 - row : row
    for (let column = 0; column < grid.nx; column++) {
      const source = sourceRow * grid.nx + column
      const target = (row * grid.nx + column) * 4
      const [red, green, blue, alpha] = colorForDb(
        grid.values[source],
        minDb,
        maxDb,
      )
      rgba[target] = red
      rgba[target + 1] = green
      rgba[target + 2] = blue
      rgba[target + 3] = alpha
    }
  }

  return rgba
}

export function buildCoverageDataUrl(
  grid: CoverageGrid,
  minDb = DEFAULT_HEATMAP_MIN_DB,
  maxDb = DEFAULT_HEATMAP_MAX_DB,
): string | null {
  if (typeof document === 'undefined') return null

  const canvas = document.createElement('canvas')
  canvas.width = grid.nx
  canvas.height = grid.ny
  const context = canvas.getContext('2d')
  if (!context) return null

  const image = context.createImageData(grid.nx, grid.ny)
  image.data.set(buildCoverageRgba(grid, minDb, maxDb, true))
  context.putImageData(image, 0, 0)
  return canvas.toDataURL('image/png')
}

export function heatmapGradientCss(): string {
  const stops = Array.from({ length: 12 }, (_, index) => {
    const [red, green, blue] = viridisColor(index / 11)
    return `rgb(${red}, ${green}, ${blue}) ${((index / 11) * 100).toFixed(0)}%`
  })
  return `linear-gradient(90deg, ${stops.join(', ')})`
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```powershell
npm test -- tests/unit/heatmap.test.ts
```

Expected: PASS, 5 tests.

- [ ] **Step 5: Write `src/hooks/useCoverageHeatmap.ts`**

```ts
import { useMemo } from 'react'
import {
  DEFAULT_HEATMAP_MAX_DB,
  DEFAULT_HEATMAP_MIN_DB,
  buildCoverageRgba,
  computeCoverageStats,
  heatmapGradientCss,
} from '../lib/heatmap'
import { useProjectStore } from '../store/projectStore'

export function useCoverageHeatmap() {
  const grid = useProjectStore((state) => state.coverage.grid)
  const status = useProjectStore((state) => state.coverage.status)

  const stats = useMemo(
    () => (grid ? computeCoverageStats(grid.values) : null),
    [grid],
  )
  const rgba = useMemo(
    () => (grid ? buildCoverageRgba(grid) : null),
    [grid],
  )
  const gradientCss = useMemo(() => heatmapGradientCss(), [])

  return {
    grid,
    status,
    stats,
    rgba,
    minDb: DEFAULT_HEATMAP_MIN_DB,
    maxDb: DEFAULT_HEATMAP_MAX_DB,
    gradientCss,
  }
}
```

- [ ] **Step 6: Commit**

```powershell
git add src/lib/heatmap.ts src/hooks/useCoverageHeatmap.ts tests/unit/heatmap.test.ts
git commit -m "feat: add coverage heatmap utilities"
```

---

## Task 14: Draw coverage overlays and results

**Files:**
- Create: `src/components/layout/ResultsPanel.tsx`
- Test: `tests/unit/results.test.tsx`
- Create: `src/components/viewport/CoverageOverlay2D.tsx`
- Create: `src/components/viewport/CoveragePlane3D.tsx`
- Modify: `src/components/viewport/Viewport2D.tsx`
- Modify: `src/components/viewport/Viewport3D.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Write the failing results test**

```tsx
// tests/unit/results.test.tsx
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { ResultsPanel } from '../../src/components/layout/ResultsPanel'
import {
  buildCoverageGrid,
  computeCoverage,
} from '../../src/core/geometry/coverage'
import type { Speaker } from '../../src/core/types'
import { useProjectStore } from '../../src/store/projectStore'

const boundary = [
  { x: 0, y: 0 },
  { x: 4, y: 0 },
  { x: 4, y: 3 },
  { x: 0, y: 3 },
]

const speaker: Speaker = {
  id: 'speaker-1',
  name: 'Speaker 1',
  position: { x: 0.5, y: 0.5, z: 1.2 },
  yawDeg: 180,
  gainDb: 0,
  coverageHorizontalDeg: 180,
  radiatorDiameterM: 0.13,
  enabled: true,
}

describe('ResultsPanel', () => {
  beforeEach(() => {
    useProjectStore.getState().reset()
  })

  it('shows coverage statistics after a result', () => {
    const grid = buildCoverageGrid(boundary, 0.5, 1.2)
    if (!grid) throw new Error('Expected a grid')

    const store = useProjectStore.getState()
    store.beginCoverage(1)
    store.finishCoverage(1, computeCoverage(grid, [speaker]), 12, [])

    render(<ResultsPanel />)

    expect(screen.getByTestId('coverage-status')).toHaveTextContent('Ready')
    expect(screen.getByTestId('coverage-points')).not.toHaveTextContent('—')
    expect(screen.getByTestId('coverage-min')).not.toHaveTextContent('—')
  })

  it('shows the error state', () => {
    const store = useProjectStore.getState()
    store.beginCoverage(2)
    store.failCoverage(2, 'Worker failed')

    render(<ResultsPanel />)

    expect(screen.getByTestId('coverage-status')).toHaveTextContent('Error')
    expect(screen.getByText('Worker failed')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```powershell
npm test -- tests/unit/results.test.tsx
```

Expected: FAIL because `ResultsPanel` does not exist.

- [ ] **Step 3: Write `src/components/layout/ResultsPanel.tsx`**

```tsx
import { Headphones, RefreshCw } from 'lucide-react'
import { powerSumDb, splAtPoint } from '../../core/acoustics/directField'
import { useCoverageHeatmap } from '../../hooks/useCoverageHeatmap'
import { useProjectStore } from '../../store/projectStore'

function formatDb(value: number | undefined, digits = 1): string {
  return value === undefined || !Number.isFinite(value)
    ? '—'
    : `${value.toFixed(digits)} dB`
}

interface StatProps {
  label: string
  value: string
  testId: string
}

function Stat({ label, value, testId }: StatProps) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div data-testid={testId} className="font-mono text-sm text-slate-100">
        {value}
      </div>
    </div>
  )
}

export function ResultsPanel() {
  const { status, stats, gradientCss, minDb, maxDb } = useCoverageHeatmap()
  const coverage = useProjectStore((state) => state.coverage)
  const speakers = useProjectStore((state) => state.project.speakers)
  const listener = useProjectStore((state) => state.project.listener)
  const bumpPreview = useProjectStore((state) => state.bumpPreview)

  const enabledSpeakers = speakers.filter((speaker) => speaker.enabled)
  const listenerLevel =
    enabledSpeakers.length > 0
      ? powerSumDb(
          enabledSpeakers.map((speaker) =>
            splAtPoint(speaker, {
              x: listener.position.x,
              y: listener.position.y,
              z: listener.earHeight,
            }),
          ),
        )
      : undefined

  const statusLabel =
    status === 'running'
      ? 'Computing…'
      : status === 'ready'
        ? 'Ready'
        : status === 'error'
          ? 'Error'
          : 'Waiting for a room'
  const statusTone =
    status === 'error'
      ? 'text-rose-400'
      : status === 'ready'
        ? 'text-emerald-400'
        : 'text-slate-400'

  return (
    <footer
      data-testid="results-panel"
      className="flex h-40 shrink-0 gap-8 overflow-hidden border-t border-slate-800 px-4 py-3"
    >
      <section className="w-56 shrink-0 space-y-1">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Preview
        </h2>
        <div className="flex items-center gap-2">
          <span
            data-testid="coverage-status"
            className={`text-xs font-medium ${statusTone}`}
          >
            {statusLabel}
          </span>
          <button
            data-testid="recompute"
            className="ml-auto flex items-center gap-1 rounded border border-slate-700 px-2 py-1 text-[11px] text-slate-300 hover:bg-slate-800"
            onClick={bumpPreview}
          >
            <RefreshCw size={12} />
            Recompute
          </button>
        </div>
        <div className="text-[11px] text-slate-500">
          {coverage.elapsedMs !== null
            ? `${coverage.elapsedMs.toFixed(0)} ms`
            : 'Direct-field preview'}
        </div>
        <div className="max-h-14 space-y-1 overflow-y-auto">
          {coverage.warnings.map((warning) => (
            <div key={warning} className="text-[11px] text-amber-300">
              {warning}
            </div>
          ))}
          {coverage.error && (
            <div className="text-[11px] text-rose-400">{coverage.error}</div>
          )}
        </div>
      </section>

      <section className="min-w-0 flex-1">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Coverage
        </h2>
        <div className="grid grid-cols-4 gap-4">
          <Stat
            label="Minimum"
            value={formatDb(stats?.minDb)}
            testId="coverage-min"
          />
          <Stat
            label="Mean"
            value={formatDb(stats?.meanDb)}
            testId="coverage-mean"
          />
          <Stat
            label="Maximum"
            value={formatDb(stats?.maxDb)}
            testId="coverage-max"
          />
          <Stat
            label="Std dev"
            value={formatDb(stats?.stdDevDb)}
            testId="coverage-stddev"
          />
        </div>
        <div className="mt-3 flex items-center gap-4 text-[11px] text-slate-500">
          <span>
            Points <span data-testid="coverage-points">{stats?.count ?? '—'}</span>
          </span>
          <span>Relative dB · direct field only</span>
        </div>
      </section>

      <section className="w-64 shrink-0">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Level
        </h2>
        <div
          className="h-3 rounded ring-1 ring-slate-700"
          style={{ background: gradientCss }}
        />
        <div className="mt-1 flex justify-between text-[10px] text-slate-500">
          <span>{minDb} dB</span>
          <span>{maxDb} dB</span>
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
          <Headphones size={14} />
          Listener
          <span
            data-testid="listener-level"
            className="ml-auto font-mono text-slate-100"
          >
            {formatDb(listenerLevel)}
          </span>
        </div>
      </section>
    </footer>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```powershell
npm test -- tests/unit/results.test.tsx
```

Expected: PASS, 2 tests.

- [ ] **Step 5: Write `src/components/viewport/CoverageOverlay2D.tsx`**

```tsx
import { useMemo } from 'react'
import { useCoverageHeatmap } from '../../hooks/useCoverageHeatmap'
import { buildCoverageDataUrl } from '../../lib/heatmap'

export function CoverageOverlay2D() {
  const { grid, minDb, maxDb } = useCoverageHeatmap()
  const imageUrl = useMemo(
    () =>
      grid ? buildCoverageDataUrl(grid, minDb, maxDb) : null,
    [grid, minDb, maxDb],
  )

  if (!grid || !imageUrl) return null

  const width = (grid.nx - 1) * grid.spacing
  const height = (grid.ny - 1) * grid.spacing

  return (
    <image
      data-testid="coverage-overlay-2d"
      href={imageUrl}
      x={grid.minX}
      y={-(grid.minY + height)}
      width={width}
      height={height}
      opacity={0.72}
      preserveAspectRatio="none"
      style={{ pointerEvents: 'none' }}
    />
  )
}
```

- [ ] **Step 6: Write `src/components/viewport/CoveragePlane3D.tsx`**

```tsx
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useCoverageHeatmap } from '../../hooks/useCoverageHeatmap'

export function CoveragePlane3D() {
  const { grid, rgba } = useCoverageHeatmap()
  const textureRef = useRef<THREE.DataTexture | null>(null)

  const texture = useMemo(() => {
    if (!grid || !rgba) return null
    const next = new THREE.DataTexture(
      rgba,
      grid.nx,
      grid.ny,
      THREE.RGBAFormat,
    )
    next.needsUpdate = true
    next.magFilter = THREE.LinearFilter
    next.minFilter = THREE.LinearFilter
    next.colorSpace = THREE.SRGBColorSpace
    return next
  }, [grid, rgba])

  useEffect(() => {
    const previous = textureRef.current
    textureRef.current = texture
    if (previous && previous !== texture) previous.dispose()
  }, [texture])

  if (!grid || !texture) return null

  const width = Math.max((grid.nx - 1) * grid.spacing, grid.spacing)
  const height = Math.max((grid.ny - 1) * grid.spacing, grid.spacing)

  return (
    <mesh
      position={[
        grid.minX + width / 2,
        grid.minY + height / 2,
        grid.listenerZ,
      ]}
    >
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={0.78}
        side={THREE.DoubleSide}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  )
}
```

- [ ] **Step 7: Add the 2D overlay to `Viewport2D`**

Add the import:

```tsx
import { CoverageOverlay2D } from './CoverageOverlay2D'
```

Render it after `{gridLines}`, before the room polygon:

```tsx
        {gridLines}
        <CoverageOverlay2D />
```

- [ ] **Step 8: Add the 3D plane to `Viewport3D`**

Add the import:

```tsx
import { CoveragePlane3D } from './CoveragePlane3D'
```

Render it after `<RoomMesh />`, before the speaker and listener markers:

```tsx
        <RoomMesh />
        <CoveragePlane3D />
```

- [ ] **Step 9: Replace the footer in `App.tsx`**

Replace `<footer className="h-40 border-t border-slate-800" />` with `<ResultsPanel />`, and add:

```tsx
import { ResultsPanel } from './components/layout/ResultsPanel'
```

- [ ] **Step 10: Verify tests, types, and build**

Run:

```powershell
npm test -- tests/unit/results.test.tsx
npm run typecheck
npm run build
```

Expected: all pass.

- [ ] **Step 11: Manual smoke test**

Run `npm run dev`, then:

1. Draw a 4 m × 3 m room.
2. Add a speaker and set its yaw so it faces into the room.
3. Add a listener.
4. Confirm the heatmap appears in 2D and the stats populate.
5. Move the speaker and confirm the heatmap follows it.
6. Switch to 3D and confirm the translucent plane sits at ear height.

- [ ] **Step 12: Commit**

```powershell
git add src/components/layout/ResultsPanel.tsx src/components/viewport/CoverageOverlay2D.tsx src/components/viewport/CoveragePlane3D.tsx src/components/viewport/Viewport2D.tsx src/components/viewport/Viewport3D.tsx src/App.tsx tests/unit/results.test.tsx
git commit -m "feat: render coverage heatmaps and results"
```

---

## Task 15: Persist the project locally

**Files:**
- Create: `src/lib/persistence.ts`
- Test: `tests/unit/persistence.test.ts`
- Create: `src/hooks/useProjectPersistence.ts`
- Modify: `src/components/layout/TopBar.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/persistence.test.ts
import { beforeEach, describe, expect, it } from 'vitest'
import {
  STORAGE_KEY,
  loadPersistedProject,
  savePersistedProject,
} from '../../src/lib/persistence'
import { createDefaultProject } from '../../src/store/projectStore'

describe('project persistence', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('round-trips a project and the grid spacing', () => {
    const project = createDefaultProject()
    project.name = 'Studio A'
    project.room.boundary = [
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 4, y: 3 },
      { x: 0, y: 3 },
    ]

    expect(
      savePersistedProject({ project, coverageSpacing: 0.5 }),
    ).toBe(true)

    const loaded = loadPersistedProject()
    expect(loaded?.project.name).toBe('Studio A')
    expect(loaded?.project.room.boundary).toHaveLength(4)
    expect(loaded?.coverageSpacing).toBe(0.5)
  })

  it('returns null for malformed JSON', () => {
    localStorage.setItem(STORAGE_KEY, '{not json')
    expect(loadPersistedProject()).toBeNull()
  })

  it('rejects an invalid project', () => {
    const project = createDefaultProject()
    project.room.height = -1
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ project, coverageSpacing: 0.25 }),
    )
    expect(loadPersistedProject()).toBeNull()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```powershell
npm test -- tests/unit/persistence.test.ts
```

Expected: FAIL because `src/lib/persistence.ts` does not exist.

- [ ] **Step 3: Write `src/lib/persistence.ts`**

```ts
import { z } from 'zod'
import type { Project } from '../core/types'

const vec2Schema = z.object({
  x: z.number(),
  y: z.number(),
})

const vec3Schema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
})

const roomSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  boundary: z.array(vec2Schema),
  height: z.number().positive(),
  wallThickness: z.number().positive(),
})

const speakerSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  position: vec3Schema,
  yawDeg: z.number(),
  gainDb: z.number(),
  coverageHorizontalDeg: z.number().min(1).max(360),
  radiatorDiameterM: z.number().positive(),
  enabled: z.boolean(),
})

const listenerSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  position: vec2Schema,
  earHeight: z.number().positive(),
})

export const projectSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().min(1),
  name: z.string(),
  room: roomSchema,
  speakers: z.array(speakerSchema),
  listener: listenerSchema,
})

export const persistedProjectSchema = z.object({
  project: projectSchema,
  coverageSpacing: z.number().min(0.05).max(2),
})

export interface PersistedProject {
  project: Project
  coverageSpacing: number
}

export const STORAGE_KEY = 'room-response-studio:project:v1'

export function savePersistedProject(value: PersistedProject): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export function loadPersistedProject(): PersistedProject | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const parsed = persistedProjectSchema.safeParse(JSON.parse(raw))
    if (!parsed.success) return null

    return {
      project: parsed.data.project,
      coverageSpacing: parsed.data.coverageSpacing,
    }
  } catch {
    return null
  }
}

export function clearPersistedProject(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Storage can be unavailable in private browsing; persistence is optional.
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```powershell
npm test -- tests/unit/persistence.test.ts
```

Expected: PASS, 3 tests.

- [ ] **Step 5: Write `src/hooks/useProjectPersistence.ts`**

```ts
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
```

- [ ] **Step 6: Update `src/components/layout/TopBar.tsx`**

Add the import and props:

```tsx
import type { PersistenceStatus } from '../../hooks/useProjectPersistence'

interface TopBarProps {
  persistenceStatus?: PersistenceStatus
}
```

Change the component signature:

```tsx
export function TopBar({ persistenceStatus = 'saved' }: TopBarProps) {
```

Add this chip before the `New` button:

```tsx
      <span
        data-testid="persistence-status"
        className={`text-[11px] ${
          persistenceStatus === 'error' ? 'text-rose-400' : 'text-slate-500'
        }`}
      >
        {persistenceStatus === 'loading'
          ? 'Loading…'
          : persistenceStatus === 'saving'
            ? 'Saving…'
            : persistenceStatus === 'error'
              ? 'Save failed'
              : 'Saved'}
      </span>
```

- [ ] **Step 7: Wire persistence into `src/App.tsx`**

The final App should look like this:

```tsx
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
```

- [ ] **Step 8: Verify tests, types, and build**

Run:

```powershell
npm test -- tests/unit/persistence.test.ts
npm run typecheck
npm run build
```

Expected: all pass.

- [ ] **Step 9: Manual persistence check**

Run `npm run dev`, draw a room, add a speaker, wait for the header to show `Saved`, then reload. Expected: the room, speaker, listener, and grid spacing come back, and the coverage preview recomputes.

- [ ] **Step 10: Commit**

```powershell
git add src/lib/persistence.ts src/hooks/useProjectPersistence.ts src/components/layout/TopBar.tsx src/App.tsx tests/unit/persistence.test.ts
git commit -m "feat: persist the project in local storage"
```

---

## Task 16: Add the end-to-end flow

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/e2e/prototype.spec.ts`

- [ ] **Step 1: Write `playwright.config.ts`**

```ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  timeout: 60_000,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev -- --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
```

- [ ] **Step 2: Write `tests/e2e/prototype.spec.ts`**

```ts
import { expect, test, type Page } from '@playwright/test'

// Map world coordinates through the SVG's current screen CTM. This
// respects the viewBox and any letterboxing from preserveAspectRatio.
async function clickWorld(page: Page, x: number, y: number) {
  const svg = page.getByTestId('viewport-2d')
  const point = await svg.evaluate(
    (element, world) => {
      const node = element as SVGSVGElement
      const svgPoint = node.createSVGPoint()
      svgPoint.x = world.x
      svgPoint.y = -world.y
      const matrix = node.getScreenCTM()
      if (!matrix) throw new Error('The 2D viewport has no screen matrix')
      const screen = svgPoint.matrixTransform(matrix)
      return { x: screen.x, y: screen.y }
    },
    { x, y },
  )
  await page.mouse.click(point.x, point.y)
}

test('draws a room, previews coverage, and restores the project', async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('e2e-seeded')) {
      localStorage.clear()
      sessionStorage.setItem('e2e-seeded', '1')
    }
  })
  await page.goto('/')

  await clickWorld(page, 0, 0)
  await clickWorld(page, 4, 0)
  await clickWorld(page, 4, 3)
  await clickWorld(page, 0, 3)
  await page.keyboard.press('Enter')

  await expect(page.getByTestId('room-status')).toContainText(
    'Room: 4 vertices',
  )

  await page.getByTestId('tool-speaker').click()
  await clickWorld(page, 2, 0.5)
  await page.getByLabel('Yaw').fill('180')

  await page.getByTestId('tool-listener').click()
  await clickWorld(page, 2, 2)

  await expect(page.getByTestId('coverage-status')).toHaveText('Ready', {
    timeout: 15_000,
  })
  await expect(page.getByTestId('coverage-points')).not.toHaveText('—')

  await page.getByTestId('view-3d').click()
  await expect(page.getByTestId('viewport-3d')).toBeVisible()

  await expect(page.getByTestId('persistence-status')).toHaveText('Saved', {
    timeout: 10_000,
  })
  await page.reload()

  await expect(page.getByTestId('room-status')).toContainText(
    'Room: 4 vertices',
  )
  await expect(page.getByTestId('coverage-status')).toHaveText('Ready', {
    timeout: 15_000,
  })
})
```

- [ ] **Step 3: Install the browser**

Run:

```powershell
npx playwright install chromium
```

Expected: Chromium downloads or reports that it is already installed.

- [ ] **Step 4: Run the end-to-end test**

Run:

```powershell
npm run test:e2e
```

Expected: 1 passed. If the click coordinates miss the SVG, confirm the initial `viewBox` in `Viewport2D` still matches `{ x: -2, y: -8, w: 12, h: 10 }`.

- [ ] **Step 5: Commit**

```powershell
git add playwright.config.ts tests/e2e/prototype.spec.ts
git commit -m "test: add phase 0 end-to-end flow"
```

---

## Task 17: Document and verify the prototype

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write `README.md`**

```md
# Room Response Studio

A browser prototype for sketching a room, placing speakers, and previewing
direct-field coverage. It is the Phase 0 foundation for a room-response
planner that will later add object extrusion, first-order reflections, room
modes, RT60, and a full frequency-response solver.

## What works in this prototype

- Draw a polygonal room in the 2D top view.
- Extrude the room to a 3D view with translucent walls.
- Place full-range speakers and a listener.
- Set speaker gain, acoustic height, yaw, and nominal coverage angle.
- Compute a direct-field coverage heatmap on a configurable grid.
- Inspect minimum, mean, maximum, and standard deviation of coverage.
- Compare placements manually by moving a speaker and watching the map.
- Persist the single project and grid spacing in `localStorage`.

## Run

```powershell
npm install
npm run dev
```

Open the URL printed by Vite.

## Controls

- **Room tool**: click points, then press `Enter` to close the polygon.
- **Speaker / Listener tools**: click in the 2D view to place.
- **Pan**: middle-drag, or hold `Shift` and drag.
- **Zoom**: mouse wheel.
- **Cancel**: `Esc`.

## Test

```powershell
npm test
npm run typecheck
npm run build
```

End-to-end tests need Chromium once:

```powershell
npx playwright install chromium
npm run test:e2e
```

## How it works

- `src/core/acoustics/directivity.ts` models a smooth coverage-angle
  pattern whose nominal angle is the -6 dB beamwidth.
- `src/core/acoustics/directField.ts` computes relative SPL with the
  inverse-square law and incoherent power summation.
- `src/core/geometry/coverage.ts` builds a row-major grid over the room
  bounds and marks cells outside the polygon as `NaN`.
- `src/workers/preview.worker.ts` runs the grid evaluation off the main
  thread behind the typed contract in `previewMessages.ts`.
- `src/lib/heatmap.ts` maps levels to a colorblind-safe viridis ramp and
  produces RGBA data for the 2D and 3D overlays.

## Phase 0 limits

- Direct field only. No reflections, room modes, diffuse field, or RT60.
- Horizontal coverage only. Elevation, piston directivity, ports, EQ,
  phase, delay, and polarity are Phase 1 features.
- Geometry is a single extruded room polygon. Objects, booleans, and
  imported assets are not implemented.
- Levels are relative dB, not calibrated absolute SPL.
- One project is persisted locally. There is no project browser, backend,
  account, export, auralization, or optimizer yet.
- The worker contract is ready for a Rust/WASM solver, but the worker still
  runs the TypeScript reference solver.

## Next

1. Replace the worker internals with a Rust/WASM solver behind the same
   request/response types.
2. Add first-order image-source reflections and shoebox modes.
3. Add object sketching and extrusion with robust booleans.
4. Add multiple speaker models, ports, EQ, delay, phase, and polarity.
5. Add frequency-response charts and manual A/B snapshots.
```

- [ ] **Step 2: Run the full unit suite**

Run:

```powershell
npm test
```

Expected: all unit tests pass. No worker or canvas tests are skipped silently; canvas rendering is covered by the E2E flow.

- [ ] **Step 3: Run the static checks and production build**

Run:

```powershell
npm run typecheck
npm run build
```

Expected: TypeScript reports no errors and Vite writes `dist/`.

- [ ] **Step 4: Run the end-to-end flow**

Run:

```powershell
npm run test:e2e
```

Expected: 1 passed.

- [ ] **Step 5: Manual acceptance checklist**

Start `npm run dev` and confirm:

1. The app opens with a polished dark layout and the room tool active.
2. Four clicks plus `Enter` create a closed room.
3. A speaker placed near one wall shows a coverage lobe facing its yaw.
4. Changing yaw or gain changes the heatmap without a page reload.
5. The listener marker and listener level stay consistent with the grid.
6. The 3D view shows the room, speaker, listener, and coverage plane at ear height.
7. Reloading restores the project after the header shows `Saved`.
8. The results panel shows `Ready`, point count, stats, and a legend.

- [ ] **Step 6: Commit**

```powershell
git add README.md
git commit -m "docs: add phase 0 readme and verification notes"
```

---

## Phase 0 done criteria

- `npm test`, `npm run typecheck`, `npm run build`, and `npm run test:e2e` all pass.
- A new user can draw a room, place a speaker and listener, see a coverage heatmap, and understand the stats without reading source code.
- The worker contract is typed and isolated so Phase 1 can swap in Rust/WASM without touching the UI.
- The README states the Phase 0 limits clearly enough that relative dB, horizontal-only directivity, and direct-field-only results are not mistaken for a full acoustic prediction.
