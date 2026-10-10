# RUN-1.1 — the effort pass ("effort without fatigue")

**The decision (user, 10 Oct, after watching RUN-1 in motion):** RUN-1 is a major improvement over Locomotion V1. Keep the architecture and continue developing it. Its smoothness is the main gain and must not be lost.

**The weakness:** running looks too effortless. At 5–6 m/s the player moves smoothly, but the physical work of repeatedly supporting, loading and propelling the body doesn't read. The aim is *effort without fatigue, force without stiffness, weight without sluggishness*. Each stride should read as:

touchdown → weight acceptance → compression → propulsion → toe-off → flight → recovery → preparation.

**Scope:** straight running only. No turning, curves, dribbling, stopping or match integration.

## Preserving the original

- **The frozen copy.** `sandbox/visual/run1/run1_gait_orig.js` holds the original RUN-1 (**RUN-1.0**, commit `3caa5d58`) byte for byte. It is wrapped in a function scope with the global API `RUN1_ORIG`.
- **The check.** `tools/run1_orig_check.cjs` confirms that the verbatim block is identical to `3caa5d58:run1_gait.js`. It also confirms that a stride evaluated beside the evolving file hashes identically to that commit's file on its own (`67bcd92173dd7cfd`).
- **The development file.** `run1_gait.js` continues as **RUN-1.1**. Every intermediate version is a commit, logged below.
- **The viewer.** `run1.html` shows **RUN-1.1 new**, **RUN-1.0 original** and **V1** on parallel lanes, 3.6 m apart, each toggled under *Show*. Close views can show any of them.

## Reference: real running, not angle tables

**Source.** CMU Graphics Lab Motion Capture Database (mocap.cs.cmu.edu; the database was created with funding from NSF EIA-0196217). It is free to use, including in commercial products, but may not be resold.
- **Data stays out of the repository.** The motion files were fetched into a scratch directory. The tools in `sandbox/visual/run1/tools/ref/` read them from `--cmu <dir>` or `$RUN1_CMU_DIR`.
- **What is committed:** derived stick-figure sheets, derived metrics and the tool code.
- **To refetch:** `http://mocap.cs.cmu.edu/subjects/<NN>/<NN>.asf` and `…/<NN>_<TT>.amc` for subjects 09, 16 and 35.

**Strides.** The search found every trial labelled "run" and measured each one's speed.
- The fastest steady overground runs in the open data are 3.4–4.1 m/s. The capture volume is 3 × 8 m.
- Nine clean strides from three subjects were used: 16_46 R/L, 09_01 R, 09_06 R, 09_11 R/L, 35_22 R, 35_23 L and 35_25 L.
- Subject 16's leg is 0.836 m, the same as Vinícius's 0.834 m.
- The faster-looking 141/143 trials have implausible step times at 120 Hz (5.5 steps/s at 1.07 m), so they were rejected.

**Limitations.**
- They are recreational subjects at 3.4–4.1 m/s, not footballers at 5.5. The comparison is therefore made with RUN-1 at a **matched 3.8 m/s**, and the coordination *patterns* are carried to 5.5 m/s with the literature in `RUN1_RESEARCH.md`.
- Skin markers overstate pelvic obliquity (MacWilliams 2014).
- The contact events are detected from foot height and foot speed (±1–2 frames).

**Not available without an account:** the Stanford running data (Hamner & Delp 2013, 2–5 m/s, full body) needs a SimTK login. It would be the best 5 m/s reference if the user wants to fetch it.

**Tools** (`sandbox/visual/run1/tools/ref/`):

| tool | purpose |
|---|---|
| `cmu_amc.cjs` | ASF / AMC parser and FK |
| `cmu_trial.cjs` | kinematics and contact events |
| `run1_refmetrics.cjs` | whole-body coordination metrics with identical definitions on the real strides, RUN-1.0 and RUN-1.1; angles are taken from joint positions, so they are robust to skeleton calibration |
| `run1_phases.cjs` | the phase sheet: stick figures at the 8 events (side or front view) |

