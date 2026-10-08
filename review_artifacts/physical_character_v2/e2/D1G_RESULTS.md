# D1G validation (outside the TD2C battery): DOES NOT VALIDATE as preregistered. The guard itself behaves exactly as designed. The failing gates are driven by adjacent mechanisms the reach stress exposed → STOPPED before TD2C

**Authority:** `../sources/2026-10-07_user_decision_D1guard_TD2C.md`.

**Preregistration:** `D1G_TD2C_PREREG.md`:
- Parts I – III committed in 4051ba2 [published as 8e0cf07], before any D1G code;
- freeze step 2 with amendments A1 – A4 in 3914a0c [published as 19eb4d5], before any battery run.

**Battery:** `scripts/run_d1g_val.sh` on a clean archive of 3914a0c [published as 19eb4d5] (23:29 – 23:51):
- 774 / 774 jobs: DG-2 reach stress 288, DG-4 (a) repeats 24, DG-3 (a) mirror probes 24, DG-1 (c) SV-2 servo-on with the guard 438;
- evaluated by `tools/d1g_eval.mjs`.

**Evidence** (`evidence_d1g/`):
- `d1g_eval_summary.txt`, `d1g_eval.json.gz`;
- `logs/`, `records/` (all DG-2 runs), `unit/`;
- `sv2_eval_guarded.txt`;
- `diagnostics/` (post-hoc, labelled).

**Stop rule (prereg III.1 step 4) applied:**
- the TD2C battery was **not run**; D1G is **not adopted**;
- no E2 integration, no SV-2 re-qualification, no PG-1, no official E2.

TD2 and TD2B stay FAIL. Nothing is pushed.

## 1. Verdicts

| item | result | detail |
|---|---|---|
| DG-0 identity (default path) | **PASS** | at 3914a0c [published as 19eb4d5]: KV0 IDENTICAL, 58 / 58, 99c29491, b62309f5, 3dd9f13d, b63184da × 3, c76cadc7, 56717579, TD2B records 787cc0c9 / 83369114 (the TD2B earlyOOE blow-up reproduced with the guard off) |
| DG-1 (c) equivalence, SV-2 servo-on | **PASS** | 432 / 432 runs with zero invalid D1 evaluations are **bit-identical** to the SV-2 battery. The 6 engaged runs are V2-long-legs C-L11, the trajectory SV-2 already recorded as not executable for that body. The frozen SV-2 evaluator on the guarded records shows no newly failing item for them |
| DG-1 (a, b) | not run | they are part of the TD2C battery (stop rule). Smoke: AB, TDC nominal / beyond / noground, and V2-long-legs H-T45 all bit-identical with zero engagement |
| **DG-2** reach stress, guard on (144 runs) | **FAIL** (26 runs) | (i) finite: PASS; (ii) over-capacity 0: PASS; (iii) guard bound c = w · D_held / OFF = 0: PASS (0 violations); (v) every run reached the invalid region: PASS. **(iv) commanded \|τ0\| ≤ B_cmd: FAIL in 26 runs** (deep 12, diag 14; up to 4,233 N·m vs B_cmd 2,265 – 3,345 N·m by body) |
| **DG-3 (a)** controller-level mirror test | **FAIL** (4 of 4,056 samples) | everywhere else, validity flags identical, λ equal, and valid-sample D1 equal to 1.1 · 10⁻⁷ N·m. **4 samples** (V2-165-62 and V2-190-85, far hold): the bounded IK lands in different basins for mirrored inputs (§3.3) |
| DG-3 (b) closed-loop L / R engagement | PASS | |
| DG-4 (a) same-rate repeats | PASS | 24 / 24: end hashes and guard event logs identical |
| DG-4 (b) rate consistency and fade lengths | PASS | engaged at all three rates in every case; every complete fade / ramp lasted τ_g / dt ticks |
| **DG-5** energy (E1a-8 strict) | **FAIL** (43 runs) | Σ+ > 0.5 J in 37 runs, closure > 0.05 J per tick in 24. By rate: **180 Hz 37 / 48, 240 Hz 6 / 48, 480 Hz 0 / 48** |
| DG-6 guard transition law | PASS | exact law (c = w · src, held source, weight steps to 10⁻¹²). Guard-attributable step ≤ **6.19 N·m** (bound 13.3 – 40 N·m by rate). Held D1 ≤ 115.5 N·m |

