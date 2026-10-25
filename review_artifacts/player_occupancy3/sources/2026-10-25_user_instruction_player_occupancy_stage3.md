Proceed to **PLAYER OCCUPANCY STAGE 3: PHYSICAL IMPACT + BALANCE RESPONSE**.

Stage 2 is approved as the foundation.

Use the Stage 2 decisions:

- committed planted feet remain exact;
- do NOT increase committed-foot give;
- keep the soft wall from altering the approach of an already-planned/committed move;
- no 2-tick look-ahead;
- keep 2 cm ordinary contact tolerance;
- keep 12 cm ordinary planted-player lean allowance;
- do not modify the approved canonical planted-foot swing/flick in this task.

Stage 3 should solve the remaining class that Stage 2 intentionally leaves unresolved:

> **Two physically incompatible player motions meet and occupancy/support constraints alone cannot separate them without corrupting the authored actions.**

This is no longer merely penetration correction.

It is a **physical impact event**.

The goal is to make contact between footballers produce believable consequences for BOTH bodies while preserving the approved football actions as far as physically possible.

Do NOT start by adding canned stumble/fall animations.

First build the underlying:

**CONTACT → IMPACT → BALANCE RESPONSE → RECOVERY**

architecture.

---

# 1. FREEZE AND AUDIT STAGE 2 FIRST

Before changing anything:

- reproduce Stage 2 exactly;
- record all existing Stage 2 regression results;
- preserve the shared possession/reaction architecture;
- preserve ball-access blocking;
- preserve support classification;
- preserve ordinary occupancy behavior;
- preserve Body Feint;
- preserve Croqueta LEG-WAVE V4;
- preserve Standing Tackle V1;
- preserve all existing single-player behavior.

Create an exact Stage 2 comparison harness.

Stage 3 should activate **only when genuine physical player contact requires an impact response**.

A player running alone must be identical to Stage 2.

Two players passing without meaningful contact must be identical to Stage 2.

---

# 2. STUDY THE REMAINING STAGE 2 CONFLICTS

Do not invent an impact model first.

Instrument the unresolved cases.

For every unresolved committed conflict record at the instant meaningful contact begins:

### Players
- world position;
- root velocity;
- facing;
- movement velocity;
- requested direction;
- current action;
- action phase/progress;
- whether action is committed.

### Support
For each player:

- planted feet;
- support foot;
- airborne feet;
- support polygon/point;
- estimated centre of mass / body centre;
- body position relative to support;
- whether the body is already leaning;
- available support/lean budget.

### Contact
Record:

- body region A;
- body region B;
- contact point;
- contact normal;
- penetration/depth;
- relative velocity at contact;
- normal relative velocity;
- tangential relative velocity;
- whether contact is torso/torso, shoulder/torso, pelvis/pelvis, thigh/leg, leg/leg, etc.;
- whether a fast limb caused it.

### Ball/action state
Record:

- ball state and owner;
- distance to ball;
- whether either player has already contacted the ball;
- whether a tackle is committed;
- whether Body Feint/Croqueta is committed;
- whether the contact occurs before or after the technical action's decisive event.

Build a report describing the actual conflict families before tuning responses.

---

# 3. IMPACT MUST COME FROM RELATIVE MOTION

Do NOT use:

`attacker gets X response`
or
`defender gets Y response`.

The response must arise from the physical state.

At minimum consider:

- relative velocity;
- direction of relative velocity;
- body contact location;
- support state;
- planted vs airborne;
- current lean/balance;
- action commitment;
- movement direction;
- whether one player is substantially more stationary/braced than the other.

Do NOT add arbitrary football-player strength ratings yet.

For Stage 3 V1, assume equal physical attributes unless the existing player model already provides an authoritative mass/physical parameter.

We are building mechanics first, not player-stat balancing.

---

# 4. CONTACT SEVERITY

Derive a continuous impact/severity measure from the physical interaction.

Do not begin with arbitrary animation categories.

The underlying response should be continuous.

For diagnostics you may classify the resulting events approximately as:

**BRUSH**
- negligible effect.

**LIGHT**
- torso/shoulder response;
- action largely survives.

