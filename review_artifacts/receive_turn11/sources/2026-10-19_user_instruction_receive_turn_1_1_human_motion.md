We are happy with the current RECEIVE-TURN technical foundation.

The **technique selection, foot choice and ball-touch behavior look good**.

Do NOT redesign those systems.

The remaining problem is:

> **The turn/body animation needs to look like a real human footballer performing the action.**

This is now primarily a **presentation / animation / body-motion assignment**, not a Ball Control or receive-physics assignment.

# 1. FREEZE THE FOOTBALL DECISION FOR THIS WORK

Treat the current RECEIVE-TURN result as authoritative.

Preserve:

- selected technique;
- contact foot;
- contact surface;
- authoritative contact timing;
- ideal first-touch vector;
- Ball Control execution error;
- resulting actual ball state;
- desired exit direction;
- preferred-foot logic;
- technique feasibility;
- left/right mirroring;
- Alternative-B Ball Control behavior;
- bounded execution variance.

Do NOT improve the visual by changing the simulation result.

The foundational Touchline rule remains:

> **Simulation decides what happens. Animation visually explains what happened.**

---

# 2. CURRENT TECHNIQUES ARE ENOUGH

Work with the existing four technique families:

```text
DIRECTIONAL RECEIVE
HALF-TURN
OUTSIDE-OF-FOOT TURN
THROUGH-STANCE TURN
```

Do NOT add lots of new turn techniques during this task.

Make these four look convincing first.

---

# 3. THE CURRENT PROBLEM

The procedural body currently communicates:

```text
which foot contacts
where the contact occurs
where the player turns
where the ball goes
```

but it does not yet convincingly communicate:

> **a human footballer shifting their weight, preparing their body, contacting the ball, rotating, and accelerating out of the turn.**

The body should not look like a rigid object rotating around a vertical axis.

The turn should emerge from coordinated:

```text
eyes/head
shoulders
torso
hips
plant foot
contact leg
free leg
centre of mass
weight transfer
steps
```

---

# 4. DO NOT ROTATE THE WHOLE PLAYER AS ONE BLOCK

Avoid:

```text
contact
→ rotate root/body X degrees
→ run
```

That will look robotic.

A human turn should generally involve overlapping motion:

```text
anticipation
↓
upper-body preparation
↓
support-foot placement
↓
contact
↓
hips/body rotate through contact
↓
weight transfers
↓
recovery/exit step
↓
acceleration onto new line
```

These phases can overlap substantially.

---

# 5. ROTATION SHOULD BEGIN BEFORE CONTACT

For most receive-turns, the player already knows the desired exit direction.

Therefore body preparation should begin while the ball is approaching.

Depending on technique:

```text
head checks / turns
shoulders begin opening
hips prepare
support foot adjusts
centre of mass shifts
contact foot presents correct surface
```

before the ball arrives.

Do not keep the player perfectly square until the contact frame and then suddenly rotate.

---

# 6. BODY PARTS SHOULD LEAD AT DIFFERENT TIMES

Human rotation should propagate through the body.

A useful general pattern is:

```text
head / gaze
→ shoulders
→ torso
→ hips
→ legs / exit step
```

but do not force the exact same sequence on every technique.

The hips and support foot are particularly important for believable football turning.

---

# 7. WEIGHT TRANSFER

Every turn needs believable support.

At any important moment, it should be understandable:

> Which leg is supporting the player's weight?

The player should not appear to rotate while evenly floating between both feet.

Model clear transitions such as:

```text
approach stance
→ weight onto support leg
→ contact leg becomes available
→ contact
→ weight transfers
→ exit leg accepts body
```

The centre of mass should follow that support structure.

---

# 8. PLANT FOOT MATTERS

The support/plant foot should establish the turn.

Its:

```text
position
orientation
knee flex
timing
```

should help explain the upcoming rotation.

Do not allow feet to slide across the turf merely to accommodate the desired root orientation.

Foot plants should feel planted.

---

# 9. USE KNEE/HIP FLEXION

Players should lower or adjust their centre of mass appropriately.

Especially on larger turns, some combination of:

```text
hip flexion
knee flexion
ankle flexion
torso lean
```

should make the movement feel athletic rather than upright and mechanical.

