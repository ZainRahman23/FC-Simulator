# LC-1 locomotion-presentation continuity slice: results

**Authority:** `../sources/2026-10-09_user_decision_locomotion_continuity_slice.md` (df28867).

**Record chain:**
- preregistration `LC1_PREREG.md` (313280f), frozen before any implementation;
- implementation freeze `LC1_IMPLEMENTATION_FREEZE.md` (f3cc1f6); code on branch `prototype/locomotion-continuity-v1` at 9d57d46;
- official evaluation run once, on the frozen code.

**Nothing changed outside the presentation.** Every simulation file and the shared law that the simulation's collision legs use are byte-identical, and gameplay hashes are identical in every mode (§2, LC-7). V2, F0, Jolt, collision thresholds and PI-1 contact geometry are untouched. No PI-1 revision, no qualifying run, nothing pushed.

## The six answers

1. **Did the locomotion itself become continuous?** Partly, and not by the preregistered verdict.
   - **Pass at every speed:** the pelvis and COM paths are continuous in position and velocity, also through a 1.0 → 8.2 m/s ramp; flight is ballistic within 1.5 mm; there is no net vertical drift; reproduction is deterministic; gameplay is neutral with animation on or off; with the switch off the page reproduces V1.3 bit for bit.
   - **Pass only at 1.45 and 3 m/s:** joint continuity.
   - **Pass only at 3 m/s:** the 60 Hz COM velocity and the vertical-force bounds.
   - **Pass from 1.45 to 4.2 m/s and at 7.5:** planted-foot slip. It fails at 5.5, 6.5 and 8.2 m/s.
   - **Fail everywhere:** the angular-state rows (estimator agreement and flight conservation).
   - **Against V1.3,** position and velocity jumps, flight ballistics and vertical force improve by one to three orders of magnitude (§2). At 6.5 – 8.2 m/s, however, the horizontal 60 Hz COM-velocity disagreement and the angular rows are worse than V1.3. The slice does not meet its own criteria.
2. **Valid physical-promotion frames per speed** (speed fixtures, 228 frames each), LC-1 vs V1.3:

   | speed (m/s) | 1.45 | 2.2 | 3.0 | 4.2 | 5.5 | 6.5 | 7.5 | 8.2 |
   |---|---|---|---|---|---|---|---|---|
   | LC-1 | 99 | 28 | 30 | 22 | 45 | 20 | 30 | 11 |
   | V1.3 | 84 | 16 | 15 | 22 | 41 | 19 | 5 | 0 |

   None of them also passes PR-2 v2 (§3, §5).
3. **How long does a promoted unobstructed runner stay coherent?**
   - Typically 6 ticks at walking, 4 at 3 m/s and 2 at 4.2 – 8.2 m/s; at most 12 (§4).
   - On PI-1 records it is 2 – 4 ticks from the latest valid frame, against about 1 for V1.3.
   - Two records stay coherent through contact or closest approach with LC-1 (rx_free_leg, rx_miss); one, marginally, with V1.3.
4. **PI-1 blockers that disappear:**
   - "no valid promotion frame" for rx_free_leg, rx_late_stance, rx_airborne and rx_rear;
   - rx_miss's phantom physical contact: the promoted runner now stays clear of the stand-in;
   - rx_free_leg's P-17 (B6) at the promotion frame;
   - the 12 mm root-bone lift;
   - the total absence of valid frames at 7.5 m/s in long runs (5 → 30 of 228 in the fixtures; still 0 in the three PI-1 sweep windows).
