Continue from **TOUCHLINE — SHARED POSSESSION + REACTION V1**.

I provisionally accept:

- the shared possession authority architecture;
- **MEDIUM = 0.200 s** as the provisional Reaction V1 default for this next experiment.

Do NOT freeze or publish those systems yet.

The next blocker is now clear:

# TOUCHLINE — PLAYER OCCUPANCY V1

We measured player-player overlap approaching **30 cm**, and some loose-ball recoveries occur with one footballer physically reaching the ball through the other player's body.

Fix that problem now.

This is **Stage 1 only**.

# CENTRAL GOAL

> Two footballers must no longer be able to occupy physically impossible amounts of the same space or reach a ball through another footballer's body.

This is NOT yet realistic collision/impact physics.

We are separating:

```text
STAGE 1 — PLAYER OCCUPANCY
detect body contact
prevent impossible penetration
preserve authored motion as much as possible

STAGE 2 — CONTACT RESPONSE
momentum transfer
braking
deflection
physical displacement
strength/resistance

STAGE 3 — FOOTBALL CONSEQUENCES
shielding
physical tackles
stumbles
trips
fouls
falls
```

Implement **Stage 1 only**.

Do NOT start Stage 2 or Stage 3.

---

# 0. PROTECT THE CURRENT SYSTEMS

Start from the Shared Possession + Reaction V1 architecture candidate.

Verify exact branch/commit/base first.

Preserve:

```text
Body Feint
Croqueta LEG-WAVE V4
Standing Tackle V1
Shared Possession Authority V1
Reaction V1
ordinary carry
ordinary locomotion
ball/contact model
Trajectory/ball behaviour
left-stick research
```

Do not modify the approved Body Feint or Croqueta body motion.

Do not tune Standing Tackle POKE.

Do not alter the 0.200 s MEDIUM reaction candidate during this task.

Do not touch main.

Create an isolated branch/worktree, for example:

```text
prototype/player-occupancy-v1
```

based on the correct Shared Possession + Reaction V1 commit.

---

# 1. REPRODUCE THE FAILURE FIRST

Before implementing occupancy, instrument representative existing encounters.

Measure player-player penetration for:

```text
standing face-to-face
walking convergence
jogging convergence
side-by-side movement
loose-ball race
Standing Tackle
sharp cut
Body Feint
Croqueta
```

For each, record:

```text
closest body regions
penetration depth
relative player positions
relative velocity
ball position
possession state
whether either player reaches/touches the ball through the opponent
```

Preserve OLD replays for direct comparison.

I want the existing ~30 cm failure explicitly reproduced before it is fixed.

---

# 2. BUILD A CANONICAL PLAYER OCCUPANCY REPRESENTATION

Use the current player body/skeleton as the source.

Do NOT reduce each footballer to one giant cylinder if that creates obviously incorrect football interactions.

Build the minimum useful set of body occupancy volumes.

At minimum investigate useful representations for:

```text
pelvis / hips
torso
upper legs
lower legs
```

and, only where needed:

```text
shoulders / upper arms
```

Feet require special care because they must still interact naturally around the ball.

Do not create an unnecessarily expensive full rigid-body ragdoll.

The occupancy volumes should follow the real animated body.

---

# 3. SOFT CONTACT, HARD LIMIT

I do NOT require mathematically zero penetration.

A tiny amount of overlap may be necessary because:

- our character animation is authored rather than physically simulated;
- collision volumes are approximations;
- zero-tolerance solvers can jitter.

Define:

```text
CONTACT TOLERANCE
```

and:

```text
HARD PENETRATION LIMIT
```

based on actual geometry/testing.

Small contact tolerance may be acceptable.

Something like the existing **20–30 cm body penetration is absolutely not**.

Do not choose thresholds just to make tests pass. Document them.

---

# 4. DETECTION AND RESOLUTION ARE DIFFERENT

Separate:

```text
CONTACT DETECTION
```

from:

```text
PENETRATION RESOLUTION
```

Detection answers:

> Which body regions overlap, by how much, and along what separating direction?

Resolution answers:

> What is the minimum correction required to restore plausible occupancy?

Keep these layers separable because Stage 2 will later build contact response on top of the same detection information.

---

# 5. NO REALISTIC IMPACT RESPONSE YET

This is critical.

Do NOT implement:

```text
momentum transfer
strength contests
mass-based impacts
shoulder barges
bounce
stumble
fall
trip
foul
ragdoll
knockback
```

yet.

For V1, resolve only enough positional/root occupancy to prevent impossible interpenetration.

