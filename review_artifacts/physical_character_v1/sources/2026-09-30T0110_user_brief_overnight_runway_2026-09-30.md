<!-- preserved verbatim from Claude session 6a70b682-ea7e-4ecb-991b-1bb65e5cd9c4, transcript line 12622. -->

OVERNIGHT PHYSICAL CHARACTER RUNWAY
I am going to leave this running unattended for approximately 6 hours.
You have been doing good work on the physical-character system. Continue autonomously through the roadmap below rather than stopping after every small successful gate.
Use the time, not the scope, as the outer limit.
Work carefully and sequentially. Do not rush to reach later stages.
The objective is to leave me tomorrow with the strongest technically justified physical-character foundation you can build and a clear record of exactly what worked, failed, changed, and remains uncertain.
FOUNDATIONAL RULE
Preserve the architecture we have established:
intent
→ physical sensing/support reasoning
→ physically achievable targets
→ finite motors
→ Jolt articulated rigid bodies + contacts
→ solved physical state
→ rendered skeleton
The Jolt physical body remains the single authoritative character spatial state.
Never restore:
- kinematic pose overriding;
- animation transforms copied into physics;
- hidden root/pelvis dragging;
- post-contact separation hacks;
- teleportation;
- infinite motors;
- delayed canned collision reactions;
- animation determining collision outcomes.
Contacts must affect motion when they physically occur.
Football simulation authority remains separate: this physical/presentation work must not silently decide possession, tackle success, goals, or other authoritative football outcomes.
FIRST: FINISH V1.1 INTEGRATION PROPERLY
Treat the completed anatomy audit as authoritative unless new evidence demonstrates an implementation error.
Preserve V1 historically.
V1.1 retains the evidence-supported corrections including:
- corrected ~18.4 cm hip-centre spacing instead of ~32.3 cm;
- corrected knee centres;
- corrected shoulder centres;
- corrected segment COM geometry;
- evidence-supported ROM;
- evidence-supported strength reductions;
- unchanged visible player proportions unless mechanically necessary.
Do not make V1.1 stronger merely to recover V1 behavior.
Resolve the three outstanding integration issues:
A. C2 weight transfer
V1 succeeded partly because of an accidental/unmodelled COP bias.
Do not restore that bias.
Implement intentional physical unloading properly:
double support
→ transfer support toward stance foot
→ swing-foot measured load decreases
→ liftoff becomes physically permissible
→ single support
→ swing
→ actual touchdown
→ load acceptance.
Use actual COM, velocity, capture/support state, COP/ground-reaction estimates, foot loads, friction and finite torque capability.
Do not simply command the swing-foot load to zero as an unexplained hack.
Do not weaken the liftoff criterion just to make tests pass.
B. Gate A V1.1 fixtures
Re-author only the anatomy-dependent initial conditions that became invalid because they were written against V1 geometry.
Preserve the semantic challenge and comparable energy/momentum of each test.
If a valid V1.1 initial condition still exposes instability, treat that as a genuine failure.
C. Foot-placement reach
Revalidate physically useful reach under V1.1.
Do not inherit either V1's old reach or V1.1's mathematical maximum blindly.
Establish reachable placement from actual anatomy, support, joint margins, motor authority, touchdown quality and ability to accept load afterward.
PROMOTION CHECKPOINT — V1.1
If V1.1 passes representative A/B/C1/C2 tests with the corrected controller and valid fixtures, promote V1.1 as the new working physical-character foundation.
Preserve V1 and all historical evidence.
If V1.1 exposes a fundamental unresolved problem, do not force promotion. Investigate it and remain at that checkpoint if necessary.
NEXT: C3 — PHYSICS-DRIVEN CORRECTIVE STEPPING
Once V1.1 is genuinely ready, connect C1's existing STEP_NEEDED concept to C2's physical foot-placement capability.
This is the first autonomous recovery step.
The question is:
When the current support region can no longer arrest the body's momentum, can the character choose and physically execute a reachable step that creates a new support region capable of catching it?

