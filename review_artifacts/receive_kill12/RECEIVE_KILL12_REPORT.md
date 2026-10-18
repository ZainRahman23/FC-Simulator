# RECEIVE-KILL-1.2 — Ball Control scale candidate (presented for review, NOT frozen)

Date 18 Oct 2026 · branch `prototype/dribble-1` · code `sandbox/visual/receive_kill12/` (a copy of RECEIVE-KILL-1.1; `receive_kill1/` and `receive_kill11/` are unchanged) · owner instruction verbatim in `sources/2026-10-18_user_instruction_receive_kill_1_2.md`.

**I cannot play video in real time.** Every visual statement below comes from still grids and stills, not from watching the clips.

## Summary — and one decision for you

- **What changed.** Only the rating → execution-error mapping. The difficulty model, surfaces, keyed draws, elite floor, easy-ball compression, follow-up control, stable-control measurement, continuation classes and the thigh / chest / head sequences are RECEIVE-KILL-1.1's, bit for bit (the 1.2 code at the CURRENT scale reproduces RECEIVE-KILL-1.1: 162/162 episodes).
- **The candidate curve.** A new rating BC executes exactly like the current rating g(BC). g is a smooth monotone cubic (PCHIP) through five knots: (1, −8.5), (10, 0.7), (50, 40), (75, 50), (99, 98.5).
- **Anchors met exactly.** New BC 75 has current BC 50's error, and new BC 50 has current BC 40's. With the same seed the episodes are identical: the same class per seed in 100 % of cases on all nine benchmarks.
- **Easy balls stay compressed.** The 2 m/s roller is IMMEDIATE at every rating in every scale, with a 2-s error of at most 0.02 m.
- **Elite end.** New BC 99 is current BC 98.5 (E 0.0087 against 0.0081 at a hard pass). New BC 90 is current BC 77.5, so 90 → 99 keeps a real gap: on the 22 m/s pass, 91 % → 100 % immediate and 0.16 → 0.03 m at 2 s.

**The tension (please decide).** The two anchors cannot coexist with two of your other requests:

1. **"The professional middle should have more differentiation than RECEIVE-KILL-1.1"** and **"differences between BC 50 / 70 / 80 more visible"**.
   - The anchors map 25 new points (50 → 75) onto 10 current points (40 → 50). Whatever curve passes through them, the error gap between new 50 and new 75 is half of RECEIVE-KILL-1.1's 50 → 75 gap. This is arithmetic: E(cur 40) − E(cur 50) = 0.0198, against E(cur 50) − E(cur 75) = 0.0408.
   - On the 22 m/s pass the IMMEDIATE share at BC 50 / 60 / 70 / 75 / 80 is 33 / 39 / 45 / 49 / 59 % in the candidate, against 49 / 69 / 85 / 89 / 95 % in RECEIVE-KILL-1.1.
   - The separation moves to 75 → 90 instead: 49 → 91 %.
2. **"Closer to the current compressed model than to the original."**
   - Current BC 50's error (0.0812 at a hard pass) is already larger than the ORIGINAL model's error at BC 75 (0.0740). So the anchor itself puts new BC 70–85 at or above the original model's error level.
   - Below about 60 the candidate does stay close to current.

**What-if B** (measured, not built into the pages) meets the anchors only within 10 % of error. Its knots are (50, 35.4) and (75, 54.5), so 50 → 75 spans 20 current points instead of 10.
- 22 m/s IMMEDIATE at BC 50 / 60 / 70 / 75 / 80 / 90: **29 / 37 / 47 / 57 / 73 / 95 %**. The 50 → 80 spread is 44 points (A 26, RECEIVE-KILL-1.1 46).
- Chest 8 m/s: 60 / 68 / 76 / 80 / 84 / 98 %.
- Head 6 m/s: 26 / 31 / 40 / 47 / 54 / 87 %.
- Easy ball: unchanged.

**Options.**
- **A (built):** exact anchors.
- **B:** anchors within 10 %, a wider middle.
- **Restate an anchor**, for example new 75 ≈ current 55–60 if 75 should look clearly better than current 50.

Any remap's outcome is the current scale's outcome at g(BC), so a new choice is cheap to evaluate.

---

## 1 · Current RECEIVE-KILL-1.1 formula

```
σ_a = k_a · 10 · D · E              per axis a = rebound, lateral, third; draws N_a ~ keyed standard normal
E(BC, D) = 0.0068 + 0.25 · s(u) · c(D)
s(u) = u · (0.68 + 0.32 · u²),  u = (100 − BC) / 90
c(D) = D / (D + 1)                   (easy-ball compression)
D = m · vEff/10 · (1 + 0.6H² + 0.8J + 0.5B + 0.1·shift)
chest k = [0.85, 0.5, 0.5], head k = [0.85, 0.7, 0.5]
```

## 2 · Proposed formula (candidate A)

```
E_new(BC, D) = E_current(g(BC), D)
g = monotone cubic Hermite (PCHIP, Fritsch–Carlson slopes), arithmetic only, through
    (1, −8.5)  (10, 0.7)  (50, 40)  (75, 50)  (99, 98.5)
```

| new BC | 10 | 20 | 30 | 40 | 50 | 60 | 70 | 75 | 80 | 90 | 99 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| executes like current BC | 0.7 | 11.5 | 22.6 | 32.6 | **40** | 43.9 | 47.3 | **50** | 55.9 | 77.5 | 98.5 |

The knots at 1 and 10 continue the low end smoothly; current BC 0.7 is a current-scale error slightly above BC 1, so there is no jump at 49 or anywhere else. Nothing else changes: the draws, k shapes, D, floor and compression c(D) are all RECEIVE-KILL-1.1's.

## 3 · The exact mathematical relationship

- **Candidate vs current:** `E_new(BC, D) = E_current(g(BC), D)` exactly, for every D. A new rating is a relabelled current rating, so every outcome of the candidate at BC is the current outcome at g(BC), with the same keyed draws. The anchors are therefore counterfactual by construction.
- **Candidate vs original:** `E_orig = 0.0068 + 0.40 · u^1.1 · c(D)`, with chest / head k [1.0, 0.6, 0.6] / [1.0, 0.9, 0.6].

E at a hard pass (D 2.2):

| BC | 10 | 20 | 30 | 40 | 50 | 60 | 70 | 75 | 80 | 90 | 99 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| original | .2818 | .2484 | .2154 | .1828 | .1509 | .1195 | .0889 | .0740 | .0594 | .0313 | .0087 |
| current | .1787 | .1493 | .1236 | .1010 | .0812 | .0636 | .0478 | .0404 | .0334 | .0199 | .0081 |
| **candidate A** | .2096 | .1741 | .1422 | .1173 | **.1010** | .0930 | .0864 | **.0812** | .0706 | .0369 | .0087 |
| what-if B | .2096 | .1787 | .1527 | .1304 | .1110 | .0959 | .0817 | .0730 | .0614 | .0328 | .0087 |

## 4 · Anchors — met exactly

The PCHIP passes through (75, 50) and (50, 40), so the errors match exactly on every benchmark. With matched seeds the outcomes are identical, not merely similar.

| benchmark | NEW 75 vs CUR 50: E | same class | immediate | NEW 50 vs CUR 40: E | same class | immediate |
|---|---|---|---|---|---|---|
| 2 m/s ground roller | 0.0263 = 0.0263 | 100 % | 100 = 100 % | 0.0315 = 0.0315 | 100 % | 100 = 100 % |
| 12 m/s normal ground pass | 0.0661 = 0.0661 | 100 % | 93 = 93 % | 0.0819 = 0.0819 | 100 % | 88 = 88 % |
| 22 m/s hard ground pass | 0.0814 = 0.0814 | 100 % | 49 = 49 % | 0.1014 = 0.1014 | 100 % | 33 = 33 % |
| Thigh — 6 m/s dropping 35° at 0.95 m | 0.0526 = 0.0526 | 100 % | 98 = 98 % | 0.0649 = 0.0649 | 100 % | 93 = 93 % |
| Thigh — 16 m/s dropping 35° (hard) | 0.0787 = 0.0787 | 100 % | 23 = 23 % | 0.0979 = 0.0979 | 100 % | 13 = 13 % |
| Chest — 8 m/s dropping 20° at 1.32 m | 0.0622 = 0.0622 | 100 % | 76 = 76 % | 0.0769 = 0.0769 | 100 % | 65 = 65 % |
| Chest — 20 m/s dropping 20° (hard) | 0.0847 = 0.0847 | 100 % | 18 = 18 % | 0.1055 = 0.1055 | 100 % | 12 = 12 % |
| Head — 6 m/s dropping 15° at 1.78 m | 0.0631 = 0.0631 | 100 % | 40 = 40 % | 0.0781 = 0.0781 | 100 % | 30 = 30 % |
| Head — 15 m/s dropping 25° (hard, forced) | 0.0863 = 0.0863 | 100 % | 4 = 4 % | 0.1075 = 0.1075 | 100 % | 3 = 3 % |

