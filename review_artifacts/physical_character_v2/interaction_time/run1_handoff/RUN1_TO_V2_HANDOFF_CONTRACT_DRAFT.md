# RUN-1 → V2 interaction-time handoff: contract DRAFT (10 Oct 2026, for review; nothing adopted)

**Source:** `../../sources/2026-10-10_user_decision_pause_its1_amendment_run1_handoff_contract.md` (4da41c4f).

**Scope:**
- This is read-only preparation. RUN-1, V2 and the simulation are unchanged, and no bridge is implemented.
- The ITS-1 stop (`../ITS1_STOP_PF0.md`, c647f4c9) stays as evidence, exactly as committed.
- The ITS-1 amendment A1 (stance-aware controller, V-3 rows) is paused.

**Evidence base:**
- **RUN-1:** commit `949bd763` (`prototype/locomotion-v2-run1`), probed read-only from a `git archive` copy.
  - The RUN-1 worktree had uncommitted edits from its ongoing visual pass; those edits were **not** probed.
  - Every RUN-1 number must be re-measured on the frozen RUN-1 baseline.
- **Simulation:** the IB-1 records (V1.3 OFF, 5042230).
- **Probes:** `probe/*.cjs`; outputs in `out/`; provenance in `out/run1_provenance.txt`.
- **Estimates:** COM, momentum and angular momentum use segment COMs at bone midpoints, V2 generator mass fractions and 73 kg. These are labelled *est.*; V2's own mass model replaces them in any bridge.
- **Sampling:** samples sit at half-steps (480 per stride), so no difference stencil straddles a touchdown, where the pose has a 0.04 mm step between grid speeds.

**Roles:** unchanged from `../ITS1_CONTRACT.md` §1. The simulation decides; RUN-1 presents ordinary movement; V2 realises an interaction the simulation has decided. RUN-1 replaces only the *pose source* that ITS-1 took from the simulation's law skeleton and compared with V1.3 / LC-1.

## 1. The handoff in one sentence

At the authoritative initialization time τ₀ (at or just before the contact τ_c), V2 reads **one** RUN-1 state sample and the authoritative simulation quantities, and builds its initial state deterministically. After τ₀, nothing from RUN-1 enters the physics. That keeps ITS-1's "no locomotion machinery after initialization" rule.

## 2. Interface

### 2.1 What RUN-1 must expose directly

