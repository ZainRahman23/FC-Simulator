# User instruction, 2026-10-03: V2-G2 accepted; proceed to V2-G3 — deliberate weight transfer

Verbatim (the user's message, as pasted):

---

TOUCHLINE PHYSICAL CHARACTER V2 — G3 DELIBERATE WEIGHT TRANSFER
V2-G0, G1 and G2 are accepted.
Proceed to V2-G3: deliberate weight transfer.
G3 asks one specific question:
Can the V2 humanoid deliberately and physically transfer its body weight between its feet, including reaching controlled near-single-support and unloading the opposite foot, while remaining balanced and without taking a step?

This is the bridge between standing and stepping.
Do not implement G4.
Do not take a step.
Do not build walking.
0. PRESERVE THE APPROVED FOUNDATION
Treat the accepted G0/G1/G2 state as the baseline.
Preserve:
- approved V2 anatomy;
- 31-bone semantic/render skeleton;
- physical topology;
- approved anthropometry;
- 10-piece rigid physical boot;
- passive tissue/end-stop architecture;
- validated G1 physics configuration;
- G1 foot/ankle probe and torque/work instrumentation;
- G2 finite actuator architecture;
- G2 human-matched ankle strategy;
- G2 measured usable CoP region;
- G2 standing controller where still applicable;
- deterministic/snapshot infrastructure;
- all G0/G1/G2 reports and technical debt.
G0/G1/G2 must remain regression gates.
If G3 exposes a genuine earlier-gate defect, demonstrate it causally.
Do not modify the plant merely to make G3 easier.
1. HARD PHYSICAL-AUTHORITY RULES
All previous authority rules remain.
The only permitted way to move the body is:
finite internal joint actuation → physical body dynamics → physical ground contacts.
Prohibited:
- pelvis/root position writes;
- pelvis/root velocity writes;
- hidden lateral forces;
- hidden vertical support;
- artificial weight redistribution;
- directly assigning per-foot load;
- foot pinning;
- changing friction dynamically to achieve transfer;
- teleporting/repositioning a foot;
- animation/root-motion authority;
- moving the ground;
- manipulating gravity;
- infinite motors.
The controller may request a load/COM/CoP objective.
Physics decides whether the body can realize it.
2. G3 IS NOT A STEP
This distinction is fundamental.
During G3:
- both feet begin at fixed world locations;
- the controller may not deliberately translate either foot;
- weight may transfer from one foot to the other;
- heel/toe unloading may occur naturally;
- one foot may become almost or fully unloaded if physically achieved;
- the unloaded foot may eventually lose turf contact naturally;
- but there must be no swing target, foothold target, or deliberate relocation of that foot.
If the unloaded foot moves because the body physically drags/slips it, measure that and classify it.
Do not call that successful stepping.
G4 will own deliberate foot relocation.
3. CHARACTERIZE THE EXISTING G2 PLANT FIRST
Before designing new control, measure how the accepted G2 body responds to deliberate quasi-static lateral balance requests.
Characterize:
- total COM;
- extrapolated COM;
- whole-body COM velocity;
- per-foot vertical load;
- per-foot horizontal force;
- per-foot CoP;
- combined CoP;
- support geometry;
- foot-piece contacts;
- ankle torque;
- hip torque;
- knee torque;
- trunk torque;
- foot pitch/roll;
- foot slip;
- whole-body angular momentum.
Determine the actual mechanically reachable bilateral load distribution before adding another control layer.
4. DEFINE LOAD TRANSFER PHYSICALLY
Do not define success merely as pelvis displacement.
Track normalized vertical support:
load_L = Fz_L / (Fz_L + Fz_R)
load_R = Fz_R / (Fz_L + Fz_R)

where valid contact forces are available.
A nominal 50/50 stance should be near:
load_L ≈ 0.5
load_R ≈ 0.5

A deliberate right-leg transfer should progress physically toward something such as:
load_R → 0.8 → 0.9 → 0.95+
load_L → 0.2 → 0.1 → 0.05-

Do not adopt these example numbers blindly as pass criteria.
Measure the plant and use human/biomechanical evidence where appropriate before preregistering the final G3 thresholds.
Distinguish:
- partial load transfer;
- strong load transfer;
- near-single-support;
- genuinely unloaded foot;
- physical loss of contact.
5. COM AND CoP MECHANISM
Establish the causal mechanism by which load transfer occurs.
I expect a relationship broadly like:
desired support shift
→ CoP / joint-torque strategy
→ COM acceleration
→ COM moves toward stance leg
→ opposite foot unloads
but do not force this interpretation if the measurements show something different.
Instrument it.
I want to be able to distinguish:
real weight transfer
from
merely changing force distribution briefly while the COM remains dynamically committed elsewhere.
6. QUASI-STATIC TRANSFER FIRST
Start slowly.
Build a smooth deterministic request:
bilateral stance
     ↓
gradual transfer right
     ↓
hold
     ↓
return to bilateral
     ↓
gradual transfer left
     ↓
hold
     ↓
return

Use a sufficiently slow ramp that we can first understand the equilibrium mechanics.
No abrupt lateral launch.
Measure whether:
- COM moves appropriately;
- CoP moves smoothly;
- support load transfers smoothly;
- feet remain planted;
- unloaded-side contact reduces naturally;
- actuator demands remain plausible;
- the controller returns cleanly to bilateral stance.
7. DO NOT HARD-CODE LEFT/RIGHT ASYMMETRY
G2 already found and fixed a left/right asymmetry bug.
G3 must be explicitly mirror-tested.
The same controller architecture and body-scaled parameters must handle:
- left → right;
- right → left.
Mirror-equivalent tests should produce equivalent results within preregistered numerical tolerance.
Do not add separate magic gains for each side.
8. CONTROL ARCHITECTURE
Extend G2 minimally.
Do not immediately build a whole-body optimizer.
Determine experimentally what additional mechanism is actually necessary.
Candidates may include:
- bilateral ankle/CoP coordination;
- stance-leg ankle strategy;
- controlled pelvis/hip posture through joint torques, not pelvis writes;
- modest hip ab/adduction strategy;
- knee compliance;
- trunk counterbalance.
Add a mechanism only when the preceding simpler system demonstrably cannot achieve the required physical transfer.
For each adopted mechanism record:
What measured deficiency required this?

9. HIP STRATEGY MAY NOW BECOME LEGITIMATELY NECESSARY
G2 found that hip/trunk strategy did not improve quiet-standing recovery enough to justify adoption.
G3 is different.
Deliberately moving the COM over one leg may require hip ab/adduction and pelvis/trunk coordination.
If so, implement it using finite joint torques.
Measure:
- hip ab/adduction angle;
- hip torque;
- pelvis roll;
- trunk lean;
- COM displacement;
- angular momentum.
Do not add hip strategy merely because humans visibly use it.
Let measured need earn it.
10. KNEE STRATEGY
Investigate whether modest stance-leg knee flexion improves mechanically useful load acceptance.
Do not deliberately crouch merely to make balance easier.
Quantify:
- knee angle;
- knee torque;
- actuator fraction;
- COM height;
- load transfer;
- stability.
TD-10 from G2 remains open: do not overclaim the ankle-strength/knee-bend relationship from one datapoint.
11. ARMS
Begin with the accepted G2 arm behavior.
Do not use aggressive arm motion to manufacture successful transfer.
If arms are investigated, compare them diagnostically and quantify their contribution.
G3 should ideally succeed without large arm excursions.
12. SUPPORT GEOMETRY
During bilateral contact, compute the physically valid support region from actual contacting boot pieces.
As one foot unloads or loses contact, the support region must change accordingly.
Do not continue treating an unloaded/non-contacting foot as part of the support polygon.
Visualize:
- each foot's usable support area;
- active contact pieces;
- combined support region;
- combined CoP;
- COM projection;
- extrapolated COM where useful.
This transition from two-foot to one-foot support geometry is a core G3 measurement.
13. FOOT UNLOADING
Explicitly characterize the unloaded foot.
Track:
- vertical force;
- number of active boot-piece contacts;
- heel/toe contact;
- foot pitch/roll;
- slip;
- vertical position;
- ankle torque;
- any constraint force transmitted through the leg.
Determine whether the controller can reach a state where the opposite foot carries negligible load while the body remains controlled.
If the foot naturally leaves the ground, record exactly why.
Do not actively lift it yet unless a later G3 diagnostic explicitly tests that distinction.
14. SINGLE-SUPPORT HOLD — DIAGNOSTIC, NOT YET A STEP
If near-complete unloading succeeds, investigate whether V2 can briefly maintain support predominantly or entirely on one leg without relocating the other foot.
Start with short durations.
Measure:
- stance-foot CoP;
- COM relative to stance-foot support;
- ankle/hip/knee torque;
- actuator saturation;
- trunk/arm contribution;
- foot slip;
- stance-leg joint excursion.
Do not demand long-duration one-leg balancing if human evidence or the physical plant doesn't justify it.
The purpose is to establish whether the body can create the support state required immediately before a step.
15. RETURN TRANSFER
G3 must prove reversibility.
Test:
50/50
→ strong right support
→ 50/50
→ strong left support
→ 50/50

The controller must not accumulate:
- pelvis drift;
- foot slip;
- yaw;
- joint bias;
- residual angular momentum;
- systematic left/right error.
Repeated cycles should remain bounded.
16. TRANSFER SPEED ENVELOPE
Once slow transfer works, vary requested transfer duration.
Establish:
- comfortable/robust transfer speed;
- faster but successful transfer;
- boundary where no-step transfer becomes unstable.
Do not simply maximize speed.
This will later inform how quickly G4 can prepare a stance leg before swing initiation.
17. EXTERNAL PERTURBATIONS DURING TRANSFER
After nominal transfer works, apply small controlled disturbances:
- toward stance leg;
- away from stance leg;
- forward/backward;
- small diagonal disturbances.
Determine whether the body can continue or safely abort the transfer.
A useful controller should be able to choose:
continue transfer
or
return toward bilateral support
based on physical state.
Do not step to rescue it.
18. BODY VARIANTS
Run the required transfer tests on at least:
- V2-REF;
- shortest/lighter normal population body;
- tallest/heavier normal population body;
- long-leg morphology variant;
- short-leg morphology variant.
Prefer gains derived from:
- mass;
- height;
- inertia;
- segment geometry;
- actuator capability;
rather than per-body tuning.
If a morphology variant genuinely has a different physical envelope, report it rather than forcing identical performance.
19. ENERGY / ACTUATOR AUDIT
Extend the G2 ledger.
During transfer account for:
- ankle motor work;
- hip motor work;
- knee motor work;
- trunk motor work;
- arm work if used;
- passive tissue work;
- contact work;
- gravitational potential change.
Report typical and peak actuator utilization.
No hidden energy source.
No actuator may exceed its instantaneous capability.
20. CONTACT / FOOT AUDIT
Preserve the G1/G2 permanent foot probe.
Specifically investigate whether the 10-piece boot produces any discontinuity as:
- CoP moves laterally across the sole;
- load transfers toward medial/lateral regions;
- the opposite foot unloads;
- support becomes predominantly one-foot.
Track seam crossings.
We already validated ordinary G1 contact; G3 now validates actively controlled lateral loading.
21. FAILURE CLASSIFICATION
For failed transfers classify the first causal failure.
Examples:
- combined CoP reaches support boundary;
- stance-foot CoP reaches its boundary;
- COM/extrapolated COM becomes unrecoverable;
- ankle inversion/eversion capacity saturates;
- hip ab/adduction saturates;
- stance knee collapses;
- stance foot rolls;
- stance foot slips;
- unloaded foot unintentionally drags;
- controller oscillation;
- joint ROM exhaustion.
Do not merely label failures "fell."
22. HUMAN-PLAUSIBILITY CHECK
Use credible human balance/weight-shift evidence where available.
Compare broadly:
- stance width;
- lateral COM displacement;
- pelvis/trunk lean;
- load-transfer timescale;
- per-foot load distribution;
- stance-leg joint angles;
- CoP movement.
Do not overfit to one paper.
The goal is a plausible footballer's preparatory weight shift, not clinical replication.
23. PREREGISTER G3 CRITERIA
Before the final validation run, write and commit the G3 pass/fail criteria.
Do not change them after seeing the final results except through the same explicit contradiction/measurement process used in earlier gates.
Criteria should include at minimum:
- quiet bilateral starting stability;
- successful deliberate left and right transfer;
- minimum measured stance-foot load fraction;
- maximum unloaded-foot load fraction;
- controlled hold duration;
- return to bilateral stance;
- bounded foot slip;
- bounded yaw/drift;
- no stepping;
- no hidden forces;
- no actuator-capacity violation;
- left/right symmetry;
- repeated-cycle stability;
- body-variant robustness;
- deterministic replay.
Also preregister how you distinguish:
partial transfer
near-single-support
full unloading/contact loss.
Do not require full contact loss unless evidence shows it is necessary for this gate.
24. PROPOSED TEST MATRIX
Include at least:
T0 — bilateral baseline
Quiet stance before transfer.
T1 — slow 50→right→50
T2 — slow 50→left→50
T3 — right→50→left→50 cycle
T4 — repeated alternating cycles
T5 — near-single-support right
T6 — near-single-support left
T7 — transfer-speed sweep
T8 — small disturbance during transfer
T9 — body variants
T10 — symmetry/mirror tests
T11 — deliberately excessive request
The excessive request should fail physically rather than trigger a hidden rescue.
25. DETERMINISM / REGRESSIONS
Preserve:
- deterministic replay;
- snapshot/restore;
- browser/Node comparison where supported;
- G0;
- G1;
- G2.
Any plant change requires the affected earlier gates to rerun.
Do not casually regenerate accepted baselines.
26. PERFORMANCE
Measure incremental cost of G3 separately:
- state estimation;
- load/CoP estimation;
- controller;
- actuator calculation;
- instrumentation.
Keep existing physics/150-iteration technical debt visible.
G3 is not the place to hide or optimize that debt.
27. REVIEW PAGE
Build a G3 viewer/review mode.
I want to see:
- actual per-foot load percentage;
- requested load transfer;
- total COM;
- COM projection;
- extrapolated COM;
- per-foot CoP;
- combined CoP;
- actual active support geometry;
- boot-piece contacts;
- ground-reaction vectors;
- ankle/hip/knee torques;
- actuator utilization;
- foot slip;
- pelvis roll;
- trunk lean;
- whole-body angular momentum.
Make it visually obvious when the body transitions from:
bilateral support
→ strongly asymmetric support
→ near-single-support.
Include playback, pause, slow motion, frame step and useful cameras.
28. IMPORTANT: DO NOT PREEMPT G4
G3 ends when the body has demonstrated that it can deliberately create and control the support state from which a step could begin.
Do not swing the unloaded leg forward.
Do not generate a foothold.
Do not move a foot toward a target.
Do not implement touchdown.
Do not implement double-support transition planning.
Those belong to G4/G5.
Even if the next step seems obvious, stop.
29. DEFECT POLICY
You may fix demonstrated implementation bugs.
If G3 appears to require changing:
- approved anatomy;
- foot geometry/contact architecture;
- passive tissue;
- actuator capability;
- G1 physics configuration;
- foundational physical-authority rules;
stop for my decision.
If a new controller mechanism has materially different viable architectures with no clear measured winner, stop with the alternatives rather than choosing by taste.
REQUIRED FINAL REPORT
Return with:
1. G3 pass/fail;
2. controller architecture and every mechanism actually adopted;
3. mechanisms tested but rejected;
4. measured bilateral baseline;
5. left/right transfer results;
6. maximum controlled load transfer;
7. near-single-support results;
8. support geometry / CoP behavior;
9. COM trajectory;
10. transfer-speed envelope;
11. perturbation-during-transfer results;
12. actuator/energy audit;
13. foot/contact audit;
14. body-variant results;
15. symmetry;
16. repeated-cycle drift;
17. failure classifications;
18. determinism/regressions;
19. performance;
20. technical debt/open questions;
21. local commit(s);
22. review URL and curated scenes.
If G3 passes, explicitly answer:
Has V2 demonstrated a physically controlled pre-step support state sufficient to justify beginning G4 single-step development?

Then STOP FOR MY REVIEW.
Do not start G4.
Nothing pushed.
