# Anatomical reachability: stress test of the three layers, the invalid set, and a result taxonomy (pre-G4 runway, item 5)

**Status:** research. **The contract is not adopted.**

**Tools:**
- `tools/ik_anat_study.mjs` (20,736 targets × 8 bodies);
- `tools/ik_pelvis_yaw.mjs`;
- `tools/ik_taxonomy.mjs` (aggressive multistart);
- `tools/ik_certificate.mjs` + `tools/ik_cert_core.mjs` (branch-and-bound infeasibility certificates; `--soundness` falsification test);
- `tools/ik_twist_free.mjs` (the held twist DOFs freed / held at reference; `--sens`, `--refall`, `--cert`);
- `tools/e2_target_check.mjs` (the E2 footholds);
- earlier `ik_anatomical/`.

**Evidence:** `evidence/reachability/`.

**Headline (added late in the runway, §3b–3e):**
- The certificate is practical: **1,336 of the 1,336 invalid targets are PROVEN-INFEASIBLE** as the IK problem is defined (0 undecided).
- **But the definition, not the leg, decides most of them.** The problem holds knee axial rotation and ankle ab/adduction at their instantaneous values. Freed inside their passively unloaded ranges, **1,265 / 1,336 (94.7 %) become FEASIBLE**, including **every** ground-level and 5 cm target.
- **PROVEN-INFEASIBLE must always carry its problem definition.**

## 1. ±30° ground footholds across morphologies

| body | ground footholds with \|yaw\| ≤ 30°: invalid / geometric | ±45°: invalid / geometric | invalid resolved by pelvis yaw ≤ 20° |
|---|---|---|---|
| V2-165-62 | **0** / 276 | 48 / 184 | 180 / 236 |
| V2-175-70 | **0** / 276 | 36 / 184 | 136 / 179 |
| V2-REF | **0** / 276 | 31 / 184 | 122 / 158 |
| V2-190-85 | **0** / 288 | 31 / 192 | 111 / 146 |
| V2-198-92 | **0** / 288 | 33 / 192 | 153 / 169 |
| V2-long-legs | **0** / 288 | 28 / 192 | 101 / 133 |
| V2-short-legs | **0** / 276 | 37 / 184 | 136 / 179 |
| V1-matched | **0** / 288 | 28 / 192 | 104 / 136 |

**Robustness margin** (the 2,256 valid ground ±30° solutions; distance to the anatomical hard limit, min / p5 / median):

| axis | min | p5 | median |
|---|---|---|---|
| **hip rotation** | **1.1°** | **8.8°** | 19.1° |
| ankle DF | 5.1° | 13.3° | 32.1° |
| knee flexion | 10.4° | 15.3° | 44.2° |
| ankle inversion | 11.1° | 15.6° | 26.1° |
| hip abduction | 15.1° | 22.6° | 34.0° |
| hip flexion | 29.9° | 32.6° | 52.4° |

- The tightest case is V2-165-62, diagonal in, toe-out 30°, pelvis drop 10 cm.
- **Valid everywhere, but a few cases sit within a few degrees of the hip-rotation limit.** A contract margin rule (e.g. ≥ 5°) would exclude fewer than 5 % of them.

## 2. What fails

1. **±45° foot yaw with a fixed (standing) pelvis orientation:** hip rotation 3–15° beyond the limit.
   - **Pelvis yaw ≤ 20° toward the foot resolves 1,023 / 1,208 (85 %) of the ±45° invalid set: 78–93 % per body.** Of all invalid targets it resolves 1,043 / 1,336, 76–91 % per body (the §1 column).
   - These figures were corrected late in the runway against `ik_anatomical/evidence/ik_pelvis_yaw.json`; the text previously said "74–91 % per body", which matched neither denominator.
   - **What remains:** long / very long forward reaches at the workspace edge (turning the pelvis moves the hip back), plus the DF class below.
2. **Raised targets with the foot held flat** (height 5 / 10 cm): ankle DF 45–55° (3–10° beyond).
   - All 260 DF cases are raised. **None is a ground foothold.**
   - They come from the target convention (a flat foot in the air), not from the leg.
   - **The swing-pose contract must leave foot pitch free.**
3. **Geometric unreachability** at standing pelvis height for ground targets beyond about 15 cm forward. Not an anatomical problem: pelvis height is a planning variable.

## 3. Does "the bounded solver did not find it" mean "anatomically impossible"? Aggressive test

**Method:** every one of the **1,336** geometric-but-not-anatomical targets was searched by the bounded projected LM from **257 starts**: the warm start, the 64 corners of the joint box (shrunk 2 % inward) and 192 Halton points inside the box.

