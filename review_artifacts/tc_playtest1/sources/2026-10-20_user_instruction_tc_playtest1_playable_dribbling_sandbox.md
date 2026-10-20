# Owner instruction — 2026-10-20 (after TECHNICAL-CONTROL-1.5 was presented), verbatim

TECHNICAL-CONTROL PLAYTEST-1 — FULL PLAYABLE DRIBBLING SANDBOX
The five elite technique references look good enough to move to the next validation stage.
Do not freeze them yet and do not integrate them into production gameplay yet.
Build a full-fledged local playable dribbling test server where I directly control one player and can freely run around with the authoritative physical ball using WASD.
The purpose is no longer to inspect predetermined 45°/90°/120°/150°/180° clips.
I want to actually play with the technical-control system myself and discover whether:
- ordinary carrying feels natural;
- running and sprinting feel different;
- arbitrary direction changes choose sensible techniques;
- the ball remains appropriately close;
- elite 99 technical actions are fast and efficient;
- the Ronaldo chop/Cruyff/hook/drag-back emerge naturally from my movement input;
- transitions between everything look continuous.
1. PLAYER
Start with the elite reference:
Ball Control = 99
Dribbling = 99
Agility = 99

Give me controls to change all three attributes live later, but 99/99/99 is the default and primary validation target.
Also expose:
preferred foot:
LEFT / RIGHT / TWO-FOOTED

dribbling style

Start with a neutral/default elite style.
Do not spend this assignment calibrating lower ratings.
2. BASIC CONTROLS
Use:
W
forward

S
backward

A
left

D
right

WASD should represent the player's desired movement direction, not directly command a particular animation.
The technical-control resolver decides how the footballer achieves that movement.
Support simultaneous inputs:
W+A
W+D
S+A
S+D

with continuous normalized directions.
3. MOVEMENT SPEEDS
I need to test:
WALK
JOG
RUN
SPRINT

Use intuitive controls.
Suggested:
normal WASD
→ normal/run movement

Shift + WASD
→ sprint

Alt/Option or another convenient modifier
→ walk/close movement

Also provide clickable UI controls/presets for every movement mode so keyboard-layout differences do not block testing.
Show current:
movement mode
requested speed
actual player speed
ball speed

4. NO SKILL BUTTON
There is deliberately NO dedicated skill-move input.
I should NOT press:
Ronaldo Chop
Cruyff
Hook
Drag-back
Outside Cut

I only request:
movement direction
+
movement speed

The player's technical system determines how to solve it.
This is fundamental to Touchline.
5. CONTINUOUS INPUT
Do not quantize WASD into five predefined test angles.
Input should be continuous.
For example, if I am travelling north and then request northwest:
current movement
+
requested movement
↓
technical-action resolver
↓
best feasible football solution

Likewise I should be able to rapidly do:
W
→ WA
→ A
→ SA
→ S

and watch the footballer continuously solve the changing movement request.
6. USE THE NEW REAL TECHNIQUE REFERENCES
Make the five approved-direction reference actions available to the playable resolver:
OUTSIDE-FOOT CUT
RONALDO CHOP
CRUYFF TURN
INSIDE HOOK
DRAG-BACK

Preserve the corrected football mechanics.
In particular, the Ronaldo chop must remain the new real version:
shielding/support leg crosses in front
+
inside of striking foot contacts from behind it
+
ball travels behind/through the stance
+
body protects ball
+
player exits onto new line

Do not revert to the exposed sideways kick from TC1.4.
7. THESE ARE NOT HARD ANGLE BUCKETS
Do NOT implement:
0–60°
→ outside cut

61–105°
→ Ronaldo chop

etc.

The five angles were reference cases.
During free play, score feasible technical actions using context.
Consider:
requested direction change
current speed
current player facing
current velocity
current ball position
ball lane
current stride phase
support foot
available contact foot
preferred foot
preparation required
technique execution time
ball protection
expected exit direction
expected exit speed
number of unnecessary contacts

Choose the best football solution.
8. ORDINARY CARRY REMAINS THE DEFAULT
Most input should NOT trigger a named technique.
Preserve the TC1.2 carry philosophy:
preferred-side ball lane
outside / outer-instep forward touches
instep pushes at speed
same-foot consecutive contacts
natural running steps between touches
inside-foot corrections when useful

If I am sprinting straight forward:
touch
→ running strides
→ touch

