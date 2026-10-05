# E1a unload blocker: causal investigation (diagnostic only; nothing adopted)

**Authority:** `../sources/2026-10-05_user_instruction_e1a_unload_causal_investigation.md`.
- E1b unauthorised.
- No fix is implemented.
- The frozen E1a runs (`official/`) are unchanged.
- Nothing here changes a threshold, the pelvis drop, the knee or the twist policy.

**Tools (diagnostic):**
- `tools/e1a_unload_trace.mjs`: the E1a pre-lift protocol, per-tick decomposition, one-at-a-time counterfactuals, release-suppressed mode.
- `tools/e1a_unload_diag.mjs`: the earlier factor screen.

**Evidence:** `unload_investigation/summary_all_runs.json` (186 runs: scalar outcomes, attributions, 10 Hz series) and `unload_investigation/full/` (complete traces of the key runs).

**Conventions:**
- V2-REF, 2.5 cm planned drop, left foot to be lifted, unless stated.
- "Release suppressed" = the lifecycle's release disabled, so the support-state residual stays measurable. It is a counterfactual only.

## 0. Root cause, in one paragraph

**Primary cause: a latent bug in the support controller's feed-forward for a knee that is axially twisted** (category 1).
- The knee's varus axis is locked and has no actuator.
- With the tibia twisted by t, the knee's flexion DOF moves about (0, cos t, −sin t) in tibia-frame axes. The passive layer documents this geometry as its "G1 locked-axis fix" (`sim/v2_passive.js`).
- So the flexion actuator row must carry **T·ŷ − tan t·(T·ẑ)**. The controller projects only **T·ŷ**.
- Under the corrected knee's reference path the stance knee is twisted **t ≈ 7.1°** at E1a's 24° flexion. It carries a frontal (varus) statics moment **T·ẑ ≈ 47.5 N·m**.
- The flexion feed-forward is therefore **5.9 N·m short**. The stance knee's posture PD makes up the shortfall with about a 1° error, so the pelvis sits **0.94 mm below its posture target**.

**How that becomes foot load: posture regulation through a zero-share leg** (categories 2 and 4).
- The intended swing foot is still in SUPPORT (s = 1). Its leg keeps full posture-servo authority toward the same, unreached pelvis target.
- So it presses that height deficit into the turf at about **8.3 N per mm**: **8.75 N = 1.13 % BW**.
- The lifecycle releases support only below 1 % BW, and the controller withdraws support authority only after release. The result is a deadlock.

**Old knee:** t ≈ 0 under load, so the bug was inert. **Not:** passive tissue, contact geometry, or the requested share.

## 1. Per-tick decomposition of the final unloading phase (V2-REF, 2.5 cm, 8.5 s, λ_R = 1.0; release suppressed: identical to the official run up to the release decision)

| quantity | value |
|---|---|
| requested share (left / right) | 0 / 1 |
| commanded share, i.e. the balance controller's lever rule (left / right) | 0 / 1 (exactly 0 here; see §5 for leakage) |
| measured normal load (left / right) | **8.71 N** / 765.4 N |
| left CoP | on the sole, about 18 mm lateral of the ankle. 8 of 8 pieces touching; manifold penetration 0.0002 mm |
| commanded left foot force (feed-forward foot term) | 0 N |
| left-leg passive tissue torques | ≈ 0 (hip, knee and ankle within their zero-torque zones) |
| pelvis posture target − actual | **+0.94 mm** height; roll / pitch / yaw −0.29° / −0.04° / −0.34° |
| ξ − ξ_ref | 5.8 mm lateral (balance target over the stance foot; p inside the stance region; hip strategy r = 0, L̇ = 0) |
| swing / unloaded-foot hold terms | inactive. s = 1, so the G3 support path; the lifecycle's non-supporting branch is not entered |
| lifecycle-dependent terms | s = 1: full support polygon, no gain blending, share cap t ≤ s inactive |

### Actuator rows of the intended swing (left) leg (N·m)

Each row splits as ff = gravity / d'Alembert part + foot-force part, plus the posture PD (= K·e).

