# Owner instruction — 21 Oct 2026 ≈ 20:20 EEST (pasted in the session, saved verbatim)

4-HOUR MISSION — LOCK THE 99 MOVEMENT REFERENCE, INTEGRATE DRIBBLING, THEN EXPAND ELITE TECHNICAL VOCABULARY
You have approximately four hours for a substantial autonomous implementation/validation mission.

Continue working and iterating without waiting for intermediate owner decisions unless a genuinely irreversible design choice is required.

Nothing is frozen.

The objective is to finish with the strongest playable 99-everything outfield movement/dribbling reference we have built so far.
OWNER DECISIONS
I have completed the SPEED-99 playtest.

Select:
SPRINT SPEED 99
= 38.0 km/h
= 10.56 m/s

ACCELERATION 99
= D38

AGILITY 99
= A99-C

D38 is selected over C38 and E38.

Treat these as the provisional 99 movement ceilings from this point forward.

Do not average them with the earlier candidates.

Do not recalibrate 1–98 yet.
D38 ACCELERATION REFERENCE
Preserve the selected D38 behavior approximately as currently implemented:
launch = 11.1 m/s²
p = 2.2

5 m  ≈ 1.02 s
10 m ≈ 1.55 s
20 m ≈ 2.52 s
40 m ≈ 4.42 s

70% vmax ≈ 0.80 s
80% vmax ≈ 1.00 s
90% vmax ≈ 1.33 s
95% vmax ≈ 1.64 s
99% vmax ≈ 2.17 s

Preserve the actual selected implementation as authoritative rather than retuning merely to hit rounded report numbers.
PHASE 1 — FIX THE HIGH-SPEED LEG MALFUNCTIONS
Before adding the ball or new dribbling moves:

fix the remaining leg/body failures at the new 38 km/h ceiling.

I can visually see occasional leg malfunctions at high speed.

Your own report already identifies:
180° reversal at 38 km/h

as a weak case with foot jumps depending on entry timing.

Do not assume that is the only failure.

Stress the selected:
S99 + Acc99-D38 + A99-C

body aggressively.
FIND THE CAUSE, DON'T HIDE IT
Instrument:
root velocity
requested trajectory
pelvis
support foot
swing foot
gait phase
committed landing
predicted landing
actual landing
support changes
foot velocity
knee/ankle continuity
plant pivots
foot slides
foot jumps
leg intersections

Determine whether failures come from:
landing target revision
support switching
stride length
cadence
braking transition
38 km/h → cut transition
swing-foot reach
pelvis/root mismatch
reversal planning
presentation interpolation

Fix systemic causes.
PRESERVE THE LESSON FROM ASTRA'S SUPPORT WORK
Do not return to:
replan whole leg every frame
→ IK repairs it afterward.

Preserve:
persistent support identity
continuous swing paths
landing commitment
trajectory-aware support planning

A late change of intent can:
shorten
retime
pivot
revise an uncommitted landing
choose replacement support

but should not teleport an already-committed leg.
38 KM/H REVERSAL
A 180° request from 38 km/h is an extreme stress test.

Do NOT make it look plausible by allowing:
instant 180° velocity rotation.

A99-C should impose its existing appropriate momentum loss/braking.

Then D38 rebuilds speed.

The feet should explain:
braking
plant/replacement
reversal
acceleration

coherently.

If necessary use:
braking steps
plant pivot
replacement step
crossover
shortened stride
controlled centimetres of plant adjustment

rather than breaking the skeleton.
REQUIRED BALL-OFF TORTURE
Run many entry phases through:
straight 38 km/h sprint
gentle curved sprint
sustained curved sprint
30°
45°
60°
90°
120°
150°
180°
repeated ±30°
repeated ±60°
90° left/right alternation
fast circle
sprint → stop
stop → sprint
cut → D38 acceleration

No visible normal-speed:
leg explosion
knee pop
foot teleport
impossible support swap
gross intersection
floating

should remain.

Fix this before Phase 2.
PHASE 2 — INTEGRATE THE SELECTED 99 PACE INTO CONTROLLED DRIBBLING
Once BALL OFF is robust, build:
CONTROLLED-99-PACE

from:
Sprint Speed 99 = 38 km/h
Acceleration 99 = D38
Agility 99 = C
Dribbling 99
Ball Control 99
CONTROLLED_BALL
persistent support architecture
B4
B5
existing named techniques

Preserve:
CONTROLLED-CURRENT-PACE

for direct A/B comparison.
DO NOT CAP MOVEMENT TO FIT DRIBBLING
Technical Control must adapt to:
38 km/h
D38 acceleration
C agility

not vice versa.

Do not solve integration problems by:
reducing vmax
weakening D38
weakening C
gating joystick input
slowing cuts
extending lockouts

SPRINT CARRY
At 38 km/h, open-space dribbling should NOT look like close-control tapping.

