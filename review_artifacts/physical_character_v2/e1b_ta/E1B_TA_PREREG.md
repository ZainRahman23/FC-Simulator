# T-A validation: preregistration (configuration version PSTAR3)

**Authority:** user decision 2026-10-05 (`../sources/2026-10-05_user_decision_ta_capture_timed_putdown.md`).

**Status:** written and committed **before any official PSTAR3 run**. Disclosed beforehand: the 10 mm-lift smoke run (`E1B_TA_DESIGN.md` §6). It is in no set; no parameter changed after it.

**Frozen inputs:**
- `E1B_TA_DESIGN.md`;
- this document;
- `scripts/run_validation_ta.sh`, `scripts/regress_battery_pstar3.sh`, `manifest_w.json`;
- the code and tools at the commit that adds this file: `ctrl/v2_capture.js`, `gates/v2_g3.js`, `ctrl/v2_support.js`, `ctrl/v2_stand.js`, `tools/e1b_run.mjs`, `e1a_run.mjs`, `e1b_eval.mjs`, `e1a_eval.mjs`, `e1bfix_eval.mjs`, `e1bta_checks.mjs`, `preswing_char.mjs`, `unload_browser.mjs`, and the frozen regression evaluators.

**No criterion, parameter or rule changes after any result. Failed runs are kept. P15 is not weakened.**

## 1. The capture-time calculation (item 1)

- `ctrl/v2_capture.js` `captureContext` + `simulate`.
- Inputs: the controller's previous-tick (measured) state: ξ, ω, heading, usable regions.
- 1-D LIPM along the controller's lateral axis toward the landed foot, with the controller's own acceptance, allocation and balance-law constraints, exactly as `E1B_TA_DESIGN.md` §2.
- "Recovers" = ξ never passes the landed foot's outer edge by more than 5 cm within 2.5 s.
- The "available capture time" is expressed as feasibility of a (descent, ramp) pair.
- Port check 32 / 32 and geometry check 32 / 32 (`tools/port_check.mjs`).

## 2. Safety margin (item 2)

- **0.04 s.** Every predicted touchdown and LOAD_ACCEPT used for a decision is delayed by 0.04 s in the model.
- Basis: the largest LOAD_ACCEPT timing discrepancy of the validated model (`../p15_capture/P15_CAPTURE_ANALYSIS.md` §2).

## 3. Split rule (item 3)

- **Equal fraction at the abort:** T_put = clamp(k·0.302, 0.20, 0.302) and T_r = clamp(k·0.225, 0.10, 0.225), with the **largest** feasible k on a 0.01 grid from 1.00 down to max(0.20/0.302, 0.10/0.225).
- **Before contact:** each tick re-checks the plan. If it is infeasible, take the next smaller feasible k with a **strictly shorter** remaining descent, re-planned from the current reference state (never longer).
- **After measured contact:** the ramp is the **longest** feasible T_r on a 0.005 s grid in [0.225, 0.10], frozen at the LOAD_ACCEPT entry.

## 4. Duration bounds (item 4)

| duration | minimum | maximum |
|---|---|---|
| descent | **0.20 s** (Khadiv 2020) | **0.302 s** (servo bandwidth) |
| post-contact load-acceptance ramp | **0.10 s** (lifecycle `accept`) | **0.225 s** (PyPnC Atlas contact transition) |

## 5. Insufficient capture time (item 5)

- If no feasible pair exists at the abort, or later, the verdict is **"step required"** (a future capture-aware E2 recovery).
- The controller still executes the best available in-place action (descent 0.20 s, ramp 0.10 s). It does **not** present it as an in-place recovery.
- **The run is classified "step required" whatever its physical outcome.** E1b-18 is still judged exactly as frozen: a "step required" run that falls fails E1b-18; one that is caught anyway is reported as such.

## 6. Criteria and regression requirements (item 6)

### Sets

| set | runs | pass rule |
|---|---|---|
| **E** official E1b | 28 (frozen protocol and run list, `--config=PSTAR3`) | `tools/e1b_eval.mjs --config=PSTAR3` → **E1b RESULT: PASS**: every E1b-1 … 18 as frozen, including **E1b-7 10 / 30 N·m (25 N·m in the 2 contact-onset ticks)**, **E1b-17 ≤ 10° / ≤ 2° at +3 s**, **E1b-18** (TOUCHDOWN ≤ 0.4 s after the trigger, bilateral, no fall, stance slip ≤ 5 mm, no hard-limit excursion), and determinism E1b-11 |
| **A** E1a | 10 (frozen) | `tools/e1a_eval.mjs --config=PSTAR3` → **E1a RESULT: PASS** |
| **X** extended | 133: X-U 7, X-P5 52, X-Y 29 (YAW / YAWN, 8 bodies × L / R), X-P15 13, X-RATE 18 (YAW / YAWN / P15 at 180 / 480 Hz), X-SENS 12 (reported), X-DET 2 | `tools/e1bfix_eval.mjs --config=PSTAR3` → **gating sets PASS**. Rules unchanged from `../e1b_fix/E1B_FIX_VALIDATION_PREREG.md` §3, including the YAWN table entry (erratum E1bF-e1 fix) |
| **TA** mechanism checks | all E + X runs | `tools/e1bta_checks.mjs` → **TA-1** no support / load before sustained measured contact (s = 0 and share = 0 before LOAD_ACCEPT; contact on every debounce-window tick); **TA-2** durations within §4 and re-plans never lengthen; **TA-4** every P15 run carries a T-A record. All gating |
| **P15 reporting** | every P15 run (E, X-P15, X-RATE P15, X-DET P15) | four classes: **recovered without changing foothold** (verdict in place, E1b-18 pass, landed foot ≤ 10 mm from its anchor) / **step required** / **recovered by stepping** (future E2; 0 by construction) / **fell**. Reported; the gate is E1b-18 itself |
| **W** browser = Node | 3 (`manifest_w.json`, PSTAR3 flags) | hash identical at every 1 s mark and the end, 3 / 3. **W_P15 must exercise the T-A put-down** (the Node record has a put-down with a T-A record and a contact time), otherwise W is incomplete and fails |
| **G** G0–G3 regression | `scripts/regress_battery_pstar3.sh` | `tools/touchrest_regress_eval.mjs` → **V3.1 … V3.10 PASS** (the rules that accepted PSTAR and PSTAR2). Any failing item is a material change to accepted G0–G3 behaviour |

### Reported (not gating)

- per abort: verdict at the abort and final, k, T_put, T_r, re-plans, contact and acceptance times;
- the post-abort torque steps by phase;
- the yaw-actuator statistics;
- G2 / G3 outcome changes against PSTAR2.

## 7. Decision rules

1. **E, A, X (gating), TA, W and G all pass → PSTAR3 is adopted and E1b is closed.** The validated E1b mechanisms: B1, touchRest, `lcVff` lin, reseed, footYaw, lcPutDown, abortCapture. Configuration addendum and DECISIONS entry. Work then continues to **E2 research / design / preregistration only**, and **stops for review before any E2 implementation or run**.
2. **Any gating failure for a substantive reason → stop and report. No tuning to the observed failures.**
3. A purely mechanical tooling defect (as E1bF-e1 … e3) may be corrected and re-evaluated **on the same runs**, recorded as an erratum, with the frozen output kept.
