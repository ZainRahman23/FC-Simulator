# User instruction, 2026-10-14 ≈ 12:19 BST (verbatim): SP2A — authored dive / tuck intent + rigid body, and the RUN → DIVE start transition

The message had two pasted blocks with one attachment between them, given by the user as `/Users/zainrahman/Desktop/Screen\ Recording\ 2026-09-29\ at\ 5.25.13 PM.mov`. The file name on disk has a narrow no-break space before "PM".

**Attachment access status** (recorded 14 Oct 12:25 BST): readable.
- 3.80 s, 60 fps, 2940 × 1586, H.264.
- sha256 `f53f9cc65074dfb5d27e0486e341e2bcd617a290ed11d6f7494ca876a84aebc6`.
- It is the start-transition reference. It is kept outside Git (`_preserved_2026-10-14_evidence_outside_git/sp2a/reference/`).

**Context:** received after the 14 Oct daily publication of the 13 Oct day (V2 `a59d84bc` pushed at 12:23, chronicle `33fe7f2f` at 12:24).

---

Before proceeding to the running recipient, make one architectural correction to SLIDE-PHYS-2.
I have reviewed the SP2/reference video closely.
SP2 confirms the correct basic ground-contact idea, but I think we are unnecessarily requiring the physical character to generate too much of the deliberate tackle choreography.
The committed dive/scissor/tuck is allowed to be authored animation.
This is consistent with the intended Touchline architecture.
The authored animation defines what the footballer is deliberately trying to do. The articulated rigid body follows that motion with finite authority. Contacts remain authoritative and can prevent/deform/override the animation.
Do not require M1c/M1b alone to spontaneously generate the entire dive trajectory if doing so compromises the tackle.
Re-examine the reference's folded leg in 3D
Watch the supplied reference again, especially the folded/lower leg immediately before and through ground entry.
My observation is that the motion is not simply:
knee flexes upward/downward.
It is a genuinely three-dimensional tuck involving some combination of:
- hip flexion;
- hip abduction/adduction;
- hip internal/external rotation;
- lateral/inward knee displacement relative to the pelvis;
- knee flexion;
- ankle plantar/dorsiflexion;
- modest ankle inversion/eversion and/or foot rotation.
The result is that the folded leg packages itself sideways underneath/alongside the pelvis, rather than merely bending in the sagittal plane.
The shin/thigh become useful sliding surfaces and the boot is oriented so that the studs are up/away from the turf or approximately parallel to it, rather than presented downward.
Verify this interpretation from the footage rather than assuming it.
Build SP2A as authored intent + rigid body
Preserve SP2 as evidence.
Create an experimental SP2A in which the deliberate:
commit → dive → scissor → lateral leg tuck → approach to ground
is authored skeletal intent.
The articulated physical body tracks that intent with finite authority.
Do not teleport the root.
The root/COM trajectory still needs physically consistent position and momentum.
But do not demand that the muscle controller discover the detailed limb choreography by itself.
Contact transition
Treat physical authority as progressively more important as ground contact approaches.
Before contact:
animation intent dominates, within finite motor capability.
At first legitimate turf contact:
contact constraints win.
Through knee/shin/thigh/hip loading:
reduce tracking authority appropriately and allow physical settling/sliding.
During established slide:
physics/contact/inertia dominate, with animation supplying only appropriate residual athletic intent.
If another player obstructs the tackling leg:
the collision wins immediately and the limb must deviate/yield.
Specific folded-leg objective
Do not solve the current knee-load problem merely by increasing knee flexion.
Find a 3D configuration where:
- folded knee is displaced laterally/inward appropriately;
- shin lies naturally along/across the sliding surface;
- outer shin/thigh/hip can share contact;
- knee is not the dominant long-duration load-bearing point;
- boot studs do not engage the turf;
- ankle remains inside a defensible anatomical range;
- hip does not simply sit 4–8° beyond its hard adduction limit for a second.
Investigate whether better hip rotation/3D leg placement eliminates the apparent need to violate the adduction limit.
Ankle
You have permission to use a small anatomically justified ankle orientation correction as part of the authored tackle pose.
Do not change the canonical ankle range merely to fit the tackle.
Use the existing available DOFs first.
The objective is for the folded boot's sole/studs to naturally face away from the turf during the slide.
Root/COM
Preserve the physically valid SP1/SP2 insight:
the tackler must enter with legitimate horizontal momentum.
Authored animation may control limb/pelvis choreography, but it may not create arbitrary airborne root acceleration.
Separate:
authored skeletal choreography
from
physical whole-body trajectory.
Test before running recipient
Do not build the running recipient yet.
First compare:
REFERENCE | SP2 | SP2A
focusing on:
- folded-leg 3D tuck;
- knee trajectory;
- shin orientation;
- boot/stud orientation;
- first turf contact;
- knee load;
- thigh load;
- hip load;
- tackling-foot clearance;
- slide distance/deceleration.
Show a rear/3-quarter diagnostic view in addition to the gameplay camera so the lateral knee/hip movement is actually visible.
Also show the physical skeleton/colliders.
Success
SP2A should demonstrate:
- recognizable authored athletic dive;
- correct asymmetric scissor;
- genuinely 3D folded-leg tuck;
- studs naturally clear of turf;
- bent-leg side contacts first;
- load rapidly spreads from knee/shin into outer thigh/hip;
- no ankle hard-limit violation;
- no sustained hip hard-limit violation;
- physical slide after touchdown;
- contact overrides animation;
- no root teleportation;
- deterministic execution.
If this works, freeze SP2A as the new single-player development baseline.
Only then return to the running-recipient experiment.
Do not modify C3.
Do not globally adopt M1c/TCF-1 yet.
Stop for my visual review of SP2A before moving to the recipient.

