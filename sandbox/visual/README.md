# Visual V1 — Renderer + Camera Sandbox

Presentation-only calibration environment for the TouchlineSimulator match view.
Uses the frozen PixelLab assets from `assets/visual_v1/` (via `MANIFEST.json`)
and its own fixture data. **No engine code is imported; nothing here simulates.**

## Run

```sh
cd "<repo root>"
python3 -m http.server 8123
# open http://localhost:8123/sandbox/visual/
```

(Any static file server rooted at the repo works; `file://` will not, because the
sandbox fetches the manifest and frames over HTTP.)

## What it shows

- Regulation 105×68 m pitch: geometry and all markings are procedural
  (touchlines, goal lines, halfway, centre circle/spot, penalty areas, six-yard
  boxes, penalty spots/arcs, corner arcs) plus temporary procedural goals.
- Grass colours come from the frozen tileset: the pure pitch and perimeter
  tiles (sliced strictly by metadata `bounding_box`) supply exact pixel-art
  palettes, and the surface is deterministic low-frequency value-noise over
  those palettes (no per-metre tile stamping, so no 32 px periodicity), with a
  hash-dithered pitch/perimeter transition band and pitch-scale alternating
  mowing bands on top. Texture only — never geometry; source PNGs untouched.
- 22 players from the frozen character (idle rotations, Jogging template + custom
  SE jog fill, Full Sprint), ground-anchored at canvas-centre + constant foot
  offset (`pivots.json`), nearest-neighbour only, no depth scaling.
- TRUE PERSPECTIVE camera: sim coordinates (x, y) are points (x, 0, y) on a
  flat 3D ground plane; a perspective camera sits above and outside the near
  sideline (no yaw/roll — it pans by translating along the sideline) looking
  diagonally down. Grass is scanline-homography projected; markings, goals and
  the debug grid are vector geometry projected vertex-by-vertex through the
  same camera (the centre circle becomes a true perspective conic). Player
  sprites stay unwarped screen-facing billboards at their projected foot
  point, constant screen size with depth, nearest-neighbour only.
- Live controls: camera height, sideline distance, vertical FOV, look-target
  depth offset, tracking smoothing, player scale, jog/sprint FPS + playback
  rate, pause, camera modes (static / ball / play), debug anchors / grid /
  tracking marker, and seven test scenes (incl. Camera calibration).

- Stadium (composition v2): a geometry-first shell projected through the same
  camera as the pitch — board-shaped pitch-side barrier (no ads), stand front
  wall, raked lower + upper seating tiers rendered row-by-row at true 3D
  positions, walkway, railings, dark backing and roof edge, near-side barrier
  strip in front of gameplay. The frozen PixelLab stand strip is used ONLY as
  texture material: two measured seat-row bands (its white strips excluded)
  are pre-mirrored and mapped continuously across the seating with exact
  per-row parallax. Aisle breaks at fixed world x cut through all rows.
- Goals V2: rectangular procedural 3D cage — regulation 7.32×2.44 m front
  frame, 2.0 m net depth, 2.3 m rear frame — plus a deformable spring-mesh
  net (back/top as one 11×8 grid, two 5×5 side nets; attachments pinned).
  Net impacts produce a localized bulge and damped outward ripple with no
  permanent deformation (visual physics only; never affects scoring).
  Developer buttons fire synthetic impacts; `Reset net` zeroes the mesh.
  The generated goal art stays disabled (front-facing; file preserved).

### Future engine contract (net ripple — do not wire yet)

When live integration is authorized, the engine emits one fire-and-forget
presentation event per ball/net contact:

```js
netImpact(side, pos, vel, strength?)
// side     0 = left goal (x=0), 1 = right goal (x=105)
// pos      contact point, world {x, h, y}  (pitch-x m, height m, pitch-y m)
// vel      incoming ball velocity {x, h, y} in m/s
// strength optional normalized 0..1; derived from |vel|/30 when omitted
```

The renderer owns all deformation state; the event can never influence
authoritative ball physics or scoring. (`window.netImpact` is exposed for
console testing.)

## Status

CAMERA UNLOCKED — VISUAL REVIEW REQUIRED. No values here are final; the point of
this sandbox is to choose them visually. Chosen values get recorded in
`assets/visual_v1/CAMERA_TARGET.md` once approved.