Do not exaggerate into a squat.

---

# 10. MOMENTUM SHOULD FLOW THROUGH THE TURN

Even though this first library begins from a nominally stationary receiver, once the receive action starts the body develops momentum.

Do not visually reset momentum between:

```text
first touch
turn
exit
```

The action should feel continuous.

---

# 11. DIRECTIONAL RECEIVE — HUMAN MOTION

For approximately small direction changes:

```text
0–60°
```

the motion should be subtle.

Likely:

```text
slight pre-opening
small support-foot adjustment
inside-foot presentation
touch into space
hips follow ball
one natural exit step
```

Do NOT make this look like a dedicated skill move.

It should almost disappear into normal football movement.

---

# 12. HALF-TURN — HUMAN MOTION

This is one of the most important everyday football receives.

The player should:

```text
recognize exit side
↓
open body before ball arrives
↓
become partially side-on
↓
present back foot
↓
receive across/open body
↓
transfer weight
↓
continue onto new line
```

The player should not:

```text
trap ball square
→ pivot afterward
```

It should read as one continuous receive-and-open action.

---

# 13. 90° HALF-TURN

Use 90° as a primary animation calibration case.

I want to clearly see:

- body begins opening before contact;
- support foot plants naturally;
- back foot receives;
- shoulders/hips are already rotating;
- touch enters intended space;
- next step carries player onto exit line.

This should become an extremely polished reference action.

---

# 14. 120–135° LARGE HALF-TURN

For larger half-turns, increase:

```text
pre-contact body preparation
support-foot reorientation
hip rotation
torso counter-rotation
post-contact recovery step
```

Do not simply play the 90° motion and rotate its root farther.

The body mechanics should respond to the larger turn demand.

---

# 15. THROUGH-STANCE TURN — CRITICAL ACTION

Spend substantial attention here.

This is our large-turn / Gravenberch-like family.

The authoritative football action is already correct:

```text
far foot
→ inside-foot contact
→ ball travels behind/across standing leg
→ player rotates around the action
→ rejoins ball on new exit line
```

Do NOT change that geometry merely to make animation easier.

Instead make the body convincingly explain it.

---

# 16. THROUGH-STANCE BODY SEQUENCE

For a representative large turn, think approximately:

```text
1. Player recognizes desired exit direction.

2. Head/shoulders begin rotating toward that side.

3. Player establishes the standing/support leg.

4. Far/contact leg prepares across the body.

5. Hips begin turning while torso balances/counter-rotates.

6. Inside of far foot contacts the incoming ball.

7. Ball travels behind/across the standing leg along the authoritative first-touch vector.

8. Contact leg continues naturally rather than snapping back.

9. Player pivots/transfers weight around the planted leg.

10. Free leg steps through toward the exit.

11. Hips and shoulders complete their alignment.

12. Player rejoins the ball and accelerates onto the desired line.
```

This should read as **one continuous football movement**.

---

# 17. BALL VECTOR AND BODY VECTOR ARE DIFFERENT

Remember:

```text
first-touch ball direction
≠
final player exit direction
```

especially for the through-stance turn.

Do not rotate the player's body so that the contact foot simply kicks directly along the final exit line.

The interesting part of the technique is precisely that the ball takes an intermediate path while the player rotates around it.

---

# 18. 150° AND 180° TURNS

Use both as major calibration cases.

At these angles the player needs substantially more body rotation.

Make the motion athletic:

```text
pre-rotation
strong plant
clear weight transfer
hip turn
appropriate torso lean
step-through
re-acceleration
```

Do not solve 180° by spinning the root 180° in place.

There should be a believable sequence of foot plants.

---

# 19. OUTSIDE-OF-FOOT TURN

Keep the current feasibility logic.

When the action is selected, the body should naturally create room for the outside-foot surface.

This may require:

```text
support foot slightly away from ball line
contact leg internally positioned
hip orientation that exposes outside of foot
body lean balancing the redirection
```

Do not force this technique into cases where the existing simulation says it is infeasible.

---

# 20. LEFT/RIGHT MIRRORING

Mirroring must remain exact in simulation outcome.

But animation mirroring should also look anatomically convincing.

Verify:

```text
right turn
left turn
preferred right foot
preferred left foot
two-footed receiver
```

