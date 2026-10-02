<!-- preserved verbatim from Claude session d4761610-c35f-4019-9308-cb83973e7b76, transcript line 16697, pasted block 4 of 4; the user's own note: "read the 3rd text first as it is the prompt" -->

# Touchline’s remaining walking failure
## Preserve the working body, investigate the transition mechanics, and plan beyond the next landing

## A. Plain-English diagnosis

**Choose Path C—but make it planning-led, with stance changes gated by experiments.**

The next architecture should combine a **short-horizon foothold-and-timing planner** with the existing finite-motor stance and swing controllers. Keep **F0 and the corrected existing swing** as the baseline. Change stance mechanics only where measurements identify a specific defect, rather than first attempting to make every stance trace look more human.

The strongest new evidence is not the heel-biased centre of pressure. It is that the **same physical system performs substantially better when commands account for the following step**: ordinary control produces approximately 6–11 steps, one-step oracle selection 13–19, and two-step selection 26–28 in the reported trials. That directly establishes additional usable capability in the current body–controller combination. It does not yet establish sustained stability. :chatgpt-content-reference{index="0"} :chatgpt-content-reference{index="1"}

My leading diagnosis is:

> **The controller is failing to maintain a repeatable, recoverable step-to-step state. Its decisions and predictions insufficiently account for how the current landing prepares—or compromises—the next support transfer and swing. Stance mechanics may narrow that recoverable region, but have not been established as the primary architectural defect.**

Three updates to my previous reports follow.

**Swing rewriting should stop being the priority.** The corrected old executor outperformed the replacement, and late corrections now have a measurable, usable response. Their attenuation must be modeled, but attenuation is not the same as unpredictable execution. :chatgpt-content-reference{index="2"}

**Toe articulation should remain deferred.** F0 remained the best walking baseline; F2 demonstrated articulation without resolving the failure chain. This does not certify F0’s anatomy, but it removes the justification for making another foot rewrite the prerequisite to controller progress. :chatgpt-content-reference{index="3"}

**The control objective must distinguish periodic speed variation from progressive acceleration.** Human walking does not maintain constant instantaneous forward COM velocity. Trying to eliminate its normal fluctuations could make the gait less physical, not more. :chatgpt-content-reference{index="4"}

The Touchline findings below are taken from the supplied reports; I have not independently inspected their raw trajectories or oracle implementation.

---

## B. Is Claude’s stance hypothesis correct?

**Partly supported. The proposed diagnosis is stronger than the evidence currently warrants.**

| Observation or proposal | Assessment |
|---|---|
| Forward acceleration during portions of single support | Normal in human walking; not evidence of a defect by itself. |
| Braking and substantial work concentrated around step transitions | Also normal. However, the mechanical transition extends beyond the interval when both feet touch the ground. |
| Forward acceleration throughout essentially every physically defined single-support interval | Worth investigating. It could indicate abnormal support geometry, mistimed transfer, excessive drive, or a gait selected poorly by the planner. It does not isolate which. |
| Heel-biased CoP for 0.2–0.3 seconds | Insufficiently specified to classify. Walking speed, load, contact geometry, and per-foot versus combined CoP matter. |
| Make the foot become flat faster | Justified only if the present motor/contact behaviour demonstrably delays appropriate loading. |
| Add speed-dependent push-off | Appropriate as **regulation**, not automatically as additional propulsion. |
| Use longer steps | A promising tested direction, not a universal cure or a reason to hard-code 0.40 m. |

Human measurements show that COM redirection begins before double support and finishes after it. Therefore, neither “all regulation must occur continuously during single support” nor “all regulation should occur only during double support” is a sound architectural rule. :chatgpt-content-reference{index="5"}

**The particularly important question is not simply whether CoP stays near the heel. It is whether the newly loaded foot is already positioned poorly relative to the body—and whether the oracle avoids that state through different placement and timing.**

That distinction separates a stance-controller defect from stance mechanics that emerge because of a poor preceding decision.

---

## C. What the oracle proves—and what it does not

### What it establishes

Assuming the oracle uses faithful simulator branches and executes the selected commands without hidden state changes, it provides **constructive examples of feasible multi-step trajectories** under the current body, contacts, motors, and command interface.

This weakens the claim that a body or stance rewrite must happen before materially better walking is possible.

The one-step result also matters independently:

