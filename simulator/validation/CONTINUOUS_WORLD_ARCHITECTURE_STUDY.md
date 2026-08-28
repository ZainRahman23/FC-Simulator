# CONTINUOUS-WORLD ARCHITECTURE STUDY (Architecture B prototype)
Date: 2026-08-25 · Isolated prototype (`prototype/continuous_world.html`, served :8301).
cal11/RC8/live/save untouched; nothing deployed; this is an architecture decision input, not a migration.

## 1. What OpenSWOS does each simulation tick (per-tick reference, auditable)
One fixed tick (70 Hz PC / 50 Hz Amiga) advances EVERYTHING — there is no simulation/presentation split:
1. **Input/AI** picks an 8-way direction + action per player (`AiSim/AiBrain`, `InputControls`).
2. **Player movement** (`PlayerState.PlayerSim.Tick`): velocity = direction × effectiveSpeed — **no acceleration model**; facing snaps to the 8-way direction; diagonal ×181/256; PC delta damping ×41/64; speed = skill table 928-1250 Q8.8 (×0.875 carrying, ×0.625 run-back, slide multipliers); slide = 34-tick locked-facing state.
3. **Ball possession** (`BallSim.Tick`): two-pass radius test — keepers first (24 px, z<32), outfielders (8 px, z<8); **kicker exclusion 12-14 ticks** lets the ball leave the foot; the closest eligible player takes control.
4. **Controlled ball**: kick → impulse (2208/2560/2688 raw, ±loft 320, cardinal ×0.75 / diagonal ×0.875) — or dribble → ball re-pinned 1 px ahead of facing (`kBallPlOffsets`), turn/time-based control-loss nudges.
5. **Free ball physics**: `x+=vx, y+=vy, z+=vz, vz-=13`; **linear** speed decay (ground 13, air 4, ± pitch table); once-per-impact bounce (XY keep (256-f)/256, vz reflect ×f/256 per pitch; sticky-settle 160; `|1` guard); goal-post section; shadow from z.
6. **Tackles/collisions** (`PlayerTackle`): slide contact punches ball (1792 impulse); fouls/cards by referee module.
7. **Camera** (`Camera.cs`): dest = focus − half-window (+velocity feed-forward), clamp, **delta = (dest−current)/16, |delta| ≤ 5 px/tick**.
8. **Animation** (`SpriteUpdate.SetNextPlayerFrame`): frame stream per direction, cycle timer from speed — pure view.
Clean generic concepts for a continuous execution layer: fixed-tick world; radius possession + kicker exclusion; impulse kicks; independent z-ball with linear friction + restitution; touch-ahead dribbling; slew camera. SWOS-specific and NOT generic: 8-way facing, no inertia, its AI/skill semantics.

## 2. The adapter (cal11 → continuous world) as prototyped
cal11 remains 100% of the football intelligence. Its recorded stream is read as **intentions**:
`(actor, action family, intended target [PASS d.intended], authoritative outcome + endpoint)`.
The world (60 Hz fixed tick, deterministic, zero RNG):
- **Players** = physical controllers: accel 5.5 / decel 7.5 m/s², vmax 8.4 (burst 10.6), steering-based turning; off-ball waypoints = cal11's own structural positions at the schedule cursor (cal11's tactical shape IS its movement intention).
- **Intention preconditions are physical**: an on-ball action cannot execute until the actor is in contact radius of a controllable ball; receptions happen when the ball physically arrives; the scheduler waits, never fabricates.
- **Kicks** = impulses toward cal11's *intended* target at real family speeds (short 15, driven 21, shot 27 m/s; lofted solved with real g=9.81 hang time), then **bounded guidance** (≤4.5 m/s² lateral) converges the flight to cal11's *actual* endpoint — the "steering budget" is measured, not hidden.
- **Take-ons**: BEAT = attacker burst window + defender physical stun-then-chase → separation emerges and persists **naturally**.
- **Restarts** = sanctioned placements; post-goal reorganization happens at real running speed.

## 3. Prototype results (MW08 data: Gakpo-goal window 96-170 s; Salah-BEAT window 1130-1230 s)
| measurement | Segment A | Segment B |
|---|---|---|
| intents executed physically | 32/32 | 50/50 |
| ball teleports (>3 m/frame) | **0** | **0** |
| player speeds (moving med / p95) | **3.3 / 8.4 m/s** — genuine walk-jog-sprint mix | 3.1 / 8.4 |
| player accel p95 | 7.5 m/s² (visible accelerate/decelerate) | — |
| ball speed med / p95 | 8.5 / 25.1 m/s (real football) | — |
| guidance to realize cal11 outcomes | **2.07 m/s per pass** (cap 4.5 m/s²) | 3.29 |
| Gakpo goal | ball physically crosses the line (world 55.1 s), net hold | — |
| take-on separation after BEAT | — | 3.3 m → 4.9 m @0.5 s → held ~4.8 m through defender recovery → grows with the breaking play (natural persistence, no scripting) |
| **schedule ratio (football-s per world-s)** | **0.63×** | **0.59×** |

