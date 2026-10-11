# Claude implementation prompt — IFM-1: Impact-first matched-state comparison

## 0. Status, authority, and scope

This is a new, isolated research experiment. It does not adopt RH1, qualify R0, amend an old experiment, or authorize a production architecture change.

**Execution requires the owner's approval of IFM-1.** Before implementation, bind the immutable inputs in Section 2 and commit this preregistration plus the input manifest. After implementing only the fixture generator and read-only instrumentation, freeze the geometry-only fixture manifest and implementation hashes before any new Jolt stepping or outcome-bearing run. If this prompt is supplied for preparation/review only, perform provenance binding and document preparation, then stop. If the owner explicitly authorizes implementation/execution, follow the remaining sections exactly after that freeze.

The question is:

> Can a correctly initialized frozen RUN-1 footballer enter V2 at the interaction boundary and produce a useful, physically honest, location-dependent response without physically reproducing the preceding run?

Ordinary locomotion remains the owner-approved frozen RUN-1 system. Football state remains authoritative. No physics result may change football position, occupancy, velocity, possession, action availability, contact decisions, or outcome classes.

Only new experiment/harness/report files are permitted. Import protected implementations read-only. Do not modify RUN-1, R0, RH1, V2 body properties, passive tissue, actuator capacities, solver settings, production collision geometry, existing criteria, historical reports, or old results. Do not push, move tags, or adopt a candidate. New impactor fixtures and the explicitly specified diagnostic target adapter belong only to IFM-1.

## 1. Findings that must remain intact

The owner supplies the following independently reproduced Claude audit findings:

- RH1 is **INVALID under its frozen preregistration**; 50/54 is not qualification.
- Introduced failures: G1 `leanL` and G1 `dropA`; R0 passes these in the matched audit.
- Shared failures: G3 `G`, `H`, and `K'` fail identically on R0 and RH1.
- `isoSelfCol` has only the already permitted PI-1-scoped exception. Do not expand it to IFM-1 contacts or to global qualification.
- The five G0 record-proportion rows were **never waived by the owner**. The RH1 preregistration's exemption is unresolved historical qualification debt, not owner authorization.
- RH1 handoff measurements reproduce, including ALL-OUT shoulder/elbow/wrist errors about 6.5/5.4/2.6 mm; per-body velocity error <=0.093 m/s; momentum error about 0.47 N·s; angular-momentum error about 4.9% of its stated limit; no recorded pop instants above 0.18 m/s; lower-body mapping effectively unchanged.

Preserve the distinction between scenario/subcheck labels and aggregated gating rows. Copy the audit's actual row-to-label grouping; do not derive a new denominator from the number of labels above.

IFM-1 can establish scoped mechanical evidence for an unqualified candidate. It cannot turn those candidates into qualified production bodies. Record absolute qualification and incremental R0–RH1 regressions separately.

## 2. Immutable input binding — mandatory before implementation

Resolve inputs from the local committed repository and owner decisions, not from the newest-looking filename or an uncommitted working tree. The external reviewer could not retrieve the final local RUN-1/RH1 objects; therefore no tag or SHA is invented here.

Create `IFM1_INPUTS.json`, recording full commit IDs, paths, blob IDs, and SHA-256 hashes for:

1. The **actual owner-approved final RUN-1 freeze tag**, its peeled commit, acceptance record, four-regime LOW/JOG/FAST RUN/ALL-OUT contract, state/velocity handoff contract, evaluator, rig, and gameplay-camera configuration.
2. The exact R0 and RH1 constructors and mappers used in the reproduced RH1 audit, plus the audit report, raw per-row results, qualification code, and RH1 frozen preregistration.
3. V2 body/joint/passive/actuator definitions, F0, Jolt JS/WASM binaries, contact configuration, timestep, and iteration settings used by that audit.
4. The existing posture-driver gain/statics definitions and actuator adapter used for Section 6.
5. IB-1 records, manifest, metrics, verifier, and the relevant current authoritative football snapshot/runner interface.
6. Contact-impulse instrumentation and the snapshot/restore utilities used below.

Known historical references, for orientation only:

- Repository: `ZainRahman23/FC-Simulator`.
- Public physical head inspected by the reviewer: `c647f4c9be38457cc87dc8dd3ee43aebc2b91908`.
- Earlier RUN-1 draft: `affc30b06b5101b0f571c5917cb5ef14a652ffda`. **Do not substitute it for the final owner-approved freeze.**
- `review_artifacts/physical_character_v2/interaction_benchmark/`
- `review_artifacts/physical_character_v2/interaction_time/ITS1_PREREG.md`
- `review_artifacts/physical_character_v2/interaction_time/ITS1_STOP_PF0.md`
- `review_artifacts/physical_character_v2/pi1/rev2/scripts/pi1_rev2_sim.mjs`
- `sandbox/visual/physchar2/sim/v2_actuation.js`
- `sandbox/visual/physchar2/tools/track_a_lib.mjs`

