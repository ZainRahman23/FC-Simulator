# E1a: results

**Inputs:**
- **Authority:** `../sources/2026-10-05_user_decision_option_a_authorise_e1a.md`. E1a only; E1b and later not authorised and **not started**.
- **Frozen inputs:** the protocol and criteria (`../final_pre_e1a/E1_PREREGISTRATION.md`, `../knee_correction/E1_PREREGISTRATION_V2.md`), the configuration (`../knee_correction/E1_PREREGISTRATION_V2_CONFIG.md`), and the operational definitions and harness (`E1A_HARNESS.md`, commit **c3b09d1**, before any E1a run).
- **Official run:** a clean scratch copy of c3b09d1. Evidence: `official/` (runs with full per-tick instrumentation and playback poses, evaluator output) and `diagnosis/`.

## 0. Bottom line

**E1a FAIL.** Judged by the frozen criteria; nothing tuned.

**What happened:**
- In **all 10 runs** (8 bodies with the left foot lifted, the mirrored V2-REF right-foot run, and the V2-REF repeat), the foot to be lifted **never left SUPPORT**.
- So the preregistered **unload step timed out at 9 s** and **no lift was ever commanded**.

**Consequences for the criteria:**
- **FAIL:** E1a-1, 2, 3, 5, 6, 9, 12, 13, all consequences of "no lift", and therefore E1a-15.
- **PASS:** everything that does not need a lift: E1a-4, 7, 8, 10, 11 (determinism), 14, 16, 17.

**The smallest demonstrated blocker** (§3):
- The lifecycle releases support only when the sensed load falls **below 1 % BW** (`loadOff`).
- With the preregistered 2.5 cm planned pelvis drop, a foot at **zero requested share keeps 1.02–1.25 % BW** on every body, applied by its own actuated support-leg control (passive torques ≈ 0).
- So release never happens.

## 1. Criterion table (8 bodies + mirrored V2-REF; `official/e1a_eval.log`)

| # | criterion | result | values (all 9 runs) |
|---|---|---|---|
| E1a-1 | true contact loss | **FAIL ×9** | no lift (unload time-out) |
| E1a-2 | true single support | **FAIL ×9** | no lift |
| E1a-3 | controlled swing foot | **FAIL ×9** | no lift |
| E1a-4 | stance-foot slip ≤ 1.0 mm, yaw ≤ 0.5° | PASS ×9 | slip 0.284–0.314 mm; yaw ≤ 0.007° |
| E1a-5 | bounded balance, no abort | **FAIL ×9** | no hover (no lift); no abort in any run |
| E1a-6 | lifecycle without chatter; unload within time-out | **FAIL ×9** | **unload TIME-OUT**; 0 transitions on either foot (no chatter) |
| E1a-7 | no discontinuous torque commands | PASS ×9 | applied Δτ ≤ 0.23 N·m per tick; commanded Δτ0 ≤ 0.41 N·m |
| E1a-8 | no unexplained energy | PASS ×9 | closure increment ≤ 0.0139 J per tick; Σ+ ≤ 0.117 J; authority writes 0; external impulse 0 |
| E1a-9 | capacities; saturation ≤ 5 % of hover | **FAIL ×9** | over-capacity 0, but no hover window exists (no lift) |
| E1a-10 | no anatomical-limit abuse | PASS ×9 | smallest hard-limit margin 8.96° (knee extension at t = 0); swing-leg knee flexion ≥ 3.96° |
| E1a-11 | determinism (V2-REF ×2) | PASS | 21 / 21 hash marks identical (end d359ac5c) |
| E1a-12 | touchdown | **FAIL ×9** | no touchdown (no lift) |
| E1a-13 | smooth load acceptance | **FAIL ×9** | LOAD_ACCEPT never entered. Load tracking itself was within 0.016 of the request |
| E1a-14 | recovery to a valid two-foot state | PASS ×9 | both SUPPORT; \|ξ − ξ_ref\| ≤ 0.06 cm; pelvis yaw Δ ≤ 0.01°; ankle / knee twist Δ ≤ 0.03° |
| E1a-15 | morphology | **FAIL** | the failures above, on every body and the mirrored run |
| E1a-16 | knee envelope 0–40° | PASS ×9 | 3.96–29.76° |
| E1a-17 | knee reference path ≤ 3° | PASS ×9 | ≤ 1.40° (initial pose); ≤ 0.27° from 1 s |

