# Record-hinged V2 runner (RH1) and mapping contract MC-1: PREREGISTRATION

**Status:** PREREGISTERED. This text is committed before the RH1 spec, the MC-1 mapping or any validation run exists. Nothing below is changed after results; a defect found later is recorded as an erratum next to this text.

**Source:** `../sources/2026-10-10_user_decision_record_hinged_v2_implement_validate.md` (084f736d), decisions D1–D4.
**Basis:** `../interaction_time/run1_handoff/V2_UPPER_BODY_REPRESENTATION.md` (edfa2b8f), alternative D12n.

**Fixed scope (unchanged and never modified here):**
- RUN-1, LV2-STATE-1 and the frozen locomotion (consumed only as a `git archive` of `locomotion-v2-straight-baseline-1` = 4a226b1f);
- the simulation, gameplay collision geometry and stride clocks;
- every existing validated V2 body spec: they must stay **byte-identical** (§1.4);
- no tackle, recovery, fall behaviour, PI-1 or promotion bridge.

## 1. The exact record-hinged anatomy (D1)

### 1.1 Identity

| item | value |
|---|---|
| new spec id | `PI1-runner-vinicius-RH1` (human `PI1_RUNNER_RH1`, file `spec/v2_pi1_runner_rh.js`) |
| base | `PI1_RUNNER` (`spec/v2_pi1_runner.js`), unchanged: H 1.76 m, M 73 kg, every override, ankle neutral K 0.13 |
| record | `assets/characters/outfield/vinicius/rig.json`, blob 6ca64389 (identical at f5f6076, at HEAD and in the frozen LV2 tag) |
| bodies | 14, unchanged topology and order |

### 1.2 The three moved joint centres (V2 canonical T-pose frame; the record's bind frame coincides with it: hip midpoints both at (0, 0.921615, 0), gap 0.0 mm)

| joint | current centre (m) | RH1 centre (m) | source in the record | move (mm) |
|---|---|---|---|---|
| lumbar | (0, 1.068905, −0.029920) | **(0, 1.029058, 0)** | `spine.bindOrigin` | (0, −39.847, +29.920) |
| thoracic | (0, 1.286757, −0.038720) | **(0, 1.243945, 0)** | `chest.bindOrigin` | (0, −42.813, +38.720) |
| elbow_L / elbow_R | (∓0.548255, 1.458831, 0) | **(∓0.559812, 1.458831, 0)** | the shoulder (unchanged, ∓0.246994) plus the record's upper-arm length 0.312818 m along the canonical arm axis | 11.557 distal |

- Upper arm becomes 0.312818 m (record). Shoulder → wrist stays 0.588833 m, so the forearm (elbow → wrist) becomes 0.276015 m (record 0.276016).
- **Unchanged joint centres:** neck, shoulders, hips, knees, ankles.

### 1.3 Hinge-only rule (what changes and what may not)

**Changed, and nothing else:**
- `joint.at` of lumbar, thoracic, elbow_L, elbow_R;
- the child bodies' `origin` (abdomen, thorax, forearm_L, forearm_R), with `comLocal`, `comBodyLocal` and every collider `pos` re-expressed relative to the new origin so that **world-frame COM, inertia and collider placement at the canonical pose are unchanged**;
- `upperArm_L/R.distal` (= the new elbow);
- the render-skeleton positions that sit at these joints (spine_01 = lumbar, spine_02 = thoracic, spine_03 = midpoint of the thoracic joint height and C7 height at the thoracic AP, lowerArm = elbow, upperArm_twist = 50 % of the new upper arm, forearm_twist = 60 % of the new forearm) and the frames derived from them;
- a provenance record `spec.hinges`.

**Preserved exactly (checked bit for bit or ≤ 1e-12):** body masses (body + equipment), world COM at the canonical pose, inertia tensors (canonical frame, about the COM), whole-body totals, collider shapes and their world placement, joint frames (A, Rz, Cm, F1, F2, axes), ranges (active, hard, combined), passive parameters, actuator capacities, disabled pairs, landmarks, the pelvis / thigh / shank / foot bodies and the hip / knee / ankle joints, the neck and shoulder joints.

**Consequence (stated, not tuned):** in the upright canonical pose the gravity moment of the mass above the lumbar joint changes from 10.58 to 0.00 N·m (36.05 kg; AP arm 29.9 → 0 mm) and above the thoracic joint from 9.17 to 0.00 N·m (24.13 kg; 38.7 → 0 mm). The forearm's transverse inertia about the elbow falls by 8 %.

### 1.4 Generator neutrality (implementation rule)

- RH1 is produced by the unchanged generator plus an **opt-in** post-step selected only by a new human field `hinges` (`spec/v2_hinges.js`; one guarded call in `spec/v2_spec.js`).
- **Stop if** any of these 20 existing spec hashes changes (computed at 084f736d before any code change):