## 2. What the guard demonstrably does (reach stress, same 144 cases each way)

| | guard OFF (PSTAR5CHAB) | guard ON (PSTAR5CHABG) |
|---|---|---|
| max commanded \|τ0\| | 5.6 · 10²⁰ – 4.4 · 10²¹ N·m | 2.1 – 4.2 · 10³ N·m |
| max closure per tick / max Σ+ | 311 – 477 J / 2,312 – 2,499 J | 0.05 – 0.25 J / 0.52 – 0.91 J |
| aborts / falls | 25 / 34 | 0 / 36 (all the deep condition; see §3.2) |
| D1 contribution | unbounded | ≤ 115.5 N·m held, faded at ≤ 6.2 N·m per tick |

**Obstacle smoke** (TD2C configuration; A1 / A3):
- +10 mm and +20 mm collisions are classified UNEXPECTED_OBSTACLE, held D1 ≤ 92 N·m, Σ+ ≤ 0.14 J, RECOVERED.
- In TD2B the same +10 mm case reached 10¹⁴ N·m and closure up to 477 J per tick.

## 3. Causal diagnosis of each failure (`diagnostics/`; post-hoc, labelled; nothing adopted)

**Counterfactuals** (`stress_counterfactuals.txt`):
- 6 heavy cases (deep × 4, far, diag);
- a scratch tree only (`counterfactual_patches.diff`);
- variants: **nod1** = no D1 command at all; **novff** = guard on + no joint-rate feed-forward on invalid-D1 ticks; **both**.

| case | frozen max \|τ0\| (dominant term) | nod1 | novff | both | Σ+ frozen → nod1 / novff / both |
|---|---|---|---|---|---|
| V2-198-92 L 240 deep | 3,964 (vff −3,766) | 2,967 (vff) | 986 (vff) | 878 (vff) | 0.522 → 0.488 / 0.479 / 0.472 |
| V2-165-62 L 180 deep | 2,061 (vff −1,963) | 1,832 | 654 | 614 | 0.646 → 0.589 / 0.454 / 0.439 |
| V2-REF L 180 deep | 1,807 (vff −1,711) | 1,755 | 865 | 807 | 0.552 → 0.548 / 0.545 / 0.534 |
| V2-190-85 L 180 deep | 2,116 (vff −2,009) | 2,151 | 874 | 868 | 0.610 → 0.601 / 0.607 / 0.596 |
| V2-198-92 L 240 far | 2,075 (vff −1,981) | 1,899 | 690 | 530 | 0.395 → 0.359 / 0.296 / 0.300 |
| V2-198-92 L 240 diag | 2,323 (vff −2,206) | 2,180 | 839 | 709 | 0.444 → 0.448 / 0.454 / 0.447 |

### 3.1 DG-2 (iv): the servo's joint-rate feed-forward, not D1

- In every breach the largest command is the **velocity feed-forward term of the swing-leg servo** (`vffServo`), on the hip flexion axis: ≈ (D + dt·K) · ω*, with ω* ≈ 21 rad/s at the straight-leg configuration reaching for an unreachable target.
  - This is the existing vffRate "sr" target-motion rate plus the A law's pelvis-motion rate.
  - It is bounded by the singularity-robust damping (μ0), but not small.
- D1's part at those ticks is −54 N·m and fading.
- **Removing D1 entirely changes the breach by ≤ 25 %.** Suppressing the rate feed-forward on invalid ticks lowers max \|τ0\| to 530 – 990 N·m. Even then the remainder is vff on near-boundary ticks that the validity rule passes.
- The applied torque is clamped by the actuators: over-capacity 0, finite everywhere.
- **Reading:**
  - the D1 guard fully removes the D1 runaway;
  - the user's requirement "unreachable / singular cases cannot produce unbounded actuator commands" is not met by the D1 guard alone, as I operationalised it (B_cmd = 10 × the body's largest isometric capacity);
  - the next contributor is the rate feed-forward.

