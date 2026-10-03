# User decision, 2026-10-03: approve option A for G3 row J2 (split into J2a / J2b, criteria v3), then the ankle re-investigation

(verbatim)

Decision: approve A, with the following precise interpretation.
J2 currently conflates two different properties. Replace it with two explicitly separate checks and preserve the original J2 failure/results in the historical record.
J2a — controller mirror equivariance
This is the actual controller-symmetry gate.
Starting from the same real physical state, construct its exact mirrored counterpart and feed the two mirrored states independently into the controller.
Compare:
- requested weight split;
- commanded CoP;
- joint/actuator commands;
- support-state decisions;
- continue/abort decision;
- any other controller output that can affect physics.
The controller must be mirror-equivariant to deterministic numerical tolerance.
Do not compare two independently evolved physical trajectories for this check.
Preregister tolerances from the demonstrated deterministic numerical floor, not from the result needed to pass.
J2b — mirrored physical-outcome symmetry
Keep this as a separate plant/controller-system check using paired physical runs.
Preserve the previously approved D4 interpretation:
- when neither run undergoes meaningful sliding: mirrored positional difference ≤0.1 mm;
- when physical sliding occurs but the controlled recovery continues: same qualitative outcome and ≤2 mm mirrored positional/slip difference;
- for requests that physically fail, compare only through the common abort/failure declaration. Require the same qualitative failure and compatible failure timing; do not continue scoring positional symmetry after control has terminated and the bodies are freely falling.
Controller commands must still satisfy J2a independently.
Do not widen these tolerances merely to obtain a pass.
Recheck all 81 mirrored pairs.
Preserve:
- the original J2 definition;
- its 18/19 G3 result;
- the reason it was found to conflate controller and plant symmetry;
- all old measurements.
Version this explicitly as a post-investigation criterion correction.
If J2a/J2b pass exactly as preregistered, G3 may be declared PASS under criteria v3 provided all other 18 rows remain passing and no physical result changes.
Then proceed to the ankle reinvestigation
If and only if G3 passes after the above correction, proceed with the already drafted ankle experiment.
Keep the flat-plane turf.
The catastrophic box-turf GJK/EPA defect has now been removed from this experiment, so re-evaluate the ankle question from scratch rather than assuming the previous stiffness conclusions remain valid.
Preregister and test the literature-supported candidates already drafted:
k = 0.11, 0.13, 0.15 N·m/°
against the historical k = 0 baseline.
Do not select by G3 score.
For every candidate require, at minimum:
1. G1 passive-physics integrity/passivity;
2. no unexplained energy creation;
3. no contact-validity violation;
4. acceptable anatomical excursions;
5. G2 standing/push behavior remains valid;
6. G3 support transfer remains valid;
7. materially improved pathological free ankle/shank twist;
8. no unacceptable unloaded-foot dragging or new compensatory behavior.
Explicitly measure before/after:
- ankle internal/external rotation;
- shank rotation relative to planted foot;
- hip counter-rotation;
- knee rotation;
- passive torque;
- actuator torque;
- CoP;
- foot slip;
- unloaded-foot relocation;
- stance/swing-ready loads;
- energy/passivity;
- settling/re-centering after perturbation;
- morphology sensitivity.
Also investigate the already observed 180 Hz passive-layer effect with nonzero ankle stiffness separately. Do not dismiss it because 240 Hz passes.
The previously noted post-fall leg-IK mirror imperfection is not a current gate failure, but characterize whether it affects any G4-relevant swing-leg state. Do not redesign IK unless necessary.
If none of 0.11/0.13/0.15 satisfies the preregistered requirements, do not invent/tune another stiffness merely to get a pass. Stop and report what fails.
If one or more candidates satisfy every requirement, do not automatically adopt one. Rank them from biomechanical evidence and measured behavior and stop for my approval.
Do not start G4.
Commit locally only. Nothing pushed.
