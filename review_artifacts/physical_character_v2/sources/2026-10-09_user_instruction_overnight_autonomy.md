# User instruction 2026-10-09 (≈05:00 BST, chronicle day 8 Oct) — overnight autonomy: finish and diagnose the F1/toe regression, finish the character compatibility baseline, corrected slide-contact baseline + compatibility gate, PI-1 only if the gates pass, modest preregistered robustness check, 06:00 housekeeping, absolute stop conditions, morning report (verbatim)

Received in the Claude Code session while the D-1F1 regression diagnosis (`pi1/f1/`) was running. Reproduced verbatim below.

---

I am going to bed. Continue autonomously from the work currently in progress and use the night productively. You have authority to proceed through the approved character/collision compatibility work and, if its gates pass, through PI-1. Do not stop merely to ask me about an implementation detail when the previously approved architecture and evidence give a principled answer.
First finish the work currently running. Do not interrupt or restart a valid battery unnecessarily.
0. Finish and diagnose the current F1/toe regression
Complete the regression now in progress and preserve all evidence.
You have isolated the new energy problem to contact-lambda warm starting interacting with the separate light toe body, while joint warm start is apparently not responsible. Treat that as a real engineering issue, not permission to hide the symptom.
Correct measurement/tooling bugs separately from physical failures and disclose every such correction.
Investigate the smallest principled fixes for the toe/contact-warm-start problem. Prefer a solution confined to the foot/toe/contact representation if possible, but do not introduce special-case energy deletion, state writes, post-contact velocity correction, outcome-dependent logic or PI-1-specific tuning.
If a global Jolt/contact configuration change is required, it must receive a fresh versioned preregistration and a full relevant regression because it can affect historical contact behavior.
Compare credible fixes using deterministic repeated runs and energy/contact/integrity measurements. Adopt nothing merely because it makes the test pass.
Freeze the chosen correction before its final validation battery.
Hard stop: if the articulated toe cannot be made physically stable without materially weakening contact fidelity, violating energy/integrity requirements, or requiring broad redesign of V2, stop the toe work and write a failure report. Do not endlessly tune it overnight.
1. Finish the character compatibility baseline
If F1 passes, complete the previously approved work:
- separate articulated toe body;
- character-derived runner gameplay collision primitives;
- deterministic presentation → physical pose mapping;
- knee-plane mapping already identified;
- quantitative promotion tolerances frozen before evaluating tackle outcomes.
Every collider dimension and anatomical landmark must come from character geometry, not desired tackle outcomes.
Do not weaken the frozen 30 mm shared-joint adjacency criterion after seeing results.
Keep the ≤10 mm actual PI-1 self-penetration requirement.
Run the smallest sufficient V2 integrity/contact regression needed to establish that the revised body remains valid for PI-1. Do not reopen autonomous locomotion qualification, SLP, CF or TD2C/E2.
2. Create the corrected slide-contact baseline
Once the body/collision representation is frozen, version the simulation baseline and regenerate the slide-contact fixture space using the corrected runner collision geometry.
Do not preserve old CORRECTION/FALL labels intentionally.
Search the naturally resulting fixture space for:
1. near miss;
2. recoverable contact;
3. planted/weight-bearing-leg contact producing an authoritative fall.
Use one consistent frozen character/collision definition.
Run the already-defined simulation ↔ physical compatibility gate on candidates: anatomical segment, support state, timing ±1 tick, location, penetration/order of overlap, approach direction, promotion pose/velocity continuity and self-collision.
Hard stop: if the corrected simulation cannot naturally produce compatible representatives of the three required classes, do not tune geometry to manufacture them. Document exactly what is missing and stop PI-1.
3. If and only if the compatibility gates pass, refreeze and run PI-1
Amend the PI-1 preregistration to cite the corrected frozen baseline and run the smallest offline sequence:
near miss → recoverable contact → fall
Stop at the first architectural failure.
Preserve the core architecture:
- simulation remains authoritative;
- promotion is predictive from current simulation state;
- no outcome-conditioned promotion;
- physical body starts from the mapped animated pose with authoritative velocity/momentum;
- no hidden position or velocity corrections;
- while promoted, visible displacement/reaction comes from physics;
- B/recovery authority remains finite and cannot erase collision momentum;
- authoritative fall releases the body into physics as already designed;
- presentation never changes gameplay hashes/outcomes;
- animation ON/OFF remains outcome-neutral.
Measure promotion discontinuity, contact impulse/momentum, anatomical contact, displacement from reference, B use, support/recovery margin, self-collision, joint/actuator limits, fall/recovery behavior, demotion continuity, determinism and CPU.
For the near miss, promotion and return must itself be harmless.
For the recoverable contact, show that the physical disturbance remains visible and is recovered gradually rather than erased.
For the fall, show that the collision actually causes a physical response compatible with the authoritative FALL outcome and that no hidden trajectory correction creates the fall.
4. If PI-1 succeeds
Do not immediately generalize it into production.
Run a modest robustness check around the three validated cases: small variations in contact timing/location and representative body geometry sufficient to determine whether PI-1 works because of the architecture rather than one exact fixture. Preregister the perturbations before running them.
Do not launch a huge combinatorial battery overnight. We are looking for architectural confidence, not exhaustive production calibration.
Then produce a clear recommendation for the next development slice—likely running/turning presentation and locomotion trajectory integration versus broader interaction coverage—but do not start that next major slice without me.
5. Overnight housekeeping
Continue making logical, auditable local commits as work progresses. Preserve preregistrations, amendments, failed attempts, diagnostics and negative results. Never rewrite evidence to make later results look cleaner.
At the start of the new development day under the existing 06:00 rule, before continuing new work, perform the established daily publication housekeeping: update the Touchline development chronicle for the completed prior day, gather/archive the appropriate portfolio-development screenshots/evidence under the existing rules, commit the prior day's local work that is approved for publication, and push the appropriate branches to GitHub according to the existing publication policy. Do not publish files that the existing evidence-storage/privacy rules keep local.
After that housekeeping, resume this prompt from wherever the overnight work reached.
Do not rewrite historical commit dates merely to alter the GitHub contribution graph.
6. Absolute overnight stop conditions
Stop substantive development and leave me a report if any of these occurs:
- toe/contact stability requires a questionable physics workaround;
- a proposed fix changes a global physics behavior without a clean preregistered validation path;
- V2 integrity materially regresses;
- character-derived gameplay geometry cannot map consistently to the physical body;
- promotion requires a perceptible/energetic pose discontinuity;
- corrected slide-contact cannot naturally supply the PI-1 cases;
- PI-1 changes authoritative gameplay outcomes;
- collision momentum is being silently erased;
- the physical fall requires outcome-specific forcing;
- determinism fails;
- or evidence begins suggesting a genuine underlying V2 body limitation rather than a mapping/integration problem.
A failed experiment is an acceptable overnight result. Do not loosen a criterion after seeing a failure simply to continue.
Morning report
When finished or stopped, give me a concise morning report containing:
- what was attempted, in order;
- every preregistration/amendment and commit;
- PASS/FAIL at each gate;
- what changed versus what remained untouched;
- current frozen architecture;
- any tooling/process errors;
- quantitative results;
- CPU results;
- whether PI-1 was reached;
- if reached, separate near-miss/recover/fall results;
- remaining risks/open questions;
- exact recommendation for what I should approve next;
- GitHub/publication/chronicle status.
Save the full evidence and reproducible scripts in the established review_artifacts/physical_character_v2/ structure.
You have permission to keep working unattended under these rules. Do not wait for me unless a hard-stop condition is reached.