### 3.2 DG-5: timestep-dependent energy closure at the leg's end range, not the guard and not the feed-forwards

- The failures are **rate-dependent:** 37 / 48 at 180 Hz, 6 / 48 at 240 Hz, **0 / 48 at 480 Hz** (Σ+ ≤ 0.235 J, closure ≤ 0.0082 J per tick there).
- They are **unaffected** by removing D1 or the rate feed-forward (Σ+ within 0.21 J of frozen in every counterfactual; with both removed it is still above 0.5 J for V2-REF and V2-190-85 deep at 180 Hz).
- Σ+ accrues mainly while the extended leg is **held for 1.5 s** against the unreachable target (hold 0.19 – 0.47 J vs swing 0.04 – 0.29 J). 8 of the 24 per-tick spikes are in falls of the deep condition, which falls with the guard off too: the posture's reach-feasibility pelvis lowering.
- **This matches the recorded debt TD-15 / Phase G** (the passive layer's explicit end-range remainder at 180 Hz: "converges, dissipative" in its own study). I did not isolate it further: no per-joint passive work ledger exists.
- The prereg's A3 smoke flagged this risk (Σ+ 0.39 – 0.41 J at V2-REF 240 Hz).

### 3.3 DG-3 (a): the bounded IK is not mirror-equivariant at a reach-boundary fold (4 samples)

Sensitivity probe (`mirror_ik_sensitivity.txt`):
- **t 9.8625 (V2-165-62) and 9.875 (V2-190-85):** the left solve's reachability **flips** under a 10⁻¹³ relative input perturbation, to exactly the mirrored side's value: a basin boundary.
- **t 9.8375 and 9.85 (V2-165-62):** both sides are robust to 10⁻¹³ – 10⁻¹¹ perturbations yet differ (left unreached 2.9 – 4.1 · 10⁻⁴; right reached 6 · 10⁻¹⁶). A genuine L / R difference in the IK's result near this fold. Cause not isolated (warm start vs mirrored joint-frame arithmetic).
- **The guard rule is leg-agnostic.** The differing validity follows the differing IK result.

## 4. Decisions needed (none taken)

1. **The rate feed-forward at unreachable / singular targets (DG-2 (iv)).** Options:
   - (a) a versioned extension: the same validity rule and fade for the servo's velocity feed-forward (rT target-motion and the A law's rP terms). Counterfactual: breaches removed in the 6 cases, max 0.5 – 1.0 kN·m; not validated.
   - (b) accept the sr-damped, actuator-clamped feed-forward as "bounded" and keep B_cmd reported, not gated. A criterion change: yours.
   - (c) other.
2. **The energy gate on the reach stress (DG-5).** The closure grows at 180 Hz with a leg held at its end range, independent of the guard. Options:
   - (a) treat it as the pre-existing 180 Hz end-range integration debt (TD-15) outside the guard's scope (e.g. gate DG-5 where the plant integration is qualified, report 180 Hz);
   - (b) investigate / fix the 180 Hz end-range remainder first;
   - (c) other.
3. **The IK mirror fold (DG-3 (a), 4 / 4,056 samples).** Accept as an IK-level finding with the guard rule's symmetry shown structurally, or investigate the bounded IK at the reach boundary.
4. **Then:** a fresh versioned D1G validation (and, on a pass, the frozen TD2C battery and the prerequisite sequence).

**Recommendation:**
- 1 (a) as a separately preregistered "feed-forward guard", the same rule and battery;
- 2 (a) with TD-15 recorded as gating for any later 180 Hz certification;
- 3 accept, reported.

The guard's own properties (DG-1 (c), DG-3 (b), DG-4, DG-6, DG-2 (i – iii, v)) all passed, and it removes the defect the user asked to correct (10²⁰ N·m / 2,500 J → bounded, continuous, symmetric, deterministic).
