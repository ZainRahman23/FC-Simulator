# User decision 2026-10-09 (≈13:20 BST) — approve Option 1 (time-boxed toe / contact-solver investigation, Track A) with Option 4 in parallel (character-derived colliders + pose-compatible F0 promotion for PI-1, Track B); separate conclusions A / B / C (verbatim)

Received in the Claude Code session, in reply to the morning report and `pi1/f1/F1_TOE_FAILURE_REPORT.md` (0ddba2b). Reproduced verbatim below.

---

Approve Option 1, with Option 4 in parallel.
Do not adopt F1 yet, do not weaken any frozen energy/integrity criterion, and do not change global Jolt settings merely to make the articulated toe pass.
Track A — time-boxed toe/contact-solver investigation
Run a strictly time-boxed, preregistered investigation of the contact-energy injection caused by the separate light toe body.
The objective is not “make F1 pass.” The objective is to identify the exact mechanism by which contact-lambda warm starting produces the one-step positive-energy gain when a separate articulated toe contacts the turf, and determine whether there is a principled correction that preserves:
- normal toe collision/contact;
- the articulated foot geometry;
- existing accepted Jolt configuration wherever possible;
- energy/integrity criteria;
- deterministic behavior;
- historical F0 behavior;
- and the ability to use the toe as an ordinary physical collision body during promotion.
Instrument the actual contact impulses at the problem landing at sufficient resolution to identify which contact manifold/body pair and which cached impulse produces the excess work. Compare the immediately preceding contact state, cached lambda/impulse, contact normal/tangent, effective mass, relative velocity and resulting work/energy.
Test only mechanism-driven candidate fixes justified by that diagnosis. Do not perform a blind parameter sweep.
In particular investigate whether the problem can be corrected by appropriately invalidating/reinitializing stale contact warm-start information when the articulated toe's contact topology/manifold changes, rather than globally disabling contact warm starting.
Any candidate correction must be evaluated against drop1m, leanF, singleLeg, the relevant F0 regression, repeated perturbed runs, determinism and CPU.
If the correction changes Jolt globally or affects contacts outside the articulated foot/toe leaf, treat it as a new versioned physics-engine configuration requiring its own preregistration and regression. Do not silently adopt it.
Time box: once the exact mechanism is understood, investigate only a small number of causally justified fixes. If no clean local/principled solution emerges, close Track A as an engine/configuration limitation and retain the rigid-foot fallback. Do not spend the day tuning Jolt.
Track B — PI-1 using pose-compatible promotion
In parallel, continue the character-derived gameplay-collider work and determine the subset of ordinary running poses in which the existing rigid F0 physical foot is genuinely compatible with the presentation foot.
This is not permission to hide the toe incompatibility. Explicitly define and preregister a pose-compatibility gate before selecting PI-1 cases.
A frame is eligible only when the rigid physical foot can reproduce the presentation foot/ankle geometry within the already frozen promotion tolerances without:
- changing the authoritative simulation state;
- changing collision geometry to obtain a desired outcome;
- penetrating the turf;
- exceeding joint limits;
- introducing a meaningful promotion impulse;
- or visibly snapping the foot into a different configuration.
Derive the runner gameplay collision primitives from the rendered/physical character as previously approved. Do not retain the old generic 0.865 m runner geometry merely because it preserves historical tackle labels.
Rebaseline slide-contact from that corrected geometry and search naturally for the three PI-1 classes:
1. near miss;
2. recoverable collision;
3. authoritative fall-producing collision.
For each candidate, report whether the predicted promotion frame passes the pose-compatibility gate.
Do not alter tackle geometry, contact timing or promotion timing to move a case into a compatible pose.
If compatible examples naturally exist, freeze those candidates and proceed through the existing PI-1 compatibility gate.
If the near miss/recover/fall set cannot all be represented using F0-compatible poses, report exactly which class is blocked and stop that portion rather than manufacturing a fixture.
Important interpretation
A successful Track B result does not mean the articulated-toe problem is solved. It means our interaction-promotion architecture can be tested over the subset of running states already representable by the current physical character.
Conversely, failure of F1 by itself is not evidence for V3 unless the evidence shows an unavoidable limitation of the body/joint/contact architecture rather than a Jolt warm-start/contact implementation issue.
Order of work
Run Tracks A and B independently enough that one cannot contaminate the other's criteria or geometry.
If Track B reaches a valid frozen PI-1 candidate set while Track A is unresolved, you may proceed with PI-1 using F0 only under the preregistered pose-compatible restriction.
If PI-1 reaches near miss → recover → fall successfully, perform the previously approved modest robustness perturbation check and stop before broader production integration.
If Track A finds a clean toe solution, validate and freeze it separately. Do not retroactively substitute F1 into an already-running PI-1 battery. F1 integration into PI-1 would be a subsequent versioned experiment.
Preserve simulation authority and animation ON/OFF neutrality throughout.
Commit all preregistrations, diagnostics, failures and results normally. Give me separate conclusions for:
A. Is the articulated-toe energy problem locally/principally fixable?
B. Can PI-1 work correctly today using pose-compatible F0 promotion?
C. What capability remains blocked if A fails but B passes?
Proceed autonomously until one of the existing hard-stop conditions is reached.
