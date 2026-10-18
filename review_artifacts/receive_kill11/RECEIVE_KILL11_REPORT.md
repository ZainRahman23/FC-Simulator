# RECEIVE-KILL-1.1 report — compressed Ball Control + follow-up control

18 Oct 2026, branch `prototype/dribble-1`. **Presented for review — not frozen; the constants are not locked.**

**Owner instruction:** verbatim in `sources/2026-10-18_user_instruction_receive_kill_1_1.md`.

**Code:** `sandbox/visual/receive_kill11/` is a copy of RECEIVE-KILL-1's module, extended. RECEIVE-KILL-1, RECEIVE-CONTROL-1.1, DRIBBLE-V1, TURN-1.2 and the ball physics are unchanged and re-verified (item 22).

**Video:** I cannot play video in real time. My visual judgements come from the still grids and stills, not from watching the clips.

## How to read the numbers

- **Distributions** use 200 keyed seeds per cell. The first contact's draws are identical to RECEIVE-KILL-1's, so old vs new is matched draw for draw.
- **2 s distance** is RECEIVE-KILL-1's headline: the distance from the intended point 2.0 s after the first touch. It is kept for old vs new.
- **New first-contact measures:** the exit-velocity error, the position error against the ideal ball at 0.10–2.0 s, and the drop-point error for aerial surfaces.
- **New episode measures:** contacts, extra adjustment, time to stable control and the continuation class (items 16–17).

---

## 1. The old Ball Control formula (RECEIVE-KILL-1)

```
E   = 0.0068 + 0.40 · u^1.1 · D/(D + 1)          u = (100 − BC)/90
σ_a = k_a,surface · 10 m/s · D · E               v_out = v_ideal + Σ σ_a · N_a
```

## 2. The new compressed formula

```
E    = 0.0068 + 0.25 · s(BC) · D/(D + 1)
s(BC) = u · (0.68 + 0.32 · u²)                   u = (100 − BC)/90:  s = 1 at BC 10 … 0.0076 at BC 99
σ_a  = k_a,surface · 10 m/s · D · E               (unchanged)
```

The surface error shapes `k` of the two airborne surfaces are reduced:

| Surface | Old k | New k |
|---|---|---|
| CHEST | [1.0, 0.6, 0.6] | [0.85, 0.5, 0.5] |
| HEAD | [1.0, 0.9, 0.6] | [0.85, 0.7, 0.5] |

Everything the owner said to keep is kept:
- the non-zero elite floor (0.0068);
- continuous ratings;
- easy-ball compression;
- the difficulty interaction D/(D + 1);
- matched deterministic draws (the same keys as RECEIVE-KILL-1).

## 3. Why the new curve is narrower

**The amplitude.** The skill term falls from 0.40 to 0.25. At the low end that is 37 % less; in the middle of the scale it is about 45 % less, because of the curve's shape.

| Relative error E at a hard pass (D 2.2) | BC 10 | 30 | 50 | 70 | 80 | 90 | 99 |
|---|---|---|---|---|---|---|---|
| old | .282 | .215 | .151 | .089 | .059 | .031 | .009 |
| new | .179 | .124 | .081 | .048 | .033 | .020 | .008 |

**The shape.** The old curve was nearly linear in u. The new one is u·(0.68 + 0.32·u²): linear near the top, convex below. Per 10 rating points the hard-pass error grows by:

| Rating step | 99 → 90 | 90 → 80 | … | 30 → 20 | 20 → 10 |
|---|---|---|---|---|---|
| Error increase | +.012 | +.013 | (widening steadily) | +.025 | +.030 |

So 99 → 90 stays visible, 90 → 70 widens gently, and 70 → 10 expands more.

**Distances shrink more than the velocity error.** The turf brakes a slow ball hard, so a 45 % smaller velocity error becomes a roughly 60 % shorter heavy touch.

