# SP2A reference analysis: the 3D folded-leg tuck and the RUN → DIVE start transition

Two third-party clips are used. Neither is in Git, and no frames or sheets from them may be committed.

- **Ground-entry reference:** `_preserved_2026-10-14_evidence_outside_git/slide_phys2/reference/REFERENCE_2026-10-14_03.49.19.mov`. This is SP2's broadcast clip. Its time base, camera model and pixel scale are taken from `slide_phys2/REFERENCE2_ANALYSIS.md`:
  - about 0.4× slow motion, so t_real = 0.4·(T − 4.65);
  - 69 px/m lateral, 66 px/m vertical, 21 px/m in depth;
  - t = 0 is the first non-sole turf contact (f278).
- **Start-transition reference:** `_preserved_2026-10-14_evidence_outside_git/sp2a/reference/START_REFERENCE_2026-09-29_17.25.13.mov`.
  - Supplied with the SP2A brief; sha256 `f53f9cc6…`.
  - A stylised game trailer ("RABONA"): 3.80 s, 60 fps, 2940×1586, static camera.
  - Frames are numbered from 0 (decode index).

Evidence labels follow REFERENCE2: **OBSERVED**, **MEASURED**, **DERIVED**, **INFERRED**, **ASSUMED**. Left and right are from the slider's own point of view.

Work files are in the session scratchpad (`sp2a/ref/`) and are not committed: frame sheets, full-resolution gridded crops at f76–f98, and close-up sheets.

---

## 1. The folded leg in 3D (broadcast reference)

The brief asks me to check from the footage, rather than assume, whether the fold is a genuinely three-dimensional tuck. The sources are SP2's manual key points (`REFERENCE2_manual_annotations.json`, pixel coordinates, ±2–4 px) and the 4× unique-frame sheet.

| real t | frame | what the trailing (folded, RIGHT) leg does | label |
|---|---|---|---|
| −0.10…−0.04 s | f263–f273 | The R boot is planted (sole). The shank pivots forward and down over it. | OBSERVED |
| 0.00 s | f278 | The instep/dorsum and lower shin reach the turf, with the toe now pointing back. The knee is about 0.1–0.15 m above the turf. | OBSERVED (REFERENCE2 §1) |
| +0.04 s | f283 | Knee (435, 455) relative to hip-mid (426, 426): +9 px along the travel line and 29 px lower. The ankle (406, 454) and toe (390, 457) are at turf level, 29 px and 45 px behind the knee. **The shin lies flat on the turf pointing backward, and the knee is under the pelvis.** | MEASURED |
| +0.06 s | f288 | Knee (425, 459) relative to hip-mid (431, 427): −6 px along the travel line. The knee stays under the pelvis (±0.1 m) while the body passes over it. | MEASURED |
| +0.10…+0.16 s | f293–f303 | The knee moves ahead of the hip (+4 → +6 px) and lower (461 → 470), while the hip-mid drops 11 px. The lateral knee and thigh roll onto the turf as the pelvis rolls onto the fold side. | MEASURED / OBSERVED |
| +0.20…+0.24 s | f308–f313 | The hip/buttock lands. The slide is on the R (fold) side. | INFERRED (REFERENCE2) |

### Findings

- **F1. The folded leg is packaged underneath the pelvis, not merely flexed in the sagittal plane.** MEASURED along the travel axis; INFERRED laterally.
  - From the shin's first contact to the hip landing, the knee stays within about ±0.1 m of the hip along the travel line, while the shin lies flat and points backward.
  - The lateral component (medial/lateral knee displacement) is along this camera's depth axis (21 px/m, coupled with height), so it cannot be measured.
  - It is INFERRED from two facts: the pelvis rolls onto the fold side while the knee stays under it, and the outer knee and thigh then take the load. Relative to the pelvis, that requires the knee to sit medially, i.e. hip **adduction**, together with hip **external rotation** so that the lateral thigh faces the turf.
  - This agrees with the brief's interpretation. The magnitudes are not measurable from this footage.
- **F2. The boot presents its dorsum, not its studs.** OBSERVED.
  - At f278–f288 the toe points back along the shin, which means a plantarflexed ankle. The instep/dorsum is on the turf, so the sole and studs face up and back.
  - Any inversion or eversion is not resolvable.
- **F3. The load passes from the shin/instep, to the knee, to the lateral thigh, to the hip.** OBSERVED; REFERENCE2 §1.
  - The intervals are +0.04 s (knee), +0.10–0.16 s (lateral thigh) and +0.20–0.24 s (hip).
  - The knee is a transit point, not the long-duration support.
