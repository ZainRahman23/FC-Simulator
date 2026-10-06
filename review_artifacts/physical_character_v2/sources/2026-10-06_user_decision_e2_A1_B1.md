# User decision, 2026-10-06: E2 corrections A1 and B1 (verbatim)

Approve A1 and B1. Keep all numerical acceptance thresholds unchanged.
A1: redefine swing-phase clearance measurements relative to measured physical liftoff, not the original lift/swing command. Preserve the existing 5 mm clearance requirement. Version and preregister this correction before the next official E2 run, documenting that the previous definition conflicted with the already-measured 154–171 ms physical liftoff delay.
B1: change the swing sequencing so that the controller first performs the vertical liftoff phase. Begin the commanded forward/lateral swing trajectory from the measured liftoff state once physical liftoff is confirmed.
Preserve trajectory continuity: initialize the post-liftoff swing from the actual measured foot position and velocity; do not teleport, reset physical state, or introduce a velocity/acceleration discontinuity.
Do not choose A2, A3, B2 or B3. Do not raise the apex, delay the measurement window arbitrarily, loosen tracking/touchdown thresholds, or accept the failures.
Recompute the remaining swing trajectory after measured liftoff so that its timing, apex and touchdown conditions remain internally consistent. If the original total step duration can no longer be achieved without violating the frozen physical limits, report that rather than compressing the swing merely to preserve the old schedule.
Before an official run, re-run the planning gate under the corrected measured-liftoff semantics. A commanded step must still be CERTIFIED_ONE_STEP before execution.
Then resume the staged E2 validation from the beginning:
1. V2-REF, forward step, preferred side, nominal rate, no perturbation.
2. Mirror.
3. All eight bodies forward.
4. Lateral steps.
5. Rates and perturbations.
Do not address recovery issue C yet. Preserve the recovery smoke-run evidence unchanged. Once commanded stepping passes its frozen criteria, return to the recovery cases separately.
The recovery smoke run has exposed important model deficiencies — old-stance-foot liftoff, CoP leaving the support region, impact/loading behavior, and faster-than-predicted DCM divergence — but do not alter the commanded-step architecture in response to those yet.
Continue to preserve:
- Jolt-authoritative liftoff/contact/support;
- the DCM reference layer;
- certified foothold selection;
- finite-torque actuation;
- BLF-derived swing;
- unchanged numerical physical thresholds;
- all existing regressions/default-path neutrality.
If A1+B1 make the commanded step pass legitimately, continue through the commanded-step stages. Stop if a new failure requires changing architecture, physical parameters, or a frozen numerical criterion.
Keep everything local. Do not push.
