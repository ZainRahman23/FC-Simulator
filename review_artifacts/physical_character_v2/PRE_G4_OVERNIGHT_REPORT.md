# Physical Character V2: overnight pre-G4 report (2026-10-04)

**Source:** `sources/2026-10-04_user_instruction_overnight_pre_g4.md` (verbatim).

**Status:** stopped at the pre-G4 decision point.
- **G3 is not declared.** All 20 rows of criteria v3.2 pass, but J2b failed its pre-registered meaningfulness test.
- **So the ankle reinvestigation (Phase F) and the 180 Hz study (Phase G) were not started.** Both require G0 → G3 to be genuinely clean.
- G4 not started. Everything is committed locally. **Nothing is pushed.**

**Labels:** **ADOPTED** = in the production configuration; **DIAGNOSTIC** = evidence or tool only; **REJECTED** = evaluated, not used; **UNRESOLVED** = needs your decision.

## Decisions needed from you

1. **J2b (blocks the G3 declaration, and so the ankle work).** The pre-registered procedure gives tolerances A 0.5 / B 10 / C 2 mm and 5 ticks. The 81 G3 pairs pass them, and would also pass your provisional 0.25 / 5 / 1 mm. But **no tolerance that keeps a 2× margin over the plant's measured floor detects a 5 % strength, a 5 % foot-mass or a 2 mm region asymmetry** (item 6). **J2a, by contrast, detects all three by 9–12 orders of magnitude.**

   | option | what it means | consequence |
   |---|---|---|
   | (a) | J2a is the symmetry gate; J2b is a reported characterisation of the plant's chaotic floor | G3 PASS 20/20 under v3.2 as run |
   | (b) | Re-define J2b's scored quantity (e.g. pelvis / COM trajectory, per-foot load share) and re-preregister it, with a meaningfulness test | New J2b runs; G3 waits |
   | (c) | Another rule of your choosing | — |

2. **G4 foothold IK policy.** Unconstrained IK + post-check, bounded IK for foothold queries only, bounded everywhere, or other limits; and what to do with an anatomically unreachable foothold (item 13).
3. **Ankle:** after (1), whether to run Phase F as pre-registered (draft updated; item 15).

## 1. Foot-region implementation: ADOPTED (`833ec4a`)

**Construction:** usable region = canonical convex hull → radial 5 mm inset → canonical convex hull (`ctrl/v2_stand.js` `usableRegion`). Inside test = exact crossing number (`insidePoly`).

**Results** (`symmetry_final/evidence/region_study_final_convex.json`, 8 bodies × 2 feet):

| property | former region | adopted region |
|---|---|---|
| reflex vertices | up to 5 | 0 |
| projection Lipschitz constant | 201.7 | 1.000 |
| projection jump for a 0.05 mm target move | up to 10.1 mm | 0.050 mm |
| change under a 1e-15 m input perturbation | 0.599 mm | 3e-14 mm |
| change under extra collinear points / permuted order | — | 0 |

- **L/R:** exact mirrors.
- **Area:** +1.2–1.4 % vs the former region (the reflex notch filled); the region contains the former one. The collision geometry is untouched.
- **Known debt:** the radial inset is not uniform (≈ 2 mm narrower on the lateral edges). Recorded, unchanged.

## 2. Quaternion scope: ADOPTED (`833ec4a`)

- **Scope:** Jolt orientations are normalised only at the controller-side boundary: `StandController.compute`, `ActuatorLayer.compute`, and the actuator's own rotation reads.
- **The passive plant reads raw Jolt quaternions, as historically.** G1 is therefore bit-identical to the historical flat-plane G1.
- **Global normalisation: REJECTED.** It perturbed passive torque axes at ~1e-8 and flipped 2 chaotically marginal G1 rows (trace: `symmetry_final/evidence/quaternion_trace_g1.txt`).

## 3. IK implementation: ADOPTED (`833ec4a`, refactor `f7b8a0c`)

**Method:** central-difference Levenberg–Marquardt with Marquardt damping (μ0 1e-2), residual tolerance 1e-12, ≤ 12 iterations, and a gradient stop for unreachable targets. Then a **post-convergence polish**: one LM step with the last Jacobian, kept if it does not increase the residual. Staged forward kinematics.

**Results:**
- Near-reach problems (10,880): reachable residual ≤ 1.5e-15. The 81 J2a pairs: 81/81.
- Cost: 0.080 vs 0.107 ms per tick for the IK after staging.

**Refactor:** `legChain` (shared chain), plus an **opt-in** `legIKBounded` (option `ikBounds`, default off; item 13).
- **The default path is bit-identical:** R3.e on 558 solves; 4 G3 runs (state hashes plus IK checksums); 22 G3 reruns.

