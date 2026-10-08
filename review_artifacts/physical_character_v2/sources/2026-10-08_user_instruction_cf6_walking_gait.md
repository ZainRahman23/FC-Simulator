# User instruction 2026-10-08 — CF-6 walking-gait counterfactual: V2 body with a walking controller (verbatim)

Received in the Claude Code session of 8 Oct 2026, after the CF-5 speed ladder and the CF-5 replay viewer. Reproduced verbatim below.

---

Before returning to TD2C/E2 qualification, run one final bounded locomotion counterfactual aimed at answering the architectural question exposed by the CF-5 visualisation.

I watched the authoritative CF-5 replay. The important result is that V2 is physically stable and genuinely stepping continuously, but the motion is still clearly a slow stepping controller rather than a real human walking gait. I want to determine whether that is because V2's underlying physical character is inadequate, or simply because the gait-level mechanisms required for walking do not yet exist.

This is DIAGNOSTIC/COUNTERFACTUAL ONLY. Do not adopt anything into production, TD2C/E2, or the validated V2 configuration. Do not weaken existing physics, actuator, contact, energy, stability, torque, slip, joint-limit or determinism criteria merely to make the experiment pass.

Call this CF-6.

GOAL

Construct the smallest principled walking-specific layer needed to test whether the existing V2 body/controller/physics can produce a recognisable dynamic walk.

Do NOT tune for visual attractiveness. Do NOT use animation to fake walking. Simulation remains authoritative.

The counterfactual may add only gait-level mechanisms that the CF-3/4/5 evidence has already shown are missing:

1. WALKING-AWARE CAPTURE / FOOTHOLD PLANNING
- Replace the stop-step assumption with a walking-aware capture/foothold rule.
- The planner must be allowed to choose a foothold that is dynamically appropriate for continued forward locomotion rather than requiring that the character could stop on every individual step.
- Add an explicit walking-direction/heading frame and stance-width regulation so the previous toe-out/narrowing accumulation cannot simply continue indefinitely.
- Derive choices from the current physical state/capture dynamics; do not hard-code a sequence of foot positions.

2. EXPLICIT UNLOADING / PUSH-OFF
- The trailing foot must be unloaded deliberately as part of the gait plan rather than waiting for the old <1% residual-load release condition.
- Permit physically justified push-off if necessary for forward walking.
- It must remain subject to existing actuator, torque, energy, contact and friction limits.
- Do not inject velocity or momentum directly.

3. WALKING SWING-LEG TRAJECTORY
- Replace the stop-step swing behaviour with the minimum walking-specific swing required for locomotion.
- It should permit a natural trailing-foot departure/toe-off, knee flexion/foot clearance during swing, and a landing configuration appropriate for continued walking.
- If heel/toe progression can emerge using the existing foot/contact representation, allow it.
- Do not add cosmetic animation. Any visible motion must come from the simulated physical state.
- Do not add new anatomy unless the existing model literally cannot express the required motion; if that occurs, stop and report it as potential V3 evidence instead.

PRESERVE

Keep the underlying V2:
- body morphology;
- mass/inertia;
- joints and hard physical limits;
- actuators and capacities;
- contact model;
- friction;
- physics integration;
- energy accounting;
- balance/controller foundations;
- validated servo corrections;
- DVG;
- all previously established physical invariants.

The point is to test V2 with a walking controller, NOT quietly turn it into V3.

PREREGISTER FIRST

Before implementing CF-6:
- write the exact mechanisms being added;
- identify every parameter and where it came from;
- state which existing V2 mechanisms remain unchanged;
- define pass/fail criteria;
- save my instruction verbatim;
- commit/freeze the diagnostic design before running the decisive tests.

If an important numerical value cannot be derived from Touchline's existing validated evidence, established biomechanics/control literature, or a clearly stated physical constraint, do not guess. Stop and tell me exactly what needs research. We have research tools available and I can obtain targeted external research for you.

TEST LADDER

Keep this relatively small. This is architectural reconnaissance, not qualification.

Use at least:
- V2-REF;
- light/short;
- heavy/tall;
- long-legs;
- both starting legs where useful.

Start with approximately normal slow human walking rather than CF-5's extremely slow ~0.05 m/s regime.

Use a staged ladder so obviously bad configurations die cheaply:

A. 2 steps
B. 6 steps
C. 20 steps
D. 60 steps only if 20 is clean

Test several progressively faster walking targets/cadences, but DO NOT attempt running and do not force a target speed the body cannot physically produce.

For every run report:
- realised forward speed;
- cadence;
- step length;
- single/double support durations;
- whether forward COM velocity remains positive through touchdown;
- COM/capture-point behaviour;
- foothold error;
- clearance;
- touchdown velocity/impact;
- stance-foot slip;
- joint-limit margins;
- actuator saturation;
- torque discontinuities;
- energy residual;
- contact/rebound abnormalities;
- pelvis/heading drift;
- stance width;
- toe/foot yaw;
- whether any metric accumulates step-to-step.

Most importantly distinguish:
A = missing gait/controller functionality;
B = correctable controller/planner deficiency;
C = evidence of an intrinsic V2 physical-character limitation.

V2-vs-V3 STOP RULE

Do not repair genuine C findings during this experiment.

If repeated walking exposes growing physical instability despite reasonable gait planning — e.g. unavoidable actuator saturation, increasing energy error, unavoidable joint-limit exhaustion, progressively worsening contact instability, growing balance error, or falls caused by the underlying body rather than the gait planner — stop and present it as V3 evidence.

Conversely, if the same V2 body performs sustained walking once these gait-level mechanisms exist, say that explicitly. Do not call missing gait functionality evidence for V3.

VISUAL EVIDENCE

If CF-6 achieves at least 20 genuinely continuous physical steps, create an authoritative replay using the same verified-regeneration/recorded-state approach as the CF-5 viewer.

Preserve simulation/presentation neutrality.

Give me an exact localhost URL so I can watch:
- V2-REF;
- the fastest clean 20+ step walk;
- preferably with the same camera/playback controls as CF-5.

Do not judge success by appearance alone, but capture enough pose/state information that I can inspect whether the physical gait now actually reads as walking.

FINAL REPORT

Tell me:

1. Did CF-6 produce genuine sustained walking?
2. Fastest clean realised speed/cadence for each body.
3. Maximum consecutive steps.
4. Whether momentum survives THROUGH touchdown, not merely into swing.
5. Whether state/error converges, remains periodic, or deteriorates.
6. What mechanism becomes limiting first as speed increases.
7. Which remaining limitations are A, B or C.
8. Does this experiment strengthen or weaken the case for V3?
9. Is V2 now a credible physical foundation for production walking?
10. What is the smallest next experiment — faster walking, running transition, or return to TD2C/E2?

Do not begin that next experiment.

Keep CF-6 isolated, default-off and reproducible. Do not adopt it, resume TD2C/E2, begin running, or modify production walking after reporting. Stop for my review.
