# Swing-servo validation, version 2 (SV-2): PROPOSAL for decision (not frozen, not implemented, not run)

**Authority:** user decision 2026-10-06 (`../sources/2026-10-06_user_decision_e2_apex30.md`):
- treat the old battery separately from E2 qualification;
- propose a versioned battery representative of the intended operating envelope, with harder but physically reachable cases;
- preserve the old battery and results;
- do not declare D1 validated retroactively;
- stop before adopting a new servo-validation criterion.

**Historical evidence, preserved unchanged:**

| battery | documents | result |
|---|---|---|
| v1 (D1 as first built) | `SWING_SERVO_VALIDATION_PREREG.md`, `SWING_SERVO_VALIDATION_RESULTS.md`, `evidence_servo/` | does not validate |
| amendment S | `SWING_SERVO_VALIDATION_PREREG_AMENDMENT_S.md` | superseded, never run |
| amendment S2 (corrected rate + continuous re-anchor) | `SWING_SERVO_VALIDATION_PREREG_AMENDMENT_S2.md`, `SWING_SERVO_VALIDATION_RESULTS_S2.md`, `evidence_servo_H/` | does not validate |

**Why a new version is needed** (measured, `SWING_SERVO_VALIDATION_RESULTS_S2.md`, `E2_A30_PG1_RESULTS.md`):
- the v1 representative segments end at hover, rising about 1.8× the E2 swing;
- they end in an in-air stop, so the "descent" allowance is set by the stop overshoot at φ → 1;
- elevated trajectories saturate the shorter bodies' reach: V-1 and torque-continuity failures with D1 off and on;
- the per-run energy Σ+ budget accumulates ∝ dt over long multi-segment runs, also with D1 off;
- V-2 assumes the OFF error is purely inertial. That is false where the uncorrected pelvis-motion term contributes (γ ≈ 0.25);
- the per-phase allowance cannot resolve the binding point φ ≈ 0.8.

**SV-2 changes the battery to fit the E2 envelope.** Where a criterion's form must change, the change is listed explicitly (§6) for decision.

## 1. Purpose and separation from E2

SV-2 validates the swing servo: the VAL-OFF / VAL-ON pair differs only in D1. It is the only source of the planner's tracked-clearance allowance.
- It is independent of the planner: no footstep planning or certificate is used, and trajectories are commanded directly.
- It is independent of E2 runs: no E2 run, smoke, PG or official result enters it.
- E2 qualification stays E2's own criteria.

| | configuration |
|---|---|
| VAL-OFF | PSTAR5BH (`vffRate: "sr"` + `e2reanchorVel`) |
| VAL-ON | PSTAR5CH (+ `swingAccFF`) |

8 bodies × 2 legs × 180 / 240 / 480 Hz.

## 2. Operating envelope it must represent (frozen design + A1 / B1 + A30)

- **Commanded steps:** forward 0.10 m, lateral 0.08 m; the planner's reach corridor forward dx 0.07 – 0.13 m (dy ±0.02), lateral dy 0.05 – 0.11 m (dx ±0.02).
- **Timing and shape:** T 0.6 s from the measured, confirmed liftoff; apex knot 30 mm above max(start, goal) at T/2 (BLF); the E1b lift reference first (B1); the swing from the measured liftoff state with the continuous re-anchor.
- **Goal on the turf.** The descent ends in contact; with accurate tracking, contact comes at φ ≈ 0.85 – 0.90.
- **Certificate window:** φ ∈ [0.2, 0.8] of the post-liftoff swing.

## 3. Harness (new tool `tools/swing_servo_val2.mjs`, after approval)

Derived from `tools/swing_servo_val.mjs`:
- the E1b pre-lift timeline;
- single support on the stance foot throughout, so the swing foot never accepts load.

**Each run is one E2-length step pair:**
1. B1 lift from the anchor;
2. measured liftoff;
3. the commanded segment to a goal **on the turf**;
4. measured touchdown;
5. ≥ 0.5 s resting hold (contact ≠ support);
6. B1 lift from the new foothold;
7. the return segment to the anchor;
8. touchdown and hold;
9. E1b replace / return to double support.

**Run length is about E1a-length**, so the frozen E1a-8 energy rule applies to the duration and event count it was calibrated for (§6).

## 4. Trajectory sets

| id | set | segment (out; the return is the same shape back) | T | apex above max(start, goal) | why |
|---|---|---|---|---|---|
| R-F | **representative** | anchor → +0.10 m forward | 0.60 s | 30 mm | E2 S-F |
| R-L | **representative** | anchor → +0.08 m outward | 0.60 s | 30 mm | E2 S-L |
| C-F7 / C-F13 | corridor edge | +0.07 / +0.13 m forward | 0.60 s | 30 mm | planner corridor extremes |
| C-L5 / C-L11 | corridor edge | +0.05 / +0.11 m outward | 0.60 s | 30 mm | planner corridor extremes |
| H-T45 | harder | +0.10 m forward | **0.45 s** | 30 mm | 1.8× the accelerations |
| H-A40 | harder | +0.10 m forward | 0.60 s | **40 mm** | higher swing, still well below v1's 45 – 60 mm above the anchor |
| H-D | harder | +0.10 forward, +0.08 outward | 0.60 s | 30 mm | diagonal, outside the corridors |
| H-F15 | harder | +0.15 m forward | 0.60 s | 30 mm | beyond the corridor |
| (H-R21) | report only | +0.044 m outward, no knot | 0.21 s | — | recovery-like. Recovery (C) is untouched, so it is not gating |

