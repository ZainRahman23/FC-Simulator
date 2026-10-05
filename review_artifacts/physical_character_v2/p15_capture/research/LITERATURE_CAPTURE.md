# Swing-phase emergencies in BLF / walking-controllers / PyPnC and the literature (delegated study, 2026-10-05; recorded in substance)

**Verification:**
- **Code:** read in the clones. walking-controllers `feature/stepAdaptation` (d7d70991, unmerged) cloned into `$S/ext2/wc-stepadapt`.
- **Full text:** Griffin 2017, Khadiv 2020, Pratt 2006, Stephens 2007 / 2010, Hof 2010, Park 2023.
- **Abstract only:** several human papers.
- **Not obtained:** Koolen 2012 (Parts 1 / 2), Englsberger 2015, Jeong 2019, Kryczka 2015, Feng 2016.

## A. Code

**walking-controllers `master`:**
- Contact flags are **planned** (standing periods); measured wrenches only feed the global CoP.
- Replanning only at merge points in double support.
- No step adaptation, swing shortening, push recovery, early load transfer or put-down.

**walking-controllers `feature/stepAdaptation` (unmerged):**
- Khadiv-style QP over [u, σ = e^{ωT}, b] with u + b = p + (ξ − p)σ.
- The shipped configs set the timing tolerance to 0, so **location only**.
- The foothold box allows outward / forward moves only.
- Trigger: DCM error > 2 cm for 5 cycles, evaluated only while a **planned** contact flag is false.
- Swing re-splined from the current state to the adapted foothold.

**BLF:**
- `CentroidalMPC` (Romualdi ICRA 2022): contact **location** is a decision variable (box), timing is fixed.
- `SwingFootPlanner`: re-splined every tick toward the next contact; `isInContact` follows the clock.
- `SchmittTriggerDetector` exists but no planner uses it.
- No push-recovery state, no early or accelerated load transfer.

**PyPnC (Atlas):**
- Early touchdown is accepted after ≥ 50 % of swing (kinematic sole height ≤ 1 cm in simulation).
- **Load acceptance is an explicit ramp:** `rf_z_max` and task weights linearly over α·T_ds = **0.225 s** (Atlas).
- The DCM reference is time-indexed ("TODO: Replanning").

**Across the stacks:**
- planned contact drives the controller states;
- measured contact only **advances** a phase;
- load acceptance is a scheduled ramp;
- "supporting" is never inferred from measured load.

## B. Literature

- **Pratt 2006:** step iff the capture region misses the base of support, so that they intersect again. Assumes an instantaneous support exchange.
- **Koolen 2012:** N-step capturability. d_∞ = ℓ_max e^{−ωT_min}/(1 − e^{−ωT_min}) (via Khadiv 2020 eq. 8).
- **Khadiv 2016 / 2020:** per-cycle QP over the next u_T, τ = e^{ωT} and the DCM offset, with T ∈ [0.2, 0.6] s.
  - Without timing adaptation the robot steps to the border and still diverges; with it, it steps "very fast" and recovers.
  - Point feet, so no CoP modulation.
- **Griffin 2017 (Atlas):**
  - swing speed-up Δt = (1/ω)ln((ξ_p − r_cmp)/(ξ_r − r_cmp)), minimum swing 0.6 s;
  - a step-adjustment QP with Q_f ≫ R (CMP saturated first; the foot moves "only when absolutely necessary");
  - **timing-only works when the error points along the ICP dynamics**; speed-up + adjustment was most robust;
  - a fast set-down caused oscillations that were corrected in transfer.
- **Stephens 2007:**
  - ankle bound δ₋ < x + ẋ/ω < δ₊;
  - hip / flywheel extension ±(τ_max/mg)(e^{ωT_max} − 1)²;
  - else step.
- **Stephens & Atkeson 2010:**
  - fixed timings, variable footsteps;
  - **the plan never asks for force before or just as the foot touches**;
  - "twilight" transitions can be triggered by contact-force detection;
  - conservative CoP regions.
- **Hof 2008 / 2010:**
  - foot placed a margin b (about 2 cm) outward of the XcoM;
  - lateral ankle strategy ≤ 2 cm CoP shift after about 200 ms;
  - stepping needs ≥ 300 ms;
  - **an inward push (toward the free leg) put the swing foot about 7 cm more lateral and shortened swing 0.40 → 0.33 s**; shortening appears only for XcoM shifts > 3 cm.

## C. Human biomechanics

- **Maki & McIlroy 1997:** change-in-support often starts well before the stability limit and is preferred.
- **McIlroy & Maki 1993:** step onset about 250 ms, earliest 160 ms. People step even when told not to.
- **Maki 1996, lateral:** 96 % of steps use the leg unloaded by the perturbation.
- **Hof & Curtze 2016:** CoP delays shrink the effective base of support to about 30 % of the static one (two-foot stance).
- **Bottom line:** humans do not keep the foothold fixed. With the free leg on the fall side they place it relative to the XcoM and shorten swing.

## D. Capturability for a fixed foothold (lateral)

- **0-step capture:** ξ₀ ≤ a_eff = min(a, τ_roll,max/mg) (+ the flywheel term).
- **Fixed-foothold deadline:** with p = a_eff, ξ(t) = a_eff + (ξ₀ − a_eff)e^{ωt}, and **support (CoP authority, not touchdown)** on the landing foot must exist by
  **t\* = (1/ω)ln[(w + b_o − m − a_eff)/(ξ₀ − a_eff)]**.
- **Load-transfer ramp:** a linear ramp of length T_r behaves like a step at t_td + T_r/2 (slightly conservative).
- **1-step region** with minimum support time T_min and reach y_max: y₁ ≥ ξ(T) − b_o + m. Non-empty iff ξ₀ ≤ a_eff + (y_max + b_o − a_eff)e^{−ωT_min}.
- **Pitfalls:**
  - load-transfer ramps delay support;
  - ankle roll saturation;
  - angular momentum must be paid back;
  - fast set-down causes oscillation;
  - CoP delay and accuracy shrink the base of support;
  - measure t\* from the push.

## E. Synthesis (reviewer)

**What established controllers do when balance is endangered mid-swing:**
- **combine timing and location:** Griffin / IHMC, Khadiv, Jeong, Park;
- **location only:** BLF CentroidalMPC, walking-controllers branch, Stephens 2010;
- **early-touchdown acceptance, then a scheduled load ramp:** PyPnC, Stephens.

**Not found anywhere:**
- anticipating load before measured contact;
- speeding up load acceptance on DCM error;
- a dedicated in-place put-down mode (except IHMC Flamingo, per the IHMC study).

**On the benchmark:** "recover without moving the foothold" and "recover by stepping" exercise different decision variables (τ vs u ± τ). The reviewer suggested outcome labels:
1. fixed-foothold success, with its margin at measured support;
2. fixed foothold infeasible, so a step is required;
3. adjusted-foothold success;
4. fall.