5. **Blockers that remain genuine collision / geometry / architecture problems** (§6):
   - **Missing locomotion while promoted** (architecture). It limits coherence to a few ticks and fails CG-4 / CG-6 / CG-2 wherever the decisive contact is more than about 2 ticks after promotion.
   - **PR-2 v2 fails in every promotion.** In moving runs the velocity part alone is 20 – 49 mm: the PI-1 §6.2 60 Hz backward-difference velocities misrepresent fast limbs (handoff architecture). The rest is missing locomotion.
   - **The inscribed gameplay foot capsule vs the F0 boot (B1, collision geometry).** It now fails rx_behind_standing too: that case's REV2 pass depended on the 12 mm root-bone bug.
   - **The stand-in:** rx_miss fails only stand-in tracking, 10.39 vs 10 mm; rx_side_standing's slider stop is 10.8 mm.
   - **The shared law's vertical path is not physical,** and the simulation's collision legs inherit it. A physical presentation therefore departs from the gameplay legs by several centimetres (presented legs vs simulation legs p50 63 – 112 mm for LC-1, against 21 – 93 mm for V1.3).
   - **Class result under the instructed scan:** LC-1 NEAR MISS 0 / RECOVERABLE 0 / PLANTED-LEG FALL 0; the V1.3 control 0 / 1 / 0.
6. **Does anything suggest a V2 body limitation?** No new one. The few hard-limit (P-12) first failures come from imported velocity plus frozen posture, as before. The rigid boot's toe pivot (B7) is still the only V2-body limitation; P-9 foot-contact failures still appear at late-stance frames.

## 1. What was built (presentation only)

`anim3d/of_loco_cont.js`, behind `OF_CONT.on`. Details and the development history are in `LC1_IMPLEMENTATION_FREEZE.md`.

| item | implementation |
|---|---|
| joint channels (D1) | an exact copy of the law's leg and arm channels (verified 0° difference), with the C1 corner rounding Δm(h − \|τ\|)²/4h over one render frame at every breakpoint and max() crossover. It departs from the law by at most 2.2° at 3 m/s and 5.3° at 7.5 m/s. |
| vertical COM (item 1, D2) | running: the spring-mass model, half-sine stance force (Morin et al. 2005) plus ballistic flight, timed by the gait's own phase, with the landing foot on the pitch at the simulation's planted onset. Walking: both feet's sole requirements by a C1 max, with the swinging leg ramped in over the descending half of single support. |
| horizontal COM (D3) | the COM follows the authoritative root plus its low-passed mean offset. The pelvis moves about ±2 mm laterally and −4 … +9 mm fore-aft at 3 m/s; about ±8 mm laterally and ±13 mm fore-aft at 7.5 m/s. |
| plants (item 2, D4) | a rigid foot rolling without slipping on a convex sole (heel pad, rocker, ball); C1 engagement to rest at the simulation's planted onset; inertialized release (rotation vectors, exact rate match); a hinge-plane knee pole; a reach clamp with saturation below full extension; a smooth swing-clearance lift |
| root-bone bug (item 3, D5) | the ground clamp skips the rig root. Standing runners are exactly 12 mm lower where V1.3's bogus lift was active, and nothing else moves. |
| PR-2 (item 4, D6) | PR-2 v2: over k_p → k_p + 1, the physical joint displacement against the presentation's displacement over the same frame, ≤ 3 mm. It is evaluated in the scan with a velocity-part decomposition. |
| angular handoff state (item 5, D7) | AH-1: whole-body rotation = the authoritative facing rate; the rest is the presentation's motion relative to its locomotion frame. The correction is 0 in every PI-1 fixture (straight runs), so the scan's imported angular state is AH-1's. |

## 2. Did the locomotion become continuous? (LC-1 … LC-8)

**Fine-rate construction runs, 3,840 Hz.** Synthetic straight runs on the frozen code, which is bit-exact with the page. The table gives the worst per-step velocity change in m/s; the limit is 0.18 (`evidence/fine/`).

| run | pelvis (LC-1 / V1.3) | COM (LC-1 / V1.3) | worst rig joint, LC-1 | V1.3 | LC-1 joint-steps over the limit |
|---|---|---|---|---|---|
| 1.45 | 0.034 / 96.6 | 0.045 / 103.8 | **0.148** | 480 | 0 |
| 2.2 | 0.058 / 83.6 | 0.052 / 78.3 | 0.406 | 218 | 13 |
| 3.0 | 0.046 / 46.1 | 0.054 / 45.0 | **0.167** | 322 | 0 |
| 4.2 | 0.046 / 112 | 0.052 / 115 | 0.235 | 412 | 57 |
| 5.5 | 0.061 / 53.5 | 0.103 / 63.7 | 0.258 | 638 | 176 |
| 6.5 | 0.089 / 73.4 | 0.099 / 70.1 | 0.376 | 697 | 777 |
| 7.5 | 0.060 / 94.6 | 0.085 / 86.7 | 0.311 | 756 | 970 |
| 8.2 | 0.089 / 110 | 0.108 / 102 | 0.570 | 797 | 2,388 |
| ramp 1.0 → 8.2 | 0.046 / 179 | 0.142 / 164 | 1.557 | 797 | 405 |

