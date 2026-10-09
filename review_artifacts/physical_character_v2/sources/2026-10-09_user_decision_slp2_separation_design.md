# User decision 2026-10-09 (≈01:00, chronicle day 8 Oct) — SLP-1 / SLP-1b preserved as failed experiments; not option B as framed; clarified separation A (locomotion authority) / B (physical support & recoverability) / C (leg & skeletal locomotion); design SLP-2 architecture first, no implementation (verbatim)

Received in the Claude Code session, in reply to `slp1/SLP1b_RESULTS.md` (e4f572f). Reproduced verbatim below.

---

Do not choose B as currently framed, and do not continue tuning SLP-1b. Preserve SLP-1 and SLP-1b as failed architectural experiments.
The results expose a mistaken requirement in our current hybrid design: we are still requiring physical leg/ground forces or the finite recovery support to generate ordinary forward locomotion. That is not required by the production architecture I want.
New architectural clarification: authoritative football locomotion may supply ordinary translational motion directly.
The football simulation/movement layer has already decided the player's authoritative trajectory, velocity and acceleration. The physical character does not need to rediscover or physically generate that ordinary translation through ground-reaction propulsion.
Separate three concepts:
A. Locomotion authority: carries the character along the prescribed authoritative football trajectory during unobstructed locomotion.
B. Physical support/recoverability: finite physical authority responsible for keeping the articulated body organized around that trajectory and determining how much disturbance can be recovered from.
C. Leg/skeletal locomotion: produces physically plausible foot plants, leg motion, pelvis orientation and contacts that explain the authoritative movement, but is not required to generate the net forward impulse necessary to accelerate the player's entire mass.
Do not simply raise SLP-1's recovery/support force caps until they can propel the body. Those caps should remain conceptually associated with disturbance recovery.
Before implementing anything, design SLP-2 around this clarified separation.
I want you to determine the cleanest way, given the existing Jolt/V2 architecture, to impose authoritative translational locomotion while retaining a genuinely physical, articulated, contactable character.
In particular investigate and propose:
1. Which body/root/pelvis quantity should carry authoritative translation: kinematic target, velocity motor, constraint/motor reference, moving reference frame, or another existing Jolt mechanism.
2. How the articulated bodies and joints remain physically meaningful and contactable while that locomotion authority is active.
3. How collision impulses are preserved rather than immediately erased by the locomotion authority.
4. How to represent a temporary difference between the authoritative trajectory and the disturbed physical body.
5. How finite recoverability determines whether that discrepancy is corrected, becomes a stumble, or causes locomotion authority to disengage into a physical fall.
6. How linear and angular momentum are preserved at disengagement.
7. Whether ordinary leg contacts should affect pose/support without being required to generate authoritative forward acceleration.
8. How this architecture could later allow cheap physical LOD: ordinary unobstructed runners versus players currently in meaningful contact.
A collision must not be allowed to silently change an already-decided football outcome. Conversely, presentation locomotion authority must not erase a collision response merely because the authoritative trajectory continues forward. Explain explicitly how those two requirements coexist.
Also estimate the computational consequences. Identify which of the current expensive work could eventually be reduced or avoided for an unobstructed supported runner: 240 Hz controller execution, leg IK frequency, 150 Jolt solver iterations, passive-tissue evaluation, full articulated solving, etc. Do not optimize any of them yet.
Do not implement SLP-2 yet. Give me the architecture first, including the exact boundary between authoritative translation and physical displacement, and stop for approval.
Do not resume TD2C/E2, autonomous gait, locomotion polish, tackles, recovery or running development.
