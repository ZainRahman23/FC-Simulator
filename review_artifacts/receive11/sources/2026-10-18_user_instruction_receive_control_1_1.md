We have reviewed RECEIVE-CONTROL-1.

The first version successfully proved that:

- ordinary receives can work;
- receiving at pace can work;
- 90–135° turn receives can work;
- mirrored left/right turns can work;
- a 180° receive can become one continuous turn;
- through/across-body chop-like receives can emerge;
- full-throttle exits can work;
- bad first touches/control loss can occur;
- the 90–270° turn classification works;
- deterministic behavior works;
- DRIBBLE-V1 remained frozen.

However, the aggregate foundation is not good enough:

```text
714 runs

Clean:
279 = 39%

Never touched:
213 = 30%
```

The investigation found that the major limitation is that RECEIVE-CONTROL-1 is trying to use a contact model inherited from DRIBBLE-V1.

That model was designed primarily for:

```text
ball already moving with player
→ dribbling contact
```

rather than:

```text
incoming pass
→ receiver deliberately cushions/redirections ball
```

This has led us to an important architectural decision.

# MAJOR ARCHITECTURAL CHANGE

**DO NOT continue trying to solve receiving through a detailed biomechanical/foot-surface physics search.**

Touchline does not require receiving to emerge entirely from detailed foot collision physics.

The ball remains an authoritative rigid body.

However, first touches and turn receives may be built from **authored receiving actions / animation families with explicit simulation rules for what happens at contact**.

The architecture should therefore become:

```text
incoming rigid-body ball
        ↓
receiver intent
        ↓
receive action selection
        ↓
authored preparation / body movement
        ↓
AUTHORITATIVE RECEIVE CONTACT
        ↓
desired post-contact ball state
        ↓
Ball Control / execution quality
        ↓
actual post-contact rigid-body state
        ↓
free ball physics
        ↓
receive animation completes
        ↓
DRIBBLE-V1 handoff
```

This is the architecture to implement for RECEIVE-CONTROL-1.1.

---

# 1. TOUCHLINE'S CORE RULE STILL APPLIES

The foundational rule remains:

> Simulation decides what happens; animation visually explains what happened.

But this does NOT mean every football action must emerge from unrestricted rigid-body collisions between animated feet and the ball.

For receiving, simulation may authoritatively decide:

```text
receive family
contact foot
contact timing
desired ball exit
execution quality
actual resulting ball velocity
player/body exit state
```

and animation can realize that action visually.

The resulting ball state must still be authoritative.

Animation must never secretly override a failed receive or change the outcome independently.

---

# 2. BALL REMAINS A RIGID BODY

Do not parent the authoritative ball permanently to the player.

Do not convert possession into:

```text
ballPosition = footPosition
```

every frame.

Before contact:

```text
ball follows incoming rigid-body trajectory
```

At the authoritative receiving contact:

```text
receive action
+
desired first-touch result
+
execution quality
→ new authoritative ball velocity/state
```

After contact:

```text
ball resumes normal rigid-body/free physics
```

This is enough physical authority for this system.

We do NOT need to physically simulate the detailed compliance of a boot cushioning a football.

---

# 3. STOP USING DRIBBLE-V1'S CONTACT MODEL AS THE RECEIVE SOLVER

DRIBBLE-V1 is frozen.

Its contact model was built for dribbling and should remain protected.

Do not keep increasing candidate searches or changing foot geometry until it can accept hard incoming passes.

Instead build a dedicated:

```text
RECEIVE CONTACT MODEL
```

next to DRIBBLE-V1.

Conceptually:

```text
DRIBBLE CONTACT MODEL
= ball already travelling with player

RECEIVE CONTACT MODEL
= incoming ball deliberately intercepted/cushioned/redirected
```

They may share utilities where sensible.

They should not be forced to share identical contact rules.

---

# 4. RECEIVE ACTIONS MAY BE AUTHORED

Create a small authored receive-action library.

These are not scripted outcomes.

They are **simulation action families**.

For example:

```text
ORDINARY_CUSHION
TOUCH_INTO_STRIDE
INSIDE_ACROSS_BODY
OUTSIDE_ACROSS_BODY
TURN_INSIDE
TURN_OUTSIDE
THROUGH_STANCE_TURN
BEHIND_STANDING_LEG_TURN
LARGE_TURN_RECEIVE
```

