# MUSCLE-1 preregistration

Frozen with `MUSCLE1_FREEZE.json` and committed **before** the candidate's evaluated run. The design is in `MUSCLE1_DESIGN.md`; §8 lists what was seen before the freeze.

## 1. System

| Item | Value |
|---|---|
| Candidate | **M1** (`scripts/m1_models.mjs` `M1Axis`; constants `params/MUSCLE1_CANDIDATE.json`) |
| References (reported, not judged) | **V2ENV** = CURRENT V2's canonical actuator (`ActuatorLayer` law); **V2ACT** = S2's actuator exactly as in PPR-3; **M1a** = ablation with only the force-production change (developed force f, but S2's window and secant arms) |
| Fixture | one actuator axis at the **PPR-3 standing entry operating point** (`scripts/m1_kit.mjs` boots the frozen S2 body on `ppr3/fixture/PPR3_STANDING_ENTRY.json` and extracts the row constants) |
| Primary joint | **left ankle df axis** (k 11): dorsiflexors on +, plantarflexors on − |
| Second joint | **left knee flexion axis** (k 9): flexors on +, extensors on − |
| Initial conditions | entry excitation u0 (S2's tonic solve with floors); a = f = u0; strain arms zero; 2 s isometric settle (480 steps) before every input |
| Kinematics | prescribed constraint-parameter angle φ (anat = anat0 + s·Δφ, strain e = −Δφ), or a 1-DOF quick release (inertia = S2's axis inertia I, constant load = minus the pre-stretch operating torque) |
| Stepping | V2's own order: torque for the step → kinematics → strain arms → next plan. dt = 1/240 s |

## 2. Inputs (`scripts/m1_experiments.mjs` `PROTOCOL`)

**A, neural command → force (isometric).**
- Steps of the agonist group's excitation from u0, held 1.5 s, then back to u0, held 1.5 s:
  - ankle PF +0.05 / +0.25 / +0.50; DF +0.10 / +0.30;
  - knee KE +0.05 / +0.25 / +0.50; KF +0.10 / +0.30.
- Moderate ramp (first group, +0.25): 200 ms up, 1.5 s hold, 200 ms down, 1.5 s hold.
- V2ENV gets the torque request equal to the steady isometric torque of the same excitation, which is its own interface.

**B, external stretch (excitation constant at u0).** The stretch is of the loaded group: ankle dorsiflexion stretches PF; knee flexion stretches KE.
- Stiffness series: 41.7 ms (10-step) ramps to 0.005 / 0.01 / 0.02 / 0.04 / 0.08 rad.
- Stretch–hold–return: 0.01 and 0.04 rad; 41.7 ms ramp, 1 s hold, 41.7 ms return, 0.5 s hold.
- C1-protocol eccentric hold: 0.0175 rad, 2-step ramp, held 262 steps. This is S2's own protocol.
- Quick release: 0.04 rad stretch held 1 s, then the joint is freed against the operating load for 1 s.
- Shortening of the loaded group, 0.01 / 0.04 rad: reported.
- V2ENV is run with CURRENT V2's SnapshotTone K / D / bias: reported.

**BC, C history / energy audit.**
- BC1: 0.02 rad stretch, held 0.25 s; the loaded group's excitation is raised by +0.25 for 1 s of hold; return ramp; then excitation restored.
- BC2: at a raised excitation (+0.25), stretch 0.02 rad and hold 0.3 s; excitation is set to zero for 0.5 s, then restored for 1 s.

**C, PPR-3 replay (open loop).**
- The frozen S2 + P2 battery runs (`evidence/capture/`; `CAPTURE_INDEX.json` lists hashes): fwd_small, fwd_moderate, fwd_large, back_moderate, left_small, left_moderate, minus the BASE_undisturbed twin.
- Both legs, ankle df axes (and knee flexion axes for the second joint).
- Each model receives exactly P2's logged Δτ and the recorded kinematics (anat, ω at both ends of the step, knee angle, strain increment). Window: onset − 25 ms … onset + 1 s.

## 3. Definitions

| Term | Definition |
|---|---|
| Time zero (A) | the last sample before the first step whose plan contains the new excitation. Sample i is the torque applied over ((i − 1)·dt, i·dt] |
| 10–90 % rise / 90–10 % fall | linear-interpolated crossings of 10 % and 90 % of the change between the pre-change torque and the torque at the end of the 1.5 s hold |
| Onset | the 2 % crossing |
| First-tick fraction | the change in sample 1 / the total change |
| Slew | maximum \|Δτ\| over 1 tick and over 25 ms (6 ticks) |
| Stiffness (B) | \|Δτ\| at the end of the 41.7 ms ramp ÷ amplitude. The Vlutters ratio uses mgh per leg = 323.6 N·m and Vlutters 2015 = 0.93·(θ/0.29°)^−0.271 (S2's I1a reference) |
| First-tick stretch response | the first-tick Δτ ÷ the model's own plan-time intrinsic response −(D + dt·K_tot)·ω_end |
| Hold fraction | strain torque at 100 / 300 / 1000 ms after the end of the stretch ÷ at the end of the stretch (plan after the last ramp step) |
| Energy ledger (J, positive = absorbed by the actuator) | total = −Σ τ·Δφ = active + clamp + damping (Σ D·ω·Δφ) + implicit-Euler term (Σ ½·K_tot·Δφ²) + ΔE_B + element stored + relaxation + slip + detachment dissipation − energy created by stiffness change. **Residual** = total − all of these. Rigid-body terms are reported separately in the release |
| BC1 ratio | strain-element work returned during the return ramp ÷ work absorbed during the stretch ramp |
| BC2 ratio | \|strain torque 1 s after reactivation\| ÷ \|strain torque before deactivation\| |

## 4. Human reference data

`research/FORCE_PRODUCTION_LITERATURE.md` §9 / §12.2. Labels as there. Bands are the literature ranges, not the central values the parameters were derived from.

## 5. Numerical tolerances

| Item | Tolerance |
|---|---|
| Energy-ledger residual | 1 % of absorbed work (the discrete identity closes to round-off; the implicit-Euler term is itemised) |
| Replay validity | excitation 1e-9; applied torque 0.05 N·m, or 0.6 N·m where contact coupling in the solver matters (fwd_large, left_moderate). These are the audit's measured fixture limits |

## 6. Criteria (frozen in `scripts/m1_eval.mjs`; all must pass)

**Ankle (primary):**

| ID | Criterion |
|---|---|
| A1 | PF step-up 10–90 % rise ∈ [250, 450] ms at all 3 amplitudes |
| A2 | PF step-down 90–10 % fall ∈ [120, 250] ms at all 3 amplitudes |
| A3 | DF step-up ∈ [150, 250] ms; DF step-down ∈ [230, 360] ms |
| A4 | every neural step: onset ∈ [5, 30] ms and first-tick fraction ≤ 1 % |
| A5 | amplitude independence: max / min 10–90 % time across amplitudes ≤ 1.10 per group and direction |
| A6 | moderate ramp: overshoot ≤ 2 %; within 1 % of the commanded torque at the end of the hold and after the ramp down |
| B1 | end-of-ramp stiffness M1 / V2ACT ∈ [0.95, 1.10] at all 5 amplitudes, and M1 ∈ [0.5, 1.5] × Vlutters |
| B2 | first-tick stretch response ≥ 0.9 × the intrinsic response (small and moderate) |
| B3 | C1-protocol hold fractions within [0.25, 0.60] / [0.15, 0.45] / [0.08, 0.35] |
| B4 | ledger residual ≤ 1 % (both stretch–hold–return runs and the release); both cycles net absorbing; no energy created by stiffness change |
| B5 | release: first motion toward return; no half-cycle \|ω\| peak above the first; settled (\|ω\| ≤ 0.05 rad/s over the last 0.25 s) |
| BC1 | ratio ≤ 1 |
| BC2 | ratio ≤ 0.05 |
| C0 | replay validity (§5) |
| DET | bit-identical reruns |
| CPU | M1 × 35 axes ≤ 32.5 µs per step |

**Knee (second joint, judged only if every ankle criterion passes; instruction §12):**

| ID | Criterion |
|---|---|
| K-A1 | KE rise ∈ [165, 235] ms |
| K-A2 | KE fall ∈ [120, 200] ms |
| K-A4, K-A5, K-A6 | as at the ankle (KE and KF steps; KE ramp) |
| K-B1 | M1 / V2ACT ∈ [0.95, 1.10]. No Vlutters band at the knee |
| K-B2, K-B3, K-B4, K-B5, K-BC1, K-BC2, K-C0 | as at the ankle |

Same equations, knee-specific τc only.

**Reported, not judged:**
- V2ENV, V2ACT and M1a everywhere;
- the KF timing (borrowed parameters, no human data);
- Experiment C's decomposition (command → V2ENV → V2ACT → M1a → M1; mechanical terms; slews, peaks, 50 % times, 0–400 ms impulse) against Robinovitch 2002's weak plausibility range (372 ± 267 N·m/s; §11 #19);
- knee stiffness vs the Pfeifer 2012 slope;
- CPU per model and state count.

**CURRENT V2's "central question" (A7, a finding about the reference).** Does CURRENT V2 produce torque substantially faster than human evidence permits? YES if its PF step rise is < 125 ms (half the human lower bound) or its fall is < 60 ms.

## 7. Decision rules (pre-stated)

1. **M1 passes** iff every ankle criterion and every knee criterion passes. MUSCLE-1 then stops for the owner's decision (instruction §16).
2. **An ankle criterion fails:** diagnose it. A labelled successor (M1b, …) is made only for an identified causal failure, with an independently justified change, re-run on this frozen battery.
   - Reject outright if realistic timing would need the immediate response to be softer (instruction §15).
3. **The ankle passes but the knee fails:** report a generalization failure and stop. The architecture is not refitted for the knee.
4. **No PVP, tackle, slide, P2 change or successor, prediction, stepping or RUN-1 work** in any case.

## 8. What was seen before this freeze (disclosed)

1. **The audit:** code, the PPR-3 captures and the fixture validation (`MUSCLE1_AUDIT.md`).
2. **Fixture plumbing on V2ENV and V2ACT only** (all experiments, both joints). It led to four pre-freeze corrections, each from the references, not the candidate:
   - **(i) step-timing index off by one:** fixed;
   - **(ii) the B3 hold protocol** changed to S2's own C1 protocol, because the C1 bands were defined on it. The fixture's V2ACT then reproduces S2's battery C1 exactly: 0.465 / 0.367 / 0.223;
   - **(iii) the release criterion** changed from "non-increasing peaks about the final angle" (fooled by slow arm creep at the knee) to "no half-cycle peak above the first";
   - **(iv) the window correction** in M1 (design §4.3a), from V2ACT's clipped first-tick response.
3. **A candidate smoke run** (M1, M1a) checked only that it executes with finite numbers. No metric was inspected.
4. **The criteria script** was exercised on V2ACT's results relabelled as M1 (fails A1–A4, B2, B4 and BC2, as expected for S2).
