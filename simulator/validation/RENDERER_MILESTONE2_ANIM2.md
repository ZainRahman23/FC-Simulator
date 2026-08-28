# RENDERER MILESTONE 2 — anim2 PROTOTYPE (staging only, NOT deployed)

Date: 2026-08-24 · Football frozen at v0.7-cal10 (byte-verified) · Live RC7 untouched (its
touchline.html hash `b408478cf8ea75d0…` predates anim2; anim2 exists only in the working tree).

## The time-model (Parts I/J/K — the core of this milestone)

Three fully separated clocks:

1. **Authoritative simulation clock** — unchanged; the engine's 1 Hz frames + full event ledger
   stream in via the existing RC7 `frames:true` transport. Zero server changes for M2.
2. **Presentation timeline** — a deterministic scheduler consumes buffered sim-time at a variable
   rate `r(t)`: each sim-second gets an interest score from its events (SHOT/GOAL/PENALTY 10,
   DRIBBLE 8, BOX_ENTRY 8, CROSS/CORNER 7, TACKLE 7, through/cutback passes 8, transitions 4,
   circulation 1.5) plus ball-zone (final third ≥3, box ≥6). High interest → r≈2 (readable,
   near-human pacing); quiet circulation → r up to 40. A deficit-proportional controller keeps the
   total on the target length without ever skipping events. **Ball-flight sync**: while a pass/shot
   is visually in flight, the sim clock holds just past the launch event until the flight is 50%
   home — receivers can never act before the ball arrives. Match lengths: QUICK ~5 min /
   **STANDARD ~7.5-8 min (measured: first half 4.0 min)** / EXTENDED ~10 min (`?len=` or debug
   selector).
3. **~60 FPS render clock** — measured 60-61 FPS with **0.43-0.47 ms average frame time (max 4.8 ms)**;
   2× and 4× user speeds scale the presentation clock exactly (measured 2.0/4.0) at 61 FPS.

**Players are never fast-forwarded.** Each rendered player *pursues* the authoritative
interpolated position under a hard human speed ceiling (9.2 m/s, catch-up capped at 14 m/s),
with smoothing that filters 1 Hz jitter into continuous purposeful runs; gait cadence derives
from *presentation* velocity, so movement always looks like walking/jogging/running/sprinting
while the match clock runs ~12× real time. Positions anchor exactly at authoritative events;
a >25 m discontinuity (restart/half) snaps once instead of sprinting across the pitch.

## Visual system (Parts L-R — original, no copied assets)

- **Players**: upright 3/4-view vector footballers drawn with Canvas paths — head with hair
  (deterministic per-player shade), two-tone shirt with sleeve band, shorts, socked legs with
  boots, counter-swinging arms, screen-space run cycle, left/right facing mirror + speed lean.
  States: IDLE/JOG/RUN/SPRINT/TURN(-lean)/RECEIVE/PASS (backswing→strike→follow-through)/
  SHOT (more forceful)/DRIBBLE/TAKE-ON burst/TACKLE lunge/RECOVERY (beaten stumble)/GK dive
  (side chosen from authoritative shot geometry)/SHIELD.
- **Ball**: independent presentation object with `x, y` on authoritative geometry and **cosmetic
  z** — never fed anywhere near simulation. Flight profiles per authoritative action: ground/
  driven/lofted/through/cross/cutback/clearance/shot/GK distribution, each with its own apex and
  pace; landings reconcile exactly to the authoritative destination, then bounce (damped, for
  high arcs) and roll toward the next authoritative state. **Ground shadow** stays at the ground
  point and separates/fades as z rises — height is instantly readable.
- **Touches (Part R)**: the ball is never glued — carriers knock it ahead each stride (sprint ~1.5 m,
  jog ~0.55 m, close control ~0.3 m, rhythm from the gait cycle) and catch up to it.
