# User instruction, 2026-10-17 (verbatim): DRIBBLE-1.1 — soft-touch follow-through + cut reliability + resolver performance

- Pasted by the owner into the Claude Code session at 2026-10-17 01:26 EEST (2026-10-16 22:26 UTC), after the DRIBBLE-1 stop for owner review (7fe57fd3).
- Saved under the standing rule (every owner instruction verbatim). The block below is reproduced exactly as received.

---

Send Claude this. I’d keep DRIBBLE-1’s successful architecture frozen and make DRIBBLE-1.1 a focused cut-control fix, with the CPU problem addressed at the same time.
DRIBBLE-1.1 — SOFT-TOUCH FOLLOW-THROUGH + CUT RELIABILITY + RESOLVER PERFORMANCE
DRIBBLE-1 has established the architecture. Proceed with the next shipping step you identified.
Current DRIBBLE-1 commit: 7fe57fd3.
The important conclusions are approved:
- TURN-1.2 remains frozen.
- resolved touch architecture wins;
- no ball tether;
- ball is physically free between touches;
- exactly one authoritative impulse per deliberate touch;
- straight JOG/RUN dribbling works;
- FAST straight dribbling is promising;
- physical interception works;
- control can genuinely be lost;
- attributes already produce differentiation;
- gentle curves work.
Do not redesign those systems.
DRIBBLE-1.1 has three priorities:
1. Fix the structural post-contact foot problem that prevents soft redirecting touches during cuts.
2. Make 45–60° cuts robust and 90° cuts materially reliable.
3. Remove the resolver's current unacceptable CPU cost without changing the football result.
Do not work on 135°/180° yet except for regression/diagnostic purposes.
1. PRIMARY FAILURE TO FIX
Your DRIBBLE-1 diagnosis is accepted:
After an early-stride touch, the touching foot still has to catch up to TURN-1.2's unchanged footfall. It therefore continues moving rapidly through/near the ball's new path. A soft redirecting touch often cannot clear the foot, so the resolver is forced toward a hard 9–10 m/s push.

This creates:
- failed cuts;
- ball continuing straight while body turns;
- excessively hard cut touches;
- delayed cut initiation;
- second/accidental contacts;
- weak inside/outside/laces touch vocabulary.
Fix the foot after contact rather than simply hitting the ball harder.
2. TURN-1.2 REMAINS FROZEN
Hard requirement.
Do not change:
- TURN-1.2 plant locations;
- TURN-1.2 footfall destinations;
- locomotion resolver;
- turn thresholds;
- braking;
- shuffle;
- pivot;
- player root trajectory;
- acceleration behavior.
DRIBBLE-1.1 may modify the free-leg trajectory between deliberate ball contact and the already-authoritative future footfall.
The foot must ultimately rejoin TURN-1.2.
3. BUILD CONTACT-AWARE FREE-LEG FOLLOW-THROUGH
After a deliberate touch, the touching leg should understand that the ball has changed trajectory.
Broad sequence:
approach
→ authoritative contact
→ resolved ball launch
→ touching foot yields/slows relative to its pre-contact swing
→ foot clears around / over / away from the ball's new path
→ leg smoothly rejoins TURN-1.2's existing swing/landing
→ original footfall occurs unchanged.
This is the core DRIBBLE-1.1 feature.
4. DO NOT MAKE THIS A CANNED ANIMATION
The follow-through should be generated from:
- contacting foot;
- contact region;
- ball post-contact velocity;
- ball post-contact position;
- remaining swing time;
- required TURN-1.2 landing;
- leg reach/joint constraints.
Do not simply play:
SOFT_TOUCH_FOLLOWTHROUGH.
The free leg should adapt to the actual touch.
5. PRESERVE THREE IMPORTANT EVENTS
For every adjusted swing preserve:
A. lift-off
from TURN-1.2.
B. authoritative ball contact
from DRIBBLE.
C. landing/plant
from TURN-1.2.
The adjustable region is primarily:
contact → landing.

