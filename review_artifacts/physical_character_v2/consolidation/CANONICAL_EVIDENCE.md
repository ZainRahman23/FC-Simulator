# Physical-interaction evidence: canonical summary (10 Oct 2026)

**Purpose:** one consolidated record of what was tested, what was demonstrated and what failed, from the autonomous-gait counterfactuals (CF-0 … CF-6) to the leg-law investigation.

**Written for:** the external architecture review. Source: `../sources/2026-10-10_user_instruction_pause_consolidate.md`.

**Rules followed:**
- Each verdict uses the original report's own words.
- **Failure classes** map each failure onto this taxonomy: *simulation, presentation, handoff, carrier/controller, physics-body, collision-geometry, solver, test/harness*.
  - Where a report used its own labels, they are quoted. CF series: A = missing gait functionality, B = local transfer / control deficiency, C = fundamental body / contact / actuation limit. SLP series: A = authoritative translation, B = physical support / recoverability, C = leg / skeletal locomotion.
  - "(mapping)" marks a class assignment that is this document's judgement rather than the report's words.
- **Relevance is stated against the current direction.** That direction is the 9 Oct pivot: simulation-authoritative locomotion, with physics only around interactions.
  - "General" means the finding holds for any architecture that keeps this simulation and V2.
  - "Historical" means the finding is evidence for an approach that was ended.
- **Paths and commits:** paths are relative to `review_artifacts/physical_character_v2/`. Commits are on `prototype/physical-character-v2` unless named otherwise.
- **Nothing was re-run** for this document, except the read-only IB-1 extraction (`../interaction_benchmark/`).

**Physical body in every experiment:** V2. G0 – G3 were accepted (2 – 3 Oct). E2 was stopped at E2-22 (0c11450b) and not resumed. The engine is Jolt v5.6.0 WASM at 240 Hz with 150 / 2 iterations (the accepted configuration).

## 1. Overview

| # | experiment | date | verdict (report's words) | failure class | relevance now |
|---|---|---|---|---|---|
| CF-0 | locomotion viability probe | 8 Oct | YELLOW: step 2 never initiated | carrier/controller (A + B; "C: no evidence") | historical |
| CF-1 | between-steps transfer | 8 Oct | YELLOW (strengthened): no physical step 2 | carrier/controller (A, B) | historical |
| CF-2 | trailing-leg swing | 8 Oct | GREEN (provisional, quasi-static): 9 steps × 8 | carrier/controller (A) | historical |
| CF-3 | walking frame + cadence | 8 Oct | GREEN (provisional): 20 steps, bounded | carrier/controller (A, B) | historical |
| CF-4 | momentum-carrying gait | 8 Oct | GREEN (scoped): 20 / 20 bounded, no failure | — (scope: not through touchdown) | historical |
| CF-5 (+ ladder) | continuous walk; speed ladder | 8 Oct | continuous, 19 steps; ≤ 53 mm/s | carrier/controller (A, B) | historical |
| CF-6 | walking-specific gait | 8 Oct | 59 continuous steps at 0.10 m/s; fails 0.2 / 0.4 m/s | carrier/controller ("no C, no V3 evidence") | historical (support-stability evidence) |
| SLP-1 | supported locomotion | 9 Oct | STOPPED at calibration | carrier/controller ("authoring" + cap tension) | historical; cap finding general |
| SLP-1b | legs carry locomotion | 9 Oct | STOPPED at calibration | carrier/controller | historical |
| SLP-2 | A / B / C separation | 9 Oct | STOPPED at calibration; A exact | carrier/controller ("C contact realisation") | A field general; rest historical |
| SLP-2C | contact-compatible legs | 9 Oct | STOPPED at stage 1 | carrier/controller | historical |
| PI-1 / D-1 | promotion prereg; body check | 9 Oct | STOPPED at the D-1 body check | physics-body (variant) + test/harness | superseded case set |
| D-1A | read-only investigation | 9 Oct | recommendation D1C | collision-geometry; test/harness | general (§5.2a rule) |
| V1.2 gate | compatibility gate on V1.2 | 9 Oct | gate FAILS | collision-geometry; physics-body (boot) | general |
| D-1F1 | separate toe body | 9 Oct | regression FAILS on energy passivity | solver | general |
| Track A | toe / warm-start mechanism | 9 Oct | CLOSED as an engine-solver limitation | solver | general |
| Track B | CHARCOLLIDE-1 (V1.3) + F0 gate | 9 Oct | V1.3 neutral; 0 / 26 pass; all classes BLOCKED | physics-body vs presentation; collision-geometry; handoff | V1.3 = current baseline |
| REV1 | knee PM-2, RF-1, tackler | 9 Oct | HARD STOP | handoff; presentation; physics-body | current |
| REV2 | strict handoff, PS-2, AST-1 | 9 Oct | HARD STOP: 0 / 1 / 0 | presentation; collision-geometry; simulation; handoff; carrier/controller | current |
| HG-A | promotion-momentum investigation; v2 | 9 Oct | v1 "conceptually wrong"; v2 ADOPTED | test/harness (criterion); presentation | general (H7) |
| MH | moving-runner handoff | 9 Oct | sources traced; drift 1 – 6 ticks | presentation; carrier/controller | current |
| LC-1 | locomotion-presentation continuity | 9 Oct | "did not become continuous by the preregistered criteria" | presentation; simulation (exposed) | current |
| PCI | promotion-carrier investigation | 10 Oct | not a translation failure; legs | carrier/controller; test/harness (erratum) | current |
| PCS-1 stop / AST-1E | frame recheck; extending stand-in | 10 Oct | STOPPED ×2; fixed by A2 | test/harness; solver (engine build) | AST-1E fixture general |
| PCS-1 | promotion-carrier slice | 10 Oct | STOPPED at case 1: "core architecture is not yet demonstrated" | carrier/controller; simulation (contributing) | current |
| LL | leg-law investigation | 10 Oct | law vertical non-physical; carrier actuation binding | simulation; carrier/controller | current |

