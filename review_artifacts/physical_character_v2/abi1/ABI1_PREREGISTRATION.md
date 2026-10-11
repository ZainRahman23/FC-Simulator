# ABI-1 preregistration: active balance investigation (A / B / C on the PVP-1A collision)

**Status: FROZEN at the commit that adds this file, before any B or C code exists.**
- Source: `sources/2026-10-11_user_instruction_active_balance_investigation.md` (`64ce7d0f`).
- Design: `ABI1_RESEARCH_AND_DESIGN.md`. Literature: `research/BALANCE_LITERATURE.md`.
- Every number here is fixed before B or C is implemented or run.

**Change rules after the freeze:**
- An implementation defect found before the pre-run freeze is disclosed in `ABI1_AMENDMENTS.md` with its reason. It may not change a parameter, threshold or criterion.
- After the pre-run freeze, nothing changes. Failures are diagnosed, and any variant is labelled post hoc.

**This is a diagnostic. It is not PVP-1A and not PVP-1B.**
- RUN-1, the simulation, V2 anatomy, contact geometry, friction, the solver, the PVP-1A plant / fixture / records and the slide tackle are untouched.
- Nothing is written back to gameplay.

## 1. Question and hypotheses

**Q.** Does a generic, outcome-blind, physiologically delayed, capacity-limited active balance controller change how the runner responds to the *same* native PVP-1A collision, from a mannequin receiving force toward a footballer resisting it?

**H1.** B differs from A materially at the gameplay camera inside W1 (§8, E1).
**H2.** B improves the runner's physical balance state in W1 relative to A: the XcoM margin, pelvis drop and trunk deviation (§8, E3). Reported either way.
**H3.** C triggers a reactive step from the support geometry alone. Its trigger time, touchdown and resulting support are reported; the touchdown is expected in EXT, not W1.

**Predictions** are the design's §8, frozen with this file.

## 2. Bound inputs (read-only; git blob / SHA-256 prefix)

| input | git blob | sha256 |
|---|---|---|
| plant `pvp1/scripts/pvp1a_sim.mjs` (class PvpPlant, imported) | d1a49666ac74 | a4d933b329e443f3 |
| `pvp1/scripts/pvp1a_lib.mjs` | f0df0c6cc547 | 1cda6741f68582e2 |
| **primary fixture** `pvp1/evidence/diag_cf1/PVP1A_DX_CF1_FIXTURE.json` | 33486a48b3a0 | ca0c9429b1d485b9 |
| replication fixture `pvp1/fixture/PVP1A_FIXTURE.json` (DX) | 629f54606f3b | 93c62cb434a0d41c |
| A reference record `pvp1/evidence/diag_cf1/N2.json.gz` (final hash 20c6161b170403f8) | 644205de8968 | ee5ed34cc26a6c03 |
| `sandbox/visual/physchar2/ctrl/v2_stand.js` (balance law, IK, regions) | d2de3d73f7e4 | 735969c9f8a26b7a |
| `ctrl/v2_support.js` (LIFECYCLE constants) | ef3084bfbb8d | 43a10a63ca78c8c6 |
| `sim/v2_actuation.js` (ActuatorLayer) | ebd5f5d317a0 | dc63b383ebc53adf |
| `spec/v2_actuators.js` (capacities, activation 15 / 50 ms) | 077659b0843d | 99e865e95e501cc8 |
| `pi1/rev2/scripts/pi1_rev2_sim.mjs` (PostureDriver, BLEND 0.03 s) | 16404332cf3b | 3d9834627869d88f |

**Already established, before this freeze, with no controller:**
- Condition A run through the ABI-1 harness (`abi1_plant.mjs` + `abi1_run.mjs`) reproduces the committed CF1 N2 bit for bit (260 / 260 state hashes, `20c6161b170403f8`) and DX N2 (`e5751b0cbdd7c2b9`).
- A with the EXT contact set is bit-identical to A with the frozen set through step 60; the first difference is at step 61.

## 3. Conditions and runs

