# E1b closing validation (PSTAR4) and foot-yaw independent adoption (PSTARY): results

**Frozen inputs:** `E1B_CLOSE_PREREG.md` at **ca4aad6**.

**Runs:**
- a clean `git archive` copy, 22:06–22:16 (E, A, X, Y, W, closing evaluation);
- regression batteries G4 (PSTAR4) and GY (PSTARY) after it.

## 0. Bottom line

**E1b CLOSED with configuration PSTAR4. Foot-yaw actuator adopted independently as PSTARY. All preregistered gates pass.** STEP_REQUIRED (4 runs, V2-165-62) is recorded as E2 obligations.

| part | result |
|---|---|
| **E1b closing evaluation** (`tools/e1bclose_eval.mjs`) | **PASS:** set E non-P15 PASS, set X non-P15 PASS, P15 by class PASS |
| P15 class A, in-place recoverable (19 runs) | **19 / 19 recovered without changing foothold**, every gate passing: E1b-7 (applied Δτ 4.36–9.86 N·m, Δτ0 ≤ 9.93), E1b-8, E1b-9p15, E1b-10, E1b-18 (TOUCHDOWN +0.217–0.317 s, stance slip 0.31–3.38 mm), landed foot ≤ 1.3 mm from its anchor |
| P15 class B, STEP_REQUIRED (4 runs) | **V2-165-62:** L 240 Hz, L 180 Hz, L 480 Hz, R 240 Hz. Verdict "step required" from the first tick after the push. Integrity gates pass (E1b-7 at the RATE rule, E1b-8, E1b-9p15, E1b-10). Recorded as E2 obligations (§3) |
| four-way | recovered without changing foothold **19** · step required **4** · recovered by stepping **0** · fell **0** · class-A failures **0** |
| frozen evaluators as shipped | `e1b_eval` "FAIL" and `e1bfix_eval` "FAIL" consist **only** of E1b-18 on the 4 class-B runs (V2-165-62 stance foot lifts / slides 6.78–7.88 mm). The preregistered class rule exempts these; nothing else fails |
| E1b-17 (yaw) and the yaw sets | PASS (E 3 / 3, X-Y 29 / 29, X-RATE yaw; X-SENS no failures) |
| **A** E1a | **PASS** |
| **TA** checks | **PASS:** no support or load before sustained measured contact; bounds; engagement |
| **W** browser = Node | **3 / 3**; W_P15 exercises T-A (in place, descent 0.26 s, ramp 0.215 s) |
| **Y** PSTARY identity | **PASS:** 5 / 5 runs without an abort are hash-identical to PSTAR4 |
| **G4** (PSTAR4) / **GY** (PSTARY) regressions | **PASS / PASS** (V3.1–V3.10 each; browser 10 / 6 / 4 each) |

## 1. What resolved the two E1b-7 items (`research/TA_RULE_AUDIT.md`)

**V2-long-legs (10.23 → passing):**
- Revision 1 re-applied the 0.04 s timing margin after measured contact, although acceptance there is fixed by the debounce (0.050 s in 23 / 23 runs). It declared every ramp infeasible and forced 0.10 s.
- Revision 2 gives the model-feasible ramp: 0.215 s for V2-long-legs and V2-REF, 0.165 s for V2-175-70, 0.185 s for V2-REF at 180 Hz.

**V2-REF 480 Hz (6.61 > 5 → passing):**
- The step was the stance foot's rate-independent re-loading impact (6.17 / 6.43 / 6.61 N·m at 180 / 240 / 480 Hz; command smooth).
- The RATE rule now keeps the applied-torque limit at least at its 240 Hz value.

**Neither correction used the observed torque values.** Both follow from the definitions: the margin's timing basis, and the rate dependence of impulses versus ramps.

## 2. Classification

- t_cls = max(abort, push end) + one tick. All classes were determined by T-A's verdict at t_cls.
- **Later verdict changes did not reclassify any run.** V2-175-70's descent re-plans flagged "step required" later (model error), but it is class A by the rule, and it **passed every class-A gate in place**.

## 3. E2 obligations (STEP_REQUIRED)

| body | side | rate | physical state at t_cls | in-place outcome (not credited) |
|---|---|---|---|---|
| V2-165-62 | L | 240 Hz | ξ 4.4 cm outside the stance foot; latest in-place touchdown with the fastest ramp ≈ 0.21 s (< 0.20 s descent + 0.04 s margin) | caught; old stance foot lifted and re-landed 6.86 mm away |
| V2-165-62 | R | 240 Hz | same, mirrored | caught; lift-off, 6.78 mm |
| V2-165-62 | L | 180 Hz | same | caught; lift-off, 7.12 mm |
| V2-165-62 | L | 480 Hz | same | caught; slid 7.88 mm at ≈ 0 load |

**E2 must recover these with a capture-aware step:** stance-foot slip ≤ 5 mm and no unplanned support change, i.e. the old stance foot must not leave the ground except as a planned step.

## 4. Regressions

Both pass as frozen, with no erratum.

**G4 (PSTAR4)**, 22:16–22:46, `evidence_regression_pstar4/`:
- KV0 identical, suite 58 / 58, V1 guard OK;
- bench identical; G0 51 / 52 (0.V1 guard); G1 74 / 74 hash-identical;
- G2 11 / 11; G3 v3.3 no failing rows; J2a 81 / 81;
- twist battery; KV6c 8 / 8; boundary harness 180 / 240 / 480 Hz; yaw decomposition;
- browser G1 10 / 10, G2 6 / 6, G3 4 / 4.

**GY (PSTARY)**, 22:46–23:16, `evidence_regression_pstary/`: the same items, all pass.

**Y identity:** V2-REF L none / YAW / PF, V2-165-62 R YAWN and E1a V2-REF L under PSTARY are hash-identical to their PSTAR4 counterparts (23 / 23, 23 / 23, 23 / 23, 23 / 23, 21 / 21 marks). The yaw path's validation in this run (E1b-17 3 / 3, X-Y 29 / 29, X-RATE yaw) therefore applies to PSTARY.

## 5. Decision

1. **Foot-yaw actuator adopted independently: configuration PSTARY** = PSTAR + `footYaw` (`CONFIG_PSTARY.md`). Y and GY pass, and its E1b-17 / yaw-set validation carries over by hash identity.
2. **E1b CLOSED: configuration PSTAR4** = PSTAR + `footYaw` + `lcPutDown` + `abortCapture: 2` (`CONFIG_PSTAR4.md`). The closing evaluation, E1a, TA, W and G4 all pass.
3. **E2 obligations:** the 4 STEP_REQUIRED runs (§3) → `../e2/E2_OBLIGATIONS.md`. Under E2 they must become "recovered by stepping".
4. **Next:** E2 research / design / preregistration only (`../e2/E2_DESIGN.md`, `../e2/E2_PREREGISTRATION.md`), frozen for review. No E2 implementation or run.