Record the actual final source paths rather than assuming those historical paths identify the new audit. Extract the exact joint-range definitions, units, tolerances and transient/settled/emergency-stop distinctions into the manifest. Do not conflate a percentage of a limit with percentage error against the reference momentum.

If the owner-approved freeze, audit pairing, row grouping, or required definitions cannot be resolved uniquely, mark `PROVENANCE_BLOCKED` and stop before implementation. Do not invent, auto-waive, or silently fall back. The input-binding step has no scientific freedom to choose a more convenient model.

## 3. Hypotheses and limits of inference

**H1 — Impact access.** At least one flat-support RUN-1 state has a healthy 0–50 ms no-hit control and supports a mechanically valid native impact without preceding dynamic running.

**H2 — Location/support dependence.** Under the standardized impactor rule, swing-shank, supporting-shank and shoulder-region contacts produce reproducibly different mechanical signatures. No ordering such as “planted always falls more” is imposed. Native impulses can differ because effective mass differs.

**H3 — Initial disturbance sufficiency.** For at least some useful native responses, the measured first-step per-body impulse/wrench is sufficient; continued opponent contact adds no material response over the primary window. A replay-timing error must not be mistaken for a need for continued contact.

**H4 — Representation comparison.** R0 and RH1 may differ in entry quality or response integrity. Compare complete body-plus-mapper candidates; do not attribute every difference specifically to one moved hinge without further evidence.

**H5 — Foot-domain limit.** A toe-pad state can fail entry or support validity independently of flat-support contact results. Such a failure limits F0 coverage; it does not invalidate other cells.

This experiment does **not** test sustained running, all four speed regimes, a complete tackle repertoire, autonomous recovery, get-up, deterministic return to RUN-1, or mobile production performance. Later observations cannot establish capabilities that the protocol does not implement.

## 4. Minimal fixture set and phase selection

### 4.1 Shared RUN-1 history

Use the exact rendered player/morphology in the RH1 audit, with its unchanged recorded mass and equipment convention. Do not replace it with V2-REF or rescale it.

Drive the ordinary RUN-1 evaluator with a straight, constant **3.000 m/s** authoritative root trajectory, constant facing along travel, zero yaw rate, flat pitch, no ball interaction, no reaction overlay, no RNG. The regime label is whatever the frozen four-regime contract assigns to 3 m/s; do not relabel or retune it.

Advance **three complete cheap RUN-1 gait cycles** to establish plants; select states in the fourth cycle. No articulated physics is created or stepped during this history. Use one fixed world-to-local transform and the unchanged gameplay camera. Record that transform.

### 4.2 Two source states, chosen without physics results

Bind phase/stage aliases to the actual frozen RUN-1 state machine.

**S-FLAT:** Within the fourth cycle, find the longest continuous interval with the LEFT foot in its flat-foot support stage and the RIGHT foot in swing. Select the interval midpoint; ties select the earliest interval.

**S-TOE:** Find the longest interval with LEFT heel raised, LEFT in the toe-pad stage after MTP rollover has begun, and RIGHT in swing. Select its midpoint; ties select the earliest interval. This is the F0 sentinel. Do not replace it with an earlier compatible frame.

Prefer exact stage boundaries provided by the contract. Otherwise locate intervals on a fixed 4,096-sample phase grid and refine each transition by 40 deterministic bisections of the frozen stage predicate. A missing interval is `STATE_UNAVAILABLE`; do not search another speed, side or frame. Continuous-state sampling at the selected time must use the frozen export contract.

Record selected phase, time, stage, time to scheduled toe-off, joint transforms and twists, source contact flags, plant anchors and contact-feature identity. Phase selection is identical for R0 and RH1 and is not repeated after a gate failure.

### 4.3 Four impact roles

| Role | Source state | Intended contact |
|---|---|---|
| SW | S-FLAT | RIGHT shank, halfway from knee to ankle |
| PL | S-FLAT | LEFT shank, halfway from knee to ankle |
| SH | S-FLAT | LEFT shoulder-region deltoid collider on proximal upper arm |
| TP | S-TOE | LEFT shank, halfway from knee to ankle |

SH tests a shoulder-region impact, not an elbow hit or a claim of independent scapular mechanics. Bind the designated existing deltoid subshape from the unchanged body specification. If it cannot be identified, report that fixture unavailable rather than replace the target after viewing results.

Run each role on R0 and RH1: **eight body/impact cells**. For each available cell use native mode N and wrench mode W. Share one runner no-hit control per body/source state: **four controls**, not one duplicate control per region.

Maximum base set: **20 distinct trajectories**. Repetitions and conditional replay-diagnosis branches are specified later. No speed grid, impulse-magnitude grid, gain sweep, new body, F1 toe, or phase search for success.

