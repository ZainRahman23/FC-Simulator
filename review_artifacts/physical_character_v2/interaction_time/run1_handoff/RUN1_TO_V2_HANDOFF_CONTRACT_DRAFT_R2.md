# RUN-1 → V2 interaction-time handoff: contract DRAFT R2, reconciled with LV2-STATE-1 (10 Oct 2026, for review; nothing adopted)

**Source:** `../../sources/2026-10-10_user_instruction_reconcile_handoff_with_lv2_state_1.md` (39772380).
**Revises:** `RUN1_TO_V2_HANDOFF_CONTRACT_DRAFT.md` (R1, 14b5cbaa). R1 is kept as the record of the 949bd763 probes. Where they differ, R2's frozen-baseline numbers replace R1's.

**Upstream:** pinned and immutable.

| item | value |
|---|---|
| tag | `locomotion-v2-straight-baseline-1` → `4a226b1f43ddf5b918acab2807041334ff637405` |
| contract | LV2-STATE-1 (`LOCOMOTION_V2_STATE_CONTRACT.md`) |
| implementation | `run1_gait_v13.js` (RUN-1.3 @ bdab1f5f, params 037a485e, rig vinicius bind dba63d85) and `lv2_state.js` |

- Consumed only through a `git archive` of the tag. Every file used matches the tag's git blob (`lv2/out/lv2_provenance.txt`). The live worktree was not read for any measurement.

**Scope:**
- Read-only.
- RUN-1 / LV2, the simulation and V2 are unchanged.
- No bridge, no physics step, no PI-1 run, no collision, no controller.
- The ITS-1 stop (c647f4c9) is unchanged.

**Tools** (new; read-only; deterministic: two runs each, byte-identical, `lv2/out/determinism.txt`):
- `lv2/probe/lv2_handoff_probe.mjs`: the instantaneous transfer.
- `lv2_handoff_summarise.mjs`.
- `lv2_vs_sim_probe.mjs`: the simulation, plus the old-blocker estimators.
- `legvssim_sanity.mjs`: pipeline validation.
- V2 side, used unchanged: `pi1RunnerSpec` (mass model and geometry), the PI-1 mapping `makeMapper` (R-K + RF-1, `pcg_rev1.mjs`), the PCG tolerances `TOL` (`pcg_f0.mjs`), and HG-A v2's 0.180 m/s.

## 0. Verdict: **B. HANDOFF STATE CONTRACT NOT READY**

**Smallest genuine blocker: V-a, the 23 → 14 mapping onto V2's articulation. Owner: V2.**

**What fails:**
- At FAST RUN and ALL-OUT, the V2 body built from a correct LV2 state does not reproduce the displayed upper body (median, FAST RUN / ALL-OUT, §4.3):
  - shoulders 16 mm off; elbows 26 / 27 mm; hands 31 / 30 mm;
  - velocity errors 0.23 / 0.28 m/s at the shoulders, 0.32 / 0.39 at the elbows, 0.44 / 0.57 at the hands.
- That is before any velocity construction, and in flight as well as stance.
- Frozen P-14 (≤ 0.25 m/s per body; the worst body is a forearm) fails at **68 %** of FAST RUN instants and **88 %** of ALL-OUT instants.
- At ALL-OUT the mapped shoulders also exceed **V2's shoulder hard range** by up to 1.34° (P-12, 25 % of the stride).
- **Not one ALL-OUT instant passes the mapping rows (P-1 … P-17).** At FAST RUN, 22 % pass.

**Cause** (§4.4):
- V2's lumbar, thoracic and neck joint centres sit 50–60 mm from the rig's spine, chest and head joints.
- V2 has no clavicle.
- V2's upper arm is 11.6 mm shorter than the rig's.
- Copying the rig's bone rotations onto bodies hinged elsewhere moves the shoulder girdle and arms.

**The locomotion side is not the blocker:**
- LV2-STATE-1 passes **21/21** independently.
- Its velocities are exact derivatives of the continuous pose.
- The **leg chain (hip–knee–ankle) transfers exactly**: 0.0 mm and 0.00 m/s.

**Even if V-a were fixed, these remain** (§6; reported, not decided):
- the meaning of v_auth: HG-A v2's |s| ≤ 0.18 m/s fails at 32 % (FAST RUN) and 59 % (ALL-OUT) of instants;
- the rigid F0 foot for every stance state except flat;
- the simulation's clock, geometry and speed range: the gameplay legs are 0.19–0.29 m from the runner's, and VMAX 8.2 m/s is below ALL-OUT.