**Aerial surfaces are now judged at the contact.** Their first contacts are measured at and right after the contact, and the follow-up turns their error into recovery work (Part B). So the extra harshness they had under the 2-s metric was removed from chest and head.

## 4. Old vs new for every benchmark

Median distance from the intended point 2 s after the first touch, the same seeds and draws (m). All rows are in `evidence/rk11_old_vs_new.md`.

| Benchmark | Version | BC 10 | 30 | 50 | 70 | 80 | 90 | 99 |
|---|---|---|---|---|---|---|---|---|
| EASY 2 m/s roller | old | 0.03 | 0.02 | 0.01 | 0.01 | 0.01 | 0.00 | 0.00 |
| | new | 0.02 | 0.01 | 0.01 | 0.01 | 0.00 | 0.00 | 0.00 |
| HARD 22 m/s ground | old | 5.71 | 3.52 | 1.80 | 0.68 | 0.33 | 0.12 | 0.03 |
| | new | **2.46** | **1.26** | **0.57** | **0.23** | **0.13** | **0.07** | 0.03 |
| HARD 25 m/s | old | 7.74 | 4.84 | 2.49 | 0.90 | 0.45 | 0.15 | 0.04 |
| | new | 3.45 | 1.70 | 0.77 | 0.30 | 0.17 | 0.08 | 0.04 |
| THIGH 6 m/s | old | 0.83 | 0.63 | 0.46 | 0.27 | 0.19 | 0.10 | 0.04 |
| | new | 0.54 | 0.37 | 0.26 | 0.15 | 0.11 | 0.07 | 0.04 |
| THIGH 16 m/s | old | 3.68 | 2.85 | 1.99 | 1.18 | 0.80 | 0.45 | 0.15 |
| | new | 2.36 | 1.63 | 1.07 | 0.65 | 0.47 | 0.28 | 0.15 |
| CHEST 8 m/s | old | 2.02 | 1.55 | 1.08 | 0.64 | 0.43 | 0.24 | 0.08 |
| | new | 1.09 | 0.75 | 0.49 | 0.29 | 0.21 | 0.13 | 0.06 |
| CHEST 20 m/s | old | 7.35 | 5.67 | 3.98 | 2.44 | 1.73 | 1.11 | 0.75 |
| | new | 3.96 | 2.78 | 1.94 | 1.29 | 1.04 | 0.87 | 0.73 |
| HEAD 6 m/s | old | 2.73 | 2.12 | 1.54 | 0.94 | 0.64 | 0.36 | 0.12 |
| | new | 1.48 | 1.04 | 0.70 | 0.42 | 0.30 | 0.19 | 0.09 |
| HEAD 15 m/s | old | 10.2 | 8.00 | 5.99 | 3.77 | 2.64 | 1.62 | 0.98 |
| | new | 5.80 | 4.20 | 2.90 | 1.86 | 1.46 | 1.14 | 0.94 |

On the hard ground pass the low and middle ratings come down by 57–68 %. The aerial 2-s numbers come down 35–55 %. They are no longer the headline: a chest drop keeps moving after a good contact, and the complete receive (items 13–15) is what counts. BC 99 is unchanged everywhere: the elite floor and the surface limits are untouched.

## 5. BC 10–99 matrices

There are 11 matrices in `sandbox/visual/receive_kill11.html`: GROUND, BOUNCE, LOW, THIGH, CHEST, HEAD, HEIGHT, DROP, ENERGY, SIDE and BENCH.
- Every cell shows the FIRST CONTACT (velocity error, plus the drop point or the ¼-s error) and the COMPLETE RECEIVE (contacts and follow-up surface, extra adjustment, time to stable control, the continuation chip).
- The 200-seed overlay adds the continuation shares and the extra adjustment's median and p90.
- Screenshots are on the review page; the full numbers are in `evidence/rk11_distribution.json` and `rk11_old_vs_new.md`.

Ground matrix (median 2-s distance; in brackets, the share of episodes needing a recovery touch or ending loose):