Build a genuine elite:
SPRINT_CARRY

behavior.

In open space:
push ball farther
accelerate through it
use fewer contacts
exploit stride length

while CONTROLLED_BALL still ensures the action has a legitimate continuation.

As directional demand rises:
long sprint carry
→ shorter carry
→ close carry
→ redirect/cut

naturally.
D38 MUST APPLY WITH THE BALL TOO
The 99 technical player should be able to exploit their physical acceleration.

Do not let:
ball-control scheduling

secretly turn D38 back into C38/current acceleration.

Measure:
without ball
vs
controlled straight sprint

and explain any legitimate difference.
ZERO SELF-INFLICTED LOSS PRINCIPLE
Preserve the CONTROLLED architecture's major success.

At:
S99 / Acc99 / A99 / D99 / BC99

ordinary legal joystick movement must not create controller-induced possession loss.

Higher pace will expose new edge cases.

Solve those with:
better controlled trajectories
better technical choices
recovery/gather
better support planning

not hidden possession flags or input suppression.

Opponents must still be able to legitimately win the real authoritative ball.
PHASE 3 — EXPAND THE DRIBBLING / SKILL-MOVE VOCABULARY
Only after:
99 movement is robust
+
CONTROLLED-99-PACE is working

expand the technical vocabulary following the principles we've established.

This is not “add FIFA skill moves for the sake of having skill moves.”

We want:
the most efficient football technique for the current physical situation.

PRESERVE THE EXISTING CORE
Keep and refine:
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

Do not replace the named techniques with generic redirects.

Do not force named techniques when a simpler action is better.
RESEARCH BEFORE EXPANDING
Briefly research real elite dribbling/change-of-direction technique.

Focus on functional football actions, including:
protecting ball while changing direction
inside/outside cuts
sole manipulation
stop-start
body feints
stepovers
scissors
La Croqueta-type lateral transfer
V-pull / pull-push
elastico / reverse elastico
Matthews-type inside/outside feint
heel-to-heel / knock-and-run actions
shielding turns
spin turns where genuinely useful

Distinguish:
ordinary elite football technique

from:
expressive/high-risk skill move.

We need both eventually, but ordinary efficient actions should dominate autonomous Technical Control.
DO NOT BUILD ANGLE BUCKETS
Never reduce the vocabulary to:
90° → Ronaldo Chop
120° → Cruyff
180° → Drag-back

That was rejected.

Candidate actions compete based on the actual state.

Score:
preparation time
contact feasibility
requested direction
retained momentum
outgoing ball position
next-ball accessibility
protection
opponent geometry
support-foot feasibility
exit speed
control return time

RONALDO CHOP
Preserve our researched definition.

It must genuinely:
plant
strike ball behind/across support leg
send ball underneath/across the body
use the body/legs to protect the ball
exit onto the new line

Do not regress it into:
outside-foot kick around the body.

At high speed it should remain a powerful solution when its geometry is appropriate.
PROTECTION / MAN-BALL GEOMETRY
Expand the principle we've also been exploring in standing tackle shielding.

Good dribbling technique should often create:
opponent
↓
player's body/hip/back
↓
ball

when pressure exists.

Protection should be a scoring consideration for candidate actions.

This does NOT mean invisible force fields or guaranteed possession.

It means:
body geometry matters.

BODY FEINTS
Begin supporting genuine feint actions where useful.

A feint should affect:
body orientation
weight shift
apparent movement intention

while retaining authoritative ball control.

Do not make feints teleport the root or ball.

For this phase, it is acceptable to build the technical/body action before we have a sophisticated defender-reaction model.
SKILL MOVES MUST CHAIN
B5's lesson remains critical.

Do not build:
skill animation begins
→ player locked
→ entire animation finishes
→ control returns.

Each action needs:
preparation
decisive phase/contact
early branch point
continuation

Once the decisive football action is complete and a feasible continuation exists:

return control quickly.
SKILL MOVE ENTRY SHOULD BE STATE-AWARE
Do not replay unnecessary setup.

If:
correct foot already available
ball already on useful side
body already loaded
support already appropriate

enter the move from the nearest compatible state.

This is how we avoid canned-animation sluggishness.
LATEST ANALOG INTENT
Before commitment:
latest joystick intent matters.

After the decisive contact/commitment:
preserve the committed physical action

but allow the continuation to respond quickly.

Avoid both:
rigid action lock

and:
impossible mid-contact rewriting.

PREFERRED FOOT
Preserve:
dominant-foot style
two-footed style

and our existing foot-selection principles.

Preferred foot should strongly influence:
technique choice
protection
contact quality

but should not force unnecessary waiting when the other foot is clearly superior.
QUICK FEET, NOT BUSY FEET
This remains an acceptance rule.

Adding more techniques must NOT increase:
redundant touches
constant corrections
frantic alternating feet

A 99 dribbler should often solve difficult movement with:
one excellent touch

