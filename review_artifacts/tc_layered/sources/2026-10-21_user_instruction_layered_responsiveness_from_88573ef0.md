<!-- The owner's instruction, saved verbatim (21 Oct 2026, ~03:17 EEST), after their hands-on review of tc_responsive.html. -->

TECHNICAL CONTROL — RESPONSIVENESS PASS FROM 88573ef0, WITHOUT REPEATING THE FAILED RESPONSIVE PROTOTYPE
We have completed hands-on review of the recent Technical Control experiments and now have a clearer direction.

This assignment is to improve the actual preferred historical baseline:
commit: 88573ef0
playable:
tc_baseline_88573ef0.html

That is currently our preferred foundation for dribbling feel.

Do not use tc_responsive.html as the new foundation.
CRITICAL OWNER FEEDBACK ABOUT tc_responsive.html
I personally played the responsive experiment.

Although its measured response times improved substantially, visually it was unacceptable.

The character:
floated
phased
glitched
disconnected from the ground
had feet/body that could not convincingly explain the root/contact movement

It looked crazy in normal gameplay.

This is a failed implementation direction.

The lesson is NOT:
responsiveness is bad

The lesson is:
We allowed authoritative movement/contact behavior to diverge too far from a visually feasible human body and then expected presentation warping to repair it.

Do not repeat this.
IMPORTANT DESIGN BOUNDARY
We still accept presentation cheats:
small plant pivots
small foot slides
shortened steps
stride retiming
pose warping
IK
abbreviated support transfer
early animation exits

But they must remain small enough that the character still looks grounded and human at normal gameplay speed.

Do NOT create:
root travelling independently of believable support
feet visibly left behind by the body
contact proxies far away from rendered feet
floating
large skeleton warps
obvious phasing
visual body chasing an authoritative ghost

The football action and the human body need to remain tightly coupled.
SEPARATE AGILITY WORKSTREAM — DO NOT TOUCH IT
A separate Astra workstream is currently investigating whether:
Agility
braking
turning caps
acceleration/deceleration
sprint-direction constraints

in the authoritative locomotion system are themselves limiting dribbling responsiveness.

Therefore:

Do not retune Agility or authoritative movement capability in this assignment.

Preserve 88573ef0's current:
authoritative turning limits
braking
acceleration
sprint speed
locomotion capability

unless a tiny non-tuning adapter is absolutely necessary.

We need to keep the experiments separable.

If you identify a responsiveness problem that can only be solved by changing authoritative movement capability, flag it as AGILITY/MOVEMENT DEPENDENCY and leave it unchanged.
GOAL
Determine how much better we can make 88573ef0 by improving Technical Control scheduling, branching and presentation response without changing the underlying Agility/movement ceiling.

Work incrementally.

Do NOT build another giant replacement controller.
RULE: ONE CHANGE AT A TIME
Build each improvement as a separately toggleable experimental layer over immutable 88573ef0.

Conceptually:
A = 88573ef0

B1 = A + immediate acknowledgement

B2 = B1 + earlier/revisable touch opportunities

B3 = B2 + narrow contact commitment

B4 = B3 + generic effort-turn vocabulary

B5 = B4 + shorter technical recovery/exits

Keep each layer individually toggleable.

I want to know which changes actually improve feel.

Do not silently bundle unrelated changes.
1. IMMEDIATE INPUT ACKNOWLEDGEMENT
The first problem is that the baseline can feel as though it ignores the user's new direction until the next major technical event.

Separate:
INPUT ACKNOWLEDGEMENT

from:
BALL CONTACT

and:
TURN COMPLETION

When analog intent changes meaningfully, the player should begin visibly responding immediately, even if the next legal ball contact cannot occur yet.

Use the existing body/root capability.

Potential visual acknowledgement:
head looks toward new line
shoulders begin rotating
torso leans/prepares
hips begin opening
knees flex for braking
next step shortens
support foot begins preparing

But:

do not move the authoritative root faster than the existing locomotion system permits.

This is primarily early communication of the already accepted intent.
2. DO NOT FAKE RESPONSE WITH UPPER-BODY TWIST
Immediate acknowledgement must still look like one connected human.

Do not produce:
torso facing 90° away
while
pelvis/legs continue obliviously forward

Use bounded whole-body preparation.

The player should look like:
they have begun the turn

not:
their upper body has detached from their legs.

3. MAKE TOUCH OPPORTUNITIES LESS STRIDE-BOUND
The next major suspected baseline problem is that useful ball contacts are too dependent on the existing carry/stride schedule.

Currently, a new direction request may arrive but the player still waits for:
the next ordinary scheduled carry touch

even when a real footballer could reach the ball sooner.

Add a revisable next-touch opportunity.

When analog intent changes:
current physical ball
+
current body/feet
+
current carry plan
+
latest direction request
↓
is there an earlier plausible useful contact?

If yes:
replace/retime the uncommitted ordinary carry touch

