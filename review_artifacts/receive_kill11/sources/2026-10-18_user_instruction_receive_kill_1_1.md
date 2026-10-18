RECEIVE-KILL-1 has the correct conceptual architecture, but after reviewing the measured results I want a **major compression of Ball Control execution error**.

After recalibrating that, implement the next logical step:

# FOLLOW-UP CONTROL

so that thigh/chest/head controls can become complete football actions rather than being judged only from their first contact.

Do NOT integrate this into the full RECEIVE-CONTROL-1.1 system yet.

This remains a focused calibration branch.

---

# PART A — BALL CONTROL SCALE IS CURRENTLY FAR TOO WIDE

The current model differentiates ratings much too aggressively.

Examples from the current 200-seed medians measured 2 seconds after contact:

```text
                    BC10    BC30    BC50    BC70    BC80    BC90    BC99

2 m/s roller        0.03    0.02    0.01    0.01    0.01    0.00    0.00 m

12 m/s pass         1.24    0.76    0.41    0.17    0.10    0.05    0.01 m

22 m/s hard pass    5.71    3.52    1.80    0.68    0.33    0.12    0.03 m

Thigh 6 m/s         0.83    0.63    0.46    0.27    0.19    0.10    0.04 m

Chest 8 m/s         2.02    1.55    1.08    0.64    0.43    0.24    0.08 m

Head 6 m/s          2.73    2.12    1.54    0.94    0.64    0.36    0.12 m
```

This is too harsh.

In particular:

```text
BC50
BC60
BC70
```

should still represent professional footballers who can normally control footballs.

They should not routinely blast difficult-but-normal incoming balls metres away.

---

# 1. COMPRESS THE SCALE A LOT

I want a **substantially tighter Ball Control distribution across almost the entire rating range**.

Do not make a tiny 10–20% adjustment.

The current low/mid-rating errors need to come down dramatically.

The basic qualitative relationship remains:

```text
easy ball
→ very little difference between ratings

difficult ball
→ visible difference between ratings
```

But "visible difference" should normally mean:

```text
elite player
→ ball dies almost perfectly

average player
→ ball moves somewhat farther / less ideally

poor player
→ heavier touch that may require recovery
```

rather than:

```text
elite player
→ controls ball

average player
→ ball flies 2 metres away

poor player
→ ball flies 5 metres away
```

---

# 2. PROFESSIONAL BASELINE

Remember what the 1–99 scale represents.

Even relatively low-rated players in this simulation are professional footballers.

Therefore something like:

```text
Ball Control 50
```

should NOT mean:

> cannot reliably trap a normal football.

It should mean:

> noticeably less refined than elite players, particularly when controlling difficult service.

Similarly:

```text
Ball Control 70
```

should represent a competent professional first touch.

A BC70 player should generally control ordinary and moderately hard service well.

---

# 3. KEEP EASY-BALL COMPRESSION

The existing 2 m/s roller behavior is good.

Current result:

```text
BC10 ≈ 3 cm
BC99 ≈ 0 cm
```

Do not destroy this.

A slow roller should remain easy for virtually everyone.

This principle is LOCKED:

> Easy incoming balls heavily compress rating differences.

---

# 4. HARD BALLS SHOULD STILL DIFFERENTIATE

Do NOT flatten the system completely.

For:

```text
20–25 m/s hard ground pass
```

I still want a visible difference between:

```text
BC30
BC50
BC70
BC80
BC90
BC99
```

But substantially reduce the magnitude.

The important difference should increasingly become:

```text
how cleanly the ball is killed
how far the next touch must reach
whether immediate continuation is possible
whether a recovery step/touch is required
```

rather than gigantic rebounds.

---

# 5. ROUGH QUALITATIVE TARGET

Do NOT hardcode these as final numerical targets.

Use them only to understand the scale I want.

For a difficult but plausible hard ground pass:

### BC99

Almost perfect kill.

```text
ball remains extremely close to intended control point
```

