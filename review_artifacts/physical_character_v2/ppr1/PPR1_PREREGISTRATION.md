# PPR-1 preregistration: physiological passive / pre-reflex response

**Status:** FROZEN at the commit that adds this file. Nothing about B has been observed in any simulation: no B law code exists at the freeze.

**Basis:**
- `PPR1_RESEARCH_AND_DESIGN.md`;
- `PPR1_AUDIT_CURRENT_V2.md`;
- `research/PRE_REFLEX_LITERATURE.md`;
- source `sources/2026-10-11_user_instruction_ppr1_physiological_pre_reflex.md` (468c8971).

## 1. Conditions

| | what drives the runner | changed |
|---|---|---|
| **A: CURRENT V2** | IFM-1 SnapshotTone through the unchanged ActuatorLayer | nothing (control; reproduces DX N2 `e5751b0cbdd7c2b9`, C0 `bc24da7b20eaf828`) |
| **B: PHYSIOLOGICAL PRE-REFLEX** | §4 below, through the unchanged actuator model (same capacity, force–length, force–velocity, eccentric plateau, activation dynamics, Jolt motor) | only the runner's control law: excitation rule, motor stiffness / damping / feed-forward, anchor |

**The tackler is identical in both:**
- the same SnapshotTone with flags (0, 0), unchanged;
- the same entry state and impact speed.

Post-contact, the tackler responds physically to whichever runner it meets. That is unavoidable and is reported as "tackler response".

## 2. Disturbance and invariants

**Primary disturbance:** the PVP-1A-DX early collision, native contact N2:
- fixture `pvp1/fixture/PVP1A_FIXTURE.json`;
- plant `pvp1/scripts/pvp1a_sim.mjs` through `ppr1/scripts/ppr1_plant.mjs`.

**Unchanged:**
- the authoritative record and gameplay hash `a2678624`;
- tackler entry, mass and speed;
- every collider and contact setting, friction;
- solver (240 Hz, 150 / 2);
- V2 anatomy, mass and inertia, passive tissue;
- RUN-1;
- TRC-1 rendering;
- PVP outcome semantics.

**The plant's hooks are inert for A.** No impulse, pose or velocity write is added for either condition.

## 3. Time origin and windows

- **t = 0** is the start of the first step whose contact manifold carries an impulse (≥ 1e-3 N·s): step 3 for DX, i.e. 8.33 ms after activation.
- **Primary window:** 0 < t ≤ 120 ms (records 3–30).
- **Bins:** 0–25, 25–50, 50–80 and 80–120 ms.
- Records beyond 120 ms are not in the primary A / B judgement.

## 4. B, frozen

**Notation:** per runner motorised axis (joint k, constraint axis i), using the existing ActuatorLayer quantities.

- capIso±(θ): full-activation isometric capacity in the ± direction, i.e. `capFull(x, ±1, anat, 0, knee)`.
- e±: V2's eccentric plateau of that direction (`CAPACITY[…].e`).
- K_A, D_A, bias: A's SnapshotTone values, computed by the unchanged plant at entry.
- m·g·L_load: A's own gain load, K_A / 1.5.
- I_axis: inertia of the joint's child subtree about the axis in the entry pose.
- h = 1/240 s.

### 4.1 Tonic drive (the neural command; latency L = 30 steps = 125 ms)

- **SUPPORT** = { ankle_L, ankle_R, knee_L, knee_R, hip_L, hip_R, lumbar, thoracic }:
  - `τ_drive(n) = bias + K_r·err(n−30) − (D_r + h·K_r)·ω(n−30)`
  - `K_r = max(K_A − K_i,entry, 1.2·K_A/1.5)`
  - `D_r = D_A·K_r / K_A`
- **Other joints** (neck, shoulders, elbows): `τ_drive(n) = bias`.

