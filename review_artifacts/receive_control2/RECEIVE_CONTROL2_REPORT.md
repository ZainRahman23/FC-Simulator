# RECEIVE-CONTROL-2 — RECEIVE-KILL + RECEIVE-TURN integrated into RECEIVE-CONTROL (QUEUE #1)

**Status: presented for review — NOT frozen.** The owner's instruction (QUEUE #1 and QUEUE #2) is saved verbatim in `sources/`. QUEUE #2 (receiving while moving) is the next,
separate phase.

I cannot play video in real time: the visual checks here come from stills taken from the clips.

Review page (local only): `review/RECEIVE_CONTROL2_REVIEW.html` · lab: `sandbox/visual/receive_control2.html` · code: `sandbox/visual/receive_control2/`.

## 1. One authoritative receive pipeline
`ReceiveSim2` (`rc2_core.js`) extends RECEIVE-CONTROL-1.1's simulation (which extends the frozen DRIBBLE-V1 simulation). For every receive event ONE resolver decides
the action and ONE execution model executes every receive contact:

| The receive | Decided by | Executed by |
|---|---|---|
| standing receiver · ground ball · go (any exit, 0° = touch into space) | RECEIVE-TURN-1's selection — DIRECTIONAL / HALF-TURN / OUTSIDE-OF-FOOT / THROUGH-STANCE | RECEIVE-TURN-1's turn execution (curve B, bounded keyed draws) |
| standing receiver · ground ball · kill | RECEIVE-KILL's planner (foot surfaces) | RECEIVE-KILL's execution |
| standing receiver · aerial ball (any intent) | RECEIVE-KILL's planner (thigh / chest / head, or a foot on a dropping ball) + its follow-up foot control | RECEIVE-KILL's execution |
| moving receiver (interim, until QUEUE #2) | RECEIVE-CONTROL-1.1's moving actions (STRIDE / OPEN_TURN / THROUGH_TURN) | the same model (RECEIVE-TURN-1's execution on RECEIVE-KILL's difficulty) |
| after the receive | the rejoin / set-off touch (a receive contact of the same event) → TURN-1.2 takes the body → DRIBBLE-V1 takes the ball (frozen) | |

Nothing else decides a receive: RECEIVE-CONTROL-1.1's standing families and its execution model (`rx_exec.js`) no longer run; RECEIVE-TURN-1's / RECEIVE-KILL's
stand-alone runners are replaced by live controllers (`rc2_episode.js`) that run their decisions inside DRIBBLE-V1's ball kernel.

## 2. RECEIVE-KILL is actually used
- As a live controller inside the DRIBBLE-V1-frame kernel: **585/585** stand-alone kill / control episodes reproduced bit for bit (every kill matrix row × BC 30 / 70 / 99 × seeds 1–3: the same launches, the same ball).
- The full pipeline striking RECEIVE-KILL's own passes: **260/260** the same action, **260** the same contacts (follow-ups included), **260** the same ball path.
- RECEIVE-CONTROL-1.1's kill blocks (K + KG): **108/108 KILLED**. Integrated cases A / I / J / K: 59/60 KILLED (one header settles at 1.22 s).
- Curve B, the bounded draws, easy-ball compression, thigh / chest / head and the follow-up foot control are RECEIVE-KILL's own code (imported unchanged).

## 3. RECEIVE-TURN is actually used
- As a live controller: **864/864** stand-alone turn episodes reproduced bit for bit, the action RE-SELECTED on the kernel's own prediction (864/864 identical plans).
- The full pipeline: **180/180** the same action, **180** the same contact, **180** the same extra control, **180** the same ball to the rejoin.
- RECEIVE-CONTROL-1.1's standing receives now go through it: **CLEAN 108/108** (RECEIVE-CONTROL-1.1's own actions: CLEAN 92 · TAKEN 16).
- The presentation body is RECEIVE-TURN-1.1's human body, in the receive's frame.

