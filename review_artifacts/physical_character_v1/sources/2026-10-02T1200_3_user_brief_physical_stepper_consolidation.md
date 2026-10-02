<!-- preserved verbatim from Claude session d4761610-c35f-4019-9308-cb83973e7b76, transcript line 16697, pasted block 3 of 4; the user's own note: "read the 3rd text first as it is the prompt" -->

MAJOR ARCHITECTURE CONSOLIDATION — PHYSICAL STEPPER / CONTINUATION-AWARE LOCOMOTION
I have completed several independent Astra investigations while you were working.
I am attaching/providing those reports with this instruction.
Read them completely before modifying code.
They cover:
1. the remaining walking failure and stance-vs-planning question;
2. Furkan Sarıhan's Stepper/Rabona architecture and its implications for Touchline;
3. the final Unity Humanoid/render-skeleton compatibility audit;
4. earlier foot/toe research where relevant.
Your recent experiments were valuable, particularly the oracle work, but I do not want another local iteration around swing curves, CoP timing, push-off gains, or response-map fitting before consolidating what the evidence now says.
This is a deliberate architecture checkpoint.
PART 0 — FIRST RECONCILE THE EVIDENCE
Before implementation, produce a concise internal decision record covering:
KEEP
REPLACE
DEFER
EXPERIMENTAL
for the current locomotion components.
Reconcile your own measured evidence with the attached Astra reports.
If an Astra recommendation conflicts with actual current repository measurements, the measured repository evidence wins, but document the conflict.
Do not blindly implement the reports.
Do not preserve an old Claude conclusion merely because you previously wrote it.
The objective is one coherent architecture.
PART 1 — FREEZE WHAT HAS EARNED PRESERVATION
Unless current measurements contradict this after audit:
Keep F0
F0 remains the authoritative/default physical foot.
F2h remains an opt-in research morphology.
Do not restart physical-toe work.
Keep the corrected existing swing executor
The replacement swing executor did not outperform it.
Preserve the corrected existing executor and its measured phase-dependent correction response.
Do not rewrite swing again unless new evidence demonstrates an execution bottleneck.
Keep finite physical execution
Jolt bodies, contacts and finite motors remain authoritative.
No:
- root propulsion;
- root velocity writes;
- pelvis pinning;
- foot teleportation;
- hidden upright force;
- hidden braking;
- guaranteed footsteps;
- guaranteed ball contacts;
- outcome scripting.
Keep realistic latency/prediction distinction
Do not remove sensing/planning latency merely to improve control.
Predict delayed physical state where justified.
Keep the oracle
Preserve one-step and two-step Jolt oracles as offline diagnostic/reference tools.
They are not production controllers.
PART 2 — CORRECT THE WALKING OBJECTIVE
Do not regulate instantaneous forward COM velocity to a constant value.
Human walking naturally contains within-stride velocity oscillation.
What matters is:
- repeatable gait-cycle state;
- stride-average/requested speed;
- bounded phase-matched velocity;
- balanced stride-level horizontal impulse;
- recoverable support geometry;
- continued ability to execute future contacts.
Explicitly distinguish:
normal within-step acceleration/deceleration
from
persistent stride-to-stride speed creep.
Instrument net horizontal impulse between equivalent contact-defined events.
Do not label single-support acceleration itself a defect.
PART 3 — EXPLAIN THE ORACLE ADVANTAGE BEFORE REPLACING THE PLANT
The most important current evidence is approximately:
- ordinary controller: ~6–11 legitimate steps;
- perfect one-step selection: ~13–19;
- two-step lookahead: ~26–28+;
- two-step oracle discovered roughly ~0.40 m steps around ~0.52 m/s.
Reproduce these results from current HEAD.
Verify:
- identical/restorable starting states;
- complete controller memory restoration;
- identical action constraints;
- deterministic branching;
- no hidden state leakage;
- consistent objective scaling.
Then compare ordinary, one-step oracle and two-step oracle using exactly the same physical instrumentation.
Measure:
- actual step length;
- step width;
- touchdown timing;
- COM state;
- stride-average speed;
- phase-matched velocity;
- horizontal impulse by leg and phase;
- CoP where valid;
- heel/forefoot load;
- foot orientation;
- leg extension;
- swing readiness;
- joint saturation;
- angular momentum;
- next-step reachable margin.
Answer:
What state does the two-step oracle preserve that the ordinary controller consumes?

