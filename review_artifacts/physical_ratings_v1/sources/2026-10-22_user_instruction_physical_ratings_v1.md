# Owner instruction — 22 Oct 2026 ≈ 04:10 EEST (pasted in the session, saved verbatim)

PLAYER PHYSICAL RATINGS V1 — APPROVE CARRY-B, IMPLEMENT SPRINT/ACCELERATION RATINGS, DEFINE AGILITY METRIC, BUILD 80-RATED PLAYTEST
We now have owner decisions on several foundational movement systems.

This task should turn those decisions into the beginning of a coherent physical rating model.

Work in this order:
1. Approve Carry-B as the provisional D99 ball-on movement envelope.
2. Implement the approved Sprint Speed rating mapping.
3. Implement the provisional Acceleration rating mapping.
4. Build a measurable Agility rating metric/scaling model from A99-C.
5. Create an 80 Sprint Speed / 80 Acceleration / 80 Agility BALL-OFF character for owner playtest.

Do NOT calibrate Dribbling ratings yet.

Do NOT add more skill moves.

Do NOT freeze the full player model.
1. OWNER DECISION — CARRY-B APPROVED
I have reviewed the D99 ball-on movement-envelope candidates.

Select:
CARRY-B

as the provisional:
DRIBBLING 99 / BALL CONTROL 99

ball-carrying movement envelope.

Preserve its current implementation and measured behavior.

Current reference:
BALL OFF vmax:
38.0 km/h

Carry-B open sprint:
~34.8 km/h

Carry-B tight-control region:
~26.6 km/h

40 m:
~4.81 s

100 m:
~11.02 s

Use the actual implementation values rather than rounded report numbers where they differ.

Carry-B is provisional, not frozen.
IMPORTANT CARRY-B PRINCIPLE
This establishes an important rule:
Even Dribbling 99 cannot exploit 100% of a player's physical Sprint Speed and Acceleration while genuinely controlling a football.

The best possible dribbler still pays a real athletic cost for:
ball manipulation
touch organization
stride adaptation
technical-foot availability
immediate ball access

Future lower Dribbling ratings will retain less physical/technical freedom.

But do NOT implement that Dribbling scale now.
2. SPRINT SPEED RATING — OWNER-APPROVED MAPPING
Sprint Speed controls:
BALL-OFF sustainable maximum running/sprinting velocity.

It does NOT control:
acceleration
agility
dribbling
touch quality

Anchor:
Sprint Speed 99
= 38.0 km/h

Implement the following piecewise-linear rating mapping.
Ratings 90–99
Each rating point =:
0.3 km/h

Therefore:
99 = 38.0
98 = 37.7
97 = 37.4
96 = 37.1
95 = 36.8
94 = 36.5
93 = 36.2
92 = 35.9
91 = 35.6
90 = 35.3 km/h

Ratings 40–89
Each rating point =:
0.2 km/h

Therefore:
89 = 35.1
85 = 34.3
80 = 33.3
75 = 32.3
70 = 31.3
60 = 29.3
50 = 27.3
40 = 25.3 km/h

Ratings 1–39
Each rating point =:
0.1 km/h

Therefore:
39 = 25.2
30 = 24.3
20 = 23.3
10 = 22.3
1  = 21.4 km/h

Implement this exactly as a continuous piecewise mapping.

No discontinuity at:
39/40
89/90

SPRINT SPEED FORMULA
Equivalent implementation:
if rating >= 90:
    vmaxKmh = 35.3 + 0.3 * (rating - 90)

else if rating >= 40:
    vmaxKmh = 25.3 + 0.2 * (rating - 40)

else:
    vmaxKmh = 21.4 + 0.1 * (rating - 1)

Clamp input rating:
1–99

Use SI internally if preferred.
3. ACCELERATION RATING
Acceleration controls:
How quickly the player's velocity approaches the currently available movement speed.

It applies to:
standing start
walk → run
jog → sprint
run → sprint
post-cut reacceleration
post-braking acceleration
stop → sprint

It does NOT determine:
vmax

Sprint Speed owns vmax.
ACCELERATION 99 ANCHOR
Preserve:
Acceleration 99
= D38

exactly.

Current D38 reference approximately:
launch ≈ 11.1 m/s²
p ≈ 2.2

with S99:

5 m  ≈ 1.02 s
10 m ≈ 1.55 s
20 m ≈ 2.52 s
40 m ≈ 4.42 s

70% vmax ≈ 0.80 s
80% vmax ≈ 1.00 s
90% vmax ≈ 1.33 s
95% vmax ≈ 1.64 s
99% vmax ≈ 2.17 s

Again, preserve the actual D38 implementation rather than rounded report values.
PROVISIONAL ACCELERATION RATING SCALE
For this first implementation, use a normalized:
Acceleration Capability

scale derived from the same general three-band philosophy as Sprint Speed.

Anchor:
Acc99 = 100% D38 capability

Initial candidate mapping:
99 = 100.0%
95 = 94.0%
90 = 86.5%

80 = 76.5%
70 = 66.5%
60 = 56.5%
50 = 46.5%
40 = 36.5%

