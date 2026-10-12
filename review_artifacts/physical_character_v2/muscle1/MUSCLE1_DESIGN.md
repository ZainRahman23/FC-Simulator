# MUSCLE-1 design: the physical contract of a reduced physiological actuator (before the candidate is run)

**Inputs:**
- the audit `MUSCLE1_AUDIT.md`;
- the literature review `research/FORCE_PRODUCTION_LITERATURE.md` (§ numbers below refer to it).

**Unchanged:** PPR-3 (S2 18 / 18, S2 + P2 10 / 14) is preserved. No S2 or P2 constant is retuned. PVP stays sealed.

## 1. What the evidence requires

1. **Neural pathway: command → force takes physiological time.**
   - Human step-drive torque rise (10–90 %) is ≈ 0.25–0.45 s for plantarflexors and ≈ 0.15–0.25 s for dorsiflexors and knee extensors (§9).
   - Relaxation (90–10 %) is ≈ 0.12–0.25 s for plantarflexors and ≈ 0.12–0.20 s for knee extensors.
   - Rise and fall are asymmetric (§11 #5).
   - V2 today gives 12.5 ms (CURRENT V2) or 33 ms (S2) rise. Both are 5–14× too fast (audit §2).
2. **Mechanical pathway: the stretch response is immediate and scales with developed force.**
   - Short-range stiffness acts without delay (Rack & Westbury 1974).
   - It is proportional to *developed* force, not to activation or EMG (Hunter & Kearney 1983; Kirsch & Rymer 1992; §6.2).
   - At the standing ankle it is limited by the series tendon (§6.4).
3. **Activation constants on their own are not a human measurement** (§12.1 #1).
   - τ_act / τ_deact (15 / 50 ms, Thelen 2003) are model parameters, calibrated inside models that also contain contraction dynamics (tendon + force–velocity).
   - V2 uses them **without** that stage (audit §2).
4. **History.**
   - Residual force enhancement after active stretch is ≈ 5–17 % and persists while active.
   - It **vanishes when force returns to zero** (Herzog 2018).
   - Force depression after shortening is abolished by ≈ 200 ms of relaxation.
   - Work done on stretched active muscle is dissipated as heat (§7.3).

## 2. Pathways

```
NEURAL (delayed):        u± ──(activation 15/50 ms)──> a± ──(contraction lag τc,rise / τc,fall)──> f± ──> active torque f⁺·capIso⁺(θ) − f⁻·capIso⁻(θ)
MECHANICAL (immediate):  joint motion ──> force–length capIso(θ) · force–velocity cap(θ, ω) · short-range stiffness K(f) on the strain arms · passive B · damping D(K)
```

- **The neural pathway is the only route from a controller to force.** Its total lag is activation plus contraction.
- **Nothing in the mechanical pathway waits for the neural pathway.** Its stiffness scales with the force that is *already developed*.
- **Total joint torque is never low-pass filtered.**

## 3. State variables (per actuator axis; ± = the two muscle groups of the axis)

| State | Human phenomenon | Why it is necessary | Status |
|---|---|---|---|
| u± (input, not a state) | neural drive to the muscle group (EMG-like) | the controller boundary (§7) | S2's interface, unchanged: a net-torque target is inverted to u± at the character's **entry** capacities with tone floors (`solveFloors`) |
| a± | activation: excitation–contraction coupling (Ca²⁺ release / re-uptake) | rise / fall asymmetry starts here; V2 already has it | **kept**: V2's 15 / 50 ms [MODEL]. No evidence supports changing it once contraction dynamics are added (§12.1 #1) |
| **f± (new)** | **developed force: contraction dynamics.** Series-elastic take-up through contractile-element force–velocity, plus recruitment / cross-bridge kinetics, lumped (§4.3, §12.1) | Without it, force rises in 33 ms against a human 150–450 ms. Asymmetric because human rise and fall are (§11 #5) | first order, τc,rise while f < a, τc,fall while f > a; per muscle group (§5) |
| F_r, F_s, F_f (replace S2's strains) | the short-range (stretch-induced) force carried by attached cross-bridges: persistent (residual force enhancement), slow and fast relaxing parts | C's persistence (S2-supported) **and** energy / history consistency (§4) | **redesigned**: arm *forces* updated incrementally (§4.2) |
| e_prev, K_f (bookkeeping) | — | the strain increment and the developed-force stiffness of the previous step, for detachment | — |

**Considered and excluded** (removable without losing the required behaviour):

| Candidate state | Why excluded |
|---|---|
| **Explicit series elastic (tendon) length** | Its two roles are covered:<br>• slowing force development is lumped into τc;<br>• the tendon-limited joint stiffness at standing is already in S2's calibrated short-range constants (ankle 0.78–1.21 × Vlutters).<br>**Limitation:** no tendon saturation of stiffness at high force. At near-maximal activation the lumped K exceeds the human tendon-limited 1,200–1,600 N·m/rad. This is not exercised in standing; it is listed for the specification (report Q13) |
| **Contractile-element length / velocity** | Force–velocity is V2's capacity at the current joint velocity (mechanical, immediate) |
| **A pure electromechanical dead time** | The cascade's second-order onset reaches 2 % of a step in 6–9 ms (evoked EMD 8.5–14 ms, §2.3) |
| **Fibre-type activation constants** | Not supported by human data (§10) |
| **Fatigue** | Out of scope |

## 4. Equations

Per axis, per step dt = 1/240 s (exact exponentials). Plan-time quantities use the state after the previous step, as in V2. "+" / "−" are the constraint-parameter directions, each mapped to an anatomical muscle group.

### 4.1 Neural pathway

```
a± ← u± + (a± − u±)·exp(−dt/τ),  τ = 15 ms if u± > a± else 50 ms           (V2 activationStep, unchanged)
f± ← a± + (f± − a±)·exp(−dt/τc),  τc = τc,rise if a± > f± else τc,fall       (new)
drive = f⁺·capIso⁺(θ) − f⁻·capIso⁻(θ)                                        (force–length at the CURRENT angle: mechanical)
```

### 4.2 Mechanical pathway

```
K_mus = kP·f⁺·capIso⁺(θ) + kM·f⁻·capIso⁻(θ),  kP / kM = (e± − 1)/θ_y         (S2 constants; on DEVELOPED force)
K_tot = K_mus + k_B,  D = max(D_min, 2ζ·√(K_tot·I) + d_B),  ζ = 0.2          (S2)
τ_B = −k_B·(θ − θ_slack)                                                     (S2's B)
τ_E = F_r + F_s + F_f                                                        (strain arms: FORCES)
R± = (e± − 1)·f±·capIso±(θ)                                                  (short-range reserve, from developed force)
window:  hi = f⁺·cap⁺(θ, ω) + τ_B + ext⁺,  lo = −f⁻·cap⁻(θ, −ω) + τ_B − ext⁻
  ext of a side that is shortening at plan time: S2's rule, i.e. the strain torque share already present, capped at R
  ext of a side that is isometric or lengthening: min(R, e·f·capIso − f·cap(θ, ω)), its reserve, available WITHIN the step
                                                       (window correction, §4.3)
motor:   τ = clamp(drive + τ_E + τ_B − (D + dt·K_tot)·ω_end, lo, hi)         (V2's implicit motor, unchanged)
```

**Strain arms after the step** (Δe = the step's joint strain increment; weights w_r 0.15, w_s 0.30, w_f 0.55; decays exp(−dt/0.5 s), exp(−dt/20 ms), and 1 for the persistent arm. These are S2's constants.)

```
detachment (at plan time, when developed force fell):  F_j ← F_j · K_f,new / K_f,old    (K_f = kP·f⁺·capIso⁺_entry + kM·f⁻·capIso⁻_entry)
attachment (developed force rose):                      F_j unchanged (new bridges attach unstrained)
loading:     F_j ← (F_j + w_j·K_mus·Δe)·decay_j
yield:       if |ΣF_j| > R⁺ + R⁻:  every F_j scaled to the cap (plastic slip)
```

### 4.3 Two mechanical corrections to S2, and why

**(a) The window reserve.** Found while plumbing the fixture on S2's own actuator (V2ACT), before any candidate run.
- When the loaded plantarflexors are stretched from standing, S2's window gives the first tick only the strain torque that existed at plan time. That is none.
- V2's force–velocity uses the previous tick's velocity (spec), which is zero on the first tick.
- So the intrinsic response is clipped to the active-force bound for one step:
  - first-tick torque change = 0.78 (0.001 rad/step) and **0.195** (0.004 rad/step) of the unclipped intrinsic response at the ankle;
  - 1.00 at the knee, where the extensor floor leaves headroom.
- Physically, short-range stiffness is immediate up to the eccentric plateau (Rack & Westbury; §6.1). The correction gives a non-shortening side its reserve within the step, capped at e·f·capIso, so force–velocity and strain do not stack.
- A shortening side keeps S2's rule, so the concentric force–velocity clamp is unchanged.

**(b) History-consistent strain arms.**
- S2's arms hold *strains* and produce τ_E = K(a)·e_eff, a secant law. When activation rises after a stretch, the old strain is multiplied by the larger K, so force (and stored energy ½·K·e²) appears without motion. A stiffness rise then returns more work than the stretch put in.
- The persistent strain also survives deactivation: reactivate, and the old enhancement returns. Humans do not do this (§7.1).
- The force-based arms with detachment / attachment fix both:
  - activation increases add no strain force;
  - deactivation dissipates the strain force;
  - with constant developed force they are identical to S2's arms. So S2's C1 relaxation fractions and its standing stiffness are unchanged.
- Tested in BC1 / BC2, with S2's law alongside as reference.

## 5. Parameters (the only new constants)

τc values are **[E]**: each was inverted on the 240 Hz discrete cascade (activation 15 / 50 ms → developed force) so that it reproduces the literature's central step-rise / relaxation target (`scripts/m1_design_derive.mjs`; agrees with the review's Appendix A.4 within 0.5 ms). They were not chosen from any simulation, PVP or PPR-3 behaviour.

| Group | Rise target (range) | τc,rise | Fall target (range) | τc,fall | Basis |
|---|---|---|---|---|---|
| Plantarflexors (PF) | 325 ms (250–450) | **146.7 ms** | 175 ms (120–250) | **54.2 ms** | §9 / §12.2 [E] |
| Dorsiflexors (DF) | 200 ms (150–250) | **88.8 ms** | 250 ms (230–360; weak) | **95.3 ms** | §12.2 [E] |
| Knee extensors (KE) | 200 ms (165–235) | **88.8 ms** | 160 ms (120–200) | **45.3 ms** | §12.2 [E] |
| Knee flexors (KF) | no data | 88.8 ms | no data | 45.3 ms | [D] borrowed from KE (§10 gap) |

`params/MUSCLE1_CANDIDATE.json`.

## 6. Double-counting audit (instruction §10)

| Mechanism | Physiological phenomenon | Instantaneous / delayed | Body / muscle / controller | Evidence | Overlap risk and resolution |
|---|---|---|---|---|---|
| **T**, tone floors | pre-activation (EMG % MVC ≈ activation) | sets the steady state: f = a = u at rest | neural setting (excitation) | STANDING_TONE review; PPR-3 ablations | Steady-state force equals S2's, so tone is not counted twice. M1 changes only *transients* |
| **C**, strain arms | short-range force of attached bridges; its relaxation; RFE | immediate (loading); relaxes 20 ms / 0.5 s; persistent while active | muscle (body) | ECCENTRIC review; §7.1 | C's relaxation (20 ms / 0.5 s) is **stretch-induced force decay**. τc is **command-driven force development**. Different phenomena and different inputs. Persistence now ends at zero force (BC2) |
| **B**, passive elasticity | parallel connective tissue | immediate; activation-independent | body | PPR-2 literature | Not activation-dependent, so no overlap with short-range stiffness (active) |
| Damping D = 2ζ√(K·I) | intrinsic viscosity of active muscle and tissue | immediate | body | PPR-3 S2 | Scales with K(f). It is not a lag, so no latency overlap |
| Minimum-effort statics (A2) | the rest equilibrium the excitation holds | — | feed-forward law | PPR-3 | Unchanged |
| Short-range caps R± | elastic limit of short-range stiffness (θ_y) and the eccentric plateau | immediate | muscle | PPR-1 / PPR-2 | (a) above: one reserve, not force–velocity plus strain on top |
| **15 / 50 ms activation** | Ca²⁺ excitation–contraction coupling | delays force | muscle | [MODEL] Thelen | τc is the **remainder**, derived *given* 15 / 50 ms. The latency is the cascade, counted once |
| **f, contraction lag (new)** | tendon take-up + CE force–velocity + recruitment | delays force | muscle (body) | §9, §12 | Must not also appear in P2. P2's channel delays (25–100 ms) are sensing → EMG and contain no EMG → force element (P2 design §3). A future controller must not add its own torque filter |
| P2's delays | neural transport, sensing → EMG | delays the command | controller | POSTURAL_TIMING review | Distinct from muscle dynamics (above) |
| V2 force–velocity one-tick lag | spec (one-tick velocity) | one tick | body (spec) | V2 §14 | Partly covered by (a): the reserve no longer waits for the tick |

**Stiffness is counted once.** Standing joint stiffness comes from S2's short-range constants on developed force (at rest f = a, so it equals S2) plus B. M1 adds no new stiffness term. B1 checks M1 / V2ACT ∈ [0.95, 1.10].

## 7. What controllers should command (design position; the evidence decides in the report)

| Option | Assessment |
|---|---|
| **Desired physical torque** | **Rejected.** It is CURRENT V2's path and bypasses force development (audit §2) |
| **Activation a** | Rejected. It would skip Ca²⁺ dynamics, and the controller could set a step in a |
| **Excitation u± per muscle group** | Physiological, and cannot bypass the body |
| **Net-torque intent inverted to u± by the body** (S2's `solveFloors` at the character's own fixed entry capacities, with tone floors) | Convenient for controllers. Still cannot bypass a → f |

The body, not the controller, owns a and f. Both are character state, part of the snapshot and hash.
