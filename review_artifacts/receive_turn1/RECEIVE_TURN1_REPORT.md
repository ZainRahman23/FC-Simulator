# RECEIVE-TURN-1 — execution variance around Alternative B + the stationary receive-and-turn library (presented for review, NOT frozen, NOT integrated)

Date 19 Oct 2026 · branch `prototype/dribble-1` · code `sandbox/visual/receive_turn1/` (the kill engine is a copy of RECEIVE-KILL-1.2 at curve B; `receive_kill12/` and every earlier RECEIVE-KILL folder are unchanged) · owner instruction verbatim in `sources/2026-10-19_user_instruction_receive_turn_1.md` · research: [`RECEIVE_TURN1_RESEARCH.md`](RECEIVE_TURN1_RESEARCH.md).

**I cannot play video in real time.** Every visual statement below comes from still grids and the measured label on each tile, not from watching the clips.

## Summary

**Phase 1 — execution variance.**

- **The draws were already there; now they are bounded.** Every contact already drew keyed per-dimension execution errors (since RECEIVE-KILL-1). The tiles you have been looking at showed the TYPICAL draw, each dimension at its median magnitude, and the 200-seed tables were already distributions. Phase 1 keeps curve B and makes the draws:
  - **bounded:** a soft limit — unchanged up to ±1.5σ, then a smooth roll-off to a hard cap at ±2.5σ;
  - **re-keyed** to your structure: seed | RECEIVE | receiver | receive event | contact index | receive-control-v2 | dimension | draw index;
  - **named by physical dimension:** damping, direction, vertical, and for the turn touch also weight.
- **B stays the centre.** At 1000 seeds per cell on all nine benchmarks:
  - **matched draws:** bounding leaves 98–100 % of seeds in the same class; the median outcomes are unchanged.
  - **re-keyed draws:** they reproduce B within sampling noise. On the 22 m/s pass the clean-touch share at BC 50 / 70 / 80 / 90 / 99 is 31 / 53 / 73 / 98 / 100 %, against B's 32 / 54 / 74 / 96 / 100 %.
  - **only the extreme tail shrinks:** the worst 22 m/s touch at BC 70 puts the ball 3.39 m out, against 4.57 m before.
- **BC 99 is tight.** Its worst touch in 1000 seeds is 0.07 m on the 22 m/s pass and 0.01 m on the roller. Nothing bizarre can happen: a BC 99 touch is at most 2.5 σ of BC 99's own small error.

**Phase 2 — the receive-and-turn library.**

- **Four authored families, one action each.** Preparation during the ball's travel, then the touch, the rotation and the exit.
  - **Directional receive:** opens slightly, inside of the foot.
  - **Half-turn:** opens side-on before contact; the ball runs across the body to the back foot.
  - **Outside-of-foot turn.**
  - **Through-stance turn:** the far foot sends the ball behind the standing leg, Cruyff / Gravenberch-like; the first-touch vector is ~26–31° off the exit vector.
- **No angle switch.** A small feasible action set per receive (family × foot × surface × variant × contact tick) is scored by difficulty, time and preference, never by Ball Control.
- **What it chooses** (12 m/s, right turns, clean preparation):
  - directional receive at 0–60°: the far foot's inside across the body, the preferred foot only at 0°;
  - half-turn at 75–135°;
  - through-stance turn at 150–180°;
  - on an 18 m/s pass the half-turn extends to 150°;
  - the outside-of-foot turn is only feasible for slow balls (≤ ~6 m/s) and is never the cheapest, for a pass from the front.
- **Ratings separate as intended, and the angle matters.** 12 m/s pass, clean first touch at BC 30 / 50 / 70 / 90 / 99:
  - 0°: 47 / 63 / 79 / 100 / 100 %;
  - 90°: 29 / 43 / 60 / 98 / 100 %;
  - 180°: 21 / 36 / 50 / 96 / 100 %.
  - The slow pass stays compressed; the firm pass exposes the ratings (item 17).
- **Mirror.** A two-footed receiver's left turn is the mirror image of his right turn in 50400/50400 matched runs (to 2e-13 m).

**Decisions for you** (each is cheap to change):

1. **The comfortable range of each family is a design choice** — no source gives angle bands. With forced families (item 11), the half-turn opened 70° measures slightly *better* at 150–180° than the through-stance turn the selection uses there: on a 12 m/s pass at BC 70, 66 vs 56 % clean at 180°. Only the half-turn's 120° range bound sends 150–180° to the through-stance turn. Keep the bound (technique variety, as you expected), or let outcomes decide (the half-turn would then cover 75–180° when the body can open early).
2. **The outside-of-foot turn** is built but physically excluded for frontal passes above ~6 m/s: the impulse that takes the pace off points toward the passer, and the outside of the foot cannot face it. Keep it for later (side-arriving balls, pressure), or drop it from this library.
3. **Large-turn difficulty.** The rotation inside the touch adds 0.55 × (share of the turn) to D. Ask if 120–180° should be harsher or gentler at BC 60–80.

---

## 1 · Execution-randomness model

```
touch velocity = ideal + Σ_a  σ_a · d_a · ê_a          per physical dimension a
σ_a = k_a · vRef · D · E(BC, D)                          (RECEIVE-KILL-1.2 curve B, unchanged)
E(BC, D) = 0.0068 + 0.25 · s(g_B(BC)) · D/(D + 1)        D = the ball's / action's difficulty
d_a = bounded(N_a),  N_a ~ keyed standard normal
kill touches   a ∈ {damping (rebound axis; − run-through × 0.5), direction (lateral), vertical (lift)}   k = surface shape (inside foot 1.0 / 0.6 / 0.25)
turn touches   a ∈ {damping 0.8 (incoming axis), weight 0.6 (along the touch), direction 0.6 (⊥, + toward the turn side), vertical 0.25}
```

**How the spread behaves:**

- It scales with the rating's error: E at BC 99 is ~1/24 of BC 10's.
- It scales with difficulty: D, and its compression c(D) = D/(D + 1), which keeps easy balls tight.
- Ball Control rescales the same standardised draws; it never re-rolls them.
- The current B behaviour is the centre of this distribution:
  - the TYPICAL draw (0.674 on every dimension, the median magnitude) is unchanged;
  - the median outcomes are unchanged (item 4).
- **Turn-touch calibration.** For a straight kill-and-push the turn touch's along-axis budget is √(0.8² + 0.6²) = 1.0, and its lateral 0.6 / vertical 0.25 equal the kill's inside-of-the-foot shape. So the turn touches inherit B's calibration.

## 2 · The bounded distribution