| Speed | D | BC 10 | 30 | 50 | 70 | 80 | 90 | 99 |
|---|---|---|---|---|---|---|---|---|
| 2 m/s | 0.22 | 0.02 | 0.01 | 0.01 | 0.01 | 0.00 | 0.00 | 0.00 |
| 5 | 0.51 | 0.07 | 0.05 | 0.03 | 0.02 | 0.01 | 0.01 | 0.01 |
| 8 | 0.81 | 0.20 (12 %) | 0.12 (2 %) | 0.07 | 0.04 | 0.03 | 0.02 | 0.01 |
| 12 | 1.21 | 0.53 (44 %) | 0.29 (20 %) | 0.15 (7 %) | 0.07 | 0.05 | 0.03 | 0.01 |
| 16 | 1.62 | 1.11 (72 %) | 0.57 (47 %) | 0.28 (19 %) | 0.12 (3 %) | 0.08 | 0.04 | 0.02 |
| 20 | 2.02 | 1.95 (83 %) | 0.99 (70 %) | 0.46 (40 %) | 0.19 (12 %) | 0.11 (2 %) | 0.06 | 0.02 |
| 25 | 2.54 | 3.45 (93 %) | 1.70 (80 %) | 0.77 (62 %) | 0.30 (26 %) | 0.17 (12 %) | 0.08 (1 %) | 0.04 |
| 30 | 3.04 | 5.04 (94 %) | 2.63 (86 %) | 1.15 (73 %) | 0.43 (40 %) | 0.24 (24 %) | 0.11 (8 %) | 0.07 |

## 6. Immediate post-contact measurements

Every run now reports:
- the first touch's exit velocity and its error against the ideal exit (|Δv|);
- its position error against the ideal ball at 0.10 / 0.25 / 0.50 / 1.00 / 2.00 s;
- for aerial surfaces, the drop point (the first landing) against the ideal drop point.

Median velocity error (m/s) at BC 10 / 50 / 70 / 90 / 99:

| Benchmark | BC 10 | BC 50 | BC 70 | BC 90 | BC 99 |
|---|---|---|---|---|---|
| 22 m/s ground | 3.36 | 1.53 | 0.90 | 0.37 | 0.15 |
| 6 m/s thigh | 0.64 | 0.30 | 0.18 | 0.08 | 0.04 |
| 8 m/s chest | 1.16 | 0.54 | 0.32 | 0.14 | 0.07 |
| 6 m/s head | 1.22 | 0.63 | 0.38 | 0.17 | 0.08 |

## 7. The 0.10 / 0.25 / 0.50 / 1.0 / 2.0 s measurements

Median position error against the ideal ball (m) at 0.10 / 0.25 / 0.50 / 1.0 / 2.0 s:

| Benchmark | BC 10 | BC 50 | BC 70 | BC 99 |
|---|---|---|---|---|
| 22 m/s ground | .32 / .76 / 1.40 / 2.29 / 2.47 | .14 / .32 / .49 / .56 / .56 | .08 / .17 / .22 / .23 / .23 | .01 / .02 / .02 / .03 / .03 |
| 8 m/s chest | .12 / .29 / .42 / .65 / 1.09 | .05 / .13 / .20 / .30 / .49 | .03 / .08 / .12 / .18 / .30 | .01 / .02 / .02 / .04 / .06 |
| 6 m/s head | .12 / .30 / .60 / .88 / 1.49 | .06 / .16 / .32 / .43 / .70 | .04 / .09 / .19 / .26 / .43 | .01 / .02 / .04 / .05 / .09 |

These separate a BAD FIRST CONTACT from GOOD CONTACT + NORMAL MOTION. A BC 70 chest control is 3 cm off the ideal ball 0.10 s after the touch and 12 cm off at 0.5 s. Its 2-s gap of 0.30 m is the ball's normal bounce and roll after a good drop.

## 8. Foot-kill results

