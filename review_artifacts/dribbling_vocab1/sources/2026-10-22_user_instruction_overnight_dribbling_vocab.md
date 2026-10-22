# Owner instruction — 22 Oct 2026 ≈ 05:15 EEST (pasted in the session as two blocks, saved verbatim)

## Block 1

Yes. For this overnight pass I'd give Claude considerably more autonomy than usual. The priority should be:

1. Record Agility Scale B as selected.
2. Fix the generic 150–180° / braking / reversal locomotion failures.
3. MAIN MISSION: build a genuinely broad, researched dribbling vocabulary—not five more moves.
4. Integrate those techniques into B4/B5/CONTROLLED so they actually enhance what the player can do.
5. Decide intelligently which techniques should be automatic, contextual-auto/manual, or primarily explicit.
6. Validate chaining, mirroring, support, contacts and possession.
7. Leave you a serious playable Dribbling Lab plus the unified sandbox in the morning.

Send Claude this:
6-HOUR OVERNIGHT MISSION — COMPLETE ELITE DRIBBLING VOCABULARY + ROBUST HIGH-ANGLE LOCOMOTION
You may spend up to approximately six hours on this mission.

Work autonomously.

Research where useful.

Implement, test, inspect failures, fix systemic causes, rerun tests and continue iterating.

Do NOT stop after producing a starter set of techniques.

The main owner request is:
I WANT A FULL, ROBUST DRIBBLING / TECHNICAL VOCABULARY TO PLAYTEST WHEN I WAKE UP.
We already have a promising Technical Control foundation.

Tonight, expand it into a genuinely rich football dribbling system.

Nothing is frozen.
OWNER DECISIONS — RECORD THESE FIRST
AGILITY
Owner has reviewed the physical-rating experiment and selects:
AGILITY SCALE B

as the provisional Agility rating curve.

Preserve:
Agility 99 = A99-C

and use:
Scale B

below 99.

Do not continue A/B/C Agility experimentation unless implementation reveals an actual defect.
EXISTING PHYSICAL ATTRIBUTE DECISIONS
Preserve:
Sprint Speed 99
= 38.0 km/h

Acceleration 99
= D38

Agility 99
= A99-C

Agility rating scale
= B

Preserve the approved Sprint Speed rating mapping.

Preserve the current provisional Acceleration rating mapping unless this mission exposes a genuine implementation error.

Do not spend tonight recalibrating physical ratings.
BALL-ON MOVEMENT
Owner also selected:
CARRY-B

as the provisional:
D99 / BC99

ball-on movement envelope.

Preserve it.

Important design principle:
Even Dribbling 99 is meaningfully slower and less explosive with the ball than the same player's physical BALL-OFF ceiling.

Future Dribbling ratings will affect this further.

Do NOT build the final Dribbling 1–99 curve tonight unless it naturally becomes necessary for technique diagnostics.
PHASE 1 — FIX 150–180° LOCOMOTION / SUPPORT FAILURES
Before expanding heavily into advanced techniques, fix the generic movement substrate that those techniques will depend upon.

Current known problem region:
150° turns
180° reversals
hard braking
extreme stop/relaunch
fast-circle edge cases
braking pivots
abandoned mid-swing support plans

We still see:
foot jumps
leg crossings
strange support changes
occasional malformed poses

particularly at extreme redirection demand.
DO NOT WEAKEN CAPABILITY TO FIX PRESENTATION
Do NOT solve this by reducing:
Sprint Speed 99
Acceleration 99-D38
A99-C
Agility Scale B

or by secretly delaying input.

The movement capability is selected.

Fix the locomotion/support explanation.
BUILD/REFINE GENERIC EXTREME-REDIRECTION SUPPORT
Investigate whether the locomotion vocabulary needs better reusable primitives for:
HARD_BRAKE
BRAKING_PLANT
BRAKING_PIVOT
REPLACEMENT_STEP
CROSSOVER
OPEN_STEP
150° REDIRECT
180° REVERSAL
STOP_AND_RELAUNCH
SOLE_CONTROL_PLANT

Names are not mandated.

Prefer a small coherent support vocabulary over move-specific leg hacks.
PRESERVE SUPPORT CONTINUITY
Retain the architectural lessons from Astra's locomotion work:
persistent support identity
continuous swing paths
committed landings
trajectory-aware support planning

