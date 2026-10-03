<!-- preserved verbatim: the user's decisions on the V2-G1 findings G1-C1…C7, 2026-10-03. -->

I approve the overall G1 diagnosis. Do not start G2.
Apply the following decisions.
C1 — APPROVE 60 solver iterations for the current V2 validation baseline.
Your controlled experiment shows the lower range retains a warm-start impact artifact and 60 removes it for ~12% additional solver cost. Record this as the validated baseline, not necessarily the eventual production optimum.
C2 — APPROVE the anatomical-end-stop concept, but do not use one arbitrary offset for every joint.
The anatomical ROM remains the meaningful passive limit. Implement a stiff passive end-stop approaching/beyond that boundary, with Jolt's hard constraint acting only as an emergency numerical stop outside it.
Derive the smallest hard-stop margin required per joint/joint class from controlled overshoot tests. The objective is:
- ordinary passive loading is resisted by the anatomical end-stop;
- the Jolt hard stop is rarely reached;
- the body does not gain energy;
- transient excursions remain bounded and documented;
- settled joints return inside anatomical ROM.
Do not silently redefine human ROM to whatever Jolt permits.
C3 — DO NOT ADOPT THE TWO-PIECE BOOT YET. Run a focused contact-manifold experiment first.
Compare at minimum:
1. current approved boot convex hull;
2. your proposed two-piece decomposition with identical external geometry;
3. one additional reasonable convex/compound representation if one exists without changing anatomy.
For each, test the relevant Jolt contact optimizations/settings independently where practical.
Measure under:
- quiet foot loading;
- heel contact;
- flat contact;
- medial/lateral edge loading;
- toe/forefoot loading;
- ordinary passive falls;
- a bounded higher-speed impact.
Record:
- first-contact penetration;
- maximum transient penetration;
- settled penetration;
- contact count/manifold;
- normal stability;
- friction stability;
- CPU cost;
- any jitter/explosion.
Do not choose solely by the smallest single penetration number. Prefer the simplest representation that gives stable, physically credible contact across the operating envelope.
Stop for my decision if this requires changing the approved external foot geometry.
C4 — APPROVE the two-sphere head collider, provided it preserves the approved external head dimensions/mass/inertia and G0 anthropometry. Treat this as collision representation, not anatomy. Rerun G0.
C5 — APPROVE correction of the contradictory rest-contact criteria.
If the validated Jolt configuration deliberately permits ≤5 mm contact slop, use that as the declared resting-contact tolerance. Remove requirements that simultaneously demand ≤3 mm or exactly zero overlap where the engine contract cannot provide them.
Keep separate metrics for:
- resting penetration;
- transient impact penetration;
- disabled self-collision pairs;
- unintended interpenetration.
C6 — APPROVE numerical-floor-based momentum tolerances.
Replace the impossible 1e-6 criterion with tolerances justified by your measured float32/Jolt baseline. Your proposed starting floors of approximately ≤2e-5 linear and ≤5e-3 angular are acceptable if the controlled free-body tests support them.
Document absolute and relative drift and retain the raw values so future engine changes can be detected.
C7 — DO NOT move V2 globally to 720 Hz and do not enable CCD indiscriminately.
Re-scope the 15 m/s humanoid impact criterion.
For articulated player bodies, the primary high-speed requirement is:
no tunnelling / no missed collision / no catastrophic constraint failure across the credible football-player collision envelope.
Establish a defensible player-body test envelope from expected football motion rather than making 15 m/s at ≤3 mm penetration an arbitrary universal requirement.
Keep 240 Hz as the candidate baseline unless evidence from realistic player-body scenarios disproves it.
Treat ball collision separately. The eventual football may use CCD/swept collision or another higher-precision contact path without requiring every articulated player body to run at 720 Hz.
After applying the approved C1/C2/C4/C5/C6 changes and completing the C3 experiment:
1. rerun G0;
2. rerun G1;
3. rerun the timestep sensitivity study;
4. verify all body variants;
5. verify deterministic replay;
6. report the C3 alternatives separately;
7. report the revised high-speed/no-tunnelling envelope separately.
Do not weaken a criterion merely because it failed. Every changed criterion must have the measured engine/physics justification recorded in DECISIONS.md.
If G1 still fails after these decisions, stop with the remaining causal failures.
If G1 passes except for C3 awaiting my choice, stop.
Do not begin G2 under any circumstance.
Commit locally only. Do not push. Leave the G1 review server running.
