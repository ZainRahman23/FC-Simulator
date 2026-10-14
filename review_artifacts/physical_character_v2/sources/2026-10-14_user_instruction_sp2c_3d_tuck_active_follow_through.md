# User instruction, 2026-10-14 ≈ 15:53 BST (verbatim): SP2C — 3D leg tuck + active physical follow-through

The message was one pasted block, with no attachment. "The attached/reference tackle footage" means the broadcast slide-tackle reference used for SP2, SP2A and FSWEEP, which is kept outside Git.

**Context:** received after the body-friction sweep (`58b055de`, local).

---

SP2C — 3D LEG TUCK + ACTIVE PHYSICAL FOLLOW-THROUGH
The friction sweep has answered the friction question well enough for now, and I have visually reviewed the variants.
Do not continue broad friction calibration yet.
My visual judgment is:
- F50 is still somewhat too resistant;
- F25 is clearly too slippery;
- the useful development region appears somewhere between them, approximately F35–F40;
- however, the current pose/follow-through defects contaminate slide-distance judgment, so I do NOT want to choose a canonical coefficient yet.
For this mission, use approximately F37.5 as a clearly labelled temporary development value, while preserving the entire FSWEEP evidence unchanged.
Do not adopt F37.5 into canonical V2.
Preserve what now works
SP2A has made important progress. Do not casually redesign it.
Preserve:
- seamless RUN → tackle transition;
- authored deliberate commitment;
- physically legitimate whole-body momentum;
- no invented airborne COM acceleration;
- folded-side ground entry instead of tackling-heel plant;
- tackling studs remaining clear;
- physical turf contact;
- collision authority over animation;
- deterministic execution;
- existing physical slide architecture.
The current mission is refinement of body organization, not another tackle rewrite.
Do not modify:
- C3;
- recipient mechanics;
- authoritative simulation;
- RUN-1;
- ball physics.
Do not begin the running-recipient experiment.
Problem 1 — the folded/back leg is still not actually tucked
I have visually reviewed the friction sweep closely.
The folded/back leg — the player's left leg in the current reviewed tackle — still looks wrong.
The knee is too far away from the pelvis/body.
It currently reads approximately as:
hip → knee projecting outward → shin folding back → foot hanging downward
rather than a compact football slide-tackle tuck.
The desired organization is closer to:
hip/pelvis rotates
→ folded knee travels laterally/inward toward and underneath/alongside the pelvis
→ shin folds backward alongside the body
→ foot/ankle folds with the shin
→ the entire folded leg becomes a compact lateral sliding package.
This is NOT simply a request for more knee flexion.
Treat:
pelvis → hip → knee → ankle → foot
as one coordinated 3D chain.
Use the attached/reference tackle footage again.
Study specifically the folded leg from the final running stride through first turf contact and established slide.
Determine what combination of:
- hip flexion;
- hip ab/adduction;
- hip internal/external rotation;
- knee flexion;
- knee trajectory relative to pelvis;
- ankle plantar/dorsiflexion;
- anatomically available inversion/eversion;
- foot orientation
produces the compact posture visible in the reference.
Do not blindly copy screen-space angles.
Problem 2 — folded foot/toe is becoming the new ground brake
The original major defect was the tackling boot/studs planting.
That is substantially improved.
But in the current folded leg, the ankle/foot is still insufficiently tucked. The toe/forefoot can become the low point and contact the turf before/too strongly relative to the rest of the folded leg.
I do not want us to solve one boot-ground problem and replace it with another.
The folded foot should become compact with the folded shin.
At ground entry and through the main slide:
- studs should face away from the turf;
- toe should not spear into the turf;
- heel should not become a brake;
- the foot may skim/contact where physically natural;
- but it should not become a major load-bearing or braking surface.
Use a modest authored ankle orientation where anatomically legitimate.
Do not disable the foot collider.
Do not make the foot frictionless independently just to hide bad orientation.
If the foot is physically pushed into the turf, it must still collide normally.
Problem 3 — establish the tuck BEFORE landing
SP2A's report found that the full 3D tuck is reached during the slide rather than being substantially established when the folded side first reaches the turf.
Correct this.
Since the deliberate tackle choreography is allowed to be authored, begin the tuck earlier.
The final running stride itself may already contain:
- pelvis reorientation;
- folded-side hip rotation;
- lateral/inward knee movement;
- ankle/foot reorientation;
- trunk counter-motion;
- arm preparation.
Do not wait until airborne or until turf contact to begin all of this.
At first legitimate folded-side turf contact, the leg should already be substantially in its intended sliding configuration.
Contact should then settle/refine the posture physically rather than forcing the motors to manufacture the tuck while the knee is already heavily loaded.
Preserve pose AND velocity continuity through RUN → tackle.
No setup pose.
Problem 4 — the slide currently stops behaving like an active human
This is the other major visual defect.
During the later slide/follow-through, the character stops reading as a footballer deliberately completing a tackle and starts reading like a passive ragdoll.
Do not accept this.
A real player remains muscularly active during and after ground contact.
The end of the deliberate tackle animation should NOT mean:
active athlete → passive ragdoll.
Instead build an authored physical follow-through intent continuing through the slide.
The player should continue attempting to:
- keep the folded leg compact;
- maintain sensible pelvis organization;
- control the tackling leg;
- organize the trunk;
- protect/control the head;
- use the arms for balance/posting;
- resist simply collapsing face-first;
- transition toward a plausible end-of-slide/recovery posture.
This remains finite physical intent, not pose locking.
Turf and player contacts always win.
Authority should evolve, not disappear
Design the tackle as overlapping physical-control phases rather than an abrupt animation/ragdoll switch.
A useful conceptual starting point is:
1. RUN → COMMIT
Strong authored athletic intent.
2. DIVE / SCISSOR / TUCK
Strong but finite authored intent while physically valid whole-body momentum governs the trajectory.
3. GROUND ENTRY
Contacts become increasingly authoritative.
Authored intent continues.
Local limbs yield where obstructed.
4. ESTABLISHED SLIDE
Physics/inertia/turf dominate whole-body translation.
But moderate muscular/authored intent continues organizing:
- pelvis;
- folded leg;
- tackling leg;
- trunk;
- head;
- arms.
5. FOLLOW-THROUGH
The player remains an active athlete unless the physical disturbance actually warrants loss of control.
Do not automatically transition to ragdoll because the tackle animation timeline ended.
6. SEVERE DISRUPTION
Only genuine physical failure/large obstruction should progressively overwhelm regional control and, if necessary, produce whole-body ragdoll.
Do not blindly implement these as fixed percentages. Determine appropriate finite authority experimentally.
Arms/hands
In the friction diagnostic we deliberately made arms/hands low-friction so they would not obscure the body-slide experiment.
Keep them relatively non-braking for this development pass.
Their primary purpose here is:
- balance;
- posting;
- controlling trunk roll;
- protecting the fall;
- contributing to a believable athletic follow-through.
Do not let a planted hand become a giant horizontal brake.
But do not make arms cosmetic animation either.
If the hand/forearm contacts the turf:
- it carries real normal load;
- collision wins;
- elbow/shoulder can yield;
- it can redirect body rotation.
Knee contact is allowed and expected
Do NOT interpret this mission as “get the knee off the turf.”
The folded knee/lateral lower leg can and probably should remain part of the sliding surface.
The problem is not that the knee slides.
The desired surface is approximately:
lateral lower leg / knee + outer thigh + hip
all participating as the body settles.
The folded leg should slide along the turf rather than present a protruding knee/foot arrangement that catches it.
Continue measuring load and braking by region, but do not optimize merely to minimize knee contact.
Temporary friction setting
For SP2C development, use a clearly labelled temporary non-stud body-friction setting around:
F37.5
while leaving legitimate stud/sole traction unchanged.
This is NOT the final coefficient.
It simply places us inside the visually promising F50–F25 bracket while we fix pose and follow-through.
Once SP2C's body organization is correct, we will perform a narrow final calibration around the useful region.
Do not tune F37.5 during this mission to make failures disappear.
Critical distinction: translation versus posture
During the established slide:
physics owns the body's translation across the turf.
Authored control should NOT drag the root along a trajectory.
Animation/control owns the player's intended organization:
- how he tucks the leg;
- how he holds/reorganizes the pelvis;
- how he uses his arms;
- how he controls the trunk/head;
- how he begins recovering.
In other words:
the turf and momentum decide where the footballer goes; authored muscular intent influences how the footballer organizes himself while going there.

