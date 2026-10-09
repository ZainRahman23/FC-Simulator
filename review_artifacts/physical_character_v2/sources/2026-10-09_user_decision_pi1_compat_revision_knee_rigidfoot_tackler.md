# User decision 2026-10-09 (≈15:40 BST) — preregistered PI-1 compatibility revision: new knee retarget (mapping, not body), rigid-foot presentation reconciliation (F0 physics; rendered foot follows physics), V1.3 frozen, investigate the 17.9 mm tackler slide-leg criterion, rerun the Track B gate, PI-1 if all three classes have a clean representative; hard stops; the architectural question (verbatim)

Received in the Claude Code session, in reply to the Track A / Track B report (`pi1/trackB/TRACKB_RESULTS.md`, e48fa5d). Reproduced verbatim below.

---

Proceed with a preregistered PI-1 compatibility revision, but do not change V2, F0/F1, Jolt, the 30 mm/10 mm limits, or the V1.3 gameplay collision baseline.
I approve the following direction:
1. Knee mapping: fix the mapping, not the body.
Design a new deterministic presentation→physics knee retarget that preserves the presentation leg plane while avoiding the current 4.5–7.5 rad/s long-axis spin introduced by the frozen R→K solution.
The objective is the minimum-rotation, temporally continuous physical mapping of the presentation thigh/shank into V2's reachable pose space.
It must not:
- change V2 joint ranges;
- add artificial angular damping merely to pass;
- alter authoritative gameplay state;
- use knowledge of the upcoming collision outcome;
- or tune itself separately for near-miss/recover/fall.
Preregister quantitative mapping criteria before testing it, including promotion position/orientation discontinuity, angular velocity introduced by mapping, joint margins and determinism.
Test it across representative running phases, not only the eventual tackle fixtures.
2. Foot: retain rigid F0 physics for PI-1.
Do not pursue F1/articulated-toe physics further in this slice.
While promoted, the rendered foot follows the rigid physical F0 foot, rather than requiring the physical foot to reproduce the presentation toe-pivot/heel-strike configuration.
This must be implemented as a presentation/physical reconciliation, not as a change to simulation state or collision geometry.
Before using it in PI-1, test whether promotion can transition from the ordinary running foot pose to the F0 physical foot pose smoothly over the predictive lead-in without:
- visible snapping;
- meaningful root/pelvis displacement;
- injected linear/angular momentum;
- turf penetration;
- changing authoritative contact timing/outcome;
- or changing gameplay hashes with presentation ON/OFF.
Once fully promoted, physics is authoritative for the visible foot. Do not make the physical foot chase the animation during the collision.
After demotion, blend presentation back to the normal authored locomotion pose without moving the authoritative trajectory.
3. Keep V1.3 frozen.
The new character-derived gameplay collision baseline is useful and should remain unchanged while testing the revised promotion mapping.
Do not tune V1.3 contact geometry to make PI-1 pass.
4. Investigate the tackler 17.9 mm slide-leg jump before deciding its status.
Trace the origin and purpose of the frozen 10 mm criterion.
Determine whether the 17.9 mm discrepancy can materially change:
- struck anatomical segment;
- contact timing;
- contact normal/direction;
- overlap depth/order;
- impulse;
- or authoritative CORRECTION/STUMBLE/FALL classification.
If it can, retain it as gating and diagnose the tackler representation.
If it cannot and the criterion was intended to protect runner promotion compatibility rather than stand-in tackler pose fidelity, preregister a versioned PI-1 amendment making this specific tackler quantity report-only, with a principled replacement criterion tied to contact correspondence. Do this before rerunning PI-1.
Do not simply raise 10 mm to 17.9+ mm after seeing the result.
5. Rerun Track B gate on V1.3 unchanged.
After freezing the new knee mapping, rigid-foot presentation reconciliation and any justified tackler-gate amendment, rerun the complete candidate scan.
Report separately:
- near miss;
- recoverable/STUMBLE;
- planted-leg FALL.
I want to know how many candidates now pass every promotion/contact-correspondence criterion and why every remaining candidate fails.
6. If all three classes have at least one clean representative, freeze the candidates and run PI-1.
Use the existing architecture:
- simulation remains authoritative;
- predictive promotion from current state only;
- physical body initialized from the reconciled presentation pose plus authoritative velocity/momentum;
- no outcome-conditioned behavior;
- no position/velocity teleport after promotion;
- collision response remains physically visible;
- finite recovery authority only;
- authoritative FALL releases into physics;
- presentation ON/OFF remains gameplay-neutral;
- deterministic replay.
Run near miss → recoverable → fall, stopping at the first architectural failure.
For each, record promotion continuity, physical contact, impulse/momentum, displacement, recovery authority, joint/actuator margins, self-collision, contact correspondence, demotion/return, gameplay hashes and CPU.
7. Hard stops
Stop rather than amend again if:
- knee compatibility requires changing V2 anatomy/joint ranges;
- rigid-foot reconciliation causes a materially visible promotion pop that cannot be handled presentation-side;
- it changes simulation outcomes;
- V1.3 must be tuned to obtain passing contacts;
- all three natural contact classes still cannot be represented;
- or PI-1 requires outcome-specific physics.
Preserve every failed result and amendment.
At the end, answer one architectural question clearly:
Can our intended production architecture—cheap simulation-authoritative locomotion, authored/skeletal presentation during ordinary play, temporary promotion into an articulated physical body for meaningful contacts—successfully handle a real slide-tackle sequence without the presentation or physics altering the simulation's decision?
If yes, quantify the demonstrated scope. If no, identify the smallest remaining architectural blocker.
Do not start the next major development slice after answering that question.
