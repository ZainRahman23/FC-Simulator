We are happy with the architectural direction of RECEIVE-CONTROL-1.1, but **do not freeze it yet**.

Before continuing to refine turning receives or adding more receive behaviors, I want to isolate and master one fundamental receiving action:

# RECEIVE-KILL-1 — KILL / DEADEN THE BALL

Temporarily focus on this action.

The goal is to build and calibrate a general first-touch control model where a player intentionally tries to **kill/deaden an incoming ball**.

This should work for:

- slow ground balls;
- medium ground balls;
- hard ground passes;
- bouncing balls;
- low aerial balls;
- thigh-height balls;
- chest-height balls;
- head-height / high aerial balls.

And I want to understand exactly how:

```text
BALL CONTROL 1–99
```

changes the result.

Do not continue broad receive-family development until this foundation is visually reviewable.

---

# 1. CORE PRINCIPLE

Ball Control should represent:

> **How accurately a player can remove/manage the incoming ball's energy and place the resulting first touch where intended.**

For a KILL action, the intent is approximately:

```text
incoming ball
      ↓
appropriate body surface
      ↓
remove incoming energy
      ↓
ball finishes close and controllable
```

But Ball Control should NOT simply determine:

```text
success / failure
```

It should determine execution quality.

Conceptually:

```text
incoming ball state
+
control surface
+
KILL intent
+
Ball Control
        ↓
actual post-contact rigid-body ball state
```

---

# 2. VERY IMPORTANT: DIFFICULTY MUST DEPEND ON THE INCOMING BALL

A Ball Control difference should NOT have the same effect in every situation.

For an extremely easy slow roller:

```text
BC 40
BC 60
BC 80
BC 99
```

should all be capable of controlling it reasonably well.

There may be small differences, but they should NOT look dramatically different.

This is important.

A professional footballer with mediocre Ball Control should not randomly knock a gentle 2 m/s roller several metres away.

However, as the incoming ball becomes more difficult:

```text
greater speed
greater vertical velocity
greater height
awkward trajectory
```

Ball Control should matter increasingly.

So conceptually:

```text
EASY BALL
→ attributes compressed toward similar outcomes

DIFFICULT BALL
→ attributes strongly differentiated
```

This should emerge continuously.

Do NOT implement crude difficulty buckets if a clean continuous model is possible.

---

# 3. INCOMING SPEED

Incoming speed should be one of the primary difficulty dimensions.

Build a calibration range covering approximately:

```text
2 m/s
5 m/s
8 m/s
12 m/s
16 m/s
20 m/s
25 m/s
30 m/s
```

Adjust slightly if existing Touchline pass/ball speeds suggest better representative values.

The important range is:

```text
slow roller
→ normal pass
→ firm pass
→ very hard pass
→ extreme control test
```

For a 2–5 m/s ground ball, Ball Control differences should be relatively small.

For something like a 20–30 m/s incoming ball, the difference between mediocre and elite Ball Control should become substantial.

---

# 4. HEIGHT / VERTICAL DIFFICULTY

Receiving difficulty must also depend on the ball's arrival height and vertical motion.

Test representative contact heights such as:

```text
GROUND / FOOT
~0.1–0.3 m

LOW / SHIN-ANKLE
~0.3–0.6 m

KNEE / THIGH
~0.6–1.1 m

CHEST
~1.1–1.6 m

HEAD / HIGH
~1.6–2.0+ m
```

Use the project's player scale/geometry rather than blindly hardcoding these exact numbers if authoritative dimensions already exist.

Also distinguish:

```text
ball travelling mostly horizontally
```

from:

```text
ball dropping rapidly
```

where useful.

An aerial ball with significant downward velocity should generally be harder to deaden than a gently arriving ball at the same height.

---

# 5. CONTROL SURFACES

The KILL system should support at minimum:

## FOOT

Use appropriate:

```text
inside
outside
sole
instep
```

where useful.

For ordinary ground kills, inside/sole will probably dominate.

## THIGH

Use the thigh to cushion suitable waist/thigh-height balls.

