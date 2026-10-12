# User instruction, 2026-10-12 02:47 BST (verbatim)

---

MUSCLE-1 — VALIDATE THE PHYSICAL MUSCLE/ACTUATOR LAYER BEFORE FURTHER P2 OR PVP WORK
We are deliberately not returning to human-v-human PVP yet.
PPR-3 established a useful decomposition:
- S2 is promising: it passed 18/18 pre-feedback substrate tests and gives us a mechanically compliant body.
- P2 is not qualified: S2+P2 can stand, but fails 10/14 qualification rows, with superhuman forward robustness, weak lateral recovery, incorrect sway characteristics and excessively fast corrective torque.
- The visual review agrees: S2 yields and can genuinely lose balance, while S2+P2 still does not convincingly read as coordinated human balance recovery.
Do not interpret that visual observation as proof that P2 itself is the problem. We first need to separate:
what the controller commands
from
how the physical body turns that command into force.
Astra's independent architecture review raised a specific hypothesis: V2's activation dynamics may constrain the amount of torque available without sufficiently constraining how quickly actual physical torque changes inside that envelope.
MUSCLE-1 exists to test that hypothesis, not assume it.
1. Goal
Determine whether V2 needs a character-owned physiological force-production layer between neural/controller command and physical joint torque.
Conceptually:
movement intent
→ controller
→ muscle excitation
→ activation / contraction / elastic state
→ generated physical force/torque
→ V2 articulated body
External mechanical forces must still affect the body immediately.
We are asking:
Can the body develop newly commanded force at human-like rates while simultaneously retaining immediate intrinsic resistance when an already-loaded limb is mechanically disturbed?

Do not build a new balance controller yet.
2. First audit Astra's hypothesis against the actual code/evidence
You have access to PPR-1, PPR-2, PPR-3 and the candidate implementations that Astra could not inspect directly.
Before implementing anything, determine from code and traces:
1. What exactly do V2's existing 15/50 ms activation dynamics govern?
2. Does activation govern actual generated force/torque, merely available torque/capacity, or some mixture?
3. Once torque is inside the allowed envelope, how quickly can the existing servo change physical torque?
4. In PPR-3, how much of the excessive torque rise originated in:
   - P2's requested command;
   - activation dynamics;
   - servo/actuator dynamics;
   - intrinsic/passive mechanics?
Use the recorded PPR-3 histories wherever possible.
If Astra's diagnosis is materially wrong, stop and report that rather than forcing this architecture.
3. Preserve S2 and P2
Do not retune S2 or P2.
Preserve PPR-3 exactly as historical evidence.
In particular preserve the exact P2 command histories so they can later be replayed through different actuator models.
No changes to:
- PVP;
- slide tackle;
- RUN-1;
- simulation;
- authoritative outcomes;
- colliders;
- solver/timestep;
- S2 qualification results;
- P2 qualification results.
4. Define the physical contract before implementation
Design the smallest reduced physiological actuator model that could satisfy the evidence.
Do not build a full anatomical muscle simulator unless evidence demonstrates that it is necessary.
Candidate state may include, where justified:
- neural excitation u;
- activation a;
- generated active-force/torque state;
- contractile state;
- series/passive elastic state;
- muscle/joint length;
- lengthening/shortening velocity;
- eccentric/history state.
For every state variable, state exactly what human phenomenon it represents and why it is necessary.
If a state can be removed without losing the required behavior, prefer the simpler model.
5. Critical architectural rule
Do not solve this by low-pass filtering total joint torque.
These are different pathways:
Neural pathway
A new controller command should require physiological time to alter active muscle force.
Mechanical pathway
If an already-active muscle/tendon unit is suddenly stretched by an external force, its intrinsic mechanical response can occur immediately.
Therefore:
collision/contact/passive elasticity/intrinsic stiffness/force-length/force-velocity/elastic storage must not wait for neural latency.
The model fails if making command-driven force slower also turns the player into a mechanically dead ragdoll before neural response.
6. Preregister MUSCLE-1
Before running the candidate, freeze:
- equations;
- state variables;
- parameter sources;
- initial conditions;
- excitation inputs;
- mechanical displacement inputs;
- human reference data;
- operating points;
- evaluation windows;
- rise/fall-time definitions;
- stiffness/impedance definitions;
- energy accounting;
- numerical tolerances;
- success/failure criteria.
Do not select temporal parameters from PVP or by making PPR-3 visually look better.
Clearly distinguish:
measured human value / literature range / derived conversion / design choice.
7. Experiment A — neural command → physical force
Use a controlled ankle fixture based on the PPR-3 standing operating point.
Begin from the same preactivated state.
Apply predetermined excitation:
- step up;
- step down;
- moderate ramp up;
- moderate ramp down.
Compare:
CURRENT V2 actuator
vs
MUSCLE-1 candidate
Measure independently:
- excitation;
- activation;
- active generated torque;
- passive torque;
- elastic contribution;
- total physical joint torque;
- response onset;
- 10–90% rise time where meaningful;
- absolute torque slew;
- relaxation;
- work/energy.
The central question:
Does CURRENT V2 produce physical torque substantially faster than human force-production evidence permits even when its activation dynamics appear reasonable?

Then:
Does MUSCLE-1 correct that at the force-production layer rather than by artificially delaying all joint mechanics?

