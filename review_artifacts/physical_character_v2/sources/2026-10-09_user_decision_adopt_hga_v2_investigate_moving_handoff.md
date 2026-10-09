# User decision 2026-10-09 (≈19:40 BST) — adopt HG-A v2; read-only investigation of the remaining moving-runner handoff problem (vertical/angular/internal inheritance, PR-2, long-lead drift, presentation discontinuity sources); no PI-1 qualifying runs, no animation repair (verbatim)

Received in the Claude Code session, in reply to `pi1/hga/HGA_INVESTIGATION.md` (09d67d9). Reproduced verbatim below.

---

Adopt HG-A v2 as the replacement for HG-A. Then investigate the remaining moving-runner handoff problem read-only before proposing or implementing any animation repair. Do not start PI-1 qualifying runs yet.
1. Adopt HG-A v2
I approve the proposed HG-A v2 definition:
- total promoted-body horizontal linear momentum must equal total mass × authoritative horizontal velocity;
- achieve this with the single uniform velocity shift described in the investigation;
- preserve all relative segment velocities;
- preserve whole-body angular momentum;
- do not alter pose or position;
- retain the already-derived ≤0.18 m/s shift tolerance;
- do not fit that tolerance to the fixtures.
Version the criterion and record why HG-A v1 was replaced.
This is a correction of what the handoff should conserve, not a relaxation intended to make PI-1 pass.
2. Do not adopt the presentation's vertical or angular motion blindly
The investigation found additional unbounded imports:
- vertical COM velocity up to ~10 m/s;
- non-conserved frame-to-frame angular momentum;
- pelvis-height jumps up to 72 mm/frame;
- worst-joint jumps of 8–199 mm/frame;
- physically implausible no-contact implied forces/torques.
Do not invent thresholds or fixes yet.
Determine what a physically correct promotion should inherit for:
A. horizontal translation — now HG-A v2;
B. vertical translation;
C. whole-body angular momentum;
D. internal joint/segment velocities.
For B–D, derive the correct conservation/continuity requirement from the architecture rather than copying the presentation blindly.
In particular distinguish:
- genuine gait-relative motion;
- interpolation/IK discontinuities;
- root/pelvis motion;
- and numerical differentiation noise.
3. Investigate PR-2
PR-2 currently appears to require the physical/presentation state to remain within 3 mm of the previous presented frame.
Trace exactly why PR-2 exists and what it was intended to prevent.
Determine whether comparing a newly promoted physical body against the last discrete presentation frame is correct when the presentation itself moves 8–199 mm/frame at some joints.
Do not simply increase the 3 mm tolerance.
Determine what the continuity test should actually compare:
- physical state against an interpolated presentation state at the exact promotion time;
- physical state against the current rendered pose;
- predicted next presentation state;
- or another principled reference.
The requirement remains: no visible pop at promotion.
4. Investigate the long-lead drift
This is the main requested diagnostic.
Using the HG-A-v2 initialization, promote the moving runner at multiple lead times before contact, but do not perform the tackle.
At minimum sample:
- ~1 tick;
- ~2;
- ~4;
- ~8;
- ~12;
- and the longest currently relevant predictive lead.
Then let the physical body evolve with the exact currently proposed PI-1 physical configuration.
Measure over time:
- root/pelvis displacement from authoritative trajectory;
- COM displacement;
- forward/lateral/vertical velocity error;
- facing/orientation error;
- foot contact timing;
- stance/swing phase;
- foot slip;
- support state;
- joint-limit margins;
- angular momentum;
- energy;
- and pose divergence.
Identify why the promoted body stops behaving like a runner.
Separate the causes into:
A. missing locomotion functionality;
B. physical/controller defect;
C. V2 body limitation;
D. presentation initialization artifact.
Do not repair anything during this investigation.
5. Answer the key production question
We do not necessarily need a promoted player to free-run physically for a long time.
PI-1 predicts an interaction and promotes shortly before it.
Therefore determine:
What is the maximum lead time over which the promoted body remains acceptably continuous and physically coherent before contact?
Compare that against the actual predictive lead required by the slide-tackle cases.
If a clean physical interval of, for example, only a few simulation ticks is sufficient to cover prediction → contact, that may be acceptable. Do not impose a requirement that the promoted body independently reproduce arbitrary-duration running unless PI-1 actually needs it.
Conversely, do not shorten the prediction window merely to hide a genuine handoff failure.
6. Revisit the presentation source separately
Diagnose the frame-to-frame presentation discontinuities by source:
- authored base motion;
- interpolation;
- root motion;
- plant IK;
- foot correction;
- skeleton mapping;
- finite-difference velocity extraction;
- or another component.
I am open to a separate presentation-quality correction later if the animation really contains discontinuities.
But do not smooth or modify it yet.
If you eventually recommend a presentation fix, it must improve the animation generally, not be tuned to PI-1 promotion windows or tackle fixtures.
7. Keep all existing blockers separate
Do not lose or merge:
- boot vs gameplay-foot correspondence;
- simulation slider stop;
- still-extending slide leg;
- standing-pose foot correction;
- rx_free_leg angular momentum;
- rigid-foot toe pivot;
- stand-in articulation limitations.
HG-A v2 does not resolve those.
8. End with a decision table
Give me:
| issue | actual cause | architecture/presentation/V2/test issue | must fix for PI-1? | smallest principled fix |
Then answer these specifically:
1. Is HG-A v2 now sound?
2. What should promotion inherit vertically?
3. What should it inherit angularly?
4. Is PR-2 testing the correct thing?
5. Why does the promoted runner drift at longer leads?
6. How long can it currently remain physical before contact without becoming invalid?
7. Is that interval sufficient for PI-1's real predictive lead?
8. Does any result now indicate a genuine V2 body limitation?
9. What is the single smallest next change you recommend?
Do not implement that change.
Stop for my decision.
