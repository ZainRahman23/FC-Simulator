# IFM-1 results: impact-first matched-state comparison

**Preregistration:** `ifm1/Touchline_IFM1_Claude_Preregistration.md` (sha256 c9264f2b…), approved 11 Oct 2026 (`sources/2026-10-11_user_approval_ifm1_execute.md`, 5b5883fe).

**Reported run:** run 3, executed at commit 21397097 (11 Oct 02:10). Runs 1 and 2 were superseded by recorded harness corrections C1–C6 (`IFM1_CORRECTIONS.md`); their evidence is kept under `evidence/superseded_run1/` and `evidence/superseded_run2/`. No threshold, physics, solver, geometry or criterion changed at any point.

**Status:**
- Every safely available cell was run.
- Visual review has not happened: **VISUAL_PENDING** for every cell.
- Nothing is adopted. Nothing was pushed.

**This document has three parts, kept apart:**
- **§2 Observations:** measured facts.
- **§3 Interpretations:** what the preregistration's decision table permits.
- **§4 Unknowns.**

The one-page decision is `IFM1_ARCHITECTURE_DECISION.md`.

---

## 0. Global qualification failures (always shown beside the scoped results)

These are unchanged by IFM-1. **Nothing in IFM-1 is globally qualified.**

- **RH1 verdict: C — RECORD-HINGED V2 BODY INVALID** (`record_hinged/RH1_RESULTS.md`, fa5915b2).
  - 50 / 54 gating rows pass.
  - The reproduction-stop item still awaits your ruling.
- **Failures shared by R0 and RH1 on the same harness** (`record_hinged/RH1_AUDIT_HANDOFF.md` §4):
  - G1 isoSelfCol 1.4d: 24.6 mm against a 10 mm limit.
  - G3 G: T7 aborts; hold mean 0.56 / 0.61 against ≥ 0.93.
  - G3 H: H3 = 6 aborts.
  - G3 K′: excessive T11 requests realised.
  - RH1 additionally fails leanL and dropA. R0 passes both.
- **Historical G0 exemption:** G0 0.4c / 0.6a / 0.6b / 0.6e / 0.10a.
  - These rows were recorded in the PI-1 D-1 body check but **never waived by you**.
  - They were exempted for RH1 only, by `RH1_PREREG.md` §6.
  - Without that exemption, G0 fails for both RH1 and R0.

## 1. What ran

**Fixture:** frozen before any IFM-1 Jolt stepping (796a6e1b). R0 / RH1 → S-FLAT / S-TOE entry → impactor placement (`fixture/IFM1_FIXTURE.json`).

**Inputs:** bound uniquely (7c4f4eaa).
- RUN-1 freeze tag `locomotion-v2-straight-baseline-1`: tag d85304f5 → 4a226b1f.
- Constructors: R0 62d5d797 and RH1 e2892d27, mapped by MC-1.

**States** (left stance, right swing, at 3.000 m/s; RUN-1 LOW regime, not relabelled):

| state | t | details |
|---|---|---|
| S-FLAT | 3.326958 s | left flat 40.0 ms |
| S-TOE | 3.508700 s | left toe pad 26.4 ms; toe-off in 13.2 ms |

**Entries:** all four are `ENTRY_GEOMETRY_OK`.
- Grounding +0.5 mm.
- RF-1 valid.
- Anchors ≤ 4e-15 m.
- Read-back: 1.7e-7 m, 6e-8 rad.
- Momentum read-back ≤ 1.2e-6 N·s.

**Impactor placements:** all eight are `PLACED`.
- Gap 0.5000 mm.
- Closing speed 3.000 m/s along the outward normal; 0 tangential.
- Sphere r 0.060 m, 10 kg.

**Roles:**

| role | state | target |
|---|---|---|
| SW | S-FLAT | right (swing) shank, mid-length |
| PL | S-FLAT | left (planted) shank, mid-length |
| SH | S-FLAT | left deltoid sphere |
| TP | S-TOE | left shank, mid-length |

**Modes:**
- **C0:** no contact.
- **N:** native contact.
- **W:** offline replay of N's measured first-step wrench, where the frozen rule permits it.
- **X:** offline; N to h, then contact disabled; where the frozen rule triggers it.

**Window:** 36 steps of 1/240 s. Primary 0–50 ms (steps 1–12); secondary 50–150 ms.

### Scoped status table