Do not continue until you can give a defensible answer.
PART 4 — SEPARATE "BETTER NOMINAL GAIT" FROM "TWO-STEP FORESIGHT"
The oracle may be winning partly because it discovered a much better nominal operating pattern than the current ~0.26 m march.
Run a matched comparison:
A. Current controller/current nominal gait
B. One-step selection around current nominal gait
C. Two-step selection around current nominal gait
D. Simple feedback around the oracle-discovered nominal region
E. One-step selection around that improved nominal region
F. One-step selection + continuation/terminal cost
G. Two-step selection around that improved nominal region
Keep action bounds and evaluation contracts comparable.
Determine whether the large benefit comes primarily from:
- better nominal cadence/step geometry;
- genuine second-step reasoning;
- a continuation cost;
- or a combination.
This experiment should influence the production architecture.
PART 5 — INTRODUCE THE PHYSICAL STEPPER ABSTRACTION
Build a new opt-in locomotion/planning layer.
Working name:
Physical Stepper
This is inspired conceptually by Furkan Sarıhan's Stepper abstraction, not a copy of an unrecovered implementation.
The purpose is to make future limb/contact intentions explicit.
Do not bury footsteps inside swing execution.
Do not make animation clips authoritative.
Conceptually:
requested locomotion
↓
nominal step/contact proposals
↓
continuation-aware feasibility/planning
↓
committed contact-event references
↓
finite physical execution
↓
actual Jolt contact
↓
achieved / missed / interrupted / cancelled
↓
replan from actual state
PART 6 — DEFINE A GENERAL CONTACT-EVENT PLAN
Do not make the new interface walking-specific in a way that we immediately throw away for football.
Design the smallest useful contact-event / limb-task representation.
Initially implement only what walking requires, but make the semantics capable of later representing football actions.
A candidate event should be able to express approximately:
- effector/limb;
- event type;
- target region;
- orientation preference/tolerance;
- earliest/latest useful time;
- relative contact velocity where relevant;
- support prerequisites;
- continuation requirement;
- priority;
- fallback behavior;
- commitment/version state.
Initial walking event:
foot → ground support.
Future event types, schema only for now, may include:
- ball touch;
- strike;
- interception;
- release;
- recovery contact.
Do not implement dribbling/kicking yet.
PART 7 — EVENT LIFECYCLE
Formalize:
PROPOSED
→ ACCEPTED
→ EXECUTING
→ one of:
ACHIEVED
MISSED
INTERRUPTED
CANCELLED
A planned touchdown is not achieved because its timer expired.
Only actual qualifying physical contact can establish achievement.
If the foot misses:
- preserve actual physical state;
- classify the miss;
- replan.
Never repair history.
This lifecycle must eventually apply equally to ball contacts.
PART 8 — NOMINAL GAIT GENERATOR
Build a small deterministic nominal proposal generator.
Inputs should initially include:
- requested velocity;
- requested heading;
- measured physical state;
- support state;
and whatever minimal gait state is justified.
Output:
a small number of sensible candidate next support events, not one guaranteed footstep.
Use the oracle-discovered region as evidence when defining candidate coverage, but do not hard-code:
stepLength = 0.40.
Scale appropriately with:
- requested speed;
- actual speed;
- body/leg geometry;
- cadence;
- support state.
The generator's job is:
propose plausible football-human stepping patterns.

