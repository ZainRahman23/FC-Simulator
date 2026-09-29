# Courtois goalkeeper character integration handoff

Use the existing **corrected, true-proportion Courtois** asset. Keep I23, S3, L2, the face, corrected hair, equipment, camera, Mixed treatment and authoritative action facts unchanged. This handoff extracts the implementation; it does not implement retargeting or certify new animations.

The smallest safe integration is to load the approved GLB, adapt its **exact tall bind rig** to the existing rotation/FK/IK pipeline, calibrate presentation contact proxies to the finished gloves/boots, and reproduce the approved C shader inside Mixed. Do not substitute the shared-rig model or replay shared-rig solved world matrices on the tall mesh.

**Read these findings before coding:**

- The approved model is 2.009486914 m high in its stored bind positions; its rig parameter is `H=2.014`. The user's roster metadata is **199 cm / 96 kg**. These are distinct quantities. Metadata must not rescale this approved model.
- The action library already contains joint rotations and proportion-aware FK/IK. The frozen V6 exports contain **solved world matrices**, along with diagnostic pose angles. They are not reusable tall-rig animation clips.
- The existing tall V6 export changes presentation-root and recovery phases, and scales the rendered ball radius to 0.1166 m. Simulation root, ball trajectory and contact remain identical. This explains the previous static-only guard.
- The approved offline Mixed compositor does **not** share character/ball depth. The temporary browser renderer does share that depth, but its seven-colour shader is not the approved character treatment. Integration must reconcile both requirements.
- The final gloves have inward-facing palms, downward fingers and no named contact sockets. The existing hand-centre and foot-radius proxies do not establish surface contact with this mesh.

## 1. Scope, provenance and path roots

All character paths below are relative to the ZIP root, which preserves the completed **`finished-gameplay/touchline-v6`** layout. The supplied gameplay/action snapshot is under `scene-density/environment/`. Its original README identifies branch **`prototype/3d-animation-pipeline`**, commit **`2c80700`**. Strip that package prefix when comparing those files to the equivalent paths in the actual Touchline repository.

Claude's separately active branch is not mounted here. Treat the embedded action source as inspected reference, not permission to replace newer action work. Compare symbols and contracts against Claude's current branch before merging anything. Character/source files and completed artifacts take precedence over older prose.

The companion `CLAUDE_GK_CHARACTER_MANIFEST.json` contains exact asset hashes, all 23 bone records, matrices, material definitions, configuration values, source declaration locations, measured geometry, dependency categories and the saved V6 comparison. `handoff/verify_package.py` checks this package without invoking a character builder, renderer or simulator.

No successful asset was regenerated. No animation, simulation, source character, roster, or authoritative ball/root/contact data was changed. Four existing reference images were copied unchanged. No new images or videos were rendered; nothing was pushed.

## 2. Authoritative files and what they mean

| Component | Exact package-relative source/asset | Status and usage |
|---|---|---|
| Finished true Courtois | `assets/morphology/Touchline_Player_courtois.glb` | **Approved generated runtime export.** Use this existing file for the first integration; generated does not mean disposable. |
| Corrected face, eyes, brows, hair and vertex colours | `morphology/runtime-courtois.json` | **Authoritative runtime mesh data.** Includes 12 parts; corrected scalp is already present. |
| Player entry and bind transfer | `src/player-morphology.js` | **Authoritative source.** `build('courtois')`; never use `courtois-shared` for true proportions. |
| Body configuration | `morphology/configurations.json` | **Authoritative configuration.** Courtois uses tall rig, Madrid blue kit, short sleeves and the recorded mass controls. |
| True rig | `data/skeleton_v6_variant_tall.json` | **Authoritative serialized proportions/offsets.** Match the GLB's inverse binds; do not recompute from database height. |
| Shared source skeleton | `data/motion_v6_fixture42_right_full.json` | Frozen motion fixture, also an actual module dependency: `player-morphology.js` reads its `.skeleton`. |
| Shared rig reference | `data/skeleton_v6_default_H1.90.json` | Explicit shared-rig specification for comparisons. Not the target rig. |
| Canonical construction entry | `src/canonical-character.js` | Alias to the L2 implementation; the comment mentions I23/S3 but the actual dependency includes L2. |
| I23 head placement / shaped join | `src/integrated-character.js` and `src/shoulder-character.js` | I23 is selected by shoulder construction: head ×1.10, 0.024 m lower, shaped neck/traps. Already baked. |
| S3 shoulders | `src/shoulder-character.js` | Athletic taper selected by the downstream canonical chain. |
| L2 pelvis / thighs / shorts / knee transition | `src/lower-body-character.js` | Underbody and clothing share coordinated weight fields. L2 is the default selected candidate. |
| Sculpt adapter and head/neck weights | `src/refined-character.js` | Replaces obsolete head geometry; converts sculpt axes, blends lower neck, retains equipment. |
| Gloves | `src/face-character.js` | Authored palm, fingers, thumb, cuff and panels, rigid to the relevant hand bone. Old face-generation sections are superseded in the final chain; gear is still required. |
| Jersey / socks / boots / base weights | `src/character-v3.js` | Required upstream body/gear construction; it is not the final face. |
| Shared approved sculpt input | `head-refinement/runtime-anchor.json` | **Generated/cache data that is also a required source dependency.** Registered unconditionally by the player entry and used by the Courtois head generator. |
| Courtois head generation | `tools/morphology/build-head.py` | Hard-coded `CFG` and palette; derives the current Courtois asset from the approved sculpt. Do not execute during integration. |
| Recorded face parameters | `morphology/head-parameters.json` | Generated record, **not** a JSON input read by the current generator. |
| Corrected fade | `tools/morphology/hair-readability.py` | Deterministic hair-only correction called once by the generator. Do not apply again to current runtime data. |
| Kit artwork finishing | `tools/morphology/kit.cjs` | Required after procedural build and before rendering/export; finishes the atlas and navy collar/sleeve hems. |
| Base UV artwork | `src/art-textures.js` | Atlas source, combined with the kit finisher. |
| Legacy facial artwork dependency | `src/face-artwork.js` | Still imported by the rasterizer, but approved sculpted head uses its stored vertex colours. Do not restore painted legacy face surfaces. |
| Approved C treatment | `src/framebuffer-renderer.js` | Authoritative Soft Cel + four-sample resolve + restrained inward contour. |
| Projection and separate ball raster | `src/renderer.js` | Exact CAMERA_V1 formula and frozen ball presentation path. |
| Mixed character compositor | `tools/morphology/gameplay.cjs` | Existing compositor reference; explicitly rejects true-Courtois full motion. |
| Native environment harness | `tools/scene-density/environment.cjs` | Canvas scene rerasterization from the supplied environment source; no simulation stepping. |
| Full density/Mixed precedent | `tools/scene-density/render.cjs` | Historical study compositor. Its default model is Anchor and caches may contain Anchor. It is not a Courtois integration entry point. |
| Existing exporter | `tools/morphology/export.cjs` | Generation provenance; current GLB already includes skin, normals, colours and kit atlas. Do not re-export as an integration shortcut. |

