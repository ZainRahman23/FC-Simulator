# CONTINUOUS FOOTBALL RUNTIME — REFERENCE STUDY & WORLD CONTRACT
Workstream: Touchline Continuous Football Runtime, phase 1-2 (study + contract).
Date: 2026-08-25. Written BEFORE implementation, as mandated.
Reference: OpenSWOS (MIT, © 2026 Grzegorz Korycki, github.com/angree/openswos, commit e982e4c) —
see also simulator/validation/SWOS_PHYSICS_MOVEMENT_REFERENCE_STUDY.md for the file-level audit.
swos-port (no license) informs understanding only; zero code/values taken from it directly.

## 1. Reference principles → ADOPT / ADAPT / REJECT / DEFER

| principle | reference behavior (source) | verdict | Touchline-native decision |
|---|---|---|---|
| world coordinates | integer px, ~0.164 m/px, pitch 672×~640 px | **B ADAPT** | metric meters, pitch 105×68, origin top-left corner |
| simulation tick | fixed 70 Hz (PC) / 50 Hz, everything on one tick | **B ADAPT** | fixed 60 Hz deterministic accumulator; render reads latest state |
| locomotion | velocity = 8-way direction × skill speed, no inertia (`PlayerSim.Tick`) | **B ADAPT** | continuous heading; acceleration/deceleration limits; inertia added (SWOS has none — modern requirement) |
| accel/decel | none (instant) | **C REJECT** | accel ~4.8 m/s² fwd, ~6.5 brake, sprint ramp ≈2 s |
| turning/facing | facing snaps to 8-way | **C REJECT** | continuous facing with speed-dependent slew (≈5 rad/s walking → 1.6 rad/s sprinting) |
| carrier speed penalty | ×0.875 with ball (`PlayerSpeedTable.BallCarrierMul`) | **A ADOPT** | ×0.875 |
| run-back after goal ×0.625 | (`RunbackMul`) | **A ADOPT** | used in restart choreography |
| ball state x,y,z + vx,vy,vz | Q16.16/Q24.8 fixed point | **A ADOPT** (floats + fixed tick are deterministic in one runtime) | continuous z is REAL state |
| gravity per tick | PC 3291 Q16.16 ≈ heavier-than-real | **B ADAPT** | real g = 9.81 m/s² (this milestone prizes physical credibility over arcade snap) |
| linear friction (speed −= c per tick; ground 13 / air 4) | `BallSim.ApplyLinearFriction` | **A ADOPT** | linear decel: rolling 4.2 m/s², airborne 0.8 (closed-form invertible for the kick solver) |
| per-impact bounce: vz reflect ×factor, XY keep, per-pitch tables | ball.cpp:494-550 | **A ADOPT** (single surface now) | restitution 0.55, XY keep 0.80; pitch tables **D DEFER** |
| sticky-settle threshold + `|1` guard | ball.cpp:536-550 | **A ADOPT** | settle when reflected vz < 1.0 m/s |
| kick = impulse (2208/2560/2688 raw; pass flat ×9/8; high ×2 loft; cardinal/diagonal damping) | `BallSim.Tick` kick branch | **B ADAPT** | family-based impulse solver in m/s (§3); no 8-way quantization so no diagonal correction needed |
| aftertouch spin/curve | `ApplyBallAfterTouch` | **D DEFER** | flight solver takes an (unused) lateral-acceleration slot |
| possession = radius test each tick, keepers first | `BallSim.Tick` two-pass | **A ADOPT** | control radius 0.9 m outfield; GK hands 1.6 m; z-gated |
| kicker exclusion 12-14 ticks | `BallState.KickerExclusion*` | **A ADOPT** | 0.45 s — the mechanism that lets the ball leave the foot |
| dribble = re-pin 1 px ahead each tick | `kBallPlOffsets` | **B ADAPT** | REJECT pinning; ADOPT "ball ahead of feet" as repeated physical touch impulses (mandate §6) |
| dribble control-loss on turning | BallSim interim model | **B ADAPT** | physically emergent: big touch + limited turn rate = ball gets away; no probability rolls in the sandbox |
| loose balls / interception | free-physics branch + radius capture | **A ADOPT** | any body meeting the ball contacts it physically |
| tackle = slide state, locked facing, ball punched 1792 | `PlayerTackle`, `SlidePunch` | **B ADAPT** | standing poke-tackle first (contact window + ball impulse); slide **D DEFER** |
| collisions/separation | minimal (sprite overlap allowed) | **B ADAPT** | soft radial separation between bodies (0.55 m radius) so duels have physical presence |
| keeper: dive states, catch radius, hold, auto-release 150 ticks | `KeeperSim`, `PlayerState.KeeperState` | **B ADAPT** | primitive GK: position on arc, collect ≤1.6 m, lunge burst for near shots, catch vs parry by ball speed; full state machine **D DEFER** |
| ball out of play detection: touchline/goal-line with corner-vs-throw bands | `BallOutOfPlay.cs` | **A ADOPT** | geometric out-of-play → restart state machine |
| set-piece game states (goal-out L/R, corners L/R, FK zones, keeper-holds) | `SetPieces.cs` states 0-12 | **B ADAPT** | explicit RestartManager states: KICKOFF, THROW_IN, CORNER, GOAL_KICK, FREE_KICK, GOAL_AFTERMATH→RESET→KICKOFF |
| post-goal: players run back to initial positions (state 0) | ST_PLAYERS_TO_INITIAL_POSITIONS | **A ADOPT** | physical run-back at ×0.625 pace; kickoff only when both teams set |
| camera: dest−half-window, Δ=(dest−cur)/16, clamp 5 px/tick, velocity feed-forward | `Camera.cs` | **A ADOPT** (law) / **B ADAPT** (framing) | slew law adopted; framing WIDER than SWOS's 52 m — broadcast ≈ 76-84 m for 16-22 visible players |
| match clock = cosmetic accumulator (N game-s per tick), physics constant | `GameTime.cs` | **A ADOPT** (separation) / **D DEFER** (compression values) | three clocks kept separate; world-clock credibility wins this milestone; compression decided later |
| physical pacing: uniformly ~2-4× real speeds | speed tables ×41/64 @70 Hz | **C REJECT for this milestone** | mandate: believable REAL speeds at 1×; measure honest duration instead |
| deterministic integer lockstep, no System.Random | `Fixed.cs`, hash-based rolls | **A ADOPT** (principle) | fixed timestep, float determinism within one runtime, seeded mulberry32 for test-AI tie-breaks only |
| SWOS AI / skill semantics / referee / stats | AiBrain/SkillScaling/Referee | **C REJECT** | Touchline brain arrives later; sandbox uses disposable primitive AI |