### BC90

Excellent.

```text
small visible residual movement
```

### BC80

Good.

```text
clearly not as perfect as 90/99,
but comfortably controllable
```

### BC70

Competent professional.

```text
moderately heavier touch
but normally remains immediately playable
```

### BC50

Weak technical player.

```text
clearly heavier touch
often requires adjustment/recovery
but should NOT routinely launch several metres away
```

### BC30

Very poor professional control.

```text
heavy touch becomes genuinely dangerous
but ordinary difficult service should not automatically become absurd
```

### BC10

Extreme low end.

This can produce genuinely poor controls on difficult service.

Even here, easy balls should remain manageable.

---

# 6. REVISIT THE MATHEMATICAL CURVE

Current formula includes:

```text
E =
0.0068
+ 0.40 × ((100 − BC)/90)^1.1 × D/(D + 1)
```

and:

```text
sigma =
K_surface × 10 m/s × D × E
```

Do NOT preserve these constants merely because the architecture works.

The overall error magnitude is too large.

Propose a substantially compressed replacement.

You may adjust:

```text
0.40
rating exponent
difficulty interaction
surface scaling
```

as necessary.

Keep:

```text
nonzero elite floor
continuous ratings
easy-ball compression
difficulty interaction
matched deterministic draws
```

---

# 7. CONSIDER STRONGER NONLINEARITY

I suspect we want more of the meaningful differentiation concentrated toward the lower end while keeping the professional middle tighter.

Investigate a curve where:

```text
99 → 90
```

is visibly meaningful,

```text
90 → 70
```

widens progressively but remains controlled,

and:

```text
70 → 40 → 10
```

expands more strongly.

But do not assume this exact mathematical shape.

Test it visually.

The important requirement is:

> Ratings below 70 should not suddenly cross into cartoonishly bad football.

---

# 8. SEPARATE FIRST-TOUCH ERROR FROM TWO-SECOND DISPLACEMENT

The current headline metric measures:

```text
distance from intended point 2.0 seconds after contact
```

This is useful but can exaggerate aerial errors.

Add more immediate measurements.

For every control report:

```text
post-contact velocity immediately after touch

position error at:
0.10 s
0.25 s
0.50 s
1.00 s
2.00 s
```

This is especially important for:

```text
thigh
chest
head
```

because an airborne ball can travel considerably after a technically good first contact.

I want to distinguish:

```text
BAD FIRST CONTACT
```

from:

```text
GOOD FIRST CONTACT
+ NORMAL SUBSEQUENT BALL MOTION
```

---

# 9. DO NOT PUNISH AIRBORNE SURFACES JUST BECAUSE TIME PASSES

The current model notes that airborne error travels before turf can slow it.

That is physically true.

But do not calibrate Ball Control solely around the 2-second displacement metric.

The quality of the initial control should be evaluated at contact and during the immediate post-contact phase.

A good chest control that drops 40 cm into useful space can be excellent football even if the ball is not sitting at the original intended point two seconds later.

---

# PART B — COMPLETE THIGH / CHEST / HEAD CONTROL

Once the compressed Ball Control model is working, implement the next logical receive stage:

# FOLLOW-UP CONTROL

Currently only the first KILL contact is modeled.

For:

```text
THIGH
CHEST
HEAD
```

that is incomplete.

These actions naturally produce a ball that must subsequently be controlled.

---

# 10. CONTROL IS SOMETIMES A SEQUENCE

For a foot kill:

```text
incoming ball
→ foot contact
→ ball killed
```

may be sufficient.

But aerial control often looks like:

```text
incoming aerial ball
→ thigh/chest/head cushion
→ ball drops
→ player adjusts
→ foot control
→ stable possession
```

That entire sequence should be understood as one receiving/control episode.

---

# 11. ADD FOLLOW-UP FOOT CONTROL

For appropriate aerial KILL actions, after:

```text
THIGH
CHEST
HEAD
```

