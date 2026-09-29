# 3D / 2.5D skeletal animation prototype — vertical slice findings (goalkeeper far dive)

Branch `prototype/3d-animation-pipeline` (not pushed). Baseline `main` @ ff3a89f, tag `checkpoint/sprite-baseline-2026-09-19`. Date 2026-09-19.
Everything below was measured on the built-in deterministic scenario `GK_SCENARIOS[42]` ("S4 K2 high tip-up", real POWER shot, zero RNG) unless stated.

## What was built (commits on the branch)

| commit | content |
|---|---|
| `docs: audit animation presentation architecture` | `ARCHITECTURE_AUDIT.md` + diagram + scenario scan/trace |
| `refactor: isolate presentation backend interface` | `anim3d/gk_backend.js`: `GK_PRESENTATION` registry, `gkPresentationDraw()` dispatch in `ptDrawKeeper`, `gkActionDescription()` (layer B view), review-only select / `?gkBackend=3d` / key 8 |
| `prototype: add skeletal goalkeeper renderer` | `anim3d/m4.js`, `skeleton.js` (23-bone shared skeleton), `gl_renderer.js` (zero-dependency WebGL2, CAMERA_V1-identical projection, low-res target + nearest upscale, 3-band palette shading, id/depth outline), `gk3d_backend.js` (composite at the keeper's depth slot, contact metric, overlays, perf) |
| `prototype: add contact target ik` | `anim3d/ik.js`: 2-bone analytic IK on the FK result (glove centre → simulation hand; plant foot) |
| `prototype: add goalkeeper animation graph` | `anim3d/gk_far_dive_clip.js` (authored bone-space keys), `anim3d/gk_graph.js` (phase mapping with the sprite sequence contract, geometry-driven trunk redirect, plant lock, ground clamp, torso assist, look-at, presentation-root continuation, root contract) |
| `tools: 3d backend gate + captures` | `tools/anim3d/gk3d_gate.js` + `gk3d_gate_compare.py`, `capture.js`, `compose.py`, `perf_scale.js` |

No production file, simulation constant, keeper mechanic, ball physics, outcome or sprite asset was changed. The sprite backend remains the default; the 3D code is confined to `sandbox/visual/anim3d/` plus one dispatch line and the debug-panel controls.

## Verification — simulation(sprite) == simulation(3D)

`verification/GATE_COMPARE_sprite_vs_3d_all_scenarios.md`: **all 43 built-in scenarios × 160 ticks identical** between the SPRITE backend and the SKELETAL_3D backend, each drawing the keeper every tick. The per-tick trace hashed per scenario contains keeper root (x, y), keeper velocity, hand, leg tip, ball position, **ball velocity**, held flag, gk state/phase, commit record (action, t0, target, commit tick) and contact record (tick, volume, outcome, point). Scenario 42: hash `4a9f3e8c2bd9f2ee` both, commit tick 38/38, contact tick 62/62. Page errors: 0.

## Contact synchronisation (E)

| backend | art at the contact tick | drawn glove vs simulation hand at tick 62 |
|---|---|---|
| SPRITE (approved) | contextual save pose DIVE_NORTH_MEDHIGH, placement raw 50 px, capped 12 px → **residual 38 sprite px (0.75 m), flagged WRONG_CLIP** | 15.5 screen px at gameplay zoom |
| SKELETAL_3D | authored REACH key + solved body axis + glove IK | **4.7 cm (2.6 screen px at zoom 3.5)**; IK reports `reached: false` because the target sits 3 cm beyond the straight arm — shown honestly, not stretched |

The IK residual falls monotonically from 0.99 m (u 0.45, weight 0.22) to 0.047 m at the contact tick (`captures/F_…png`, lower panel). Nothing about the ball, hand or contact point was moved.

## Root contract (F)

`captures/F_sim_root_vs_presentation_root_and_ik_residual.png`: the simulation root travels 0.57 m laterally during the dive (its own footFrac law) and is never written; the presentation-root offset is 0 until execEnd (tick 66), peaks at 0.37 m at tick 99 (same continuation law and constants as the sprite sequences) and is exactly 0 by tick 129 when the resolver returns to SET. Cap 0.6 m never reached. The shadow follows the presentation root; the depth-sort key stays the simulation root.

## What the A/B shows (A, B, C, D)

- `captures/A_side_by_side_gameplay_zoom.png`, `B_gameplay_sprite_vs_3d_normal_speed.gif` (30 fps = real time): at the real camera (zoom 1.25) the 3D keeper sits in the same place, at the same size, with the same shadow and depth order as the sprite keeper; the game still reads as Touchline.
- `captures/A_side_by_side_close_zoom.png`, `C_keeper_crop_sprite_vs_3d_4x_slowmo.gif`, `D_E_F_3d_debug_bones_ik_roots_4x_slowmo.gif`: SET → LOAD (tick 38–41) → PUSH (41–47, plant foot locked) → FLIGHT (47–62, airborne, arm rising) → CONTACT (62, glove on the simulation hand) → LAND (66–93) → RECOVER (93–129) → SET.
- **The two backends disagree on the physical action, and the 3D one is right.** The committed target is at lateral 1.26 m / height 2.68 m: a near-vertical tip over the bar. The sprite library has no vertical-jump art (deferred in the GK review), so it plays the generic far-dive sequence, places the pose 38 px off and lands on its side. The 3D graph derives the body axis from the committed geometry (22° from vertical), jumps 0.55 m, meets the hand, and lands on its feet — with the **same** authored clip that would play a horizontal far dive for a lateral target (the redirect is continuous in the axis angle).
- Left-side saves use the mirrored clip (exact skeleton mirror — no facing swap problem as with sprite mirroring).

## Rendering options evaluated (G)

`captures/G_render_options_sheet.png` (pixelScale 1/1, 1/2, 1/3 × outline on/off, at zoom 3.5 and at the gameplay zoom):

| option | verdict |
|---|---|
| 1/1 (backing resolution) | smooth 3D look; reads as a different medium next to the sprites |
| **1/2 + outline** (default) | texel density close to the sprite art at gameplay zoom; outline keeps the silhouette readable at 30–40 px tall |
| 1/3 | chunkier than the sprites; limbs break up at gameplay zoom |
| outline off | loses the silhouette at gameplay zoom; keep on |
| C (per-character fixed texel size) | implemented as a mode switch, not evaluated visually in this pass |
| D (3-band palette shading) | used throughout; matches the flat pixel palette; kit/skin swaps are per-part colours |

## Performance (G) — `verification/perf_scale.json`, headless Chrome, ANGLE Metal on Apple M4, canvas 2560×1800 backing → GL target 550×450

| characters | keeper draw incl. graph + IK + GL, flushed (ms) | graph + IK only (ms) | GL draw calls | full frame (ms) |
|---|---|---|---|---|
| 1 | 1.30 | 0.04 | 22 | 12.98 |
| 5 | 1.09 | 0.19 | 110 | 12.38 |
| 10 | 1.60 | 0.18 | 220 | 14.46 |
| 22 | 2.25 | 0.40 | 484 | 14.82 |
| sprite keeper (reference) | 0.045 | — | — | 2.64 |

The character work scales flat (22 characters ≈ 2.3 ms); the constant ~10 ms gap between the 3D and sprite full frames is the **WebGL → 2D-canvas composite** (`drawImage` of the GL canvas forces a GPU→CPU readback in headless Chrome, where the 2D canvas is software). On a real GPU-accelerated page this is far cheaper, but the architecture should still avoid one readback per character: composite once per frame (already the case) or, longer term, layer the GL canvas above the 2D canvas and split the world into "behind"/"in front" passes so no readback happens at all. The all-scenario gate measured 0.59 ms average per keeper draw including gkAnimUpdate.

Pessimistic note: the SwiftShader path (no GPU) took 6 s for the first frame (shader compile) and 15 ms per tick — irrelevant for real machines but it means the harness must run on the GPU path.

## Findings on the architecture (H)

1. **The layer split holds.** The 3D backend consumes exactly the same resolver output (`gkAnimUpdate` → `gkActionDescription`) and the same simulation records as the sprite backend; both backends run inside the same depth-sorted frame under the same camera; the gate proves the simulation never noticed. The remaining entanglement is inside `gkAnimUpdate` (phase derivation mixed with sprite art resolution) — a mechanical extraction for a follow-up, not a redesign.
2. **Authored + procedural works and is cheaper than authored-per-context.** One authored clip (11 keys) plus a geometry-driven redirect covered a case the sprite library needed a *deferred new sequence* for. The redirect is one knob (axis angle) derived from the committed target; the authored shape (legs, trail arm, head, timing) survives. IK is a correction of a few centimetres at contact, not the action.
3. **Contact-tick authority transfers cleanly.** The same u-driven / seconds-driven contract as the sprite sequences was reused; the CONTACT key lands on the simulation's tick; early contacts (u 0.89 here) are handled by the ramped IK weight, not by moving the ball.
4. **Root contract works as specified.** No animation root motion touches gameplay; the presentation offset is a post-execEnd continuation with the sprite constants and a hard cap.
5. **Customisation seam exists.** Part materials are a palette keyed by body part; proportions are height-relative on a shared skeleton; clips are rotation-only. Not exercised beyond one keeper.
6. **No dependency was needed for the slice.** ~900 lines of in-repo WebGL2/mat4/IK. Three.js stays the recommendation once real meshes/GLTF clips are wanted.

## Honest limitations of the slice

- Art quality: capsule "part" meshes and hand-set keys authored by me in one pass; the sprite's silhouette, kit detail and face are richer. Judge the *architecture and readability*, not the polish.
- Only the far-dive trunk is authored; other save families (gather, chest catch, foot save, low collapse) fall back to the SET pose + procedural reach and are labelled as such in the HUD. Footwork/shuffle is not authored (SET pose holds).
- The blend between "land on feet" (small axis angle) and the authored side landing is a linear pose blend; the side landing itself has not been reviewed on a genuinely lateral case.
- Pixel-density parity is approximate (screen-aligned texels, Option B); Option C (character-space texels) is wired but not evaluated.
- The 2D→GL composite cost in headless is pessimistic; measure on the real page before drawing conclusions.
- Production body (`world.py`) still has no keeper phases; the slice runs on the playtest keeper like the sprite system does.

## Recommended next step (only after your review)

If the direction is approved: (1) lift `buildActionDescription()` out of `gkAnimUpdate` so both backends consume it (mechanical, gate-checked); (2) author the second dive variant (low/lateral) and one catch family to test the graph's blend rules on a lateral case; (3) evaluate Option C texel parity and a kit palette swap; (4) only then decide on three.js/GLTF for real meshes.

---

# v2 — complete goalkeeper action SET → … → SET (same simulation, same contact work)

Review page: `visual_review/VISUAL_REVIEW.html` (v2 section at the top). Deliverables: `visual_review/v2_01…v2_09*`.

## What changed (presentation only — `anim3d/gk_far_dive_clip.js`, `gk_graph.js`, `ik.js`, `gk3d_backend.js`)
- **Anticipation inside the simulation's reaction latency** (shot tick 27 → commit tick 38): REACT (head/arms, slight drop) → WEIGHT SHIFT toward the *predicted* crossing side (the keeper's own `gk.predict.crossing`, read-only) → LOAD (deep crouch, save-side leg loaded, opposite leg unloading, arms in counter-movement). The anticipation's last key *is* the LOAD key, so the commit tick is continuous. Both feet are planted by leg IK; the knees flex to the authored pelvis height instead of the pelvis being lifted.
- **Launch** (commit → toe-off, u 0–0.31 of the simulation's execTime): LOAD → PLANT → PUSH-OFF → TOE-OFF (on the toes, toe bone bends) → EARLY / MID FLIGHT → FULL EXTENSION. The solved jump/launch position (body axis from the committed target) takes over only from the toe-off, so the stored-energy crouch is real. Plant foot locked through LOAD/PLANT/PUSH, released over the toe-off; the opposite foot releases as it unloads.
- **Contact** unchanged: glove centre 4.9 cm from the simulation hand at tick 62 (IK weight ramps 0.30 → 1).
- **Landing physics** (closed-form in seconds after execEnd, deterministic): pelvis follow-through with the body's lateral momentum (root mean dive speed × the axis' lateral share) and vertical velocity from the authored extension, ballistic descent under g, first ground contact when the pelvis reaches standing height (legs extended), spring/dip absorb to the settle height, friction settle, then the get-up. Landing style from the body-axis angle (feet ≤ 35°, side ≥ 60°, blended between); this ball (22°) lands on the feet and the momentum takes the keeper to the save-side knee with the hand braced on the pitch.
- **Get-up**: settle (knee + hand brace) → push torso up → knees under → crouch → rise → ready stance. Both feet re-plant under the final root at the start of the get-up so the rise does not slide.
- **Presentation root = ground projection of the pelvis** (continuous by construction), reconciled to the simulation root during get-up/rise: 0 at SET, max 0.54 m (settled), 0.000 at the final SET; no discontinuity at any stage boundary (`v2_09_…plot.png`).
- Catmull-Rom sampling across keys (no linear pose interpolation); IK carries descendant bones (toe under a foot) and planted feet are flattened onto the pitch.

