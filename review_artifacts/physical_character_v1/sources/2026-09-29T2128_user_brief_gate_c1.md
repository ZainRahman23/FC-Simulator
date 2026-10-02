<!-- preserved verbatim from Claude session 6a70b682-ea7e-4ecb-991b-1bb65e5cd9c4, transcript line 9468. -->

APPROVED — PROCEED WITH GATE C1: UNSUPPORTED FEET-IN-PLACE BALANCE
I reviewed the independent Gate B/balance analysis.
Proceed with Gate C1 as recommended.
Gate B's motor architecture is accepted, but revise its interpretation:
- limb-level target tracking/contact results remain valid;
- whole-body shove/recovery results that depended materially on the temporary pelvis support must be labelled support-assisted, not evidence of autonomous balance;
- the temporary pelvis support is now retired from all new physical-character tests.
Preserve it only as a clearly labelled historical Gate B fixture so Gate B remains reproducible.
Do not commit or push.
1. GATE C1 QUESTION
Gate C1 answers:
Can the 14-body physical character maintain and recover ordinary double-support standing using only physically meaningful joint torques and ground reactions through its planted feet — and honestly fall when that is no longer possible?

This is feet-in-place balance.
No corrective stepping yet.
No locomotion.
No tackling.
No second character.
2. REMOVE ARTIFICIAL ROOT SUPPORT
In every Gate C1 test:
zero direct pelvis/root support force or torque.
Assert this numerically.
No hidden:
- pelvis spring;
- world-space root anchor;
- kinematic root;
- position correction;
- velocity correction;
- teleport;
- invisible upright force.
Every stabilising external force on the character must ultimately come from physical ground contact through the feet.
Balance control may alter finite joint targets/torques so that the character pushes against the ground appropriately.
3. KEEP THE SINGLE PHYSICAL STATE
Jolt bodies remain the only character spatial state.
The controller observes the solved physical body and generates finite target changes for the next physics step.
Never overwrite the resulting body transforms.
Architecture:
intent
→ physical sensing
→ support/balance state
→ target composer
→ existing finite motors
→ Jolt articulation + ground contact
→ actual physical state
→ repeat.
4. PHYSICAL SENSING LAYER
Implement explicit deterministic sensing for:
Whole body
- centre of mass position;
- centre of mass velocity;
- relevant angular momentum / body lean;
- gravity direction;
- capture point / extrapolated COM if supported by the selected model;
- support polygon/region;
- COM and capture-point margins relative to support.
Per foot
Track an explicit physical contact state such as:
- AIR;
- TOUCHDOWN;
- FLAT/PLANTED;
- HEEL;
- TOE;
- EDGE;
- SLIPPING;
- LIFTOFF
or a simpler equivalent if the evidence shows fewer states are sufficient.
Also expose:
- actual contact points;
- actual landed pose;
- estimated normal load;
- tangential/shear load;
- slip velocity;
- friction state;
- planned versus actual contact.
Do not call a foot "planted" simply because animation expected it to be planted.
Physical contact determines support.
5. VERIFY JOLT-DERIVED SUPPORT MEASUREMENTS
The independent review found that despite the JS binding not exposing solved contact impulses directly:
- centre of pressure and total ground force can apparently be reconstructed from whole-body momentum change;
- per-foot load can apparently be estimated from ankle-joint impulse;
- left + right approximately reproduces the total, although unloaded feet may show roughly 26 N of error.
Reproduce and independently verify these findings before relying on them.
Document:
- equations;
- assumptions;
- error;
- failure cases.
Use these estimates for support classification if sufficiently reliable, but do not pretend they are exact contact-solver outputs.
6. STANCE TARGETS MUST COME FROM ACTUAL FEET
This is a major correction from Gate B.
Do not build the standing body downward from an authored pelvis location.
For planted stance:
solve the stance upward from the actual physical foot contacts.
The feet are where they physically landed.
Generate feasible:
- ankle;
- knee;
- hip;
- pelvis;
- torso
targets from those support conditions.
This should prevent the controller from fighting reality because an authored root says the body ought to be somewhere else.
7. BALANCE STRATEGIES
Gate C1 should implement the smallest useful combination of:
Ankle strategy
Use finite ankle/leg torque to regulate small balance errors while maintaining foot contact.
Hip strategy
For larger/faster disturbances, alter hip/trunk targets to move body momentum/COM appropriately.
Trunk control
Maintain useful world-space torso orientation through finite stance-leg/hip/spine control rather than allowing the character to jackknife merely because local joint errors remain small.
Do not script a canned "balance animation."
These responses must be feedback from actual physical state.
8. FEED-FORWARD / GRAVITY COMPENSATION
The independent review suggests representing desired stabilising effort as small changes to joint targets so that the existing finite motors produce the required torque.
That is acceptable if it remains physically interpretable.
Do not add a magical force directly to the pelvis.
Explicitly separate:
- nominal pose target;
- balance correction;
- gravity/feed-forward contribution;
- resulting motor target;
- actual motor effort.
Make those inspectable in debug.
9. MOTOR STRENGTH CORRECTIONS
Review the Gate B strength profile before using it for balance.
The independent audit identified:
- ankle dorsiflexion around 110 N·m where its cited human reference suggests roughly 45 N·m;
- per-axis torque caps can allow a multi-axis joint to exceed the intended total effort by up to about 1.7×;
- stance and swing should not necessarily use identical gains/damping.
Address these issues deliberately.
Do not simply weaken everything globally.
Establish:
- physically defensible directional/asymmetric limits where appropriate;
- a sensible total multi-axis effort policy;
- stance-foot gains;
- unloaded/swing-foot gains.
Keep this V1 simple and documented.
10. NO STEPPING IN C1
Feet-in-place means:
no deliberate corrective step.
If balance reaches a state where a step would be necessary, classify that fact but do not take the step.
Suggested support states:
- RECOVERABLE_IN_PLACE;
- STEP_NEEDED;
- UNRECOVERABLE/FALL
or equivalent.
This distinction matters.
A failure to remain standing outside the physically recoverable region is correct behavior, not a failed controller.
11. FALL HONESTLY
The controller's objective is not:
keep the player upright at all costs.
It is:
maintain balance while physically achievable.
When the physical state leaves the recoverable region and no in-place solution exists:
- stop escalating posture corrections;
- transition out of balance control;
- allow the articulated body to fall physically.
Do not:
- increase motor strength without bound;
- root-drag;
- teleport feet;
- secretly enlarge friction;
- freeze the pelvis;
- snap to a fall pose.
Gate A already proved the passive body can fall.
Use that.
12. REQUIRED C1 TESTS
Build a small deterministic suite.
A. Sensing validation
Validate:
- COM;
- COM velocity;
- support polygon;
- per-foot contact/load state;
- COP/ground-force estimate if used;
- capture-point calculation.
Include simple analytically understandable states where possible.
B. Unsupported quiet standing
20 seconds minimum.
No pelvis support.
Feet remain in place.
The body may exhibit small natural correction motion.
It should not behave like a rigid statue.
C. Graded forward pushes
Apply deterministic impulses from small to beyond recoverable.
D. Graded backward pushes
Same.
E. Graded lateral pushes
Both sides if inexpensive.
Suggested investigation range is approximately 10–70 N·s, but do not tune the controller merely to match a preconceived threshold.
Determine the actual boundary produced by the character.
F. Reaction-delay comparison
Run the same representative pushes with a 100 ms sensing/control delay.
The delayed controller should generally perform worse.
If delay makes no meaningful difference, investigate whether the controller is unrealistically anticipatory or excessively stiff.
G. Unrecoverable push
Include at least one disturbance that must result in a fall.
This is a required success case.
H. Low-friction/slip case
Reduce turf friction enough that one/both feet slip.
The controller must detect that its support assumptions changed.
It must not continue treating a sliding foot as a perfect planted anchor.
I. Strength sweep
Show weak / candidate / excessive balance authority.
Excessive strength should not become the selected solution merely because it stays upright longer.
13. DO NOT TUNE TO THEORETICAL PUSH CEILINGS
The independent analysis estimated idealized no-step capability ceilings around:
- forward ~52 N·s;
- backward ~32 N·s;
- sideways ~58 N·s.
Treat these as rough capability references only.
They assume ideal instantaneous ankle control and are not target behavior.
Realistic finite controller response should generally fail earlier.
Do not hard-code these thresholds or tune specifically to hit them.
The recoverability classification must emerge from physical state.
14. DEBUG VIEW
Extend the existing harness.
Show:
- COM;
- COM velocity;
- support polygon;
- capture point;
- COM margin;
- capture-point margin;
- COP estimate if used;
- each foot's contact state;
- each foot's load estimate;
- slip state;
- planted/swing classification;
- balance-state classification;
- nominal joint targets;
- balance target offsets;
- actual joint targets;
- motor effort/saturation;
- ground reaction estimate;
- actual body pose.
If the controller decides STEP_NEEDED, show that explicitly even though C1 is forbidden from stepping.
15. WHOLE-BODY QUALITY METRICS
Gate B demonstrated that low joint-angle error can coexist with a visually terrible 48° pelvis jackknife.
Therefore do not use joint tracking error as the primary whole-body quality metric.
Include:
- trunk/world orientation;
- pelvis orientation;
- spine curvature/error;
- COM position/velocity;
- capture point;
- support margins;
- foot slip;
- foot load distribution;
- whole-body angular momentum if useful;
- motor saturation;
- recovery time;
- fall lead time.
Flag physically/visually pathological states even when local joint errors are small.
16. C1 PASS CONDITIONS
I want evidence that:
Quiet standing
- works for at least 20 s without root support;
- uses finite physical effort;
- does not rely on extreme stiffness;
- remains deterministic.
Small disturbances
- produce visible physical displacement;
- are recovered through ground reaction and finite joint control.
Increasing disturbances
- produce progressively larger response;
- eventually transition from recoverable → step-needed → fall.
Low friction
- changes support classification appropriately.
Delayed sensing
- measurably degrades recovery.
Unrecoverable state
- results in an honest physical fall.
There must be zero direct pelvis/root support impulse in every C1 test.
17. PERFORMANCE / RESOURCE LIMITS
Preserve the lightweight workflow:
- one character;
- one process/browser;
- sequential tests;
- no Reference Tackle;
- no second player;
- no ball;
- no match;
- no full regression suites;
- no parallel headless captures;
- no giant parameter sweep.
Keep the current 240 Hz setup initially.
Do not optimize the physics frequency in this pass unless C1 exposes a concrete reason.
Keep my Mac cool.
18. NOT YET
Explicitly do not implement:
- corrective stepping;
- walking;
- running;
- locomotion;
- tackle animation;
- two-player collision;
- protective fall choreography;
- authored recovery/get-up;
- player attributes;
- learning/optimization-based controllers;
- external pelvis/root forces;
- Reference Tackle.
Those are later gates.
19. PRESERVE PREVIOUS GATES
Gate A must remain reproducible.
Gate B must remain reproducible with its historical temporary support fixture clearly labelled.
New C1 tests must assert that the fixture is absent.
Do not rewrite historical evidence to make the development look cleaner than it was.
DELIVERABLE
Give me:
1. interactive C1 review harness;
2. unsupported 20 s standing test;
3. graded push tests;
4. delayed-reaction comparison;
5. low-friction test;
6. honest-fall test;
7. strength comparison;
8. sensing validation;
9. exact balance equations/controller;
10. support-state classifier;
11. foot-contact/load methodology;
12. motor strength/torque changes from Gate B;
13. balance/recovery metrics;
14. determinism result;
15. performance result;
16. known failures;
17. your assessment of whether C1 passes.
Then STOP.
Do not start C2.
Do not implement stepping.
Do not start two-player contact.
Do not commit or push.
I will visually review C1 before we proceed.
