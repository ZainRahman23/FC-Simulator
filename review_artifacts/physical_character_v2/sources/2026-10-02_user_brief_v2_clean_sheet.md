<!-- preserved verbatim: the user's brief for the V2 design task, 2026-10-02 (pasted into the Claude Code session that produced PHYSICAL_CHARACTER_V2_SPEC.md). -->

TOUCHLINE PHYSICAL CHARACTER V2 — CLEAN-SHEET PRODUCTION BODY DESIGN
We have completed and frozen Physical Character V1.
Do not modify V1. Do not resume V1 walking work.
This is the beginning of Physical Character V2, intended to become the production physical humanoid foundation for Touchline.
This first task is research + architecture + specification only.
Do not implement V2 yet.
0. RESTORE CONTEXT FROM THE REPOSITORY
First inspect the repository/worktrees and locate the preserved V1 materials.
Start with:
- PHYSICAL_CHARACTER_V1_FINAL_HANDOFF.md
- PHYSICAL_CHARACTER_V1_LESSONS.md
- PHYSICAL_CHARACTER_V1_MANIFEST.json
- the final Unity Humanoid skeleton compatibility research/report;
- relevant recent Astra reports preserved with the project;
- the V1 final-research tag/snapshot information.
Verify the exact V1 frozen state.
Do not checkout over, edit, retag, clean, or otherwise disturb the frozen V1 worktree.
If V2 requires a new worktree/branch, propose exactly how it should be created, but do not create it during this design task unless necessary for storing design documents safely.
Read the V1 handoff and lessons completely before making architectural recommendations.
Treat V1 as a research prototype and evidence source, not as the body V2 must preserve.
1. WHY V2 EXISTS
V1 taught us a great deal:
- deterministic Jolt articulated-body simulation works;
- finite motors and physical contacts work;
- standing/balance, corrective stepping, protective behavior, two-body collisions and tackle/contact experiments produced useful mechanisms;
- instrumentation/regression/oracle tooling became strong;
- physical failure is valuable;
- render and physics skeletons should be separate concepts.
But sustained locomotion became extremely fragile.
Recent evidence showed:
- tiny command differences can produce dramatically different walking survival;
- persistent stride-to-stride speed creep remains;
- even expensive perfect-model lookahead does not universally produce robust walking;
- prediction errors remain large relative to viable margins;
- the current gait/controller operates in a narrow region;
- several historical body/foot/controller assumptions accumulated before we had a production skeleton contract.
Therefore V2 is not a patch to V1.
It is a clean-sheet physical humanoid designed using everything V1 taught us.
2. FOUNDATIONAL TOUCHLINE RULE
Preserve this permanently:
Simulation decides what happens; animation visually explains what happened.

Physical authority means:
- actual contacts matter;
- finite actuator capability matters;
- momentum matters;
- balance can fail;
- steps can fail;
- kicks can miss;
- tackles can disrupt actions;
- characters can stumble/fall;
- animation cannot retroactively change the physical outcome.
Prohibited:
- root-motion propulsion as physical truth;
- arbitrary root velocity writes;
- pelvis pinning;
- hidden upright/support forces;
- foot teleportation;
- invisible scheduled ball impulses;
- infinite motors;
- outcome scripting.
Strong authored/procedural references are allowed.
Physics determines whether the body can actually realize them.
3. START FROM THE FINAL PRODUCTION SEMANTIC SKELETON
V2 must be designed around our researched Unity-Humanoid-compatible render/semantic skeleton contract.
Conceptually:
root
└── hips
    ├── spine_01
    │   └── spine_02
    │       └── spine_03
    │           ├── neck
    │           │   └── head
    │           ├── clavicle_L
    │           │   └── upperArm_L
    │           │       └── lowerArm_L
    │           │           └── hand_L
    │           └── clavicle_R
    │               └── upperArm_R
    │                   └── lowerArm_R
    │                       └── hand_R
    ├── upperLeg_L
    │   └── lowerLeg_L
    │       └── foot_L
    │           └── toe_L
    └── upperLeg_R
        └── lowerLeg_R
            └── foot_R
                └── toe_R