**MODERATE**
- visible body displacement/rotation;
- balance correction required.

**STRONG**
- substantial loss of balance;
- committed action may be disrupted after its protected/decisive phase.

**SEVERE**
- player cannot recover with an ordinary balance step;
- candidate for future stumble/trip/fall handling.

But these labels are diagnostic outputs, not the physics themselves.

Do NOT implement full falls yet.

For SEVERE events, Stage 3 V1 may enter a clearly labelled `UNRESOLVED FALL CANDIDATE` after applying whatever physically defensible immediate impact response exists.

---

# 5. IMPULSE / RESPONSE DIRECTION

The collision response must respect the contact geometry.

A frontal chest collision should not produce the same result as:

- shoulder-to-shoulder contact;
- side contact;
- hip contact;
- thigh clipping;
- shin/leg contact;
- contact from behind.

Determine:

- separating direction;
- body translation response;
- body rotational response;
- how much each player absorbs.

Do not simply push roots apart along the shortest overlap vector.

Stage 2 already solved positional occupancy.

Stage 3 must represent the **momentum consequence**.

---

# 6. SUPPORT IS FUNDAMENTAL

A planted player should respond differently from an airborne player.

### Strongly planted/braced
May absorb more of the collision through:

- ankle;
- knee;
- hip;
- pelvis;
- torso lean.

### Single support / moving
Has less ability to resist certain directions.

### Airborne
Cannot magically brace against the ground.

### Already near balance limit
Should be easier to destabilize.

The planted foot itself must NOT slide merely to resolve the collision.

Force should instead express through the body chain until support can no longer plausibly contain it.

---

# 7. BODY RESPONSE MUST BE DISTRIBUTED

Do not resolve impact solely by moving the root.

A believable response should be distributed through the body.

Depending on contact:

- ankle compression;
- knee flexion;
- hip displacement;
- pelvis translation;
- pelvis yaw/roll;
- spine lean;
- chest rotation;
- shoulder movement;
- head continuation;
- arms counterbalancing.

Avoid:

**collision → root teleports sideways → authored pose continues unchanged**

That will look robotic.

The player's body should visibly absorb the impact.

---

# 8. PRESERVE AUTHORED ACTIONS AS LONG AS PHYSICALLY POSSIBLE

This is extremely important.

Body Feint, Croqueta and Standing Tackle are valuable approved motions.

Collision must not casually destroy them.

Think in terms of:

**authored action + physically generated perturbation**

rather than:

**authored action OR collision animation**.

For LIGHT/MODERATE contact, preserve the underlying action and layer the response onto it where possible.

For stronger contact, determine whether the action can continue.

Do not rewind an action.

Do not arbitrarily re-foot it.

Do not alter frames before contact.

No early information.

---

# 9. DECISIVE ACTION EVENTS

The timing of the collision relative to the football action matters.

For example:

### Before decisive ball touch
A sufficiently strong impact may prevent the intended technical touch.

### At the decisive touch
Resolve actual body and ball geometry at that instant.

### After decisive touch
The ball event may already have happened even if the player is subsequently knocked off balance.

Do not cancel a successful Croqueta touch retroactively because the player is hit afterward.

Likewise, do not award a tackle merely because its animation was committed.

Ball contact remains geometric and authoritative.

---

# 10. BALL / POSSESSION MUST REMAIN SEPARATE

Stage 3 does NOT assign possession because somebody “won the collision.”

Preserve the shared possession authority.

The physical system determines:

- where players are;
- how they react;
- whether a planned touch remains reachable;
- whether actual boot/ball contact occurs.

The existing ball/possession system determines:

- ball motion;
- FREE / CONTROLLED;
- control acquisition/loss;
- perception/reaction.

No tackle-winner roll.

No collision-winner possession assignment.

No hidden possession handoff.

---

# 11. BALANCE MODEL

Build a first explicit balance model.

It should consider at least:

- support state;
- body centre relative to support;
- current velocity;
- collision impulse;
- collision direction;
- torso/pelvis lean;
- existing action momentum.

The output should tell us whether the player can:

### A. ABSORB
Remain essentially on the existing action.