The thigh should naturally be capable of absorbing substantial energy but generally leave the ball dropping into another controllable state rather than magically stationary in mid-air.

## CHEST

Chest control should cushion aerial balls downward/in front of the player.

Again:

```text
99 Ball Control
```

does NOT mean the ball freezes against the chest.

It means the player executes the intended chest cushion extremely accurately.

The resulting ball should still obey gravity and rigid-body physics.

## HEAD

Head control should exist for sufficiently high balls.

A "kill" with the head should mean:

> cushion/control the header into a useful nearby ball state

rather than literally making a high-speed aerial ball stop dead in space.

The achievable ideal result depends on the control surface.

---

# 6. SURFACES HAVE DIFFERENT NATURAL CAPABILITIES

Do not treat:

```text
foot
thigh
chest
head
```

as interchangeable animations with identical mathematics.

Each should have a different **ideal control envelope**.

Conceptually:

### Foot

Best precision for suitable ground/low balls.

Can potentially almost completely kill manageable incoming ground velocity.

### Thigh

Excellent energy absorber for suitable aerial heights.

Less exact positional control than an ideal foot receive, but very useful for dropping the ball nearby.

### Chest

Good large surface for cushioning aerial balls.

Should redirect/downward-cushion rather than create an impossible stationary ball.

### Head

Hardest surface for truly "killing" a ball.

Useful for cushioning/redirecting high arrivals, but should naturally retain more resulting ball movement than elite foot/chest control.

These are conceptual responsibilities.

Propose/calibrate the exact differences rather than hiding them.

---

# 7. AUTOMATIC SURFACE SELECTION

For the calibration system, support two modes:

### AUTO

The receive planner chooses the most appropriate control surface based on:

```text
ball height
ball trajectory
incoming speed
player geometry
```

### FORCED SURFACE

For debugging/calibration, allow us to force:

```text
foot
thigh
chest
head
```

where geometrically possible.

This will let us understand what each surface actually does.

Do not allow obviously impossible combinations merely to populate a matrix.

---

# 8. BALL CONTROL SHOULD SCALE EXECUTION ERROR, NOT DEFINE THE IDEAL ACTION

Separate:

```text
WHAT THE PLAYER WANTS TO DO
```

from:

```text
HOW WELL THEY DO IT
```

First calculate an ideal KILL result for the selected control surface.

Then:

```text
Ball Control
+
incoming difficulty
→ execution error
```

Then produce the actual authoritative post-contact state.

Conceptually:

```text
ideal outgoing direction
ideal outgoing speed
ideal placement

        ↓

difficulty-adjusted
Ball Control execution

        ↓

actual outgoing direction
actual outgoing speed
actual placement
```

---

# 9. EASY-BALL COMPRESSION

This is a major design requirement.

Create a difficulty function where very easy receives substantially compress attribute differences.

Conceptually:

```text
executionError =
    baseAttributeError(BC)
    × incomingDifficulty
```

but design the actual mathematics carefully.

For example, if incoming difficulty is extremely low:

```text
BC 40 → small error
BC 60 → slightly smaller
BC 80 → slightly smaller
BC 99 → near-perfect
```

They should all look competent.

As difficulty rises:

```text
BC 40 → increasingly poor/heavy
BC 60 → meaningful error
BC 80 → generally good
BC 99 → exceptional
```

I specifically want to avoid a system where Ball Control 40 looks terrible controlling a gentle roller merely because its generic error distribution is large.

---

# 10. 99 BALL CONTROL

Under feasible conditions, 99 Ball Control should be exceptional.

For a manageable ground pass with KILL intent:

```text
BC 99
→ ball essentially dies exactly where intended
```

There can remain tiny nonzero execution variation.

For a hard aerial ball:

```text
BC 99
```

should execute the best physically/footballistically plausible cushion for the chosen surface.

Again:

```text
99 ≠ violate physics
```

It means:

```text
99 = almost perfectly execute the ideal authored control action
```

---

# 11. LOWER BALL CONTROL

As Ball Control falls, depending on incoming difficulty, allow errors such as:

```text
too much residual speed
ball rebounds too far
incorrect lateral direction
ball drops too far away
ball pops upward
ball goes onto wrong side
second touch becomes difficult
ball leaves control radius
possession becomes contestable
ball lost
```

These should be consequences of the resulting rigid-body state.

Do not assign hidden "control failed" probabilities.

---

# 12. INCOMING ENERGY

Investigate whether a useful receive-difficulty input is based partly on incoming kinetic state rather than speed alone.

Conceptually:

```text
horizontal speed
vertical speed
arrival angle
contact height
```

all matter.

You do NOT need detailed biomechanical collision physics.

But a:

```text
25 m/s ball arriving horizontally at the foot
```

should be different from:

```text
25 m/s ball dropping steeply from above
```

and both should be much more demanding than:

```text
3 m/s roller
```

Build a simple, explainable difficulty model.

---

# 13. AUTHORED CONTACT RESPONSE

Continue using the RECEIVE-CONTROL-1.1 architectural decision.

Do NOT return to brute-force DRIBBLE-V1 contact searching.

The action owns:

```text
body preparation
control surface
contact timing
contact pose
ideal outgoing ball state
```

At CONTACT:

```text
Ball Control + difficulty
→ execution error
→ authoritative rigid-body ball state
```

Then normal ball physics resumes.

---

# 14. ANIMATION CONTRACT

For each control surface, establish the required authored-action contract.

For example:

```text
FOOT_KILL
THIGH_KILL
CHEST_KILL
HEAD_CUSHION
```

Each should eventually specify:

```text
valid incoming-height range
valid incoming-angle range
contact marker
contact surface
body preparation
nominal damping/redirection
post-contact body state
safe timing adjustment
```

Production animations do not need to exist yet.

Procedural/placeholders are acceptable for calibration.

---

# 15. DO NOT RANDOMLY CHOOSE CONTROL SURFACE

The surface should be selected causally.

For example:

```text
ground ball
→ foot

appropriate thigh-height arrival
→ thigh candidate

chest-height arrival
→ chest candidate

high arrival
→ head candidate
```

But trajectory matters too.

A falling ball may become a foot-control candidate if the player can reasonably wait for it.

The planner can compare a small number of feasible authored solutions.

---

# 16. CALIBRATION MATRIX — THIS IS THE MAIN DELIVERABLE

I want a large visual calibration matrix.

For each representative incoming-ball condition, evaluate Ball Control at **every 10-rating step**.

Use:

```text
10
20
30
40
50
60
70
80
90
99
```

Use 99 rather than 100.

For each incoming condition, use the SAME standardized execution draw/seed across ratings where possible.

That way:

```text
BC 10
BC 20
...
BC 99
```

are true matched counterfactuals.

Changing Ball Control should scale the same underlying execution tendency rather than rerolling luck.

---

# 17. SPEED × BALL CONTROL VIEW

Build a visualization/table for ground receives:

Rows:

```text
incoming speed
```

Columns:

```text
BC 10
BC 20
BC 30
BC 40
BC 50
BC 60
BC 70
BC 80
BC 90
BC 99
```

For example:

| Incoming | BC10 | BC20 | BC30 | BC40 | BC50 | BC60 | BC70 | BC80 | BC90 | BC99 |
|---|---|---|---|---|---|---|---|---|---|---|
| 2 m/s | | | | | | | | | | |
| 5 m/s | | | | | | | | | | |
| 8 m/s | | | | | | | | | | |
| 12 m/s | | | | | | | | | | |
| 16 m/s | | | | | | | | | | |
| 20 m/s | | | | | | | | | | |
| 25 m/s | | | | | | | | | | |
| 30 m/s | | | | | | | | | | |

Each cell should expose the resulting KILL behavior.

---

# 18. HEIGHT × BALL CONTROL VIEW

Create equivalent matrices for different arrival heights.

At minimum:

```text
ground/foot
thigh
chest
head
```

For each surface, vary incoming difficulty/speed.

The goal is to visually answer:

> How much does BC matter for a gentle foot receive?

> How much does it matter for a hard foot receive?