| id | runner controller | modes | contact sets |
|---|---|---|---|
| **A** PASSIVE / CURRENT | IFM-1 SnapshotTone, unchanged (the frozen PVP-1A runner) | N2, C0 | ALL, LEGS (EXT, N2 only) |
| **B** ACTIVE BALANCE, NO STEP | SnapshotTone + **GBC-1** (§4), no step | N2, C0 | ALL, LEGS |
| **C** ACTIVE BALANCE + REACTIVE STEP | SnapshotTone + GBC-1 + **step law** (§5) | N2, C0 | ALL, LEGS |

**Identical in every run:**
- the fixture's written entry state for both players (checked by the entry state hash);
- the tackler (V1-matched, tone flags (0, 0), 4.625 m/s slide);
- the world: G1_WORLD, 240 Hz, 150 / 2 iterations;
- friction and the contact configuration;
- 260 steps.

**Contact sets:**
- **ALL** is the frozen PVP-1A contact set.
- **LEGS** (EXT) rejects every cross-character pair other than runner {thigh, shank, foot}_{L,R} ↔ tackler {thigh, shank, foot}_{L,R}, from t = 0, through the frozen plant's own validate-callback mechanism.

**Repeats:** B-N2-ALL and C-N2-ALL, in fresh processes.

## 4. GBC-1, the generic balance controller (B and C)

### 4.1 Authority and limits

- **Acts only on** the runner's motorised joint axes, as an additive feed-forward increment Δτ to the SnapshotTone row's τ0. C's stepping leg is the exception (§5).
- **Every row goes through the unchanged ActuatorLayer:** instantaneous capacity, activation τ_act 15 ms / τ_deact 50 ms, saturation. The ActuatorLayer's capacity bound is exact, so torque above capacity is impossible. Saturation is recorded as evidence.
- **Never writes** a body pose or velocity, applies an external force or impulse, changes a gain, changes a contact or reads the tackler.
- **No outcome-specific gain** exists. One parameter set (§4.4) serves every condition, impact level and mode.

### 4.2 Sensing: outcome-blind input

**The frame Y(n)** is built after each recorded step n from the record, and contains only:
- the runner's 14 body states S(n): pos, rot, com, v, w;
- the turf normal force on foot_L and foot_R: F_f(n) = Σ λ over that foot's turf manifolds ÷ h.

**Never available to the controller:**
- the simulation record, outcome labels or events;
- the fixture, the authoritative contact, the tackler's state, or any cross-contact datum.

**Delay:**
- The command issued after step n uses Y(n − d), and it acts during step n + 1.
- **d = 29 steps (120.8 ms)**: sensor-to-torque d + 1 steps plus the activation dynamics.
- **History before activation:** Y(n ≤ 0) := Y0 = {S(entry), F = [M·g/2, M·g/2]}, the standing entry state. The +0.5 mm entry grounding gap is an instantiation artefact.

**Support state per foot** (V2 `LIFECYCLE`, unchanged):
- The machine is advanced once per delayed frame; the initial state is SUPPORT.
- SUPPORT → OFF when F_f < 0.01·M·g for 3 consecutive delayed frames.
- OFF → SUPPORT when F_f > 0.03·M·g for 3 consecutive delayed frames.

### 4.3 Law

Every quantity below is computed on Y = Y(n − d), in the delayed configuration.

1. c, v = whole-body COM and velocity (V2 masses); ω0 = √(g / c_y); ξ = (c_x + v_x/ω0, c_z + v_z/ω0).
2. **BoS** = the convex hull of the SUPPORT feet's usable sole regions (`StandController.footPoly`, 5 mm inset). ξ0 = ξ(Y0).
   - ξ_ref = clampPoly(BoS, ξ0).
   - p*_raw = ξ + kξ (ξ − ξ_ref).
   - p* = clampPoly(BoS, p*_raw); r = p*_raw − p*.
