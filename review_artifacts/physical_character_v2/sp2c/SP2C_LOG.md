# SP2C log: 3D leg tuck and active physical follow-through

The instruction is `sources/2026-10-14_user_instruction_sp2c_3d_tuck_active_follow_through.md` (≈ 15:53 BST, 14 Oct 2026).

**Fixed throughout:**
- **Friction:** the TEMPORARY development value F37.5. The non-stud body friction is multiplied by 0.375 after TCF-1, using `sp2a/fsweep/scripts/fs_contact.mjs` unchanged; stud traction is unchanged. F37.5 is not canonical and is not tuned here.
- **Unchanged:** entry speed, physical root trajectory, body, ground model, C3, the simulation, RUN-1, SP2A and FSWEEP.
- **Runs:** three RUN-1 run-ins (tackler 4.5 / 5.0 / 5.5 m/s), each simulated for 6 s.

Times are given from the plant touchdown.

## 1. Baseline: SP2A at F37.5

| run-in | first fold contact | knee in pelvis at contact (x, y, z) m | prone from | slide |
|---|---|---|---|---|
| 4.5 m/s | 0.42 s | (−0.18, −0.26, 0.35) | 1.15 s | 4.26 m |
| 5.0 m/s | 0.42 s | (−0.19, −0.31, 0.31) | 1.20 s | 5.48 m |
| 5.5 m/s | 0.42 s | (−0.18, −0.33, 0.28) | 1.37 s | 6.94 m |

In pelvis-local coordinates, x is lateral (− is the fold/left side; the fold hip is at x = −0.095), y is along the pelvis up axis, and z is anterior.

**Findings:**
- **Knee placement:** at first contact the knee is 9 cm outside the fold hip, and the hip is abducted +14°.
- **Tuck timing:** SP2A's 3D tuck morph begins at 0.48 s, after contact.
- **Fold hip limit:** hip_L.x is held 6–10° past its stop for about 1.2 s.
- **Roll ledger** (contact angular impulse about the travel axis over [first fold contact, +2 s], 5.0 m/s): knee_L +35.7, hip/pelvis +19.7, torso −49.4 N·m·s. The support forces act on the fold side of the COM, so the body tips over the fold side and onto its front.

## 2. First attempt, SP2C-0 (`scripts/sp2c_cand_v0.mjs`): falls SUPINE (superseded)

**What changed, all at once:** the compact tuck from the push-off, trunk recline, a fold-arm post, a tackling-side arm, a stronger seat objective, held authority, and the tracks extended to 3.5 s.

**Result:** the knee is under the pelvis at contact (x ≈ 0), and no run goes face-down. But the body rocks back onto its back by +0.5 s, the head is on the turf from 1.2–1.8 s, and it ends lying supine at all three speeds. Search S1 (CMA over 27 options of this design, 6 generations) could not find a candidate whose trunk stays up. It was stopped, and its log is kept outside Git.

**Lesson:** too many simultaneous changes. Each change must answer a diagnosed problem, which is what the brief asks for.

## 3. Roll-over diagnosis (`scripts/sp2c_rollover.mjs`, `evidence/sp2c_rollover.json`)

Single-factor changes to SP2A at F37.5, three run-ins, 6 s. Each cell is the time first prone (s), or "—" for none.

| factor (changed ALONE) | 4.5 | 5.0 | 5.5 | reading |
|---|---|---|---|---|
| baseline (SP2A) | 1.15 | 1.20 | 1.37 | every run rolls face-down |
| authority held at 1.0 (no A7 decay) | 1.18 | 1.25 | 1.80 | slightly later only |
| arms limp (0.15) after contact | 1.14 | 1.27 | 1.53 | **SP2A's arm does nothing** |
| fold arm posted wide/lateral | 0.97 | 1.01 | 1.19 | worse |
| SP2C compact fold-leg tuck | 1.51 | 1.35 | 1.25 | little change |
| **trunk counter-lean ×2** (lumbar lat 16→30°, thoracic 8→15°) | **—** | **—** | **—** | **seated / reclined in all three** |
| no trunk counter-lean | 0.82 | 0.80 | 0.82 | much earlier |
| tackling leg kept low | 1.15 | 1.19 | 1.48 | no effect |
| seat objective ×4, held to 6 s | 1.54 | — (side) | — (side) | partial |
| no seat objective | 1.08 | 1.10 | 1.11 | earlier |
| head held up (neck 18→32°) | 1.14 | 1.20 | 1.36 | no effect |
| all targets held to 6 s | 1.07 | 1.07 | 1.26 | no effect |

**Diagnosis:** the universal late roll-over is a **lateral trunk/pelvis organisation** defect.
- After the fold side lands, the trunk's counter-lean toward the tackling side is too weak to keep the COM over the narrow fold-side base. The pelvis-orientation control (the seat objective) is too weak to hold the roll.
- The body tips over the fold side, then onto its front.
- **Contributing:** the decaying authority (minor). The arm post is missing in function, not in pose: SP2A's posted arm carries about 1% of the load, and making it limp changes nothing.
- **Not responsible:** head control, the tackling-leg geometry, and the timeline end.

