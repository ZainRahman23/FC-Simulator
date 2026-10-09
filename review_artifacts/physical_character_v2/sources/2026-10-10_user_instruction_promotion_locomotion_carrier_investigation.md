# User instruction 2026-10-10 (≈00:04 BST) — read-only architecture investigation of a minimal promotion locomotion carrier (the promoted V2 body has no locomotion → 1–6 tick coherence); compare a whole-body uniform field (SLP-2 A), a finite root/COM servo, capped velocity/acceleration tracking and any smaller alternative; evaluate reuse of the SLP-2 A field; propose the smallest vertical slice (3 m/s runner: near miss, recoverable swing-leg clip, planted-leg fall); preserve LC-1 exactly; no implementation before approval (verbatim)

Received in the Claude Code session, in reply to `locomotion_continuity/LC1_RESULTS.md` (19ff19d). Reproduced verbatim below.

---

Do not execute the text currently in the input box. Do not fix the three LC-1 defects yet and do not begin another LC revision.
The latest result changes the architectural question. Preserve LC-1, its evidence, defects, replay, and all current results exactly as they are.
I want you to investigate the smallest principled solution to the finding that an unobstructed promoted runner remains coherent for only ~1–6 ticks because the promoted V2 body has no locomotion.
Our production architecture is now explicitly:
simulation-authoritative locomotion normally; presentation/animation explains it; full articulated V2 physics is activated only around meaningful interactions.
Therefore I do not require the presentation animation itself to become a physically simulated gait, and I do not want to restart autonomous V2 walking/balance work.
Investigate a minimal promotion locomotion carrier whose sole job is to allow the already-promoted articulated body to continue following the simulation-authoritative player trajectory during the short pre-contact/contact interval, while leaving the body genuinely physical and displaceable by collision.
Requirements:
- simulation trajectory remains authoritative for ordinary locomotion;
- no kinematic teleporting or per-tick pose/state overwrite;
- no autonomous balance controller;
- no return to CF-1…CF-6 walking architecture;
- V2 joints, masses, colliders, contacts, friction, hard limits and actuator limits remain real;
- collision impulses must remain physically visible and must not be cancelled by the locomotion carrier;
- the carrier must not silently force a predetermined tackle outcome;
- once collision displacement exceeds the existing recovery authority, the body must still be able to stumble/fall naturally;
- presentation ON/OFF must remain gameplay-neutral;
- deterministic/reproducible;
- browser/mobile cost remains a primary constraint.
First perform a read-only architecture investigation. Do not implement yet.
Compare at least:
1. whole-body uniform locomotion force/acceleration like the previously validated SLP-2 A field;
2. a finite root/COM trajectory servo;
3. velocity/acceleration tracking with authority capped below meaningful collision impulses;
4. any smaller alternative you find in the existing code/history.
For each, tell me:
- exactly what state it reads;
- exactly what forces/torques it applies and where;
- whether it can erase or oppose collision momentum;
- whether legs still need to physically propel the player;
- how it interacts with B/recovery authority;
- how promotion and demotion would work;
- expected CPU cost;
- deterministic implications;
- whether it preserves simulation-authoritative outcomes;
- what happens during a planted-leg sweep versus a glancing swing-leg hit.
Also explicitly evaluate whether the previously validated SLP-2 A field already gives us most of what we need. It delivered authoritative momentum with negligible cost and no state writes; determine whether it can be reused or adapted rather than inventing another locomotion system.
Then propose the smallest vertical slice that can answer one question:
Can a runner moving at 3 m/s be promoted several ticks before a slide tackle, continue locomoting coherently without contact, then receive a real physical leg collision whose effect is not erased by the locomotion carrier?
Use one near-miss, one recoverable swing-leg clip and one planted-leg fall case. Do not expand beyond those three cases.
Do not change LC-1, V1.3, V2, Jolt settings, collision geometry, PI-1 criteria, or gameplay outcomes during this investigation. Do not implement until you present the architecture and I approve it.