Exact source chain:

`player-morphology → canonical-character → lower-body-character → shoulder-character → integrated-character → refined-character → face-character → character-v3`.

The finished Courtois in `roster/models/Touchline_Player_courtois.glb` is byte-identical to the approved GLB above. It is deliberately not duplicated in this package. The 19 other roster players were not changed and are not dependencies of Courtois.

**Ignore / do not substitute:** `assets/morphology/Touchline_Player_courtois-shared.glb` is the lower shared-rig validation fallback; `hair-readability/runtime-courtois-before.json` and `hair-readability/build-head-before.py` precede the accepted hair correction; `hair-readability/runtime-courtois-corrected.json` is a duplicate of the current head; `reference/source_snapshot` is an older/incomplete action snapshot. These paths were verified in the original completed tree but are intentionally excluded from the minimal ZIP. Old static morphology images and full V6 videos may predate the hair fix. They are not current true-height motion approval.

## 3. Geometry and bind rig, measured from the approved export

| Measurement | Value |
|---|---:|
| GLB file size | 22,135,988 bytes |
| Rig height parameter | 2.014 m |
| Stored bind mesh height | 2.009486914 m |
| Bind Y extent | −0.009850000 to 1.999636889 m |
| Bind X extent | −0.332219988 to +0.332219988 m |
| Bind Z extent | −0.138091102 to +0.296400011 m |
| Default GLB construction-pose height | 2.009486839 m; float32 skinning difference only |
| Default construction-pose width | 0.834553344 m, including outward posed arms/gloves |
| Triangles | 102,168 |
| Exported vertex entries | 306,504, triangle-unrolled, non-indexed |
| Distinct stored XYZ positions | 51,939; this is not a topology vertex count |
| Skins / joints / materials / primitives | 1 / 23 / 29 / 29 |
| Skin attribute capacity / observed maximum | 4 slots / 3 nonzero influences |
| Maximum float32 weight-sum error | 1.1921 × 10⁻⁷ |
| Embedded images | One 512 × 512 RGBA kit PNG, 27,185 compressed bytes; 1 MiB decoded RGBA8 |
| Animation clips in GLB | 0 |

The historical procedural report has 53,351 used vertices. That differs from the GLB because the exporter duplicates every triangle corner and retains seams; do not confuse either with the distinct-position count. Geometry attributes total 22,068,288 bytes in the current GLB. A direct draw-per-primitive implementation would issue 29 character draws per pass; no production GPU benchmark is claimed here.

### Hierarchy and exact offsets

The table is the complete joint order used by JOINTS_0, with exact serialized tall offsets. Lengths are animation helpers and do not necessarily equal the next child offset. In particular, the pelvis length is not its height above ground.

| # | Bone | Parent | Local bind offset (m) | Length shared → tall (m) |
|---:|---|---|---|---|
| 0 | `root` | `None` | `[0, 0, 0]` | 0.00000 → 0.00000 |
| 1 | `pelvis` | `root` | `[0, 1.05735, 0]` | 0.11400 → 0.12688 |
| 2 | `spine` | `pelvis` | `[0, 0.12084, 0]` | 0.22800 → 0.24168 |
| 3 | `chest` | `spine` | `[0, 0.24168, 0]` | 0.26600 → 0.28196 |
| 4 | `neck` | `chest` | `[0, 0.28196, 0]` | 0.09500 → 0.10070 |
| 5 | `head` | `neck` | `[0, 0.1007, 0]` | 0.22800 → 0.24168 |
| 6 | `hair` | `head` | `[0, 0.14098, -0.01007]` | 0.09500 → 0.10070 |
| 7 | `clavicle_R` | `chest` | `[0.06042, 0.24168, 0]` | 0.19000 → 0.21550 |
| 8 | `upperArm_R` | `clavicle_R` | `[0.2155, 0, 0]` | 0.32300 → 0.36635 |
| 9 | `foreArm_R` | `upperArm_R` | `[0, -0.36635, 0]` | 0.28500 → 0.32325 |
| 10 | `hand_R` | `foreArm_R` | `[0, -0.32325, 0]` | 0.11400 → 0.12930 |
| 11 | `clavicle_L` | `chest` | `[-0.06042, 0.24168, 0]` | 0.19000 → 0.21550 |
| 12 | `upperArm_L` | `clavicle_L` | `[-0.2155, 0, 0]` | 0.32300 → 0.36635 |
| 13 | `foreArm_L` | `upperArm_L` | `[0, -0.36635, 0]` | 0.28500 → 0.32325 |
| 14 | `hand_L` | `foreArm_L` | `[0, -0.32325, 0]` | 0.11400 → 0.12930 |
| 15 | `thigh_R` | `pelvis` | `[0.19133, 0, 0]` | 0.45600 → 0.50753 |
| 16 | `shin_R` | `thigh_R` | `[0, -0.50753, 0]` | 0.41800 → 0.46523 |
| 17 | `foot_R` | `shin_R` | `[0, -0.46523, 0]` | 0.19000 → 0.21147 |
| 18 | `toe_R` | `foot_R` | `[0, -0.06344, 0.2009]` | 0.07600 → 0.08459 |
| 19 | `thigh_L` | `pelvis` | `[-0.19133, 0, 0]` | 0.45600 → 0.50753 |
| 20 | `shin_L` | `thigh_L` | `[0, -0.50753, 0]` | 0.41800 → 0.46523 |
| 21 | `foot_L` | `shin_L` | `[0, -0.46523, 0]` | 0.19000 → 0.21147 |
| 22 | `toe_L` | `foot_L` | `[0, -0.06344, 0.2009]` | 0.07600 → 0.08459 |

The manifest provides, for every row: bind direction, radius, child names, exact shared offset, summed tall origin, local/world zero-rotation bind matrices, **actual float32 GLB inverse-bind matrix**, and actual default GLB node-local/world matrix. Use those arrays rather than transcribing rounded prose.

**Two different poses exist:**

1. **Rest/bind:** zero joint rotations, `local = T(offsetLocal)`, world bind is the parent chain. All bind orientations are identity. Inverse binds in the actual GLB are translations by negative summed bind origins.
2. **GLB default display pose:** the exporter writes `neutralPose()` node matrices: upperArm_R/L have ±0.12 rad Z roll, forearms −0.13 rad X, hands +0.03 rad X. This is a construction pose, **not the bind pose and not V6 READY**. Replace its local rotations when driving animation; do not multiply authored action rotations on top of it.

