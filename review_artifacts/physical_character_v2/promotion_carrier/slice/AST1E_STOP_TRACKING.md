# AST-1E: STOPPED before the carrier slice (preregistered stop). Item 2 fails on the inherited stand-in drive's target timing. No carrier run was made.

**Date:** 10 Oct 2026.

**Protocol:** `AST1E_PREREG.md` (frozen 7b77dc5; A1 bc12611, made before any AST-1E output).

**Sources:**
- `../../sources/2026-10-10_user_decision_option_c_moving_stand_in.md` (3ec464e);
- `PCS1_PREREG.md` (8585adc, unchanged);
- `PCS1_STOP_KP_RECHECK.md` (fbdb6f5).

> **Correction recorded prominently (unchanged from today's stop).** The PCS-1 frames k39 (rx_free_leg) and k38 (rx_planted_leg) were wrongly described in the investigation report as passing the full REV2 gate.
> - HG-T had been omitted from the extracted `valid` flag of `valid_on_rx.json` (`lc_valid.mjs` / `hg_valid_frames.mjs` record HG-T separately).
> - The original evidence is untouched. The erratum is appended to `PROMOTION_CARRIER_INVESTIGATION.md`.

## 1. Result

| item (`AST1E_PREREG.md` §4) | rx_miss | rx_free_leg | rx_planted_leg | verdict |
|---|---|---|---|---|
| 3 – 4: full gate (HG-T for the stand-in in use), D-5 frames | 47 (lead 12.5) | 39 (10.25) | 38 (9.75) | **pass**: equal to the PCS-1 frames |
| **2: slide-leg geometry vs the record, (τ_p, τ_ref], ≤ 10 mm** | **12.99 mm** | **13.23 mm** | **12.24 mm** | **FAIL** |
| 5: records SHA-256; gameplay hashes across OFFNP / OFF / FULL / LOCO and V1.3 | unchanged; identical | unchanged; identical | unchanged; identical | **pass** |
| 6: near miss / intended contacts (CG-1 region, CG-3 ± 1 tick) vs the simulation's own runner segments | no penetration over [48, 72.5] | first contact foot_L at 50.00 (−0.25 tick); decisive toe_R → foot_R (same V2 body) at 59.75 (0) | shin_L at 48.75 (0) | **pass** |
| R-1: drive exactly 0 after release | (no release) | release 50.0 (authoritative), 63 steps all zero | release 48.0 (authoritative), 27 steps all zero | **pass** |
| R-2: release writes no state | — | bit-identical state across release | bit-identical | **pass** |
| R-4: same rule and constants | L_ext 0.6401 m; LEG 18.45 kg, I_yy 1.866 kg·m² | the same | the same | **pass** |

**Reading:**
- **What works.** With AST-1E the gate gives valid ≥ 6-tick frames for all three cases. The near miss stays a near miss. The contact cases reproduce the intended body region and timing. The release relinquishes authority without any state write.
- **What fails.** Item 2: the stand-in's slide leg leads the record by 12 – 13 mm at the end of the lead window, against 10 mm (AST-C1's tolerance).

Per the preregistration and your hard-stop rule, the carrier slice was not run.

## 2. Cause: the stand-in drive inherited unchanged from REV2's AST-1, not the extension

**What the tether does:**
- AST-1's capped tether (REV2 §5; unchanged in AST-1E, per "do not invent new … control") sets the spring's position target to the **end-of-step** pose p1 (τ + ¼ tick).
- Jolt evaluates a spring motor's position error at the **start** of the step.
- So on a body exactly on the authoritative path, the spring sees an error of one step's travel and pulls it forward by about k·(p1 − p0) = m(2π·2)²·v·dt.
- Measured: 164 N on the torso and 22 N on the leg at the very first step, when the body was 0.03 mm from its target (`scripts/diag_standin_drift.mjs` → `evidence/ast1e/diag_standin_drift.txt`, AST-1 on rx_miss k47).
- The feed-forward m·a_auth is exact. The spring's forward pull makes the stand-in run ahead until it settles near one step of travel: ≈ 18 – 20 mm at the slide's 4.5 – 4.9 m/s.