## 2. Experiments

### 2.1 Autonomous-gait counterfactuals (ended 8 Oct, pivot 836437bc; CF-1 … CF-6 kept as evidence)

All CF artifacts are in `diagnostics/`. The summary table is in `diagnostics/README.md`.

**CF-0 — locomotion viability probe** (9595dcbc; `loco_probe_2026-10-08/`).
- **Question:** can step 1 feed step 2?
- **Demonstrated:** step 1 is clean on 4 bodies × 2 sides × 2 step kinds.
- **Failed:** step 2 is never initiated. The between-steps transfer cannot reach the next single support.
- **Class:** carrier/controller (A + B; "C (fundamental limitation): no evidence").
- **Relevance:** historical.

**CF-1** (5b87cbdf).
- **Question:** with the transfer supplied, do steps chain?
- **Demonstrated:** the forward transfer works (DCM error 0.4 mm; trailing foot released).
- **Failed:**
  - the planner refuses the trailing-leg swing: ankle 2.7 – 5.3° beyond its soft bound, hard limits satisfied (A);
  - on a wide stance the trailing foot keeps 1.2 – 1.6 % BW (B).
- **Class:** carrier/controller.
- **Relevance:** historical.

**CF-2** (dafecd52).
- **Question:** with the trailing swing supplied, does V2 chain physical steps?
- **Demonstrated:** 9 consecutive genuine alternating steps on 4 bodies × 2 sides (72), every physical metric stationary.
- **Failed:** step 10. The planner's stance-foot heading frame narrows the stance by 12.4 mm per step until the footholds overlap (A).
- **Class:** carrier/controller.
- **Relevance:** historical.

**CF-3** (51461abe).
- **Question:** what happens when momentum is inherited?
- **Demonstrated:** 20 consecutive bounded steps on 4 bodies. Momentum is carried through double support (COM ≤ 0.15 m/s).
- **Failed:**
  - toe-out creep of 0.08° per step (A);
  - the release rule restarts every swing from rest, ≥ 4.3 s per step (B);
  - the nominal 1.5 s plan is refused (A).
- **Class:** carrier/controller.
- **Relevance:** historical.

**CF-4** (bb6505d7).
- **Question:** does V2 stay bounded when every swing starts with momentum?
- **Demonstrated:** 20 / 20 bounded periodic steps (60 / 60 extended) on 4 bodies at 2.75 and 1.73 s per step, with forward COM 23 – 46 mm/s inherited.
- **Failed:** nothing. Not tested through touchdown: the E2 stop-step swing brakes before each touchdown (A).
- **Relevance:** historical.

**CF-5** (30273b13) **and speed ladder** (ab78bee2).
- **Question:** does momentum survive touchdown, and how fast?
- **Demonstrated:**
  - 19 consecutive continuous steps on each body (capped at 20);
  - forward COM 24 – 26 mm/s at every touchdown;
  - continuous up to 53.0 mm/s on V2-REF (0.89 steps/s), 43 mm/s on all bodies.
- **Failed:**
  - 0.034 m/s base speed (A step length / timing, B DCM lag);
  - first refusal at 0.98 steps/s: the E2 stop-step capture certificate rejects every corridor node (A, driven by B).
- **Class:** carrier/controller.
- **Relevance:** historical.

