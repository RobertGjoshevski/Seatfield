# Room Response Studio — v1 Design Spec

**Status:** Approved for planning  
**Date:** 2026-11-11  
**Working title:** Room Response Studio  
**Project location:** `C:\Users\Robert\source\repos\room-response-studio`

---

## 1. Summary

Room Response Studio is a desktop-first, local-first web application for sketching a room or open space, extruding objects, placing one or more speakers, and comparing predicted acoustic behavior.

The core loop is:

> **Draw → extrude → place → simulate → compare.**

The product is designed to answer a practical question:

> “Where should these speakers go, and why?”

It is not a certification or measurement-grade prediction tool. It is a design and comparison tool. Relative differences between placements are the primary output; absolute predictions are estimates and are labeled with a confidence level.

---

## 2. Problem and opportunity

Existing room-acoustics tools tend to fall into two camps:

1. **Measurement tools** such as REW — excellent for measuring a real room, but not for designing a layout before furniture and speakers are in place.
2. **Professional simulation tools** such as EASE, ODEON, and CATT — powerful, but complex, desktop-bound, and expensive for a quick placement decision.

There is a gap for a tool that is:

- Fast enough to iterate on speaker placement in minutes.
- Visual enough to understand without an acoustics degree.
- Honest enough to show its assumptions.
- Accessible from a browser with no installation.
- Useful for both small rooms (studio, home theater) and open/PA spaces.

Room Response Studio fills that gap by combining a deliberately simple 2.5D sketcher with a hybrid acoustic engine and a comparison-first workflow.

---

## 3. Goals and non-goals

### 3.1 Goals

- Let a user draw a room or open space in 2D, extrude it to 3D, and add objects without learning a full CAD tool.
- Let a user sketch objects on top, front, and side planes; extrude them; name them; combine them into a single object.
- Let a user place multiple speakers, define their box dimensions, front face, port face, frequency response, delay, phase, gain, polarity, and directivity.
- Predict frequency response at listener positions and coverage over a listening area.
- Predict room modes for rectangular rooms and clearly label approximate behavior for arbitrary rooms.
- Predict RT60 and diffuse-field behavior for enclosed rooms.
- Support open spaces with no walls, including ground reflection and directivity-driven coverage.
- Support A/B scenario comparison so the user can evaluate speaker placements.
- Run entirely in a modern desktop browser with local project storage and no account requirement.

### 3.2 Non-goals for v1

- Full-wave simulation (FEM/BEM/FDTD) across the audible band.
- Higher-order beam tracing or full ray-traced impulse responses.
- Measured polar/CLF speaker-data import.
- Automatic speaker-position optimization.
- Multi-room sound transmission through walls.
- Real-time collaboration or cloud accounts.
- Mobile-first UX or phone support.
- HRTF/binaural auralization.
- Certification, legal, or safety-critical use.
- Photorealistic rendering or architectural visualization.

### 3.3 Assumptions

- The primary device is a desktop or laptop with a mouse and keyboard.
- The browser supports WebGL2 and WebAssembly. Latest two versions of Chrome, Edge, Firefox, and Safari are targeted.
- The user has a basic understanding of speaker placement or is willing to follow templates and guidance.
- Projects are stored locally in the browser. Export/import is the sharing mechanism in v1.
- The room is a single enclosed volume or a single open space. Adjacent rooms are out of scope.
- The speed of sound, air absorption, and material absorption are modeled with standard engineering approximations, not measured on site.

---

## 4. Target users and scenarios

### 4.1 Persona A — Studio owner / home-theater enthusiast

- Wants to place monitors and a subwoofer in a small rectangular room.
- Cares about bass peaks/nulls, SBIR, speaker-boundary interference, and seat-to-seat consistency.
- May have REW measurements but wants to design before measuring.
- Values clear visuals and plain-language explanations more than raw simulation settings.

### 4.2 Persona B — AV installer / small PA provider

- Wants to check coverage in a conference room, house of worship, club, or outdoor space.
- Cares about directivity, aim, SPL uniformity, and overlap between speakers.
- Needs a quick client-facing visual and a report later.
- May not have detailed speaker polar data; presets are acceptable for a first pass.

### 4.3 Primary scenarios

1. **Small-room speaker placement** — draw a 5 × 4 × 3 m room, add a desk and a column, place two monitors and a sub, compare two sub positions, inspect modes and seat-to-seat variance.
2. **Open-space coverage** — define an outdoor area with a ground plane, place two full-range PA speakers, aim them, and inspect coverage uniformity at standing height.
3. **Object interaction** — add a large desk, a soffit, and a freestanding acoustic panel; union the desk and soffit; see how the objects change early reflections and coverage.
4. **Port and phase experiment** — move a subwoofer’s port face toward a wall, change tuning and polarity, and observe the low-frequency response at the listening position.

---

## 5. Product principles

1. **Compare, don’t certify.** The tool is for choosing between options, not for producing certified acoustical reports.
2. **Progressive disclosure.** Basic controls are visible; advanced controls are one level deeper.
3. **Explain the result.** Every major result should have a plain-language interpretation where possible.
4. **One engine, two boundary presets.** Room and open space share the same source, propagation, and receiver model; only boundary conditions and output emphasis differ.
5. **Deterministic and inspectable.** The same inputs produce the same outputs. The user can see which assumptions are active.
6. **No false precision.** Results are smoothed appropriately and labeled with confidence.
7. **Local-first.** Projects and audio never leave the browser in v1.

---

## 6. v1 scope

### 6.1 Included

| Area | v1 capability |
|---|---|
| Project | Create, rename, save locally, duplicate, export/import JSON/zip |
| Room | Draw inner boundary, height, wall thickness, per-wall material, open edges, floor/ceiling material |
| Templates | Control room, home theater, conference room, open office, live stage, empty open space |
| Sketching | Top/front/right sketch planes, grid/endpoint/midpoint/edge snapping, angle snapping, type-in dimensions |
| Objects | Extrude profiles, name, color, visibility, lock, material per object and per face |
| Combine | Group and true Union; explode union back to sources |
| Thin panels | Surface-only absorptive panels/curtains |
| Speakers | Subwoofer and full-range types; box dimensions; position/orientation; front/port face selection |
| Speaker settings | On-axis response, parametric EQ (up to 5 bands), CSV response import, gain, delay, polarity, phase, directivity preset, optional port |
| Multiple speakers | Add, duplicate, enable/solo, rename, color |
| Listeners | Point listener and listening-zone polygon with grid |
| Simulation | Standard hybrid: direct, first-order reflections, shoebox modes, diffuse field/RT60 |
| Open space | No walls, ground reflection, directivity, air absorption |
| Results | Frequency response (magnitude + phase), coverage heatmap, modes table + mode slice, RT60, impulse response, basic metrics |
| Comparison | Duplicate scenario, A/B overlay, per-speaker contribution |
| Export | Frequency response CSV, coverage PNG, project JSON/zip |
| Insights | Rule-based plain-language notes for nulls, coverage, delay, and mode proximity |

### 6.2 Excluded from v1

| Area | Deferred to |
|---|---|
| FDTD bass solver for arbitrary rooms | Phase 3 |
| Higher-order/beam-traced reflections | Phase 3 |
| Auto-optimizer | Phase 2 |
| Auralization | Phase 2 |
| PDF report | Phase 2 |
| CLF/measured polar import | Phase 3 |
| REW measurement import | Phase 3 |
| Multi-room transmission | Future |
| Cloud accounts/sharing | Future |
| Mobile/phone UX | Future |
| HRTF binaural | Future |
| Sloped ceilings, doors/windows as acoustic openings | Future |

### 6.3 Release-blocking acceptance criteria

