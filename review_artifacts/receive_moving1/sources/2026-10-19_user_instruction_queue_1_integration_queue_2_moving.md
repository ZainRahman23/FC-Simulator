# Owner instruction (verbatim), received 19 Oct 2026 ~04:50 EEST during RECEIVE-TURN-1.1

Two queued assignments, to be run one at a time, in order, after RECEIVE-TURN-1.1 is finished:
QUEUE #1 = integrate RECEIVE-KILL + RECEIVE-TURN into RECEIVE-CONTROL (stop / test / report), then
QUEUE #2 = receiving while moving (stop / test / report).

---

**QUEUE THESE TWO ASSIGNMENTS.**

You are currently still working on the existing **human-motion / animation refinement for stationary RECEIVE-TURN**.

**DO NOT interrupt that work.**

Finish the current assignment completely, present its results, and preserve its evidence.

Only after the current work is complete, proceed through the following two assignments **ONE AT A TIME, IN THIS EXACT ORDER**:

```text
CURRENT:
Human stationary RECEIVE-TURN animation refinement
        ↓
QUEUE #1:
Integrate RECEIVE-KILL + RECEIVE-TURN into RECEIVE-CONTROL
        ↓
STOP / TEST / REPORT
        ↓
QUEUE #2:
Build RECEIVING WHILE MOVING
        ↓
STOP / TEST / REPORT
```

Do not combine #1 and #2 into one implementation pass.

---

# QUEUE #1 — INTEGRATE RECEIVE-KILL + RECEIVE-TURN INTO RECEIVE-CONTROL

## Objective

We have deliberately developed the newer receiving pieces beside the older RECEIVE-CONTROL system.

Once the current human-motion work is approved/completed, make those newer systems the actual receiving foundation.

Integrate:

```text
RECEIVE-KILL
+
RECEIVE-TURN
+
existing RECEIVE-CONTROL infrastructure
```

into one coherent authoritative receiving system.

---

## 1. USE THE APPROVED RECEIVE-KILL FOUNDATION

Integrate the current approved/provisional Ball Control model and its execution variance.

Preserve:

- Alternative-B Ball Control progression;
- bounded touch-to-touch execution randomness;
- BC99 near-perfect behavior;
- easy-ball compression;
- difficulty-sensitive execution;
- foot control;
- thigh control;
- chest control;
- head control;
- follow-up foot control;
- stable-control/recovery behavior.

Do NOT return to the old RECEIVE-CONTROL-1.1 execution model where the newer RECEIVE-KILL system supersedes it.

---

## 2. USE THE APPROVED RECEIVE-TURN FOUNDATION

Integrate the current receive-turn families:

```text
DIRECTIONAL RECEIVE
HALF-TURN
OUTSIDE-OF-FOOT TURN
THROUGH-STANCE TURN
```

Preserve:

- current technique-selection logic;
- feasibility logic;
- nearest/appropriate foot logic;
- preferred-foot behavior already implemented;
- intermediate first-touch vectors;
- through/across-stance behavior;
- left/right mirroring;
- current turn difficulty;
- current Ball Control execution model;
- the completed human-animation work from the current assignment.

Do not redesign these actions during integration.

---

## 3. THE AUTHORITATIVE RECEIVE FLOW

The unified system should conceptually become:

```text
INCOMING BALL
      ↓
RECEIVER INTENT
      ↓
RECEIVE-CONTROL
      ↓
classify desired action
      ↓
ordinary kill / aerial control / directional receive / turn
      ↓
select authored action family
      ↓
prepare body
      ↓
authoritative contact
      ↓
Ball Control execution
      ↓
authoritative rigid-body ball state
      ↓
follow-up / recovery if required
      ↓
stable exit state
      ↓
DRIBBLE-V1
```

There should no longer be parallel competing receive foundations deciding the same event.

---

## 4. ACTION CLASSIFICATION

The integrated resolver should determine whether the receive requires something like:

```text
KILL / DEADEN

TOUCH INTO AVAILABLE SPACE

DIRECTIONAL RECEIVE

HALF-TURN

OUTSIDE-FOOT TURN

THROUGH-STANCE LARGE TURN

THIGH CONTROL

CHEST CONTROL

HEAD CONTROL
```

based on:

```text
incoming ball state
arrival height
incoming direction
receiver facing
desired exit direction
available preparation time
feasible contact geometry
```

Use the current tested systems rather than inventing new action families.

---

