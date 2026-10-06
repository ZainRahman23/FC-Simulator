# Velocity feed-forward rate: estimator correction (Decision 1 of the overnight instruction)

**Authority:** user instruction 2026-10-06 (overnight), `../sources/2026-10-06_user_instruction_overnight_e2_autonomous.md`. Diagnosis it builds on: `SWING_LAG_DIAGNOSIS.md`.

**Status of this document:**
- implementation correction, default-off option `vffRate: "sr"`;
- configurations PSTAR4S = PSTAR4 + it, PSTAR5BS = PSTAR5B + it, PSTAR5CS = PSTAR5C + it;
- prior-regression results: §8 (filled in when the batteries finish).

**Evidence:** `evidence_vffrate/`.

## 1. The defect (empirical finding, reproduced)

`lcVff "lin"` gives the swing servo a desired joint velocity ω\*. It is one damped Gauss–Newton step from the current IK solution x to the previous tick's problem:

dx = −(H_F + μ(I + diag H_F))⁻¹ g_F, with H = JᵀJ and g = JᵀΔr, on the free (not box-active) coordinates F.

ω\* comes from dx / dt, and it uses μ = IK.mu0 = 0.01 on every tick.

**Effect of the fixed damping:** in an eigen-direction of H with eigenvalue λ, the step is scaled by about k = λ / (λ + μ(1 + H_ii)).
- The uncompensated (1 − k)(D + dt·K)·ω\* acts as joint damping on the reference.
- That gives a lag of about (1 − k)·2ζ/ωn ≈ (1 − k)·64 ms.

**At swing poses** (knee about 35°) the smallest eigenvalue is 0.010–0.012 ≈ μ0, so k ≈ 0.3 for vertical foot motion.

**Reproduced on the committed tree before any change** (`evidence_vffrate/lag/stage_analysis_lin_baseline.txt`):

| measure | value |
|---|---|
| knee ω\* / ω_id | ×0.27 – 0.37 |
| hip ω\* / ω_id | ×0.2 – 0.5 |
| vertical 2 Hz foot response | ×0.86, 42.9 ms |
| actuator law | exact (1e-4 N·m) |
| feed-forward arithmetic | exact |
| IK targets | move at ×0.99 – 1.00 |

## 2. Conditioning study: where the one-step rate is right and where it is not

**Tools** (`tools/rate_cond_preload.mjs`, observation only, runs bit-identical with and without it):
- records every rate problem exactly as the controller poses it: J, Δr, box set, lifecycle weights;
- also records the **exact** neighbouring solution: the same bounded LM as the controller, started from x;
- `tools/rate_cond_analyze.mjs` evaluates any damping schedule offline.

**Coverage:** 45,458 rate problems:
- E2 smoke steps: V2-REF, V2-165-62, V2-short-legs, V2-198-92; forward and lateral; 180 / 240 / 480 Hz;
- E1b YAW and none (V2-REF, V2-long-legs);
- the external-lift harness: straight legs at drop 0 and flexed at drop 2.5 cm;
- swing_lag_diag hover trajectories (V2-165-62, V2-long-legs).

Full table: `evidence_vffrate/conditioning/sigma_bins_all.txt`.

| σ_min of the free problem | knee flexion | undamped rate vs exact, rel. error p50 / p95 / max | μ0 rate vs exact, rel. error p50 |
|---|---|---|---|
| < 0.001 (straight knee) | 0° | 445 / 3.4e4 / 5.7e4 (rates to 35,000 rad/s) | 0.13 |
| 0.001 – 0.003 | 0.4 – 0.9° | 0.05 / 0.19 / 0.69 | 1.0 |
| 0.003 – 0.006 | 1 – 2° | 0.014 / 0.14 / 0.34 | 1.0 |
| 0.006 – 0.010 | 2 – 4° | 0.005 / 0.026 / 0.10 | 0.97 |
| 0.010 – 0.030 | 3 – 7° | ≤ 0.002 / 0.006 / 0.038 | 0.5 – 0.95 |
| 0.030 – 0.150 (every swing / hover pose) | 14 – 38° | ≤ 0.001 / 0.009 / 0.013 (one 0.19 outlier at a box switch) | 0.22 – 0.73 |

**Reading:**
1. **μ0 is wrong everywhere except at the singularity.** At swing poses it loses 22 – 73 % of the rate.
2. **The undamped rate is exact** (≤ 1.3 %) wherever the leg is conditioned. It fails only at the straight-knee singularity.
3. **The two regimes are separated by a factor of 3 or more in σ_min.** That separation is the justification for the width ε below.

## 3. The correction chosen and why (implementation correction)

