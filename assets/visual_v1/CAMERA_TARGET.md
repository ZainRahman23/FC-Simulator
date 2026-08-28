# Visual V1 Camera Target (documented, NOT finalized)

**Target:** FC-style high sideline broadcast camera.

- Goals remain **left / right**.
- Moderately **oblique** presentation — not purely vertical top-down.
- **Low perspective distortion**, strong tactical readability.
- Individual player sprites are **never distorted** to fake camera perspective;
  perspective comes from field projection/compression, sprite scale, and draw order only.

## Deliberately undecided

No camera-angle numbers are frozen yet. The first renderer MUST expose live tuning
controls so the values are chosen visually, not guessed:

| Control | Purpose |
|---|---|
| tilt / vertical compression | how oblique the pitch reads |
| zoom | sprite size vs. field context |
| field coverage | how much pitch is in frame |
| tracking smoothing | camera follow behavior on ball/play |

Chosen values will be recorded here (with date) once visually approved.

## CAMERA_V1 — accepted working camera (visual review, 2026-08-27)

Recorded from the live sandbox and set as the sandbox defaults. These are
**working production defaults, not immutable constants** — the developer
sliders remain live for later tuning. The perspective-camera mathematics
are unchanged.

| Parameter | Value |
|---|---|
| camera height | 30 m |
| sideline distance | 43 m |
| vertical FOV | 28° |
| look-target depth offset | +3 m |
| player scale | ×0.85 (fractional — integer sprite snap off by default) |
| tracking smoothing | 0.35 s (unchanged) |