| cell | N | W | X | handoff label | other |
|---|---|---|---|---|---|
| SW / R0 | **NATIVE_INTEGRITY_FAILED** (step 1) | not permitted | not triggered | HANDOFF_FAILED | VISUAL_PENDING |
| SW / RH1 | **NATIVE_INTEGRITY_FAILED** (step 1) | not permitted | not triggered | HANDOFF_FAILED | VISUAL_PENDING |
| PL / R0 | PRIMARY_MECHANICS_VALID | WRENCH_REPLAY_NOT_STATE_MATCHED | PRIMARY_MECHANICS_VALID | HANDOFF_FAILED | SECONDARY_FAILURE_AT(120.8 ms) · VISUAL_PENDING |
| PL / RH1 | PRIMARY_MECHANICS_VALID | PRIMARY_MECHANICS_VALID | PRIMARY_MECHANICS_VALID | HANDOFF_FAILED | SECONDARY_FAILURE_AT(120.8 ms) · VISUAL_PENDING |
| SH / R0 | PRIMARY_MECHANICS_VALID | WRENCH_REPLAY_NOT_STATE_MATCHED | PRIMARY_MECHANICS_VALID | HANDOFF_FAILED | VISUAL_PENDING |
| SH / RH1 | PRIMARY_MECHANICS_VALID | WRENCH_REPLAY_NOT_STATE_MATCHED | PRIMARY_MECHANICS_VALID | HANDOFF_FAILED | VISUAL_PENDING |
| TP / R0 | PRIMARY_MECHANICS_VALID | NATIVE_INTEGRITY_FAILED (W) | PRIMARY_MECHANICS_VALID | HANDOFF_FAILED | VISUAL_PENDING |
| TP / RH1 | PRIMARY_MECHANICS_VALID | NATIVE_INTEGRITY_FAILED (W) | PRIMARY_MECHANICS_VALID | HANDOFF_FAILED | VISUAL_PENDING |

**Controls (C0):** all four are `CONTROL_VALID_PRIMARY`, each with the label HANDOFF_FAILED: R0/S-FLAT, R0/S-TOE, RH1/S-FLAT, RH1/S-TOE.

**Skipped cells and reasons:**
- **SW W and SW X (both bodies):** W requires a valid native first step, and N failed integrity at step 1. With no W, the X trigger rule cannot fire.
- **No other cell was skipped.** None was STATE_UNAVAILABLE, FIXTURE_GEOMETRY_BLOCKED, INITIALIZATION_INVALID, TARGET_DOMAIN_BLOCKED inside 50 ms, CONTROL_INVALID_PRIMARY or NATIVE_CORRESPONDENCE_FAILED.
- **No safe stop occurred.** No trajectory was non-finite or exceeded 25 m/s.

## 2. Observations

### 2.1 Controls (C0)

**S-FLAT support** (frozen C0 criteria, all pass for both bodies):
- 12 / 12 loaded steps.
- Integrated left-foot normal impulse 16.4 (R0) / 16.2 (RH1) N·s, against ≥ 9.06 required.
- Flat-point travel 0.05 mm.
- Pelvis ≥ 0.956 of entry height.
- No non-foot turf contact.

**S-TOE support** (descriptive; the S-FLAT support criteria do not apply to S-TOE):
- 7 loaded steps.
- Impulse 1.0 N·s.
- The sole centroid travels 82 mm as the foot rolls toward toe-off.

**Ledgers, 0–50 ms:**
- Linear ≤ 1.0e-4 N·s per step.
- Angular ≤ 2.1e-3 N·m·s per step.
- Energy residual Σ+ = 0 J.

**SnapshotTone reference.** It leaves the anatomical range at:

| state | time | joint | value | hard range |
|---|---|---|---|---|
| S-FLAT | 66.7 ms | ankle_L.df | 46.3° | 45° |
| S-TOE | 87.5 ms | hip_L.flex | −25.3° | −25° |

- After those times the control is "secondary truncated". It is outside the healthy control interval and marked so on every frame and sheet.
- **Visible:** by 100–150 ms every C0 body has sunk into a crouch. See any `clips/sheets/*_sheet.png`, last two columns.

**Placement independence:** the S-FLAT control with the PL and SH placements gives a bit-identical receiver.

### 2.2 Native contact (N)

**First-step correspondence:** holds in all eight cells.
- Witness 0.25 mm from the planned patch (the 0.5 mm gap closing).
- Normal 0.00002°.
- On the planned body and sub-shape.

