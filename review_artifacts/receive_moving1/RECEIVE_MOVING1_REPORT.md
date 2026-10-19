# RECEIVE-MOVING-1 — receiving while moving (QUEUE #2)

**Status: presented for review — NOT frozen (RECEIVE-V1 is not frozen).** The owner's instruction is saved verbatim in `sources/`. Built as its own phase on QUEUE #1's
integrated pipeline (RECEIVE-CONTROL-2), whose stationary receives it leaves bit-identical.

I cannot play video in real time: the visual checks here come from stills taken from the clips.

Review page (local only): `review/RECEIVE_MOVING1_REVIEW.html` · lab: `sandbox/visual/receive_moving1.html` · code: `sandbox/visual/receive_moving1/`.

## What was found first
A first exploratory run on the integrated pipeline, with RECEIVE-CONTROL-1.1's pass solver, made moving receives look like universal braking: sprinters braked hard
into straight receives. Most of that was the TEST. For a 7.8 m/s runner that solver often finds no lead, so the ball arrives behind him and he has to brake.
That exploratory run is not kept as evidence. The movement matrix uses passes weighted for the runner (`rm1_cases.js`: solved through the ball kernel to arrive at
his projected position at the named speed). With those passes, RECEIVE-CONTROL-2 already kept 0.94 of the
pace on a 0° receive (median).
The real problems were elsewhere:
- large turns at speed found no action (the planner required the body to shed the turn's speed before the contact): MISSED 66 of 504;
- many moving receives were lost at the DRIBBLE-V1 takeover: TAKEN 59;
- the approach left its speed correction to the last 0.8 s.

A first redesign of the speed law (curve-then-cut) was TRIED and REJECTED: it lowered both CLEAN and the pace
(CLEAN 331/504; kept off behind `RM.curveCut`).

## 1. Moving-receive architecture
`ReceiveSimM` (`rm1_core.js`) extends QUEUE #1's `ReceiveSim2`. Standing receives are RECEIVE-CONTROL-2's (bit-identical, §20). A moving receiver's action is
RECEIVE-CONTROL-1.1's moving vocabulary (touch into stride, open-body turn, through-stance turn) planned by its planner (RECEIVE-CONTROL-1.1's methods copied, the
changes marked) and executed by the unified Ball Control model (RECEIVE-CONTROL-2). RECEIVE-MOVING-1 changes:
- **late redirect** — a moving receiver may take the ball before his body has shed the turn's speed: ball-touch capability and body momentum redirection are separate;
  the turn's cost is paid AFTER the contact by the action's exit path (its duration ≥ the velocity change / 9 m/s², the overrun, the plant, the new line);
- **the moving handoff** — TURN-1.2 takes the body at the action's handoff touchdown; DRIBBLE-V1 takes the ball at the **takeover window**: when the ball is on the
  runner's line, its takeover distance ahead (± 0.6 m), within 0.25 m of the line and not running away (≥ 0.3 s, ≤ 1.6 s after TURN-1.2 took the body); meanwhile
  the run-out steers onto the ball's actual line (≤ 20°); the first touch is solved for that moment (the runner modelled up to the requested pace);
- **velocity-first interception** — the meeting that keeps the run's velocity, not the earliest;
- **into space** — a standing receiver whose pass runs beyond the stationary receive's reach runs onto it with the moving actions.

## 2. Player-motion inputs
The receiver's position, velocity (speed and heading), facing and stride phase (TURN-1.2's legs: the foot that just landed, the stride period at his speed); the
desired exit direction and pace; the free ball's prediction. Movement groups (RUN-1 / TURN-1.2 speeds): STAND 0, WALK 1.5, JOG 3.0, RUN 5.5, SPRINT 7.8, ALL-OUT 9.5 —
test groups of one continuous model (no per-speed system).

## 3. Stride-aware contact
An action starts at a TURN-1.2 touchdown; its footwork is fitted from that stride (RECEIVE-CONTROL-1.1's planSteps: the stride interval at his speed, the support
foot's plant 0.05 – 0.24 s before the contact, the contact foot's swing). The contact foot is one of the family's feet whose swing fits the contact tick without an
instant swap — strides are lengthened / shortened within 0.17 – 0.50 s to fit it.

