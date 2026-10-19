# TECHNICAL-CONTROL-1.1: feet, ankles and lower-leg IK (focused visual fix)

**Status:** presented for review. NOT frozen, NOT integrated (sandbox only).

- **Owner instruction:** saved verbatim at `sources/2026-10-19_user_instruction_feet_ankles_ik.md`.
- **Review page (local only):** `review/TECHNICAL_CONTROL11_REVIEW.html`.
- **Feet lab:** `http://127.0.0.1:8361/sandbox/visual/technical_control11.html`.
  - Views: quad · front 3/4 · rear 3/4 · side · foot level.
  - Speeds: 1× · 0.5× · 0.25× · 0.1×.
  - Body: TC1.1 · TC1 · TC1 vs TC1.1 on the same simulation.
  - The joint angles of both legs are shown live.
- **What was judged and how:** I cannot play video in real time. Everything here comes from stills, contact strips and per-frame measurements. The motion at full speed and in slow motion is the owner's to judge.

## 1. Gameplay untouched

The body is presentation only.

- With animation OFF, with TECHNICAL-CONTROL-1's body and with this body, 48/48 runs are bit-identical: the ball every tick, the player's path and every contact (16 review cases × 99 / 80 / 50). Evidence: `evidence/tc11_neutral.json`.
- The sweep's own fingerprints agree: 48/48 pairs.
- Protected and frozen files: 959/959 identical. This covers TECHNICAL-CONTROL-1's protected list and TECHNICAL-CONTROL-1 itself at 5180c8d0. Evidence: `evidence/frozen_check.txt`.

## 2. What was wrong (TECHNICAL-CONTROL-1's body, measured on the posed skeleton)

TC1 put each foot where the contact needed it, within a few cm. But it keyed the foot's **orientation in the world** and let the ankle absorb whatever the shin's IK left. Over the 16 review cases at 99:

- **Folded ankle:** dorsiflexion reached ~90° through every swing's heel recovery, because the foot stayed level while the shin swung back.
- **Twisted foot:** the foot yawed up to 180° relative to the shin.
- **Locked knee:** the knee was locked straight (< 4°) in up to 10% of frames.
- **Hip:** rotation reached −65…+94°.
- **Ankle speed:** p99 angular velocity was 4 300°/s (median run), worst frame 21 000°/s. RUN-1, the approved running gait, has p99 1 140 – 1 340°/s.
- **Beyond range:** joint-frames past a hard range of motion were 95% (summed over joints, median run).
- **Boot inside the ball:** 3 900 swinging-foot frames and 700 planted-foot frames, up to 15 cm deep.
- **Contact gap:** at the contact itself the boot was up to 9 cm inside the ball.

## 3. The leg as a chain, in the owner's order

Code: `tc11_leg.js` and `tc11_body.js` (`LegBody extends TechBody`).

1. **Pelvis.** At a contact it turns toward the touching leg: by a default amount per surface, and by up to 24° when the leg is pressed. This is the first step of the contact search. The trunk counter-rotates, and the turn follows one smooth curve through a cluster of contacts. The pelvis also lowers into the touch and moves toward a leg that is out of reach.
2. **Hip.** The swivel turns the whole leg toward the foot's orientation, so the knee follows the foot. Of the foot's yaw relative to the pelvis, the hip takes 80%, the tibia 14% and the forefoot 6%. Each saturates softly inside its range.
3. **Knee.** Two-bone IK with a soft extension limit at 7°, so the leg never locks straight.
4. **Tibia and ankle.** They take only the remainder: tibial axial rotation (growing with knee flexion), talocrural pitch, subtalar roll and forefoot abduction. Each stays inside its range: a soft saturation, never a kink, never past the bound. The ranges are listed in §5 of the review page. The hard box contains RUN-1.
5. **Contact surface.** The pose is searched for every contact over the foot's yaw (around the impulse), pitch and roll, and the pelvis turn. The boot is placed so that the labelled face of DRIBBLE-1's boot collider (its inner hull) is the face that meets the ball, at gap 0. The search scores four things:
   - the surface's working direction, within a cone of the impulse;
   - the leg inside its comfort ranges;
   - reach;
   - the rotation into the contact and back to the landing, affordable in the time the swing gives.

   It runs twice: first on an estimate, then on the real pelvis. A contact keeps its pose across the episode's re-plans; the pose moves with the ball and is never re-searched into a neighbouring candidate.

**Orientation is planned in joint space**, as a C¹ monotone cubic through keys:

- A swing follows RUN-1's own swing channels (hip swivel, ankle, toe).
- It winds up into the contact's orientation as early as the swing allows, and holds the surface through the ball.
- It follows through and settles for the landing.
- Only the contact (≈ 20 ms) and the landing (40 ms) lock the foot in the world. The toe-off is continuous with the stance's own joint values and rates.

**The support leg:**

