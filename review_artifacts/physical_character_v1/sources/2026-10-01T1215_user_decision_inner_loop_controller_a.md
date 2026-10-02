<!-- preserved verbatim from Claude session d4761610-c35f-4019-9308-cb83973e7b76, transcript line 7990. -->

Approved: proceed with the proposed inner-loop-first → Controller A measured-response placement+timing, with SIMBICON-style Controller B as the comparison baseline.
I approve using approximately 105–115 steps/min at 0.6–0.8 m/s and approximately 0.20–0.22 m nominal width as evidence-backed experimental starting regions, not immutable constants.
The characterization has convinced me that we should stop tuning the old controller. Preserve its evidence and move forward.
A few important requirements:
1. Fix the inner loop first, but don't bake in an artificial final gait.
Make double support/contact sufficiently predictable for controller design. Reduce the opposing rear-foot push/front-foot braking couple that is producing excessive twist.
If a temporarily simplified/flat-foot touchdown is useful diagnostically, that's acceptable, but flat-foot walking is not the final G2b target. Preserve the ability to return to physically meaningful heel contact → loading → heel rise → push-off/toe-off once the controller is stable.
2. Controller A should control both placement AND timing from the measured physical state.
Do not create separate independent forward/lateral correction laws if the measured plant says those dimensions are strongly coupled.
Use the measured state necessary to capture the coupling, including appropriate COM position/velocity and, where justified, angular state/support phase.
The controller should request:
- reachable next foothold;
- step timing/duration;
and nothing more powerful.
Jolt still decides what actually happens.
3. Do not attempt perfect one-step correction.
Your characterization shows that perfect correction is fragile and can amplify errors ~4× when timing changes.
Design for partial stable convergence over multiple steps.
Small errors should decay rather than alternate and grow.
Explicitly measure the closed-loop step-to-step eigenvalues/amplification or equivalent stability measure after implementation.
Success requires the dominant error dynamics to be stable across the tested operating region, not merely for one exact cadence/state.
4. Timing must be part of the model.
The 0.40 versus 0.45 s result is important.
Do not fit one placement map at one timing and assume it generalizes.
Either condition the measured-response model on step timing or otherwise demonstrate why the chosen representation remains stable as timing changes.
Refine the response model online only in a deterministic, bounded, auditable way if necessary.
5. Solve yaw physically.
Investigate and reduce the excessive double-support twisting couple.
Add/refine trunk and arm counter-rotation where physically justified.
Do not pin pelvis heading or inject external yaw torque.
Turning must remain possible.
Compare whole-body normalized angular momentum against the human evidence you found. We should move materially toward the human range rather than merely hiding visible pelvis yaw.
6. Keep SIMBICON as an actual baseline.
Implement the smallest fair Controller-B baseline inside the same physical architecture and test it against the same scenarios.
Don't bias the comparison to make A win.
Compare:
- stability;
- perturbation recovery;
- step variability;
- timing sensitivity;
- foot placement;
- yaw/angular momentum;
- human-likeness;
- torque/saturation;
- performance;
- determinism.
If B unexpectedly performs better, report it rather than forcing A.
7. Respect the measured forward-speed boundary.
The C8 failure mode matters.
Do not force the walker through a state where the trailing leg is fully extended and the swing foot cannot make a viable next step.
Determine whether the controller can prevent entry into that state through timing/placement. If the requested speed genuinely exceeds the walking capability of this gait/body, expose that as a capability boundary rather than cheating.
8. G2b must prove sustained walking.
Once the controller exists, don't stop at 10 or 20 successful steps.
Test long enough to reveal slow divergence.
Include:
- multiple deterministic initial states/phases;
- 0.6–0.8 m/s region;
- cadence variation around the nominal region;
- small forward/lateral state perturbations;
- slight timing perturbations;
- left/right symmetry;
- a modest push;
- long uninterrupted walking.
Track whether forward/lateral errors decay, remain bounded, or grow.
9. Visual quality remains a G2b criterion.
Once stable, restore/develop the human gait qualities rather than accepting a stable robot:
- continuous weight transfer;
- reasonable double support;
- heel-biased contact;
- load acceptance;
- heel rise;
- push-off;
- swing clearance;
- knee flexion;
- reasonable step width/length;
- pelvis/trunk motion;
- natural arm counter-swing.
Stability comes first, but a stable march does not complete G2b.
10. Scope
You may now implement and iterate on the new G2b walker.
Stay on G2b only.
Do not start G2c–G2e, G3, running, football locomotion or the Reference Tackle.
Do not change the 14-body architecture or add a toe joint unless new evidence establishes it as necessary.
Preserve all previous promoted gates bit-identically.
Keep new work opt-in until promotion.
Local checkpoint commits are fine. Do not push.
You have permission to iterate substantially rather than stopping after the first failed Controller-A attempt. Use the characterization data to diagnose failures instead of reverting to parameter fishing.
Stop when either:
A. G2b produces sustained, physically legitimate and visually credible forward walking across the tested region, or
B. you uncover a new architectural/physical limitation that cannot safely be resolved within the approved controller design.
Then give me an interactive visual comparison of:
- old failed G2b;
- Controller A;
- Controller B;
- nominal long walk;
- worst successful walk;
- representative perturbation;
- stability/error plots;
- angular-momentum/yaw comparison;
- foot placement/timing;
- actuator saturation;
- physical propulsion/external-force ledger.
Do not promote G2b until I visually review it.