**CF-6** (prereg 1e98e1d1, results b6edadcd, replay 7651a254, closure 836437bc; `loco_cf6_2026-10-08/CF6_CLOSURE.md`).
- **Question:** how far toward human walking speed does the unchanged V2 climb with walking-specific mechanisms?
- **Demonstrated:** V2-REF walks continuously at **0.10 m/s**: 60 / 60 physical steps, 59 consecutive continuous, periodic within 3, nothing accumulates.
- **Failed:**
  - 0.4 m/s at step 2, and 0.2 m/s at step 9;
  - both at the double-support handover: lifecycle acceptance consumed 77 – 85 % of the transfer (A); DCM lag (B); CoP pin (B); passive release (B on A);
  - saturation ≈ 0 and margins > 5° in every divergence;
  - other bodies not run (frozen stop rule).
- **Class:** carrier/controller ("no C, no V3 evidence").
- **Relevance:** historical. The user's recorded reading: evidence of repeated physical support stability, "not production-quality walking".

### 2.2 Supported locomotion (SLP; ended 9 Oct, pivot e01bb677; code paths "1" / "1b" / "2" / "2c" preserved)

**SLP-1** (prereg 49785b7a, impl a38e8faa, results 627d9350; `slp1/SLP1_RESULTS.md`).
- **Question:** can V2-REF be externally driven at 1.2 / 3 / 6 m/s as a genuine contactable body, and at what CPU cost?
- **Demonstrated:**
  - support integrity: no writes, caps respected;
  - loss of support without a state reset;
  - determinism 9 / 9;
  - regressions 106 / 106 and 58 / 58.
- **Failed:** the calibration stop.
  - Walk: support saturated on 68 – 93 % of ticks and carried 74 – 88 % of BW.
  - Jog / run: forward cap → lag → fall.
  - No CPU saving: 933 – 952 vs 892 µs per step.
- **Class:** carrier/controller ("primarily locomotion authoring … plus one architecture-level tension (recoverability-derived caps also carrying ordinary locomotion). No V2 body limit").
- **Relevance:** historical. The cap tension is general.

**SLP-1b** (amendment 1137244c, results e4f572f7).
- **Question:** does calibration pass if the legs carry ordinary locomotion?
- **Demonstrated:** before the first cap saturation, the legs carry 78 – 123 % of BW with pitch ≤ 1.5°.
- **Failed:**
  - no configuration meets A1 – A8;
  - falls at 2.08 – 6.91 s, or dragged;
  - the support supplies 52 – 88 % of the positive forward impulse.
- **Class:** carrier/controller ("architecture … plus authoring gaps. No V2 body limit").
- **Relevance:** historical.

**SLP-2** (separation decision a9450d17, prereg 03455b88, results e3c99e1c; `slp2/SLP2_RESULTS.md`).
- **Question:** with A (uniform field α·m_i·a_T) supplying translation, B support and C legs, does it stay inside the support budget?
- **Demonstrated:** **A delivered exactly M·v** (94.69 / 236.7 / 473.46 N·s), reading no state, applying no torque, writing nothing, at ≈ 3 – 7 µs per step.
- **Failed:**
  - the legs braked net −202 … −369 N·s;
  - B absorbed it up to its cap, then pitch collapse;
  - A9 / A10 failed at all speeds.
- **Class:** carrier/controller ("failure = C contact realisation …; no V2 body limit").
- **Relevance:** the A field is general (an exact translation term). The rest is historical.

**SLP-2C** (prereg b35b31ac, results e63be8b3).
- **Question:** do contact-compatible legs pass the walk stage?
- **Demonstrated:** C is physically real: planted slip 0.0 mm, legs 102 % of BW before collapse, no writes.
- **Failed:** fall at 2.358 s.
  - C2 overshot into stance propulsion (+27.4 N·s).
  - The C1 swing was unfollowable: lag ≤ 0.88 m and toe-down drag of −62.6 N·s.
- **Class:** carrier/controller.
- **Relevance:** historical. With SLP-2 it is the basis of the adopted conclusion that "fully physical foot-ground contacts are not required during ordinary unobstructed locomotion" (`PHYSICAL_CHARACTER_ARCHITECTURE_PIVOT.md`).

### 2.3 Promotion into physical interaction (PI-1 and its revisions)

**PI-1 preregistration and D-1 body check** (prereg 6ef7e1eb, stop 529d8a5c; `pi1/PI1_STOP_D1_BODY_CHECK.md`).
- **Question:** can a runner be promoted into V2 for the Tackled-Player V1 (f5f6076) cases?
- **Demonstrated:** the AIR export (3 cases × 4 modes); gameplay hashes identical across modes; the baseline reproduces.
- **Failed:**
  - the record body's joint spacing is outside the anatomical bands;
  - the G0 checks do not recognise profile overrides;
  - **G1 isoSelfCol** boot↔boot penetration 24.6 mm (> 10 mm).
  - A "weight-bearing mismatch" was reported; it was later withdrawn as a one-tick record-reading error.