not constant micro-touches.
If I make a tiny 10° correction, use an ordinary carry correction.
Named technical actions should emerge only when they actually solve the requested movement better.
9. QUICK FEET, NOT BUSY FEET
Preserve the central elite rule:
99 Dribbling = quick feet, not busy feet.

Do not make D99 produce maximum contacts per second.
D99 means:
fast technical preparation
fast foot movement
sophisticated techniques available
late redirection capability
efficient solutions
fast recovery

If one decisive action solves the movement, prefer that over four unnecessary touches.
10. INPUT CHANGES DURING AN ACTION
This is one of the most important things I want to test.
I may change WASD while:
carrying
preparing a touch
planting
executing a cut
recovering from a turn

The system must decide whether the current action:
can still be redirected
can transition into another technique
must complete because it is already committed

Do not instantly snap to every new keypress.
But also do not ignore user input for a long canned-animation lockout.
At D99, late technical reorganization should be extremely responsive where biomechanically plausible.
11. BALL IS AUTHORITATIVE
Every contact remains:
selected technical action
↓
authoritative contact
↓
authoritative physical ball state
↓
player reacts to where ball actually went
↓
animation explains it

Never glue/parent the ball to the foot.
However, at 99/99/99 the result should visually feel extremely responsive and controlled because the player's actions are excellent.
12. CAMERA
Make the primary camera useful for actually playing.
I suggest a behind-and-above player-follow camera, similar to the shooting playground but somewhat wider so direction changes are easy to judge.
Camera should:
follow player smoothly
rotate with general player movement
keep player + ball visible
avoid rapid camera snapping during cuts

Also provide optional:
fixed Touchline camera
top-down diagnostic camera
side/debug camera

The playable camera is primary.
13. LARGE TEST PITCH
Give me a sufficiently large empty pitch/technical area.
Include visual references:
grid
centre circle / lines or cones
optional slalom markers

But do NOT make cones physical obstacles yet unless trivial.
I need enough room to:
sprint straight
weave
make repeated cuts
reverse direction
accelerate/decelerate

14. OPTIONAL TEST COURSES
Add resettable visual courses:
Straight acceleration
Test open sprint carry.
Slalom
Test repeated moderate direction changes.
Sharp-cut course
Mark:
45°
90°
120°
150°
180°

directions visually without forcing the technique.
Tight box
Test rapid low-distance direction changes.
These are visual guides only.
I retain full WASD control.
15. LIVE TECHNIQUE HUD
Show a compact optional HUD:
CURRENT ACTION

CARRY
OUTSIDE CUT
RONALDO CHOP
CRUYFF
INSIDE HOOK
DRAG-BACK
etc.

Also show:
current foot
contact surface
current speed
requested direction
actual facing
turn angle
ball separation
contacts/second

Keep this hideable because I also need a clean gameplay view.
16. CONTACT HISTORY
Keep the last ~20 ball contacts visible in an optional panel.
For each:
timestamp
technique
foot
surface
incoming ball velocity
outgoing ball velocity
intended direction
actual direction

This will make it much easier to explain cases that feel wrong.
17. BALL-SEPARATION GRAPH
Add an optional rolling graph for:
player ↔ ball distance

over the last several seconds.
At 99 I want to see the difference between:
tight technical control
vs
deliberate open sprint touch

rather than one fixed separation.
18. TECHNIQUE FREQUENCY
Track live:
total contacts
contacts/sec
outside %
inside %
instep %
sole %

left %
right %

ordinary carry %
outside cut %
Ronaldo chop %
Cruyff %
hook %
drag-back %

This is diagnostic only.
Do not optimize toward arbitrary percentages.
19. FREE PLAY FIRST
The default page should immediately let me play.
I should not need to:
select scenario
choose seed
click Run

Load page:
player standing with ball
↓
press WASD
↓
play

Include a clear:
RESET

button/key.
20. PAUSE / SLOW MOTION / FRAME STEP
For debugging provide:
pause
1×
0.5×
0.25×
frame step

Ideally allow me to replay the last several seconds after something looks wrong.
21. REPLAY BUFFER
Maintain approximately the last:
5–10 seconds

of gameplay state/input.
Add:
REPLAY LAST ACTION

or equivalent.
I want to be able to make a cut, think “that looked wrong,” and immediately replay it at 0.25×.
22. INPUT VISUALIZATION
Show current WASD input visually during replay.
This is important because I need to distinguish:
bad system response

