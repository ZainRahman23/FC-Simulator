# User decision, 2026-10-07: overnight runway — do not adopt 1A, reject 1B, proceed from the qualified AB baseline through the touchdown-coordinator programme (verbatim; received as pasted content, the user's whole message)

Note: the message refers to "the decisions in my previous message" and "the terminal-approach/contact-search design study described above"; no such separate message is present in this session. The decisions it names are restated in the message itself (do not adopt 1A, reject 1B, proceed from AB). The design study is taken to be the touchdown-timing / contact-search architecture of sources/2026-10-06_user_decision_1A1B_touchdown_timing.md (Decisions 2–7) and FB1A_TR1B_RESULTS.md §5 (recommended 2(a)).

Overnight runway.
Use the decisions in my previous message: do not adopt 1A, reject 1B, and proceed from the qualified AB baseline.
I will be away for several hours. You have permission to work autonomously through the touchdown-coordinator programme as far as the evidence legitimately allows.
Primary objective: get Touchline as close as possible to a legitimately qualified first physical commanded step, without tuning to outcomes, weakening criteria, or bypassing failed gates.
Proceed in this order:
1. Finish the terminal-approach/contact-search design study described above.
2. Compare a finite set of candidate trajectory structures offline and reject infeasible ones before physical testing.
3. Select the simplest evidence-supported design.
4. Write and commit its preregistration before implementation.
5. Implement it behind default-off/versioned configuration.
6. Run its full independent validation across bodies, legs, rates, representative/corridor/harder qualified cases and early/nominal/late contact conditions.
7. Diagnose any failures causally.
If the coordinator passes cleanly: continue automatically into the prerequisite qualification sequence:
- re-run the relevant swing/servo qualification;
- re-run PG-1;
- run any other already-defined prerequisite gates whose criteria were frozen before seeing their results.
If every prerequisite gate passes: you may run the already-preregistered official E2 first-step experiment exactly as frozen.
If E2 passes, preserve the complete evidence and stop before designing/chaining repeated walking. Do not begin E3/continuous gait without my review.
If a test fails: you may continue diagnostic-only work to identify the causal mechanism, including counterfactuals and literature/source-code investigation. You may fix an unambiguous implementation bug if the intended behaviour was already specified before the result, then rerun affected tests with the correction fully documented.
Do not autonomously:
- loosen or reinterpret a criterion after seeing its result;
- tune a constant to a failing case;
- increase actuator capacity to obtain a pass;
- redefine E2;
- adopt a new physical/control mechanism whose design was not already justified;
- hide, overwrite or relabel a failed run;
- push anything;
- start E3, continuous walking or running.
If a substantive architecture/physics decision is required and existing Touchline evidence plus established donor implementations do not clearly select one option, research it rather than guess. Prioritize existing humanoid implementations and primary literature. Record exact sources and distinguish borrowed architecture from Touchline-derived parameters.
If external research still leaves multiple materially different defensible choices, stop at that decision point for me.
Keep the default/off path bit-identical and preserve all historical failed evidence.
Keep T-1 frozen.
Keep AB/AB2 as the qualified swing baseline.
Keep the execution-feasibility certifier.
Keep the apex height at 30 mm unless new evidence demonstrates a genuine architectural reason it must change; do not change it to obtain a pass.
Do not redesign recovery issue C unless an official E2 recovery obligation explicitly requires it.
Commit coherent milestones locally. Nothing pushed.
Before stopping for me, produce one consolidated morning report containing:
- exactly how far you got;
- every configuration/preregistration/commit used;
- pass/fail for every gate attempted;
- coordinator architecture actually implemented;
- touchdown/contact/load-transfer measurements;
- all remaining failures and their causal diagnosis;
- whether PG-1 passed;
- whether official E2 was reached;
- if E2 ran, its exact result;
- any tooling/process errors;
- the smallest remaining blocker;
- your recommended next action.
Do not stop merely because a long preregistered battery takes time. Let it finish and continue according to the rules above.
The goal overnight is maximum legitimate progress, not a forced E2 pass.