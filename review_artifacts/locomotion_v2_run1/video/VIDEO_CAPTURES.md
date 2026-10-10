# Locomotion V2 — archival video captures (10 Oct 2026)

Two documentation clips of the straight-line locomotion, made before the baseline freeze, plus an unlabeled companion of the first.

**How they were made.**
- **Documentation only.** Nothing in the viewer, the locomotion, the cameras or the simulation was changed to make them. The capture injects its clip configuration at runtime.
- **A deterministic, frame-exact capture of the RUN-1 viewer itself**, not a screen recording:
  - For frame *k* the viewer's own time is set to exactly *t₀ + k/60 s* (`RUN1V.set`, i.e. its own `rv1Update` + `rv1Render`).
  - The frame is copied straight from its WebGL canvas.
  - So no cursor, browser chrome, menus, HUD, debug overlay, loading hitch, dropped frame or repeated frame can appear.
- **Labels** are drawn by the capture tool on the copied frame, never by the viewer.
- **Encoding:** H.264 at a constant 60 fps, with no interpolation and no retiming.

## The files

| file | contents | duration | frames | resolution | size | sha256 |
|---|---|---|---|---|---|---|
| `LOCOMOTION_V2_FINAL_LADDER.mp4` | **Clip 1, labeled (archival master)**: the four regimes together | 7.000 s | 420 @ 60 fps | 2940 × 1302 | 13.5 MB | `cb5b7c68…203d01c9` |
| `LOCOMOTION_V2_FINAL_LADDER_UNLABELED.mp4` | Clip 1, the same frames with no text at all | 7.000 s | 420 @ 60 fps | 2940 × 1302 | 13.3 MB | `ee3b5c75…50a9c358` |
| `LOCOMOTION_V2_VERSION_HISTORY.mp4` | **Clip 2**: V1 → RUN-1.0 → RUN-1.1 → RUN-1.2 (= final at 5.5 m/s) | 7.000 s | 420 @ 60 fps | 2940 × 1302 | 11.8 MB | `e3c149c6…8c61e932` |

- Full checksums are in `sha256` below.
- **Per-frame records:** `*.capture.json` holds the viewer time of every frame and, for every lane and frame, its speed, pitch position, gait phase and a fingerprint of all joint matrices.
- **Verification results:** `*.verify.json`.
- **Playback-check sheets** made from the *decoded* files, one frame every 0.5 s: `*_playback_check.jpg`.

## Status and correspondence to the frozen baseline

- **Approved by the user (10 Oct):**
  - `LOCOMOTION_V2_FINAL_LADDER.mp4` is the canonical, labeled straight-line locomotion record;
  - `_UNLABELED` is the clean / blind-viewing record;
  - `LOCOMOTION_V2_VERSION_HISTORY.mp4` is the historical comparison. The decision not to make a fifth, duplicate history panel was approved.
- **The lanes shown are the frozen Locomotion V2 straight-line baseline** (`run1_gait_v13.js`, `../LOCOMOTION_V2_STRAIGHT_BASELINE.md`). This covers all of Clip 1 and Clip 2's RUN-1.2 = RUN-1.3 cell.
  - The captures were rendered by `run1_gait.js` blob 010212622e05, which is the baseline's verbatim block.
  - An independent replay with the frozen file itself matches every captured lane-frame: `../baseline/final/video_*_vs_frozen_baseline.json`.
  - Clip 2's V1, RUN-1.0 and RUN-1.1 cells are the preserved historical implementations.

## Clip 1 — the final locomotion ladder

- **Lanes:** the viewer's own default preset `ladder` (run1_viewer.js `RV1_PRESETS.ladder`), all on the final implementation **RUN-1.3** (`run1_gait.js`):