Preserve that distinction rigorously.
No arbitrary root control
Do not add root translation to extend the slide.
Do not apply forward propulsion after landing.
Do not use animation root motion to produce the extra distance.
The longer glide should come from the experimentally demonstrated lower non-stud sliding resistance.
The authored follow-through only controls body organization.
Fix the late roll-over
Every friction-sweep condition eventually rolled face-down.
Treat that as a real follow-through defect, not a friction problem.
Diagnose why.
Determine whether it comes from:
- pelvis orientation;
- trunk angular momentum;
- missing arm post;
- disappearing motor authority;
- folded-leg geometry;
- tackling-leg geometry;
- head/trunk control;
- some combination.
Correct it through general tackle follow-through behavior.
Do not create a special anti-roll torque or speed-specific exception.
A player may eventually roll naturally after a sufficiently disrupted tackle, but the current universal passive face-down collapse is not acceptable.
Visual targets from my review
The most important visual changes I want to see are:
CURRENT
folded knee remains too far outside the body  
- folded ankle/foot protrudes downward
- toe can contact turf
- body eventually loses athletic organization
- passive/ragdoll-looking ending.
SP2C TARGET
folded knee visibly tucked toward/under pelvis  
- shin folded compactly with it
- ankle/boot tucked into the same chain
- studs/toe clear of becoming ground anchors
- lateral leg/thigh/hip form a coherent sliding surface
- arms/trunk continue responding athletically
- player remains physically active through follow-through
- eventual ending looks like a footballer completing a slide, not a ragdoll whose animation ended.
Development freedom
Build multiple SP2C candidates if necessary.
Do not stop at the first attempt.
You may vary:
- timing of the tuck;
- 3D hip trajectory;
- knee trajectory;
- ankle orientation;
- pelvis roll;
- arm choreography;
- trunk choreography;
- finite tracking authority over time;
- regional authority after contact.
But keep:
- entry speed;
- F37.5;
- physical root trajectory;
- body specification;
- ground model;
- C3;
- simulation
fixed unless a genuine blocker is demonstrated.
Every candidate should answer a specific diagnosed problem.
Required diagnostics
For serious candidates record:
- folded-knee position relative to pelvis in pelvis-local coordinates;
- folded hip flexion/abduction/rotation;
- knee flexion;
- folded ankle orientation;
- folded boot sole normal relative to turf;
- folded toe/heel clearance;
- tackling boot clearance;
- pelvis orientation;
- trunk orientation;
- head orientation;
- arm/hand contacts;
- regional motor authority;
- COM velocity;
- angular momentum;
- turf contact regions;
- normal load by region;
- tangential braking impulse by region;
- joint-limit excursions;
- slide distance.
Specifically mark:
first fold-side contact
+50 ms
+100 ms
+250 ms
+500 ms
+1.0 s
and end of slide.
Review page
I want visual judgment to be easy.
Show synchronized:
REFERENCE | SP2A F100 | SP2A F50 | SP2A F25 | BEST SP2C
and, if useful:
SP2A F37.5 | BEST SP2C F37.5
Use:
- 1× gameplay/close view;
- 0.25×;
- side view;
- rear/3-quarter view emphasizing the folded leg;
- skeleton/collider diagnostic.
Give me a specific close-up of:
pelvis + folded hip + knee + ankle + boot
from final stride through the first ~500 ms of ground contact.
I want to be able to visually answer:
Is the entire folded leg now genuinely tucked into the body?