- **Class:** physics-body (variant, stress test); test/harness (G0 recognition; the withdrawn mismatch).
- **Relevance:** the case set was superseded (D1C).

**D-1A** (6726ad5b; decision d000cee1; `pi1/PI1_D1A_INVESTIGATION.md`).
- **Demonstrated:**
  - the isoSelfCol state is unreachable in PI-1 motion (closest boot↔boot 205 mm);
  - the "mismatch" does not exist;
  - the recover clip is representable.
- **Failed:** the recorded planted-leg collision is not representable.
  - The V1 capsules sweep the planted foot by 33 – 64 mm. The D-1 boot is only grazed (≤ 9.5 mm), 12 – 17 ms later.
  - The authored fall is not V2-representable.
- **Class:** collision-geometry; test/harness.
- **Relevance:** general. It produced the rule that "gameplay collision primitives that drive physical presentation need an explicit mapping to the rendered / physical geometry".

**V1.2 compatibility gate** (thresholds ab9a6265 before any record; results 3a140dba; `pi1/PI1_V12_GATE_RESULTS.md`).
- **Demonstrated:**
  - V1.2 supplies near miss / recoverable / planted fall by its own rules;
  - hashes identical across modes;
  - near miss passes;
  - R-K knee centres exact (≤ 0.004 mm).
- **Failed:**
  - both contact cases fail CG-1 / CG-5 (segment / region) and CG-7;
  - none of the other 16 fixtures passes;
  - the gameplay capsules are not derived from the rendered / physical leg;
  - the rigid 0.22 m V2 boot vs the presentation's 0.27 m foot + toe: toe-pivot frames need 5.8 – 15.6° extra pitch, or are unreachable.
- **Class:** collision-geometry; physics-body vs presentation (boot) (mapping).
- **Relevance:** general.

**D-1F1 toe body** (design 7c090de0, impl 8d2c04b1, stop 0ddba2b2; `pi1/f1/F1_TOE_FAILURE_REPORT.md`).
- **Demonstrated:** exact construction; spec hashes unchanged; isoSelfCol 24.59 → 13.84 mm.
- **Failed:** energy passivity: drop1m +3.607 J in one landing step; leanF +0.741 J.
- **Class:** solver (see Track A).
- **Relevance:** general.

**Track A** (prereg 34cb41ae, mechanism c94ff5de, results dc9b35f8; `pi1/track_a/TRACK_A_RESULTS.md`).
- **Demonstrated:**
  - **Mechanism:** a separate 0.198 kg toe (contact effective mass 0.027 – 0.155 kg) makes the foot support subsystem ill-conditioned for sequential impulse. Warm start carries the unconverged remainder as positive work.
  - Reproduced bit for bit by single-step replay.
- **Failed:** no warm-start policy fixes it within the accepted configuration.
- **Class:** solver ("not evidence against V2's anatomy").
- **Relevance:** general for light articulated contact links in this engine configuration.

**Track B, CHARCOLLIDE-1 / V1.3** (prereg dd88ee91, A1 469d7ef8, profile 3e28e020, impl 0a607636, A2 6802742f, results e48fa5d9; V1.3 = 5042230 on `prototype/slide-contact-v1.3-charcollide`; `pi1/trackB/TRACKB_RESULTS.md`).
- **Demonstrated:**
  - **V1.3 neutrality:** V1.2 hashes reproduced without profiles 19 / 19; modes identical 26 / 26; export twice 20 / 20.
  - All three classes occur naturally.
- **Failed:** **0 / 26 pass the gate.** The blockers:
  - F0 boot vs presentation toe pivot / heel strike (P-9);
  - R-K twist rates (P-15 / P-17);
  - CG-1 / CG-4;
  - rx_behind_standing fails only CG-7 tackler continuity (17.9 vs 10 mm);
  - F0 is pose-compatible only in pre-heel-strike windows of ≤ 7 frames.
- **CPU:** CHARCOLLIDE body 67 vs 3 µs per call.
- **Tooling:** a gate fails-overwrite bug was fixed before any reported result (pre-fix output kept).
- **Class:** physics-body vs presentation; collision-geometry; handoff; test/harness (fixed).
- **Relevance:** V1.3 is the current gameplay baseline and the IB-1 source.

