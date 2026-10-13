# User instruction, 2026-10-13 ≈ 23:30 BST (verbatim): SLIDE-PHYS-1 — autonomous development of a physical football slide tackle

Attachment as given by the user (first token of the message): `/Users/zainrahman/Desktop/Screen\ Recording\ 2026-10-13\ at\ 7.40.42 PM.mov`. Access status (recorded 13 Oct ≈ 23:50 BST): readable this time. 15.12 s, 60 fps, 830 × 1104, H.264; sha256 `b8aa9a08ef17df7f9bede49e6527e7ae7ac09b396d972c224f41cbb75d467c27`. It is third-party game footage, so it stays outside Git (`_preserved_2026-10-13_evidence_outside_git/slide_phys1/reference/`).

Received after the 13 Oct housekeeping (the 12 Oct addendum, pushed 23:45; V2 `8aa4eba4`, chronicle `65a6fa82`).

---

SLIDE-PHYS-1 — AUTONOMOUS DEVELOPMENT OF A PHYSICAL FOOTBALL SLIDE TACKLE
I am giving you the reference tackle video again as an accessible attachment. The previous SUPPORT-1 run could not access my reference video. This time:
WATCH THE ENTIRE ATTACHED VIDEO IN MOTION BEFORE DESIGNING OR IMPLEMENTING ANYTHING.
This is a long-run autonomous R&D mission. You have substantial authority to research, design, implement, test, reject candidates, build successors, and iterate until you reach a meaningful stopping point.
I do not want another narrow probe.
The objective is:
Build a physically executable football slide tackle for our V2 articulated character that captures the important athletic and mechanical character of the supplied reference and can eventually sweep another physical player naturally.

The final tackle must be compatible with Touchline's fundamental architecture:
simulation decides what happens; physical/animation presentation explains it.
Do not integrate it into authoritative match simulation yet.
1. Start from the evidence we now have
Read the complete relevant project history before designing the successor, including:
- SUPPORT-1 and all of its evidence;
- PVP-0;
- M1b;
- BALANCE-1/2/3;
- C3;
- CXA/TRC;
- IFM work;
- current V2 body specification;
- current foot/turf/contact model;
- Astra's SLIDE-A1 work, including Gate-P reconstruction and the latest authored K/K2 work if present;
- earlier RDS slide experiments;
- RUN-1 only as contextual evidence, not something you are authorized to modify.
Preserve previous experiments. Do not rewrite their results.
2. Treat SUPPORT-1 as a major constraint
SUPPORT-1 established that the recipient is not primarily failing because its feet are too sticky.
Important findings include:
- C3 already releases support naturally under a genuine horizontal sweep;
- translational turf grip was not found excessive;
- rotational traction and ankle stiffness were broadly plausible;
- C3/M1b was not artificially preserving support;
- approximately 6.74 m/s in the exploratory slider produced both-feet sweep and a sliced-out fall in ~0.30 s;
- 8.43 m/s produced an even stronger carry-through;
- PVP-0 looked anchored primarily because the tackler arrived badly, pressed downward, belly-flopped and physically pinned the recipient's feet.
Therefore:
do not solve this mission by weakening the recipient.
C3 is not the development target.
The tackler is.
3. Study the attached reference as motion, not as isolated poses
Watch the entire reference repeatedly at normal speed and slow speed.
Determine what actually makes the tackle read as athletic.
I particularly want you to investigate:
- commitment timing;
- whole-body horizontal acceleration;
- tackling-side hip/thigh drive;
- timing of knee extension;
- opposite/trailing-leg sweep;
- pelvis translation;
- pelvis rotation;
- trunk counter-motion;
- arm motion;
- COM trajectory;
- vertical COM trajectory;
- horizontal COM velocity;
- angular momentum;
- first turf contact;
- body orientation at ground entry;
- how horizontal momentum survives ground entry;
- how the body continues through the slide.
Pay special attention to the visual feature we've repeatedly observed:
The player appears to spring/knife into the action and then travel through it horizontally rather than simply dropping onto the turf.