> **Perfect next-step simulation knowledge did not remove eventual failure. Therefore, better one-step prediction alone is not an established solution.**

The additional benefit of two-step search suggests that immediate outcome quality and continuation quality differ. A command can produce an attractive next landing while leaving the opposite leg poorly positioned, excessively extended, late to unload, or unable to execute the following correction.

Those interpretations fit the reported results, but remain hypotheses about their mechanism. :chatgpt-content-reference{index="6"}

### What it does not establish

It does not prove formal controllability, an invariant region of stable walking, indefinite continuation, robustness to disturbance, or human-like mechanics. The two trials that reached 28 steps were **stopped at the search limit**, not demonstrated to be indefinitely stable.

It also does not isolate horizon length unless the comparisons match:

- initial states, action ranges, and constraints;
- objective terms and their scaling with duration;
- search quality and computational allowance;
- controller memory, contact state, and simulator restoration.

The two-step oracle also selected a different gait—approximately 0.40 m steps. Its advantage could partly arise from discovering a better nominal operating pattern, rather than requiring online two-step search forever. :chatgpt-content-reference{index="7"}

A **one-step controller with a good terminal continuation cost**, or a well-tuned feedback controller around that better gait, might reproduce much of the benefit. That is a discriminating experiment, not a reason to dismiss prediction.

### The architectural implication

The required capability is:

> **Evaluate how the next action affects the ability to take subsequent actions.**

A two-step planner is presently the most direct engineering route to that capability. It is not the only possible final implementation.

---

## D. Human stance mechanics reference

### D1. COM velocity should oscillate, not remain constant

In the usual pendulum-like description of walking, the body rises while moving toward midstance, exchanging forward kinetic energy for gravitational potential energy. Later, it descends and regains forward speed. Human legs are not rigid pendulums, but measured COM trajectories support this basic distinction. :chatgpt-content-reference{index="8"}

| Portion of the cycle | Expected qualitative behaviour |
|---|---|
| Heel strike and loading response | The new leading leg accepts load and contributes braking; the trailing leg may simultaneously contribute propulsion. Net COM acceleration depends on both. |
| Early single support | Forward velocity commonly decreases as the body progresses upward over support. |
| Near midstance | Forward velocity is relatively low in the pendulum-like portion of the cycle; the exact minimum depends on gait mechanics. |
| Later single support | Forward velocity increases as the body progresses beyond support and descends. |
| Terminal stance, pre-swing, and the next transition | Trailing-leg push-off and leading-leg collision redirect COM motion into the next step. |

The leading leg’s negative COM work and trailing leg’s positive COM work overlap around the transition. Summing the legs can conceal these opposing contributions. :chatgpt-content-reference{index="9"}

**For Touchline, regulate the repeatability and mean of this cycle—not every instantaneous velocity sample toward one constant number.**

### D2. The decisive speed-creep measurement is horizontal impulse

For level-ground walking without another external horizontal force:

\[
m\,[v_x(t_b)-v_x(t_a)]
=
\int_{t_a}^{t_b}
\left(F_{Lx}+F_{Rx}\right)\,dt.
\]

Compare equivalent physical events, preferably **same-side load acceptance to the next same-side load acceptance**: one stride.

Normal steady walking can have substantial positive and negative subphase impulses while satisfying:

\[
J_x^{\mathrm{stride}}\approx 0.
\]

Progressive acceleration means a repeated positive net impulse accompanied by increasing phase-matched or stride-averaged speed.

Record separately the single-support contribution and each leg’s double-support contribution. Do not infer net acceleration from the force on one leg.

Also integrate force over **actual seconds**. Deffeyes and Peters’ analysis of 203 healthy controls found that conclusions about propulsion versus speed changed when investigators used actual time integration instead of integration over normalized stance percentage. This does not establish speed-independent impulses for every gait; it establishes that normalization can manufacture a misleading relationship. :chatgpt-content-reference{index="10"}

### D3. Where do ankle, hip, knee, placement, and timing fit?

There is no defensible universal percentage assigning speed regulation to each joint.

**The ankle–foot system** influences support, tibial progression, force transmission, and late-stance work. **The hip** supplies substantial motor-like work and influences the motion of both body and leg. **The knee** participates in support, load acceptance, leg geometry, and energy absorption. Their roles change when accelerating or decelerating; they are not interchangeable fixed actuators.

