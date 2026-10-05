# E1a / E1b configuration addendum: version PSTAR (completes `E1_PREREGISTRATION_V2_CONFIG.md` with the adopted pre-swing fixes)

**Status:** written after `../preswing/PRESWING_VALIDATION_PREREG.md` (frozen abdd3da) passed in full (V1–V15), and before the E1a rerun. The E1a / E1b protocol, criteria, thresholds and timing are **unchanged** (`../final_pre_e1a/E1_PREREGISTRATION.md`, `E1_PREREGISTRATION_V2.md`, `../e1a/E1A_HARNESS.md`, `../e1a/E1B_HARNESS.md`).

## 1. Configuration under test

Everything in `E1_PREREGISTRATION_V2_CONFIG.md` (v2k central knee, ankle k 0.13, the G3 stand controller with `ikRefTwist` and `lifecycle`, 240 Hz, planned pelvis drop −2.5 cm), **plus** the stand options:

| option | what it is | evidence |
|---|---|---|
| `ffLockedAxis: true` (B1) | locked-axis-consistent knee / elbow flexion feed-forward (a verified controller bug fix) | `../unload_fix/` (bench, causal separation); its own G0–G3 regression (`../preswing/evidence_b1_regression/`). **B1 alone fails G3 I2:** it makes the pre-existing touching-hold defect reachable, so it is adopted only together with the hold below |
| `touchRest: true` | a resting non-supporting foot keeps its vertical target at the surface, with a seat of loadOff / 2 through its own leg's feed-forward | `../touch_semantics/`, `../preswing/` |
| `lcVff: "lin"` | contact-consistent desired-velocity feed-forward for a non-supporting leg (linearised bounded-IK rate, damped with the solver's μ0) | `../preswing/PRESWING_INVESTIGATION.md`, validation V1–V15 |
| `lcTouch: { reseed: true }` | a resting foot's horizontal place and yaw are left to friction / contact (the anchor re-seeds to the foot) | same |

## 2. How to select it

- The E1a / E1b harnesses: `--config=PSTAR` (`tools/e1a_run.mjs`, `tools/e1b_run.mjs`).
- The evaluators: `--config=PSTAR`.
- The harnesses assert the flags.
- The default (`V2`) reproduces the official E1a run hash-identically (21 / 21 marks).

## 3. Envelope statement

Unchanged: E1a-16 keeps every run inside the certified knee envelope (0–40°).
