# User instruction, 2026-10-16 (verbatim): TURN-1.1 — authored football cut body language

- Pasted by the owner into the Claude Code session at 2026-10-16T12:14:10.609Z UTC (15:14 EEST, UTC + 3), after the TURN-1 report (head 7b58d1a8).
- Saved under the standing rule (every owner instruction verbatim). The block below is reproduced exactly as received.

---

TURN-1.1 — AUTHORED FOOTBALL CUT BODY LANGUAGE
TURN-1 is approved as the mechanical foundation for Touchline turning and cutting.
Preserve commit 7b58d1a and the complete TURN-1 regression suite.
Do not redesign TURN-1's movement mathematics.
Freeze:
- velocity changes occurring through grounded stance;
- fixed world-space plant positions;
- stance-limited redirection;
- curve/cut/pivot resolver;
- outside-foot side-step logic;
- inside-foot crossover logic;
- braking-step planning;
- stride-phase dependence;
- pelvis facing independent of travel direction;
- continuous-input retargeting;
- left/right mirroring;
- current collision compatibility.
TURN-1 solved where and how the player changes direction.
TURN-1.1 should solve:
What does a footballer visibly do with his body when making that change of direction?

The current major defect is already identified in your report:
“The plant's body language is procedural. There are no authored plant poses or strong braking posture, so at gameplay scale the cut reads mainly through the path, the speed drop and the hip rotation.”