d = N for |N| ≤ 1.5; otherwise ±(1.5 + 1.0 · tanh(|N| − 1.5)) — continuous, C¹ at the knee, capped at ±2.5.

**What it does to the draws:**

- 87 % of draws are untouched.
- The median magnitude (0.674) is exactly preserved.
- N = 2 → 1.96, N = 3 → 2.41, N = 4 → 2.49.

**Why this shape:**

- **Truncated normal:** the same core, but a density jump at the cut and an inverse CDF to audit.
- **Triangular / Irwin–Hall:** bounded, but it reshapes the whole distribution, so B's centre would move.
- **This soft limit:** a one-line function of the existing keyed normal, so the matched audit against RECEIVE-KILL-1.2 is exact.
- **Precedent:** I did not find a bounded execution draw anywhere in this worktree (simulator, sandbox, prototype, integration). All of them use an unbounded Box–Muller normal, so I chose this shape and explain it here.

## 3 · Per-dimension RNG design

- **Key:** `seed | RECEIVE | receiverId | receiveEventId | c<contactIndex> | receive-control-v2 | <dimension> | <drawIndex>`, with BLAKE2b-keyed draws and no cursor.
  - **Kill episodes:** event R1, contacts c0 / c1 / c2 (first touch and follow-ups).
  - **Receive-turn episodes:** event T1; c0 is the turn touch, c1 the extra control touch.
- **What never enters the key:** Ball Control, animation, rendering, the frame rate.
- **Turn-side relative.** The turn touch's direction draw is relative to the turn side, so a left turn is the mirror of a right turn draw for draw. The extra control touch's direction draw is too.
- **Audit mode.** `setDraws({ keys: "rk12", bounded: false })` reproduces RECEIVE-KILL-1.2 B exactly: 504/504 episodes. With the v2 keys every episode differs (504/504) — a re-sample, not a recalibration.

## 4 · Alternative B remains the average

1000 seeds per cell.

- **B** = RECEIVE-KILL-1.2 B exactly (old keys, unbounded).
- **bounded** = the same draws bounded, matched seed for seed.
- **v2** = the production draws.

