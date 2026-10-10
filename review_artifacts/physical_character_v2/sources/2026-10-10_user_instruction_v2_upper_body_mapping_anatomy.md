# User instruction 2026-10-10 (≈21:09 BST) — verdict B accepted; frozen Locomotion V2 baseline untouched; V2-side upper-body mapping / anatomy investigation only (A mapping / B small body-spec / C extra articulation / D combination), alternatives tested read-only at LOW / JOG / FAST RUN / ALL-OUT; preserve the exact lower-body transfer; answer whether V2 needs a one-to-one representation of the 23 presentation bones and what may be absorbed by skinning; one recommendation for the smallest production-worthy V2 representation with expected handoff errors; stop before modifying the frozen V2 body spec or implementing the handoff (verbatim)

Received in the Claude Code session as the whole message (pasted text), in reply to the handoff contract R2 report (6a0cf340). Reproduced verbatim below.

---

Good. Accept verdict B and keep the frozen Locomotion V2 baseline completely untouched.
The next task is a V2-side mapping/anatomy investigation only.
The result I care about most is that the lower body already transfers exactly: hip, knee and ankle at 0.0 mm and 0.00 m/s. Preserve that.
Investigate the smallest principled V2-side change that allows the frozen runner's upper-body pose and velocities to initialize into V2 sufficiently accurately at FAST RUN and ALL-OUT.
Specifically investigate the reported causes:
- V2 lower-back / upper-back / neck joint positions being 50–60 mm from the visual rig's corresponding structure;
- V2 having no clavicle and therefore losing the runner's 1.6–5° clavicle motion;
- V2's upper arm being 11.6 mm shorter;
- the resulting shoulder, elbow, hand and forearm velocity errors;
- the ALL-OUT shoulder joint-range exceedance of up to 1.34°.
Do not modify RUN-1, LV2-STATE-1, the simulation, gameplay collision geometry, gait clocks, or the frozen locomotion. Do not build the collision bridge yet.
First determine whether this is:
A. primarily a mapping problem that can be solved while keeping the existing V2 body/anatomy;
B. a small V2 body-spec problem requiring changes to joint anchors/segment dimensions/ranges;
C. evidence that V2 needs additional articulation such as clavicles;
D. some combination.
Test alternatives read-only where possible before adopting anything.
For each alternative measure at LOW, JOG, FAST RUN and ALL-OUT:
- shoulder/elbow/hand positional error;
- per-body linear velocity error;
- angular velocity/momentum preservation;
- V2 joint-limit margins;
- whether the existing lower-body 0.0 mm / 0.00 m/s transfer remains exact;
- self-collision/interpenetration;
- whether body mass, COM and inertia materially change;
- expected physics/CPU cost.
Do not simply loosen the mapping thresholds to obtain a pass.
Also answer an architectural question explicitly: does the physical interaction body actually need a one-to-one representation of all 23 presentation bones? If not, determine the physically meaningful mapping contract for the 14-body V2 skeleton, including what presentation-only motion such as clavicle movement may legitimately be absorbed by skinning rather than physical bodies without creating a visible promotion discontinuity.
I do not want complexity added merely to make the skeletons numerically identical. Add physical articulation only if it materially improves collision response, momentum/inertia, or visible continuity.
End with one recommendation for the smallest production-worthy V2 representation and show the expected handoff errors with that representation.
Stop for my review before modifying the frozen V2 body specification or implementing the handoff.