- **LC-1a (pelvis / COM): PASS at every speed and in the ramp.** V1.3 jumps.
- **LC-2 (joints): PASS at 1.45 and 3.0, FAIL elsewhere.**
  - Rounding the law's cusps within one frame already gives 0.088 / 0.164 / 0.200 per step at 3 / 5.5 / 7.5 m/s, from D1 alone. The law's own sprint hip reverses at 17 rad/s.
  - The plants add steep but continuous accelerations at heel strike and toe-off.
  - The ramp's 1.56 is a defect found after the freeze (defect 1 below).
- **LC-6c:** fine-rate runs repeat identically.

**60 Hz page exports, V2 body by the frozen mapping** (`evidence/eval_*.json`). Speed fixtures, LC-1 (V1.3 in brackets):

| speed | LC-1b COM velocity well-defined (h, v max m/s) | LC-3 planted slip max | LC-4a ballistic flight max | LC-4b vertical force (BW) | LC-4c | LC-5a | LC-5c |
|---|---|---|---|---|---|---|---|
| 1.45 | 0.09, 0.30 FAIL (0.80, 2.36) | 2.0 mm pass | no flight | −0.70 … 4.17 FAIL (−11.7 … 19.1) | pass | 0.32 FAIL | – |
| 2.2 | 0.16, 0.59 FAIL (0.34, 3.83) | 3.6 mm pass | no flight | −2.26 … 5.70 FAIL (−14.1 … 32.8) | pass | 0.56 FAIL | – |
| 3.0 | **0.17, 0.09 pass** (0.71, 3.57) | 0.01 mm pass | **0.45 mm pass** (13.8) | **0.01 … 1.94 pass** (−20.5 … 30.1) | pass | 0.47 FAIL | 14.8 mm FAIL |
| 4.2 | 0.36, 0.13 FAIL (0.98, 5.33) | 0.01 mm pass | 0.67 mm pass (19.0) | −0.32 … 2.78 FAIL (−29.1 … 37.1) | pass | 1.17 FAIL | 38.9 FAIL |
| 5.5 | 0.53, 0.17 FAIL (1.03, 4.05) | **10.2 mm FAIL** | 0.78 mm pass (16.9) | −0.80 … 3.00 FAIL (−25.8 … 37.9) | pass | 2.03 FAIL | 84.6 FAIL |
| 6.5 | 0.71, 0.32 FAIL (1.77, 8.72) | **32.8 mm FAIL** | 1.19 mm pass (18.1) | −1.01 … 3.56 FAIL (−47.5 … 59.2) | pass | 2.07 FAIL | 119 FAIL |
| 7.5 | 0.94, 0.24 FAIL (0.43, 3.69) | 0.01 mm pass | 1.39 mm pass (17.1) | −1.43 … 3.04 FAIL (−16.7 … 36.6) | pass | 2.85 FAIL | 136 FAIL |
| 8.2 | 0.98, 0.39 FAIL (0.42, 8.31) | **68.7 mm FAIL** | 1.54 mm pass (24.4) | −2.17 … 4.71 FAIL (−37.8 … 63.8) | pass | 3.19 FAIL | 182 FAIL |

- **LC-5b (whole-body rotation = authority)** passes everywhere (straight runs).
- **PI-1 records (26), pass counts LC-1 / V1.3:**

  | row | LC-1 | V1.3 |
  |---|---|---|
  | LC-1b | 8 / 26 | 2 / 26 |
  | LC-3 | 14 / 22 | n/a |
  | LC-4a | 22 / 22 | 0 / 22 |
  | LC-4b | 9 / 26 | 2 / 26 |
  | LC-4c | 12 / 13 | 8 / 13 |
  | LC-5a | 2 / 26 | 2 / 26 |
  | LC-5c | 0 / 22 | 0 / 22 |

  The six defending fixtures (the runner dribbles) fail most rows; see defect 3.

