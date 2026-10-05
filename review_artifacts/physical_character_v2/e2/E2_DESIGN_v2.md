# E2 architecture, version 2 (audit-corrected; FOR REVIEW; not implemented)

**Supersedes** `E2_DESIGN.md` (v1, kept unchanged).

**Source:** independent audit, "IMPLEMENT WITH SPECIFIC CHANGES" (`../sources/2026-10-05_user_instruction_e2_audit_corrections.md`).

**Planning-only prerequisites done:**
- `research/E2_TIMING_LOAD_ASSUMPTIONS.md`;
- `research/E2_REACH_AND_SNAPSHOTS.md`.

**Base:** PSTAR4 (E1b closed). Every E2 mechanism is a default-off option; with them off the code is bit-identical.

## 0. Preserved (audit)

- the physical body; finite-torque actuation; Jolt-authoritative contact;
- E1b's measured lifecycle; capture-aware step adjustment; BLF-derived swing;
- **one common mechanism for commanded and recovery steps.**

## 1. Donor map (audit §9)

| donor | used for | not imported |
|---|---|---|
| IHMC `OneStepCaptureRegionCalculator`, `CaptureRegionSafetyHeuristics`, `ErrorBasedStepAdjustmentController` | capture-region geometry, projection toward the nominal, deadband, freeze, infeasible flag | robot-specific constants (20–50 mm shrinks, Valkyrie reach), the QP / walking stack |
| PyPnC `DCMPlanner` | the minimal DCM / COM reference structure (§3) | its whole-body controller |
| BLF `SwingFootPlanner` | the trajectory mathematics (explicit quintic segments, interior-knot C2 continuity, re-planning from the current reference state) | its planner framework |
| Touchline lifecycle (E1b, PSTAR4) | physical contact, load and support state; T-A acceptance | — |
| Touchline IK certifier (`ik_cert_core`) | body-specific kinematic reach, final candidate and path certification | — |

## 2. Planning primitive: (foothold, touchdown timing, support / load-transition plan) — audit §1, §7

**One planner** (`ctrl/v2_footstep.js`) serves commanded and recovery steps. It returns either:
- **CERTIFIED_ONE_STEP** {foothold p*, swing duration T, planned touchdown, acceptance ramp T_r, DCM reference plan, robustness slack}; or
- **NO_CERTIFIED_ONE_STEP** (never silently clamped and called recovered; the controller then executes its best-effort fallback and the run is classified as such).

**Capture horizon:** remaining liftoff delay (0 if airborne) + swing T + touchdown (the measured −13 … −25 ms foot lead is ignored, which is conservative) + debounce 0.05 s + realised-load lag 8 ms + ramp T_r.

**Partial loading:** explicit. The landed foot has zero support authority before LOAD_ACCEPT; afterwards its region grows from the centroid with s. Requested ≠ realised: the measured lag and CoP shortfalls are applied.

**State:** the measured whole-body COM / COM velocity (all segments) and ω = √(g/h) from the **measured** h at decision time. Deviations (COM vertical speed, centroidal angular momentum) are logged per call.

**Feasible set for the foothold** = **timed safe capture region ∩ body-certified reach ∩ valid landing geometry**:
1. **Timed safe capture region:** IHMC one-step region geometry. The horizon is the T above (not swing time alone). Safety margins are the **measured** Touchline values (`research/E2_TIMING_LOAD_ASSUMPTIONS.md` §3), not IHMC's constants. Landing-position uncertainty (base + bandwidth term) is applied inward.
2. **Body-certified reach:** offline certified cells (§5).
3. **Valid landing geometry:** no overlap with the stance foot, gap ≥ 10 mm, no crossover.

Then: projection toward the nominal foothold (commanded steps), or the most robust feasible stopping condition (recovery). After the choice, **online** IK certification of the final foothold and the full swing path.

**Priorities** (same machinery):
- commanded steps keep the nominal 0.10 m / 0.08 m target whenever it is in the feasible set;
- recovery steps maximise the robustness slack and may change placement and timing.

**Re-planning:** each tick while the swing foot is unloaded, from the measured state. IHMC deadband 0.02 m is replaced by the measured landing uncertainty. Freeze at measured contact.

## 3. Minimal DCM reference layer (PyPnC structure) — audit §2

Three quantities are kept distinct:
- the **feasible CoP / support region**: the s-weighted regions; changes only through the lifecycle;
- the **DCM reference** ξ_ref(t), ξ̇_ref(t);
- the **COM reference** x_ref, from ẋ_ref = −ω(x_ref − ξ_ref), integrated from the measured COM. Used for logging and prediction checks, **not tracked by a new controller**.

**Structure:**
- VRP waypoints;
- exponential single-support segments ξ(t) = r + e^{ω(t − T_end)}(ξ_eos − r);
- backward recursion from a terminal condition;
- cubic-Hermite double-support transitions;
- **the first segment starts at the measured DCM and its rate** (PyPnC).

| step | VRP schedule | terminal condition |
|---|---|---|
| **commanded** | DS0 → stance foot (SS) → the new double-support midpoint | stop in double support (ξ_end = the new midpoint). Parameter d (ξ at end of SS = r_s + d(r_new − r_s)) = **0** for E2: the quasi-static stop-step already validated in E1b; d > 0 reserved for walking, so the interface stays general |
| **recovery** | from the measured ξ: VRP at the margin-shrunk stance limit until planned support; then at the margin-shrunk achievable limit as the landed region grows with s; then a cubic-Hermite DS to the new midpoint once ξ is inside support with margin | stop in double support |

