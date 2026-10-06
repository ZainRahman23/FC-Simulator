# E2 preregistration amendment A30: nominal swing apex 25 → 30 mm (written before any PG-1 or E2 run with it)

**Authority:** user decision 2026-10-06 (`../sources/2026-10-06_user_decision_e2_apex30.md`).

**Amends:**
- `E2_PREREGISTRATION_v2.md` and `E2_DESIGN_v2.md`: the provisional apex seed;
- as already amended by `E2_PREREG_AMENDMENT_A1B1.md` (A1 / B1).

**Version:** the commanded-step trajectory seeds are now versioned. In `gates/v2_e2.js` `E2TRAJ`, run field `traj`, tool flag `--traj`:
- `v2` (default) = frozen, bit-identical: KV0, PSTAR4, PSTAR5B smoke hash 99c29491, PG records unchanged apart from the planner's CPU-time field;
- `A30` = this amendment.

## 1. What changes

The nominal commanded-step apex: the apex knot height above max(start, goal height) goes from 25 mm to **30 mm**.

**Unchanged:**
- T = 0.6 s from the measured, confirmed liftoff;
- apex knot at 50 % of T, BLF knot solve;
- measured-liftoff swing semantics (A1 / B1);
- the lift reference and the planning liftoff delay;
- every E2 criterion and threshold: the 5 mm physical clearance over φ ∈ [0.2, 0.8], E2-3 tracking 10 / 5 mm, E2-5;
- the controller: corrected rate estimator `vffRate: "sr"`, continuous re-anchor `e2reanchorVel`, D1 `swingAccFF`;
- finite torque and Jolt authority;
- the S-LOW variant (8 mm, its own criteria).

The E2 configuration is PSTAR5CH (= PSTAR5B + `vffRate: "sr"` + `e2reanchorVel` + `swingAccFF`) with `traj: "A30"`.

## 2. Justification: measured tracking uncertainty and the clearance budget

**Reference geometry** (planning reference, body-independent: `tools/e2_apex_whatif.mjs`).
- The foot-origin height above the anchor is listed per φ bin, minimum within the bin.
- The reference lowest boot point is ≈ 0.08 mm higher: the PG records give 5.40 mm at φ 0.80 for 25 mm.

| φ bin | 0.20–0.25 | 0.25–0.40 | 0.40–0.60 | 0.60–0.65 | 0.65–0.70 | 0.70–0.75 | **0.75–0.80** |
|---|---|---|---|---|---|---|---|
| 25 mm (frozen) | 12.21 | ≥ 15.7 | ≥ 20.6 | 16.91 | 12.85 | 8.84 | **5.32** |
| **30 mm (A30)** | 13.41 | ≥ 17.7 | ≥ 24.9 | 20.58 | 15.69 | 10.82 | **6.52** |

**Measured tracking uncertainty:** the worst observed downward deviation of the actual lowest boot point from the reference pose's lowest boot point, per φ bin.

Sources:
- **(S2)** the independent servo battery (`SWING_SERVO_VALIDATION_RESULTS_S2.md`): VAL-ON representative segments, 8 bodies × 2 legs × 3 rates. The battery did **not** validate. These are measurements, not a validated allowance.
- **(E2)** the diagnostic non-test smoke matrix (`evidence_smoke_H/`): 25 mm, PSTAR5CH, 96 runs. Given time-matched and in the frozen evaluator's convention (target one tick earlier).

| φ bin | S2 worst (mm) | S2 excluding the reach-saturated V2-165-62 L2 | E2 worst, time-matched / evaluator (mm) |
|---|---|---|---|
| 0.20–0.25 | 3.72 | 3.48 | 3.13 / 2.42 |
| 0.25–0.40 | ≤ 4.80 | ≤ 4.12 | ≤ 3.41 / 2.75 |
| 0.40–0.60 | ≤ 6.66 | ≤ 3.38 | ≤ 2.54 / 2.25 |
| 0.60–0.65 | 2.24 | 1.73 | (foot above the reference) |
| 0.65–0.70 | 1.68 | 1.68 | (above) |
| 0.70–0.75 | 0.92 | 0.92 | (above) / 0.16 |
| **0.75–0.80** | **0.75** | 0.75 | **0.51 / 0.75** |

Notes:
- The descent deviations are small because the corrected servo's residual is a lag: the foot is high while descending.
- The large rise and apex values are the lag while rising plus, in S2, the reach-saturated high battery trajectories.