## E0 — the largest visible differences, before any change

Evidence:
- `effort/E0_phases_side_real_vs_RUN1.0.png`;
- `effort/E0_phases_front_real_vs_RUN1.0.png`;
- `effort/E0_metrics_real_vs_RUN1.0.txt`, with the 9 strides and their mean.

The table uses the mean of the 9 real strides (3.6 m/s), with the per-stride range where it matters. RUN-1.0 is shown at the matched 3.8 m/s and at 5.5 m/s. They are ordered by how visible they are and how much they bear on "effort".

| # | what differs | real | RUN-1.0 @3.8 | RUN-1.0 @5.5 | how it reads |
|---|---|---|---|---|---|
| 1 | **Arm carriage.** The hand's furthest reach ahead of the hip centre | 20 cm | 47 cm | 50 cm | RUN-1's forward arm *reaches*: the upper arm swings 31–37° in front of the trunk (real ≈ 0°, range −10…+16), with the elbow fairly open (72–97°; real 94–124°). The real arm is compact and flexed; the work is the **elbow driving back** (42° behind the trunk), and the hand comes forward only to the front of the trunk. RUN-1's pendulum-like reach reads relaxed. In front view RUN-1's elbows are held out, while the real ones are tucked. |
| 2 | **Vertical motion and loading.** Hip range / drop after touchdown | 9.0 cm / 4.6 cm | 5.1 / 4.1 | 4.3 / 2.9 | The real body sinks into the stance leg, with the low point *before* mid-stance (43 % of stance; RUN-1 50 %), and **leaves the ground higher than it landed** (take-off +2.0 cm above touchdown; RUN-1 0). The push visibly lifts the body. RUN-1.0's pelvis is a spring-mass scaled × 0.6, so in flight it falls at **0.6 g**: a floating, weightless flight. The eye judges weight largely from fall acceleration. |
| 3 | **Foot and ankle.** Strike pitch / heel-rise onset | toes 4° *down* / heel up 4° by 9 % of stance | toes 11° up / 58 % | toes 8° up / 54 % | Real runners land mid- or fore-foot, and the heel **rises progressively from early stance** while the shank rolls over. RUN-1 heel-strikes, holds the foot flat until past mid-stance and then peels it up quickly, so the ankle collapses to 33–34° of dorsiflexion (real 22°). This is the previous "known deviation", a coordination problem rather than an ankle-angle problem. |
| 4 | **Knee extension.** When the knee stops extending | at toe-off (100–108 % of stance) | 90 % | **71 %** | Real propulsion is a *triple extension*: knee, ankle and hip extend together up to toe-off. RUN-1's knee finishes extending at 71 % of stance at 5.5 m/s and then holds while the foot pivots about the toes. The last third of stance reads as a **peel, not a push**. Real knee: touchdown 29°, peak 47°, toe-off 15°; RUN-1.0: 19 / 41 / 19. |
| 5 | **Trunk.** Lean / pitch range per step | 12.6° / 6.2° | 5.6 / 2.2 | 7.1 / 2.3 | The real trunk **dips forward into every stance** (peak around 60 % of stance) and rises in flight. RUN-1.0's trunk is nearly rigid and more upright. Iteration 3 noted that more knee flexion with an upright trunk read as "sitting"; the two belong together. |
| 6 | **Swing thigh.** Peak timing / retraction before touchdown | 77 % of stride / 15° | 85.5 % / 24° | 83 % / 29° | The real thigh is driven through early, peaks just before the other foot leaves the ground and **settles** into the contact. RUN-1's thigh arrives late and then whips back 24–29°: a loop rather than a drive. Swing-knee timing and peak already match (64–65 % of stride, 105–115°). |
| 7 | **Pelvis rotation and obliquity.** Phase of "right hip back"; obliquity peak | 4 % of stride (≈ at the right touchdown), **in phase with the shoulders** (98 %); obliquity peak 31 % (at toe-off) | 38.5 %, counter-phase to the shoulders (86 %); 9 % | same | In real running the pelvis turns *with* the thorax; the shoulders and arms counter the **legs**, not the pelvis. RUN-1.0 wrings the spine ±19° against itself. The phase was a design choice ("ambiguous in the sources", `RUN1_RESEARCH.md`); real data now settles it. The swing-side pelvic drop peaks at toe-off, not just after touchdown. |

