# Owner instruction — 21 Oct 2026 ≈ 16:35 EEST (pasted in the session, saved verbatim)

Owner verdict on TC-CONTROLLED-1 (in the brief): "Much, much better. Minor losses under extreme stress remain, but they are currently acceptable."

---

SPEED-99-V1 — DEFINE THE 99 SPRINT SPEED + 99 ACCELERATION CEILING
We now have a substantially improved Technical Control foundation.

Owner feedback on TC-CONTROLLED-1:
Much, much better. Minor losses under extreme stress remain, but they are currently acceptable.

Do NOT continue tuning dribbling right now.

I want to establish another foundational player capability independently:
SPRINT SPEED 99 + ACCELERATION 99
The current character feels like a good dribbler, but it still does not feel like a 99-everything footballer.

I believe Sprint Speed and Acceleration are now part of that limitation.

We followed the correct process for Agility:
establish what A99 should actually be
→ approve the ceiling
→ make locomotion explain it
→ integrate it with Technical Control

Do the same thing now for:
Sprint Speed 99
Acceleration 99

1. ISOLATE SPEED FROM DRIBBLING FIRST
Start:
BALL OFF

Do NOT initially modify:
CONTROLLED_BALL
B4
B5
Ball Control
Dribbling
named techniques
technical contacts

Preserve the current approved/provisional:
A99-C Agility movement model
persistent support architecture
grounded straight RUN presentation
direction-change locomotion

We want to answer:
What should an elite 99 Sprint Speed / 99 Acceleration footballer actually be capable of?

2. RESEARCH BEFORE CALIBRATION
Do a focused research pass before selecting numbers.

Use credible sources for elite football sprint performance, including where available:
match sprint data
tracking data
acceleration profiles
5 m / 10 m / 20 m / 30 m times
maximum match speeds
elite football biomechanics
sprint acceleration curves

Distinguish:
measured football data
track-sprint data
inference
gameplay design choice

We are NOT trying to reproduce an Olympic sprinter.

We want:
the exceptional upper ceiling of football acceleration and sprint speed.

3. DO NOT LET CURRENT CAPS DEFINE 99
Audit the current movement implementation for:
top-speed cap
acceleration cap
acceleration curve
launch acceleration
velocity smoothing
speed-tier transitions
stride-frequency limits
stride-length limits
locomotion blend delays
turning-speed penalties
re-acceleration after cuts
braking/relaunch rules

Identify which are:
deliberate player capability

versus:
historical implementation constraint.

Do not conclude:
“99 is X because the current engine tops out at X.”

Define the capability first.
4. SPRINT SPEED AND ACCELERATION ARE SEPARATE
Keep the responsibilities clean.
Sprint Speed
Primarily determines:
sustainable maximum running/sprinting velocity

once the player has had sufficient distance/time to accelerate.
Acceleration
Primarily determines:
how quickly the player approaches the speed appropriate to the current movement request.

Especially:
standing start
jog → sprint
run → sprint
post-cut acceleration
post-braking acceleration
recovery toward top speed

Do not collapse them into one pace scalar.
5. DEFINE AN ACCELERATION CURVE, NOT ONE CONSTANT
Do not model A99 acceleration as simply:
velocity += constantAcceleration * dt

unless research genuinely supports that approximation.

Football sprint acceleration should plausibly be strongest earlier and diminish as velocity approaches maximum speed.

Investigate a smooth curve such as:
acceleration = f(currentSpeed / maxSpeed)

with:
very strong initial acceleration
strong middle acceleration
progressively diminishing acceleration near vmax

The exact function should be researched/tested.

Avoid arbitrary discontinuous speed tiers if a smooth model works better.
6. 99 ACCELERATION SHOULD FEEL EXPLOSIVE
A99 should have a visibly exceptional:
first step
first 2–3 steps
0–5 m
0–10 m

capability.

When I press full sprint from rest, I should immediately feel:
this player explodes into space.

Do not create artificial input latency to make the animation easier.

The body should begin responding immediately.
7. BUT DO NOT TELEPORT VELOCITY
99 Acceleration does NOT mean:
0 → vmax instantly.

Preserve:
visible acceleration
meaningful first steps
increasing stride
body lean
transition into upright sprinting