Do not move the authoritative plant merely to make the touch easier.
6. THE FOOT SHOULD YIELD AFTER A SOFT TOUCH
A soft football touch should not look like a full kick follow-through.
After contact, allow the foot/leg to:
- reduce forward swing velocity;
- flex;
- lift;
- move laterally;
- arc around the ball;
- shorten its follow-through;
as required to avoid immediately contacting the ball again.
Think:
touch and get the foot out of the ball's way.

7. DO NOT FREEZE THE FOOT
The solution must NOT be:
contact → foot suddenly stops in world space.
Preserve continuous athletic movement.
No:
- pose lock;
- foot hovering;
- abrupt velocity discontinuity;
- leg snapping;
- planted-looking swing foot.
The foot should visibly continue its stride, just with an altered follow-through.
8. CONTACT REGION SHOULD AFFECT CLEARANCE
DRIBBLE-1 currently overuses the same toe push.
Use the existing useful regions:
INSIDE
For lateral/inward redirection.
After contact, the leg may need to lift/continue across differently so the inside touch can remain soft.
OUTSIDE
For outward redirection.
Clearance geometry should reflect the ball moving away from the outside of the boot.
LACES / FRONT
For forward pushes and stronger touches.
Less post-contact intervention may be required when ball and foot naturally separate.
Do not force artificial equality between contact families.
9. FIX THE “EVERY TOUCH IS A TOE PUSH” LOOK
Current DRIBBLE-1 visual defect:
almost every ordinary touch reads as the same toe push.

