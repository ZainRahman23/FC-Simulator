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
| E4 | **The recovery leg travels a loop rather than being driven** (E0 item 6). In the motion paths (`tools/ref/run1_refpaths.cjs`, new; `effort/E4_paths_before.png`), RUN-1's swing ankle reaches 15–20 cm beyond its landing point, low over the turf, and hooks back: the thigh peaks late (83 % of the stride) and whips back 29°. The real foot comes down onto the turf from above, with only a small hook, after the thigh peaks at 77 % and settles back 15°. | **A recovery sequence:**<br>• Heel recovery: knee peak at 62 % of the stride (RUN-1.0 58.5 %).<br>• Knee drive: the thigh peaks at 78 % with a hip of 58° (62° at 83 %).<br>• The knee stays folded longer (hold 100° at 0.62 swing) and extends to 21° before re-flexing into the 26° contact (RUN-1.0 16°).<br>• Jog and sprint retimed the same way.<br>**Two corrections found by the checks:**<br>• The mid-foot landing's fast early dorsiflexion forced the C1 swing ankle into a 30° toes-down bulge just before contact (the skinned toe 2 cm into the turf). A pre-contact key now puts the reversal in the last 12 ms of swing. Real ankles reverse at the impact. Tried first: a smoothstep heel-drop (zero rate at contact). It made the bulge worse (−7 cm), because the knee then took the whole landing (1340 °/s); reverted.<br>• Sprint arm back-swing 60 → 56°: shoulder −62.7° exceeded V2's −60° box after E2. | **Late swing:** the ankle hook is now small, as in the real strides (`effort/E4_paths_after.png`). The flight-phase front leg comes down bent with the foot under the knee instead of reaching.<br>**Thigh, at 5.5 m/s:** peak 47.4° at 78.5 % (54.4° at 83 %); retraction 18.7° (29.1°; real 14.6° at 3.6 m/s).<br>**Clearance:** skinned-mesh swing minimum +0.0 to +2.1 mm at 3.0–7.8 m/s; foot to stance leg ≥ 14.0 cm (RUN-1.0 11.2).<br>**Limits:** all inside V2's box except hip extension −20.6° (RUN-1.0 −20.9°).<br>**Evidence:** `effort/E4_*`. |
| E5 | **A mechanical spine wring** (E0 item 7). RUN-1.0 counter-rotated the pelvis against the thorax: "right hip back" at 39 % of the stride against the shoulders at 86 %, a ±17° thoracic twist. The swing-side pelvic drop peaked just after touchdown (9 %). The real pelvis turns *with* the thorax (4 % / 98 %); the arms and shoulders counter the legs. The drop builds through stance and peaks around toe-off (31 %). | Pelvis yaw ±6° peaking at 4 % (0.38). Thorax ±10.5° at 3 % (±13° at 86 %; the arm-driven clavicle shifts the measured shoulder line to 97 %). Obliquity ±4° peaking at 30 % (±3.5° at 9 %; below the skin-marker 5.8°, which overstates by up to 4×). | **Phases at 5.5 m/s:** pelvis 3 % (real 4.1 %), shoulders 97 % (real 98.2 %), obliquity 30 % (real 31.5 %).<br>**Spine twist:** thoracic axial ±7.1° (±17.1°), lumbar ±2.0° (±4.8°).<br>**Contact:** stance median 0.0 mm and swing ≥ +0.2 mm on the mesh; foot to stance leg ≥ 18 cm.<br>**Visual:** from the rear ¾ the trunk turns with the pelvis while the arms counter the legs, with no wringing.<br>**Tool fix:** a comment edit in `run1_refmetrics.cjs` had silently dropped the shoulder-yaw and obliquity rows from the saved metric files of E0–E4. The E0 values in the table above come from the run before that edit. `effort/E0_metrics_real_vs_RUN1.0.txt` was regenerated with the fixed tool; the real strides and RUN-1.0 are unaffected by later changes.<br>**Evidence:** `effort/E5_*`. |
| E6 | **Found by the smoothness comparison** (`run1_continuity.cjs` now also runs RUN-1.0 on the same input).<br>• At a constant 5.5 m/s RUN-1.1's ankles were 25 % rougher than RUN-1.0's (p99 7.38 vs 5.90). The peak was 12 ms before touchdown: the swing hip had to reverse, because the stance hip briefly *flexed* after contact (+73 °/s; RUN-1.0 +38). The knee collapse at the landing dragged the thigh forward; real thighs keep extending through contact.<br>• The stance knee peaked at 54° (5.5 m/s) to 58° (4.2 m/s); real 47° at 3.6 m/s.<br>• Hip extension reached −20.9° at 4.2 m/s.<br>• Also found: the E1 "ramp" continuity run had silently used constant speed. A bare `--ramp` takes no profile; the tool now refuses an invalid one. | **The ankle takes more of the landing:**<br>• Heel 7° up at touchdown (4°), lowering over 12 % of stance.<br>• Touchdown knee 28° (26; real 28.7), loading-peak extra 2° (3).<br>• Jog contact 0.25 s (0.27): at 3.8 m/s the duty falls from 34.7 to 32.7 % (real 30.6 %).<br>**Tried and not adopted** (kept as `effort/experiments/E6_com_consistent_pelvis_NOT_ADOPTED.patch`):<br>• **A COM-consistent pelvis:** the whole-body COM, not the pelvis, follows the vertical model, via a Fourier correction from the pose's own COM offset. It changed the pelvis range by 0.1 cm and the knee peaks by 0.0–0.1°, and doubled the per-cell solve cost.<br>• **Jog anchor:** zero loading extra, touchdown knee 26° and a later heel rise. Each moved the mid-speed knee by ≤ 1.3°. | **Contact:** hip extends through contact (−22 °/s); knee touchdown rate 806 °/s, peak rate 803 °/s (RUN-1.0 836).<br>**Knee peak:** 50.5 / 54.0 / 54.9 / 53.6 / 46.1° at 3.0 / 3.8 / 4.2 / 5.5 / 7.8 m/s.<br>**Hip extension** is now inside V2's box at every speed (worst −19.3°; RUN-1.0 −20.9°). **Every joint channel is inside the planning box.**<br>**Smoothness against RUN-1.0, p99 cm/tick² at a constant 5.5 m/s:**<br>• knees 2.57 vs 2.95;<br>• ankles 5.09 vs 5.90;<br>• toes 4.92 vs 6.98;<br>• hands 0.96 vs 1.39;<br>• elbows 0.69 vs 0.97;<br>• pelvis / spine / head 0.52–0.56 vs 0.29–0.31, the true-gravity bounce, still 1/20 of V1's.<br>**On the 3 → 7.8 → 3 ramp:** every limb group is smoother than RUN-1.0; pelvis 0.59 vs 0.33.<br>**Evidence:** `effort/E6_*`, `effort/final/`. |

