# User instruction, 2026-10-15 ≈ 04:15 BST (verbatim): NIGHT MISSION, HYBRID ACTIVE-PHYSICS CHARACTER V1

**Context:**
- Received after HYBRID-RUN-1 (`6e425dd7`, local).
- The owner pasted the block below with no other text; it is treated as the owner's instruction.
- The first word is reproduced exactly as pasted ("RNIGHT").

**Terms used below:**
- "The existing HYBRID-RUN-1 evidence" = `hybrid_run1/` (`6e425dd7`).
- "PVP-1" = `pvp1_running/` (`9d2e9512`, collision review `af04ffb1`).
- "REFERENCE" = REFERENCE3 (outside Git).

---

RNIGHT MISSION — HYBRID ACTIVE-PHYSICS CHARACTER V1
I am going to bed. You have a long runway tonight.
I do not want another small diagnostic that stops after identifying the next problem.
I want you to make substantial implementation progress toward the actual character-contact architecture we now intend to use.
You have authority to:
- inspect all relevant current code and prior work;
- research established animation/active-ragdoll/contact/recovery approaches where useful;
- design the architecture;
- implement it;
- build diagnostic fixtures;
- iterate through failures;
- tune defensible parameters;
- add tests;
- render visual comparisons;
- reject failed candidates;
- commit coherent milestones locally.
Work for the available session rather than stopping at the first obstacle.
Do not wait for me on minor implementation choices.
Stop only for a genuinely consequential design decision that cannot responsibly be made without owner input.
PRODUCT CONTEXT / SCOPE
Touchline needs to ship soon.
We are not trying to build a first-principles biomechanical locomotion simulator before release.
The intended architecture is:
Authored animation expresses deliberate athletic action.
An active physical character tracks that action with finite authority.
Real contacts can disturb, constrain, redirect or defeat it.
The system determines continuously whether the intended action remains physically viable and adapts animation authority accordingly.

We should be able to use this architecture for:
- running;
- shoulder-to-shoulder contact;
- pushes;
- shielding;
- trips;
- slide tackles;
- falls;
- eventually aerial contact, kicks under pressure, etc.
Do not build physics-generated running tonight.
RUN-1 remains the authored locomotor intent.
CURRENT EVIDENCE
Preserve and study the existing HYBRID-RUN-1 and PVP-1 evidence before changing anything.
We have already demonstrated:
- RUN-1 can coexist with a fully collidable physical body underneath it;
- the no-contact hybrid follows RUN-1 without collapsing during the available RUN-1 data;
- contacts can override the body region-by-region rather than through an instantaneous global ragdoll switch;
- shoulder contact can physically disturb the character;
- slide-tackle contact can override/displace the struck leg within roughly 100 ms;
- collision-induced displacement is preserved rather than animation immediately snapping the body back;
- F2/F3 can genuinely sweep the recipient's foot;
- the current tackle victim nevertheless keeps trying to RUN after support has been destroyed, producing the horrible visual result I reviewed;
- shoulder disturbances currently have the opposite problem: even small pushes eventually cause failure because there is no meaningful recovery-foot-placement behavior;
- the current “animation-consistency” pelvis moment has no satisfactory physical source and becomes especially problematic after disturbance.
These are architectural clues, not isolated bugs.
PRIMARY MISSION
Implement the missing layer between:
authored action intent
and
authoritative physical state.
The system must answer continuously:
How physically viable is the action the character is currently trying to perform?

