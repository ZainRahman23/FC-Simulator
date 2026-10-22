# BALL-ON PACE V1: handoff

**State:** three D99 ball-carrying envelope candidates (A / B / C) presented for the owner's playtest. None chosen, nothing frozen, no rating scaling. Local only: the character is a real player's model.

**Page:** `http://127.0.0.1:8361/sandbox/visual/ballon1.html`

- Opens on S99 38 km/h · D38 · A99-C · D99 · BC99 · CONTROLLED · BALL ON · CARRY-B, with the same player BALL OFF running beside on the same input.
- **BALL-ON PACE** switch: BALL OFF / CARRY-A / CARRY-B / CARRY-C, instant. **⇄ N** replays the same input through the next one.
- The pace panel shows the envelope:
  - physical vmax and D38;
  - the available vmax now;
  - the push available;
  - the acceleration now;
  - the control demand;
  - the carry type.
- Presets: RACE 60 m / 100 m / first 15 m, steering, curve, cuts, sprint → tight control → sprint, stop → start.
- URL parameters: `?carry=OFF|A|B|C`, `&ref=0` (no twin).
- `s99.html` (the S99 mission page) is unchanged.

## Code (`sandbox/visual/ballon1/`, a copy of `speed99/`)

| File | What |
|---|---|
| `carry_env.js` | **The envelope.** The candidates; the control demand (raw, and its smoothing); the available vmax; the ball-on acceleration (D38's launch × (1 − per-touch cost × the measured touch share), tapered toward the available vmax); running to the ball (the free ball 1.0 → 2.0 m away); the carry-type names |
| `pace.js` | `applyPace(P, id, carry)` puts the candidate on `P.ballEnv`. The physical pace is unchanged |
| `s_movement.js` | `advance()` reads `params._envD` (one preallocated object): the ball-on acceleration directly and the available vmax. It slows gently (3 m/s²) when the envelope, not the request, falls below the speed |
| `u_sim.js` | `mkPlan()` applies the envelope along the plan on every non-keyed tick, updated every 3rd tick (the free ball every 12th). Technique keys are untouched. The free ball counts only until the body reaches it. A pursuit's direction demand uses its own heading |
| `c_sim.js` | `ctlTick()`: the moment's demand, smoothed per tick (the seed of every plan's envelope, the HUD); `ctlHist` / `ctlAt()` for the replay. While CONTROLLED has no contact planned, a re-plan every 0.05 s |
| `u_tc.js` | SPRINT_CARRY's due-touch window is 0.15 s with an envelope (0.06 s without). The 99 recovery reach goes across to 0.34 m with an envelope |
| `u_viewer.js`, `s_tests.js`, `../ballon1.html` | The playground |

**Also (outside ballon1):** `speed99/u_viewer.js` now lists the S99 page's mission presets first in the Playtest list; they had been buried in the last group. That is the only change to the S99 build: its simulation is untouched.

All of it is gated by `o.carry` with the ball on. Without a candidate, ballon1 ≡ the S99 build; with the ball off, a candidate changes nothing (`tools/b_equiv.mjs`).

## Verify (`ballon1/tools/`)

| Command | What |
|---|---|
| `node b_pace.mjs` | BALL OFF vs A / B / C: splits 5–100 m, peak, time to peak, time to 70 / 80 / 90 / 95 % of the available vmax, acceleration by speed band |
| `node b_demand.mjs` | the owner's control-demand tests: speed, available speed and acceleration, demand, separation, touches/s, next useful touch |
| `node b_share.mjs` | the touch-share measurement behind the acceleration shape |
| `node c_torture.mjs --configs CONTROLLED --pace D38 --vocab EXPANDED --carry B --seeds 80 --verbose` | possession torture per candidate |
| `node b_equiv.mjs`; `node s_equiv.mjs` | ballon1 without a candidate ≡ speed99; BALL OFF unaffected; CURRENT ≡ TC-CONTROLLED-1 |
| `PT_TMP=… PUPPETEER_NODE_MODULES=… node b_browser.cjs --out <dir>` | the playground in Chrome. In the scratchpad, puppeteer-core is reinstalled at `node_p/node_modules` |
| `node b_cpu.mjs` | the envelope's incremental CPU: all configurations interleaved in one process |

## Next (only on the owner's word)

1. The owner plays A / B / C and selects (or adjusts) the D99 envelope.
2. Then: fix locomotion and support integrity against the chosen movement demands (fast circle, 150–180° reversals, braking support, SOLE_ROLL).
3. Then: the Dribbling 1–98 model, per `DESIGN_NOTES.md`.