- **Placement.** It is planted clear of the ball for its whole stance. When the run's own spot is taken by the ball, it moves up to 28 cm to its own side, back or diagonally (the support-foot adjustment).
- **Stance.** The foot stays flat with the knee over it.
- **Heel.** It rises about the ball of the foot on one smooth schedule over the stance's second half. It also rises as soon as the ankle would dorsiflex past 20°, and in the push-off once the leg nears its length.
- **Turning and rolling.** What the ankle still cannot take turns the foot on the ball of the foot and rolls it onto its edge.
- **Early lift.** A foot the body has left behind leaves the turf a little before the gait's lift. This happens when even a 55° heel lift cannot hold it, or when more than 12° would be left as an error. It is presentation only: the touching foot's contacts are untouched.

**Swinging feet** go round or over the ball, never through it. This is a per-frame push on the real ball: 1.2 cm margin, 0 for the touching foot at its contact.

**Late decisions.** The episode re-plans at every contact. When the contact just executed differs from what the plan had prepared (the simulation decided an action or a redirect at the contact itself), the leg is not snapped to the new pose. The contact is flagged as visually infeasible as scheduled.

## 4. Results

16 review cases × 99 / 80 / 50, both bodies on the same simulations. Evidence: `evidence/tc11_summary.txt` / `.json` and `evidence/tc11_sweep.jsonl`.

| | TC1 body · 99 | TC1.1 body · 99 | TC1.1 · 80 | TC1.1 · 50 | RUN-1 (5.5 · 8 m/s) |
|---|---|---|---|---|---|
| ankle angular velocity p99 (median run) °/s | 4 277 | **853** | 834 | 922 | 1 139 · 1 340 |
| … worst frame °/s | 20 970 | **1 606** | 1 698 | 1 908 | 1 237 · 1 463 |
| ankle angular acceleration p99 (median) °/s² | 596 000 | **82 000** | 68 000 | 66 000 | 75 000 · 110 000 |
| foot yaw relative to the shin, worst ° | 180 | **25** | 29 | 25 | 10 · 6 |
| ankle dorsiflexion, worst ° | 90 | **28** | 28 | 27 | 31 |
| knee, minimum ° | 0.2 | **7.5** | 7.1 | 7.1 | 16 · 20 |
| joint-frames beyond a hard range, % (median run) | 95 | **0** | 0 | 0 | — |
| boot inside the ball, frames (all runs) | 4 617 | **33** | 29 | 21 | — |
| boot – ball gap at the contact, worst | 9 cm | **0.2 cm** | 0.1 | 0.1 | — |
| labelled surface = the boot face meeting the ball (prepared contacts) | — | **136/136** | 133/133 | 112/112 | — |
| ankle's own rotation in the 50 ms before a contact, worst ° | 111 | **21** | 21 | 20 | — |
| … in the 50 ms after, worst ° | 120 | **29** | 35 | 39 | — |
| ankle ω within ±100 ms of a contact, worst °/s | 20 970 | **1 606** | 1 698 | 1 908 | — |
| planted-foot slip at its support point, worst mm | 2 | 9 | 16 | 16 | — |

## 5. Contacts flagged as visually infeasible as scheduled

There are 36 of 410. They are listed in the review page §4 and in `evidence/tc11_summary.json` (`flags`).

- **Most are late decisions:** the first touch after an intent change. The simulation decides that touch at the contact itself, and its preview stays the planned carry until then (checked by polling the episode's preview every 12 ticks before the contact). No body can prepare it without changing gameplay.
- **The rest:** a touching leg at ≥ 98.5% of its length, and Cruyff-like contacts behind the standing leg whose surface sits at the edge of its cone.

## 6. Limitations

- **Slip in slow reversals.** The planted foot of a 180° reversal at 80 / 50 slips up to 16 mm. TC1 had 0 because it locked the knee and folded the ankle instead.
- **Fast foot yaw at drag-backs.** At sole drag-backs the foot's world yaw changes 60 – 80° in the 50 ms after the contact (the ankle's own change is ≈ 12°). The contact pose does not yet anticipate the body's turn toward the landing.
- **Comfort box.** The comfort box is exceeded in 42 – 54% of joint-frames (median, summed over joints). This is mostly eversion and forefoot abduction in RUN-1's own swing channels, which sit outside the footballer's comfort box I chose. No frame passes the hard box in the median run.
- **CPU** (idle machine; evidence: `evidence/tc11_cpu.json`):
  - the simulation alone: 12.3 ms per simulated second;
  - with TECHNICAL-CONTROL-1's body: 20.4;
  - with this body: 29.2 (median), 48.4 (worst run);
  - the worst single 240 Hz step: 11.3 ms, when a re-plan runs the contact searches. For a game the pose would be evaluated per rendered frame, not at 240 Hz.
- **Contact-surface error.** It is 7 – 9° median and at most 36 – 38°, within each surface's cone, except the flagged contacts.

## 7. For the owner

1. **The visual bar** at full speed and in slow motion. Start with the 99 clips and strips per priority case, then 80 and 50.
2. **The ranges of motion** (review page §5), and the hip / tibia / forefoot shares of a foot's yaw (80 / 14 / 6%).
3. **Whether early lifts are acceptable.** A support foot leaves the turf before the gait's lift when the body has left it behind; this is presentation only.
4. **The late-decision contacts.** Accept them as flagged, or let the simulation decide a redirect one re-plan earlier. That second option is a gameplay change.

**Next:** the carry-model correction, TECHNICAL-CONTROL-1.2, plays with these legs (see `review_artifacts/technical_control12`).
