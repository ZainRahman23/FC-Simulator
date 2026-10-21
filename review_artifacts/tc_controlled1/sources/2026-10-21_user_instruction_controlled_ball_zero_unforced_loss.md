# Owner instruction — 21 Oct 2026 ≈ 11:23 EEST (pasted in the session, saved verbatim)

I agree. The key is preserve the current unified build because it is clearly improving, and change the ownership model of the ball rather than rewriting C/B4/B5 again.

For 99/99/99, I would make the acceptance rule explicit: once secure possession is established, the player's own movement/dribbling can never cause an unforced loss. The ball can still move away from the feet as part of a technique or sprint carry, but the simulation has already planned a valid continuation. Only intentional release or legitimate external disruption should break possession.

Send Claude this:
TECHNICAL CONTROL — CONTROLLED-BALL PROTOTYPE / ZERO UNFORCED LOSS AT 99
The overnight unified prototype is a substantial improvement and I want to preserve it as the current foundation.

Do NOT redesign:
A99-C movement
Astra persistent support architecture
restored straight RUN
B4 technical vocabulary
B5 fast exits
current named moves
current joystick responsiveness

The cuts are clearly faster and the overall system is better.

However, owner playtesting has identified the next fundamental issue:
At BC99 / D99 / A99, the player can still occasionally lose the ball simply because the dribbling/controller becomes stressed by rapid movement input.

I do not want this.
NEW OWNER RULE
For:
Ball Control 99
Dribbling 99
Agility 99

once the player has genuinely established secure possession:
THE PLAYER'S OWN ORDINARY MOVEMENT/DRIBBLING INPUT MUST NOT CAUSE AN UNFORCED LOSS OF POSSESSION.

The player may lose/release the ball because:
shot
pass
cross
clearance
deliberately released/heavy action
opponent tackle
opponent interception
legitimate opponent-ball collision
another external physical disruption

But NOT because:
joystick changed direction too quickly
contact planner missed its window
support foot was inconvenient
animation couldn't reach the ball
technical resolver changed its mind
ball rolled outside an internal reach heuristic
rapid left/right stressed the controller
fast circles confused technique selection

Those are controller failures, not football outcomes.
1. DO NOT “FIX” THIS BY GATING INPUT
This is extremely important.

We previously had B3:
fewer losses
but rigid and unresponsive

That solution was rejected.

Do NOT achieve zero loss by:
ignoring joystick input
delaying direction changes
reducing A99-C movement
waiting for safe animation states
locking actions for longer
cancelling requested turns
secretly reducing sprint responsiveness

The player must remain as responsive—or become more responsive—than FULL currently is.

We want:
ZERO UNFORCED LOSS
+
A99-C RESPONSIVENESS

simultaneously.
2. PROTOTYPE A SIMULATION-OWNED CONTROLLED_BALL STATE
Do NOT parent the ball to the animation.

Do NOT attach it to a foot bone.

Instead prototype an explicit authoritative simulation state:
CONTROLLED_BALL

This means:
The simulation knows that this player has established secure control and plans the player's movement and ball trajectory as one coordinated football action.

Animation remains presentation.

The ball remains authoritative simulation state.
3. FUNDAMENTAL ARCHITECTURE
Current architecture often resembles:
foot contacts ball
↓
ball becomes completely free
↓
predict free ball
↓
player chases/intercepts it
↓
find another foot contact
↓
repeat

This is creating unnecessary failure opportunities during elite close control.

Prototype:
secure possession
↓
CONTROLLED_BALL
↓
choose football action
↓
jointly plan:
    authoritative player movement
    authoritative ball trajectory
    support plan
    technical contact(s)
↓
execute
↓
transition directly into next controlled action

until something genuinely breaks possession.
4. THIS IS NOT BALL ATTACHMENT
Absolutely no:
foot parenting
skeleton parenting
animation-driven ball coordinates
teleporting
magnetic corrections after the fact

The authoritative simulation owns:
ball position
ball velocity
ball spin where applicable
controlled trajectory
contact events

every tick.

Rendering only consumes those facts.

