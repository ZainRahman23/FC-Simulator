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
- Grass is the frozen Wang tileset, sliced strictly by metadata `bounding_box`,
  with pitch-scale alternating mowing bands. Texture only — never geometry.
- 22 players from the frozen character (idle rotations, Jogging template + custom
  SE jog fill, Full Sprint), ground-anchored at canvas-centre + constant foot
  offset (`pivots.json`), nearest-neighbour only, no depth scaling.
- FC-style high sideline broadcast camera: pure presentation transform;
  `tilt` compresses the ground plane only, sprites are never distorted.
- Live controls: tilt, zoom, field coverage, tracking smoothing, player scale,
  jog/sprint FPS + playback rate, pause, camera modes (static / ball / play),
  debug anchors / grid / tracking marker, and six test scenes.

## Status

CAMERA UNLOCKED — VISUAL REVIEW REQUIRED. No values here are final; the point of
this sandbox is to choose them visually. Chosen values get recorded in
`assets/visual_v1/CAMERA_TARGET.md` once approved.
