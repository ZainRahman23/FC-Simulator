<!-- preserved verbatim from Claude session d4761610-c35f-4019-9308-cb83973e7b76, transcript line 7227. -->

Proceed with the recommended controller-redesign path.
I agree with your diagnosis that G2b has now exposed a controller problem rather than evidence that the current body architecture is incapable of walking.
The touchdown work is successful and should be preserved. In particular, preserve the physically justified swing retraction / landing improvements that reduced touchdown forward velocity, vertical velocity, impact/braking force, yaw impulse and landing error.
Do not continue parameter-tuning the current stepping controller.
Do not start G2c–G2e.
Do not change body architecture, torque limits, add toe joints, add hidden yaw control, or weaken physical constraints merely to make walking pass.
Next task: characterize the physical plant, then redesign stepping
Before designing another walking controller, measure how this actual 14-body Jolt character responds to controlled single-step perturbations.
I want the controller to be designed from the body's measured step-to-step dynamics rather than from assumptions about where the next foot should go.
1. Build a step-response characterization harness
Start from reproducible physical states and execute isolated left/right steps while systematically varying appropriate inputs/state.
Measure relationships among at least:
- COM position relative to support foot;
- COM velocity;
- pelvis position/velocity;
- whole-body linear momentum;
- whole-body angular momentum;
- heading/yaw and yaw rate;
- stance/swing side;
- current support/contact state;
- current step width/length;
- candidate foot-placement offset;
- step timing;
- swing duration;
- touchdown state;
- resulting COM/momentum state after touchdown and after load transfer.
Include forward and lateral dimensions rather than treating them as independent if the evidence shows coupling.
2. Perturb one thing systematically
Around a nominal step, sweep small physically reasonable changes in:
- forward foothold;
- lateral foothold;
- touchdown timing;
- swing duration where meaningful;
- initial forward COM velocity;
- initial lateral COM velocity;
- small yaw/angular-momentum states.
Determine empirically:
If the body is in state X and I alter the next foothold/timing by Δ, what state does the body actually reach one step later?

I want plots/tables that make the step-to-step response understandable.
3. Explicitly characterize stability
The current controller produces growing oscillations:
- forward speed/placement oscillation;
- lateral step-width oscillation;
- single-support yaw.
Determine whether the measured physical plant itself has a usable stabilizing region.
Identify where small foothold corrections:
- reduce error;
- leave it unchanged;
- overshoot;
- reverse it;
- amplify it.
Do the same for timing where relevant.
4. Investigate the single-support yaw separately
Landing yaw is now approximately solved, so don't conflate it with the remaining problem.
Measure angular momentum by body segment through the complete step:
- swing leg;
- stance leg;
- pelvis;
- trunk;
- each arm.
Verify the statement that the swing leg carries roughly 5× the twisting momentum the arms can counteract.
Determine how real walking normally balances this angular momentum.
Investigate whether the missing mechanism is primarily:
- pelvis/trunk counter-rotation;
- stance-leg/ground reaction;
- arm amplitude/timing;
- swing-leg trajectory;
- foot-placement geometry;
- gait timing;
- or some combination.
Do targeted biomechanics research if useful.
Do not simply command the pelvis to face forward.
Intentional turning must remain possible.
5. Compare controller families before implementing the replacement
Using the measured plant, evaluate at least:
A. a measured-response foot-placement/timing controller derived from this body's actual dynamics
and
B. a simpler SIMBICON-style state-feedback walker
as a reference/baseline.
Research the original SIMBICON approach from primary sources if necessary.
I am not asking you to blindly implement SIMBICON.
Explain what each approach would control, what state it would use, how it would interact with our existing planner/support/actuator architecture, and what assumptions each makes.
If another well-supported controller family is clearly more appropriate after the measurements, include it—but avoid turning this into an open-ended robotics survey.
6. Preserve our architecture
Whatever controller we eventually choose:
- Jolt remains the physical state;
- actual contact remains truth;
- finite motors remain finite;
- no root force;
- no root velocity writes;
- no pose teleportation;
- no hidden pelvis support;
- no outcome scripting;
- reference animation remains preference/style information;
- actuator arbitration remains authoritative.
The stepping controller should decide where/when to request a reachable foot placement, not move the character directly.
7. Human motion still matters
Do not optimize only for mathematical stability.
Record the region of stable solutions that also remains compatible with human walking:
- reasonable step width;
- reasonable step length;
- cadence;
- swing clearance;
- heel-strike/retraction behavior;
- pelvis motion;
- knee behavior;
- plausible joint torques.
A controller that stabilizes by taking absurd robotic steps is not the solution.
8. Preserve the corrected evidence
Keep the corrected fall-aware step counts.
Never count steps occurring after the body has already entered a fall as successful walking.
Preserve the two bugs you found today and their fixes/reversions in the history:
- retract naming collision;
- accidentally enabled clearance change.
Do not allow either to contaminate the new characterization.
9. Regression / reproducibility
Preserve A, B, C1–C3, D, G1 and G2a bit-identically.
Keep all new characterization opt-in.
Use deterministic sweeps.
Do not push.
Local checkpoints are fine.
STOP BEFORE BUILDING THE NEW WALKER
This next phase is measurement + controller design, not another long implementation attempt.
Once you have:
1. characterized the body's step-to-step response;
2. identified the sources of forward/lateral instability;
3. characterized the remaining angular-momentum/yaw problem;
4. compared the measured-response approach with SIMBICON or another justified baseline;
5. proposed the new controller architecture and concrete G2b pass tests;
STOP for my review before implementing the replacement controller.
Give me a visual/interactive harness for the important response experiments and explain the findings in plain English as well as technically.
