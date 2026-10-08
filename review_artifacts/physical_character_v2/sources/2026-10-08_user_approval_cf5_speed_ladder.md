# User approval 2026-10-08 — CF-5 speed-ladder stress diagnostic, walking boundary (verbatim)

Received in the Claude Code session of 8 Oct 2026, after CF-5 (`diagnostics/loco_cf5_2026-10-08/`). Reproduced verbatim below.

---

Approve one final locomotion stress diagnostic before returning to TD2C/E2: progressively increase the speed of the demonstrated CF-5 continuous walk and determine where V2's current architecture first reaches a genuine limit. Do not attempt running yet.
CF-5 has now established genuine continuous locomotion: all four representative bodies completed 19 consecutive continuous steps, forward COM velocity remained positive through every touchdown, and the physical state converged to a bounded periodic cycle.
The remaining question is:
How far can the same architecture be pushed toward a normal/fast walking regime before something ceases to remain physically bounded?
This is diagnostic-only. Do not adopt CF-5, modify production E2/TD2C, or build a production locomotion system.
Preserve the CF-5 architecture
Start from CF-5 exactly as validated. Do not add new stabilizers or gait mechanisms merely to obtain a faster result.
You may vary only quantities that naturally define walking speed/cadence within the existing CF-5 mechanism, such as:
- cadence/timing;
- step progression/foothold distance within physically feasible limits;
- the resulting capture-point/transfer timing required by those commanded conditions.
Do not increase actuator capacities, friction, joint limits, hidden forces, controller gains, touchdown tolerances or other physical capabilities.
Do not add running-specific behavior or intentionally create a flight phase.
Use a staged speed ladder
Begin with V2-REF at 240 Hz.
Establish the existing CF-5 gait as the baseline, then progressively increase commanded walking speed rather than jumping directly to an arbitrary target.
Use a small adaptive ladder. At each level attempt:
4 steps → 10 steps → 20 steps
Only proceed to the next speed if the current level remains bounded.
Once a meaningful faster level succeeds on REF, test that level on light/short, heavy/tall and long-legs.
Keep the number of runs small. This is a boundary-finding experiment, not a validation battery.
Measure actual speed
For every level report both the commanded and physically realized:
- mean forward progression speed;
- cadence / steps per second;
- stride/step length;
- COM speed through the gait cycle;
- COM speed immediately before and after touchdown;
- minimum forward COM velocity per cycle.
Do not call something "fast walking" merely because its requested cadence is faster. Classification must use the realized physical gait.
Watch the expected limits
Per step record:
- capture-point/DCM error and margin;
- foothold error;
- stance width and heading;
- touchdown speed/impact;
- stance-foot slip;
- load transfer;
- ankle-inversion saturation;
- all other actuator saturation;
- joint-limit margin;
- torque continuity;
- energy residual;
- contact stability;
- toe-out/yaw accumulation.
Explicitly determine whether ankle-inversion saturation continues to depend only on cadence or begins accumulating from step to step.
Most important: distinguish a speed ceiling from structural instability
At the first unsuccessful speed, stop increasing speed and diagnose the first blocker.
Classify it:
A — missing gait functionality/planning. Examples: CF-5's short-step planner, heading regulation, insufficient foothold progression, or a lifecycle designed only for slow walking.
B — correctable existing-controller limitation. Examples: capture-point tracking lag or an actuator/controller mechanism reaching a limit that can reasonably be addressed without replacing V2.
C — structural instability of V2 under dynamic repeated locomotion. Examples: growing balance error, saturation increasing each step toward failure, unexplained energy growth, unavoidable contact instability, or progressive divergence despite reasonable feasible gait commands.
A planner simply refusing an infeasible faster foothold is not C.
Running boundary
Also report whether any successful or failing gait naturally approaches loss of double support/a flight phase.
Do not cross into running.
If the evidence indicates that further speed requires a qualitatively different running gait—flight phase, substantially different support timing, different swing planning, etc.—stop there and identify that as the walking→running architectural boundary.
Final report
Give me a compact table:
Body | realized speed | cadence | step length | 20 steps? | min COM speed | saturation trend | first blocker | A/B/C
Then answer:
1. What is the fastest genuinely continuous walking speed V2 demonstrated without adding another gait mechanism?
2. At what speed does the present CF-5 design first fail or refuse the gait, and why?
3. Do errors remain bounded as walking speed increases, or does anything begin accumulating step-to-step?
4. What is currently the first physical/controller limit on faster locomotion?
5. Does anything discovered materially increase the case for V3?
6. Does the evidence say the next meaningful experiment should be production walking development or a separate running/flight-phase prototype?
Stop after answering those questions. Do not repair the discovered speed limit, create another CF architecture, attempt running, or resume TD2C/E2 until I review it.
