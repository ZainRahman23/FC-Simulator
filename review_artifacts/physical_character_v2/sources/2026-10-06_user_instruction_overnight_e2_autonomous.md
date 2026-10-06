# User instruction, 2026-10-06 (overnight, autonomous): E2 estimator correction → handoff → PG-1 (verbatim)

Continue autonomously from the current E2 state while I am away. You have permission to investigate, implement, test, regress, document, and locally commit the next principled corrections without waiting for routine approval. Do not push anything. Do not weaken, reinterpret, silently bypass, or tune acceptance criteria merely to obtain a pass. Stop only for a genuinely architectural/product decision that cannot responsibly be made from the frozen design, evidence, donor implementations, and existing project decisions.
Primary objective
Get E2 from its current pre-official state to the point where we either:
1. have a genuinely certified implementation under the frozen requirements, or
2. have isolated the smallest remaining physical/planning limitation with enough evidence that I can make the next design decision when I return.
The goal is not to make the tests green at any cost. The goal is to make the physical character correct, causal, deterministic, auditable, robust across the required bodies/directions/rates, and consistent with the architecture already established.
Current evidence to treat as the starting point
The velocity-tracking investigation has now isolated a concrete defect much more strongly than the earlier hypothesis set.
The foot reference and Cartesian target generation are correct. The IK joint targets move at approximately the intended rate. Feed-forward arithmetic after the desired-joint-velocity calculation is correct. Passive damping is negligible relative to the servo. Applied actuator torque matches the intended law to very high precision. The dominant loss enters at the desired joint velocity estimate supplied to the velocity feed-forward path.
For vertical/lift motion, the measured desired knee/hip velocity is only about 0.26–0.37× the required value; forward motion is about 0.84–0.97×. The estimator is currently a single damped Levenberg–Marquardt/Gauss–Newton step with fixed damping around 0.01. At the actual swing poses the knee is around 35° bent, so this is not simply a straight-knee singularity, but the lift-foot direction is weak: its relevant Gauss–Newton eigenvalue is around 0.010–0.012, comparable to the fixed damping. That mathematically predicts approximately 0.31–0.34× vertical and 0.86–0.88× forward, which matches the measurements unusually well.
A diagnostic override using the solver's converged/appropriate damping in that velocity-estimate step reportedly reduced the vertical 2 Hz lag from roughly 43 ms to ~1.4 ms. Treat that as strong causal evidence, but reproduce/verify anything necessary before making a production correction.
The earlier independent technical review specifically warned that apparent partial velocity-feed-forward effectiveness could arise from damped inverse-Jacobian regularization, because singular-direction gain is attenuated according to the regularization strength. It ranked correction of the existing velocity-tracking path first, liftoff handoff second, servo bandwidth only conditionally third, and floating-base inverse dynamics/operational-space escalation only after residual coupling is demonstrated.
Therefore do not add more acceleration feed-forward or inverse dynamics as the next fix unless new controlled evidence overturns this diagnosis.
Decision 1 — correct the velocity estimator first
Implement the smallest principled correction to the desired-joint-velocity estimation problem.
Prefer a mathematically justified singularity-robust variable/adaptive damping formulation over an arbitrary reduction of the global damping constant. The intended behavior should be:
- essentially converged/low damping when the configuration and requested task direction are safely conditioned;
- increased regularization only when conditioning genuinely requires it;
- no arbitrary E2-specific scalar multiplier such as "vertical velocity ×3";
- no fitted 20–40 ms target advance;
- no hidden compensation designed solely around the present test bodies;
- no weakening of physical acceptance criteria.
Use established numerical IK practice and the existing project architecture. If there are several reasonable adaptive-damping formulations, inspect the project's existing IK implementation and the donor/reference material already gathered, choose the smallest defensible formulation, document why, and test its conditioning behavior explicitly.
However, preserve the alternative already identified: because E2's swing reference is analytic, desired joint velocities can potentially be derived consistently from that analytic reference rather than estimated by the problematic one-step solver. Compare that option against the general adaptive-damping correction.
My preference is:
Use the general correction if the velocity estimator is intended as a reusable general-purpose component and the change survives all prior regressions.
Use an E2-scoped analytic-reference path if changing the general estimator would alter previously frozen/validated behavior in a way that cannot be proven safe tonight.
Do not choose the general fix merely because it is architecturally elegant. Existing certified behavior matters. Conversely, do not create an E2 special case merely to avoid doing the correct reusable fix if the regression evidence shows the general correction is safe.
Whichever you choose, make the decision explicit in the implementation/write-up.
Regression requirements for the estimator change
The velocity feed-forward affected by this estimator is part of behavior already exercised by E1a/E1b, so a general change must not silently invalidate earlier certification.
Run the relevant prior regression suites, including at minimum the previously identified:
- E1a;
- E1b closing/related velocity-feed-forward behavior;
- G0–G3;
- default path / KV0;
- PStar4;
- any other frozen regression that the repository or decision documents identify as covering this path.
Preserve deterministic behavior. If a configuration is intended to remain bit-identical, verify it rather than assuming it.
If the general correction causes a prior certified run to change, determine whether:
1. the old behavior depended on the same defective estimator and therefore requires an explicit design decision to update, or
2. the new behavior is an unintended regression.
Do not silently bless changed historical outputs.
Re-run the servo diagnostics after the correction
Re-run representative constant-velocity, sinusoidal/chirp, direction-reversal and real E2 swing measurements.
At minimum quantify:
- reference foot position/velocity;
- desired joint velocity;
- realized joint velocity;
- final actuator command;
- actual foot velocity;
- signed tracking error;
- RMS and peak error;
- phase/delay where meaningful;
- positive versus negative directions;
- vertical versus forward/lateral behavior;
- representative bodies and both legs;
- relevant physics/control rates;
- torque utilization/saturation;
- any dependence on solver iterations or conditioning.
Confirm that correcting the estimator removes the velocity-proportional lag for the right causal reason, rather than moving the error somewhere else.
Keep acceleration feed-forward independently switchable and preferably disabled for the first corrected baseline. Do not use it to obscure whether the velocity-path repair actually worked.
Decision 2 — liftoff/contact-to-swing handoff
Once the steady/airborne velocity path is corrected, isolate the liftoff transient separately.
The earlier technical review concluded that a mandatory weak-gain interval after physical liftoff is not an established requirement. Donor architectures instead manage contact unloading/removal separately from swing tracking authority and initialize/continue swing references consistently through release.
Inspect the current implementation and determine whether E2 still has a weak tracking interval, stale stance objective, discontinuous release reference, gain blend, command blend, or other handoff behavior that causes avoidable post-liftoff error.
If so, implement a bumpless contact-to-swing handoff:
- prepare swing tracking during unloading without commanding incompatible grounded motion;
- use measured contact lifecycle to determine release;
- initialize or continue the swing reference with a consistent release pose and velocity;
- make intended swing tracking authority available when swing tracking actually begins;
- maintain continuity of actuator output;
- respect total torque capacity;
- do not continuously reset the reference to measured state, because that would hide tracking error;
- do not simply jump gains against a large accumulated error.
Measure the transient before and after the change. Keep the steady-airborne tracking analysis separate from liftoff so that a time-varying transition is not mischaracterized as a single constant delay.
Run all regressions affected by any handoff change.
Decision 3 — return to PG-1 / clearance only after tracking is repaired
After the velocity path and any justified handoff correction are complete, rerun the original commanded-step planning gate and physical smoke tests with the original frozen trajectory and unchanged acceptance requirements.
Do not change the swing apex/window beforehand just to get PG-1 through.
The existing evidence already warns that the frozen 25 mm apex may itself be physically marginal. At approximately 80% of swing, the reference reportedly leaves only about 5.4 mm above the turf. Even a corrected servo may retain roughly 0.5–2.6 mm of downward tracking error in some conditions. Therefore a 5 mm physical-clearance requirement may remain impossible or non-robust even after near-perfect tracking.
If that happens, treat it as a planning/trajectory feasibility issue, not a servo failure.
Explicitly separate:
1. reference geometric clearance;
2. tracking error;
3. swept-foot/toe/heel clearance;
4. contact/scuff;
5. the planning gate's allowance/margin.
Plot/record signed vertical error separately from physical clearance. Remember that a pure phase lag should generally put the foot low during ascent and high during descent; if it is low in both directions, investigate geometry/orientation/reference bias rather than calling everything "lag."
Re-evaluate the previous PG-1 inconsistency concerning the 20% clearance window only after the corrected physical measurements exist.
If PG-1 still fails after the controller correction
Do not arbitrarily loosen the 5 mm requirement.
Determine which of these is actually true:
A. The preregistered clearance measurement/window is inconsistent with the intended trajectory semantics.
For example, if the design defines swing timing from measured liftoff rather than command time, test whether clearance percentage should be measured from physical liftoff. Quantify the consequence rather than simply choosing the interpretation that passes.
B. The frozen 25 mm apex/path is genuinely too low.
If the corrected physical system cannot robustly satisfy clearance, calculate the minimum principled trajectory change required, including robustness margin across the required bodies, legs, directions and rates. Do not simply add a large arbitrary apex increase.
C. The remaining failure is still control-related.
If so, identify it causally and return to diagnosis.
If the correct next move requires changing a frozen/preregistered trajectory or acceptance interpretation, stop before making that product/design change, produce the evidence and recommendation, and leave the repository in a clean, documented state for my decision.
Recovery / PG-2
Do not let recovery work distract from getting the commanded step correct first.
The existing PG-2 planning result was 4/4 certified at the audited foothold, but the physical recovery smoke run exposed separate issues: old stance-foot lift/re-land behavior, high impact/horizontal touchdown speed, and CoP/support timing behavior after the push. These may require a minimum-load constraint on the old stance foot, a floor on recovery swing time, and an explicit decision about how the CoP criterion applies to recovery steps.
Preserve those findings.
Once the commanded step is genuinely passing—or if useful diagnostic work can be done without changing the commanded-step path—you may investigate recovery, but do not weaken recovery criteria or silently reinterpret E2-17.
If recovery requires a new design decision, document it and stop that branch rather than inventing policy.
Do not escalate architecture prematurely
Do not implement floating-base inverse dynamics, operational-space acceleration control, computed torque, or another independent controller merely because those architectures are more sophisticated.
The prior technical review explicitly concluded that these are conditional escalations, not the immediate cure for the measured symptom.
Only consider a contact-aware acceleration-to-torque correction if, after:
- the velocity-reference/estimator path is repaired;
- point/frame/time consistency is verified;
- the liftoff handoff is repaired;
- actuator modes/limits and competing control are audited;
a significant residual remains and controlled anchored-versus-floating / support-coupling tests demonstrate that the residual is actually caused by floating-base/support dynamics.
If you reach that point, stop and produce the evidence and proposed smallest architecture change before implementing a major new controller, unless the existing frozen design documents already explicitly authorize that exact step.
Preserve architecture and invariants
Throughout:
- simulation/physics remains authoritative;
- do not introduce animation/presentation concerns into this work;
- preserve deterministic behavior and seeded/auditable randomness where applicable;
- preserve existing balance-controller responsibilities unless evidence requires an explicit architectural decision;
- do not create two controllers fighting over the same actuator;
- total actuator capacity means all active contributions combined;
- do not apply fictitious contact forces directly;
- Jolt/physics determines actual motion and contact reactions;
- use actual measured contact lifecycle rather than arbitrary elapsed-time assumptions where the design calls for it;
- preserve default-off configuration behavior;
- preserve KV0/PStar4 and other frozen paths unless an explicitly documented correction requires otherwise;
- no test-specific branches, body IDs, direction IDs, seed checks, or acceptance-gaming hacks.
Testing discipline
For every meaningful change:
1. formulate the causal hypothesis;
2. make the smallest change that tests it;
3. run the targeted diagnostic;
4. run affected regressions;
5. inspect physical telemetry, not only pass/fail;
6. compare against the pre-change baseline;
7. document what was learned;
8. only then keep or revert the change.
Avoid stacking several speculative fixes and then trying to infer which one worked.
Where practical, use matched deterministic conditions so counterfactual comparisons remain meaningful.
Documentation
Keep the E2 documentation current as you work.
Update the implementation/diagnosis documents with:
- the exact estimator defect and mathematics;
- before/after telemetry;
- the chosen correction and rejected alternatives;
- regression results;
- liftoff findings and any handoff correction;
- PG-1 results after tracking correction;
- whether remaining clearance is control error or trajectory feasibility;
- recovery findings if investigated;
- any unresolved design decisions.
Add/update DECISIONS.md only for decisions actually made. Clearly distinguish:
- established/frozen design;
- empirical finding;
- implementation correction;
- diagnostic override;
- hypothesis;
- unresolved product/design decision.
Do not retroactively describe a diagnostic override as production architecture.
Git discipline
Work in small coherent commits where useful.
Commit locally only. Do not push.
Before finishing, ensure the working tree state is understood and report any intentional uncommitted artifacts/evidence.
Do not rewrite unrelated history or clean up unrelated files.
Autonomy / stopping rules
You do not need to stop for:
- ordinary implementation details;
- choosing between equivalent test instrumentation approaches;
- fixing clear implementation bugs;
- adding telemetry;
- adding regressions;
- reverting failed experiments;
- making the smallest mathematically principled estimator correction if regression evidence supports it;
- implementing a clearly justified bumpless handoff consistent with the frozen design.
You must stop and ask for my decision before:
- weakening or changing an acceptance threshold;
- changing the intended physical meaning of an acceptance criterion;
- changing the frozen 25 mm apex or other preregistered trajectory geometry solely because the corrected controller reveals it is infeasible;
- accepting a regression in previously certified behavior without explicit justification/authorization;
- making a major controller-architecture replacement;
- redefining recovery policy such as E2-17/CoP semantics where the frozen documents do not already answer it;
- introducing a morphology/test-specific workaround.
If one branch hits such a decision, continue any other safe, independent diagnostic/documentation work that can be completed without prejudging the decision.
What I want to wake up to
Give me one consolidated report, not a stream of minor questions.
Start with a short status:
E2 STATUS: CERTIFIED / BLOCKED ON PLANNING DECISION / BLOCKED ON RECOVERY DECISION / BLOCKED ON NEW TECHNICAL FAILURE
Then report:
1. What you changed
2. What the velocity-estimator root cause proved to be
3. Which estimator solution you chose and why
4. Before/after tracking numbers
5. Prior-regression results
6. Liftoff-handoff diagnosis and result
7. PG-1 planning result
8. Corrected physical commanded-step result
9. Clearance decomposition: geometric reference vs tracking vs actual swept-foot clearance
10. PG-2/recovery status
11. PG-3 status
12. Any remaining blocker and the exact decision I need to make
13. Local commits made
14. Files/docs containing the detailed evidence
Include quantitative tables where useful. Report failures as failures. A clean, well-isolated blocker with excellent evidence is a successful overnight result; do not compromise the architecture or requirements merely to tell me E2 passed.
The priority remains:
correct causal physics/control behavior first → certify it second → only then optimize or expand the architecture.
