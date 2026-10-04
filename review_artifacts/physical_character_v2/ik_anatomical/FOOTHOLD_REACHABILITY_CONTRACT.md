# Proposed anatomical foothold-reachability contract (for later approval; not implemented as a G4 component)

**Source:** `../sources/2026-10-04_user_decision_j2a_gate_ankle_ik_research.md`, Decision 2: "Produce a proposed anatomical foothold-reachability contract for later approval."

**Evidence:** `IK_ANATOMICAL_REACHABILITY.md`; `../ik_g4_readiness/IK_G4_READINESS.md`.

**Status:** **PROPOSAL.**
- No G4 code, no swing, no stepping.
- The decisions it needs from you are listed in §6.

## 1. Purpose

**What it is:** the single query G4's planner uses to ask, before committing to a foothold: *can this leg place its foot there, in this way, from this state, as a human could?*
- It classifies.
- It **never moves the target**.
- It never executes motion.

## 2. Three levels of reachability (the distinction the decision asks for)

| level | definition | computed by | status |
|---|---|---|---|
| **L1 geometric** | ∃ leg joint coordinates x (hip 3, knee flexion, ankle DF / inversion; knee axial rotation and passive ankle ab/adduction at their current values) with foot-pose residual ‖r(x)‖ ≤ 1e-6 | unconstrained LM `legIK` | implemented, validated (G3) |
| **L2 anatomical** | ∃ x **inside the approved joint limits L** with ‖r(x)‖ ≤ 1e-6 | bounded LM `legIKBounded` (opt-in) | research infrastructure (R4 26/26) |
| **L3 dynamically executable** | from the *current physical state*, a swing exists that reaches the L2 pose within: actuator capacity (§14 limits); joint-velocity limits; the swing-time budget; balance of the stance leg (XCoM within the support during the swing); collision-free (no self-contact, turf clearance); and the supervisor's abort margins | **not implemented** (G4 work) | reserved fields only |

**Invariant:** L3 ⊆ L2 ⊆ L1. **G4 may plan only on L2, and execute only on L3.**

## 3. Query

**Inputs:**
- leg (L / R);
- the current physical state (body states and joint rotations: the warm start and the non-solved twist DOFs);
- **foothold:** foot position, plus an orientation specification:
  - **touchdown:** foot flat on the turf with a yaw (heading) target and an allowed yaw tolerance ±Δψ;
  - **swing pose:** position only, foot pitch / roll free within the ankle limits. The study shows a flat foot held in the air causes *all* the ankle-DF invalidity.
- **pelvis hypothesis:** the pelvis pose at touchdown, as one of:
  - (a) fixed (the current posture target);
  - (b) a candidate set: height drop {0, 5, 10 cm}, pelvis yaw toward the foot's yaw {0, ψ/2, …};
  - (c) a range searched by the planner.

  The study shows reachability depends far more on pelvis height and yaw than on the limits.
- **limit set L:** default = the approved anatomical hard limits (§6 decision);
- **mode:** `classify` (cheap) | `classify+pose` (adds the converged fallback pose).

**Outputs:**
- `level`: `UNREACHABLE` | `GEOMETRIC_ONLY` | `ANATOMICAL` (L3 later: `EXECUTABLE`);
- `x` and joint targets: for `ANATOMICAL`, the unique valid solution (the study found one valid branch per target; the warm start finds it);
- `residual`: position (mm) and orientation (°) separately;
- `limitMargins[6]`: signed distance to each solved axis's bound (°). **Planners should prefer margins over bare reachability.**
- `binding[]`: for `GEOMETRIC_ONLY`, which limits the unconstrained solution violates and by how much, e.g. "hip external rotation +7.2°";
- `fallbackPose`: in `classify+pose` mode and not `ANATOMICAL`, the **box-constrained least-squares optimum**. It is converged (projected Newton; KKT ≤ 1e-7), so it is well defined and reproducible.
- `pelvisUsed`: which pelvis hypothesis achieved the level;
- reserved L3 fields: `executable`, `swingTimeMin`, `capacityMargin`, `balanceMargin`.

## 4. Guarantees (each backed by a permanent test)

| guarantee | test | measured |
|---|---|---|
| deterministic (bit-identical re-query) | R4 / study | 20,736 / 20,736 |
| L / R mirror-equivariant: same level; solution through σ = (−1, +1, −1, +1, +1, −1) | R4.e | 0 mismatches; Δ ≤ 1.2e-14 rad reached, ≤ 4e-8 rad fallback |
| `ANATOMICAL` ⇒ every solved coordinate inside L | R4.b | 420 / 420 |
| L2 solution = L1 solution wherever the L1 solution is inside L | R4.c | 0 / 166 differ |
| the target is never modified | R3.d / R4.f | 0 |
| fallback pose = box optimum | R4.g | KKT ≤ 3.8e-10 |
| no knee hyperextension in any returned `ANATOMICAL` pose | covered by R4.b (the knee bound) | — |
| performance (proposed): `classify` ≤ 0.3 ms p99; `classify+pose` ≤ 10 ms p99 | benchmark (to add) | p50 0.13 / 1.2 ms; p99 1.9 / 8.3 ms (study, loaded machine) |

## 5. What the evidence says G4 must respect (design inputs, not decisions)

