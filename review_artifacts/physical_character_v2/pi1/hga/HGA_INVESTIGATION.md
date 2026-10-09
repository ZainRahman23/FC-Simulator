# HG-A and the promotion momentum definition: read-only investigation

**Authority:** `../../sources/2026-10-09_user_instruction_hga_momentum_investigation.md` (b13cafd).

**Scope.** Investigation only. Nothing was changed: the animation, V2 / F0 / F1, V1.3, Jolt, the 30 / 10 mm limits, outcomes and every REV2 gate are as they were. There is no compatibility amendment and no Revision 3.

**What was run.**
- **Kinematic analyses**, using the exact REV2 mapping and initial-velocity construction (frozen R-K knee + RF-1; PI-1 §6.2 2nd-order backward difference).
- **One diagnostic count** (item 6) of a replacement proposal, frozen before it was applied (`HGA_V2_PROPOSAL.md`, 192816b).

## 1. What HG-A was protecting

**History:**

| step | commit | what it says |
|---|---|---|
| PI-1 prereg §6.2 | 6ef7e1e | Initial velocities = the presentation's (2nd-order backward difference). "**Nothing is shifted toward the authoritative root velocity.** The whole-body COM velocity, linear and angular momentum vs the authoritative root velocity are recorded" (recorded, not gated). Visible continuity is PR-2: 3 mm per rig joint over the first frame. |
| COMPAT gate §3 | ab9a626 | "whole-body COM velocity ≤ 0.05 m/s", basis "—": a mapping-fidelity tolerance, physical vs presentation |
| Track B A2 / REV1 TR-3 | 6802742 / c437d0c | P-16 = V2 COM velocity vs the presentation's material points ≤ 0.05 m/s, filed under "no meaningful promotion impulse" / "no injected momentum" |
| user, REV2 | 7f76e82 | "initialized from the currently visible presentation pose **plus the authoritative simulation linear/angular motion**, within frozen mapping/continuity tolerances"; "velocity/momentum continuity"; report "initial physical momentum error"; in a fall "preserve the body's actual physical momentum" |
| REV2 prereg §2 | f8cd44a | My operationalisation: **HG-A** = \|v_COM,h(mapped presentation) − v_auth,h\| ≤ 0.05 m/s. The residual is removed by one uniform horizontal shift, never more than 0.05 m/s. The 0.05 was taken from P-16. |

**What it prevents:**

| candidate purpose | HG-A? | why |
|---|---|---|
| **incorrect total linear momentum** (vs the authoritative footballer) | **yes: the primary purpose** | The promoted body must enter the interaction with the momentum the simulation decided with. Without the shift it carries M·\|v_COM − v_auth\|, which is **6.5 – 89.5 N·s (median 37.7)** on the 48 HG-A-only frames. That is the same order as the contact impulses: the physical first contacts in REV2 were 3.3 – 17 N·s, and the decisive gameplay J were 49 – 76 N·s. |
| **visible velocity pop** | **yes, secondarily** | It achieves the momentum by capping the correction at 0.05 m/s. That cap is a mapping-fidelity number (P-16), **not** a visibility number. |
| incorrect angular momentum | no | A uniform shift leaves the angular momentum about the COM unchanged exactly. P-17 guards the mapping. |
| physical-body trajectory discontinuity | indirectly | Positions are untouched (P-1 … P-8). A momentum error becomes a COM drift away from the authoritative root of \|Δv\|·t (0.4 m/s → 40 mm per 0.1 s), which B then has to absorb. |

**Disclosure.** The user's REV2 text said "linear/angular motion". REV2 §1 wrote only "plus the authoritative linear motion". No authoritative angular quantity was assigned (the only candidate is the facing rate, 0 in these straight runs).

## 2. Decomposition of the presentation's motion

**Inputs.** 22 moving candidates, 1,166 frames: each candidate's trigger − 45 through the window end + 1, which covers one or more gait cycles. Per-frame data is in `evidence/decompose_{rx,def}.json`, the statistics in `evidence/summary.txt`, the tables in `evidence/representative_tables.md`.

**Decomposition.** v_i = v_auth + u_i (u_i = the articulated / internal velocity); P_int = Σ m_i u_i = M (v_COM − v_auth). **M = 73.91 kg.**