**Formulation:** singularity-robust damped least squares with variable damping.
- Nakamura & Hanafusa 1986; Chiaverini 1997 / Chiaverini, Siciliano & Egeland 1994: λ² = (1 − (σ_min/ε)²)·λ_max² inside the singular region.
- Written in the solver's own Marquardt form:

  μ = μmin + (μ0 − μmin)·max(0, 1 − λmin(H_F)/ε²), with ε = IK.srEps = 0.01.

| property | consequence |
|---|---|
| λmin → 0 (straight knee) | μ = μ0 exactly: the validated law where it was needed |
| σ_min ≥ ε | μ = μmin = the solver's terminal damping: the resolved rate |
| continuous in λmin | no switch in the torque path |
| λmin from a cyclic Jacobi eigen-decomposition of H_F | uses only + − × ÷ √: IEEE-deterministic, browser = Node; checked against a Cholesky bracket on 2,000 random matrices |

**Why ε = 0.01:**
- It is the edge of the region where the linearisation is measured to be exact (§2).
- All airborne / commanded poses sit at σ_min ≥ 0.03, a factor of 3 margin; swing poses sit at 0.044 – 0.15.
- The swing result is therefore insensitive to ε anywhere in [0.005, 0.03].
- It is not chosen by any gate outcome: no E2 criterion, PG result or smoke clearance was consulted.

**Rejected formulations:**

| formulation | why rejected |
|---|---|
| lower global μ | at the singularity the undamped rate is 10²–10⁵ wrong, the "linmin" failure of `preswing/` (50,000–95,000 N·m τ0 steps) |
| solver's terminal μ of this tick's solve | depends on the iteration count (1 – 3 accepted steps leave μ at 1e-3 … 1e-5), not on conditioning |
| error-damped DLS (Chan & Lawrence 1988, Sugihara 2011: μ ∝ ½‖e‖²) | the rate's residual difference cancels an unreached target's residual, so it gives no protection at the singular, unreachable straight leg |
| a joint-rate trust region or gain bound | the validated μ0 gain bound (about 4.4 rad/s per m/s) is below the true swing rate (about 10 rad/s per m/s in the weak direction), so it would keep the attenuation |
| selectively damped least squares (Buss & Kim 2005) | larger change, no measured need |

### 3a. Scope: the target-motion term only, because the pelvis-motion term is closed loop

ω\* has two parts, each from its own one-step solve:
- **rT:** the commanded swing target's own motion between ticks. It is **exogenous**: a feed-forward of the reference, inside no feedback loop.
- **rP:** the motion of the leg's frame, the measured pelvis. It is **closed loop**: it feeds back measured state.

**First implementation:** variable damping on both terms; now kept as the REFUTED diagnostic value `vffRate: "srAll"`.
- External-lift harness (`tools/boundary_probe.mjs`, 12 runs; `evidence_vffrate/external_lift/summary.txt`):
  - drop 2.5 cm at 30 N: **4 falls**, 1,000+ applied torque steps > 5 N·m, τ0 steps up to 11,553 N·m, energy closure up to 10.96 J / tick, chatter;
  - straight legs (drop 0) stayed safe: there the singular region applies μ0.
- **Mechanism:**
  - rP feeds an explicit, one-tick-delayed copy of the measured pelvis velocity through the leg's weak (vertical) direction;
  - in Cartesian terms that direction's joint damping is D/σ², about 25,000 – 48,000 N·s/m at the lifted, flexed leg's σ 0.044 – 0.07;
  - μ0 had bounded that explicit loop gain at D/μ0, by accident of its attenuation.

**Adopted:** `vffRate: "sr"` = variable damping on **rT only**; rP keeps the caller's validated damping.
- On that harness the result is **bit-identical** to PSTAR4 (12 / 12; no commanded swing target).
- Every resting, external or uncommanded path is unchanged by construction.

## 4. General correction vs the E2-scoped analytic-reference path (the decision, made explicitly)

**E2-scoped alternative:** ω\* of the target motion from the analytic swing reference, J_f⁻¹·v_ref, D1's machinery.
- For the target term it would give the same rate: the one-step undamped solve matches the exact per-tick displacement to ≤ 1.3 %.
- It still needs the same singularity guard: an undamped J_f⁻¹ near the straight knee.
- It exists only where an analytic reference is supplied. The E1b lift protocol, the abort put-down and the external harnesses supply none.

**Decision: the general correction, scoped to the term it is safe for.**
- The estimator is a general component (`lcVff`, every non-supporting leg).
- The target-motion term is the one carrying the defect for every commanded motion: E1a/E1b lifts, aborts, E2.
- The correction leaves every path without a commanded target bit-identical (verified).
- What it changes is limited to commanded-target tracking. Those runs are re-regressed under PSTAR4S (§8) and **not** silently blessed: PSTAR4 itself is unchanged and its evidence stands.
- If the PSTAR4S regressions show an unexplained change, the fallback is the E2-only scope (the option on PSTAR5x only). Whether it is needed is decided by §8.

