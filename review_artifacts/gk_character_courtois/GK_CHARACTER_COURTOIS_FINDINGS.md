# GK CHARACTER — Courtois integration into the Touchline 3D goalkeeper system (2026-09-23)

Review page: `review_artifacts/gk_character_courtois/GK_CHARACTER_COURTOIS_REVIEW.html`
Handoff inputs (copied): `review_artifacts/gk_character_courtois/handoff/` (Astra's integration handoff + character manifest).
Rule of the work: **SIMULATION DECIDES WHAT HAPPENS. ANIMATION VISUALLY EXPLAINS WHAT HAPPENED.**

## 0. Summary

- The approved `Touchline_Player_courtois.glb` (sha256 cfd70a3ad37089079911da23de56ddfcf2a1aeb38aacdfc73b6238902a32b76d, 22,135,988 B) is now a selectable character of the 3D backend (`GL3D.character = "COURTOIS"`, select box entry, `?gkChar=courtois`). It is used unchanged: no rescale from the 199 cm roster height (world scale 1, rig H 2.014 m, bind height 2.0095 m), no rebuild, no mesh edit.
- Every action of the current branch's library (fixtures 0–79: set / footwork, catches, gathers, far and low dives, foot saves, landing, recovery, half-kneel / get-up, put-down, roll R/L, throw R/L/straight, punt R/L, angled and front-view distributions) plays through Courtois's true tall FK and the existing procedural IK / contact solve: **0 continuity assertion failures, every final simulation state identical to the test keeper's.**
- **Simulation neutrality (full double precision):** presentation OFF ≡ sprite ≡ 3D test keeper ≡ 3D Courtois on all 80 fixtures × 260 ticks and the 12 distribution fixtures × 300 ticks — per tick: ball position + velocity + held + ctrl, keeper root + velocity + facing, action / commit, contact tick / volume / outcome / point, every RELEASE / DROP / KICK event, camera rig.
- The frozen shared-rig V6 fixture (42, test character) is byte-identical to the v13.1 manifest (every joint, every tick). The other frozen test-character manifests differ only by the intended ball-radius fix (0.1059 → 0.11 m) and its consequences on the cradle hands (≤ 7 mm; a few discrete elbow-sample flips in distribution fixtures).
- Contact calibration from Courtois's actual glove / boot surfaces: palm-on-ball 0.000 m with the palm normal exactly through the ball on every one-hand tick; planted soles flat on the pitch (0.000 m) in every standing phase; laces-on-ball 0.000 m at the authoritative KICK tick; ball radius 0.11 m for every character (old `ballVisR·H/1.90` bug removed).
- Approved Mixed / "C Native-output Refined" composition reproduced on the live scene (environment density 2, character density 4 in its ROI, 2000×1800 output for the clip [600,150,500,450], same camera / world scale / pitch coverage, no fit-to-box, no generic PBR).

## 1. Audit before integration

- Astra's action snapshot (commit 2c80700) is OLDER than the branch for `match.js`, `gk_graph.js`, `gk_motion_library.js`, `gk3d_backend.js`, `ik.js` (v13 / v13.1 distribution, BALL_AT_FEET) and identical for `gk_backend.js`, `gk_far_dive_clip.js`, `gl_renderer.js`, `m4.js`, `skeleton.js`, `skin_mesh.js`. The branch was kept authoritative; nothing from the snapshot was copied over newer work.
- Package: `verify_package.py` ok; GLB sha256 verified after the copy; 23 skin joints in exactly the runtime `SKEL_DEF` order; the GLB's default node pose is a construction pose (arms rotated) and is never used — the pose always comes from the actions.
- Baseline before integration: the v13.1 gate / manifest / free-play records (`gate_v131_*`, `manifest_v131_reg/dist`, `fp131_*`) were kept and are the comparison baseline of section 5.
- Old `H/1.90` ball-radius bug confirmed (`gk_graph.js`: `ballR = ballVisR * H / 1.90` → 0.1059 m for the test keeper, 0.1166 m for the tall variant) and removed.

## 2. Files changed / added

| file | status | what |
|---|---|---|
| `assets/characters/courtois/Touchline_Player_courtois.glb` | new (copied unchanged) | the approved character |
| `assets/characters/courtois/courtois_rig.json` | new | the tall rig verbatim from the manifest + the measured contact calibration (`contact.hand.R/L`, `contact.foot`) |
| `sandbox/visual/anim3d/gk_character_glb.js` | new | registry, loader / parser, `gkCharSkeleton` (runtime skeleton from the rig; `invBind` = the GLB's inverse binds; bind check 1.19e-7 m), the character WebGL2 program (approved C shader, 4-sample resolve), ROI + `gkCharRender` |
| `sandbox/visual/anim3d/gk3d_backend.js` | modified | character selection, layer composite, `gk3dRenderLayer(density)`, `hideCharacter` |
| `sandbox/visual/anim3d/gk_graph.js` | modified | ball radius fix (all characters); finished-surface contact rules gated by `skel.contact` (details in §4) |
| `sandbox/visual/anim3d/gk_backend.js`, `sandbox/visual/match.html` | modified | `?gkChar=` param, select entry, script tag |
| `sandbox/visual/tools/anim3d/capture.js` | modified | waits for the asset; exits 2 if the character is not loaded |
| `sandbox/visual/tools/anim3d/gk3d_gate.js` | modified | `--character`, `--backend off`, `--precision full` (exact doubles + facing / ctrl / distribution events / camera) |
| `sandbox/visual/tools/anim3d/gk3d_capture_mixed.js` | new | Mixed / C native-output composition tooling |
| `review_artifacts/gk_character_courtois/` | new | this findings file, the review page, media, verification records, the handoff copies |

Untouched: `match.js` (simulation), the motion library and action descriptions, the V6 clip, the camera, the sprite backend, the test-skeleton renderer. No presentation RNG anywhere.

## 3. Architecture — the proportion-aware path

Per tick: **existing authored action rotations** (motion-library eulers, unchanged) → **Courtois tall FK** (`skelFK` on the skeleton built from Courtois's exact bind offsets / directions / lengths in Courtois's joint order; root applied once via `g.rootM`) → **the existing procedural IK / contact solve** (foot plants, ground clamp + leg floor, torso / clavicle assist, glove IK, two-hand cradle, distribution grips, kick foot — each contact rule reading the measured Courtois surfaces from `skel.contact`) → head look-at → **skin matrices = world × the GLB's actual inverse binds** → skinning in the character program.

Not done, by design: no replay of shared-rig solved matrices, no shared bind translations, no uniform scale, no rig from the database height, no double root, no GLB construction-pose arm rotations, no re-run of the tall transfer. The shared-rig path (test skeleton + capsule renderer) is untouched and is the frozen regression baseline: every new rule is behind `skel.contact` (`HC` for hands, `FCf` / `FC` for feet); the test path is byte-for-byte the previous behaviour except the ball radius.

## 4. Contact calibration (presentation only) and residuals

| contact | measured (bone-local bind) | rule | result |
|---|---|---|---|
| palm | R [-0.0308, -0.0775, 0.029] n̂ −X; L [0.0287, -0.0773, 0.030] n̂ +X | one hand: wrist at exactly √((r+0.0308)²+0.0775²+0.029²) = 0.163 m from the centre; then hand direction + palm normal are solved from the actual wrist and the ball (least wrist flexion); rigid palm twist | palm-to-surface 0.000 m, normal dot 1.00 whenever one hand alone holds the ball (64–79); within ±0.031 m through the 120 ms hand-over blend |
| two-hand sides / hand-over | same | wrist = centre ± right·(r+0.0308) − dSide·0.0775, palm to the centre; hand-over blends on the sphere; knuckles swung clear of the ball | knuckle penetration ≤ 4 cm on ≤ 5 hand-over ticks in 65, 66, 74, 75, 76, 78 — exposed |
| sole / plant | sole 0.0944 m below the ankle; rectangle x ±0.078, z −0.081…0.128, toe corners z 0.2 | planted ankle height 0.0944 (was 0.06·H); planted boot pitched to bind slope and rolled level; six-corner floor test; leg floor up to six lifts, re-applied after torso-assist re-FK | planted sole clearance 0.000 m in every standing phase (min −0.003 m, fixture 52); any-foot min −0.016 m (fixture 11) |
| laces / ball | laces point [0, 0.0087, 0.11], normal (0, 0.84, 0.292), 0.102 along / 0.041 off the axis | ankle target = ball − n̂·(r+0.041) − axis·0.102, four passes; boot rolled so the laces normal is in the vertical plane | laces-to-ball 0.000 m at the KICK tick (70, 71, 75, 76) |
| ball radius | — | 0.11 m for every character | fixed |
| torso / forearm exclusion | Courtois radii | unchanged rules | 0 violations |

Residuals reported, not cheated:
1. Two-hand cradle flags on the low-dive catches 43 / 44 / 49 (34 / 34 / 1 ticks) — the same with the test keeper (35 / 35 / 2): a pre-existing catch-library residual.
2. Hand-over knuckle transients (above).
3. The frozen V6 landing plan plants the bottom foot at its authored tuck height at IMPACT (fixture 42: ankle 0.188 m → sole 0.093 m above the pitch for one tick). V6 is frozen; not modified.
4. The taller rig shifts a few presentation phase boundaries by a few ticks (H-scaled plan distances): fixtures 8, 13, 14, 15, 25, 40, 42 list one extra sub-phase entry within 300 ticks. Presentation only; the simulation trace is identical.
5. Test keeper: the ball-radius fix moves its drawn ball 4 mm and its cradle hands ≤ 7 mm; in distribution fixtures the sampled elbow solver can pick a neighbouring sample (up to 9.5 cm at a hand tip in 70 / 71 / 75). Its V6 manifest (42) is identical.

Bugs found and fixed on the way (all presentation): the first sole-levelling rolled the boot 180° (lateral axis aligned to `ax × up` instead of `up × ax`); the leg-floor lift was lost whenever a later torso assist re-ran FK (now re-applied); the one-hand wrist target assumed a forearm direction the elbow solver then changed (replaced by the exact hand solve); the kick metric measured the test-mesh proxy instead of the laces point.

## 5. Regression (see the review page, section 12, for the per-fixture tables)

- `gk3d_gate.js --precision full`, 80 fixtures × 260 ticks: sprite / OFF / 3D test / 3D Courtois — ALL IDENTICAL (per-fixture sha256 of the full-precision trace).
- Distribution fixtures 64–75 × 300 ticks: ALL IDENTICAL, including every RELEASE / DROP / KICK event (tick, ball, velocity, root) and the camera rig per tick.
- Frozen TEST manifests vs v13.1: 42 identical; 55–60 identical joints (ball radius only); 45 + 64–75 ball radius + cradle hands ≤ 7 mm (+ elbow-sample flips in 64 / 67–71 / 72 / 75).
- Survey 80 fixtures × 300 ticks through the 3D backend: bad continuity asserts test 0 / Courtois 0; hand-ball flags test 0 / Courtois 16 (hand-over knuckle transients); cradle flags test 72 / Courtois 69 (43 / 44 / 49); final simulation states identical.

## 6. Performance / storage

- Repository: +22.1 MB GLB + 15 KB rig JSON (`assets/characters/courtois/`), + handoff copies and review media.
- Runtime: asset load once per page (async; the backend draws the test skeleton until ready; tools wait). Gate with every tick drawn (80 × 260): test 0.84 ms / 2 draws, Courtois 0.99 ms / 30 draws; survey steady state (fixtures 26–79, 300 ticks): test 0.77 ms, Courtois 2.02 ms per tick (29 primitives + ball) per tick; ROI layer e.g. 44×60 base px → 352×480 native px at density 4 × ssaa 2. GPU: ≈ 22 MB of vertex attributes, one 512² atlas, one FBO.

## 7. Does Courtois work through the complete library?

Yes. No action is incompatible with the true proportions; the remaining issues are the exposed presentation residuals of §4. Goalkeeper dribbling was not built (as instructed): the put-down ends in BALL_AT_FEET with the free ball in front and the keeper in neutral READY, no retreat.