[attachment: /Users/zainrahman/Desktop/Screen\ Recording\ 2026-09-29\ at\ 5.25.13 PM.mov]

Starting jump / RUN → DIVE transition reference
I am attaching a second reference clip specifically for the beginning of the tackle.
Use this reference to study how the player transitions from running into the committed dive, rather than treating the tackle as though it begins from an already-prepared airborne pose.
I want SP2A to implement the same type of athletic transition:
running stride
→ decisive final loading/contact step
→ rapid lowering/forward commitment of the body
→ push-off / launch
→ pelvis leaves normal running support
→ legs reorganize into the asymmetric tackle scissor while airborne
→ folded leg tucks laterally for ground entry.
This transition may be authored
Do not require the physical controller to spontaneously discover this choreography.
The deliberate RUN → DIVE transition may be an authored skeletal animation, just like the rest of the intentional tackle choreography.
What must remain physical is:
- the incoming running velocity/momentum;
- the physically valid state at transition;
- ground contacts while the player is still supported;
- the resulting whole-body trajectory;
- collisions;
- turf interaction;
- yielding when obstructed.
In other words:
animation determines how the player deliberately organizes his body to launch the tackle; physics determines whether that motion is possible and what happens when the world pushes back.

Do not insert a setup pose
Earlier tackle versions visibly did:
run → special preparation pose → tackle begins.
Reject that.
The reference should read as one continuous athletic event.
Preserve incoming running motion and velocity through the transition. Do not zero joint velocities, freeze the pelvis, or make the character visibly settle before launching.
The final running stride should become the tackle commitment.
Study the launch as a whole-body action
Do not reduce the transition to the plant foot alone.
Examine and reproduce the coordinated contribution of:
- plant/support leg;
- opposite/free leg;
- both hips;
- pelvis;
- trunk;
- arms;
- COM trajectory.
In particular, study whether the reference uses the rapid hip/thigh swing and pelvis rotation we previously noticed to help create the diving/scissoring action.
The free/tackling-side leg should not simply wait for the plant leg to launch the body and then start animating afterward.
Its motion, the opposite hip, pelvis and trunk should already be reorganizing during the final supported part of the stride.
Momentum rule
The animation may shape the launch, but it may not invent impossible root acceleration after support has disappeared.
While a foot is on the turf, physically valid ground reaction and actuation can alter whole-body momentum.
Once airborne, internal limb motion may redistribute orientation/angular momentum but cannot create arbitrary new COM acceleration.
Therefore explicitly separate:
authored run-to-dive body choreography
from
physically generated whole-body momentum.
If the visual reference requires a trajectory that cannot be generated from the available running momentum and supported push-off, report that rather than hiding a root impulse.
Transition authoring target
Build the beginning so that, at normal speed, I cannot point to a frame and say:
"the run animation ended here and the slide-tackle animation started here."

It should instead look like:
the running footballer suddenly commits his existing momentum into a tackle.

Use pose and velocity continuity across the boundary, not merely pose matching.
Review this transition separately
In addition to the existing SP2A review, give me:
START-TRANSITION REFERENCE | SP2 | SP2A
covering approximately:
the final 2 running steps → commitment → takeoff → first ~200 ms airborne.
Show:
- 1×;
- 0.25×;
- gameplay camera;
- useful close/side diagnostic.
Plot or overlay:
- both foot contacts;
- pelvis trajectory;
- COM trajectory;
- horizontal/vertical COM velocity;
- pelvis angular velocity;
- both hip angular velocities;
- knee trajectories;
- takeoff/contact-release time.
I want to judge three things:
1. Does the final running stride flow directly into the tackle?
2. Does the whole body participate in the commitment rather than only the plant leg?
3. Does the player enter the airborne scissor with physically legitimate momentum rather than animation-created flight?
Do not integrate this into production RUN-1 yet. SP2A may use a controlled running-entry fixture representing the required incoming state. But design and record the transition so it can later become the authored RUN → SLIDE-A1 transition in the animation graph.