| benchmark | BC | clean B / bounded / v2 % | median placement B / v2 (m) | p90 B / v2 | max B / bounded / v2 | same class B ↔ bounded |
|---|---|---|---|---|---|---|
| 2 m/s ground roller | 30 | 100 / 100 / 100 | 0.01 / 0.01 | 0.03 / 0.03 | 0.05 / 0.04 / 0.04 | 100 % |
|  | 50 | 100 / 100 / 100 | 0.01 / 0.01 | 0.02 / 0.02 | 0.04 / 0.03 / 0.03 | 100 % |
|  | 70 | 100 / 100 / 100 | 0.01 / 0.01 | 0.02 / 0.02 | 0.03 / 0.03 / 0.03 | 100 % |
|  | 80 | 100 / 100 / 100 | 0.01 / 0.01 | 0.01 / 0.01 | 0.03 / 0.02 / 0.02 | 100 % |
|  | 90 | 100 / 100 / 100 | 0.00 / 0.00 | 0.01 / 0.01 | 0.02 / 0.01 / 0.01 | 100 % |
|  | 99 | 100 / 100 / 100 | 0.00 / 0.00 | 0.00 / 0.00 | 0.01 / 0.01 / 0.01 | 100 % |
| 12 m/s normal ground pass | 30 | 69 / 70 / 68 | 0.37 / 0.38 | 1.02 / 0.98 | 3.03 / 2.57 / 2.18 | 99 % |
|  | 50 | 87 / 87 / 88 | 0.22 / 0.23 | 0.58 / 0.55 | 1.61 / 1.27 / 1.13 | 99 % |
|  | 70 | 95 / 95 / 97 | 0.14 / 0.14 | 0.34 / 0.33 | 0.86 / 0.72 / 0.65 | 99 % |
|  | 80 | 99 / 100 / 100 | 0.10 / 0.10 | 0.22 / 0.21 | 0.51 / 0.41 / 0.38 | 99 % |
|  | 90 | 100 / 100 / 100 | 0.05 / 0.05 | 0.09 / 0.09 | 0.20 / 0.16 / 0.15 | 100 % |
|  | 99 | 100 / 100 / 100 | 0.01 / 0.01 | 0.03 / 0.03 | 0.05 / 0.04 / 0.04 | 100 % |
| 22 m/s hard ground pass | 30 | 17 / 17 / 15 | 1.63 / 1.70 | 4.90 / 4.61 | 14.75 / 11.38 / 10.94 | 99 % |
|  | 50 | 32 / 32 / 31 | 0.90 / 0.93 | 2.73 / 2.47 | 8.72 / 6.59 / 6.32 | 99 % |
|  | 70 | 54 / 54 / 53 | 0.52 / 0.55 | 1.51 / 1.41 | 4.57 / 3.73 / 3.39 | 99 % |
|  | 80 | 74 / 75 / 73 | 0.32 / 0.33 | 0.87 / 0.84 | 2.54 / 2.16 / 1.88 | 99 % |
|  | 90 | 96 / 97 / 98 | 0.12 / 0.12 | 0.29 / 0.28 | 0.75 / 0.63 / 0.57 | 99 % |
|  | 99 | 100 / 100 / 100 | 0.02 / 0.03 | 0.05 / 0.05 | 0.09 / 0.08 / 0.07 | 100 % |
| Thigh — 6 m/s dropping 35° at 0.95 m | 30 | 75 / 76 / 75 | 0.18 / 0.18 | 0.34 / 0.35 | 0.71 / 0.64 / 0.63 | 99 % |
|  | 50 | 90 / 92 / 92 | 0.13 / 0.13 | 0.26 / 0.25 | 0.53 / 0.47 / 0.44 | 98 % |
|  | 70 | 98 / 99 / 100 | 0.10 / 0.10 | 0.19 / 0.19 | 0.37 / 0.33 / 0.31 | 99 % |
|  | 80 | 100 / 100 / 100 | 0.08 / 0.07 | 0.14 / 0.14 | 0.28 / 0.25 / 0.23 | 100 % |
|  | 90 | 100 / 100 / 100 | 0.04 / 0.04 | 0.08 / 0.08 | 0.15 / 0.13 / 0.13 | 100 % |
|  | 99 | 100 / 100 / 100 | 0.01 / 0.01 | 0.03 / 0.03 | 0.05 / 0.04 / 0.04 | 100 % |
| Thigh — 16 m/s dropping 35° (hard) | 30 | 6 / 6 / 5 | 0.79 / 0.79 | 1.95 / 1.85 | 4.45 / 5.13 / 4.39 | 99 % |
|  | 50 | 12 / 12 / 10 | 0.57 / 0.58 | 1.35 / 1.25 | 3.50 / 3.15 / 2.92 | 99 % |
|  | 70 | 24 / 24 / 22 | 0.42 / 0.43 | 0.92 / 0.85 | 2.37 / 2.44 / 1.81 | 99 % |
|  | 80 | 39 / 39 / 39 | 0.32 / 0.32 | 0.65 / 0.62 | 1.57 / 1.39 / 1.25 | 99 % |
|  | 90 | 83 / 84 / 84 | 0.17 / 0.17 | 0.33 / 0.32 | 0.70 / 0.62 / 0.57 | 99 % |
|  | 99 | 100 / 100 / 100 | 0.05 / 0.04 | 0.08 / 0.08 | 0.16 / 0.14 / 0.14 | 100 % |
| Chest — 8 m/s dropping 20° at 1.32 m | 30 | 45 / 46 / 42 | 0.32 / 0.33 | 0.73 / 0.72 | 1.49 / 1.33 / 1.41 | 98 % |
|  | 50 | 62 / 63 / 62 | 0.23 / 0.24 | 0.54 / 0.51 | 1.21 / 0.94 / 0.98 | 99 % |
|  | 70 | 77 / 77 / 76 | 0.17 / 0.18 | 0.39 / 0.38 | 0.85 / 0.68 / 0.69 | 100 % |
|  | 80 | 86 / 87 / 87 | 0.13 / 0.14 | 0.29 / 0.29 | 0.63 / 0.51 / 0.51 | 99 % |
|  | 90 | 98 / 99 / 99 | 0.07 / 0.07 | 0.16 / 0.15 | 0.34 / 0.28 / 0.27 | 100 % |
|  | 99 | 100 / 100 / 100 | 0.02 / 0.02 | 0.05 / 0.05 | 0.11 / 0.09 / 0.09 | 100 % |
| Chest — 20 m/s dropping 20° (hard) | 30 | 5 / 5 / 5 | 1.21 / 1.21 | 3.20 / 3.41 | 11.73 / 9.40 / 8.70 | 100 % |
|  | 50 | 10 / 10 / 9 | 0.84 / 0.87 | 2.15 / 2.21 | 6.03 / 6.61 / 6.84 | 99 % |
|  | 70 | 17 / 17 / 15 | 0.61 / 0.63 | 1.51 / 1.50 | 3.98 / 3.09 / 3.36 | 99 % |
|  | 80 | 29 / 29 / 27 | 0.45 / 0.47 | 1.10 / 1.09 | 2.74 / 2.07 / 2.25 | 99 % |
|  | 90 | 61 / 61 / 60 | 0.24 / 0.25 | 0.56 / 0.55 | 1.28 / 1.01 / 1.04 | 99 % |
|  | 99 | 99 / 100 / 100 | 0.06 / 0.07 | 0.14 / 0.14 | 0.30 / 0.24 / 0.24 | 99 % |
| Head — 6 m/s dropping 15° at 1.78 m | 30 | 17 / 17 / 15 | 0.68 / 0.69 | 1.31 / 1.33 | 3.91 / 2.82 / 2.74 | 99 % |
|  | 50 | 25 / 25 / 23 | 0.50 / 0.51 | 0.95 / 1.00 | 2.41 / 2.16 / 2.10 | 100 % |
|  | 70 | 37 / 37 / 36 | 0.39 / 0.40 | 0.76 / 0.75 | 1.69 / 1.53 / 1.47 | 99 % |
|  | 80 | 54 / 55 / 52 | 0.30 / 0.30 | 0.60 / 0.61 | 1.53 / 1.41 / 1.17 | 100 % |
|  | 90 | 87 / 87 / 88 | 0.16 / 0.17 | 0.35 / 0.33 | 1.04 / 0.87 / 0.82 | 100 % |
|  | 99 | 100 / 100 / 100 | 0.05 / 0.06 | 0.22 / 0.22 | 0.41 / 0.42 / 0.39 | 100 % |
| Head — 15 m/s dropping 25° (hard, forced) | 30 | 1 / 1 / 1 | 2.81 / 2.87 | 5.89 / 5.86 | 12.46 / 12.36 / 11.06 | 100 % |
|  | 50 | 2 / 2 / 2 | 2.05 / 2.15 | 4.54 / 4.46 | 11.46 / 9.84 / 8.53 | 100 % |
|  | 70 | 4 / 4 / 3 | 1.51 / 1.59 | 3.45 / 3.37 | 7.97 / 8.19 / 6.75 | 99 % |
|  | 80 | 7 / 7 / 6 | 1.14 / 1.22 | 2.55 / 2.50 | 7.34 / 6.58 / 5.79 | 99 % |
|  | 90 | 21 / 21 / 18 | 0.62 / 0.63 | 1.33 / 1.26 | 3.23 / 3.43 / 2.92 | 99 % |
|  | 99 | 88 / 89 / 89 | 0.16 / 0.17 | 0.46 / 0.45 | 1.23 / 1.04 / 1.07 | 100 % |

**Why the medians are preserved:**

- Bounding changes only draws beyond 1.5σ, so the matched medians are identical.
- The v2 differences are sampling noise: at 1000 seeds a share's standard error is ~1.5 points.
- **Nothing was recalibrated.**

## 5 · Same-rating multi-seed distributions

Quantiles of the v2 draws, 1000 seeds, for every benchmark at every rating: `evidence/var_distribution.json`. The review page shows five benchmarks.

**The variance page** (`receive_turn1_var.html`) shows:

- any benchmark or turn case at one rating, N seeds side by side;
- an overlay of all their ball paths;
- the N-seed quantiles and the evidence of record.

**Clips:** 16 seeds each of the 22 m/s pass at BC 50 / 70 / 80 / 90 / 99, and of a 120° turn at BC 70.

**From the stills:**

- At BC 70, 6 of 16 seeds kill the 22 m/s pass dead. The other 10 need a second touch, with steps of 0.37–1.62 m.
- At BC 99 all 16 are the same clean touch.