**Rejected:** polish "floor" and bounded-step LM variants (lost convergence).

## 4. J2a result: ADOPTED as the gate result, PASS 81/81

- 443,469 ticks probed (both directions, up to each fall). Discrete decisions identical; replay self-check bit-exact.
- Tolerances = v3's rule (max(10 × floor, 100·ε·scale)) on the final controller's floor. That floor came from 27,709 states, with 0 discrete flips.
- **Worst / tolerance:** command torque 3.3e-11 / 3.1e-10 N·m; CoP 6.7e-13 / 2.3e-11 mm; IK residual 1.8e-15 / 2.2e-14.
- **Diagnostic** (`g3/json/g3_mirror_v3_inject-*.json`): J2a detects every injected asymmetry in all 5 tested pairs:

  | injection | detected via | measured / tolerance |
  |---|---|---|
  | right actuator capacity −5 % | actuator capacity | 11 N·m / 2.2e-11 |
  | right foot mass +5 % | contact force | 0.9 N / 1.2e-10 |
  | right region shifted 2 mm | commanded CoP | 2.0 mm / 2.3e-11 |

## 5. J2b floor: DIAGNOSTIC (final configuration)

- **Data:** characterisation 1,027 pairs plus held-out 230 pairs, 0 errors; repeats 94/94 bit-identical.
- **Class maxima:**

  | class | n | max | p99 |
  |---|---|---|---|
  | A | 524 | 0.206 mm | 0.162 mm |
  | B | 375 | 3.58 mm | 2.92 mm |
  | C (through the common abort) | 173 | 0.683 mm | — |

  Abort-tick difference ≤ 1. 0 class mismatches; 0 one-sided aborts.
- **The held-out set raised the B and C maxima** by 44 % and 28 %.
- **Cause (from the earlier attribution, `e9bcf96` data):** chaotic amplification of rounding-level differences, growing with sliding. It is **not** Jolt creation order: swapped-order worlds give ×0.87–1.17.

## 6. J2b criteria: UNRESOLVED (`g3/G3_CRITERIA_v3.2.md`, `g3/json/j2b_tol_v32.json`)

**Pre-registered rule** (2× the class maximum; your provisional value if it satisfies that, otherwise a fixed ladder):
- your provisional A 0.25 / B 5 / C 1 mm are **rejected** (each below 2 × max);
- the rule gives **A 0.5 / B 10 / C 2 mm**;
- timing **5 ticks** is accepted.

**Meaningfulness: NOT MET** (19 G3-like pairs per injection, plus an uninjected control). With these tolerances, **0 of 3 injections produce a J2b failure**, and every injected run differs from its control (hashes), so no injection is a no-op.

| injection | max by class: A / B / C (mm) | compared with the floor |
|---|---|---|
| 2 mm region shift | 0.373 / 4.0 / 0.57 | above the floor in A and B, but not above 2×; in C below the floor |
| 5 % strength | within the control scatter | foot displacement does not respond |
| 5 % foot mass | within the control scatter | foot displacement does not respond |

- With your provisional values, only the region shift would be caught (1 of 3).
- **The 81-pair J2b evaluation:** PASS 81/81 (A 0.203, B 2.46, C 0.46 mm).
- **As pre-registered, G3 is not declared on it.**

## 7. G0: ADOPTED result, PASS

0 failing checks (`g0/json/g0_results.json`).

## 8. G1: ADOPTED result, PASS

- 0 failing gate checks (234 s run); browser = Node 10/10.
- The plant is bit-identical to the historical flat-plane G1 (narrow quaternion scope), so the 2 rows that failed under global normalisation pass again.

## 9. G2: ADOPTED result, PASS

- All criteria-v1 rows pass, except:
  - R, superseded by the approved plant change;
  - 2.5, which per your §6 decision is the isolated benchmark: **0.093 ms** (the in-run nine-worker 0.265 ms is reported, not gated).
- Browser = Node 6/6; snapshot / restore 3/3 bit-exact; energy residual max −0.285 J.
- **Outcomes:** 620 jobs, **0 outcome changes vs the accepted flat-plane G2 (`13b0848`)**.
  - Against `7eb6248`, 1 report-only arm differs: kξ 0.5 at push R 25 N·s, recovered → step required → fell. That is the accepted outcome **restored**: `7eb6248` had changed it.

## 10. G3: UNRESOLVED (criteria v3.2: all 20 rows PASS, not declared)

- Rows run, A, B, C, D, E2, F2, G, H, I2, J2a, J2b, K, L, M, N, O, P2, Q and S2 all pass (`g3/G3_TABLES.md`, `g3/json/g3_checks_v32.json`).
- **Not declared:** J2b failed its meaningfulness test (item 6).
- Historical evaluations of the same run: v3.1 18/20, v3 17/20, v2 17/19, v1 15/19 (all unchanged as records).