For this milestone, focus on RUN-1.
A running player should be able to:
run normally
→ absorb a small physical disturbance
→ adapt/recover from a meaningful disturbance
→ lose the ability to continue RUN when physical support is genuinely destroyed
→ transition into an actively controlled physical fall/protect response rather than continuing RUN or becoming an instantaneous limp ragdoll.
1. BUILD A CONTINUOUS ACTION-VIABILITY MODEL
Do not implement:
NORMAL / RECOVERY / RAGDOLL
as three arbitrary hard-coded switches.
Build a continuous, deterministic viability/recoverability representation.
A useful conceptual output is:
actionViability ∈ [0,1]
but choose the internal representation that best fits the existing architecture.
Viability should derive from physically meaningful state.
Investigate at minimum:
- current supporting contacts;
- load on each foot;
- support-foot displacement;
- support geometry;
- COM position relative to available support;
- COM velocity relative to support;
- pelvis translation and angular state;
- trunk orientation/angular velocity where relevant;
- collision impulse;
- direction of disturbance;
- whether current support is unloading;
- free-foot state;
- free-foot height;
- free-foot velocity;
- time until plausible next contact;
- physically reachable recovery locations;
- required recovery-step distance;
- required recovery-step velocity;
- available finite physical/tracking authority.
Do not simply compute:
big collision = low viability.
The same collision should be recoverable or unrecoverable depending on support/stride state.
2. REGIONAL AUTHORITY
Action viability must be able to influence the body regionally.
Do not globally fade RUN uniformly.
Example:
a slide tackle strikes the loaded right leg.
The intended causal progression may be:
right leg
loses RUN tracking authority rapidly because contact physically displaced it;
pelvis
becomes increasingly physical because its support is disappearing;
free/swing leg
may retain RUN/recovery intent temporarily;
trunk
retains forward momentum and active organization;
arms
transition toward balance/protection.
If recovery becomes impossible, the loss of locomotor authority propagates through the body.
Build a general mechanism for this rather than coding a slide-tackle exception.
3. ANIMATION IS INTENT, NOT A KINEMATIC COMMAND
RUN-1 should continue to describe what the athlete wants to do.
But once physical state diverges:
- animation must not teleport joints back;
- animation must not erase collision velocity;
- animation must not drag the root back onto the intended path;
- animation must not restore a swept support foot;
- animation must not keep the pelvis upright using unexplained external forces.
Finite active tracking may attempt recovery.
Contacts always win.
4. REMOVE / REPLACE THE UNPHYSICAL PELVIS-CONSISTENCY FORCE
Audit the current capped external “animation-consistency” pelvis moment.
The current evidence says it has no physical source, RUN-1 requires it to reproduce some authored body rotation, and after collision it becomes 3–5× more consequential and resists the physical rotation caused by contact.
Do not quietly preserve this as the final solution.
Determine the smallest defensible architecture.
Possibilities may include:
- finite internal joint tracking;
- allowing the physical pelvis to deviate from RUN-1;
- procedural adaptation of the animated pose to the physical root/pelvis;
- support-ground reaction where actually justified;
- some combination.
But do not create unexplained world-space forces merely to make the physical skeleton match animation.
If perfect RUN-1 reproduction is physically inconsistent, allow physical deviation.
Presentation fidelity does not justify hidden force generation.
5. IMPLEMENT RECOVERY FOOT PLACEMENT
Unlike the previous narrow prototype, I now want meaningful progress on actual recovery.
A sideways-disturbed runner currently continues the original RUN-1 stepping pattern even though the COM has moved.
Fix that.
Implement the smallest general procedural recovery-foot-placement system that can adapt an upcoming RUN-1 step to the actual physical state.
It should determine:
- which foot can plausibly recover;
- where support is needed;
- whether that location is reachable;
- when the foot can arrive;
- how much the authored step can be modified without becoming implausible.
The recovery system may procedurally adjust the upcoming foot trajectory/placement while preserving as much RUN-1 motion character as possible.
Do not build a full gait generator.
RUN-1 still supplies:
- cadence;
- general stride;
- locomotor style;
- deliberate running action.
Recovery modifies what is necessary because physics moved the athlete.
6. RECOVERY MUST HAVE PHYSICAL LIMITS
Do not make recovery magical.
If the required recovery step is:
- too far;
- too fast;
- on the wrong side of the body;
- incompatible with the current swing phase;
- impossible before COM/support failure;
then recovery must fail.
Do not teleport the recovery foot.
Do not accelerate it arbitrarily.
Do not force it through bodies.
Do not instantly restore the COM.
This is what should distinguish:
bump → recover
from
support destroyed → fall.
7. SHOULDER-CONTACT TARGET
Preserve the useful shoulder-bump behavior already demonstrated.
Build/test at least:
BRUSH
BUMP
STRONG
with identical deterministic setups.
Desired qualitative spectrum:
BRUSH
→ upper-body physical disturbance
→ RUN remains highly viable
→ perhaps small foot-placement adaptation
→ player continues running.
BUMP
→ meaningful lateral displacement/lean
→ visible recovery step or stride adaptation
→ player reorganizes and continues if physically feasible.
STRONG
→ substantial disturbance
→ emergency recovery attempt
→ recovery OR fall depending on actual state.
Do not force those outcomes by label.
8. SLIDE-TACKLE TARGET
The current tackle visual is unacceptable because the victim essentially keeps running.
Preserve the existing frozen F2/F3 tackle candidates and collision geometry initially.
The collision already demonstrates real support-foot displacement.
The new architecture must now recognize when RUN has become physically impossible.
The desired causal sequence for a successful sweep is:
loaded support leg struck
→ leg physically displaced
→ support load collapses
→ RUN tracking of struck leg loses authority
→ pelvis loses its support
→ free leg attempts physically available continuation/recovery
→ if no viable support can be established in time:
RUN viability collapses
→ pelvis/trunk retain their real momentum
→ legs are removed from underneath the athlete
→ recipient is physically sliced out / falls.
The system must not contain:
if slideTackle then fall.
The same support-loss machinery must work for other disturbances.
9. FALL DOES NOT MEAN DEAD RAGDOLL
When RUN becomes impossible:
locomotion authority may collapse.
muscular/protective authority should not necessarily collapse.
Implement a minimal active fall/protect intent sufficient for this architecture.
Consider:
- head protection;
- trunk organization;
- arm bracing/posting;
- avoiding pathological joint configurations;
- finite leg organization where physically possible.
Do not spend the whole night authoring a perfect fall library.
The objective is:
athlete loses locomotion but remains an active human body.

