# SP2F addendum report: continuous side slide + active posting-arm stabilisation (SP2F2)

This report answers the instruction `sources/2026-10-14_user_instruction_sp2f_addendum_reference3_side_slide_active_arm.md` (14 Oct 2026). The work is local and stopped for your visual review.

- **Page:** `v2/review/SP2F2_REVIEW.html` (served at :8350/sp2f/v2/review/SP2F2_REVIEW.html).
- **Log:** `SP2F2_LOG.md`, with every candidate and diagnosis.
- **Evidence:** `v2/evidence/`.
- **First pass:** SP2F (`28491975`) is preserved and compared throughout.

**Fixed throughout:**
- **Friction:** F37.5, temporary and unchanged.
- **Unchanged:** the run-to-tackle transition, dive / scissor, folded-leg tuck, tackling leg, boot, root / COM, body, recipient and C3.
- **Not used:** no anti-roll torque, root translation, propulsion or world-space hand target.

## What REFERENCE3 shows

- **The drop:** the slider goes onto his folded side during the drop. When the hip lands, the trunk is already ≈ 30–45° toward the folded side.
- **The arm:** the folded-side hand reaches the turf at about the hip landing. It is a long, nearly straight arm, out to the side and slightly behind.
- **The slide:** the body then slides on that side. The trunk lowers slowly while the arm opens.

## What changed (SP2F → SP2F2)

1. **Lateral establishment.**
   - **The issue:** SP2F's "seated upright" phase was not a hold. The trunk arrives leaning ≈ 30° toward the tackling side (SP2C's in-air counter-lean, which lands the pelvis on the folded side), then swings through vertical.
   - **The change:** the counter-lean is now released earlier, from 0.25 → 0.40 s, thoracic-led toward the folded side. The trunk swings onto the folded side as the hand lands, then continues along the same slow recline.
2. **Reach through contact.**
   - The arm is still moving toward the turf at contact.
   - Its targets are released 30 ms after the first forearm contact.
   - This removed the hand hovering and rebounding.
3. **Active, load-aware arm support** (new opt-in `sp2_ctrl` `post.support`).
   - **Feedback:** the press is a two-sided feedback of the sensed trunk lowering, against the same intended lowering the trunk targets follow:
     - 130 N on the intended lowering;
     - down to 30 N when the trunk is behind it, so the arm yields to the descent and does not prop the torso;
     - up to 300 N if it runs ahead, to brake a fall.
   - **Shoulder stabiliser:** a soft end-range stabiliser acts only beyond 115°. It stops the turf dragging the arm overhead, which had made the elbow buckle at 4.5 m/s.
   - **After contact:** no authored arm angles, no hand target, finite muscles; contacts win.
4. **Final organisation:** the pelvis-roll objective goes to 70° (SP2F: 75°). With the earlier lateral establishment, 75° rolled the body chest-down at 5.5 m/s in nearby variants.

## Your checklist (4.5 / 5.0 / 5.5 m/s)

| | |
|---|---|
| immediate lateral slide / no upright hold | **PARTIAL**: trunk within 30° of vertical after landing for 0.12 / 0.23 / 0.26 s (SP2F 0.40 / 0.42 / 0.46 s). It is now one swing through vertical onto the folded side, not a hold. The pelvis reaches its side progressively (≈ 20° → 30° at +0.5 s → 50–58° at +1.0 s) |
| remains lateral once established | **YES**: no excursion toward upright or chest-down. The folded-side shoulder and hip are always the lower ones. Lying direction stays within one side / back-side band (ψ 42…59 / 28…47 / 0…43°) |
| torso lowers progressively within it | **YES**: tilt 56 → 71 / 56 → 75 / 51 → 85°; the largest backward rock is 2.7° (SP2F 5.5°) |
| no discrete fall-over | **YES** by traces: peak trunk rate after landing 120 / 133 / 182°/s (SP2E 263 / 239 / 324). The 5.5 peak is the swing through vertical at ≈ +0.1 s. Landing pelvis-roll kick −98 / −75 / −64°/s (SP2F −179 / −245 / −267) |
| arm reaches the turf once, establishes support | **YES**: +0.08 / 0.12 / 0.15 s |
| hand / forearm stays in sliding contact | **YES**: continuous to the end of the slide (1.9 / 2.15 / 2.5 s). No gaps, including all 27 perturbed runs. Slides 3.3 / 4.3 / 5.4 m |
| hand repeatedly touching / leaving | **NO** (diagnosed and corrected, see "What changed") |
| arm geometry adapts as the torso lowers | **YES**: shoulder 46° → 107° → 124°. The elbow straightens early and stays nearly straight (a long arm, like REFERENCE3). Normal load varies continuously. The posting hand is part of the forearm body (no wrist joint), so wrist / hand organisation is not represented |
| arm does not hold the torso up | **YES (qualified)**: press 34–126 / 46–130 / 63–130 N (mean 63 / 71 / 97), lowest when the trunk is behind its intended lowering. Shoulder effort mean 0.37–0.47 of capacity (SP2F's constant 150 N: 0.56–0.59) |
| no rigid prop / pose lock / hand constraint | **YES** |
| no arm floating, chest-first roll or passive ragdoll | **YES**: never chest-down; no failure or fallback; authority ≥ 0.54 |
| folded-leg / tackle entry preserved | **PARTIAL**: tuck, boot and knee position are unchanged; 0 stud steps. **But the folded knee's tibial axial rotation goes 7.6 / 6.4 / 5.1° past its hard stop for 0.24–0.36 s at the landing** (SP2F ≤ 1.7°, SP2E ≤ 4.2°). Releasing the counter-lean in the air changes how the folded shin lands |
| physical slide preserved | **YES**: 4.09 / 5.33 / 6.79 m (SP2F 4.10 / 5.38 / 6.75); closure ≤ 0.004 N·s; deterministic |

## The trade-off you should decide

How early the trunk goes onto the folded side is limited by the folded leg. Releasing SP2C's counter-lean in the air makes the side slide establish earlier, but:
- **The folded knee:** it twists the landing shin past its tibial-rotation stop. Release at 0.25 s: 5–8°. Release at 0.28–0.30 s: ≈ 3° (SP2E level).
- **A hard pelvis kick:** an earlier release lands the pelvis flatter and it kicks off the impact. Releases at 0.27–0.30 s bring back a −330…−500°/s pelvis kick.
- **Reference-like leaning:** leaning the trunk onto the folded side during the drop, as REFERENCE3 does (upright time 0.075 s), costs a −740°/s pelvis kick and a 290°/s trunk spike.

SP2F2 sits at 0.25 s release: the smallest kick, a 6–8° knee excursion, and 0.12–0.26 s of trunk within 30° of vertical. The run-to-tackle transition gives the body no roll toward the folded side, and that is the root of the problem. Changing it is outside this task.

## Also for your eye

- **The first touch of the hand is an impact:** 2.0–2.6 BW for one 8 ms sample as the leaning trunk lands on the arm. Afterwards the load is ≈ 0.1–0.15 BW.
- **The trunk ends propped on the long arm** at ≈ 70–85° tilt (REFERENCE3 also ends propped). It does not lie flat during the slide.
- **At 5.5 m/s** the swing onto the folded side is quick (182°/s). **At 4.5 m/s** the shoulder opens to ≈ 134° before the stabiliser holds it.
- **Visual check:** I reviewed 30 fps frame strips (rear 3/4 and side) and the traces. I could not play the videos in real time.

Stopped for your visual review. Nothing beyond SP2F has been started: no friction calibration, no recipient work.