The last of these blocks a *simulation-decided* interaction, not the instantaneous transfer itself.

## 1. Checks

| check | result |
|---|---|
| frozen contract checks `tools/lv2_state_check.cjs`, run from the archive | **21/21 PASS**; identical to the frozen `baseline/final/state_contract_check.txt` apart from wall-clock timings (`lv2/out/lv2_state_check_vs_frozen.txt`) |
| archive = tag | `run1_gait_v13.js`, `lv2_state.js`, `lv2_state_check.cjs`, `run1_load.cjs`, the contract and `rig.json`: blob MATCH |
| pipeline validation of the simulation comparison | simulation body recomputed from V1.3 record rows = recorded `simBody` segments (0.0000 m); V1.3 presentation legs-vs-simulation p50 22.2 mm (rx_sprint), as the moving-handoff record (`lv2/out/legvssim_sanity.txt`) |
| probe determinism | two separate runs each, byte-identical |

## 2. R-0 … R-8 against LV2-STATE-1

| # | R1 requirement | classification | LV2-STATE-1 field and evidence | what stays open |
|---|---|---|---|---|
| R-0 | provenance + input echo | **answered directly** | `provenance` (contract, implementation, paramHash, rig, bindHash, ladder); `input.echo` + float64 bits (HT-7 bitwise PASS) | comparing the echo with the simulation rows (H-2) is V2's check at runtime |
| R-1 | pure query at any τ, O(1), the rendered path | **answered directly** | `queryAt`: actor hash unchanged (HT-4); 0.8–1.2 ms at t = 5 s and 300 s; 0 m vs the rendered replay at τ (R-1) | **V2 usage rule:** query at or after the actor's committed time, since an earlier τ falls back to O(t) and is declared in `method.path`. Replay and incremental differ on ramps (limitation 7); `queryAt` follows the actor's own path |
| R-2 | 23-bone float64 pose, root-relative | **answered directly** | `joints[23]` root and world, float64; 6.14 µm vs the rendered float32 matrices at x ≈ 100 m | — |
| R-3 | velocities from the continuous pose, method declared, one-sided at events | **answered directly** | analytic where closed form, else a central difference of the pose function (h = 0.1 ms); events: touchdown, toe-off, heel-rise onset. HT-2: ≤ 5·10⁻⁹ m/s, 10⁻⁴ rad/s (constant speed); ramp max 0.09 mm/s | declared velocity kinks: heel-rise onset (foot pitch 0 → 9–89 °/s) and touchdown (limitation 3: "set down", the foot arrives at 0 m/s). Handoff at an event is one-sided |
| R-4 | pelvis state + spring-mass vertical | **answered directly** | `pelvis.root / world`; `springMass` y, ẏ, ÿ, vertical force in BW; analytic vs pose function ≤ 4·10⁻⁶ m/s | factual scope: the **pelvis** is ballistic in flight; the whole-body COM is not (§4.6). Which vertical is authoritative is open (§6 Q4) |
| R-5 | gait clock + source; per-leg s / w, events | **answered directly** (the fields) · **genuinely unresolved** (ownership) | `gait.phase`, `phaseRate`, `source`: "RUN-1's own cadence (not simulation-locked)"; `legs.*.ul`, `s`, `w`, `sinceTouchdown`, `toToeOff`, `toTouchdown` | H-1, clock ownership (§6 Q1) |
| R-6 | per-leg contact: sub-phase, pivot and plant in pitch coordinates, foot pitch, MTP angle | **answered directly** | `legs.*.contact`: subPhase, pivot, pivotPoint / pivotPitch, pivot material velocity (HT-3 ≤ 0.02 mm/s), soleGround, plant point and yaw in pitch coordinates, footPitch, mtpExtension | the vocabulary changes: R1's "heel roll" is LV2's **forefoot landing** (no heel-first landing in RUN-1.3). Representing it on V2's rigid foot is V2's (§4.5, §6 Q3) |
| R-7 | turning + acceleration context | **answered directly** (straight line) · **genuinely unresolved** (turning) | `root.yawRateSource` ("assumed 0" unless given); `speed` (commanded, authoritative acceleration, lean and its rate, filter) | the gait does not represent turning (scope §2 of the baseline) |
| R-8 | unperturbed continuation, diagnostic only | **answered directly** | `continuation()` = `queryAt` at later τ | it is the visible reference, not a physical prediction. The source's flight motion implies external force and torque (§4.6), so a physical body departs from it even unstruck. Never a physics input (H-4) |

