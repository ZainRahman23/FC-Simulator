# E2 preregistration amendment A1 + B1 (versioned; written before any further run)

**Authority:** user decision 2026-10-06 (`../sources/2026-10-06_user_decision_e2_A1_B1.md`).

**Amends:** `E2_PREREGISTRATION_v2.md` and `E2_DESIGN_v2.md` §4 (swing sequencing). Everything not named here is unchanged, including **every numerical threshold**. Not chosen: A2 (raise the apex), A3 (later window), B2 (loosen thresholds), B3 (accept the failures).

**Configuration:** **PSTAR5B** = PSTAR4 + `e2: 2`.
- `e2: true` (PSTAR5) stays reproducible.
- `e2: 2` adds only the B1 sequencing below.

## A1 — swing-phase measurements relative to measured physical liftoff

**Why the previous definition was wrong.** Swing fractions were measured from the step command. The planned swing then started while the foot was still on the turf. Physical liftoff had already been measured at 154–171 ms after a lift command (E1b profile, 8 bodies; `research/E2_TIMING_LOAD_ASSUMPTIONS.md` §2), which is 26–29 % of a 0.6 s swing. So the "20 %" clearance window began before liftoff. The smoke confirmed this: liftoff at φ 0.19, clearance 1.1 mm at φ 0.20.

**Corrected definition:**
- t_lo = the measured, confirmed physical liftoff: the swing foot's LIFTOFF → AIRBORNE transition (E2-2's definition).
- The swing phase is [t_lo, t_TD], where t_TD = the planned touchdown of the post-liftoff swing (last adopted segment).
- φ(t) = (t − t_lo) / (t_TD − t_lo).

**Applies to (thresholds unchanged):**
- E2-3: no turf contact between liftoff and φ 0.6; swept clearance ≥ **5 mm** for φ ∈ [0.2, 0.8]; tracking window from liftoff to contact (unchanged);
- E2-5: one TOUCHDOWN at φ ≥ 0.6;
- §2a and the sequencer's early-contact gate: 60 % of the post-liftoff swing;
- the planner's clearance certificate: φ of the post-liftoff swing segment.

**Unchanged:** E2-2 still measures liftoff from the step command (within 0.3 s).

## B1 — vertical liftoff phase first, swing from the measured liftoff state

1. **LIFT (from the step command).** The swing foot's target is the validated E1b lift reference:
   - anchor + 20 mm · minjerk(τ / 0.6 s), vertical only, anchor yaw;
   - its measured AIRBORNE delay is 167–171 ms.
2. **Liftoff confirmed** (the lifecycle's measured AIRBORNE; Jolt contact decides). The commanded swing starts at t_lo **from the measured foot state**:
   - position: foot origin from the simulation state;
   - velocity: foot origin velocity v + ω × (origin − COM);
   - orientation: rotation vector of the measured foot relative to the foothold frame;
   - angular velocity: the measured angular velocity in that frame;
   - acceleration: the lift reference's acceleration at t_lo. The measured acceleration is a noisy finite difference; using the commanded acceleration keeps the commanded acceleration continuous.
   - There is no teleport and no state reset. The reference position and velocity move to the measured foot (the servo error becomes 0); nothing physical changes.
3. **Recomputed swing (BLF SwingFootPlanner construction):**
   - horizontal quintic to the foothold at rest;
   - vertical two-quintic through the apex knot {anchor height (max with the foothold) + 25 mm, at t_lo + 0.5·T}, interior knot by BLF's QuinticSpline solve (verified identical to BLF's 2×2 system), landing velocity 0;
   - **T = the 0.60 s seed, measured from t_lo**, so the planned touchdown is t_lo + 0.60 s.
4. **Timing consequence, reported rather than compressed.** The total step (command → touchdown) becomes the liftoff delay + 0.60 s ≈ 0.77 s. Before B1 it was 0.60 s from the command; the swing is not compressed to keep the old schedule. This matches the design's capture horizon "remaining liftoff delay + swing T".
5. **Online re-certification at t_lo.** The recomputed swing's path (IK), clearance certificate and timed capture are certified from the measured state. A failure is recorded as NO_CERTIFIED (best effort continues) and counts against E2-18.
6. **No AIRBORNE by the end of the lift profile (0.6 s):** the step is abandoned. The foot goes back to the anchor along a quintic, then E1b's 4 s return to double support. E2-2 fails.

**Planner at the decision (step command).** The certified candidate must still be CERTIFIED_ONE_STEP before anything is executed.
- **Predicted liftoff delay:** 0.171 s, the measured maximum for this lift profile (conservative for capture).
- **Predicted liftoff state:** the lift reference at that time.
- **Timed capture:** contact at command + 0.171 + T + 0.04 s.
- **Clearance certificate and path:** on the post-liftoff segment from the predicted liftoff state.

## Order before the next official run

1. Implement B1 default-off (`e2: 2`).
2. KV0, PSTAR4 and PSTAR5 identity.
3. **Planning gate PG-1 … 3 under A1 / B1.**
4. Declared non-test smoke.
5. Freeze.
6. Staged official runs (commanded only):
   1. V2-REF forward, left (preferred), 240 Hz, no perturbation;
   2. mirror;
   3. 8 bodies forward;
   4. lateral;
   5. rates and perturbations.

Stop at any failure that would require changing architecture, physical parameters or a frozen numerical criterion. Recovery (issue C) is not addressed; the recovery smoke evidence is kept unchanged.
