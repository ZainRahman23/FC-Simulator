# User approval 2026-10-08 — CF-3 walking frame and cadence sweep, final locomotion diagnostic phase (verbatim)

Received in the Claude Code session of 8 Oct 2026, after CF-2 (`diagnostics/loco_cf2_2026-10-08/`). Reproduced verbatim below.

---

The CF-2 result is sufficient evidence to continue the locomotion viability investigation. Approve one final diagnostic phase aimed specifically at crossing from quasi-static repeated stepping into momentum-carrying walking. Do not resume TD2C/E2 yet.
Preserve CF-1 and CF-2 exactly as recorded. Nothing from these counterfactuals becomes adopted V2 functionality.
Stage 1 — remove the known artificial 9-step ceiling
Add the minimum diagnostic gait-level heading/stance-width layer required to prevent the systematic inward foothold drift.
The current failure is understood: “forward” is derived from the stance foot's ~7.1° toe-out, causing approximately 12.6–12.9 mm of inward narrowing per step.
Define walking direction independently of individual stance-foot orientation and maintain a body-appropriate nominal stance width relative to that walking frame.
Derive stance width from existing body/foot geometry or initial stance; do not tune a width independently for each body to obtain successful outcomes.
Do not change the physical controller, contact model, actuator capacities, joint limits, touchdown behaviour, swing servo or qualification criteria.
First rerun the same four bodies at the existing quasi-static cadence.
If they now reach 20 genuine physical steps and metrics remain bounded, stop that stage. We do not need hundreds of steps.
If they fail for a new reason, classify and report it before proceeding.
Stage 2 — cadence sweep
Only if Stage 1 demonstrates stable 20-step chaining, progressively shorten the between-step transfer/settling schedule so that the next step begins with increasing residual COM/DCM momentum.
Do not jump immediately from ~10 s/step to running.
Use a small deterministic cadence ladder derived from the current timing, for example approximately:
- current quasi-static baseline;
- 5 s/step;
- 3 s/step;
- 2 s/step;
- 1.5 s/step;
- 1.0 s/step;
These are diagnostic levels, not target human walking cadences. If existing lifecycle constraints make a proposed level impossible, report that and use the nearest principled timing instead of forcing it.
At each cadence, use V2-REF first and attempt no more than 10–20 alternating physical steps.
Stop descending the cadence when the first substantive repeated-use failure appears.
Once that boundary is found, test only the immediately preceding successful cadence and the failing cadence on the light/short, heavy/tall and long-legs representatives.
Keep the total experiment small.
The question has changed
We have already shown that V2 can compose physical steps when it is allowed to settle.
We now want to know:
What happens when the next step begins before the errors and momentum from the previous step have disappeared?
This is the important architectural stress test.
Measure per step:
- COM velocity;
- DCM/capture point;
- capture-point error;
- support state;
- stance width and stride;
- pelvis position/yaw/pitch/roll;
- foothold error;
- clearance;
- touchdown velocity;
- stance-foot slip;
- load-transfer timing;
- joint-limit margins;
- actuator saturation;
- torque continuity;
- positive/unexplained energy.
For each metric distinguish bounded periodic behaviour from monotonic/compounding error.
Interpretation
Do not classify failure merely by whether a future walking feature is absent.
Once momentum is actually being inherited between steps, specifically look for evidence of:
A — another clearly missing gait-level planner/supervisor function;
B — an existing controller that needs reasonable walking-specific extension;
C — underlying repeated-use instability in V2: accumulating state error, uncontrollable saturation, energy growth, contact instability, unavoidable loss of balance, or a physical/controller limitation that remains after the expected gait-level functionality is supplied.
Category C is the evidence that should materially increase consideration of V3.
Stop rules
Do not fix failures discovered during the cadence sweep.
Once you find the first cadence at which repeated physical stepping substantively fails, diagnose it and stop.
Conversely, if V2 remains bounded through approximately 1 s/step across representative bodies, stop there as well. Do not proceed into running. That would already answer the architectural question very strongly.
Give me:
cadence | REF steps | light steps | heavy steps | long-legs steps | first failure | A/B/C
plus the per-step trends around the successful/failing boundary.
Then update the GREEN/YELLOW/RED verdict specifically for:
“Is V2 a credible architecture on which to build actual continuous walking?”
Do not adopt the counterfactual gait layers, resume E2/TD2C qualification, build production walking, or begin running afterward. Stop for my review.