**Mandatory reachability pre-check before freezing:**
- Every trajectory, sampled at 20 points, must be IK-FEASIBLE inside the soft-limit box from each body's battery start state. This is the planner's own `ikFeasible` test, at sampling only, no servo run.
- A case failing for any body is removed or shortened in the frozen version, and documented.
- So no failure can come from reach saturation by construction.
- Evidence so far: the A30 PG runs path-certify every corridor node for all 8 bodies (`evidence_pg_A30/E`). H-D, H-F15 and H-A40 still need the check.

## 5. Measurements (base §2, plus)

- Lowest-boot-point deviation per **0.05-φ bin** over [0, 0.8], recorded in two conventions:
  - **time-matched** (foot vs reference at the same instant);
  - **the frozen E2 evaluator's** (target computed one tick earlier). On the steep descent this reads 0.3 – 0.6 mm lower.
- Error decomposition by joint fit: acceleration slope β, velocity-lag γ (fraction of 2ζ/ωn), bias.
- Touchdown, reported only:
  - contact φ, approach normal / tangential speed;
  - instantaneous peak load;
  - max 10 ms and 20 ms window-mean load;
  - 20 ms and 50 ms impulse.
- Torque utilisation, activation-limited rows (flagged separately), Δτ / Δτ0, energy ledger per run.

## 6. Criteria (proposed; the differences from v1 need the user's decision)

| # | v1 | **SV-2 proposal** | reason |
|---|---|---|---|
| V-1 | RMS ON ≤ 0.5 × OFF, every trajectory | same, on **R and C**; H reported | H discriminates the servo; reach saturation is excluded by §4 |
| V-2 | β_OFF ≥ 0.5 and \|β_ON\| ≤ 0.25 per trajectory id | **\|β_ON\| ≤ 0.25 per trajectory id**; β_OFF and γ_OFF reported | D1's mechanism is that ON leaves no acceleration-correlated error. "OFF is purely inertial" is false where the uncorrected pelvis-motion term contributes (S2: γ ≈ 0.25 on returns) |
| V-3 | representative peak ≤ 10, RMS ≤ 5 mm | same thresholds (E2-3's), on R, C **and H**, over φ ∈ [0, 0.8] | before contact; harder cases must also meet E2-level tracking |
| V-4 | integrity incl. E1a-8 energy per run | **unchanged rules:** over-capacity 0; E1b-7 continuity incl. liftoff and touchdown ticks; saturation ≤ 5 % / ≤ 50 ms per axis (R, C); E1a-8 energy per run; no swing-foot contact before φ 0.6 | the energy rule is kept and applied to E1a-length runs (§3) instead of being re-scaled |
| V-5 | hold oscillation (in-air hold) | **no bounce or chatter at each touchdown** (E1a-6 / E2-5 lifecycle rules) | segments now end on the turf |
| V-6 | rate stability | same, R and C | — |

## 7. Allowance rule (proposed)

- **φ-resolved:** for each 0.05-φ bin in [0.2, 0.8], e_allow(bin) = max(0, −min δ_low) over every R and C segment of VAL-ON, all bodies, legs and rates.
- Measured in **the E2 evaluator's convention**, so the certificate is conservative relative to the criterion actually judged.
- No further margin. H excluded.
- **Certificate:** predicted clearance(φ) = reference lowest boot point(φ) − e_allow(bin(φ)) ≥ 5 mm for φ ∈ [0.2, 0.8].
  - This needs a planner change: `certifyClearance` reads a bin table, servo-keyed as now.

**For orientation only (not a criterion, not used to design anything above):**
- S2 and the 25 mm E2 matrix both give ≈ 0.75 mm at φ 0.75 – 0.80.
- That would leave 0.87 mm on the A30 reference (W3 in `E2_A30_PG1_RESULTS.md`).
- SV-2 may give a different number, and the amendment's margin then changes accordingly.

## 8. Order, if approved

1. User decision on §4 – §7.
2. Reachability pre-check; freeze the case list.
3. Implement `swing_servo_val2.mjs`, the evaluator and the certificate bin table.
4. Identity: KV0, PSTAR4 / 5x unchanged.
5. **Preregistration frozen and committed before any SV-2 run.**
6. Run (8 bodies × 2 legs × 3 rates × OFF / ON × 10 run types = 960 short runs, plus the report-only H-R21; about 2 h on 8 cores).
7. Evaluate.
8. If it validates: set the servo-keyed φ-resolved allowance, then PG-1 … 3 under A30.
9. If PG certifies: the bounded touchdown matrix (decision of 2026-10-06), then stop for the E2-5 decision before any official run.
