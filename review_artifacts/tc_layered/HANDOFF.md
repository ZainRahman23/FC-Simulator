# TC-LAYERED-1 — handoff

**Page:** `sandbox/visual/tc_layered.html` → `tc_layered/tl_viewer.js`. The local server root is the worktree: http://127.0.0.1:8361/sandbox/visual/tc_layered.html

**URL parameters:**
- `?preset=A|B1|B2|B3|B4|B5|ALL`
- `?layers=ack,early,…`
- `?engine=baseline` (the locked engine)

**Immutable baseline:** `tc_baseline_88573ef0.html`, never edited. Run `bash review_artifacts/tc_baseline_88573ef0/bl_lock_check.sh` (from the worktree root) before every commit.

## Modules (`sandbox/visual/tc_layered/`)

- **`tl_sim.js`** — 88573ef0's `pt_sim.js` plus the layers.
  - `LAYERS`, `PRESETS`, `presetLayers()`; the flags live in `o.layers` and are recorded with the session.
  - **B2:** `carryVariants()` (shortened step, angled approach); the prefFoot rule is in `carryTouches()`.
  - **B3:** in `replan()` / `instantiate()` via `finalApproach()`.
  - **B4:** `GENERIC`, `genericPlans()`, `genericBuild()`, `approachH()`, and `techExit()` (named moves' exit quality). Generic commitment is the final react window.
  - **B5:** `exitRelease()`, no exit lock; `TRIMMED` templates for wind-ups.
  - **B6:** sized technique aims in `instantiate()`.
  - `log.lock` records the resolver's lock intervals; logs only, nothing reads them.
  - Imports `pt_ball`, `pt_params`, `pt_tech` from `tc_baseline_88573ef0/`, read-only.
- **`tl_body.js`** — 88573ef0's `pt_body.js` plus B1.
  - `leadAt`, `ack`, `prepOf` / `prepFoot`, and `poseAtAck` (a copy of RefSim.poseAt with the pelvis lead and head look).
  - B2's blend-before-contact is in `blendOf()`.
  - With `ack` off it calls the borrowed `RefSim.poseAt` unchanged.
- **`tl_viewer.js`** — 88573ef0's `pt_viewer.js` plus the A/B playground.
  - Engine switch (the layered copy, or the locked `tc_baseline_88573ef0/pt_sim.js` + `pt_body.js`), layer checkboxes and presets.
  - Same-input replay through any configuration (`sameInput`, `nextInChain`, key X); the owner's tests on the stick (`startTest`).
  - The BODY WARNINGS panel (`diagOf`, `diagPanel`).
  - Test surface `window.PT`: `engine`, `preset`, `layers`, `same`, `next`, `test`, `diag`, `record`, `verify`, `hud`, `state`.
- **`tl_tests.js`** — the owner's required tests (§22) as stick traces; shared by the page and the tools.
- **`tl_torture_seq.js`** — PLAYTEST-1.2's rapid-input sequences. Test input only, used by the equivalence check.

## Tools (`tc_layered/tools/`, node from `tc_layered/`)

| Tool | What it does |
|---|---|
| `tl_equiv.mjs [--layers a,b]` | ALL OFF (or the given layers) vs the locked engine on 233 runs: hash, contacts, actions. |
| `tl_ab.mjs --configs A,B1,…,+early [--only s] [--json f]` / `--merge a.json,b.json --txt f` | The report card: clocks, lock, touches / redundant, separation, LOST, body warnings. |
| `tl_browser.cjs --out dir` | The page in Chrome: presets via the stick, the same-input chain, determinism, sessions, screenshots. Needs `PT_TMP` / `TMPDIR` / `PUPPETEER_NODE_MODULES`. |
| `tl_resim.mjs <session.json>` | Re-simulates a browser session in node, for either engine. |
| `tl_env.mjs` | `makeSim("BASE"\|"TL", o)`. |

## State

- Presented 21 Oct 2026 for the owner's hands-on review. Not frozen, not integrated.
- The owner chooses which layers survive (§26: "Do not choose the final architecture yourself").
