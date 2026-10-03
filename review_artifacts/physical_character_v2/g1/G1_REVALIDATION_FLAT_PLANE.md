# V2-G1 revalidation on the flat-plane turf — **PASS** (criteria v4, pre-registered in `68693b9`)

**Sources:**
- `../sources/2026-10-03_user_decision_flat_plane_turf_reopen_g1.md`;
- Investigation B (`../engine_blowup_B/B_REPORT.md`);
- criteria `G1_CRITERIA_v4_FLAT_PLANE.md`.

**Evidence:** `json/g1_results.json`, `json/g1_browser.json`, `G1_TABLES.md`, `flat_plane_validation/`, `heel_plane/`. The box-turf G1 is preserved in `../box_turf_history/g1/`.

## 1. Flat-plane implementation

`core/v2_jolt.js` `TURF`:
- **The turf is a Jolt `PlaneShape`:** plane y = 0, normal +Y, half-extent ±100 m (a full pitch centred on the origin).
- **Collision is analytic** (`PlaneShape::sCollideConvexVsPlane`): support point of the convex shape opposite the normal; **contact normal = the plane normal by construction**. There is no GJK, no EPA, and no bottom or side face.
- **Unchanged:** surface height, coordinates, gravity, friction / restitution policy (same listener, same turf material), boot, body, joints, human parameters, solver and contact settings.
- **The historical 100 × 2 × 100 m box** stays selectable only as a diagnostic: `turf: "box"`, and `B_TURF=box` (the default) for the Investigation B tools, so every historical reproducer still reproduces.

## 2. Result: **G1 PASS, 0 failing gate checks** (257 s)

| row | result |
|---|---|
| 1.S V2-REF | **17/17** scenarios pass every criterion, including 1.4m and 1.4n |
| 1.S′ V1-matched | **17/17** |
| 6 body variants | **40/40** |
| 1.6a determinism ×3, two processes | 17/17 |
| 1.6b snapshot / restore | bit-exact (upright, awkward, drop1m, isoSelfCol) |
| 1.6c browser = Node | **10/10** (`g1_browser.mjs`) |
| 5 passive joint rig / 5c couplings | 34/34 / as specified |
| 8 timestep 180 / 240 / 360 / 720 Hz | invariants (now including 1.4m) hold for every member at every rate; no 240 Hz timing effect. The reported landing effects are as before (leanF bistable landing) |
| 7.HS envelope | **8/8**, including the new HS.5 turf-contact validity |
| 1.1f free-body floor, V1 frozen, Jolt pinned | as before |
| 1.5 iteration study (report) | 150 iterations: 17/17; none of 10 / 15 / 20 / 30 qualifies (as before) |

## 3. Do the known reversed-manifold cases disappear? **Yes, all of them.**

