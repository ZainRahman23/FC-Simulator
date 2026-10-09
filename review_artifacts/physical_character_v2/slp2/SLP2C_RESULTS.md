# SLP-2C — contact-compatible legs: RESULTS (STOPPED at stage 1, walk 1.2 m/s)

**Protocol:** `SLP2C_PREREGISTRATION.md`, frozen b35b31a, no amendments.
**Source:** `../sources/2026-10-09_user_decision_slp2c_contact_compatible_legs.md`.
**Outcome:** stage 1 (V2-REF, walk 1.2 m/s, D0, f = 1 Hz) **fails**. It ran twice with identical hashes, **d05c186a / d05c186a**, and the body was FALLEN at **2.358 s**.

Under §5 (stop rules) SLP-2C stops here. Not run: jog 3 m/s, run 6 m/s, the SLP-2 calibration rerun, the 21-case matrix and the rigid impactor.

SLP-2 stays a failed calibration exactly as recorded. A, B, R, the body, joints, actuators, contact / friction and the solver were not changed. **P9 passes**: versions "1", "1b" and "2" reproduce all nine f1 calibration hashes (`analysis/slp2c_P9_regression_log.txt`).

## 1. Result in one paragraph

The SLP-2C changes did two things to the walk.

**C2 worked as designed, and overshot.** It removed most of the stance braking the SLP-2 diagnosis found, but it made the stance leg propel the body.
- Before the first touchdown, the R stance foot pushes **+16.1 N·s** forward (SLP-2: −0.1). Across double support it pushes a further +11.3 N·s.
- The L stance braking falls by about 60 %: −5.9 / −10.8 N·s against SLP-2's −14.1 / −30.3 in the same windows.
- B cancels the push (−19.9 N·s), and its pitch torque reaches **62 % of cap** before any touchdown (SLP-2: 42 %).

**C1 reached its narrow aim at first contact.** Forward foot speed at touchdown was **0.045 m/s** (SLP-2: 0.138). Contact was still 67 ms early, and the foot bounced and re-contacted.

**C1 also made the swing physically unfollowable.** It compresses the walk swing's 1.33 m horizontal travel into 0.247 s instead of 0.396 s. The swing foot cannot follow that:
- the trailing R foot lags its target by up to **0.88 m** (SLP-2: 0.42 m);
- it never clears the turf: it is in contact on **91 of 95** swing ticks and carries **110 – 470 N** toe-down from 0.10 s after liftoff;
- it brakes **−62.6 N·s** during its swing.

**The collapse.** The swing-foot drag starts before the collapse (|pitch| > 5° at 1.183 s). B's pitch torque then hits its cap (100 % of ticks in [1.183, 1.45)). Pitch reaches 40°, and the body falls.

**Verdict.** C stayed physically real, but it is **not mechanically neutral** with respect to authoritative translation.

## 2. Preregistered tests (stage 1, run a; run b identical)

The steady window is [t_g + T_ramp + 1 s, end] = [2.5, 4.358] s. It starts **after** FALLEN (2.358 s), so every steady-window value below describes a fallen body. The verdicts are recorded as the frozen protocol defines them; §3 gives the pre-collapse values as diagnostics.

| | measured | verdict |
|---|---|---|
| **P1** | J_A 94.69 N·s; J_B +157.85 (167 % of J_A); J_legs −120.55 (127 %) | fail |
| **P2** | A9 mean \|B\|/cap: F_x 0.07, F_y 0.60, F_z 0.38, T_x 0.93, T_y 0.10, T_z 0.21; A3 saturated 82.3 % | fail |
| **P3** | no steady step (gait stopped at FALLEN); steady J_legs −136.5 N·s vs limit 4.7 | fail |
| **P4** | 0 steady stances | fail |
| **P5** | legs' vertical 125.1 N·s vs weight 1438.6 (8.7 %) | fail |
| **P6** | walk: no flight schedule | n/a (vacuous pass) |
| **P7** | end D_x,z −71.7 mm (limit 50); A2 RMS 28.7 mm, max 47.3; per-step terms n/a | fail |
| **P8** | leg hard-limit margin min −0.15° (steady); actuator saturation 1.6 % | fail |
| **P9** | 9 / 9 earlier hashes reproduce | **pass** |
| A1 / A4 / A5 / A6 | 1.185 m/s (pass) / FALLEN 2.358 s (fail) / energy Σ+ 13.46 J > 5 J (fail; writes 0, cap excess 7e-6 N, max position correction 0.53 mm) / 4 of 4 stances in contact (pass) | fail |