3. **Load split and foot CoPs:** V2-G2's algorithm (`v2_stand.js`), verbatim.
   - The lever rule runs along the line between the SUPPORT feet's region centroids, with floor minShare = 0.10 in double support.
   - Per-foot CoP = centroid + a common shift, each clamped to its region, with 6 remainder iterations.
   - p* and r are recomputed from the achieved CoP. A = ω0² (c_x − p*_x, 0, c_z − p*_z).
   - A foot that is not SUPPORT has share 0.
   - Newly SUPPORT feet: the share cap ramps linearly 0 → 1 over LIFECYCLE.accept = 0.10 s from the delayed transition; the excess goes to the other foot.
4. **Foot forces** F_f = share_f · M · (A_x, g, A_z) at cop_f (y = 0). Effective gravity g_eff = (−A_x, −g, −A_z).
5. **Inverse statics** (V2-G2 / PostureDriver form), per joint k with joint centre p_k:
   - T_k = −Σ_{i∈sub(k)} (c_i − p_k) × m_i·g_eff − Σ_{f∈subFeet(k)} (cop_f − p_k) × F_f.
6. **Hip / trunk strategy** (V2-G2 law):
   - L̇ = M·g·(ŷ × r)·hipUse·max(0, 1 − θ_pel / hipMaxDeg).
   - θ_pel is the pelvis tilt deviation from its entry orientation: 2·asin‖(q_e,x, q_e,z)‖, with q_e = q_pel,0⁻¹·q_pel.
   - Hip share_s = max(0, share_s − 0.25), normalised. T_hip,s −= L̇·share_s.
7. **Arm strategy** (V2-G2 law):
   - L_arm = 0.5·M·g·(ŷ × r)·armUse.
   - Per shoulder: T_sh += L_arm·max(0, 1 − θ_arm / armMaxDeg), where θ_arm is the angle of the shoulder's relative rotation from its entry value.
8. **Axis torques:** τ_k,i = T_k · axW_k,i, with axW from the delayed configuration (R_child·F2).
   - Joints with one locked swing axis (knees, elbows) use `lockedAxisFF` on the free swing row, exactly as the PostureDriver does (`ffLockedAxis` true in SLP_STAND).
9. **Output:**
   - Δτ_k,i(n) = τ_k,i(Y(n − d)) − τ_k,i(Y0), where τ(Y0) is the same law at the entry frame. So Δτ ≡ 0 while the delayed frame is Y0.
   - **No support:** if no foot is SUPPORT, steps 2–4 are skipped. Then F_f = 0, g_eff = (0, −g, 0), and there are no strategy terms.

### 4.4 Parameters (frozen)

| parameter | value | source |
|---|---|---|
| d (balance delay) | 29 steps = 120.8 ms | ≈ 100 ms to neural command + ≈ 20 ms electromechanical delay not represented by V2's 15 ms activation → first torque ≈ 125 ms, 63 % ≈ 140 ms; literature central torque onsets: swept leg 125, planted 140, arms 130, hip / trunk 140 ms (research/BALANCE_LITERATURE.md §12); G2-A9: 100–150 ms stable in quiet stance |
| kξ | 1/3 | V2-G2 adopted (Peterka 2002, ≈ 1.3 mgh closed-loop) |
| minShare, footInset | 0.10, 5 mm | V2-G2 (TD-8 constants) |
| hipUse, hipMaxDeg, HIP_LOAD | 1.0, 10°, 0.25 | V2-G2 (G2-A8 bounded flywheel) |
| armUse, armMaxDeg | 1.0, 60° | V2-G2 (G2-A8) |
| loadOff, loadOn, debounce, accept | 1 % BW, 3 % BW, 3 steps (12.5 ms), 0.10 s | V2 LIFECYCLE |

## 5. C: the step law (added to GBC-1; same delay, same frames)

**State:** IDLE → SWING(leg s) → HOLD(leg s) → IDLE.

### 5.1 Trigger

At command time n, in IDLE:
- dOut(Y) > 0, i.e. ξ is outside the BoS of the delayed frame;
- and a stepping leg exists.

**Leg choice:**
- If exactly one foot is OFF, that leg steps.
- If both feet are SUPPORT, the foot whose region centroid has the larger projection on the exit direction û = (ξ − clampPoly(BoS, ξ)) / ‖·‖ steps. From the trigger its share is 0: the balance law treats it as non-support, so the load moves to the stance foot.
- If both feet are OFF, there is no trigger.