For example, Qiao and Jindrich found that deceleration involved reduced hip motor-like function and ankle spring-like function, with increased damping at the knee and ankle. This argues against assigning all braking to an ankle or foothold correction. :chatgpt-content-reference{index="11"}

**Foot placement and step length** change the geometry through which forces act. **Timing and cadence** change when those geometries are encountered and how long forces act. **Double support** permits simultaneous leading-leg braking and trailing-leg propulsion.

My inference for Touchline is that speed regulation should coordinate these mechanisms through the next-state objective. It should not demand that one joint continuously cancel every forward velocity fluctuation.

### D4. Transition work is important—but transition is not synonymous with double support

Adamczyk and Kuo measured COM redirection across walking conditions and found that the mechanical transition occupied approximately **20–27% of a stride**, beginning before and ending after double support. Their tested speeds were 0.75–2.0 m/s, so those percentages should not be copied directly to Touchline’s approximately 0.52 m/s gait. :chatgpt-content-reference{index="12"}

For energy diagnostics, calculate per-leg COM power:

\[
P_i^{\mathrm{COM}}=\mathbf F_i\cdot\mathbf v_{\mathrm{COM}}.
\]

But distinguish this from the full articulated system’s energy accounting. COM work describes changes in COM mechanical energy; it is not a statement that a stationary, non-slipping ground contact supplies actuator energy.

Separately measure:

\[
W_{\mathrm{motors}}
=
\sum_j\int\tau_j\dot q_j\,dt,
\]

together with whole-body kinetic energy, gravitational potential energy, stored elastic energy, contact losses, damping, and numerical residual.

A steady gait requires positive motor work to replace losses. **“No net speed creep” does not mean “no positive ankle work.”**

### D5. Is 0.2–0.3 seconds of heel-biased CoP abnormal?

**The retrieved evidence does not justify calling that duration inherently abnormal at approximately 0.5 m/s.**

Chiu and colleagues measured qualitative progression through initial contact, forefoot contact, foot-flat, and forefoot push-off. Their average phase proportions were approximately **7%, 5%, 49%, and 39% of stance**, respectively. However, their prescribed speeds began at 3 km/h—approximately 0.83 m/s—not 0.5 m/s. Their phase definitions also do not equate “heel-biased CoP” with “heel-only contact.” :chatgpt-content-reference{index="13"}

Wu and colleagues’ very-slow-walking experiments included approximately 0.5 m/s. Slower walking produced longer support periods, especially double support, and altered force and work profiles. Therefore, ordinary-speed timing percentages are a poor substitute for a matched slow-walking reference. :chatgpt-content-reference{index="14"}

Four different observations must be separated:

**Heel-only contact:** the forefoot has not reached the ground.

**Heel-biased loading:** the forefoot may touch, but little load passes through it.

**Per-foot CoP:** the load-resultant location within one foot.

**Combined CoP:** the resultant across both feet, which can remain posterior because the trailing foot remains loaded.

On a common flat surface:

\[
p_{\mathrm{combined}}
=
\frac{F_{z,L}p_L+F_{z,R}p_R}{F_{z,L}+F_{z,R}}.
\]

A posterior combined CoP does not establish that the new leading foot is malfunctioning.

Likewise, CoP location alone is not a complete acceleration model. With forward \(x\), vertical \(z\), COM height \(h\), and centroidal angular momentum \(H_y\), the flat-ground moment balance gives:

\[
m h\ddot c_x
=
F_z(c_x-p_x)-\dot H_y.
\]

The familiar inverted-pendulum relationship follows only after additional assumptions about height and angular momentum.

**Measure actual force, momentum change, and contact geometry before concluding that heel-biased CoP caused the acceleration.**

### D6. What should produce heel-to-flat?

Human loading response involves controlled ankle plantarflexion. Tibialis anterior activity helps resist that motion while the foot lowers after heel strike; direct fascicle measurements show lengthening during early stance. :chatgpt-content-reference{index="15"}

For Touchline, the corresponding implementation hypothesis is a **finite ankle impedance and load-acceptance policy**, not a foot-orientation overwrite.

Inspect whether a swing-phase dorsiflexion target or excessive ankle stiffness persists after load acceptance and physically holds the forefoot up. A justified correction would modify that motor preference and damping as contact/load changes, allowing gravity, ground reaction, joint torque, and leg motion to produce foot-flat.

