# SWOS PHYSICS & MOVEMENT REFERENCE STUDY
Read-only architecture study for the Touchline physical presentation layer.
Date: 2026-08-25 · cal11/RC8/live/season untouched · no production code written.

## 1. Repositories inspected
| repo | commit | date | stack |
|---|---|---|---|
| github.com/angree/openswos | `e982e4c` | 2026-07-19 | Godot 4 + C#; match engine ~99% recreated per README |
| github.com/zlatkok/swos-port | `4fe94fd` | 2026-01-05 | C++/SDL port of PC-DOS SWOS via IDA-assisted reverse engineering |

## 2. License assessment
- **OpenSWOS: MIT** (LICENSE, © 2026 Grzegorz Korycki) covering *its original source only*; it ships **no** SWOS assets and requires the user's own Amiga disks. Its C# source — including the `Sim/` model layer and the `Sim/Port/` mechanical ports — is MIT text we may legally read, adapt, and even incorporate with attribution. Caveat: `Sim/Port/*` is a faithful translation of reverse-engineered behavior; the MIT grant covers the expression, but we treat it as **concept + constants reference** and write Touchline-native code regardless (cleaner and stylistically necessary anyway — it's goto-laden Q16.16 asm-shape code).
- **swos-port: NO license file, no grant** (checked repo root, README, docs). It contains `ida2asm` tooling and `swos/swos.asm` derived from the proprietary SWS.EXE. **Reference-only; incorporate nothing.**
- Original SWOS assets/sprites/audio: proprietary — untouched, unneeded.
- OpenSWOS cites exact swos-port/asm provenance per constant (e.g. `swos.asm:203952`), which is what makes this study auditable.

## 3. Relevant source-file map (OpenSWOS `game/scripts/`)
- `Sim/BallState.cs` (470 ln) — **the modern ball model**: struct + `BallSim.Tick` (possession/kick/dribble/bounce/friction) with sourced SWOS constants. The single most useful file.
- `Sim/PlayerState.cs` (235) — player struct, keeper state machine, `PlayerSpeedTable`.
- `Sim/Fixed.cs` — Q24.8 fixed-point. `Sim/KeeperSim.cs`, `Sim/AiSim.cs`.
- `Sim/Port/` (31,782 ln, 33 files) — faithful engine port: `BallUpdate.cs` (integrator/bounce/spin), `BallVariables.cs` (ball-trajectory *prediction* used by AI), `PlayerUpdate.cs`, `PlayerActions.cs` (kick logic), `PlayerTackle.cs`, `PlayerHeader.cs`, `PlayerControlled.cs` (pass-receipt control transfer), `Camera.cs`, `GameTime.cs` (match clock), `GameLoop.cs`, `SpriteUpdate.cs` (animation frame walker), `Kickoff.cs`, `SetPieces.cs`, `BallOutOfPlay.cs`, `Referee.cs`.

