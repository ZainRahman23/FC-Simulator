# User decision, 2026-10-08: rate-feed-forward domain-validity correction; 180 Hz end-range energy as integration debt; IK mirror fold as IK-level finding; fresh combined guard qualification (verbatim; received as pasted content, the user's whole message)

Approve the recommended path.
Preserve D1G's current preregistration and validation as FAIL. Do not adopt it yet.
1. Extend the domain-validity principle to joint-rate/velocity feed-forward as a separate versioned correction.
The rule should be general: feed-forward derived from an IK solution is authoritative only while that solution/path is certified executable, sufficiently conditioned, finite, and within the actuator/joint-rate feasibility envelope.
Do not special-case the obstacle or straight-leg example.
Preregister this independently before implementation.
When invalidity is entered, transition/fade from the last valid feed-forward state using a bounded law that itself satisfies torque/rate continuity. Do not simply zero the term in one tick.
Validate:
- normal/reachable paths remain bit-identical or within explicitly preregistered numerical equivalence;
- unreachable/singular targets cannot generate unbounded joint-rate or actuator commands;
- D1 and velocity/rate feed-forward use consistent validity semantics;
- deterministic across both legs and 180/240/480 Hz;
- transition into/out of invalidity is bounded;
- no new energy source;
- existing AB2/E1/E1b/E2 swing regressions remain clean.
2. Treat the 180 Hz end-range energy build-up as pre-existing integration debt, not as a D1-guard failure, provided the existing evidence really establishes independence.
Preserve and report every failure.
Do not change the physics rate, energy criterion, passive law or end-range parameters to make this validation pass.
Keep TD-15 gating any later certification that actually exercises this unresolved 180 Hz end-range regime.
Do not investigate TD-15 now unless the next TD2C/E2 prerequisite sequence actually depends on certifying that regime.
3. Record the IK mirror fold as an IK-level boundary finding.
Do not tune the solver or guard to force mirrored branch selection merely for this test.
Confirm that:
- mirrored inputs are evaluated under identical equations/tolerances;
- both returned solutions are individually physically valid when the target is feasible;
- the execution-feasibility verdict remains conservative;
- no left/right physical outcome bias appears away from the fold.
If those hold, record the branch ambiguity as debt and do not gate TD2C on exact internal IK-solution identity at a fold.
If the two branches produce materially different physical feasibility/outcomes, stop and investigate instead.
4. Fresh combined guard qualification
After preregistering and implementing the rate-feed-forward guard, run a fresh validation of the complete domain-validity mechanism.
The safety property I care about is not an arbitrary raw-command number selected after these results. It is:
- no non-finite/unbounded command;
- commanded/applied actuator behaviour remains inside the already-defined physical capacity/rate semantics;
- invalid IK cannot inject uncontrolled energy;
- invalidity transitions remain continuous/bounded;
- normal executable trajectories are unaffected.
Do not redefine the failed historical command-bound criterion to qualify the new version.
5. If the combined guard qualifies, adopt it and proceed directly to the already-frozen TD2C battery.
If TD2C passes, continue through the previously agreed sequence:
E2 integration → servo requalification → PG-1 → remaining prerequisites → official E2.
Stop on a substantive new failure rather than tuning.
If official E2 passes, stop before E3/repeated walking.
Everything local. Nothing pushed.