The wrong fixes include snapping the foot flat, pinning it to the ground, prescribing a CoP trajectory as an external support force, or allowing torque to increase without bound.

Also, **foot-flat does not guarantee anterior loading**. The rest of the body and trailing-leg load transfer still determine the pressure distribution.

### D7. Push-off: regulate it, do not simply add it

Push-off can contribute to forward momentum, but its role also includes redirecting COM motion and changing the collision work required from the leading leg.

Soo and Donelan experimentally restricted joint motion during an isolated rocking task. Reducing push-off increased the collision work required for redirection. This supports coordination of the two legs, while the isolated task limits direct transfer to ordinary walking. :chatgpt-content-reference{index="16"}

For Touchline, push-off should be selected under an objective such as:

> **Reach the desired next-stride speed and a recoverable support state with acceptable work, impact, and actuator demand.**

When already too fast, the appropriate action might be less positive work, more physically generated braking, different placement, different timing, or a combination.

There is also a specific hypothesis worth auditing. Earlier landing changes greatly reduced the reported touchdown braking peak while improving impact and yaw. That was valuable, but a low braking peak is not itself a speed-regulation objective. Check whether reduced collision loss was accompanied by an appropriate reduction in ongoing positive motor work. Do not assume the earlier change caused the creep; measure the work and impulse balance. :chatgpt-content-reference{index="17"}

### D8. Are 0.26 m steps implausibly short?

At **the same speed of 0.52 m/s**, the implied cadences would be:

\[
\text{0.40 m steps: }78\ \text{steps/min},
\qquad
\text{0.26 m steps: }120\ \text{steps/min}.
\]

These are calculated comparisons—not measurements of the ordinary controller, whose corresponding mean speed must be confirmed.

Wu and colleagues’ figures place step length around **0.4 m at approximately 0.5 m/s** in their small adult sample. Thus, the oracle’s combination is plausible as slow walking; 0.26 m at that same speed represents a much shorter, quicker pattern. :chatgpt-content-reference{index="18"}

Nevertheless, first verify that “step length” means actual successive opposite-foot placement distance, not commanded swing offset. Normalize using leg length \(L\):

\[
\ell/L,\qquad v/\sqrt{gL},\qquad f\sqrt{L/g}.
\]

The recommendation is to **allow and evaluate the oracle’s longer-step operating region**, not prescribe 0.40 m independently of body geometry.

---

## E. Planning/control architecture

### Human evidence supports anticipation, not a literal neural MPC claim

Darici and Kuo found anticipatory speed adjustments when humans traversed uneven terrain. Multi-step dynamic optimization explained important aspects of those adjustments. The experiments support future-aware locomotion; they do not establish that the nervous system literally solves a particular quadratic program or uses a two-step horizon. :chatgpt-content-reference{index="19"}

For Touchline, the justification for prediction is more direct: its own oracle suggests that continuation-aware decisions unlock existing physical capability.

### The most relevant engineering precedents

| Precedent | Useful lesson | Important limit |
|---|---|---|
| **SIMBICON** | Contact/phase organization plus COM-state feedback can produce effective physical locomotion without explicit online trajectory search. | It does not establish that Touchline’s current gains, body, or action space are adequate. |
| **Mordatch, de Lasa, Hertzmann: low-dimensional planning** | Plan simplified dynamics over subsequent footsteps, then use a separate full-body controller to realize the plan. Contact-event replanning is valuable. | The original implementation was not a 22-character real-time solution and did not monitor inter-limb collisions. |
| **Khadiv and colleagues: step timing adaptation** | Placement and timing can be optimized in a small formulation; future feasibility can be represented through appropriate terminal constraints. | Viability guarantees belong to the stated reduced model, not automatically to a motor-limited articulated human. |

These are architectural precedents, not interchangeable implementations. :chatgpt-content-reference{index="20"}

### Recommended control division

Use a **fast physical execution layer** for finite joint torques, support transfer, swing clearance, load acceptance, and immediate disturbance response.

Above it, use a **short-horizon planner** that evaluates the next two foot-contact transitions, applies only the first action, and replans using actual state.

A suitable initial action remains:

\[
u=[\text{forward placement},\ \text{lateral placement},\ \text{requested touchdown time}].
\]