## 5. ONE RECEIVE EVENT

Treat the entire sequence as one semantic receive episode.

For example:

```text
CHEST
→ ball drops
→ follow-up foot control
→ stable possession
```

belongs to the same receive event.

Likewise:

```text
THROUGH-STANCE CONTACT
→ body rotates
→ player rejoins ball
→ stable exit
```

belongs to one receive event.

Use stable event IDs so deterministic execution randomness remains localized.

---

## 6. RANDOMNESS

Preserve the new receive randomness architecture.

The same receive event should use deterministic keyed execution draws.

Changing:

```text
Ball Control 70 → 90
```

must scale the same underlying execution tendency rather than rerolling it.

Integration must not change the random sequence merely because code moved between modules.

---

## 7. DO NOT MODIFY DRIBBLE-V1

DRIBBLE-V1 remains frozen.

Do not change it to make receiving integrate more easily.

The receive system must establish an appropriate exit state before handing over.

If a small receive-specific bridge is still required, keep it inside RECEIVE-CONTROL.

---

## 8. CLEAN DRIBBLE HANDOFF

The integrated receive should hand over:

```text
player position
player velocity
player facing
committed/desired exit line
ball position
ball velocity
last contact
contact foot
receive event state
```

as needed by the existing architecture.

Avoid:

```text
duplicate immediate contact
same-foot recontact spam
ball snapping
velocity discontinuity
facing disagreement
receive planner and dribble planner fighting
```

---

## 9. DO NOT USE ANIMATION TO FIX INTEGRATION

The simulation remains authoritative.

Animation cannot:

```text
move the ball
change contact
change technique
change execution result
change handoff state
```

to make the integration visually cleaner.

Animation consumes the unified authoritative receive facts.

---

## 10. REGRESSION MATRIX

Rerun the full existing receive evidence.

At minimum preserve/regress:

- original RECEIVE-CONTROL matrix;
- RECEIVE-KILL ground controls;
- thigh controls;
- chest controls;
- head controls;
- follow-up controls;
- 0–180° RECEIVE-TURN matrix;
- left/right mirrors;
- Ball Control rating distributions;
- animation ON/OFF neutrality;
- Chrome/Node determinism where applicable;
- DRIBBLE-V1 frozen regression.

Also add end-to-end integrated cases.

---

## 11. REQUIRED INTEGRATED CASES

Show at least:

```text
A. ordinary ground kill
B. ground directional receive
C. 60° receive
D. 90° half-turn
E. 120° turn
F. 135° large turn
G. 150° through-stance
H. 180° through-stance
I. thigh → foot
J. chest → foot
K. head → follow-up
L. poor/heavy receive
M. receive → clean DRIBBLE-V1 continuation
```

---

## 12. RATINGS

Use representative:

```text
BC50
BC70
BC80
BC90
BC99
```

for the major integrated cases.

Do not retune the Ball Control curve merely because integration changes aggregate labels.

If something changes unexpectedly, diagnose the integration.

---

## 13. SUCCESS CRITERIA FOR QUEUE #1

Queue #1 is complete when:

- there is one authoritative receive pipeline;
- newer RECEIVE-KILL behavior is actually used;
- newer RECEIVE-TURN behavior is actually used;
- human turn animation remains simulation-neutral;
- aerial follow-ups work;
- deterministic randomness is preserved;
- DRIBBLE-V1 handoff works;
- old parallel/obsolete receive logic no longer competes for the same action;
- regression results are acceptable.

---

## 14. STOP AFTER QUEUE #1

This is important.

Once integration is complete:

**STOP.**

Give me a full report.

Do NOT immediately begin moving receives in the same implementation pass.

Record/commit the Queue #1 state according to the project's normal workflow.

Then proceed to Queue #2 as a distinct development phase.

---

# QUEUE #2 — RECEIVING WHILE MOVING

Only begin this after Queue #1 has been completed, tested and reported.

## Objective

Extend the unified RECEIVE-CONTROL system from:

```text
stationary receiver
```

to:

```text
walking receiver
jogging receiver
running receiver
sprinting receiver
```

The central requirement is:

> **A player should not unnecessarily stop or brake just because a pass is arriving.**

Receiving should preserve movement and momentum when footballistically possible.

---

## 15. MOVING RECEIVE FOUNDATION

The receive planner now needs to consider:

```text
incoming ball position
incoming ball velocity

player position
player velocity
player facing

desired post-receive movement direction

player speed
movement direction relative to incoming ball
movement direction relative to desired exit
```