Determine whether that interpretation is actually supported by the footage.
4. Do not blindly copy the reference
The supplied reference comes from another game with different:
- proportions;
- skeleton;
- animation system;
- camera;
- physics;
- field geometry.
It is a football-motion reference, not an authority over Touchline's body.
Classify observations as:
OBSERVED
INFERRED
AUTHORING / MODEL CHOICE
Use our actual Gabriel/V2 body proportions and joint limits.
Do not reproduce visibly bad or anatomically impossible source poses merely because they appear in the reference.
5. You may replace K if necessary
Astra's K is evidence, not a sacred asset.
Audit it.
PVP-0 already suggests serious problems:
- its physical execution belly-flopped even with no recipient;
- the physicalization lacked appropriate root/COM drive;
- SUPPORT-1 reported K's slide pose approximately 85 mm above turf in the exploratory setup;
- the resulting tackler delivered excessive downward pinning rather than a clean horizontal sweep.
Determine separately:
A. Which parts of K's choreography are worth preserving?
B. Which parts of K's root/COM trajectory are physically impossible or inappropriate?
C. Whether it is faster/cleaner to repair K or author a new physical tackle from the reference principles.
You have authority to choose.
Do not preserve K merely because time has already been spent on it.
6. Core architecture
I do not require the entire tackle to emerge spontaneously from a simulated running plant.
We have already explored that direction extensively.
The intended architecture is approximately:
authored athletic action / movement intent
→ physical control targets
→ M1b / V2 articulated body
→ rigid-body motion
→ turf/contact constraints
→ local yielding / reduced motor authority when disturbed
→ ragdoll only when physically warranted.
The choreography may be authored.
The physical consequences may not be faked.
7. Solve root/COM physicalization explicitly
This is now one of the central problems.
Per-joint pose tracking alone is insufficient.
Determine how an authored tackle's:
- COM trajectory;
- root velocity;
- pelvis trajectory;
- body orientation;
- angular momentum;
- ground-entry trajectory
become physically executable.
Do not teleport the rigid-body root along an animation curve.
Do not apply arbitrary hidden impulses simply because the animation says the player should be somewhere.
Instead investigate physically legitimate mechanisms such as:
- momentum inherited from an entry state;
- physically achievable launch state;
- ground-reaction forces while support remains;
- bounded COM velocity/acceleration objectives;
- pelvis orientation/angular-velocity objectives;
- M1b actuation;
- physically justified initial conditions for a committed tackle action.
The action may begin from a canonical committed-entry state rather than RUN-1 for this milestone.
That state must nevertheless be physically self-consistent.
8. Do not solve RUN → SLIDE yet
Full locomotion transition remains out of scope.
You may define a physically valid committed-entry state containing:
- body pose;
- linear velocity;
- angular velocity;
- support state;
- muscle state;
- contact state.
But it must be something a future locomotion transition could plausibly reach.
Do not begin the tackle magically suspended in mid-air.
Do not use a discontinuous velocity reset.
Document what RUN-1 would eventually need to supply.
9. Horizontal sweep is a first-class requirement
The previous tackler converted the interaction into a downward pile-up.
The new tackler should carry substantial horizontal momentum through the tackling region.
Measure throughout development:
- horizontal COM velocity;
- vertical COM velocity;
- horizontal/vertical momentum ratio;
- tackling-foot horizontal velocity;
- tackling-foot vertical velocity;
- shin velocity;
- pelvis velocity;
- contact normal at turf entry;
- ground reaction impulse.
The player should not simply fall from height and call that a slide.
10. Ground entry is critical
Determine from the reference and biomechanics what a plausible ground-entry sequence should be.
Investigate contact involving:
- trailing/tackling foot;
- lateral lower leg;
- thigh;
- hip/pelvis;
- arm/hand where appropriate;
- torso.
The exact order should follow the chosen tackle choreography.
The important property is:
ground contact should redirect/dissipate motion while allowing meaningful horizontal slide momentum to survive.