## 4. Preparation
From the strike, the APPROACH steers to the meeting and follows its speed need: RECEIVE-MOVING-1's `RM.prepBand = 0`. RECEIVE-CONTROL-1.1 kept the pace whenever
the need was within ±6 %, which left the whole correction to the last 0.8 s. A / B on the owner's cases (`evidence/rm1_prepband_ab.json`):

| case (BC 99, seeds 1 – 3) | speed kept · step 1 (±6 % band) | speed kept · final |
|---|---|---|
| A RL_0_SPRINT_NORMAL | 0.90 / 0.91 / 0.88 | 0.95 / 0.95 / 0.94 |
| B L_30_RUN_NORMAL | 0.78 / 0.80 / 0.81 | 0.83 / 0.84 / 0.81 |
| C L_60_RUN_NORMAL | 0.71 / 0.74 / 0.75 | 0.79 / 0.80 / 0.75 |
| D L_90_RUN_NORMAL | 0.51 / 0.57 / 0.57 | 0.53 / 0.62 / 0.57 |
| E L_120_RUN_NORMAL | 0.36 / 0.45 / 0.42 | 0.36 / 0.44 / 0.42 |
| F F_180R_SPRINT_NORMAL | 0.01 / 0.03 / 0.14 | 0.01 / 0.03 / 0.14 |
| A′ RL_0_SPRINT_NORMAL_IS | 1.00 / 1.00 / 1.00 | 1.00 / 1.00 / 1.00 |
| B′ L_30_RUN_NORMAL_IS | 0.97 / 0.93 / 0.93 | 0.91 / 0.92 / 0.93 |
| C′ L_60_RUN_NORMAL_IS | 0.87 / 0.87 / 0.87 | 0.86 / 0.86 / 0.87 |
| jog RL_0_JOG_NORMAL | 0.92 / 0.93 / 0.98 | 0.92 / 0.93 / 0.98 |
| sprint RL_90_SPRINT_NORMAL | 0.49 / 0.53 / 0.53 | 0.52 / 0.54 / 0.54 |

The matrix medians barely move (0° 0.94 → 0.95, 30° 0.94 → 0.94; moving CLEAN 427 → 426). The gain is where the dip was deepest: passes aimed at the
body that need a late check. A pass into his stride needs no correction, and B′ seed 1 keeps slightly less (0.97 → 0.91).

The ACTION is planned once the meeting is within 1.05 s (the preparation window: the contact 0.26 – 1.17 s after the action starts, at a TURN-1.2 touchdown); a
standing receiver plans it from the strike. There is no teleport: the body path to the contact is a bounded-acceleration curve (≤ 9.5 m/s² for a moving receiver,
≤ 620°/s rotation). Too little preparation time rejects an action (`prep-accel`, `rot-prep`, `too-late`). Its cost shows in the speed dip before the contact: the
later the correction, the deeper the dip.

## 5. Touch into stride
The ideal first touch sends the ball to where the runner will be: on his line, HANDOFF_AHEAD(speed) in front of him when DRIBBLE-V1 takes it (1.2 m at 2.5 m/s …
2.4 m at 9.5 m/s) — a sprinter's first touch goes further than a jogger's.

Case A (a sprinter at 7.8 m/s, pass from behind-left): 7.8 → 7.38 m/s at the contact → 7.8 by +0.5 s. The pass is aimed at his
body, and the stride touch meets the ball 0.42 m ahead of him, so he gives up 0.42 m: a small check. A′, the same pass played into his stride (0.42 m ahead of his body):
7.80 m/s at the contact, with no check.

## 6. – 9. Angled receives, moving half-turn, outside-of-foot turn, through-stance turn
The moving actions used (all receives of the movement matrix): STRIDE inside 194, THROUGH_TURN inside 94, THROUGH_TURN sole 57, OPEN_TURN laces 53, OPEN_TURN outside 42, OPEN_TURN inside 34, STRIDE outside 14. The moving outside-of-foot turn is the open-body turn played with the outside of the near
foot (its preferred surface); the moving through-stance turn plays the far foot's inside across or behind the standing leg.

