# Reference Results — v0.7

v0.7 emphasizes **population diagnostics** rather than cherry-picking a single 90-minute seed. Full-match JSON examples remain included for debugging, but the current extreme presets still have a high-xG tail and should not be treated as calibrated league truth.

## Mirrored tactical matchup matrix

Six seeds x 30 minutes, identical mirrored personnel, frozen coach AI, scaled to per-90 rates:

| Matchup | Home xG | Away xG | Total xG | Home/Away shots | Transition shots | Possession changes |
|---|---:|---:|---:|---:|---:|---:|
| Ultra vs Ultra | 0.170 | 0.065 | **0.235** | 4.5 / 3.5 | 0.0 | 139 |
| Controlled vs Controlled | 0.274 | 0.317 | **0.591** | 5.5 / 9.0 | 0.5 | 309 |
| Wide attack vs Ultra | 0.760 | 0.077 | **0.837** | 10.0 / 4.0 | 0.0 | 223 |
| Extreme Open vs Open | 1.559 | 1.925 | **3.484** | 14.0 / 16.5 | 14.5 | 682 |
| Extreme Open vs Ultra stress | 2.321 | 0.043 | **2.364** | 19.0 / 2.0 | 2.5 | 383 |

The desired causal ordering is present: ultra-ultra is the lowest ecology; controlled football creates more; a single attacking side can break down a low block without creating two-way chaos; true open-open has the most transitions and total chances. The extreme open-v-ultra stress case remains too productive in some seeds and is intentionally exposed rather than capped.

## Paired ratings/quality sweep

Four seed pairs, each played HOME/AWAY with the advantage swapped, 30-minute matches under the same open tactical plan:

| Attribute shift each side | Total gap | Favorite xG share | Favorite W-D-L |
|---:|---:|---:|---:|
| 0 | 0 | **0.500** | 3-2-3 (labels arbitrary at parity) |
| +/-1 | 2 | **0.580** | 3-5-0 |
| +/-2 | 4 | **0.627** | 2-5-1 |
| +/-3 | 6 | **0.728** | 2-6-0 |

Win counts are deliberately not treated as stable calibration truth at this sample size. The stronger evidence is the monotonic shift in expected xG share. At the moderate +/-2 setting, the underdog still won a match with no upset aid.

## Full-match stress examples

The included `*_demo_v0_7.json` files use seed 13000 and are useful for event tracing. That seed produces an unusually high tail for the current extreme styles (including open-v-ultra and open-v-open), so those single matches are **not** the representative calibration reference. The next calibration pass should reduce repeated close-range siege entries structurally rather than cap xG/goals.