Contacts remain authoritative.
10. RECOVERY FROM PHYSICAL DISTURBANCE
If viability rises again after a successful recovery step, allow animation authority to return progressively.
Do not snap back to RUN-1.
Preserve:
- actual world displacement;
- actual heading deviation where appropriate;
- actual velocity change.
Blend/reconcile the authored gait to the new physical trajectory.
Avoid visible pose pops.
11. HYSTERESIS / STABILITY
Prevent authority from oscillating rapidly around thresholds.
A player near the viability boundary must not flicker:
RUN → FALL → RUN → FALL.
Use physically defensible hysteresis/time integration where needed.
Keep everything deterministic.
12. DO NOT OVERBUILD ATTRIBUTE INTEGRATION TONIGHT
Architect the system so attributes can eventually influence:
- stabilization authority;
- recovery reach;
- recovery speed;
- balance;
- strength;
- agility;
- fatigue effects.
But do not block this milestone on full attribute integration.
First make the generic physical character behave correctly.
13. RESEARCH AUTHORITY
You may research:
- active ragdolls;
- animation-driven rigid bodies;
- physical animation;
- capture-point / extrapolated-COM balance;
- support polygons;
- push recovery;
- procedural foot placement;
- disturbance recovery in locomotion;
- physically based animation blending.
Use research to inform the design.
Do not cargo-cult a paper or engine implementation.
Record what sources informed any important equations/thresholds and distinguish:
- measured;
- literature-derived;
- inferred;
- tuned.
14. DO NOT BUILD FULL PHYSICS-GENERATED LOCOMOTION
This is a hard scope boundary for this mission.
Do NOT spend the night building:
- tendon-driven gait;
- central pattern generators;
- muscle-generated running;
- physical stride generation from scratch;
- a replacement for RUN-1.
We are deliberately testing/implementing:
authored locomotion + active physical interruption + procedural recovery.
15. TEST MATRIX
Build a deterministic regression battery.
At minimum:
A. UNDISTURBED
RUN-1 hybrid with no contact.
Must remain stable.
B. BRUSH
small shoulder contact.
C. BUMP
meaningful shoulder contact.
D. STRONG SHOULDER
large shoulder disturbance.
E. PUSH FROM OPPOSITE SIDE
prove directional generality.
F. PVP-F2
current slide tackle.
G. PVP-F3
current slide tackle.
H. TACKLE — EARLIER SUPPORT PHASE
only after the original frozen PVP comparison is preserved.
Move tackle timing so the same target leg is contacted while meaningfully loaded.
I. TACKLE — UNLOADING PHASE
compare against the current late/unloading behavior.
This should demonstrate that identical tackle geometry can produce different results because of stride/support state.
16. COUNTERFACTUALS
For every disturbed case preserve a no-contact twin with identical initial state.
This is essential.
I want to know:
What did the collision actually change?

