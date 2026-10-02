<!-- preserved verbatim from Claude session d4761610-c35f-4019-9308-cb83973e7b76, transcript line 1074. -->

# Touchline: independent physical-character architecture review

## Executive assessment

**Keep the fully dynamic Jolt architecture provisionally, but make its next milestone “explainable disturbance response,” not “make D6 fall.”** Your description establishes a promising separation between intention and physical motion. It does not yet establish that the character’s resistance, support mechanics, or recovery controller are human-plausible.

The standing player’s stability in D6 has at least three defensible explanations: the impact barely disturbed the load-bearing system; the disturbance was substantial but recoverable; or the simulated character has excessive mechanical or control authority. Those explanations require different changes.

My recommended locomotion direction is a **hybrid, contact-aware controller**: explicit support states, continuous gait phase, physically reachable footstep planning, task-space balance objectives, and one bounded actuator layer. Reference animation should supply motion preferences—not a second authoritative trajectory. SIMBICON and *Generalized Biped Walking Control* demonstrate relevant components without requiring an engine migration. Learned controllers such as DeepMimic and DReCon offer a credible later option, but are not prerequisites for establishing trustworthy mechanics. :chatgpt-content-reference{index="0"}

**Scope of the conclusions:** I have your architecture description, not instrumented D6 runs. The research findings below are sourced; recommendations are proposed architecture; suspected Touchline problems remain hypotheses.

---

# 1. D6: what should determine whether the player recovers or falls?

## 1.1 A shin collision is not a whole-body knockdown specification

**Established mechanics.** For the entire standing character, over an impact interval:

\[
\Delta\mathbf P
=
\mathbf J_{\text{opponent}}
+\mathbf J_{\text{ground}}
+M\mathbf g\,\Delta t
+\mathbf J_{\text{other external}}
\]

Here \(\mathbf P=\sum_i m_i\mathbf v_i\), and each \(\mathbf J\) is an impulse. Internal joint forces and properly paired motor torques redistribute motion but do not supply net external linear momentum.

Therefore, **the tackler’s initial momentum is not the momentum necessarily delivered to the standing player**. Contact direction, relative velocity at the actual contact point, limb configuration, effective mass, and the ground response all matter. Nor should two grounded players conserve their combined momentum: the ground is an external participant.

A second mechanism is equally important:

> **An impact can remove useful support without imparting a large whole-body impulse.**

Displacing a loaded foot or folding a supporting leg can leave gravity to generate the subsequent collapse. Conversely, an appreciable contact impulse can be opposed by ground impulse while support remains viable.

**Recommendation.** Separate two questions in D6:

1. How much linear and angular disturbance entered the standing character?
2. How much support and recovery capacity remained afterward?

“Shin moved 10 centimetres” answers neither adequately.

## 1.2 Loaded versus unloaded contact

**Research context.** Football injury video research identifies direct-contact, indirect-contact and noncontact mechanisms, with being tackled, tackling/pressing, and sliding among relevant situations. A recent study analysed 140 ankle-injury videos. However, an injury-selected dataset does **not** establish the probability that an otherwise healthy standing player should fall after an arbitrary tackle. :chatgpt-content-reference{index="1"}

**Mechanical interpretation for Touchline:**

| Contact situation | Plausible mechanical consequence | What would make the current stability suspicious? |
|---|---|---|
| Near leg carries little load | The limb deflects while the other leg maintains support. | Treating its displacement as evidence that the whole body must fall. |
| Loaded leg, foot remains planted | Impact produces a closed-chain response involving ankle, knee, hip and ground reactions. | Support survives only through excessive joint-limit impulses, impossible ankle moments or hidden foot anchoring. |
| Loaded foot slips or is displaced | The support location and available ground-force direction change. | Controller continues using the old support location or assumes an unavailable contact wrench. |
| Impact pushes knee toward flexion | Supporting height can decrease unless joint resistance and the other leg compensate. | Knee remains effectively rigid despite exceeding the calibrated actuator and passive-resistance envelope. |
| Impact pushes toward an extension limit | The skeletal constraint can transmit substantial load without much visible flexion. | Incorrect joint axes or an overextended resting posture create an unintended structural strut. |
| Unloaded leg is obstructed during recovery | Immediate balance may survive, but the next necessary step becomes unavailable. | Recovery planning ignores the opponent occupying the required swing or landing space. |

These are hypotheses to discriminate, not reasons to soften every joint.

**Measure actual loading.** “Near leg,” “stance leg,” and “planted leg” should not be interchangeable labels. Record each foot’s normal impulse or force over a short pre-impact window, its contact patch, and its slip state.

## 1.3 Planted feet, friction and compliance

**Established evidence.** Boot–surface interaction is not fully described by one translational friction coefficient. Experimental turf research distinguishes rotational traction and finds that it can depend on surface construction and rotational velocity. A simple Coulomb-contact approximation should therefore be treated as a model choice, not a validated representation of football studs. :chatgpt-content-reference{index="2"}

**Recommendation.** Initially retain a simple contact model, but audit these separately:

- Translational sliding resistance.
- Resistance to yawing the foot.
- Heel/toe rocking and changes in the actual support patch.
- Ankle, knee and hip resistance—including passive limits, not just motors.

High friction does **not** imply “more realistic falling.” It can preserve support, redirect load into joint rotation, or prevent a harmless slip. Lower friction can cause loss of support but can also release a twisting load. The relationship is configuration-dependent.

A planted foot should mean **a contact currently capable of supplying the required force and moment**. It should not mean a world-space attachment.

