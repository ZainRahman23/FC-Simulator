# CURVE-1.1 — same Curve system, 40% stronger

Open review.html. All 11 ratings; default 75; unchanged behind-shooter camera. One comparison: 50 → 75 → 90 → 99 sequentially.

## Exact change

56 × (Curve/75)^2.7 rad/s, implemented as the frozen intentional sidespin ×1.40. No floor at zero. The existing targeting algorithm is copied unchanged and tested for exact function-source identity. The physical trace, world, Courtois and renderer are imported directly from CURVE-1 simple review.

Foundation: 4f72fbf9fd99a1ced295ba57c262b7fc60d5c61c. The version is isolated in sandbox/visual/curve11; all historical versions retain their original hashes. Shot Power 80 supplies 27.15099715099715 m/s from BALL-SHOT-1.2. Origin [84,.11,26], target [105,2.1,37.25], right foot, identical clean execution.

## All ratings

| Curve | Spin rad/s | Outside aim | Actual bend | Courtois result |
|---|---|---|---|---|
| 0 | 0.000000 | 0.000000° | 0.000000 m | GOAL |
| 25 | 2.883770 | 0.475666° | 0.050867 m | GOAL |
| 50 | 18.738794 | 3.092603° | 0.330813 m | GOAL |
| 60 | 30.657094 | 5.064415° | 0.541993 m | GOAL |
| 70 | 46.482269 | 7.694061° | 0.824236 m | GOAL |
| 75 | 56.000000 | 9.284449° | 0.995396 m | GOAL |
| 80 | 66.660042 | 11.075965° | 1.188733 m | GOAL |
| 85 | 78.515195 | 13.083757° | 1.406251 m | GOAL |
| 90 | 91.617279 | 15.325602° | 1.650312 m | GOAL |
| 95 | 106.017205 | 17.823104° | 1.923996 m | GOAL |
| 99 | 118.505264 | 20.023155° | 2.166858 m | GOAL |

Bend = maximum perpendicular horizontal departure from direct shooter-target line. Same physical sampling and first-flight interval as previous review; all maxima occur before goal.

## Old → new

| Curve | Spin rad/s | Outside aim | Actual bend | Bend change |
|---|---|---|---|---|
| 50 | 13.384853 → 18.738794 | 2.208387° → 3.092603° | 0.236196 → 0.330813 m | +40.058% |
| 75 | 40.000000 → 56.000000 | 6.614975° → 9.284449° | 0.708315 → 0.995396 m | +40.530% |
| 90 | 65.440914 → 91.617279 | 10.870470° → 15.325602° | 1.166525 → 1.650312 m | +41.472% |
| 99 | 84.646617 → 118.505264 | 14.129589° → 20.023155° | 1.519939 → 2.166858 m | +42.562% |

## Validity

99 is valid over the full first airborne flight. Forward X never reverses, excluding loops. Minimum X speed 16.983512505132175 m/s; minimum speed along target bearing 14.178254289154035 m/s. Maximum heading deviation from the target bearing 33.82108650946257°, below the predeclared lateral-dominance threshold of 45°. Maximum substep heading change 0.1650667698563993°, below .5°. Finite state, zero exhausted CCD, no pre-goal turf contact. Physical target error 1.3520346532659788e-10. No multiplier fallback.

## Reproduce

From repository or packaged source, Node 22:

```sh
node sandbox/visual/curve11/tools/build-evidence.mjs
node sandbox/visual/curve11/tools/test.mjs
node sandbox/visual/curve11/tools/build-review.mjs
node sandbox/visual/curve11/tools/videos.mjs
```

Video rendering uses SHARP_PATH and FFMPEG_PATH, with original workspace defaults. Historical-output test from packaged source requires SHOT_WORKSPACE_ROOT pointing at the original workspace.

10/10 tests pass. Replay SHA-256: 6f0551a69301a33f89181ae56c63821295dcf4bfef5ddc892cc6f015cfed379c. Physics uses 240 Hz frames; video 60 fps. Contact .25 s into each 2.2 s clip; final authoritative frame holds. No visual trajectory interpolation or invented net motion.

Await owner visual review; no further tuning.
