# Track B results: CHARCOLLIDE-1 baseline built and neutral; no fixture passes the compatibility gate with pose-compatible F0 promotion. All three PI-1 classes BLOCKED; PI-1 not run

**Authority:** `../../sources/2026-10-09_user_decision_trackA_toe_solver_trackB_pose_compatible_pi1.md`.

**Preregistration:** `TRACKB_PREREG.md`, frozen at dd88ee9, with three recorded changes:
- A1 (469d7ef): inscribed capsule placement;
- E1 (0a60763): root-basis tolerance;
- A2 (6802742): operational PCG / gate definitions.

All three were committed before any V1.3 gate evaluation.

**Result.**
- The corrected slide-contact baseline, **V1.3 (CHARCOLLIDE-1)**, is built, versioned and outcome-neutral. It naturally produces all three outcome classes.
- **No candidate passes the unchanged compatibility gate** with the F0 body under the preregistered pose-compatibility gate (PCG-F0). That covers 20 rx fixtures plus 6 defending slide fixtures.
- Under TRACKB_PREREG §6 and your hard stop ("corrected slide-contact cannot naturally supply the PI-1 cases"), **PI-1 was not run**: no class has a frozen candidate.
- Nothing was moved, offset or tuned. No criterion was changed after seeing results.

## 1. What was built

| step | commit | result |
|---|---|---|
| Track B preregistration | dd88ee9 (V2 branch) | PCG-F0 rows P-1 … P-17, frames, search, stop rules |
| A1: inscribed placement | 469d7ef | The §2.3 placement protruded 3.8 mm (rounded heel) and 10.0 mm (toe spring), and its bisection was ill-posed. Found before any fixture run. |
| CHARCOLLIDE-1 profile (vinicius) | 3e28e02 | Every number's source is in `charcollide/CHARCOLLIDE_PROFILE.md`. |
| V1.3 simulation | **5042230** on `prototype/slide-contact-v1.3-charcollide` (from e2c98ec) | Profiled runner segments from its own skeleton + the shared pure locomotion law, inscribed V2 radii, tapered r(t) contact; legacy path unchanged |
| unit checks, E1 | 0a60763 | Legacy path byte-identical (480 / 480); deterministic; root basis exact in float64 (1.4e-14). E1: the 1e-12 tolerance had overlooked `gkRootMatrix`'s Float32 storage. |
| A2: operational definitions | 6802742 | Frozen while the export was still running |

**Profile radii:**

| segment | old | new |
|---|---|---|
| thigh | 80 mm | tapered 84.5 → 59.8 mm |
| shin | 60 mm | tapered 53.6 → 36.1 mm |
| foot | 50 mm | 29.5 → 24.8 mm (heel-end → MTP-end centres) |
| toe | — | 9.4 mm (MTP → tip) |

The leg is the rig's own (thigh 434.9 + shin 398.7 mm, hip half-width 152.5 mm), posed by `ofLocoCycle` at the simulation's stride clock.

## 2. Neutrality gate (§2.9): PASS

- **Legacy path:** V1.3 with the profiles removed reproduces the V1.2 (e2c98ec) gameplay hashes for **19 / 19** rx fixtures (`v13/air/air_summary_noprofile.json`).
- **Presentation modes:** OFFNP / OFF / FULL / LOCO gameplay hashes are identical for **20 / 20** rx fixtures (including the near miss) and **6 / 6** defending slide fixtures.
- **Determinism:** exporting twice gives identical hashes for **20 / 20** (`air_summary_repeat.json`). The unit legacy check is byte-identical, 480 / 480.
- **Errors:** 0 page errors.

## 3. Rebaseline: the natural V1.3 outcomes (`v13/air/air_summary.json`, `v13/air_def/air_summary.json`)

**Near-miss rule (PI-1 §2, frozen).** It selects **off = +1.13 m** (V1.2: +1.01), with the closest surface at 0.106 m.