Do not necessarily use these exact names.

Use the smallest clean taxonomy that fits the existing architecture.

Each family can define things such as:

```text
valid incoming-ball geometry
valid intended exit range
preferred contact foot/surface
body preparation
nominal contact phase
nominal desired ball redirection
body rotation through the action
exit state
```

The simulation selects the family.

Animation realizes it.

---

# 5. RECEIVE INTENT

The receive planner needs:

```text
incoming ball position
incoming ball velocity

receiver position
receiver velocity
receiver facing

desired post-receive movement direction
```

From these derive:

```text
receiveTurnAngle
```

as already implemented.

Preserve the current convention and validated boundaries:

```text
89°  = ordinary
90°  = turning receive

270° = turning receive
271° = ordinary
```

Anything from:

```text
90° through 270°
```

is eligible for a turning receive.

This eligibility does not mean every such receive must use the same action.

---

# 6. ORDINARY RECEIVE

For ordinary receives, select an appropriate authored receive family.

Examples:

### Kill/cushion

Player wants the ball close.

The desired post-contact ball velocity may be very small.

### Touch into stride

Player wants to continue moving.

The desired post-contact ball state should place the ball ahead along the intended running line.

### Angled receive

Player redirects the ball moderately while continuing movement.

The critical principle is:

> The first touch should execute the player's intended next action.

Do not automatically stop the ball.

---

# 7. BALL CONTROL SHOULD GOVERN RECEIVE EXECUTION

Build RECEIVE-CONTROL-1.1 so that **Ball Control is the primary attribute governing first-touch execution quality**.

The basic model should be:

```text
receive intent
→ ideal post-contact ball state
→ Ball Control execution error
→ actual post-contact ball state
```

For example:

```text
ideal exit velocity = Videal

actual exit velocity =
    Videal
    + execution error
```

The error may affect:

```text
direction
remaining speed
touch distance
```

Keep the first version understandable.

Do not create a huge multi-attribute model yet.

---

# 8. 99 BALL CONTROL

Under clean receiving conditions:

```text
Ball Control = 99
```

should mean **almost perfect execution of the desired receive**.

If the player's intent is:

```text
kill the ball
```

then 99 Ball Control can essentially deaden it.

If the player's intent is:

```text
touch into stride
```

then 99 Ball Control should NOT stop it.

Instead it should produce almost exactly the intended touch into stride.

If the intent is:

```text
turning first touch
```

then 99 should almost perfectly execute the intended redirection.

So:

```text
99 Ball Control
≠ always stop ball
```

It means:

```text
99 Ball Control
= almost perfectly execute desired first touch
```

---

# 9. LOWER BALL CONTROL

As Ball Control decreases, execution should become less exact.

Possible effects:

```text
too much residual speed
too little residual speed
wrong exit angle
touch too far from body
touch on slightly wrong side
poorly weighted turn touch
```

Eventually:

```text
heavy touch
recovery required
opponent can intervene
ball lost
```

must remain possible.

Do NOT guarantee possession after an authored receive.

The authored action defines what the player attempts.

Ball Control determines how well it is executed.

---

# 10. DO NOT IMPLEMENT BALL CONTROL AS SUCCESS %

Do not write:

```text
Ball Control 80
= 80% successful receives
```

Instead:

```text
Ball Control
→ execution-error distribution
→ actual rigid-body result
```

Then control/loss emerges naturally.

This is the same philosophical architecture we are using elsewhere:

```text
intent
→ execution quality
→ physical state
→ outcome
```

---

# 11. TURNING RECEIVES ARE AUTHORED BODY + BALL ACTIONS

For large receive turns, do NOT require the receiving foot to directly send the ball along the final running direction.

This is extremely important.

Real footballers often use:

```text
ball redirection
+
body rotation
+
ball passing across/through stance
```

to achieve the turn.

The ball can temporarily travel in a direction that differs substantially from the player's final movement direction.

---

# 12. LARGE TURN EXAMPLE — IMPORTANT

Here is the conceptual example we discussed.

Suppose the player needs a large turn to the left.

A valid receive might be:

```text
RIGHT FOOT
inside-foot contact
        ↓
ball redirected approximately toward 240°
        ↓
ball travels through/across/behind the player's stance
        ↓
player rotates approximately 120° LEFT
        ↓
player emerges around the other side
        ↓
ball and player reconnect on the new exit line
```