The serialized skeleton also contains rounded `inverseBind` values from the older capture. For the existing GLB, its own inverse-bind accessor is authoritative. Summing tall offsets matches that accessor within 5.56 × 10⁻⁸ m. Calling `skelBuild()` again may recover slightly different unrounded numbers; import/adapt the exact serialized offsets and use the asset's inverse binds.

### Axes, matrices and root

- Metres; right-handed character frame: **+X keeper right, +Y up, +Z forward**.
- Simulation/pitch tuples are `[x, y, height]`. Render-world tuples are `[x, height, -y]`. `glW` and `pitchW` in `scene-density/environment/sandbox/visual/anim3d/gk_graph.js` perform the conversion.
- Matrices are column-major, column-vector transforms. FK is `parentWorld × T(offset) × R`. Pose arrays are `[pitch, yaw, roll]` in degrees and `M4.euler` composes `Ry × Rx × Rz`.
- `gkRootMatrix(simX, simY, facing, dz)` uses basis columns `right=[-sin(f),0,-cos(f)]`, `up=[0,1,0]`, `forward=[cos(f),0,-sin(f)]`; translation is `[simX,dz,-simY]`. `f` is radians from authoritative pitch heading `atan2(dy,dx)`.
- `root` is joint 0 at the local origin. Apply the world/root transform once. Exported `rows[].bones[name].world` already contains world/root, FK, IK and head look; adding root again will double-transform the player.
- Exported `ball`, **`renderedBall.p`**, `simHandTarget`, joint/tip and pelvis positions are pitch tuples. Runtime `sol.ballPres.p` is render-world before the backend converts it. Identical field names in different stages do not imply identical coordinate spaces.
- `presRoot` is the ground projection of the solved pelvis, capped/reconciled by the graph; it is not the authoritative `simRoot` or the `root` joint matrix. Never feed `presRoot` back to simulation.

### Weights and attachment conventions

Procedural vertices contain bind-world `p`, UV, optional 8-bit RGB `color`, and weights `{b, w, local}`. `b` indexes `mesh.bones`; `local = p − bindOrigin[b]`. Rendering uses `Σ w × boneWorld × local`. **Do not also apply inverse binds to these already-local coordinates.**

The GLB instead stores `POSITION`, `NORMAL`, `TEXCOORD_0`, `JOINTS_0` (uint16), `WEIGHTS_0` (float32) and `COLOR_0`. Its rule is `Σ w × jointWorld × inverseBind × POSITION`, with the mesh object/root transform handled once by the host's glTF convention. There are no shape-key animation channels or extra facial/finger bones.

`mass()` and `tallTransfer()` in the player entry recompute weight-local coordinates after moving bind positions. Tall transfer uses each influence's source/target origins; local Y is scaled by target/source bone length for upper arms, forearms, thighs and shins, and by H ratio for pelvis/spine/chest/neck. Head, hands, feet and other local geometry are not uniformly inflated. Then it rebinds. **This construction is already baked; do not run it on the GLB again.**

The sculpture's input coordinates are Z-up with its face toward −Y. `src/refined-character.js` converts them to the character frame. Lower neck blends head/neck/chest; I23 further seats the complete face and shaped join. Collar weights include chest 0.90 / neck 0.10. Facial and hair surfaces follow the head; a skeleton bone named `hair` exists but is not a separately animated hairstyle control in this approved export. Preserve the supplied actual weights.

**Gloves:** `src/face-character.js` authors palm normal +Z, fingers −Y, anatomical thumb ±X, then applies the bind mapping `[-s*z, y, s*x]` (`s=+1` right, −1 left). Final right palm faces −X, left palm +X; both finger axes remain −Y and thumbs point +Z. Its metadata calls this R −90° / L +90° hand bind roll; use the mapping, not an assumed rotation about Z. Gear is rigidly attached to each hand joint, not individual finger joints. No runtime glove socket exists.

Measured hand-local rigid geometry bounds, including cuff/fingers/thumb:

| Hand | Min XYZ (m) | Max XYZ (m) |
|---|---|---|
| Right | [−0.048000, −0.191228, −0.067000] | [+0.056300, +0.009000, +0.102996] |
| Left | [−0.056300, −0.191228, −0.067000] | [+0.048000, +0.009000, +0.102996] |

The solver's tall hand-centre proxy is `wrist + transformed(bindDir × length × 0.6)`, i.e. **77.58 mm** down the hand axis. That is not a palm-surface definition. Calibrate a presentation-only support point and palm normal from the existing glove surface; preserve vertex positions and attachments.

**Feet:** thigh/shin/hand bind directions are −Y; foot direction slopes forward/down (`[0,−0.3,0.954]` normalized); toe direction is +Z. Tall ankle bind Y is 0.08459 m, toe bind Y 0.02115 m. The boot/sole extends to −0.00985 m in zero-rotation bind. Do not globally move the character up to make this bind preview touch ground. Ground contact is a posed sole/ankle constraint. Current `gkGraphSolve` uses ankle target `0.06*H = 0.12084 m`, flattening, plant IK and approximate bone-radius floor tests; these were written around the test mesh. Finished sole/contact offsets require calibration. The manifest supplies foot/toe local bounds; bounds are diagnostics, not contact sockets.

## 4. Why frozen V6 was blocked on true Courtois

The hierarchy is compatible; the bind lengths/offsets are different. Reusing the shared solved world transforms relocates the tall mesh's influence frames to the shared rig. Reusing shared inverse binds with tall positions is also wrong. Whole-object scaling fails because the tall construction is not uniform and fixed world contacts would move.

The saved tall fixture was already produced by the proportion-aware graph. Comparing its 320 rows to the original fixture gives:

| Field | Differing rows | Measured implication |
|---|---:|---|
| Authoritative `simRoot`, ball, ball velocity, hand target, facing, time, tick, camera, contact marker | 0 | Simulation authority was preserved in the saved test. |
| `rootMatrix` | 0 | The graph's base world/root transform was not the source of the displacement. |
| `presRoot` | 299 | Maximum planar difference 0.349176792 m. Solved pelvis and recovery trajectory differ. |
| `phase` | 31 | First difference at row 73: shared FOLLOW vs tall DESCENT. |
| `poseEulersDeg` | 182 | These are graph-evaluated angles, including target adaptation, not a fresh independent authored motion. |
| `renderedBall` object | 320 | Radius 0.11 → 0.1166 m because radius is multiplied by H/1.90. |
| `renderedBall.p` | 42 | Maximum position difference 0.0066 m, from the corresponding ground-centre clamp. |