allow the receiver to schedule a follow-up foot control when the ball reaches a feasible height.

Conceptually:

```text
FIRST CONTROL
      ↓
authoritative rigid-body ball
      ↓
predict descending ball
      ↓
FOLLOW-UP FOOT CONTROL
      ↓
stable controllable ball state
```

Do not glue the ball to the player between contacts.

The ball remains a rigid body throughout.

---

# 12. THIS IS STILL AN AUTHORED ACTION SYSTEM

Do not return to giant physical foot-contact searches.

The receive action may authoritatively schedule:

```text
first control surface
first contact

ball drop

body preparation

follow-up foot
follow-up contact window
```

The simulation still determines the resulting ball state.

Animation will later explain it.

---

# 13. BALL CONTROL SHOULD APPLY TO BOTH CONTACTS

The player's Ball Control rating should influence:

```text
initial aerial cushion
```

and:

```text
follow-up foot control
```

But do NOT simply roll two completely unrelated errors.

Use causally localized deterministic execution.

The first contact creates a real ball state.

The follow-up then responds to that resulting state.

---

# 14. HIGH BALL CONTROL SHOULD LOOK FLUID

For BC99:

```text
chest
→ ball drops exactly where intended
→ foot takes it cleanly
```

should feel like one controlled sequence.

Likewise:

```text
thigh
→ controlled drop
→ immediate foot possession
```

The player should not appear to perform two unrelated actions.

---

# 15. LOWER BALL CONTROL SHOULD CREATE RECOVERY DEMANDS

This is where I want much of the attribute differentiation to emerge.

Instead of:

```text
BC50
→ first touch blasts ball 2 metres away
```

prefer situations like:

```text
BC50
→ chest control drops slightly too far forward
→ player needs an extra step
→ follow-up foot contact is later/harder
```

or:

```text
BC40
→ thigh touch drops awkwardly to the side
→ follow-up requires body adjustment
```

This is much more football-like.

So attribute differences can manifest through:

```text
extra recovery distance
extra recovery time
awkward follow-up geometry
additional touch requirement
loss of immediate continuation
```

not merely massive rebound velocity.

---

# 16. CONTROL QUALITY METRICS

For complete control sequences, report:

```text
first-contact residual speed

first-contact placement error

time until next feasible control

distance player must adjust

number of contacts required

time until stable control

ball distance from player at stable control

whether immediate movement can resume
```

These may ultimately be more useful than a binary success rate.

---

# 17. DEFINE "STABLE CONTROL"

Create an explicit diagnostic definition for:

```text
STABLE CONTROL
```

Do not make it a hidden possession switch.

For calibration it might mean something like:

```text
ball within usable player radius
+
ball relative speed sufficiently low
+
next normal action feasible
```

Propose the exact diagnostic criteria.

This is for measurement.

Do not turn it into ball attachment.

---

# 18. HEAD CONTROL

Be especially careful with head control.

A head cushion should generally be:

```text
head contact
→ ball redirected downward / into useful nearby space
→ player moves underneath/toward it
→ subsequent control
```

A perfect head control does not need to leave the ball stationary.

Therefore the quality of HEAD control should be judged by:

```text
quality of the intended downward cushion
+
quality/ease of follow-up
```

rather than raw 2-second displacement alone.

---

# 19. CHEST CONTROL

Likewise:

```text
chest
→ cushion downward
→ ball falls into useful foot-control window
→ foot control
```

This should become one of the clearest Ball Control demonstrations.

At high BC:

```text
minimal adjustment
quick follow-up
fluid continuation
```

At lower BC:

```text
less ideal drop
more adjustment
later continuation
```

without cartoonishly launching the ball away.

---

# 20. THIGH CONTROL

Thigh control should similarly prioritize:

```text
drop placement
```

over merely minimizing post-contact velocity.

High BC:

```text
ball drops precisely toward useful foot position
```

Lower BC:

```text
drop becomes less convenient
```

