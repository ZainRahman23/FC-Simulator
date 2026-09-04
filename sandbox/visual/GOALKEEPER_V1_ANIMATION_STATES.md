# Goalkeeper V1 — Animation State Specification (spec only, no art)

Status: **specification for future sprite/animation authoring**. No keeper art exists or is to be
created yet (mechanics were approved first; the art is authored only after this spec is reviewed).
Everything below is derived from the live playtest keeper in `sandbox/visual/match.js`
(Stage 3 interception + Stage 4 contact quality). The mechanics are authoritative: animation is a
**read-only view of keeper state** — it never steers the keeper, never moves the ball, never decides a
save. Timing, phases and outcomes come from the simulation; the artist draws what the simulation says.

## 1. Visual identity (locked direction)
| item | spec |
|------|------|
| kit | **neon-green** keeper jersey (long sleeve), clearly distinct from both outfield kits |
| shorts / socks / boots | **dark** (near-black) shorts, dark socks, dark boots |
| gloves | **white** gloves — the hands must read at 1× zoom (the save surface is the hands) |
| canvas / registration | same contract as the outfield art: 140×140, player centre x=70, feet on ground anchor row 117, ball composited separately, no ball painted into any frame, static grid (no baked root bob) |
| facing | 8 world directions (E/NE/N/NW/W/SW/S/SE) — the keeper faces the **ball**, not the goal; W is the engine mirror of E as for outfield art |
| scale | authored at the outfield `pscale` (0.60 at 2× calibration); K1 reference height 1.83 m — taller/shorter bands are drawn by the engine's height scale, not separate art |

## 2. State machine (what the animation controller reads)
The keeper exposes `gk.state` (pre-shot) and `gk.phase` (post-shot) plus a contact record. Frame
selection reads these in order; nothing else.

```
PRE-SHOT (ball in play, no shot yet)
  SET        ── stance, ready position; feet still, weight forward, hands at handZ (0.78 × height)
  TRACKING   ── lateral/depth shuffle to the Q2.5 desired position (aperture bisector, P4 depth)

POST-SHOT (rising edge of the kick impulse → gk.shotActive)
  READ       ── reaction latency (K1: ≈0.24 s); NO translation; eyes/head track the ball
  PREPARE    ── ONE deliberate step (≤ 1.0 m) toward the read interception; weight transfers
  COMMIT     ── the dive/reach is launched (target frozen; no re-aim)
  SAVE       ── ballistic dive in progress: hand travels body → committed target over execTime
CONTACT (swept anatomy TOI reached one volume)
  CONTACT    ── Stage-4 outcome applied: CATCH / CONTROLLED PARRY / WEAK PARRY / FINGERTIP /
                BODY BLOCK / FOOT SAVE / LEG SAVE (each may carry "(through)" or "DEFLECTION")
  CATCH      ── ball keeper-owned (b.held = "GK"); ball rides the hands; no distribution yet
NO CONTACT
  (dive completes; ball passes) ── the keeper stays in the end pose of the dive until reset
```

Phase transitions are **deterministic and one-way** per shot: READ → PREPARE → COMMIT → SAVE →
(CONTACT | miss). There is no chase, no second dive, no re-aim. The same shot always produces the
same phase timeline (60 Hz, no RNG), so animation timing can be exact.