## 3. Per-speed report (walk 1.2 m/s; the only speed reached)

Two windows:
- **W1, pre-collapse:** [t_g, first |pitch| > 5°) = [0.5, 1.183) s.
- **W2, to the fall:** [0.5, 2.358) s.

SLP-2's W1 (same walk, f = 1; its first |pitch| > 5° is at 1.167 s) is shown for comparison. The source is `analysis/slp2c_stage1_walk_report.json`.

| quantity | SLP-2C W1 | SLP-2C W2 | SLP-2 W1 |
|---|---|---|---|
| A forward impulse | 75.69 N·s | 94.69 | 73.34 |
| legs net forward impulse | **+5.07** (stance +10.72, swing −5.65) | +17.08 (stance +57.39, swing −40.31) | **−44.83** (stance −46.6, swing +1.7) |
| B forward impulse | −13.71 | −34.84 | +37.58 |
| legs vertical impulse vs weight | 540.6 / 529.0 (102 %) | 1049.2 / 1445.0 (73 %) | 569.8 / 516.1 (110 %) |
| B mean \|axis\|/cap: F_x F_y F_z | 0.18, 0.07, 0.33 | 0.22, 0.32, 0.40 | 0.14, 0.23, 0.26 |
| B mean \|axis\|/cap: T_x (pitch) T_y T_z | **0.55**, 0.05, 0.20 | 0.80, 0.21, 0.57 | **0.40**, 0.05, 0.19 |
| B saturated (ticks) | 26.8 % | 66.1 % | 20.0 % |
| D: COM forward vs R | +30 … +64 mm (body **ahead**) | +20 … +100 mm | +10 … +43 mm |
| D_v forward | −0.15 … +0.19 m/s | −0.21 … +0.37 | — |
| pelvis pitch / roll | −2.3 … 5.0° / −0.4 … 1.8° | −2.3 … 140.8° / −18.9 … 35.4° | 0 … 5.0° |
| leg hard-limit margin (min) | **−0.49°** (first < 0 at 1.167 s) | −9.43° | +12.39° |
| leg actuator saturated axes (mean) | 1.12 | 3.28 | — |

**Forward impulse by foot and phase (N·s).** Source: trace ankle-probe impulses. L = left foot, R = right foot; S = scheduled stance, W = scheduled swing.

| window | SLP-2: LS / LW / RS / RW | SLP-2C: LS / LW / RS / RW |
|---|---|---|
| [0.5, 0.829): L swing, R stance | 0.0 / +3.5 / −0.1 / 0.0 | 0.0 / +0.3 / **+16.1** / 0.0 |
| [0.829, 1.052): L touchdown, double support | −14.1 / +0.9 / −5.0 / 0.0 | −5.9 / +4.3 / **+11.3** / 0.0 |
| [1.052, 1.183): L stance, R swing | −30.3 / 0.0 / 0.0 / −2.7 | −10.8 / 0.0 / 0.0 / **−10.2** |

**B pitch torque, mean |T_x|/cap (saturated % of ticks).**

| window | SLP-2 | SLP-2C |
|---|---|---|
| [0, 0.5) standing | 0.13 (53 %) | 0.03 (0 %) |
| [0.5, 0.829) | 0.42 (20 %) | **0.62 (30 %)** |
| [0.829, 1.052) | 0.23 (0 %) | 0.31 (0 %) |
| [1.052, 1.183) | 0.76 (71 %) | 0.82 (71 %) |
| [1.183, 1.45) | 0.95 (100 %) | **1.00 (100 %)** |

### Touchdowns (physical: first tick ≥ 20 N after ≥ 50 ms without)

| | t (sched.) | v_fwd | v_lat | v_down | foot ahead of COM |
|---|---|---|---|---|---|
| SLP-2C L, first contact | 0.829 s (0.896; 67 ms early, still in swing) | **0.045** | 0.038 | 0.195 | 0.30 m |
| SLP-2C L, re-contact after bounce | 0.983 s | 0.349 | −0.385 | 0.241 | 0.28 m |
| SLP-2 L, first contact | 0.854 s (0.896) | 0.138 | 0.036 | 0.252 | 0.30 m |
| SLP-2 L, re-contact | 0.971 s | 0.382 | −0.279 | 0.303 | 0.28 m |