## 11. Every changed outcome: ADOPTED explanation (`symmetry_final/evidence/g3_change_attribution/`)

**G0, G1 and G2:**
- G1 is bit-identical to the historical flat-plane run.
- G2: 0 outcome changes vs the accepted baseline (item 9).

**G3, vs `7eb6248`: 0 outcome changes.**
- **Correction:** I earlier reported 1 outcome change (strategy T8:hold:R:BR:15). It was a **pairing artifact** of a comparison that ignored the `eval` variant.

**22 abort-timing changes:**
- 20 aborts move later: +1 tick in mirrored T8 pairs and the abort / strategy arms; +2 in T11; +10…+14 in 3 knee arms and in UP:R:R:10 / UP:L:L:10.
- 2 aborts no longer happen (T8:hold:R:FL:10 and its mirror). Both trials still recover.
- **All 22 are reproduced exactly (22 / 22)** by reverting *only* the region construction and inside test to `7eb6248`'s.
- **Cause:** the convex region is slightly larger, so the supervisor's margin crosses later.
- **The polish** changes one abort by one tick (T8:ramp:R:BR:15, 597 vs 598). With the polish, that pair's timing is mirror-identical.
- The final-code rerun matches bit for bit (22 / 22 hashes).

## 12. Near-reach / joint-limit IK findings: DIAGNOSTIC (`ik_g4_readiness/IK_G4_READINESS.md`)

**Study:** 20,736 G4-style targets.
- Real swing-ready and near-single-support states; 8 bodies; both legs.
- Forward, backward, inward, outward, diagonal, widths, foot yaw ±30° / ±45°, lifted targets.
- Pelvis lowered 0 / 5 / 10 cm; reach sweeps.

**Reachability:**
- 16,704 geometrically reachable, 15,368 anatomically reachable.
- **1,336 targets (8 % of the geometrically reachable) are reached by the production IK only with an anatomically invalid pose.**

**Which limits bind (beyond the hard limit):**

| joint axis | cases | median | max |
|---|---|---|---|
| hip rotation | 1,109 | 3.0° | 14.7° |
| ankle dorsiflexion | 260 | 3.2° | 10.4° |
| ankle inversion | 4 | 1.4° | 1.4° |