Again, use recovery difficulty rather than huge rebound distance as much as possible.

---

# 21. KEEP SURFACE IDENTITIES

Preserve:

```text
FOOT
= strongest true kill

SOLE
= strongest deadening surface where geometry permits

THIGH
= controlled drop

CHEST
= cushioned downward/front drop

HEAD
= cushioned downward redirect
```

Do not make all surfaces converge toward "ball stops dead."

---

# PART C — NEW CALIBRATION VIEW

After recalibration and follow-up implementation, rebuild the visual matrix.

Ratings:

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

Incoming cases should still include:

```text
2 m/s roller
12 m/s ground pass
22 m/s hard ground pass

thigh control
chest control
head control
```

But now show BOTH:

```text
FIRST CONTACT
```

and:

```text
FINAL STABLE CONTROL
```

where applicable.

---

# 22. SHOW TWO RESULTS FOR AERIAL CONTROL

For each aerial cell show:

### Initial cushion

```text
first contact vector
residual speed
drop point
```

### Complete receive

```text
follow-up contact
stable control point
time to stable control
player adjustment
```

This should let us judge the full football action.

---

# 23. BUILD RATING COMPARISON CLIPS

For the same incoming ball and same execution draw, create side-by-side/still-strip comparisons for:

```text
BC30
BC50
BC70
BC80
BC90
BC99
```

I want the difference to look increasingly like:

```text
more recovery work
less clean continuation
```

rather than:

```text
ball explodes farther and farther away
```

---

# 24. KEEP MATCHED RANDOMNESS

This remains mandatory.

Same incoming ball + same seed:

```text
BC30
BC50
BC70
BC90
```

must use the same standardized execution tendency.

Changing Ball Control scales the error.

Do not reroll.

---

# 25. DO NOT INTEGRATE INTO RECEIVE-CONTROL-1.1 YET

Complete this calibration first.

Keep:

```text
RECEIVE-CONTROL-1.1
DRIBBLE-V1
```

protected.

After I approve:

```text
compressed Ball Control scale
+
follow-up control behavior
```

we can wire it into the full receiving system.

---

# 26. REGRESSION

Confirm:

```text
DRIBBLE-V1 frozen evidence unchanged

RECEIVE-CONTROL-1.1 714-run matrix unchanged

animation ON/OFF neutral

Chrome/Node deterministic
```

No unrelated systems should change.

---

# 27. PERFORMANCE

The current KILL resolver is extremely cheap:

```text
~0.04–0.18 ms per kill
```

Preserve the authored-action performance advantage.

The follow-up control sequence can cost more, but do not return to brute-force biomechanics.

Report:

```text
first contact cost
follow-up prediction cost
follow-up contact cost
whole receive episode cost
```

---

# FINAL DELIVERABLE

Give me:

1. old Ball Control formula;
2. new compressed formula;
3. why the new curve is narrower;
4. old-vs-new results for every benchmark;
5. BC10–99 matrices;
6. immediate post-contact measurements;
7. 0.10 / 0.25 / 0.50 / 1.0 / 2.0 s measurements;
8. foot-kill results;
9. thigh first-contact results;
10. chest first-contact results;
11. head first-contact results;
12. follow-up foot-control implementation;
13. complete thigh-control sequences;
14. complete chest-control sequences;
15. complete head-control sequences;
16. time-to-stable-control results;
17. recovery-distance results;
18. matched-rating visual comparisons;
19. interactive lab;
20. performance;
21. determinism;
22. regression;
23. known limitations;
24. links to all review material.

Do NOT freeze the constants automatically.

I want to visually review the compressed scale.

The most important change is:

> **Ball Control differences should primarily change how cleanly and conveniently the player brings the ball under control—not cause mediocre professional players to routinely blast the ball metres away.**

And for aerial balls:

> **Judge the complete control sequence, not merely how far the ball happens to be from the first intended point two seconds after the initial cushion.**
