# SP2F3 report: the posting arm corrected from the hand outward

This report answers your correction of 14 Oct 2026 (`sources/2026-10-14_user_instruction_sp2f2_arm_correction_hand_outward.md`). The work is local and stopped for your visual review.

- **Page:** `v3/review/SP2F3_REVIEW.html` (served at :8350/sp2f/v3/review/SP2F3_REVIEW.html).
- **Log:** `SP2F3_LOG.md`.
- **Evidence:** `v3/evidence/`.

**Not done or changed:**
- No knee / run-transition trade-off decision; the folded-knee overrun is not accepted (it is gone, see the table).
- The run-to-tackle transition is not modified.
- No friction calibration; F37.5 is temporary and unchanged.
- No recipient work.

## What was wrong (you were right)

**SP2F2's posting hand was not the stable end of the chain.** After contact, the turf dragged the hand backward and outward relative to the pelvis, by 0.7–0.9 m:
- the elbow stayed straight;
- the upper arm rose from pointing down to about horizontal;
- the arm became a long, straight lever swept back along the turf.

Its 120–135° shoulder angle came from that sweep. The hand-relative measures show it clearly; the shoulder-angle number hid it.

**The tall raised arm in the SP2F2 views is the tackling-side arm.** SP2D–SP2F2 author it up and over the body. I left it unchanged so you can judge the posting arm on its own, and it can be lowered next.

## What REFERENCE3 does (20 hand-annotated frames)

- **Mirroring:** its player slides on his right side. Mirrored, it matches our rear 3/4 view.
- **The hand:** it stays at a near-constant offset beside and slightly behind the hip.
- **The shoulder:** it lowers toward the hand.
- **The elbow:** it bends progressively, about 9° → 79°.
- **The upper arm:** it stays steep.
- **The forearm:** it flattens onto the turf.

It is a forearm post that the torso lowers onto.

## What SP2F3 does

1. **Reach DOWN.** The hand goes down beside and behind the hip, with the elbow bent.
2. **Hold the hand with the body.** From the first forearm contact, the hand's horizontal offset from the pelvis is captured. A compliant, capped hold keeps the hand there, so it slides with the player's translation.
   - It is translation-only: the body may turn about the hand.
   - Its height is left to the turf, plus a light 60 N press.
3. **Support like a limb.** The arm acts as an eccentric strut: it resists being compressed quickly, which manages the fall, but shortens as the torso lowers.
   - It does not resist rotation about the hand.
   - The elbow keeps 30 % of its stiffness toward its angle at contact, so it yields progressively instead of locking straight and buckling.
   - The shoulder has no angle target.
4. **Torso.** SP2F's torso is kept, with no in-air release, so there is no knee overrun. After contact it leans gradually onto the planted arm.

There is no world-space hand target and no rigid constraint, and the muscles are finite.

## Your acceptance test (4.5 / 5.0 / 5.5 m/s)

| | SP2F2 (current) | SP2F3 (corrected arm) |
|---|---|---|
| hand comes down, establishes the post | +0.08 / 0.12 / 0.15 s | **+0.24 / 0.36 / 0.45 s** (later; see below) |
| hand stays on the turf | continuous | **continuous** (and in 30 / 30 perturbed runs) |
| hand drift relative to the pelvis | 0.68 / 0.76 / 0.86 m | **0.24 / 0.29 / 0.24 m** |
| hand stays outboard of the shoulder | no: the shoulder passes outside it (to −0.31 m) | **yes: ≥ 0.27 m** |
| shoulder lowers toward the hand | — | **hand − shoulder height −0.62 → −0.21 / −0.29 / −0.36 m** |
| upper arm | rises to −22 / −18 / −4° (≈ horizontal) | **stays down: −78…−40 / −68…−44 / −55…−43°** |
| elbow | straight (−7…+23°) | **progressive: 45→114 / 17→67 / 8→40°** |
| torso | — | peak 116 / 125 / 157°/s; rock ≤ 2.9°; never chest-down |
| folded knee past its stop | 7.6 / 6.4 / 5.1° | **1.9 / 1.0 / 1.7°** (SP2F level) |
| slide | 4.09 / 5.33 / 6.79 m | 4.15 / 5.44 / 6.84 m |

- **Video:** the focused side-by-side is REFERENCE3 (mirrored) | SP2F2 | SP2F3, tight rear 3/4, at 1× and 0.25×. It lives in `local_reference/`, which is gitignored. SP2F2 | SP2F3, side and torso-only views are in Git.
- **The hand-relative plots** put REFERENCE3's annotated image-plane values next to all three candidates.

## Not achieved / for your eye

- **Later hand plant:** later than SP2F and the reference. From SP2F's upright landing trunk, a bent-elbow reach meets the turf only as the trunk starts to lean. Every straighter, earlier reach locked the elbow and buckled it at 4.5 m/s.
- **Upright seated phase:** about 0.4 s after landing, as in SP2F. The lean onto the arm starts after the hand is down.
- **Forearm direction:** the corrected forearm ends pointing back, beside the hip, toward the camera. REFERENCE3's points straight out to the side.
- **The tackling-side arm:** still raised high (unchanged).
- **4.5 m/s:** the elbow ends at about 114°, with the forearm flat and the body low.
- **New small sustained excursion:** posting shoulder_L.x about 2° at 4.5 m/s, from the strut loading the shoulder.
- **Image-plane comparison:** qualitative only (monocular, hand-annotated ±5 px, different camera).
- **Visual review:** I reviewed the focused side-by-side frame by frame at 30 fps. I cannot play video in real time.

Stopped for your visual review.
