# V2-G1: passive physics report (after decisions D1–D4)

**Status: G1 PASS** (criteria v3, with the post-run v3.1 correction of row 8 to the approved D4a text).

- **Every gate row passes.**
- **The pre-registered v3 evaluation of row 8 failed** on two genuine rate effects, both diagnosed below:
  - the leanF landing distribution at 240 Hz vs 720 Hz;
  - awkward joint separation at 180 Hz.

  It is recorded alongside the v3.1 evaluation. **If you do not accept v3.1, row 8 is the only open item.**
- No approved anatomy, ROM, topology or authority rule was changed. V1 is untouched (guard OK).
- **Stopped. G2 not started. Nothing pushed.** The review server is running on :8172.

**Supporting files:**
- `G1_CRITERIA.md`: v3, pre-registered in commit `03a12b6`, plus the v3.1 note;
- `G1_TABLES.md`: every number, generated (§ below refers to it);
- `json/g1_results.json`;
- `json/g1_boot.json`: the boot / C3 / seam experiment;
- `json/g1_margins.json`;
- `json/boot_face_model.json`;
- `json/g1_browser.json`;
- `shots/`;
- `../DECISIONS.md` (D1–D4 applied; research history; debt register).

## 1. Final numerical results (gate baseline: 240 Hz, 150 velocity iterations, 10-piece boot)

| gate row | result | key numbers |
|---|---|---|
| 1.S V2-REF | **PASS 17/17** | every scenario, every criterion |
| 1.S′ V1-matched | **PASS 17/17** | |
| 6 variants (165/62, 198/92, ±2 SD legs) | **PASS 40/40** | no per-body tuning |
| 1.6a determinism | **PASS 17/17** | ×3 across two processes: per-tick hash, contact sequence, joint extrema, fall timing identical |
| 1.6b snapshot / restore | **PASS 4/4** | bit-exact |
| 1.6c browser = Node | **PASS 10/10** | headless Chrome over CDP, curated scenarios, identical hashes |
| 5 passive rig / 5c couplings | **PASS 34/34** / as specified | the applied torque equals the spec law; restoring; never injects |
| 7.HS C7 envelope | **PASS 8/8** | shin-kick known issue reported (HS.3k: 2 missed steps) |
| 8 timestep (D4a, v3.1) | **PASS** | physical invariants at every rate; no 240 Hz timing effect; rate effects reported (§ 4) |
| 1.5 iteration study (report) | — | passing scenarios: 10 it 5/17, 15 it 8/17, 20 it 12/17, 30 it 9/17, 60 it 16/17, **150 it 17/17** |

**Over all gated runs** (74 body-scenarios, impact15 excluded):

| quantity | result | criterion |
|---|---|---|
| largest single-step energy rise | **0.000 J** | 0.5 J |
| contact-free energy gain | **0** | |
| free-fall COM acceleration error | max 2.6e-4 m/s² over 7,498 airborne steps | |
| joint separation | max **4.88 mm** transient, ≤ 0.5 mm at rest | ≤ 5 / ≤ 1 mm |
| turf penetration | max **6.9 mm** transient, **2.68 mm** at rest | ≤ 10 / ≤ 5 mm |
| self-penetration | max **5.2 mm** transient | ≤ 10 mm |
| momentum (isoMomentum) | linear 5.6e-6, angular 2.85e-3 | ≤ 2e-5 / ≤ 5e-3 |

## 2. Anatomical excursions and emergency-stop usage (D3a; full table § 19)