Research only as necessary. Use established capture-point / foot-placement / physically based character-control literature where useful.
The step must emerge approximately as:
disturbance
→ COM/capture state leaves recoverable in-place region
→ STEP_NEEDED
→ choose which foot can move
→ physically transfer/unload if time permits
→ choose reachable foothold based on predicted state
→ swing physical leg
→ actual touchdown becomes truth
→ accept load
→ recompute balance
→ recover, take another step if later architecture permits, or fall.
For C3, one corrective step is sufficient.
Do not build general walking.
Test front/back/lateral disturbances, varying magnitude and direction.
Include cases where:
- the step succeeds;
- the desired foothold must be projected;
- the character reacts too late;
- friction prevents recovery;
- no reachable foothold exists;
- the character must honestly fall.
Never teleport the foot or pelvis.
NEXT: C4 — WHOLE-BODY REACTIVE BALANCE
If C3 is stable and convincing, add the important behavior deliberately excluded from C1:
reactive upper-body participation.
This includes:
- arms;
- shoulders;
- trunk;
- pelvis/trunk counter-rotation where appropriate.
The objective is NOT canned:
push left → play balance-left animation.
Responses should depend on actual:
- angular momentum;
- body angular velocity;
- COM/capture state;
- support configuration;
- disturbance direction;
- current action.
Explore finite arm/upper-body reactions that help manage angular momentum while remaining part of the same physical body.
Test whether arms improve recoverability and visual plausibility without hiding weak lower-body control.
Keep a comparison with reactive arms disabled.
NEXT: C5 — FALL TRANSITION / PROTECTIVE RESPONSE
If C4 is sound, address what happens once recovery becomes physically impossible.
Distinguish:
still recoverable
from
step required
from
fall unavoidable.
Once falling is unavoidable, the balance controller should stop pretending it can save the posture.
Introduce physically compatible protective behavior such as context-appropriate:
- arm extension/bracing;
- shoulder/trunk rotation;
- head protection;
- preparation for ground contact.
These are responses to the physical fall, not authored decisions about where the character must land.
Physics remains free to defeat the requested protective pose.
Do not attempt a giant library of fall animations. Establish the architecture and a few representative directions.
THEN: FIRST FOOTBALL PHYSICAL VERTICAL SLICE
Only after the preceding foundation is credible, introduce a second physical character.
Do NOT immediately reproduce the full Reference Tackle.
Start with controlled football-relevant body contact.
Example progression:
1. stationary shoulder/chest contact;
2. walking/jogging-equivalent controlled approach if the necessary movement primitive exists;
3. side shoulder challenge;
4. rear/diagonal body challenge;
5. controlled leg/body contact.
Questions:
- Is contact immediate?
- Is there any phasing/tunnelling?
- Does momentum transfer between bodies?
- Do local impacts propagate naturally through each articulation?
- Does support break appropriately?
- Does the challenged player recover in place, step, stumble or fall according to physical circumstances?
- Do arms/trunk react?
- Can both players remain physical throughout?
- Does mass/inertia visibly matter?
Do not script the victim's reaction from the collision label.
REFERENCE TACKLE
If — and only if — the two-character vertical slice is technically sound, return to the preserved Reference Tackle V1 as the integration target.
Use the existing frame-by-frame breakdown as target/reference evidence.
Do not simply replay its authored trajectories.
The reference now becomes a validation target for the physical-character architecture.
The tackler may have intentional action targets for:
- approach;
- plant;
- lowering;
- launch;
- leg extension;
but after physical interaction begins, contacts, finite motors, support loss, inertia and physical state must determine what actually happens.
Likewise, the attacked player's hurdle/stumble/fall must arise from its physical state plus reactive character control, not from a predetermined fall clip.
If the physical result differs from the reference for a defensible reason, report it. Do not cheat to match pixels.
IMPORTANT: USE FAILURE TO GUIDE DEVELOPMENT
Throughout the overnight work, use:
problem
→ attempt
→ measured limitation
→ investigation
→ new approach
→ result
→ next exposed problem
Do not make the history artificially linear.
When something fails, determine why before adding another mechanism.
Prefer fixing the causal layer responsible for the failure.
Do not accumulate patches.
RESEARCH POLICY
You have permission to research technical questions as they arise.
Prefer:
- primary papers;
- biomechanics literature;
- robotics / physically based character-control research;
- Jolt documentation/source;
- high-quality technical implementations.
The Rabona/Furkan work we've studied is architectural inspiration, not authority.
Useful principles from that investigation include:
- articulated independently simulated body regions;
- physical collision response;
- finite target-oriented joint control;
- state transitions between controlled motion and freer physical motion;
- targeted collision/character logic rather than animation overriding physics.
Do not copy undocumented implementation details or assume claims we have not verified.
VALIDATION POLICY
At every major gate preserve:
- deterministic fixture;
- numerical report;
- interactive visual review;
- known failures;
- previous-gate regression check.
Do not rely solely on numerical metrics.
Flag visually bad motion even when thresholds pass.
Preserve the distinction between:
- physical correctness;
- controller correctness;
- visual naturalness.
PERFORMANCE / COMPUTER SAFETY
I am leaving this unattended.
Keep resource use conservative.
- one browser/headless browser at a time;
- sequential tests;
- no parallel browser farms;
- no giant parameter sweeps;
- no continuous high-load rendering;
- no unnecessary full regression after every tiny edit;
- run representative regressions during development and full relevant gates at checkpoints;
- close headless browsers immediately after use;
- stop temporary servers/processes you create;
- do not repeatedly regenerate large media;
- prefer numerical tests over rendering when visual output isn't needed.
If a task would require sustained heavy CPU use, find a narrower test first.
Keep my Mac cool.
VERSIONING / SAFETY
Work only in the existing physical-character worktree or additional isolated worktrees you deliberately create.
Do not touch my original working tree.
Preserve snapshots/checkpoints before major architectural changes.
Do not delete prior evidence.
Do not rewrite published Git history.
Do not push anything to GitHub overnight.
You may make clearly labelled local checkpoint commits in the isolated physical-character branch/worktree when a major gate is genuinely stable and doing so makes the work safer/recoverable.
Never commit generated heavyweight review media unless it belongs under the existing project policy.
At the end, leave the worktree in a comprehensible state.
AUTONOMY RULE
Do not stop to ask me about ordinary implementation choices that can be resolved from:
- the architecture;
- evidence;
- existing project principles;
- measurements;
- reputable research.
Make the conservative, technically justified choice and document it.
However, stop advancing to later gates if you encounter a decision that would:
- change authoritative football simulation behavior;
- require abandoning Jolt;
- require changing the 14-body architecture fundamentally;
- require introducing hidden root support;
- require nondeterministic physics;
- require rewriting major accepted project architecture;
- require deleting/replacing accepted historical work;
- or cannot be justified from evidence.
In that case, investigate/document the issue thoroughly and spend remaining useful time improving diagnostics/tests rather than guessing.
DO NOT WORK ON
Do not spend this overnight runway on:
- UI polish;
- stadium/environment;
- ball graphics;
- portfolio work;
- manager systems;
- unrelated simulation features;
- player attributes;
- network multiplayer;
- general optimization;
- cloth;
- facial animation;
- production integration.
Stay on the physical-character problem.
MORNING DELIVERABLE
When the useful runway is exhausted, give me one consolidated report:
1. Where you reached
State the furthest completed gate and the exact reason you stopped there.
2. V1.1 status
Whether V1.1 became the working foundation and all changes required to integrate it.
3. Gate-by-gate results
For every gate attempted:
- objective;
- implementation;
- measurements;
- visual assessment;
- failures;
- fixes;
- remaining limitations;
- pass / partial / fail.
4. Architecture
Describe the resulting physical-character stack precisely.
5. Regressions
State whether every previously accepted gate still reproduces.
6. Performance
Give representative CPU costs and any concerning scaling evidence.
7. Determinism
State exactly what was tested.
8. Review harness
Leave one clear local review entry point from which I can inspect everything you built, with a gate/test selector where practical.
9. Preservation
List snapshots/local commits and their purpose.
10. Next decision
Tell me the single most important thing I should visually review or decide when I return.
Do not push to GitHub.
Do not modify the authoritative football simulation.
Do not sacrifice physical causality or determinism to make something look better.
Continue autonomously as far as the evidence safely supports.