Contact is row index **62**, simulation time **1.05 s**, simulation tick **63**. Those indexing conventions differ because row 0 is recorded after the first `ptStep`. Fixture 42 is **“S4 K2 high tip-up (POWER 28 m/s under the bar)”**, with outcome **WEAK PARRY (through)**, not a catch. Preserve its actual outcome.

Responsible source in `scene-density/environment/sandbox/visual/anim3d/gk_graph.js`:

- `gkGraphAxis`: target redirection with assumed hip height `0.50*H`, reach `0.64*H`, fixed/height-scaled limits. The actual tall pelvis origin is 1.05735 m versus assumed 1.007 m, a 50.35 mm discrepancy.
- `gkGraphEvaluate`: authored `_pelvis`, distribution `_ball`, stance and steps scaled mainly by H/1.90, which does not represent every leg/arm proportion independently.
- `gkLaunchPlan`, `gkLandingPlan`, `gkGroundPlan`, `gkLandingState`: geometry-dependent launch/landing trajectory and recovery phase transitions.
- `gkGraphSolve`: foot plants, approximate floor tests, torso assistance, hand/leg IK, then presentation-root projection from the solved pelvis. These change when bind lengths and reach change.
- Graph `ballR` and distribution `rB` multiply `GK_GRAPH.ballVisR` by H/1.90; the backend then uses that radius for the rendered ball and centre clamp. Physical `GOALFX.ballR` remains 0.11 m. Do not reproduce morphology-dependent ball size in the new integration.

`tools/morphology/gameplay.cjs` explicitly throws **“Tall V6 is not frozen-contract compatible”** for `courtois --motion`. Static Courtois uses only tall row-0 bones with the canonical row's other inputs. The guard reflects the earlier requirement for identical V6 presentation data, not an inability to animate a 23-joint tall mesh.

**Contract distinction:** frozen shared V6 must remain byte-for-byte untouched as an existing acceptance fixture. The same authoritative action can drive a new proportion-aware Courtois solve, but the resulting tall bone-world matrices cannot simultaneously equal the shared matrices. If presentation-root/phase timing must also match the accepted V6 exactly, feed those accepted trajectories/times as locked presentation inputs and solve the tall body's offsets/IK within them; do not silently accept the older tall fixture's drift. This is the remaining integration work, not a completed capability.

## 5. Current simulation → character interface

The files in this table are all under `scene-density/environment/sandbox/visual/` unless a full package path is given. Exact complete paths and symbol declaration lines are also in the manifest's `animationImplementation`.

| Stage | File / entry | Input → output; space | Allowed integration change / frozen facts |
|---|---|---|---|
| Simulation | `scene-density/environment/sandbox/visual/match.js`: `ptStep`, `ptGkUpdate`, contact/distribution functions | Fixed 60 Hz world state → root/facing, commit, ball, contact/release events in pitch metres | Read only. Keep outcomes, trajectories, ticks, capabilities and root unchanged. |
| Semantic resolution | Same file: `gkAnimUpdate` | Authoritative action → presentation family, side, phase/classification | Reuse current host semantics. No reselection based on finished mesh collision. |
| Description boundary | `scene-density/environment/sandbox/visual/anim3d/gk_backend.js`: `gkActionDescription` | `t,gk,cur` → copied/read-only action description | Preserve data contract; expose missing authoritative facts rather than invent animation-owned facts. |
| Motion selection | `scene-density/environment/sandbox/visual/anim3d/gk_motion_library.js`: `gkSelectMotion`, `gkSelectDistribution`; `scene-density/environment/sandbox/visual/anim3d/gk_far_dive_clip.js` | Family/side/commit/distribution → authored joint rotations, metadata and named phases | Keep authored actions/keys. True rig changes the solve, not action identity or decision. |
| Graph | `scene-density/environment/sandbox/visual/anim3d/gk_graph.js`: `gkGraphEvaluate` | Description, clip, target rig, persistent state → pose, root matrix, locks, IK weights, targets, presentation phase | Adapt proportion assumptions/contact frames; keep simulation times/world targets. Preserve existing V6 branch and approved presentation timeline where required. |
| FK | `scene-density/environment/sandbox/visual/anim3d/skeleton.js`: `skelFK` | Tall offsets + local rotations + root → render-world joint matrices/positions/tips | Adapt serialized rig schema; never resize joints per frame or add root twice. |
| Procedural solve | Graph `gkGraphSolve`; `scene-density/environment/sandbox/visual/anim3d/ik.js` | FK + world contacts → corrected world matrices, diagnostics, presentation-root | Reuse solver; fit finished surfaces to contacts. Do not write simulation or ball. |
| Head look / skin matrices | `scene-density/environment/sandbox/visual/anim3d/gk3d_backend.js`: `gk3dDraw`; skeleton `skelSkinMatrices` | Solved FK + bounded head look → final world×inverseBind matrices | Preserve ordering. Head look is post-IK and must drive the actual head skin. |
| Finished mesh | Existing GLB, or `src/player-morphology.js` source representation | Final bone matrices → positions/normals/colours/UVs | Replace temporary display mesh only. Keep approved geometry, weights and material data. |
| Approved appearance / Mixed | `src/framebuffer-renderer.js`, `src/renderer.js`, `tools/morphology/gameplay.cjs` | Render-world character + fixed camera → native character layer + environment composite | Implement equivalent material/raster contract; camera, size, world scale and authoritative scene remain fixed. |

`gkActionDescription` includes `simRoot`, velocity, height, hand target, leg tip, facing, committed facing, `commit` (`t0`, `execTime`, target, feet, hand origin, tier, commit tick, root end, gather), contact (`tickT`, point, volume, surface, outcome), `endT`, held state, ball, shot/prediction data and distribution plan/events. Its distribution copy carries release/drop/kick planned and actual moments, points, target, facing, side/foot, released/kicked flags and event records.

Runtime skeleton objects differ from the serialized asset: `idx/off/dir/len/rad`, `parent` and `children` object references, plus `byName`. The asset uses `index/offsetLocal/bindDirLocal/lengthM/radiusM`, parent/child names. The adapter should construct the runtime object graph from those exact records, preserving joint order. Do not pass serialized parent strings straight into `skelFK`.

The backend currently creates `skelBuild(gk.height * variant.h, variant.prop)`. For this approved asset, select the exact imported tall rig instead. Setting metadata height 1.99 and keeping the 1.06 multiplier would incorrectly create a 2.1094 m rig parameter.

The GPU path currently calls `skinBuildMesh` through `glSkinnedMesh`, uploads a 7-part palette, uses a 24-matrix uniform capacity and `UNSIGNED_SHORT` indexed draws. The approved 23-joint skeleton fits the matrix capacity, but the **306,504 non-indexed entries** must be uploaded/drawn correctly (or indexed later as a separate, validated optimization). Do not feed this export into the existing uint16 index assumption. The final normals, UVs, COLOR_0 and material distinctions must survive. There is currently no GLB loader or automatic final-character hook in that backend.

