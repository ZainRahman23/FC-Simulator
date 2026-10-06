# Swing-servo validation (acceleration feed-forward, D1) — preregistration, written before any servo run

**Authority:** user decision 2026-10-06 (`../sources/2026-10-06_user_decision_e2_D1.md`). Design: `SWING_ACCEL_FF_DESIGN.md`.

**Configurations:**
- **VAL-OFF** = PSTAR5B (swing servo as is);
- **VAL-ON** = PSTAR5C = PSTAR5B + `swingAccFF`.

Identical runs except for that one option. **No E2 step is run in this validation.**

## 1. Battery (`tools/swing_servo_val.mjs`)

**Coverage:** 8 bodies × both legs × 180 / 240 / 480 Hz × {OFF, ON} × 2 sequences = 192 runs. Each sequence:
1. runs the E1b pre-lift timeline (settle, 25 mm pelvis drop, 4 s transfer to the stance foot, release TOUCHING ≥ 0.5 s);
2. executes the trajectories below on the unloaded swing foot;
3. puts the foot back with E1b's replace and returns to double support.

**Trajectory construction:** every trajectory is the E2 swing construction (`stepSegment`):
- horizontal quintic to rest;
- vertical two-quintic through an apex knot (BLF solve) at max(start, goal height) + apex;
- from the current reference state, or at liftoff from the measured foot state (the B1 start, with its re-anchoring rule).

"Hover" = 20 mm above the anchor. Each trajectory is followed by a 0.5 s hold.

| id | set | from → to | T | apex |
|---|---|---|---|---|
| L1 | **representative** | measured liftoff (after the E1b lift reference) → anchor + 10 cm forward, hover height | 0.60 s | 25 mm |
| R1 | **representative** | back to the hover above the anchor | 0.60 s | 25 mm |
| L2 | **representative** | measured liftoff → anchor + 8 cm outward, hover height | 0.60 s | 25 mm |
| R2 | **representative** | back | 0.60 s | 25 mm |
| H1 | harder | hover → 10 cm forward, and back | 0.40 s each | 25 mm |
| H2 | harder | hover → 15 cm forward, and back | 0.50 s each | 25 mm |
| H3 | harder | hover → 10 cm forward, and back | 0.60 s each | 40 mm |
| H4 | harder | hover → 10 cm forward + 8 cm outward (diagonal), and back | 0.45 s each | 25 mm |
| H5 | harder | hover → 4.4 cm outward, and back, no knot (recovery-like) | 0.21 s each | — |

- **Sequence A:** L1, R1, H1, H2.
- **Sequence B:** L2, R2, H3, H4, H5.
- The stance request is single support throughout (E1b supervisor active). The trajectories are never altered to compensate for tracking error.

## 2. Measurements (per trajectory segment, foot origin vs the analytic reference)

- **Position error e_p:** RMS and peak, also per phase. Phases by φ = (t − t0)/T: rise [0, 0.4), apex [0.4, 0.6], descent (0.6, 1]; H5 by thirds.
- **Velocity error:** origin velocity v + ω × r vs v_ref (RMS, peak).
- **Acceleration error:** finite-differenced origin velocity vs a_ref (RMS; noisy, reported).
- **Phase lag τ\*:** the shift in [−100, 100] ms minimising RMS |p(t) − p_ref(t − τ)| over the segment (positive = lag).
- **Mechanism slope β:** least-squares slope of e_p on −a_ref/ωn², pooled over axes (ωn = 2π·4 Hz). A pure inertial lag gives β ≈ 1.
- **Lowest-boot-point deviation δ_low:** lowest boot hull point at the actual pose minus that at the reference pose. Negative = boot lower than planned. Minimum per phase.
- **Orientation:** tilt and yaw error peaks.
- **Torque, per swing-leg axis:** peak |τ|, peak |τ| / capacity, saturated rows, longest continuous saturation; over-capacity events.
- **Torque continuity:** applied Δτ and commanded Δτ0 per tick (E1b-7 limits 10 / 30 N·m, rate rule `maxJumpSmooth`). No exemption for the liftoff or re-anchoring ticks.
- **Energy:** ledger closure increment max and Σ+ over the run (E1a-8 rule).
- **Contact:** swing-foot touching pieces between measured liftoff and the put-down command; stance-foot slip.
- **Settling** in each hold: peak |e_p| in [0, 0.25) s and [0.25, 0.5) s; sign changes of e_p along the motion direction (0.2 mm deadband).
- **Supervisor abort:** recorded.

## 3. Criteria (VAL-ON unless stated)

| # | criterion | scope |
|---|---|---|
| V-1 | RMS position error ON ≤ 0.5 × OFF (same trajectory, body, leg, rate) | every trajectory, both sets |
| V-2 | mechanism: pooled β, OFF ≥ 0.5 and ON \|β\| ≤ 0.25 | per trajectory id, pooled over bodies, legs, rates; per-run values reported |
| V-3 | E2-level tracking: peak ≤ 10 mm, RMS ≤ 5 mm (E2-3's thresholds) | representative set, every body, leg, rate |
| V-4 | integrity: no over-capacity; saturation ≤ 5 % of segment rows and ≤ 50 ms continuous per axis; torque continuity (E1b-7 rule); energy closure (E1a-8 rule); no swing-foot contact; no supervisor abort | representative set. Harder set: over-capacity, continuity, energy, contact required; saturation and abort reported |
| V-5 | no oscillation: in each hold, the second-half peak ≤ max(first-half peak, 1 mm); ≤ 2 sign changes along the motion direction | every trajectory |
| V-6 | rate stability: \|peak(hz) − peak(240)\| ≤ 2 mm and \|RMS(hz) − RMS(240)\| ≤ 1 mm, hz ∈ {180, 480}, per body / leg / trajectory; V-1 … V-5 hold at every rate | representative set |

**Decision:** the servo validates iff V-1 … V-6 hold. Otherwise stop and report; no gain, bandwidth, trajectory or threshold is changed.

## 4. Tracking allowance for the E2 clearance certificate (rule fixed now; numbers come from this battery only)

**Allowance per phase:** e_allow(phase) = max(0, −min δ_low) over **every representative segment** (L1, R1, L2, R2) of VAL-ON, all bodies, legs and rates, within that phase:
- rise φ ∈ [0, 0.4), apex [0.4, 0.6], descent (0.6, 1];
- that is, the worst observed downward deviation of the actual lowest boot point from the reference pose's lowest boot point;
- no further margin.

**Why the representative set only:** it is the regime the certificate covers (T 0.6 s, 25 mm apex, 10 / 8 cm, both directions, liftoff starts included). The harder set only discriminates the servo.

**Certificate (PSTAR5C):**
- predicted tracked clearance(t) = lowest boot hull point at the reference pose(t) − e_allow(phase(t));
- certified iff ≥ 5 mm for φ ∈ [0.2, 0.8] of the post-liftoff swing (amendment A1);
- this replaces the symmetric bandwidth envelope, which was the bound of the servo *without* acceleration feed-forward.

**The allowance is not taken from any E2 run** (smokes, PG or official).

## 5. Order

1. Implement default-off (`swingAccFF`; PSTAR5C).
2. KV0 and identity: PSTAR4 / PSTAR5 / PSTAR5B unchanged.
3. This battery.
4. Evaluate V-1 … V-6.
5. If it validates: compute e_allow, set the certificate, run planning gate PG-1 … 3.
6. If PG certifies: declared non-test smoke (SMK-1 0.07 m, PSTAR5C), freeze, then the staged official runs from stage 1.

Stop at any failure that needs a change of architecture, gains, bandwidth, apex, duration or thresholds.
