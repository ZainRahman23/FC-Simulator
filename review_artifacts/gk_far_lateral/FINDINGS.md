# Goalkeeper far-LATERAL dive — findings (2026-09-23; arm-transition pass appended in §7)

Review page: `GK_FAR_LATERAL_REVIEW.html` (media in `media/`, inputs / tools in `verification/`).
Scope: fixtures 13 and 15 (visually questionable / wrong after the far-dive safety fix), fixture 2 as the control. Nothing from the
safety fix is reverted. No push.

## 1. Why fixtures 13 / 15 looked like a rigid body transported sideways

Instrumented per tick with every resolver layer isolated (authored V6 keys + simulation root → + axis redirect → + launch / landing
plan → + torso assist → + glove IK), Courtois rig, capability band COURTOIS (the band the earlier review was captured at). All three
fixtures use the same motion (FAR_DIVE = the approved V6 clip). The V6 pre keys ARE a lateral dive: load → plant → push → toe-off →
flight → full extension, pelvis +0.48 m lateral / +0.30 m up, roll to −72°, bent trailing leg, then the side-landing keys. The
geometry existed; four procedural layers, each acceptable for the approved high-dive regime, combined badly once the committed body
axis passed ~60° from vertical (fixture 13 θ 69.7°, fixture 15 θ 77.6°; fixture 2 θ 50.4°, V6 fixture 42 θ 36°):

| layer | what it did for θ ≥ 60° | effect |
|---|---|---|
| axis redirect | `roll = lerp(authoredRoll, −θ, |authoredRoll|/72)` = −(72·f·(1−f) + θ·f): up to +18° of roll in the MIDDLE of the push for any θ | fixture 15 toe-off roll −67° (authored −49°), fixture 13 −63° (authored −51°): the trunk was near-horizontal while both feet were still planted; the launch then translated that flat body with the simulation root — the "plank" |
| torso assist | ±20° spine / chest bend toward the hand target scaled by the IK residual | fixture 15: −20° at full extension toward a target that is UNREACHABLE by the simulation's own verdict — it cancelled the authored trunk inclination exactly at the reach (the residual-minimising behaviour the brief warned about) |
| landing plan tempo | authored impact 0.14 s + absorb 0.30 s applied to a hip arriving at 3–4.5 m/s from 0.66 m | pelvis floated down over 0.44 s (IMPACT → SETTLE 27 ticks) instead of a braced ~0.25 s stop |
| glove IK fade | reach IK faded over 0.35 s after the execution end, still toward a target 1–2 m away while the body was on its side | with the trunk no longer bent toward the target the elbow folded to its 30° limit during ABSORB and its bend plane flipped (found by the survey after the first three corrections: fixtures 13 / 14 / 15 / 39 / 40, both rigs) |

Not the cause: the launch magnitude (fixture 15 vUp 1.98 m/s, pelvis peak 1.00 m, is what the simulation's target dictates — hip =
target − 0.64·H along a 70–78° axis ≈ 1.0 m), IK solving as such, retargeting (the shared test rig shows the same numbers scaled by H),
the authored motion, the simulation root (0.86 m of authoritative travel, presented faithfully).

Fixture 2 (control): θ 50.4°, wSide 0.62 — the same lerp REDUCES the roll (θ < 72°), assist 7°, launch 3.6 m/s → coherent leap. It is
below the new regime and is byte-identical before / after.

## 2. Decision

The authored motion has enough geometry → the resolver was corrected conservatively, in an explicitly gated **far-lateral regime**
(FAR_DIVE, committed body axis ≥ sideLandHi = 60° i.e. wSide = 1, decided ONCE at the commit, never switching mid-action; master switch
`GK_GRAPH.lateralRule`, review preset `before` = off). No new authored clip, no root / torso / IK / stretch escalation. `gk_graph.js`:

1. **Proportional redirect roll**: `roll = −sign · min(θ, rollMax) · (|authoredRoll| / 72)` — the authored roll CURVE scaled to the
   target axis; the trunk inclines in the authored proportion (most of it in flight). Toe-off roll now −52° (15) / −48° (13) vs
   authored −49° / −51°.
2. **Torso assist 0** in the regime (spine / chest bend and clavicle assist toward the target). The reach is the arm's; a miss keeps its
   residual (fixture 15 miss residual max 1.79 m, unchanged in kind).
3. **Landing tempo**: the hip is stopped by ONE uniform deceleration from the arrival vertical speed to rest at the ground height
   (a = v²/2Δh, T = 2Δh/v); the impact / absorb split is where that profile crosses the impact height and the stage-boundary velocity is
   the profile's own, so the two hermite stages reproduce the quadratic exactly (no velocity kink; the continuity assertion stays silent
   at a 4.5 m/s arrival — band K1 fixture 15). Only ever faster than the authored tempo. IMPACT → SETTLE: 27 → 17 ticks (15), 26 → 19 (13).
