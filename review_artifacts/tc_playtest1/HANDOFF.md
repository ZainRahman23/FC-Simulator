# TECHNICAL-CONTROL PLAYTEST-1 — handoff

**Page:** `sandbox/visual/tc_playtest1.html` → `tc_playtest1/pt_viewer.js`. Local server root = the worktree: http://127.0.0.1:8361/sandbox/visual/tc_playtest1.html

## Modules (sandbox/visual/tc_playtest1/)

**`pt_ball.js` — the authoritative ball**
- The frozen kernel, plus a tabulated rolling law (predict / speedFor).
- A launch is scheduled for the current tick. `v` reports the launched velocity until the kernel's next step, so post-contact decisions see the touched ball.

**`pt_params.js`**
- 99 = the elite reference; below 99, provisional linear scaling.
- The gait table: RUN-1's Ts / D, baked into `pt_baked.json` by `tools/pt_bake.mjs`.

**`pt_tech.js`**
- The five TECHNICAL-CONTROL-1.5 references as parametric templates.
- Relative time τ, the right-foot frame, scaled by the turn angle, mirrored per foot.

**`pt_sim.js` — PlaySim: the simulation (240 Hz)**
- request → re-plan (carry + technique instances, cost) → plan (1.5 s centre-of-mass track, stances, contacts) → kernel launches.
- The history (plans 12 s, contacts, ball track 12 s, every tick's input, live attribute / foot changes) serves the presentation and replay; no decision reads it.
- The hash mixes the centre of mass and the ball every 4 ticks.

**`pt_body.js` — PlayBody: the presentation**
- TECHNICAL-CONTROL-1.5's RefSim pose code on an adapter fed by the simulation's history; never writes to it.
- Re-planned swings blend over 0.12 s.
- Carry touches: the foot is slower than the ball and follows through behind it.
- A swing foot inside the ball is moved clear.

**`pt_viewer.js` — the page**
- Loop, input latch, cameras, overlays, HUD and panels, replay, determinism check, the `window.PT` test surface.

## Tools (node from tc_playtest1/; puppeteer from the scratch `node_r`)

| Tool | What it does |
|---|---|
| `tools/pt_probe.mjs <scenario> [dur] [t1,t2]` | Scripted run: actions with the why, state lines, contacts; replan trace in the window. |
| `tools/pt_tests.mjs [--json]` | The owner's input sequences and the timing sweeps. |
| `tools/pt_pose_test.mjs <scenario> [dur] [every]` | Pose timing, intersections, animation-neutrality test. |
| `tools/pt_audit.mjs <session.json> [--json]` | Pose audit of a recorded browser session. |
| `tools/pt_resim.mjs <session.json> [t1,t2]` | Node re-simulation of a browser session (node ≡ browser) with a decision trace. |
| `PUPPETEER_NODE_MODULES=… node tools/pt_browser.cjs --out <dir> --seq tour [--q "cam=top"] [--set '{"show":{…}}'] [--shots "…"]` | Real key presses in Chrome, screenshots, perf, determinism, session export. |
| `tools/pt_bake.mjs` | Re-bakes RUN-1's tables (only if RUN-1's gait changes — it is frozen). |

## Next, if the owner wants

- Remove the remaining visual intersections (thighs after a chop, ball / boot around some touches).
- Faster sprint chops.
- Lower-rating calibration (owner's decision).
- Styles.
- Defenders (later combined sandboxes).