Likewise, compliance must be located deliberately. If every anatomical rotation except sagittal knee flexion is effectively locked, the model may route an oblique collision through an unrealistically rigid chain. But adding unrestricted knee sideways motion simply to produce collapse would be an equally poor correction.

Unless tissue failure, pain and protective behaviour are separately modelled, the character represents a **noninjuring mechanical response**. It cannot be expected to reproduce every fall seen in injury footage.

---

## 1.4 Momentum must propagate mechanically before the person reacts

**Established evidence.** Human recovery is not instantaneous high-level replanning. Pijnappels and colleagues measured support-limb muscle responses at approximately **65 milliseconds** after unexpected mid-swing trips in young adults. Their study also showed that the untripped support limb contributed to recovery through push-off and regulation of whole-body angular momentum. These measurements concern a specific walking perturbation, not a universal tackle latency. :chatgpt-content-reference{index="3"}

DeMers, Hicks and Delp’s ankle-landing simulations separately illustrate why **pre-existing activation** matters: preparatory co-activation could resist rapid inversion where a delayed reflex could not prevent the initial excessive motion. This was a simulated inclined landing, not a slide tackle. :chatgpt-content-reference{index="4"}

**Recommendation.** Represent three distinct mechanisms:

**Immediate mechanical response.** Contact impulses, anatomical constraints, passive compliance and resistance from already-active musculature act immediately. Do not insert a neural delay into collision resolution or joint-force transmission.

**Delayed feedback response.** Reflex-like changes in activation respond to sensed disturbance after a bounded delay.

**Task-level recovery.** Weight redistribution, replacement footholds and action cancellation respond through a slower, rate-limited decision path.

Do not implement reaction time by switching every motor off after impact. A surprised standing person does not become mechanically passive before responding.

Conversely, do not let the balance controller inspect the post-impact state and instantly choose perfect new whole-body targets with unrestricted target acceleration.

**Touchline experiment:** compare feedback delays of 0, 50, 100, 150 and 250 milliseconds while preserving the same pre-impact activation and passive mechanics. These are **diagnostic sweep values**, not asserted human constants.

A crucial distinction: **freezing pose targets does not freeze feedback**. A PD motor still reacts immediately to new position and velocity errors. A separate frozen-activation or frozen-command experiment is needed to isolate that contribution.

---

## 1.5 “Finite motors” is necessary, but far from sufficient

### Jolt-specific checks

Current upstream Jolt documentation exposes several important audit points. Check them against the **pinned version and bindings actually used by Touchline**.

| Check | Why it matters |
|---|---|
| **Angular torque limits versus linear force limits** | Jolt’s linear force limits do not constrain angular motors. Default motor limits are extremely large unless explicitly replaced. :chatgpt-content-reference{index="5"} |
| **Motor resistance versus anatomical-limit resistance** | SixDOF joints have separate motor, limit and friction settings. Finite motor torque does not establish finite resistance from every other constraint path. :chatgpt-content-reference{index="6"} |
| **Zero-frequency limit springs** | In the documented spring/limit configuration, nonpositive frequency produces hard limits—not a disabled, freely compliant spring. :chatgpt-content-reference{index="7"} |
| **Position versus velocity motor mode** | Position spring settings are not used by velocity motors. Tuning a spring may therefore fail to change the active resistance mechanism. :chatgpt-content-reference{index="8"} |
| **Constraint coordinate frames** | For SixDOF, documented angular-velocity targets use body 2’s constraint space, whereas several other targets use body 1’s. Verify conversions and bilateral symmetry. :chatgpt-content-reference{index="9"} |

### Controller-level checks

**Recommendation.** Establish a single actuator contract containing joint-specific torque limits, speed-dependent capability, activation/rate limits, stiffness and damping, and positive/negative work diagnostics.

The final combined command must obey that contract. A pose controller, balance controller and recovery controller should not each independently receive a full strength allowance.

Track:

\[
P_j=\tau_j\dot q_j
\]

alongside torque, joint speed and accumulated positive/negative work. A torque cap alone permits implausibly large power at high speed; a power cap alone does not bound static resistance near zero speed.

Do not require identical shortening and lengthening capability, or identical limits across every joint axis. Do not transplant a measured joint moment from one experimental task as a universal strength limit.

**Numerical stability is not biological plausibility.** Stable-PD research demonstrates how high-gain tracking can remain numerically stable. That is useful numerics, not evidence that arbitrarily stiff tracking is appropriate for a footballer. :chatgpt-content-reference{index="10"}

Finally, inspect all world-space force and torque applications. A desired world-space trunk orientation is legitimate; an unpaired torque applied directly to the trunk is an external actuator. SIMBICON is instructive here: its world-referenced torso objectives are realised through internal joint torques, including the stance hip. :chatgpt-content-reference{index="11"}

---

## 1.6 CoM, CoP and capture point: useful diagnostics, not a fall oracle

**Established research.** Hof’s extrapolated centre of mass incorporates velocity:

\[
\boldsymbol{\xi}
=
\mathbf c_{xy}+\frac{\dot{\mathbf c}_{xy}}{\omega_0},
\qquad
\omega_0=\sqrt{\frac{g}{h}}
\]

in the constant-height linear-inverted-pendulum approximation. This explains why a CoM still geometrically above the feet can nevertheless be dynamically difficult to stop. :chatgpt-content-reference{index="12"}

**Illustrative calculation—not a tackle threshold:** for a 75 kg character at a 1 m CoM height, a **net** horizontal impulse of 30 N·s changes CoM velocity by 0.4 m/s and shifts this approximate capture location by about **12.8 cm**. That could exhaust a small standing margin. It does not imply falling: ground impulse, stepping, changing height and angular-momentum regulation alter the result.

