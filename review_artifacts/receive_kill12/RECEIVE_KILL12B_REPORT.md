# RECEIVE-KILL-1.2 B — Ball Control scale candidate B (NOT frozen, NOT integrated)

Date 19 Oct 2026 · branch `prototype/dribble-1` · code `sandbox/visual/receive_kill12/` · owner decision verbatim in `sources/2026-10-19_user_instruction_receive_kill_1_2_choose_B.md` · first round (candidate A) kept as presented: `RECEIVE_KILL12_REPORT.md`, `review/RECEIVE_KILL12_REVIEW.html`.

**I cannot play video in real time.** Every visual statement below comes from the still grids and stills, not from watching the clips.

## Summary

- **Your decision.** "Use Alternative B. Do not preserve the two anchors exactly." B is now built into the model as a selectable scale and is the **candidate** (the default of the lab and the matrix). The scales original · current · A · B all stay selectable (`&scale=`). Not frozen, not integrated into RECEIVE-CONTROL-1.1.
- **It behaves as measured.** As a built-in scale, B reproduces the first round's what-if B evidence in **99/99** benchmark × rating cells (every measure and every class share, 200 seeds). Chrome computes exactly what Node computes at every scale (**180/180** episodes bit-identical). The matched-rating stills show the measured result on every tile (item 10).
- **What B looks like on the 22 m/s pass.** Clean first touch (IMMEDIATE) at BC 50 / 60 / 70 / 75 / 80 / 90 / 99: **29 / 37 / 47 / 57 / 73 / 95 / 100 %**. Median time to stable control: 0.73 / 0.65 / 0.55 / 0.36 / 0.23 / 0.23 s. In RECEIVE-KILL-1.1 the same ratings gave 49 / 69 / 85 / 89 / 95 / 100 / 100 % and 0.48 / 0.23 / 0.23 / 0.23 / 0.23 / 0.23 s, so 70 / 75 / 80 looked almost the same. With B every step from 50 to 80 is visible: +8 to +16 points of clean share per step, and the median stable time falls at every step until 80.
- **Easy balls stay compressed.** The 2 m/s roller is IMMEDIATE at every rating, stable at 0.23 s, with a 2-s distance of at most 0.02 m.
- **The 99 endpoint is kept.** New BC 99 executes like current BC 98.5; at a hard pass E is 0.0088 (current BC 99: 0.0081). 90 → 99 keeps its gap: on the 22 m/s pass the clean share is 95 → 100 % and the 2-s distance 0.13 → 0.03 m.
- **Anchors, approximately.** New BC 75 has 0.90 × current BC 50's error and new BC 50 has 1.10 × current BC 40's (A had them exactly). With the same seed, new 75 and current 50 end in the same class in 85–100 % of seeds.
- **Everything else is RECEIVE-KILL-1.1's.** The incoming-difficulty model, surfaces, keyed draws, elite floor, follow-up control, stable-control measurement, continuation classes and the thigh / chest / head sequences are unchanged. The protected systems are untouched (item 13).

**Two things you should know before you judge it.**

1. **Where the middle got wider.** Measured as the clean-share gain from BC 50 to BC 80, B spreads the middle wider than RECEIVE-KILL-1.1 on the 12 m/s pass (14 vs 7 points), the manageable thigh (11 vs 3) and chest (25 vs 23). It is about equal on the 22 m/s pass (44 vs 46), and narrower on the header (28 vs 46) and the hard aerials (thigh 27 vs 58, chest 20 vs 38). On those balls B is harsh enough that 50–80 all sit low (26 / 31 / 40 / 47 / 54 % on the 6 m/s header), and their separation moves up to 80 → 99 (54 / 87 / 100 %). Against A, B is wider on every benchmark.
2. **BC 70–90 executes at about the original model's error.** On a hard pass B's error at BC 70 / 75 / 80 / 90 is 0.83 / 0.97 / 1.08 / 1.13 of the way from current to original (0 = current, 1 = original). Below BC 60 it stays close to current (0.30 / 0.36 / 0.43 at BC 20 / 40 / 50). This comes from the BC 75 anchor itself: current BC 50 is already about as harsh as the original model's BC 75. A went further (BC 80: 1.43). The same holds on the hardest aerial service at BC 90: the 20 m/s chest is 56 % clean (RECEIVE-KILL-1.1 83 %). It does not bring back the original model's low end: at BC 10–40 the hard pass is UNSTABLE in 39 / 25 / 16 / 10 % of seeds (original 63 / 54 / 40 / 27 %).

---

## 1 · What changed in the code

- `rk_model.js`:
  - `KNOTS = { A, B }` and `CANDIDATE = "B"`; the default `RK.exec.knots` is `KNOTS[CANDIDATE]`;
  - `SCALES` is now {original, current, A, B}, each with a short `tag` for tile labels;
  - `scaleKey()` maps `"candidate"` to B, so old `&scale=candidate` links open B.
- `rk_lab.js` and `rk_matrix_page.js`:
  - the selector lists all four scales;
  - the "executes like current BC g" line shows for any remap scale;
  - comparison tiles are labelled `BC 75 · B`;
  - the matrix's 200-seed overlay reads `rk12b_distribution.json` at B (A keeps `rk12_distribution.json`).
- **Tools:**
  - `rk_three` runs all four scales and the anchors per 1.2 scale;
  - `rk_chrome` and `rk_compare_typical` take a scale list, and `rk_compare.sh` defaults to `SCALE=B`;
  - new: `rk_asmeasured.py`, `rk_review_build_b.mjs`, `rk_status_b.py`;
  - `rk_review_build.mjs` is pinned to scale A, so the first-round page rebuilds as presented. Its only diff is a "superseded" banner and `&scale=A` on its live links.
- **Nothing else.** `receive_kill1/`, `receive_kill11/`, RECEIVE-CONTROL-1.1 and every frozen file are byte-identical (item 13).

## 2 · Curve B — formula and exact relationship

```
CURRENT (1.1)  E(BC, D) = 0.0068 + 0.25 · s(u) · c(D),  s(u) = u·(0.68 + 0.32·u²),  u = (100 − BC)/90,  c(D) = D/(D + 1)
CANDIDATE B    E_B(BC, D) = E_current(g_B(BC), D)
               g_B = monotone cubic Hermite (PCHIP, Fritsch–Carlson), arithmetic only, through
               (1, −8.5)  (10, 0.7)  (50, 35.4)  (75, 54.5)  (99, 98.5)
σ_a = k_a · 10 · D · E      (per axis; chest k [0.85, 0.5, 0.5], head k [0.85, 0.7, 0.5] — unchanged)
```

Because B only remaps the rating, B's outcome at BC is exactly the current scale's outcome at g_B(BC), with the same keyed draws. For example, new BC 20 performs exactly like current BC 10.

| new BC | 10 | 20 | 30 | 40 | 50 | 60 | 70 | 75 | 80 | 90 | 99 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| B executes like current BC | 0.7 | 10.0 | 18.8 | 27.2 | 35.4 | 42.4 | 49.7 | 54.5 | 61.3 | 80.4 | 98.5 |
| A executes like current BC | 0.7 | 11.5 | 22.6 | 32.6 | 40.0 | 43.9 | 47.3 | 50.0 | 55.9 | 77.5 | 98.5 |

Relative error E at a hard pass (D 2.23):

| scale | BC 10 | BC 20 | BC 30 | BC 40 | BC 50 | BC 60 | BC 70 | BC 75 | BC 80 | BC 90 | BC 99 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ORIGINAL (1) | 0.2828 | 0.2493 | 0.2162 | 0.1835 | 0.1514 | 0.1199 | 0.0892 | 0.0743 | 0.0596 | 0.0314 | 0.0088 |
| CURRENT (1.1) | 0.1793 | 0.1499 | 0.1240 | 0.1014 | 0.0814 | 0.0638 | 0.0480 | 0.0406 | 0.0335 | 0.0199 | 0.0081 |
| 1.2 A (not chosen) | 0.2104 | 0.1748 | 0.1427 | 0.1177 | 0.1014 | 0.0933 | 0.0867 | 0.0814 | 0.0708 | 0.0370 | 0.0088 |
| **CANDIDATE B** | 0.2104 | 0.1794 | 0.1532 | 0.1309 | 0.1114 | 0.0963 | 0.0820 | 0.0732 | 0.0616 | 0.0329 | 0.0088 |

## 3 · B behaves as measured