| body | largest transient overshoot beyond the anatomical limit | largest settled excursion at rest | emergency-stop ticks |
|---|---|---|---|
| V2-REF | 20.7° knee_R rotation (awkward) | 0.22° hip_L rotation (singleLeg) | **0** |
| V1-matched | 18.9° knee_R rotation (awkward) | 0.32° shoulder_L abduction (drop1m) | **0** |
| V2-165-62 | 19.9° knee_R rotation (awkward) | 0.46° shoulder_R flexion (leanF) | **0** |
| V2-198-92 | 17.5° knee_R rotation (awkward) | **1.32°** shoulder_R flexion (upright) | **0** |
| V2-long-legs | 22.8° knee_R rotation (awkward) | 0.07° lumbar rotation | **0** |
| V2-short-legs | 17.7° knee_R rotation (awkward) | 0.16° lumbar rotation | **0** |

- **The largest settled excursion is 1.32°,** inside the 1.5° compliance tolerance. Under the old 0.5° rule it would fail.
- **Transient overshoots are the C2 end-stop's compliance under violent passive loading:**
  - knee rotation 18–23° in awkward;
  - neck flexion up to 24.5° in the 1 m drop (margin study).
- **Emergency stop:**
  - never reached in any gated run, the timestep ensembles or the C7 envelope;
  - the margins were measured over this whole set (§ 6);
  - the impact15 diagnostic reaches it for 2–4 ticks (report-only).

## 3. D1a: the 10-piece boot

**Identity (verified on all 8 bodies against the previous spec):**
- external geometry: support function identical (Δ = 0, 4,000 directions);
- ankle position, mass, COM and inertia: Δ = 0;
- every other body and joint identical;
- the semantic foot → toe mapping: all 31 bone bindings identical;
- G0 0.10e: Σ piece volume = hull volume to 2e-7.

**A defect fixed during integration.** Jolt's default 1 mm hull tolerance shrank the pieces (Σ volume −0.28 %, up to 1 mm slivers missing at the seams). The pieces are built at 1e-5 m.

**Contact results** (§ 17–18; the same external geometry throughout):

| boot | Jolt held sweep, 200 random orientations: max sink | falls (S3): turf max / rest | falls passing |
|---|---|---|---|
| single hull | 14.7 mm (1 % > 10 mm) | 41.1 / 12.3 mm | 2/11 |
| C3 2 pieces | 14.7 mm (0.5 % > 10 mm) | 10.5 / 5.3 mm | 9/11 |
| **10 pieces (adopted)** | **4.1 mm (0 % > 7 mm)** | **6.9 / 2.6 mm** | **11/11** |

With Jolt's default contact settings (manifold reduction and pair cache on), the 10-piece boot **explodes** (15,813 J). Manifold reduction off and pair cache off are mandatory.

**Seam verification** (ordinary foot–ground loading across the internal seams; § 18):

| test | 10-piece | single hull |
|---|---|---|
| held pitch sweep (heel → toe, −30…30°, 1° steps, 39 kg): max settled depth | **0.01 mm** | 2.70 mm (its face defect) |
| held roll sweep (medial → lateral): max settled depth | 0.00 mm | 0.00 mm |
| step between neighbouring angles | none | |

**Dynamic roll-overs** (heel / toe / medial / lateral, rolling onto the sole across the seams):
- no contact-normal jumps;
- settled depth ≈ 0;
- transient landing depth ≤ 5.95 mm;
- energy rise ≤ 0.08 J;
- the COM-height path tracks the single hull within 4.0 mm (the 2-piece boot: 3.7 mm).

**Standing releases:** only boot soles touch, inside the plantar outline (0.00 mm outside), normals 0.00°. Quiet loading shows no creep (7e-8 mm) and no jitter (3e-13 rad/s).

**Conclusion:** no seam artifact in ordinary foot–ground loading.

**Cost (D1a):**
- At equal iterations, physics +15 % this session (0.194 vs 0.170 ms/tick). The decision-time measurement was +19 %.
- **Known unresolved issue (D1a, TD-2):** in the 20 m/s kick-into-shin envelope test the thin pieces miss contact for **2 steps** (3 in the D1 measurement). Contact still occurs. No foot distortion and no CCD were used.

## 4. D4a: the timestep study (§ 9)

Each rate scenario runs at 180 / 240 / 360 / 720 Hz as an ensemble of 5 starts.

