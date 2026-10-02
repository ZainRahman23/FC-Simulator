<!-- preserved verbatim from Claude session 6a70b682-ea7e-4ecb-991b-1bb65e5cd9c4, transcript line 7451. -->

MAJOR PIVOT — PHYSICALLY ARTICULATED CHARACTER / CONTACT SYSTEM V1
Stop extending the current defensive-animation/contact architecture.
Reference Tackle V1 has exposed a deeper architectural problem.
The authored motion itself is useful and must be preserved as reference data, but the underlying interaction system is not acceptable.
Across essentially all of the defensive work we have done, the recurring failure is:
players visually make contact → their bodies continue through/inside one another → only afterward does a fall/reaction animation occur.
This makes tackles look blocky and disconnected. Contact does not appear to cause the reaction. Animation is effectively explaining a collision after penetration has already occurred.
I no longer want to solve this with more collision cleanup, root nudges, overlap correction, canned fall selection or additional follow-through animation.
We need a full architectural pivot.
1. New goal
Build a physically articulated humanoid character/contact prototype based on the principles we have learned from the procedural-football-character references.
The central idea is:
authored animation supplies intended human motion; an articulated physical body actually occupies space and collides; constraints/motors drive that body toward the intended motion; collision can physically perturb it; the rendered skeleton follows the resulting physical state.
This should sit between our authoritative football simulation and the rendered humanoid.
Conceptually:
authoritative football simulation
→ football event/contact intent
→ authored animation targets
→ physically articulated control body
→ collision/contact/friction
→ joint constraints + motors/"muscles"
→ procedural/IK correction
→ rendered skeletal character
The critical change is that two players must no longer be able to simply animate through one another and react afterward.
2. Preserve the useful Reference Tackle V1 work
Do not throw away Reference Tackle V1.
Preserve:
- its frame-by-frame reference analysis;
- event timing;
- root trajectories;
- COM trajectory;
- pelvis trajectory/orientation;
- chest/neck trajectories;
- shoulders;
- hands;
- feet;
- independent arm/leg tracks;
- measured vs inferred markers;
- reference camera fit;
- ball trajectory;
- contact timing;
- the RT_export() interface;
- review harness.
These are now the target/reference motion for the new physical system.
But the final character must no longer simply play those world trajectories regardless of collision.
3. Put the previous contact approaches aside
Preserve them for historical comparison, but do not build the new architecture around:
- V1 follow-through layers;
- V2 whole-body rigid fall;
- root separation nudges;
- after-the-fact non-penetration corrections;
- fall-animation selection as the primary response;
- canned directional falls;
- animation-root trajectories that ignore physical obstruction;
- teleportation/separation after penetration;
- collision systems that merely report contact and allow the animation to continue through it.
Those approaches have repeatedly failed the visual/contact requirement.
4. Build an actual articulated physical body
I want each prototype player represented by physical body segments.
Start with the minimum useful set, but it should include approximately:
- pelvis/hips;
- torso/lower spine;
- chest/upper torso;
- head/neck;
- left/right upper legs;
- left/right lower legs;
- left/right feet;
- left/right upper arms;
- left/right forearms/hands.
Use simple collision geometry:
- capsules where appropriate;
- boxes or appropriately shaped primitives for feet;
- simple torso/pelvis volumes.
Do not use the detailed render mesh for collision.
The physical representation and rendered mesh/skeleton must remain separate.
5. Connected rigid bodies + anatomical constraints
These segments must form an articulated body rather than independent colliders.
Implement anatomically reasonable joint constraints for:
- hips;
- knees;
- ankles;
- spine;
- shoulders;
- elbows;
- neck.
A passive version should behave as an articulated ragdoll rather than a collection of disconnected pieces.
Prevent obviously impossible:
- backwards knees;
- arbitrary spine rotation;
- detached shoulders;
- unlimited hip rotation;
- impossible ankle orientations.
Keep the first implementation intentionally simple. We do not need medical-grade biomechanics.
6. Animation-driven ragdoll / joint motors
A passive ragdoll is not the target.
As the reference developer discovered, passive ragdoll limbs behave like connected wooden sticks.
Implement the equivalent of joint motors / muscles.
Reference Tackle V1 supplies target orientations/poses through time.
Each controlled joint should attempt to follow its animation target using physically meaningful torque/drive behavior.
Conceptually:
target orientation
→ orientation error
→ corrective torque
- angular damping
  → physical limb motion.
