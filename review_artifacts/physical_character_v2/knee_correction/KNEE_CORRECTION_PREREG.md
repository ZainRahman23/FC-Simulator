# Corrected knee (`v2k`): preregistered qualification battery

**Status:**
- **PREREGISTERED** before the corrected knee is implemented or any validation is run.
- Committed together with `KNEE_PARAMETERIZATION.md`. Criteria are not changed after results.
- A defect found in a criterion is recorded as an erratum next to the frozen text.

**Source:** `../sources/2026-10-04_user_instruction_knee_correction_before_e1a.md`. The minimum validation list there maps to KV1–KV10 below.

## 0. Rules

1. **Parameters are frozen** at `KNEE_PARAMETERIZATION.md` §3–§5 (central values).
   - A validation result may expose an **implementation bug**. Fixing it and re-running is allowed and recorded.
   - It may not change a parameter. If a result shows that a parameter is physically inconsistent, I **stop and report** (a decision for you).
2. **Development smoke checks** during implementation (sign / readback sanity) are allowed and listed in the results. **Official results come only from the frozen code** (commit recorded), run after this file is committed.
3. **No criterion uses "the character stays upright"** as evidence for the knee mechanics. Gate regressions (KV9) are a separate, later layer.
4. **Code is frozen before every batch**, and nothing is edited while a batch runs (lesson FP-14).
5. **The flag is default off.** Flag-off bit-identity (KV0) is required after every code change.
6. **Deep flexion (> 120°) stays outside the certified envelope** whatever KV9 / KVS show.

## 1. Tools (to be written; listed so the battery is fixed now)

| tool | purpose |
|---|---|
| `tools/knee_v2k_bench.mjs` | kinematic (no stepping): conventions, readback, law, power / cycle integrals, limit enclosure |
| `tools/knee_v2k_rig.mjs` | Jolt rig: thigh kinematic, gravity 0, every body but the tested shank / foot as in the G1 passive rig, knee flexion actuator for flexion holds / cycles, axial actuator off, external axial torque on the shank. Ledgers: passive (drive impulse / dt on the 3 constraint axes + explicit remainder) · relative ω; actuator (λ / dt) · relative ω; external · shank ω; viscous loss (`dampingLoss`); KE; U |
| `tools/knee_v2k_ctrl.mjs` | full character: E1a pelvis-drop test (KV6c) |
| `tools/yaw_decomp.mjs` | whole-leg yaw decomposition (KV10) |
| existing gate runners | G0–G3 with `V2_KNEE_MODEL=v2k`, scratch evidence trees |

## 2. Criteria

**KV0: flag-off identity.**
- `scratchpad/b/hashcmp.mjs` against `hash_head.txt` (4 G3 runs): identical.
- Component suite: all pass, including the new v2k unit regressions.

**KV1: anatomical conventions and L/R mirroring** (bench). Both knees; φ ∈ {−5, 0, 5, 10, 15, 20, 25, 30, 35, 40, 60, 90, 120, 146, 155}°; θ ∈ θ0(φ) ± {0, 0.5, 1, 2, 5, 10, 14, 20, 25, 28}°.

| part | check | tolerance |
|---|---|---|
| a | pose built from anatomical (φ, θ) with the spec parameterisation reads back through `PassiveLayer.anat` | ≤ 1e-6° |
| b | the layer's knee-axial soft / hard (converted to anatomical) equal `kneeEnvelopeV2K(φ)` | ≤ 1e-6° |
| c | the anatomical axial law torque is ≤ 0 above θ0 + s·f, ≥ 0 below θ0 − s·f, and \|τ\| ≤ 1e-9 inside | — |
| d | mirror: \|τ_L − τ_R\| (anatomical) | ≤ 1e-6 N·m |
| d | mirror: \|U_L − U_R\| | ≤ 1e-9 J |
| e | the layer's axial generalised torque vs the independent spec-law function `kneeAxialTorque` | ≤ 1e-4 N·m + 0.1 % |