## 5. Identity (`evidence_vffrate/identity/`)

All after every edit:
- KV0 identical (`kv0.txt` = `hash_head.txt`);
- PSTAR5B SMK-B1D 99c29491;
- PSTAR5B P15 c260f26c;
- PSTAR4 P15 e6e2b493;
- PSTAR5 SMK-R edcc88ee;
- PSTAR4 E1b YAW and E1a V2-REF hash series identical to the E1b closing evidence;
- component suite 58 / 58.

## 6. Before / after: servo diagnostics (`evidence_vffrate/lag/`)

V2-REF L 240 Hz, floating pelvis, D1 off. **ω\*** = desired joint velocity, **ω_id** = Jacobian-ideal rate from the analytic reference.

| trajectory | lin (validated) | sr (adopted: rT only) | srAll (refuted, for attribution) |
|---|---|---|---|
| vertical 2 Hz, foot | ×0.86, 42.9 ms | ×1.09, 9.7 ms | ×1.03, −1.4 ms |
| knee ω\*/ω_id (vertical 2 Hz) | ×0.27 | ×0.86 | ×0.99 |
| constant velocity down, joint lag (knee) | 37.6 ms | 1.4 ms | 1.0 ms |
| constant velocity outward, knee ω\* | ×0.28 | ×0.83 | ×0.99 |
| constant velocity forward, foot | 0.3 ms | −4.2 ms (one-tick convention, below) | −4.1 ms |
| chirp 2.75 Hz | ×1.30, 40 ms | ×1.36, 38 ms | ×1.43, 33 ms |

