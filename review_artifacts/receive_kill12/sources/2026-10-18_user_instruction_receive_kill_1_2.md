The RECEIVE-KILL-1.1 compression moved in the correct direction, but it **overcorrected**.

Do NOT revert to the original RECEIVE-KILL-1 curve. That original model was far too harsh.

Instead, recalibrate the current compressed curve so that meaningful first-touch quality requires somewhat higher Ball Control.

# TARGET REMAPPING

The easiest way to understand the desired change is:

```text
CURRENT BC50 QUALITY
≈
NEW BC75 QUALITY
```

And approximately:

```text
CURRENT BC40 QUALITY
≈
NEW BC50 QUALITY
```

Then continue the new curve naturally in both directions.

These are calibration anchors, not hard lookup-table substitutions.

Do NOT implement:

if BC == 75:
    use oldBC50Result
```

Instead derive a new smooth continuous 1–99 curve whose execution-error magnitudes approximately satisfy those relationships.

---

# DESIRED INTERPRETATION

The current compressed model makes mediocre Ball Control too capable.

We now want something between:

```text
ORIGINAL MODEL
= much too harsh
```

and:

```text
CURRENT COMPRESSED MODEL
= somewhat too forgiving
```

but the result should be **closer to the current compressed model than to the original model**.

---

# RATING FEEL

The approximate intended hierarchy is now:

### BC99

Exceptional.

Almost perfectly executes feasible clean controls.

Keep the small nonzero elite floor.

### BC90

Elite control.

Very clean first touches even against difficult service, but visibly less perfect than 99.

### BC80

Very good.

Normally controls difficult service cleanly, but imperfect first touches should be visible.

### BC75

Good professional control.

This should now look approximately like what **current BC50** looks like.

That is an important calibration anchor.

### BC70

Competent but clearly below highly technical players.

Difficult balls should increasingly require adjustment/recovery.

### BC60

Mediocre technical control.

Normal service remains manageable, but difficult service should create visibly heavier touches and recovery demands.

### BC50

Weak Ball Control.

This should look approximately like **current BC40**.

Difficult balls should regularly require meaningful recovery, while still remaining recognizably professional football.

### BC40 and below

Progressively poor.

This is where genuinely ugly controls should become increasingly common on difficult incoming balls.

But do NOT return to the old behavior where routine difficult service causes absurd multi-metre explosions constantly.

---

# KEEP EASY-BALL COMPRESSION

This remains extremely important.

The:

```text
2 m/s roller
```

should remain easy across virtually the whole rating scale.

Do NOT make the new BC50 or BC30 suddenly incapable of controlling a slow roller.

The rating separation should emerge primarily as incoming difficulty rises.

Therefore:

```text
EASY BALL
→ ratings remain compressed
```

while:

```text
HARD BALL
→ new curve exposes ratings substantially more
```

---

# USE THE CURRENT MODEL AS THE BASELINE

Do not discard the RECEIVE-KILL-1.1 architecture.

Preserve:

- incoming-difficulty model;
- surface-specific control;
- deterministic matched draws;
- elite floor;
- easy-ball compression;
- rigid-body result;
- follow-up control;
- stable-control measurement;
- recovery classification;
- thigh/chest/head sequences.

Change primarily the:

```text
BALL CONTROL RATING → EXECUTION ERROR
```

mapping.

---

# BUILD THE NEW CURVE FROM THE ANCHORS

Find a smooth nonlinear mapping satisfying approximately:

```text
new BC75 error ≈ current BC50 error