- A new user can create a rectangular room from a template and see it in 3D without reading documentation.
- A user can sketch a top-view object, extrude it, name it, and place it in the room.
- A user can select two objects and union them into one named object, then explode them.
- A user can place two full-range speakers and one subwoofer, set front/port faces, and run a standard simulation.
- A standard simulation of a typical room with up to 5,000 receivers completes within 10 seconds on a mid-range laptop.
- The results panel shows frequency response at a selected seat, a coverage heatmap, room modes, and RT60.
- Two scenarios can be compared side by side.
- A project survives save, reload, and export/import without data loss.
- Invalid geometry is blocked with a clear, actionable error.

---

## 7. User experience

### 7.1 Project creation

The start screen offers:

- **New empty project**.
- **Room templates**: control room, home theater, conference room, open office, live stage.
- **Open-space template**: ground plane with a listener area and no walls.
- **Recent projects** from local storage.
- **Import project**.

A short onboarding overlay explains the five-step workflow and can be dismissed. It does not block the editor.

### 7.2 Room workflow

1. Choose **Room** tool.
2. Click to place vertices; the polygon closes on double-click or Enter.
3. Type exact segment lengths/angles while drawing if desired.
4. Set room height and wall thickness in the inspector.
5. Assign wall materials by selecting a wall segment; floor/ceiling materials are separate.
6. Mark individual edges as **open** to create a partial enclosure.
7. The 3D view updates immediately with a cutaway wall option.

The room boundary is the **inner acoustic surface**. Wall thickness extends outward. Dimensions shown are inner dimensions.

### 7.3 Object workflow

1. Choose **Object** tool.
2. Choose a sketch plane: **Top**, **Front**, or **Right**.
3. The camera locks to an orthographic view of that plane.
4. Draw a closed polygon with snapping and live dimensions.
5. Drag the extrusion handle or type a depth.
6. Name the object, choose a material, and optionally paint individual faces.
7. Press Escape or click Done to return to the 3D view.

Objects can be re-entered in sketch mode to edit the profile; the extrusion updates non-destructively.

### 7.4 Combine workflow

1. Select two or more objects.
2. Choose **Group** or **Union**.
3. **Group** keeps objects separate but organizes them.
4. **Union** produces one watertight object with a new name.
5. The original objects are stored in a hidden source snapshot.
6. **Explode** restores the original objects and removes the union result.

Material preservation depends on the union path: 2D unions keep the first selected object’s face materials; 3D unions map source face groups where possible. Unmapped faces use the object default material and trigger a warning.

### 7.5 Speaker workflow

1. Choose **Speaker** tool.
2. Select a speaker model: **Subwoofer** or **Full-range**.
3. Click in the room to place it; it sits on the floor by default.
4. Set dimensions, position, and yaw/pitch/roll.
5. Choose the **front face** from a face diagram or by clicking a face in 3D.
6. If ported, choose the **port face** and set tuning/level/polarity.
7. Set gain, delay, polarity, phase, EQ, and directivity.
8. Optionally use **Aim at listener**.

The front face shows an arrow/cone marker. The port face shows a port circle. Both are visible in the 3D view and togglable.

### 7.6 Listener workflow

- **Point listener**: click a location, set ear height (default 1.2 m seated, 1.7 m standing).
- **Listening zone**: draw a polygon, set height and grid spacing.
- The zone displays a grid of receiver points in 3D and a heatmap overlay at ear height.

### 7.7 Simulation workflow

1. Press **Simulate**.
2. Choose **Preview** or **Standard** (default Standard).
3. Watch stage progress: preparing geometry, modes, reflections, coverage, metrics.
4. Cancel at any time.
5. Results appear in the bottom drawer.
6. Changing geometry or speaker settings marks results as **stale** until re-run.
7. Preview mode updates quickly during editing if enabled.

### 7.8 Results workflow

Bottom drawer tabs:

- **Frequency Response** — magnitude and phase at the selected seat or zone average; per-speaker contributions; smoothed and raw traces.
- **Coverage** — heatmap at ear height, band selector, contours, min/max/mean/standard deviation, worst-seat marker.
- **Modes** — table of mode frequency/type/Q; click to show a pressure slice at ear height or a 3D volume; animate.
- **RT60** — per-octave bar chart with target range.
- **Impulse** — time-domain response and low-frequency waterfall.
- **Auralization** — Phase 2; the tab is hidden in v1.

### 7.9 Comparison workflow

- **Duplicate scenario** copies speaker placements and settings.
- Move speakers in the duplicate.
- Results panel can overlay Scenario A and B.
- Coverage maps can be shown side by side.
- A **difference view** shows B minus A in dB.
- A summary compares uniformity, average SPL, and worst-seat deviation.

### 7.10 Save and export

- Autosave to IndexedDB with a visible saved/stale indicator.
- Manual **Save** and **Save As**.
- Export project as `.rrs.zip` containing `project.json` and assets.
- Import validates schema and reports precise errors.
- Export FR as CSV: frequency, magnitude dB, phase degrees.
- Export coverage as PNG with legend and scale.
- Export speaker placement list as CSV.
- Print/PDF report is Phase 2.

### 7.11 Error and empty states

- Empty project canvas shows a template picker and “Draw room” call to action.
- Invalid room shows a red outline and a message naming the problem.
- Simulation blocked by geometry shows which object/face is invalid and offers “Zoom to problem.”
- Solver failure preserves the project and offers Retry / Lower accuracy.
- Worker crash restarts the worker and reports the failure.
- Large project warns before simulation with estimated memory/time.

---

## 8. Geometry system

### 8.1 Coordinate system and units

- Right-handed coordinate system.
- **X** = east, **Y** = north, **Z** = up.
- Floor is at `z = 0`.
- Internal units: meters, seconds, Hz, dB.
- UI displays metric or imperial; all stored values are metric.
- Angles are stored in degrees for user-facing fields and radians internally where required.
- Tolerance: `1e-6` m for geometry, `1e-4` for area/volume validation.

Three.js is configured for Z-up. Any helper that assumes Y-up is wrapped or rotated at the adapter boundary. The document and solver never use Three.js coordinates directly.

### 8.2 Sketch planes

| Plane | 2D axes | Normal / extrusion direction |
|---|---|---|
| Top | X, Y | +Z |
| Front | X, Z | −Y (toward the viewer) |
| Right | Y, Z | +X |

Each sketch has:

- `plane`: `top | front | right`
- `polygon`: ordered 2D points
- `planeOffset`: position of the sketch plane along its normal
- `extrusion`: depth and direction
- Optional transform applied after extrusion

### 8.3 Room geometry

- Room boundary is a simple, closed, counter-clockwise polygon of inner wall faces.
- Height is a positive scalar.
- Wall thickness is a positive scalar; walls extend outward from the inner polygon.
- Each edge can be:
  - A solid wall with a material and thickness.
  - An **open edge** (no wall).
- Floor and ceiling are generated from the boundary polygon.
- For open spaces, all edges may be open; the floor becomes a ground plane with a material.
- Flat ceiling in v1. Sloped ceilings are a future extension.

Generated room surfaces:

- Inner wall quads.
- Outer wall quads (not acoustically active unless a future multi-room mode is added).
- Wall top caps.
- Floor polygon.
- Ceiling polygon.

For acoustics, only inner surfaces and object surfaces are active. Outer wall surfaces are visual only.

### 8.4 Objects and solids

An object is a collection of one or more **solids**.

Each solid is:

- A closed 2D polygon on a sketch plane.
- An extrusion depth.
- An operation: `add` or `subtract`.
- Material assignments by generated face: `top`, `bottom`, `side`, or per-side index.
- Optional transform.

Object rules:

- At least one solid must produce a non-empty volume.
- Solids can be unioned or subtracted within the object.
- The object has a name, color, visibility, lock state, and default material.
- A thin panel is a `SceneObject` with `kind: 'panel'`, a polygon, no thickness, and a material; it is acoustically absorptive but not occluding.