## 4. Ladder on SP2A (`scripts/sp2c_cand.mjs`, which is SP2A plus optional groups)

| step | change | 4.5 | 5.0 | 5.5 | notes |
|---|---|---|---|---|---|
| L1 | trunk counter-lean (lumbar 30°, thoracic 15°) | seated | seated | seated | trunk up and head 0.73 m at 6 s; knee still 20 cm outside the hip at contact; hip_L.x 5–7.5° over the stop for about 2 s |
| L2 | L1 + compact tuck from the push-off (knee under the pelvis at contact) | supine | prone 3.55 s | prone 1.47 s | **the tuck narrows the fold-side base** |
| L2b | L2 + everything held to 6 s | supine | seated | prone 1.46 s | |
| L3a | L2b + seat ko 400 | supine | supine | supine | |
| L3b | L2b + authority held 0.7–0.9 | supine | supine | prone 1.46 s | |
| L3c | L2b + counter-lean 36° / 18° | side | side | prone 1.90 s | the lumbar lateral stop is exceeded (3–6°) |
| L3d | L2b + fold arm post (−50°, 60°, elbow 5°) | supine | prone 1.82 s | prone 1.38 s | |

**Reading:** the trunk counter-lean fixes SP2A's roll-over. With the knee tucked under the pelvis, the fold-side base is narrow, and no single change restores stability. The organisation has to be found jointly. That is search S2, below.

## 5. Search S2: joint organisation on SP2A (`scripts/sp2c_search.mjs`, CMA-ES)

**Setup:**
- 27 parameters:
  - fold tuck and its timing;
  - trunk lateral counter-lean, flexion and neck;
  - seat objective;
  - arm targets;
  - tackling leg after the strike;
  - held post-contact authority per region.
- Everything is held to 6 s. Three run-ins at F37.5, 6 s each.
- Cost `costSP2C`: knee placement in the pelvis at contact and +100 ms; fold-boot toe/sole share and studs; prone (graded by time); lying back; head on the turf; the 6 s posture; glide shares; slide ≥ 3.5 m; SP2's tackle terms; limits.

**Progress:** the start (prone in all three runs, cost 40.1) reaches 5.16 by generation 3. The result is seated at all three speeds, never prone, head never on the turf, trunk upright at 6 s, the knee under the fold hip at contact (x −0.10…−0.11 m), and no fold toe, sole or stud load. S2 did not improve after generation 3 and was stopped at generation 8.

**Seen in renders and diagnostics:**
- **After the slide stops (about 2.6 s):** the body HOLDS its slide pose with both arms out like a statue. It is organised, but it is pose-holding, not a follow-through.
- **Tuck at contact:** the targets lag. Hip flexion 31° of 59°, ankle plantarflexion −21° of −41°.
- **Knee after contact:** it crosses the pelvis midline at +100 ms (x +0.04), then unfolds to 100° by +500 ms (SP2A F37.5: 81°).
- **Fold hip:** it sits 1.8–2.6° past its adduction stop for about 5 s (a small but sustained overrun).

## 6. End of slide: a state-triggered recovery (opt-in `sp2_ctrl` `opts.recover`)

**Mechanism:** a new, opt-in, inert-when-absent phase in the RegionalTracker.
- It starts when the body's own horizontal COM speed (sensed 25 ms late from the plant records) falls below 0.8 m/s, at least 0.5 s after the first fold-side contact.
- From then, every target blends (smoothstep, 0.8 s) into a recovery posture.
- It changes targets only: authority, yielding and fallback are unchanged, and there is no root, COM or propulsion objective.
- Being state-triggered rather than timed, it is general behaviour: the slide ends at different times at different speeds.
- **Regression:** SP2 still gives `792ce24ee2a3c678` and SP2A `3062e3e24694aaf0`.

**Recovery postures tried on the S2 candidate** (three speeds; cells give the time first prone):

| recovery posture | 4.5 | 5.0 | 5.5 |
|---|---|---|---|
| none (S2: holds the slide pose) | seated | seated | seated |
| tackling leg drawn in (hip 60°, knee 80°) | prone 4.92 | seated | prone 5.26 |
| arms lowered (fold hand down beside the hip, other arm relaxed) | seated | seated | seated |
| trunk forward (lumbar +12°, thoracic +5°) | seated | seated | seated |
| arms + trunk + leg drawn in (R1/R2/R3 variants) | prone 3.6–4.2 | prone 3.9–4.7 | prone 4.0–4.7 |
| arms + trunk, tackling knee 40° | prone 4.29 | prone 4.88 | prone 4.82 |
| **arms + trunk, tackling leg kept extended (Rc1)** | **seated** | **seated** | **seated** |

**Finding:** the extended tackling leg is the tackling-side outrigger of the seated base. Drawing it in, even to 40°, while the arms come down removes the base on that side, and the body tips over the fold side onto its front.
- A real get-up needs a planted hand that carries weight and a deliberate weight transfer. That is a separate get-up skill, not this slide.
- SP2C therefore ends in the Rc1 recovery posture: the arms come down from the balance pose, the trunk comes forward over the legs, the head stays up, the fold leg stays tucked, and the tackling leg stays extended. The body sits up, organised and active.

