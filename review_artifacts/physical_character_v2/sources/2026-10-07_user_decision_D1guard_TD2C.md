# User decision, 2026-10-07: D1 guard as a versioned controller correction; out-of-window early terrain = unexpected-obstacle event; fresh TD2C (verbatim; received as pasted content, the user's whole message)

Decisions approved with the following requirements.
1. D1 guard: approve as a versioned controller correction.
The acceleration feed-forward must not produce commands from an invalid, unreachable, singular or numerically ill-conditioned IK solution.
Do not implement this merely as a special case for the +10 mm obstacle.
Define the validity/conditioning rule generally from the existing execution-feasibility/IK machinery and numerical conditioning evidence.
Before implementation, preregister independent validation showing:
- valid/reachable cases remain equivalent within the intended numerical tolerance;
- unreachable/singular cases cannot produce unbounded/non-finite actuator commands;
- the guard is symmetric across legs;
- deterministic across 180/240/480 Hz;
- no new energy creation;
- no regression in AB2, E1/E1b or qualified E2 swing behaviour;
- transition into/out of the guard cannot itself create a torque/rate discontinuity.
Preserve the existing counterfactual evidence, but do not use the +10 mm case alone as qualification.
If the guard passes, adopt it as a general controller safety/correctness fix.
2. Out-of-window early terrain: classify it as an unexpected-obstacle / out-of-envelope event, not normal touchdown.
Preserve TD2B as FAIL under its frozen criteria.
For TD2C, preregister the distinction before running:
- inside the certified possible-contact window: full touchdown contract applies;
- terrain below the certified window but within the defined late-search envelope: bounded TD2 search/escalation contract applies;
- terrain above the certified early-contact window: unexpected-obstacle handling applies.
A +10 mm raised obstacle struck during ordinary swing is not required to satisfy the normal ≤25% BW touchdown contract, because the collision occurs before the terminal touchdown phase can act.
However, unexpected-obstacle handling must require at minimum:
- no unexplained/generated energy;
- finite bounded controller commands;
- no numerical instability;
- no fabricated support;
- physically authoritative collision;
- explicit event classification;
- safe abort/fall/recovery outcome according to the existing E2 §2a semantics;
- impact, slip, rebound, penetration and torque continuity reported rather than hidden.
Do not require “no abort or fall” for an arbitrary unexpected obstacle. A sufficiently severe unexpected obstacle may physically cause failure. The controller requirement is graceful, bounded, correctly classified behaviour—not guaranteed recovery.
Do not tune TD2 to make the +10 mm obstacle satisfy ordinary touchdown criteria.
3. Preserve the successful TD2 architecture and values.
Do not redesign nominal, certified-early, certified-late, late-search or no-ground behaviour unless the D1 guard causes a legitimate regression.
4. Fresh TD2C
Freeze the amended classification/criteria and D1 validation before running.
Run the full TD2C battery.
If TD2C passes, proceed autonomously through:
1. E2 integration;
2. swing/servo requalification required for PG-1;
3. PG-1;
4. remaining frozen prerequisites;
5. official E2.
If a prerequisite fails substantively, diagnose and stop rather than tune.
If official E2 passes, stop before E3/repeated walking and give me the complete report.
Preserve all historical TD2/TD2B failures and preregistrations.
Everything local. Nothing pushed.