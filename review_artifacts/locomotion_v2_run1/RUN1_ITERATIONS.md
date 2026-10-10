# RUN-1 iteration log

Each row: the iteration, the largest visible (or measured) problem, the one change made, and the result.

| # | problem | change | result |
|---|---|---|---|
| 0 | First cycle: the plant / pelvis-height Newton solve diverged. At tc 0.175 s the stance leg over-reaches, the knee pins at 0° and the Jacobian is zero. The knee is locked straight through late stance. | Replaced it with a nested bisection: pelvis height ↔ toe-off, plant distance ↔ touchdown knee. Both relations are monotone. | The solve converges. A scan showed tc 0.175 s infeasible for a 0.834 m leg at 5.5 m/s (contact length 0.96 m) unless the pelvis sinks. Chose tc 0.160 s (contact length 0.88 m). |
| 1 | The stance knee was still **extending** at toe-off. The swing Hermite continued that extension, so the knee dipped to 4° and the swing foot scraped 7 cm *through* the turf. Separately, the Hermite slope limiter clipped the fixed boundary slopes, which broke C1 at touchdown (knee slope 147 vs 1115 °/cycle). | (a) Late stance is now **knee-driven**. From the heel-rise onset, a prescribed knee curve continues C1 from the flat-foot IK knee, reaches its extension minimum at 86 % of stance, and is already flexing at toe-off (320 °/s). The heel rise about the MTP joint is solved from it (bisection), and the toe stays on the turf. (b) The limiter never touches a fixed (boundary) slope. | Every channel is C0 + C1 at both joins (value Δ < 0.003°, slopes equal). Minimum swing boot height is +3.1 cm. Flat-foot plant slip is 0.000 mm. The stance knee runs 20° → 48° (35 % stance) → 18° → 23° at toe-off. |
| 2 | Early stance: the hip *flexes* for about 0.03 s after touchdown, because the rapid knee collapse under the spring-mass pelvis drags the thigh forward. The touchdown knee rate is about 1160 °/s. | Applied the research numbers instead of guessing: touchdown knee 22–24° (Sundström 2021; Miyashiro 2019), a softer pelvis (spring-mass × 0.6), a rear-foot roll at touchdown. | The touchdown knee rate fell to about 990 °/s. The hip still flexes about 1° after touchdown; that is invisible, and I accepted it as spring-mass leg compression. |
| 3 | First render (side view): it reads as a run, but each mid-stance looks crouched and upright ("sitting"). The stance hip is about 10 cm below standing height, with the knee at 50° and the ankle 39° dorsiflexed. | Research-based timing: 192 spm, contact 0.175 s, 74° foot at toe-off (Miyashiro 2019); pelvis vertical scale 0.7 → 0.6. | The stance hip is about 7 cm below standing, the mid-stance knee 45° and peak dorsiflexion 35°. The pelvis bounces 4.2 cm. The stance no longer reads as sitting. |
| 4 | The front and rear ¾ views showed the shirt **back** from the front. The close-view cameras were mirror-handed, so the real character's front faces were culled. The body was fine; the camera was wrong. | The close-view look-at cameras now use CAMERA_V1's det −1 handedness. | Front, rear and side views are all correct. The gameplay view was always correct. |
| 5 | Front view: "hands on hips". Each forearm turned in across the belly, and in the forward swing the hand crossed to the sternum. Side view: the forward hand rose to chin height ("boxing"). | Arm internal rotation 18 → 6°, forward adduction 6 → 3°, forward shoulder flexion 40 → 33° (Hild 2005: the wrist stays about 11 cm lateral of the sternal notch). | The hands stay lateral of the midline, and the forward hand reaches chest height. The arms read as driving. |
| 6 | Gameplay view, both runners: the lane labels were ambiguous. | A tag beside each runner's pelvis. | Unambiguous (see also #10). |
| 7 | Late stance: the toes stayed flat until toe-off, so the MTP joint reached **74° dorsiflexion**. That is beyond V2's MTP range (60° active / 70° hard) and not how a push-off looks. Peak stance dorsiflexion was 35.7°, against about 27° measured. | MTP extension is capped at 52° (C1 smooth cap). Beyond the cap the toe segment pitches and the foot rolls onto the toe pad (front studs, 7 cm ahead of the MTP joint), which becomes the fixed contact. | MTP maximum 52.0° at every speed. Stance dorsiflexion 35.7 → 32°, mid-stance knee 45 → 40°, pelvis 1 cm higher, touchdown knee rate −15 %. The joins are still C0/C1, and contact slip is 0 at the heel, MTP and toe pad. |
| 8 | Generalisation: only one speed existed. | Anchors for jog 3.0, run 5.5 and sprint 7.8 m/s; a speed-grid cache of the solved gait; a plant made at each touchdown and carried back by the root's own travel; a filtered acceleration lean. | On the 3 → 7.8 → 3 m/s ramp, RUN-1 knees p99 4.1 vs V1.3 26.1 cm/tick², with slip 0.01 mm/tick. Visually: an upright, relaxed jog, a driving sprint, lean building into the acceleration and easing out in the deceleration. |
| 9 | Sprint: the forward hand rose to head height. | Sprint anchor: arm forward 52 → 45°, elbow swing 22 → 18°. | The hand peaks at chin height. |
| 10 | On a 1470 × 830 laptop the close views were below the fold. The zoomed overlay tags were offset because the overlay ignored the clip-space centring terms. | A window-fitting layout (gameplay camera on the left, close views on the right) and a full-projection overlay. | Everything fits on one screen; tags and markers are correct. |
| 11 | Clearance check (`swing foot to stance-leg bone line`). At mid-swing the recovering foot passed through the stance calf: 0.2 cm at 5.5 m/s. **Cause: a sign error.** The mid-swing "abduction" key *adducted* both swing legs (for the left leg, + roll is medial), and the swing kept its toe-out (external) leg yaw, which with a 110° knee carries the heel medially. | Fixed the abduction sign, swing abduction 8°, and a mid-swing hip internal-rotation key of 8°. | Bone-line clearance 0.2 → 11.2 cm at 5.5 m/s (≥ 13.8 cm at 3.0 / 7.8). Knees ≥ 19 cm apart. Swing boot ground clearance 3.1 → 5.9 cm. From behind, the heel passes outside the stance leg and the feet still land on the line. Joins unchanged (C0/C1). |