| 22 m/s pass, v2 | BC | min | p10 | p25 | median | p75 | p90 | max |
|---|---|---|---|---|---|---|---|---|
| placement (m) | 30 | 0.00 | 0.48 | 0.87 | 1.70 | 3.16 | 4.61 | 10.94 |
|  | 50 | 0.00 | 0.28 | 0.49 | 0.93 | 1.70 | 2.47 | 6.32 |
|  | 70 | 0.00 | 0.17 | 0.30 | 0.55 | 0.97 | 1.41 | 3.39 |
|  | 80 | 0.00 | 0.11 | 0.19 | 0.33 | 0.58 | 0.84 | 1.88 |
|  | 90 | 0.00 | 0.05 | 0.07 | 0.12 | 0.20 | 0.28 | 0.57 |
|  | 99 | 0.00 | 0.01 | 0.02 | 0.03 | 0.04 | 0.05 | 0.07 |
| residual speed (m/s) | 30 | 0.14 | 1.36 | 1.95 | 2.83 | 3.99 | 5.09 | 8.61 |
|  | 50 | 0.13 | 1.02 | 1.42 | 2.05 | 2.89 | 3.71 | 6.18 |
|  | 70 | 0.14 | 0.75 | 1.06 | 1.52 | 2.14 | 2.72 | 4.47 |
|  | 80 | 0.14 | 0.59 | 0.82 | 1.16 | 1.62 | 2.01 | 3.28 |
|  | 90 | 0.06 | 0.33 | 0.47 | 0.66 | 0.89 | 1.10 | 1.63 |
|  | 99 | 0.03 | 0.14 | 0.23 | 0.33 | 0.40 | 0.47 | 0.64 |
| stable control (s) | 30 | 0.23 | 0.27 | 0.66 | 0.88 | 1.20 | 1.58 | 1.82 |
|  | 50 | 0.23 | 0.23 | 0.33 | 0.72 | 0.95 | 1.20 | 1.82 |
|  | 70 | 0.23 | 0.23 | 0.23 | 0.39 | 0.73 | 0.87 | 1.60 |
|  | 80 | 0.23 | 0.23 | 0.23 | 0.23 | 0.60 | 0.70 | 1.07 |
|  | 90 | 0.23 | 0.23 | 0.23 | 0.23 | 0.23 | 0.23 | 0.65 |
|  | 99 | 0.23 | 0.23 | 0.23 | 0.23 | 0.23 | 0.23 | 0.23 |
| recovery distance (m) | 30 | 0.00 | 0.00 | 0.47 | 1.16 | 2.12 | 3.25 | 3.98 |
|  | 50 | 0.00 | 0.00 | 0.00 | 0.68 | 1.36 | 2.12 | 3.99 |
|  | 70 | 0.00 | 0.00 | 0.00 | 0.00 | 0.72 | 1.13 | 3.31 |
|  | 80 | 0.00 | 0.00 | 0.00 | 0.00 | 0.30 | 0.62 | 1.72 |
|  | 90 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.45 |
|  | 99 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| contacts | 30 | 1.00 | 1.00 | 1.00 | 2.00 | 2.00 | 2.00 | 2.00 |
|  | 50 | 1.00 | 1.00 | 1.00 | 2.00 | 2.00 | 2.00 | 2.00 |
|  | 70 | 1.00 | 1.00 | 1.00 | 1.00 | 2.00 | 2.00 | 2.00 |
|  | 80 | 1.00 | 1.00 | 1.00 | 1.00 | 2.00 | 2.00 | 2.00 |
|  | 90 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 2.00 |
|  | 99 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |

## 6 · Matched-rating counterfactuals

The same standardised draw at BC 30 → 99 shrinks the same mistake. Clips: 22 m/s pass, seed 2; 120° turn, seed 4.

**22 m/s pass, seed 2** (a stiff, rebounding touch):

| BC | 30 | 50 | 60 | 70 | 80 | 90 | 99 |
|---|---|---|---|---|---|---|---|
| extra step | 3.38 m | 1.63 m | 1.14 m | 0.87 m | 0.43 m | clean | clean |
| stable control | 1.62 s | 1.04 s | 0.88 s | 0.78 s | 0.63 s | 0.23 s | 0.23 s |

The lab's BC ladder and the variance page's "same draw" mode show this for any seed.

## 7 · BC 99 variance

| benchmark | median placement | p90 | max (1000 seeds) | clean |
|---|---|---|---|---|
| 2 m/s ground roller | 0.00 m | 0.00 m | **0.01 m** | 100 % |
| 12 m/s normal ground pass | 0.01 m | 0.03 m | **0.04 m** | 100 % |
| 22 m/s hard ground pass | 0.03 m | 0.05 m | **0.07 m** | 100 % |
| Thigh — 6 m/s dropping 35° at 0.95 m | 0.01 m | 0.03 m | **0.04 m** | 100 % |
| Thigh — 16 m/s dropping 35° (hard) | 0.04 m | 0.08 m | **0.14 m** | 100 % |
| Chest — 8 m/s dropping 20° at 1.32 m | 0.02 m | 0.05 m | **0.09 m** | 100 % |
| Chest — 20 m/s dropping 20° (hard) | 0.07 m | 0.14 m | **0.24 m** | 100 % |
| Head — 6 m/s dropping 15° at 1.78 m | 0.06 m | 0.22 m | **0.39 m** | 100 % |
| Head — 15 m/s dropping 25° (hard, forced) | 0.17 m | 0.45 m | **1.07 m** | 89 % |

- **The forced 15 m/s header** is the only benchmark where BC 99 is not near-perfect. It is the hardest ball in the set, and it was already 88 % clean at 99 under B.
- **Receive-turns:** BC 99 is 100 % clean at every angle and every pass speed in the 200-seed matrix (item 17).

## 8 · BC 50 / 70 / 80 / 90 variance

The spread widens steadily as the rating falls. Median and p90 placement on the 22 m/s pass:

| BC | 90 | 80 | 70 | 50 |
|---|---|---|---|---|
| median placement (m) | 0.12 | 0.33 | 0.55 | 0.93 |
| p90 placement (m) | 0.28 | 0.84 | 1.41 | 2.47 |

The same pattern holds for every benchmark: `var_distribution.json`, and the review page's section A3.

## 9 · Research report

[`RECEIVE_TURN1_RESEARCH.md`](RECEIVE_TURN1_RESEARCH.md): the summary, with each point marked research-supported, coaching media, or our design choice. [`research/RT1_RESEARCH_NOTES.md`](research/RT1_RESEARCH_NOTES.md): 38 sources with quotes. The headlines:

- **Back-foot receiving:** opening early lets the ball roll across the body [FIFA, FA].
- **Stationary turning is hard:** a preparatory step that opens an "exit route" fixes it [FIFA Dünker].
- **Preparation before contact:** advanced players rotate the pelvis toward the exit and pre-position the feet before a 180° trap [Tsukuba 2025].
- **Large turns are one fluid movement** [easy2coach, Coaches Insider, Opta on Gravenberch].
- **Hooks, drags and Cruyffs are documented as dribbling reversals.** No source describes them as first touches of an incoming pass.
- **No source gives angle boundaries**; ours are design choices.