Already close to the real runners: the swing-knee shape and timing, the touchdown thigh, the duty factor at 5.5 m/s, foot pitch at toe-off, shoulder-rotation amplitude, wrist lateral clearance and the cadence / stride.

## Plan

Each step is one principled change, then watched against the reference and RUN-1.0.
- **E1 loaded stance and propulsion (items 2–4).**
  - The flight falls at true gravity.
  - The stance vertical is asymmetric: an early low point, and take-off above landing.
  - A flatter strike, a progressive heel rise, and the knee extending through to toe-off.
- **E2 arm carriage (1).** Compact, with the elbow driving back.
- **E3 trunk (5).** Lean and pitch coupled to the stance.
- **E4 swing-thigh timing (6).**
- **E5 pelvis rotation and obliquity phases (7).**

## Iterations

| # | largest visible problem | change | result |
|---|---|---|---|
| E1 | **Weightless flight, unloaded stance, peeling push-off** (E0 items 2–4).<br>• RUN-1.0's pelvis was a symmetric spring-mass scaled × 0.6, so the flight fell at 0.6 g and the body took off and landed at the same height.<br>• The knee stopped extending at 71 % of stance, then the foot peeled up about the toes.<br>• The landing was a heel strike at 840 °/s of knee flexion; the real runners' peak is 445 °/s. | **(a) Vertical.** The body under its own stance force and true gravity: `r1Vertical`, a smooth force f(s) = s(1 − s)(1 + c(½ − s)), with the impulse equal to the body weight over the step and a ballistic flight at g.<br>• One parameter, c = 1.3, fitted to the real strides. At their timing the model gives take-off +2.0 cm above touchdown (real +2.0), the low point at 41 % of stance (real 43 %), the apex +1.6 cm above take-off (real +1.8) and a 9.2 cm range (real 9.0).<br>**(b) Propulsion.** Knee-driven from 24 % of stance (RUN-1.0: 46 %), with a loading peak just above and after the flat-foot knee's, so the heel lifts while the knee still loads. The knee keeps extending to 96 % of stance and leaves the ground just turning into flexion (90 °/s; RUN-1.0 320 °/s after a locked knee).<br>**(c) Landing.** Mid-foot, heel 4° up, then lowering (real 3.7° up); touchdown knee 26° (real 28.7°). A mid-foot jog (−2°) avoids a heel/MTP pivot switch inside the speed grid.<br>**(d) Pelvis tilt.** 8.5° ± 2.2°, peaking at toe-off (RUN-1.0 6°), so the push-off thigh sweeps back without over-extending the hip.<br>**(e) Jog swing.** Toes 12° up and the knee folded a little longer, so the swing boot clears the deeper stance. | **At 5.5 m/s:**<br>• **Vertical:** 7.2 cm range (RUN-1.0 4.3); low point at 41 % of stance; take-off +1.5 cm; flight at g.<br>• **Knee:** 26° → 51° → 19°, minimum at 96 % of stance. The touchdown rate is about 910 °/s (RUN-1.0 840 °/s, RUN-1.1 before (c) 1270 °/s).<br>• **Heel:** the rise starts at 36 % of stance (RUN-1.0 54 %).<br>• **Continuity:** p99 knees 2.49 (2.95), ankles 4.99 (5.90), toes 5.76 (6.98), pelvis 0.52 (0.29, from the larger, physical vertical). Joins as RUN-1.0 (worst 0.08° across the speed grid).<br>• **Contact:** slip 0; skinned-mesh stance median 0.0 mm and swing ≥ +0.1 mm at 3.0–7.8 m/s; determinism identical; RUN-1.0 check identical.<br>• **Hip extension:** −19.9° at 5.5 m/s, −21.7° at 4.2 m/s (box −20°, hard −25°; RUN-1.0 −20.9°).<br>• **Still deviating:** peak dorsiflexion 35° (real 22°); loading flexion 25° (real 18°). The arm reach dominates the look, and the trunk is upright.<br>• **Evidence:** `effort/E1_*.png`, `effort/E1_metrics.txt`. |
| E2 | **Reaching, pendulum arms** (E0 item 1). The forward hand reached 47–50 cm ahead of the hips (real 20 cm), the upper arm swung 31–37° in front of the trunk (real ≈ 0°), the elbow was open (72–97°; real 94–124°), and in front view the elbows were held out. | **The elbow drives back.**<br>• The upper arm swings 50° behind to 5° in front at 5.5 m/s (jog 40 / 0, sprint 60 / 25); RUN-1.0: 45 / 33.<br>• The elbow is 102° ± 18°, closing a little after the forward extreme (lag 0.08 of the stride).<br>• Each arm is most forward just before its own leg's toe-off (armPh −0.25; real at 26 % of the stride, RUN-1.0 36 %).<br>• Abduction is 8° (12°): elbows close to the trunk. | **At 5.5 m/s:**<br>• **Upper arm:** forward 8.8° (36.6), back 51.4° (48.7), most forward at 26 % of the stride (35.5 %).<br>• **Elbow:** 84–120° (72–96°).<br>• **Hand:** reaches 37.7 cm ahead (50.2); wrist ≥ 15.7 cm lateral of the midline.<br>• **Mesh:** no hand-to-hip, thigh or trunk penetration over 2 mm on the skinned mesh at 3.0 / 5.5 / 7.8 m/s (`tools/run1_handclear.cjs`, new; RUN-1.0 the same).<br>• **Centre of mass:** the COM-to-pelvis vertical offset range falls from 1.74 to 1.30 cm (real 0.5–0.9).<br>• **Visual:** the side and gameplay-camera (2.5×) views read as compact, driving arms; the hand comes forward to the chest rather than out in front.<br>• **Still deviating:** the trunk is still upright.<br>• **Evidence:** `effort/E2_*`. |
| E3 | **A rigid, upright trunk** (E0 item 5). Lean 7°, pitch range 2.3° (real 12.6° / 6.2°). Next to the now-loaded legs, the upper body looked carried rather than working. | **The trunk dips into every stance.**<br>• Lean 12.5° at 5.5 m/s (jog 9°, sprint 15°; RUN-1.0 8 / 5 / 13).<br>• Pitch ±3.0°, most forward at 60 % of stance and most upright in flight (RUN-1.0 ±1°).<br>• The head stabiliser is unchanged: gaze 6° down with a residual nod. | **At 5.5 m/s:**<br>• **Trunk:** pelvis → neck lean 10.8° (7.1), pitch range 4.3° (2.3), most forward at 20 % of the stride (real 18 %).<br>• **Head:** pitch range 2.4°, max 24 °/s, unchanged. It rides the body's vertical (7.8 cm; RUN-1.0 4.4).<br>• **Lumbar / thoracic** axial ranges unchanged, inside the box.<br>• **Visual:** the runner leans into the run, with the head ahead of the hips as in the real strides. Combined with the E2 arms, the phase sheet now matches the real trunk and arm relationships.<br>• **Still deviating:** the late-swing foot still reaches ahead of the knee (E4).<br>• **Evidence:** `effort/E3_*`. |

