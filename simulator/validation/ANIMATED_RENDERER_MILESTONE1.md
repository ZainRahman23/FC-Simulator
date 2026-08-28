# ANIMATED MATCH RENDERER — MILESTONE 1 REPORT

Date: 2026-08-24 · Football: **FROZEN at v0.7-cal10** (untouched, hash-proven) · Status: **STAGED, NOT DEPLOYED**

Governing rule honored throughout: *the renderer visualizes the authoritative simulation; it is not a second simulator.* No engine, calibration, player-data, RNG, timing, or outcome logic was touched. All motion the renderer shows is interpolation between authoritative per-second engine states plus event-driven cosmetic animation; nothing feeds back.

---

## 1. Architecture chosen and why

**Server-side per-second keyframe sampling + client-side Canvas 2D interpolating renderer.**

- **Transport:** the existing `/api/matches/{id}/advance` endpoint gained an opt-in `frames: true` flag. When set (and batch ≤ 120 s), the server advances the engine 1 sim-second at a time instead of one `advance(secs)` call, snapshotting after each second: `[clock, ball.x, ball.y, possHome01, [[x, y, activityCode, active01] × roster]]`. Sampling is **read-only** — `engine.advance(1)` called N times is the engine's own supported stepping mode (run-vs-advance parity is a long-standing engine guarantee), and no engine state is written.
- **Renderer:** a single self-contained `AnimR` module in `web/touchline.html` drawing to one Canvas 2D element layered over the existing drawn pitch (`z-index:6`), using the already-validated P4 `liveScreen` mapping so pitch geometry is pixel-identical to the accepted boundary fix.
- **Why Canvas 2D, no framework:** 22 players + ball at 60 FPS is trivial for Canvas; DOM/SVG per-limb animation would mean hundreds of styled nodes restyled per frame. No game engine or library was added — the module is ~600 lines of vanilla JS. Total page weight grew ~7 KB gzip-equivalent.
- **Fallback preserved:** `?renderer=circles` restores the legacy marker renderer completely (used by the marker-DOM E2E tests).

## 2. Data contract

Advance request: `{seconds, frames?: bool}`. Response additions (only when `frames:true` and `seconds ≤ 120`):

- `frames`: array of `[clock_seconds, ball_x, ball_y, poss_home01, players]` per sim-second, `players` in fixed roster order as `[x, y, act_code, active01]`
- `roster`: player-id list defining that order (sent every response; renderer keys off it)
- `act_names`: activity-code vocabulary: `standing, walk, jog, high_speed_run, sprint, on_ball, on_ball_evade, carry, dribble_burst, dribble_partial, sent_off`

Events ride the existing `new_events` channel unchanged (PASS `actual_target`, CROSS `landing`, SHOT `outcome/shot_type`, DRIBBLE, TACKLE, FOUL, CARRY `dir` — all already in the ledger; the renderer only reads them). Coordinates are the engine's own 0–100 × 0–100 frame; no unit conversion server-side.

## 3. Files changed (complete list)

| File | Change |
|---|---|
| `server.py` (sha256 `c94810151751454f…`) | `_ACT_NAMES`/`_ACT_CODE` tables; `AdvanceRequest.frames: bool = False`; per-second sampling loop in advance endpoint; `frames`/`roster`/`act_names` in response |
| `web/touchline.html` (sha256 `b408478cf8ea75d0…`, 355,227 bytes) | `AnimR` module; canvas CSS + `.livepitch.anim` marker suppression; four hooks: `mergeMatchSnapshot` → `ingest`, `tick` → buffer gate + `frames` flag, `updateLivePitch` → early-return when anim on, `scheduleResync` → `AnimR.reset` |
| `tests_e2e.py` | Two legacy marker tests pinned to `?renderer=circles`; new `test_animated_renderer_live` |

**Nothing else.** `engine.py`, `calibration.py`, `players.json` byte-identical (item 13).

## 4. Animation states