### 8.5 Boolean operations

- **2D union**: when selected objects share the same sketch plane, base offset, and extrusion direction, union their polygons with `polygon-clipping`, then re-extrude. This is the preferred path.
- **3D union**: otherwise, convert meshes to Manifold-3D, perform a union, and convert back. Manifold is used because it produces watertight, manifold results suitable for acoustic ray casting.
- **Subtract**: used for openings and internal cutouts; same Manifold path.
- Material preservation:
  - 2D union preserves the material of the first selected object; the user can repaint faces.
  - 3D union maps source face groups to result face groups where possible.
  - Unmapped faces receive the object default material and a warning.
- **Group** is a non-destructive organizational container; it does not change geometry.

### 8.6 Speaker geometry

A speaker is a box primitive:

- Width, height, depth.
- `position` is the center of the box; the floor placement helper sets `z = height / 2`.
- Yaw/pitch/roll rotate the box around its center.
- Local axes: +Z is up, +Y is the nominal front before rotation. The selected **front face** defines the acoustic axis.
- Front face options: `+Y`, `−Y`, `+X`, `−X`, `+Z`, `−Z`.
- Port face options: same set, excluding the front face.
- Acoustic center: center of the front face.
- Port source: center of the port face.
- Radiator:
  - `rect` with width/height, or
  - `round` with diameter.
- Visual markers are rendered in 3D and togglable.

### 8.7 Materials and face assignment

Material definition:

- Name, category, color.
- Absorption coefficients per octave band: 63, 125, 250, 500, 1k, 2k, 4k, 8k Hz.
- Scattering coefficient per band (0–1), optional; default 0.1.
- Optional notes and source reference.

Built-in library (initial):

- Concrete, brick, painted drywall, wood panel, glass, carpet, acoustic panel, curtain, audience, grass/ground, water, gravel.
- Values are typical published coefficients, not manufacturer data.

Assignment:

- Object default material.
- Per-face overrides via the inspector or a paint tool.
- Room: per-wall-segment, floor, ceiling.
- Panels: single material.

### 8.8 Validation rules

Block simulation if any of the following is true:

- Room polygon self-intersects or has fewer than 3 vertices.
- Room area is below `1e-4 m²`.
- Room height ≤ 0 or wall thickness < 0.
- Object polygon self-intersects or has zero area.
- Extrusion depth ≤ 0.
- Mesh is non-manifold after boolean.
- Speaker is outside the room or inside a solid object.
- Speaker dimensions are non-positive.
- A required material is missing.
- Listener is outside the room or inside a solid object.
- Listening zone is empty after grid generation.
- More than the configured limits for objects, triangles, speakers, or receivers.

Warnings (do not block):

- Speaker within 10 cm of a wall.
- Listening position within 10 cm of a wall.
- Object overlaps another object without union.
- Very high absorption (> 0.8 average) making RT60 estimates unreliable.
- Room is highly non-rectangular, making v1 modal results approximate.
- Grid spacing is larger than 0.5 m.

### 8.9 Mesh generation pipeline

1. Validate 2D polygon (simple, area, orientation).
2. Triangulate caps with `earcut`.
3. Generate side quads.
4. Assign face groups/materials.
5. Apply object transform.
6. Apply boolean operations via Manifold if needed.
7. Recalculate normals; ensure outward orientation.
8. Validate manifoldness and triangle count.
9. Build a BVH for editor picking and solver visibility.
10. Cache the mesh by a hash of the geometry inputs.

Generated mesh data for the solver:

- Vertex positions (`Float32Array`).
- Triangle indices (`Uint32Array`).
- Per-triangle material ID (`Uint16Array`).
- Per-triangle normal (`Float32Array`).
- Bounding boxes per material/face group.

---

## 9. Acoustic system

### 9.1 Overview and frequency split

The engine is a hybrid:

- **Modal region:** 20 Hz to the Schroeder frequency.
- **Geometric region:** Schroeder frequency to 20 kHz.
- **Crossfade:** roughly one 1/3-octave band around the crossover.

Schroeder frequency:

\[
f_s \approx 2000\sqrt{\frac{T_{60}}{V}}
\]

For a typical small room with `V = 50 m³` and `T60 = 0.4 s`, `f_s ≈ 179 Hz`. The crossover is clamped to a practical range of 120–400 Hz.

In open space, the modal branch is disabled and the full band uses the geometric branch.

### 9.2 Sources

Each speaker instance produces one or more acoustic sources:

- **Main source** at the front face center.
- **Port source** at the port face center, if enabled.
- Future: multiple drivers, array elements, cardioid rear source.

Each source exposes a generic interface to the solver:

- Position.
- Orientation / acoustic axis.
- Complex frequency response `H(f)`.
- Directivity `D(θ, φ, f)`.
- Gain, delay, polarity, phase.
- Maximum SPL (optional, for output estimates).

### 9.3 Speaker response

Response can be defined as:

1. **Flat** with optional high-pass/low-pass roll-off.
2. **Parametric** with RBJ biquad filters: high-pass, low-pass, peaking EQ, low shelf, high shelf.
3. **CSV import**: frequency, magnitude dB, optional phase degrees.

If phase is not provided:

- Reconstruct **minimum phase** from the magnitude response using the Hilbert transform of log magnitude.
- Add the pure propagation delay.
- Mark the result as “phase estimated.”

Delay:

- Stored in milliseconds.
- Applied as `exp(-j2πfτ)`.
- A distance entry mode converts meters to milliseconds using the current speed of sound.

Polarity:

- 0° or 180°, applied as a sign.

Phase offset:

- Constant degrees, applied across the band.
- Intended for alignment experiments, not as a substitute for measured phase.

### 9.4 Directivity

v1 models:

- **Omni** — subwoofers and low-frequency sources.
- **Piston** — circular or rectangular radiator in an infinite baffle.
- **Coverage preset** — nominal horizontal × vertical coverage angle, e.g. 90° × 60°, 60° × 40°, 120° × 60°.

Circular piston:

\[
D(\theta,f)=\frac{2J_1(ka\sin\theta)}{ka\sin\theta},
\quad k=\frac{2\pi f}{c}
\]

Rectangular piston approximation:

\[
D(\theta,\phi,f)=\mathrm{sinc}\left(\frac{\pi a}{\lambda}\sin\theta\cos\phi\right)
\mathrm{sinc}\left(\frac{\pi b}{\lambda}\sin\theta\sin\phi\right)
\]

Coverage preset:

- Uses a smooth frequency-dependent pattern with the specified nominal angles.
- Narrows gradually at high frequencies.
- Marked as “estimated pattern.”

All directivity patterns are normalized to 1 on axis. The UI states whether directivity is measured, modeled, or preset.

### 9.5 Port model

The port is a second source with:

- Position at the port face center.
- Omni directivity at low frequencies.
- A simplified 2nd-order band-pass magnitude around the tuning frequency.
- Phase derived from the same 2nd-order filter.
- Level, Q, polarity, and optional delay.

\[
|H_{port}(f)| =
\frac{(f/f_b)^2}
{\sqrt{(1-(f/f_b)^2)^2 + (f/(Q f_b))^2}}
\]

This is an approximation of a bass-reflex system. It captures the important effects for placement: port location, tuning, level, and phase interaction with the main radiator. A future advanced mode can use a Thiele-Small model or imported complex port response.

### 9.6 Direct sound

For each source–receiver pair:

\[
H_{direct}(f)=
\frac{D(\theta,\phi,f)\,H_{source}(f)}{r}
\,e^{-j2\pi f r/c}
\,e^{-\alpha_{air}(f)r}
\]

Where:

- `r` is the straight-line distance.
- `c` is the speed of sound.
- `α_air` is the air absorption coefficient from ISO 9613-1.
- Occlusion is checked with the BVH. If blocked, the direct path is removed (v1) and a warning is shown; edge diffraction is Phase 3.

Speed of sound:

\[
c \approx 331.3 + 0.606\,T\ (^\circ C)
\]

Air absorption depends on frequency, temperature, humidity, and pressure. The implementation uses the ISO 9613-1 formulation.

### 9.7 Specular reflections

v1 uses **first-order image sources**:

- For each active planar surface, mirror the source.
- Compute the reflection point on the finite face.
- Reject if the point is outside the face.
- Reject if the path is obstructed.
- Apply the reflection coefficient.
- Sum the complex pressure with the path delay.

Reflection coefficient:

\[
R(f)=\sqrt{1-\alpha(f)}\,e^{j\phi(f)}
\]

v1 uses `φ ≈ 0` for all materials, with a warning that reflection phase is approximated. A future impedance model can supply frequency-dependent phase for porous absorbers and thin panels.

Surfaces included:

- Room walls, floor, ceiling.
- Object faces.
- Thin panels (absorptive, optionally specular at low absorption).

Surfaces excluded:

- Outer wall faces.
- Internal faces removed by boolean union.
- Speaker cabinet faces (the cabinet is not a room surface in v1).

Higher-order reflections:

- Shoebox rooms: optional analytic image sources up to order 2 in a future phase.
- Arbitrary rooms: beam tracing in Phase 3.
- v1 approximates the missing higher-order energy with the diffuse field.

### 9.8 Diffuse field and RT60

For enclosed rooms:

- Compute total absorption per band:

\[
A(f)=\sum_i S_i\alpha_i(f)+4m(f)V
\]

- Sabine:

\[
T_{60}(f)=0.161\frac{V}{A(f)}
\]

- Eyring, used when average absorption is high:

\[
T_{60}(f)=\frac{0.161V}{-S\ln(1-\bar\alpha(f))+4m(f)V}
\]

- Critical distance for an omni source:

\[
r_c=\sqrt{\frac{A}{16\pi}}
\]

- Add a late reverberant energy term with a smooth/random phase per frequency. The diffuse field is treated as incoherent relative to the direct/early field.
- For the v1 impulse-response display, synthesize a decaying noise tail calibrated to RT60 and crossfade it with the early reflections. Phase 2 auralization reuses the same impulse response for audio playback.

For open space:

- No RT60 and no diffuse field.
- Ground reflection is handled as a first-order image source.
- Optional nearby surfaces can contribute reflections.
- Air absorption and directivity dominate.

### 9.9 Room modes

For rectangular rooms:

\[
f_n=\frac{c}{2}
\sqrt{
\left(\frac{n_x}{L_x}\right)^2+
\left(\frac{n_y}{L_y}\right)^2+
\left(\frac{n_z}{L_z}\right)^2
}
\]

Mode shape:

\[
\Psi_n(x,y,z)=
\cos\left(\frac{n_x\pi x}{L_x}\right)
\cos\left(\frac{n_y\pi y}{L_y}\right)
\cos\left(\frac{n_z\pi z}{L_z}\right)
\]

Classification:

- Axial: exactly one non-zero index.
- Tangential: exactly two non-zero indices.
- Oblique: three non-zero indices.

Damping:

- Estimate mode Q/decay from band absorption and room surfaces.
- Use a complex modal Green’s function with the form:

\[
H_{modal}(f)=\sum_n
\frac{c^2\,\Psi_n(r_s)\Psi_n(r)}
{V\,\Lambda_n\,(\omega_n^2-\omega^2+j\omega\omega_n/Q_n)}
\]

Where `Λ_n` is the mode normalization integral. The implementation is calibrated and validated against known shoebox cases.

Mode count:

- Enumerate modes up to the crossover frequency.
- Cap at a configurable maximum (default 20,000 modes) to avoid pathological cases.

Arbitrary rooms:

- v1 uses an approximate modal model based on the room’s bounding box and net volume, with a clear “approximate modal prediction” label.
- A future FDTD solver will replace this for users who need accurate arbitrary-room bass.
- L-shaped and highly non-rectangular rooms show a warning in the results.

Mode visualization:

- Horizontal pressure slice at ear height.
- Optional 3D volume rendering later.
- Animate phase at the mode frequency.
- Red/blue diverging colormap with a zero-pressure neutral color.

### 9.10 Multiple sources and summation

- Each source contributes a complex pressure at each receiver.
- **Coherent summation** is the default for frequency response: `H_total = Σ H_s`.
- **Incoherent/power summation** is available for coverage maps when the program material is uncorrelated: `|H_total|² = Σ |H_s|²`.
- The UI clearly labels which mode is active.
- Per-speaker contribution can be soloed or muted.

### 9.11 Receivers and coverage

Receiver types:

- **Point listener**: one position at a specified ear height.
- **Listening zone**: polygon grid at a specified height and spacing.
- **Coverage grid**: generated over the room or a user-defined polygon.

Coverage evaluation:

- For each grid point and band, compute direct + first-order reflections + diffuse energy.
- Sum sources according to the selected coherence mode.
- Convert to dB SPL relative to a reference, or estimated absolute SPL if source sensitivity/calibration is provided.
- Apply 1/3-octave smoothing for display.
- Compute min, max, mean, standard deviation, and worst-seat location.

Default grid spacing:

- 0.25 m for small rooms.
- 0.5 m for large/open spaces.
- User-adjustable from 0.1 m to 2.0 m.
- Warn above 0.5 m that local nulls may be missed.

### 9.12 Outputs and metrics

| Output | Description |
|---|---|
| Frequency response | Magnitude and phase vs frequency at a point or zone average |
| Coverage map | SPL heatmap at ear height, per band |
| Room modes | Frequency, type, Q, wavelength, mode shape |
| RT60 | Per-octave reverberation time |
| Impulse response | Time-domain response from early reflections + late tail |
| Waterfall | Low-frequency decay spectrum |
| D/R ratio | Direct-to-reverberant ratio |
| C50 / C80 | Clarity for speech/music |
| Seat-to-seat variance | Standard deviation across the listening zone |
| Worst seat | Location and deviation from the mean |
| Confidence | Preview / Standard / High, with assumption notes |

Metrics are computed from the simulated response, not from a separate heuristic, wherever possible.

### 9.13 Confidence levels

- **Preview** — direct + statistical diffuse; no modes; no first-order reflections. Fast, qualitative.
- **Standard** — direct + first-order reflections + shoebox modes + diffuse. The v1 default.
- **High** — future: higher-order/beam tracing + FDTD. Not in v1.

Every result panel shows:

- Confidence level.
- Whether modal prediction is exact (shoebox) or approximate (arbitrary room).
- Whether directivity is measured, modeled, or preset.
- Whether phase is measured or estimated.
- Any active warnings.

### 9.14 Assumptions and limitations

- Rooms are sealed single volumes; wall transmission is not modeled.
- Objects are rigid except for their absorption coefficients; transmission through objects is not modeled.
- Diffraction around edges is not modeled in v1.
- Reflection phase is approximated as zero in v1.
- Speaker cabinets are not modeled as diffracting bodies.
- Air is still; wind and temperature gradients are not modeled.
- Absolute SPL is an estimate unless the user provides calibrated source data.
- Results are smoothed for display; raw and smoothed traces are both available.

---

## 10. Architecture

### 10.1 High-level