## 4. Action classification
At the pass's strike (the clean read) the resolver predicts the free ball in two frames — the receiver's own facing (RECEIVE-KILL receives from any bearing) and squared up
to the pass (RECEIVE-TURN-1's actions are authored for a frontal ball). A **ground** receive keeps the ball's centre ≤ 0.24 m while it is in reach; then a go intent asks
RECEIVE-TURN-1 for the exit relative to the squared-up facing (the intent's own turn — DRIBBLE-V1's command layer stores 180° as 179.5°), a kill intent asks RECEIVE-KILL.
An **aerial** ball goes to RECEIVE-KILL (its AUTO surface choice). If RECEIVE-TURN-1 finds no feasible action the receive falls back to RECEIVE-KILL (then a set-off).
Selected on the matrix's standing receives: {'DIRECTIONAL': 27, 'THROUGH_TURN': 27, 'HALF_TURN': 54}.

## 5. One receive event
Each receive is one event R1, R2 … per receiver; its contacts are c0 (the receive touch), c1 … (follow-up / extra controls), and the rejoin or set-off push (the next index).
Launch ids `<player>:R1.c0`, `…R1.c0.f1`, `…R1.c1`; the touch records carry them (DRIBBLE-V1's last touch is the rejoin).

## 6. Randomness
- The key: `seed | RECEIVE | receiver | R<event> | c<contact> | receive-control-v2 | dimension` — the stand-alone systems' keys; the integration reproduces them exactly (§2, §3).
- Matched counterfactuals: **56/56** case × seed sets draw the same at BC 50 … 99; the executed error is the draw × σ(BC, D) exactly in **160/160** turn executions.
- Different seeds differ: 14/14. One namespace: the same pass resolved as a kill and as a turn draws the same damping / direction / vertical tendencies (5/5).

## 7. DRIBBLE-V1 is not modified; the bridge lives in RECEIVE-CONTROL-2
Protected / frozen files **578/578 identical**. The bridge (all in `rc2_core.js`):
- **the rejoin touch** — at RECEIVE-TURN-1's meeting the receiver plays the ball onto the exit line so that it is DRIBBLE-V1's takeover distance (RECEIVE-CONTROL-1.1's HANDOFF_AHEAD) ahead of him at the handoff; a receive contact, executed with Ball Control; the foot and its touchdown come from the action's authored footwork;
- **TURN-1.2 takes the body** at that touchdown — or, while the authored run is still slower than TURN-1.2's slowest gait (2.5 m/s, a through-stance turn), at the first later footstep where it has reached it;
- **DRIBBLE-V1 takes the ball** ≥ 0.6 s later (TURN-1.2 settled into its gait), its resolver state fresh, the rejoin as its last touch;
- **the set-off** — after a kill / control with a go intent: turn to the exit, push the ball along it, run; the same switch and handoff rules;
- **kill and hold** — stable possession, no handoff.

## 8. The handoff
| case | | resolver | outcome | continuation | ball ahead / lateral at handoff (m) | ball / runner (m/s) | 1st DRIBBLE-V1 touch (s) | speed step at the switch (m/s, max) | recontacts + doubles | losses after handoff | runs |
|---|---|---|---|---|---|---|---|---|---|---|---|
| A | ordinary ground kill | KILL_FOOT_INSIDE_R | KILLED 15 | — | — / — | — / — | — | — | 0 | 0 | 15 |
| B | ground directional receive (30°) | DIRECTIONAL | CLEAN 15 | ADJUSTED / IMMEDIATE | 1.88 / 0.01 | 3.97 / 4.61 | 0.65 | 0.02 | 0 | 0 | 15 |
| C | 60° receive | DIRECTIONAL | CLEAN 15 | IMMEDIATE | 1.87 / 0.01 | 4.03 / 4.54 | 0.64 | 0.02 | 0 | 0 | 15 |
| D | 90° half-turn | HALF_TURN | CLEAN 14 · TAKEN 1 | ADJUSTED / IMMEDIATE | 1.87 / 0.01 | 4.33 / 4.79 | 0.65 | 0.02 | 0 | 1 | 15 |
| E | 120° turn | HALF_TURN | CLEAN 15 | ADJUSTED / IMMEDIATE | 1.86 / 0.01 | 4.39 / 4.84 | 0.77 | 0.02 | 0 | 0 | 15 |
| F | 135° large turn | HALF_TURN | CLEAN 15 | ADJUSTED / IMMEDIATE | 1.87 / 0.01 | 4.41 / 4.85 | 0.77 | 0.02 | 0 | 0 | 15 |
| G | 150° through-stance | THROUGH_TURN | CLEAN 15 | ADJUSTED / IMMEDIATE | 1.81 / 0.00 | 2.80 / 4.03 | 0.60 | 0.02 | 0 | 0 | 15 |
| H | 180° through-stance | THROUGH_TURN | CLEAN 15 | ADJUSTED / IMMEDIATE | 1.84 / 0.03 | 1.63 / 4.01 | 0.38 | 0.03 | 0 | 1 | 15 |
| I | thigh → foot | THIGH | KILLED 15 | — | — / — | — / — | — | — | 0 | 0 | 15 |
| J | chest → foot | CHEST | KILLED 15 | — | — / — | — / — | — | — | 0 | 0 | 15 |
| K | head → follow-up | HEAD | SETTLED 1 · KILLED 14 | — | — / — | — / — | — | — | 0 | 0 | 15 |
| L | poor / heavy receive (firm 18 m/s, BC 50) | HALF_TURN | CLEAN 3 | ADJUSTED / IMMEDIATE | 1.83 / 0.01 | 3.40 / 4.09 | 0.63 | 0.02 | 0 | 0 | 3 |
| M | receive → DRIBBLE-V1 continuation (7 s) | HALF_TURN | CLEAN 14 · TAKEN 1 | ADJUSTED / IMMEDIATE | 1.87 / 0.01 | 4.33 / 4.79 | 0.65 | 0.02 | 0 | 1 | 15 |
| I2 | thigh → foot → set off at 90° | THIGH | CLEAN 15 | — | 1.81 / 0.00 | 1.57 / 3.99 | 0.38 | 0.02 | 0 | 1 | 15 |
| A2 | kill and go | KILL_FOOT_INSIDE_R | SETTLED 5 · KILLED 9 · HEAVY 1 | — | 1.81 / 0.00 | 1.34 / 3.99 | 0.39 | 0.02 | 0 | 0 | 15 |

Go receives CLEAN **136/138**; the one TAKEN (D, BC 80, seed 2 — the same run in M) is a ball 1.89 m ahead on the line that DRIBBLE-V1 never touches:
RECEIVE-CONTROL-1.1's known stride-phase pocket of the frozen dribbler. No duplicate contact, no same-foot recontact, no snap (the ball is never moved: every touch is a
kernel launch inside its contact window), the facing at the switch is the exit (≤ 0.5° step).

## 9. Animation never fixes the integration
- Animation on / off: **122/122** runs identical (every review case × BC 50 / 80 / 99 × 2 seeds, plus a slice of the matrix), 131,040 posed frames; replay **122/122**.
- Chrome (the lab, bodies on) = Node (bodies off): **25/25** (fingerprint, action, every launch).

## 10. Regression
| | Result |
|---|---|
| RECEIVE-CONTROL-1.1's matrix of record, standing (now RECEIVE-TURN / RECEIVE-KILL) | RC1.1 CLEAN 92 · TAKEN 16 → RC2 CLEAN 108 |
| … moving (RECEIVE-CONTROL-1.1's actions, the unified execution) | RC1.1 CLEAN 491 · TAKEN 67 · RECEIVED 9 · MISSED 39 → RC2 CLEAN 500 · TAKEN 59 · RECEIVED 8 · MISSED 39 |
| kill blocks K + KG | 108/108 KILLED |
| RECEIVE-KILL / RECEIVE-TURN stand-alone (their evidence; unchanged) | equivalence §2 / §3; their files 578/578 identical |
| left / right mirror (two-footed, ±θ, 30 … 180°) | **28/28** exact to the DRIBBLE-V1 handoff (6.4e-14 m) — RECEIVE-CONTROL-1.1's criterion; after it DRIBBLE-V1's own rules |
| one process: DRIBBLE-V1 · RECEIVE-CONTROL-1.1 · RECEIVE-TURN-1 · RECEIVE-KILL | 60/60 (evidence 48/48) · 11/11 · 18/18 · 30/30, with 53 integrated runs between; D1 / RX / RXE unchanged True |
| Ball Control distributions | the integrated episodes ARE RECEIVE-KILL's / RECEIVE-TURN-1's (bit-identical, §2 / §3): their distributions of record hold unchanged |
| CPU | the resolver (one strike-time prediction in two frames + selection) 6.3 ms median per receive (max 6.7, worst step 18.1 ms); the receive phase 17 ms per simulated second median (RECEIVE-CONTROL-1.1: 8.8); DRIBBLE-V1 after it 172 |

The moving receives' individual outcomes move both ways (their draws are the receive-control-v2 keys now, not RECEIVE-CONTROL-1.1's); the aggregate holds and the misses
are the same 39 — they come from RECEIVE-CONTROL-1.1's moving planner, which QUEUE #2 replaces.

## 11. The integrated cases at BC 50 / 70 / 80 / 90 / 99 (seeds 1–3, the same draws at every rating)
| case | BC 50 | BC 70 | BC 80 | BC 90 | BC 99 |
|---|---|---|---|---|---|
| A | KILLED 3 | KILLED 3 | KILLED 3 | KILLED 3 | KILLED 3 |
| B | CLEAN 3 (IMM 2 ADJ 1) | CLEAN 3 (IMM 3) | CLEAN 3 (IMM 3) | CLEAN 3 (IMM 3) | CLEAN 3 (IMM 3) |
| C | CLEAN 3 (IMM 3) | CLEAN 3 (IMM 3) | CLEAN 3 (IMM 3) | CLEAN 3 (IMM 3) | CLEAN 3 (IMM 3) |
| D | CLEAN 3 (IMM 1 ADJ 2) | CLEAN 3 (IMM 2 ADJ 1) | CLEAN 2, TAKEN 1 (IMM 3) | CLEAN 3 (IMM 3) | CLEAN 3 (IMM 3) |
| E | CLEAN 3 (IMM 1 ADJ 2) | CLEAN 3 (IMM 2 ADJ 1) | CLEAN 3 (IMM 3) | CLEAN 3 (IMM 3) | CLEAN 3 (IMM 3) |
| F | CLEAN 3 (IMM 1 ADJ 2) | CLEAN 3 (IMM 2 ADJ 1) | CLEAN 3 (IMM 3) | CLEAN 3 (IMM 3) | CLEAN 3 (IMM 3) |
| G | CLEAN 3 (ADJ 2 IMM 1) | CLEAN 3 (IMM 3) | CLEAN 3 (IMM 3) | CLEAN 3 (IMM 3) | CLEAN 3 (IMM 3) |
| H | CLEAN 3 (ADJ 3) | CLEAN 3 (ADJ 3) | CLEAN 3 (ADJ 2 IMM 1) | CLEAN 3 (IMM 3) | CLEAN 3 (IMM 3) |
| I | KILLED 3 | KILLED 3 | KILLED 3 | KILLED 3 | KILLED 3 |
| J | KILLED 3 | KILLED 3 | KILLED 3 | KILLED 3 | KILLED 3 |
| K | SETTLED 1, KILLED 2 | KILLED 3 | KILLED 3 | KILLED 3 | KILLED 3 |
| I2 | CLEAN 3 | CLEAN 3 | CLEAN 3 | CLEAN 3 | CLEAN 3 |
| A2 | SETTLED 3 | KILLED 1, SETTLED 1, HEAVY 1 | KILLED 2, SETTLED 1 | KILLED 3 | KILLED 3 |

## 12. Ratings
The Ball Control curve was not retuned. The integration changes no execution: a receive's touch quality at every rating is RECEIVE-KILL's / RECEIVE-TURN-1's (bit-identical).
The continuation class follows the touch (IMMEDIATE at BC 90 – 99, ADJUSTED more often at BC 50 – 70); the handoff and DRIBBLE-V1's continuation hold across the ratings.

## 13. Success criteria
| Criterion | |
|---|---|
| one authoritative receive pipeline | yes — §1 |
| newer RECEIVE-KILL behaviour actually used | yes — bit-identical, §2 |
| newer RECEIVE-TURN behaviour actually used | yes — bit-identical, §3 |
| human turn animation simulation-neutral | yes — 122/122, Chrome = Node 25/25 |
| aerial follow-ups work | yes — I / J / K, 59/60 KILLED with the kill A; I′ set off |
| deterministic randomness preserved | yes — §6 |
| DRIBBLE-V1 handoff works | yes — §8 (136/138 CLEAN; one frozen-side pocket) |
| old parallel receive logic no longer competes | yes — §1 (moving receives keep RECEIVE-CONTROL-1.1's geometry as the one interim path) |
| regression acceptable | yes — §10 |

## Known limitations
- Moving receivers use RECEIVE-CONTROL-1.1's action geometry (the interim until QUEUE #2), executed with the unified model.
- RECEIVE-TURN-1's actions assume a frontal ball: a standing receiver squares up to the pass (0.5 s) before a turn.
- The set-off after a kill / control (A′, I′) is presented with RECEIVE-KILL's standing body pushing off, then TURN-1.2's strides: a visible placeholder.
- DRIBBLE-V1's frozen stride-phase pocket (1 in 138 integrated go receives).
- No Agility, Dribbling attribute or pressure.

## Review / lab links (local only — the character is a real player's model)
- Review: `http://127.0.0.1:8361/review_artifacts/receive_control2/review/RECEIVE_CONTROL2_REVIEW.html`
- Lab: `http://127.0.0.1:8361/sandbox/visual/receive_control2.html?case=D_BC99` (A–M, A2, I2, `_BC##`, `&seed=`; RECEIVE-CONTROL-1.1's case ids run their moving actions)
- Evidence: `review_artifacts/receive_control2/evidence/` · tools: `sandbox/visual/receive_control2/tools/`
