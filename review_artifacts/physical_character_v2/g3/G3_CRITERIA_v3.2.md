# V2-G3 pass criteria v3.2: the final symmetry package, J2a floor re-derived, J2b with evidence-backed tolerances (pre-registered before the final J2b data)

**Source:** `../sources/2026-10-04_user_instruction_overnight_pre_g4.md`:
- Phase B: "My provisional engineering tolerances are A 0.25 mm, B 5 mm, C 1 mm through supervisor abort, failure/abort timing 5 ticks … Test them against the independent characterization population and additional held-out mirrored states. If evidence shows they provide a sensible margin above the measured physical/numerical floor without becoming so loose that the check loses meaning, you may preregister and adopt them. If evidence contradicts them, derive a better simple rule … do not simply set a threshold just above the worst observed failure."
- Phase E: "G3 clean under explicitly versioned criteria."

**History is preserved:**
- v1, v2 (J2) and v3 / v3.1 (J2a / J2b) are unchanged files with unchanged results: 15/19, 18/19, 19/20, 17/20.
- D4's J2b numbers (0.1 / 2.0 mm) and the first independent floor study (`j2b_floor.json`, configuration e9bcf96) stay in the record.

## Configuration

- **The final symmetry package** (commit `833ec4a`):
  - usable regions = canonical hull → radial inset → canonical convex hull;
  - exact `insidePoly`;
  - quaternions normalised at the controller-side boundary only, so the passive plant is bit-identical to the historical flat-plane G1;
  - LM leg IK with central differences, μ0 1e-2, 1e-12, and the post-convergence polish with the last Jacobian;
  - staged forward kinematics.
- Flat-plane turf, ankle k = 0, `G3_STAND` unchanged.

## Rows

**Every row except J2a / J2b is v2's** (and v3's), unchanged. P2 reads: G0 pass, G1 v4 PASS, browser = Node for G1 and G2, and the G2 criteria v1 rows except R (superseded) and 2.5.
- **Row 2.5 (production performance):** per the user decision of 2026-10-04 §6, the production gate is the isolated benchmark (G3 S2 methodology), not the in-run 9-worker measurement. The in-run value is reported.

### J2a: controller mirror-equivariance (as v3.1)

- **Method:** `tools/g3_mirror_v3.mjs` gate mode, unchanged.
- **Tolerances:** v3's unchanged rule, max(10 × floor, 100·ε·scale), applied to the floor of the **final** controller. It is re-measured by `tools/g3_mirror_v3.mjs --floor` before the J2a gate run, and the numbers are entered below before that run.
- **`sigmaErr`:** reported, not gated.

### J2b: mirrored physical-outcome correspondence (G3-relevant classes only)

| class | definition (per mirrored pair of independently evolved runs) | scored quantity |
|---|---|---|
| **A** | no meaningful sliding: both trials keep every foot within 1.0 mm of its start for the whole run; no fall | max mirrored foot-displacement difference over the run |
| **B** | meaningful sliding, then successful recovery: no fall | max mirrored foot-displacement difference over the run |
| **C** | the request fails physically, **through the common supervisor abort**: both trials abort and are the same class | max mirrored foot-displacement difference up to the common abort; abort timing difference |

- **Always required:** identical outcome class; equal run lengths for A / B; T9 R vs L hold means within 1e-3.
- **Not a G3 criterion** (reported only): divergence after the abort (uncontrolled falling), and G2 falls measured to the fall declaration.

**Tolerance procedure (fixed now, applied to the final data):**
1. **Population P** = the independent characterisation set (`tools/j2b_floor.mjs`, the same 1,027-job set as `J2B_FLOOR_PREREG.md`) **∪ the held-out set** (`--set=heldout`: intermediate push magnitudes 12.5 / 17.5 N·s; T8 on three other bodies; ramps of 1.5 / 0.35 s; T1 / T2 on four other bodies; T5 and U on all 8 bodies with new perturbation magnitudes and directions).
   - Both are run on the final configuration.
   - Only the G3-relevant classes are used: G2 situations count in A / B; G2 falls are excluded from C.
2. **For each class k:** m_k = the maximum of the scored quantity over P. Candidate t_k = the user's provisional value (A 0.25 mm, B 5 mm, C 1 mm; timing 5 ticks).
3. **Margin:** accept t_k iff t_k ≥ 2 · m_k; for timing, t ≥ 2 · (max abort-tick difference), at least 2.
   - Otherwise t_k := the smallest value of {0.25, 0.5, 1, 2, 5, 10, 20} mm with t_k ≥ 2 · m_k; timing := 2 · max, rounded up.
   - The rule always uses the maximum. Pairs above 3 × the class p99 are flagged and explained, never dropped.
4. **Meaningfulness:** the injection set (`--set=inject`: right-side actuator capacity −5 %, right foot mass +5 %, right usable region shifted 2 mm laterally; 19 G3 pairs each) is scored with the resulting tolerances.
   - The check is meaningful if **at least two of the three** injected asymmetries produce at least one exceedance.
   - Otherwise this is **reported to the user as "too loose to detect a 5 % asymmetry"**, and G3 is not declared on it.
