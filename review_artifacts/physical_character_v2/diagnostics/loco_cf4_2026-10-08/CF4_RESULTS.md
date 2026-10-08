# COUNTERFACTUAL DIAGNOSTIC CF-4 — momentum-carrying gait: every swing now starts with inherited momentum (forward COM 23–46 mm/s, 11–22× CF-3). 20 / 20 bounded, periodic physical steps on all four bodies at two cadences (2.75 and 1.73 s/step), and 60 / 60 in the extended check. No failure, no C. The unchanged E2 swing still brakes that momentum before each touchdown. Verdict GREEN (scoped)

> **Counterfactual diagnostic only** (the user's approval, 8 Oct 2026: `../../sources/2026-10-08_user_approval_cf4_momentum_carrying_gait.md`).
> - CF-4 is not adopted V2 functionality. It does not qualify walking, does not resume or alter TD2C / E2, and changes no criterion or verdict.
> - It lives only in the diagnostic harness: `tools/loco_probe.mjs --cf=4`, default off.
> - No controller, planner, lifecycle, touchdown, body, contact, actuator, capacity, swing-servo, physics or production code changed.
> - With `--cf=0..3` the harness reproduces every earlier study's end hash (66 / 66: probe 16, CF-1 16, CF-2 16, CF-3 18), and the CF-3 output records field for field (18 / 18, excluding wall time and the planner's millisecond timer).
> - Previous study: `../loco_cf3_2026-10-08/CF3_RESULTS.md`.

**Runs:** 29 at 240 Hz, all left-first.
- Schedule ladder: V2-REF, Tst 3 / 2.5 / 2 s, 4 steps each.
- Staged at the selected schedule (Tst 2 s): 4 bodies × 2 / 4 / 6 / 10 / 20 steps.
- The optional moderately faster regime (Tst 1 s): 4 bodies × 20 steps.
- Extended check (Tst 1 s, 60 steps; V2-REF and V2-198-92), to settle the user's ankle-inversion saturation question; see §5.
- Every run was executed twice with identical end hashes (29 / 29). The first 27 were re-executed through `scripts/run_cf4.sh`.

**Files:**
- Tables: `CF4_TABLES.md` (`tools/loco_probe_report.mjs`).
- Per-step trend plots: `CF4_TRENDS_Tst2.png`, `CF4_TRENDS_Tst1.png`, `CF4_TRENDS_Tst1_60steps.png` (`scripts/plot_cf4_trends.py`).
- Evidence: `evidence/{ladder, staged, faster, extended}/`.
- Reproduction: `scripts/run_cf4.sh`.

## 1. CF-4 (the two approved mechanisms, nothing else)

CF-3 showed why every swing started from rest:
- the isolated-step DS plan returns ξ to the midpoint and stops it;
- the trailing foot is released only when p*'s projection on the centroid line gives it < 1 % BW, which waits for the DCM tracking error to decay (time constant ≈ 0.9 s).

**1. Direct stance-to-stance transfer.** At the accepted touchdown, the request replaces the sequencer's DS-to-midpoint plan. Step 1's transfer from quiet stance uses the same rule. The sequencer itself still runs its lifecycle bookkeeping: hand-back, LANDED → DS.
- **DCM path:** the existing layer's Hermite (`ctrl/v2_dcm.js hermite`), from the measured DCM and its LIPM rate ω(ξ − p) (no CoP step), to the next stance's capture state.
- **End state:** ξ_E = c + δ·ŵ, ξ̇_E = v·ŵ.
  - c = the new stance foot's region centroid; ŵ = CF-3's walking direction.
  - v = step length S / nominal step period (Tst + planning liftoff delay + swing T); δ = v / ω.
  - So the plan's VRP arrives exactly at c while the DCM still leads it.
- **Duration:** over Tst, the schedule.
- **Load:** λ follows the plan's VRP (`lamFromVrp`, floor 0): the trailing foot's planned share reaches 0 as the plan arrives.
- **Supervisor:** its stance-only abort is held while the plan moves (CF-1's and the sequencer's own precedent). A shadow of the same test, on the supervisor's own stance choice, never fired in any CF-4 run.

