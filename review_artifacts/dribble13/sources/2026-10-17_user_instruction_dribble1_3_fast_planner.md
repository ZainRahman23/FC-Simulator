# User instruction, 2026-10-17 (verbatim): DRIBBLE-1.3 — make DRIBBLE-1.2 fast without losing the football

- Pasted by the owner into the Claude Code session at about 2026-10-17 17:39 EEST (14:39 UTC), after the DRIBBLE-1.2 stop for owner review (a2f0505b).
- Saved under the standing rule (every owner instruction verbatim). The block below is reproduced exactly as received.

---

DRIBBLE-1.3 — MAKE DRIBBLE-1.2 FAST WITHOUT LOSING THE FOOTBALL
DRIBBLE-1.2 is approved as the behavioral foundation, but it is NOT approved for integration yet because CPU/planning cost is still unacceptable.
Current DRIBBLE-1.2 commit:
a2f0505b
The major football breakthrough is approved:
- decisive cut contacts changed from 88% toe in 1.1 → 8% toe in 1.2;
- decisive contacts are now approximately:
  - 45% outside
  - 36% inside
  - 11% laces
  - 8% toe
- genuine outside-foot cut contact: PASS;
- inside-foot cut contact: PASS;
- 60° right: 7/8;
- 60° left: 6/8;
- 90° right: 5/8;
- 90° left: 5/8;
- straight RUN: 100%;
- immediate same-foot recontact: 0.06%;
- ≥9 m/s hard cut touches: 0;
- mean cut touch speed: 5.93 m/s;
- request → first ≥20° redirect: 0.83 s;
- request → ball within 20° of requested direction: 1.23 s;
- physical interruption remains;
- control loss remains possible;
- TURN-1.2 remains unchanged;
- resolved-touch/free-ball architecture remains unchanged.
These are valuable results. Preserve them.
DRIBBLE-1.3 exists primarily because:
DRIBBLE-1.1 CPU = 168 ms / simulated second
DRIBBLE-1.2 CPU = 253 ms / simulated second
and:
worst DRIBBLE-1.2 planning spike = 604 ms.
That is the blocker.
1. PRIMARY DIRECTIVE
Keep DRIBBLE-1.2's football intelligence and contact geometry, but rebuild how planning work is scheduled and reused so it becomes computationally viable. Do not trade the new inside/outside/setup-touch behavior back for cheap toe-push dribbling.

This is primarily a planner architecture/performance mission.
2. HARD FREEZES
Do NOT modify:
- TURN-1.2;
- TURN-1.2 plants;
- root trajectories;
- braking/shuffle/pivot behavior;
- BALL-PHYS;
- BALL-FEEL;
- resolved-touch architecture;
- one-authoritative-impulse rule;
- free physical ball;
- physical interception;
- control-loss architecture;
- tackle behavior.
Avoid changing DRIBBLE-1.2's successful contact geometry unless required to correct an actual bug.
3. BEHAVIORAL TWIN FIRST
Before optimizing, create a deterministic DRIBBLE-1.2 behavioral twin suite.
Record for representative scenarios:
- planned foot;
- setup decision;
- setup contact;
- decisive contact;
- contact surface;
- contact tick;
- touch velocity;
- spin;
- ball state;
- TURN-1.2 state;
- final taken-with-ball result.
This becomes the reference.
Optimization should reproduce DRIBBLE-1.2 decisions wherever the same plan remains available.
If optimization changes a decision, log exactly why.
4. FIX THE FUNDAMENTAL PERFORMANCE PROBLEM
Do not merely micro-optimize JavaScript loops around the current planner.
DRIBBLE-1.2 performs too much expensive prediction/search synchronously when a new cut is requested.
Reorganize the planner around:
predict once → cache → evaluate incrementally → invalidate only when necessary.
5. FIXED PLANNING TIME BUDGET
Implement a hard planner budget per simulation tick.
Start around:
~2 ms maximum planner work per active dribbler per tick
in the benchmark environment.
Do not require exactly 2.000 ms if deterministic operation requires work-unit budgeting instead of wall-clock budgeting.
Prefer a deterministic work/candidate budget if wall-clock timing would alter replay.
Critical requirement:
Planning must never perform a 604 ms synchronous search again.