4. **Glove IK released by the impact**: in the regime the reach IK fades between the execution end and the IMPACT stage (≥ 0.12 s)
   instead of the flat 0.35 s; the authored landing keys place the arm (bridge / brace). Held-ball catches keep IK weight 1.

Everything from the safety fix stays: bounded post-exec flight, 30° elbow fold limit, FK elbow limit, contact rules, no RNG, no ball
parenting, no presentation-root launch beyond the planned arc.

## 3. Authored vs procedural, safe envelope (see §6 of the page)

- Direction: authored right, mirrored left; facing / side from the simulation. Mirror pairs in the matrix are exact.
- Body-axis angle: ≤ 35° feet landing, 35–60° blend (approved high-dive rule, unchanged), 60–90° lateral regime; θ > 90° (ball below the
  hip) is classified LOW by the motion selector → LOW_DIVE / LOW_COLLAPSE.
- Height: pelvis = target − 0.64·H·d clamped to [0.30 m, hip + 0.55·launch]; target heights 0.9–2.6 m give pelvis 0.9–1.56 m; above the
  jump cap the reach is the arm's only.
- Reach / hand: glove IK to the SIMULATION hand target, elbow ≥ 30°; unreachable → the hand stops short by the simulation's miss.
- Torso: spine / chest roll scaled by min(1.4, θ/72) in flight; assist ±20° high-dive only.
- Take-off: authored key timing over the execution window (0.15–0.75 s on the matrix; late commits compress it — simulation-authoritative).
- Landing: side plan (touch / impact / ground heights, slide deceleration, fall-timed stop in the regime), get-up chain, reposition steps.

## 4. Test matrix (all at band COURTOIS unless noted; Courtois + shared test rig)

15, 13 (BEFORE / AFTER), 2 (control, unchanged), 42 (V6, frozen), 14 (lateral, unreachable), 39 (reachable far corner, contact),
ad-hoc: reachable far corner R/L (lat ±1.8, z 1.2, 19 m/s — contact), near-max reach R/L (lat ±2.1, z 1.4, 19 m/s — contact), beyond
reach fast R/L (lat ±2.2, z 1.2, 21 m/s), fixture-15 mirror L (lat −1.9, z 1.45, 22 m/s). Slower balls (14–16 m/s) at these widths are
reached on the feet by the simulation (LEAN / NEAR_BODY) — no dive — so they are not lateral-dive cases.

## 5. Regression (verification/)

- `gk3d_gate.js` all 80 fixtures × 260 ticks + distribution 300 ticks, full precision, SPRITE vs OFF vs SKELETAL_3D test rig vs
  Courtois: **ALL IDENTICAL** (hashes, commit / contact ticks, ball, events) → ON / OFF neutral, outcomes unchanged, no RNG.
- Frozen TEST manifests (42, 45, 55–60 × 320 ticks; distribution 64–75 × 300): **byte-identical** to the committed HEAD manifests.
- Surveys (80 fixtures × 300 ticks, both rigs): NaN 0; bend-plane flip totals HEAD → now 26 → 26 (test) / 24 → 24 (Courtois);
  continuity assertions 1 → 1 / 12 → 12 (all pre-existing, none on dive fixtures); torso assist max 20° (high-dive fixtures) / 0 on the
  lateral ones; presentation-root deviation reduced on every lateral fixture (e.g. 15 Courtois 0.47 → 0.45 m, 13 test 1.34 → 1.23 m);
  elbow min ≥ 30° everywhere on the dive fixtures (the fold limit).
- Dive probes (13 fixtures + 14 adversarial, both rigs): every simulation outcome and contact tick unchanged; only the lateral-regime
  fixtures change presentation (assist → 0, pres deviation down).

## 6. Answers

1. Transported look = redirect over-roll during the push (flat body before take-off) + faithful root translation + assist folding the
   trunk at the reach + a floated landing.
2. Resolver + assist + landing tempo + post-exec IK fade; not the authored motion, launch magnitude, IK solving, or retargeting.
3. An appropriate far-lateral lifecycle existed (V6 pre / post keys).
4. Added: the gated regime (4 rules, ~30 lines) + instrumentation (`probe_layers.js`, layer presets, `before` preset, `--band`).
5. Authored vs procedural: §3 / page §6.
6. Limits: θ 35–60 blend, 60–90 lateral; pelvis ceiling hip + 0.55 m; reach 0.64·H; elbow ≥ 30°; assist 0 / ±20°.
7. Beyond: θ > 90 → LOW motions; beyond reach → the hand stops short by the miss, the lateral lifecycle completes; above the jump cap →
   arm-only reach.
8. Courtois performs the same lifecycle at H 2.014 (matrix rows), contact ticks unchanged.
9. All neutrality gates preserved.

Tools: `sandbox/visual/tools/anim3d/capture.js --preset before|auth|redir|launch|noik --band COURTOIS`, `verification/probe_layers.js`,
`verification/lat_plots.py` (per-tick layer plots), `verification/build_lat_review.py` + `build_lat_html.py`.