**Gated:**
- physical invariants hold for every member at every rate;
- first-contact timing at 240 Hz is within 2.8 ms of 720 Hz in every scenario.

**Reported (genuine rate effects, preserved):**
- **leanF landing distribution.** It depends on the rate; the five-start ensembles show 240 Hz prone and 720 Hz supine. With 30 starts per rate (lift ±0.5 mm):

  | rate | prone | on side | supine |
  |---|---|---|---|
  | 240 Hz | 18 | 9 | 3 |
  | 720 Hz | 0 | 1 | 29 |

  The landing is bistable at both rates, and the rate shifts the odds. **This is the "lean-forward landing difference" named in D4a.** It now appears at 240 Hz, the validation rate (TD-5).
- **upright at 180 Hz:** lands on its side, where other rates land supine.
- **leanB at 180 Hz:** final COM 0.154 m from 720 Hz, with a tiny spread.
- **awkward at 180 Hz:** joint separation **5.27–5.43 mm** (> 5 mm). It falls monotonically with rate: 5.3 / 2.5 / 1.1 / 0.4 mm at 180 / 240 / 360 / 720 Hz. 300 iterations does not reduce it (TD-6).
- **drop1m at 180 Hz:** a 0.83 J hard-landing rebound remains. 150 iterations removes the rebound at 240 Hz and above, not at 180 Hz (TD-1).
- **The earlier drop1m contact-timing effect is gone** at 150 iterations: 5.6 ms at 180 Hz, previously 27.8 ms.

**The v3 vs v3.1 difference, stated openly:**
- **v3 (pre-registered)** gated every genuine effect at 240 Hz and treated joint separation at every rate as an invariant. It **failed** on leanF (240) and awkward (180).
- **v3.1** applies D4a's text: compare invariant properties; report genuine rate effects such as the lean-forward landing difference. Both evaluations are in the gate row and in `g1_results.json`.

## 5. Cost of the adopted configuration (D1a + D2a; measured alone; § 11)

| configuration | physics, lying on turf (ms/tick) | + passive-layer JS | total | 22 players × 240 Hz, CPU s per simulated s |
|---|---|---|---|---|
| previous baseline: 2-piece boot, 60 it | 0.170 | 0.161 | 0.330 | 1.74 |
| 10-piece boot, 60 it | 0.194 (+15 %) | 0.160 | 0.354 | 1.87 |
| 2-piece boot, 150 it | 0.224 (+32 %) | 0.163 | 0.388 | 2.05 |
| **adopted: 10-piece boot, 150 it** | **0.297 (+75 %)** | 0.161 | **0.458 (+39 %)** | **2.42** |

**150 iterations is a validated correctness configuration, not the accepted production-performance configuration (TD-1).**

## 6. Emergency-stop margins (D3a; json/g1_margins.json)

- **Measured set:** 240 runs at the adopted baseline, with the end-stop on and the Jolt stop moved 40° out:
  - V2-REF and V1-matched: every scenario except impact15;
  - 4 variants × essential scenarios;
  - timestep ensembles: 4 rates × 5 starts;
  - the C7 envelope.
- **Rule:** max(2°, ⌈1.5 × overshoot + 1°⌉).
- **Largest overshoots:**

  | joint, direction | overshoot | run | margin |
  |---|---|---|---|
  | neck flexion | 24.5° | drop1m at 720 Hz | 38° |
  | knee rotation | 22.9° | long-legs awkward | 36° |
  | ankle abduction | 16.6° | short-legs awkward | 26° |

- G0 was rerun after installation: **PASS 8/8**.

## 7. Most informative review scenarios

Page: http://127.0.0.1:8172/sandbox/visual/physchar2/viewer/g1.html. Stills are in `shots/`. Query parameters: `cfg=` (configuration), `hz=` (rate).

