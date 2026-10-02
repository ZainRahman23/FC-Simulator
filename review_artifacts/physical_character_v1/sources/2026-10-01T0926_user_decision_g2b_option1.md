<!-- preserved verbatim from Claude session d4761610-c35f-4019-9308-cb83973e7b76, transcript line 6470. -->

Proceed with Option 1: fix landing mechanics and forward foot-placement control.
I agree with stopping the overnight runway at G2b. Do not retreat to Option 2, and do not change the body architecture or add a toe joint yet. The current evidence does not establish that body/foot architecture is the limiting factor.
Treat the failed overnight G2b work as valuable evidence rather than something that must be made to pass.
Primary objective
Make steady forward walking itself work through better physical touchdown/landing mechanics and stable step-to-step foot placement.
Do not start G2c/d/e until G2b genuinely earns promotion.
1. Fix the landing, not the symptom
Investigate the measured hard touchdown:
- pelvis yaw ±20–30° at touchdown;
- roughly 240 N body weight associated with braking at a foot ~0.2 m off-centre;
- large rotational disturbance generated every step.
Determine exactly where the touchdown angular impulse comes from.
Decompose it where practical into:
- foot approach velocity;
- forward/backward velocity mismatch with turf;
- lateral velocity;
- vertical velocity;
- foot orientation;
- contact location relative to COM;
- heel/sole contact sequence;
- joint impedance;
- friction;
- stance/swing motor state immediately before and after touchdown.
Do not simply add stronger yaw correction after impact.
The goal is to make the impact itself more human and less destabilizing.
2. Pre-contact swing-foot retraction
Implement/test the proposed swing-foot retraction before touchdown, based on defensible human walking mechanics.
The foot should not arrive as a rigid object moving aggressively forward relative to the ground if normal walking would reduce that relative velocity before contact.
Use the existing reference gait as guidance where appropriate, but keep actual physical state authoritative.
Measure whether retraction reduces:
- horizontal collision impulse;
- pelvis yaw impulse;
- foot slip;
- subsequent corrective torque;
- step-to-step placement error.
Do not prescribe the resulting body trajectory.
3. Landing compliance
Investigate a physically appropriate touchdown/load-acceptance impedance profile.
In particular, determine whether the ankle/knee/hip should temporarily behave differently during:
pre-contact → initial contact → load acceptance → stance
while remaining inside the same finite actuator architecture.
Do not create an artificial landing animation or overwrite Jolt.
If joint target/velocity/impedance changes are used, they must represent physically meaningful muscle/control behavior and remain torque-limited.
The landing should be allowed to deflect the body.
4. Forward foot placement must be closed-loop
The 6–75 cm step-length oscillation is unacceptable.
Do not force every step all the way back to an ideal nominal foothold.
Develop/test a gradual closed-loop correction law where step placement responds to actual COM state, velocity, previous touchdown error and gait state.
Small errors should produce small subsequent corrections rather than alternating overcorrections.
Measure the system's step-to-step error response.
I want to know whether a displacement error:
- decays;
- persists;
- oscillates;
- or amplifies
over subsequent steps.
Stable walking should naturally drive ordinary errors toward a bounded gait rather than requiring exact identical footsteps.
5. Preserve what the overnight work discovered
Keep the general fixes that were genuinely validated:
- physically reachable pressure points;
- proper trailing-foot unloading;
- first weight shift finishing from actual body arrival;
- swing-foot clearance based on actual hanging angle;
- other general corrections documented in the night log.
But independently verify that each remains necessary after the landing/placement changes.
Do not accumulate compensating fixes whose original failure mechanism no longer exists.
6. Research narrowly if useful
You may do targeted research into human walking touchdown mechanics, particularly:
- swing-foot retraction before heel strike;
- horizontal foot velocity at contact;
- heel-strike/load-acceptance mechanics;
- ankle/knee/hip impedance through touchdown;
- step-to-step foot-placement control;
- angular-momentum regulation during walking.
Prefer biomechanics/robotics primary literature.
Use it to answer specific implementation questions rather than beginning another broad literature review.
7. Do not solve this by increasing strength
Do not:
- increase ankle torque merely because it saturates;
- increase hip torque;
- pin heading;
- apply external yaw torque;
- reduce friction arbitrarily;
- teleport/reposition the foot;
- write root velocity;
- prescribe COM movement.
If ordinary walking genuinely requires capability outside the current human-derived body limits, document the evidence and stop for my decision.
8. G2b success criterion
Do not define success as “managed more steps.”
I want a stable steady physical walk where:
- forward propulsion comes from ground interaction;
- step lengths settle into a reasonable bounded distribution;
- pelvis yaw remains bounded without growing;
- touchdown impulses do not create accumulating instability;
- feet do not materially slide;
- no hidden external support/propulsion exists;
- motor saturation remains physically plausible;
- reference motion remains preference rather than authority;
- walking remains deterministic;
- previous promoted gates remain unchanged.
Run long enough that a marginal 5–10-step solution cannot pass.
Include perturbations of initial gait phase/state so success isn't dependent on one perfect initialization.
9. Visual quality
G2b still needs to begin looking like walking rather than marching.
Pay particular attention to:
- continuity through double support;
- trailing heel rise;
- push-off;
- touchdown;
- knee behavior;
- vertical COM motion;
- pelvis/trunk flow;
- the poor arm poses I flagged previously.
However, don't polish arms cosmetically while the gait itself is unstable.
10. Scope
Stay on G2b only.
Do not start G2c/d/e.
Do not add a toe joint/body architecture change without returning to me with evidence that it is necessary.
Do not start G3, running, football locomotion or the Reference Tackle.
Preserve the failed overnight experiments and measurements.
Keep resource use conservative and tests sequential.
Local checkpoint commits are fine. Do not push.
Once you have either:
A. a genuinely stable G2b walk, or
B. strong evidence of a remaining architectural/body limitation,
stop and give me a visual review plus the evidence.