> How much does it matter for a difficult thigh control?

> Chest control?

> High aerial/head control?

---

# 19. VISUAL RESULT PER CELL

Do not give me only success percentages.

I want to see the actual physical result.

For each selected matrix cell, show:

```text
incoming trajectory
contact point
selected surface

ideal post-contact trajectory
actual post-contact trajectory

residual ball speed
lateral error
vertical error

distance from intended resting/drop point after:
0.25 s
0.50 s
1.00 s
```

Where appropriate.

For aerial controls, show the subsequent drop/bounce.

---

# 20. BUILD AN INTERACTIVE "CONTROL LAB"

Create a dedicated KILL/CONTROL calibration lab.

Controls should include:

```text
Ball Control rating

incoming speed

incoming height

incoming horizontal direction

incoming vertical velocity / drop angle

control surface:
AUTO
FOOT
THIGH
CHEST
HEAD

seed / standardized execution example
```

Show the receive from useful views:

### Side view

Best for height and vertical damping.

### Top view

Best for lateral control.

### Gameplay / 3D-ish view

Useful for judging football readability.

Do not make visual polish more important than clear geometry.

---

# 21. SHOW IDEAL VS ACTUAL

This is extremely important.

Draw both:

```text
IDEAL CONTROL RESULT
```

and:

```text
ACTUAL CONTROL RESULT
```

For BC99 they should often nearly overlap.

For poorer Ball Control on difficult arrivals, they should diverge visibly.

This will make the attribute model understandable.

---

# 22. EASY-BALL TEST

Create a specific benchmark:

```text
2 m/s ground roller
straight toward player
preferred foot
stationary player
clean conditions
KILL intent
```

Run:

```text
BC10
BC20
BC30
BC40
BC50
BC60
BC70
BC80
BC90
BC99
```

I expect the differences to be relatively modest.

Even low Ball Control should generally be capable of controlling this.

If BC10 sends a gentle roller flying several metres away, the model is wrong.

---

# 23. HARD-GROUND TEST

Create another benchmark:

```text
20–25 m/s ground pass
straight toward player
preferred foot
stationary player
clean conditions
KILL intent
```

Now I expect a much larger difference.

Something qualitatively like:

```text
BC99
→ exceptional deadening

BC90
→ excellent

BC80
→ good but visible residual movement

BC70
→ reasonable but clearly imperfect

BC50
→ significant heavy-touch risk

BC30
→ difficult control

BC10
→ very poor result likely
```

Do not hardcode those outcomes.

Use them as qualitative calibration targets.

---

# 24. AERIAL BENCHMARKS

Create representative:

```text
THIGH CONTROL
CHEST CONTROL
HEAD CONTROL
```

benchmarks.

Use both:

```text
manageable aerial arrival
```

and:

```text
hard/fast aerial arrival
```

for each where sensible.

Again compare every 10 Ball Control ratings.

---

# 25. HEAD CONTROL NEEDS CAREFUL INTERPRETATION

Do not make the head magically kill a ball like a sole trap.

The ideal HEAD control result may naturally retain more movement.

For example:

```text
high incoming ball
→ cushioned downward header
→ ball drops into controllable space
```

Then Ball Control determines how accurately that intended cushion is executed.

The surface determines what "perfect control" physically means.

---

# 26. CHEST CONTROL

Likewise, an ideal chest control should normally be:

```text
incoming aerial ball
→ chest cushions energy
→ ball falls/downward-forward into controllable space
```

not:

```text
ball sticks to chest
```

At 99, placement and residual velocity should be extremely close to the intended chest-control result.

---

# 27. THIGH CONTROL

An ideal thigh control can:

```text
absorb vertical/horizontal energy
→ drop ball toward preferred side
→ prepare foot control/dribble
```

The ball should remain physical after contact.

---

# 28. FOOT CONTROL

Foot control should support the strongest true KILL behavior.

For a manageable ground pass, elite Ball Control should be capable of leaving the ball extremely close to the intended resting position.

Sole/inside-foot authored variants can differ if useful.

---