| # | what to look at | link query |
|---|---|---|
| 1 | **singleLeg, boot resting on its side: 10-piece (all contacts touching) vs single hull (12.3 mm red)** | `scenario=singleLeg&t=9.8&show=colliders` vs `…&cfg=DX-R1` (g1_01 / g1_02) |
| 2 | **leanB rest: previous baseline (boot 9.4 mm deep) vs gate** | `scenario=leanB&cfg=DX-PREV&t=9.8` vs `scenario=leanB&t=9.8` (g1_03 / g1_04) |
| 3 | **dropA impact: no rebound at 150 iterations** (was 0.72 J at 60) | `scenario=dropA&t=0.0875&show=vel`; compare `cfg=DX-60` (g1_05) |
| 4 | **leanF at 240 Hz vs 720 Hz: the bistable landing (prone vs supine)** | `scenario=leanF&t=9.8` vs `…&hz=720` (g1_08 / g1_09) |
| 5 | awkward knee-rotation overshoot (20.7°, end-stop compliance; emergency stop untouched) | `scenario=awkward&t=0.425&show=limits&joint=knee_R` (g1_06) |
| 6 | the largest settled excursion: V2-198-92 upright, shoulder flexion 1.32° | `scenario=upright&human=V2-198-92&t=9.8&show=limits&joint=shoulder_R` (g1_07) |
| 7 | the known issue: 20 m/s kick into the shin proxy | `scenario=hsKickShin&t=0.06&show=colliders` (g1_10) |
| 8 | impact15 diagnostic first touch | `scenario=impact15&t=0.021` (g1_11) |
| 9 | leg-into-leg self-collision at football speed | `scenario=isoSelfCol&t=0.03` (g1_12) |

## 8. Remaining technical debt (DECISIONS.md register)

| id | item | status |
|---|---|---|
| **TD-1** | **150-iteration solver cost.** Correctness configuration, not production: physics +75 % against the previous baseline (2.42 vs 1.74 CPU s per simulated s for 22 players). At 180 Hz it does not fully remove the hard-landing rebound (drop1m 0.83 J). | Find equivalent correctness more cheaply: impact-aware warm start, island velocity-step overrides, sub-stepping on impact steps, or the native path. Do not lower iterations without that evidence. |
| **TD-2** | **High-speed compound-foot contact.** The thin 10-piece boot misses 2–3 contact steps at about 20 m/s against a static shin proxy. Contact still occurs. | Targeted remedy in a later contact / tackle gate, without foot distortion or indiscriminate CCD. |
| TD-3 | Passive-layer JavaScript, 0.16 ms/tick per player: now 35 % of the per-player cost. | Vectorise / port; no behaviour change. |
| TD-4 | End-stop stiffness is bounded by the implicit drive at 240 Hz. A 1° stop injects 23–70 J. | Only if a tighter settled ROM is wanted later. |
| TD-5 | Passive fall outcome class is rate-sensitive for bistable falls. leanF lands mostly prone at 240 Hz, almost always supine at 720 Hz. | Later fall / recovery gates should treat passive landing class as distributional and rate-sensitive. |
| TD-6 | Joint-integrity accuracy below the validation rate: awkward at 180 Hz, 5.3–5.4 mm. | Do not run the character below 240 Hz without re-validation. |

## 9. What changed in this round

- **D1a, D2a, D3a and D4a–d** are integrated into the specification (dated amendments), DECISIONS.md, criteria v3 and the code.
- **Harness fixes** (no physics change):
  - worker recycling against WASM heap leaks;
  - diagnostic boot variants rebuilt from the regenerated 27-vertex hull;
  - the 12-piece diagnostic at Jolt's default hull tolerance;
  - the browser check and stills driven over CDP;
  - v3.1 of row 8, as described above.
- **The seven passive-drive defects (G1-D2 … D8)** are preserved in DECISIONS.md, "Research history".
- **G0 was rerun after every representation or margin change:** PASS 8/8, including the new 0.10e.
