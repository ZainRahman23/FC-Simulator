# Owner instruction — 21 Oct 2026 ≈ 23:50 EEST (pasted in the session, saved verbatim)

BALL-ON PACE V1 — DEFINE THE D99 SPRINT SPEED + ACCELERATION COST
We have now provisionally established the physical movement ceiling:
Sprint Speed 99
= 38.0 km/h

Acceleration 99
= D38

Agility 99
= A99-C

These are BALL-OFF physical capabilities.

Do not change them in this task.

Owner playtesting of the integrated 99 player has exposed an important problem:
The player is too fast with the ball because Technical Control currently allows essentially the same Sprint Speed and Acceleration as BALL OFF.

That is not the intended final design.
OWNER DESIGN DECISION
Carrying/dribbling a football must impose a real movement cost.

Even:
Sprint Speed 99
Acceleration 99
Agility 99
Dribbling 99
Ball Control 99

should NOT be able to reproduce their full ball-off:
38 km/h
D38 acceleration

while genuinely controlling the ball.

The best dribblers in the world still cannot manipulate a football while moving exactly as fast and accelerating exactly as freely as they can sprint without one.

Dribbling 99 minimizes this cost. It does not eliminate it.
IMPORTANT FUTURE ATTRIBUTE DIRECTION
We have decided conceptually that:
DRIBBLING

will eventually influence how much of a player's:
Sprint Speed
Acceleration
Agility / movement freedom

they can exploit while manipulating the ball.

Higher Dribbling will eventually mean:
more athletic capability retained with ball
more technical freedom at speed
more difficult techniques feasible
faster technical adaptation/branching
better ability to create and exploit advantage against defenders

But:

DO NOT IMPLEMENT THE 1–99 DRIBBLING MODEL IN THIS TASK.

For now:
Dribbling = 99
Ball Control = 99

and establish the maximum ball-on movement envelope.

This D99 envelope will later become the upper bound from which lower Dribbling ratings scale downward.
CENTRAL QUESTION
Determine:
How much Sprint Speed 99 and Acceleration 99 should an elite Dribbling-99 player retain while genuinely controlling the ball?

We need a playable answer.
DO NOT USE ONE UNIVERSAL MULTIPLIER
I initially considered something like:
ball on
→ 0.8 × Sprint Speed
→ 0.8 × Acceleration

Do NOT simply implement that.

A universal modifier ignores the type of football action being performed.

Instead, ball-on athletic availability should depend on the current control demand.
BUILD A BALL-CARRYING MOVEMENT ENVELOPE
Conceptually:
BALL OFF
= full physical capability

BALL ON
= some fraction of physical capability available,
  depending on how demanding current ball manipulation is

At D99, the cost should be relatively small during ideal open sprint carrying, but it must still be clearly noticeable.

As technical demand increases, the cost should increase.
1. OPEN SPRINT CARRY
This is the fastest legitimate ball-on state.

Conditions approximately:
open grass
stable forward intent
no immediate defender pressure
longer controlled touches
ball pushed into running path
minimal directional correction

This should allow the player to exploit most—but not all—of:
Sprint Speed 99
Acceleration 99

The player should look exceptionally fast with the ball.

But side-by-side against their own BALL-OFF run:
BALL OFF must clearly pull away.

2. NORMAL RUNNING CARRY
When the player needs more immediate access to the ball:
shorter carry
more frequent ball availability
moderate steering

available Sprint Speed and Acceleration should be lower than OPEN SPRINT CARRY.
3. TIGHT CONTROL
When:
ball is kept very close
rapid direction changes are likely
pressure is nearby
input angular velocity is high

the player must sacrifice substantially more straight-line speed/acceleration.

This is football cost, not an attribute penalty.
4. TECHNICAL ACTIONS
During:
Ronaldo Chop
Cruyff
Croqueta
Drag-back
Hook
compact redirect
braking pivot
etc.

movement should be determined by the technique and:
A99-C

rather than an arbitrary sprint multiplier.

A technique can deliberately sacrifice speed to produce:
direction change
protection
deception
ball positioning

then D38 governs the subsequent reacceleration within the currently available ball-on envelope.
D99 STILL HAS A REAL COST
This is extremely important.

Do NOT implement:
if Dribbling == 99:
    ballOnModifier = 1.0