## 10 · Proposed angle families

**There is no switch: these are the groups the selection produces.** For a frontal pass, clean preparation and a right-footed receiver:

- **slow 6 m/s:** 0° directional (R) · 15° directional (L) · 30° directional (L) · 45° directional (L) · 60° directional (L) · 75° half-turn (R) · 90° half-turn (R) · 105° half-turn (R) · 120° half-turn (R) · 135° half-turn (R) · 150° through-stance (L) · 165° through-stance (L) · 180° through-stance (L)
- **normal 12 m/s:** 0° directional (R) · 15° directional (L) · 30° directional (L) · 45° directional (L) · 60° directional (L) · 75° half-turn (R) · 90° half-turn (R) · 105° half-turn (R) · 120° half-turn (R) · 135° half-turn (R) · 150° through-stance (L) · 165° through-stance (L) · 180° through-stance (L)
- **firm 18 m/s:** 0° directional (R) · 15° directional (L) · 30° directional (L) · 45° directional (L) · 60° directional (L) · 75° half-turn (R) · 90° half-turn (R) · 105° half-turn (R) · 120° half-turn (R) · 135° half-turn (R) · 150° half-turn (R) · 165° through-stance (L) · 180° through-stance (L)

**The proposal — the smallest useful set where the mechanics actually differ:**

- **0–~45° — directional receive.** Kill-and-push onto the line, little rotation.
- **~45–~135° — half-turn.** Open early, the ball across the body, the back foot. Its top end is the inside-foot soft turn.
- **~135/150–180° — through-stance turn.** Far foot behind the standing leg, pivot.
- **The 45–75° overlap** goes to the directional receive with the far foot across the body, or to the half-turn when the ball's line is on the turn side.
- **The 135–150° handover** depends on the pass speed.

## 11 · Action families implemented

`rt_actions.js`: four families, each authored once for a right turn and mirrored. Each family defines:

- the contact foot rule (near / far / either) and the surfaces;
- the opening at the contact (k·θ, capped);
- the contact and standing-foot geometry per variant;
- the planned run, its comfortable range and its difficulty factor.

**Every family forced at every angle** (12 m/s, 100 seeds), clean share at BC 70:

| family | 0° | 15° | 30° | 45° | 60° | 75° | 90° | 105° | 120° | 135° | 150° | 165° | 180° |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| directional | 78 % | 78 % | 75 % | 72 % | 68 % | 69 % | 71 % | 70 % | 67 % | 69 % | 66 % | 63 % | 65 % |
| half-turn | 73 % | 73 % | 72 % | 69 % | 64 % | 62 % | 61 % | 66 % | 66 % | 64 % | 62 % | 63 % | 66 % |
| outside turn | infeasible | infeasible | infeasible | infeasible | infeasible | infeasible | infeasible | infeasible | infeasible | infeasible | infeasible | infeasible | infeasible |
| through-stance | 77 % | 65 % | 62 % | 58 % | 55 % | 55 % | 56 % | 62 % | 66 % | 73 % | 68 % | 64 % | 56 % |

**What the forced runs show:**

- **The outside-of-foot turn is infeasible at 12 m/s at every angle.** For this pass the impulse points toward the passer, and the outside of the foot cannot face it. A probe found it feasible only up to ~6 m/s, at 45–120°.
- **The other three families work over wide ranges.** They differ by up to ~25 % in difficulty, and the selection picks the cheapest.

## 12 · Body-preparation logic

**During the ball's travel:**

- **Reading the pass.** The receiver reads it 0.5 s before it is struck, so ~1.5 s before the contact in clean conditions.
- **Opening.** The body opens to ψc = k·θ (directional 0.35 θ ≤ 20°, half-turn 0.55 θ ≤ 70°, outside 0.30 θ ≤ 45°, through-stance 0.12 θ ≤ 25°) at 300 °/s, taking at least 0.30 s.
- **The preparation step.** The standing foot steps to its plant early (≈ 0.25 s before the contact) — the step that opens the exit route.
- **Shoulders.** They lead the hips toward the exit.
- **Stance shift.** The stance moves ≤ 0.75 m so the ball meets the contact foot.

**Late preparation (`cond.prep`)** limits the opening: at 0.30 s the half-turn can open only 45°.
- In the matrix, 90–135° stay half-turns, opened 45° and turning more after the touch: 135° gives 59 % clean at BC 70, against 64 % clean.
- 150–180° stay through-stance turns.

**After the contact:**

- The body pivots on the standing foot, taking 0.10 s + Δψ / 520 °/s.
- The run starts 55 % into the pivot, accelerating at 5 m/s².
- Agility and Dribbling are held at this fixed baseline. Their hooks are `MOVE.ext.agility` and `MOVE.ext.dribbling`.

## 13 · Contact-foot and surface selection

**How a candidate is checked:**