If two players run into one another, they may look somewhat mechanically constrained for now.

That is acceptable.

I first need to verify that the contact geometry itself is trustworthy.

---

# 6. PRESERVE AUTHORED ANIMATION

Player occupancy must NOT destroy the approved body actions.

For example, during Croqueta:

```text
the Croqueta skeleton/joint animation remains the approved Croqueta.
```

During Body Feint:

```text
the Body Feint skeleton remains the approved Body Feint.
```

During Standing Tackle:

```text
the tackle body action remains the tackle.
```

Prefer resolving:

```text
root/world placement
```

rather than rewriting joint poses.

Do not IK-warp an approved action merely to avoid another player unless absolutely necessary.

If root-only resolution cannot solve a case, document it rather than silently deforming the animation.

---

# 7. COMMITTED ACTION OWNERSHIP

Occupancy must respect action commitment.

A committed:

```text
Body Feint
Croqueta
Standing Tackle
```

must not be cancelled just because contact occurs.

The action continues.

Occupancy adjusts physical coexistence around it.

Later Contact Response V1 may alter momentum appropriately.

Not now.

---

# 8. SUPPORT / PLANTED FEET

This is one of the hardest requirements.

Do not fix body overlap by creating huge:

```text
plant slides
support-foot teleportation
pelvis jumps
```

If a player's foot is physically planted, treat that constraint seriously.

Measure:

```text
support anchor drift
root correction
pelvis correction
foot correction
```

during occupancy resolution.

If two constraints genuinely cannot coexist, report the conflict rather than hiding it.

---

# 9. BALL ACCESS MUST RESPECT BODY OCCUPANCY

This is the most important football consequence of Stage 1.

A player must not gain access to the ball through the opponent's occupied body volume.

Example:

```text
ATTACKER
    |
    | body
    |
BALL

DEFENDER behind attacker
```

The defender must not simply have a planned foot touch pass through the attacker's pelvis/torso/leg volume to collect the ball.

Add an occupancy-aware ball-access test.

This does NOT mean the body automatically owns/protects the ball.

It means:

> a proposed ball interaction cannot require an impossible path through another player's body.

Legitimate reaches around the opponent must still be possible.

---

# 10. DO NOT CREATE AN INVISIBLE FORCE FIELD

Avoid excessive player separation.

Footballers can get very close.

Their limbs can pass beside/around one another.

A defender should still be able to poke around an attacker.

Occupancy should prevent impossible anatomical penetration, not create a 50 cm bubble around every player.

This is why body-region geometry matters.

---

# 11. LOOSE-BALL RACES

This is a primary validation scenario.

Use Shared Possession + Reaction V1 with MEDIUM reaction.

Run identical loose-ball races OLD vs OCCUPANCY.

Determine whether:

```text
attacker recovers
defender recovers
ball remains free
```

and whether either player previously "won" only because they passed through the other.

Classify old recoveries into:

```text
LEGITIMATE

BODY-PHASED

AMBIGUOUS
```

Then show what Occupancy V1 does to them.

---

# 12. STANDING TACKLE

Re-run the exact same **209 committed Standing Tackle cases** used in Shared Possession + Reaction V1.

Do NOT change:

```text
tackle motion
POKE
reaction timing
possession authority
inputs
```

Only add occupancy.

Compare:

```text
Miss
Contact — attacker retains
Contact — attacker recovers
Contact — defender recovers
Contact — ball free
```

But do NOT tune toward any desired distribution.

The important question is:

> Which outcomes change because players can no longer reach the ball through one another?

Report that explicitly.

---

# 13. BODY FEINT

Run deterministic defender encounters against the approved Body Feint.

Check:

```text
joint motion unchanged
ball motion unchanged unless legitimate interaction occurs
occupancy respected
no defender passes through attacker
no attacker passes through defender
no giant root snap
no planted-foot corruption
```

If the defender is wrong-footed and misses, let him miss.

Do not make occupancy an invisible tackle assist.

---

# 14. CROQUETA

Croqueta is especially important because its entire purpose involves carrying the ball across/around an opponent.

Run deterministic Croqueta encounters.

The defender must NOT:

```text
phase through the attacker
reach through the attacker's hips/legs
magically collect the ball through occupied space
```

But the attacker must also NOT receive an artificial force-field advantage.

A legitimate defender foot reaching around the body may still contact the ball.

Preserve LEG-WAVE V4 exactly.

---

# 15. SIDE-BY-SIDE CASE

Create a deterministic side-by-side run.

The players should be capable of being very close without:

