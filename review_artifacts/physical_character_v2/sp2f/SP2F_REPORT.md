# SP2F report: one continuous controlled recline + a persistent sliding arm post

This report covers the instruction `sources/2026-10-14_user_instruction_sp2f_continuous_recline_sliding_post.md` (14 Oct 2026). The work is local and stopped for the owner's visual review.

- **Review page:** `review/SP2F_REVIEW.html` (served at :8350/sp2f/review/SP2F_REVIEW.html).
- **Log:** `SP2F_LOG.md`, including every candidate.
- **Evidence:** `evidence/` (`SP2F_opts.json`, `SP2F_eval.json`, `SP2F_answers.json`).

**Fixed throughout:**
- **Friction:** F37.5, unchanged.
- **Unchanged:** the run-to-tackle transition, dive/scissor, folded-leg tuck, boot model, root/COM, body, C3 and the recipient.
- **Not started:** calibration, the get-up and the running recipient.

## What made SP2E fall over (5.0 m/s)

1. **At contact (+0.00…+0.11 s):** the authored arm swing and the fast-start trunk targets (up to 730°/s of target change) jolted the trunk to 300°/s on top of the landing.
2. **+0.12 s:** the hand hit the turf.
3. **+0.20…+0.57 s:** the authored arm-opening target lifted the hand 15 cm back off the turf.
4. **+0.30…+0.60 s:** without the post, the pelvis rolled over its edge at up to 121°/s, while the authored targets barely changed. This is gravity past an unstable threshold.
5. **+0.62 s:** the torso slammed into the turf at 402°/s. That is the visible fall-over. SP2D shows the same structure later (+1.24 s, with the hand off the turf from +1.40 s).

## What SP2F does (`scripts/sp2f_cand.mjs`)

- **One recline intention.** Every trunk and head target moves along a single sine curve from 0.20 to 1.5 s, and the pelvis objective follows the same curve. There is no fast ramp, no phase, and no later target or authority step.
  - It begins at contact on purpose. SP2C's in-air counter-lean is what rolls the pelvis onto the folded side for landing, so releasing it in the air lands the pelvis flat and forces the folded hip 9–10° past its stop.
  - The pelvis objective's strength builds over 0.35 s after landing, instead of 0.03 s.
- **The arm touches once and then slides.** It reaches toward the turf across contact.
  - From the first forearm contact it has no authored angles. Its targets fade out, and it presses the hand down with 150 N plus its own damping (new opt-in `sp2_ctrl` `opts.post`).
  - The turf and the lowering body set the shoulder and elbow.
- **No added control of the body's path:** there is no anti-roll torque and no root, COM or propulsion objective. Horizontal closure is ≤ 0.003 N·s.

## Your stop checklist

| | |
|---|---|
| TORSO RECLINE IS CONTINUOUS | **YES**: monotonic from about 16° to about 80°; after landing ≤ 98 / 107 / 143°/s (SP2E 263 / 239 / 324). Residual: a quicker segment right after the hip lands (+0.30…0.45 s) and a brief slow-down near 41° (+0.55…0.70 s) at 5.0 m/s |
| VISIBLE FALL-OVER EVENT | **NO** by the traces: no late spike, the torso never slams (tipping ≤ 112–162°/s against SP2E's 373–402), the hand never leaves the turf. Please judge the early segment visually |
| PELVIS/TORSO MOTION COORDINATED | **YES**: the pelvis roll (about 28° → 75–82°) rises with the trunk, at a roll rate ≤ 65–71°/s after landing |
| POSTING HAND REACHES TURF | **YES**: +0.10 / +0.22 / +0.28 s |
| POSTING HAND MAINTAINS SLIDING CONTACT | **YES**: continuous to the end of the slide at all speeds (SP2D and SP2E have gaps); it slides 3.3 / 3.7 / 4.7 m |
| ARM ANGLE EVOLVES PROGRESSIVELY WITH TORSO DESCENT | **YES**: 39° → 87° → 125° → 122° (5.0 m/s), with no authored arm angles after contact |
| ARM DOES NOT ANCHOR THE SLIDE | **YES (qualified)**: it slides at 1–3 m/s with a 0.64–1.25 BW peak. It takes 12–18 % of the braking (SP2E 9–10 %), and the slide is 1–10 % shorter than SP2D's |
| ACTIVE CONTROL REMAINS | **YES**: no failure or fallback; authority ≥ 0.54 |
| FOLDED-LEG/TACKLE ENTRY PRESERVED | **YES**: knee in the pelvis at contact (−0.10, −0.36, 0.27) m; sole-down −0.64; studs 0; only brief small limit excursions |
| PHYSICAL SLIDE PRESERVED | **YES**: 4.10 / 5.38 / 6.75 m (SP2D 4.53 / 5.65 / 6.84 m); deterministic (`7838fc5374221646` ×2) |

## Arm diagnostic (5.0 m/s)

- **First contact and continuity:** first contact at +0.22 s, then continuous to the end of the slide (+2.4 s), with no periods off the turf.
- **Sliding:** 3.75 m along the turf, at a tangential speed of 1–3 m/s.
- **Load:** peak normal 0.64 BW (8 ms); tangential braking impulse 51 N·s.
- **Shoulder elevation while in contact:** 39° → 87° → 125° → 122° → 122°.

## Not achieved, or for your eye

- **The early segment:** the trunk stays at about 15–18° for the first 0.3 s (the knee-glide landing), then reclines quickest at +0.30…0.45 s, as the pelvis rolls over the folded thigh. It is not tracking catch-up: the spine follows its targets to within a few degrees. Every lever I tried either left it in place or brought back a fall (log §3).
- **The arm at landing:** the arm swings down quickly as the body lands (shoulder 530°/s at +0.08 s). That is the landing's inertia; starting the reach later makes it faster. The touch itself is gentle.
- **Pace:** established on the side/back at +0.9…1.2 s, slower than SP2E (about +0.45 s) and the reference (about +0.30 s). This is the continuous recline you asked to prefer.
- **The arm brakes more than SP2E's** because it now stays on the turf.
- **Small sustained excursions:** posting elbow pronation of about 1.5° at 5.5 m/s, and folded hip 1.0° at 4.5 m/s.
- **Visual check:** I reviewed 30 fps frame strips and the traces. I could not play the videos in real time.

Stopped for your visual review. Nothing beyond SP2F has been started.