# 29. DO NOT ADD OTHER ATTRIBUTES YET

For this calibration isolate:

```text
Ball Control
```

Do not yet add:

```text
Dribbling
Agility
Reactions
Composure
weak foot
pressure
fatigue
```

unless an existing system already necessarily supplies a fixed baseline.

Use clean conditions.

We want to understand Ball Control first.

---

# 30. FUTURE DRIBBLING SEPARATION

Keep the architecture compatible with our intended attribute separation:

```text
BALL CONTROL
= quality/precision of ball contact

DRIBBLING
= speed/efficiency of technical foot actions

AGILITY
= speed/quality of body reorientation
```

Do not accidentally make Ball Control govern leg-action speed.

This task is specifically about the quality of the KILL contact.

---

# 31. RANDOMNESS

Use deterministic keyed execution error.

Matched rating comparisons should use the same standardized draws.

Conceptually:

```text
matchSeed
receiverId
receiveEventId
receive-kill-v1
errorDimension
drawIndex
```

Changing:

```text
Ball Control 50 → 90
```

should not reroll the receive.

It should reduce the magnitude of the same underlying execution error.

---

# 32. MULTIPLE SEEDS

For the main visual matrix, one standardized matched seed per comparison is useful.

But also provide distribution testing across many seeds separately.

For each:

```text
speed
height/surface
Ball Control
```

run enough cheap samples to measure:

```text
mean residual speed
median residual speed

mean placement error
90th percentile placement error

heavy-touch frequency
loss/control-state frequency
```

Do NOT tune directly to a desired possession-success percentage.

Use these statistics to understand the physical distribution.

---

# 33. PERFORMANCE

The authored receive architecture has already dramatically improved performance.

Preserve that.

Do not reintroduce an expensive continuous contact search.

Report CPU for:

```text
foot kill
thigh control
chest control
head control
```

and matrix generation.

---

# 34. PROTECT EXISTING SYSTEMS

Do not modify:

```text
DRIBBLE-V1 frozen core
TURN-1.2
shooting
ball physics globally
other receive families unless required for shared infrastructure
```

Keep this KILL/control calibration isolated.

If shared RECEIVE-CONTROL-1.1 infrastructure must change, verify existing turn cases remain unchanged unless the change is intentionally necessary.

---

# 35. DO NOT FREEZE

This is a calibration mission.

Do not lock the Ball Control constants automatically.

I want to review the entire:

```text
incoming speed
×
incoming height/surface
×
Ball Control
```

space visually first.

---

# FINAL DELIVERABLE

Give me:

1. the exact Ball Control execution formula;
2. the exact incoming-difficulty formula;
3. how horizontal speed affects difficulty;
4. how vertical speed affects difficulty;
5. how arrival height affects surface selection;
6. the control surfaces implemented;
7. what "perfect" control means for each surface;
8. the Ball Control 10–99 scaling;
9. easy-ball compression behavior;
10. hard-ball differentiation;
11. ground-control matrix;
12. thigh-control matrix;
13. chest-control matrix;
14. head-control matrix;
15. interactive calibration lab;
16. ideal-vs-actual trajectory visualization;
17. residual-speed measurements;
18. placement-error measurements;
19. multi-seed distribution results;
20. performance;
21. deterministic/matched-seed verification;
22. regression verification for existing receive turns and frozen DRIBBLE-V1;
23. known limitations;
24. review links.

Most importantly, I want to be able to look at a grid and compare:

```text
SAME INCOMING BALL

BC10
BC20
BC30
BC40
BC50
BC60
BC70
BC80
BC90
BC99
```

and then change the incoming ball from:

```text
slow ground roller
→ normal ground pass
→ hard ground pass
→ thigh-height ball
→ chest-height ball
→ difficult high ball
```

and immediately understand how **Ball Control interacts with incoming-ball difficulty**.

The core behavior we want is:

> **Easy balls compress the difference between ratings. Difficult balls expose the difference between ratings.**

And remember:

> **Ball Control determines how accurately the player executes the intended control action. The selected body surface determines what an ideal control action physically looks like.**
