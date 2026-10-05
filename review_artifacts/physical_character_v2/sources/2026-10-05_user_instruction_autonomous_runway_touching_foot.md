# User instruction (verbatim), 2026-10-05: long autonomous runway — correct the unloaded → released/touching → lift transition; E1a only if legitimately qualified; no E1b

Pasted by the user; reproduced exactly as received, below the rule.

---

I’m going to be away for several hours. Use this as a long autonomous research/engineering runway. Do not stop at the first diagnostic result unless continuing would require a genuinely consequential design decision from me.
Current objective: get V2 to the point where E1a can legitimately pass and we can proceed toward the first real controlled lift/hover/replace sequence, without gaming the gates or hiding physical/model defects.
Start from the current state and the failed E1a/unloading investigation. The immediate issue is the transition from unloaded support → released but still touching → intentional lift.
We now know:
- B1 appears to correct a genuine generalized-force/controller mapping bug and drastically reduces the residual support load.
- B3 removes the remaining share leak, but its abrupt engagement appears to expose or worsen lifecycle cycling.
- Once released, a still-touching foot can rise roughly 0.4–1.1 mm without a lift command because it lacks an appropriate vertical reference/anchor.
- Do not assume B3, H1, H2 or H3 is correct merely because it improves E1a.
Phase 1 — establish the correct semantics
Determine causally what should govern a foot that:
1. has been intentionally unloaded,
2. has ceased being a support foot,
3. is still physically touching the turf,
4. has not yet received an explicit lift command.
Investigate H1/H2/H3 and any better alternative you discover. In particular, test whether a touching-foot vertical reference can be implemented through the normal finite-strength controller so that it prevents accidental premature lift without pressing the foot into the turf, pinning it to the world, or overriding physical contact.
Physics must remain authoritative over whether contact actually exists. Do not use world-space position writes, hidden support forces, external impulses, teleportation, kinematic foot locking, or contact-state overrides to manufacture success.
Separate the effects of:
- B1;
- B3;
- support release timing;
- touching-foot control;
- pelvis settling;
- posture control;
- contact geometry;
- lifecycle thresholds;
- actual commanded lift.
Measure forces, requested/commanded load share, vertical foot motion, penetration/separation, joint torques, controller work, energy, stance slip, CoP where relevant, release/recontact chatter, symmetry and timing.
Use causal ablations and counterfactuals rather than inference from one successful run.
Phase 2 — search for the smallest principled fix
If the evidence identifies a clear defect or missing lifecycle/control mechanism, design the smallest general correction.
It must make sense for future walking/running, not merely E1a. In particular, think ahead to the fact that during locomotion a foot naturally transitions through loaded → unloading → touching/unloaded → liftoff → airborne → touchdown → load acceptance. We need coherent semantics for those states rather than E1-specific logic.
You may implement candidate corrections behind default-off diagnostic/experimental flags so they can be tested. Do not adopt them merely because they improve the score.
Do not tune thresholds, pelvis drop, stiffness, timing or other continuous values against E1a until you have an independently justified reason for the value.
Phase 3 — preregister and validate
Once you have a preferred mechanism, freeze/preregister its validation before evaluating it as the proposed solution.
Validation should be broader than E1a and should attempt to falsify the mechanism. Include at minimum:
- all 8 body variants;
- left/right symmetry;
- multiple unloading depths/rates;
- small perturbations;
- partial-load requests that must NOT release;
- true zero/near-zero requests that should release;
- contact/recontact cases;
- stance slip;
- energy accounting;
- torque continuity and actuator limits;
- deterministic repeatability;
- browser = Node;
- relevant 180/240/480 Hz checks;
- G0–G3 regression where the candidate could affect them.
Explicitly test the dangerous boundary cases around the touching/airborne transition. A solution that merely moves chatter to another threshold is not acceptable.
Phase 4 — E1a
Only if the candidate passes its independently preregistered validation and the relevant G0–G3 regressions, version the E1a configuration appropriately and rerun E1a exactly according to the frozen E1a criteria. Do not modify E1a criteria in response to its outcome.
If E1a fails, diagnose it causally. If the failure exposes an implementation bug, fix the bug, preregister the appropriate regression, and continue. If it exposes another genuine missing mechanism, investigate it in the same evidence-first manner.
You may continue through multiple such diagnostic/fix/validation cycles while I am away provided each change is a demonstrated correction rather than tuning to the gate.
If E1a eventually passes legitimately, perform repeat/perturbation/body-variant checks sufficient to establish that the result is robust.
Do not start E1b while I am away. Stop after a genuinely qualified E1a pass, or earlier if E1a cannot be made legitimate without a substantive design choice from me.
Autonomy / stop rules
While I am away, you may:
- inspect and instrument the code;
- perform literature/source research where needed;
- run large diagnostic sweeps;
- create temporary harnesses;
- add permanent diagnostic/regression tests where clearly justified;
- fix demonstrated coding/math/test-harness bugs;
- implement candidate mechanisms behind default-off flags;
- preregister experiments before running them;
- rerun affected gates after a justified correction;
- make local checkpoint commits.
Do not:
- push anything;
- rewrite history;
- alter accepted evidence to make a new model pass;
- loosen a criterion because a candidate missed it;
- choose parameters by gate score;
- hide or delete failed runs;
- change unrelated simulation behavior;
- compromise deterministic/auditable behavior;
- start E1b.
Preserve failed experiments and counterexamples. Keep the accepted/default path reproducible throughout the investigation.
If several plausible solutions remain, compare them rather than arbitrarily selecting one. Prefer, in order: physically/biomechanically justified behavior, simulation integrity, generality to future locomotion, robustness across bodies/rates/perturbations, simplicity, and then performance.
If you encounter a question whose answer would fundamentally change the physical model rather than repair an identifiable defect, do not guess. Research it as far as possible, document the alternatives and evidence, and continue other independent work. Stop for my decision only when further useful work is genuinely blocked.
Keep detailed records in the existing review/decision structure. Commit locally at meaningful checkpoints. Nothing pushed.
When you finally stop, give me a consolidated morning report containing:
1. what you discovered;
2. the causal chain for every important failure;
3. every implementation/model change made and why;
4. what was tested before versus after each change;
5. all preregistered criteria and results;
6. G0–G3 regression status;
7. E1a result, if it became legitimate to run;
8. body/rate/perturbation/determinism results;
9. performance impact;
10. remaining technical debt;
11. anything you discovered that could matter for E1b/E2/walking later;
12. exact local commits and files;
13. any decisions still required from me;
14. your assessment of whether the architecture is converging toward robust locomotion or exposing a more fundamental problem.
Take the time to investigate deeply. The goal tonight is not to make E1a say PASS. The goal is to make the underlying system correct enough that, if E1a passes, we can trust the result.
