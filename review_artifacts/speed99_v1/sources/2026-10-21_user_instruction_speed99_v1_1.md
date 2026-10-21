# Owner instruction — 21 Oct 2026 (pasted in the session, saved verbatim)

SPEED-99-V1.1 — SET SPRINT SPEED 99 TO 38 KM/H AND REFINE ACCELERATION 99
I have now properly played the full-speed candidates.
OWNER DECISION — SPRINT SPEED
Set the provisional:
SPRINT SPEED 99
= 38.0 km/h
= 10.555... m/s

Use 10.56 m/s internally if appropriate, while reporting 38.0 km/h.

This is now the target ceiling I want for Sprint Speed 99.

Do not calibrate Sprint Speed 1–98 yet.
ACCELERATION IS NOT SELECTED YET
I prefer the general feel of Candidate C over A/B, but after properly experiencing the full speed I still think C's acceleration feels a little too slow for Acceleration 99.

Current C:
10 m       1.68 s
40 m       4.64 s
90% vmax   1.77 s
95% vmax   2.26 s
99% vmax   2.85 s

Do NOT simply declare C final.

Instead use C as the starting point and develop the Acceleration-99 ceiling separately.
IMPORTANT — ALL NEW CANDIDATES HAVE THE SAME TOP SPEED
Every new Acceleration candidate must use:
vmax = 38.0 km/h

Therefore I am judging only:
acceleration

rather than accidentally conflating acceleration with Sprint Speed.
BUILD THREE ACCELERATION-99 CANDIDATES
Keep:
C38

as the existing C acceleration concept, adjusted only for the new 38 km/h vmax.

Then create approximately:
C38
= current C-style acceleration

D38
= more explosive Acceleration-99 candidate

E38
= upper gameplay-responsive Acceleration-99 candidate

Names are provisional.

Do not choose the values arbitrarily.

Shape smooth acceleration curves and show me the resulting measurements.
WHAT I WANT ACCELERATION 99 TO FEEL LIKE
From a standing start:
immediate explosive response, powerful first few steps, rapidly opening stride, then progressively diminishing acceleration as the player approaches 38 km/h.

It should NOT feel like:
press sprint
→ wait
→ eventually become fast

Nor should it feel like:
press sprint
→ velocity teleports to 30 km/h

There must still be a visible acceleration phase.
PAY PARTICULAR ATTENTION TO THE MIDDLE OF THE CURVE
The current C first response is good.

What may still feel slow is the transition through:
~40%
→ 60%
→ 80%
→ 90%

of top speed.

Investigate whether Acceleration 99 needs substantially more acceleration through these middle speeds rather than simply increasing the very first-step impulse.

I want:
explosive launch
+
aggressive continued build
+
smooth taper approaching vmax

REPORT MORE OF THE CURVE
For every candidate report:
0–5 m
0–10 m
0–20 m
0–30 m
0–40 m

plus:
time to 25% vmax
time to 50% vmax
time to 70% vmax
time to 80% vmax
time to 90% vmax
time to 95% vmax
time to 99% vmax

and:
speed at 0.25 s
speed at 0.5 s
speed at 0.75 s
speed at 1.0 s
speed at 1.5 s
speed at 2.0 s

This should make it obvious where C currently feels conservative.
DON'T OVER-OPTIMIZE 99% VMAX
Reaching literal:
99% of 38 km/h

extremely quickly is not the main goal.

A player can already feel essentially at full sprint while the final few percent build gradually.

Prioritize:
5 m
10 m
20 m
70–90% vmax

and subjective explosiveness.

The final:
95 → 100%

can taper naturally.
POST-CUT ACCELERATION MUST USE THE SAME ATTRIBUTE
For C38/D38/E38 also test:
45° cut → accelerate
60° cut → accelerate
90° cut → accelerate
120° cut → accelerate
180° → accelerate

Do NOT introduce a special:
post-cut acceleration bonus.

The same Acceleration-99 capability should govern rebuilding velocity after A99-C has imposed the appropriate momentum loss.

This is critical to the eventual:
cut → explode away

feeling.
PRESERVE THE TWO MOVEMENT FIXES
Keep:
smooth steering can continue accelerating

and:
A99-C redirection demand scales appropriately above 8 m/s.

Do not regress these.
BODY
Make sure increased acceleration is actually visible through:
forward lean
first-step power
stride development
arm drive
transition toward upright sprinting

But don't rebuild RUN unnecessarily.

No:
skating
foot sliding
cadence explosion
animation playback-speed hack

PLAYGROUND
Update the current BALL-OFF page so I can directly switch:
CURRENT
C38
D38
E38

Keep the reference runner.

Make:
TOP SPEED RUN

easy to use.

Also add a short:
EXPLOSION TEST

that runs only the first 10–15 m with a camera close enough that I can judge the first steps and acceleration visually.

Same-input switching must work.
DO NOT ADD THE BALL YET
I want to choose:
Sprint Speed 99 = 38 km/h

and:
Acceleration 99 = ?

independently first.

Only after I select the acceleration candidate should we integrate:
S99
Acc99
A99-C
D99
BC99
CONTROLLED_BALL

DO NOT CALIBRATE LOWER RATINGS
Still no:
Sprint Speed 1–98
Acceleration 1–98

We are defining the ceiling first.

Nothing frozen.
OWNER DECISIONS
Sprint Speed 99:
38.0 km/h

Agility 99:
C

Acceleration 99:
NOT YET SELECTED

TARGET
38 km/h is the maximum speed. Acceleration 99 should make getting into dangerous sprinting speed feel explosively fast, while retaining a visible, grounded acceleration phase.
