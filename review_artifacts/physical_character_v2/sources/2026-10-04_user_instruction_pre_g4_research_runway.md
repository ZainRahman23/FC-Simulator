# User instruction, 2026-10-04: 2–3 hour pre-G4 research runway (twist mechanism, knee axial limit, ankle law, rate, reachability, G3→G4 interface audit, smallest G4 experiment design) — no adoption, no G4

(verbatim, as pasted by the user)

I will be away for approximately 2–3 hours. Do not start G4 and do not stop early merely because you encounter a decision point. Use this as a long pre-G4 research runway.
The purpose of this session is to reduce uncertainty around the remaining blockers so that when I return I can make the final decisions needed to begin G4.
Do not adopt a new posture twist policy, ankle stiffness, knee model/limit, or foothold-reachability contract without my approval. Diagnostic/opt-in implementations are allowed where necessary to obtain evidence. Preserve all accepted G0–G3 behavior and historical results.
Spend the available time investigating, falsifying, comparing and documenting the following areas, in priority order:
1. Posture-IK twist mechanism — highest priority.
Deeply establish why the current posture controller sustains accumulated leg twist.
Compare current-angle holding against reference-angle/recentering behavior as diagnostic alternatives across all relevant G1/G2/G3 conditions, body variants, perturbations, loaded/unloaded states and transitions.
Determine what the controller is physically commanding, where the energy/torque comes from, whether current-angle holding creates a self-sustaining equilibrium/oscillation, and whether reference-following is actually the correct controller semantics independently of whether it improves gate scores.
Measure hip, knee, ankle and whole-leg twist; actuator torque/work; passive torque/work; ground reaction/yaw moment; CoP; slip; yaw stiffness; oscillation amplitude/frequency; settling/recentring; and morphology dependence.
Try to falsify the reference-following hypothesis. Look for circumstances where reference-following causes unrealistic resistance to legitimate body turning or otherwise overconstrains the player.
Explore whether the correct architecture is actually a state-dependent/reference target rather than simply "current" versus "reference".
2. Knee axial-limit problem.
Determine exactly why nonzero ankle stiffness causes the reported knee twist beyond its narrow limit near full extension.
Separate possible causes:
- incorrect anatomical knee axial ROM;
- missing flexion-dependent knee rotation/coupling;
- passive end-stop behavior;
- torque transfer from ankle stiffness;
- posture-controller allocation;
- numerical/solver behavior;
- interaction among these.
Do not loosen a limit to make tests pass.
Characterize knee axial behavior as a function of knee flexion and loading. If external biomechanics research is available locally from the existing evidence, use it; otherwise clearly identify what evidence would be needed rather than inventing values.
Test diagnostic alternatives if useful, but adopt nothing.
3. Ankle law.
Continue investigating the k=0 / 0.11 / 0.13 / 0.15 results under diagnostic controller alternatives.
Do not select a winner.
Determine whether a constant linear neutral-zone stiffness is even the appropriate model. Investigate whether loaded versus unloaded behavior, knee state, contact state or other physical variables suggest a different formulation.
Separate:
- passive anatomical resistance;
- active posture control;
- ground/contact yaw resistance;
- proximal hip/knee contribution.
Continue attacking any apparently successful configuration with held-out perturbations, body variants and rate tests.
4. 180 Hz / rate behavior.
Continue characterizing the previously observed 180 Hz event sufficiently to determine whether it represents a genuine production concern or merely bounded integration error in pathological passive falls.
Do not hide rate dependence. Quantify convergence where possible.
5. Anatomical reachability.
Stress-test the proposed three-layer distinction:
- geometric reachability;
- anatomical/configuration feasibility;
- dynamic executability.
Expand characterization of the previous ~8% invalid set.
Especially determine how much disappears when pelvis yaw is allowed to participate, whether ±30° normal-ground targets remain robust across all morphologies, and what classes of raised/oriented targets fail.
Test the experimental limit-respecting IK aggressively. A solver failing to find a solution must not automatically be labelled anatomically impossible.
Explore a result taxonomy such as FEASIBLE / PROVEN INFEASIBLE / UNKNOWN-NOT-FOUND, including what evidence would be required for each.
Do not adopt the contract yet.
6. Pre-G4 interface audit.
Without implementing G4, inspect what will happen at the exact transition from G3 into:
weight transfer -> foot unload -> contact loss -> foot lift -> airborne leg
Identify assumptions in the existing controller, actuator, contact, IK and support logic that change discontinuously when the foot actually leaves the turf.
In particular look for:
- controllers that accidentally rely on both feet touching;
- contact-state discontinuities;
- support logic using contact rather than meaningful load;
- unloaded-foot constraints;
- sudden changes in torque allocation;
- IK targets that become under/over-constrained;
- hidden stabilization;
- energy discontinuities;
- stale contact state;
- behavior that could reproduce V1-style transition instability.
You may build diagnostic harnesses around this boundary, but do not actually implement a swing controller or G4.
7. Define the smallest G4 experiment.
Design—but do not implement—the first G4 test.
I currently expect the smallest useful experiment to resemble:
stable stance -> controlled weight transfer -> unload one foot -> lift a very small distance -> hover briefly -> replace the same foot at essentially the same foothold -> accept load -> recover
Determine whether that is indeed the best first experiment and preregister proposed success/failure measurements.
It should test contact loss/reacquisition and true single support before introducing meaningful forward stepping.
Then design the subsequent experiment:
transfer -> lift -> short reachable swing -> touchdown -> load acceptance -> recover
Do not design repeated walking yet.
General rules
Work independently and follow evidence rather than trying to make the existing hypothesis succeed.
Preserve seeded/deterministic testing.
Do not tune thresholds after observing outcomes.
Do not modify accepted G0–G3 criteria merely to accommodate a candidate.
Do not push anything.
Local diagnostic commits are fine when coherent and reversible.
Preserve failed experiments and counterexamples.
Add useful permanent instrumentation/regressions where doing so is simulation-neutral and does not alter accepted behavior.
If one line of investigation reaches a decision point, do not stop the whole session. Record the decision needed and continue with the other independent investigations.
Do not start G4.
When the runway is exhausted, give me a consolidated pre-G4 decision report containing:
1. root cause of the twist oscillation;
2. current-vs-reference posture policy comparison;
3. strongest evidence for and against changing the policy;
4. knee axial-limit root cause;
5. ankle-law findings;
6. rate/180 Hz findings;
7. anatomical-reachability findings;
8. proposed reachability contract;
9. G3->G4 transition hazards;
10. proposed first G4 lift-hover-replace experiment and preregistered criteria;
11. proposed second short-step experiment;
12. performance implications;
13. new regressions/instrumentation;
14. remaining technical debt;
15. exact decisions you need from me;
16. your recommendation on whether we are now ready to authorize G4.
Do not wait for me during the runway unless continuing would require modifying an accepted architecture/value or actually starting G4.
