# ASTRA HANDOFF — visual character / rendering pipeline experiment (vertical slice: the approved V6 FAR_DIVE)

Self-contained package. Everything an independent agent needs to investigate how ONE approved skeletal goalkeeper motion becomes a
production-quality Touchline character presentation. Nothing here is a design decision about the answer; it is the authoritative
technical / art-reference input. Repository: branch `prototype/3d-animation-pipeline` (see §M for exact source paths).

## 0 · The question Astra is being asked to solve (stated neutrally)

> What character / presentation pipeline should Touchline use so that this approved V6 skeletal motion becomes a beautiful
> 2.5D / pixel-style goalkeeper at gameplay scale, while remaining highly customizable and scalable to a large animation library?

Competing priorities, none pre-weighted: (1) visual quality / aesthetics; (2) compatibility with the current Touchline pixel / 2.5D
environment (§E); (3) faithful preservation of the skeletal motion (§B); (4) player / team customization (§H); (5) scalability
across many animations; (6) scalability across many players; (7) directional / orientation flexibility (§I); (8) temporal
stability at low resolution (the keeper is ~35 px tall at gameplay scale); (9) performance; (10) maintainability.

Approaches Astra may investigate include, not exclusively: authored pixel sprites derived from the skeletal reference; a
purpose-built stylized 3D character rendered to pixel / 2.5D output; a fully 3D pixel-art-like character skinned to the existing
skeleton; low-poly / NPR / toon / palette-quantized rendering; hybrid 3D + pixel processing; camera-aware silhouette treatment;
layered / customizable sprite construction; procedural / material-based kit / skin / hair customization; or something better.
Astra should feel free to prototype several and recommend one. This package does not tell Astra what to choose.

## N · Architectural invariants (read first)

**SIMULATION DECIDES WHAT HAPPENS. ANIMATION VISUALLY EXPLAINS WHAT HAPPENED.**

Any visual experiment must preserve: simulation neutrality (the renderer never writes gk / ball state); the authoritative root
(`gk.x, gk.y` per tick — the presentation root is derived from it and reconciled back); the authoritative ball (position, velocity,
contact, outcome — never moved by presentation); the authoritative contact (tick 63 here: hand, weak parry through); deterministic
animation (no presentation RNG; closed-form in simulation time, identical at any draw rate); animation ON / OFF outcome neutrality
(gates: `sandbox/visual/tools/anim3d/gk3d_gate.js`, `tools/gk_anim/gk_anim_gate.js --anim off`). Astra may change HOW the character
is rendered; Astra may NOT change WHAT happened. V6 itself is frozen: skeleton motion, root, timing, contact tick, IK, landing,
recovery, ball — do not alter them; the regression check is fixture 42's manifest (28 joints × 320 ticks bit-identical).

## 1 · The chosen motion: V6 FAR_DIVE, fixture 42 (primary) + fixture 49 (left mirror, secondary)

- **Fixture 42** `"S4 K2 high tip-up (POWER 28 m/s under the bar)"` (`GK_SCENARIOS[42]`, `sandbox/visual/match.js`): shot from
  (86, 34) aimed at (105, 32.5), capability band K2. This is THE approved V6 reference: it was accepted at full speed from the
  gameplay camera and every later change is regression-checked against it (frozen). The keeper faces −x (west, toward the pitch);
  the ball crosses at y 32.7 — north of him, i.e. on his anatomical **RIGHT** (his right = (−sin f, cos f) = (0, −1) = north). The
  dive is authored RIGHT-handed (`GK_CLIP_FAR_DIVE`, side RIGHT). Because the dive runs along the goal line (world y) and the camera
  looks across the pitch from the south touchline, this rightward dive projects toward **screen up-left** (GOAL_LEFT); "far right"
  in the anatomical sense is fixture 42; "far right on screen" is its mirror.
- **Fixture 49** `"M3 far dive LEFT TOP (synthK lat −1.6 z 2.0 18 m/s)"`: the LEFT mirror of the same V6 clip (`poseMirror`), the
  keeper's left = south = screen down-right (GOAL_RIGHT). Its own timeline (commit tick 15, contact tick 45). Exported as the
  secondary because the exporter is generic; the experiment should focus on 42.