The reverse also matters: the capture point might barely move while an impact destroys the leg configuration needed to support the body.

Curtze and colleagues explicitly caution against treating margin of stability as a general measure of gait stability or applying its assumptions indiscriminately. Finite response time also restricts how much of the anatomical support area can actually be exploited. :chatgpt-content-reference{index="13"}

**Recommendation.** Log actual mass-weighted CoM—not merely pelvis position—and use capture-point estimates as one input to a broader support-feasibility test.

A viable support plan needs admissible ground forces, available joint torque, usable leg geometry and enough time. The basic ground restrictions include:

\[
F_n\geq0,\qquad
\|\mathbf F_t\|\leq\mu F_n
\]

plus a centre of pressure inside the actual available contact patch. These restrictions, together with an unactuated floating base, are central to physically grounded legged control. :chatgpt-content-reference{index="14"}

A foot touching the floor is not proof that it can supply the required wrench. An airborne running character is not necessarily falling because it currently has no support.

### Recovery selection without a tackle rule

**Engineering recommendation:**

| Controller assessment | Appropriate response |
|---|---|
| Current contacts can arrest the disturbance within available effort and time | Continue supported recovery. |
| Current contacts are insufficient, but a reachable, timely foothold restores viability | Initiate or modify a corrective step. |
| A single step is insufficient, but a short sequence remains feasible | Permit multi-step recovery rather than demanding an immediate return to standing. |
| No upright recovery has been found within available reach, time, torque and contact conditions | Abandon the nominal action and prioritise protective motion. Let the physical trajectory determine whether a fall occurs. |

This extends the idea of **N-step capturability**, rather than equating loss of static balance with falling. :chatgpt-content-reference{index="15"}

Importantly, “our planner found no recovery” is not mathematical proof that no human recovery exists. Record planner failure separately from physical inevitability.

---

# 2. What Claude should measure and test in D6

## 2.1 Minimum diagnostic record

Record at physics-step resolution, with a pre-impact baseline and enough post-impact time to include a delayed step or collapse.

| Diagnostic | Required measurements | Failure it distinguishes |
|---|---|---|
| **Body construction** | Segment masses, CoM locations, inertias, joint axes/limits, foot dimensions; collider and rendered-skeleton overlay. | Incorrect effective mass, oversized support, wrong joint geometry, visual/physical disagreement. |
| **Opponent contact** | Contact location/normal, relative contact-point velocity including rotation, solved normal/tangential impulse, duration and penetration. | Glancing or weak loading versus genuine large disturbance; missed rotational sweeps. |
| **Ground support** | Per-foot normal/tangential impulse, contact patch, CoP, sliding and yaw/rocking motion. | Legitimate ground cancellation versus pinned feet or fictitious support. |
| **Momentum and energy** | Whole-body and segment momentum; angular momentum; kinetic/potential energy; motor work and damping losses. | Where the disturbance went; unexplained stabilisation or energy removal. |
| **Actuation and constraints** | Requested and delivered motor effort, saturation duration, passive/limit impulse, target errors. | Superhuman motors, hard-stop bracing, wrong frames, stacked controllers. |
| **Recovery timing** | Observation timestamp, filtered state, decision time, step initiation, actual liftoff/touchdown, rejected footholds. | Zero-latency control, delayed planning, wrong leg selection, unreachable steps. |
| **Numerics and authority** | Timestep, collision substeps, iterations, sleeping, damping, direct velocity/pose changes, external-force ledger. | Solver dependence or a hidden nonphysical support path. |

**Important Jolt telemetry caveat:** `OnContactAdded` occurs before the solver has resolved the collision; the documented impulse is unknown at that point. An estimated impact response is not a measured solved impulse. Also, sleeping can cause contact-removal callbacks, so callback bookkeeping alone is not a reliable physiological support detector. :chatgpt-content-reference{index="16"}

Where SixDOF joints are used, Jolt exposes accumulated motor and constraint lambdas as impulses. Confirm the accumulation interval and binding availability before converting them to force or torque; do not blindly divide a substep impulse by a render-frame duration. :chatgpt-content-reference{index="17"}

## 2.2 Experiments that distinguish causes

### A. Establish the impulse pathway before changing balance

Use controlled torso, shin and foot perturbations with known application points and impulses. Compare these with the actual articulated slider.

**Interpretation:** if controlled disturbances behave sensibly but the slider does not, investigate delivered contact impulse and geometry before redesigning recovery.

Keep the unperturbed baseline: a motor-disabled character falling anyway does not demonstrate that the tackle caused a fall.

### B. Separate passive structure, tracking and recovery

From equivalent settled states compare:

**Pre-impact activation held briefly → pose tracking only → balance without stepping → full recovery.**

Also test targets-held separately from commands-held.

**Interpretation:** stability present in the passive/held-command case points toward structure, loading and contact. Stability appearing only with instantaneous feedback points toward control authority.

### C. Change load and impact direction independently

Sweep measured near-leg loading—for example, roughly 10%, 50% and 90%—while controlling stance geometry. Then vary contact height and direction to favour knee flexion, extension-limit loading, or sideways displacement.

**Interpretation:** the same slider speed can produce materially different outcomes. A model that barely distinguishes these cases warrants inspection.

### D. Separate support displacement from whole-body impulse

Compare a horizontal body impulse with a foot-displacement or support-removal perturbation. Separately block the candidate recovery foothold.