rather than adding an extra touch.
4. DO NOT INVENT A MAGIC FOOT
This is where the failed responsive experiment went too far.

An earlier contact must still have a visually plausible actual leg/foot solution.

It can use:
shortened stride
alternative foot
quicker swing
small plant pivot
compact reach
abbreviated support transfer

But it cannot use:
abstract proxy reaches ball
while rendered leg is somewhere else

Keep the gameplay/contact representation and visible foot tightly coupled.

A small procedural discrepancy is acceptable.

A floating/phasing character is not.
5. PREFERRED FOOT IS A PREFERENCE, NOT A WAIT CONDITION
Inspect whether 88573ef0 sometimes waits unnecessarily for the preferred foot.

If:
preferred foot contact = substantially later

while:
other foot can make an excellent immediate football contact

then at D99 the alternative foot should be eligible.

Do NOT yet implement Weak Foot degradation.

Just stop preferred-foot bias from creating unnecessary dead time.

Keep preferred foot as a scored preference.
6. NARROW CONTACT COMMITMENT
The baseline may commit too much of a complete action.

Redefine the meaningful irreversible window around:
the final approach to an authoritative ball contact

rather than:
the entire carry/cut/turn/recovery animation

Conceptually:
PROVISIONAL
action family
foot
timing
target

may still change.
FINAL CONTACT APPROACH
The chosen foot/contact is physically committed and must remain continuous.
CONTACT EXECUTED
The physical ball result is immutable.
RECOVERY
Return control quickly.
7. LATEST ANALOG INTENT WINS UNTIL COMMITMENT
Treat ordinary analog movement as:
CURRENT DESIRED MOVEMENT

not a queue of requested turns.

Example:
0°
→ 45°
→ 90°

before the next contact should generally mean:
revise toward 90°

not:
execute 45°
then execute 90°

Superseded uncommitted actions should disappear.

Already executed ball contacts never change retroactively.
8. DO NOT MAKE THE ENTIRE BODY UNRESPONSIVE BECAUSE ONE FOOT IS COMMITTED
If the contacting foot has entered its final approach:
that foot/contact

may be committed.

But the player can still:
begin preparing torso
prepare next support
adjust recovery intention
prepare next movement line

for the newest analog request.

Protect the meaningful football event, not an entire canned action.
9. ADD GENERIC EFFORT-TURN / URGENT-TOUCH ACTIONS
There is currently too large a gap between:
ordinary carry

and:
Ronaldo Chop
Cruyff
Hook
Drag-back

Add a small generic elite technical vocabulary for ordinary analog control.

Start with:
COMPACT_INSIDE_REDIRECT
COMPACT_OUTSIDE_REDIRECT
ACROSS_BODY_GATHER
URGENT_REACH
BRAKING_TOUCH
BRAKING_PIVOT

Names are provisional.

These should be functional football actions, not theatrical skills.
10. GENERIC ACTIONS SHOULD BE FAST AND CHEAP
Example:
sprinting
+
user suddenly requests ~70°

may not need:
full Ronaldo Chop choreography

It may simply need:
aggressive plant
↓
compact outside/inside reach
↓
redirect ball
↓
immediate exit

This is likely closer to what makes ordinary elite left-stick dribbling feel responsive.
11. NAMED MOVES REMAIN CONTEXTUAL
Preserve the researched:
Ronaldo Chop
Cruyff
Inside Hook
Drag-back

But they should NOT be selected merely because:
requested angle ≈ their reference angle

Score them based on:
current speed
ball lane
foot availability
protection
current body state
exit quality
preparation time

If a generic redirect solves the situation more quickly and cleanly:
use the generic redirect.

Named actions should remain recognizable football techniques when selected.
12. SHORTEN WIND-UPS WHERE POSSIBLE
Inspect each baseline technical action for:
dead preparation frames
unnecessary setup steps
decorative wind-up

At D99, abbreviate them where the current ball/body state already satisfies the useful preparation.

Do NOT remove necessary football choreography.

Example:

If the ball is already perfectly positioned for an inside redirect:
don't take a setup touch just because the canonical animation starts with one.

13. SHORTEN RECOVERY / EXIT LOCK-IN
Likewise inspect what happens after the decisive contact.

Once:
contact executed
+
body has reached a plausible transition state

return to ordinary responsive control quickly.

Do NOT wait for:
decorative follow-through
canonical final pose
complete animation recovery

if they are not gameplay-essential.

The presentation can blend/retime the exit.
14. BALL PLACEMENT SHOULD CONSIDER THE NEXT ACTION
Preserve the physical ball.

But at BC99, the intended contact target itself should consider:
where will my body be next?
where can either foot naturally reach next?
what is the latest analog intent?

An elite touch should not merely be accurate relative to a stale target.

It should deliberately place the ball into a useful next-control region.

This is still:
authored contact
→ physical ball

