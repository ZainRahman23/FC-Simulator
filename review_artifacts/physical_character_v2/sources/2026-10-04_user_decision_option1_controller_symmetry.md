# User decision, 2026-10-04 — approve Option 1 (controller symmetry corrections), characterize the J2b floor independently, near-reach-limit IK investigation; STOP before J2b tolerances

(verbatim)

Decision: approve Option 1, with the following constraints.
The three diagnosed asymmetries are implementation defects and should be corrected. Do not preserve an asymmetric controller merely because its errors partially cancel the plant's solver-order asymmetry.
1. Adopt the foot-region symmetry correction
Construct left/right usable foot/CoP regions by a mathematically mirror-consistent method.
Requirements:
- identical intended external boot geometry;
- identical physical dimensions;
- no arbitrary vertex deletion/addition to obtain a gate result;
- mirrored input geometry must produce mirrored usable regions;
- deterministic ordering/canonicalization;
- no meaningful reduction of valid CoP area merely to force symmetry.
Preserve the old diagnostic evidence showing the 4.8 µm region difference and its amplification near the CoP boundary.
2. Adopt the symmetric leg-IK correction
Replace the one-sided finite-difference/convergence behavior with a mirror-equivariant method.
The fix must address the mathematical cause rather than special-case left/right.
Before selecting the exact implementation, test at least the corrected method against:
- ordinary G2/G3 targets;
- near-single-support;
- swing-ready unloaded states;
- targets near the reachable boundary;
- mirrored targets in all relevant directions;
- multiple body morphologies.
Preserve finite actuator/reach constraints.
Do not allow the IK to achieve symmetry by changing the physical target or silently relaxing reachability.
Because G4 will depend heavily on this component, add a permanent mirror-equivariance regression for the IK itself.
3. Adopt the quaternion correction
Correctly normalize or otherwise robustly handle Jolt's float32-derived orientations before applying formulas that assume unit quaternions.
Verify:
- no material orientation change beyond removal of numerical error;
- left/right axis correspondence;
- determinism;
- no NaN/degenerate behavior near identity or 180-degree rotations.
Add a focused regression.
4. Correct the erroneous sigmaErr J2a check
Remove it from J2a gating because it measures quaternion/unit-length numerical state rather than a controller output.
Preserve it as a diagnostic if useful.
Record that the preregistered J2a formulation contained this category error; do not rewrite history.
5. Re-establish the J2b physical symmetry floor independently
Do not set new tolerances from the two currently failing values (0.126 mm, 2.08 mm).
After the controller corrections are fixed, measure the physical mirror floor using a separate preregistered characterization set.
Use:
- mirrored initial states;
- tiny symmetric perturbations around those states;
- all body variants;
- no-slide states;
- ordinary transfer states;
- sliding-but-recovering states;
- pushes near but below the recovery boundary;
- multiple durations/speeds;
- repeated deterministic runs.
Separate at least:
A. no meaningful sliding;
B. physical sliding followed by recovery;
C. physical failure.
For C, symmetry is evaluated only until the common abort/failure declaration.
Report distributions and maxima rather than only worst cases.
Determine how much asymmetry comes from:
- Jolt constraint/solver ordering;
- contact ordering;
- floating-point state;
- morphology;
- actual sliding/contact transitions.
Then recommend simple engineering tolerances with defensible margin above the independently measured numerical/physical floor.
Do not tune controller or plant to lower that floor.
Stop for my approval of any revised J2b numerical tolerances before using them to declare G3 passed.
6. Performance
Use the previously approved isolated benchmark methodology.
The production budget remains 0.15 ms/tick for controller + required actuator computation.
Measure:
- controller alone;
- IK contribution;
- controller + required actuator computation;
- median;
- p99.
Do not use the nine-worker validation measurement as the production performance gate.
Do not optimize the corrected IK unless the proper isolated benchmark demonstrates a meaningful budget problem.
7. Regression
After adopting the three controller corrections, rerun:
- relevant unit/component regressions;
- G0 integrity where affected;
- G1 integrity;
- complete 620-run G2;
- browser = Node;
- snapshot/restore;
- J2a over all 81 pairs;
- G3 physical outcomes.
Compare G2/G3 before/after and explain every changed outcome.
A one-run change is not automatically acceptable merely because aggregate behavior is similar.
If a material recovery boundary moves or an earlier physical capability disappears, stop rather than tuning.
8. Near-reach-limit IK investigation
Before the ankle experiment, perform the already identified near-reach-limit IK test because G4 swing trajectories will depend on it.
Establish:
- reachable-target accuracy;
- unreachable-target classification;
- convergence behavior near the boundary;
- mirror equivariance;
- sensitivity to starting configuration;
- morphology effects;
- computational cost.
We do not want G4 to discover that a target classified as reachable depends on which leg is solving it.
STOP POINT
Implement and validate the three corrections, characterize J2b's true floor, run the near-reach-limit IK investigation, and then STOP for my decision on the J2b tolerances.
Do not start the ankle experiment yet.
Do not declare G3 passed yet.
Do not start G4.
Nothing pushed; local commits only.
Return with:
1. exact implementation of each correction;
2. J2a before/after;
3. G2 before/after;
4. G3 physical before/after;
5. independent J2b floor distributions;
6. proposed J2b tolerances and justification;
7. isolated performance including IK cost;
8. near-reach-limit IK results;
9. regressions/determinism;
10. remaining concerns.
