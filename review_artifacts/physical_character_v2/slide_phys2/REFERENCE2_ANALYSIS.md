# REFERENCE 2: slide tackle ground entry, measured analysis

Source: `../REFERENCE_2026-10-14_03.49.19.mov` (third-party broadcast screen recording, 826×804, 60 fps container, 10.33 s).
This is outside git. Do not copy frames or sheets into any repository.
Analysed 2026-10-14. Work files: `scratchpad/sp2/ref/` (tools/, all/ frames, sheets/).

Evidence labels: **OBSERVED** (seen in frames), **MEASURED** (number taken from pixels or tracks), **DERIVED** (computed from measured values plus the geometry or time model), **INFERRED** (reasoned from indirect evidence), **ASSUMED** (taken as given, not checked).
Frames are referenced as `fNNN` (0-based decode index); `video t = NNN/60`.
Left/right (L/R) is always from the slider's own point of view.

---
## 0. Two facts that change how this clip must be read

**0.1 Time base. The clip is slow motion: about 0.4× real time.**
- MEASURED: only every 5th frame is new (f8, f13, …, f618; `n%5==3`). That gives 12 images per video-second; the other 4 of every 5 frames are exact duplicates (mean abs diff < 0.1). For example, f280 ("4.667 s" in the brief) is a duplicate of f278. Effective sampling is 83 ms of video time.
- MEASURED: content advances unevenly. Camera-pan steps and frame differences repeat a 2,2,1 pattern; the short step is at `n%15==3`, and the pattern holds for the whole clip. That is 20 content units per video-second. This is the signature of a 50p broadcast decimated to 30p and played at 12 Hz, i.e. **0.4× playback** (INFERRED).
- DERIVED, physiological check at k = 0.4: the slider's sprint gives step length 2.10 and 2.17 m (MEASURED), ground contact about 0.10 s, step time about 0.23 s (about 4.3 Hz), and speed about 9 m/s. These are elite-sprint values. At k = 0.5 the same footage gives 7.2 m/s with 2.15 m steps at 3.4 Hz, which is physiologically odd. At k ≥ 0.8 the gait is impossible and the slide friction would be μ ≈ 0.1.
- Result: **real Δt = 0.4 × video Δt** (INFERRED, k = 0.40, plausible 0.40–0.45; k = 0.5 sensitivity is given where it matters).
- All "real" times below use `t_real = 0.4·(T − 4.65)`. T is the content time: `T = n/60 + {0, 1/60, 2/60}` for `n%15 = 3, 8, 13`. t = 0 is the first non-sole turf contact (f278).

**0.2 Scale. The camera is low (about 16° down), not "players ≈70 px".**
- MEASURED: players are about 105–122 px tall. The referee (assumed 1.8 m) is about 118 px.
- DERIVED: I fitted a pinhole camera to the centre circle (r = 9.15 m) and the halfway line, using a grass-feature stabilised mosaic referenced to f288. Fit RMS is 0.044 m. Result: f ≈ 3200 px, tilt 16.3°, camera about 46 m from the centre spot and 13.6 m high, on the halfway line.
- Local scale at the tackle: **69 px/m lateral (±3 %)**, **21 px/m in depth (±6 %)**, **66 px/m vertical**. A 1.8 m pole projects to 122 px, which matches the referee.
- Stabilisation residual: the halfway line stays at ref-x 717–721 px over f183–f618 (±2 px).
- Consequence: lateral motion is resolved well. Depth and height are coupled (1 px = 5 cm of depth or 1.5 cm of height), so any height or depth claim below carries that ambiguity.
- Pitch axes: X runs along the touchline (+ = direction of play, image right), Y is depth (+ = away from camera), and 0 is the centre spot.

## 1. Contact sequence with the turf (slider)
Annotation was done **manually** on 4–6× grid crops of every unique frame, with ±2–4 px error and more under blur. MediaPipe heavy was tried on 4× crops of f228–f333: it produced skeletons on 20 of 22 frames, but by eye only about 1 of those (f253) was plausible, so it was discarded.