```
┌─────────────────────────────────────────────────────────────┐
│ React UI                                                    │
│ Toolbar · Outliner · Inspector · 2D/3D Viewport · Results   │
└──────────────────────────┬──────────────────────────────────┘
                           │ commands
┌──────────────────────────▼──────────────────────────────────┐
│ Document Store (Zustand + Immer, undoable)                  │
│ Room · Objects · Speakers · Listeners · Scenarios           │
└──────────────────────────┬──────────────────────────────────┘
                           │ derive
┌──────────────────────────▼──────────────────────────────────┐
│ Geometry Engine                                             │
│ Validate · Triangulate · Extrude · Boolean · Materials      │
│ BVH for picking and visibility                              │
└──────────────────────────┬──────────────────────────────────┘
                           │ solver scene (typed arrays)
┌──────────────────────────▼──────────────────────────────────┐
│ Solver Worker (Rust/WASM)                                   │
│ Modes · Direct · Reflections · Diffuse · Coverage · IR      │
└──────────────────────────┬──────────────────────────────────┘
                           │ results (transferables)
┌──────────────────────────▼──────────────────────────────────┐
│ Results Store + Cache (input hash)                          │
│ FR · Coverage · Modes · RT60 · IR · Metrics · Warnings      │
└──────────────────────────┬──────────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
       Charts         3D Heatmap       Auralization (Phase 2)
```

### 10.2 Frontend

- React 19 + TypeScript + Vite.
- Three.js + React Three Fiber + Drei for the 3D viewport.
- SVG for interactive 2D shapes; Canvas for grid, heatmap, and dense overlays.
- Tailwind CSS + shadcn/ui + Radix for UI components.
- lucide-react for icons.
- uPlot for frequency-response and impulse charts; d3-scale for axes and color scales; custom Canvas for waterfall and heatmap.
- Zustand + Immer for state; custom command history for undo/redo.
- Zod for project schema validation and migrations.
- Dexie/IndexedDB for persistence; fflate for zip export.
- Web Audio API for Phase 2 auralization.

State split:

- **Document store** — persistent, undoable project data.
- **UI store** — selection, camera, active tool, panels; not undoable.
- **Simulation store** — job status, results, cache metadata.
- **Preferences store** — units, theme, grid defaults; persisted separately.

Undo/redo:

- Command pattern with Immer patches.
- Geometry operations store before/after patches and mesh cache keys.
- History limit: 100 commands by default.
- Undo/redo does not invalidate the project schema.

### 10.3 Geometry engine

Responsibilities:

- Convert document entities to meshes.
- Validate geometry.
- Perform 2D/3D booleans.
- Assign materials to faces.
- Build BVH for picking and solver visibility.
- Generate solver-ready typed arrays.
- Cache meshes by geometry hash.

Dependencies:

- `polygon-clipping` for 2D union.
- `earcut` for triangulation.
- `manifold-3d` for robust 3D CSG.
- `three` for mesh representation and rendering.
- `three-mesh-bvh` for editor picking and ray queries.

The geometry engine is pure TypeScript and does not depend on React. It can run in a worker for expensive boolean operations.

### 10.4 Solver worker and WASM

- Rust crate compiled with `wasm-bindgen` and `wasm-pack`.
- Runs inside a dedicated Web Worker.
- Receives a serialized solver scene and settings.
- Returns typed arrays for responses, coverage, modes, RT60, IR, metrics, and warnings.
- Supports cancellation via a control message or worker termination.
- Uses a single-thread fallback; optional `wasm-bindgen-rayon` threads when COOP/COEP are available.

Rust crates (initial):

- `wasm-bindgen`, `js-sys`, `web-sys`
- `serde`, `serde-wasm-bindgen`
- `nalgebra` for linear algebra
- `rustfft` / `realfft` for FFT
- `bvh` or a custom BVH
- `parry3d` for geometric queries if needed
- `wide` for SIMD-friendly loops

Solver stages:

1. Deserialize scene.
2. Build/reuse BVH.
3. Compute room volume, surface areas, absorption, RT60.
4. Compute Schroeder frequency and crossover.
5. Modal solve (room only).
6. Direct paths and first-order image sources.
7. Diffuse field.
8. Receiver/coverage evaluation.
9. Impulse response synthesis.
10. Metrics and warnings.
11. Serialize results.

Progress messages are emitted per stage with a percentage.

### 10.5 Results cache

- Each result set has an `inputHash` derived from:
  - Geometry hash.
  - Material assignments.
  - Speaker models and placements.
  - Listener/zone geometry.
  - Simulation settings.
- Cache stored in memory and optionally in IndexedDB for recent runs.
- Changing a camera or selection does not invalidate results.
- Changing geometry or speakers marks results stale.
- A stale result can still be viewed with a “stale” badge.

### 10.6 Persistence

- IndexedDB via Dexie.
- Tables: projects, assets, results, preferences.
- Autosave debounced at 2 seconds after the last document change.
- Project export as `.rrs.zip` with `project.json` and assets.
- Schema version integer; migrations run on load.
- Import rejects unknown future versions with a clear message.
- Optional File System Access API for “Save to file” where supported; fallback to download.

### 10.7 Audio (Phase 2)

- Generate a stereo impulse response from two receiver points at ear spacing.
- Load into a `ConvolverNode`.
- Play test signals, uploaded audio, or a voice sample.
- Toggle direct-only vs with-room.
- Switch speakers/listeners live.
- Export IR as WAV.
- No audio leaves the browser.

### 10.8 Deployment

- Static SPA hosted on Cloudflare Pages or Vercel.
- PWA manifest and offline caching for the app shell.
- COOP/COEP headers for SharedArrayBuffer/WASM threads; single-thread fallback if headers are unavailable.
- Self-host fonts and assets to avoid cross-origin isolation issues.
- No backend in v1.
- Optional privacy-friendly analytics (Plausible/Umami) with opt-out.

---

## 11. Data model

**Common types used below:**

```ts
type Vec2 = { x: number; y: number };
type Vec3 = { x: number; y: number; z: number };
type Face = '+X' | '-X' | '+Y' | '-Y' | '+Z' | '-Z';

interface Transform {
  position: Vec3;
  rotation: { yaw: number; pitch: number; roll: number };
}

interface EqBand {
  type: 'peaking' | 'lowShelf' | 'highShelf' | 'highPass' | 'lowPass';
  frequencyHz: number;
  gainDb?: number;
  q?: number;
}

interface PortDefinition {
  tuningHz: number;
  q: number;
  levelDb: number;
}

interface PortSettings extends PortDefinition {
  polarity: 0 | 180;
  delayMs?: number;
}
```

### 11.1 Project

```ts
interface Project {
  id: string;
  schemaVersion: number;
  name: string;
  createdAt: string;
  updatedAt: string;
  units: 'metric' | 'imperial';
  environment: Environment;
  room: Room;
  objects: SceneObject[];
  speakers: SpeakerInstance[];
  listeners: Listener[];
  zones: ListeningZone[];
  scenarios: Scenario[];
  settings: SimulationSettings;
}
```

`Project.speakers` is the active working set. `Project.scenarios` stores placement snapshots for A/B comparison.

### 11.2 Environment

```ts
interface Environment {
  temperatureC: number;      // default 20
  humidityPct: number;       // default 50
  pressurePa: number;        // default 101325
  speedOfSound: number;      // derived, m/s
}
```

### 11.3 Room

```ts
interface Room {
  id: string;
  name: string;
  boundary: Vec2[];          // inner acoustic boundary, CCW
  height: number;            // m
  wallThickness: number;     // m
  walls: WallSegment[];
  floorMaterialId: string;
  ceilingMaterialId: string;
  kind: 'enclosed' | 'open';
  ceilingType: 'flat';       // future: 'sloped'
}

interface WallSegment {
  edgeIndex: number;
  materialId: string;
  thickness: number;         // overrides room default if set
  open: boolean;
}
```

### 11.4 Scene object

