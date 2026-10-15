# HAC-1 log: the night mission, in order

**Instruction:** `sources/2026-10-15_user_instruction_night_mission_hybrid_active_physics_character_v1.md` (≈ 04:15 BST; saved at `d0497c5`).

**Frozen throughout:**
- **Not modified:** RUN-1 (archive only), V1, C3, M1b, ball physics, PVP-1 / PVP-1A, SP2F2, SP2F3 and HYBRID-RUN-1.
- **Not done:** no tendon or gait generator; no friction calibration.

**Code:** `hac1/scripts/`.
- Every candidate below is still reachable through `HacRunner` options.
- Defaults are the final candidate.
- Nothing has been removed.

**Records:** in scratch while working; the final battery is preserved outside Git (`_preserved_2026-10-15_evidence_outside_git/hac1/`).

## 1. Audit of HYBRID-RUN-1's angular support

There are three non-physical angular sources:
1. **The animation-consistency moment:** external, ≤ 450 N·m, present in flight too.
2. **The supported moment:** also an external torque, bounded by 0.4 m × F_y.
3. **The gait-support pair:** −F at the foot and +F spread over every body by mass. The lines of action differ, so the pair carries a hidden moment (r_com − r_foot) × F: a virtual pivot at the COM. This also makes foot placement irrelevant to balance, which explains HYBRID-RUN-1's null foot-placement result.

## 2. Fully physical candidates (`support.mode: "jt"`): forces only through joints and contact

