# User instruction, 2026-10-13 ≈ 01:50 BST (verbatim): PVP-0 — first two-player physical contact test

---

PVP-0 — FIRST TWO-PLAYER PHYSICAL CONTACT TEST
We are ready for the first controlled two-player integration diagnostic.
This is not production PVP and is not permission to modify the simulation.
Inputs are frozen
Use:
Tackler: the latest approved/current SLIDE-A1 authored tackle candidate.
Recipient: Claude's C3 physical recipient exactly as committed.
Locate and read Claude's latest BALANCE-2/BALANCE-3 artifacts, C3 implementation, M1b contract and relevant commits before doing integration work.
C3 remains a 16/17 baseline with known P8 backward-small residual drift. That limitation is accepted for this diagnostic.
Do not fix C3.
Do not import failed B3.
Do not retune either character to make this test succeed.
Objective
For the first time, show:
one articulated player executing the slide tackle physically into another articulated physical player.

I want to see what actually happens.
The purpose is discovery, not qualification.
Controlled setup
Start with the simplest reproducible geometry.
Recipient:
- stationary;
- C3 balance active;
- canonical M1b physical body;
- normal standing state.
Tackler:
- starts from the committed portion of SLIDE-A1;
- no RUN-1 transition yet;
- use the authored tackle as motor intent;
- articulated rigid-body character;
- finite motor authority;
- real collision shapes.
Position them so the tackling leg makes a clear representative lower-leg/shin/ankle contact with the recipient.
Do not add the ball initially.
Critical rule
Neither animation nor presentation may force the collision outcome.
At player contact:
- colliders must not phase;
- tackling limb must be allowed to deviate from its authored trajectory;
- recipient must receive the physical impulse;
- tackler must receive equal-and-opposite reaction;
- neither root may be teleported;
- no hidden impulses;
- no receiver animation;
- no scripted stumble/fall;
- no outcome-specific pose.
Let us see what the current physical systems actually do.
Tackler motor authority
Use the current authored slide as intent, not transform authority.
Before contact, track it strongly enough that the tackle remains recognizable.
At contact, collision constraints win.
If the tackling leg is obstructed, it must yield/deviate rather than pass through the recipient.
Allow local yielding before whole-body ragdoll.
Do not automatically ragdoll the tackler merely because contact occurred.
If a full ragdoll transition genuinely becomes necessary, preserve all current transforms, linear velocities and angular velocities.
Run three strengths
If possible without changing the characters themselves, run three controlled contact conditions:
LIGHT
REFERENCE / NOMINAL
HEAVY
Vary only a clearly documented external setup parameter such as relative approach velocity/contact geometry.
Do not tune each case separately.
I want to discover whether the system naturally produces a spectrum like:
absorb/recover → major stumble/displacement → fall
rather than forcing those outcomes.
Record everything
For both players record:
- rigid-body transforms;
- COM position/velocity;
- linear/angular momentum;
- joint angles/rates;
- motor/excitation state;
- contact pairs;
- contact points/normals;
- impulses;
- penetration depth;
- foot-ground contacts;
- support state;
- motor saturation;
- tracking error;
- any yielding/ragdoll state.
Check momentum accounting across player-player contact.
Visual review is the priority
Produce clean synchronized videos using the actual Touchline gameplay camera and field.
For each strength show:
CLEAN 1×
CLEAN 0.25×
and a separate:
DIAGNOSTIC 0.25×
with skeletons/colliders/contact point/impulse vectors as appropriate.
Also provide a useful close-up.
Do not cover the clean videos with diagnostics.
What I want to judge
I specifically want to see:
1. Does the tackling leg genuinely hit the recipient rather than phase through?
2. Does the recipient's struck leg yield?
3. Does the disturbance propagate naturally from leg → pelvis → trunk?
4. Does C3 attempt to balance naturally after impact?
5. Does the recipient sometimes remain standing?
6. Can sufficiently strong contact genuinely make him fall?
7. Does the tackler visibly react to hitting another mass?
8. Does the tackler's authored action survive contact without looking completely broken?
9. Do either character's joints become unnaturally stiff?
10. Does either player look like a mannequin, plank or limp ragdoll?
11. Is there mesh/collider phasing?
12. Does ground contact remain stable?
13. Does the overall event finally read as one footballer physically tackling another footballer?
Do not solve problems yet
This is extremely important.
If the first two-player interaction looks terrible, do not immediately tune it until it looks good.
Capture the failure faithfully.
Diagnose whether each visible problem originates from:
TACKLER ACTION
TACKLER PHYSICAL TRACKING
PLAYER-PLAYER CONTACT
RECIPIENT BODY
RECIPIENT BALANCE
GROUND CONTACT
RENDERING
INTEGRATION
We want the first honest observation of the combined system.
Simulation neutrality
Do not integrate this into authoritative match simulation yet.
Do not modify:
- simulation collision decisions;
- authoritative outcomes;
- RUN-1;
- C3;
- M1b;
- gameplay tackle logic.
This is an isolated two-character physical/visual experiment.
Final report
Tell me:
- exact C3 commit consumed;
- exact slide candidate consumed;
- exact physicalization method;
- contact geometry;
- approach velocity;
- first-contact body pair;
- peak impulse;
- peak penetration;
- recipient COM response;
- tackler COM response;
- whether momentum accounting closes;
- whether either body falls;
- why;
- motor saturation/yielding;
- any phasing;
- any joint-limit problems;
- determinism;
- CPU;
- the three largest visual problems;
- which subsystem owns each problem.
Finish with:
PVP-0 CONTACT PHYSICS: PASS / PARTIAL / FAIL
PVP-0 VISUAL RESPONSE: PASS / PARTIAL / FAIL
TACKLER REMAINS RECOGNIZABLE: YES / NO
RECIPIENT RESPONSE PLAUSIBLE: YES / NO
READY FOR NEXT PVP ITERATION: YES / NO
Stop for my review.
Do not fix what you discover before showing it to me.
