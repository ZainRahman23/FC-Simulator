<!-- preserved verbatim from Claude session 6a70b682-ea7e-4ecb-991b-1bb65e5cd9c4, transcript line 8013. -->

PHYSICAL CHARACTER V1 — JOLT APPROVED, PROCEED WITH GATE A ONLY
I reviewed your physics-substrate investigation alongside an independent investigation/prototype.
Decision: proceed with Jolt via JoltPhysics.js as the provisional physics substrate for Physical Character V1.
Rapier remains the first fallback. Custom XPBD is no longer the default plan and should remain a last resort or source of narrowly targeted techniques rather than something we build pre-emptively.
Do not revisit the substrate comparison unless Gate A or Gate B exposes a concrete blocker.
1. Findings I am accepting
Your investigation and the independent investigation converged on the same major conclusions:
- the existing Touchline defensive/contact architecture fails because visible motion is clip/time driven and contact is not a persistent physical constraint;
- we need one genuinely articulated physical character state;
- approximately 14 rigid bodies is a sensible V1;
- animation should provide targets rather than directly setting the solved body transforms;
- motors must have finite strength and be physically defeatable by contacts;
- collisions must affect motion on the physical contact step rather than triggering a delayed reaction;
- generic rigid-body infrastructure should come from a mature physics substrate rather than us casually building a general-purpose physics engine;
- Jolt is currently the strongest substrate candidate;
- Rapier remains useful as a fallback/reference;
- fast rotating limb contact remains a special unresolved problem regardless of engine.
The independent Rapier experiment also demonstrated an important target behavior:
when a motor is physically blocked, it should retain tracking error rather than force the limb through the obstruction.
In that experiment the blocked motor retained roughly 37.5° of target error with only ~0.22 mm peak overlap.
Preserve that principle for later motor work.
2. LOCK THE SINGLE-STATE ARCHITECTURE
This is now a foundational rule:
There is one character spatial state.
The Jolt articulated bodies are that physical state.
The architecture should ultimately be:
authoritative football simulation
→ action/contact facts
→ authored animation/action targets
→ physical-character controller / finite joint motors
→ Jolt articulated bodies + contacts
→ solved physical transforms
→ procedural/IK correction where appropriate
→ rendered skeleton.
Do NOT recreate:
kinematic animation character + separate hidden ragdoll + synchronization layer.
Animation describes where the character is trying to move.
The physical articulated body determines where the character actually is after inertia, joints, ground contact and collisions.
Rendering follows the solved physical body.
Do not overwrite solved rigid-body transforms every frame to force them back onto animation.
3. Touchline's simulation-authoritative rule remains unchanged
The foundational rule remains:
simulation decides what happens; presentation visually explains what happened.
Physical Character V1 must NOT independently decide:
- tackle success;
- possession;
- pass success;
- shot outcome;
- goals;
- authoritative ball state;
- fouls;
- any other football outcome.
Those remain authoritative simulation facts.
Physical character dynamics determine the bodily realization of those facts.
Same authoritative inputs must remain deterministic.
No presentation RNG.
4. IMPORTANT: FAST-LIMB COLLISION REMAINS UNRESOLVED
Do not assume that selecting Jolt means fast football collision is solved.
Both investigations found that generic engine CCD has limitations for fast rotating dynamic limbs.
Your spike found that Jolt with speculative contacts + adaptive substeps could achieve:
- ~0.2 mm penetration at first touch in the 15 m/s rotating test;
- same-frame response of the struck shank;
- ~0.2 mm in the 13 m/s linear test;
- zero tunnelling in that spike.
The independent investigation similarly concluded that rotating-limb collision requires explicit qualification and that more solver iterations cannot recover a contact that was never generated.
Therefore:
Jolt owns ordinary collision/contact infrastructure.
Fast football limb contact remains an explicitly unresolved subsystem.
Do not lock us during Gate A into either:
- Jolt built-in CCD as the complete solution; or
- a custom swept-limb implementation.
Later Gate D should determine whether:
Jolt speculative contact + deterministic adaptive/local substeps
is sufficient, or whether Touchline needs a narrowly targeted:
swept capsule / fast-pair collision layer
for dangerous football contacts.
Do not implement that now.
5. Preserve existing work
Work only in the isolated physical-character-v1 worktree.
Preserve and do not modify/delete:
- touchline-current;
- Reference Tackle V1;
- RT_export();
- the Reference Tackle analysis/cache;
- the accepted rear-contact physics work;
- Follow-through V1/V2 preserved work;
- previous defense experiments;
- the substrate investigation/spikes.
Nothing committed.
Nothing pushed.
GATE A — PASSIVE 14-BODY PHYSICAL HUMANOID
Build Gate A only.
Gate A answers one question:
Can Jolt support a stable, believable, deterministic, genuinely articulated 14-body human whose body parts occupy physical 3D space and respond naturally to gravity, inertia, joints and ground contact?