## 5. Controlled impactor — not an alleged full tackler

Use one diagnostic dynamic **sphere**, radius **0.060 m**, mass **10.000 kg**, COM at its centre, inertia **0.0144 kg·m²** on each axis. This is a standardized finite-mass impact instrument, not a physiological 10 kg sphere or an entire footballer.

All six rigid-body DOFs remain free. Initial angular velocity zero. Gravity, zero body damping, friction/restitution, motion-quality policy, and other settings follow the bound V2 configuration; use its ordinary body-to-body material. No tether, external drive, gravity cancellation, infinite mass, or mass tuning. Impactor–turf contact remains enabled. All normal receiver–impactor body pairs remain eligible in N; do not filter the receiver down to the intended target.

For SW/PL/TP, the target ray passes through the specified anatomical shank midpoint, outward to that leg's anatomical side. For SH, it passes through the designated deltoid centre, outward to the LEFT. “Outward” is perpendicular to travel in the horizontal plane; the manifest records handedness and signs explicitly.

Place the sphere on that outward ray so its distance from the **unchanged target collider** is **+0.0005 m**, using a deterministic geometric distance solve. Use the outermost solution within 1 m of the reference point, with 60 fixed bisections after a geometry-only bracket. No dynamic outcomes participate in placement.

Check all other receiver colliders and the turf for initial overlap. A blocked approach or a target without an exterior solution is `FIXTURE_GEOMETRY_BLOCKED`; do not rotate/move the impactor to hunt for a result.

Let p be the receiver surface witness and n_out its normal toward the sphere. Set:

`v_impactor = v_receiver_at(p) - 3.000 * n_out`.

Thus initial normal closing speed is 3 m/s and tangential relative velocity is zero. Record both the specified and read-back values.

This construction is repeated geometrically for each body candidate. It matches anatomical stimulus, sphere properties and relative approach—not necessarily identical world coordinates. Report R0/RH1 placement differences so mapping and body changes are not mistaken for an identical-state hinge-only experiment.

The first qualifying opponent contact must occur in the **first 1/240 s solver step**. No pre-contact dynamic running or settling steps are allowed. Failure to contact is a setup/correspondence result, not proof that V2 cannot transmit an impulse. No impulse or velocity is selected to match gameplay `J` or a desired fall.

## 6. Receiver initialization and short-lived target adapter

### 6.1 Pose and geometry

Map the same frozen RUN-1 state with the exact audit mapper for each candidate. Preserve body masses, COM offsets, inertia tensors, colliders, joint frames/ranges and passive properties. Record any mapping projection already performed by that frozen mapper. Add no new retarget, inverse kinematics, foot flattening, toe reconciliation, bone scaling or anatomical clamp.

Apply at most one uniform vertical grounding translation: put the existing LEFT F0 sole's lowest point at **+0.0005 m** above the pitch. If its magnitude exceeds **10 mm**, reject entry for that body/state; retain the measured discrepancy. Do not search another phase. Ensure grounding does not bury another collider.

One pose and one velocity assignment per receiver body are permitted at entry. Record the 28 assignments and the impactor initialization separately. No later receiver pose/velocity resets or tracking translations are permitted. Native integration, logged impulse APIs, and diagnostic snapshot restoration are distinguished in the write log.

### 6.2 Velocities and momentum

Use the committed audit's continuous RUN-1-to-body velocity construction, including angular velocities and COM-offset terms. Do not return to render-frame backward differences. Child/parent anchor velocities and locked-axis constraints must be consistent.

Using the physical body's actual total mass M, apply the existing HG-A-style **one uniform horizontal velocity shift**:

`s_h = v_authority,h - P_raw,h / M`.

Apply s_h to every segment's linear velocity. This preserves relative body velocities and angular momentum about the system COM. Record raw and reconciled momentum separately. Do not reinterpret the audit's approximately 0.47 N·s residual as acceptable final authority error.

Do **not** zero vertical COM velocity. Do **not** replace whole-body angular momentum with facing-rate-only yaw momentum. Do not set every segment to root velocity. Preserve the mapped vertical and angular state and report its physical consistency; neither quantity is magically supplied as ground truth by IB-1.

Do not subsequently pin a foot or independently edit segment velocities to make support appear stationary. Measure the post-shift support-point velocity and assess the no-hit control.

### 6.3 Contacts and caches

Initialize a clean world or canonical empty-pool state, with the bound V2 collision filters and solver settings. Contact/constraint warm-start caches begin clean. Do not invent ground impulses, load fractions or cached support forces from a RUN-1 contact label.

A RUN-1 flag is kinematic intent; measured physical support begins only when the solver produces ground impulses. No clamped root, kinematic stance foot, support weld, B tether, A translation field, or imported post-contact gameplay root correction is allowed.

### 6.4 Actuator targets — remove the zero-rate mismatch, not actuator limits