**Neither "derivable from LV2-STATE-1" nor "owned by V2" applies to any R row.** Every R row is now exported. The derived and V2-owned quantities remain the V-* rows (§3), unchanged in responsibility.

**Not taken from LV2** (instruction 4):
- `com` is **diagnostic only** (the contract §4 says so).
- Every COM, P and L figure in this document uses **V2's mass model** (`pi1RunnerSpec`, 73.9 kg).
- LV2's diagnostic COM agrees with V2's to ≤ 0.04 / 0.07 / 0.08 / 0.10 m/s (3.0 → 9.5) but is never used as a source.

## 3. V-*, S-*, H-* after LV2-STATE-1

**V-* responsibilities: unchanged; all V2.**

| row | what changes |
|---|---|
| V-a mapping | the **reference** is LV2's float64 pose, not the law's. Measured as the **binding blocker** (§4) |
| V-b COM / P / L | V2's mass model only. Unchanged |
| V-c grounding | rules unchanged. Measured: §4.5 |
| V-d velocity construction | the **reference** becomes LV2's R-3 velocities through V-a (no finite differences of frames). Constraints: see the two defaults below |
| V-e facing rate and sub-tick | unchanged. V2 supplies `simAt(τ)` by the row rule; LV2 echoes it |
| V-f segment-relative point carry | unchanged. The gap it must report is now measured: 0.19–0.29 m (§4.7) |
| V-g representability report | implemented as the probe's per-instant rows (§4) |

**V-d defaults:**
- **Pivot.** R1's default (velocity 0 at the stance pivot) stands, applied to **V2's actual boot contact point**. LV2's pivot (the MTP joint or toe pad) is not on V2's rigid boot.
- **Yaw (proposed, for review; R2 does not adopt it).** R1 wrote "yaw L from the authoritative facing rate". Implemented literally (L_yaw = I_yaw·ψ̇_auth), it deletes the gait's own yaw momentum: ±7.8 kg·m²/s at FAST RUN, ±10.9 at ALL-OUT. That makes it the construction's largest velocity change, a body Δv of 0.83 / 1.13 m/s (p50, FAST RUN / ALL-OUT).
- It also contradicts two existing rules:
  - adopted HG-A v2 (cf144e8): L about the COM unchanged;
  - the moving-handoff answer to Q3: the authoritative yaw rate **plus** the genuine gait-relative L.
- **Proposed reading:** L about the COM from the source, plus a whole-body yaw-rate shift only by (ψ̇_auth − ψ̇_source). That shift is 0 by construction for LV2, which echoes the authoritative yaw rate.
- §4 reports both readings: C3 is the proposed one, C4 the literal one.

**S-*: unchanged.** The simulation has no full pose; its collision skeleton remains the V1 law (`ptRxBodyChar` driven by `ofLocoParams`; see §6 Q1 and Q5).

**H-*:**

| | status |
|---|---|
| H-1 support agreement | **unresolved**: §6 Q1 |
| H-2 root identity | mechanism exists (bitwise echo); V2 checks it at runtime |
| H-3 neutrality / determinism | locomotion side satisfied (HT-4, determinism) |
| H-4 one-shot read at τ₀ | **kept as designed**; nothing in LV2-STATE-1 contradicts it |
| H-5 numerical form | satisfied (float64, root-relative, version-stamped, method declared) |

## 4. The instantaneous transfer, re-measured on the frozen baseline

### 4.1 Method

**Sampling.**
- Constant speed, straight line, heading 0.3 rad.
- 240 half-step instants per stride at LOW 3.0, JOG 5.5, FAST RUN 7.8 and ALL-OUT 9.5 m/s.
- Each instant is `queryAt` on the replay path.

**At each instant:**
1. **LV2 → V2 body.** The PI-1 mapping, unchanged: R-K, hard-ROM projection with locked axes dropped, and RF-1 boot reconciliation on stance feet.
2. **Pose rows.** The frozen PCG geometric rows P-1 … P-13 (REV1 set).
3. **Mapping velocity rows.** The kinematic rows P-14 … P-17 on the **mapped** field, with velocities from the pose function (central, ±0.1 ms). The frozen 60 Hz backward definition is reported too: per instant it differs by p50 0.006–0.019 and at most 0.042 m/s, and the two give different P-14 verdicts at 0–18 instants near the 0.25 boundary.
4. **Rig points.** Every rig joint and tip carried rigidly by its V2 body, from a bind aligned at the hip midpoint. This covers what the P rows do not: shoulder girdle, neck, hands, toes.
5. **HG-A v2.** The uniform shift |s| = |v_auth,h − v_COM,h(V2)|.
6. **V-d construction.** The ITS-1 E-3 KKT, kinetic-energy metric, ported read-only, under five constraint sets.