### B. CORRECT
Use body lean/rotation without taking another step.

### C. RECOVERY STEP
Need a new foot placement to remain upright.

### D. STAGGER CANDIDATE
Require more than one corrective step / substantial action interruption.

### E. FALL CANDIDATE
Cannot plausibly recover inside the available support geometry.

For Stage 3 V1, fully implement A–C.

Instrument D/E carefully.

Do NOT yet spend the task building elaborate stumble/fall animations.

---

# 12. RECOVERY STEP

This is the most important new visible behavior for Stage 3 V1.

If a player is pushed outside what the current support can absorb, allow a physically motivated recovery step.

The step should emerge from:

- body momentum;
- imbalance direction;
- available foot;
- current foot phase;
- collision direction.

Do not choose a canned left/right recovery animation solely from the contact side.

The recovery foot should plant where needed to catch the body.

Then:

**impact**
→ **imbalance**
→ **recovery foot moves**
→ **foot plants**
→ **weight accepted**
→ **body settles**
→ **ordinary locomotion resumes**

This should be continuous.

---

# 13. ACTION INTERRUPTION

Define explicit rules rather than arbitrary blending.

An action can be:

**UNAFFECTED**

**PERTURBED BUT CONTINUES**

**TECHNICAL EVENT COMPLETES, RECOVERY REPLACED**

**INTERRUPTED BEFORE TECHNICAL EVENT**

**STAGGER/FALL CANDIDATE**

Report exactly why.

For committed actions, bias strongly toward preserving the authored technical portion unless the physical impact genuinely makes it impossible.

---

# 14. DO NOT BUILD FOULS

No referee system yet.

No foul probabilities.

No cards.

No advantage.

No “legal/illegal tackle” classification.

Record objective physical facts that a future referee layer can consume:

- contact regions;
- relative velocity;
- ball contact time;
- player contact time;
- whether ball contact preceded player contact;
- resulting balance loss;
- resulting action disruption.

Physics first.

Rules later.

---

# 15. DO NOT BUILD FULL FALLS YET

Stage 3 V1 should establish whether a player **would fail to recover**.

For fall candidates:

- preserve the physical state at failure;
- record velocity/angular state/support/contact;
- expose the event in the Lab;
- stop or use a diagnostic placeholder after the failure point.

Do not make a generic collapse animation and call Stage 3 solved.

Once impact + balance is approved, we will build:

**Stage 3B — stumble / trip / fall / ground contact / get-up**

from this foundation.

---

# 16. TEST MATRIX

Test at minimum:

### Ordinary contact
- walking shoulder contact;
- jogging shoulder contact;
- head-on approach;
- oblique approach;
- pass-by near miss;
- one stationary / one moving;
- both moving.

### Body Feint
- feint past stationary defender;
- light shoulder contact;
- defender stepping into exit;
- feint into committed tackle;
- tackle recovering into feint.

### Croqueta
- Croqueta past stationary defender;
- shoulder/hip contact;
- leg contact;
- Croqueta into committed tackle;
- contact before first touch;
- between touches;
- after receiving touch.

### Standing Tackle
- clean ball poke;
- tackle miss;
- tackle into carrier;
- tackle into sharp cut;
- tackle into Body Feint;
- tackle into Croqueta;
- both players committed.

### Mirrored
Run all meaningful cases on both sides.

---

# 17. MEASURE THE RESULTS

For every test record:

- maximum torso penetration;
- maximum leg penetration;
- planted-foot error;
- root displacement due to impact;
- pelvis displacement;
- torso lean;
- angular response;
- relative speed before/after;
- support state;
- recovery-step location;
- time to regain balance;
- action outcome;
- technical touch outcome;
- possession outcome;
- severity;
- whether Stage 3 intervened.

Also report:

- visible root jolts;
- knee/foot discontinuities;
- crossed legs;
- ground penetration;
- impossible joint velocities;
- collision-response reversals/ping-pong;
- stuck players.

---

# 18. CONTINUITY

Impact cannot create a one-frame pose snap.

Inspect:

- position;
- velocity;
- acceleration.

Especially at:

**Stage 2 → impact begins**

