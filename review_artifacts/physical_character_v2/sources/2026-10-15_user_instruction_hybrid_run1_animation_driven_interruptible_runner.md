# User instruction, 2026-10-15 ≈ 02:35 BST (verbatim): HYBRID-RUN-1, an animation-driven, physically interruptible runner

**Context:**
- Received after the PVP-1 collision review (`af04ffb1`, local).
- The owner pasted the block below with no other text; it is treated as the owner's instruction.

**Terms used below:**
- "PVP-1" = `pvp1_running/` (`9d2e9512`).
- "The frozen PVP-1 canonical setup" = `pvp1_running/scripts/pvp1_setup.mjs`, condition CANON.
- "The supplied tackle reference" / "REFERENCE" = REFERENCE3 (outside Git).

---

HYBRID-RUN-1 — ANIMATION-DRIVEN, PHYSICALLY INTERRUPTIBLE RUNNER
Stop the proposal to build a fully physics-generated runner for now.
I want to test a different architecture that is likely closer to the intended Touchline character system.
Core principle
The character does NOT need physics to generate running.
RUN-1 already provides the deliberate athletic locomotion.
Instead:
Animation describes what the athlete is trying to do. The physical body tracks that intent with finite authority. External contacts are authoritative and may disturb, deform, slow, redirect or defeat that intent.

This should eventually support:
- shoulder-to-shoulder running;
- pushes;
- shielding;
- trips;
- slide tackles;
- aerial contact;
- kicks under contact;
- stumbling and recovery.
Do not build tendon-driven physical locomotion for this mission.
1. Preserve the frozen PVP evidence
Preserve PVP-1, SP2F2 and SP2F3 exactly.
Do not tune either tackle.
Do not hybridize F2/F3.
The previous PVP result is useful evidence but its recipient was invalid because Claude handed RUN-1 to a fully physical body before contact and that body could not sustain running even without a tackler.
We are changing that architecture.
2. No full handoff from animation to physics before collision
Do NOT do:
RUN-1 → stop animation control → fully physical runner → tackle.
That is what invalidated PVP-1.
Instead RUN-1 should remain the recipient's locomotor intent before, during and after contact unless the physical disturbance makes continued running impossible.
The no-contact twin should therefore simply continue running normally.
3. Build a physical representation underneath RUN-1
While RUN-1 plays, maintain the physical skeleton/body in correspondence with the animated character.
It must have physically meaningful:
- segment positions;
- segment orientations;
- joint positions;
- joint velocities;
- segment linear velocities;
- segment angular velocities;
- COM position/velocity;
- world/root velocity;
- foot contact state;
- support state.
Derive appropriate instantaneous velocities from the animation rather than spawning a static ragdoll at contact.
The physical body must therefore already represent a moving athlete when another player hits it.
4. Animation tracking must be finite
Do not kinematically force the rigid bodies through collisions.
RUN-1 supplies desired joint/body states.
Finite physical tracking attempts to follow those states.
If there is no disturbance:
physical character closely follows RUN-1.
If another body hits it:
contact wins.
The relevant body regions may deviate from RUN-1.
The controller then continues attempting to organize the athlete according to the running intent where physically possible.
No pose writes through collisions.
No teleporting bodies back onto animation.
No collision-neutral kinematic shell.
5. Separate intended locomotion from actual physical motion
This distinction is critical.
RUN-1 may request something like:
desired forward velocity = 4.5 m/s.
But after a shoulder collision the physical state might actually be:
4.0 m/s forward + 0.7 m/s sideways + trunk rotation.
Do not allow animation/root motion to instantly erase that physical deviation.
The action intent can continue saying:
keep running.

