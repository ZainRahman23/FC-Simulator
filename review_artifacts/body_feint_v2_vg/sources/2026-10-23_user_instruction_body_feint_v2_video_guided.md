# Owner instruction — BODY FEINT V2, video-guided (verbatim, received 23 Oct 2026 ≈ 14:30 EEST)

The attached recording (`~/Desktop/Screen Recording 2026-10-23 at 12.11.32 PM.mov`, 7.6 s, 60 fps screen capture) is third-party football footage. It is **not committed**: only owner screenshots go to Git.

---

/Users/zainrahman/Desktop/Screen\ Recording\ 2026-10-23\ at\ 12.11.32 PM.mov I am attaching a video showing the **body-feint motion I actually want**.

For now, STOP all other development.

Do not work on:

- Croqueta;
- other skill moves;
- shooting;
- ratings;
- defenders;
- integration;
- unrelated gait issues.

Work **only on BODY FEINT V2**.

The current V2 is better than the old feint, but it still needs substantial visual improvement.

This video is now the primary **visual/mechanical reference** for what the feint should feel like.

## FIRST: STUDY THE VIDEO

Before changing code, inspect the attached `.mov` carefully:

- at 1×;
- slow motion;
- frame-by-frame;
- across multiple examples in the recording if present.

Do not reduce the reference to one number such as shoulder angle or pelvis displacement.

Break the action down as a coordinated whole-body movement.

Study specifically:

- approach rhythm;
- last step before the fake;
- false-side foot placement;
- support-foot loading;
- knee flexion;
- ankle/foot orientation;
- pelvis translation;
- pelvis rotation;
- hip loading;
- centre-of-mass movement;
- torso lean;
- chest orientation;
- shoulder drop;
- shoulder rotation;
- head movement;
- arm positioning;
- free-leg movement;
- timing of maximum false commitment;
- how quickly the weight comes back;
- true exit foot placement;
- first useful movement in the real direction;
- relationship between body and ball throughout;
- acceleration after the deception;
- how quickly the player looks natural again afterward.

The critical thing is the **timing relationship between all of these**.

## DO NOT LITERALLY TRACE ONE PLAYER FRAME-BY-FRAME

Use the recording to understand the football mechanic.

I want the Touchline player to reproduce the **movement principle and visual character**, not become a literal motion-capture copy of one person's exact proportions.

Preserve our player's own anatomy and canonical movement architecture.

---

# MAIN VISUAL TARGET

The feint should read approximately as:

```text
approach naturally

→ false-side foot establishes the lie

→ knee/hip genuinely load that side

→ pelvis shifts toward the false direction

→ torso follows enough to make it believable

→ shoulder/head/arms reinforce the same story

→ for a brief moment the entire player looks capable of leaving that way

→ weight reverses

→ hips release toward the real exit

→ exit foot reorganizes

→ ball leaves with the player

→ player accelerates naturally into the true direction
```

It should feel like **one continuous athletic action**.

Not a sequence of poses.

---

# COMPARE THE VIDEO DIRECTLY AGAINST CURRENT BODY FEINT V2

Use the exact current Body Feint V2 implementation as the comparison.

Create a structured comparison:

```text
REFERENCE VIDEO
vs
CURRENT V2
```

For each major phase identify:

```text
TOO EARLY
TOO LATE
TOO LARGE
TOO SMALL
WRONG DIRECTION
WRONG BODY PART
MISSING
GOOD
```

Do this before tuning.

I specifically want to know **why the current implementation does not visually read like the reference yet**.

---

# DO NOT CHASE THE OLD NUMBERS

Current V2 measurements such as:

```text
23 cm false step
12 cm body shift
13° shoulder drop
20° trunk lean
14° head cue
~0.3 s false phase
```

are NOT targets.

They were measurements of our first attempt.

If the video shows that these should change, change them.

Visual/mechanical fidelity to the reference is more important than preserving those values.

---

# TIMING MAY BE MORE IMPORTANT THAN AMPLITUDE

Pay particular attention to this.

The current implementation may have roughly the correct body parts moving but still look wrong because:

```text
foot
knee
pelvis
torso
shoulder
arm
head
```

reach their cues at the wrong relative times.

Determine from the reference whether the deception propagates through the body in a particular sequence.

For example, investigate whether the reference reads more like:

```text
foot/load
→ hip/pelvis
→ torso/shoulder
→ reversal
```

or some overlapping variation.

Do not assume my example is correct. Use the video.

---

# THE FALSE DIRECTION MUST BE BELIEVABLE

At the strongest point of the fake, freeze the frame.

Ask:

> If I could only see the player's body at this instant, would I reasonably believe they are about to leave in the false direction?

If not, diagnose why.

Possibilities include:

```text
feet reveal the exit
pelvis reveals the exit
COM never actually loads the fake
shoulders move without the hips
arms remain in ordinary run cycle
head gives no cue
free leg is already preparing the true direction
```

Fix the actual cause.

---

# BUT KEEP IT COMPACT

Do not respond by making everything enormous.

The target is:

```text
convincing
compact
fast
coherent
elite
```

not theatrical.

Use the reference recording to determine how much movement is actually necessary.

---

# BALL RELATIONSHIP

Study the ball carefully.

Determine:

- whether the ball is touched during the lie;
- how close it remains to the body;
- which foot eventually takes the exit;
- where the ball is relative to the false-side load;
- when the exit touch occurs relative to hip reversal.

Preserve our CONTROLLED philosophy.

No random self-loss.