## 5 · NEW BC 75 vs CURRENT BC 50 (matched draws, 200 seeds)

Identical, seed for seed: the medians and the per-seed differences are 0.

On the 22 m/s pass:
- 2-s distance 0.57 m;
- recovery distance median 0 (p90 shown in the matrix);
- stable time median 0.48 s;
- IMMEDIATE 49 % · RECOVERY 48 %.

| benchmark | immediate | 2-s distance | recovery distance | stable time |
|---|---|---|---|---|
| 2 m/s ground roller | 100 = 100 % | 0.01 = 0.01 m | 0.00 = 0.00 m | 0.23 = 0.23 s |
| 12 m/s normal ground pass | 93 = 93 % | 0.15 = 0.15 m | 0.00 = 0.00 m | 0.23 = 0.23 s |
| 22 m/s hard ground pass | 49 = 49 % | 0.57 = 0.57 m | 0.00 = 0.00 m | 0.48 = 0.48 s |
| Thigh — 6 m/s dropping 35° at 0.95 m | 98 = 98 % | 0.26 = 0.26 m | 0.09 = 0.09 m | 0.69 = 0.69 s |
| Thigh — 16 m/s dropping 35° (hard) | 23 = 23 % | 1.07 = 1.07 m | 0.42 = 0.42 m | 0.86 = 0.86 s |
| Chest — 8 m/s dropping 20° at 1.32 m | 76 = 76 % | 0.49 = 0.49 m | 0.18 = 0.18 m | 0.67 = 0.67 s |
| Chest — 20 m/s dropping 20° (hard) | 18 = 18 % | 1.94 = 1.94 m | 0.61 = 0.61 m | 0.85 = 0.85 s |
| Head — 6 m/s dropping 15° at 1.78 m | 40 = 40 % | 0.70 = 0.70 m | 0.29 = 0.29 m | 0.97 = 0.97 s |
| Head — 15 m/s dropping 25° (hard, forced) | 4 = 4 % | 2.90 = 2.90 m | 1.47 = 1.47 m | 1.31 = 1.31 s |

## 6 · NEW BC 50 vs CURRENT BC 40 (matched draws, 200 seeds)

Identical in the same way. On the 22 m/s pass: 2-s distance 0.87 m, IMMEDIATE 33 %, RECOVERY 63 %.

| benchmark | immediate | 2-s distance | recovery distance | stable time |
|---|---|---|---|---|
| 2 m/s ground roller | 100 = 100 % | 0.01 = 0.01 m | 0.00 = 0.00 m | 0.23 = 0.23 s |
| 12 m/s normal ground pass | 88 = 88 % | 0.21 = 0.21 m | 0.00 = 0.00 m | 0.23 = 0.23 s |
| 22 m/s hard ground pass | 33 = 33 % | 0.87 = 0.87 m | 0.59 = 0.59 m | 0.69 = 0.69 s |
| Thigh — 6 m/s dropping 35° at 0.95 m | 93 = 93 % | 0.31 = 0.31 m | 0.11 = 0.11 m | 0.69 = 0.69 s |
| Thigh — 16 m/s dropping 35° (hard) | 13 = 13 % | 1.33 = 1.33 m | 0.56 = 0.56 m | 1.04 = 1.04 s |
| Chest — 8 m/s dropping 20° at 1.32 m | 65 = 65 % | 0.61 = 0.61 m | 0.20 = 0.20 m | 0.67 = 0.67 s |
| Chest — 20 m/s dropping 20° (hard) | 12 = 12 % | 2.35 = 2.35 m | 0.77 = 0.77 m | 1.06 = 1.06 s |
| Head — 6 m/s dropping 15° at 1.78 m | 30 = 30 % | 0.86 = 0.86 m | 0.35 = 0.35 m | 0.97 = 0.97 s |
| Head — 15 m/s dropping 25° (hard, forced) | 3 = 3 % | 3.51 = 3.51 m | 1.66 = 1.66 m | 1.48 = 1.48 s |

## 7 · Full 10–99 benchmark table — the 22 m/s hard ground pass (with BC 75)

Medians over 200 keyed seeds; the same draws in every column and every scale.

**Measure definitions.**
- **Placement error:** where the touch leaves the ball, against the ideal touch.
- **Recovery distance / time:** the extra adjustment and the extra time to stable control, against the ideal episode.

| measure | scale | BC 10 | BC 20 | BC 30 | BC 40 | BC 50 | BC 60 | BC 70 | BC 75 | BC 80 | BC 90 | BC 99 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| immediate residual velocity (m/s) | ORIGINAL (1) | 5.33 | 4.68 | 4.02 | 3.43 | 2.85 | 2.27 | 1.72 | 1.40 | 1.14 | 0.61 | 0.33 |
|  | CURRENT (1.1) | 3.36 | 2.82 | 2.34 | 1.95 | 1.57 | 1.22 | 0.91 | 0.78 | 0.65 | 0.45 | 0.33 |
|  | CANDIDATE (1.2) | 3.91 | 3.27 | 2.69 | 2.24 | 1.95 | 1.79 | 1.68 | 1.57 | 1.35 | 0.73 | 0.33 |
| first-touch velocity error (m/s) | ORIGINAL (1) | 5.30 | 4.67 | 4.05 | 3.44 | 2.84 | 2.25 | 1.67 | 1.39 | 1.12 | 0.59 | 0.16 |
|  | CURRENT (1.1) | 3.36 | 2.81 | 2.32 | 1.90 | 1.53 | 1.20 | 0.90 | 0.76 | 0.63 | 0.37 | 0.15 |
|  | CANDIDATE (1.2) | 3.94 | 3.27 | 2.67 | 2.21 | 1.90 | 1.75 | 1.62 | 1.53 | 1.33 | 0.69 | 0.16 |
| first-touch placement error (m) | ORIGINAL (1) | 5.72 | 4.63 | 3.52 | 2.62 | 1.80 | 1.16 | 0.67 | 0.49 | 0.34 | 0.12 | 0.03 |
|  | CURRENT (1.1) | 2.47 | 1.78 | 1.25 | 0.87 | 0.56 | 0.37 | 0.23 | 0.18 | 0.13 | 0.07 | 0.03 |
|  | CANDIDATE (1.2) | 3.35 | 2.35 | 1.62 | 1.13 | 0.87 | 0.74 | 0.64 | 0.56 | 0.44 | 0.16 | 0.03 |
| 0.25 s error (m) | ORIGINAL (1) | 1.24 | 1.08 | 0.93 | 0.78 | 0.64 | 0.50 | 0.36 | 0.29 | 0.22 | 0.10 | 0.02 |
|  | CURRENT (1.1) | 0.76 | 0.63 | 0.51 | 0.42 | 0.32 | 0.24 | 0.17 | 0.13 | 0.11 | 0.06 | 0.02 |
|  | CANDIDATE (1.2) | 0.90 | 0.74 | 0.60 | 0.49 | 0.42 | 0.38 | 0.35 | 0.32 | 0.27 | 0.12 | 0.02 |
| 0.50 s error (m) | ORIGINAL (1) | 2.34 | 2.06 | 1.74 | 1.46 | 1.17 | 0.86 | 0.57 | 0.43 | 0.31 | 0.12 | 0.03 |
|  | CURRENT (1.1) | 1.40 | 1.16 | 0.92 | 0.69 | 0.49 | 0.34 | 0.22 | 0.17 | 0.13 | 0.06 | 0.02 |
|  | CANDIDATE (1.2) | 1.71 | 1.37 | 1.09 | 0.85 | 0.69 | 0.61 | 0.55 | 0.49 | 0.40 | 0.15 | 0.03 |
| 1.0 s error (m) | ORIGINAL (1) | 4.18 | 3.63 | 2.97 | 2.35 | 1.73 | 1.15 | 0.67 | 0.49 | 0.34 | 0.12 | 0.03 |
|  | CURRENT (1.1) | 2.29 | 1.69 | 1.23 | 0.86 | 0.56 | 0.37 | 0.23 | 0.18 | 0.13 | 0.07 | 0.03 |
|  | CANDIDATE (1.2) | 2.89 | 2.20 | 1.56 | 1.11 | 0.86 | 0.73 | 0.64 | 0.56 | 0.44 | 0.16 | 0.03 |
| 2.0 s legacy distance (m) | ORIGINAL (1) | 5.71 | 4.62 | 3.52 | 2.63 | 1.80 | 1.16 | 0.68 | 0.48 | 0.33 | 0.12 | 0.03 |
|  | CURRENT (1.1) | 2.46 | 1.77 | 1.26 | 0.87 | 0.57 | 0.37 | 0.23 | 0.18 | 0.13 | 0.07 | 0.03 |
|  | CANDIDATE (1.2) | 3.34 | 2.35 | 1.62 | 1.13 | 0.87 | 0.73 | 0.64 | 0.57 | 0.45 | 0.16 | 0.03 |
| recovery distance (m) | ORIGINAL (1) | 1.69 | 1.64 | 1.78 | 1.48 | 1.14 | 0.77 | 0.42 | 0.00 | 0.00 | 0.00 | 0.00 |
|  | CURRENT (1.1) | 1.44 | 1.11 | 0.79 | 0.59 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
|  | CANDIDATE (1.2) | 1.69 | 1.41 | 1.01 | 0.73 | 0.59 | 0.49 | 0.34 | 0.00 | 0.00 | 0.00 | 0.00 |
| recovery time (s) | ORIGINAL (1) | 0.83 | 0.82 | 0.86 | 0.76 | 0.65 | 0.53 | 0.42 | 0.13 | 0.00 | 0.00 | 0.00 |
|  | CURRENT (1.1) | 0.75 | 0.64 | 0.53 | 0.47 | 0.26 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
|  | CANDIDATE (1.2) | 0.83 | 0.74 | 0.61 | 0.51 | 0.47 | 0.43 | 0.39 | 0.26 | 0.09 | 0.00 | 0.00 |
| contacts (mean) | ORIGINAL (1) | 1.32 | 1.41 | 1.53 | 1.61 | 1.67 | 1.64 | 1.55 | 1.42 | 1.24 | 1.03 | 1.00 |
|  | CURRENT (1.1) | 1.62 | 1.66 | 1.65 | 1.62 | 1.48 | 1.29 | 1.15 | 1.11 | 1.05 | 1.00 | 1.00 |
|  | CANDIDATE (1.2) | 1.54 | 1.64 | 1.66 | 1.64 | 1.62 | 1.58 | 1.52 | 1.48 | 1.39 | 1.08 | 1.00 |
| stable-control time (s) | ORIGINAL (1) | 1.06 | 1.04 | 1.09 | 0.99 | 0.88 | 0.75 | 0.64 | 0.35 | 0.23 | 0.23 | 0.23 |
|  | CURRENT (1.1) | 0.97 | 0.86 | 0.76 | 0.69 | 0.48 | 0.23 | 0.23 | 0.23 | 0.23 | 0.23 | 0.23 |
|  | CANDIDATE (1.2) | 1.06 | 0.97 | 0.83 | 0.74 | 0.69 | 0.66 | 0.61 | 0.48 | 0.31 | 0.23 | 0.23 |
| immediate / adjusted / recovery / unstable % | ORIGINAL (1) | 4/1/33/63 | 5/1/41/54 | 7/0/54/40 | 12/1/62/27 | 18/1/67/15 | 27/1/64/8 | 42/2/55/2 | 56/2/42/1 | 75/0/24/2 | 96/0/3/1 | 100/0/0/0 |
|  | CURRENT (1.1) | 12/1/62/25 | 18/1/66/15 | 25/1/65/10 | 33/1/63/4 | 49/2/48/2 | 69/1/30/2 | 85/0/15/1 | 89/0/11/1 | 95/0/5/1 | 100/0/0/0 | 100/0/0/0 |
|  | CANDIDATE (1.2) | 7/0/54/39 | 13/1/64/22 | 21/1/66/14 | 28/1/64/8 | 33/1/63/4 | 39/1/59/2 | 45/2/53/1 | 49/2/48/2 | 59/2/39/1 | 91/0/8/1 | 100/0/0/0 |

