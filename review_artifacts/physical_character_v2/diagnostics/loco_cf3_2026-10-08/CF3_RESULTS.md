# COUNTERFACTUAL DIAGNOSTIC CF-3 — the walking frame removes the 9-step ceiling (20 consecutive physical steps on all 4 bodies, bounded). The cadence sweep cannot carry momentum into the next swing: the existing release semantics wait for it to vanish (B), and at nominal 1.5 s / step the double-support-to-midpoint plan is refused (A). No C. Verdict GREEN (provisional)

> **Counterfactual diagnostic only** (the user's approval, 8 Oct 2026, saved verbatim in `../../sources/`).
> - CF-1, CF-2 and CF-3 are not adopted. They qualify nothing and alter no E2 / TD2C verdict.
> - They live only in `tools/loco_probe.mjs` (`--cf=3` = CF-1 + CF-2 + CF-3, forward only; default off).
> - No controller, planner, lifecycle, contact, actuator, limit, touchdown, swing-servo, criterion or physics code changed.
> - With the final harness, the three previous studies reproduce bit-identically: probe 16 / 16, CF-1 16 / 16, CF-2 8 + 8 / 16.

**Runs:** 240 Hz, left-first. Earlier studies showed left / right mirror identity throughout.
- Stage 1: 4 bodies × 2 release windows.
- Stage 2: V2-REF at 4 cadence levels; the boundary pair on the other 3 bodies.

That is 18 runs, each about 23 – 76 s of wall time.

**Files:**
- Tables: `CF3_TABLES.md` (per-step accumulation for every step; cadence summary).
- Evidence: `evidence/stage1_relmax3/`, `evidence/stage1/`, `evidence/stage2/`.
- Reproduction: `scripts/run_cf3.sh`, which regenerates all 18 runs bit-identically.

## 1. CF-3: the walking frame (minimum mechanism)

**The cause it removes.** The single-step planner defines "forward" as the stance foot's heading, toed out ~7.1°. Step-to footholds therefore drift inward ~12.4 mm per step: CF-2's 9-step ceiling.

**The frame.** Fixed at t = 1 s from the initial stance:
- direction = the bisector of the two feet's initial headings (not either stance foot);
- origin = the initial feet midpoint;
- nominal stance width W0 = each body's own initial feet separation: REF 0.1745 m, 165-62 0.158, 198-92 0.190, long-legs 0.174 m. No per-body tuning.

**The step target.** The swing foot advances 0.10 m along the walking direction and lands at ±W0 / 2 from the walking line. That target is converted into the planner's stance-foot frame as the commanded nominal. The planner still picks among its own certified corridor nodes, nearest to the nominal on its 1-cm grid. Nothing else is changed.

## 2. Stage 1: quasi-static cadence

**With the harness's original 3 s release window** (`evidence/stage1_relmax3/`):
- V2-long-legs reaches 20 steps.
- REF, 165-62 and 198-92 stop at step 6: the trailing foot reached TOUCHING 2.6 s after the transfer ended and needed 0.5 s more of dwell.
- **This is not a physical failure.** It is the known residual-load release mechanism (CF-1's recorded lateral finding), surfacing at the natural stance width that CF-3 now holds. CF-2's narrowing stance had masked it.
- The 3 s figure was the harness's own give-up threshold. It is not an E2 criterion.

**With a 10 s window** (`--relMax=10`; nothing physical changes; V2-long-legs is hash-identical): **20 consecutive genuine physical steps on all 4 bodies.** Ranges over the 20 steps:

| per step | 165-62 | 198-92 | REF | long-legs |
|---|---|---|---|---|
| foothold error mm | 1.1 – 2.0 | 1.1 – 2.2 | 1.1 – 2.0 | 1.1 – 2.7 |
| lateral landing error vs. the walking-frame target mm | −4.1 … 5.4 | −3.9 … 5.2 | −5.0 … 5.3 | −5.6 … 5.5 |
| stance width m (W0 ± grid) | 0.150 – 0.163 | 0.182 – 0.197 | 0.166 – 0.181 | 0.166 – 0.179 |
| clearance, φ 0.2 – 0.8 mm | 6.5 – 6.9 | 6.5 – 6.8 | 6.5 – 6.8 | 6.5 – 6.8 |
| slip mm | ≤ 0.04 | ≤ 0.01 | ≤ 0.04 | ≤ 0.04 |
| ξ margin, single support mm | 37.2 – 37.8 | 44.6 – 45.3 | 41.0 – 41.7 | 41.1 – 41.7 |
| ξ error at the decision mm | ≤ 0.41 | ≤ 0.60 | ≤ 0.51 | ≤ 0.51 |
| pelvis roll / pitch max ° | 1.0 – 1.3 / 5.0 – 5.5 | 1.0 – 1.2 / 4.5 – 5.0 | 1.0 – 1.2 / 4.7 – 5.2 | 1.2 – 1.5 / 5.1 – 5.7 |
| leg hard-limit margin ° | 11.6 – 12.7 | 10.7 – 12.0 | 11.1 – 12.3 | 10.9 – 12.2 |
| saturated axis-ticks | 0 – 2 | 1 – 3 | 0 – 3 | 0 – 4 |
| E+ per step J (max per tick ≤ 0.0075) | 0.021 – 0.035 | 0.032 – 0.050 | 0.027 – 0.043 | 0.029 – 0.043 |
| release lag s | 1.24 – 2.56 | 1.32 – 2.71 | 1.26 – 2.65 | 0.97 – 2.27 |
| realized cycle s | 10.9 – 11.7 | 11.1 – 11.9 | 11.0 – 11.8 | 10.7 – 11.5 |
| pelvis progress over 20 steps m | 1.021 | 1.029 | 1.025 | 1.025 |

**Bounded and periodic (left / right alternation, steps 1 – 5 ≈ steps 16 – 20):**
- foothold, clearance, slip, ξ, roll / pitch, hard margins, energy;
- release lag (follows stance width);
- Δτ0. V2-long-legs' odd-step Δτ0 rises 13.3 → 18.2 N·m and converges onto the even-step level, about 19;
- the trailing-ankle DF margin to the body's coupled limit: 3.3 – 4.6° on trailing steps, 10 – 11° on leading steps.

**One slow monotonic quantity: the feet's toe-out.**
- It grows about 0.08° per step: left about −0.10°, right about +0.055° per own step. V2-REF goes from 14.0° to 15.6° total toe-out over 20 steps.
- The pelvis follows the feet (7.1 – 7.5° from the stance foot), so its absolute yaw alternates with a slowly widening envelope (REF: about −0.56 … +0.18° by step 20).
- **Cause:** the planner's candidate pose keeps the swing foot's own anchor yaw (`candPose`: `rot: A.rot`), so no walking-frame foot yaw is ever commanded, and small per-step landing yaw changes accumulate.
- **Classification: A.** The walking frame is incomplete: it corrects position, not yaw. The drift is linear, small, and not compounding.

## 3. Stage 2: the cadence ladder

**Rule (derived, not tuned).** The three settling intervals (transfer 4 s, release dwell 0.5 s, DS plan 4 s = 8.5 s) scale uniformly so that, with the unchanged liftoff and swing (~0.73 s), the nominal cycle is C:
- s = (C − 0.73) / 8.5;
- Ttr = Tds = 4s, rel = 0.5s;
- swing T is unchanged.

Each level runs 20 steps on V2-REF, descending until the first failure; then the boundary pair runs on the other bodies.

| nominal cadence | REF steps | light | heavy | long-legs | realized cycle s | first failure | A / B / C |
|---|---|---|---|---|---|---|---|
| quasi-static (nominal 9.2) | 20 | 20 | 20 | 20 | 10.7 – 11.9 | none | — (release lag B, toe-out creep A; both bounded at 20) |
| 5 s / step | 20 | — | — | — | 7.1 – 8.2 | none | — |
| 3 s / step | 20 | — | — | — | 5.4 – 6.6 | none | — |
| 2 s / step | 20 | 20 | 20 | 20 | 4.3 – 6.0 | none | — |
| 1.5 s / step | 0 | 0 | 0 | 0 | — | step-1 decision refused: the 0.36 s DS plan's VRP leaves the realisable CoP region | **A** |
| 1.0 s / step | not run | | | | | stop rule | |

**Realized cadence floor: B.** No schedule brings the realized cycle below ~4.3 s / step. The floor is the existing release semantics, not the commanded timing.

**Median / max consecutive physical steps, at every level that started:** 20 / 20.

## 4. What the sweep exposes

**1. Momentum is generated and carried within the double support, and stays bounded.**
- At nominal 2 s, the DS plan and the transfer swing the DCM from the old stance foot to the new one in ~1.3 s.
- COM speed peaks at 0.15 m/s, and the transfer starts with up to 0.09 – 0.12 m/s inherited from the landing.
- Over 20 steps on all 4 bodies, every metric stays flat.

**2. But momentum never reaches the next swing: B.**
- The lifecycle releases the trailing foot only once its measured load is < 1 % BW (and its request < 5 %).
- The controller allocates load by p*'s projection on the line between the feet's region centroids. So the trailing load reaches < 1 % only when ξ has converged to within ~1 – 2 mm of the stance centroid.
- At the end of a transfer ξ lags 5 – 11 mm, so the trailing foot carries ~5 % BW and decays as ξ converges. The release lag is 2.2 – 3.9 s, and it grows as the transfer shortens:

  | nominal cadence | release lag |
  |---|---|
  | quasi-static | 1.5 – 2.7 s |
  | 5 s | 2.2 – 3.2 s |
  | 3 s | 2.5 – 3.7 s |
  | 2 s | 2.3 – 3.9 s |

- **At every swing decision, at every level, |v_COM| ≤ 2.1 mm/s.** Each step therefore starts from rest by construction, and the realized cycle floors at ~4.3 – 6.0 s / step.
- This is an existing-mechanism deficiency, not a missing feature. The release and allocation semantics were designed for quasi-static weight transfer. Walking needs the trailing foot unloaded by plan, ahead of the DCM's arrival. (CF-1 recorded the same mechanism on the wide stance.)

**3. Faster double support raises lateral DCM speed and ankle inversion saturation.**
- Saturation rises to 20 – 38 axis-ticks per step at nominal 2 s, against 0 – 4 quasi-static, almost all on ankle_L.z / ankle_R.z (inversion).
- It is constant over 20 steps (first 4 ≈ last 4) and causes no tracking, balance or slip degradation.
- This is the first physical capacity the dynamic regime presses, and it is bounded at this level.

**4. Nominal 1.5 s / step: A.**
- From the same quiet state (|v_COM| 1.8 mm/s, ξ 42 mm inside the stance foot), the step certifies with any DS plan ≥ 0.60 s.
- With the 0.36 s plan it fails exactly one check: "plan VRP outside the realisable region" (the planner's own prediction, evaluated read-only at the refusal; `predDiag` in the evidence).
- Returning the DCM to the double-support midpoint and stopping it there within 0.36 s needs a CoP beyond the feet. The planner correctly refuses a physically infeasible reference.
- The infeasibility belongs to the isolated-step DS structure (stop at the midpoint, then transfer again). A continuous DS transfer to the next stance foot would not stop there.

## 5. Per-step trends around the boundary

Nominal 2 s, mean of steps 1 – 4 → 17 – 20; full per-step rows in `CF3_TABLES.md`.

| metric | 165-62 | 198-92 | REF | long-legs |
|---|---|---|---|---|
| sat axis-ticks | 22 → 21.8 | 25.2 → 25.0 | 24 → 24.2 | 24.2 → 24.5 |
| Δτ0 N·m | 9.1 → 9.5 | 17.5 → 18.2 | 13.1 → 13.5 | 15.2 → 18.2 (converging, as quasi-static) |
| E+ J | 0.030 → 0.032 | 0.047 → 0.052 (one step 0.100) | 0.039 → 0.041 | 0.039 → 0.040 |
| |v_COM| max in step m/s | 0.130 → 0.134 | 0.144 → 0.143 | 0.137 → 0.140 | 0.138 → 0.142 |
| ξ SS margin mm | 37.2 → 37.1 | 44.6 → 44.5 | 41.0 → 41.0 | 41.1 → 41.0 |
| hard margin ° | 12.2 → 12.0 | 11.6 → 11.5 | 11.8 → 11.6 | 11.7 → 11.5 |
| pelvis roll / pitch ° | 1.08 → 1.17 / 5.19 → 5.21 | 1.03 → 1.05 / 4.64 → 4.67 | 1.05 → 1.11 / 4.88 → 4.90 | 1.29 → 1.35 / 5.30 → 5.34 |
| slip mm | 0.02 → 0.02 | 0.02 → 0.02 | 0.02 → 0.02 | 0.02 → 0.02 |
| foothold mm | 1.17 → 1.27 | 1.35 → 1.40 (one step 5.1) | 1.26 → 1.26 | 1.54 → 1.74 |
| clearance mm | 6.64 → 6.62 | 6.65 → 7.37 | 6.65 → 6.63 | 6.63 → 6.62 |
| touchdown → landed SUPPORT s | 0.69 | 0.61 – 0.71 | 0.70 | 0.70 |

**Every metric is bounded and periodic; none compounds.** Nominal 1.5 s produced no physical step (refused at step 1 on all four bodies).

## 6. The changed question

> **"What happens when the next step begins before the errors and momentum from the previous step have disappeared?"**

**The next step never begins before they disappear.** The existing release rule waits for the DCM to settle onto the stance centroid; that is the B finding. So the swing-phase momentum test was not reached by any schedule.

**What was tested and passed:** the next phase, the between-steps transfer, beginning with the previous step's momentum.
- COM up to 0.12 m/s at the transfer start, peaks of 0.15 m/s.
- At the fastest double support the planner accepts, over 20 steps on 4 bodies.
- Bounded and periodic, with only the expected cost (ankle-inversion saturation, constant per step).

## 7. Verdict: is V2 a credible architecture on which to build actual continuous walking? GREEN (provisional)

**Why credible:**
- Four studies, four counterfactual layers peeled. Every blocker has been a commanding-layer or lifecycle construct built for isolated quasi-static stepping (A or B), each explained to the mechanism.
- Nothing has shown accumulating physical error, uncontrolled saturation, energy growth, contact instability or unavoidable balance loss.
- With the layers supplied: 20 consecutive physical steps on reference, light / short, heavy / tall and long-legs bodies, every physical metric bounded and periodic.
- That includes double-support transitions that inherit 0.1 m/s-class COM momentum.

**Why provisional: what is still untested.**
- Swing beginning with carried momentum: true continuous walking, where V1 failed.
- To reach it, two existing-mechanism changes are needed before the cadence stress becomes meaningful:
  - **B:** planned trailing-foot unloading / release, in place of the residual-load < 1 % BW threshold under the p*-projection allocation;
  - **A:** one continuous double-support transfer to the next stance foot, in place of "DS to the midpoint, stop, then transfer".

**Risks to watch when that test runs:**
- ankle-inversion capacity, which saturates first as lateral DCM speed rises;
- the slow toe-out / yaw creep (walking-frame foot yaw).

**What would move toward RED:** with those layers in place, growing DCM / pelvis error, saturation that grows from step to step, energy growth or balance loss as cadence shortens. That would be C, not missing functionality.

**Gait-layer requirements identified, none adopted:**
1. a 2-D between-steps DCM transfer (CF-1);
2. leg-IK / planner soft limits consistent with the body's pose-dependent soft limits (CF-2; a candidate genuine correction);
3. a walking-direction frame with stance width (CF-3) and foot yaw regulation (the toe-out creep);
4. **planned trailing-foot unloading / release (B; the cadence floor)**;
5. **a continuous DS transfer (A; the 1.5 s refusal)**;
6. later: recovery-step touchdown, running mechanisms.

## 8. Harness notes

**Isolation.**
- `--relMax` (the release give-up window) defaults to 3 s, so every earlier study is unchanged. Stage 1 is reported with both 3 s and 10 s.
- **Physical-step flag corrected (measurement only).** The first form read the overall airborne minimum clearance rounded to 0.01 mm. That minimum includes the touchdown tick itself, 0.00 mm at contact, which spuriously failed 2 V2-long-legs steps at nominal 2 s. The flag now requires positive swing-window clearance and no contact before the accepted touchdown. Physics is identical (same end hash), and no step of any earlier study is affected.

**Read-only diagnostics** run only after a refused decision: `predDiag`, the planner's own `trajectory()` under alternative DS durations, and the earlier `pathDiag`. They change no hash.

**Reproduction.** All 18 CF-3 runs regenerate bit-identically with `scripts/run_cf3.sh`, and the three earlier studies with their own scripts.