Avoid:
- vertical belly-flop;
- hard face-down collapse;
- instant stop;
- excessive bounce;
- turf phasing;
- artificial hovering.
11. Turf interaction
Use SUPPORT-1's findings.
Do not arbitrarily lower friction.
The tackler itself must interact credibly with the same turf model.
Measure:
- normal impulses;
- tangential impulses;
- slip;
- rotational traction;
- energy loss;
- slide distance;
- deceleration.
If the existing turf model prevents a plausible body slide for reasons unrelated to foot traction, investigate that separately.
A sliding thigh/hip/torso does not necessarily need the same effective contact properties as a studded boot.
Research this if necessary.
12. Athletic choreography requirements
The physical tackle should retain the useful lessons from the reference/Astra work:
COMMIT
→ explosive tackling-side thigh/hip drive
→ opposite leg sweeps back/down
→ large asymmetric scissor
→ pelvis/trunk rotate/reorganize
→ tackling knee extends
→ low ground entry
→ horizontal slide
→ follow-through.
Do not make both legs tuck under the pelvis together.
Do not make it look like:
- sitting down;
- generic falling;
- a flying kick;
- a dive followed by a separate slide;
- a ragdoll collapse.
It should read as one continuous athletic action.
13. Organic motion
Avoid the robotic phase-by-phase appearance of some earlier authored versions.
Movement phases should overlap.
Different segments should have different velocity peaks.
Investigate:
- pelvis lead/lag;
- trunk inertia;
- shoulder/arm lag;
- thigh acceleration;
- delayed knee extension;
- trailing-leg inertia;
- residual motion through ground contact.
Do not add random noise to make it look organic.
Secondary motion should emerge from authored timing and/or physical dynamics.
14. Motor authority / physical yielding
The tackle must eventually be interruptible by another player.
Design finite tracking authority.
A reasonable hypothesis to investigate is:
early deliberate action: relatively high tracking authority;
airborne/scissor: strong but finite;
approaching turf: reduced/redistributed authority;
ground slide: physics increasingly dominant;
unexpected obstruction: local joints yield before whole-body ragdoll where possible.
Do not adopt those values blindly.
Test alternatives.
Contact constraints always win over animation targets.
15. Ragdoll
Do not use ragdoll to compensate for a bad tackle.
Ragdoll is a physical consequence/fallback.
If motor authority reduces sufficiently:
- preserve transforms;
- preserve linear velocity;
- preserve angular velocity;
- preserve contacts;
- preserve momentum.
No snapping to a separate ragdoll pose.
16. Long-run development strategy
You have authority to build multiple candidates.
Work in generations:
baseline → diagnosis → successor → measurement → visual review → keep/reject.
Preserve rejected candidates.
Do not brute-force parameter grids simply to optimize a score.
Parameter sweeps may be used diagnostically where scientifically useful, but the chosen model must have an explanation.
If the architecture itself is wrong, change the architecture.
17. Research authority
You may research external sources extensively.
Investigate where useful:
- football slide-tackle biomechanics;
- falling/landing biomechanics;
- whole-body angular momentum;
- hip/thigh ground impact;
- body sliding friction on natural/artificial turf;
- muscle activation during deliberate falls/slides;
- joint yielding;
- sports animation/physics literature where scientifically relevant.
Prefer primary sources and measured data.
Keep literature-derived values distinct from assumptions.
If the literature doesn't contain the exact quantity we need, say so rather than fabricating precision.
18. Stage 1 — single-player tackle
Do not begin with PVP.
First make one physical tackler execute the tackle with nobody else present.
Qualification should include:
- physically valid committed entry;
- no teleport;
- no hovering;
- recognizable tackle choreography;
- plausible COM trajectory;
- substantial horizontal momentum;
- controlled vertical descent;
- correct low ground entry;
- no belly-flop;
- no face-down roll caused by bad entry;
- stable turf collision;
- sustained horizontal slide;
- believable follow-through;
- no major phasing;
- acceptable joint limits;
- deterministic repeat.
Produce clean videos and diagnostics.
Do not progress until this is convincingly working.
19. Stage 2 — obstacle perturbation
Once Stage 1 passes, test the physical tackler against simple rigid obstacles.
Test at least:
- no obstacle;
- light obstruction of tackling foot/shin;
- moderate obstruction;
- strong obstruction.
Determine whether:
- the tackling leg yields;
- the pelvis/trunk continue appropriately;
- horizontal momentum is redirected;
- the tackler remains physically stable where appropriate;
- severe disruption can produce larger yielding/ragdoll.
The animation must never push through an obstacle.
20. Stage 3 — controlled two-player experiment
Only after Stage 1 and Stage 2 are credible, you may bring back unchanged C3.
Use C3 exactly as frozen.
Do not modify the recipient to make the tackle work.
Run controlled contact conditions.
The central question is:
Does a physically valid low horizontal tackle naturally produce the support-loss spectrum SUPPORT-1 demonstrated with its slider?