## 7. Searches S3 and S4; the fold-hip limit

**S3** (all 28 parameters; cost adds `compact` and heavier limit weights; the Rc1 recovery included; start = S2 best):
- **Cost changes:**
  - `compact`: the folded knee should stay at or above 120° through the first second of contact, and the ankle should be plantarflexed to −15° or more at contact.
  - Limit weights: a sustained hip overrun now costs 1.0 per °, and any ankle overrun 0.6 per °.
  - New parameter: the tuck may start during the final stance (`foldT0` 0–0.1 s) and be reached as early as 0.16 s.
- **Result:** after 7 generations, every generation's best (12–16) was worse than the start (10.2). Over 28 dimensions, the CMA step is too disruptive around this narrow optimum, so S3 was stopped.

**Fold-hip limit:**
- **Identification** (`climits` on the record): `hip_L.x` is the hip's axial (rotation) axis, with a hard range of −50…+45°. While the body sits on the folded leg, the hip is held at 48–49° of EXTERNAL rotation for about 5 s. That is 1.8–2.6° past the 45° stop: passive end-range loading of a side-sit.
- **Probes at 5.0 m/s** (excursion past the stop):

| change | excursion | other effect |
|---|---|---|
| none (S2 + Rc1) | 1.8° | — |
| pelvis roll 35° | 5.9° | — |
| pelvis roll 8° | 2.0–2.5° | — |
| rotation target −40° | 4.0° | — |
| rotation target −10° / −15° / −20° | 1.5–3.3° | 4.5 m/s goes prone |
| hip flexion 80° | 3.5° | — |
| seat pitch −20° | 6.0° | body ends supine |
| trailing-leg authority 0.9 | 2.2° | — |
| fold-leg keys in the recovery | 1.8–2.5° | — |

- **Conclusion:** no organisation lever removes it. The load of sitting on the folded thigh drives the hip into its external-rotation end range, which is a body-spec boundary (V2 stop 45°).
- **Comparison:** SP2A at F37.5 holds the same axis 6–10° past the stop for about 1.2 s, until it rolls face-down and the leg unloads. SP2C reduces the excursion to about 2°, but holds it for as long as the player sits.

**Shin compactness:** holding the trailing-leg authority at 0.85 after contact (instead of 0.52) with a 140° knee target halves the `compact` cost (the knee stays more folded through the first second). All three speeds stay seated.

**S4** (14 parameters: fold timing and angles, trailing-leg and trunk authority, counter-lean, seat roll and gain; others fixed at the S2 best + trailing authority 0.85 + knee 140°; σ 0.1, λ 12): see §8.

## 8. S4 result and the final candidate

**Search:** S4 went from a start cost of 9.38 to 8.14 at generation 3, and did not improve over the next 10 generations (σ 0.1 → 0.06). It was stopped at generation 13.
- **Best (`evidence/SP2C_opts.json`):** tuck from 0.086 s, reached at 0.29 s (hip 62° / +12° / −25°, knee 138°, ankle −43° / +11°); counter-lean lumbar 29.5°, thoracic 17.9°; seat roll 25° (gain 56).
- **Held authority after contact:** tackling leg 0.54, folded leg 0.92, trunk 0.83, arms 0.60 / 0.82.
- **Arms and ending:** fold arm extended back and low; tackling arm out; the Rc1 recovery.

**Final evaluation** (`scripts/sp2c_final.mjs` → `evidence/SP2C_eval.json`; records in `_preserved_…/sp2c/records/`):

| | 4.5 m/s | 5.0 m/s | 5.5 m/s |
|---|---|---|---|
| hash | `08faaaa8` | `8a26adef` | `ae785f37` |
| state at 6 s | seated | seated | seated |
| first face-down | never | never | never |
| head on the turf | never | never | never |
| slide | 4.45 m | 5.49 m | 6.93 m |
| recovery trigger | 2.29 s | 2.51 s | 2.79 s |
| horizontal closure | 0.002 N·s | 0.005 N·s | 0.008 N·s |

- **Determinism:** 5.0 m/s re-run identical.
- **SP2A at F37.5** on the same evaluation: prone at 1.15 / 1.20 / 1.37 s.

**Obstacles** (`scripts/sp2c_obstacle.mjs` → `evidence/obstacle/`):
- **O1 (glancing box), O2 (20 kg box):** deflected and yielding, and the body stays organised.
- **O3 (immovable post):** tackling-leg regional failure at 0.68 s, no whole-body fallback, slide 1.11 m, ends near face-down. A severe disruption is allowed to overwhelm the organisation.

**Renders:** `render/sp2c_render.sh` → `review/video/` (in Git). The reference composites from `render/sp2c_compose_reference.sh` go to `review/local_reference/` (gitignored).

**Review page:** `render/sp2c_review_build.mjs` → `review/SP2C_REVIEW.html`.

**Report and verdicts:** `SP2C_REPORT.md`.
