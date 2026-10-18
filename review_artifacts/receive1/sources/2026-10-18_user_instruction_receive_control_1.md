We are now freezing the generic **DRIBBLE-V1 foundation** at DRIBBLE-1.5.

Treat the frozen DRIBBLE-V1 foundation as protected.

Do **not** modify its core behavior to make this new feature work unless you discover a genuine blocking defect and report it before changing it.

The next system is:

# RECEIVE-CONTROL-1 — Full-Throttle Receiving / First Touch

This is an **implementation task**.

I want you to build the first authoritative version of receiving/first-touch control, beginning with basic receiving and then supporting **turning first touches when the player's intended movement direction is substantially behind their current facing direction**.

The end goal is that a player receiving the ball at speed does not always:

```text
receive
→ stop/control
→ turn
→ accelerate
```

Instead, when appropriate, they can use the first touch itself to redirect the ball and body:

```text
incoming ball
→ turning first touch
→ player emerges facing/moving toward intended direction
→ continue dribbling
```

This should feel like one continuous football action.

Examples of the football behavior we want include:

- letting/redirecting the ball through or across the body while turning;
- a touch resembling the functional idea of a Ronaldo-chop-style redirection;
- Gravenberch-style turns where the first touch helps take the receiver around and away;
- inside/outside-foot turning touches;
- receiving across the body;
- letting the ball travel across/through the stance before taking it into the new direction.

These are **functional references**, not requests for canned animations.

The simulation decides the actual touch/contact/ball trajectory. Presentation can explain it later.

---

# 1. PRESERVE THE FROZEN DRIBBLE FOUNDATION

DRIBBLE-1.5 is now the frozen generic dribbling foundation.

Its important properties include:

- physically interpretable touches;
- deterministic execution;
- control loss remains possible;
- 60°/90° cutting foundation is working;
- no pathological decisive high-speed toe touches;
- straight control remains stable;
- immediate same-foot recontacts remain negligible;
- performance is acceptable.

Do not reopen DRIBBLE-V1 tuning.

Receiving should hand off naturally into the frozen dribbling system after the receiving action completes.

Conceptually:

```text
incoming pass
      ↓
RECEIVE-CONTROL
      ↓
first contact / redirection
      ↓
ball + player exit state
      ↓
FROZEN DRIBBLE-V1
```

---

# 2. FIRST BUILD BASIC RECEIVING

Before sophisticated turning touches, establish a reliable receiving foundation.

A normal receive should understand at minimum:

```text
incoming ball position
incoming ball velocity
incoming ball direction

player position
player velocity
player facing

desired movement direction after receiving
```

The receiver should anticipate the incoming ball and establish a plausible contact.

Do not assume the player must become stationary.

This system is specifically intended to support **full-throttle receiving**.

A player already running should be able to receive while continuing their movement where physically appropriate.

The first touch should attempt to put the ball into a useful next state rather than merely attach it to the player.

---

# 3. NO BALL ATTACHMENT / TELEPORTING

The ball remains authoritative physical state.

Do not:

- parent the ball to the player;
- teleport the ball to a foot;
- force possession by snapping it into a control radius;
- move the player unrealistically to guarantee contact;
- secretly correct a failed first touch afterward.

Receiving must emerge from:

```text
interception/contact geometry
+
foot/body contact choice
+
physical ball redirection
```

A bad receive must remain capable of producing:

```text
heavy touch
ball too far away
wrong-side touch
opponent opportunity
loss of control
```

---

# 4. DETERMINE RECEIVE TURN ANGLE

At/just before reception, calculate the relationship between:

```text
current player facing
```

and:

```text
desired post-receive movement direction
```

Call the signed angular difference something like:

```text
receiveTurnAngle
```

Normalize it consistently.

The important range for the new turning-receive behavior is:

```text
90° to 270°
```

In practical shortest-angle terms, this means the desired movement is sufficiently toward the player's side/back rather than broadly in front of them.

For example:

```text
0°
→ continue forward

45°
→ ordinary angled receive

90°
→ side-facing threshold

135°
→ strong turning receive

180°
→ desired movement directly behind current facing

225°
→ strong turning receive opposite side

270°
→ side-facing threshold

315°
→ ordinary angled receive
```

