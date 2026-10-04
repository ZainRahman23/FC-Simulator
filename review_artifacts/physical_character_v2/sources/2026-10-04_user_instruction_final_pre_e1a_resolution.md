# User instruction, 2026-10-04 (evening): final pre-E1a resolution stage (verbatim)

We are now at the final pre-G4 resolution stage. Use the completed pre-G4 runway and all existing V2 evidence as the starting point.
Do not run G4/E1a yet. Do not start walking, swing planning, or repeated stepping.
The goal of this task is to resolve the remaining questions that genuinely need resolution before the first physical foot-lift experiment, implement/test the necessary G3→G4 boundary infrastructure, and leave the project in a state where the next decision can simply be AUTHORISE E1a or DO NOT AUTHORISE E1a.
Do not reopen already settled G0–G3 work without evidence of a real regression. Preserve the accepted baseline, deterministic behavior, historical evidence, failed experiments and existing reports. Nothing pushed.
1. Resolve the posture/twist policy
The "current" twist policy is no longer an acceptable default candidate if the existing evidence continues to show that it sustains accidental twist/non-decaying oscillation.
Compare the remaining physically plausible alternatives, especially:
- blended reference behavior, including the previously identified useful region around a ≈ 0.35–0.5;
- drifting/adaptive reference behavior, including the previously identified τ ≈ 1–2 s;
- any clearly superior formulation justified by the evidence.
The question is not which policy produces the best G3 score. Determine which semantics we actually want for a football player's posture controller.
A legitimate voluntary turn must not be continuously dragged back toward the original world orientation. Conversely, accidental twist acquired from perturbation/contact should not silently become the new permanent target.
Test:
- quiet stance;
- perturbation recovery;
- deliberate heading/yaw changes;
- weight transfer;
- near-single-support;
- full unloading;
- morphology variants;
- transition toward liftoff;
- held-out disturbances.
Measure twist/recentring, controller torque and work, oscillation, whole-body yaw response, foot slip/drag and settling.
Try to falsify each candidate.
If the evidence clearly supports one policy, you may adopt it only after preregistering the comparison/acceptance criteria. Record why it is correct independently of downstream gate scores. Otherwise stop with the unresolved choice.
2. Research the real single-support yaw mechanism
This is the highest-priority physical question.
Current evidence says that once only one foot supports the body, the stance ankle's passive ab/adduction axis is effectively the remaining yaw anchor, and approximately ≥1 N·m/° would be required to constrain yaw to ~5°, roughly an order of magnitude above the unloaded evidence previously used.
Do not simply set the ankle stiffness to that value.
Research what actually provides internal/external-rotation/yaw resistance in a planted human leg during single support.
Use high-quality primary biomechanics sources where possible. Distinguish:
- talocrural contribution;
- subtalar/foot contribution;
- tibial/internal-external rotation;
- knee axial mechanics and flexion dependence;
- hip counter-rotation;
- foot-ground friction/contact mechanics;
- passive tissue stiffness;
- active muscular stabilization;
- loaded versus unloaded behavior.
Be careful not to transplant stiffness measurements from a different anatomical coordinate into ours.
Determine whether our existing single passive ankle ab/adduction coordinate is being asked to represent something that in humans is distributed across several structures.
Compare at least these architectural possibilities conceptually and diagnostically:
A. evidence-supported load-dependent passive ankle/foot rotational resistance;
B. finite-strength active ankle/leg yaw stabilization;
C. distributed stabilization involving ankle + knee/hip;
D. some combination.
Any active stabilization must use finite actuator torque and may not write orientation, angular velocity or pose directly.
The objective is not "prevent yaw." The objective is physically plausible single-support yaw behavior that will eventually permit running, turning, planting, cutting and kicking.
If external evidence cannot uniquely determine the model, report the uncertainty rather than inventing a number.
3. Resolve the knee axial question enough for E1a
Source appropriate evidence for knee axial/internal-external rotation ROM and behavior as a function of knee flexion where possible.
Revisit the current finding that the ankle and knee end ranges are loaded in series in the prone-rest case near ~145° knee flexion.
Determine:
- whether our current knee axial ROM is defensible;
- whether it should vary/couple with flexion;
- whether the current passive/end-stop model is adequate;
- whether this issue can actually become live during E1a/E1b;
- whether it must be fixed before E1a or can safely remain documented debt.
Do not loosen ROM merely to pass a test.
4. Settle the ankle-law architecture
Use the results of sections 1–3.
Reconsider constant k versus load-dependent behavior.
Separate passive anatomical resistance from active stabilization and ground/contact yaw resistance.
If the evidence supports a new ankle law, preregister candidates and acceptance criteria before the official comparison.
Keep k=0 and the historical 0.11/0.13/0.15 evidence available as controls.
Do not choose by G3 score.
Require:
- passive-physics integrity;
- no unexplained energy generation;
- loaded and unloaded plausibility;
- morphology robustness;
- reasonable rate behavior;
- G0–G3 regression safety;
- appropriate behavior approaching true single support.
If no law is sufficiently supported, say so.
5. Build and validate the G3→G4 boundary components
The pre-G4 runway found H1–H12 hazards and confirmed eight with the external-lift harness.
Address the boundary mechanisms necessary for E1a, but do not perform E1a itself.
Keep new behavior behind default-off/experimental flags until individually validated.
In particular resolve/test:
- airborne foot currently having no position stiffness/control;
- hold/posture logic re-arming or fighting the leg after contact loss;
- load/contact flag chatter and the reported one-tick 6.6–158 N·m torque steps;
- self-contact being mistaken for supporting-foot load;
- heading/balance midpoint calculations incorrectly including an airborne foot;
- abort logic that can return to two-foot assumptions while a foot is airborne;
- 5–9 cm uncontrolled airborne-foot drift;
- pelvis-height calculations that incorrectly depend on the airborne ankle;
- every other H1–H12 item in the report that can become live during E1a.
Define an explicit support/contact lifecycle rather than scattered booleans if the evidence indicates that is needed. At minimum distinguish meaningful states such as loaded support, unloading, touching-but-not-supporting, liftoff, airborne, touchdown/recontact and load acceptance.
Contact alone must not automatically imply support.
Validate transition continuity: no unexplained torque impulse, energy jump, target discontinuity, stale contact, support-count error or hidden stabilization when crossing the liftoff boundary.
6. Finalize the foothold/reachability contract
Preserve the important new finding that freeing appropriate twist DOFs changes most of the previous "infeasible" set.
Finalize the distinction between:
geometrically reachable → anatomically/configurationally feasible → dynamically executable from the current state.
Use result classes:
FEASIBLE
PROVEN-INFEASIBLE, always stating the exact problem definition/bounds under which infeasibility was certified
UNKNOWN-NOT-FOUND
Numerical solver failure alone must never become PROVEN-INFEASIBLE.
Closest-pose fallback must never silently change the requested foothold.
Decide explicitly which twist DOFs, pelvis yaw/pitch/height variables and foot orientation freedoms belong to the planning feasibility problem.
Preserve appropriate safety margin from anatomical limits rather than planning exactly onto them.
Certificates may remain offline/audit-only if runtime cost is inappropriate.
7. Finalize E1a and E1b — but DO NOT RUN THEM
Review the proposed:
E1a: transfer → unload → lift 5 mm → hover → replace same foothold → touchdown → accept load → recover.
E1b: same lifecycle at 20 mm, including controlled perturbations.
Determine whether 5 mm is sufficiently above contact/turf numerical noise to constitute genuine liftoff. If not, justify a better value before seeing E1 results.
Preregister the complete E1 criteria before any E1 execution.
Include at minimum:
- true contact loss;
- true single support for an appropriate proportion of hover;
- controlled swing-foot position/orientation;
- bounded stance-foot slip;
- bounded COM/balance behavior;
- no contact/load flag chatter;
- no discontinuous torque commands;
- no unexplained energy creation;
- actuator capacities respected;
- no anatomical-limit abuse;
- deterministic reproduction;
- successful touchdown/recontact;
- smooth load acceptance;
- recovery to a valid two-foot state;
- morphology robustness.
Do not tune these criteria after E1 begins.
8. Recheck the proposed E2 assumptions
Do not implement E2.
Preserve the finding that a 10 cm lateral target at standing pelvis height was not reachable across the bodies tested, while a ≥2.5 cm pelvis drop made the proposed targets valid with much healthier margin.
Determine whether pelvis lowering should be an emergent/planned consequence of stance-leg mechanics rather than an arbitrary scripted drop.
E2 remains future work.
9. Rate/performance
Characterize whether the thin 240 Hz margin or the 180 Hz passive-fall artifact creates any realistic E1 risk.
Do not chase pathological rate behavior that cannot affect E1 or production locomotion, but do not hide it either.
Keep the eventual 22-player cost in view. Avoid adopting an obviously non-scalable solution simply because one character works.
Working rules
- Simulation remains authoritative.
- No kinematic/world-space rescue.
- No teleporting or pose writes to obtain desired outcomes.
- All stabilization must arise through the defined physical/controller mechanisms.
- Preserve determinism and seeded counterfactual testing.
- No criteria changes after seeing official results.
- Preserve counterexamples and failed candidates.
- Do not optimize merely to hit gates.
- Do not push.
- Local coherent commits are fine.
- Do not touch/falsify historical accepted evidence.
- Do not start E1a, E1b, E2 or any repeated walking.
If one investigation reaches a decision point, continue the independent work that does not depend on that decision rather than stopping immediately.
Final deliverable
Produce a concise but evidence-rich FINAL_PRE_E1A_REPORT answering:
1. What posture/twist policy should be adopted and why?
2. What physically anchors yaw in true single support in our model?
3. What does human evidence imply about the appropriate architecture?
4. What is the knee axial conclusion?
5. What ankle law should we use, if any?
6. What G3→G4 boundary components were required and how were they validated?
7. What is the final reachability contract?
8. What are the exact preregistered E1a/E1b criteria?
9. What known technical debt remains?
10. Which issues genuinely block E1a versus which can safely be discovered during E1?
11. Have G0–G3 remained valid?
12. What is the measured performance impact?
13. Final binary recommendation: AUTHORISE E1a or DO NOT AUTHORISE E1a.
If the recommendation is AUTHORISE E1a, stop immediately before running it and wait for me.
If it is DO NOT AUTHORISE E1a, identify the smallest remaining blocker and the evidence required to resolve it.
Use the available runway thoroughly. This is intended to be the last substantial pre-foot-lift investigation, not an invitation to invent additional gates indefinitely.