new BC50 error ≈ current BC40 error
```

while preserving:

```text
new BC99 ≈ current BC99
```

or very close to it.

I also want:

```text
90 → 99
```

to retain meaningful elite separation.

Do not flatten the top end.

The lower end should then continue smoothly rather than suddenly exploding at 49.

---

# IMPORTANT: DON'T JUST SHIFT RATINGS LINEARLY

A simple linear remapping may not produce the right shape.

We want a curve where:

```text
99
90
80
75
70
60
50
40
30
20
10
```

all transition smoothly.

The professional middle should now have more differentiation than RECEIVE-KILL-1.1, while the very easy-ball compression still prevents ridiculous results.

Use the visual evidence to choose the simplest continuous curve that satisfies this.

---

# COMPARE THREE MODELS

For review, keep all three available:

```text
ORIGINAL RECEIVE-KILL-1
CURRENT RECEIVE-KILL-1.1
NEW CANDIDATE
```

Do not overwrite the evidence.

For every benchmark, show all three.

---

# MAIN BENCHMARK

Use the 22 m/s hard ground pass as the clearest calibration case.

Show at minimum:

```text
BC10
BC20
BC30
BC40
BC50
BC60
BC70
BC75
BC80
BC90
BC99
```

For each report:

- immediate residual velocity;
- first-touch placement error;
- 0.25 s error;
- 0.50 s error;
- 1.0 s error;
- 2.0 s legacy error;
- recovery distance;
- recovery time;
- contacts required;
- stable-control time;
- immediate / adjusted / recovery / unstable classification.

Explicitly highlight:

```text
NEW BC75
vs
CURRENT BC50
```

and:

```text
NEW BC50
vs
CURRENT BC40
```

using matched execution draws.

---

# REPEAT ACROSS DIFFICULTIES

Do not calibrate solely against the hard pass.

Repeat the comparison for:

```text
2 m/s roller
12 m/s normal pass
22 m/s hard pass
```

plus:

```text
thigh control
chest control
head control
```

The new mapping should preserve sensible behavior across all of them.

---

# FOLLOW-UP CONTROL STAYS

Keep the new follow-up-control system.

Do NOT remove it.

This is important because lower Ball Control should increasingly manifest as:

```text
less ideal first touch
→ extra player adjustment
→ later follow-up
→ perhaps extra touch
→ delayed continuation
```

rather than merely:

```text
ball flies farther away
```

That philosophy remains approved.

---

# AERIAL CONTROL

Preserve the complete sequences:

```text
THIGH
→ drop
→ foot follow-up

CHEST
→ cushion
→ foot follow-up

HEAD
→ downward cushion
→ foot follow-up
```

Re-evaluate these with the new Ball Control curve.

I expect the new curve to make differences between BC50 / 70 / 80 more visible than RECEIVE-KILL-1.1 currently does.

But do not make normal aerial controls cartoonishly bad again.

---

# VISUAL COMPARISON

Create matched side-by-side clips/still strips for:

```text
BC40
BC50
BC60
BC70
BC75
BC80
BC90
BC99
```

for:

1. 12 m/s ground pass;
2. 22 m/s ground pass;
3. thigh;
4. chest;
5. head.

Use the SAME execution draw within each comparison.

I want to visually judge the progression.

---

# WHAT I EXPECT TO SEE

For difficult service, the progression should increasingly resemble:

```text
BC99
almost effortless

BC90
elite clean control

BC80
very good control

BC75
good, but imperfect

BC70
competent with visible adjustment

BC60
noticeably heavier / slower continuation

BC50
weak, meaningful recovery frequently needed

BC40
poor control

BC30 and below
increasingly severe execution problems
```

Again, do not encode those as success percentages.

They should emerge from the physical first-touch state and follow-up sequence.

---

# DO NOT CHANGE OTHER SYSTEMS

Keep protected:

```text
DRIBBLE-V1
RECEIVE-CONTROL-1.1
PASSING
SHOOTING
BALL PHYS globally
```

This remains RECEIVE-KILL calibration.

Do not integrate yet.

---

# DETERMINISM

Preserve matched draws.

For example:

```text
same incoming ball
same seed
same standardized execution draw

CURRENT BC50
NEW BC75
```

must be directly counterfactual.

Do not reroll.

---

# FINAL DELIVERABLE

Return:

1. current RECEIVE-KILL-1.1 formula;
2. proposed new formula;
3. exact mathematical relationship between them;
4. confirmation that the target anchors are approximately met;
5. NEW BC75 vs CURRENT BC50;
6. NEW BC50 vs CURRENT BC40;
7. full 10–99 benchmark table;
8. old/original vs compressed/current vs new candidate;
9. ground-control results;
10. thigh results;
11. chest results;
12. head results;
13. complete follow-up-control results;
14. recovery distance/time;
15. stable-control timing;
16. matched visual comparisons;
17. deterministic verification;
18. regressions;
19. performance;
20. updated review/lab links.

Do NOT freeze the new curve.

Show it to me first.

The central calibration instruction is:

> **The current BC50 level of control should require approximately BC75 in the new curve, while the current BC40 level should correspond approximately to new BC50. Continue smoothly from those anchors while preserving near-perfect BC99 and strong easy-ball compression.**

And preserve the football philosophy:

> **Lower Ball Control should increasingly cost recovery time, adjustment and additional touches—not simply make the ball explode unrealistically far away.**
