We are happy overall with **Alternative B** as the current RECEIVE-KILL Ball Control candidate.

Do NOT integrate or freeze it immediately.

The next assignment has two major phases:

# PHASE 1 — ADD REAL EXECUTION VARIANCE TO EVERY CONTROL TOUCH

Then:

# PHASE 2 — RESEARCH AND BUILD STATIONARY RECEIVE-AND-TURN ACTIONS BY TURN ANGLE

The end goal is:

> A stationary player sees space before the ball arrives, chooses to turn into that space, and performs the receive + turn as one football action.

This should eventually cover everything from a small open-body receive to a full 180° through/across-stance turn.

---

# PART A — RANDOMNESS / EXECUTION VARIANCE

## 1. CURRENT BEHAVIOR BECOMES THE AVERAGE

The current Alternative-B behavior at each:

```text
Ball Control rating
×
incoming difficulty
×
control surface
```

should now represent approximately the **average / central expected execution quality**.

Do NOT throw away the current calibration.

Instead, put a distribution around it.

Conceptually:

```text
CURRENT B RESULT
≈ centre of execution distribution

individual touch
=
current expected execution
+
seeded execution variation
```

So if BC70 currently produces a characteristic amount of error on a given ball, BC70 should sometimes execute:

```text
better than current average
approximately current average
worse than current average
```

The current behavior should not become the worst case.

---

# 2. THIS MUST BE PHYSICAL EXECUTION RANDOMNESS

Do NOT implement:

```text
roll success/failure
```

or:

```text
20% chance heavy touch
```

Instead randomize the actual execution dimensions.

Depending on the action these may include:

```text
direction error
residual velocity
damping amount
drop-point placement
lateral placement
touch distance
vertical component
```

The resulting rigid-body ball state determines what happens.

---

# 3. 99 SHOULD REMAIN CLOSE TO PERFECT

This is essential.

At:

```text
Ball Control = 99
```

clean feasible controls should have an extremely narrow distribution.

There can be tiny natural variation.

But:

```text
BC99
```

should not occasionally produce a bizarre heavy touch merely because RNG rolled badly.

Conceptually:

```text
99
→ tiny variance around near-perfect execution

90
→ small variance around elite execution

80
→ moderate but usually good distribution

70
→ clearly wider

50
→ substantially wider

low ratings
→ increasingly broad
```

---

# 4. VARIANCE SHOULD ALSO DEPEND ON DIFFICULTY

Do not give every touch the same randomness magnitude.

Easy ball:

```text
2 m/s roller
```

should remain compressed.

Even a poor controller should usually execute it within a narrow practical range.

Hard ball:

```text
22 m/s ground pass
hard dropping aerial
```

should expose much more variance.

So conceptually:

```text
execution spread
=
Ball Control spread
× incoming difficulty
× surface/action difficulty
```

while retaining sensible floors and bounds.

---

# 5. CURRENT B IS THE CENTRAL TENDENCY

Explicitly preserve the Alternative-B progression.

For example, on the current 22 m/s benchmark:

```text
BC50
BC60
BC70
BC75
BC80
BC90
BC99
```

should retain approximately the same **central/average hierarchy** we currently observe.

Randomness goes around those expectations.

Do NOT silently recalibrate B while implementing variance.

If adding variance changes aggregate medians materially, diagnose why.

---

# 6. USE BOUNDED DISTRIBUTIONS

Do not use unbounded Gaussian tails that occasionally generate absurd touches.

Use a bounded execution distribution.

We already have good precedent elsewhere in Touchline for bounded standardized execution draws.

Choose a simple auditable distribution.

Potentially:

```text
bounded triangular
bounded smooth transform
clamped standardized distribution
```

but explain the choice.

The important properties are:

```text
zero-centred / appropriate central tendency
bounded
seeded
auditable
continuous
```

---

# 7. MULTIPLE ERROR DIMENSIONS

Do not necessarily use one random scalar for everything.

A touch can be:

```text
directionally good but slightly too firm
```

or:

```text
correct damping but slightly wrong side
```

Use independent keyed dimensions where physically meaningful.

For example:

```text
direction draw
speed/damping draw
vertical/drop draw
```

Do not overcomplicate it unnecessarily.

---

# 8. KEYED RANDOMNESS

Randomness must remain causally localized.

Conceptually:

```text
matchSeed
receiverId
receiveEventId
contactIndex
receive-control-v2
errorDimension
drawIndex
```