- **Built-in B vs the first round's what-if B** (`rk12b_as_measured.json`): 99/99 cells identical. The cells are 9 benchmarks × 11 ratings, compared on every median, mean, p90 and class share.
- **The same run reproduces the other first-round scales:** A 99/99, current 99/99, original 99/99.
- **Chrome = Node at all four scales** (`rk12b_chrome_node.json`): 180/180 episodes bit-identical, decisions 180/180.
- **The stills agree with the numbers.** Every comparison tile's label (class, contacts, extra step, stable time) equals the Node TYPICAL-draw result (`rk12b_compare_typical.json`), and the pictures show that state (item 10).

## 4 · The anchors, approximately (matched draws, 200 seeds)

| benchmark | pair | E new / current (ratio) | same class per seed | immediate new / current | median 2-s distance | median recovery distance | median stable time |
|---|---|---|---|---|---|---|---|
| 2 m/s ground roller | new 75 vs current 50 | 0.0242 / 0.0263 (0.92) | 100 % | 100 / 100 % | 0.01 / 0.01 | 0.00 / 0.00 | 0.23 / 0.23 |
| 2 m/s ground roller | new 50 vs current 40 | 0.0342 / 0.0315 (1.09) | 100 % | 100 / 100 % | 0.01 / 0.01 | 0.00 / 0.00 | 0.23 / 0.23 |
| 12 m/s normal ground pass | new 75 vs current 50 | 0.0596 / 0.0661 (0.90) | 96 % | 96 / 93 % | 0.13 / 0.15 | 0.00 / 0.00 | 0.23 / 0.23 |
| 12 m/s normal ground pass | new 50 vs current 40 | 0.0899 / 0.0819 (1.10) | 97 % | 85 / 88 % | 0.24 / 0.21 | 0.00 / 0.00 | 0.23 / 0.23 |
| 22 m/s hard ground pass | new 75 vs current 50 | 0.0732 / 0.0814 (0.90) | 92 % | 57 / 49 % | 0.47 / 0.57 | 0.00 / 0.00 | 0.36 / 0.48 |
| 22 m/s hard ground pass | new 50 vs current 40 | 0.1114 / 0.1014 (1.10) | 93 % | 29 / 33 % | 1.02 / 0.87 | 0.70 / 0.59 | 0.73 / 0.69 |
| Thigh — 6 m/s dropping 35° at 0.95 m | new 75 vs current 50 | 0.0476 / 0.0526 (0.90) | 99 % | 98 / 98 % | 0.23 / 0.26 | 0.08 / 0.09 | 0.69 / 0.69 |
| Thigh — 6 m/s dropping 35° at 0.95 m | new 50 vs current 40 | 0.0710 / 0.0649 (1.09) | 96 % | 89 / 93 % | 0.34 / 0.31 | 0.12 / 0.11 | 0.69 / 0.69 |
| Thigh — 16 m/s dropping 35° (hard) | new 75 vs current 50 | 0.0708 / 0.0787 (0.90) | 91 % | 30 / 23 % | 0.98 / 1.07 | 0.37 / 0.42 | 0.84 / 0.86 |
| Thigh — 16 m/s dropping 35° (hard) | new 50 vs current 40 | 0.1075 / 0.0979 (1.10) | 92 % | 11 / 13 % | 1.46 / 1.33 | 0.61 / 0.56 | 1.06 / 1.04 |
| Chest — 8 m/s dropping 20° at 1.32 m | new 75 vs current 50 | 0.0561 / 0.0622 (0.90) | 96 % | 80 / 76 % | 0.44 / 0.49 | 0.17 / 0.18 | 0.67 / 0.67 |
| Chest — 8 m/s dropping 20° at 1.32 m | new 50 vs current 40 | 0.0844 / 0.0769 (1.10) | 95 % | 60 / 65 % | 0.67 / 0.61 | 0.21 / 0.20 | 0.67 / 0.67 |
| Chest — 20 m/s dropping 20° (hard) | new 75 vs current 50 | 0.0761 / 0.0847 (0.90) | 85 % | 22 / 18 % | 1.78 / 1.94 | 0.53 / 0.61 | 0.80 / 0.85 |
| Chest — 20 m/s dropping 20° (hard) | new 50 vs current 40 | 0.1160 / 0.1055 (1.10) | 91 % | 9 / 12 % | 2.54 / 2.35 | 0.84 / 0.77 | 1.17 / 1.06 |
| Head — 6 m/s dropping 15° at 1.78 m | new 75 vs current 50 | 0.0569 / 0.0631 (0.90) | 93 % | 47 / 40 % | 0.63 / 0.70 | 0.28 / 0.29 | 0.97 / 0.97 |
| Head — 6 m/s dropping 15° at 1.78 m | new 50 vs current 40 | 0.0857 / 0.0781 (1.10) | 94 % | 26 / 30 % | 0.94 / 0.86 | 0.39 / 0.35 | 0.98 / 0.97 |
| Head — 15 m/s dropping 25° (hard, forced) | new 75 vs current 50 | 0.0776 / 0.0863 (0.90) | 91 % | 4 / 4 % | 2.61 / 2.90 | 1.33 / 1.47 | 1.24 / 1.31 |
| Head — 15 m/s dropping 25° (hard, forced) | new 50 vs current 40 | 0.1182 / 0.1075 (1.10) | 91 % | 3 / 3 % | 3.83 / 3.51 | 1.70 / 1.66 | 1.50 / 1.48 |

In short:

- **New BC 75 is a little better than current BC 50** (10 % less error): on the 22 m/s pass, 57 % clean against 49 %.
- **New BC 50 is a little worse than current BC 40** (10 % more error): 29 % against 33 %.
- A had both pairs identical per seed (100 % same class).

## 5 · The 22 m/s hard ground pass — every requested measure, four scales (medians, 200 seeds)

