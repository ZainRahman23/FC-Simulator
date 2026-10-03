# User decision, 2026-10-03 — adopt the flat-plane turf (candidate 1), reopen G1, revalidate G1 → G2 → G3, then re-investigate the ankle law

Verbatim (received after Investigation B, commit d7a7fcb):

---

Decision: adopt candidate 1, the Jolt flat-plane turf representation, subject to full regression validation. Do not start G4 and do not yet adopt nonzero ankle stiffness.
The investigation establishes that the accepted box-turf representation exposes a real contact-integrity defect in reachable G1 state space. We therefore reopen G1.
1. Replace the physical turf box with Jolt's flat-plane shape
The authoritative playable surface remains exactly:
ground plane y = 0
This is a collision-representation correction, not a change to the intended world geometry.
Preserve:
- turf surface height;
- friction/material behavior insofar as Jolt permits;
- coordinate system;
- gravity;
- boot geometry;
- body geometry;
- joint topology;
- all existing human parameters.
Remove dependence on a finite turf bottom/side face from the physical simulation.
Keep the old box turf available only as a diagnostic historical configuration if useful.
2. Do not patch Jolt
Do not adopt the EPA source patch at this time.
Preserve the patch and its 175-million-pose evidence as research evidence and as a possible upstream issue/future fallback.
Do not maintain a production Jolt fork unless the plane solution later proves insufficient.
Preserve the drafted upstream Jolt issue.
3. Do not adopt fixes 3 or 4
Do not:
- silently ignore invalid contacts as the primary fix;
- lower maximum position correction merely to cap the damage.
Those remain diagnostic/fallback options.
4. Promote contact validity to a permanent G1 invariant
Adopt the new contact-validity instrumentation as a permanent physics-integrity check.
For turf contacts, verify that:
- the contact belongs to the playable surface;
- its normal points consistently out of the playable surface;
- no impossible underside/bottom-face contact exists;
- penetration/correction remains within the validated physical/numerical envelope.
The check should report the exact body/piece/contact and state when violated.
Do not make it silently delete contacts.
5. Keep the permanent energy and teleport invariants
Preserve the newly developed report-only checks:
- unexplained per-step energy increase;
- contact validity;
- per-step movement beyond velocity-predicted motion / teleport bound.
Re-establish their numerical tolerances from healthy flat-plane runs rather than blindly carrying thresholds derived from box-turf runs.
If the existing thresholds remain comfortably valid, retain them.
These should become permanent regression diagnostics.
6. Revalidate G1 from first principles
Because the physical contact representation changed, rerun the complete G1 validation.
Include:
- every original G1 scenario;
- every body/morphology variant;
- passive falls;
- feet-first drop;
- single-leg cases;
- self-collision tests;
- joint-tissue tests;
- energy/momentum tests;
- timestep/rate study;
- determinism;
- snapshot/restore;
- browser/Node;
- high-speed tests;
- contact penetration;
- boot-piece behavior;
- all known historical blow-up states;
- all saved pre-event reproducer states from Investigation B;
- the 1,054-run perturbation class that exposed k=0;
- additional local perturbations around those pathological states.
Explicitly demonstrate that the old GJK→EPA→bottom-face failure chain is structurally impossible or absent with the plane.
7. Compare plane vs historical box
Quantify any physical differences introduced by changing collision representation.
Compare distributions for:
- landing behavior;
- contact timing;
- penetration;
- friction/slip;
- resting posture;
- foot roll;
- joint excursions;
- energy dissipation;
- final fall posture.
Some chaotic passive falls may end differently. Do not demand bit identity across a contact-model change.
Instead determine whether the physical quantities and gate requirements remain valid.
Flag any systematic difference rather than tuning it away.
8. Revalidate G2 only after G1 passes
If and only if the corrected flat-plane G1 passes:
rerun the complete accepted 620-run G2 suite under the new turf representation.
Compare:
- quiet stance;
- push recovery;
- no-step boundary;
- CoP behavior;
- foot slip;
- actuator utilization;
- symmetry;
- energy;
- determinism;
- performance.
Do not tune the G2 controller unless a genuine controller defect is demonstrated.
If material G2 behavior changes, stop and explain why before tuning.
9. Revalidate G3 only after G2 passes
If G2 remains valid, rerun G3 under the approved revised-v2 criteria.
Keep the ankle at the historical:
k = 0
for this revalidation.
This separates the turf/contact correction from the ankle-model decision.
Establish whether the previously demonstrated pre-step state remains:
- near-single-support;
- full/swing-ready unloading;
- reversible;
- drift-free;
- perturbation-tolerant;
- mirror-consistent;
- physically failing under excessive requests.
10. Only after G1→G2→G3 is clean, reopen the ankle question
Do not immediately adopt k=0.10, 0.11, 0.15, or any other stiffness.
Once the contact pathology has been removed and G1→G3 passes on the flat plane, repeat the ankle-stiffness experiment on the corrected plant.
The previous stiffness results are contaminated by the turf-box collision defect.
Re-test the literature-supported whole-ankle internal/external-rotation range independently.
In particular determine whether approximately 0.11–0.15 N·m/° can now:
- remain passive;
- pass G1;
- reduce the 10–18° free twist;
- preserve G2;
- improve or preserve G3;
- avoid dragging the unloaded foot;
- remain valid across morphology variants.
Choose nothing based on G3 score alone.
If the corrected plant still cannot support an evidence-backed passive law, stop with the evidence.
11. Preserve Investigation B permanently
Do not discard this work after the fix.
Preserve:
- minimal reproducer;
- saved pathological states;
- stiffness sweeps;
- energy ledgers;
- Jolt source trace;
- EPA patch experiment;
- 175-million-pose result;
- k=0 vulnerability evidence;
- upstream issue draft;
- candidate-fix comparison;
- permanent integrity instrumentation.
This is now part of the project's physics-engine validation history.
12. Final stopping point
Work autonomously through:
flat-plane implementation → G1 validation → if passed, G2 validation → if passed, G3 validation → ankle-law re-investigation
You may use a long runway.
But do not:
- start G4;
- implement stepping;
- alter anatomy;
- alter actuator capacity;
- tune G2/G3 merely to recover old scores;
- patch production Jolt;
- push anything.
If the flat plane causes a material architectural incompatibility or G1/G2 requires a substantive design change, stop for my decision rather than tuning around it.
If G1→G3 passes and the ankle investigation yields a clearly evidence-supported candidate that itself passes all affected gates, do not automatically adopt it. Present the final ankle candidate and before/after evidence for my approval.
At completion report:
1. flat-plane implementation;
2. whether all known reversed-manifold cases disappear;
3. permanent invariant results;
4. G1 result;
5. plane-vs-box comparison;
6. G2 result;
7. G3 result;
8. ankle-law results on the corrected plant;
9. remaining technical debt;
10. performance;
11. commits;
12. review URLs;
13. whether V2 is again ready for a decision on G4.
Commit locally only. Nothing pushed.

This also changes how I'd interpret the earlier ankle result. We should no longer say “ankle stiffness breaks G1.” More accurately:
ankle stiffness changed the trajectories enough to expose a pre-existing collision defect more frequently.
