# User instruction, 2026-10-15 09:47 BST (verbatim): TACKLE-REACTION-1 — SHIP THE TWO-PLAYER SLIDE TACKLE

- Pasted by the owner into the Claude Code session at 09:47 BST on 15 Oct (08:47:14 UTC). The session had hit its weekly usage limit, so Claude did no work on it then; it resumed at 06:01 EEST on 16 Oct.
- The work was carried out in the meantime in the owner's Codex workspace: local branches `prototype/tackle-reaction-1` (`859ef12`, `741d086`) and its successors through `prototype/tackle-recovery-v1-2` (`dbc13ff`). See the chronicle's 15 Oct entry.
- Saved on 16 Oct under the standing rule (every owner instruction verbatim). The block below is reproduced exactly as received.

---

TACKLE-REACTION-1 — SHIP THE TWO-PLAYER SLIDE TACKLE
We are changing priorities based on visual review.
Stop developing generalized bump/recovery/balance behavior for now.
Preserve HAC-1 and all of its evidence, but freeze it as research. Do not delete or rewrite it.
The immediate product priority is:
Make the slide tackle and the tackled player's reaction look excellent at 1×.

We need Touchline out soon. I am willing to use a more controlled, tackle-specific authored + rigidbody solution rather than requiring a generalized physical balance system to discover the entire reaction.
Shoulder-to-shoulder behavior can be simplified later. For V1 it is acceptable if ordinary players mostly preserve their locomotion animation during contact, provided their physical bodies never phase through each other.
The slide tackle is different. It is a major football action and needs a convincing physical reaction.
1. ARCHITECTURAL DECISION
For this milestone use:
authored athletic intent + rigidbody physics + real contacts + finite active control.
Do NOT require:
- physics-generated running;
- a general-purpose balance controller;
- procedural recovery stepping;
- HAC-1 viability to discover the entire tackle reaction;
- generic bump behavior to be solved first.
The tackled player's reaction may have a purpose-built tackle reaction intent, just as the tackler has an authored tackle action.
This is acceptable provided:
- simulation/contact determines the authoritative tackle outcome;
- animation does not secretly decide whether the tackle succeeded;
- actual incoming position, velocity and momentum are preserved;
- contacts remain authoritative;
- rigidbody interruption remains possible;
- no presentation RNG changes outcomes;
- the system remains deterministic.
2. REFERENCE IS THE PRIMARY VISUAL TARGET
Re-watch the supplied slide-tackle reference footage carefully.
Study the recipient, not just the tackler.
I want you to reconstruct the character of the tackled player's response.
The important visual idea is:
runner has forward momentum
→ support/legs are taken from underneath him
→ pelvis continues travelling
→ upper body continues travelling
→ legs are displaced/swept
→ body becomes airborne/falls laterally-forward
→ arms react/protect
→ ground contact finishes the fall.
The recipient must NOT:
- continue RUN-1 after obvious support destruction;
- slowly kneel;
- crouch vertically;
- fold onto both knees;
- suddenly lose all momentum;
- trigger an unrelated generic fall;
- become a limp ragdoll instantly.
The reaction should read at normal speed as:
his legs have genuinely been taken from underneath a moving footballer.

