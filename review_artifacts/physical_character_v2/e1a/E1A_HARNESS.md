# E1a harness and operational definitions (written and committed BEFORE any E1a run)

**Authority:** `../sources/2026-10-05_user_decision_option_a_authorise_e1a.md` (E1a only; E1b and later NOT authorised).

**Frozen inputs** (none changed here):
- protocol and criteria: `../final_pre_e1a/E1_PREREGISTRATION.md` §1–§3;
- amendments: `../knee_correction/E1_PREREGISTRATION_V2.md` §1;
- configuration: `../knee_correction/E1_PREREGISTRATION_V2_CONFIG.md`.

**What this file does:** it fixes how each protocol step and each criterion is **operationalised** in code, where the preregistered text needs a concrete reading (a window, a reference instant, a tick convention). Every reading is chosen from the preregistered text and the existing gate conventions, **before any E1a outcome exists**.

**Tools:**
- `tools/e1a_run.mjs` (one run, full per-tick instrumentation);
- `tools/e1a_eval.mjs` (the criteria).

**Rules for the run:**
- A harness bug found later (crash, wrong measurement) may be fixed only so that the code implements this text. It is recorded, and the battery is re-run in full.
- No criterion, configuration, controller, gain, threshold, target, timing or lifecycle change, ever.

## 1. Configuration (asserted by the runner; it refuses to run otherwise)

| item | value |
|---|---|
| knee | `v2k` central (`V2_KNEE_MODEL=v2k` + `passiveOpts.kneeModel = "v2k"`) |
| ankle k | `V2_ANKLE_NEUTRAL_K=0.13` |
| controller | G3_STAND (contactSupport, holdUnloaded, ikFeasible) + `ikRefTwist` + `lifecycle` |
| abort | `supervise: {}`, the G3 supervisor's defaults: margin 1 cm, dwell 20 ms, minShare 0.85, abortDur 0.6 s. Its lifecycle response (H9) puts an airborne foot down first |
| physics | 240 Hz, plane turf, approved anatomy |
| lift | 5 mm. Any other value is a harness test; the evaluator refuses it |

## 2. Protocol as implemented (prereg §2)

