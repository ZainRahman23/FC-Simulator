# User instruction (verbatim), 2026-10-05: focused causal investigation of the E1a unload blocker (no fix, no E1a rerun, E1b unauthorised)

Pasted by the user; reproduced exactly as received, below the rule.

---

E1a failure accepted and preserved. E1b remains unauthorized.
The E1a result is useful: do not tune it, alter the frozen failed runs, raise the 1% threshold, shrink the pelvis drop, revert the knee/twist decisions, or otherwise make E1a pass by outcome.
I authorize a focused diagnostic investigation of the smallest blocker only:
Why does the intended swing foot retain 1.02–1.25% body weight / approximately 7.6–9.5 N when its requested support share is zero?
Do not implement Option A or B yet.
Trace the residual vertical load causally through the controller and physical system. At minimum decompose, per tick through the final unloading phase:
- requested support/load share for each foot;
- measured normal load on each foot;
- CoP/ground reaction contribution;
- every actuator torque that can create or maintain swing-foot normal force;
- posture IK contributions;
- pelvis/COM regulation;
- hip, knee and ankle control contributions;
- support/lifecycle-dependent terms;
- swing/unloaded-foot hold terms;
- passive tissue contribution;
- contact geometry/penetration contribution;
- any coupling through the opposite stance leg.
Identify the smallest control term or interaction responsible for the residual 7.6–9.5 N. Demonstrate causality with diagnostic-only ablations/counterfactuals, one mechanism at a time. Do not adopt those ablations.
Specifically determine whether the residual load is:
1. an unintended consequence/bug in the support controller;
2. an intended consequence of posture or balance regulation that needs to be smoothly withdrawn as requested share approaches zero;
3. unavoidable physical residual contact while unloading;
4. a lifecycle circular dependency, where the controller will not stop supporting until the foot is released but the lifecycle will not release until the controller stops supporting;
5. or something else demonstrated by the measurements.
Compare the 2.5 cm case with the diagnostic 2.0 cm-or-less case where release succeeds. Explain why less pelvis drop produces lower swing-foot load, since that counterintuitive result may be particularly diagnostic.
Also explain why the old knee and current twist policy release at 2.5 cm while the adopted corrected configuration does not. Use these only as counterfactual evidence; they remain rejected and must not be restored.
Then evaluate Option A versus Option B from mechanism:
- A: planned near-zero support request can initiate release once appropriate physical safety conditions are met;
- B: remove/withdraw the controller term that continues pressing the intended swing foot into the ground.
A and B are not necessarily mutually exclusive. If the architecture physically requires both—a continuous unloading controller followed by an event/state transition—say so and propose the minimal causal design.
Do not select thresholds from this failed E1a result. Any proposed threshold/hysteresis/dwell time must come from physical meaning, existing evidence, or a separate preregistered characterization dataset.
Before adopting any fix, preregister tests that distinguish the proposed mechanism from alternatives. They should include both feet, all body variants, zero-share and small-nonzero-share requests, perturbations near the release boundary, false-release cases, chatter/recontact, stance-foot slip, energy accounting, torque continuity, and determinism.
Preserve the principle that simulation physics determines whether the foot actually leaves the ground. A support-state transition may remove support/control authority, but must never kinematically lift, teleport, detach, or force the foot airborne.
Do not rerun official E1a until a mechanism is understood, a correction is explicitly approved, its own validation is preregistered and passed, and the E1a configuration is re-frozen/versioned.
Stop after the causal investigation with:
- root cause;
- quantitative force/torque decomposition;
- counterfactual evidence;
- recommendation A, B, A+B, or neither;
- proposed mechanism;
- proposed preregistered validation;
- expected effect on G0–G3 and E1a;
- any new risks/debt.
Commit diagnostic evidence locally only. Nothing pushed. E1b remains unauthorized.