For tackle cases, compare:
- support load;
- support duration;
- foot displacement;
- COM;
- pelvis;
- free-foot trajectory;
- viability;
- animation authority;
- fall/recovery timing
against the twin.
17. VISUAL REVIEW IS REQUIRED
Do not give me only tables tomorrow.
Build a useful review page.
At minimum:
SHOULDER
TWIN | BRUSH | BUMP | STRONG
at 1× and 0.25×.
TACKLE
REFERENCE | TWIN | F2 | F3
at 1× and 0.25×.
Also show the earlier-loaded tackle timing if it becomes meaningful.
Give close cameras where I can actually see:
- feet;
- support loss;
- pelvis;
- trunk;
- collision.
Include clean views and diagnostic views.
18. DIAGNOSTIC OVERLAY
Show, without cluttering the clean videos:
- current action intent;
- action viability;
- recoverability;
- per-region animation authority;
- support-foot loads;
- COM;
- support geometry;
- intended recovery-foot location;
- actual recovery-foot location;
- collision impulses;
- physical pose vs animation target.
I want to be able to see why the controller decided RUN was viable or impossible.
19. MOST IMPORTANT VISUAL ACCEPTANCE TEST
At normal speed:
BRUSH
should look like:
footballer keeps running while absorbing a small bump.
BUMP
should look like:
footballer is knocked off line, visibly adapts the next step and recovers.
SUCCESSFUL SLIDE TACKLE
should look like:
support is swept → legs disappear from underneath him → forward-moving upper body cannot continue the running stride → he falls physically.
It must NOT look like:
support is swept → RUN animation continues → player magically runs onward.
20. ITERATE
Do not stop after version 1 if it obviously fails visually or mechanically.
Diagnose failures.
Build V2/V3 candidates where justified.
Preserve failed candidates and logs.
Prefer changes with causal explanations.
Do not tune separately for individual fixtures unless the parameter genuinely represents physical/contextual state.
Avoid magic constants whose sole purpose is passing one clip.
21. PERFORMANCE
Measure CPU cost.
This eventually needs to support a football match with many active characters.
Do not prematurely optimize, but identify obviously expensive architecture.
Record:
- cost per character per step;
- cost of viability;
- cost of recovery-foot planning;
- cost of physical tracking.
22. PRESERVE DETERMINISM
Runs must remain deterministic.
Do not introduce uncontrolled randomness.
Identical state + identical contact must produce identical response.
23. KEEP PRESENTATION / SIMULATION BOUNDARY EXPLICIT
Touchline's rule remains:
simulation decides what happens; presentation explains what happened.

