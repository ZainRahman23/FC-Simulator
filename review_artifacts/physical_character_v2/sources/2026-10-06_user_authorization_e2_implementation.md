# User authorization, 2026-10-06: E2 implementation and physical execution (verbatim)

Approve E2 v2 architecture and frozen criteria. Authorize implementation and physical E2 execution.
Proceed from the frozen E2 v2 design and preregistration exactly as recorded.
The planning certificates are predictions only. CERTIFIED_ONE_STEP means the planner has found a candidate worth executing; it does not count as physical success. Jolt-authoritative execution and the frozen E2 criteria determine the result.
Implement the smallest reusable E2 system described in the frozen design:
- IHMC-derived timed capture/foothold selection;
- Touchline body-specific certified reachability;
- the small PyPnC-derived DCM/COM reference layer feeding the existing finite-torque balance controller;
- the explicit BLF-derived quintic swing trajectory;
- existing measured support/contact lifecycle;
- continuous physical load acceptance;
- the same planner for commanded and recovery steps.
Do not import a whole robotics stack and do not introduce a second competing balance controller.
Preserve the explicit planner outcomes CERTIFIED_ONE_STEP and NO_CERTIFIED_ONE_STEP.
Run E2 in stages so failures remain causal:
1. First physical step: V2-REF, one 10 cm forward step, preferred side, nominal rate, no perturbation.
2. If it passes, mirror it.
3. Then all eight bodies on the forward step.
4. Then the 8 cm lateral step, mirrored and across bodies.
5. Then physics-rate and perturbation matrices.
6. Then execute the four existing STEP_REQUIRED snapshots as capture-aware recovery steps.
7. Then the complete frozen E2 battery and G0–G3/E1 regression.
Do not continue blindly through later stages if an earlier stage reveals an architectural failure. Diagnose it first.
For every physical step, preserve enough telemetry to reconstruct:
- measured COM and DCM versus references;
- implied/requested/realized CoP;
- planned and actual liftoff/touchdown/support times;
- planned foothold, first-contact pose and settled pose;
- whole-foot clearance/contact history;
- stance-foot translation, rotation and slip;
- swing-foot position/velocity/acceleration tracking;
- measured loading and load-transfer progression;
- actuator torque and saturation duration;
- contact impulse/penetration/rebound;
- capture prediction error at touchdown and load acceptance;
- energy/work accounting;
- support-state transitions.
Do not tune to individual failed cases after seeing them. If a frozen criterion fails:
- determine the causal mechanism;
- determine whether it is an implementation defect, model deficiency, genuinely infeasible plan, or bad preregistered assumption;
- preserve the failed result;
- stop for my decision if fixing it would change architecture, criteria, physical parameters or evidence-backed constants.
Minor implementation bugs may be corrected and rerun provided they do not alter the frozen design or criteria and are documented.
For recovery cases, if the implemented planner returns NO_CERTIFIED_ONE_STEP, do not force a foothold. Record it and stop that case.
If the physical execution contradicts a planning certificate, treat that discrepancy as important evidence and diagnose why rather than expanding margins until it passes.
Keep all existing defaults/regressions protected. Keep everything local and do not push.
If E2 passes legitimately, stop before designing multi-step walking. Give me the complete E2 result, the physical trajectory evidence, remaining debt, and your recommendation for the next gate.
