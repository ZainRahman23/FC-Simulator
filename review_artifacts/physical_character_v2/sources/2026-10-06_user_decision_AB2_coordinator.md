# User decision, 2026-10-06: preserve the A+B battery as FAIL; versioned A+B swing-contract amendment; then the touchdown coordinator; execution-feasibility certifier in parallel; stop before PG-1 / official E2 (verbatim)

Decision: preserve the completed A+B battery exactly as a failed preregistered validation. Do not rewrite, erase, or retroactively pass AB-7 or AB-4a/4b.
I accept the causal evidence for A and B themselves and authorize a versioned validation amendment, followed by the touchdown-coordinator stage.
A and B
Keep their implementations unchanged.
Do not accelerate A's early-airborne ramp merely to turn the measured 47% beta reduction into the old 50% threshold. The evidence shows that after φ≈0.2 A reaches the pinned-pelvis residual, while the remaining miss is concentrated in the liftoff transition where increasing A earlier would approach the contact regime that previously became unstable.
Keep B's reference-rate passive-damping compensation exactly once in the torque ledger.
Versioned A+B validation amendment
Freeze it before any further qualifying run.
Preserve the original AB battery and verdict as FAIL.
Split subsystem ownership explicitly:
1. Airborne swing compensation: validate A's intended pelvis-motion compensation only after the preregistered transition into genuinely airborne swing. Define the phase boundary from lifecycle/measured-contact semantics, not from the observed failure values. Preserve a separate diagnostic of the liftoff transient.
2. Swing torque continuity: retain the existing continuity requirement during uncontested airborne swing.
3. Contact-transition torque continuity: do not exempt it. Move the near-contact AB-4a/4b requirement into the touchdown-coordinator validation, where the handoff itself can be evaluated. The seven existing failures remain evidence that the coordinator must solve this problem.
Do not loosen the torque limit.
Validate the amended A+B swing contract before adopting A+B as qualified mechanisms.
If it fails for any reason outside those explicitly re-owned transition regions, stop.
If the amended A+B swing validation passes, freeze A+B and proceed to the minimal touchdown coordinator.
Follow the already approved architecture:
SWING / FINAL APPROACH → MEASURED CONTACT / ACCOMMODATION → LOAD TRANSFER → SUPPORT
Jolt measured contact remains authoritative.
Before implementing the coordinator, preregister its behavior and validation.
Final approach
Construct a geometry-consistent C2 terminal approach using actual sole/collision geometry.
Keep the 30 mm apex unchanged.
Most tangential displacement and orientation correction should be completed before the contact corridor.
Bound normal approach velocity throughout the entire plausible contact-height interval using the validated A+B tracking uncertainty.
Nominal deliberate-placement terminal normal velocity and acceleration are zero.
Do not choose the corridor dimensions or approach speed by searching E2 outcomes.
At first measured contact
Do not abruptly switch A+B or the swing task off.
Stop advancing the incompatible downward free-space reference.
Capture the realized contact pose/geometry as the contact anchor while retaining the planned foothold separately for placement scoring.
Transition vertical and orientation authority smoothly into contact-compatible accommodation.
Prevent the swing controller and load-acceptance controller from fighting each other.
Specifically require the coordinator to eliminate the existing AB-4a/4b near-contact torque-continuity failures without increasing actuator limits.
Load transfer
Begin support/load acceptance only from sustained measured contact.
Track requested versus realized load explicitly.
Transition continuously into ordinary support; no one-tick authority switch.
Touchdown validation
Preserve raw solver-step peaks diagnostically.
Also measure exact physical-time:
- first-10-ms impulse-derived average vertical load;
- cumulative impulse at 10/20/50 ms;
- actual contact-point normal and tangential velocity;
- torque continuity;
- penetration;
- rebound;
- slip;
- orientation;
- actuator work;
- contact persistence;
- requested versus measured load.
Do not yet amend E2-5 solely from these runs. Produce the evidence first.
Keep the 25% BW engineering contract visible.
Reachability
In parallel with the coordinator's offline prerequisites, add the smallest execution-feasibility extension to the certifier:
endpoint geometry → full-path feasibility under predicted pelvis motion → finite-actuator execution qualification.
At minimum include soft-limit margin, rate/conditioning, torque feasibility, swept sole clearance and final contact-compatible posture.
The V2-long-legs lateral counterexample must be rejected before runtime if it remains dynamically unexecutable.
Do not redesign the global planner.
After the amended A+B validation and touchdown-coordinator validation, stop and report before PG-1 or official E2.
Preserve T-1 unchanged.
Preserve the 30 mm apex.
Preserve all historical failures.
Do not tune thresholds or actuator capacities.
Keep everything local. Do not push.