| | scale | BC 10 | BC 20 | BC 30 | BC 40 | BC 50 | BC 60 | BC 70 | BC 75 | BC 80 | BC 90 | BC 99 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| immediate residual velocity (m/s) | ORIGINAL (1) | 5.33 | 4.68 | 4.02 | 3.43 | 2.85 | 2.27 | 1.72 | 1.40 | 1.14 | 0.61 | 0.33 |
|  | CURRENT (1.1) | 3.36 | 2.82 | 2.34 | 1.95 | 1.57 | 1.22 | 0.91 | 0.78 | 0.65 | 0.45 | 0.33 |
|  | 1.2 A (not chosen) | 3.91 | 3.27 | 2.69 | 2.24 | 1.95 | 1.79 | 1.68 | 1.57 | 1.35 | 0.73 | 0.33 |
|  | **CANDIDATE B** | 3.91 | 3.36 | 2.88 | 2.46 | 2.12 | 1.84 | 1.58 | 1.39 | 1.18 | 0.64 | 0.33 |
| first-touch placement error (m) | ORIGINAL (1) | 5.72 | 4.63 | 3.52 | 2.62 | 1.80 | 1.16 | 0.67 | 0.49 | 0.34 | 0.12 | 0.03 |
|  | CURRENT (1.1) | 2.47 | 1.78 | 1.25 | 0.87 | 0.56 | 0.37 | 0.23 | 0.18 | 0.13 | 0.07 | 0.03 |
|  | 1.2 A (not chosen) | 3.35 | 2.35 | 1.62 | 1.13 | 0.87 | 0.74 | 0.64 | 0.56 | 0.44 | 0.16 | 0.03 |
|  | **CANDIDATE B** | 3.35 | 2.47 | 1.83 | 1.37 | 1.03 | 0.77 | 0.58 | 0.47 | 0.36 | 0.13 | 0.03 |
| 0.25 s error (m) | ORIGINAL (1) | 1.24 | 1.08 | 0.93 | 0.78 | 0.64 | 0.50 | 0.36 | 0.29 | 0.22 | 0.10 | 0.02 |
|  | CURRENT (1.1) | 0.76 | 0.63 | 0.51 | 0.42 | 0.32 | 0.24 | 0.17 | 0.13 | 0.11 | 0.06 | 0.02 |
|  | 1.2 A (not chosen) | 0.90 | 0.74 | 0.60 | 0.49 | 0.42 | 0.38 | 0.35 | 0.32 | 0.27 | 0.12 | 0.02 |
|  | **CANDIDATE B** | 0.90 | 0.76 | 0.64 | 0.54 | 0.46 | 0.39 | 0.32 | 0.28 | 0.23 | 0.10 | 0.02 |
| 0.50 s error (m) | ORIGINAL (1) | 2.34 | 2.06 | 1.74 | 1.46 | 1.17 | 0.86 | 0.57 | 0.43 | 0.31 | 0.12 | 0.03 |
|  | CURRENT (1.1) | 1.40 | 1.16 | 0.92 | 0.69 | 0.49 | 0.34 | 0.22 | 0.17 | 0.13 | 0.06 | 0.02 |
|  | 1.2 A (not chosen) | 1.71 | 1.37 | 1.09 | 0.85 | 0.69 | 0.61 | 0.55 | 0.49 | 0.40 | 0.15 | 0.03 |
|  | **CANDIDATE B** | 1.71 | 1.40 | 1.19 | 0.97 | 0.78 | 0.63 | 0.50 | 0.42 | 0.33 | 0.13 | 0.03 |
| 1.0 s error (m) | ORIGINAL (1) | 4.18 | 3.63 | 2.97 | 2.35 | 1.73 | 1.15 | 0.67 | 0.49 | 0.34 | 0.12 | 0.03 |
|  | CURRENT (1.1) | 2.29 | 1.69 | 1.23 | 0.86 | 0.56 | 0.37 | 0.23 | 0.18 | 0.13 | 0.07 | 0.03 |
|  | 1.2 A (not chosen) | 2.89 | 2.20 | 1.56 | 1.11 | 0.86 | 0.73 | 0.64 | 0.56 | 0.44 | 0.16 | 0.03 |
|  | **CANDIDATE B** | 2.89 | 2.29 | 1.75 | 1.34 | 1.02 | 0.76 | 0.58 | 0.47 | 0.36 | 0.13 | 0.03 |
| 2.0 s legacy distance (m) | ORIGINAL (1) | 5.71 | 4.62 | 3.52 | 2.63 | 1.80 | 1.16 | 0.68 | 0.48 | 0.33 | 0.12 | 0.03 |
|  | CURRENT (1.1) | 2.46 | 1.77 | 1.26 | 0.87 | 0.57 | 0.37 | 0.23 | 0.18 | 0.13 | 0.07 | 0.03 |
|  | 1.2 A (not chosen) | 3.34 | 2.35 | 1.62 | 1.13 | 0.87 | 0.73 | 0.64 | 0.57 | 0.45 | 0.16 | 0.03 |
|  | **CANDIDATE B** | 3.34 | 2.46 | 1.84 | 1.36 | 1.02 | 0.78 | 0.58 | 0.47 | 0.35 | 0.13 | 0.03 |
| recovery distance (m) | ORIGINAL (1) | 1.69 | 1.64 | 1.78 | 1.48 | 1.14 | 0.77 | 0.42 | 0.00 | 0.00 | 0.00 | 0.00 |
|  | CURRENT (1.1) | 1.44 | 1.11 | 0.79 | 0.59 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
|  | 1.2 A (not chosen) | 1.69 | 1.41 | 1.01 | 0.73 | 0.59 | 0.49 | 0.34 | 0.00 | 0.00 | 0.00 | 0.00 |
|  | **CANDIDATE B** | 1.69 | 1.44 | 1.14 | 0.89 | 0.70 | 0.48 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| recovery time (s) | ORIGINAL (1) | 0.83 | 0.82 | 0.86 | 0.76 | 0.65 | 0.53 | 0.42 | 0.13 | 0.00 | 0.00 | 0.00 |
|  | CURRENT (1.1) | 0.75 | 0.64 | 0.53 | 0.47 | 0.26 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
|  | 1.2 A (not chosen) | 0.83 | 0.74 | 0.61 | 0.51 | 0.47 | 0.43 | 0.39 | 0.26 | 0.09 | 0.00 | 0.00 |
|  | **CANDIDATE B** | 0.83 | 0.75 | 0.65 | 0.57 | 0.50 | 0.43 | 0.33 | 0.13 | 0.00 | 0.00 | 0.00 |
| contacts (mean) | ORIGINAL (1) | 1.32 | 1.41 | 1.53 | 1.61 | 1.67 | 1.64 | 1.55 | 1.42 | 1.24 | 1.03 | 1.00 |
|  | CURRENT (1.1) | 1.62 | 1.66 | 1.65 | 1.62 | 1.48 | 1.29 | 1.15 | 1.11 | 1.05 | 1.00 | 1.00 |
|  | 1.2 A (not chosen) | 1.54 | 1.64 | 1.66 | 1.64 | 1.62 | 1.58 | 1.52 | 1.48 | 1.39 | 1.08 | 1.00 |
|  | **CANDIDATE B** | 1.54 | 1.62 | 1.65 | 1.66 | 1.65 | 1.60 | 1.48 | 1.42 | 1.26 | 1.04 | 1.00 |
| stable-control time (s) | ORIGINAL (1) | 1.06 | 1.04 | 1.09 | 0.99 | 0.88 | 0.75 | 0.64 | 0.35 | 0.23 | 0.23 | 0.23 |
|  | CURRENT (1.1) | 0.97 | 0.86 | 0.76 | 0.69 | 0.48 | 0.23 | 0.23 | 0.23 | 0.23 | 0.23 | 0.23 |
|  | 1.2 A (not chosen) | 1.06 | 0.97 | 0.83 | 0.74 | 0.69 | 0.66 | 0.61 | 0.48 | 0.31 | 0.23 | 0.23 |
|  | **CANDIDATE B** | 1.06 | 0.97 | 0.88 | 0.79 | 0.73 | 0.65 | 0.55 | 0.36 | 0.23 | 0.23 | 0.23 |
| immediate / adjusted / recovery / unstable % | ORIGINAL (1) | 4/1/33/63 | 5/1/41/54 | 7/0/54/40 | 12/1/62/27 | 18/1/67/15 | 27/1/64/8 | 42/2/55/2 | 56/2/42/1 | 75/0/24/2 | 96/0/3/1 | 100/0/0/0 |
|  | CURRENT (1.1) | 12/1/62/25 | 18/1/66/15 | 25/1/65/10 | 33/1/63/4 | 49/2/48/2 | 69/1/30/2 | 85/0/15/1 | 89/0/11/1 | 95/0/5/1 | 100/0/0/0 | 100/0/0/0 |
|  | 1.2 A (not chosen) | 7/0/54/39 | 13/1/64/22 | 21/1/66/14 | 28/1/64/8 | 33/1/63/4 | 39/1/59/2 | 45/2/53/1 | 49/2/48/2 | 59/2/39/1 | 91/0/8/1 | 100/0/0/0 |
|  | **CANDIDATE B** | 7/0/54/39 | 12/1/62/25 | 17/2/65/16 | 24/1/66/10 | 29/1/65/6 | 37/1/60/3 | 47/3/48/2 | 57/2/42/0 | 73/0/26/1 | 95/0/5/1 | 100/0/0/0 |

Placement error = where the touch leaves the ball (2 s). Recovery distance / time = the extra adjustment and the extra time to stable control, against the ideal episode.

## 6 · The professional middle — BC 50 → 80

Clean-first-touch (IMMEDIATE) share, then the 50 → 80 spread in points:

| benchmark | scale | BC 50 | BC 60 | BC 70 | BC 75 | BC 80 | BC 90 | spread 50 → 80 |
|---|---|---|---|---|---|---|---|---|
| 22 m/s hard ground pass | CURRENT (1.1) | 49 % | 69 % | 85 % | 89 % | 95 % | 100 % | 46 |
|  | 1.2 A (not chosen) | 33 % | 39 % | 45 % | 49 % | 59 % | 91 % | 26 |
|  | **CANDIDATE B** | 29 % | 37 % | 47 % | 57 % | 73 % | 95 % | 44 |
| 12 m/s normal ground pass | CURRENT (1.1) | 93 % | 99 % | 100 % | 100 % | 100 % | 100 % | 7 |
|  | 1.2 A (not chosen) | 88 % | 89 % | 91 % | 93 % | 97 % | 100 % | 10 |
|  | **CANDIDATE B** | 85 % | 89 % | 93 % | 96 % | 99 % | 100 % | 14 |
| Thigh — 6 m/s dropping 35° at 0.95 m | CURRENT (1.1) | 98 % | 100 % | 100 % | 100 % | 100 % | 100 % | 3 |
|  | 1.2 A (not chosen) | 93 % | 94 % | 95 % | 98 % | 99 % | 100 % | 6 |
|  | **CANDIDATE B** | 89 % | 94 % | 97 % | 98 % | 100 % | 100 % | 11 |
| Chest — 8 m/s dropping 20° at 1.32 m | CURRENT (1.1) | 76 % | 84 % | 89 % | 95 % | 98 % | 99 % | 23 |
|  | 1.2 A (not chosen) | 65 % | 70 % | 71 % | 76 % | 82 % | 97 % | 18 |
|  | **CANDIDATE B** | 60 % | 68 % | 76 % | 80 % | 84 % | 98 % | 25 |
| Head — 6 m/s dropping 15° at 1.78 m | CURRENT (1.1) | 40 % | 52 % | 65 % | 76 % | 86 % | 97 % | 46 |
|  | 1.2 A (not chosen) | 30 % | 33 % | 37 % | 40 % | 49 % | 82 % | 19 |
|  | **CANDIDATE B** | 26 % | 31 % | 40 % | 47 % | 54 % | 87 % | 28 |
| Thigh — 16 m/s dropping 35° (hard) | CURRENT (1.1) | 23 % | 36 % | 58 % | 65 % | 81 % | 97 % | 58 |
|  | 1.2 A (not chosen) | 13 % | 17 % | 21 % | 23 % | 31 % | 73 % | 18 |
|  | **CANDIDATE B** | 11 % | 16 % | 23 % | 30 % | 37 % | 82 % | 27 |
| Chest — 20 m/s dropping 20° (hard) | CURRENT (1.1) | 18 % | 27 % | 40 % | 47 % | 55 % | 83 % | 38 |
|  | 1.2 A (not chosen) | 12 % | 14 % | 17 % | 18 % | 23 % | 52 % | 11 |
|  | **CANDIDATE B** | 9 % | 14 % | 17 % | 22 % | 29 % | 56 % | 20 |
| Head — 15 m/s dropping 25° (hard, forced) | CURRENT (1.1) | 4 % | 8 % | 13 % | 17 % | 21 % | 45 % | 17 |
|  | 1.2 A (not chosen) | 3 % | 3 % | 3 % | 4 % | 6 % | 18 % | 3 |
|  | **CANDIDATE B** | 3 % | 3 % | 4 % | 4 % | 8 % | 21 % | 5 |

Median stable-control time on the 22 m/s pass at BC 50 / 60 / 70 / 75 / 80: B 0.73 / 0.65 / 0.55 / 0.36 / 0.23 s, RECEIVE-KILL-1.1 0.48 / 0.23 / 0.23 / 0.23 / 0.23 s, A 0.69 / 0.66 / 0.61 / 0.48 / 0.31 s.

**How this matches your rating feel:**

- **BC 99:** near-perfect; every benchmark is ≥ 87 % IMMEDIATE (the lowest is the forced 15 m/s header).
- **BC 90:** elite, but visibly below 99 on difficult service. Hard pass 95 %, hard thigh 82 %, header 87 %. On the hardest aerial service it falls short of "very clean": the 20 m/s chest is 56 % clean (RECEIVE-KILL-1.1 83 %) and the forced header 21 % (45 %). This is point 2 of the summary.
- **BC 80:** controls the hard pass cleanly 73 % of the time, with visible imperfection: median placement error 0.36 m against 0.03 at 99.
- **BC 75:** good but imperfect: 57 % clean; when it is not clean, a second touch (mean contacts 1.42).
- **BC 70:** competent with visible adjustment: 47 % clean, median stable time 0.55 s.
- **BC 60:** heavier touches and a slower continuation: 37 % clean, 0.65 s.
- **BC 50:** weak; recovery needed most of the time (65 % RECOVERY on the hard pass), but the 12 m/s pass is still 85 % clean.
- **BC 40 and below:** poor, and progressively uglier. Hard-pass UNSTABLE goes 10 / 16 / 25 / 39 % at BC 40 / 30 / 20 / 10.

These are measured outcomes of the physical first touch and the follow-up, not encoded percentages.

## 7 · Across difficulties (four scales, 200 seeds)

### 2 m/s ground roller (D 0.2204, FOOT_INSIDE_R)

| | scale | BC 10 | BC 20 | BC 30 | BC 40 | BC 50 | BC 60 | BC 70 | BC 75 | BC 80 | BC 90 | BC 99 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| immediate / adjusted / recovery / unstable % | ORIGINAL (1) | 100/0/0/0 | 100/0/0/0 | 100/0/0/0 | 100/0/0/0 | 100/0/0/0 | 100/0/0/0 | 100/0/0/0 | 100/0/0/0 | 100/0/0/0 | 100/0/0/0 | 100/0/0/0 |
|  | CURRENT (1.1) | 100/0/0/0 | 100/0/0/0 | 100/0/0/0 | 100/0/0/0 | 100/0/0/0 | 100/0/0/0 | 100/0/0/0 | 100/0/0/0 | 100/0/0/0 | 100/0/0/0 | 100/0/0/0 |
|  | 1.2 A (not chosen) | 100/0/0/0 | 100/0/0/0 | 100/0/0/0 | 100/0/0/0 | 100/0/0/0 | 100/0/0/0 | 100/0/0/0 | 100/0/0/0 | 100/0/0/0 | 100/0/0/0 | 100/0/0/0 |
|  | **CANDIDATE B** | 100/0/0/0 | 100/0/0/0 | 100/0/0/0 | 100/0/0/0 | 100/0/0/0 | 100/0/0/0 | 100/0/0/0 | 100/0/0/0 | 100/0/0/0 | 100/0/0/0 | 100/0/0/0 |
| recovery distance (m) | CURRENT (1.1) | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
|  | **CANDIDATE B** | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| recovery time (s) | CURRENT (1.1) | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
|  | **CANDIDATE B** | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| stable-control time (s) | CURRENT (1.1) | 0.23 | 0.23 | 0.23 | 0.23 | 0.23 | 0.23 | 0.23 | 0.23 | 0.23 | 0.23 | 0.23 |
|  | **CANDIDATE B** | 0.23 | 0.23 | 0.23 | 0.23 | 0.23 | 0.23 | 0.23 | 0.23 | 0.23 | 0.23 | 0.23 |
| 2.0 s distance (m) | CURRENT (1.1) | 0.02 | 0.01 | 0.01 | 0.01 | 0.01 | 0.01 | 0.01 | 0.00 | 0.00 | 0.00 | 0.00 |
|  | **CANDIDATE B** | 0.02 | 0.02 | 0.01 | 0.01 | 0.01 | 0.01 | 0.01 | 0.01 | 0.01 | 0.00 | 0.00 |
| contacts (mean) | **CANDIDATE B** | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |

### 12 m/s normal ground pass (D 1.2125, FOOT_INSIDE_R)

| | scale | BC 10 | BC 20 | BC 30 | BC 40 | BC 50 | BC 60 | BC 70 | BC 75 | BC 80 | BC 90 | BC 99 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| immediate / adjusted / recovery / unstable % | ORIGINAL (1) | 26/1/65/9 | 31/1/64/6 | 38/1/60/2 | 52/2/47/0 | 67/1/31/1 | 83/0/17/1 | 91/0/9/1 | 96/0/4/1 | 99/0/1/0 | 100/0/0/0 | 100/0/0/0 |
|  | CURRENT (1.1) | 53/3/45/0 | 67/1/32/1 | 80/0/19/2 | 88/0/12/1 | 93/0/6/1 | 99/0/1/1 | 100/0/0/0 | 100/0/0/0 | 100/0/0/0 | 100/0/0/0 | 100/0/0/0 |
|  | 1.2 A (not chosen) | 41/0/58/2 | 55/2/44/0 | 72/1/28/1 | 83/0/17/1 | 88/0/12/1 | 89/0/10/1 | 91/0/9/1 | 93/0/6/1 | 97/0/3/0 | 100/0/0/0 | 100/0/0/0 |
|  | **CANDIDATE B** | 41/0/58/2 | 54/2/45/0 | 64/1/34/2 | 78/0/22/0 | 85/0/15/1 | 89/0/11/1 | 93/0/6/1 | 96/0/3/1 | 99/0/1/0 | 100/0/0/0 | 100/0/0/0 |
| recovery distance (m) | CURRENT (1.1) | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
|  | **CANDIDATE B** | 0.47 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| recovery time (s) | CURRENT (1.1) | 0.19 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
|  | **CANDIDATE B** | 0.42 | 0.19 | 0.04 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| stable-control time (s) | CURRENT (1.1) | 0.42 | 0.23 | 0.23 | 0.23 | 0.23 | 0.23 | 0.23 | 0.23 | 0.23 | 0.23 | 0.23 |
|  | **CANDIDATE B** | 0.65 | 0.42 | 0.27 | 0.23 | 0.23 | 0.23 | 0.23 | 0.23 | 0.23 | 0.23 | 0.23 |
| 2.0 s distance (m) | CURRENT (1.1) | 0.53 | 0.40 | 0.29 | 0.21 | 0.15 | 0.11 | 0.07 | 0.06 | 0.05 | 0.03 | 0.01 |
|  | **CANDIDATE B** | 0.71 | 0.53 | 0.41 | 0.32 | 0.24 | 0.19 | 0.15 | 0.13 | 0.10 | 0.05 | 0.01 |
| contacts (mean) | **CANDIDATE B** | 1.57 | 1.45 | 1.33 | 1.22 | 1.15 | 1.11 | 1.06 | 1.03 | 1.01 | 1.00 | 1.00 |