| # | Body part | First frame (video t) | t_real (k = 0.4) | Label / confidence |
|---|---|---|---|---|
| 0 | R boot sole (last running plant, "C2") | between f258 and f263 (4.30–4.38) | −0.14…−0.10 s | MEASURED, high. Foot is static at X = −5.09 m over f263–f273 |
| 1 | R instep/dorsum + lower R shin (foot still at plant spot, toe now pointing back) | **f278 (4.633)** | 0 | OBSERVED, medium. Knee about 0.1–0.15 m above turf |
| 2 | R knee (shin flat on turf, pointing back) | **f283 (4.717)** | +0.04 s | OBSERVED, medium |
| 3 | L (tackling) boot heel/sole at turf level | f283 onward (4.72) | ≥ +0.04 s | INFERRED, low–medium. Within about 0.1 m of turf; true contact cannot be separated from skimming |
| 4 | R lateral knee/thigh rolling onto turf | f293–f303 (4.88–5.05) | +0.10…+0.16 s | OBSERVED, low–medium |
| 5 | R hip/buttock | f308–f313 (5.13–5.22) | +0.20…+0.24 s | INFERRED, medium. Pelvis drop completes |
| 6 | R hand (then forearm/arm) | f313–f318 (5.22–5.30) | +0.24…+0.26 s | MEASURED, medium |
| 7 | Trunk (R side/back). Fully lying on the R side | f323 (5.38) | +0.30 s | OBSERVED, medium |
| – | L hand, head | no turf contact seen | – | OBSERVED |

Answers to the specific questions:
- **Does the tackling boot or heel touch the turf before the trailing knee, shin or thigh? No.**
  - The trailing leg is the planted leg (f263–f273), and its instep and shin reach the turf at f278 while the L leg is still in fast swing. Its knee reaches the turf at f283.
  - At f273–f278 the L leg is in fast swing (motion-blurred, travelling faster than the body; OBSERVED), so it cannot be planted.
  - The earliest possible L-boot contact is simultaneous with the R knee (f283, within one frame = 40 ms real).
  - The L boot never plants: its ground projection moves at or above body speed in every frame from f283 to f308 (MEASURED).
- **Is the front boot clear of the turf during the glide? Not clearly. It stays low, at or within about 0.1 m of the turf ("skimming"), and bears little or no load.**
  - Its heel/sole line sits at a constant image height (y = 469 ± 2 px) from f283 to f318 (MEASURED).
  - Where it meets the ball at f308, its depth matches the ball's (ball centre at 0.11 m, on the turf), which puts the boot at ≤ 0.05 m (DERIVED).
  - Contact versus a 1–5 cm gap is not resolvable.
- **Which leg is which?** INFERRED, medium confidence: **trailing/folded leg = RIGHT, tackling leg = LEFT; he slides onto his RIGHT side.** The reasoning:
  1. The approach is lateral, left to right, heading about 16° toward the camera (C1 → C2, MEASURED), so the camera sees the slider's right side and front (shirt-front logo visible at f258–f303).
  2. While lying (f323–f418), his head points image-left and his shirt front faces the camera. For a body with its head to the image-left, a front facing the camera means he is lying on his right side.
  3. The arm that posts and ends up overhead along the turf is the near/bottom arm, i.e. the right arm.
  4. The planted foot C2 is the one that folds, so the plant was also the right foot. The step before (C1) was the left foot.
  - Caveat: the shirt-mark reading (front logo versus back number) is the weakest link. If it were wrong, every L/R label would swap. The contact *order* would not change.

## 2. Ground-plane kinematics (slider)
Tracks used:
- trunk = red-shirt centroid
- pelvis proxy = white-shorts centroid
- turf contacts = manual points

All are mapped to the pitch at an ASSUMED height; X is insensitive to height. Speeds below are video m/s → real at k = 0.4 [k = 0.5].

- **Approach before the commit** (f198–f258, MEASURED/DERIVED):
  - vX = 3.54–3.62 video m/s (trunk and pelvis agree within 3 %); |v| ≈ 3.6–3.7 including the depth component.
  - **≈ 9.0 ± 0.5 m/s real** [7.2]. The rms residual of a straight-line fit is 0.06 m.
- **Steps** (MEASURED):
  - Footfalls C0 X = −9.20, C1 −7.17, C2 −5.09 m, giving steps of **2.10 and 2.17 m (±0.15)**.
  - C1 is stationary over f233–f248, i.e. 0.25 video-s = **≈ 0.10 s contact**.
  - The last step is not shortened, and there is no hop or flight anomaly before the drop.