Ideally we should see something qualitatively like:
light contact
→ absorb/displace/recover;
moderate
→ one support disrupted / major displacement / possible recovery or topple;
strong
→ both supports lost / rapid sliced-out fall.
Do not script those outcomes.
21. Use the supplied reference in the final visual review
I want the attached reference visible alongside our result.
Not because I expect identical poses, but because I need to judge the athletic character.
Produce, where useful:
REFERENCE | BEST AUTHORED/INTENT | BEST PHYSICAL
and later:
REFERENCE RESPONSE | BEST TWO-PLAYER PHYSICAL RESPONSE
at:
- 1×;
- 0.5×;
- 0.25×.
Use our actual Touchline camera and field for our versions.
Also provide a useful close camera.
Watch every final candidate yourself at normal speed.
22. Diagnostics
For serious candidates record:
- all rigid-body transforms;
- COM;
- linear/angular momentum;
- joint angles/rates;
- M1b states;
- excitation/developed force;
- tracking targets/errors;
- saturation;
- ground contacts;
- contact points/normals;
- normal/tangential impulses;
- penetration;
- slip;
- energy accounting;
- root/pelvis targets;
- support state.
Maintain deterministic reproducibility.
23. Performance
Measure CPU cost.
Do not prematurely optimize away necessary physics.
But report whether the architecture has a plausible path toward 22-player use.
Identify expensive development-only tooling separately from runtime cost.
24. Preserve architectural neutrality
This is still a presentation/physical-character experiment.
Do not change authoritative match simulation.
Do not let this tackle:
- decide whether a gameplay tackle succeeds;
- move the authoritative ball;
- change authoritative contact timing;
- decide receiver outcome;
- feed presentation results back into simulation.
Eventually the simulation will provide the action/context facts and this system will physically explain them.
If the eventual interface needs additional simulation parameters, document them without changing simulation now.
25. You have authority to make meaningful progress
Do not stop merely because the first candidate fails.
If you discover:
- K is physically impossible;
- M1b cannot execute high-force athletic actions;
- ground-body friction is wrong;
- root physicalization architecture is inadequate;
- motor authority is wrong;
- initial conditions are impossible;
investigate and build a justified successor where possible.
Stop only when:
A. you have a credible physical slide tackle;
B. you encounter a genuine architectural decision requiring me;
C. further progress would require unsupported arbitrary tuning;
D. a safety/integrity boundary would be crossed.
26. Do not optimize for green checkmarks
The most important output is a tackle that:
looks like a football tackle
moves like an athletic human
slides along the turf
carries horizontal momentum
can be physically interrupted
does not cheat collisions
and eventually:
sweeps another physical player naturally when the mechanics warrant it.
A technically passing candidate that still looks like a belly-flop, seated fall, mannequin, flying kick or scripted animation is a failure.
27. Final report
Give me a complete report answering at least:
1. What does the attached reference actually show?
2. What did you infer versus directly observe?
3. What was wrong with K?
4. Did you retain K, modify it, or replace it?
5. What is the final tackle choreography?
6. What is the physically valid committed-entry state?
7. What would future RUN-1 need to supply?
8. How is authored root/COM intent physicalized?
9. What generates horizontal momentum?
10. What controls vertical descent?
11. What is the horizontal velocity at ground entry?
12. What is vertical velocity at ground entry?
13. What is the ground-contact sequence?
14. How much horizontal momentum survives ground entry?
15. What causes slide deceleration?
16. How far does the character slide?
17. Does it belly-flop?
18. Does it hover?
19. Does it remain recognizable as the intended tackle?
20. How does motor authority change through the action?
21. Can the tackling leg yield to an obstacle?
22. Can severe disruption produce larger physical yielding/ragdoll?
23. Any joint-limit failures?
24. Any phasing?
25. Any solver problems?
26. Is M1b adequate for this athletic action?
27. Did turf/body contact require changes?
28. What failed candidates were tested?
29. What did each teach us?
30. If C3 was eventually introduced, what happened at light/moderate/heavy contact?
31. Did the support-loss/sliced-out response emerge naturally?
32. Did either character become pinned unnaturally?
33. Momentum/energy accounting?
34. Determinism?
35. CPU?
36. What remains before production integration?
37. What remains before RUN→SLIDE?
38. What remains before authoritative PVP integration?
39. What surprised you?
40. Exact commits/files/review URL.
Finish with:
REFERENCE MOTION UNDERSTOOD: YES / PARTIAL / NO
SINGLE-PLAYER PHYSICAL SLIDE: PASS / PARTIAL / FAIL
GROUND ENTRY AND SLIDE: PASS / PARTIAL / FAIL
PHYSICAL INTERRUPTIBILITY: PASS / PARTIAL / FAIL
TWO-PLAYER CONTACT (IF RUN): PASS / PARTIAL / FAIL / NOT RUN
SLICED-OUT RESPONSE EMERGES WITHOUT SCRIPTING: YES / PARTIAL / NO / NOT TESTED
READY FOR NEXT INTEGRATION MILESTONE: YES / NO
RECOMMEND FOR CANONICAL V2: YES / NO / NOT YET
Preserve all failed evidence.
Give me a review page where I can actually watch the important results.
Work autonomously for a long runway. Do not rush to PVP. First build a tackler who can genuinely perform a physical slide tackle on his own.

I
