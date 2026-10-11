# User instruction, 2026-10-11 03:38 BST (verbatim)

---

We have completed IFM-1. The slow-motion review has now been human-reviewed sufficiently to proceed. The toe-pad/native-contact result is particularly encouraging because continued native contact visibly/mechanically matters.
I want the next milestone to be our first genuine player-v-player physical interaction.
Do not build it yet. First design and preregister the smallest rigorous experiment. Stop for my approval before implementation.
Goal: demonstrate, visually and mechanically, that two footballers can enter a real simulation-authoritative interaction, make native V2 physical contact, and produce a coherent articulated response without changing the simulation's decision.
Prefer one strong but recoverable tackle/contact case as the primary experiment—not a large fixture matrix. I specifically want something with meaningful leg/body contact and continued contact over multiple physics steps, because IFM-1 TP/PL suggest this is where native physics is most informative.
Both participants should be represented by appropriate physical bodies during the interaction. Do not use a diagnostic sphere, fixed obstacle or unpushable stand-in as the actual experiment.
Preserve Touchline's foundational rule:
simulation decides what happens; physics/presentation explains what happened.
Therefore the authoritative simulation must determine the interaction, contact timing/region as appropriate, and outcome class. Physics must not turn a simulation recovery into a fall, turn a miss into a hit, invent a tackle, or write a different gameplay result back into the simulation.
Use the frozen Locomotion V2 straight-line baseline / RUN-1 state contract as the locomotion source. Do not modify the frozen locomotion baseline. Use its exact state interface rather than reconstructing motion from rendered frames.
Design the experiment so that we can observe, at minimum:
1. both players immediately before physical activation;
2. seamless activation into their physical bodies;
3. first native body-to-body contact;
4. the first ~50 ms of response;
5. continued native contact where the geometry naturally requires it;
6. propagation of the disturbance from the struck body part through the connected body;
7. response of the tackler to the equal/opposite interaction;
8. planted/support-foot behaviour;
9. COM, linear momentum and angular momentum evolution for both players;
10. whether the tackled player remains mechanically consistent with the authoritative recoverable outcome.
The visual review must ultimately include the actual Touchline gameplay camera plus a synchronized 4–8× slow-motion diagnostic crop. I want to be able to see both players, the actual contact, and how the reaction propagates through them.
Do not amplify impulses or reactions for visibility. Do not add a canned stumble/recovery. Do not tune physics toward the expected result. If the authentic simulation-authoritative interaction is visually subtle, report that honestly.
Before implementing anything, inspect the existing benchmark/contact records and recommend the single best existing case for this experiment. Prefer a case whose authoritative outcome is recoverable/stumble rather than fall and whose geometry gives us meaningful sustained player-player contact.
Also determine whether our current V2 body/handoff limitations make a two-full-body test premature. In particular, distinguish:
- genuine V2 body limitations;
- RUN-1→V2 mapping/handoff limitations;
- rigid-foot/toe limitations;
- collision-geometry mismatch with the authoritative simulation;
- controller/support limitations after activation.
Do not silently waive existing failures.
Produce a concise preregistration with:
- exact source fixture and why it was chosen;
- authoritative simulation facts that are frozen;
- activation timing for both players;
- physical bodies/configuration used;
- what physics is and is not allowed to determine;
- contact and integrity requirements;
- outcome-consistency criteria;
- determinism/neutrality requirements;
- visual review protocol;
- CPU measurement;
- explicit hard-stop conditions;
- what would constitute success, partial success and architectural failure.
Most importantly, identify what this experiment would actually prove if it passes. Do not overclaim that it proves general tackling, falls, recovery, or production readiness.
Do the research/design work needed to make the experiment rigorous, commit the preregistration/evidence locally, change no frozen production systems, and stop for my review before implementing or running the player-v-player experiment.