## 8 · Original vs current vs candidate

The whole picture is in the tables of items 7 and 9–12 (all three scales, plus what-if B where useful); every measure of every benchmark is in `evidence/rk12_three_scales.md`. In short:

- **Easy ball:** identical in all three scales.
- **Low end (BC 10–40):**
  - the candidate lies between current and original, nearer current;
  - on the 22 m/s pass the 2-s distance is 3.34 / 2.35 / 1.62 / 1.13 m (candidate), 2.46 / 1.77 / 1.26 / 0.87 (current) and 5.71 / 4.62 / 3.52 / 2.63 (original);
  - no "multi-metre explosions" on routine service: the 12 m/s pass at BC 10 is 0.71 m at 2 s.
- **BC 50–75:** flatter than either other scale (the tension above).
- **BC 75–90:**
  - near the original model's level, slightly above it at 75–80;
  - 22 m/s at 2 s: candidate 0.57 / 0.45 / 0.16 m, original 0.48 / 0.33 / 0.12 m, current 0.18 / 0.13 / 0.07 m.
- **BC 99:** the same in all three.

## 9 · Ground-control results (2 and 12 m/s; 22 m/s in item 7)

**2 m/s ground roller** (D 0.22, FOOT_INSIDE_R)

| measure | scale | 10 | 20 | 30 | 40 | 50 | 60 | 70 | 75 | 80 | 90 | 99 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| imm/adj/rec/uns % | original | 100/0/0/0 | 100/0/0/0 | 100/0/0/0 | 100/0/0/0 | 100/0/0/0 | 100/0/0/0 | 100/0/0/0 | 100/0/0/0 | 100/0/0/0 | 100/0/0/0 | 100/0/0/0 |
|  | current | 100/0/0/0 | 100/0/0/0 | 100/0/0/0 | 100/0/0/0 | 100/0/0/0 | 100/0/0/0 | 100/0/0/0 | 100/0/0/0 | 100/0/0/0 | 100/0/0/0 | 100/0/0/0 |
|  | **candidate** | 100/0/0/0 | 100/0/0/0 | 100/0/0/0 | 100/0/0/0 | 100/0/0/0 | 100/0/0/0 | 100/0/0/0 | 100/0/0/0 | 100/0/0/0 | 100/0/0/0 | 100/0/0/0 |
|  | what-if B | 100/0/0/0 | 100/0/0/0 | 100/0/0/0 | 100/0/0/0 | 100/0/0/0 | 100/0/0/0 | 100/0/0/0 | 100/0/0/0 | 100/0/0/0 | 100/0/0/0 | 100/0/0/0 |
| first-touch velocity error (m/s) | original | 0.15 | 0.13 | 0.11 | 0.10 | 0.08 | 0.07 | 0.05 | 0.05 | 0.04 | 0.02 | 0.01 |
|  | current | 0.10 | 0.08 | 0.07 | 0.06 | 0.05 | 0.04 | 0.03 | 0.03 | 0.03 | 0.02 | 0.01 |
|  | **candidate** | 0.11 | 0.09 | 0.08 | 0.07 | 0.06 | 0.05 | 0.05 | 0.05 | 0.04 | 0.03 | 0.01 |
|  | what-if B | 0.11 | 0.10 | 0.08 | 0.07 | 0.06 | 0.06 | 0.05 | 0.04 | 0.04 | 0.03 | 0.01 |
| 2-s distance (m) | original | 0.03 | 0.02 | 0.02 | 0.02 | 0.01 | 0.01 | 0.01 | 0.01 | 0.01 | 0.00 | 0.00 |
|  | current | 0.02 | 0.01 | 0.01 | 0.01 | 0.01 | 0.01 | 0.01 | 0.00 | 0.00 | 0.00 | 0.00 |
|  | **candidate** | 0.02 | 0.02 | 0.01 | 0.01 | 0.01 | 0.01 | 0.01 | 0.01 | 0.01 | 0.00 | 0.00 |
|  | what-if B | 0.02 | 0.02 | 0.01 | 0.01 | 0.01 | 0.01 | 0.01 | 0.01 | 0.01 | 0.00 | 0.00 |
| stable time (s) | original | 0.23 | 0.23 | 0.23 | 0.23 | 0.23 | 0.23 | 0.23 | 0.23 | 0.23 | 0.23 | 0.23 |
|  | current | 0.23 | 0.23 | 0.23 | 0.23 | 0.23 | 0.23 | 0.23 | 0.23 | 0.23 | 0.23 | 0.23 |
|  | **candidate** | 0.23 | 0.23 | 0.23 | 0.23 | 0.23 | 0.23 | 0.23 | 0.23 | 0.23 | 0.23 | 0.23 |
|  | what-if B | 0.23 | 0.23 | 0.23 | 0.23 | 0.23 | 0.23 | 0.23 | 0.23 | 0.23 | 0.23 | 0.23 |

**12 m/s normal ground pass** (D 1.21, FOOT_INSIDE_R)