The foot kill is unchanged in kind: still the strongest true kill (item 21). It is compressed in scale. On the 22 m/s pass (200 seeds):

| BC | Immediate | Needs a recovery touch | Loose | Median 2-s distance | Note |
|---|---|---|---|---|---|
| 99 | 100 % | 0 % | 0 % | 0.03 m | |
| 90 | 100 % | 0 % | 0 % | 0.07 m | |
| 80 | 94 % | 5 % | 0 % | 0.13 m | |
| 70 | 84 % | 15 % | 0 % | 0.23 m | |
| 50 | 49 % | 48 % | 2 % | 0.57 m | Recovery touch: the extra step's p90 is 1.41 m; median stable at 0.48 s instead of 0.23 s |
| 30 | 25 % | 65 % | 10 % | 1.26 m | |
| 10 | 12 % | 62 % | 25 % | 2.46 m | |

A loose ball is beyond the 4 m recovery reach. The easy 2 m/s roller is killed immediately at every rating (≤ 2 cm). Owner targets, item by item:
- BC 99 almost perfect ✓
- BC 90 small residual ✓
- BC 80 comfortably controllable ✓
- BC 70 immediately playable in 84 % ✓
- BC 50 often needs adjustment / recovery, but is not launched metres away (2 % loose) ✓
- BC 30 genuinely dangerous ✓
- BC 10 poor ✓

## 9. Thigh first-contact results

6 m/s, 35°, 0.95 m:

| BC | Velocity error | Drop-point error |
|---|---|---|
| 99 | 0.04 m/s | 0.01 m |
| 70 | 0.18 | 0.06 |
| 50 | 0.30 | 0.10 |
| 10 | 0.64 | 0.21 |

16 m/s (hard): drop-point error 0.04 (BC 99), 0.24 (BC 70), 0.42 (BC 50), 0.92 m (BC 10). The thigh matrix has all seven speeds in `rk11_old_vs_new.md`.

## 10. Chest first-contact results

8 m/s, 20°, 1.32 m:

| BC | Velocity error | Drop-point error |
|---|---|---|
| 99 | 0.07 m/s | 0.02 m |
| 70 | 0.32 | 0.10 |
| 50 | 0.54 | 0.17 |
| 10 | 1.16 | 0.38 |

20 m/s (hard): drop-point error 0.06 / 0.36 / 0.62 / 1.55 m. Above 12 m/s into the chest the surface limit adds a forward residual even at BC 99.

## 11. Head first-contact results

6 m/s, 15°, 1.78 m:

| BC | Velocity error | Drop-point error |
|---|---|---|
| 99 | 0.08 m/s | 0.05 m |
| 70 | 0.38 | 0.23 |
| 50 | 0.63 | 0.36 |
| 10 | 1.22 | 0.77 |

15 m/s, forced head (AUTO would chest it): drop-point error 0.16 / 0.89 / 1.52 / 3.26 m.

## 12. The follow-up foot-control implementation

Code: `runEpisode` in `rk_sim.js`.

1. **The first contact executes.** One kernel `schedule()`, as in RECEIVE-KILL-1.
2. **The receiver re-predicts the real ball.** `predictFrom()`: the kernel's free-ball prediction from the actual post-contact state.
3. **Is a follow-up needed?** After THIGH / CHEST / HEAD, always: the ball drops and the foot takes it. After a foot kill, only if the ball will not reach stable control by itself within 1.0 s.
4. **The follow-up plan** (`planFollow`, closed form over the predicted path):
   - candidates are the foot surfaces × both feet × ticks;
   - each needs the stance adjustment (≤ 4 m at 3 m/s after a 0.12 s reaction);
   - the body must be free: after a FOOT 0.15 s, THIGH 0.20, CHEST 0.12, HEAD 0.20 (+0.15 after a jump); the leg prepares while the chest cushions;
   - each needs the foot's 0.22 s preparation;
   - cost `J = D + 0.8·adjustment + 1.0·(wait + expected settling) + preference`. Expected settling is the bounce train of a ball put down from height (`settleEst`), so a sole trap on the landing beats waiting for a bounce's apex.
   - Ball Control never enters the plan.