- Timeline of fixture 42 (60 ticks / s; every tick is a real simulation tick): SET_CROUCH 0 → READ 28 → WEIGHT_SHIFT 31 → LOAD 35 →
  commit tick 38 (t 0.641 s; tier HIGH/FULL-STRETCH REACHABLE, action DIVE-HIGH, target (101.985, 32.738, 2.679), execTime 0.461 s)
  → PLANT 41 → PUSH_OFF 43 → TOE_OFF 45 → EARLY_FLIGHT 47 → MID_FLIGHT 53 → FULL_EXTENSION 60 → **CONTACT 62–65 (authoritative
  contact tick 63, t 1.050 s, HAND volume, outcome WEAK PARRY (through), contact point (101.874, 32.747, 2.671), ball in 26.7 m/s →
  out 13.2 m/s)** → FOLLOW 66 → DESCENT 74 → IMPACT 90 → ABSORB 100 → SETTLE 114 → BRACE 138 → PUSH_UP 156 → HALF_KNEEL 174 →
  CROUCH 195 → RISE 216 → REPOSITION 246 → SET 300.

## A · Exact skeleton (`machine_readable/skeleton_v6_default_H1.90.json`; source `sandbox/visual/anim3d/skeleton.js`)

23 bones, height H = 1.90 m (the simulation keeper's height in the fixtures; every offset / length is a fraction of H —
`definitionTable` in the JSON is the height-fraction table `SKEL_DEF`, `bones[]` the metres for H 1.90). Character frame: **+x =
the character's RIGHT, +y = up, +z = forward (facing)**, right-handed, metres. Bind / rest pose = all eulers zero (`bindJointsCharacter`
gives every joint / tip in the character frame; `inverseBind` the per-bone inverse bind matrices, column-major 4×4). Poses are
`{ bone: [pitch, yaw, roll] deg }` applied in the parent-aligned frame (`M4.euler`, bind rotations identity) — clips are rotation-only
plus a pelvis translation, so they retarget to any proportions. Root = the simulation root on the pitch (ground point), forward =
facing; `rootMatrix` per tick (below) places the character frame in the 3D world.

| bone | parent | offset (m, parent frame) | bind dir | length m | radius m | part |
|---|---|---|---|---|---|---|
| root | — | 0,0,0 | +y | 0 | — | — |
| pelvis | root | 0, 0.950, 0 | +y | 0.114 | 0.172 | shorts |
| spine | pelvis | 0, 0.114, 0 | +y | 0.228 | 0.172 | shirt |
| chest | spine | 0, 0.228, 0 | +y | 0.266 | 0.192 | shirt |
| neck | chest | 0, 0.266, 0 | +y | 0.095 | 0.061 | skin |
| head | neck | 0, 0.095, 0 | +y | 0.228 | 0.131 | skin |
| hair | head | 0, 0.133, −0.0095 | +y | 0.095 | 0.134 | hair |
| clavicle_R / L | chest | ±0.057, 0.228, 0 | ±x | 0.190 | 0.051 | shirt |
| upperArm_R / L | clavicle | ±0.190, 0, 0 | −y | 0.323 | 0.071 / 0.056 | shirt |
| foreArm_R / L | upperArm | 0, −0.323, 0 | −y | 0.285 | 0.061 | shirt |
| hand_R / L | foreArm | 0, −0.285, 0 | −y | 0.114 | 0.071 | gloves |
| thigh_R / L | pelvis | ±0.1805, 0, 0 | −y | 0.456 | 0.096 / 0.086 | shorts |
| shin_R / L | thigh | 0, −0.456, 0 | −y | 0.418 | 0.076 | socks |
| foot_R / L | shin | 0, −0.418, 0 | (0, −0.30, 0.954) | 0.190 | 0.061 | boots |
| toe_R / L | foot | 0, −0.057, 0.1805 | +z | 0.076 | 0.040 | boots |

Radii are the capsule / loft girths of the current test body (scaled by H / 1.88 × width) — a technical fact about the test mesh,
not a target. World frames: pitch (x east, goal line at x ≈ 105; y north → south; z up) and the GL 3D frame (x = pitch x, y = height,
z = −pitch y). `bones[].world` matrices in the motion export are in the GL frame; joints / tips are given in pitch coordinates.
Body scale assumptions: fixture keeper 1.90 m; variants `tall` (H × 1.06, legs 1.05, arms 1.07, width 0.97) and `short` (× 0.94,
0.96, 0.96, 1.14) exported as separate skeleton files; the sprite art calibration is a 1.88 m standing player = 100 opaque px of a
128 px sprite at reference depth.

