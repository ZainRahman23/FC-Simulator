# User instruction, 2026-10-11 16:20 BST (verbatim)

---

PPR-1 — PHYSIOLOGICAL PASSIVE / PRE-REFLEX RESPONSE
We now have a sufficiently trustworthy collision foundation. CXA-1/TRC-1 established that the apparent PVP phasing was primarily rendering misalignment rather than collider failure. The tackler is now rendered on its actual physical joints; first visual contact agrees with Jolt contact; PVP-1A-DX collider penetration remains small; and the first ~250 ms can be used diagnostically with the documented caveats.
Do not work on the slide tackle yet. Do not work on recovery stepping yet.
The next problem is narrower:
Can V2's first ~0–120 ms after an unexpected collision behave like a physically compliant, pre-activated human athlete rather than a rigid pose-controlled mannequin, before any collision-triggered neural response is allowed?

This is not a stumble-animation task and not an active-balance task.
1. Preserve the collision
Use the corrected existing PVP-1A-DX early collision as the primary disturbance.
Keep unchanged:
- authoritative simulation record;
- tackler trajectory;
- impact speed and mass;
- contact geometry;
- friction;
- solver/timestep;
- V2 anatomy and colliders;
- RUN-1;
- corrected TRC-1 rendering;
- gameplay outcome;
- contact timing;
- all authoritative simulation facts.
Do not increase/decrease the tackle to obtain a prettier result.
Restrict the primary experiment to a window in which the existing collision is trustworthy. The key scientific window is approximately 0–120 ms after contact, before collision-triggered active response should contribute.
Preserve the current V2 response as the control.
2. Research what should physically happen before reflexive response
Before implementing anything, do a focused biomechanics/control review of the passive and pre-activated mechanical behaviour of a human athlete under an unexpected lower-limb disturbance.
Distinguish:
A. Passive mechanics
- joint/tissue elasticity;
- tendon compliance;
- passive joint resistance;
- damping;
- segment inertia;
- soft mechanical coupling.
B. Pre-existing muscle activation / postural tone
- muscle force already present before impact;
- load-dependent stiffness;
- support-leg activation;
- pre-contact co-contraction where justified.
C. Collision-triggered neural response
- reflexive and voluntary changes that occur only after realistic latency.
PPR-1 concerns A+B only.
C is forbidden during the primary response window except for controller activity that can be demonstrated to have already been present before the collision.
Do not invent exact biological parameters merely because they make the animation look better. Record sources, measured ranges, extrapolations and design choices separately.
3. Audit the current V2 posture tone
Quantify why the existing character reads stiff.
Measure the effective mechanical behaviour of the current controller around:
- ankle;
- knee;
- hip;
- pelvis;
- lumbar/trunk;
- shoulder/arms.
Determine:
- effective joint stiffness;
- damping;
- restoring torque vs displacement;
- torque rise time;
- whether gravity compensation is frozen at activation;
- whether stiffness is symmetric in all directions;
- whether the controller behaves like a pose spring rather than an activated human limb;
- how these values compare with defensible human ranges.
Specifically investigate Claude's previous finding that V2's actuators can build torque faster than human muscle.
I want to know whether our mannequin appearance is primarily caused by:
- excessive stiffness;
- insufficient compliance;
- unrealistic damping;
- unrealistically fast torque generation;
- frozen gravity compensation;
- inappropriate posture targets;
- or some combination.
4. Preregister before changing the response
Before implementing the candidate response, freeze a PPR-1 preregistration.
At minimum compare:
A — CURRENT V2
Existing frozen posture behaviour, unchanged.
B — PHYSIOLOGICAL PRE-REFLEX
The smallest defensible replacement/augmentation that produces human-like passive/pre-activated mechanics.
Do not create multiple variants and visually choose the nicest one.
Define B from the evidence first.
Freeze:
- equations/control law;
- parameters/ranges;
- torque limits;
- torque-rate limits;
- stiffness/damping behaviour;
- gravity compensation behaviour;
- activation state;
- evaluation window;
- measurements;
- success/failure criteria.
Commit the preregistration before observing B in the PVP collision.
5. Critical architectural constraint
B must be completely collision-blind during the primary pre-reflex window.
It may respond mechanically because the body's state changes under force.
It may not receive:
- contact event;
- tackle event;
- impact magnitude;
- contact body part;
- STUMBLE/FALL label;
- simulation outcome;
- future trajectory;
- special tackle gains.
If I remove the tackler, the exact same passive/pre-activated control law must still operate.
There must be no:
- hidden impulse;
- pose teleportation;
- root correction;
- canned recoil;
- procedural stumble;
- collision-specific animation;
- contact-triggered stiffness switch;
- outcome-specific parameter.
The body should yield because forces physically move a compliant articulated body, not because code says “a collision occurred.”
6. What should improve
Do not optimize for greater displacement.
Optimize for credible mechanical response.
Under the same collision I expect to investigate whether:
- the struck ankle yields rather than fighting instantly for its frozen angle;
- the knee yields/load-shares plausibly;
- the hip follows without becoming disconnected or rigid;
- the pelvis begins responding through actual mechanical coupling;
- trunk inertia produces natural relative motion;
- arms respond initially through inertia/mechanical coupling rather than a tackle reaction;
- the disturbance propagates outward from the actual contact;
- motion remains smooth and articulated;
- the player remains capable of being overwhelmed.
B should not magically remain upright.
In fact, if realistic compliance makes the player easier to disturb before active balance arrives, that may be the correct result.
7. Validate away from the tackle
This is critical.
A model that merely improves this collision is not sufficient.
Test B in at least:
- quiet standing;
- ordinary gravity/support;
- small external perturbations in several directions;
- the existing IFM-style disturbances where applicable;
- no-contact control;
- the PVP collision.
It should not introduce:
- spontaneous oscillation;
- sinking/collapse;
- excessive joint motion;
- energy creation;
- foot skating;
- loss of deterministic behaviour;
- instability under ordinary standing.
Demonstrate that this is a general body property, not a tackle patch.
8. Measurements
Record A vs B at high temporal resolution.
Include:
- joint angle;
- angular velocity;
- angular acceleration;
- commanded torque;
- actual constraint/actuator torque;
- torque rise rate;
- joint stiffness where derivable;
- damping contribution;
- ground-reaction force;
- foot loading;
- support state;
- COM position/velocity;
- pelvis orientation;
- trunk orientation;
- segment linear/angular momentum;
- total momentum;
- controller work;
- passive/elastic energy if represented;
- actuator saturation;
- contact impulses;
- tackler response.
Pay special attention to 0–25, 25–50, 50–80 and 80–120 ms after first contact.
Identify what movement comes from:
1. contact impulse;
2. passive mechanics;
3. pre-existing muscle/postural activation.
No post-contact active feedback should contaminate those categories.
9. Visual review
Re-render from the corrected TRC-1 mapping.
Give me a simple synchronized comparison:
CURRENT V2 | PHYSIOLOGICAL PRE-REFLEX
Use:
- Touchline gameplay camera at 1×;
- 6–8× close-up;
- 0.25× and 0.1×;
- frame stepping;
- contact-time jump;
- optional mesh+collider view;
- optional skeleton/COM/ground-contact overlay.
Keep the tackler and collision identical.
Clearly mark 0 ms, ~40 ms, ~80 ms and ~120 ms.
Do not show later active-balance behaviour in the primary A/B judgement. I want to judge the passive/pre-reflex mechanics in isolation.
10. Do not confuse softness with realism
A floppy ragdoll is not success.
The player is an already-active athlete supporting his own weight immediately before contact.
The correct target is:
loaded and athletic, but compliant under external disturbance.
B must still be capable of:
- supporting standing;
- maintaining useful posture;
- transmitting force;
- resisting small disturbances;
- yielding progressively to larger disturbances.
Investigate whether stiffness should be nonlinear/load-dependent rather than simply lowering every pose spring.
11. Hard scientific question
I ultimately want you to distinguish between these two possibilities:
Model 1: V2 fundamentally needs a different representation of passive/pre-activated human mechanics.
Model 2: V2's existing actuator/controller architecture is sufficient, but its current parameters/control law are wrong.
Determine which the evidence supports.
Do not redesign V2 unnecessarily if the existing architecture can express the required mechanics.
12. Autonomy
You may research, preregister, implement B, run the frozen tests, diagnose failures, improve tooling, generate visual evidence and perform clearly labelled read-only/post-hoc diagnostics.
Do not tune repeatedly against the PVP visual until it looks good.
If B fails its preregistered criteria, preserve that result and diagnose it. A successor design may be proposed separately.
Do not:
- modify the slide;
- implement recovery stepping;
- continue ABI active-balance development;
- change impact magnitude;
- change colliders;
- modify RUN-1;
- modify authoritative simulation;
- change PVP outcome semantics.
13. Final report
When finished, give me:
1. what was physically wrong with CURRENT V2;
2. what B changes and why;
3. whether B passed its preregistration;
4. whether the first 0–120 ms looks materially more human;
5. whether the struck leg now yields plausibly;
6. whether pelvis/trunk/arms respond naturally through mechanical coupling;
7. whether standing/no-contact behaviour remains sound;
8. whether B remains capable of losing balance;
9. whether V2's existing architecture was sufficient;
10. any genuine V2 body limitation discovered;
11. CPU cost and determinism;
12. what remains for delayed active balance;
13. what remains for reactive stepping;
14. exact commits/files;
15. one exact localhost URL for visual A/B review.
Include a short “What surprised me” section.
Stop after PPR-1 for my visual review. Do not proceed to active balance, stepping or slide development.
The success criterion is not “the player stays upright” and not “the tackle looks dramatic.”
Success means that before a collision-triggered nervous-system response could plausibly occur, the V2 footballer already behaves like a loaded, compliant human body rather than a rigid pose-controlled mannequin.