Plus appropriate branch-based deformation/twist bones.
Important:
This is a semantic/render skeleton. It does NOT imply one Jolt body per bone.
Establish explicitly how the production physics body maps onto it.
hips corresponds conceptually to the pelvis.
Do not introduce semantic hip_L / hip_R render bones merely because physics has left/right hip constraints.
toe_L/R exists in the render skeleton regardless of whether V2 initially has physical forefoot bodies.
4. DESIGN THE PHYSICS BODY FROM FIRST PRINCIPLES
Do not start by copying V1's 14-body layout.
Determine the minimum production physical segmentation appropriate for football.
Evaluate candidates for:
- pelvis;
- abdomen/lower torso;
- upper torso/chest;
- head;
- upper arms;
- forearms;
- hands;
- thighs;
- shins;
- feet;
- optional physical forefeet;
- whether a physical neck body is useful;
- whether clavicles require physical bodies or remain render/controller semantics.
For every proposed rigid body explain:
why physics needs it.
For every render bone without a rigid body explain how it is driven.
Prefer the smallest physical segmentation that preserves meaningful football mechanics.
5. ANTHROPOMETRY — DO NOT INHERIT V1 NUMBERS BLINDLY
Research credible primary/authoritative biomechanics and anthropometric sources.
Establish a defensible baseline adult football-player humanoid.
Determine:
- total height;
- total mass;
- segment lengths;
- segment mass fractions;
- segment COM locations;
- segment inertial properties/radii of gyration where available;
- shoulder width;
- pelvis width;
- thigh/shin dimensions;
- realistic foot dimensions;
- joint-centre locations.
Normalize wherever practical so V2 can later generate players of different heights/weights/proportions.
Do not tune anthropometry to make walking pass.
Separate:
human evidence
from
engineering approximations required by collider construction.
6. FOOT DESIGN — CLEAN SHEET
V1's foot became an important source of uncertainty.
Reconsider V2's physical foot from actual human/football-boot dimensions.
Determine:
- collider length;
- width;
- thickness;
- ankle location;
- heel length behind ankle;
- forefoot length;
- mass;
- inertia;
- contact geometry.
Explicitly compare:
V2-F0
one rigid physical foot;
V2-F1
foot + passive/controlled forefoot articulation.
Use the earlier V1 foot experiments as evidence, but don't let them dictate V2.
The render skeleton will have:
foot → toe
either way.
Recommend which physical version V2 should begin with and why.
Do not assume physical toes are required simply because render toes are.
7. JOINT ARCHITECTURE
Specify every physical joint.
For each give:
- connected bodies;
- anatomical joint represented;
- degrees of freedom;
- axes;
- ROM;
- hard vs soft limits;
- damping;
- passive behavior;
- motorized axes;
- expected torque envelope;
- whether limits vary by pose;
- source/evidence.
Cover at minimum:
- hips;
- knees;
- ankles;
- lumbar/trunk;
- shoulders;
- elbows;
- wrists if physical;
- neck if physical;
- forefoot if proposed.
Be careful with 3-DOF ball joints represented through physics-engine constraints.
8. HUMAN TORQUE / POWER CAPABILITY
V2 needs physically defensible finite actuators.
Research appropriate ranges for:
- hip flexion/extension;
- hip ab/adduction;
- hip rotation;
- knee flexion/extension;
- ankle plantar/dorsiflexion;
- ankle inversion/eversion if represented;
- trunk;
- shoulders;
- elbows.
Distinguish:
- maximum voluntary/isometric torque;
- dynamic torque;
- power;
- ordinary locomotion usage.
Do not simply set motors to human maximum strength all the time.
Propose an actuator model capable later of representing:
- Strength;
- acceleration/explosiveness;
- fatigue;
- injury if ever needed;
- different player bodies.
But do not design gameplay attributes in detail here.
9. COLLIDER DESIGN
V2's colliders should be designed for physical behavior first and visual correspondence second.
Specify appropriate primitive/compound geometry for:
- pelvis;
- torso;
- head;
- upper/lower limbs;
- hands;
- feet.
Avoid giant invisible volumes that materially change contacts.
Establish:
- acceptable mesh/collider offset;
- self-collision policy;
- adjacent-body collision exclusions;
- important non-adjacent collisions;
- contact margins;
- foot-ground behavior.
Account for football interactions:
- shoulder contact;
- leg contact;
- tackles;
- aerial collisions;
- falls.
10. MASS DISTRIBUTION AND INERTIA
This is critical.
Verify that the proposed rigid-body approximation reproduces reasonable:
- total COM;
- standing COM height;
- segment mass distribution;
- whole-body rotational inertia;
- leg swing inertia;
- arm counter-swing capability.
Compare quantitatively against V1 where useful.
I particularly want to know whether V1 had any physical properties that made locomotion unnecessarily fragile.
Do not claim causality without evidence.
11. SCALE / BODY VARIATION
V2 must eventually support footballers with different:
- heights;
- weights;
- limb proportions;
- builds.
Height and weight remain contextual physical metadata, not arbitrary 1–99 attributes.
Design the baseline so we can later parameterize:
human specification
→ semantic skeleton
→ physical body
→ colliders/inertia.
Do not solve customization fully now.
But avoid topology choices that make variation impossible.
12. PHYSICS ↔ RENDER MAPPING
Define the mapping contract between:
authoritative physical bodies
and
production semantic/render bones.
For each semantic bone identify whether it is:
- directly physics-driven;
- interpolated from multiple physical bodies;
- procedurally driven;
- deformation-only;
- IK/helper.
Important examples:
- root;
- hips;
- three spine bones;
- clavicles;
- twist bones;
- foot;
- toe.
The authoritative ball must never be parented/moved to satisfy render animation.
13. CANONICAL REFERENCE POSE
Production semantic skeleton:
T-pose.
Define:
- world axes;
- forward axis;
- up axis;
- bone local-axis convention;
- left/right convention;
- units;
- origin;
- root transform;
- pelvis placement;
- foot placement;
- ground plane.
We need one deterministic skeleton contract before animation authoring begins.
14. DO NOT DESIGN WALKING FIRST
This is one of the most important changes from V1.
V2 development should prove the body incrementally.
Design the following gate sequence:
V2-G0 — anatomy/static construction
Bodies, joints, colliders, mass, inertia, semantic mapping.
No active balance.
V2-G1 — passive physics
Gravity, contacts, joint limits, falls, conservation and determinism.
V2-G2 — active standing
Finite motors maintain a plausible upright stance.
V2-G3 — weight transfer
Controlled left/right and fore/aft load transfer without stepping.
V2-G4 — one step
One commanded physically plausible step.
V2-G5 — two-step transition
Step → touchdown → double support → opposite step.
This should explicitly validate the transition that became ambiguous in V1.
V2-G6 — repeated stepping
Stable in-place stepping.
V2-G7 — forward walking
Only now attempt sustained locomotion.
Later
start/stop → speed changes → turning → jogging → running → sprinting.
Define objective pass/fail criteria for each gate.
15. TRANSITION MECHANICS MUST BE A FIRST-CLASS GATE
V1 ended with an important unresolved hypothesis:
double-support / step-to-step transition planning may be the critical remaining walking problem.
V2 should not rediscover this after sustained walking fails.
Design V2-G5 specifically to measure:
- leading-leg collision;
- trailing-leg unloading;
- double-support duration;
- per-foot load transfer;
- horizontal impulse;
- COM velocity redirection;
- CoP/contact progression where valid;
- next-leg readiness;
- motor work;
- transition repeatability.
Do not prescribe the outcome yet.
Make the gate capable of telling us whether the physical transition itself is healthy.
16. REUSE V1 SOFTWARE SELECTIVELY
Audit V1 code into:
REUSE UNCHANGED
Infrastructure sufficiently body-agnostic.
PORT/GENERALIZE
Good mechanism with V1-specific assumptions.
REFERENCE ONLY
Useful evidence but shouldn't enter V2 runtime.
DO NOT PORT
V1-specific workaround/dead end.
Consider:
- Jolt setup;
- deterministic stepping;
- RNG discipline;
- body construction;
- motor system;
- actuator arbiter;
- sensing;
- C1 balance concepts;
- C3 stepping;
- C4 arms;
- C5 protective falls;
- Gate D collision handling;
- contact-event lifecycle;
- diagnostics;
- viewers;
- regression framework;
- oracle infrastructure;
- Physical Stepper.
Do not copy an entire V1 module merely because it exists.
17. PRESERVE V1 AS AN ORACLE/COMPARATOR
V1 remains frozen.
V2 should eventually be comparable against V1 on:
- standing;
- pushes;
- falls;
- collisions;
- stepping;
- computational cost.
But V2 does not have to reproduce V1 hashes.
V1's approved gates become behavioral references where appropriate, not implementation constraints.
18. PERFORMANCE FROM DAY ONE
V2 ultimately needs to scale toward 22 footballers.
Estimate:
- number of Jolt bodies/player;
- number of constraints;
- motor axes;
- contact complexity;
- controller cost;
- likely 22-player physics cost.
Do not prematurely sacrifice physical quality.
But flag any design whose topology obviously makes 22-player simulation unrealistic.
19. DETERMINISM / AUDITABILITY
V2 must retain:
- fixed-step physics;
- seeded/auditable randomness where randomness exists;
- deterministic controller decisions;
- reproducible tests;
- no presentation RNG affecting physics;
- authoritative simulation independent of rendering.
Design these requirements into the architecture rather than bolting them on later.
20. RESEARCH QUALITY
Use primary/authoritative sources where practical for:
- anthropometry;
- biomechanics;
- joint ROM;
- segment inertia;
- strength/torque;
- gait/contact mechanics.
Cite sources in the design report.
Distinguish clearly:
measured human evidence
V1 empirical evidence
engineering design choice
hypothesis requiring V2 testing.
Do not invent biological precision where the literature does not support it.
21. DESIGN FOR FOOTBALL, NOT JUST WALKING
Without implementing these actions yet, sanity-check V2 against eventual:
- acceleration;
- sprinting;
- hard deceleration;
- turning;
- cutting;
- plant-foot loading;
- kicks;
- volleys;
- tackles;
- shoulder challenges;
- shielding;
- jumping;
- aerial collisions;
- goalkeeper dives;
- falls;
- recovery.
If a body design works for slow walking but obviously prevents one of these, identify that now.
22. PRODUCE A CONCRETE V2 SPECIFICATION
I do not want a vague architecture essay.
Produce an implementation-ready specification including:
Physical body table
For every rigid body:
- name;
- mapped semantic bones;
- dimensions;
- mass;
- COM;
- inertia method;
- collider;
- parent joint.
Joint table
For every constraint:
- bodies;
- axes;
- limits;
- passive properties;
- actuator capability.
Skeleton table
Every production semantic bone and its role.
Physics/render mapping table
Anthropometric parameter table
Coordinate/reference-pose contract
V2 gate plan
V1 reuse matrix
Performance estimate
Open decisions
23. CHALLENGE THE PREMISE
I currently believe a clean V2 is preferable to continuing V1.
Do not merely agree.
After studying the preserved evidence, explicitly answer:
Is a new physical body actually justified?

