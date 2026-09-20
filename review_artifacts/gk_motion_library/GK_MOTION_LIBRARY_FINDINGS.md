# Goalkeeper skeletal MOTION LIBRARY — findings (v8, 2026-09-20)

Branch `prototype/3d-animation-pipeline` (not pushed). Review page: `review_artifacts/gk_motion_library/GK_MOTION_LIBRARY_REVIEW.html`.
Astra reference package: `review_artifacts/astra_gk_motion_reference/` (`INDEX.json`, `README.md`, one folder per canonical motion / facing).
Verification records: `review_artifacts/gk_motion_library/verification/`.

Rule of the whole system, unchanged: **the simulation decides what happens; the animation visually explains what happened.**
Nothing in this work writes to the simulation. The keeper's commit record, contact record (tick, point, volume, outcome, held),
hand target, leg tip and root are read; the presentation root is a derived, capped offset of the simulation root; the ball is never
moved, snapped, parented or attached. Animation ON and OFF, and sprite vs 3D, produce identical simulation traces (section 7).

## 1. State found (audit before this task)

Resolver (`gkAnimClassify`) families over the 43 pre-existing fixtures: AIRBORNE_DIVE 22 (of which LOW-MID 11), LOW_GATHER 5,
FOOT_SAVE 5, LOW_COLLAPSE 4, HIGH_CATCH 4, NEAR_BODY_SAVE 2, SUPPORTED_CATCH 1 (CHEST_CATCH appears in free play). The 3D graph
(`gk_graph.js`) had ONE authored motion: the v6 far dive, applied to every AIRBORNE_DIVE. Everything else ran as a procedural pose
(`authored: false`), foot saves ran as inverted dives, a caught ball dropped the body out of the dive lifecycle mid-flight, standing
saves rose before the ball arrived, and the recovery could re-derive facing / side from the live ball (the recurring sprite-resolver
bug class). No footwork existed on the 3D path.

## 2. Motion taxonomy (minimum biomechanically distinct set)

`sandbox/visual/anim3d/gk_motion_library.js`, selection `gkSelectMotion(desc)` — deterministic, from the frozen per-commit
classification only (family, height class, feet-planted, lateral offset), never from the outcome or the live ball:

| motion | family (resolver) | what is biomechanically different | fixtures |
|---|---|---|---|
| FAR_DIVE | AIRBORNE_DIVE MID / HIGH / TOP | v6, frozen: plant, push, ballistic arc, side or feet landing, get-up chain, reposition steps | 42, 49 (mirror) |
| LOW_DIVE | AIRBORNE_DIVE LOW-MID | low sideways launch, body horizontal at ≤ 82° roll (never inverted), pelvis solved to the lying height, hard stop on the pitch, same get-up chain | 43, 44, 10, 1, 50, 51 |
| LOW_COLLAPSE | LOW_COLLAPSE | no flight: near leg folds, drop onto the hip, hands down together, leg to the simulation's leg tip | 32, 52, 53, 11 |
| FOOT_SAVE | FOOT_SAVE | planted support leg, lead leg sweeps to the simulation's leg tip, retract | 19, 16, 48 |
| NEAR_BODY | NEAR_BODY_SAVE | feet planted, one step out, torso lean, near-hand reach (two hands when central) | 41, 47 |
| CHEST_CATCH | CHEST_CATCH / SUPPORTED_CATCH | hands out in front, ball into the chest, hug | 33, 45, 54 |
| HIGH_CATCH | HIGH_CATCH | both hands over the head, toe rise / jump by the launch demand, bring down | 31, 46 |
| GATHER | LOW_GATHER | long-barrier kneel, scoop, hug | 26 |
| READY / FOOTWORK | (anticipation, positioning) | symmetric ready crouch; odometer stepping driven by the simulation root velocity | 54, 11 |

Why these and not more: the resolver already separates airborne from grounded and hand from leg contact; within the airborne dives
only the LOW-MID class lands differently (the body arrives at the lying height, there is no descent stage). Every other visible
variation (side, height, facing, held ball, two hands, reach distance) is a parameter of one of these motions, not a new motion.

## 3. Implementation

- Motion frozen per commit (`state.motionSel`), like facing and side; a leg contact never re-selects mid-action.
- Dives: launch plan (plant → toe-off → ballistic arc through the solved full-extension pelvis at execEnd), landing plan with
  progressive ground deceleration; LOW_DIVE adds the low-mode pelvis solve, the roll clamp, and the arrived-low landing (impact / absorb
  continue from the arrival pose; `lowStop`: the hip stops over the height that is left, uniform deceleration, no dip / bounce).
- Ground motions (collapse, gather) reuse the SETTLE → BRACE → PUSH_UP → HALF_KNEEL → CROUCH → RISE → REPOSITION → SET chain.
- Standing motions WAIT at u = 1 until the ball arrives (contact or held), then RISE or HOLD.
- Held ball: both hands stay on the authoritative ball (hold IK, faded in 0.12 s / out 0.15 s), no hand brace, stronger ground
  deceleration; the two-hand reach hands over to the hold.
