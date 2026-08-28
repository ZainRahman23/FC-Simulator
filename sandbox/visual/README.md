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
- Goals V3: production rectangular box goal — regulation 7.32×2.44 m front
  frame (substantial round-capped white posts/crossbar with darker edge pass
  and base plates), 2.1 m deep support cage (rear uprights, rear upper
  cross-member, upper/ground depth rails, rear ground rail; thinner grey),
  approximately horizontal roof. Net is a dense deformable mesh: back 20×12,
  roof 20×8, sides 8×12 (≈700 verts/goal), with subtle baked resting sag
  (roof 7 cm, back/side 5 cm bow; attachment edges exactly on structure).
  Depth-aware simplification halves grid-line density and fades cords when
  the goal is small on screen. Impacts bulge/ripple locally and relax back to
  the sagged rest shape (visual physics only; never affects scoring). The
  generated goal art stays disabled (front-facing; file preserved).
- Camera pitch: explicit downward look angle (12–45°, presets 15–35°),
  independent of height/distance/FOV/yaw/tracking/depth-offset; z-tracking
  adds only a follow trim relative to the slider's reference. Default 22° ≈
  the previously derived CAMERA_V1 angle. Nothing is locked.

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

## Live match visual preview — RAIL CAMERA (approved architecture, frozen)

The match renderer uses a physically translating camera rig: the single
authored CAMERA_V1 pose (height 30 m, sideline distance 43 m, pitch 22°,
yaw 0°, FOV 28°) whose ONLY runtime pose variable is longitudinal position
along the touchline. Orientation, lens and the camera→target vector are
invariant. Implementation uses the exact identity
`render(pos0 + travel) == projectFixed(world − travel)`: every world point
is shifted by −travel and projected through the byte-identical CAMERA_V1
basis, then uniform zoom about screen centre. Pitch, markings, stadium,
goals, players, ball and shadows all pass through this one shared
projection per frame. Players keep a stable authored size; zoom scales
everything in exact tandem.

Goals (V2.2 world panels): the accepted V2.2 surgical artwork's three
measured panels (mouth / roof / near-side net) are mapped once, at
authoring time, by exact 4-point homographies onto the authoritative 3D
goal quads — mouth plane ON the goal line spanning the 7.32 m mouth,
2.0 m cage extending outward, right goal original art, left goal the
geometric mirror. At runtime each panel is ordinary world geometry
rendered as texture triangles through the same shared projection the goal
line uses: zero goal-specific camera compensation, tracking, billboard
fitting or scaling. Post feet sit exactly on the goal line at every rail
position (`tools/validate_goal_rail.py`: 0.000000 px at rail 20/52.5/85 m,
interior warp ≤ 0.68 px). The triangle corners are plain world points, so
the future net-ripple (`netImpact` contract above) displaces them directly.

## Live match visual preview (phase 4)

Watches an ACTUAL simulator match (deterministic fixture, seed 20260827,
Liverpool v Everton) through the accepted visual system. The engine remains
fully authoritative: the viewer starts a match via the untouched Touchline
API and consumes the server's read-only renderer keyframes
(`advance {frames:true}` — per-second `[clock, ball, possession, players]`),
interpolating between them for smooth playback. Nothing writes back.

```sh
.venv/bin/python server.py                    # 1) engine server (untouched)
python3 sandbox/visual/serve_match.py         # 2) static + /api proxy
# open http://127.0.0.1:8124/sandbox/visual/match.html
```

Determinism/neutrality: `python3 sandbox/visual/tools/verify_determinism.py`
runs the fixture three times (frames on/on/off) and digest-compares score,
event ledger, player stats, possession and all 5,400 keyframes.

Goal V2.2 renders at both ends, anchored by its post-base points onto the
projected authoritative 7.32 m mouth (mirrored for the far end); markings
stay procedural. Net ripple is not wired in the preview — future connection:
engine ball/net contact -> `netImpact(side, pos, vel, strength?)`.

## Status

CAMERA UNLOCKED — VISUAL REVIEW REQUIRED. No values here are final; the point of
this sandbox is to choose them visually. Chosen values get recorded in
`assets/visual_v1/CAMERA_TARGET.md` once approved.