Use one experiment-only `SnapshotTone` adapter for all cells. It changes diagnostic reference commands, not V2's actuator or passive models.

At entry obtain the audit's joint-consistent generalized joint coordinates a0 and rates adot0. Keep locked coordinates fixed. Over the full **150 ms** observation horizon:

`a_ref(t) = a0 + adot0 * t`.

Construct target rotations from the existing joint-coordinate mapping. Derive the target angular velocity from that same differentiable target, transported into the actual actuator constraint axes. Do not treat Euler-angle rates as angular-velocity components without the mapping Jacobian. A derivative of this explicitly known local target is not lookahead into football outcomes.

Keep the initial stance/swing gain selection fixed over this short test. Extract K and D from the bound posture-driver configuration; do not tune them. Compute its initial gravity/statics bias once from the entry geometry and initial support-role flags, then hold that joint-torque bias fixed. It is a declared internal actuator command, not a measured ground reaction.

For the current V2 actuator encoding, use:

`tau0 = tau_bias,0 + K * orientation_error + (D + h*K) * omega_ref`,

so the adapter's net request is:

`tau_request = tau_bias,0 + K * orientation_error + (D + h*K) * (omega_ref - omega_measured)`.

Use the existing bounded implicit actuator layer. Preserve force–velocity capacity, activation/deactivation time constants, passive damping and all capacity limits. A large raw tau0 is not itself the net torque request; log both. Do not add a second rate-feedforward term, inverse dynamics, or an external support force.

Initialize actuator activation from the initial **net** request using the existing initialization path. Initialize rate/history buffers from the entry twists, not from zero/rest. At exactly matching target pose/rate, confirm algebraically that the net request reduces to the initial bias.

Precheck the target's joint-coordinate domain over the observation horizon. If it leaves the allowed domain before 50 ms, mark that body/state `TARGET_DOMAIN_BLOCKED`. If it leaves later, truncate secondary interpretation at the first crossing. Do not let Jolt silently clamp the target or “repair” it. No target adjustment after observing a trial.

This is a local motion continuation for a collision test, not a new gait controller. If the bound actuator API differs from this encoding, prove an algebraically equivalent translation before running; otherwise stop that implementation path rather than redesign V2.

## 7. Modes and the matched-disturbance safeguard

### C0 — no-hit control

Same receiver entry state, target adapter, world, IDs and timing. Keep an impactor body slot but disable receiver–impactor collisions and apply no wrench. Its disconnected state cannot influence the receiver. A shared control is valid only if the receiver's output is independent of disconnected impactor placement; verify that once.

### N — native contact

All normal eligible receiver–impactor collisions enabled. Jolt determines the first-step impulse and all later contact. Record post-solve normal and tangential impulses, witness points, receiving subshape/body, and the impulse on the impactor.

A contact-added callback is geometry/pre-solve evidence, not a solved impulse measurement. Reuse the validated, version-bound impulse/cache instrumentation. Never estimate opponent impulse from the same momentum residual that is later used to “prove” momentum closure.

### W — matched-initial-wrench replay

Start from the identical pre-step receiver and impactor state. Disable receiver–impactor collisions throughout W; ground and receiver self-contacts remain unchanged.

From N's **first solver step only**, obtain every receiver–impactor contact impulse. For every affected rigid body i, form:

`J_i = sum(contact impulses on i)`

`H_i,O = sum((p - O) cross J_contact + contact free couples)`

about one fixed world origin O. Include friction impulses and every affected body; do not lump everything at the pelvis or at one average point. Store the equal/opposite impactor wrench as well. Do not copy ground impulses, internal joint impulses or motor impulses from N.

Compute the common first-step passive/actuator plans, activation and command rows from the shared pre-impulse state. Prepare those rows before wrench injection, so W does not silently give its first-step controller a post-impact state that N could not read. Then apply the recorded per-body wrench **once**, immediately before the first normal physics step, using impulse APIs:

- linear impulse J_i at that body's COM;
- angular impulse `H_i,O - (c_i - O) cross J_i`.

Do not use force J/h over a step as an undisclosed substitute. Do not reset velocity to a desired result. Mark this as a supplied external disturbance in W's ledger. Continue with ordinary ground/self physics and the common SnapshotTone adapter. No later opponent impulse is replayed.

W may run only when C0 passes its primary gate and N's first step passes contact correspondence and mechanical/ledger integrity. A later N failure does not suppress a W replay from that valid first step. An invalid native first-step wrench is not a valid input.

W is an **offline diagnostic derived from N**, never a live production input. It does not establish that the football simulation already has an articulated-body impulse contract.

### First-step fidelity gate

Identical impulse totals do not guarantee an identical first-step state: injection order and contact coupling can differ. At h compare W with N:

- maximum body-COM position difference <= **1 mm**;
- maximum body orientation difference <= **0.5 degrees**;
- maximum linear-velocity difference <= **0.05 m/s**;
- maximum angular-velocity difference <= **0.5 rad/s**;
- total momentum difference <= **0.05 N·s**;
- angular momentum about O difference <= **0.05 N·m·s**.

These are new prospective IFM-1 comparison tolerances, not amendments to old qualifications. Failure is `WRENCH_REPLAY_NOT_STATE_MATCHED`, not evidence that continued contact is necessary. Do not fit, spread, scale or rotate the recorded wrench to pass.

### X — conditional exact-prefix continuation ablation

Run X only when W fails first-step fidelity, or N and W disagree on primary validity/usefulness or the equivalence test in Section 10.

Restore N's complete state at h, including receiver/impactor state, joint/ground caches, actuator activation, controller/history state and time. Prove first that a no-op restore reproduces uninterrupted N bit-for-bit. Then disable only receiver–impactor collision pairs for the remaining trajectory, invalidating only those pairs' cached contacts through the normal engine interface. Retain all other bodies, contacts and settings. No new impulse or receiver state correction is applied.

X shares the exact native first-step disturbance **and its coupled effects**. It determines whether a W discrepancy came from wrench reconstruction or from removing continued opponent contact. It is not a third production architecture, and it does not prove that an externally supplied wrench can reconstruct N.

Maximum conditional addition: one X continuation per native cell. If this instrumentation is unavailable, mark the corresponding continuation-necessity conclusion **unresolved**; keep valid N results.

## 8. Timing and per-cell validity

Use **h = 1/240 s**, with the audit's unchanged 150/2 iteration configuration if confirmed by the bound sources. A different audited configuration is a provenance conflict requiring review, not permission to choose a solver budget.

The interaction boundary t=0 is the start of the first solver interval. The native first qualifying opponent impulse must occur during that interval. Record that contact-time resolution is one physics step; do not claim a finer measured onset.

- Entry checks: t=0 before the first step.
- First-step comparison: t=h.
- **Primary collision-response window: t=0 through 50 ms, 12 steps.**
- Secondary observation: 50–150 ms, 24 further steps.
- No longer tail, get-up or hand-back is implemented in IFM-1.

Every body/source-state control is gated independently. Its failure invalidates only dependent cells. Every impact mode is then gated independently. A toe-phase failure, an RH1 failure, or one wrong-region hit must not suppress a valid other cell.

### Entry mechanical gate

Require finite quantities, positive mass and positive-definite inertia, permitted joint configuration under the exact bound range semantics, and no malformed/missing collider. Construction anchor residual <= **1e-6 m** and anchor-velocity residual <= **1e-6 m/s** before float32 readback. Report readback separately.

Grounding correction <=10 mm; initial turf penetration <= **1 mm**; self-penetration <= **10 mm**; no initial impactor overlap. Receiver horizontal momentum must equal M*v_authority to double-precision construction accuracy and to <= **0.01 N·s** after readback.

The uniform shift and bone-by-bone entry errors are also assessed against the **actual frozen handoff contract**, including its 0.18 m/s definition. A mechanically safe state that fails visual handoff remains a mechanical-only diagnostic, explicitly labelled `HANDOFF_FAILED`; it cannot count as a successful RUN-1-to-physics transition.

### Healthy C0 over 0–50 ms

Require the integrity/ledger checks in Section 9, no non-foot receiver–turf contact, no active-capacity violation and no hidden force/state correction.

For S-FLAT additionally require:

- initial supporting sole has positive ground normal impulse during at least **6 of the 12 steps**;
- integrated supporting-foot normal impulse >= **0.25*M*g*0.05**;
- cumulative tangential travel of its initial flat-support material point <= **10 mm**;
- pelvis height >= **0.85 of its initial height**.

The load minimum is a new scoped diagnostic guard against counting a freely collapsing, unloaded leg as a valid planted-support control. It is not a human-running force prescription. There is **no 2-BW upper-force gate** in IFM-1: large loads are assessed through state, impulse, energy and integrity rather than a transplanted standing/settling threshold.

For S-TOE do not require persistent support through normal toe-off or lock the whole foot. Report support impulses, material-point motion and release timing. Apply numerical/contact integrity and entry gates; classify loss of intended support separately. No failure there suppresses S-FLAT.

A C0 numerical/integrity failure inside 0–50 ms rejects that primary cell. A later C0 failure preserves the earlier verdict and truncates the valid secondary comparison. Do not shrink the primary window post hoc to rescue a cell.

## 9. Accounting and integrity

### Independent measurements

Record every receiver and impactor body's pose, COM, mass, world inertia, linear/angular velocity; all contact impulses; active motor impulses/work and capacity; passive potential/dissipation; position-correction information; and all declared external actions. Use a fixed local world origin O near the character and the same units/handedness throughout.

For the receiver:

`P = sum(m_i*v_i)`