**Interpretation:** this tests whether recovery reasons about available support and future foot placement, rather than only pelvis tilt or velocity.

### E. Sweep actuator capability and latency separately

Vary strength, activation rate, damping and feedback delay one at a time before combining them.

**Interpretation:** “lower strength finally makes it fall” is not enough. Identify whether the original error was excessive force, excessive bandwidth, too much damping, or an unrealistic recovery decision.

### F. Test numerical convergence and hidden actuation

Halve the physics step and independently increase solver iterations while keeping the high-level control period and physical parameters fixed. Repeat near and away from outcome boundaries.

Jolt documents that `LinearCast` CCD can still miss contacts caused by fast rotation of long objects. Preserve dedicated rotating-shin and rotating-foot tests even when the current translational slide appears correct. :chatgpt-content-reference{index="18"}

Separately run an unsupported character with gravity accounted for and extraneous damping disabled. Internal motors may change its shape and energy, but must not create unexplained whole-body momentum.

### What would justify expecting a fall?

A defensible case requires evidence that the impact removes current support or exceeds no-step recovery, **and** that feasible replacement support cannot be achieved in time under calibrated actuator and response limits.

Until those conditions are established, D6 remaining upright is an observation—not a failed realism test.

---

# 3. Physical locomotion: architecture comparison

## 3.1 Major options

| Approach | Evidence and strengths | My assessment for Touchline |
|---|---|---|
| **Pose tracking with a timed gait state machine** | Simple and inspectable, but feedback and support adaptation are needed beyond a nominal pose sequence; SIMBICON provides an important extension. :chatgpt-content-reference{index="19"} | Useful baseline, insufficient as the whole architecture. |
| **Contact-aware feedback, foot placement and virtual-model control** | *Generalized Biped Walking Control* combines PD tracking, inverted-pendulum foot placement and Jacobian-transpose corrections, including starts, stops, turns and varied speeds. :chatgpt-content-reference{index="20"} | **Best first implementation direction:** understandable, modular and compatible with Jolt-owned contacts. |
| **Model-based planning plus whole-body optimisation** | Floating-base dynamics, constrained contact forces and optimisation provide explicit feasibility reasoning. :chatgpt-content-reference{index="21"} | Valuable when simpler control cannot allocate effort consistently. More modelling and debugging cost; not necessary to begin with full MPC. |
| **Learned physical control** | DeepMimic learns imitation plus task objectives; DReCon combines motion-matched references with learned corrections to physical control targets. :chatgpt-content-reference{index="22"} | Strong later option for motion quality and skill breadth. Requires calibrated training physics, actuator restrictions and held-out collision testing. |
| **Muscle/reflex-based control** | Geyer–Herr and Geijtenbeek et al. show locomotion through muscle/reflex models, with the latter including activation/contraction dynamics and delayed feedback. :chatgpt-content-reference{index="23"} | Useful biomechanical reference. Borrow activation and capability constraints before committing to a full muscle model. |

The author-linked Cartwheel implementation and DeepMimic’s public code are useful architectural references. They should not be treated as drop-in controller binaries for a different engine and body model. :chatgpt-content-reference{index="24"}

**Recommendation:** retain Jolt and build a replaceable controller above a stable actuator/observation interface. Nothing in the reviewed approaches creates a compelling requirement to migrate to Unity or Unreal.

---

## 3.2 Recommended control structure

\[
\text{football intention}
\rightarrow
\text{feasible motion/footstep plan}
\rightarrow
\text{task and pose targets}
\rightarrow
\text{bounded internal actuation}
\rightarrow
\text{Jolt contacts and dynamics}
\rightarrow
\text{actual body state}
\]

Feed the actual state back to planning and reference selection.

There should be **one final actuator arbiter**, not independent pose, balance and collision systems competing through unrelated force budgets.

If using inverse dynamics or optimisation, predicted contact forces are constraints and planning variables. **Do not apply those forces directly and also allow Jolt to generate the same contact response.** That would double-count support.

## 3.3 Gait phase and support switching

**Recommendation.** Use a hybrid representation:

- A continuous phase for rhythmic targets and reference sampling.
- Per-foot states such as loading, stance, unloading and swing.
- A separate record of actual contacts and measured load.

SIMBICON’s combination of state transitions, contact events and balance feedback is a relevant starting point; its simplicity is more useful here than copying a particular character’s tuned gains. :chatgpt-content-reference{index="25"}

The controller should distinguish **planned touchdown** from **actual touchdown**. Early contact should modify swing control rather than continue driving the foot through the floor. Missing contact should invalidate expected support rather than advance as though the foot landed.

Use contact hysteresis and minimum dwell times to prevent chatter, but do not let those filters preserve fictitious support through a meaningful separation.

Support switching should depend on load acceptance and state feasibility—not just a timer expiring.

## 3.4 Footstep planning and swing trajectories

**Recommendation.** Plan the next foothold and its landing time together, using actual CoM state, current support, commanded velocity, turn demand, leg reach and collision-free access.

The reachable set must include **time**: a geometrically reachable foothold may be impossible before collapse. Likewise, a capture-location estimate can be occupied by the opponent.

Generate smooth swing-foot targets from the actual liftoff state through a clearance region to a feasible landing pose. Bound swing speed and acceleration; replan without discontinuously jumping the target.

Inverse kinematics can produce joint targets. It must not write the physical pose.

Measure actual landing error against the intended foothold. Distinguish sliding of a planted foot from legitimate movement of the contact point during heel-to-toe rocking.

## 3.5 Stance-foot, pelvis and trunk control

