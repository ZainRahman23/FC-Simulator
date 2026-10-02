<!-- preserved verbatim from Claude session d4761610-c35f-4019-9308-cb83973e7b76, transcript line 3231. -->

Since you've visually reviewed G1 and the behavior looks good, I would promote G1 and begin G2, with Claude's identified yaw issue as the first task.
The important instruction is: G2 should not merely make the character travel forward. It should be the first genuinely human-looking physical walk. Send this:
APPROVE G1 — PROMOTE AND BEGIN G2 PHYSICAL WALKING
I have completed my visual review of G1/G1b.
I approve G1 for promotion.
The reviewed cases look physically sound for the scope of this gate. I also accept the 30 N·s mid-swing fall as an honest current capability boundary: G1 does not yet have rhythmic-step → corrective-step escalation, so do not artificially rescue that case.
Preserve the G1 evidence, report and baselines and create an appropriate local checkpoint. Do not push anything.
You may now begin G2: continuous physical walking.
1. FIRST: SOLVE THE G2 YAW BLOCKER
Address the whole-body/pelvis yaw accumulation identified in G1b before building continuous walking.
Do not solve this by:
- pinning pelvis orientation;
- forcing the root to face forward;
- adding an invisible world-space yaw constraint;
- increasing ankle/hip strength beyond justified limits;
- cancelling angular velocity directly;
- giving the character hidden external torque.
Build physically legitimate whole-body angular-momentum management through the existing finite actuator system.
Investigate/use appropriate contributions from:
- trunk counter-rotation;
- pelvis/trunk coordination;
- shoulder rotation;
- arm counter-swing;
- stance-leg mechanics;
- foot placement where appropriate.
The player should regulate heading because his physical body generates compensating internal motion and ground reaction—not because orientation is prescribed.
Preserve the ability to intentionally turn later. We are regulating unintended yaw, not making the character incapable of rotation.
2. G2 IS THE FIRST HUMAN-MOTION GATE
G1 was allowed to look robotic because it tested architecture.
G2 is not.
Physical validity and visual human-likeness are now separate pass criteria.
Use the existing:
anim3d/of_loco.js
walk/jog/run/sprint family as the reference-motion source for this exact rig.
For G2, use the walking reference.
Remember the locked boundary:
reference motion describes how the character would like to move; Jolt determines how the character actually moves.
The reference must never translate the root, teleport a foot, overwrite a solved transform or dictate touchdown.
3. BUILD A REAL WALK, NOT MOVING IN-PLACE STEPS
G2 should produce continuous forward locomotion through:
stance-foot interaction with the turf + finite joint torques + ground reaction → COM acceleration and travel.
There must be no hidden propulsion/root force.
I want the first walking implementation to include human walking fundamentals from the start:
- alternating support;
- realistic weight transfer;
- appropriate stride length/cadence;
- heel-first/heel-biased initial contact where appropriate;
- heel-to-toe progression;
- knee flexion through the gait;
- swing-foot clearance;
- natural pelvis movement;
- trunk behavior;
- arm counter-swing;
- continuous rather than marching-like motion.
Do not add these purely cosmetically. Where they have physical consequences, they should participate in the physical character.
Avoid the G1 appearance Claude identified:
- flat-footed 7 cm marching lifts;
- nearly straight knees;
- rigid upright trunk;
- motionless arms.
4. PROPULSION MUST BE AUDITABLE
Instrument enough information to demonstrate where forward motion comes from.
For representative strides show:
- ground-reaction force;
- stance-foot contact;
- centre-of-pressure progression;
- COM position/velocity;
- joint/motor work;
- actuator saturation;
- foot slip;
- external-force ledger.
I want to be able to verify:
the character walks because he pushes against the ground.
If the external-force ledger reveals unexplained propulsion, treat that as a failure.
5. START / WALK / SPEED CHANGE / STOP
Following the final architecture, do not postpone these until much later.
G2 should eventually demonstrate:
standing → initiate walking → continuous walking → change walking speed → controlled stop → standing
without resetting/reinitializing the physical body.
Start modestly. We do not need jogging or running yet.
Test at least a few walking speeds rather than tuning one exact gait.
The gait should change continuously with requested walking speed where practical rather than selecting unrelated canned walks.
6. ACTUAL CONTACT REMAINS TRUTH
Preserve G1's contact-authority result.
During walking:
- early touchdown;
- late touchdown;
- slightly misplaced touchdown;
- small obstacle contact;
- minor slip
must affect gait based on actual Jolt state.
Never snap the physical body back onto the reference gait.
Reference phase should follow measured physical progress/contact rather than dragging the body through a clock.
7. ACTUATOR ARBITER
Keep the single finite actuator authority established in G1.
Walking style, arm swing, posture, balance and support must share the body's available physical capability.
Under saturation:
style should generally yield before essential support.
Do not let arm swing or reference-pose tracking steal enough authority to destabilize ordinary walking.
Conversely, don't give support hidden extra strength.
Instrument arbitration in representative cases.
8. LATENCY
Preserve the layered latency architecture established in G1b:
- physical contact/constraints/motor impedance: immediate;
- fast feedback: approximately the current experimental scale;
- slower planning/replanning: approximately the current experimental scale.
Keep the exact values provisional.
Do not tune delays merely to make walking prettier or pass tests.
9. DO NOT BUILD G3 YET
G2 is principally undisturbed continuous human walking plus ordinary small physical variation.
Do not expand into:
- full corrective-step recovery;
- complex missing-ground search;
- multi-step disturbance recovery;
- aggressive lateral walking;
- omnidirectional football movement;
- jogging/running;
- Reference Tackle;
- slide-tackle tuning;
- C4/C5 polishing.
The known 30 N·s mid-swing case may still honestly fall.
10. PROPOSE G2 SUB-GATES BEFORE DOING EVERYTHING AT ONCE
Break G2 into small sequential sub-gates.
My expected shape is approximately:
G2a — yaw/angular-momentum regulation + human in-place gait
G2b — first physically propelled continuous walk
G2c — stable repeated walking
G2d — start / speed variation / stop
G2e — small contact/terrain robustness + final human-motion review
Revise this if the architecture suggests a better decomposition.
Do not attempt all of G2 in one giant pass.
Implement and validate G2a first, then stop for my visual review unless G2a itself naturally requires a very small amount of forward movement to validate the physics.
11. G2a VISUAL STANDARD
G2a should already look substantially more human than G1.
I specifically want to review:
- full-body walk cycle from front/side/3⁄4;
- pelvis yaw;
- trunk counter-motion;
- arm counter-swing;
- hip/knee/ankle motion;
- foot lift;
- heel/toe behavior;
- weight transfer;
- COM movement;
- physical versus reference skeleton overlay.
Include real-time, 0.5×, 0.25× and frame stepping.
If the physics passes but the body still looks like a stiff march, G2a is not complete.
Do not compensate for poor motion with camera presentation.
12. REGRESSION / PERFORMANCE
Preserve G1 and all earlier approved baselines.
Keep runs sequential and resource-conscious.
Continue profiling, but don't prematurely optimize the whole 22-player problem during G2a.
Do not make decisions from instantaneous peak contact force; use the event/integrated measures established in G1b.
STOP CONDITION
Promote/checkpoint G1 locally first.
Then build G2a only.
Do not push.
When G2a is ready, give me:
- what changed;
- how yaw is now physically regulated;
- how the reference gait is being used;
- what parts of the motion are authored vs procedural vs physically solved;
- physical validation;
- visual/human-motion limitations;
- performance;
- regressions;
- an interactive review page.
Then STOP for my visual review before G2b.