**The decisive number is the last row.** Executing cal11's schedule physically at real speeds runs ~1.6-1.7× SLOWER than cal11's own clock: a full 90-minute cal11 match ≈ **140-150 minutes of continuous world time**, before any presentation compression. Why: cal11 emits ~40 on-ball events per sim-minute (≈2× real football) and resolves each instantaneously — approach, wind-up, travel and control time exist nowhere in its timeline, but a physical world must pay them.

## 4. The honest conflicts (not disguised)
1. **Outcome-before-execution.** cal11 samples pass/duel outcomes at decision time; a physical world must then *realize* a decided future. The prototype shows the steering cost is small and bounded (≈2-3 m/s of velocity correction per pass) — but it is a real "invisible hand", and interceptions land where the ledger says, not where the physical geometry that instant would say. Architecture B can hide this well; it cannot eliminate it. Only C (outcomes resolved inside the continuous tick) eliminates it — at the price of changing the football engine.
2. **Event density/pacing.** The 8-12-minute-match requirement + real-speed physics + cal11's density are mutually exclusive — measured now from BOTH directions (AnimR4: 13-min floor at ~2× ball pace; prototype B: 0.6× ratio at 1× pace). The three levers, unchanged: faster-than-real uniform physics (the actual SWOS approach, §SS15 of the SWOS study), event elision, or **reducing cal11's decision density** — the last one is an engine change (a "presentation-density" decision cadence, cal12-class work), and it is the only lever that preserves both real speeds and full causal visibility.
3. **Determinism.** No conflict: the world is a pure function of the intention stream at a fixed tick (zero RNG); cal11's seeded ledger remains the authority. Under C, determinism would have to move into the continuous tick loop (SWOS proves this is achievable — integer lockstep), but every existing digest, save, and replay contract would break.

## 5. Architecture comparison
| criterion | A: AnimR4 (segments + physical ball) | B: cal11 brain + continuous world | C: full continuous sim with Touchline intelligence in-loop |
|---|---|---|---|
| football realism on screen | good ball, but players are pursuit-driven puppets of 1 Hz anchors; reads as reconstruction (user's own verdict) | **prototype-proven: real locomotion, physical contests, natural take-on separation** | best possible (physics = truth) |
| determinism/reproducibility | proven, digest-neutral | preserved (pure function of ledger) | achievable (SWOS lockstep) but ALL existing digests/saves/replay contracts break |
| attributes/tactics causal | fully (cal11 decides everything) | fully (cal11 decides everything) | requires re-porting cal5-cal11 calibration into per-tick logic — months, high regression risk |
| outcome fidelity to cal11 | exact by construction | exact, via bounded steering (measured 2-3 m/s per pass) | diverges by design (new engine = new outcomes; cal11 acceptance history invalidated) |
| renderer quality ceiling | medium (segment seams remain) | high | highest |
| match duration at honest speeds | ~13 min (at ~2× ball pace) | ~140 min at 1×; needs same levers | free choice (engine owns its density) |
| dev complexity from today | done | ~2-4 weeks to production quality (adapter hardening, keeper/aerial detail, feed/UI integration) | ~3-6 months engine rewrite + full recalibration |
| compatibility (saves/server/RC8) | full | full (renderer-side; same transport + ledger) | breaking (new engine version, new validation universe) |
| long-term extensibility | limited (fighting the abstraction) | good; and it is the natural stepping stone to C | maximal |

## 6. Recommendation
**Adopt Architecture B as the renderer architecture** — the prototype demonstrates it delivers exactly the "football being continuously played" quality the user found missing, with zero teleports, preserved determinism and full cal11 authority — **and pair it with an engine-side follow-up (cal12-class, separately authorized) that adds an intention-cadence/density mode**, because the measured numbers prove no renderer-side trick can reconcile real-speed physics, full event coverage and 8-12-minute matches while cal11 emits ~2× real football's event density with zero execution time. Interim pacing for B (until such an engine mode exists): the SWOS approach — uniform mildly-super-real physics (~1.5-2×) — measured to bring matches to roughly 12-15 minutes, or event elision under an explicit user-approved policy. Architecture C is the correct end-state *only if* Touchline ever wants physics-resolved outcomes; it should not be attempted as one step — B is on its path and de-risks it.

## 7. Artifacts
Prototype: `prototype/continuous_world.html` + `proto_data.json` (server: `python3 -m http.server 8301` in `prototype/`, currently running — **http://localhost:8301/continuous_world.html**; segment selector, Restart, Pause; HUD shows world clock vs match clock, compression, ball state, guidance, teleports).
Screenshots: `simulator/validation/renderer/proto_buildup.png`, `proto_goal.png`, `proto_segB.png`.
License provenance: physics/possession concepts from OpenSWOS (MIT, © 2026 Grzegorz Korycki) — attribution in the prototype header; all code original; nothing from unlicensed swos-port; no SWOS assets.
