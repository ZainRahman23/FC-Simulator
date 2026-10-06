# Swing-servo validation: re-run under the corrected velocity-feed-forward rate (amendment S). Preregistration, written before any run of this battery under PSTAR5BS / PSTAR5CS

> **SUPERSEDED before any run by `SWING_SERVO_VALIDATION_PREREG_AMENDMENT_S2.md`.** The handoff correction (`E2_HANDOFF.md`, option `e2reanchorVel`) was found and measured on non-test smoke steps after this amendment was written. The battery is run once, on the final candidate configurations (PSTAR5BH / PSTAR5CH). No battery run under PSTAR5BS / PSTAR5CS exists.

**Authority:**
- user decision D1 (`../sources/2026-10-06_user_decision_e2_D1.md`): validate the servo independently, and set the clearance allowance from that validation;
- the overnight instruction (`../sources/2026-10-06_user_instruction_overnight_e2_autonomous.md`): Decision 1 then re-run the servo diagnostics; keep D1 independently switchable.

**Base preregistration:** `SWING_SERVO_VALIDATION_PREREG.md` (commit c9b9485). First result: `SWING_SERVO_VALIDATION_RESULTS.md`, SERVO DOES NOT VALIDATE. That result stands and is preserved (`evidence_servo/`).

## 1. What changes: the configurations only

| | base | this amendment |
|---|---|---|
| VAL-OFF | PSTAR5B | **PSTAR5BS** = PSTAR5B + `vffRate: "sr"` |
| VAL-ON | PSTAR5C | **PSTAR5CS** = PSTAR5C + `vffRate: "sr"` |

The correction is in `VFF_RATE_CORRECTION.md`, commit 6c30e64. The two runs of a pair still differ in exactly one option, `swingAccFF`.

## 2. What does not change

- **Battery:** §1 of the base. Trajectories L1 R1 L2 R2 (representative) and H1 – H5 (harder), sequences A / B, 8 bodies × 2 legs × 180 / 240 / 480 Hz × OFF / ON = 192 runs. Same tool `tools/swing_servo_val.mjs`, invoked with `--vff=sr`.
- **Measurements:** §2.
- **Criteria V-1 … V-6 and the decision rule:** §3.
- **Allowance rule:** §4. Worst downward lowest-boot-point deviation per phase over the representative VAL-ON segments, no further margin, not taken from any E2 run.
- **Evaluator:** `tools/swing_servo_eval.mjs`, unchanged.

**Known caveat of the base, kept unchanged and not re-selected:** the representative L1 / L2 end at hover height, so their vertical excursion is about 1.8× the E2 swing's. It is reported with the result; the representative set is not replaced after any result is known.

## 3. What has been seen before this preregistration

None of it was used to choose anything above:
- the stage-by-stage lag diagnostics under the corrected estimator (`evidence_vffrate/lag/`);
- three non-test E2 smoke steps under PSTAR5BS / PSTAR5CS (`evidence_vffrate/smoke/`). §4 forbids using them for the allowance, and they are not used.
- No battery run under PSTAR5BS / PSTAR5CS exists.

## 4. Order

1. This amendment, committed.
2. The 192 runs, from a clean copy of the committed tree (`scripts/run_servo_val_S.sh`).
3. Evaluate V-1 … V-6.
4. If the servo validates: compute the allowance, set it in the certificate (`FS.clearAllow`, PSTAR5CS only), run the planning gate PG-1 … 3.
5. If PG certifies: the declared non-test smoke, freeze, then the staged official runs.

Stop at any failure that needs a change of architecture, gains, bandwidth, apex, duration or thresholds.
