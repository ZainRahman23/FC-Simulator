# User instruction, 2026-10-14 ≈ 22:58 BST (verbatim): SP2F2 posting-arm correction — build the post from the hand outward

**Context:** received after SP2F2 (`44a80d3c`, local). The owner pasted the block below with no other text. It begins with the owner's assessment and contains the correction ("STOP — I have watched the actual SP2F2 video …"). I am treating the whole block as the owner's instruction.

**Naming:** "the attached reference" means REFERENCE3 (`_preserved_2026-10-14_evidence_outside_git/slide_phys2/reference/REFERENCE3_2026-10-14_21.06.38.mov`, outside Git).

---

You're right. It isn't the same arm movement. Watching the new recording makes that pretty obvious, and I was giving Claude too much credit based on its numerical description.
The problem is more fundamental than the shoulder-angle number.
In the reference, the posting arm behaves like a grounded support limb:
arm comes down → hand plants beside/behind the body → hand stays down → torso continues travelling/reclining relative to that planted/sliding hand → elbow and shoulder geometry change as a consequence.
The arm is comparatively low and behind the torso. It looks like the player is using it to manage the fall/slide.
In Claude's SP2F/SP2F2, the arm is doing almost the opposite visually:
arm swings dramatically upward/overhead → body rotates underneath it → arm remains long and high → eventually the system calls this a “post.”
That giant raised arm is the giveaway. Even if Claude can report continuous hand contact at some point, the whole shoulder/upper-arm trajectory is wrong. Matching a 130° shoulder angle somewhere does not make it the same motion.
There are three specific differences.
First, the reference hand gets down early and stays low. The arm doesn't need to make that enormous overhead arc. The hand is functioning as the relatively stable end of the chain.
Second, the reference's increasing shoulder angle comes largely from the torso moving relative to the grounded hand. Claude is instead actively moving the arm through a huge shoulder arc. That's exactly the distinction you were making earlier.
Third, the elbow matters. The reference arm is not a rigid straight spoke rotating around the shoulder. There is compliant elbow/shoulder organization as weight comes onto the arm and the torso lowers. Claude's version reads like a long lever being swept overhead.
So I would interrupt Claude now, before it does anything with the knee trade-off. The arm implementation itself needs to be corrected.
I would send this short correction immediately:
STOP — I have watched the actual SP2F2 video and the posting-arm motion is NOT a visual match to the reference. Do not make the knee/run-transition trade-off decision yet.
The numerical shoulder-angle comparison has obscured the actual motion.
In the reference, the posting arm does not perform the huge overhead/upward shoulder sweep that SP2F/SP2F2 currently performs.
Re-watch the attached reference visually in continuous motion.
The key relationship I want is:
arm/hand comes DOWN toward turf → hand establishes contact relatively early → hand remains low and in sliding turf contact → torso continues lowering/reclining relative to that hand → shoulder and elbow angles evolve mainly because the BODY is moving relative to the grounded/sliding hand.
NOT:
arm swings upward/overhead through a huge arc → body rotates underneath it → eventually call that a post.
This distinction is critical.
Treat the hand as the relatively stable end of the chain after contact
Once the hand/forearm establishes its useful turf contact:
- keep it near the turf;
- allow it to slide with the player's translation;
- do not deliberately sweep it overhead;
- do not keep driving large shoulder elevation/abduction;
- let shoulder angle change primarily because the shoulder/torso is lowering and moving relative to the hand;
- let the elbow flex/extend compliantly to accommodate that changing geometry.
The hand is not world-locked, but after contact its motion should be dominated by physical sliding contact rather than by an authored overhead arm trajectory.
Diagnose the reference in hand-relative coordinates
Stop comparing only absolute shoulder angles.
Measure and compare:
- hand position relative to pelvis;
- hand position relative to shoulder;
- hand height above turf;
- shoulder position relative to the contacting hand;
- elbow angle;
- upper-arm orientation;
- forearm orientation;
- shoulder angular velocity;
- elbow angular velocity;
- hand tangential velocity along turf.
Plot these through the slide for:
REFERENCE | SP2F | SP2F2.
I expect this will reveal that SP2F2 obtains superficially similar shoulder-angle numbers through a fundamentally different arm trajectory.
Build the correction from the hand outward
For the next candidate:
1. Reach the hand DOWN into the correct posting location.
2. Establish real turf contact.
3. Keep the hand/forearm low and sliding.
4. Continue the gradual torso recline.
5. Allow the elbow and shoulder to reorganize around that persistent contact.
The arm should look like a supporting limb being progressively loaded as the athlete reclines, not an arm being thrown into the air.
Do not chase the reference's 130–135° shoulder number directly. That number is an outcome of the body/arm geometry, not the animation target.
Also preserve the torso requirement
The torso still needs to:
gradually and continuously recline throughout the slide.
Do not use a sudden torso fall to make the hand relationship work.
The combination I want is:
hand gets down and stays down + torso progressively reclines + elbow/shoulder adapt continuously.
Important
Do NOT modify the frozen run-to-tackle transition yet.
Do NOT accept the 5–8° folded-knee overrun.
Do NOT calibrate friction.
Do NOT start recipient work.
First demonstrate that you understand and can reproduce the actual arm/hand motion from the reference.
Give me a focused side-by-side:
REFERENCE | CURRENT SP2F2 | CORRECTED ARM
cropped closely enough that I can clearly see the torso, shoulder, elbow, forearm and hand throughout the slide.
Watch it yourself at 1× before reporting success.
The acceptance test is visual: the hand comes down, establishes the post, stays low/on the turf, and the changing arm angle is produced mainly by the torso progressively lowering relative to it. No giant overhead arm sweep.