**Reading:**
- The velocity-proportional lag of the commanded motion is gone for the right reason: the target-motion rate now equals the exact per-tick IK displacement.
- **What remains in ω\* under "sr" is the pelvis-motion term.** The pelvis reacts to the moving leg and rP is still μ0-damped. The fixed-pelvis rig (srAll) shows no remaining lag.
- **The −1 … −6 ms forward "lead" is a measurement convention:** the end-of-step foot is compared with the start-of-step reference. It scales with dt: −5.7 / −4.1 / −1.7 ms at 180 / 240 / 480 Hz.
- The overshoot rising with frequency is the missing inertial term (D1's target), not a lag.
- Other bodies and rates under srAll (V2-165-62 480 Hz, V2-198-92 180 Hz, fixed pelvis) show the same pattern: joint lag 0 – 2 ms.

## 7. Before / after: real E2 swing (non-test smoke steps; `evidence_vffrate/smoke/swing_track_all.txt`)

V2-REF, forward 0.07 m (L) and lateral 0.06 m (R), 240 Hz, `--diag=noclear` (certificate logged, not enforced).
- Tracking is in the evaluator's convention (the frozen E2-3 definition).
- e_z = signed vertical error (foot − target), time-matched.
- Clearance = measured lowest boot point.

| configuration | tracking RMS / max (mm) | e_z rising / descending, mean (mm) | min clearance φ ∈ [0.2, 0.8] |
|---|---|---|---|
| PSTAR5B (before) | 5.6 / 8.4 – 9.3 | −4.0 / +4.0 … +4.9 | 3.1 – 3.3 mm at φ 0.20 |
| PSTAR5BS (estimator corrected, D1 off) | 3.6 – 4.1 / 5.7 – 5.8 | −0.5 … −1.1 / +1.8 … +1.9 | 4.6 (φ 0.80) – 5.5 (φ 0.20) |
| PSTAR5CS (+ D1, placeholder allowance) | 1.1 – 1.4 / 1.8 – 2.3 | −0.7 … −1.0 / +1.5 … +1.9 | **5.7 – 6.6 mm at φ 0.80** |

**Remaining residual:** the error pattern is now a pure lag, low while rising and high while descending.
- With D1 the foot is never more than 1.6 – 2.0 mm below its reference.
- The pelvis-motion term accounts for about 0.9 mm of the remaining descending error (srAll + D1: e_z descending +0.6 mm).

## 8. Prior regressions under PSTAR4S (frozen batteries, run unchanged from a clean copy of commit 6c30e64 / b3eaecf)

**Evidence:** `evidence_regression_pstar4s/`. Scripts: `scripts/run_validation_close_pstar4s.sh`, `scripts/regress_battery_pstar4s.sh`, `scripts/run_preswing_pstars.sh`.

| battery (frozen evaluator) | PSTAR4 (closing evidence) | PSTAR4S | verdict-level comparison |
|---|---|---|---|
| E1b official set E (`e1b_eval`) | FAIL only on E1b-18 / E1b-15, V2-165-62 L P15 (class B, STEP_REQUIRED) | **same, one item:** V2-165-62 L P15 | 428 / 429 criterion verdicts identical; the one change is an **improvement**: V2-REF L P15 E1a-4 FAIL → PASS |
| E1a set A (`e1a_eval`) | PASS | **PASS** | 135 / 135 verdicts identical |
| extended set X (`e1bfix_eval`) | FAIL only on the class-B V2-165-62 P15 runs (X-P15, X-RATE) | **same runs** | the class-B stance slip improves (6.8 – 7.9 → 5.2 – 6.3 mm); put-down contact +0.20 → +0.15 s |
| **E1b closing evaluation** (`e1bclose_eval`, P15 split) | PASS | **PASS** | — |
| T-A checks | PASS | **PASS** | W_P15 exercises T-A (verdict in place) |
| browser = Node (W) | 3 / 3 | **3 / 3** | — |
| G0 – G3 regression (`touchrest_regress_eval`: V3.1 – V3.10) | PASS | **PASS** | KV0 identical; suite 58 / 58; G1 74 / 74 hashes identical to qualification v2; G2 11 / 11; G3 v3.3 none failing; J2a 81 / 81; external lift 9 / 9; browser 10 / 10, 6 / 6, 4 / 4. The G0 / G1 non-gating rows (0.V1, 1.S′, 1.V1: the freeze guard in a copied tree and the KC-4 exception) are identical to PSTAR4's |
| pre-swing P\* validation (V1 – V15) | PASS | §8a | |

**E1 hover metrics, unchanged within noise:** E1a-3 hover error max 0.84 – 0.98 mm (PSTAR4: 0.85 – 0.91). Hover is stationary, so the commanded-motion correction barely acts there.

**Reading (the "do not silently bless" check):**
- Every changed PSTAR4S output differs from PSTAR4 only where a commanded target moves: lifts, put-downs, the abort's descent.
- Every changed verdict changes toward pass.
- No previously passing criterion fails.

So the old behaviour did depend on the defective estimator, and that dependence was in the safe direction for E1's criteria: lagging lifts and put-downs. The correction is not an unintended regression. It is a behaviour change of the certified E1 configuration nonetheless, so **PSTAR4 stays the certified E1 configuration and its evidence stands**. Whether PSTAR4S replaces PSTAR4 as the E1 baseline is listed as a user decision (`E2_OVERNIGHT_REPORT.md`). E2 is built on it (PSTAR5BH / PSTAR5CH).

### 8a. Pre-swing P\* validation (the validation of lcVff "lin" itself)

**Battery:** `scripts/run_preswing_pstars.sh`, commit 4a2807e. The frozen 924-run manifest plus the 32-run external-lift matrix, with `vffRate: "sr"` added to the 793 P\* runs; frozen evaluator.

**Result: PRE-SWING VALIDATION PASS**, V1 – V15 all pass (`evidence_regression_pstar4s/preswing/eval.log`).

**Identity:**
- all **776 / 776** non-lift runs are hash-identical to the official P\* validation (abdd3da);
- 147 / 148 lift runs changed (commanded targets), as expected;
- browser = Node 3 / 3;
- the official touch-rest REPRO runs are hash-identical.

**Behaviour change in the lift runs** (`lift_metrics_PSTAR_vs_PSTARsr.txt`), per set, max over 16 runs:

| set | hover error max (mm) | touchdown impact max (% BW, limit 25) | touchdown error max (mm) |
|---|---|---|---|
| E5, drop 1.5 cm | 2.90 → 1.28 | 0.00 → 7.04 | 0.28 → 0.12 |
| E5, drop 2.5 cm | 1.28 → 0.93 | 0.00 → 5.76 | 0.27 → 0.02 |
| M10, 1.5 / 2.5 cm | 1.42 / 0.82 → 1.37 / 1.05 | 0.00 → 10.5 / 10.2 | 0.85 / 0.68 → 0.55 / 0.54 |
| E20, 1.5 / 2.5 cm | 1.06 / 0.89 → 1.15 / 0.96 | 0.00 → 14.9 / 10.9 | 1.39 / 1.10 → 1.26 / 1.08 |
| X2 (slow 2 mm) | 0.01 → 0.01 | 0.02 → 0.21 | 0.02 → 0.02 |

**The touchdown impact rise is real and has a mechanism** (empirical finding):
- The old servo lagged its replace reference and arrived after it had stopped: impact ≈ 0.
- The corrected servo follows the reference into contact. At contact the velocity feed-forward still carries the reference's last downward rate.
- Through the leg's weak (vertical) direction that rate acts with a Cartesian damping of order D/σ², so a few mm/s of reference velocity becomes tens of newtons.
- The impacts stay inside every frozen limit.
- The same mechanism shows in E2 (`E2_OVERNIGHT_REPORT.md`, touchdown impact 11 – 22 % BW in the corrected smokes vs 9 % before).
