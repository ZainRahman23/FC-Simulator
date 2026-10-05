# E1b (configuration version PSTAR): results

**Authority:** the pre-swing runway instruction ("If E1a passes, proceed directly to E1b under its existing preregistration. Do not begin general walking/G4 yet"). E1a passed (`E1A_PSTAR_RESULTS.md`, E1-3).

**Frozen inputs:**
- `../final_pre_e1a/E1_PREREGISTRATION.md` §4–§6;
- the operational definitions `E1B_HARNESS.md`;
- the tools `tools/e1b_run.mjs` and `tools/e1b_eval.mjs` (all committed 9ef02bf, before any E1b run);
- configuration `../knee_correction/E1_PREREGISTRATION_V2_CONFIG_PSTAR.md`.

**Run:**
- A clean scratch copy of **d499453** (`e1b/commit.txt`, tree clean). 28 runs: 8 bodies + the mirrored V2-REF run + the V2-REF repeat; V2-REF, V2-165-62, V2-198-92 × {PF, PB, PL, PR, YAW, P15}.
- Evidence: `e1b/runs/` (per-tick rows; playback poses kept for V2-REF none / YAW / P15) and `e1b/e1b_eval.log` / `.json`.

## 0. Bottom line

**E1b FAIL.** Two criteria fail; everything else passes.

| criterion | result |
|---|---|
| E1b-1 … 6, 8, 9, 10, 12, 13, 14 on all 8 unperturbed bodies + the mirrored run, with the 20 mm lift and 1.5 s hover | **PASS.** Hover error ≤ 0.9 mm (limit 5); one AIRBORNE / TOUCHDOWN; no abort |
| E1b-11 determinism | PASS: 23 / 23 hash marks |
| E1b-16: every 5 N·s push and the yaw impulse recovered without abort or relocation (15 runs) | **PASS** |
| E1b-18: the 15 N·s abort (3 runs) | **PASS**: TOUCHDOWN 79–100 ms after the trigger, back to bilateral, no fall; stance slip ≤ 4.78 mm; hard margin 8.96° |
| **E1b-7 on the 3 P15 runs** | **FAIL:** applied Δτ 22–38 N·m (limit 10); commanded Δτ0 114–218 N·m (limit 30), at the abort |
| **E1b-17 on V2-REF YAW** | **FAIL:** excursion 7.35° (≤ 10 ✓), but 2.27° at +3 s (> 2). V2-165-62 and V2-198-92 pass (1.15°, 0.06°) |

## 1. E1b-7: the abort clears the swing target in one tick (pre-existing supervisor behaviour, newly exercised)

**Trace** (V2-REF P15, `e1b/runs/e1b_V2-REF_L_P15.json.gz`):
- At the abort tick (9.742 s), the supervisor's lifecycle response ("put an airborne foot down first", `gates/v2_g3.js` `supervised()`, H9) **clears the swing target**.
- The lifted foot's target jumps from the 20 mm hover pose (111.0 mm) to its ground anchor (91.0 mm) **in one tick**.
- The swing hip's commanded τ0 steps 164 N·m (applied 30 N·m).
- This breaks the lifecycle's own continuity rule: "the commanding script must … hand back … so the target is continuous". E1a (5 mm, no abort) never exercised it.

**Diagnostic correction** (`lcAbortRamp`, default off; `e1b/diag_abortramp/`; not an E1b result):
- **What it does:** the abort moves the target min-jerk to the anchor over the lifecycle's own `release` time (0.1 s), then hands back at contact.
- **Torque steps:** commanded Δτ0 drops to 12.8–29.4 N·m (≤ 30). Applied Δτ drops to 9.67 / 6.80 N·m for V2-REF / V2-165-62, but is still **13.07 N·m for V2-198-92** (> 10) during the 0.1 s descent.
- **Abort behaviour:** TOUCHDOWN at +0.11–0.14 s; bilateral; recovered.
- **Remaining choice:** the descent duration (bounded by E1b-18's 0.4 s) would be chosen after seeing this result, so it is **left as your decision** (§3).

## 2. E1b-17: the stance-ankle yaw mode is under-damped (the pre-declared case)

Stance-ankle ab/adduction change after the 0.5 N·m·s impulse (`e1b/runs/*_YAW*`):

| body | +0.5 s | +1 s | +1.5 s | +2 s | +2.5 s | **+3 s** | +3.5 s |
|---|---|---|---|---|---|---|---|
| V2-REF | +7.35° | +4.01° | −3.16° | −6.58° | −2.40° | **+2.28°** | +0.26° |
| V2-165-62 | +8.21° | +1.08° | −5.84° | −3.91° | +2.36° | **+1.15°** | −2.23° |
| V2-198-92 | +6.48° | +5.55° | +0.13° | −5.45° | −5.44° | **+0.10°** | +2.54° |

- **What it shows:** a lightly damped oscillation of about ±6–8° with a period near 2 s in all three bodies. The passive ankle law (k 0.13 N·m/°, the tissue value) is the only yaw restoring path in single support.
- **Why only V2-REF fails:** the +3 s sample catches the swing above 2°; the other two pass by phase.
- **The E1 preregistration declared this in advance (§6):** "Failing E1b-17 points to the active ankle-yaw path decision, not to a tuning change."

## 3. Decisions this needs

1. **E1b-17: the active ankle-yaw path (pre-declared).**
   - Options:
     - an active ankle yaw / ab-adduction actuation path, an anatomy / actuation decision;
     - a controller yaw-damping strategy through the stance hip rotation;
     - an explicit acceptance decision on the criterion.
   - Tuning the passive ankle law is excluded by §6.
2. **E1b-7: the abort put-down.**
   - Adopt a continuous put-down (the diagnostic shows the mechanism; release-time ramp: τ0 ≤ 29.4, applied ≤ 13.1 N·m), with the descent duration decided by you.
   - Or treat a beyond-capacity abort's put-down as exempt from E1a-7. That would be a criterion change.

**E1b is not rerun until these are decided. G4 is not started.**

## 4. Errata (evaluator labelling; verdict unchanged)

**E1b-e1, label collision:** `tools/e1b_eval.mjs` renames E1a-n to E1b-n in its summary. So E1a-16 (knee envelope) and E1a-17 (knee reference path) collide with the real E1b-16 / E1b-17 keys, and the summary lines "E1b-16 (15 runs)" / "E1b-17 (3 runs)" show only the real E1b criteria. Per-run verification:
- the knee envelope (E1a-16 computation) passes 27 / 27 runs;
- the knee reference path (E1a-17) passes 27 / 27;
- the real E1b-17 fails only V2-REF YAW.

Nothing failing was hidden. A future E1b evaluation must use distinct keys.

**E1-3 (inherited):** E1a-10's soft-limit sub-check is vacuous in the E1b harness copy too (capture index). The independent corrected measurement from E1a applies to the same controller and configuration.
