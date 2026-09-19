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