`L_O = sum((c_i-O) cross (m_i*v_i) + I_i_world*omega_i)`.

Also report angular momentum about the instantaneous whole-body COM, but use the **fixed-origin** form for balance equations.

Close receiver momentum against opponent/wrench impulses, **measured** ground impulses and gravity. Close angular momentum against their moments using the actual solver application geometry. Include ground contacts on any segment, not just boots. Close receiver-plus-impactor balances as a second check; their mutual contact must not be counted as an external force on that combined system.

Never infer a missing ground/support impulse by rearranging the balance being tested. Internal actuation can do work but cannot supply net whole-system linear momentum; account for equal/opposite internal torque pairs.

Prospective IFM-1 closure tolerances:

- linear momentum residual <= **0.01 N·s per step**, and <= **0.05 N·s accumulated over the primary window**;
- angular-momentum residual about O <= **0.01 N·m·s per step**, and <= **0.05 N·m·s accumulated over the primary window**.

Report both signed cumulative residual and sum of residual norms. Do not treat stored warm-start impulses as an additional impulse on top of the net solved impulse for that step.

### Energy

Use the bound validated V2 work/energy ledger, with kinetic energy, gravitational potential and passive potential counted once. Include measured actuator work and passive dissipation. Native opponent/ground collision work must use the validated contact accounting; an unmeasured work term makes energy classification `UNMEASURED`, not PASS.

In W, the instantaneous injected work is the actual kinetic-energy jump at fixed pose, equivalently the sum of `J_i dot mean(v_before,v_after)` plus `K_i,COM dot mean(omega_before,omega_after)`. Separate that supplied work from numerical residual. Do not count both contact work and a copy of the same wrench work.

Require positive unexplained energy residual sum <= **0.5 J over 0–50 ms**. In the secondary interval retain the existing **5 J** interaction-horizon ceiling, reporting the stricter primary verdict separately. Accounted actuator/wrench work is not unexplained numerical generation.

### Joint/contact integrity

During the primary window require:

- finite state;
- maximum joint-anchor separation <= **1 mm**;
- self-penetration <= **10 mm**, with no IFM-1 `isoSelfCol` exception;
- turf penetration <= **10 mm**;
- no violation of the exact bound V2/RH1 joint-integrity and emergency-stop semantics;
- no actuator-capacity violation under the frozen actuator model;
- no post-entry receiver state correction outside native solver integration.

Saturation is reported, not automatically declared a body defect. Log requested **net** torque, delivered torque, activation and capacities. A large controller request is not evidence that the anatomical body is intrinsically inadequate.

Secondary failures receive their first time and subsystem. They do not overwrite a completed primary pass. If a state becomes unsafe, stop that trajectory immediately; do not continue through NaNs or grossly invalid physics for a nicer video.

## 10. Contact, response and Native/Wrench comparison

A qualifying opponent contact has solved impulse magnitude >= **1e-3 N·s**. For native mode require first-step contact on the intended body/subshape; an adjacent body is accepted only within the existing **30 mm shared-joint adjacency rule** and is explicitly labelled. Contact witness location must be within **10 mm** of the geometrically prescribed body-material patch, advected by the target body's actual transform at contact rather than held at its initial world position; normal within **15 degrees** of the planned approach normal. These tighter fixture-correspondence values are new IFM-1 instrument checks, not changes to IB-1's football-correspondence rows.

Record later contacts, regions and accumulated impulses separately. If the sphere immediately hits another anatomical region, that is not a valid instance of the intended role.

At h, 25, 50, 100 and 150 ms, record:

- receiver/impactor P, L_O, COM position/velocity;
- target material-point displacement and velocity;
- ankle/knee/pelvis/shoulder/elbow/wrist landmarks;
- torso and struck-segment orientations;
- supporting-foot impulses, motion and release;
- actual contact duration and **post-first-step opponent impulse**.

Compute struck-minus-C0 displacement and velocity at the same time. For rotation use quaternion/geodesic differences relative to C0, not subtraction of Euler angles. Normalize direction into a common anatomical inward-impact convention when comparing LEFT and RIGHT roles.

Do not demand equal impulses across regions or body variants. Report the native impulse and its angular component alongside normalized response. Report apparent point response compliance/effective mass only when the impulse-direction denominator is positive and well above numerical resolution; do not call it a full identified articulated mass matrix.

### Separate three verdicts

**Mechanical validity:** all applicable primary gates pass.

**Measurable causal response:** effect exceeds repeat/numerical noise and, within 50 ms, either a tracked struck-chain material point moves at least **1 mm** relative to C0 or a relevant segment rotates at least **0.1 degree**. These are diagnostic detectability thresholds, not “good-looking” thresholds. Report the older 0.2 m/s and 30 mm/150 ms markers for continuity with prior evidence; do not transplant them as mandatory 50 ms criteria.