### Thigh — 6 m/s dropping 35° at 0.95 m (D 0.7353, THIGH_R)

| | scale | BC 10 | BC 20 | BC 30 | BC 40 | BC 50 | BC 60 | BC 70 | BC 75 | BC 80 | BC 90 | BC 99 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| immediate / adjusted / recovery / unstable % | ORIGINAL (1) | 34/63/4/0 | 39/58/3/0 | 47/53/1/0 | 55/45/1/0 | 73/27/1/0 | 87/13/0/0 | 95/5/0/0 | 98/2/0/0 | 100/0/0/0 | 100/0/0/0 | 100/0/0/0 |
|  | CURRENT (1.1) | 56/44/1/0 | 75/26/0/0 | 86/14/0/0 | 93/7/0/0 | 98/3/0/0 | 100/1/0/0 | 100/0/0/0 | 100/0/0/0 | 100/0/0/0 | 100/0/0/0 | 100/0/0/0 |
|  | 1.2 A (not chosen) | 49/51/1/0 | 59/41/1/0 | 77/23/0/0 | 88/12/0/0 | 93/7/0/0 | 94/6/0/0 | 95/5/0/0 | 98/3/0/0 | 99/2/0/0 | 100/0/0/0 | 100/0/0/0 |
|  | **CANDIDATE B** | 49/51/1/0 | 56/44/1/0 | 73/27/1/0 | 82/19/0/0 | 89/11/0/0 | 94/6/0/0 | 97/3/0/0 | 98/2/0/0 | 100/1/0/0 | 100/0/0/0 | 100/0/0/0 |
| recovery distance (m) | CURRENT (1.1) | 0.18 | 0.16 | 0.13 | 0.11 | 0.09 | 0.07 | 0.06 | 0.05 | 0.04 | 0.03 | 0.01 |
|  | **CANDIDATE B** | 0.23 | 0.18 | 0.16 | 0.14 | 0.12 | 0.10 | 0.09 | 0.08 | 0.07 | 0.04 | 0.01 |
| recovery time (s) | CURRENT (1.1) | 0.04 | 0.02 | 0.01 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
|  | **CANDIDATE B** | 0.07 | 0.04 | 0.02 | 0.01 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| stable-control time (s) | CURRENT (1.1) | 0.72 | 0.70 | 0.69 | 0.69 | 0.69 | 0.69 | 0.69 | 0.68 | 0.68 | 0.68 | 0.68 |
|  | **CANDIDATE B** | 0.76 | 0.72 | 0.70 | 0.69 | 0.69 | 0.69 | 0.69 | 0.69 | 0.69 | 0.68 | 0.68 |
| 2.0 s distance (m) | CURRENT (1.1) | 0.54 | 0.45 | 0.37 | 0.31 | 0.26 | 0.20 | 0.15 | 0.13 | 0.11 | 0.07 | 0.04 |
|  | **CANDIDATE B** | 0.61 | 0.54 | 0.46 | 0.39 | 0.34 | 0.29 | 0.25 | 0.23 | 0.19 | 0.11 | 0.04 |
| contacts (mean) | **CANDIDATE B** | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 |

### Chest — 8 m/s dropping 20° at 1.32 m (D 1.0481, CHEST)

| | scale | BC 10 | BC 20 | BC 30 | BC 40 | BC 50 | BC 60 | BC 70 | BC 75 | BC 80 | BC 90 | BC 99 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| immediate / adjusted / recovery / unstable % | ORIGINAL (1) | 11/41/44/4 | 16/48/34/2 | 21/51/27/1 | 27/55/19/0 | 35/53/13/0 | 47/47/7/0 | 62/37/2/0 | 71/29/0/0 | 82/19/0/0 | 97/4/0/0 | 100/0/0/0 |
|  | CURRENT (1.1) | 35/52/13/0 | 44/48/9/0 | 53/45/3/0 | 65/35/1/0 | 76/25/0/0 | 84/16/0/0 | 89/12/0/0 | 95/5/0/0 | 98/2/0/0 | 99/1/0/0 | 100/0/0/0 |
|  | 1.2 A (not chosen) | 28/56/17/0 | 37/53/11/0 | 47/47/7/0 | 56/43/2/0 | 65/35/1/0 | 70/30/1/0 | 71/29/0/0 | 76/25/0/0 | 82/18/0/0 | 97/4/0/0 | 100/0/0/0 |
|  | **CANDIDATE B** | 28/56/17/0 | 35/52/13/0 | 42/49/10/0 | 51/46/4/0 | 60/39/2/0 | 68/31/1/0 | 76/25/0/0 | 80/21/0/0 | 84/16/0/0 | 98/2/0/0 | 100/0/0/0 |
| recovery distance (m) | CURRENT (1.1) | 0.36 | 0.28 | 0.23 | 0.20 | 0.18 | 0.16 | 0.13 | 0.12 | 0.09 | 0.05 | 0.02 |
|  | **CANDIDATE B** | 0.43 | 0.36 | 0.29 | 0.25 | 0.21 | 0.20 | 0.18 | 0.17 | 0.16 | 0.09 | 0.02 |
| recovery time (s) | CURRENT (1.1) | 0.03 | 0.02 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
|  | **CANDIDATE B** | 0.05 | 0.03 | 0.02 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| stable-control time (s) | CURRENT (1.1) | 0.70 | 0.69 | 0.67 | 0.67 | 0.67 | 0.67 | 0.67 | 0.67 | 0.67 | 0.67 | 0.67 |
|  | **CANDIDATE B** | 0.72 | 0.70 | 0.69 | 0.68 | 0.67 | 0.67 | 0.67 | 0.67 | 0.67 | 0.67 | 0.67 |
| 2.0 s distance (m) | CURRENT (1.1) | 1.09 | 0.90 | 0.75 | 0.61 | 0.49 | 0.39 | 0.29 | 0.25 | 0.21 | 0.13 | 0.06 |
|  | **CANDIDATE B** | 1.25 | 1.09 | 0.92 | 0.78 | 0.67 | 0.58 | 0.50 | 0.44 | 0.37 | 0.20 | 0.06 |
| contacts (mean) | **CANDIDATE B** | 2.01 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 |

### Head — 6 m/s dropping 15° at 1.78 m (D 1.0849, HEAD)

