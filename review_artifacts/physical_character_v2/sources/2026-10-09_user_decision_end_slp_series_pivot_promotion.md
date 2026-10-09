# User decision 2026-10-09 (≈02:00, chronicle day 8 Oct) — option 3: end the SLP series; architectural pivot (cheap authoritative locomotion + promotion into V2 physics for meaningful interaction); design the next vertical slice (verbatim)

Received in the Claude Code session, in reply to `slp2/SLP2C_RESULTS.md` (e63be8b). Reproduced verbatim below.

---

Choose option 3. End the SLP series here. Do not perform the swing-feasibility diagnostic and do not implement another SLP-2C amendment.
Preserve SLP-1, SLP-1b, SLP-2 and SLP-2C exactly as failed/diagnostic architectural evidence. Their purpose has been fulfilled.
The architectural conclusion I am adopting is:
Fully physical foot-ground contacts will not be required during ordinary unobstructed locomotion.
SLP-2 validated A, the authoritative whole-body translational mechanism. SLP-2C demonstrated that forcing ordinary locomotion to retain continuously physical foot-ground contacts requires increasingly sophisticated gait/contact control and pulls the project back toward the robotics problem we deliberately chose to leave.
This is not evidence that V2's physical body failed. Record explicitly that no V2 body limit was demonstrated. The failure is the requirement that continuously physical leg contacts remain mechanically neutral while an external authoritative locomotion trajectory drives the character.
Adopt the following production direction conceptually, but do not implement it yet:
Normal unobstructed locomotion
- The football simulation remains authoritative over player position, velocity, acceleration and facing.
- Presentation consumes that authoritative state.
- Running/walking/turning uses authored/procedural skeletal locomotion and terrain/foot IK.
- Feet may use ground queries/placement constraints for visual contact, but ordinary locomotion does not require full rigid-body foot-ground contact forces to generate or resist translation.
- No autonomous physical balance simulation is required.
- A player's ordinary movement therefore does not require the full V2 articulated physics/controller stack every simulation tick.
Meaningful physical interaction
- Preserve V2 as the physical articulated representation used when physical interaction matters.
- A player can be promoted from ordinary locomotion into an interaction/contact state when a meaningful collision, tackle, trip, aerial challenge, fall or similar event requires it.
- The physical interaction must begin from a state consistent with the current authoritative locomotion pose, position, velocity and momentum so there is no visible or physical discontinuity.
- During that interaction, real colliders, masses, joints, contacts and the relevant V2 physical properties may participate.
- The football simulation remains authoritative over gameplay outcome. Physical presentation explains that outcome rather than silently changing it.
- After disruption/recovery, the physical state must be reconciled deterministically back into ordinary locomotion without teleporting visibly.
Preserve A as an architectural finding
Record SLP-2's uniform whole-body authoritative acceleration field as a validated experimental mechanism: it delivered the requested authoritative momentum, applied no torque/state writes and was computationally negligible. Do not automatically make it the final production implementation; retain it as evidence and a possible tool for physical interaction/promotion states.
Preserve B/recoverability as research
Retain the continuous disturbance/recoverability work as a candidate presentation mechanism for stumble/fall severity, but do not make it responsible for ordinary locomotion.
Preserve V2
Do not delete, simplify or rewrite the V2 body as part of this decision. Its body geometry, masses, joints, limits, actuators, contacts, passive properties, validated tests and all evidence remain intact.
Write a PHYSICAL_CHARACTER_ARCHITECTURE_PIVOT.md documenting:
1. what SLP-1/1b/2/2C each tested;
2. what each failure demonstrated;
3. what was actually validated;
4. why this is an architectural pivot rather than a V2 failure;
5. the new separation between ordinary locomotion and interaction physics;
6. which V2 components remain useful;
7. open questions around promotion into physics, collision handling and deterministic recovery;
8. the expected computational advantage of not running full articulated locomotion physics continuously for all 22 players.
Then design, but do not implement, the next vertical slice.
I want the next slice to answer:
Can one normally locomoting player be promoted into meaningful physical interaction and respond plausibly to a football collision without requiring continuously physical locomotion?
Use the slide-tackle/contact scenario previously discussed as the target interaction, but reduce it to the smallest architecture test necessary. Specify:
- pre-contact locomotion representation;
- when/how physical promotion occurs;
- pose/velocity initialization;
- attacker and victim collision representation;
- which V2 components activate;
- authoritative simulation/presentation boundary;
- how collision response remains visible;
- stumble/fall/recovery states;
- how and when the character returns to cheap locomotion;
- deterministic/reproducibility requirements;
- animation ON/OFF outcome-neutrality requirements;
- proposed CPU measurements;
- pass/fail criteria.
Do not implement the slide tackle yet. Do not begin another gait experiment. Do not resume TD2C/E2.
Stop after giving me the pivot
