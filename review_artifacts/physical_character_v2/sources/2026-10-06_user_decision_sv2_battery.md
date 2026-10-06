# User decision, 2026-10-06: approve the SV-2 swing-servo validation battery, then allowance → PG-1 (30 mm) → bounded touchdown matrix (verbatim)

Approve the proposed new swing-servo validation battery, with the following constraints.
Freeze and preregister it before running it.
Preserve every old battery and result as historical evidence; do not overwrite or retroactively reinterpret them.
The new battery must represent the actual intended E2 operating envelope:
- representative forward and lateral E2 steps;
- planner corridor extremes;
- both legs;
- all eight morphologies;
- 180/240/480 Hz;
- the proposed harder but physically reachable cases, including the 0.45 s / 40 mm / diagonal / 0.15 m cases only where the existing reachability certifier proves them feasible before freezing the run.
Approve the V-2 change so it evaluates the D1-on acceleration/tracking mechanism rather than requiring a specific improvement ratio against a known-defective controller.
Approve resolving tracking allowance by 0.05 swing-phase bins rather than one allowance for an entire rise/apex/descent phase.
The allowance in each bin must be derived from independent validation runs and conservatively bound the relevant downward clearance error for that bin. Do not derive it from the E2 cases that the certificate is subsequently judging.
Keep separate:
- tracking accuracy validation;
- clearance certification;
- reachability;
- integrity/energy/torque checks.
A trajectory that is unreachable for a morphology must not inflate the tracking allowance for reachable E2 trajectories. It should instead be rejected by reachability and reported separately.
Run the frozen battery.
If it validates, derive the per-bin allowance exactly according to the preregistered method and re-run PG-1 with the 30 mm apex.
Do not change the 30 mm apex again.
If PG-1 certifies all commanded steps, run only the bounded 30 mm touchdown diagnostic matrix next — not the full official E2 battery yet.
For touchdown, report at minimum:
- instantaneous solver-step peak;
- maximum load averaged over a fixed 10 ms physical-time window;
- 50 ms impulse;
- touchdown normal and tangential velocity;
- penetration/rebound;
- actuator torque steps;
- results separately at 180/240/480 Hz.
Do not yet replace E2-5.
The purpose is to determine whether the existing 25% BW requirement is fundamentally intended to limit physical short-duration load rather than a solver-step-dependent instantaneous sample.
If the 10 ms measure remains materially rate-stable at the 30 mm apex and has a defensible physical interpretation, give me the evidence and recommendation for a versioned E2-5 amendment. Include the source/evidence for choosing 10 ms specifically; do not select that window merely because the current data pass it.
Keep the passive-ankle damping compensation diagnostic-only.
Keep recovery issue C untouched.
Do not run official E2 until:
1. the new servo battery legitimately validates;
2. PG-1 certifies under the resulting independent tracking allowance;
3. the touchdown metric question is resolved.
Keep everything local. Do not push.