But the world state must retain the consequences of the collision.
Investigate the cleanest architecture for reconciling:
animated locomotor intent
with
authoritative physical root/COM motion.
Do not invent a hidden impulse to return the character to the animation path.
6. Regional physical authority
Do not treat animation-versus-physics as one global blend value.
Explore regional interruption.
For example, during a shoulder bump:
legs
may continue tracking RUN strongly;
pelvis
may physically translate/rotate somewhat;
trunk
may yield significantly;
contact shoulder/arm
may become highly physical;
opposite arm
may remain under active balance intent.
During a slide tackle:
struck support leg
may be strongly overridden by collision;
pelvis
then loses its support;
swinging leg
initially retains its running trajectory/momentum;
trunk
initially continues forward;
and physical disruption can progressively propagate through the body.
Build the architecture so this is possible.
Do not hard-code those exact responses as outcomes.
7. Disturbance should propagate
I want a continuum:
tiny contact
→ local deviation → animation recovers
moderate contact
→ larger regional deviation → stumble/lean → recovery
large contact
→ support or organization lost → animation target becomes physically unattainable → physical fall.
Avoid a binary:
RUN ON / RAGDOLL ON.
Determine a defensible way for physical error/contact loading/support loss to progressively reduce tracking authority regionally.
Do not script “tackle strength = fall animation.”
8. First test: NO CONTACT
Before tackling anybody, prove the architecture does not damage RUN-1.
Run:
HYBRID RUNNER
beside
original RUN-1
with no opponent.
The hybrid version should remain visually faithful to RUN-1 and maintain the same intended locomotion.
It must not:
- collapse;
- lose push-off because M1b cannot generate running;
- drift;
- creep;
- change stride merely because the physical representation exists.
We are not asking the muscles to generate RUN-1 from first principles.
If your implementation causes the no-contact runner to fail because M1b lacks tendon elasticity or sufficient ankle torque, the architecture is still wrong.
9. Second test: shoulder-to-shoulder collision
Before rerunning the slide tackle, build a simple diagnostic with two RUN-1 players running alongside one another.
This is important because it tests exactly why we want this architecture.
Have both players continue intending to run.
Introduce controlled shoulder-to-shoulder contact of several severities.
At minimum:
BRUSH
small shoulder contact.
BUMP
meaningful contact that should visibly disturb the upper body.
STRONG
large but plausible football shoulder collision.
Do not predetermine whether anybody falls.
10. What shoulder-to-shoulder should demonstrate
Ideally we should see a continuum such as:
BRUSH
RUN continues almost unchanged; shoulder/arm yields locally.
BUMP
RUN continues while trunk/pelvis are physically displaced; player absorbs it and reorganizes.
STRONG
larger sideways displacement/rotation; stride may be disrupted; player may stumble or potentially lose balance depending on actual physical state.
These are hypotheses, not scripted outcomes.
The important thing is:
the running animation remains the athlete's intent while rigid-body contact genuinely changes the physical athlete.

11. Ground contacts
Be very careful here.
We must not end up with animated feet visually moving through a physical world while the rigidbody root is somewhere else.
Investigate how RUN-1 foot contacts should interact with physical deviation.
During small disturbances, preserve convincing planted-foot behavior.
During larger disturbances, a foot may:
- slip;
- unload;
- lose contact;
- miss its intended placement.
Do not kinematically force an animated foot through the turf or through another player's body just to preserve RUN-1.
If limited procedural foot placement/IK is required to reconcile animation with the physically displaced root, implement only the minimum experimental version necessary and document it.
12. Then rerun the frozen PVP-1 tackle
Only after:
NO-CONTACT RUN passes
and
SHOULDER COLLISION demonstrates genuine physical interruption
rerun the exact frozen PVP-1 canonical setup.
Use:
SP2F2 unchanged
and
SP2F3 unchanged.
Replace only the invalid recipient architecture with the new animation-driven physically interruptible RUN-1 recipient.
Preserve:
- same tackle speeds;
- same approach geometry;
- same recipient RUN-1 phase;
- same contact timing;
- F37.5;
- existing collision geometry.
13. Critical PVP question
Now ask:
When the tackler physically sweeps the loaded running leg, can that contact overwhelm the local RUN tracking, remove support and naturally produce the recipient's reaction?