**Result:**
- **0 FEASIBLE.** The warm-start solver never missed a valid solution.
- **1,336 NOT-FOUND.** The warm start already reached the multistart's best residual in 1,329 of 1,336; in the other 7, multistart found a lower residual that is still above 1e-6.
- **The closest near-miss:** residual 1.9e-5 m; median 3.2 cm.

**Strong evidence of infeasibility, but not proof** (a finite set of starts cannot certify a 6-D box). §3b supplies the proof.

## 3b. Certificates: PROVEN-INFEASIBLE is practical (branch-and-bound)

**Method** (`tools/ik_cert_core.mjs`):
- Depth-first branch-and-bound over the 6-D anatomical hard-limit box, with a rigorous cell lower bound min_cell ‖r‖ ≥ ‖r(c)‖ − Σ_i LIP_i·h_i.
- LIP_i = lever_i + 1:
  - **orientation, 1 per coordinate:** a twist rotates about a unit axis. The pyramid swing q ∝ (0, tan(sy/2), tan(sz/2), 1) has angular speed (1 + a)·√(1 + b)/(1 + a + b) ≤ 1 for |sy|, |sz| < 90°, which holds in every leg box (largest 87.3°). 2·vec(q_err) is 1-Lipschitz in angle.
  - **position:** hip coordinates thigh + shank; knee shank; ankle 0 (the ankle centre does not move).
- A cell is pruned when its bound exceeds the 1e-6 tolerance. PROVEN-INFEASIBLE means every cell was pruned.
- **Tight twist levers** (opt-in `--tight`; found late in the runway):
  - A twist coordinate rotates its segment about a segment-fixed axis through the joint centre.
  - In this skeleton the knee-axial axis runs through the ankle centre (distance ≈ 1e-16 m), and the hip twist axis runs through the knee.
  - So the knee-axial position lever is 0, and the hip-twist lever is the shank length instead of thigh + shank (each + 1 nm rounding guard).
  - The same falsification tests pass with them (3 states; R6.e).
  - **The 6-D sweep of record uses the generic levers.**

**Soundness**, tested by trying to falsify the bound (`--soundness`, and the permanent regression R6):

Five body / state combinations: V2-REF U:R, V2-165-62 T5, V1-matched U:L, V2-198-92 T6, V2-short-legs U:R.

| test | result |
|---|---|
| rate claims, random box points × 6 coordinates (200 per state in the tool; 2,000 in R6.a) | position rate / lever ≤ 1.0000000004 (the knee bound is exactly tight: a pure rotation; the excess is finite-difference rounding); ankle position rate exactly 0; orientation rate ≤ 0.9999999 |
| the exact inequality, 585,000 random (cell, point) pairs over every target | **0 violations**; minimum slack 44–47 % of the bound |
| known-solution path: for 2,086 anatomically valid targets, follow the cells containing the solution down to Σ LIP·h < 1e-9 (413,453 cells, depth ≤ 198) | **0 pruned** |
| R6.c: a certified target made solvable by moving the held knee axial twist 5° | not certified (UNDECIDED at the cap), as required |

**Results, all 1,336 invalid targets** (8 bodies × 4 states; cap 4·10⁸ cells):

| body | invalid targets (4 states) | PROVEN-INFEASIBLE | UNDECIDED | cells p50 / max | time p50 / max (s, 9-way load) |
|---|---|---|---|---|---|
| V2-165-62 | 236 | 236 | 0 | 5,828,303 / 21,861,919 | 13.4 / 64.7 |
| V2-175-70 | 179 | 179 | 0 | 5,355,091 / 78,800,707 | 9.7 / 135.0 |
| V2-REF | 158 | 158 | 0 | 5,818,615 / 19,344,889 | 14.4 / 64.6 |
| V2-190-85 | 146 | 146 | 0 | 5,341,799 / 33,414,885 | 15.5 / 79.3 |
| V2-198-92 | 169 | 169 | 0 | 6,597,057 / 25,503,329 | 16.4 / 79.0 |
| V2-long-legs | 133 | 133 | 0 | 5,359,561 / 28,741,165 | 10.7 / 76.1 |
| V2-short-legs | 179 | 179 | 0 | 5,296,849 / 27,101,537 | 10.8 / 54.6 |
| V1-matched | 136 | 136 | 0 | 5,302,177 / 11,910,495 | 10.3 / 32.0 |
| **all** | **1,336** | **1,336** | **0** | 5,558,001 / 78,800,707 | 12.3 / 135.0 |

- **Every one of the 1,336 is PROVEN-INFEASIBLE as defined.** That includes the closest near-miss of the multistart (warm residual **1.9e-5 m**, V2-175-70 T6, inward crossing, yaw 45°), certified in 78.8 M cells.
- **So the 257-start search's "not found" was right in every case, as defined.**