not magnetism.
15. DO NOT OVERUSE MICRO-TOUCHES
Keep:
quick feet, not busy feet.

Earlier touch opportunities do NOT mean:
constantly add more contacts.

A new urgent touch should generally:
replace

a superseded ordinary touch.

Measure redundant contacts explicitly.
16. CARRY APPROACH CAN CHANGE BEFORE THE BALL DOES
If the ball has already been pushed forward and the user changes direction:

the ball must continue on its legitimate physical path until another contact.

But the player does not need to continue approaching it on the old line.

Allow:
braking
angled approach
body opening
alternate-foot preparation

toward the existing ball trajectory.

Again, use the current unchanged movement capability for this assignment.
17. DO NOT REPEAT THE tc_responsive FAILURE
This deserves an explicit acceptance rule.

At all times compare:
authoritative root
rendered pelvis
rendered support feet
contact foot
ball

The body must continue to visually inhabit the authoritative movement.

Add diagnostics for:
rendered pelvis ↔ authoritative root offset
rendered contact foot ↔ gameplay contact position
support-foot slide
unsupported root travel
leg intersections

Set warning diagnostics, not aggressive runtime constraints.

Do NOT solve warnings by slowing gameplay automatically.

I want them surfaced for visual review.
18. NORMAL SPEED IS THE PRIMARY STANDARD
Evaluate in this order:
1. owner hands-on feel
2. normal-speed smoothness
3. input responsiveness
4. football readability
5. authoritative correctness
6. slow-motion diagnostics

Do not optimize for frame-stepped anatomical perfection at the expense of feel.

But obvious:
floating
phasing
foot teleporting
disconnected skeleton/root

fail immediately.
19. KEEP 88573ef0 IMMUTABLE
The original page remains permanently available:
tc_baseline_88573ef0.html

Every experiment must be switchable back to it instantly.

Do not overwrite or silently update the baseline.
20. BUILD A LAYERED A/B PLAYGROUND
Create a new experimental page based directly on 88573ef0.

Give me toggles:
[ ] Immediate acknowledgement
[ ] Revisable/earlier touch opportunities
[ ] Narrow contact commitment
[ ] Generic effort turns
[ ] Short technical exits
[ ] Next-action-aware BC99 targets

plus:
ALL OFF = exact 88573ef0 behavior
ALL ON = current experiment

This is extremely important.

I want to discover which layer helps and which hurts.
21. SAME-INPUT REPLAY
Record an analog input sequence once.

Replay it through:
baseline
B1
B2
B3
B4
B5
full stack

so differences are interpretable.
22. REQUIRED TESTS
At:
BC99 / D99 / A99

using the existing A99 movement capability unchanged, test:
gentle continuous curve
repeated 15–30° corrections
jog 45°
jog 90°
run 45°
run 90°
sprint 45°
sprint 90°
sprint 120°
sprint 180°
rapid left/right
0 → 90 → 0 → -90
continuous joystick circle

Prioritize analog joystick.

Keep WASD functional but secondary.
23. METRICS
Report:
input → first visible response
input → first relevant contact
input → meaningful heading change
input → new movement line
action lock time
touch count
redundant touches
ball separation
control loss
root/display offset
contact-foot mismatch
leg intersection warnings

But:

metrics do not select the winner.

Owner hands-on review does.

tc_responsive.html is the proof that good latency numbers can still produce a terrible footballer.
24. DO NOT IMPLEMENT RAPID-INPUT ZERO-LOSS FIXES YET
The original baseline sometimes:
tangles feet
loses control

under extreme rapid input.

Do NOT solve that in this assignment.

We previously tried to solve it too early and created the slower/jankier branch.

First establish:
smooth responsive ordinary control.

Once that foundation is approved, we can solve extreme rapid-input robustness without destroying feel.
25. DO NOT CHANGE RATINGS
Keep:
BC99
D99
A99

as the reference.

No lower-rating calibration.

No Weak Foot calibration.

No style calibration.
26. STOP FOR OWNER REVIEW
Give me:
immutable baseline URL
layered experiment URL
one-click A/B
layer toggles
same-input replay
concise metrics
known visual issues
AGILITY/MOVEMENT DEPENDENCIES you deliberately did not change

Then STOP.

Do not choose the final architecture yourself.
CENTRAL DESIGN RULE
We now have evidence for BOTH failure extremes:

Extreme 1:
body/foot perfection gates gameplay
→ slow
→ locked
→ janky

Extreme 2 (tc_responsive.html):
gameplay/root/contact becomes highly responsive
but body is allowed to diverge too far
→ floating
→ phasing
→ glitching

We need the middle:
The football controller is responsive and highly branchable, while the authoritative movement and visible human body remain close enough that animation can explain the action with only small, bounded cheats.

And for this assignment:
Improve Technical Control scheduling and action availability around the existing 88573ef0 movement model. Leave Agility/movement capability itself untouched until the separate diagnostic returns.