## 6. Ball, palm, foot and release contract

**Simulation decides what happens; animation/presentation visually explains what happened.** The rendering backend must never write to the authoritative ball, parent it under a hand, move its release point, delay contact, modify keeper root/facing or change a catch/parry decision.

| Fact | Authority and current behavior | Presentation obligation |
|---|---|---|
| Ball position / velocity / held state | `t.b`, evolved by `ptStep` and the simulation's own contact/held/distribution functions | Read in the correct coordinate space. An IK miss is a diagnostic, not permission to move the ball. |
| Catch / save contact | `gkTryContact`, `gkApplyContact`; contact includes TOI fraction, tick time, surface, outcome, point and keeper point | Match the recorded event and appropriate hand/body/leg surface; do not convert fixture 42 into a catch. |
| Held-ball simulation | `gkHeldBallStep` updates the authoritative ball from the simulation's `gk.handNow` | This existing simulation policy is outside the character integration. Never replace it with a visual bone-derived position. |
| Hand support | `gk.handNow` / description target, held ball and release plan | Reuse arm IK; place real glove surface and orient palm, not just a point at 0.6 hand length. |
| Release | `gkDistributionStep`, `RELEASE`/`DROP` events with actual fixed-step tick | Hands adapt before the event; afterwards detach from a static release anchor and do not chase the flying ball. |
| Punt kick | Actual falling ball triggers `KICK`; `tKickActual`, `kickActual`, event ball and velocity are authority | Use prediction only for preparation. At kick, solve the foot to the actual event point; do not snap the ball to `kickP`. |
| Keeper root / facing | `gk.x/y`, `gk.facing`; committed facing retained through action; distribution owns `d.facing` | Preserve authoritative values. Any bounded visual turn/offset belongs to presentation and is observable separately. |
| Foot plants | Graph presentation lock state plus world-ground convention | Keep established world plant points during locks, allow explicit steps/releases, derive ankle targets from finished sole shape. Do not move simulation to eliminate slide. |

Current simulation distribution timings (documented here, **not new configuration to change**): secure 1.00 s, or 3.50 s for down catches; THROW prep 0.90 s, ROLL 1.00 s, PUNT drop prep 0.75 s, PUTDOWN 0.85 s. Ordinary follow-through is 0.70 s, punt 0.80 s, put-down 0.60 s. The simulator fires release on the first fixed step meeting `tRelease/tDrop` (epsilon 10⁻⁶). Punt fires when free ball height reaches `kickZ=0.45` or the existing timeout at predicted time +0.10 s; it records the **actual** contact. Do not schedule events from normalized clip progress.

Reuse `skelIK2` (analytic two-bone solve, reach limits, optional bend memory), `skelCradleElbow` (coordinated elbow/wrist placement with torso exclusion), `skelAimChain` (explicit elbow/wrist plus hand curl), graph foot plants/flattening and torso/clavicle assist. None is a collision-aware solver for the final glove surface. The current punt proxy uses 0.65 foot length plus foot radius as a laces contact; calibrate that to the approved boot without editing the mesh.

**Existing visual-ball exception must be explicit.** The inspected snapshot leaves simulation state untouched but its catch/cradle and distribution preparation can produce `sol.ballPres` away from the simulation ball. Catch possession blends toward a chest pin; distribution preparation follows an authored in-hand path corrected to end on the authoritative release/drop point. Following release/drop, the normal simulation-ball rendering resumes and hand weights fade from a fixed anchor. That historical policy is not a license to introduce new visual-ball motion merely to fit Courtois. Preserve the current host branch's authoritative-ball and visual-ball contract; if Claude's branch already removed that exception, do not reintroduce it from this snapshot. Never mistake the historical comment “ball never moved” for proof that rendered and authoritative balls always coincide.

The physical ball radius is **0.11 m independent of morphology**. Ground-rest simulation height 0 is mapped to a rendered centre at least one physical radius above ground. Audit the current host's equivalent before connecting tall proportions; the old `H/1.90` radius multiplication is a documented integration defect, not part of approved Courtois geometry.

## 7. Smallest proportion-aware adaptation

| Quantity | Correct handling |
|---|---|
| Action family, result, side/foot, commit/release/contact times, world target, ball trajectory, authoritative root/facing | Copy/read directly; no morphology scaling or recomputation of simulation outcomes. |
| Authored local joint rotations | Reuse by exact bone name, mirror through existing library rules. Evaluate on the tall rig. |
| Bind translations, segment lengths and skin inverse binds | Use Courtois's exact asset data. Never copy shared bind translations or shared solved world matrices. |
| Body-relative pelvis offsets, stance widths, step distances and authored in-hand guide offsets | Reconstruct from the relevant body/limb proportions and existing reference units. H-only scaling is an existing approximation, not universally correct. Keep world event endpoints fixed. |
| Ground/palm/laces support offsets and torso exclusion | Derive from approved geometry in the appropriate bone-local frames; use presentation metadata, not geometry edits. |
| Wrist/elbow/knee/ankle at constrained moments | Solve via existing IK using tall chain lengths and authoritative target/ground constraints. Preserve anatomical bend direction and report residuals. |
| Saved V6 solved world matrices | Immutable regression fixture on original rig. Not a tall-rig clip. Reconstruct from original keys/action and re-solve; exported rounded diagnostic Eulers alone omit IK/look and are not a full reconstruction. |
| Ball size and release trajectory | Leave physical size and authoritative data untouched. Never normalize ball radius by character H. |

Action coverage:

| Action | Existing path | Specific adaptation |
|---|---|---|
| Stand / set | Far-dive set keys, READY/READY_UP, graph no-commit branch | Tall FK, fitted sole plants, preserve eye/head geometry and I23 join. |
| Locomotion | FOOTWORK and graph lock/step system | Root remains simulation-owned; stride/stance follow limb dimensions with world-fixed support feet. |
| Dives | FAR_DIVE / LOW_DIVE, launch/landing graph | Keep authored rotation chain and authoritative contact; replace H-only reach/hip assumptions, solve long limbs within accepted root/timing contract. |
| Catches / gathers | CHEST_CATCH / HIGH_CATCH / GATHER, coordinated cradle | Real palms on opposing sides, elbows clear the actual torso, preserve catch outcome/tick. Do not move ball to relieve arm reach. |
| General hand distribution | Existing plan continuation and state hand-over | Preserve start pose and actual event times; calibrate support normals and wrist targets to the final gloves. |
| Roll | DIST_ROLL | Low support, reach and sole plants; hand leaves at ground-release event, not after following the roll. |
| Throw | DIST_THROW | Throw-side selection and mirrored rotations unchanged; reach fixed release point with tall shoulder/arm geometry. |
| Punt / drop-kick request | DIST_PUNT in this snapshot | Existing implementation is hand drop → free fall → kick before ground bounce. Preserve DROP/KICK events; laces IK uses actual ball. A distinct bounced drop-kick is not present and must not be invented here. |
| Clearance | `ptFam('CLEAR', …)` launch family used by punt | No separate standing goalkeeper-clearance skeletal clip/selector was found. Integrate any newer clearance action from Claude's branch through the same contact boundary; do not claim DIST_PUNT covers an absent independent clip. |
| Put-down | DIST_PUTDOWN | Good first test: two-hand lower/place, fixed release, ground and both feet visible. Keep free-ball outcome. |
| Recovery | Landing state, brace, push-up, half-kneel, crouch, rise, reposition | Preserve accepted phase/root contract; solve tall foot/hand ground supports and expose unreachable constraints. Do not hide phase drift by retiming simulation. |

