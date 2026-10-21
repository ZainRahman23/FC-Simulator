# TC-CONTROLLED-1 — handoff

**Presented for the owner's playtest. Not frozen, not integrated. LOCAL ONLY (the character is a real player's model).** The owner's brief is in `sources/`, verbatim.

## The page

`http://127.0.0.1:8361/sandbox/visual/tc_controlled1.html`

- **BALL CONTROL MODEL** switch (top bar): `CURRENT FREE` (TC-UNIFIED-1's FULL, bit-identical) / `CONTROLLED` (the default).
- `⇄ same input (M)` replays this session's input through the other model.
- `OPPONENT POKE (P)` drives a deterministic lunging opponent foot into the real ball, from alternate sides at 8 m/s. It steers at the ball where it is now; it knows nothing of the player's plan.
- `RELEASE (K)` turns the player's next touch into a knock-on (an intentional release).
- Both are recorded events: replay, re-simulation and node all reproduce them.
- Everything else is as on TC-UNIFIED-1's page: stack presets, playtest menu, ⚙ diagnostics.
- With ⚙ on, the HUD shows the possession block: state, controlled action, ball phase, next planned contact, support / technical foot, committed, control threat, fallback, continuation, last exit.
- `tc_unified1.html` is unchanged and linked under ⚙.

## Code (`sandbox/visual/tc_controlled1/`)

| File | What |
|---|---|
| `c_sim.js` | **ControlledSim** extends tc_controlled1's UnifiedSim. `o.control`: `"FREE"` (default) = TC-UNIFIED-1's FULL exactly (`tools/c_equiv.mjs`: 384 / 384 identical); `"CONTROLLED"` = CONTROLLED_BALL. |
| `u_sim.js`, `u_tc.js`, `u_gait.js`, `u_body.js` | Copies of tc_unified1's. Two changes: a recursion guard in UnifiedSim's touch skip (TC-UNIFIED-1 could recurse without end in a rare case; FREE stays identical on every test), and in `u_body.js` the follow-through of a CONTROLLED soft push following the impulse (pose only; FREE's pose unchanged). |
| `u_viewer.js`, `../tc_controlled1.html` | The page. |

## The model (CONTROLLED)

The ball is the authoritative kernel ball throughout:
- never parented, never moved;
- between contacts it rolls freely;
- only the player's touches and an opponent's collision change it, each a kernel launch from where the ball really is.

What changes is the planning while possession is secure.

1. **The continuation** (`contOf`). A plan is a controlled plan only if all three hold:
   - its next contact comes within 1.2 s;
   - the free ball stays inside the body's envelope until then (1.5 m + 0.12 m per m/s);
   - at that contact the ball is within 1.0 m (the kernel contact's own miss rule).

   The ball coming to rest at the feet also counts, if it stays inside the envelope meanwhile. A continuation that needs a swinging foot to jump (one-foot-one-history, > 8 m/s relative to the body) does not count.
2. **The decision.**
   - The planner (B4 / the cost, unchanged) scores every candidate with +50 when it has no continuation, +30 when it postpones the running plan's imminent touch under an active stick.
   - Its choice is held back, then adopted only if it has a continuation. Otherwise, in order:
     1. the best candidate that has one;
     2. **the running touch, re-aimed for the new intent**: the body planned on the new request at once, the touch kept in time and foot;
     3. the running plan kept until the next re-plan;
     4. **SECURE**: a pursuit planned through A99-C's real movement, 88573ef0's pursuit, or the wide-reach touch;
     5. **RECOVERY**: if none of those is a controlled continuation, the earliest pursuit that touches the ball at all, kept while its touch stays in reach. Never "no contact".
3. **Controlled touches.** None apply to a steady stick at speed, which keeps 88573ef0's longer push. Otherwise:
   - **Busy stick:** a carry touch's push follows the body's present motion and goes no faster than the body over the next 0.3 s + a little. It keeps 88573ef0's carry lane (the preferred foot's side and that foot's next swing).
   - **Braking touch / braking pivot:** the ball goes back no faster than it separates by ≈ 0.9 m during A99-C's own reorientation.
   - **No overrun:** a body braking from above the requested speed never slows the ball more than 1 m/s below its own.
   - **Execution:** a touch re-aims at the newest intent if the stick has changed since the plan.
4. **Stick activity** (`volatility`): turning over 0.6 s minus the largest 60 ms change, remembered ≈ 0.4 s. A clean snap is not activity.
5. **The possession state**:
   - FREE → (the player's own contact followed by a controlled continuation: COLLECTED) → CONTROLLED → FREE.
   - Every exit is classified: INTENTIONAL_RELEASE, OPPONENT_TACKLE / OPPONENT_INTERCEPTION / EXTERNAL_COLLISION (an opponent contact within 1 s), CONTROLLER_FAILURE (anything else).
   - After an opponent contact, control survives only a minor deflection (Δv < 2 m/s and the next touch within 0.6 s).
   - The same monitor runs as an observer on FREE.
6. **The opponent probe**:
   - a sphere foot (r, height z) moving linearly, or (`track`, the page's poke) steering at the ball where it is now at its fixed speed;
   - resolved against the real ball every tick, with the relative velocity reflected along the contact normal (restitution 0.55);
   - the new velocity launched from the ball's real position.

The results: `TC_CONTROLLED1_REPORT.md`.

## Verify (`tc_controlled1/tools/`)

| Command | What |
|---|---|
| `node c_equiv.mjs` | FULL-FREE ≡ TC-UNIFIED-1 (384 runs) |
| `node c_torture.mjs --configs FREE,CONTROLLED --seeds 240 --dur 60` | four simulated hours each of seeded random legal input; observed losses (each followed up: the next touch, the separation until it) + classified exits. Split with `--from` / `--seeds` to run in parallel. |
| `node c_opponent.mjs --trials 200` | the opponent probe: hits, outcomes, continuity |
| `node c_poke.mjs` | the page's tracking poke at 40 random controlled moments |
| `node c_neutral.mjs` | animation on / off identical (with opponent hits) |
| `node c_cpu.mjs` | CPU per simulated second, by part |
| `node c_ticks.mjs` | the tick-time tail (p99 / p99.9 / ticks > 8 ms, the worst ticks) |
| `node c_decisions.mjs [--seeds 60 --from 1 --json f]` | how often CONTROLLED changed the decision, and how long it held a plan |
| `node c_cases.mjs` | the morning cases in both models |
| `node u_ab.mjs --configs FULL-FREE,FULL-CONTROLLED` | the report card (240 traces) |
| `node u_audit.mjs --ball --configs FULL-FREE,FULL-CONTROLLED` | body / contacts on Astra's set |
| `node u_grid.mjs --configs FULL-FREE,FULL-CONTROLLED` | the action map (named moves) |
| `PT_TMP=… PUPPETEER_NODE_MODULES=… node c_browser.cjs --out <dir>` + `node u_resim.mjs <session>` | the page in Chrome, node ≡ browser |