Fix that.
1. PRIMARY VISUAL TARGET
A committed football cut should visibly communicate:
APPROACH
→ BRAKE
→ LOAD
→ PLANT
→ LEAN / COUNTERBALANCE
→ PUSH
→ FIRST STEP INTO NEW DIRECTION
→ ACCELERATE OUT
At 1× I should be able to understand the change of direction from the athlete's body even if the trajectory line/debug overlay is hidden.
It must not look like:
running animation + procedural pelvis rotation.
2. USE TURN-1'S RECOMMENDED MINIMUM LIBRARY
Start from TURN-1's own conclusion:
CURVE
Keep procedural.
Do NOT author a special animation for gentle curved running unless visual evidence proves necessary.
SIDE-STEP PLANT
Core authored cut for approximately 45–135°.
CROSSOVER PLANT
Inside-foot variant, useful approximately up to 70° where it saves a stride.
PIVOT PLANT
Strong change-of-direction base for approximately 135°+.
STEP MODIFIERS
- braking step;
- exit / acceleration step.
This is the starting library.
Do not expand it unless visual testing demonstrates a genuinely distinct biomechanical need.
3. HERO CASE FIRST — 90° RUN CUT
Begin with:
RUN → 90° CUT → RUN
Make this excellent before spreading effort across the matrix.
TURN-1 already provides:
- plant location;
- incoming velocity;
- required redirection;
- plant foot;
- stance timing;
- outgoing trajectory.
Author the body around those facts.
At the main plant I want to see:
- clear plant-leg loading;
- knee/hip flexion appropriate to the cut;
- COM moving relative to support;
- pelvis turning through the action;
- torso lean;
- shoulder counterbalance;
- purposeful arms;
- head remaining athletic/aware;
- strong push from the planted leg;
- convincing first step into the new direction.
4. DO NOT CHANGE THE PLANT TO FIT THE ANIMATION
TURN-1 determines the mechanically valid plant.
The animation must adapt to it.
Do not move the plant location significantly merely because an authored pose wants the foot somewhere else.
Preserve the existing low plant-foot slip.
Use bounded IK/procedural adjustment where necessary.
5. AUTHOR THE WHOLE BODY
The current report specifically identifies arms/shoulders/head as high-value missing pieces.
Treat the plant as a whole-athlete action, not a leg pose.
Author:
PLANT LEG
Loads and redirects the body.
FREE LEG
Organizes for balance and the first outgoing step.
PELVIS
Turns progressively rather than snapping.
TORSO
Counterbalances incoming momentum and prepares outgoing direction.
SHOULDERS
Should visibly participate in braking/redirection.
ARMS
Athletic counterbalance rather than generic RUN-1 arm cycling.
HEAD
Stable and purposeful; may begin orienting toward the new play direction before the rest of the body completes the turn.
6. SIDE-STEP CUT CHARACTER
The outside-foot side-step should visibly read as:
approach → foot plants outside/wide → body loads over/inside that support → pelvis redirects → planted leg drives athlete away into new direction.
Avoid:
- excessive squat;
- both knees collapsing symmetrically;
- torso remaining vertical;
- arms continuing the normal run cycle unchanged.
7. CROSSOVER CHARACTER
Preserve TURN-1's useful inside-foot crossover because it can save a stride.
It should visually differ from the side-step.
The athlete should appear to redirect/cross efficiently rather than performing a wide outside plant.
Do not make this merely the side-step pose with the opposite foot.
Determine the minimum authored difference necessary to make it readable.
8. PIVOT CHARACTER
For approximately 135–180° changes:
do not try to disguise the fact that substantial braking is necessary.
A large reversal should visibly show:
deceleration → strong planted rotation/pivot → push into opposite direction.
However, fix TURN-1's current:
deep crouch for too long
appearance.
A footballer may lower significantly during a hard reversal, but should not remain sitting in a squat while waiting for the trajectory solver.
9. SPRINT 180° — IMPROVE, DON'T PERFECT
Current SPRINT_180R:
- takes five braking steps;
- reaches new direction ~1.6 s after request;
- sits in a deep crouch;
- is currently the worst visual case.
Improve it materially.
But do NOT turn this into another research project.
It is acceptable that:
full sprint → 180°
takes noticeably longer than a 60° or 90° cut.
Prioritize:
- readable braking;
- athletic posture;
- decisive pivot;
- convincing acceleration out.
Do not chase instant responsiveness at the expense of credibility.
10. BRAKING STEP
Author a reusable braking-step modifier.
At higher incoming speeds / larger requested direction changes, it should visibly communicate:
- COM lowering;
- foot contacting appropriately ahead of the body;
- leg absorbing momentum;
- torso/arms counterbalancing;
- speed reduction.
Avoid turning every braking step into an exaggerated lunge.
Scale it with required braking.
11. EXIT / ACCELERATION STEP
The first step after the plant matters almost as much as the plant.
Author a reusable exit/acceleration character:
- body begins rising from loaded posture;
- push-off is visible;
- free leg attacks the new direction;
- arms transition into acceleration;
- torso aligns progressively;
- player flows naturally back into RUN/JOG/SPRINT.
Avoid:
beautiful plant → immediate snap back to ordinary RUN-1.
12. SPEED SHOULD MODULATE THE SAME LIBRARY
Do NOT immediately author separate:
- jog 90°;
- run 90°;
- sprint 90°;
- etc.
First attempt to use the same biomechanical plant family with continuous modulation based on:
- incoming speed;
- required braking;
- turn angle;
- outgoing speed.
Higher speed may produce:
- deeper load;
- stronger lean;
- more arm counterbalance;
- longer braking preparation.
Author a separate speed-specific base only if evidence demonstrates the shared base cannot cover it.
13. ANGLE SHOULD MODULATE THE BASE
Likewise, do not author per angle.
Within a family, continuously adapt:
- plant width;
- loading;
- pelvis rotation;
- torso lean;
- arm counterbalance;
- push direction.
A 60° and 110° side-step should clearly belong to the same family while differing appropriately in intensity.
14. PRESERVE MIRRORING
TURN-1 proved exact left/right mirroring.
Preserve that advantage.
Author one side where possible and mirror.
Do not double the asset library unnecessarily.
15. RESPONSIVENESS
TURN-1 reports a sprint 90° plant latency of roughly 0.66–0.94 s depending on which foot is next.
Investigate whether the authored anticipation/braking motion can make that latency feel responsive even where the mechanically appropriate plant cannot occur immediately.
The character should begin visibly reacting to input before the decisive plant where appropriate:
- torso/head intention;
- braking;
- shortened preparation step;
- arm organization.
Do not fake the actual plant.
But don't let the player appear unaware of the command for 0.8 seconds.
16. CONTINUOUS INPUT MUST SURVIVE
Preserve TURN-1's existing rule:
before commitment/plant, input can:
- retarget;
- cancel;
- flip.
After plant commitment, only bounded adjustment is allowed.
The authored body language must follow the updated intent without popping.
Test retargets.
17. FIX THE 12 cm RETARGET FOOT SLAP IF VISUALLY MATERIAL
TURN-1 reports one retarget stress case with a ~12 cm foot slap.
Inspect it at 1×.
If visible:
fix it.
If it is effectively invisible and only appears in diagnostics:
document and accept for V1.
Do not destabilize the normal turn system merely to eliminate a synthetic edge-case number.
18. ACCEPT SMALL PIVOT SLIP IF VISUALLY INVISIBLE
TURN-1 reports approximately 1.5–2.3 cm ball-of-foot movement during pivots.
Do not chase mathematical zero automatically.
If it reads naturally as a foot rotating/pivoting under load:
accept it.
Reject only obvious skating.
19. GAMEPLAY CAMERA IS THE PRIMARY JUDGE
Judge every authored change at:
1× Touchline gameplay camera.
Close-ups are diagnostics.
The purpose of authored body language is specifically to make the cut readable at gameplay scale.
20. SILHOUETTE TEST
For major cuts, hide:
- trajectory;
- arrows;
- debug labels.
Ask:
Can I tell from the athlete alone that he is braking and cutting hard?