| measure | scale | 10 | 20 | 30 | 40 | 50 | 60 | 70 | 75 | 80 | 90 | 99 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| imm/adj/rec/uns % | original | 26/1/65/9 | 31/1/64/6 | 38/1/60/2 | 52/2/47/0 | 67/1/31/1 | 83/0/17/1 | 91/0/9/1 | 96/0/4/1 | 99/0/1/0 | 100/0/0/0 | 100/0/0/0 |
|  | current | 53/3/45/0 | 67/1/32/1 | 80/0/19/2 | 88/0/12/1 | 93/0/6/1 | 99/0/1/1 | 100/0/0/0 | 100/0/0/0 | 100/0/0/0 | 100/0/0/0 | 100/0/0/0 |
|  | **candidate** | 41/0/58/2 | 55/2/44/0 | 72/1/28/1 | 83/0/17/1 | 88/0/12/1 | 89/0/10/1 | 91/0/9/1 | 93/0/6/1 | 97/0/3/0 | 100/0/0/0 | 100/0/0/0 |
|  | what-if B | 41/0/58/2 | 54/2/45/0 | 64/1/34/2 | 78/0/22/0 | 85/0/15/1 | 89/0/11/1 | 93/0/6/1 | 96/0/3/1 | 99/0/1/0 | 100/0/0/0 | 100/0/0/0 |
| first-touch velocity error (m/s) | original | 2.31 | 2.03 | 1.77 | 1.50 | 1.24 | 0.99 | 0.74 | 0.62 | 0.50 | 0.27 | 0.09 |
|  | current | 1.47 | 1.23 | 1.02 | 0.84 | 0.67 | 0.53 | 0.40 | 0.34 | 0.29 | 0.18 | 0.08 |
|  | **candidate** | 1.72 | 1.43 | 1.17 | 0.97 | 0.84 | 0.77 | 0.72 | 0.67 | 0.59 | 0.31 | 0.09 |
|  | what-if B | 1.72 | 1.47 | 1.26 | 1.07 | 0.92 | 0.79 | 0.68 | 0.61 | 0.51 | 0.28 | 0.09 |
| 2-s distance (m) | original | 1.24 | 0.95 | 0.76 | 0.56 | 0.41 | 0.27 | 0.17 | 0.13 | 0.10 | 0.05 | 0.01 |
|  | current | 0.53 | 0.40 | 0.29 | 0.21 | 0.15 | 0.11 | 0.07 | 0.06 | 0.05 | 0.03 | 0.01 |
|  | **candidate** | 0.71 | 0.51 | 0.37 | 0.27 | 0.21 | 0.18 | 0.16 | 0.15 | 0.12 | 0.06 | 0.01 |
|  | what-if B | 0.71 | 0.53 | 0.41 | 0.32 | 0.24 | 0.19 | 0.15 | 0.13 | 0.10 | 0.05 | 0.01 |
| stable time (s) | original | 0.76 | 0.70 | 0.66 | 0.45 | 0.25 | 0.23 | 0.23 | 0.23 | 0.23 | 0.23 | 0.23 |
|  | current | 0.42 | 0.23 | 0.23 | 0.23 | 0.23 | 0.23 | 0.23 | 0.23 | 0.23 | 0.23 | 0.23 |
|  | **candidate** | 0.65 | 0.41 | 0.23 | 0.23 | 0.23 | 0.23 | 0.23 | 0.23 | 0.23 | 0.23 | 0.23 |
|  | what-if B | 0.65 | 0.42 | 0.27 | 0.23 | 0.23 | 0.23 | 0.23 | 0.23 | 0.23 | 0.23 | 0.23 |

The 12 m/s pass separates gently: IMMEDIATE 88 / 89 / 91 / 93 / 97 % at 50 / 60 / 70 / 75 / 80, with a second touch only below 30. Normal service stays manageable even at BC 50–60, as you asked.

## 10 · Thigh results

**Thigh — 6 m/s dropping 35° at 0.95 m** (D 0.74, THIGH_R)

| measure | scale | 10 | 20 | 30 | 40 | 50 | 60 | 70 | 75 | 80 | 90 | 99 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| imm/adj/rec/uns % | original | 34/63/4/0 | 39/58/3/0 | 47/53/1/0 | 55/45/1/0 | 73/27/1/0 | 87/13/0/0 | 95/5/0/0 | 98/2/0/0 | 100/0/0/0 | 100/0/0/0 | 100/0/0/0 |
|  | current | 56/44/1/0 | 75/26/0/0 | 86/14/0/0 | 93/7/0/0 | 98/3/0/0 | 100/1/0/0 | 100/0/0/0 | 100/0/0/0 | 100/0/0/0 | 100/0/0/0 | 100/0/0/0 |
|  | **candidate** | 49/51/1/0 | 59/41/1/0 | 77/23/0/0 | 88/12/0/0 | 93/7/0/0 | 94/6/0/0 | 95/5/0/0 | 98/3/0/0 | 99/2/0/0 | 100/0/0/0 | 100/0/0/0 |
|  | what-if B | 49/51/1/0 | 56/44/1/0 | 73/27/1/0 | 82/19/0/0 | 89/11/0/0 | 94/6/0/0 | 97/3/0/0 | 98/2/0/0 | 100/1/0/0 | 100/0/0/0 | 100/0/0/0 |
| drop-point error (m) | original | 0.33 | 0.29 | 0.25 | 0.21 | 0.18 | 0.14 | 0.11 | 0.09 | 0.07 | 0.04 | 0.01 |
|  | current | 0.21 | 0.17 | 0.15 | 0.12 | 0.10 | 0.08 | 0.06 | 0.05 | 0.04 | 0.03 | 0.01 |
|  | **candidate** | 0.24 | 0.20 | 0.17 | 0.14 | 0.12 | 0.11 | 0.10 | 0.10 | 0.09 | 0.05 | 0.01 |
|  | what-if B | 0.24 | 0.21 | 0.18 | 0.15 | 0.13 | 0.12 | 0.10 | 0.09 | 0.08 | 0.04 | 0.01 |
| contacts (mean) | original | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 |
|  | current | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 |
|  | **candidate** | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 |
|  | what-if B | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 |
| recovery distance (m) | original | 0.32 | 0.28 | 0.24 | 0.19 | 0.16 | 0.13 | 0.10 | 0.08 | 0.07 | 0.04 | 0.01 |
|  | current | 0.18 | 0.16 | 0.13 | 0.11 | 0.09 | 0.07 | 0.06 | 0.05 | 0.04 | 0.03 | 0.01 |
|  | **candidate** | 0.23 | 0.18 | 0.15 | 0.13 | 0.11 | 0.10 | 0.09 | 0.09 | 0.08 | 0.05 | 0.01 |
|  | what-if B | 0.23 | 0.18 | 0.16 | 0.14 | 0.12 | 0.10 | 0.09 | 0.08 | 0.07 | 0.04 | 0.01 |
| recovery time (s) | original | 0.12 | 0.11 | 0.07 | 0.05 | 0.02 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
|  | current | 0.04 | 0.02 | 0.01 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
|  | **candidate** | 0.07 | 0.04 | 0.01 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
|  | what-if B | 0.07 | 0.04 | 0.02 | 0.01 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| stable time (s) | original | 0.81 | 0.79 | 0.76 | 0.73 | 0.70 | 0.69 | 0.69 | 0.69 | 0.69 | 0.68 | 0.68 |
|  | current | 0.72 | 0.70 | 0.69 | 0.69 | 0.69 | 0.69 | 0.69 | 0.68 | 0.68 | 0.68 | 0.68 |
|  | **candidate** | 0.76 | 0.72 | 0.70 | 0.69 | 0.69 | 0.69 | 0.69 | 0.69 | 0.69 | 0.68 | 0.68 |
|  | what-if B | 0.76 | 0.72 | 0.70 | 0.69 | 0.69 | 0.69 | 0.69 | 0.69 | 0.69 | 0.68 | 0.68 |
**Thigh — 16 m/s dropping 35° (hard)** (D 1.98, THIGH_R)