**LC-1 is worse than V1.3 on some rows at 6.5 – 8.2 m/s:**
- horizontal COM-velocity disagreement: 0.94 vs 0.43 m/s at 7.5, 0.98 vs 0.42 at 8.2;
- LC-5a: 2.85 vs 1.97 at 7.5, 3.19 vs 2.35 at 8.2;
- LC-5c: 119 vs 96 mm at 6.5, 136 vs 87 mm at 7.5.

The vertical components improve at every speed.

**What the failures are:**
- **LC-1b, LC-4b and LC-5a** fail where fast limbs make 60 Hz finite differences of the V2 COM unreliable. A smooth construction with high jerk shows backward / central estimator disagreement of about j·Δt²/2.
  - The V2 body (different masses, RF-1, IK-modified legs) is not the presentation's own de Leva COM, so the rendered COM is not exactly the model's.
  - The force minima of −0.3 … −2.2 BW sit at stance / flight transitions; the peaks are 2.8 – 5.7 BW.
- **LC-5c** (flight angular momentum, 15 – 182 mm) fails because the procedural limbs do not conserve angular momentum in flight. LC-1 never claimed to change that; AH-1 only stops it entering the handoff beyond the instantaneous state.

**Identity rows** (`evidence/identity.json`):

| row | result |
|---|---|
| LC-6a | the page export repeated is bit-identical: presentation and rows, all 34 records |
| LC-7 | gameplay hashes identical across OFFNP / OFF / FULL / LOCO, with LC-1 on and off, on the repeat, and against the V1.3 baseline: 26 / 26 PI-1 records and 8 / 8 speed fixtures |
| LC-8 | OF_CONT off reproduces the 26 V1.3 records bit for bit; the D1 law copy is exact |

All three pass.

**Defects found in the official evaluation.** None were fixed afterwards (stop rule); each fix is named.

