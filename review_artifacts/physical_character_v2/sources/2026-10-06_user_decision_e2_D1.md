# User decision, 2026-10-06: E2 D1 — swing acceleration feed-forward (verbatim)

Approve D1. Do not choose D2 or D3. Keep all existing numerical E2 thresholds, the 25 mm apex, 0.6 s swing duration and measured-liftoff semantics unchanged.
Add acceleration feed-forward to the swing-foot servo as a principled trajectory-tracking term, not as a tuned gain intended to make E2 pass.
Before implementation, derive the required generalized/joint contribution from the existing finite-torque model and the commanded Cartesian swing acceleration. Use established inverse-dynamics/operational-space practice where applicable rather than inventing an ad hoc acceleration boost.
Preserve finite actuator capacities, torque limits and all existing physics authority. Feed-forward may request physically realizable torque; it may not move the foot directly, modify Jolt state, or bypass contact.
Also update the E2 planning clearance certification so that it predicts actual tracked foot clearance, not reference-trajectory clearance alone. The certification must include a preregistered tracking-error/uncertainty allowance derived independently from validation data, not selected from the failed E2 case.
Before the next official E2 run, validate the new swing servo independently across:
- both legs;
- all eight morphologies;
- representative forward/lateral trajectories;
- 180/240/480 Hz;
- rise, apex and descent;
- unloaded swing;
- finite torque/capacity limits.
Measure position, velocity and acceleration tracking, phase lag, peak/RMS error, torque demand and saturation. Include deliberately harder trajectories so the test can distinguish an actually improved servo from one that only handles the E2 seed.
Verify that the acceleration feed-forward improves tracking for the expected dynamical reason and does not introduce energy anomalies, contact impulses, oscillation or rate sensitivity.
Do not alter the swing trajectory to compensate for remaining tracking error during this validation.
If the servo validates and the planning gate then certifies the frozen E2 commanded steps, resume E2 from stage 1:
V2-REF → 10 cm forward → preferred side → nominal rate → no perturbation.
Continue through the staged commanded-step battery only while the frozen criteria pass.
Preserve the two implementation bug fixes already found:
- measured-state swing initialization must not differentiate the snap/re-capture;
- early contact must not convert a still-certified current foothold into a zero-length step.
Continue to leave recovery issue C untouched until commanded stepping passes.
If acceleration feed-forward itself requires a materially different controller architecture, or if the independently validated servo still cannot provide sufficient tracking margin for the frozen trajectory within finite torque limits, stop and report rather than tuning bandwidth, apex, duration or thresholds.
Keep everything local. Do not push.