If not, the animation isn't doing enough.
21. DO NOT START BALL/DRIBBLING WORK
Another agent owns BALL-PHYS / BALL-FEEL.
Do not add a ball yet.
Do not implement:
- dribble touches;
- ball-foot collision;
- possession;
- touch resolver.
Finish the player's change-of-direction vocabulary first.
22. DO NOT PROMOTE TURN-1 TO AUTHORITATIVE SIMULATION LOCOMOTION YET
Your TURN-1 report recommends considering making its movement rules authoritative.
Do not make that architectural change during TURN-1.1.
For now:
preserve the current simulation/presentation boundary.
We will decide the locomotion authority contract when TURN-1.1 converges with BALL-PHYS/BALL-FEEL for DRIBBLE-1.
Do not make animation plant timing silently determine match outcomes.
23. REVIEW MATRIX
Preserve the TURN-1 regression suite, but build a focused visual review.
At minimum show:
HERO
RUN 90°
MODERATE
RUN 60°
HARD
RUN 120–135°
PIVOT
RUN 180°
SPEED STRESS
SPRINT 90°
SPRINT 180°
CONTINUOUS
zig-zag / repeated cuts.
CURVE CONTROL
gentle 15–30° curve to prove we did not turn every steering input into an authored cut.
24. BEFORE / AFTER
For the important cases show:
TURN-1 PROCEDURAL BODY
versus:
TURN-1.1 AUTHORED BODY
with identical path/plant mathematics.
This is critical.
I want to verify that the improvement comes from animation/body language rather than changing the underlying turn.
25. DIAGNOSTICS
Keep/show:
- requested direction;
- velocity vector;
- pelvis facing;
- plant foot;
- plant location;
- COM;
- foot slip;
- braking requirement;
- cut family;
- authored animation phase.
Add useful measurements for:
- torso lean;
- pelvis height/load;
- knee flexion;
- shoulder rotation;
- plant-to-push timing.
26. MINIMUM LIBRARY IS A HARD PRODUCT GOAL
Try very hard to ship with:
3 plant bases
- braking modifier
- exit modifier
- mirroring
- continuous parameterization.
Do not build a huge motion library unless this genuinely fails.
27. LONG-RUNWAY AUTHORITY
You may:
- research football cuts;
- inspect reference footage;
- author skeletal plant poses/motions;
- build interpolation;
- add bounded IK;
- add anticipation;
- iterate several generations;
- reject poor animation candidates;
- improve the review tooling;
- commit coherent milestones.
Do not stop after designing the animations.
Implement them.
28. SHIPPING MINDSET
We are close to DRIBBLE-1.
Do not chase perfect biomechanics.
The objective is:
make TURN-1's good movement rules visually read as football.

A slightly exaggerated:
- lean;
- plant;
- shoulder counterbalance;
- arm movement;
- push-off
is acceptable and may be desirable at the Touchline camera scale.
STOP CONDITION
Stop for owner review when:
1. TURN-1 path/plant mathematics remain unchanged;
2. RUN 90° has clearly authored football body language;
3. side-step plant is convincing;
4. crossover plant is visually distinct enough;
5. pivot is convincing;
6. braking is readable;
7. exit/reacceleration is readable;
8. sprint 180° is materially less crouched/robotic;
9. gentle curves remain natural;
10. transitions contain no major pops;
11. plant slip remains acceptable;
12. left/right mirroring remains correct;
13. continuous input still works;
14. deterministic replay still passes.
FINAL REPORT
End with:
TURN-1 MOVEMENT FOUNDATION PRESERVED: YES / NO
RUN 90° AUTHORED CUT: PASS / PARTIAL / FAIL
SIDE-STEP PLANT: PASS / PARTIAL / FAIL
CROSSOVER PLANT: PASS / PARTIAL / FAIL
PIVOT PLANT: PASS / PARTIAL / FAIL
BRAKING BODY LANGUAGE: PASS / PARTIAL / FAIL
EXIT/ACCELERATION BODY LANGUAGE: PASS / PARTIAL / FAIL
SPRINT 90°: PASS / PARTIAL / FAIL
SPRINT 180°: PASS / PARTIAL / FAIL
GENTLE CURVES PRESERVED: YES / NO
PLANT FOOT SLIP: PASS / PARTIAL / FAIL
CONTINUOUS INPUT: PASS / PARTIAL / FAIL
LEFT/RIGHT MIRRORING: PASS / FAIL
MINIMUM LIBRARY REMAINS 3 BASES + MODIFIERS: YES / NO
DETERMINISM: PASS / FAIL
READY FOR OWNER VISUAL REVIEW: YES / NO
READY TO CONVERGE WITH BALL-PHYS FOR DRIBBLE-1: YES / NO
Then give me:
THREE VIDEOS TO WATCH FIRST
BEST SIDE-STEP CUT
BEST CROSSOVER
BEST PIVOT
WORST REMAINING TURN
BEFORE/AFTER OF RUN 90°
THREE BIGGEST REMAINING V1 DEFECTS
EXACT RECOMMENDED DRIBBLE-1 HANDOFF
PRIMARY DIRECTIVE
TURN-1 already knows where the player should go. Do not redesign that. Make the footballer visibly earn the direction change: brake, load the correct leg, plant, lean and counterbalance, push off, and accelerate into the new direction. Use a tiny authored library layered over TURN-1's existing plant mathematics, exaggerating body language where necessary so the action reads clearly at gameplay scale. Then stop locomotion development and hand the feet to DRIBBLE-1.