Engine-authoritative activity (from `act_code`): standing, walk, jog, high-speed run, sprint, on-ball, on-ball-evade, carry, dribble-burst, dribble-partial, sent-off — these drive gait cadence and stride length. Event-driven overlays (cosmetic, timed, from ledger events): PASS, LONG_PASS kick poses; SHOT strike pose; GK DIVE (parried/blocked side) vs SET (caught); DRIBBLE BEAT/TAKE_ON burst; TACKLE lunge; FOUL stumble. Players are original simple vector footballers (shadow, animated legs, shorts, team-colored shirt, counter-phase arms, head, name label) — no copied assets of any kind; everything is drawn with Canvas path primitives written for this project.

## 5. Ball model

Independent object with two states. **CONTROLLED:** rides at the possessing player's feet with a facing-direction offset. **FLIGHT:** launched by ledger events (pass/cross/shot), linear interpolation from origin to the event's *actual* destination over `min(1.0, max(0.18, dist_m/22))` sim-s, with a parabolic height component (rendered as scale + shadow separation) for aerial classes (LONG/CROSS/THROUGH over 24 m). Every flight terminates at the engine's authoritative landing point. **Trajectory interface is a single function of (t, from, to, arcFlag) — a curved/spin model (Curve, deferred) can replace the interpolant later without touching anything else.**

## 6. Interpolation model

Playhead `head` advances at `PLAY_RATE = {1×: 6, 2×: 12, 4×: 24}` sim-s per real second — exactly the speeds the circle renderer implied (TICK_MS 400 / MATCH_SPEEDS), so match wall-clock duration is unchanged. Player positions linearly interpolate between bracketing keyframes; facing slerps with a turn-rate cap (7.2 rad/s, speed-scaled); gait phase integrates from interpolated speed. Events fire when the playhead crosses their timestamp.

## 7. Sync model

The playhead can never overrun truth: it is clamped to `bufferedUntil()`. Fetching is buffer-gated — `tick()` skips an advance while more than 1.5 batches are buffered, so the client stays ~1–2 s behind the authoritative clock and the engine is never asked to run ahead of what the user has watched. Pause freezes the playhead exactly (verified to the millisecond); speed changes only change `PLAY_RATE`. Batches > 120 s (season sim, E2E fast-forward) simply return no frames and the renderer waits for the next snapshot — with the gate disabled when the buffer is empty, so frame-less flows are unaffected.

## 8. Reconnect / restart behavior

Verified live by killing the staging server mid-match: the client entered `reconnecting`, the playhead froze (measured: zero drift while down — **no local simulation, ever**), and after server restart + MATCH_RECOVERED replay the session resumed at a monotonic clock (54 s → 72 s) with a fresh frame buffer. `scheduleResync` and backward-clock detection call `AnimR.reset(clock)` so recovery/restart snaps cleanly rather than interpolating across the gap.

## 9. Performance

Ordinary-laptop target met with headroom. Headed Chrome: **60–61 FPS at 1× and 4×**. Headless instrumented capture (vsync-capped at 30 there): mean frame time **33.31–33.33 ms with max 35.4 ms across 1×/2×/4×** — i.e. flat at the cap with zero jank spikes; render cost is far below budget. JS heap for the renderer: **~4 MB**; frame buffer self-trims (62 frames buffered mid-match). No framework, one canvas, no per-frame allocations of note.

## 10. Deterministic fixture results

Coverage was obtained two ways. (a) Scripted full matches exercising: kickoff, halftime pause → second-half resume, full-time (0–3 with all three goals rendered), pause-exact freeze, 1×/2×/4× coherence, disconnect → reconnect → restart recovery, corner sequences, GK distribution. (b) An instrumented half (applyEvent tally, ~45 sim-min) confirming every animation family fired and rendered: PASS SHORT 143 / LONG 108 / PROGRESSIVE 44 / AERIAL_LONG 16 / CUTBACK 3, CROSS 4, CARRY 378, DRIBBLE 20, TACKLE 11, FOUL 3, FREE_KICK 3, CLEARANCE 30, OFFSIDE 1, and **all five shot outcomes** (GOAL 1, MISS 4, BLOCKED 3, SAVED_CAUGHT 2, SAVED_PARRIED 1). Rendered positions stayed inside pitch bounds throughout (max |x| 100.5-clamped check passed); worst per-frame displacement 1.74 m occurred only at action bursts (see item 14) — no teleporting in open play.