- **Commit to first contact** (DERIVED):
  - R-foot plant (T 4.30–4.40) to the instep/shin on the turf (T 4.65) is **0.10–0.14 s real**.
  - To the knee on the turf (T 4.75) is **0.14–0.18 s**.
  - The plant foot does not leave the turf: it pivots and then drags (X = −5.09 → −5.05 at f278 → −4.85 at f283 → −4.26 at f293).
- **Speed at first turf contact:** **≈ 8.5–9.5 m/s real**. There is no measurable loss through the plant/drop (lateral 3.35–3.9 video m/s, f258–f288).
- **Speed profile** (lateral X, 0.25 video-s windows, mean of trunk and pelvis; see `speed_profile.png`):

| Video T | Phase | Speed (m/s real, k = 0.4) |
|---|---|---|
| 4.05–4.40 | sprint | 9.0–9.8 |
| 4.40–4.75 | plant/drop | 8.4–9.1 |
| 4.75–5.25 | knee-glide to ball | 9.0–9.8, i.e. **no resolvable deceleration** (fit −1.5 ± 2 m/s² real) |
| 5.25–5.55 | ball + dribbler contact, roll onto side | 8.0–9.0 |
| 5.6–5.9 | dribbler lands on/behind him | 7.1–7.4 |
| 6.0–6.9 | lying slide | 5.0–5.7 |
| 7.0–7.3 | lying slide | 4.2–4.6 |
| 7.4–7.8 | get-up starts | 3.4–3.8 |

  The depth component adds 5–10 % (the path veers 15–20° toward the camera after the drop).
- **Deceleration** (DERIVED):
  - Lying phase (f328/f338–f448), quadratic fit on X: **−2.5 … −3.3 m/s² real** (μ_eff ≈ 0.26–0.34) [k = 0.5: −1.6 … −2.1].
  - Mean from first contact to get-up onset: about **4.6 m/s²** (9.0 → 3.7 m/s in 1.14 s), including the step loss at the collision.
- **Slide distance and duration** (MEASURED/DERIVED):
  - From the first non-sole contact (f278) to the get-up onset (f448), the pelvis and trunk travel **7.5 ± 0.6 m** (path 7.4–8.0 m). This crosses the halfway line; it is directly visible in `sheet3_slide_pitch_stabilised.png`.
  - Duration: **2.85 video-s = 1.14 s real** [1.43].
  - **He never comes to rest.** When he starts to push up (f448–f458, about 7.5–7.6 s) he is still moving at about 1.4–1.6 video m/s (3.5–4 m/s real). He is on his feet and moving on by about f493–f498 (8.2–8.3 s, +1.45 s real) (OBSERVED).
- **Hip height** (MEASURED trend, INFERRED magnitudes, ±0.08 m):
  - The shorts-centroid height above the local turf reference is 0.67 m (f263) → 0.57 (f273) → 0.46 (f278) → 0.37 (f283–f288) → 0.30 (f293–f298), then buttock on the turf by about f308–f313.
  - **Monotonic descent with no hop.** Image y increases every frame from f263 to f298. Before f263 there is only the normal ±3 px running bounce.

## 3. Tackling (LEFT) leg
- Knee flexion, 2D, side-on view, MEASURED with ±15° uncertainty:

| Frame | Flexion | Pose |
|---|---|---|
| f283 | 99° | kneeling-lunge pose; knee about 0.4 m up, shank near vertical |
| f288 | 95° | |
| f293 | 46° | |
| f298 | 31° | |
| f303 | 28° | |
| f308 | about 6° | at ball contact |

- **Extension happens mainly between f288 and f298** (95° → 30°, T 4.80–5.00 = **0.08 s real**) and is complete by f308 (+0.20 s; 0.14 s in total).
- Ball: the L boot (instep/sole side, dark sock visible) reaches the ball at **f308 (5.133)** (OBSERVED). The ball's speed rises from about 2.0 to 2.8–2.9 video m/s (5.1 → 7.1 m/s real) over f308–f323 (MEASURED). **The ball is played first.**
- Dribbler's foot: see §5. His next step lands on the slider's **L lower shin/ankle at f313** (+0.24 s), one frame (40 ms real) after the ball contact.
- Ball contact at the earlier time in the brief (≈ 4.95–5.0 s): at f298 the L boot overlaps the dribbler's planted foot in 2D only. In depth it passes about 1.1 m nearer the camera (DERIVED: planted foot Y = −2.7 m versus boot −3.8 m, with the boot at or below turf height). **There was no contact at 4.97.**
- Height: at or near turf level throughout (see §1).