| # | field | form | why / status at 949bd763 |
|---|---|---|---|
| R-0 | **Provenance and input echo** | RUN-1 version id, parameter-set hash, rig id + bind hash; the authoritative input it consumed at τ (root x, y, heading, speed, acceleration), echoed bitwise | Lets V2 verify that RUN-1 used the simulation's own root (H-2). Not exported today. |
| R-1 | **A pure state query at any authoritative time τ (sub-tick)** | Non-mutating; O(1) in elapsed match time; returns the state of the **same integration path that was rendered** | **Not met.** `r1Kinematics` calls `r1Replay`, which replaces the actor's state with a fresh one and replays from t = 0. Cost therefore grows with match time. RUN-1's own `determinism.txt` shows replay ≠ incremental on a speed ramp, so the export can differ from what was shown. |
| R-2 | **Complete skeletal pose** | All 23 rig bones: local rotation + pelvis translation, root-relative, **float64**; the root transform separately | `r1Pose` / `r1FK` compute float64 root-frame values internally. The export is float32 world matrices. |
| R-3 | **Joint angular velocities and linear velocities** | float64, root-relative, from the **continuous pose function**: analytic, or a declared central difference of it. One-sided at declared events. Never from rendered frames or float32 matrices. | RUN-1 differentiates its closed-form replay (good), but from float32 world matrices: **12 mm/s quantization at pitch x = 100 m** (measured). Velocities are continuous at grid speeds. **Between grid speeds there is a 0.04 mm position step at touchdown** (7.8 m/s, from the speed-grid interpolation), which a straddling difference turns into a ≈ 0.04 m/s error. |
| R-4 | **Pelvis state** | Pose and twist (inside R-2 / R-3), plus RUN-1's spring-mass vertical (y, ẏ, ÿ) as constructed | RUN-1 owns this vertical. It is gravity-consistent by construction. |
| R-5 | **Gait clock** | Phase u and **its source** (simulation-locked or RUN-1's own); per leg: stance / swing, stance fraction s or swing fraction w, last touchdown τ, next toe-off τ | Phase and s / w are exported. The clock is RUN-1's own cadence (see H-1). |
| R-6 | **Per-leg contact detail** | Sub-phase (heel roll / flat / heel-up about the MTP joint / toe pad / swing); the **pivot** (heel line, sole, MTP line or toe pad) in **pitch coordinates**; the plant pose in pitch coordinates; foot pitch; **MTP extension angle** | The export gives only a stance flag and the plant as root-relative `{zTD, footW, travel}`, which is valid for straight running only. RUN-1's own recommendation 2 is world-space plants. |
| R-7 | **Turning and acceleration context** | RUN-1's own yaw-rate assumption (currently 0, straight-line only) and its acceleration-lean state | Needed so a mismatch with the authoritative facing rate is measured, not hidden. |
| R-8 | **Unperturbed continuation** (diagnostic only) | The same query at later τ | The reference for transition metrics (IB-1 Q3 / Q7). **Never fed to the physics.** |

RUN-1 is **not** the source of mass, inertia, COM or momentum; V2 computes those (2.2). RUN-1's own COM marker may be exported for diagnostics only.

### 2.2 What V2 derives deterministically (from R-* and S-*)

| # | derivation | rule |
|---|---|---|
| V-a | **Bone → body mapping** (23 → 14) | pelvis→pelvis; spine→abdomen; chest (+ clavicles)→thorax; neck + head→head; upperArm→upperArm; foreArm + hand→forearm; thigh→thigh; shin→shank; **foot + toe → rigid F0 foot**. The toe merge is an explicit approximation with its MTP angle recorded. Projection into V2's hard box, with per-joint clamp recorded. Residuals on the locked axes (elbow carry, knee varus) are recorded. |
| V-b | **COM, P, L** | Per-body COM, whole-body COM, linear momentum, angular momentum about the COM: V2's mass model only. |
| V-c | **Grounding** | One whole-body vertical shift to the turf (the E-2 rule); body clearances and self-separation recorded. |
| V-d | **Velocity construction** | The E-3 method kept: projection onto V2's joint-consistent kinematics in the kinetic-energy metric, solved as one KKT system. The **reference** becomes R-3 instead of a finite difference of the law. Default constraints (each is a preregistration decision):<br>• stance **pivot** velocity = 0, not whole-foot twist = 0. RUN-1's foot rotates about its pivot outside the flat window: ankle speed up to 0.25 / 0.89 / 1.39 m/s in heel roll and 2.2 / 3.9 / 5.1 m/s heel-up (3.0 / 5.5 / 7.8 m/s), against 0 when flat.<br>• horizontal P = M_V2 · v_auth.<br>• yaw L from the authoritative facing rate.<br>• vertical COM velocity and pitch / roll L **from the source**. ITS-1's zeroing existed for the law's non-physical vertical. |
| V-e | **Facing rate and sub-tick values** | From the authoritative rows: row difference × 60, and the row rule for τ between rows. |
| V-f | **Struck body and application point** | Simulation segment → V2 body. The authoritative point is carried **segment-relatively** (position along the simulation's capsule + direction), not in world coordinates, because the simulation's capsule and the RUN-1 / V2 limb are not in the same place. The gap is reported. |
| V-g | **Representability and consistency report** | Per activation: stance sub-phase and MTP angle against the rigid foot; \|P_src − M·v_auth\|; L_src; RUN-1 vs simulation support agreement; simulation capsule vs V2 body gap at τ_c. |

### 2.3 What must come from the authoritative simulation

| # | quantity | record source |
|---|---|---|
| S-a | Root position (x, y) | rows [8, 9] |
| S-b | Translational velocity | rows [10, 11]; at contact, event `vA` |
| S-c | Facing (rate derived per V-e) | rows [12] |
| S-d | **Gait phase and per-leg support** | rows [13] `gaitPhase`; per sub-step `simBody[r][n].legs.{L,R}.{planted, up}`. Stride clock legLen 0.865 m (rig 0.834 m). |
| S-e | **The contact event** | `PLAYER_CONTACT`: tick, sub; `seg`, `segKind`, `segPlanted`; `point`, `normal`, `pen`, `vn`, `vt`; `J`, `Jfric`; `vA`, `vT`; `massA` / `massT`; `support`, `stride`, `phase`; `sweep`, `supportLost` |
| S-f | Outcome and timeline (agreement reporting only; never a physics input) | `react` / `cls`, `family`, `az`, `azHead`, `tGround`, `tUp`, `steps`, `collapse` … |
| S-g | Contacts already represented (double-count guard) | the ordered event list |

The simulation has **no full skeletal pose**, only the collision capsules of the shared law. That is exactly what RUN-1 replaces for V2.

## 3. Hard preconditions for a RUN-1 state to be a valid source

**H-1. Support agreement.** At τ₀ … τ_c, RUN-1's per-leg stance flags equal the simulation's planted flags (S-d, S-e). The simulation chose "planted shin_L" on its own clock.

**This does not hold today:**

| at 3.0 m/s | steps / s | duty factor |
|---|---|---|
| simulation | 3.21 | 0.420 |
| RUN-1 | 2.75 | 0.371 |

- **Free-running:** the two clocks drift apart by 0.23 strides per second.
- **Phase-locked:** even with the phase locked, one leg disagrees for about 10 % of the stride (0.049 stride per leg).
- **Options (not decided):**
  - (a) RUN-1 is driven by the simulation's stride clock and planted windows (RUN-1 report recommendation 3);
  - (b) the simulation re-derives its boot plan from RUN-1, a gated gameplay change (hashes change);
  - (c) the disagreement is reported and the interaction is not activated.

**H-2. Root identity.** RUN-1's root equals the simulation's root at τ, bitwise (R-0 echo).

**H-3. Neutrality and determinism.** RUN-1 is a pure function of the authoritative input history. No RNG, no clock, no write to the simulation. The R-1 query is non-mutating.

**H-4. One-shot.** The physics reads RUN-1 at τ₀ only; no gait reference after activation.

**H-5. Numerical form.** float64, root-relative, version-stamped, with the differentiation method declared.

## 4. What RUN-1 (949bd763) changes for V2: measured facts

| | 3.0 m/s | 5.5 m/s | 7.8 m/s |
|---|---|---|---|
| steps / s; duty; flight per stride | 2.75; 0.371; 0.26 | 3.20; 0.280; 0.44 | 4.13; 0.250; 0.50 |
| stance share: heel roll / flat / heel-up / toe pad | 0.14 / 0.16 / 0.65 / 0.05 | 0.12 / 0.12 / 0.64 / 0.12 | 0.14 / 0.02 / 0.68 / 0.17 |
| stance with MTP extension > 5° / > 15° | 56 % / 32 % | 59 % / 37 % | 62 % / 44 % |
| COM vertical velocity (est.) | ± 0.71 m/s | −0.80 … +0.87 m/s | −0.68 … +0.84 m/s |
| COM forward velocity − v_auth (est.) | −0.20 … +0.22 m/s | −0.29 … +0.39 m/s | −0.33 … +0.30 m/s |
| COM vertical acceleration + g in flight (est.; 0 if ballistic) | −0.5 … +7.0 m/s² | −3.2 … +10.5 m/s² | −4.9 … +15.5 m/s² |
| implied vertical load in stance, min / peak (est.) | −0.23 / 3.09 BW | −0.88 / 3.44 BW | −1.92 / 3.82 BW |
| point-mass L about COM, pitch / yaw / roll (est., N·m·s) | ≤ 4.6 / 2.5 / 4.0 | ≤ 15.2 / 4.7 / 5.8 | ≤ 22.9 / 7.9 / 8.1 |

What these mean for the handoff:
1. **The vertical is physical in magnitude.** The source's COM vertical velocity is ≲ 0.9 m/s, against the law's +1.6 … +1.8 m/s that forced ITS-1's c3 = 0. Keeping the source vertical becomes the default.
2. **The rigid-foot / toe-pivot mismatch becomes central for planted-leg states.**
   - V2's F0 boot (the F1 toe body failed passivity) can follow RUN-1's foot only in heel roll and flat: 30 / 24 / 16 % of stance at the three speeds.
   - For 56–62 % of stance the MTP joint is extended by more than 5°. While the toe is flat and the pivot is stationary (MTP joint speed 0 below about 44°), a rigid tip would sit up to ≈ 75 mm into the turf at the 52° cap (lever estimate).
   - This was S-A2's failure mode (toe edge). With RUN-1 as the source it covers most of stance.
3. **COM vs root.** RUN-1 carries the pelvis at exactly the root speed, so the whole-body COM does not move at v_auth. Imposing M·v_auth corrects by up to 0.39 m/s at 5.5 m/s (est.). That exceeds IB-1 H7's visible-cost bound of 0.18 m/s.
4. **Stance loads.** RUN-1's own stance implies peaks of 3.1–3.8 BW. ITS-1's V-3 row (2·M·g·dt, inherited from PR-4) would fail RUN-1's own stance. This is evidence for ITS-1 decision 1; nothing is changed.
5. **Flight.** The pelvis, not the COM, is ballistic. V2 activated in flight evolves ballistically from the derived state, and its departure from the source is a reported transition metric, not corrected.
6. **ITS-1's causes after the switch:**
   - **Removed:** c3 (law-specific).
   - **Remaining (V2-side, independent of the source):** the frozen posture tone against the initialized stance rates; the rigid boot at touchdown and heel-up.
   - **Consequence:** RUN-1 alone will not make S-B / S-B2 / S-A2-type states pass PF-0.
   - **Hypothetical mapping onto RUN-1's phases** (phase-locked, RUN-1 duty; `out/its_states_in_run1_phase.txt`):

| state | RUN-1 stance fraction s | sub-phase |
|---|---|---|
| S-A | 0.22 | flat |
| S-B | 0.13 | heel roll |
| S-B2 | 0.01 | heel roll |
| S-A2 | 0.91 | heel-up |

## 5. ITS-1 tests when RUN-1 becomes the source

**Reuse unchanged** (architecture-independent):

| item | note |
|---|---|
| PF-0 V-1 (geometry), V-2 (construction residuals, anchor continuity), V-4 (validity over W_valid) | The constraint set inside V-2 follows the new preregistration; the row does not change. |
| PF-0 V-3 rows as frozen | The 2·M·g·dt value is ITS-1's open decision 1, independent of the source. |
| PF-1 impulse once; PF-2 visibly physical (RC-2); PF-3 propagation integrity; PF-4 no artificial cancellation; PF-5 determinism; PF-6 neutrality (`ib_verify` V1–V6, deep freeze, static RNG / Date check); PF-7 matched C (S1–S3) | |
| Outcome agreement (report-only) | |
| §6 captures; E-2 rule; E-4 impulse rule and one-shot guard; authority-write counts; D-1 / D-2 / D-3; CPU split | |
| IB-1 H1–H8 / Q1–Q8 | The RUN-1 stream is declared as the Q3 / Q7 reference. |
| The IB-1 authoritative events (S-A … S-B2) | The simulation is unchanged. Only the τ₀ pose source changes, under H-1. |

**Keep, authority side only:** `law_provider` and its K0 check (law = recorded `simBody`). It is the simulation's collision skeleton. It is needed for V-f (segment-relative point) and for measuring the RUN-1 vs simulation pose gap. It is **no longer the V2 pose source**.

**Retire** (they exist only because of V1.3 / the shared law / LC-1):

| item | replaced by |
|---|---|
| E-1: law pose as V2 pose; PI-1 R-K mapping from the V1.3 collision skeleton | R-2 + V-a |
| E-3 reference from the law's ±0.25-tick central difference | R-3 |
| E-3 c3 = 0 (law's non-physical vertical) | source vertical (V-d) |
| E-3 c1 whole-foot twist = 0 | pivot velocity = 0 (V-d) |
| Application point carried through the law pose at τ_c | segment-relative carry (V-f) |
| Presentation diffs against V1.3 LOCO / LC-1 LOCO (`makeMapper`, RF-1) | the RUN-1 stream (R-8) |
| ITS-1 §8 "not applicable" set (HG, PR-1 / PR-2, CG-7, AH-1, RF-1, D-5, NM-1…4, K1–K5, PCS-1, LC-1 criteria) | stays retired |

**New checks the handoff needs** (proposed, frozen only with the RUN-1 baseline):
- **HT-1:** support agreement, per event (H-1).
- **HT-2:** exported velocities vs a float64 difference of the exported pose (O(h²)), with anchor consistency.
- **HT-3:** pivot velocity ≈ 0 while planted. RUN-1 already gives 0 in the flat window, and 0 at the MTP joint below 44°.
- **HT-4:** query purity: presentation output hash unchanged by a query; O(1) cost.
- **HT-5:** representability report (V-g).
- **HT-6:** \|P_src − M·v_auth\| and L_src reported.
- **HT-7:** input echo = simulation rows, bitwise; simulation hash unchanged.

## 6. Open decisions (not taken)

1. **Stride-clock ownership** (H-1 a / b / c).
2. **Meaning of v_auth:** COM velocity, as ITS-1 and H7 treat it. If so, should RUN-1 carry its pelvis so that the V2-mass COM tracks the root?
3. **Rigid F0 foot vs RUN-1's heel-up stance:** restrict planted-leg states to heel roll / flat, or open V2 foot work.
4. **Source vertical and pitch / roll L kept** (proposed default), or ITS-1's zeroing.
5. **ITS-1 decisions 1–4** (V-3 rows, interaction controller, touchdown, C design) stay open. They are source-independent, except that item 4 above adds evidence to decision 1.
