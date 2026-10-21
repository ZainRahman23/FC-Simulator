# TC-LAYERED-2 — handoff

**Page:** `sandbox/visual/tc_layered2.html` → `tc_layered2/tl_viewer.js`. Served from the worktree root: http://127.0.0.1:8361/sandbox/visual/tc_layered2.html

**URL parameters:**
- `?preset=A|B4|B5|B45|B452`
- `?layers=generic,exits,…`
- `?engine=baseline`

**Never edit** `tc_baseline_88573ef0*`. Run `bash review_artifacts/tc_baseline_88573ef0/bl_lock_check.sh` (from the worktree root) before every commit. `tc_layered/` (TC-LAYERED-1) is kept unchanged as the record.

## Code (`sandbox/visual/tc_layered2/`, a copy of `tc_layered/`)

- **`tl_sim.js` — the simulation.**
  - **Layers and presets:** `PRESETS` / `PRESET_LABEL` / `REJECTED`; `SOLUTION` + `actionId()` (the HUD's names).
  - **Attribute-ready:** `CAPS = techCaps(dri)`, the D99 values only.
  - **B4 selection:**
    - `outcome(c, q)` predicts the outcome and `costB4()` scores it; used for every candidate when `generic` is on (otherwise 88573ef0's `cost()` runs unchanged).
    - Named-move envelope check in `costB4()`.
    - `genericPlans()` / `genericBuild()`: the family gates (vocabulary, urgency for URGENT_REACH, side, need), re-anchored touch times, the line / intercept approach, the plant (skipped when supported, with B5), and the no-magic-foot swing bound.
    - In `instantiate()` (B4): set touches must lie inside their swing.
  - **B5:**
    - exits: `exitRelease()` × `CAPS.exitShare`, no exit lock;
    - windups: `CAPS.entryMin`, `CAPS.quickStep` in `anchorTimes()`, and `TRIMMED` templates gated by `CAPS.entrySlack`.
  - **Logs for the tools** (never read by the simulation): `log.acts` (each action's latest version: `tSel`, `tA`, `tC`, `tRelease`, `exitT`, `setT`, `tPrep`), `log.lock`, and `plan.decisionView` (the winner's outcome and nearest alternative).
- **`tl_body.js`** — the body. `blendOf()` finishes a retimed swing's blend before its touch when `early` / `generic` / `windups` is on. B1 (`ack`) stays here, rejected and off.
- **`tl_viewer.js`** — the page.
  - The presets and grouped toggles (candidate stack / optional B2 / rejected).
  - The solution HUD (`solutionHtml`: selected solution, why it won, nearest alternative, prediction, last action).
  - The playtest list and the named scenarios as stick tests.
  - Same input and X through the stack, and the body warnings.
- **`tl_tests.js`** — the owner's playtest list (`TESTS`: jog / run / sprint × carry, corrections, 45–180° snaps, rapid L/R, gradual rotation) and the named-move scenarios (`SCEN`, `scenSpecs`, `NAMED`).

## Tools (`tc_layered2/tools/`, node from `tc_layered2/`)

| Tool | What it does |
|---|---|
| `tl_equiv.mjs` | ALL OFF vs the locked engine, 345 runs. |
| `tl_survey.mjs [--configs A,B4,B45]` | Which action wins per test (fast, simulation only). |
| `tl_named.mjs` | The named-move scenarios. |
| `tl_b5.mjs` | B5 timings per action: request → preparation / contact, contact → control, ownership. |
| `tl_ab.mjs --configs A,B4,… --json f` / `--merge` | The posed report card: clocks, lock, touches, separation, LOST, body warnings. |
| `tl_browser.cjs --out dir` | The page in Chrome: presets via the stick, the same-input stack, named-scenario captures. |
| `tl_resim.mjs` | Node ≡ browser. |

## State

- Presented 21 Oct 2026, not frozen. Waiting on the owner's playtest.
- Next intended (owner): A + A99 → A + A99 + B4 → … + B5 → + selective B2.
