<!-- preserved verbatim from Claude session 6a70b682-ea7e-4ecb-991b-1bb65e5cd9c4, transcript line 8761. -->

GATE A APPROVED — PROCEED TO GATE B: ACTIVE PHYSICAL CHARACTER CONTROL
I have visually reviewed Gate A and consider the passive physical humanoid solid enough to proceed.
Preserve Gate A exactly as a baseline/review artifact. Do not spend this pass polishing the remaining turf sinking or brief joint-limit overshoot unless either becomes a blocker for Gate B.
Do not commit or push yet.
GATE B OBJECTIVE
Gate B should answer:
Can the passive 14-body Jolt humanoid become an intentional, animation-driven physical character while remaining genuinely physical?

Specifically, can authored motion targets strongly guide the character while:
- rigid bodies remain the single spatial state;
- motors have finite strength;
- inertia remains visible;
- joints remain anatomical;
- external contacts can defeat or deflect the requested motion;
- blocked limbs accumulate target error rather than penetrating obstacles;
- releasing/changing a target produces continuous physical motion rather than snapping;
- no transforms are teleported or overwritten to recover animation.
Do not attempt Reference Tackle yet.
1. Preserve the architecture
The architecture remains:
animation/action target
→ joint-space physical targets
→ finite Jolt motors / physical controller
→ articulated rigid bodies
→ contacts + constraints + inertia
→ solved physical pose
→ rendered skeleton
The Jolt bodies remain the only character spatial state.
Never introduce:
animation skeleton → copied every frame into physics
or:
physics ragdoll → corrected/teleported back to animation.
The target pose is a request, not a command.
2. Research before tuning
Before choosing controller equations/gains, briefly research current primary/technical sources on:
- active ragdolls / physically simulated characters;
- quaternion PD control;
- stable PD / implicit PD control;
- joint-space orientation control;
- Jolt motor semantics;
- timestep-aware torque/impulse limits;
- damping;
- finite-strength pose tracking.
Use this research to justify the controller rather than blindly tuning gains until it looks acceptable.
Keep the research bounded; this is an implementation pass, not another large architecture study.
3. Joint targets
Add physical target control for the existing articulated joints.
Targets should be expressed in the appropriate local/anatomical joint coordinates, not as arbitrary world-space bone rotations wherever avoidable.
For rotational joints, use shortest-path quaternion/orientation error.
Controller effort should account for:
- orientation error;
- relative angular velocity;
- timestep;
- body inertia where appropriate;
- finite strength/torque limits.
Prefer Jolt's integrated constraint motors where they provide the required behavior.
Do not simply apply enormous gains until the pose becomes rigid.
4. Motor strength must be finite
This is one of the core Gate B requirements.
Every controlled region must have a bounded amount of physical authority.
A target saying:
"put the knee here"
must not mean:
"put the knee here regardless of the wall/player occupying that space."
Instead:
target continues requesting motion
→ motor applies bounded effort
→ contact resists it
→ actual pose deviates from target
→ target error remains
→ body reacts physically.
Do not hide target error.
Visualize and measure it.
5. Start with controlled poses, NOT locomotion
Do not immediately attempt running, tackling or full-body balance.
Build a deterministic target-pose sequence that progressively exercises the controller.
Test A — relaxed standing target
Start the passive character near a neutral standing pose and have finite motors acquire and hold it.
This is not yet autonomous balance.
Temporary ground/support conditions may be used only if clearly exposed and bounded for this controller test.
Do not disguise an infinitely pinned pelvis as successful balance.
Test B — slow pose transition
Move from neutral standing to a clearly different football-relevant pose over time:
- hips flex;
- one knee raises;
- torso leans;
- arms counterbalance.
Motion should be continuous.
Test C — faster pose transition
Repeat with a quicker target trajectory.
We should see more tracking lag/error rather than the system generating unlimited force to remain exact.
Test D — target reversal
Reverse/change the requested motion while the body has momentum.
The physical body should decelerate/reverse continuously rather than snapping to the new trajectory.
6. Critical blocked-limb test
This is mandatory.
Reproduce the principle demonstrated in the independent physics investigation.
Have a controlled limb attempt to reach a target through a physical obstruction.
The correct behavior is:
- contact occurs;
- penetration stays bounded;
- obstacle/contact prevents the target from being reached;
- motor continues exerting finite effort;
- target error remains;
- surrounding joints/body may react to the load;
- removing the obstruction allows tracking to resume continuously.
The wrong behavior is:
- limb phases through;
- target wins unconditionally;
- root teleports;
- contact is ignored;
- delayed reaction occurs after penetration;
- motor explodes/jitters.
Measure:
- target angle;
- actual angle;
- target error;
- motor torque/impulse;
- contact penetration;
- contact force/available impulse metric;
- response elsewhere in the articulated body.
7. External disturbance test
While the character is tracking a pose, apply a deterministic physical disturbance to:
- shoulder/chest;
- pelvis;
- one limb.
I want to see:
impact
→ local body response
→ constraints transmit disturbance
→ motors resist/recover according to finite strength
→ body approaches the requested pose again.
Do not script the recovery trajectory.
The physical controller should generate it from target error and damping.
8. Regional motor profiles
Do not assume every joint should have identical stiffness/strength.
Establish an initial documented profile for:
- spine/torso;
- hips;
- knees;
- ankles;
- shoulders;
- elbows;
- neck.
Keep it simple.
The purpose is to establish plausible relative authority, not final player attributes.
Do NOT introduce Strength, Balance, Agility or other player-attribute scaling yet.
That comes later once the physical controller itself works.
9. Pelvis/root policy
Be extremely explicit about how the pelvis is controlled.
I do not want an invisible infinitely strong root dragging the rest of the physical character around.
If Gate B needs temporary pelvis assistance to test upper/lower-body target tracking, it must be:
- finite-strength;
- visible in debug;
- measurable;
- defeatable;
- clearly labelled as temporary Gate B support rather than the final balance/locomotion system.
Show what happens when that support strength is reduced or removed.
10. Physics must remain causal
Do not use authored animation to prescribe:
- contact response;
- fall direction;
- secondary limb motion;
- collision separation.
Those should emerge from physical state.
Authored data may request intentional movement.
Physics determines what actually occurs when the environment prevents that movement.
11. Debug visualization
Extend the Gate A harness rather than replacing it.
Add toggles/plots for:
- target skeleton/pose;
- actual physical skeleton/pose;
- target vs actual joint orientation;
- angular target error;
- angular velocity;
- motor torque/impulse;
- motor saturation;
- rigid bodies/colliders;
- contacts;
- contact normals;
- penetration;
- COM;
- temporary pelvis/root assistance, if any.
A ghost target skeleton over the physical character would be particularly useful.
I want to see exactly when and why the physical body diverges from the requested animation.
12. Motor-strength comparison
For at least one target sequence, provide three deliberately different strength profiles:
Too weak
→ obviously floppy / poor tracking.
Candidate
→ intentional movement with visible physical compliance.
Too strong
→ demonstrate where excessive motor authority begins producing stiffness, jitter or contact bulldozing.
This should help establish the useful operating region rather than hiding the trade-off.
13. Metrics
Report:
- RMS/mean target orientation error;
- peak target error;
- per-joint peak motor effort;
- time spent at motor saturation;
- maximum penetration in the blocked test;
- maximum joint error;
- kinetic-energy behavior;
- recovery time after disturbance;
- CPU time per 60 Hz rendered frame;
- physics frequency/substep configuration.
Also identify visually bad frames even if the numerical thresholds pass.
14. Timestep
Keep Gate A's validated Jolt configuration as the starting point.
Do not introduce the later fast-contact adaptive stepping system yet.
There are no football-speed player/player collisions in Gate B.
If motor control itself requires a different physics frequency, demonstrate why with measurements rather than silently increasing it.
15. Gate A limitations remain visible
Do not spend this pass hiding:
- mesh/turf sinking;
- brief compliant joint-limit overshoot.
If motors make either problem materially worse, report it.
Otherwise preserve them as known Gate A limitations for later refinement.
16. Determinism
Same target sequence + same initial physical state must reproduce the same physical trajectory.
Verify repeated runs.
Keep physics-driving JS math deterministic using the lesson from Gate A regarding Math.sin/Math.cos.
No presentation RNG.
17. Resource limits
Keep this lightweight:
- one character;
- one browser/process at a time;
- no Reference Tackle;
- no second player;
- no ball;
- no match;
- no historical regression suites;
- no parallel capture jobs;
- no large browser matrix.
Shut temporary processes down afterward.
Keep my Mac cool.
GATE B PASS CRITERIA
I will consider Gate B successful if the review demonstrates:
1. Intentionality
The physical humanoid can strongly pursue authored target poses.
2. Continuity
Target changes produce continuous physical motion, not snapping.
3. Physical authority remains finite
The character cannot force limbs through physical obstacles merely because animation requests it.
4. Immediate contact response
Contact affects the physical body on the contact step.
5. Compliance
Blocking/disturbance creates visible target error and physically propagates through the articulated body.
6. Recovery
Once a disturbance/obstruction disappears, finite motors naturally bring the character back toward its target.
7. No hidden synchronization
Jolt bodies remain the single character state.
8. Stability
No exploding joints, NaNs, uncontrolled energy growth or severe jitter.
9. Determinism
Repeated identical runs reproduce.
10. Performance
The one-character system remains inexpensive enough to justify proceeding.
STOP CONDITION
STOP after Gate B.
Do not:
- implement balance/locomotion as a full system;
- reproduce Reference Tackle;
- add the second character;
- implement tackle collision;
- implement fast swept-limb contact;
- generalize defense;
- integrate production gameplay;
- commit;
- push.
Give me the interactive review harness, measurements, known failures, and your Gate B assessment, then wait for my visual review.
