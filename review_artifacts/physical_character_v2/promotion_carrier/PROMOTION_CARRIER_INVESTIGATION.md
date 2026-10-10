# Promotion locomotion carrier: read-only architecture investigation (NOT IMPLEMENTED; awaiting approval)

**Date:** 10 Oct 2026.

**Source:** `../sources/2026-10-10_user_instruction_promotion_locomotion_carrier_investigation.md` (d91080d, verbatim).

**Status.** Architecture and slice proposal only. Nothing was implemented.

**Unchanged:**
- LC-1 (branch `prototype/locomotion-continuity-v1`, 9d57d46), its evidence, its three recorded defects, and its replay;
- V1.3, V2, Jolt settings, collision geometry, PI-1 / REV2 criteria, and gameplay outcomes.

**Analysis run (read-only):**
- Three small scripts read existing records and outputs. They are in `scripts/`; their outputs are in `evidence/`.
- They wrote no simulation, presentation or physics state. No physics was stepped.
- The records they read are LC-1's official exports, copied unchanged into `evidence/records/` (SHA-256 listed there) so the numbers can be reproduced.

---

## 0. Answer in short

1. **The promoted runner does not lose coherence because translation is missing.**
   - In the REV2 plant at 3 m/s (30 LC-1 promotions), the first incoherent tick shows the body still on the authoritative track:
     - root error ≤ 9.5 mm;
     - COM error ≤ 16.9 mm;
     - COM velocity error ≤ 0.25 m/s;
     - tilt ≤ 3.3°.
   - What fails is the legs: legs vs the simulation's legs 107 – 207 mm (CG-4 limit 0.10 m), and planted-foot slip up to 39 mm (NM-2 limit 10 mm).
   - The handoff already writes the authoritative momentum (HG-A v2). The runner's acceleration is **exactly zero** in the pre-contact window of all three PI-1 records.

2. **A perfect translation carrier would make it worse.**
   - Holding the promoted leg configuration and moving the body exactly along the authoritative root gives:
     - NM-2 fails at t = 1 in **33 / 33** promotions;
     - CG-4 fails at t = 1 – 3.
   - Reason: a planted foot carried with the body must slide 50 mm per tick at 3 m/s. If friction holds the foot instead, the body pitches over it. That is what the REV2 runs show: B's torque axis averaged 0.95 – 1.0 of its cap.
   - **No whole-body carrier (options 1 – 3) can by itself make the promoted runner locomote coherently.**

3. **The missing locomotion is in the configuration.** The legs must keep following the **simulation's own runner legs**, the CHARCOLLIDE law that CG-4 measures against.
   - The presentation cannot be that reference. Within every 3 m/s window, the LC-1 presented legs reach 108 – 276 mm from the gameplay legs (33 / 33).

4. **Any carrier term that reads the physical state is a second recovery authority.**
   - It removes collision momentum at the rate of its cap: 27.5 N·s per 0.1 s at B's 275 N, against the 20 – 32 N·s physical contact exchanges measured in REV2.
   - It also moves the stumble / fall boundary away from B's caps, which were derived from V2's own recovery capacity.
   - Options 2 and 3 are of this kind.

5. **The SLP-2 A field is reusable almost verbatim, but it is not the fix.**
   - It is the correct translation term: exact M·Δv, zero torque, reads no state, 3 – 7 µs per step.
   - Two adaptations: a 2-D horizontal a_T, and gating to the simulation's ordinary-locomotion state.
   - In the three PI-1 cases it applies **zero** before contact.
   - At the contact tick the simulation's own contact response appears in a_T (14.9 and 65.9 m/s²). A must never apply that, because it would be the simulation's ΔV applied a second time.