```text
jitter
explosion
teleportation
rapid side switching
large oscillation
```

Occupancy should remain stable over time.

Do not add shoulder-barge physics.

Just prove they can coexist.

---

# 16. HEAD-ON CASE

Create a head-on convergence test.

Since Stage 2 is not implemented, do NOT attempt realistic collision momentum.

Use the simplest deterministic occupancy resolution that prevents the bodies from passing through one another.

Measure what happens to:

```text
root positions
speed
support
action plans
```

and clearly label the response as provisional.

---

# 17. STATIC BLOCKER

One player stationary.

The other walks/jogs directly into him.

The moving player must not pass through the stationary player.

Do not use this to create a permanent immovable wall rule.

It is simply an occupancy test.

---

# 18. CONTACT MANIFOLD / DIAGNOSTICS

For every detected player contact expose:

```text
player A
player B

body region A
body region B

penetration depth
contact normal / separating direction

root correction A
root correction B

support state A
support state B

action state A
action state B

ball access blocked? yes/no
```

This information will be the foundation of Contact Response V1 later.

---

# 19. RESOLUTION PRIORITY

Do not simply move both players 50/50 in every case.

Investigate constraints such as:

```text
planted vs unplanted
committed vs ordinary gait
stationary vs moving
support state
available correction direction
```

But keep this conservative.

Do NOT turn these into physical strength/mass rules yet.

The objective is:

```text
minimum correction required for valid occupancy
```

not:

```text
simulate who wins the collision.
```

---

# 20. CONTINUITY

The solver must not introduce one-frame corrections.

Measure:

```text
root position delta/frame
pelvis delta/frame
support-foot delta/frame
velocity discontinuity
```

Look specifically for:

```text
snap
jitter
oscillation
solver ping-pong
```

If correction needs multiple frames, make it deterministic and continuous.

---

# 21. NO DEADLOCK

Two players must not become permanently stuck together because both solvers refuse to move.

Stress:

```text
head-on
side-by-side
crossing paths
one turning away
both turning away
one committed
both committed
```

Verify separation resolves naturally when their requested paths diverge.

---

# 22. MULTIPLE CONTACT REGIONS

Do not assume only one capsule pair matters.

If:

```text
thigh ↔ thigh
+
torso ↔ shoulder
```

overlap simultaneously, the solver must remain stable.

Use a deterministic manifold/aggregate resolution strategy.

Do not alternate wildly between individual contacts frame by frame.

---

# 23. BALL IS NOT A PLAYER COLLISION BODY

Do not accidentally change canonical ball physics.

Player-player occupancy is separate from:

```text
foot ↔ ball
body ↔ ball
```

ball interaction.

Existing ball/contact rules remain authoritative.

Occupancy may block an impossible player's path to a ball, but it must not arbitrarily push the ball because two player volumes overlap.

---

# 24. SHARED POSSESSION + REACTION

Use:

```text
Reaction = MEDIUM 0.200 s
```

as the provisional fixed candidate for all V1 occupancy comparisons.

Do not compare SHORT/MEDIUM/LONG again unless necessary for diagnosis.

The goal is to remove reaction timing as another variable.

Shared Possession remains authoritative.

---

# 25. PLAYER OCCUPANCY LAB

Build:

# TOUCHLINE — PLAYER OCCUPANCY V1 REVIEW

Required deterministic cases:

```text
static blocker
head-on walk
head-on jog
side-by-side
crossing paths
loose-ball race
Standing Tackle
Standing Tackle miss
sharp cut
Body Feint
Croqueta
mirror cases
```

For each provide:

```text
OLD
OCCUPANCY V1
```

from identical inputs.

---

# 26. REVIEW CONTROLS

Provide:

```text
PLAY
REPLAY
1×
0.5×
0.25×
frame step
loop

SKIN
SKELETON
SKIN + SKELETON

occupancy volumes ON/OFF
contact normals ON/OFF
ball-access path ON/OFF
diagnostics ON/OFF
```

Cameras:

```text
GAMEPLAY
FRONT
REAR
SIDE LEFT
SIDE RIGHT
3/4 FRONT
3/4 REAR
OVERHEAD
```

---

# 27. VISUAL OVERLAP DISPLAY

I want overlap to be obvious.

Show body volumes with:

```text
normal = non-contact
contact = touching
penetrating = clearly highlighted
```

Display live:

```text
maximum current penetration
maximum penetration this replay
body regions involved
```

OLD should make the previous 20–30 cm penetrations visually undeniable.

OCCUPANCY V1 should show what replaces them.