| | scale | BC 10 | BC 20 | BC 30 | BC 40 | BC 50 | BC 60 | BC 70 | BC 75 | BC 80 | BC 90 | BC 99 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| immediate / adjusted / recovery / unstable % | ORIGINAL (1) | 4/28/56/13 | 4/35/53/9 | 8/41/47/5 | 13/45/39/4 | 16/57/27/1 | 20/67/13/1 | 26/69/6/0 | 33/64/3/0 | 45/54/2/0 | 79/22/0/0 | 100/0/0/0 |
|  | CURRENT (1.1) | 16/58/26/1 | 20/66/14/0 | 23/71/7/0 | 30/66/4/0 | 40/59/2/0 | 52/48/1/0 | 65/35/0/0 | 76/25/0/0 | 86/15/0/0 | 97/4/0/0 | 100/0/0/0 |
|  | 1.2 A (not chosen) | 13/50/35/3 | 16/60/24/1 | 21/67/13/0 | 25/70/6/0 | 30/66/4/0 | 33/65/3/0 | 37/61/3/0 | 40/59/2/0 | 49/51/1/0 | 82/19/0/0 | 100/0/0/0 |
|  | **CANDIDATE B** | 13/50/35/3 | 16/58/26/1 | 20/66/14/1 | 22/71/8/0 | 26/69/6/0 | 31/66/4/0 | 40/58/2/0 | 47/52/2/0 | 54/47/0/0 | 87/14/0/0 | 100/0/0/0 |
| recovery distance (m) | CURRENT (1.1) | 0.62 | 0.53 | 0.44 | 0.35 | 0.29 | 0.24 | 0.19 | 0.17 | 0.15 | 0.11 | 0.04 |
|  | **CANDIDATE B** | 0.73 | 0.62 | 0.54 | 0.46 | 0.39 | 0.34 | 0.30 | 0.28 | 0.23 | 0.15 | 0.05 |
| recovery time (s) | CURRENT (1.1) | 0.04 | 0.03 | 0.02 | 0.02 | 0.01 | 0.01 | 0.01 | 0.01 | 0.00 | 0.00 | 0.00 |
|  | **CANDIDATE B** | 0.06 | 0.04 | 0.03 | 0.02 | 0.02 | 0.02 | 0.01 | 0.01 | 0.01 | 0.00 | 0.00 |
| stable-control time (s) | CURRENT (1.1) | 1.00 | 0.99 | 0.98 | 0.97 | 0.97 | 0.97 | 0.97 | 0.97 | 0.96 | 0.96 | 0.96 |
|  | **CANDIDATE B** | 1.02 | 1.00 | 0.98 | 0.98 | 0.98 | 0.97 | 0.97 | 0.97 | 0.97 | 0.96 | 0.96 |
| 2.0 s distance (m) | CURRENT (1.1) | 1.48 | 1.25 | 1.04 | 0.86 | 0.70 | 0.56 | 0.42 | 0.36 | 0.30 | 0.19 | 0.09 |
|  | **CANDIDATE B** | 1.68 | 1.48 | 1.28 | 1.10 | 0.94 | 0.82 | 0.70 | 0.63 | 0.54 | 0.30 | 0.09 |
| contacts (mean) | **CANDIDATE B** | 2.02 | 2.02 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 |

### Thigh — 16 m/s dropping 35° (hard) (D 1.9807, THIGH_R)

| | scale | BC 10 | BC 20 | BC 30 | BC 40 | BC 50 | BC 60 | BC 70 | BC 75 | BC 80 | BC 90 | BC 99 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| immediate / adjusted / recovery / unstable % | ORIGINAL (1) | 1/19/47/35 | 1/23/51/26 | 1/30/54/16 | 3/37/52/9 | 5/50/41/5 | 10/56/34/2 | 20/66/15/0 | 30/62/9/0 | 39/57/4/0 | 84/16/0/0 | 100/0/0/0 |
|  | CURRENT (1.1) | 4/36/52/9 | 5/51/41/5 | 10/55/35/2 | 13/65/22/1 | 23/67/11/0 | 36/60/5/0 | 58/42/1/0 | 65/35/1/0 | 81/20/0/0 | 97/4/0/0 | 100/0/0/0 |
|  | 1.2 A (not chosen) | 2/30/55/14 | 5/39/49/8 | 6/52/38/5 | 10/57/32/2 | 13/65/22/1 | 17/67/16/0 | 21/65/15/0 | 23/67/11/0 | 31/63/7/0 | 73/27/1/0 | 100/0/0/0 |
|  | **CANDIDATE B** | 2/30/55/14 | 4/36/52/9 | 5/50/41/5 | 8/53/38/3 | 11/63/26/1 | 16/67/18/0 | 23/67/11/0 | 30/62/9/0 | 37/59/5/0 | 82/19/0/0 | 100/0/0/0 |
| recovery distance (m) | CURRENT (1.1) | 1.09 | 0.85 | 0.70 | 0.56 | 0.42 | 0.31 | 0.21 | 0.17 | 0.15 | 0.09 | 0.04 |
|  | **CANDIDATE B** | 1.32 | 1.09 | 0.88 | 0.73 | 0.61 | 0.52 | 0.42 | 0.37 | 0.29 | 0.15 | 0.04 |
| recovery time (s) | CURRENT (1.1) | 0.41 | 0.39 | 0.36 | 0.34 | 0.16 | 0.11 | 0.02 | 0.01 | 0.01 | 0.00 | 0.00 |
|  | **CANDIDATE B** | 0.45 | 0.41 | 0.38 | 0.36 | 0.36 | 0.25 | 0.16 | 0.14 | 0.10 | 0.01 | 0.00 |
| stable-control time (s) | CURRENT (1.1) | 1.11 | 1.09 | 1.06 | 1.04 | 0.86 | 0.81 | 0.72 | 0.71 | 0.71 | 0.70 | 0.70 |
|  | **CANDIDATE B** | 1.15 | 1.11 | 1.08 | 1.06 | 1.06 | 0.95 | 0.86 | 0.84 | 0.80 | 0.71 | 0.70 |
| 2.0 s distance (m) | CURRENT (1.1) | 2.36 | 1.96 | 1.63 | 1.33 | 1.07 | 0.86 | 0.65 | 0.56 | 0.47 | 0.28 | 0.15 |
|  | **CANDIDATE B** | 2.77 | 2.36 | 2.02 | 1.71 | 1.46 | 1.27 | 1.08 | 0.98 | 0.83 | 0.46 | 0.15 |
| contacts (mean) | **CANDIDATE B** | 1.87 | 1.93 | 1.96 | 1.99 | 1.99 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 |

### Chest — 20 m/s dropping 20° (hard) (D 2.5728, CHEST)

| | scale | BC 10 | BC 20 | BC 30 | BC 40 | BC 50 | BC 60 | BC 70 | BC 75 | BC 80 | BC 90 | BC 99 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| immediate / adjusted / recovery / unstable % | ORIGINAL (1) | 0/8/22/71 | 1/9/27/64 | 1/13/28/59 | 3/18/29/51 | 5/20/38/38 | 7/26/42/26 | 11/40/35/15 | 17/45/28/12 | 23/52/20/6 | 51/43/7/0 | 97/3/0/0 |
|  | CURRENT (1.1) | 5/20/38/38 | 7/23/43/28 | 7/36/37/21 | 12/43/31/15 | 18/50/24/9 | 27/53/18/3 | 40/48/12/1 | 47/45/9/0 | 55/42/4/0 | 83/18/0/0 | 99/1/0/0 |
|  | 1.2 A (not chosen) | 3/18/33/47 | 5/20/39/36 | 7/27/41/26 | 7/38/37/19 | 12/43/31/15 | 14/44/29/13 | 17/47/26/11 | 18/50/24/9 | 23/52/20/6 | 52/42/7/0 | 99/1/0/0 |
|  | **CANDIDATE B** | 3/18/33/47 | 5/20/38/38 | 7/23/42/29 | 7/33/39/22 | 9/41/33/18 | 14/42/30/15 | 17/50/25/9 | 22/52/21/6 | 29/53/17/3 | 56/42/3/0 | 99/1/0/0 |
| recovery distance (m) | CURRENT (1.1) | 1.35 | 1.16 | 0.95 | 0.77 | 0.61 | 0.48 | 0.31 | 0.26 | 0.22 | 0.15 | 0.06 |
|  | **CANDIDATE B** | 1.47 | 1.35 | 1.13 | 1.00 | 0.84 | 0.73 | 0.61 | 0.53 | 0.42 | 0.22 | 0.06 |
| recovery time (s) | CURRENT (1.1) | 0.53 | 0.49 | 0.49 | 0.37 | 0.16 | 0.06 | 0.03 | 0.01 | 0.01 | 0.00 | 0.00 |
|  | **CANDIDATE B** | 0.54 | 0.53 | 0.49 | 0.49 | 0.48 | 0.26 | 0.16 | 0.11 | 0.05 | 0.01 | 0.00 |
| stable-control time (s) | CURRENT (1.1) | 1.23 | 1.18 | 1.18 | 1.06 | 0.85 | 0.75 | 0.72 | 0.70 | 0.70 | 0.69 | 0.69 |
|  | **CANDIDATE B** | 1.23 | 1.23 | 1.18 | 1.18 | 1.17 | 0.95 | 0.85 | 0.80 | 0.75 | 0.70 | 0.69 |
| 2.0 s distance (m) | CURRENT (1.1) | 3.96 | 3.32 | 2.78 | 2.35 | 1.94 | 1.57 | 1.29 | 1.16 | 1.04 | 0.87 | 0.73 |
|  | **CANDIDATE B** | 4.64 | 3.95 | 3.40 | 2.92 | 2.54 | 2.26 | 1.94 | 1.78 | 1.53 | 1.03 | 0.74 |
| contacts (mean) | **CANDIDATE B** | 1.56 | 1.62 | 1.72 | 1.78 | 1.83 | 1.85 | 1.91 | 1.94 | 1.98 | 2.00 | 2.00 |