All commands go through existing controller mechanisms only:
- the transfer request (G3's request convention, with analytic rates);
- the posture `pelvisDrop` target;
- the lifecycle's `setSwingTarget`.

There are no pose writes and no external forces.
- The harness decides events at the start of each controller tick (time = `ctrl.n · dt`), from the previous tick's lifecycle state. This keeps it causal.
- "Stance share" σ is the stance foot's requested share: λ_R = σ for a left lift, 1 − σ for the mirrored right lift.

| step | implementation |
|---|---|
| settle | 0–1 s, quiet |
| planned pelvis drop | `pelvisDrop {t0 1, dur 2, dz 0.025}` (min-jerk 1–3 s) |
| transfer | σ 0.5 → 1.0, min-jerk 3–7 s, supervised |
| unload | From t ≥ 7 s: lift when the lifted foot's lifecycle state has been **TOUCHING** (which implies s = 0) **continuously for ≥ 0.5 s**. The duration counts from when TOUCHING began, even before 7 s. **Time-out: no lift by 9 s** (7 + 2) → no lift is commanded and E1a-6 fails. The timeline continues from replace-time = 9 s |
| lift | t_L → t_L + 0.4 s. Swing target = anchor + h(t) vertical, h = 5 mm · minjerk. Anchor = the lifecycle target of the lifted foot at t_L: the contact anchor captured on the turf at UNLOADING, which is the profile start the lifecycle requires. **Orientation = the anchor's** (flat, anchor yaw) |
| hover | t_L + 0.4 → t_L + 0.9 s at anchor + 5 mm |
| replace | t_L + 0.9 → t_L + 1.3 s, back to the anchor (min-jerk). **Replace time t_R = t_L + 1.3 s** |
| held until TOUCHDOWN (grace 0.3 s), then cleared | From t_R the swing target stays at the anchor. It is cleared (`setSwingTarget(null)`, the contact-anchor logic) at the first tick at which the lifted foot is in a **contact state** (TOUCHDOWN, LOAD_ACCEPT, TOUCHING, SUPPORT, UNLOADING), or at **t_R + 0.3 s** if none occurs (the grace). This reading follows the lifecycle's documented hand-back contract ("hand back with setSwingTarget(n, null) once the foot is down, so the target is continuous"; after TOUCHDOWN the re-captured anchor fades in). A swing servo kept engaged after touchdown is the measured failure mode that contract avoids |
| load acceptance | "replace + 0.2 → + 4.2": σ 1.0 → 0.5, min-jerk from t_R + 0.2 to t_A = t_R + 4.2 s. Acceptance is intent-gated by the lifecycle (LOAD_ACCEPT) |
| recover | t_A → t_A + 3 s, quiet |
| pelvis back | t_A + 3 → t_A + 5 s: the drop amplitude returns to 0 (min-jerk 2 s), through the same `pelvisDrop` target. Then 2 s quiet. **End of run: t_A + 7 s** |
| abort | **Active throughout.** After an abort the harness issues no further swing commands (the supervisor clears the swing target and puts the foot down). An abort before the lift ends the protocol: no lift; the timeline continues from the abort time |

**Battery** (prereg §2–3; no perturbations or excessive cases are preregistered for E1a):
- all 8 bodies, left foot lifted;
- the mirrored run, V2-REF with the right foot lifted;
- V2-REF left-lift run repeated (E1a-11).

## 3. Criteria as evaluated (prereg §3 + v2 §1; thresholds verbatim)

Definitions:
- n = the lifted foot, m = the stance foot.
- **Hover window** = ticks with t ∈ [t_L + 0.4, t_L + 0.9).
- **Lift window** = [t_L, t_L + 1.3).
- "Sensed load" = the controller's sensed foot load (`ctrl.sense.Fz`).
- "Turf-touching pieces" = the probe's touching count (separation ≤ 0.5 mm).
- "Vertical contact load" = the probe's vertical contact force per foot (JyN).
- **Start references for E1a-14** = the state at t = 1.0 s: the end of settle, before any command.

| # | evaluated as |
|---|---|
| E1a-1 | Over hover ticks, the fraction with touching pieces of n = 0 **and** sensed load of n < 0.05 N must be ≥ 80 % |
| E1a-2 | Every hover tick: s_n = 0, support count = 1, and stance vertical load / total ≥ 99.9 % (when total > 0) |
| E1a-3 | Hover ticks, foot origin vs the commanded swing target: error max ≤ 3 mm and RMS ≤ 2 mm. Drift: foot origin at the last hover tick vs the first ≤ 2 mm (3-D). Foot tilt (up axis vs vertical, the G3 definition) ≤ 1.5° every tick. Yaw error vs the target ≤ 2°. Minimum sole clearance (the lowest point of the boot's collision hulls above the turf plane y = 0) ≥ 3 mm on ≥ 80 % of hover ticks |
| E1a-4 | Whole run, from the first tick (the G2 / G3 convention): stance foot origin horizontal displacement ≤ 1.0 mm and yaw change ≤ 0.5° |
| E1a-5 | Hover ticks: ξ inside the stance foot's region with margin ≥ 1 cm. Lift window: COM horizontal distance from its value at t_L ≤ 2 cm. No abort in the run |
| E1a-6 | Lifted foot's per-tick state sequence: exactly one LIFTOFF→AIRBORNE and one entry into TOUCHDOWN; no TOUCHDOWN→AIRBORNE. Either foot: no state re-entered within 60 ms (the boundary-probe chatter definition: a transition back to the state left less than 60 ms earlier). Unload reached before the time-out |
| E1a-7 | For t ≥ 0.5 s (the G3 initial-contact-settle convention, `SEAM_T0`): the per-tick change of every applied actuator torque (from the actuator impulses) ≤ 10 N·m, except ≤ 25 N·m at a contact-onset tick (either foot's touching pieces 0 → > 0) and the tick after it. The per-tick change of every commanded τ0 ≤ 30 N·m |
| E1a-8 | Every tick: energy-ledger closure increment ΔE − (ΔW_act + ΔW_ext − Δdamping) ≤ +0.05 J. Σ positive increments ≤ 0.5 J. Authority writes 0. External impulse exactly 0 |
| E1a-9 | Over-capacity events (the actuation ledger) 0 on every axis. Per axis, saturated hover ticks ≤ 5 % |
| E1a-10 | Every tick, every joint's smallest margin to its anatomical hard limit ≥ 0 (knee axial: the `v2k` calibrated bound at the current flexion, v2 §1). Swing leg's IK-solved coordinates ≥ −2° from their soft limits. Lifted leg's knee flexion ≥ 0° every tick |
| E1a-11 | V2-REF left-lift run ×2: the running state hash (bodies + actuators) identical at every 1 s mark and at the end |
| E1a-12 | At the TOUCHDOWN tick (entered from AIRBORNE): foot origin ≤ 5 mm horizontally, and yaw ≤ 2°, from the original foothold (the contact anchor). Impact peak = max vertical contact load of n over [t_TD, t_TD + 0.1 s] ≤ 25 % BW. No bounce (TOUCHDOWN→AIRBORNE). The end-of-run displacement is reported |
| E1a-13 | Lifted foot enters LOAD_ACCEPT exactly once in the run. s_n non-decreasing from that entry until it reaches 1. From t_A + 1 s to the end, on ticks with total vertical load > 0.5 BW: \|load share of n − requested share of n\| ≤ 0.10 |
| E1a-14 | Last tick: both feet SUPPORT. \|ξ − ξ_ref\| ≤ 1.5 cm. Pelvis yaw within 1° of its t = 1 s value. Each ankle ab/adduction within 2° of its t = 1 s value. Each knee's (θ − θ0(φ)) within 2° of its t = 1 s value |
| E1a-15 | All 8 bodies and the mirrored run pass E1a-1 … 14, 16, 17 (E1a-11 on the V2-REF pair) |
| E1a-16 | Every tick: both knees' flexion within 0–40°. A run outside the envelope is reported as **outside the certified envelope**, not as a pass |
| E1a-17 | Every tick: both knees' \|θ − θ0(φ)\| ≤ 3°, except ≤ 6° within 0.2 s after a contact onset |

**Reported, not gating** (prereg §3):
- hover servo errors over time;
- the contact-gap (clearance) profile;
- twist time series;
- stance-ankle ab/adduction excursion;
- pelvis yaw;
- lifecycle transitions;
- per-tick instrumentation (`e1a_run.mjs` header);
- playback poses every 2nd tick.

## 4. Harness check before the official run (declared)

**One harness test with lift = 0 mm on V2-REF.** It is not an E1a run: the swing target equals the anchor, so nothing is lifted. It checks that the protocol phases advance and the instrumentation reads sensibly:
- a loaded foot's sole clearance ≈ 0;
- hashes and energy terms present.

The evaluator refuses that file. Any harness fix it prompts is recorded.