Preserve the shared FAR_DIVE solve branch. `PMv()` currently disables new bend memory for FAR_DIVE specifically to keep approved V6 bit-identical; other actions use persistent pole memory. Evaluate/reset state in ordered fixed ticks. A closed-form clip sampler does not make the complete stateful solver independent of call order or draw cadence.

## 8. Exact approved rendering / Mixed contract

| Setting | Approved value / implementation |
|---|---|
| Logical review scene | Crop `[600,150,500,450]` from 1100 × 900 base canvas |
| Environment | Native density 2; full 2200 × 1800, crop 1000 × 900 |
| Character | Native density 4; same world size/camera, not a scaled player |
| Final framebuffer | 2000 × 1800 |
| Character window | Logical origin `[774,316]`, 160 × 144 logical region → 640 × 576 native layer |
| Layer placement | Output `[696,664]`, one native character pixel per final pixel |
| World scale | 1, metres; no fit-to-box, height normalization, FOV change or extra I23 scaling |
| Raster call | `TouchlineFramebufferRenderer.render(mesh,row,{density:4,refined:true})` |
| Internal shading | Hybrid with B / Soft Cel, wrapped by C / Native-output Refined resolve |
| Sampling | Four fixed subpixel positions `(0.25,0.25)`, `(0.75,0.25)`, `(0.25,0.75)`, `(0.75,0.75)` **per output character pixel** |
| Edges | No expanding outline; fractional coverage blends inward toward kit ink by `0.08*(1-alpha)` |
| Texture filtering | Software bilinear sampling within atlas regions; no software mipmap selection |
| Environment enlargement | Nearest 2× from environment crop to output |
| Temporal filtering | None; no TAA/history/jitter/RNG in character rasterizer |
| World light | Normalize `[−0.42,+0.72,−0.54]`; studio light is different and is not gameplay acceptance |

CAMERA_V1 authored values: height 30, distance 43, FOV 28°, pitch 22°, yaw 0, depthoff 3, pscale 0.60. Fixture-42 camera row has rail `rigX=88`, travel 35.5 and zoom 1.25. Exact metadata is `data/camera_v1.json`; its embedded **old GL3D bands/pixelScale/outline settings are not C**.

Authoritative projection in `src/renderer.js`, for render-world `p`:

```text
fpx = 1443.8811360729042
cp = 0.9271838545667874; sp = 0.374606593415912
x = p.x - row.camera.rigX
y = p.y - 30
z = -p.z - 111
d = -sp*y - cp*z
k = fpx * row.camera.zoom
screen = [550 + k*x/d, 450 - k*(cp*y - sp*z)/d, d]
```

Full-scene output coordinates are `[(screen.x−600)*4,(screen.y−150)*4]`. The small character window is only a render ROI. For actions that leave it, expand/move the offscreen ROI and preserve this projection; do not scale or reposition the goalkeeper to stay in its box.

Shader transfer details: normals are area-weighted/smoothed by rounded bind position **and triangle part**, then skinned and normalized. The GLB already contains those normals. Luminosity is `0.12 + 0.72*max(n·l,0) + 0.16*(0.45+0.55*max(n.y,0))`. Soft Cel tone is `0.24 + 0.36*smoothstep(.25,.48,lum) + 0.36*smoothstep(.57,.85,lum)`. Refined face/hair geometry uses vertex colours with factor `.62+.48*lum`; eyes use `.86+.17*lum`. Clothing, bare skin and glove/rubber have distinct branches in the source. Port those branches, not merely a generic cel shader or default glTF PBR.

The GLB's refined COLOR_0 is linearized from 8-bit authored colours. The software reference does its shade multiplication on the 8-bit display-channel values. A GPU implementation must deliberately match colour-space conversion and material mapping; otherwise generic linear-light PBR changes the approved face/kit. Materials are double-sided, roughness 1, metallic 0. Preserve all 29 material identities and the atlas. Existing GLB sampler requests bilinear/mipmap filtering for external viewers; that does not override the software acceptance renderer's actual sampling.

Mixed compositing order is: **environment behind keeper + ground shadow → native character → foreground environment/ball**. The shadow is the source ground ellipse at `row.presRoot`: radius `9*s`, flattened minor axis with minimum `1.5*RES`, alpha 0.25. No new shadow map. The character has internal depth, but ball-only rasterization is separate; the offline compositor is not a shared scene Z-buffer. For distributions where the ball crosses behind/in front of gloves or torso, use shared camera/depth between the character and ball while retaining environment density and existing authoritative ball rendering rules. Do not claim the saved layered implementation already solves that occlusion.

The historical review froze the distant 2000 × 650 upper band to the accepted Mixed image to suppress Canvas warm-up differences. `tools/morphology/freeze-background.py` is a review-only utility, excluded here. Do not introduce that image replacement into live gameplay. The included exact corrected gameplay PNG is the authoritative visual reference; the supplemental inspection PNG is diagnostic only.

## 9. Complete Courtois configuration and hard-coded values

The manifest's `characterConfiguration` is the machine-readable extraction, **not a newly implemented configuration API**. Existing configuration remains:

```json
{
  "label": "Courtois / tall rig",
  "head": "courtois",
  "rig": "tall",
  "kit": "madrid-blue",
  "shortSleeve": true,
  "morphology": {
    "shoulderShift": 0.016,
    "deltoid": 0.77,
    "upperArm": 0.73,
    "forearm": 0.79,
    "chestWidth": 0.82,
    "chestDepth": 0.83,
    "waist": 0.82,
    "pelvis": 0.87,
    "glute": 0.79,
    "thigh": 0.78,
    "calf": 0.83,
    "neck": 0.91
  }
}
```

Additional values are implemented elsewhere:

