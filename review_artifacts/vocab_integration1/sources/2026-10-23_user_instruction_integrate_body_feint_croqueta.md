# Owner instruction — DRIBBLING VOCABULARY INTEGRATION: Body Feint (video-guided + exit foot) and La Croqueta LEG-WAVE V4 (verbatim, received 23 Oct 2026 ≈ 23:31 EEST)

---

We now have two dribbling actions I want to preserve and integrate into the actual Touchline dribbling vocabulary:

# 1. BODY FEINT — VIDEO-GUIDED + EXIT-FOOT VERSION

# 2. LA CROQUETA — LEG-WAVE V4

The Croqueta V4 is finally solid enough.

STOP developing new dribbling moves.

Do NOT work on Ball Roll yet.

Do NOT redesign either approved motion.

This task is:

# LOCK THEIR CURRENT MOTION → INTEGRATE THEM INTO THE REAL DRIBBLING LIBRARY → PROVE THEY WORK IN ORDINARY PLAY.

---

# FIRST — CREATE A SAFE MILESTONE

Before integration, preserve the exact approved source/evidence for:

```text
BODY FEINT
- video-guided full-body rebuild
- exit-foot correction

LA CROQUETA
- LEG-WAVE V4
- current approved reference-side jog case
```

Record exact:

```text
branch
commit(s)
source files
dependencies
review pages
test/evidence files
```

Create an appropriate checkpoint/tag/manifest so these versions can always be reconstructed exactly.

Do NOT rewrite history.

Do NOT merge unfinished unrelated experiments.

I want a known-good recovery point before integration begins.

---

# STATUS

Treat these as:

```text
BODY FEINT:
PROVISIONALLY APPROVED MOTION FOUNDATION

CROQUETA LEG-WAVE V4:
PROVISIONALLY APPROVED MOTION FOUNDATION
```

This does NOT mean permanently frozen.

Future:

```text
defenders
ratings
input recognition
speed adaptation
```

may teach us more.

But integration must NOT casually retune their animation.

---

# PRESERVE THE MOTION

The integration layer is allowed to decide:

```text
whether the move is eligible
when it begins
which side/direction
what state enters it
what happens after it
```

It is NOT allowed to silently change the approved core motion.

In particular preserve Body Feint's:

```text
full-body lie
false step
torso/shoulder/arm/head action
hip-first reversal
exit-foot behavior
outside-foot exit touch
```

and Croqueta V4's:

```text
good right-side setup

leg-wave principle:
| |
→ \ \
→ / /
→ | |

receiving foot opening outward instead of jumping forward

left foot never passing the ball before receive

diagonal left + backward first wave

whole-body bow reversal

left-inside cushion

continuous body/ball sweep
```

Do not simplify Croqueta back into:

```text
touch right
→ touch left.
```

---

# INTEGRATE INTO THE REAL VOCABULARY

I want both actions available through the same actual dribbling architecture used by:

```text
carry
hooks
Cruyff
Ronaldo Chop
Matthews
V-turn
Stop-and-Go
existing vocabulary
```

Do NOT keep Body Feint and Croqueta as special review-page-only animations.

They need to become real techniques in the vocabulary/library.

Use the current canonical integration branch/worktree architecture and source-of-truth documentation.

Do not create another parallel gameplay system.

---

# IMPORTANT — DO NOT BUILD THE FINAL LEFT-STICK RECOGNIZER YET

We will build the full intent-recognition/control system AFTER this integration.

For now I want to prove:

> **The approved techniques can be requested and executed correctly inside ordinary canonical dribbling play.**

Use explicit/manual test requests where necessary.

Do not prematurely invent the final mobile gesture language.

---

# BODY FEINT — LIBRARY ENTRY

Create/upgrade the authoritative Body Feint vocabulary entry so that it points to the approved video-guided/exit-foot implementation.

The OLD Body Feint should NOT remain eligible as an alternative solution.

Keep it only as historical evidence if needed.

The library should understand the technique approximately as:

```text
BODY FEINT

manual / explicit for now

fake one direction
→ exit opposite direction

ball remains quiet during the lie

whole body sells false direction

hips reverse

exit foot releases

outside-foot touch into real exit
```

Do not yet AUTO-select Body Feint from arbitrary joystick steering.

That comes with the intent recognizer.

---

# BODY FEINT — BOTH DIRECTIONS

Verify:

```text
fake LEFT → exit RIGHT

fake RIGHT → exit LEFT
```

The approved mirror should remain numerically/visually coherent.

Do not redesign the reference side while validating the mirror.

---

# CROQUETA — LIBRARY ENTRY