This prototype is exploring physical character response, but do not silently introduce presentation-only physics that changes authoritative match outcomes.
Document which outputs would need to become authoritative simulation facts if this system ultimately determines:
- whether support is lost;
- whether recovery succeeds;
- whether a player falls;
- resulting position/velocity.
Preserve animation ON/OFF outcome neutrality as a production requirement.
Do not solve that entire integration tonight if premature, but do not bury the architectural issue.
24. WHAT I WANT WHEN I WAKE UP
Do not simply tell me:
“the architecture is promising but needs more work.”
I want:
1. a working implemented viability/recoverability system;
2. regional animation/physics authority;
3. meaningful procedural recovery-foot placement;
4. removal or principled replacement of the unphysical pelvis-consistency force;
5. shoulder bumps where at least modest disturbances can recover;
6. a slide-tackle victim that no longer blindly continues RUN after its support has been physically destroyed;
7. at least a minimal active fall/protect response;
8. deterministic regression tests;
9. useful normal-speed videos;
10. a review page;
11. performance measurements;
12. a clear list of remaining blockers.
If some item cannot be completed, give me the implemented partial result plus hard evidence explaining the blocker.
25. DO NOT WAIT FOR OWNER INPUT ON THESE
You are authorized tonight to make reversible development decisions about:
- viability equations;
- support metrics;
- recovery-step planner;
- regional authority curves;
- hysteresis;
- active fall stabilization;
- diagnostic tooling;
- test fixtures;
- temporary development thresholds;
- procedural foot adjustment.
Label assumptions clearly.
Preserve previous versions.
Do not freeze questionable parameters as canonical merely because they work.
26. STOP / OWNER-DECISION CONDITIONS
Stop rather than silently making a permanent architectural decision if you discover that success requires:
- replacing RUN-1;
- redesigning canonical M1b;
- adding physics-generated locomotion;
- changing authoritative match outcomes in presentation without an explicit integration plan;
- breaking existing deterministic simulation guarantees;
- fundamentally changing the character skeleton/body specification.
Otherwise continue.
FINAL REPORT
End with concise statuses:
UNDISTURBED HYBRID RUN: PASS / PARTIAL / FAIL
BRUSH RECOVERY: PASS / PARTIAL / FAIL
BUMP RECOVERY: PASS / PARTIAL / FAIL
STRONG CONTACT RESPONSE: PASS / PARTIAL / FAIL
PROCEDURAL RECOVERY STEP: PASS / PARTIAL / FAIL
CONTINUOUS ACTION VIABILITY: PASS / PARTIAL / FAIL
REGIONAL ANIMATION AUTHORITY: PASS / PARTIAL / FAIL
UNPHYSICAL PELVIS FORCE REMOVED/REPLACED: YES / PARTIAL / NO
TACKLED SUPPORT LEG OVERRIDES RUN: PASS / PARTIAL / FAIL
RUN STOPS WHEN PHYSICALLY IMPOSSIBLE: PASS / PARTIAL / FAIL
SLICED-OUT RESPONSE CAN EMERGE WITHOUT SCRIPTED TACKLE FALL: YES / PARTIAL / NO
ACTIVE FALL/PROTECT RESPONSE: PASS / PARTIAL / FAIL
NO-CONTACT TWIN REMAINS VALID: YES / NO
DETERMINISM: PASS / FAIL
CPU VIABLE FOR MATCH-SCALE DEVELOPMENT: YES / PARTIAL / NO
FULL PHYSICS-GENERATED RUNNING REQUIRED: YES / NO
HYBRID ARCHITECTURE RECOMMENDED FOR TOUCHLINE: YES / PARTIAL / NO
READY FOR OWNER VISUAL REVIEW: YES / NO
Then tell me the three biggest remaining defects visible at 1×, not merely the three worst numerical deviations.
GUIDING PRINCIPLE
Keep this sentence in mind throughout the mission:
The animation describes the athlete's intention. Physics determines what the athlete is actually able to do. Recovery adapts the intention to the new physical state. If the intended action becomes physically impossible, stop forcing it and let the athlete actively fail.

Make meaningful progress toward that complete system tonight.