It should feel explosive because the acceleration curve is exceptional, not because velocity teleports.
8. BUILD THE BODY TO EXPLAIN IT
Once the authoritative 99 acceleration/speed target is selected, make the body convincingly explain it.

For acceleration:
forward lean
powerful first steps
shorter/faster initial contacts
increasing stride length
increasing flight
transition toward upright sprint

For maximum speed:
stable sprint posture
appropriate stride length
appropriate cadence
coherent arm drive
no skating
no floating
no overstriding

We do not need perfect sprint biomechanics.

We need:
fast
athletic
grounded
believable

9. PRESERVE GOOD RUN
Do not repeat the Astra straight-running regression.

Our ordinary RUN presentation is currently good.

Speed-99 work should extend it into:
acceleration
high-speed sprint

rather than globally replacing it.

At ordinary run speeds, the player should still look like the existing good RUN.
10. SPEED MUST WORK WITH A99-C
This is crucial.

The final player will be:
Acceleration 99
Sprint Speed 99
Agility 99-C

Therefore test the combination BALL OFF.

Higher top speed changes the difficulty of:
curved sprinting
45° cuts
60° cuts
90° cuts
braking
reversals
re-acceleration
support placement

Do NOT weaken A99-C just because S99 makes those movements harder to animate.

Instead determine how the approved capability models interact.
11. AGILITY SHOULD NOT MEAN FULL SPEED THROUGH EVERYTHING
Preserve the conceptual separation.

A99-C determines exceptional redirection capability.

It does NOT mean:
every 90°/120°/180° turn retains vmax.

C already defines meaningful momentum loss by angle.

Preserve that logic.

Speed-99 should determine what velocity is available before the turn and what top speed can eventually be regained.

Acceleration-99 should determine how aggressively the player can recover speed afterward.
12. RE-ACCELERATION AFTER CUTS IS A PRIMARY TEST
This is likely important to the missing “99 everything” feel.

Test:
sprint
→ 45° cut
→ accelerate

sprint
→ 90° cut
→ accelerate

sprint
→ 120° cut
→ accelerate

sprint
→ 180° reversal
→ accelerate

Measure:
entry speed
minimum speed
time to establish new line
speed at new-line establishment
time back to 70%
time back to 90%
time back to 95%

A99 acceleration should make the elite player feel extremely dangerous coming out of a cut, not merely from a standing start.
13. BUILD MULTIPLE 99 CANDIDATES IF NECESSARY
Do not force one answer prematurely.

If the research leaves meaningful gameplay latitude, create perhaps:
S99/A99 candidate A
S99/A99 candidate B
S99/A99 candidate C

For example:
A = conservative elite-realistic
B = exceptional football ceiling
C = highly responsive gameplay ceiling

Names are illustrative.

Let me play them.

As with Agility, owner feel decides the final ceiling.
14. DO NOT CALIBRATE 1–98 YET
This task is:
99 Sprint Speed
99 Acceleration

only.

Do NOT spend substantial time defining:
90
80
70
50
1

yet.

First establish the ceiling we actually like.

Then we can design the curves downward.
15. REQUIRED BALL-OFF TEST MATRIX
At minimum:
standing → sprint
walk → sprint
jog → sprint
run → sprint

over:
5 m
10 m
20 m
30 m
40 m

Measure:
time
speed
acceleration
distance
vmax reached

Also:
sprint → release
sprint → stop
sprint → jog
sprint → 45° cut
sprint → 90° cut
sprint → 120° cut
sprint → 180°
repeated sprint/cut/reaccelerate
long straight sprint

16. SPEED BUILD-UP MUST BE SMOOTH
Watch for:
velocity steps
sudden speed tiers
root pops
cadence jumps
stride-length jumps
foot sliding
floating
pelvis discontinuities

The acceleration curve should be continuous.

The body should transition continuously with it.
17. TOP SPEED MUST LOOK FAST
This sounds obvious, but it's important.

The eventual 99 Sprint Speed player should not merely measure faster.

At gameplay speed, I should visibly perceive:
rapid ground coverage
long powerful sprinting
appropriate stride rhythm
separation from slower reference players

Build side-by-side/reference runs if useful.
18. DO NOT USE ANIMATION SPEED AS THE ATTRIBUTE
Avoid:
S99 = play RUN animation at 1.4x.

Authoritative player velocity is the capability.

Presentation should adapt to that velocity.

