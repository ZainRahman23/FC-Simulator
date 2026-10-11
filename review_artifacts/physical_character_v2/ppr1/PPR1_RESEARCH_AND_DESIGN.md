# PPR-1 research and design: physiological passive / pre-reflex response

**Source instruction:** `sources/2026-10-11_user_instruction_ppr1_physiological_pre_reflex.md` (468c8971).

**Supporting documents:**
- Literature: `research/PRE_REFLEX_LITERATURE.md`. ABI-1's `abi1/research/BALANCE_LITERATURE.md` is reused for latencies and reactive balance.
- Audit of CURRENT V2: `PPR1_AUDIT_CURRENT_V2.md`.
- Preregistration: `PPR1_PREREGISTRATION.md`.

**Labels:** [M] measured, [R] review or model, [E] my extrapolation, [D] design choice.

## 1. The question, physiologically

For the first ≈ 120 ms after an unexpected hit, a footballer is a mechanical body whose muscles keep their pre-impact activation. No new neural command exists yet: short-latency reflex torque arrives at ≈ 50–60 ms at the earliest, and corrective postural torque at ≈ 120–160 ms. Excluding reflexes until 120 ms is the instruction's choice [D]; it slightly understates human reflex torque in the 50–120 ms window.

Inside the window, the body's response is made of four parts.

**(A) Passive mechanics:**
- segment inertia and contact;
- passive tissue: small in mid-range, exponential at end range;
- tendon compliance;
- small viscous damping.

**(B) Muscles that are already active.** At **fixed activation** they show:
1. **Short-range stiffness (SRS):** immediate and proportional to active force [M, Cui 2008; Weiss 1988; Blanpied & Smidt 1992]. It is elastic only up to ≈ 0.5–1 % of fibre length, i.e. ≈ 0.3–1° at the lower-limb joints and ≈ 1–3° in the arms [E from M].
2. **Beyond that limit, a yielding plateau, not a spring.**
   - The force rises toward the eccentric plateau (≈ 1.2–1.8 × the pre-impact force) and then stays there [M in vitro; D for the range].
   - At postural firing rates it may even fall below isometric [M, cat].
3. **Force–velocity:** a load-dependent, saturating braking force [E].

These layers are tuned by the activation that already exists. That is the load dependence the instruction asks about: stiffness, yield level and damping all scale with pre-impact torque.

**(C) Collision-triggered neural change.** This is absent in the window by construction.

**Calibration anchors** (direct, whole-joint, reflex-excluded measurements):
- **ankle in stance:** 0.64–0.94 mgh for < 1°, falling to 0.44–0.58 mgh at 1–5° [M, Loram & Lakie 2002; Casadio 2005; Sakanaka 2021; Vlutters 2015];
- **trunk:** ≈ 109–141 N·m/rad at a 22.5 N·m pre-moment, damping ≈ 11 N·m·s/rad [M, Brown & McGill 2009];
- **intrinsic damping ratio:** ≈ 0.2, invariant with torque [M, Zhang 1998; Weiss 1988];
- **small-signal ankle viscosity:** 0.7–1.8 N·m·s/rad [R].

There are no direct stance data for the knee or hip. That gap remains, as ABI-1 found.

## 2. What CURRENT V2 (A) is

The detail is in `PPR1_AUDIT_CURRENT_V2.md`.

**The model:**
- a pose spring toward the frozen entry pose on every joint;
- stiffness 1.5 × the supported load (1.54 mgh at the ankles), identical on every axis;
- critically damped (D / K 0.12–0.35 s);
- statics bias frozen at entry.

**The excitation is computed from the same tick's request.** The "muscle drive" follows joint displacement with zero latency.

**In the collision:**
- the struck ankle goes from 9 % to 96 % activation within ≈ 50 ms;
- torque rises at 12,700–16,500 N·m/s from 0 ms;
- up to 68 N·m per axis is produced that the entry activation could not deliver.

**In probes:** the response is linear and symmetric, and 78–89 % of the resistance at 50 ms is viscous.

**Standing:** A cannot stand. It falls at ≈ 1.45 s, and recomputing statics does not help.

**Diagnosis:**
1. unrealistically fast torque generation (a zero-latency "reflex");
2. ≈ 100× too much damping;
3. excessive, non-yielding, isotropic stiffness around a frozen whole-body target.

## 3. Model 1 or Model 2? What V2's architecture can already express

V2's actuator is a per-axis implicit Jolt motor with three properties:
1. a torque window [−a⁻·cap⁻(θ, ω), +a⁺·cap⁺(θ, ω)] built from **activation** (first-order, 15 / 50 ms), Anderson **force–length** curves, and **force–velocity** with an eccentric plateau e = 1.20–1.35;
2. an implicit spring–damper inside the window;
3. an exact torque readback.

At **frozen activation**, that structure is the mechanics of an activated muscle:
- the implicit spring is the SRS (elastic, instantaneous);
- the window's upper bound in lengthening is the eccentric plateau, so the spring **yields** there;
- the force–velocity term gives the saturating braking force;
- the force–length curves give the angle dependence.