- Leg-tip IK (FOOT_SAVE, LOW_COLLAPSE): the lead leg meets the simulation's leg tip when it is reachable (same reach cap as a planted
  foot); the last tip is cached through the landing. LOW_DIVE does NOT chase the leg tip (section 10).
- Footwork: proportional plant points, re-plant when a step target moves, knee bend plane blended in for new locks / steps; tucked
  feet follow a body that is still sliding at the settle (re-plant once the hips have slid > 15 cm past the planted feet; drag, no lift).
- Solver (`ik.js`, `skelIK2`): per-chain bend-plane memory (degenerate plane → last frame's; the plane rotates ≤ 60° per solve),
  fold-radius handling (a target closer to the root than the folded chain's own minimum releases toward the authored limb and reports
  the residual; near that radius the root→target direction is blended with last frame's), deterministic, no RNG.
- Continuity assertions in `gk3d_backend.js` (position excess > 3 cm, Δv > 1.5 m/s, root > 5°, pelvis / chest > 15°, side / roll flip)
  at every stage boundary; recorded per fixture (manifest `asserts`) and per free-play shot.

## 4. What is unchanged

The v6 far dive. Fixture 42's skeleton — 28 joints × 320 ticks — is bit-identical to the pre-task manifest after every change
(re-verified after each solver edit). The far dive's own solve paths (glove IK, brace, plants, floor clamp) run without the
bend-plane memory (`PMv`) so that the frozen output stays exact; every other motion gets it. This exemption is a documented
discrepancy: the memory is a general stability rule and should apply to the far dive too once v6 is un-frozen (expected effect:
one 3 mm elbow difference at tick 188 of fixture 42 and a 60°-capped knee plane in the reposition step at tick 282).

## 5. Transitions

Entry from READY / footwork through anticipation into every motion; exit through the shared get-up (dives, collapse), RETRACT
(foot save), RISE / HOLD (standing) back to SET; the recovery keeps the landed side measured from the skeleton at the settle.
Stage-boundary assertions: 0 flagged ticks in all 17 packaged fixtures; free play below.

## 6. Contact validation (authoritative)

Contact tick, point, volume and outcome come from `gk.contact`; the manifest records, per key frame, the simulation hand, leg tip,
ball, glove residual (drawn glove centre → simulation hand) and leg residual. Free play (120 shots): HAND-volume contacts n = 23,
glove residual median 5.6 cm, p90 15.5 cm, max 20 cm. Residuals are exposed, never hidden: a target the modeled arm cannot reach
(short body, ball at the shoulder, ball inside the fold radius) shows as a residual in the manifest and the overlay frames.

## 7. Simulation neutrality

55 deterministic fixtures × 260 ticks, per-tick simulation trace hashed (keeper root, velocity, hand, leg tip, ball position and
velocity, held flag, phase / state, commit, contact): sprite backend vs SKELETAL_3D drawn every tick — 55 / 55 identical
(`verification/GATE_sprite_vs_3d_55_fixtures.md`); animation OFF (nothing drawn) vs 3D ON — 55 / 55 identical final-tick root,
hand, ball, held flag, contact volume / outcome (`verification/GATE_animation_off_vs_on_55_fixtures.md`).

## 8. Free play (production path)

`gk3d_freeplay.js --shots 120 --seed 7`: seeded shots through the real kick pipeline, one continuous keeper, 3D drawn every tick.
114 committed, 67 contacts; families → motions: FAR_DIVE 71, LOW_DIVE 13, HIGH_CATCH 17, NEAR_BODY 6, GATHER 5, LOW_COLLAPSE 2;
all 8 facing octants; 0 fallback selections, 0 unauthored ticks, 0 dive side ≠ landed side. Continuity flags: 1 marginal
(shot 74, LOW_DIVE that missed the ball, IMPACT → ABSORB Δv 1.52 m/s at the 1.5 threshold, excess 2.5 cm: the hip stopping on the
pitch with almost no height left — a hard ground stop, not a relocation). The flags that the earlier runs raised (shots 5, 76, 93,
116) were traced to their causes and resolved at the transition / solver level (review page, section "Landing and IK continuity").
Record: `verification/FREEPLAY_3d_120_shots_seed7.json` (per shot: family, motion, side, landed side, facing, contact, residuals,
phases, assertions).

## 9. Body proportions / reach

`verification/PROPORTIONS_default_tall_short.json` (H 1.90 / 2.01 / 1.79 m, same motion assets, same simulation):

| fixture | motion | glove residual default / tall / short |
|---|---|---|
| 42 far dive (weak parry through) | FAR_DIVE | 6.4 / 1.5 / 14.7 cm |
| 44 low ball right | GATHER | 2.2 / 2.3 / 2.4 cm |
| 24 just beyond the foot | LOW_COLLAPSE | 8.7 / 10.0 / 7.9 cm |
| 26 easy central catch | GATHER | 2.8 / 2.7 / 3.2 cm |
| 31 high central | HIGH_CATCH | 4.0 / 7.3 / 4.1 cm |
| 33 lateral supported catch | CHEST_CATCH | 9.4 / 10.8 / 8.7 cm |
| 41 near-body catch | NEAR_BODY | 6.5 / 9.1 / 4.1 cm |

Reading: ground and standing saves are height-independent. The far dive's reach is the simulation's reach envelope (one keeper
model); the drawn glove of a shorter body falls short of the authoritative hand by up to 15 cm at full extension, a taller body
overshoots by 1–2 cm. This is exposed, not solved by stretching: the correct fix is per-body reach envelopes in the simulation (or
authored per-proportion clip constants), which is a simulation decision, not an animation one.

## 10. Remaining problems (honest list)

1. LOW_DIVE with a leg-volume contact (2 of 13 low dives in free play): the simulation's leg-tip model lies on the opposite side of
   the hip from the authored trailing leg; chasing it swept the leg through the hip. The low dive now shows the authored leg and the
   ball meets it approximately (the mismatch is exposed). Either the simulation's low-dive leg model or the authored trailing leg has
   to move; that is an authoring decision for Astra / the simulation, not a solver fix.
2. Ball inside the arm's fold radius (shot 116: the parry point 9–13 cm from the shoulder): the reach releases toward the authored arm
   with a 40–50 cm residual; the elbow still moves up to 31 cm in one frame at the absorb start. Bounded, no flip, but visible.
3. LOW_DIVE hard ground stop (shot 74 above): a Δv of ~1.5 m/s in one frame when the arc arrives at the lying height.
4. GATHER hold stays kneeling while the ball is held (the simulation keeps the ball at the catch point); the hug-and-rise needs a
   simulation "ball carried" state.
5. Shuffle steps are brisk (0.30 s per step, 0.50 m); tune with Astra's timing.
6. Fixture 54 (moving keeper, synthetic shot) registers no shot on a fresh page (harness order dependence: the capability band pinned
   by fixture 42 persists on a page); it commits to a CHEST_CATCH in the ordered gates. Its package folder shows footwork only.
7. Skinned rig shoulder deformation (v7 finding) — irrelevant to the motion reference, listed for completeness.

## 11. Deferred to Astra (visual, not motion)

Silhouette timing of the fold at the low-dive impact; hand shapes on the hold; hair / kit secondary motion; the 2.5D outline and
band count; kneel foot contact shading. None of these change a joint position.

## 12. Files

- `sandbox/visual/anim3d/gk_motion_library.js` (new), `gk_graph.js`, `gk_backend.js`, `gk3d_backend.js`, `ik.js`
- `sandbox/visual/match.js` (12 M3 fixtures 43–54), `match.html`
- tools: `sandbox/visual/tools/anim3d/gk3d_freeplay.js` (new; `--dump <shot>` per-tick trace), `gk_motion_manifest.js` (new),
  `gk3d_gate.js`, `gk3d_gate_compare.py`, `capture.js`, `sandbox/visual/tools/gk_anim/gk_anim_gate.js --anim off`

## 13. Reproduction

```
.venv/bin/python server.py                       # :8000
python3 sandbox/visual/serve_match.py            # :8124
export PUPPETEER_NODE_MODULES=<dir with puppeteer-core>
node sandbox/visual/tools/anim3d/gk3d_gate.js --backend sprite --scenarios all --ticks 260 --out gate_sprite.json
node sandbox/visual/tools/anim3d/gk3d_gate.js --backend 3d --scenarios all --ticks 260 --out gate_3d.json
python3 sandbox/visual/tools/anim3d/gk3d_gate_compare.py gate_sprite.json gate_3d.json
node sandbox/visual/tools/gk_anim/gk_anim_gate.js --url http://127.0.0.1:8124/sandbox/visual/match.html --anim off --ticks 260 --out animoff.json
node sandbox/visual/tools/anim3d/gk3d_freeplay.js --out fp3d --shots 120 --seed 7 [--dump 116]
node sandbox/visual/tools/anim3d/gk_motion_manifest.js --out manifest.json --scenarios 42,10,32,19,41,33,31,46,26,49,50,51,52,53,54,1,11
node sandbox/visual/tools/anim3d/capture.js --backend 3d --scenario 42 --ticks 0-319 --out DIR --crop 0 --clip 600,150,500,450
   (+ --dbg bones,ik,roots,feet for the overlay view; --crop 2 --zoom 3.5 --camx 98 --pixel 1 --outline 0 --bands 6 for the close 3D view)
```
v6 regression: run the manifest for scenario 42 before and after a change and compare every joint of every tick (must be 0.000 m).

## 14. Commits

- `bdfb222` prototype: goalkeeper skeletal MOTION LIBRARY — 8 canonical motions, deterministic selection, held ball, footwork
- `fe08d2e` landing / IK continuity: one-way post phase, arrived-low hard stop, bend-plane memory + fold radius in the solver,
  hold hand-over, tuck plants follow a sliding body, rise-recovered drift, floored legs kept through a pelvis lift; free-play dump tool
- (docs commit) review page, findings, Astra reference package, verification records