## 4. Player movement model
(`PlayerState.cs`, `Sim/Port/PlayerUpdate.cs`, `SpriteUpdate.cs`)
- **Coordinates:** integer-pixel world with Q24.8 (`Fixed`) sub-pixel positions; pitch ≈ 672 px wide, center (336, 449) (`Camera.cs` pitchConstants), goal-line-to-goal-line ≈ 640 px ⇒ **≈ 0.164 m/px**.
- **Update frequency:** one fixed simulation tick, 70 Hz PC (50 Hz Amiga). Everything — input, AI, physics, animation — advances on this single tick. No interpolation layer exists or is needed.
- **Velocity:** 8-way `Direction` facing × scalar speed. Speed table `PlayerSpeedTable.InProgress = {928…1250}` Q8.8 px/tick for skill 0-7 (≈3.6-4.9 px/tick), `MaxSpeed 1280`; PC mode multiplies all sprite XY deltas by **41/64** (`PcSpriteDeltaNum/Den`, from `updateSprite.cpp:323-328`) — effective ~2.3-3.1 px/tick ⇒ 160-220 px/s ⇒ **26-36 m/s equivalent… i.e. SWOS players "sprint" ~3-4× real humans** (see §15 — this is central).
- **Modifiers:** ball carrier ×224/256 (**87.5%**), run-back-after-goal ×160/256 (62.5%), human slide ×200/256, CPU slide ×128/256 (`PlayerSpeedTable`).
- **Acceleration/momentum:** essentially none — velocity snaps to direction×speed each tick; turning is instant to any of 8 facings. Readability survives because speeds are modest per-frame (≤3 px) and facing drives the sprite row. No inertia model to copy.
- **Stopping:** instant (input/AI releases direction). **Approach-to-ball:** AI steers using *predicted* ball ground intersections computed by `BallVariables.UpdateBallVariables` — a gravity-loop simulation of the ball forward in time writing `ballDefensiveX/Y/Z`, `ballNextGround*` for chase decisions. Players run to where the ball *will* land, which is why SWOS receptions look intentional.
- **Tackle:** slide = temporary state (`SlideTicks`), locked facing, speed multiplier, ball "punched" on contact (`SlidePunchPower 1792` + small loft 256); recovery = get-up animation timer.
- **Animation:** `SetNextPlayerFrame` (`SpriteUpdate.cs`, asm:102834-102971): per-direction frame streams; `cycleFramesTimer` gates stepping so cadence tracks movement; animation is a pure *view* of (facing, moving, state) — never an input to physics.

## 5-8. Ball physics model — the core prize
(`BallState.cs` `BallSim` + `Sim/Port/BallUpdate.cs`; constants traced to `swos.asm` lines)

**State: `x, y, z, vx, vy, vz`** in fixed-point. The ball is a *physical object at all times*; nothing ever "places" it except set-piece spot resets.

- **Height/gravity (§6):** `z += vz; vz -= Gravity` per tick. Gravity: PC 3291 Q16.16 → 13 Q24.8 (`amigaMode.cpp:37,55`; Amiga 4608→18). Kick loft `kBallKickingDeltaZ = 320` (Q24.8) ⇒ apex ≈ 11 px (~1.8 m equiv) in ~18 ticks — every ordinary kick has a *small* natural hop; high kick doubles it; headers use `kBallJumpHeaderDeltaZ 160`.
- **Bounce (§7):** on airborne→ground transition, *once per impact*: XY speed ×(256-speedBounceFactor)/256 and vz reflected ×bounceFactor/256, **per-pitch tables** (`kBallSpeedBounceFactorTable {24,80,80,72,64,40,32}`, `kBallBounceFactorTable {88,112,104,104,96,88,80}` for Frozen…Hard; `swos.asm:203822/203824`). "Sticky-ball" threshold 160 raw (0.625 px/tick): reflected vz below it → settle (kills micro-bounce loops). `|1` odd-bit trick prevents vz collapsing to exactly 0 (`ball.cpp:536`).
- **Roll/friction:** *linear scalar decay*, not exponential: speed -= constant per tick, direction preserved (`ApplyLinearFriction`): ground 13, air 4 (PC; `amigaMode.cpp:35-36,53-54`), plus per-pitch ground adjustment {-3…+4}. Linear decay ⇒ **closed-form range**: a kick at speed v travels ~v²/(2·μ) then stops — trivially invertible ("what speed reaches distance d?"), which SWOS's own `calculateNextBallPosition` uses (destX/destY + speed → deltas).
- **Kicks (§8):** impulse model. `kBallKickingSpeed 2208` (8.625 px/tick), `kNormalKickBallSpeed 2560`, `kHighKickBallSpeed 2688` (`swos.asm:203952-203961`); post-kick reduction cardinal ×0.75 / diagonal ×0.875 (game.txt:86); pass = power×9/8 with **zero loft** (flat), shot = power + loft, high shot = loft×2. Spin/curve **exists**: `ApplyBallAfterTouch` (ported ✅, `ball.cpp:2248-3005`) applies aftertouch curl to deltas — SWOS has curve; it's an input-driven delta adjustment during flight, cleanly separable (our Curve stays deferred).
- **Posts/net:** goal-post bounce section exists (`ball.cpp:91-180`, port TODO); shadow: `Section4_GoalDetectionAndShadow` — shadow at (x, y) ground with sprite chosen by z (§ ball height ⇒ separate shadow sprite offset — same principle as our anim2/3 shadow).

