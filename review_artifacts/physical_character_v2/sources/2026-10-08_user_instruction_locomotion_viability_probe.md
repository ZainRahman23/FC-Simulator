# User instruction 2026-10-08 — downstream locomotion viability probe (verbatim)

Received in the Claude Code session of 8 Oct 2026, after the TD2C result (`e2/TD2C_RESULTS.md`). Reproduced verbatim below.

---

Before spending another long cycle closing the current E2/TD2C qualification blockers, run a small, diagnostic-only downstream locomotion viability probe of V2.
The purpose is not to certify E2, walking, running, E3, or any future stage. The purpose is to find out now whether the current V2 physical-character architecture appears capable of scaling from one step to repeated locomotion, before we spend many more hours perfecting isolated first-step edge cases.
Preserve every current official verdict. Do not modify frozen criteria, adopt unfinished mechanisms, or use these results to retroactively justify changes to E2.
Core rule
Use the most advanced currently legitimate V2 configuration and existing mechanisms.
You may compose existing primitives into repeated steps for this diagnostic, even where the official qualification sequence has not yet reached them.
Do not add mechanisms just to make the probe succeed.
No:
- teleportation;
- kinematic foot placement;
- hidden upright forces;
- artificial balance constraints;
- increased actuator capacities;
- outcome-dependent corrections;
- special stabilisation unavailable to the existing controller;
- animation/presentation intervention;
- tuning against these probe results.
Physics remains authoritative.
If something required for walking simply does not exist yet, identify it explicitly rather than quietly approximating it.
Keep this SMALL
Do not run thousands of cases.
I want rapid architectural information.
Start with only 4 representative bodies:
- V2-REF / nominal;
- a light/short representative;
- a heavy/tall representative;
- one body that has historically exposed difficult locomotion/control behaviour.
Use one deterministic nominal condition initially, at 240 Hz only.
Do not immediately multiply this across perturbations, physics rates or large parameter matrices.
Initial budget should be roughly tens of runs, not hundreds or thousands.
Expand a particular probe only if its first result is ambiguous.
Probe 1 — Can step 1 feed step 2?
Attempt:
- left → right;
- right → left.
The critical question is:
Is the physical state produced by the first step a viable initial state for an opposite-leg second step?
Do not reset the character between steps except through mechanisms that real continuous locomotion would legitimately use.
Record whether the second foot:
- unloads;
- lifts physically;
- clears;
- reaches an appropriate foothold;
- touches down;
- accepts load;
- becomes stable support.
If virtually every case catastrophically fails before completing step 2 for the same architectural reason, stop and diagnose that rather than proceeding blindly.
Probe 2 — Short alternating walking
Where two-step transfer works, attempt approximately:
L → R → L → R → L → R
or the mirrored sequence.
Target 6 physical steps.
Record the exact number completed before substantive failure.
Do not require eventual walking-quality criteria. We are looking for whether the system can repeatedly transition support without diverging.
Probe 3 — Longer chaining
Only for cases that survive the six-step probe, attempt 20 alternating steps.
Stop a run immediately at the first substantive physical/control failure rather than continuing a meaningless collapsed simulation.
Probe 4 — Higher cadence stress test
Only where ordinary chaining demonstrates some viability, progressively shorten timing toward a crude fast-walk/jog regime.
This is not a running implementation and not a running qualification.
Its purpose is to expose whether V2 encounters a fundamentally different architectural failure as:
- double-support time decreases;
- swing speed increases;
- touchdown velocity increases;
- load transfer accelerates;
- flight or near-flight conditions begin to appear.
Do not build missing running mechanisms merely to pass this.
What to measure
For every run, record at minimum:
- completed physical steps;
- support leg/state;
- COM and DCM behaviour;
- CoP/support relationship;
- pelvis position/orientation and accumulated drift;
- commanded and actual foothold;
- swing-foot tracking;
- physical liftoff;
- clearance;
- touchdown position and velocity;
- load acceptance;
- old-stance-foot behaviour;
- slip;
- joint limits;
- actuator saturation;
- torque discontinuities;
- unexplained energy;
- whether state error grows from one step to the next;
- exact first causal failure.
Failure classification
Every first failure must be classified as one of:
A — Missing future functionality
The architecture has not yet implemented something obviously required for continuous gait, such as continuous foothold planning or an appropriate recovery policy.
Do not interpret this alone as evidence V2 is bad.
B — Local V2 controller/transition deficiency
Existing architecture appears fundamentally usable, but some controller, touchdown, transfer, servo, lifecycle or planning behaviour needs further work.
C — Potential fundamental V2 limitation
Repeated locomotion exposes a structural problem in the body/contact/control architecture that cannot obviously be solved by adding the expected walking components.
These are the findings I care most about.
Important distinction
Do not judge this experiment by whether the current character satisfies future walking criteria.
Judge:
Does each step leave the physical system in a state from which another plausible step can be initiated?
A character that walks six ugly but genuinely physical steps is much more encouraging architecturally than a beautifully qualified isolated step that cannot transition into another one.
Results I want
Give me a compact matrix for each body showing:
| Body | Step 1 | Step 2 | 6 steps | 20 steps | faster cadence | first failure |
Then summarize:
- % completing 1 step;
- % completing 2;
- % reaching 4;
- % reaching 6;
- % reaching 10;
- % reaching 20;
- median consecutive steps;
- maximum consecutive steps;
- whether failures accumulate gradually or occur catastrophically;
- whether the same failure dominates across bodies;
- whether failures are primarily A, B or C;
- what minimum missing mechanisms appear necessary for sustained walking;
- what the higher-cadence probe exposes.
Most importantly give me an evidence-based architectural verdict:
GREEN — V2 appears fundamentally capable of repeated locomotion.
YELLOW — V2 appears salvageable, but repeated stepping exposes significant controller/design work.
RED — evidence suggests a structural limitation serious enough that V3 should be considered before continuing extensive qualification.
Explain exactly why.
Stop rules
This is deliberately a cheap probe.
If the same fundamental failure prevents step 2 across essentially every representative body, stop early. Don't spend hours generating more evidence of the same thing.
Conversely, if the characters comfortably reach 20 steps, don't turn this into a giant walking validation battery. We already learned what we needed.
Time-box implementation + runs + diagnosis. Do not allow this to become another multi-thousand-run qualification project.
Do not fix failures discovered by this probe unless a trivial harness bug prevents the experiment from measuring what it is supposed to measure.
Do not alter production/controller behaviour in response to the results.
Commit the diagnostic harness/results separately so they cannot be confused with qualified V2 behaviour.
At the end stop for my review before resuming the TD2C/E2 qualification path.