Changing:

```text
Ball Control 70 → 90
```

must NOT reroll the underlying execution tendency.

The same standardized draws should shrink.

Likewise animation ON/OFF must not affect them.

---

# 9. BUILD A DISTRIBUTION VIEW

For each benchmark show the distribution rather than only one representative touch.

For:

```text
BC 30
BC 50
BC 70
BC 80
BC 90
BC 99
```

run many seeds.

Report:

```text
median
25th / 75th percentile
10th / 90th percentile
bounded minimum/maximum

first-touch placement error
residual speed
time to stable control
recovery distance
contacts required
```

where appropriate.

---

# 10. SHOW SAME RATING, DIFFERENT TOUCHES

Build a visual page where I can select:

```text
Ball Control = 70
```

and watch perhaps:

```text
10–20 different seeds
```

for the exact same incoming ball.

I want to visually understand:

> What does the natural execution range of a BC70 player actually look like?

Do the same for:

```text
50
80
90
99
```

---

# 11. SHOW SAME DRAW ACROSS RATINGS

Also retain matched-counterfactual mode.

For one standardized draw show:

```text
BC50
BC60
BC70
BC80
BC90
BC99
```

so the same execution tendency becomes progressively better controlled.

---

# PART B — RESEARCH REAL RECEIVE-AND-TURN TECHNIQUES

Before implementing the next turn library, conduct a focused research pass.

Use high-quality football coaching/technical sources where possible.

At minimum review material from:

```text
FIFA Training Centre
England / FA coaching resources
other credible technical coaching sources
```

and research how players:

```text
receive on the back foot
receive across the body
open their body before contact
turn with inside of foot
turn with outside of foot
perform soft turns
perform one-motion large turns
allow the ball across/through the stance
use drag/hook/Cruyff-like receiving turns
```

We are particularly interested in:

> **A player who is initially stationary, knows the space they want to attack before the pass arrives, and receives + turns into that space in one action.**

Do NOT research only named skill moves.

Research the underlying football mechanics.

---

# 12. RESEARCH FINDINGS TO PRESERVE

External coaching evidence already suggests several important principles:

### Body orientation before contact

Players frequently open/adjust their body **before the ball arrives** rather than trapping square and turning afterward.

### Back-foot receiving

Receiving with the foot farther from the passer can allow the ball to travel across the body and naturally open the player toward the next action.

### First touch toward next action

The first touch is often deliberately directed into the space the player wants to attack.

### Multiple contact surfaces

Inside-foot, outside-foot and across-body receiving create different turn possibilities.

### Larger turns can be one continuous action

The body can commit to rotation before/during contact rather than:

```text
receive
→ stop
→ turn
```

Document the research and translate it into simulation/action requirements.

Do not simply copy drills.

---

# PART C — TURN ANGLE GROUPS

Build the receive-turn system around **angle families**, not one generic turn.

The player is initially stationary.

Define:

```text
desiredTurnAngle
=
signed difference between initial facing
and desired exit direction
```

Use player-local coordinates.

Mirror left/right deterministically.

---

# 13. PROPOSE PRACTICAL ANGLE FAMILIES

Research first, but start by investigating something approximately like:

```text
0–30°
30–60°
60–90°
90–120°
120–150°
150–180°
```

with mirrored equivalents on the other side.

Do NOT assume these exact boundaries are final.

After research, propose the smallest useful set of angle groups where the actual receiving mechanics meaningfully differ.

We do not need a unique animation for every degree.

---

# 14. SMALL TURN — ~0–30°

Likely behavior:

```text
open body slightly
receive into stride/space
small directional first touch
minimal body rotation
```

This should look almost like an ordinary directional receive.

Do not invoke a dramatic turn action.

---

# 15. MODERATE TURN — ~30–60°

Potential behavior:

```text
back-foot receive
across-body touch
open hips before contact
first touch carries ball onto new line
```

This should be extremely common and efficient.

---

# 16. HALF-TURN — ~60–90°

This is a major football family.

Potentially:

```text
receive on back foot
body already side-on
ball travels across body
first touch creates separation
player exits forward/diagonally
```

Research and implement convincing left/right variants.

---

# 17. LARGE TURN — ~90–120°

At this point a simple open-body receive may no longer be enough.

Possible solutions include:

```text
inside-foot soft turn
outside-foot turn
ball across stance
body rotates around first touch
```

The first touch and body turn should be one action.

---

