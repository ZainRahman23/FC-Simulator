# User decision 2026-10-09 (00:3x, chronicle day 8 Oct) — SLP-1b: option A (legs supply ordinary locomotion forces; support caps unchanged) (verbatim)

Received in the Claude Code session, in reply to `slp1/SLP1_RESULTS.md` (627d935). Reproduced verbatim below.

---

Choose A. Do not choose B or C at this stage.
The SLP-1 result is accepted as a useful failed architecture experiment. Preserve it exactly. Do not alter the frozen SLP-1 results or retrospectively make it pass.
The failure clarifies the intended production architecture: the artificial support must remove autonomous balance, not replace ordinary locomotion forces.
Implement a versioned SLP-1b amendment that reuses the existing controller's pelvis-orientation mechanism through the stance legs and supplies ordinary locomotion propulsion through the physically actuated legs. Keep the previously frozen artificial-support force/torque caps unchanged.
This does not authorize restoring autonomous balance, CoP planning, capture-point planning, load-sharing decisions, abort supervision, CF gait logic, or any mechanism that independently decides the player's trajectory. The authoritative prescribed trajectory remains the source of locomotion intent.
The intended separation is:
trajectory/locomotion driver → schedules physically feasible footholds, leg motion, propulsion and pelvis orientation;
V2 articulated body/actuators/contacts → physically executes that motion within existing capacity and joint limits;
finite artificial support → supplies only the residual stabilization necessary to avoid requiring autonomous balance;
recoverability/support-authority calculation → determines whether disturbances are recoverable and continuously yields toward physical falling.
In particular, the support should no longer be expected to provide the majority of ordinary forward propulsion or body support during an undisturbed run.
Before the full disturbance matrix, rerun only the SLP-1 calibration at 1.2, 3 and 6 m/s and report:
- achieved speed;
- fraction of body weight carried by artificial support versus the legs;
- forward propulsion attributable to support versus leg/ground contact;
- artificial-support saturation percentage;
- pelvis pitch/roll;
- stance-contact fraction;
- foot slip;
- actuator saturation;
- joint-limit margins;
- tracking error;
- CPU cost;
- whether the motion is physically locomotion rather than the support dragging the body.
Also show the time series for support force, ground-reaction/contact forces and pelvis motion for at least one representative cycle at each speed so we can verify the separation directly.
Do not loosen the existing support caps to obtain a pass.
If 1.2/3/6 m/s cannot work within those caps after ordinary locomotion forces and pelvis orientation have been restored through the legs, stop and report why. At that point we can separately decide whether the support/recovery cap really needs architectural separation.
If calibration succeeds, proceed with the already-preregistered SLP-1 disturbance matrix as SLP-1b, including the genuine rigid-impactor case. Preserve the requirements that support never reads collision events, never writes position or velocity, and support loss preserves the body's actual linear/angular momentum.
Do not tune physical body parameters, solver iterations, physics frequency, passive tissue or IK for performance. Do not start locomotion polish, turning, tackling, recovery, TD2C/E2 or anything beyond SLP-1b.
Stop and report after SLP-1b.