| quantity (moving frames) | median | p90 | max |
|---|---|---|---|
| pelvis-origin − root, horizontal | 0 mm | 0 mm | 0 mm (the pelvis **is** the root) |
| COM − root, horizontal offset | 39 mm | 56 mm | 71 mm |
| frame-to-frame change of that offset | 4.0 mm | 9.1 mm | 18.4 mm |
| \|v_COM − v_auth\|_h (HG-A), stance / flight | 0.29 / 0.36 m/s | 0.78 / 0.72 | 1.51 / 2.47 |
| internal horizontal momentum \|P_int,h\| | 22 – 27 N·s | 54 – 57 | 183 |
| \|v_COM,y\| (vertical) | 1.58 m/s | 4.01 | 10.08 |
| \|L about COM\| | 17.9 kg·m²/s | 38.3 | 93.7 |
| internal kinetic energy | 122 J | 363 | 1,091 |
| sole speed of a foot the presentation flags in contact | 0.60 m/s | 7.0 | 20.1 |

**Example frames (one before / at / after):**

| frame | support | v_COM (x, y, z) m/s | HG-A | \|L\| | feet: flag, sole speed m/s |
|---|---|---|---|---|---|
| rx_planted_leg 44* | flight | 3.18, −1.18, 0.03 | 0.186 | 11.9 | L 0 6.05, R 0 3.42 |
| rx_planted_leg 45* | flight | 2.58, −4.00, 0.00 | 0.416 | 20.0 | L 0 1.93, R 0 1.48 |
| rx_planted_leg 46 | stance | 2.68, −1.75, 0.02 | 0.325 | 17.9 | L 1 0.88, R 0 0.64 |
| rx_airborne 59 | flight | 7.44, 1.31, −0.04 | 0.072 | 10.8 | L 0 12.73, R 0 2.17 |
| rx_airborne 60* | flight | 6.85, 0.13, 0.07 | 0.650 | 41.7 | L 0 14.80, R 0 5.62 |
| rx_airborne 61 | flight | 7.47, 0.87, 0.04 | 0.044 | 19.5 | L 0 16.29, R 0 4.45 |

\* = an HG-A-only frame. v_auth = 3.00 / 7.50 m/s along x; the pelvis is at 3.00 / 7.5 ± 0.05.

### Is the presentation's whole-body motion physical?

**No, frame to frame. Yes, on average.**

**Over complete gait cycles** (20 cycles in 14 candidates), the presentation's mean COM velocity equals the authoritative velocity within **0.0002 – 0.015 m/s**. So the presentation agrees with the simulation about locomotion.

**Frame to frame, it violates conservation laws.** In frames where no foot is flagged in contact for three consecutive frames ("flight"), only gravity acts, so:
- **horizontal momentum should be constant.** The implied horizontal external force is **0.71 BW median** (p90 3.6, max 22 BW).
- **vertical acceleration should be −g.** The implied vertical force is −4.7 BW median (range −32 … +43 BW) instead of 0.
- **angular momentum about the COM should be constant.** The implied torque is **871 N·m median** (p90 3,155).

**Where it comes from:**
- **The raw rig pelvis height jumps up to 72 mm in one frame** (rx_sprint k 55, 66).
- **The limbs** (knees, ankles, elbows) jump tens of millimetres frame to frame.
- **Not the estimator or RF-1.** The non-causal central difference still gives HG-A median 0.17 m/s (2nd-order backward: 0.29 – 0.36). Disabling RF-1 changes nothing (REV2 `diagnostics/hga_rf1_vs_plain.txt`).

**So the 2.2 – 4.0 m/s is not a legitimate gait oscillation.** It is articulated motion with frame-level jitter no physical gait could produce. The standing candidates are exactly static: every quantity is 0.

**The 48 HG-A-only frames** (49 when every window frame is evaluated: rx_side_standing k 56 lies below its REV2 k_p): **45 of 48 are presentation flight frames.**

## 3. The momentum-preserving initialization (diagnostic)

**C:** v_i = v_auth + (v_i − v_COM); ω_i and positions unchanged.
- Σ m_i (v_i − v_COM) = 0, so the total momentum = M·v_auth.
- The velocities relative to the COM are unchanged, so the angular momentum about the COM is preserved **exactly**: a uniform shift cannot change it.
- It is one write at the handoff, with no ongoing force.

