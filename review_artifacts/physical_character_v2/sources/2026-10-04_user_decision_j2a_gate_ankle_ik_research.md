# User decision, 2026-10-04 (after the overnight pre-G4 report): J2 Option (a) — J2a normative gate, J2b diagnostic, G3 PASS; IK / anatomical-reachability research; Phase F ankle + Phase G 180 Hz; no G4

(verbatim, as pasted by the user; the first paragraphs are the user's commentary, the decision text follows "Send:")

This was a productive overnight run. Claude did exactly what we wanted: it didn't force G3 through, and the thing blocking it now is revealing that J2b is probably conceptually the wrong kind of gate, not that the character is failing weight transfer.
I agree with Claude's Option (a): make J2a the symmetry gate and retain J2b as a plant-symmetry diagnostic.
The evidence for that is unusually strong. J2b cannot simultaneously have a reasonable margin above the measured numerical/contact floor and detect deliberately introduced physical asymmetries such as a 5% right-side strength reduction, 5% heavier right foot, or 2 mm foot-region shift. In contrast, J2a detects all three injected asymmetries by 9–12 orders of magnitude. That's effectively a validation of the test itself.
That means J2b is measuring something real—chaotic divergence between two independently evolved contact simulations—but it's a poor detector of the property we actually care about: whether the character/controller itself is left-right symmetric.
And everything underneath it is now remarkably clean:
- G0 PASS
- G1 PASS, bit-identical to the historical accepted simulation
- G2 PASS, zero outcome changes from the accepted baseline
- G3 20/20 rows pass, with declaration withheld only because J2b failed its test-of-the-test
- Browser/Node checks pass
- symmetry fixes are in
- controller-side quaternion normalization avoids contaminating passive physics
- IK convergence is now deterministic/mirror-exact
- performance is back down around 0.093–0.103 ms/tick vs 0.15 ms budget
That's exactly the foundation we wanted before investigating the ankle.
There is one other significant result: 8% of the geometrically reachable G4-like footholds require anatomically invalid poses, mostly roughly ±45° toe-in/out through hip rotation. That validates why Claude stopped instead of blindly taking the existing IK into G4. But I don't think it should block the ankle investigation. It should become an explicit pre-G4 problem: foothold reachability must eventually mean anatomically reachable, not merely geometrically reachable.
I'd now give Claude permission to close G3, do the ankle investigation and 180 Hz investigation, while also researching the joint-limit IK problem—but still not start G4.
Send:
Decision 1 — J2: approve Option (a).
Make J2a the normative left/right symmetry gate.
J2b is no longer a pass/fail symmetry gate. Preserve it permanently as a plant mirror-divergence diagnostic.
Rationale to record:
- J2a directly tests the property we care about: mirror-equivariance of controller decisions from mirrored physical inputs.
- J2a detects all three deliberately injected asymmetries (5% unilateral strength loss, 5% heavier right foot, 2 mm unilateral foot-region shift) by 9–12 orders of magnitude.
- J2b cannot maintain a reasonable margin above the independently measured contact/numerical floor while detecting those deliberately introduced asymmetries.
- J2b therefore measures chaotic divergence of independently evolved contact trajectories, which is useful diagnostic information but is not a sufficiently sensitive symmetry gate.
- This is a test-design correction supported by the preregistered test-of-the-test, not a relaxation made because the production character failed.
Preserve every historical J2/J2a/J2b definition and result.
Keep reporting J2b by class (no slide / slide-recover / failure-to-abort etc.), distributions and maxima so future regressions remain visible.
With J2a passing and the other 19 criteria-v3.2 rows passing, declare G3 PASS 20/20 under the newly versioned criterion definition.
Commit this criterion decision separately and locally.
Decision 2 — IK / anatomical reachability
Do not adopt the experimental limit-respecting IK yet.
The finding that 1,336 / 20,736 (~8%) geometrically reachable G4-like targets require a pose outside anatomical limits is important and must become a G4 design input.
Before G4, we will need a distinction among:
1. geometrically reachable;
2. anatomically reachable;
3. dynamically executable from the current physical state.
Preserve the opt-in joint-limit IK and all its tests as research infrastructure.
During this runway, improve its fallback/unreachable-target behavior if that can be done without choosing new anatomical limits or changing the approved body.
Investigate candidate approaches for constrained IK / anatomically valid reachability and compare them, but do not make a major IK architecture decision for G4 yet.
Particularly characterize the invalid 8%:
- target direction;
- distance;
- required hip rotation;
- knee state;
- ankle state;
- morphology;
- whether the target would plausibly be requested by normal walking/running rather than extreme ±45° toe orientation.
Produce a proposed anatomical foothold-reachability contract for later approval.
Do not start swing execution or stepping.
Decision 3 — proceed with Phase F ankle reinvestigation
G0–G3 are now sufficiently clean to proceed.
Run the already drafted/preregistered ankle experiment.
Preserve:
- flat-plane turf;
- accepted anatomy;
- accepted actuator strengths;
- accepted contact architecture;
- corrected foot regions;
- controller-boundary quaternion normalization;
- corrected deterministic IK;
- G0/G1/G2/G3 baselines.
Evaluate:
- k = 0 historical baseline
- k = 0.11 N·m/°
- k = 0.13 N·m/°
- k = 0.15 N·m/°
Do not add/tune intermediate values after seeing scores merely to manufacture a winner.
Evaluate each against passive physics, G1, standing/G2 and pre-step/G3.
Measure explicitly:
- ankle internal/external rotation;
- shank rotation relative to planted foot;
- hip counter-rotation;
- knee rotation;
- passive ankle torque;
- actuator torque;
- CoP;
- foot slip;
- unloaded-foot movement/drag;
- settling and re-centering;
- loaded vs unloaded behavior;
- morphology sensitivity;
- timestep/rate sensitivity;
- energy/passivity.
Remember the purpose: remove the unphysical free ankle/shank twist with an evidence-supported passive law without degrading the validated plant.
Do not select by G3 score.
Phase G — 180 Hz investigation
For every nonzero ankle candidate, explicitly investigate the previously observed 180 Hz passive-layer energy event.
Determine the exact first bad tick and complete energy ledger.
Establish whether it is:
- legitimate release of previously stored passive potential;
- numerical integration error;
- end-stop/passive-law interaction;
- timestep instability;
- another Jolt/contact artifact;
- or an instrumentation error.
Sweep rates sufficiently to establish convergence/divergence behavior.
Include at least the previously relevant 180 / 240 / 360 / 480 / 720 Hz region where practical.
Determine whether the state is reachable during plausible football motion or only pathological stress testing.
Do not accept unexplained net energy creation merely because 240 Hz passes.
If this exposes a foundational passive-law defect, investigate it deeply before choosing an ankle candidate.
Ankle selection
If no nonzero candidate satisfies the preregistered requirements, do not tune another value to make one pass.
Report why.
If multiple candidates pass, rank them by:
1. biomechanical evidence;
2. passive-physics integrity;
3. human-like ankle/shank twist;
4. G2 behavior;
5. G3 behavior;
6. morphology robustness;
7. rate robustness;
8. simplicity.
Do not automatically adopt the winner if choosing among valid biomechanical candidates involves a meaningful tradeoff. Stop for my decision.
If one candidate is uniquely supported by both the preregistered evidence and all validation with no meaningful tradeoff, you may recommend it strongly, but still stop before adoption unless it is merely implementing an already-approved value.
Additional unattended work
You may use remaining time to:
- expand perturbation testing;
- attack the ankle candidates with held-out cases;
- investigate constrained/anatomical IK;
- characterize the invalid 8% foothold set;
- profile performance;
- improve diagnostics;
- add permanent regression tests for demonstrated bugs;
- test body morphologies;
- test numerical boundaries;
- test mirror invariance;
- inspect relevant implementation/source code.
When something passes, try to falsify it.
Do not tune to gates.
STOP CONDITIONS
Do not start G4.
Do not implement:
- foot lift;
- swing trajectories;
- touchdown planning;
- stepping;
- repeated stepping;
- walking.
Do not alter approved anatomy, mass/inertia, joint limits, actuator capacities, foot dimensions, skeleton contract or physics rate without my approval.
Nothing pushed. Local coherent commits only.
Final report
Return with:
1. G3's final versioned criterion definition and PASS evidence;
2. J2a results and deliberate-asymmetry detection;
3. J2b diagnostic distributions;
4. ankle results for k=0/0.11/0.13/0.15;
5. complete 180 Hz finding;
6. G1/G2/G3 effects of every ankle candidate;
7. energy/passivity results;
8. ankle recommendation;
9. anatomical-IK / invalid-foothold characterization;
10. proposed foothold-reachability contract;
11. performance;
12. new regressions/instrumentation;
13. remaining technical debt;
14. local commits and review URLs;
15. the single biggest remaining blocker to starting G4.
Stop at the pre-G4 decision point.