## 4. Trunk and arms
- Trunk back-lean in the image plane (shoulder–hip vector, MEASURED ±8°):

| Frames | Back-lean |
|---|---|
| f273 | 8° |
| f278–f288 | 13–18° |
| f293–f313 | about 30° |
| f318 | 37° |
| from f323 | lying |

  Some of the lean is hidden because his front is turning toward the camera.
- **Roll toward the bent-leg (R) side:** begins at f293–f303 as the R thigh rolls out and is complete (lying on the R side) by f323 (+0.30 s) (OBSERVED).
- **Arms:**
  - During the glide both arms are free and balancing, with the R arm low.
  - **R hand posts on the turf at f313–f318** (+0.24 s), beside or behind the hip.
  - It then stays nearly fixed: it moves about 0.5 m while the body moves about 1.5 m (f313–f338, MEASURED). The body slides past it, so the arm ends extended overhead along the turf (a braking or bracing contact).
  - The L arm stays up/over the body. No L-hand contact was seen.

## 5. Receiver (dribbler) response
- **Approach** (MEASURED): trunk |v| ≈ 3.0 video m/s (**≈ 7.5 m/s real**). He cuts about 40–50° toward the camera, toward the ball he pushed ahead.
- **Footfalls** (MEASURED):
  - Fa: X −4.03 m, f263–f278.
  - Fb: X −2.70, planted f293–f298, pushes off about f303–f308.
  - The next stepping foot Fc (the same foot as Fa) lands at **f313 (5.217)** at X −1.95. Its depth and height put it **on top of the slider's L shin/ankle**: it lands about 0.1 m up, at the depth of the slider's leg (DERIVED).
  - Fb is already airborne at that moment, so Fc never gets stable support.
  - **L/R of the dribbler's feet: not determinable** at this resolution.
- **Loss of support** (MEASURED):
  - Fc is carried forward and up with the slider's sweeping leg and the ball: X −1.95 → −1.72 → −1.21 m over f313–f323, i.e. 4.6–5.1 video m/s (about 11–13 m/s real), about twice his trunk speed.
  - **No extra step and no hop.**
- **Pelvis and trunk** (MEASURED/OBSERVED):
  - The trunk centroid keeps going forward at about **5.6 m/s real laterally** through the fall.
  - It descends about 35 px over f313–f343. That is an underestimate, because he is partly occluded from f323.
  - **His body rotates backward** about the swept feet: his head moves back (image-left) over his hips while his feet go forward and up over the slider's legs.
- **Fall direction:** his centre of mass continues in the sweep direction (+X), but he pitches backward. He lands **on the far side of the slider**, with his legs draped over the slider's legs, his head pointing back along his path, and his body roughly parallel to the slider's (OBSERVED).
  - Whether he ends up mostly supine or on his side is **unresolved** (shirt marks are ambiguous).
- **Timeline after contact at f313** (real, k = 0.4):

| Event | Frames | t_real after contact |
|---|---|---|
| Both feet off support | f318 | +0.02 s |
| Image-left arm reaches back/down toward turf; other arm up and out (protective "parachute" reach) | f323–f338 | — |
| Seated/landing behind the slider, then occluded | about f338–f348 | **+0.16…+0.22 s** |
| Head/back down to turf level | f358–f368 | **+0.30…+0.36 s** |
| Slides with the slider about 1.5 m; at rest | f468–f473 | about +1.0 s |

  Hand–turf touchdown itself is hidden behind the slider (INFERRED f343–f348).
- **Note:** the dark limb seen at the dribbler's shoulder at f303–f313 belongs to a second red player about 2.5 m farther from the camera (his feet are at image y ≈ 395 versus 446–463). It overlaps only in 2D and is **not** a contact.
- **Slider afterwards:** slides through and past the contact point, continues about 5 m further with the dribbler partly on him, then gets up in one movement and runs on (§2).