rather than three mediocre ones.
MANUAL / EXPLICIT SKILL ACCESS
If useful, add a provisional review-only way to explicitly request specific techniques so each can be inspected.

But keep:
ordinary analog movement

capable of choosing appropriate efficient actions automatically.

Do not require explicit skill-button input merely to test the technical resolver.
EXPAND IN SMALL FAMILIES
Do NOT attempt to author 30 moves badly.

Add a small set of genuinely distinct functional families.

My preferred first expansion would be approximately:
1. SOLE / PULL-PUSH FAMILY
2. LATERAL TRANSFER / CROQUETA FAMILY
3. FEINT / STEPOVER FAMILY
4. ELASTICO-TYPE FAMILY
5. KNOCK-AND-RUN / SPEED-BEAT FAMILY

Research and choose the smallest useful authored basis.

Mirroring/procedural direction should handle variants where appropriate.
DO NOT GIVE ATTRIBUTES DIRECT BOOSTS FROM MOVES
A skill move does not mean:
+20 acceleration
+20 agility.

It changes:
ball trajectory
body trajectory
opponent-facing geometry
support arrangement

and then existing attributes determine execution.
KEEP BALL AUTHORITATIVE
Even with CONTROLLED_BALL:
simulation owns the ball trajectory.

Animation never owns it.

Skill animation must explain the authoritative action.

Opponent collision with the real ball can interrupt a skill at any legitimate moment.
TECHNIQUE VALIDATION
For every added technique, test:
left/right mirror
preferred/non-preferred foot
standing entry
jog entry
run entry
sprint entry where appropriate
opponent front
opponent side
no opponent
continuation
interruption

Do not force every technique to work at every speed.

Some moves should correctly be rejected when their geometry doesn't fit.
FOUR-HOUR PRIORITY ORDER
Spend the available time in this order:
PRIORITY 1
Fix D38/38-km/h locomotion malfunctions.

PRIORITY 2
Integrate S99 + Acc99-D38 + A99-C into CONTROLLED dribbling.

PRIORITY 3
Restore/maintain zero controller-induced loss under the faster movement.

PRIORITY 4
Polish sprint carry and cut → explode behavior.

PRIORITY 5
Expand the technical vocabulary.

PRIORITY 6
Add additional skill families only if the preceding layers remain robust.

If time runs short:

do fewer skill moves well.

Do not sacrifice the foundation to hit a move count.
LONG TORTURE TEST
Once the integrated 99 player is stable, run prolonged seeded analog torture again.

Include:
straight sprint
curves
rapid L/R
fast circle
random analog
repeated cuts
stop/start
technique-heavy sequences

Track:
controller exits
actual possession losses
recovery actions
maximum ball separation
touches/sec
redundant contacts
foot jumps
leg crossings
contact gaps
CPU

External opponent probes must still be able to break possession legitimately.
PLAYABLE MORNING/FINAL REVIEW
Build one primary page that opens directly into:
Sprint Speed 99 = 38 km/h
Acceleration 99 = D38
Agility 99 = C
Dribbling 99
Ball Control 99
CONTROLLED
FULL stack
BALL ON
joystick

I should immediately be able to play.

Keep comparison toggles for:
CURRENT PACE
99 PACE

and preferably:
CORE TECHNIQUES
EXPANDED TECHNIQUES

Same-input replay should remain available.
REPORT
Return with:

Movement
D38 integration
high-speed leg fixes
38 km/h body integrity
cut/reversal integrity

Dribbling
ball-on 99 pace
sprint carry
ball separation
losses
recovery
touch frequency

Technical vocabulary
existing moves retained
new moves/families added
when each wins
explicit rejected contexts

Responsiveness
contact timing
control-return timing
cut → explosion

Integrity
foot jumps
intersections
contact gaps
determinism
animation ON/OFF neutrality
opponent interruption

Performance
CPU
worst tick

And prominently:
PLAYABLE URL

DO NOT DO YET
Do NOT spend this mission calibrating:
Sprint Speed 1–98
Acceleration 1–98
Agility 1–98
Dribbling 1–98
Ball Control 1–98

We are still building the 99 reference player.

Do not freeze.
PROVISIONAL 99 REFERENCE
From now on, use:
Sprint Speed 99 = 38.0 km/h
Acceleration 99 = D38
Agility 99 = C
Dribbling 99 = current elite Technical Control target
Ball Control 99 = CONTROLLED architecture

CENTRAL FOUR-HOUR TARGET
Build the first coherent 99-everything movement/dribbling reference: explosive D38 acceleration, 38 km/h sprinting, C agility, secure physical ball control, coherent legs at the new speed, and a richer elite technical vocabulary that chooses football moves because they are useful—not because an angle bucket says to play a skill animation.

The final player should feel:

explosive, silky, decisive and technically exceptional.

Fix the foundation first. Then expand it.