- These come mostly from ±45° foot yaw.
- **Knee hyperextension:** 18 cases, **only on geometrically unreachable targets** (U's least-squares fallback pose), never on a reached one.

**Solution structure:**
- Every anatomically reachable target has exactly **one** valid solution among 12 seeded starts, and the warm start finds it.
- Mirror classification mismatches: 0.
- No classification flip across the reach boundary.

**Pelvis height matters more than limits:**
- at drop 0, a 15 cm forward step at ground level exceeds full extension (s ≈ 1.007);
- a 5–10 cm drop brings most long targets in.

**Validated runs** (226 runs, 1.2 M IK solves; `tools/ik_limit_audit.mjs`):
- **0 beyond-limit solves before a supervisor abort.**
- All 1,526 occur in 25 failed T8 trials, 0.9–1.6 s *after* the abort, during the collapse.

## 13. IK G4 readiness: UNRESOLVED

**Ready:**
- unique, mirror-exact solutions;
- continuous across the reach boundary;
- ≈ 0.1–0.2 ms per solve;
- unreachable targets reported, never moved.

**Not ready without a decision:**
- `legIK` reports "reached" for anatomically invalid poses, so a G4 that trusts it would plan such footholds.

**Opt-in bounded IK (`legIKBounded`): DIAGNOSTIC, not adopted:**
- active-set projected LM inside the anatomical hard limits; default off;
- tested by R4 (suite 25/25): always inside the limits; equals `legIK` where that solution is valid (≤ 1e-9 rad); invalid targets reported unreachable; mirror-equivariant (reached Δ ≤ 1.2e-14 rad); target never moved.
- **Finding:** for targets that are both geometrically and anatomically unreachable, 30 iterations stop short of the box optimum: within 0.18 mm of residual, but up to 1.9° in joint coordinates. **The "closest valid pose" fallback is not well-determined.** Classification is unaffected.

**Options:**
- O1: unconstrained IK + post-check;
- O2: bounded IK for foothold queries only;
- O3: bounded everywhere (would change nothing before any abort in the validated runs; needs a revalidation);
- O4: other limits.

Plus a policy for unreachable footholds.

## 14. Performance: ADOPTED measurement; no further optimisation (per your §6 decision)

**Isolated benchmark** (`g3/json/g3_bench.json`, 7 trials; no other simulation process; system load 2.2–3.6 from other activity, so not perfectly idle):
- controller + actuators **0.093–0.103 ms** per tick, mean (budget 0.15);
- p99 0.21–0.23 ms;
- controller alone 0.081–0.091 ms;
- previously 0.129–0.135 ms (FP-9).

**Per component** (`perf/perf_bench.json`, warm, steady state, ms per tick):

| component | mean | median | p95 | p99 |
|---|---|---|---|---|
| controller | 0.080–0.092 | 0.074–0.086 | 0.085–0.108 | 0.20–0.22 |
| of which leg IK (≈ 86 %) | 0.069–0.080 | — | — | — |
| actuators | 0.011 | — | — | — |
| passive layer | 0.14–0.15 | — | — | — |
| Jolt step | 0.31–0.34 | — | — | — |
| whole tick, with measurement | 0.69–0.75 | — | — | — |

- **Cold** (first second, fresh process): controller ≈ 0.15 ms, tick ≈ 1.07 ms.
- **Result-identical optimisations made:** staged FK (−25 % IK) and the `legChain` refactor. Both are verified bit-identical.

## 15. Ankle: NOT STARTED (precondition not met)

- G3 is not declared (item 10). The pre-registration draft (`ankle_plane/ANKLE_REINVESTIGATION_PREREG.md`) is updated to the overnight candidate set (k = 0 baseline, 0.11, 0.13, 0.15 N·m/°) and the v3.2 criteria. It stays a **DRAFT**.
- `V2_ANKLE_NEUTRAL_K` was never set in any overnight run.

## 16. 180 Hz: NOT STARTED

Phase G investigates the effect if the ankle candidates reproduce it, so it depends on Phase F.

## 17. Ankle recommendation: none

Not reached.

## 18. Technical debt

| # | debt |
|---|---|
| 1 | Radial inset: not uniform (≈ 2 mm lateral) and not convexity-preserving; convexity restored by the final hull. |
| 2 | IK fallback pose for unreachable targets is not converged (unconstrained: 12 iterations; bounded: 30); hyperextended-knee fallback in U. |
| 3 | J2b's scored quantity (foot displacement) is insensitive to controller-relevant asymmetries; its floor is chaotic and grows with sliding. |
| 4 | G1 chaotic marginality (FP-9: 1.S′ elbow, row 8 at 360 Hz) persists in perturbed runs; it is masked, not removed, by bit-identity. |
| 5 | Post-fall IK non-equivariance and post-abort limit violations (report-only). |
| 6 | The leg IK is ≈ 86 % of the controller's cost; p99 ≈ 2.5 × the mean. |
| 7 | The in-run cost under 9 workers (0.265 ms) is not representative and must not be quoted as production cost. |
| 8 | Comparisons of G3 results must key on (group, body, key, title, stand, eval): the earlier pairing artifact. |
| 9 | A standing stance leg is near full extension, so stepping needs a pelvis drop (a G4 design input). |
| 10 | The free ankle twist (10–18° at k = 0) is unresolved: the ankle question. |

## 19. Commits (local, `prototype/physical-character-v2`; nothing pushed)

| commit | content |
|---|---|
| `833ec4a` | symmetry package finalised: narrow quaternion scope, convex regions + exact inside test, IK polish, staged FK; component regressions 19/19 |
| `5b9d756` | G3 v3.2 pre-registration (J2a final-floor tolerances; J2b procedure) |
| `f7b8a0c` | opt-in bounded IK + R4 tests (25/25); G4 IK readiness study; G3 change attribution; Phase E raw results; tools |
| `8e57a3e` | J2b tolerances and meaningfulness result, recorded **before** the 81-pair gate run |
| `d67f417` | G3 v3.2 evaluation; refreshed records (browser = Node, mirror pairs, earlier gates, tables); benchmarks; IK limit audit |
| (this report) | report, decisions log, ankle draft update |

## 20. URLs

**Review server** (running): `http://127.0.0.1:8172/`
- viewers: `/sandbox/visual/physchar2/viewer/index.html`, `g1.html`, `g2.html`, `g3.html`;
- tables: `/review_artifacts/physical_character_v2/g3/G3_TABLES.md` (G1 / G2 likewise).

**Branch:** `prototype/physical-character-v2`, local only.

## 21. Biggest blocker before G4

**The J2b decision (item 6 / decision 1).**
- Every G3 row passes, but under the pre-registered rule G3 cannot be declared on a J2b that cannot detect a 5 % asymmetry.
- Until it is resolved, the ankle reinvestigation cannot start. Your sequence puts the ankle (free twist 10–18°) before G4.
- **Second:** the G4 foothold-IK policy (item 13), because the production IK accepts anatomically invalid footholds for 8 % of reachable G4-style targets.