| body | default | ankle K 0.13 |
|---|---|---|
| V2-165-62 / V2-175-70 / V2-REF / V2-190-85 | 13fa5bfa / 0ca23788 / ceda2998 / 9044adba | ad6000f6 / 25f0a00e / 7df7ab64 / 255fe27c |
| V2-198-92 / V2-long-legs / V2-short-legs / V1-matched | f86d3971 / d5920ded / 5b56bcc8 / dd54edaa | 8123aba9 / 84103139 / e6385ac4 / d81cdbe4 |
| PI1-runner / PI1-runner-F1 | 2a894c69 / 7a9991f3 | 62d5d797 / df4942bd |

## 2. Mapping contract MC-1 (D2): equations

**Input** (one activation at τ₀): the LV2-STATE-1 state at τ₀ (23 rig bones: world position, rotation, linear and angular velocity; per-leg stance flag) and, for the lower-body derivative only, LV2 states at τ₀ ± δ (δ = 0.1 ms, central; one-sided second order at a declared event). These are queries of LV2's continuous pose function (the method LV2 uses for its own exported velocities), never rendered frames. RIG bind = `rig.json` bind (identity rotations).

**Carrier bones:** pelvis ↔ pelvis, abdomen ↔ spine, thorax ↔ chest, head ↔ head, upperArm ↔ upperArm, forearm ↔ foreArm, thigh ↔ thigh, shank ↔ shin, foot ↔ foot.