**Recommendation.** Stance control should organise force transmission through internal joints while permitting physical rocking, slip and liftoff.

A world-space foot target is acceptable **as a finite objective**. A foot locked to the world is not.

Pelvis height should remain compatible with leg reach and support loading. Trunk orientation should support the intended acceleration and angular-momentum management, not remain perfectly vertical under every condition.

Avoid simultaneously demanding an exact pelvis trajectory, exact trunk orientation, exact stance-foot transform and exact reference pose with competing high gains. Use clear priorities: contact feasibility and balance before motion style.

For the initial 14-body model, test whether rigid feet with suitable collision geometry provide adequate rocking and push-off. Add toe articulation only if measurements show that the simplified foot is the limiting mechanism—not because a more detailed skeleton automatically looks more credible.

## 3.6 How forward speed must actually arise

**Established mechanics.**

\[
M\ddot{\mathbf c}_{xy}
=
\sum \mathbf F_{\text{ground},xy}
+
\sum \mathbf F_{\text{other external},xy}
\]

Internal actuation does work and changes leg configuration; the feet push against the ground; ground reaction accelerates the body. Swinging the legs or leaning the trunk does not independently create external propulsion.

In a muscle-actuated running study, Hamner, Seth and Delp found major early-stance braking/support contributions from the quadriceps and later propulsion/support contributions from the plantarflexors. Arm motion contributed importantly to angular-momentum coordination rather than serving as a major propulsion source. These are informative mechanisms, not actuator values to copy directly. :chatgpt-content-reference{index="26"}

**Recommendation.** Build speed regulation around foot placement, stance timing and physically produced stance work. Audit stride-level impulse:

For steady level locomotion over a complete periodic interval \(T\),

\[
\int_0^T F_z\,dt=MgT
\]

and net horizontal impulse should approximately vanish when speed is unchanged and other horizontal external forces are negligible.

Acceleration requires positive net horizontal impulse; braking requires negative impulse. During flight, horizontal CoM motion should not follow a commanded speed change without an external force.

## 3.7 Reference animation and gait transitions

**Recommendation.** Reference animation should provide preferred joint configurations, timing, coordination and style. Its root trajectory may inform desired speed or future direction, but must never become a pelvis position constraint.

Rebase reference selection to the actual character. Otherwise an advancing reference can leave the body behind, generating ever-larger tracking errors and effectively becoming an elastic root tether.

DReCon is particularly relevant conceptually: a reference-motion generator feeds a feedback policy that adjusts physical-control targets, rather than simply replacing simulated motion with animation. :chatgpt-content-reference{index="27"}

Do not make jogging an entirely separate physical architecture. Treat it as the low-speed region of a running controller family, while distinguishing the contact and energy behaviour required by the chosen gait.

A walking-to-running transition should change stance timing, loading, push-off and swing requirements—not merely play the same pose sequence faster. For the first running gate, deliberately select a reference with a clear flight phase so that propulsion and landing are unambiguous.

## 3.8 Acceleration, braking and turning

**Recommendation.** Introduce start/stop and modest speed regulation with walking, not after a fixed-speed walking controller has been “finished.”

Turning must be coupled to speed. For a steady idealised curve,

\[
a_{\text{lateral}}=\frac{v^2}{R}
\]

so doubling speed at the same radius quadruples lateral acceleration demand. Combined braking and turning must share available traction.

Produce heading changes through foot placement, ground moments and internal coordination. Do not rotate the whole articulated character to match a desired heading.

When a command exceeds the feasible envelope, the controller should widen the turn, reduce speed, take extra steps, or physically lose balance. Perfect execution of every command would be evidence against finite capability.

## 3.9 External contacts and football actions

**Recommendation.** Perturbations belong in every gait-development stage. Test stance loading, unloading, early swing, late swing and touchdown; do not reserve collisions for a final animation layer.

Locomotion-to-slide should be a physically attempted action: prepare posture, lower the body, redistribute support, extend the intended leg and enter sliding contact with inherited momentum. Do not inject a prescribed slide velocity or teleport into the tackle’s initial pose.

Action-specific control objectives are legitimate. Action-specific contact cheats are not. Material friction may differ between boots, kit and ground; it should not change merely because an action label says “tackle.”

**Authority boundary:** football logic can remain authoritative for rules and outcomes, but it cannot also insist on a player transform that conflicts with the physical body. A scheduled action that the actual foot cannot reach must be delayed, rejected or otherwise adjudicated explicitly—not rescued by moving the body or rendering an unreal contact.

That contract needs resolution before football integration.

---

# 4. Determinism and performance

**Established engine constraints.** Jolt documents determinism requirements involving ordered modifying calls and matching binaries/configuration, with a cross-platform deterministic build option. It also identifies nondeterministic query/callback ordering and application-side floating-point concerns. Engine determinism does not automatically make an external controller deterministic. :chatgpt-content-reference{index="28"}

**Recommendation.** Freeze physics and control schedules independently. Use deterministic ordering for contact reductions, foothold candidates and tie-breaking. Avoid wall-clock-dependent iteration budgets.

Rollback/replay state must include more than rigid-body transforms: gait phase, support latches, reference cursor, planned footsteps, activation states, filters, observation-delay buffers, integrators, random state and optimiser warm starts all influence the future.

Test replay hashes over **physics plus controller state** on the actual supported runtime/build matrix. Deterministic neural inference is possible in principle, but must pass the same tests rather than receive an exemption.

For performance, measure controller cost separately from Jolt collision and constraint solving. Record worst-case contacts and solver work, not just an empty two-character scene. Before broad integration, benchmark the intended match population and contact density without changing fidelity or solver budgets opportunistically during a replay.