It does not decide what physics can execute.
PART 9 — CONTINUATION-AWARE PLANNER
Above the proposal generator, build the smallest production candidate capable of capturing the oracle's important advantage.
Start with a two-contact-transition horizon.
Apply only the first selected action and replan from actual physical state.
Initial action space should remain small:
- forward placement;
- lateral placement;
- foot orientation if evidence says it matters now;
- touchdown timing.
Do not search:
- every joint trajectory;
- toe stiffness;
- arbitrary motor gains;
- animation parameters.
Those belong below the planner.
PART 10 — DO NOT USE FULL JOLT ROLLOUTS IN PRODUCTION
The full-Jolt oracle remains the reference teacher/diagnostic.
The production planner should use a cheap deterministic transition surrogate.
Begin with the smallest model supported by the Astra analysis:
phase/contact-conditioned local transition model
with explicit:
- placement;
- timing;
- physical state;
- realized action;
- continuation feasibility.
Do not begin with a giant global linear map again.
Do not jump directly to ML.
Candidate model progression:
1. local/phase-conditioned regularized models;
2. simple centroidal analytical terms + fitted residual;
3. richer nonlinear approximation only if held-out residual structure proves necessary.
PART 11 — MODEL THE RIGHT STATE
Start richer diagnostically, then ablate.
Candidate state blocks:
COM
- position relative to stable/frozen support reference;
- inertial velocity in intended-heading coordinates;
- height;
- vertical velocity.
Angular
- centroidal angular momentum;
- relevant trunk/pelvis orientation.
Support
- stance-foot orientation;
- contact mode;
- per-foot normal load/load share;
- valid CoP where measurable.
Limb readiness
- swing-foot position/velocity;
- trailing/swing leg extension;
- extension rate;
- relevant joint-limit margins.
Timing
- contact-defined phase;
- time since load acceptance;
- elapsed swing time;
- predicted time to touchdown/release.
Executor memory
- committed target;
- target version;
- requested touchdown time;
- consequential reference/filter state.
Task
- requested speed;
- requested heading.
Determine through held-out prediction tests what can safely be removed.
Do not assume COM + velocity alone is sufficient.
PART 12 — PREDICT REALIZED ACTION, NOT JUST REQUESTED ACTION
We know late foothold corrections have phase-dependent attenuation.
Therefore:
requested foothold
is not necessarily:
actual touchdown.
The planner/model must account for:
- phase-dependent execution gain;
- actual touchdown timing;
- saturation;
- reachability;
- contact mode.
Separate:
request feasibility
from
execution prediction
from
continuation viability.
PART 13 — CONTINUATION FEASIBILITY IS FIRST-CLASS
Do not evaluate a step only by:
- landing accuracy;
- immediate speed error;
- immediate balance.
A landing can look excellent while leaving the opposite leg unable to continue.
The planner should estimate whether the resulting state preserves:
- a usable next support;
- leg readiness;
- acceptable extension;
- sufficient correction margin;
- manageable angular state;
- requested-speed tracking.
Preserve the distinction:
can land there
versus
can continue after landing there.
PART 14 — TERMINAL/CONTINUATION COST EXPERIMENT
Two-step explicit search may not be the final production solution.
Test whether a one-step planner with a learned/measured continuation value/terminal feasibility cost captures most of the oracle benefit.
Compare:
- one-step;
- one-step + continuation terminal cost;
- explicit two-step;
- full-Jolt oracle reference.
If a cheaper representation captures the benefit robustly, prefer it.
Do not make "two steps" a religious architectural requirement.
The required capability is:
understand how the current decision affects future support availability.

