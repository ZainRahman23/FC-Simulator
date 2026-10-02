<!-- preserved verbatim from Claude session 6a70b682-ea7e-4ecb-991b-1bb65e5cd9c4, transcript line 9327. -->

INDEPENDENT REVIEW — PHYSICAL CHARACTER GATE B AND BALANCE ARCHITECTURE
Claude has now completed Gate B of the Jolt physical-character implementation.
Do not implement anything yet.
I want you to independently review these results against your previous Physical Character Investigation and determine what the next balance/support gate should contain.
Gate B results
The implementation uses a 14-body Jolt articulated humanoid at 240 Hz.
Important results:
- slow controlled pose tracking averages ~3° error across 13 joints;
- reversing a requested motion peaks around 8° error and remains continuous;
- an instantaneous target change saturates the relevant hip for ~0.39 s but accelerates continuously rather than snapping;
- there are zero position/velocity writes after initialization;
- a boot moving at ~1.02 m/s into a fixed post is stopped on its arrival step;
- the reported gap changes from 1.13 mm to 0.14 mm with ~885 N contact force and zero geometric penetration;
- even at 8× motor strength, penetration remains ≤0.74 mm;
- in the blocked-leg test the reaching hip retains ~22° target error at ~208 N·m against a 220 N·m limit;
- removing the obstruction lets the hip recover within 5° in ~0.45 s;
- deterministic shoves recover in roughly 0.12–0.48 s without scripted recovery;
- repeated runs are bit-identical and Chrome matches Node;
- cost is roughly 0.6 ms per rendered 60 Hz frame for one character;
- Gate A behavior remains unchanged.
Critical limitation
Whole-body tests currently use a temporary finite pelvis support, capped at approximately:
- 250 N translational support;
- 100 N·m rotational support per axis.
It is visible and removable.
Without it, standing eventually topples at approximately 5.5 s.
Claude reports that the ankle springs provide only approximately 1.03× the body's gravitational load.
Single-leg stance falls.
A shove knocks the unsupported character over.
Therefore this is currently a controlled articulated body, not yet a self-balancing physical character.
Visually bad cases
Claude also reports:
- during a fast return, the right foot comes down on top of the left foot and stays there;
- one step-change target leaves the right toe planted behind the body in an unnatural forward-leaning split stance;
- when a reaching leg is blocked, the trunk can fold forward over the pinned leg rather than choosing a useful brace/recovery;
- at 8× strength the whole character jackknifes around the blocked leg;
- identical joint-angle error can therefore conceal very different whole-body quality.
Your task
Determine the smallest correct next architecture step that replaces the temporary pelvis support with genuine physical balance/support control.
Research as necessary using primary biomechanics, robotics, physically based character control and active-ragdoll sources.
Specifically investigate:
1. COM versus support polygon/region;
2. center of pressure if useful at this abstraction;
3. capture point / extrapolated COM concepts;
4. ankle strategy;
5. hip strategy;
6. how pelvis/chest targets should change in response to balance error;
7. foot-ground contact state;
8. planted-foot friction and torque;
9. support-foot selection;
10. double-support versus single-support;
11. when maintaining stance becomes physically impossible;
12. when a corrective step should be requested;
13. how foot-placement targets should be generated;
14. how balance interacts with existing finite joint motors;
15. how external pushes should propagate without an invisible root force;
16. how support loss should transition naturally toward stumble/fall rather than being artificially prevented.
Do not design a controller whose goal is "never fall."
A football character must be able to:
- maintain ordinary balance;
- resist small disturbances;
- yield to larger disturbances;
- take corrective steps where physically plausible;
- lose support;
- stumble;
- fall.
Falling is a valid physical outcome.
The controller's job is to pursue intentional balance within finite physical capability, not guarantee uprightness.
Important architectural constraint
Do not reintroduce a hidden root controller that simply drags the pelvis back underneath the animation.
Any balance action must ultimately operate through physically meaningful mechanisms such as:
- finite joint torques;
- changing physical pose targets;
- foot placement;
- ground reaction through planted feet.
If you believe some bounded pelvis force is biomechanically/architecturally justified, explain exactly what physical mechanism it represents. Otherwise assume the temporary Gate B pelvis support should disappear.
Foot placement
Pay particular attention to the bad Gate B foot behavior.
Pose animation alone currently specifies limb configuration without deciding where a foot should actually land.
Explain how we should separate:
high-level desired action/pose
from:
physical support-foot / swing-foot target placement.
We eventually need this for running, tackling, stumbling and recovery, so avoid a solution that works only for static standing.
Deliverable
Return:
1. your assessment of whether Gate B's motor architecture is sound;
2. any concerns in Claude's measurements/conclusions;
3. recommended balance architecture;
4. smallest next gate;
5. exact tests that gate should contain;
6. what should happen to the temporary pelvis support;
7. how foot contacts/support should be represented;
8. how COM/support error should affect targets;
9. how corrective stepping should eventually fit in;
10. how to distinguish recoverable imbalance from an unavoidable fall;
11. quantitative/debug metrics we should expose;
12. failure modes to watch for;
13. what should explicitly not be implemented yet.
Do not modify Touchline.
Do not build the controller.
Do not commit or push.
Stop after the independent review.
