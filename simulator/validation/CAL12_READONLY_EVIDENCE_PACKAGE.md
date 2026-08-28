# CAL12 READ-ONLY EVIDENCE PACKAGE (pre-integration inspection)

**Date:** 2026-08-26 · **Nothing was modified, tuned, integrated or deployed.** Lab source hashes unchanged from the final-readiness study (`hybrid.py 68048902576ad619`, `lab.py ce6a0ac104795fcb`, `body.py c4c7a761c6672ec9`); production/save hashes unchanged; RC8 live.

**Read-only verifications re-run:** flags-OFF 90-min hash `d72f534a3caae3d1` ✓ byte-identical; final-candidate same-seed 90-min hash `db6dd6d1346417b8` ✓ equals the recorded battery hash.

---

## 1. Visual/causal football audit — curated clips

All 17 requested sequence types occur in **battery match #1 (seed 789335328)** — no seed shopping; selection rule was *first (or first-two) chronological occurrence* of each type. Loaded into `viewer_cal12.html` (:8303); full list in `integration/curated_clips.json`:

| clock | clip | note |
|---|---|---|
| 0:13 | STRONG_TEAM_COUNTER | home wins deep, breaks |
| 0:21 | WEAK_TEAM_COUNTER | away gains high, advances |
| 1:02 | TAKEON_SUCCESS | BEAT; 2.0 s separation window |
| 1:31 | FINAL_THIRD_ATTACK | ends in shot |
| 1:35 | GOAL | |
| 1:36 / 1:38 | MULTI_BOX_OCCUPATION | 3 then 4 attackers in box |
| 1:44 | POST_GOAL_KICKOFF | physical reset, no teleports |
| 2:37 | BOX_RUN_UNSERVED | occupied box, possession recycled |
| 2:51 | TAKEON_FAILED | knock lost to defender |
| 3:08 | SUSTAINED_BUILDUP | 20 s spell |
| 3:22 / 16:20 | CROSS_NEAR_FAR_POST | |
| 5:26 | BOX_RUN_RECEIVED | Gakpo arrives and receives |
| 8:25 | FOUL_AND_RESTART | free kick taken live |
| 20:28 | GK_SAVE_PARRY | |
| 21:43 | CUTBACK | |
| 22:13 | PRESSING_SEQUENCE | 4 pressure wakes / 20 s |
| 32:15 | OFFSIDE | flag at kick, whistle at touch |
| 82:45 | AERIAL_CONTEST | header won (fair) |

## 2. Shot-quality diagnostic (READ-ONLY): why ~4.4 shots/goal