30 = 31.5%
20 = 26.5%
10 = 21.5%
1  ≈ 17.0%

This corresponds approximately to:
90–99:
1.5 percentage points per rating

40–89:
1.0 percentage point per rating

1–39:
0.5 percentage points per rating

But:

treat this as a provisional scaling hypothesis, not a final frozen curve.
DO NOT SIMPLY MULTIPLY D38 BY THE PERCENTAGE
This is important.

Acceleration is a curve, not one scalar.

Use the capability mapping to generate a coherent lower-rated acceleration profile.

Lower ratings may alter:
launch acceleration
mid-speed acceleration persistence
taper toward vmax

while preserving:
smooth acceleration
no velocity steps
no artificial input latency

I want:
Acc99
= explosive launch + strong build + late taper

Acc80
= good launch + clearly slower build

Acc50
= reasonable movement but much slower velocity acquisition

Acc20
= clearly poor acceleration without looking broken

NORMALIZED ACCELERATION DIAGNOSTICS
Do not judge Acceleration rating only through:
10 m time

because Sprint Speed changes that result.

Measure:
time to 25% available vmax
time to 50%
time to 70%
time to 80%
time to 90%
time to 95%

This gives us a rating-independent view of velocity acquisition.
ACCELERATION ATTRIBUTE INDEPENDENCE
Explicitly verify:
S99 / Acc50

eventually reaches:
38 km/h

but takes much longer.

And:
S50 / Acc99

rapidly approaches its lower:
27.3 km/h

Sprint Speed ceiling.

These should feel like clearly different athlete archetypes.
4. NOW BUILD AN AGILITY RATING METRIC
We have:
Sprint Speed rating
→ km/h

Acceleration rating
→ velocity-acquisition profile

I now want an equally clear:
AGILITY

metric/model.

Do NOT invent Agility as:
maximum yaw rate.

We already found that yaw ceiling alone does not explain useful football movement.
AGILITY CORE DEFINITION
Use:
Agility = how quickly and efficiently the player's physical movement can be redirected.

It should primarily govern:
1. time to establish useful travel on a new requested line
2. momentum/speed retained through redirection
3. ability to follow repeated changes of direction
4. severity/efficiency of the required support solution

It should NOT govern:
maximum sprint speed
acceleration after the turn
joystick input latency
ball skill
touch precision

AGILITY 99 ANCHOR
Preserve:
Agility 99
= A99-C

Current approximate C reference:
TURN    ESTABLISH     RETAIN

30°     0.075 s       99.6%
45°     0.120 s       98.5%
60°     0.180 s       96%
90°     0.275 s       84%
120°    0.375 s       64%
150°    0.445 s       30%
180°    0.420 s       0%

Use actual A99-C implementation values as authoritative.
AGILITY NEEDS A MEASURABLE RATING METRIC
Develop a normalized:
AGILITY CAPABILITY

that can drive the family of:
turn establishment
momentum retention
repeated-redirection response
support demand

curves.

I want something analogous in clarity to:
Sprint Speed → vmax
Acceleration → velocity acquisition

but appropriate for redirection.
DO NOT REDUCE AGILITY TO ONE ANGLE
A player's Agility rating must work across:
15°
30°
45°
60°
90°
120°
150°
180°

and:
repeated ±30°
repeated ±60°
rapid 90° changes
continuous circles

TURN DEMAND
Build an explicit concept of:
REDIRECTION DEMAND

based on factors including:
requested angle
current velocity
trajectory-change rate

A:
15° adjustment at 20 km/h

is fundamentally less demanding than:
90° at 38 km/h.

Agility determines how effectively the player satisfies that demand.
IMPORTANT — LOW-DEMAND MOVEMENT SHOULD REMAIN HUMAN
Lower Agility should NOT make:
10°
15°
gentle curved running

look like a truck turning.

Ratings should separate progressively as:
redirection demand increases.

Therefore:
A99 vs A50

may be fairly close during gentle steering,

but dramatically different during:
90°
120°
150°
repeated aggressive steering.

MOMENTUM RETENTION
Lower Agility should generally require:
more speed sacrifice

to establish the same requested line.

But never allow:
A99 at 180°

to magically retain full momentum.

A99-C's physical envelope remains the ceiling.
TURN ESTABLISHMENT
Lower Agility should also generally require:
more time
more braking/support steps

before useful movement is established on the new line.

Again:

no artificial input latency.

The joystick request is heard immediately.

The body simply takes longer to physically satisfy it.
REPEATED STEERING
Agility should strongly affect:
requested travel heading
vs
actual travel heading

under rapidly changing input.

Higher Agility:
follows the requested trajectory more closely.

Lower Agility:
physically lags behind it.

Do not implement this by delaying input samples.
BUILD 3 AGILITY SCALING CANDIDATES
Unlike Sprint Speed, we do not yet have an approved rating curve.

Therefore create:
AGILITY SCALE A
compressed

AGILITY SCALE B
balanced

AGILITY SCALE C
pronounced

All must preserve:
A99 = exact A99-C

but differ in how quickly capability degrades below 99.
PRIMARY AGILITY ANCHORS
I want playable/measured:
A99
A90
A80
A70
A60
A50
A40
A20
A1