This is functionally similar to the kinds of turns associated with players like Gravenberch or with a chop-like redirection.

The important concept is:

```text
BALL TOUCH DIRECTION
does not have to equal
FINAL PLAYER RUN DIRECTION
```

The touch and body rotation work together.

---

# 13. DO NOT HARDCODE 240° / 120° EVERY TIME

The:

```text
240° ball redirection
+
120° body rotation
```

example describes the mechanism.

It is NOT a universal constant.

The actual action should depend on:

```text
incoming ball direction
desired exit direction
current facing
contact foot
turn side
player momentum
available geometry
```

A family may define a **nominal local-space relationship**, but mirror/adjust it within safe authored limits.

For example, the mirrored version could naturally use the opposite foot and opposite rotation.

---

# 14. LOCAL-SPACE ACTION DEFINITIONS

Prefer defining turn actions in **player-local coordinates**.

For example:

```text
forward = 0°
right = +90°
back = 180°
left = -90° / 270°
```

or whatever convention the existing engine uses.

Then an authored action can specify:

```text
contact foot = right
surface = inside

ball redirection =
    relative local angle

body rotation =
    relative signed rotation

exit direction =
    intended movement line
```

This makes mirroring reliable.

Do not author separate arbitrary world-angle constants for every facing direction.

---

# 15. THROUGH-STANCE / GRAVENBERCH-LIKE TURN

Implement a genuine authored family for the large through/across-body turn.

The conceptual sequence is:

```text
1. Incoming pass approaches receiver.

2. Receiver already knows desired exit direction.

3. Receive planner determines that a large turn is required.

4. Player begins preparing/rotating before contact.

5. Appropriate foot is presented.

6. Inside/outside surface redirects the ball across,
   through or behind the stance.

7. Ball continues as a rigid body.

8. Player rotates around the ball's path.

9. Player emerges on the opposite/new side.

10. Ball is available on the desired exit line.

11. DRIBBLE-V1 takes over.
```

This should visually read as:

```text
receive + turn
```

not:

```text
receive
pause
turn
touch again
```

---

# 16. BODY ROTATION MAY BE ANIMATED/AUTHORED

We do NOT need a full physical rigid-body human simulation to generate the player's turn.

The player's body/root movement through a receive action may be authored.

That means an action can prescribe:

```text
pre-contact orientation change
contact pose
post-contact body rotation
root displacement
exit pose
```

within the accepted locomotion architecture.

But the simulation must own the selected action and authoritative resulting player state.

Do not let animation independently choose an exit different from simulation.

---

# 17. ANIMATION CONTACT MARKER

Each receive animation/action family should expose a deterministic:

```text
CONTACT
```

phase/event.

The authoritative receive is resolved at that contact.

Conceptually:

```text
animation/action begins
        ↓
body prepares
        ↓
CONTACT MARKER
        ↓
simulation resolves Ball Control execution
        ↓
authoritative ball velocity changes
        ↓
animation continues
        ↓
exit
```

Do not continuously force the ball to follow the foot after contact.

---

# 18. BALL ARRIVAL AND ANIMATION TIMING

The receive action must synchronize with the authoritative incoming ball.

Do not move the ball to fit the animation.

Instead, once a receive is selected:

```text
predict ball arrival/contact time
        ↓
choose compatible receive action
        ↓
schedule/time action so CONTACT coincides with ball arrival
```

Within safe limits, animation timing may be adjusted to meet authoritative contact.

If a receive action cannot physically/timingly meet the ball, choose another action or allow failure.

---

# 19. CONTACT WINDOW

Because these are authored receiving actions, do not require an infinitesimal exact collision between the rendered foot mesh and ball.

Define a sensible authoritative **receive contact window/volume** associated with the selected action.

When:

```text
incoming ball
+
scheduled contact
+
receiver action
```

meet the receive criteria, resolve the authoritative contact.

This is not ball teleportation.

It is the simulation saying:

> The selected receive action successfully made its intended football contact at this moment.

The resulting ball state is then physically authoritative.

---

# 20. NO NEED FOR DETAILED FOOT CUSHION PHYSICS

Do not simulate:

