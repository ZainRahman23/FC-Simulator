# SP2F3 log: the posting arm corrected from the hand outward

**Instruction:** `sources/2026-10-14_user_instruction_sp2f2_arm_correction_hand_outward.md` (≈ 22:58 BST, 14 Oct 2026; pasted by the owner).

**Fixed throughout:**
- **Friction:** F37.5 (temporary).
- **Unchanged:** run-to-tackle, dive / scissor, folded-leg tuck, tackling leg, boot, root / COM, body, recipient and C3.
- **Not used:** no world-space or height hand target, no rigid constraint, no anti-roll torque.
- **Not accepted:** SP2F2's folded-knee overrun (5–8°).

**Conventions:** 5.0 m/s unless noted; times after the first fold-side contact.

## 1. Re-watching (frame strips) — what the "giant raised arm" is

The high arm in the SP2F2 rear and side views is the **tackling-side** arm. SP2D–SP2F2 author it up and over the body.

The **posting** arm shows a different error:
- It plants beside the hip at about +0.1 s.
- The turf then drags the hand back toward the head.
- It becomes a long, straight lever swept along the turf (`v3/scripts/sp2f3_armrel.mjs` on the SP2F / SP2F2 records).

**SP2F2 posting arm (4.5 / 5.0 / 5.5 m/s):**

| | value |
|---|---|
| hand drift relative to the pelvis | 0.68 / 0.76 / 0.86 m |
| elbow | −7…+23° (straight) |
| upper arm | rising from pointing down (−58…−61°) to −22 / −18 / −4° (≈ horizontal) |
| shoulder vs hand | the shoulder ends outboard of the hand (−0.10 / −0.22 / −0.31 m) |

SP2F is the same, with 0.76 / 1.01 / 0.93 m of drift.

## 2. REFERENCE3 annotation (`v3/evidence/REFERENCE3_arm_annotation.json`)

**Method:** 20 frames, 0.30 → 2.20 s of the clip, 2× zoom with a 10 px grid. Keypoints: head, posting shoulder / elbow / hand, the other shoulder, pelvis. Precision ≈ ±5 px.

**Orientation:** the player slides on his **right** side. We see his back, his posting arm is his right, and the camera is behind him on the posting side. Mirrored, this is our rear 3/4 view of a left-side slide.

**Observations:**
- The hand stays at a near-constant image offset beside and slightly behind the hip.
- The shoulder lowers toward the hand.
- The elbow bends progressively: ≈ 9° → 79° in the image.
- The upper arm stays steep: ≈ −65 … −87°.
- The forearm flattens onto the turf: ≈ −78° → −8°.

This is a forearm post that the torso lowers onto.

## 3. Controller (opt-in `slide_phys2/scripts/sp2_ctrl.mjs`; inert when absent)

**Regression:** SP2 `792ce24e…`, SP2A `3062e3e2…`, SP2F `7838fc53…` and SP2F2 `badcc352…` are all unchanged after every edit.

**`post.hold` (hold):**
- At the first forearm contact, the hand's horizontal offset from the pelvis is captured.
- A capped Jacobian-transpose spring-damper (Kh, Dh, Fhmax) keeps the hand near that offset.
- Frame: "translation" by default.
  - The "heading" frame was tried first (A0). The pelvis yaws ≈ 30° during the slide, which swung the target round. The hand ended under the body, with the elbow at 150°.

**`elbowK` / `shoulderK`:** a compliant fraction of the joint's stiffness toward its orientation at contact.

**`hold.strut` (F0, C, Fmax, cut):** an eccentric support strut.
- An axial push, plus a damper on the shoulder's closing speed toward the hand.
- It adds to the light vertical press, and acts only while the arm points upward from the hand.
  - First version (GE) scaled it by â_y. Its push lifted the hand off the turf once the shoulder was below it.

**`post.lean`:** a state-triggered lean onto the planted hand (tried, see §4).

## 4. Candidate history (`v3/scripts/sp2f3_cand.mjs`; quick evaluator in scratch; SP2F torso unless noted)

**A / B (hold only, press 80 N):**
- The trunk sits upright and later topples over the arm at about +1.0 s.
- The shoulder passes outside the hand; the elbow folds to 147°.

**C (press 80–240 N, elbowK, shoulderK, pelvis roll 60 / 75):**
- Trunk rates 210–240°/s.
- The shoulder still crosses the hand.
- Joint stiffness cannot carry body weight without locking or folding.

**D (post-contact lateral lean):** with a weak arm, the elbow collapses (to 138–147°).

**G (eccentric strut, C 600, F0 60):**
- The hand stays outboard (≥ 0.29 m) and the elbow flexes 23 → 60–75°.
- Rate 158°/s.
- The hand lifts off late (fixed: the strut acts only while the arm points upward).

**K (lean 0.55 → 1.15 s):** 5.0 m/s rate 158°/s, RMS 414, hand drift 0.38 m.