A new request may:
shorten
retime
redirect an uncommitted landing
choose replacement support

but must not arbitrarily teleport an already-committed leg.
EXTREME TURN VALIDATION
Stress:
120°
135°
150°
165°
180°

from:
jog
run
sprint
selected high-speed states
multiple gait phases
left/right mirror

Include:
single reversal
repeated reversals
stop → reverse
curve → reverse
sprint → reverse → accelerate

Fix visible normal-speed failures first.
PHASE 2 — MAIN OVERNIGHT MISSION
BUILD A FULL DRIBBLING / TECHNICAL VOCABULARY
This is the primary task.

Do NOT return with:
3–5 additional moves

and call the vocabulary complete.

I want a serious, broad technical library representing the major functional ways elite footballers manipulate the ball.

Research real football technique where needed.

Research may include:
coaching/technical breakdowns
elite-player footage
biomechanics where useful
FC 26/27 gameplay vocabulary where informative

but Touchline's implementation should be based on football function rather than copying canned game animations.
EXISTING TECHNICAL FOUNDATION
Preserve and improve where necessary:
CARRY
CLOSE_CARRY
SPRINT_CARRY

COMPACT_INSIDE_REDIRECT
COMPACT_OUTSIDE_REDIRECT
GATHER
URGENT_REACH
BRAKING_TOUCH
BRAKING_PIVOT

RONALDO_CHOP
CRUYFF
HOOK
DRAG_BACK
OUTSIDE_CUT
CROQUETA / LATERAL_TRANSFER
KNOCK_ON

Do not regress these.

Ronaldo Chop must remain a real:
behind/across support-leg
protected
high-value redirect

rather than becoming an exposed outside-foot kick.

Cruyff must remain recognizably/functionally a Cruyff.
TECHNIQUES MUST ENHANCE DRIBBLING
This is essential.

The reason we like:
Ronaldo Chop
Cruyff

is not merely because they look recognizable.

They provide useful technical solutions that ordinary carry cannot provide as efficiently.

Every new technique should answer:
What football problem does this technique solve better than the existing alternatives?

Examples:
change direction while protecting ball
transfer ball across body
deceive defender
stop and relaunch
escape pressure
manipulate around reaching leg
maintain momentum through redirection
create separation
expose a new exit lane
move ball behind support/body
exploit open grass

Do not add cosmetic animations with no technical purpose.
RESEARCH AND BUILD THE FULL FUNCTIONAL LIBRARY
At minimum investigate and, where technically distinct/useful, implement robust families covering:
CARRY / PACE FAMILY
close carry
normal carry
sprint carry
knock-on
push-and-run
longer space touch
shortened control touch

INSIDE / OUTSIDE CUT FAMILY
compact inside cut
compact outside cut
hard inside cut
hard outside cut
hook turn
outside hook
inside/outside redirect variants

Avoid duplicate moves where mirroring/parameterization can represent the same technical basis.
CHOP FAMILY
Ronaldo Chop
lower-speed chop
running chop
sprint chop
mirrored chop

Treat these as variations of a coherent technical family rather than unrelated animations where appropriate.
CRUYFF / BEHIND-BODY TURN FAMILY
Cruyff Turn
abbreviated Cruyff
running Cruyff where physically appropriate
mirrored versions

Preserve protection/body geometry.
DRAG / SOLE FAMILY
Fully revisit and solve:
SOLE_ROLL

after the generic braking/support fixes.

Then investigate:
sole roll
sole drag
drag-back
pull-push
V-pull
L-drag / L-turn
sole lateral transfer
sole stop
sole turn

Do not create redundant named actions when one parameterized sole-control primitive can explain several.
LATERAL TRANSFER FAMILY
Expand:
La Croqueta

into a robust family where useful:
lateral transfer
inside-inside transfer
running Croqueta
abbreviated Croqueta
pressure escape transfer

Preserve its core function:
move the ball rapidly across the body while the body helps protect it.

FEINT FAMILY
Build genuine:
body feint
shoulder drop
hip/weight fake
Matthews-type feint
inside-out feint
outside-in feint
stop-go hesitation

Research the actual functional distinctions.

