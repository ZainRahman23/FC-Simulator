# User instruction, 2026-10-16 (verbatim): PIVOT MISSION — TURN-1, turning + cutting locomotion foundation for physics-based dribbling

- Pasted by the owner into the Claude Code session at 2026-10-16T03:06:37.782Z UTC (EEST = UTC + 3), interrupting the post-limit resume. It stops the queued TACKLE-REACTION-1 task (another agent owns the tackle line).
- Saved under the standing rule (every owner instruction verbatim). The block below is reproduced exactly as received.

---

PIVOT MISSION — TURN-1: TURNING + CUTTING LOCOMOTION FOUNDATION FOR PHYSICS-BASED DRIBBLING
We are changing missions.
STOP the slide-tackle task currently queued in this session. Do not continue implementing TACKLE-REACTION-1.
Another agent has taken over that work and has already progressed it substantially beyond the state represented by the prompt currently in your context.
Preserve all of your existing tackle work and records. Do not undo, overwrite or reinterpret them. But do no further tackle work in this mission.
We are moving to the next major Touchline system:
turning and cutting locomotion, as the foundation for physics-based ball movement and dribbling.

You have a long runway.
I want meaningful implementation progress, not merely a design document.
You may:
- inspect all current locomotion code and artifacts;
- inspect current repository history;
- research football turning/cutting biomechanics and animation approaches;
- inspect references;
- build diagnostic harnesses;
- author skeletal motion;
- implement transition/resolver logic;
- iterate;
- reject failed candidates;
- build review pages;
- commit coherent milestones locally.
Do not stop at the first imperfect result.
1. PRODUCT DIRECTION
The next major goal after this milestone is:
a footballer whose body locomotion drives/interacts with a genuinely physical ball, rather than the ball simply being attached to a canned dribble animation.

Eventually we want:
player movement
-
physical foot/ball contact
-
physical ball velocity/spin/contact
=
dribbling.
Before attempting that, the locomotion system needs credible:
- turns;
- cuts;
- changes of direction;
- deceleration into turns;
- reacceleration out of turns;
- appropriate foot plants.
Right now we already have locomotion work covering approximately:
- sprint;
- run;
- jog;
- fast walk.
We do not yet have a proper turning/cutting system.
That is this mission.
2. FIRST: RECONSTRUCT THE CURRENT LOCOMOTION SYSTEM
Do not assume old handoffs are current.
Inspect the repository and determine the actual latest state of:
- RUN-1;
- sprint;
- jog;
- fast walk;
- locomotion transitions;
- current root-motion architecture;
- skeletal animation system;
- active rigidbody/physical-character coexistence where relevant;
- current fixed Touchline camera;
- character scale;
- current foot-ground/contact representation;
- any existing turning experiments.
Search rather than guessing paths.
Current repository/code wins over historical notes if they conflict.
Document the actual starting point before modifying it.
3. DO NOT BUILD PHYSICS-GENERATED LOCOMOTION
This remains a hard product decision.
We are NOT building:
- muscle-generated running;
- tendon-driven gait;
- a physical gait controller;
- procedural locomotion from first principles.
Locomotion remains fundamentally:
authored skeletal athletic motion with physical bodies/contact available underneath it.

Turning and cutting should follow the same philosophy.
4. WHAT “TURNING” MEANS
Do not implement turning as:
rotate root toward desired heading
while continuing the same forward run cycle.
That will look like skating/turret rotation and will be especially bad once a physical football is involved.
A footballer changing direction should visibly:
- anticipate/decelerate where appropriate;
- choose/use a plant foot;
- load that leg;
- lean appropriately;
- redirect the pelvis;
- redirect the torso;
- move the COM relative to support;
- rotate through the hips;
- push away from the plant;
- take an appropriate first step into the new direction;
- accelerate out.
The motion must communicate:
the ground/plant created the change of direction.

