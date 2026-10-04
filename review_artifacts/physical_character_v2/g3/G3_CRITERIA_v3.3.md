# V2-G3 pass criteria v3.3: J2a is the normative left/right symmetry gate; J2b is a permanent plant mirror-divergence diagnostic

**Source:** `../sources/2026-10-04_user_decision_j2a_gate_ankle_ik_research.md`, Decision 1 (Option (a)), verbatim there.

**Type:** a test-design correction, supported by the pre-registered test-of-the-test (`G3_CRITERIA_v3.2.md` step 4). **It is not a relaxation made because the production character failed.** Every row passes under v3.2 as well, including J2b against its v3.2 tolerances. The change concerns which check is fit to be the symmetry *gate*.

## Rationale (user decision, recorded as given)

- **J2a directly tests the property we care about:** mirror-equivariance of controller decisions from mirrored physical inputs.
- **J2a detects all three deliberately injected asymmetries** by 9–12 orders of magnitude (`json/g3_mirror_v3_inject-*.json`):
  - 5 % unilateral strength loss;
  - 5 % heavier right foot;
  - 2 mm unilateral foot-region shift.
- **J2b cannot do both at once:** keep a reasonable margin above the independently measured contact / numerical floor, and detect those injected asymmetries (`json/j2b_tol_v32.json`: 0 of 3 detected).
- **J2b therefore measures** chaotic divergence of independently evolved contact trajectories. That is useful diagnostic information, but not a sensitive enough symmetry gate.

## Definition

- **Every row except J2b is v3.2's, unchanged:** run, A, B, C, D, E2, F2, G, H, I2, **J2a**, K, L, M, N, O, P2, Q, S2.
  - J2a keeps v3.2's tolerances: v3's rule max(10 × floor, 100·ε·scale) on the final controller's floor (`json/g3_mirror_floor.json`).
  - P2 keeps v3.2's form: G2 row 2.5 is judged on the isolated benchmark.
- **J2b: DIAGNOSTIC, reported and never gating.** Same measurement as v3.2 (`tools/g3_mirror_v3.mjs`, 81 pairs). It is reported by class, with distributions (n, median, p90, p99, max) and maxima, so future regressions stay visible:
  - **A:** no meaningful slide;
  - **B:** slide, then recovery;
  - **C:** failure through the common supervisor abort.
- **Also reported:**
  - the abort-tick difference distribution;
  - class mismatches;
  - failures without a common abort;
  - pairs above the v3.2 reference values (A 0.5 / B 10 / C 2 mm, 5 ticks);
  - the floor population (`tools/j2b_floor.mjs`, characterisation ∪ held-out) by class, whenever it is re-run.
- **Gate:** G3 PASS iff every gating row passes (19 rows). J2b is listed as a reported row (20 rows in all).
- **Evaluator:** `gates/v2_g3_checks_v33.js` (`evaluateV33`, `j2bDiagnostic`). It is wired into `tools/g3_report_tables.mjs` as the operative evaluation; `json/g3_checks_v33.json`.

**History preserved, unchanged:**
- files: v1 `G3_CRITERIA.md`, v2 `G3_CRITERIA_v2.md` (J2), v3 `G3_CRITERIA_v3.md` (J2a / J2b, D4 numbers), the v3.1 erratum, v3.2 `G3_CRITERIA_v3.2.md` (J2b procedure, tolerances, meaningfulness);
- their evaluators and results: v1 15/19, v2 17/19, v3 17/20, v3.1 18/20, v3.2 20/20 rows, not declared.

## Result on the final configuration (run `json/g3_results.json`, J2a / J2b `json/g3_mirror_v3.json`): **G3 PASS, 20/20 rows (19 gating + J2b reported)**

- **J2a: PASS 81/81.**
  - 443,469 ticks probed (both directions, up to each fall); discrete decisions identical; replay self-check bit-exact.
  - Worst / tolerance: command torque 3.3e-11 / 3.1e-10 N·m; CoP 6.7e-13 / 2.3e-11 mm; share 1.1e-15 / 1.2e-13; IK residual 1.8e-15 / 2.2e-14.
- **J2b (diagnostic), 81 pairs:**

  | class | n | median | p90 | p99 | max |
  |---|---|---|---|---|---|
  | A | 50 | 0.033 mm | 0.055 mm | 0.092 mm | 0.203 mm |
  | B | 17 | 0.336 mm | 1.17 mm | 1.19 mm | 2.46 mm |
  | C, through the abort | 14 | 0.038 mm | 0.083 mm | 0.277 mm | 0.460 mm |

  - Abort Δ: 0 ticks in 14 / 14. 0 class mismatches; 0 failures without a common abort; 0 pairs above the v3.2 reference values.
  - **Floor population** (1,257 pairs, final configuration): A max 0.206 mm (n 524), B max 3.58 mm (n 375), C max 0.683 mm (n 173); abort Δ ≤ 1 tick.
- **All other 18 gating rows pass** (`G3_TABLES.md` section "criteria v3.3"). Among them:
  - O: browser = Node 4/4;
  - P2: G0, G1, G1 browser, G2 rows, G2 browser, isolated 0.093 ms;
  - S2: 0.097 ms.
