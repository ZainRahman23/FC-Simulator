<!-- preserved verbatim from Claude session d4761610-c35f-4019-9308-cb83973e7b76, transcript line 14730. -->

OVERNIGHT RUNWAY — COMPLETE THE WALKING FOUNDATION
I am going to be away for roughly 8+ hours. You have a long autonomous runway.
Your objective is to take the current physical-character locomotion work as far as is scientifically and architecturally safe, with the goal of completing the robust walking foundation rather than stopping after the first incremental improvement.
You may investigate, implement, test, revert, re-identify models, build diagnostics, consult primary literature where genuinely useful, and make local checkpoint commits.
Do not push anything.
Preserve all approved gates and historical evidence.
Do not manufacture success. If evidence invalidates an assumption, follow the evidence.
CURRENT EVIDENCE / STARTING POINT
Treat the current repository, handoff, reports and measurements as authoritative.
Important current findings include:
- the unified locomotion hierarchy is substantially better than the old Controller A;
- one deterministic start has completed all 40 requested walking steps at approximately 0.45 ± 0.02 m/s at step starts;
- the other starts still fail much earlier;
- speed creep has been substantially understood and reduced;
- ground-reaction regulation and foothold placement now serve a common requested-speed objective;
- the historical Controller-A equilibrium was targeting approximately the wrong speed for the requested gait;
- the 50 ms latency problem was corrected through state prediction rather than by removing latency;
- landing error improved approximately +6.7 cm → +1.0 cm;
- swing success improved approximately 63% → 87%;
- baseline failures are largely requests that are already physically difficult/impossible by the time the swing must execute;
- corrections need to occur later than the old model assumed;
- the inherited swing executor cannot execute large late corrections reliably;
- late shortening and late lengthening are physically asymmetric;
- the hip can saturate badly when the inherited trajectory asks it to catch up;
- pelvis height and pelvis yaw have been tested as explanations for this particular failure and are not the missing state;
- F0 remains the default foot;
- F2h remains an opt-in articulated-foot experiment;
- yaw/angular momentum remains unresolved;
- stopping has not yet been implemented, so falling after the end of a finite walking test is not itself a walking-stability failure.
Verify these against the current repository/report rather than blindly trusting this summary.
PHASE 1 — REPLACE THE SWING EXECUTOR
Proceed with the generic swing-executor redesign.
This is approved.
The executor must be:
- physical-state driven;
- generic;
- foot-agnostic;
- replannable;
- torque/capability aware;
- continuous;
- compatible with realistic sensing/planning latency;
- subordinate to actual physics.
Conceptually:
actual physical swing state
- planned world-space foothold
- touchdown time/window
- body/leg/foot geometry
- finite physical capability
→ feasible motor/joint targets
- remaining reachable set
- explicit infeasibility when necessary
Never directly move the foot/root/pelvis.
Initial and mid-swing planning
Every trajectory must begin from the foot's actual position, orientation and velocity.
Mid-swing replanning must do the same.
Do not restart a nominal trajectory from an imagined state.
Preserve continuity of position and velocity and avoid artificial acceleration discontinuities.
Capability-aware trajectory generation
Do not generate an arbitrary geometric foot path and then ask finite motors to chase it.
Account for:
- remaining swing time;
- leg reach;
- current joint state;
- current foot velocity;
- joint torque/velocity capability;
- ground clearance;
- actual foot geometry;
- desired touchdown state.
Do not increase motor strength merely to make the trajectory executable.
Arrival-gated descent
Investigate and implement the proposed arrival-gated descent if supported.
The foot should not blindly descend according to an obsolete clock when a legitimate foothold correction means horizontal arrival has not occurred.
But touchdown timing remains meaningful.
Do not create hovering.
If horizontal arrival and touchdown timing cannot both be satisfied, expose infeasibility to the planner.
Reachability
Characterize the actual reachable foothold/timing region throughout swing.
Do not assume symmetry.
In particular, preserve the measured fact if it remains true that late lengthening is substantially easier than late shortening.
Feed the reachable set back to the planner so it stops requesting actions the executor cannot perform.
PHASE 2 — ISOLATED SWING VALIDATION
Before trusting long walks, build deterministic isolated tests from matched physical states.
Include:
- unchanged foothold;
- ±2 cm correction;
- ±4 cm;
- ±6 cm;
- ±8 cm where physically meaningful;
- corrections at several swing phases;
- different incoming foot velocities;
- different trailing-leg extensions;
- different body velocities;
- reasonable touchdown-time changes.
Measure:
- requested versus achieved foothold;
- touchdown time;
- touchdown position;
- touchdown horizontal/vertical velocity;
- minimum turf clearance;
- joint torque;
- saturation;
- trajectory continuity;
- resulting stance disturbance;
- planner-predicted reachability versus actual success.
The reachability estimator should be conservative but useful.
Check false-positive and false-negative feasibility predictions.
Fix general errors before proceeding.
PHASE 3 — RE-IDENTIFY AFTER THE EXECUTOR CHANGES
The existing step-response models were measured under the old executor.
Do not force the new executor to reproduce them.
Once the new executor is mechanically credible:
re-identify the plant/step-to-step response under the new executor.
Use controlled perturbations and preserve failed/infeasible samples as information.
Do not fit only successful closed-loop trajectories.
Keep planning error, execution error, contact error and continuation viability conceptually separate.
Avoid learning Controller behavior and calling it plant dynamics.
Then refit/update the unified locomotion controller from the new evidence.
PHASE 4 — ROBUST STEADY WALKING
Return to straight walking.
Start around the currently demonstrated 0.45–0.50 m/s region.
The objective is no longer:
one start can walk.