5. DISTINGUISH CURVING FROM CUTTING
These are not the same action.
Build/design for at least two concepts:
A. CONTINUOUS TURN / ARC
For relatively small heading changes.
Examples:
- 10°;
- 20°;
- 30°;
- perhaps ~45° depending on speed.
The athlete should be able to bend the running path naturally without a dramatic planted cut.
B. COMMITTED CUT
For larger/faster changes of direction.
Examples:
- ~45°;
- 60°;
- 90°;
- 120°+ where appropriate.
This should involve a readable plant/load/redirection action.
Do not force every 15° steering correction through a large cut animation.
Do not allow a sprinting player to make a 120° turn merely by curving the root.
6. SPEED MATTERS
The same requested heading change should not produce the same motion at:
- fast walk;
- jog;
- run;
- sprint.
At higher speed:
- turning radius should generally increase;
- large direction changes require greater deceleration;
- plant/load should become more pronounced;
- the player cannot instantly redirect full velocity;
- reacceleration matters.
At low speed, sharper pivots may be possible with much less dramatic movement.
Build the architecture around:
incoming velocity + requested direction change
rather than angle alone.
7. LEFT/RIGHT AND FOOT SELECTION
Turning must understand:
- current stride phase;
- current support foot;
- current swing foot;
- desired turn direction;
- which plant is appropriate;
- how soon an appropriate plant can occur.
Do not arbitrarily snap into a cut regardless of stride phase.
Investigate how much of the system can be produced through:
- mirroring;
- phase selection;
- a small authored library.
We want the minimum authored set that produces convincing full coverage.
8. DO NOT AUTHOR EVERY ANGLE
I do not want:
- 10° animation;
- 20° animation;
- 30° animation;
- 40° animation;
- 50° animation;
- etc.
Determine a small set of biomechanically distinct authored bases and interpolate/procedurally redirect within safe ranges.
Research/experiment to determine what those bases should be.
A possible structure might involve:
- gentle arc;
- moderate cut;
- hard ~90° cut;
- sharp reverse/pivot.
But do not blindly adopt those categories. Determine the minimum useful set from evidence and visual testing.
9. FOOT PLANT IS CRITICAL
This system will later drive physical dribbling.
Therefore the foot plant cannot merely look approximately correct.
Track:
- plant-foot world position;
- plant-foot orientation;
- contact timing;
- slip;
- pelvis relative to plant;
- COM relative to plant;
- push-off timing.
During the main load/redirection phase, the plant foot should not visibly skate across the turf.
Use IK/procedural adjustment where appropriate, but do not create impossible leg geometry.
10. MOMENTUM / ROOT TRAJECTORY
Preserve the basic logic of momentum.
A player running east at high speed who requests north should not instantly acquire full northward velocity.
The trajectory should show:
incoming velocity
→ deceleration/redirection
→ new outgoing velocity.
We do not need a full physical locomotion simulation.
But the authored/root trajectory must be physically coherent enough that future ball interaction makes sense.
Record:
- velocity vector;
- speed;
- heading;
- facing;
- curvature;
- acceleration;
- plant timing.
11. BODY FACING ≠ VELOCITY DIRECTION AT EVERY INSTANT
Do not force the torso/pelvis to always face exactly along the velocity vector.
During football cuts there may be meaningful transient differences between:
- gaze;
- shoulders;
- pelvis;
- travel direction.
This will later matter greatly for:
- dribbling;
- shielding;
- feints;
- passes;
- shots.
Build the turning system so those concepts are not permanently welded together.
12. START WITH NO BALL
Do not implement physics-based dribbling yet.
First prove the player's locomotion.
If the feet, pelvis and trajectory are wrong without a ball, attaching a physical football will make diagnosis much harder.
TURN-1 is a no-ball locomotion milestone.
13. BUT DESIGN EXPLICITLY FOR THE BALL
Although there is no ball in TURN-1, expose the facts the future dribbling system will need.
At minimum:
- left/right foot world transforms;
- foot linear velocities;
- foot angular velocities if useful;
- support state;
- stride phase;
- plant timing;
- swing trajectory;
- pelvis velocity;
- character velocity;
- desired movement direction;
- actual movement direction;
- turn/cut state.
Future DRIBBLE-1 should be able to ask:
Where is each foot actually moving, and can it physically contact the ball?