**PI-1 REV1** (prereg c437d0c0, results d7d49e00; `pi1/rev1/PI1_REV1_RESULTS.md`).
- **Demonstrated:** RF-1 raised the eligible frames from 6 to 10 / 26; authority held.
- **Failed:**
  - the rigid stand-in diverges from the sweeping far-rule slide leg (endpoints 112 – 1,050 mm);
  - PM-2 is worse than R-K;
  - the R-K spin comes from the presentation's plant-IK steps (≈ 4.5° knee-plane jump per frame) against the hinge knee;
  - the rigid boot cannot reach the turf at toe pivot (≥ 22.9 mm);
  - gate 0 / 26.
- **Class:** handoff (stand-in); presentation; physics-body (boot reach).
- **Relevance:** current.

**PI-1 REV2** (prereg f8cd44a2, A1 f2016c63, A2 cf1d4124, results 881f5b39; `pi1/rev2/PI1_REV2_RESULTS.md`).
- **Demonstrated:** **rx_behind_standing passes end to end at the handoff and contact level**:
  - zero handoff discontinuity;
  - AST-1 tracking 0.05 mm;
  - the physical contact on the same segment at the same sub-step, 37 mm apart.
  - Valid frames 3 / 26, all standing.
- **Failed:**
  - NEAR MISS 0 and PLANTED-LEG FALL 0;
  - no moving runner gets a valid frame;
  - the binding blocker is HG-A (presentation COM velocity 2.2 – 4.0 m/s frame to frame);
  - rx_facing_front CG-1 (the inscribed boot struck 93 mm from the ankle);
  - rx_side_standing 10.8 vs 10 mm: the simulation's own `SLIDER_BLOCKED_BY_FALLER` stop, 3.0 → 0.4 m/s in one sub-step;
  - HG-T; long-lead drift;
  - hand-back (DG) not tested.
  - E1: my CG-6 measurement error, corrected, with no count change.
- **Class:** presentation; collision-geometry; simulation (slider stop); handoff; carrier/controller (drift); test/harness (E1).
- **Relevance:** current. The standing pass was later shown to depend on a presentation bug (LC-1, §4 item 2).

### 2.4 Handoff and locomotion continuity

**HG-A investigation and HG-A v2** (proposal 192816bc frozen before any count; results 09d67d96; adopted cf144e89; `pi1/hga/`).
- **Demonstrated:**
  - The presentation is correct on average: cycle-mean COM velocity within ≤ 0.015 m/s.
  - It is non-physical frame to frame. In flight: implied horizontal force median 0.7 BW; torque median 871 N·m; pelvis jumps ≤ 72 mm.
  - A uniform shift to M·v_auth gives exact momentum and keeps L and relative velocities.
  - HG-A v1 was "conceptually wrong" and was replaced by v2 (exact; |s| ≤ 0.18 m/s).
- **Failed:** representatives unchanged at 0 / 1 / 0, because long-lead drift binds.
- **Open findings:**
  - N1: vertical COM velocity up to 10 m/s and non-conserved L are imported unbounded;
  - N2: the PR-2 REV2 reading fails every moving promotion;
  - N3: contact-flagged feet are not stationary;
  - N4: "angular motion" was implemented as linear only.
