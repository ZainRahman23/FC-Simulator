# User instruction, 2026-10-12 05:00 BST (verbatim)

---

OVERNIGHT MISSION — M1b ADOPTION + HUMAN BALANCE SYSTEM
You have approval to proceed from MUSCLE-1.
Decision: adopt M1b as the V2 muscle/actuator architecture.
The objective for this session is to take the largest responsible step toward a genuinely active physical footballer:
Integrate the qualified M1b muscle system into V2, then develop and qualify the best physiologically defensible continuous no-step balance controller you can.

Work autonomously for an extended session. Do not stop after the first failed candidate if the failure has a clear causal diagnosis and a principled successor can be preregistered.
Preserve failed candidates and evidence.
Do not return to PVP tonight. Do not use the tackle to tune the recipient.
1. Canonicalize MUSCLE-1 carefully
Adopt the M1b architecture, not merely its ankle fixture.
The character-owned force path is now:
controller intent/excitation
→ electrochemical delay
→ activation
→ developed force
→ intrinsic/elastic muscle mechanics
→ physical joint torque
→ articulated body
Controllers must no longer have a route that bypasses this by directly imposing instantaneous physical torque.
Preserve the existing 15/50 ms dynamics specifically as the activation/calcium stage where appropriate.
Adopt the MUSCLE-1 findings that passed qualification, including the energy-consistent redesign of C.
Preserve:
- tone T;
- minimum-effort rest statics;
- corrected stiffness caps;
- appropriate intrinsic mechanical response;
- passive elasticity where supported, without claiming necessity where MUSCLE-1 did not demonstrate it.
Do not silently generalize ankle/knee constants to body regions for which evidence has not been established.
2. Extend M1b only as much as BALANCE-1 requires
Research defensible force-development parameters for the muscle groups actually required for:
- ankle;
- knee;
- hip;
- lumbar/trunk;
- neck/head stabilization where necessary.
Arms may be included if materially relevant to balance.
Clearly distinguish:
measured human values
/ literature range
/ derived model value
/ design assumption.
Do not fit force-development constants to make the controller pass.
If evidence is insufficient, use preregistered sensitivity ranges rather than pretending there is a precise value.
Do not solve high-force sprint/kick/tackle muscle behavior tonight unless it is genuinely required by the standing qualification.
3. BALANCE-1
Build the successor to P2 on top of M1b.
P2 itself is historical evidence. Do not simply retune it.
The objective is:
A continuously active, delayed, coordinated human postural controller that can maintain standing and recover from disturbances within human capability, while genuinely failing when the disturbance exceeds that capability.

No stepping.
4. The controller controls a human body, not torques
The new controller must respect the M1b boundary.
Prefer:
movement/postural objective
→ coordinated neural control
→ muscle excitation
→ M1b
→ physical force
If an intermediate net-torque-intent allocator is necessary, it must convert intent to excitation while respecting physiological recruitment and M1b state.
The controller may not directly apply physical torque.
It may not reset muscle state.
It may not bypass force-development latency.
5. Continuous before disturbance
The balance system must already be operating before anything happens.
It cannot be triggered by:
- collision;
- push;
- tackle;
- STUMBLE;
- FALL;
- outcome class.
A disturbed and undisturbed twin must receive identical neural commands until delayed sensory information about the disturbance can causally reach the controller.
Prove this in the final qualification.
6. Sensory delay
Use physiologically defensible delayed information.
Investigate appropriate use of:
- proprioceptive joint state;
- muscle state;
- foot load/contact;
- COM estimate;
- trunk orientation/angular velocity;
- vestibular-like orientation;
- support geometry.
Do not use current perfect state merely because the engine has it.
Do not use future state.
Do not use authoritative gameplay outcome.
Record the timestamp of the physical state underlying every controller observation so causal delay can be audited.
7. Coordinated control
P2's joint-local approach produced poor behavior.
Treat standing balance as a whole-body coordination problem.
Coordinate where justified:
- ankle;
- knee;
- hip;
- pelvis;
- trunk;
- head;
- arms.
Do not force every joint to return independently to a frozen pose.
The system should regulate physically meaningful objectives such as body/support relationship, orientation, momentum and posture while allowing natural joint variation.
8. Model-based prediction is allowed, but constrain it
Astra suggested a delayed multi-joint controller with state estimation/prediction.
You may investigate that.
But do not create an omniscient robot.
Any prediction must use only:
- delayed observations;
- known character dynamics;
- previous motor commands;
- physically plausible internal state.
It may not see the actual current disturbance before sensory delay permits it.
Compare at least:
A. coordinated delayed feedback without prediction
against
B. limited model-based state prediction
if the evidence justifies B.
Adopt prediction only if it materially improves human-like behavior without producing superhuman capability.
9. Build the correct standing state
Do not reuse the old hovering/rolled-foot PVP entry.
Create a physically settled standing state:
- proper turf contact;
- realistic bilateral loading;
- no artificial hover;
- no rolled-foot startup artifact;
- plausible COM;
- initialized muscle state;
- initialized sensory history;
- initialized controller history;
- no hidden settling impulse.
The player should begin the experiment as though he had already been standing there.
10. Preregister the final battery
Before judging the final candidate, freeze a qualification battery.
Include:
- quiet standing;
- small forward push;
- small backward push;
- small left/right push;
- moderate forward/backward;
- moderate lateral;
- large forward/backward;
- large lateral;
- deterministic repeats.
Use independently justified disturbance magnitudes.
Do not choose them after observing candidate behavior.
Include human comparison ranges wherever defensible.
11. What human-like success means
I do not want an invincible character.
Desired continuum:
quiet standing
→ small natural sway
tiny disturbance
→ small compliant correction
small disturbance
→ coordinated no-step recovery
moderate disturbance
→ substantial ankle/hip/trunk response and visible effort
large disturbance
→ no-step strategy fails and the character genuinely topples
The character should neither:
- behave like a statue;
- behave like a ragdoll;
- recover everything;
- collapse from trivial disturbances.
12. Human metrics
Measure and compare where supported:
- sway amplitude;
- sway frequency;
- COM/COP behavior;
- recovery time;
- onset of neural correction;
- muscle excitation;
- activation;
- developed force;
- joint torque;
- torque slew;
- ankle/knee/hip/trunk coordination;
- joint displacement;
- ground reaction;
- foot load transfer;
- head stabilization;
- actuator saturation;
- muscle work;
- passive/elastic work;
- total energy;
- momentum;
- failure threshold.
Specifically demonstrate that the superhuman P2 torque-rise problem is gone under M1b.
13. Don't optimize only for standing
A controller that stands beautifully but has enormous resistance to perturbation is not acceptable.
Conversely, a controller that produces realistic sway but cannot resist small pushes is not acceptable.
Qualification must cover:
stability + compliance + recovery + genuine failure.
14. Visual quality matters
Produce synchronized clean comparisons where useful:
CURRENT V2
| S2 + old P2
| M1b + BALANCE-1
Show at least:
- quiet standing;
- small disturbance;
- moderate forward disturbance;
- moderate lateral disturbance;
- unrecoverable disturbance.
Give me:
- 1×;
- slow motion;
- gameplay camera;
- close view;
- optional skeleton/COM/support overlays.
I want to be able to judge:
Does this finally look like a living footballer trying to keep his balance?