Also show the final ~1 second of the slide prominently so I can answer:
Does he remain an active footballer through the follow-through, or does he still become a ragdoll?

Success criteria
SP2C should show:
- seamless run → tackle remains intact;
- no setup pose;
- folded-leg tuck begins before ground contact;
- knee materially closer to/under the pelvis;
- compact folded shin;
- compact folded ankle/foot;
- toe does not spear the turf;
- studs remain away from the turf;
- knee/lower leg can still slide;
- outer thigh/hip participate naturally;
- no sustained hip hard-limit violation;
- no ankle hard-limit violation;
- no root propulsion;
- physical slide preserved;
- contact overrides authored intent;
- active trunk/arm/pelvis organization continues through the slide;
- no automatic passive-ragdoll ending;
- no universal face-down roll;
- deterministic execution.
Do not require an exact final slide distance yet.
Stop condition
Do NOT proceed to:
- running recipient;
- C3 changes;
- PVP refinement;
- sprint-speed tackle;
- final friction calibration.
First get SP2C's single-player motion and follow-through right.
Stop for my visual review when either:
A. the folded-leg/ankle tuck and active follow-through are materially improved while preserving the physical slide;
or
B. you demonstrate a genuine anatomical/control limitation preventing it.
Preserve SP2A and the complete FSWEEP unchanged.
Finish with:
PRE-CONTACT 3D TUCK: PASS / PARTIAL / FAIL
FOLDED KNEE PLACEMENT: PASS / PARTIAL / FAIL
FOLDED ANKLE/BOOT TUCK: PASS / PARTIAL / FAIL
TOE/STUD CLEARANCE: PASS / PARTIAL / FAIL
LATERAL LEG/THIGH/HIP SLIDING SURFACE: PASS / PARTIAL / FAIL
ACTIVE FOLLOW-THROUGH: PASS / PARTIAL / FAIL
PASSIVE RAGDOLL-LIKE ENDING REMOVED: YES / PARTIAL / NO
JOINT LIMITS: PASS / PARTIAL / FAIL
PHYSICAL SLIDE PRESERVED: YES / NO
VISUALLY BETTER THAN SP2A: YES / NO
READY FOR FINAL FRICTION CALIBRATION: YES / NO
READY FOR RUNNING RECIPIENT: NO — WAIT FOR OWNER VISUAL REVIEW
The priority for this run is:
Do not redesign the tackle. Take the promising tackle we now have, finish the folded-leg/foot tuck correctly in 3D, and make the player remain an active physical athlete throughout the slide instead of turning into a ragdoll when the authored action ends.