**2. Planned trailing-foot unloading.** From the plan's end until the lifecycle releases the trailing foot, the request places the commanded CoP at the new stance centroid: ξ_ref = measured ξ, ξ̇_ref = ω(ξ − c), so p* = c (one tick of measurement lag).
- This is the single-support DCM law with its VRP at c, re-initialised from the measured state every tick. It does not wait for the tracking error to decay.
- The trailing foot is released only by the unchanged lifecycle: measured Fz < 1 % BW and request < 5 %, its 12.5 ms debounce and 0.1 s ramp.
- The step is commanded at that measured release (TOUCHING). The isolated-step protocol's 0.5 s quiet dwell is not used.
- Nothing is faked: liftoff, contact and acceptance stay measured.

**Gait pattern (commanded nominal only, as CF-3):**
- Step-through: the swing foot's target is S = 0.06 m ahead of the stance foot along ŵ, at CF-3's ± W0 / 2 (each body's own initial width).
- The steady swing displacement 2S = 0.12 m lies one 1-cm grid cell inside the existing forward corridor (dx 0.07 – 0.13 m).
- The planner still picks its own nearest certified node: dx 0.07 at step 1, then 0.12 – 0.13; dy 0.01 / 0.02.

**Unchanged:**
- the E2 step: decision, B1 lift, swing, swing-phase DCM plan, touchdown, 60 % gate, acceptance, hand-back;
- the body, actuators, contacts, lifecycle, CF-2's coupled ankle law and CF-3's walking frame;
- the final step of each run keeps the sequencer's own DS plan, so the run ends at rest.

The toe-out drift was not corrected.

**Not tuned:** S, v and δ are the same for every body. The only per-body inputs are each body's own geometry (W0, centroids, ω).

## 2. Is this a different regime? Yes (the user's gate)

**Criterion.** Forward COM speed at every inherited swing decision (steps ≥ 2) ≥ 21 mm/s, i.e. ≥ 10× CF-3's maximum (2.1 mm/s).
- The threshold was fixed when the ladder was run.
- The swing decision is the same tick CF-3 reported.

**Ladder (V2-REF):**

| Tst s | step period s | COM forward at decision (inherited) mm/s | criterion |
|---|---|---|---|
| 3 | 3.76 | 16.8 | no |
| 2.5 | 3.25 | 19.7 – 19.8 | no |
| **2** | **2.75** | **24.7 – 25.0** | **yes: the slowest qualifying schedule** |

**Swing initiation, CF-3 against CF-4** (inherited steps 2 – 19 on the four bodies; walking frame; "inward" = toward the swing foot):

| quantity | CF-3 (V2-REF, quasi-static → 2 s nominal) | CF-4 Tst 2 s | CF-4 Tst 1 s |
|---|---|---|---|
| COM velocity, forward, at decision | — (‖v‖ 1.5 – 2.0 mm/s) | **23.4 – 26.3 mm/s** | **43.1 – 46.3 mm/s** |
| ‖v_COM‖ at decision | 1.5 – 2.0 mm/s | 29.7 – 40.2 mm/s | 73.4 – 97.5 mm/s |
| COM forward at measured liftoff | — | 19.2 – 23.4 mm/s | 38.0 – 42.2 mm/s |
| DCM rel. stance centroid, forward / lateral (inward) | — | −0.1 – 3.9 / 13.4 – 22.2 mm | 2.5 – 5.7 / 16.0 – 23.9 mm |
| DCM rate ω(ξ − p), forward / lateral (inward) | — | 1.6 – 12.5 / 41 – 66 mm/s | 8.8 – 19.7 / 49 – 75 mm/s |
| pelvis velocity, forward | — | 29.7 – 33.6 mm/s | 47.0 – 53.0 mm/s |
| trailing-foot load / new-stance load | released, TOUCHING | 0.05 – 0.10 / 99.6 – 99.8 % BW | 0.01 – 0.07 / 99.3 – 99.7 % BW |
| time since the previous touchdown | 4.06 – 11.15 s | 2.12 s | 1.12 s |
| transfer end → trailing foot released | 1 – 2 s after settling | 0.117 s (debounce + ramp) | 0.117 s |
| touchdown-to-touchdown | 4.73 – 11.83 s | 2.74 – 2.75 s | 1.72 – 1.73 s |

**What the swing-initiation state shows** (it qualifies the result):
1. **The forward momentum is real but sub-capture.**
   - The COM moves at 23 – 46 mm/s, yet the forward DCM lead over the stance centroid is only 0 – 6 mm. The DS tracking lag (below) consumes most of the planned lead (6.6 – 7.2 mm at Tst 2 s, 10.3 – 11.3 mm at Tst 1 s).
   - In LIPM terms the body would come to rest over the stance foot. No step is needed to catch it forward.
2. **The swing also inherits lateral motion toward the swing side.**
   - The DCM is 13 – 24 mm inward of the stance centroid, moving inward at 41 – 75 mm/s.
   - This is the existing balance law's DS tracking lag (11.5 – 19.8 mm, the maximum during the transfer, with both feet loaded), released without waiting.
   - With both feet supporting, the existing allocation (the lever rule on the centroid line) can unload the trailing foot only if the CoP projects at or beyond the stance centroid. Releasing before the lag decays therefore necessarily lets this lag diverge inward. This is the physics of "the next step begins before the previous step's errors have disappeared".
3. **The momentum is not carried through touchdown.**
   - The E2 swing-phase DCM plan, unchanged, is a stop-step: ξ → (r_s, 0) at the planned touchdown, where r_s = the reference at the command.
   - Forward COM speed peaks in DS (≈ 38 mm/s at Tst 2 s, ≈ 62 mm/s at Tst 1 s) and is 24 – 46 mm/s at the swing decision.
   - The swing then brakes it to −6.4 … +1.2 mm/s at touchdown: reversed for ≈ 0.38 s at Tst 2 s, ≈ 0.1 s at Tst 1 s.

## 3. Results

| Body | inherited COM speed at swing (forward; ‖v‖) | 2 steps | 4 | 6 | 10 | 20 | first failure | A / B / C |
|---|---|---|---|---|---|---|---|---|
| V2-REF, Tst 2 s | 24.6 – 25.4; 34.6 – 36.0 mm/s | ✓ | ✓ | ✓ | ✓ | ✓ 20 / 20 | none | — (no failure) |
| V2-165-62 (light / short), Tst 2 s | 23.4 – 24.5; 29.7 – 31.5 | ✓ | ✓ | ✓ | ✓ | ✓ 20 / 20 | none | — |
| V2-198-92 (heavy / tall), Tst 2 s | 25.3 – 26.1; 39.0 – 40.2 | ✓ | ✓ | ✓ | ✓ | ✓ 20 / 20 | none | — |
| V2-long-legs, Tst 2 s | 25.5 – 26.3; 38.2 – 39.0 | ✓ | ✓ | ✓ | ✓ | ✓ 20 / 20 | none | — |
| V2-REF, Tst 1 s (faster) | 43.2 – 44.9; 83.3 – 87.6 | ✓ * | ✓ * | ✓ * | ✓ * | ✓ 20 / 20 (60 / 60 extended) | none | — |
| V2-165-62, Tst 1 s | 43.1 – 44.4; 73.4 – 76.3 | ✓ * | ✓ * | ✓ * | ✓ * | ✓ 20 / 20 | none | — |
| V2-198-92, Tst 1 s | 43.1 – 45.8; 91.1 – 97.5 | ✓ * | ✓ * | ✓ * | ✓ * | ✓ 20 / 20 (60 / 60 extended) | none | — |
| V2-long-legs, Tst 1 s | 43.7 – 46.3; 88.9 – 93.1 | ✓ * | ✓ * | ✓ * | ✓ * | ✓ 20 / 20 | none | — |

\* At Tst 1 s the 2 / 4 / 6 / 10 milestones are prefixes of the 20-step run (deterministic). At Tst 2 s each count was run separately; every one completed.

- **Steps:** 160 + 80 extended = 240 consecutive genuine physical steps, every one complete.
  - Lifecycle: release (TOUCHING) → measured liftoff → swing-window clearance > 0, no early contact → measured contact accepted → landed SUPPORT.
- **No events:** no early or late contact, no failed touchdown, no swing re-plan, no swing NO_CERTIFIED, no supervisor abort, no shadow abort, no slip event, no fall.
- **Bounded:** the energy residual and every other recorded quantity (§4).

## 4. Per-step trends (bounded / periodic, or diverging?)

Plots: `CF4_TRENDS_Tst2.png`, `CF4_TRENDS_Tst1.png` (four bodies, 20 steps) and `CF4_TRENDS_Tst1_60steps.png` (extended check). Each shows 16 panels of the principal quantities per step.

**Tst = 2 s** — inherited steps 2–19 (the final step 20 is the stop step): range, and least-squares slope per step

| quantity | V2-REF | V2-165-62 | V2-198-92 | V2-long-legs |
|---|---|---|---|---|
| COM fwd at decision mm/s | 24.6 – 25.4 (+0.006) | 23.4 – 24.5 (+0.017) | 25.3 – 26.1 (-0.004) | 25.5 – 26.3 (-0.010) |
| DCM lat. offset (inward) at decision mm | 16.0 – 20.6 (-0.051) | 14.9 – 20.1 (-0.103) | 16.9 – 22.2 (+0.022) | 13.4 – 18.0 (+0.026) |
| DCM tracking error max (transfer) mm | 13.3 – 16.5 (-0.040) | 12.4 – 16.0 (-0.076) | 14.1 – 17.9 (+0.013) | 11.5 – 14.7 (+0.017) |
| DCM margin in single support mm | 14.4 – 20.3 (+0.059) | 10.8 – 17.6 (+0.130) | 16.2 – 23.1 (-0.039) | 17.8 – 23.9 (-0.049) |
| touchdown vertical speed mm/s | 36 – 38 (-0.069) | 37 – 39 (-0.036) | 34 – 37 (-0.107) | 30 – 51 (+0.239) |
| foothold error vs plan mm | 1.65 – 1.73 (+0.004) | 1.65 – 1.72 (+0.003) | 1.73 – 1.81 (+0.004) | 2.12 – 2.28 (+0.006) |
| landing lateral error vs walking frame mm | -4.7 – 5.6 (-0.011) | -5.7 – 5.0 (-0.146) | -4.6 – 5.1 (-0.100) | -4.4 – 5.4 (-0.095) |
| stance slip mm | 0.38 – 0.46 (+0.001) | 0.31 – 0.45 (-0.000) | 0.44 – 0.49 (+0.001) | 0.33 – 0.40 (+0.002) |
| ankle-inversion saturation axis-ticks / cycle | 1 – 1 (+0.000) | 1 – 2 (+0.006) | 1 – 1 (+0.000) | 1 – 1 (+0.000) |
| all saturation axis-ticks / cycle | 1 – 3 (+0.082) | 1 – 3 (+0.017) | 2 – 4 (+0.037) | 1 – 3 (+0.003) |
| leg hard-limit margin min ° | 10.64 – 11.11 (-0.020) | 11.14 – 11.50 (-0.009) | 10.39 – 10.97 (-0.024) | 10.49 – 11.02 (-0.020) |
| Δτ0 max N·m | 15.4 – 18.7 (-0.043) | 11.2 – 14.1 (-0.061) | 19.5 – 23.9 (+0.011) | 14.9 – 16.8 (+0.013) |
| energy-closure residual + per cycle J | 0.049 – 0.057 (+0.0001) | 0.038 – 0.043 (+0.0000) | 0.059 – 0.070 (+0.0002) | 0.050 – 0.059 (+0.0002) |
| pelvis yaw drift ° | -0.10 – 0.04 (-0.002) | -0.23 – 0.12 (-0.004) | -0.21 – 0.10 (-0.002) | -0.10 – 0.09 (-0.003) |
| foot yaw drift L ° | -1.35 – -0.19 (-0.066) | -1.29 – -0.19 (-0.064) | -1.29 – -0.19 (-0.063) | -1.20 – -0.17 (-0.059) |
| stance width (walking frame) mm | 165.7 – 180.1 (-0.125) | 147.7 – 164.4 (-0.298) | 181.0 – 197.2 (+0.105) | 165.0 – 181.7 (+0.135) |
| step period s | 2.746 – 2.750 (+0.0000) | 2.750 – 2.754 (+0.0001) | 2.746 – 2.750 (+0.0000) | 2.742 – 2.750 (-0.0001) |

**Tst = 1 s** — inherited steps 2–19 (the final step 20 is the stop step): range, and least-squares slope per step

| quantity | V2-REF | V2-165-62 | V2-198-92 | V2-long-legs |
|---|---|---|---|---|
| COM fwd at decision mm/s | 43.2 – 44.9 (+0.005) | 43.1 – 44.4 (+0.008) | 43.1 – 45.8 (-0.023) | 43.7 – 46.3 (-0.024) |
| DCM lat. offset (inward) at decision mm | 18.6 – 22.5 (-0.052) | 17.2 – 23.2 (-0.061) | 20.3 – 23.9 (-0.019) | 16.0 – 20.3 (-0.027) |
| DCM tracking error max (transfer) mm | 15.7 – 18.4 (-0.020) | 14.9 – 18.8 (-0.032) | 16.7 – 19.8 (-0.007) | 14.0 – 16.7 (-0.011) |
| DCM margin in single support mm | 13.1 – 18.2 (+0.054) | 7.7 – 15.4 (+0.074) | 15.5 – 20.1 (+0.007) | 16.0 – 21.4 (+0.019) |
| touchdown vertical speed mm/s | 33 – 35 (-0.025) | 34 – 37 (-0.005) | 32 – 49 (+0.657) | 46 – 50 (-0.090) |
| foothold error vs plan mm | 1.71 – 1.76 (+0.003) | 1.69 – 1.75 (+0.002) | 1.75 – 1.99 (+0.010) | 2.25 – 2.38 (+0.008) |
| landing lateral error vs walking frame mm | -4.2 – 5.0 (-0.095) | -5.7 – 4.5 (-0.097) | -5.1 – 4.8 (-0.280) | -4.4 – 4.7 (-0.078) |
| stance slip mm | 0.48 – 0.63 (+0.005) | 0.56 – 0.65 (+0.002) | 0.55 – 0.72 (-0.002) | 0.52 – 0.80 (+0.014) |
| ankle-inversion saturation axis-ticks / cycle | 12 – 16 (+0.086) | 2 – 8 (+0.117) | 9 – 22 (+0.118) | 15 – 19 (+0.107) |
| all saturation axis-ticks / cycle | 14 – 18 (+0.086) | 4 – 9 (+0.109) | 11 – 24 (+0.118) | 17 – 21 (+0.101) |
| leg hard-limit margin min ° | 10.14 – 10.35 (+0.003) | 10.96 – 11.36 (+0.008) | 9.08 – 9.90 (-0.021) | 10.01 – 10.25 (+0.006) |
| Δτ0 max N·m | 19.0 – 21.7 (-0.016) | 14.0 – 17.0 (-0.021) | 24.2 – 27.8 (-0.009) | 17.5 – 20.3 (-0.013) |
| energy-closure residual + per cycle J | 0.058 – 0.067 (-0.0002) | 0.044 – 0.050 (-0.0001) | 0.071 – 0.086 (-0.0001) | 0.058 – 0.065 (-0.0001) |
| pelvis yaw drift ° | -0.90 – 0.49 (-0.005) | -0.53 – 0.27 (-0.001) | -1.18 – 0.79 (-0.008) | -0.81 – 0.55 (-0.004) |
| foot yaw drift L ° | -1.12 – -0.24 (-0.050) | -0.94 – -0.26 (-0.040) | -1.89 – -0.24 (-0.087) | -1.50 – -0.21 (-0.075) |
| stance width (walking frame) mm | 165.9 – 178.1 (-0.050) | 148.6 – 166.7 (-0.125) | 182.7 – 195.3 (+0.132) | 166.6 – 181.7 (+0.013) |
| step period s | 1.725 – 1.729 (+0.0001) | 1.729 – 1.733 (-0.0000) | 1.721 – 1.729 (-0.0002) | 1.725 – 1.725 (+0.0000) |

**Extended check (Tst 1 s, 60 steps), 12-step block means of inherited steps 2 – 49:**

| quantity | V2-REF | V2-198-92 |
|---|---|---|
| ankle-inversion saturation, axis-ticks / cycle | 14.0 → 14.4 → 15.3 → 15.6 (range 12 – 18) | 18.2 → 18.9 → 19.6 → 19.4 (range 9 – 22) |
| DCM margin in single support, mm | 15.6 → 15.0 → 15.1 → 16.8 | 17.3 → 18.3 → 19.8 → 20.4 |
| DCM lateral offset at decision, mm | 20.6 → 20.9 → 20.7 → 19.4 | 22.5 → 21.5 → 20.2 → 19.6 |
| DCM tracking error max (transfer), mm | 17.1 → 17.4 → 17.3 → 16.2 | 18.4 → 17.8 → 16.9 → 16.3 |
| foot yaw drift L / R, ° | −0.5 / 0.1 → −1.1 / 0.7 → −1.8 / 1.4 → −2.3 / 1.8 (converging: −2.6 / 2.1 at step 60) | −0.8 / 0.3 → −1.9 / 1.3 → −2.8 / 2.2 → −3.1 / 2.5 (−3.3 / 2.6 at step 60) |
| transfer-phase foot displacement, mm | 0.54 → 0.62 → 0.69 → 0.76 (plateau 0.8 from step ≈ 45) | 0.60 → 0.65 → 0.83 → 0.99 (plateau 1.0 from step ≈ 43) |
| landing lateral error vs walking frame, mean mm | 1.1 → −0.5 → −0.5 → −1.4 | 1.1 → −0.9 → −3.2 → −2.5 |
| leg hard-limit margin min, ° | 10.3 → 10.3 → 10.3 → 10.5 | 9.3 → 9.2 → 9.3 → 9.6 |
| energy-closure residual per cycle, J | 0.06 (flat) | 0.08 (flat) |

**Reading.** Bounded and quasi-periodic. Every per-step slope is small against its own step-to-step range.

**The quasi-periodic oscillation:**
- It has a period of about 6 steps and appears in the stance width (± 8 mm), lateral DCM offset, single-support margin and transfer error.
- It is the planner's 1-cm lateral grid: the chosen dy alternates 0.01 / 0.02 as each landing's ± 5.7 mm residual against its walking-frame target accumulates and the nearest node switches.
- The walking frame keeps the width within W0 ± 11 mm. CF-2's monotonic 12.4 mm/step narrowing is gone.

**The one monotonic quantity, the toe-out creep:**
- It runs at ~0.04 – 0.09° per step per foot, as CF-3 recorded, and converges to 2 – 3° by step 50 – 60.
- The slow changes that co-vary with it level off with it: the transfer-phase foot displacement (to ≤ 1.0 mm) and a ≈ 3 mm lateral landing bias.

## 5. Ankle-inversion saturation (the user's specific question)

- **Where:** ankle_L.z / ankle_R.z carry 85 – 95 % of all saturation. Almost all of it is in the step phase: the stance ankle stopping the inherited inward lateral DCM motion (§2, point 2).
- **Tst 2 s:** 1 – 2 axis-ticks per cycle (one tick = 4.2 ms on one axis), flat over 20 steps on every body.
- **Tst 1 s:**
  - 2 – 8 (light / short), 9 – 22 (heavy / tall), 12 – 16 (REF), 15 – 19 (long-legs) per cycle.
  - The 20-step slopes were small but positive on all four bodies (+0.09 – +0.12 per step), which is why the extended check was run.
  - Over 60 steps the per-step range is unchanged. REF's slow rise flattens (+0.025 / step over steps 20 – 59). Heavy / tall plateaus (+0.005 / step).
- **Answer: bounded per step. It does not grow toward failure over 60 steps.**
- **It scales with cadence, not with step count:**
  - CF-4 Tst 2 s → Tst 1 s: 1 – 4 → 4 – 24 per cycle.
  - CF-3's 0.6 s transfers at 2 s nominal: 20 – 38 per step.
  - It is the visible first capacity limit as cadence rises, consistent with CF-3. Not tested beyond Tst 1 s, as instructed.

## 6. Failure analysis (the user's list)

| check | result |
|---|---|
| growing COM / DCM error | Transfer ξ error max 11.5 – 19.8 mm, slopes ≤ 0.08 mm/step in magnitude. Over 60 steps the block means are flat or falling. |
| loss of capture | DCM margin to the stance region in single support ≥ 7.7 mm (light / short, Tst 1 s; 10.8 mm at Tst 2 s), no trend. p* never outside the support. Every decision certified; no NO_CERTIFIED anywhere. |
| accumulating pelvis drift | Pelvis yaw within ± 1.2°, oscillating, slope ≈ 0. Pelvis lateral offset from the feet midpoint flat. Pelvis tilt 5.3 – 6.9°, flat. |
| growing foothold error | Against the plan: 1.6 – 2.4 mm, flat. Against the walking frame: lateral ± 5.7 mm (20 steps), − 7.6 … + 5.5 mm (60 steps, mean bias ≈ − 3 mm with the toe-out); forward − 2.3 … + 1.9 mm. |
| increasing slip | Step-phase stance slip ≤ 0.03 mm. Transfer-phase foot displacement 0.3 – 0.8 mm (20 steps), plateauing at 0.8 / 1.0 mm by step ≈ 45 (60 steps). The 20 mm relocation criterion was never approached. |
| progressively harder touchdown | Vertical touchdown speed 30 – 51 mm/s: bimodal with the contact tick (φ 0.910 vs 0.917), no trend. |
| saturation growing step to step | No (§5). |
| joint-limit convergence | Leg hard-limit margin ≥ 9.1°, flat or rising. |
| torque discontinuities | Max Δτ0 per step 11 – 28 N·m, flat (same order as CF-3). |
| positive / unexplained energy growth | Energy-closure residual 0.038 – 0.086 J per cycle, flat; no accumulation. |
| contact instability | None: no early or late contact, no bounce, no failed touchdown, no swing re-plan. The trailing foot is released 0.117 s after the transfer's end every time. |
| eventual unavoidable fall | None in 240 steps. |

**Bounded periodic gait, not a slowly diverging one.**

## 7. Classification

**No failure occurred, so there is no first-failure class.** The limitations exposed are classed as they would be if they became failures.

**A — absent gait-planning functions:**
1. **No walking swing-phase DCM plan.** The E2 swing is a stop-step (ξ → (r_s, 0) at the planned touchdown), so the momentum is braked within each swing and not carried through touchdown. A plan in which the DCM keeps moving toward the next foothold during single support, caught by the next step, does not exist.
2. **Step length capped by the corridor.** The planner's commanded forward corridor (dx ≤ 0.13 m from the anchor) caps step length at ≈ 0.065 m: mean progression ≤ 0.034 m/s at Tst 1 s.
3. **No heading regulation.** The toe-out creep (converging at 2 – 3°) and its correlates (≈ 3 mm lateral landing bias, ≤ 1 mm foot displacement) follow from this; CF-3 recorded it.

**B — an existing mechanism at a correctable limitation:**
- The existing balance law's DS DCM tracking lag (11.5 – 19.8 mm at kξ = 1/3, both feet loaded) leaves every swing an inward-moving lateral DCM. The stance ankle stops it, with inversion saturation that scales with cadence.
- It is bounded per step at both schedules.
- It is correctable by DS tracking designed for walking, or by letting a walking swing plan's next foothold catch the lateral motion.
- The release mechanism is not the limitation: planned unloading released every trailing foot in 0.117 s.

**C — none.** No quantity diverged, energy stayed closed and capture margins held, on four bodies, at two cadences, over horizons up to 60 steps.

## 8. Conclusion: GREEN (scoped)

**"Momentum-carrying repeated locomotion is demonstrated with bounded physical state; V2 is a credible basis for production walking"**, in the regime this test reached:
- successive swings beginning with inherited forward momentum (11 – 22× CF-3) and inherited lateral DCM motion;
- 1.73 – 2.75 s per step;
- 20 steps on all four bodies, 60 steps on two.

**Why GREEN.** The approved question was architectural: does V2 stay physically bounded, or become unstable, when the next swing begins while the body still carries momentum from the previous step?
- The answer is bounded and periodic everywhere it was tested.
- Nothing found calls the body, actuators, contacts, balance law or lifecycle into question.
- What remains are commanding-layer functions that production walking needs anyway (A), and one correctable tracking limitation (B).

**Scope, stated so it is not over-read.** This test did not reach:
- momentum carried through touchdown: the unchanged E2 stop-step swing brakes it (COM forward − 6.4 … + 1.2 mm/s at touchdown);
- human-like speed: step length 0.06 m, mean progression 0.022 – 0.034 m/s;
- cadence beyond Tst 1 s, where ankle-inversion saturation is the visible first limit;
- running or flight.

If "continuous gait" is read strictly as momentum carried through touchdown, it was not demonstrated, and on that reading this result is YELLOW.

**What would turn this toward RED (C evidence toward V3):**
- a walking swing-phase plan that carries momentum through touchdown destabilizing the same body and controller; or
- inversion saturation becoming a hard capacity limit at walking cadences.

## 9. The question

> **"Did we finally test the regime in which V1 failed — successive swings beginning with momentum from previous steps — and what happened?"**

**Yes for the defining condition. Partially for the full walking regime.**

**What was tested.** Every one of 240 swings began 1.1 – 2.1 s after the previous touchdown. Each began while:
- the trailing foot had just been released by planned unloading, 0.117 s after the transfer;
- the COM still moved forward at 23 – 46 mm/s (11 – 22× CF-3's ≤ 2.1 mm/s);
- the DCM moved toward the swing side at 41 – 75 mm/s.

**What happened.** V2 stayed physically bounded and periodic:
- no growth in DCM error, capture margin, foothold error, touchdown speed, saturation, joint margins, torque steps or energy;
- no slip event, no contact instability, no fall;
- on four bodies, at two cadences, for 20 steps, and 60 steps on the two bodies checked longest.

**What was not tested.** Each swing still ends as E2's stop step, braking that momentum to about zero by touchdown.
- Successive steps are therefore coupled through each swing's initial state (the condition as posed), not through a touchdown that carries momentum.
- The absolute speeds are small.

**Bottom line.** In the regime as posed, V2 did not show the V1 failure. Walking with momentum carried through touchdown is the next regime. It can be tested only once a walking swing-phase plan exists (A).

## 10. Harness notes

**Code.** `--cf=4` code and its full description sit in the header of `tools/loco_probe.mjs` (default off).
- Step completion for CF-4 is the landed foot's measured SUPPORT (the sequencer's DS phase). The sequencer's DONE needs both feet in SUPPORT, which the next planned release prevents by design.
- The planner certifies its own E2 continuation, DS to the midpoint; the executed continuation is CF-4's transfer. Physics decides. The certificate never limited anything here.

**Regression on the final harness.** 66 / 66 end hashes; the 18 CF-3 records identical field for field.

**Defects found and fixed during this study, before any reported result.** All three are reporting-only: no physics change, and the preview runs' end hashes equal the final ones. All evidence here was produced with the final harness.
1. **A mid-line comment disabled the shadow test.**
   - A `//` comment appended to the shadow-test line swallowed the rest of that line, disabling the shadow bookkeeping for every CF. Hashes were unaffected.
   - It was found by the field-level regression comparison and fixed, and the regression was re-run in full.
   - This is the same defect class as the one recorded earlier for this harness.
2. **The shadow test used the wrong stance foot.**
   - It always tested the new stance foot. A CF-4 transfer starts loaded on the old one, so it falsely reported would-aborts early in the transfer.
   - CF-4 now uses the supervisor's own stance choice, the higher-share foot. CF-1 – 3 are unchanged.
3. **Landing error was missing for CF-4.** The walking-frame landing error was recorded only at the sequencer's DONE. It is now also recorded at the landed SUPPORT for CF-4.

**Correction (8 Oct 2026, during CF-5).** `CF4_TABLES.md` as first committed held a misfiled "CF-3 cadence summary" block for the CF-4 runs.
- Cause: the report tool selected runs by a label substring, and the CF-4 label names CF-3.
- Its "nominal cycle" values are meaningless for CF-4. No result in this document used that block.
- The tool now selects by the label's start, and the tables were regenerated (see `../loco_cf5_2026-10-08/CF5_RESULTS.md` §9).

**Stop.** Nothing was adopted. TD2C / E2 was not resumed. No production walking was implemented, and no running. Stopped for review.
