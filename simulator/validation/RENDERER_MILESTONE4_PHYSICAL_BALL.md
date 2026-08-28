# RENDERER MILESTONE 4 — PHYSICAL BALL (anim4) — staging only, NOT deployed

Date: 2026-08-25 · ADAPT milestone from SWOS_PHYSICS_MOVEMENT_REFERENCE_STUDY.md, authorized.
cal11 football byte-identical to checkpoint; live RC8 untouched; MW08 untouched.

## 1-2. Architecture & provenance
AnimR4 (?renderer=anim4) keeps AnimR3's authoritative-alignment layer (segment compiler,
importance timing, presentation-synced feed/score/clock, goal/restart choreography, poses,
78 m broadcast + tactical cameras, neutrality plumbing) and REPLACES the interpolation-token
ball with a continuous physical ball. Behavioral reference: OpenSWOS (MIT, (c) 2026 Grzegorz
Korycki, github.com/angree/openswos, Sim/BallState.cs) — concepts adapted (continuous x,y,z +
velocities, per-tick gravity, LINEAR ground/air speed decay, once-per-impact restitution
bounce with sticky-settle, possession radius + kicker exclusion, touches ahead of the
carrier); all code Touchline-native (metric units, 60 Hz), attribution in the module header.
No swos-port code (unlicensed), no SWOS assets. AnimR3 (?renderer=anim3), anim2, anim1 and
?renderer=circles all preserved as comparison/rollback modes.

## 3. Ball state
{x, y, z, vx, vy, vz, mode FREE|CTRL|DUEL, ctrl pid, kicker-exclusion (pid+time), flight
descriptor, per-flight effective gravity}. Constants: G 12 m/s2 (per-flight gEff for lofted
arcs), roll decel 6 m/s2 linear (brisk-flight surface x-scaled), air 1.0, restitution 0.55,
bounce keep 0.78, settle vz 1.1, control radius 1.0 m, capture z<=1.3 m, exclusion 0.45 s.
CENTRAL INVARIANT: position ONLY changes by v*dt integration; velocity ONLY changes by
gravity/friction/bounce and by kick/touch/nudge impulses. The single exception is the
authoritative restart family (kickoff/FK/corner/throw/goal-kick/post-goal), where placement
is itself the football event.

## 4. Kick/trajectory solver
Per authoritative action, `solveKick(origin, authoritative destination, family, brisk)`:
ground families solve initial speed under linear decel (closed-form, must reach destination:
v0 >= sqrt(2*mu*D)); lofted families (LOFT/CROSS/CLEAR/GKDIST) solve flight time from family
speed and a family apex (1.8/2.2/3.0/2.2 m) realized by per-flight effective gravity so the
parabola completes exactly at arrival. Families materially distinct: SHORT/DRIVEN/THROUGH/
CUTBACK/PROGRESSIVE(mapped)/LONG->LOFT/CROSS/CLEAR/SHOT(low fast+skim)/HEADER(airborne
strike)/GKDIST; FK/corners use spot placement + the kick of their recorded delivery. Runtime
kicks RE-solve from the actual physical ball position — origin continuity is absolute.
Curve-ready: lateral acceleration slots into the integrator without touching this interface.

## 5-6. Possession / dribble touches
Reception is physical: flight ends only when the ball reaches the destination radius (or the
overshoot failsafe) — a kick while any flight is airborne is structurally impossible
(instrumented: 0 occurrences in the full regression). The trap is a damping touch (velocity
blended toward the receiver, never zeroed). Carries never parent the ball: each touch is an
impulse knocking it ahead of the carrier (knock speed tracks carrier pace; re-touch cooldown
0.38-0.5 s; kicker exclusion prevents instant re-glue) — measured carrier-ball separation
oscillates 0.09-3.4 m. Duels/loose balls use small physical nudge impulses toward the
authoritative track (max 7-12 m/s) — no easing anywhere.

## 7. Height/shadow
z is real integrated state; ground shadow stays at (x,y) and separates/fades with z (drawing
shared with anim2/3). 249/249 long balls render arcs with z>1 m; 127/150 sampled short
passes stay under 0.6 m (the rest are contested/bouncing balls).

## 8. Clock & pacing (honest results)
Three clocks preserved (authoritative sim / presentation timeline / 60 FPS render). Match
clock accelerates via per-segment sim-mapping; physics runs at "Sensible pace" (study SS15):
routine ball ~40-60 m/s launch decaying, important balls slower, players capped 11 m/s
(12 during restart reorganization); plus a bounded 1.35x presentation rate ONLY on
low-information segments (links, brisk circulation, micro-carries) as sanctioned.
MEASURED on the MW08 regression (63 sim-min prefix, scaled to 90):
  QUICK ~10.9 min - STANDARD ~13.1 min - EXTENDED ~17 min.
