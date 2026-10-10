# User instruction 2026-10-10 (≈03:45 BST) — pause all PI-1 architecture development during an external architecture review; architecture-neutral consolidation and test preparation only: (1) canonical evidence document, (2) reusable interaction benchmark package, (3) architecture-neutral metrics, (4) reusable-component audit, (5) read-only tooling fixes with regression checks, (6) no new slice; deliverables and stop (verbatim)

Received in the Claude Code session, in reply to `promotion_carrier/leg_law/LEG_LAW_INVESTIGATION.md` (ed582f88). Reproduced verbatim below.

---

Pause all further PI-1 architecture development while an external architecture review is underway.
Do not implement another carrier, gait law, promotion rule, recovery system, physics handoff, collision architecture, or presentation locomotion fix. Do not change V2, Jolt settings, gameplay collision geometry, simulation outcomes, or existing frozen criteria.
Instead, use this time for architecture-neutral consolidation and test preparation.
1. Consolidate the current physical-interaction evidence.
Produce one concise canonical document covering CF-1 through CF-6, SLP-1/1b/2/2C, PI-1 and its revisions, locomotion continuity, moving handoff, promotion carrier, and the latest leg-law investigation.
For each major experiment record:
- question tested;
- what was actually demonstrated;
- what failed;
- whether the failure was simulation, presentation, handoff, carrier/controller, physics-body, collision-geometry, solver, or test/harness related;
- whether the finding is still relevant after the architecture pivot;
- exact supporting artifact/commit.
Do not reinterpret old evidence to make it fit the current direction.
2. Produce a reusable interaction benchmark package.
Freeze a small set of authoritative recorded scenarios that any future architecture can consume without changing gameplay:
- near miss;
- minor body bump if an existing trustworthy case exists;
- swinging/free-leg clip with recoverable outcome;
- planted/weight-bearing-leg sweep with fall outcome;
- optionally one stronger torso/body collision if trustworthy evidence already exists.
For every scenario preserve the authoritative simulation inputs and outcome, contact timing/geometry information, player velocities/facing, support state, and existing hashes/provenance. Do not invent missing information.
The goal is that a future interaction system can be swapped underneath this benchmark and evaluated against exactly the same football events.
3. Establish the minimum metrics we will need to compare architectures.
Without choosing an architecture, define measurements for:
- simulation/gameplay hash neutrality;
- deterministic repeatability;
- contact occurrence/time/location;
- physical impulse and momentum change;
- visible displacement;
- struck-body-region response;
- preservation of pre-impact momentum;
- recovery/stumble/fall consistency with the authoritative outcome;
- transition discontinuity entering and leaving physical response;
- CPU cost per interaction and extrapolated match cost.
Separate hard correctness requirements from quality metrics.
4. Audit reusable components.
Make a table of the existing V2/SLP/PI/presentation components and classify each as:
- clearly reusable independent of architecture;
- probably reusable;
- architecture-specific;
- research/evidence only;
- candidate for retirement.
Do not delete or modify anything based on this classification.
5. Clean up only test/tooling issues that cannot affect simulation or architectural conclusions.
Measurement/reporting bugs may be fixed if they are unquestionably read-only. Do not make behavioral fixes.
Run the necessary regression/reproducibility checks after any tooling-only change.
6. Do not start a new development slice.
Commit the consolidation/tooling work locally with clear provenance. Do not push unless the existing publication rule requires it.
At the end, give me:
- the canonical evidence summary;
- the benchmark scenarios;
- the reusable-component table;
- any contradictions or unresolved factual questions you found;
- and a short list titled “Questions the architecture review must answer.”
Then stop. Do not recommend or implement the next architecture.
