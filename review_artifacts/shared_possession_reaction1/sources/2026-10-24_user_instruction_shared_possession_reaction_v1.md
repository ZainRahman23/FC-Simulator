The Tackling Integration V1 overnight run exposed two foundational problems that I want to fix together before we touch player-player collision or Slide Tackle.

# TOUCHLINE — SHARED POSSESSION + REACTION V1

The two problems are:

1. **There is no single authoritative two-player possession model.**
2. **The attacker can re-plan/react in the same frame that a tackle changes the ball.**

Fix these together.

This is now a foundational gameplay architecture task, not a Standing Tackle tuning task.

Do NOT solve the poor tackle-win rate by making the tackle stronger.

Do NOT change Body Feint, Croqueta, carry, gait, Technical Control, Agility, or the approved tackling body merely to produce nicer statistics.

The goal is:

> **One ball has one authoritative possession state, and players may only react to newly-created information after a physically/gameplay-believable perception/reaction interval.**

---

# 0. PROTECT THE CURRENT BASE

Start from the current tackling integration work and verify:

```text
base gameplay milestone
Body Feint
Croqueta LEG-WAVE V4
Standing Tackle V1
left-stick research
main
```

and their exact branches/SHAs.

Preserve the current Standing Tackle V1 as a diagnostic fixture.

Do not freeze or integrate it yet.

Create a new isolated branch/worktree for this architecture, based on the appropriate tackling integration commit, for example:

```text
prototype/shared-possession-reaction-v1
```

Do not touch main.

Do not modify the left-stick recognizer research.

---

# 1. FIRST DOCUMENT THE CURRENT FAILURE

Before changing anything, reproduce and instrument the existing problem.

For a representative tackle record frame-by-frame:

```text
attacker possession state
defender possession state

ball position
ball velocity

attacker planned next touch
defender planned next touch

tackle contact

attacker re-plan

defender re-plan

next attacker ball contact
next defender ball contact
```

Show explicitly how the current two independent one-player possession models create the bad result.

I want evidence for:

```text
TACKLE CONTACT
→ attacker reacts/re-plans immediately
→ attacker reaches ball again
```

where that currently occurs.

Do not rely only on aggregate percentages.

---

# 2. ONE BALL, ONE POSSESSION AUTHORITY

Create a shared authoritative possession/contest layer for a multi-player world.

There must no longer be two independent truths such as:

```text
ATTACKER: CONTROLLED
DEFENDER: CONTROLLED
```

for the same ball.

The ball/world owns the authoritative state.

Start with a deliberately small state model.

At minimum:

```text
CONTROLLED(playerId)

FREE

CONTESTED
```

If the existing architecture requires a slightly different representation, explain it.

Do not create a giant state machine.

---

# 3. CONTROLLED

`CONTROLLED(playerId)` means one player has established meaningful football control.

It must NOT mean:

```text
this player touched the ball most recently
```

A tiny deflection does not automatically establish possession.

Use the existing possession/control concepts wherever possible.

The shared authority should determine:

```text
who currently controls the ball
whether control has been broken
whether the ball is free
whether a contest is occurring
whether another player has established new control
```

---

# 4. FREE

The ball should become FREE when nobody currently has established control.

Examples may include:

```text
tackle knocks ball away
heavy touch
deflection
failed control
loose rebound
```

Do not automatically award the ball to the tackler.

This is critical.

A successful geometric tackle contact may produce:

```text
CONTROLLED(attacker)
→ FREE
```

without immediately becoming:

```text
CONTROLLED(defender)
```

The players then have to actually recover/control the ball.

---

# 5. CONTESTED

Use CONTESTED only where it has a clear useful meaning.

Conceptually:

```text
two or more players have credible immediate claims/opportunities around a loose ball
```

Do not use CONTESTED as a vague catch-all.

If FREE plus candidate-control evaluation is sufficient architecturally, explain that and keep the simpler representation.

The important requirement is:

> there is ONE authoritative answer.

---

# 6. POSSESSION MUST EMERGE FROM REAL BALL INTERACTION

Standing Tackle V1 already correctly does NOT simply hand possession to the defender.

Preserve that principle.

After tackle contact:

```text
ball trajectory changes
↓
existing attacker control may break
↓
ball becomes FREE / CONTESTED
↓
players continue physically
↓
a player makes a legitimate control interaction
↓
shared authority establishes CONTROLLED(player)
```

Do not use:

```text
tackle succeeded = defender owns ball
```

Do not use a rating roll.

Do not teleport the ball to anyone's feet.

---

# 7. CENTRALIZE POSSESSION TRANSITIONS

Audit every place in the current two-player fixture where a player can independently change possession state.

Replace multi-player ownership decisions with the shared authority.

Do this carefully.

The existing one-player game must remain behaviourally identical where only one player exists.

Prefer an architecture where:

```text
single-player world
```

uses the same authority trivially with one candidate player.

Do not maintain two fundamentally different possession systems if avoidable.

---

# 8. SECOND SYSTEM: PERCEPTION / REACTION

The current attacker can apparently respond to a tackle-created ball change immediately.

That is not acceptable.

But:

# DO NOT ADD GENERIC INPUT LAG.

This distinction is fundamental.

The player should continue responding immediately to information they already possessed and input they already issued.

Example:

If the user was already holding left before the tackle:

```text
continue existing leftward intention/body action
```

Do NOT freeze it.

What must be delayed is:

```text
REACTION TO NEW INFORMATION
```

created by the tackle/contact.

---

# 9. EVENT KNOWLEDGE

Introduce the smallest architecture necessary to distinguish:

```text
WORLD EVENT OCCURS
```

from:

```text
PLAYER MAY REACT TO THAT EVENT
```

For example:

```text
tackle changes ball at t = 0

attacker's previous plan continues

reaction/perception becomes available at t = X

only then may attacker re-plan specifically because of the new ball state
```

Do not overbuild a cognitive AI system.

This is Reaction/Perception V1.

---

# 10. WHAT COUNTS AS NEW INFORMATION?

At minimum investigate:

```text
opponent changes ball trajectory

possession breaks

ball becomes FREE

opponent establishes control

unexpected deflection/contact
```

These may require perception/reaction before a player's planner can use the changed information.

By contrast:

```text
own current input
own committed action
previously known ball trajectory
existing requested direction
```

should continue normally.

---

# 11. DO NOT MAKE THE PLAYER BLIND

Reaction delay does NOT mean freezing the entire simulation state seen by the player.

Separate:

```text
physical truth
```

from:

```text
action-planning knowledge
```

The real ball must continue moving correctly immediately.

Collision/contact must occur immediately.

Rendering must show reality immediately.

But the player's planner should not instantly produce a new optimal response to an event it could not yet have reacted to.

---

# 12. START WITH A SIMPLE BASELINE REACTION MODEL

Do not add attributes yet.

No:

```text
awareness rating
reactions rating
defensive awareness
composure
```

for V1.

Use one documented baseline reaction interval or a very small deterministic context-dependent model.

Do NOT choose the number merely to make tackling statistics look good.

Derive a plausible starting range from:

```text
existing gameplay cadence
touch intervals
stride timing
control windows
```

and, if useful, established human visual/simple-response literature.

If you use external research, distinguish it clearly from game-specific tuning.

The exact number remains provisional.

---

# 13. TEST MULTIPLE REACTION CANDIDATES

Do not silently choose one number.

Create at least three deterministic comparison candidates, for example:

```text
SHORT
MEDIUM
LONG
```

Use sensible values based on your investigation.

The spatial gameplay and tackle must remain identical.

Only the player's ability to re-plan from NEW information changes.

Expose these in the Lab so I can compare them.

---

# 14. PRE-EXISTING INPUT MUST SURVIVE

Create explicit tests proving:

If the attacker is already:

```text
steering left
cutting
performing Body Feint
performing Croqueta
```

before the tackle event, that action/input is not artificially paused merely because a reaction timer exists.

The player can continue their existing plan.

They simply cannot instantly create a NEW plan using tackle-created information.

---

# 15. COMMITTED ACTIONS

If Body Feint or Croqueta is already committed when the tackle happens:

preserve its existing commitment semantics.

Do not let Reaction V1 cancel or rewrite the approved move.

Likewise Standing Tackle retains its own commitment.

Reaction applies when planning the next response to new information.

---

# 16. REACTION AND POSSESSION MUST WORK TOGETHER