## 10. Momentum redirection
Before the contact, the contact speed is the timing solution (the minimum-acceleration path to the meeting), bounded per action:
- a touch into stride: between 0.45 × the run speed and the run speed + 1 m/s, capped by TURN-1's angle–speed law × 1.25. Braking is scored, so the planner prefers a
  contact tick that keeps the pace;
- a turning action: at up to the run speed (the late redirect), or braking toward TURN-1's entry speed in the last second where the score finds that cheaper.

After the contact comes the turn's real cost: the exit path from the contact velocity to the exit line (≤ 9 m/s² mean, ≤ 620°/s), i.e. the overrun, the plant
and the new line. The momentum profile: the median of the minimum speed / the speed before. The speed-kept rows are PAIRED, i.e. the same runs, CLEAN in both pipelines. An unpaired
comparison would mislead: RECEIVE-CONTROL-2's clean runs are mostly the small turns, because it failed the large ones.

| turn ° | 0 | 30 | 60 | 90 | 120 | 150 | 180 |
|---|---|---|---|---|---|---|---|
| CLEAN · RECEIVE-MOVING-1 | 70/72 | 67/72 | 56/72 | 60/72 | 58/72 | 50/72 | 65/72 |
| CLEAN · RECEIVE-CONTROL-2 | 67/72 | 68/72 | 42/72 | 50/72 | 48/72 | 42/72 | 48/72 |
| speed kept · RECEIVE-MOVING-1 (paired) | 0.96 | 0.95 | 0.83 | 0.57 | 0.40 | 0.23 | 0.15 |
| speed kept · RECEIVE-CONTROL-2 (paired) | 0.95 | 0.94 | 0.81 | 0.46 | 0.31 | 0.15 | 0.05 |
| paired runs (CLEAN in both) | 65 | 64 | 38 | 46 | 43 | 31 | 46 |

