# User decision 2026-10-09 (≈03:35, chronicle day 8 Oct) — accept D1C; D-1A conclusions; replace / re-record the PI-1 cases on slide-contact v1.2; permanent simulation ↔ physical-contact compatibility gate; resolve knee / boot compatibility; then amend, refreeze, implement and run PI-1 (verbatim)

Received in the Claude Code session, in reply to `pi1/PI1_D1A_INVESTIGATION.md` (6726ad5). Reproduced verbatim below.

---

Accept D1C. The old Tackle-Player V1 fall case is unsuitable as the authoritative PI-1 fall case because its gameplay collision geometry cannot be faithfully represented by the exact promoted D-1 physical body. Do not tune physical geometry to reproduce the old outcome.
Also record the following conclusions from D-1A:
- withdraw the previously reported weight-bearing mismatch; it was a one-tick record-reading error;
- the authoritative contact state and presentation agree that the left foot is planted and weight-bearing;
- the artificial isoSelfCol G1 failure is not reached by the actual PI-1 pre-contact/contact/recovery trajectories;
- permit a PI-1-scoped exception only for that artificial isoSelfCol stress test, while retaining the existing 10 mm self-penetration criterion in every actual PI-1 state, including any physical fall;
- do not use the cheap authored fall as a physical-fall reference because it violates D-1 geometry/joint constraints and was never intended to bound articulated physics.
Replace/re-record the PI-1 source cases
Investigate the accepted slide-contact v1.2 baseline you identified as the candidate because its contact geometry is derived from the rendered character models.
Before changing the PI-1 preregistration or implementing promotion physics, determine whether it can supply all three cases from one consistent baseline:
1. near miss;
2. recoverable swing-leg/foot clip;
3. planted/weight-bearing-leg contact that produces an authoritative fall.
Do not manufacture these outcomes by moving colliders until they occur. They must be produced by the existing simulation/contact rules from geometrically corresponding bodies.
Add a permanent simulation ↔ physical-contact compatibility gate
For every candidate PI-1 contact case, compare the authoritative gameplay collision against the exact D-1 promoted geometry at the corresponding time.
Gate at minimum:
- contacted player and body segment agree;
- support/stance/swing state agrees;
- contact timing agrees within ±1 simulation tick;
- contact location is anatomically/geometrically corresponding;
- overlap/penetration is of the same physical order rather than a gameplay capsule producing a deep hit where the promoted body only grazes or misses;
- relative approach direction agrees;
- neither body requires a pose discontinuity to reproduce the interaction;
- the promoted body's self-collision remains within the 10 mm PI-1 criterion.
Record both gameplay collision geometry and promoted physical geometry rather than hiding their differences.
Do not require the simplified simulation collider and physical mesh/collider to be numerically identical. The requirement is that they represent the same meaningful physical interaction.
If slide-contact v1.2 fails this compatibility gate, stop. Do not tune either representation merely to make PI-1 pass.
Resolve the two additional compatibility issues before freezing PI-1
Investigate the knee-bend and boot-length discrepancies you found:
- presentation knee bend requires approximately 6–8° sideways motion that V2 currently cannot reproduce;
- presentation boot geometry differs enough during toe pivot to create a 21–28 mm ground-height discrepancy.
Determine whether these are:
A) merely presentation-pose mapping errors that can be reconciled without altering V2 or the source animation;
B) small deterministic promotion-retargeting requirements;
or C) genuine incompatibilities between the presentation skeleton and V2.
Do not change the presentation asset or V2 yet.
The promotion target does not need to reproduce every vertex of the animation. It does need to reproduce the player's visible pose closely enough that promotion causes no perceptible pop and does not create artificial collision/contact energy.
Propose quantitative promotion tolerances for pelvis/root, feet, knees, orientation and velocity before implementing anything.
Then
If and only if:
- slide-contact v1.2 supplies compatible near-miss/recover/fall cases;
- the D-1 physical geometry represents those contacts;
- and the pose-mapping issues have a non-cheating deterministic solution,
amend and refreeze PI-1 with the replacement cases.
Then implement the smallest offline PI-1 slice under the previously approved architecture and run:
near miss → recoverable contact → fall, stopping at the first architectural failure.
Preserve the previous PI-1 requirements: simulation-authoritative gameplay, predictive promotion, no outcome changes, no hidden position/velocity corrections, B only for recoverable reconciliation, physical freedom after an authoritative fall, deterministic results, animation ON/OFF gameplay neutrality, and complete promotion/contact/demotion measurements.
Do not develop general locomotion, redesign V2, tune tackle outcomes, build browser integration, resume TD2C/E2, or generalize to other tackles.
One additional architectural rule: add to the pivot/PI-1 documentation that future gameplay collision primitives intended to drive physical presentation must have an explicit mapping to the rendered/physical character geometry. A gameplay collision may be simplified, but it cannot claim an interaction that the corresponding physical character cannot plausibly reproduce.
Stop for my review if the replacement baseline or pose compatibility gate fails. Otherwise run PI-1 and report the three cases separately.
