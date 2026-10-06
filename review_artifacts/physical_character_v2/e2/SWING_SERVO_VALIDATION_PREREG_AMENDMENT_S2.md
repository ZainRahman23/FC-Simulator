# Swing-servo validation, amendment S2: the re-run on the final candidate (corrected rate + continuous re-anchor). Preregistration, written before any battery run under these configurations

**Supersedes** `SWING_SERVO_VALIDATION_PREREG_AMENDMENT_S.md`, written earlier tonight. S was never run.

**Base preregistration:** `SWING_SERVO_VALIDATION_PREREG.md` (c9b9485). The first result (`SWING_SERVO_VALIDATION_RESULTS.md`, SERVO DOES NOT VALIDATE) stands.

**Authority:** user decision D1; the overnight instruction, Decisions 1 and 2.

## 1. What changes: the configurations only

| | base | this amendment |
|---|---|---|
| VAL-OFF | PSTAR5B | **PSTAR5BH** = PSTAR5B + `vffRate: "sr"` (`VFF_RATE_CORRECTION.md`) + `e2reanchorVel` (`E2_HANDOFF.md`) |
| VAL-ON | PSTAR5C | **PSTAR5CH** = PSTAR5BH + `swingAccFF` |

- The pair still differs only in `swingAccFF`.
- The tool is `tools/swing_servo_val.mjs --vff=sr --handoff=1`. At its own B1 liftoff start (L1, L2) it supplies the re-anchor pose exactly as the sequencer does.

## 2. What does not change

- the battery: trajectories, sequences, 8 bodies × 2 legs × 3 rates × OFF / ON = 192 runs;
- the measurements (§2);
- criteria V-1 … V-6 and the decision rule (§3);
- the allowance rule (§4): representative VAL-ON segments only, never an E2 run;
- the evaluator `tools/swing_servo_eval.mjs`.

**Known caveat of the base, kept unchanged:** the representative L1 / L2 rise to hover height, about 1.8× the E2 vertical excursion. Reported, not re-selected.

## 3. Seen before this preregistration (none of it used to choose anything above)

- the lag diagnostics under the corrected rate;
- non-test E2 smoke steps under PSTAR5B / 5BS / 5CS / 5BH / 5CH (`evidence_vffrate/smoke/`, `evidence_handoff/`), never usable for the allowance (§4 of the base);
- no battery run under any of these configurations.

## 4. Order

1. This amendment, committed.
2. 192 runs from a clean copy of the committed tree (`scripts/run_servo_val_H.sh`).
3. V-1 … V-6.
4. If it validates: the allowance into the certificate (`FS.clearAllow`, PSTAR5CH), planning gate PG-1 … 3.
5. If PG certifies: declared non-test smoke, freeze, staged official runs.

Stop at any failure that needs a change of architecture, gains, bandwidth, apex, duration or thresholds.