**Exclusions.**
- 6 / 12 / 16 / 22 instants per speed are excluded from velocity rows.
- In them, the **frozen RF-1 rule is discontinuous** inside ±0.1 ms: it finds a pitch on one side and none on the other (late toe pad).
- That is itself a finding (§4.5), not a velocity.

**Composites (frozen tolerances only):**
- **C1 mapping only:** P-1 … P-17 on the mapped field.
- **C2 + pivot:** the final state after V-d with the pivot constraint.
- **C3 + pivot + P = M·v_auth**, L free (the proposed default). P-16 is replaced by HG-A v2's |s| ≤ 0.180 m/s: under HG-A v2, the COM change *is* the authority correction.
- **C4:** C3 plus R1's literal L_yaw = I·ψ̇_auth.

### 4.2 Results

| | LOW 3.0 | JOG 5.5 | FAST RUN 7.8 | ALL-OUT 9.5 |
|---|---|---|---|---|
| flight share of the stride | 32 % | 44 % | 51 % | 54 % |
| **C1 mapping only**, all / flight | 53 % / 16 % | 57 % / 51 % | **22 % / 40 %** | **0 % / 0 %** |
| C2 + pivot | 54 % | 57 % | 23 % | 0 % |
| C3 + pivot + P (proposed default) | 38 % | 23 % | 9 % (flight 12 %) | 0 % |
| C4 R1 literal (+ L_yaw) | 0 % | 2 % | 2 % | 0 % |
| P-14 (≤ 0.25 m/s) failures | 0 | 78 / 228 | **153 / 224** | **191 / 218** |
| P-14 p50 / max; worst body | 0.15 / 0.22 | 0.22 / 0.31; forearms | 0.30 / 0.42; forearms | 0.38 / 0.49; forearms |
| P-16 (≤ 0.05 m/s) failures | 0 | 0 | 0 | 132 (p50 0.053) |
| P-17 (L within 10 %) failures | 110 | 88 | 66 | 73 |
| P-12 hard-ROM clamp | — | — | 8 (shoulder_R ≤ 0.07°) | **60** (shoulder_L ≤ 0.85°, shoulder_R ≤ 1.34°) |
| P-8 arm (≤ 15 mm), P-9 stance boot contact | — | P-9: 10 | P-9: 12 | P-8: 19; P-9: 8 |
| HG-A v2 \|s\| p50 / p90 / max (pass ≤ 0.180) | 0.134 / 0.182 / 0.202 (88 %) | 0.127 / 0.170 / 0.218 (94 %) | 0.134 / 0.258 / 0.350 (**68 %**) | 0.190 / 0.340 / 0.369 (**41 %**) |

### 4.3 Pose and velocity of the mapped V2 body vs the displayed LV2 body (p50 / max)

| point | LOW 3.0 | JOG 5.5 | FAST RUN 7.8 | ALL-OUT 9.5 |
|---|---|---|---|---|
| hips / knees / ankles | 0.0 mm · 0.00 m/s | 0.0 · 0.00 | 0.0 · 0.00 | 0.0 · 0.00 |
| trunk (spine / chest points) | 3.9 / 4.8 mm | 7.7 / 10.0 | 7.8 / 10.0 | 8.9 / 12.6 |
| shoulder | 14.5 / 17.7 mm · 0.12 / 0.19 m/s | 16.8 / 19.5 · 0.18 / 0.25 | 16.1 / 19.5 · **0.23 / 0.30** | 15.8 / 23.0 · **0.28 / 0.35** |
| elbow | 27.4 / 33.5 · 0.14 / 0.21 | 25.5 / 31.5 · 0.22 / 0.30 | 25.8 / 30.8 · **0.32 / 0.43** | 26.8 / 31.0 · **0.39 / 0.52** |
| hand tip | 37.0 / 39.5 · 0.14 / 0.18 | 33.7 / 35.4 · 0.28 / 0.35 | 31.3 / 35.5 · **0.44 / 0.55** | 30.4 / 34.9 · **0.57 / 0.70** |
| toe tip (rigid foot vs the toe segment) | 21.9 / 84.4 · 0.37 / 1.47 | 43.1 / 97.6 · 0.76 / 1.96 | 32.1 / 84.7 · 0.85 / 2.47 | 32.7 / 93.2 · 0.99 / 2.89 |

**Reference scales (frozen):**
- P-8 arm 15 mm;
- P-14 0.25 m/s;
- PR-2 "no visible pop" 3 mm per frame = 0.18 m/s.

