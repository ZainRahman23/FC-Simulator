# User instruction (2026-10-08, ~03:44 BST): overnight runway — DVG2, TD2C, E2

Pasted by the user; reproduced exactly as received, below the rule.

---

Overnight runway — resume physical-character V2 from the current published state and proceed autonomously as far as the evidence legitimately permits.
I will be away for several hours. The objective is maximum legitimate progress toward a qualified first physical E2 step, not a forced pass.
1. Resolve the current DVG qualification
CQ-3a / mirror fold: treat the current mismatch as a test-tool tolerance defect only if the evidence continues to show that the underlying mirrored IK behaviour is equivalent. Define the at-bound tolerance from the solver's existing numerical tolerances, not from the observed sample. Correct the classifier, preserve the historical failure, and rerun the deterministic mirror probes. If physical left/right behaviour actually differs, stop and investigate instead.
Preserve the current DVG qualification as FAIL. Do not reinterpret CQ-1b retrospectively.
Create and preregister a versioned DVG2 qualification distinguishing:
A. Certified/executable trajectories: existing saturation/non-worsening requirements remain fully gating.
B. Trajectories already independently classified NO_CERTIFIED/unreachable before controller execution: require bounded, physically safe failure rather than preservation of the failed controller's actuator-utilisation statistics.
For class B require, before seeing results:
- finite/bounded commands;
- no applied actuator torque beyond physical capacity;
- no unexplained/generated energy;
- bounded torque/rate transitions into and out of the guard;
- no new physically unsafe outcome caused by the guard;
- deterministic and left/right-equivalent handling;
- preservation of NO_CERTIFIED/unreachable classification;
- saturation magnitude and duration reported diagnostically;
- normal/certified paths unchanged.
Do not raise the old 5% saturation threshold based on the observed 5.17%. Do not tune the fade merely to make CQ-1b pass. Derive any guard-specific sustained-saturation safety bound from existing actuator/control semantics before running.
Freeze DVG2 before running it.
2. If DVG2 passes
Adopt the combined D1 + rate-feed-forward validity guard and proceed automatically.
Apply the already-agreed TD2C amendments:
- certified early terrain inside the physically derived possible-contact window receives the full touchdown contract;
- terrain below that window but inside the late-search envelope receives bounded TD2 search/escalation handling;
- terrain above the certified early-contact window is an explicit unexpected-obstacle/out-of-envelope event, not ordinary touchdown;
- unexpected obstacles require bounded finite controller behaviour, no unexplained energy creation, no fabricated support, physically authoritative collision and explicit classification, but are not required to guarantee recovery or satisfy the ordinary ≤25% BW touchdown contract;
- preserve successful nominal/early-in-window/late-in-window/late-search/no-ground TD2 behaviour;
- preserve the 30 mm apex, AB/AB2, execution-feasibility certifier and existing touchdown engineering contracts.
Freeze TD2C before running its full battery.
3. If TD2C passes
Continue autonomously through:
E2 integration → swing/servo/SV-2 requalification required for PG-1 → PG-1 → all remaining already-frozen prerequisites → official E2 exactly as preregistered.
Do not stop merely to ask permission between already-defined gates when the preceding gate passes cleanly.
4. If official E2 passes
Preserve all evidence and then run a diagnostic-only repeated-step chaining experiment to answer one question:
Can the qualified E2 primitive alternate left/right repeatedly without changing its architecture, controller, planner, criteria or parameters?
Do not design, preregister or adopt E3/continuous walking/running.
Record the number of consecutive successful alternating physical steps before the first substantive failure and diagnose that first failure. Then stop.
5. Overnight failure/autonomy rules
If a gate fails, diagnose it causally. You may run counterfactuals, diagnostic experiments, inspect established implementations/source code and consult primary literature where useful.
You may correct an unambiguous implementation/tooling bug when its intended behaviour was specified before the result. Preserve the original result, document the correction and rerun affected frozen tests.
Do not autonomously:
- weaken or reinterpret a frozen criterion after seeing its result;
- tune constants to failed cases;
- increase actuator capability to obtain a pass;
- hide/overwrite/relabel historical failures;
- invent a new physical/control mechanism merely to obtain a pass;
- redefine E2;
- begin E3, continuous walking or running development;
- rewrite published Git history.
If a failure requires genuinely new physical/control architecture, changed criteria, changed actuator capability, outcome-dependent tuning, or a choice between materially different defensible designs, research and diagnose the alternatives if useful but stop at that decision for me.
Long frozen/preregistered batteries may run to completion. Continue automatically afterward according to these rules.
Preserve default/off-path identity, determinism, historical preregistrations/results and simulation-authoritative architecture throughout.
Commit coherent milestones locally. Because today's repository publication/archive housekeeping has already been completed, do not repeat it during this overnight run and do not push these new development commits tonight. The permanent daily rule will publish/archive this work at the beginning of the next development day.
Morning report
Before stopping, give me one consolidated report containing:
- exactly how far you got;
- every gate attempted and exact pass/fail;
- DVG2 result and adoption status;
- TD2C result;
- E2 integration, servo qualification, PG-1 and prerequisite results;
- whether official E2 actually ran and its exact result;
- if E2 passed, how many consecutive diagnostic alternating steps were achieved;
- the first chaining failure if one occurred;
- substantive causal diagnoses;
- criterion/preregistration amendments;
- tooling/process errors;
- current adopted configuration and commits;
- smallest remaining blocker;
- recommended next action.
Priority: legitimate, auditable progress. Do not force E2 green.