## 7. Second pass — arm-through-abdomen collapse at load / take-off (fixtures 13, 15)

Scope: arm / upper-body transition only. The far-lateral body / root / flight / landing correction of §2 is unchanged (fixture 2 and
V6 42 byte-identical; the close-rig frames of fixture 2 are pixel-identical to the previous pass).

**Where it begins and which layer.** Measured per resolver layer with approximate self-collision volumes (torso: abdomen / chest
capsules whose axis ends 9 cm below the shoulder line, a neck capsule, a head sphere; upper arms from 35 % down the bone, forearms,
hands; radii at H 2.0: abdomen 0.125, chest 0.145, neck 0.06, head 0.10, upper arm 0.045, forearm 0.040, hand 0.035 m, scaled by
H/2). `gkSelfCollision` in gk_graph.js (per tick, `diag.selfCol`, drawn by `--dbg arms`), mirrored offline by
`verification/arm_gate.py`; the two agree to the millimetre. The trailing (top) arm's clearance goes negative at PUSH_MID (tick 41,
−2.6 cm), reaches −11 cm at TOE_OFF (−19 cm against a plain chest capsule) and stays negative through EARLY_FLIGHT; it is IDENTICAL in
the authored, redirected, planned and final layers, on both rigs (Courtois H 2.014 / test H 1.83) and for both dive sides. So: the
**authored V6 arm path**, not retargeting, not the clavicle / shoulder keys (0), not the bend plane, not the reach IK, not the
SET → LOAD interpolation (LOAD / PLANT are +6 to +10 cm clear). Mechanism: the trailing upperArm key goes from z −30° (abducted) to
z +14 / +44 / +76 (PUSH_END / TOE_OFF / EARLY_FLIGHT) and +140 at the reach with an x flexion of −60°; the rig's euler order is
Ry·Rx·Rz, and a vector already lateral after Rz is invariant under Rx — the flexion cannot lift a crossing arm in front of the chest,
so the upper arm sweeps through the chest and the elbow then passes over the neck / behind the head into the authored reach pose.
The same path exists in the approved fixture 2 / V6 42 (−11 cm at their toe-off); those are below the regime and were not touched.

**Correction** (far-lateral regime only, trailing arm only): `gkLateralArmClear` sets the trailing upper arm's bone yaw (Ry — the
horizontal adduction the rig applies last) from the authored frontal-plane adduction z alone: smooth rise over z 25 → 85° to 55°,
easing to 50° above z 100°; the authored adduction is soft-capped at z 85° (slope 0.2) so the trailing hand stays on ITS side of
the reach hand (side-by-side two-hand reach, never crossed over the reach arm). Elevation / elbow / hand keys untouched (authored
shoulder–elbow character kept); phase-aware (a pure function of the key value — zero at READY / LOAD, zero again as the keys close),
bounded (≤ 55°), deterministic, mirrored by the pose mirror for left dives, applied in the pre and landing branches. One pole hint
for the REACH arm's glove IK in the regime (elbow forward and toward the pitch while the simulation hand target is still inside
the reach) stops the reach forearm sweeping through the trailing forearm as the hands converge. Nothing else.

**Result** (min clearance by phase, cm; CURRENT → AFTER, Courtois): PUSH_MID −2.6 → +3.9, PUSH_END −9.5 → +6.6, TOE_OFF −11.4 → +6.8,
EARLY_FLIGHT −8.2 → +5.9, MID_FLIGHT +0.4 → +5.8, FULL_EXTENSION +0.3 → +5.8, FOLLOW −1.8 → +6.0, DESCENT −8.5 → +5.9, IMPACT −11.7 →
+5.8, ABSORB −11.6 → +6.4 (fixture 15; fixture 13, the test rig and the left mirror within ±1 cm of these). Residual flags reported,
not hidden: (a) the REACH arm's upper arm brushes the head sphere at the reach on fixture 13 (−1.2 … −4.1 cm, FULL_EXTENSION →
DESCENT) and on the left mirror (−1.5 … −6 cm through the landing) — the straight reach arm alongside the head, an IK / authored
reach-arm placement outside the trailing-arm scope; (b) the two forearms overlap by up to 4 cm for ~3 ticks at the two-hand
convergence on fixture 15 (wrists 17–21 cm apart); (c) the recovery stages SETTLE → PUSH_UP carry the pre-existing brace-arm
placement of the authored landing keys + brace IK bend plane (−10 … −19 cm on every dive incl. fixtures 2 / 42; a brace pole hint
made the bottom arm worse and was not kept) — outside this pass.

**Preserved / regression**: gates all identical (sprite / off / test / Courtois), manifests byte-identical, outcomes and contact
ticks unchanged, torso assist 0 in the regime, landing tempo and IK release by IMPACT unchanged (the same landing stage ticks), no
NaN, survey flip / assertion totals unchanged, feet / sole metrics unchanged; the survey now also records `selfColMin` /
`selfColMinPre` per fixture as the standing self-collision gate.