**Q / U (lower tackling-side arm):** its hand is still 0.41–0.62 m above the shoulders (the trunk is on its side), and the post is less consistent. Not adopted.

**S (lean triggered at the hand plant):** worse — 4.5 m/s rates 260–310°/s, 5.0 m/s gaps.

**T (strut limits):** F0 150 / Fmax 1000.
- 4.5 m/s: rate 119°/s, but the elbow locks straight and then buckles (−5° → 92° at +0.8 s, with a 0.1 s hand lift).

**V (elbow kept bent):**
- Reach elbow 35°, elbowK 0.3, strut F0 60 / C 1600.
- The elbow stays bent and yields progressively at all speeds; no gaps.
- Rates 176–213°/s.

**W (softer, later lean):** lumbar −5°, thoracic −14°, 0.62 → 1.52 s.
- **W0.9_−5_0.62_0.62 kept.**

**Z (robustness):** lean start ± 30 ms, strut C ± 30 %, hold ± 30 %, reach end ± 30 ms, lean ± 2°; 30 runs.
- 0 chest-down; 0 hand gaps.
- 4 rocks of 3.2–3.6°; 2 elbows of 120–125° (4.5 m/s).
- Max rate 168°/s.

**R (reach pose):** every earlier plant either collapses the elbow at 4.5 m/s or locks it straight. Kept abduction 45°, extension 35°, elbow 35°, ending 0.62 s.

## 5. SP2F3 (`v3/evidence/SP2F3_opts.json`), final evaluation (`v3/scripts/sp2f3_final.mjs` → `v3/evidence/SP2F3_eval.json`)

**Settings:**
- **Torso:** SP2F's recline with pelvis roll 60°, plus the lean (lumbar −5°, thoracic −14°, 0.62 → 1.52 s).
- **Reach:** abduction 45°, flexion −35°, elbow 35°, by 0.62 s; target blend 0.03 s.
- **Press:** 60 N.
- **Hold:** 600 N/m, 60 N·s/m, ≤ 120 N.
- **Strut:** F0 60 N, C 1600 N·s/m, Fmax 1000 N, cut 0.15.
- **Joint compliance:** elbowK 0.3, shoulderK 0.

**Results (4.5 / 5.0 / 5.5 m/s):**

| | SP2F | SP2F2 | SP2F3 |
|---|---|---|---|
| first hand contact | +0.10 / 0.22 / 0.28 s | +0.08 / 0.12 / 0.15 s | +0.24 / 0.36 / 0.45 s |
| gaps | none | none | none |
| hand drift relative to the pelvis | 0.76 / 1.01 / 0.93 m | 0.68 / 0.76 / 0.86 m | **0.24 / 0.29 / 0.24 m** |
| hand outboard of the shoulder (min) | −0.30 / −0.30 / −0.25 m | −0.10 / −0.22 / −0.31 m | **0.27 / 0.39 / 0.42 m** |
| elbow | −6…25 / −7…42 / −6…32° | −7…−2 / −7…10 / −7…23° | **45→114 / 17→67 / 8→40°** |
| upper-arm elevation | up to −4 / −4 / −17° | up to −22 / −18 / −4° | **−78…−40 / −68…−44 / −55…−43°** |
| peak trunk rate | 98 / 107 / 143°/s | 120 / 133 / 182°/s | 116 / 125 / 157°/s |
| RMS trunk acceleration | 547 / 442 / 573 | 543 / 545 / 492 | 499 / 342 / 465 |
| backward rock | 5.5 / 1.4 / 4.3° | 0.8 / 2.7 / 2.5° | 2.9 / 1.7 / 2.9° |
| trunk < 30° after landing | 0.40 / 0.42 / 0.46 s | 0.12 / 0.23 / 0.26 s | ≈ 0.40 s |
| folded knee past its stop | 1.7 / 1.0 / 1.5° | 7.6 / 6.4 / 5.1° | **1.9 / 1.0 / 1.7°** |
| slide | 4.10 / 5.38 / 6.75 m | 4.09 / 5.33 / 6.79 m | 4.15 / 5.44 / 6.84 m |

- Never chest-down; no failure or fallback.
- **Determinism:** `5fcdb906d5021998` ×2.

**Renders:**
- `v3/render/sp2f3_render.sh` → `v3/review/video/`: tight rear 3/4 and side views (zoom 1.35, crop [110, 170, 280, 233]); torso + pelvis + posting arm only; SP2F | SP2F2 | SP2F3; speeds; diagnostic.
- `v3/render/sp2f3_compose_reference.py` → `v3/review/local_reference/` (gitignored): REFERENCE3 mirrored, cropped on the annotated torso and hand | SP2F2 | SP2F3.

**Page:** `v3/render/sp2f3_review_build.mjs` → `v3/review/SP2F3_REVIEW.html`.

**Visual review:** I cannot play video in real time. I reviewed the focused 1× side-by-side frame by frame at 30 fps, plus the side and torso-only views.