```text
boot compliance
ankle spring
micro friction
exact flesh deformation
```

to achieve a cushioned first touch.

Instead calculate the ideal receive result.

For a deadening receive:

```text
desired outgoing ball speed ≈ 0
```

For a running receive:

```text
desired outgoing velocity =
useful ball velocity along exit run
```

For a turn receive:

```text
desired outgoing velocity =
authored intermediate turn-touch vector
```

Ball Control then introduces execution error.

---

# 21. LARGE TURNS SHOULD USE INTERMEDIATE BALL STATES

Do not assume:

```text
first touch
→ ball immediately points down final exit line
```

For a big turn, we explicitly want:

```text
first touch
→ intermediate ball path
→ body rotates around/across it
→ player emerges
→ final exit established
```

This is essential for convincing 120°, 135°, 180° and similar receives.

---

# 22. EXAMPLE: LARGE LEFT TURN

For a representative large left turn, test something conceptually like:

```text
PLAYER FACING:
0°

DESIRED EXIT:
~120° left of facing

CONTACT:
inside of right foot

FIRST-TOUCH BALL VECTOR:
approximately 240° in the relevant local convention

BODY:
rotates approximately 120° left

BALL:
travels through/across the stance

PLAYER:
rotates around it

EXIT:
player collects/emerges onto desired leftward line
```

Again:

**240° and 120° are example geometry, not globally fixed constants.**

I want to see this football concept represented in the system.

---

# 23. MIRRORED VERSION

The same family must work in the opposite direction.

Conceptually:

```text
left foot
+
mirrored ball redirection
+
body rotation right
```

Do not create a system biased toward one side.

Use deterministic mirroring where appropriate.

---

# 24. 180° TURN RECEIVE

The 180° receive remains especially important.

It should be possible to:

```text
incoming pass
→ prepare body
→ first touch through/across stance
→ rotate around ball
→ emerge facing roughly opposite original direction
```

without:

```text
dead stop
→ stationary pivot
→ restart
```

There may be multiple authored 180° families depending on incoming geometry.

Start with the smallest set necessary for convincing left/right coverage.

---

# 25. FULL-THROTTLE RECEIVING

The new authored architecture should make full-throttle receiving easier.

Do not slow the player simply because the old contact solver needed time to find a legal foot collision.

If:

```text
player velocity
incoming ball
receive family
desired exit
```

are compatible, allow the authored receive to preserve substantial momentum.

For example:

```text
player at 7.8 m/s
→ receive/turn
→ temporarily redirects body/momentum as required
→ accelerates/exits naturally
```

The body animation/root path can encode the actual turn cost.

Do not preserve impossible velocity vectors through a 180° turn.

---

# 26. ORDINARY RECEIVE AT PACE

Fix the current issue where ordinary receivers can slow dramatically simply to make the meeting geometry work.

A clean ordinary receive into stride should be something like:

```text
incoming pass
→ authored touch into stride
→ ball exits at useful distance/speed
→ runner continues
```

rather than:

```text
runner brakes
→ waits for legal dribble contact
→ receives
→ accelerates
```

This is one of the main benefits of the new architecture.

---

# 27. RECEIVE FAMILY SELECTION

Use deterministic candidate selection.

Candidate score can consider:

```text
turn-angle compatibility
incoming-ball direction
incoming-ball speed
receiver speed
desired exit
contact-foot suitability
required body rotation
required ball redirection
timing feasibility
follow-through feasibility
```

Do not search an enormous continuous biomechanics space.

This should become **cheaper** than RECEIVE-CONTROL-1's current receive search.

---

# 28. BALL CONTROL EXECUTION MODEL

For RECEIVE-CONTROL-1.1, create a simple first-pass Ball Control execution model.

Do not overcomplicate it.

It should operate on the ideal result selected by the authored action.

Possible structure:

```text
ideal post-contact direction
ideal post-contact speed
ideal touch distance

          ↓

Ball Control execution error

          ↓

actual direction
actual speed
actual touch distance
```

Use seeded/keyed randomness.

99 should be nearly exact under clean conditions.

Lower values should progressively widen the execution distribution.

Expose the constants in a calibration harness.

Do NOT lock those constants without review.

---

# 29. BAD TOUCHES MUST REMAIN

Authored receive actions must not imply automatic success.

A poor execution can result in:

```text
wrong angle
too much speed
too little damping
ball too far away
ball passes onto wrong side
recovery touch needed
possession lost
```

This is especially important once Ball Control varies.

The receive family represents **intent**.

It does not guarantee outcome.

---

# 30. FIRST VERSION ATTRIBUTE SCOPE

For now make:

```text
Ball Control
```

the main receive-execution attribute.

Architect clean extension points for:

```text
Agility
Dribbling
Reactions
weak foot
pressure
fatigue
```

but do not build all of those into RECEIVE-CONTROL-1.1 unless absolutely necessary.

Eventually:

- Ball Control should govern touch precision/damping.
- Agility should help govern body-turn capability/speed.
- Weak foot should affect execution.
- Pressure should increase difficulty.

But first establish the authored receiving foundation.

---

# 31. DRIBBLE-V1 HANDOFF

Once the authored receive action completes:

```text
RECEIVE-CONTROL
→ resulting player state
→ resulting rigid-body ball state
→ DRIBBLE-V1
```

Avoid:

```text
duplicate contact
immediate same-foot retouch
velocity discontinuity
facing disagreement
intended-line disagreement
```

The handoff should be explicit.

---

# 32. PROTECT DRIBBLE-V1

DRIBBLE-V1 is frozen.

The RECEIVE-CONTROL-1.1 implementation should live beside/on top of it.

Do not change frozen DRIBBLE-V1 merely to make receive actions work.

Run the frozen regression suite afterward.

Expected:

```text
DRIBBLE-V1 evidence unchanged
TURN-1.2 unchanged
```

---

# 33. PERFORMANCE TARGET

RECEIVE-CONTROL-1 currently costs approximately:

```text
816 ms per simulated second during receive
~1.3 s CPU per receive
```

This is too expensive.

The authored-action architecture should significantly reduce this.

Do not brute-force thousands of candidate physical contacts.

Generate a small deterministic set of appropriate receive families and score them.

Report:

```text
CPU during receive
CPU after handoff
worst step
candidate counts
```

Do not compromise behavior solely to hit an arbitrary performance number yet, but demonstrate that the architecture is moving substantially in the right direction.

---

# 34. NEW TEST MATRIX

Retain the important RECEIVE-CONTROL-1 tests.

Angles:

```text
0°
45°
89°
90°
120°
135°
180°
225°
240°
270°
271°
315°
```

Receiver states:

```text
stationary
jogging
running
full throttle
```

Incoming pass directions:

```text
front
front-left
front-right
left
right
rear-left
rear-right
```

Use representative pass speeds.

Do not necessarily test every Cartesian combination if redundant.

---

# 35. SPECIFIC ACTION TESTS I WANT

Produce clear review cases for:

### A — Kill receive

High Ball Control player deliberately stops/deadens a pass.

### B — Touch into stride

High Ball Control player receives without slowing unnecessarily.

### C — 90° turning receive

Receive and turn happen as one action.

### D — 120–135° large turn

Show the intermediate ball vector + body rotation concept.

### E — Gravenberch-like through/across-stance turn

Use the inside of the appropriate foot to redirect the ball through/across/behind the stance while the player rotates onto the new line.

### F — Mirrored Gravenberch-like turn

Same functional action opposite direction.

### G — 180° turn

One continuous receive/turn.

### H — Full-throttle receive

Player receives at high running speed and continues naturally.

### I — Poor Ball Control

Same receive intent but noticeably poorer execution.

### J — Failed/heavy receive

Action selected correctly, but execution error produces genuine control loss.

---

# 36. BUILD A RECEIVE VISUAL DEBUGGER

For each receive, show:

```text
incoming ball vector
player facing
player velocity
desired exit direction

receiveTurnAngle

selected receive family
selected contact foot
selected contact surface

ideal first-touch ball vector
actual first-touch ball vector

Ball Control
execution error

planned body rotation
actual authoritative exit facing

contact time
handoff time
```

For large turns, visibly draw:

```text
BALL FIRST-TOUCH VECTOR
```

separately from:

```text
PLAYER FINAL EXIT VECTOR
```

This is important because they are intentionally not always the same.

---

# 37. ANIMATION / SIMULATION CONTRACT

Document an explicit contract for future authored animation assets.

Each receive family should eventually expose something resembling:

```text
entry state
valid turn-angle range
contact foot
contact surface
contact phase/time
root/body path
body rotation
nominal ball redirection
exit state
mirrorability
safe timing adjustment range
```

The simulation should be able to select and resolve the action even if the final production animation is not yet authored.

Use placeholder/procedural visualization where necessary.

Do not block the simulation architecture on final art.

---

# 38. CONTACT IS AUTHORITATIVE, NOT PRESENTATION RNG

The contact event and execution result must remain deterministic.

Use keyed RNG based on something like:

```text
matchSeed
playerId
receiveEventId
receive-execution-v1
error dimension
draw index
```

Do not key randomness to:

```text
animation frame
render timing
presentation state
```

Animation ON/OFF must not change receive outcome.

---

# 39. IMPORTANT PHILOSOPHY

The new receive architecture should follow:

```text
PLAYER INTENT
      ↓
AUTHORED ACTION FAMILY
      ↓
IDEAL FIRST-TOUCH RESULT
      ↓
PLAYER ATTRIBUTE EXECUTION
      ↓
ACTUAL RIGID-BODY BALL STATE
      ↓
OUTCOME
```

Not:

```text
run giant physical foot search
until something happens to collide
```

and not:

```text
play animation
→ animation decides where ball goes
```

The authored action describes **what the player is attempting**.

The simulation resolves **how well it is executed**.

The ball then continues physically.

---

# 40. SUCCESS CRITERIA

RECEIVE-CONTROL-1.1 should demonstrate that the architectural pivot fixes the major RECEIVE-CONTROL-1 weakness.

I expect:

- ordinary passes that should obviously be receivable are contacted reliably;
- the current ~30% "never touched" rate falls dramatically for feasible receives;
- receiving at pace no longer requires artificial braking merely to satisfy DRIBBLE contact geometry;
- large turning receives remain available;
- 180° receives remain fluid;
- through/across-stance turns work in both directions;
- Ball Control visibly affects first-touch quality;
- genuine bad touches/loss remain possible;
- DRIBBLE-V1 remains byte-for-byte/protected as appropriate;
- determinism passes;
- CPU cost improves substantially.

Do NOT optimize for 100% successful control.

Separate:

```text
FAILED TO MAKE A CONTACT THAT SHOULD HAVE BEEN FEASIBLE
```

from:

```text
CONTACT MADE BUT EXECUTION WAS POOR
```

The first should become rare for ordinary feasible receives.

The second is legitimate football and should be controlled by execution quality.

---

# 41. DO NOT FREEZE AUTOMATICALLY

Implement RECEIVE-CONTROL-1.1.

Build the review harness.

Show the representative cases.

Run the deterministic matrix.

Report the aggregate results.

But:

**DO NOT FREEZE RECEIVE-CONTROL YET.**

I want to visually review:

- ordinary cushioning;
- touch into stride;
- 90° turn;
- 120–135° large turn;
- through/across-stance turn;
- mirrored turn;
- 180° turn;
- full-throttle receive;
- high vs low Ball Control;
- genuine failed receive.

Then we will decide whether the action geometry, Ball Control scaling and transitions are correct.

# FINAL DELIVERABLE

Report:

1. the new receive architecture;
2. receive families implemented;
3. exact action-selection logic;
4. exact contact scheduling logic;
5. how the authoritative rigid-body ball is handled;
6. Ball Control execution model;
7. behavior at Ball Control 99;
8. lower-rating behavior;
9. large-turn geometry;
10. the through/across-stance turn implementation;
11. how ball-touch direction differs from body exit direction;
12. mirroring;
13. 180° receive behavior;
14. full-throttle behavior;
15. failure behavior;
16. DRIBBLE-V1 handoff;
17. deterministic test results;
18. aggregate receive results;
19. CPU/performance;
20. DRIBBLE-V1 regression results;
21. review page/lab links;
22. known limitations.

Most importantly:

**Stop trying to make receiving emerge from DRIBBLE-V1's detailed foot-contact search.**

Build receiving as an **authoritative authored-action system with rigid-body ball response and attribute-driven execution quality**.

For large turns, explicitly support the football concept:

> The receiving foot may deliberately send the ball through/across/behind the player's stance in an intermediate direction while the player's body rotates around it toward a substantially different final exit direction.

That is the behavior we want.