## B · Exact V6 motion data (`machine_readable/motion_v6_fixture42_right_full.json`, 320 ticks; mirror 49 likewise)

Produced by the new generic exporter `sandbox/visual/tools/anim3d/gk3d_export_motion.js` (review tooling, reads only). Per tick:
`tick, t, phase, sub, mode, motion, side, reachHand, ikW, clipT`; authoritative `simRoot, simVel, simFacingDeg, ball, ballVel, held,
ballCtrl, shotActive, gkState, isContactTick, simHandTarget (the simulation's hand point the glove IK aims at), legTip`; presentation
`presFacingDeg, presRoot, presOffsetM, rootMatrix (4×4 column-major, character → GL world), pelvisOffsetLocal, pelvisWorld,
poseEulersDeg (the authored / blended pose BEFORE IK), bones{name: world (4×4 column-major, AFTER IK, ground clamp, brace, look-at —
exactly the matrices the skinned mesh is drawn with; skin matrix = world × inverseBind), joint, tip}, feet (plant locks and world
plant points), brace, groundLiftM, torsoAssistDeg, lookDeg, gloveResidualM, renderedBall, camera{rigX, travel, zoom}, keeperScreenPx,
ballScreenPx`. Top level: `commit` (full record), `contact` (full record incl. incoming / outgoing ball velocity), `skeleton`,
`camera`, `fixture`. The motion is generated procedurally (authored keys + launch / landing plans + IK); this file IS the
deterministic solved pose sequence — reconstruct the animation from `bones[].world` without guessing. Proof: `reference_renders/
04_skeleton_only_*` were drawn from this JSON alone (no browser) and match the in-page projection to 0.0005 px.

## C · 3D ball (`machine_readable/ball_trajectory_v6_fixture42.json`)

Physical and rendered radius 0.11 m (`GK_GRAPH.ballVisR`; the 2D sprite ball draws an exaggerated 0.19 m for readability — do not
copy that into 3D). Pitch → GL mapping `glW(p) = [x, z, −y]`. Before contact and after it the rendered ball IS the simulation ball
(`b.x, b.y, b.z`; z = 0 means resting on the pitch, so the sphere centre is clamped to y = max(z, r)). The 3D renderer owns the ball
draw when the SKELETAL_3D backend is active and the ball is held or within 3 m of the keeper (`gk3dOwnsBall`); beyond that the 2D
sprite ball draws (existing seam). Only a HELD ball gets a presentation transform (blend into the cradle; not the case in V6 — a
parry). The contact is the simulation's swept keeper → ball resolution (tick 63); the presentation never changes the outcome. The
file holds ball position + velocity per tick, the rendered ball, the contact and commit records, and the ball's screen position.

## D · Camera (`machine_readable/camera_v1.json`; source `sandbox/visual/match.js` `AUTHOR_DEFAULTS`, `buildFrozenBasis`, `fproj3`,
`sproj3`, `RIG`, `updateRig`; GL: `sandbox/visual/anim3d/gl_renderer.js` `glCamera`)

Perspective camera, single authored pose (CAMERA_V1): height 30 m, sideline distance 43 m (C.z = PITCH.h 68 + 43 = 111 in the
"world-height" frame used by fproj3: x = pitch x, y = height, z = pitch y), vertical FOV 28°, pitch 22°, yaw 0°, look-target depth
offset +3 m (target at pitch y 37), player sprite scale 0.60. Basis: r = (1, 0, 0), u = (0, 0.92718, −0.37461), f = (0, −0.37461,
−0.92718); fpx = (VIEW.h / 2) / tan(14°) = 1443.88 px; reference depth czRef = 79.85 m. Reference viewport VIEW 1280×720 (V-space);
screen (V-space) = (640 + fpx·cx/cz, 360 − fpx·cy/cz). Runtime: the only pose variable is the rail travel along the touchline
(`RIG.x`; `TRAVEL = RIG.x − 52.5`; the world is shifted by −travel then projected through the frozen basis) plus a uniform zoom about
the canvas centre: canvas px = (V − VIEW/2) · zoom · RES + canvas/2. Fixture 42 pins the rig to manual x = 88 (travel 35.5 m) and
zoom 1.25; RES 1 (headless), canvas 1100×900 in the review harness (the gameplay clip used everywhere is the 500×450 region at
(600, 150)). Sprites additionally scale with depth as (czRef / d)^0.40 (`DEPTH_ALPHA`, billboards only; the world projection is
untouched). The GL renderer reproduces sproj3 exactly: `glCamera` view = the same basis (GL frame, camera looks down −z) translated
by (C.x + travel, C.y, −C.z); proj = diag(2·fpx·s/canvasW, 2·fpx·s/canvasH, …) with near 1, far 400 (values in the JSON). The 3D
character is rendered to an offscreen target at 1 / pixelScale of the canvas and composited with nearest-neighbour sampling.
Legacy note: `assets/visual_v1/CAMERA_TARGET.md` records the sprite-era acceptance (player scale 0.85 then; 0.60 now).