**The existing finite-torque balance law is kept:** p* = ξ + kξ(ξ − ξ_ref) − ξ̇_ref/ω. It receives (ξ_ref, ξ̇_ref) from the plan instead of from the λ-weighted centroids. The λ request is derived from the plan's VRP position between the feet (lifecycle intent, allocation).

**Every tick** the implied CoP p* and the plan's VRP are checked against the realisable support region. Violations are logged and gated (E2-17).

**Planning evidence:**
- With the current λ-return reference, the four STEP_REQUIRED snapshots are NO_CERTIFIED_ONE_STEP.
- With DCM-plan tracking they are CERTIFIED_ONE_STEP: 4 cm outward, T ≈ 0.207 s, T_r 0.10 s, slack 53–64 ms.
- The layer is therefore decisive for the recovery cases (`research/E2_REACH_AND_SNAPSHOTS.md` §2).

## 4. Swing (BLF mathematics, explicit) — audit §5

- **Trajectory:** an explicit quintic min-jerk xy segment from the current reference state (p, v, a) to the foothold. z is a two-segment quintic through an apex knot at α = 0.5 with C2 interior continuity (BLF-style knot solve); landing velocity 0.
- **Seeds, not universal constants:**
  - commanded steps: T = 0.60 s, apex 25 mm (both provisional);
  - recovery: T and apex come from the planner (planning example: T ≈ 0.207 s from the hover, no apex).
- **Clearance:** certified with the swept boot geometry (toe, heel, sides) **plus the bandwidth tracking-error envelope**, checked per tick in validation.
- **Re-targeting:** a new segment from the current reference state (position, velocity and acceleration continuous). Never a zero-velocity restart.
- **Bounded contact handling** (all physics-measured):

| case | handling |
|---|---|
| **early contact** (before 60 % of the swing) | the foot stays commanded and is not accepted until the 60 % gate (IHMC) or until the planner, re-run from the measured state, accepts the contact location as a certified foothold; whichever comes first |
| **late contact** | the reference holds the foothold for at most 0.3 s; no contact is declared; the run is flagged |
| **failed touchdown** | after 0.3 s, NO_CERTIFIED_ONE_STEP is re-planned from the measured state; never a declared contact |

## 5. Reach (Touchline IK certifier) — audit §3

- **Offline:** per morphology and side, only the required corridors: forward 0.10 m and lateral 0.08 m (each ±2–3 cm) and the recovery region of the snapshots.
- **Pipeline:** analytic rejection → bounded IK in the soft box → branch-and-bound certificate → candidate cells require 4 corners plus centre FEASIBLE. No convex hull.
- **Results:** `research/E2_REACH_AND_SNAPSHOTS.md` §1. Both nominal footholds and their paths are certified for all 16 body-sides.
- **Online:** final foothold and swing-path certification.
- **Kinematic reach is separate from time / torque-qualified reach:** T_min from the tracking bound; the torque check is not binding.

## 6. Touchdown and load acceptance — audit §6

The E1b lifecycle is preserved.
- **Before measured contact:** zero ground-support authority.
- **At measured contact:**
  1. the swing command is blended out: the hand-back once the reference reaches the foothold, the C2 segment otherwise;
  2. contact references anchor to the actual landed pose (lifecycle `landed()`);
  3. the plan is re-initialised from the measured post-contact COM / DCM;
  4. support demand rises through the finite-actuated ramp (T-A intent + ramp);
  5. realised loading is verified against the request (lag and shortfall logged and gated).
- The controller never receives the full two-foot hull after a light touch: the region grows with s.
- No circularity: LOAD_ACCEPT needs sustained contact plus intent, not prior load.

## 7. Disagreements and clarifications with the audit (reported, not silently followed)

1. **"Apex ≈ 50 %, not 60 %."** v1 already used apex α = 0.5. Its 0.6 was IHMC's **minimum swing fraction for accepting a touchdown** (early-contact gate), not apex timing. v2 keeps α = 0.5 and keeps the 0.6 gate as part of the bounded early-contact handling (§4).
2. **"Do not use 'total energy never increases'."** Agreed, but v1 did not do that. E1a-8 is an **energy-ledger closure**: E − (motor work + external work − damping), with the residual increment bounded (≤ +0.05 J per tick, Σ+ ≤ 0.5 J). v2 keeps that residual criterion and reports motor work, external work, dissipation and residual separately (E2-10).
3. **"Across rates: physical convergence, not bitwise identity."** Agreed. v1 required bitwise identity only for same-rate repeats (DET) and browser = Node; across rates it applied the criteria per rate. v2 adds explicit convergence and classification-stability checks (E2-15).
4. **The audit's IHMC-margin point has a cost.** With measured Touchline margins (CoP shortfall during the acceptance ramp 15.2 mm p95), no one-step plan certifies for the snapshots under the current reference. Certification relies on the new DCM layer (§3). That layer's behaviour is a planning prediction until E2 validates it.
5. **The planning model is validated (32 / 32) only for the current reference law.** The DCM-plan law is modelled but not yet validated. E2 must therefore:
   - re-run the planner's certification with the implemented law;
   - validate it physically (prediction-vs-actual DCM, E2-12).

   I propose this as a gate before the recovery cases count.
6. **Stance-foot lift-off (R-2) is outside the planning model** (no friction or unloading limit). A certified plan can still lift the old stance foot, as happened for V2-165-62 in E1b. It remains a physical check, not a planner guarantee.

## 8. Order (unchanged principle)

1. Implement default-off.
2. KV0 and PSTAR4 identity.
3. A declared smoke run at a non-test step.
4. Freeze.
5. Official run.

**Stop for review now.** No E2 implementation or physical step has been run.
