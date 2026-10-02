<!-- preserved verbatim from Claude session 6a70b682-ea7e-4ecb-991b-1bb65e5cd9c4, transcript line 9962. -->

GATE C1 APPROVED — PROCEED WITH GATE C2: WEIGHT TRANSFER AND DELIBERATE FOOT PLACEMENT
I have reviewed Gate C1 and consider the unsupported balance foundation solid enough to proceed.
Preserve Gate C1 exactly as a reproducible baseline.
Do not polish the remaining ~1 mm quiet sway, protective fall behavior, or low-friction skating in this pass.
Gate C2 is NOT locomotion and NOT corrective stepping.
Its purpose is to teach the physical character how to deliberately change its support configuration.
C2 QUESTION
Gate C2 should answer:
Can the physical character intentionally transfer its weight from one physical foot to the other, safely unload a chosen foot, lift it, place it at a requested reachable location, establish real ground contact there, and transfer support onto it — entirely through the existing physical body, balance controller and finite motors?

This is the bridge between standing and locomotion.
1. NO ROOT SUPPORT
Preserve the C1 rule:
zero direct pelvis/root support force or torque.
All support must come through actual foot-ground contact.
Assert this in every C2 test.
2. SUPPORT TRANSFER IS PHYSICAL
Do not simply label one foot swing and turn its contact off.
Before a foot may intentionally lift:
- the body must shift support toward the intended stance foot;
- the swing foot's measured load must decrease physically;
- COM/capture state must be compatible with the remaining support region;
- the stance foot must actually be capable of carrying the resulting load;
- only then may liftoff occur.
I want to see:
double support
→ weight transfer
→ swing foot unloading
→ liftoff
→ single support
→ swing
→ touchdown
→ load acceptance
→ double support / new stance.
Do not fake any transition by changing collision masks or teleporting a foot.
3. FOOT CONTACT STATE MACHINE
Extend C1's physically sensed foot states into an explicit support transition model.
It should distinguish at least the meaningful equivalents of:
- loaded support;
- unloading;
- liftoff;
- swing;
- touchdown;
- loading/acceptance;
- planted support;
- slipping.
State changes should be driven primarily by actual contact/load/motion rather than animation time.
Authored action intent may request a transition but does not get to declare that it physically happened.
4. FOOT PLACEMENT TARGETS
Introduce deliberate reachable foot-placement targets.
The action layer may request something conceptually like:
place right foot approximately here
but the support/physical-character layer must determine whether that target is:
- reachable;
- compatible with current balance;
- compatible with joint ROM;
- compatible with the stance leg;
- free from collision with the other foot/body;
- compatible with the ground.
Do not blindly force the authored target.
If necessary, project/clamp a requested target into the physically reachable region and report the correction.
5. DO NOT LAND ON THE OTHER FOOT
Explicitly solve the Gate B failure where one foot came down on top of the other.
Foot placement must account for:
- stance-foot geometry;
- minimum practical clearance;
- swing-foot geometry;
- leg reach;
- ground position.
Do not solve this with a canned left/right offset alone.
The actual occupied physical space matters.
6. ACTUAL LANDING OVERRIDES PLANNED LANDING
This is important.
The controller may have a planned touchdown pose/location.
But once the foot physically contacts the ground:
the actual contact becomes truth.
Do not drag the foot afterward to make it match the planned marker.
Recompute the stance/body targets upward from where the foot actually landed, as established in C1.
Show:
- requested target;
- feasible/projected target;
- actual touchdown;
- final loaded contact.
7. SWING LEG CONTROL
C2 needs only a simple physically controlled swing trajectory.
Do not build a complete gait generator.
The swing should provide enough:
- toe/ground clearance;
- knee flexion;
- foot progression;
- approach to touchdown
to move between selected stance locations without clipping through the turf or stance leg.
Use finite existing motors.
The swing leg remains physically collidable.
Do not make it kinematic.
8. STANCE VERSUS SWING MOTOR PROFILES
Implement the distinction identified by the balance review:
a loaded stance leg and an unloaded swinging leg should not necessarily use identical stiffness/damping.
Use physically defensible finite profiles.
Do not make the swing leg artificially rigid merely to hit its trajectory.
External obstruction must still be able to deflect it.
9. REQUIRED TESTS
Keep the suite small and deterministic.
A — static weight shift
From quiet double support, transfer increasing load left/right without lifting either foot.
Verify measured foot loads change continuously and total support remains correct.
B — controlled single-leg support
Shift enough weight onto one leg that the opposite foot can physically unload and lift.
Hold briefly.
This is not yet a football balance challenge; it validates the support transition.
C — small lateral placement
Lift one foot and place it a modest distance sideways.
Establish the new contact and transfer load.
D — small forward placement
Same, forward.
E — small backward placement
Same, backward.
F — crossover/other-foot conflict
Request a landing location occupied by or dangerously close to the stance foot.
The controller must reject/project the target rather than land one foot on the other.
G — unreachable target
Request a location outside anatomical reach.
Do not stretch, teleport or violate joint limits.
Report/project/reject it.
H — uneven actual touchdown
Give a target where the foot makes contact slightly differently from the planned pose.
The controller must accept the physical touchdown and rebuild stance from it.
I — swing-leg obstruction
Put a physical obstacle in the swing path.
The finite motors must lose/deflect rather than drive the leg through it.
Do not solve recovery yet; just demonstrate physical integrity.
J — repeated left/right transfers
Perform several alternating deliberate placements without turning this into continuous walking.
Verify no accumulating drift, hidden support or determinism loss.
10. NOT CORRECTIVE STEPPING YET
C1 already produces STEP_NEEDED.
Do not connect that signal to automatic stepping in C2.
C2 is deliberate requested support change only.
Corrective stepping comes after we prove intentional weight transfer and landing mechanics.
This separation is important so we can debug foot placement independently from disturbance recovery.
11. DEBUG VIEW
Add:
- current support phase;
- stance foot / swing foot;
- measured per-foot load;
- load-transfer history;
- COM;
- capture point;
- support polygon;
- requested foot target;
- feasible/projected target;
- actual foot trajectory;
- actual touchdown point/pose;
- reachability boundary;
- stance-foot exclusion geometry;
- swing clearance;
- motor target vs actual;
- foot contact state;
- slip;
- root-support impulse, which must remain zero.
Make the transition through support phases visually obvious.
12. METRICS
Report:
- foot load before liftoff;
- COM/capture margin at liftoff;
- duration of single support;
- target landing error;
- projected-target correction where applicable;
- actual touchdown velocity;
- peak swing-foot ground penetration;
- stance-foot slip;
- motor saturation;
- joint-limit margin;
- time from touchdown to stable load acceptance;
- total external root/pelvis support impulse = zero;
- determinism;
- CPU cost.
13. FAILURE MUST BE ALLOWED
If a requested placement cannot be performed because:
- the target is unreachable;
- the stance state is unstable;
- the swing foot is blocked;
- friction is insufficient;
- joint limits prevent it;
do not cheat to complete the request.
Fail/reject the requested support transition and expose why.
14. RESOURCE LIMITS
One character.
One process/browser.
Sequential tests.
No:
- continuous locomotion;
- running;
- tackling;
- second player;
- ball;
- match;
- Reference Tackle;
- corrective stepping;
- protective fall animation;
- full regression matrix;
- parallel headless jobs.
Keep my Mac cool.
C2 PASS CRITERIA
C2 passes if:
1. load transfers physically between feet;
2. a foot lifts only after genuine unloading;
3. the character can sustain the resulting single support long enough for deliberate placement;
4. reachable placements work;
5. unreachable placements are rejected/projected without cheating;
6. feet do not land through/on each other;
7. actual touchdown becomes authoritative for the physical stance;
8. blocked swing limbs yield physically;
9. no pelvis/root support returns;
10. repeated placements remain deterministic and stable.
STOP
Stop after C2.
Do not implement corrective stepping.
Do not implement locomotion.
Do not add another player.
Do not return to Reference Tackle.
Do not commit or push.
Preserve the harness and evidence and wait for my visual review.
