# User instruction (verbatim), 2026-10-04 20:09 UTC: approve the knee architecture correction before E1a (conservative, evidence-first)

Pasted by the user; reproduced exactly as received, below the rule. The "independent Astra knee review" it refers to was not provided as a file; only the summary of its conclusion in this instruction is available.

---

I now have the independent Astra knee review. Its conclusion independently converges strongly with your architecture: retain flexion plus an independent axial coordinate, with a flexion-dependent passive reference path, compliant nonlinear/asymmetric resistance, finite active axial control, and energy-consistent coupling back into flexion.
I approve proceeding with the knee architecture correction before E1a, but I do not approve treating uncertain deep-flexion numbers as established anatomy.
Implement this conservatively and evidence-first.
Approved architectural decisions
1. Keep knee flexion and axial rotation as separate physical coordinates.
2. Replace the fixed-neutral / excessively broad axial behavior with a flexion-dependent preferred/reference orientation plus finite compliance.
3. Do NOT rigidly prescribe axial rotation from flexion.
4. Passive axial mechanics must derive from an energy-consistent coupled formulation. If the preferred angle or stiffness varies with flexion, include the corresponding generalized flexion reaction terms; do not merely move an axial spring rest angle each tick.
5. Preserve finite active knee axial control. Do not remove the actuator merely because a passive reference path now exists.
6. Keep active capacity near the existing value provisionally unless validation gives a reason to change it. Do not infer a new whole-range strength curve from the available 90° evidence.
7. Do not add a generic weight-bearing stiffness multiplier. Loaded-knee stiffness is insufficiently identified and whole-leg yaw must not be hidden inside knee stiffness.
8. The knee is only one contributor to stance yaw. Preserve observability of ground, foot/ankle, knee, hip and upper-body contributions.
Deep flexion
Do NOT encode ~20° at 145–150° as validated anatomy.
Treat the 120–150° reference trajectory, rotational envelope and stiffness as explicitly provisional/sensitivity parameters. Preserve uncertainty in the implementation and documentation.
E1a is a low-flexion experiment, so deep-flexion uncertainty alone must not block it. Deep flexion remains outside the certified capability envelope until separately validated.
Numbers
Reconcile your proposed low-flexion parameterization against the independent evidence rather than simply retaining your previous table. In particular, distinguish:
- torque-defined laxity;
- passive preferred/reference trajectory;
- actively used rotation;
- hard/emergency limits.
Do not turn a 5 N·m laxity endpoint into an anatomical hard stop.
Your proposed exact 14° internal / 24° external hard limits and deep-flexion 0.6× scaling are NOT pre-approved. Derive or downgrade them to explicitly provisional engineering bounds.
Before E1a
Build the corrected knee behind an off-by-default flag and preregister validation before looking at outcomes.
At minimum validate:
- anatomical coordinate/sign conventions and L/R mirroring;
- generalized/spatial power consistency;
- closed flexion–axial energy cycles;
- low-flexion torque–rotation behavior at several flexion angles;
- passive versus actuator work separately;
- reference-path behavior through the complete E1a knee-angle envelope;
- joint-limit/emergency-limit behavior;
- timestep sensitivity;
- G0–G3 regressions;
- whole-leg yaw decomposition so knee stiffness is not masking another weak link.
The corrected model must not be selected because it keeps the character upright. Validate the mechanics first.
Once the corrected knee passes those tests and G0–G3 remain acceptable, re-freeze the E1a preregistration before running E1a.
Preserve the old knee and all previous results as historical comparators. Do not push anything.
Do not start E1a until the correction/qualification pass is complete. If a genuinely unresolved decision remains that materially affects the low-flexion E1a model, stop and bring me the evidence and alternatives. Otherwise carry this through the implementation and validation sequence and report whether E1a is finally ready to authorize.