It is:
the physical controller has a genuine stable walking basin across reasonable initial-state variation.

Use all existing deterministic starts and add carefully justified perturbation starts if useful.
Do not tune per seed/start.
A lucky 40-step run is not sufficient.
Measure:
- requested vs actual velocity;
- long-term speed drift;
- step length;
- cadence;
- single/double support;
- foothold request/achievement;
- reachability;
- swing clearance;
- touchdown velocity;
- stance slip;
- COM behavior;
- pressure point / ground reaction;
- horizontal impulse;
- motor saturation;
- joint-limit margins;
- fall/failure classification;
- yaw/angular momentum.
Prefer longer tests once short tests become reliable.
If a walk survives its entire requested duration and only falls because no stopping command exists, classify that separately.
PHASE 5 — ESTABLISH A SMALL SPEED ENVELOPE
If steady walking becomes robust around 0.45–0.50 m/s, do not stop immediately.
Determine whether this is a genuine controller or one tuned operating point.
Gradually test nearby requested speeds on both sides.
Expand outward cautiously.
The objective is to identify:
- stable speed range;
- marginal range;
- physically unreachable/unstable range;
- why each boundary exists.
Do not force 0.6 m/s or any other historical target merely because we previously used it.
Equally, do not permanently settle for slow walking simply because it is easier.
Let the physical evidence define the current envelope.
If a boundary comes from a specific architectural/body limitation, document it.
PHASE 6 — STARTING AND STOPPING
Only if steady walking is genuinely robust, you may proceed into the relevant G2c work needed for:
- standing → walking;
- requested acceleration into the established walking envelope;
- walking → standing;
- controlled deceleration.
This authorization is limited to walking start/stop.
Do not begin jogging or running.
Start/stop must use the same causal architecture:
requested velocity
→ physical stance regulation
→ foothold/timing planning
→ feasible swing
→ physical contact.
No hidden braking or propulsion.
A stop should emerge from physically appropriate braking impulses, step placement and support transitions.
PHASE 7 — YAW / ANGULAR MOMENTUM
Once sustained straight walking exists, revisit the known yaw problem.
Do not ignore it simply because the character remains upright.
We previously measured excessive pelvis/whole-body twisting.
Diagnose the source under the new mature walker, because earlier measurements may have been contaminated by unstable stepping.
Decompose angular momentum by body/segment and phase.
Examine:
- legs;
- pelvis;
- trunk;
- arms;
- single support;
- double support;
- foot-ground rotational interaction.
Determine whether excessive yaw comes from:
- foot placement;
- stance torque;
- double-support coupling;
- leg swing;
- insufficient trunk counter-rotation;
- insufficient/incorrect arm counter-swing;
- contact/friction abstraction;
- or another measured mechanism.
Use human literature carefully and ensure normalization/statistics are comparable before claiming a human bound.
You may implement physically justified angular-momentum regulation through finite joint torques and normal body motion if the evidence supports it.
You may improve arm/trunk counter-swing if it follows from the locomotion mechanism.
You may not:
- pin heading;
- apply root yaw correction;
- add invisible external torque;
- force pelvis orientation.
If realistic yaw requires a fundamentally new turf/stud rotational-traction model, stop and report that architectural decision rather than inventing it overnight.
PHASE 8 — HUMAN-LIKENESS OF THE WALK
Once the walker is physically stable, inspect the visible motion.
Earlier versions looked march-like:
- long double support;
- limited heel rise;
- stiff trunk;
- unnatural arms;
- robotic swing.
Do not sacrifice physical stability to chase appearance.
But distinguish:
physical locomotion defects
from
low-priority reference/style defects.
The existing authored locomotion reference may supply low-priority human-like preferences where appropriate, but must never move the root or override contact truth.
Investigate improvements such as:
- cadence;
- knee flexion;
- pelvis motion;
- trunk counter-motion;
- arm swing;
- heel/foot behavior;
- support timing.
Style must yield before balance/support in the arbiter.
Do not build animation cheats into the physics controller.
PHASE 9 — REVISIT F2h ONLY AFTER F0 IS ROBUST
If F0 becomes a robust walker under the new generic executor/controller, rerun the preserved F2h articulated-foot experiment.
Do not give F2h special controller tuning initially.
Use the same locomotion architecture.
The question is:
Does articulated forefoot mechanics expand useful physical capability once the controller is no longer biased around F0?