| Area | Values / authority |
|---|---|
| True proportion selection | Tall definition: H multiplier 1.06 on original 1.90; legs 1.05, arms 1.07, torso 1.00, width .97. Use exact stored rig. |
| I23 | Head scale 1.10, drop .024 m, `placement:'shorten'`, `neckShape:1`, `traps:1`. Frozen selected source values. |
| S3 | `shiftMm:12`, `capReduction:.20`, `chestReduction:.065`, `slopeMm:20`. |
| L2 | `anatomy:1`, `hem:.714`, `ease:.016`, `curve:.012`. |
| Head | Width .945, faceLength 1.09, noseProjection .006, bridgeProjection .003, chinDrop .007, chinProjection .0035, jawTaper .004, earProjection .002, browLower .0015, hairSweep .012, hairLift .012, stubble .57. Hard-coded generator CFG, mirrored in the record JSON. |
| Corrected hair | Existing `Hair / crop` part (historical name), 13,825 vertices. Side lift/sweep removed below crown while retaining crown shape; broad ring fade .72–1.0; crown local-Z transition .211–.248; dark RGB [36,32,29], short RGB [65,55,47]. Correction lives in generator helper and is already baked. |
| Facial hair | Deterministic skin vertex-colour field, stubble .57. No separate beard mesh/texture file. |
| Sculpt palette | Skin #c79c83, lip #a9766a, cheek #c68b79, hair #24201e, hairLight #413730, iris #58584d, hairStyle `sweep`. Actual per-vertex colours contain additional authored variation. |
| Body skin shader | Skin #c79c83, shadow #88695a, light #efd0b6 in player source. |
| Kit/equipment style | Shirt #19badc, shirtDark #087fb4, shorts #14aacd, socks #13aed0, trim #ddde53, ink #172f42, number `1`, design `stripe`. |
| Gloves / boots | Latex #edece5, glove pad #e3e4df, cuff #d4d6d3; boots #ece7db, sole #bdd352. Sculpted glove retained; `bareHands` is not enabled. |
| Finished kit atlas | Base #19badc, navy #203575, secondary #088dbd, accent #e5dd59; simplified insignia, COURTOIS/1, navy collar and sleeve hems. In `kit.cjs`, not a configurable external kit asset selection. |
| Metadata | User roster entry 199 cm, 96 kg. Not fields in existing Courtois configuration and not physical-mass inputs to simulation. |

The approved head is baked mesh/vertex-colour data reproducible from reusable approved Anchor input plus hard-coded deformation/art functions. The hair is not currently a separately referenced modular file. The kit finisher also hard-codes name/number and uses generic system fonts; cross-platform rebuilding is not guaranteed to produce byte-identical typography. Use the existing embedded atlas rather than regenerate it.

## 10. Minimal dependency set and package usage

The manifest inventories every included file with category, size and SHA-256. It distinguishes two ways to consume the same character:

- **Baked runtime route (preferred first slice):** the approved GLB, its exact rig/manifest records, loader/material adapter and existing host action system. It already embeds the kit atlas and contains all approved geometry/weights. The shipped game does not need Python, review PNGs, V6 JSON fixtures or the head generator.
- **Procedural source route (reference/reproduction):** the complete source chain, both registered runtime head JSONs, configuration, canonical skeleton dependency, tall skeleton, artwork/raster modules and `kit.cjs`. Build once/load-time or offline, never every tick. This handoff does not run it. `player-morphology.js` is CommonJS; a browser needs bundling/data loading, not a bare script tag.

| Package category | Contents | Needed in shipped player storage? |
|---|---|---|
| A runtime/source | One approved GLB; procedural dependency closure; shader/projection source; action snapshot; directly loaded environment harness inputs | Only the chosen runtime representation and host code/assets. Do not ship both representations unnecessarily. |
| B generation/build | Head generator, corrected-hair helper, recorded parameters, exporter, PNG writer, existing compositing/source-study scripts | No, unless used by an editor/build tool. |
| C validation | Shared/tall/mirror motion fixtures, ball/camera data, prior validation records, browser gates/probes | Development/CI only. |
| D optional visuals | Four unchanged corrected images: final gameplay, exact player crop, inspection, multi-facing hair evidence | Review only. |
| E omitted | Shared-rig model, duplicates, rejected hair, other 19 players, old face iterations, review HTML/video/frame sequences, full legacy sprite libraries | Not required for this integration. |

Only the environment harness's directly loaded textures/metadata are included. The original source environment manifest references additional sprite assets that are intentionally omitted. This is **an independently extractable character integration package, not a replacement complete Touchline repository or runnable full match page**. Run browser animation gates against Claude's existing full application. The original environment README's server instructions describe its larger source package, not this reduced subset.

Observed external dependencies: Node CommonJS and `@napi-rs/canvas` **0.1.100** for procedural kit/offline rendering (`CODEX_PRIMARY_RUNTIME_NODE_MODULES` must point at the containing modules directory); Python 3 standard library for the current head generator and package verifier; `puppeteer-core`, Chrome and the complete host page for browser gates. Browser probe scripts hard-code a macOS Chrome executable: configure their launcher for the local machine. No Blender or fresh sculpt operation is required to consume/reproduce this approved asset from its cached base input.

After extracting, run only the read-only integrity check:

```sh
python3 handoff/verify_package.py
```

Do not run the generation/export/gameplay scripts merely to inspect this handoff. They write outputs. The existing model and reference evidence are already included.

## 11. Ordered integration plan for Claude

1. **Compare the current branch to the inspected snapshot.** Locate the listed action/description/graph/IK symbols, keep newer distribution work, record the host baseline traces and event list. Add the finished character behind a presentation selection; do not edit simulation/action decisions.
2. **Load the existing GLB unchanged.** Import exact joint names/order, tall offsets and asset inverse binds. Establish a serialized-to-runtime skeleton adapter and reset default construction rotations before actions. Prove bind/neutral skin reconstruction without changing the file. Use scale 1.
3. **Connect evaluated rotations → tall FK → existing procedural solve → final skin.** Preserve pose/IK/head-look ordering. Do not consume shared V6 matrices as the new animation; preserve the shared V6 path as its own regression baseline. Calibrate local palm/sole/laces support metadata to the existing geometry.
4. **Make the first contact slice work:** snapshot scenario **64**, “D1 PUT DOWN central (chest catch → place ahead → free ball)”. This covers set, catch, held support, lowering, release, facing/root, both foot plants and return. Keep the event tick and ball path from the current host. Resolve scenario by name if indices changed.
5. **Match C and Mixed in that slice.** Retain native character density 4 and environment 2, same camera and pixel footprint. Preserve the corrected hair and vertex colours. Use correct ball/character occlusion and fixed physical ball radius; do not transfer the temporary palette shader or tall-scaled ball bug.
6. **Validate V6 fixture 42 and left fixture 49.** Shared original data stays frozen; tall solve must preserve authoritative facts plus the accepted presentation trajectory/timing requirement. Check load, takeoff, extension/contact, impact, half-kneel, get-up and ready return. Scenario 64 provides the catch/release coverage that fixture 42 lacks.
7. **Then migrate existing actions:** roll R/L (65/66), throw R/L/straight (67/68/69), punt R/L (70/71), angled catch/distribution (72–75), foot saves and recovery. The manifest includes the complete snapshot scenario-name map. Do not add absent clearance/drop-kick motions as part of this character integration.