14. FOOTBALL-SPECIFIC TURNING
Do not make this look like generic humanoid navigation.
Research football/soccer:
- cutting;
- change of direction;
- side-step cuts;
- crossover cuts;
- deceleration;
- pivots;
- body lean;
- football dribbling changes of direction.
Use references where helpful.
We care about how footballers move.
15. FIRST TEST MATRIX
Build a controlled turning harness.
Start with a straight run, then request heading changes.
At minimum test:
15°
30°
45°
60°
90°
120°
150°
180°
in both:
LEFT
and
RIGHT
where mirroring does not make separate tests redundant.
16. TEST MULTIPLE SPEEDS
At minimum:
JOG
RUN
SPRINT
if those current motions are sufficiently ready.
Fast walk can be added if inexpensive.
I want to see how the same requested turn changes with speed.
17. DO NOT REQUIRE EVERY ANGLE TO COMPLETE AT FULL SPEED
A 180° input while sprinting should not necessarily produce:
instant 180° sprint.
A legitimate result may be:
brake → plant → pivot/cut → accelerate opposite direction.
Likewise, some large-angle requests may take multiple steps.
That's desirable if it looks athletic and responsive.
18. RESPONSIVENESS STILL MATTERS
Do not use realism as an excuse for sluggish controls.
Touchline needs to feel responsive.
We can dramatize/accelerate athletic transitions somewhat if necessary.
The foundation should remain credible, but this is a football game.
Prefer:
readable, responsive, athletic
over:
perfect laboratory biomechanics but controls feel delayed.
19. BUILD AN INPUT→LOCOMOTION RESOLVER
Eventually the system should accept something conceptually like:
- current speed;
- current velocity;
- current facing;
- desired movement vector;
- current gait;
- stride phase;
and resolve:
- continue straight;
- curve;
- moderate turn;
- hard cut;
- decelerate/pivot;
- accelerate out.
Implement the smallest useful V1 resolver.
Avoid hundreds of bespoke states.
20. TRANSITIONS ARE PART OF THE MISSION
A beautiful isolated 90° cut is not enough.
Test:
RUN → CUT → RUN
not merely:
CUT animation by itself.
Entry and exit must not contain:
- pose pops;
- foot teleportation;
- root snapping;
- visible skating;
- frozen pauses.
21. CONTINUOUS INPUT
A player may change the desired direction while already turning.
Do not assume every cut completes exactly as originally requested.
At least investigate:
- input changes during curve;
- input changes before plant;
- input changes after plant.
For V1, it is acceptable for a committed hard cut to have a short commitment window once the plant begins.
Document it.
22. ANIMATION / PHYSICS COEXISTENCE
Preserve the physical-character architecture underneath locomotion where it already exists.
Characters must remain collidable.
Do not make turning require kinematic bodies that phase through other players.
However, do not reopen HAC-1/general balance work.
For ordinary locomotion contact, V1 may still use:
animation continues + colliders prevent penetration/separate bodies.
TURN-1 is about locomotion motion quality, not bump recovery.
23. CAMERA
Judge everything in the actual Touchline camera context as well as useful diagnostic views.
A motion that is biomechanically sophisticated but unreadable at gameplay scale has limited value.
Provide close diagnostic views, but always include the real gameplay camera.
24. VISUAL ACCEPTANCE
At 1× I should immediately be able to distinguish:
gentle steering
from
a real planted football cut.
For larger cuts I should perceive:
approach
→ plant/load
→ body lean/redirection
→ push
→ first step into new direction
→ acceleration out.
It should NOT look like:
run animation + root rotates.
25. BUILD A REVIEW PAGE
Make review efficient.
Suggested first matrix:
Turn    JOG    RUN    SPRINT
15°    video    video    video
30°    video    video    video
45°    video    video    video
60°    video    video    video
90°    video    video    video
120°    video    video    video
150°    video    video    video
180°    video    video    video


You may reduce redundant cells if evidence justifies it.
Prioritize 1×.
Provide 0.25× diagnostic playback where useful.
26. PATH / FOOT DEBUG VIEW
Add a diagnostic view showing:
- requested direction;
- actual velocity vector;
- facing;
- pelvis heading;
- left/right foot trajectories;
- plant foot;
- support phase;
- COM trajectory;
- root trajectory.
This will be extremely useful when DRIBBLE-1 begins.
27. MEASURE FOOT SLIP
Report plant-foot horizontal displacement while meaningfully loaded.
I want an objective way to detect:
“looks like the player planted”
but the foot actually moved 20 cm across the turf.
Do not chase literal zero if tiny motion is visually irrelevant.
28. DETERMINE THE MINIMUM AUTHORED LIBRARY
One of the most important outputs from TURN-1 is:
How many genuinely distinct authored turning/cutting motions do we need?