Animation ON/OFF must remain gameplay-neutral.
5. CONTROLLED BALL CAN STILL MOVE FREELY AROUND THE PLAYER
CONTROLLED_BALL does NOT mean:
ball stays 20 cm from ankle.

Different actions legitimately produce different separation.

Examples:
CLOSE_CARRY
→ very tight ball

NORMAL_CARRY
→ moderate separation

SPRINT_CARRY
→ longer push into stride

COMPACT_REDIRECT
→ short angled trajectory

RONALDO_CHOP
→ ball crosses behind support leg

CRUYFF
→ characteristic backwards/across trajectory

DRAG_BACK
→ ball travels backwards under control

OUTSIDE_CUT
→ appropriate outside-foot exit

The difference is:
The simulation already knows this trajectory is part of a controlled football action and has a valid continuation.

It does not repeatedly pretend the player has lost possession between ordinary dribble contacts.
6. B4 SHOULD SELECT CONTROLLED-BALL ACTIONS
Preserve B4.

Its job becomes even cleaner:
current player state
+
current controlled ball state
+
joystick intent
+
available support/feet
↓
choose best football action

from:
carry
close carry
compact inside redirect
compact outside redirect
gather
urgent reach
braking touch
braking pivot
Ronaldo Chop
Cruyff
Hook
Drag-back
Outside Cut
etc.

The chosen action defines a coordinated:
body intention
+
support requirement
+
authoritative ball trajectory

7. B5 REMAINS IMPORTANT
Preserve B5's rapid return of control.

Once a controlled action reaches its meaningful contact/body transition:
allow the next controlled action to begin

without waiting for decorative animation recovery.

This should make CONTROLLED_BALL transitions feel continuous rather than like chained canned animations.
8. CONTROLLED ACTIONS SHOULD CHAIN DIRECTLY
This is central to the silky feel.

Example:
sprint carry
↓
joystick rotates 50°
↓
compact outside redirect
↓
joystick continues rotating
↓
curved close carry
↓
snap 90°
↓
Ronaldo Chop or generic redirect
↓
immediate controlled exit

There should not be tiny hidden states between these where:
possession = LOST

simply because the next foot hasn't contacted yet.
9. RAPID INPUT SHOULD TIGHTEN CONTROL
At BC99/D99, use recent input behavior as context.

If input is:
stable straight

allow a longer efficient carry.

If input begins:
turning rapidly
oscillating
changing angular velocity

the player should naturally move toward a tighter control solution.

Consider:
current speed
requested turn magnitude
recent stick angular velocity
recent stick angular acceleration
ball/body geometry
upcoming support

when determining appropriate controlled-ball separation.

This is NOT prediction of future input.

It is responding to the fact that the player is currently demanding high-frequency technical control.
10. DO NOT SOLVE RAPID INPUT WITH CONSTANT MICRO-TOUCHES
Preserve:
quick feet, not busy feet.

Tight control does not automatically mean:
8 touches per second.

Prefer:
better ball trajectory
better placement
decisive redirect
gather when necessary

over endless corrective taps.
11. POSSESSION-PRESERVING FALLBACKS
If the preferred planned action becomes impossible before commitment, BC99/D99 should have legitimate technical alternatives.

Examples:
GATHER
CUSHION
SOLE_CONTROL
EMERGENCY_INSIDE_CONTROL
EMERGENCY_OUTSIDE_CONTROL
PROTECTIVE_TOUCH
SHORTENED_CARRY

These names are provisional.

Do not add them all unless necessary.

Build the minimum useful vocabulary.

The principle is:
If the ambitious action stops being viable, an elite technician changes the football action rather than simply losing the ball.

12. THIS MUST NOT BECOME INVULNERABILITY
CONTROLLED_BALL protects against self-inflicted controller failure.

It does NOT protect against opponents.

An opponent must still be able to:
poke ball away
standing tackle
slide tackle
intercept
block a touch
win a loose collision
physically disrupt possession

legitimately.
13. OPPONENT COLLISION INTERRUPTS CONTROL AT THE REAL BALL
This is the critical physics test.

