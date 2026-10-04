# Leg IK: G4 readiness with joint limits (overnight Phase C)

**Source:** `../sources/2026-10-04_user_instruction_overnight_pre_g4.md`, Phase C.

**Status:**
- This is a study plus an **opt-in** candidate. Nothing is adopted into the controller.
- Whether the foothold IK should respect joint limits, which limits it should use, and what to do with an anatomically unreachable foothold are **G4 design decisions** (see §6).
- G4 is not started.

**Tools:**
- `tools/ik_g4_study.mjs`: the study, 20,736 targets.
- `tools/ik_limit_audit.mjs`: do the validated G2/G3 runs ever need a limit-violating solution?
- `tools/v2_component_regressions.mjs` R4: permanent tests of the opt-in bounded IK.

**Evidence:** `evidence/`.

## 1. Question and method

**The question:** can a stepping controller ask the leg for a foothold and know whether the *anatomical* leg can reach it?

**Start states:** real validated G3 states of all 8 body variants:
- swing-ready: U:R and U:L hold at 8 s (the unloaded leg);
- near-single-support: T5 and T6 hold at 6 s (the light leg).

The pelvis pose is the controller's own posture target at that tick. It is also lowered by 5 cm and 10 cm, as a step lowers the pelvis.

**Targets** (heading frame, lateral = away from the stance foot):
- 13 families: short / medium / long / very long forward, slight backward, inward (crossing), far crossing, outward, far outward, diagonal out / in, wider / narrower short step;
- each family at foot yaw 0°, ±30° and ±45° (+ = toe-out, i.e. hip external rotation);
- each at ground level and lifted +5 / +10 cm;
- plus reach sweeps along the hip → target direction at s = 0.95 … 1.02 of the geometric reach L_max (forward, outward, down-forward).

**Total:** 20,736 targets × both legs (via the four states).

**Solvers:**
- **U:** the production `legIK` (unconstrained LM, warm start; adopted, unchanged).
- **B:** the bounded candidate: the same LM with the six solved coordinates kept inside the **anatomical hard limits** (spec `joints[k].limits.hard`), by an active set plus projection, with the warm start clamped into the box.

**Measured per target:**
1. geometric reachability (U residual ≤ 1e-6);
2. anatomical reachability (B residual ≤ 1e-6, inside the limits);
3. number of distinct valid solutions (12 seeded starts inside the limits);
4. whether the warm-start solution is the closest valid one;
5. knee hyperextension, and hip / ankle limit violations, in U's solution;
6. L/R mirror equivariance of the classification and the solution;
7. iterations and µs;
8. behaviour across the workspace boundary (reach sweeps).

## 2. Results (`evidence/ik_g4_full.log`, `evidence/ik_g4_full.json.gz`)

| target family | n | geometrically reachable | anatomically reachable (B) | U solution violates a limit | knee hyperextension (U) | ≥ 2 valid solutions | warm start = closest | L/R class mismatch U / B |
|---|---|---|---|---|---|---|---|---|
| short forward | 1440 | 1280 | 1280 | 0 | 0 | 0 | 1280/1280 | 0 / 0 |
| medium forward | 1440 | 1280 | 1149 | 131 | 0 | 0 | 1149/1149 | 0 / 0 |
| long forward | 1440 | 720 | 560 | 160 | 0 | 0 | 560/560 | 0 / 0 |
| very long forward | 1440 | 80 | 60 | 20 | 16 | 0 | 60/60 | 0 / 0 |
| slight backward | 1440 | 1280 | 1124 | 156 | 0 | 0 | 1124/1124 | 0 / 0 |
| inward (crossing) | 1440 | 1440 | 1420 | 20 | 0 | 0 | 1420/1420 | 0 / 0 |
| far crossing | 1440 | 1440 | 1349 | 91 | 0 | 0 | 1349/1349 | 0 / 0 |
| outward | 1440 | 1280 | 1191 | 89 | 0 | 0 | 1191/1191 | 0 / 0 |
| far outward | 1440 | 1280 | 1015 | 265 | 0 | 0 | 1015/1015 | 0 / 0 |
| diagonal out | 1440 | 960 | 790 | 170 | 0 | 0 | 790/790 | 0 / 0 |
| diagonal in | 1440 | 1280 | 1074 | 206 | 2 | 0 | 1074/1074 | 0 / 0 |
| wider short step | 1440 | 1280 | 1260 | 20 | 0 | 0 | 1260/1260 | 0 / 0 |
| narrower short step | 1440 | 1280 | 1272 | 8 | 0 | 0 | 1272/1272 | 0 / 0 |
| reach sweep forward | 672 | 608 | 608 | 0 | 0 | 0 | 608/608 | 0 / 0 |
| reach sweep outward | 672 | 608 | 608 | 0 | 0 | 0 | 608/608 | 0 / 0 |
| reach sweep down-forward | 672 | 608 | 608 | 0 | 0 | 0 | 608/608 | 0 / 0 |

