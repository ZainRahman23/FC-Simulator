# User instruction, 2026-10-14 ≈ 21:03 BST (verbatim): SP2F — continuous recline + persistent sliding arm post

The message was one pasted block, with no attachment. "The reference" means the broadcast slide-tackle reference (kept outside Git). "A" means SP2A.

**Context:** received after SP2E (`be547222`, local). The owner has watched the SP2E video.

---

SP2F — CONTINUOUS RECLINE + PERSISTENT SLIDING ARM POST
I have watched the actual SP2E video. Do not proceed to friction calibration.
SP2E reaches a better final orientation, but the motion itself is still wrong.
The problem is now very specific:
The torso should gradually recline throughout the slide. It should not remain relatively upright and then suddenly rotate/fall over at one point.

The posting arm has the same problem.
Do not optimize this iteration around hitting particular torso-angle snapshots at particular timestamps.
I care about the continuous trajectory.
Preserve the successful tackle entry, folded-leg tuck, boot clearance, physical slide and F37.5.
1. Torso target: continuous progressive recline
From the beginning of ground entry, the torso should already be gradually moving toward the final side/back orientation.
I want:
elevated torso
→ slightly reclined
→ more reclined
→ more reclined
→ side/back close to turf
as one continuous motion.
There must NOT be a visually identifiable instant where:
“now the torso falls over.”
In SP2E I can still see that event.
Remove it.
The player should look as though he is continuously reclining while translating across the turf.
Do not accomplish this with an instantaneous torque, abrupt target change, or late authority change.
2. Inspect angular velocity, not just angle
Diagnose SP2E's trunk motion in terms of:
- trunk angle;
- trunk angular velocity;
- trunk angular acceleration;
- pelvis roll;
- pelvis angular velocity.
Find the exact point where SP2E visually jerks/falls over.
Determine what causes it:
- target discontinuity;
- motor-authority change;
- contact transition;
- gravity taking over after an unstable threshold;
- pelvis movement;
- arm contact;
- controller phase change.
Eliminate the cause rather than merely smoothing the rendered pose.
The desired trunk angular velocity should generally build and evolve smoothly, not contain a large late spike corresponding to the visible fall-over.
3. Do not treat the pelvis and torso as separate sequential events
SP2E currently allows the torso to move first and the pelvis to follow later.
I do not want:
torso changes → pause/lag → pelvis suddenly rolls → body falls over.
Build a coordinated continuous progression where:
pelvis roll + trunk recline + body-weight transfer
evolve together throughout the slide.
They do not need identical timing, but there should be no obvious phase boundary.
4. Posting arm: contact once, then stay on the ground
The arm behavior should be conceptually simple.
Before contact
The balance/posting arm moves toward the turf as the torso begins reclining.
First contact
Hand/forearm makes genuine physical turf contact.
After contact
Keep that hand/forearm in contact with the turf through the main reclining portion of the slide.
Do not lift it and re-place it.
Do not make it repeatedly chase an authored world-space point.
Do not animate it back and forth merely because the specific reference happens to contain arm movement.
For our base slide tackle, simplify the behavior:
reach ground → establish sliding post → maintain ground contact while torso continues lowering.

5. The ground should determine the arm geometry after contact
Once the hand/forearm is on the turf, the arm should remain physically constrained by that contact while the body continues travelling.
As the shoulder gets lower and the torso reclines:
- shoulder angle should progressively change/open;
- elbow angle should change naturally;
- arm orientation should evolve;
- hand/forearm should slide across the grass.
In other words, do NOT author:
arm angle A → arm angle B → arm angle C
independently.
Author the intention to maintain a useful posting arm, while the physical relationship:
shoulder ↔ elbow ↔ hand ↔ turf
produces the evolving angles.
The increasing arm angle should be largely a consequence of the torso approaching the turf.
6. Persistent contact does not mean planted hand
The posting hand/forearm must remain free to slide tangentially.
Keep its low development friction.
It should not become an anchor.
It should:
- maintain turf contact;
- carry some normal load;
- slide with the player;
- regulate roll;
- yield at shoulder/elbow/wrist;
- progressively change geometry as the torso lowers.
It should NOT:
- pin the COM;
- stop the slide;
- behave like a rigid tripod;
- hold the torso upright.
7. Do not force an early final pose
I no longer want you optimizing for:
“player must be lying down by exactly +0.30 s.”

