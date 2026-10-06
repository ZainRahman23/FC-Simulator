# User decision, 2026-10-06: implement A + B, then a minimal measured-contact touchdown handoff; staged validation through execution feasibility, SV re-run and PG-1 (verbatim)

Approve implementation of A and B, followed by a minimal measured-contact touchdown handoff. Use the Astra research as design evidence, but validate everything against Touchline's own physics.
A — pelvis-motion compensation
Apply the same already-validated singularity-robust inverse treatment to the pelvis-motion contribution of the world-space swing-foot velocity task.
Treat commanded foot motion and pelvis/base compensation consistently as parts of the same task. Preserve all joint-rate limits, actuator limits and existing grounded/contact behavior.
B — passive ankle damping compensation
Compensate the known modeled passive ankle damping once in the swing actuator force accounting.
Prefer reference-rate compensation where appropriate so nominal trajectory drag is compensated without blindly cancelling damping against arbitrary contact-induced motion. Maintain an explicit force/torque ledger so passive tissue, actuator command, feed-forward and other contributions cannot be double-counted.
Do not abruptly disable A or B at first contact.
Before touchdown architecture changes, validate A+B factorially:
- baseline;
- A only;
- B only;
- A+B;
across both legs, representative E2 steps, the relevant harder reachable cases and 180/240/480 Hz.
Preserve T-1 unchanged. Specifically confirm that its previous failures collapse for the predicted causal reason rather than by threshold manipulation.
Also verify actuator-command continuity, energy accounting, orientation error, vertical residual, clearance, knee/soft-limit margin and rate stability.
Then implement the smallest reusable touchdown coordinator.
It must have these conceptual phases:
1. Swing / final approach
Keep the existing swing architecture, including A+B.
Replace the terminal portion with a geometry-consistent, C2-continuous low-speed final approach. The landing condition must be defined from the actual sole/collision geometry relative to the terrain, not merely the foot control-frame origin.
For deliberate E2 placement, nominal terminal normal velocity and acceleration should be zero.
Establish a bounded final-approach corridor in which:
- normal approach speed is bounded across the entire plausible contact-height interval;
- most tangential displacement is already complete;
- landing orientation is near terrain alignment with low angular velocity;
- tracking uncertainty and collision geometry are included explicitly.
Do not choose the corridor start, speed or shape by searching for values that pass the existing E2 cases. Derive/preregister them from geometry, uncertainty, actuator capability and touchdown requirements.
If the nominal endpoint is reached without contact, allow only a bounded slow contact-search continuation with explicit depth/time/reachability limits.
2. First measured contact / accommodation
Jolt contact remains authoritative. Never infer or manufacture contact from trajectory phase.
On first genuine measured contact:
- stop advancing the incompatible free-space downward reference;
- record the actual landed foot pose/contact geometry as the control anchor;
- retain the original planned foothold separately for placement-error scoring;
- preserve appropriate tangential/yaw control;
- transition orientation control in a contact-compatible, torque-bounded way;
- preserve/transition A+B and other compatible compensation rather than zeroing them in one tick;
- do not introduce a rigid vertical hold that pushes the foot into the turf;
- do not immediately declare the foot fully load-bearing.
A touching foot means physical interaction exists. It does not mean the requested support wrench has already been realized.
3. Load transfer
Hand responsibility to the existing load-acceptance/balance mechanism deliberately.
The normal swing task must no longer compete with requested support loading.
Verify requested versus measured load, contact persistence, slip, actuator work and stability throughout the transfer.
4. Support
Enter ordinary support only from measured accepted contact/load state.
Do not make this an E2-only controller. The same coordinator/interface should later permit different approach/load policies for ordinary walking, emergency recovery and running.
Touchdown orientation
Keep E2's intended landing terrain-aligned/flat. Do not introduce heel-first or toe-first gait merely to compensate for the existing ~1° tracking error.
Complete most orientation correction before the contact corridor. If an edge touches first, allow bounded contact-compatible flattening about the realized contact geometry rather than commanding the whole sole through the ground.
Touchdown measurement
Do not use raw solver-step peak force as the primary physical acceptance metric.
Before adopting a replacement criterion, preregister and validate:
- exact-duration 10 ms vertical impulse-derived average load;
- cumulative impulse at 10/20/50 ms;
- pre-contact normal/tangential velocity at the actual contacting point;
- solver-step peak for numerical diagnostics;
- rebound;
- penetration;
- slip;
- orientation;
- actuator work.
Preserve the existing 25% BW engineering contract for deliberate pre-load placement while testing the proposed physical-time formulation.
Specifically evaluate ≤25% BW over the first exact 10 ms after contact and, in a separate placement-only validation where intentional load transfer is withheld for the first 50 ms, the maximum sliding 10 ms average during that interval.
Do not treat the 50 ms observation period as a production dwell requirement.
Include the first physical collision impulse even when the physics callback reports it at the end of the solver interval. Near thresholds, test sensitivity to impulse-window boundary allocation and timestep.
Do not weaken the 25% threshold merely to make E2 pass.
Reachability / execution feasibility
Extend certification conceptually from:
endpoint IK
to:
endpoint geometry → whole swing path → execution feasibility.
First check the entire path against the predicted pelvis-motion envelope, including:
- joint soft-limit margin;
- joint rates;
- Jacobian conditioning;
- swept sole clearance;
- self-collision;
- final contact-compatible posture.
Then require closed-loop Jolt replay using the real controller and finite actuators for execution qualification.
The V2-long-legs lateral counterexample must no longer be admitted merely because endpoint IK succeeds.
Do not build a new global planner or import TOPPRA wholesale. Use these as principles around the existing Touchline certifier.
Order of work
1. Preregister A+B validation.
2. Implement/validate A+B.
3. Preregister the minimal touchdown handoff and its metrics.
4. Implement the handoff.
5. Validate touchdown independently before official E2.
6. Add the path/execution-feasibility extension.
7. Re-run the swing-servo validation and PG-1 under the resulting validated configuration.
8. Only if those pass, resume official E2 from its first frozen stage.
If any stage fails substantively, stop at that stage and diagnose it rather than tuning downstream values.
Keep the 30 mm apex unchanged for now.
Keep T-1 frozen.
Preserve all historical failed results and superseded criteria.
Keep recovery issue C unchanged except where the new generic touchdown interface necessarily applies; do not redesign recovery stepping yet.
Default paths/configurations must remain bit-identical when the new mechanisms are disabled.
Everything local. Do not push.