**All targets:**
- 20,736 targets: 16,704 geometrically reachable, 15,368 anatomically reachable.
- **1,336 geometrically but not anatomically reachable (8.0 % of the geometrically reachable).** 0 targets are anatomical but not geometric.
- By pelvis drop (0 / 5 / 10 cm):

  | pelvis drop | geometric | anatomical | U violates a limit |
  |---|---|---|---|
  | 0 cm | 4,240 | 3,968 | 272 |
  | 5 cm | 6,032 | 5,621 | 411 |
  | 10 cm | 6,432 | 5,779 | 653 |

  Lowering the pelvis brings the long targets into the workspace.
- At pelvis drop 0, even a 15 cm forward step at ground level is beyond full extension for most bodies (s ≈ 1.007). A standing leg is nearly straight, so stepping needs a pelvis drop or knee flexion of the stance leg (a G4 design point).

**Which limits bind** (the 1,336 targets; a target can violate several):

| joint axis | violations | median | p90 | max beyond the hard limit |
|---|---|---|---|---|
| hip rotation | 1,109 | 3.0° | 6.8° | 14.7° |
| ankle dorsiflexion / plantarflexion | 260 | 3.2° | 7.2° | 10.4° |
| ankle inversion | 4 | 1.4° | 1.4° | 1.4° |
| hip flexion, hip abduction, knee flexion | 0 | — | — | — |

- **By foot yaw:**

  | foot yaw | geometric-but-not-anatomical |
  |---|---|
  | 0° | 36 |
  | +30° (toe-out) | 0 |
  | −30° (toe-in) | 92 |
  | +45° | 605 |
  | −45° | 603 |

  The binding constraint is mostly the hip rotation range demanded by a ±45° foot yaw. The rest is ankle range on far or lifted targets.
- **Spread:** similar across bodies (133–236 of 2,592 per body) and states (322–343 of 5,184).
- **Knee hyperextension:** 18 cases in U, **all on geometrically unreachable targets.** They are U's least-squares fallback pose for "very long forward" (16) and "diagonal in, toe-out 45°, drop 0" (2). Hyperextension **never occurs on a target U reports as reached.**

**Solution structure:**
- **Uniqueness:** every anatomically reachable target has exactly one valid solution among 12 seeded starts, and the warm-start solution is that one. There is no branch ambiguity for the controller to resolve.
- **Bounds:** no bound is active in any reached B solution. When B reaches a target, it reaches it in the interior of the box; it never finds an alternative valid branch for a target whose U solution is invalid.

**Mirror equivariance:**
- 0 L/R classification mismatches for U and for B.
- Solution mirror Δ: U ≤ 5.2e-11 m (reached); B ≤ 8.5e-8 m (reached; the largest values are at s = 1.000, exactly full extension, where LM converges sublinearly).
- Unreached optima: ≤ 1.1e-8 m.

**Workspace boundary (reach sweeps):**
- every s ≤ 1.000 target is reached by both U and B;
- s = 1.005 / 1.02 are reached only with the pelvis lowered (192 of 288, i.e. the 5 / 10 cm drops);
- no classification flip within the sweep.

**Cost** (µs per solve, measured while other simulations ran: not an idle-machine benchmark):