---

# 5. Proposed gated roadmap

I would change your ordering in four ways:

**Put instrumentation first. Include speed control and stopping inside walking. Introduce isolated flight/landing mechanics before sustained running. Keep perturbation regression active throughout.**

The following gates are engineering proposals, not published physiological standards.

## Common acceptance contract

For every gate, use predeclared initial states, commands, morphology and surface conditions. Preserve a held-out set. Do not retune individual trials.

Suggested starting budgets are **3 cm foothold error**, **0.15 m/s steady walking-speed error**, and **5% change in integrated impulse metrics under timestep refinement**, away from genuinely sensitive outcome boundaries. These values must be confirmed or replaced before acceptance testing; they are not claims about human variability.

Every gate also requires bounded actuation, no pose/velocity overwrites, no hidden support, no missed-contact regressions, and deterministic replay. Contact penetration and joint-error budgets should be fixed during Gate 0 and carried forward.

## Gate 0 — Explainable mechanics and disturbance envelope

**Capability:** account for support, actuation and impact before extending locomotion.

**Pass/fail:** controlled impulse tests close the momentum balance within a declared numerical tolerance; unsupported motor tests reveal no unexplained external momentum; actual motor effort respects configured bounds; timestep refinement meets the agreed convergence budget. D6 need not fall.

**Diagnostics and failure modes:** the full D6 record above; especially hard-limit bracing, incorrect torque caps, body damping and support bookkeeping.

**Physical authority:** impulses, joint constraints and body state.

**Out of scope:** attractive gait, football actions and fitting human fall probabilities.

## Gate 1 — Repeatable load transfer and individual steps

**Capability:** unload either foot, lift it, place it and accept weight without external support.

**Pass/fail:** complete 20 alternating steps over several forward and lateral placements, meeting the foothold budget without unintended non-foot support. Small, known disturbances must produce an interpretable supported recovery or extra step.

**Diagnostics and failure modes:** load transfer before liftoff, toe clearance, actual landing error, ankle effort and contact chatter. Watch for dragging a still-loaded foot or silently pinning the other foot.

**Physical authority:** actual liftoff, landing and load acceptance.

**Out of scope:** continuous running, sharp turns and polished upper-body style.

## Gate 2 — Walking with starts, speed changes and stops

**Capability:** generate continuous walking, not merely repeat isolated poses.

**Pass/fail:** at three predeclared walking speeds, complete 30 seconds of walking, transition between speeds, and stop inside an agreed corridor. Meet the steady-speed budget without root assistance or unintended body support.

**Diagnostics and failure modes:** stride impulse, accumulated foot slip, phase/contact agreement, speed error and stopping steps. Failure includes “correct speed” achieved by pelvis forces, or a walk that cannot start and stop from its own physical state.

**Physical authority:** forward acceleration and braking arise through contacts.

**Out of scope:** running and aggressive football cuts.

## Gate 3 — Three-dimensional walking and constrained recovery

**Capability:** steer in both directions and recover when the obvious next step is unavailable.

**Pass/fail:** complete predefined left/right circles and S-curves with measured speed/radius error; pass a disturbance matrix across stance and swing. In blocked-foot cases, either choose an available alternative or record a genuine recovery failure—never step through the obstacle.

**Diagnostics and failure modes:** lateral momentum, yaw impulse, reachable footholds, crossover collisions and delayed support switching.

**Physical authority:** heading changes and replacement contacts.

**Out of scope:** high-speed turning and arbitrary terrain traversal.

## Gate 4 — Propulsion, flight and landing mechanics

**Capability:** produce a controlled stance-to-flight-to-landing sequence with the existing articulated body.

**Pass/fail:** achieve a prescribed modest takeoff/landing target through internal actuation and ground impulse; show an actual no-ground-contact interval; preserve ballistic CoM motion in flight; absorb landing within actuator and contact budgets.

**Diagnostics and failure modes:** vertical impulse, motor work, foot rocking, knee compression and landing penetration. Watch for hidden launch impulses, artificial mid-air steering and spring settings that inject or dissipate excessive energy.

**Physical authority:** takeoff velocity, flight and landing response.

**Out of scope:** sustained high-speed running and acrobatics.

This is a mechanical prerequisite test, not a requirement to build a separate hopping product.

## Gate 5 — Continuous low-speed running and gait transitions

**Capability:** connect propulsion and landing into repeatable running, including walk–run–walk transitions.

**Pass/fail:** complete 30 strides at each of two modest running speeds, then transition back to walking without resetting body state. The chosen running target must show its intended flight/contact pattern and bounded, repeatable stride energy.

**Diagnostics and failure modes:** stance duration, flight time, landing location, speed drift and sustained motor saturation. Failure includes a visually running gait that actually shuffles, skates or relies on a root tether.

**Physical authority:** contact schedule as realised, not merely as requested.

**Out of scope:** maximal speed, severe cuts and tackles.

## Gate 6 — Football-relevant running envelope

**Capability:** increase speed, accelerate, brake and turn within a measured capability envelope.

**Pass/fail:** pass a predeclared speed–acceleration–curvature matrix inside the calibrated envelope. Outside it, commands must be limited or fail physically rather than being executed with hidden authority. Repeat perturbations at different gait phases and verify replay and numerical convergence.

**Diagnostics and failure modes:** torque–speed limits, positive/negative work, traction utilisation, stopping distance and missed rotational contacts.

**Physical authority:** attainable speed, turn radius, braking and recovery.

**Out of scope:** guaranteeing success for arbitrary commands or simultaneously solving every football skill.

