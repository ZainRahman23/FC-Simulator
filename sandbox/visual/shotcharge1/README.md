# SHOT-CHARGE-1

Isolated Laces-only charge review on frozen foundation aae44ae14cde8bb72467b5d3e7d2d6cf83307f9f.

Open review.html (default SP80 / 350ms); report.html holds the functions, all 40 measurements and caveats.

Only new sandbox/visual/shotcharge1 files are introduced. No match integration or other shot family changes. Tap feel is provisional, not approved.

Rebuild physics: node sandbox/visual/shotcharge1/tools/build-evidence.mjs
Verify: node sandbox/visual/shotcharge1/tools/test.mjs
Generate review: node sandbox/visual/shotcharge1/tools/build-review.mjs
Encode videos: node sandbox/visual/shotcharge1/tools/videos.mjs

Rendering requires Sharp and FFmpeg; paths can be overridden with SHARP_PATH and FFMPEG_PATH. Historical preservation verification requires the original task workspace; override SHOT_CHARGE_WORKSPACE when necessary.