Be careful with signed-angle conventions so 270° is correctly understood as −90° where appropriate.

---

# 5. RECEIVE CLASSIFICATION

For RECEIVE-CONTROL-1, establish at least two broad families.

## A. Ordinary receive

When desired post-receive direction is broadly in front of the player:

```text
turn difference < 90°
```

or equivalently outside the specified 90–270° turn region.

Use an ordinary first touch appropriate to:

- incoming ball;
- current movement;
- intended movement;
- available foot/contact.

The player should try to continue efficiently without unnecessary stopping.

## B. Turn first touch

When the desired direction lies within:

```text
90°–270°
```

relative to current facing, consider a **turning first touch**.

The first contact itself should help redirect the ball toward the player's desired exit direction while the player rotates/repositions to follow it.

Do not implement this as:

```text
ordinary receive
→ generic DRIBBLE 90°/180° turn
```

The point is that the **receive and turn are one action**.

---

# 6. TURN-FIRST-TOUCH FAMILIES

Do not create one universal canned maneuver.

The planner should be able to choose between a small set of physically meaningful contact solutions.

Start with a minimal functional library.

Possible families:

### Across-body turn

Ball arrives on one side and the player uses the receive to take it across the body into the desired exit direction.

```text
incoming
   ↓
player
   ↘ touch across body
      → exit
```

### Through-stance / behind-leg redirection

Where geometry allows, the receiving touch redirects the ball through/across the player's stance while they rotate around it.

This can produce behavior functionally reminiscent of a **Ronaldo chop**, but do not hardcode a named skill move.

The important thing is:

```text
contact
→ ball redirected across/behind support geometry
→ body rotates
→ receiver exits on new line
```

### Outside-foot turn

Use the outside of the appropriate foot to take the ball sharply into the new direction.

### Inside-foot wrap/turn

Use an inside-foot contact to cushion/redirect the ball around the receiver as they rotate.

### Let-run / take-around

When the incoming trajectory is already useful, the best "touch" may involve allowing the ball to travel across the player before making the controlling/redirection contact.

This can create the fluid Gravenberch-style behavior we are trying to capture.

Do not force every family into RECEIVE-CONTROL-1 if that makes the implementation broad.

Implement the **smallest set of contact families needed to produce convincing coverage** of both left and right turning receives.

---

# 7. 180° RECEIVES ARE IMPORTANT

Pay particular attention to the case where:

```text
desired movement ≈ directly behind current facing
```

A footballer should not necessarily:

```text
receive dead
→ rotate 180°
→ start moving
```

They should be capable of using the incoming ball's momentum and their first contact to turn out efficiently.

There may be multiple valid solutions depending on:

- incoming-ball side;
- ball velocity;
- player's movement;
- preferred foot;
- available contact foot;
- desired turn side.

The planner should choose a physically sensible solution rather than using a universal 180° animation.

---

# 8. FULL-THROTTLE EXIT

The receiving system should preserve momentum where footballistically appropriate.

Do not impose a universal receive-speed reduction.

A player running at speed who receives a well-weighted pass into a favorable geometry should be capable of:

```text
receive
→ redirect
→ continue near full running speed
```

without the artificial:

```text
receive
→ slow dramatically
→ reaccelerate
```

behavior common in simplistic football systems.

However, momentum preservation must be physical.

A difficult 180° turn while sprinting cannot preserve the same velocity vector instantaneously.

Distinguish:

```text
player speed magnitude
```

from:

```text
player velocity direction
```

and respect the cost of redirecting momentum.

Do not give the player impossible lateral acceleration merely to make the receive look responsive.

---

# 9. USE INCOMING BALL MOMENTUM

Incoming pass velocity and direction should matter materially.

The same player intent should produce different receiving solutions for:

```text
slow rolling pass
firm ground pass
fast pass
diagonal pass
pass arriving from behind
pass arriving across the body
```

A turning first touch should exploit the ball's existing momentum where useful rather than treating every incoming ball as stationary at contact.

The system should reason about:

```text
incoming velocity
+
desired outgoing ball state
+
available contact geometry
```

to determine the required redirection.

---

