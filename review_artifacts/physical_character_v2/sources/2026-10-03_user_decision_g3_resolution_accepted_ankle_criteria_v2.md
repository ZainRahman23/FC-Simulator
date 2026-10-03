# User decision, 2026-10-03: resolution report accepted; G1 determinism, ankle neutral-zone law, G3 criteria v2 (I, J, S), keep safety mechanisms

Verbatim (the user's message, as pasted):

---

The resolution report is accepted as the basis for the next work. Do not start G4.
We will resolve the remaining G3 issues now.
D1 — deterministic math
ACCEPTED.
The deterministic-math correction is approved.
Preserve the pre-fix G2 artifacts as already done.
Apply the same deterministic-math correction to the equivalent call in the G1 passive layer only if it is semantically the same forbidden-math issue and does not change intended mechanics.
Because that touches G1 code, rerun all affected G1 determinism/regression checks afterward. Do not otherwise modify G1.
D2 — ankle neutral-zone stiffness
I agree that the measured ankle twist is a plant modelling defect that should be resolved before G4.
However, do not simply choose a stiffness because it gives the best controller result.
First preserve the current zero-neutral-stiffness ankle as the historical accepted G1/G2 baseline.
Then implement an evidence-based passive restoring law for the affected ankle ab/adduction/inversion-eversion coordinate.
Requirements:
- preserve the approved anatomical ROM/end range;
- preserve actuator strength;
- preserve joint topology;
- add no active control;
- passive torque must always be restoring/dissipative as appropriate;
- no hidden energy generation;
- left/right exactly mirrored;
- stiffness must be grounded in the human biomechanics evidence identified in the investigation.
Test a preregistered plausible range around the evidence-supported estimate, including approximately:
0.3, 0.4 and 0.5 N·m/degree
if those values remain supported after checking units/definitions against the primary sources.
Do not choose the value by G3 score.
Choose the value that best represents the defensible human passive ankle behavior, with sensitivity results reported separately.
Explicitly distinguish whether the literature measures:
- inversion/eversion;
- ab/adduction;
- internal/external rotation;
- or a coupled ankle/subtalar coordinate,
and map that carefully to our simplified joint coordinate. Do not silently treat different anatomical axes as equivalent.
After selecting the evidence-backed passive law, rerun:
1. G0 integrity where applicable;
2. full G1;
3. heel-rise investigation/regression;
4. G1 energy/passive-tissue checks;
5. all 620 G2 tests;
6. G2 push symmetry and recovery envelope;
7. full G3.
Report exactly what changes relative to the previously accepted G1/G2 baselines.
If the evidence does not justify mapping a passive stiffness to our current ankle coordinate, stop rather than inventing one.
D3 — G3 criterion I
APPROVE replacing the arbitrary universal ≥95% stance-foot criterion.
The 95% number was illustrative, not evidence-derived, and should not define success.
Define support state from the departing/unloaded foot, because that is the mechanically relevant requirement for subsequent swing.
Use:
Near-single-support: settled unloaded-foot vertical load ≤5% body weight.
Swing-ready/full unloading: unloaded-foot vertical load ≤2% body weight, with no material dragging/relocation and with the stance state remaining controlled.
Preserve actual stance-foot percentages in reports rather than hiding them.
The short-leg 94.9% historical failure remains recorded as a valid result under the old criterion; do not erase it.
Validate the revised criterion on all required body/morphology variants.
D4 — G3 criterion J
APPROVE replacing the unsupported 0.5 mm universal mirror-slip tolerance with the measured physical/numerical symmetry floor.
Preregister:
- when neither mirrored trial undergoes meaningful sliding: left/right positional difference ≤0.1 mm;
- when physical sliding occurs: same qualitative outcome and ≤2.0 mm mirrored positional/slip difference.
Controller decisions and commanded quantities must remain mirror-identical within deterministic numerical tolerance.
Report actual values.
Do not use the wider sliding tolerance to hide controller asymmetry.
Preserve the old 0.76 mm failure in the historical results.
D5 — performance criterion S
The implementation is not demonstrated to exceed the budget.
Define the G3 performance gate using an isolated-process benchmark, not multiple simultaneous validation jobs competing for the same CPU.
Preregister the benchmark method:
- isolated process;
- no unrelated validation jobs running;
- fixed scenario/workload;
- warm-up before measurement;
- sufficient repeated trials;
- report median and p99;
- separate controller-only cost;
- separately report actuator computation;
- separately report optional diagnostic/instrumentation overhead.
The 0.15 ms budget remains unchanged.
Decide explicitly from the original specification whether that budget covers:
A. G3 controller logic alone, or
B. controller + actuator computation.
If the original specification cannot resolve that ambiguity, use the more conservative controller + actuator computation interpretation for the gate while reporting both numbers.
Do not include optional review instrumentation in the production-controller budget.
Do not change the 0.15 ms number.
D6 — safety mechanisms
KEEP BOTH.
Preserve:
- hold the unloaded foot still;
- support only from touching feet.
The expanded diagnostics demonstrate that they are not redundant.
Document their exact authority carefully.
In particular, hold the unloaded foot still must remain a legitimate finite-actuator posture/control objective, not world-space foot pinning.
Measure its actuator demand.
If it contains any direct world-space position/velocity write or hidden constraint, stop immediately and report it.
support only from touching feet should remain a logical support-state rule derived from physical contact, not a force-generating mechanism.
D7 — G4 input: unloaded-foot disturbance sensitivity
Preserve as an explicit handoff finding:
With the unloaded-foot hold removed, 5–10 N·s disturbances can relocate a fully unloaded foot by approximately 31–67 mm.

Do not solve this by pinning the foot.
This is an important input to G4: once the foot unloads, deliberate finite-actuator swing-leg control must take responsibility for its trajectory.
FINAL VALIDATION
After the ankle plant correction and approved criterion clarifications:
1. rerun all affected earlier gates;
2. rerun G3 against the revised criteria;
3. do not tune G3 specifically to obtain a pass;
4. preserve old failed evaluations and criteria in the historical record;
5. clearly version the new criteria as an approved post-investigation revision rather than pretending they were the original criteria.
I want the final report to include:
- selected ankle passive law and primary evidence;
- sensitivity across the tested stiffness range;
- ankle twist before/after in G2 and G3;
- single-support ankle behavior;
- energy/passivity verification;
- G1 regression result;
- G2 full regression result and any changed physical outcomes;
- G3 result under revised criteria;
- all body variants;
- near-single-support and ≤2% swing-ready results;
- mirror symmetry;
- isolated performance median/p99;
- unloaded-foot hold actuator demand;
- updated technical debt;
- review URL and curated scenes.
If the ankle correction causes a material regression elsewhere, do not tune around it. Diagnose and stop if another architectural/specification decision is required.
If G0/G1/G2 all remain valid and G3 passes under the approved revised criteria, commit locally, update the decision record/handoff, and answer:
Has V2 now demonstrated a physically controlled, biomechanically defensible pre-step state sufficient to begin G4 single-step development?

Then STOP.
Do not start G4.
Nothing pushed.