| row | ff (gravity / foot) | posture PD | applied | passive |
|---|---|---|---|---|
| hip rot | −0.53 (−0.53 / 0) | −0.10 | −0.61 | 0 |
| hip flex | 7.08 (7.08 / 0) | **+0.37** | 7.45 | 0 |
| hip abd | 6.51 (6.51 / 0) | **+0.44** | 6.93 | 0 |
| knee rot | 0.09 | 0.05 | 0.11 | 0 |
| knee flex | 1.70 (1.70 / 0) | **−1.31** | 0.52 | 0 |
| ankle df / inv | 0.79 / 0 (torque-only; K = 0) | 0 | 0.79 / 0 | 0 |

### Vertical foot force carried by each term

Virtual work through the controller's own leg-chain Jacobian, pelvis held; + lifts the foot, − presses it:

| term | contribution |
|---|---|
| gravity feed-forward | +68.0 N (cancels the leg's own weight) |
| foot feed-forward | 0 |
| **posture PD** | **−12.6 N**, of which **knee flexion −15.0 N**, hip flexion +2.1 N, hip abduction +0.5 N |
| passive | 0.01 N |

Net ≈ 10 N pressing, against 8.7 N measured. The residual is within the method's approximations: pelvis held, knee axial / varus rows outside the 6-coordinate chain.

### Stance (right) leg: the origin

- **Stance knee flexion:** ff −48.1, **posture PD −5.05 N·m**, applied −52.9.
- **Stance knee:** twist 7.10°, frontal statics moment 47.5 N·m, **missing locked-axis term −tan t·T·ẑ = −5.92 N·m**.
- **Old knee in the same state:** posture PD −0.14 N·m.

## 2. Counterfactuals (one mechanism at a time; diagnostic only, none adopted; V2-REF unless stated)

| counterfactual (from 7 s unless stated; release suppressed) | left load (last 0.5 s) | reading |
|---|---|---|
| none (baseline) | **8.75 N (1.13 %)** | — |
| left hip + knee posture PD removed | 1.90 N; **with release enabled it releases at 7.01 s** | the pressing is the swing leg's posture servo |
| left **knee** posture PD removed | **1.03 N** | the knee row dominates |
| left hip posture PD removed | 6.37 N | the hip is a minor part |
| left knee **axial** PD removed | 8.75 N | twist servo not involved |
| left IK with the knee axial at its current value ("current" semantics, left leg only) | 8.73 N | the swing leg's own twist coupling is not the cause |
| left IK solved from the **actual pelvis height** | **0.62 N** | the height deficit drives the PD |
| left IK from the actual pelvis orientation | 9.47 N | orientation error does not drive it |
| left ankle feed-forward removed | 9.40 N | ankle +0.65 N, minor |
| left gravity feed-forward removed | body destabilises (foot relocated) | the gravity ff is load-neutral when present |
| right (stance) posture PD removed | load 30 N, not settled | coupling: the stance leg's posture servo sets the pelvis height |
| **both knees' flexion ff given the missing term −tan t·(T·ẑ)** (the root-cause test) | **0.12 N (0.016 %)**; stance knee PD −5.05 → +0.13 N·m; pelvis error 0.94 → −0.04 mm | **causal: removing only the missing term removes the residual** |
| the same, from t = 0, release enabled | **released at 7.70 s** | the deadlock is broken |

### All 8 bodies (release suppressed)

| body | residual | stance knee twist / T·ẑ | missing ff vs posture PD | pelvis error | with the missing term | released? |
|---|---|---|---|---|---|---|
| V2-REF | 8.75 N (1.130 %) | 7.10° / 47.5 N·m | −5.92 vs −5.11 N·m | 0.96 mm | 3.08 N (0.40 %) | yes, 7.70 s |
| V2-165-62 | 7.68 N (1.244 %) | 7.49° / 35.1 | −4.61 vs −3.89 | 0.99 mm | 2.36 N (0.38 %) | yes, 7.68 s |
| V2-198-92 | 9.42 N (1.033 %) | 6.78° / 59.8 | −7.10 vs −6.28 | 0.93 mm | 3.89 N (0.43 %) | yes, 7.75 s |
| V2-175-70 | 8.17 N (1.175 %) | 7.26° / 41.4 | −5.27 vs −4.51 | 0.97 mm | 2.73 N (0.39 %) | yes, 7.69 s |
| V2-190-85 | 9.10 N (1.080 %) | 6.94° / 53.5 | −6.51 vs −5.69 | 0.94 mm | 3.47 N (0.41 %) | yes, 7.73 s |
| V2-short-legs | 9.30 N (1.201 %) | 7.17° / 47.1 | −5.92 vs −5.17 | 0.94 mm | 4.09 N (0.53 %) | yes, 7.98 s |
| V2-long-legs | 8.16 N (1.055 %) | 7.04° / 47.9 | −5.91 vs −5.08 | 0.98 mm | 2.31 N (0.30 %) | yes, 6.58 s |
| V1-matched | 8.35 N (1.079 %) | 6.94° / 49.2 | −5.98 vs −5.23 | 0.95 mm | 3.25 N (0.42 %) | yes, 7.75 s |

- The posture PD compensates about 85 % of the missing term.
- The residual that remains after adding the term is a second, smaller mechanism (§5).
- The mirrored right-foot official run gives the same 8.62 N, so the mechanism is symmetric.

## 3. Why a smaller pelvis drop gives a lower swing-foot load

Release suppressed; the twist and the missing term are those of the stance knee:

| drop | stance knee twist (= θ0 at its flexion) | missing flexion ff | stance knee posture PD | pelvis error | swing-foot load |
|---|---|---|---|---|---|
| 0 cm | 1.43° | −1.02 N·m | −0.98 | 0.03 mm | 3.58 N *(of which 3.40 N is commanded-share leakage, §5)* |
| 1.0 cm | 3.48° | −2.60 | −2.75 | 0.22 mm | 2.17 N |
| 1.5 cm | 5.14° | −3.98 | −3.76 | 0.47 mm | 4.75 N |
| 2.0 cm | 6.25° | −5.02 | −4.48 | 0.71 mm | **6.90 N (0.89 %)** → released |
| 2.5 cm | 7.10° | −5.92 | −5.05 | 0.96 mm | **8.75 N (1.13 %)** → deadlock |
| 3.0 cm | 7.80° | −6.73 | −5.54 | 1.21 mm | 10.38 N |

**The counterintuitive result is the diagnostic one:**
- A deeper drop bends the stance knee more.
- The corrected knee's reference path θ0(φ) then twists the tibia more, about 0.3° per degree of flexion here.
- The missing locked-axis term tan t·M_frontal grows with it; the frontal moment also grows mildly, 41 → 49 N·m.
- So the stance knee sags more, and the zero-share leg presses that larger height deficit into the turf.
- The load tracks the pelvis error at about **8.3 N/mm** (from 1.0 to 3.0 cm).
- At 2.0 cm the support-state residual (6.9 N) stays below the 1 % threshold, so the foot releases as its load falls through 7.7 N during the transfer. At 2.5 cm it plateaus above.

**With the missing term added**, the pelvis error is 0.03–0.04 mm at every drop.

## 4. Why the old knee and the "current" twist policy release at 2.5 cm (counterfactual evidence only; both remain rejected)

| configuration at 2.5 cm | stance knee twist | missing term | pelvis error | swing-foot load |
|---|---|---|---|---|
| adopted (`v2k` + reference) | 7.10° | −5.92 N·m | 0.96 mm | 8.75 N → deadlock |
| "current" twist policy | 4.00° (the twist stays near its start value) | −3.16 N·m | 0.52 mm | 4.44 N → released |
| old knee | 0.00° (no moving neutral; the reference twist is 0) | 0 | 0.04 mm | 3.26 N (of which 3.41 N is commanded share) → released |

- Neither alternative is "better" physics. They simply **do not twist the stance tibia under load**, so the controller's mapping error has nothing to act on.
- The corrected knee is behaving as its evidence says it should (screw-home reversal with flexion).
- **The defect is in the controller, which was never exercised with a twisted, frontally loaded knee.**

## 5. Second, smaller mechanism: commanded-share leakage (category 5)

**What it is:**
- The G3 load split sets each foot's share by the lever rule: the position of the desired CoP p along the line between the two feet's region centroids.
- The request λ only **relaxes the floor** (`flL = min(minShare, 1 − λ)`). It does not cap a foot's share at its request.
- When the stance tracks well (ξ ≈ ξ_ref), p sits slightly medial of the stance centroid. The zero-request foot is then commanded **0.25–0.67 % BW** (share 0.0025–0.0067). Its leg's foot feed-forward presses with that force.

**Where it shows:**
- the old knee and 0 cm (3.4 N);
- every run with the missing term added (2.3–5.2 N).

**Counterfactual:** cap the left foot's commanded share at its requested share, removing only the excess foot force.
- **Alone:** no effect (8.72 N), because the primary mechanism dominates.
- **Layered on the missing term:** **0.15–0.36 N on all 8 bodies**, released at 6.50–7.25 s.
- **Across drops 0–3 cm:** the support-state load decays to **0.04–0.36 N**; released at 6.51–6.66 s.
- **Old knee + cap:** 0.20 N, released at 6.60 s. The corrected configuration with both corrections behaves like the old knee.

## 6. Classification

| question | answer (from the measurements) |
|---|---|
| 1. unintended consequence / bug in the support controller | **Yes, the primary cause.** The knee flexion feed-forward lacks the locked-axis twist term. Latent since G2; exposed by the corrected knee's evidence-based axial rotation. It also biases stance accuracy generally (pelvis −1 mm, the knee PD carrying 5–6 N·m) |
| 2. intended posture / balance regulation not withdrawn as share → 0 | **Contributing amplifier.** A SUPPORT leg remains a posture strut regardless of its requested share, so it converts any stance posture error into foot load at about 8.3 N/mm. The commanded-share leakage (§5) is the same family: the request does not bound the command |
| 3. unavoidable physical residual contact | **No.** With both corrections the load is 0.04–0.36 N in support and about 0 after release; penetration 0.0002 mm |
| 4. lifecycle circular dependency | **Yes, structurally.** Support authority is withdrawn only after release, and release requires the load to fall below 1 % BW. Any posture error above about 0.9 mm (1 % BW ÷ 8.3 N/mm) at the end of the transfer deadlocks it. The bug supplied that error |
| 5. something else | The commanded-share leakage (§5), plus a slow pelvis-height transient (time constant about 0.5 s) at the end of the transfer ramp. Neither blocks release once the bug is corrected |

## 7. Option A vs Option B (from mechanism)

**A: intent-gated release.** It would break the deadlock by trusting the plan over the measurement.
- It would release a foot that a buggy stance feed-forward is still pressing with about 8 N, and hide the bug, which also degrades stance accuracy.
- It needs a new intent threshold or dwell.
- Once the controller stops pressing, the existing load-based release fires at 6.5–7.3 s on every body and drop, as the requested share passes below about 1 % near the end of the transfer ramp (§5).
- **Not recommended.** The physical confirmation that the foot really is unloaded should stay the release condition.

**B: remove the term that presses the foot.** The measurements identify two terms:

| | change | assessment |
|---|---|---|
| **B1 (necessary)** | the locked-axis-consistent knee feed-forward | Removes 8.6 of the 8.75 N and the stance sag, on every body and drop |
| **B3 (necessary for "zero share means zero commanded force")** | a foot whose requested share is being withdrawn is never commanded more than its request | Removes the remaining 2.3–5.2 N leak |
| B2 (deferred) | continuous withdrawal of a zero-share leg's posture authority (making the leg follow the body instead of holding the pelvis) | Alone it also breaks the deadlock: 0.4–2.1 N, release at about 6.45 s, even with the bug present. But as a height-only blend layered on B1 it **slowed** the post-transfer posture settling and **raised** the residual (5–9 N), because the zero-share leg's posture servo helps that transient settle. Proper B2 needs its own design and characterization. **Not part of the minimal fix**; recorded as debt (§10) |

**Recommendation: B (B1 + B3), keep the existing load-based lifecycle release, no A.**
- The architecture already has the shape the physics requires: continuous unloading by control (the requested share ramps to 0), followed by a load-confirmed state transition.
- It failed only because two controller terms kept commanding force into a foot the plan had unloaded.

## 8. Proposed mechanism (NOT implemented; default-off flags; the default path stays bit-identical)

**B1: locked-axis-consistent joint feed-forward** (controller option `ffLockedAxis`, default off; on in a new adopted-configuration addendum).
- **Rule:** for every joint with a locked rotational axis (knee varus, elbow carrying angle), the actuated rows carry the generalized forces of the free coordinates, not the body-2 projection.
- **Knee (locked ẑ, twist t from the constraint-space decomposition):**
  - flexion row τ_y = T·ŷ − tan t·(T·ẑ);
  - twist row τ_x = T·x̂, unchanged.
- **Elbow:** the same rule with its locked axis.
- **Basis:** exactly the geometry of the passive layer's G1 locked-axis rows (a vector identity, no new parameter). Optionally the posture PD's flexion error gets the same mapping (a cos t factor, ≤ 1 % at |t| ≤ 8°).
- **Singular only at |t| = 90°.** The knee twist is bounded by its hard limits (≤ about 30°).

**B3: requested share bounds commanded share for a foot being unloaded** (option `shareCap`, default off).
- **Rule:** when a transfer request exists and a foot's requested share is below the lifecycle's `loadOff` (1 % BW, its existing definition of "unloaded"), that foot's commanded share is clamped to its requested share.
- The stance foot's feed-forward takes the remainder. The CoP is clamped to the stance region; any unreachable part goes to the existing hip strategy r.
- **No new threshold:** `loadOff` already defines "unloaded" in the lifecycle. Clamping only below it leaves G3's balance authority untouched wherever the plan still wants load on both feet.

**Unchanged:**
- the lifecycle (load-based release, `loadOff` 1 %, `loadOn` 3 %, debounce, wantShare);
- the protocol, criteria, knee, twist policy, anatomy and gains.

A support-state transition removes authority only. **Physics decides whether the foot leaves the ground.**

## 9. Proposed preregistered validation (to be frozen and committed before any implementation run)

**V1: mechanism bench (kinematic, no stepping)**
- **B1:**
  - **Grid:** knee twist t ∈ [−10°, 10°] × flexion [0°, 60°] × random statics torques with frontal components, plus the elbow.
  - **Rule:** the actuated rows reproduce the free coordinates' generalized forces to ≤ 1e-9 relative, and do no work on the locked direction.
  - **Discrimination:** the naive projection must fail by tan t·T·ẑ.
- **B3:** every tick of the G3 scenario set and of the unload protocol: share_n ≤ requested_n whenever requested_n < loadOff; elsewhere identical to G3 (flag-off identity).

**V2: separate unload characterization dataset** (not E1a; both feet; all 8 bodies; drops {0, 1.0, 2.0, 2.5, 3.0} cm)
- **Zero-share requests:** λ → 1.0 (and → 0.0 mirrored).
  - **Mechanistic:** at every tick in single support, \|stance knee posture PD\| ≤ 10 % of \|tan t·T·ẑ\|. B1 must carry the locked-axis term; the PD must not.
  - Zero-share foot load falls below loadOff and the foot is released, with no time-out.
  - Load at 1.5 s after the ramp within the measured resting-contact band of a touching unloaded foot (≤ 0.5 % BW; `../final_pre_e1a/E1_PREREGISTRATION.md` §1).
- **Small nonzero shares:**
  - requests 2 %, 3 %, 5 % (≥ loadOff): B3 inactive, so the commanded share is identical to flag-off; **no false release** while the load is ≥ loadOff;
  - request 0.5 % (< loadOff): commanded share ≤ request at every tick.
- **Perturbations near the release boundary:** thorax pushes 2.5 / 5 N·s toward and away from the unloading foot at λ 0.99 and 1.0, before and after release.
  - A push that loads the foot re-enters support through LOAD_ACCEPT (intent or load).
  - No state is re-entered within 60 ms (no chatter).
  - No TOUCHING ↔ LOAD_ACCEPT oscillation.
  - Stance slip ≤ 1 mm.
- **Recontact:** after release the foot stays TOUCHING with load < loadOn for ≥ 2 s, at every drop.
- **Safety:**
  - energy closure ≤ +0.05 J per tick and Σ+ ≤ 0.5 J;
  - Δτ applied ≤ 10 N·m per tick (25 at contact onsets) and Δτ0 ≤ 30 N·m, including across the release;
  - no authority writes; external impulse = test impulses only;
  - the foot's displacement at release ≤ 0.5 mm (release never moves a foot);
  - determinism ×2 bit-identical; browser = Node on 2 runs.
- **Discrimination arms** (must fail where the mechanism predicts):
  - B1 alone with share leakage present → residual ≥ 0.25 % BW;
  - B3 alone → deadlock reproduces at 2.5 cm;
  - the original configuration → deadlock (the official result).

**V3: regression**
- KV0 (flags off: the default path bit-identical, 4 / 4 G3 hashes; suite plus new regressions for B1 / B3).
- G0.
- G1 (passive; must be hash-identical: no controller).
- G2 and G3 v3.3 in the adopted configuration + flags: every gating row incl. K′, with J2a 81 / 81 using the new terms mirrored.
- Twist battery C1′ … C7′.
- KV6c 8 bodies.
- Boundary harness 180 / 240 / 480 Hz.
- KV10 yaw decomposition.

**V4: then** a re-frozen, versioned E1a configuration addendum (flags on). E1a is re-run unchanged only after explicit approval.

## 10. Expected effects, risks, debt

**G0 / G1:** no effect (structural / passive; no controller).

**G2 / G3 (adopted configuration):**
- Stance-knee torque accuracy improves wherever the knee is twisted under a frontal moment; the pelvis height error falls from about 1 mm to about 0.03 mm in single support.
- Outcomes should be the same or better, but every hash changes, so they must be re-run in full.
- **Default configuration** (old knee, flags off): bit-identical.
- **Risk (B3):** clamping the unloading foot's share can push the CoP to the stance edge earlier, so the hip strategy (r ≠ 0) and the supervisor may engage more often in G3 E / F / G / H (near-single-support, unloading, speed, perturbation-during-transfer). Below loadOff the plan already says "stance only", so this is expected to be small. It must be shown, not assumed.

**E1a:**
- With B1 + B3 the unload releases on every body at 6.5–7.3 s in counterfactual, so E1a would reach its lift.
- **The lift, hover, touchdown and load acceptance remain untested.** New failure modes are possible there.

**New debt / risks:**
- **D-1:** the elbow has the same locked-axis mapping. It is part of B1; arm tasks in G4 depend on it.
- **D-2:** the posture-coupling amplifier remains (a SUPPORT leg presses at about 8.3 N per mm of stance posture error). B2 is deferred, and V2's perturbation arm decides whether it becomes necessary.
- **D-3:** a slow pelvis-height transient (about 0.5 s) after a transfer ramp. Reported.
- **D-4: validation-gap lesson.** Lifecycle tests at the planned drop used an external lift that forced release. V2 exercises intent-only unloading.
- **TD-16** (hip combined end-range review) is unchanged.

**Integrity:** none of the counterfactuals is adopted; all ran outside the frozen tree's E1a harness. The tracer's own two development errors are recorded in `../DECISIONS.md` E1-2. One was an ablation dispatch bug (found by an identity check, ≤ 2.4e-11 N·m); the other was two badly designed layered ablations (foot force and height withdrawal applied from t = 0), whose results are void and marked in the summary file.
