# V2-G1 pass criteria: pre-registered

This file was written and committed **before** the final G1 gate run. The same values are encoded in `sandbox/visual/physchar2/gates/v2_g1_checks.js` (`TOL`).

## Sources and rules

- Numbers from the approved specification (§22 V2-G1, 1.1–1.7) are used **verbatim**. They are marked **[spec 1.x]**.
- Where the brief (`sources/2026-10-02_user_decision_g0_approved_build_g1.md`) asks for something with no spec number, the criterion is defined here with its rationale. These are marked **[brief §n]**.
- No value was chosen to make a run pass.
- Development runs were made before this file was written, to build and debug the harness. Five definitions were clarified during that work; they are listed under "Clarifications" below. None of them is a spec value.

## Configuration under test

- **Engine:** pinned JoltPhysics.js 1.1.0 / Jolt 5.6.0 wasm-compat, single-threaded, sha256 `011233a5…57de`. It is checked on every run.
- **Physics rate:** 240 Hz × 1 collision step [spec §19].
- **Contact parameters [spec §15.4]:**
  - speculative distance 0.02 m;
  - penetration slop 0.005 m;
  - Baumgarte 0.2;
  - restitution 0;
  - per-sub-shape friction: boot–turf 1.2, hand–turf 0.7, body–turf 0.5, body–body 0.4.
- **Body properties:**
  - linear and angular body damping 0;
  - gravity factor 1;
  - no sleeping;
  - maxAngVel 100 rad/s;
  - gyroscopic force on (G1 defect fix G1-D1, see DECISIONS.md).
- **Velocity iterations:** chosen by the 1.5 study from {10, 15, 20, 30}. If none qualifies, 30 is used as the reference for every other phase, and 1.5 is reported as FAIL.
- **Position iterations:** 2 (the G0 world value).
- **Passive joints [spec §13.1.5, §13.3, §13.2]:**
  - the end-range law τ = A·(e^{B(θ−θs)} − 1), reaching 0.25·T_iso(opposing) at the hard limit, B = 6;
  - the four pose-dependent couplings;
  - viscous damping per joint;
  - all folded into the implicit motor rows;
  - no muscle activation, no targets toward any posture.

## Scenarios (fixed list)

| key | what it tests |
|---|---|
| upright | quiet upright release, boots on the turf |
| leanF / leanB | 5° forward / backward lean about the ankle line |
| leanL / leanR | 5° lateral lean, mirror pair |
| perturb | quiet stance with a modest whole-body angular velocity |
| singleLeg | single-support release |
| dropA / sideFirst / shoulderFirst / rotating / awkward | V1 Gate A A–E, re-authored in V2 anatomical angles |
| flatSupine | flat supine drop from 0.5 m with a roll |
| drop1m | feet-first drop from 1.0 m |
| impact15 | 15 m/s body into the turf |
| isoMomentum | gravity off, no contact, end-range release plus a tumble |
| isoSelfCol | gravity off, leg-into-leg and arm-into-trunk at football speed |

- **Run lengths:** falls 7 s (rest window: the final 0.5 s), impact15 2 s, isolated 2 s.
- **Bodies:** V2-REF and V1-matched run every scenario [spec §22]. V2-165-62, V2-198-92, V2-long-legs and V2-short-legs run the ten "essential" scenarios [brief §6]. No per-body tuning.

## Criteria