| category | fixtures, V1.3 outcome (decisive contact) |
|---|---|
| (1) no contact | rx_miss, rx_sprint, rx_airborne, rx_heavy, rx_light. The predictor never fires on sl_early / sl_late, so they are not near misses under the rule. |
| (2) recoverable | **rx_free_leg**: LEG → foot_L (swing) CORRECTION, J 2.82; then LEG → toe_R (swing) **STUMBLE**, J 3.63. Also rx_rear_diag (CORRECTION), rx_standing (STUMBLE), rx_behind_standing (STUMBLE). |
| (3) planted-leg FALL | **rx_planted_leg** (= rx_jog): LEG → shin_L (planted) FALL SIDE, J 144.1. Also rx_glancing, rx_lateral, rx_front_diag, rx_facing_front, rx_side_standing, sl_from_behind. |
| other | rx_square / rx_early_stance / rx_late_stance / sl_win (FALL from a swinging-foot or toe contact); rx_rear / sl_left (NEGLIGIBLE); sl_loose (trunk → pelvis FALL) |

**So the corrected simulation supplies every class naturally.** Outcomes changed from V1.2 as expected. For example, rx_free_leg is now a STUMBLE via a toe contact. Nothing was tuned to preserve or produce a label.

## 4. Compatibility gate with PCG-F0 (`v13/compat_gate_v13_all.json`, `compat_gate_v13_def.json`)

| class | fixture | PCG-F0 at the predicted promotion frame k_p | PCG-F0 window (k_p → contact) | other gate failures |
|---|---|---|---|---|
| near miss | rx_miss | **fails** P-9 (presentation toe-contact foot; F0 boot 53 mm up) | 10 / 14 frames fail: P-9 L / R, P-15, P-17 | — |
| near miss | rx_sprint, rx_heavy, rx_light | fails P-15 + P-16 | 9 / 19: P-15, P-16, P-9 | — |
| near miss | rx_airborne | fails P-4, P-12, P-14, P-16, P-17 | 10 / 17 | — |
| recoverable | **rx_free_leg** | fails P-17 | 16 / 19: P-9 (toe pivot 21 – 61 mm up; heel strike −10.9 mm), P-15, P-17 | CG-4: s 0.78 vs 0.33 along the toe |
| recoverable | rx_rear_diag | fails P-10 | 4 / 7 | CG-2, CG-4, CG-5, CG-6 |
| recoverable | rx_standing | fails P-9: a contact-flagged foot in a replant step is 30 – 33 mm up | 12 / 12 | CG-1, CG-2 |
| recoverable | **rx_behind_standing** | **eligible** | **0 / 12** | CG-7 tackler-primitive continuity only: **17.9 mm** vs 10 mm, where the slide leg's extension ends |
| fall | **rx_planted_leg** | **fails P-9**: right foot in toe pivot, F0 boot 25.5 mm up | 7 / 10: P-9, P-15 | CG-1 (D-1 first on the boot, 65 mm from the ankle), CG-3 (+1.25 ticks), CG-5 (D-1 shank barely touched) |
| fall | rx_glancing | fails P-17 | 8 / 11: P-17, P-9, P-15 | — |
| fall | rx_lateral | eligible | 9 / 17 | CG-1, CG-3, CG-4 |
| fall | rx_front_diag | eligible | 7 / 12 | CG-2, CG-3, CG-4 |
| fall | rx_facing_front | eligible | 0 / 14 | CG-1 (D-1 first on the boot, 92 mm from the ankle); primitive continuity 17.9 mm |
| fall | rx_side_standing | fails P-9 (replanting foot 29 – 33 mm up) | 14 / 20 | — |
| fall | sl_from_behind | fails P-7 (twist > 10°) + P-15 | 11 / 12 | CG-1 (D-1 first on the shank, 62 mm from the ankle), CG-4 |

**Every class is blocked:**
- **near miss:** 0 of 5;
- **recoverable:** 0 of 4. The closest is rx_behind_standing, a standing player, which fails only the tackler-primitive continuity sub-item;
- **planted-leg fall:** 0 of 8.

## 5. Where the rigid F0 foot is compatible with ordinary running (`v13/pcg_scan.json`; descriptive, selects nothing)

**Scope:** PCG-F0 on every pre-contact locomotion frame of the distinct V1.3 records.

| speed class | frames eligible | longest eligible run | main failing rows |
|---|---|---|---|
| jog ≈ 3 m/s | 111 / 524 (21 %) | **7 frames** | P-17 186, P-9 198, P-15 59 |
| run ≈ 5.5 m/s | 65 / 143 (45 %) | **4** | P-15 38, P-17 31, P-9 30 |
| sprint ≈ 7.5 m/s | 362 / 882 (41 %) | **5** | P-15 391, P-16 231 |
| standing | 104 / 206 | 50 | P-9 89 |

