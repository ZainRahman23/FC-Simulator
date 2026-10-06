# Swing-servo validation (D1, acceleration feed-forward): SERVO DOES NOT VALIDATE → STOPPED

**Preregistration:** `SWING_SERVO_VALIDATION_PREREG.md` (commit c9b9485). **Design:** `SWING_ACCEL_FF_DESIGN.md`.

**Implementation:** commit e160da7. Option `swingAccFF`, configuration PSTAR5C. KV0, PSTAR4 / 5 / 5B and PSTAR5C-on-E1b are all identical.

**Battery:** 192 / 192 runs from a clean copy of e160da7. Evidence: `evidence_servo/` (runs, `servo_eval.json`, summary, checks).

**Not done:** no E2 planning gate, smoke or official run under PSTAR5C. The trajectory, apex, T, bandwidth, gains and thresholds are unchanged.

## 1. The feed-forward is computed correctly

`tools/swing_ff_check.mjs` compares the Newton–Euler swing-subtree wrench, projected on the leg's 6 coordinates, with an **independent Lagrangian** M(x)ẍ + Ṁẋ − ½∂(ẋᵀMẋ)/∂x built from the same rigid-body data. They agree to **0.0006 %** (3 bodies × both legs). The term is the computed-torque inertial term of the rigid leg as derived.

## 2. Criteria

| # | result | finding |
|---|---|---|
| V-1 improvement (RMS ON ≤ 0.5 × OFF) | **FAIL** | the ratio is 0.6 – 0.9 on every E2-like trajectory; only the fast recovery-like H5 reaches about 0.46 |
| V-2 mechanism (β_OFF ≥ 0.5, \|β_ON\| ≤ 0.25) | **FAIL** | see §3 |
| V-3 E2-level tracking (peak ≤ 10 mm, RMS ≤ 5 mm) | **FAIL** | representative RMS with feed-forward is 4.0 – 6.6 mm; peaks up to 11 mm |
| V-4 integrity | **FAIL** | see the breakdown below |
| V-5 no oscillation | PASS | |
| V-6 rate stability | PASS | the errors are rate-independent |

**V-4 breakdown:**
- **Energy closure:** the Σ+ rule fails in 26 / 96 runs with feed-forward and 32 / 96 without. It is not introduced by the feed-forward.
- **Torque continuity and saturation:** 24 of 672 segments fail only with feed-forward, mainly the liftoff tick at 480 Hz (Δτ0 18.5 vs a rate-scaled 15 N·m). Saturation reached 7.3 % / 44 ms in 10 representative segments.
- No over-capacity, no swing-foot contact, no aborts.

**Representative trajectories (means over 8 bodies × 2 legs × 3 rates):**

| | RMS OFF → ON (mm) | peak OFF → ON (mm) | lag OFF → ON (ms) | torque max ON |
|---|---|---|---|---|
| L1 (liftoff → 10 cm forward) | 7.66 → 6.19 | 13.9 → 10.7 | 16.8 → 16.8 | 22 N·m (12 % capacity) |
| R1 | 5.69 → 3.97 | 8.7 → 6.8 | 20.7 → 11.8 | 20 N·m |
| L2 (liftoff → 8 cm outward) | 7.48 → 6.63 | 12.3 → 11.0 | 21.3 → 21.4 | 18 N·m |
| R2 | 4.68 → 4.03 | 8.1 → 7.7 | 18.2 → 15.2 | 17 N·m |

## 3. Why it fails (causal)

1. **The tracking error is mainly not the inertial lag D1 targets.**
   - Without feed-forward, the acceleration-correlation slope β is only −0.4 … +0.8 and changes sign with direction.
   - A joint fit (`lag_decomposition_V2-REF_L_240.txt`) shows a **consistent velocity-lag component of about 0.3 × the no-velocity-feed-forward lag (2ζ/ωn)·v** on every trajectory. On H5 it explains 93 % of the variance. That is an effective delay of about 20 ms, independent of the physics rate.
   - So the existing velocity feed-forward (`lcVff: "lin"`, E1b-validated) delivers only about 70 % of the damping compensation it is meant to. The cause is not identified. The passive viscous damping is 0.4 % (hip) / 2 % (knee) of the swing servo's, too small to explain it. The rate computation (one Gauss–Newton step, 1 % damping) is sound.
2. **Liftoff transient.** Liftoff-start trajectories lag more (17 – 21 ms) than hover-start ones (12 – 15 ms). For about 0.1 s after the measured liftoff the lifecycle blends the hip from its contact-mode gain (K 96 N·m/rad) to the swing servo (1896 N·m/rad).
3. **The feed-forward overcompensates the acceleration part (β_ON ≈ −0.5).** The rigid-leg inverse dynamics is exact for a fixed pelvis, but the body is floating and the remaining servo is lagging. The result is a phase lead in proportion to acceleration while the velocity lag remains.
4. **Clearance allowance (preregistered rule):** rise 10.8 mm, apex 11.3 mm, descent 4.1 mm.
   - The worst values are a vertical origin lag of about 10 – 11 mm while rising to the apex. Tilt contributes 0.1 – 1.3°.
   - The tracked-clearance certificate would need the reference ≥ 15.8 mm at φ 0.2 and ≥ 9.1 mm at φ 0.8. The frozen E2 swing gives about 10 mm and 5.4 mm, so PG-1 cannot certify the frozen commanded steps under PSTAR5C.
   - **Caveat, my preregistration choice:** the representative L1 / L2 end at hover height, so they rise about 44 mm to the apex, about 1.8× the E2 swing's 24 mm. The vertical lag, and so the allowance, is larger than in the E2 regime alone. This does not change V-1 / V-2, which fail on every trajectory including the small, fast H5.

**Classification:**
- D1 is implemented correctly and verified against an independent formulation.
- The servo still cannot provide the tracking margin the frozen trajectory needs within the existing finite-torque servo. The dominant residual is a pre-existing velocity-feed-forward shortfall plus the liftoff gain blend, not the inertial term.
- Per the decision: stop and report; no bandwidth, gain, trajectory or threshold tuning.

## 4. What a next decision would need to address (nothing applied)

| lever | changes |
|---|---|
| Find why `lcVff: "lin"` delivers only ~70 % of the damping compensation. Candidates: the actuation layer's implicit motor realisation (Jolt velocity motor), the IK-rate convention, pelvis coupling | an existing, E1b-validated mechanism; investigation first, then a decision |
| The liftoff gain blend (contact-mode → swing gains over 0.1 s) | lifecycle constants and design |
| A floating-base-aware feed-forward (reaction on the pelvis), only after the velocity part is understood | architecture |
| A validation trajectory matched to the E2 vertical profile (my preregistration's representative set rises 1.8× higher) | the preregistered battery definition (a re-preregistration) |

**My recommendation:**
1. First, a diagnostic-only investigation of the velocity-feed-forward shortfall (no behaviour change), because it is the largest, cleanest term (93 % of H5's variance) and it is pre-existing.
2. Then decide whether to correct it under the E1a / E1b regressions.

D1 remains implemented and default-off.
