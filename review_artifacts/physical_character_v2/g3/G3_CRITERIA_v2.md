# V2-G3 pass criteria, **v2 — an APPROVED POST-INVESTIGATION REVISION of v1** (pre-registered before the v2 validation runs)

**Status:**
- These are **not** the original criteria.
- **v1** (`G3_CRITERIA.md`, committed in `871ab62` before final run 1) remains the historical criteria. Its evaluations stay in the record:
  - run 1: 11/19;
  - run 2: 15/19;
  - run 3: 16/19 — rows I (short-legs 94.9 %), J (0.76 mm) and S (contended 0.152–0.173 ms) failed.
- **v2** replaces exactly the rows the user approved replacing:
  - **E, F, I:** support state defined from the departing foot (D3);
  - **J:** the measured mirror floor plus controller symmetry (D4);
  - **S:** an isolated benchmark (D5);
  - **P:** earlier gates re-validated after the approved plant change (D2).
- Every other row is identical to v1.

**Sources:** `../sources/2026-10-03_user_decision_g3_resolution_accepted_ankle_criteria_v2.md` (D1–D7); `G3_RESOLUTION_REPORT.md`; `../DECISIONS.md` G3-R1…R7.

## Configuration under test

- The plant is the accepted V2 plant with two approved changes:
  1. **deterministic math:** the standing controller (G3-R1) and the passive layer (G3-R1b);
  2. **the ankle neutral-zone law (G3-R7):** the passive-only ankle foot ab/adduction gets k = **0.10 N·m/°** (5.73 N·m/rad):
     - linear inside the approved ±10° soft range, centred at the anatomical neutral (the stance reference is at 0.000°);
     - saturating at k·10° = 1.0 N·m beyond it;
     - the approved end-range law and end-stop are unchanged and add on top;
     - conservative (U = ½kx² inside; linear beyond), convex, restoring, L = R, internal = external.
- The historical zero-neutral ankle remains reproducible bit-exactly with `V2_ANKLE_NEUTRAL_K=0` (verified 38/38 G2 hashes).
- **Controller:** `G3_STAND`, unchanged (contactSupport, holdUnloaded, ikFeasible, dcmFF), with the supervisor as in v1. No G3 tuning. The leg-IK timer is optional diagnostic instrumentation (`timeIK`), off in production.

## Ankle law: evidence, mapping, selection (pre-registered)

**The coordinate:** our `fabd` is rotation of the rigid foot relative to the shank about the foot's vertical axis (≈ the tibial long axis at neutral). That is foot **internal/external rotation (= ab/adduction) of the whole talocrural + subtalar complex**.

| class | sources | status for our coordinate |
|---|---|---|
| internal/external rotation, whole complex, calcaneus vs tibia, **subtalar free** | Hattori 2022 (cadaver, 5 N): 0.12–0.14 N·m/° · Watanabe 2012 Int Orthop (in vivo, unloaded): 0.11–0.15 N·m/° (secants at 1.7 N·m) | **direct match** |
| internal/external rotation, talocrural only (subtalar excluded or fixed) | Rasmussen 1982: 0.15–0.21 (unloaded) · Li 2023: 0.43 ± 0.09 (150 N, subtalar screwed, external rotation only) | a series sub-joint: stiffer than the complex. **Not used directly.** |
| **inversion / eversion** | Villamar 2022: ≈ 3× stiffer 0 → 50 % BW | **different axis. Not used.** |
| load effect on internal/external rotation | Stormont 1985, Tochigi 2006, Watanabe 2012 Clin Biomech (abstracts): load stiffens | direction only, no magnitude. **Not modelled.** |

**Selection, fixed before any run with the law:**
- **k = 0.10 N·m/°**, the near-neutral slope of the unloaded whole complex. The complex is most flexible near neutral (Chen 1988), below the 0.11–0.15 secants.
- Load stiffening is not modelled: it is an open item and makes the law a lower bound for the stance foot.
- The user's 0.3 / 0.4 / 0.5 did **not** remain supported after checking definitions. They are 2–4× the whole-complex value and need cross-axis extrapolation.

**Sensitivity (report-only, never used to choose):**
- k = 0.05 and 0.15 N·m/° (the evidence range);
- k = 0.3 and 0.5 N·m/° as **unsupported what-ifs**;
- k = 0 (the historical plant).

Each is reported for:
- ankle twist (`tools/g3_twist.mjs`);
- the G2 push grid;
- the G3 gate rows;
- the heel-rise drop.

## Definitions (new or changed in v2)

| term | definition |
|---|---|
| **Unloaded (departing) foot load** | That foot's measured vertical contact force, as % of body weight (unchanged measurement). Stance-foot percentages are still reported in every table. |
| **Settled window** (near-single-support) | From **1.0 s after the transfer ramp ends** (= 0.5 s after the v1 hold-window start) to the end of the hold. |
| **Swing-ready window** (U tests) | The U hold window: from 2.0 s after the ramp ends to the end of the hold (unchanged from v1 row F). |
| **Meaningful sliding** | Either mirrored trial has a foot displaced > **1.0 mm** from its start at any tick. The initial contact settle is ≈ 0.26 mm. |
| **Mirror comparison** | `tools/g3_mirror_pairs.mjs`: both trials re-run and compared per tick in the mirrored frame (feet swapped, lateral sign flipped). |
| **Positional difference** | Max over the run of the horizontal distance between each foot's displacement and its mirror partner's. |