3. STUDY THE REFERENCE FRAME BY FRAME
Before authoring the response, measure the reference.
Identify approximately:
- recipient velocity/direction before contact;
- recipient stride/support phase;
- which leg is struck;
- tackle contact location;
- first meaningful displacement of struck leg;
- pelvis trajectory;
- pelvis rotation;
- torso trajectory;
- torso rotation;
- free-leg trajectory;
- arm response;
- time from contact to obvious support loss;
- time from contact to fall commitment;
- first recipient ground contact;
- subsequent body contacts.
Do not obsess over exact pixel matching where perspective prevents it.
I care about the motion relationships and sequencing.
4. DO NOT REQUIRE THE REACTION TO EMERGE FROM RUN-1
This is an explicit change from HAC-1.
RUN-1 describes the athlete running before the tackle.
Once the simulation has established that a tackle has successfully destroyed support / produced a fall outcome, presentation may transition from:
RUN intent
to
TACKLED-FALL intent.
That is not the same as scripting the tackle outcome.
The authoritative result is already known.
The reaction animation/active physics is responsible for explaining that result convincingly.
5. PRESERVE THE COMPLETE STATE AT TRANSITION
This is critical.
When RUN transitions into TACKLED-FALL, initialize from the actual instantaneous state.
Preserve:
- world/root position;
- COM position;
- COM linear velocity;
- root/pelvis linear velocity;
- pelvis angular velocity;
- trunk velocity;
- segment linear velocities;
- segment angular velocities;
- joint positions;
- joint velocities;
- struck-leg velocity;
- free-leg swing velocity.
Do not reset momentum to fit the reaction animation.
The authored reaction must adapt to the incoming physical state.
The fall should therefore inherit the runner's real forward momentum.
6. AUTHOR THE FALL INTENT — DO NOT AUTHOR THE WORLD TRAJECTORY
The reaction may specify how the athlete tries to organize his body:
- hip flexion/rotation;
- leg organization;
- trunk organization;
- arm/protective response;
- shoulder posture;
- head protection;
- landing preparation.
It may NOT dictate:
- fake root displacement;
- fake COM acceleration;
- hidden upward/lateral impulses;
- world-space teleportation;
- a predetermined landing location.
Physics owns the trajectory.
Animation/control owns body organization within that trajectory.
This is the same distinction we have been using successfully for the tackler.
7. BUILD A PURPOSE-BUILT “SLICED-OUT” REACTION
Start with the reaction actually required by the supplied reference.
I want a physically interruptible authored intent for:
SLICED_OUT
Conceptually:
Phase A — contact/support destruction
The struck leg yields strongly to the collision.
Do not attempt to immediately restore its RUN pose.
Phase B — momentum carries body beyond support
Pelvis and torso retain the runner's forward momentum.
Do not collapse downward.
Do not kneel.
The body should travel.
Phase C — active fall organization
The player recognizes/expresses the fall:
- legs organize around the actual displacement;
- trunk begins appropriate lateral/forward rotation;
- arms move toward protective/bracing roles;
- head remains protected.
Phase D — ground interaction
Rigidbody contacts dominate.
Arms/hips/thigh/torso may yield.
No pose is allowed to override the ground.
Phase E — settle
Allow a physically plausible settled state.
Do not build the get-up unless needed for testing.
8. REACTION MUST BE ACTIVE, NOT RAGDOLL
The player being tackled is conscious and athletic.
During the fall retain finite muscular/active authority.
In particular:
- protect head/neck;
- avoid obviously pathological joint configurations;
- organize arms for landing;
- allow hips/knees to yield;
- maintain some trunk organization.
But contacts always win.
If another body prevents the intended pose, the body yields.
9. TACKLER: PRESERVE F2 AND F3 INITIALLY
Keep:
SP2F2
and
SP2F3
as separate candidates.
Do not hybridize them immediately.
First test the new recipient reaction against both.
We already know:
- F2 has useful characteristics;
- F3 has useful characteristics;
- neither has yet earned canonical status.
10. BUT YOU MAY CHANGE TACKLE CONTACT GEOMETRY
Previous evidence suggests the current F2/F3 contact is too often:
boot-on-boot.
That is likely wrong for the reference response.
You are authorized to investigate and modify the tackling-leg contact trajectory/height while preserving the overall F2/F3 tackle character.
Test plausible contact regions including:
- boot/ankle;
- ankle;
- low shin;
- lower shin.
Do not simply increase collision force.
The question is:
Where must the tackling leg contact the loaded recipient leg for the support leg to be physically swept/rotated in the way shown by the reference?