**Definitions:**
- err(n): A's error to the entry pose, `2·vec(q⁻¹·q_ref)`, evaluated on the runner's own state of record n.
- ω(n): the relative joint rate about the child-frame axis in record n.
- For n − 30 < 0, the entry state is used (err = 0, ω = 0; A's ȧ0 = 0 assumption).
- K_i,entry: §4.3 evaluated at entry.

### 4.2 Excitation and activation

- `u± = clamp( max(±τ_drive(n), 0) / capIso±(θ_n) + a_cc, 0, 1 )`, with **a_cc = 0.02**.
- Activation is V2's unchanged first-order dynamics (15 / 50 ms); at entry it is initialised to the excitation.
- No other excitation path exists. A's rule `|τ_req|·1.25 / cap + 0.02` from the same tick is **not** used for the runner.

### 4.3 Intrinsic muscle mechanics

**Stiffness:**

`K_i(n) = [ (e⁺ − 1)·a⁺(n)·capIso⁺(θ_n) + (e⁻ − 1)·a⁻(n)·capIso⁻(θ_n) ] / θ_y`

θ_y per joint:

| joint | θ_y |
|---|---|
| ankle | **0.96736°**, i.e. `PPR1_DESIGN_TABLE.json` thetaYankleDeg at full precision (calibration in the design table; frozen) |
| knee | 1.0° |
| hip | 1.0° |
| lumbar | 3.0° |
| thoracic | 3.0° |
| neck | 2.0° |
| shoulder | 2.2° |
| elbow | 2.0° |

**Damping:** `D_i(n) = 2·ζ·√(K_i(n)·I_axis)`, with **ζ = 0.2**.

**Motor row:**
- `K = K_i`, `D = D_i`;
- `τ0 = τ_drive(n) + K_i·e_anc(n)`;
- excitation from §4.2.

The torque window is the unchanged `[−a⁻·cap⁻(θ, ω), +a⁺·cap⁺(θ, ω)]`; the actuator applies `τ = clamp(τ0 − (D + h·K)·ω, window)`.

**Anchor:**
- q_anc[k] = the entry constraint rotation; `e_anc = 2·vec(q⁻¹·q_anc)` (sign-fixed as A).
- **After every step:** for each axis whose actuator torque saturated (V2's `sat` flag), set that axis's anchor error so that `τ_drive + K_i·e_anc` equals the saturated torque (plastic slip). The other axes are unchanged, and q_anc is rebuilt as `q·[e/2, √(1 − |e/2|²)]`.

### 4.4 Gravity compensation, limits, rates

- **Gravity compensation:** A's statics bias, computed once at entry. It is the pre-existing drive; it is not recomputed.
- **Torque limits:** V2's capacity at the current activation (unchanged model).
- **No explicit torque-rate limit.**
  - Intrinsic torque changes are instantaneous but bounded by the window (yield).
  - Drive changes are delayed 125 ms, then pass through activation dynamics.

### 4.5 Collision-blindness (structural)

**B's inputs:**
- the runner's own body states (current, and 30 steps old);
- the runner's own actuator readback (saturation flag, torque).

**B never reads:**
- contacts, the tackler, impulses, contact bodies;
- labels, outcomes, records or future states.

**Consequences:**
- The same code runs with the tackler absent (SOLO).
- There is no contact-triggered switch, and no impulse, pose or velocity write, root correction or canned motion.

### 4.6 Implementation acceptance (before ANY validation or PVP run with B)

1. **Entry values** reproduce `evidence/PPR1_DESIGN_TABLE.json` (K_i, D_i, a±, τ_drive) to ≤ 1e-9 relative.
2. **Law A** through the plant still reproduces DX N2 and C0 bit for bit.
3. **B SOLO, 24 steps:** finite, deterministic (two runs bit-identical).

**Coding errors** found here may be fixed and must be recorded as an amendment (`PPR1_AMENDMENTS.md`) before the battery. **Parameter changes are not allowed.**

## 5. Runs (the same list for A and B)

**Battery:** `scripts/ppr1_battery.mjs`, `BATTERY` constant.
- **QS:** 4.0 s.
- **PUSH:** pelvis COM, 100 ms from 0.5 s, 2.0 s run.
  - 10 N·s in 8 horizontal directions.
  - Graded 5 / 20 / 40 / 60 / 90 N·s forward, backward and right (their 10 N·s members are the 0° / 180° / 270° pushes).
- **IMP:** 10 kg, r 0.06 m, 3.0 m/s, gap 0.5 mm, 1.0 s run.
  - right shank mid from behind;
  - left shank mid from the side;
  - left deltoid from the side.
- **C0 and N2:** 260 steps.
- **DET:** QS and N2 repeated.

**Probes:** `scripts/ppr1_probe.mjs`, `PROBES` and `PROBE_TIMING`.
- 10 joint axes × 3 magnitudes × 2 signs.
- Torque-pair step from 100 ms, held 200 ms.
- Probe run minus unprobed run.

**Measurements:**
- `scripts/ppr1_metrics.mjs`, `ppr1_battery_summary.mjs` and `ppr1_audit_pvp.mjs`, as committed at the freeze;
- CPU from the plant counters.

## 6. Hard criteria (B passes PPR-1 only if every one holds)

### Primary: PVP-1A-DX, B

| id | criterion |
|---|---|
| H1 | **Collision-blind drive:** the runner's τ_drive and activations a± are bit-identical between B-N2 and B-C0 for every record n ≤ 32 (t ≤ 125 ms) |
| H2 | **No neural recruitment:** max over runner axes of \|a(n) − a(t = 0)\| ≤ 0.01 for 0 < t ≤ 120 ms |
| H3 | **No torque beyond the entry activation:** max over axes and window of \|τ\| − a_entry·cap(θ, ω) ≤ 1e-6·max(1, cap) (A: up to 68 N·m) |
| H4 | **Integrity and ledgers in the window, runner:** anchor separation ≤ 1 mm; self-penetration ≤ 10 mm; cross-penetration ≤ 10 mm; turf penetration ≤ 10 mm; finite; speed ≤ 25 m/s; linear residual ≤ 0.01 N·s per step; angular residual ≤ 0.01 N·m·s per step |
| H5 | **Determinism:** the N2 repeat is bit-identical (final hash) |
| H6 | **No chatter:** every KEY_AXES axis has ≤ 2 consecutive step-to-step sign alternations of α with \|α\| > 500 rad/s² in the window (A: 0) |
| H7 | **Physiological entry magnitudes:** Σ ankle sagittal K_i / mgh ∈ [0.64, 0.94]; per-ankle sagittal D_i ∈ [0.5, 2.0] N·m·s/rad; lumbar flexion K_i ∈ [109, 180] N·m/rad |

### Validation: away from the tackle, B

| id | criterion |
|---|---|
| V1 | **Same law without a tackler:** the B-C0 runner states are bit-identical to B-QS over all 260 steps |
| QS1 | through 1.0 s: trunk tilt ≤ 5°, pelvis drop ≤ 10 mm, horizontal COM drift ≤ 60 mm (A: 49 mm) |
| QS2 | in 0.5–1.0 s: max \|ω\| over KEY_AXES ≤ 0.5 rad/s, and ≤ 4 zero crossings of the fore-aft COM velocity with \|v\| > 5 mm/s |
| QS3 | trunk tilt > 20° not before 1.20 s (A: 1.45 s) |
| QS4 | each foot's slip while loaded ≤ 2 mm through 1.0 s |
| QS5 | Σ energy residual over 0–1.0 s ≤ +0.5 J (A: −0.31 J) |
| P1 | all eight 10 N·s pushes: peak COM deviation from B-QS within 400 ms ≤ 60 mm, and peak trunk deviation ≤ 6° |
| P2 | graded forward / backward / right: peak COM deviation strictly increasing over 5, 10, 20, 40, 60, 90 N·s |
| P3 | every 90 N·s push ends LOST_BALANCE within 2 s |
| IMP1 | all three impacts: finite, speed ≤ 25 m/s, anchor separation ≤ 1 mm throughout; H6's chatter rule in 0–120 ms after the impact |
| PR1 | ankle_R dorsi / plantar flexion, knee_R flexion, hip_R flexion, lumbar flexion, both signs: (Δθ at 100 ms / T) at the large magnitude ≥ 1.5 × that at the small magnitude, i.e. it yields (A: ≈ 1.0, except one capacity-saturated case) |
| PR2 | the same eight small probes: damping share of the fitted resistance at 50 ms < 50 % (A: 78–97 %) |
| PR3 | every probe: \|Δactivation\| vs the unprobed run ≤ 1e-9 for 30 steps after onset (A: 0.017–0.037) |

**Verdict.** Any hard failure makes B **FAILED** for PPR-1. The result is preserved, diagnosed and reported. A successor is proposed separately, with no retuning.

## 7. Descriptive outcomes (predictions in the design document §6; reported, not pass / fail)

**Per-bin A / B values:**
- joint Δθ, ω, α for the struck leg, contralateral leg, pelvis, trunk, head and arms;
- actuator torque, request, activation, passive torque;
- per-foot ground reaction force and support state;
- COM displacement and velocity;
- pelvis and trunk orientation;
- linear and angular momentum;
- actuator work, passive elastic energy, saturation;
- cross-contact impulse and work;
- tackler Δv.

**Onset order** (|Δω| > 0.5 rad/s).

**Attribution** (inside B's window the drive is constant):
- **contact impulse:** cross-contact impulse and work;
- **passive mechanics:** passive-tissue torque, inertia;
- **pre-existing activation:** the actuator torque, which in the window is fixed-activation muscle mechanics; drive change is 0 by H1 and H2;
- **N2 − C0** isolates the collision's own effect.

**Also reported:**
- whether B loses balance after 120 ms (outside the primary judgement);
- CPU per step and determinism.

## 8. Visual review

Re-rendered with the TRC-1 mapping (`render/ppr1_clip_prep.mjs`, `render/ppr1_capture.cjs`): **A | B** side by side, synchronised, with the same tackler and collision.

**Views:**
- gameplay 1×;
- 8× close;
- struck-leg close-up (zoom 16);
- no-contact (C0) close;
- impactor close.

**Each view in three variants:** mesh, mesh + colliders, overlay (skeletons, COM, ground contacts, ground reaction force).

**Page:**
- 1×, 0.25× and 0.1× (and 8×) playback;
- frame stepping and a contact-time jump;
- marks at 0, 40, 80 and 120 ms;
- primary clips end at +120.8 ms.

Whether B looks materially more human is the owner's judgement.

## 9. Integrity of this preregistration

The SHA-256 of every tool listed in §5, and of the design table, is recorded in `PPR1_FREEZE.json` at the freeze. Any later change to a frozen tool is either an amendment recorded before use, or a labelled post-hoc diagnostic.