Do not initially add numerous ankle, hip, and toe parameters to the search. Add a small stance-policy parameter only after its causal usefulness is demonstrated.

The planner should optimize phase-appropriate state and **stride-average speed**, not constant instantaneous COM velocity. Its terminal objective must penalize states from which the following swing or support transfer is precarious—not merely states with immediate speed error.

---

## F. Minimum useful planner state

**The smallest sufficient state has not yet been established.** The full physical and controller state is the diagnostic reference; the compact planner representation should be reduced through held-out tests.

My proposed starting blocks are:

| Block | Information to retain |
|---|---|
| **COM state** | Position relative to a fixed touchdown anchor; inertial velocity in frozen intended-heading axes; include height and vertical velocity initially. |
| **Angular state** | Centroidal angular momentum, plus relevant trunk/pelvis orientation errors. Pitch matters for sagittal dynamics; yaw-only state is insufficient as an assumption. |
| **Support configuration** | Actual stance-foot orientation and roll rate; contact mode; per-foot normal loading/load share; valid CoP offsets. |
| **Swing and leg readiness** | Swing-foot position/velocity, leg extension and extension rate, and sufficient joint information to assess release, clearance, and reachability. |
| **Physical timing** | Time since contact/load acceptance, elapsed swing time, and predicted—not future observed—time to touchdown or release. |
| **Executor memory** | Committed target, target version, requested touchdown time, active reference phase, and consequential filters or integrators. |

The last block is important: **the plant being identified is the body plus its inner controller**, not just COM mechanics.

Requested speed and heading are principally **task inputs**. If they also change the inner-loop reference or motor policy, that effect must enter the model explicitly.

Previous-step placement and timing are useful proxies when current measurements omit their consequences. They are not intrinsically required history variables if the full relevant current state is already observed.

Avoid duplicating pelvis velocity and COM velocity without evidence that both improve prediction. Likewise, capture-point coordinates are useful derived features, not substitutes for height, angular state, contact progression, and swing readiness.

Retain the earlier coordinate contract: plan in a frozen intended-heading frame, store committed footholds in world space, and log explicit revisions. The new correction measurements justify **bounded online replanning**, not an assumption that late requests execute at unit gain. :chatgpt-content-reference{index="21"}

---

## G. Why the current response maps may be failing

The reported 4–6 cm residual is important, but it must first be defined: foot endpoint, COM position at contact, capture-point position, or another outcome? Those errors require different remedies. The brief does not resolve that measurement contract. :chatgpt-content-reference{index="22"}

The most plausible problems are:

**Missing state and controller memory.** Similar COM states can have different leg velocities, support loading, ankle motion, and pending motor references.

**Averaging across contact transitions.** Heel-only, foot-flat, delayed release, and early scuff are not interchangeable samples from one smooth response.

**Timing and action-realization errors.** A requested late foothold change may produce only half its magnitude. The model must predict that realized action and actual contact time.

**Training-distribution problems.** A model fitted around the ordinary short-step gait may extrapolate poorly into the longer-step oracle region. Deleting failed attempts further hides the boundary that matters.

**Compounding and biased errors.** A small consistently signed error or an error in a strongly amplified direction can matter more than a larger harmless average residual.

**The wrong planning objective.** A perfect one-step map cannot compensate for a cost function that rewards states with poor continuation.

### Smallest model class to try next

Start with a **regularized, phase/contact-conditioned local transition model**, with explicit placement and timing inputs. Separate load transfer from the following support/swing evolution where necessary, rather than fitting an ever-larger global linear map.

Use simple centroidal dynamics to handle known timing dependence, and fit local residuals for the articulated body–executor combination. Maintain a separate **execution/continuation feasibility model**.

Predict the next physical state, contact timing, and leg readiness—not just a landing coordinate. Propagate these through the second step without resetting the legs to an artificial canonical pose.

Escalate to richer nonlinear regression only if sufficiently observed local transitions remain systematically nonlinear. Contact failures should not be “smoothed away” by a more flexible regressor.

---

## H. Recommended architecture and order

| Path | Strength | Main risk | Assessment |
|---|---|---|---|
| **A. Stance first** | Can remove a demonstrated mechanical bottleneck and simplify prediction. | Endless stance tuning; accidentally suppressing normal gait oscillation; changing the plant before exploiting oracle evidence. | Use only for a verified defect. |
| **B. Planner first, never revisit stance** | Directly pursues demonstrated capability. | May require excessive precision to compensate for unnecessarily fragile mechanics. | Useful experimental baseline, incomplete policy. |
| **C. Minimal stance corrections plus predictive planning** | Can improve both decision quality and physical margin. | Confounded results if both change continually. | **Recommended, with frozen versions and controlled ablations.** |

