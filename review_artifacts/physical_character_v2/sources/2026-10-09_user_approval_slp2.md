# User approval 2026-10-09 (≈01:05, chronicle day 8 Oct) — SLP-2 architecture decisions 1–4 approved; production-contract clarification; freeze, implement and run SLP-2 (verbatim)

Received in the Claude Code session, in reply to `slp2/SLP2_ARCHITECTURE_DRAFT.md`. Reproduced verbatim below.

---

Approve all four SLP-2 architecture decisions. Freeze the preregistration and implement/run SLP-2.
Specifically approved:
1. A is the uniform whole-body locomotion field, not a pelvis motor, kinematic root, constraint, character controller or global gravity modification. It carries only the authoritative horizontal translational acceleration and reads no physical state.
2. A and B fade together under the continuous recovery-authority law when support is lost, with no position/velocity reset and with the physical body's actual linear and angular momentum preserved.
3. A does not compensate leg forces. Leg/contact errors remain real physical disturbances and consume B's finite recovery budget where applicable.
4. D is report-only for SLP-2. It must not feed back into the authoritative football trajectory T or silently change a football outcome.
One architectural clarification should be recorded before freezing:
SLP-2 is a calibration experiment, so physical disruption/fall may diverge from T and that divergence is only reported. This is not the final production gameplay contract.
In production, the football simulation remains authoritative over whether a football interaction changes the player's gameplay state/trajectory. Presentation physics must not independently change an already-decided football outcome. Once the match engine resolves a collision/tackle/contact outcome, the physical character will be responsible for producing a plausible body response consistent with that authoritative outcome. Do not solve that integration problem in SLP-2.
Run the proposed calibration at 1.2, 3 and 6 m/s and the full frozen 21-case disturbance matrix, including the genuine rigid impactor.
The two new SLP-2 pass checks are approved:
- in undisturbed locomotion, B/support remains below 25% of its caps;
- A supplies the authoritative net horizontal translation rather than B or the legs.
For every disturbance, record at minimum:
- physical displacement D from R over time;
- linear and angular velocity difference;
- support/recovery authority over time;
- A and B force separately;
- contact impulse and contact location;
- stance/swing phase;
- foot contacts/slip;
- joint and actuator margins;
- retained/recovering/disrupted/fallen classification;
- time to recover if recovered;
- momentum immediately before contact, after contact and at any support disengagement.
Explicitly compare the matched torso, stance-leg and swing-leg disturbances. I want to know whether identical impulse magnitudes naturally produce different responses because of contact location, gait phase and current physical state.
For the rigid impactor, compare its response with the corresponding applied-impulse diagnostic. They need not be numerically identical, but explain any meaningful difference.
Do not tune SLP-2 to obtain desirable tackle behaviour. This is still an architectural validation. Do not introduce tackle-specific thresholds, fall rules, animation logic or collision-event branches.
Also measure CPU cost, but do not perform the proposed performance optimisations yet. Preserve the current physics rate, solver iterations, passive tissue, IK frequency and diagnostic configuration so SLP-2 remains comparable to the earlier experiments.
Stop immediately if A materially cancels collision response, if B must carry ordinary locomotion again, if ordinary undisturbed locomotion consumes more than the preregistered support budget, if momentum is discontinuously changed on disengagement, or if the architecture requires hidden state writes.
If SLP-2 passes, stop and report. Do not proceed into SLP-3, tackle implementation, locomotion polish, performance optimisation, TD2C/E2 or any other development.
