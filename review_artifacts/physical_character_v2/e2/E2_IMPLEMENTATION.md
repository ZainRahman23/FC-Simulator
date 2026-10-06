# E2 implementation record (configuration PSTAR5)

**Authority:** user authorization 2026-10-06 (`../sources/2026-10-06_user_authorization_e2_implementation.md`).

**Frozen inputs (unchanged):** `E2_DESIGN_v2.md`, `E2_PREREGISTRATION_v2.md`.

**Status:** implemented, default-off; identity verified. The official run has **not** started: planning gate PG-1 fails (see `E2_PRE_OFFICIAL_RESULTS.md`).

This file records every implementation choice the frozen documents leave open, and every defect found and corrected before any official run. No choice below was made after an official result.

## 1. Modules (all default-off; option `e2` in `ctrl/v2_stand.js`)

| file | role | design § |
|---|---|---|
| `ctrl/v2_footstep.js` | the one planner: CERTIFIED_ONE_STEP / NO_CERTIFIED_ONE_STEP | §2, §5 |
| `ctrl/v2_dcm.js` | DCM reference layer (PyPnC structure); realisable-region geometry | §3 |
| `ctrl/v2_swing.js` (+ `stepSegment`, `stepAt`, `stepRef`) | explicit swing with apex knot | §4 |
| `ctrl/v2_step.js` | step sequencer on measured lifecycle events | §2, §4, §6 |
| `ctrl/v2_stand.js` (option `e2`) | request fields `xiRef` / `xiRefDot` replace ξ_ref and −ξ̇_ref/ω0 in the existing law; `info.qsRef`; tick states for the planner's IK | §3 |
| `gates/v2_g3.js` `supervised()` | class rule at t_cls → common planner; no stance-only abort after an accepted touchdown | §2 |
| `gates/v2_e2.js` | shared scenario builder (Node and browser) | prereg §1 |
| `tools/e2_run.mjs` | one run with full telemetry | user's telemetry list |
| `tools/e2_eval.mjs` | criteria E2-1 … 18, R-1 … 6 (operational definitions in its header) | prereg §2, §4 |
| `tools/e2_pg.mjs` | planning gates PG-1 … 3 (runs to the decision tick, no physical step) | prereg §3 |
| `viewer/e2.html`, `viewer/v2_e2_viewer.js`, `tools/e2_browser.mjs` | W: browser = Node | prereg §1 W |

**PSTAR5** = PSTAR4 + `e2: true`. No anatomy, mass, limit, capacity, passive-tissue, lifecycle or E1b constant changed. No robotics stack imported. No second balance controller.

## 2. Choices the frozen documents leave open (made before any physical run)

