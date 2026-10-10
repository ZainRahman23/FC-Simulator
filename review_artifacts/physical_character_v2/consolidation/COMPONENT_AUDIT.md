# Reusable-component audit (10 Oct 2026)

**Status:** classification only. **Nothing was deleted, moved or modified on the basis of this table.**
- Source: `../sources/2026-10-10_user_instruction_pause_consolidate.md`.
- Evidence references point to `CANONICAL_EVIDENCE.md` (§ numbers).
- Paths:
  - `sandbox/…` is on `prototype/physical-character-v2`, unless a branch is named;
  - `pi1/…`, `promotion_carrier/…`, `locomotion_continuity/…`, `interaction_benchmark/…` are under `review_artifacts/physical_character_v2/`.

**Classes:**

| class | meaning |
|---|---|
| **R** | clearly reusable, independent of architecture |
| **P** | probably reusable |
| **S** | architecture-specific (tied to the PI-1 promotion design) |
| **E** | research / evidence only |
| **X** | candidate for retirement |

## V2 physical character and engine

| component | location | evidence | class | note |
|---|---|---|---|---|
| V2 body spec: skeleton, masses / inertias, colliders, joints and limits, knee, human data, poses | `sandbox/visual/physchar2/spec/` (`v2_spec`, `v2_body`, `v2_skeleton`, `v2_joints`, `v2_knee`, `v2_colliders`, `v2_human`, `v2_pose`) | G0 – G3 accepted; no body limit shown in any experiment (§3 item 2) | **R** | "V2 remains the physical character" (both pivots) |
| Actuators / capacities (Hill model), passive tissue, geometry | `physchar2/spec/v2_actuators.js`, `physchar2/sim/` | PCS-1 / LL capacity analyses | **R** | LL predicts that hip swing capacity is exceeded above 4.2 m/s: a model check is open |
| Jolt world wrapper, math | `physchar2/core/v2_jolt.js`, `v2_math.js`; `vendor/jolt-physics.wasm-compat.js` (v5.6.0) | the accepted 240 Hz, 150 / 2 configuration throughout | **R** | `OffsetCenterOfMassShape` aborts this WASM build (AST-1E A1) |
| Render mapping V2 → rig | `physchar2/map/v2_render_map.js` | G-gate viewers | **P** | |
| Rigid F0 foot (boot) | in the V2 spec | Track A keeps it; Track B / REV1: it cannot follow the presentation's toe pivot (≥ 22.9 mm) | **R** | the open boot-vs-toe-pivot question is a presentation / body correspondence issue |
| D-1F1 toe body | `physchar2/spec/v2_f1.js` (default-off) | energy passivity fails; solver mechanism (Track A) | **E** | needed to reproduce Track A; "F1 never enters a running PI-1 battery" |
| Record-matched PI-1 runner body (D-1) | `physchar2/spec/v2_pi1_runner.js` | D-1 check: joint spacing outside bands; isoSelfCol exception scoped (D1C) | **P** | the character-specific body any physical presentation of this rig needs |
| G0 – G3 gates and checks | `physchar2/gates/v2_g0.js` … `v2_g3_checks_v33.js` | the regression basis (106 / 106, 58 / 58 in SLP-1) | **R** | the G0 checks do not recognise profile overrides (D-1 stop) |
| Component regressions, regression compare, perf bench | `physchar2/tools/v2_component_regressions.mjs`, `regress_compare.mjs`, `perf_bench.mjs` | used in every SLP / PI run | **R** | |
| Jolt contact-cache decoding + bit-identical single-step replay | `physchar2/tools/track_a_lib.mjs`, `track_a_probe.mjs`, `track_a_convergence.mjs`, `track_a_candidates.mjs` | Track A mechanism reproduced bit for bit | **R** | engine-level diagnostic tool |
| Autonomous standing / stepping stack: DCM, capture, footstep, step, swing, touchdown, TD2 / TD2C, D1G / DVG guards | `physchar2/ctrl/v2_stand.js`, `v2_dcm.js`, `v2_capture.js`, `v2_footstep.js`, `v2_step.js`, `v2_swing.js`, `v2_touchdown.js`, `v2_td2.js`, `v2_stance.js`, `v2_support.js`; `gates/v2_e2.js` | E2 stopped at E2-22; CF-6: 0.10 m/s | **E** | autonomous gait ended (pivot 1). Not validated as a recovery-stepping source |
| CF-1 … CF-6 gait mechanisms and diagnostics | `diagnostics/loco_cf*_2026-10-08/scripts/` | §2.1 | **E** | "remain historical evidence" (CF-6 closure) |
| E1 / E2 / TD / DVG / unload evaluation tools | `physchar2/tools/` (`e1*`, `e2_*`, `td*`, `dvg*`, `d1g*`, `unload*`, …), `gates/v2_unload.js` | E-series records | **E** | |
| Walk replay recorder + viewer | `physchar2/tools/cf5_pose_record.mjs`, `viewer/cf5_replay.html`, `v2_cf5_replay.js` | verified-regeneration replays (7651a254) | **P** | |