D99 means:
best possible ability to preserve athletic capability while dribbling.

It does NOT mean:
the ball has zero athletic cost.

Even D99 should have:
lower maximum sprint speed with ball
lower effective acceleration with ball
some additional cost as control demand increases

compared with BALL OFF.
BUILD 3 D99 ENVELOPE CANDIDATES
Do not immediately choose a single multiplier.

Create three ball-on D99 candidates while keeping:
S99 = 38 km/h
Acc99 = D38
A99 = C
D99
BC99

fixed.

For example:
D99-CARRY-A
light movement cost

D99-CARRY-B
medium movement cost

D99-CARRY-C
stronger movement cost

Exact values should be determined through testing.
PROVISIONAL OPEN-SPRINT REGION
I expect the correct D99 open-sprint ceiling may be somewhere approximately around:
88–95% of BALL-OFF vmax

which for:
38 km/h

corresponds roughly to:
33.4–36.1 km/h

This is NOT a mandated range.

Test around it.

I want enough separation that I can clearly feel:
running without ball

versus:
sprint-dribbling.

But D99 should still look exceptionally fast.
ACCELERATION MUST ALSO DIFFER
Do not only reduce vmax.

Compare:
BALL OFF D38

against:
BALL ON D99 acceleration

Carrying the ball requires:
touch organization
stride adaptation
ball access
technical-foot availability

so acceleration should also be measurably reduced.

Again:

D99 minimizes this reduction but does not remove it.
DO NOT JUST SCALE THE WHOLE D38 CURVE
Investigate whether the ball-on acceleration curve should have its own shape.

For example, ball carrying may particularly affect:
first few steps

because the player must establish a useful ball trajectory,

or:
middle acceleration

because stride length/touch spacing must continue coordinating.

Measure it.

Do not assume:
ballOnAcceleration = 0.9 × D38 at every velocity.

OPEN KNOCK-ON / SPRINT CARRY
Preserve the concept that a player can intentionally trade:
immediate ball proximity

for:
more running freedom.

A longer controlled knock-on can allow the player to access more of:
D38 acceleration
38 km/h physical capability

because they are temporarily running onto the ball rather than manipulating it every stride.

But:
farther ball
= more opponent access

once defenders are present.

Do not make knock-on an automatic speed boost.

It changes the control geometry.
CURRENT SPRINT-CARRY CADENCE
Preserve:
every-other-stride

as the provisional high-speed carry cadence.

The every-third-stride experiment created excessive delay when the player subsequently requested a direction change.

Do not revisit that unless the new envelope provides evidence that it should change.
CONTINUOUS TRANSITION BETWEEN CONTROL MODES
Avoid:
OPEN_SPRINT = 0.93
NORMAL = 0.84
TIGHT = 0.72

with obvious hard switches if possible.

Prefer a continuous control-demand measure based on factors such as:
requested direction change
input angular velocity
current ball separation
desired ball separation
upcoming technical action
opponent pressure later
next-contact urgency

that produces a continuously changing:
available movement envelope.

Named modes may still be useful for diagnostics.
DO NOT ADD DEFENDER PRESSURE YET
For this first experiment, use:
no defender

We are establishing the intrinsic athletic cost of controlling a football.

Later:
Dribbling rating
+ defender pressure

will influence what technical solutions remain available.

Do not mix those questions yet.
NO SELF-INFLICTED LOSS
This remains an architectural rule.

Do NOT use the ball-on pace penalty as a mechanism for:
random heavy touches
random loss
controller failure

And do NOT make future lower Dribbling ratings mean:
player loses ball while alone.

A lower Dribbling player should generally preserve possession by:
slowing down
using simpler techniques
needing more preparation
using larger/safer control actions

rather than spontaneously losing the football.
FUTURE DRIBBLING MODEL — RECORD THIS, DON'T IMPLEMENT IT YET
We have agreed on the following design direction:
Dribbling rating primarily determines how effectively a player can create and exploit advantages over defenders while manipulating the ball.

It will likely affect:
ball-on Sprint Speed retention
ball-on Acceleration retention
technical capability at speed
technique feasibility
preparation/branching speed
technical adaptation
deception
protection
ability to exploit small defensive windows
skill-move feasibility

It should NOT primarily affect:
random unforced possession loss.