That framing appears to be encouraging abrupt movement.
The reference is evidence for the character and approximate pace, but motion quality takes priority over hitting one timestamp.
A slightly slower continuous human-looking recline is preferable to an exact +0.30 s match produced by a visible rotational jerk.
Measure timing, but do not use a single timestamp as the optimization target.
8. No phase switch into lying
Inspect the controller for discrete states such as:
ENTRY → DESCENT → LYING
or equivalent target/authority changes.
If such a transition is causing the visible jerk, replace it with a continuous progression driven by appropriate action phase/contact state.
There should not be a single frame where the controller suddenly decides:
“now lie down.”

The deliberate tackle follow-through begins before first turf contact and continuously evolves through the slide.
9. Keep the torso active throughout
Do not solve smoothness by simply relaxing the torso and letting gravity make it fall.
That returns us toward A/ragdoll behavior.
The footballer should remain actively organized.
We want:
controlled continuous lowering
not:
held upright → released → gravity collapse.
Maintain finite muscular authority throughout.
10. Keep the arm active too
Similarly:
reach → contact → physically maintained sliding post
does not mean lock the arm.
The arm should continue exerting finite muscular intent while contacts win.
It may flex/extend/rotate as required by the moving body.
11. Preserve everything unrelated
Do not change:
- run-to-tackle transition;
- dive/scissor;
- folded-leg tuck;
- tackling-leg trajectory except if required by a demonstrated coupling;
- boot/stud contact model;
- F37.5;
- root/COM propulsion;
- body geometry;
- recipient;
- C3.
Do not begin friction calibration.
Do not begin running-recipient work.
12. Build SP2F around trajectory quality
Compare SP2E and SP2F using continuous plots.
Plot:
trunk angle
trunk angular velocity
trunk angular acceleration
pelvis roll
pelvis angular velocity
posting shoulder angle
posting elbow angle
hand height
hand normal force
hand tangential velocity
hand/turf contact state
from before first contact through the end of the main slide.
I want the plots to expose any discontinuities or spikes.
13. Important arm diagnostic
Explicitly report:
- first hand contact time;
- whether contact is subsequently continuous;
- any periods where the hand leaves the turf;
- hand sliding distance along turf;
- peak normal load;
- tangential braking impulse;
- shoulder-angle evolution while contact is maintained.
Success requires persistent sliding contact through the main torso descent.
14. Visual review
Give me synchronized:
REFERENCE | SP2D | SP2E | SP2F
at:
- 1×;
- 0.25×;
- side;
- front/rear 3/4.
Also give me a version focused only on:
torso + pelvis + posting arm
so I can judge the motion without being distracted by the legs.
Do not judge success from frozen frames alone.
Watch every serious candidate continuously at 1×.
15. What I should see
At normal speed I want to see:
contact
→ torso already begins gently reclining
→ hand approaches turf
→ hand contacts
→ hand stays sliding on turf
→ torso continuously reclines farther
→ shoulder/arm angle progressively opens because the shoulder is approaching the ground
→ pelvis continuously rolls with the torso
→ player settles onto side/back
→ no sudden fall-over event.
There should be no point where I can visually say “the lying-down animation triggered here.”
16. Reject candidates with any of these
Reject:
- torso held upright and then released;
- sudden trunk angular-velocity spike;
- sudden pelvis-roll event;
- arm snapping to the turf;
- arm touching and immediately leaving;
- arm floating after first contact;
- arm rigidly planting;
- shoulder angle jumping because of a target change;
- chest-down collapse;
- passive ragdoll descent.
Stop condition
Stop for my visual review once you have a candidate where:
TORSO RECLINE IS CONTINUOUS: YES
VISIBLE FALL-OVER EVENT: NO
PELVIS/TORSO MOTION COORDINATED: YES
POSTING HAND REACHES TURF: YES
POSTING HAND MAINTAINS SLIDING CONTACT: YES
ARM ANGLE EVOLVES PROGRESSIVELY WITH TORSO DESCENT: YES
ARM DOES NOT ANCHOR THE SLIDE: YES
ACTIVE CONTROL REMAINS: YES
FOLDED-LEG/TACKLE ENTRY PRESERVED: YES
PHYSICAL SLIDE PRESERVED: YES
Do not proceed beyond SP2F until I visually approve it.
The key correction is: stop designing a sequence of poses. Design one continuous controlled recline. The arm touches the ground once, stays there and slides; the torso keeps gradually moving toward the ground, and the arm/shoulder geometry evolves continuously because the body is lowering.