Replace the old Croqueta/ADV-4 as the primary authored Croqueta with:

# LEG-WAVE V4

ADV-4 may remain as:

```text
historical comparison
or
explicit fallback if genuinely necessary
```

but it must NOT silently override V4 in a valid V4 entry state.

The authoritative Croqueta identity should now be:

```text
one continuous lateral leg/body wave

ball begins on one side

first inside foot sweeps diagonally across/back

receiving leg opens outward with the wave

ball arrives at already-open opposite inside

opposite inside cushions

body resolves into exit
```

---

# DO NOT GENERALIZE CROQUETA BY DESTROYING V4

V4 currently represents one proven reference case.

Do NOT immediately force that exact animation across every:

```text
walk
jog
run
stride phase
ball side
entry state
```

Instead use a capability hierarchy.

Something like:

```text
PROVEN V4 CASE
→ use LEG-WAVE V4

VALID MIRROR
→ use validated mirrored LEG-WAVE V4

UNVALIDATED ENTRY
→ either use an existing safe fallback
   OR decline Croqueta
```

Do NOT distort V4 simply to claim universal coverage.

---

# MIRROR CROQUETA CAREFULLY

The first extension I do want is the proper opposite-side mirror.

Validate:

```text
RIGHT ball → LEFT receive

LEFT ball → RIGHT receive
```

The mirrored action must preserve the same wave principle.

Specifically:

```text
receiving foot opens outward
does not jump forward
does not pass ball before receive

both legs change orientation as one wave

ball follows corresponding diagonal/back path

opposite inside cushions
```

If the mirror fails visually or geometrically:

STOP and report it.

Do not weaken the approved reference side to make mirroring easier.

---

# WRONG BALL SIDE / INVALID ENTRY

Do not teleport or prearrange the ball.

If Croqueta is requested but the actual ball/body state cannot enter LEG-WAVE V4 correctly:

the selector should know:

```text
CROQUETA V4 NOT CURRENTLY FEASIBLE
```

Then either:

```text
use the explicitly documented safe fallback
```

or:

```text
decline the technique and continue controlled carry
```

depending on what best fits the existing vocabulary architecture.

Report the policy you choose.

Do not fake eligibility.

---

# TECHNIQUE ELIGIBILITY MUST RESPECT REAL STATE

For both moves, inspect:

```text
ball side
support foot
stride phase
player speed
current gait state
previous touch
requested direction
```

before beginning.

The technique should enter from a physically compatible state.

But avoid huge artificial setup delays.

If the requested technique requires a valid next support/stride opportunity, use the earliest natural one.

---

# POSSESSION PHILOSOPHY

Preserve our established principle:

```text
valid move
+
no defender
+
high/reference dribbler
=
CONTROLLED
```

Do not introduce random self-loss simply because these are advanced moves.

Difficulty/rating effects come later.

---

# CHAINING

This is important.

Once integrated, test transitions:

```text
CARRY
→ BODY FEINT
→ CARRY

CARRY
→ CROQUETA
→ CARRY
```

Then test a small number of useful chains:

```text
BODY FEINT
→ ordinary cut

BODY FEINT
→ Croqueta

Croqueta
→ ordinary cut

Croqueta
→ Cruyff

Croqueta
→ carry
```

Do NOT create special canned combo animations.

The next action should begin from the real ending:

```text
ball position
body position
support state
velocity
```

of the previous action.

---

# CONTROL RETURN

Measure when meaningful player control returns after:

```text
Body Feint

Croqueta
```

Do not reserve control until every decorative body channel has completely returned to neutral.

As soon as:

```text
ball is controlled
support is valid
next action is physically possible
```

the next request should be allowed.

---

# BODY FEINT MUST NOT REGRESS

Integration must preserve the approved:

```text
upper-body lie
false-step geometry
exit-foot tuck
hips-first reversal
outside-foot exit
```

Run the existing Body Feint review cases before and after integration.

The same deterministic request should reproduce the approved motion.

---

# CROQUETA MUST NOT REGRESS

Likewise preserve the V4 reference case.

For the exact same entry state used in the approved Lab:

the integrated library version should reproduce the same:

```text
setup
leg trajectories
body bows
ball path
receive
cushion
exit
```

within deterministic/numerical tolerance.

I want a direct:

```text
V4 REVIEW BUILD
vs
INTEGRATED LIBRARY V4
```

comparison.

They should be effectively identical.

---

# REMOVE DUPLICATE ELIGIBLE VERSIONS

Audit the vocabulary after integration.

I do NOT want confusing eligible duplicates such as:

```text
OLD BODY FEINT
BODY FEINT V2
VIDEO-GUIDED BODY FEINT
EXIT-FOOT BODY FEINT
```