for all three scaling candidates.
REPORT FOR EACH AGILITY RATING
At a fixed:
Sprint Speed 99
Acceleration 99
BALL OFF

measure:
new-line establishment time
minimum speed
speed retained when line established
heading error
support steps
time to stable locomotion

for:
30°
45°
60°
90°
120°
150°
180°

Also report:
repeated ±30°
repeated ±60°
fast circle
0→90→0→-90

AGILITY / ACCELERATION SEPARATION
Be careful when measuring cuts.

We need to distinguish:
speed retained because of Agility

from:
speed subsequently rebuilt because of Acceleration.

Record:
velocity at line establishment

before Acceleration has time to hide the difference.
AGILITY / SPRINT SPEED SEPARATION
Agility does not lower the player's ultimate vmax.

An:
A40 / S99

player can still eventually run:
38 km/h

in a straight line.

They are simply much less capable of redirecting that velocity.
AGILITY / DRIBBLING SEPARATION
This task is BALL OFF.

Later:
Dribbling

will determine how much of a player's physical Agility can be exploited while manipulating the ball.

Do not implement that yet.
5. BUILD THE FIRST 80-RATED PHYSICAL PLAYER
Once Sprint Speed and Acceleration mappings are implemented and the Agility scaling candidates exist, build:
PHYSICAL-80
with:
Sprint Speed = 80
Acceleration = 80
Agility = 80

For now:
BALL OFF

Do NOT set:
Dribbling = 80
Ball Control = 80

yet.

We are testing only the physical movement attributes.
PHYSICAL-80 EXPECTED SPRINT SPEED
From the approved mapping:
Sprint Speed 80
= 33.3 km/h
= 9.25 m/s

This must be exact.
PHYSICAL-80 ACCELERATION
Use the provisional:
Acceleration 80

profile derived from the rating mapping above.

Expose its normalized acceleration milestones clearly.
PHYSICAL-80 AGILITY
Because Agility scaling is not yet approved, allow me to play:
PHYSICAL-80 / AGILITY SCALE A
PHYSICAL-80 / AGILITY SCALE B
PHYSICAL-80 / AGILITY SCALE C

Everything else identical.

This lets me choose the Agility scale by experiencing an actual:
80 Sprint Speed
80 Acceleration
80 Agility

player rather than judging tables alone.
PLAYABLE COMPARISON
Give me easy switching between:
PHYSICAL-99

using:
S99
Acc99-D38
A99-C

and:
PHYSICAL-80-A
PHYSICAL-80-B
PHYSICAL-80-C

where A/B/C refer only to the Agility scaling candidate.
REFERENCE RUNNER
Keep a reference runner available so:
99 vs 80

straight-line separation is visually obvious.
REQUIRED OWNER TESTS
Make prominent:
standing sprint
long straight sprint
gentle curve
30°
45°
60°
90°
120°
150°
180°
repeated ±30°
repeated ±60°
fast circle
cut → accelerate
stop → accelerate

HUD
Show:
Sprint Speed rating
physical vmax

Acceleration rating
acceleration capability
current % vmax

Agility rating
selected Agility scale
redirection demand
momentum retained
new-line establishment time

current authoritative speed

Keep detailed diagnostics optional.
IMPORTANT — DON'T FORCE 80 TO LOOK “AVERAGE”
Do not tune:
80

based on a preconceived label such as:
good
average
elite.

Let the approved attribute mappings determine what 80 means.

Then I will decide whether the resulting athlete feels correctly rated.
PRESERVE CURRENT SYSTEMS
Do not modify:
Carry-B
CONTROLLED_BALL
B4/B5
skill moves
standing tackle
shoulder system

except where required to expose existing shared movement infrastructure.

This is primarily a:
BALL-OFF PHYSICAL ATTRIBUTE

experiment.
REPORT
Return:
Sprint Speed
exact implemented mapping
validation for all 1–99 values
continuity
anchor values

Acceleration
exact rating→profile model
normalized milestone table
S99/Acc50 vs S50/Acc99 proof

Agility
metric definition
redirection-demand model
A/B/C scaling formulas
anchor tables
angle tests
repeated-input tests

Physical-80
0–5/10/20/40 m
vmax
acceleration milestones
turn establishment
momentum retention
repeated-steering behavior

Integrity
determinism
feet/body issues
CPU
known limitations

And prominently:
PLAYABLE URL

DO NOT FREEZE YET
Owner decisions currently are:
Sprint Speed 99 = 38 km/h
Acceleration 99 = D38
Agility 99 = C
Carry-B = D99 provisional ball-on movement envelope
Sprint Speed rating mapping = approved for implementation

Still provisional:
Acceleration rating mapping
Agility rating mapping

I need to play the 80-rated physical character before approving those curves.
CENTRAL TARGET
Turn our 99 movement prototypes into actual attributes. Sprint Speed should have a transparent physical vmax scale, Acceleration should have a transparent velocity-acquisition scale, and Agility should gain an equally measurable physical-redirection scale. Then show me what an 80/80/80 athlete actually feels like.