```ts
interface SceneObject {
  id: string;
  name: string;
  kind: 'solid' | 'panel' | 'group';
  visible: boolean;
  locked: boolean;
  color: string;
  defaultMaterialId: string;
  solids: Solid[];
  panels?: Panel[];
  transform: Transform;
  combinedFrom?: string[];   // source object IDs for explode
  groupId?: string;
}
```

### 11.5 Solid

```ts
interface Solid {
  id: string;
  sketch: Sketch;
  extrusion: {
    depth: number;
    direction: 1 | -1;
  };
  operation: 'add' | 'subtract';
  faceMaterials?: Record<string, string>;
}

interface Sketch {
  plane: 'top' | 'front' | 'right';
  polygon: Vec2[];
  planeOffset: number;
}
```

### 11.6 Panel

```ts
interface Panel {
  id: string;
  plane: 'top' | 'front' | 'right';
  polygon: Vec2[];
  planeOffset: number;
  materialId: string;
  occluding: boolean;        // default false for curtains/screens
}
```

### 11.7 Material

```ts
interface Material {
  id: string;
  name: string;
  category: string;
  color: string;
  absorption: Record<Band, number>;
  scattering: Record<Band, number>;
  notes?: string;
}
```

`Band` is one of `63 | 125 | 250 | 500 | 1000 | 2000 | 4000 | 8000`.

### 11.8 Speaker model and instance

```ts
interface SpeakerModel {
  id: string;
  name: string;
  kind: 'subwoofer' | 'fullrange';
  dimensions: { width: number; height: number; depth: number };
  radiator: {
    shape: 'round' | 'rect';
    diameter?: number;
    width?: number;
    height?: number;
  };
  response: SpeakerResponse;
  directivity: Directivity;
  port?: PortDefinition;
  maxSpl?: number;
}

interface SpeakerInstance {
  id: string;
  name: string;
  modelId: string;
  enabled: boolean;
  solo: boolean;
  color: string;
  position: Vec3;
  rotation: { yaw: number; pitch: number; roll: number };
  frontFace: Face;
  portFace?: Face;
  gainDb: number;
  delayMs: number;
  polarity: 0 | 180;
  phaseDeg: number;
  eq?: EqBand[];
  responseOverride?: SpeakerResponse;
  portOverride?: PortSettings;
}
```

### 11.9 Response and directivity

```ts
type SpeakerResponse =
  | { type: 'flat'; highPassHz?: number; lowPassHz?: number }
  | { type: 'parametric'; filters: EqBand[] }
  | { type: 'csv'; points: ResponsePoint[]; phaseEstimated: boolean };

interface ResponsePoint {
  frequencyHz: number;
  magnitudeDb: number;
  phaseDeg?: number;
}

type Directivity =
  | { type: 'omni' }
  | { type: 'piston'; radiator: 'round' | 'rect' }
  | { type: 'coverage'; horizontalDeg: number; verticalDeg: number };
```

### 11.10 Listener and zone

```ts
interface Listener {
  id: string;
  name: string;
  position: Vec2;            // floor point
  earHeight: number;
}

interface ListeningZone {
  id: string;
  name: string;
  polygon: Vec2[];
  height: number;
  gridSpacing: number;
}
```

### 11.11 Scenario

```ts
interface Scenario {
  id: string;
  name: string;
  speakerSnapshot: SpeakerInstance[];
  createdAt: string;
  resultHash?: string;
}
```

### 11.12 Simulation settings

```ts
interface SimulationSettings {
  tier: 'preview' | 'standard';
  frequencyMinHz: number;     // 20
  frequencyMaxHz: number;     // 20000
  bandsPerOctave: number;     // 3, 6, or 24
  reflectionOrder: 1;         // v1 fixed at 1
  includeModes: boolean;
  includeDiffuse: boolean;
  coherentSummation: boolean;
  modalCrossoverHz?: number;  // auto if omitted
  coverageGridSpacing: number;
  smoothing: 'none' | '1/3' | '1/6';
  maxReceivers: number;
}
```

### 11.13 Results

```ts
interface SimulationResult {
  id: string;
  inputHash: string;
  createdAt: string;
  tier: 'preview' | 'standard';
  responses: ResponseResult[];
  coverage?: CoverageResult;
  modes?: ModeResult[];
  rt60: number[];
  impulseResponses?: Float32Array[];
  metrics: Metrics;
  warnings: Warning[];
  confidence: ConfidenceReport;
}
```

**Result sub-types:**

```ts
interface ResponseResult {
  receiverId: string;
  frequencies: Float32Array;
  magnitudeDb: Float32Array;
  phaseDeg: Float32Array;
}

interface CoverageResult {
  bandHz: number;
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  spacing: number;
  values: Float32Array;
}

interface ModeResult {
  frequencyHz: number;
  type: 'axial' | 'tangential' | 'oblique';
  q: number;
  indices: [number, number, number];
}

interface Metrics {
  averageSplDb: number;
  uniformityDb: number;
  worstSeatDeviationDb: number;
  directToReverberantDb: number;
  c50Db?: number;
  c80Db?: number;
}

interface ConfidenceReport {
  tier: 'preview' | 'standard';
  modalAccuracy: 'exact' | 'approximate' | 'not-applicable';
  directivity: 'measured' | 'modeled' | 'preset';
  phase: 'measured' | 'estimated';
}

interface Warning {
  code: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
}
```

The exact binary layout is defined during implementation. Results are immutable.

### 11.14 Schema versioning

- `schemaVersion` is an integer, starting at 1.
- Migrations are pure functions from version N to N+1.
- Unknown future versions are rejected with a clear message.
- Imported JSON is validated with Zod before migration.

---

## 12. UI/UX specification

### 12.1 Layout

- **Top bar:** project name, undo/redo, 2D/3D toggle, scenario selector, Simulate, Export.
- **Left rail:** Select, Room, Wall, Object, Panel, Speaker, Listener, Measure.
- **Left panel:** outliner with tabs: Objects, Speakers, Listeners, Materials.
- **Right panel:** inspector; Basic/Advanced sections; geometry validation; material picker.
- **Center:** viewport; 2D top view or 3D perspective; orthographic sketch mode when drawing.
- **Bottom drawer:** results tabs; collapsible; remembers height.
- **Status bar:** units, cursor coordinates, grid size, simulation state, worker status.

### 12.2 Visual design

- Dark theme by default; light theme available.
- Charcoal background, warm amber accent, teal secondary accent.
- Inter for UI text; JetBrains Mono for numerical fields and coordinates.
- Neutral architectural materials with subtle color coding by material category.
- Soft shadows, ambient occlusion, subtle grid.
- Cutaway and X-ray wall modes.
- Colorblind-safe heatmaps (viridis default; optional turbo with warning).
- Charts: log frequency axis, 40–110 dB range by default, shaded target bands, no gridline clutter.
- Motion: 150–250 ms transitions; no gratuitous animation; respect `prefers-reduced-motion`.

### 12.3 Interaction details

- **Pan:** middle mouse or Space + drag.
- **Orbit:** right mouse or Alt + drag in 3D.
- **Zoom:** wheel.
- **Snap toggle:** Shift temporarily disables snapping.
- **Ortho toggle:** O.
- **Escape:** cancel current tool or clear selection.
- **Delete:** delete selected object/speaker/listener.
- **Ctrl/Cmd + Z / Shift + Z:** undo/redo.
- **Ctrl/Cmd + D:** duplicate.
- **Ctrl/Cmd + K:** command palette.
- **G:** group; **U:** union; **X:** explode.
- **F:** frame selection.
- **1/2/3/4:** top/front/right/perspective views.
- **Tab:** cycle Basic/Advanced inspector sections.
- Context menu on right-click with relevant actions.
- Inline rename in outliner and inspector.
- Hover highlights the corresponding 3D object.
- Selection shows dimensions and a bounding box.
- Speaker selection shows front/port face gizmos and aim arrow.