- **Which foot:** near / far / either per family.
- **Which surface:** a candidate is feasible only if the surface can face the impulse Δv = v_out − v_in. This uses RECEIVE-CONTROL-1.1's boot-surface table, unchanged, with its glancing tolerance.
- **The ball's path:** it must clear the standing foot. A through-stance touch from in front of the standing foot to behind it would hit the foot, so the planner rejects it — which is why near-reversals use the "behind the standing leg" variant.
- **Cost:** the preferred foot (right) costs 0.04 less. The "incoming ball side" (the ball's line) moves the stance and, at 60°, switches the choice to the half-turn when the ball is on the turn side.

**Results** (12 m/s, clean):

- directional: the far foot's inside across the body, at 15–60°;
- half-turn: the back foot (the turn side)'s inside;
- through-stance: the far foot's inside, behind the standing leg.

## 14 · Intermediate ball-vector logic

**The reconnection point.** The authored post-contact path — pivot about the standing foot, then the run along the exit line — fixes where the player will be at the reconnection time. The reconnection point is that position plus the reach (0.40 m) along the exit.

**The ideal first touch** sends the ball from the contact point to that point, in that time. Its speed comes from the kernel's own rolling law, by table.

**So the first-touch vector is generally not the exit vector.** Measured offsets at 12 m/s:

| family | first-touch vector off the exit |
|---|---|
| half-turn | 1–6° |
| directional | 19–24° (the ball crosses onto the line as he steps) |
| through-stance | 26–31° (the ball goes through the stance, he rotates around it) |

Both vectors are drawn in the lab, the matrix and every clip: ideal green, actual orange, the exit line gold.

## 15 · The 0–180° test matrix

**MAIN block:** 0, ±15 … ±180° × pass 6 / 12 / 18 m/s × BC 30 / 50 / 60 / 70 / 80 / 90 / 99 × 200 seeds (`evidence/turn_matrix.json`).

**The other blocks:**

- **MIRROR:** two-footed, ±θ;
- **LATE:** preparation 0.30 / 0.45 s;
- **LINE:** the ball's line ±0.25 m;
- **FORCED:** every family at every angle.

**Measured per cell:**

- continuation class shares;
- time to continuation;
- correction (recovery distance);
- lateness;
- placement error at the planned meeting;
- first-touch direction and speed error;
- touches.

**Continuation classes:**

- **IMMEDIATE:** meets the ball on the exit line within 0.25 m and 0.25 s of the plan, the ball ≤ 0.35 m off the line.
- **ADJUSTED:** a correction ≤ 1.0 m, ≤ 0.75 s late.
- **RECOVERY:** an extra control touch was needed (RECEIVE-KILL's follow-up control, simulated, its own draws), then the turn out.
- **UNSTABLE:** no control in the window.

## 16 · Mirrored left / right evidence

- **Two-footed receiver:** 50400/50400 matched runs are the exact mirror image (launch, ball path, end; max deviation 2e-13 m), and 49915/50400 give the same result.
- **Right-footed receiver:** left and right turns mostly pick mirrored actions. The far-foot choices swap feet: −60° uses the right foot's inside, +60° the left. Where the actions mirror, the results are equal (`NORMAL_±θ` cells).
- **Where the preferred foot shifts the choice.** The half-turn uses the turn-side foot, the through-stance turn the other one. So on left turns the through-stance turn gets the preferred right foot (a 0.04 cheaper cost) and takes over one step earlier: at 135° on the slow pass and at 150° on the firm pass. That is the only asymmetry, and it is a selection preference, not an execution penalty.
- **Fix made during the run.** The mirror first came out at 96 %. RECEIVE-KILL's follow-up control had a built-in right-foot preference and a "right"-signed lateral draw. Both now follow the receiver: the preference is his, and the draw is turn-side relative. Every matrix was then rerun.

## 17 · BC 30 / 50 / 60 / 70 / 80 / 90 / 99 results (right turns; left turns mirror)

**slow pass, 6 m/s** — clean / recovery % (200 seeds):

| turn | action | BC 30 | BC 50 | BC 60 | BC 70 | BC 80 | BC 90 | BC 99 | median continuation BC 30 / 70 / 99 (s) |
|---|---|---|---|---|---|---|---|---|---|
| 0° | directional R | 99 / 0 | 100 / 0 | 100 / 0 | 100 / 0 | 100 / 0 | 100 / 0 | 100 / 0 | 0.54 / 0.53 / 0.52 |
| 15° | directional L | 95 / 0 | 100 / 0 | 100 / 0 | 100 / 0 | 100 / 0 | 100 / 0 | 100 / 0 | 0.54 / 0.54 / 0.54 |
| 30° | directional L | 94 / 0 | 100 / 0 | 100 / 0 | 100 / 0 | 100 / 0 | 100 / 0 | 100 / 0 | 0.55 / 0.55 / 0.55 |
| 45° | directional L | 91 / 0 | 99 / 0 | 100 / 0 | 100 / 0 | 100 / 0 | 100 / 0 | 100 / 0 | 0.55 / 0.55 / 0.55 |
| 60° | directional L | 86 / 0 | 97 / 0 | 99 / 0 | 100 / 0 | 100 / 0 | 100 / 0 | 100 / 0 | 0.57 / 0.57 / 0.56 |
| 75° | half-turn R | 85 / 0 | 96 / 0 | 97 / 0 | 98 / 0 | 100 / 0 | 100 / 0 | 100 / 0 | 0.64 / 0.64 / 0.64 |
| 90° | half-turn R | 86 / 0 | 97 / 0 | 98 / 0 | 100 / 0 | 100 / 0 | 100 / 0 | 100 / 0 | 0.65 / 0.65 / 0.65 |
| 105° | half-turn R | 88 / 0 | 98 / 0 | 99 / 0 | 100 / 0 | 100 / 0 | 100 / 0 | 100 / 0 | 0.65 / 0.65 / 0.65 |
| 120° | half-turn R | 90 / 0 | 99 / 0 | 99 / 0 | 100 / 0 | 100 / 0 | 100 / 0 | 100 / 0 | 0.66 / 0.66 / 0.66 |
| 135° | half-turn R | 94 / 0 | 99 / 0 | 100 / 0 | 100 / 0 | 100 / 0 | 100 / 0 | 100 / 0 | 0.67 / 0.67 / 0.67 |
| 150° | through-stance L | 83 / 0 | 94 / 0 | 96 / 0 | 100 / 0 | 100 / 0 | 100 / 0 | 100 / 0 | 0.70 / 0.70 / 0.70 |
| 165° | through-stance L | 86 / 0 | 93 / 0 | 96 / 0 | 99 / 0 | 100 / 0 | 100 / 0 | 100 / 0 | 0.71 / 0.72 / 0.72 |
| 180° | through-stance L | 82 / 0 | 91 / 0 | 95 / 0 | 97 / 0 | 100 / 0 | 100 / 0 | 100 / 0 | 0.73 / 0.73 / 0.73 |

**normal pass, 12 m/s** — clean / recovery % (200 seeds):

| turn | action | BC 30 | BC 50 | BC 60 | BC 70 | BC 80 | BC 90 | BC 99 | median continuation BC 30 / 70 / 99 (s) |
|---|---|---|---|---|---|---|---|---|---|
| 0° | directional R | 47 / 6 | 63 / 1 | 73 / 0 | 79 / 0 | 94 / 0 | 100 / 0 | 100 / 0 | 0.53 / 0.53 / 0.53 |
| 15° | directional L | 45 / 6 | 58 / 1 | 66 / 0 | 78 / 0 | 91 / 0 | 100 / 0 | 100 / 0 | 0.54 / 0.54 / 0.54 |
| 30° | directional L | 43 / 8 | 56 / 1 | 66 / 0 | 74 / 0 | 88 / 0 | 100 / 0 | 100 / 0 | 0.55 / 0.55 / 0.55 |
| 45° | directional L | 40 / 9 | 57 / 2 | 63 / 0 | 70 / 0 | 85 / 0 | 100 / 0 | 100 / 0 | 0.55 / 0.55 / 0.55 |
| 60° | directional L | 37 / 10 | 55 / 2 | 61 / 0 | 67 / 0 | 80 / 0 | 99 / 0 | 100 / 0 | 0.55 / 0.57 / 0.57 |
| 75° | half-turn R | 31 / 14 (u 1) | 45 / 4 | 52 / 2 | 59 / 1 | 80 / 0 | 97 / 0 | 100 / 0 | 0.64 / 0.64 / 0.64 |
| 90° | half-turn R | 29 / 11 | 43 / 4 | 52 / 2 | 60 / 0 | 78 / 0 | 98 / 0 | 100 / 0 | 0.65 / 0.65 / 0.65 |
| 105° | half-turn R | 31 / 10 | 44 / 3 | 51 / 1 | 65 / 0 | 80 / 0 | 98 / 0 | 100 / 0 | 0.65 / 0.65 / 0.65 |
| 120° | half-turn R | 34 / 10 | 48 / 2 | 56 / 1 | 65 / 0 | 82 / 0 | 99 / 0 | 100 / 0 | 0.66 / 0.66 / 0.66 |
| 135° | half-turn R | 35 / 8 | 51 / 2 | 59 / 0 | 64 / 0 | 86 / 0 | 100 / 0 | 100 / 0 | 0.67 / 0.67 / 0.67 |
| 150° | through-stance L | 28 / 22 (u 1) | 44 / 6 | 52 / 3 | 64 / 1 | 80 / 0 | 96 / 0 | 100 / 0 | 0.59 / 0.63 / 0.70 |
| 165° | through-stance L | 24 / 21 | 39 / 7 | 49 / 3 | 59 / 1 | 77 / 0 | 96 / 0 | 100 / 0 | 0.65 / 0.67 / 0.72 |
| 180° | through-stance L | 21 / 24 | 36 / 8 | 45 / 3 | 50 / 2 | 68 / 0 | 96 / 0 | 100 / 0 | 0.73 / 0.72 / 0.73 |

**firm pass, 18 m/s** — clean / recovery % (200 seeds):

| turn | action | BC 30 | BC 50 | BC 60 | BC 70 | BC 80 | BC 90 | BC 99 | median continuation BC 30 / 70 / 99 (s) |
|---|---|---|---|---|---|---|---|---|---|
| 0° | directional R | 21 / 34 (u 2) | 35 / 17 | 43 / 11 | 47 / 4 | 66 / 1 | 97 / 0 | 100 / 0 | 0.67 / 0.53 / 0.53 |
| 15° | directional L | 22 / 35 (u 3) | 34 / 18 | 39 / 8 | 47 / 4 | 61 / 1 | 94 / 0 | 100 / 0 | 0.74 / 0.54 / 0.54 |
| 30° | directional L | 17 / 33 (u 4) | 29 / 17 | 38 / 11 | 45 / 6 | 59 / 1 | 92 / 0 | 100 / 0 | 0.55 / 0.55 / 0.55 |
| 45° | directional L | 16 / 36 (u 5) | 30 / 21 | 36 / 14 | 43 / 6 | 61 / 2 | 88 / 0 | 100 / 0 | 0.72 / 0.55 / 0.55 |
| 60° | directional L | 16 / 39 (u 5) | 25 / 24 | 33 / 15 | 42 / 7 | 56 / 2 | 85 / 0 | 100 / 0 | 0.75 / 0.55 / 0.57 |
| 75° | half-turn R | 18 / 43 (u 7) | 23 / 24 (u 3) | 29 / 20 (u 1) | 32 / 10 | 47 / 4 | 82 / 0 | 100 / 0 | 0.93 / 0.64 / 0.64 |
| 90° | half-turn R | 18 / 41 (u 8) | 24 / 27 (u 2) | 27 / 17 (u 1) | 34 / 7 | 47 / 4 | 82 / 0 | 100 / 0 | 0.92 / 0.65 / 0.65 |
| 105° | half-turn R | 17 / 42 (u 8) | 24 / 25 (u 2) | 28 / 15 (u 1) | 34 / 8 | 47 / 2 | 84 / 0 | 100 / 0 | 0.92 / 0.65 / 0.65 |
| 120° | half-turn R | 16 / 41 (u 6) | 24 / 24 (u 1) | 30 / 14 | 35 / 8 | 50 / 2 | 86 / 0 | 100 / 0 | 0.88 / 0.66 / 0.66 |
| 135° | half-turn R | 18 / 41 (u 6) | 25 / 26 | 33 / 17 | 38 / 6 | 53 / 2 | 90 / 0 | 100 / 0 | 0.87 / 0.67 / 0.67 |
| 150° | half-turn R | 17 / 45 (u 4) | 25 / 26 | 31 / 17 | 40 / 7 | 52 / 2 | 90 / 0 | 100 / 0 | 0.89 / 0.69 / 0.69 |
| 165° | through-stance L | 10 / 52 (u 12) | 16 / 40 (u 2) | 21 / 27 (u 1) | 28 / 18 | 45 / 5 | 82 / 0 | 100 / 0 | 1.03 / 0.65 / 0.72 |
| 180° | through-stance L | 9 / 53 (u 12) | 14 / 43 (u 2) | 18 / 29 (u 1) | 24 / 20 | 39 / 6 | 80 / 0 | 100 / 0 | 1.02 / 0.70 / 0.73 |

## 18 · Qualitative rating interpretation

From the matrix. Nothing is encoded as a success rate: these are measured outcomes of the physical touch and the continuation.

- **BC 99:** the authored receive-turn, almost exactly.
  - 100 % clean at every angle and speed.
  - A median correction of a few cm. The 180° through-stance turn at 12 m/s continues at 0.73 s, against the ideal 0.73 s.
- **BC 90:** elite.
  - 12 m/s: 98–100 % clean at small and medium turns, 96 % at 165–180°.
  - The 18 m/s pass is where the occasional adjustment shows: 82 % at 90°, 80 % at 180°.
- **BC 80:** very good.
  - Small turns at 12 m/s are 85–94 % clean.
  - Large turns are visibly less exact: 68 % at 180°.
  - At 18 m/s about half are clean (47 % at 90°).
- **BC 70:** competent professional.
  - Ordinary receives and half-turns at 12 m/s: 79 % at 0°, 60 % at 90°.
  - 180°: 50 %.
  - 18 m/s: 24–34 % clean, with 7–20 % extra control touches.
- **BC 60:** mediocre.
  - 12 m/s: 52 % at 90°, 45 % at 180°.
  - 18 m/s: 18 % at 180°, with 29 % recoveries.
- **BC 50:** weak, but still the correct action family.
  - 12 m/s: 43 % at 90°, 36 % at 180°, with 8 % recoveries.
  - 18 m/s: 27–43 % need an extra touch.
- **BC 30:** poor.
  - 12 m/s: 21–47 % clean, 6–24 % recoveries.
  - 18 m/s: 9–21 % clean, 34–53 % recoveries, up to 12 % uncontrolled.
- **The slow 6 m/s pass stays easy for everyone:** 82–99 % clean even at BC 30.
- **Lower ratings cost convenience, time and touches.** The ball does not explode away: at 12 m/s no episode is UNSTABLE at any rating ≥ 50, any angle or side.

## 19 · Visual review page

`review/RECEIVE_TURN1_REVIEW.html`, local only.

**Part A:** the bounded draw, B as the centre, the distributions, BC 99, the multi-seed and matched-rating clips.

**Part B:**

- the families and the selection map;
- the 0–180° tables and distributions;
- the mirror, the forced families, late preparation and the ball's line;
- 12 visual cases × 2 draws, each a 2×2 mosaic at BC 50 / 70 / 90 / 99 with a still grid.

**The visual cases:** 30, 60, 90, 120 and 135° (as selected, and the forced through-stance), 150 and 180°, and mirrored −60 / −90 / −135 / −180°.

## 20 · Interactive lab

`receive_turn1_lab.html`. Controls:

- turn angle −180 … 180°, pass speed, the ball's line, Ball Control;
- the draw: typical, heavy (p75), perfect, or seed 1–40;
- family / foot / variant, preparation time and preferred foot (each can be forced);
- camera (auto = across the exit line).

**Views:**

- 3D with every vector;
- the top view;
- the HUD: the feasible action set with costs, the ideal touch, execution per dimension, continuation;
- the BC ladder.

**Also:** the matrix page `receive_turn1.html` (angle × rating, live, with the evidence's share bars); the variance page `receive_turn1_var.html`; and the phase-1 kill lab and matrix (`receive_turn1_kill_lab.html`, `receive_turn1_kill.html`).

## 21 · Performance

Node, measured alone (`rt_cpu.json`):

| turn | candidates / receive | selection (ms) | contact (ms) | prediction + meeting (ms) | whole episode (ms) |
|---|---|---|---|---|---|
| 0–45 | 208 (90 feasible) | 0.22 (worst 1.02) | 0.374 | 4.11 | 8.14 (worst 155.84) |
| 60–105 | 208 (81 feasible) | 0.21 (worst 0.75) | 0.417 | 4.35 | 8.78 (worst 16.69) |
| 120–150 | 208 (68 feasible) | 0.17 (worst 0.73) | 0.388 | 4.13 | 8.35 (worst 14.77) |
| 165–180 | 208 (55 feasible) | 0.15 (worst 0.52) | 0.390 | 4.13 | 8.30 (worst 22.31) |

**One-off costs** (once per process, outside the per-receive figures):

- the kernel rolling-law table: 265 ms;
- the first pass solve: 283 ms.

**Where the time goes:**

- Selection is closed form, with no biomechanical search.
- **The 156 ms worst episode (0–45°)** is a one-off: the process's first extra control touch builds RECEIVE-KILL's exit-speed table column lazily (≈ 114 ms, measured). Every later episode stays under ~22 ms.
- Most of an episode is the kernel itself: the real ball's 3.4 s prediction and the world's own 3 s simulation.

## 22 · Determinism

**Phase 1 (kill engine with v2 draws):**

- draws identical across BC: 155/155;
- first-contact error = the same vector × E: 883/883;
- seeds differ: 70/70;
- replay: 252/252;
- fresh-world path: 252/252;
- animation on / off: 14/14;
- Chrome = Node: 45/45.

**Receive-turn:**

- draws identical across BC: 504/504;
- error = the same draw × σ: 501/501 (3 capped);
- seeds differ: 84/84;
- replay: 84/84;
- fresh-world schedule path: 252/252 (498 launches);
- animation on / off: 14/14;
- mirror: 144/144;
- Chrome = Node: 45/45.

**Arithmetic.** The authoritative chain uses + − × ÷, sqrt and the kernel's deterministic dsin / dcos / datan2 / dexp.

## 23 · Regression verification

- **RECEIVE-KILL-1.1 and RECEIVE-KILL-1:** 90/90 episodes and 90/90 cells equal their evidence.
- **DRIBBLE-V1:** 60/60 before == after; frozen evidence 48/48.
- **RECEIVE-CONTROL-1.1:** 11/11 cases; matrix 714/714 identical to its evidence.
- **Frozen parameters:** D1 / RX / RXE unchanged: true.
- **RECEIVE-KILL-1.2 B:** its own code and tool reproduce its evidence of record in 22/22 cells (HARD, CHEST_M).
- **Protected files:** 190 files IDENTICAL against their hashes at the instruction commit (`frozen_sha256_end_check.txt`). This covers:
  - DRIBBLE-V1, TURN-1.2, RUN-1, BALL-FEEL, tackle and RECEIVE-CONTROL-1.1;
  - RECEIVE-KILL-1 and RECEIVE-KILL-1.1;
  - RECEIVE-KILL-1.2's code, pages and evidence.
- **Not touched:** passing and shooting code.

## 24 · Known limitations

**Conditions this study holds fixed:**

- **No defenders, no pressure, no disguise:** by instruction. Clean conditions; the pass always comes from the front.
- **Ground passes only:** aerial receive-turns are left out, as instructed.
- **Agility and Dribbling** are held at a fixed baseline; only the hooks exist. **Weak foot** is a selection preference only.

**Not built:**

- **No no-touch (let-it-run) turn.** It is research-supported, but useless at these pass speeds.
- **No hook / drag families.** The sources document them as dribbling reversals, and a frontal pass to a 150–180° exit does not need one.
- **The outside-of-foot turn** is never selected for frontal passes (item 11).

**Model scope:**

- **The continuation ends at the reconnection touch.** DRIBBLE-V1 owns what follows in integration. The clips show an ideal continuation push so they keep moving; it feeds no measure.
- **The extra control touch** reuses RECEIVE-KILL's follow-up foot control. Its settle point is in the receiver's original frame (orientation-free stable check).
- **The body is a placeholder** (presentation only, not in the ball's world): procedural steps, pivot and IK on the real rig. Contact surfaces are shown, but the foot–ball contact is not collision-exact. The 3D camera does not follow the player once he runs out of frame (the top view does).
- **Meetings during the pivot.** The meeting search can choose a meeting during the end of the pivot (a touch "on the turn") when the ball stays close.

**Calibration:** the families' comfortable ranges, opening factors, difficulty factors and selection weights are calibration values for review, not locked.