| measure | scale | 10 | 20 | 30 | 40 | 50 | 60 | 70 | 75 | 80 | 90 | 99 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| imm/adj/rec/uns % | original | 1/19/47/35 | 1/23/51/26 | 1/30/54/16 | 3/37/52/9 | 5/50/41/5 | 10/56/34/2 | 20/66/15/0 | 30/62/9/0 | 39/57/4/0 | 84/16/0/0 | 100/0/0/0 |
|  | current | 4/36/52/9 | 5/51/41/5 | 10/55/35/2 | 13/65/22/1 | 23/67/11/0 | 36/60/5/0 | 58/42/1/0 | 65/35/1/0 | 81/20/0/0 | 97/4/0/0 | 100/0/0/0 |
|  | **candidate** | 2/30/55/14 | 5/39/49/8 | 6/52/38/5 | 10/57/32/2 | 13/65/22/1 | 17/67/16/0 | 21/65/15/0 | 23/67/11/0 | 31/63/7/0 | 73/27/1/0 | 100/0/0/0 |
|  | what-if B | 2/30/55/14 | 4/36/52/9 | 5/50/41/5 | 8/53/38/3 | 11/63/26/1 | 16/67/18/0 | 23/67/11/0 | 30/62/9/0 | 37/59/5/0 | 82/19/0/0 | 100/0/0/0 |
| drop-point error (m) | original | 1.42 | 1.26 | 1.11 | 0.93 | 0.78 | 0.63 | 0.46 | 0.38 | 0.30 | 0.16 | 0.05 |
|  | current | 0.92 | 0.79 | 0.66 | 0.52 | 0.42 | 0.33 | 0.24 | 0.21 | 0.17 | 0.10 | 0.04 |
|  | **candidate** | 1.09 | 0.89 | 0.77 | 0.62 | 0.52 | 0.48 | 0.45 | 0.42 | 0.36 | 0.19 | 0.05 |
|  | what-if B | 1.09 | 0.92 | 0.79 | 0.69 | 0.58 | 0.49 | 0.42 | 0.38 | 0.32 | 0.17 | 0.05 |
| contacts (mean) | original | 1.69 | 1.78 | 1.86 | 1.92 | 1.97 | 1.99 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 |
|  | current | 1.93 | 1.97 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 |
|  | **candidate** | 1.87 | 1.94 | 1.97 | 1.99 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 |
|  | what-if B | 1.87 | 1.93 | 1.96 | 1.99 | 1.99 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 |
| recovery distance (m) | original | 1.45 | 1.43 | 1.33 | 1.13 | 0.86 | 0.67 | 0.46 | 0.38 | 0.28 | 0.14 | 0.04 |
|  | current | 1.09 | 0.85 | 0.70 | 0.56 | 0.42 | 0.31 | 0.21 | 0.17 | 0.15 | 0.09 | 0.04 |
|  | **candidate** | 1.32 | 1.06 | 0.79 | 0.66 | 0.56 | 0.50 | 0.45 | 0.42 | 0.35 | 0.16 | 0.04 |
|  | what-if B | 1.32 | 1.09 | 0.88 | 0.73 | 0.61 | 0.52 | 0.42 | 0.37 | 0.29 | 0.15 | 0.04 |
| recovery time (s) | original | 0.56 | 0.54 | 0.45 | 0.42 | 0.38 | 0.37 | 0.18 | 0.15 | 0.09 | 0.01 | 0.00 |
|  | current | 0.41 | 0.39 | 0.36 | 0.34 | 0.16 | 0.11 | 0.02 | 0.01 | 0.01 | 0.00 | 0.00 |
|  | **candidate** | 0.45 | 0.39 | 0.38 | 0.37 | 0.34 | 0.23 | 0.18 | 0.16 | 0.13 | 0.01 | 0.00 |
|  | what-if B | 0.45 | 0.41 | 0.38 | 0.36 | 0.36 | 0.25 | 0.16 | 0.14 | 0.10 | 0.01 | 0.00 |
| stable time (s) | original | 1.26 | 1.24 | 1.15 | 1.12 | 1.08 | 1.07 | 0.88 | 0.85 | 0.79 | 0.71 | 0.70 |
|  | current | 1.11 | 1.09 | 1.06 | 1.04 | 0.86 | 0.81 | 0.72 | 0.71 | 0.71 | 0.70 | 0.70 |
|  | **candidate** | 1.15 | 1.09 | 1.07 | 1.07 | 1.04 | 0.93 | 0.88 | 0.86 | 0.83 | 0.71 | 0.70 |
|  | what-if B | 1.15 | 1.11 | 1.08 | 1.06 | 1.06 | 0.95 | 0.86 | 0.84 | 0.80 | 0.71 | 0.70 |

## 11 · Chest results

**Chest — 8 m/s dropping 20° at 1.32 m** (D 1.05, CHEST)

| measure | scale | 10 | 20 | 30 | 40 | 50 | 60 | 70 | 75 | 80 | 90 | 99 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| imm/adj/rec/uns % | original | 11/41/44/4 | 16/48/34/2 | 21/51/27/1 | 27/55/19/0 | 35/53/13/0 | 47/47/7/0 | 62/37/2/0 | 71/29/0/0 | 82/19/0/0 | 97/4/0/0 | 100/0/0/0 |
|  | current | 35/52/13/0 | 44/48/9/0 | 53/45/3/0 | 65/35/1/0 | 76/25/0/0 | 84/16/0/0 | 89/12/0/0 | 95/5/0/0 | 98/2/0/0 | 99/1/0/0 | 100/0/0/0 |
|  | **candidate** | 28/56/17/0 | 37/53/11/0 | 47/47/7/0 | 56/43/2/0 | 65/35/1/0 | 70/30/1/0 | 71/29/0/0 | 76/25/0/0 | 82/18/0/0 | 97/4/0/0 | 100/0/0/0 |
|  | what-if B | 28/56/17/0 | 35/52/13/0 | 42/49/10/0 | 51/46/4/0 | 60/39/2/0 | 68/31/1/0 | 76/25/0/0 | 80/21/0/0 | 84/16/0/0 | 98/2/0/0 | 100/0/0/0 |
| drop-point error (m) | original | 0.72 | 0.63 | 0.55 | 0.47 | 0.38 | 0.30 | 0.23 | 0.19 | 0.15 | 0.08 | 0.03 |
|  | current | 0.38 | 0.32 | 0.26 | 0.22 | 0.17 | 0.14 | 0.10 | 0.09 | 0.07 | 0.05 | 0.02 |
|  | **candidate** | 0.45 | 0.37 | 0.30 | 0.25 | 0.22 | 0.20 | 0.18 | 0.17 | 0.15 | 0.08 | 0.02 |
|  | what-if B | 0.45 | 0.38 | 0.32 | 0.28 | 0.24 | 0.21 | 0.17 | 0.16 | 0.13 | 0.07 | 0.02 |
| contacts (mean) | original | 2.01 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 |
|  | current | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 |
|  | **candidate** | 2.01 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 |
|  | what-if B | 2.01 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 |
| recovery distance (m) | original | 0.87 | 0.69 | 0.55 | 0.45 | 0.36 | 0.27 | 0.21 | 0.19 | 0.17 | 0.11 | 0.03 |
|  | current | 0.36 | 0.28 | 0.23 | 0.20 | 0.18 | 0.16 | 0.13 | 0.12 | 0.09 | 0.05 | 0.02 |
|  | **candidate** | 0.43 | 0.34 | 0.27 | 0.22 | 0.20 | 0.20 | 0.19 | 0.18 | 0.17 | 0.11 | 0.02 |
|  | what-if B | 0.43 | 0.36 | 0.29 | 0.25 | 0.21 | 0.20 | 0.18 | 0.17 | 0.16 | 0.09 | 0.02 |
| recovery time (s) | original | 0.50 | 0.23 | 0.12 | 0.06 | 0.03 | 0.01 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
|  | current | 0.03 | 0.02 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
|  | **candidate** | 0.05 | 0.03 | 0.01 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
|  | what-if B | 0.05 | 0.03 | 0.02 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| stable time (s) | original | 1.17 | 0.90 | 0.80 | 0.73 | 0.70 | 0.68 | 0.67 | 0.67 | 0.67 | 0.67 | 0.67 |
|  | current | 0.70 | 0.69 | 0.67 | 0.67 | 0.67 | 0.67 | 0.67 | 0.67 | 0.67 | 0.67 | 0.67 |
|  | **candidate** | 0.72 | 0.70 | 0.68 | 0.67 | 0.67 | 0.67 | 0.67 | 0.67 | 0.67 | 0.67 | 0.67 |
|  | what-if B | 0.72 | 0.70 | 0.69 | 0.68 | 0.67 | 0.67 | 0.67 | 0.67 | 0.67 | 0.67 | 0.67 |
**Chest — 20 m/s dropping 20° (hard)** (D 2.57, CHEST)