After the collapse began, touchdowns at 1.73 – 3.23 s occur at 0.9 – 2.3 m/s and are not locomotion. No R touchdown occurred before the collapse, because R never left the turf.

### Stance-foot slip

Source: `analysis/slp2c_stage1_walk_diagnosis.json`, a verified regeneration with hash d05c186a.
- The only stance completed before the collapse, L (TD 0.896), slips **0.0 mm** over the flat phase (0.2 ≤ u ≤ 0.6; P4's definition, limit 20 mm). Over its whole loaded contact, including heel and toe roll and the bounce, it slips 34.8 mm. SLP-2: 0.1 / 25.4 mm.
- The later scheduled stances (R at 1.448 s, L at 2.000 s) fall during the collapse. They carried load on only 2 and 6 ticks respectively, so they are not plants.

### Contact timing

Walk has no flight.
- L touched down 67 ms before its scheduled touchdown, unloaded below 20 N for ≥ 50 ms, then re-loaded at 0.983 s (87 ms after its schedule).
- R's scheduled swing [1.052, 1.448): the foot was in contact on 91 of 95 ticks (SLP-2: 65 of 95).

### Why the trailing swing foot drags

Source: `analysis/slp2c_stage1_walk_diagnosis.json` vs `analysis/slp2_walk_f1_swing_diagnosis.json` (regenerated, 6fbee446).
- **Commanded swing.** The swing moves the foot 1.33 m (one stride) in T_sw = 0.396 s at walk. SLP-2's horizontal segment already arrives at rest at T_sw. C1 completes it in T_h = 0.247 s, so the peak commanded foot speed rises by about 1.6× (on a min-jerk profile, from about 6.3 to about 10 m/s).
- **SLP-2.** The foot lags its target by 0.11 m at 0.15 s after liftoff and 0.16 m at 0.21 s. It then lands back on the turf at 0.23 s, flat, carrying up to 840 N, and stays there (lag 0.42 m). This happens after its pitch collapse had begun (|pitch| > 5° at 1.167 s).
- **SLP-2C.** The lag is 0.16 m at 0.08 s after liftoff, 0.32 m at 0.11 s, 0.54 m at 0.15 s and 0.88 m at 0.25 s. The sole toe point stays 15 – 27 mm high while the heel lifts to 110 mm. From 0.10 s after liftoff (1.15 s) the foot carries 110 – 470 N toe-down and is dragged backward. That is **before** the pitch collapse (1.183 s).
- **The vertical channel does not explain it.** The toe tracks its commanded height within a few millimetres until load comes on (target 11.8 mm vs actual 10.2 at 0.081 s).
- **The cause is horizontal.** The foot cannot follow the commanded horizontal motion. The leg stays behind the hip, the foot stays on the ground, and it braking-loads.
- The leg hard-limit margin goes negative at 1.167 s, during this drag. The joint was not identified in this report.

Figure: `analysis/SLP2C_STAGE1_vs_SLP2.png`. It shows legs' forward force (stance vs swing), B and A forward force, load on the swing foot, B vertical force, pitch and D_v.

### CPU

**936 µs per tick** (evidence run a):
- Jolt 325.5; passive + apply 266.6; driver 163.7; measurement 97.7; probes 47.4; actuators 30.3; support targets 5.2.

This is a single run, not the sequential CPU protocol; the SLP-2 reference is 819 – 944 µs. The C1 and C2 changes add no measurable driver cost: one extra segment evaluation per swing leg.

## 4. Is C mechanically neutral and physically real?

**Physically real: yes, as far as stage 1 reached.**
- Contacts are genuine Jolt contacts with unchanged friction.
- The completed plant did not slip (0.0 mm flat phase).
- The legs carried 102 % of body weight before the collapse.
- No writes; caps respected (7e-6 N excess); no presentation-only contact.

**Mechanically neutral: no.**
- **The pre-collapse sum hides the components.** The legs' net forward impulse before the collapse is small (+5.1 N·s, 6.7 % of A's), but it is the sum of a C2 stance propulsion (R +27.4 N·s), the remaining L stance braking (−16.7) and the C1 swing drag (−10.2, growing to −62.6 over the whole swing).
- **The components are not neutral per phase or per foot**, and they cost B real budget:
  - pitch torque 55 % of cap on average before the collapse, against the 25 % budget;
  - saturated on 27 % of ticks;
  - with the body pushed 30 – 64 mm **ahead** of R.

