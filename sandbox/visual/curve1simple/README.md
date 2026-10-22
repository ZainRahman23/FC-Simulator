# CURVE-1 simple Finesse review

Open review.html. Default is 75 Curve; all eleven ratings use one behind-shooter view. The only comparison video plays 50, 75, 90 and 99 sequentially at the same camera and timing.

## Frozen setup

Foundation: 83564d58576d7ba1a9e12cbd04ed7d2899069235. Branch: prototype/curve-1-simple-review.

Shot Power 80; Finesse 27.15099715099715 m/s from unchanged BALL-SHOT-1.2. Right preferred/selected foot; shooter [84,.11,26]; target [105,2.1,37.25]. All body/execution fields identical. Only Curve and prelaunch yaw/elevation differ.

Local contact-axis correction: inherited negative Y INSIDE spin is changed to positive Y to bend inward. Magnitude remains 40*(Curve/75)^2.7 rad/s. Original curve1/resolver.js is untouched. Ball world and keeper are imported directly from curve1. Each physical solve precedes the unmodified keeper run; no result is imposed.

## Measurements

| Curve | Spin (+Y rad/s) | Yaw (°) | Elevation (°) | Outside aim (°) | Initial ray wide at goal (m) | Max departure (m) | Arrival (s) | Courtois |
|---|---|---|---|---|---|---|---|---|
| 0 | 0.000 | 28.179 | 16.780 | 0.000 | 0.000 | 0.000 | 1.0819 | GOAL |
| 25 | 2.060 | 28.518 | 16.780 | 0.340 | 0.161 | 0.036 | 1.0819 | GOAL |
| 50 | 13.385 | 30.387 | 16.783 | 2.208 | 1.064 | 0.236 | 1.0822 | GOAL |
| 60 | 21.898 | 31.793 | 16.788 | 3.615 | 1.767 | 0.387 | 1.0828 | GOAL |
| 70 | 33.202 | 33.665 | 16.799 | 5.486 | 2.737 | 0.587 | 1.0840 | GOAL |
| 75 | 40.000 | 34.794 | 16.807 | 6.615 | 3.342 | 0.708 | 1.0850 | GOAL |
| 80 | 47.614 | 36.061 | 16.819 | 7.883 | 4.042 | 0.845 | 1.0863 | GOAL |
| 85 | 56.082 | 37.477 | 16.834 | 9.298 | 4.850 | 0.997 | 1.0881 | GOAL |
| 90 | 65.441 | 39.049 | 16.853 | 10.870 | 5.785 | 1.167 | 1.0904 | GOAL |
| 95 | 75.727 | 40.788 | 16.879 | 12.610 | 6.869 | 1.355 | 1.0933 | GOAL |
| 99 | 84.647 | 42.308 | 16.905 | 14.130 | 7.864 | 1.520 | 1.0963 | GOAL |

Yaw is from +X toward +Z. Outside aim is relative to the direct target bearing (28.178590109959174 degrees). Max departure is outward perpendicular horizontal distance from the shooter-target line, not departure from initial tangent. All maxima occur before goal plane. All goals cross at [105,2.1,37.25] to <1e-7 m error, at identical launch speed. Zero keeper contacts in all eleven cases. This is not a success-rate experiment. Full precision and exact velocity vectors are in evidence/measurements.json.

## Renderer

Fixed behind-shooter camera pose [76,4.2,25] looking at [105,1,34], reframed with focal length 1450 px and principal point [960,260], at 1920x1080. No camera movement, trails or diagnostic panels. Ball/keeper positions use authoritative 240 Hz frames, displayed at 60 fps. Contact occurs .25 s into each 2.2 s 1x clip. Final recorded frame holds after goal. Bodies and net are geometry proxies; no physical net continuation is invented. Comparison concatenates the exact four clips.

## Reproduce

From the repository or packaged source folder (Node 22):

```sh
node sandbox/visual/curve1simple/tools/build-evidence.mjs
node sandbox/visual/curve1simple/tools/test.mjs
node sandbox/visual/curve1simple/tools/build-review.mjs
node sandbox/visual/curve1simple/tools/videos.mjs
```

Video rendering requires sharp (SHARP_PATH) and ffmpeg (FFMPEG_PATH); defaults are the original workspace paths. To verify historical outputs from packaged source, set SHOT_WORKSPACE_ROOT to the original workspace. Package with tools/package.mjs and an explicit CURVE-1-SIMPLE output path.

10/10 focused tests passed. Prior tracked visual files: 2,264; historical outputs: 5,490, all preserved. Replay SHA-256: e50525a8f1ff150f142e6bf0ec525496f34b3b22aa78872cb859fdb7f6a4eff9. See report.html for definitions, fixture, exact crossing coordinates and limitations.

Stop here for owner visual review; no further magnitude tuning.