**Visible usefulness:** Section 11. Numerical validity alone does not imply product value.

For N–W or N–X descriptive equivalence over 0–50 ms require maximum difference at tracked landmarks <= **10 mm** and torso/struck-segment orientation difference <= **3 degrees**, with the same relevant support-contact classification. Report full trajectories and differences even when inside these limits. A result outside the limits can still be useful but is not an equivalent explanation.

If N generates negligible post-first-step opponent impulse (< **5%** of its first-step impulse-norm sum), label this a weak challenge of sustained contact. Agreement supports initial-wrench sufficiency **for that impact**, not for prolonged tackles or planted-leg sweeps generally.

## 11. Actual gameplay-camera evaluation

Use the frozen RUN-1 character asset, skinning, normal gameplay camera, viewport and 1x zoom. Record all hashes/settings. No corrective blend, hidden root offset, special close-up-only framing, or presentation retarget may conceal entry or response problems.

Show 250 ms of the normal RUN-1 lead-in, with **no physical stepping**, followed by the 150 ms physical record. Produce C0/N/W comparisons, and X only where triggered, using exactly the same camera and world placement. Normal-speed gameplay view is primary; 0.25x and collider overlays are diagnostic only. Label the sphere as a diagnostic impactor rather than portraying it as a complete tackler.

Report actual projected landmark differences in pixels at 60 Hz. As a screening marker, note whether any struck-chain landmark differs from C0 by >= **2 pixels at two consecutive primary-window frames**. This is not a substitute for visual review, and failing it does not invalidate mechanics.

Prepare version-blinded A/B clips using a fixed label mapping. Judge separately:

1. Is entry acceptably continuous, including upper-body fit?
2. Is contact visually located on the correct body region?
3. Is the direction and propagation of response readable as caused by the impact?
4. Is the response visibly more informative than the no-hit continuation without looking unstable or weightless?

Record the review result and reviewer. If visual review is unavailable, return `VISUAL_PENDING`; do not infer visual approval from the 0.18 m/s statistic. Mark which frames are outside a healthy control interval. No claim of a completed tackle animation, recovery or superiority to a polished authored-reaction system is warranted by these clips alone.

## 12. Determinism and simulation neutrality

Every base trajectory runs twice in fresh processes. Run the complete available set once more in reverse order in one process with explicit canonical world reset. Receiver/impactor/constraint creation order and IDs are fixed. Include actuator/controller/reference state, contacts and mode state in hashes, excluding wall-clock timing.

Repeatability requires bit-identical per-step physical and rendered-pose outputs within the pinned runtime. Verify any snapshot restoration as specified for X. A failure confined to one mode blocks that mode; a shared harness/reset defect blocks affected evidence until an explicitly recorded correction and full affected rerun. No threshold change is allowed.

At the football boundary:

- consume the same fixed-step authoritative input history in animation OFF, RUN-1-only, and IFM-1 observer modes;
- hash **complete gameplay state, relevant events and gameplay RNG state per tick**, not just final position;
- physics has no write-capable reference to gameplay state and no channel to alter the input/control schedule;
- rendering cadence changes affect only viewing, not physical stepping or the football ledger;
- truncate future football input after each inspected boundary and verify unchanged prior output. The fixture's known constant-velocity trajectory and local target extrapolation are not future event queries.

Re-run IB-1's immutable-record verifier before/after. This proves record preservation only; it is not, by itself, a live engine neutrality test. If only recorded-input observation is available, report `READ_ONLY_RECORD_NEUTRALITY_PROVEN / LIVE_NEUTRALITY_NOT_TESTED` and do not overclaim.

W/X are explicitly offline branches. Their recorded native inputs must never enter the live football/input path or be described as causal production inputs.

## 13. CPU measurements

Measure construction separately from stepping. Time Jolt, passive tissue, actuator processing, SnapshotTone, mapping/render preparation and instrumentation independently. Exclude file I/O, visual capture, contact decoding and detailed diagnostics from the reported production-like step cost, but report their actual overhead separately.

After correctness runs, take one untimed warm-up and **20 fixed replays** per available primary mode with detailed logging disabled. Confirm state hashes on verification-enabled companion replays. Report median/p95/max per step and total 50/150 ms event CPU. For W, separate replay-consumption cost from the cost of producing N's offline data. For X, report branch overhead separately; it is not a production runtime.

Extrapolate **0, 1, 2 and 4 simultaneously active receivers**, clearly labelled arithmetic extrapolation rather than a measured interacting-island benchmark. Do not claim 22-player or mobile viability. Ordinary players require zero articulated stepping in the proposed architecture. No performance parameter sweep or solver optimization belongs in IFM-1.

## 14. Gameplay J is not the physical input

IB-1's gameplay `J`, `dvCom`, `dvTackler` and spin are reduced-model quantities. In the inspected gameplay code, receiver COM transmission uses a factor: `dvCom = J*xmit/M`; applying J directly to an articulated body does not reproduce that reduced COM change by internal articulation alone.