Cadence/stride adjustments may explain it, but animation playback speed does not define Sprint Speed.
19. HEIGHT/WEIGHT
Do not automatically make height or weight reduce:
Sprint Speed
Acceleration
Agility

Those are explicit player attributes in our model.

Height and weight remain contextual physical metadata.

If the current movement implementation contains hidden body-size pace penalties, identify them.

Do not silently preserve them.
20. STAMINA IS OUT OF SCOPE
Assume fresh/full energy.

Do not introduce stamina/fatigue calibration in this task.

We already have a separate fatigue model direction.

This task establishes the fresh A99/S99 ceiling.
21. BALL OFF FIRST — STOP FOR INTERNAL VALIDATION
Do not immediately integrate with CONTROLLED dribbling.

First get:
S99 + Acc99 + A99-C
BALL OFF

feeling and looking excellent.

Verify:
straight sprint
acceleration
braking
cutting
re-acceleration
feet
body
CPU
determinism

22. THEN BUILD A SEPARATE BALL-ON INTEGRATION
Once the speed/acceleration ceiling is coherent, integrate it with:
TC-CONTROLLED-1

as a separate comparison.

Do not overwrite the current good CONTROLLED build.

Build:
CONTROLLED-CURRENT-PACE

versus:
CONTROLLED-99-PACE

with otherwise identical:
BC99
D99
A99-C
B4
B5
support architecture
CONTROLLED_BALL

23. EXPECT DRIBBLING TO NEED ADAPTATION
Higher acceleration and sprint speed will alter:
ball separation
contact timing
sprint carry distance
cut timing
support availability
controlled trajectory
technique feasibility

Do not assume the current dribbling timings can simply run unchanged.

But:

do not weaken the approved S99/Acc99 player to make current dribbling fit.

Instead, once the movement ceiling is approved, Technical Control should adapt to it.
24. SPRINT DRIBBLING SHOULD FEEL DIFFERENT FROM CLOSE CONTROL
When eventually integrated:
straight S99 sprint with open space

can use substantially longer touches so the player can exploit their speed.

But:
rapid steering
sharp cuts
pressure

should naturally tighten CONTROLLED_BALL again.

Do not require tiny close-control touches at maximum straight-line sprint speed.
25. ZERO CONTROLLER-FAILURE PRINCIPLE REMAINS
When eventually integrated at:
S99
Acc99
A99-C
D99
BC99

the faster player should not begin losing the ball simply because Technical Control cannot keep up.

Preserve the new principle:
player capability drives the required technical solution; controller limitations do not secretly cap player capability.

26. CPU
Benchmark:
current movement
vs
S99/Acc99

including:
movement
support planning
body
collision

and later:
CONTROLLED-CURRENT-PACE
vs
CONTROLLED-99-PACE

Do not optimize prematurely, but report meaningful regressions.
27. PLAYABLE REVIEW
Give me a clean BALL-OFF playground first.

I want:
joystick
sprint
walk/jog/run

and easy switching between:
CURRENT
S99/ACC99 candidate A
candidate B
candidate C

if multiple candidates are warranted.

Include preset tests:
0–5 m
0–10 m
0–20 m
0–30 m
long sprint
45° cut + accelerate
90° cut + accelerate
120° cut + accelerate
180° + accelerate

Normal-speed owner play is the primary acceptance test.
28. REPORT
Return:
research findings
current movement audit
current top speed
current acceleration profile
proposed S99 top speed
proposed Acc99 curve
candidate differences
distance/time tables
post-cut recovery tables
visual/body integrity
CPU
known compromises
playable URL

Clearly distinguish:
researched measurement
inference
gameplay design choice

29. DO NOT FREEZE
Everything remains provisional.

No:
lower-rating calibration
final attribute curves
production integration
freeze

until I play it.
CENTRAL TARGET
We already have a much better:
BC99 / D99 / A99-C

footballer.

Now I want to discover what:
SPRINT SPEED 99
+
ACCELERATION 99

should feel like.

The result should make me think:
This is an explosively quick elite footballer. The first steps are dangerous, open-field speed is exceptional, and after a cut he can explode away again.

Not:
The run animation is simply playing faster.

And once we approve that ceiling:
Integrate it back into CONTROLLED dribbling without sacrificing the silky control we've just gained.