The 7.5-9 min target is NOT met: with cal11's authoritative density (~40 on-ball events per
sim-minute — about twice real football) and every event physically rendered, ~11 min is the
readability floor. Options for the user: (a) accept QUICK (~11 min) as the practical mode;
(b) authorize elision of low-information events (violates the current "never skip" rule, so
it needs explicit sign-off); (c) accept a higher bounded local rate (1.6-1.8x) on routine
circulation. No further speed increases are honest — deliberately not "optimized to the
threshold" per instruction.

## 9. Camera
Broadcast ~78-79 m view (mean 17 of 22 players visible, min 9) with the SWOS slew law
((dest-current)/16 per tick, clamped, with ball-velocity feed-forward); tactical full-pitch
toggle preserved.

## 10-13. Quantitative gates (MW08 regression, 36,144 frames)
| gate | anim2 (before) | anim4 (after) |
|---|---|---|
| teleport-class ball jumps (>3 m/frame, ex-restart) | 529 (94/min, worst 81.7 m) | **0** (worst frame 1.57 m, clean rig) |
| displacement explainable by integrated velocity | no (token) | **yes — physics-only by construction** |
| passes with visible flight | 18% | **93%** (rest are <3 m taps, still >=0.18 s) |
| kick fired while ball airborne | frequent (launch-overrides-launch) | **0** (instrumented) |
| aerial balls with z-arc + shadow | n/a | **100%** (249/249) |
| goals watchable | 0.5-0.8 s @23-33x | **5.9 s / 8.0 s** with strike->flight->net |
| consecutive actions <0.35 s | 35% | 20% (med gap 0.68 s) |
| player speeds (moving med/p90/p99) | 7.9/13.5/256 m/s | 8.5/12.2/15.1 (>14: 5.1%, capped pursuit) |
| feed sync | spoils by 3.0 s | synced at playhead |
| camera | 6.8/22 @44 m | 17/22 @79 m |
Reception ordering, pause exactness ([playhead, ball] frozen), 2x/4x (2.2/4.3 at 60-61 FPS),
refresh-reconnect, real staging-server kill/recovery (ball continuous — physics state is
client-side): all verified live. Action families covered from the regression ledger: SHORT
321, LOFT 249, CROSS 16, CLEAR 20, THROUGH 6, DRIVEN 3, CUTBACK 1, SHOT 6, HEADER 4,
GKDIST 5, plus dribbles/tackles/duels/recoveries/corners/FKs/kickoffs/goal restarts.
Penalties: none occurred in the regression (untested family — known limitation).

## 14. Performance
60-61 FPS; frame cost ~0.5 ms average (physics adds negligible work).

## 15-16. Neutrality & football proofs
UI fixed-seed digest: anim2 vs anim4 -> seed 794424809, digest 2a51873e639f2c0e27975b0f,
score 1-2 — IDENTICAL. (Renderer/batch invariance for all modes previously proven 6-way at
RC8: 35e95791fa6d8f38fdfa23c3.) Zero Math.random in AnimR4 (comment-only mention). App
battery **44/44** (new test_anim4_physical_ball_live asserts physics-integrity, buffer
discipline, pause exactness). engine.py / calibration.py / players.json byte-identical (cmp)
to cal11-checkpoint-20260824. Live RC8 verified untouched; anim4 exists only in the working
tree + staging.

## 17. Known limitations
1. STANDARD pacing ~13 min vs the 7.5-9 target (see SS8 options — the milestone's headline
   tradeoff, left for the user's decision).
2. Strikers may stand ~1-2 m from the ball when a routine strike fires (strike beats are
   3-14 ms; the kick launches from the BALL, so continuity holds, but the pose can read
   detached on quick exchanges).
3. Brisk flights read fast (~55-80 m/s apparent under the local rate) — traceable at the
   79 m camera but noticeably "arcade"; slowing them is a pacing tradeoff.
4. Penalty family unexercised; throw-ins render as generic restarts.
5. During long buffer waits (waitBall ~12-16 s per match total) players idle briefly at
   segment boundaries while a flight completes.

## 18. Personal test instructions
Staging server RUNNING: http://localhost:8299 (APP_ENV=development, data_rc_anim4 — live RC8
at :8100/ngrok untouched).
- **http://localhost:8299/?renderer=anim4** — the physical-ball renderer (STANDARD, ~13 min match)
- `&len=quick` (~11 min) - `&len=extended` (~17 min)
- `&debug=1` — panel shows ball x,y,z - v(xy),vz - mode/flight family - controller - segment -
  presentation clock vs sim clock - buffer - fps; checkbox toggles broadcast/tactical camera;
  length selector
- `&cam=tactical` — full-pitch camera
- Comparison modes: `?renderer=anim3` (M3), `?renderer=anim2` (deployed default), `?renderer=anim1`, `?renderer=circles`
- Restart later: `cd ~/Downloads/FC\ Simulator && APP_ENV=development PORT=8299 TOUCHLINE_DATA_DIR=data_rc_anim4 .venv/bin/python server.py`
Screenshots: simulator/validation/renderer/anim4_broadcast.png, anim4_aerial.png.

NOT deployed. No Curve. cal11 frozen. Awaiting the user's watch verdict.