# 18. VERY LARGE TURN — ~120–150°

This is where the authored intermediate ball-vector idea becomes especially important.

Potentially:

```text
inside of far foot
→ ball sent through/across/behind stance
→ player rotates around it
→ exits onto intended line
```

This includes the functional Gravenberch-like concept we discussed.

The ball's first-touch vector does NOT need to equal the final player exit vector.

---

# 19. NEAR-REVERSAL — ~150–180°

For very large turns, research appropriate techniques.

Potential families may include:

```text
through-stance turn
inside hook
outside hook
drag/sole-assisted turn
Cruyff-like behind-standing-leg action
```

Do not automatically use all of them.

Choose the smallest set needed for believable coverage.

The objective is:

```text
receive
+
redirect
+
rotate
```

as one continuous action.

Not:

```text
kill
→ wait
→ generic turn
```

---

# 20. ACTION SELECTION SHOULD DEPEND ON MORE THAN ANGLE

Angle determines the family of possibilities, but actual action selection should also consider:

```text
incoming ball side
incoming speed
contact foot
dominant/preferred foot
ball trajectory
desired turn side
body preparation time
```

Do not write:

```text
if angle == 135:
    GravenberchTurn()
```

Generate a small feasible action set and choose the best.

---

# 21. PLAYER PREPARATION BEFORE CONTACT

For turns, the player should begin appropriate body preparation before contact.

Depending on the action:

```text
open hips
step away
plant support foot
rotate shoulders
present back foot
prepare outside foot
```

may begin during ball travel.

The receiver is stationary at the beginning of this calibration, but that does NOT mean they remain frozen until contact.

---

# 22. ACTION OWNS BODY MOVEMENT

Continue the authored-action architecture.

A receive-turn action can define:

```text
pre-contact root/body adjustment
contact foot
contact surface
contact marker
first-touch vector
body rotation
post-contact root movement
exit orientation
```

The human body does not need full rigid-body biomechanics.

The ball remains authoritative.

---

# 23. BALL CONTROL APPLIES TO TURN TOUCH

Once the ideal receive-turn action is selected:

```text
ideal turn touch
↓
Ball Control execution distribution
↓
actual ball state
```

Use the new randomized execution model from Phase 1.

So two BC70 attempts at the same 120° turn can differ naturally.

A BC99 player should execute the authored turn almost exactly.

---

# 24. DO NOT USE BALL CONTROL TO DETERMINE BODY TURN SPEED

Preserve our attribute separation.

```text
Ball Control
= quality/precision of the touch

Dribbling
= technical foot-action speed

Agility
= body reorientation capability
```

For this stationary clean-condition turn study:

hold Dribbling and Agility at a fixed neutral/high baseline.

Do NOT yet implement their rating effects.

But build the architecture so they can be added later.

---

# 25. 99 BALL CONTROL TURN BEHAVIOR

For every feasible turn family:

```text
BC99
```

should be close to the authored ideal.

That means:

- first-touch vector almost exact;
- intended drop/exit point almost exact;
- very little recovery adjustment;
- minimal unnecessary second touch;
- fluid continuation;
- body and ball meet naturally on exit.

It should NOT mean:

```text
ball magnetically sticks to player
```

The authored ideal itself remains physical.

---

# 26. LOWER BALL CONTROL TURN BEHAVIOR

As Ball Control decreases, the same selected action should increasingly produce:

```text
slightly wrong intermediate ball vector
touch too far/short
ball emerges on less convenient side
extra recovery step
later continuation
additional touch
occasionally loss of immediate control
```

Again:

> lower ratings should mostly cost convenience, time and recovery—not make the ball randomly explode away.

---

# PART D — RATING OUTLINE AFTER IMPLEMENTATION

Once the receive-turn library exists, provide an explicit rating interpretation.

I want an outline similar to:

### BC99

Near-perfect authored receive-turn execution.

Large 120–180° actions remain exceptionally clean under feasible conditions.

Very little recovery.

### BC90

Elite.

Most turns clean and fluid.

Occasional small adjustment on difficult/large turns.

### BC80

Very good.

Small/moderate turns usually excellent.

Large turns visibly less exact and sometimes require adjustment.

### BC70

Competent professional.

Ordinary open-body/half-turn receives generally good.

Large turn actions increasingly produce heavier placement and extra recovery.

### BC60

Mediocre control.

Simple receives remain functional.

60–90° turns workable.

120–180° turns become substantially less reliable/clean.

