# User decision, 2026-10-03: G3 not declared passed; one resolution / diagnostic pass (D1–D6)

Verbatim (the user's message, as pasted):

---

G3's physical result is encouraging, but do not declare G3 passed and do not start G4.
I want one resolution/diagnostic pass over the four failed rows and the ankle-twist finding.
D1 — Browser/Node determinism
APPROVE fixing the forbidden/non-deterministic leg-IK math.
Replace the Math.hypot / Math.atan2 path with the project's deterministic approved math implementation while preserving the intended G2 IK calculation.
Because this changes accepted G2 at the last-bit level:
1. implement the deterministic fix;
2. rerun all relevant G0/G1 integrity checks;
3. rerun the complete 620-run G2 validation;
4. rerun browser-vs-Node and snapshot/restore;
5. only if G2 passes, rerun G3 from the preregistered criteria.
Do not alter controller behavior to compensate for the deterministic-math change.
D2 — ankle twist: DIAGNOSE ONLY
Do not yet add ankle stiffness, another actuator, or change ankle anatomy.
The reported 10–13° ankle/leg twist during transfers and G2 pushes needs a focused causal characterization before we decide whether it is a defect.
Measure for G2 pushes and G3 transfers:
- ankle ab/adduction and inversion/eversion coordinate(s);
- ankle twist/rotation coordinate(s);
- subtalar-like motion represented by the current joint, if applicable;
- foot orientation relative to shank;
- tibial orientation;
- knee rotation;
- hip rotation;
- passive ankle torque by axis;
- active actuator torque by axis;
- ground-reaction wrench;
- CoP;
- stance load;
- whether the apparent 10–13° comes from one joint coordinate or coupled motion through the leg.
Establish:
1. exactly which physical DOF produces the visible twist;
2. whether it occurs under load, unloading, or both;
3. whether it is restoring, neutral, or unstable;
4. whether the same behavior exists in accepted G2;
5. whether it increases materially as support approaches single-leg;
6. whether current human biomechanics evidence supports or contradicts the magnitude/mechanism.
You may research primary biomechanics literature if needed.
Return with options, but do not change approved ankle anatomy/passive tissue/actuator structure without my decision.
D3 — criterion I, morphology
Do not tune the short-leg body from 94.9% to 95%.
Preserve the 94.9% result.
Audit why the G3 criterion uses a universal 95% stance-load threshold.
Determine whether 95% was:
- evidence-derived;
- mechanically required for subsequent foot swing;
- or simply an engineering definition of near-single-support.
Measure the short-leg body's unloaded-foot state at its 94.9% maximum, including contact force, contact pieces, friction demand, and whether the leg is mechanically sufficiently unloaded for a future G4 swing.
Recommend whether the criterion should remain universal, become morphology-aware, or define near-single-support through the unloaded-foot requirement instead.
Do not change the criterion yet.
D4 — criterion J, symmetry
Preserve the measured 0.76 mm left/right slip difference.
Determine the actual numerical/contact mirror-symmetry floor using mirrored repeated runs of G2 and G3.
The accepted G2 body reportedly shows differences up to 1.5 mm in the same class of situation. Quantify this properly.
Do not tune controller decisions, which are already mirror-identical, merely to satisfy a 0.5 mm tolerance.
Recommend an evidence-based symmetry criterion after measuring the plant's deterministic mirror floor.
Do not change it yet.
D5 — performance criterion S
Do not optimize the controller because of 0.152 ms measured with nine concurrent runs when an isolated run measures approximately 0.038 ms.
Establish a reproducible performance benchmark:
- isolated process;
- warm-up;
- repeated trials;
- median and high percentile;
- instrumentation cost separated where practical.
Report whether G3 genuinely exceeds the 0.15 ms controller budget under that methodology.
Do not change the budget after seeing the result unless its original definition was ambiguous; if so, report that ambiguity for my decision.
D6 — redundant mechanisms
Test removal of:
- support only from touching feet;
- hold the unloaded foot still.
Do this as diagnostic branches/configurations first.
If removing either is genuinely bit-identical or behaviorally equivalent across the complete relevant G2/G3 validation and boundary cases, recommend deletion rather than carrying unnecessary safeguards into G4.
Do not remove anything merely because one nominal scene looks unchanged.
After the deterministic fix, rerun G2 as required and then rerun G3 without changing the four disputed criteria.
I want the resulting failures preserved honestly.
Then stop with a decision report containing:
1. post-fix G2 result;
2. post-fix G3 result;
3. ankle-twist causal analysis;
4. evidence behind the 95% criterion and the short-leg 94.9% case;
5. measured mirror-symmetry floor;
6. isolated controller-performance result;
7. redundant-mechanism results;
8. your recommended resolution for each remaining failed criterion;
9. whether the physical pre-step state remains demonstrated.
Do not start G4.
Commit locally only. Nothing pushed.
