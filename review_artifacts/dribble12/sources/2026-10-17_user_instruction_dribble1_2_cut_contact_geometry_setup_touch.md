# User instruction, 2026-10-17 (verbatim): DRIBBLE-1.2 — cut contact geometry / setup touch

- Pasted by the owner into the Claude Code session at about 2026-10-17 07:03 EEST (04:03 UTC), after the DRIBBLE-1.1 stop for owner review (7d8c8524) and the 16 Oct publication.
- Saved under the standing rule (every owner instruction verbatim). The block below is reproduced exactly as received.

---

DRIBBLE-1.2 — CUT CONTACT GEOMETRY / SETUP TOUCH
DRIBBLE-1.1 is not approved for integration, but its research is valuable.
Preserve DRIBBLE-1 and DRIBBLE-1.1 as milestones.
The next mission is DRIBBLE-1.2.
Do not continue tuning the generic follow-through. The main remaining problem is cut contact geometry.
Evidence from DRIBBLE-1.1:
- 97% of touches are still front-of-boot;
- laces/front dominates;
- only 12 inside touches occurred in 1,574;
- zero outside touches occurred in 1,574;
- outside contacts are proposed but fail feasibility;
- 45° can reach 7/8;
- 60° remains 4/8–5/8 in primary cases;
- 90° remains 2/8 primary / 4/8 mirrored;
- a left-footed/mirrored geometry can already take a right 60° cut 8/8 using the inside foot;
- cut touch speed did NOT become softer: running-cut mean rose 6.39 → 7.27 m/s;
- straight RUN regressed 97.2% → 80.5%;
- resolver CPU improved 3.2× but still has large planning spikes.
This strongly indicates:
The cut fails because the ball is often in the wrong place relative to the cutting foot when the decisive touch opportunity arrives.

Fix that.
1. HARD FREEZES
Do not modify:
- TURN-1.2;
- its plants;
- its cuts;
- its root trajectory;
- its footfall destinations;
- BALL-PHYS;
- BALL-FEEL;
- resolved-touch architecture;
- one-authoritative-impulse rule;
- free physical ball;
- interception/control-loss architecture.
DRIBBLE must organize itself around TURN-1.2 and the physical ball.
2. PRIMARY CONCEPT — SETUP TOUCH
A cut does not have to be solved entirely by the decisive cutting touch.
When the player requests a meaningful change of direction, look ahead to the upcoming TURN-1.2 cut plant and determine:
- which foot will be the useful cutting/touching foot;
- which boot surface would naturally redirect the ball;
- where the ball needs to be shortly before that contact;
- whether the current/preceding touch can place it into that reachable corridor.
Then deliberately use a setup touch when needed.
Broad sequence:
dribble
→ cut request
→ predict upcoming plant/cutting foot
→ setup touch positions physical ball into future contact lane
→ ball remains physically free
→ cutting foot reaches it naturally
→ inside/outside contact redirects ball
→ player takes cut with ball
→ accelerates.
3. THE SETUP TOUCH IS STILL A REAL PHYSICAL TOUCH
Do not place the ball directly.
Do not teleport it.
Do not guide it toward the future contact point after launch.
Resolve one ordinary physical touch:
velocity + spin
and allow BALL-PHYS to carry it into the future contact corridor.
If it does not arrive correctly, the cut may fail.
4. DEFINE A FUTURE CONTACT CORRIDOR
Using TURN-1.2 foot prediction, construct a bounded reachable region for the upcoming cutting foot.
It should account for:
- foot trajectory;
- boot orientation;
- available inside/outside/front surfaces;
- leg reach;
- ball radius;
- time to contact;
- physical ball trajectory;
- joint limits;
- turf.
Do not search arbitrary 3D poses.
Ask:
Can the physical ball intersect a useful part of this boot during the upcoming swing?

5. OUTSIDE-FOOT CONTACT IS THE PRIMARY NEW TARGET
DRIBBLE-1.1 produced:
0 outside contacts / 1,574 touches.
Diagnose each feasibility failure:
- boot below turf after rotation;
- leg cannot reach;
- toe intersects first;
- timing wrong;
- ball on wrong side of foot.
Solve the geometry, not the label.
The goal is not “force outside touches.”
The goal is:
make outside-foot contact genuinely feasible when it is the natural football solution.