5. **The follow-up's ideal.** The foot surface's own: dead under the sole, put down at the foot, or rolled to the settle point. It is solved through the exit table.
6. **Ball Control executes the follow-up** with its own keyed draws (event `kill1.f1`). Its difficulty comes from the ball the first contact actually produced: speed, height and the bearing of a ball running away. That is how the errors are causally localised: one rating, each contact's draw keyed by its own event, each contact responding to the real state.
7. **The follow-up is a second authoritative `schedule()`,** with its own CONTACT tick and 6 cm window. If its result still won't settle, a recovery touch follows (at most 3 contacts).
8. **The episode is measured:** stable control, continuation and metrics.

The ball is a free rigid body throughout; nothing holds or attaches it. The animation contract for the sequence is `RECEIVE_KILL11_ANIMATION_CONTRACT.md`.

## 13. Complete thigh-control sequences

Ideal episode: thigh → **sole trap** on the landing at 0.46 s → stable at 0.68 s, with a 1 cm step.

| Benchmark | BC | Immediate | Extra adjustment (median) | Stable at |
|---|---|---|---|---|
| 6 m/s | 99 | 100 % | 0.01 m | 0.68 s |
| | 70 | 100 % | 0.06 m | 0.69 s |
| | 50 | 98 % | 0.09 m | 0.69 s |
| | 30 | 86 % (14 % adjusted) | 0.13 m | 0.69 s |
| | 10 | 56 % (44 % adjusted) | 0.18 m | 0.72 s |
| 16 m/s (hard) | 99 | 100 % | 0.04 m | 0.70 s |
| | 80 | 80 % | 0.15 m | – |
| | 70 | 57 % | 0.21 m | – |
| | 50 | 22 % (67 % adjusted, 10 % recovery) | 0.42 m | 0.86 s |
| | 10 | 4 % (52 % recovery, 8 % loose) | 1.09 m | 1.11 s |

## 14. Complete chest-control sequences

Ideal episode: chest → **sole trap** of the dropping ball at 0.45 s → stable at 0.67 s, with a 0.13 m step.

| Benchmark | BC | Immediate | Adjusted / recovery | Extra adjustment (median) | Stable at |
|---|---|---|---|---|---|
| 8 m/s | 99 | 100 % | – | 0.02 m | 0.67 s |
| | 90 | 99 % | – | 0.05 m | 0.67 s |
| | 70 | 88 % | – | 0.13 m | 0.67 s |
| | 50 | 76 % | 24 % adjusted | 0.18 m | 0.67 s |
| | 30 | 52 % | 44 % adjusted, 3 % recovery | 0.23 m | 0.67 s |
| | 10 | 35 % | 52 % adjusted, 13 % recovery | 0.36 m | 0.70 s |
| 20 m/s (hard) | 99 | 99 % | – | 0.06 m | – |
| | 70 | 40 % | 48 % adjusted | 0.31 m | – |
| | 50 | 18 % | 50 % adjusted, 24 % recovery, 9 % loose | 0.61 m | 0.85 s |
| | 10 | 4 % | 38 % recovery, 38 % loose | – | – |

The 8 m/s rows are exactly the owner's chest picture. High ratings: minimal adjustment and a quick follow-up. Lower ratings: a less ideal drop, more adjustment, a later continuation. Never launched away: 0 % loose at every rating.

## 15. Complete head-control sequences

Ideal episode: header → the ball drops ~1 m in front → the player steps 0.23 m → **sole trap** at 0.73 s → stable at 0.96 s.