| cell | first-step impulse | post-first-step impulse | contact steps | primary mechanics | struck-chain max 0–50 ms | relevant rotation 0–50 ms | target disp. at 150 ms | apparent point mass |
|---|---|---|---|---|---|---|---|---|
| SW R0 / RH1 | 9.21 N·s | 12.06 N·s | 26 | **fail**: angular residual 2.34e-2 N·m·s at step 1 (limit 1e-2) | 103.9 mm | 12.7° | 140 / 139 mm | 4.7 kg |
| PL R0 / RH1 | 12.99 / 13.00 | 9.98 / 10.12 | 22 / 23 | pass (angular max 5.8e-3 / 6.1e-3) | 59.1 / 58.1 mm | 6.2° | 81 / 80 mm | 8.2 kg |
| SH R0 / RH1 | 18.94 / 18.96 | 3.51 / 3.38 | 36 | pass (angular max 6.6e-4 / 5.5e-4) | 49.0 / 51.1 mm | 5.6 / 6.1° | 121 / 125 mm | 20.3 / 20.9 kg |
| TP R0 / RH1 | 10.88 / 10.87 | 8.30 / 8.30 | 35 | pass (angular max 8.5e-3) | 120.4 / 120.5 mm | 11.8 / 11.4° | 272 / 274 mm | 5.8 kg |

- **Weak challenge:** no cell is weak. The smallest post-first-step share is SH, at 18 %; the rule is < 5 %.
- **Detectability:** every N response is detectable against C0 (≥ 1 mm or ≥ 0.1° within 50 ms).
- **Combined receiver + impactor energy residual:** Σ+ = 0 J in every cell.

**SW angular-ledger failure (diagnosed in run 2, recorded, no tolerance change).**
- The step-1 residual is mostly the within-step change of the world inertia tensor of a segment spinning at 27.7 rad/s, i.e. engine rotational integration.
- It is identical for R0 and RH1.

**PL secondary failure.** At 120.8 ms (step 29), the angular ledger fails in N for both bodies. It is unexplained. The primary window is unaffected and kept.

### 2.3 First-step wrench replay (W) and contact-disabled branch (X)

**W fidelity at step 1** (limits: 1 mm / 0.5° / 0.05 m/s / 0.5 rad/s / P 0.05 N·s / L 0.05 N·m·s):

| cell | pos | rot | vel | ω | P | L | state-matched | W mechanics |
|---|---|---|---|---|---|---|---|---|
| PL R0 | 0.037 mm | 0.025° | 0.009 | 0.094 | **0.0503** | 0.036 | **no** (P by 0.0003 N·s) | pass |
| PL RH1 | 0.036 | 0.025 | 0.009 | 0.095 | 0.0484 | 0.035 | yes | pass |
| SH R0 | **8.69** | **4.26** | **2.09** | **17.8** | **0.113** | **1.57** | **no** | fail: angular 1.55 N·m·s |
| SH RH1 | **8.18** | **4.14** | **1.96** | **17.3** | **0.110** | **1.56** | **no** | fail: angular 1.54 N·m·s |
| TP R0 / RH1 | 0.004 | 0.005 | 0.001 | 0.022 | 0.0007 | 0.003 | yes | fail: angular 1.03e-2 N·m·s/step (limit 1e-2) |

**Injected work** (measured KE jump): PL 26.4 J · TP 22.3 J · SH 167.4 / 168.6 J.

**X:** triggered in six cells, and valid in all six (PRIMARY_MECHANICS_VALID).
- The no-op restore proof is bit-identical to the uninterrupted N run and to the N record, every time.

**Equivalence, 0–50 ms** (limits 10 mm and 3°, plus the same left-foot support pattern):

| cell | N–W | N–X |
|---|---|---|
| PL R0 | 33.6 mm, 2.06°, support differs → not equivalent | 33.4 mm, 2.01°, support differs → **not equivalent** |
| PL RH1 | 32.8 mm, 1.98°, support differs → not equivalent | 32.5 mm, 1.97° → **not equivalent** |
| SH R0 | 93.5 mm, 21.9° → not equivalent | **7.6 mm, 1.27°, same support → equivalent** |
| SH RH1 | 93.8 mm, 21.2° → not equivalent | **8.7 mm, 1.59° → equivalent** |
| TP R0 | 42.6 mm, 3.55° → not equivalent | 42.5 mm, 3.54° → **not equivalent** |
| TP RH1 | 42.7 mm, 3.54° → not equivalent | 42.7 mm, 3.54° → **not equivalent** |

In PL and TP, W and X are nearly identical to each other: the gap between them is far smaller than the gap from either to N.

