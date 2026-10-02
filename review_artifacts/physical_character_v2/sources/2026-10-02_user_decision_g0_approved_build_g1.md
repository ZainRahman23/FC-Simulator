<!-- preserved verbatim: the user's G0 visual approval and the V2-G1 (passive physics) brief, 2026-10-02. -->

V2-G0 is visually approved. Proceed to V2-G1 — passive physics only.
The G0 reference body, semantic skeleton, physics topology, realistic rigid foot, head capsule, anthropometry and physics/render mapping are approved as currently committed.
Do not make aesthetic changes based on the debug-collider appearance.
Do not modify G0 anatomy unless G1 exposes a demonstrable physical construction defect.
V1 remains frozen.
G1 OBJECTIVE
Validate that the V2 physical humanoid behaves as a mechanically sane passive articulated body under Jolt physics.
No active balance.
No standing controller.
No stepping.
No locomotion.
No hidden support.
No root stabilization.
No motor effort intended to maintain posture.
This gate asks:
Does the body itself have valid passive physics before we ask a controller to control it?

1. PASSIVE DROP / FALL TESTS
Build deterministic scenarios from several initial conditions:
- quiet upright release;
- small forward lean;
- small backward lean;
- small lateral lean left/right;
- modest initial angular perturbation;
- raised-foot/single-support release where useful;
- low-height horizontal/fall configuration if useful for impact testing.
Let gravity and physical contact determine the outcome.
Do not script how the body should fall.
2. JOINT LIMIT VALIDATION UNDER LOAD
During every fall measure every joint axis continuously.
Verify:
- hard limits are never materially violated;
- soft-limit/passive resistance behaves as specified;
- no constraint explosions;
- no NaNs;
- no axis flips;
- no joint-frame discontinuities;
- no anatomically impossible wrapping;
- no persistent high-frequency limit chatter.
Record maximum margin/penetration for every joint axis.
Stress specifically:
- knee flexion/axial rotation;
- ankle;
- hip;
- lumbar/spine;
- shoulder;
- elbow;
- neck/head relationship.
3. CONTACT VALIDATION
Verify:
- feet contact the turf where their geometry says they should;
- no invisible support exists;
- body colliders contact appropriately during falls;
- intended self-collision exclusions work;
- intended non-adjacent self-collisions occur;
- no catastrophic self-collision explosions;
- no tunnelling at expected football-scale velocities;
- contact geometry corresponds to the G0 debug geometry.
Record contact participants and penetration depths.
4. CONSERVATION / ACCOUNTING
In appropriate isolated tests, instrument:
- linear momentum;
- angular momentum;
- kinetic energy;
- gravitational potential energy;
- contact/damping losses;
- joint/passive work where measurable.
Do not demand energy conservation across dissipative impacts.
Instead establish that changes are explainable by:
- gravity;
- contact;
- specified damping;
- passive joint torques.
There must be no unexplained propulsion or support.
5. PASSIVE JOINT BEHAVIOUR
Test the passive mechanics independently where practical.
For representative joints:
- displace from neutral;
- release;
- observe response;
- compare sign/magnitude with specification.
Verify that passive torques resist the intended anatomical direction and never accidentally inject sustained energy.
6. BODY VARIANTS
Run the essential passive tests on:
- V2-REF;
- at least one shorter/lighter population body;
- one taller/heavier population body;
- long-leg morphology variant;
- short-leg morphology variant.
Do not tune per body.
The parameterized generator must produce mechanically valid bodies across the tested range.
7. DETERMINISM
Every G1 scenario must be deterministic.
Repeat runs at least three times where appropriate.
Compare:
- final state;
- contact sequence;
- joint extrema;
- fall timing;
- hashes.
Node and browser should agree where the same simulation path is supported.
If tiny floating-point differences prevent literal cross-runtime state hashes, characterize them rather than hiding them.
8. TIMESTEP / SOLVER SENSITIVITY
Run a bounded sensitivity check around the intended production physics rate.
The purpose is not to force bit-identical trajectories across different rates.
Determine whether:
- joint constraints remain stable;
- contact remains sane;
- qualitative fall behaviour remains physically consistent;
- integrated quantities converge reasonably;
- no design only works at one accidental solver configuration.
Do not tune anatomy separately for each rate.
9. PERFORMANCE
Measure passive V2 physics cost per player.
Separate where possible:
- rigid-body/contact cost;
- constraints;
- instrumentation/review overhead.
Compare with the equivalent V1 passive body if an information-matched comparison is easy.
This is diagnostic only; do not redesign V2 merely to optimize G1.
10. REVIEW HARNESS
Extend the V2 viewer with a G1 passive-physics mode.
I want:
- play/pause;
- restart;
- slow motion;
- frame stepping;
- front/side/3/4/follow cameras;
- physical bodies;
- semantic skeleton;
- colliders;
- joint centres;
- joint axes;
- joint limits;
- ground contacts;
- contact normals;
- penetration;
- total COM;
- segment COMs;
- linear/angular velocity where useful.
Provide a small curated set of the most informative passive scenarios rather than dozens of nearly identical tests.
11. DO NOT IMPORT V1 CONTROLLERS
G1 must remain passive.
Do not port:
- C1 balance;
- posture control;
- C3 stepping;
- gait planning;
- Physical Stepper;
- protective fall control.
Those come later, if earned.
A passive body falling over is success, not failure.
12. DEFECT POLICY
If G1 reveals a genuine G0 construction defect—for example:
- incorrect joint axis;
- collider overlap;
- wrong inertia;
- wrong constraint frame;
- invalid passive torque direction;
diagnose it and demonstrate the cause.
You may fix an unambiguous implementation defect and rerun G0 + G1.
If the evidence instead suggests changing an approved anatomical/specification value, stop for my decision before doing so.
Do not tune parameters merely to make a fall look nicer.
G1 PASS CONDITIONS
Define exact numerical tolerances before running the final gate.
At minimum G1 should establish:
- stable finite simulation;
- valid joint constraints;
- physically explainable falls;
- sane ground/body contacts;
- no hidden forces;
- no unexplained energy injection;
- acceptable penetration;
- deterministic replay;
- mechanical validity across selected body variants;
- acceptable timestep sensitivity.
STOP
Once G1 passes:
STOP FOR MY REVIEW.
Do not start G2 active standing.
Commit G1 locally.
Do not push.
Leave the review server running.
Report:
1. G1 pass/fail;
2. scenarios;
3. joint-limit extrema;
4. contact/penetration results;
5. energy/momentum accounting;
6. passive-joint validation;
7. variant results;
8. determinism;
9. timestep sensitivity;
10. performance;
11. any G0 defects discovered/fixed;
12. commit;
13. review URL.
Provide the smallest useful visual review set.
Do not proceed to G2.
