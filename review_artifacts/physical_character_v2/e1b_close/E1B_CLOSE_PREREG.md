# E1b closing validation: preregistration (configuration PSTAR4; foot-yaw independent adoption)

**Authority:** user decision 2026-10-05 (`../sources/2026-10-05_user_decision_p15_split_close_e1b_e2_prep.md`).

**Status:** written and committed **before any official PSTAR4 / PSTARY run**. Disclosed beforehand:
- the audit (`research/TA_RULE_AUDIT.md`), on the official PSTAR3 runs;
- a PSTAR4 smoke at the non-protocol 10 mm lift (recovered in place, descent 0.26 s, ramp 0.225 s);
- a code-path test of the closing evaluator on copies of the PSTAR3 runs.

**Frozen inputs:**
- this document; `research/TA_RULE_AUDIT.md`;
- `scripts/run_validation_close.sh`, `scripts/regress_battery_pstar4.sh`, `scripts/regress_battery_pstary.sh`, `manifest_w.json`;
- the code and tools at the commit that adds this file.

**No criterion, rule or parameter changes after any result. Failed runs are kept.**

## 1. Configurations

| version | flags | role |
|---|---|---|
| **PSTARY** | PSTAR + `footYaw: true` | the foot-yaw actuator on its own, for independent adoption |
| **PSTAR4** | PSTAR + `footYaw` + `lcPutDown` + **`abortCapture: 2`** | candidate for E1b closure |

T-A rule **revision 2** differs from revision 1 (`../e1b_ta/E1B_TA_DESIGN.md`) **only** in the post-contact ramp plan: no timing margin after measured contact (`research/TA_RULE_AUDIT.md` §1).

Unchanged: the capture model, margin before contact (0.04 s), split rule, bounds (descent 0.20–0.302 s, ramp 0.10–0.225 s), grids, intent, floor rule, "step required" behaviour and BLF put-down.

## 2. P15 split into two physical classes (user-approved Decision 1)

**Classification rule.** For each P15 run:
- t_cls = max(abort, end of the disturbance) + one controller tick: the first tick at which the measured state read by the supervisor contains the whole push.
- **Class A, "in-place recoverable":** T-A's capture verdict in force at t_cls is "in place". That verdict is the last entry at or before t_cls in the controller's verdict log, computed from the measured state with the preregistered model.
- **Class B, STEP_REQUIRED:** otherwise.
- The class never depends on the run's outcome. Later verdict changes (model error) are reported, not used.

**Gating by class:**
- **Class A:** must recover **at the original foothold** while passing **E1b-7, E1b-8, E1b-9p15, E1b-10 and E1b-18** (TOUCHDOWN ≤ 0.4 s, back to bilateral, no fall, stance slip ≤ 5 mm, no hard-limit excursion), with the landed foot ≤ 10 mm from its anchor at the end.
- **Class B:** recorded as **STEP_REQUIRED** and an **E2 obligation**.
  - Neither an E1b pass (even if the in-place controller catches it) nor an E1b failure for leaving the original foothold: E1b-18 and the foothold test are not applied.
  - The **integrity** criteria still gate, because they are not about the foothold: E1b-7 (torque continuity), E1b-8 (energy), E1b-9p15 (capacity), E1b-10 (anatomical limits).

**Four-way report** (every P15 run):
1. recovered without changing foothold (class A, all gates pass);
2. step required (class B);
3. recovered by stepping (future E2; 0);
4. fell.

Any class-A run that neither recovers in place nor falls is listed separately as a class-A failure.

## 3. Criterion correction for the RATE set only (`research/TA_RULE_AUDIT.md` §2)

- At 180 / 480 Hz the **applied**-torque per-tick limits are 10 / 25 N·m × max(1, 240/hz), and the **commanded** limit is 30 N·m × 240/hz.
- Basis: the same impact response is 6.17 / 6.43 / 6.61 N·m per tick at 180 / 240 / 480 Hz, while smooth ramps scale with dt.
- The official 240 Hz E1b-7 values are unchanged.

## 4. Sets and pass rules

| set | runs | pass rule |
|---|---|---|
| **E** official E1b | 28 (frozen protocol and list, PSTAR4) | non-P15 runs: every frozen E1b criterion (`tools/e1b_eval.mjs --config=PSTAR4`) plus E1b-11 determinism. P15 runs: by class (§2) |
| **A** E1a | 10 (PSTAR4) | E1a RESULT: PASS |
| **X** extended | 133 (as before, PSTAR4) | non-P15 gating sets as preregistered (`tools/e1bfix_eval.mjs --config=PSTAR4 --rateRule=maxJumpSmooth`); X-DET hash identity; X-SENS reported. P15 runs (X-P15, X-RATE P15): by class (§2) |
| **P15 closing** | every P15 run of E and X | `tools/e1bclose_eval.mjs` → **E1b CLOSING EVALUATION: PASS** (E non-P15, X non-P15, P15 by class) |
| **TA** | all E + X runs | `tools/e1bta_checks.mjs`: TA-1 (no support / load before sustained measured contact), TA-2 (bounds; re-plans never lengthen), TA-4 (T-A record on every P15 run) |
| **W** | 3 (PSTAR4) | browser = Node 3 / 3; W_P15 exercises T-A |
| **G4** | `scripts/regress_battery_pstar4.sh` | V3.1 … V3.10 PASS |
| **Y** foot-yaw identity | 5 runs: PSTARY V2-REF L none / YAW / PF, V2-165-62 R YAWN, E1a V2-REF L | every hash mark identical to the PSTAR4 counterpart. Without an abort, `lcPutDown` / `abortCapture` are inert, so the yaw path's validation carries over |
| **GY** | `scripts/regress_battery_pstary.sh` | V3.1 … V3.10 PASS |

## 5. Decision rules

1. **Foot-yaw (independent).** If Y and GY pass, PSTARY is adopted. This holds whatever the E1b outcome. The yaw path's own validation (E1b-17 and the yaw sets) is re-checked in this run's E and X.
2. **E1b closure.** If E (non-P15), A, X (non-P15), the P15 closing evaluation, TA, W and G4 all pass:
   - PSTAR4 is adopted and **E1b is closed**;
   - the STEP_REQUIRED runs are recorded as explicit **E2 obligations** (body, side, rate, physical state);
   - work proceeds to **E2 research / design / preregistration only**, and stops for review before any E2 implementation or run.
3. **Any substantive failure:** stop and report, with no tuning to the observed values. A purely mechanical tooling defect may be corrected and re-evaluated on the same runs as a recorded erratum.
