# User instruction, 2026-10-14 ≈ 14:30 BST (verbatim): SP2A body-friction sweep — diagnostic only

The message was one pasted block, with no attachment. It refers to "the supplied reference": the broadcast slide-tackle reference used for SP2 and SP2A, which is kept outside Git.

**Context:** received after SP2A (`2a70c7d2`, local, not pushed).

---

SP2A BODY-FRICTION SWEEP — DIAGNOSTIC ONLY
Before making any further changes to SP2A, I want one tightly controlled experiment.
Do not modify the tackle animation, 3D tuck, transition, muscles, controller, joint limits, entry velocity, body geometry, or ground-entry timing.
Freeze the current SP2A motion exactly as it is.
The question is simply:
How much of SP2A's short slide is caused by friction from non-stud body contacts with the turf?

Keep stud/sole traction unchanged
Preserve the current TCF-1 boot/stud behavior exactly.
Proper sole-down/stud contact must retain its existing traction.
Do not make the studs slippery.
We are specifically testing the surfaces that should slide across the turf, not the surfaces designed to grip it.
Experimental contact group
Apply the experimental friction scaling to all non-stud / non-planting body-to-turf contacts, including:
- side/top of boot where it is not legitimate stud engagement;
- sock/shin/calf;
- knee;
- thigh/shorts;
- hip/pelvis;
- torso/jersey;
- upper arms;
- forearms;
- hands.
For this diagnostic, hands and forearms should also have low tangential friction.
They may still:
- collide with the turf;
- carry normal load;
- post/support the body;
- influence body orientation.
But they should not become high-friction anchors that artificially brake the slide.
We can calibrate hand/arm traction separately later.
Run a severity sweep
Use the exact same deterministic SP2A 5.0 m/s fixture for every run.
Change only non-stud body/turf friction.
Run at minimum:
F100 — CURRENT
Current body/turf friction, unchanged.
F75
75% of current non-stud body friction.
F50
50%.
F25
25%.
F10
10%.
F0
Effectively frictionless tangential body contact, or the lowest numerically stable value the solver permits.
Stud/sole traction remains 100% current in every condition.
Do not tune anything separately between conditions.
If the current contact model cannot cleanly separate stud/sole friction from other body contacts, implement the minimum experimental material separation necessary to perform this test. Keep it explicitly diagnostic and do not adopt it into canonical V2.
What I want measured
For every condition report:
- horizontal COM velocity at first turf contact;
- horizontal COM velocity when the slide is fully established;
- horizontal COM velocity versus time;
- total slide distance;
- time until effectively stopped;
- average slide deceleration;
- peak deceleration;
- cumulative horizontal ground impulse;
- vertical/normal ground impulse;
- body orientation through the slide;
- final pose/state;
- tackling-boot stud engagement;
- folded-boot stud engagement;
- knee load;
- thigh load;
- hip load;
- arm/hand load;
- joint-limit excursions.
Most importantly, create a braking ledger by body region for every severity:
- boots excluding legitimate stud contact;
- shin/calf;
- knee;
- thigh;
- hip/pelvis;
- torso;
- arms;
- forearms/hands.
Report both:
normal load
and
tangential braking impulse.
I want to distinguish:
“the knee carries a lot of body weight”

from:
“the knee is actually responsible for a lot of horizontal braking.”

Those are not the same thing.
Do not change the motion
This experiment is deliberately not an attempt to improve SP2A.
If F25 looks fantastic, do not immediately adopt F25.
If F0 slides five metres, do not shorten it.
If F0 still stops after ~1.5 m, do not compensate elsewhere.
Preserve the raw result.
We are trying to identify causality.
Important diagnostic
Check whether reducing surface friction actually reduces horizontal braking approximately as expected.
If it does not, determine where the remaining horizontal momentum is going:
- active motor work;
- joint-limit impulses;
- normal-impact redirection;
- solver constraints;
- late stud/boot contact;
- conversion into rotation;
- some other mechanism.
Do not fix those mechanisms during this experiment.
Just identify them.
Visual review page
This experiment is primarily for my visual review.
Create a synchronized page showing:
REFERENCE | F100 | F75 | F50 | F25 | F10 | F0
with identical starting time and camera.
I want:
1× gameplay/close view
so I can judge which version actually looks like a football slide,
and:
0.25× close view
so I can inspect the contacts.
Also provide a useful side/3-quarter camera where slide distance is easy to compare.
Ideally include a synchronized overhead or trajectory view showing COM travel.
Make it possible to switch between conditions without changing the time position.
On-screen diagnostics
For the diagnostic view show:
- COM trajectory;
- horizontal velocity;
- cumulative slide distance;
- current non-stud friction multiplier;
- active turf contacts;
- stud engagement;
- contact normal forces;
- tangential/friction forces.
Keep a separate clean visual without overlays.
Comparison table
Give me a concise table:
| Variant | Body friction multiplier | Slide distance | Stop time | Avg decel | Peak decel | Knee braking | Thigh braking | Hip braking | Arms/hands braking | Stud engagement |
Also state which variant visually appears closest to the supplied reference without treating that as evidence that its coefficient is physically correct.
What I want to learn
At the end answer:
1. Does reducing non-stud body friction materially increase slide distance?
2. Is the relationship approximately monotonic?
3. Does the tackle begin to visually “glide” rather than grab the turf?
4. Which body regions currently produce most of the braking?
5. Are hands/forearms significant brakes in F100?
6. Is the knee's ~50% load share actually responsible for substantial braking, or is it mainly normal support?
7. At what friction range does the slide begin to resemble the reference?
8. At what point does it become obviously too slippery?
9. Does lowering body friction expose another braking mechanism?
10. Do the tackling studs remain correctly disengaged in every normal run?
11. Does any condition introduce instability, pathological rotation or joint-limit problems?
12. Based solely on this diagnostic, is non-stud body/turf friction likely the principal remaining cause of insufficient slide distance?
Finish with:
BODY FRICTION EXPLAINS SHORT SLIDE: YES / PARTIAL / NO
LOW-FRICTION BODY CONTACT PRODUCES DESIRED GLIDE: YES / PARTIAL / NO
OTHER MAJOR BRAKING MECHANISM FOUND: YES / NO
BEST VISUAL DIAGNOSTIC VARIANT: F___
DO NOT ADOPT ANY VARIANT YET.
Stop for my visual review.
Do not start the running recipient.
Do not modify C3.
Do not further modify SP2A choreography.
Do not change M1c.
Do not change TCF-1.
This is a controlled diagnostic designed to tell us whether the remaining slide-distance problem is fundamentally non-stud body/turf friction.