### 12.4 Progressive disclosure

Basic speaker panel:

- Name, model, size, position, orientation, front face, port face, gain, delay, polarity.

Advanced speaker panel:

- Frequency response import, EQ, directivity, phase, port tuning/Q/level, max SPL.

Basic simulation:

- Preview / Standard, listener/zone selection, Simulate.

Advanced simulation:

- Frequency range, bands per octave, crossover, coherence, smoothing, grid spacing, receiver cap.

### 12.5 Insights

Rule-based, deterministic insights displayed under results:

- “Seat 3 has a 12 dB null at 68 Hz. It is near a pressure node of the 2nd axial mode.”
- “The left speaker arrives 3.2 ms late relative to the right at the main seat. Suggested delay: 3.2 ms.”
- “Coverage is ±2.1 dB from 1–4 kHz. The worst seat is rear-left.”
- “This subwoofer position reduces seat-to-seat variance by 35% versus Scenario A.”
- “The room is highly non-rectangular; modal results are approximate.”

Insights are generated from measured result data, not from an external AI service. They are explainable and reproducible.

### 12.6 Accessibility

- Keyboard navigation for all tools and panels.
- Focus rings visible in both themes.
- Minimum contrast 4.5:1 for text.
- Color is never the only indicator; use labels, patterns, or icons.
- Heatmap has a legend and numeric readout on hover.
- Charts have accessible tables for key values.
- Respect `prefers-reduced-motion`.
- Screen-reader labels for icon buttons and form fields.

### 12.7 Responsive behavior

- Desktop-first; minimum supported viewport 1280 × 800.
- Below 1280 px, panels collapse into drawers; 3D remains usable.
- Tablet/pen support is a future enhancement; touch drawing is not a v1 requirement.
- Phone layout is not supported in v1; show a clear message.

---

## 13. Performance requirements

| Metric | Target |
|---|---|
| 3D viewport | 60 fps at 100k triangles on a mid-range laptop |
| 2D drawing interaction | < 16 ms per pointer move |
| Preview simulation | < 1 s for 1,000 receivers, 2 sources |
| Standard simulation | 2–10 s for 5,000 receivers, 4 sources, first-order reflections |
| Results panel switch | < 100 ms |
| Project load | < 2 s for a typical project |
| Autosave | < 50 ms on the main thread; offloaded if needed |

Implementation rules:

- Solver runs only in a worker.
- Geometry booleans above a threshold run in a worker.
- Typed arrays and transferables for large results.
- BVH for visibility tests.
- Cache meshes and results by input hash.
- Lazy-load the solver WASM and Three.js postprocessing.
- Cap receivers and triangles with clear warnings.
- Cancel or terminate long-running jobs.
- Avoid React re-renders during solver progress; update a progress store.

Project limits (soft, warn before exceeding):

- 200 scene objects.
- 50,000 triangles for the acoustic scene.
- 20 speakers.
- 20,000 receivers per run.
- 20,000 modes enumerated per run.

---

## 14. Validation and testing

### 14.1 Unit tests

- Polygon area, orientation, self-intersection detection.
- Extrusion volume and surface area.
- Boolean union/subtract manifoldness.
- Face material assignment after boolean.
- Coordinate transforms.
- Material absorption interpolation.
- Speed of sound and air absorption.
- RT60 Sabine/Eyring.
- Schroeder frequency.
- Mode frequency enumeration and classification.
- Piston directivity normalization.
- Biquad filter response.
- Minimum-phase reconstruction.
- Coherent vs incoherent summation.
- Input hash stability.

### 14.2 Reference cases

- Free-field inverse-square: −6 dB per doubling.
- Shoebox axial mode frequencies vs analytic values.
- RT60 vs hand calculation for a simple room.
- Image-source path lengths for a rectangular room.
- Directivity on-axis gain = 1.
- Port response peak at tuning frequency.
- Mode coupling zero at a pressure node.

Use **pyroomacoustics** offline to generate image-source and RT60 fixtures. Store fixtures as JSON/CSV in the repository. Do not ship pyroomacoustics in the app.

### 14.3 Integration tests

- Build a room and object, generate solver scene, run a short simulation, assert finite results and expected ranges.
- Change a speaker position and verify the input hash changes and results invalidate.
- Save/reload a project and compare serialized state.
- Import/export round trip.
- Boolean union then explode restores source objects.
- Coverage grid generation respects the zone polygon.

### 14.4 End-to-end tests

- Create a room from a template, add an object, place a speaker, simulate, and see charts.
- Union two objects and verify the outliner.
- Compare two scenarios and verify the difference view.
- Trigger a geometry error and verify the blocking message.
- Export CSV/PNG and verify the download.

### 14.5 Accuracy expectations

These are validation targets, not marketing claims:

- Direct-field level: within ±0.5 dB of inverse-square in free field.
- Mode frequencies: within ±2% for rectangular rooms.
- RT60: within ±15% of Sabine/Eyring reference for simple rooms.
- Coverage relative differences: within ±3 dB of a reference image-source solution for a simple room.
- Absolute SPL: within ±3–6 dB when calibrated source data is provided; otherwise relative only.

If a test fails, the implementation is adjusted or the limitation is documented and surfaced in the UI.

### 14.6 Browser and device testing

- Latest two versions of Chrome, Edge, Firefox, Safari.
- WebGL2 and WASM enabled.
- 8 GB RAM laptop as the reference device.
- Test with integrated graphics.
- Verify fallback messages when WebGL2 or WASM is unavailable.

---

## 15. Error handling

| Failure | Behavior |
|---|---|
| Invalid room polygon | Block simulation, highlight the edge, explain the fix |
| Self-intersecting object | Block simulation, show the intersection point |
| Non-manifold boolean result | Keep the source objects, show a repair suggestion, allow retry |
| Speaker outside room | Block simulation, offer “move inside” |
| Solver worker crash | Restart worker, preserve project, show error and Retry |
| Out of memory | Reduce grid/receiver count, suggest Preview tier |
| Import schema error | Show the JSON path and expected type; do not partially import |
| Missing asset | Load the project with a placeholder and a warning |
| Autosave failure | Show a persistent warning and offer manual export |
| Unsupported browser | Disable 3D/solver with a clear explanation |

All errors are recoverable without losing the project. No destructive action without confirmation.

---

## 16. Security and privacy

- Local-first: projects, audio, and results stay in the browser in v1.
- No account or network requirement for core functionality.
- Imported files are size-limited and schema-validated.
- No `eval`, no dynamic code execution from imports.
- WASM is served from the same origin with integrity checks.
- If analytics are added, use a privacy-friendly provider and allow opt-out.
- If cloud features are added later, require explicit consent before upload.
- COOP/COEP headers are used only to enable WASM threads; the app must work without them.

---

## 17. Roadmap and milestones

Estimates assume one experienced developer and are planning targets, not commitments.

### Phase 0 — Prototype (1–2 weeks)

- Vite/React/TypeScript shell.
- 3D viewport with orbit controls and Z-up grid.
- 2D top-view room drawing with snapping.
- Room extrusion and cutaway walls.
- One speaker model, one listener.
- Direct-field coverage heatmap.
- Basic inspector and results panel.

**Exit criteria:** draw a room, place a speaker, see a direct-field heatmap, and navigate the 3D view without errors.

### Phase 1 — MVP (4–6 weeks)