## Result — RUN-1.1 (head of `prototype/locomotion-v2-run1`)

**To watch it.**
1. Start the server: `cd ~/Downloads/"FC Simulator worktrees"/locomotion-v2-run1 && python3 -m http.server 8317 --bind 127.0.0.1`.
2. Open **http://127.0.0.1:8317/sandbox/visual/run1.html**.

It opens with **RUN-1.1 new** (near lane), **RUN-1.0 original** (middle) and **V1** (far) on the gameplay camera, with RUN-1.1 and RUN-1.0 side views on the right.
- Toggle any of the three under *Show*.
- Every close view can show any subject.
- Speeds 1× / 0.5× / 0.25× / 0.1×; zoom 1× (true game size), 2.5× and 4×; speed 3.0 – 7.8 m/s or the ramp.

**The largest visual changes, in order of how much they change the read:**
1. **Arms drive instead of reaching.** The elbow drives back. The upper arm swings from about 50° behind the trunk to about level with it (RUN-1.0: 33° in front), with the elbow flexed 84 – 120°. The hand comes forward to the chest (34 cm ahead of the hips, against 50), with the elbows tucked in front view.
2. **Weight and launch.** The vertical is the body under its own stance force and true gravity. RUN-1.0 fell at 0.6 g in flight.
   - The body sinks early into each stance (low point at 41 % of stance) and leaves the ground 1.5 cm higher than it landed.
   - It is then thrown into a flight that falls at g.
   - Pelvis range 7.2 cm at 5.5 m/s (RUN-1.0 4.3). The shape is fitted to real strides; the amplitude is physics, not a scale factor.