**Evidence:**

| | rx_miss | rx_free_leg | rx_planted_leg |
|---|---|---|---|
| AST-1 itself (REV2 plant, K4b rx_miss run, rigid stand-in): max tracking error | 14.45 mm | — | — |
| AST-1E as preregistered (`evidence/ast1e/diag_tether_timing.txt`) | 13.0 mm | 13.5 mm | 12.6 mm |
| **Diagnostic only, not adopted:** same stand-in, spring target at the start-of-step pose p0 (velocity target unchanged) | **0.19 mm** | **0.09 mm** | **0.09 mm** |

The error is a pure lead along the slide direction (−z, render frame), the same for both segments. It grows over about 30 ticks and then settles. It is the same mechanism behind LC-1's rx_miss AST-C1 failure (10.39 mm). REV2 never saw it, because REV2 promoted 0.25 – 0.5 ticks before contact.

**What the extension itself achieves:**
- The LEG geometry follows the record exactly. In the thigh frame the recorded leg is collinear with a fixed knee; the pieces reproduce [knee, knee + L(τ)].
- The leg's mass properties are the fully extended leg's: L_ext = 0.6401 m, derived from the k_p record and equal to the record's full extension in all three cases.
- The 12 – 13 mm comes entirely from the shared body-tracking drive.

## 3. Also found and fixed during the work (disclosed)

| item | what | effect |
|---|---|---|
| A1 (before any AST-1E output) | `OffsetCenterOfMassShape::GetCenterOfMass` aborts this Jolt wasm build. The geometry update was re-implemented as a `MutableCompoundShape` (8 collinear pieces) with the same preregistered properties. | committed bc12611 before any output |
| harness logging | REV2's per-step stand-in record drops the `released` / `drive` fields, so the first verification pass read R-1 as false. The harness now reads them from the stand-in. Measurement only; R-1 now passes. | rerun; both passes kept in git history |

## 4. Your decision (nothing taken)

The smallest correction is in the stand-in drive, not in the runner, carrier, criteria or geometry: set the tether spring's position / orientation target to the start-of-step authoritative pose p0, with the velocity target unchanged.
- It makes the tether consistent with Jolt's spring evaluation, so an on-path body feels zero tether force.
- It changes no cap, gain, mass, geometry, trajectory or outcome.
- It is shown above only as a diagnostic.
- It is an amendment to the stand-in drive, which your instruction forbids me to introduce on my own after a stop.

**If you approve it:**
1. re-run items 2 – 6 unchanged;
2. if they pass, run the preregistered three-case carrier slice exactly as approved.

**Alternative.** Leave the drive as is and run the slice anyway. AST-C1 (≤ 10 mm) would then fail in all three cases on the stand-in, and the slice answer would be "no" for a reason unrelated to the runner carrier. Not recommended.

## Files

- **Scripts:**
  - `scripts/stand_in_e.mjs` (AST-1E);
  - `scripts/pcs1_run.mjs` (`TACKLER=ast1e` switch: HG-T for the stand-in in use, stand-in substitution, stand-in logging);
  - `scripts/pcs1_hg_frames.mjs`, `scripts/ast1e_verify.mjs`;
  - `scripts/diag_tether_timing.mjs` (diagnostic), `scripts/jolt_probe*.mjs`.
- **Evidence:** `evidence/ast1e/`:
  - `verify_*_free_rev2.json.gz`;
  - `AST1E_VERIFY.json`;
  - `hg_frames_lc1_ast1e.json`;
  - `diag_tether_timing.txt`.
- **Frozen, unchanged:** the runner / carrier files `law_provider.mjs` and `pi1_carrier_sim.mjs` (SHA-256 as at fbdb6f5); PCS-1 and its criteria; LC-1, V1.3, V2, REV2. No carrier physics ran. Nothing was pushed.