## Gate 7 — Football transitions and held-out interaction acceptance

**Capability:** enter and leave a small set of football actions—including a slide—without changing physical-body ownership.

**Pass/fail:** action entry preserves continuous pose and velocity; preparation is physically achievable; missed reach is handled explicitly; collision/recovery outcomes remain consistent across held-out load distributions, directions, timings and surfaces. Use the Reference Tackle as one held-out case, not the tuning target.

**Diagnostics and failure modes:** action preconditions, actual ball/opponent reach, support release, inherited momentum and recovery feasibility. Reject action-triggered velocity injection, collision filtering that hides contact, and tackle-specific falls.

**Physical authority:** the same bodies, joints, contacts and finite actuators throughout; football adjudication remains separately authoritative.

**Out of scope:** injury prediction, every animation family and a universal human fall model.

---

# Final recommendation to Claude

The most important unresolved issue is **not whether Touchline can produce more dramatic reactions**. It is whether its support and actuator models explain why a particular disturbance is absorbed, stepped out of, or unrecoverable.

For D6, first identify where the impulse went, which leg actually supported the body, how much resistance came from motors versus constraints, and when recovery commands changed. Then test the same mechanisms outside the tackle scenario.

For locomotion, proceed with contact-aware phase control, timed reachable footsteps and bounded internal actuation. Introduce start/stop early, validate propulsion and landing before sustained running, and preserve perturbation tests throughout.

**The acceptance target should be a measured range of recoverable and unrecoverable situations—not a character that always stays upright, and not a character that falls whenever a tackle looks severe.**

