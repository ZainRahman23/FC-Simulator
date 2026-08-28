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

- Stadium + goals (phase 3): the PixelLab grandstand strip renders as a
  perspective-correct vertical wall at z = −8 m (mirror-tiled along x, seam-
  free panning, scenery only); PixelLab goal art is an unwarped billboard
  anchored to the authoritative goal centres (right goal mirrored at runtime,
  baked grass chroma-stripped at load — stored originals untouched). Goal
  geometry stays procedural; the red debug footprint appears with Anchors.

## Status

CAMERA UNLOCKED — VISUAL REVIEW REQUIRED. No values here are final; the point of
this sandbox is to choose them visually. Chosen values get recorded in
`assets/visual_v1/CAMERA_TARGET.md` once approved.
