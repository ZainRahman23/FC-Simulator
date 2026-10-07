# User decision, 2026-10-07: next TD2 iteration — certified early window, search-preserving escalation, physics-rate invariance (verbatim; received as pasted content, the user's whole message)

Approve the next TD2 iteration with the following decisions. Preserve the existing TD2 preregistration and 1,824-run result permanently as FAIL. Do not overwrite or reinterpret it.
Decision 1 — early terrain
Correct the early-condition definition as a versioned preregistration amendment.
Define the coordinator's certified possible-contact window explicitly from the actual sole/contact geometry, qualified tracking uncertainty and terrain-height uncertainty.
“Early terrain” must mean contact occurring within that certified possible-contact window while the terminal approach is already in its contact-safe regime.
Terrain outside that certified window is not an ordinary early-contact case. Classify and test it according to the existing E2 terrain/out-of-envelope handling semantics rather than placing the turf arbitrarily at the end of approach.
Do not choose the window from the previous failing terrain offsets. Derive it before the next battery.
Decision 2 — no-ground/beyond escalation
Adopt the TD2 approach + settle + bounded search as the normal touchdown architecture.
Do not retain the current failed escalation that jumps the target ~13 mm in ~0.1 s.
Design a versioned escalation that preserves the same physical invariants as the normal search:
- bounded terrain-normal velocity;
- bounded acceleration and jerk;
- aggregate actuator torque/rate continuity;
- tangential target held;
- landing orientation held within finite actuator capability;
- no fabricated contact/support;
- execution feasibility maintained.
Prefer continuing/replanning the bounded search under E2's existing failed-touchdown semantics rather than introducing an abrupt new descent command.
Before implementation, analytically/offline determine whether the required beyond-terrain envelope is physically reachable under those constraints.
If it is not, classify it as an explicit touchdown failure/out-of-envelope case rather than forcing the foot downward.
Preregister the escalation before implementation.
Decision 3 — rate stability
Preserve the original ≤10 ms touchdown-time criterion and its TD2 failure as historical evidence.
Replace it in the next version with a physics-rate invariance criterion based primarily on physical landing state, not exact discrete collision tick.
Before running anything, derive and preregister bounds for cross-rate differences in:
- actual sole/contact-point normal velocity at contact;
- tangential velocity;
- placement;
- orientation/angular velocity;
- 10 ms impulse-derived load;
- cumulative impulse;
- penetration;
- rebound;
- slip;
- torque/rate continuity;
- time from measured contact to effective support.
Continue reporting touchdown-time variation diagnostically.
Do not select new bounds by looking at TD2's observed 18.8 ms and rounding above it. Derive them from the existing physical tolerances, timestep discretisation and qualified tracking uncertainty.
TD2 architecture
Keep the successful normal architecture substantially unchanged:
validated AB swing → raised terminal approach → settle → bounded terrain-normal search → measured Jolt contact → existing E2 acceptance/hand-back → lifecycle contact hold/load acceptance.
The current evidence strongly supports it in nominal + late conditions, so do not redesign successful portions merely because the full battery failed.
Preserve the 30 mm apex.
Preserve AB/AB2.
Keep 1A unused and 1B rejected.
Keep the execution-feasibility certifier.
Preserve the 25% BW engineering contract.
Validation
Freeze the amended criteria and any escalation implementation before the fresh TD2 battery.
Include early / nominal / late / beyond conditions across all bodies, both legs and 180/240/480 Hz, plus identity/determinism and previous regressions.
If the fresh TD2 validation passes, proceed autonomously through:
1. swing/servo requalification needed for the PG-1 clearance allowance;
2. PG-1;
3. remaining already-frozen prerequisites;
4. official E2 exactly as preregistered.
If a substantive gate fails, stop and diagnose rather than tune it.
If official E2 passes, stop before repeated stepping/E3 and report.
Keep everything local. Nothing pushed.