- **Class:** test/harness (the criterion's definition); presentation.
- **Relevance:** general (IB-1 H7).

**Moving-runner handoff** (1846be46; `pi1/moving_handoff/MOVING_HANDOFF_INVESTIGATION.md`).
- **Demonstrated (the presentation sources):**
  - the pelvis-height pose term (flight −6 … −9 BW extra);
  - plant-IK transitions (locks off: valid frames 20 → 75 / 302; legs vs simulation 82 – 92 → 13 – 16 mm);
  - a root-bone ground-clamp bug (12 mm drops);
  - the stride clock (0.865 m) vs the rig (0.834 m).
- **Failed:** from valid frames, coherence holds 1 – 2 ticks typically, ≤ 6; 0 / 78 runs stay coherent through 30 ticks.
  - The causes were recorded as: A, missing locomotion (frozen posture; primary); B, the support tether at a fixed height; D, imported vertical. C (V2 body): none.
  - The PR-2 REV2 reading was my error.
- **Class:** presentation; carrier/controller; test/harness.
- **Relevance:** current.

**LC-1** (prereg 313280f7, freeze f3cc1f6f on `prototype/locomotion-continuity-v1` 9d57d46, results 19ff19d2; `locomotion_continuity/LC1_RESULTS.md`).
- **Demonstrated:**
  - neutral: 26 / 26 + 8 / 8; with the layer off it reproduces V1.3 bit for bit;
  - pelvis / COM C1 everywhere;
  - ballistic flight ≤ 1.5 mm;
  - more valid frames at 7 / 8 speeds;
  - the promoted runner coherent for 2 – 6 ticks (V1.3: ≈ 1 – 2).
- **Failed:** not continuous by the preregistered criteria.
  - Joint continuity only at 1.45 / 3 m/s.
  - Planted slip fails at 5.5 / 6.5 / 8.2 m/s.
  - Angular rows fail.
  - Three defects not fixed.
  - PR-2 v2 fails every promotion. Its velocity part (20 – 49 mm) comes from the §6.2 60 Hz backward differences.
  - Scan 0 / 0 / 0. rx_behind_standing's REV2 pass depended on the root-bone bug.
  - The presented legs depart further from the gameplay legs (p50 63 – 112 vs 21 – 93 mm) "because the shared law's vertical path is not physically realisable".
  - CPU 154 → 694 µs per actor tick.
- **Class:** presentation; simulation (exposed, not changed).
- **Relevance:** current. It is the presentation PCS-1 used.

### 2.5 Promotion carrier

**Promotion-carrier investigation** (da6b226e; erratum appended fbdb6f55; `promotion_carrier/PROMOTION_CARRIER_INVESTIGATION.md`).
- **Demonstrated:**
  - At the first incoherent tick: root ≤ 9.5 mm, COM ≤ 16.9 mm, |Δv| ≤ 0.25 m/s, but legs 107 – 207 mm off the gameplay legs; B torque at 0.95 – 1.0 of its cap.
  - A **perfect translation carrier with the current legs fails NM-2 at t = 1 in 33 / 33**: a carried planted foot slides 50 mm per tick.
  - The authoritative acceleration is exactly 0 before contact in the three PI-1 cases.
  - Servo / capped tracking would erase collision momentum (27.5 N·s per 0.1 s at the cap vs 20 – 32 N·s exchanges).
- **Erratum:** the proposed frames k39 / k38 came from `valid_on_rx.json`, whose "valid" flag excludes HG-T. This was my error.
- **Class:** carrier/controller; test/harness.
- **Relevance:** current.

**PCS-1 promotion-frame stop and AST-1E** (PCS-1 prereg 8585adc7, stop fbdb6f55; AST-1E prereg 7b77dc5e, A1 bc126117, stop 5e990e08, A2 2306cc00, checks 2a3f24ca).
- **Demonstrated:**
  - K0 law integrity bit-exact (4,928 segments per case);
  - K4b carrier-off = REV2, 92 / 92 bit-identical;
  - AST-1E (extending, then released slide leg) gives frames 47 / 39 / 38;
  - after A2, tracking 0.24 / 0.11 / 0.11 mm; hashes; the near miss stays a miss; contacts on the intended region and time; release clean.
- **Failed:**
  - k39 / k38 fail HG-T (full extension is first reached at frame 43);
  - before A2, stand-in item 2 failed at 12.99 / 13.23 / 12.24 mm: an end-of-step spring target vs Jolt's start-of-step spring error (AST-1 itself 14.45 mm);
  - `OffsetCenterOfMassShape` aborts this WASM build.
- **Class:** test/harness; solver / engine build (mapping).
- **Relevance:** AST-1E is general (a tackler fixture).

**PCS-1 run** (badd7e9c; `promotion_carrier/slice/PCS1_RESULTS.md`).
- **Question:** does the frozen carrier keep a promoted runner coherent until contact and produce the authoritative outcomes?
- **Demonstrated:**
  - determinism (a / b bit-identical);
  - neutrality;
  - identical driver commands with and without the tackler;
  - the stand-in and handoff gate worked.
- **Failed (rx_miss):**
  - coherent for 3 ticks;
  - the swing foot struck the turf at τ 51, 6 ticks early, and slid 141 mm;
  - legs 135 – 248 mm off from τ 53;
  - B saturated on 87 % of steps;
  - the runner fell, and the dragging foot was hit at τ 59.75 (18.75 N·s), **turning a near miss into a contact**.
  - rx_free_leg and rx_planted_leg were not run (hard stop).
- **Class:** carrier/controller (primary). Joint-space targets assume the law's pelvis vertical, 102 – 137 mm above the reached height. Velocity / inverse-dynamics feed-forward asked 2,000 – 3,200 N·m vs ankle capacity 94 – 129 N·m.
  - Also simulation (contributing: the law's non-physical vertical). "No V2 body failure."
- **CPU:** physics 765 µs per step; law / mapping 236 µs per step.
- **Relevance:** current.

### 2.6 Leg-law investigation

(ed582f88; `promotion_carrier/leg_law/LEG_LAW_INVESTIGATION.md`)

- **Question:** is the shared leg law's vertical physically realisable, and what would a correction change?
- **Demonstrated:**
  - The vertical is a geometric by-product of grounding (heel → toe switch at s = 0.62) and a smoothstep + sine bob.
  - At jog and above:
    - two thirds of stance needs a pulling force;
    - flight is −11 … +419 BW;
    - take-off −4.3 … −14.7 m/s;
    - touchdown steps of 3 – 28 mm;
    - the stance foot skates at a mean 3 – 8 m/s;
    - C0 joint cusps.
  - A spring-mass vertical sits 117 – 140 mm lower. It needs a swing-clearance correction at jog (−20 mm) and a reach limit at sprint (+15 / +35 mm).
- **Predicted (not run in PI-1):**
  - **P1:** physically realisable collision legs change **12 / 26 first contacts** (5 class, 7 segment; rx_planted_leg shin → foot), plus 7 timing shifts.
  - **P2:** with a physical proxy reference, the frozen carrier still holds only 0 – 6 ticks, with actuation of 1.4 – 4.5 kN·m, saturating.
  - The V2 hip swing capacity is exceeded from 4.2 m/s (Hill w0 15 rad/s). This is a candidate model limit, not an observed failure.
- **Class:** simulation (the law); carrier/controller (actuation law, binding); physics-body (candidate only).
- **Relevance:** current. P1 bears directly on IB-1: gameplay contacts depend on the law's legs.

## 3. What holds regardless of the next architecture

1. **Simulation authority held in every experiment.** No presentation, predictor or physics run changed a gameplay hash. Evidence: NT rows in V1.2, Track B, REV2, LC-1 and PCS-1; re-verified for IB-1 (`../interaction_benchmark/evidence/ib_verify_run1.txt`).
2. **No V2 body limit has been demonstrated.**
   - One limit is *predicted*: hip swing capacity above 4.2 m/s.
   - One body-variant integrity failure (D-1 isoSelfCol) is unreachable in PI-1 motion.
3. **Solver:** a light separate toe body is not stable in this Jolt configuration (Track A). The rigid F0 foot is what remains.
4. **Collision geometry:**
   - The gameplay runner capsules move on the shared leg law. That law is not physically realisable (LL).
   - Correspondence with the physical body fails in most cases (Track B 0 / 26, CG-1 / CG-4 among the blockers).
   - A physically realisable law would change 12 / 26 first contacts (P1).
5. **Presentation:** the running presentation's frame-to-frame whole-body motion is non-physical (HG-A, MH). LC-1 reduced this but did not remove it.
6. **Moving promoted runner:** **every attempt lost coherence within 0 – 6 ticks** (MH 1 – 2 typically and ≤ 6; LC-1 2 – 6; PCS-1 3; LL P2 0 – 6).
   - The causes recorded were the missing locomotion during promotion and the carrier's actuation law, not translation or the V2 body.
7. **Standing runner:** handoff + contact were demonstrated once (rx_behind_standing, REV2). That pass depended on the presentation's root-bone bug (LC-1).
8. **Never tested:** demotion / hand-back to authoritative locomotion (DG); the physical fall; recovery.
9. **CPU (measured, unoptimised; Node, Apple M4):**
   - promoted V2 physics ≈ 765 µs per 240 Hz step (PCS-1);
   - continuous V2 813 – 957 µs per step;
   - the A field 3 – 7 µs per step;
   - CHARCOLLIDE body 67 µs per call;
   - procedural rig ≈ 0.10 ms per rig per frame (browser).
   - **The interaction counts per match have not been measured.**

## 4. Contradictions and unresolved factual questions found during consolidation

1. **The PI-1 planted-leg representative fails the existing contact-correspondence rows.**
   - rx_planted_leg (REV1 / REV2 / PCS-1's planted-leg FALL) fails CG-1 / CG-3 / CG-5 in the V1.3 gate: the D-1 body is first struck on foot_L, with overlap ratio −0.075 (`pi1/trackB/v13/compat_gate_v13_all.json`).
   - The carrier investigation and PCS-1 selected it without citing that result.
   - Whether a carried body would fare differently was never tested.
   - The rx_jog fixture is the same case (identical drill, gameplay hash 18d95b1d).
   - IB-1 keeps rx_planted_leg (IB1-PL) and adds rx_glancing (IB1-PG), which passes CG-1 … CG-6.
2. **The only end-to-end pass rests on a presentation defect.**
   - REV2's "demonstrated for a standing footballer up to and through the contact" (rx_behind_standing) depended on the 12 mm root-bone ground-clamp bug.
   - Under the LC-1 presentation the same case fails CG-1 (LC-1 B1). Both statements stand as recorded.
3. **"Export twice identical" (DT-4) holds for OFF records and gameplay hashes only.**
   - FULL / LOCO record bytes are not reproducible: they carry a wall-clock `cpu` field. For three cases, a re-export differs only in `cpu` (checked here).
   - Track B's repeat summary covers OFF mode only. No conclusion found relies on LOCO byte identity.
   - IB-1 adds a content hash without `cpu`.
4. **The rx_miss reference time differs by a quarter tick.**
   - PCS-1's τ_ref = 60.5 (`PCS1_PREREG.md` §1, `PCS1_STOP_KP_RECHECK.md`). The simulation's own closest sub-step is τ 60.75 (row 60, slot 2; 0.1056 m; recomputed exactly from the record, matching d_now).
   - The derivation of 60.5 is not recorded.
   - It shifts the rx_miss lead (12.5 → 12.75) and the end of the AST-1E item-2 window. The margins it touches are large (0.24 vs 10 mm; lead ≥ 6). Not re-run.
5. **Exporter field name.** The summaries' `firstPredTick` is a row index (row k = after squad tick k+1). The reports that cite "rows 51 / 41 / 39" use it correctly.
6. **Duplicate and non-discriminating fixtures inflate the scan counts.**
   - rx_jog ≡ rx_planted_leg.
   - rx_heavy / rx_light (tackler 82 / 68 kg) never make contact, so their gameplay is identical (eb9a52a8): they do not exercise mass.
   - These counts include them: "0 / 26" and "planted-leg FALL 0 / 8".
7. **J = 0 with a non-negligible class.**
   - Examples: rx_rear_diag CORRECTION J 0; rx_late_stance CORRECTION J 0; rx_front_diag TUCK→foot_L FALL FRONT J 0.
   - What `J` means for these contacts, and how a physical-impulse metric should compare against them, is unresolved. None of them is in IB-1.
8. **Event `vT` is the striking primitive's velocity, not the tackler root's.** Example: IB1-PL `vT` (−0.817, 4.569) = the LEG primitive's, while the tackler root is (0, 4.808). Any comparison of tackler momentum must say which it uses.
9. **"Planted" at touchdown.**
   - In IB1-PG the struck shin's foot touched down inside the contact tick (simulation `up` 0.0095 at contact). LC-1 flags the foot in contact one row later. V1.3 releases it two rows later while the simulation keeps it planted.
   - IB1-PL is at `up` 0.055.
   - Whether a foot planted < 1 tick counts as weight-bearing for a physical body is not established.
10. **PR-2 v2 measurability.** Part of PR-2 v2's failure (20 – 49 mm) comes from the frozen 60 Hz backward-difference definition itself (LC-1). Whether any architecture can pass PR-2 v2 as frozen is not established.
11. **Reporting artefact in the V1.3 gate output.** When the D-1 body is never struck, the gate writes the CG-5 overlap ratio as −38,910,505.8 (rx_rear). The value is meaningless, but CG-5 is false either way. Not fixed: frozen gate tooling, no effect on any verdict.

## 5. Questions the architecture review must answer

1. **Contact-geometry authority.**
   - Must the gameplay collision legs become physically realisable? That is a gameplay change: 12 / 26 first contacts would change (P1).
   - Or may the physical response differ from the gameplay contact geometry? If so, within which correspondence tolerance (CG-1 / CG-3 / CG-4)?
2. **Before contact.**
   - Must a moving runner be physically coherent from promotion to contact? No attempt exceeded 6 ticks.
   - Or may physical response begin at or after the authoritative contact? If so, what supplies continuity at entry (Q7)?
3. **Body and foot.**
   - Is V2 with the rigid F0 foot the required interaction body? The toe is solver-limited (Track A); the boot vs presentation toe pivot is unresolved (Track B).
   - Is a reduced or different body acceptable?
4. **Hand-back.** What is the contract for returning to authoritative locomotion? It has never been tested (DG).
5. **Presentation as an input.**
   - Is the presentation an input to the entry state? Then its whole-body vertical / angular motion (HG-A N1 – N4) must be addressed.
   - Or is the entry state derived from the simulation alone?
6. **Outcome semantics.** Must physical impulse and momentum match the simulation's contact-model values (`J`, `dvCom`, the J = 0 classes), or only the outcome class and timing?
7. **Thresholds.** Which hard thresholds (IB-1 H4 / H5, PR-2 v2) apply to every architecture, fixed before any comparison run?
8. **Coverage and cost.**
   - Should trustworthy body-bump / torso fixtures be recorded first? None exists today.
   - What interaction counts per match and what concurrency cap should the CPU budget assume? Neither has been measured.