**What it costs:** cells p50 5.6 M, p90 13.6 M, max 78.8 M. Time per target: p50 ≈ 4 s isolated (the first two runs, 2 jobs) and 12.3 s under the sweep's 9-way load; p90 34 s, max 135 s under load. This is fine for offline classification, but too slow for a per-step planner. **The planner should use only FEASIBLE**, which costs one bounded solve.

## 3c. PROVEN-INFEASIBLE is relative to the problem definition: the held twist DOFs

**The issue:** the leg IK solves 6 coordinates (hip 3, knee flexion, ankle DF / inversion). It **holds** two redundant twist DOFs at their **instantaneous** joint values:
- knee axial rotation, which is actuated (0.35 N·m/kg, "recalled");
- ankle ab/adduction, which is passive-only.

A 6-D certificate proves nothing about the leg with those DOFs free.

**Test** (`tools/ik_twist_free.mjs`): the same 1,336 targets, re-solved with the twist DOFs **freed**. FEASIBLE is constructive: FK re-check, residual ≤ 1e-6, every coordinate inside its hard limit. The 8-D chain equals `legChain` bit for bit at the held values (max |Δr| = 0 on every target; R6.d).

| variant | twist DOFs | FEASIBLE / 1,336 |
|---|---|---|
| V7k | knee axial free in its hard limits | 1,238 (92.7 %) |
| **V7ks** | knee axial free inside its **passively unloaded** range: soft × the approved screw-home coupling clamp(flex/60°, 0.1, 1) (the coupling is active for 916 of the solutions) | **1,127 (84.4 %)** |
| V7a | ankle ab/adduction free in its hard limits (±15°) | 1,182 (88.5 %) |
| V7as | ankle ab/adduction inside its soft range (±10°) | 1,132 (84.7 %) |
| V8 | both, hard limits | 1,318 (98.7 %) |
| **V8s** | both, passively unloaded ranges | **1,265 (94.7 %)** |

**By target height:**
- **Ground (272) and 5 cm (411): V8s solves all 683.** V7ks alone solves 242 / 272 and 379 / 411.
- **10 cm raised flat-foot (653):** V8s solves 582. All 71 that remain are raised flat-foot targets: slight backward reach with toe-out, or outward reach.

**The 18 V8 NOT-FOUND targets** (all "slight backward, yaw −30° / −45°, raised 10 cm, pelvis drop 10 cm"; 4 bodies × 4 states): 8-D certificate (`--cert`, cap 4·10⁸ cells): attempted for 4 of the 18 (V2-165-62 / V2-175-70 / V2-REF / V2-short-legs, U:R). **All 4 are UNDECIDED at the cap.** The other 14 were not attempted: I stopped the jobs to free the CPU, since each takes ≈ 12 min under load.
- So **the 18 stay UNKNOWN-NOT-FOUND under V8**.
- **The tight twist levers did not change this:** a second attempt on the same 4 targets with `--tight` (knee-axial lever 0) was also UNDECIDED at 4·10⁸ cells. The other 14 were not attempted.
- In 6-D, the tight levers cut cells by a uniform 1.30× (V2-REF U:R, 41 targets, identical verdicts).
- **A practical 8-D certificate needs a better method**, for example interval / affine arithmetic, or a reparameterisation that merges the nearly parallel knee-axial and ankle-ab/adduction rotations. Research item (debt).

**How much twist is needed:** the median change from the held value is 3.8° (knee) / 3.6° (ankle); p90 22° / 11°. The knee axial and the ankle ab/adduction substitute for each other almost one for one: both are axial rotations about the shank.

## 3d. With the instantaneous definition the classification is knife-edge and state-dependent

**Sensitivity of the 6-D verdict to the held twist values** (`--sens`): the smallest offset of one held twist that makes the unchanged 6-D problem FEASIBLE, across all 1,336 targets.

| smallest offset of one held twist that flips the verdict to FEASIBLE | knee axial | ankle ab/adduction | either | ground targets (272), either |
|---|---|---|---|---|
| ≤ 0.25° | 68 | 73 | — | 18 |
| ≤ 1° | 227 | 227 | **234 (17.5 %)** | 60 |
| ≤ 3° | 540 | 547 | **557 (41.7 %)** | 151 |
| ≤ 10° | 1,086 | 1,101 | **1,113 (83.3 %)** | **272 (100 %)** |
| none within ±10° | 250 | 235 | 223 | 0 |

The re-run for this table reproduced every variant result of the first run bit for bit (1,336 / 1,336: determinism).

**Instantaneous vs reference** (`--refall`: every one of the 14,880 geometric targets classified twice):