**Unexpected observations:**
1. The unload time-out on every body, the subject of this report.
2. Nothing else: no abort, no chatter, no energy event, no limit approach, and the run is fully deterministic.

**Process record:**
- The declared harness test (lift 0 mm, V2-REF; `official/harness_test/`) ran before the official battery and **already showed the time-out**. The pre-lift phase does not depend on the lift height.
- Nothing was changed in response. The official battery ran on the same frozen harness.

## 2. Measurements of the failure (`official/runs/`)

Lifted foot over 7–9 s (λ at stance = 1.0):

| body | sensed load (N) | % BW | release threshold (1 % BW, N) | lifecycle state | knee flexion |
|---|---|---|---|---|---|
| V2-REF (L) | 8.61–8.77 | 1.11–1.13 | 7.74 | SUPPORT throughout | 24.2° |
| V2-REF (R, mirrored) | 8.62–8.77 | 1.11–1.13 | 7.74 | SUPPORT | 24.2° |
| V2-165-62 | 7.59–7.70 | 1.23–1.25 | 6.17 | SUPPORT | 25.8° |
| V2-198-92 | 9.27–9.47 | 1.02–1.04 | 9.11 | SUPPORT | 22.8° |
| V2-175-70 | 8.05–8.20 | 1.16–1.18 | 6.96 | SUPPORT | 24.8° |
| V2-190-85 | 8.97–9.13 | 1.06–1.08 | 8.43 | SUPPORT | 23.5° |
| V2-short-legs | 9.06–9.34 | 1.17–1.21 | 7.74 | SUPPORT | 24.5° |
| V2-long-legs | 8.10–8.18 | 1.05–1.06 | 7.74 | SUPPORT | 23.9° |
| V1-matched | 8.23–8.38 | 1.06–1.08 | 7.74 | SUPPORT | 23.5° |

The load is **flat** from 7 to 9 s (spread ≤ 0.28 N), with no trend toward release. A longer time-out would not have helped.

## 3. Causal diagnosis (`diagnosis/`; diagnostic runs of the pre-lift phase only, no lift, not E1a; `tools/e1a_unload_diag.mjs`)

### How release works in the lifecycle

`ctrl/v2_support.js`: a SUPPORT foot moves to UNLOADING only when `release = unloaded && !wanted`, i.e. sensed load < `loadOff` (1 % BW) and the plan does not want load there.
- **The request itself (zero share) does not release support.** Acceptance is intent-gated; release is load-gated only.
- Once released, the non-supporting leg holds the foot at its contact anchor with its height following the foot, so it stops pressing.

### One factor at a time (V2-REF; everything else as E1a)

| variant | lifted-foot load after the transfer | released? |
|---|---|---|
| **E1a configuration, drop 2.5 cm** | **8.6–8.7 N (1.11 % BW)** | **no** |
| drop 2.0 cm | dips below 1 % at about 6.7 s → released, then about 0.9 N | yes |
| drop 1.5 / 1.0 / 0.5 / 0 cm | below 1 % | yes |
| drop 2.5 cm, **old knee** | below 1 % (mean 4.4 N) | yes |
| drop 2.5 cm, **"current" twist policy** (ikRefTwist off) | below 1 % (mean 2.6 N) | yes |
| drop 2.5 cm, ankle k = 0 | 8.4 N (1.09 % BW) | no |

### Time course: 2.0 vs 2.5 cm

