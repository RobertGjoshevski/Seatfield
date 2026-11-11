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