- **Camera (Part S)**: GAMEPLAY (default) — ~44 m view, spring-damped tracking of ball + flight
  lead, clamped to pitch; TACTICAL — full pitch. Toggle in the ?debug=1 panel or `?cam=tactical`.
  Camera is pure view transform; anim2 draws its own stylized pitch (striped grass, full line set).

## Modes preserved (Part V)

`?renderer=circles` (legacy markers) · `?renderer=anim1` / default (Milestone 1, unchanged —
still what RC7 serves in production) · `?renderer=anim2` (this prototype, staging only).

## Validation (Part W)

- **Neutrality, API level**: same seed/start-request via full-run vs 6 s-frames vs 18 s-frames vs
  12 s-no-frames batches → **identical digest `81e30582075d9edbfe5574b9`** (batch pattern is
  anim2's only server-visible difference).
- **Neutrality, UI level**: fixed season seed played through the real UI under anim1, anim2
  STANDARD, anim2 QUICK → same match seed 399158595, **identical digest
  `0982b35bcb9b6e0103f7e43e`, identical score 1-2**. Length modes are pure client pacing.
- **No RNG**: zero `Math.random` in anim2 (cosmetic variation via FNV hash of player ids);
  frame rate/camera/z/shadow/animation/buffering touch no request and no simulation state.
- **Pause** freezes the presentation head exactly; halftime and FT *drain* the already-
  authoritative buffer (never simulate); **refresh-reconnect** resumes paused with a fresh buffer;
  **real server kill/restart** → reconnecting (drains buffer, holds, zero local simulation) →
  MATCH_RECOVERED replay → monotonic resume. All verified headless.
- **App battery: 43/43** (new `test_anim2_prototype_live` covers canvas, marker suppression,
  buffer discipline, sim/presentation decoupling, pause exactness). Core suite untouched.
- **Football freeze**: engine/calibration/players sha256 `587a2ec7ac1cb38f2f09` /
  `823bdbcab1e609bd1684` / `14bbe398203d9ba60106` — identical to the frozen cal10 checkpoint.

## Known prototype limitations

1. STANDARD measures ~8 min (steady 11.5 sim-s/s vs the ideal 12; startup ramp costs ~30 s).
2. When the engine reaches FT/halftime ahead of the presentation, the header panel updates while
   the timeline finishes playing out the buffered action beneath it (an "…and the whistle has
   gone" tail). A presentation-aware header clock is a Milestone-3 nicety.
3. Duelling players can overlap name labels; poses are readable but simple; no throw-in/corner
   bespoke staging yet.
4. Take-ons render the authoritative truth — which (per Live Case #7) means the beaten defender
   really does return in ~4 s. That is the football defect C2, not a renderer defect.

## Personal test instructions (staging — the acceptance gate)

The staging server is RUNNING: `http://localhost:8299` (PID in /tmp/anim2srv.pid, disposable
data dir `data_rc_anim2`, APP_ENV=development — the live RC7 at :8100/ngrok is untouched).

- **`http://localhost:8299/?renderer=anim2`** — the Milestone-2 prototype, STANDARD (~7.5-8 min match)
- `…&len=quick` (~5 min) · `…&len=extended` (~10 min)
- `…&debug=1` — pacing readout (sim/presentation clocks, rate, interest, buffer, fps), camera toggle, length selector
- `…&cam=tactical` — full-pitch camera
- `http://localhost:8299/?renderer=anim1` — Milestone 1 for comparison · `?renderer=circles` — legacy
- Restart it later with: `cd ~/Downloads/FC\ Simulator && APP_ENV=development PORT=8299 TOUCHLINE_DATA_DIR=data_rc_anim2 .venv/bin/python server.py`

Screenshots in `simulator/validation/renderer/`: `anim2_v2.png` (gameplay camera, upright
footballers), `anim2_aerial.png` (airborne ball + separated shadow), `anim2_takeon.png` (duel
poses), `anim2_kick.png`, `anim2_tactical.png`.

**NOT deployed. anim1 remains the live default. Awaiting your personal test verdict.**
