# Touchdown coordinator: design stage STOPPED before preregistration (substantive conflict)

**Authority:** `../sources/2026-10-06_user_decision_AB2_coordinator.md` (and the architecture of `../sources/2026-10-06_user_decision_AB_touchdown.md`).

**Rule applied:** "If any stage fails substantively, stop at that stage and diagnose it rather than tuning downstream values."

The coordinator was designed, implemented as a default-off module and checked on design-verification smoke runs (6 cases per iteration). Those smoke runs found requirement conflicts that no consistent preregistration can resolve within the preserved constraints:
- swing time T = 0.6 s;
- apex knot at T / 2, 30 mm;
- the validated A + B servo capability;
- the validated tracking uncertainty.

So the coordinator was **not** frozen, validated or adopted.

**Not done:**
- no coordinator battery;
- no E2-5 change;
- no PG-1;
- no official E2.

T-1, the 30 mm apex and every threshold are unchanged. Recovery issue C is untouched. Nothing is pushed.

## 1. What exists (default-off, used by nothing)

**`ctrl/v2_touchdown.js`, a reusable coordinator** with explicit phases:

APPROACH (swing + corridor + bounded contact search) → CONTACT (accommodation) → HOLD → TRANSFER → SUPPORT, plus NO_CONTACT.
- Policy object; contact is read only from the measured Jolt touching pieces.
- `tdPlan`: the final-approach reference. Horizontal motion and orientation complete at the corridor entry. The vertical descends to the entry state, then a monotone C2 corridor quintic ends at zero velocity and acceleration, followed by a bounded rest-to-rest search.
  - Constraints: the validated acceleration and jerk envelope, and the late-descent validity domain of the uncertainty.
  - A geometry check on the reference's real lowest sole point during the descent.
- `contactAnchor` / `accPlan`: the realised landed pose, terrain-aligned and flattened about the realised contact point; a C2 accommodation over the lifecycle's `accept` time.
- `TouchdownCoordinator`: release onto the lifecycle's contact-compatible hold at the anchor through `SupportLifecycle.setHold` (new, unused by default), then the lifecycle's own load acceptance.

**`tools/td_val.mjs`, the harness:** the SV-2 timeline, A + B, the coordinator in place of E2's swing and hand-back, and full touchdown telemetry.

## 2. Inputs (validated A + B data, `evidence_ab`; numbers identical to AB2's deterministic records)

| quantity | value | source / rule |
|---|---|---|
| downward lowest-sole-point uncertainty u_dn | 1.53 mm | same-time deviation, φ ≥ 0.75 → contact, all sets (R 1.20, C 1.38, H 1.53) |
| upward uncertainty u_up | 0.305 mm | same window |
| contact-report margin d_c | 0.5 mm | the probe's definition: a turf manifold point at ≤ 0.5 mm separation counts as touching (observed max 0.40 mm) |
| corridor entry height h_e | u_dn + d_c + v_e·dt_max ≈ 2.1 – 2.4 mm | contact cannot be measured before the speed bound holds |
| corridor shape factor β* | 1.833 | minimum peak deceleration among monotone, decelerating, speed-bounded quintics (β ∈ [5/3, ≈ 2.06]) |
| global envelope | a_H 2.83, a_V 3.74 m/s²; α 0.27 rad/s²; j_H 63.3, j_V 81.8 m/s³ | max over the validated A + B references |
| late-descent validity domain of u_dn | below 11.06 mm: \|a_V\| ≤ 2.63, \|v_V\| ≤ 0.217, \|j_V\| ≤ 49.5, \|j_H\| ≤ 29.5 | the kinematic conditions under which u_dn was measured |
| contact-point normal-velocity uncertainty | ≤ 0.0375 m/s | lowest-point vs reference lowest-point rate, late descent |
| human evidence | Winter 1992 (Phys Ther 72:45–53, PMID 1728048): "heel-contact velocity was negligible vertically" | supports a zero nominal terminal normal velocity |

The decision's "Astra research" is not present in this workspace. The Astra files on disk are the observatory specification, the evidence reports and the migration handoff. The decision's own stated principles were used.

## 3. Design-verification findings (smoke runs, in order; each led to the next principled constraint, never to a passing value)