| evidence | box | **plane** |
|---|---|---|
| **19 recorded blow-up states** (k = 0 … 0.5; 240 / 360 / 720 Hz; 30 / 60 / 150 iterations). Box control step, then the same exact state with the production plane (`b_plane_events.mjs`) | each reproduces: reversed manifold, **+182 J … +75,766 J** | **0 invalid manifolds; event step ΔE −0.94 … 0.000 J; clean 0.5 s window** |
| **local perturbations** around those 19 states (turf slid x / z ±1 m in 1 mm steps, lifted ±300 µm in 1 µm steps; the simulation's own narrow phase) | — | **0 invalid** in 174,914 queries |
| **the perturbation class that exposed k = 0**, plus the G1 set, rate study, iteration study and G1's own iteration study (1,181 runs, monitored every step) | 4 distinct reversed-manifold events + tilted manifolds | **0 invalid turf manifolds** (97.6 M manifolds) |
| **native statistical battery** (Jolt v5.6.0, 9 boot hulls × 25 M face-flush poses, gap −5 … +10 mm, positions ±90 m) | 2,110 reversals per 175 M poses (the box) | **0 reversed, 0 tilted, 0 off-surface in 225 M poses** |

**Structural argument: the failure chain is impossible on the plane.**
- The failure chain is: GJK misclassification → EPA unconverged opposite triangle → box bottom-face selection → position-solver teleport.
- With the plane, the boot–turf pair is dispatched to `PlaneShape::sCollideConvexVsPlane`. That code calls no GJK or EPA, sets the penetration axis to the plane normal, and builds the turf-side face on the plane itself.
- There is no other face to select. A reversed or tilted turf axis cannot arise, and every observation above agrees.

## 4. Permanent invariant results (final G1 run, 74 main-suite runs plus the rate ensembles and envelope)

| row | status | result |
|---|---|---|
| **1.4m turf-contact validity** | gate (every scenario, every rate, HS.5) | **0 invalid manifolds** everywhere |
| **1.4n turf envelope** | gate at 240 Hz | non-extreme maxima: depth 6.94 mm (limit 10), turf-body correction 0.53 mm (limit 5). impact15 (extreme, report-only) exceeds as expected (depth ≈ 40 mm) |
| 1.2e passivity | permanent diagnostic | main suite 0 flags (max step 0.0002 J). The 720 Hz flags (5 V1-matched awkward ensemble members, ≤ 0.21 J) are a self-contact residual: TD-14 |
| 1.4k teleport | permanent diagnostic | non-extreme max 1.60 mm; impact15 flagged (report) |

**Tolerances were re-established from healthy flat-plane runs** (criteria v4). The box-era passivity (0.05 J) and teleport (5 mm) values remain comfortably valid (45× and 3× margins) and were retained. The turf-geometry tolerances were tightened to the plane's exact geometry: n_y ≥ 0.999, |y| ≤ 0.1 mm.

## 5. Plane vs historical box (254 paired runs, the G1 set, k = 0; `tools/b_turf_compare.mjs`)

**No systematic difference in any physical quantity:**
- the paired median Δ is 0.000 for all 16 metrics;
- no metric moves one way in ≥ 75 % of runs.

Chaotic falls sometimes end differently:
- final posture agrees in 241 / 254 runs;
- final COM shift median 4 mm, p95 0.17 m, max 0.53 m;
- first non-foot contact body agrees in 190 / 217 runs.

| metric | box median / p95 / max | plane median / p95 / max | paired median Δ | plane higher / lower |
|---|---|---|---|---|
| first turf contact (ms) | 145.8 / 445.8 / 550.0 | 145.8 / 445.8 / 550.0 | 0 | 0 % / 15 % |
| first non-foot contact (ms) | 444.4 / 688.9 / 758.3 | 444.4 / 688.9 / 758.3 | 0 | 0 % / 12 % |
| turf penetration transient (mm) | 1.13 / 5.03 / 39.5 | 1.15 / 5.02 / 39.5 | 0 | 24 % / 28 % |
| turf penetration at rest (mm) | 0.22 / 2.11 / 4.99 | 0.25 / 1.85 / 5.05 | 0 | 39 % / 38 % |
| boot slip path while touching (mm) | 331 / 977 / 8,295 | 341 / 967 / 8,295 | 0 | 42 % / 43 % |
| boot roll max while touching (°) | 80.1 / 87.6 / 87.8 | 80.2 / 87.6 / 88.2 | 0 | 27 % / 34 % |
| anatomical overshoot max (°) | 9.25 / 20.8 / 24.5 | 9.26 / 21.4 / 24.5 | 0 | 43 % / 42 % |
| settled excursion beyond ROM (°) | 0.00 / 0.23 / 1.58 | 0.00 / 0.33 / 1.43 | 0 | 11 % / 12 % |
| joint separation max (mm) | 1.11 / 4.39 / 22.8 | 1.11 / 4.39 / 22.8 | 0 | 10 % / 14 % |
| energy dissipated (J) | 677 / 1,460 / 9,056 | 679 / 1,460 / 9,056 | 0 | 39 % / 46 % |
| viscous damping dissipated (J) | 148 / 220 / 448 | 148 / 219 / 447 | 0 | 41 % / 44 % |

Full table: `flat_plane_validation/turf_compare.md`.

**Heel rise** (`heel_plane/`):
- The validated case **V0 is identical**: heel peak 237.55 mm, pitch 69.98°. So are the boot-geometry and convergence variants (≤ 0.4 mm).
- Only the unphysical "ankle tissue off" counterfactuals change (V4 275 → 263 mm, V6 282 → 249 mm). With no ankle tissue, the foot meets the turf in different configurations.

**Gate requirements remain valid.** The plane removes the defect without changing landing, contact timing, penetration, slip, roll, excursions or dissipation in distribution.

## 6. Performance

Lying on the turf, 150 iterations: physics **0.274 ms/tick (plane) vs 0.296 (box), −7 %**. The analytic plane collision is cheaper than GJK / EPA. The other cost components are unchanged.

## 7. Technical debt after the G1 revalidation

| item | status |
|---|---|
| **TD-12** (narrow-phase reversed turf manifolds) | **resolved by the plane** for turf contacts. The underlying Jolt EPA defect remains for convex–convex pairs (self-contact, obstacles); no reversed self-contact manifold has been observed. Upstream draft kept (not sent) |
| **TD-14 (new)** | 720 Hz self-contact convergence residual: upper-arm ↔ abdomen + shoulder point constraint, ≤ 0.21 J one-step rise, report-only diagnostic flag |
| **TD-15 (new, from B)** | 180 Hz passive-layer explicit-remainder / linearisation gain under extreme triaxial end range: seen only in k > 0 trajectories, net dissipative over 2 steps, not at 240 Hz |
| out of scope | V2-190-85 drop1m reaches the engine stop (1.3b) with either turf. V2-190-85 is not a G1 body |
| TD-1 … TD-11, TD-13 | unchanged |

**Decision status:** G1 v4 PASS on the flat-plane turf. G2 revalidation follows, per the user decision.
