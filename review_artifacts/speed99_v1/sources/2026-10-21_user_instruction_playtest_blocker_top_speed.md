# Owner instruction — 21 Oct 2026 (pasted in the session, saved verbatim)

PLAYTEST BLOCKER — I CANNOT ACTUALLY REACH THE CANDIDATES' TOP SPRINT SPEED

Stop before selecting B or C.

I have now personally played the Speed-99 playground, and I actually like C quite a bit. However, I discovered that I cannot properly judge B versus C because during manual free play the player appears to cap at only about:
~19 km/h
(~5.3 m/s)

even though C's HUD reports an intended:
vmax = 10.35 m/s
= 37.3 km/h

Therefore do not interpret my current B/C preference as final yet.
FIRST TASK: FIND THE REAL MANUAL-PLAY SPEED CAP
Trace the complete path from:
joystick magnitude
+ WALK/JOG/RUN/SPRINT mode
+ SPRINT button / sprint lock
↓
requested movement speed
↓
acceleration model
↓
authoritative velocity

Determine why I cannot manually accelerate to the candidate's actual Sprint Speed 99 ceiling.

Audit for:
RUN cap
SPRINT cap
joystick magnitude scaling
sprint-button state
sprint-lock state
speed-tier cap
viewer/input adapter cap
old 8 m/s cap
old RUN-1 constants
steering cap
acceleration reset
test-page-only cap

Do not guess.

Instrument and identify the exact limiting term.
RUN AND SPRINT MUST BE DIFFERENT
The manual playground should expose the actual movement tiers clearly.

I want:
WALK
JOG
RUN
SPRINT

where SPRINT genuinely allows the selected candidate to accelerate toward its full:
Sprint Speed 99 vmax

in a straight sustained sprint.

For B and C that currently means:
10.35 m/s
37.3 km/h

Do not change the candidate's acceleration curve to make this happen.

Fix the input/playground/runtime path so I'm actually testing the model you already measured.
MAKE SPRINT EASY TO TEST
In manual play:
full joystick magnitude + SPRINT held

must request genuine maximum sprint.

And:
SPRINT LOCK

must let me keep that state without holding another control.

Make its active state visually unmistakable.
HUD — SHOW ME THE ACTUAL SPEED
The large HUD should continuously show:
CURRENT SPEED
9.82 m/s
35.4 km/h

REQUESTED SPEED
10.35 m/s

CANDIDATE VMAX
10.35 m/s
37.3 km/h

MOVEMENT MODE
SPRINT

SPRINT INPUT
ON

Do not merely show the theoretical candidate top speed.

I need to know what the authoritative player is actually doing right now.
ADD A SIMPLE TOP-SPEED TEST
Add a prominent:
TOP SPEED RUN

preset.

It should:
start from rest
hold perfectly straight full sprint
run long enough to reach vmax

and report:
5 m
10 m
20 m
30 m
40 m
60 m
80 m if necessary

plus:
peak authoritative speed
time to 90% vmax
time to 95% vmax
time to 99% vmax

I want to visually see B/C actually reach approximately:
37.3 km/h

before choosing between them.
REFERENCE RUNNER
Keep the CURRENT reference runner beside me.

This should make the difference visually obvious:
CURRENT
~8 m/s ceiling

versus

B/C
10.35 m/s ceiling

At full sprint the 99 player should visibly pull away.
DO NOT CHANGE B OR C YET
Preserve exactly:
B
C
A
CURRENT

No tuning.

I specifically want to replay B and C after the playground exposes their full speed.

My preliminary feedback is:
C feels surprisingly good and I may prefer it for Acceleration 99.

That is not final because I have not yet experienced the complete speed envelope.
VERIFY MANUAL = SCRIPTED
This is mandatory.

Once fixed, prove that:
manual straight full-sprint input

and:
scripted straight full-sprint preset

feed the same authoritative movement request.

They should produce the same:
acceleration curve
distance
speed
vmax

within deterministic numerical tolerance.

We must not have a benchmark claiming 37.3 km/h while the actual playable controller is only capable of ~19 km/h.
STOP AFTER FIXING THE PLAYTEST
Do not integrate with the ball yet.

Do not select B.

Do not select C.

Do not calibrate lower ratings.

Give me the corrected BALL OFF playground so I can actually experience:
CURRENT
A
B
C

across their complete acceleration and sprint-speed envelopes.

Then I will choose the 99 ceiling.