**Eligibility by stride phase** (jog; the run and sprint have the same structure):
- eligible: phases 0.4 – 0.5 and 0.9 – 1.0, just before each heel strike (late swing / flight);
- P-9 fails at 0.3 – 0.4 / 0.8 – 0.9, the stance foot's toe pivot: the presentation's toe is on the turf while the shorter rigid boot is 21 – 64 mm above it;
- P-15 / P-17 fail at 0.1 – 0.2 / 0.6 – 0.7, early stance after heel strike.

**What the kinematic failures are.** The P-15 excess is almost entirely **spin about the thigh / shank long axes**: for example 4.53 rad/s axial vs < 0.3 rad/s transverse at rx_free_leg row 56. It comes from the frozen R-K retarget's twist, which jumps as the knee bend crosses R-K's 5 – 10° blend band at heel strike, and as the rig's knee plane turns. It is a **mapping** property, not a body limit. It was not changed after being seen.

**Consequence.** A promotion window from the 0.10 s predictor to contact is 7 – 19 frames, and it nearly always includes a toe pivot, a heel strike or an R-K twist transient. **So the ordinary-running states the current physical character can represent within the frozen tolerances are short pre-heel-strike windows (≤ 7 consecutive frames).** No running promotion window fits. Standing players are representable, but the standing fixtures fail contact correspondence or the tackler-primitive continuity.

## 6. Tooling and process errors (disclosed)

1. **Gate code bug, fixed before any reported result.** In `compat_gate_v13.mjs` the per-row object spread `{ fails, ...g, ...v }` let the kinematic fails list overwrite the combined list. Every geometric PCG failure (P-1 … P-13) was silently dropped, which hid the toe-pivot P-9 failures.
   - It was found by inspecting the rows: a toe-contact foot 21 – 61 mm up was not flagged.
   - The pre-fix output is kept as `v13/compat_gate_v13_all_PRE_FIX_tooling_bug.json`.
   - The shared module refactor (`pcg_f0.mjs`) reproduces the fixed output byte-for-byte.
2. **A1:** my §2.3 inscription operationalisation failed. It was amended before any fixture run.
3. **E1:** my §2.5 tolerance ignored float32 storage in `gkRootMatrix`.
4. **Concurrency:** Track A ran concurrently during the profile generation and the unit checks. Only wall times are affected; every result here is deterministic, as the hashes show.

## 7. CPU (`charcollide_cpu.json`; Node, one thread, medians of 5)

- **Runner body model per call:** legacy 2.98 µs vs CHARCOLLIDE-1 **67.4 µs (22.7×)**, dominated by `ofLocoCycle` + float32 `skelFK`.
- **Per tackler–runner pair per contact-test tick** (4 sub-steps): 12 → 270 µs.
- **Not optimised;** the costs are reported only. PI-1 CPU was not reached.

## 8. Conclusions

- **B. Can PI-1 work correctly today using pose-compatible F0 promotion? No.** Not on the corrected V1.3 slide-contact fixture space, under the frozen criteria.
  - **Near miss:** every no-contact fixture's promotion window contains toe-pivot or kinematic (R-K twist) incompatibilities.
  - **Recoverable:** the only candidate whose runner pose is fully F0-compatible (rx_behind_standing, a standing player) fails the tackler-primitive continuity sub-item of CG-7 (17.9 vs 10 mm).
  - **Fall:** no planted-leg fall passes. The running ones fail pose compatibility; the standing one fails segment correspondence (CG-1).
- **The blockers are of three kinds:**
  - (i) the rigid, shorter F0 boot cannot follow the presentation's toe pivot / heel strike. This is representation, and is what F1 was meant to fix, but Track A closed F1 at the solver;
  - (ii) the frozen R-K retarget produces long-axis twist rates above P-15 / P-17. This is mapping;
  - (iii) the gameplay contact location still differs from the IK-solved presented leg in several contacts (CG-1 / CG-4).
- **None of this shows a V2 body / joint limitation.** Every pose row that measures the body's ability to adopt the pose passes almost exactly: pelvis 0 mm, knee / ankle ≤ 3 µm, foot 0°, no ROM clamp in running.