PART 15 — STANCE MECHANICS BECOME EVIDENCE-GATED
Do not launch a broad stance rewrite.
Instead compare ordinary-controller and oracle trajectories under identical measurements.
If the oracle walks substantially better while retaining the supposedly abnormal stance trace, that trace is not an absolute blocker.
If a specific stance defect remains under oracle control and measurably reduces feasible margin, test one change at a time.
Candidate examples:
- inappropriate dorsiflexion hold after load acceptance;
- incorrect ankle impedance;
- excessive/mistimed positive motor work;
- poor load transfer;
- push-off regulation.
For every stance change use a matrix:
baseline stance + production planner
changed stance + production planner
baseline stance + oracle
changed stance + oracle
Improvement under both is strong evidence of a real physical bottleneck.
Do not:
- force CoP along a trajectory;
- snap foot-flat;
- use a timer to rotate the foot;
- add a fixed push-off impulse;
- eliminate normal COM oscillation.
PART 16 — ENERGY AND IMPULSE ACCOUNTING
Add trustworthy locomotion accounting.
For equivalent stride events measure:
- total horizontal ground impulse;
- per-leg horizontal impulse;
- COM momentum change;
- motor work;
- whole-body kinetic energy;
- gravitational potential;
- damping/contact losses where measurable;
- numerical residual.
At a steady periodic target gait:
net horizontal stride impulse should not show persistent unexplained positive drift.
Use this to diagnose true speed creep.
Do not infer propulsion/braking from CoP alone.
PART 17 — KEEP FOOTBALL IN THE ARCHITECTURE, BUT DON'T IMPLEMENT IT YET
Furkan's strongest transferable idea is that football actions should modify stepping rather than fight it through unrelated animation clips.
Preserve that now in the interface.
Eventually:
Dribble
A foot receives an intermediate ball-contact task, then still needs a viable subsequent support/contact.
Pass/shot
Plan:
- plant/support preparation;
- strike-foot ball-contact region/orientation/velocity/time;
- follow-through;
- continuation/recovery.
Tackle
Request an interception/contact event with a different allowed continuation outcome.
Recovery
Survival/support tasks can supersede optional football tasks.
Do not implement these football actions in this gate.
But do not design the walking event schema so narrowly that they require a replacement planner later.
PART 18 — PHYSICAL FAILURE REMAINS SACRED
Eventually, if a player plans:
right-foot ball contact at T
and another player hits him before T:
- the foot may miss;
- the event becomes MISSED/INTERRUPTED;
- the ball receives only whatever actual physical interaction occurred;
- the body continues from its real state;
- planner replans.
Never:
- fire a scheduled invisible kick;
- teleport the foot;
- move the ball because the planned contact time arrived;
- cancel the opponent's physical effect to preserve animation.
Build the walking infrastructure with this future rule in mind.
PART 19 — PRODUCTION COMPUTE
Design for eventual 22-player use.
Do not prematurely micro-optimize, but benchmark the planner separately.
Full Jolt branching is offline/reference only.
Candidate production approach:
- small nominal candidate set;
- cheap deterministic surrogate;
- prune;
- evaluate limited continuations;
- fixed iteration/candidate limits;
- deterministic tie-breaking;
- contact-event replanning;
- bounded intermediate replanning;
- warm starts.
Measure worst-case cost when all 22 players request replanning in the same frame.
Average cost alone is insufficient.
PART 20 — WALKING VALIDATION
Once the first Physical Stepper is operational, test on held-out histories, not merely the six development starts.
Progression:
Stage A
reproduce known starts.
Stage B
new physically reached initial histories.
Stage C
nearby requested walking speeds.
Stage D
modest physical perturbations.
Do not tune per seed.
Track:
- legitimate steps;
- actual speed;
- stride-average speed error;
- step length;
- cadence;
- support timing;
- event success/miss;
- requested vs achieved foothold;
- continuation margin;
- false-feasible decisions;
- false-infeasible decisions;
- swing clearance;
- touchdown quality;
- stance slip;
- motor saturation;
- horizontal impulse;
- energy balance;
- angular momentum/yaw;
- compute cost.
100-step survival is useful but not sufficient by itself.
PART 21 — PLANNER QUALITY GATES
Use the Astra recommendations as starting engineering gates, not biological constants.
In particular:
- prediction error must be small relative to actual continuation margin;
- evaluate signed bias and tails, not merely RMSE;
- false-safe feasibility predictions must be extremely rare;
- outside validated coverage, planner confidence/action aggression should reduce;
- physical perturbations must be applied through forces/contact, not velocity writes;
- planner must outperform the strongest information-matched feedback baseline, not a deliberately weak comparator.
If available continuation margin is ~6 cm, an illustrative goal is that critical-direction 95th-percentile prediction error be comfortably below that margin—Astra suggested ~one-third as a starting design criterion.
Do not treat that number as universal.
PART 22 — WALKING VISUAL QUALITY
Once physical robustness improves, evaluate whether the previous short quick march has changed.
Inspect:
- actual step length;
- cadence;
- pelvis motion;
- trunk counter-motion;
- arm swing;
- knee flexion;
- foot orientation;
- heel/forefoot behavior;
- support timing.
Do not cosmetically hide a physical/control defect.
But strong procedural or authored references are allowed to improve coordination/style as preferences.
We are not requiring nominal locomotion to emerge from an uncontrolled ragdoll.
The desired architecture is:
strong procedural reference + finite internal motors + actual contacts/outcomes.
PART 23 — YAW
Continue measuring yaw/angular momentum.
Do not make yaw the first objective of this architecture transition unless it prevents walking.
Once robust walking exists, diagnose it under the new gait.
Do not:
- pin heading;
- root-correct yaw;
- add invisible torque.
Any correction must emerge through physical joint/contact mechanisms.
PART 24 — START/STOP AND SPEED ENVELOPE
If robust steady walking is achieved under the new planner, continue autonomously into:
- nearby walking-speed envelope;
- standing → walking;
- walking → standing;
- acceleration/deceleration within walking.
Use the same contact-event architecture.
Do not build separate start/stop hacks.
Do not begin jogging/running/sprinting yet.
PART 25 — F2h
Do not promote F2h.
Once F0 walking is robust under the new planner, you may rerun F2h as an opt-in comparison using the same planning/execution architecture.
If useful, include F2-locked as the clean articulation control.
The production render skeleton will have a toe/forefoot bone regardless, so the physics-toe question can remain independent.
PART 26 — FREEZE THE PRODUCTION RENDER-SKELETON CONTRACT
Separate from the current physics-body topology, adopt the researched production render-skeleton contract in design documentation.
Do not derail the locomotion implementation to build the final skinned character unless doing so is already necessary.
Freeze semantically:
root
→ hips
→ three-spine torso / limbs
and:
hips
→ upperLeg
→ lowerLeg
→ foot
→ toe
with:
- clavicles;
- hands;
- neck/head;
- branch-based deformation twist bones for upper arm, forearm, thigh and calf;
- same topology for goalkeeper/outfield;
- fingers deferred;
- IK helpers separate from semantic hierarchy.
Unity mapping:
- hips → Hips;
- spine_01 → Spine;
- spine_02 → Chest;
- spine_03 → UpperChest;
- clavicle → Shoulder;
- foot → Foot;
- toe → Toes;
- structural root is unmapped.
No semantic hip_L / hip_R render bones.
Physical left/right hip joints remain constraints between pelvis and thigh bodies.
Canonical production reference/export pose: T-pose.
Document this as a frozen future production contract.
Do not infer that render toe requires physical toe.
PART 27 — REGRESSION / DETERMINISM
Preserve all approved historical gates.
New architecture remains opt-in until validated.
Rerun relevant regressions after meaningful milestones.
Check:
- deterministic replay;
- complete state restoration;
- no NaNs;
- no hidden state writes;
- no unexplained impulses;
- no joint-limit explosions;
- no new contact regressions;
- no animation-on/off outcome dependency.
Local checkpoint commits are encouraged.
Do not push.
PART 28 — AUTONOMY
This is a substantial implementation runway.
You may:
- build diagnostics;
- add the Physical Stepper/contact-event abstractions;
- refactor experimental locomotion code where necessary;
- build nominal gait generation;
- build transition models;
- run controlled identification;
- implement continuation-aware planning;
- run oracle comparisons;
- implement individual stance corrections only when controlled evidence supports them;
- revert failed approaches;
- consult primary literature where a specific implementation decision needs evidence;
- make local checkpoint commits.
You may not:
- push;
- change fundamental body architecture;
- promote F2h;
- restart swing redesign without new evidence;
- add stud/traction architecture without stopping for a decision;
- start running/sprinting;
- start Reference Tackle;
- implement football ball-contact actions yet;
- violate physical-authority rules.
PART 29 — DO NOT LOSE THE PLOT
At every major decision ask:
Does this change improve our ability to choose a physically viable sequence of contact events, or am I locally tuning one symptom?

