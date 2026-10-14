# SLIDE-PHYS-1 — what the 13 Oct reference recording shows

**Source:** `Screen Recording 2026-10-13 at 7.40.42 PM.mov` (15.12 s, 60 fps, 830 × 1104, H.264). It is kept outside Git as third-party footage: `_preserved_2026-10-13_evidence_outside_git/slide_phys1/reference/` (sha256 `b8aa9a08…7c467c27`).

**Analysis material**, also outside Git:
- every frame;
- contact sheets at 4 / 15 / 30 / 60 fps;
- zoomed crops;
- MediaPipe pose keypoints (heavy model, 4× upscaled crops);
- grass-feature camera stabilisation (LK optical flow, RANSAC homography).

The tools are committed in `slide_phys1/reference_tools/`.

**Labels:**
- **OBSERVED:** visible in the frames.
- **INFERRED:** derived from measurements of the frames, with stated uncertainty.
- **CHOICE:** an authoring or model decision for Touchline.

## 1. What the recording is (OBSERVED)

The recording is a vertical edit of an EA FC "How to use this playstyle correctly…" tutorial. The broadcast-style camera is high, at a depression of ≈ 45° (INFERRED from player heights against the ball). There are on-screen button prompts. It contains five segments.

| segment | time (s) | label on screen | who tackles | what happens |
|---|---|---|---|---|
| 1 | 0.00 – 3.30 | Slide Tackle | white #? (defender) on the navy dribbler | Jockeys beside him, then drops into a sweeping slide through his feet at ≈ 1.75 s. A replay angle from 1.87 s shows the slide, the dribbler swept and falling forward onto his hands, and the slider rolling forward onto his hands and getting up (standing by ≈ 2.6 s) |
| 2 | 3.37 – 6.63 | tackle with R1 held | white defender on the grey #7 | At 3.70 – 4.30 s: lead-leg slide with the trailing leg folded under, sliding on the trailing hip and thigh with the trailing hand posting. At 5.1 s the grey player falls over a second white player on the ground |
| 3 | 6.65 – 8.83 | Slide Intercept | white #6 | Runs, throws himself sideways (nearly horizontal ≈ 0.1 s after the commit) and blocks a pass with his legs. The replay shows turf scuff marks along the slide path |
| 4 | 8.83 – 12.28 | Slide Block | blue defender | Sideways block slide in front of a shot, legs raised; replay |
| 5 | 12.28 – 15.12 | Slide Tackle | — | Segment 1 again (the clip loops) |

**Playback (INFERRED):**
- There are no regularly duplicated frames, so the source is 60 fps; there are occasional recorder hiccups.
- Runner self-similarity gives step periods of ≈ 0.28 s (≈ 3.5 steps/s), a plausible real-time running cadence. The desaturated segments are therefore replays at real speed, not slow motion.
- Uncertainty: moderate. The "1.00" speed overlay appears only on the looped segment.

## 2. The two slide **tackles** (segments 1 and 2), frame by frame

### Segment 2 (the clearest; times from the recording)

| t (s) | frame | OBSERVED (white slider) |
|---|---|---|
| 3.63 | 219 | Jogging toward the ball carrier. Upright; arms at the sides |
| 3.70 | 223 | **Commit.** The lead arm (on the lead-leg side) swings out and forward. The body begins to lower; the knees flex |
| 3.73 – 3.77 | 225 – 227 | The lead leg lifts and reaches forward toward the ball, knee bent, then extending. The support (fold) leg flexes deeply. The trunk stays upright |
| 3.80 | 229 | The lead leg is extended forward and low. The fold knee is near the turf. The trailing arm reaches down and back |
| 3.83 – 3.90 | 231 – 235 | **Ground entry:** the fold leg's shin and knee are on the turf (lateral), then the trailing-side hip and thigh. The lead leg lies along the turf toward the ball |
| 3.93 – 4.10 | 237 – 247 | **Slide** on the trailing hip and thigh. Trunk inclined back (≈ 30 – 45° INFERRED). Trailing hand posting on the turf behind the hip; lead arm raised forward-up |
| 4.13 – 4.33 | 249 – 261 | Slide decelerates. The body rotates and the trunk comes up toward the knees (get-up begins) |

**Kinematics** (INFERRED from stabilised keypoints; ball scale ≈ 88 px/m, ±30 %):
- **Approach:** low, ≈ 1–2.5 m/s relative to the grass.
- **Hip at the commit:** the screen-lateral hip speed **rises** from ≈ 0.7–1.5 m/s to ≈ 3–4 m/s (frames 236 – 241) while the hip descends.
- **No spring:** the hip height falls monotonically from the commit. No upward hop is visible.
- **Timing:** commit → hip on the turf ≈ 0.17 – 0.20 s; slide ≈ 0.35 – 0.4 s; slide distance short (≈ 0.4 – 0.8 m).

### Segment 1

| t (s) | frame | OBSERVED (white slider) |
|---|---|---|
| 1.47 – 1.70 | 88 – 102 | Defensive jockey beside the dribbler: wide stance, arms out |
| 1.72 – 1.85 | 104 – 112 | Drops: the support knee bends and the legs go out under the dribbler's legs (the camera is behind them) |
| 1.87 – 2.03 | 113 – 123 (replay) | Slides on his side with **both legs extended forward** through the dribbler's feet. Trunk leaning back and rotated; one arm raised, the other reaching to the turf |
| 2.03 – 2.33 | 123 – 141 | The trunk rotates toward the turf. He rolls forward onto both hands, knees tucking |
| 2.33 – 2.60 | 141 – 157 | Pushes up and is standing again |

