DRIBBLE-1.4 — FINAL FOUNDATION CLEANUP BEFORE ATTRIBUTES
DRIBBLE-1.3 is a successful performance architecture and is now the baseline.
Do not redesign the dribbling system.
The purpose of DRIBBLE-1.4 is narrowly:
Fix the remaining cut/setup timing and reliability problems while preserving DRIBBLE-1.3's CPU architecture and the football behavior already achieved.

If this succeeds, we intend to freeze the generic DRIBBLE-V1 foundation and move next to:
Dribbling / Ball Control / Agility attributes.
CURRENT BASELINE
DRIBBLE-1.3 currently achieves:
- average resolver CPU: 148 ms per simulated second
- worst measured spike: 41 ms
- straight control: 100%
- decisive cut toe rate: 5.1% over seeds 1–96
- ≥9 m/s decisive cut touches: 0/422
- same-foot immediate recontact: 0.10%
- physical interruption: PASS
- control loss possible: YES
- Chrome/Node determinism: PASS
- TURN-1.2 unchanged/bit-identical
- incremental deterministic planner: PASS
- setup validation against BALL-PHYS future: PASS
DRIBBLE-1.3 is statistically close to DRIBBLE-1.2 overall:
cuts taken
D1.2 = 258/384
D1.3 = 256/384
but clean cuts fell:
D1.2 = 129
D1.3 = 114
Current small regression set:
Cut    D1.2    D1.3
60° right    7/8    6/8
60° left    6/8    5/8
90° right    5/8    5/8
90° left    5/8    4/8


Over the more important 96-seed evaluation, per 8:
D1.2:
6.7 / 5.4 / 5.3 / 4.1
D1.3:
6.3 / 5.4 / 5.1 / 4.6
Therefore:
do not overfit to the eight-seed fixtures.
The broad 96-seed behavior is the primary reliability evidence.
1. HARD FREEZES
Preserve:
- TURN-1.2 exactly;
- DRIBBLE-1.3 incremental planner architecture;
- deterministic work budget;
- foot prediction cache;
- exact foot-pose cache;
- ball prediction reuse;
- broad-phase/narrow-phase planning;
- resolved-touch architecture;
- authoritative free physical ball;
- no tether;
- one authoritative touch impulse;
- physical interruption;
- control-loss possibility;
- inside/outside/laces contact geometry.
Do NOT return to DRIBBLE-1.1-style toe-push dribbling.
2. DO NOT CHASE MORE CPU OPTIMIZATION
DRIBBLE-1.3's CPU architecture is approved.
148 ms/s is good enough for this stage.
Do not spend this mission trying to reach the old ≤100 ms/s stretch goal.
CPU is now a guardrail, not the primary objective.
Prefer:
better remaining football reliability
over:
148 → 120 ms/s.
3. PRIMARY ISSUE — RELEASE TIMING
Investigate the remaining fixed/staged release timing.
A known failure:
90° right, seed 16
DRIBBLE-1.3 releases approximately one tick too early because of its ~100 ms release lead.
This causes:
early ball state
→ toe contact
→ ball loose
→ later Laces contact off-line
→ failed cut.
DRIBBLE-1.2 takes the same cut cleanly.
Reproduce this exact case first.
4. REMOVE ARBITRARY RELEASE TIMING WHERE POSSIBLE
Do NOT simply change:
100 ms -> 80 ms
globally.
That would be parameter tuning rather than solving the cause.
Release/setup timing should preferably emerge from:
predicted BALL-PHYS state
-
predicted future foot/contact corridor
-
contact opportunity timing.
Determine when the ball actually needs to be released so that the physical ball intersects the useful region of the future foot.
5. CONTACT-TIMED RELEASE
Prefer architecture conceptually like:
identify desired decisive-contact window

→ predict future foot corridor
→ predict physical ball travel
→ solve backwards for useful setup/release timing
→ execute setup
→ BALL-PHYS carries ball
→ decisive foot meets ball.
No ball snapping.
No hidden synchronization.
No tether.
The ball remains physically free.
6. ALLOW A WINDOW, NOT A MAGIC FRAME
Do not require the ball to hit one mathematically perfect future point.
Football contact has a viable:
space × time corridor.
Determine whether a setup remains useful across a small physical contact window.
The planner should prefer setups with robust reachable margins, not plans that succeed only on one exact simulation tick.
7. PRIMARY ISSUE — SETUP VALIDATOR MAY BE TOO CONSERVATIVE
DRIBBLE-1.3 improved setup precision substantially:
D1.2 setup usage: 117
D1.3 setup usage: 24
Setup success:
56% → 75%.
That is good in one sense.
But the ~80% reduction in setup attempts may mean viable setups are now being rejected.
Investigate.
8. DO NOT SIMPLY LOOSEN THE VALIDATOR
We do NOT want:
accept more setups to raise cut rate.

We want:
better distinguish viable setups from bad ones.