- **F4. The tackling (L) boot never plants.** MEASURED, REFERENCE2. Its sole line stays within about 0.05 m of the turf, moving at or above body speed.

### Consequence for SP2A

The geometric tuck search (`scripts/sp2a_tuck.mjs`) encodes F1–F3:
- the lateral thigh, shin and hip near the turf, with the knee not lower than them;
- the sole facing away from the turf;
- every angle inside the V2 hard range with margin.

The chosen tuck is: pelvis pitch −14°, roll +27°; hip flexion 59°, adduction 23°, external rotation 39°; knee 130°; ankle plantarflexion 18°, inversion 22°.

It reaches F1–F3 **without** the 4–8° hip-adduction overrun SP2 needed: the 3D placement (rotation + adduction + roll) replaces SP2's pure adduction. The ankle correction stays inside the existing ankle DOFs. The canonical ankle range is unchanged.

---

## 2. The RUN → DIVE start transition (start reference)

| frames (t at 60 fps) | phase | what happens | label |
|---|---|---|---|
| f66–f78 (1.10–1.30 s) | final running strides | Upright running with normal arm swing. | OBSERVED |
| f78–f80 | final loading stance | Single support. The pelvis lowers, and the trunk starts to lean back and sideways. The free thigh is already swinging forward and across. | OBSERVED |
| f80–f82 (1.33–1.37 s) | commitment / push-off | The support leg extends behind (push-off). The free knee drives forward and up. One arm swings out to the side, then up overhead as a counterweight. The trunk leans back and sideways. | OBSERVED |
| f84–f87 | flight | Both feet are off the turf for **3–4 frames (50–67 ms)**. The lead thigh is high with the knee bent and the sole facing forward; the push-off leg trails, extended. | OBSERVED, MEASURED in frames |
| f88 | trailing contact | The push-off (trailing) boot's toe re-touches behind the body. | OBSERVED |
| f90–f98 | descent / tuck | The lead leg folds under (knee down, shin on the turf sideways). The hips drop onto that side, with the arm still raised. | OBSERVED |
| f98–f110 | seated slide | Seated on the side, legs leading, arm going over. | OBSERVED |

### Findings

- **S1. One continuous event.** OBSERVED. There is no setup pose: the last running stance *is* the commitment.
  - The free leg, the trunk lean and the arm counterweight start during the final support (f78–f82), before take-off.
  - So the whole body participates, not only the plant leg (the brief's question 2).
- **S2. The launch is a push-off from the plant leg with a short flight (50–67 ms).** OBSERVED.
- **S3. In this clip it is the *free* leg that folds and leads into the seat, and the push-off leg trails.** OBSERVED.
  - That is a different leg assignment from the broadcast reference, where the planted leg folds.
  - SP2A keeps the broadcast/SP2 assignment (plant leg = fold leg). It takes the launch mechanics from this clip: commitment during the last stance, free-thigh drive, trunk lean, arm counterweight and a short flight.
  - This is a declared design choice, not a measurement.
- **S4. The descent is at or beyond what gravity allows at face value.** Read by eye on 50-px gridded crops of the static-camera frames f80 and f98 (pelvis heights ±0.1 m, scaled by the character's own leg length); DERIVED.
  - The pelvis goes from about leg length above the turf (final stance, f80) to about 0.2 m (seated, f98) in **18 frames = 0.30 s**, if 60 fps is real time.
  - Starting from rest, a body falls 0.44 m in 0.30 s. Covering the about 0.7 m drop needs about 0.9 m/s of downward velocity at the commitment *and* no upward push-off.
  - The clip shows a push-off with a 50–67 ms flight, which can only lengthen the descent.
  - **Report (brief, "momentum rule"):** if the trailer plays at real time, its stylised drop into the seat is faster than a physically legitimate trajectory from a running push-off.
  - SP2A does not reproduce that timing with a root impulse. Its seat arrives when gravity and the contacts deliver it.
  - The playback-speed assumption (60 fps = real time) is ASSUMED; a game trailer may be retimed.
- **S5. The authored angular rates in the prior reference-tackle authoring of this clip include superhuman values** (free-thigh swing about 25 rad/s).
  - That authoring (frames f56–152) is in the uncommitted `prototype/reference-tackle-v1` worktree and was read only.
  - SP2A's authored rates stay inside the finite motor capability of the M1c tackler: the tracker's intents are bounded by capacity, activation and force–velocity.