| Benchmark | BC | Immediate | Adjusted / other | Extra adjustment (median) |
|---|---|---|---|---|
| 6 m/s | 99 | 100 % | – | 0.04 m |
| | 90 | 96 % | – | 0.11 m |
| | 70 | 65 % | 35 % adjusted | 0.19 m |
| | 50 | 40 % | 59 % adjusted | 0.29 m |
| | 30 | 23 % | 70 % adjusted | 0.44 m |
| | 10 | 16 % | 58 % adjusted, 26 % recovery | 0.62 m |
| 15 m/s, forced head (hard) | 99 | 90 % | – | – |
| | 70 | 12 % | 49 % adjusted, 34 % recovery | – |
| | 50 | 4 % | 20 % loose | – |
| | 10 | – | 66 % loose | – |

Judged as a cushion plus its follow-up, the manageable header stays fully controlled at every rating (0 % loose). Ball Control shows as the size of the step to the drop. The 15 m/s header is the extreme case (the hardest surface, near its speed limit).

## 16. Time-to-stable-control results

Stable control is a diagnostic, never a possession switch. All of these must hold for 0.10 s:
- the ball centre is at most 0.21 m high and |vz| ≤ 0.8 m/s;
- the ball's speed is ≤ 0.8 m/s;
- it is inside the usable zone (forward −0.20 … 0.70 m, side ≤ 0.55 m, ≤ 0.72 m from the stance);
- the player is settled: no action or adjustment in progress.

Median time from the first contact (s):

| Benchmark | BC 99 | 70 | 50 | 30 | 10 |
|---|---|---|---|---|---|
| 22 m/s ground | 0.23 | 0.23 | 0.48 | 0.76 | 0.97 |
| Thigh 6 | 0.68 | 0.69 | 0.69 | 0.69 | 0.72 |
| Chest 8 | 0.67 | 0.67 | 0.67 | 0.67 | 0.70 |
| Head 6 | 0.96 | 0.97 | 0.97 | 0.98 | 1.00 |
| Chest 20 | 0.69 | 0.72 | 0.85 | 1.18 | 1.23 |

At stable control the ball is a median 0.42 m from the player at every rating: where the foot plays it.

**Continuation classes** are measured against the ideal episode:

| Class | Definition |
|---|---|
| IMMEDIATE | Natural contacts (foot 1, aerial 2), extra adjustment ≤ 0.25 m, ≤ 0.25 s later than the ideal |
| ADJUSTED | Natural contacts, extra adjustment ≤ 1.0 m |
| RECOVERY | An extra touch, or extra adjustment > 1.0 m |
| UNSTABLE | No stable control within 4 m: a loose ball |

## 17. Recovery-distance results

The extra adjustment is how far the player must be from where the perfect execution needed him (median / p90, m):

| Benchmark | BC 99 | 90 | 70 | 50 | 30 | 10 |
|---|---|---|---|---|---|---|
| 22 m/s ground (recovery touch) | 0 / 0 | 0 / 0 | 0 / 0.47 | 0 / 1.41 | 0.79 / 2.27 | 1.44 / 3.38 |
| Thigh 6 | .01 / .02 | .03 / .05 | .06 / .11 | .09 / .17 | .13 / .27 | .18 / .41 |
| Chest 8 | .02 / .06 | .05 / .20 | .13 / .26 | .18 / .43 | .23 / .65 | .36 / 1.21 |
| Head 6 | .04 / .13 | .11 / .20 | .19 / .41 | .29 / .66 | .44 / .91 | .62 / 1.59 |

Contacts per episode (mean) on the 22 m/s pass:

| BC | 99 | 70 | 50 | 30 | 10 |
|---|---|---|---|---|---|
| Contacts | 1.00 | 1.15 | 1.48 | 1.65 | 1.62 |

At BC 10 some balls are loose before a second touch is possible.

## 18. Matched-rating visual comparisons

`compare/` holds seven cases: HARD 22 m/s; CHEST 8 and 20 m/s; THIGH 6 and 16 m/s; HEAD 6 and 15 m/s. Each uses the same ball and the TYPICAL draw at BC 30 / 50 / 70 / 80 / 90 / 99, and comes as:
- **a 2×3 side-by-side video:** a 3D and side view per rating, labelled with the measured class, contacts, extra step and time to stable control;
- **a still grid:** rows are the ratings; columns are −0.10, CONTACT, +0.25, +0.50, +0.80 and +1.20 s.