**KV2: generalised / spatial power consistency.**
- **a (bench):** 20 random smooth paths per knee (φ ∈ [−5, 150]°, θ within θ0 ± 30°, end-stop penetration included; 2000 steps). |Σ τ·Δq + ΔU| ≤ 1e-3 J + 0.5 % of Σ|τ·Δq|. Here τ is the layer's generalised torque on all three rows and Δq the body-2 rotation increment.
- **b (rig, every KV3b / KV4b / KV7b run):** passive work vs −ΔU − D_visc: |W_pas + ΔU + D| ≤ 0.02 J + 2 % of ∫|P_pas| dt.

**KV3: closed flexion–axial energy cycles.**
- **a (bench):** rectangles and ellipses in (φ, θ): 0–40° × θ0 ± {5, 15, 28}°, and 0–150° × the same. |∮ τ·dq| ≤ 1e-3 J + 0.5 % of ∮|τ·dq|.
  - Report-only counterexample: the naive variant (axial torque only, no flexion reaction).
- **b (rig):** flexion driven by the knee flexion actuator along 0 → 30 → 0° and 0 → 120 → 0° (period 2 s, 5 cycles). Axial actuator off. External axial torque ∈ {0, +5, −5} N·m. Per cycle 2–5:
  - net elastic passive work |W_el| ≤ 0.02 J + 1 % of ∮|P_el|;
  - ledger |ΔE − W_ext − W_act + D| ≤ 0.05 J;
  - axial excursion amplitude growth ≤ 5 % cycle to cycle.

**KV4: low-flexion torque–rotation.**
- **a (bench):** φ ∈ {0, 5, …, 40}° (60, 90, 120 reported); per side at 2.5 / 5 / 10 / 15 N·m (78 kg).
  - Every in vivo point of `KNEE_PARAMETERIZATION.md` §3 within |z| ≤ 1.5.
  - Strictly increasing in torque.
  - Adjacent-grid (5°) change ≤ 2.5°.
- **b (rig):** φ ∈ {0, 10, 20, 30, 40, 90}°, knee_R (knee_L at 20°). Flexion held by the flexion actuator. External axial torque steps 0 → ±2.5 → ±5 → ±10 N·m, 2 s each.
  - Static rotation (mean of the last 0.5 s) vs the bench law at the held flexion: within max(0.3°, 3 %).
  - Held flexion within 1.5° of target.

**KV5: passive vs actuator work.** Reported for every rig and KV6c run: W_el (= −ΔU), W_visc (= −D), W_act per row, W_ext. Criteria:
- the KV3b elastic-work bound;
- the KV3b ledger closure, i.e. the actuator covers exactly the dissipation plus the change in stored energy;
- the knee axial actuator's work in KV6c is reported separately from the passive work.

**KV6: reference path through the E1a knee-angle envelope** (0–40°).
- **a (bench):** the zero-torque interval at each φ ∈ [−5, 40]° (1° steps) = [θ0 − s·f_ER, θ0 + s·f_IR], within 1e-6°.
- **b (rig):** flexion 0 → 40 → 0° quasi-static (8 s period). Axial free: actuator off, no external torque, gravity 0.
  - |θ − θ0(φ)| ≤ s·f + 1.0° after 0.5 s.
  - Axial change over 0 → 30° flexion = 8.6° ± 1.5°.
- **c (full character, G3 controller + `v2k`; V2-REF, V2-165-62, V2-198-92; policy ∈ {current, reference}; k ∈ {0, 0.13}):** the E1a pelvis drop (0 → −2.5 cm min-jerk 2 s, hold 2 s, back 2 s), bilateral.
  - No fall.
  - Stance-foot slip ≤ 0.5 mm.
  - Knee flexion range reported.
  - Reference policy: |θ_knee − θ0(φ_knee)| ≤ 2.0° throughout.
  - Current policy: knee axial inside the calibrated-range bound.

**KV7: joint limits and the emergency limit.**
- **a (bench):** φ ∈ [−5, 155]° (0.5° steps), both knees, constraint space. The Jolt stop lies ≥ 10° beyond the bound + 3° on each side.
- **b (rig):** external axial torque ramped to ±40 N·m (2 s) and held 1 s, at φ ∈ {0, 30, 90}°.
  - The static rotation at the capacity torque lies at bound + 3° ± 0.75°.
  - No Jolt-stop contact (margin ≥ 0.25° every tick).
  - Ledger closure ≤ 0.05 J per hold.