Do not make all of them separate if they are better represented by a parameterized feint system.
ANALOG FEINT RECOGNITION
Investigate the owner-approved concept:
established direction
→ brief meaningful directional fake
→ reversal before ball/body commitment
→ real exit

Example:
forward
→ brief left
→ right

may become:
sell left
→ exit right

rather than:
touch left
→ emergency correction right.

This could improve both expressiveness and possession stability.
FEINTS MUST NOT SPAM
Do NOT interpret every joystick correction as a feint.

Detect:
transient directional intention
+
meaningful deviation
+
reversal before commitment
+
feasible body state

conservatively.

Rapid random joystick noise must not produce:
FEINT
FEINT
FEINT
FEINT

BODY FEINT DOES NOT REQUIRE A BALL TOUCH
A simple feint may primarily manipulate:
shoulders
torso
pelvis
weight distribution
support load

while preserving the current authoritative controlled-ball trajectory.

This is important.

Do NOT force:
fake left

to mean:
kick ball left

if the actual football action is only selling that intention.
STEPOVER / SCISSORS FAMILY
Research and implement a robust basis for:
single stepover
reverse stepover
scissors
double/multiple stepover chaining where appropriate
stepover → inside exit
stepover → outside exit
stepover → continue

Do not simply rotate a leg around the ball cosmetically.

The move must preserve:
support
ball access
branchable exit

and provide deception/exit value.
ELASTICO FAMILY
Research and implement:
elastico
reverse elastico
abbreviated elastico

where feasible.

Core requirement:

the ball trajectory must genuinely produce the characteristic:
one-direction cue
→ rapid same-foot redirection

rather than merely playing an elastico-looking foot animation.
PULL / PUSH / V FAMILY
Investigate:
V-pull
pull-push
drag-push
pull-across

especially as:
pressure escape
direction reset
stop-and-go

tools.
SPIN / ROULETTE FAMILY
Research:
roulette / Marseille turn
spin escape

Implement only if the body/support/ball geometry can be made convincing.

This is a more committed technique and should not be forced into states where it makes no sense.
HEEL / SPEED-CHANGE FAMILY
Investigate functional:
heel-to-heel
heel flick / heel push
heel-to-heel burst

where appropriate.

Again:

the technique must solve a football problem rather than merely recreate a named move.
STOP / HESITATION FAMILY
Build useful:
stop
fake stop
hesitation
stop-and-go
deaden-and-explode

actions.

These should interact naturally with:
D38 acceleration

on exit.
PROTECTION / SHIELD-TURN FAMILY
Without integrating defenders yet, establish technical actions capable of:
moving ball to protected side
putting hip/back between threat direction and ball
rolling away
inside shielding turn
outside shielding turn

Threat direction may be supplied by the review harness for now.

Do not create invisible force fields.
DO NOT IMPLEMENT MOVES BY NAME ALONE
Where several named techniques share the same mechanical basis, build:
reusable technical primitives
+
parameterized variants

rather than dozens of unrelated animation scripts.

Example conceptual primitives might include:
inside redirect
outside redirect
behind-support redirect
sole pull
sole lateral
across-body transfer
false-weight shift
around-ball leg feint
same-foot double redirect
spin protection

Let named football techniques emerge from combinations/parameters where appropriate.
FULL LIBRARY DOES NOT MEAN LOW QUALITY
You have up to six hours.

Use the time.

Do not stop because:
“five moves are enough for a prototype.”

They are not enough for this assignment.

But also do not create:
40 broken animations.

Aim for a broad, reusable technical vocabulary where families share robust primitives.

If some researched move cannot yet be made physically convincing:
include it in the review lab
label it EXPERIMENTAL
explain the blocker

rather than silently pretending it is production-ready.
AUTO VS MANUAL — CLAUDE SHOULD MAKE THE FINAL DESIGN RECOMMENDATION
We have a provisional philosophy, but I want you to research/test and decide the best final classification.

Current owner-approved starting hypothesis:
LIKELY AUTO / ORDINARY
carry
inside/outside cut
compact redirect
gather
braking touch
sprint carry
ordinary knock-on
protective touch
simple body feint from clear analog pattern

LIKELY AUTO + MANUAL
Ronaldo Chop
Cruyff
Croqueta
Drag-back
sole pull/push
stronger contextual feints