## 2. The Touchline Continuous-World Contract (per 1/60 s tick)

**BALL** `{x, y, z, vx, vy, vz, state: ROLLING|AIRBORNE|DEAD, lastTouch: pid, controller: pid|null}`
- `pos(t+dt) = pos(t) + vel·dt` — always. Velocity changes only via: gravity (z), linear friction, bounce
  (once per ground impact), and **contact impulses** (kick, touch, deflection, tackle-poke, GK hand).
- Controller is DERIVED: the player whose repeated touches currently manage the ball — never an
  ownership token. Spin: slot reserved, not populated.
- Sanctioned direct placement ONLY inside RestartManager dead-ball states: kickoff spot, throw-in
  point, corner arc, goal-kick spot, free-kick spot, penalty spot. Each placement logs its reason.

**PLAYER** `{x, y, vx, vy, facing, target/intent, locoState: IDLE|WALK|JOG|RUN|SPRINT|TURN|RECOVER,
contactState: NONE|CARRY|DUEL|KICK_WINDUP, team, testAI role state}`
- Movement only through the locomotion controller (accel/brake/turn limits). No coordinate writes
  outside restart choreography (which itself moves bodies by locomotion, not teleports).

**WORLD** `{tick, worldClock, matchClock (separate), restartState, possession (derived from last
controller's team), pitch geometry 105×68 with goals 7.32×2.44, boundary rules}`

**Central invariant**: the ball may not teleport; automated continuity tests sample every physics
frame and fail on any displacement not explained by integrated velocity or a logged restart placement.

## 3. Kick vocabulary (physical setup → contact → impulse → world evolution)
| family | launch model (real-speed) |
|---|---|
| short pass | ground, v₀ = clamp(2μD)½+2 … 17 m/s |
| driven pass | ground, 20-24 m/s |
| long ground pass | 24-27 m/s |
| lofted pass | projectile: T = D/13 (0.9-2.6 s), vz = gT/2 (real 9.81) |
| through ball | ground 18-22 m/s aimed at space |
| cross | projectile T = D/15, apex ~3-5 m |
| cutback | ground 12-16 m/s |
| shot | 24-31 m/s, low rise ≤ 1.4 m |
| clearance | projectile, high apex 6-10 m |
| header | impulse at contact z (1.6-2.3 m), modest speed |
| GK distribution | punt projectile / throw roll |
Every kick requires: actor within contact radius, wind-up time (0.25-0.45 s), then the impulse.

## 4. Module architecture
`World` (tick orchestrator) · `BallPhysics` · `PlayerBody`+`Locomotion` · `BallInteraction`
(control/touch/deflect/intercept) · `KickSolver` · `DuelSolver` (take-on/tackle geometry) ·
`RestartManager` (state machines §9 of the mandate) · `TestAI` (disposable) · `Scenarios` (24 deterministic
labs) · `Presentation` (canvas, broadcast/tactical camera, HUD) — one isolated file set under `sandbox/`,
zero imports from production.

## 5. Future brain/body interface (designed-for, NOT implemented)
The runtime exposes exactly one inbound surface: `issueIntent(pid, intent)` where intent ∈
{MOVE_TO(space), PASS(target|space, family), SHOOT(family), CARRY(corridor), TAKE_ON(side),
TACKLE(target), PRESS(target), HOLD(shape-point)} — the same vocabulary the primitive test AI uses.
cal11's Attack/Defense Roles+Efforts, formations, action choice, attributes, stamina, seeded
probability mathematics would later map onto this surface WITHOUT the runtime knowing about them:
the brain stays the sole football authority; the body resolves physics. Nothing of cal11 is
rewritten, referenced, or imported in this milestone.
