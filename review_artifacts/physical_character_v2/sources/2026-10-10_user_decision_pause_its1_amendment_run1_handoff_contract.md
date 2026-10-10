# User decision 2026-10-10 (≈14:19 BST) — architecture sequencing: pause the proposed ITS-1 interaction-controller amendment; preserve the ITS-1 stop as evidence; read-only preparation only — draft the minimum RUN-1 → V2 interaction-time handoff contract (RUN-1 direct / V2-derived / simulation-authoritative; ITS-1 tests to reuse vs retire); stop for review (verbatim)

Received in the Claude Code session as the whole message (pasted text), in reply to the ITS-1 stop report (c647f4c9). Reproduced verbatim below.

---

Architecture sequencing decision: pause implementation of the proposed interaction-controller amendment.
Do not implement the stance-aware controller, do not change activation thresholds, and do not run another collision slice yet.
We now have a new Locomotion V2 / RUN-1 system being developed specifically to replace the old locomotion presentation used by the interaction experiments.
I do not want to optimize the production animation→physics handoff around V1.3/LC-1 if that locomotion representation is going to be retired.
Preserve the current ITS-1 stop exactly as evidence. The work was useful: it established that S-A can initialize validly, exposed why a frozen posture controller is inappropriate for a moving runner, and identified the requirements of the interaction-time handoff.
For now, perform read-only preparation only for receiving the eventual RUN-1 state.
Define the minimum interface that a production locomotion system must expose to initialize V2 at interaction time. At minimum investigate/specify:
- authoritative root/world position;
- authoritative translational velocity;
- facing and turning/angular velocity;
- complete skeletal joint pose;
- joint angular velocities;
- pelvis pose and velocity;
- whole-body COM/momentum requirements;
- gait phase;
- stance/swing/flight state;
- planted-foot identity and contact state;
- foot position/orientation/velocity;
- any information required to initialize V2 without finite-differencing noisy rendered frames.
Separate these into:
1. information RUN-1 should expose directly;
2. information V2 can derive deterministically;
3. information that must come from the authoritative football simulation.
Also identify which existing ITS-1 tests remain architecture-independent and should be reused unchanged when RUN-1 becomes the source, versus which tests exist only because of V1.3/LC-1 and should be retired.
Do not modify RUN-1 from this session. Do not modify V2. Do not modify the simulation. Do not implement the bridge yet.
Produce a concise RUN1_TO_V2_HANDOFF_CONTRACT_DRAFT and stop for my review.
The next physical-interaction experiment will be performed against a frozen/versioned RUN-1 baseline after its current visual-quality pass is complete.