The receiver's existing momentum is now a major part of the problem.

---

## 16. DO NOT FORCE A STOP

Avoid the simplistic pattern:

```text
run
→ brake
→ receive
→ turn
→ accelerate again
```

unless the actual geometry requires it.

Instead support:

```text
run
→ receive into stride
→ continue
```

and:

```text
run
→ first touch redirects ball
→ body redirects
→ continue on new line
```

where feasible.

---

## 17. MOVEMENT SPEED GROUPS

Calibrate at least:

```text
STATIONARY
WALK
JOG
RUN
SPRINT
```

Use actual project movement speeds where available.

Do not invent five unrelated systems.

These are test groups for a continuous movement model.

---

## 18. SAME-DIRECTION RECEIVE

Start with the easiest moving receive:

```text
player already running toward desired exit
ball arrives
```

The player should receive into stride.

The first touch should place the ball appropriately ahead based on current speed.

A sprinting player's useful first-touch distance should naturally be greater than a stationary player's.

Do not kill the ball underneath a sprinting player unless that is explicitly their intent.

---

## 19. MOVING ANGLED RECEIVE

Then support:

```text
player moving one direction
desired exit moderately different
```

The receive should combine:

```text
existing momentum
+
first-touch redirection
+
body reorientation
```

without unnecessarily stopping.

---

## 20. MOVING LARGE TURN

For larger direction changes, existing momentum must matter.

A player sprinting forward cannot instantaneously:

```text
receive
→ reverse 180°
→ continue at same speed
```

The system should distinguish:

```text
ball-touch capability
```

from:

```text
body momentum redirection
```

The authored turn can still be selected, but the body/root path must respect the cost of redirecting movement.

---

## 21. RECEIVE ACTIONS SHOULD ADAPT TO MOVEMENT

Reuse the existing action vocabulary where possible.

Examples:

```text
moving directional receive
moving half-turn
moving outside-foot receive
moving through-stance turn
touch into stride
```

Do NOT immediately create an entirely separate animation family for every running speed.

Parameterize/adapt existing techniques where biomechanically reasonable.

Author a new base action only where movement fundamentally changes the mechanics.

---

## 22. FULL-THROTTLE RECEIVE

This is a major acceptance case.

A player running/sprinting onto a compatible pass should be capable of:

```text
sprint
→ first touch
→ ball moves into stride
→ player continues near full speed
```

without artificial braking.

The player may lose a small amount of speed depending on touch/body adjustment.

But there should be no universal receive slowdown.

---

## 23. BALL CONTROL STILL GOVERNS TOUCH QUALITY

Preserve:

```text
Ball Control
→ precision/quality of first touch
```

Do not make Ball Control determine the player's running speed.

At high BC:

```text
ball placed almost exactly into useful stride
```

At lower BC:

```text
ball slightly too far
too short
wrong side
requires stride adjustment
requires recovery touch
```

The player's movement should react to the authoritative ball result.

---

## 24. DO NOT ADD AGILITY YET

Even though moving turns make Agility highly relevant, do NOT add player-specific Agility scaling yet.

Use a fixed/reference body capability.

Architect the extension point for:

```text
Agility
→ body reorientation speed/capability
```

later.

First establish the generic moving-receive mechanics.

---

## 25. DO NOT ADD DRIBBLING YET

Likewise, hold Dribbling at a reference level.

Later:

```text
Dribbling
→ technical leg/foot-action speed
```

For now do not let it complicate the moving-receive foundation.

---

## 26. PLAYER BODY / ANIMATION

Apply the lessons from the current human-motion task.

Moving receive animation must show:

```text
stride phase
preparation
support/plant step
contact
weight transfer
body rotation
exit stride
```

Do not simply play the stationary turn while translating the root forward.

The feet need to interact with the player's actual running stride.

---

## 27. STRIDE-AWARE CONTACT

The selected contact foot should make sense relative to:

```text
current stride
incoming ball
desired exit
```

Do not instantly swap which foot is forward merely because a particular receive animation prefers it.

Within safe limits:

```text
adjust stride
shorten step
lengthen step
prepare contact foot
```

before arrival.

---

## 28. PREPARATION TIME MATTERS

A player who sees the pass early has time to organize their body.

A ball arriving almost immediately provides less preparation time.

Even without Reactions/Vision attributes yet, the generic planner should respect available time.