**Two forms:**
- **Ch (horizontal only):** v_auth is planar and the simulation owns no vertical state. **This is exactly REV2's declared-shift construction without the 0.05 cap.**
- **C3 (literal, 3-D):** it also removes the presentation's vertical COM velocity.

## 4. A / B / C compared

- **A** = the REV2 velocities without the shift.
- **B** = every body at v_auth, ω = 0.

### Over the 48 HG-A-only frames

| measure | A (REV2, no shift) | B (all = v_auth) | **Ch** | C3 |
|---|---|---|---|---|
| COM position discontinuity | 0 | 0 | 0 | 0 |
| **ΔP_h vs the authoritative footballer** (N·s) | **6.5 – 89.5 (med 37.7)** | 0 | **0 (≤ 1e-15)** | 0 |
| vertical ΔP vs the presentation (N·s) | 0 | 5 – 493 | 0 | 5 – 493 |
| **ΔL about COM** (relative) | 0 | **1.00 (all lost)** | **0** | 0 |
| max segment \|Δv\| / \|Δω\| (m/s / rad/s) | 0 / 0 | 2.0 – 14.1 / 5.6 – 36.4 | **0.09 – 1.21 (= \|s\|, uniform) / 0** | 0.6 – 6.7 / 0 |
| contact-flagged foot sole speed (3 frames) (m/s) | 0.10 – 0.51 (the presentation's own) | 2.6 – 3.0 | 0.43 – 0.68 | 0.43 – 0.68 |
| pelvis − v_auth (m/s) | 0.03 – 0.20 | 0 | **0.14 – 1.20** (the pelvis leaves the root by \|s\|) | 0.14 – 1.20 |
| visible one-frame discontinuity vs the last presented frame, worst joint (mm) | **5 – 105 (med 39)** | 25 – 182 (med 94) | **8 – 87 (med 36)** | 14 – 92 (med 53) |
| the presentation's own one-frame change, worst joint (mm) | 11 – 188 (med 61) | | | |
| ΔKE vs the presentation (J) | 0 | −1,841 … +34 | −517 … +434 | −1,574 … +348 |
| ΔKE vs the reference (½ M v_auth² + ½ M v_COM,y² + KE_int, presentation) (J) | −434 … +517 | −2,167 … −30 | **0** | −1,647 … 0 |
| deterministic reconstruction | identical, 26 / 26 | ← | ← | ← |

### Representative frames

| frame | init | \|s\| m/s | ΔP_h N·s | ΔL | seg Δv | pelvis − auth | vis mm | ΔKE J |
|---|---|---|---|---|---|---|---|---|
| rx_miss 57 (stance) | A / B / Ch | — / — / 0.20 | 14.9 / 0 / 0 | 0 / 1 / 0 | 0 / 2.48 / 0.20 | 0.05 / 0 / 0.17 | 18.0 / 50.0 / 20.6 | 0 / 4 / 35 |
| rx_planted_leg 45 (flight) | A / B / Ch | — / — / 0.42 | 30.8 / 0 / 0 | 0 / 1 / 0 | 0 / 4.67 / 0.42 | 0.05 / 0 / 0.41 | 30.7 / 59.8 / 26.8 | 0 / −546 / 86 |
| rx_glancing 64 (flight) | A / B / Ch | — / — / 0.51 | 37.7 / 0 / 0 | 0 / 1 / 0 | 0 / 4.86 / 0.51 | 0.05 / 0 / 0.50 | 31.1 / 61.1 / 25.0 | 0 / −367 / 103 |
| rx_airborne 60 (flight) | A / B / Ch | — / — / 0.65 | 48.1 / 0 / 0 | 0 / 1 / 0 | 0 / 13.6 / 0.65 | 0.04 / 0 / 0.67 | 39.4 / 147 / 33.2 | 0 / −156 / 343 |
| rx_sprint 66 (flight) | A / B / Ch | — / — / 0.62 | 46.0 / 0 / 0 | 0 / 1 / 0 | 0 / 14.1 / 0.62 | 0.05 / 0 / 0.65 | 52.7 / 182 / 52.8 | 0 / −1,841 / 326 |

Over all 217 moving window frames the picture is the same: A's ΔP_h is 1.7 – 89.5 N·s, and Ch's \|s\| is 0.02 – 1.21 m/s (`evidence/summary.txt`).

### Which definition matches the architecture

**"Simulation owns global locomotion; presentation supplies pose and internal articulated motion" → C.**
- **A** lets the presentation own the whole-body momentum. It imports 1.7 – 89.5 N·s the simulation never had.
- **B** deletes the internal articulated motion:
  - all angular momentum lost;
  - segment jumps up to 14 m/s;
  - up to 1.8 kJ of kinetic energy destroyed;
  - a contact foot slides at the full authoritative speed.
- **C** has exact authoritative momentum, exactly preserved internal motion, and untouched positions. Its only cost is one uniform velocity change \|s\| on every body.

## 5. HG-A re-evaluated

**Answer:** HG-A should require **the promoted body's total translational momentum to equal the authoritative player's, while preserving the internal motion.** It should not require the presentation's instantaneous COM velocity to equal the authoritative velocity.

**Why:**
1. **Conservation.** Internal (articulated) forces cannot change total momentum. If the presentation supplies only internal motion, its contribution to total momentum is zero by definition, and total momentum is the simulation's. Requiring the presentation's own instantaneous COM velocity to equal v_auth tests a quantity the presentation has no authority over.
2. **The authority is a stride-mean quantity.** A real gait's COM speed also varies within each step because of ground reaction forces. A constant-velocity point mass is the mean of that, and the presentation already matches the mean to ≤ 0.015 m/s.
3. **This presentation's instantaneous whole-body state is not a physical state** (§2): conservation is violated in flight. A handoff criterion that depends on it measures animation jitter, not a locomotion disagreement.
4. **The correction's only real cost is visual.** Its tolerance must therefore come from the existing visible-continuity requirement, PR-2's 3 mm per frame, not from P-16's fidelity number.

**The existing HG-A is therefore conceptually wrong for this architecture.** A replacement is not necessarily sufficient, though (§6, §7).

**Recommended replacement: HG-A v2,** frozen before use (`HGA_V2_PROPOSAL.md`, 192816b; proposed, not adopted):
- **HG-A2.1:** the promoted horizontal momentum = M·v_auth,h. It holds by construction; measured ≤ 2e-15 m/s.
- **HG-A2.2:** angular momentum about the COM and all relative velocities are unchanged. Identity; ω verified unchanged.
- **HG-A2.3:** the uniform shift \|s\| ≤ **0.180 m/s** = PR-2's 3 mm per 60 Hz frame. A uniform velocity change moves every joint's first-frame displacement by exactly s/60. P-14's 0.25 m/s is looser.
- **Everything else unchanged.** P-16 keeps its meaning as the pre-shift mapping-fidelity row. There is no vertical shift.

**Does momentum-preserving promotion remove the apparent handoff discontinuity without altering the visible running animation?**

**It removes the momentum discontinuity exactly, and alters no pose or position.**
- Ch: ΔP_h = 0; ΔL = 0; relative velocities and positions unchanged.
- The animation up to k_p is untouched.

**It does not make these running handoffs visually continuous:**
- The visible one-frame discontinuity is dominated by the presentation's **own** frame-to-frame jitter: worst joint median 39 mm (A) vs 36 mm (Ch), against PR-2's 3 mm.
- On top of that, C adds a uniform \|s\|/60 per frame: median 8.5 mm on the 48 frames.
- The pelvis then departs from the root by \|s\|, and any contact-flagged foot gets \|s\| of extra slip.

**It also carries over two things no REV2 row bounds** (findings N1, N2 below):
- the presentation's vertical COM velocity, here up to ±6.7 m/s at HG-A-only frames and 10 m/s at worst;
- the presentation's non-conserved angular momentum.

## 6. Diagnostic count under HG-A v2

**Setup.** Every other REV2 gate unchanged. Not a qualifying run, and no PI-1. Outputs: `evidence/hga_v2_count_{rx,def}.json`, `hga_v2_count.log`.

| class | valid promotion frame | pass |
|---|---|---|
| NEAR MISS (7) | 1: rx_miss, lead 5.5 ticks | **0**. rx_miss fails NM: a physical contact (foot_R) where gameplay has none. |
| RECOVERABLE (4) | 2: rx_behind_standing, rx_rear_diag (lead 1) | **1**: rx_behind_standing. rx_rear_diag fails CG-2 / 4 / 5 / 6. |
| PLANTED-LEG FALL (8) | 5: rx_glancing (lead 1.75), rx_lateral (6), rx_front_diag (6.5), rx_facing_front, rx_side_standing | **0**. rx_glancing has no physical counterpart at the decisive time. rx_lateral / rx_front_diag fail CG-2 / 4 / 5 / 6 and AST-C1 (14.2 / 10.5 mm). The two standing falls fail as in REV2. |

**Totals.** Valid promotion frames: **10 / 26** (REV2: 3). Representatives: **unchanged from REV2** (0 / 1 / 0). The E1 approach-velocity reading of CG-6 changes no verdict. HG-A2.1 measured ≤ 1.8e-15 m/s.

**Why it doesn't help.**
- Only **7 of the 49** HG-A-only frames have \|s\| ≤ 0.18 m/s.
- The admissible frames lie **1 – 9.25 ticks** before contact, instead of the 0.5 – 0.75 ticks of the frames the waived diagnostic used (\|s\| 0.51 – 0.65 there).
- Over those leads, the causal, non-locomoting physical body drifts out of the gait: support disagrees (CG-2), contact location and timing shift (CG-3 / CG-4), contacts appear or vanish (NM / CG-1), and stand-in tracking exceeds 10 mm.
- So HG-A v2 moves the binding constraint onto the long-lead drift, which is already a recorded blocker.

## 7. Blockers, kept separately (none modified)

| # | blocker | where |
|---|---|---|
| B1 | physical boot larger than the gameplay foot (segment correspondence) | rx_facing_front CG-1; NM extra contacts (rx_sprint / heavy / light waived; rx_miss under HG-A v2) |
| B2 | the simulation's slider stop (`SLIDER_BLOCKED_BY_FALLER`) inside the retained 10 mm window | rx_side_standing 10.8 mm |
| B3 | slide leg still extending at contact (HG-T) | sl_from_behind |
| B4 | long-lead physical gait drift of the non-locomoting promoted body | now the dominant failure behind HG-A v2 (§6) |
| B5 | standing-pose foot correction P-5 (11 – 13°) | rx_standing |
| B6 | rx_free_leg angular momentum P-17 (57 – 63 %) | rx_free_leg |
| B7 | rigid-foot toe-pivot limitation (≥ 22.9 mm) | REV1 / RF-1 |

**New findings from this investigation (recorded, not acted on):**

| # | finding |
|---|---|
| **N1** | **The presentation's whole-body state is not physical frame to frame:** vertical COM velocity up to 10 m/s, pelvis height jumps ≤ 72 mm per frame, angular momentum not conserved in flight. Promotion imports it under A, REV2 and C, and no HG row bounds the vertical COM velocity or the angular momentum's plausibility. |
| **N2** | **PR-2 (REV2 reading: 3 mm vs the last presented frame) would fail every moving promotion under A, B or C.** The presentation's own one-frame displacement change at the worst joint is 8 – 199 mm (A's minimum over 217 window frames: 4.0 mm). This is a latent PI-1 blocker for any moving runner. |
| **N3** | Contact-flagged presentation feet are not stationary: sole speed median 0.60 m/s. |
| **N4** | The user's "authoritative linear/angular motion" was implemented as linear only (§1). |

## 8. Files

**Scripts** (`scripts/`):
- `hga_decompose.mjs`: per-frame decomposition, A / B / Ch / C3, and the determinism check;
- `hga_summarise.mjs`: statistics;
- `hga_v2_count_diagnostic.mjs`: the item-6 count, built on REV2's `probe_cg6_prestep_and_discontinuity.mjs` with only the selector changed.

**Evidence** (`evidence/`): `decompose_{rx,def}.json`, `summary.txt`, `representative_tables.md`, `hga_v2_count_{rx,def}.json`, `hga_v2_count.log`.

**Records:** the REV2 AIR records, in scratch, regenerable.