3. **Lean into the run.** The trunk leans about 11° (RUN-1.0 7°) and dips about ±2° into every stance. The head stays stabilised: pitch range 2.4°, as before.
4. **A loaded stance and a push.**
   - Mid-foot landing (heel 7° up) under a bent knee (28°).
   - The heel lowers to take the first of the load; the knee loads to about 54°.
   - The heel rises progressively from about 40 % of stance (RUN-1.0: flat to 54 %, then a peel).
   - The knee extends to 96 % of stance, so knee, ankle and hip extend together into toe-off, and the hip keeps extending through the landing.
5. **A driven recovery.** Heel recovery (knee peak at 61 % of the stride), then knee drive (thigh peak at 78 %, RUN-1.0 83 %), then the foot coming *down* onto the turf with a small settle (thigh retraction 14°, RUN-1.0 29°), instead of reaching far ahead and pawing back.
6. **Pelvis turns with the trunk.** "Right hip back" peaks at the right touchdown and the shoulders at 97 % (real 4 % / 98 %). RUN-1.0 wrung the spine ±17°; now ±6°. The swing-side pelvic drop peaks at toe-off (30 %, real 31.5 %).

**Smoothness is kept, and improved for every limb** (60 Hz second differences, p99, cm/tick², RUN-1.1 vs RUN-1.0, same input):

| at a constant 5.5 m/s | RUN-1.1 | RUN-1.0 |
|---|---|---|
| hands | 0.96 | 1.39 |
| elbows | 0.69 | 0.97 |
| knees | 2.57 | 2.95 |
| ankles | 5.09 | 5.90 |
| toes | 4.92 | 6.98 |
| pelvis / spine / head | 0.52 / 0.51 / 0.56 | 0.29 / 0.29 / 0.31 |

- **Pelvis, spine and head** are higher because RUN-1.1 really bounces at g. They are still about 1/20 of V1 (12.0).
- **The 3 → 7.8 → 3 ramp:** every limb group is smoother than RUN-1.0 (toes 5.91 vs 9.13, hands 2.06 vs 3.16); pelvis 0.59 vs 0.33.
- **Joins and rates:** every leg channel is C0 + C1 through both contacts at all speeds (worst value step 0.06° from speed-grid interpolation; RUN-1.0 0.08°). Knee peak rate 803 °/s (RUN-1.0 836).

**What remains visibly weak** (my judgement from stills, phase sheets, motion paths and chronophotographs — not from watching it in motion):
- **The bounce is now real.**
  - 7.2 cm at 5.5 m/s, 8.3 cm at the 3 m/s jog. The real recreational strides at 3.6 m/s bounce 9 cm.
  - Whether this reads as "weight" or as "bouncy" for a footballer is a judgement for your eyes in motion.
  - The physically consistent levers are the contact time (`tc`) and the force skew (`vSkew`); a scale factor would bring back the 0.6 g flight.
- **The stance is a little too compliant.** Peak ankle dorsiflexion is about 35° (real 22°; Fukuchi 2017: about 27°), and the knee loads to about 54° (real 47° at 3.6 m/s). The shin pitches far over the planted foot at mid-stance in close side views. Part of this is skeleton proportions (the CMU and Vinícius feet and hips differ). Every lever tried trades it against the landing rate or the heel rise (E6 scan).
- **The 5.5 m/s numbers are extrapolated.** The open real reference tops out at 4.1 m/s, from recreational runners. The Stanford 5 m/s data (Hamner & Delp 2013) needs a SimTK account.
- **Swing details.**
  - The heel tucks a little lower at the back of the recovery than in the real strides.
  - The toe trails a little longer after toe-off.
  - The ankle's reversal at contact is placed in the last 12 ms of swing, a fast foot rotation that can be seen at 0.1× in close views.
- **Hands** brush the shorts at the rear of the drive; there is no penetration on the skinned mesh, as in RUN-1.0.
- **Grid solve.** The first use of each speed-grid cell costs about 50 ms (RUN-1.0 58). The viewer pre-solves all 27 cells before the ramp. A match with 22 different rigs needs these precomputed per rig.
- **Asset issues, unchanged:** Vinícius's mirrored front print and the hand-mesh openings.