**Reference material (V2's own mass model):** for each body i with carrier bone b(i), the bind offset `l_i = c_i^bind − p_b^bind` (V2 COM at its bind pose; rig bind rotations are identity). At τ₀: `c*_i = p_b + R_b l_i`, `R*_i = R_b Z0_i`, `v*_i = v_b + ω_b × (R_b l_i)`, `ω*_i = ω_b`, from LV2's exported (analytic) bone values.

**(1) Lower body (pelvis, thighs, shanks, feet):** the frozen PI-1 mapping, unchanged in effect: rig rotations through V2's bind, R-K leg retarget, hard-ROM projection, RF-1 boot reconciliation on stance feet, pelvis at the rig hip midpoint. Its twists: the central δ-derivative of that mapping along LV2's pose function. Implemented in `map/v2_lv2_map.js` and **required to equal `pcg_rev1.makeMapper(…, { knee: "RK", rf1: true })` bit for bit on every evaluated instant** (stop if not).

**(2) Upper-body pose (abdomen, thorax, head, arms):** θ = the unlocked anatomical angles of lumbar, thoracic, neck (3 each), shoulders (3 each) and elbows (flex, pron) on the RH1 joint frames; bodies chained from the fixed pelvis through the RH1 hinges.
- `θ̂ = argmin_θ Σ_{i ∈ U} m_i ‖c_i(θ) − c*_i‖² + ‖L_iᵀ R_iᵀ φ(R_i R*_iᵀ)‖²`, subject to every angle inside its hard range.
- φ = rotation vector, `L_i` = Cholesky factor of the canonical-frame inertia `I_i` (`L_i L_iᵀ = I_i`), R_i the body's canonical → world rotation.
- Solver: projected Levenberg–Marquardt from the copy mapping (clamped), forward-difference Jacobian (1e-6°), stop at relative objective decrease < 1e-16 or 60 iterations. Deterministic.

**(3) Velocities (V-d):** generalized velocities u = [v_pelvisCOM, ω_pelvis, ω_rel per joint].
- `û = argmin_u ½ Σ_i m_i ‖v_i(u) − v*_i‖² + ½ (ω_i(u) − ω*_i)ᵀ I_i^w (ω_i(u) − ω*_i)`, `I_i^w = R_i I_i R_iᵀ`.
- Subject to: pelvis twist and hip / knee / ankle relative rates **fixed** to (1)'s twists; locked axes (elbow carry) zero. Joint kinematics through the RH1 hinges. Solved as one KKT system.
- **P and L are preserved by the metric, not forced** (forcing them with upper-body DOFs only worsens per-body velocities: edfa2b8f §3). Their residuals are gated by P-16c / P-17c.
- V2's own masses, COMs and inertias are authoritative for every V2 COM / P / L.

**(4) Presentation-only articulation (D4):** clavicle, neck, wrist, toe local rotation and static offsets are not physical. Render rule for the visible-continuity rows: rotation retarget, mapped bones take their V2 body's angular velocity, unmapped bones hold their τ₀ local rotation.

**Not part of MC-1 (still open, reported only):** the authoritative momentum correction (HG-A v2 / v_auth, R2 Q2), stride-clock ownership, vertical authority, gameplay geometry.

## 3. Corrected P-14 … P-17 (D3)

**Why:** `pcg_f0` `kinRows` attaches V2's `comLocal` to the **rig's** joint (bind gaps 49.8 / 57.7 / 60.2 / 11.6 mm for abdomen / thorax / head / forearm), uses 60 Hz frame differences of the presentation, and in P-17 applies the canonical-frame inertia after a bind-relative rotation (arm axes swapped). The old rows are still computed and reported for history next to the corrected ones.

| row | corrected quantity (V2 state from MC-1; reference = §2 material, analytic) | tolerance (unchanged) |
|---|---|---|
| **P-14c** | max over non-foot bodies of ‖v_i − v*_i‖ (V2 COM velocity vs the velocity of the carrier bone's material point at V2's COM) | 0.25 m/s |
| **P-15c** | max over non-foot bodies of ‖ω_i − ω*_i‖ | 2.0 rad/s |
| **P-16c** | ‖Σ m_i v_i − Σ m_i v*_i‖ / M (V2 masses) | 0.05 m/s |
| **P-17c** | ‖L − L*‖ about each field's own COM, inertia applied in the canonical body frame (`R_i I_i R_iᵀ`) | 10 % of max(‖L*‖, 1.0 kg·m²/s) |

Feet remain excluded from P-14c / P-15c as in REV1 (reported).

## 4. Thresholds (all unchanged)

- **Pose (PCG REV1):** P-1 10 mm, P-2 2°, P-3 3°, P-4 10 mm (hip / knee / ankle), P-6 2°, P-7 10°, P-8 15 mm, P-9 −5 … +2 mm (stance boot), P-10 ≥ −5 mm, P-11 10 mm, P-12 no hard-range excursion (1e-6°), P-13 ≥ −10 mm.
- **Velocity:** P-14c … P-17c as §3. **Visible:** PR-2 3 mm per frame = 0.18 m/s.
- **Lower body:** hip / knee / ankle ≤ 0.001 mm and ≤ 0.001 m/s (the measured value is ≤ 0.0002 mm / 0.0001 m/s).
- **Gates:** G0 – G3 and the qualification-v2 rows exactly as frozen (`knee_correction/QUALIFICATION_V2_PREREG.md`, G1-5′, K′, C1′, C7′; G1 1.3d 1.5°; perturbed rule ≤ 8.1 % and no scenario ≥ 5 / 15).

## 5. Expected handoff measurements (from the D12n study, edfa2b8f; the implementation must reproduce them)

| | FAST RUN 7.8 | ALL-OUT 9.5 |
|---|---|---|
| shoulder / elbow / wrist, max (mm) | 7.1 / 5.7 / 2.3 | 6.5 / 5.4 / 2.6 |
| per-body velocity (P-14c), max (m/s) | 0.083 | 0.093 |
| angular velocity (P-15c), max (rad/s) | 0.57 | 0.67 |
| \|ΔP\| max (N·s) / P-16c (m/s) | 0.43 / 0.006 | 0.47 / 0.006 |
| \|ΔL\| relative max (P-17c fraction of 10 %) | 0.038 | 0.049 |
| visible pop shoulder / elbow / wrist, max (m/s); instants > 0.18 | 0.15 / 0.05 / 0.06; 0 | 0.17 / 0.05 / 0.07; 0 |
| hard-range margin, min (°) | 1.73 | 1.03 |
| hip / knee / ankle | ≤ 0.0002 mm, ≤ 0.0001 m/s | same |

- **Reproduction rule:** every per-instant value of the RH1 + MC-1 implementation equals the D12n study's within 1e-6 (relative or absolute, whichever is larger) at all four speeds. A larger difference stops the run for investigation before any conclusion.
- **Known in advance (R2 / edfa2b8f):** the frozen RF-1 rule has no consistent solution in late toe pad (6 / 12 / 16 / 22 instants at 3.0 / 5.5 / 7.8 / 9.5 m/s), where the F0 boot cannot reach the turf (P-9); and the F0 boot's contact point is not stationary in forefoot landing, heel-up and toe pad (up to 0.7 / 0.6 / 2.3 m/s at ALL-OUT).

## 6. Validation suite (the complete V2 body suite, qualification-v2 configuration)

**Configuration:** `v2k` knee (central), ankle K 0.13, reference twist + lifecycle (`{"ikRefTwist":true,"lifecycle":true}`), validated G3 stand controller, 240 Hz, 150 / 2 iterations, plane turf.

**Bodies:** RH1 (subject) and the current runner `PI1-runner-vinicius` (**control R0**) in every body-dependent item, plus the 8 qualified bodies as a regression. Run from a scratch copy of the committed tree whose `VARIATION_SET` additionally lists R0 and RH1 (scratch only; the repository's set is unchanged). Runners and evaluators are the frozen ones; where a frozen runner hard-codes V2-REF / V1-matched, a copy with RH1 / R0 substituted for those ids runs the identical job set.

| item | what runs | gate for RH1 |
|---|---|---|
| Q0 | the 20 spec hashes (§1.4); RH1 invariants (§1.3); component regressions; `guard_v1` | all hold |
| G0 | `g0Body` on RH1 and R0 | every row passes, except rows R0 fails for the recorded record-morphology reasons (0.6a, 0.6b, 0.10a, 0.4c, 0.6e) when RH1 fails them identically |
| G1 | full suite with RH1 / R0 in the main-body roles (all scenarios, determinism, snapshot, timestep ensembles, high-speed envelope; G1-5′); perturbed ensembles `perturb240` × 15 on RH1 and R0 | every gating row passes, except the recorded R0 exception isoSelfCol 1.4d (user-permitted, scoped) if identical in cause; ensemble ≤ 8.1 % and no scenario ≥ 5 / 15 |
| G2 | full G2 with RH1 / R0 as bodies (2.1, 2.2a, 2.2b, 2.3, 2.4, E, F(ii)) and RH1 in V2-REF's rows (S4, S5, F(i), D) | every gating row passes |
| G3 | G3 v3.3 (K′) with RH1 / R0 as bodies (T9, T9U) and RH1 in V2-REF's rows; J2a mirror on RH1 | every gating row passes |
| KV6c | adopted-configuration pelvis drop, RH1 and R0 (+ 180 / 480 Hz on RH1) | no fall; slip ≤ 0.5 mm; \|θ − θ0\| ≤ 2.0° |
| twist battery | 12 scenarios × reference / current on RH1 and R0 | reference meets C1′, C1q, C2–C6, C7′ |
| boundary harness, PY4, yaw decomposition | RH1 at 180 / 240 / 480 Hz; yaw A / B | as qualification Q6c / Q6d / Q7 |
| not re-run (body-independent, declared) | Q1 knee rig mechanics; browser = Node (Q5b / c) | — |

**Regression rule:** the 8 qualified bodies' results must reproduce the official qualification outputs (`knee_correction/evidence/qual/`); a difference stops the run.

**Instantiation without collision stepping (all four regimes, every valid instant):** build a Jolt world with RH1 (plane turf, the accepted world settings), write MC-1's state (poses near the origin after subtracting the rounded root position, as ITS-1), take **no step**, read back. Gates:
- read-back = written (G0 read tolerances: 1e-6 m, 1e-6 rad; velocities 1e-5 m/s);
- joint anchors coincide (≤ 1 mm, G2 2.1g) and anchor velocities agree in the constructed state (≤ 1e-9 m/s);
- no hard-range excursion (P-12); no NaN;
- stance boot −5 … +2 mm and every other body ≥ −5 mm above the turf (P-9 / P-10); self-separation ≥ −10 mm (P-13);
- **stance contact consistency (derived from PR-2, not a new tolerance):** the F0 boot's contact-point velocity in the transferred state ≤ 0.18 m/s. Planting a faster-moving contact point would itself be a velocity change above the visible-pop bound.

A **valid instant** is one where the frozen lower-body mapping is defined and continuous across ±δ (RF-1 consistent). Invalid instants are counted and reported.

**Reported items** (the user's 12): integrity and self-collision; all joint-limit margins; actuator / capacity (G2 2.1c peak fraction, 2.3, KV6c, static moments of §1.3); quiet standing (G2 2.1, KV6c); mass / COM / inertia preservation (§1.3); pose-fit errors; per-body velocity; total P; L; visible discontinuity; lower body; CPU (MC-1 one-shot cost, isolated physics / controller step cost RH1 vs R0).

## 7. Stop criteria and verdict

**Stop and report before concluding if:** an existing spec hash changes; a regression result differs; the MC-1 lower body differs from `pcg_rev1` by any bit; the reproduction rule (§5) fails.

**Verdict:**
- **C — RH1 BODY INVALID** if any RH1 gating row in §6 fails, other than the recorded R0 exceptions failing identically. A failure that R0 shares (newly found, inherited from the record morphology) still counts; it is reported as inherited.
- Otherwise the body is valid, and:
  - **A — HANDOFF STATE READY** if, at every valid instant of all four regimes, the pose rows, P-14c … P-17c, PR-2, the lower-body rows and every instantiation gate (including stance contact consistency) pass;
  - **B — HANDOFF STATE NOT READY** otherwise, naming the smallest failing element and its owner.
- **Stated in advance:** from the R2 / edfa2b8f measurements the stance contact-consistency gate is expected to fail in heel-up / toe-pad stance (the rigid F0 boot, R2 Q3), which would give B. It is not waived and its limit is not changed.
