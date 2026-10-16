# User instruction, 2026-10-16 (verbatim): TURN-1.2 — restore TURN-1 flow + add speed-dependent brake / turn / accelerate reversals

- Pasted by the owner into the Claude Code session at 2026-10-16T13:46:43.556Z UTC (EEST = UTC + 3), after the TURN-1.1 report (head bb97f42e).
- Saved under the standing rule (every owner instruction verbatim). The block below is reproduced exactly as received.

---

TURN-1.2 — RESTORE TURN-1 FLOW + ADD SPEED-DEPENDENT BRAKE/TURN/ACCELERATE REVERSALS
I have visually reviewed TURN-1 and TURN-1.1.
Important correction to the direction of the work: I prefer the original TURN-1 movement for most ordinary turns.
TURN-1.1 was useful research and contains components worth preserving, but its authored cut/body-language layer is not an across-the-board improvement and should not replace TURN-1 as the default.
The actual missing locomotion vocabulary is narrower:
At high incoming speeds, large direction changes—especially >90°—should not be solved as one continuous TURN-1 cut/pivot. The player needs to brake hard, reorganize/shuffle the feet, turn, and accelerate again.

However:
At WALK/JOG speeds, even >90° turns may continue to use the original TURN-1 behavior if it looks natural because there is much less momentum to kill.

Build that distinction.
1. BASELINE DECISION
Preserve TURN-1 commit 7b58d1a as the preferred visual/movement baseline.
Preserve TURN-1.1 and its evidence separately. Do not delete it.
TURN-1.2 should selectively reuse good TURN-1.1 discoveries rather than simply continuing from its visual philosophy.
Specifically:
Original TURN-1 should remain the default for:
- gentle curves;
- ordinary steering;
- most sub-90° changes;
- WALK/JOG turns where momentum is low enough;
- WALK/JOG large-angle turns where the original solution remains convincing.
Do not make ordinary movement look like a sequence of dramatic athletic cuts.
2. THE REAL MISSING FAMILY
Add a new locomotion family conceptually:
BRAKE → REORGANIZE / SHUFFLE → TURN → ACCELERATE
primarily for:
large direction changes under substantial incoming momentum.
This is especially important for:
- RUN >90°;
- SPRINT >90°;
- 120–150° high-speed turns;
- 180° high-speed reversals.
The movement should communicate:
“I cannot redirect all this momentum through one magical plant, so I must stop enough of it, reorganize my feet, turn, and go again.”