6. USE THE SUCCESSFUL MIRRORED/INSIDE CASE AS EVIDENCE
You found a left-footed profile that takes the corresponding right 60° cut 8/8 on the inside foot.
Treat this as a geometric reference.
Analyze:
- ball position relative to pelvis;
- ball position relative to planting/cutting foot;
- contact time;
- boot orientation;
- approach angle;
- contact point on ball;
- post-contact ball direction;
- player COM;
- plant timing.
Then determine what the geometrically equivalent outside-foot solution requires.
Do not merely copy coordinates or mirror incorrectly.
Reproduce the underlying relationship.
7. INSIDE / OUTSIDE SHOULD BE GEOMETRIC TOOLS
For a cut, choose the contact surface that naturally matches:
- ball side;
- available foot;
- desired direction;
- stride phase;
- upcoming plant.
Preferred foot is secondary to feasibility.
A good dribbler should naturally use:
inside when ball geometry favors inside
and:
outside when geometry favors outside.
8. REDUCE FRONT-OF-BOOT MONOCULTURE
Current:
97% front-of-boot.
This is unacceptable for cut dribbling.
Do not solve this with artificial quotas.
Instead, after setup-touch geometry works, front contact should naturally remain common for:
- straight pushes;
- sprint touches;
- some acceleration touches.
Inside/outside should become materially represented in:
- steering;
- lateral control;
- cuts.
Report distributions separately for:
STRAIGHT
and:
CUTS.
9. HERO CASE — 60°
Solve the current problematic 60° cut first.
Show:
DRIBBLE-1
DRIBBLE-1.1
DRIBBLE-1.2
at 1×.
The desired DRIBBLE-1.2 result:
request
→ setup touch if required
→ ball enters useful contact lane
→ natural inside/outside redirect
→ body and ball turn together
→ accelerate.
It should not require a second rescue touch 0.6–1.2 seconds later merely because the first touch barely redirected the ball.
10. TARGET 60° RELIABILITY
Aim for:
at least 7/8 on BOTH mirrored 60° cases.
Prefer 8/8 if it emerges without cheating.
Do not accept one side being excellent and the mirror being poor without explaining a legitimate physical asymmetry.
11. 90° SECOND
Once 60° works, apply the same system to 90°.
A 90° cut may legitimately require:
setup
→ first redirect
→ plant
→ second outgoing touch
if one touch cannot physically produce the full direction change.
But the ball and body should visibly enter the turn together.
Do not allow the body to complete the cut while the ball continues down the old lane.
12. TARGET 90° RELIABILITY
Aim for:
at least 5/8 on both mirrored 90° cases.
Stretch target:
6–7/8.
Do not tether to reach it.
13. CUT RESPONSIVENESS
Current cut sequences are staged and can take too long.
Measure:
input request → setup touch
input request → first meaningful ball redirection
input request → body plant
input request → ball travelling within 20° of requested direction
We should reduce the current feeling that the player requests a cut and waits ~1 second before the ball participates.
Do not require instant response when stride geometry makes it impossible.
14. DO NOT MAKE SETUP TOUCHES OBVIOUSLY SCRIPTED
The player should not visibly perform:
“special preparation tap” every time a cut is requested.
Sometimes the ball is already in the right lane.
Then:
no setup touch is required.
Sometimes the existing next ordinary dribble touch can double as the setup.
Use a dedicated setup only when necessary.
15. PRESERVE FOLLOW-THROUGH WORK
DRIBBLE-1.1's post-contact follow-through is useful.
Preserve it where it:
- clears the ball;
- avoids obvious second contact;
- rejoins TURN-1.2 naturally.
But do not continue expanding it as the primary cut solution.
Contact geometry comes first.
16. FIX THE 1.1% SAME-FOOT RE-CONTACTS
DRIBBLE-1.1 introduced 17 / 1,574 = 1.1% same-foot contacts within 250 ms.
All are the striking toe, 8–46 ms after launch.
Investigate this specifically.
Since the modeled foot pose reportedly matches within 0.5 mm, inspect:
- collision timing;
- contact manifold persistence;
- ball radius/skin;
- solver substeps;
- authoritative impulse suppression window;
- collider geometry.
Eliminate or materially reduce these without disabling genuine later boot collisions.
17. RESTORE STRAIGHT RUN
DRIBBLE-1:
97.2% straight RUN control.
DRIBBLE-1.1:
80.5%.
This regression must be fixed.
Diagnose the coarse/faster planning case where a swing heading into the ball receives no planned touch and physically kicks it anyway.
Restore straight RUN to approximately:
≥95%
under the same test.
Do not reduce physical collision authenticity to achieve it.
18. PRESERVE JOG / FAST
Current:
JOG PASS
FAST PASS
Keep them.
Sprint can remain riskier.
19. PREFERRED FOOT
Preferred-foot bias currently FAILS.
Once geometry is fixed, add a modest utility preference:
when two contacts are similarly feasible and similarly useful, prefer the preferred foot.