The order should be:

**Establish the measurement contract → reproduce and explain the oracle advantage → build continuation-aware planning on the unchanged baseline → apply only validated stance corrections → reidentify the changed plant.**

Conceptually:

\[
u_0^\star
=
\arg\min_{u_0,u_1}
\left[
\ell(z_0,u_0)+\ell(z_1,u_1)+V_{\mathrm{continuation}}(z_2)
\right].
\]

Here, feasibility includes finite-motor execution, contact constraints, and readiness for another step. The terminal term should discourage consuming all remaining recovery margin just beyond the planning horizon.

This is **not** a recommendation for full-body trajectory optimization every frame. A bounded candidate search over cheap transition models is sufficient as the first production candidate.

---

## I. Ordered discriminating experiments

### 1. Audit normal and oracle trajectories with the same physical measurements

**Question:** Is the oracle succeeding with the same unusual stance mechanics, or does better planning automatically produce better stance?

Replay oracle commands from complete saved states, including controller memory. Compare ordinary, one-step, and two-step trajectories using actual contact-defined phases.

Measure per-foot forces and CoP, COM velocity, horizontal impulse, load transfer, heel-to-flat events, joint work, leg extension, and saturation.

**Interpretation:** If the oracle naturally eliminates the suspected heel/loading problem without changing stance code, the defect is at least partly upstream planning. If the same unusual mechanics persist but walking improves, they are not an absolute barrier. Replay mismatch invalidates stronger oracle conclusions until fixed.

### 2. Separate horizon benefit from a better nominal gait

**Question:** Does two-step reasoning itself matter?

Use matched starts, action ranges, constraints, and costs. Compare one-step selection, two-step selection, one-step selection with a continuation terminal cost, and feedback around the oracle-like step-length/timing region.

Record cases where one- and two-step controllers choose different first actions from the same state.

**Interpretation:** If a better nominal gait removes most of the difference, a simpler controller may suffice. If the two-step action knowingly accepts a worse immediate result to preserve the following step, continuation-aware planning is directly implicated.

### 3. Run a controlled stance × planner comparison

**Question:** Does a minimal stance correction improve capability independently of planning?

Compare baseline stance versus one finite-motor loading-response change, each under the matched ordinary controller and two-step oracle.

Choose the stance change from Experiment 1—for example, releasing an inappropriate swing dorsiflexion hold after physical load acceptance. Do not bundle new foot geometry, friction, push-off, and swing logic.

**Interpretation:** Improvement under both controllers supports a genuine stance bottleneck. Improvement only under ordinary control may mean the correction compensates for that controller’s operating pattern. Little benefit under either weakens the proposed correction.

### 4. Identify the source of net positive speed change

**Question:** Is speed creep driven by excessive motor work, insufficient braking geometry, or mistimed transfer?

From matched under-speed, target-speed, and over-speed states, perturb existing stance motor drive or push-off modestly and separately from placement/timing.

Measure the resulting stride impulse and energy budget—not just survival.

**Interpretation:** A useful speed regulator produces a restoring response: more net acceleration below target, less or negative acceleration above it. If reducing drive causes failed support rather than controlled slowing, the solution requires coordinated geometry/timing, not simply weaker motors.

### 5. Test state sufficiency before model complexity

**Question:** Are the 4–6 cm errors caused by omitted information?

Use physically reached checkpoints and paired action perturbations. Compare models with progressively added contact, angular, leg-readiness, and executor-memory information. Keep local versus global model complexity controlled.

Split by source trajectory/checkpoint family; do not put branches of one checkpoint into different train/test sets. Preserve failures as feasibility outcomes.

**Interpretation:** If added physical state sharply reduces held-out residuals, fix the representation. If identical full-state replays differ, investigate determinism or restoration. If errors remain concentrated at contact boundaries, use mode-aware models rather than larger global fits.

### 6. Test the proposed production planner against both simpler and oracle controls

**Question:** Does cheap prediction reproduce useful oracle decisions?

