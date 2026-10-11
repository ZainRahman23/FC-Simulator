# User instruction, 2026-10-11 23:41 BST (verbatim)

---

PPR-3 — COMPLETE THE PHYSIOLOGICAL STANDING FOUNDATION
Proceed from PPR-1 and PPR-2. Preserve both as historical evidence. Do not rewrite their failures or thresholds retrospectively.
PPR-2's central finding is accepted as the working architectural hypothesis:
A physically active footballer requires (1) a physiological mechanical substrate and (2) continuous delayed postural control.
We are NOT returning to PVP yet.
The immediate goal is:
Build and independently validate a V2 footballer that can stand like an active human: mechanically compliant immediately, continuously balanced through physiologically delayed control, and capable of genuinely losing balance when disturbances exceed its capability.

Do not optimize against the tackle or any STUMBLE/FALL outcome.
1. Keep PVP sealed
Do not run PVP-1A-DX, ABI or any tackle during development/calibration.
Do not inspect their visual response to candidate changes.
Do not modify:
- RUN-1;
- slide tackle;
- simulation;
- authoritative outcomes;
- collision geometry;
- solver/timestep;
- TRC-1 rendering;
- PVP records.
PVP will be an out-of-sample validation later.
2. Preserve the PPR-2 findings
Treat these as findings to investigate/implement, not invitations to tune freely:
Excitation: eliminate the zero-latency path. Pre-contact activation cannot change because of an unexpected disturbance until the relevant physiological delay has elapsed.
Passive elasticity: PPR-2 found mid-range passive elasticity is required. Use defensible human biomechanics rather than fitting it to PVP.
Eccentric resistance: PPR-2 found that V2's magnitude is broadly defensible but persistence is wrong. A muscle resisting a maintained lengthened state must not lose its eccentric support merely because joint velocity reaches zero.
Tone: PPR-2 found the current baseline co-contraction assumption leaves lightly statically loaded joints—particularly hip/trunk—far too weak.
Standing control: quiet standing requires continuous neural/postural feedback; passive mechanics alone need not maintain indefinite equilibrium.
3. Research the missing standing tone
Do a focused evidence review for standing/pre-activated:
- hip musculature;
- knee;
- lumbar/trunk;
- ankle where useful as a cross-check;
- neck/head stabilization if needed.
Prefer direct muscle-activity/co-contraction evidence where available.
Distinguish:
- measured human values;
- ranges inferred from biomechanics;
- model conversions;
- design choices.
Do not choose co-contraction values because they make V2 stand.
If the literature does not constrain a parameter adequately, say so and define a principled sensitivity range rather than pretending there is a precise human value.
4. Correct the pre-reflex qualification
PPR-2 correctly identified that a 300 ms "passive/pre-reflex" test is conceptually invalid once human postural feedback should have arrived.
Design and preregister a replacement qualification.
The pre-reflex substrate must be judged only inside a defensible physiological window.
Use literature to establish the appropriate timing rather than blindly adopting 175 ms.
Freeze:
- evaluation windows;
- perturbation magnitudes;
- directions;
- success ranges;
- joint-specific measurements;
- energy/integrity limits;
- standing-entry requirements.
Audit PPR-2's failed criteria that demanded yield in physically elastic directions. Do not silently change them. Explain and preregister any corrected criteria.
5. Candidate physiological substrate S2
Build the smallest candidate supported by the evidence.
It may include:
- corrected pre-contact excitation;
- joint-specific baseline co-contraction;
- intrinsic active stiffness;
- mid-range passive elasticity;
- realistic damping;
- persistent eccentric resistance;
- gravity/feed-forward support that is physiologically defensible.
Avoid a frozen target-pose spring wherever possible.
In particular, don't solve standing by creating enormous resistance to displacement.
The desired mechanical behavior is:
small perturbation → resisted but compliant
moderate perturbation → meaningful yield/sway
large perturbation → no-step balance can genuinely fail
The body should feel loaded, not locked.
6. Then build the continuous delayed postural controller separately
Only after S2 has been evaluated as a substrate, add a separate controller P2.
Architecturally:
S2 = body mechanics that exist now
P2 = nervous-system feedback based on past sensed state
P2 must run continuously before any disturbance. It must not be activated by collision.
Use physiologically defensible sensory/control delays. If different mechanisms require different delays, model or document that rather than forcing one global number.
Candidate sensed quantities may include physically available signals such as:
- joint state;
- foot load/pressure;
- COM estimate;
- COM velocity;
- trunk orientation/angular velocity;
- vestibular-like orientation state;
- support state.
Do not feed it future state or authoritative gameplay outcome.
Most importantly, prove causally that:
two identical worlds remain controller-identical after a disturbance until the disturbance reaches the controller through its delayed sensory state.
7. No stepping
PPR-3 remains no-step.
Feet may respond through contact mechanics and physically allowed ankle/foot motion, but no recovery foot may be deliberately repositioned.
We want to establish the limit of:
physiological body + delayed standing balance
before adding stepping.
Large enough disturbances should therefore topple it.
A controller that can save everything is a failure.
8. Standing initialization matters
Do not use PVP's hovering/rolled-foot entry.
Construct a clean standing qualification state in genuine physical equilibrium:
- feet correctly contacting turf;
- no artificial hover;
- no initial settling impulse masquerading as response;
- plausible ground loads;
- plausible COM/support relationship;
- no meaningful initial penetration;
- controller history appropriately initialized.
Measure the first 250 ms of undisturbed standing carefully so startup transients cannot hide inside the experiment.
9. Qualification battery
Preregister before final evaluation.
Include at least:
- undisturbed standing;
- small forward/backward perturbations;
- small lateral perturbations;
- moderate AP/ML perturbations;
- larger no-step disturbances expected to fail;
- isolated ankle/knee/hip/trunk response;
- held displacement/release;
- eccentric hold;
- deterministic repeats.
Evaluate S2 alone where scientifically meaningful and S2+P2 separately.
This should let us see:
mechanical response → delayed neural correction
rather than mixing them into one controller.
10. Instrument the chronology
For perturbation tests, produce a causal timeline:
t0: external force begins
mechanical: joints/body immediately respond
sensory delay: controller remains unaware
first feedback: P2's commands first differ from the undisturbed control
later: postural correction develops
Record:
- joint angles/velocities;
- torques;
- activation;
- stiffness/damping contributions;
- eccentric contribution;
- COM/support relationship;
- ground reactions;
- foot loading;
- pelvis/trunk/head state;
- controller command;
- controller's sensed timestamp;
- work/energy;
- actuator saturation;
- joint-anchor separation.
I want to be able to prove that no "instant nervous system" remains.
11. Human capability, not merely stability
Don't use "stood for N seconds" as the main success metric.
Compare against defensible human behavior where possible:
- sway;
- stiffness;
- damping;
- response latency;
- torque;
- load transfer;
- recovery dynamics;
- failure threshold.
A perfectly motionless standing character is suspicious.
Likewise, a character that slowly folds over despite continuous delayed control is inadequate.
12. Decide the V2 specification only after the evidence
Do not modify the canonical V2 spec at the beginning.
At the end tell me separately whether evidence supports adopting:
B: mid-range passive elasticity;
C: persistent eccentric resistance;
T: revised joint-specific standing tone;
P: continuous delayed postural control.
Some may be body properties; some may be controller properties. Keep that distinction explicit.
If existing V2 mechanisms can implement something without a body-spec change, prefer that over unnecessary architecture expansion.
13. Visual evidence
Give me synchronized views of:
CURRENT V2 | S2 | S2 + P2
for:
- undisturbed standing;
- one moderate forward perturbation;
- one moderate lateral perturbation;
- one deliberately unrecoverable no-step disturbance.
Normal speed and slow motion.
Include optional skeleton/COM/support overlays, but provide clean views too.
The visual question is:
Does this look like a living athlete maintaining balance rather than either a statue or a ragdoll?
14. Autonomy and stop condition
You may research, preregister, implement, run qualifications, diagnose failures and create clearly labelled successor candidates if a frozen candidate fails.
But do not visually tune candidates until one "looks right."
Preserve every preregistered result.
Continue only while each iteration addresses an identified causal failure with independently justified changes.
Do not start:
- PVP replay;
- tackle work;
- recovery stepping;
- RUN-1 integration;
- moving balance;
- fall/recovery animation.
Stop once either:
A. you have a defensible qualified standing architecture, or
B. you identify a fundamental blocker requiring my architectural decision.
15. Final report
Give me direct answers:
1. Can V2 now stand indefinitely enough for gameplay through physiological substrate + delayed control?
2. Is the body mechanically compliant before feedback arrives?
3. Is all disturbance-dependent control demonstrably delayed?
4. Are B, C and revised tone individually supported?
5. What does continuous postural control add?
6. Can the character still genuinely lose no-step balance?
7. Are hip/trunk/knee mechanics now inside defensible human ranges?
8. Is there any frozen-pose behavior left?
9. Are there any hidden instantaneous feedback paths?
10. What V2 specification changes should be adopted?
11. What remains before PVP can be unsealed?
12. CPU and determinism?
13. What surprised you?
14. Exact commits/files?
15. Exact localhost visual-review URL?
Do not return to the tackle. Stop for my review once the standing foundation is established.