So SLP-2C replaced SLP-2's single braking incompatibility with two smaller opposite-signed ones, and one of them (the swing drag) is new in onset.

## 5. Classification

**By the stop rule.** Stage 1 failed; under §5 SLP-2C stops whatever the cause.

**Is it the same contact incompatibility? Partly.**
- It is the same family: leg-ground contact forces opposing the authoritative translation, absorbed by B until B's pitch cap.
- The mechanism has moved:
  - **touchdown:** improved (C1);
  - **stance:** braking largely removed, but overshot into propulsion (C2);
  - **swing:** the first failure is now swing-foot drag. C1's compressed horizontal swing exceeds what the swing leg can physically follow.
- My pre-freeze diagnosis (§2 of the preregistration) did not identify swing tracking. It was present in SLP-2 (R swing 65 of 95 ticks in contact, −58 N·s), but there it began after the collapse had started, so I took it for a consequence.

**Hard stop.** Nothing measured here shows that passing *requires* a prohibited measure (B caps, A compensation, friction, presentation-only contact). The remaining problems are all inside C. But fixing them needs mechanisms the frozen SLP-2C does not contain, so it needs a decision.

**No V2 body limit was shown.** Joint-margin loss and actuator saturation appear only with the drag and the collapse.

## 6. Options for the user (nothing has been started)

1. **Swing-feasibility diagnosis first (read-only; no new locomotion mechanism).**
   - Measure what the existing swing leg can physically follow: commanded vs achieved foot travel, peak speed and clearance against the actuator capacities.
   - Use the walk / jog / run stride lengths and T_sw, with B holding the pelvis high enough that the feet cannot reach the turf. This is a diagnostic configuration, not a locomotion test.
   - It decides whether the swing problem is authoring (servo bandwidth, no acceleration feed-forward) or capacity (the V2 leg cannot move 1.33 – 3.75 m per swing in the scheduled time).
   - **I recommend this before any further change.** Without it, any new swing law is a guess.
2. **SLP-2C amendment (new frozen preregistration; rerun stage 1 under the same P1 – P9).**
   - Revert C1's horizontal compression (keep SLP-2's full-T_sw horizontal segment, which already ends at rest).
   - Make the swing followable, for example with swing-leg inertial feed-forward of the scheduled segment and early lift clearance.
   - Make C2's stance feed-forward use the **authoritative** sweep rate (state-independent, from T) instead of the measured pelvis motion, so it can cancel damping against the translation without becoming propulsion.
   - These are new C mechanisms, within the permitted "trajectory-driven" categories, but not in the frozen design.
3. **End the SLP series here.** Record that a physically real, contacting leg system following an authoritative trajectory requires swing / stance contact authoring of gait-controller scope (LOC-1 class), which the current constraints exclude. Then choose a different integration architecture.

**Not done** (as instructed): no jog / run, no calibration rerun, no matrix or impactor, no running animation, turning, polish, tackles, recovery, optimisation, TD2C / E2 or LOC-1.

## 7. Evidence and scripts

**Evidence:**
- `evidence/slp2c_stages/stage1_walk_D0_f1_{a,b}.json.gz` (d05c186a both).

**Analysis:**
- `analysis/slp2c_stage1_walk_report.json`: per-speed quantities, W1 / W2.
- `analysis/slp2c_stage1_attribution.txt`: windowed impulse attribution, SLP-2 vs SLP-2C.
- `analysis/slp2c_stage1_walk_diagnosis.json` and `analysis/slp2_walk_f1_swing_diagnosis.json`: verified regenerations; stance slip, swing-foot target vs actual.
- `analysis/SLP2C_STAGE1_vs_SLP2.png`.
- `analysis/slp2c_P9_regression_log.txt`.

**Scripts:**
- `scripts/report_slp2c_stage.py`;
- `scripts/slp2c_stage_diagnosis.mjs` (read-only; reports only if the regenerated hash equals the evidence's).

**Code:**
- version "2c" paths in `sandbox/visual/physchar2/ctrl/v2_supported.js` (C1, C2) and `sandbox/visual/physchar2/tools/slp1_probe.mjs` (P1 – P8, touchdown velocities, flight timing);
- `gates/v2_slp.js` unchanged.

**Reproduce stage 1:** from the worktree root, `V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 node sandbox/visual/physchar2/tools/slp1_probe.mjs --version=2c --speed=walk --case=D0 --f=1 --out=<file>`.
