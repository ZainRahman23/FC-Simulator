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
