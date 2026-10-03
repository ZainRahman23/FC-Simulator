# User instruction, 2026-10-03 — continue Investigation B autonomously (~2 hours away)

Verbatim (received mid-investigation, while the stiffness / k = 0 sweeps were running):

---

I'm away for approximately two hours. You have permission to continue the current Investigation B autonomously during that time.
Use the available runway aggressively for diagnosis, reproduction, falsification and evidence gathering. Do not stop merely because the currently running sweeps finish.
Your objective while I am away is to get as close as possible to a definitive causal explanation of the GJK/EPA / reversed-manifold / energy-blow-up problem.
Continue:
- all currently running stiffness sweeps;
- the extended accepted-k=0 state-space/perturbation scan;
- deterministic minimal-reproducer work;
- per-tick energy/impulse/constraint ledgers;
- source-level Jolt tracing;
- timestep and solver-iteration studies;
- controlled ablations;
- contact/manifold classification;
- reduction from full body toward the smallest reproducer, provided the same causal mechanism remains;
- tests designed specifically to falsify the current GJK→EPA/reversed-manifold hypothesis;
- determining whether the passive ankle spring creates the defect or merely changes the trajectory into an already-pathological contact state;
- determining whether the accepted k=0 plant can reach the same pathology under physically reachable or very small identity-preserving perturbations.
If you identify a candidate cause, do not stop at correlation. Attempt to reproduce it from a saved pre-event state and demonstrate the causal chain by controlled intervention.
If possible, determine precisely:
1. what geometric/configuration condition causes GJK/EPA to enter the bad state;
2. why EPA chooses the opposite-facing triangle/reversed axis;
3. why the turf bottom face becomes involved;
4. whether the manifold is objectively invalid according to Jolt's own conventions or whether our interpretation/configuration is wrong;
5. how that bad contact state leads to passive-tissue overextension;
6. where the very large energy is first created;
7. why stiffness changes the probability/state trajectory into the event;
8. whether compound boot decomposition contributes;
9. whether the turf representation contributes;
10. whether this is our integration/configuration defect, a Jolt limitation/bug, or unresolved.
You may build diagnostic-only experimental patches to test hypotheses. Keep them clearly opt-in and do not adopt them into the accepted plant.
For any candidate fix, test it counterfactually against:
- the minimal reproducer;
- all known blow-up cases;
- ordinary valid foot/turf contact;
- the accepted k=0 plant;
- multiple body variants;
- relevant rates/iteration counts.
Measure whether it eliminates the cause, rather than merely preventing the particular trajectory that exposed it.
You may inspect and instrument the pinned/vendored Jolt source as deeply as necessary. Diagnostic instrumentation is encouraged.
Do not make any production/architectural decision on my behalf.
Specifically, while I am away you may NOT:
- adopt a nonzero ankle stiffness;
- change approved anatomy;
- change approved joint limits;
- change actuator capability;
- permanently change passive tissue;
- permanently change boot geometry/contact architecture;
- permanently change turf/contact architecture;
- change the production timestep or solver policy;
- loosen any existing gate to make a result pass;
- declare G1/G2/G3 re-approved after a material plant change;
- start G4;
- implement stepping;
- push anything.
If you discover an obvious bug in our own diagnostic/instrumentation code, fix it and record the correction.
If you discover an obvious bug in production V2 code, you may prepare and test an opt-in diagnostic correction, but do not adopt it as the new baseline without my review.
If the evidence shows that accepted k=0 can reach the same pathological state, treat that as a potentially serious reopening of G1. Investigate it thoroughly, but do not silently repair or redefine G1.
If the evidence instead shows that accepted k=0 is robust and the pathology requires a state introduced by nonzero ankle stiffness, establish that as rigorously as possible.
Keep the permanent passivity/energy-invariant idea alive. If you can derive a defensible numerical floor from existing healthy runs, build the diagnostic and test its false-positive rate. Do not weaken it to accommodate pathological runs.
Use the remaining time productively even if you reach a likely explanation early: attempt independent reproduction, counterexamples, alternative hypotheses, and robustness checks.
At the end, commit diagnostic/research work locally only, preserve raw evidence, update the investigation report/decision record, and stop with a concise decision package for me.
I want to come back to:
- strongest causal explanation;
- confidence level and remaining uncertainty;
- smallest reproducer;
- exact first-invalid tick/state;
- energy provenance;
- k=0 vulnerability result;
- Jolt source-level explanation;
- ablation results;
- rate/iteration results;
- candidate fixes ranked by what they actually correct, without adopting one;
- regression implications of each candidate;
- recommended next decision.
Do not wait for me unless continuing would require one of the prohibited architectural/production decisions above. If blocked on such a decision, continue other diagnostic work rather than making the decision yourself.