LIKELY PRIMARILY MANUAL / EXPRESSIVE
stepovers
scissors
elastico
reverse elastico
roulette
elaborate sole combinations

This list is provisional.

You may change classifications if research, playability or architecture supports a better design.

Report your reasoning.
IMPORTANT — AUTO DOES NOT MEAN RANDOM
Automatic techniques must only win because:
they solve the current football problem better.

Do not create:
skillMoveChance

and randomly play flashy moves.
MANUAL DOES NOT MEAN CANNED ANIMATION
A manual request should create:
TECHNICAL INTENT

such as:
REQUEST_ELASTICO
REQUEST_STEPOVER
REQUEST_ROULETTE

The system must still determine:
feasibility
correct foot
support
entry phase
ball geometry
exit direction

Do NOT implement:
button
→ play fixed animation
→ ignore current state.

BUILD A PROVISIONAL MANUAL SKILL INPUT LANGUAGE
We do not need final console-controller bindings tonight.

But establish a clean abstract interface such as:
skillIntent
skillDirection
exitDirection
modifier/strength if needed

so explicit technical requests can be tested.

The Dribbling Lab should expose these directly.
TECHNIQUE COMMITMENT MODEL
Every action should expose:
PREPARATION
COMMITMENT
DECISIVE CONTACT / DECEPTION
BRANCH POINT
CONTINUATION

Before commitment:
latest intent may revise the action.

After physical commitment:
preserve the committed physical event.

But after the decisive phase:
B5-style early control return

should allow the next useful action as soon as physically feasible.
TECHNIQUE CHAINING — FIRST-CLASS FEATURE
Do NOT test techniques only in isolation.

Build chaining infrastructure.

Required examples:
Croqueta
→ accelerate
→ outside cut

Stepover
→ outside exit
→ sprint

Stepover
→ inside exit

Drag-back
→ Croqueta

Body feint
→ outside touch

Ronaldo Chop
→ D38 acceleration

Cruyff
→ immediate exit

Sole pull
→ 90° exit

Elastico
→ acceleration

Knock-on
→ sprint
→ chop

Stop
→ feint
→ explode

Track:
decisive contact
branch availability
next-action start
control-return delay
support continuity

The system should feel:

continuous, not like animations queued one after another.
B4 REMAINS THE AUTO RESOLVER
Existing B4 philosophy remains:

candidate techniques compete based on predicted football outcome.

Score factors including:
preparation time
contact feasibility
requested movement
exit direction
retained momentum
ball exit
next accessibility
protection
support feasibility
control-return time

Add new technique families to this framework where appropriate.

Do NOT replace B4 with:
angle buckets.

B5 REMAINS THE TRANSITION PHILOSOPHY
Preserve:
once the decisive football action has occurred and a feasible continuation exists, return meaningful control quickly.

Do not hold the player hostage to decorative animation recovery.
CONTROLLED_BALL REMAINS AUTHORITATIVE
All technical actions must work within:
CONTROLLED_BALL

architecture.

Simulation owns:
ball position
velocity
controlled trajectory
contacts

Animation explains them.

No:
foot parenting
ball teleporting
animation-owned ball
hidden magnetic correction

NO SELF-INFLICTED POSSESSION LOSS AS THE DIFFICULTY MODEL
Preserve our design principle:
A player should not become a worse dribbler primarily by randomly losing the ball while alone.

For tonight we are mostly testing:
D99 / BC99

anyway.

But structure techniques so future lower Dribbling can degrade:
feasibility envelope
entry speed
preparation requirement
high-speed availability
branching freedom
deception quality

rather than simply:
fail move → lose ball.

TECHNIQUE DIFFICULTY METADATA
This is important for the future Dribbling rating.

For every technique/family, record dimensions such as:
base technical difficulty
maximum useful entry speed
support difficulty
weak-foot difficulty
preparation demand
redirection demand
chaining difficulty
deceptive complexity

Do NOT yet decide:
Elastico requires D90.

Instead build a feasibility model that future Dribbling ratings can act upon.
STRONGER TECHNIQUES / HIGHER DRIBBLING
Owner explicitly wants the eventual system to support:
more powerful/advanced technical solutions being much more available to elite dribblers.

