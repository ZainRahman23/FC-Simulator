# User decision 2026-10-09 (≈01:35, chronicle day 8 Oct) — SLP-2C: contact-compatible legs (option 1, tightly scoped); SLP-2 preserved; A unchanged (verbatim)

Received in the Claude Code session, in reply to `slp2/SLP2_RESULTS.md` (e3c99e1). Reproduced verbatim below.

---

Choose option 1, but constrain its scope tightly. Do not begin general LOC-1 or locomotion polishing.
Preserve SLP-2 as a failed calibration exactly as recorded. A is validated as the authoritative translational mechanism and must remain unchanged.
The next experiment is SLP-2C: contact-compatible legs. Its sole purpose is to determine whether real physical foot contacts can coexist with authoritative translation without consuming B's disturbance/recovery budget during ordinary unobstructed locomotion.
The failure to fix is specifically this: the scheduled foot arrives with the wrong ground-relative horizontal state, produces large braking impulses at touchdown, the lag compounds, and B then has to correct a disturbance created by the locomotion presentation itself.
Do not solve this by increasing B's caps, allowing A to compensate measured leg forces, reducing friction artificially, making contacts presentation-only, or restoring autonomous balance/gait planning.
Implement only the minimum trajectory-driven contact changes necessary:
1. Swing-foot landing velocity: schedule the swing-foot trajectory so its horizontal velocity relative to the ground approaches the physically appropriate touchdown velocity instead of planting a foot that immediately brakes the authoritative motion. Derive this entirely from the prescribed trajectory/gait schedule, never from balance feedback.
2. Stance-foot compatibility: once planted, the stance leg must accommodate the body's authoritative sweep over/away from that fixed ground contact rather than resisting the translation as an error. Do not make the planted foot slide along the ground to follow the body.
3. Jog/run vertical cycle: provide the minimum scheduled vertical stance impulse and actual flight launch required by the already-provisional jog/run gait schedule. This is trajectory/gait authoring, not autonomous balance. Do not tune it for aesthetic running.
Keep A, B, the body, joints, actuator capacities, contact/friction model, solver configuration and SLP-2 recovery law unchanged.
Before implementation, preregister quantitative pass conditions. At minimum:
- A remains responsible for essentially all commanded net horizontal locomotion;
- B remains below the existing 25% disturbance-budget criterion during undisturbed steady locomotion;
- feet do not accumulate systematic net braking/propulsive impulse that fights A;
- planted feet remain genuinely planted within the existing slip tolerance;
- legs carry the intended ordinary vertical support rather than B;
- jog/run produce the scheduled stance/flight structure rather than B carrying the body through nominal flight;
- no progressive lag between physical body and authoritative reference;
- actuator/joint margins remain valid before any failure;
- all previous SLP-1/1b/2 evidence remains reproducible.
Run the smallest calibration first: V2-REF at 1.2 m/s. If that fails for the same contact incompatibility, stop immediately rather than proceeding to 3/6 m/s.
If 1.2 m/s passes, run V2-REF at 3 m/s, then 6 m/s. These remain architecture stress tests with provisional gait timing, not claims of production-quality human gait.
If all three pass, then and only then rerun the frozen SLP-2 calibration across its required configurations. If that calibration passes, proceed to the already-frozen 21-case disturbance matrix and genuine rigid impactor without tuning specifically for those disturbances.
For each speed report separately:
- A horizontal impulse;
- net horizontal ground-contact impulse;
- touchdown horizontal foot velocity relative to ground;
- stance-foot slip;
- vertical ground-reaction impulse;
- B force/torque usage;
- body/reference discrepancy;
- pelvis orientation;
- contact/flight timing;
- joint and actuator margins;
- CPU cost.
I specifically want to know whether C has become mechanically neutral with respect to authoritative translation while remaining physically real.
Do not attempt realistic running animation, turning, acceleration polish, football-specific gait, tackles, recovery animation, performance optimisation, TD2C/E2, or production LOC-1.
If passing requires presentation-only contacts, A compensating contact forces, materially reduced friction, larger B caps, or another mechanism that makes collisions physically meaningless, stop and report instead of implementing it.
Freeze this as a versioned SLP-2C experiment, implement it, run it under the staged stop rules above, and stop for my review.