---

# 28. ACCEPTANCE TARGET

Do NOT define success as mathematically zero overlap.

Instead establish evidence-based targets.

At minimum:

- eliminate deep body penetration;
- eliminate ball recoveries through an opponent's body;
- no visible solver jitter;
- no large root teleport;
- no new plant slides;
- no corruption of approved actions;
- deterministic results.

Report:

```text
median penetration
p95
p99
maximum
```

for OLD and V1.

Separate:

```text
torso/pelvis
legs
arms if included
```

---

# 29. SINGLE-PLAYER REGRESSION

When only one player exists, Player Occupancy V1 should effectively do nothing.

Run the complete milestone regression.

I expect exact identity for:

```text
locomotion
carry
Body Feint
Croqueta
possession
ball touches
```

If anything differs in single-player play, treat it as a bug unless absolutely justified.

---

# 30. TWO-PLAYER REGRESSION

Protect Shared Possession + Reaction semantics.

Check:

```text
no dual ownership
no stale ownership
no ownership chatter
no blind control grants
reaction event once
no new information used before perception
```

Occupancy must not break possession authority.

---

# 31. TACKLE BODY REGRESSION

For committed tackles, compare local joint animation against Standing Tackle V1.

Joint trajectories should remain unchanged unless you can prove a correction is necessary.

World root position may differ because occupancy now prevents penetration.

Report those separately:

```text
LOCAL POSE DIFFERENCE
WORLD ROOT DIFFERENCE
```

Do not conflate them.

---

# 32. TORTURE TEST

Run long deterministic two-player torture tests containing:

```text
repeated convergences
loose-ball races
crossing paths
rapid turns
tackle requests
Body Feints
Croquetas
players separating and meeting again
```

Look for:

```text
deep penetration
jitter
explosive correction
stuck players
root drift
support-foot sliding
leg crossing caused by correction
ball access through body
ownership errors
non-determinism
```

---

# 33. PERFORMANCE

Measure:

```text
occupancy detection idle
occupancy detection near another player
active resolution
ball-access occlusion checks
```

Report cost per tick/frame/simulated second.

This architecture will eventually need many players, so do not build an obviously O(N²) all-to-all expensive system without discussing broad-phase implications.

For V1 with two players, correctness comes first.

But document how it could scale to 22 players.

Do NOT build the 22-player broad phase yet unless trivially reusable.

---

# 34. DO NOT SOLVE THESE YET

Explicitly leave these for later:

```text
momentum transfer
mass/strength
shoulder challenges
shielding
stumbling
falls
trips
fouls
cards
advantage
ragdolls
tackle-force tuning
POKE calibration
slide tackle
```

If you discover requirements for those systems, document them.

Do not implement them.

---

# 35. REQUIRED REPORT

Return:

# TOUCHLINE — PLAYER OCCUPANCY V1

## OLD FAILURE

Quantify the existing penetration and ball-through-body recoveries.

## OCCUPANCY REPRESENTATION

Exact body regions and geometry.

## CONTACT DETECTION

How contacts are detected.

## PENETRATION RESOLUTION

How minimum correction is chosen.

## SUPPORT / COMMITMENT

How planted feet and committed actions are protected.

## BALL ACCESS

How impossible reaches through another body are prevented.

## STANDING TACKLE RESULTS

The exact same 209 cases, before/after, with no tackle tuning.

## LOOSE BALL RESULTS

Which OLD recoveries were caused by phasing.

## BODY FEINT

Interaction results + proof approved local motion is unchanged.

## CROQUETA

Interaction results + proof LEG-WAVE V4 is unchanged.

## PENETRATION STATISTICS

OLD vs V1:

```text
median
p95
p99
maximum
```

## CONTINUITY

Snaps/jitter/root corrections/support drift.

## REGRESSION

Single-player and two-player results.

## TORTURE / DETERMINISM

Exact results.

## PERFORMANCE

Exact results and expected scaling implications.

## KNOWN LIMITATIONS

Especially everything requiring Stage 2 Contact Response.

## PLAYABLE

Give me:

# TOUCHLINE — PLAYER OCCUPANCY V1 REVIEW

Then STOP.

Do NOT start Contact Response V1.

Do NOT tune Standing Tackle.

Do NOT start Slide Tackle.

Do NOT freeze or publish the architecture.

# CENTRAL ACCEPTANCE QUESTION

> **Can two animated footballers now share the same football world without physically passing through one another, without winning the ball through another player's body, and without corrupting their approved animations — while leaving realistic impact response for the next milestone?**
