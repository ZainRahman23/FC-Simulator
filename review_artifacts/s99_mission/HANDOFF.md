# S99 mission: handoff

**State:** presented for the owner's playtest. Not frozen, not integrated beyond `sandbox/visual/speed99/`, no 1–98 calibration. Local only: the character is a real player's model.

**Primary page:** `http://127.0.0.1:8361/sandbox/visual/s99.html`

It opens on 99 PACE (S99 38 km/h · D38 · A99-C), D99 / BC99, CONTROLLED_BALL, FULL, BALL ON, EXPANDED, the joystick.

| Control | Key |
|---|---|
| 99 PACE ⇄ CURRENT PACE, same input | N |
| CORE ⇄ EXPANDED, same input | T |
| Review-only *force a family* selector | ⚙ |

URL parameters: `?vocab=CORE|EXPANDED`, `&cam=…`, `&diag=1`. The SPEED-99 playground `speed99.html` is unchanged in behaviour (its viewer additions are gated by `window.S99_PRIMARY`).

The full results are in `S99_MISSION_REPORT.md`; the research note is `RESEARCH.md`.

## Code (`sandbox/visual/speed99/`)

Every change is gated by the 99 pace (`pace.accGait` / `pace.sprintCarry`), the EXPANDED vocabulary, or a review-only force. CURRENT PACE stays bit-identical to TC-CONTROLLED-1 (`tools/s_equiv.mjs`).

| File | What changed |
|---|---|
| `pace.js` | D38's `sprintCarry` (N = 2, the graded open-space conditions, continuation horizon 1.65 s) |
| `u_body.js` | **Phase 1 body:** planted yaw hold; plant pivot (≤ 5° per tick about the ball of the foot, ≤ 70° from the facing); the heel rise from the drawn ankle; support compression weighted per tick in the foot timeline (rate-limited); the swinging knee clears the standing one; a planted foot settles its height above the stance |
| `u_gait.js` | Braking / cut plants keep a foot down; top-speed contact cap only in steady running; near-rest feet are standing (the first step of a standing start) |
| `u_tc.js` | **SPRINT_CARRY:** `sprintOpen()` levels, the due touch, lane foot only, the extrapolated swing end. The against-the-run push-on. The 99 RECOVERY reach. **EXPANDED families** LAT / KNK / SOL and the review-only feints FNO / FNI; `o.vocab`, `o.forceFam` |
| `c_sim.js` | Continuation horizon for sprint-carry and knock contacts; the turn-back pursuit fallback; HUD phase "SPRINT CARRY" |
| `u_viewer.js`, `s_tests.js`, `../s99.html` | The primary page: defaults, the techniques switch, the same-input vocabulary replay, review presets (a preset releases the sprint lock and latches its stick frame to the player's start heading), the force selector |

## Verify (`speed99/tools/`)

| Command | What |
|---|---|
| `node s_legs.mjs --pace D38 [--only …] [--detail N]` | ball-off leg torture at 38 km/h, 17 scenarios × 8 phases |
| `node c_torture.mjs --configs CONTROLLED --pace D38 --vocab EXPANDED --seeds 60 --from 1001 --verbose` | seeded possession torture: exits, flags, contacts by kind, recovery actions, contact gaps |
| `node s99_bodytorture.mjs --configs D38:EXPANDED,CURRENT:CORE --seeds 8` | the posed body under the same torture, ball on |
| `node s99_families.mjs` | the EXPANDED families: choice, timing, mirror, body |
| `node s99_cutexplode.mjs --vocab EXPANDED` | cut → explode; the push-length trade-off |
| `S99_PACE=D38 S99_VOCAB=EXPANDED node c_opponent.mjs`, `… c_poke.mjs`, `… c_neutral.mjs`, `… c_cpu.mjs` | opponents, neutrality and CPU at the 99 pace (any tool takes the two env variables) |
| `node s_equiv.mjs` | CURRENT ≡ TC-CONTROLLED-1 |
| `PT_TMP=… PUPPETEER_NODE_MODULES=… node s99_browser.cjs --out <dir>`, then `node u_resim.mjs <session>` | the primary page in Chrome; node ≡ browser |

## Next (only on the owner's word)

1. The owner plays the page and decides SPRINT_CARRY's push length (N = 2 now, or N = 3) and whether EXPANDED stays the default.
2. Fix SOLE ROLL's leg crossing in 90–120° pivots, then return it to the automatic choice.
3. Feints, stepovers and elastico, once a defender-reaction model exists to value them.
4. The remaining body items: the fast circle at 38 km/h, the 180° drag-back from top speed, and the floats inside A99-C's hardest stops.