# 10. FIRST TOUCH IS AN EXECUTION EVENT

Architect receiving so that later player attributes can affect it.

Do not yet overbuild the attribute model.

But preserve a clear execution interface where eventually:

```text
Ball Control
Dribbling
Agility
Reactions
preferred/weak foot
pressure
fatigue
```

can influence receiving quality.

In particular, **Ball Control should eventually matter heavily for first-touch execution error**.

For now establish the generic baseline.

Do not make the generic player perfect.

A difficult first touch should be capable of failing naturally.

---

# 11. PREFERRED / WEAK FOOT

If the project already exposes preferred foot, use it where the current architecture naturally supports it.

But do not derail RECEIVE-CONTROL-1 into a complete weak-foot attribute project.

The receiving planner should at least be structurally capable of choosing:

```text
left-foot contact
right-foot contact
```

based on geometry.

Do not make every turning receive use the same foot.

---

# 12. BODY/FACING EVOLUTION

The player should begin turning **before or through contact** when the incoming trajectory and intended exit make that appropriate.

Do not wait for:

```text
ball contact
```

and then suddenly rotate the body.

Likewise, do not instantly snap facing to the desired exit direction.

The turn should evolve continuously:

```text
anticipate receive
→ prepare body
→ contact
→ continue rotation
→ establish exit line
```

The authoritative movement state should remain physically coherent throughout.

---

# 13. CONTACT TIMING

Receiving contact should be timed against the real incoming-ball trajectory.

Do not simply test whether:

```text
distance(player, ball) < arbitrary radius
```

once per coarse interval.

Use the project's existing contact/interception infrastructure where appropriate.

The DRIBBLE-1.4/1.5 work demonstrated why coarse contact/release sampling can create causal errors.

Avoid recreating that problem here.

---

# 14. HANDOFF INTO DRIBBLING

After the first-touch action establishes a controlled exit state, hand back into DRIBBLE-V1.

The transition should not create:

- duplicate immediate touches;
- same-foot recontact spam;
- sudden speed discontinuities;
- ball snapping;
- planner disagreement about the intended line.

Pass the resulting authoritative facts cleanly:

```text
player position
player velocity
player facing / committed movement line
ball position
ball velocity
last contact
intended movement
```

and any other existing state required by DRIBBLE-V1.

---

# 15. TEST MATRIX

Build a deterministic receiving harness.

Test at minimum desired turn differences around:

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

The 89/90 and 270/271 cases are important boundary checks.

Test incoming passes from multiple directions:

```text
front
front-left
front-right
left
right
rear-left
rear-right
```

and multiple useful pass speeds.

Also test receiver states such as:

```text
stationary
jogging
running
near full speed
```

Do not explode this into an unnecessarily gigantic Cartesian matrix initially.

Choose representative coverage first, then broaden once the architecture works.

---

# 16. KEY VISUAL CASES

I want visual/replay evidence of at least:

### Case A — ordinary forward receive

Player faces approximately toward intended exit.

Ball is controlled into stride without unnecessary slowdown.

### Case B — 90–135° turning receive

Player receives and redirects in one action rather than controlling and subsequently cutting.

### Case C — 180° turn first touch

Player's desired movement is directly behind current facing.

Show a convincing one-action turning receive.

### Case D — opposite-side turn

Mirror the turning behavior to demonstrate it isn't one-sided.

### Case E — through/across-body turn

Show at least one receive where the ball is redirected through/across the stance in a way functionally reminiscent of the chop/Gravenberch examples.

### Case F — difficult failed receive

Demonstrate that the system can genuinely produce a poor/heavy first touch rather than guaranteeing control.

---

# 17. WHAT COUNTS AS SUCCESS

A successful RECEIVE-CONTROL-1 foundation should make this possible:

```text
pass arrives
↓
receiver already knows intended exit direction
↓
body prepares appropriately
↓
first contact redirects ball
↓
body continues turning
↓
player and ball establish new line
↓
DRIBBLE-V1 takes over
```

without requiring:

```text
receive
↓
stop
↓
generic turn
↓
restart
```

for every large direction change.

For 90–270° desired direction changes, the system should actively consider a turn-first-touch solution.

That does **not** mean every 90–270° receive must successfully perform one.