### 2.4 Handoff (correction C5: three readings, frozen label unchanged)

| entry | HG-A2.3 \|s_h\| | PR-2 post / pre (≤ 0.18 m/s) | frozen decision 8 (P-rows post-shift) | contract text, PR-2 post | contract text, PR-2 pre |
|---|---|---|---|---|---|
| R0 / S-FLAT | 0.157 ✓ | 0.230 / 0.099 | **fail** | fail | pass |
| R0 / S-TOE | 0.131 ✓ | 0.154 / 0.061 | **fail** | pass | pass |
| RH1 / S-FLAT | 0.158 ✓ | 0.242 / 0.087 | **fail** | fail | pass |
| RH1 / S-TOE | 0.131 ✓ | 0.145 / 0.053 | **fail** | pass | pass |

- The frozen label is **HANDOFF_FAILED for every entry and every cell.** Post-shift P-16c equals |s_h| by construction.
- Under the preregistration, a mechanically valid cell with this label is a **mechanical-only diagnostic**. It does not count as a successful RUN-1-to-physics transition.

### 2.5 Gameplay camera (prereg §11; `evidence/run3/clips/`, `render/IFM1_SCREEN.json`)

**Rendering:**
- The frozen RUN-1 viewer page and character renderer draw every frame: tag files byte-identical, 21 / 21.
- Camera: CAMERA_V1, zoom 1, 1280 × 720, 60 Hz. The rail follows the authoritative mover, identically in every mode.
- Pose: the bound render rule MC-1 §2(4). Rotation retarget; unmapped bones (neck, clavicles, hands, toes; 8.5 % of the mesh weight) hold their τ0 local rotation.
- Each clip is 250 ms of RUN-1 lead-in (no physics), then the 150 ms record.
- The impactor is drawn and labelled as a diagnostic impactor.

**Scale at the runner.** The runner is about 30 px tall.

| direction of motion | pixels per 100 mm |
|---|---|
| along travel | 1.79 |
| vertical | 1.67 |
| horizontal ⊥ travel (every IFM-1 impact direction) | 0.65 |

**Entry continuity in pixels.** This compares the rendered physical entry with RUN-1 at τ0.

| entry | max joint jump (world) | joint and tip | RUN-1's own motion over its last frame |
|---|---|---|---|
| R0 / S-FLAT | 0.32 px (18 mm, hand_R) | tips 0.39 px | 0.89 px |
| R0 / S-TOE | 0.55 px (31 mm, hand_R) | tips 0.66 px | 1.62 px |
| RH1 / S-FLAT | 0.14 px (8 mm, hand_L) | | 0.89 px |
| RH1 / S-TOE | 0.35 px (20 mm, toe_L) | tips 0.47 px | 1.62 px |

**Screening marker** (struck-chain landmark ≥ 2 px from C0 at two consecutive primary 60 Hz frames): **not reached in any cell or mode.**

| cell | N max, 0–50 ms (rendered / evaluator points) | W max | X max | at 150 ms (N) |
|---|---|---|---|---|
| SW R0 / RH1 | 0.68 / 0.68 px; 0.67 / 0.67 px | — | — | 0.93 – 1.00 px |
| PL R0 / RH1 | 0.32 px; 0.31 px | 0.20 / 0.21 | 0.20 | 0.74 – 0.76 px |
| SH R0 / RH1 | 0.18 / 0.20 px; 0.25 / 0.24 px | 0.68 / 0.65 px; 0.60 / 0.61 px | 0.16 – 0.21 | 0.30 – 0.44 px |
| TP R0 / RH1 | 0.59 px | 0.46 / 0.45 | 0.46 / 0.45 | **2.38 / 2.41 px** (outside the healthy control interval) |

- **N vs W / X at the camera (0–50 ms):** ≤ 0.14 px in PL and TP. In SH it is ≤ 0.12 px for X and 0.85 px for the invalid W.
- **R0 vs RH1 at the camera:** ≤ 0.23 px.
- **Repeatability:** rendered poses and pixels are bit-identical on repeat (`render/RENDER_DETERMINISM.md`).

**Visual review:** none. **VISUAL_PENDING** for every cell. Blinded A/B clips and sheets use a fixed mapping (`render/IFM1_BLIND_KEY.json`); open `clips/REVIEW.html`.

### 2.6 Determinism and neutrality