Compare:
Continue V1
vs
V2 clean-sheet body.
Consider:
- known V1 fragility;
- amount of reusable infrastructure;
- body/proportion uncertainty;
- controller uncertainty;
- expected reimplementation cost;
- future football requirements.
If you conclude V2 is unnecessary, make the case with evidence.
If V2 is justified, explain exactly what it allows us to correct that cannot cleanly be corrected within V1.
24. NO IMPLEMENTATION YET
During this task:
DO NOT
- create the V2 runtime character;
- modify V1;
- tune walking;
- run long walking sweeps;
- build new locomotion controllers;
- create Blender assets;
- install Unity;
- create a Unity project;
- push anything.
Small scripts used strictly for calculations/research are fine.
Design documents may be written to a safe new V2 planning location if needed.
REQUIRED DELIVERABLE
Return with:
1. Executive recommendation
Continue V1 or build V2, and why.
2. V1 lessons that directly change V2
3. Final semantic/render skeleton contract
4. Proposed physical-body topology
5. Full physics ↔ render mapping
6. Anthropometric specification
7. Foot architecture
8. Joint architecture
9. Actuator architecture
10. Collider architecture
11. Mass/inertia validation
12. Coordinate/T-pose contract
13. V1 reuse matrix
14. V2 gate sequence with measurable pass criteria
15. Performance estimate for one and 22 players
16. Risks/open questions
17. Exact proposed branch/worktree/file layout
18. First implementation gate
Tell me exactly what you would build first after I approve the design.
Also produce a reviewable V2 architecture/specification document in the repository.
Then STOP FOR MY REVIEW.
Do not implement V2 until I explicitly approve the specification.