## Verification (final code)
- Sprite vs SKELETAL_3D, all 43 scenarios × 200 ticks, keeper drawn every tick: **43/43 identical** (`verification/V2_GATE_COMPARE_sprite_vs_3d_all_scenarios.md`).
- Animation OFF (`GK_ANIM.enabled=false`, nothing drawn) vs the 3D backend drawn every tick: final-tick keeper root / hand / ball / contact identical in all 43 scenarios (`verification/V2_GATE_COMPARE_animation_off_vs_on.md`).
- Scenario 42: commit tick 38, contact tick 62 (t 1.050 s, HAND, WEAK PARRY through), contact point and ball unchanged; simulation root unchanged.

## Skeleton / skinning readiness (asked explicitly)
The capsule parts are a stand-in, not an architectural requirement. The 23-bone skeleton is driven by rotation-only clips plus a pelvis translation; per-frame world matrices come from FK (IK / look-at edit world matrices only). A skinned humanoid mesh binds with `skelInverseBind(skel)` (bind = zero pose at the character's height) and `skelSkinMatrices(skel, fk, invBind)`; the material groups (skin, hair, shirt, shorts, socks, boots, gloves) map to mesh material slots, so body/face/hair/kit/gloves/boots customisation does not touch the graph. Nothing in the current skeleton blocks skinning; two items to add when real meshes arrive (not blockers): twist bones (forearm/thigh) for clean skin deformation, and turning the `hair` bone into a mesh attachment.

## Honest limits of v2
- Capsule mannequin; some poses are hand-set in a single pass (the settle/knee pose and the get-up will benefit from a real animator).
- Only the feet-landing branch is exercised by this ball; the side-landing branch (hand/forearm → hip/shoulder → slide) is authored but unreviewed.
- The get-up's step back toward the simulation root is a solved leg reach (feet planted under the final root), not a stepped walk; the residual glide during the rise is ≤ 0.29 m.
- Push-off peak pelvis velocity ≈ 5 m/s over two ticks (explosive but on the high side); landing constants (touch height, absorb time, friction) are global, not per keeper.

---

# v3 — readable load / push-off / grounded landing / supported get-up (v2 rejected at visual review)

Review page: `visual_review/VISUAL_REVIEW.html` (v3 section at the top). Deliverables: `visual_review/v3_01…v3_10*`. Per-tick trace of the reviewed capture: `verification/v3_lifecycle_trace_scenario42.json`.

## Diagnosis of v2 (reproduced and measured before anything was changed)
- **No readable wind-up / crouch / push-off.** The anticipation blended from SET toward a shallow LOAD key and the launch position (solved from the committed target) took over from the first commit tick, so the LOAD lasted one tick: pelvis 0.85 → 0.79 m, about one pixel of silhouette change at gameplay scale. The push-off was the same solved translation with the legs straightening underneath — no planted foot, no last grounded frame.
- **No readable landing / get-up.** The "settle" pose was a kneel at 0.50 m pelvis height, which reads as standing at gameplay scale; the get-up was a direct blend from that kneel to SET, so the keeper appeared to teleport to standing. The lying keeper also swung round mid-recovery because the presentation facing followed the sprite resolver's commit snapshot, which is dropped when its own clip ends.

## What changed (presentation only — `anim3d/gk_far_dive_clip.js`, `gk_graph.js`, `gk_backend.js`, `gk3d_backend.js`)
- **Set crouch on the shooter's wind-up** (`desc.windup`, from the scheduled kick; production analogue = the KICK intent wind-up): pelvis 0.85 → 0.72 m by hip + knee + ankle flexion with both feet planted by leg IK (no whole-body translation).
- **Anticipation inside the reaction latency:** REACT → WEIGHT SHIFT onto the save-side foot → LOAD. The load key is a real crouch: pelvis 0.58 m at tick 39 (0.27 m below SET), save-side knee 56°, torso leaning into the dive, opposite leg unloading, arms in counter-movement. The last anticipation key *is* the LOAD key, so the commit tick is continuous.
- **Push-off:** LOAD → PLANT → PUSH (mid/end) → TOE-OFF keys drive hip → knee → ankle → toe extension while the save-side foot is held on its plant point by leg IK; the pelvis rises 0.63 → 1.10 m over ticks 41–46 with the foot still on the pitch, the heel lifts and the toe is the last contact. The solved launch position blends in only after the plant (from u = 0.30), so the crouch is real stored energy, not a translation. Last grounded frame tick 46, first airborne tick 47.
- **Contact unchanged:** glove centre 4.9 cm from the simulation hand at tick 62.
- **Fall and landing:** FOLLOW-THROUGH (pelvis peaks 1.51 m at tick 68) → ballistic DESCENT → first ground contact at tick 89 (feet: body axis 22° from vertical on this ball, so the feet touch first, legs nearly straight) → IMPACT (knees collapse) → ABSORB (hip to the pitch, save-side hand braces from tick 101) → SETTLED (ticks 113–136: pelvis 0.28 m, head 0.29 m, both feet and both hands on the pitch). Stage timings are the closed-form landing state (deterministic, seconds after execEnd).
- **Get-up with support points:** BRACE (hands set, torso lifts) → PUSH TORSO UP (elbows extending, pelvis 0.28 → 0.46 m) → DRAW KNEE UNDER / HALF-KNEEL (front foot planted toward the simulation root; the kneeling foot keeps its tucked plant point and its lock fades out as the authored kneel takes over — the IK knee pole blends from forward-up to the authored bend plane with the lock weight, floored at the pitch) → CROUCH (both feet planted under the root) → RISE → SET at tick 245. No lying → SET interpolation anywhere.
- **Root reconciliation** happens only through those support points: presentation root (ground projection of the solved pelvis) is 0.55 m from the simulation root while settled, 0.30 m in the half-kneel, 0.13 m in the crouch, 0.000 m at the final SET. Feet move only by re-plants blended over 0.2 s. Simulation root untouched.
- **Presentation facing frozen for the whole committed action** (`state.facing` keyed by the commit tick).
- **Foot-contact diagnostic:** the 3D backend label and the review player readout show `RIGHT FOOT: PLANTED/RELEASED · LEFT FOOT: PLANTED/RELEASED` (PLANTED = held on its world plant point by leg IK).
- **Review-only holds:** the held-phase GIF pauses on SET, LOAD, DEEPEST CROUCH, PUSH, LAST GROUNDED FRAME, TOE-OFF, FLIGHT, CONTACT, DESCENT, FIRST GROUND CONTACT, SETTLED, BRACE, HALF-KNEEL, CROUCH, SET; the gameplay clip has no pauses (the graph has no hold states).

## Frame-by-frame acceptance (checked on the captured frames, close zoom and gameplay camera)
| check | result |
|---|---|
| knees visibly bend before take-off | yes — set crouch → load, knee 56° at tick 39 |
| pelvis visibly drops | yes — 0.85 → 0.58 m (21 px at close zoom, 5 px at gameplay scale) |
| planted leg visibly extends to launch | yes — ticks 43–46, foot held on the pitch while the pelvis rises 0.47 m |
| recognisable last grounded frame | yes — tick 46 on the toe; airborne from 47 |
| keeper visibly descends after contact | yes — 66 → 89, pelvis 1.51 → 0.94 m |
| visibly contacts and settles on the pitch | yes — feet 89, hip down by 108, settled 113–136 (head 0.29 m) |
| visibly braces and gets up | yes — hands on the pitch 101–182, torso up on the arms, knee under, half-kneel 173–193, crouch, rise |
| no airborne / grounded → SET teleport | yes — every stage boundary blends; largest pelvis step outside push-off and impact is 3 cm |

## Verification (final code)
- Sprite vs SKELETAL_3D, all 43 scenarios × 260 ticks, keeper drawn every tick: **43/43 identical** (`verification/V3_GATE_COMPARE_sprite_vs_3d_all_scenarios.md`).
- Animation OFF (nothing drawn) vs the 3D backend drawn every tick: final-tick keeper root / hand / ball / contact identical in all 43 scenarios (`verification/V3_GATE_COMPARE_animation_on_vs_off.md`).
- Scenario 42: commit tick 38, contact tick 62 (t 1.050 s, HAND, WEAK PARRY), contact point, ball and simulation root unchanged.
- Perf (headless, ANGLE Metal, 1/2-res target): 0.6 ms average per drawn tick across the gate.

## Honest limits of v3
- The settled pose on this feet-first ball is a curled heap (hip and shoulder down, knees folded) rather than a full side-lying stretch; the side-landing branch (axis > 60°) is authored but not exercised by this ball.
- A 3 cm knee-under bump remains at ticks 179–181 (under one gameplay pixel): the blend from the lying push-up shape to the authored kneel briefly puts the kneeling knee below the pitch and the ground clamp lifts the body.
- Push-off peak pelvis speed ≈ 6 m/s over four ticks (explosive, on the high side); landing / get-up timings are global constants, not per keeper.
- Capsule mannequin; poses are hand-set in a single pass and will benefit from an animator.

---

# v4 — momentum-continuous flight and landing (v3's post-contact trajectory rejected at visual review)

Review page: `visual_review/VISUAL_REVIEW.html` (v4 section at the top). Deliverables: `visual_review/v4_01…v4_06*`, synced BEFORE/AFTER player. Trace: `verification/v4_lifecycle_trace_scenario42.json` (per tick: drawn pelvis, stage, flight velocity, plan, trajectory markers).

## What was measured first (`v4_01_velocity_before_after.png`, left)
- Presentation-root lateral velocity in the reviewed build: 3.1 m/s in the push-off, 2.1 m/s at toe-off, **decaying to −0.1 m/s by the contact tick**, a step to a constant 0.71 m/s at execEnd, zero 0.12 s after touchdown. Vertical: a 0.2 m body lift at toe-off and 0.06 m at touchdown from the ground clamp, a 0.28 m lift during the absorb.
- Cause 1 — `gkGraphRedirect`: the flight pelvis was a blend toward a fixed solved offset in the frame of the simulation root. The simulation moves its root 45 % of the way to the target with a smoothstep and stops at execEnd; the body inherited that stop.
- Cause 2 — `gkLandingPlan`: the landing started a fresh constant lateral velocity (`travel/execTime · sinθ + 0.25`), unrelated to the flight.
- Cause 3 — `gkLandingState`: one constant deceleration to zero right after touchdown, no slide.
- Cause 4 — the ground clamp lifted the whole body whenever an authored leg poked through the pitch, and foot locks released on a timer rather than at full extension; both displaced the root mid-flight.

## What changed (presentation only — `gk_graph.js`, `gk_backend.js`, `gk3d_backend.js`, `gk_far_dive_clip.js`)
- **One launch plan in world space, built at the plant** (`gkLaunchPlan` / `gkLaunchState`): constant-acceleration push from the plant (with the pelvis' measured velocity there) to the toe-off, arriving with the launch velocity; then a ballistic arc — constant horizontal velocity, gravity only — that passes through the solved full-extension pelvis at execEnd. The simulation root's end point is closed-form (`commit.rootEnd`, read from the simulation's own Stage-4 formula), so the arc is known at the plant. Contact is a point on the arc; the arc continues unchanged through and past execEnd until it reaches the touch height.
- **Landing from the arc** (`gkLandingPlan` / `gkLandingState`): touchdown time and place are where the arc comes down; horizontal velocity there is the flight's; deceleration is progressive on the ground (skid 1.5 m/s² → body impact 3.0 m/s² → slide friction bringing the remainder to zero by the end of the settle); vertical velocity is absorbed with velocity-continuous height segments. Stage shapes unchanged apart from a slightly stronger lean and a trailing leg through the descent/touch keys.
- **Reconciliation only through support points**: PUSH_UP draws the hips back over the tucked feet (22 % of the offset), HALF_KNEEL steps the front foot toward the simulation root (50 %), CROUCH plants both under it (85 %), RISE finishes; re-plants longer than a shuffle lift the foot over the move (a step); the three supported stages slow down with the distance to recover (×1.8 on this ball).
- **Locks by reach, legs floored at the knee**: a planted foot stays planted while its leg can reach the plant point (toe-off = full extension), and a leg below the pitch bends (leg IK to the ground point) instead of lifting the body; only the body core can still lift the pelvis.
- **Trail overlay** (`--dbg trail`, checkbox "presentation-root trajectory"): pelvis path, ground track, velocity vectors every 6 ticks and at the markers TOE-OFF (last foot on the pitch) / CONTACT / APEX / TOUCHDOWN / SETTLE, stacked labels with speeds.

## Result on scenario 42 (`v4_01…`, right; trace)
| where | lateral m/s | vertical m/s |
|---|---|---|
| plant (tick 41) | 1.0 | 0.7 |
| toe-off (51, last foot on the pitch) | 1.57 | +3.8 → +3.1 |
| contact − / + (61 / 63) | 1.57 / 1.57 | +1.4 / +1.1 |
| execEnd (66) | 1.57 | +0.6 |
| apex (70, 1.52 m) | 1.57 | 0 |
| touchdown − / + (90 / 92) | 1.57 / 1.52 | −3.2 / −2.7 |
| end of impact (100) | 1.33 | −1.8 |
| end of absorb (114) | 0.61 | −0.1 |
| settle end (138) | 0 | 0 |

No velocity step larger than 0.05 m/s per tick at toe-off, contact, execEnd, touchdown or the start of the slide; no body lift anywhere in the flight or landing. Touchdown 0.36 m further along the dive than before; 0.59 m of ground travel; settled 1.47 m from the simulation root (0.55 m before); SET at tick 304 (246 before). Glove 6.4 cm from the simulation hand at contact (4.9 cm before).

## Verification (final code)
- Sprite vs SKELETAL_3D, 43 scenarios × 260 ticks, keeper drawn every tick: **43/43 identical** (`verification/V4_GATE_COMPARE_sprite_vs_3d_all_scenarios.md`); animation OFF vs 3D ON: 43/43 identical (`verification/V4_GATE_COMPARE_animation_on_vs_off.md`). Simulation root, ball, contact tick / point / outcome and reach untouched.

## Honest limits of v4
- At the fixed Touchline camera this dive runs along the goal line, i.e. in depth: a metre of travel is about 8 gameplay pixels up-screen. The continuation is unmistakable at close zoom and in the trail; at gameplay scale it reads as landing and settling further up the goal line.
- The settled pose is still the feet-landing heap; the side-landing branch is authored but unexercised by this ball.
- The trailing legs / continued torso rotation through the descent are authored keys with a modest lean, not simulated; a real dive would rotate further onto the side.
- The half-kneel step toward the simulation root is long on this ball and reads as a lunge; the offset to recover (1.47 m) is what the arc physically produces given that the simulation's own root stops at 45 % of the way.
- The kneeling foot's lock fades while the authored kneel takes over (residual up to 0.8 m at tiny weight), as in v3.

---

# v5 — get up where he landed, then step back (v4 flight and landing accepted; its recovery rejected)

Review page: `visual_review/VISUAL_REVIEW.html` (v5 section at the top). Deliverables: `visual_review/v5_01…v5_06*`, synced player. Transition trace: `verification/v5_transition_trace.md`. Per-tick trace: `verification/v5_lifecycle_trace_scenario42.json`.

## What the trace found (before changing anything)
- No sign flip, no local/world confusion, no mirroring: along the dive direction the presentation offset is +1.470 m at the last SETTLE tick (137) and +1.470 m at the first BRACE tick (138); simulation root, presentation root, pelvis (world and local) and all support points are identical across the boundary, and the ROOT→PRES vector stays on the dive side for the whole recovery.
- What moved the body was the reconciliation v4 put inside the get-up: PUSH_UP pulled the hips 22 % of the offset toward the simulation root, HALF_KNEEL 50 %, CROUCH 85 % — 0.7 m of a lying / kneeling body sliding toward the root at up to 3 m/s, plus support points computed around the root (front foot 0.6 m ahead of the pelvis). At 60 fps that reads as the body jumping to the near side and getting up there.

## What changed (presentation only — `gk_graph.js`, `gk3d_backend.js`)
- **GET-UP in place**: BRACE, PUSH_UP, HALF_KNEEL, CROUCH and RISE hold the pelvis at the settled point; the settled pelvis is the recovery origin by construction. Support points (tuck, front foot, stance) are placed around the current pelvis, never around the simulation root. Recovery stage durations are the v3 constants again.
- **REPOSITION** after standing: the offset is walked back with shuffle steps — `ceil(dist / 0.5)` steps of 0.30 s (three on this ball), one foot moves per step (lead foot toward the root, then the trailing foot closes, then the lead foot again), the lifted foot arcs 10 cm, the pelvis advances one step length per support change with a 3 cm bob, then SET on the simulation root.
- **Direction test overlay** (roots overlay): cyan DIVE arrow from the presentation root, magenta SIMULATION ROOT → PRESENTATION ROOT arrow labelled with its length and "dive side" / "OPPOSITE SIDE!".
- **Boundary assertions** (development): at every stage change after contact the backend records Δroot, Δpelvis, the displacement in excess of what the previous tick's velocity predicts, and Δvelocity (`GK3D.asserts`, console warning above 3 cm / 1.5 m/s). All 12 boundaries pass; SETTLE → BRACE is 0.000 m / 0.000 m / 0.02 m/s.
- Trail markers STAND and SET added (SET's check previously matched "SETTLE" by substring).
- Frozen: everything through the settle is the v4 trajectory — the per-tick trace up to tick 137 is identical.

## Result on scenario 42
offset along the dive: +1.470 m from tick 114 (settle) to tick 245 (standing); REPOSITION 246–299: 1.47 → 0.98 → 0.49 → 0.00 m over three steps (lead L foot 0.57 m, trailing R foot 0.98 m, lead L foot 0.57 m, plus a final 0.5 m stance adjust of the R foot at SET); SET at tick 300. Gates: sprite vs 3D 43/43 identical; animation OFF vs ON 43/43.

## Honest limits of v5
- The shuffle is brisk (2.4 m/s peak pelvis speed) and the trailing leg stretches for a few ticks before its own step because its lock is reach-capped; there is no authored stride, the body holds the SET pose with a bob.
- SET arrives at tick 300 while the simulation's keeper is ready earlier; the presentation is late by ~0.9 s on this ball.
- The remaining v4 limits (heap settle pose, modest trailing legs, side-landing branch unexercised) still apply.

---

# v6 — the body that lands on the right side gets up from the right side

Review page: `visual_review/VISUAL_REVIEW.html` (v6 section at the top; focused DESCENT → KNEEL outputs only, 5 MB). Bone-by-bone trace: `verification/v6_skeleton_settle_to_brace.md`.

## What the skeleton trace found
- The flip was at **tick 130, mid-SETTLE**, not at SETTLE → BRACE, and not in the recovery clip: at tick 129 the sprite resolver's state goes RECOVER → SET (its commit snapshot is dropped when its own clip ends); at tick 130 it re-derives `cur.side` from the live ball — on the keeper's other side after the parry — and flips RIGHT → LEFT. The 3D graph mirrored every post-contact shape by that live side: pelvis roll −82° → +82°, shoulders swapped (right 0.06 m ↔ left 0.55 m) in one tick, and the get-up ran on the left.
- Root position, facing and support points were continuous, which is why the root-only checks passed.

## What changed (presentation only — `gk_graph.js`, `gk3d_backend.js`)
- **Mirror side frozen for the committed action** (`state.side`, keyed by the commit tick, like the facing).
- **Landed side as an explicit recovery input**: `gkLandedSide(skel, fk)` measures which shoulder / hip is lower at the first SETTLE tick (RIGHT / LEFT; FEET / FRONT / BACK otherwise). From the settle on, the recovery shapes and the support (brace) side use it; a mismatch with the landing chain is recorded (`state.recoveryMismatch`) rather than flipped — no separately authored branch exists yet.
- **Rotation continuity assertions**: world-orientation angular difference of root / pelvis / chest / thighs / upper arms at every boundary after contact (fail above 5° root, 15° pelvis / chest), plus a per-tick side / roll-sign flip assertion while the body is down.
- **Foot locks fade instead of cut** (release over 0.15 s; a new plant blends from the foot's solved position; a step-length re-plant keeps the authored knee plane while the foot travels). These removed the 54° / 91° thigh snaps the rotation check exposed at IMPACT → ABSORB and HALF-KNEEL → CROUCH.
- **Markers**: L / R at shoulders and hips, pelvis and chest local axes (bones overlay); `LANDED <side>` on the label.

## Result on scenario 42
Right shoulder 0.06 m / right hip 0.10 m on the pitch at ticks 135–140 with identical orientations across SETTLE → BRACE (0.0° for every measured bone); pelvis roll −82° from the settle, lifting to −69° by tick 148 as the brace begins. No assertion fires. Flight, landing and settled root unchanged. Gates 43/43 both ways.

## Honest limits of v6
- The recovery for a landed side that differs from the dive side is not authored: it would be reported, and the landing-chain mirror kept.
- `gkLandedSide` is a height heuristic (shoulder + hip tilt); it is measured once, at the settle.
- Remaining v5 limits (brisk shuffle, no stride, late SET) still apply.

---

# v7 — the exact v6 animation on a skinned humanoid character

Review page: `visual_review/VISUAL_REVIEW.html` (v7 section at the top). Deliverables `visual_review/v7_01…v7_11*`. Code: `anim3d/skin_mesh.js` (new), `gl_renderer.js` (skinned program + path), `skeleton.js` (`skelBuild(H, prop)`), `gk3d_backend.js` (variants, skin matrices), page selects, capture options `--character`, `--variant`.

## What was built
- A procedural skinned humanoid test body lofted from the skeleton's bind pose (elliptical cross-section tubes per limb chain, torso, neck, head; material per vertex; seams duplicated so flat parts don't sawtooth): 1 260 vertices, 2 156 triangles, 7 material groups. GPU linear-blend skinning, ≤ 4 influences, two bones across each joint; bone matrices = world × inverse-bind from the v6 solve (IK / look-at included). One draw call; 0.55 ms per drawn tick in the 43-scenario gate (mannequin 0.46 ms).
- The 23-bone hierarchy is used unchanged; the mannequin remains a debug option (`GL3D.character`).
- Proportion / appearance variants (`GK3D.variants`): default, taller/longer-limbed (+6 % H, legs +5 %, arms +7 %, girth −3 %), shorter/stockier (−6 % H, limbs −4 %, girth +14 %), alternate skin tone, alternate jersey. Presentation only; the simulation keeper is unchanged.

## Findings
- **Through the pixel/2.5D pass at gameplay scale the skinned body reads as a Touchline character** (same silhouette language as the sprite art) and is slimmer than the mannequin. Normal 3D is available for inspection.
- **Deformation** through crouch, knee/hip flexion, explosive extension, elbow extension, glove reach, torso roll, ground contact, kneel and get-up is clean. No candy-wrapper forearm (the v6 reach carries no forearm twist that would expose it), no broken elbows, no collapsing knees, no detached gloves/boots.
- **Weak spot: the shoulder.** With the arm raised above the head the arm's deltoid cap reads as a separate ball on the torso — a single clavicle/upper-arm blend with no corrective. Self-intersection appears only in the authored settle heap (arms through the torso): the pose, not the skinning.
- **Skeleton sufficiency:** sufficient; not modified. Would improve a production character (all additive, clips unaffected): upper-arm twist, forearm twist, a shoulder corrective / clavicle weight, a second spine bone.
- **Safe as mesh/material changes:** skin tone and all kit colours (identical motion and reach); mesh detail such as face, hair, kit cut.
- **Needs retargeting:** proportions. Rotation-only clips and the graph's re-solve make the tall and short bodies play the same asset, but three things are in metres, not bone lengths — the clip's pelvis offsets (crouch depth), the support-point offsets (0.42 / 0.20 / 0.50 m) and the landing heights (scaled by H only). Measured glove residual at contact: tall 1.4 cm, default 6.4 cm, short 14.8 cm — a 6 % shorter keeper cannot quite reach the simulation's hand point with this clip. Fix path: per-height retarget of the metre constants, or tie the simulation's reach envelope to the keeper's height.
- **Neutrality:** 43/43 identical both gates with the skinned character drawn every tick; all variants share the identical simulation root and contact.

## External asset requirements (only if a real character is wanted; not needed for this proof)
glTF 2.0 (.glb) with skinning; humanoid joint set mapping onto this hierarchy (extra twist / finger bones are fine, parented to ours); Y-up, metres, T- or A-pose bind; ≤ 4 influences per vertex; materials split by kit part (jersey / shorts / socks / boots / gloves / skin / hair); ~2–6 k triangles for this pixel scale; a licence permitting redistribution in a game (CC0 / CC-BY or a purchased game-asset licence; no editorial-only or non-commercial terms).