This does NOT necessarily mean hard unlocks.

Preferred future model:
higher Dribbling
→ broader feasible entry states
→ higher usable entry speeds
→ shorter preparation
→ later branching
→ stronger chaining

A moderate dribbler might perform an advanced move from a clean setup.

A D99 player can deploy it:
faster
later
from messier geometry
while moving quickly
and chain out of it sooner.

Design tonight's metadata/interfaces around that.
BALL CONTROL REMAINS DISTINCT
Do not collapse Dribbling and Ball Control.

Future intended distinction:
DRIBBLING
= ability to create/exploit advantages through ball manipulation under constraint

BALL CONTROL
= precision/security/quality of the intended ball interaction

Tonight:
D99
BC99

so execution should represent the ceiling.
PREFERRED FOOT / WEAK FOOT
Every relevant technique should understand:
preferred foot
non-preferred foot
current support
ball side

Mirror techniques correctly.

Do not simply mirror screen coordinates if the football mechanics differ.

Build the interface so weak-foot ability can later affect feasibility/execution.

Do not calibrate Weak Foot tonight.
QUICK FEET, NOT BUSY FEET
Adding a huge vocabulary must NOT create:
more touches everywhere
constant skill spam
alternating-foot noise

Preserve:
one excellent action is better than three unnecessary touches.

Measure:
touches per maneuver
redundant touches
corrective touches

DO NOT MAKE THE PLAYER PERFORM SKILLS WHEN NO SKILL IS NEEDED
Straight carry should still look like:
football running/dribbling.

Gentle steering should still look like:
football running/dribbling.

Do not turn D99 into:
constant freestyle mode.

BUILD A PERMANENT DRIBBLING LAB
This is a major deliverable.

Create a comprehensive:
DRIBBLING LAB
where the owner can inspect the entire technical vocabulary.
DRIBBLING LAB — TECHNIQUE SELECTOR
I want every implemented/review technique selectable from a categorized library.

Show:
technique family
technique/variant
status:
  INTEGRATED
  REVIEW
  EXPERIMENTAL

DRIBBLING LAB — CONFIGURABLE ENTRY STATE
Allow changing:
speed
movement direction
requested exit
ball side
preferred foot
support foot / gait phase if useful
carry type
threat direction

DRIBBLING LAB — CONTROLS
Include:
play
pause
restart
1×
0.5×
0.25×
frame step
scrub
left/right mirror

Cameras:
gameplay
close side
front
rear
overhead

DRIBBLING LAB — DIAGNOSTICS
Optional overlays:
support foot
technical foot
contact surface
ball trajectory
authoritative contact
preparation
commitment
branch point
control returned
body trajectory
requested exit
predicted outcome
technique score

AUTO MODE
Add:
AUTO

where B4 chooses the technique from the same initial state.

This lets us compare:
manually requested technique

against:
what Technical Control believes is best.

CHAIN MODE
Add a way to test predefined chains and preferably manually request a next technique during playback.

We need to inspect:
technique → technique

transitions, not merely isolated clips.
UNIFIED PLAYABLE SANDBOX
In addition to the lab, update the actual joystick sandbox.

Default:
S99
Acc99-D38
A99-C
Agility Scale B
D99
BC99
Carry-B
CONTROLLED
EXPANDED

Give me:
joystick
sprint
run/jog/walk
automatic Technical Control
provisional manual skill requests

I want to actually dribble freely with the expanded vocabulary.
TORTURE TEST THE FULL VOCABULARY
Automated tests should cover:
every integrated technique
left/right mirror
relevant speed bands
preferred/non-preferred side
chaining
cancellation before commitment
changed input after commitment
controlled-ball continuity

RANDOM JOYSTICK TORTURE
Run prolonged:
arbitrary analog movement
rapid L/R
circles
reversals
stop/start
sprint/cut
feint-like patterns

with the expanded vocabulary enabled.

Ensure the new resolver does not create:
technique thrashing
skill spam
controller exits
possession instability

BODY INTEGRITY
Track:
foot jumps
leg crossings
knee pops
ankle pops
support discontinuities
ball/contact gaps

Classify:
normal-speed visible
slow-motion visible
diagnostic-only