| screen row (far → near) | regime | commanded speed | parameter key |
|---|---|---|---|
| 1 (top) | **ALL-OUT** | 9.5 m/s | `ALLOUT` |
| 2 | **FAST RUN** | 7.8 m/s | `SPRINT` (RUN-1.2's, unchanged) |
| 3 | **JOG** | 5.5 m/s | `RUN` (RUN-1.2's, unchanged) |
| 4 (bottom) | **LOW** | 3.0 m/s | `JOG` (RUN-1.1's jog, unchanged) |

- **Composition** follows the reference screen recording (10 Oct, 17:40). It is the viewer's own wide layout at 1470 × 651 CSS px, rendered at 2× device pixels.
  - **Left, 941 px wide:** the gameplay camera, CAMERA_V1 rail camera (`rv1GameCam`: 30 m high, 43 m behind the touchline, 22° pitch, 28° FOV) at zoom **1×**, following the lanes' mean position like the match camera.
  - **Right:** two close views, `front34` (`rv1CloseCam`, azimuth 35°, elevation 10°, 5.4 m): ALL-OUT on top, FAST RUN below.
- **Run:** direction "across" (→), the Vinícius rig, playback 1× (real time).
- **Time window:** viewer time 1.000 → 7.983 s, the 7 s window your recording showed.
  - All lanes start at mid-loop alignment and pass together at viewer t = 4.5 s, i.e. at 3.5 s into the clip.
  - At the start ALL-OUT trails LOW by ~23 m; at the end it leads by ~23 m. That makes the relative travel speeds obvious.
- **Labels (master only).** Your recording used the viewer's moving lane tags. The archive instead uses a **static legend**: one line per lane, at that lane's fixed screen row on the left edge of the gameplay view. The rail camera only translates along the lanes, so each row never moves, and the legend never crosses a runner. Plus one title per view.
- **Unlabeled companion.** The identical frames with no text, for blind viewing.
  - **Recommended master: the labeled file.** An archive should identify itself years from now without the metadata.

## Clip 2 — the locomotion version history

- **One commanded speed: 5.5 m/s** (the long-standing RUN-1 comparison speed) for every version. This is a version comparison, not a speed comparison.
- **Lanes** (injected at capture time; the viewer source has no such preset):

| cell | version | implementation | commit |
|---|---|---|---|
| top-left | **V1** | Locomotion V1, the unmodified runtime (`ofActorTick`, 60 Hz ticks, V1.3 presentation) | — (`anim3d/of_loco.js` @ 9d57d460) |
| top-right | **RUN-1.0** | the original RUN-1, frozen copy `run1_gait_orig.js` | 3caa5d58 |
| bottom-left | **RUN-1.1** | the effort pass, frozen copy `run1_gait_v11.js` | 83a457db |
| bottom-right | **RUN-1.2 = RUN-1.3 final** | the final code `run1_gait.js` | bdab1f5f |

- **Why four, not five.** At 5.5 m/s the final RUN-1.3 is **bit-identical** to RUN-1.2: same pose hash, `../allout/final/frozen_and_identity.txt` row "5.50 m/s … IDENTICAL". RUN-1.3 differs from RUN-1.2 only above 8.0 m/s. So one cell shows both, labelled as identical. A fifth lane would have been a duplicate presented as a "difference".
  - What the final version adds, the ALL-OUT regime, is a speed feature. It is documented by Clip 1.
- **Composition:** a 2 × 2 grid of the same close camera for every version: `side` (`rv1CloseCam`, azimuth 90°, the runner's left, elevation 4°, 5.2 m, aimed at 0.95 m above the runner's root).
  - The same rig, direction, playback rate (1×, real time) and time window (viewer t 1.000 → 7.983 s).
  - Rendered in two passes per frame at the same viewer time: two cells per pass, because the viewer has two close-view slots. Re-rendering at the same time recomputes the identical pose.
- **Labels:** a static version title per cell, and a caption.

## Source state

- **Branch:** `prototype/locomotion-v2-run1`, HEAD **15574a4c** plus the capture tools. The tools are committed with these videos and touch no viewer or locomotion file.
- **Blob hashes of the files that determine what is shown:**

| file | git blob | last commit |
|---|---|---|
| `sandbox/visual/run1/run1_gait.js` (RUN-1.3) | `010212622e05…` | bdab1f5f |
| `sandbox/visual/run1/run1_gait_v12.js` (RUN-1.2 frozen) | `d37542a64c8e…` | e023b111 |
| `sandbox/visual/run1/run1_gait_v11.js` (RUN-1.1 frozen) | `453ffa7ee94b…` | decc5819 |
| `sandbox/visual/run1/run1_gait_orig.js` (RUN-1.0 frozen) | `d1f9721297ef…` | 0ecdbd65 |
| `sandbox/visual/run1/run1_viewer.js` | `c0053580c880…` | bdab1f5f |
| `sandbox/visual/run1.html` | `cea1c0af6743…` | bdab1f5f |
| `sandbox/visual/anim3d/of_loco.js` (V1) | `44b3f46cfaf1…` | 9d57d460 |
| `assets/characters/outfield/vinicius/rig.json` | `6ca64389d442…` | 7cba78db |

- **Renderer:** HeadlessChrome 154 (ANGLE / Metal), device-pixel-ratio 2, viewer served by `python3 -m http.server 8317`.
- **Encoder:** ffmpeg 7.1 (the `imageio-ffmpeg` static build).
  - Input: PNG sequence at `-framerate 60`.
  - Filter: `scale=in_range=full:out_range=tv:out_color_matrix=bt709,format=yuv420p,setparams=…bt709`.
  - Codec: `libx264 -preset slow -crf 16 -profile:v high`, BT.709 tags, `-g 60 -r 60 -movflags +faststart`.
- **Verifier:** Node 22 (V8 12.4).

## Verification (`*.verify.json`)

**1. The motion is the viewer's motion, at the stated times.**
- An independent replay ran the viewer in Node: the page's own scripts in the page's order, minus the GPU-drawing file, with the same lanes, speeds and frame times.
- It was compared with the browser's joint matrices for every lane of every frame:

| clip | lane-frames | bit-identical | rest |
|---|---|---|---|
| ladder | 1680 | 973 | ≤ 0.016 float32 steps at matrix scale (≤ 1.9 × 10⁻⁹) |
| history | 1680 | 1151 | ≤ 1.1 × 10⁻¹³ |

- The residue is last-bit rounding between Chrome's and Node's V8 maths in terms that are mathematically zero, about a billionth of a pixel. It is not a different pose.
- Every frame's viewer time is exactly *1.000 + k/60 s*, so no animation time was dropped or repeated, and there is no start hitch: frame 0 is a fully computed frame at t = 1.000 s.

**2. The files play back as stated.**

| file | decodes to | first → last frame | per-frame match to its source frame (min / mean) | near-duplicate frames | verdict |
|---|---|---|---|---|---|
| LADDER | 420 frames, 7.000 s, 60 fps CFR, H.264 High, yuv420p BT.709 | 0 → 6.983 s | 38.5 / 38.9 dB | 0 | **PASS** |
| LADDER_UNLABELED | the same | 0 → 6.983 s | 39.1 / 39.6 dB | 0 | **PASS** |
| VERSION_HISTORY | the same | 0 → 6.983 s | 39.1 / 39.5 dB | 0 | **PASS** |

- **Per-frame match:** PSNR of each decoded frame against its own source frame, in RGB. A dropped, repeated or reordered frame would collapse it to the 24–27 dB that neighbouring source frames score against each other (measured). ~39 dB is H.264 4:2:0 at CRF 16.
- **Near-duplicates:** checked with `mpdecimate`.
- **Visual check of the decoded frames** (`*_playback_check.jpg`):
  - the ladder: correct lanes and speeds, all four runners always in view, the legend static on the lane rows, no cursor, UI or overlay;
  - the history: the correct versions in their cells.

## Reproduce

```sh
cd ~/Downloads/"FC Simulator worktrees"/locomotion-v2-run1 && python3 -m http.server 8317 --bind 127.0.0.1 &   # the viewer
cd sandbox/visual/run1/tools
export PUPPETEER_NODE_MODULES=<dir with puppeteer-core> FFMPEG=<ffmpeg 7.x with libx264>
node run1_video.cjs --clip ladder  --out ../../../../review_artifacts/locomotion_v2_run1/video --frames /tmp/ladder_frames --unlabeled 1
node run1_video.cjs --clip history --out ../../../../review_artifacts/locomotion_v2_run1/video --frames /tmp/history_frames
node run1_video_verify.cjs --meta ../../../../review_artifacts/locomotion_v2_run1/video/LOCOMOTION_V2_FINAL_LADDER.capture.json --frames /tmp/ladder_frames
node run1_video_verify.cjs --meta ../../../../review_artifacts/locomotion_v2_run1/video/LOCOMOTION_V2_VERSION_HISTORY.capture.json --frames /tmp/history_frames
```

- **The same scenes, live in the viewer:**
  - Clip 1 = `run1.html?lanes=ladder`, with the close views set to ALL-OUT · front34 and FAST RUN · front34.
  - Clip 2's lanes = the `cmp4` preset at 5.5 m/s minus its RUN-1.2 lane, which is identical to its RUN-1.3 lane at that speed.
- **Clip definitions** (lanes, layout, time window, labels): `sandbox/visual/run1/tools/run1_video_clips.cjs`.

## sha256

```
cb5b7c68cbdd9cb43a738da2b5b67e75f743ac6cfd83733b0ef51127203d01c9  LOCOMOTION_V2_FINAL_LADDER.mp4
ee3b5c752c7ef55dbacca1ea3d1a1b556f4f8198745fef77302b8ae250a9c358  LOCOMOTION_V2_FINAL_LADDER_UNLABELED.mp4
e3c149c64246d79fedfb8d899d9c52609c6eaeef896d78ece4f3b3b18c61e932  LOCOMOTION_V2_VERSION_HISTORY.mp4
```