11. BUILD A SMALL CONTACT-GEOMETRY SWEEP
Use the same incoming recipient state and tackle velocity.
Vary only justified contact geometry.
Record:
- contact location;
- contact impulse;
- struck-leg velocity;
- struck-foot displacement;
- ankle/knee/hip response;
- support load;
- pelvis response;
- tackler momentum loss;
- recipient momentum;
- penetration;
- pinning.
Reject geometries that:
- pin the foot;
- crush vertically;
- require impossible joint motion;
- cause pathological loads;
- make the tackler stop dead.
12. USE THE REFERENCE STRIDE PHASE
The reference recipient is not a generic standing C3 body.
Recreate the closest defensible running/support phase available from RUN-1.
If the reference shows a meaningfully loaded support leg, use that.
Do not deliberately choose an unloading foot merely because it falls more easily.
We want the physical contact and authored reaction to work for the actual reference condition.
13. PURPOSE-BUILT REACTION MAY USE CONTACT CONTEXT
Feed the reaction resolver useful authoritative facts such as:
- struck leg;
- contact point;
- impulse direction;
- impulse magnitude;
- recipient velocity;
- pelvis velocity;
- support state;
- fall direction/outcome supplied by simulation.
The reaction may adapt itself from these.
Do not build one brittle fixed pose sequence.
But do not turn this milestone into a universal machine-learned/general balance system either.
Build the smallest robust parameterized reaction appropriate for shipping.
14. REACTION TIMING
Avoid the current HAC-1 failure:
tackle happens
→ recipient keeps RUNNING
→ 0.5–1 s later generic fall occurs.
Once the authoritative tackle result says support has been destroyed/fall is committed, the recipient reaction must begin immediately and continuously.
There should be a clear causal visual chain from:
impact
to
support loss
to
body flight/fall.
No unexplained delay.
15. MOMENTUM IS A HARD REQUIREMENT
Plot the recipient COM/root velocity.
A running player who gets taken out must carry meaningful forward momentum into the fall.
Reject candidates where:
- forward velocity suddenly disappears;
- pelvis stops before falling;
- body falls mostly vertically;
- player kneels beneath his previous position.
The fall should travel.
16. ARMS / PROTECTIVE RESPONSE
The arms should react like an athlete falling at speed.
Do not use the current slow:
sink → hands/knees
response.
Build an active protective response appropriate to the actual fall direction.
It may involve:
- reaching/bracing;
- one arm posting before another;
- shoulder yielding;
- elbow yielding;
- protecting the head.
Keep hand/arm turf friction low enough that a planted hand does not unrealistically stop the entire moving body.
17. NO KNEELING FAILURE
Add an explicit visual diagnostic for the current bad behavior.
Measure whether, immediately after tackle commitment:
- both knees flex symmetrically underneath the pelvis;
- pelvis vertical velocity dominates horizontal motion;
- the body enters a crouched/kneeling posture.
For the reference SLICED_OUT reaction, that is a rejection condition unless directly caused by unavoidable collision geometry.
18. RIGIDBODY AUTHORITY
You have explicit permission to move the tackled recipient more strongly toward rigidbody/active-ragdoll authority after tackle commitment than HAC-1 did.
Do not preserve RUN tracking simply for architectural purity.
RUN is over.
The player is now executing:
TACKLED-FALL.
If the best solution is:
authored initial fall organization + high rigidbody authority + finite active stabilization
use it.
That is preferable to an ugly generalized balance solution.
19. DO NOT SOLVE SHOULDER BUMPS
Freeze generalized shoulder-contact development.
Do not spend time tonight on:
- BRUSH recovery;
- BUMP recovery;
- STRONG shoulder falls;
- RUN-2;
- sidestepping;
- general recovery stepping.
Preserve HAC-1 as research.
For future V1 shoulder-to-shoulder interaction, our minimum acceptable fallback is:
players retain their locomotion animation but physical/collision geometry prevents interpenetration.

They may slide/separate rather than physically stumble.
Never phasing through one another is the hard requirement.
Sophisticated bump reactions can come later.
20. DO NOT BUILD PHYSICS-GENERATED RUNNING
Still prohibited for this milestone.
Do not:
- redesign M1b for running;
- build tendon-driven gait;
- build a gait controller;
- build a general balance controller;
- make RUN-1 physically self-generated.
Use RUN-1 until the tackle reaction begins.
21. BUILD SEVERAL REACTION CANDIDATES IF NECESSARY
You have authority to iterate.
For example:
TR1-A
more authored early body organization.
TR1-B
earlier high rigidbody authority.
TR1-C
different protective-arm organization.
These are examples, not required names.
Preserve failed candidates.
Judge primarily at 1×.
22. NORMAL-SPEED VISUAL QUALITY IS THE GATE
Do not qualify the reaction because plots look good.
Watch/render it at normal speed.
The viewer should immediately perceive:
a running footballer had his support taken away by a slide tackle.