- Object sketching on top/front/right planes, extrusion, naming.
- Thin absorptive panels.
- Materials library and face assignment.
- Group/Union/Explode with Manifold.
- Subwoofer and full-range speaker models.
- Front/port face selection, parametric EQ, CSV response import.
- Multiple speakers, gain/delay/polarity/phase/EQ.
- Enclosed-room and open-space branches.
- First-order reflections, shoebox modes, RT60/diffuse.
- Frequency response chart, coverage map, modes table/slice, RT60, impulse response, basic metrics.
- Point listeners and listening zones.
- A/B scenario comparison and basic insights.
- Initial room templates.
- Save/load, autosave, project export/import.
- CSV/PNG export.
- Validation and error states.
- Unit/integration/E2E test suite.

**Exit criteria:** all release-blocking acceptance criteria in Section 6.3 pass.

### Phase 2 — Product (4–6 weeks)

- Port tuning/level/Q UI refinements and advanced port modeling.
- Advanced response tools: target curves, measurement smoothing, and a phase-alignment assistant.
- Directivity presets and piston model refinements.
- Auralization with generated stereo IR and Web Audio playback.
- Report/print view with charts and coverage maps.
- Scenario difference view and richer insights.
- Auto-optimizer (separate feature after manual workflow is stable).
- More templates and onboarding polish.

**Exit criteria:** a user can complete a full design, listen to it, compare scenarios, and export a client-ready summary.

### Phase 3 — Pro (ongoing)

- FDTD bass solver for arbitrary rooms.
- Higher-order/beam-traced early reflections.
- CLF/measured polar data import.
- REW measurement import and comparison.
- Cloud accounts, sharing, and optional cloud compute.
- Multi-room transmission.
- Sloped ceilings, openings, diffraction.
- HRTF/binaural auralization.
- Mobile/tablet sketching.

---

## 18. Success criteria

A v1 release is successful when a new user can:

1. Create a room from a template in under 2 minutes.
2. Sketch and extrude a desk or column in under 5 minutes.
3. Union two objects into one named object and explode them.
4. Place two full-range speakers and a subwoofer, set front/port faces, and run a standard simulation in under 10 seconds.
5. See frequency response at a seat, a coverage heatmap, room modes, and RT60.
6. Compare two speaker positions side by side and identify the more uniform one.
7. Save, reload, export, and import the project without data loss.
8. Understand the result well enough to explain it to someone else using the on-screen insights.

---

## 19. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Geometry robustness (self-intersections, coplanar booleans) | Blocks simulation, erodes trust | Restrict to extrusions; Manifold CSG; validation with actionable errors; repair hints |
| Physics credibility | Users compare to REW/EASE and distrust results | Validation suite; confidence labels; relative-comparison framing; REW import in Phase 3 |
| Browser performance | Slow simulation, memory limits | Workers/WASM; preview tier; caching; receiver caps; cancellation |
| Speaker data availability | Directivity/phase unknown | Presets; piston model; minimum-phase estimation; clear “estimated” labels |
| Scope creep | Delays v1 | Manual compare first; explicit non-goals; phase gates |
| UX complexity | “Simple” becomes overwhelming | Progressive disclosure; templates; plain-language insights; command palette |
| Cross-browser WASM/threads | Features unavailable | Single-thread fallback; feature detection; browser support matrix |
| Modal accuracy in arbitrary rooms | Misleading bass prediction | Clear warning; bounding-box approximation in v1; FDTD in Phase 3 |
| Absolute SPL calibration | Results not comparable to measurements | Relative mode default; calibration fields; confidence labels |

---

## 20. Future extensions

- FDTD/FEM/BEM bass solver for arbitrary rooms.
- Beam tracing and higher-order image sources.
- Measured directivity and CLF import.
- REW/measurement import and overlay.
- Automatic speaker-position optimization with constraints.
- Auralization with HRTF and head tracking.
- Multi-room sound transmission and coupled volumes.
- Sloped ceilings, doors, windows, and openings as acoustic paths.
- Diffraction around edges and objects.
- Line arrays, cardioid subwoofers, and multi-driver models.
- Cloud project sharing and real-time collaboration.
- Mobile/tablet sketching with pen input.
- PDF reports and client presentations.
- Speaker and material community libraries.

---

## Appendix A — Key formulas

**Speed of sound**

\[
c \approx 331.3 + 0.606\,T\ (^\circ C)
\]

**Direct sound**

\[
H_{direct}(f)=\frac{D(\theta,\phi,f)H_{source}(f)}{r}
e^{-j2\pi fr/c}e^{-\alpha_{air}(f)r}
\]

**Reflection coefficient**

\[
R(f)=\sqrt{1-\alpha(f)}e^{j\phi(f)}
\]

**Sabine RT60**

\[
T_{60}=0.161\frac{V}{A}
\]

**Eyring RT60**

\[
T_{60}=\frac{0.161V}{-S\ln(1-\bar\alpha)+4mV}
\]

**Schroeder frequency**

\[
f_s\approx 2000\sqrt{\frac{T_{60}}{V}}
\]

**Rectangular room modes**

\[
f_n=\frac{c}{2}\sqrt{
\left(\frac{n_x}{L_x}\right)^2+
\left(\frac{n_y}{L_y}\right)^2+
\left(\frac{n_z}{L_z}\right)^2}
\]

**Circular piston directivity**

\[
D(\theta,f)=\frac{2J_1(ka\sin\theta)}{ka\sin\theta}
\]

**Port band-pass approximation**

\[
|H_{port}(f)|=
\frac{(f/f_b)^2}
{\sqrt{(1-(f/f_b)^2)^2+(f/(Qf_b))^2}}
\]

**Coherent summation**

\[
H_{total}(f)=\sum_s H_s(f)
\]

**Incoherent summation**

\[
|H_{total}(f)|^2=\sum_s |H_s(f)|^2
\]

---

## Appendix B — Glossary

- **Axial mode** — room mode with one non-zero index; strongest bass resonance type.
- **C50/C80** — clarity ratios comparing early to late energy at 50 ms/80 ms.
- **CLF** — Common Loudspeaker Format; a standard for measured polar data.
- **Critical distance** — distance where direct and reverberant energy are equal.
- **Directivity** — how a source’s output varies with angle and frequency.
- **D/R ratio** — direct-to-reverberant ratio.
- **FDTD** — finite-difference time-domain; a wave-based simulation method.
- **Image source** — a mirrored source used to compute specular reflections.
- **Modal region** — low-frequency range where room resonances dominate.
- **RT60** — time for sound to decay by 60 dB.
- **SBIR** — speaker-boundary interference response; cancellation from a nearby boundary.
- **Schroeder frequency** — approximate boundary between modal and geometric behavior.
- **STI** — speech transmission index.
- **Tangential mode** — room mode with two non-zero indices.
- **Oblique mode** — room mode with three non-zero indices.

---

## Appendix C — References

- ISO 9613-1: Acoustics — Attenuation of sound during propagation outdoors.
- Kuttruff, H. *Room Acoustics*.
- Sabine, W. C. *Collected Papers on Acoustics*.
- pyroomacoustics: image-source and room-acoustics reference implementation.
- Common Loudspeaker Format (CLF) documentation.
- Manifold-3D documentation.
- Three.js and React Three Fiber documentation.
- Web Audio API specification.
- Room EQ Wizard (REW) measurement export formats.

---

## Appendix D — Decisions locked by this spec

- Working title: **Room Response Studio**.
- Project location: `C:\Users\Robert\source\repos\room-response-studio`.
- Desktop-first; latest two versions of major browsers; WebGL2 + WASM.
- Local-first; no backend or accounts in v1.
- Standard hybrid solver is the v1 default.
- Manual compare workflow is v1; auto-optimizer is Phase 2.
- Subwoofer and full-range are the only v1 speaker types; the model is extensible.
- Auralization is Phase 2 and is not a v1 release blocker.
- PDF reports are Phase 2.
- FDTD, beam tracing, CLF/REW import, cloud, and mobile are Phase 3 or later.