| # | design state | finding | consequence |
|---|---|---|---|
| 1 | corridor duration from the acceleration envelope only (τ_c ≈ 136 ms, v_e 22 mm/s) | contact **before** the corridor in 2 of 4. The compressed descent decelerates at ≤ 3.05 m/s² just before entry, and the sole runs 1.58 – 1.65 mm below the reference (> 1.53) | u_dn is valid only inside its validated late-descent conditions → late-descent domain added |
| 2 | + late domain (τ_c 122 ms, v_e 25 mm/s) | contact still marginally early (φ 0.792 vs entry 0.797). Jolt reports touching at 0.15 – 0.28 mm separation, with no force | the measured-contact margin is collision geometry → d_c = 0.5 mm added to the band |
| 3 | + d_c (τ_c 128 ms, v_e 31.7 mm/s, h_e 2.21 mm) | contact now inside the corridor in 6 / 6. But see the three rows below | |
| 3a | | **contact-point normal velocity 0.050 – 0.084 m/s** on the heaviest body's lateral step (bound v_e + 0.0375 = 0.069); tangential up to 0.10 m/s | the foot pitches at 0.42 – 0.44 rad/s at contact. The pelvis rotates strongly (yaw rate reversing +0.8 → −0.77 rad/s; roll to 0.78 rad/s); the foot holds orientation (≤ 0.08 rad/s) until the corridor entry, where the compressed horizontal deceleration ends and pelvis roll peaks. A cancels the pelvis *rate*; no feed-forward covers the pelvis *angular acceleration* (the AB diagnosis's unattributed floating-base remainder) |
| 3b | | **swing-phase E1a-7 violations** (none in the AB battery on the same cases): commanded Δτ0 30 – 53 N·m / tick at 240 Hz (≈ 12.7 kN·m/s) over φ 0.68 – 0.76 on V2-198-92 R-L (9 / 11 / 20 ticks at 180 / 240 / 480 Hz) and V2-REF H-D (6) | filling the acceleration envelope raises jerk; E1a-7 bounds the commanded torque **rate** → jerk is part of capability (jerk envelope added) |
| 3c | | contact-transition violations persist on V2-198-92 R-L (180 Hz: 3, max commanded 52.3; 240 Hz: 2, 32.2; 480 Hz: 0) | the near-contact rate comes mainly from the pelvis-motion feed-forward × the contact gain blend (AB §2), which the reference shape does not remove |
| 4 | orientation completed at the apex knot (for settling) | infeasible for every case: from the measured liftoff rates it exceeds the validated angular envelope (0.27 rad/s²) | orientation stays complete at the corridor entry |
| 5 | + jerk envelope | **infeasible for every case** | §4 |

## 4. The conflict (offline geometry, no simulation; `evidence_td_design/`)

With T = 0.6 s and the knot at T / 2, my corridor construction (zero acceleration at entry) has a minimum peak vertical jerk of **≈ 64 m/s³** at τ_c ≈ 0.09 s, above the late-descent 49.5. Short corridors need a fast entry, so the corridor quintic's jerk explodes; long ones compress the free descent.

A **free entry deceleration** (the best construction found) makes the vertical alone feasible inside every validated envelope. The **slowest such corridor has v_e = 60 mm/s** (τ_c 95 ms, a_e 1.2 m/s², h_e 2.4 mm), against about 84 mm/s for today's profile at the same height.

**Tangential:** completing it before the corridor raises the late-descent horizontal jerk to 32 – 57 m/s³ (R-F; validated 29.5) for any τ_c ≥ 0.05 s. The original E2 reference sits at 27.4.

**Conclusion.** Within the preserved timing and the validated capability, no C2 final approach can simultaneously:
1. complete tangential motion before the contact band;
2. bound the normal approach speed low (the best is ≈ 60 mm/s);
3. stay inside the validated jerk envelope.

**Independently:**
- On heavy lateral steps the contact-point velocity is dominated by pelvis-rotation-induced foot rotation (≈ 0.4 rad/s), which no reference shape removes.
- The near-contact torque continuity (AB-4a / 4b) on V2-198-92 R-L is driven by the pelvis-motion feed-forward through the contact gain blend. The coordinator's reference changes alone did not eliminate it.

## 5. Decisions needed (none taken)

1. **Timing for the final approach.** Pick one:
   - (a) a longer T, or an apex knot earlier than T / 2;
   - (b) **contact-seeking placement**: the existing validated swing ends at rest at the top of the uncertainty band (sole ≈ 2.1 – 2.4 mm) at T, and contact is made in the bounded slow search below it.
     - The free swing keeps every validated property: same accelerations and jerk, tangential motion and orientation complete at T.
     - Contact happens at the search speed.
     - Cost: touchdown up to (h_e + u_up) / v_s after T, e.g. ≈ 0.04 s at 62 mm/s, ≈ 0.12 s at 20 mm/s. That changes the E2 planner's touchdown-time assumption.
   - Both (a) and (b) change preserved E2 timing semantics.
2. **Capability.** A servo validation at higher jerk (corridor-shaped profiles) to widen the envelope, and/or a narrower uncertainty band from closing the remaining floating-base term: a pelvis angular-acceleration feed-forward in D1. That would also address finding 3a.
3. **Near-contact continuity.** The pelvis-motion feed-forward's contribution through the contact gain blend needs a transition design of its own, e.g. its rate bounded or blended with the gains rather than with the airborne weight alone. This is a servo-transition change and needs its own validation.
4. **Requirement level.** Accept a higher bounded approach speed (≈ 60 mm/s) with tangential motion only mostly complete. Not recommended without (2).

**Recommendation, for decision:**
- (2), the pelvis angular-acceleration feed-forward diagnosis, first: it targets the common cause of 3a, 3c and part of u_dn.
- Then (1b), contact-seeking placement: it keeps the validated swing intact and turns the decision's bounded search into the low-speed mechanism.
- Both before any coordinator preregistration.