Determine this experimentally.
Tell me:
- which motions can safely interpolate;
- which can mirror;
- which require distinct biomechanics;
- what speed variants are genuinely necessary;
- what can be procedurally redirected.
Keep the library small enough to ship.
29. DO NOT START BALL PHYSICS UNTIL TURN-1 IS REVIEWABLE
Resist scope creep.
Do not spend the mission implementing:
- ball rigidbody tuning;
- dribble touches;
- ball-foot collision;
- ball spin;
- possession logic.
Those are next.
But architect TURN-1 so those systems can consume its actual foot motion.
30. PRESERVE SIMULATION/PRESENTATION BOUNDARY
Touchline's foundational rule remains:
simulation decides what happens; animation visually explains what happened.

TURN-1 is presentation/physical-character locomotion work.
Do not silently make animation timing determine authoritative match outcomes.
Document what locomotion facts the authoritative simulation will eventually need to expose/consume for physics-based dribbling.
31. LONG-RUNWAY AUTHORITY
You have permission to:
- research;
- author candidate motions;
- implement interpolation;
- implement foot locking/IK where justified;
- implement the turn resolver;
- reject bad approaches;
- iterate several generations;
- build tooling;
- commit coherent milestones.
Do not stop after saying:
“we need a 90° cut animation.”
Build it and test it.
32. SHIPPING MINDSET
We are trying to get Touchline out.
Do not build a universal AAA locomotion framework before showing useful results.
A small system such as:
straight locomotion + arc + moderate cut + hard cut/pivot
with mirroring/interpolation may be enough if it looks good.
Determine that from evidence.
33. STOP CONDITION
Stop for owner review once:
1. the current locomotion state has been reconstructed;
2. turning no longer looks like root rotation;
3. gentle turns are visually convincing;
4. at least one strong planted cut is visually convincing;
5. large direction changes have plausible deceleration/plant/reacceleration;
6. left/right works;
7. RUN → TURN/CUT → RUN transitions work;
8. foot slip is measured and visually acceptable;
9. a first V1 resolver exists;
10. the minimum authored library has a concrete recommendation;
11. a useful review page exists;
12. the architecture is ready to become the locomotion input to physical dribbling.
FINAL REPORT
End with:
LATEST LOCOMOTION STATE RECONSTRUCTED: YES / PARTIAL / NO
GENTLE ARC TURNING: PASS / PARTIAL / FAIL
MODERATE TURNING: PASS / PARTIAL / FAIL
HARD CUT: PASS / PARTIAL / FAIL
90° CHANGE OF DIRECTION: PASS / PARTIAL / FAIL
120–150° CHANGE OF DIRECTION: PASS / PARTIAL / FAIL
180° REVERSAL: PASS / PARTIAL / FAIL
JOG COVERAGE: PASS / PARTIAL / FAIL
RUN COVERAGE: PASS / PARTIAL / FAIL
SPRINT COVERAGE: PASS / PARTIAL / FAIL
LEFT/RIGHT MIRRORING: PASS / PARTIAL / FAIL
PLANT FOOT SLIP: PASS / PARTIAL / FAIL
RUN→CUT TRANSITION: PASS / PARTIAL / FAIL
CUT→RUN TRANSITION: PASS / PARTIAL / FAIL
CONTINUOUS INPUT HANDLING: PASS / PARTIAL / FAIL
V1 TURN RESOLVER: PASS / PARTIAL / FAIL
MINIMUM AUTHORED LIBRARY IDENTIFIED: YES / PARTIAL / NO
PHYSICAL CHARACTER/COLLISION COMPATIBILITY PRESERVED: YES / NO
DETERMINISM: PASS / FAIL
READY FOR OWNER VISUAL REVIEW: YES / NO
READY TO BEGIN PHYSICS-BASED DRIBBLING AFTER OWNER APPROVAL: YES / NO
Then give me:
THREE VIDEOS TO WATCH FIRST
BEST GENTLE TURN
BEST HARD CUT
WORST CURRENT TURN
RECOMMENDED MINIMUM AUTHORED TURN/CUT LIBRARY
THREE BIGGEST V1 DEFECTS
EXACT RECOMMENDED NEXT STEP FOR DRIBBLE-1
PRIMARY DIRECTIVE
Pivot away from the completed tackle work. Build the missing locomotion vocabulary that physical football control requires. A player must be able to curve, plant, cut, redirect and accelerate naturally before we ask his real moving feet to control a physical ball. Keep it small enough to ship, but make the change of direction visibly come from the athlete's feet and body rather than rotating a running animation through space.