## 11. Sprint receive · 12. Sprint 180° reversal
| case | | action | outcome (BC 50 – 99, seeds 1 – 3) | v before | v min | v contact | +0.25 | +0.50 | +1.00 | heading | ball distance +0.5 s | stable (s after contact) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A | RL_0_SPRINT_NORMAL | STRIDE INSIDE | CLEAN 13 · TAKEN 2 | 7.80 | 7.38 | 7.38 | 7.66 | 7.80 | 8.24 | 0° → 0° | 1.66 | 1.72 |
| B | L_30_RUN_NORMAL | STRIDE INSIDE | CLEAN 14 · TAKEN 1 | 5.50 | 4.55 | 4.55 | 5.03 | 5.50 | 5.50 | 0° → 30° | 1.63 | 1.55 |
| C | L_60_RUN_NORMAL | STRIDE INSIDE | CLEAN 15 | 5.50 | 4.32 | 4.34 | 4.60 | 5.34 | 5.50 | 0° → 60° | 1.75 | 1.55 |
| D | L_90_RUN_NORMAL | OPEN_TURN INSIDE | CLEAN 14 · TAKEN 1 | 5.50 | 2.92 | 4.27 | 3.03 | 3.27 | 4.18 | 0° → 90° | 2.88 | 1.79 |
| E | L_120_RUN_NORMAL | THROUGH_TURN SOLE | TAKEN 5 · CLEAN 8 · RECEIVED 2 | 5.50 | 1.98 | 5.15 | 3.28 | 1.98 | 3.45 | 0° → 120° | 3.23 | 2.07 |
| F | F_180R_SPRINT_NORMAL | THROUGH_TURN INSIDE | TAKEN 2 · CLEAN 13 | 7.80 | 0.09 | 3.14 | 1.00 | 1.16 | 2.80 | 0° → 179.5° | 2.84 | 1.84 |
| G | RL_0_SPRINT_FIRM | STRIDE INSIDE | TAKEN 1 · CLEAN 2 | 7.80 | 7.38 | 7.38 | 7.71 | 7.80 | 7.75 | 0° → -10.16° | 1.35 | — |
| H | RL_0_SPRINT_FIRM | STRIDE INSIDE | CLEAN 3 | 7.80 | 7.38 | 7.38 | 7.67 | 7.80 | 8.23 | 0° → 0° | 1.64 | 1.72 |
| A′ | RL_0_SPRINT_NORMAL_IS | STRIDE INSIDE | TAKEN 2 · CLEAN 13 | 7.80 | 7.80 | 7.80 | 7.80 | 7.80 | 8.24 | 0° → 0° | 1.62 | 1.73 |
| B′ | L_30_RUN_NORMAL_IS | STRIDE INSIDE | CLEAN 14 · TAKEN 1 | 5.50 | 5.02 | 5.02 | 5.22 | 5.50 | 5.50 | 0° → 30° | 1.58 | 1.55 |
| C′ | L_60_RUN_NORMAL_IS | STRIDE INSIDE | CLEAN 14 · TAKEN 1 | 5.50 | 4.75 | 4.82 | 4.89 | 5.50 | 5.50 | 0° → 60° | 1.67 | 1.54 |
| jog | RL_0_JOG_NORMAL | STRIDE INSIDE | CLEAN 15 | 3.00 | 2.76 | 2.77 | 3.30 | 3.77 | 5.10 | 0° → 0.12° | 1.98 | 1.60 |
| sprint | RL_90_SPRINT_NORMAL | THROUGH_TURN INSIDE | CLEAN 8 · TAKEN 4 · RECEIVED 3 | 7.80 | 4.02 | 7.50 | 5.54 | 4.02 | 3.99 | 0° → 90° | 3.02 | 2.03 |
| standing | RL_0_STAND_NORMAL | HALF_TURN INSIDE | CLEAN 15 | 0.00 | 0.00 | 0.00 | 0.64 | 1.89 | 3.20 | 0° → 0° | 0.69 | 2.00 |

A full reversal at a sprint (F): the contact at speed, then the overrun — the ball behind him, his speed falls to near zero before he can go the other way: the
original velocity cannot be preserved.

## 13. Ball Control while moving · 14. BC 50 / 70 / 80 / 90 / 99
Ball Control never enters the plan: the body's run before the contact is identical at every rating (36/36 case × seed sets). It changes the touch:

| case | BC 50 | BC 70 | BC 80 | BC 90 | BC 99 |
|---|---|---|---|---|---|
| RL_0_SPRINT_NORMAL | CLE 3 · |dir| 1.73° · |speed| 0.20 m/s · v@contact 7.38 | TAK 1 CLE 2 · |dir| 1.29° · |speed| 0.15 m/s · v@contact 7.38 | TAK 1 CLE 2 · |dir| 0.98° · |speed| 0.11 m/s · v@contact 7.38 | CLE 3 · |dir| 0.55° · |speed| 0.06 m/s · v@contact 7.38 | CLE 3 · |dir| 0.18° · |speed| 0.02 m/s · v@contact 7.38 |
| L_30_RUN_NORMAL | CLE 2 TAK 1 · |dir| 3.47° · |speed| 0.34 m/s · v@contact 4.55 | CLE 3 · |dir| 2.60° · |speed| 0.25 m/s · v@contact 4.55 | CLE 3 · |dir| 1.98° · |speed| 0.19 m/s · v@contact 4.55 | CLE 3 · |dir| 1.09° · |speed| 0.10 m/s · v@contact 4.55 | CLE 3 · |dir| 0.34° · |speed| 0.03 m/s · v@contact 4.55 |
| L_60_RUN_NORMAL | CLE 3 · |dir| 3.43° · |speed| 0.41 m/s · v@contact 4.34 | CLE 3 · |dir| 2.57° · |speed| 0.30 m/s · v@contact 4.34 | CLE 3 · |dir| 1.97° · |speed| 0.22 m/s · v@contact 4.34 | CLE 3 · |dir| 1.09° · |speed| 0.12 m/s · v@contact 4.34 | CLE 3 · |dir| 0.34° · |speed| 0.04 m/s · v@contact 4.34 |
| L_90_RUN_NORMAL | CLE 3 · |dir| 5.38° · |speed| 0.65 m/s · v@contact 4.27 | CLE 3 · |dir| 4.06° · |speed| 0.47 m/s · v@contact 4.27 | CLE 2 TAK 1 · |dir| 3.11° · |speed| 0.35 m/s · v@contact 4.27 | CLE 3 · |dir| 1.72° · |speed| 0.19 m/s · v@contact 4.27 | CLE 3 · |dir| 0.51° · |speed| 0.05 m/s · v@contact 4.27 |
| L_120_RUN_NORMAL | TAK 2 REC 1 · |dir| 9.20° · |speed| 1.06 m/s · v@contact 5.10 | TAK 1 REC 1 CLE 1 · |dir| 7.03° · |speed| 0.76 m/s · v@contact 5.10 | CLE 1 TAK 2 · |dir| 5.43° · |speed| 0.57 m/s · v@contact 5.10 | CLE 3 · |dir| 3.02° · |speed| 0.30 m/s · v@contact 5.10 | CLE 3 · |dir| 0.85° · |speed| 0.08 m/s · v@contact 5.10 |
| F_180R_SPRINT_NORMAL | TAK 1 CLE 2 · |dir| 11.83° · |speed| 1.11 m/s · v@contact 3.14 | CLE 3 · |dir| 8.96° · |speed| 0.79 m/s · v@contact 3.14 | CLE 2 TAK 1 · |dir| 6.88° · |speed| 0.58 m/s · v@contact 3.14 | CLE 3 · |dir| 3.81° · |speed| 0.30 m/s · v@contact 3.14 | CLE 3 · |dir| 1.12° · |speed| 0.08 m/s · v@contact 3.14 |
| RL_0_SPRINT_NORMAL_IS | TAK 1 CLE 2 · |dir| 1.69° · |speed| 0.18 m/s · v@contact 7.80 | TAK 1 CLE 2 · |dir| 1.26° · |speed| 0.14 m/s · v@contact 7.80 | CLE 3 · |dir| 0.96° · |speed| 0.10 m/s · v@contact 7.80 | CLE 3 · |dir| 0.54° · |speed| 0.06 m/s · v@contact 7.80 | CLE 3 · |dir| 0.18° · |speed| 0.02 m/s · v@contact 7.80 |
| L_30_RUN_NORMAL_IS | CLE 2 TAK 1 · |dir| 3.47° · |speed| 0.33 m/s · v@contact 5.06 | CLE 3 · |dir| 2.59° · |speed| 0.24 m/s · v@contact 5.06 | CLE 3 · |dir| 1.97° · |speed| 0.18 m/s · v@contact 5.06 | CLE 3 · |dir| 1.09° · |speed| 0.10 m/s · v@contact 5.06 | CLE 3 · |dir| 0.33° · |speed| 0.03 m/s · v@contact 5.06 |
| L_60_RUN_NORMAL_IS | CLE 2 TAK 1 · |dir| 3.30° · |speed| 0.39 m/s · v@contact 4.80 | CLE 3 · |dir| 2.48° · |speed| 0.29 m/s · v@contact 4.80 | CLE 3 · |dir| 1.89° · |speed| 0.21 m/s · v@contact 4.80 | CLE 3 · |dir| 1.05° · |speed| 0.12 m/s · v@contact 4.80 | CLE 3 · |dir| 0.33° · |speed| 0.04 m/s · v@contact 4.80 |
| RL_0_JOG_NORMAL | CLE 3 · |dir| 6.62° · |speed| 0.35 m/s · v@contact 2.93 | CLE 3 · |dir| 4.95° · |speed| 0.25 m/s · v@contact 2.93 | CLE 3 · |dir| 3.78° · |speed| 0.19 m/s · v@contact 2.93 | CLE 3 · |dir| 2.10° · |speed| 0.10 m/s · v@contact 2.93 | CLE 3 · |dir| 0.66° · |speed| 0.03 m/s · v@contact 2.93 |
| RL_90_SPRINT_NORMAL | CLE 1 TAK 1 REC 1 · |dir| 3.53° · |speed| 0.34 m/s · v@contact 7.50 | TAK 2 REC 1 · |dir| 2.65° · |speed| 0.25 m/s · v@contact 7.50 | CLE 2 REC 1 · |dir| 2.03° · |speed| 0.19 m/s · v@contact 7.50 | CLE 2 TAK 1 · |dir| 1.13° · |speed| 0.10 m/s · v@contact 7.50 | CLE 3 · |dir| 0.36° · |speed| 0.03 m/s · v@contact 7.50 |
| RL_0_STAND_NORMAL | CLE 3 · |dir| 9.97° · |speed| 0.40 m/s · v@contact 0.00 | CLE 3 · |dir| 7.70° · |speed| 0.29 m/s · v@contact 0.00 | CLE 3 · |dir| 6.02° · |speed| 0.22 m/s · v@contact 0.00 | CLE 3 · |dir| 3.46° · |speed| 0.12 m/s · v@contact 0.00 | CLE 3 · |dir| 1.15° · |speed| 0.04 m/s · v@contact 0.00 |