Do not hide failures.
PERFORMANCE
The expanded vocabulary will increase candidate count.

Measure:
average Technical Control cost
candidate-scoring cost
worst tick

You may implement safe:
candidate-family pruning

if it:
removes obviously impossible families cheaply

while producing exactly the same chosen action as full scoring in validation.

Do NOT reintroduce angle buckets as an optimization.
PRIORITY ORDER FOR THE SIX HOURS
Work in this order:
1. Record Agility Scale B selection.

2. Fix generic 150–180° / braking / reversal support failures.

3. Research and design complete technical vocabulary/families.

4. Build reusable technical primitives.

5. Implement broad technique library.

6. Integrate appropriate techniques into B4/B5/CONTROLLED.

7. Build analog-feint recognition.

8. Build manual technical-intent interface.

9. Build chaining.

10. Build comprehensive Dribbling Lab.

11. Update unified joystick sandbox.

12. Torture-test and fix systemic failures.

13. Performance/decision-equivalence checks.

IF TIME BECOMES LIMITED
Do NOT spend the final hour adding five more half-working named tricks.

Prioritize:
robust families
clean contacts
good chaining
clean support
useful Dribbling Lab

over raw move count.

However:

do not stop at a starter vocabulary.

The explicit overnight objective is a substantially complete elite technical library, not another proof of concept.
DO NOT WORK ON TONIGHT
Do not spend meaningful time on:
defenders
defending AI
Strength ratings
Balance ratings
Standing Tackle integration
shoulder-duel integration
fatigue
passing
shooting
full-team gameplay

Those are for later.

Tonight is:
MOVEMENT INTEGRITY + ELITE DRIBBLING TECHNIQUE
MORNING REPORT
Return with:
1. Movement
150–180° fixes
before/after integrity
remaining locomotion failures

2. Research
techniques researched
functional taxonomy
sources
important football findings

3. Full vocabulary
For every family:
actions/variants
technical purpose
entry conditions
exit behavior
integrated/review/experimental status

4. Auto/manual recommendation
Explain which techniques should be:
AUTO
AUTO + MANUAL
MANUAL

and why.
5. Feints
analog recognition rules
false-positive rate
ball behavior
branch behavior

6. Chaining
tested chains
branch times
control-return timing

7. Future Dribbling-rating readiness
Show how:
technique difficulty
feasibility envelope
speed
preparation
branching

can later respond to Dribbling rating.

Do NOT calibrate it yet.
8. Integrity
possession
contacts
feet
legs
support
determinism

9. Performance
candidate count
CPU
worst tick
pruning if implemented

10. PLAYABLES
Prominently provide:
DRIBBLING LAB

and:
UNIFIED JOYSTICK SANDBOX

NO FREEZE
Do not freeze the vocabulary or declare Dribbling complete.

Owner must visually/playably review it.
CENTRAL MORNING TARGET
When I wake up, I want to be able to open the Dribbling Lab and see a serious football technical vocabulary, not just our original handful of moves.

I want:
cuts
chops
Cruyffs
drags
sole manipulations
Croquetas
feints
stepovers
scissors
elasticos
pull/push actions
spins
hesitations
speed changes
protection turns

represented through robust reusable football mechanics wherever possible.

Then I want to open the joystick sandbox and feel that this vocabulary actually enhances what the footballer can do, just as Ronaldo Chop and Cruyff already do.

The player should not perform tricks for decoration.

They should have a huge library of solutions.
TARGET FEEL
A D99 player should feel technically limitless because almost every football problem has an elegant ball-manipulation solution available—not because the ball is magically attached to their foot and not because the game spams flashy animations.

Use the six-hour window to build that foundation thoroughly.

## Block 2

REQUIRED — EVERY TECHNIQUE MUST HAVE A CURATED VISUAL REPLAY
The Dribbling Lab must NOT only be a technical selector/debugger.

I want a proper visual review experience comparable to our Standing Tackle review pages.

For every implemented technique and meaningful variant, create a deterministic curated replay showing the technique in a situation where its football purpose is obvious.

Examples:
RONALDO CHOP
→ high-speed sharp protected redirect

CRUYFF
→ sell continuation / pull ball behind body / reverse direction

CROQUETA
→ rapid across-body lateral transfer