**Tackled player (navy), the reference response:**
- Support swept: feet out from under him at ≈ 1.85 – 1.95 s.
- Pitches forward onto his hands and knees (2.0 – 2.3 s) and rolls.
- This is the "sliced-out" response SUPPORT-1 described.

## 3. The intercept and block slides (segments 3 and 4) (OBSERVED)

- **Segment 3:** from a run (≈ 5 m/s INFERRED) the player turns his body and throws both arms out wide. The body goes nearly horizontal sideways within ≈ 0.1 s, the legs swing up toward the pass, and he lands on his side and back.
- This is the **"knife"** look. It belongs to the **intercept / block** actions, where the goal is to put the body across a lane, not to the slide **tackle**.

## 4. Answers to the brief's questions about the reference

| question | answer | label |
|---|---|---|
| Commitment timing | In the tackles, the commit is a single support-leg plant / fold. Commit → hip on the turf is ≈ 0.17 – 0.25 s. In segment 1 it starts from a jockey, not a sprint | OBSERVED (timing INFERRED ±1 frame) |
| Whole-body horizontal acceleration | The hip accelerates toward the slide direction as the body lowers (segment 2: lateral ≈ 1 → 3–4 m/s). The COM's acceleration is smaller than the hip's: part of the hip lurch is the trunk / pelvis reorganising | INFERRED |
| Tackling-side hip / thigh drive | The lead thigh lifts forward before the knee extends (≈ 30 – 70 ms later). The extension then carries the foot forward and low | OBSERVED (timing INFERRED) |
| Knee extension timing | Delayed: after the thigh is forward, finishing as the body reaches the turf | OBSERVED |
| Opposite / trailing leg | Folds under the body (deep knee flexion); its shin and knee reach the turf first | OBSERVED |
| Pelvis translation | Low and forward; no rise | OBSERVED |
| Pelvis rotation | Rolls toward the fold side (lateral hip down) and yaws toward the lead leg | OBSERVED |
| Trunk counter-motion | Stays upright through the drop, then leans **back** in the slide | OBSERVED |
| Arms | Lead arm out / forward-up (counterweight). Trailing arm reaches back to the turf and posts | OBSERVED |
| COM trajectory | Descends monotonically, forward and slightly sideways | INFERRED |
| Vertical COM velocity | No upward phase in the tackles. Descent ≈ 0.6 – 0.7 m in ≈ 0.2 s (game animation: a fast, partly supported drop) | INFERRED |
| Horizontal COM velocity | Kept through the entry, then decays in the short slide | INFERRED |
| Angular momentum | Not measurable from 2-D footage. The visible reorientation (trunk upright → back, legs forward) implies backward (feet-first) whole-body rotation. In a game animation that need not be physically generated | INFERRED / not measured |
| First turf contact | The fold-leg shin / knee (lateral), then the hip / thigh. The lead heel touches or skims the turf ahead | OBSERVED |
| Orientation at ground entry | Trunk upright, pelvis rolled toward the fold side, lead leg forward | OBSERVED |
| How horizontal momentum survives entry | The body lands on sliding surfaces (lateral shin, thigh, hip) with its legs ahead, so it keeps going instead of pivoting over a planted foot | INFERRED |
| Continuation | A short slide, then a roll / get-up (segment 1: forward onto the hands). It does not lie still | OBSERVED |

### Is the "spring / knife into it, then travel horizontally" impression supported?

**Partly.**
- **Travel horizontally: supported.** The hip accelerates horizontally into the slide while it descends, and the body arrives on sliding surfaces rather than dropping onto a planted point. This is the important property, and it is OBSERVED / INFERRED in segments 1 – 2.
- **Spring: not supported for the slide tackles.** There is no upward hop: the commit is a plant-and-fold, and the hip descends monotonically.
- **Knife: present, but in the intercept / block slides (segment 3).** There the body is thrown sideways and becomes nearly horizontal within ≈ 0.1 s. It is not the tackle shape.
- **Our tackle:** it should keep the low, horizontal, feet-first travel, without inventing a hop.

## 5. What is game animation rather than physics (INFERRED)

- The drops are fast and partly unsupported, in a way a real body could only do with free fall plus impact.
- The trunk recline appears without visible ground leverage, i.e. authored root rotation.
- The slides are short (0.4 – 0.8 m) and slow, tuned for close-range gameplay.
- The get-ups are immediate.
- Touchline's V2 body must obtain its feet-first rotation from ground contact (measured in SLIDE-PHYS-1: a running plant can supply only ≈ 5 – 15 N·m·s backward). A reclined slide is therefore reached by **pressing the leading leg into the turf ahead of the COM** and **sitting back** once seated, not by rotating in the air.

## 6. Authoring choices taken from this (CHOICE)

- **Technique:** a bent-leg (sliding-in) slide tackle:
  - commit on a single support-leg plant;
  - lead (tackling) thigh drive before a delayed knee extension;
  - fold leg tucked under, landing on its lateral shin / knee then hip / thigh;
  - lead heel ahead on the turf;
  - trunk upright then sitting back;
  - lead arm forward-up, trailing arm reaching back.
- **Speed:** 5 m/s nominal (literature: 4.5 – 5.0 m/s lab approach), tested at 4.5 – 5.5. The reference's own approach is slower (close-range game tackle).
- **No hop and no mid-air recline:** the body reaches the slide posture through ground contact.
- **Not copied:** the reference proportions and the stylised drop speed. The game's instant get-up is not part of Stage 1. The follow-through ends seated / settling.
