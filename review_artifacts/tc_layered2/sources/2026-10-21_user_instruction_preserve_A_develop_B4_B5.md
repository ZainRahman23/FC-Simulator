<!-- The owner's instruction, saved verbatim (21 Oct 2026, ~04:20 EEST), after their hands-on playtest of the TC-LAYERED-1 playground. -->

TECHNICAL CONTROL — PRESERVE BASELINE A, DEVELOP B4 + B5
I have now personally playtested the layered playground.
Owner decisions
A / 88573ef0 BASELINE:
APPROVED as the current foundation.

B1 Immediate acknowledgement:
REJECT for now.

B2 Earlier touches:
mild improvement / potentially useful later,
but not important enough to develop now.

B3 Narrow commitment:
REJECT in its current form.
It reduces ball losses but feels extremely rigid and still unresponsive.

B4 Generic effort turns:
PROMISING — DEVELOP.

B5 Short wind-ups / exits:
PROMISING — DEVELOP.

B6 Next-action targets:
REJECT for now.

Do not delete the rejected experiments/evidence, but stop developing them.

Do not freeze anything.
IMPORTANT: ASTRA IS DEVELOPING AGILITY-99 SEPARATELY
A separate workstream is now defining the authoritative movement ceiling for:
Agility 99

based on the movement diagnostic.

Therefore do not modify Agility, braking, lateral movement, acceleration, sprint turning capability or the authoritative movement envelope in this task.

If B4 encounters a limitation caused by the existing movement envelope, report:
AGILITY/MOVEMENT DEPENDENCY

rather than compensating for it with Technical Control hacks.

We will later test:
A
↓
A + approved A99 movement
↓
A + A99 + B4
↓
A + A99 + B4 + B5

B4 — EXPAND THE TECHNICAL TOOLKIT
B4's concept is approved.

The intention is NOT to replace our existing researched techniques:
Ronaldo Chop
Cruyff Turn
inside/outside hook
drag-back
outside-foot cut
etc.

Preserve those.

Instead, B4 should fill the missing space between:
ordinary carry

and:
recognizable named technique

with a vocabulary of fast, ordinary elite football actions.

Conceptually:
ORDINARY CARRY
      ↓
GENERIC TECHNICAL REDIRECT / EFFORT ACTION
      ↓
NAMED TECHNIQUE WHEN CONTEXT MAKES IT THE BEST SOLUTION

GENERIC B4 VOCABULARY
Continue developing actions such as:
COMPACT_INSIDE_REDIRECT
COMPACT_OUTSIDE_REDIRECT
GATHER
URGENT_REACH
BRAKING_TOUCH
BRAKING_PIVOT

You may add/remove/refine families if evidence shows a better minimal vocabulary.

These should look like normal elite dribbling, not like six new skill moves.

They should solve ordinary analog direction changes efficiently.
NAMED MOVES MUST SURVIVE
Do NOT turn the system into:
generic redirect always wins

A Ronaldo Chop should still occur when the current football state makes a Ronaldo Chop the best solution.

Likewise:
Cruyff
hook
drag-back
outside cut

should remain genuine contextual solutions.

The desired question is:
Given the actual ball, body, foot, speed and requested movement, which football action gives the best continuation?

Not:
Which technique corresponds to this input angle?

DO NOT USE HARD ANGLE BUCKETS
Do not implement:
60° = outside cut
90° = Ronaldo Chop
120° = Cruyff
180° = drag-back

Angle is relevant, but it is only one input.

Candidate scoring should consider:
current velocity
requested direction
requested magnitude
ball position
ball velocity
ball side/lane
preferred foot
available foot
current support state
preparation time
reachable contact time
protection
exit direction
exit speed
expected ball separation
continuation quality

IMPORTANT LESSON FROM CURRENT B4
You already found that removing the old angle-fit term made the outside cut artificially cheap in sprint 90°, causing it to replace the chop and increase ball losses.

Do not solve this by restoring arbitrary angle buckets.

Fix the candidate evaluation.

A candidate should be judged by its actual predicted football outcome, not how close its reference animation angle is to the stick angle.
SCORE THE EXIT, NOT THE LABEL
For every candidate, predict something like:
time to legitimate contact
ball direction after contact
ball speed after contact
body/root direction after action
useful speed retained
ball accessibility after contact
time until next useful action
protection from opponent side

Then score the quality of the resulting continuation.

A generic outside redirect that technically turns the ball 90° but leaves the body unable to follow should score poorly.

A Ronaldo Chop that takes slightly longer but:
protects the ball
redirects correctly
leaves the body balanced
provides a fast exit

may legitimately win.
B4 SHOULD BE CONTEXTUAL, NOT RANDOM
Do not introduce presentation RNG or arbitrary variety.

Given identical:
simulation state
input
attributes

the same solution should be selected.

Variety should emerge because football states differ.
B4 AND THE PHYSICAL BALL
Every generic action remains a real physical contact.
foot action
→ authoritative contact
→ physical outgoing ball

No:
ball tether
magnetism
teleportation
guaranteed retention

DO NOT FORCE B4 THROUGH CURRENT MOVEMENT LIMITS
This is particularly important for:
sprint 90°
sprint 120°
sprint 180°
rapid sprint left/right

We now have evidence that the underlying A99 movement envelope is itself restrictive.

If a good generic technical action cannot work because the current root/body cannot redirect quickly enough:

do not distort the technique to compensate.

Report:
TECHNIQUE SOLUTION GOOD
CURRENT MOVEMENT ENVELOPE INSUFFICIENT

We will rerun it later with the new A99 movement.
B5 — SHORT WIND-UPS AND FAST EXITS
B5 is also approved for development.

