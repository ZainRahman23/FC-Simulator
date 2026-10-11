# PPR-1 audit: why CURRENT V2 (condition A) reads stiff

This is read-only: no physics, record or controller was changed. Evidence is in `ppr1/evidence/`:
- `PPR1_AUDIT_LAW_A.json`: the law, read from the constructed plant;
- `PPR1_AUDIT_PVP_A.json`: torques in the collision;
- `PPR1_PROBES_A.json`: joint probes;
- `PPR1_BATTERY_A.json`: standing, pushes and impacts.

The tools are in `ppr1/scripts/`. The runner is R0 (73.9 kg) at the PVP-1A-DX entry, with its COM 0.892 m above the ankles (mgh = 647 N·m/rad).

The plant `ppr1_plant.mjs` with law A reproduces the committed records **bit for bit**:
- PVP-1A-DX N2 `e5751b0cbdd7c2b9`;
- C0 `bc24da7b20eaf828`.

Every run repeats bit-identically.

## 1. What the controller is

A's runner is driven by IFM-1's **SnapshotTone** (`pvp1/scripts/pvp1a_sim.mjs`), through the unchanged V2 ActuatorLayer (`sim/v2_actuation.js`). Per motorised axis:

`τ = clamp( bias + K·err(q, q_entry) − (D + h·K)·ω ,  −a⁻·cap⁻(θ, ω),  +a⁺·cap⁺(θ, ω) )`

| element | CURRENT V2 | consequence |
|---|---|---|
| target | the entry pose, frozen, for **every** joint (legs, trunk, neck, arms) | every segment is pulled back to where it was at activation |
| stiffness K | κ · m·g·L of the load each joint supports, **κ = 1.5 on every joint and every axis** (`ctrl/v2_stand.js` gains, [ENG]) | a pose spring sized for static stability, not muscle |
| isotropy | the same K on all three axes of a joint (flexion = abduction = rotation) | no directional asymmetry |
| damping D | 2·0.7·√(K·m·L²): critical-style damping of the load's pendulum about the joint | very large; see §3 |
| bias | the PostureDriver statics, computed **once at entry** (half the body weight on each leg), never updated | constant gravity compensation, no load transfer |
| activation | first-order, τ_act 15 ms / τ_deact 50 ms (Thelen 2003), driven by the excitation u = min(1, \|τ_req\|·1.25 / cap + 0.02) | the torque window follows the demand |
| **excitation** | computed from the **same tick's** servo request | **zero neural latency**: the "muscle drive" reacts to joint displacement within one 4.2 ms step |
| passive tissue | `sim/v2_passive.js`: zero stiffness inside the soft range, exponential end-range, viscosity 0.15–1.0 N·m·s/rad | human-scale; not the cause |

**Values at the DX entry** (per joint; identical on every axis):

| joint | K (N·m/rad) | D (N·m·s/rad) | D / K | supported load m·g·L |
|---|---|---|---|---|
| ankle | 497 | 175 | 352 ms | 331 |
| knee | 293 | 81 | 276 ms | 195 |
| hip | 110 | 20 | 184 ms | 73 |
| lumbar | 133 | 24 | 183 ms | 89 |
| thoracic | 37 | 4.4 | 118 ms | 25 |
| neck | 9 | 1.2 | 130 ms | 6 |
| shoulder | 17 | 3.5 | 206 ms | 11 |
| elbow | 5 | 0.7 | 161 ms | 3 |

**Summed sagittal ankle values:**
- stiffness K = 994 N·m/rad = **1.54 mgh**;
- damping D = 349 N·m·s/rad = **0.54 mgh·s**.

ABI-1 quoted 1.39 mgh using a different COM height; the conclusion is the same.

## 2. What it does in the collision (PVP-1A-DX, A; t = 0 at the start of the first impulse step)

| axis | torque before | change, peak | when | peak rate | activation | torque beyond what the entry activation could give |
|---|---|---|---|---|---|---|
| knee_R flexion | 3.4 N·m | **+69 N·m** | 25 ms | **16,500 N·m/s** | 0.09 → **0.51** | 68 N·m |
| ankle_R dorsi / plantar flexion | −8.6 | **+54** | 58 ms (50 % by 29 ms) | **12,700** | 0.09 → **0.96** | 45 |
| ankle_R inversion | −5.6 | −31 | 38 ms | 7,400 | 0.17 → 0.95 | 30 |
| ankle_L dorsi / plantar flexion | −10.6 | −32 | 13 ms | 4,800 | 0.09 → 0.32 | 26 |
| hip_R flexion | −8.6 | −45 | 71 ms | 2,900 | 0.07 → 0.26 | 35 |

The struck ankle's muscles go from 9 % to 96 % activation within about 50 ms of contact, starting at 0 ms. A human cannot change muscle drive at all before reflex latency plus electromechanical delay: torque from the short-latency stretch reflex arrives at ≈ 50–60 ms at the earliest, and corrective postural torque at ≈ 120–160 ms (ABI-1 literature).