| | invalid targets |
|---|---|
| twist DOFs held at the **instantaneous** values (the validated legIK) | 1,336 |
| held at the **posture reference** (`ikRefTwist` semantics) | 1,330 |
| invalid under both | 1,099 |
| invalid **only** under instantaneous / **only** under reference | **237 / 231** |

- The held instantaneous ankle ab/adduction at capture was −6.2 … +6.1°, which is the free ±10° twist of the validated controller. The reference values are ≈ 0 (≤ 0.09°).
- **Under the validated "current" policy the twist moves ±10–12° in a limit cycle** (`TWIST_MECHANISM_AND_POLICY.md`). So a large part of the invalid set changes verdict over time for the same target.
- **Robust result:** ground footholds with |yaw| ≤ 30° are 0 invalid of 2,256 under both definitions.

## 3e. The proposed E2 footholds (`tools/e2_target_check.mjs`; ground, yaw 0)

| target | pelvis drop 0 (standing) | drop ≥ 2.5 cm |
|---|---|---|
| E2a, 10 cm forward | valid in 7 / 8 bodies, but **margin only 5.9–8.6°** (knee near its hyperextension limit); **V2-165-62 out of reach** | valid in 8 / 8; margin ≥ 23.0° |
| E2b, 10 cm lateral | **out of reach in 8 / 8** | valid in 8 / 8; margin ≥ 17.3° |

- **Even 5 cm lateral is out of reach at standing height in every body.** 5 cm forward is valid, with margin 13.1–13.6°.
- The twist definition makes no difference here (≤ 0.5° change in margin).
- **E2 must plan a pelvis drop of ≥ 2.5 cm** (or a bent stance knee). At standing height the step is at the edge of the workspace.

## 4. Proposed result taxonomy (for the contract)

| class | meaning | required evidence |
|---|---|---|
| **FEASIBLE** | a verified solution exists | a returned x inside the limits with foot-pose residual ≤ 1e-6, re-checked by forward kinematics. Constructive proof; the solver's word is not enough. |
| **PROVEN-INFEASIBLE** | no solution exists inside the limits **for the stated problem definition** (which DOFs are solved, which are held and at what values, the limit set, the pelvis hypothesis) | a **certificate**: (a) geometric reach bound (hip → ankle-target distance outside [L_min, L_max] for the knee's flexion range: exact and cheap); or (b) the branch-and-bound lower bound of §3b (**implemented**; 1,336 / 1,336 certified; ≈ 4 s (isolated; 12 s under 9-way load) median). **Must never be reported without its problem definition** (§3c: 94.7 % of the 6-D-certified set is FEASIBLE once the held twist DOFs move inside their unloaded ranges). |
| **UNKNOWN-NOT-FOUND** | no solution found; no certificate | the search record: starts used (warm + corners + quasi-random), best residual and where. **Planners must treat this as "do not plan"**, but must **never** report it as anatomically impossible. After §3b, 0 of the current invalid targets remain in this class. |

**Recommended contract use:**
- **planning:** FEASIBLE with margin ≥ m° on every axis;
- **reporting:** never collapse UNKNOWN-NOT-FOUND into PROVEN-INFEASIBLE;
- **certificates:** the geometric certificate is applied first, because it is free. Branch-and-bound is for offline audits (seconds per target).
- **problem definition:** the held twist DOFs must be a defined planning input, not the instantaneous joint values (§3d). The options are in the contract §6, decision 2.

## 5. Stress on the three layers

| layer | stress applied | finding |
|---|---|---|
| **L1 geometric** | reach sweeps s = 0.95 … 1.02, pelvis drop 0 / 5 / 10 cm, 8 bodies | continuous across the boundary; at standing height the workspace for ground footholds is small; pelvis height dominates |
| **L2 anatomical** | 20,736 targets, aggressive multistart, mirror, determinism | exact classification (0 L/R mismatches, deterministic); no solver misses; margins quantified; the ±30° ground class is robust in every morphology |
| **L3 dynamically executable** | **cannot be tested without a swing controller** | design inputs from the interface audit: a swing-foot state, load acceptance, single-support references, single-support abort. L3 must include swing time vs actuator capacity, stance-foot balance (ξ inside the stance region for the swing duration), clearance, self-collision, and the abort-path foothold |

**Contract proposal updates** (to `../ik_anatomical/FOOTHOLD_REACHABILITY_CONTRACT.md`; for approval):
- the result taxonomy above;
- the pelvis hypothesis must include **yaw** (yaw-sharing rule for turns);
- swing poses leave **foot pitch free**;
- a planning margin rule (proposed ≥ 5° per axis; fewer than 5 % of the ±30° ground class would be excluded, all of them at hip rotation).