### 4.4 Why the upper body does not transfer (the binding blocker)

**At bind** (aligned at the hip midpoint), V2's joint centres vs the rig's joints:

| V2 joint ↔ rig joint | gap at bind |
|---|---|
| lumbar ↔ spine | **49.8 mm** |
| thoracic ↔ chest | **57.7 mm** |
| neck ↔ head | **60.2 mm** |
| elbow ↔ foreArm (V2's upper arm is shorter) | 11.6 mm |
| shoulders, hips, knees, ankles | 0.0 mm |

**What goes wrong:**
- **The trunk.** RUN-1.3 animates spine, chest and neck: lean, stance dips, counter-rotation. The mapping copies those rotations onto V2 bodies that hinge 5–6 cm higher, so V2's thorax, and with it the shoulders, is displaced: 8–13 mm at the chest top.
- **The shoulder girdle.** V2 has no clavicle; V-a merges it into the thorax. RUN-1.3's clavicles rotate 1.6–5.0° relative to the chest, which moves the rig shoulder by up to 17 mm.
- **ALL-OUT shoulder range.** Folding that clavicle angle into V2's shoulder pushes the ALL-OUT arm swing past V2's shoulder hard range by up to 1.34°. RUN-1.3's own limits check, made on rig angles, does not see this (baseline limitation 9).
- **The arm.** The 11.6 mm upper-arm difference rotates with the arm, at up to ~10 rad/s at speed.

**Why it scales with speed:** limb and trunk angular rates scale with cadence. So the same few-centimetre offsets become 0.3–0.7 m/s at FAST RUN and ALL-OUT.

**Ownership:** the mapping and articulation are V2's (V-a; V2's shoulder range). No locomotion change is implied, and the baseline is frozen.

### 4.5 The stance foot (rigid F0 boot) per LV2 sub-phase

| sub-phase (share of stance at 3.0 / 5.5 / 7.8 / 9.5) | F0 boot following the LV2 foot | RF-1 (frozen) | V2 contact point vs LV2 pivot | V2 contact-point speed p50 / max (7.8; 9.5) |
|---|---|---|---|---|
| flat (17 / 18 / 2 / 13 %) | **exactly on the turf** (0.0 mm) | not needed | whole sole | 0.00 |
| forefoot landing (13 / 13 / 15 / 15 %) | 0 … +6 mm above | ≤ 2° | 75 mm ahead of the MTP joint | 0.35 / 0.50; 0.43 / 0.57 m/s |
| heel-up (60 / 49 / 61 / 53 %) | −10 … +6 mm | ≤ 5° | 47 mm | 0.11 / 0.44; 0.15 / 0.69 |
| toe pad (10 / 19 / 22 / 20 %) | −10.5 … **+21 mm** (it floats late in toe pad) | ≤ 6°; **no solution** in late toe pad (10 / 12 / 8 instants at 5.5 / 7.8 / 9.5), so P-9 fails | 73 mm | **1.68 / 2.09; 2.00 / 2.34** |

**Enforcing velocity 0 at V2's contact point** (V-d pivot) changes the body by up to:
- 2.1 m/s and 9.2 rad/s at 7.8 m/s;
- 2.3 m/s and 9.5 rad/s at 9.5 m/s;
- concentrated in toe pad and forefoot landing.

**ITS-1 E-2 alternative.** The whole-body vertical shift instead of RF-1 would need −20.5 … +10.9 mm, beyond the 10 mm P-1 / P-4 scale in toe pad.

**Only flat stance and flight are foot-representable.** Flat is 2–18 % of stance.

**Correction of R1.** R1's lever estimate ("a rigid tip ≈ 75 mm into the turf") was wrong. V2's actual boot penetrates at most 10.5 mm and, late in toe pad, floats up to 21 mm.

### 4.6 What the source motion implies physically (diagnostic; V2 mass model; not a handoff discontinuity)

| flight | LOW 3.0 | JOG 5.5 | FAST RUN 7.8 | ALL-OUT 9.5 |
|---|---|---|---|---|
| horizontal implied force, p50 / max (BW) | 0.31 / 0.90 | 0.44 / 0.86 | 0.87 / 1.80 | 1.14 / 2.83 |
| (a_COM,y + g)/g, range (0 = ballistic) | −0.13 … 0.47 | −0.43 … 0.57 | −0.79 … 1.27 | −1.03 … 1.77 |
| \|dL/dt\| about the COM, p50 / max (N·m) | 103 / 717 | 215 / 428 | 381 / 658 | 496 / 1216 |
| whole-body yaw L range, V2 mass (kg·m²/s; constant in real flight) | ±3.1 | ±6.6 | ±7.8 | ±10.9 |
| V2-mass COM ẏ − LV2 pelvis ẏ (m/s) | ±0.08 | ±0.14 | −0.25 … 0.33 | −0.30 … 0.38 |