- **Every base trajectory:** bit-identical in two fresh processes, and in the reverse-order single-process batch (`determinism.json`: all identical).
- **X restore proofs:** bit-identical, 6 / 6.
- **IB-1 immutable-record verifier:** 59 pass / 1 note / 0 fail, before and after.
- **Neutrality status: READ_ONLY_RECORD_NEUTRALITY_PROVEN / LIVE_NEUTRALITY_NOT_TESTED.** The prereg §12 live football-boundary hashing was not performed. This harness is recorded-input observation only.
- **W and X are offline branches.** None of their inputs entered any football or input path.
- **Protected files** (since the approval commit): RUN-1, V2, R0, RH1, simulation, criteria, solver and production geometry are all unchanged. The only file added outside `ifm1/` is the append-only P-17 units erratum. The RUN-1 tag is unchanged.

### 2.7 CPU (`cpu.json`; Apple M4, node v22.19.0; instrumentation off; 1 warm-up + 20 replays)

**Production-like step** (G1 measurement excluded):

| measure | value |
|---|---|
| median | 0.47–0.60 ms |
| p95 | 0.61–1.39 ms |
| max | 0.83–12.6 ms (isolated outliers) |

**Per-step components (median):**
- Jolt 0.25–0.29 ms.
- Passive tissue 0.18–0.25 ms.
- Actuators 0.014–0.022 ms.
- SnapshotTone 0.010–0.019 ms.
- G1 measurement diagnostics 0.05–0.07 ms, reported separately.

**Per-event and one-off costs:**
- Event CPU: 50 ms = 6.0–8.0 ms; 150 ms = 17.4–22.7 ms (median).
- Construction: 3.7–5.5 ms.
- MC-1 one-shot mapping: **26.9–27.4 ms per activation.**
- Every replay's final state equals the correctness run, bit for bit.

**W and X costs:**
- **W:** replay consumption 0.47–0.50 ms per step, the same as N. Producing N's offline data is one instrumented N run; its instrumentation (contact decode) adds about 3.8–4.1 ms per 36 steps.
- **X:** branch overhead **was not measured** under the 20-replay protocol. The frozen CPU job list had no X (disclosure D2). An instrumented X run performs 106 Jolt steps (N + no-op proof + continuation).

**Arithmetic extrapolation** (not a measured interacting-island benchmark):

| simultaneous receivers | per 60 Hz frame (4 steps) | each event, 150 ms |
|---|---|---|
| 0 | 0 ms | 0 ms |
| 1 | ≈ 2.0 ms | ≈ 18 ms |
| 2 | ≈ 3.9 ms | ≈ 37 ms |
| 4 | ≈ 7.9 ms | ≈ 73 ms |

Each activation adds MC-1's ≈ 27 ms. Ordinary players need 0 articulated steps. No 22-player or mobile claim is made.

## 3. Interpretations (the preregistration's decision table, cell by cell)

- **SW** (both bodies; healthy C0, correct native contact, N fails integrity at step 1):
  - The "both fail despite healthy C0 and correct native contact" row applies.
  - The failure is localised to the angular ledger at high segment spin, i.e. engine rotational integration.
  - More pre-contact carrier work is not an established remedy.
- **PL** (N valid, both bodies):
  - W is state-matched for RH1 only; R0 misses by 0.0003 N·s.
  - W differs from N, and X loses the same 33 mm / 2° and changes the support pattern.
  - So **continued native contact matters for this cell.** There are 22 contact steps and about 10 N·s after the first step.
  - The 0–50 ms result is preserved; the 120.8 ms angular-ledger failure is reported separately.
- **SH** (N valid, both bodies):
  - X matches N (≤ 8.7 mm, ≤ 1.6°), so continued contact adds little here.
  - W is neither state-matched nor valid. By the table, **the wrench reconstruction / replay timing is the problem.**
  - **Post-hoc mechanism, from existing records only:** the W carrier applies N's 18.9 N·s first-step impulse to the 1.98 kg upper arm alone, before the solve.
    - That implies about 206 rad/s on that body, above the V2 world's 100 rad/s angular-velocity limit.
    - The clipped share, 3.00 N·m·s × (206 − 100) / 206 ≈ 1.55 N·m·s, matches the observed 1.55 / 1.54 N·m·s W residual.
    - In N, contact and joints are solved together; after step 1 the fastest body is at 6.9 rad/s.
- **TP** (N valid, both bodies; F0 entered the selected toe-pad state):
  - W is state-matched but misses integrity by 3 % (1.03e-2 against 1e-2).
  - W ≈ X, and both differ from N by 42.5 mm / 3.5°. So **continued native contact matters here too.**
  - The "TP fails at entry" row does not apply.