Specifically observe:
loaded leg struck
→ physical lateral displacement
→ foot unloading/support loss
→ pelvis response
→ swinging leg continues/reorganizes
→ trunk momentum continues
→ balance/tracking attempts to recover
→ recovery OR stumble OR fall emerges.
Do not script the final outcome.
14. Preserve physical collision consequences
Animation must not erase:
- collision-induced velocity;
- lateral displacement;
- angular momentum;
- support loss;
- joint displacement;
- foot displacement.
If RUN-1 tries to place the struck leg back where animation expected it to be, finite tracking may attempt recovery, but it must not instantly override the collision.
This is the central acceptance test.
15. Do not make this presentation-driven outcome logic
The authoritative simulation still decides what action/contact state exists.
Do not let presentation RNG or arbitrary animation logic change match outcomes.
Keep the experiment deterministic.
Any physical-response mechanism that may eventually influence authoritative gameplay must be explicitly surfaced to the simulation architecture rather than secretly introduced in rendering.
Document that boundary carefully.
16. Do not solve RUN biomechanically in this mission
Explicitly do NOT:
- add tendon springs merely to reproduce running;
- redesign M1b for gait;
- build a gait generator;
- tune ankle torque until RUN-1 becomes physically self-propelled;
- build a full locomotion balance controller;
- replace RUN-1.
Those remain separate possible research directions.
This mission asks whether we can avoid needing them.
17. Review artifacts
Give me three primary review sections.
A — NO CONTACT
ORIGINAL RUN-1 | HYBRID RUN-1
synchronized at 1× and 0.25×.
B — SHOULDER-TO-SHOULDER
Show BRUSH / BUMP / STRONG at 1× and 0.25×.
Include a diagnostic view showing physical body deviation from animation targets.
C — SLIDE TACKLE
REFERENCE | PVP-F2 | PVP-F3
with the same close collision views from PVP-1.
Include the no-contact hybrid twin.
18. Diagnostics
For the hybrid runner expose:
- animation target pose;
- physical pose;
- per-region pose error;
- per-region tracking authority;
- root/COM desired velocity;
- root/COM actual velocity;
- collision impulses;
- foot contacts;
- per-foot load;
- support state;
- regional physical override;
- recovery of tracking after disturbance.
I want to see where animation is winning and where physics is winning.
19. Questions to answer
1. Can RUN-1 remain the locomotor intent while the character is physically collidable?
2. Does the no-contact hybrid reproduce RUN-1 without requiring physics-generated gait?
3. Can a shoulder bump physically displace the upper body while the legs continue running?
4. Can the player recover naturally from a modest bump while RUN intent continues?
5. Can stronger contact progressively disturb pelvis/legs rather than requiring a binary ragdoll switch?
6. Does root motion currently fight physical displacement?
7. What minimum change is needed to reconcile animated locomotion with authoritative physical COM motion?
8. Are procedural foot adjustments required?
9. Can collision locally override a RUN-1 leg?
10. In the rerun PVP fixture, does the struck support leg now behave differently from the stable no-contact twin?
11. Does support loss propagate naturally into the pelvis/trunk?
12. Does either F2 or F3 now produce a genuine sliced-out response?
13. Do lighter contacts allow continued running/recovery?
14. Does any part of the animation forcibly erase collision consequences?
15. Is this architecture sufficient for shoulder challenges and slide tackles without physics-generated running?
20. Stop condition
This is an architecture validation milestone.
Do not productionize it yet.
Do not modify F2/F3.
Do not calibrate tackle friction.
Do not redesign M1b.
Do not build tendon-driven running.
Stop after the three test families and review artifacts are complete.
Finish with:
NO-CONTACT RUN PRESERVED: YES / PARTIAL / NO
RUN ANIMATION CAN COEXIST WITH PHYSICAL BODY: YES / PARTIAL / NO
SHOULDER CONTACT PHYSICALLY INTERRUPTS RUN: YES / PARTIAL / NO
MODERATE BUMP CAN RECOVER WHILE RUN CONTINUES: YES / PARTIAL / NO
REGIONAL PHYSICAL OVERRIDE WORKS: YES / PARTIAL / NO
ROOT MOTION / PHYSICS COEXISTENCE: PASS / PARTIAL / FAIL
SLIDE-TACKLE SUPPORT LOSS IS NOW MEANINGFUL AGAINST STABLE TWIN: YES / PARTIAL / NO
FULL PHYSICS-GENERATED RUNNING REQUIRED: YES / NO / NOT YET SHOWN
RECOMMEND HYBRID ANIMATION + ACTIVE RIGIDBODY ARCHITECTURE: YES / NO / NEEDS MORE EVIDENCE
The core hypothesis is:
We should not require physics to know how to run. RUN-1 supplies the athlete's deliberate locomotion. The physical character exists underneath it so collisions can disturb, constrain, redirect or defeat that locomotion. Small disturbances are absorbed while running continues; sufficiently large disturbances can physically destroy support and cause a fall.

Test that hypothesis rather than assuming either architecture is correct.