- LV2's own diagnostic COM gives the same horizontal values (p50 0.31 / 0.41 / 0.90 / 1.19 BW).
- **These do not change the state transfer at τ₀.** V2 takes the state at that instant, and physics then conserves momentum.
- **They do decide the transition metrics.** Unstruck, the physical body departs from the R-8 continuation at ½·Δa·t². From the horizontal term alone at FAST RUN (p50 … max), that is 1.2–2.5 mm in the first frame and 43–88 mm by 0.1 s.

### 4.7 Against the simulation (`lv2/out/lv2_vs_sim.txt`)

| | LOW 3.0 | JOG 5.5 | FAST RUN 7.8 | ALL-OUT 9.5 |
|---|---|---|---|---|
| steps/s · duty: LV2 | 2.75 · 0.344 | 3.20 · 0.280 | 4.04 · 0.244 | 4.55 · 0.232 |
| steps/s · duty: simulation (5042230: `ofLocoParams`, legLen 0.865) | 3.21 · 0.420 | 4.61 · 0.360 | 5.57 · 0.309 | 6.34 · 0.300 (**above the simulation's VMAX 8.2 m/s**) |
| free-running drift (strides/s) | 0.23 | 0.70 | 0.77 | 0.90 |
| support disagreement per leg at a phase lock | 7.6 % | 8.0 % | 6.5 % | 6.8 % |
| gameplay legs vs mapped LV2 legs (frozen CG-4, ≤ 0.10 m): phase-locked p50 / p90 | 0.197 / 0.251 m | 0.214 / 0.285 | 0.265 / 0.316 | 0.273 / 0.502 |
| same, at the best constant phase offset: p50 / p90; share ≤ 0.10 m | 0.187 / 0.224; 0 % | 0.212 / 0.261; 0 % | 0.235 / 0.289; 0 % | 0.288 / 0.316; 0 % |

- The simulation's segments have the rig's lengths: thigh 0.435, shin 0.399. The mismatch is **where the legs are**, not their size.
- **The gameplay legs are the V1 law's legs** (`ptRxBodyChar`, driven by the V1 stride table).
- V1.3's presentation, being the same law, was 22–92 mm from them; the frozen runner is 190–290 mm.

## 5. The old moving-runner blockers: eliminated, or only rephrased?

The V1.3 values are from `../../pi1/moving_handoff/` (shipped presentation; same estimators, 60 Hz frames).

| blocker | V1.3 (moving-handoff record) | LV2 frozen baseline | status |
|---|---|---|---|
| frame-difference velocity estimation | 2nd-order backward difference of 60 Hz frames; disagreed with the centred estimate by 1.7–3.9 m/s per body | exact pose-function derivatives (HT-2 ≤ 5·10⁻⁹ m/s, independent run). The frozen 60 Hz P-14 differs from the continuous P-14 by ≤ 0.04 m/s: a one-frame average, not amplified jumps | **eliminated** |
| float32 / replay ≠ rendered (R1) | 12 mm/s at x = 100 m; replay mutated the actor | float64; `queryAt` = rendered state (0 m); pure | **eliminated** |
| pelvis-height switching (heel→toe switch, flight bob, unblended stance / flight) | per-frame pelvis step p90 / max 45–57 / 61–72 mm; 2nd difference 44–93 / 85–108 mm | step 9.8–12.5 / 10.9–13.8 mm (genuine bounce); 2nd difference p90 3.5–6.1, max 3.7–6.7 mm, i.e. \|ÿ\| ≤ 1.4–2.5 g, matching the model's own stance-force peak (2.4–3.6 BW, i.e. ÿ ≤ 1.4–2.6 g) | **eliminated** |
| ground-clamp root-bone bug (12 mm drops) | 5–7 per jog window | no ground clamp in RUN-1 | **eliminated** (not present) |
| plant-IK locks / toe-pivot switch / releases / drop | "contact" feet not stationary by design; legs 82–92 mm from the simulation at jog | no IK locks; plant fixed at touchdown; pivot material velocity ≤ 0.02 mm/s | **eliminated as presentation artefacts.** Residuals, declared: heel-rise onset kink (0 → 9–89 °/s); replay partial-step plant ≤ 0.1 mm on ramps; touchdown "set down" (foot arrives at 0 m/s) |
| joint one-frame change (the PR-2 REV2 reading) | p50 47–77, max 128–206 mm | p50 10 / 21 / 35 / 64, max 27 / 58 / 83 / 111 mm (3.0 → 9.5) | **mostly genuine acceleration at speed.** Not a discontinuity measure (as the moving-handoff §4 found); the frozen continuity reports show no pops (max ≈ p99) |
| flight vertical non-conservation | Fy p50 −2.3 … −8.8 BW | Fy p50 0.04 / 0.03 / −0.24 / −0.09 BW | **eliminated at the median; residual.** The whole-body COM is not ballistic, −1.0 … +1.8 BW at ALL-OUT, because only the **pelvis** is (§4.6) |
| flight horizontal force | Fh p50 1.70–1.88 (3 m/s), 1.15 (5.5), 0.20–0.58 (7.5) | Fh p50 0.26 / 0.41 / 0.84 / 1.12 (3.0 / 5.5 / 7.8 / 9.5) | **not eliminated.** Better at LOW / JOG, worse at FAST RUN / ALL-OUT. The pelvis travels at exactly the root speed while the limbs swing (baseline limitation 13) |
| flight torque about the COM | T p50 346–477 (3), 733 (5.5), 668–751 (7.5) N·m | T p50 94 / 134 / 264 / 399 N·m; yaw L swings ±3–11 kg·m²/s in flight | **reduced ≈ 40–80 %, not eliminated** |
| COM vs authority (HG-A) | p50 0.27–0.39 m/s | \|s\| p50 0.13–0.19, max 0.20–0.37 m/s | **reduced, not eliminated.** Over 0.18 at FAST RUN / ALL-OUT for 32 % / 59 % of the stride |
| stride clock vs rig leg length | 3.7 % mismatch absorbed by the plant IK | LV2's own cadence; the simulation's clock is 17 / 44 / 38 / 39 % faster (3.0 → 9.5) | **rephrased and larger.** Exposed honestly (`gait.source`), not solved |
| presented legs vs the simulation's legs | 22–92 mm p50 (13–16 locks off) | 190–290 mm p50 even at the best phase offset | **worse.** The gameplay legs are still the V1 law |
| representability on V2's body | "no V2 limit involved" (moving-handoff §5); B7 toe pivot | arms / trunk 16–35 mm, 0.2–0.7 m/s; shoulder ROM at ALL-OUT; toe / boot as §4.5 | **newly exposed for this source.** RUN-1.3's articulated trunk and clavicles meet V2's different joint centres. The same carried-point measure was not run on V1.3 here, so no comparison is claimed |

## 6. Open architectural questions (reported, not decided)

**Q1. Stride-clock ownership (H-1).**
- **Facts:**
  - LV2 runs its own cadence.
  - The simulation's clock is the V1 law's `ofLocoParams` stride table, shared with the retired presentation.
  - The simulation's clock is 17–44 % faster than LV2's, with duty 0.30–0.42 vs 0.23–0.34.
  - Drift is 0.23–0.90 strides/s, and per-leg support disagreement 6.5–8 % even when phase-locked.
- **Options:**
  - (a) a new, versioned locomotion baseline driven by the simulation's clock, since LV2-STATE-1 is frozen;
  - (b) the simulation adopts LV2's clock: a gated gameplay change that alters hashes;
  - (c) report the disagreement and do not activate.

**Q2. The meaning of v_auth.**
- **Facts:**
  - LV2 carries the pelvis at exactly the root velocity.
  - The V2-mass COM oscillates about it with a stride mean equal to the root (≤ 10⁻⁴ m/s).
  - Instantaneously, |s| p50 is 0.13–0.19 and max 0.20–0.37 m/s.
  - HG-A v2 (adopted) imposes M·v_auth as a uniform shift bounded by 0.18. That passes at 88 / 94 / 68 / 41 % of the stride.
- **Options:**
  - (i) v_auth = the instantaneous COM velocity (HG-A v2 as adopted), and τ₀ restricted to passing instants;
  - (ii) v_auth = the root / stride-mean velocity, and V2 inherits LV2's own momentum (no correction);
  - (iii) a locomotion version that carries the COM, not the pelvis, at the root speed (the RUN-1.1 "COM-consistent pelvis" patch was not adopted).
- **Related, for the yaw-L wording (§3, proposed reading):** the R1 literal default fails almost everywhere (C4 0–2 %).

**Q3. The rigid V2 F0 foot vs RUN-1's stance (§4.5).**
- **Facts:**
  - The foot is exactly representable only in flat stance (2–18 % of stance) and in flight.
  - Forefoot landing, heel-up and toe pad put V2's contact point 47–76 mm from LV2's pivot, moving at up to 0.7 / 0.6 / 2.3 m/s at ALL-OUT.
  - Late in toe pad the boot cannot reach the turf within V2's ankle range.
- **Options:**
  - restrict planted-leg τ₀ to flat stance;
  - V2 foot work (the F1 toe failed passivity);
  - accept a declared foot reconciliation with a rendered blend (RF-1 / TR-1 style). The velocity cost is given in §4.5.

**Q4. The source and meaning of the vertical.**
- **Facts:**
  - The simulation has no vertical state.
  - LV2 offers the pelvis spring-mass vertical, ballistic in flight, ±0.6–0.8 m/s.
  - V2's mass-model COM ẏ of the same pose differs from it by up to ±0.38 m/s at ALL-OUT, and is not ballistic.
  - V-d as designed keeps the mapped field's COM ẏ (no constraint).
- **Options:**
  - keep it (the R1 default);
  - constrain the COM ẏ to the pelvis's spring-mass value;
  - a locomotion version that makes the COM, not the pelvis, ballistic.

**Q5. Gameplay collision geometry vs the frozen runner (§4.7).**
- **Facts:**
  - The simulation decides contacts with the V1 law's legs.
  - The frozen runner's legs are 0.19–0.29 m (p50) from them at any constant phase offset; 0 % of instants are within CG-4's 0.10 m.
  - V-f's segment-relative carry would place a simulation-decided "shin_L" contact on a limb 20–30 cm away.
  - ALL-OUT (9.5) is above the simulation's VMAX (8.2), so no authoritative ALL-OUT state exists at 5042230.
- **This is the simulation's collision skeleton and speed range.** It blocks simulation-decided interactions independently of the transfer.

**Also open, unchanged:** ITS-1 decisions 1–4.

## 7. ITS-1 / handoff tests: changes from R1 §5

- **Reuse unchanged:** as R1 §5.
- **Add explicitly:** the **PCG mapping rows P-1 … P-17** (frozen TOL) as the V-a fidelity gate, and **HG-A v2 \|s\|** as the momentum-correction gate. Both are architecture-independent and were used above.

| check | now |
|---|---|
| HT-2, HT-3, HT-4, HT-7 | locomotion-side checks, passing on the frozen baseline (21/21); V2 re-runs them on any new baseline |
| HT-1 (support agreement), HT-5 (representability), HT-6 (\|P_src − M·v_auth\|, L_src) | V2-side; implemented read-only by `lv2_handoff_probe.mjs` / `lv2_vs_sim_probe.mjs` |

**Retire:**
- every 949bd763 / `r1Kinematics` number (superseded by LV2-STATE-1);
- R1's toe-lever estimate;
- R1's "heel roll" category.

## 8. Discrepancies found in the frozen documents (reported; nothing changed)

1. **"7.8 m/s is a grid speed."** The baseline §5.5 and the check's note say the touchdown step is 0 at grid speeds 5.5 / 7.8 / 9.5. The grid is 2.5 + 0.25k, so **7.8 is not on it**, and the check itself prints 0.0440 mm at 7.8. The effect is negligible: the contract's stencil never straddles touchdown.
2. **The `h` value.** The `lv2_state.js` header comment says h = 0.25 ms; the code and the contract use 0.1 ms (`H = 1e-4`).
3. **"Gravity-consistent: ballistic in flight"** (contract §6) is true of the **pelvis** spring-mass. The whole-body COM is not ballistic (§4.6).
4. **The shoulder range.** Baseline limitation 9 checks the shoulder against V2's box in rig angles. Through V-a, where the clavicle merges into the thorax, ALL-OUT exceeds V2's shoulder **hard** range by ≤ 1.34° (§4.4).

## 9. Files (`lv2/`)

**Probes** (`probe/`):
- `lv2_handoff_probe.mjs`
- `lv2_handoff_summarise.mjs`
- `lv2_vs_sim_probe.mjs`
- `legvssim_sanity.mjs`

**Outputs** (`out/`):
- `lv2_provenance.txt`
- `lv2_state_check_independent.{txt, json}`, `lv2_state_check_vs_frozen.txt`
- `lv2_handoff_probe.json.gz` (every instant)
- `lv2_handoff_summary.txt`, `lv2_handoff_probe_stdout.txt`
- `lv2_vs_sim.{json, txt}`
- `legvssim_sanity.txt`
- `determinism.txt`
