# User instruction, 2026-10-14 ≈ 21:30 BST (verbatim): ADDENDUM TO SP2F — second reference: continuous side slide + active arm stabilization

**Received:** after the SP2F commit `28491975` (local), while SP2F was stopped for visual review.

**Attachment:** the message began with the path of an attached screen recording, `~/Desktop/Screen Recording 2026-10-14 at 9.06.38 PM.mov` (5.13 s, 60 fps, 826×982). It is third-party broadcast footage, so it is not in Git. It is preserved outside Git as `_preserved_2026-10-14_evidence_outside_git/slide_phys2/reference/REFERENCE3_2026-10-14_21.06.38.mov` (sha256 `97deaa1e19ab8e50…`).

**Naming:** below, "this clip" / "the attached clip" means REFERENCE3. "The previous reference" means `REFERENCE_2026-10-14_03.49.19.mov`.

---

/Users/zainrahman/Desktop/Screen\ Recording\ 2026-10-14\ at\ 9.06.38 PM.mov ADDENDUM TO SP2F — SECOND REFERENCE: CONTINUOUS SIDE SLIDE + ACTIVE ARM STABILIZATION
I am attaching another reference clip. Watch this clip before continuing SP2F.
Use it as an additional qualitative reference specifically for:
1. continuous side-on body orientation during the slide, and
2. the posting arm/hand acting as an active stabilizing structure while the player slides.
Do not replace the previous reference with this one. Use this clip to clarify the specific mechanics below.
The important observation
The player does not repeatedly transition between:
upright → falling → lying → rolling.
Once the slide establishes, the body remains fundamentally on its side and travels along the turf in that orientation.
That is the character I want for our base slide.
Think:
enter lateral slide
→ remain lateral
→ progressively lower/recline while remaining lateral
→ finish lateral/back-side
rather than:
sit upright
→ suddenly fall
→ rotate through another orientation
→ recover orientation afterward.
The torso can continue changing angle throughout the slide, but it should do so within one continuous side-sliding manifold.
The arm/hand reference is especially important
Study how the posting arm interacts with the ground.
The arm is not merely an animated counterweight floating beside the player.
It forms part of the athlete's physical stabilization system.
For SP2F I want the posting-side:
shoulder + upper arm + elbow + forearm + wrist/hand
to behave as an active muscular chain.
Give this chain appropriate finite muscular/balance stabilization authority.
This is not a rigid IK lock.
It is not a fixed hand constraint.
It is not a scripted support force.
It is an active athlete attempting to maintain useful arm support while real turf contact remains authoritative.
Desired arm sequence
Approach
As the torso begins its gradual recline, the arm reaches naturally toward the turf.
Contact
Hand/forearm establishes genuine physical contact.
Main slide
Maintain that ground relationship continuously.
The hand/forearm slides along the turf with the player.
As the torso gets progressively closer to the ground:
- shoulder position changes;
- shoulder angle progressively opens;
- elbow flexion/extension adapts;
- forearm orientation adapts;
- wrist/hand orientation adapts;
- normal load varies continuously.
The arm should look like it is supporting and regulating a moving athlete, not executing an independent animation.
Add arm stabilization, not arm pose locking
Implement finite active stabilization for the posting arm.
The objective should be something like:
maintain useful sliding ground support while keeping the torso in the intended lateral orientation.

The controller may use:
- shoulder muscle/actuator effort;
- elbow effort;
- appropriate wrist/hand organization if represented;
- torso/shoulder coordination;
- load-aware modulation.
But contact must always win.
If the ground pushes the arm somewhere else, the arm yields.
If another player hits it, it yields.
If the torso moves closer to the ground, the arm geometry adapts rather than resisting the torso descent.
The arm must NOT hold the torso up
This distinction is critical.
Arm stabilization should help the player:
remain on his side
while allowing the torso to:
gradually approach the turf.
It should NOT attempt to preserve torso height.
So do not formulate the arm controller as:
keep shoulder at height X.

Instead formulate it around:
maintain physically useful contact/support while the body's intended torso trajectory continues downward.

The arm should accommodate the descent.
Coordinate the torso and arm
Treat these as one coupled action:
torso gradually reclines
↕
posting arm maintains sliding support
↕
pelvis remains on folded side
↕
whole body remains laterally organized.
Do not author the torso trajectory and arm trajectory independently and hope they meet.
The posting arm's changing geometry should largely emerge from the changing relationship between the shoulder and the ground.
Persistent lateral orientation
Add an explicit diagnostic for whether the character remains on the intended side throughout the established slide.
Track:
- pelvis roll;
- chest normal/orientation;
- trunk roll;
- shoulder heights;
- hip heights;
- lateral-body contact regions.
I want to see that after the side slide establishes, there is no unnecessary excursion toward seated-upright or chest-down orientation.
The torso may recline increasingly toward the back, but this should be a continuous evolution from the lateral slide—not a new fall event.
Use muscular stabilization across the upper body
Do not make the posting arm solve everything alone.
A real athlete is coordinating:
- trunk musculature;
- shoulder stabilizers;
- upper arm;
- elbow;
- posting forearm/hand;
- pelvis.
Give the physical controller enough finite muscular authority across those regions to maintain athletic organization.
Again:
this authority controls organization, not root trajectory.
Momentum and turf contact still determine where the body travels.
Contact persistence is now a hard visual requirement
Once the posting hand/forearm establishes its main sliding contact, I want it to remain in useful turf contact through the principal torso-recline phase unless physics genuinely forces it away.
Measure:
- first contact;
- continuous-contact duration;
- any contact gaps;
- sliding distance of hand/forearm;
- normal load over time;
- shoulder/elbow actuator effort;
- shoulder/elbow angles over time.
If the hand repeatedly bounces off because of controller/contact interaction, diagnose and correct that.
Do not hide it visually.
Do not literally copy every movement in this reference
The reference player may move the arm back and forth or perform details specific to that tackle.
I do not want those incidental movements copied.
For our base tackle, simplify the intent to:
arm reaches turf once → establishes support → slides continuously → adapts progressively as torso lowers.
Later tackle variants can have different arm behaviors.
Updated visual target for SP2F
At 1× speed I should perceive:
commitment
→ folded-side landing
→ immediate establishment of lateral slide
→ posting arm reaches turf
→ player continues sliding continuously on that side
→ torso progressively reclines closer to turf
→ posting arm remains in contact and changes angle smoothly with the descending torso
→ player ends naturally on side/back.
There should be no:
- upright hold;
- discrete fall-over moment;
- arm floating beside the body;
- hand repeatedly touching/leaving;
- rigid arm prop;
- chest-first roll;
- passive ragdoll phase.
Use this attached clip specifically to understand what “continuous side slide with an active posting arm” should look like.
Continue SP2F under the previous constraints and stop for my visual review before friction calibration or recipient work.