Now that you've visually checked the D6 spectrum and the physics look solid, I would move to locomotion architecture reconciliation, not implementation yet.
Paste the Astra report into Claude along with this prompt:
PHYSICAL LOCOMOTION ARCHITECTURE — RECONCILE CLAUDE + ASTRA BEFORE IMPLEMENTATION
I have now visually reviewed the D6 diagnostic cases, including the stronger fall-producing cases.
I approve the physical-contact foundation as sufficient to proceed.
The important result is that we now have a physically generated continuum:
absorbed contact → local disturbance → whole-body recovery → corrective step/stumble → support loss/fall
depending on the actual contact conditions, rather than a scripted tackle outcome.
Do not continue tuning D6 right now.
I am attaching/pasting an independent Astra research report on:
- disturbance response;
- biomechanics;
- active physical characters;
- Jolt considerations;
- locomotion architecture;
- a proposed locomotion roadmap.
Read the entire Astra report carefully.
Also reread your existing:
review_artifacts/physical_character_v1/LOCOMOTION_PROPOSAL.md
and the current physical-character handoff/report.
Your task is to critically reconcile your proposal with Astra's research and produce one final locomotion architecture and gated implementation plan.
Do not implement locomotion yet.
1. PRESERVE THE FOUNDATION
The following principles are now locked unless you uncover compelling evidence that requires me to reconsider them:
- Jolt owns the physical character's rigid-body state, contacts and constraints.
- The 14-body V1.1 physical character remains the working foundation.
- There is no hidden pelvis/root support.
- There is no kinematic capsule dragging the body around.
- There is no root-motion teleportation.
- Animation/reference motion may provide targets/preferences, but may not overwrite solved physical state.
- Joint motors have finite strength.
- Contacts can defeat intended motion.
- Actual ground contact is truth.
- Actual touchdown overrides planned touchdown.
- Physical support loss can produce recovery, stepping, stumbling or falling.
- Football simulation remains authoritative for football outcomes.
- Presentation/physical character must not secretly decide possession, tackle success, goals, etc.
The goal is not a ragdoll that happens to move.
The goal is an actively controlled physical footballer.
2. THE END GOAL
We ultimately need the same continuous physical character to support:
standing
→ starting
→ walking
→ jogging
→ running
→ accelerating
→ decelerating
→ turning
→ stopping
→ football actions
→ unexpected physical contact
→ recover / step / stumble / fall
without swapping to a separate nonphysical character architecture.
Eventually this must allow us to return to the preserved Reference Tackle, where the attacker genuinely runs into the interaction rather than being initialized at an artificial velocity/state.
Do not design locomotion specifically around reproducing that tackle, however. It should remain a later held-out football validation case.
3. CRITIQUE BOTH PROPOSALS
Compare your existing locomotion proposal against Astra's report.
For every substantive disagreement, tell me:
- Claude's original position;
- Astra's position;
- relevant evidence/research;
- your revised conclusion;
- what remains uncertain and therefore needs empirical testing.
Do not automatically defer to Astra.
Do not defend your previous proposal merely because you wrote it.
I want the strongest combined design.
Clearly distinguish:
research-supported principle
from
engineering choice
from
Touchline-specific hypothesis requiring testing.
4. ADDRESS ASTRA'S IMPORTANT ARCHITECTURAL POINTS EXPLICITLY
In particular, decide how the final architecture handles:
One actuator authority
Astra raised the danger that pose tracking, balance, locomotion and recovery could independently stack torque/strength.
Decide whether we should have a single final actuator arbiter/budget per joint.
Explain how requests from:
- reference pose;
- balance;
- stance;
- swing leg;
- reactive arms;
- protective fall;
- football action
combine without creating superhuman strength.
Planned versus actual contact
A foot may be intended to land at one time/place but physically contact:
- early;
- late;
- somewhere else;
- an obstacle;
- another player.
Define precisely how actual Jolt contact becomes authoritative and how gait state responds.
Reference animation
Decide what reference gait data controls.
It may provide things such as:
- desired joint configuration;
- relative phase;
- stylistic motion;
- nominal swing shape;
but must not directly translate the player through the world.
Explain the boundary.
Propulsion
This is critical.
Explain where forward motion actually comes from physically.
I do not want a run animation playing while some hidden root force moves the player.
Explain how:
stance leg + foot/ground interaction + finite joint torques
generate acceleration of the body's COM.
If limited physically justified feed-forward control is required, explain exactly what it represents.
Gait state
Decide how we represent:
- stance;
- swing;
- double support;
- liftoff;
- touchdown;
- flight;
- recovery;
- aborted/missed step.
Avoid a brittle animation state machine if continuous physical measurements can determine transitions.
Balance during locomotion
Explain how C1/C2/C3 evolve into locomotion rather than becoming a second competing controller.
Disturbances
External contacts must be allowed to alter gait.
A player hit during running should not continue following the gait as though nothing happened.
Define how locomotion degrades naturally into:
perturbed gait → corrective placement → stumble → fall
using the same physical character.
5. HUMAN LOCOMOTION VERSUS FOOTBALL LOCOMOTION
Do not optimize only for treadmill-style straight walking.
Eventually a football player needs:
- short explosive starts;
- variable stride lengths;
- acceleration;
- deceleration;
- curved runs;
- changes of direction;
- lateral adjustment;
- backward/side movement where appropriate;
- preparation for receiving/kicking;
- contact while moving.
But do not attempt all of that in V1.
Tell me which abstractions we need now so that early walking doesn't trap us in an architecture that cannot later support football movement.
6. AUTHORING STRATEGY
Decide what should be:
authored/reference data
versus
procedurally planned
versus
physically solved.
For example, consider:
- gait-cycle joint references;
- foot trajectories;
- phase;
- desired step location;
- pelvis/trunk posture;
- arm swing;
- push-off;
- touchdown;
- balance corrections.
I want enough authored information to produce believable human motion without turning the system back into canned animation.
7. RESEARCH WHERE NEEDED
You may perform additional targeted research if there are unresolved architectural questions.
Prefer:
- primary physically based character-control papers;
- biomechanics;
- robotics/humanoid locomotion;
- active-ragdoll work;
- Jolt source/documentation;
- credible technical implementations.
Do not spend hours broadly surveying the field if Astra has already adequately answered something.
Research should resolve specific design questions.
8. PROPOSE THE FINAL GATED ROADMAP
Astra suggested approximately:
Gate 0 — explainable disturbance mechanics
Gate 1 — repeated load transfer + individual steps
Gate 2 — continuous walking including start/speed change/stop
Gate 3 — 3D walking + constrained recovery
Gate 4 — propulsion / flight / landing
Gate 5 — continuous low-speed running
Gate 6 — football running envelope
Gate 7 — football transitions / Reference Tackle validation
Gate 0 is now substantially represented by the D6 work.
Critique and revise the rest.
I specifically like the principle of proving:
push-off → physical flight → physical landing
before calling anything "running."
For every final gate specify:
- exact objective;
- what gets implemented;
- what remains deliberately out of scope;
- deterministic test scenarios;
- numerical pass criteria;
- visual review criteria;
- expected failure modes;
- regression requirements;
- approximate performance budget;
- what decision I need to make before advancing.
9. DO NOT OVER-POLISH C3/C4/C5 FIRST
We have four known observations:
- C3 step refusal can become permanent;
- C1 has a small premature-release/re-engagement window;
- D6 is sensitive to arrival speed;
- shin contacts can be bistable.
C4 reactive arms and C5 protective falls also remain partial/off by default.
Decide which of these genuinely block locomotion Gate 1.
My current preference is not to spend substantial time polishing static tests that locomotion will immediately place into a richer context.
If something is not a blocker, leave it documented.
10. VISUAL QUALITY MATTERS
Passing numerical tests is not sufficient.
We previously produced physically/numerically defensible movement that looked extremely robotic.
Every locomotion gate must therefore separately evaluate:
physical validity
and
human motion quality.
Do not hide ugly motion with camera choices.
Build slow-motion/frame-step review into the harness.
Reference human gait footage or high-quality animation may be used for comparison, but not to dictate physical outcomes.
11. PERFORMANCE AND DETERMINISM
Preserve the current deterministic architecture.
Consider that a match eventually contains many players.
We do not need to optimize prematurely, but identify:
- expected per-character cost;
- expensive components;
- what can run at physics rate;
- what can run less frequently;
- where adaptive work is safe;
- how to avoid uncontrolled substep growth.
Continue keeping test runs sequential and Mac-friendly.
12. OUTPUT
Produce a final document:
review_artifacts/physical_character_v1/LOCOMOTION_ARCHITECTURE_FINAL.md
and a readable HTML version.
It should contain:
1. Executive architecture
2. Claude vs Astra reconciliation
3. Control stack
4. Actuator authority/budget
5. Support/gait state model
6. Footstep planning
7. Reference-motion role
8. Physical propulsion
9. Disturbance/recovery integration
10. Authored vs procedural vs physical responsibilities
11. Final gated roadmap
12. Test/validation strategy
13. Performance/determinism strategy
14. Known risks/open questions
15. The exact smallest first implementation gate
If diagrams would materially clarify the architecture, include them in the HTML using simple HTML/CSS/SVG rather than generating heavyweight media.
Do not implement locomotion.
Do not modify accepted physics behavior.
Do not start the Reference Tackle.
Do not push anything.
Stop after producing the architecture and give me your recommended first implementation gate for approval.