For example, the historical planted-leg benchmark has approximately J=144.13 N·s, M=73 kg and dvCom=0.494 m/s, corresponding to only about 36.1 N·s in that reported COM term. This is a reason to audit the complete external/support/movement ledger, not to invent the difference as a ground impulse.

**IFM-1 never applies gameplay J.** Native mode measures an impulse from its own frozen instrument geometry and motion. W uses only that native first-step wrench. Comparisons with gameplay quantities are descriptive and labelled different models. Do not tune speed, mass, friction, phase, contact point or impulse duration to make them agree.

These controlled fixtures have no preassigned recover/stumble/fall outcome. Their response cannot contradict a football result they do not purport to reproduce. They are a mechanical architecture comparison, not new frozen IB-1 cases. Full outcome-compatible football integration remains a separate next experiment.

## 15. Stops, results and architectural decisions

Use per-body/state/cell statuses:

`PROVENANCE_BLOCKED`, `STATE_UNAVAILABLE`, `FIXTURE_GEOMETRY_BLOCKED`, `INITIALIZATION_INVALID`, `TARGET_DOMAIN_BLOCKED`, `HANDOFF_FAILED`, `CONTROL_INVALID_PRIMARY`, `NATIVE_CORRESPONDENCE_FAILED`, `NATIVE_INTEGRITY_FAILED`, `WRENCH_REPLAY_NOT_STATE_MATCHED`, `PRIMARY_MECHANICS_VALID`, `VISUAL_PENDING`, `VISIBLE_VALUE_LOW`, and `SECONDARY_FAILURE_AT(t)`.

No combined “all cells must pass” verdict. Freeze/run/report all safely available cells. Known global qualification failures are always displayed beside scoped IFM-1 results. Nothing is labelled globally qualified.

| Result | Permitted architectural conclusion |
|---|---|
| N and state-matched W are mechanically valid and visibly useful | Initial-disturbance-driven articulation is viable for those cells; no evidence that preceding physical running is required. Inspect continued-contact exposure before generalizing. |
| N works; W fails or differs | First check replay fidelity. If X also loses the useful response, continued contact matters for that cell. If X matches N, wrench reconstruction/timing is the problem. Without X where required, necessity is unresolved. |
| SW/SH work; PL/TP do not | Pursue local responses while isolating support/foot-domain limits. This does not justify fixed-pelvis planted-leg sweeps or abandoning all V2 contact. |
| R0 works; RH1 fails | R0 is the better experimental representation in that cell; RH1's entry improvement is not sufficient justification. Do not call R0 globally qualified. |
| RH1 works; R0 fails | Evidence favours the RH1 body-plus-mapper in that domain. Historical RH1/G0/G3 failures remain; no adoption. |
| Both fail despite healthy C0 and correct native contact | Localize native joint/contact/solver/actuator-response failure. More pre-contact carrier work is not an established remedy. |
| Both C0 controls fail | This protocol has not reached a valid test state there. Attribute initialization, support representation or SnapshotTone separately; no verdict that collision response is impossible. |
| Valid 0–50 ms response; later gait/pose fails | Preserve primary success and report the later failure. Recovery/return needs a different production mechanism; neither is proved or disproved globally here. |
| Numerically valid physics; little gameplay-camera value | Reduce or reject the physical scope for those events. Do not increase fidelity merely to defend sunk effort. |
| TP fails at entry | F0 cannot represent the selected toe state under this handoff. Keep valid flat-state findings; do not infer universal failure of rigid-foot interactions. |

Do not automatically repair the next gate, run another phase, increase iterations, add a toe, widen a bound, redesign a controller, or start a return-to-locomotion experiment.

## 16. Deliverables and final stop

Create only a new isolated IFM-1 evidence area with:

- approved preregistration and immutable input manifest committed before implementation; geometry-only fixture manifest and implementation hashes additionally committed before any new Jolt stepping;
- hashes and protected-file before/after verification;
- raw per-step records, solved per-contact wrench records, C0/N/W/X provenance and safe-stop markers;
- per-cell primary/secondary, handoff, visual, ledger and performance tables;
- actual-camera clips and diagnostic overlays;
- `IFM1_RESULTS.md` distinguishing observations, interpretations and unknowns;
- a one-page architecture decision: which interaction domains earn V2, which require native ongoing contact, whether RH1 helps, whether F0 limits coverage, and the single next proposed integration test.

Report every skipped/rejected cell and its reason. Keep the original RH1 invalid verdict, shared R0/RH1 failures and unauthorized historical G0 exemption visible. No source, threshold or historical evidence is altered.

**After the approved IFM-1 experiment and report, stop for the owner's decision. Do not adopt RH1/R0, implement production collisions or recovery, modify RUN-1, or begin another experiment.**
