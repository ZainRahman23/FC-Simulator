# User instruction, 2026-10-04 (overnight, unattended) — strongest defensible pre-G4 state: finish symmetry / IK / G1, characterise J2b, G4-readiness IK, performance, full revalidation, then (only if clean) the ankle reinvestigation and the 180 Hz study; STOP at the pre-G4 decision point

(verbatim)

I am going to sleep. You have a long unattended runway. Continue autonomously and use the available time aggressively.
The goal tonight is to get Physical Character V2 into the strongest defensible pre-G4 state possible, resolving the outstanding symmetry / IK / G1 issues and, if the prerequisite gates become genuinely clean, completing the ankle reinvestigation.
Do not start G4. Do not implement stepping or walking.
Do not stop for minor implementation choices that can be resolved experimentally. Make reversible diagnostic branches/configurations, preregister criteria before evaluating results, test alternatives, and choose the option best supported by existing specification + measured evidence where it does not require changing an approved architectural decision.
Stop only when:
- a genuinely architectural/user decision is required;
- evidence is ambiguous after reasonable experiments;
- proceeding would require changing approved anatomy/physics semantics/gate intent;
- or all work authorized below is complete.
PHASE A — FINISH THE SYMMETRY / NUMERICAL CORRECTIONS
The three identified defects are:
1. asymmetric usable-foot-region construction caused by collinear hull points / rounding;
2. asymmetric leg IK from the one-sided finite-difference/convergence implementation;
3. quaternion formulas being applied to slightly non-unit Jolt-derived orientations.
The objective is a mathematically mirror-equivariant controller without changing the intended physical character.
Preserve all before/after evidence and the original failing results.
A1. Foot-region correction
Keep the corrected strictly-convex/canonical mirrored construction if continued testing confirms that:
- left/right regions are exact mirrors;
- no legitimate usable CoP area is lost;
- external boot geometry is unchanged;
- physical collision geometry is unchanged;
- the old 0.72 mm notches were numerical construction artifacts;
- boundary behavior is smoother rather than merely different.
Test boundary cases heavily.
Do not special-case left/right.
A2. Quaternion correction — narrow its scope
The current global normalization altered two marginal G1 outcomes:
- V1-matched leanR: elbow 1.93° past range vs 1.5° criterion;
- upright at 360 Hz: emergency stop touched for one tick.
Investigate this fully before accepting the global normalization.
Compare:
A. historical quaternion behavior;
B. global normalization;
C. normalization only at controller / IK / coordinate-calculation boundaries where the mathematics actually assumes a unit quaternion.
Trace exactly why those two G1 cases change.
Preferred principle: normalize at the narrowest correct boundary rather than perturbing the passive physical plant unnecessarily.
If boundary-only normalization fixes controller symmetry while leaving G0/G1 physics bit-identical or physically equivalent, adopt the narrow correction.
If it does not, investigate further.
Do not loosen G1 criteria to accommodate quaternion normalization.
Do not alter anatomical limits.
A3. IK convergence polish
J2a currently reaches 79/81 after the major correction, with the remaining two failures caused by mirrored solves landing on opposite sides of the 1e-12 convergence boundary.
Investigate a deterministic final LM polish / fixed post-convergence iteration scheme.
You may adopt it if it:
- produces mirror-equivariant results;
- does not change reachability classification;
- does not move targets;
- does not create materially different joint configurations;
- works across all morphology variants;
- remains deterministic;
- has bounded cost;
- does not materially damage the performance budget.
Avoid a convergence rule whose output depends unnecessarily on which side of a floating-point threshold a mirrored solve happens to land.
Re-run all 10,880 near-reach problems and all 81 J2a pairs.
Target is not "make J2a pass"; target is remove a demonstrated numerical asymmetry.
PHASE B — CHARACTERIZE PHYSICAL MIRROR SYMMETRY PROPERLY
Keep J2a and J2b conceptually separate.
J2a = controller mirror equivariance.
J2b = physical mirrored-outcome correspondence between independently evolved simulations.
Do not force physical contact trajectories to be numerically identical.
The independent J2b study currently found approximately:
- no sliding: max 0.106 mm;
- sliding + recovery: max 2.10 mm;
- G3 failures through supervisor abort: max 0.42 mm;
- broader G2 falls measured until physical failure: max 14.8 mm.
Continue characterizing this floor if useful.
Determine whether maxima are isolated outliers or representative of tails. Report distributions, p95/p99/max where useful.
For G3, use only behavior relevant to G3:
A. no sliding;
B. sliding followed by successful recovery;
C. failed request through the common supervisor abort.
Do not use uncontrolled post-abort falling divergence as a G3 symmetry criterion.
My provisional engineering tolerances are:
- A: 0.25 mm
- B: 5 mm
- C: 1 mm through supervisor abort
- failure/abort timing: 5 ticks
These are provisional, not permission to blindly adopt them.
Test them against the independent characterization population and additional held-out mirrored states.
If evidence shows they provide a sensible margin above the measured physical/numerical floor without becoming so loose that the check loses meaning, you may preregister and adopt them.
If evidence contradicts them, derive a better simple rule from the evidence and document it, but do not simply set a threshold just above the worst observed failure.
Keep broader post-loss-of-balance divergence as report-only characterization.
Preserve the original J2/J2b definitions and results historically.
PHASE C — MAKE THE IK G4-READY WITHOUT STARTING G4
The near-reach study is encouraging:
- all geometrically reachable targets solved;
- unreachable targets were correctly classified;
- no L/R reachability disagreement across 10,880 tests;
- mirror errors were essentially numerical zero.
But the solver currently does not enforce anatomical joint limits.
This matters before swing work.
Build a G4-readiness IK study, not a stepping controller.
Start from actual validated G3 swing-ready / near-single-support states.
Generate representative candidate foot targets throughout the physically relevant workspace:
- short forward;
- medium forward;
- long forward;
- inward;
- outward;
- diagonal;
- slight backward;
- different lateral widths;
- near maximum reach;
- targets near full knee extension;
- targets requiring significant hip rotation;
- both legs;
- all body variants.
Determine for each target:
1. geometrically reachable?
2. reachable without violating anatomical joint limits?
3. number of valid inverse solutions if meaningful;
4. which solution is closest/most continuous from the actual starting pose;
5. whether knee hyperextension occurs;
6. whether hip/ankle limits are violated;
7. whether L/R classification is mirror-equivariant;
8. convergence cost;
9. sensitivity near the workspace boundary.
Do not implement a complete swing trajectory.
If joint-limit awareness can be added to the IK as a straightforward mathematical correctness improvement without altering approved anatomy or controller semantics, build it first as an opt-in candidate and compare it with the current solver.
If choosing the joint-aware IK architecture requires a meaningful design decision, stop short of adoption and present alternatives.
The goal is to answer:
Can G4 ask the leg for a physically valid foothold and know whether that foothold is actually reachable by the anatomical leg?