Note: an earlier commit message (`f89710fb`) said "iteration log 7-10", but the log edit in that commit had failed. The rows above were added in the following commit.

## Continuity (`run1/tools/run1_continuity.cjs`, 5.5 m/s, 60 Hz ticks, after iteration 7)

The measure is the second difference of joint world positions, p99, in cm per tick². Lower is smoother.

| joint | RUN-1 | V1 (V1.3) | V1 + LC-1 |
|---|---|---|---|
| pelvis | 0.29 | 12.0 | 0.58 |
| hands | 1.29 | 12.3 | 2.55 |
| knees | 2.96 | 21.7 | 11.1 |
| ankles | 5.95 | 13.4 | 8.5 |
| toes | 7.0 | 14.1 | 9.8 |

- **240 Hz check:** RUN-1's measures drop to about 1/16 at 240 Hz. That is the signature of a continuous C1 signal; a one-tick snap would not shrink.
- **Contact-point slip** (the lowest of heel bottom, MTP ground point and toe pad while planted):
  - RUN-1: **0.000 cm** every stance, at constant speed and on the ramp (0.01 mm/tick).
  - V1.3: 0.6–3.2 cm on this metric, from single ticks at its heel → toe-pivot hand-over. V1's own metric (23 Sep) reports 0.0 cm, so this is metric-dependent.
  - LC-1: 0.
- **Penetration:** 0 for RUN-1.
- **Determinism** (`run1_determinism.cjs`): bit-identical joint matrices across fresh loads at every 60 Hz tick, at constant speed and on the ramp. No RNG or clock in the pose path.