### 2.1 Swing (§4)
- The segment starts at the step command, from the current reference state (anchor at rest). T counts from the command, so physical liftoff happens inside T. The capture horizon's "remaining liftoff delay" term is therefore 0 by construction (contact is predicted at command + T + 0.04 s).
- Vertical axis: two quintics through the apex knot { z = max(start, goal) + apex, t = α·T }. The knot velocity and acceleration are solved from **jerk and snap continuity** (the quintic-spline interior-knot solve; C4 at the knot, which includes the design's C2). For the symmetric commanded case the knot is the apex (velocity 0).
- Recovery: one quintic, no knot (design: "no apex").
- Re-targets: a new segment from `stepRef` (p, v, a continuous). After the knot time, no knot.

### 2.2 DCM reference layer (§3)
- **First segment from the measured DCM and its rate.** The rate is the LIPM rate ω(ξ − p_prev), with p_prev the controller's commanded CoP of the previous tick, so p* is continuous at every (re)initialisation.
- **Commanded plan (d = 0):** Hermite from (ξ, ξ̇) to (r_s, 0) at the planned touchdown, then r_s. r_s is the controller's own stance reference at the decision (`info.xiRef`).
- **Re-initialisation at the accepted touchdown:** Hermite from the measured state to (r_mid, 0) over **T_ds = 4.0 s**. This is E1b's validated 4 s return; the frozen v2 text gives no duration.
- **r_mid** = the controller's own quiet-stance reference with both feet supporting at λ = 0.5 (`info.qsRef`, the same expression as the default path). The hand-back at DONE is therefore exact.
- **Recovery plan:**
  - R1/R2: VRP at the margin-shrunk achievable limit along the controller's lateral axis u, on ξ_ref's line. This is the validated model's p_lim. If the line misses the region, the nearest region point is used.
  - Integration: explicit Euler at the physics tick, identical in prediction and execution. Execution uses the measured support weight s.
  - R3: once the landed foot supports and ξ_ref is inside the region by copFull (4 mm), a Hermite to r_mid over **T_ds = 0.6 s**, the supervisor's own abortDur (its validated return duration).
- **λ request:** the plan VRP's fraction along the line between the feet's region centroids, ≤ 1 − the stance floor.

### 2.3 Acceptance (§6)
- **Commanded steps:** the plan's λ request reaching the lifecycle's wantShare (the validated E1b replace mechanism), with the plan's ramp T_r.
- **Recovery steps:** T-A's plan intent plus T_r and T-A's floor rule.
- T_r: commanded = the longest certifying ramp on {0.225 … 0.10 s} (the T-A rule); recovery = the slack-maximising one.

### 2.4 Planner (§2, §5)
- **Timed capture:** a 2-D forward prediction of the measured DCM under the implemented law:
  - the plan's ξ_ref is tracked by p* = ξ + kξ(ξ − ξ_ref) − ξ̇_ref/ω;
  - the CoP is clamped to the controller's realisable region: stance region ∪ share-weighted combinations with the landed region grown by s, landed share ≤ min(s, 1 − floor);
  - measured margins applied: copSS / copRamp / copFull, share lag 8 ms, landing uncertainty (base + 5.77·d/(ωn²T²)), timing margin 0.04 s.
- **Captured** = never more than 5 cm outside the final region (the validated "fellBeyond"), and inside at the horizon or captured early.
- **Also required:** the plan VRP inside the margin-shrunk region (the E2-17 predicate: > 5 mm for > 20 ms fails).
- **Slack:** bisection on an added touchdown delay (0.5 ms resolution, cap 0.5 s).
- **Reach:** the offline pipeline evaluated online at the decision (analytic rejection, then bounded soft-box IK). A node is certified only as a corner of a 1-cm cell whose 4 corners and centre are feasible and valid.
- **Path:** 11 samples of the planned trajectory, each IK-feasible.
- **Clearance certificate (commanded steps; §4 "certified with the swept boot geometry plus the bandwidth tracking-error envelope"):**
  - the lowest of all boot hull points at the reference pose;
  - minus e = max|p̈_ref|/ωn²;
  - must be ≥ 5 mm for φ ∈ [0.2, 0.8]. These are E2-3's window and threshold.
  - Recovery steps have no clearance criterion (R-1 … R-6), so none is applied.
- **Search:**
  - commanded: the nominal first, then corridor nodes by distance (IHMC projection toward the nominal); T = the seed;
  - recovery: certified nodes × T ∈ [T_min(d), 0.60] × ramps, maximising slack, then path-certify the best 5.
- **Re-planning while the swing foot is unloaded:** the current foothold is re-checked every tick with the adopted plan's landing uncertainty. Only if that check fails does a full re-plan run. Commanded re-plans keep the touchdown time. A NO_CERTIFIED re-plan is recorded and the last certified plan is kept. Freeze at the accepted touchdown.

### 2.5 Contact handling (§4) and supervisor
- **60 % gate**, with φ measured from the command.
- **Early contact:** accepted only if the planner certifies the contact location from the measured state (geometry, IK, timed capture), else it waits for the gate.
- **Late contact:** hold ≤ 0.3 s.
- **Failed touchdown:** a re-plan from the measured state to the planner's own (turf) footholds with T = T_min; never a declared contact.
- **Hand-back:** at the accepted touchdown the reference re-targets (C2) to the lifecycle's landed anchor over max(remaining, `accept`). It is cleared once there with a = 0.
- **Supervisor:**
  - after an accepted touchdown the stance-only abort test is suspended (the DS plan is the return);
  - before it, an abort follows the E1b path, and class B goes to the common planner at t_cls = max(abort, disturbance end) + 1 tick.
- **NO_CERTIFIED fallbacks:**
  - commanded: the step is not executed; return to double support by E1b's 4 s λ return;
  - recovery: T-A's in-place put-down continues.

## 3. Defects found and corrected before any official run (development and smoke only)

| # | defect | found by | correction |
|---|---|---|---|
| I-1 | mid-line `//` comments swallowed code (abort test `st`, `g.dt` / `g.abortDur`, `seq.command`) — the E1bTA-e1 pattern | KV0 crash; smoke (sequencer idle) | comments moved; scan of all edited files |
| I-2 | recovery VRP at the region point *nearest* ξ_ref instead of the design's achievable limit along u | PG-2 development (13 ms slack) | design rule implemented (`limitAlong`) |
| I-3 | planner prediction mixed absolute and plan-relative times for re-checks | review | absolute times throughout |
| I-4 | per-tick re-check recomputed the landing uncertainty with the *remaining* T (→ 9 cm near touchdown) | smoke SMK-1 (spurious NO_CERTIFIED re-plans) | the adopted plan's bound; re-plans add only the re-target displacement's term |
| I-5 | commanded acceptance by intent at contact → landed foot in SUPPORT with a zero load request, lifted by its leg (the G2-measured failure) | smoke SMK-1 | E1b's request-driven acceptance for commanded steps (intent for recovery only) |
| I-6 | one-tick λ = 1 at DONE (the harness read the sequencer's state one tick late) → 11 N·m step | smoke SMK-1 (E2-9) | the base request reads the sequencer's state in the same tick |
| I-7 | NO_CERTIFIED commanded decision left the body on one foot | review | E1b's 4 s return to double support |
| I-8 | evaluator E2-6 / R-4 compared realised load with the λ plan request, which the acceptance ramp caps by design | smoke SMK-R | the controller's commanded share (design §6.5); E1a-13 tracking keeps λ |
| I-9 | p15 protocol implemented only the P15 push | identity check | the E1b perturbation set, identical to `e1b_run.mjs` |
| I-10 | planner clearance certificate (§4) missing in the first implementation | review against §4 | implemented (§2.4) |

## 4. Identity (default and PSTAR4 protected)

- **KV0:** identical (`evidence_identity/kv0_hashcmp.txt`).
- `tools/e1b_run.mjs --config=PSTAR4`: V2-REF L none, V2-REF L P15, V2-165-62 L P15 are hash-identical to the E1b-closing runs.
- `tools/e2_run.mjs --protocol=p15`, PSTAR4 and **PSTAR5**: V2-REF L none, V2-REF L P15 (class A), V2-198-92 L PF, V2-REF L YAW, V2-165-62 L PR are hash-identical to the E1b-closing PSTAR4 runs. PSTAR5 is inert unless a step is commanded or class B is decided.

## 5. Evaluator operational definitions

Fixed in the `tools/e2_eval.mjs` header before any official run. Points worth stating:
- φ is measured from the command.
- E2-3 tracking window is liftoff → contact; clearance is the measured lowest boot point.
- E2-5 velocities are taken on the last row before contact.
- E2-6 ramp check uses the commanded share (I-8).
- E2-13 step length / width are compared with the final commanded foothold.
- E2-17 checks both the plan VRP and p* against the controller's support polygon.

## 6. Declared smoke set (non-test)

| id | run | purpose |
|---|---|---|
| SMK-1 | V2-REF, left swing, **0.07 m** forward (inside the certified corridor, not the 0.10 m nominal), 240 Hz | commanded path |
| SMK-1D | SMK-1 with the DIAGNOSTIC option `--diag=noclear` (clearance certificate computed and logged, not enforced; the evaluator marks such runs non-official) | the physical commanded step that I-10 / PG-1 otherwise block |
| SMK-R | V2-165-62, **right** lift, P15 at **180 Hz** (the R-B obligations are L 240 / 180 / 480 and R 240) | recovery path |

## 7. Amendment A1 + B1 (PSTAR5B, option `e2: 2`; `E2_PREREG_AMENDMENT_A1B1.md`)

**B1 sequencing:**
- LIFT (E1b lift reference) from the command;
- at the measured AIRBORNE, `startSwing` builds the swing from the measured foot state (origin position, origin velocity, orientation, angular velocity) with the lift reference's acceleration;
- T = 0.60 s from liftoff, apex knot at liftoff + T/2;
- online re-certification (path, clearance, timed capture);
- no liftoff by the end of the lift profile → foot back to the anchor, then E1b's return.

**Decision-time planning:** predicted liftoff delay 0.171 s; predicted liftoff state = the lift reference.

**A1 in the evaluator:** φ from the measured liftoff (t_S = t_air, asserted).

**Defects found in the B1 diagnostic smoke (before any official run):**

| # | defect | correction |
|---|---|---|
| I-11 | the one-tick re-anchoring was differenced by the swing velocity feed-forward (88.6 N·m, foot thrown back onto the turf) | `e2reanchor` excludes that tick from the target-motion feed-forward, like the controller's anchor re-captures |
| I-12 | early-contact acceptance ignored the planner's priorities (accepted a zero-length step) | contact location adopted only if the current foothold no longer certifies |

Results: `E2_A1B1_RESULTS.md`.