| measure | scale | 10 | 20 | 30 | 40 | 50 | 60 | 70 | 75 | 80 | 90 | 99 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| imm/adj/rec/uns % | original | 0/8/22/71 | 1/9/27/64 | 1/13/28/59 | 3/18/29/51 | 5/20/38/38 | 7/26/42/26 | 11/40/35/15 | 17/45/28/12 | 23/52/20/6 | 51/43/7/0 | 97/3/0/0 |
|  | current | 5/20/38/38 | 7/23/43/28 | 7/36/37/21 | 12/43/31/15 | 18/50/24/9 | 27/53/18/3 | 40/48/12/1 | 47/45/9/0 | 55/42/4/0 | 83/18/0/0 | 99/1/0/0 |
|  | **candidate** | 3/18/33/47 | 5/20/39/36 | 7/27/41/26 | 7/38/37/19 | 12/43/31/15 | 14/44/29/13 | 17/47/26/11 | 18/50/24/9 | 23/52/20/6 | 52/42/7/0 | 99/1/0/0 |
|  | what-if B | 3/18/33/47 | 5/20/38/38 | 7/23/42/29 | 7/33/39/22 | 9/41/33/18 | 14/42/30/15 | 17/50/25/9 | 22/52/21/6 | 29/53/17/3 | 56/42/3/0 | 99/1/0/0 |
| drop-point error (m) | original | 2.71 | 2.46 | 2.28 | 1.84 | 1.57 | 1.23 | 0.85 | 0.70 | 0.54 | 0.28 | 0.07 |
|  | current | 1.55 | 1.29 | 1.02 | 0.81 | 0.62 | 0.49 | 0.36 | 0.31 | 0.25 | 0.15 | 0.06 |
|  | **candidate** | 1.74 | 1.44 | 1.22 | 0.95 | 0.81 | 0.75 | 0.68 | 0.62 | 0.54 | 0.28 | 0.06 |
|  | what-if B | 1.74 | 1.55 | 1.31 | 1.08 | 0.92 | 0.77 | 0.64 | 0.57 | 0.47 | 0.25 | 0.06 |
| contacts (mean) | original | 1.31 | 1.39 | 1.45 | 1.52 | 1.63 | 1.75 | 1.85 | 1.89 | 1.95 | 2.00 | 2.00 |
|  | current | 1.63 | 1.73 | 1.79 | 1.85 | 1.91 | 1.98 | 1.99 | 2.00 | 2.00 | 2.00 | 2.00 |
|  | **candidate** | 1.56 | 1.65 | 1.75 | 1.81 | 1.85 | 1.87 | 1.89 | 1.91 | 1.95 | 2.00 | 2.00 |
|  | what-if B | 1.56 | 1.62 | 1.72 | 1.78 | 1.83 | 1.85 | 1.91 | 1.94 | 1.98 | 2.00 | 2.00 |
| recovery distance (m) | original | 1.64 | 1.58 | 1.47 | 1.49 | 1.39 | 1.11 | 0.82 | 0.66 | 0.52 | 0.24 | 0.08 |
|  | current | 1.35 | 1.16 | 0.95 | 0.77 | 0.61 | 0.48 | 0.31 | 0.26 | 0.22 | 0.15 | 0.06 |
|  | **candidate** | 1.47 | 1.35 | 1.10 | 0.91 | 0.77 | 0.70 | 0.65 | 0.61 | 0.51 | 0.24 | 0.06 |
|  | what-if B | 1.47 | 1.35 | 1.13 | 1.00 | 0.84 | 0.73 | 0.61 | 0.53 | 0.42 | 0.22 | 0.06 |
| recovery time (s) | original | 0.55 | 0.55 | 0.53 | 0.51 | 0.54 | 0.49 | 0.47 | 0.20 | 0.09 | 0.01 | 0.00 |
|  | current | 0.53 | 0.49 | 0.49 | 0.37 | 0.16 | 0.06 | 0.03 | 0.01 | 0.01 | 0.00 | 0.00 |
|  | **candidate** | 0.54 | 0.53 | 0.49 | 0.48 | 0.37 | 0.24 | 0.19 | 0.16 | 0.07 | 0.01 | 0.00 |
|  | what-if B | 0.54 | 0.53 | 0.49 | 0.49 | 0.48 | 0.26 | 0.16 | 0.11 | 0.05 | 0.01 | 0.00 |
| stable time (s) | original | 1.25 | 1.25 | 1.22 | 1.20 | 1.23 | 1.18 | 1.17 | 0.89 | 0.78 | 0.70 | 0.69 |
|  | current | 1.23 | 1.18 | 1.18 | 1.06 | 0.85 | 0.75 | 0.72 | 0.70 | 0.70 | 0.69 | 0.69 |
|  | **candidate** | 1.23 | 1.22 | 1.18 | 1.18 | 1.06 | 0.93 | 0.88 | 0.85 | 0.77 | 0.70 | 0.69 |
|  | what-if B | 1.23 | 1.23 | 1.18 | 1.18 | 1.17 | 0.95 | 0.85 | 0.80 | 0.75 | 0.70 | 0.69 |

## 12 · Head results

**Head — 6 m/s dropping 15° at 1.78 m** (D 1.08, HEAD)

| measure | scale | 10 | 20 | 30 | 40 | 50 | 60 | 70 | 75 | 80 | 90 | 99 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| imm/adj/rec/uns % | original | 4/28/56/13 | 4/35/53/9 | 8/41/47/5 | 13/45/39/4 | 16/57/27/1 | 20/67/13/1 | 26/69/6/0 | 33/64/3/0 | 45/54/2/0 | 79/22/0/0 | 100/0/0/0 |
|  | current | 16/58/26/1 | 20/66/14/0 | 23/71/7/0 | 30/66/4/0 | 40/59/2/0 | 52/48/1/0 | 65/35/0/0 | 76/25/0/0 | 86/15/0/0 | 97/4/0/0 | 100/0/0/0 |
|  | **candidate** | 13/50/35/3 | 16/60/24/1 | 21/67/13/0 | 25/70/6/0 | 30/66/4/0 | 33/65/3/0 | 37/61/3/0 | 40/59/2/0 | 49/51/1/0 | 82/19/0/0 | 100/0/0/0 |
|  | what-if B | 13/50/35/3 | 16/58/26/1 | 20/66/14/1 | 22/71/8/0 | 26/69/6/0 | 31/66/4/0 | 40/58/2/0 | 47/52/2/0 | 54/47/0/0 | 87/14/0/0 | 100/0/0/0 |
| drop-point error (m) | original | 1.38 | 1.28 | 1.09 | 0.92 | 0.81 | 0.65 | 0.50 | 0.44 | 0.34 | 0.20 | 0.07 |
|  | current | 0.77 | 0.70 | 0.55 | 0.46 | 0.36 | 0.30 | 0.23 | 0.20 | 0.16 | 0.10 | 0.05 |
|  | **candidate** | 0.87 | 0.75 | 0.63 | 0.54 | 0.46 | 0.43 | 0.39 | 0.36 | 0.33 | 0.20 | 0.06 |
|  | what-if B | 0.87 | 0.77 | 0.68 | 0.61 | 0.48 | 0.45 | 0.36 | 0.34 | 0.30 | 0.16 | 0.06 |
| contacts (mean) | original | 1.95 | 1.96 | 1.98 | 1.99 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 |
|  | current | 2.02 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 |
|  | **candidate** | 2.02 | 2.02 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 |
|  | what-if B | 2.02 | 2.02 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 |
| recovery distance (m) | original | 1.48 | 1.25 | 0.97 | 0.77 | 0.65 | 0.53 | 0.40 | 0.32 | 0.28 | 0.17 | 0.06 |
|  | current | 0.62 | 0.53 | 0.44 | 0.35 | 0.29 | 0.24 | 0.19 | 0.17 | 0.15 | 0.11 | 0.04 |
|  | **candidate** | 0.73 | 0.60 | 0.51 | 0.42 | 0.35 | 0.33 | 0.31 | 0.29 | 0.27 | 0.16 | 0.05 |
|  | what-if B | 0.73 | 0.62 | 0.54 | 0.46 | 0.39 | 0.34 | 0.30 | 0.28 | 0.23 | 0.15 | 0.05 |
| recovery time (s) | original | 0.45 | 0.29 | 0.15 | 0.07 | 0.04 | 0.02 | 0.02 | 0.01 | 0.01 | 0.01 | 0.00 |
|  | current | 0.04 | 0.03 | 0.02 | 0.02 | 0.01 | 0.01 | 0.01 | 0.01 | 0.00 | 0.00 | 0.00 |
|  | **candidate** | 0.06 | 0.04 | 0.03 | 0.02 | 0.02 | 0.02 | 0.01 | 0.01 | 0.01 | 0.01 | 0.00 |
|  | what-if B | 0.06 | 0.04 | 0.03 | 0.02 | 0.02 | 0.02 | 0.01 | 0.01 | 0.01 | 0.00 | 0.00 |
| stable time (s) | original | 1.41 | 1.25 | 1.11 | 1.02 | 1.00 | 0.98 | 0.98 | 0.97 | 0.97 | 0.97 | 0.96 |
|  | current | 1.00 | 0.99 | 0.98 | 0.97 | 0.97 | 0.97 | 0.97 | 0.97 | 0.96 | 0.96 | 0.96 |
|  | **candidate** | 1.02 | 1.00 | 0.98 | 0.98 | 0.97 | 0.97 | 0.97 | 0.97 | 0.97 | 0.97 | 0.96 |
|  | what-if B | 1.02 | 1.00 | 0.98 | 0.98 | 0.98 | 0.97 | 0.97 | 0.97 | 0.97 | 0.96 | 0.96 |
**Head — 15 m/s dropping 25° (hard, forced)** (D 2.77, HEAD)