| id | criterion | pass | source |
|---|---|---|---|
| 1.F | finite state, no explosion | no NaN / Inf; no body faster than 25 m/s | [brief §2] |
| 1.2a | net mechanical-energy increase per step (E = KE + PE + passive elastic energy U) | ≤ 0.5 J | [spec 1.2] |
| 1.2b | E non-increasing after first contact | ≤ 0.5 J above the running minimum | [spec 1.2] |
| 1.2c | contact-free steps: ΔE + damping loss (no unexplained gain) | ≤ +0.01 J per step. Losses (numerical dissipation) are reported. | [brief §4] |
| 1.2d | contact-free steps: COM acceleration = (0, −g, 0); isolated: ΔP = 0 | ≤ 0.01 m/s² | [brief §3] |
| 1.3a / 1.3c | joint separation (transient / at rest) | ≤ 5 mm / ≤ 1 mm | [spec 1.3] |
| 1.3b / 1.3d | hard-limit excursion (transient / at rest) | ≤ 3° / ≤ 0.5° | [spec 1.3] |
| 1.3e | frame continuity: per-tick joint rotation | ≤ 2 × 100 rad/s × dt (47.7° at 240 Hz) | [brief §2] |
| 1.3f | hard-limit chatter | ≤ 10 on/off toggles in any 0.5 s | [brief §2] |
| 1.4a / 1.4b | turf penetration (exact collider geometry; transient / at rest) | ≤ 10 mm / ≤ 3 mm | [spec 1.4] |
| 1.4d / 1.4e | self-penetration between allowed pairs (transient / at rest) | ≤ 10 mm / "0" read as ≤ 0.1 mm | [spec 1.4] |
| 1.4c | disabled pairs never in contact | 0 manifolds | [brief §3] |
| 1.4f | standing releases (unrotated): at t = 0 only boot soles touch, inside the plantar outline, on the sole plane, normal +Y | 0 non-boot / ≤ 2 mm / ≤ 2 mm / ≤ 2° | [brief §3] |
| 1.4g | first touch for a 15 m/s body | ≤ 3 mm | [spec 1.4] |
| 1.4h | isoSelfCol: leg ↔ leg and arm ↔ trunk contacts occur, no pass-through | ≥ 1 each | [brief §3] |
| 1.R | the passive body comes to rest; no jitter at rest | KE ≤ 0.1 J, joint ω RMS ≤ 0.05 rad/s (final 0.5 s) | [brief / spec 1.2] |
| 1.1a / 1.1b | isoMomentum: linear / angular momentum constant over 2 s | ≤ 1e-6 relative | [spec 1.1] |
| 5.a | passive rig: applied torque at release = spec law − c·ω | ≤ max(0.1 N·m, 2 %) | [brief §5] |
| 5.b | passive rig: restoring sign; returns into the soft range | true / true | [brief §5] |
| 5.c | passive rig: tracks the spec law through the motion | ≤ 10 % of that end's τ at the hard limit | [brief §5] |
| 5.d | passive rig: never injects energy (no self-contact) | ≤ 1e-6 J per step | [brief §5] |
| 5c | couplings (soft-limit shifts, cross-torque signs) as specified | ±0.1° | [spec §13.2] |
| 1.5 | min of 10/15/20/30 velocity iterations passing every 1.2–1.4 criterion with 2× margin (≤ 50 % of tolerance) | one exists | [spec 1.5] |
| 1.6a | ×3 runs across two processes: identical per-tick hash, contact sequence, joint extrema, fall timing | all scenarios | [spec 1.6] |
| 1.6b | Jolt SaveState / RestoreState mid-run: bit-exact with the from-scratch run | all tested | [spec 1.6] |
| 1.6c | browser = Node, curated scenarios (headless Chrome, same code path) | identical hashes | [spec 1.6] |
| 8 | timestep 180 / 240 / 360 / 720 Hz: integrity checks pass at every rate, same posture and first non-foot contact as 720 Hz, fall timing ≤ 25 ms, final COM ≤ 0.15 m from 720 Hz | all | [brief §8] |
| 1.7 | V1 Gate A A–E side by side | report only | [spec 1.7] |
| 9 | performance per player per tick | report only (diagnostic) | [brief §9] |

**Relative momentum** is |ΔP| / max Σᵢ mᵢ|vᵢ| and |ΔL| / max Σᵢ |Lᵢ| (about the COM), over the run.

**Turf penetration** is measured from the exact collider geometry: capsules, spheres, rounded boxes with their convex radius, and the boot hull's raw points (the hull's 5 mm rounding makes this conservative). Jolt's own manifold depth is reported alongside.

## Clarifications made while building the harness (before this file; none is a spec value)

1. **Self-penetration "0 at rest".** A manifold depth is a float: "0" is read as ≤ 0.1 mm.
2. **Contact-free energy.** Only a gain is a failure. Every measured contact-free residual was a loss: numerical dissipation of the implicit drive and release transients.
3. **Frame continuity** is bounded by the physical cap (two bodies at 100 rad/s), not a fixed angle. A real forearm pronation spin reached 95 rad/s.
4. **The sole check** applies only to unrotated standing releases. A deliberately tilted boot touches with its edge by construction.
5. **Rig tracking** uses one rule for every rig test: 10 % of τ at the hard limit.

## What the result means

- **PASS** requires every gate check.
- **Diagnostic remedies** (`gates/v2_g1_dx.js`) are measured to inform decisions. They are **not adopted** and do not count toward the gate.