Once soft follow-through makes other contacts feasible, allow the resolver to select:
- inside;
- outside;
- laces/front
based on actual geometry and desired ball direction.
Straight dribbling does not need constant fancy footwork, but it should not look like repeated identical toe pokes.
10. DO NOT FORCE VARIETY
Do not implement:
if lastTouch == LACES => choose INSIDE.
Contact region must be selected because it is appropriate.
Repetition is fine when football geometry calls for it.
The goal is to remove the structural bias that currently makes softer alternatives impossible.
11. HERO CASE — RUN 60° CUT
Solve this first.
Current best case takes the ball through a 60° cut, but the first useful cut touch arrives approximately 0.88 s after the request, and reliability is only around 5/8.
Desired sequence:
running dribble
→ input requests 60°
→ player/next feasible foot responds
→ soft redirecting touch
→ foot yields/clears after contact
→ TURN-1.2 cut occurs
→ ball travels into useful new path
→ player accelerates after it
→ next touch.
The first touch should not need to blast the ball at 9–10 m/s merely to escape the contacting foot.
12. 60° SUCCESS TARGET
Your own proposed target is approved:
at least 7/8 successful taken-with-the-ball outcomes at 45–60°.
Use the existing turn taken with the ball measure.
Do not inflate success by allowing the player to ignore the requested cut and continue straight.
13. SECOND HERO CASE — RUN 90° CUT
Current 90° reliability is approximately 1–2 / 8.
Current best case:
- first touch redirects about 62°;
- next touch reaches ~85°.
That's conceptually fine.
A 90° change does NOT necessarily require the ball to change direction by 90° in one contact.
It may legitimately be:
first touch begins taking ball across
→ plant/cut
→ second touch finishes taking ball into new lane.
Preserve that possibility.
14. 90° SUCCESS TARGET
Aim for at least:
5/8 successful taken-with-the-ball outcomes at 90°.
More is welcome if achieved naturally.
Do not chase 8/8 by:
- tethering;
- giant touches;
- slowing the player unrealistically;
- moving TURN-1.2 plants;
- teleporting the ball.
15. CUT TOUCH STRENGTH
Measure the current failed 9–10 m/s pushes.
After the follow-through fix, search for substantially softer redirecting touches that still clear the leg.
Compare:
- touch launch speed;
- lateral component;
- separation after 50/100/200 ms;
- distance to touching foot;
- whether a second contact occurs.
We want:
enough separation to be physical
but not:
kick the ball away because the animation cannot cope.
16. SECOND-CONTACT DETECTION
Instrument deliberate touches for:
- intended authoritative contact;
- any subsequent contact by the same foot within 250 ms;
- any subsequent contact by the other foot;
- time/distance from the ball.
A deliberate soft touch should normally produce exactly one intentional contact before the next genuine dribble opportunity.
17. FOLLOW-THROUGH CLEARANCE
Measure minimum ball-to-boot clearance after contact.
Particularly inspect:
+25 / +50 / +100 / +150 / +200 ms.
The foot should clear the physical ball without visibly making an absurd detour.
18. BALL REMAINS PHYSICAL
Hard requirement.
Do NOT modify the ball path to avoid the foot.
Modify the free leg.
After the authoritative touch:
BALL-PHYS remains in control.
If the ball unexpectedly hits:
- defender;
- turf;
- other player;
that physical result wins.
19. DO NOT DISABLE ALL BOOT COLLISIONS
Do not solve second contacts by making the player's feet permanently non-collidable with the ball.
Deliberate-contact suppression, if needed for the authoritative single-impulse handoff, must remain narrowly scoped.
Genuine later physical contacts must still be possible.
20. STRAIGHT DRIBBLING IS A REGRESSION BASELINE
Current strong result:
- JOG straight: PASS;
- RUN straight: PASS;
- FAST ~7.8 m/s survives all 8 current runs;
- resolved architecture ~99% straight control in the comparison.
Preserve this.
Do not make straight dribbling worse to solve cuts.
21. SPRINT DRIBBLING
Current sprint behavior:
- approximately 2.9 m mean separation;
- ball can genuinely be lost;
- one test reached ~28.3 m after loss.
That basic philosophy is approved.
Sprint control should not be guaranteed.
Do not tighten sprint dribbling into a tether merely because cut work changes the resolver.
22. FOOT PREFERENCE
Current right-footed player uses the right foot only about 31–59% of touches.
This is secondary to cut reliability, but improve it if possible without forcing impossible contacts.
Preferred foot should act as a utility bias.
When left/right opportunities are similarly viable:
prefer the player's preferred foot.
When geometry clearly favors the other foot:
use the other foot.
Do not force preferred-foot usage through bad animation.
23. CPU PROBLEM MUST BE FIXED IN THIS PASS
Current reported cost:
~497 ms per simulated second for one dribbler
with most cost coming from resolver lookahead.
This is not acceptable for match-scale development.
Optimize it now while working on the same planning system.
24. DO NOT SEARCH THE FUTURE FROM SCRATCH EVERY STEP
TURN-1.2 already exposes predictable locomotion/foot state.
Build a small cached upcoming-opportunity representation.
Conceptually maintain:
- next viable left-foot opportunity;
- next viable right-foot opportunity;
- perhaps one subsequent opportunity if necessary.
Recompute only when materially invalidated.
Examples:
- player input changes materially;
- ball trajectory changes materially;
- touch occurs;
- collision occurs;
- locomotion family changes;
- cached opportunity expires.
25. EVENT-DRIVEN / CACHED PLANNING
Prefer:
predict → cache → validate cheaply
rather than:
full candidate search every 240 Hz step.
The normal per-step path should be cheap.
Expensive planning should occur only when needed.
26. SHARE LOCOMOTION PREDICTION
Do not independently recompute TURN-1.2 future footfalls repeatedly in multiple dribble subsystems.
Cache/share:
- upcoming footfall;
- swing interval;
- predicted foot trajectory;
- contact feasibility
where deterministic and safe.
27. PRESERVE RESULT WHILE OPTIMIZING
Build an optimization twin.
For a fixed set of scenarios/seeds compare:
old exhaustive resolver
vs
optimized resolver
before changing touch behavior.
Verify identical:
- touch selections;
- contact ticks;
- foot selection;
- launch states.
Then layer DRIBBLE-1.1 behavior changes on top.
This separates performance optimization from football changes.
28. PERFORMANCE TARGET
Aim for at least an order-of-magnitude reduction in resolver planning cost if practical.
More important than a particular number:
demonstrate that the architecture plausibly scales toward 22 players.
Report:
- average cost per simulated second per dribbler;
- average cost per physics step;
- planning calls per second;
- cache hit rate;
- worst case;
- 22-player extrapolation.
29. CHROME/NODE DIFFERENCE
DRIBBLE-1 reports last-digit differences in 2/20 scenarios.
Investigate.
Determine whether these are:
- harmless floating-point display differences;
- actual branching differences;
- replay divergence.
Deterministic decisions must not depend on unstable last-bit comparisons.
Quantize/tolerance-gate decision boundaries where appropriate.
Do not hide genuine divergence.
30. PINNED-BALL ERROR
DRIBBLE-1 encountered a ball-engine error when a leg pins the ball against turf, although none of the final 160 runs hit it.
Reproduce if practical.
At minimum ensure the solver:
- remains finite;
- does not NaN;
- does not crash;
- produces a recoverable physical state.
Do not spend the whole mission on this rare case unless it blocks the new cut tests.
31. CONTINUOUS INPUT
Current status is PARTIAL.
Improve specifically around cut touch commitment.
Before authoritative contact:
- touch direction may retarget;
- foot choice may change if still feasible;
- planned touch may cancel.
After authoritative contact:
the ball is already physical.
Respond through the next feasible touch.
32. DO NOT WORK ON 135°/180° YET
Current:
- 135°: FAIL;
- 180°: FAIL.
Leave those as experimental regression cases.
Do not redesign TURN-1.2 reversal dribbling yet.
We first need to prove that a player can reliably take the ball through ordinary football cuts.
33. DO NOT MODIFY BALL-FEEL
DRIBBLE-1 currently uses BALL-FEEL-1.3.
Another agent is independently advancing BALL-FEEL.
Do not tune:
- turf;
- pass speed;
- bounce;
- curve;
- global ball coefficients
to solve DRIBBLE-1.1.
Keep the dribble/ball interface modular so newer BALL-FEEL can replace it later.
34. DO NOT MODIFY TACKLE
Physical interruption already passes.
Preserve:
tackle/leg hits ball → ball becomes loose → no snap-back.
No tackle development in this mission.
35. REVIEW PAGE
Build a focused DRIBBLE-1.1 comparison:
A — 60° HERO
DRIBBLE-1 | DRIBBLE-1.1
synchronized at 1×.
B — 90° HERO
DRIBBLE-1 | DRIBBLE-1.1
synchronized at 1×.
C — FOLLOW-THROUGH CLOSE-UP
show:
- foot before contact;
- contact;
- +50 ms;
- +100 ms;
- +200 ms;
- eventual unchanged TURN-1.2 landing.
D — STRAIGHT REGRESSION
JOG / RUN / FAST.
E — CONTACT FAMILY
Inside / outside / laces examples.
36. DIAGNOSTICS
Show:
- ball;
- touching foot;
- original TURN-1.2 swing trajectory;
- DRIBBLE-1.1 adjusted post-contact trajectory;
- authoritative landing;
- ball post-contact trajectory;
- minimum boot-ball clearance;
- contact region;
- touch launch velocity;
- next planned touch.
This should make the fix obvious.
37. VISUAL PRIORITY
At 1× I want to see:
The player softly takes the ball into the cut and naturally gets his foot out of the way while continuing the stride.