At every tick, the controlled ball has:
real authoritative position
real authoritative velocity

If an opponent foot intersects it:
resolve collision at that exact position/time

Then determine whether:
control survives with altered trajectory

or:
CONTROLLED_BALL → FREE_BALL

or eventually:
opponent legitimately establishes CONTROLLED_BALL

after collection.

Do not wait for the current dribble animation to finish.
14. PHYSICS HANDOFF MUST BE CONTINUOUS
When controlled possession breaks at time t:

use:
ball.position(t)
ball.velocity(t)
ball.spin(t)

as the initial state for unrestricted ball physics.

There must be:
no teleport
no velocity reset
no hidden damping
no discontinuity

The ball should simply continue physically from the state it already had.
15. INTENTIONAL RELEASES
These should immediately leave CONTROLLED_BALL as appropriate:
pass
through ball
cross
shot
clearance
intentional knock-on if we later support one

The existing authoritative kick/pass/shot systems own the resulting ball.
16. RECEIVING / COLLECTION
Do NOT simply grant CONTROLLED_BALL because a player is near the ball.

Secure possession must first be legitimately established through:
receive
collection
tackle win + collection
loose-ball control

using the appropriate existing systems.

Once the player has genuinely controlled it:
→ CONTROLLED_BALL

17. STATE MODEL
Prototype something explicit, approximately:
FREE_BALL
↓
RECEIVE / COLLECT
↓
SECURE_CONTROL
↓
CONTROLLED_BALL
↓
intentional release
OR
external disruption
↓
FREE_BALL

Exact naming is yours.

Keep state transitions deterministic and auditable.
18. BC99 ZERO-LOSS RULE
For the reference:
BC99
D99
A99-C

run prolonged torture tests.

Required target:
SELF-INFLICTED POSSESSION LOSSES = 0

across arbitrary legal joystick movement.

Include:
straight sprint
continuous curves
tight circles
fast circles
repeated ±30°
repeated ±60°
rapid 90° snaps
180° reversals
random continuous analog movement
deliberately abusive oscillation
stop/start
walk→sprint→cut→stop

Run enough simulated time that zero is meaningful.

Ideally test hours of equivalent input, not a few curated cases.
19. ZERO LOSS MUST BE CAUSAL
Do NOT implement:
if BC == 99:
    lost = false

or equivalent hidden protection.

Zero loss must emerge because:
controlled actions always produce valid controlled continuations

or:
the player chooses a possession-preserving fallback.

Audit this explicitly.
20. COMPARE AGAINST CURRENT FULL
Keep today's unified FULL build untouched as comparison.

Build:
FULL-FREE
= current system

FULL-CONTROLLED
= same C/support/B4/B5 foundation + CONTROLLED_BALL

Use identical joystick traces.

Compare:
response time
turn time
ball separation
contacts
redundant contacts
technique choice
ball losses
foot jumps
leg crossings
boot/ball contact gaps
CPU

21. DO NOT ALLOW CONTROLLED_BALL TO MAKE THE ANIMATION LAZY
This is important.

Even though the simulation now owns a coordinated ball trajectory, the rendered feet should still convincingly explain the ball manipulation.

Continue requiring:
correct contact foot
correct contact surface where applicable
plausible contact timing
coherent support

We are simplifying simulation ownership, not abandoning football animation.
22. USE THE SHARED SUPPORT PLAN
CONTROLLED_BALL should make yesterday's integration easier, not bypass it.

Coordinate:
A99-C movement
persistent support timeline
B4 technical action
controlled ball trajectory
rendered contact foot

as one plan.

Do not create a second independent ball animation planner.
23. CPU BENCHMARK
Explicitly measure performance.

Compare:
FULL-FREE
vs
FULL-CONTROLLED

Measure at least:
average simulation cost / simulated second
worst tick
contact planning cost
support planning cost
controlled-ball evaluation cost
collision cost

My hypothesis is CONTROLLED_BALL may actually be cheaper because it removes repeated free-ball interception/reconciliation work.