6. INCREMENTAL PLANNING
When a cut request arrives:
do NOT solve the entire future action in one frame.
Instead:
Tick N
- initialize planning;
- enumerate highest-value obvious opportunities.
Tick N+1
- evaluate additional candidates.
Tick N+2
- refine setup/decisive-contact options.
etc.
At every point maintain:
BEST VALID PLAN FOUND SO FAR.
If the action reaches its commitment deadline before search completes:
execute the best valid plan currently available.
Never stall the simulation waiting for exhaustive search.
7. PRIORITIZE CANDIDATES INTELLIGENTLY
Do not evaluate candidates in arbitrary order.
Search likely football solutions first.
For example:
1. already-feasible next touch;
2. obvious inside/outside contact on upcoming swing;
3. ordinary setup → decisive contact;
4. secondary-foot solution;
5. more expensive fallback plans.
That way a useful football plan is available early even if the full search is unfinished.
8. CACHE TURN-1.2 PREDICTION
DRIBBLE should not repeatedly recompute the same locomotion future.
For each relevant upcoming swing cache:
- lift-off;
- swing interval;
- predicted foot poses;
- boot orientation;
- landing;
- inside contact surface;
- outside contact surface;
- laces/front surface;
- reachable volume/corridor;
- plant timing.
One authoritative prediction per swing where possible.
Reuse it across candidate evaluation.
9. CACHE EXACT FOOT POSES
DRIBBLE-1.2 reportedly performs expensive exact foot-pose work repeatedly.
Cache deterministic exact foot poses at the resolution actually required for contact planning.
Do not calculate identical poses multiple times within one planning horizon.
Measure:
pose requests
vs:
unique poses actually computed.
Report cache hit rate.
10. CACHE BALL PREDICTION
Likewise, do not repeatedly resimulate the same physical free-ball future for every candidate when the initial state is identical.
Cache the physical ball trajectory from:
- current state;
- candidate setup launch
where safe.
Reuse common trajectory prefixes.
Do NOT replace BALL-PHYS with an approximation that changes outcomes unless used only as a cheap broad-phase rejection before exact verification.
11. TWO-STAGE CANDIDATE EVALUATION
Use:
CHEAP BROAD PHASE
first:
- rough reach;
- timing;
- side of body;
- obvious turf violation;
- obvious contact impossibility.
Then only promising candidates receive:
EXACT NARROW PHASE
- exact foot pose;
- exact ball trajectory;
- contact geometry;
- post-contact viability.
Do not run expensive exact evaluation for obviously impossible candidates.
12. INVALIDATION, NOT CONSTANT REPLANNING
Once a plan exists, keep it unless something materially changes.
Replan/invalidate when:
- input direction changes materially;
- player speed/locomotion family changes materially;
- ball receives an unexpected collision;
- defender changes the ball;
- setup touch executes;
- predicted contact opportunity expires;
- physical trajectory deviates beyond tolerance;
- selected foot becomes infeasible.
Do NOT rebuild the plan every physics step merely because time advanced.
13. FIX SETUP-TOUCH VALIDATION
This is the one meaningful football correctness change explicitly in scope.
DRIBBLE-1.2's setup system is PARTIAL:
- setup used in ~25–38% of cuts;
- 14/24 setup cases lead to taking the cut;
- 10/24 lose the ball.
Current diagnosis:
setup is validated against where the ball is intended to go, but insufficiently against where BALL-PHYS predicts the ball will actually be when the decisive foot arrives.

Fix this.
14. SETUP MUST BE VALIDATED AGAINST ACTUAL PREDICTED BALL STATE
Before accepting a setup plan, predict:
- actual physical ball position at decisive-contact time;
- actual velocity;
- actual height;
- actual spin;
and compare that state against the future contact corridor.
A setup is viable only if the predicted physical ball intersects a useful reachable contact region.
Do not merely check:
setup intended direction ≈ desired direction.
15. SETUP EXECUTION ERROR
Keep planning and execution conceptually separate.
Planner:
finds an ideal setup.

Execution:
may deviate according to player attributes later.