If the accepted presentation-root/timeline and fixed authoritative contact are geometrically inconsistent for the new rig, expose the residual and the exact constraint conflict. Do not resolve it by changing simulation, scaling limbs, substituting shared-rig Courtois or quietly accepting a new timeline.

## 12. Regression gates and what is already proven

Existing tools, all copied without modification:

- `scene-density/environment/sandbox/visual/tools/anim3d/gk3d_gate.js`: sprite vs 3D simulation trace comparison while drawing every tick.
- `scene-density/environment/sandbox/visual/tools/anim3d/gk3d_gate_compare.py`: compares saved hashes and prints first trace difference.
- `scene-density/environment/sandbox/visual/tools/anim3d/gk_motion_manifest.js`: pose/joints, roots, contact, held/cradle, distribution plan/events/records, feet and diagnostics.
- `scene-density/environment/sandbox/visual/tools/anim3d/gk3d_export_motion.js`: world matrices, rig and camera export; useful future regression output, not a reusable tall retargeter.

The existing gate records position/velocity/hand/ball/held/state/commit/contact at **four decimal places**. It does not directly include all distribution events, facing, camera, or a backend-disabled run. The comparison helper prints a result but has no failure exit code. Use it as a starting point; for acceptance, assert full-precision simulation equality and explicit event/camera fields, add animation-OFF comparison and make CI fail on a mismatch. Do not mistake identical rounded hashes for proof of equality of omitted fields.

Example future invocation, from extracted package root, with `--url` pointing at Claude's complete running host and launcher configured locally:

```sh
node scene-density/environment/sandbox/visual/tools/anim3d/gk3d_gate.js --backend sprite --scenarios 42,49,64,65,66,67,68,69,70,71,72,73,74,75 --ticks 600 --out gate-sprite.json
node scene-density/environment/sandbox/visual/tools/anim3d/gk3d_gate.js --backend 3d --scenarios 42,49,64,65,66,67,68,69,70,71,72,73,74,75 --ticks 600 --out gate-finished.json
python3 scene-density/environment/sandbox/visual/tools/anim3d/gk3d_gate_compare.py gate-sprite.json gate-finished.json
```

These commands were **not run in this handoff**. They exercise the host's selected implementation; the unmodified copied probe does not itself activate a new finished-character backend or add OFF/full-precision/event checks. Run until each distribution finishes and returns to set; increase the capture only for actions that have not completed. Compare the original 320-frame fixtures over their exact recorded interval.

| Gate | Required evidence |
|---|---|
| Simulation / animation ON-OFF | Exact per-tick equality of authoritative ball position/velocity/control/held, keeper root/velocity/facing, commit/action/outcome and contact history across OFF, original and finished presentation. Run fixed 60 Hz with identical initial state. |
| Contact / release | Exact same contact/RELEASE/DROP/KICK event ticks, points, velocities and outcomes. Compare actual punt kick, not only prediction. |
| Root / camera | Authoritative root and facing unchanged; camera matrices/rail/zoom identical. Report presentation-root separately. Preserve frozen V6 presentation timing/root requirements; do not silently conflate the two roots. |
| True proportions | GLB SHA-256 unchanged, world scale 1, 23 joints and exact bind origins/inverse binds. Measured bind height remains 2.009486914 m within float32 tolerance, not normalized to metadata or shared height. |
| V6 | Original shared 320-row fixture untouched; same contact at 1.05 s / row 62. Preserve phase/root contract for the tall integration; show all major lifecycle poses and mirror case. |
| Feet | Measure finished sole height and planted world-position drift during sustained locks, excluding explicit replant/release windows. Existing `diag.feet.residual` is an ankle proxy and must not replace sole checks. |
| Hands / ball / boots | Measure signed closest surface distance and contact normal for actual glove/palm or laces at constrained frames; inspect approach and release neighbors. Existing hand-centre residual/foot-radius diagnostics alone are insufficient. |
| Body / kit deformation | Check collar, shoulder, shorts crotch, inner thigh, glute/knee and glove cuffs at load, full extension, contact, impact, half-kneel/get-up. Preserve underlying mesh/weights; any reported failure belongs to the solve, not an unrequested sculpt revision. |
| Presentation / hair | Compare final 2000 × 1800 Mixed and exact crops at multiple facings. No skin-coloured scalp notch; no colour-space shift or generic PBR substitute. |
| Determinism | Fresh reset and identical fixed-tick order produce identical poses/traces; same renderer/platform produces identical pixel hashes. Test display-rate independence with fixed-tick solve rather than assuming stateful IK is frame-rate independent. |

**Suggested new presentation acceptance targets, not existing certified tolerances:** bind reconstruction ≤1 µm; settled plant horizontal drift ≤5 mm and sole penetration ≤3 mm; intended ball/support surface gap 0–10 mm with penetration no worse than 3 mm, plus ≤1 final-display-pixel contact error; no visible body/clothing separation at gameplay or diagnostic scale. Agree stricter host tolerances if already present. These targets do not excuse moving ball/root/events. Existing graph continuity flags use excess relocation >0.03 m, velocity jump >1.5 m/s, root rotation >5°, pelvis/chest >15°, possession/distribution hand jump >0.20 m at stage boundaries; retain them, but they do not establish skin-surface contact quality.

**What this package actually verifies:** approved input SHA-256 checks passed; roster Courtois matches the authoritative GLB; corrected cached head matches current runtime head; export geometry/weights/binds were parsed directly; saved shared/tall fixtures were compared without running simulation; dependency paths were resolved; package files were extracted and checked against the manifest. `hair-readability/validation.json` records eight static facings and READY plus seven shared-rig V6 action samples, and that only the hair primitive changed. Historical full V6 videos were retained without rerendering. `morphology/delivery-validation.json` records the earlier shared-rig sequence validation and true-height static limitation.

**Not yet proven:** full corrected true-height Courtois through distributions/dives/recovery, finished glove/boot surface contacts, final live GPU C-shader parity, shared ball/character depth in Mixed, and compatibility with Claude's unseen current branch. Those are the bounded integration tasks above; the handoff does not conceal them behind the shared-rig fallback.