This is why these systems are being built together.

Example target:

```text
ATTACKER = CONTROLLED

defender tackles

real geometric contact occurs

ball trajectory changes immediately

shared authority decides attacker control is broken

BALL = FREE

attacker continues pre-contact momentum/plan

defender continues tackle/recovery

neither player magically owns the ball

after each player's reaction/planning availability and physical opportunity:

they may attempt to recover/control it

first player to legitimately establish control:

BALL = CONTROLLED(that player)
```

That is the core scenario.

---

# 17. NO ARTIFICIAL TACKLER PRIORITY

Do not bias the shared authority toward the defender because a tackle occurred.

Likewise do not preserve attacker priority merely because they previously had possession.

After control is genuinely broken:

```text
the ball is the ball.
```

Whoever physically establishes valid control next should receive possession.

---

# 18. CONTROL ACQUISITION

Define clearly what establishes control.

Use existing canonical possession logic as the foundation.

Audit whether it currently considers things such as:

```text
ball distance
relative velocity
touch geometry
ball speed
technical foot
planned next touch
```

Do not invent a massive new control model if the current one can be centralized.

But eliminate the pathological case where both players independently decide they control the same ball.

---

# 19. HYSTERESIS / OWNERSHIP CHATTER

Protect against:

```text
A controls
B controls
A controls
B controls
```

across adjacent frames.

Add the minimum necessary hysteresis/establishment semantics.

Do not create arbitrary long possession locks.

A legitimate immediate steal must still be possible.

Instrument every ownership transition.

---

# 20. TACKLE OUTCOMES MUST NOW BE EMERGENT

Re-run Standing Tackle V1 after the architecture changes.

Classify outcomes as:

```text
MISS

CONTACT — ATTACKER RETAINS

CONTACT — BALL FREE

CONTACT — DEFENDER RECOVERS

CONTACT — ATTACKER RECOVERS

CONTACT — THIRD/NEUTRAL OUTCOME if relevant
```

Do not tune percentages toward a desired distribution.

Report what naturally happens.

---

# 21. BODY FEINT AND CROQUETA

This is a critical regression/interaction test.

Run tackle encounters against:

```text
Body Feint

Croqueta LEG-WAVE V4
```

Their approved motion must remain EXACTLY unchanged.

The shared possession and reaction architecture may change the eventual outcome of the encounter because the world now resolves possession differently.

That is allowed.

Their body motion itself must not change.

---

# 22. SHARP CUT

Include the existing sharp-cut case.

The defender should be able to miss because the ball moved.

If the attacker had already initiated that cut before tackle contact, reaction delay must NOT suppress the cut.

This is an important proof that we have implemented:

```text
reaction to new information
```

rather than:

```text
input lag
```

---

# 23. NO PLAYER-PLAYER COLLISION YET

Do NOT solve body penetration in this task.

Keep measuring it and expose it in diagnostics.

But player-player occupancy/collision is Milestone 3.

Do not let this task expand into:

```text
body collision
shoulder challenges
shielding
trips
fouls
ragdolls
```

Document where the absence of collision affects results.

---

# 24. DO NOT TUNE POKE YET

Standing Tackle V1's POKE contact speed is currently provisional/guessed.

Do not tune it to improve win rates.

Keep it fixed for this architecture comparison.

After shared possession + reaction work correctly, we can calibrate tackle contact separately.

---

# 25. LAB

Extend/create the tackling lab as:

# TOUCHLINE — SHARED POSSESSION + REACTION V1 REVIEW

For representative scenarios show:

```text
ball authority state

owner playerId

control confidence/establishment if applicable

FREE / CONTESTED state

world event time

attacker knowledge/reaction availability

defender knowledge/reaction availability

current plan

next planned touch

actual next touch

possession transition reason
```

Timeline should make the architecture understandable visually.

---

# 26. REQUIRED SIDE-BY-SIDE

For the same deterministic tackle replay provide:

```text
OLD
```

versus:

```text
SHARED POSSESSION + REACTION
```

and reaction candidates:

```text
SHORT
MEDIUM
LONG
```

Keep all other inputs identical.

I want to see precisely why the old attacker recovers the ball and what changes under the new architecture.

---

# 27. KEY TEST: BALL HIDDEN / DIAGNOSTICS OFF