G / H (a firm pass to a sprinter, BC 50 vs 99, the same draws): the same run and the same contact speed. Only the touch differs: median |direction error| 6.78° at BC 50 vs 0.62° at BC 99, |speed error| 0.47 vs 0.04 m/s.

## 15. – 17. The movement matrix (receiver × pass × turn × pass direction, seeds 1–2: 672 runs)
Moving receivers: **CLEAN 426/504** (RECEIVE-CONTROL-2: 365/504) · TAKEN 50 (59) · MISSED 17 (66).

**Movement speed**

| receiver | JOG | RUN | SPRINT |
|---|---|---|---|
| CLEAN · RECEIVE-MOVING-1 | 150/168 | 148/168 | 128/168 |
| CLEAN · RECEIVE-CONTROL-2 | 130/168 | 127/168 | 108/168 |
| speed kept · RECEIVE-MOVING-1 (paired) | 0.72 | 0.81 | 0.79 |
| speed kept · RECEIVE-CONTROL-2 (paired) | 0.67 | 0.78 | 0.76 |
| paired runs (CLEAN in both) | 122 | 120 | 91 |

**Incoming ball speed** (at the receiver: SLOW 5, NORMAL 9, FIRM 13, HARD 17 m/s). A slow pass is slower than a running receiver, so he must wait for it; that is
the low speed kept in the SLOW column.

| pass | SLOW | NORMAL | FIRM | HARD |
|---|---|---|---|---|
| CLEAN · RECEIVE-MOVING-1 | 122/126 | 115/126 | 97/126 | 92/126 |
| CLEAN · RECEIVE-CONTROL-2 | 110/126 | 103/126 | 83/126 | 69/126 |
| speed kept · RECEIVE-MOVING-1 (paired) | 0.56 | 0.75 | 0.82 | 0.87 |
| speed kept · RECEIVE-CONTROL-2 (paired) | 0.53 | 0.71 | 0.78 | 0.87 |
| paired runs (CLEAN in both) | 107 | 95 | 72 | 59 |

**Turn angle** — §10.

## 18. Player speed before / after
In §10 – §12 (the owner's §31 metrics per case: speed before, minimum, at the contact, +0.25 / +0.50 / +1.00 s, heading before → after, the ball's distance 0.5 s
after the contact, the time to stable continuation).

## 19. DRIBBLE-V1 handoff
TURN-1.2 at the action's handoff touchdown (no speed reset: the action's exit speed), DRIBBLE-V1 at the takeover window with the receive touch as its last touch; the
run-out steers onto the ball's line. The remaining TAKEN runs (50 of 504) are takeovers DRIBBLE-V1 does not complete (no dribble touch — the frozen
dribbler's pocket; by turn: {0: 2, 30: 5, 60: 6, 90: 8, 120: 9, 150: 18, 180: 2}).