## E · Existing Touchline art references (`art_reference/`) — "THIS is what Touchline currently looks like"

- `goalkeeper_base_idle/` — GK_BASE_V1 (frozen 2026-09-05), the canonical goalkeeper identity: 8 directions, 128×128, PixelLab Pro,
  low top-down view; kit, gloves, boots, skin, hair, outline and shading as approved. `goalkeeper_base_set/` — its SET state.
- `far_dive_right_sequence/` — the production sprite sequence RIGHT_FAR (keeper's RIGHT, screen up-left = the same case as fixture
  42): frames F01 WEIGHT_SHIFT … F09 FINAL_EXTENSION (pre-contact), F11 POST_CONTACT … F17 READY (post), with anchor JSON per frame.
  `far_dive_contact_pose/` — the live contact keyframe DIVE_NORTH_CW60.png (Pro sprite rotated 60° CW as a presentation transform;
  CW50 variant and the raw source included). `far_dive_left_mirror_contact_pose/` — the mirror side's contact art (DIVE_SOUTH_CW20,
  from the cleaned SOUTH_V6 sprite — "V6" there is a SPRITE naming, unrelated to the skeletal V6).
- `outfield_player_idle/` — the accepted outfield player (character 31a11357) 8-direction idle: the same visual language.
- `records/` — GK_ANIM_V1.json (states, clips, sequences, contextual poses and their status: `live: false` clips are RETIRED), GK_BASE_V1.json,
  MANIFEST.json, CAMERA_TARGET.md, base / set anchors. Anything marked retired / rejected there is history, not a target.
- `reference_renders/10_sprite_backend_*` — the SAME fixture 42 drawn by the production SPRITE backend (the sprite sequence + contact
  pose above, driven by the same resolver): the current shipped look of this exact save, for direct comparison with the skeletal renders.

## F · Current 3D test character — NOT AN APPROVED VISUAL TARGET

`sandbox/visual/anim3d/skin_mesh.js` (`skinBuildMesh`): a procedural humanoid lofted from the skeleton's bind pose (elliptical tubes
per limb / torso / neck / head, 14 segments, linear-blend skin weights straddling each joint, per-vertex material part). It proved:
skinning works (GPU LBS, 4 influences); V6 drives a skinned mesh through IK / root / landing / look-at with no cut; the existing
skeleton (§A) is a sound bind target; the pipeline (§G) survives proportion changes (tall / short) with the same clips. It did NOT
prove: final proportions, final art style, final pixel renderer, final mesh design. The green capsule "MANNEQUIN" (`reference_renders/
13_*`) is the even earlier prototype. Treat both strictly as technical references.

## G · Rendering pipeline (`source_snapshot/` = copies; live paths in §M)

- `gl_renderer.js` — WebGL2 offscreen renderer: `glCamera` (exact CAMERA_V1), capsule / sphere meshes, skinned mesh program (`uBones`
  = world × inverse bind per bone, `uPalette` per part), quantised shading (`bands`), a 1-texel id / depth outline post pass,
  low-resolution mode B (render at canvas / `pixelScale`, nearest upscale) and mode C (fixed texel density at the character,
  `fixedTexelM` 0.055 m ≈ one sprite pixel), light direction, `character` SKINNED | MANNEQUIN. Experimental.
- `skin_mesh.js` — the procedural mesh generation + weights (§F). Experimental.
- `gk3d_backend.js` — the SKELETAL_3D presentation backend: consumes the action description, runs the graph + solve, builds skin
  matrices, draws the character + presentation ball, composites at the keeper's depth slot (shadow ellipse at the presentation
  root), debug overlays, continuity assertions, records. Architecture (production-shaped: backend interface `gk_backend.js`).
