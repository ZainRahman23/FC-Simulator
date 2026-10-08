# User decision 2026-10-08 — pivot the V2 production locomotion architecture to a simulation-authoritative supported physical character; close CF-6; design SLP-1 (verbatim)

Received in the Claude Code session of 8 Oct 2026, in reply to the CF-6 final report (`diagnostics/loco_cf6_2026-10-08/CF6_RESULTS.md`, commits b6edadc / 7651a25). Reproduced verbatim below.

---

Approved: pivot the physical-character V2 production architecture now. CF-6 has answered the autonomous-locomotion question sufficiently. Do not continue trying to make V2 autonomously walk faster, and do not start CF-7 or further autonomous-gait development.
First preserve and close CF-6 exactly as evidence. Do not alter its results, criteria, frozen runs, replays, or historical conclusions. Record the architectural decision that CF-6 demonstrated 59 consecutive genuinely continuous steps at 0.10 m/s with convergence and no accumulating physical instability, while higher-speed failures occurred in the gait/planning/control layer rather than establishing a C-class structural body limitation. The 0.10 m/s motion is not considered production-quality walking; it is evidence about repeated physical support stability.
We are now changing the production locomotion architecture, not discarding V2.
New architecture: simulation-authoritative supported physical character
The football simulation/movement layer will determine the player's authoritative world trajectory, velocity, acceleration, facing and intended action. Ordinary locomotion must no longer require V2 to dynamically discover balance or generate forward motion through an autonomous robotics-style gait controller.
V2 remains the physical character. Preserve its body dimensions, masses/inertias, articulated collision representation, joints and joint limits, physical contacts, actuator/capacity information, feet, ground interaction and other validated physical properties wherever applicable.
During ordinary locomotion, introduce an artificial support / locomotion-authority layer that can drive the physical character along a prescribed trajectory while keeping it upright. This layer is not a football decision-maker and must not independently change authoritative football outcomes.
Collision/contact capability should remain available while the character is supported. The eventual intended hierarchy is:
- normal unobstructed locomotion: strong artificial support/trajectory authority;
- small external disturbance: physical reaction but support retained;
- moderate disturbance: displacement / stride disruption / stumble may occur;
- sufficiently large or badly placed disturbance: support can break and the articulated physical body can fall;
- recovery can later reacquire supported locomotion.
Do not implement an arbitrary impulse > X = ragdoll rule. We ultimately want disturbance response to be sensitive to contact location, direction, relative velocity/momentum, support state/foot phase and the body's physical properties.
First task: architecture + smallest possible prototype only
Before implementation, inspect the existing V2/Jolt/controller architecture and write a short design/preregistration for Supported Locomotion Prototype 1 (SLP-1). Reuse existing mechanisms wherever possible. Do not redesign unrelated systems.
SLP-1 should answer one narrow question:
Can V2-REF be externally driven through realistic-speed locomotion while remaining a genuine physical/contactable articulated character, and can external disturbances produce sensible retained-support versus loss-of-support behaviour without autonomous balance being responsible for ordinary locomotion?
Use a prescribed straight-line trajectory. Test three representative regimes initially:
walk ~1.2 m/s, jog ~3 m/s, run ~6 m/s.
These are prototype target speeds, not claims about final football locomotion parameters. Do not tune V2's physical properties merely to make them pass.
First establish the cheapest clean supported locomotion mechanism. Then perform a small diagnostic disturbance matrix, not thousands of runs:
- no disturbance;
- small lateral torso/shoulder disturbance;
- moderate lateral torso disturbance;
- large torso disturbance;
- representative disturbance to the swing leg;
- representative disturbance to the planted/support leg.
Apply identical/reproducible disturbances where comparisons require them. Start with V2-REF and one physics rate unless another rate is necessary to diagnose a result.
For every case record at minimum:
- commanded and realised trajectory/speed;
- support authority/state;
- actual rigid/articulated-body response;
- contact point/body segment;
- impulse/force information available from the existing physics;
- COM/pelvis displacement and rotation;
- foot/support state at impact;
- whether support was retained, disrupted, or lost;
- whether the character stumbled/fell;
- joint-limit/saturation/capacity violations;
- energy/integrity diagnostics;
- recovery behaviour if already available;
- deterministic hashes/reproduction;
- CPU cost / physics-step cost compared with the existing autonomous V2 locomotion where a meaningful like-for-like measurement is possible.
I specifically want to know whether keeping the articulated rigid/collision body physically meaningful while removing continuous autonomous balance gives us the expected computational advantage.
Critical architectural constraints
1. Simulation authority remains absolute. This prototype must not create football decisions or outcomes. Ultimately the football simulation decides what happens and the physical/presentation system explains it.
2. Do not modify the football simulation to accommodate the prototype.
3. Do not modify V2 physical parameters merely to produce prettier behaviour.
4. Do not delete or overwrite CF-1 through CF-6. They remain historical evidence.
5. Do not resume TD2C/E2 as part of this task. Preserve their current state.
6. Do not start running, tackling, recovery, animation, skeletal presentation or production walking implementation beyond what SLP-1 strictly requires.
7. Keep all new behaviour default-off and preserve existing deterministic/regression behaviour when it is off.
8. Keep randomness deterministic; ideally SLP-1 should require no new randomness.
9. This is a production-architecture feasibility prototype, not another attempt to certify autonomous human gait.
Before writing implementation code, tell me:
- exactly how you propose to support/drive the existing physical body;
- which existing V2 mechanisms remain active and which autonomous-balance/locomotion mechanisms are bypassed;
- whether the physical representation remains dynamically contactable during supported locomotion;
- how an external collision can physically perturb it without the support layer simply cancelling the collision;
- how you propose eventually to transition from supported → disrupted → falling without a binary arbitrary ragdoll threshold;
- what computational work disappears compared with the current V2 controller;
- what SLP-1 can and cannot prove.
Stop there for my approval before implementing SLP-1.
Also preserve the current daily publication/archive rules. Do not push today's physical-character development prematurely.