Preserve validation against the actual predicted BALL-PHYS future.
Improve its precision/recall if possible.
9. EXECUTION-ROBUST SETUP TEST
DRIBBLE-1.3 currently simulates the planned setup plus six execution-error variants and requires at least five to remain reachable.
Audit this rule.
Determine whether:
5/6 reachable
is unnecessarily rejecting legitimate setups.
Do not blindly change it to 4/6.
Examine:
- reach margin;
- contact quality;
- ball velocity;
- contact surface;
- timing margin;
- whether failures are catastrophic or marginal.
A setup with:
4 excellent + 2 barely-missed variants
may be more robust than:
5 barely-reachable + 1 failure.
If appropriate, replace the simple count threshold with a deterministic robustness score/margin.
Keep it auditable.
10. SCORE SETUPS BY PHYSICAL QUALITY
A good setup should put the ball into a future state with:
- reachable position;
- useful height;
- manageable velocity;
- useful approach angle;
- correct side of body;
- appropriate contact surface;
- sufficient time margin.
Prefer robust setup quality over binary:
reachable / unreachable.
Do not add arbitrary attribute bonuses yet.
11. DO NOT MAKE THE GENERIC PLAYER PERFECT
Important.
This is the final generic foundation before attributes.
Do NOT attempt to make:
60R / 60L / 90R / 90L = 8/8 everywhere.
We need room for:
- Dribbling;
- Ball Control;
- Agility;
- pressure;
- fatigue;
- defenders
to matter later.
The generic baseline needs to be:
credible, stable and causally correct
rather than superhuman.
12. PRIMARY RELIABILITY METRIC — 96 SEEDS
Use the full:
4 cuts × 96 seeds = 384 runs
as the primary comparison.
Compare:
D1.2
D1.3
D1.4
for:
- cut taken;
- clean cut;
- ball retained;
- direction achieved;
- time to redirection;
- contact surface;
- setup usage;
- setup success;
- control loss.
Small 8-seed fixtures remain useful for deterministic regression reproduction, but they are not the main balancing target.
13. TARGET — RECOVER CLEAN CUT QUALITY
Current:
D1.2 clean cuts = 129/384
D1.3 = 114/384
Try to recover this regression.
Target:
D1.4 ≥ approximately D1.2 clean-cut quality
without:
- harder rescue pushes;
- toe-push regression;
- hidden ball control;
- reduced physical interruption;
- CPU architecture regression.
Do not force exactly 129.
Statistical/football quality matters more than hitting one integer.
14. PRESERVE CONTACT QUALITY
Current D1.3 decisive toe rate:
5.1% over seeds 1–96.
This is excellent.
Guardrail:
≤15%.
Prefer staying around current levels.
Do not recover cut reliability by going back to front-of-foot rescue pushes.
15. PRESERVE TOUCH WEIGHT
Current:
≥9 m/s decisive cut touches = 0/422.
Preserve essentially zero.
A cut should not succeed merely because the player blasts the ball away.
16. STRAIGHT RUN
Preserve:
100% current straight control
or at minimum:
≥95%.
Do not break straight dribbling while fixing cuts.
17. SAME-FOOT RECONTACT
Preserve approximately:
0.10% immediate same-foot recontact
and do not regress toward earlier versions.
18. PHYSICAL INTERRUPTION
Preserve exactly the design principle:
Defender/leg physically contacts ball
→ ball becomes physically interrupted
→ no snap-back.
Do not make cut reliability depend on protected possession.
19. CONTROL LOSS MUST REMAIN POSSIBLE
Do not make setup touches guaranteed.
Bad physical states should still produce:
- heavy touch;
- missed contact;
- ball loss.
DRIBBLE-V1 must remain a simulation rather than an animation guaranteeing successful dribbling.
20. PREFERRED FOOT IS OUT OF SCOPE
Preferred-foot bias is still not good enough.
Leave it alone.
Do not compromise geometry or spend CPU fixing it here.
Preferred foot will be handled with the attribute/utility layer later.
21. 135° / 180° ARE OUT OF SCOPE
Do not work on reversal dribbling.
TURN-1.2 already has the brake → shuffle → turn → accelerate foundation.
Ball-carrying through large reversals is a later milestone.
This mission remains:
straight / 60° / 90° foundation cleanup.
22. CPU GUARDRAILS
Current D1.3:
148 ms/s average
41 ms worst observed spike
Accept:
≤170 ms/s preferred.
Do not accept:
>190 ms/s
without stopping and explaining why.
Preserve:
- deterministic work budget;
- incremental planning;
- caches;
- bounded synchronous work.
Do not reintroduce 500 ms planner stalls.
23. DO NOT OPTIMIZE TURN-1.2 HERE
TURN-1.2 prediction is now the largest DRIBBLE cost.
But TURN-1.2 is frozen.
Do not modify it in this mission.
Broader 22-player locomotion CPU is a separate future optimization problem.
24. DIAGNOSE EVERY D1.3 → D1.4 DIFFERENCE
For the 384-run matrix, whenever D1.4 changes an outcome relative to D1.3, classify why:
- better release timing;
- setup accepted;
- setup rejected;
- different contact opportunity;
- different contact surface;
- physical ball state;
- planner-budget ordering;
- other.
We should understand what improved rather than merely observe a better percentage.
25. MATCHED-SEED COUNTERFACTUALS
Preserve random integrity.
For identical seed/input:
D1.3 and D1.4 should share all unrelated randomness.
A changed setup/release decision should alter the physical future causally.
Do not reshuffle unrelated random draws merely because planner behavior changed.
26. SIMPLE REVIEW PAGE
Do not build another giant visual package.
Show:
A — KNOWN EARLY-RELEASE FAILURE
90° right seed 16:
D1.3 vs D1.4
with:
- setup/release tick;
- predicted ball path;
- future foot corridor;
- actual contact.
B — BEST RECOVERED 60° CUT
D1.3 failure → D1.4 clean success.
C — BEST RECOVERED 90° CUT
D1.3 failure → D1.4 clean success.
D — REJECTED SETUP
Show one example where D1.4 correctly rejects a setup and loses/uses another touch rather than cheating.
E — STRAIGHT RUN
regression control.
Primary visual playback:
1× gameplay camera.
27. PERFORMANCE TABLE
Final report must include:
| Metric | D1.2 | D1.3 | D1.4 |
with:
- average CPU ms/s;
- worst spike;
- cuts taken / 384;
- clean cuts / 384;
- 60R per 8 over 96;
- 60L per 8 over 96;
- 90R per 8 over 96;
- 90L per 8 over 96;
- decisive toe %;
- ≥9 m/s decisive touches;
- setup attempts;
- setup success %;
- straight control;
- immediate same-foot recontact.
28. FREEZE DECISION
At the end, make a recommendation:
FREEZE DRIBBLE-V1 FOUNDATION
or:
ONE MORE FOUNDATION FIX REQUIRED.
The recommendation should be based on:
- causal correctness;
- visual football quality;
- reliability;
- CPU viability;
- determinism;
not on making every cut succeed.
STOP CONDITION
Stop for owner review when:
1. the known early-release failure has been causally addressed;
2. setup validation uses robust physical quality rather than being unnecessarily conservative;
3. clean-cut quality materially recovers toward D1.2;
4. 96-seed reliability is no worse overall than the approved foundation within reasonable variation;
5. decisive toe rate remains ≤15%;
6. ≥9 m/s decisive cut touches remain essentially zero;
7. straight control remains ≥95%;
8. physical interruption remains;
9. control loss remains possible;
10. TURN-1.2 remains bit-identical;
11. average CPU remains preferably ≤170 ms/s and never silently >190;
12. no giant synchronous planner spikes return;
13. Chrome/Node determinism passes.
FINAL REPORT
End with:
DRIBBLE-1.3 PERFORMANCE ARCHITECTURE PRESERVED: YES / NO
TURN-1.2 UNCHANGED: YES / NO
EARLY-RELEASE ROOT CAUSE ADDRESSED: YES / NO
CONTACT-TIMED RELEASE: PASS / PARTIAL / FAIL
SETUP VALIDATOR PRECISION/RECALL IMPROVED: YES / NO
SETUP VALIDATED AGAINST BALL-PHYS FUTURE: YES / NO
CUTS TAKEN: D1.2 [X] / D1.3 [X] / D1.4 [X]
CLEAN CUTS: D1.2 [X] / D1.3 [X] / D1.4 [X]
60R / 60L / 90R / 90L OVER 96 SEEDS: [VALUES]
DECISIVE TOE RATE: [X%]
≥9 M/S DECISIVE CUT TOUCHES: [COUNT]
STRAIGHT CONTROL: [X%]
IMMEDIATE SAME-FOOT RECONTACT: [X%]
PHYSICAL INTERRUPTION: PASS / FAIL
CONTROL LOSS POSSIBLE: YES / NO
AVERAGE CPU: [X MS/S]
WORST SPIKE: [X MS]
CHROME/NODE DETERMINISM: PASS / FAIL
READY TO FREEZE DRIBBLE-V1 FOUNDATION: YES / NO
Then give:
THREE VIDEOS TO WATCH FIRST
D1.2 / D1.3 / D1.4 TABLE
KNOWN EARLY-RELEASE CASE BEFORE/AFTER
BEST RECOVERED SETUP/CUT
WORST REMAINING FOUNDATION FAILURE
THREE REMAINING LIMITATIONS THAT SHOULD BE LEFT FOR ATTRIBUTES/DEFENDERS RATHER THAN FIXED IN THE GENERIC PLAYER
RECOMMENDED NEXT STEP
and stop.
PRIMARY DIRECTIVE
DRIBBLE-1.3 solved the CPU problem and its architecture is approved. Do not redesign or optimize it further. DRIBBLE-1.4 is the final generic-foundation cleanup: replace arbitrary early release with timing derived from the predicted physical ball/foot contact opportunity, improve the setup validator so it accepts robust physically viable setups without accepting bad ones, and recover the clean-cut quality lost from DRIBBLE-1.2 while preserving the new CPU performance, inside/outside contact quality, free physical ball, interruption, control loss and determinism. Judge reliability primarily over 96 seeds rather than overfitting eight fixtures. Once this is credible, freeze the generic foundation and move to Dribbling/Ball Control/Agility attributes.