### 5.2 Foothold, re-aimed every step from Y(n − d)

- g = ξ_TD + b·û, with ξ_TD = p* + (ξ − p*)·e^{ω0·T_rem} and T_rem = max(0, T_sw − (t − t_trig)).
- While ξ is inside the BoS, û = (ξ − p*) / ‖ξ − p*‖.
- g is the target for the stepping foot's usable-region centroid. It is converted to the foot-origin target at the reference orientation.
- **No crossover:** (g − c_stance)·ℓ_s ≥ 0.15 m, where ℓ_s is the entry pelvis's lateral axis toward the stepping side; g is moved outward if needed.
- **Reach:** the bounded leg IK returns the closest valid pose. The target is never moved for reachability.

### 5.3 Swing reference

The swing starts from the stepping foot's *current* pose at the trigger: the motor program starts from the limb's present state, with the plan from delayed data.
- τ = (t − t_trig) / T_sw clamped to [0, 1]; s(τ) = 10τ³ − 15τ⁴ + 6τ⁵.
- Horizontal: x_xz = p0_xz + (g_xz − p0_xz)·s(τ).
- Vertical (foot origin): y = y_rest + (p0_y − y_rest)(1 − s(τ)) + h_c·sin²(πτ).
- y_rest = the foot's entry origin height − 0.5 mm (sole on the turf).
- Orientation: the foot's entry orientation, yawed to its yaw at the trigger (level foot).
- After τ = 1 the final reference is held.

### 5.4 Stepping-leg servo, SWING phase

- The hip / knee / ankle rows of the stepping leg are **replaced** by V2's own servo form:
  - targets from `legIKBounded(S_now, ev_now, s, pelvis_now, swing reference)`;
  - gains K, D blended stance → swing from the trigger at the PostureDriver rate h / BLEND (BLEND = 0.03 s): K = w·K_stance + (1 − w)·K_swing (V2 gain tables `gain`, `gainSwing`: 4 Hz, ζ 0.8);
  - τ0 = T_k^grav + K·e, with e = 2·vec(q⁻¹ q_T) and no velocity feed-forward.
- T^grav is the current-configuration statics of the leg's distal subtree under g alone, with no foot force.
- These rows receive no balance-law Δτ, because the stepping leg's share is 0.

### 5.5 Touchdown and HOLD

- **Touchdown:** when the stepping foot becomes SUPPORT in the delayed support machine (§4.2), at any time after the trigger:
  - q_hold = the current joint rotations of that leg;
  - rows: targets q_hold, gains blended back to stance over BLEND, τ0 = τ_GBC,k(Y(n − d)) + K·e_hold;
  - τ_GBC is the full law torque. These rows no longer carry the tone's entry bias.
- **The foot rejoins the law** with the 0.10 s acceptance ramp.
- **HOLD → IDLE** when the blend completes. Further steps follow the same rule.

### 5.6 Step parameters (frozen)

| parameter | value | source |
|---|---|---|
| T_sw | 0.17 s | compensatory swing 168 ± 27 ms (Saumur 2021, preprint; research §8); re-contact ≈ 400–500 ms |
| b | 0.05 m | [ENG] — capture point + margin (Hof 2008; Coros 2010) is the principle; no verified numeric margin |
| h_c | 0.04 m | [ENG] — no source; a low clearance (lowering-type placement, Eng 1994) |
| crossover margin | 0.15 m | ≈ one foot width + clearance [ENG] |

## 6. Measurements (each run, each step)

The frozen PVP-1A record is kept: states of all 28 bodies, every contact manifold (pair, point, normal, λ, J), per-character and system ledgers, feet loads, integrity, joint angles and the state hash. Added to it:
- **the runner's actuator readback per axis:** τ, instantaneous capacity, fraction, saturation flag, request;
- **controller information:** Δτ per axis, ξ, BoS, p*, r, support states, shares, strategy terms, step state, foothold, swing reference.