5. **Adoption:** the resulting t_A, t_B, t_C and timing become J2b v3.2, recorded in this file before the J2b gate evaluation of the 81 G3 pairs.

**G3 PASS under v3.2** requires every row (A … S2, J2a, J2b, P2) to pass on the final configuration's run, with no physical result hidden or tuned.

## Recorded before the gate runs (filled in, not changed after)

*(J2a floor and tolerances; J2b population maxima and the resulting tolerances; injection result.)*

**J2a tolerances of the final controller** (floor `json/g3_mirror_floor.json`, measured after commit `833ec4a`: 27,709 states, 0 discrete flips, bit-exact replay; rule max(10 × floor, 100·ε·scale)):

| category | floor | tolerance |
|---|---|---|
| lam | 0 | 2.2e-14 |
| copMm | 2.33e-12 mm | 2.3e-11 mm |
| share | 1.15e-14 | 1.2e-13 |
| footCopMm | 1.45e-12 mm | 2.2e-11 mm |
| forceN | 1.22e-11 N | 1.2e-10 N |
| cmdTauNm / actTauNm | 3.14e-11 N·m | 3.1e-10 N·m |
| cmdGain / actGain | 0 | 2.2e-10 |
| actBoundNm | 8.78e-12 N·m | 8.8e-11 N·m |
| actCapNm | 5.97e-13 N·m | 2.2e-11 N·m |
| activation | 9.52e-14 | 9.5e-13 |
| holdMm | 1.50e-13 mm | 2.2e-11 mm |
| holdRad | 1.29e-15 rad | 7.0e-14 rad |
| g3OutS | 0 | 2.2e-14 s |
| ikResM | 1.50e-15 | 2.2e-14 |

**J2b tolerances** (procedure steps 1–3 applied by `tools/j2b_tol_v32.mjs` → `json/j2b_tol_v32.json`, before the 81-pair J2b gate run).

**Data:** characterisation 1,027 pairs plus held-out 230 pairs, final configuration (commits 833ec4a / f7b8a0c, bit-identical), 0 errors.
- Population: 1,163 base pairs; 1,072 used; 91 G2 falls excluded (not a G3 criterion); 0 G3 falls without a common abort.
- 0 class mismatches; 0 one-sided aborts; 0 pairs above 3 × class p99.

| class | n | median | p99 | max (char / held-out) | provisional | 2 · max | provisional accepted? | **v3.2 tolerance** | margin |
|---|---|---|---|---|---|---|---|---|---|
| A | 524 | 0.034 mm | 0.162 mm | 0.206 mm (0.206 / 0.162) | 0.25 mm | 0.411 mm | **no** | **0.5 mm** | 2.4 × max |
| B | 375 | 0.151 mm | 2.92 mm | 3.58 mm (2.49 / 3.58) | 5 mm | 7.16 mm | **no** | **10 mm** | 2.8 × max |
| C | 173 | 0.045 mm | 0.558 mm | 0.683 mm (0.533 / 0.683) | 1 mm | 1.37 mm | **no** | **2 mm** | 2.9 × max |
| C abort timing | 173 | — | — | 1 tick (0: 168, 1: 5) | 5 ticks | 2 | **yes** | **5 ticks** | — |

- The held-out set raised the maxima of B (+44 %) and C (+28 %) over the characterisation alone. This is why the procedure uses both sets.

**Meaningfulness (step 4): NOT MET.**

The injection set is 19 G3-gate-like pairs per injection plus 19 uninjected control pairs. Every injected run differs from its control (hashes), so no injection is a no-op.

| injection | J2b failures with the tolerances above | max by class: A / B / C (mm) |
|---|---|---|
| control (none) | 0 / 19 | 0.203 / 1.118 / 0.038 |
| right actuator capacity −5 % | **0 / 19** | 0.171 / 1.033 / 0.037 |
| right foot mass +5 % | **0 / 19** | 0.152 / 1.201 / 0.060 |
| right usable region +2 mm lateral | **0 / 19** | 0.373 / 3.998 / 0.569 |

- **0 of 3** injected asymmetries produce an exceedance. As pre-registered, **J2b v3.2 is reported as too loose to detect a 5 % asymmetry, and G3 is not declared on it.**
- **The region shift is visible above the measured floor** in A (0.373 vs 0.206 mm) and B (3.998 vs 3.579 mm), but not above the 2 × margin. In C it stays below the floor maximum.
- **The strength and foot-mass injections** stay inside the uninjected scatter in every class. Foot displacement does not respond to them in these trials.

The tolerances above are entered in `gates/v2_g3_checks_v32.js` unchanged. The 81-pair J2b evaluation is run and reported; its PASS / FAIL cannot by itself declare G3.