Do not teleport the player into an ideal receive stance.

---

## 29. MOVING RECEIVE + BALL SPEED MATRIX

Test receiver movement against incoming pass difficulty.

Receiver:

```text
stationary
jog
run
sprint
```

Incoming ball:

```text
slow
normal
firm
hard
```

Desired turn:

```text
0°
30°
60°
90°
120°
150°
180°
```

Do not necessarily brute-force every Cartesian combination if redundant.

Use representative coverage, then expand diagnostics where failures cluster.

---

## 30. CRITICAL MANUAL CASES

Show at minimum:

### A — Sprint receive into stride

```text
receiver sprinting forward
pass arrives from behind/side
desired exit continues forward
```

### B — Running 30° receive

Small redirection without braking.

### C — Running 60° receive

Noticeable redirection while maintaining useful momentum.

### D — Running 90° receive

Body/touch work together to establish new line.

### E — Running 120° receive

Meaningful momentum cost.

### F — Sprinting 180° receive

Should clearly demonstrate that a full reversal cannot preserve the original velocity vector.

### G — Poor Ball Control while sprinting

Heavy touch forces stride/recovery adjustment.

### H — BC99 while sprinting

Exceptional touch into useful space.

---

## 31. MOMENTUM METRICS

Report:

```text
player speed before receive
minimum speed during receive
speed at contact
speed 0.25 s after
speed 0.50 s after
speed 1.00 s after

heading before
heading after

ball distance after contact
time to stable continuation
```

This will reveal artificial braking.

---

## 32. COMPARE AGAINST STATIONARY FOUNDATION

Moving-receive work must not regress the stationary system.

Rerun:

```text
stationary kills
stationary turns
aerial controls
Ball Control distributions
```

after Queue #2.

---

## 33. DRIBBLE-V1 HANDOFF

Once the moving receive establishes a valid controlled state:

```text
RECEIVE-CONTROL
→ DRIBBLE-V1
```

The handoff should preserve player momentum where appropriate.

Do not reset player velocity merely because receive state ended.

---

## 34. RANDOMNESS

Preserve the same deterministic execution architecture.

Moving state should alter:

```text
difficulty
geometry
result
```

but should not unnecessarily alter the semantic RNG key.

Matched counterfactuals should remain meaningful.

---

## 35. DO NOT ADD PRESSURE / DEFENDERS

Still use clean conditions.

No opposition pressure.

No tackling.

No Composure modifier.

We are isolating moving receive mechanics.

---

## 36. SUCCESS CRITERIA FOR QUEUE #2

Moving receives are ready for review when:

- same-direction receives flow into stride;
- jogging/running/sprinting do not cause universal braking;
- angled receives preserve momentum appropriately;
- large turns incur believable momentum cost;
- Ball Control changes touch quality rather than movement speed directly;
- body animation responds to real stride and authoritative ball state;
- DRIBBLE-V1 handoff preserves valid momentum;
- stationary receives remain unchanged;
- determinism passes.

---

# FINAL QUEUE #2 DELIVERABLE

Report:

1. moving-receive architecture;
2. player-motion inputs;
3. stride-aware contact logic;
4. preparation logic;
5. touch-into-stride behavior;
6. angled moving receives;
7. moving half-turn;
8. moving outside-foot turn;
9. moving through-stance turn;
10. momentum-redirection model;
11. sprint receive;
12. sprint 180° reversal;
13. Ball Control effects while moving;
14. BC50/70/80/90/99 comparisons;
15. movement-speed matrix;
16. incoming-ball-speed matrix;
17. turn-angle matrix;
18. player-speed before/after metrics;
19. DRIBBLE-V1 handoff;
20. stationary regression;
21. animation ON/OFF neutrality;
22. determinism;
23. performance;
24. review page/lab links;
25. known limitations.

Do NOT freeze RECEIVE-V1 automatically after Queue #2.

Present it for review.

---

# IMPORTANT ORDER

Again:

```text
FINISH CURRENT HUMAN-ANIMATION TASK

THEN

QUEUE #1
Integrate RECEIVE-KILL + RECEIVE-TURN
→ test
→ report
→ stop

THEN

QUEUE #2
Receiving while moving
→ test
→ report
→ stop
```

**Do not work on Queue #1 while the current animation task is unfinished.**

**Do not work on Queue #2 while Queue #1 is unfinished.**

Each step needs its own evidence and clean regression boundary.
