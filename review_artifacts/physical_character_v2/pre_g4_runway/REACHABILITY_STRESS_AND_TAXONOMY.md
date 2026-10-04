# Anatomical reachability: stress test of the three layers, the invalid set, and a result taxonomy (pre-G4 runway, item 5)

**Status:** research. **The contract is not adopted.**

**Tools:**
- `tools/ik_anat_study.mjs` (20,736 targets × 8 bodies);
- `tools/ik_pelvis_yaw.mjs`;
- `tools/ik_taxonomy.mjs` (aggressive multistart);
- earlier `ik_anatomical/`.

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
   - **Pelvis yaw ≤ 20° toward the foot resolves 74–91 % per body** (1,023 / 1,208 overall).
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

**Strong evidence of infeasibility, but not proof** (a finite set of starts cannot certify a 6-D box).

## 4. Proposed result taxonomy (for the contract)

| class | meaning | required evidence |
|---|---|---|
| **FEASIBLE** | a verified solution exists | a returned x inside the limits with foot-pose residual ≤ 1e-6, re-checked by forward kinematics. Constructive proof; the solver's word is not enough. |
| **PROVEN-INFEASIBLE** | no solution exists inside the limits | a **certificate**: (a) geometric reach bound (hip → ankle-target distance outside [L_min, L_max] for the knee's flexion range: exact and cheap); or (b) a branch-and-bound lower bound of the residual over the whole joint box, using a Lipschitz or interval bound of the forward kinematics, greater than the tolerance. (b) is defined but **not implemented**: naive 6-D subdivision to 2 cm resolution is ~10⁸–10¹² cells, so it needs pruning and is a research item. |
| **UNKNOWN-NOT-FOUND** | no solution found; no certificate | the search record: starts used (warm + corners + quasi-random), best residual and where. **Planners must treat this as "do not plan"**, but must **never** report it as anatomically impossible. All 1,336 current invalid targets are in this class. |

**Recommended contract use:**
- **planning:** FEASIBLE with margin ≥ m° on every axis;
- **reporting:** never collapse UNKNOWN-NOT-FOUND into PROVEN-INFEASIBLE;
- **certificates:** the geometric certificate is applied first, because it is free.

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