1. **Normal-gait footholds are anatomically valid.** Foot yaw within ±30° at ground level: 0 invalid of 2,256 geometric.
2. **Turning must share yaw between pelvis and hip.** ±45° footholds with a standing-orientation pelvis are invalid in 18–20 % of cases. A pelvis yaw toward the foot of ≤ 20° resolves 1,023 of 1,208.
3. **Swing poses must leave foot pitch free:** a flat foot in the air demands DF 45–55°.
4. **The pelvis must drop for step length.** At standing height a ground-level 15 cm step is beyond full extension.
5. **Smaller bodies have less margin** (V2-165-62 has the most invalid targets).

## 6. Decisions needed before this becomes a G4 component

1. **Which limits define L2:**
   - the anatomical **hard** limits (as studied);
   - the **soft** limits (passive-torque onset), which shrink reachability;
   - or the hard limits minus a margin (e.g. 2–5°).
2. **The non-solved twist DOFs:** knee axial rotation and passive ankle ab/adduction. Options:
   - hold them at their current values (as now);
   - solve them with their passive stiffness (relevant if an ankle neutral-zone law is adopted);
   - allow them inside their own limits.

   **Runway evidence** (`../pre_g4_runway/REACHABILITY_STRESS_AND_TAXONOMY.md` §3c–3d):
   - **"Current values" makes the classification state-dependent and knife-edge.**
     - Moving one held twist by ≤ 1° flips 17.5 % of the invalid set; ≤ 3° flips 42 %; ≤ 10° flips 83 %, including every ground target. The validated controller's twist moves through ±10–12°.
     - 237 targets are invalid only under the instantaneous definition, and 231 only under the reference definition.
   - **Freeing them changes the answer for most of the invalid set:**
     - the actuated knee axial alone, inside its screw-home-coupled soft range: 84.4 % FEASIBLE;
     - both twist DOFs inside their unloaded ranges: 94.7 %, including every ground and 5 cm target.
   - **Controllability:** the knee axial DOF is actuated, so it can be planned. The ankle ab/adduction is passive-only: a plan that needs it relies on where contact puts the foot. That is acceptable only as a touchdown tolerance (±Δψ, decision 4), not as a planned coordinate.
3. **Pelvis hypothesis policy:** fixed / candidate set / searched; and the yaw-sharing rule for turns.
4. **Foot-yaw tolerance** at touchdown (exact vs ±Δψ).
5. **Fallback semantics:** box least-squares optimum (as implemented), or nearest-to-current pose, or "refuse".
6. **The solver of record for L2:** M0 + M5 (as now) vs a closed-form branch enumerator (not prototyped).

## 7. Additions from the pre-G4 research runway (proposal; `../pre_g4_runway/REACHABILITY_STRESS_AND_TAXONOMY.md`)

1. **The result taxonomy** replaces the binary `level`:

   | class | required evidence |
   |---|---|
   | `FEASIBLE` | a verified solution: FK re-check, residual ≤ 1e-6, inside L |
   | `PROVEN-INFEASIBLE` | a certificate: the geometric reach bound (exact, cheap), or a branch-and-bound residual lower bound over the joint box (defined, not implemented) |
   | `UNKNOWN-NOT-FOUND` | no certificate; the search record (starts, best residual). **Never reported as anatomically impossible; never planned on.** |

   - **Evidence:**
     - 257-start multistart over all 1,336 current invalid targets found **0 solver misses**.
     - **The branch-and-bound certificate is now implemented** (`tools/ik_cert_core.mjs`; soundness regression R6.a–e). **1,336 / 1,336 are PROVEN-INFEASIBLE** as defined (0 undecided), in ≈ 4 s (isolated; 12 s under 9-way load) median per target. That is offline-audit cost, not planner cost.
   - **Required field:** a `PROVEN-INFEASIBLE` result must state its problem definition: the solved and held DOFs, the held values, the limit set and the pelvis hypothesis. **94.7 % of the 6-D-certified set is FEASIBLE once the held twist DOFs move inside their unloaded ranges.**
2. **The pelvis hypothesis includes yaw.** For turning footholds, a yaw-sharing rule between pelvis and hip: pelvis yaw ≤ 20° toward the foot resolves 85 % (78–93 % per body; corrected from "74–91 %") of the ±45° invalid set.
3. **Swing poses leave foot pitch free.** All ankle-DF invalidity came from a flat foot held in the air.
4. **Planning margin:** ≥ 5° to every hard limit (proposed). For ground footholds with |yaw| ≤ 30° this excludes fewer than 5 %, all of them hip-rotation-limited (margin min 1.1°, p5 8.8°).
5. **Held twist values are a planning input, not the instantaneous joint values.**
   - Proposal for decision 2: solve the **knee axial** rotation as a 7th planned coordinate, inside the approved screw-home-coupled soft range (actuated; 84.4 % of the current invalid set becomes valid).
   - Hold the passive ankle ab/adduction at its reference (≈ 0), with its soft ±10° as touchdown tolerance only.
   - **Interaction with the twist-policy decision:** a planned knee axial value becomes that DOF's posture target during swing. Under "current" the knee axial target is the current value, which has zero stiffness.
   - Not adopted.
6. **E2 footholds need pelvis drop ≥ 2.5 cm.** At standing height:
   - a 10 cm lateral foothold is out of reach in every body;
   - a 10 cm forward foothold has a margin of only 5.9–8.6° (knee near hyperextension), and is out of reach for V2-165-62.

   With 2.5 cm of drop, every body is valid with ≥ 17° margin.
7. **L3 (dynamic executability) must include:**
   - **single-support yaw anchoring:** the stance ankle reaches its ab/adduction end range at 1–2 N·m·s yaw impulses under every posture policy at evidence-range stiffness;
   - the single-support abort foothold;
   - the interface requirements of `../pre_g4_runway/G3_G4_INTERFACE_AUDIT.md`.