## Supported locomotion (SLP)

| component | location | evidence | class | note |
|---|---|---|---|---|
| **A field**: uniform whole-body field α·m_i·a_T | `physchar2/ctrl/v2_supported.js` (authority) | SLP-2: exact M·v; no state read, torque or writes; 3 – 7 µs per step | **P** | Validated for translation. The PCS-1 adaptation is gated to ordinary locomotion and 2-D. Its use depends on the architecture. |
| **B support layer**: turf↔pelvis SixDOF spring with recoverability-derived caps | `physchar2/ctrl/v2_supported.js` (`SupportLayer`) | SLP-1 / 1b: the caps cannot carry ordinary locomotion. REV2 / PCS-1: saturates (0.95 – 1.0; 87 %) | **S** | Pivot 2: "retained as research; a candidate stumble / fall-severity mechanism" |
| SLP leg drivers "1" / "1b" / "2" / "2c", trajectory, schedule | `physchar2/ctrl/v2_supported.js`; `gates/v2_slp.js` (SLPSim) | all stopped at calibration (§2.2) | **E** | preserved exactly by user decision (hashes reproduce) |

## Gameplay simulation side (read-only for this work)

| component | location | evidence | class | note |
|---|---|---|---|---|
| Slide-contact V1.3 with CHARCOLLIDE-1 runner capsules | `prototype/slide-contact-v1.3-charcollide` 5042230 (`sandbox/visual/pt_charcollide.js`, `pt_react.js`); profile 3e28e02 | neutral (Track B); the IB-1 source | **R** | the authoritative baseline for every comparison. Whether to change it is review question 1 |
| Shared leg law (`ptRxBodyChar`; V1.3 `of_loco.js` gait channels) | V1.3 simulation + `sandbox/visual/anim3d/of_loco.js` | LL: non-physical vertical; skating stance foot; P1 12 / 26 | **P** | used by gameplay collision whatever the architecture; its realisability is review question 1 |
| Slide-contact V1.2; Tackled-Player V1 fall case | `prototype/slide-contact-v1.2` d539e7a / e2c98ec; f5f6076 | V1.2 gate fail; the f5f6076 fall case withdrawn (D1C) | **E** | superseded baselines |
| PI-1 promotion predictor (d_pred ≤ 0.25 m within 0.10 s) | the exporter's in-page calls (`pi1/trackB/scripts/air_export_v13.cjs`) | NT-4 neutral | **S** | a promotion trigger. Not part of IB-1's hard metrics |

## Presentation

| component | location | evidence | class | note |
|---|---|---|---|---|
| Procedural running presentation V1.3 | `sandbox/visual/anim3d/of_loco.js` (+ `of_motion.js`, plant-IK) | the ordinary-locomotion presentation in both pivots; MH defects (pelvis term, plant-IK steps, stride clock) | **R** | known defects listed in §2.4 |
| LC-1 continuity layer | `prototype/locomotion-continuity-v1` 9d57d46 (`anim3d/of_loco_cont.js`) | neutral; C1 pelvis / COM, ballistic flight; not continuous by prereg; 694 µs per actor tick | **P** | three unfixed defects; CPU not production-ready |
| Root-bone ground-clamp fix | inside LC-1 | the 12 mm single-tick drops removed | **R** | exists only on the LC-1 branch |
| Reaction overlay / authored fall (`ofRxLink`) | `anim3d/of_react.js`, `of_squad.js` | the authored fall is not V2-representable and not a physical-fall reference (D1C) | **P** | cheap-path presentation of reactions |
| Presentation diagnostics export (presentation-only switches) | `pi1/moving_handoff/scripts/`, `locomotion_continuity/scripts/pres_harness.cjs` | MH sources traced; gameplay hashes identical | **P** | |

## Records, gates and measurement

