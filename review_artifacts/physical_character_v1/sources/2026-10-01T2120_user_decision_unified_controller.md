<!-- preserved verbatim from Claude session d4761610-c35f-4019-9308-cb83973e7b76, transcript line 12844. -->

I approve the general direction, with one important architectural requirement.
1. Adopt physical ground-reaction/pressure-point regulation as part of the walking speed-control mechanism.
The experiment has established that it can materially regulate forward speed without hidden forces. Preserve the finite-motor/contact-authoritative architecture.
2. Replace Controller A's fixed nominal-step equilibrium target with a target derived from the requested locomotion velocity.
Controller A should no longer implicitly steer toward the equilibrium associated with the historical 0.22 m nominal step (~0.63 m/s on this body).
However, do not create two independent controllers fighting over forward speed.
Build one coherent hierarchy:
desired locomotion velocity
→ stance/ground-reaction regulation
→ remaining predicted velocity/state error
→ next foothold + touchdown timing
→ reachability/viability check
→ physical swing execution
Ground reaction and foot placement must serve the same desired velocity/state target.
3. Develop and validate at 0.45–0.50 m/s first.
I accept this as an initial operating point, not as the final capability of the character.
Do not tune one magic 0.48 m/s gait. Once stable, nearby requested speeds must be tested and the operating envelope expanded progressively.
4. Make reachability a hard planning constraint.
Your most important new finding is that every baseline fall was already an impossible swing when planned.
The planner must therefore estimate, from the actual state at decision time, which combinations of:
- forward foothold;
- lateral foothold;
- touchdown time
are physically reachable.
Relevant state should include at least what the evidence shows matters:
- actual COM/body velocity;
- stance progression/contact state;
- trailing-leg extension;
- swing-leg state;
- available swing time;
- joint/actuator limits;
- actual physical foot/leg geometry.
Do not simply clamp an impossible requested 0.34 m step to 0.30 m and hope.
If the desired regulating action will become unreachable, the controller should respond earlier through the physically available combination of stance regulation, timing and foothold planning.
5. Fix the 50 ms planning-state lag correctly.
You found that mid-swing corrections add ~7.8 cm and the swing lands ~7 cm long because its plan runs ~50 ms behind reality.
Do not merely remove the delay globally if that creates unrealistically instantaneous human reactions.
Distinguish:
- delayed sensing/decision-making;
- prediction of the body's state at execution/touchdown.
A controller can have realistic sensory/planning latency while still predicting where the physical body will be when the command takes effect.
Investigate whether planning from a predicted execution-state/touchdown-state removes the systematic overshoot without giving the character zero-latency reactions.
6. Keep swing execution generic and foot-agnostic.
Preserve the work from the foot gate.
The swing executor should receive a reachable world-space foothold and touchdown time and execute it from the actual physical state. Do not encode F0-specific hacks.
7. Preserve F0 as default and F2h as opt-in.
Do not rerun/promote F2h until F0 has a stable walker under the new architecture.
8. Do not address yaw by hiding it.
Continue measuring yaw/angular momentum. Do not add artificial heading stabilization. Once straight walking is sustained, yaw remains a genuine locomotion problem to solve.
9. Validation progression
First demonstrate sustained walking at approximately 0.45–0.50 m/s across all deterministic starts.
Then test requested speeds around it on both sides.
I want to see whether the controller forms a genuine stable speed envelope rather than one tuned equilibrium.
Measure at minimum:
- requested vs actual forward speed over time;
- step length;
- cadence;
- single/double support timing;
- foothold requested vs achieved;
- predicted reachable region;
- percentage of requested steps outside reachability;
- trailing-leg extension at swing start;
- swing clearance;
- touchdown velocities;
- stance slip;
- ground reaction/pressure point;
- horizontal impulse;
- actuator saturation;
- falls classified by planning/execution/contact/post-touchdown cause;
- yaw/angular momentum.
A successful controller should not merely survive. Speed error should remain bounded and should not show the previous positive-feedback creep.
10. Continue autonomously through this walking-control problem.
You have runway to identify/refit the necessary model, test the unified controller, diagnose failures and make general fixes.
Preserve all approved gates bit-identically. Keep changes opt-in until validated. Local checkpoint commits are fine; do not push.
Do not start G2c–G2e, running/sprinting or Reference Tackle.
Stop for my visual review once you have a genuinely sustained forward walk with bounded speed regulation across multiple deterministic starts, or if the evidence reveals another architectural/body limitation requiring my decision.
