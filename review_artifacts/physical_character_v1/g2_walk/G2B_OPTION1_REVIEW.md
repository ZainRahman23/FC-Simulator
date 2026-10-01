# G2b — Option 1 review: landing mechanics and forward foot placement

**Status (2026-10-01, ≈ 12:00): G2b NOT earned. G2c / d / e not started.**

**What I'm stopping on: strong evidence about where the limit is.**
- Two diagnostics remove the main architectural limits. Neither makes walking robust:
  - zero sensing delay;
  - independent per-axis joint torque limits.
- So the body and actuator architecture is **not** what gates forward walking. The **stepping-controller design is**.
- The next step is a controller redesign: your decision.

The full trail is in `NIGHT_LOG.md` §5.

## 1. Touchdown — fixed, and now within the human range

| per touchdown (mean of steps 2+) | before | after |
|---|---|---|
| landing-foot forward velocity at contact | 1.55 m/s (max 2.51) | −0.07 m/s (max 0.07) |
| landing-foot vertical velocity at contact | −0.99 m/s (max −1.67) | −0.41 m/s |
| peak vertical force | 1136 N (≈ 1.5 BW; 1.6 kN peaks) | 578 N |
| peak braking force | −422 N | −18 N |
| pelvis yaw change across the touchdown | 3.7° (spikes to 20–30° in other runs) | 1.3° |
| foothold error | 6–12 cm beyond target | 0.5–2 cm |

**Human reference:**
- Winter 1992: heel contact velocity negligible vertically, ≈ 0.87 m/s horizontally.
- Lockhart: 0.67 ± 0.26 m/s.
- Swing-leg retraction: the foot stops moving forward and may move back in terminal swing.

**What fixed it** (each from a measured cause, all opt-in):
1. **Controlled final descent.** The clearance floor lowers at a constant rate over the last quarter of the swing.
   - Before, the guard faded and the target fell at 1.2 m/s.
2. **1 cm swing-leg retraction.**
3. **Delay-compensated swing.** The swing's inverse kinematics uses the hip and pelvis advanced over the 50 ms feedback delay by their own measured velocities (an internal-model prediction).
   - Measured cause: joints tracked their targets within 1–2°, but the targets were solved from where the hip *was*.
   - Proof: the overshoot vanished with no delay.
4. **Swing velocity feed-forward.** It uses the hip joint's velocity (the pelvis's), not the thigh's centre of mass.
   - That error made damping cancel the hip abduction / rotation drive: feet landed 2–8 cm outward.

**Review cases** (`index.html?suite=G2`):
- `G2b_land_before`, `G2b_land_after`, `G2b_dbg` (the full Option-1 configuration);
- chart `sheets/touchdown_before_after.png`.

## 2. Forward foot placement — the step-to-step map, measured

You asked whether a displacement error decays, persists, oscillates or amplifies.

**Original deadbeat law (always re-target the nominal gait): oscillates and amplifies.**
- Step lengths 6–75 cm.
- Speed 0.32 → 0.53 → 0.80 → 1.06 m/s against a 0.6 target.
- A slow body's next foot was placed behind the stance foot.

**Measured cause:**
- The analytic double-support model predicted 4–9 cm more forward travel per step than the body delivers (the leading foot takes load sooner).
- Closed-loop double support (`fwdDS: track`) makes the next single support start within 1–3 cm of plan.

**Gradual law (`vGain`).** Each step aims at the periodic gait whose step length is a fraction of the way from the *current* one to nominal. With it:
- the speed no longer runs away;
- but the remaining 1–3 cm bias each step makes it slow and stall.

**Sideways: amplifying oscillation.**
- Offsets alternate and grow (widths 23 ↔ 47 cm).
- Measured sideways divergence over single support is 2.2–3.1× vs the model's 3.9×.
- The 0.20 m minimum width (boot) clamps the narrow side.

## 3. Robustness — the honest scoreboard (fall-aware)

Each configuration was scored over 6 starts (first foot L / R × three start times). It counts only rhythmic steps landed **before the fall** (COM below 0.75 m).