| | p50 | p95 | p99 |
|---|---|---|---|
| U | 125 | 267 | 745 |
| B, all targets | 164 | 854 | 1,672 |
| B, anatomically reachable | 151 | 325 | 1,003 |
| B, unreachable | 598 | 1,256 | 2,652 |

- B is capped at 30 iterations; 1,775 targets hit the cap, all of them unreachable.

## 3. The opt-in bounded IK (`ctrl/v2_stand.js` `legIKBounded`, option `ikBounds`, default **false**)

**Implementation:**
- `legIK` was refactored so that the chain construction (staged FK, central-difference Jacobian, warm start) is a separate `legChain`, shared by both solvers.
- **The default path is bit-identical:**
  - R3.e: production equals the plain reference implementation on 558 solves;
  - four G3 runs (T5, U:R, T7:R:0.25, T8:hold:L:FR:15) give identical state hashes and IK checksums under HEAD and under the refactor;
  - the 22 G3 jobs of the change attribution rerun with identical hashes.

**Algorithm:**
- The same residual, LM damping, Jacobian and adopted polish as `legIK`.
- The warm start is clamped into the hard-limit box.
- Active set: a coordinate sitting on a bound whose descent direction leaves the box is held. The damped step is solved on the free coordinates, and the trial point is projected onto the box (accepted iff the residual decreases).
- ≤ 30 iterations (`IK.maxItBounded`).
- The non-solved twist DOFs (knee axial rotation, passive ankle ab/adduction) stay at their current values, as in `legIK`. They were inside their limits in every start state.
- **Returns** `{ targets, err, it, x, atBound }`. A residual > 1e-6 means anatomically unreachable. The target is never moved.

**Convergence characteristic (finding; `evidence/kkt_diag.log`):**
- For targets that are **both** geometrically and anatomically unreachable, with hip rotation on its bound, the cost is nearly flat at the box optimum, and 30 iterations stop short of it.
- Measured (V2-REF / short-legs / 198-92, 254 unreached targets):
  - 30 iterations end within **0.18 mm** (residual) of the optimum;
  - but up to **1.9°** away in joint coordinates (KKT residual up to 7.5e-4).
  - Two targets do not reach stationarity even in 500 iterations.
- **Classification is unaffected.** But the *fallback pose* for an unreachable foothold is not well-determined. That matters if G4 uses it, for example as "the closest valid placement".
- The same is true of the unconstrained IK's fallback (12 iterations; R3 tolerates 1e-6 m mirror differences there).

**Permanent tests (R4, 25/25 suite pass):**

| test | requirement | result |
|---|---|---|
| R4.a | off by default; the option routes `legIK` → `legIKBounded` | pass |
| R4.b | every solution inside the hard limits | 420 / 420 |
| R4.c | equals the unconstrained IK wherever that solution is anatomically valid (≤ 1e-9 rad) | 0 of 166 differ |
| R4.d | an invalid unconstrained solution is never accepted: valid branch or reported unreachable | 14 / 14 reported (KKT of unreached iterates reported: ≤ 7.5e-4) |
| R4.e | L/R mirror equivariance, with σ = (−1, +1, −1, +1, +1, −1) on (hip tw, hip flex, hip abd, knee, ankle DF, ankle inv) | 0 class mismatches; reached Δ ≤ 1.2e-14 rad, unreached ≤ 3.7e-8 rad |
| R4.f | the target is never modified | pass |

- The first R4 draft compared raw L/R coordinates. Mirroring flips the sign of hip twist / abduction and ankle inversion, so that was a test bug; σ was taken from the measured solutions and the limit boxes, which map exactly onto each other under σ.
- The first draft also demanded KKT ≤ 1e-6, which the solver does not guarantee (see above). It is now reported, not gated.

## 4. Do the validated G2/G3 behaviours ever need a limit-violating solution? (`tools/ik_limit_audit.mjs`)

**Scope:** 226 validated runs.
- G2: quiet stance (8 bodies), plus the push at each body's largest recovered magnitude in F / B / R / L / FR / BL.
- G3: U:R, U:L and T9 for all 8 bodies; V2-REF T1–T6; T7 R / L at all 6 ramp times; all 128 T8 pushes.

`legIK` is wrapped and every pre-fall solve is checked against the anatomical hard limits: 1,199,474 solves.

