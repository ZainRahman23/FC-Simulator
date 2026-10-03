# Ankle neutral-zone stiffness re-investigation on the corrected (flat-plane) plant: pre-registration — **DRAFT, NOT YET PRE-REGISTERED**

> **Status: DRAFT.** G3 on the flat plane is 18/19 (row J2; `../g3/G3_REVALIDATION_FLAT_PLANE.md`). The user decision says the ankle question reopens only after G1 → G2 → G3 is clean. This plan is therefore **not started and not pre-registered**. It will be finalised and committed as the pre-registration, before any run with k > 0, once the user has decided on J2.

**Source:** `../sources/2026-10-03_user_decision_flat_plane_turf_reopen_g1.md` §10.
- "Do not immediately adopt k=0.10, 0.11, 0.15, or any other stiffness … The previous stiffness results are contaminated by the turf-box collision defect. Re-test the literature-supported whole-ankle internal/external-rotation range independently … Choose nothing based on G3 score alone. If the corrected plant still cannot support an evidence-backed passive law, stop with the evidence."
- And §12: "do not automatically adopt it. Present the final ankle candidate and before/after evidence for my approval."

**Precondition:** on the flat plane at k = 0, G1 v4 PASS (`e17bc73`) and G2 PASS (`13b0848`) are met. **G3 v2 is pending the J2 decision.**

**The earlier ankle results are history, not evidence for this decision.** They are `../g3/G3_ANKLE_LAW_STOP_REPORT.md`, `../ankle_law_k010_validation/` and `../ankle_law_sensitivity/`. They were measured on the box turf, whose reversed-manifold defect (Investigation B) produced the blow-ups.

## The law (unchanged form; only k varies)

- **Form:** G3-R7, implemented in the passive layer and selected for diagnostics by `V2_ANKLE_NEUTRAL_K` (N·m/°, Node only).
- **Axis:** the passive-only ankle foot ab/adduction (whole-complex internal/external rotation about the tibial axis).
- **Shape:** linear inside the approved ±10° soft range, centred at the anatomical neutral; saturating at k·10° beyond it.
- **On top, unchanged:** the approved end-range law and end-stop.
- **Properties:** conservative, convex, restoring, internal = external rotation, L = R.
- **The code default stays k = 0 throughout. Nothing is adopted by this investigation.**

## Evidence and tested values

| source (full text) | measurement | secant at 1.7 N·m |
|---|---|---|
| Hattori 2022 | cadaver, 5 N axial load, calcaneus vs tibia, subtalar free | 0.12–0.14 N·m/° |
| Watanabe 2012 (Int Orthop) | in vivo, unloaded, whole complex | 0.11–0.15 N·m/° |

- **Evidence range:** [0.11, 0.15] N·m/°. Its centre, **0.13**, is the middle of both direct-match ranges.
- **Candidates:** k = **0.11, 0.13, 0.15** (lower bound, centre, upper bound).
- **Continuity point (report only, not a candidate):** k = 0.10, the earlier pre-registered value. It shows which of the earlier failures were turf contamination.
- **Baseline:** k = 0 on the plane (the validated G1 / G2 / G3 runs).
- Out-of-range values (0.3 / 0.5) are **not** tested. They were unsupported before and remain so.

## Requirements per candidate (all must hold; same tools and criteria as the accepted gates — nothing loosened)

| # | requirement (user decision §10) | measured by | pass |
|---|---|---|---|
| A | **remains passive** | G0 (incl. 0.9n); G1 passive-joint rig (row 5, implementation = spec law); G1 energy rows; 1.2e passivity diagnostic over the 240 Hz main suite; G2 / G3 ledger residual | G0 PASS; rig 34/34; G1 energy rows pass; **no 1.2e flag at 240 Hz**; every G2 / G3 gate-run ledger residual ≤ +0.5 J |
| B | **passes G1** | full `g1_run.js` (criteria v4, incl. 1.4m / 1.4n) | **0 failing gate checks**. Changes against k = 0 (postures, landing) are reported |
| C | **reduces the 10–18° free twist** | `tools/g3_twist.mjs` (twist set: G2 push R10 / R20 / F15; G3 T1, T5, U:R, T8 hold R push R10; torque-step probe at λ 0.95 / 1.0) | in the G3 pre-step states (**T5 and U:R**, both legs) the max ankle twist is **≤ half of the k = 0 plane value**, **and** the torque-step probe **re-centres** (offset 5.9 s after release ≤ 2°). G2 and T8 twist reported |
| D | **preserves G2** | full 620-job `g2_run.js` | every criteria-v1 row passes (R superseded); **no push-boundary decrease** in any body × direction; symmetry 12/12. Outcome changes reported |
| E | **improves or preserves G3** | full `g3_run.js` + `g3_mirror_pairs.mjs`, criteria v2 | **every v2 row that passes at k = 0 on the plane still passes**. S2 cost does not depend on k; it is re-benchmarked only for a presented candidate |
| F | **does not drag the unloaded foot** | U:R / U:L for all 8 bodies (F2, I2), plus the unloaded foot's world-yaw rotation | unloaded-foot slip ≤ 2 mm, lift ≤ 5 mm, tilt ≤ 3° in every U run of every body (the F2 limits). World yaw reported |
| G | **valid across morphology variants** | G1 row 6 (4 variants + V1-matched), G2 (8 bodies), G3 I2 (8 bodies) | all pass |

**Order per k:** G0 → G1 → G2 → G3 (+ mirror pairs) → twist / probe.

Every requirement is evaluated and reported for every candidate, even after a failure, so the evidence is complete. The runs write to the standard result paths, so each k's outputs are moved to `ankle_plane/k<k>/` and the committed k = 0 results are restored afterwards. The viewers therefore always show the accepted k = 0 plant.

## Selection rule (fixed now; no selection by G3 score)

1. A candidate is **evidence-supported** only if it lies in [0.11, 0.15] and meets **A–G**.
2. If several are, the one **nearest the evidence centre 0.13** is presented. On a tie, the lower k is presented, as the reading closer to the more flexible near-neutral region. All the others' results are shown beside it.
3. **G3 row values, push boundaries and twist magnitudes are never compared between passing candidates to choose one.**
4. If no candidate meets A–G, **stop with the evidence** (user decision §10).
5. A presented candidate is **not adopted**. It goes to the user with before / after evidence.
   - Its browser = Node checks (G1 1.6c, G2 D, G3 O) need the law in the browser.
   - By design the env selector is Node-only.
   - For a presented candidate they are run through a diagnostic, default-off viewer parameter, documented with the result.

## Stop conditions

Stop for the user's decision on any of:
- a material architectural incompatibility;
- an engine-level event (any 1.4m / 1.4n violation, any blow-up) at a candidate k;
- a need to change anatomy, actuator capacity, controller tuning, criteria or the law's form.
