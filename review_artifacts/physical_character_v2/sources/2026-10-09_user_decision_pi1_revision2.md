# User decision 2026-10-09 (≈17:00 BST) — PI-1 Revision 2: new lead-in contract (strict handoff at promotion; no post-promotion presentation targets), latest-clean-frame outcome-neutral promotion selector, articulated stand-in tackler, demotion gate, full rescan, PI-1 if each class has a clean representative (verbatim)

Received in the Claude Code session, in reply to `pi1/rev1/PI1_REV1_RESULTS.md` (d7d49e0). Reproduced verbatim below.

---

Approve both decisions, with the following precise architecture. Preregister this as PI-1 Revision 2 before implementation.
1. Change the lead-in compatibility contract
I approve replacing the current CG-7 requirement that the promoted physical body match every future presentation frame from promotion through contact.
That requirement is incompatible with the architecture we are now testing.
The new contract is:
Before promotion: simulation-authoritative locomotion drives presentation normally.
At the promotion frame: the physical body must be initialized from the currently visible presentation pose plus the authoritative simulation linear/angular motion, within frozen mapping/continuity tolerances.
After promotion: stop requiring the physical body to reproduce future authored/presentation poses. The physical simulation evolves causally from the promoted state. Presentation renders/explains that physical state.
Therefore future presentation artifacts — including plant-IK switching, one-frame knee jumps and authored toe-pivot evolution — must not become physical targets after promotion.
The ordinary presentation trajectory may be retained read-only as a counterfactual/reference trace for diagnostics, but it must exert no force, pose correction or outcome influence on the promoted body.
Do not smooth or repair the underlying presentation animation as part of PI-1. That is a later presentation-quality task.
2. Promotion itself must remain strict
Do not weaken the promotion-frame gate merely because post-promotion matching is removed.
At the exact handoff, require:
- position continuity;
- orientation continuity;
- velocity/momentum continuity;
- acceptable joint configuration;
- no meaningful self-collision;
- no turf penetration;
- no unsupported stance caused by rigid-foot incompatibility;
- no visible instantaneous pop beyond the preregistered tolerance;
- deterministic reconstruction.
The rigid F0 foot remains the physical foot for PI-1.
Therefore a promotion frame occurring during an intrinsically incompatible toe-pivot pose remains invalid. Do not waive the genuine rigid-foot/toe-pivot limitation.
Instead, search the existing predictive lead window for the latest clean promotion frame before contact that satisfies the complete handoff gate.
Do not move contact timing or alter the simulation to create such a frame.
Once promotion occurs, however, F0 evolves physically and no longer has to chase the presentation foot.
3. Promotion timing must remain outcome-neutral
The promotion selector may use only information legitimately available at that simulation time:
- current state;
- authoritative planned trajectories already known to the simulation;
- predicted geometric contact;
- current presentation/physical compatibility.
It may not know whether the future authoritative outcome is NEAR MISS, CORRECTION, STUMBLE or FALL.
Use one deterministic rule for every case.
Record how far before contact promotion occurs for each case.
4. Approve an articulated stand-in tackler
Replace PI-1's frozen single-rigid-body tackler with the minimum articulated stand-in necessary for the tackle geometry.
Its slide leg must follow the simulation's existing authoritative slide-leg motion, not an invented physics trajectory and not a trajectory tuned to reproduce a desired collision.
The stand-in exists only to physically instantiate collision geometry already implied by the simulation.
It must:
- preserve the authoritative slide trajectory and timing;
- preserve character-derived collision geometry;
- have finite physically reasonable mass/inertia rather than being immovable;
- reproduce the simulation's struck segment/contact geometry within the frozen correspondence tolerance;
- not read the eventual tackle outcome;
- not change gameplay state;
- and produce identical gameplay hashes with presentation/PI-1 enabled or disabled.
Preregister its construction and mapping before rerunning fixtures.
The existing 10 mm discontinuity criterion remains in force unless the preregistration replaces it with a stricter contact-correspondence measure for the articulated representation. Do not simply raise the threshold.
5. Do not modify these
Keep unchanged:
- V2;
- F0;
- F1 remains unadopted;
- Jolt configuration;
- V1.3 gameplay collision baseline;
- authoritative tackle outcomes;
- 30 mm and 10 mm limits except for a preregistered semantically equivalent replacement as described above;
- simulation/presentation neutrality requirement.
Do not fix the presentation knee jitter or toe-pivot animation during this experiment.
6. First rerun the complete compatibility scan
With the new handoff semantics and articulated tackler, rerun all 26 V1.3 candidates.
For every candidate report:
- whether a valid predictive promotion frame exists;
- lead time before predicted contact;
- promotion discontinuity metrics;
- foot support/ground compatibility;
- initial physical momentum error;
- tackler correspondence;
- predicted versus realized physical contact segment/location/time;
- and reason for rejection if it fails.
Report counts separately for:
NEAR MISS / RECOVERABLE-STUMBLE / PLANTED-LEG FALL.
7. If each class has at least one naturally passing candidate, freeze exactly one representative per class and run PI-1
Run in order:
near miss → recoverable → fall.
Stop on the first architectural failure.
During the promoted interval, what I see must be the physical body. Do not pull it toward future authored poses.
For the recoverable case, finite recovery authority may return the body toward the authoritative trajectory according to the already-designed recovery law.
For the fall case, once recovery authority is exhausted/released, preserve the body's actual physical momentum into the fall. No teleport, pose reset or outcome-specific fall impulse.
8. Add a demotion gate
For near-miss/recoverable cases, do not demote merely because contact has ended.
Demotion occurs only when the physical body is sufficiently compatible with the current authoritative/presentation locomotion state to return without a visible or dynamical discontinuity.
Measure and report:
- spatial discrepancy;
- velocity discrepancy;
- orientation discrepancy;
- pose discrepancy;
- time from interaction end to valid demotion;
- and whether any reconciliation/blend is required.
The blend is presentation-only. It must never move the authoritative simulation trajectory.
9. Interpretation
The question is no longer:
“Can V2 reproduce the authored running animation while being tackled?”
It is:
“Can we cleanly hand an ordinarily animated, simulation-driven footballer into physical dynamics before a meaningful interaction, let physics visibly resolve that interaction, and cleanly hand presentation back afterward without changing the simulation's decision?”
That is the production architecture being tested.
If Revision 2 still produces zero representatives in any class, stop and identify the smallest remaining blocker. Do not introduce Revision 3 automatically.
If all three work, run the already-approved modest robustness tests, measure CPU, preserve the evidence and stop before broader integration.
Proceed.