Also provide normal gameplay views without debug clutter.

Ultimately I need to judge:

> Does the interaction look like two footballers responding to one loose football?

rather than two independent simulations.

---

# 28. TEST MATRIX

At minimum run:

```text
standing defender vs carry

walking defender vs carry

jogging defender vs carry

tackle vs sharp cut

tackle vs Body Feint

tackle vs Croqueta

clean geometric tackle contact

weak contact

miss

attacker recovery

defender recovery

mirror cases
```

Use deterministic seeds/inputs.

---

# 29. REGRESSION — SINGLE PLAYER

This is extremely important.

Run the complete current single-player milestone regression.

When there is only one footballer:

```text
ordinary carry
steering
Body Feint
Croqueta
possession
ball touches
control
```

should remain identical unless a change is absolutely required by centralizing possession.

Prefer exact identity.

If anything differs, stop and explain why before accepting it.

---

# 30. REGRESSION — TACKLING BODY

Standing Tackle V1 body motion should remain unchanged.

We are fixing:

```text
world possession authority
+
planning/reaction
```

not the tackle animation.

Prove its body trajectory remains identical for identical committed tackles.

---

# 31. TORTURE TEST SHARED POSSESSION

Stress:

```text
rapid alternating contacts

near-simultaneous touches

both players reaching a free ball

control broken and regained

repeated tackle requests

ball moving between both players

mirrored worlds
```

Look specifically for:

```text
dual ownership

ownership chatter

possession without touch/opportunity

stale owner

FREE state never resolving

reaction timer never resolving

reaction event firing twice

planner using future/new information early
```

All must be instrumented.

---

# 32. DETERMINISM

Shared possession and reaction must be deterministic.

Same:

```text
inputs
initial state
reaction candidate
```

must produce identical:

```text
contacts
authority transitions
plans
ball trajectory
outcome
```

across repeated runs.

---

# 33. PERFORMANCE

Measure:

```text
single-player authority overhead

two-player authority overhead

reaction bookkeeping overhead

idle overhead

active contested-ball overhead
```

This should remain lightweight.

Do not prematurely optimize unless there is a meaningful regression.

---

# 34. DO NOT INTEGRATE/FREEZE YET

This is a foundational architecture candidate.

Do not merge it into the published gameplay milestone yet.

Do not freeze Standing Tackle.

I need to review:

```text
possession transitions
reaction timing
interaction feel
```

first.

---

# 35. REQUIRED REPORT

Return:

# TOUCHLINE — SHARED POSSESSION + REACTION V1

## OLD FAILURE

Show exactly why the attacker reclaimed the ball.

## SHARED POSSESSION AUTHORITY

Describe the new single source of truth.

## STATES

Exact meaning of CONTROLLED / FREE / CONTESTED or your justified simpler representation.

## CONTROL ACQUISITION

How a player actually establishes control.

## CONTROL LOSS

How control is broken.

## REACTION MODEL

Exactly what information is delayed and what remains immediate.

## REACTION CANDIDATES

SHORT / MEDIUM / LONG with actual timings and rationale.

## PRE-EXISTING INPUT

Proof that ordinary input/actions are not artificially delayed.

## TACKLING RESULTS

Outcome distributions without tuning the tackle.

## BODY FEINT / CROQUETA

Interaction results and proof their motions remain unchanged.

## SINGLE-PLAYER REGRESSION

Exact results.

## TORTURE / DETERMINISM

Exact results.

## PERFORMANCE

Exact results.

## COLLISION LIMITATIONS

Document effects that remain because player-player collision is intentionally not solved yet.

## PLAYABLE

Give me:

# TOUCHLINE — SHARED POSSESSION + REACTION V1 REVIEW

Then STOP.

Do not start Player Occupancy V1.

Do not start Slide Tackle.

Do not tune POKE.

Do not modify the approved attacking moves.

# CENTRAL TARGET

> **Replace the current two independent one-player possession truths with one authoritative ball/possession authority, and prevent players from instantaneously re-planning from information created by a tackle. Physical reality changes immediately; existing input and committed motion continue immediately; only reaction to genuinely new information is delayed. After a tackle breaks control, neither player is gifted the ball—the loose ball must be legitimately recovered and controlled.**