No hidden right-foot bias.

The earlier mirroring bug is already fixed; do not regress it.

---

# 21. FOOT LOCKING / NO SLIDING

During meaningful support phases:

```text
plant foot
pivot foot
exit foot
```

should not visibly slide.

Use whatever procedural foot locking / IK support is appropriate for the current prototype.

If root motion conflicts with a planted foot, adjust presentation/root trajectory—not the authoritative ball.

---

# 22. BALL MUST NEVER FOLLOW THE ANIMATION

This is non-negotiable.

Do NOT:

```text
attach ball to foot
move ball to animation contact
change authoritative contact position
change authoritative ball trajectory
```

to improve visuals.

The animation must meet the simulation.

Not the reverse.

---

# 23. CONTACT SYNCHRONIZATION

The contact foot should visually reach the authoritative contact location at the authoritative contact time.

Use procedural adjustment/IK as necessary.

But preserve:

```text
contact tick
ball state
ball launch
```

exactly.

---

# 24. PROCEDURAL ADAPTATION AROUND AUTHORED MOTION

The likely architecture should be:

```text
selected receive technique
↓
authored/reference body motion
↓
parameterize for actual turn angle
↓
procedural root adjustment
↓
foot/contact IK
↓
grounding / support-foot locking
↓
final visual pose
```

Do not procedurally invent the entire body pose independently every frame if a coherent reference motion can provide better human movement.

---

# 25. PARAMETERIZE WITHIN A TECHNIQUE

A 75° and 120° half-turn should not require completely unrelated systems.

Within a technique family, allow sensible adaptation of:

```text
pre-open amount
hip rotation
step length
root path
contact reach
exit step
timing
```

based on actual geometry.

But set safe limits.

If a technique cannot adapt naturally to a case, the simulation should already be choosing another feasible technique.

---

# 26. DON'T LET ANIMATION CHOOSE THE TECHNIQUE

The simulation/action resolver already selects the technique.

Animation receives:

```text
technique
turn angle
turn side
contact foot
contact surface
contact time
contact position
ideal/actual ball vector
exit direction
```

and renders it.

Animation must not say:

> this other animation looks easier, so I'll change the football action.

---

# 27. BALL CONTROL RATINGS MUST NOT CHANGE THE TECHNIQUE ANIMATION FAMILY

For matched cases:

```text
BC50
BC70
BC90
BC99
```

the same selected technique should remain recognizable.

Ball Control changes the resulting touch.

Animation adapts to the actual ball result.

Lower BC may therefore require:

```text
longer recovery step
different rejoin point
additional follow-up touch
later acceleration
```

But do not make low BC perform an entirely different canned turn solely because of rating.

---

# 28. 99 REFERENCE

BC99 should be the clearest visual demonstration of the authored technique.

At 99:

```text
contact nearly ideal
body motion fluid
minimal recovery
ball and body converge naturally
player exits immediately
```

Use BC99 to judge whether the base human animation itself is correct.

---

# 29. LOWER-RATING ADAPTATION

Then test:

```text
BC90
BC80
BC70
BC50
```

The human motion should react naturally to the actual touch.

For example:

```text
BC99
→ ideal touch
→ clean step-through

BC70
→ touch slightly farther away
→ exit step lengthens / player adjusts

BC50
→ awkward touch
→ body completes turn
→ recovery step
→ perhaps second touch
```

Do not pre-script "bad animation."

React to the authoritative ball result.

---

# 30. BODY TURN SPEED — DO NOT ADD AGILITY YET

Do NOT introduce Agility scaling in this task.

Hold body capability at the current neutral/reference level.

We will later make:

```text
Agility
→ body reorientation speed/capability
```

and:

```text
Dribbling
→ technical leg/foot-action speed
```

For now, establish the correct human reference motion first.

---

# 31. NO RUNNING RECEIVES YET

Do NOT expand into receiving while already jogging/sprinting.

This assignment remains:

```text
stationary initial receiver
→ receive
→ turn
→ exit
```

Running receives are the next major extension after this foundation is visually approved.

---

# 32. BUILD A HUMAN-MOTION REVIEW PAGE

Create a dedicated review page focusing on body motion.

For each case provide:

