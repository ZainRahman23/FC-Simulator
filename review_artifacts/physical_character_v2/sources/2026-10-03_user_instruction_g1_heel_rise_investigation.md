# User instruction, 2026-10-03: focused investigation of the feet-first 1.0 m drop heel rise (verbatim)

Before I approve G1 for promotion to G2, I want one focused investigation of the feet-first 1.0 m drop.
I visually reviewed the validated baseline sequence and noticed something I want explained rather than assumed correct:
After the feet initially establish broad/approximately flat ground contact, at least one foot subsequently develops a large heel rise / forefoot-pivot posture while the body collapses.
A heel unloading after flat contact can of course be physically valid. I am not asking you to suppress heel rise.
I want to establish why this particular heel rise occurs and whether its magnitude is passive-human-plausible or an artifact of our ankle/end-stop/contact implementation.
Do not change anything initially.
Instrument the existing exact G1 validated-baseline run.
From first foot contact until the heel has either returned or clearly unloaded, plot/report per foot:
- heel height above turf;
- forefoot/toe-region height;
- foot pitch;
- ankle plantar/dorsiflexion angle;
- ankle angular velocity;
- ankle angular acceleration if reliable;
- vertical and horizontal ground reaction/contact impulse;
- centre of pressure / effective contact-wrench location along the foot if derivable from available Jolt contact data;
- which of the 10 boot pieces are contacting each tick;
- normal force/impulse contribution of each contacting boot piece;
- total external moment about the ankle from ground contact;
- passive ankle tissue torque;
- anatomical end-stop torque;
- Jolt motor/drive torque if any;
- Jolt emergency hard-stop impulse/activity;
- ankle damping torque;
- any other constraint torque capable of doing work about ankle pitch.
I specifically want the causal chain:
What causes the heel to leave the ground after initially broad contact?
Determine whether it is primarily:
A. physically expected contact/momentum progression;
B. passive elastic recoil;
C. anatomical end-stop behaviour;
D. compound-foot contact-manifold behaviour;
E. constraint coupling elsewhere in the leg;
F. some combination.
Audit energy/work during the heel-rise interval. A passive element must not be generating net energy inconsistent with its stored elastic energy.
Also compare the exact same drop with:
1. current validated 10-piece boot;
2. old single-hull boot;
3. passive ankle tissue disabled for diagnosis only;
4. ankle end-stop contribution disabled for diagnosis only, if safe;
5. any existing configuration that isolates contact geometry without changing anatomy.
These are diagnostic counterfactuals only. Do not adopt any of them.
Measure whether heel-rise timing/magnitude changes.
Most importantly, distinguish:
"the heel lifts because the ground reaction naturally migrates toward the forefoot as the collapsing body rotates over the foot"
from
"the implementation effectively launches/forces the heel upward."
Add a focused viewer scenario/overlay if useful so I can see:
- heel and forefoot contact state;
- contact/CoP location;
- ankle angle;
- ankle torque decomposition;
- foot pitch;
- heel height.
Do not tune the result to look human.
If the current behaviour is mechanically correct, demonstrate why with the measurements and leave it unchanged.
If you find an implementation defect, identify it and stop before changing an approved specification value.
Do not start G2.
Report the result and wait for my review.