Not:
The player kicks the ball away and then turns after it.

And not:
The foot magically dodges the ball with an obvious procedural detour.

38. SHIPPING MINDSET
This is not DRIBBLE-2.
Do not build:
- skill moves;
- shielding;
- tricks;
- 180° ball turns;
- advanced possession;
- defender AI.
Fix ordinary cuts.
Optimize the resolver.
Stop.
STOP CONDITION
Stop for owner review when:
1. resolved touch architecture remains selected;
2. TURN-1.2 remains unchanged;
3. straight JOG/RUN/FAST dribbling remains materially intact;
4. contact-aware post-touch free-leg follow-through exists;
5. soft redirecting touches no longer usually require a 9–10 m/s blast;
6. same-foot accidental second contacts are materially reduced;
7. 45–60° taken-with-ball success reaches at least 7/8 in the primary test;
8. 90° taken-with-ball success reaches at least 5/8;
9. inside/outside/laces contacts appear naturally where useful;
10. ball remains physically free;
11. interception/control-loss behavior remains;
12. resolver CPU is materially reduced;
13. Chrome/Node deterministic decisions match;
14. no new pinned-ball instability is introduced.
FINAL REPORT
End with:
DRIBBLE-1 FOUNDATION PRESERVED: YES / NO
TURN-1.2 UNCHANGED: YES / NO
RESOLVED TOUCH ARCHITECTURE PRESERVED: YES / NO
CONTACT-AWARE FOLLOW-THROUGH: PASS / PARTIAL / FAIL
SOFT REDIRECT TOUCH: PASS / PARTIAL / FAIL
SAME-FOOT SECOND CONTACT REDUCED: YES / PARTIAL / NO
45–60° TAKEN-WITH-BALL: [X/8]
90° TAKEN-WITH-BALL: [X/8]
STRAIGHT JOG REGRESSION: PASS / FAIL
STRAIGHT RUN REGRESSION: PASS / FAIL
STRAIGHT FAST REGRESSION: PASS / FAIL
INSIDE TOUCH: PASS / PARTIAL / FAIL
OUTSIDE TOUCH: PASS / PARTIAL / FAIL
LACES/FRONT TOUCH: PASS / PARTIAL / FAIL
PREFERRED-FOOT BIAS: PASS / PARTIAL / FAIL
BALL PHYSICALLY FREE: YES / NO
PHYSICAL INTERRUPTION: PASS / FAIL
CONTROL LOSS STILL POSSIBLE: YES / NO
CONTINUOUS INPUT: PASS / PARTIAL / FAIL
OLD RESOLVER CPU: [VALUE]
NEW RESOLVER CPU: [VALUE]
RESOLVER SPEEDUP: [X]
22-PLAYER CPU PROJECTION: [VALUE]
CHROME/NODE DECISION DETERMINISM: PASS / FAIL
PINNED-BALL STABILITY: PASS / PARTIAL / FAIL
READY FOR OWNER VISUAL REVIEW: YES / NO
READY FOR DRIBBLE-V1 INTEGRATION IF OWNER APPROVES: YES / NO
Then give me:
THREE VIDEOS TO WATCH FIRST
BEST 60° CUT BEFORE/AFTER
BEST 90° CUT BEFORE/AFTER
BEST SOFT INSIDE TOUCH
BEST SOFT OUTSIDE TOUCH
BEST POST-CONTACT FOOT-CLEARANCE CLOSE-UP
AVERAGE CUT TOUCH SPEED BEFORE VS AFTER
ACCIDENTAL SECOND-CONTACT RATE BEFORE VS AFTER
THREE BIGGEST REMAINING V1 VISUAL DEFECTS
EXACT NEXT SHIPPING STEP
PRIMARY DIRECTIVE
DRIBBLE-1 proved the architecture. Do not redesign it. The current cut failure is structural: after a soft redirecting touch, the free foot blindly continues TURN-1.2's original swing through the ball's new path, forcing the resolver to blast the ball away just to avoid another contact. Fix the leg, not the ball. After authoritative contact, let the free leg yield, slow and clear naturally around the physical ball before smoothly rejoining TURN-1.2's unchanged landing. Use that freedom to produce genuinely soft inside/outside/laces redirects, make 45–60° cuts reliable and 90° cuts viable, while simultaneously replacing the resolver's repeated exhaustive lookahead with cached/event-driven planning. Preserve straight dribbling, physical interruption, control loss and the free physical ball. Then stop.