- **R0 vs RH1:**
  - Mechanically, the two are nearly indistinguishable in every cell: within 2.1 mm and 0.8° in the 0–50 ms summary metrics, and ≤ 0.23 px apart at the camera.
  - The one status difference (PL W) is a 0.0003 N·s threshold margin.
  - RH1's entry is closer to RUN-1 in world space (8 vs 18 mm at S-FLAT; 20 vs 31 mm at S-TOE), but both are sub-pixel.
  - Neither "R0 works, RH1 fails" nor "RH1 works, R0 fails" applies.
- **Gameplay-camera value:**
  - Every valid 0–50 ms response is ≤ 0.68 px from the no-hit control at the normal camera.
  - That is below the screening marker everywhere, and below RUN-1's own frame-to-frame motion.
  - If visual review agrees, the applicable row is "numerically valid physics; little gameplay-camera value": **reduce or reject the physical scope for those events**, and do not raise fidelity to defend effort.
  - This conclusion is **not drawn yet**: the screening marker does not substitute for visual review.
- **Later failure:**
  - C0 itself degrades after SnapshotTone truncation (66.7 / 87.5 ms) and visibly sinks by 100–150 ms.
  - A physical body under this protocol cannot carry on running. Recovery or return to locomotion needs a different production mechanism. IFM-1 neither proves nor disproves one.

## 4. Unknowns

- **Visual judgement:** VISUAL_PENDING. No reviewer has answered the four questions.
- **Direction dependence:** every IFM-1 impact is horizontal ⊥ travel for an across-camera runner. That is the camera's most foreshortened axis, at 0.65 px per 100 mm. Runners heading toward or away from the camera, or vertical responses, would project 2.5–2.8× larger. That was not tested.
- **Longer horizons:** the response beyond 150 ms, and any stumble or fall outcome, are out of scope. The control is unhealthy after 66.7 / 87.5 ms anyway.
- **Live neutrality:** not tested.
- **PL's 120.8 ms failure:** the cause of the angular-ledger failure is unknown.
- **SW's step-1 residual:** whether it is a ledger convention or a real momentum error is not resolved.
- **SH's clamp mechanism:** a post-hoc reading of the records. It was not checked against Jolt source in this session, and no carrier variant was tested (IFM-1 forbids that).
- **F0 coverage:** only one toe state, at 3.0 m/s, was tested. The RH1 audit records RF-1-invalid late toe-pad instants at other speeds (6–22 / 240).
- **X CPU:** X branch overhead under the CPU protocol was not measured.

## 5. Disclosures

- **D1. Post-freeze presentation tooling.** The clip renderer (`ifm1/render/`) was written after run 3, as freeze decision "gameplay camera" stated in advance.
  - It reads records only and cannot affect a gate.
  - Hashes: `render/IFM1_RENDER_MANIFEST.json`.
  - Diagnostic 0.25× clips use the viewer's own 4× zoom (same CAMERA_V1 pose). The primary view is always zoom 1.
- **D2. X CPU.** X branch overhead was not timed (`ifm1_cpu.mjs` job list). It was not added after the fact.
- **D3. Clip storage.** Committed clips are lossy animated WebP; the sheets are lossless crops. Lossless frames are kept outside Git (`evidence/run3/clip_frames.OUTSIDE_GIT.md`, 1.6 GB, SHA256SUMS).
- **D4. Corrections C1–C6.** All were recorded before the affected re-run, with no threshold or physics change.
  - C5 keeps the frozen handoff label and reports three readings.
  - The P-17 erratum (73155375) corrects units only, append-only.

## 6. Evidence map (`ifm1/evidence/run3/`)

| item | contents |
|---|---|
| `records/` | raw per-step records with solved per-contact wrenches; C0 / C0P / N / W / X and fresh-process repeats; 46 files |
| top level | `IFM1_EVAL.json` (reproduced byte for byte from `records/`), stage evaluations, `determinism.json`, `cpu.json`, `batch_reverse.json`, `execute.log` (ib_verify before / after) |
| `render/` | clip metadata, rendered poses (`clipdata/`), projected pixels (`proj/`), `IFM1_SCREEN.json`, `IFM1_RENDER_MANIFEST.json`, `RENDER_DETERMINISM.md` |
| `clips/` | `REVIEW.html`; primary, blind and diagnostic clips; `sheets/`; `CLIPS_MANIFEST.json` |