Method: deterministic replay of all 20 final-battery seeds with per-strike measurement (cal11's own `_xg`/block math read at the strike instant, outcomes from the contact record). **Disclosure:** the measurement's mirror-sync perturbed 11 of 20 replays after their first measured strike (9 were bit-identical); the perturbed runs are alternative realizations of the identical mechanism and their aggregates cross-check against the untouched battery (shot counts, goal totals). A future QA harness should measure via a passive mirror copy — noted in the risk register.

**254 shots across 20 matches (12.7/match total; 6.5 home / 6.2 away per 90):**

| quantity | value | context |
|---|---|---|
| xG/shot | mean **0.105**, median 0.059 | real ≈ 0.10 — **candidacy quality is NORMAL, not inflated → hypothesis A rejected** |
| xG/match (total) | 1.33 | low with shot volume, consistent |
| goals from open-play shots | 2.65/match | battery total goals 3.35 incl. scrambles/penalty rebounds |
| **goals − xG** | **+1.32/match (+26.4 / 20 matches)** | execution outperforms cal11's xG ≈ 2× |
| shot distance p10–p90 | 9.9 – 28.4 m (median 17.4) | plausible mix; 55% inside box |
| pressure at shot p25/50/75 | 0.31 / 0.62 / 0.69 | shots under real pressure |
| outcomes | GOAL 53 · BLOCKED 85 (33%) · SAVE 85 · OFF_TARGET 30 | blocked rate real-band |
| **on-target share** | **54%** | **real ≈ 35% — the main anomaly: too few misses** |
| GK save rate (of on-target) | **62%** | real ≈ 70% — secondary contributor |
| big chances (xG ≥ 0.15) | 3.5/match, converted 26% | ≈ expectation |

**Conversion by xG bucket (the decisive table):**

| bucket | n | expected conv | actual conv |
|---|---|---|---|
| 0–0.05 | 113 | ~2.4% | **13% (≈5×)** |
| 0.05–0.10 | 46 | ~6.8% | **24% (≈3.5×)** |
| 0.10–0.20 | 40 | ~13.6% | **35% (≈2.6×)** |
| 0.20–0.40 | 53 | ~27% | 23% (≈1×) |
| 0.40+ | 2 | ~42% | 50% (≈1×) |

**Answer: E-combination dominated by B, with mild C, A rejected, D rejected.** High-quality chances convert exactly at expectation; the over-performance is entirely in LOW-xG (mostly longer-range) shots, whose physical execution is too accurate — the finishing dispersion model produces 54% on-target where real long-range attempts spray far more, and the GK's coverage saves 62% rather than ~70%. This is a *level calibration* of dispersion-vs-distance (and secondarily GK reach/coverage curves), not a broken gradient: finishing↑/reflexes↓/handling↑ monotonicity re-confirmed from the existing harness results with **no anomaly**. Quality remains causal within the sample: home xG/shot 0.123 vs away 0.085; conversion 27% vs 15%.

**No change was made.** If season-statistics realism requires it, the named (authorization-gated) item is: widen long-range angular dispersion with distance and/or recalibrate GK coverage — both attribute-preserving level calibrations in the physical execution layer; xG math untouched either way.

## 3. Final integration risk register

| # | limitation | class | severity | blocks integration? |
|---|---|---|---|---|
| R1 | Low-xG finishing over-performance (on-target 54%, GK 62%) → goals 3.35 vs real 2.8, 4.4 shots/goal | statistical/calibration (physical execution level) | **MEDIUM** | **No** — architecture unaffected; recommend calibrating before/with season-mode rollout |
| R2 | Aerial contest frequency 0–2/match (vocabulary complete, pursuit plays the landing) | missing football vocabulary | MEDIUM | No |
| R3 | Shot volume ~6.4/team vs real 12–14 (strict frozen candidacy + real-band dwell) | statistical/calibration (brain-side, cal13-class) | LOW-MED | No — product-level choice |
| R4 | Workload ~1.8× real m/min (cal11 target density) | brain/body seam | MEDIUM (season fatigue realism) | No — fatigue authority already body-true |
| R5 | Halftime recovery not ported in lab | brain/body seam | LOW | No — listed in integration plan |
| R6 | No targeted header-shots/knockdowns | missing vocabulary | LOW | No |
| R7 | No off-ball fouls / advantage rule | missing vocabulary | LOW | No |
| R8 | Corners 1–5/match (low), throw-ins ~1.2/min (high) | statistical/calibration | LOW | No |
| R9 | 1v1 take-on diorama unrepresentative under brain-authored pressing | test-harness | LOW | No — match-level gates authoritative |
| R10 | Measurement tooling can perturb replays via mirror sync (11/20 in this package) | test-harness | LOW | No — QA harness should use passive mirrors |
| R11 | Presentation compression (11.2× for ~8 min) unimplemented | presentation-only | N/A | No — separate user-gated milestone |

No HIGH-severity items. No blocker. The verdict of the final-readiness study stands: **READY WITH DOCUMENTED NON-BLOCKING LIMITATIONS**, with R1 now precisely characterized as the single most product-visible calibration item.

**STOP.** No cal13, no cadence/shot/xG/finishing/GK/aerial/tactics changes, no integration, no deploy. Awaiting your decision.