**Derived offline** by `abi1_metrics` / `abi1_eval`, identically for every condition:
- contact timing and location;
- per-step cross impulses, and the tackler's Δv;
- runner per-body velocities, COM and velocity, dOut;
- L about the COM;
- pelvis and thorax orientation;
- hip / knee / ankle torques and saturation;
- per-foot ground reaction forces, support loading and slip;
- the free-foot trajectory;
- actuator work (Wact) and its difference from A;
- the first active response (§7, V3);
- C's step events, foothold, touchdown and support polygon;
- ledgers and integrity;
- CPU.

## 7. Windows and validity

### 7.1 Windows

- **W1, primary: steps 1–60 (0–250.0 ms).** A condition's W1 ends earlier at either:
  - (a) the first cross contact outside the authoritative set: runner {shank_R, foot_R} ↔ tackler {foot_L, shank_L}, with |J| ≥ 1e-3 N·s;
  - (b) the first runner integrity failure.
- **EXT, diagnostic: the LEGS runs.** The window ends at the first cross contact outside the authoritative set, or at a runner integrity failure.
  - EXT is never primary evidence. For reference, A-EXT's window ends at step 150.

### 7.2 Validity (each gating; a failure is diagnosed, not tuned)

| id | criterion |
|---|---|
| V1 | entry readback passes; the entry state hash is identical across A / B / C |
| V2 | causal identity: B and C state hashes equal A's through step 30 (the first command that reads frame 1 is issued after step 30 and acts in step 31) |
| V3 | first contact-caused active response: the first step at which B-N2's (C-N2's) Δτ differs from B-C0's (C-C0's) is ≥ first contact step + d |
| V4 | runner integrity in W1: anchors ≤ 1 mm; self- and turf penetration ≤ 10 mm; finite; ≤ 25 m/s; linear and angular ledger residuals ≤ 0.01 per step |
| V5 | no actuator torque above instantaneous capacity (`overCap` = 0) |
| V6 | determinism: fresh-process repeats have identical final hashes |
| V7 | outcome blindness: (a) the controller module imports only V2 math / controller helpers (code audit); (b) `sense()` builds Y from a whitelist (runner states, foot turf impulses), and a check asserts that the frame keys are exactly the whitelist |
| V8 | neutrality: `ib_verify` 59 / 1 / 0 before and after; gameplay hash a2678624 |

Tackler integrity per step is reported as a trust marker. It does not gate.

## 8. Effect measures (reported for B−A, C−A and C−B)