## 3. Animation clips required (per facing where noted)
| clip | trigger | duration (from mechanics) | notes |
|------|---------|---------------------------|-------|
| **idle_set** | `state=SET` | loop | ready stance, slight knee bend, gloves up at chest/hand height |
| **shuffle_L / shuffle_R** | `state=TRACKING`, lateral velocity | loop, speed-scaled | side steps, never crossing feet; face the ball |
| **step_fwd / step_back** | `state=TRACKING` depth motion | loop | short adjustments only (keeper depth is Q2.5) |
| **read** | `phase=READ` | 0.15–0.30 s (K1 0.236 s) | freeze + weight drop, head/eyes to ball; NO foot travel |
| **prep_step_{L,R}** | `phase=PREPARE` | until COMMIT (typically 0.1–0.3 s) | one lateral/forward step toward `gk.prepTarget`; direction from `prepTarget − setPos` |
| **dive_low_{L,R}** | `phase=COMMIT/SAVE`, tier LOW-DIVE (target z < 0.75 m) | execTime 0.28 s × reachFrac | lead leg extends (FOOT/LEG save volume) — the near foot/shin reaches beyond the hand for ground balls |
| **dive_mid_{L,R}** | tier MEDIUM-DIVE (0.75 ≤ z < 1.5 m) | 0.34 s × reachFrac | body horizontal, both hands lead |
| **dive_high_{L,R}** | tier HIGH/FULL-STRETCH (z ≥ 1.5 m) | 0.42 s × reachFrac | full extension, top hand leads |
| **reach_standing** | tier STANDING REACHABLE | 0.12 s | no dive: arm(s) extend, body set (used for central balls at the body) |
| **stretch_fingertip** | tier FINGERTIP-LIMIT / best-effort UNREACHABLE | 0.44 s | maximal extension toward the target; visibly falls short on unreachable balls (never "stretched" to reach) |
| **catch_hold** | `contact.outcome=CATCH` | hold until reset | ball glued to gloves at `gk.handNow`; body collapses onto the ball for dives, chest gather for central catches (`via:"chest"`) |
| **parry_strong** | CONTROLLED PARRY | 0.2 s follow-through | palm pushes ball to the safe side (away from the mouth centre, ≤ 35° tilt) |
| **parry_weak** | WEAK PARRY | 0.2 s | unset wrist gives; ball spills nearby ("(through)" ⇒ ball continued goalward) |
| **fingertip_flick** | FINGERTIP | 0.15 s | hand's edge/fingers only; small deflection; ball often continues |
| **body_block** | BODY BLOCK / BODY DEFLECTION | 0.2 s | ball into chest/ribs; keeper braces |
| **foot_save / leg_save** | FOOT SAVE / LEG SAVE (and DEFLECTION variants) | 0.2 s | ball off boot/shin during a low dive or standing |
| **land_recover_{L,R}** | after dive end (u = 1) | 0.4–0.6 s | get up from the dive; no gameplay effect (V1 keeper does not chase) |

`reachFrac = max(0.30, min(1, envNorm))` — a short reflex reach animates faster than a full stretch;
the engine already scales `execTime` this way, so clips must be time-scalable (play at rate
1/reachFrac), not fixed-length.

## 4. Anchors the art must expose (for the read-only binding)
| anchor | source in mechanics | why |
|--------|---------------------|-----|
| root (feet) | `gk.x, gk.y` | sprite ground anchor (row 117) |
| hand (reaching) | `gk.handNow` (3-D, per tick) | ball attaches here on CATCH; parries originate here |
| torso centre | `gk.bodyNow`, z = hip..shoulder band (0.50–0.82 × height) | BODY contacts |
| lead-leg tip | `gk.legTipNow` (low dives only) | FOOT/LEG contacts; the tip stays ≤ 0.20 m high |
| facing | `gk.facing` (toward the ball) | frame set selection (8 directions) |

The hand anchor drawn in each dive frame must trace the same body→target path the engine uses
(smoothstep over execTime): the engine's `handNow` is what touches the ball, so the visible glove must
be at the engine's hand position at the contact tick. Mismatch here is the single biggest visual
risk ("the ball hit his shoulder but the save was called HANDS").

## 5. Contact-frame pause and review hooks
The playtest exposes: `V` pause-at-contact, `.` step-frame, `,` slow-motion, `M` resume, HUD outcome
line (surface, outcome, reach norm, alignment, palm offset, relative speed, two-hand factor, balance,
height/trajectory factors). The animation review harness (future) should reuse these so a frame can be
judged against the mechanics at the exact contact tick.

## 6. Not in scope of V1 animation
Distribution/throw after a catch (the ball stays held), a second reaction after a parry (no chase),
goal-kick / ball in hand, collision with outfield players, and any art for K2/K3 (bands differ in
reach and timing only — same clips, engine-scaled).
