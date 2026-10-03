# V2-G1 pass criteria — **v4: the flat-plane turf** (an approved revision; pre-registered before the final G1 revalidation run)

**Source:** `../sources/2026-10-03_user_decision_flat_plane_turf_reopen_g1.md`. G1 is **reopened**: Investigation B (`../engine_blowup_B/B_REPORT.md`) showed that the accepted box-turf representation exposes a real contact-integrity defect in reachable G1 state space.

**Status:**
- These criteria are **v3 + v3.1** (`G1_CRITERIA.md`, accepted with G1) **plus** the changes listed below. Nothing else changes.
- The accepted box-turf G1 evaluation stays in the record (`../box_turf_history/g1/`).
- Pre-registration: committed before the final run. Tolerances were set from healthy flat-plane **development** runs, never from a failure.

## Configuration change (the only plant change)

**Turf.** The playable surface **y = 0** is a Jolt `PlaneShape`. `core/v2_jolt.js` `TURF`: normal +Y, half-extent 100 m (Jolt's bounding box for the plane; no collision outside it).
- Convex-vs-plane collision is analytic (`PlaneShape::sCollideConvexVsPlane`): the contact normal is the plane normal by construction, with no GJK / EPA and no finite bottom or side face.
- **Unchanged:** surface height, the coordinate system, gravity, friction / restitution policy (the turf material and per-sub-shape friction are unchanged; the same listener sets them), boot and body geometry, joint topology, human parameters, solver settings (240 Hz, 150 / 2 iterations), speculative distance, slop and Baumgarte.
- The historical 100 × 2 × 100 m box remains selectable **only as a diagnostic** (`turf: "box"`).

## Gate changes

| row | change | pass |
|---|---|---|
| **1.4m** (new, **gating**) | **Turf-contact validity**, in every non-extreme scenario, and as a physical **invariant at every rate** of the D4a study (added to `INV`). Every turf manifold must lie on the playable surface: turf-side points within 0.1 mm of y = 0, |x|, |z| ≤ the half-extent. Its normal must point out of the surface (n_y ≥ 0.999). This excludes any underside, bottom-face, side-face or off-surface contact. Violations report tick, body, piece, normal, contact points and state. Nothing is deleted or modified. | 0 invalid |
| **1.4n** (new, **gating** in the 240 Hz main suite: V2-REF, V1-matched and the four variants) | **Turf-contact envelope**: every turf manifold depth ≤ 10 mm (the validated transient envelope of 1.4a), and the position-solver move of any turf-touching body ≤ 5 mm per step. A dt-dependent accuracy quantity, so it is **reported** at the other D4a rates, as v3.1 does for 1.3a / 1.4d. | 0 violations |
| **HS.5** (new, gating in the C7 envelope) | 1.4m in the high-speed envelope. HS.5r reports the 1.4n envelope there (C7: high-speed penetration is reported, not banded). | 0 invalid |
| 1.2e (permanent report-only) | Passivity diagnostic: one-step rise of E = KE + PE + U ≤ 0.05 J | reported |
| 1.4k (permanent report-only) | Teleport diagnostic: any body's position-solver move ≤ 5 mm per step | reported |
| impact15 (extreme) | all rows report-only, as before (D4d) | — |

**ID note:** Investigation B called the turf row "1.4j". It is renamed **1.4m** because 1.4j is the existing isoSelfCol missed-self-collision row.

## Tolerance derivation (healthy flat-plane development runs)

The development runs (`tools/b_sweep.mjs` with `B_TURF=plane`) were: the G1 set (254), the 600-run perturbation class, the rate study (125), the iteration study (100) and G1's iteration study (102). They had **0 invalid turf manifolds** and were taken at k = 0, 150 iterations, non-extreme.

| quantity | healthy-plane maximum | tolerance | margin |
|---|---|---|---|
| normal deviation 1 − n_y | **0** (97.6 M manifolds) | 0.001 (n_y ≥ 0.999) | — |
| turf-side point height | 0.0009 mm | 0.1 mm | 110× |
| manifold depth | 7.08 mm (240 Hz), 7.13 mm (720 Hz) | 10 mm (= 1.4a) | 1.4× (the validated envelope) |
| turf-touching body correction | 0.92 mm (240 Hz), 1.43 mm (any rate) | 5 mm | 3.5× |
| teleport (any body) | 1.60 mm | 5 mm (box-era value retained) | 3.1× |
| one-step energy rise | 0.0011 J (240 Hz), 0.0067 J (360 Hz) | 0.05 J (box-era value retained) | 45× at 240 Hz |

At 720 Hz the passivity diagnostic flags 5 V1-matched awkward ensemble members (≤ 0.21 J). The cause is an upper-arm ↔ abdomen self-contact plus a shoulder point-constraint convergence residual; it is not turf-related, and the box-era equivalent was 0.069 J. It stays report-only and becomes debt.

## Additional required evidence (user decision §6; reported with the result)

- All 19 recorded Investigation-B blow-up states, box control vs production plane, plus local perturbations (`tools/b_plane_events.mjs`).
- The 1,054-run perturbation class on the plane, monitored.
- **The structural argument:** the plane collision code path contains no GJK / EPA.
- The native statistical battery against the `PlaneShape`.
- **Pass:** every one of these shows **0 invalid turf manifolds** and no reversed-manifold event.

## Reported, not gated (user decision §7)

A **plane vs box comparison** of the G1 runs (`tools/b_turf_compare.mjs`): landing and first-contact timing, penetration, slip, resting posture, foot roll, joint excursions, energy dissipation, final posture. Systematic differences are flagged and **not tuned away**.