### 4.1 Result (`evidence/ik_limit_audit_226runs.json`, `evidence/ik_limit_audit_25runs_abort_timing.json`)

- **0 solves beyond the hard limits before a supervisor abort**, in any run. Every standing, recovering and transferring behaviour of the validated gates stays inside the anatomical box.
- **1,526 beyond-limit solves (0.13 %)**, all in **25 T8 runs that are physically failed requests** ("step required → fell", V2-REF, 15 / 20 N·s), and **all after the supervisor abort**:
  - the first one is 0.88–1.58 s after the abort, and 0.01–0.33 s before the fall declaration;
  - that is, during the uncontrolled collapse, when the leg IK is asked to place a foot from a falling pelvis.
- **Excursions there:** hip abduction ≤ 33.3°, hip flexion ≤ 26.1°, hip rotation ≤ 22.9°, knee ≤ 8.4° beyond the limit; the ankle never.
- **Implication for option O3:**
  - Up to any abort, the bounded IK would return the unconstrained solution to ≤ 1e-9 rad (R4.c; bit-identity is not established, because the LM path can touch the box).
  - After an abort in failed trials, it would change the falling trajectory, which is report-only.
  - Adopting it would still need a full revalidation.

## 5. IK G4 readiness: verdict

**Ready:**
- the LM leg IK gives a **unique** solution for every anatomically reachable G4-style target, and the warm start finds it;
- it is mirror-exact (classification and solution);
- it is continuous across the workspace boundary;
- it costs ~0.1–0.2 ms per solve;
- geometric reachability is classified correctly, and an unreachable target is reported, never moved.

**Not ready without a decision:**
- The production IK **accepts anatomically invalid poses for 8 % of geometrically reachable G4-style targets**. These are mostly the hip rotation that a ±45° foot yaw demands, plus ankle range on far or lifted targets.
- A G4 that trusts `legIK`'s "reached" would plan such footholds.
- The opt-in bounded IK fixes the classification (exact, mirror-equivariant, tested). But its fallback pose for unreachable targets is not converged (§3).
- The choice between O1–O4 and the unreachable-foothold policy (§6) must be made before G4.

**Not a G2/G3 problem:** the validated behaviours never need a limit-violating solution before an abort (§4.1).

**Post-fall IK non-equivariance** (earlier finding, measured in post-fall states):
- In the G4-relevant swing-leg states measured here (U:R / U:L swing-ready, T5 / T6 near-single-support, all 8 bodies, 20,736 targets), the IK is mirror-exact: 0 class mismatches; ≤ 5e-11 m reached.
- §4.1's limit-violating solves also occur only after the abort.
- Not shown: that no other pre-fall state is affected. This study samples four states per body.

## 6. Alternatives for the G4 decision (not decided here)

| option | what it means | consequence |
|---|---|---|
| **O1. Unconstrained IK + post-check** | G4 calls `legIK`, then checks the solution against the limits itself | Simplest. The IK still *reports reachable* for 8 % of geometrically reachable G4-style targets whose pose is anatomically invalid; every caller must remember the check. |
| **O2. Bounded IK for foothold queries only** | G4's reachability queries use `legIKBounded`; stance posture keeps `legIK` | Validated G2/G3 behaviour is untouched by construction; the foothold answer is anatomical. Two solvers to maintain (shared chain). |
| **O3. Bounded IK everywhere** (`ikBounds: true`) | all leg IK respects the hard limits | Changes G2/G3 behaviour only where `legIK` currently needs a limit-violating solution (§4.1). Requires a revalidation. |
| **O4. Limits other than the hard limits** | e.g. the soft limits (passive-torque onset), or a margin inside the hard limits | Anatomy / limits decision. Reachability shrinks further, and the active-set behaviour is unchanged. |

**Policy for an anatomically unreachable foothold** (independent of O1–O4): refuse it, project the target, change the pelvis height, or re-plan the step. This is a G4 controller design question.
- The study shows a 5–10 cm pelvis drop changes reachability far more than limits do.
- The fallback pose for unreachable targets is not well-determined (§3), so a "closest valid pose" policy would need a converged solver or a different formulation.