Prefer:
measure
→ hypothesis
→ discriminating experiment
→ general mechanism
→ held-out validation.
Avoid:
failure
→ new gain
→ same six starts
→ another gain
→ another special case.
Do not optimize a metric merely because it exists.
Do not force human-looking traces without demonstrating that they correspond to useful physical capability.
STOP CONDITIONS
Do not stop after the first successful component.
Continue autonomously while the next stage is supported.
Stop and return for my decision if:
- evidence requires a fundamental body change;
- a new traction/contact model appears necessary;
- a solution requires violating physical authority;
- the planner cannot approach the oracle despite adequate model accuracy;
- two materially different architectures remain with no evidence-based discriminator;
- production cost appears fundamentally incompatible with 22 players.
Otherwise continue through:
oracle explanation
→ nominal proposal generator
→ contact-event interface
→ continuation-aware planner
→ held-out walking validation
→ if earned, walking speed envelope + start/stop
→ if earned, evidence-gated stance improvements
→ if earned, F2h comparison.
FINAL DELIVERABLE
When you stop, begin with a short executive report:
1. What architecture did you actually implement?
2. What did the oracle teach us?
3. Was the main benefit better nominal gait, continuation reasoning, or both?
4. Can the character now walk robustly?
5. What held-out success did it achieve?
6. What walking speed range is stable?
7. Can it start/stop?
8. Were any stance changes actually justified?
9. What is the measured planner cost?
10. What remains before jogging/running?
Then provide:
- architecture diagram;
- contact-event schema;
- state representation;
- transition model;
- planner objective;
- oracle-vs-production comparisons;
- ordinary-vs-oracle physical traces;
- nominal-gait experiment;
- prediction calibration;
- feasibility calibration;
- held-out walking results;
- speed/start-stop results if reached;
- impulse/energy accounting;
- yaw measurements;
- F2h comparison if reached;
- regression/determinism results;
- performance;
- reverted experiments;
- exact commits/artifacts;
- smallest visual review set.
Update the handoff/decision record so another session can resume without reconstructing this reasoning.
Do not push.