In 0–120 ms, A's runner produces up to 68 N·m per axis that only a nervous system could have produced, and it produces it with no delay.

## 3. Joint probes (runner alone, standing; internal torque-pair step, 200 ms; probe run minus unprobed run)

Effective stiffness and damping from a least-squares fit, Δτ_act = −K·Δθ − D·Δω, at the middle magnitude:

| joint, axis | fitted K | fitted D | damping share of resistance at 50 ms | Δθ at 10 / 50 / 150 ms |
|---|---|---|---|---|
| ankle_R dorsi / plantar flexion (±15 N·m) | 447–454 | 179 | **89 %** | 0.03 / 0.12 / 0.40° |
| knee_R flexion (±15) | 302–307 | 79–80 | 82 % | 0.07 / 0.35 / 0.93° |
| hip_R flexion (±15) | 113 | 20 | 80 % | 0.10 / 0.80 / 2.45° |
| hip_R abduction (±15) | 87–90 | 18 | 85 % | 0.02 / 0.13 / 0.57° |
| lumbar flexion (±15) | 134 | 24 | 79 % | 0.15 / 1.10 / 3.11° |
| shoulder_R flexion (±5) | 15 | 3.0 | 83 % | 0.17 / 1.99 / 6.39° |
| neck flexion (±2) | 10 | 1.2 | 78 % | 0.12 / 1.75 / 6.97° |

**What the probes show:**
- **The fit recovers the law.** The response is linear and symmetric. A doubled torque gives a doubled deflection, and + and − are mirror images, so the joint never yields.
- **For the first ≈ 150 ms, 78–89 % of the resistance is viscous.** Pushed joints creep slowly at near-constant speed, instead of deflecting elastically and then yielding.
- **The excitation tracks the request.** At the stance ankle, a ±8 N·m inversion probe drives the inversion actuator from 0.18 to full activation.

## 4. Standing (runner alone, no disturbance)

**A does not stand.**
- From the PVP-1A-DX entry, the COM creeps forward: +15 mm at 0.5 s, +49 mm at 1.0 s.
- The trunk passes 20° at **1.45 s**, and the runner falls by ≈ 2 s.
- The C0 run, with the tackler present but contacts off, follows the identical trace.

**The fall is not caused by the frozen gravity bias.** A labelled diagnostic recomputed the PostureDriver statics every step, with the same gains and targets and zero latency (`ppr1/diag/ppr1_diag_live_statics.mjs`). The creep was identical (+15 mm at 0.5 s, +46 mm at 1.0 s), and the runner still fell.

**The order of drift:**
1. ankle inversion ± 2° (first 0.25 s);
2. neck and thoracic flexion;
3. knee extension with ankle dorsiflexion;
4. hips, lumbar and arms.

This is a slow whole-body forward collapse. A joint-space pose spring at 1.5 × the supported load is not a standing balance controller for this body. Consequently, every disturbance test is dominated by the inherent drift: even a 5 N·s push ends in a fall at ≈ 1.4 s.

## 5. Human comparison and diagnosis

| property | CURRENT V2 | defensible human range (pre-reflex) | verdict |
|---|---|---|---|
| change of muscle drive after an unexpected hit | from 0 ms, to ≈ 96 % within 50 ms | none before ≈ 50–60 ms (short-latency reflex torque); corrective / postural ≈ 120–160 ms | **super-human: zero latency** |
| torque rise | up to 12,700–16,500 N·m/s, starting at 0 ms | elastic change of already-active muscle only, bounded by its short-range / eccentric limit; voluntary maximal RTD of plantar flexors 0–50 ms ≈ 0.4–1 kN·m/s, after latency | **super-human** |
| ankle stiffness, sagittal sum | 1.54 mgh, linear to full capacity | intrinsic 0.64–0.91 mgh for sub-degree motion, falling to ≈ 0.13–0.19 mgh by ≈ 7° | **too stiff, and never yields** |
| ankle damping | 349 N·m·s/rad (0.54 mgh·s), D / K 0.35 s | intrinsic viscosity of the order of 1 N·m·s/rad (see the PPR-1 literature) | **≈ 2 orders too large** |
| directional symmetry | the same K on all axes of a joint | stiffness differs by direction with the active muscles | wrong |
| targets | every joint, including arms, trunk and neck, held to the entry pose | arms and trunk free to move by inertia, resisted only by their own low tone | wrong for the upper body |
| gravity compensation | frozen at entry | frozen in the pre-reflex window is physiological; updated later with latency | fine in the window; not the cause of the standing failure |

**Answer to "what makes it a mannequin":** a combination, in this order:
1. **Unrealistically fast torque generation:** zero-latency excitation tracking, so the actuator behaves as an instantaneous reflex.
2. **Unrealistic damping:** critically damped pose servos, so the joints creep viscously instead of yielding elastically.
3. **Excessive, non-yielding, isotropic stiffness** around a **frozen whole-body posture target.**

Frozen gravity compensation is not a cause inside 0–120 ms. The passive tissue layer is not a cause.