### Head — 15 m/s dropping 25° (hard, forced) (D 2.7723, HEAD)

| | scale | BC 10 | BC 20 | BC 30 | BC 40 | BC 50 | BC 60 | BC 70 | BC 75 | BC 80 | BC 90 | BC 99 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| immediate / adjusted / recovery / unstable % | ORIGINAL (1) | 0/2/14/85 | 0/2/16/82 | 0/4/19/78 | 0/7/20/74 | 1/9/23/68 | 1/14/30/56 | 3/16/45/37 | 3/21/51/26 | 6/30/49/16 | 18/58/23/2 | 79/21/0/0 |
|  | CURRENT (1.1) | 1/11/24/66 | 1/14/28/58 | 2/13/40/45 | 3/18/49/31 | 4/26/51/20 | 8/35/46/13 | 13/49/34/5 | 17/56/26/2 | 21/64/16/0 | 45/53/3/0 | 90/11/0/0 |
|  | 1.2 A (not chosen) | 0/8/23/70 | 1/11/24/65 | 1/14/31/55 | 2/14/44/41 | 3/18/49/31 | 3/21/50/27 | 3/23/50/25 | 4/26/51/20 | 6/32/47/16 | 18/61/21/1 | 87/13/0/0 |
|  | **CANDIDATE B** | 0/8/23/70 | 1/11/24/66 | 1/13/29/58 | 2/13/36/50 | 3/16/45/37 | 3/19/51/28 | 4/26/51/20 | 4/32/48/17 | 8/35/46/12 | 21/64/16/0 | 87/13/0/0 |
| recovery distance (m) | CURRENT (1.1) | 1.56 | 1.67 | 1.79 | 1.66 | 1.47 | 1.10 | 0.75 | 0.62 | 0.50 | 0.28 | 0.12 |
|  | **CANDIDATE B** | 1.70 | 1.56 | 1.71 | 1.77 | 1.70 | 1.74 | 1.48 | 1.33 | 1.06 | 0.49 | 0.13 |
| recovery time (s) | CURRENT (1.1) | 0.39 | 0.43 | 0.46 | 0.43 | 0.27 | 0.11 | 0.05 | 0.03 | 0.02 | 0.01 | 0.00 |
|  | **CANDIDATE B** | 0.55 | 0.39 | 0.42 | 0.45 | 0.45 | 0.40 | 0.28 | 0.20 | 0.10 | 0.02 | 0.00 |
| stable-control time (s) | CURRENT (1.1) | 1.44 | 1.48 | 1.50 | 1.48 | 1.31 | 1.15 | 1.10 | 1.08 | 1.07 | 1.06 | 1.05 |
|  | **CANDIDATE B** | 1.59 | 1.44 | 1.47 | 1.50 | 1.50 | 1.45 | 1.32 | 1.24 | 1.14 | 1.07 | 1.05 |
| 2.0 s distance (m) | CURRENT (1.1) | 5.80 | 4.92 | 4.20 | 3.51 | 2.90 | 2.35 | 1.86 | 1.63 | 1.46 | 1.14 | 0.94 |
|  | **CANDIDATE B** | 6.57 | 5.81 | 5.01 | 4.40 | 3.83 | 3.41 | 2.91 | 2.61 | 2.28 | 1.45 | 0.95 |
| contacts (mean) | **CANDIDATE B** | 1.35 | 1.37 | 1.44 | 1.51 | 1.65 | 1.73 | 1.81 | 1.83 | 1.90 | 2.00 | 2.00 |

**Readings:**

- **Ground, 2 m/s:** compressed. IMMEDIATE everywhere, as in every scale.
- **Ground, 12 m/s:** stays manageable. B is 64 / 78 / 85 / 89 / 93 / 99 % clean at BC 30 / 40 / 50 / 60 / 70 / 80 (current 80 / 88 / 93 / 99 / 100 / 100). The median receive needs a second touch only at BC 10.
- **Thigh, manageable:** never cartoonish. UNSTABLE 0 % at every rating, and the median extra step is ≤ 0.23 m. It is 89 / 97 / 100 % clean at BC 50 / 70 / 80.
- **Chest, manageable:** 60 / 68 / 76 / 80 / 84 / 98 % clean at BC 50 / 60 / 70 / 75 / 80 / 90 (current 76 / 84 / 89 / 95 / 98 / 99). UNSTABLE is 0 % at every rating.
- **Head, manageable:** 26 / 31 / 40 / 47 / 54 / 87 % clean (current 40 / 52 / 65 / 76 / 86 / 97). The rest is mostly ADJUSTED, a step to the drop. UNSTABLE is ≤ 3 % at BC 10–30 and 0 % from 40.
- **Hard aerials:** the ratings are exposed, as intended. At BC 50 / 80 / 90 the hard thigh is 11 / 37 / 82 % clean, the hard chest 9 / 29 / 56 % and the forced header 3 / 8 / 21 %.

## 8 · Follow-up control, recovery distance / time, stable timing

- **The follow-up system is unchanged.** It is RECEIVE-KILL-1.1's: predict the real post-contact ball, plan a follow-up foot control, at most 3 contacts per episode. B changes only how often and how far it is needed.
- **22 m/s pass at BC 50 / 60 / 70 / 75 / 80:**
  - mean contacts 1.65 / 1.60 / 1.48 / 1.42 / 1.26 (current 1.48 / 1.29 / 1.15 / 1.11 / 1.05);
  - median recovery distance 0.70 / 0.48 / 0.00 / 0.00 / 0.00 m (0 m: at least half the seeds needed no extra step);
  - median recovery time 0.50 / 0.43 / 0.33 / 0.13 / 0.00 s;
  - median stable time 0.73 / 0.65 / 0.55 / 0.36 / 0.23 s.
  - Lower Ball Control shows up as a later, extra-touch continuation, not as a ball that flies away:
    - the median 2-s distance at BC 50 is 1.02 m (original model: 1.80 m);
    - UNSTABLE is ≤ 6 % from BC 50 up.
- **Aerials:** two contacts by design. The cost of a weaker rating is the extra step to the drop:
  - chest 0.21 / 0.18 / 0.16 / 0.02 m at BC 50 / 70 / 80 / 99;
  - head 0.39 / 0.30 / 0.23 / 0.05 m;
  - plus, on the hard aerials, a later stable time: hard chest 1.17 / 0.85 / 0.75 / 0.69 s.

## 9 · Original vs current vs B

Where B sits between the two earlier models, by error at a hard pass (0 = current, 1 = original):

| | BC 10 | BC 20 | BC 30 | BC 40 | BC 50 | BC 60 | BC 70 | BC 75 | BC 80 | BC 90 | BC 99 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **CANDIDATE B** | 0.30 | 0.30 | 0.32 | 0.36 | 0.43 | 0.58 | 0.83 | 0.97 | 1.08 | 1.13 | 1.00 |
| 1.2 A (not chosen) | 0.30 | 0.25 | 0.20 | 0.20 | 0.29 | 0.53 | 0.94 | 1.21 | 1.43 | 1.49 | 1.00 |

- **Below BC 60** B is closer to current than to original.
- **BC 70–90** sits at about the original model's error (summary, point 2).
- **The low end stays far from the original model's explosions.** At BC 10 the hard-pass median 2-s distance is 3.34 m against the original's 5.71 m; the forced header is 6.57 vs 10.22 m.

## 10 · Matched visual comparisons at B (TYPICAL draw, the same ball and draws at BC 40 · 50 · 60 · 70 · 75 · 80 · 90 · 99)

Clips and still grids are in `compare_b/`. The same tiles at the CURRENT scale are in `compare_current/`, and at A in `compare/`. My reading of the stills:

- **12 m/s ground pass.** One clean inside-foot touch at every rating, BC 40 to 99: the ball sits at the foot by +0.25 s in all eight tiles. This draw shows no rating difference; at 200 seeds the clean share is 85 / 89 / 93 / 96 / 99 % at BC 50 / 60 / 70 / 75 / 80 (current 93 / 99 / 100 / 100 / 100).
  - Measured at B: 40:I1 0.00m 0.23s · 50:I1 0.00m 0.23s · 60:I1 0.00m 0.23s · 70:I1 0.00m 0.23s · 75:I1 0.00m 0.23s · 80:I1 0.00m 0.23s · 90:I1 0.00m 0.23s · 99:I1 0.00m 0.23s
- **22 m/s ground pass.** BC 40–70 all take a heavy first touch and a second touch: at +0.50 s the ball is still running and the player is stepping after it, and the step shrinks 0.92 → 0.66 → 0.49 → 0.34 m (stable at 0.80 / 0.71 / 0.66 / 0.61 s). From BC 75 up it is one touch, dead at the foot, stable at 0.23 s. With this draw the break sits between 70 and 75 (current scale: between 50 and 60; A: between 75 and 80).
  - Measured at B: 40:R2 0.92m 0.80s · 50:R2 0.66m 0.71s · 60:R2 0.49m 0.66s · 70:R2 0.34m 0.61s · 75:I1 0.00m 0.23s · 80:I1 0.00m 0.23s · 90:I1 0.00m 0.23s · 99:I1 0.00m 0.23s
- **Thigh, 6 m/s 35°.** Thigh drop then foot follow-up at every rating, all IMMEDIATE; the drop lands farther from the intended point as the rating falls (extra step 0.17 m at BC 40 → 0.02 m at 99). Nothing cartoonish: the ball always comes down inside the player's reach.
  - Measured at B: 40:I2 0.17m 0.72s · 50:I2 0.14m 0.71s · 60:I2 0.12m 0.71s · 70:I2 0.11m 0.71s · 75:I2 0.09m 0.70s · 80:I2 0.08m 0.70s · 90:I2 0.04m 0.69s · 99:I2 0.02m 0.69s
- **Chest, 8 m/s 20°.** Chest cushion then foot follow-up. BC 40 / 50 need a small adjustment (0.33 / 0.28 m, ADJUSTED); from BC 60 it is IMMEDIATE and the drop closes on the intended point (0.24 → 0.03 m). The side view shows the gap shrinking steadily through 60–80, more visibly than on the current scale.
  - Measured at B: 40:A2 0.33m 0.66s · 50:A2 0.28m 0.66s · 60:I2 0.24m 0.66s · 70:I2 0.21m 0.66s · 75:I2 0.19m 0.66s · 80:I2 0.16m 0.67s · 90:I2 0.09m 0.67s · 99:I2 0.03m 0.67s
- **Head, 6 m/s 15°.** Cushioned header then foot follow-up. BC 40–80 step to the drop (ADJUSTED, 0.66 → 0.31 m); 90 / 99 are IMMEDIATE (0.17 / 0.05 m). The drop-point gap in the side view narrows rating by rating; at 99 the drop almost coincides with the ideal.
  - Measured at B: 40:A2 0.66m 0.99s · 50:A2 0.56m 0.99s · 60:A2 0.48m 0.98s · 70:A2 0.41m 0.98s · 75:A2 0.37m 0.98s · 80:A2 0.31m 0.97s · 90:I2 0.17m 0.97s · 99:I2 0.05m 0.96s

I / A / R = IMMEDIATE / ADJUSTED / RECOVERY, then contacts, extra step and stable time. Every tile label equals these values.

## 11 · Matrices at B

`screens_b/matrix_{BENCH,GROUND,THIGH,CHEST,HEAD}.png`: the TYPICAL grid with the 200-seed overlay from `rk12b_distribution.json`, which covers all 11 matrices × 11 ratings. The live matrix computes them in the page from the same kernel and code. `screens_b/lab_hard_bc70.png` and `lab_hard_bc75.png` show the lab at B on the 22 m/s pass either side of the break.

## 12 · Deterministic verification (at B)

- **Scale machinery** (`rk12b_scalecheck.json`): the CURRENT scale = RECEIVE-KILL-1.1 in 162/162 episodes; the ORIGINAL scale = RECEIVE-KILL-1's evidence in 90/90 cells.
- **Matched draws** (`rk12b_determinism.json`):
  - every contact's draws are identical across BC: 153/153;
  - first-contact error = the same vector × E: 905/905 (19 capped by restitution, max relative deviation 2.7e-15);
  - different seeds differ: 70/70.
- **Replay:** 252/252.
- **Fresh-world schedule path:** 252/252 (388 contacts).
- **Animation on / off:** 14/14.
- **Chrome = Node:** 180/180 across B, A, current, original.

## 13 · Regressions

- **RECEIVE-KILL-1.1 and RECEIVE-KILL-1:** 90/90 episodes and 90/90 cells equal their evidence (`rk12b_regression.json`).
- **DRIBBLE-V1:** 60/60 before == after; frozen evidence 48/48.
- **RECEIVE-CONTROL-1.1:** 11/11 review cases; full matrix rerun 714/714 identical to its evidence of record (`rk12b_receive11_matrix_714_rerun_compare.json`).
- **Frozen parameters:** D1 / RX / RXE unchanged: true.
- **Frozen and protected files:** 122/122 IDENTICAL against the start-of-1.2 hashes (`rk12b_frozen_sha256_end_check.txt`). This covers DRIBBLE-V1, TURN-1.2, RUN-1, BALL-FEEL / BALL-PHYS, tackle, RECEIVE-CONTROL-1.1, RECEIVE-KILL-1 and RECEIVE-KILL-1.1. PASSING and SHOOTING are not touched by this code.

## 14 · Performance

Node, measured alone (`rk12b_cpu.json`). Brackets are the first round (A); the last column is two repeat runs (`rk12b_cpu_repeat1|2.json`).

| first surface | first contact (ms) | whole episode (ms) | worst episode (ms) | repeats: whole / worst |
|---|---|---|---|---|
| FOOT | 0.181 (0.174) | **3.51** (3.51) | 7.77 (7.91) | 3.50 / 7.88 · 3.49 / 7.48 |
| THIGH | 0.147 (0.146) | **5.20** (4.98) | 8.66 (6.13) | 5.01 / 5.67 · 5.02 / 5.72 |
| CHEST | 0.041 (0.040) | **4.99** (4.94) | 5.47 (5.44) | 5.01 / 5.56 · 4.97 / 5.39 |
| HEAD | 0.051 (0.054) | **4.41** (4.18) | 8.64 (5.25) | 4.21 / 5.63 · 4.20 / 5.64 |

- **Unchanged.** The scale is a different set of PCHIP knots, with the same arithmetic.
- **The worst column is noisy.** One slow episode sets it: 8.7 ms for THIGH / HEAD in the first B run, about 5.7 ms in both repeats.

## 15 · Links (local server :8361, LOCAL ONLY — the character is a real player's model)

- **B review:** http://127.0.0.1:8361/review_artifacts/receive_kill12/review/RECEIVE_KILL12B_REVIEW.html
- **Matrix, B by default:** http://127.0.0.1:8361/sandbox/visual/receive_kill12.html?m=BENCH (`&scale=B|A|current|original`)
- **Lab, B by default:** http://127.0.0.1:8361/sandbox/visual/receive_kill12_lab.html?v=22&bc=75 (`&scale=…`, `&compare=1` for tiles)
- **First round (A), as presented:** http://127.0.0.1:8361/review_artifacts/receive_kill12/review/RECEIVE_KILL12_REVIEW.html
- **Evidence:**
  - `evidence/rk12b_four_scales.md|json`: all measures × four scales;
  - `rk12b_as_measured.json`, `rk12b_distribution.json`, `rk12b_compare_typical.json`, `rk12b_visual_notes.json`;
  - the determinism, regression and CPU files above.

## Not done / limitations

- **Not frozen, not integrated.** B is the candidate only; RECEIVE-CONTROL-1.1 still uses its own Ball Control.
- **Pure remap.** B cannot produce any outcome the current scale does not produce at some rating.
- **Body and conditions unchanged from 1.1.** The placeholder body is not in the ball's world. The receiver is stationary in clean conditions, and follow-ups are foot controls only.
- **One draw in the clips.** The comparison clips use the TYPICAL draw. The distribution over 200 seeds is in the tables and the matrix overlay.