- The load falls almost identically through the transfer: 13.1 vs 11.2 N at 6.5 s.
- **At 2.0 cm** it crosses 1 % at about 6.7 s and the foot is released.
- **At 2.5 cm** it plateaus at 8.6–8.9 N, about 1 N above the threshold, and stays there.
- The support-state residual at zero requested share therefore **grows with the planned drop** and crosses the 1 % threshold between 2.0 and 2.5 cm.
- The corrected knee's reference path and the reference twist policy each **add** to it: removing either brings it below the threshold.

### Source

- The left leg's passive tissue torques are **≈ 0** (hip, knee and ankle within their zero-torque zones). The residual is **applied by the actuated support-leg control**, the G3 support path of a foot at s = 1.
- **Not yet isolated:** which term of that control (posture-servo geometry, the pelvis target frame, the twist reference) produces the force.

### Why the qualification did not catch it

- The pre-E1a lifecycle validations at the planned drop (the boundary harness, yaw scenario B) unloaded the foot with an **external 30 N lift**, which forces release.
- The no-drop checks (G3 U:R, contact-gap check) have residuals of 0.08–0.5 % BW.
- **Intent-only release at the planned 2.5 cm drop in the adopted configuration was first exercised by E1a itself.**

## 4. The smallest blocker

**The support → unload release of the to-be-lifted foot.**
- With the preregistered 2.5 cm pelvis drop, the actuated support leg keeps 1.02–1.25 % BW on a foot the plan has fully unloaded.
- The lifecycle releases support only below 1 % BW, so the protocol never reaches its lift.
- The rest of the E1a chain (lift, hover, touchdown, load acceptance) is **untested**, not failed.

## 5. Alternatives (none applied; each changes something frozen, so each needs your approval and its own preregistered validation before E1a is re-run unchanged)

| | option | assessment |
|---|---|---|
| **A** | **Intent-gated release** in the lifecycle: release support when the plan requests (near-)zero share on a contacting foot for a sustained time **and** its load is below a stated bound. This is the mirror image of the existing intent-gated acceptance | Principled: removes the asymmetry that caused the deadlock (support can be entered on intent but left only on load). After release the existing non-supporting servo already stops the pressing (the 2.0 cm case falls to about 0.9 N). Needs bounds derived from the design, not from these numbers, plus regression of the G3 lifecycle rows (T5 / E2 keep 3–4 % BW on a touching foot), the boundary harness and the E1a-configuration gates |
| B | **Make the support leg stop pressing at zero share**: find which support-path term generates the residual (§3, "not yet isolated") and correct it | Addresses the force itself. Needs the term identified first; a controller change with G2 / G3 regression |
| C | Raise `loadOff` (e.g. to 1.5 % BW) | **Not recommended:** a threshold picked just above the observed residual is selection by outcome, and it stays fragile |
| D | Change the preregistered protocol (smaller planned drop, e.g. 2.0 cm) | **Not recommended:** selected from this failure. The 2.5 cm drop exists for reach margin (prereg §2), and the margin at 2.0 cm is unknown for other bodies |
| E | Revert the knee or the twist policy | Rejected by your decisions |

## 6. Recommendation

1. **Do not authorise E1b.** E1a has not yet tested a lift.
2. **Approve a short diagnostic step** to isolate the support-path term producing the residual (§3, "not yet isolated"). It is cheap and decides between A and B on evidence.
3. **Then likely adopt A** (intent-gated release, symmetric with acceptance) as a versioned lifecycle change, with a preregistered validation:
   - the G3 lifecycle rows;
   - the boundary harness;
   - the E1a-configuration G2 / G3;
   - an unload check at the planned drop on all 8 bodies.
   Add B only if the residual turns out to be a defect in its own right.
4. **Then re-run E1a exactly as frozen.** The protocol, criteria and harness stay unchanged; only the approved lifecycle version changes, under a new configuration addendum.

**Regression status:** no simulation or controller code has changed since the freeze. KV0 is 4 / 4 bit-identical and the suite is 52 / 52 after the run.