Add permanent IK reachability/mirror tests if appropriate.
PHASE D — PERFORMANCE
Performance margin has become materially smaller.
Current reported isolated required computation is roughly:
0.135 ms/tick worst-case mean vs 0.15 ms/tick budget,
with IK itself around 0.107 ms/tick.
Do not panic-optimize, but characterize it rigorously on an idle machine.
Separate:
- standing controller;
- IK;
- actuator computation;
- required total;
- diagnostic-only overhead.
Report:
- mean;
- median;
- p95;
- p99;
- worst useful statistic;
- warm vs cold if relevant.
Determine why IK increased from approximately 0.023 to 0.107 ms/tick.
If the corrected solver is doing unnecessary work that can be removed without changing its mathematical result, you may optimize it.
Acceptable optimization includes:
- eliminating redundant calculations;
- caching immutable geometry;
- avoiding repeated allocations;
- analytic reuse;
- avoiding diagnostic computation in production paths.
Do not:
- reduce solver accuracy merely to hit budget;
- reduce iterations until tests happen to pass;
- change physics;
- approximate away reachability;
- introduce nondeterminism.
Benchmark any optimization before/after and require identical or justified-equivalent outputs.
Performance work must not become the main project unless the validated package actually exceeds budget.
PHASE E — FULL FOUNDATION REVALIDATION
Once A–D are settled, rerun all affected foundations.
At minimum:
- component regressions;
- G0;
- full G1;
- permanent energy/passivity checks;
- permanent turf-contact-validity checks;
- teleport/correction bound;
- deterministic hashes;
- snapshot/restore;
- browser = Node;
- body variants;
- relevant rate/timestep tests;
- complete 620-run G2;
- J2a;
- J2b;
- complete G3.
Explain every changed G1/G2/G3 outcome.
Do not tune around changed outcomes.
Required foundation state before continuing:
- G0 clean
- G1 clean
- G2 clean
- G3 clean under explicitly versioned criteria
- controller mirror-equivariant
- physical mirror behavior inside evidence-backed tolerances
- no unexplained energy/contact pathology
- deterministic
If one of these cannot be obtained without a substantive design decision, stop there.
PHASE F — ANKLE REINVESTIGATION
Only if G0 → G1 → G2 → G3 are genuinely clean, proceed to the ankle question.
Keep:
- flat-plane turf;
- corrected symmetry package;
- accepted anatomy;
- accepted actuator capacities;
- accepted contact architecture.
The earlier catastrophic stiffness failures were contaminated by the now-understood turf-box GJK/EPA defect. Re-evaluate the ankle law from scratch.
Use the already researched whole-ankle internal/external-rotation evidence.
Preregister candidates before running:
- k = 0 historical baseline
- k = 0.11 N·m/°
- k = 0.13 N·m/°
- k = 0.15 N·m/°
Do not add arbitrary intermediate values after seeing results merely to optimize a gate score.
Test each candidate independently against:
Passive physics
- G1;
- passivity;
- energy;
- joint excursions;
- resting behavior;
- falls;
- morphology variants;
- rates.
Standing
- G2 quiet stance;
- pushes;
- no-step boundary;
- CoP;
- slip;
- actuator utilization;
- symmetry.
Pre-step
- G3 weight transfer;
- near-single support;
- full unloading;
- swing-ready state;
- reversibility;
- drift;
- disturbances;
- unloaded-foot drag.
Specifically measure ankle behavior
- ankle internal/external rotation;
- shank rotation relative to planted foot;
- hip counter-rotation;
- knee rotation;
- passive ankle torque;
- actuator torque;
- CoP;
- slip;
- unloaded-foot movement;
- settling/re-centering;
- behavior under load vs unloaded;
- morphology sensitivity.
The objective is not maximum stiffness or minimum twist.
The objective is an evidence-supported passive ankle that behaves humanly without compromising the validated plant.
Do not choose by G3 score.
PHASE G — INVESTIGATE THE 180 HZ PASSIVE-TISSUE EFFECT
Nonzero ankle stiffness previously exposed a separate effect around 180 Hz, reportedly up to approximately +161 J in one step under extreme end-range motion without contact, while 240 Hz did not show it.
If the ankle candidates reproduce this, investigate it before selecting any ankle law.
Determine:
- exact first bad tick;
- energy source;
- whether it is true stored/released passive potential or numerical creation;
- timestep dependence;
- convergence with rate;
- dependence on end-range stiffness;
- whether it occurs in physically reachable football states or only pathological stress states;
- whether the passive law or its numerical integration is responsible.
Do not dismiss it because production validation currently uses 240 Hz.
Do not loosen passivity criteria to accommodate it.
If it reveals another foundational defect, stop ankle adoption and report.
PHASE H — ANKLE DECISION
If none of 0.11 / 0.13 / 0.15 satisfies the preregistered requirements:
do not tune a new value until one passes.
Report why each failed and what the evidence implies.
If one or more satisfy everything:
rank them based on:
1. biomechanical evidence;
2. passive-physics integrity;
3. human-like twist behavior;
4. standing behavior;
5. pre-step behavior;
6. morphology robustness;
7. rate robustness;
8. simplicity.
Do not automatically adopt the winner.
Stop with a recommendation for me.
THINGS YOU MAY FIX AUTONOMOUSLY
You may fix and adopt a change without waking me for approval when it is clearly one of:
- a diagnostic/test bug;
- an accidental left/right implementation asymmetry;
- incorrect quaternion/unit-vector handling;
- deterministic convergence bookkeeping;
- a mathematical implementation bug relative to an already-approved algorithm;
- dead/redundant computation;
- instrumentation;
- test/reporting correctness.
In each case:
- preserve the old evidence;
- document the cause;
- demonstrate before/after;
- rerun affected gates;
- commit locally.
THINGS YOU MAY NOT DECIDE AUTONOMOUSLY
Do not autonomously:
- change body anatomy;
- change body masses/inertias;
- change joint anatomical limits;
- change actuator strength/capacity;
- change the skeleton contract;
- change the foot's external dimensions;
- redesign the physical foot;
- change the accepted flat-plane turf architecture;
- change production physics rate;
- change fundamental solver policy;
- loosen a gate merely because the implementation fails it;
- hide physical failures;
- introduce world-space pose corrections;
- introduce hidden support forces;
- introduce teleportation;
- make the animation/presentation layer affect physics;
- patch production Jolt;
- start G4;
- implement stepping;
- implement walking;
- push anything.
If one of those becomes necessary, investigate enough to give me a strong decision package and then work on another authorized diagnostic task if useful.
PERMANENT PRINCIPLES
Preserve:
- simulation authority;
- finite physical actuator strength;
- causal contact;
- no hidden forces;
- no world-space rescue;
- deterministic/auditable behavior;
- left/right symmetry in the controller;
- physical failure when requests exceed capability;
- all historical V1/V2 evidence;
- the flat-plane turf fix;
- the Investigation B reproducer and Jolt issue evidence;
- permanent energy/contact/teleport diagnostics.
Do not optimize for passing gates. Gates are there to expose defects.
If a criterion itself is wrong, demonstrate that independently before revising it and preserve the old version/result.
UNATTENDED WORK POLICY
You have permission to run long sweeps, large perturbation sets, held-out tests, morphology grids, timestep studies, profiling and source-level investigations.
When you think you have solved something:
try to break it.
Use held-out cases.
Use tiny perturbations.
Mirror it.
Test other body variants.
Test near boundaries.
Test rates.
Test saved pathological states.
Prefer falsification over accumulating more examples that agree with your hypothesis.
Do not stop just because one candidate passes one suite.
WHEN I RETURN
Give me one consolidated report containing:
1. final foot-region implementation;
2. final quaternion-normalization scope and why;
3. final IK implementation;
4. J2a result;
5. measured J2b floor;
6. final J2b criteria and evidence, if legitimately resolved;
7. G0 result;
8. G1 result;
9. G2 result;
10. G3 result;
11. every changed physical outcome and explanation;
12. near-reach / joint-limit IK findings;
13. whether IK is genuinely ready for G4;
14. performance breakdown;
15. ankle candidates and results, if prerequisites allowed the study;
16. 180 Hz investigation result;
17. recommended ankle decision, if reached;
18. remaining technical debt;
19. all local commits;
20. review URLs/artifacts;
21. the single biggest remaining blocker before G4.
Clearly distinguish:
- adopted;
- diagnostic only;
- rejected;
- unresolved.
Commit coherent checkpoints locally as you work. Nothing pushed.
Do not start G4 even if everything passes. Stop at the final pre-G4 decision point.