**Regressions — none found in any guaranteed property:**
- **Simulation-authoritative root, presentation only.** No file outside the RUN-1 paths changed. The V1 gate's ON/OFF neutrality and determinism are IDENTICAL; its item-3 flag is the pre-existing corner-flag timer (`effort/final/neutrality_of_loco_regress.txt`).
- **Determinism.** Replay ≡ replay and incremental ≡ incremental at constant speed and on the ramp; replay ≡ incremental at constant speed. No `Math.random`, `Date.now` or `performance.now` in either gait file.
- **Foot planting.** Contact-point slip 0.00 cm at constant speed and 0.01 mm per tick on the ramp. Skinned-mesh stance median 0.0 mm, never below the stud plane; swing ≥ +0.0 mm at 3.0 – 7.8 m/s. Foot to stance leg ≥ 16.9 cm (RUN-1.0 11.2).
- **Joint limits.** Every channel is inside V2's planning box at 3.0 – 7.8 m/s, including hip extension (−19.8°; RUN-1.0 was 0.9° outside).
  - **Erratum (10 Oct, RUN-1.2 final regression).** The `run1_limits.cjs` scan behind this line sampled only 3.0 / 5.5 / 7.8 m/s. A 0.25 m/s scan of the frozen RUN-1.1 finds hip extension **−20.1 to −20.5° at 4.0 – 5.0 m/s** (worst −20.52° at 4.75 m/s): 0.5° outside the planning box, 4.5° inside V2's hard limit. Nothing else changes. RUN-1.1 stays frozen as it is; see `RUN1_2_REGIMES.md` §6 for RUN-1.2 (worst −20.15°).
- **Performance** (Node, mean / p95):

| case | RUN-1.1 | RUN-1.0 | V1.3 |
|---|---|---|---|
| 1 rig | 0.032 / 0.048 ms | 0.028 / 0.041 ms | — |
| 22 rigs | 0.68 / 0.82 ms | 0.58 / 0.71 ms | 3.0 / 4.2 ms |
| 22 rigs, speed changing every frame | 1.04 / 1.22 ms | 0.95 / 0.93 ms | — |

- **RUN-1.0 preserved.** `run1_orig_check.cjs`: the verbatim block is identical to `3caa5d58`, and the pose hash is identical.

**Recommended next locomotion step (not started).**
1. **Your review in motion.** Watch RUN-1.1 against RUN-1.0 at 1×, 2.5× and 0.25× and decide the bounce and compliance question above. The method makes a re-tune quick: one principled change, then the phase sheet, the chronophotograph and the smoothness table against RUN-1.0.
2. **Then curved running and turning on the same evidence-led method.** The open CMU set has real *run + veer left / right* and *90° turn* trials (subject 16, trials 37 – 44 and 48 – 54) at about 4 m/s for reference.
   - It needs world-space plants (each plant stays fixed on the pitch while the heading changes), lean into the curve, and the step-width and foot-yaw changes of a curve.
   - It is the prerequisite for any match use.
   - A per-rig precomputed speed grid should come with it, before integration.

**Files.**
- `sandbox/visual/run1/run1_gait.js` (RUN-1.1), `run1_gait_orig.js` (RUN-1.0, frozen), `run1_viewer.js`, `../run1.html`.
- Tools: `tools/run1_orig_check.cjs`, `tools/run1_handclear.cjs` (new); `tools/run1_continuity.cjs` and `tools/run1_perf.cjs` (RUN-1.0 / ramp cases).
- `tools/ref/`: `cmu_amc.cjs`, `cmu_trial.cjs`, `run1_refmetrics.cjs`, `run1_phases.cjs`, `run1_refpaths.cjs`, `run1_strobe.cjs`.
- Evidence: `effort/E0…E6_*` and `effort/final/`.

**Commits:** `0ecdbd65` setup, `c2b824cd` E1, `141859ca` E2, `156f90b9` E3, `f2fac238` E4, `949bd763` E5, `da3035f5` E6, then the final evidence commit.