8. Experiment B — external stretch with unchanged neural command
Hold excitation history constant.
Mechanically perturb the loaded joint.
Use at least:
- small displacement comparable to the human intrinsic-stiffness evidence;
- moderate displacement;
- held displacement;
- release.
Measure:
- immediate torque response;
- stiffness/impedance;
- force-length contribution;
- force-velocity contribution;
- eccentric resistance;
- elastic energy storage;
- elastic return;
- damping/dissipation;
- relaxation;
- total energy ledger.
The candidate must demonstrate:
neural command cannot change force instantly
while simultaneously:
mechanical stretching of an already-loaded limb produces immediate physical resistance.
9. Experiment C — PPR-3 command replay
This is particularly important.
Take representative frozen P2 command histories and kinematic histories from PPR-3.
Replay exactly the same inputs open-loop through:
CURRENT actuator
and
MUSCLE-1
without allowing P2 to react differently.
This isolates the physical actuator from balance coordination.
Quantify how much of PPR-3's superhuman torque rise survives when the controller commands are identical.
I want a decomposition such as:
command contribution
vs
activation contribution
vs
force-production/servo contribution
vs
intrinsic mechanics contribution.
Do not make a visual judgment substitute for this decomposition.
10. Audit S2 for double-counting
MUSCLE-1 may overlap with mechanisms introduced during PPR.
Explicitly audit:
- T: standing tone/co-contraction;
- C: persistent-relaxing eccentric resistance;
- B: passive elasticity;
- damping;
- minimum-effort statics;
- stiffness caps;
- existing 15/50 ms activation dynamics;
- any new contractile/force state.
Produce a table:
mechanism → physiological phenomenon → instantaneous/delayed → body/muscle/controller → evidence → overlap risk.
Do not let two mechanisms reproduce the same measured stiffness or latency.
11. Energy and history must be physically coherent
Track:
- active mechanical work;
- external fixture work;
- elastic energy stored;
- elastic energy returned;
- energy dissipated;
- rigid-body energy change;
- unexplained residual.
Pay particular attention to C's persistent eccentric resistance.
Determine whether its current persistence law is a legitimate muscle-history approximation or an artificial brake.
If it can generate unexplained energy or continue resisting with physically incorrect sign/history, reject or redesign it.
12. Generalization
Use the ankle as the primary falsification fixture because PPR gives us the strongest evidence there.
Only if the candidate passes the ankle tests, test one second joint, preferably knee or hip.
Do not refit the architecture for that joint.
Joint-specific physiological parameters are acceptable.
Action-specific equations are not.
We are testing whether this is a human body property, not a standing-controller trick.
13. What controllers should eventually command
Based on the evidence, determine the correct boundary for future controllers.
Compare at least:
desired physical torque
muscle activation
muscle excitation
or a justified hybrid/recruitment abstraction.
Consider that the same contract eventually needs to serve:
- standing;
- running;
- balance recovery;
- tackling;
- kicking;
- goalkeeper movement;
- other physical football actions.
A future controller must not be able to bypass the body's force-development limitations merely because it performs a different action.
14. No PVP and no new P2
This remains an isolated muscle/actuator experiment.
Do not:
- unseal PVP;
- replay the tackle;
- modify the slide;
- retune P2;
- build P2's successor;
- implement prediction;
- implement stepping;
- integrate with RUN-1;
- alter gameplay outcomes.
We are deliberately finishing the receiving player's physical stack before human-v-human.
15. Success and falsification
A successful MUSCLE-1 should demonstrate all of the following:
1. realistic command-to-force development;
2. realistic force relaxation;
3. immediate intrinsic response to external mechanical loading;
4. no double-counted latency;
5. no double-counted stiffness;
6. sensible energy behavior;
7. generalization beyond one amplitude;
8. generalization to a second joint;
9. deterministic behavior;
10. acceptable computational cost.
Reject the candidate if realistic force timing can only be obtained by making immediate mechanical response unrealistically soft.
16. Final report
Answer directly:
1. Was Astra's actuator diagnosis correct?
2. What exactly is physiologically wrong with CURRENT V2's force-production path?
3. How much of PPR-3's excessive torque rise came from P2 versus the actuator?
4. Can MUSCLE-1 produce human-like command→force timing?
5. Can it simultaneously preserve immediate mechanical resistance?
6. What is the minimum state required?
7. What do the existing 15/50 ms dynamics actually represent, and should they remain?
8. Which S2 mechanisms survive without double-counting?
9. Is C energy/history consistent?
10. Does the model generalize to the second joint?
11. What should future controllers command?
12. Should the muscle dynamics become canonical V2 character state?
13. What exact V2 specification changes would eventually be required?
14. CPU, determinism and state/snapshot cost?
15. What surprised you?
16. Exact commits/files?
17. Exact localhost review URL, if a visual/interactive review is useful.
Stop after MUSCLE-1 for my decision.
Do not proceed automatically to P2 successor or PVP.
The next milestone after this, if MUSCLE-1 succeeds, will be:
qualified physiological body/muscles → coordinated delayed no-step balance → then human-v-human PVP.
The purpose of MUSCLE-1 is to make sure the future balance controller is controlling a human-like physical actuator, rather than compensating for an unrealistic one.