1. **Early release then re-engagement in the walk / run blend zone** (the ramp at 2.69 m/s). The divergence release fires mid-stance (authored foot 0.29 m from its anchor) and the foot re-engages the next tick because the stance continues. **Fix:** wait for the next stance.
2. **At 60 Hz the stance-onset tick falls up to 16 % into a sprint stance.**
   - By then the authored stance foot is 4 – 8 cm below the pitch (the spring-mass pelvis is lower than the law's leg geometry).
   - The rapidly changing clearance lift enters the engagement's starting state, so the anchor lands up to 24 cm away. The foot slides through the 50 ms engagement (half a sprint stance) and then cannot reach the anchor (LC-3 at 5.5 / 6.5 / 8.2).
   - The 3,840 Hz development runs engaged at the exact onset and never showed it.
   - **Fix:** start engagement from the state back-extrapolated to the onset, and exclude the clearance lift from stance-phase feet.
3. **Overlays.** Ball touches, kicks and defending keep the V1.3 path for that foot (by design, §3.4), and the hand-over between a V1.3 lock and the layer is not continuous. The dribbling fixtures show 14 – 40 mm slip and force spikes. **Fix:** route overlay plants through the layer.

## 3. Valid promotion frames

Speed fixtures (above): LC-1 has more valid frames at 7 of 8 speeds and equal at 4.2; at 7.5 m/s 30 against 5, at 8.2 m/s 11 against 0. **None passes PR-2 v2** (284 / 284 tested fail, §4).

PI-1 records, pre-contact window (LC-1 / V1.3):

| case (speed) | valid frames LC-1 / V1.3 | latest frame's lead to contact (ticks) LC-1 / V1.3 |
|---|---|---|
| rx_airborne (7.5) | 8 / 0 | 6.5 / – |
| rx_late_stance (7.5) | 5 / 0 | 2.75 / – |
| rx_early_stance (7.5) | 3 / 4 | 6.5 / 8.5 |
| rx_sprint, rx_heavy, rx_light (7.5) | 0 / 0 | – |
| rx_free_leg (3.0) | 5 / 2 | 2.25 / 14.25 |
| rx_miss (3.0) | 6 / 3 | 2.5 / 5.5 |
| rx_rear (3.0) | 5 / 2 | 4.75 / 16.75 |
| rx_jog, rx_planted_leg (3.0) | 5 / 3 | 9.75 / 21.75 |
| rx_glancing (3.0) | 6 / 5 | 16.75 / **1.75** |
| rx_square (3.0) | 6 / 4 | 12.5 / 11.5 |
| rx_lateral (5.5) | 2 / 9 | 8 / 6 |
| rx_rear_diag (5.5) | 2 / 9 | 3 / 1 |
| rx_front_diag (5.5) | 9 / 10 | 10.5 / 6.5 |
| standing (rx_behind_standing / facing_front / side_standing / standing) | 43 / 44 / 3 / 0, equal for V1.3 | 0.5 / 0.25 / 0.5 / – |
| sl_loose (6.0) | 11 / 20 | 28.25 / 9.25 |
| other sl_* | 0 – 2, equal | – |

**LC-1 is not uniformly better.** It loses valid frames at 5.5 m/s (rx_lateral, rx_rear_diag; slip defect 2) and loses rx_glancing's near-contact frame.

## 4. How long a promoted unobstructed runner stays coherent

Frozen coherence set (RC-4, CG-4 against the simulation's segments, CG-2, P-12, NM-2 slip), HG-A v2 initialization, the REV2 plant with no tackle.

**Speed fixtures, every valid frame, 30-tick horizon** (`evidence/coh_on_speed.json`):

| speed | runs | coherent ticks p50 / p90 / max | through 30 ticks | first failures | PR-2 v2 p50 (min) |
|---|---|---|---|---|---|
| 1.45 | 99 | 6 / 7 / 12 | 0 | CG-4 sim 66, CG-2 30, slip 8 | 14.1 (4.5) mm |
| 2.2 | 27 | 6 / 6 / 6 | 1 | slip 20, CG-4 sim 16 | 20.8 (12.2) |
| 3.0 | 30 | 4 / 4 / 4 | 0 | CG-4 sim 25, slip 12 | 27.2 (17.9) |
| 4.2 | 22 | 2 / 3 / 4 | 0 | slip 12, CG-2 11 | 32.1 (15.2) |
| 5.5 | 45 | 2 / 3 / 4 | 0 | slip 32, CG-4 sim 13 | 34.1 (12.5) |
| 6.5 | 20 | 2 / 3 / 3 | 0 | CG-4 sim 11, slip 10 | 61.7 (23.2) |
| 7.5 | 30 | 2 / 2 / 2 | 0 | CG-4 sim 26 | 60.8 (34.3) |
| 8.2 | 11 | 2 / 2 / 2 | 0 | CG-4 sim 11 | 89.8 (83.0) |

**PI-1 records, the latest three valid frames** (`evidence/drift_pi1_*_rows.json`):
- **LC-1:** coherent 2 – 4 ticks.
  - rx_free_leg from lead 2.25 stays coherent through contact.
  - rx_miss from lead 2.5 stays coherent past its closest approach (4 ticks).
  - 1 of 44 runs is coherent through the whole run.
- **V1.3:** coherent typically 1 tick (max 6); rx_rear_diag from lead 1 reaches contact at exactly 1 tick; 0 of 38 runs are coherent through the whole run.

**Cause, unchanged from the investigation:** the promoted body has no locomotion. Posture tone freezes the configuration, the swing legs stop, and the pelvis tether fights the body. LC-1 roughly doubles the coherent interval because the imported state is no longer contaminated by presentation artefacts.

## 5. The promotion scan (REV2 unchanged except HG-A v2; PR-2 v2 and AH-1 reported)

`scripts/scan_lc.mjs` differs from `scan_rev2.mjs` by 31 lines, all of them these changes. The V1.3 control is the same scan on the V1.3 presentation records (`evidence/scan_lc1/`, `evidence/scan_v13/`).

| case (class) | LC-1: promotion and outcome | V1.3 control under the same scan |
|---|---|---|
| rx_miss (NEAR MISS) | k_p 57, lead 2.5. **No physical contact (NM holds).** Fails only AST-C1, stand-in tracking 10.39 mm vs 10. | k_p 54, lead 5.5: fails NM (phantom physical contact) |
| rx_airborne (NEAR MISS) | k_p 54, lead 6.5: fails NM (the drifted foot touches the stand-in torso) | no promotion frame |
| rx_sprint / heavy / light, sl_early / late (NEAR MISS) | no promotion frame / predictor never fires | same |
| rx_behind_standing (RECOVERABLE) | k_p 50, lead 0.5: **fails CG-1.** The F0 boot is struck 65 mm from the ankle; gameplay says shin. | **PASS** (the REV2 result) |
| rx_free_leg (RECOVERABLE) | k_p 47, lead 2.25 (newly promotable): fails CG-4 (0.22 m), CG-6, CG-2 at the decisive contact 12 ticks later | no promotion frame |
| rx_rear_diag, rx_standing (RECOVERABLE) | no promotion frame | rx_rear_diag k_p 43, lead 1: fails CG-4 / 5 / 6 / 2 |
| rx_facing_front (FALL) | lead 0.25: CG-1 (boot) | same |
| rx_side_standing (FALL) | lead 0.5: tackler discontinuity 10.8 mm | same, plus CG-6 |
| rx_front_diag, rx_glancing, rx_lateral (FALL) | no promotion frame | promoted at leads 6.5 / 1.75 / 6: fail CG rows (and AST-C1) |
| rx_jog, rx_planted_leg, sl_from_behind (FALL) | no promotion frame | same |
| rx_early_stance, rx_late_stance, rx_rear (other) | promoted at leads 6.5 / 2.75 / 4.75: fail CG rows | early_stance promoted (fails), others none |

**Class counts (NEAR MISS / RECOVERABLE / PLANTED-LEG FALL):** LC-1 0 / 0 / 0; V1.3 control 0 / 1 / 0. **Promotable:** 9 / 26 vs 10 / 26.

**PR-2 v2 fails in every promotion.**

| case | PR-2 v2 (velocity part), mm |
|---|---|
| rx_free_leg | 24.9 (25.7) |
| rx_miss | 35.5 (25.3) |
| rx_late_stance | 41.1 (20.8) |
| rx_airborne | 56.6 (49.1) |
| rx_early_stance | 99.3 (39.1) |
| V1.3 control | 30 – 134 (20 – 198) |

- The **velocity part** compares the imported joint velocity × 1 frame with the presentation's next-frame displacement. It is the PI-1 §6.2 2nd-order backward 60 Hz estimate failing for fast limbs; the remainder is the missing locomotion drive.
- **Standing cases** (lead 0.25 – 0.5) have the tackle impact inside the first frame.
- **AH-1 correction: 0** in every promotion.

## 6. Blockers

| blocker | status | kind |
|---|---|---|
| HG-A v1 (presentation COM vs authority) | gone: HG-A v2 adopted. The v2 shift bound still rejects most sprint frames, through the 60 Hz estimator. | test (done) / handoff estimator |
| no valid frames near contact (presentation artefacts) | improved for rx_free_leg, rx_miss, rx_late_stance, rx_airborne, rx_rear; worse for rx_glancing, rx_lateral, rx_rear_diag (slip defect 2) | presentation |
| no valid frames at 7.5 m/s | gone in long runs (30 / 228); still none in rx_sprint / heavy / light windows | presentation (60 Hz estimator) |
| rx_free_leg P-17 (B6) | gone at its promotion frame | presentation |
| 12 mm root-bone lift (N5) | gone | presentation bug |
| phantom contact after promotion (rx_miss) | gone | presentation / handoff |
| **missing locomotion while promoted** (B4) | remains: coherent 2 – 4 ticks | **architecture** |
| **PR-2 v2 (velocity part 20 – 49 mm)** | remains: PI-1 §6.2 60 Hz backward-difference velocities cannot represent fast limbs; LC-1 already computes the presentation's continuous derivative internally | **handoff architecture** |
| **inscribed foot capsule vs F0 boot** (B1, CG-1) | remains: rx_facing_front, and now rx_behind_standing, whose REV2 pass depended on the 12 mm bug | **collision geometry** |
| **stand-in tracking / slider stop** | remains: rx_miss AST-C1 10.39 mm; rx_side_standing 10.8 mm | **stand-in architecture / simulation** |
| **gameplay legs follow a non-physical vertical path** | new, measured: presented legs vs the simulation's legs p50 63 – 112 mm (V1.3 21 – 93) | **simulation geometry** (a CHARCOLLIDE baseline change, for a decision) |
| HG-T (tackler extension), B3 (still-extending leg), B5 (standing P-5), B7 (rigid-boot toe pivot) | unchanged | as before |

## 7. A V2 body limitation?

No new one.
- **P-12** appears as a first coherence failure in 4 of 284 unobstructed runs (4.2 / 5.5 m/s). These come from imported momentum plus frozen posture, as in the investigation.
- **Every promoted mapping** was inside V2's range of motion (P-12 is a handoff row).
- **The rigid boot's inability to toe-pivot (B7)** remains the only body-side limitation.

## 8. Costs

- **Gameplay correspondence is worse.** The presented legs depart further from the simulation's collision legs (§6). The shared law's vertical path vaults, with the pelvis highest at mid-stance, and plunges in late stance. A physically sensible vertical path differs from it by up to 12 – 15 cm. The closest admissible alternative was tested and still departs by 47 – 120 mm (freeze note).
- **CPU:** 154 → 694 µs per actor tick (Node). This is a prototype and is not production-ready.
- **The look changes:**
  - lower pelvis in mid-stance with a deeper stance knee;
  - higher swing-foot clearance (a lift up to 7 cm at 3 m/s);
  - the planted foot rolls onto the ball and stays fixed;
  - no flight "bob".

## 9. Browser replay

**Location:** `stride_replay.html` in this folder; self-contained (data embedded, one Google Fonts link); opens from disk.

**What it shows:**
- the same run, V1.3 beside LC-1 (identical gameplay hash);
- 0.05× – 2× playback and frame stepping;
- side / front / top / orbit views that follow the runner;
- overlays: pelvis and COM markers with trails, planted-foot anchors coloured by mode (engaging / planted / releasing), and promotion-valid frames (green body plus a timeline strip);
- COM height and implied vertical force plots.

**Sequences:** 3.0 m/s, 7.5 m/s and rx_planted_leg up to contact.

## 10. Process notes

- **Harness fix:** 33 of 285 speed-fixture drift runs crashed in the harness. After the far tackler's slide ends, its primitive set changes and the 500 m stand-in lookup failed. `scripts/lc_lead_drift.mjs` holds the stand-in at its promotion-time primitives for no-contact records only; that is its only change. The 33 were rerun and summarised with the rest. The stand-in cannot interact there.
- **Shell quoting:** the first batch launches of development jobs failed on paths with spaces; they were rerun as per-job scripts. No data was affected.
- **Development fixes:** all are recorded in the freeze note, made before the official evaluation and only on synthetic runs.

## 11. Files

- `LC1_PREREG.md`, `LC1_IMPLEMENTATION_FREEZE.md`, `LC1_RESULTS.md`, `stride_replay.html`.
- **Scripts:**
  - harness and development: `pres_harness.cjs`, `lc_dev.cjs`, `trace_jumps.cjs`, `d1_identity.cjs`, `law_*.cjs`, `qp_probe.cjs`;
  - official runs: `lc_export.cjs`, `lc_fine.cjs`, `lc_eval.mjs`, `lc_identity.cjs`, `lc_valid.mjs`, `scan_lc.mjs`, `lc_lead_drift.mjs`, `lc_coh_summary.mjs`, `lc_tables.mjs`;
  - replay: `lc_replay_data.mjs`, `replay_template.html`.
- **Evidence** (`evidence/`): fine-rate JSONs, 60 Hz evaluations, valid-frame lists, coherence rows and summaries, both scans, identity, every export's `air_summary.json` (gameplay hashes and record sha256s) and its log, and `tables.txt`.
- **Not in Git** (evidence policy): the page records themselves, about 280 runs, in scratch, identified by sha256.