Do not make the ball perform the deception if the reference shows that the **body** performs it.

---

# SUPPORT HISTORY MUST BE REAL

Do not fake the motion at presentation level.

The false-side plant/load and true exit must be represented through the real:

```text
support
stance
swing
plant
committed landing
```

architecture where appropriate.

If the pelvis visibly shifts because the player loads the false side, that should correspond to the actual canonical body/support state.

---

# ARMS MATTER

The reference should be used specifically to improve the arms.

The old feints have historically looked poor partly because the upper body did not behave as one athlete.

Study:

```text
false-side arm
opposite arm
elbow bend
shoulder position
arm swing interruption
counterbalance during reversal
arm drive on exit
```

Do not leave the normal running arm cycle underneath the feint.

Do not simply spread the arms.

---

# SHOULDERS + CHEST + PELVIS RELATIONSHIP

This is probably one of the most important visual areas.

Study how much:

```text
shoulder line
chest
pelvis
```

move together and how much they counterrotate.

Do not rotate all three as one rigid block.

Do not independently twist them without anatomical reason.

The player should have believable spinal/torso organization throughout.

---

# FEET MUST NOT GIVE THE GAME AWAY

At every frame before reversal, inspect whether:

```text
support foot
free foot
toe orientation
step placement
```

already reveal the real exit.

The feet should participate in selling the lie.

Then they must reorganize quickly enough to make the real exit possible.

---

# EXIT QUALITY

The current V2 takes as much as roughly 1 second from request to touch depending on stride.

Use the video to determine whether our timing feels too slow.

Do NOT solve this by steering toward the true exit before the fake.

Instead investigate:

```text
earlier feasible entry
shorter false-load phase
faster unload
better stride-phase selection
earlier exit-foot preparation after commitment
```

while preserving the deception.

For the elite/99 reference player, I want:

> convincing lie + extremely efficient release.

---

# USE NORMAL TOUCHLINE MOVEMENT FOR THE BURST

No special feint acceleration bonus.

The exit should use the existing:

```text
A99-C
Agility B
D38
```

movement capability.

The feint prepares the body for the exit.

It does not teleport or boost the player.

---

# MIRROR

Once one direction genuinely matches the reference mechanics well:

```text
FAKE LEFT → EXIT RIGHT
```

mirror it properly:

```text
FAKE RIGHT → EXIT LEFT
```

including:

```text
support identity
hips
pelvis
shoulders
arms
feet
ball relationship
```

Do not independently author a lower-quality mirror.

---

# VISUAL ITERATION IS THE MAIN TASK

Spend the majority of this task on:

```text
render
watch
compare
adjust
repeat
```

not adding features.

Judge primarily at **1×**.

Slow motion and frame stepping are diagnostic tools.

A feint that looks technically correct at 0.25× but awkward at 1× is not acceptable.

---

# UPDATE THE BODY FEINT LAB

Make the video-guided V2 easy for me to review.

Provide prominent:

```text
REFERENCE-INFORMED V2
OLD
PREVIOUS V2
```

comparisons where possible.

At minimum retain:

```text
GAMEPLAY
FRONT
REAR CLOSE
SIDE CLOSE
OVERHEAD CLOSE

1×
0.5×
0.25×

FRAME STEP
LOOP
```

I particularly want FRONT and REAR CLOSE because those make the:

```text
feet
knees
hips
shoulders
arms
```

easy to judge.

---

# CURATED CASES

Prioritize quality over quantity.

Give me excellent versions of:

```text
JOG — FAKE LEFT → RIGHT
JOG — FAKE RIGHT → LEFT

LOW SPEED — LEFT → RIGHT
LOW SPEED — RIGHT → LEFT

RUN — LEFT → RIGHT
RUN — RIGHT → LEFT
```

Do not work on sprint yet unless the reference/mechanics are already excellent at the above speeds.

---

# KEEP IT MANUAL

Do not work on AUTO selection.

Do not decide whether B4 should choose the feint.

Do not build defender reaction.

This is purely:

> **make the body feint itself excellent.**

---

# REGRESSION

Do not modify unrelated skill moves to make this work.

Preserve:

```text
ordinary carry
Cruyff
Ronaldo Chop
Croqueta
Matthews
V-turn
Stop-and-Go
```

and existing CONTROLLED possession.

If a shared-body fix is genuinely required, prove why and show its effects on the other actions.

---

# DELIVERABLE

When finished, report:

## What the video taught us

Describe the important mechanical/timing observations from the supplied recording.

## Why previous V2 looked wrong

Be specific.

## What changed

For:

```text
feet
knees
hips/pelvis
torso
shoulders
arms
head
ball
timing
exit
```

## Before / after

Compare:

```text
OLD FEINT
PREVIOUS V2
VIDEO-GUIDED V2
```

## Integrity

Report:

```text
plant slides
foot jumps
leg crossings
knee pops
pelvis discontinuities
torso spikes
shoulder spikes
possession losses
```

## PLAYABLE

Give me the updated:

# BODY FEINT V2 — VIDEO-GUIDED REVIEW

Then stop.

Do not freeze or integrate it.

# PRIMARY ACCEPTANCE TEST

At 1×:

> **I should see the entire player tell one believable lie and then escape the other way.**

The feet, knees, hips, pelvis, torso, shoulders, arms and head should not look like separate animated pieces.

They should look like one elite footballer shifting weight to deceive an opponent.

Use the attached video as the visual reference and keep iterating until our movement captures that same fundamental quality.