Do not assume this; measure it.
24. OPPONENT / TACKLE PROBE
This is mandatory before recommending the architecture.

Build a simple deterministic opponent-foot probe that can intersect the controlled ball at:
random times
random points in controlled actions
different approach directions
different relative velocities

Verify:
opponent can still hit/win ball
controlled state breaks appropriately
outgoing free-ball physics is continuous
animation state cannot protect the ball

If possible, also test with the current standing-tackle system rather than only a synthetic probe.
25. PRESENTATION ON/OFF NEUTRALITY
Required:
animation ON
animation OFF

produce identical:
player movement
controlled ball trajectory
contacts
tackle interruptions
releases
final outcomes
RNG

Presentation must never own CONTROLLED_BALL.
26. RANDOM INTEGRITY
Preserve deterministic/auditable randomness.

Do not reroll unrelated outcomes because the controlled-ball implementation changed.

If Ball Control execution variance is sampled, it must use the existing deterministic approach.
27. LOWER RATINGS — DO NOT CALIBRATE YET
Do not build the full BC/D/Agility curves yet.

However, structure the system so that later lower ratings can causally affect:
trajectory precision
control envelope
technique availability
adaptation capability
recovery quality

A lower-rated player may eventually make genuine technical mistakes.

But:
Controller/animation failure must never masquerade as an attribute failure.

28. DON'T DESTROY WHAT WE LIKE
Owner feedback on current FULL:
This is definitely an improvement. Cuts are faster.

Preserve that.

Do not regress:
A99-C responsiveness
straight RUN restoration
persistent support continuity
B4
B5
named moves
joystick feel
physical tackleability

This experiment should primarily change ball ownership/control architecture during secure possession.
29. PLAYABLE REVIEW
Update the unified playground with a prominent switch:
BALL CONTROL MODEL:

CURRENT FREE
CONTROLLED

Same player.

Same C.

Same joystick input.

Same B4/B5.

Same support system.

I want to switch between them myself.
30. HUD
In diagnostics show:
possession state
current controlled action
ball trajectory phase
next planned action
support foot
technical foot
committed/uncommitted
control threat / fallback if any
reason CONTROLLED_BALL ended

Keep normal play uncluttered.
31. REPORT EVERY CONTROLLED-BALL EXIT
During torture testing classify every transition out of CONTROLLED_BALL:
PASS
SHOT
CROSS
CLEARANCE
INTENTIONAL_RELEASE
OPPONENT_TACKLE
OPPONENT_INTERCEPTION
EXTERNAL_COLLISION
TECHNICAL_ERROR
CONTROLLER_FAILURE

At BC99/D99/A99:
CONTROLLER_FAILURE = 0

and for this reference prototype I expect:
TECHNICAL_ERROR = 0

unless we explicitly decide otherwise later.
32. ITERATE, DON'T JUST PROVE THE CONCEPT
If the first CONTROLLED_BALL prototype:
feels magnetic
uses too many touches
erases named moves
makes sprint carrying weird
hurts C responsiveness
creates foot mismatch

investigate and improve it.

Do not stop merely because the state machine technically works.

The goal is a better playable system.
SUCCESS CRITERIA
At:
BC99 / D99 / A99-C

I should be able to take the joystick and do essentially arbitrary legal movement for a prolonged period and:
remain responsive
remain smooth
retain possession
retain coherent feet
retain the physical authoritative ball

indefinitely unless:
I intentionally release the ball

or:
an opponent legitimately takes/disrupts it.

And when an opponent does touch the ball:
CONTROLLED_BALL must offer no magical protection whatsoever.

CENTRAL OWNER RULE
Once an elite 99/99/99 player has established secure possession, I do not want them losing the ball because of their own ordinary dribbling or movement input.

The ball remains authoritative simulation state, but while securely controlled, the simulation plans the player's movement and ball trajectory together instead of repeatedly treating the ball as accidentally loose between every dribble touch.

Preserve today's good FULL build beside this experiment, iterate until CONTROLLED is genuinely better, and then stop for owner playtest.

Do not freeze or calibrate lower ratings.