On held-out histories, compare the same surrogate with one-step versus two-step planning, the strongest matched feedback baseline, and a limited oracle reference set.

Measure action ranking, false-feasible decisions, two-step state prediction, speed regulation, and recovery—not only landing RMSE.

**Interpretation:** Accurate predictions but poor decisions implicate objective/terminal cost. Good oracle decisions but wrong predicted outcomes implicate the surrogate. Failures shared by both identify states needing broader physical capability or a different recovery mode.

These experiments can reuse much of the existing data. Only the final endurance and robustness evaluation needs a larger new trajectory set.

---

## J. Stance-mechanics validation gates

These are **proposed engineering gates**, not universal biological constants.

| Category | Gate |
|---|---|
| **Measurement integrity** | Integrated contact impulses reproduce measured COM momentum changes. A starting numerical target is residual below 1% of accumulated absolute horizontal impulse; inspect near-zero cases separately. |
| **Braking and propulsion** | Per-leg traces show physically coherent load acceptance and propulsion. At steady target speed, opposing stride impulses balance; there is no persistent unexplained positive net impulse. |
| **CoP progression** | CoP is computed from trustworthy resolved loads, remains within the valid loaded support region, and is invalidated at negligible load. Compare phase-normalized progression with speed-matched references rather than enforcing a universal timer. |
| **Heel-to-flat** | Forefoot loading results from finite joint/contact dynamics without snapping, excessive impact, or persistent unnecessary dorsiflexion holding. |
| **Energy balance** | Phase-matched whole-body mechanical energy remains bounded; measured motor work, dissipation, and numerical residual explain changes. |
| **Slip and saturation** | No sustained unintended loaded-foot drift or phase-long saturation necessary for nominal gait. Deliberate pivots and brief disturbance responses are classified separately. |
| **Gait plausibility** | Actual step length, timing, support fractions, clearance, and COM oscillation are assessed at matched dimensionless speed and body scale. |
| **Restoring behaviour** | Nearby speed perturbations produce a return toward the target operating cycle rather than continued positive drift. |

For a concrete initial slip alarm, **loaded unintended translation exceeding about 1% of leg length in a step** deserves inspection. That is a proposed diagnostic threshold, not a human norm.

A stance correction should also **broaden the feasible action region or reduce transition sensitivity**. A prettier CoP trace without improved capability or predictability is insufficient.

---

## K. Planner validation gates

### Prediction must be accurate relative to recovery margin

Do not require an arbitrary centimetre threshold independent of the task.

A useful starting criterion is that the **95th-percentile error in a critical outcome direction be less than one-third of the available continuation margin**. For a measured 6 cm margin, this implies an illustrative 2 cm error target.

Evaluate signed bias, tails, actual touchdown timing, and two-step propagation. A low mean endpoint error can coexist with dangerous false-feasible decisions.

### Reachability must be conservatively calibrated

Separate “can land there” from “can continue after landing.”

Track states and actions predicted feasible that physically fail. A 1% per-step false-safe rate is not small enough for long sequences: under an illustrative independence assumption, 100-step survival would be only \(0.99^{100}\approx37\%\).

Near-boundary uncertainty should reduce the accepted action set. Outside tested coverage, the planner should not issue confident aggressive requests.

### Regulation and recovery need multiple operating conditions

A reasonable **prototype evaluation**, after local capability is established, is at least 20 new initial histories across several nearby requested speeds, with 100-step endurance trials as only one component.

Require bounded speed error, no persistent drift, acceptable angular behaviour, and recovery after modest physical perturbations. A starting speed band might be ±10% of target, with recovery within several strides; calibrate it to the task rather than calling it a biological standard.

Perturb through **physical forces or collisions**, not velocity writes. Test both signs and multiple contact phases.

### The planner must earn its computational cost

Compare it with the strongest information-matched feedback controller. Require measured improvement in feasibility margin, recovery, and task tracking—not merely a larger step count in the training starts.

Passing these prototype gates would justify continued development. It would not yet establish match-ready reliability for 22 interacting players.

---

## L. Future jogging, running, and football implications

A universal heel-first → foot-flat → push-off script is the wrong foundation for football. The architecture should permit different contact modes and objectives rather than making walking’s preferred contact sequence compulsory.

The proposed separation can be retained: task intent, short-horizon support planning, finite-motor execution, and physical-state feedback.