ELASTICO
→ outside cue → rapid inside redirection

STEPOVER
→ sell one route → branch into exit

SOLE PULL
→ pressure escape / reset

KNOCK-ON
→ exploit open space and acceleration

Do not demonstrate moves from arbitrary neutral poses merely because they are easy to author.

Show each move in the context where it is actually useful.
TECHNIQUE GALLERY
The main review page should contain a browsable:
TECHNIQUE GALLERY

grouped by family:
CARRY / PACE
CUT / REDIRECT
CHOP
CRUYFF / BEHIND-BODY
SOLE / DRAG
LATERAL TRANSFER
FEINT
STEPOVER / SCISSORS
ELASTICO
PULL / PUSH / V
SPIN
HEEL / SPEED CHANGE
STOP / HESITATION
PROTECTION / SHIELD TURN

Every technique card should show:
NAME
FAMILY
STATUS
AUTO / AUTO+MANUAL / MANUAL recommendation
technical purpose
preferred entry conditions

and a prominent:
PLAY

button.
RECORDED DETERMINISTIC REPLAY
Every technique must have at least one deterministic recorded reference replay.

Important techniques should have multiple:
NORMAL ENTRY
HIGH-SPEED ENTRY
LEFT MIRROR
RIGHT MIRROR
CHAIN / EXIT

where appropriate.

These should be reproducible from exact initial conditions.

Do not use prerecorded video as the authoritative source.

Record/replay the deterministic simulation state so:
camera
speed
frame stepping
overlays

can all be changed while reviewing the exact same action.
NORMAL SPEED IS THE PRIMARY REVIEW
Every move should default to:
1×
gameplay camera

because I first need to answer:
Does this actually look like football?

Then allow:
0.5×
0.25×
frame step
scrub

for diagnosis.
BEFORE / DURING / AFTER
For each technique, the replay timeline should clearly include:
approach / entry
preparation
decisive manipulation
exit
continuation

Do not start the recording immediately before ball contact and end immediately afterward.

I need to see whether the move flows naturally into and out of ordinary dribbling.
LOOP MODE
Add:
LOOP

so I can watch a move repeatedly at:
1×
0.5×
0.25×

without restarting it manually.
SIDE-BY-SIDE / MIRROR
Where useful allow:
LEFT
RIGHT

synchronized comparison.

This is particularly important for:
chops
Cruyffs
Croquetas
sole actions
stepovers
elasticos

to catch asymmetrical support/leg problems.
CONTACT DIAGNOSTICS
For every replay expose optional:
authoritative ball
rendered boot
contact point
contact surface
support foot
ball trajectory
body trajectory
commitment
branch point
control returned

Keep these OFF by default.
CHAIN GALLERY
Have a separate:
CHAINS

section containing curated recordings such as:
Body Feint → Outside Cut
Stepover → Outside Exit → Sprint
Stepover → Inside Exit
Drag-back → Croqueta
Sole Pull → 90° Exit
Ronaldo Chop → Accelerate
Cruyff → Accelerate
Elastico → Sprint
Knock-on → Sprint → Chop
Stop → Feint → Explode

These should demonstrate that techniques are genuinely branchable rather than isolated canned clips.
AUTO DECISION REVIEW
For techniques that participate in B4 AUTO selection, include:
AUTO

alongside:
FORCE THIS TECHNIQUE

using the same initial state.

That lets me see:
Would Technical Control actually choose this move here?

and:
What happens if I explicitly request it?

FAILED / REJECTED ENTRY REVIEW
For advanced techniques, also include at least one deliberately invalid setup where useful.

Show:
REQUESTED:
ELASTICO

RESULT:
REJECTED / ALTERNATIVE

REASON:
support unavailable / entry speed / ball side / commitment / etc.

This will be important when we later connect technique feasibility to Dribbling rating.
MORNING REVIEW EXPERIENCE
When I open the main Dribbling Lab tomorrow, I should be able to:
choose a move
→ press PLAY
→ immediately watch a clean normal-speed example
→ loop it
→ slow it down
→ scrub/frame-step it
→ switch cameras
→ mirror it
→ inspect contacts
→ test it manually
→ see its chains

without opening source files or running scripts.

The review page should be designed for visual owner approval, not merely engineering diagnostics.