Never choose a materially worse touch just to satisfy preferred-foot statistics.
Report preferred-foot usage by:
- straight;
- gentle curve;
- 60°;
- 90°.
20. CPU — KEEP THE 3.2× GAIN
DRIBBLE-1:
465 ms / simulated second / dribbler
DRIBBLE-1.1:
144 ms / simulated second
Preserve or improve this.
Do NOT return to exhaustive per-step planning.
21. REMOVE PLANNING SPIKES
Current longest planning pass:
363 ms.
That's unacceptable even though average performance improved.
Spread expensive planning work over multiple ticks where deterministic and safe.
Use:
- cached foot opportunities;
- incremental candidate evaluation;
- bounded candidate queues;
- invalidation events.
Avoid one giant planning frame.
22. PERFORMANCE TARGET
Aim for:
no individual planning spike >20 ms
if practical in the test runtime.
If that exact threshold cannot be reached without harming results, report the actual tradeoff.
Also try to bring average cost below DRIBBLE-1.1's 144 ms/s.
23. DO NOT PLAN FOR ALL 22 PLAYERS AS ACTIVE DRIBBLERS
The current 3.8 s/s projection assumes all 22 simultaneously run full dribble planning.
That's not representative.
Architect the resolver so expensive planning activates primarily for:
- current ball controller;
- imminent receiver;
- perhaps immediate contest participants.
Other players should not run full dribble search.
Report both:
active-dribbler cost
and:
realistic match active-set estimate.
24. BALL-FEEL REMAINS MODULAR
Do not modify BALL-FEEL-1.3 in this branch.
Astra now has newer ball work.
DRIBBLE-1.2 must preserve a clean launch/contact interface so the latest BALL-FEEL can replace 1.3 without redesigning dribbling.
25. 135° / 180° STILL OUT OF SCOPE
Do not solve them yet.
Once 60° and 90° are robust, we'll use TURN-1.2's brake/shuffle vocabulary to design reversal dribbling.
Keep them as regression/diagnostic cases only.
26. REVIEW PAGE
Primary review should be compact:
A. 60° RIGHT
DRIBBLE-1 | 1.1 | 1.2
B. 60° LEFT
same.
C. 90° RIGHT
same.
D. 90° LEFT
same.
E. OUTSIDE-FOOT HERO
close-up showing setup → outside contact → ball redirect → unchanged plant.
F. INSIDE-FOOT HERO
corresponding successful inside geometry.
G. STRAIGHT RUN REGRESSION
1 vs 1.1 vs 1.2.
All primary comparisons at 1× gameplay camera.
27. GEOMETRY DIAGNOSTIC
For cut hero cases show:
- ball trajectory;
- upcoming foot trajectory;
- inside contact surface;
- outside contact surface;
- reachable corridor;
- setup-touch target region;
- actual ball position;
- selected contact;
- authoritative impulse;
- TURN-1.2 plant.
I want to see why the contact became feasible.
28. MEASURE SETUP QUALITY
Report:
- percentage of cuts requiring setup;
- percentage where existing touch already provides setup;
- setup touch speed;
- ball position error at decisive contact;
- decisive contact surface;
- decisive touch speed;
- final ball heading;
- time from request to useful redirection.
29. DO NOT OPTIMIZE FOR THE METRIC BY CHEATING
taken-with-ball is useful but not sufficient.
Reject cases where:
- player barely turns;
- ball happens to remain within control radius;
- giant touch eventually reaches requested heading;
- player turns and waits for ball;
- multiple ugly rescue touches inflate success.
Watch at 1×.
The desired action is:
footballer takes the ball through the cut.