B5 does NOT add another technique family.

Its job is:
reduce unnecessary animation ownership around whichever technical action B4/current selection chooses.

Think:
PREPARE
→ CONTACT
→ EXIT

and ask which parts are actually necessary.
ENTRY: DON'T REPEAT PREPARATION THE PLAYER ALREADY HAS
If the current body/ball state already satisfies part of a technique's canonical setup, do not force the player to reproduce it.

Example:

If the ball is already:
correctly positioned
correct side
reachable by the correct foot

for an outside redirect:

do not add:
setup touch
extra plant
decorative wind-up

merely because the canonical action was authored from a neutral state.

Enter at the earliest valid phase of the action.
BUT DON'T CUT AWAY THE FOOTBALL
B5 must not become animation skipping.

Preserve whatever is necessary to make the action read correctly:
weight transfer
plant
striking/reaching motion
ball contact
body redirection

A Ronaldo Chop must still visibly be a Ronaldo Chop.

A Cruyff must still visibly be a Cruyff.

A drag-back must still visibly perform its characteristic ball manipulation.

Shorter does not mean unrecognizable.
EXIT: RETURN CONTROL AS SOON AS THE IMPORTANT ACTION IS COMPLETE
After:
authoritative contact has executed
+
body has reached a plausible controllable state

do not require:
full decorative follow-through
canonical final pose
unnecessary recovery frames

before the next movement intent can influence the player.

Return ordinary control early.

Presentation may continue resolving:
torso
arms
free leg
minor pose offsets

while gameplay is already responsive again, provided this does not create the floating/phasing failure seen in tc_responsive.html.
VERY IMPORTANT — DO NOT REPEAT tc_responsive.html
The failed responsive experiment remains our negative reference.

It achieved better response metrics but the player:
floated
phased
glitched
looked disconnected from the ground

B4/B5 must remain built directly around the grounded human movement of:
88573ef0

Do not create an abstract root/contact action and ask the skeleton to catch up afterward.

The visible body and authoritative action must remain close enough that only small bounded presentation adjustments are necessary.
B5 SHOULD BE ATTRIBUTE-READY
We are currently only testing:
D99

But structure B5 so that later:
Dribbling

can influence how late a player can enter a technical action and how quickly they can exit it.

Do NOT build the 1–99 curve now.

For now simply establish the elite D99 ceiling.
B4 SHOULD ALSO BE ATTRIBUTE-READY
Eventually Dribbling should likely influence:
technical vocabulary available
preparation requirement
ability to use difficult contacts
ability to adapt technique late
technical execution speed

But again:

99 only for now.
BUILD THE NEXT PLAYGROUND AROUND THE PROMISING STACK
Preserve immutable:
A = 88573ef0

Then provide:
A
A + B4
A + B5
A + B4 + B5

Keep B2 available as an optional experimental toggle:
A + B4 + B5 + B2

but do not spend substantial time developing B2 yet.

B1, B3 and B6 should default OFF and are not part of the current candidate stack.
WHAT I WANT TO PLAYTEST
Prioritize:
ordinary flowing carry
small corrections
45° change
60° change
90° change
120° change
150° change
180° reversal
rapid left/right
gradual analog rotation
sudden analog snap

at:
jog
run
sprint

SHOW WHICH ACTION WAS SELECTED
Put the current selected solution prominently in the HUD:
CARRY
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
etc.

Also show:
why it won
nearest alternative
predicted contact time
predicted exit direction
predicted exit speed

I want to understand what the resolver is doing while I play.
SPECIFIC NAMED-MOVE TESTS
Include situations deliberately favorable to:
Ronaldo Chop
Cruyff
hook
drag-back
outside cut

Confirm that B4 has not erased them.

Then include nearby situations where a generic action should reasonably beat them.

This is important.
MEASURE B5 DIRECTLY
For each action report:
request → preparation begins
request → authoritative contact
contact → control returned
total action ownership time

Compare:
baseline action
vs
B5 action

I want to know whether B5's subjective promise is actually coming from faster entry, faster exit, or both.
DON'T OPTIMIZE FOR ZERO BALL LOSSES
Owner playtest found:
B3 had fewer ball failures
but felt extremely rigid and unresponsive.

That is a rejected tradeoff.

Do not score B4/B5 primarily by retention rate.

At D99/BC99 we ultimately want excellent retention and responsiveness, but:
never obtain control by refusing to respond to the user's input.

OWNER FEEL OVERRIDES REPORT-CARD METRICS
Another explicit lesson:
tc_responsive

had impressive latency metrics and terrible visual/playable quality.

Therefore:
measurements diagnose
owner playtest decides

DO NOT INTEGRATE AGILITY YET
Astra is currently developing candidate:
AGILITY-99-V1

movement envelopes.

Keep current movement unchanged here.

Once we approve an A99 candidate, the next intended experiment is:
A + A99
A + A99 + B4
A + A99 + B4 + B5
A + A99 + B4 + B5 + selective B2

So structure B4/B5 cleanly enough that we can transplant/retest them on the new movement foundation.
STOP FOR REVIEW
Do not freeze.

Do not integrate.

Do not calibrate lower Dribbling/Ball Control ratings.

Do not solve Agility.

Give me the updated playable page and stop.
Current hypothesis
A / 88573ef0
= grounded human foundation

new A99
= what the elite body is capable of

B4
= richer ordinary technical vocabulary

B5
= faster entry/exit around those technical actions

named moves
= contextual high-quality football solutions

The target is:
An elite player has many efficient ways to solve a direction change, chooses the technique that best fits the actual football state, executes it without unnecessary preparation, and returns control immediately after the meaningful action—while remaining grounded and visually human.