**Clearance budget at the binding point** (φ 0.75 – 0.80; the reference's lowest point, against the 5 mm requirement):

| | 25 mm (frozen) | **30 mm (A30)** |
|---|---|---|
| reference lowest boot point at φ 0.80 | 5.40 | **≈ 6.60** |
| budget for tracking + foot tilt | 0.40 | **1.60** |
| measured worst downward deviation there (S2; E2 evaluator convention) | 0.75 | 0.75 |
| remaining margin | **−0.35** (no margin) | **+0.85** |

Everywhere else in [0.2, 0.8], the 30 mm reference minus the per-bin S2 worst deviation is ≥ 9.77 mm (rise), ≥ 18 mm (apex) and ≥ 9.98 mm (φ 0.70 – 0.75), all far above 5 mm.

**Why 30 mm and not another value:**
- 30 mm covers the measured worst deviation at the binding point (0.75 mm) with a margin of 0.85 mm.
- That margin is of the order of the measured variation sources not in the S2 / E2 envelope:
  - the evaluator's one-tick convention on the steep descent, 0.3 – 0.6 mm;
  - the physical liftoff state, which raised the physical reference by +0.3 … +0.45 mm in every E2 smoke run.
- 26.5 – 27.5 mm leaves 0 – 0.3 mm.
- **It was not chosen from any run with 30 mm.** No E2 run, smoke, PG or battery with a 30 mm apex exists before this amendment. It is the value recommended in `E2_OVERNIGHT_REPORT.md` §12 from the 25 mm evidence above.

**Side effect, computed:** the descent speed at 1.5 mm reference height rises 0.055 → 0.059 m/s, and the reference reaches it at φ 0.888 vs 0.878. That is small for E2-5.

## 3. Correction to `E2_OVERNIGHT_REPORT.md` (found while writing this amendment)

The overnight report (§9, §12 option A3) said a "window-consistent" allowance — the §4 descent phase restricted to the certificate window (φ ≤ 0.8) — would be **0.75 mm**. **That is wrong.**
- The phase-binned descent allowance over (0.6, 0.8] is **2.24 mm**. It comes from the reach-saturated V2-165-62 L2 battery segment at φ ≈ 0.60, where the reference is about 20 mm and does not bind.
- **0.75 mm is the worst deviation only in φ 0.75 – 0.80.**
- The 30 mm budget above is therefore a **φ-resolved** budget.
- The planner's certificate, as implemented and preregistered, applies one allowance per phase (rise / apex / descent). With phase-binned S2 values it would not certify 30 mm: 6.60 − 2.24 = 4.36 mm.
- Only a φ-resolved allowance from a validated servo battery would. Section 4 accounts for this rather than hiding it.

## 4. PG-1 under A30: procedure and decision rule (fixed now)

**Runs:** `tools/e2_pg.mjs --traj=A30`.
- 32 commanded decisions: 8 bodies × L / R × forward 0.10 m / lateral 0.08 m (the preregistered steps), 240 Hz.
- Planner and certificate code unchanged.

**Gate (G):** the E2 configuration PSTAR5CH with A30.
- Its certificate is the tracked certificate. It requires a tracked-clearance allowance **validated for this servo** (`FS.clearAllow.servo`).
- No validation has passed: S2 did not validate, and per the decision D1 is not declared validated retroactively. So no allowance is set, and the planner refuses to certify (`refused` in the record).
- **PG-1 passes iff all 32 decisions are CERTIFIED_ONE_STEP under (G).**

**Reported, non-gating** (none of these may become the certificate without a user decision):
- **(E)** PSTAR5BH with A30: the servo-independent bandwidth-envelope certificate, the design's pre-D1 model. It is conservative for the D1 servo, and gives full planner output: path / reach / capture certification at 30 mm.
- **(W1)** PSTAR5CH with A30 and the S2 rule's allowance as a what-if: rise 4.80 / apex 6.66 / descent 3.17 mm (`tools/e2_allow_whatif_preload.mjs`).
- **(W2)** as W1 with the S2 allowance restricted to the certificate window per phase: rise 4.80 / apex 6.66 / descent 2.24 mm.
- **(W3)** the φ-resolved check, offline arithmetic on the planner's own A30 reference: margin(φ) = reference lowest point(φ) − S2 worst deviation of its φ bin, for φ ∈ [0.2, 0.8].

If PG-1 does not certify robustly across all 32 cases: **stop and report** (decision). No further apex change.