**Correction.** An earlier version of this table, and several overnight "20/20" claims, counted steps the rhythm kept executing with the body already on the turf. Those numbers were wrong. Corrected:

| configuration (cumulative) | 0.3 m/s mean upright steps | 0.6 m/s | completed 20 |
|---|---|---|---|
| in-place baseline (the overnight "20/20" — really 3 upright steps in place) | 5.0 | 3.5 | 0/6 |
| + heel-strike landing | 3.8 | 2.3 | 0/6 |
| + controlled descent + retraction | 2.5 | 3.2 | 0/6 |
| + delay-compensated swing | 3.3 | 2.7 | 0/6 |
| + realisable CoP / first-transfer fixes | 3.3 | 2.5 | 0/6 |
| + late foot placement | 3.3 | 4.2 | 0/6 |
| + closed-loop forward double support | 3.2 | 2.7 | 0/6 |
| + full placement gain / gradual speed law / sideways hold | 2.0–3.3 | 2.2–2.3 | 0/6 |

**No configuration keeps the body upright for more than ≈ 5–9 steps.** One configuration was still upright with 9 steps at 8 s. Each fix removed the mechanism it targeted (§1–2), but none adds robustness.

**Diagnostics** (not adopted):

| | mean upright steps | completed 20 |
|---|---|---|
| zero sensing delay | 4.3–5.0 | 0/6 |
| independent per-axis torque limits | 1.0–3.0 | 0/6 |

## 4. What I got wrong along the way (now fixed)

- **Parameter-name collision.** My retraction option was named `retract`, which is also an of_loco reference parameter (≈ 1). Every walking swing without an explicit override got ≈ 1 m of "retraction". Renamed `swingRetract`; the affected comparisons were re-run.
- **Clearance default.** The actual-pitch clearance was default-on and broke the in-place baseline. Now opt-in.
- Both found by bisecting against the WIP commits.
- **Step counting.** My step counters counted steps the rhythm kept executing after a fall (the body on the turf). Every robustness number is now fall-aware.
  - The overnight "20/20 in place" and "19–20 steps at ≈ 0.1 m/s" were such counts: the in-place walking planner keeps the body upright for ≈ 3 steps.
  - The bisect above used the hash and the step counter. The two regressions are real (they change behaviour), but their "20/20" baseline was not a walk.

## 5. Remaining visible defects

- Pelvis yaw ±15–20° in single support.
  - Not the touchdown any more. The swing leg carries ≈ 3 kg·m²/s of vertical angular momentum; the arms ≈ 0.6 even with leg-driven counter-swing.
  - The stance foot's free moment (≈ 10 N·m) does the rest.
- Wide gait: 23–47 cm.
- The trailing foot lifts 0.07–0.18 s after its step starts.
- Arms largely hang. Not polished, per your instruction, while the gait is unstable.

## 6. Recommendation — redesign the stepping controller (your decision)

**The current design:**
- exact phase plans: a rolling-CoP single support and a modelled double support;
- a capture-point step map with ≈ 4–12× sensitivity;
- foothold correction toward a nominal gait.

**What it lacks:** a mechanism that drives ordinary errors to a bounded gait on this body. Fixing model mismatches one at a time moved the failure but never produced stability.

**Candidates:**
1. **State-feedback placement with step timing.** Foot placement and swing duration chosen every tick from the measured COM state against a *measured* step-to-step map, identified from the body itself. Robotics: DCM step-timing adaptation; human data: Wang & Srinivasan 2014 (foot placement predicted from mid-swing COM state).
2. **A SIMBICON-style feedback walker inside the same architecture.**
   - Swing-hip placement from COM displacement and velocity with fixed gains.
   - A torso-stabilising stance hip and a short double support.
   - No ξ plan.
   - Known for robustness in physics simulation; less "planned".
3. **System identification first.** Measure the step-to-step map (sideways / forward, per gait phase) by perturbing single steps from a stable in-place gait. Then design the gain matrix from data.

I'd suggest **3 → 1**: identify the real map, then a placement + timing law designed on it.

**Checkpoints:** local WIP commits only (nothing pushed). All approved gates bit-identical (see the regression in the final message).
