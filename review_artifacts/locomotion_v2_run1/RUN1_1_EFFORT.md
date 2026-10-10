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
