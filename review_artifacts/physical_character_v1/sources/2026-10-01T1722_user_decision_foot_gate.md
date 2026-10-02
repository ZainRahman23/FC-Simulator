<!-- preserved verbatim from Claude session d4761610-c35f-4019-9308-cb83973e7b76, transcript line 11302. -->

I approve the conclusions of the foot-gate investigation.
Decisions:
1. Keep F0 as the working/default foot. Do not promote F1, F2 or F2h.
2. Preserve F2h as a clean opt-in experimental body variant. Do not delete it or let it affect the default body.
3. Proceed with forward-speed regulation and swing-execution work.
4. The new walking logic must be foot-agnostic. Do not encode F0-specific collision geometry, toe location, pitch, or a special trajectory simply to make F0 pass.
5. Before running/sprinting work begins, rerun the relevant F0/F2h comparison because forefoot mechanics may become important for push-off, acceleration, cutting and planting.
6. Do not attempt to solve the current yaw problem through the foot. The comparison found that changing the foot did not materially solve yaw; treat yaw/angular-momentum regulation as its own mechanism.
The most important result from this investigation is that the current G2b failure chain is now better localized:
forward speed creeps upward → regulating step request reaches its limit → trailing leg is too extended when swing must begin → swing execution/clearance fails → toe catches → walk collapses.
Changing foot architecture did not break that chain.
Therefore, investigate and fix the causal upstream mechanisms, not the symptom.
A. Forward-speed regulation
Determine why target ~0.6 m/s walking gradually accelerates after roughly 6–9 steps.
Instrument step by step:
- COM forward velocity at decision time;
- desired velocity;
- velocity error;
- requested foothold;
- achieved foothold;
- requested step length;
- actual step length;
- single-support duration;
- double-support duration;
- stance-foot impulse;
- braking/propulsive impulse;
- trailing-leg extension;
- actuator saturation;
- where the controller believes the next step should regulate speed.
Establish where the positive feedback begins.
Do not simply cap speed, shorten every step, add hidden braking, or tune a gain until a 20-step test happens to survive.
I want the controller to regulate speed causally through physically achievable step placement, timing and ground reaction.
B. Swing execution
Redesign swing execution so it does not assume one specific rigid-foot geometry.
The planner should own the intended foothold/timing.
Swing execution should take the actual physical state of the leg/foot and produce a feasible trajectory toward that foothold while respecting:
- actual liftoff state;
- current joint angles and velocities;
- leg reach;
- actual foot geometry;
- actual foot orientation;
- turf clearance;
- touchdown requirements;
- finite joint torque;
- joint limits.
It must not assume that liftoff always occurs with F0's pitch or that a particular point on F0 follows a predetermined arc.
In particular, investigate whether swing clearance should be defined using the lowest point of the actual foot collider/geometry through the predicted swing, rather than ankle height or a hard-coded boot trajectory.
If that is appropriate, implement it generically so F0 and F2h use the same mechanism.
C. Separate planning failure from execution failure
For every failed step classify it explicitly:
planner infeasible
— requested foothold/timing cannot physically be reached from the current state;
swing execution failure
— request was feasible but the leg/foot failed to execute it;
contact/touchdown failure
— swing reached the region but physical contact occurred incorrectly;
post-touchdown stability failure
— placement succeeded but subsequent dynamics caused the fall.
Do not let one category masquerade as another.
D. Reachability
Revisit the current ~0.30 m requested-step ceiling.
Do not simply raise it.
Determine from the body's actual state what forward footholds are physically reachable at the required touchdown time.
A useful controller should know:
“I need more braking, but the ideal regulating foothold is outside my current reachable set.”

That condition should cause an appropriate earlier adjustment of timing/previous step planning rather than waiting until the leg is fully extended and then failing.
E. Test progressively
Start with steady straight walking only.
Target the existing ~0.6 m/s case.
Require multiple deterministic starts.
Once stable, test nearby speeds rather than one magic operating point.
I do not want G2b declared successful merely because one seed survives 20 steps.
Evaluate:
- survival;
- speed regulation;
- step-length distribution;
- cadence;
- foothold error;
- swing clearance;
- touchdown velocity;
- stance slip;
- actuator saturation;
- external impulse ledger;
- yaw/angular momentum, although yaw may remain a separate blocker.
Watch for oscillation or a controller that alternates between over-braking and over-accelerating.
F. Preserve the foot experiment
Once the new speed-regulation and generic swing mechanisms work on F0, rerun F2h without F2h-specific controller tuning.
That will be much more informative than today's comparison because the present F2/F2h result is contaminated by swing logic designed around F0.
We then want to know:
With the same foot-agnostic controller, does F2h expand useful physical capability?

Do not promote it based on visual human-likeness alone.
G. Do not start later locomotion yet
Do not begin G2c/G2d/G2e, jogging, running or sprinting until this straight-walking failure mechanism is understood.
You have runway to investigate thoroughly, bisect failures, build diagnostics, consult primary biomechanics/control literature where useful, and make general fixes.
Preserve all approved gates and determinism. No hidden forces, root writes, pelvis support, teleportation or outcome-specific hacks.
Commit locally at meaningful checkpoints. Do not push.
Stop for my visual review once you have a materially improved stable forward walk and a clear causal account of what changed.