For running, the prediction model must accommodate flight and compliant stance; a constant-height, always-grounded capture-point model is inadequate. Low-dimensional planning research has demonstrated the usefulness of combining stance and flight models, although its implementations and collision assumptions do not transfer wholesale to Touchline. :chatgpt-content-reference{index="23"}

For cutting, kicking, and contact recovery, future support availability matters: a foot committed to a kick may not be available for the next balancing step. Planning should include that commitment and angular momentum, while fast physical feedback handles unanticipated collisions.

**Future-aware control will be useful; explicit MPC is not mathematically mandatory.** Offline-computed policies or feedback laws can encode anticipation. The current oracle nevertheless makes a small online planner the clearest next experiment.

Two steps should be the initial locomotion horizon, not a permanent limit on higher-level anticipation for sprint braking, routes, or opponents.

---

## M. Computational implications for 22 players

Keep full Jolt oracle search as an offline diagnostic and data generator.

For production, use a bounded search over a cheap surrogate. An illustrative arrangement is:

- evaluate 24 first-step candidates;
- retain 6 promising candidates;
- evaluate 24 continuations for each.

That requires:

\[
24+6(24)=168
\]

transition evaluations per planning invocation, rather than hundreds of complete articulated simulations.

At an illustrative 20 planning updates per second per player:

\[
22\times20\times168
=
73{,}920
\]

small transition evaluations per second.

That is an operation-count proposal, **not a measured runtime guarantee**. Feasibility checks, model dimensions, contact-mode branching, and implementation overhead must be benchmarked.

Use contact-event replanning plus bounded intermediate updates, cached/warm-started candidates, fixed iteration limits, and deterministic tie-breaking. Account for all 22 players requesting a plan in the same frame; average cost alone is insufficient.

For example, an allocated **2 ms per 60 Hz frame** for all planners corresponds to 120 ms of computation per second, or approximately **0.27 ms per invocation** at 440 invocations per second. Whether that budget is appropriate depends on Touchline’s measured physics/rendering workload.

The Mordatch implementation is a useful caution: its reported runtime was below real time on its original hardware, and contact-only replanning greatly reduced planning cost. It is evidence for the decomposition, not evidence that copying the entire controller meets this budget. :chatgpt-content-reference{index="24"}

---

## N. Concrete next instructions for Claude

### Do now

**Freeze F0 and the corrected old swing as the comparison baseline.** Preserve the measured late-correction capability and model its phase-dependent gain.

**Replay and instrument the oracle trajectories.** Determine whether better commands already improve heel loading, COM placement, release timing, and stride impulse balance.

**Run the matched horizon/nominal-gait comparison.** Establish whether the missing ingredient is continuation reasoning, a better operating pattern, or both.

**Build the smallest continuation-aware production candidate:** two contact transitions, placement and timing actions, a phase/contact-conditioned predictor, and a conservative continuation-feasibility gate.

### Only if the corresponding experiment supports it

Change heel-to-flat ankle impedance when the baseline demonstrably holds the foot inappropriately and the finite-motor correction improves capability.

Regulate existing push-off or stance drive when the energy/impulse experiments establish excessive or mistimed work. Add positive work only when the task and predicted state require it.

Increase model complexity when better state, timing, and contact labels fail to explain structured residuals.

Revisit foot/body architecture only when failures persist under competent oracle selection and are tied to a demonstrated physical limitation.

### Do not do yet

Do not replace the swing executor again, restart the toe investigation, force a CoP trajectory, prescribe a faster foot-flat timer as physical authority, add fixed push-off impulses, suppress ordinary COM oscillation, or deploy full Jolt branching for every player.

Do not declare stance “fixed” because its trace looks familiar, or planning “fixed” because one run reaches 100 steps.

---

## Bottom line

**Claude is right to investigate stance mechanics, but not yet justified in making stance repair the prerequisite to predictive control.**

The new evidence more directly supports a failure to choose and preserve a viable sequence of steps than an unavoidable defect in the current foot or body. The two-step oracle is the critical evidence; normal transition-concentrated mechanics must not be mistaken for pathology.

**The next move should be a continuation-aware foothold-and-timing planner on the frozen working baseline, accompanied by a small set of causal stance experiments.** Use stance changes to enlarge the planner’s physical margin—not as an indefinite search for perfect biomechanics before building the capability the oracle has already shown to be useful.