## Gate rows (v2)

| # | criterion | pass |
|---|---|---|
| run, A, B, C, D | as v1 | as v1 |
| **E2** | **Near-single-support**: T5 / T6, request 0.97, hold 10 s | Stood. In the **settled window**: unloaded-foot load ≤ **5 % BW**; that foot still touching (≥ 1 piece); COM and measured CoP inside the stance foot; ξ margin ≥ 1.0 cm. Slip ≤ 1 mm. Pelvis roll ≤ 5°, trunk lean ≤ 5°. Final load_R within 0.5 ± 0.03. Stance % reported. |
| **F2** | **Swing-ready / full unloading**: U:R / U:L, request 1.0 / 0.0 | Stood. Over the swing-ready window: unloaded-foot load ≤ **2 % BW**. No material drag or relocation: unloaded-foot slip ≤ 2 mm, lift ≤ 5 mm, tilt ≤ 3°. Stance controlled: COM inside the stance foot, ξ margin ≥ 1.0 cm, pelvis roll ≤ 5°, trunk lean ≤ 5°. Final load_R within 0.5 ± 0.03. |
| G, H | as v1 | as v1 |
| **I2** | **Every body variant** (8): T9 near-single-support cycle **and** U:R / U:L per body | Every body: T9 stood, both holds meet E2's settled conditions, slip ≤ 1 mm, final 0.5 ± 0.03; **and** U:R and U:L each meet F2. |
| **J2** | **Mirror symmetry**: T1/T2, T5/T6, U:R/U:L, T7 R/L (all 6 ramps), the 64 T8 mirrored pairs, U:R/U:L of all 8 bodies, plus the T9 R/L holds | Non-sliding pairs: positional difference ≤ **0.1 mm**. Sliding pairs: same outcome class and positional difference ≤ **2.0 mm**. **In every pair, controller symmetry:** identical supervisor decision and abort time (≤ 1 tick); requested λ mirror-identical (≤ 1e-9); commanded CoP mirror-identical within **0.1 mm before any sliding**; run lengths equal. T9 R vs L hold means within 1e-3. Sliding pairs may not hide a controller difference: the commanded-CoP check applies to every pair. |
| K, L, M, N, O | as v1 | as v1 |
| **P2** | **Earlier gates after the approved plant change** | G0 passes, including the new row 0.9n (neutral-zone law form). G1 criteria (v3 + v3.1) PASS on the full G1 run. G1 browser = Node. G2 criteria v1: every row passes except row R ("G1 unchanged"), which the approved plant change supersedes (replaced by the G1 PASS above). G2 browser = Node. |
| Q | as v1 | as v1 |
| **S2** | **Controller cost**: isolated benchmark | **Controller + actuator computation ≤ 0.15 ms per tick, averaged**. Statistic: per-tick mean over the steady part (t ≥ 1 s), median across trials. Median and p99 are reported. |

**S2 benchmark method (pre-registered):** `tools/g3_bench.mjs`.
- One isolated process, with no other validation or simulation job running (checked before the start).
- Fixed workload: G3 T5, V2-REF, gate configuration.
- One full discarded warm-up run, then **7 trials**.
- Per-tick samples of (a) controller only and (b) controller + actuator computation. The actuator part is reported as (b) − (a).
- Production configuration: the optional leg-IK timer is off. A separate T5 benchmark with the timer on reports the instrumentation overhead, and `performance.now()` cost is calibrated.
- T3, U:R, T8 hold R push R 10 and G2 quiet stance are reported too.

**Scope decision (D5).** Spec §20 defines the budget as *"controller | Budget ≤ 0.15 ms per player per physics tick averaged, **with the low-level motor update at 240 Hz** and balance / planning at lower or event-driven rates"*.
- The low-level motor update (actuator computation: capacity, activation, motor set-points) is **inside** the controller budget, so the spec resolves the ambiguity as **B: controller + actuator computation**.
- G2 row 2.5 used the same scope.
- Optional review instrumentation is excluded. The 0.15 ms number is unchanged.

## Reported, not gated (v2 additions)

- **Ankle law:**
  - the selected law and its evidence;
  - sensitivity across k = 0 / 0.05 / 0.10 / 0.15 (plus the unsupported what-ifs 0.3 / 0.5);
  - ankle twist before / after in G2 and G3 (`tools/g3_twist.mjs`);
  - single-support ankle behaviour (torque-step probe);
  - energy / passivity: G0 0.9n, G1 energy rows, the G1 passive-joint rig (implementation = spec law), and the G2 / G3 ledger residual ≤ +0.5 J.
- **Changes relative to the accepted G1 / G2 baselines** (`tools/regress_compare.mjs`, `tools/heel_compare.mjs`): outcome changes, push-boundary and symmetry changes (G2 2.2b), and heel-rise metrics.
- **Unloaded-foot hold (D6):**
  - authority audit: joint-space finite-actuator commands only; no world write; no constraint;
  - actuator demand of the held leg (per axis peak / mean torque and fraction of capacity, from `holdDemand`).
- **D7 handoff (preserved):** with the unloaded-foot hold removed, 5–10 N·s disturbances relocate a fully unloaded foot by ≈ 31–67 mm. Swing-leg control in G4 must own the free foot's trajectory; it must not be pinned.
- **v1 rows on the same run, historical:** shown alongside v2, never replacing v1's record.
