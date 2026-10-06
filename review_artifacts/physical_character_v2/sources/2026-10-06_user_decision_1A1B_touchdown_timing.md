# User decision, 2026-10-06: fix floating-base angular compensation (1A) and the near-contact command transition (1B) first; then the contact-seeking touchdown architecture; timing priorities (verbatim)

Research review complete. Proceed with the touchdown work using the following decisions.
Preserve all completed AB/AB2 evidence. A+B remains qualified under AB2. Preserve T-1 and the execution-feasibility work.
Decision 1 — fix the two remaining controller defects before selecting touchdown timing.
1A. Floating-base angular compensation
Add the missing pelvis/base angular-motion contribution through the existing frame-consistent swing-foot task conversion.
The objective is a commanded world-space foot orientation/angular motion that correctly accounts for pelvis angular velocity/acceleration and the rotating-frame transport terms—not an ad-hoc raw pelvis-acceleration torque.
Ensure terms already represented by the Jacobian, bias/Jdot-v, existing feed-forward or passive dynamics are not double-counted.
Validate this correction independently across both legs, representative/corridor/harder reachable trajectories and 180/240/480 Hz.
Measure at minimum:
- world foot angular velocity at contact;
- orientation error;
- velocity of potential contacting sole points, including the ω × r contribution;
- actuator torque/rate;
- tracking;
- energy;
- rate stability.
1B. Near-contact command transition
Remove the problematic architecture where an isolated pelvis-motion feed-forward contribution is multiplied by the contact/swing gain blend.
Keep distinct:
- task kinematics;
- tracking dynamics/feed-forward;
- support authority.
Construct the transition at the complete command/task level.
Shared compensation that is valid in both approach and accommodation should remain shared. Transition only the incompatible approach-specific versus contact-compatible components.
Conceptually:
tau = tau_shared + (1-sigma) * tau_approach + sigma * tau_accommodation
but do not assume that a smooth sigma guarantees safety. Certify the final aggregate actuator command against the existing torque-continuity criterion throughout the possible-contact interval.
Preserve coherent velocity-error laws: do not move gain-dependent compensation outside its gain merely to make the algebra look smooth.
Preregister and validate these two corrections before using them to choose touchdown timing.
If either correction fails substantively, stop.
Decision 2 — touchdown timing architecture
Once 1A/1B validate, implement:
planned approach → bounded contact search if necessary → measured contact → accommodation → measured load acceptance/support.
Keep a planned touchdown time for the balance/planning prediction.
Measured Jolt contact, not the nominal clock, terminates free-space descent.
Establish a certified [earliest contact, latest contact] window and a latest acceptable effective-support time.
The nominal 0.6 s swing remains a baseline planning preference, not a hard requirement.
The 50% apex remains a baseline, not a hard requirement.
Do not select a new swing duration or apex fraction by trying values until E2 passes.
Use the execution certifier to choose the shortest/most appropriate complete trajectory that satisfies:
- reachability/execution feasibility;
- validated tracking uncertainty;
- jerk/acceleration/rate/torque limits;
- tangential completion before possible contact;
- orientation settling before possible contact;
- low-speed terminal approach;
- sufficient remaining time for accommodation/load acceptance.
Treat these timings independently:
- apex time;
- tangential-motion-complete time;
- orientation-settled time;
- entry into low-speed approach.
They do not have to coincide.
Decision 3 — bounded contact-seeking terminal mode
Adopt it.
The nominal trajectory must enter the earliest possible contact band already in its low-speed regime. Search is not allowed to rescue a trajectory that reaches possible contact too fast.
During search:
- hold world-space tangential foot target;
- hold the intended world landing orientation with finite-torque control;
- advance only the terrain-normal coordinate;
- use a smooth bounded speed/acceleration/jerk profile;
- continue balance prediction using the actual support state.
Derive search speed, maximum depth and maximum duration jointly from Touchline's own:
- terrain/contact uncertainty;
- validated tracking error;
- actual sole/collision geometry;
- actuator/jerk/torque limits;
- certified downward continuation;
- time required after contact to achieve effective support.
Do not import donor numerical constants.
Stop/escalate search if:
- maximum certified depth/time is exhausted;
- execution feasibility is lost;
- support deadline becomes infeasible;
- actuator/rate/torque limits cannot be maintained.
An abort must itself have a physically feasible continuation; do not fabricate support.
Decision 4 — possible-contact geometry
Use potential contacting sole-point velocities, not merely the foot-control-frame velocity.
Include translational and rotational contributions when bounding normal contact speed.
Complete tangential movement and establish the terminal control regime before the earliest possible contact according to:
contact activation/separation allowance + validated geometric/tracking uncertainty.
Do not extrapolate the existing late-descent uncertainty backward into an unvalidated trajectory region. If the selected timing moves that region, qualify it.
Decision 5 — measured contact and accommodation
At first relevant Jolt contact:
- stop blind downward free-space progression;
- preserve the planned foothold for placement scoring;
- record the realized contact pose/geometry;
- enter the preregistered contact-compatible accommodation task;
- retain compatible tangential/orientation control;
- transition aggregate actuator commands continuously;
- do not declare support from the clock;
- do not immediately impose full load.
Contact persistence and measured loading establish effective support.
Decision 6 — timing selection priority
Use this order:
1. bounded contact-search architecture;
2. allow longer nominal swing when the current 0.6 s cannot satisfy the certified approach;
3. use earlier apex only if the execution certifier shows it is a better feasible allocation.
Do not assume an earlier-than-50% apex is inherently more correct. The reviewed BLF and PyPnC implementations both provide evidence that 50% is a normal baseline, while IHMC permits more configurable waypoint structures.
If the nominal plan routinely requires additional search time, include that expected time in gait/balance prediction rather than pretending it is an uncounted extension of a 0.6 s swing.
Decision 7 — touchdown/load metric
Keep the existing evidence plan. Preserve instantaneous solver-step force diagnostically, exact physical-time load/impulse measures, actual sole-point contact velocity, penetration, rebound, slip, actuator work and requested-versus-measured load.
Do not amend E2-5 yet and do not loosen the 25% BW engineering contract merely to obtain a pass.
Order of work
1. Preregister 1A/1B.
2. Implement and validate them.
3. Freeze the touchdown coordinator design using the resulting validated uncertainty/actuation envelope.
4. Preregister the coordinator.
5. Implement and validate the coordinator independently.
6. Re-run the relevant swing/PG-1 qualification.
7. Stop and report before official E2 unless all prerequisite gates pass.
Keep the 30 mm apex height unchanged for now; timing may change, height may not.
Do not redesign recovery issue C.
Do not tune thresholds or actuator capacities.
Preserve bit-identical default/off behavior.
Keep all failed historical evidence.
Everything local. Do not push.