Do not visually tune around failed physics criteria.
15. Failure is allowed
If BALANCE-1 fails, diagnose why.
You may build principled BALANCE-1 successors during the session if:
- the previous result is frozen;
- the failure is causal and measurable;
- the successor addresses that specific cause;
- new parameters come from evidence or preregistered reasoning rather than visual parameter search.
Do not spend the session brute-force optimizing gains.
16. Keep PVP sealed
Even if the final character looks excellent:
DO NOT RUN THE TACKLE.
Astra is independently developing the physical tackler from the attached reference.
We will bring the two systems together only after both are independently trustworthy.
Do not modify:
- PVP;
- slide;
- Astra's worktree;
- RUN-1;
- authoritative simulation;
- tackle outcomes;
- gameplay collision geometry.
17. Preserve simulation neutrality
None of this changes gameplay results.
No balance state writes into authoritative simulation.
No physical fall changes a recorded STUMBLE/FALL result.
No hidden outcome knowledge.
Maintain determinism and auditable state.
Include all new muscle/controller state in snapshot/hash requirements as appropriate.
18. Performance
Measure:
- M1b cost;
- controller cost;
- total physical-character cost;
- state size;
- snapshot cost;
- 22-player estimate where meaningful.
Correctness first, but identify obvious production risks.
Overnight autonomy
Work autonomously for the session.
Research when needed.
Implement when justified.
Run the experiments.
Preserve failed results.
Create review tooling.
Commit coherent milestones locally.
Do not push unless existing project publication rules require it.
Do not stop simply because the first BALANCE candidate fails.
Continue while there is a clear evidence-backed next experiment.
Stop if further progress would require:
- PVP;
- stepping;
- changing simulation;
- changing RUN-1;
- guessing unsupported physiology;
- major canonical anatomy changes;
- visual parameter search without causal justification.
Final report
When finished, answer:
1. Is M1b now cleanly integrated into canonical V2?
2. What muscle groups/parameters were added?
3. What remains unparameterized?
4. What BALANCE architecture won?
5. Does all disturbance-dependent neural control remain causally delayed?
6. Does M1b prevent superhuman instantaneous torque?
7. Can the player stand naturally?
8. Is sway human-like?
9. Can small disturbances be recovered?
10. Can moderate disturbances be recovered plausibly?
11. Does lateral balance work?
12. Can sufficiently large disturbances genuinely topple the player?
13. Does recovery coordinate ankle/knee/hip/trunk naturally?
14. Any remaining frozen-pose behavior?
15. Any hidden instantaneous feedback?
16. Any energy/momentum problems?
17. CPU/determinism/state cost?
18. What failed during the night and what did you learn?
19. What surprised you?
20. What remains before PVP?
21. Exact commits/files.
22. Exact localhost review URL.
Finish with:
RECIPIENT STATUS:
A. QUALIFIED FOR OUT-OF-SAMPLE PVP VALIDATION
B. PROMISING BUT BALANCE NOT YET QUALIFIED
C. FUNDAMENTAL ARCHITECTURAL BLOCKER
Do not actually run PVP regardless of the verdict. Stop for my review.
The objective tonight is not to make a good tackle reaction.
It is to finish the best independently validated physical human we can, so that when we finally tackle him, his reaction emerges rather than being authored.