| component | location | evidence | class | note |
|---|---|---|---|---|
| AIR exporters (authoritative + presentation streams) | `pi1/scripts/air_export*.cjs`, `pi1/trackB/scripts/air_export_v13*.cjs`, `locomotion_continuity/scripts/lc_export.cjs` | neutral (NT-1 / NT-4); OFF bit-reproducible | **R** | LOCO / FULL bytes carry a wall-clock `cpu` field (§4 item 3) |
| Contact-correspondence rows CG-1 … CG-6, CG-8 | `pi1/scripts/compat_gate.mjs`, `compat_lib.mjs`, `pi1/trackB/scripts/compat_gate_v13.mjs` | frozen thresholds ab9a626 | **R** | measurement is architecture-neutral; it poses the D-1 body from presentation. CG-5 reporting artefact (§4 item 11) |
| CG-7 / PCG-F0 pose-compatibility rows P-1 … P-17 | `pi1/trackB/scripts/pcg_f0.mjs`, `pcg_scan.mjs` | Track B 0 / 26 | **S** | specific to F0 promotion from a presentation frame |
| R-K knee retarget / PM-1 mapping (`makeMapper`) | `pi1/rev1/scripts/pcg_rev1.mjs` | knee / ankle centres ≤ 0.004 mm | **P** | |
| RF-1 rigid-foot reconciliation | `pi1/rev1/scripts/pcg_rev1.mjs` (`rf1`) | eligible frames 6 → 10; ≈ 40° one-frame snap when used as a gait reference (LL) | **S** | |
| PM-2 knee mapping | `pi1/rev1/scripts/` | worse than R-K on position / direction / angular velocity (REV1) | **X** | tested, not adopted |
| PS-2 selector, HG gate (P-rows, HG-T, HG-D), DG demotion gate | `pi1/rev2/scripts/pi1_rev2_sim.mjs`, `scan_rev2.mjs`; `locomotion_continuity/scripts/lc_valid.mjs` | REV2, LC-1; DG never exercised | **S** | `valid_*.json` "valid" excludes HG-T (the 39 / 38 error) |
| HG-A v2 rule (entry momentum = M·v_auth by one uniform shift) | `pi1/hga/HGA_V2_ADOPTED.md` | adopted cf144e89 | **R** | as a principle → IB-1 H7 |
| HG-A v1; PR-2 REV2 reading | `pi1/rev2/` (as frozen) | v1 "conceptually wrong"; PR-2 REV2 reading was an error (MH) | **X** | superseded by HG-A v2 / PR-2 v2; kept for reproducing REV2 |
| PR-2 v2 (genuine-continuation rule) | `locomotion_continuity/` (LC-1) | fails every promotion; part of it is backward-difference measurement (§4 item 10) | **P** | measurability open |
| REV2 PI-1 plant: G2 world + PostureDriver posture tone + B + causal runner | `pi1/rev2/scripts/pi1_rev2_sim.mjs` | REV2 standing pass; MH drift | **S** | the posture tone (stance / swing gains by contact) is the part most likely reusable |
| AST-1 rigid two-segment stand-in tackler | `pi1/rev2/scripts/pi1_rev2_sim.mjs` | tracking error 14.45 mm on rx_miss; cannot extend | **X** | superseded by AST-1E as a fixture; needed to reproduce REV2 / K4b |
| **AST-1E** extending, then released slide-leg stand-in (A2) | `promotion_carrier/slice/scripts/stand_in_e.mjs`, `ast1e_verify.mjs` | tracking 0.24 / 0.11 / 0.11 mm; releases on contact without writes | **R** | a tackler fixture any architecture can use on IB-1 |
| Law provider (vm-captured `ptRxBodyChar` FK → V2) | `promotion_carrier/slice/scripts/law_provider.mjs` | K0 bit-exact against `simBody` | **P** | an exact gameplay-leg reference for comparisons |
| PCS-1 carrier `PI1CarrierSim` (C-Q / C-V / C-ID / C-T, B retarget) | `promotion_carrier/slice/scripts/pi1_carrier_sim.mjs` (frozen SHA 1a19ea6e…) | coherent 3 ticks (PCS-1); 0 – 6 even with the proxy reference (LL P2) | **E** | the frozen failed slice |
| PCS-1 harness / evaluator / K0 / HG frames | `promotion_carrier/slice/scripts/pcs1_*.mjs` | determinism, K4b | **S** | the coherence measures inside are P |
| Unobstructed promoted-runner drift measurement | `locomotion_continuity/scripts/lc_lead_drift.mjs`, `pi1/moving_handoff/scripts/` | MH, LC-1 | **P** | |
| Leg-law audit, coherence predictions, presentation-reference proxy | `promotion_carrier/leg_law/scripts/law_physics_audit.mjs`, `pred_*.mjs`, `pres_reference.mjs` | LL | **E** | |
| First-contact re-detection with alternative legs | `promotion_carrier/leg_law/scripts/contact_geometry_prediction.mjs` | P1 | **P** | a tool for any proposed gameplay-geometry change |
| CHARCOLLIDE profile / unit / CPU tools | `physchar2/tools/charcollide_profile.mjs`, `pi1/trackB/scripts/charcollide_*.mjs` | Track B | **P** | |
| **IB-1 benchmark** (records, manifest, extractor, verifier, metrics) | `interaction_benchmark/` | V1 – V6 pass; extractor and verifier repeatable | **R** | new, read-only (this consolidation) |