## 6. Files (all in this directory; sources and tools in the work dir)
- `sheet1_entry_raw60fps_dup_demo.png`: all 60 fps frames f268–f288 (NEW/dup marked), proving the 12 Hz content.
- `sheet2_entry_unique_frames_4x.png`: unique frames f243–f333, 4×, with video, T and real-time labels.
- `sheet3_slide_pitch_stabilised.png`: pitch-stabilised strip f263–f473 with the halfway line fixed at X = 0 and 1 m ticks.
- `sheet4_receiver_response.png`: f283–f403, the dribbler.
- `annotated_keyframes.png`: f263, f273, f278, f288, f298, f308, f313, f318 with manual key points and the dribbler's feet.
- `speed_profile.png`: lateral position (slider, dribbler, ball) and slider lateral speed versus real time.
- `REFERENCE2_tracks.json`: per-frame times, auto tracks (trunk, pelvis, ball, dribbler), manual points (image and pitch coordinates with assumed h), events, summary metrics, camera model.
- `REFERENCE2_manual_annotations.json`: the raw manual pixel annotations.

## 7. What this implies for a physical character
1. **Contact order:**
   - The slide is entered **from a running plant on the trailing leg**, not from a jump. The R foot plants (sole), then the shank pivots forward and down over it, so the instep/dorsum and lower shin reach the turf first (about 0.12 s after the plant). The knee follows about 40 ms later, then the lateral thigh and the R hip/buttock (about +0.2 s), then the R hand/forearm (+0.25 s), then the trunk side (+0.3 s).
   - The tackling foot is never the first contact and never plants.
   - Target for the sim: support transfers sole → instep + shin + knee → lateral thigh/hip, all on the same (R) side.
2. **Sliding surfaces:**
   - About 0–0.25 s: the R shin + knee + instep carry the load (knee-glide), with the trunk upright to 18° back.
   - About 0.2–0.3 s onward: the R lateral thigh and hip, then the whole R side.
   - The R hand acts as a semi-planted brace that the body slides past.
   - The plant foot drags rather than lifting off.
3. **Boot clearance:** the tackling (L) boot travels at turf level, ≤ about 0.1 m up, slightly ahead of and nearer the camera than the knee. It carries negligible load: it moves at or above body speed and never sticks. A model that requires it to be clearly airborne, or planted, would both be wrong. "Skims or hovers at 0–5 cm" is consistent.
4. **Speed and deceleration:**
   - Entry at about 9 m/s with **almost no speed loss during the first ≈ 0.25 s of knee-glide**.
   - A step loss of about 1.5–2 m/s around ball and receiver contact plus the roll onto the side.
   - Then about 2.5–3.3 m/s² (μ_eff ≈ 0.3) while lying.
   - Total about 7.5 m in about 1.1 s with no stop: the slider gets up while still moving at about 3.5–4 m/s. The pitch looks fast (likely wet), so treat μ ≈ 0.3 as a wet-turf value.
   - The pelvis descends monotonically from running height to the turf in about 0.3–0.35 s, with no hop. Most of the drop (about 0.3 m) happens in the first 0.14 s after the plant.
5. **Tackling-leg timing:** the L knee goes from about 95° to about 30° flexion in about 0.08 s, is nearly straight at the ball at +0.20 s, and travels close to the turf the whole time.
6. **Receiver timeline:**
   - He steps onto the extended shin 40 ms after the ball is played. That foot is swept forward and up at about 2× trunk speed, and the other foot is already airborne, so he never gets another step.
   - His centre of mass keeps going forward (about 5.6 m/s) while his body pitches backward, with protective arm reaches behind him.
   - He is seated or landing about 0.2 s after contact, and head/back on the turf by about 0.3–0.36 s.
   - He lands on the far side of the slider with his legs over the slider's legs, then the two slide together about 1.5 m before he stops.

## 8. Limitations
- **Resolution and blur:** about 12 effective images per video-second. Every event time carries ±1 unique frame (±0.04 s real, or ±0.02 s on the short steps). Limbs are 3–8 px wide and blurred.
- **Depth and height ambiguity:** heights rest on assumed depths. Lateral (X) quantities are the reliable ones.
- **k = 0.4 is inferred, not given.** If the playback factor were 0.5, multiply real durations by 1.25, speeds by 0.8 and accelerations by 0.64.
- **Pitch assumptions:** pitch-line geometry is ASSUMED to be standard (circle r = 9.15 m), and the camera is ASSUMED to be a rotating pinhole with no lens distortion. Principal-point and focal variants change the local scale by < 3 %.
- **L/R labels:** these rest on the front/back reading of shirt marks (see §1). If that reading is wrong, all L/R labels swap; contact order and timings do not change.
