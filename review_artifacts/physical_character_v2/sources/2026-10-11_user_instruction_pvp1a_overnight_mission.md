# User instruction, 2026-10-11 04:24 BST (verbatim)

**Recorded on receipt (not part of the user's text):** this instruction refers to "my approval of PVP-1A: standing recoverable player-v-player contact and the architecture amendment in my previous instruction" and asks that it be incorporated. **No such approval or amendment message was received in this session.** The previous user message was the PVP-1 design request (17fa068f), answered with the draft preregistration (34a50865). Searched `sources/`, every commit, `~/Downloads`, `~/Desktop` and `~/Documents`; nothing was found. This instruction is therefore taken as the operative approval of PVP-1A. PVP-1A is the drafted standing-runner experiment on IB1-SR, with the authoritative facts this message freezes and with drafted decisions D1–D5. No provision of the unseen amendment could be incorporated.

---

OVERNIGHT PVP-1A MISSION — work autonomously for an extended session and maximize useful evidence, not the probability of a PASS.
Proceed from my approval of PVP-1A: standing recoverable player-v-player contact and the architecture amendment in my previous instruction.
I will be away. You may work autonomously for as long as useful. Do not stop merely because an intermediate result is disappointing. Investigate failures deeply, produce reproducible evidence, and leave me with the clearest possible answer when I return.
However, do not tune the experiment toward its expected STUMBLE outcome, waive frozen criteria, or change authoritative simulation facts after observing results. A rigorous failure is more valuable than a manufactured success.
1. Freeze before observing PVP-1A
First incorporate my previous approval/amendment into the preregistration and commit it before running the contact.
The authoritative IB1-SR facts remain frozen:
- standing 73 kg runner;
- 78 kg sliding tackler;
- planted-shin decisive contact;
- authoritative simulation outcome = STUMBLE / recoverable;
- simulation remains authoritative;
- physics/presentation explains the result and writes nothing back.
The simulation's recoverable/fall law may be applied to the physical trajectory only as an offline evaluator. It must not influence the physical run.
Freeze all remaining numerical criteria, evaluation windows, repeat counts, control definitions and hard stops before seeing the result.
2. Run PVP-1A rigorously
Build the minimum two-character V2 environment required by the preregistration.
Run the no-contact control and native player-player contact according to the frozen design. Both footballers must be real physical bodies; do not substitute an unpushable tackler, diagnostic sphere or scripted reaction.
Capture the complete causal ledger:
- activation state of both players;
- every native contact pair;
- contact point and normal;
- normal/tangential impulses per substep;
- equal-and-opposite momentum exchange;
- body-part linear/angular velocities;
- joint states;
- support/ground contacts;
- COM, total linear momentum and angular momentum of each body and the two-player system;
- controller/support work;
- solver/integrity data;
- exact time at which native contact begins/ends;
- authoritative recorded contact for comparison.
Explicitly determine whether the tackler is physically affected by striking the runner. This is a central difference from the old stand-in experiments.
3. Follow the response beyond the first 50 ms
IFM-1 established that very short physical responses can be coherent but visually subtle. PVP-1A should establish what happens when two physical footballers sustain meaningful native contact.
Therefore preserve the preregistered primary window, but also record a clearly labelled diagnostic continuation long enough to understand the response development.
Do not silently treat later invalid states as valid evidence. Mark exactly where each body/criterion ceases to be trustworthy.
Determine whether the initial disturbance:
- starts locally at the planted shin;
- propagates through knee/thigh/pelvis/torso;
- changes the support state plausibly;
- creates appropriate reaction in the tackler;
- produces rotation/translation consistent with the contact;
- remains articulated rather than becoming ragdoll noise;
- tends toward recovery, stumble, collapse, or some other state.
Compare this with the frozen authoritative STUMBLE/recoverable outcome without forcing agreement.
4. Produce strong visual evidence
Make the result easy for me to judge when I wake up.
Produce synchronized visualizations from the actual recorded states:
A. Gameplay view
- actual frozen Touchline camera;
- normal speed;
- both players visible;
- clean presentation with no debug clutter.
B. Slow-motion close view
- approximately 6× gameplay-camera crop;
- same camera projection;
- 0.25× and/or 0.1× playback;
- both players visible throughout contact.
C. Diagnostic slow motion
- same recorded frames;
- skeletons/colliders;
- contact point and normal;
- impulse;
- COM;
- planted/support contacts;
- useful momentum indicators.
D. Synchronized control comparison
- NO CONTACT and NATIVE PVP CONTACT side-by-side;
- identical starting state/time/camera;
- frame stepping and scrubbing;
- clear contact-time marker.
Do not interpolate new physical states, exaggerate displacement, alter camera perspective to make the response dramatic, or add authored reaction animation.
Provide one simple localhost review page from which I can watch everything.
5. If PVP-1A fails, investigate — don't immediately redesign
A failed criterion is the beginning of diagnosis, not permission to tune.
For every failure, classify the cause as precisely as possible:
- V2 anatomy/body model;
- mapping/initialization;
- collision geometry;
- rigid foot/toe;
- solver;
- ground contact;
- controller/support;
- tackler reconstruction;
- authoritative-record mismatch;
- evaluation/harness bug;
- or genuinely unknown.
Use read-only counterfactuals, instrumentation and isolated diagnostic runs where useful.
Do not change PVP-1A and rerun it as though it were still the preregistered experiment.
If you discover a measurement/harness bug, preserve the original result, document the bug, correct the tooling separately, and clearly distinguish the corrected evaluation from the original frozen run.
If you identify a plausible fix to the physical architecture, investigate it read-only or on an explicitly separate experimental branch/spec. Do not silently adopt it into PVP-1A.
6. If PVP-1A passes
Do not stop immediately after printing PASS.
Stress-check the claim without changing the frozen experiment:
- deterministic repeats;
- small preregistered-style numerical perturbations if scientifically appropriate, explicitly labelled as post-hoc robustness tests;
- contact/momentum conservation;
- control neutrality;
- sensitivity to timestep/solver only as diagnostics, not as tuning;
- CPU cost;
- replay reproducibility.
Verify that the visual response genuinely comes from native contact rather than controllers or initialization artefacts.
Then stop before beginning PVP-1B.
7. If PVP-1A fails, use the remaining time productively
Once the root cause is understood as far as reasonably possible, perform read-only/design work for the smallest principled next step.
In particular, determine whether the failure tells us anything relevant to:
- the eventual moving RUN-1 PVP test;
- planted-leg FALL interactions;
- recovery after physical contact;
- V2's rigid foot;
- controller/balance requirements.
You may design and preregister a proposed PVP-1A revision or successor experiment, but do not implement an outcome-informed replacement and call it PVP-1A.
Do not start PVP-1B, change RUN-1, change the authoritative simulation, or build production integration without my approval.
8. Preserve architecture
Throughout the overnight work:
Simulation decides what happens. Physics visually/mechanically explains what happened.
No presentation RNG.
No outcome switches.
No hidden impulses.
No physics-to-gameplay writeback.
No changing simulation results to agree with physics.
No tuning against the known STUMBLE label.
No canned stumble/fall/recovery.
Keep randomness deterministic and auditable.
Do not modify the frozen Locomotion V2 straight-line baseline.
9. Leave me a useful morning package
Commit all legitimate work locally with clear commits. Follow the project's existing daily publication/chronicle rules when they become due; do not rewrite history or force-push.
When finished, leave a concise PVP-1A MORNING REPORT containing:
1. PASS / PARTIAL / FAIL / BLOCKED;
2. what actually happened physically;
3. what happened visually;
4. whether both players genuinely reacted to one another;
5. whether contact propagated through the runner plausibly;
6. whether sustained native contact mattered;
7. whether the physical trajectory is consistent with authoritative STUMBLE/recoverable;
8. what caused every important failure;
9. what this experiment now proves;
10. what it explicitly does not prove;
11. CPU/performance;
12. determinism/neutrality status;
13. exact commits/files;
14. exact localhost URL and instructions for the visual review;
15. your recommended next action and why.
Include a short section called “What surprised me” for findings that materially change our understanding of the architecture.
Prioritize evidence and causal understanding over volume of work. If continued experimentation stops producing new information, stop rather than searching parameter space until something passes.
You have permission to work autonomously through the investigation, diagnostics, visual evidence, robustness checks and successor-design work described above. You do not have permission to change frozen authoritative systems or turn an observed failure into an outcome-tuned success.