Geometry and physical feasibility still matter.

---

# 18. DO NOT SCRIPT NAMED SKILL MOVES

"Ronaldo chop" and "Gravenberch turn" are references for the **kind of football behavior** we want.

Do not implement:

```text
if angle == X:
    play RonaldoChop()
```

There should not be a hidden animation/outcome switch.

Instead:

```text
incoming state
+
player state
+
desired exit
↓
planner selects feasible contact solution
↓
authoritative contact
↓
ball physics
↓
resulting turn
```

The animation system can later recognize and visually explain that action.

---

# 19. SIMULATION / PRESENTATION SEPARATION

Maintain Touchline's core rule:

> Simulation decides what happens; animation visually explains what happened.

The receive planner determines:

- preparation;
- contact foot/type;
- contact timing;
- physical redirection;
- exit state.

Animation must not determine the outcome.

Do not move/parent the authoritative ball to satisfy presentation.

---

# 20. RANDOMNESS / DETERMINISM

Maintain:

- seeded randomness;
- keyed/localized execution error;
- reproducibility;
- Chrome/Node determinism where applicable;
- matched-seed counterfactual capability.

Receiving randomness should be associated with the receiving/contact event.

Do not allow unrelated state changes to unnecessarily reroll first-touch execution.

---

# 21. PERFORMANCE

Keep the receiving planner bounded.

Do not solve receiving by performing an enormous unconstrained trajectory search every frame.

Use the lessons from DRIBBLE-1.3–1.5:

- bounded candidate generation;
- sensible pruning;
- deterministic scoring;
- targeted contact-time search;
- measured CPU cost.

Report performance separately.

---

# 22. DEVELOPMENT ORDER

Implement in this order:

### Phase 1 — Receive basics

Establish:

- incoming-ball interception;
- preparation;
- contact selection;
- ordinary first touch;
- controlled exit;
- DRIBBLE-V1 handoff.

Validate this before broad turn behavior.

### Phase 2 — Turn first touch

Add the 90–270° classification and physically meaningful turning-contact candidates.

Start with the smallest candidate set that covers both turn directions convincingly.

### Phase 3 — Full-throttle receiving

Validate running/high-speed receives and remove unnecessary artificial deceleration while preserving physical turning constraints.

### Phase 4 — Failure and robustness

Ensure difficult receives can:

- become heavy;
- take the player off the ideal line;
- require recovery;
- lose control.

### Phase 5 — Deterministic matrix + visual review

Run the receiving matrix and produce review artifacts.

Do not jump directly to tuning hundreds of cases before the basic physical architecture works.

---

# 23. PROTECT THE DRIBBLE FREEZE

Before implementation, record/verify the frozen DRIBBLE-V1 baseline/tag.

After RECEIVE-CONTROL-1 work, rerun the relevant frozen DRIBBLE tests.

Receiving work must not silently regress:

```text
DRIBBLE-V1
TURN-1.2
ball physics
determinism
```

If a receive-specific adapter is needed between systems, prefer that over modifying the frozen core.

---

# 24. DELIVERABLE

Implement RECEIVE-CONTROL-1 and report:

1. receiving architecture;
2. exact definition of `receiveTurnAngle`;
3. ordinary-vs-turn receive classification;
4. contact families implemented;
5. how incoming ball momentum affects planning;
6. how player momentum is handled;
7. how body preparation/rotation works;
8. how contact timing is resolved;
9. how the exit state hands into frozen DRIBBLE-V1;
10. deterministic test matrix results;
11. performance;
12. failure cases;
13. representative visual/replay cases;
14. confirmation DRIBBLE-V1 remains unchanged;
15. remaining limitations that belong to the future attribute layer.

Most importantly, show me visually that:

- ordinary receives flow naturally into movement;
- a player intending to move **90–270° away from their current facing can use the first touch itself to turn**;
- a 180° receive can become a fast, continuous football turn rather than receive-stop-turn-go;
- both left and right variants work;
- at least one through/across-body turning receive emerges convincingly;
- bad first touches and control loss remain physically possible.

Do not freeze RECEIVE-CONTROL-1 automatically.

Implement it, test it, and present it for review first.