| measure | scale | 10 | 20 | 30 | 40 | 50 | 60 | 70 | 75 | 80 | 90 | 99 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| imm/adj/rec/uns % | original | 0/2/14/85 | 0/2/16/82 | 0/4/19/78 | 0/7/20/74 | 1/9/23/68 | 1/14/30/56 | 3/16/45/37 | 3/21/51/26 | 6/30/49/16 | 18/58/23/2 | 79/21/0/0 |
|  | current | 1/11/24/66 | 1/14/28/58 | 2/13/40/45 | 3/18/49/31 | 4/26/51/20 | 8/35/46/13 | 13/49/34/5 | 17/56/26/2 | 21/64/16/0 | 45/53/3/0 | 90/11/0/0 |
|  | **candidate** | 0/8/23/70 | 1/11/24/65 | 1/14/31/55 | 2/14/44/41 | 3/18/49/31 | 3/21/50/27 | 3/23/50/25 | 4/26/51/20 | 6/32/47/16 | 18/61/21/1 | 87/13/0/0 |
|  | what-if B | 0/8/23/70 | 1/11/24/66 | 1/13/29/58 | 2/13/36/50 | 3/16/45/37 | 3/19/51/28 | 4/26/51/20 | 4/32/48/17 | 8/35/46/12 | 21/64/16/0 | 87/13/0/0 |
| drop-point error (m) | original | 4.92 | 4.74 | 4.12 | 3.78 | 3.32 | 2.68 | 2.03 | 1.72 | 1.35 | 0.74 | 0.20 |
|  | current | 3.26 | 2.77 | 2.21 | 1.93 | 1.52 | 1.23 | 0.89 | 0.78 | 0.62 | 0.40 | 0.16 |
|  | **candidate** | 3.39 | 2.98 | 2.48 | 2.10 | 1.93 | 1.76 | 1.62 | 1.52 | 1.29 | 0.69 | 0.17 |
|  | what-if B | 3.39 | 3.26 | 2.71 | 2.33 | 2.03 | 1.76 | 1.56 | 1.35 | 1.15 | 0.62 | 0.17 |
| contacts (mean) | original | 1.19 | 1.22 | 1.26 | 1.29 | 1.34 | 1.46 | 1.65 | 1.75 | 1.84 | 1.98 | 2.00 |
|  | current | 1.37 | 1.45 | 1.56 | 1.70 | 1.80 | 1.88 | 1.96 | 1.98 | 2.00 | 2.00 | 2.00 |
|  | **candidate** | 1.35 | 1.39 | 1.47 | 1.60 | 1.70 | 1.74 | 1.76 | 1.80 | 1.84 | 1.99 | 2.00 |
|  | what-if B | 1.35 | 1.37 | 1.44 | 1.51 | 1.65 | 1.73 | 1.81 | 1.83 | 1.90 | 2.00 | 2.00 |
| recovery distance (m) | original | 1.87 | 1.70 | 1.60 | 1.61 | 1.50 | 1.65 | 1.70 | 1.66 | 1.35 | 0.59 | 0.15 |
|  | current | 1.56 | 1.67 | 1.79 | 1.66 | 1.47 | 1.10 | 0.75 | 0.62 | 0.50 | 0.28 | 0.12 |
|  | **candidate** | 1.70 | 1.52 | 1.70 | 1.72 | 1.66 | 1.67 | 1.50 | 1.47 | 1.25 | 0.56 | 0.13 |
|  | what-if B | 1.70 | 1.56 | 1.71 | 1.77 | 1.70 | 1.74 | 1.48 | 1.33 | 1.06 | 0.49 | 0.13 |
| recovery time (s) | original | 0.38 | 0.39 | 0.51 | 0.45 | 0.47 | 0.46 | 0.45 | 0.37 | 0.19 | 0.03 | 0.00 |
|  | current | 0.39 | 0.43 | 0.46 | 0.43 | 0.27 | 0.11 | 0.05 | 0.03 | 0.02 | 0.01 | 0.00 |
|  | **candidate** | 0.55 | 0.35 | 0.45 | 0.45 | 0.43 | 0.39 | 0.30 | 0.27 | 0.15 | 0.03 | 0.00 |
|  | what-if B | 0.55 | 0.39 | 0.42 | 0.45 | 0.45 | 0.40 | 0.28 | 0.20 | 0.10 | 0.02 | 0.00 |
| stable time (s) | original | 1.43 | 1.44 | 1.55 | 1.50 | 1.52 | 1.51 | 1.50 | 1.42 | 1.23 | 1.08 | 1.05 |
|  | current | 1.44 | 1.48 | 1.50 | 1.48 | 1.31 | 1.15 | 1.10 | 1.08 | 1.07 | 1.06 | 1.05 |
|  | **candidate** | 1.59 | 1.40 | 1.50 | 1.50 | 1.48 | 1.43 | 1.34 | 1.31 | 1.20 | 1.07 | 1.05 |
|  | what-if B | 1.59 | 1.44 | 1.47 | 1.50 | 1.50 | 1.45 | 1.32 | 1.24 | 1.14 | 1.07 | 1.05 |

**On aerials and "not cartoonishly bad".**
- The manageable thigh, chest and head stay two-contact actions at every rating, with no loose balls at BC 30 and above.
- The hard aerials (16 m/s thigh, 20 m/s chest, 15 m/s forced header) are where the candidate is harsh. Between BC 40 and 75 they become UNSTABLE in up to 19 % / 26 % / 55 % of seeds, the same as current BC 30–50.

## 13 · Complete follow-up-control results

The structure is unchanged from RECEIVE-KILL-1.1 (and approved). Every thigh, chest and head control is a sequence:
1. the first action;
2. a planned foot follow-up (sole in the ideal episode; inside or instep when the ball runs away);
3. a third contact only when the follow-up itself fails to settle the ball.

At most three contacts.

Follow-up time (median, candidate; in seconds after the first contact):

| benchmark | BC 40 | 50 | 70 | 75 | 80 | 90 | 99 |
|---|---|---|---|---|---|---|---|
| 22 m/s hard ground pass | 0.63 | 0.57 | 0.52 | 0.50 | 0.47 | 0.42 | – |
| Thigh — 6 m/s dropping 35° at 0.95 m | 0.46 | 0.46 | 0.46 | 0.46 | 0.46 | 0.46 | 0.46 |
| Thigh — 16 m/s dropping 35° (hard) | 0.84 | 0.73 | 0.64 | 0.63 | 0.60 | 0.48 | 0.48 |
| Chest — 8 m/s dropping 20° at 1.32 m | 0.45 | 0.45 | 0.45 | 0.45 | 0.45 | 0.45 | 0.45 |
| Chest — 20 m/s dropping 20° (hard) | 0.75 | 0.66 | 0.62 | 0.61 | 0.54 | 0.48 | 0.47 |
| Head — 6 m/s dropping 15° at 1.78 m | 0.75 | 0.75 | 0.75 | 0.75 | 0.75 | 0.74 | 0.73 |
| Head — 15 m/s dropping 25° (hard, forced) | 1.27 | 1.25 | 1.11 | 1.09 | 0.97 | 0.85 | 0.82 |

**How lower ratings show up.** Mostly as a later and longer follow-up, plus an extra step: the "less ideal first touch → extra adjustment → later follow-up → perhaps an extra touch → delayed continuation" chain. A ball flying far is not the main effect. On the 22 m/s pass the follow-up comes at 0.48 s (BC 80) → 0.58 s (BC 50) → 0.63 s (BC 40) after the touch.

## 14 · Recovery distance / time

Recovery distance and time are in the tables of items 7 and 9–12. On the 22 m/s pass the medians are 0 at BC 75 and above, because more than half of the seeds need no extra step. Below 75 they are 0.34 m / 0.39 s (BC 70), 0.49 / 0.43 (BC 60), 0.59 / 0.47 (BC 50) and 0.73 / 0.51 (BC 40).

## 15 · Stable-control timing

Stable-control times are in the same tables. On the 22 m/s pass the median is:

| BC | 99–90 | 80 | 75 | 70 | 60 | 50 | 40 | 30 | 10 |
|---|---|---|---|---|---|---|---|---|---|
| stable at (s) | 0.23 | 0.31 | 0.48 | 0.61 | 0.66 | 0.69 | 0.74 | 0.83 | 1.06 |

The ideal is 0.23 s. Manageable aerials barely move (chest 0.67 s at every rating ≥ 40); the cost appears as the extra step.

## 16 · Matched visual comparisons