From the still grids, the difference between ratings now reads as:
- **aerial cases:** a longer step to the drop and, low down, a wide recovery;
- **ground:** a recovery touch that grows from none (BC 70 up) to a chase (BC 30).

It no longer reads as a ball flying further and further away.

## 19. Interactive lab

`sandbox/visual/receive_kill11_lab.html` keeps RECEIVE-KILL-1's controls and views, and plays the whole episode.
- **Body:** the placeholder plays the sequence: cushion, the adjustment step, the follow-up foot control.
- **Views:** the ideal episode is the green ghost; follow-up contacts are cyan; stable control is a white diamond; the adjustment path is yellow.
- **Panel:** the incoming ball, the first action, the compressed E, the FIRST CONTACT block (exit, velocity error, position errors at 0.10–2.0 s, drop point), every contact of the episode (surface, time, D, σ, draws, exit, step) and the COMPLETE RECEIVE (class, contacts, next feasible control, adjustment, stable time and distance).
- **BC ladder:** class, extra step, stable time and contacts at every rating, with the same draws.
- **Compare mode:** `&compare=1` gives the comparison tiles.

## 20. Performance

Node, one process, run alone (`evidence/rk11_cpu.json`). Times are per episode, in milliseconds.

| First surface | First contact (plan + ideal + execution + launch) | Follow-ups / episode | Follow-up predictions | Follow-up plans + contacts | Whole receive episode | Worst | Free-ball physics (the world's own) |
|---|---|---|---|---|---|---|---|
| FOOT | 0.172 | 0.25 | 3.04 | 0.17 | **3.38** | 7.84 | 3.24 |
| THIGH | 0.148 | 0.94 | 4.52 | 0.49 | **5.16** | 5.81 | 3.08 |
| CHEST | 0.039 | 0.92 | 4.42 | 0.48 | **4.93** | 5.47 | 3.08 |
| HEAD | 0.050 | 0.72 | 3.78 | 0.39 | **4.22** | 5.21 | 2.96 |

**The first contact is as cheap as in RECEIVE-KILL-1:** 0.04–0.17 ms per kill, against 16 ms per RECEIVE-CONTROL-1.1 receive.

**The whole episode costs 3.4–5.2 ms.** It is dominated by the follow-up's kernel prediction of the real post-contact ball: a 3-s horizon, about 720 kernel steps, ~2.3–3 ms per prediction. A foot kill always runs one, to check whether the ball will settle by itself.
- The follow-up plans and contacts themselves cost 0.2–0.5 ms.
- There is no contact search and no biomechanics.

An adaptive horizon (1.5 s, extended only when needed) would roughly halve the prediction cost. It is not applied, to keep the evidence of record unchanged. In a match the prediction would be the shared free-ball predictor.

**Matrix generation:**
- The page computes a 10-row matrix in about 3 s.
- In Node, the 80-cell ground matrix takes 0.66 s and the 90-cell benchmark matrix 0.78 s, each as complete episodes.
- All 74 balls × 10 ratings × 200 seeds (first contact + episode) take 428 s wall on 11 processes.

**One-time build:** the exit-speed table built 24 columns, at about 72 ms each.

## 21. Determinism

From `evidence/rk11_determinism.json` and `rk11_chrome_node.json`:

| Check | Result |
|---|---|
| Every contact's draws are keyed by its own event, never by Ball Control: identical at all ten ratings | 151/151 contact draw sets |
| The first contact's error is the same vector × E(BC, D) | 829/829 exact (max deviation 4.8e-15); 11 executions capped |
| Replay | 252/252 |
| Seeds differ | 70/70 |
| A fresh world from the pass's launch with every launch of the episode scheduled up front = the episode, bit for bit | 252/252 (387 contacts) |
| Animation on / off (the body posed at every tick of the episode) | 14/14 |
| Chrome = Node: decisions, every contact's tick and executed launch, the final ball, the stable time | 45/45 whole episodes |

## 22. Regression

| What | Result |
|---|---|
| RECEIVE-KILL-1 (its own module and constants), before and after in one process | 90/90 benchmark cells = its evidence of record |
| DRIBBLE-V1, before / after 650 RECEIVE-KILL-1.1 episodes (the body posed) | 60/60 identical; frozen evidence 48/48 |
| RECEIVE-CONTROL-1.1 review cases, before / after | 11/11 |
| D1 / RX / RXE parameter objects | Unchanged (`rk11_regression.json`) |
| RECEIVE-CONTROL-1.1 714-run matrix of record, rerun | 714/714 identical (`receive11_matrix_714_rerun_compare.json`) |
| 93 hashed files (DRIBBLE-V1, TURN-1.2, RUN-1.3, ball physics, the RNG and attributes, RECEIVE-CONTROL-1 and 1.1, all of RECEIVE-KILL-1) | Identical (`frozen_sha256_end_check.txt`) |

RECEIVE-KILL-1.1 adds only new files and is not wired into RECEIVE-CONTROL-1.1.

## 23. Known limitations

- **The body is a procedural placeholder.** It is not in the ball's world, so a loose ball passes through the legs, and the sequence blending is procedural. Real clips must meet `RECEIVE_KILL11_ANIMATION_CONTRACT.md`.
- **The owner's isolation still applies.** The receiver is stationary in clean conditions. The adjustment is a fixed 3 m/s shuffle (Agility later) and the foot actions' timing is fixed (Dribbling later). There is no opponent, so UNSTABLE means "loose within 4 m", not "lost to someone".
- **The hard aerial cases stay demanding** (CHEST 20 m/s, HEAD 15 m/s forced): below BC 50 a large share are loose balls. The forced 15 m/s header is the extreme case; AUTO would chest it.
- **The follow-up surfaces are all feet.** A second thigh or chest touch isn't modelled. A bouncing ball that can't be reached at foot height within 3 s counts as loose.
- **Not locked:**
  - the curve (eSkill 0.25, λ 0.68);
  - the chest and head error shapes;
  - the follow-up timing (free times, 0.22 s preparation, 3 m/s, 4 m reach);
  - the planner weights;
  - the stable-control and continuation thresholds.

## 24. Review material

All are local only; the lab server runs on `http://127.0.0.1:8361`.

| What | Where |
|---|---|
| Review page | `review_artifacts/receive_kill11/review/RECEIVE_KILL11_REVIEW.html` → `http://127.0.0.1:8361/review_artifacts/receive_kill11/review/RECEIVE_KILL11_REVIEW.html` |
| Episode matrix | `http://127.0.0.1:8361/sandbox/visual/receive_kill11.html?m=BENCH` (tabs; `&draw=seed3`; `&dist=1`; click a cell for every number) |
| Episode lab | `http://127.0.0.1:8361/sandbox/visual/receive_kill11_lab.html?v=8&h=1.32&drop=20&surface=CHEST&bc=50` (`&compare=1`; `&cam=side`) |
| RECEIVE-KILL-1, kept for comparison | `http://127.0.0.1:8361/sandbox/visual/receive_kill1.html`, and its review page |
| Animation contract, handoff, status | `RECEIVE_KILL11_ANIMATION_CONTRACT.md`, `RECEIVE_KILL11_HANDOFF.md`, `RECEIVE_KILL11_STATUS.json` |
| Evidence | `evidence/`: the distribution, old vs new, determinism, Chrome/Node, CPU, regression, frozen hashes, body contacts |
| Comparisons | `compare/`: 7 side-by-side videos + still grids; 42 tiles |
| Matrix screenshots | `screens/` |
