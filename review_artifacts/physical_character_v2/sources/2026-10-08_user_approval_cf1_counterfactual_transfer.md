# User approval 2026-10-08 — CF-1 counterfactual between-steps transfer (verbatim)

Received in the Claude Code session of 8 Oct 2026, after the locomotion viability probe (`diagnostics/loco_probe_2026-10-08/`). Reproduced verbatim below.

---

Approve CF-1 as a diagnostic-only continuation of the locomotion viability probe.
The purpose is specifically to answer the unanswered architectural question: once the identified missing between-step gait-transfer layer is supplied, can the existing V2 physical character and existing step primitives genuinely chain repeated steps?
Implement only the minimum counterfactual mechanism you described:
- a two-dimensional capture-point/balance-reference path onto the new stance foot;
- support staggered forward and wide/lateral stances;
- derive it from the existing reference layer and existing physical state;
- coordinate the load schedule with that transfer;
- permit planned single support during the moving transfer where required.
Do not redesign the single-step controller, touchdown, body, contact model, actuators, capacities, swing servo or physics.
Do not tune the mechanism against individual bodies or outcomes. Derive its target from the actual new stance/support geometry and existing capture/balance quantities.
This remains counterfactual diagnostic infrastructure only. It is not adopted V2 functionality, does not qualify walking, does not alter E2/TD2C verdicts, and must remain isolated from production/default behaviour.
Keep the experiment small. Re-run the representative locomotion probes at 240 Hz only. Start with the same four bodies and deterministic conditions.
First test whether step 2 now physically occurs.
If it does, continue immediately to:
- 4 steps;
- 6 steps;
- 10 steps;
- 20 steps where earlier sequences survive.
Do not require thousands of runs and do not broaden the matrix unless a result is genuinely ambiguous.
If all/most cases fail at the same new mechanism before step 3, stop and diagnose it rather than accumulating redundant runs.
If characters reach 20 steps, stop there; that is sufficient evidence for this probe.
Crucially, do not reset between steps. Each next step must inherit the actual complete physical state produced by the previous one.
Record accumulated errors across steps, especially:
- COM/DCM and capture-point behaviour;
- pelvis drift/orientation;
- alternating support;
- trailing-foot unloading and physical liftoff;
- load distribution;
- foothold error;
- clearance;
- touchdown velocity;
- stance-foot slip;
- joint-limit margin;
- actuator saturation;
- torque continuity;
- energy;
- whether errors grow, converge or remain bounded.
Classify every first failure using the same A/B/C scheme from the original viability probe.
I especially want you to distinguish:
1. The counterfactual transfer itself is inadequate.
2. The transfer succeeds and exposes another expected missing gait mechanism.
3. The transfer succeeds but repeated use of the existing V2 physical/control architecture becomes intrinsically unstable.
4. Repeated stepping remains physically bounded and viable.
At the end report the same table:
Body | Step 1 | Step 2 | 4 | 6 | 10 | 20 | first failure
plus median/max consecutive steps and an updated GREEN / YELLOW / RED architectural verdict.
Also answer explicitly:
“If we implemented a proper version of this missing gait-transfer layer, does the evidence now suggest V2 could support sustained walking?”
Do not adopt CF-1, modify qualification criteria, resume TD2C/E2, or begin a real walking implementation afterward. Stop for my review.
