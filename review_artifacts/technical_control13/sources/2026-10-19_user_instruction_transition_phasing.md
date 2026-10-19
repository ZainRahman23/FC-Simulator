FOCUSED FIX — REMOVE BODY/LEG PHASING, ESPECIALLY RECEIVE → PLAY/DRIBBLE TRANSITIONS
The new carry model is improving, but there is still visible body/leg/foot phasing, especially during the transition from:
RECEIVE / FIRST TOUCH
→ TURN
→ FIRST CARRY/DRIBBLE ACTION

Fix this before adding more fancy dribbling actions.
Do NOT change the approved ball outcome, carry-lane philosophy, outside/instep carry model, Ball Control/Dribbling/Agility responsibilities, or touch frequency simply to hide the visual problem.
The problem
The current system still appears to treat adjacent technical actions too independently.
A receive may finish with:
support leg here
contact leg here
pelvis orientation A
weight on leg X
stride phase A

while the following carry action expects:
support leg somewhere else
different leg forward
pelvis orientation B
weight on leg Y
stride phase B

Blending directly between those poses can cause:
- feet passing through each other;
- shin/calf intersections;
- one leg passing through the other;
- foot through planted leg;
- feet through the ball;
- sudden support-foot changes;
- pelvis/leg discontinuities;
- apparent teleporting between receive and running gait.
This is especially visible in the receive → play/carry transition.
Treat the sequence as one continuous movement
Do not independently solve:
RECEIVE

and then:
DRIBBLE ACTION

and blend them afterward.
Once the receive knows the intended continuation, plan a continuous transition:
receive preparation
→ receive contact
→ receive follow-through
→ weight transfer
→ bridge step(s)
→ first carry preparation
→ first carry contact
→ normal carry gait

The first dribble action should be aware of the final physical state of the receive.
Explicit transition state
At the end of every technical contact expose at least:
planted/support foot
free foot
weight-bearing leg
left/right foot positions
left/right foot velocities
stride phase
pelvis position/orientation
hip state
body COM
current body angular velocity
contact-foot follow-through

The next action must begin from that state rather than from its preferred generic starting pose.
Do not switch support legs impossibly
If the receive ends with weight strongly on the right leg, the next action cannot instantly behave as though the left leg is planted.
It may need:
right-leg support
→ left recovery/placement step
→ weight transfer
→ right technical action

even if that adds a small amount of time.
At elite Dribbling/Agility the transition can be extremely fast, but it still needs a mechanically readable sequence.
Add collision/clearance constraints for the legs
During animation solving, enforce reasonable clearance between:
left foot ↔ right foot
left shin ↔ right shin
foot ↔ opposite calf
foot ↔ opposite knee

Do not require full rigid-body character physics.
A simple deterministic self-collision/clearance layer is enough.
When two planned limb paths intersect, resolve primarily through:
1. pelvis/root adjustment;
2. hip path;
3. knee trajectory;
4. stride timing;
5. small foot adjustment.
Do not fix it by grotesquely twisting the ankle.
Foot trajectories need arcs
A recovering foot should not travel directly through the other leg to its next target.
Give swing feet anatomically sensible clearance arcs:
lift
→ swing around/forward
→ descend
→ plant/contact

The exact arc can be small and fast at elite ratings.
Preserve planted feet
If a foot is currently planted and weight-bearing, keep it planted until the transition actually unloads it.
Do not allow the next action's IK solver to drag that foot through the turf or through the other leg.
Contact preparation must begin earlier
This connects directly to the previously flagged "impossible to prepare" contacts.
The planner should look ahead at least one technical action.
Conceptually:
current receive contact
↓
know desired continuation
↓
determine likely first carry contact
↓
begin arranging stride/support geometry during receive follow-through
↓
carry contact becomes naturally reachable

This should reduce both phasing and last-frame IK corrections.
Allow micro bridge steps
Do not be afraid of a very short:
adjustment step
weight-transfer step
crossover recovery

between receive and carry when necessary.
At 99 Agility/Dribbling these can happen extremely quickly.
A 100–200 ms human-looking bridge is preferable to two legs visibly passing through each other.
Do not insert bridge steps when they are unnecessary.
Ball remains authoritative
Never move the ball to solve phasing.
Preserve:
authoritative contact time
authoritative contact foot/surface
authoritative ball launch

wherever physically representable.
Improve the body trajectory around those facts.
If a scheduled future contact genuinely cannot be reached without body intersection, flag it early enough for the action planner to choose a different valid foot/stride/contact timing before commitment.
Do not repair it after commitment by phasing the skeleton.
Important distinction
A tiny amount of mesh intersection in extreme poses may eventually be tolerable.
What is NOT acceptable is visible structural phasing where:
one foot passes through the opposite leg
legs swap sides through each other
support leg changes instantaneously
receive pose pops into dribble pose

Build a dedicated transition torture test
Test:
ground receive → straight carry
ground receive → 30° carry
receive → 60° cut
receive → 90° turn
half-turn → preferred-foot outside carry
through-stance turn → carry
chest → foot → carry
thigh → foot → carry
sprint receive → first carry touch
receive → rapid same-foot second touch
receive → opposite-foot next touch

Both left and right.
Prioritize 99/99/99 first because the fast transitions expose the problem most clearly.
Diagnostics
Add measurements for:
minimum left/right foot separation
minimum shin/shin separation
minimum foot/opposite-leg separation
planted-foot slip
support-leg switches
time between weight transfers
pelvis discontinuity
foot trajectory discontinuity
IK correction magnitude

Flag frames where body segments intersect beyond a small tolerance.
Visual review
Provide:
normal speed
0.5×
0.25×
foot-level close view
front 3/4
rear 3/4
side
frame strips around receive → carry transition

Show before vs after using identical authoritative simulation.
Acceptance rule
The desired result is:
Receive, turn and dribble should visually be one continuous human action. The viewer should not be able to identify the frame where one animation/system hands off to another.

Keep the fast elite feet.
Keep the tight ball.
Keep the new preferred-foot/outside-foot carry.
Solve the transition choreography rather than slowing everything down.
Do not add more fancy skills until this transition/phasing pass is visually approved.
