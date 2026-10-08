# User approval 2026-10-08 — CF-2 trailing-leg swing counterfactual, forward only (verbatim)

Received in the Claude Code session of 8 Oct 2026, after CF-1 (`diagnostics/loco_cf1_2026-10-08/`). Reproduced verbatim below.

---

Approve CF-2 as a diagnostic-only continuation of the V2 locomotion viability probe, but narrow it to forward alternating stepping only.
CF-1 answered its intended question: the missing 2-D gait-transfer layer can move the capture point onto the new forward stance foot and unload the trailing foot successfully. Preserve CF-1 unchanged.
The next question is now narrowly:
If we minimally supply the missing trailing-leg swing behaviour that the existing single-step planner lacks, can V2 physically execute step 2 and begin chaining forward steps?
Do not investigate or fix the lateral/wide-stance 1.2–1.6% BW issue yet. Record it as a future gait-layer requirement. Forward alternating locomotion is the shortest path to answering the V2-vs-V3 architectural question.
Implement CF-2 only in the diagnostic harness, layered on CF-1, off by default and never counted as qualified V2 capability.
CF-2 scope
Supply the minimum principled trailing-leg swing capability, not a new walking controller.
First determine from the existing body geometry, hard joint limits and actual swing state why the single-step planner's flat-sole/soft-bound assumption rejects the trailing leg.
Then use the smallest general mechanism appropriate for gait:
- permit the swing foot to pitch/toe-off naturally within the body's existing hard joint limits and actuator capacities; and/or
- make the swing-path feasibility check account for the predicted pelvis motion during the swing rather than assuming the pelvis is frozen.
Prefer whichever mechanism follows from the existing model and requires the fewest new assumptions. If both are independently necessary, establish that diagnostically before combining them.
Do not simply relax the ankle soft bound numerically until the run passes. Do not increase hard joint limits, actuator strength, clearance thresholds or controller capacities.
No body-specific tuning.
Cheap staged test
Use the same four representative bodies, 240 Hz, deterministic nominal forward stepping.
Start with one side per body and ask only whether a genuine second step occurs.
If all four fail before physical step 2 for the same reason, stop and diagnose.
If step 2 succeeds, immediately test the mirrored side.
If that succeeds sufficiently, continue without resetting physical state:
2 → 4 → 6 → 10 → 20 alternating forward steps.
Stop each run at its first substantive failure.
Do not create a large matrix.
Critical requirement
A step counts only when the complete physical lifecycle occurs:
old support → unloading → physical liftoff → swing → clearance → physical touchdown → load acceptance → new support.
Planner acceptance alone is not a step.
Each subsequent step must inherit the complete physical state of the previous one. No resetting pelvis, COM, velocities, joint state, foot pose, support state or accumulated errors.
Measure accumulation
Now that we're trying to cross step 2, pay particular attention to whether errors accumulate:
- COM/DCM/capture-point error;
- pelvis translation/orientation;
- stride length;
- support/load distribution;
- foothold error;
- foot pitch/toe-off;
- clearance;
- touchdown speed;
- stance-foot slip;
- joint-limit/soft-limit margins;
- actuator saturation;
- torque continuity;
- positive/unexplained energy.
For any sequence reaching 4+ steps, show these per step, so we can distinguish bounded periodic behaviour from accumulating instability.
Stop philosophy
Continue peeling missing gait-layer assumptions only while they are clearly Category A: functionality absent because existing components were designed for isolated stepping.
Do not automatically create CF-3, CF-4, etc.
If CF-2 exposes another blocker, stop and tell me whether it is:
A — another clearly missing gait-level mechanism;
B — a deficiency in an existing V2 mechanism;
C — evidence of intrinsic instability/structural limitation in V2.
In particular, once the character has genuinely executed multiple alternating physical steps, failures caused by growing state error, saturation, energy, contact instability or loss of balance should not automatically be explained away as “missing walking functionality.” Analyze whether they are evidence against V2.
Result
Report:
Body | physical step 1 | step 2 | step 4 | step 6 | step 10 | step 20 | first failure
plus median/max consecutive physical steps.
Then give an updated GREEN/YELLOW/RED verdict.
Most importantly answer:
Have we now reached enough of continuous gait to actually test V2's underlying repeated-use stability, or are we still blocked by isolated-step assumptions before that test begins?
Do not adopt CF-1 or CF-2, modify E2/TD2C, resume qualification, or implement production walking afterward. Stop for my review.