At lower Dribbling:
technical options collapse sooner under speed/pressure
movement must become more conservative
techniques need cleaner setups
fewer tiny opportunities can be exploited

At D99:
enormous technical freedom remains.

Preserve this architecture for the next task.
FUTURE SKILL MOVES — RECORD THIS TOO
Dribbling will eventually influence:
what techniques are feasible
from which entry states
at what speeds
with how much preparation

Avoid simplistic:
D90 = skill unlocked.

Prefer:
higher D
= broader feasible entry envelope.

A lower-rated dribbler may execute a difficult technique from an ideal setup.

D99 can execute/adapt it from much more demanding states.

Do not implement the full system yet.
BALL CONTROL REMAINS SEPARATE
Record this distinction:
DRIBBLING
= ability to manipulate the ball to create/exploit football advantage under constraints

BALL CONTROL
= precision/security/quality of the intended ball interaction

Do not collapse them.
REQUIRED BALL-OFF VS BALL-ON COMPARISON
For:
BALL OFF
D99-CARRY-A
D99-CARRY-B
D99-CARRY-C

run:
standing → sprint
5 m
10 m
20 m
30 m
40 m
60 m
long top-speed run

Report:
peak speed
time to peak
5/10/20/30/40 m
time to 70/80/90/95% available vmax

CONTROL-DEMAND TESTS
Also test:
straight open sprint carry
gradual 15° steering
gradual 30° steering
sustained curve
20° sudden correction
45° cut
60° cut
90° cut
repeated ±30°
repeated ±60°
fast circle
stop/start
sprint → tight control
tight control → sprint

Measure:
available movement speed
available acceleration
ball separation
touch frequency
next useful touch latency

VISUAL COMPARISON
Give me a side-by-side/reference runner:
SAME PLAYER BALL OFF

against:
SAME PLAYER D99 BALL ON

The difference should be obvious in a sustained race.

The ball-on player should still look elite.
PLAYABLE PAGE
Build a clean owner playground with:
BALL OFF
CARRY-A
CARRY-B
CARRY-C

selectable instantly.

Default:
S99
Acc99-D38
A99-C
D99
BC99
CONTROLLED
BALL ON

Show:
physical vmax
current ball-on available vmax
current speed
physical acceleration profile
current ball-on acceleration availability
control-demand value
current carry type

in diagnostics.
DO NOT FIX THE REMAINING LEG FAILURES YET
We already know there are remaining:
extreme fast-circle
150–180° reversal
braking/support
SOLE_ROLL

integrity problems.

Do not spend this task fixing them unless your new movement-envelope implementation directly creates a regression that blocks the experiment.

Once I select the D99 ball-on envelope, we will fix locomotion/support integrity against the actual movement demands we intend to keep.
DO NOT ADD MORE SKILL MOVES
Preserve current:
CORE
EXPANDED
Croqueta
knock-on
existing named moves

Do not add:
elastico
stepovers
V-pull
etc.

yet.
CPU
Report the incremental cost of the ball-on movement-envelope calculation.

It should be lightweight.

Do not optimize the wider Technical Control candidate scorer in this task.
STOP FOR OWNER PLAYTEST
Do not choose the final D99 envelope yourself.

Give me:
A
B
C

and let me play them.

Then stop.

No rating scaling.

No freeze.
OWNER PRINCIPLES TO PRESERVE
1.
Sprint Speed 99 = 38 km/h is the player's physical BALL-OFF ceiling.

2.
Acceleration 99 = D38 is the player's physical BALL-OFF acceleration ceiling.

3.
Even Dribbling 99 cannot reproduce those full physical capabilities while genuinely controlling a football.

4.
Dribbling will eventually determine how much physical capability can be retained with the ball, among other technical advantages.

5.
Lower Dribbling should not primarily mean random unforced ball loss. It should mean less ability to preserve movement and technical freedom under difficult football constraints.

6.
Higher Dribbling should ultimately make players better at beating defenders—not merely better at avoiding random mistakes while alone.

TARGET
Find the maximum ball-carrying movement envelope for Dribbling 99: visibly slower and less explosive than the same player's 38 km/h / D38 ball-off sprint, but still exceptionally fast, responsive and technically free.

Once I approve that D99 envelope, the next task will formalize how Dribbling ratings below 99 scale movement retention and the ability to beat defenders.
