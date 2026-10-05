# Capture-aware foot placement: established algorithms (delegated study, 2026-10-05; recorded in substance)

**Sources:**
- IHMC develop@1dfb74b, `ihmc-common-walking-control-modules/…/commonWalkingControlModules/`. Abbreviations: OSCR = `captureRegion/OneStepCaptureRegionCalculator.java`; EB = `capturePoint/stepAdjustment/ErrorBasedStepAdjustmentController.java`; SAP = `StepAdjustmentParameters.java`; SH = `captureRegion/CaptureRegionSafetyHeuristics.java`; RC = `StepAdjustmentReachabilityConstraint.java`; MS = `MultiStepCaptureRegionCalculator.java`.
- Atlas / Valkyrie stepping parameters from ihmcrobotics/atlas@b8a244d and valkyrie@45e0e51 (develop heads).
- walking-controllers `feature/stepAdaptation` d7d7099 (SAC = `StepAdaptationController.cpp`).
- Khadiv 2020 and Griffin 2017 full text.

Licences: IHMC Apache-2.0, walking-controllers BSD-3. Equations only.

## 1. IHMC (the adoption candidate)

### One-step capture region (OSCR; cites Koolen 2012 Part 2)

Inputs: stance CoP polygon S′, ξ, ω, T (≥ 0; EB passes max(T_rem, 0.05)).

1. If ξ ∈ S′: the whole reachable half-disc (no adjustment needed).
2. Otherwise, take V = the vertices of S′ visible from ξ.
3. Projected ICPs: p_i = r_i + e^{ωT}(ξ − r_i) for each r_i ∈ V.
4. Kinematic extremes: k_i = where the ray r_i → p_i meets circle(c, R_k), with c = centroid(S′) and R_k = 1.5·maxStepLength. If |p_i| > |k_i|, use k_i = p_i.
5. C = conv{p_i, k_i, 7 arc points between the extreme directions}.

### Safety heuristics (SH)

Parameters: d_all 0.02, d_in 0.05, d_x 0.05 m.

- **Shrink toward the line of minimal action:** d = d_all + |u_x|(d_in − d_all), with u = (ξ − c)/|ξ − c|. Vertices are clamped back into C.
- **Push away from the stance foot:** move along u by min(d_x, s_max), keeping |v − c| ≤ L.

### Reachability octagon (RC)

At θ_j = jπ/4:
- x = L_f cos θ for front angles, L_b cos θ for back angles;
- y = s(w_in − (w_in − w_min) sin θ) on one side and s(w_in − (w_max − w_in) sin θ) on the other.

| robot | L | w_min | w_max | w_in |
|---|---|---|---|---|
| Atlas | 0.6 | 0.15 | 0.6 | 0.25 |
| Valkyrie SCS | 0.6 | 0.15 | 0.40 | 0.25 |
| Valkyrie real | 0.4 | 0.165 | 0.40 | 0.30 |

Crossover is off.

### Step adjustment (EB), every swing tick while the swing foot is unloaded

1. t_rem = T_swing − (t − t₀ + speed-up). For the first 5 ticks the target is the reference.
2. Freeze if t_rem < t_min (default 0.02 s; Atlas −0.2 s).
3. S′ = foot polygon shrunk by toe 0.02 / heel 0.05 / inside 0.01 / outside 0.03 m.
4. C = OSCR → SH (→ MS with ≥ 2 queued steps).
5. Project: p* = Π_{C∩R}(p_ref) if C ∩ R ≠ ∅, else Π_R(Π_C(p_ref)) with an infeasible flag.
6. Deadband δ = 0.02 m: below δ, no change; otherwise the full change (as coded).
7. Swing re-targeted (rate limit 10 /s) and the CoP / ICP plans recomputed.
8. Adjustment stops at measured load.

**No feasible foothold:** step to the reachable point nearest C. There is no further fallback (PushRecoveryControlModule is disabled).

### Timing (separate; Griffin speed-up)

- Triggered when |ξ − ξ_ref| > 0.05 m.
- Factor capped at T_swing / T_min,rec. T_min,rec = 0.3 s in simulation (Atlas, Valkyrie), 0.6 / 0.7 s on hardware.

## 2. Others

- **walking-controllers branch:** QP over [u_T, σ = e^{ωT}, b], constraint u_T + b + (u₀ − ξ)σ = u₀, box reach, qpOASES, fails hard if infeasible. Timing tolerance is 0 as shipped. u₀ = planned ZMP. Not usable as-is.
- **Khadiv 2020:** QP over (u_T, τ, b) with a viability bound on b. T ∈ [0.2, 0.6] s (LIPM), T_min 0.3 s whole-body; u₀ = measured CoP.
- **Griffin 2017:** QP trading CMP feedback against footstep change (Q_f ≫ R), plus speed-up. Minimum swing 0.6 s (simulation).
- **Current IHMC** keeps Griffin's timing but places the foot geometrically (no QP).

## 3. Comparison (reviewer)

| algorithm | solver | timing | our inputs | determinism | fit for planned steps / recovery |
|---|---|---|---|---|---|
| IHMC OSCR + SH + EB | none (geometry) | T is an input | all available | deterministic, with discrete deadband and vertex switches | does nothing when tracking is good / yes |
| + Griffin speed-up | none | shortens only | available | deterministic | optional |
| Griffin QP / Khadiv / walking-controllers | QP | yes / yes / off | partly | warm-start QP | overkill / timing competes with the contact-driven lifecycle |

## 4. Case (c): the reviewer's LIPM numbers

Assumptions: lateral ξ 0.094 m from the stance boot centre (IHMC's inner CoP edge at y = −0.04), ω 3.29, nominal foothold at −0.19.

| T | ξ_T | target y | shift from nominal | applied (δ 2 cm)? |
|---|---|---|---|---|
| 0.20 s | −0.144 | −0.195 | −0.5 cm | no |
| 0.25 s | −0.163 | −0.214 | −2.4 cm | yes |
| 0.30 s | −0.185 | −0.236 | −4.6 cm | yes |

Reach is not binding. If the CoP reaches the true inner edge, the shifts become 0 / −1.1 / −2.9 cm.

## 5. Reviewer's adoption recommendation

- Adopt IHMC's error-based step adjustment unchanged in substance (OSCR + SH + RC + projection + deadband + freeze). Leave timing out of the location solve.
- **T must be the time until the CoP clamp includes the new foot.** In Touchline that is touchdown + acceptance latency, not swing time alone. IHMC loads the foot at touchdown; Touchline accepts load after the debounce and ramp. This mapping is the reviewer's inference.
- Reach: scale to Touchline's kinematics and check with the IK certificate tool.
- Short-step defaults in the stacks:
  - swing height: IHMC 0.10 m (Valkyrie real 0.05, minimum 0.025); walking-controllers 0.025 m;
  - minimum recovery swing: 0.3 s (simulation);
  - no short-step-specific rule exists.