STOP CONDITION
Stop for owner review when:
1. TURN-1.2 remains unchanged;
2. resolved-touch architecture remains unchanged;
3. setup-touch/contact-corridor system exists;
4. at least one genuine outside-foot cut contact exists;
5. outside contacts no longer fail systematically;
6. inside contacts remain functional;
7. front-of-boot dominance in cuts is materially reduced;
8. both 60° directions reach ≥7/8 taken-with-ball;
9. both 90° directions reach ≥5/8;
10. straight RUN returns to approximately ≥95%;
11. same-foot immediate re-contact is materially reduced from 1.1%;
12. DRIBBLE-1.1 CPU improvement is preserved or improved;
13. large planning spikes are materially reduced;
14. Chrome/Node decision determinism passes;
15. physical interception/control loss remain intact.
FINAL REPORT
End with:
DRIBBLE-1 FOUNDATION PRESERVED: YES / NO
TURN-1.2 UNCHANGED: YES / NO
RESOLVED TOUCH ARCHITECTURE UNCHANGED: YES / NO
SETUP TOUCH SYSTEM: PASS / PARTIAL / FAIL
FUTURE CONTACT CORRIDOR: PASS / PARTIAL / FAIL
GENUINE OUTSIDE-FOOT CUT CONTACT: PASS / PARTIAL / FAIL
INSIDE-FOOT CUT CONTACT: PASS / PARTIAL / FAIL
CUT FRONT-OF-BOOT RATE: [X%]
60° RIGHT TAKEN-WITH-BALL: [X/8]
60° LEFT TAKEN-WITH-BALL: [X/8]
90° RIGHT TAKEN-WITH-BALL: [X/8]
90° LEFT TAKEN-WITH-BALL: [X/8]
STRAIGHT RUN CONTROL: [X%]
SAME-FOOT IMMEDIATE RE-CONTACT: [X%]
PREFERRED FOOT BIAS: PASS / PARTIAL / FAIL
PHYSICAL INTERRUPTION: PASS / FAIL
CONTROL LOSS POSSIBLE: YES / NO
AVERAGE RESOLVER CPU: [VALUE]
WORST PLANNING SPIKE: [VALUE]
CHROME/NODE DETERMINISM: PASS / FAIL
READY FOR OWNER VISUAL REVIEW: YES / NO
READY FOR DRIBBLE-V1 INTEGRATION IF OWNER APPROVES: YES / NO
Then give:
THREE VIDEOS TO WATCH FIRST
BEST OUTSIDE-FOOT CUT
BEST INSIDE-FOOT CUT
BEST 90° CUT
SETUP TOUCH BEFORE/AFTER
CONTACT DISTRIBUTION STRAIGHT VS CUTS
CUT TOUCH SPEED 1 → 1.1 → 1.2
REQUEST-TO-REDIRECTION TIME 1 → 1.1 → 1.2
CPU 1 → 1.1 → 1.2
THREE BIGGEST REMAINING V1 DEFECTS
EXACT NEXT SHIPPING STEP
PRIMARY DIRECTIVE
DRIBBLE-1.1 proved that post-contact follow-through alone is not the answer. The ball is arriving at the cut in the wrong geometry, which is why 97% of touches remain front-of-boot and not one of 1,574 touches could use the outside. Stop asking the decisive foot to rescue a badly positioned ball. Use the preceding physical touch to put the ball into the future contact corridor of the upcoming TURN-1.2 cutting foot, then let a genuinely feasible inside/outside surface take the ball through the turn. Preserve the free physical ball, frozen locomotion and resolved-touch architecture. Restore straight RUN, eliminate the immediate toe recontacts, keep the CPU gains, remove the planning spikes, and make 60°/90° cuts finally look like the player is taking the football with him.
