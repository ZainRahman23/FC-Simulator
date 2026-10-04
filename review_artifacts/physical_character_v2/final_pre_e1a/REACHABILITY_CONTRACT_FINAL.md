# Foothold / reachability contract: final form (final pre-E1a stage, §6)

**Source:** `../sources/2026-10-04_user_instruction_final_pre_e1a_resolution.md` §6.

**Builds on:**
- `../ik_anatomical/FOOTHOLD_REACHABILITY_CONTRACT.md` (the proposal);
- `../pre_g4_runway/REACHABILITY_STRESS_AND_TAXONOMY.md` (the certificate and twist-DOF evidence).

**Status:**
- This is the contract **for G4 planning**.
- It is not needed by E1a, which replaces the same foothold.
- No planner exists yet. The query is specified here.
- Its building blocks are implemented and tested: bounded IK (R4), certificate (R6), result taxonomy.

## 1. Three levels

| level | question | decided by | status |
|---|---|---|---|
| **geometrically reachable** | is the foot pose within the leg's reach, ignoring joint limits? | unconstrained leg IK (`legIK`) | implemented (G3) |
| **anatomically / configurationally feasible** | is there a leg configuration inside the planning box (approved limits with margin) that places the foot exactly, for one of the allowed pelvis hypotheses? | bounded leg IK + FK re-check; certificates offline | implemented (R4, R6) |
| **dynamically executable from the current state** | can the swing reach that configuration in time, within actuator capacity and the stance foot's balance, with clearance, without self-collision, with an abort foothold? | G4 swing planning (not built) | E1 produces the first data |

**Invariant:** executable ⊆ feasible ⊆ reachable.
- G4 plans only on **feasible**.
- G4 executes only on **executable**.

## 2. The planning feasibility problem (decided)

| element | in the problem as | reason |
|---|---|---|
| hip (3 axes), knee flexion, ankle DF, ankle inversion | **solved** coordinates | as before |
| **knee axial rotation** (actuated) | **solved**, inside its passively unloaded range: the soft envelope of the approved knee model, flexion-coupled; no planning on the end range | actuated, so it can be planned. Holding it at its instantaneous value made classification knife-edge: ≤ 1° flips 17.5 % of the invalid set. Freed in its unloaded range, it rescues 84.4 % of the formerly invalid set (runway §3c) |
| **ankle ab/adduction** (passive-only) | **held at its reference (neutral)**; its soft range is a **touchdown yaw tolerance**, never a planned coordinate | passive: no plan may rely on where contact will push it |
| pelvis height | **searched** over drops {0, 2.5, 5, 7.5, 10} cm; the smallest feasible drop is preferred | pelvis height dominates reach. At standing height a 10 cm (even 5 cm) lateral foothold is out of reach for every body; 2.5 cm makes the E2 targets feasible with ≥ 17° margin |
| pelvis yaw | **searched**: yaw-sharing toward the foot's yaw, \|ψ_pelvis\| ≤ min(20°, \|ψ_foot\|/2 … \|ψ_foot\|) | ≤ 20° resolves 85 % of the ±45° invalid set (78–93 % per body) |
| pelvis pitch / roll | **fixed** at the posture reference | balance / posture variables. Planning must not buy reach with trunk pitch or a pelvic drop it has not budgeted |
| foot at touchdown | **flat on the turf**; position exact; yaw exact within the requester's stated tolerance Δψ (default 2°) | the requested foothold is the requirement |
| foot in swing poses | position only; foot pitch and roll **free** inside the ankle limits | a flat foot held in the air caused every ankle-DF invalidity |
| limits | **planning box** = anatomical hard limits **minus 5°** on every solved coordinate. For knee axial: the soft (unloaded) envelope | never plan onto a limit. The 5° rule excludes fewer than 5 % of normal ground footholds |

**Query inputs:**
- leg;
- current physical state (warm start; the held ankle reference);
- requested foothold (position, yaw, Δψ) or swing pose;
- pelvis hypothesis set;
- limit set.

**Query outputs:**
- result class (§3);
- the solution x and joint targets;
- the pelvis hypothesis used;
- per-axis limit margins;
- residuals;
- for non-FEASIBLE results, the binding limits.

## 3. Result classes

| class | required evidence | may the planner use it? |
|---|---|---|
| **FEASIBLE** | a returned configuration inside the planning box, FK re-checked: position residual ≤ 1e-6 m and orientation residual ≤ 1e-6 rad, for the stated pelvis hypothesis | yes |
| **PROVEN-INFEASIBLE** | a certificate valid **for the stated problem definition**: solved DOFs, held DOF values, the box, pelvis hypothesis, foot orientation spec, tolerance. Either (a) the geometric reach bound (exact, cheap), or (b) the Lipschitz branch-and-bound over the box (`tools/ik_cert_core.mjs`, offline: seconds per target). **The definition is printed with every certificate** | no; and the reason is reportable |
| **UNKNOWN-NOT-FOUND** | no solution and no certificate; the search record (starts, best residual and where) | no. **Never reported as anatomically impossible** |

**Rules:**
1. **A numerical solver failure alone is UNKNOWN-NOT-FOUND, never PROVEN-INFEASIBLE.**
2. **The closest-pose fallback never replaces the request.**
   - The box least-squares optimum may be returned only as a separately labelled `fallbackPose` ("not the requested foothold").
   - A planner that wants it must re-plan with it as a new, explicit request.
   - The target is never modified (tested: R3.d, R4.f).
3. **Certificates are offline / audit-only.**
   - 6-D: about 4 s median per target.
   - 8-D: undecided at 4·10⁸ cells.
   - Runtime classification is the bounded IK: about 0.13 ms (1–8 ms with the converged fallback).
4. **A certificate for one problem definition says nothing about another.** Measured: 94.7 % of the 6-D-certified set is FEASIBLE once the held twist DOFs move inside their unloaded ranges.

## 4. Dynamically executable (G4; reserved fields)

Required by the time G4 plans steps:
- `swingTimeMin`: minimum swing time within actuator capacity;
- `capacityMargin`;
- `balanceMargin`: the stance foot's ξ margin over the swing;
- `clearance` and `selfCollision`;
- `abortFoothold`: where to put the foot down if the step must be abandoned (the lifecycle's abort puts it on the contact anchor);
- `yawAnchorMargin`: single-support yaw demand vs the stance ankle's capacity. This is the open architecture question of `SINGLE_SUPPORT_YAW.md`.