| # | Candidate | Result |
|---|---|---|
| 1 | Stance-leg Jacobian-transpose support τ = −(p − c_j) × F; ground reaction F = central part (foot → COM) + an attitude part ⊥ to it; yaw from foot friction; placement on; viability on | NC falls 0.5 s. Viability read "infeasible" from 0.1 s and switched the support off. |
| 2 | Viability off | Falls 1.15 s. **The commanded ground reaction is realised** (per-step comparison). |
| 3 | Full free-leg aiming (RUN-1's thigh in the world) | Falls 0.98 s: the swing hip lags 35° (a pelvis / swing-hip feedback loop). |
| 4 | **Diagnosis: pelvis yaw +3 → +68° by 0.37 s.** RUN-1's finite-difference entry carries a yaw angular momentum of −3.37 kg·m²/s; its stride average is +0.13. | **`hac_entry.mjs`:** remove one rigid rotation so the entry carries the stride-average angular momentum. The initial spin is gone. |
| 5 | Aiming off + the consistent entry | ≈ 0.9 s; yaw drifts −25 / −50 / −68° stride by stride. |
| 6 | Yaw-only aiming | Worse (falls 0.75 s). |
| 7 | SIMBICON compensation: previous-step free-hip and lumbar torques through the stance chain | Worse: the stance leg is overloaded. |
| 8 | Stance hip targets RUN-1's world pelvis relative to the planted thigh | Yaw held (≤ 5°). Pitch error grows; an early touchdown gets zero support. |
| 9 | Half-sine vertical stance template | The body sinks 4.5 cm; the swing toe catches (trip). |
| 10 | "Shape" law: RUN-1's stance profile from the PHYSICAL touchdown, offset to the touchdown height | Pitch held ≈ 5–8°; runs 1.4 s; yaw oscillation grows. |
| 11 | Yaw servo variants; stance-hip rotation stiffness 0.05 – 1 | None stable. |
| 12 | **Ground-limited support-moment pair** (+M pelvis / −M stance foot; pitch ≤ 0.10 F_y, roll ≤ 0.04 F_y, yaw ≤ μ F_y 0.07) | Yaw bounded at ±14°. Pitch fails after ≈ 1 s; speed drifts 4.4 → 5.5 m/s. |
| 13 | Speed regulation (Raibert forward gain 0.25; tangential 2 – 8 /s) | No help. A braking ground reaction pitches the body forward. |
| 14 | Placement repairs: commitment had silently disabled placement; cross-over measured from RUN-1's own line | Feasibility q 0.02 – 0.3 in NC; still falls 1.3 – 1.7 s. |
| 15 | Explicit capped moment (ICM) 100 / 200 / 300 N·m, stance-only or always | Falls 1.4 – 1.9 s. The moment is not the only gap. |
| 16 | Time-warped stance profile (touchdown → RUN-1's toe-off) | Falls 1.12 s. **Stance audit:** stance 2 commanded 306 N·s, delivered 162. The ankle inversion axis (κ·T_iso = 79 N·m) saturates at −54° under the lateral ground reaction of a step landed 10 cm wide; the touchdown came 45 ms early. |
| 17 | SLIP virtual leg: central pair foot ↔ hip | Falls 0.8 s. |

**Stop.** A RUN-1 body supported only through joints and contact needs a balance controller of the SIMBICON class. That means:
- swing placement in the world frame with feedback;
- stance-hip attitude with swing compensation;
- phase handling;
- ankle strategy.

Or the intent must be made angular-momentum consistent. Building either is physics-generated locomotion, so I stopped (instruction §14 / §26).

## 3. Working base: HYBRID-RUN-1's support × locomotion weight (`support.mode: "pair"`)

- **Stability:** NC is stable with placement off.
- **Placement gain:** the full capture-point gain (1/ω0 ≈ 0.31 s) destabilises normal running (falls 1.43 – 1.65 s). The pair already regulates lateral velocity, so placement double-counts it. The **lateral gain is 0.15 s (tuned)**; the forward gain is 0.

## 4. Viability, support integrity, recovery: calibration history

**Integrity:**
- The first version (slip from the foot body's velocity, displacement of the contact centroid) killed NC. A rolling foot "slips", and the centroid travels heel → toe.
- Fixed by:
  - the slip of the foot's material point at the contact;
  - the displacement of the foot body;
  - only in the planted 75 % of RUN-1's stance, settled ≥ 20 ms after touchdown.
- **Measured healthy stance:** slip ≤ 0.5 m/s, displacement ≤ 0.13 m.

**Lost support:**
- The first emergency step fired in every flight phase.
- Now it fires only when RUN-1 expects a stance that was planted and then lost, or missed by more than 60 ms.

**Rejected; each broke the undisturbed run:**
- touchdown-aligned vertical support in pair mode (always; off-schedule only);
- a loaded-leg floor (≥ 1 BW when descending);
- phase resynchronisation (catch-up on early touchdowns): breaks NC alone, neutral with the clearance response;
- disturbance-scaled lateral placement gain: regressed BRUSH.

**Kept:**
- **Swing-foot clearance response:** the aggressive version (400 °/m) broke NC late; the gentle version (200 °/m, 3 cm, ≤ 20°) is kept.
- **Locomotion weight = 1 − C:** previously min(1 − C, s(V)). A transient viability dip used to weaken the support itself, a positive feedback. This changed several outcomes.

## 5. Fixtures

**SH (HYBRID-RUN-1's):**
- B straightens onto a lane 0.42 m from A.
- The "bump" is a 0.5 s shove, with leg interference.

**SH2:**
- First version: a 0.42 m lane plus a 3° divergence.
- Second version: a 0.50 m lane.
- Both still shove, and B falls.

**Key finding: B falls alone.**
- **The finding:** B's intent alone, with no A and no contact, falls in every severity: HAC-1 at 1.2 – 2.9 s, HYBRID-RUN-1's runner at 2.90 / 2.10 / 1.58 s.
- **Control:** straight runs from any RUN-1 start frame and any fixed heading never fall. A turn spread over 0.3 – 1.5 s falls (non-monotonically).
- **Cause:** RUN-1 cannot execute a turn.

**SH3** (straight lanes; a lateral shoulder-charge pulse in B's intent):
- B's lateral tracking is too slow to reach A, and B falls from its own sidestep.

**PUSH** (the push-recovery protocol):
- A alone receives a lateral impulse of 30 / 60 / 100 N·s on the upper arm over 0.1 s at 0.75 s, from the right or the left.
- This is the shoulder-type fixture used for the verdicts.

## 6. Tackle phases

The same frozen tackle meets the struck right foot at three points of its stance (landing step 108 / 88 / 72 against contact 119 / 120 / 119): EARLY 20 %, CANON 59 %, UNLOAD 87%.

| Phase | Struck foot | Outcome |
|---|---|---|
| EARLY | Not swept: it stays planted (≈ 1.4 – 2 BW × friction 1.2) | The recipient runs on ≈ 0.5 s, falls ≈ 1 s later. |
| CANON | Carried sideways; far-foot stumble step at +104 ms (twin +213 ms) | Forward fall at +0.68 / +0.70 s. |
| UNLOAD | Carried off as it leaves | Recovers. |

The struck foot unloads on the twin's schedule in all three phases.

## 7. Protect

- **First pose:** hips 40°, knees 60°. It ended in a hands-and-knees crawl.
- **Revised:** hips 15°, knees 20°, ankles −10°; arms flex 40 + 40·(forward), elbows 25°.

## 8. Final battery (`evidence/HAC1_expectations.json`; 783 steps; every scene run twice, deterministic)

| Scene | Hash | Fall A | Fall B |
|---|---|---|---|
| NC | `c251f503` | — | — |
| PVP_TWIN | `efaf697a` | — | — |
| PVP_TWIN_EARLY | `1e87727b` | — | — |
| PVP_TWIN_UNLOAD | `666d7f7e` | — | — |
| PUSH_BRUSH | `7969e2d3` | — | — |
| PUSH_BUMP | `6c87078a` | — | — |
| PUSH_STRONG | `8ce4a8ea` | step 429 | — |
| PUSH_BRUSH_OPP | `5f14bd91` | — | — |
| PUSH_BUMP_OPP | `8b886d5e` | — | — |
| PUSH_STRONG_OPP | `d143c5d8` | step 616 | — |
| SH_BRUSH | `8703084c` | — | — |
| SH_BUMP | `98100057` | 386 | — |
| SH_STRONG | `2856af5d` | 408 | 281 |
| SH2_BRUSH | `47287727` | — | 447 |
| SH2_BUMP | `8b06fcae` | 354 | 291 |
| SH2_STRONG | `7bf5dff7` | 340 | 262 |
| PVP_F2 | `6a2c601b` | 282 | n/a |
| PVP_F3 | `fc4f3d47` | 288 | n/a |
| PVP_F2_EARLY | `7cfdbc17` | 356 | n/a |
| PVP_F3_EARLY | `dc7d7113` | 388 | n/a |
| PVP_F2_UNLOAD | `8846d47b` | — | n/a |
| PVP_F3_UNLOAD | `2c679481` | — | n/a |