## 20. Stationary regression
RECEIVE-CONTROL-2's integrated cases and its standing matrix rows through ReceiveSimM: **130/130 bit-identical**. RECEIVE-CONTROL-1.1's
matrix of record on RECEIVE-MOVING-1: standing CLEAN 108 (RECEIVE-CONTROL-2 CLEAN 108); moving (606 runs) **CLEAN 531 · TAKEN 48 · RECEIVED 5 · MISSED 22** (RECEIVE-CONTROL-2 CLEAN 500 · TAKEN 59 · RECEIVED 8 · MISSED 39; RECEIVE-CONTROL-1.1 CLEAN 491 · TAKEN 67 · RECEIVED 9 · MISSED 39). Its remaining misses are mostly joggers turning 90° from a pass struck from behind by RECEIVE-CONTROL-1.1's pass solver (MISSED-LATE).
Protected files 651/651 identical; regression in one process: DRIBBLE-V1 60/60 (evidence 48/48),
RECEIVE-CONTROL-1.1 11/11, RECEIVE-TURN-1 18/18, RECEIVE-KILL 30/30 with 45 moving receives between; D1 / RX / RXE deeply unchanged: yes.

## 21. Animation ON / OFF · 22. Determinism
Animation on / off **104/104** identical (112,320 posed frames); replay **104/104**; Chrome = Node **26/26**.
The draws use RECEIVE-CONTROL-2's architecture: key = seed | RECEIVE | receiver | R<event> | c<contact> | receive-control-v2 | dimension. The receiver's speed
changes the geometry and the difficulty, never the key. Matched counterfactuals on the moving cases (BC 50 / 70 / 80 / 90 / 99 × seeds 1–3):
- the same draws 33/33;
- the same key 33/33;
- the same run up to the contact 33/33.

Another seed draws differently 11/11. The key does not include the scenario, so the same seed, receiver and event draw the
same tendencies in different cases, as in RECEIVE-CONTROL-2.

## 23. Performance
One process, nothing else running (the second of two passes over the owner's cases at BC 70): the receive phase (the approach, the action, the TURN-1.2 run-out until DRIBBLE-V1 takes the ball) 17 ms per simulated second (median of the cases), DRIBBLE-V1 after it 182 ms per simulated second, the worst single step 19.7 ms; the moving planner 1.9 ms per receive (median; max 2.3).

## 24. Review / lab links (local only — the character is a real player's model)
- Review: `http://127.0.0.1:8361/review_artifacts/receive_moving1/review/RECEIVE_MOVING1_REVIEW.html`
- Lab: `http://127.0.0.1:8361/sandbox/visual/receive_moving1.html?case=RL_0_SPRINT_NORMAL` (ids DIR_TURN[R|L]_RS_PS[_IS][_BC##], `&seed=`, `&single=A&A=side`)

## 25. Known limitations
- The moving body is RECEIVE-CONTROL-1.1's placeholder body on the action's stride-fitted footwork (stride-aware; not RECEIVE-TURN-1.1's human body); TURN-1.2's real
  locomotion before the action and after the handoff.
- DRIBBLE-V1's takeover still fails in 50 of 504 moving receives (120° – 150°: 27). This is the frozen dribbler's pocket; the takeover window reduces it.
- A pass aimed at his body, from the side, makes a runner check his stride. Case B (30°) kept 0.83 of the pace;
  with the pass into his stride (B′), 0.91. The stride touch has no contact
  closer to the body than 0.40 m ahead (RECEIVE-CONTROL-1.1's family geometry).
- 17 moving receives of the movement matrix find no action. They are firm / hard passes with a 60° turn from behind-left, and 150° – 180° turns at a sprint.
- No Agility (the extension point: RX.omegaMax / the exit acceleration and TURN-1's entry speeds are the body-reorientation capability a rating would scale), no
  Dribbling attribute, no pressure.
- Moving receives use RECEIVE-CONTROL-1.1's moving vocabulary (adapted), not RECEIVE-TURN-1's stationary techniques re-authored for running.