from:
what I actually pressed

23. TECHNIQUE PROTECTION DIAGNOSTIC
Keep the new protection diagnostic available as an optional overlay.
Show hypothetical pressure from:
front
left
right
rear-left
rear-right

and whether:
leg
hips
torso

block a direct reaching line to the ball.
Do NOT use this as tackle probability.
It is diagnostic only.
24. BODY DEBUGGING
Optional overlays:
COM
pelvis
support foot
swing foot
foot trajectory
ball trajectory
desired movement vector
actual movement vector
current ball lane

Hide by default.
25. LIVE ATTRIBUTE CONTROLS
Once 99 is working, let me change:
Ball Control 1–99
Dribbling 1–99
Agility 1–99

live.
But:
do not invent/finalize new lower-rating calibration as part of this assignment.
If only existing provisional behavior is available, label it clearly.
The purpose is mainly to let me compare.
26. STYLE/PREFERRED FOOT
Let me switch:
LEFT
RIGHT
TWO-FOOTED

and any currently implemented provisional style.
I particularly want to test:
left-dominant carrier
right-dominant carrier
two-footed technician

Do not hardcode the ball to one side.
The existing carry-lane/style logic should determine behavior.
27. NO DEFENDERS YET
Keep this sandbox focused.
No:
defender AI
tackling
pressure gameplay
passing
shooting
goalkeeper

We will test those in combined sandboxes later.
This is the pure technical-control playground.
28. IMPORTANT TEST: RAPID WASD CHANGES
Explicitly test sequences like:
W
→ WD
→ D
→ SD
→ S

and:
sprint W
→ A

and:
sprint W
→ S

and:
W
→ D
→ W
→ A

The player should choose plausible football solutions without:
leg phasing
foot teleporting
ball teleporting
excessive micro-touches
huge uncontrolled ball separation
animation lockout

29. IMPORTANT TEST: SPRINT → RONALDO CHOP
Give me enough control that I can:
sprint forward
↓
suddenly request ~90° direction

and, when the ball/stride/foot geometry supports it, naturally get the new Ronaldo Chop.
I should see:
shielding leg crosses
striking inside foot chops behind it
ball travels through/behind stance
body turns
acceleration out

I should NOT have to press a skill button.
If another technique is genuinely better because of the current foot/stride state, allow that and expose the reason in diagnostics.
30. IMPORTANT TEST: INPUT TIMING
I want to discover for myself that:
same requested 90° turn

can produce different sensible actions depending on when in the stride/touch cycle I request it.
Do not artificially force identical outcomes.
This is one of the reasons we're building the playground.
31. PERFORMANCE
This needs to feel playable.
Profile the actual browser loop.
Report:
average frame time
p95
p99
worst frame

Do not hide major solver spikes behind a good average.
32. DETERMINISM
Record input history and seed.
Replaying the same:
initial state
+
inputs
+
timing
+
seed

must reproduce the same authoritative:
player path
action selections
contacts
ball trajectory

exactly.
33. ANIMATION NEUTRALITY
Animation ON/OFF must not change:
action selection
contact timing
ball state
player authoritative path

Presentation explains the simulation.
It does not drive it.
34. PRESERVE FROZEN/APPROVED SYSTEMS
Do not alter unrelated frozen systems.
Keep this implementation isolated/provisional.
Reuse:
TC1.2 carry principles
TC1.3 transition/clearance body
cleaned TC1.5 elite technique references
RUN-1 locomotion
frozen authoritative ball physics

where appropriate.
35. FINAL DELIVERABLE
Give me:
A direct local URL to the playable sandbox.
It should load immediately into free play.
Also provide:
controls
attribute controls
camera controls
replay controls
diagnostics
technique list
performance
determinism results
known limitations

But prioritize the actual playable page over a giant report.
DO NOT FREEZE.
This is a feel/visual playtest.
I want to spend time actually driving the player before we make further architectural decisions.
ACCEPTANCE TARGET
I can open the browser, use WASD to freely walk/run/sprint with the ball, make arbitrary direction changes, and the 99/99/99 footballer automatically chooses fast, efficient, protected real football techniques—including the new Ronaldo chop—without a skill button, while the physical ball and human body remain continuous and authoritative.

And above all:
It should feel like I am controlling an elite footballer with the ball, not selecting animations from a test harness.
