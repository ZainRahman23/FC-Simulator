# User instruction, 2026-10-03: proceed to V2-G2 — active standing / balance

Verbatim (the user's message, as pasted; the user's preamble is included):

---

Perfect. G1 is now formally closed and preserved. Claude did exactly what we wanted: no simulation changes, permanent instrumentation retained, clean local checkpoint 2108c15, clean tree, V1 untouched, nothing pushed, and G2 has not started.
I think we can now proceed to G2: active standing.
This gate is important enough that I would not simply say “make it stand.” We want to find the minimum physically legitimate control architecture that can maintain quiet human-like standing with finite actuators, without importing V1's assumptions.
Send Claude this:
V2-G2 — ACTIVE STANDING / BALANCE
V2-G0 and V2-G1 are accepted and frozen as the physical foundation.
Proceed to V2-G2: active standing only.
The purpose of this gate is to answer:
Can the validated V2 physical humanoid maintain and recover quiet upright standing using only physically legitimate, finite internal joint actuation and ground contact?

This is not a locomotion gate.
Do not implement stepping.
Do not implement walking.
Do not implement gait planning.
Do not port V1's balance controller wholesale.
Start from the validated V2 plant and design the minimum standing controller justified by the mechanics.
1. HARD AUTHORITY RULES
Preserve permanently:
- Jolt owns physical state;
- no root/pelvis position writes;
- no root/pelvis velocity writes;
- no hidden upright force;
- no hidden support force;
- no external balance torque;
- no foot pinning;
- no contact teleportation;
- no infinite motors;
- no changing gravity;
- no manipulating friction dynamically to save balance;
- no animation/root-motion authority;
- no stepping or foot relocation.
The character may balance only through:
finite joint torques → body motion → physical foot/turf contact.
If the required correction exceeds the available support polygon or actuator capability, the character must fall.
2. DO NOT START BY COPYING V1
Study V1's C1 standing/balance work and its lessons, but treat it as evidence only.
Before implementation, identify:
- what V1 did;
- what worked;
- what was V1-body-specific;
- what assumptions should not be carried into V2;
- what mechanisms remain physically justified.
Build G2 for the V2 plant from first principles.
3. DEFINE QUIET STANCE
Establish a defensible V2 quiet-standing reference:
- foot separation;
- toe-out angle;
- knee flexion;
- hip posture;
- pelvis orientation;
- lumbar/trunk posture;
- shoulder/arm posture;
- head posture;
- whole-body COM relative to the feet.
Do not choose the pose solely because it is easiest for the controller.
Use human quiet-standing evidence where appropriate and distinguish:
human evidence / engineering choice / controller target.
The reference pose is a preference, not a kinematic lock.
4. START WITH ANKLE-STRATEGY BALANCE
Investigate whether ordinary quiet standing can be maintained primarily through physically plausible ankle strategy.
Measure:
- COM position and velocity;
- extrapolated COM / capture-point-like quantities where useful;
- centre of pressure;
- ground-contact wrench;
- ankle torque;
- ankle angle;
- foot loading;
- heel/toe load distribution.
The controller should regulate balance through physical ankle torque and resulting CoP movement—not by directly commanding body position.
Determine the actual controllable CoP region of the 10-piece boot under load.
Do not assume the full geometric sole is equally usable.
5. HIP / TRUNK STRATEGY
Small disturbances may require coordinated hip/trunk motion.
Determine when ankle strategy alone becomes insufficient and whether a physically plausible hip/trunk strategy improves recovery.
Any trunk/hip response must use finite internal torques and conserve the appropriate whole-body dynamics.
Do not use torso rotation as an invisible external reaction wheel.
Instrument whole-body angular momentum.
6. ARMS
Start with arms in a natural low-effort standing posture.
Do not initially use aggressive arm flailing as the primary balance mechanism.
Test:
A. arms passive/low-gain;
B. physically plausible arm counter-motion.
Quantify whether arms materially expand the recoverable disturbance envelope.
Any arm strategy must use finite shoulder/elbow actuation.
7. ACTUATORS
Use the V2 actuator specification.
Every motor must respect:
- torque capability;
- torque-speed relationship;
- activation/rate limits where specified;
- joint ROM;
- passive tissue;
- damping.
Log saturation per joint and axis.
Standing should not require persistent operation near maximum human capability.
Report typical and peak torque as a fraction of available capability.
8. CONTROLLER HIERARCHY
Keep the controller understandable.
Prefer a hierarchy such as:
state estimation
→ balance objective
→ desired physically achievable joint/CoP response
→ finite actuator commands
→ Jolt
rather than one giant tuned pose servo.
Separate:
posture preference
from
balance necessity.
If maintaining balance requires deviating from the nominal pose, balance wins.
9. NO PERFECT STATE ASSUMPTION WITHOUT TESTING
Initial controller development may use exact simulation state for diagnosis.
But record exactly what state variables the controller consumes.
Then test reasonable sensing latency/noise separately if that is already within the V2 specification.
Do not add prediction/latency compensation merely because V1 used it.
First establish the plant/controller behavior with clean measurements.
10. STANDING TESTS
At minimum test:
S0 — untouched quiet stand
Start in the approved quiet-standing pose.
No disturbance.
Require sustained standing for a meaningful duration.
Measure natural sway rather than demanding zero movement.
S1 — small fore/aft perturbations
Apply controlled external impulses at COM/torso level.
Test both forward and backward.
S2 — small lateral perturbations
Left and right.
S3 — diagonal perturbations
Ensure the controller isn't merely two unrelated 1D controllers.
S4 — angular perturbations
Small torso rotational disturbances.
S5 — varied initial pose
Small offsets from the reference stance.
S6 — body variants
Test shorter/lighter and taller/heavier generated players without per-body hand tuning.
S7 — failure boundary
Increase disturbance magnitude systematically until the no-step standing controller can no longer recover.
Falling beyond that boundary is correct behavior.
Do not tune the controller to survive impossible disturbances.
11. NO STEPPING
This is critical.
During G2 the feet may:
- roll physically;
- heel-rise;
- toe-rise;
- rotate/slip if contact mechanics genuinely cause it.
But the controller may not deliberately relocate a foot.
If balance requires a step, classify the trial as:
standing recovery exhausted / step required.
That boundary becomes useful input for later gates.
12. FOOT / CoP VALIDATION
Reuse the permanent G1 foot instrumentation.
During standing and recovery track:
- CoP;
- per-piece contact;
- heel/toe loading;
- foot pitch/roll;
- ankle torque/work;
- ground reaction force;
- foot slip;
- turf penetration.
Confirm the 10-piece foot behaves smoothly under active standing.
Specifically check for contact discontinuities as CoP crosses compound-piece boundaries.
13. HUMAN-LIKENESS METRICS
Do not judge standing only by “didn't fall.”
Compare where evidence is available:
- quiet-stance sway magnitude/frequency;
- ankle angle variation;
- CoP excursion;
- COM excursion;
- typical ankle torque;
- hip/trunk contribution;
- foot loading;
- recovery times.
Avoid overfitting to one study/population.
We want broadly human-plausible behavior, not exact reproduction of a laboratory participant.
14. ENERGY / AUTHORITY AUDIT
Extend the G1 ledger.
Account for:
- motor work by joint;
- passive tissue work;
- contact work;
- damping;
- gravitational potential changes.
Verify that recovery energy comes from finite actuators.
Maintain an explicit external-impulse/force ledger so the only external disturbances are the test impulses we intentionally apply.
No unexplained support or propulsion.
15. SATURATION / FAILURE AUDIT
When the body falls, determine why.
Examples:
- CoP reached support boundary;
- ankle torque saturated;
- hip strategy saturated;
- foot slipped;
- heel/toe contact was lost;
- joint ROM exhausted;
- controller instability.
Do not classify every fall as a controller bug.
Produce a causal failure classification.
16. ROBUSTNESS
Test reasonable variation in:
- body size;
- small pose offsets;
- disturbance direction;
- disturbance timing;
- deterministic starts.
Do not tune separate gains for each individual body unless the gains derive automatically from body mass/height/inertia or other physical parameters.
Prefer dimensionless/body-scaled controller parameters where possible.
17. DETERMINISM
G2 remains deterministic.
Repeated identical tests must reproduce.
Preserve snapshot/restore.
Browser/Node agreement should remain where supported.
18. PERFORMANCE
Measure separately:
- G1 physics baseline;
- state estimation;
- standing controller;
- actuator calculation;
- instrumentation.
Keep the known 150-iteration solver cost visible as technical debt.
Do not optimize it away during G2 unless an independent correctness-preserving solution emerges naturally.
19. REVIEW HARNESS
Build a G2 review mode/page with:
- playback;
- pause;
- slow motion;
- frame step;
- restart;
- front/side/3⁄4/follow cameras;
- COM;
- CoP;
- support polygon;
- ground reaction;
- joint targets vs actuals;
- actuator torque;
- actuator saturation;
- ankle torque;
- foot-piece contacts;
- external test impulse;
- whole-body angular momentum.
I want to visually distinguish:
quiet balance
from
active recovery
from
physically unrecoverable fall.
20. G2 PASS CRITERIA
Define numerical criteria before the final validation runs.
Do not write criteria after seeing final results.
The criteria should establish at minimum:
- sustained quiet standing;
- bounded human-plausible sway;
- no hidden forces;
- no stepping;
- no persistent foot slide;
- finite actuator use;
- no systematic actuator saturation in quiet stance;
- recovery from a documented small-disturbance envelope;
- symmetric left/right behavior;
- robust behavior across required body variants;
- deterministic replay;
- clean energy/authority accounting.
Also establish the measured no-step recovery boundary, even though falling outside it is not a gate failure.
21. DEVELOPMENT METHOD
Work incrementally.
Suggested sequence:
1. characterize passive quiet stance;
2. characterize available CoP control from ankles;
3. build minimum sagittal ankle strategy;
4. validate it;
5. add lateral ankle/hip requirements;
6. validate;
7. add hip/trunk strategy only if measured need demonstrates it;
8. investigate arms separately;
9. run perturbation envelope;
10. run body variants;
11. final gate.
Do not immediately build a sophisticated whole-body controller.
At every stage ask:
What is the smallest physically justified mechanism missing?

22. DEFECT POLICY
If G2 reveals a genuine G0/G1 plant defect, demonstrate it causally.
You may fix an unambiguous implementation defect and rerun all affected earlier gates.
If fixing it requires changing:
- approved anatomy;
- topology;
- contact architecture;
- passive-tissue specification;
- actuator capability;
- physical-authority rules;
stop for my decision.
Do not tune the plant to make the controller's job easier.
23. PRESERVE G0/G1
G0 and G1 are now approved historical gates.
Any plant change requires their relevant regressions to pass again.
Preserve:
- G1 heel-rise investigation;
- permanent foot/ankle probe;
- torque/work decomposition;
- technical debt;
- all approved deterministic baselines.
STOP CONDITION
If G2 passes:
- commit locally;
- do not push;
- update reports/decision record/handoff;
- leave the review server running;
- give me the review URL and curated scenarios;
- STOP.
Do not begin G3 weight transfer.
If G2 cannot pass without a material architectural/specification decision, stop with the measured evidence and options.
Do not implement stepping or walking under any circumstance during G2.
