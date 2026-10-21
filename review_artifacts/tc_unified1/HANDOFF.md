# TC-UNIFIED-1 — handoff

**Status: presented for the owner's playtest. Not frozen, not integrated. LOCAL ONLY: the character is a real player's model; never publish.**

The mission is the owner's overnight brief of 21 Oct, saved verbatim in `sources/`. It integrates five pieces into one playable A99 / BC99 / D99 dribbler:
- 88573ef0;
- A99-C;
- Astra's persistent support;
- B4;
- B5.

The work was built beside the locked BASELINE-88573ef0, which is unchanged: `bl_lock_check.sh` passes at every commit.

## The page

`http://127.0.0.1:8361/sandbox/visual/tc_unified1.html` (served from the `dribble-1` worktree root).

- **Defaults:** BC99 / D99 / A99-C, FULL, BALL ON, joystick visible.
- **Stack buttons:** `A`, `A + C`, `A + C + SUPPORT`, `A + C + SUPPORT + B4`, `FULL`.
- **⇄ / X:** sends this session's input through the next stack.
- **BALL toggle:** BALL OFF runs Astra's movement probe.
- **Playtest menu:**
  - the 22 morning cases;
  - 11 favourable examples (states where FULL itself picks each move);
  - TC-LAYERED-2's 240 report-card traces.
- **⚙ diagnostics:** the layer toggles, attributes, panels, body warnings and performance.
- **URL options:** `?preset=A|AC|ACS|ACS4|FULL`, `?ball=0`, `?diag=1`.

## Architecture (`sandbox/visual/tc_unified1/`)

| File | What it is |
|---|---|
| `u_tc.js` | The TC core, copied from TC-LAYERED-2 (B4 / B5 included). Edits: the `LAYERS` / `PRESETS` entries for `c` and `support`; the refused-anchor checks; labelled rejections; a configurable request threshold (`reqThresh`, default 4°). With all layers off it is identical to 88573ef0 (`tools/u_equiv.mjs`: 345 / 345). |
| `u_sim.js` | `UnifiedSim extends PlaySim`: see the layer table below. |
| `u_gait.js` | Astra's `bodyGaitFrom`, copied, with two fixes: an anchor without a stance length gets the gait's; `lift()` never re-extends a stance that has already ended. Also `gaitPlace()`: the gait's own footfall rule (own side of the other foot, off the free ball's path), exported for revising committed landings. |
| `u_body.js` | 88573ef0's body plus the support presentation: see the timeline list below. |
| `u_viewer.js`, `../tc_unified1.html` | The page. |
| `u_tests.js` | The owner's traces, the `MORNING` cases and favourable examples, and `reqOf`. `reqOf` is exactly the page's stick: the rest state asks for RUN, or SPRINT when sprint is held. |

**`u_sim.js` (UnifiedSim) by layer:**

| Layer | What it adds |
|---|---|
| `c` | A99-C exactly: Astra's `AgilitySim.mkPlan` / `stateAt` pattern, with the carry's root path from `advance()` and technique keys exactly as authored. Equal to Astra's AgilitySim BALL ON, 345 / 345. |
| `support` | The shared foot plan (detail below). |
| `c` + `generic` | The unified B4 scoring (detail below). |

**The shared foot plan (`support`):**
- **Landing commitment:** an airborne foot keeps its landing once it is within 0.25 s.
- **Rate-limited revision:** the landing moves toward the gait's own place at 0.25 m per 1/60 s, then 0.08 m per 1/60 s, frozen in the last 0.055 s. A landing still out of reach (> 0.62 m from the root) is dropped and becomes a replacement step.
- **Anchors:** an anchor may take a committed landing if it re-times it −0.03 / +0.13 s and its place is reachable in the time left. An anchor farther than 1.3 m from the root is refused.
- **Early release:** a stance that has crossed to the other side, or is left more than 0.80 m behind, lifts early.
- **Cadence and width:** Astra's demand cadence and width.
- **Demand-driven posture channels:** none on a steady straight run.
- **Carry touches:** a planted foot that would lift less than 0.12 s before the touch needs ≤ 8 m/s relative to the body. A swinging foot is never handed a new touch in its last 0.09 s.
- **Urgent reach:** its contact box stays within the leg's reach (0.86 m).

**The unified B4 scoring (`c` + `generic`):**
- **Analog-first:** a steady rotation (one direction, > 45°/s, no step > 20°) penalises named moves and braking / lunging actions, and favours staying with the running action. It also re-plans in 10° steps, so A99-C can re-accelerate.
- **One foot, one history:** a candidate that moves a swinging foot's path faster than 6 m/s, or hands it a new touch in its last 0.09 s, or asks a just-lifted foot to reach over 14 m/s relative, pays a penalty. Such candidates stay candidates; the best of the rest wins.

**`u_body.js` support presentation:**
- **The continuous foot timeline:** sequential at 240 Hz and cached, so live and replay are identical. Each drawn foot is the raw plan foot plus an offset:
  - the offset absorbs every plan switch, keeping the ball of the foot fixed when planted, and is held through a stance, so there are no slides;
  - it decays as a critically damped spring, settled before the foot's next contact and touchdown;
  - it is capped at 5 m/s, rising to 14 m/s toward a contact.
- **Limits on the drawn foot:** ≤ 9 cm per tick, yaw ≤ 5° per tick, pitch ≤ 4° per tick.
- **Swing corridor:** ≥ 0.14 m lateral separation alongside the other foot, and yaw within ±22–45° of the heading, both weighted off near the foot's own contact.
- **Rendered root:** the authoritative root, plus 88573ef0's sway bounded to 4 cm.
- **Reach:** a planted or contacting leg out of reach lowers the body, at most 7.5 cm (Astra's vertical compression).
- **Planned contacts:** predicted from the ball after that tick's kick.

None of the body's work feeds back into the simulation.

## Verify

Run from `sandbox/visual/tc_unified1/tools`, except the lock check.

| Command | What it shows |
|---|---|
| `node u_equiv.mjs` | ALL OFF ≡ the locked 88573ef0 (345 / 345). |
| `node u_equiv.mjs --c` | `c` alone ≡ Astra's AgilitySim (345 / 345). |
| `node u_audit.mjs --ball --configs ASTRA,A,AC,ACS,ACS4,FULL` | Astra's BALL ON audit: jumps, intersections, root, contacts. |
| `node u_audit.mjs --configs ASTRA,AC,FULL` | The BALL OFF audit. |
| `node u_ab.mjs --configs A,B45,FULL` | The report card on the owner's 240 traces. |
| `node u_runlook.mjs --kinds A,FULL,ASTRA` | The straight run's posture against 88573ef0. |
| `node u_b5.mjs`, `u_grid.mjs`, `u_named.mjs`, `u_carry.mjs` | B5 timings, the action map, the named-move scenarios, the carry at speed. |
| `node u_gaps.mjs FULL [--tests <substr>]`, `u_jumps.mjs`, `u_xcat.mjs` | Diagnostics for each contact gap, jump and intersection. |
| `PT_TMP=<dir> PUPPETEER_NODE_MODULES=<dir> node u_browser.cjs --out <dir>` | The page in Chrome, plus `node u_resim.mjs <session.json>` for node ≡ browser. |
| `bash review_artifacts/tc_baseline_88573ef0/bl_lock_check.sh` | The baseline lock (from the worktree root). |

## Not done / open

See the morning report, §I.