For DRIBBLE-1.3, use the existing controlled player/execution model.
But structure the interface so future Dribbling / Ball Control / Agility can alter execution and feasibility without rewriting the planner.
Do NOT implement the attribute project now.
16. PRESERVE THE NEW CONTACT DISTRIBUTION
DRIBBLE-1.2 decisive cut touches:
- outside 45%
- inside 36%
- laces 11%
- toe 8%
Do not require those exact percentages.
But DRIBBLE-1.3 must NOT regress toward DRIBBLE-1.1's:
88% decisive toe pushes.
Target:
front/toe decisive cut contact remains ≤15%
unless evidence shows a legitimate football reason otherwise.
No artificial quotas.
17. PRESERVE SOFTER CUT TOUCHES
Current progression:
6.33 → 6.63 → 5.93 m/s
and:
≥9 m/s touches: 8 → 8 → 0.
Preserve this.
Do not regain reliability by blasting the ball away.
18. PRESERVE RESPONSIVENESS
Current:
request → first ≥20° redirection:
1.45 → 1.98 → 0.83 s
Preserve approximately the DRIBBLE-1.2 responsiveness.
Do not make the player wait for planning to finish.
That's exactly why planning is becoming incremental.
19. CUT RELIABILITY TARGETS
Current:
- 60° right: 7/8
- 60° left: 6/8
- 90° right: 5/8
- 90° left: 5/8
Minimum DRIBBLE-1.3 target:
60° right ≥7/8
60° left ≥7/8
90° right ≥5/8
90° left ≥5/8
If setup validation naturally improves these further, good.
Do not sacrifice CPU massively chasing 8/8.
20. STRAIGHT RUN MUST REMAIN 100% OR VERY CLOSE
DRIBBLE-1.2:
16/16 straight RUN keeps ball = 100%.
Preserve:
≥95%, preferably 100% under the same test.
Do not regress straight football to optimize cuts.
21. IMMEDIATE RECONTACT
DRIBBLE-1.2:
1 / 1,647 = 0.06%.
Preserve this improvement.
Do not return to DRIBBLE-1.1's 1.1%.
22. PREFERRED FOOT IS NOT A BLOCKER
Current preferred-foot bias fails.
Do not spend substantial CPU or compromise geometry to fix it.
Preferred foot will later become a small utility bias when multiple plans are similarly good.
For now:
football geometry wins.
23. CPU TARGETS
DRIBBLE-1.3 must materially improve performance.
First shipping target:
average active-dribbler resolver CPU ≤170 ms per simulated second
under the same benchmark used for 1 / 1.1 / 1.2.
Stretch target:
≤100 ms/s.
Do not achieve this by reducing simulation tick rate or disabling physics.
24. SPIKE TARGET
This is equally important.
Current worst:
604 ms single planning step.
Target:
no planning step >20 ms
in the benchmark environment if practical.
Hard review failure:
any unexplained >50 ms synchronous planner spike.
The exact wall-clock number can vary by machine, so also report deterministic work units/candidates per tick.
25. REALISTIC MATCH ACTIVE SET
Do not extrapolate as though all 22 players are simultaneously running the full dribble planner.
Expensive DRIBBLE planning should normally be active for:
- current ball carrier;
- perhaps imminent receiver;
- perhaps immediate contest participant.
Everyone else should use ordinary locomotion/football planning.
Report CPU for:
1 active dribbler
1 dribbler + 1 contest participant
1 dribbler + receiver + defender
and:
pathological all-22-active case
separately.
26. DO NOT CHEAT CPU THROUGH LOWER QUALITY
Reject optimizations that materially cause:
- fewer outside/inside contacts;
- harder touches;
- slower cut response;
- loss of setup intelligence;
- more control loss;
- reduced interception;
- ball tethering;
- fewer physical checks merely to hit benchmark.
We want:
same/better football, cheaper computation.
27. PROFILE BEFORE AND AFTER
Instrument CPU by subsystem.
At minimum:
- TURN prediction;
- foot-pose generation;
- candidate enumeration;
- broad-phase feasibility;
- exact contact geometry;
- ball prediction;
- setup evaluation;
- plan scoring;
- cache/invalidation overhead.
Give:
DRIBBLE-1.2
vs:
DRIBBLE-1.3
time breakdown.
I want to know where the 253 ms/s went.
28. CACHE METRICS
Report:
- foot prediction cache hit rate;
- foot-pose cache hit rate;
- ball prediction reuse;
- plan reuse rate;
- replans per simulated second;
- candidates broad-phase rejected;
- candidates exact-evaluated.
29. DETERMINISM
Incremental planning must remain deterministic.
Do NOT make decisions depend on:
- actual wall-clock timing;
- thread scheduling;
- machine speed;
- nondeterministic candidate order.
If using a time budget, implement it as a deterministic work budget for authoritative decisions.
Same seed/input:
same plan
same contact
same physical ball.
30. CHROME / NODE
Preserve:
Chrome/Node decision determinism: PASS.
Compare:
- selected plan;
- contact tick;
- contact surface;
- launch state;
- outcome.
31. DO NOT MULTITHREAD AUTHORITATIVE PLANNING UNLESS NECESSARY
Prefer fixing algorithmic duplication/caching first.
Parallel rendering/testing is fine.
But don't introduce nondeterministic authoritative worker scheduling merely to hide planner cost.
If background speculative planning is explored, authoritative selection must remain deterministic.
32. NO NEW DRIBBLING FEATURES
Do NOT implement:
- 135°/180° reversal dribbling;
- skill moves;
- shielding;
- tricks;
- nutmegs;
- close-control mode;
- attributes;
- defender AI.
DRIBBLE-1.3 is:
performance + setup correctness.
Nothing else.
33. 180° REGRESSION IS NOT A BLOCKER
DRIBBLE-1.2's 180° sprint result regressed to 0/16.
180° was explicitly out of scope.
Record it, but do not redesign 1.3 around it.
Reversal dribbling comes later using TURN-1.2's brake/shuffle/turn system.
34. REVIEW PAGE
Keep review focused.
A — 60° RIGHT
1.2 vs 1.3.
B — 60° LEFT
1.2 vs 1.3.
C — 90° RIGHT
1.2 vs 1.3.
D — 90° LEFT
1.2 vs 1.3.
E — SETUP SUCCESS
Show setup prediction:
intended target vs actual predicted BALL-PHYS state vs actual resulting state.
F — CPU
profile and spike timeline.
G — STRAIGHT RUN
regression.
Primary visual comparisons at 1× gameplay camera.
35. PERFORMANCE REVIEW MUST BE EASY TO READ
Give one table:
| Metric | D1 | D1.1 | D1.2 | D1.3 |
containing:
- average CPU ms/s;
- worst planning spike;
- plans/s;
- exact contact evaluations/s;
- straight control;
- 60R;
- 60L;
- 90R;
- 90L;
- decisive toe %.
STOP CONDITION
Stop for owner review when:
1. DRIBBLE-1.2 contact geometry is preserved;
2. TURN-1.2 remains unchanged;
3. setup validation uses actual predicted physical ball state;
4. 60R ≥7/8;
5. 60L ≥7/8;
6. 90R ≥5/8;
7. 90L ≥5/8;
8. straight RUN ≥95%;
9. decisive cut toe/front rate ≤15%;
10. ≥9 m/s rescue touches remain essentially absent;
11. immediate recontact remains near 1.2 levels;
12. average CPU ≤170 ms/s, preferably ≤100;
13. no planner spike >20 ms if practical and no unexplained >50 ms spike;
14. physical interruption/control loss remain;
15. Chrome/Node determinism passes.
If the football targets pass but CPU still fails:
do not integrate. Continue profiling/restructuring until CPU is genuinely viable.
If CPU passes but football regresses:
do not integrate.
We need both.
FINAL REPORT
End with:
DRIBBLE-1.2 FOOTBALL FOUNDATION PRESERVED: YES / NO
TURN-1.2 UNCHANGED: YES / NO
INCREMENTAL PLANNER: PASS / PARTIAL / FAIL
DETERMINISTIC WORK BUDGET: PASS / PARTIAL / FAIL
FOOT PREDICTION CACHE: PASS / PARTIAL / FAIL
FOOT POSE CACHE: PASS / PARTIAL / FAIL
BALL PREDICTION REUSE: PASS / PARTIAL / FAIL
SETUP VALIDATED AGAINST PHYSICAL BALL FUTURE: PASS / PARTIAL / FAIL
60° RIGHT: [X/8]
60° LEFT: [X/8]
90° RIGHT: [X/8]
90° LEFT: [X/8]
STRAIGHT RUN CONTROL: [X%]
DECISIVE CUT TOE RATE: [X%]
≥9 M/S CUT TOUCHES: [COUNT]
SAME-FOOT IMMEDIATE RECONTACT: [X%]
D1.2 CPU: [VALUE]
D1.3 CPU: [VALUE]
CPU IMPROVEMENT: [X% / X×]
D1.2 WORST SPIKE: [VALUE]
D1.3 WORST SPIKE: [VALUE]
1 ACTIVE DRIBBLER CPU: [VALUE]
REALISTIC ACTIVE-SET CPU: [VALUE]
ALL-22 PATHOLOGICAL CPU: [VALUE]
CHROME/NODE DETERMINISM: PASS / FAIL
PHYSICAL INTERRUPTION: PASS / FAIL
CONTROL LOSS POSSIBLE: YES / NO
READY FOR OWNER VISUAL REVIEW: YES / NO
READY FOR DRIBBLE-V1 INTEGRATION: YES / NO
Then give:
THREE VIDEOS TO WATCH FIRST
D1.2 VS D1.3 PERFORMANCE TABLE
CPU PROFILE BEFORE/AFTER
CACHE HIT-RATE TABLE
BEST 60° CUT
BEST 90° CUT
BEST SETUP-TOUCH EXAMPLE
WORST REMAINING CUT
THREE BIGGEST REMAINING V1 DEFECTS
EXACT NEXT SHIPPING STEP
ONE THING TO REMEMBER
DRIBBLE-1.2 finally solved the important football problem: the player can prepare the physical ball for a future foot contact and use real inside/outside surfaces to take it through a cut. Do not throw that away. DRIBBLE-1.3 should make the same intelligence cheap: cache repeated locomotion/ball predictions, reject impossible candidates cheaply, plan incrementally under a deterministic work budget, and validate setup touches against where BALL-PHYS says the ball will actually be. If CPU remains bad, keep fixing CPU rather than integrating an expensive planner.