What is wrong in A is therefore not the representation but the **control law and its parameters**:
- the excitation is driven by the zero-latency servo request instead of by a neural command with latency;
- the spring constants are sized for static stability (1.5 × load), not for intrinsic muscle;
- the damping is critical-style;
- the spring never yields, because the activation chases the request.

**Hypothesis (Model 2):** the existing architecture is sufficient. B tests it by changing only the law: it adds no new actuator, body, collider or solver feature.

**Model 1 would be supported if** B, with defensible parameters, could not reproduce intrinsic-muscle behaviour, or could not stand without breaking the window's collision-blindness.

## 4. B: PHYSIOLOGICAL PRE-REFLEX (the smallest defensible replacement)

B replaces the runner's SnapshotTone with three layers, all inside the unchanged ActuatorLayer / Jolt motor.

### 4.1 Tonic drive: the neural command, with latency

`τ_drive(n) = bias + [support chain only] K_r·err(n − L) − (D_r + h·K_r)·ω(n − L)`

- **bias:** A's own statics bias, computed once at entry. It is what the muscles already deliver, so it is the same gravity compensation as A [D, physiological in the window].
- **err, ω:** the runner's own joint error to the entry pose and joint rate, read **L = 30 steps (125 ms)** earlier. Before activation the body is taken to be in its entry state, A's own assumption (ȧ0 = 0).
  - 125 ms is ABI-1's central corrective-torque onset latency.
  - It guarantees that no collision information can reach the drive until 133 ms after contact.
- **Support chain:** ankles, knees, hips, lumbar, thoracic.
  - K_r = max(K_A − K_i,entry, 1.2·m·g·L_load), and D_r = D_A·K_r / K_A, where K_A, D_A and m·g·L_load are A's own gain data.
  - This keeps A's posture-holding stiffness, minus the share now supplied instantly by muscle, but never below 1.2 × the gravitational stiffness of the load. Posture is therefore still held after the intrinsic spring yields [D].
  - The rule was chosen from single-joint delay models (§5) before any B run.
- **Neck, shoulders, elbows:** τ_drive = bias. These are light, non-weight-bearing segments. A 125 ms-delayed joint-space loop destabilises them (§5); in humans they are regulated by faster loops that B deliberately excludes [D].

### 4.2 Activation: no neural change except through the drive

- **Excitation:** u± = clamp(max(±τ_drive, 0) / capIso±(θ) + a_cc, 0, 1), with **a_cc = 0.02**.
  - a_cc is V2's own resting tone [D]: low single-digit % MVC, and no anticipatory co-contraction is justified for an unseen tackle [R].
  - The rule has no 25 % margin.
- **Activation dynamics:** V2's unchanged first-order dynamics (15 / 50 ms).
- **Consequence:** in the PVP window the drive is constant, so the **activation is frozen at its pre-contact value.**

### 4.3 Intrinsic muscle mechanics: instantaneous, load-dependent, yielding

**Stiffness:**

`K_i = Σ± (e± − 1)·a±·capIso±(θ) / θ_y,joint`

- The stretched muscles' active torque, times V2's own eccentric margin (e − 1), is reached after a joint rotation **θ_y**. That is the SRS elastic limit.
- K_i is proportional to active torque [M: SRS ∝ force; K ∝ τ], so it is load-dependent and direction-dependent.
- **θ_y per joint:**

| joint | θ_y | basis |
|---|---|---|
| ankle | **0.967°** | calibrated: Σ sagittal K_i = 0.78 mgh at the DX entry, the mean of the stance data; within the tendon-inclusive 0.4–4.6° [E] |
| knee, hip | 1.0° | fibre limits 0.4–1.4° [E] |
| lumbar, thoracic | 3.0° | calibrated: K_i = 143 N·m/rad at 22.5 N·m [M, Brown & McGill 141] |
| shoulder | 2.2° | deltoid 1.6–2.8° [E] |
| elbow | 2.0° | 0.9–3.3° [E] |
| neck | 2.0° | [D, no data] |

**Damping:** D_i = 2·**0.2**·√(K_i·I_axis), where I_axis is the child subtree's inertia about the joint axis.
- ζ = 0.2 [M]. It reproduces the ankle's 0.72 N·m·s/rad (literature 0.7–1.8) and the lumbar's 9.4 N·m·s/rad (literature ≈ 11).

**Implementation in the existing motor:**
- the motor row is K = K_i, D = D_i, τ0 = τ_drive + K_i·e_anc;
- the window is V2's unchanged [−a⁻·cap⁻(θ, ω), +a⁺·cap⁺(θ, ω)];
- when the motor torque reaches the window, the muscle **yields** at its eccentric plateau.

**Plastic slip (cross-bridges re-attach at the new length):** after every step, on each axis where the actuator saturated, the elastic element's anchor moves so that τ_drive + K_i·e_anc equals the saturated torque. The joint does not spring back toward the old pose.

### 4.4 Collision-blindness

