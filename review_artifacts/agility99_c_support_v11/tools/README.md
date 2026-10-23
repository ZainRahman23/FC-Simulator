# Reproduction tools

No browser tooling is required to run the packaged playground or watch its videos. `review/Launch.command` uses Python 3; the page uses locally bundled JS/assets and WebGL2.

## Numerical verification

From package root, `node tools/verify.mjs` checks seven source SHA-256 values, eight representative immutable V1 references (BALL OFF and ON), all four profiles × both ball modes for no simulation feedback, and exact live/replay joint equality. `--full` checks all 564 immutable V1 references. Uses Node built-ins; generated with Node v22.19.0 on macOS arm64.

The historical reference fixtures were regenerated from the preceding V1 source, each simulation hash cross-checked against the original saved V1 matrix. Fixtures store SHA-256 of the entire serialized tick array and contact record, not only final position. Exact numeric replay assumes compatible JS floating-point behavior. Do not update these reference fixtures merely to make an integration change pass: C is owner-selected and must be preserved.

From `review/`, use `node review-tools/audit.mjs` (272 matched BALL OFF scenarios), `node review-tools/audit.mjs --ball` (24 BALL ON scenarios), and the two trace scripts. All imports resolve to this package's `lab/`; results go to `data/`. The report's embedded data does not automatically regenerate after a rerun.

Movement clocks can be regenerated from `review/` with `node lab/sandbox/visual/agility99/bench.mjs full data/recomputed-movement-matrix.json`. This original runner includes CURRENT/A/B/C and both ball modes. It takes longer than the C-only fixture check. The full historical C-only output is already preserved.

## Browser checks and optional recapture

Optional tools require Playwright, installed Chrome, and (capture only) FFmpeg. Use your existing developer setup; there is no auto-install or network dependency in the package. `PLAYWRIGHT_MODULE` can name an absolute installed Playwright module directory; otherwise `require('playwright')` uses normal Node resolution. `CHROME_PATH` overrides the macOS Chrome default; `FFMPEG` overrides `ffmpeg` on PATH. On another platform, adjust the Chrome path/launch flags in these tooling scripts as needed.

Serve `review/` on loopback port 8768:

```sh
python3 -m http.server 8768 --bind 127.0.0.1 --directory review
node tools/ui_test.cjs
node tools/report_qa.cjs
node tools/capture.cjs
node tools/capture.cjs --ball
```

The scripts enter the package root themselves. UI test also accepts `REVIEW_URL` for the complete lab URL. Capture records the unchanged deterministic cases through the renderer at 30 fps, not real-time screen recording. All original 20 MP4s and their manifests are included. Browser checks/capture overwrite matching `review/data/` evidence and replay files; package integrity will then differ from the delivered manifest. No tool writes production source or modifies the physical contacts.

The portable numerical verifier was run during handoff. Browser utilities are path-adapted copies of the already-used V1.1 tooling, supplied for reproduction; the delivered UI/report evidence records the original successful browser checks. No visual feature work was done during handoff.