Use stable rotational control, preferably quaternion-space or another representation appropriate to the existing engine rather than naive Euler subtraction.
Motor strength and damping should be configurable per joint and eventually per phase.
For example:
- legs can be strongly driven during approach;
- tackling leg remains strongly intentional during the sweep;
- torso can have somewhat softer compliance during collision;
- arms can respond more freely;
- a tackled leg can be strongly perturbed when struck;
- motor strength can reduce during an uncontrolled fall.
Do not hard-code those examples as final laws yet. Establish the mechanism first.
7. Reduced control-body ideas from the third reference
Incorporate the useful principle that the upper body should have independent dynamic/control state rather than simply inheriting the pelvis transform.
At minimum preserve independent behavior for:
- pelvis;
- chest/upper-body/neck;
- shoulders;
- arms;
- legs/feet.
The reference developer used a neck/upper-body balancing point and independent pelvis roll, allowing the upper body to lead/lag relative to the hips.
We do not have to copy his exact equations.
But we do want this structural property.
The tackler's pelvis should be able to roll onto the hip while the chest lags and subsequently follows.
The tackled player's struck leg should be displaced before the pelvis, chest, arms and head have all completed their responses.
Do not collapse the human body back into a single root orientation.
8. Collision detection and collision response must be real
This is the heart of the pivot.
Collision must operate on the physical body during motion, not merely inspect overlap after an authored pose has already penetrated another player.
We need continuous/substepped contact handling sufficient for fast football limb motion.
For each contact retain/report at least:
- body A;
- body B;
- segment A;
- segment B;
- contact point;
- normal;
- penetration depth;
- relative normal velocity;
- relative tangential velocity;
- impulse/response if applicable.
Collision detection and character response/control should remain architecturally separable.
Do not make the physics library's generic collision callback the football decision engine.
9. No phasing
Establish an explicit acceptance criterion:
physical body segments may make contact, compress within a very small numerical tolerance and slide/roll across one another, but they must not visibly pass through one another for multiple frames.
If a fast tackling leg would tunnel through a shin between 60 Hz frames, solve that with:
- substeps;
- swept/continuous collision detection;
- time-of-impact handling;
- or another principled collision method.
Do NOT solve it by detecting the overlap afterward and teleporting the players apart.
The collision should alter their physical motion at the time of contact.
10. Contact impulse and momentum
When the tackling leg contacts the attacker's leg, that interaction should exchange momentum.
The attacker should begin reacting because the struck physical segment receives an impulse—not because a timer reaches "startFall".
That disturbance should then propagate through the constrained articulated body.
Likewise, the tackler should receive the corresponding reaction.
Preserve sensible mass distribution across the body.
Research standard approximate human segment mass distributions rather than assigning equal mass to every collider.
The total must correspond to the player's body mass.
We already store player weight; use that as the total physical mass rather than inventing a universal character mass.
11. Ground contact
The pitch must participate in the physical system.
We need meaningful contact for:
- feet;
- hands;
- knees;
- hips;
- shoulders;
- torso;
as appropriate.
A tackler landing on his hip should actually receive a ground contact there.
An arm used to brace should actually contact the turf.
An attacker landing on hands/forearms/chest should physically encounter the ground rather than an animation simply stopping at ground height.
12. Contact friction
Incorporate the contact-friction lesson from the reference work.
Tangential response matters.
At minimum design for different behavior between:
- boot ↔ turf;
- hip/torso ↔ turf;
- hand ↔ turf;
- player limb ↔ player limb.
Friction should be based on the contact normal/tangent relationship and should dissipate energy rather than introduce it.
Do not tune one global friction constant until one reference happens to look right.
13. Feet and support
The reference developer's move from point feet to physical foot colliders is relevant.
Give feet meaningful collision geometry.
A planted foot should participate in physical support.
Balance should eventually depend on the physical environment rather than a purely visual foot-plant flag.
However, do not make the ankle infinitely rigid.
Keep the architecture compatible with our later addition of an articulated forefoot/toe.
14. Balance and falling should eventually emerge from support
Do not implement another table such as:
contact from rear -> play backward fall.
Ultimately I want the character state to reflect things such as:
- COM relative to support;
- active foot contacts;
- support polygon/region;
- pelvis velocity;
- chest/neck velocity;
- angular momentum;
- external impulses;
- ability to place another foot.
This should eventually support a continuum:
stable → corrective response → step → stumble → support lost → fall → grounded → recovery
We do not need the complete generalized balance controller in the first prototype.
But do not architect the system around discrete canned fall directions.
15. Rendered skeleton follows the physical/control character
This is another major change.
The visible character cannot remain completely kinematic while invisible colliders do something else.
The rendered humanoid should be fitted/driven from the resulting articulated state, with appropriate skeletal offsets/retargeting.
We should therefore see the collision response immediately:
leg hit
→ leg physically displaced
→ pelvis responds
→ torso responds
→ arms/head respond
rather than:
leg hit
→ bodies overlap
→ later animation begins.
16. Authored motion is still extremely important
Do not interpret this pivot as "let ragdoll physics animate football."
Reference Tackle V1 remains our authored biomechanical target.
The physical controller should initially attempt to reproduce it very closely.
We are changing how that desired motion is executed and perturbed, not discarding animation.
The reference tackle should therefore become a test signal for the physical character.
17. Build this progressively
Do NOT immediately attempt the complete tackle.
I want the following gates.
Gate A — Passive articulated body
One character.
Build the rigid-body/collider hierarchy and anatomical constraints.
Drop it onto the turf.
Verify:
- no disconnected limbs;
- no exploding joints;
- sensible joint limits;
- stable ground collision;
- stable rest.
Stop and inspect.
Gate B — Motor tracking without collision perturbation
Drive one articulated character through a short section of Reference Tackle V1.
Use strong joint motors.
Compare:
original authored Reference Tackle V1
vs
physical character tracking those targets.
The physical character must reproduce the intended motion closely before we continue.
Stop and inspect.
Gate C — Ground interaction
Enable meaningful physical contact with the turf during the tackle.
Hip, foot, hand/arm etc. should encounter the ground while motors continue driving the intended performance.
Verify that the body remains stable.
Stop and inspect.
Gate D — Two-player contact, simplified test
Do NOT run the entire tackle yet.
Put two articulated players into a controlled leg-contact experiment.
Sweep the tackler's leg into the attacker's planted/swinging leg.
Verify:
- contact occurs at the correct instant;
- no tunnelling;
- no multi-frame penetration;
- momentum transfers;
- both bodies respond;
- disturbance propagates through joints;
- motors continue acting;
- no explosive separation.
This gate is extremely important.
Gate E — Reference tackle
Only after A–D pass, run the exact Reference Tackle V1 choreography through the physical characters.
The target is:
the same recognizable reference tackle, except contact is now genuinely responsible for the interacting bodies' response.
18. First experiment: do NOT let physics choose the football outcome
Touchline's foundational architecture remains:
simulation decides what happens; presentation explains what happened.
For this experiment, the authoritative reference data can specify:
- tackle/contact intent;
- approximate contact window;
- ball path/contact;
- broad player trajectories;
- broad outcome.
The articulated physical layer resolves how the bodies physically accommodate those facts.
Do not allow tiny numerical differences in presentation physics to change possession, tackle success, goals, etc.
Presentation physics must be deterministic and simulation-neutral.
19. Determinism
This system must be deterministic.
Same starting state + same authoritative event + same targets = same physical result.
No presentation RNG.
No frame-rate-dependent behavior.
Prefer a fixed timestep and deterministic substep count.
Record enough state/contact information that a bad frame can be reproduced.
20. Physics-engine decision
Research the implementation options available in this project before choosing.
The reference developer experimented with Bullet/Jolt, found synchronization between separate character and collision systems fragile, and eventually preferred targeted collision handling for his needs.
Do not blindly copy that conclusion.
Evaluate what makes sense for our JavaScript/WebGL2 environment:
- an existing rigid-body physics library;
- a small targeted articulated/contact solver;
- or a hybrid.
Consider:
- deterministic fixed-step behavior;
- articulated bodies/joints;
- motors;
- CCD/substeps;
- capsule collision;
- performance;
- debugging;
- integration complexity;
- whether we would end up maintaining two competing physics states.
I strongly prefer one coherent physical state over running a hidden ragdoll in one system and an unrelated animation character in another and constantly synchronizing them.
Research first and justify the choice before implementing the complete system.
21. Research
Before implementation, research:
- active ragdolls / animation-driven ragdolls;
- articulated rigid-body characters;
- PD joint controllers / orientation motors;
- stable quaternion rotational control;
- humanoid joint constraints;
- approximate human body-segment mass distributions;
- capsule collision;
- continuous collision detection for fast limbs;
- contact manifolds;
- Coulomb-style contact friction;
- physically based character balance;
- animation-to-physics transitions;
- physics-to-animation recovery.
Use authoritative technical sources where practical.
Also use the principles from the three football-development videos I described in our conversation:
1. targeted capsule/body collision and animation-driven ragdoll/joint motors;
2. humanoid skeletal synchronization, richer spine/head/shoulder/arm rotation, balance arms and articulated feet;
3. independently controlled pelvis/upper-body regions, physical foot/environment contact, collision-provider separation and tangential contact friction.
Distinguish what those videos actually established from additional techniques you find in outside research.
22. Debugging tools are mandatory
Build visualization for:
- rigid bodies/capsules;
- joint anchors;
- joint limits;
- target orientations;
- actual orientations;
- motor error;
- motor torque/strength;
- contact points;
- contact normals;
- penetration;
- normal/tangential impulses;
- COM;
- support contacts;
- physical skeleton;
- rendered skeleton.
I want to be able to see why a collision looks wrong rather than tuning it blind.
Keep Reference Tackle V1 and its ghost/reference comparison available.
23. Performance/resource constraint
Do not test 22 players.
Do not run full matches.
Do not run the historical regression suite.
Do not run large matrices.
Do not run parallel headless Chrome jobs.
Start with one physical character, then two.
One browser/capture process at a time.
Shut processes down when finished.
Keep my Mac cool.
Ask before doing expensive validation.
24. Do not integrate into production defense yet
Work in a fresh isolated worktree/branch.
Do not modify the accepted touchline-current behavior.
Do not commit or push without my approval.
Reference Tackle V1 and the previous V1/V2 experiments should remain recoverable.
FIRST DELIVERABLE — RESEARCH AND ARCHITECTURE ONLY
Do not start implementing the full system yet.
First give me:
1. a diagnosis of why our existing architecture permits contact → penetration → delayed reaction;
2. the exact proposed articulated body hierarchy;
3. collider shapes and dimensions strategy;
4. mass/inertia strategy;
5. joint types and approximate constraints;
6. joint-motor/control design;
7. how Reference Tackle V1 trajectories become motor targets;
8. how independent pelvis/chest/neck/shoulder dynamics work;
9. collision-detection architecture;
10. CCD/substep strategy;
11. collision-response/contact solver strategy;
12. friction strategy;
13. ground-contact strategy;
14. support/balance representation;
15. rendered-skeleton fitting;
16. animation → physical and physical → animation transition design;
17. determinism strategy;
18. physics-library vs custom-solver recommendation, with reasoning;
19. debugging/visualization design;
20. Gate A–E implementation plan;
21. what existing Touchline code can safely be reused;
22. what existing defense/contact code should explicitly not be reused.
Then STOP and wait for my approval.
I do not want another hour-long implementation based on an architectural assumption we haven't reviewed.

I think that last requirement is particularly important. Don't let Claude immediately spend another hour implementing it. Have it research the actual physics architecture and show you the proposed rigid bodies, joints, motors, contact solver and data flow first.
And this time I would judge the architecture by one very simple invariant before worrying about whether the tackle looks beautiful:
When shin meets leg, the physical bodies cannot continue through one another. The contact must affect their motion on that contact step.