- **c (from the KV9b G1 runs, 240 Hz, both bodies, every scenario):** the largest knee-axial overshoot beyond the bound (per side) × 1.5 + 1° ≤ the bound-to-Jolt-stop distance at that flexion.

**KV8: timestep.** KV3b, KV4b, KV6b and KV7b at 180 / 240 / 480 Hz.
- All their criteria hold at each rate.
- KV4b static rotations agree across rates within 0.3°.

**KV9: G0–G3 regressions** (flag on, scratch evidence trees).

| part | run | criterion |
|---|---|---|
| a | G0 | all rows pass |
| b | G1 full (the accepted runner: V2-REF + V1-matched every scenario, variants' essential scenarios, timestep ensembles, C7), k = 0 | every gating row passes, as accepted. The knee rows that test conformance to the OLD spec are evaluated against the `v2k` spec: (i) the passive joint rig `knee_R rot` vs `kneeAxialTorque`, same tolerances; (ii) the coupling probe's knee row reports the `v2k` envelope instead of "10 % at extension". This is a change of the spec under test, not of a criterion. Both are listed in the results |
| c | G1 perturbed ensembles (V2-REF + V1-matched × the 10 runway scenarios × 15 lift perturbations, plane turf, 240 Hz), k = 0 and k = 0.13 | **acceptable** = failure rate ≤ 8.1 % (the accepted plant's 5.0 % plus its binomial 95 % half-width at n = 300) **and** no scenario failing ≥ 5 / 15. Reported next to the old knee at the same k |
| d | G2 full, k = 0 | every gating row passes, as accepted. k = 0.13 reported |
| e | G3 v3.3 full, k = 0 (G3 defaults) | 15 / 15, as accepted. k = 0.13 reported |
| f | proposed E1a configuration (reference + lifecycle + k = 0.13 + `v2k`): G2 and G3 v3.3 | reported. The pre-existing lifecycle findings (I2, K) are tracked separately as non-knee items |

**KV10: whole-leg yaw decomposition** (diagnostic; the observability requirement).
- **Scenarios:**
  - A: bilateral quiet stance, sustained 2 N·m pelvis yaw torque from 2 to 8 s, then released;
  - B: single support on the lifecycle external-lift harness (30 N, 2.5 cm drop) with a 0.5 N·m·s pelvis yaw impulse while the foot is airborne.
- **Configurations:** knee {old, v2k} × k {0, 0.13} × policy {current, reference}, on V2-REF, V2-165-62 and V2-198-92.
- **Per stance leg, measured contributions to pelvis yaw:**
  - foot world yaw (ground);
  - ankle ab/adduction;
  - knee axial;
  - hip rotation;
  - lumbar + thoracic rotation (upper body).
- **Flags:**
  1. decomposition closure within 0.3°;
  2. **masking flag:** with `v2k`, an element leaves its zero-torque or calibrated range where it did not with the old knee, or ground slip > 0.5 mm / foot yaw > 0.5°;
  3. knee share vs the human budget (≤ about 30 % of leg yaw in ordinary loading; hip largest).

**KVS: sensitivity** (report only).
- **Deep flexion:** δ150 ∈ {−4, +5, +10}, w150 ∈ {0.6, 0.3}. G1 V2-REF + V1-matched "perturb", "awkward", "flatSupine" 15-member ensembles at k = 0.13.
- **Low-flexion band edges:** IR a15 {10, 16}, ER a15 {22.5, 27.5}, ER f0 {0.3, 0.75}, ramp {15, 40}°. KV4a plus KV6c on V2-REF.

## 3. Decision rule

**The corrected knee is QUALIFIED for E1a's low-flexion envelope** if:
- KV0–KV4, KV6, KV7 and KV8 pass;
- KV9 a, b, d and e pass at k = 0, so G0–G3 remain acceptable.

**Reported, but not part of qualification:**
- KV9c and KV9f. KV9c at k = 0.13 is evidence for your ankle-law decision.
- KV10 flags.
- KVS.

**Then:**
- E1a's preregistration is re-frozen (a v2 alongside the frozen v1, which is never edited). The configuration and the remaining open decisions are stated explicitly.
- E1a is **not run** here.
