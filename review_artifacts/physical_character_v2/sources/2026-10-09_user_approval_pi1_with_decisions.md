# User approval 2026-10-09 (≈02:25, chronicle day 8 Oct) — PI-1 approved with decisions D-1 … D-5 (D-2 modified) and clarifications; freeze, implement the smallest offline slice, run near miss → recover → fall, stop (verbatim)

Received in the Claude Code session, in reply to `pi1/PI1_DESIGN.md` (e01bb67). Reproduced verbatim below.

---

Approve PI-1 with the following D-1 through D-5 decisions and clarification. Freeze the preregistration only after incorporating them.
D-1 — approved: generate a V2 body matching the simulation runner: 73 kg and the runner's actual dimensions/leg lengths from the existing record. Perform the proposed quick body/integrity check before PI-1. Do not tune that body specifically for the tackle.
D-2 — modify your recommendation: do not use B to force an authoritative fall to remain spatially attached to the simulation trajectory.
Separate gameplay authority from presentation trajectory:
- The simulation decides the football outcome: near miss, contact-but-recover, or tackle/fall.
- For a recover outcome, B may use its existing finite capped authority to reconcile the disturbed physical character toward the authoritative locomotion reference.
- For a fall outcome, once the authoritative fall/contact transition occurs, release the locomotion/recovery authority that would pull the body back toward the running trajectory. Allow the promoted V2 body to evolve physically from its actual contact pose, linear velocity, angular velocity and collision impulse.
- Do not feed the resulting ragdoll/fall trajectory back into the football simulation in PI-1.
- Record the spatial discrepancy between the simulation representation and physical presentation throughout the fall. Do not hide it.
The simulation remains authoritative over gameplay state; the physical presentation is allowed to determine the detailed body trajectory of an already-authorized fall.
D-3 — approved: predictive promotion 0.10 s before predicted contact using only current authoritative simulation state/known trajectories. Prediction may prepare presentation state but must never influence the simulation outcome. For the near-miss case, promotion must cleanly return to cheap locomotion without leaving any state difference.
D-4 — approved: run PI-1 offline in Node from recorded authoritative simulation data first. Do not build the browser integration until the offline slice passes.
D-5 — approved with scope: use the fixed 2 Hz B setting for the recoverable contact case. Do not perform a calibration sweep. In the authoritative fall case, B must not continue pulling the fallen body along the running trajectory after the fall transition.
Preserve the three proposed PI-1 cases:
1. Near miss: promote, no physical contact, demote with no observable residual difference.
2. Swing-leg clip / recover: contact physically perturbs the promoted body, the authoritative outcome remains recovery, finite B may reconcile it, and it returns smoothly to ordinary locomotion.
3. Weight-bearing-leg sweep / fall: contact physically perturbs the promoted body, the authoritative outcome is fall, locomotion/recovery pull-back releases at the fall transition, and the articulated body falls physically with its actual momentum.
For case 3, explicitly verify that the fall is not merely a canned animation and is sensitive to physically relevant initial conditions/contact geometry while remaining deterministic for identical inputs.
Promotion requirements: initialize the V2 physical body from the exact presentation pose at promotion, with consistent root/segment linear and angular velocities. There must be no visible pose pop, velocity discontinuity, artificial energy injection or instantaneous correction. Promotion itself must not generate a collision impulse.
Demotion/recovery requirements: do not teleport or cross-fade the body. For the recover case, define a deterministic reconciliation window in which the physical pose becomes compatible with the ordinary locomotion pose before physics is removed. For the fall case, use the existing authored get-up only after a separately defined physically plausible handoff state; do not solve get-up in PI-1.
Animation neutrality: run the authoritative football record with physical presentation enabled and disabled. Gameplay outputs/hashes must remain identical. PI-1 may alter only presentation state.
Contact validation: record the actual contact point, normal, relative velocity, impulse, contacted body segment, stance/swing phase, pre/post linear and angular momentum, joint margins, actuator margins, B usage and physical/reference discrepancy through every promoted case.
CPU: measure separately:
- cheap locomotion before promotion;
- promotion cost;
- promoted V2 cost per simulated second;
- collision/fall cost;
- reconciliation/demotion cost;
- estimated 22-player cost at several simultaneous-promotion counts (0, 2, 4, 8 and 22), without assuming an interaction frequency.
Do not optimize yet.
Critical stop conditions: stop and report rather than redesign if:
- promotion itself causes a meaningful impulse/state discontinuity;
- the near miss cannot return exactly to the never-promoted presentation state;
- B must overpower the physical contact to satisfy the recovery case;
- the fall requires hidden trajectory following or position/velocity writes;
- collision response cannot remain physically visible while gameplay hashes remain unchanged;
- PI-1 requires restoring continuous physical locomotion.
Freeze this PI-1 preregistration, implement only the smallest offline slice, run the three cases in order near miss → recover → fall, with a stop on architectural failure, and then stop for my review.
Do not start browser integration, running/turning animation development, dribbling, generalized tackles, performance optimization, TD2C/E2 or PI-2.
