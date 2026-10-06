# Execution-feasibility extension of the reachability certifier (smallest extension; not wired into the E2 planner yet)

**Authority:** `../sources/2026-10-06_user_decision_AB2_coordinator.md`: "endpoint geometry → full-path feasibility under predicted pelvis motion → finite-actuator execution qualification … The V2-long-legs lateral counterexample must be rejected before runtime if it remains dynamically unexecutable. Do not redesign the global planner."

**Status:**
- Implemented, default-off and used by nothing in the default paths.
- Verified on a 160-case sweep.
- Not yet called from the E2 planner (`plan()`); that integration belongs with PG-1, which is not started.
- Identity: KV0 IDENTICAL; PSTAR5B 99c29491; PSTAR5CH b62309f5; SV-2 3dd9f13d; AB R-F b63184da; component regressions 58 / 58.

## 1. Layers

| layer | where | what |
|---|---|---|
| 1. endpoint geometry | existing `landingValid`, `ikFeasible` | unchanged |
| 2. whole path under the predicted pelvis-motion envelope | `ctrl/v2_footstep.js` `certifyExecution` | **gating, nominal predicted swing frame:** reach strictly inside soft limits; conditioning λmin(JᵀJ) ≥ ε² (outside the singularity-robust damping region); coordinate rates; torque feasibility; self-collision; swept sole clearance; final posture. **Flagging, 12 axis extremes of the validated pelvis excursion:** reach and conditioning. An *envelope-sensitive* swing is never admitted on layer 2 alone |
| 3. finite-actuator execution qualification | `tools/exec_qualify.mjs` | a **closed-loop Jolt replay** with the real controller (A + B) and finite actuators. Qualified only if, from the measured liftoff, there is no E1a-7 violation and no over-capacity up to the step containing the first measured contact, and every IK target is reached strictly inside the soft limits **up to contact** (SV-2's runtime check stopped at φ 0.8 and missed the runaway). Contact must occur and nothing may abort |

**Layer 2 details:**
- **Torque feasibility:** gravity plus the D1 inertial wrench at the planned pose and the reference's acceleration, per actuated axis, ≤ the full-activation capacity at the planned anatomical angle and coordinate rate divided by (1 + U_MARGIN) — the actuator's own excitation headroom.
- **Self-collision distance:** ≥ the validated R + C tracking peak, 1.78 mm.
- **Swept clearance:** the reference's lowest sole point minus the validated per-bin downward deviation (A + B, R + C) ≥ 5 mm over φ ∈ [0.2, 0.8].
- **Why the envelope flags rather than rejects:** independent per-axis extremes ignore how pelvis motions correlate. They falsely rejected a validated C-L5 swing of V2-165-62, whose ankle runs within 0.02° of its soft limit in mid-swing. So the closed-loop replay is the authority on execution.

**Predicted pelvis-motion envelope:**
- Validated A + B swings, step command → contact, R + C trajectories, all 8 bodies, 240 Hz (40 runs; `evidence_exec/pelvis_envelope*`).
- Maxima, pelvis frame: |Δp| 10.0 / 3.4 / 16.1 mm; |Δθ| 2.87 / 4.98 / 1.71°.
- The phase-resolved envelope reaches nearly its full size by φ 0.35 – 0.40, so phase resolution would not change the flags.

## 2. Verification sweep (240 Hz, 8 bodies × 2 legs × 10 trajectories = 160; `evidence_exec/sweep.txt`)

| outcome | cases |
|---|---|
| **qualified** | **144**: every R, C (except C-L11) and H case, including H-T45 and H-F15. No false rejection |
| not qualified: positional (existing certifier) | 14: C-L11 for the 7 bodies that cannot reach it. Layers 2 and 3 agree (nominal IK unreached at φ ≥ 0.90; replay: no contact) |
| **not qualified: execution** | **2: V2-long-legs C-L11, both legs.** Positional ✓, layer-2 nominal ✓, **envelope-sensitive** (IK unreached at φ 0.90 under +3.4 mm pelvis drop). **Replay rejected:** 8 – 9 swing E1a-7 violations, IK residual up to 4.3·10⁻³, soft-limit margin 0 |
| envelope-sensitive but qualified by replay | 16, all lateral and corridor-edge swings near the ankle-dorsiflexion soft limit |

**The counterexample is rejected before runtime.**

Lateral reach on V2-long-legs (A + B, replay):
- 0.090 m and 0.095 m are also not qualified (3 and 1 swing violations). Under the base configuration they did not run away; under A + B the commanded-torque rate exceeds E1a-7 near the end of the swing.
- 0.110 m: runaway.

## 3. Limits

- Layer 3 is a separate replay run. At planning time it costs one closed-loop simulation of the swing. Integrating it into `plan()` (snapshot / replay, or a per-step-class qualification cache) is an engineering choice for the PG-1 stage.
- The sweep is at 240 Hz. The C-L11 runaway was shown at 180 / 240 / 480 Hz in the vertical-residual diagnosis.
- The torque check uses the coordinate rate as the speed for the force–velocity factor (an approximation). The replay layer carries the exact finite actuators.