all competing.

Likewise I do not want:

```text
ADV-4 CROQUETA
VIDEO-GUIDED CROQUETA
HOP/SWEEP
X-SWEEP
LEG-WAVE V4
```

all appearing as equivalent production techniques.

Organize them clearly:

```text
PRODUCTION / PROVISIONAL AUTHORITATIVE

HISTORICAL

EXPERIMENTAL

REJECTED / SUPERSEDED
```

Only the intended current technique should be eligible in normal library selection.

---

# LIBRARY REVIEW PAGE

Update the main Dribbling Lab so I can review the actual integrated vocabulary.

For:

# BODY FEINT

provide:

```text
PLAY
MIRROR
TRY
1×
0.5×
0.25×
```

For:

# LA CROQUETA

provide the same.

The cards should clearly state:

```text
PROVISIONALLY APPROVED
INTEGRATED INTO VOCABULARY
```

and show current eligibility/entry information.

---

# MANUAL SANDBOX REQUEST

In the joystick sandbox, give me a temporary explicit way to request:

```text
BODY FEINT LEFT
BODY FEINT RIGHT

CROQUETA LEFT
CROQUETA RIGHT
```

from ordinary dribbling.

This is temporary diagnostic/manual input.

Do NOT treat it as the final mobile control scheme.

I want to feel:

```text
ordinary carry
→ request move
→ move executes
→ ordinary control resumes
```

inside the real sandbox.

---

# AUTO SELECTION

Do NOT broadly enable automatic Body Feint/Croqueta selection yet.

Keep AUTO conservative.

The final intent recognizer will determine when these should emerge from left-stick behavior.

For now:

```text
manual request
+
explicit curated tests
```

are sufficient.

If existing B4 already selects Croqueta in some clearly valid situation, preserve/document that only if it does not conflict with this task.

Do not expand AUTO scope.

---

# REGRESSION

Verify that integration does NOT alter:

```text
ordinary carry
hooks
Cruyff
Ronaldo Chop
Matthews
V-turn
Stop-and-Go
other approved/provisional vocabulary
possession
determinism
```

except where a curated request explicitly invokes one of the two newly integrated techniques.

---

# PERFORMANCE

Measure CPU cost before/after integration.

Earlier Croqueta builds showed suspicious CPU differences even when Croqueta was not requested.

After integration:

```text
NO BODY FEINT REQUEST
+
NO CROQUETA REQUEST
```

should not incur meaningful new per-tick cost.

If it does, identify why.

Do not hide it as noise without repeating the measurement appropriately.

---

# SOURCE-OF-TRUTH CLEANUP

Update the authoritative handoff/manifest so a future session can answer immediately:

```text
What is the current Body Feint?

What is the current Croqueta?

Where is each implemented?

What version is superseded?

What is integrated?

What remains provisional?

What entry states are validated?

What is NOT yet generalized?
```

This is important.

We have accumulated many experimental generations of both techniques.

Future sessions should not accidentally resurrect an older one.

---

# DO NOT WORK ON

```text
Ball Roll
Stepover
Elastico
Roulette
new dribbling moves

final left-stick recognizer
Dribbling 1–99
defenders

shooting
passing
tackling
```

This task is only consolidation + integration.

---

# DELIVERABLE

Return:

## MILESTONE

Exact:

```text
branch
commit
tag/checkpoint
```

for the preserved pre-integration approved state.

## BODY FEINT

Report:

```text
authoritative source
library entry
validated directions
entry requirements
control return
regression result
```

## CROQUETA

Report:

```text
authoritative LEG-WAVE V4 source
library entry
reference-side result
mirror result
entry requirements
fallback/decline policy
control return
```

## VOCABULARY CLEANUP

List which older variants are now:

```text
HISTORICAL
SUPERSEDED
EXPERIMENTAL
```

and confirm they are not competing in normal selection.

## PLAYABLE

Give me the updated:

# DRIBBLING LAB

and:

# JOYSTICK SANDBOX

with both integrated moves playable inside the real canonical vocabulary.

## REGRESSION

Report:

```text
approved Body Feint reproduction
approved Croqueta V4 reproduction
other move regression
possession
determinism
CPU
browser
```

Then STOP.

Do not start the left-stick recognizer.

# CENTRAL TARGET

> **We have finally built Body Feint and La Croqueta motions worth keeping. Preserve those exact motion foundations, make them authoritative entries in the real Touchline dribbling vocabulary, prove they execute correctly from ordinary canonical play and return cleanly to ordinary control, remove older competing versions from eligibility, and create a clean milestone before we begin designing the final left-stick intent system.**