3. ANGLE ALONE MUST NOT SELECT THE FAMILY
Do NOT implement:
if angle > 90° => brakeTurn
Selection must consider at least:
- incoming speed;
- requested angle;
- current stride phase;
- next available foot;
- braking requirement;
- possibly desired outgoing speed.
A 150° turn at 2 m/s is fundamentally different from a 150° turn at 8 m/s.
4. LOW-SPEED LARGE TURNS
At WALK/JOG speed, preserve TURN-1's ability to perform large turns relatively fluidly.
Examples:
WALK 135°
Likely ordinary TURN-1 turn/pivot.
WALK 180°
May simply plant, rotate/reorient and walk away.
JOG 120°
TURN-1 may already be sufficient.
JOG 180°
May require a small adjustment/pivot but should not automatically trigger a huge braking sequence.
Test rather than assuming.
Low momentum should allow compact changes of direction.
5. HIGH-SPEED LARGE TURNS
At RUN/SPRINT speed, the same large angles should increasingly use:
BRAKE
→ SHORT FOOT REORGANIZATION
→ TURN
→ ACCELERATION OUT.
As angle and incoming momentum increase, braking/reorganization should become more substantial.
6. THE SHUFFLE / REORGANIZATION IS IMPORTANT
The missing piece is not simply:
add more braking steps.
We need a compact athletic foot-reorganization phase.
This may include:
- shortened braking step;
- quick second foot placement;
- lateral adjustment;
- split/staggered stance;
- small shuffle;
- replacement step;
- pivot preparation.
The exact solution should depend on which foot is available.
Think:
footballer rapidly reorganizing his base
rather than:
runner taking five progressively slower normal strides.
7. DO NOT MAKE THE SHUFFLE A CANNED DANCE
The shuffle should arise from the locomotion problem.
Do not always play:
SHUFFLE_LEFT
→ SHUFFLE_RIGHT
→ TURN.
Determine:
- how many adjustment steps are needed;
- which foot moves;
- where each plant should go;
- how large the steps are
from the actual state.
Some reversals may need one adjustment.
Others may need two or three.
8. BRAKING PHASE
At high momentum, first visibly remove enough incoming velocity to make the turn credible.
Braking should use:
- appropriate plants ahead of COM;
- shortened steps as necessary;
- body lean opposing travel;
- finite leg loading;
- arms/torso responding naturally.
But avoid TURN-1's current worst behavior:
five long braking strides → deep crouch → wait → pivot.
We want braking to become compact and purposeful.
9. TURN PHASE
Once sufficient momentum has been removed and the feet have reorganized:
turn decisively.
The player should not remain crouched while slowly rotating.
Depending on state, this may resemble:
- pivot;
- step-turn;
- shuffle-turn;
- crossover/replacement turn.
The body should rotate as an athlete preparing to accelerate, not as a character rotating around a root transform.
10. ACCELERATION PHASE
The turn is not complete when facing reaches the new direction.
We need:
turn
→ first powerful step
→ second acceleration step if necessary
→ ordinary locomotion.
The player should visibly push back into motion.
Preserve useful TURN-1.1 exit/acceleration work where it improves this.
11. SALVAGE TURN-1.1 SELECTIVELY
TURN-1.1 contains useful discoveries.
Audit and selectively reuse:
- improved pivot foot stability;
- removal of skating;
- useful braking posture;
- quicker visible reaction to command;
- useful arm counterbalance;
- useful acceleration-out behavior.
Do NOT automatically preserve:
- exaggerated cut lean;
- broad authored cut layer;
- altered sub-90° body language
merely because TURN-1.1 implemented them.
Compare against TURN-1 visually.
12. SUB-90° — RESTORE TURN-1
For ordinary <90° changes, begin from TURN-1, not TURN-1.1.
The owner generally prefers the original behavior.
In particular:
- gentle curve remains TURN-1;
- moderate steering remains TURN-1;
- ordinary 45–75° changes should retain TURN-1's fluidity;
- 90° can remain TURN-1 where appropriate.
Only retain a TURN-1.1 component if it is a clear visual improvement without making the action over-authored.
13. 90° IS NOT A HARD BOUNDARY
Do not create a visible switch at exactly 90°.
Use a transition region.
Conceptually something around:
~75–110°
may choose/blend between:
- ordinary TURN-1 cut;
- TURN-1 pivot;
- brake/reorganize/turn
depending strongly on speed and stride state.
Determine the actual thresholds experimentally.
14. EXAMPLE EXPECTED SPECTRUM
These are qualitative targets, not hardcoded rules:
JOG 45°
→ curve / ordinary TURN-1.
JOG 75°
→ ordinary TURN-1 cut.
JOG 120°
→ TURN-1 large cut/pivot may still be completely acceptable.
JOG 180°
→ compact turn/pivot, perhaps one adjustment.
RUN 60°
→ TURN-1 cut.
RUN 90°
→ TURN-1 cut or slightly stronger plant depending on stride.
RUN 120°
→ braking + possible adjustment + turn.
RUN 150°
→ clear brake/reorganization/turn/accelerate.
RUN 180°
→ strong reversal family.
SPRINT 60°
→ strong TURN-1 cut / arc depending on achievable redirection.
SPRINT 90°
→ strong cut, perhaps preparatory braking.
SPRINT 120°
→ brake-turn family.
SPRINT 150°
→ substantial brake + shuffle/reorganization + turn.
SPRINT 180°
→ strongest brake/reversal sequence.
15. HERO CASE — SPRINT 180°
TURN-1 currently reports:
- 4–5 braking steps;
- plant approximately 1.35 s after request;
- deep ~30 cm plant posture.
This should be the primary new-family test.
I want:
full sprint
→ immediate visible response
→ hard braking
→ short/quick foot reorganization
→ decisive turn
→ accelerate back the other way.
It does NOT need to be instant.
It DOES need to look intentional, responsive and athletic.
16. SECOND HERO CASE — RUN 135–150°
This should demonstrate the transition between:
ordinary cut
and:
full reversal behavior.
It should require meaningful braking but less than SPRINT 180°.
This is probably the most important case for validating the resolver.
17. LOW-SPEED CONTROL — JOG 150/180°
Show that the new system does not unnecessarily trigger dramatic braking.
A jogging player should be able to turn tightly and naturally.
This is a hard acceptance criterion.
18. PRESERVE PLANTED FEET
Keep TURN-1's excellent foot stability.
Do not reintroduce:
- skating;
- large plant slip;
- root rotation around a sliding foot.
Small ball-of-foot pivoting under load is acceptable.
19. PLAYER MUST REACT IMMEDIATELY EVEN IF TURN COMES LATER
Preserve one useful lesson from TURN-1.1:
the athlete should visibly acknowledge a major direction request quickly.
If the actual reversal cannot happen for 0.8 s:
the player should already be:
- braking;
- shortening stride;
- organizing arms;
- preparing feet.
Do not leave ordinary RUN playing unchanged until the eventual plant.
20. CONTINUOUS INPUT
Preserve TURN-1's retarget/cancel behavior.
During early braking, a request may still:
- change angle;
- cancel;
- return toward original direction.
Do not force the player through an obsolete 180° reversal after the user changes input.
Define a sensible commitment point.
21. ABORTING A REVERSAL
Explicitly test:
SPRINT → request 180° → begin braking → user changes request to 60°.
The player should recover naturally into the new intent rather than completing a canned turn.
Likewise test:
180° request → cancel back to original direction during braking.
22. BODY LANGUAGE
Do not apply TURN-1.1's body layer globally.
Instead make body language appropriate to the phase:
BRAKE
→ resist incoming momentum.
SHUFFLE/REORGANIZE
→ compact balanced stance, active feet.
TURN
→ pelvis/torso/head rotate coherently.
ACCELERATE
→ forward lean and strong first steps.
Preserve ordinary TURN-1 body language elsewhere.
23. MINIMUM NEW ANIMATION LIBRARY
Keep this small.
Ideally the new family requires only:
- hard braking modifier/base;
- short shuffle/replacement-step vocabulary;
- decisive turn/pivot;
- acceleration-out modifier.
Mirror left/right.
Parameterize rather than authoring every angle/speed combination.
24. DO NOT CHANGE SIMULATION AUTHORITY
Do NOT make TURN-1/1.2 authoritative match locomotion during this mission.
Preserve the existing simulation/presentation boundary.
We will settle that contract when locomotion converges with BALL-PHYS for DRIBBLE-1.
25. NO BALL YET
Do not implement dribbling.
Do not add BALL-PHYS.
This is the final locomotion vocabulary needed before convergence.
26. REVIEW MATRIX
At minimum provide:
JOG
- 60°
- 90°
- 120°
- 150°
- 180°
RUN
- 60°
- 90°
- 120°
- 150°
- 180°
SPRINT
- 60°
- 90°
- 120°
- 150°
- 180°
Plus:
- gentle curve;
- zig-zag;
- aborted reversal;
- reversal retarget.
27. THREE-WAY COMPARISON
For important cases show:
TURN-1
TURN-1.1
TURN-1.2
at synchronized 1×.
Especially:
- RUN 60°;
- RUN 90°;
- RUN 150°;
- SPRINT 150°;
- SPRINT 180°;
- JOG 180°.
I want to verify:
TURN-1.2 preserves the original where it was already good and only introduces new vocabulary where momentum requires it.
28. METRICS
Report for every case:
- incoming speed;
- requested angle;
- visible response latency;
- first braking step;
- number of braking steps;
- number/type of reorganization steps;
- turn commitment time;
- time facing reaches new direction;
- time velocity reaches new direction;
- time acceleration begins;
- minimum speed reached;
- plant-foot slip.
29. RESOLVER OUTPUT
Expose the chosen family clearly:
CURVE
TURN1_CUT
TURN1_PIVOT
BRAKE_TURN
BRAKE_SHUFFLE_TURN
or a similarly clean minimal taxonomy.
Do not make the taxonomy unnecessarily complicated.
30. SHIPPING MINDSET
We do not need perfect biomechanics.
We need a footballer who:
- turns fluidly when moving slowly;
- cuts naturally when momentum permits;
- cannot magically redirect a sprint;
- visibly brakes when necessary;
- uses quick football-like footwork to reorganize;
- turns decisively;
- accelerates naturally afterward.
Once that vocabulary exists, stop locomotion development and hand it to DRIBBLE-1.
STOP CONDITION
Stop for owner review when:
1. original TURN-1 sub-90° behavior is restored/preserved;
2. WALK/JOG large-angle turns can remain compact TURN-1-style movements where appropriate;
3. RUN/SPRINT large-angle turns use meaningful braking when required;
4. high-speed >90° turns can use quick reorganization/shuffle steps;
5. SPRINT 180° no longer looks like five slow braking strides followed by a deep crouched pivot;
6. RUN 135–150° shows a convincing intermediate case;
7. acceleration out of reversal is convincing;
8. aborted/retargeted reversals work;
9. planted feet remain stable;
10. continuous input remains functional;
11. deterministic replay passes.
FINAL REPORT
End with:
ORIGINAL TURN-1 PRESERVED AS DEFAULT: YES / NO
SUB-90° TURN-1 FLOW PRESERVED: YES / NO
LOW-SPEED >90° TURN-1 FLOW PRESERVED WHERE APPROPRIATE: YES / NO
SPEED + ANGLE RESOLVER: PASS / PARTIAL / FAIL
RUN >90° BRAKING: PASS / PARTIAL / FAIL
SPRINT >90° BRAKING: PASS / PARTIAL / FAIL
SHUFFLE / FOOT REORGANIZATION: PASS / PARTIAL / FAIL
RUN 135–150°: PASS / PARTIAL / FAIL
SPRINT 150°: PASS / PARTIAL / FAIL
SPRINT 180°: PASS / PARTIAL / FAIL
JOG 180°: PASS / PARTIAL / FAIL
ACCELERATION OUT: PASS / PARTIAL / FAIL
ABORTED REVERSAL: PASS / PARTIAL / FAIL
RETARGET DURING BRAKING: PASS / PARTIAL / FAIL
PLANT FOOT STABILITY: PASS / PARTIAL / FAIL
CONTINUOUS INPUT: PASS / PARTIAL / FAIL
DETERMINISM: PASS / FAIL
READY FOR OWNER VISUAL REVIEW: YES / NO
READY FOR DRIBBLE-1 AFTER OWNER APPROVAL: YES / NO
Then give me:
THREE VIDEOS TO WATCH FIRST
BEST ORIGINAL TURN-1 MOVEMENT THAT WAS PRESERVED
BEST BRAKE→SHUFFLE→TURN→ACCELERATE EXAMPLE
BEST LOW-SPEED >90° TURN
BEST HIGH-SPEED 180° REVERSAL
WORST REMAINING TURN
EXACT THRESHOLD/RESOLVER LOGIC CHOSEN
THREE REMAINING DEFECTS WORTH ACCEPTING FOR V1
PRIMARY DIRECTIVE
TURN-1 was already good for ordinary turns. Restore and preserve that fluidity. Do not decide movement family from angle alone: a jogging player can make a compact 120–180° turn, while a sprinting player carrying substantial momentum cannot. For high-speed large-angle changes, add the missing football vocabulary: hard brake, quick foot reorganization/shuffle as necessary, decisive turn, then accelerate again. Preserve TURN-1 everywhere the player's momentum does not require something more dramatic.