## 11. App / E2E battery

**42/42 app tests pass** (tests_integration + tests_rc + tests_e2e + tests_e2e_rc; suite grew 41 → 42 with `test_animated_renderer_live`: canvas present, zero legacy markers in `#livePitch`, playhead advances, never overruns buffer, pause-exact). The two legacy marker tests now explicitly exercise the preserved `?renderer=circles` fallback. **100/100 core simulator tests pass.**

## 12. Neutrality proof (OFF / ON / debug)

- **Frames ON vs OFF, full interactive match, same seed:** identical ledger digest `91610b5516a188e05cb23f20`, identical score (3–0), identical stats. The sampling path consumes **no RNG** (it only reads state between the engine's own 1-s steps, and run-vs-advance parity holds by engine guarantee).
- **Renderer ON vs OFF vs `?debug=1`:** pure client-side drawing; the only request difference is the `frames` flag, proven neutral above. Debug overlays read renderer state only.
- **Cosmetic RNG:** none — `Math.random` appears **zero** times in the renderer; all cosmetic variation (gait phase, facing) is derived deterministically from authoritative positions.

## 13. Football freeze proof

Post-work hashes equal pre-work hashes exactly:

| File | sha256 (20) | blake2b (10) |
|---|---|---|
| `engine.py` | `587a2ec7ac1cb38f2f09` | `d669413469dc36f8c6ec` |
| `calibration.py` | `823bdbcab1e609bd1684` | `8e35540abe54f4bdbf4f` |
| `players.json` | `14bbe398203d9ba60106` | `fd9a1fd8086787cb161e` |

`CALIBRATION_VERSION` remains `v0.7-cal10`. The live RC6 server (port 8100, PID 90808) was never modified: health reports `0.1.0-rc6 / v0.7-cal10 / production`, and its `server.py`/`touchline.html` hashes (`6d5400e391653dc2…` / `155e5a85318b047a…`) differ from the staged files — confirming staging never leaked into production.

## 14. Known visual limitations (Milestone 1 scope)

1. **Action bursts read as sharp accelerations:** dribble-BEAT/carry displacements land inside one 1 Hz keyframe, so a 6–8 m gain renders as a fast lunge (worst measured 1.74 m/frame at 60 FPS). Faithful to the engine but could be softened with event-aware easing later.
2. **1 Hz keyframes:** micro-movement between seconds is linear; very sharp direction changes cut corners slightly.
3. Ball flights are straight (Curve deferred by design; interface ready — item 5).
4. GK dive side is inferred from outcome, not from an engine-authored dive vector.
5. No stadium, crowd, sound, replays, or broadcast camera (explicitly out of Milestone 1 scope); full-pitch camera only, as specified.
6. Throw-ins/goal kicks render as standard restarts without bespoke poses.

## 15. Screenshots & staging instructions

Screenshots (in `simulator/validation/renderer/`): `anim_1x.png` (1× live, debug panel, mini-footballers), `anim_flight.png` (aerial pass in flight), `anim_ft.png` (full-time state). To stage locally:

```
cd ~/Downloads/FC\ Simulator
APP_ENV=development PORT=8299 TOUCHLINE_DATA_DIR=data_rc_anim .venv/bin/python server.py
# browse http://localhost:8299         → animated renderer (default)
# http://localhost:8299/?debug=1       → + debug overlays (ids/auth/vel/anim/energy, click-to-select)
# http://localhost:8299/?renderer=circles → legacy fallback
```

The staging server used for validation has been stopped and its scratch data dir removed. The staged build is this working tree (`server.py` + `web/touchline.html`); deployment, when authorized, is the standard RC swap.

## 16. Deployment recommendation

**YES.** The renderer is neutrality-proven at the digest level, consumes no RNG, never simulates locally, survives pause/speed/halftime/FT/reconnect/restart, passes the full 42-test app battery and 100-test core suite, holds 60 FPS on ordinary hardware, and leaves every football byte identical to cal10/RC6. Recommended deployment shape: standard RC7 swap (backup DB + app dir first), with `?renderer=circles` as the in-field escape hatch requiring no rollback.