## 9-12. Ball-player interaction
(`BallSim.Tick` two-pass possession; `PlayerControlled.cs`)
- **Possession = emergent radius test every tick.** Keepers first (CatchRadius 24 px, may catch up to z<32); outfielders only when z<8 (grounded) within `InteractionRadius 8 px`. Closest wins.
- **Kicker exclusion:** after any kick the kicker can't re-possess for **12 ticks** (dribble-nudge: 14) — the mechanism that lets the ball *leave the foot* and prevents glue-back. This is SWOS's answer to "receiver instantly fires the ball onward": a new touch requires the ball to physically arrive in someone's radius, and the toucher can't double-touch instantly.
- **Receiving/trapping (§10):** there is no scripted "receive state" — control begins the tick the physical ball enters the radius grounded; the *travel time is real*, so reception timing is physically honest by construction. Control transfer on passes: `RunPassReceiptTrigger` swaps `team.controlledPlayer` to the receiver and snaps the receiver's dest to his own position (stop-and-take, `updatePlayers.cpp:8180-8252`).
- **Dribbling (§11):** while possessed without kick input, the ball is re-pinned **1 px in front of the facing** each tick (`kBallPlOffsets` unit vectors, `swos.asm:245818`; "ball is always about a pixel in front of player"), inheriting the carrier's velocity. Turning while dribbling triggers ball-control loss rolls (turn → 25% nudge; long dribble → 3%/tick after 4 ticks in OpenSWOS's interim model) — a nudge ejects the ball perpendicular ~1.5 px/tick with 14-tick re-possession lockout. Visual "touches" therefore *emerge* from control-loss + re-capture rather than from a cosmetic knock animation.
- **Tackles/loose balls (§12):** slide punches the ball as an impulse; loose balls are just the free-physics branch — everything chases the predicted landing point.

