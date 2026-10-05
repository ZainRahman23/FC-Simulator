# E1b harness and operational definitions (committed BEFORE any E1b run)

**Authority:**
- `../final_pre_e1a/E1_PREREGISTRATION.md` §4–§6: protocol and criteria, frozen.
- `../preswing/PRESWING_VALIDATION_PREREG.md` §5: E1b runs only after a genuine E1a pass.
- The pre-swing runway instruction ("If E1a passes, proceed directly to E1b under its existing preregistration").

**Tools:**
- `tools/e1b_run.mjs`: built from `tools/e1a_run.mjs`. Only the protocol values and the event-timed perturbation differ.
- `tools/e1b_eval.mjs`: E1a's criteria code with the E1b modifications below.

**Configuration:** the E1a-passing configuration version (`--config`), asserted as in E1a.

## 1. Protocol (frozen values from §4)

**Base sequence:** as E1a (settle, 2.5 cm pelvis drop, 4 s transfer, unload with TOUCHING ≥ 0.5 s, time-out 9 s), with:
- lift **20 mm**, min-jerk **0.6 s**;
- hover **1.5 s**;
- replace **0.6 s**;
- the same 0.3 s grace and load acceptance as E1a.

**Unperturbed runs:** 8 bodies with the left foot lifted, the mirrored V2-REF right-foot run, and a V2-REF repeat (E1b-11).

**Perturbation runs** (V2-REF, V2-165-62, V2-198-92; left foot lifted):
- One perturbation per run, at the **hover mid-point** (t_lift + 0.6 + 0.75 s).
- Applied through the scenario's own push / torque mechanism, so it is ledgered.

| code | perturbation |
|---|---|
| PF / PB / PL / PR | thorax 5 N·s over 100 ms, anterior / posterior / character-left / character-right |
| YAW | pelvis yaw impulse 0.5 N·m·s about +y over 100 ms (§4 gives no sign; +y is fixed here before any run) |
| P15 | thorax 15 N·s toward the lifted side (character-left for a left lift) |

## 2. Operational definitions where §5 is not explicit (fixed before any run)

1. **E1b-1 … 15 "as E1a"** use E1a's exact computations except where stated below.
2. **E1b-3 (E1a-3 with the §5 change):**
   - **Unperturbed runs:** hover position error max ≤ **5 mm**; RMS ≤ 2 mm, drift ≤ 2 mm, tilt ≤ 1.5°, yaw error ≤ 2°, and sole clearance ≥ 3 mm for ≥ 80 % of the hover, all as E1a.
   - **Perturbed runs (PF / PB / PL / PR / YAW):**
     - The position error from the perturbation onset to the hover end peaks at ≤ **15 mm** and is back within **5 mm** within **0.5 s** after the perturbation ends.
     - RMS, drift, tilt, yaw error and clearance are judged on the **unperturbed part of the hover** (hover start → perturbation onset), with E1a's thresholds. The §5 rule replaces only the position-error bound; E1a's other components keep their meaning on the part of the hover the perturbation has not reached.
3. **E1b-5 (E1a-5 with the §5 change):**
   - **Unperturbed runs:** E1a-5 in full (ξ margin ≥ 1 cm during hover; COM excursion ≤ 2 cm; no abort).
   - **5 N·s / YAW runs:** **no abort** (stated in §5). ξ margin and COM excursion are reported; a 5 N·s push is designed to move them.
4. **E1b-8 (E1a-8):** external impulse = 0 on unperturbed runs, and = the scheduled impulse on perturbed runs. Everything else as E1a.
5. **P15 (beyond capacity):** judged by **E1b-18** plus E1a-7, -8 (as 4 above), -9 (no over-capacity) and -10. E1a-1/2/3/5/6/12/13/14 do not apply: an abort is an allowed outcome, and E1b-18 defines success.
6. **E1b-16:** every 5 N·s and YAW run is recovered without abort and without foot relocation. The outcome must not be "fell", "step required" or "foot relocated" (G2's 20 mm line, either foot).
7. **E1b-17:** after the YAW impulse, the stance-ankle ab/adduction excursion from its value at the impulse onset is ≤ 10°, and it is back within 2° of that value within 3 s.
8. **E1b-18 (P15):** either recovered (no abort, no fall, no relocation), or:
   - the abort puts the lifted foot down (TOUCHDOWN ≤ 0.4 s after the abort trigger);
   - it returns to bilateral support (both SUPPORT by the end) without a fall.

   In both cases: stance slip ≤ 5 mm and no hard-limit excursion.
9. **E1b-11:** the unperturbed V2-REF run and its repeat are bit-identical at every 1 s mark and the end.
10. **E1b-15:** all unperturbed runs pass E1b-1 … 14, and the perturbed runs pass their applicable criteria (2–8).

## 3. Declared harness test (not E1b)

- **Run:** `tools/e1b_run.mjs --lift=0 --pert=PF --config=PSTAR`, V2-REF L. A 0 mm lift is not E1b; the run records `isE1b: false`, and `tools/e1b_eval.mjs` refuses it.
- **Lift and perturbation timing:** lift at 8.308 s; the perturbation is scheduled at 9.658 s (= lift + 0.6 + 0.75).
- **Ledger:** external impulse [0, 0, 5] N·s (anterior), as specified.
- **Phases:** lift, hover, replace, hold, accept, recover, pelvisBack and quiet all present.
- **No E1b run has been made.**