Compare at matched operating states:
- walking stability;
- speed envelope;
- step-length envelope;
- heel rise;
- rollover;
- push-off mechanics;
- clearance;
- ankle torque;
- saturation;
- energy/work;
- yaw;
- CPU.
If practical, add the previously suggested F2-locked control:
same F2h geometry/masses/colliders, but toe articulation locked.
That isolates geometry from articulation.
Do not promote F2h overnight.
Preserve the evidence and make a recommendation for my review.
PHASE 10 — ROBUSTNESS / REGRESSION
Before declaring the overnight work successful:
rerun all relevant approved regression suites.
Preserve deterministic behavior.
Check browser vs Node where the existing workflow supports it.
Ensure no supposedly unrelated approved gate changed.
Check performance.
Check for:
- NaNs;
- joint-limit violations;
- energy explosions;
- hidden forces;
- unexpected state writes;
- contact penetration regressions;
- excessive motor saturation.
Keep experimental changes opt-in until they earn promotion.
FAILURE CLASSIFICATION
Throughout the work, every locomotion failure should be assigned to the most specific supported category:
- planning infeasible;
- reachability estimate wrong;
- swing execution failure;
- premature/unexpected contact;
- touchdown execution failure;
- support/weight-transfer failure;
- post-touchdown stability failure;
- speed-regulation instability;
- yaw/angular-momentum instability;
- deliberate end-of-test with no stop controller;
- unknown.
Do not call everything “fell.”
Use the classification to decide what to investigate next.
HARD ARCHITECTURAL RULES
These remain absolute:
- simulation/physics decides what happens;
- Jolt/contact truth is authoritative;
- finite motors;
- no root propulsion;
- no root position/velocity writes;
- no pelvis pinning/support;
- no foot teleportation;
- no hidden stabilizing force;
- no invisible braking;
- no outcome switches;
- no per-test/per-seed hacks;
- no increasing strength merely to pass;
- no animation/reference motion overriding physics;
- no deleting inconvenient failed samples from the evidence;
- deterministic/auditable randomness/state.
Any human reference motion is a preference/target source only.
AUTONOMY
You have permission to make general, evidence-backed fixes without asking me after every discovery.
You may:
- add diagnostics;
- add tests;
- add experimental controller variants;
- refactor the new locomotion code where necessary;
- re-identify models;
- consult primary literature;
- revert failed experiments;
- optimize obvious pathological costs after correctness;
- create local checkpoint commits.
You may not:
- push;
- modify the football simulation;
- start Reference Tackle work;
- begin jogging/running/sprinting;
- permanently promote F2h;
- fundamentally change the body architecture without stopping for my decision;
- add a new traction/stud model without stopping for my decision.
DO NOT WASTE THE RUNWAY
If an experiment fails, diagnose why and continue to the next evidence-backed hypothesis when safe.
Do not spend hours blindly tuning large parameter grids.
Prefer:
measure → hypothesize → discriminating experiment → general fix → regression → continue.
Keep an overnight log of:
question → experiment → measurement → conclusion → adopted/reverted.
If a result invalidates an earlier conclusion, explicitly correct the record.
CHECKPOINTS
Make local commits at meaningful safe points so the overnight work is recoverable.
Preserve reports/data necessary to understand decisions, but avoid committing enormous regenerable raw datasets unless existing project policy requires it.
Nothing gets pushed.
WHEN TO STOP
Do not stop merely because:
- the new swing executor works;
- one 40-step walk works;
- one speed works;
- one visual improvement works.
Continue through the authorized phases while each preceding phase has genuinely earned the next.
Stop immediately and leave a clear decision report if:
- a body/anatomy change appears necessary;
- a new rotational turf/stud model appears necessary;
- the solution would require violating the architectural rules;
- an approved historical gate would need to be intentionally changed;
- evidence presents two materially different architectural paths with no clear technical basis for choosing;
- you discover corruption/data loss or cannot preserve deterministic evidence.
Otherwise use the runway.
MORNING DELIVERABLE
When you finish, give me a concise top-level summary first:
1. How far did you get?
2. Can the character now walk robustly?
3. What speed range is actually stable?
4. Can it start and stop?
5. Is yaw materially improved?
6. What does it look like?
7. What happened with F2h, if reached?
8. What remains before jogging/running?
Then provide the evidence:
- old vs new swing executor;
- six-start and extended-walk results;
- speed-envelope results;
- start/stop results if reached;
- yaw/angular-momentum measurements if reached;
- human-likeness observations;
- F0/F2h/F2-locked comparison if reached;
- regression/determinism/performance;
- failures/dead ends;
- exact commits/artifacts;
- anything awaiting my visual judgment.
Leave a review harness running if useful, with the smallest set of cases I should inspect first.
Update the handoff/memory so another session can resume accurately.
Do not push.
Use the full runway, but prioritize correctness and causal understanding over the number of features completed.
