# User decision 2026-10-10 (≈00:35 BST) — approve the three-case 3 m/s promotion-carrier vertical slice with decisions D-1 … D-8 and restrictions; add the critical criterion "the locomotion gait driver itself must not erase the collision" (nine sub-requirements); hard stops; preregister first, then implement and run only the approved slice (verbatim)

Received in the Claude Code session, in reply to `promotion_carrier/PROMOTION_CARRIER_INVESTIGATION.md` (da6b226). Reproduced verbatim below.

---

Approve the proposed three-case 3 m/s vertical slice, with the following decisions and restrictions.
D-1 Amendment: approve. During promotion, replace “posture held at promoted pose” with posture targets following the simulation’s own leg law at its authoritative stride clock, initialized continuously from the promoted pose.
D-2 Recovery support: approve retargeting B to the same reference pelvis and releasing its vertical axis. Do not increase or recalibrate any existing B caps, gains, recovery budget or release rule for this slice.
D-3 Inverse-dynamics feed-forward: approve for limbs not in ground contact. It must be strictly feed-forward from the undisturbed simulation gait/reference state. It may not read collision displacement/error to increase its response. Log its force/torque contribution separately.
D-4 Handoff: use LC-1 as the presentation source because it is the current locomotion candidate, but promotion must still satisfy the existing physical compatibility requirements. Do not modify LC-1 during this experiment.
D-5 Promotion: approve the latest valid promotion frame at least 6 simulation ticks before predicted contact for this slice. Record the actual lead for every case.
D-6 SLP-2 field: include the existing validated uniform translation field unchanged. At constant 3 m/s it should contribute approximately zero before contact. It must switch off when the authoritative simulation reaches its own contact response so that the simulation’s collision response is not applied twice.
D-7 Scope: exactly three cases at 3 m/s:
- rx_miss
- rx_free_leg
- rx_planted_leg
Do not add speeds, bodies, tackle cases, gait mechanisms, foot-placement logic, balance control, stance-force shaping or parameter sweeps.
D-8 Approval: preregister and build this slice.
Add one critical criterion before freezing:
The locomotion gait driver itself must not erase the collision.
For every driven joint/limb, separately log commanded feed-forward torque, servo/posture torque, contact impulse and resulting physical velocity/displacement from before contact through at least 0.25 s after contact.
Compare each contact case against its identical no-tackler counterpart. Require that:
1. before contact, gait-driver commands are identical between contact and no-contact versions;
2. the driver does not increase its authority in response to collision displacement;
3. collision-created linear and angular momentum remains visible after contact rather than being cancelled on the following ticks;
4. the recoverable swing-leg clip may return toward the gait only through the already-approved finite recovery authority and ordinary actuator limits;
5. the planted-leg fall must remain capable of overwhelming that authority and producing the simulation-authoritative fall;
6. rx_miss must remain indistinguishable from its no-tackler baseline after promotion/demotion;
7. presentation ON/OFF remains gameplay-hash identical;
8. all runs reproduce deterministically;
9. report CPU cost separately for the carrier, gait targets/IK, inverse-dynamics feed-forward, recovery support and physics.
Hard stop: if pre-contact coherence fails, stop. If the carrier or gait driver materially cancels collision momentum, stop. If making the three cases pass requires increasing physical authority/caps, changing the simulation outcome, changing collision geometry, or adding another gait mechanism, stop and report rather than fixing it.
Do not treat failure of this slice as evidence for V3 unless the failure is demonstrated to arise from the underlying V2 body/joints/actuators/contact model rather than the temporary locomotion/gait driver.
Preserve all prior SLP, PI-1, LC-1, V1.3 and V2 evidence unchanged. Preregister first, then implement and run only the approved slice.