- `skeleton.js` (FK, mirror, inverse bind, skin matrices), `m4.js` (matrix / vector math), `ik.js` (2-bone IK, cradle solve) —
  production-shaped foundations. `gk_graph.js` (animation graph: lifecycles, landing physics, plants, IK pass) and
  `gk_far_dive_clip.js` (the V6 authored keys) are the motion layer — frozen for V6.
- Compositing: the 2D playtest canvas (`match.js`) draws the pitch; `gkPresentationDraw` calls the backend which draws the
  low-res layer onto the canvas with nearest sampling at the keeper's depth. The rendered character is ~35 px tall at gameplay scale.
- Review harness: `tools/anim3d/capture.js` (frames per tick with `--backend`, `--crop`, `--zoom`, `--camx`, `--pixel`, `--outline`,
  `--bands`, `--dbg`, `--variant`, `--character`), `gk_motion_manifest.js`, `gk3d_export_motion.js` (this export), gates.
  Astra may modify / prototype the renderer freely as long as §N holds (the gates prove neutrality).

## H · Character customization requirements (`machine_readable/customization_schema.json`)

Any long-term solution must support, at minimum: jersey colour / design, shorts, socks, skin tone, hair colour, hair style,
goalkeeper gloves, boots, team identity, player height, player proportions / body build where feasible, numbers / details later.
We strongly prefer customization that does NOT require redrawing every animation for every player. No mechanism is prescribed.
What exists today (technical contract only): body = `skelBuild(H, prop)` (height + leg / arm / torso / width multipliers; clips are
rotation-only so they play unchanged), material groups per vertex / capsule (skin, hair, shirt, shorts, socks, boots, gloves) with a
palette override per variant. §J shows these inputs on the same V6 motion.

## I · 360° / orientation requirement

The character is genuinely 3D: the presentation facing is a world heading (any yaw), bones carry full 3D rotations, and the graph
pitches / rolls the body (dives, landings) by animation. Gameplay reasoning uses eight facing octants for readability, but the
eventual system should allow free yaw around the vertical, full 3D bone rotation, and animation-driven pitch / roll while still
producing attractive Touchline-style output. Not every angle needs to look identical; the fixed gameplay camera (§D) remains the
primary presentation camera. Fixtures 50–53 / 61–63 / 72–75 in the motion library are angled-facing cases if needed later.

## J · Customization test cases (`reference_renders/15_*`)

Same V6 motion, same skeleton definition: default, `tall`, `short`, `skin2` (skin tone), `jersey2` (kit colour) — close view and
gameplay keeper crops at the key ticks, plus a side-by-side at contact / flight / set. Hair style is not a separate input today
(a hair bone / part only). Exports: `motion_v6_fixture42_variant_tall_full.json`, `_short_`, `skeleton_v6_variant_*.json`.

## K · Reference renders (`reference_renders/`, clean unless the name says debug)

01 gameplay camera 60 fps (500×450 clip + 3× keeper crop) · 02 gameplay 4× slow · 03 close normal-3D 60 fps + 4× slow · 04 skeleton-only
(from the export; zoom + gameplay) · 05 skeleton + mesh (debug overlay) · 06 key-phase strips (gameplay 4×, close) · 07 contact
frames (±6 ticks, gameplay 5× and close) · 08 ball / debug view + ball plot from the export · 09 landing / recovery close 60 fps ·
10 SPRITE backend (production art) of the same fixture · 12 mirror fixture 49 · 13 capsule mannequin · 14 current pixel / 2.5D mode ·
15 customization variants · `stills/` at READY, ANTICIPATION, LOAD, PUSH-OFF, TOE-OFF, FLIGHT, MAXIMUM EXTENSION, CONTACT, DESCENT,
LANDING, SETTLE, GET-UP (push-up, crouch), REPOSITION — gameplay full frame, gameplay crop, close 3D, skeleton + mesh.

## L · Machine-readable export (`machine_readable/`)