If instead it reads as:
- generic ragdoll;
- kneeling;
- diving voluntarily;
- continuing to run;
- falling long after contact;
- animation snapping;
reject it.
23. REVIEW PAGE
Build a review page centered on the complete two-player event.
Primary comparison:
REFERENCE | F2 + BEST RECIPIENT | F3 + BEST RECIPIENT
synchronized around first contact.
Give me:
- clean 1× close view;
- clean 0.25×;
- side view;
- useful front/rear 3/4;
- diagnostic skeleton/contact view.
Start before tackle commitment and continue through the recipient's ground landing/settling.
I need to see the entire causal event.
24. INCLUDE FROZEN FRAMES
Include approximately:
−200 ms
−100 ms
CONTACT
+50 ms
+100 ms
+200 ms
+300 ms
+500 ms
+750 ms
+1.0 s
relative to meaningful player-player contact.
Compare recipient body geometry against the reference.
25. DIAGNOSTICS
Plot:
- recipient COM position/velocity;
- pelvis position/velocity;
- pelvis angular velocity;
- struck-leg trajectory;
- free-leg trajectory;
- support load;
- recipient animation/physical authority;
- tackler COM;
- contact impulse;
- recipient ground-contact sequence.
Mark the exact moment:
RUN intent ends / TACKLED-FALL intent begins.
26. COLLISION ROBUSTNESS
Once the canonical reaction looks good, make small perturbations:
- slightly earlier contact;
- slightly later contact;
- slightly more glancing;
- slightly stronger/direct.
The reaction need not look identical.
It must remain physically coherent and recognizable as the same reaction family.
Do not build a huge matrix.
27. SIMULATION/PRESENTATION BOUNDARY
Keep the architecture clean.
The simulation/authoritative layer should provide facts such as:
- tackle succeeded/failed;
- contacted player;
- contact geometry;
- relevant impulse/state;
- resulting authoritative trajectory/state where applicable.
Presentation chooses/resolves the appropriate visual explanation.
The visual reaction must not secretly change whether the tackle succeeded.
Preserve the long-term requirement:
simulation decides what happens; animation explains what happened.
28. SHIPPING MINDSET
Do not turn this into another general character-physics research project.
We need a game.
I would rather have:
one excellent, physically responsive slide-tackle reaction
than:
a theoretically general balance controller that makes every fall look bad.
Solve the football action in front of you.
Keep the implementation extensible, but optimize for getting a convincing result into Touchline.
29. STOP CONDITION
Stop for owner review once you have:
1. at least one complete two-player slide tackle that looks materially close to the reference at 1×;
2. a recipient who clearly loses support and carries momentum into the fall;
3. no continuing RUN after committed support loss;
4. no kneeling/crouching generic fall;
5. active protective behavior rather than dead ragdoll;
6. real rigidbody contact throughout;
7. deterministic replay;
8. F2/F3 comparison;
9. contact-height findings;
10. a clear recommendation for the next shipping step.
Do not return to shoulder-bump development before this review.
FINAL STATUS
Report:
REFERENCE RECIPIENT MOTION UNDERSTOOD: YES / PARTIAL / NO
RUN → TACKLED-FALL TRANSITION: PASS / PARTIAL / FAIL
INCOMING MOMENTUM PRESERVED: PASS / FAIL
STRUCK LEG PHYSICALLY YIELDS: PASS / PARTIAL / FAIL
SUPPORT LOSS VISUALLY READABLE: PASS / PARTIAL / FAIL
RECIPIENT CONTINUES RUN AFTER COMMITTED TACKLE: YES / NO
SLICED-OUT CHARACTER: PASS / PARTIAL / FAIL
KNEELING FAILURE REMOVED: YES / NO
ACTIVE FALL/PROTECT RESPONSE: PASS / PARTIAL / FAIL
GROUND CONTACT PHYSICAL: YES / NO
F2 VISUAL RESULT: PASS / PARTIAL / FAIL
F3 VISUAL RESULT: PASS / PARTIAL / FAIL
BEST CONTACT REGION: BOOT / ANKLE / LOW SHIN / LOWER SHIN / OTHER
DETERMINISM: PASS / FAIL
READY FOR OWNER VISUAL REVIEW: YES / NO
Then give me:
BEST CURRENT VIDEO
THREE BIGGEST VISIBLE DEFECTS AT 1×
RECOMMENDED NEXT SHIPPING STEP
THE ONE THING TO REMEMBER
Stop trying to make a generalized running/balance system discover a beautiful tackle fall. Build the tackle victim's athletic reaction deliberately, initialize it from the real collision and momentum, and let rigidbody physics determine how that organized body actually travels and lands.

Make this two-player slide tackle good.