**E1: visibility**
- Landmarks: the 14 runner body COMs and 13 joint centres.
- **Gameplay camera:** CAMERA_V1 zoom 1, 1280 × 720 (IFM-1's independent `camProj`, rail x = PVP-1A capture camera), at every 4th step (60 Hz).
  - **MATERIAL_AT_GAMEPLAY_CAMERA** if any landmark differs by ≥ 2 px on ≥ 4 consecutive 60 Hz frames inside W1.
- **VISIBLE_CLOSE** if any landmark differs by ≥ 30 mm, or any segment orientation by ≥ 5°, on ≥ 4 consecutive 60 Hz frames.
- Otherwise **SUBTLE / NONE**.

**E2: load transfer**
- Stance-foot and swept-foot loads over time; the time to the full stance-leg load.

**E3: balance state**
- dOut(t), COM height drop, horizontal COM speed;
- pelvis and thorax tilt from entry;
- ‖L‖ at the end of W1, and peaks.

**E4: whole-body response**
- The maximum joint-angle difference from A per group: ankles, knees, hips, trunk, shoulders, elbows.

**E5: controller**
- Peak Δτ per group, saturated axis-steps, actuator work against A, and the first-response step.

**Physical response type per run** (descriptive; never mapped to gameplay labels):

| type | condition |
|---|---|
| NO_ACTIVE_RESPONSE | A always |
| ABSORBED | ξ never leaves the BoS and no foot leaves support |
| SUPPORT_LOST_PASSIVE_RELOAD | a foot leaves support and reloads with no commanded step |
| BALANCE_CORRECTION | ξ leaves the BoS and returns inside it with no step |
| RECOVERY_STEP | a commanded step reaches touchdown and ξ is inside the new BoS by the window end |
| LOSS_OF_BALANCE | any runner non-foot turf contact, or pelvis COM drop > 0.25 m, or thorax tilt > 45° |

The window, W1 or EXT, is stated with every type.

## 9. Secondary diagnostics (preregistered, labelled)

| id | content |
|---|---|
| S-DELAY | B and C with d = 24 (100.0 ms: neural command with no EMD allowance, ≈ the athlete-fast bound) and d = 36 (150.0 ms: slow end); ALL and LEGS |
| S-TONE | A_T, B_T, C_T: A / B / C with the runner's SnapshotTone stiffness K × 0.561 (summed sagittal ankle 1.39 → 0.78 mgh = the mean of the measured intrinsic 0.64 and 0.91 mgh) and damping D × 0.749 (= √0.561, the damping ratio kept), applied to every runner tone row [ENG for non-ankle joints: no intrinsic data]; the entry actuator plan is recomputed from the scaled tone; N2 / C0, ALL and LEGS. Tests whether the non-yielding tone, not the absence of control, makes the response read as a pillar. A_T is expected not to stand |
| S-ABL | B0 (GBC-1 without hip and arm terms = the V2-G2 adopted law) and B1 (B0 + hip); ALL and LEGS. Answers "the minimum that materially improves" |
| S-DX | A / B / C on the DX fixture (tackler untrusted from step 1), N2, ALL and LEGS |
| S-IMPACT | **run only after A / B / C are evaluated and committed:** A / B / C at tackler entry velocity × {0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0}, ALL and LEGS. Levels predetermined here. No level is adopted, and no level is chosen for its look |
| S-CPU | 10 timed runs each of A / B / C N2 ALL; per-step controller cost (cpu.ctl + cpu.sense), physics, totals |

## 10. Visual review protocol

- **Views, A | B | C side by side**, synchronised to the same step and from the same entry instant:
  1. **gameplay camera** CAMERA_V1, zoom 1, normal speed (60 Hz);
  2. **close**: the viewer's zoom 6 (6× crop, same projection), every recorded step, at 0.25× and 0.1×;
  3. **diagnostic**: the close view plus skeleton, contact point / normal / impulse, COM, XcoM, BoS polygon, foot loads, step target (C);
  4. **EXT close** (labelled "EXT — restricted contact set, diagnostic").
- **Clean views** have condition labels only. Diagnostic overlays are drawn from recorded data only.
- **The page** has frame stepping, a locked scrub, and markers: first contact, first active response, support loss, step trigger / touchdown, W1 end.
- **Secondary views** (labelled): S-TONE B_T | C_T close view, if the runs complete.
- From step 61 the primary views are banded "NON-AUTHORITATIVE CONTACT — no inference".
- **Nothing is interpolated, amplified, re-framed or animated.** The frozen RUN-1 viewer and character renderer are used, as in PVP-1A-DX.
- **VISUAL_PENDING:** the owner judges believability.

## 11. Stops and failure handling

- **A V1–V8 failure:**
  - harness defect (V1 / V2 / V6 / V7): stop, diagnose, record in `ABI1_AMENDMENTS.md`, fix and re-run everything;
  - physical failure (V4 / V5): report as a result.
- **If B or C fails** (unstable in C0, falls where A does not, no difference): diagnose. Post-hoc variants may be run, labelled as such and never replacing the frozen result.
- **No parameter in §4.4 / §5.6 changes after the freeze.**
- **Stop rule:** when further runs stop producing information, stop.

## 12. What the result can and cannot show

**Can show:**
- whether this generic, delayed, limited controller changes the native response to this collision, how, when, and within whose window;
- whether that controller can fail;
- whether V2's actuators saturate under it;
- how the response scales with impact (S-IMPACT).

**Cannot show:**
- general tackling, falls or recovery;
- moving runners;
- production readiness;
- that the simulation's STUMBLE is physically reproduced. The controller never sees the label, and agreement is not a criterion.