### BC50

Weak.

Can still perform the correct action family, but difficult turns frequently require additional recovery/touches.

### BC30 and below

Poor technical execution.

Simple actions remain possible.

Large receive-turn actions have broad execution distributions and frequently fail to produce immediate continuation.

These are qualitative starting expectations.

Do NOT hardcode success rates to match them.

---

# PART E — TEST MATRIX

Test stationary receiver turns at least around:

```text
0°
15°
30°
45°
60°
75°
90°
105°
120°
135°
150°
165°
180°
```

Mirror left/right.

Test representative incoming balls:

```text
slow ground
normal ground pass
firm ground pass
```

Keep aerial receive-turns out of the first turn library unless the research strongly suggests they are necessary now.

We already have separate aerial KILL work.

---

# 27. RATINGS

For each representative turn family test:

```text
BC30
BC50
BC60
BC70
BC80
BC90
BC99
```

with many seeds.

Report distributions, not only one example.

---

# 28. VISUAL CASES

I want clear clips for:

1. 30° directional receive.
2. 60° back-foot/across-body receive.
3. 90° half-turn.
4. 120° large turn.
5. 135° through/across-stance turn.
6. 150° large reversal.
7. 180° receive-and-turn.
8. mirrored versions of the major families.

For each major angle show:

```text
BC50
BC70
BC90
BC99
```

with matched draws.

---

# 29. DRAW THE VECTORS

For debug views show:

```text
initial facing
incoming ball vector
desired exit direction

selected action family
contact foot
contact surface

IDEAL first-touch vector
ACTUAL first-touch vector

planned body rotation
actual ball path
exit line
```

For large turns, emphasize again:

```text
BALL FIRST-TOUCH VECTOR
≠
FINAL PLAYER EXIT VECTOR
```

where appropriate.

---

# 30. RESEARCH REPORT

Before or alongside implementation, provide a concise technical report covering:

- back-foot receiving;
- open-body receiving;
- receiving across the body;
- inside-foot turns;
- outside-foot turns;
- one-touch/one-motion turns;
- hook/drag/Cruyff-like receive turns where relevant;
- how players prepare before contact;
- why different turn angles favor different mechanics.

Cite the sources used.

Clearly distinguish:

```text
research-supported football principle
```

from:

```text
our simulation design choice
```

Do not pretend the literature gives exact degree boundaries if it does not.

---

# 31. DO NOT ADD DEFENDERS YET

No pressure.

No opponent.

No tackle interaction.

The player is:

```text
stationary
clean conditions
knows desired space
```

This isolates the technical receive-turn foundation.

Pressure can come later.

---

# 32. DO NOT INTEGRATE INTO FULL RECEIVE-CONTROL YET

Build this as the next isolated RECEIVE calibration layer.

Protect:

```text
DRIBBLE-V1
RECEIVE-CONTROL-1.1
existing RECEIVE-KILL evidence
shooting
passing
```

Once I approve:

```text
random execution distribution
+
turn action library
+
rating progression
```

then we can integrate them.

---

# 33. PERFORMANCE

Keep the authored-action approach cheap.

Do not return to continuous biomechanical searches.

Report:

```text
candidate actions per receive
selection CPU
contact resolution CPU
whole receive-turn episode CPU
```

---

# FINAL DELIVERABLE

I want:

1. execution-randomness model;
2. bounded distribution;
3. per-dimension RNG design;
4. proof current Alternative-B behavior remains approximately the average;
5. same-rating multi-seed distributions;
6. matched-rating counterfactuals;
7. BC99 variance;
8. BC50/70/80/90 variance;
9. research report on real receiving/turning;
10. proposed angle families;
11. action families implemented;
12. body-preparation logic;
13. contact-foot/surface selection;
14. intermediate ball-vector logic;
15. 0–180° test matrix;
16. mirrored left/right evidence;
17. BC30/50/60/70/80/90/99 results;
18. qualitative rating interpretation;
19. visual review page;
20. interactive lab;
21. performance;
22. determinism;
23. regression verification;
24. known limitations.

Do NOT freeze or integrate automatically.

The two central principles are:

> **The current Alternative-B Ball Control behavior should become approximately the average execution at each rating, with natural bounded touch-to-touch variance around it. BC99 remains extremely close to ideal.**

and:

> **A stationary player who already knows where the space is should be capable of receiving and turning into that space in one continuous football action, with the technique changing naturally as the required turn angle becomes larger.**