```text
gameplay camera
top-down diagnostic
close side/front 3/4 view
slow motion
frame strip
```

I need to judge the actual movement, not just metrics.

---

# 33. REQUIRED ANGLES

At minimum show:

```text
30°
60°
90°
120°
135°
150°
180°
```

both left and right where useful.

Focus particularly on:

```text
90°
135°
150°
180°
```

---

# 34. REQUIRED TECHNIQUES

Provide clear examples of all four:

```text
Directional Receive
Half-Turn
Outside-of-Foot Turn
Through-Stance Turn
```

Do not only show the best-looking cases.

---

# 35. REQUIRED RATINGS

For major reference cases show:

```text
BC50
BC70
BC80
BC90
BC99
```

using matched execution draws where useful.

Again, the main purpose is to see how the same human movement responds to increasingly imperfect touch outcomes.

---

# 36. FRAME-BY-FRAME DIAGNOSTICS

For representative 90°, 135° and 180° actions, annotate frames for:

```text
preparation begins
support foot plants
contact leg begins swing
ball contact
maximum hip rotation
weight transfer
exit foot plant
body aligned with exit
rejoin ball
```

This will help identify robotic timing.

---

# 37. HUMAN MOTION METRICS

Do not optimize purely by numbers, but report useful diagnostics:

```text
total body rotation
rotation before contact
rotation after contact

hip rotation
shoulder rotation

plant-foot slip distance

centre-of-mass displacement

contact reach

time:
preparation → contact
contact → exit alignment
contact → ball rejoin
```

Use these to catch obvious mechanical problems.

---

# 38. NO PHYSICAL BODY SIMULATION REQUIRED

Do NOT turn this into a full biomechanical rigid-body simulation.

We explicitly allow authored animation/procedural body motion.

The body is presentation.

The ball remains authoritative physics.

We want:

> believable human football motion

not:

> physically simulate every muscle and joint.

---

# 39. RESEARCH IF NEEDED

You already completed the receive-turn research pass.

Use it.

If a specific body-motion question remains unclear, do a narrow additional reference review.

Do not restart broad research.

The task is now implementation/refinement.

---

# 40. PRESERVE ALL CURRENT RECEIVE EVIDENCE

Do not change:

```text
Alternative-B Ball Control curve
bounded variance
technique selection
technique feasibility
turn difficulty
contact results
mirroring
RECEIVE-KILL evidence
RECEIVE-CONTROL-1.1
DRIBBLE-V1
```

This assignment should be simulation-neutral.

---

# 41. ANIMATION ON/OFF MUST BE OUTCOME-NEUTRAL

Mandatory regression:

```text
animation ON
vs
animation OFF
```

must produce identical:

```text
technique
contact
ball state
follow-up
control outcome
```

across the test matrix.

---

# 42. DO NOT FREEZE AUTOMATICALLY

Build the human-motion pass and present it for review.

Do not freeze RECEIVE-TURN yet.

I want to visually approve the body motion.

---

# FINAL DELIVERABLE

Report:

1. human body-motion architecture;
2. preparation behavior;
3. support/plant-foot logic;
4. weight-transfer logic;
5. hip/shoulder sequencing;
6. root-motion approach;
7. foot-lock/IK approach;
8. authoritative-contact synchronization;
9. Directional Receive motion;
10. Half-Turn motion;
11. Outside-of-Foot motion;
12. Through-Stance motion;
13. 30/60/90/120/135/150/180° adaptations;
14. left/right mirroring;
15. BC99 reference motion;
16. BC90/80/70/50 adaptations to actual touch error;
17. plant-foot slip measurements;
18. body rotation before/after contact;
19. frame strips;
20. slow-motion clips;
21. gameplay clips;
22. animation ON/OFF neutrality;
23. deterministic verification;
24. protected-system regression;
25. known visual limitations;
26. review page/lab links.

The central instruction is:

> **The football action is already good. Do not change the foot, technique, contact, ball vector or outcome to make it look better. Make the HUMAN BODY move convincingly around the authoritative football action.**

And especially:

> **For large turns, do not rotate the player like a rigid object. Build a believable sequence of anticipation, plant, weight transfer, contact, hip/torso rotation, step-through and acceleration so the receive-and-turn reads as one continuous human football movement.**