## 13. Camera model
(`Sim/Port/Camera.cs`, `camera.cpp:219-249`)
- Window: VGA 320×200 px on a 672-px-wide pitch ⇒ shows ≈ **52 m × 33 m** (about half the pitch length). Follow algorithm: dest = ball focus − half-window (plus velocity feed-forward), clamp to pitch limits, then **delta = (dest − current)/16 per tick, clamped to ±5 px/tick** — a simple slew-limited damped follow with no oscillation, no spring constants to tune. During long balls the velocity feed-forward leads the play; near goals the clamps naturally pin the view.
- Verdict vs our complaint: SWOS itself is *more* zoomed-in than the user wants (52 m vs our anim2's 44 m!). Its readability at that zoom comes from tiny sprites (~12-16 px ≈ 2-2.6 m) and slow, predictable camera motion. The user's Championship-Manager-breadth request (≈ 78 m, 18-19/22 visible — AnimR3's current broadcast camera) is *beyond* SWOS and already implemented; keep it, and adopt SWOS's `/16 ± clamp` slew instead of our stiffer spring.

## 14. Animation/state model
Sprite frame = f(direction row, cycle timer, special state). Special states (slide, dive high/low, catch, header) are short timers that override the walk cycle; `KeeperState` enum {Normal, CatchingBall(15-tick recovery), DivingHigh/Low(75-tick down-timer), Claimed(auto-kick at 150 ticks)}. Animation *never* drives physics. Identical philosophy to our A2 pose system — ours is already richer (14 poses vs SWOS's handful).

## 15. Timing model — the decisive finding
(`GameTime.cs`) The match clock is a **pure cosmetic accumulator**: each tick subtracts `kGameLenSecondsTable[gameLength] ∈ {30,18,12,9}` from an accumulator refilled at `kPcTicksPerGameSecond = 54` (the authentic SWS.EXE constant, `swos.asm:97838`); smaller table value = longer match. Physics NEVER changes with match length — **only the label**. A default SWOS match shows 90 minutes in a handful of real minutes while every kick, run and bounce runs at the one fixed physics rate.

And that physics rate is **not real-world speed**: players ~26-36 m/s-equivalent, kicked balls ~45-70 m/s-equivalent initial (decaying fast). SWOS "looks like normal football" because (a) *everything is consistently* ~2-4× real, (b) sprites are small relative to the view, (c) motion is continuous with zero teleports, (d) the eye calibrates to relative speeds, not absolute ones. **The user's Part E dilemma (90-min match in 5-10 min without fast-forward-looking football) is solved in SWOS not by nonlinear time compression but by a uniformly faster football at a scale where it reads as normal.**

## 16. Constants/units/timestep summary
70 Hz fixed tick (PC) · Q24.8 (modern layer) / Q16.16 (port) fixed-point, integer-only (`IntSqrt`) for lockstep determinism · pitch ≈ 672×640 px playable, 0.164 m/px · gravity 13 raw/tick² · ground friction 13/tick, air 4/tick (linear) · kick 2208-2688 raw · loft 320 · player speed 928-1280 raw ×41/64 · possession radius 8 px (keeper 24) · kicker exclusion 12-14 ticks · bounce tables per pitch · camera slew /16 clamp 5.

## 17. AnimR3 comparison (current architecture, per rforensic/ANIMR3_CHECKPOINT.md)
| subsystem | AnimR3 today | SWOS/OpenSWOS | classification |
|---|---|---|---|
| Authoritative alignment (compiled event segments, sim↔presentation map) | segment compiler, importance scaling, monotone sim mapping | **absent** (no authoritative macro layer exists — physics IS the game) | **KEEP ANIMR3** (this is our genuinely novel, necessary layer) |
| Feed/score/stats presentation sync | commits at playhead (−0.03 s measured) | n/a | **KEEP** |
| Determinism/neutrality plumbing (ingest, digest contract, no RNG) | proven | lockstep integer determinism (confirms approach) | **KEEP** |
| Broadcast camera breadth | 78 m, 18.5/22 visible | 52 m window | **KEEP breadth, ADAPT follow** to SWOS `/16 ±clamp` slew |
| **Ball motion** | scripted kinematic tweens per segment (+ known origin bug; residual teleports from holder-switch attachment) | continuous x,y,z + vx,vy,vz, gravity, linear friction, per-impact bounce, physics-only motion | **REIMPLEMENT USING REFERENCE PRINCIPLES** — the interpolation-token ball is the wrong abstraction |
| Kick model | duration = dist/speed tween | impulse (direction, power, loft) + closed-form linear-friction range | **REIMPLEMENT** (impulse solved to hit authoritative destination) |
| Possession/receive | segment-scripted holder + settle poses | radius capture + kicker exclusion + physical arrival gating | **REIMPLEMENT** (emergent receive; poses stay ours) |
| Dribble touches | cosmetic gait-knock offset | re-pin 1 px ahead + control-loss nudges | **ADAPT** (pin model; nudges only as cosmetic echo of authoritative DRIBBLE outcomes — never new outcomes) |
| Player locomotion | pursuit of authoritative interp, 8.3 m/s cap | direction×speed tick model, carrier 87.5%, ~2-4× real pace | **ADAPT** — keep pursuit-of-authority, raise the *style* pace (see §21) |
| Animation/poses | 14-state pose system, upright vector footballers | frame-stream walker | **KEEP ANIMR3** (ours is richer; SWOS confirms view-only philosophy) |
| Match clock | piecewise per-segment sim mapping | cosmetic accumulator | **KEEP** (ours must stay event-aware because our authoritative density is fixed; SWOS validates full decoupling) |
| Ball prediction for approach | none (players pursue recorded positions — fine) | `BallVariables` gravity-loop prediction | **NOT APPLICABLE** (authoritative frames already contain true future positions) |
| Aftertouch/curve | deferred | `ApplyBallAfterTouch` exists | NOT APPLICABLE now; good reference when Curve is authorized |

## 18. Reuse conceptually
The continuous physical ball (x,y,z,v, gravity 13-equivalent, linear friction, per-impact bounce with sticky threshold and odd-bit guard), impulse kicks with closed-form range solving, possession-radius capture with kicker exclusion, dribble re-pinning, per-pitch bounce/friction tables (future weather flavor), camera slew `/16 ±clamp`, cosmetic-clock decoupling, integer/fixed determinism discipline, prediction-driven approach *concept*.

## 19. Do NOT reuse
Anything from swos-port directly (no license). SWOS AI/decision logic, tactics, keeper decision machine, referee, stamina, skill scaling — cal11 owns all of that. The 8-direction facing quantization (our continuous facing is better). The asm-shape goto code style. Original assets.

## 20. What AnimR3 already does better
Authoritative-alignment compiler (SWOS never had to follow another engine); importance-aware time allocation; presentation-synced feed/score; goal/restart choreography scaffolding; richer pose vocabulary; broadcast-breadth camera; explicit neutrality contract and digest proofs; profile system.

## 21. Proposed Touchline Physical Presentation Architecture ("AnimR3-P")
```
TOUCHLINE AUTHORITATIVE ENGINE (cal11, frozen)
   ↓ 1 Hz frames + event ledger (existing transport, unchanged)
SEGMENT COMPILER (kept from AnimR3)
   – orders events, allocates sim-spans, importance, feed/score commits,
     goal holds, restart transitions, QUICK/STANDARD/EXTENDED profiles
   ↓ emits INTENTS, not positions:
     KICK(dir, power, loft | solved so physics lands at authoritative dest)
     POSSESS(pid) expectations · RESET(spot) · DUEL(zone)
PHYSICAL PRESENTATION BALL (new, SWOS-principled)
   – continuous x,y,z,vx,vy,vz at 60 Hz presentation ticks
   – gravity + linear friction + per-impact bounce + roll
   – possession radius + kicker exclusion; dribble re-pin to carrier
   – motion ONLY via physics ⇒ teleports impossible by construction
   – reconciliation: if the physics ball would miss the authoritative
     destination (compiler always solves impulses so it cannot, but guards
     drift), a bounded visible roll corrects — never a snap
PLAYER LOCOMOTION (kept: pursuit of authoritative interp)
   – style pace raised toward "Sensible pace": cap ~9.5-11 m/s presented,
     uniform across the match (consistency, not bursts)
   ↓
POSES / BALL SHADOW / 60 FPS CANVAS (kept from AnimR2/3)
BROADCAST CAMERA (kept 78 m; SWOS slew law)
```
Neutrality unchanged: presentation physics *shows* authoritative outcomes; a pass cal11 completed always completes (impulse solved to the recorded destination; the receiver's radius capture is cosmetically inevitable because both endpoints are authoritative).
**Timing consequence:** with Sensible-pace physics (ball initial ~28-45 m/s decaying, players ~1.5-2× real presented), routine beats shorten naturally and honestly: projected STANDARD ≈ **7.5-9 min**, QUICK ≈ 6-7, EXTENDED ≈ 12-14 — inside the user's bands *without* violating traceability, resolving the §15 checkpoint tension (AnimR3 at strictly real speeds measured 10.2-10.6 min).

## 22. Migration plan (when authorized — no code yet)
1. Fix the checkpointed flight-origin bug (one line) — needed regardless.
2. Add `PBall` (physical ball object ~150 lines) + impulse solver (closed-form under linear friction; lofted solves apex from loft class, time from range).
3. Compiler: replace flight/settle tween segments with kick-intent segments; segment duration = physics-derived arrival time (deterministic, computable at compile).
4. Possession/exclusion replaces holder scripting; poses unchanged.
5. Locomotion pace raise + camera slew swap.
6. Re-run the full rforensic battery (before/after), synthetic fixtures, digest matrix, app battery.
Estimated diff: ~400 lines changed in AnimR3, nothing outside the renderer.

## 23. Deterministic-neutrality proof strategy
Unchanged contract, same proofs as M2/M3: digest matrix (OFF/circles/anim1/anim2/anim3-P over fixed seed + batch patterns), profile identity (QUICK/STANDARD/EXTENDED same ledger), no `Math.random` (physics is integer/float-deterministic from ingested data; impulse solver is a pure function), replay rig on MW08 as regression. SWOS's own integer-lockstep discipline (`IntSqrt`, fixed-point, hash-not-Random dribble rolls) validates the approach.

## 24. Performance implications
Trivial: one ball integrator + 22 pursuit updates at 60 Hz — strictly less work than the current per-frame segment interpolation + authPos lookups (which remain). SWOS ran this on a 1993 Amiga at 50 Hz. AnimR3 currently measures 60-61 FPS at ~0.5 ms/frame; no regression expected.

## 25. Legal/license implications
OpenSWOS MIT permits concept + constant + (if desired) code reuse with license/attribution preservation; we will reimplement natively and credit OpenSWOS in a source comment. swos-port: no license ⇒ nothing copied; it was examined only through OpenSWOS's already-MIT-licensed citations of it in comments (we did not port from swos-port sources directly). No SWOS assets touched. Recommend adding a NOTICE line in touchline.html's renderer header: "ball-physics presentation principles informed by OpenSWOS (MIT, © Grzegorz Korycki)".

## 26. Smallest useful prototype
A single-page harness (offline rig, already built for the forensic) driving: one authoritative pass chain (5 events from the MW08 dataset) through compiler + PBall — verifying the impulse lands each ball at the authoritative destination within ±0.5 m and the receiver's capture precedes his next action. ~1 session of work; zero risk to anything live.

## 27. Recommendation
**ADAPT AnimR3 — partial rearchitecture of the ball layer only.** Not a rewrite, not continued pure-evolution. Evidence: every residual AnimR3 defect (origin bug class, holder-switch attachment slides, tween/physics tension, duration-vs-speed budget conflicts) is a symptom of the *interpolation-token ball*; SWOS demonstrates a ~150-line physical ball makes that entire defect class structurally impossible while ALSO resolving the match-length dilemma through consistent Sensible-pace physics. Everything else AnimR3 adds (authoritative alignment, importance timing, feed sync, cameras, poses, neutrality) has no SWOS counterpart and must be kept.

**"If we had studied these engines before building AnimR1-3, what would we have designed differently?"**
We would have built the presentation ball as a physical object with velocities and gravity from day one, and derived flights from kick impulses instead of tweens — AnimR1's event tweens, AnimR2's rate-modulated playhead, and AnimR3's kinematic segments were three successively better ways of animating a token that can be teleported, and each generation's worst bugs (missing flights, 82% invisible passes, launch-overrides-launch, origin-offset speed explosions, holder-switch slides) are all impossible for a ball that only moves by physics. We would also have known that "normal-looking football in 8 minutes" is achieved by uniform mildly-super-real pace at small scale — not by nonlinear time-warping real-speed football, which is what M2 attempted and M3 only partially escaped. The segment compiler, however, we would have built exactly as it is: it is the piece SWOS never needed and Touchline cannot live without.