6. **Recommended carrier: authoritative-trajectory feed-forward.** Everything it applies is a function of the **simulation's** state only, never of the physical state:
   - **translation:** A, gated to ordinary locomotion (zero in the slice);
   - **configuration:** the posture-tone targets advance along the simulation's own leg law at its own stride clock. Their rate and their inverse-dynamics torque for unsupported limbs are added as feed-forward, all evaluated on the target trajectory;
   - **feedback:** stays where it already is. That is the finite posture tone (V2's capacity-limited actuators) and B, with B's caps, gains and release unchanged and its target moved to the same reference pelvis.

   **History.** This is the "finite-authority tracking of the simulation's own runner-body configuration" left for decision in the moving-handoff report (§8). It is also PI-1 §6.4's original moving targets, but sourced from the simulation instead of the presentation.

7. **Main risk.** During the promotion window it re-creates a short, physically realised gait: real stance contacts under an authoritative motion. That is the SLP-2 failure mode.
   - SLP-2's own data say that mismatch **accumulates over steps**. The first 1 – 4 stances stayed near-neutral, with B ≤ 14 N·s per step.
   - The promotion window at 3 m/s is about 10 – 12 ticks: less than one stance plus one touchdown.
   - The proposed slice tests exactly this. It stops instead of adding gait or contact control.

---

## 1. What was read and run

**Read:**
- `PHYSICAL_CHARACTER_ARCHITECTURE_PIVOT.md`; `slp2/SLP2_ARCHITECTURE_DRAFT.md`, `SLP2_RESULTS.md`, `SLP2C_RESULTS.md`;
- `pi1/PI1_DESIGN.md` §3 – §11; `pi1/rev2/PI1_REV2_PREREG.md` §1, §6, §7;
- `pi1/moving_handoff/MOVING_HANDOFF_INVESTIGATION.md` §5 – §8;
- `locomotion_continuity/LC1_RESULTS.md` and its evidence;
- code:
  - `pi1/rev2/scripts/pi1_rev2_sim.mjs` (PostureDriver, PI1Sim, B targets);
  - `sandbox/visual/physchar2/gates/v2_slp.js:53-54` (the A field);
  - `ctrl/v2_supported.js` (SupportLayer);
  - `ctrl/v2_stand.js:213-241` (posture and swing gains);
  - `ctrl/v2_support.js:43` (swing servo 4 Hz, ζ 0.8);
  - V1.3 `sandbox/visual/pt_react.js:70-104` (`ptRxBodyChar`, the simulation's runner legs).

**Run (read-only; `scripts/`, outputs in `evidence/`):**

| script | what it computes | output |
|---|---|---|
| `at_failure_translation.cjs` | In the LC-1 drift runs at 3 m/s (REV2 plant, no tackle): translation errors vs leg and slip errors at the first tick that fails the frozen coherence set | `at_failure_translation_v3.{json,txt}` |
| `cf_frozen_perfect_root.mjs` | Counterfactual: the promoted V2 pose translated **exactly** along the authoritative root with the legs held. Reports CG-4 against the simulation's segments, the planted-foot slide, and the presentation's own legs vs the simulation's legs | `cf_frozen_perfect_root*.{json,txt}` |
| `auth_accel.mjs` | The authoritative acceleration and facing rate over the PI-1 windows (60 Hz backward difference of the recorded root) | `auth_accel.txt` |

---

## 2. Diagnosis

### 2.1 The REV2 plant while promoted

| channel | what it does |
|---|---|
| posture tone (PostureDriver) | the SLP per-axis {K, D, τ0} law; **targets held at the promoted pose**; stance / swing gains from physical foot contact; gravity statics |
| B (SupportLayer) | turf ↔ pelvis SixDOF spring, 2 Hz, ζ = 1; caps 274.95 N horizontal, +1161.2 / −193.5 N vertical, 81.80 N·m; targets the authoritative root at the **promotion pelvis height**, upright, yaw = facing; released at the authoritative FALL |
| translation | the handoff writes M·v_auth once (HG-A v2); after that, nothing |

### 2.2 Where it fails (3 m/s, 30 promotions at LC-1 valid frames; `at_failure_translation_v3.txt`)

| at the first failing tick | value |
|---|---|
| root error / COM horizontal error | ≤ 9.5 mm / ≤ 16.9 mm |
| COM velocity error (forward, lateral) | ≤ 0.245 m/s |
| pelvis tilt | ≤ 3.3° |
| **legs vs the simulation's legs (CG-4, 0.10 m)** | **107 – 207 mm** |
| **planted-foot slip (NM-2, 10 mm)** | 1 – **39 mm** |
| first failure | CG-4 vs simulation 25, NM-2 slip 12 (some runs both) |
| B mean load / cap over the run: horizontal, vertical, torque | 0.37 – 0.74, 0.45 – 0.70, **0.95 – 1.00**; saturated on 61 – 100 % of steps |

The body is where the simulation says. Its **legs** are not, and B saturates trying to hold up and pitch-correct a body whose legs do nothing.

### 2.3 Counterfactual: a perfect translation carrier with the current legs (`cf_frozen_perfect_root.txt`)

Every promotion had a planted foot at k_p.

| set | promotions | NM-2 slide > 10 mm first at | CG-4 vs simulation > 0.10 m first at | presentation's own legs vs simulation, max in window |
|---|---|---|---|---|
| 3 m/s speed fixture (LC-1 valid frames) | 30 | **t = 1 in 30 / 30** | t = 1 (13), 2 (11), 3 (6) | 108 – 276 mm |
| rx_miss k47 / rx_free_leg k39 / rx_planted_leg k38 | 3 | **t = 1 in 3 / 3** | t = 3 / 1 / 3 | 235 / 128 / 196 mm |

**Reading:**
- **Exact translation does not help.** A planted foot moved with the body slides one tick's travel (50 mm). If friction keeps it, the body vaults and pitches over it instead (§2.2: B torque at cap).
- **Held legs leave the gameplay legs within 1 – 3 ticks**, regardless of translation.
- **The presented legs leave them too**: they exceed 0.10 m within 1 – 6 ticks in every window (33 / 33). The only configuration that satisfies CG-4 by construction is the simulation's own leg law: `ptRxBodyChar`, `ofLocoCycle` at the recorded stride clock `rows[k][13]`.

### 2.4 Conclusion

The carrier the question asks for has **two** jobs, not one:
- carry translation;
- carry the leg configuration along the simulation's leg law.

Translation is the easy part. It is already exact at constant speed, and A covers acceleration. **The configuration is the binding part.**

---

## 3. The options

Notation:
- M = runner mass (73 kg in PI-1);
- T(t) = authoritative state (root position, velocity, facing, stride clock);
- S = physical state;
- R(t) = reference body state derived from T.

### Option 1: whole-body uniform field (SLP-2 A)

| question | answer |
|---|---|
| state read | **T only:** a_T(t), plus α (the simulation's locomotion state). No physical state. |
| forces / torques, where | F_i = α·m_i·a_T on every body at its COM (`addForceAt`, 14 calls). Net force M·a_T, **zero torque about the COM**, no joint load. |
| can it erase / oppose collision momentum? | **No.** It has no term in S; a collision's ΔP stays in S (SLP-2: J_A = M·Δv exactly in every run). |
| must legs propel? | No. But held legs still **brake** through a planted foot (§2.3). A does not remove the need for leg articulation. |
| interaction with B | Independent. B's budget is used only by disturbances and leg / contact mismatch. A and B fade together (SLP-2 decision 2); in PI-1, B releases at the authoritative FALL. |
| promotion / demotion | Starts at α = 1 with no transient (it is a force, not a write). Gated to zero from the simulation's contact or reaction onset (§4). Irrelevant at demotion. |
| CPU | 3 – 7 µs per 240 Hz step (SLP-2, including B target updates). |
| determinism | Pure function of recorded rows; fixed body order. |
| simulation-authoritative outcomes | Preserved: nothing flows back. It never applies the simulation's contact ΔV once gated. |
| planted-leg sweep vs glancing swing-leg hit | Identical treatment: A sees neither. The weight-bearing boot is swept by real friction and support loss. The light swing leg deflects. Whole-body ΔP = J stays. |
| **verdict** | **Correct translation term; reuse (§4). Not sufficient** (zero in the PI-1 cases; does not move legs). |

### Option 2: finite root / COM trajectory servo

**2a. Pelvis-applied servo.** This **is B** (the SupportLayer). A second one would double B.

**2b. COM-distributed servo:** F_i = (m_i/M)·clamp(M·[a_T + K_p(c_T − c_S) + K_d(v_T − v_S)], F_cap).

| question | answer |
|---|---|
| state read | the physical COM position and velocity (sum over 14 bodies), plus T |
| forces / torques, where | uniform field (2b), so no torque about the COM. 2a acts at the pelvis and pitches the trunk against foot braking (SLP-1b / SLP-2 collapse mechanism). |
| can it erase / oppose collision momentum? | **Yes, by construction.** It removes up to F_cap·Δt: 27.5 N·s per 0.1 s at 275 N, against 20 – 32 N·s physical exchanges (REV2) and an estimated ≈ 117 N·s for a planted sweep (PI-1 §7). A swing-leg clip's whole-body ΔP is erased in tens of ms. |
| must legs propel? | No. But with held legs the servo fights the planted-foot braking. SLP-1: support caps sized for recovery cannot carry locomotion. A stronger cap drags the foot (NM-2) or pitches the body. |
| interaction with B | It is a second recovery authority. Effective recovery cap = B + servo, so the recoverable / fall boundary moves off V2's derived caps. Replacing B with it is just B with other gains. |
| promotion / demotion | No transient if the handoff equals the target (HG). Must release at the authoritative FALL, as B does, or it holds a swept player up. |
| CPU | ≈ 5 – 10 µs per step (14 velocity reads plus 14 forces); 2a as a Jolt motor adds one 6-DOF constraint to the solve. |
| determinism | fine |
| simulation-authoritative outcomes | Preserved in T. The **physical explanation** is suppressed: a recoverable clip shows almost no body response. |
| planted-leg sweep vs glancing swing-leg hit | Sweep: holds the pelvis up and forward while the boot goes (until released). Glance: cancels the trunk's share of the hit; only the limb's local deflection stays. |
| **verdict** | **Reject.** It duplicates B and erases what the slice must show. |

### Option 3: velocity / acceleration tracking with authority capped below collision impulses

F = clamp(M·a_T + M·K_v(v_T − v_COM), ±F_cap), uniform.

| question | answer |
|---|---|
| state read | physical COM velocity, plus T |
| forces / torques, where | uniform. The feed-forward part **is A**; the feedback part is B's damper with a different cap. |
| can it erase / oppose collision momentum? | **Yes.** "Capped below meaningful impulses" protects only the impact instant (10 – 20 ms × 275 N = 2.8 – 5.5 N·s). The visible consequence unfolds over 0.1 – 0.5 s, during which the tracker removes F_cap·t (27.5 – 137 N·s). The cap needed not to erase a swing clip (J ≈ 3 – 17 N·s first contact in REV2) is below any useful tracking authority. |
| must legs propel? | No. With held legs it is the same failure as option 2. |
| interaction with B | Duplicates B's velocity term; same boundary shift. |
| promotion / demotion | as option 2 |
| CPU | ≈ 5 – 10 µs per step |
| determinism | fine |
| simulation-authoritative outcomes | as option 2 |
| planted-leg sweep vs glancing swing-leg hit | as option 2, translation only (no vertical hold if horizontal-only) |
| **verdict** | **Reject.** It is A plus a weaker B. |

### Option 4: smaller alternatives found in the code and history

| alternative | where from | verdict |
|---|---|---|
| **4a. No carrier** (handoff momentum only) | REV2 now; equals option 1 at a_T = 0 | Measured: coherent 1 – 4 ticks at 3 m/s, B torque at cap (§2.2). **Fails.** |
| **4b. Late promotion** (≤ 1 – 2 ticks before contact) | moving-handoff §6 diagnostic: with valid frames right before contact, rx_planted_leg / rx_glancing stayed coherent through contact | Costs nothing, but it does not answer the slice question ("several ticks before"). A near miss has no contact to promote for. Valid frames recur only once per step. **Not a carrier;** stays the fallback. |
| **4c. Global gravity g + a_T** (`SetGravity`) | SLP-2 §2.1 | Identical to A for one character and free, but one vector per world. **Rejected for production.** |
| **4d. Kinematic root or partial promotion** (struck chain only) | SLP-2 §2.1; pivot Q9 | Infinite authority / mass at the root: a weight-bearing sweep cannot displace it. **Rejected.** |
| **4e. Foot weld (infinite friction) or frictionless stance during PRE** | — | Violates "contacts / friction remain real". The planted-leg fall depends on loaded friction. **Rejected.** |
| **4f. Configuration feed-forward along the simulation's leg law** | moving-handoff §8 ("finite-authority tracking of the simulation's own runner-body configuration … decision"); PI-1 §6.4 original (moving pose targets + target-rate feed-forward), replaced in REV2 §6.1 by held targets | **The missing piece.** Combined with option 1, it is the recommendation (§5). The question rows are in §5.4. |

---

## 4. Can the SLP-2 A field be reused or adapted?

**Yes, as the translation term, with two adaptations and one caveat.**

**What carries over unchanged:**
- the law F_i = α·m_i·a_T at each body's COM, applied before every step;
- the per-body `addForceAt` path (`gates/v2_slp.js:53-54`, `core/v2_jolt.js:194`);
- its ledger (J_A, W_A);
- its validated properties: exact M·Δv_T, zero torque about the COM, no state read, no write, 3 – 7 µs per step.

**Adaptation 1: 2-D.** SLP-2's a_T was a scalar along a straight line (`traj.az`). Here a_T is the horizontal 2-vector from the authoritative rows, interpolated within the tick exactly as B's targets already are (`rootAt(τ + ¼)`).

**Adaptation 2: gate to ordinary locomotion.**
- The authoritative root acceleration includes the simulation's **own contact response**: 14.9 m/s² (rx_free_leg) and 65.9 m/s² (rx_planted_leg) at the contact tick (`auth_accel.txt`).
- Applying it as a field would add the simulation's ΔV to the physical collision's ΔV. PI-1 §9 forbids that ("the simulation's own contact ΔV is never applied as a force").
- So α_A = 1 only while the simulation's player is in ordinary locomotion. α_A = 0 from the simulation's contact or reaction onset. This is authoritative state, so the gate is not state feedback.

**Caveat.** A carries translation only.
- It cannot turn the body: it applies zero torque. The authoritative facing rate (N10) needs a separate channel. In the three PI-1 records the facing rate is 0 before contact.
- It does not move legs.
- In the three PI-1 cases a_T ≡ 0 before contact (constant 3.000 m/s, straight), so **A applies exactly nothing there**. It belongs in the architecture, not in this slice (§6.7).

---

## 5. Recommended carrier: authoritative-trajectory feed-forward

### 5.1 Principle

**Feed-forward / feedback split:**
- Everything the carrier adds is evaluated on the authoritative trajectory, never on the physical state.
- Feedback stays only where the accepted plant already has it, with unchanged authority: posture tone and B.
- So a collision changes S and therefore D = S − R. The carrier's commands are identical with and without the collision. This is SLP-2's A / B separation, applied in joint space as well as to translation.

### 5.2 Definition

**Reference.** At every sub-step τ:
- q_T(τ) = the simulation's own runner pose: `ofLocoCycle` (with `ofLocoGroundPelvis`; lean / roll / twist 0) at the recorded stride clock and speed, on the character's simulation-owned skeleton. These are the same pure functions and inputs `ptRxBodyChar` uses (V1.3, byte-identical).
- Mapped into V2 joint coordinates through the existing rig → V2 mapper and projected into V2's hard box.
- Interpolated between ticks k and k+1, as B's root target already is.
- R(τ) = that pose's pelvis (position, velocity, orientation) at the authoritative root.

**Carrier terms:**

| term | definition | reads |
|---|---|---|
| C-T (translation) | A: F_i = α_A·m_i·a_T, α_A = 1 in ordinary locomotion, 0 from the simulation's contact / reaction onset | T |
| C-Q (configuration targets) | posture-tone targets q*(τ) = q_T(τ) ⊕ w(τ)·Δ₀, where Δ₀ = promoted pose ⊖ q_T(k_p), and w is a smoothstep 1 → 0 over T_b = 0.10 s. Continuous at promotion, then exactly the simulation's law | T, the frozen promotion pose |
| C-V (target rate) | τ0 += D·q̇*(τ), so the existing damper acts on (q̇* − q̇) instead of braking the target motion | T |
| C-ID (target inverse dynamics, unsupported limbs) | for each subtree not in physical contact (swing leg: weight (1 − w_st) as the existing gain blend; arms): Newton–Euler torque of the **target** motion (q*, q̇*, q̈*, with the target pelvis acceleration as the base), on V2's own masses and inertias | T |

**Feedback, unchanged in authority:**
- **posture tone:** K, D, stance / swing blend by physical contact, gravity statics, and ActuatorLayer capacity. Only its setpoint moves.
- **B:** caps, 2 Hz, ζ = 1, release at the authoritative FALL, all unchanged.
  - Target = R (horizontal position and velocity, orientation; initial offset decays over T_b as in C-Q).
  - **Vertical axis released** (α_v = 0) while promoted (decision D-3).

**At the authoritative FALL:** REV2 unchanged. B released, posture frozen at the physical pose. C-T is already off; C-Q / C-V / C-ID stop with the freeze.

### 5.3 Why each term is needed (and not more)

**C-Q.** Without it no promoted runner is coherent beyond 1 – 3 ticks (§2.3).
- The reference must be the simulation's law, because CG-4 and CG-2 compare against it.
- The presentation is up to 0.28 m away from it within a window.

**C-V.** With a moving setpoint and no rate term, the damper resists the target motion.
- The stance leg then brakes the body through the foot (SLP-2's stance braking).
- The swing leg lags.

**C-ID.** The swing servo is 4 Hz, ζ 0.8 (`v2_support.js:43`).
- A 4 Hz servo with rate but no acceleration feed-forward tracks the ≈ 1.5 Hz jog swing with an amplitude error of about (ω/ω_n)² ≈ 15 % of each joint's excursion at the fundamental alone, more for the late-swing knee extension.
- That is ≈ 0.1 m or more at the foot, against CG-4's 0.10 m.
- Measured precedent: SLP-2's swing leg, on the same 4 Hz swing gains (`ctrl/v2_supported.js:174`), lagged its walking target by 0.11 m at 0.15 s and 0.16 m at 0.21 s after liftoff (`SLP2C_RESULTS.md` §3).
- C-ID is the joint-space counterpart of A: the generalised force the authoritative motion requires, computed on the motion, blind to the state, and limited by real actuator capacity.
- It is **not** applied to supported legs. Their required torques depend on ground reaction forces, which only physics determines; gravity statics stays as in REV2.

**B retargeted.** With legs moving, REV2's target (promotion height, root velocity, upright) is inconsistent with the gait itself:
- vertical: B's damper alone (2·M·ω ≈ 1,835 N·s/m) against a ±0.3 m/s pelvis bounce asks ≈ 550 N, against a 193.5 N downward cap. The ±0.3 m/s is an estimate: g·T_f/2 for a ≈ 0.07 s flight;
- orientation: B's rotational spring is I·ω² ≈ 1,263 N·m/rad about pitch and roll (REV2 I = 8 kg·m²). A gait pelvic tilt or obliquity of about 4° alone asks ≈ 88 N·m, above the 81.8 N·m cap (estimate).

B would saturate on ordinary motion (the moving-handoff N7 finding). Retargeting to R is SLP-2's own definition of B (R = T + δ).

**Vertical released, because:**
- the legs now carry the weight;
- the law's flight path is not ballistic (LC-1 finding), and +1161 N of upward B could otherwise hold the body up in flight and hide a leg-support failure (SLP-2: B carried 300 – 650 N in flights);
- SLP-2 decision 3 ("vertical physical") and the PI-1 FALL rule already release it.

**Not included:**
- footholds, stance-force schedules, swing re-timing or clearance planning, balance, capture point;
- any term reading S beyond the existing posture tone and B;
- any presentation pose.

This is the boundary to SLP-2C and CF.

### 5.4 The question rows for the recommended carrier (A + 4f)

| question | answer |
|---|---|
| state read | T (root, velocity, facing, stride clock, contact / reaction state) and the frozen promotion pose. The existing posture tone and B read S as before. |
| forces / torques, where | C-T: uniform field (zero in the slice). C-V / C-ID: joint torques through the ActuatorLayer (capacity-limited) on the swing leg and arms. C-Q: setpoint only. B: pelvis, caps unchanged, vertical released. |
| can it erase / oppose collision momentum? | The carrier terms cannot: they are blind to S (slice row K1). Feedback stays as accepted. Posture tone pulls a struck limb back toward the law at finite stiffness (4 Hz swing), as it now pulls it back toward the held pose. B recovers within its caps and is tested by the retained cancellation row (K2). |
| must legs propel? | No: translation is the handoff momentum plus A. The legs **articulate** along the law, and their net horizontal ground impulse is measured (K3). |
| interaction with B | Same B budget, same release. Only its target moves to the reference body R (D-3). |
| promotion / demotion | Promotion: the REV2 handoff write unchanged, then C-Q / B offsets decay over T_b = 0.10 s (state-independent). Demotion: REV2 DG unchanged. DG compares with the presentation (stream A), which differs from the law, so a 0.20 s presentation-only blend is the expected path (REV2 §7 allows it). FALL: REV2 freeze. |
| CPU | Estimated, to be measured: law pose plus mapping once per 60 Hz tick ≈ 30 – 80 µs; C-ID on 2 × 3 + arm chains ≈ 5 – 10 µs per step; C-T ≈ 3 – 7 µs per step. Total ≲ 0.1 – 0.15 ms per tick, against the V2 step of 0.81 – 0.96 ms × 4 per tick (SLP-2 CPU, Node / M4): **≈ 3 – 4 %** of a promoted player's cost. In production the simulation already evaluates the same law for a runner in a challenge (CHARCOLLIDE), so the pose may be shared. |
| determinism | Pure functions of recorded rows plus the existing deterministic plant; fixed order; no clock. |
| simulation-authoritative outcomes | Preserved. Nothing flows back. Targets are unperturbed locomotion (no reaction overlay). The simulation's contact ΔV is never applied (A gated). The outcome enters only through REV2's existing B release at the authoritative FALL. |
| planted-leg sweep | The struck leg is the stance leg, loaded by real body weight (statics plus stance gains), so its friction is real. The slide leg sweeps the boot when its impulse exceeds what friction and finite joint stiffness resist. The simulation's FALL then releases B and freezes posture; the body falls on its own momentum. |
| glancing swing-leg hit | The struck leg is under 4 Hz swing gains. C-ID / C-V are blind to the hit, so the deflection is resisted only by the leg's inertia and the 4 Hz PD: visible, and recovering in ≈ 0.1 – 0.25 s. The trunk receives the transmitted share. B recovers the whole-body ΔP within its caps (that is the "recoverable" case). |

---

## 6. Smallest vertical slice (proposal; nothing built)

### 6.1 Question (verbatim)

"Can a runner moving at 3 m/s be promoted several ticks before a slide tackle, continue locomoting coherently without contact, then receive a real physical leg collision whose effect is not erased by the locomotion carrier?"

### 6.2 Cases (three only; records unchanged)

| case | role | record | promotion frame (rule §6.3) | lead to contact / closest approach |
|---|---|---|---|---|
| rx_miss | near miss | LC-1 export `rx_miss_LOCO` | k47 | 12.5 ticks (0.21 s) |
| rx_free_leg | recoverable swing-leg clip | `rx_free_leg_LOCO` | k39 | 10.25 ticks (0.17 s) |
| rx_planted_leg | planted-leg fall | `rx_planted_leg_LOCO` | k38 | 9.75 ticks (0.16 s) |

### 6.3 Promotion-frame rule (an experimental selector, not the production trigger)

- k_p = the latest frame that passes the full REV2 handoff gate (HG-A v2, PR-2 v2 as adopted) with a lead of **≥ 6 ticks** (PI-1 T_lead = 0.10 s) before the authoritative contact (rx_miss: closest approach).
- Frames are taken from `locomotion_continuity/evidence/valid_on_rx.json`.
- This rule uses the record's contact time to set the lead, as lead_drift's sweeps did. The production trigger stays open (pivot Q1).
- The leads are long relative to the measured coherence: the current plant loses coherence in 1 – 4 ticks.

### 6.4 Build delta (new files only)

1. **`PI1CarrierSim extends PI1Sim`** in a new folder.
   - Overrides `_ctrl` (C-Q / C-V / C-ID into the PostureDriver command) and `_disturb` (B target = R, vertical α = 0).
   - `pi1_rev2_sim.mjs` is not modified.
   - Switch off = REV2 bit for bit.
2. **Law provider.**
   - Evaluates the shared pure law through the existing node-vm harness (V1.3 files, byte-identical) at `rows[k][13]`.
   - Maps it to V2 joint targets through the existing mapper.
   - Integrity row K0 below.
3. **Target inverse dynamics** for open subtrees. This is Newton–Euler on V2 spec masses and inertias; about a hundred lines.
4. **Harness:** REV2's measurement plus the K rows, run twice, plus a browser replay (physical vs simulation legs vs presentation).

**Unchanged:** V2 spec, Jolt, colliders, the stand-in AST-1, HG / CG / DG / PI-1 criteria, LC-1, V1.3, the simulation.

### 6.5 Criteria (to be frozen before any code)

**Existing, unchanged:**
- **PRE coherence, every tick from k_p to contact / closest approach:**
  - RC-4 (pelvis height ≥ 0.85, tilt ≤ 20°);
  - CG-4 vs the simulation's segments ≤ 0.10 m;
  - CG-2;
  - P-12;
  - NM-2: slip ≤ 10 mm, B mean ≤ 25 % of cap, saturated ≤ 5 %.

  Required in all three cases, **through** contact.
- **Contact:** REV2 §4 / §8 rows (CG-1 … CG-6, AST-C1).
- **Visible response:** PI-1 V-1 … V-3 and the outcome rows.
- **Afterwards:** DG within T_rec for rx_miss and rx_free_leg; the physical fall after the authoritative FALL for rx_planted_leg.

**New carrier rows:**

| row | requirement |
|---|---|
| K0 | Law-provider integrity: the CHARCOLLIDE segments recomputed from the provider's pose equal the recorded `simBody` (≤ 1e-9 m). |
| K1 | Blindness: the carrier's command series (A force, q*, q̇*, C-ID torques, B targets) is bit-identical between the contact run and the same promotion with the stand-in 500 m away, up to the authoritative FALL / end. |
| K2 | Not erased: the impulse of all coupling forces (B plus carrier) opposing the contact, along the contact normal within 0.1 s of first contact, is ≤ 0.5 × the physical contact impulse. This is SLP-1 / 2's retained cancellation test. |
| K3 | Reported: legs' net horizontal ground impulse over PRE; stance-leg ground impulse opposing the hit within 0.1 s (the physical bracing share); actuator saturation. |
| K4 | Determinism: two runs identical; carrier off reproduces the REV2 plant run for the same promotion bit for bit. |
| K5 | CPU per 240 Hz step by component (carrier terms separately); law provider per 60 Hz tick; Node M4. The browser figure is measured in the page harness where possible; mobile is not available here and is said so. |

**Answer rule.** The slice answers **yes** only if all three cases satisfy PRE coherence through contact, the contact rows, K0 – K2 and K4.

### 6.6 Stop rules

- **HG failure at the chosen k_p:** stop. No reselection beyond the rule.
- **Any PRE coherence failure:** stop and report the failing quantity (swing tracking, contact mismatch, B budget, vertical).
  - No tuning beyond the frozen values.
  - **No added gait or contact control** (footholds, stance-force shaping, swing re-timing, balance). This is the line that keeps the work out of SLP-2C / CF.
- **K1 or K2 failure:** stop.
- **No PI-1 revision and no LC revision** follow from the slice without your approval.

### 6.7 Deliberately not in the slice

- A, the uniform field: a_T ≡ 0 in all three records, measured. It enters with the first accelerating or turning record.
- Other speeds. At walk the law's foot lands about 13 cm above the pitch (`LC1_IMPLEMENTATION_FREEZE.md`, change 8). Sprint (7.5 m/s) is outside the three-case scope.
- The three LC-1 defects.
- The production promotion trigger; two promoted bodies.

---

## 7. Risks: what would show this architecture wrong

1. **Contact non-neutrality within one stance.** The law's stance kinematics are not built to be mechanically neutral on real turf.
   - The presentation adds plant IK to them, so tracking them with real friction produces horizontal contact forces.
   - SLP-2 bounds this for the first stance (B ≤ 14 N·s per step; jog first stance 13.5 N·s). SLP-2C shows that stance rate feed-forward can overshoot into propulsion (walk: +16.1 N·s before the first touchdown, +27.4 N·s over that stance).
   - **If B's budget fails within the window,** a promoted runner cannot locomote coherently without contact control. The honest consequences would then be late promotion (4b) or a decision about contact control.
2. **Swing-leg capacity.** C-ID may ask for more hip or knee torque at jog swing speeds than V2's Hill actuators give. Saturation is reported (K3) and would show as a CG-4 failure on the swing leg.
3. **Vertical timing.**
   - With vertical B released, a body that does not launch (SLP-2 finding) sinks in flight, by up to ≈ 22 mm per 0.067 s flight if not launched at all.
   - Touchdowns can then come earlier than the simulation's planted flag (CG-2).
   - RC-4 allows −15 % pelvis height; CG-2 is tick-resolved.
4. **Promotion offset.** Δ₀ is the presentation-vs-law gap at k_p: 65 / 74 / 58 mm leg-COM distance in rx_miss / rx_free_leg / rx_planted_leg (`cf_frozen_perfect_root.txt`). It decays over T_b = 0.10 s, which is shorter than every lead.
5. **This is a short physically realised gait.**
   - Any promoted body that keeps running on real contacts has moving legs on real turf. The only way around that is not to promote until the last 1 – 2 ticks.
   - The slice is the cheapest test of whether that window-limited gait is neutral enough without becoming the robotics problem the pivot left.

---

## 8. Decisions for you

| # | decision | recommendation |
|---|---|---|
| D-1 | Accept the diagnosis: translation is not the failing quantity; the carrier must include configuration feed-forward along the **simulation's** leg law | accept |
| D-2 | Amend REV2 §1 / §6.1 for the slice. Posture targets move from "held at the promoted pose" to "the simulation's own law, with the promotion offset decaying over 0.10 s". Never a presentation pose | accept |
| D-3 | B: target = the reference pelvis R (horizontal position / velocity, orientation); caps, gains, release unchanged; vertical released while promoted. Alternative: vertical retargeted to the law's pelvis height (risk: B carries a non-ballistic flight) | released |
| D-4 | Include C-ID (target inverse dynamics for unsupported limbs) as feed-forward. Without it, the predicted swing error is ≈ 0.1 m or more (§5.3) | include |
| D-5 | Handoff source: the LC-1 exports as preserved (leads 9.75 – 12.5 ticks). Alternative: V1.3 exports (leads 6.5 / 15.25 / 22.75) | LC-1 exports, read-only |
| D-6 | Promotion-frame rule §6.3 (latest HG-valid frame with lead ≥ 6 ticks) | accept |
| D-7 | A: keep in the architecture, adapted (2-D, gated to ordinary locomotion); test it only with a later accelerating / turning record | accept |
| D-8 | Approve preregistration, freeze and implementation of §6 | your call |

---

## Files

- This report.
- `scripts/at_failure_translation.cjs`, `scripts/cf_frozen_perfect_root.mjs`, `scripts/auth_accel.mjs` (read-only analysis).
- `evidence/`:
  - `at_failure_translation_v3.{json,txt}`;
  - `cf_frozen_perfect_root.txt` and `cf_frozen_perfect_root_{v3,rx_miss,rx_free_leg,rx_planted_leg}.json`;
  - `auth_accel.txt`;
  - `lc1_drift_v3_series/` (the 30 LC-1 drift series at 3 m/s, copied unchanged);
  - `records/` (four LC-1 LOCO exports, copied unchanged, `SHA256SUMS`).

**Reproduce** (worktree root):

```
PCV2="$PWD" V13_WT=<V1.3 worktree> V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 node review_artifacts/physical_character_v2/promotion_carrier/scripts/cf_frozen_perfect_root.mjs <records dir> <case> <k_p list> <ticks>
```

---

## Erratum (10 Oct 2026, appended after the PCS-1 promotion-frame re-check; the text above is unchanged)

**The error.** §6.2 / §6.3 (and D-6 in §8) said the slice's promotion frames k39 (rx_free_leg) and k38 (rx_planted_leg) pass the full REV2 handoff gate. **They do not.**
- They were taken from `locomotion_continuity/evidence/valid_on_rx.json`. Its "valid" flag (from `lc_valid.mjs` / `hg_valid_frames.mjs`) records HG-T, the slide-leg-extension row, separately and does not count it.
- Both frames fail HG-T: the slide leg first reaches full extension at frame 43 in all three records.

**Correct values under the full gate (LC-1 presentation):**

| case | latest fully valid frame | lead |
|---|---|---|
| rx_miss | 47 | 12.5 ticks (unchanged) |
| rx_free_leg | 45 | 4.25 ticks |
| rx_planted_leg | none | — |

**How it was caught.** The preregistered PCS-1 re-check caught it before any carrier run. See `slice/PCS1_STOP_KP_RECHECK.md`.