This is not yet a football-animation test.
6. Absolutely NOT in Gate A
Do not implement:
- Reference Tackle playback;
- tackling;
- a second player;
- animation motors;
- PD target tracking;
- balance control;
- active ragdoll behavior;
- locomotion;
- foot planting;
- get-up;
- ball collision;
- football contact interpretation;
- production integration;
- fast-pair custom collision;
- 22-player tests.
Gate A is passive physics.
7. 14-body hierarchy
Start with:
1. pelvis
2. abdomen/lower torso
3. chest
4. head
5. left upper arm
6. left forearm/hand
7. right upper arm
8. right forearm/hand
9. left thigh
10. left shin
11. left foot
12. right thigh
13. right shin
14. right foot
Hands may remain part of the forearm bodies for V1.
Do not add:
- fingers;
- toes;
- separate clavicles/shoulder girdle;
- additional spine segments
unless you discover a fundamental reason Gate A cannot work without one. If so, report it rather than silently expanding scope.
8. Build the physical body from the actual character
This addresses one of the fundamental defects of our old system.
Collision bodies must correspond to the actual current skeletal proportions rather than unrelated hard-coded body heights.
Use the stored player:
- height;
- weight;
- skeleton proportions
where available.
Gabriel is fine as the initial subject if his current rig is convenient.
Use researched anthropometric body-segment mass fractions and sensible COM/inertia rather than equal masses or allowing collider volume to silently determine body composition.
Record the source/assumptions used.
Use simple collision geometry:
- capsules where appropriate for limbs;
- sensible simple torso/pelvis volumes;
- practical physical foot geometry.
Don't chase mesh-perfect collision.
9. Collider ↔ rendered-body correspondence
The review harness must allow me to inspect:
rendered mesh + physics colliders
simultaneously.
I need to verify visually that the physics body actually occupies approximately the same space as the player I see.
Also provide:
physics-only mode
so the mesh cannot hide physical problems.
This is important because the previous system's collision shapes and rendered limbs could disagree by centimetres.
10. Anatomical articulation
Create passive joints with reasonable human ranges for:
- hip;
- knee;
- ankle;
- pelvis ↔ abdomen;
- abdomen ↔ chest;
- shoulder;
- elbow;
- neck.
Use the most appropriate Jolt constraints rather than forcing every joint into the same representation.
Human ROM does not need medical precision, but it must prevent obviously impossible configurations.
Pay particular attention to:
- knee hinge behavior;
- elbow hinge behavior;
- asymmetric hip swing/twist;
- asymmetric shoulder swing/twist;
- spine bending/twist;
- ankle limits.
Document exactly how each anatomical joint maps to Jolt constraints and why.
11. NO MOTORS
Gate A is completely passive.
Once released:
gravity + inertia + articulation + ground contact + friction
determine the motion.
There should be no invisible animation force trying to make the player look human.
This isolates the foundation before we add intelligence.
12. Deterministic drop suite
Build several deterministic starting conditions.
A — relaxed upright drop
Small height above the turf.
Observe collapse and settling.
B — hip/side-first fall
Deliberately asymmetric.
One hip/side should contact first.
I want to see the disturbance propagate through the articulation.
C — shoulder/upper-body-first fall
Test torso/spine/shoulder/arm interaction.
D — rotating fall
Give the character a modest initial angular velocity.
Observe angular inertia and how rotation transfers through connected segments.
E — awkward asymmetric fall
Give limbs deliberately non-symmetric starting configurations so this cannot accidentally look correct because the initial pose is symmetric.
13. What natural propagation should look like
In an asymmetric fall, I expect a causal sequence approximately like:
hip contacts turf
→ pelvis velocity/angular velocity changes
→ pelvis/spine constraint loads
→ abdomen/chest responds
→ shoulder/arm contact occurs
→ unconstrained limbs continue through inertia
→ secondary contacts occur
→ energy dissipates
→ body settles.
Do not script this sequence.
It must emerge from the articulated body.
If the entire player rotates/falls like one rigid plank, Gate A fails.
If the body behaves like disconnected sausages, Gate A also fails.
We need visible propagation through a connected articulated human.
14. Ground/contact requirements
Measure rather than hide:
- transient penetration;
- sustained penetration;
- rendered-visible penetration.
The earlier values around:
- 3 mm body/body;
- 5 mm body/ground
are diagnostic targets, not sacred constants.
Do not distort anatomy, inflate colliders or create excessive stiffness just to hit an arbitrary millimetre number.
What matters is:
- no visible phasing;
- no body crossing through the turf;
- no persistent deep overlap;
- stable resting contact;
- sensible friction;
- no delayed correction pop.
Report the actual numbers.
15. Energy/stability
Gate A should demonstrate:
- no NaNs;
- no exploding joints;
- no disconnected limbs;
- no obvious anatomical-limit violations;
- no artificial energy growth;
- no endless jitter;
- no large one-frame correction pops;
- stable resting contact;
- eventual rest/sleep;
- plausible angular inertia;
- plausible mass response.
Track kinetic energy over time.
If energy increases without an external source, investigate rather than hiding it with huge damping.
Damping is allowed, but document it and keep it physically defensible.
16. Timestep/substeps
Do not inherit the old custom-XPBD assumption of:
60 Hz × 20 substeps.
Gate A has no high-speed player-vs-player contact.
Determine the lowest reasonable fixed-step/substep configuration at which the passive articulated humanoid remains stable.
Test a small number of sensible configurations sequentially if needed.
Report:
- stability;
- penetration;
- joint error;
- CPU cost
for those configurations.
Do not brute-force.
The 240/480 Hz rates from the independent Rapier investigation were stress-test starting points, not requirements for Jolt or production Touchline.
Fast-contact adaptive stepping belongs to Gate D.
17. Determinism
First establish:
same runtime + same initial state = identical trajectory.
Record sufficient physical state each step to compare runs.
Do a few repeated runs.
Do not perform a large browser matrix yet.
If inexpensive after Gate A works, one small cross-runtime/browser check is useful, but it must not turn into another heavy validation run.
Cross-browser determinism can receive its own focused check before Gate B if necessary.
18. Debug harness
Give me an interactive Gate A review harness with:
- drop-test selector;
- restart;
- play/pause;
- 1×;
- 0.5×;
- 0.25×;
- ±1 physics step/frame;
- timeline/scrubber if inexpensive;
- orbit camera;
- useful fixed camera presets.
Toggleable overlays:
- rendered mesh;
- rigid bodies;
- colliders;
- body COMs;
- total COM;
- joint anchors;
- joint axes;
- joint limits;
- ground contacts;
- contact normals;
- penetration;
- linear velocity;
- angular velocity;
- joint/constraint error;
- sleeping/awake state.
I want to be able to inspect the physics, not merely watch a pretty fall.
19. Measurements
For every drop report at least:
- maximum ground penetration;
- maximum joint-anchor error/separation;
- maximum joint-limit violation;
- initial kinetic/potential state as appropriate;
- kinetic-energy evolution;
- time to settle;
- final residual motion;
- CPU time per physics frame;
- number of physics bodies;
- number/type of constraints;
- solver/timestep configuration.
Also identify the worst frame and make it easy to inspect in the harness.
20. Resource constraints
Keep my Mac cool.
Use:
- one character;
- one process/browser at a time;
- sequential tests;
- minimal captures;
- no parallel headless browsers;
- no full regression suite;
- no historical gates;
- no match;
- no Reference Tackle rendering;
- no long-running polling/wait loops.
Shut down temporary servers/browser processes when finished.
If a test unexpectedly becomes computationally expensive, stop and diagnose it instead of brute-forcing it.
21. Deliverable
Give me:
1. the interactive Gate A review harness;
2. physics-only and mesh+physics views;
3. the deterministic drop suite;
4. concise measurement table;
5. exact Jolt version/build;
6. timestep/solver configuration;
7. complete 14-body hierarchy;
8. body masses and inertia assumptions;
9. collider dimensions;
10. joint definitions and ROM limits;
11. friction/restitution/damping values;
12. determinism result;
13. performance result;
14. every known failure/limitation;
15. anything unexpected you discovered.
Explicitly tell me whether you believe Gate A passes, but preserve the evidence so I can make the final approval myself.
STOP CONDITION
STOP after Gate A.
Do NOT:
- begin Gate B;
- add motors;
- add animation targets;
- reproduce Reference Tackle;
- add a second character;
- solve fast limb collision;
- integrate into Touchline production;
- commit;
- push.
I want to visually review the passive physical humanoid before we teach it to move.