Ratings BC 40 · 50 · 60 · 70 · 75 · 80 · 90 · 99 (TYPICAL draw), the same ball and the same draws in every tile:
- `compare/<case>_compare.mp4`: a 2 × 4 side-by-side clip;
- `compare/<case>_grid.jpg`: a still grid, rows = rating, columns −0.10 / contact / +0.25 / +0.50 / +0.80 / +1.20 s.

The cases are `normal` (12 m/s), `hard` (22 m/s), `thighM`, `chestM` and `headM`. The same set at the CURRENT scale is in `compare_current/`. Candidate BC 75 is exactly current BC 50's tile, and candidate BC 50 is current BC 40's.

What the TYPICAL-draw tiles show (my judgement from the stills, plus each tile's measured label):

| case | candidate A (40 / 50 / 60 / 70 / 75 / 80 / 90 / 99) | current (same ratings) |
|---|---|---|
| 12 m/s pass | 40 IMM1 +0.00m · 50 IMM1 +0.00m · 60 IMM1 +0.00m · 70 IMM1 +0.00m · 75 IMM1 +0.00m · 80 IMM1 +0.00m · 90 IMM1 +0.00m · 99 IMM1 +0.00m | 40 IMM1 +0.00m · 50 IMM1 +0.00m · 60 IMM1 +0.00m · 70 IMM1 +0.00m · 75 IMM1 +0.00m · 80 IMM1 +0.00m · 90 IMM1 +0.00m · 99 IMM1 +0.00m |
| 22 m/s pass | 40 REC2 +0.74m · 50 REC2 +0.55m · 60 REC2 +0.43m · 70 REC2 +0.38m · 75 REC2 +0.34m · 80 IMM1 +0.00m · 90 IMM1 +0.00m · 99 IMM1 +0.00m | 40 REC2 +0.55m · 50 REC2 +0.34m · 60 IMM1 +0.00m · 70 IMM1 +0.00m · 75 IMM1 +0.00m · 80 IMM1 +0.00m · 90 IMM1 +0.00m · 99 IMM1 +0.00m |
| thigh 6 m/s | 40 IMM2 +0.15m · 50 IMM2 +0.13m · 60 IMM2 +0.12m · 70 IMM2 +0.11m · 75 IMM2 +0.10m · 80 IMM2 +0.09m · 90 IMM2 +0.05m · 99 IMM2 +0.02m | 40 IMM2 +0.13m · 50 IMM2 +0.10m · 60 IMM2 +0.08m · 70 IMM2 +0.06m · 75 IMM2 +0.05m · 80 IMM2 +0.04m · 90 IMM2 +0.03m · 99 IMM2 +0.01m |
| chest 8 m/s | 40 ADJ2 +0.30m · 50 ADJ2 +0.26m · 60 IMM2 +0.24m · 70 IMM2 +0.22m · 75 IMM2 +0.21m · 80 IMM2 +0.18m · 90 IMM2 +0.10m · 99 IMM2 +0.03m | 40 ADJ2 +0.26m · 50 IMM2 +0.21m · 60 IMM2 +0.17m · 70 IMM2 +0.13m · 75 IMM2 +0.11m · 80 IMM2 +0.09m · 90 IMM2 +0.06m · 99 IMM2 +0.03m |
| head 6 m/s | 40 ADJ2 +0.59m · 50 ADJ2 +0.51m · 60 ADJ2 +0.47m · 70 ADJ2 +0.43m · 75 ADJ2 +0.41m · 80 ADJ2 +0.35m · 90 IMM2 +0.19m · 99 IMM2 +0.05m | 40 ADJ2 +0.51m · 50 ADJ2 +0.41m · 60 ADJ2 +0.32m · 70 IMM2 +0.24m · 75 IMM2 +0.21m · 80 IMM2 +0.17m · 90 IMM2 +0.10m · 99 IMM2 +0.05m |

**Reading the hard pass from the stills.**
- BC 40–75 all take a heavy first touch that runs away, then a second touch; the extra step shrinks from 0.74 to 0.34 m.
- The visible break comes between 75 and 80: one clean touch from 80 upwards.
- In RECEIVE-KILL-1.1 that break sits between 50 and 60.

**Reading the aerials from the stills.**
- Chest and head look much alike from 40 to 80 at this draw. The extra step goes 0.30 → 0.18 m (chest) and 0.59 → 0.35 m (head).
- 90 and 99 are visibly cleaner.
- The TYPICAL draw is a moderate draw: the 12 m/s pass is one clean touch at every rating here. The 200-seed shares in items 9–12 show the spread.

## 17 · Deterministic verification

All in `evidence/`:
- **Scale machinery (rk12_scalecheck.json):**
  - at the CURRENT scale = RECEIVE-KILL-1.1: 162/162 episodes, bit-identical;
  - at the ORIGINAL scale = RECEIVE-KILL-1's evidence: 90/90 cells.
- **Matched draws (rk12_determinism.json):**
  - every contact's draws identical across BC: 152/152;
  - first-contact error = the same vector × E: 907/907 (17 capped by restitution, max relative deviation 3.5e-15);
  - different seeds differ: 70/70.
- **Replay:** 252/252.
- **Fresh-world schedule path:** 252/252 (389 contacts).
- **Animation on / off:** 14/14.
- **Chrome = Node (rk12_chrome_node.json):** 45/45 bit-identical, decisions 45/45.
- **Arithmetic:** PCHIP uses + − × ÷ only; the chain keeps the deterministic dsin / dcos / dexp / dlog / datan2.

## 18 · Regressions

- **The other models' code (rk12_regression.json):**
  - RECEIVE-KILL-1.1: 90/90 episodes = its evidence, before and after;
  - RECEIVE-KILL-1: 90/90 cells = its evidence.
- **DRIBBLE-V1:**
  - 60/60 runs before == after 715 episodes run in between;
  - frozen evidence of record 48/48.
- **RECEIVE-CONTROL-1.1:**
  - 11/11 review cases;
  - full matrix rerun 714/714 identical to `receive11/evidence/matrix_714.json` (receive11_matrix_714_rerun_compare.json).
- **Frozen parameters:** D1 / RX / RXE unchanged.
- **Frozen and protected files** (`frozen_sha256_start.txt` → `frozen_sha256_end_check.txt`): 122/122 IDENTICAL. This covers DRIBBLE-V1, TURN-1.2, RUN-1, BALL-FEEL / BALL-PHYS, tackle, RECEIVE-CONTROL-1.1, RECEIVE-KILL-1 and RECEIVE-KILL-1.1.

## 19 · Performance

Node, measured alone (rk12_cpu.json; RECEIVE-KILL-1.1 in brackets):

| first surface | first contact (ms) | whole episode (ms) | worst episode (ms) |
|---|---|---|---|
| FOOT | 0.174 (0.172) | **3.51** (3.38) | 7.91 (7.84) |
| THIGH | 0.146 (0.148) | **4.98** (5.16) | 6.13 (5.81) |
| CHEST | 0.040 (0.039) | **4.94** (4.93) | 5.44 (5.47) |
| HEAD | 0.054 (0.050) | **4.18** (4.22) | 5.25 (5.21) |

The remap adds one PCHIP evaluation per contact, which does not show in the timings.

## 20 · Links (local server :8361, LOCAL ONLY — the character is a real player's model)

- **Review:** `review_artifacts/receive_kill12/review/RECEIVE_KILL12_REVIEW.html` → http://127.0.0.1:8361/review_artifacts/receive_kill12/review/RECEIVE_KILL12_REVIEW.html
- **Matrix (scale selector):** http://127.0.0.1:8361/sandbox/visual/receive_kill12.html?m=BENCH (`&scale=current|original|candidate`)
- **Lab (scale selector):** http://127.0.0.1:8361/sandbox/visual/receive_kill12_lab.html?v=22&bc=75 (`&scale=…`, `&compare=1` for tiles)
- **Evidence:** `evidence/rk12_three_scales.md|json` (all measures × three scales), `rk12_whatif_B.json`, `rk12_distribution.json` (candidate matrices, 200 seeds), plus the determinism, regression and CPU files above.
- **Earlier reviews:** RECEIVE-KILL-1.1 http://127.0.0.1:8361/review_artifacts/receive_kill11/review/RECEIVE_KILL11_REVIEW.html · RECEIVE-KILL-1 http://127.0.0.1:8361/review_artifacts/receive_kill1/review/RECEIVE_KILL1_REVIEW.html

## Not done / limitations

- **Not frozen.** The curve is not locked and is not integrated into RECEIVE-CONTROL-1.1.
- **Pure remap.** The candidate cannot produce any outcome the current scale does not produce at some rating. If you want the shape of the response to change (not just which rating gets which quality), that is a different change.
- **Body and conditions unchanged from 1.1.** The placeholder body is not in the ball's world. The receiver is stationary in clean conditions, and follow-ups are foot controls only.
- **What-if B is evidence only.** It is not selectable in the pages.