**impact → maximum perturbation**

**maximum perturbation → recovery step**

**recovery step → weight acceptance**

**weight acceptance → locomotion**

Do not smooth by simply allowing players to penetrate deeply again.

If continuity and nonpenetration genuinely conflict, expose the trade-off rather than hiding it.

---

# 19. PERFORMANCE / SCALE

Design this so it can eventually support 22 players.

Do not globally solve all players against all players.

Reuse Stage 2's proximity/broad-phase approach.

The expensive impact/balance solve should activate only for meaningful contacts.

Report:

- idle cost;
- near-player cost;
- active-impact cost;
- worst tested 60 Hz frame cost.

Do not prematurely optimize away correctness, but avoid architecture that fundamentally requires O(N²) expensive solves for 22 players.

---

# 20. REVIEW LAB

Build:

# TOUCHLINE — PLAYER IMPACT + BALANCE V1 REVIEW

Compare:

**STAGE 2**

vs

**STAGE 3**

from identical inputs.

Controls:

- PLAY;
- REPLAY;
- 1×;
- 0.5×;
- 0.25×;
- frame step;
- loop;
- eight cameras;
- skin;
- skeleton;
- skin + skeleton;
- ball shown/hidden;
- contact volumes;
- support points;
- centre-of-mass/balance diagnostic;
- contact normal;
- impact vector;
- recovery-step target;
- world trails.

Show live:

- contact regions;
- relative velocity;
- impact/severity;
- support state;
- balance state;
- action state;
- interruption classification;
- possession state;
- maximum penetration.

I need to visually inspect whether the reactions actually look like football.

---

# 21. REGRESSION REQUIREMENTS

Must remain unchanged when Stage 3 is inactive:

- single-player movement;
- Body Feint approved motion;
- Croqueta LEG-WAVE V4;
- Standing Tackle V1;
- shared possession authority;
- MEDIUM reaction model;
- Stage 2 occupancy;
- ball physics;
- existing milestone regression suites.

Run torture tests with repeated contact and mirrored cases.

Require:

- deterministic results;
- no stuck players;
- no NaNs;
- no dual ownership;
- no possession chatter;
- no infinite collision loops;
- no repeated recovery-step oscillation.

---

# 22. DO NOT TUNE GAME BALANCE YET

Do not try to make defenders win a particular percentage.

Do not tune collision strength to produce desired tackle statistics.

Do not balance Body Feint or Croqueta.

We are asking:

> Given these two physical motions and this contact, is the resulting body response believable and internally consistent?

Outcome balancing comes later.

---

# REQUIRED REPORT

Return:

## STAGE 2 CONFLICT STUDY
What actually remained unresolved.

## IMPACT MODEL
Inputs and response calculation.

## SUPPORT / BALANCE MODEL
How planted, moving and airborne states differ.

## AUTHORED ACTION PRESERVATION
How perturbations coexist with Body Feint/Croqueta/Tackle.

## RECOVERY STEP
How it is selected and executed.

## ACTION INTERRUPTION
Exact classifications and reasons.

## BALL / POSSESSION
Proof that physical collision does not secretly assign possession.

## BODY FEINT RESULTS

## CROQUETA RESULTS

## STANDING TACKLE RESULTS

## COMMITTED-v-COMMITTED RESULTS

## CONTINUITY
Position/velocity/acceleration audit.

## FALL CANDIDATES
Cases Stage 3 V1 cannot recover physically.

## PERFORMANCE

## REGRESSION

## REMAINING LIMITATIONS

Then STOP for my visual review.

Do not freeze, merge or publish.

# CENTRAL TARGET

> **Stage 2 prevents ordinary phasing while protecting support and authored actions. Stage 3 must now make unavoidable player contact physically meaningful. Do not solve committed collisions by dragging roots apart or corrupting planted feet. Let contact create a physically motivated perturbation through the player's support, pelvis and upper body; preserve the football action when the player can absorb the impact, generate a real recovery step when balance requires one, and explicitly identify the cases that would require a stumble or fall. The ball and possession remain authoritative and separate. We are building the physical consequence of two footballers colliding, not canned collision animations.**