**What B reads:**
- the runner's own body states, current for the intrinsic layer and ≥ 125 ms old for the drive;
- its own actuator readback.

**What B never reads:**
- contacts, the tackler, the impact or contact location;
- labels, outcomes or future data.

**Consequences:**
- With the tackler removed (SOLO) the identical code runs.
- Nothing switches on contact.
- There are no impulses, pose writes, root corrections or canned motion.

### 4.5 Entry values at the PVP-1A-DX entry (`evidence/PPR1_DESIGN_TABLE.json`; runtime must reproduce them)

| axis | τ_drive (N·m) | K_i (A's K) | yield beyond tonic, stretched side | D_i (A's D) |
|---|---|---|---|---|
| ankle_R dorsi / plantar flexion | −10.0 | 247 (497) | 4.0 N·m at 0.97° | 0.72 (175) |
| ankle_R inversion | −4.3 | 67 (497) | 1.0 | 0.21 (175) |
| knee_R flexion | −7.5 | 202 (293) | 2.5 | 3.5 (81) |
| hip_R flexion | −8.1 | 226 (110) | 3.0 | 9.9 (20) |
| hip_R abduction | −52.7 | 857 (110) | 14.0 | 19.2 (20) |
| lumbar flexion / lateral | −22.5 / 0 | 143 / 21 (133) | 6.7 / 0.6 | 9.4 / 3.9 (24) |
| neck flexion | −1.5 | 23 (9) | 0.6 | 0.63 (1.2) |
| shoulder_R flexion / abduction | 0.8 / −1.7 | 25 / 33 (17) | ≤ 0.7 | 1.4 / 1.6 (3.5) |

**What the table shows:**
- B is **less stiff where A was oversized** (ankle, knee) and **stiffer where real muscles carry tonic load** (hip abductors in this wide stance, trunk extensors).
- In every case B is **elastic only up to ≈ 1–3°**, then it yields.
- Its damping is 1–2 orders smaller than A's.

**Torque rate:** B has no explicit rate limit.
- The intrinsic torque change is instantaneous but bounded in magnitude by the yield [M: SRS is immediate].
- Any change of drive is delayed 125 ms and then rate-limited by activation dynamics.

## 5. Choosing the delayed regulator before any B run (single-joint models, `scripts/ppr1_regulator_toy.py`)

Each model is one joint with:
- A's own load (mass and lever);
- gravity;
- B's intrinsic elastoplastic element at its entry values;
- a 125 ms delayed PD.

Each was started at 0.5° (inside the elastic range) and at 3° (beyond it):

| rule | result |
|---|---|
| A's full tone, delayed | **unstable** at lumbar, neck, hip, shoulder and elbow |
| remainder only, max(K_A − K_i, 0) | stable, but zero where K_i > K_A. After a yield the hips and trunk would fold |
| remainder, floor 1.0·mgL | whole body neutrally stable |
| **remainder, floor 1.2·mgL** | **support chain stable.** Small offsets decay; large ones settle plastically. **The neck oscillates (≈ ±5°)** |
| low-pass on the drive | fixes the neck, destabilises the whole body, lumbar and knee |
| no regulator | neck, arms and trunk stable (plastic hold); whole body, knee and hip **diverge** |

**Hence:** the regulator acts on the support chain only, and the neck and arms keep intrinsic plus passive mechanics.

This is also a finding. A 125 ms-delayed joint-space loop cannot stabilise the head; it needs faster control than B is allowed to have.

## 6. Expected behaviour (predictions, recorded before any B run)

**Struck right leg.**
- The SRS is exceeded within milliseconds, then the muscles yield at ≈ 1.25 × their small tonic torques. The tackle should therefore **drive the foot, shank and knee much more freely than in A** (whose activation rises to 96 %).
- The motion should be inertia- and contact-dominated.

**Pelvis and trunk.**
- They should respond later, through coupling, as the swept leg loads the hip.
- The stiffer hip abductors and trunk extensors transmit force but yield beyond ≈ 1–3°.

**Arms.** They should lag the trunk by inertia, resisted only by their low tone.

**Order.** Onsets should propagate distal → proximal from the contact.

**Overall.** B may be **more** disturbed than A by 120 ms. That would be the correct physiological result, not a failure.

**Standing.**
- B should hold quiet stance at least as long as A. Its support-chain posture loop is A's tone minus the intrinsic share, delayed.
- Small pushes should be resisted elastically, then restored after ≈ 125 ms. Large pushes should overwhelm it.

**Probes.** Elastic for small torques, yielding (nonlinear) for large ones, with damping no longer dominant.

## 7. Risks recorded before the run

- **Multi-joint coupling may destabilise** the delayed support-chain loop in a way the 1-DOF models miss.
- **The neck and arms have no posture restoration.** After large disturbances they settle plastically; in the PVP window this is irrelevant.
- **The frontal ankle (K_i 67 N·m/rad) and the hip abductors** have small yield margins, so lateral sway may limit-cycle at ≈ 0.3°.
- **The knee and hip parameters fill a data gap** [E].