`skeleton_v6_default_H1.90.json`, `skeleton_v6_variant_tall.json`, `skeleton_v6_variant_short.json`, `motion_v6_fixture42_right_full.json`,
`motion_v6_fixture49_left_mirror_full.json`, `motion_v6_fixture42_variant_{tall,short}_full.json`, `camera_v1.json`,
`ball_trajectory_v6_fixture42.json`, `customization_schema.json`; `../MANIFEST.json` lists every file. Formats are the project's own
(the exporter's JSON; GK_ANIM_V1 records copied verbatim). Regenerate: `node sandbox/visual/tools/anim3d/gk3d_export_motion.js
--scenario 42 --ticks 320 --out motion_42.json` (servers `server.py` :8000 + `serve_match.py` :8124, puppeteer-core).

## M · Source path map (repository-relative)

| what | where |
|---|---|
| skeleton (hierarchy, bind, FK, mirror, inverse bind, skin matrices) | `sandbox/visual/anim3d/skeleton.js` |
| animation graph (lifecycles, landing physics, plants, IK pass, held-ball cradle, distribution) | `sandbox/visual/anim3d/gk_graph.js` |
| V6 far-dive authored keys (frozen) | `sandbox/visual/anim3d/gk_far_dive_clip.js` |
| motion library (other motions + selection) | `sandbox/visual/anim3d/gk_motion_library.js` |
| 2-bone IK, cradle solve | `sandbox/visual/anim3d/ik.js` |
| skinned renderer, shaders, pixel / outline / bands, GL camera, ball sphere | `sandbox/visual/anim3d/gl_renderer.js` |
| character mesh generation (procedural skinned humanoid) | `sandbox/visual/anim3d/skin_mesh.js` |
| 3D presentation backend (draw, composite, records, overlays) | `sandbox/visual/anim3d/gk3d_backend.js` |
| backend interface + action description (layer B) | `sandbox/visual/anim3d/gk_backend.js` |
| matrix math | `sandbox/visual/anim3d/m4.js` |
| gameplay camera (authoring, basis, projection, rig) | `sandbox/visual/match.js` — `AUTHOR_DEFAULTS` (~l. 49), `buildFrozenBasis` / `fproj3` / `RIG` / `sproj3` / `depthScale` (~l. 528–586), `updateRig` (~l. 1799), `flattenAt` (~l. 1842) |
| 2D ball draw / handover to 3D | `sandbox/visual/match.js` `drawBallAt` (early return when `gk3dOwnsBall()`) |
| existing sprite system (goalkeeper resolver + sprite draw) | `sandbox/visual/match.js` `GK_ANIM` (~l. 4397), `gkAnimUpdate` (~l. 4821), `gkAnimDraw` (~l. 5032), `gkAnimClassify` (~l. 4620) |
| goalkeeper simulation (perceive / commit / contact resolver / held ball / distribution) | `sandbox/visual/match.js` `ptGkUpdate` (~l. 4190), `gkTryContact` (~l. 3798), `GK_DIVE` (~l. 3456), `GK_DIST` (~l. 4140) |
| sprite assets + records | `assets/visual_v1/` (`goalkeeper/GK_ANIM_V1.json`, `GK_BASE_V1.json`, `originals/`, `goalkeeper/sequences/`, `goalkeeper/contextual/`) |
| sprite manifest builder | `sandbox/visual/tools/gk_anim/gk_build_manifest.py` |
| kit / player customization (sprites) | none beyond the frozen PixelLab identities; 3D variants: `gk3d_backend.js` `GK3D.variants`, palette `SKEL_PARTS` in `skeleton.js` |
| review harness | `sandbox/visual/tools/anim3d/capture.js`, `gk_motion_manifest.js`, `gk3d_export_motion.js`, `gk3d_gate.js` + `gk3d_gate_compare.py`, `gk3d_freeplay.js`; `sandbox/visual/tools/gk_anim/gk_anim_gate.js` |
| previous review pages | `review_artifacts/gk_motion_library/GK_MOTION_LIBRARY_REVIEW.html`, `review_artifacts/gk_distribution/GK_DISTRIBUTION_REVIEW.html`, `review_artifacts/astra_gk_motion_reference/`, `review_artifacts/3d_animation_architecture/` |

## O / P · Scope

Vertical slice: one motion (V6 FAR_DIVE). The exporter, capture and packaging tools are generic (any fixture index), so other motions
can be packaged later at no design cost; do not spend the experiment on them. Answer the visual-architecture question first.

## Q · What Astra will still need that this package cannot provide

- A statement of the target art direction beyond "the current sprites" (the accepted GK_BASE_V1 / outfield identities are the only
  approved look; no style guide document exists).
- Performance budgets (frame time, number of simultaneous characters) — none are recorded for the 3D path (the review harness measured
  ~1.4 ms avg / 550×450 offscreen target on the test machine; not a target).
- Hair-style variation, kit designs / numbers: no data exists; only colours are parameterised today.
- The final camera zoom policy in play (fixtures pin zoom 1.25; free play uses the ball-follow rig at zoom 1.0) — both are in the export.
