# COUNTERFACTUAL DIAGNOSTIC CF-5 — continuous forward walk: with one walking swing / foothold plan, V2 walks continuously on all four bodies. Forward COM momentum survives every touchdown (24–26 mm/s; never below 16 mm/s in any cycle): 19 consecutive genuine continuous steps each (20 / 20 physical), converged to a periodic cycle within 2–3 steps. No failure, no C. The walk is very slow (0.034 m/s mean)

> **Counterfactual diagnostic only** (the user's approval, 8 Oct 2026: `../../sources/2026-10-08_user_approval_cf5_continuous_walk.md`).
> - CF-5 is not adopted V2 functionality and not production walking. It does not resume or alter TD2C / E2.
> - It lives only in the diagnostic harness: `tools/loco_probe.mjs --cf=5`, default off.
> - No controller, planner, lifecycle, touchdown, body, contact, actuator, capacity, swing-servo, physics or production code changed.
> - The harness reproduces every earlier study: `--cf=0..4`, 95 / 95 end hashes; see §9 for the record comparison.
> - Previous study: `../loco_cf4_2026-10-08/CF4_RESULTS.md`.

**Runs:** the staged test exactly as instructed, 240 Hz, left-first, Tst 1 s (CF-4's moderately faster regime), S 0.06 m:
- V2-REF: 2 → 4 → 6 → 10 → 20 steps;
- then V2-165-62 (light / short), V2-198-92 (heavy / tall) and V2-long-legs at 10 steps;
- all four reached 10, so the three were run at 20 steps.

That is 11 runs, each executed twice with identical end hashes (11 / 11).

**Files:**
- Continuity evaluation: `CF5_CONTINUITY.txt` (`scripts/cf5_continuity.py`).
- Tables: `CF5_TABLES.md`.
- Per-step trend plot: `CF5_TRENDS_20steps.png` (25 panels, four bodies).
- Evidence: `evidence/staged/`.
- Reproduction: `scripts/run_cf5.sh`.

## 1. The one walking extension (and what was not changed)

**The limit removed.** CF-4's E2 swing-phase DCM plan is a stop step: ξ → (r_s, 0) at the planned touchdown. CF-4 measured forward COM −2.6 … +1.2 mm/s at touchdown at this cadence.

**What CF-5 adds:** one walking-specific swing / foothold plan.

**1. Periodic DCM offsets (closed form, LIPM with the VRP at the stance centroid in single support).**
- σ = the DCM's offset from the stance centroid at the start of single support (forward σx; lateral σy toward the next swing foot).
- E = its single-support growth e^{ω·Ts}, where Ts = the lifecycle's release time + the planning liftoff delay + swing T.
- The double-support displacement equals the mean of its boundary DCM rates × Tst, so its Hermite has no over- or undershoot. Then:
  - σx = S / ((E − 1) + Tst·ω·(E + 1)/2);
  - σy = W0 / ((E + 1) + Tst·ω·(E − 1)/2).
- Exponentials are the simulation's own explicit-Euler products; no transcendental function is used.
- V2-REF values: ω 3.12, Ts 0.884 s, E 15.5, σx 1.49 mm, σy 4.47 mm. At touchdown the DCM is planned 36.9 mm behind the new foot and 69.1 mm toward it.

**2. Swing terminal state, ankle first.**
- At the swing decision, the planned touchdown DCM state relative to the stance centroid is ξ_T = c + σx·E·ŵ + σy·E·û.
- It is reached by the existing layer's single-support law ξ̇ = ω(ξ − r), with one constant VRP r = (ξ_T − E_τ·ξ0)/(1 − E_τ), from the measured DCM ξ0.
- r is clamped into the stance region (inset by the planner's copSS margin).
- This replaces the stop-step Hermite in the request only. The sequencer still runs its swing-foot trajectory, its per-tick checks and re-plans, touchdown and acceptance.

**3. Foothold from the current forward motion.**
- The touchdown DCM that the clamped r actually achieves, ξ_T' = r + (ξ0 − r)·E_τ, sets the forward step: S + (ξ_T' − ξ_T)·ŵ.
- The planned DCM-to-new-foot relation is therefore kept by stepping whenever the stance ankle cannot steer the DCM.
- Lateral placement stays CF-3's ± W0 / 2. The planner still chooses its own nearest certified node.

**4. DS end state.** The same offsets give CF-4's unchanged transfer its end state, ξ_E = c + σx·ŵ + σy·û, ξ̇_E = ω(ξ_E − c). CF-4's v/ω lead would be amplified about 12× over a non-braking single support.

**Reused unchanged:**
- CF-3's walking frame and width;
- CF-4's direct transfer form, planned unloading and release semantics;
- CF-2's coupled ankle law;
- the body, actuators, contacts, lifecycle and balance law;
- the E2 decision, B1 lift, swing trajectory, servo, touchdown, 60 % gate and acceptance;
- the planner and its corridor.

**Not used:** no stabilizing force, root motion, teleport, velocity cancellation, capacity, friction or limit change, and no body-specific value. Every per-body input is the body's own geometry (W0, centroids, ω).

**Scope check (the user's hard stop).** A genuine continuous step needed exactly this one extension. No further subsystem was built.
- In all 80 steps the single-support VRP never had to be clamped. The foothold therefore stayed at the planned 0.06 m, and the planner chose 0.0596 – 0.0641 m on its 1-cm grid.
- A first form of item 2 tied ξ_T to the planner's chosen foothold. The 2-step development smoke showed that it follows a lagging DCM backward when the corridor cannot step back. It was replaced by the ankle-first form before any staged run.

## 2. Continuous-walking criteria (fixed after that smoke, before any staged run; in the harness header)

**Definitions:**
- v̄ = the mean forward progression speed: walking-frame landing advance divided by the touchdown interval, over the run.
- C_min = max(10 mm/s, 0.25·v̄). Here C_min = 10 mm/s, since v̄ = 34.2 – 34.4 mm/s.
- The 10 mm/s floor is about 5× CF-3's swing-decision speed and above CF-4's largest touchdown magnitude (6.4 mm/s).

**Step k ≥ 2 is a genuine continuous step iff all of the following hold:**
1. It is physical (the established lifecycle definition).
2. Forward COM ≥ C_min at its swing decision and liftoff (inherited momentum).
3. Forward COM ≥ C_min 0.1 s before touchdown, at touchdown and after load acceptance (the landed foot's measured SUPPORT, 0.28 – 0.38 s after touchdown).
4. Forward COM ≥ C_min at the next decision and next liftoff (the following transfer and swing inherit it).
5. Forward COM > 0 at every tick from its decision to the next decision.

The run is one continuous simulation with nothing reset.

**Exclusions and flags:**
- Step 1 starts from standing, so it is not eligible.
- Touchdown forward COM below C_min on two or more steps → **NOT CONTINUOUS WALKING**.

## 3. Is it continuous? Yes

Forward COM velocity, inherited steps 2 – 20 of the 20-step runs, mm/s (walking frame):

| body | decision | liftoff | 0.1 s before TD | **touchdown** | after load acceptance | next liftoff | **minimum in any cycle** | lateral at TD |
|---|---|---|---|---|---|---|---|---|
| V2-REF | 17.6 – 23.6 | 16.9 – 21.8 | 21.9 – 23.6 | **24.1 – 25.8** | 41.0 – 44.7 | 16.9 – 18.7 | **16.9 – 18.5** | 32 – 38 |
| V2-165-62 | 16.7 – 21.7 | 16.1 – 20.1 | 21.3 – 22.6 | **23.9 – 25.5** | 41.9 – 43.4 | 16.1 – 17.7 | **16.1 – 17.6** | 28 – 34 |
| V2-198-92 | 18.6 – 24.8 | 17.8 – 23.0 | 22.3 – 24.1 | **24.2 – 26.0** | 40.3 – 45.0 | 17.8 – 19.6 | **17.8 – 19.3** | 33 – 40 |
| V2-long-legs | 18.7 – 24.9 | 17.6 – 22.7 | 21.8 – 23.2 | **23.7 – 25.2** | 43.2 – 46.1 | 17.6 – 19.3 | **17.5 – 19.7** | 34 – 40 |
| *CF-4, same cadence* | 43 – 46 | 38 – 42 | — | *−2.6 … +1.2* | — | — | *< 0 (reverses ≈ 0.1 s at TD)* | — |

**The COM never stops.** Forward velocity is lowest around the next liftoff (16 – 20 mm/s, about half of v̄) and rises through single support to touchdown (24 – 26 mm/s). It peaks in double support after load acceptance (40 – 46 mm/s).

**Every cycle meets every criterion.** No touchdown falls below C_min.

**Pelvis.** Forward pelvis velocity at touchdown is 33 – 42 mm/s.

**Capture point at the swing decision:**
- 4.6 – 7.5 mm behind the stance centroid, because CF-4's DS tracking lag persists;
- 18 – 29 mm toward the swing side.

**Capture point at touchdown:**
- 10 – 12 mm ahead of the old stance centroid and 41 – 53 mm toward the new foot (planned 23 / 69 mm: a consistent single-support tracking shortfall);
- 85 – 102 mm inside the hull of both feet. This is the walking capture margin; the DCM deliberately leaves the stance foot by 2 – 6 mm toward the new foot.

## 4. Results

| Body | steps (physical / genuine continuous) | COM speed pre-touchdown (fwd) | at touchdown | next liftoff | bounded / diverging | first blocker | A / B / C |
|---|---|---|---|---|---|---|---|
| V2-REF | 2 / 1, 4 / 3, 6 / 5, 10 / 9, **20 / 19** | 21.9 – 23.6 mm/s | 24.1 – 25.8 mm/s | 16.9 – 18.7 mm/s | bounded, periodic | none in 20 steps | — (limits: A, B; no C) |
| V2-165-62 | 10 / 9, **20 / 19** | 21.3 – 22.6 | 23.9 – 25.5 | 16.1 – 17.7 | bounded, periodic | none | — |
| V2-198-92 | 10 / 9, **20 / 19** | 22.3 – 24.1 | 24.2 – 26.0 | 17.8 – 19.6 | bounded, periodic | none | — |
| V2-long-legs | 10 / 9, **20 / 19** | 21.8 – 23.2 | 23.7 – 25.2 | 17.6 – 19.3 | bounded, periodic | none | — |

"Genuine continuous" counts every eligible step (2 … N), so the count is capped by the protocol's 20-step limit, not by a failure.

**No events:** no early or late contact, no failed touchdown, no swing re-plan, no swing NO_CERTIFIED, no supervisor or shadow abort, no clamped VRP, no contact lost, no slip event, no fall.

## 5. Per-step trends (CF5_TRENDS_20steps.png)

| behaviour | quantities |
|---|---|
| **Converged to a periodic cycle** (within 2 – 3 steps; flat thereafter) | Forward COM at all five instants and the cycle minimum (16 – 20 mm/s; step 2 is the start transient at 20 – 23). COM lateral and pelvis forward at touchdown. DCM at the decision and at touchdown. Walking capture margin at touchdown (85 – 102 mm). Single-support VRP r (−7.4 … −10.2 mm fwd, 13 – 24 mm lat). Transfer / swing DCM error (11 – 17 / 7 – 8 mm). Foothold error against the plan (1.6 – 2.3 mm). Touchdown vertical speed (31 – 50 mm/s; bimodal by contact tick on heavy / tall). Release 0.117 s after the transfer. Leg hard-limit margin (≥ 9.6°). Saturation (4 – 8 axis-ticks / cycle, 85 – 100 % ankle inversion). Δτ0 (12 – 24 N·m). Energy-closure residual (0.044 – 0.074 J / cycle). Pelvis tilt (5.4 – 6.4°). Step period (1.733 – 1.750 s). |
| **Bounded but irregular** | Landing error against the walking-frame target: lateral ± 6 mm, forward ± 2.6 mm. Stance width W0 ± 7 mm. Step length 0.0596 – 0.0641 m. All three follow the planner's 1-cm grid (the ~6-step oscillation CF-4 also showed). |
| **Growing step to step** (slow, small) | **Toe-out creep:** −0.036 … −0.10° per step per foot (heavy / tall −2.0° by step 20). This is the A item recorded in CF-3 / CF-4; CF-4's 60-step check showed it converges at 2 – 3°. Co-varying with it: the trailing foot's residual load at the decision (0.04 → 0.08 % BW on heavy / tall and long-legs, against the 1 % release threshold) and long-legs' foot slip (0.29 → 0.35 mm, against the 20 mm relocation criterion). |

**Ankle-inversion saturation** is 4 – 6 axis-ticks per cycle, flat: well below CF-4's 12 – 19 at the same cadence. The walking plan lets the lateral DCM move toward the new foot, which catches it, instead of braking it in the stance ankle.

## 6. What the plan asked for against what the body did

The B-type tracking lag recorded in CF-4 is still present. It is absorbed rather than blocking:
- **The swing starts behind plan.** The DCM is 4.6 – 7.5 mm behind the stance centroid at the decision (plan ≈ +2 mm).
- **The ankle-first VRP absorbs it.** It sits 7.4 – 10.2 mm toward the heel and 13 – 24 mm toward the swing side, well inside the foot, and was never clamped.
- **Touchdown falls short of plan, consistently.** The DCM reaches 10 – 12 mm forward and 41 – 53 mm lateral (plan 23 / 69 mm), because the existing balance law (kξ = 1/3) lags the single-support reference by 7 – 8 mm.
- **Actual timing differs from planned.** The step is commanded 0.07 s before liftoff (planning delay 0.171 s), and contact comes at φ 0.91 – 0.92.

These offsets are the same every step, so the cycle is periodic around them.

## 7. Classification

**No failure occurred, so there is no first blocker within the instructed test.** The limits it exposes:

**A — walking-scale planning that does not exist yet:**
1. **Speed.**
   - The walk is very slow: v̄ = 0.034 m/s (about 3 % of human walking), touchdown speed 24 – 26 mm/s.
   - Causes:
     - the planner's commanded corridor caps the swing displacement at 0.13 m, so step length ≤ 0.065 m;
     - the E2 swing timing (0.6 s swing + B1 lift) plus the lifecycle's release makes single support ≈ 0.75 – 0.88 s;
     - E ≈ 15 then makes the swing-start DCM extremely sensitive: the periodic plan needs it within ~1.5 mm of the stance centroid;
     - the double support is 1 s.
2. **Heading regulation:** the toe-out creep and its correlates.

**B — an existing mechanism with a correctable limitation:** the existing balance law's DCM tracking lag in double and single support (kξ = 1/3). It is absorbed by the stance ankle in this regime, and would cost margin at higher speeds.

**C — none.** No quantity grew toward a limit: no compounding balance error, no saturation growth, no energy growth, no contact instability, no fall.

## 8. The four questions

1. **Did V2 physically walk continuously, rather than repeatedly execute stop-steps? Yes.**
   - Forward COM velocity stayed positive at every tick of every inherited cycle: ≥ 16 mm/s, about half the mean progression speed.
   - It was 24 – 26 mm/s at every touchdown and 40 – 46 mm/s after every load acceptance.
   - Each transfer and swing inherited it. Nothing was reset.
   - CF-4's stop step at the same cadence reversed the COM at every touchdown (−2.6 … +1.2 mm/s).
2. **Maximum number of consecutive genuine continuous steps demonstrated: 19, on each of the four bodies.**
   - These are steps 2 – 20 of 20 physical steps. Step 1 starts from standing and is ineligible by definition.
   - The count is capped by the instructed 20-step limit, not by a failure.
3. **Did its state converge to a repeatable cycle or deteriorate? It converged.**
   - The cycle was periodic within 2 – 3 steps: period 1.74 s; every speed, DCM, capture, load, joint, saturation, torque and energy quantity flat.
   - Landing errors and width stay bounded by the planner's grid.
   - The only monotonic quantity is the known toe-out creep (converging per CF-4), with negligible correlates.
4. **Did anything appear that materially argues for V3? No.**
   - No C-type behaviour appeared on any body.
   - The caveat is scale. This is a viable continuous walk at 0.034 m/s, not walking speed. Getting faster needs walking-scale planning (step length, swing timing: A), and probably tighter DCM tracking (B).
   - Ankle-inversion saturation remains the known first capacity-related limit as cadence rises. Here it is lower than in CF-4.

## 9. Harness notes

**Code.** The `--cf=5` code and its full description are in the header of `tools/loco_probe.mjs`.
- CF-5 shares CF-4's machinery (`CF >= 4`). Its own paths are gated `CF === 5`.
- The run ends at step N + 1's measured liftoff (the "next liftoff" of step N). That tail is not counted as a step.

**Regression on the final harness.**
- `--cf=0..4`: 95 / 95 end hashes.
- Records identical field for field, except wall time and the planner's millisecond timer: CF-3 18 / 18, CF-4 29 / 29.
- The probe, CF-1 and CF-2 records differ only by output fields the harness has added since.

**Defects and corrections:**
1. **The first swing-terminal rule (development smoke)** — the design correction in §1, made before any staged run.
2. **A misfiled table in yesterday's CF-4 tables.**
   - The report tool selected runs by a label substring. The CF-4 label ("CF-4 on CF-2 + CF-3 …") contains "CF-3", so the committed `../loco_cf4_2026-10-08/CF4_TABLES.md` held a misfiled "CF-3 cadence summary" block for the CF-4 runs. Its "nominal cycle" values are meaningless for CF-4.
   - Selection is now by the label's start. CF4_TABLES.md was regenerated in this commit.
   - No CF-4 result used that block.

**Stop.** Nothing adopted; no production walking; no running; TD2C / E2 not resumed. Stopped for review.
