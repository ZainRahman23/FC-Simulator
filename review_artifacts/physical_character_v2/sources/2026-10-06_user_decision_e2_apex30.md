# User decision, 2026-10-06: E2 apex 30 mm (A1), PG-1 first, touchdown and servo-validation analysis (verbatim)

Approve A1: revise the nominal E2 swing apex from 25 mm to 30 mm.
Record this as a versioned E2 trajectory/preregistration amendment before any official E2 run.
The justification is geometric robustness under the now-corrected and independently measured swing servo: the frozen 25 mm BLF trajectory provides only ~5.4 mm reference clearance at φ=0.8 against a 5 mm physical-clearance requirement, leaving essentially no physically meaningful tracking margin. Do not select 30 mm merely because a failed run passes; document the measured tracking uncertainty and resulting clearance budget.
Preserve:
- 0.6 s swing duration;
- 50% apex timing;
- measured-liftoff swing semantics;
- all existing physical clearance thresholds;
- the corrected singularity-robust commanded-target rate estimator;
- D1 acceleration feed-forward;
- finite-torque/Jolt authority.
Re-run PG-1 first only with the amended 30 mm trajectory.
If PG-1 does not certify robustly across all 32 commanded-step cases, stop and report. Do not continue increasing apex height.
If PG-1 passes, do not immediately launch the complete official E2 battery. First run a bounded commanded-step diagnostic matrix to determine the remaining touchdown-impact issue under the 30 mm trajectory.
Specifically characterize touchdown using both:
- instantaneous peak force/load;
- fixed physical-time impulse (including the existing 50 ms measure);
across 180/240/480 Hz.
The current evidence that instantaneous peak scales strongly with solver timestep while the 50 ms impulse remains approximately constant suggests the existing peak-only touchdown criterion may be timestep-sensitive. Do not weaken or replace E2-5 yet. Determine what physical quantity the criterion is intended to constrain and recommend a rate-robust formulation from the evidence.
Also treat the old swing-servo validation battery separately from E2 qualification. Its representative trajectories were acknowledged to rise ~1.8× higher than the actual E2 swing and contain reach/integrity assumptions that fail even with D1 off. Do not retroactively declare D1 validated merely because E2 tracking is excellent.
Propose a versioned servo-validation battery representative of the actual intended operating envelope, with deliberately harder but physically reachable cases. Preserve the old failed battery and results as historical evidence.
Do not change E2 tracking thresholds as part of this.
Keep the passive-ankle damping compensation diagnostic-only; its small clearance benefit does not justify the worse touchdown impact.
Leave recovery issue C untouched for now.
After PG-1 and the bounded touchdown/servo-validation analysis, stop and report before changing E2-5, adopting a new servo-validation criterion, changing touchdown behavior, or beginning the official E2 run.
Keep everything local. Do not push.
