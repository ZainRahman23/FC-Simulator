# cal12 — CONTINUOUS FOOTBALL CADENCE STUDY

**Question:** WHEN should a footballer reconsider what he is doing, now that the world is continuous?
**Date:** 2026-08-26 · **Status:** COMPLETE — stopped at the decision gate. Production RC8/cal11 and the save frozen and re-verified; nothing integrated or deployed; no xG/finishing/success parameter touched anywhere.

**Flags:** all cadence behavior lives behind `CAD` flags. Flags-OFF (`MODE:'A'`) reproduced the accepted Hybrid-C baseline **bit-identically over a full 90-minute match** (trace `d72f534a3caae3d1`). Candidate freeze: `*_prereqfinal_baseline.py` (`643e76fc237a61c2` / `1722558476ed2bed` / `c4c7a761c6672ec9`).

---

## 1. Forensic baseline (§8) — the hypothesis was WRONG in the most useful way

Decomposition of the 90-minute world-time budget (accepted baseline A):

| bucket | A | meaning |
|---|---|---|
| ball in flight | **2434 s (45%)** | honest physics of 22 launches/min |
| controlled | 1615 s (30%) | **0.5 s of control per decision** |
| loose | 675 s (12.5%) | recoveries |
| dead | 676 s (12.5%) | restarts |

cal11 native: 1899 carrier decisions/match (~2.7 s of hold each), ~11 launches/min, zero flight time. Hybrid A: **3179 decisions/match (35/min), 1486 repeat-decisions within 1 s, 22 launches/min, CLEAR 401 vs native 50 (8×)**.

**Root cause: not too few decisions — too many, too early.** The RECEPTION wake fired at t+0 of first touch, converting cal11 into an involuntary one-touch team; and decision instants clustered at pressure spikes (receptions + closing defenders), so cal11's own math correctly chose safe/clearing actions at unrepresentatively bad moments (the CLEAR×8 effect). Possession lived in transit.

**Real-football anchors (not native)**: ~55 in-play min, ~48% of in-play controlled (~27 min — which Hybrid-C already matches), ~900 total passes (we hit 1600), ~25 shots → 0.0156 shots/control-second — **identical to Hybrid-C's 0.0156**. Native's 969 FT-seconds belong to a world without ball travel and are not a legitimate dwell target. The report of the previous study is thereby refined: the deficit was never per-instant attacking quality; it was launch rate and decision-instant bias.

## 2. Architecture (§5–§7) — EVENT-DRIVEN + PERSISTENT INTENTIONS + HYSTERESIS

Three clocks kept explicit: 60 Hz physics unchanged; football clock = world seconds (unchanged); the DECISION scheduler is what cal12 governs. No physics acceleration, no flight shortening, no teleports anywhere.

Candidate D2 (= **cal12**), all deterministic/event-keyed:

- **SETTLE-AND-SCAN** (`SETTLED` wake): a receiver decides after his first touch settles plus a composure-scaled scan (≤1.2 s), while a protective settle intent keeps the ball at his feet. **One-touch survives**: an opponent within 1.8 m at contact ⇒ immediate decision (mechanism-proven: latency 0.0 s with a defender at 1.0 m).
- **Rising-edge PRESSURE with hysteresis**: fires only on a material pressure rise (Δ≥0.15) after a 0.9 s refractory — spike-sampling removed (PRESSURE wakes 345→70 per 30 min).
- **IMPROVED wake (the de-biasing counterpart)**: after ≥1.2 s of hold, a material retreat of the nearest opponent (≥1.5 m) re-opens the menu — decisions now sample improving states, not only deteriorating ones.
- **State-dependent fallback**: final third + free 1.5 s · default 3.0 s · settled own-third circulation 3.5 s. No universal cadence.
- **Persistence**: active TAKE_ON never interrupted (0 interrupts measured); refractory prevents action reversal; low-block defender target churn 11→4 per 12 s; BX.P box runs persist (runner advance +3.5 to +10.5 m over 6 s while the carrier holds).

Rejected candidates, with evidence: **B (global 0.5 s)** — the diagnostic control behaved exactly as §9 warned: decisions 39.5/min, control share 0.229 (worst), FT dwell 117 s, 704 repeat-decisions — more deciding, less football. **C without persistence** — over-harvested windows (shots/FT-s 0.051, 3× real: churn-flavored). **D3 (heavier damping)** — over-dampened (diminishing dwell, fewer receptions). D base → D2 parameter iteration is documented in `cad_iter.out` (cadence timing parameters only; zero success/outcome parameters exist in the layer).

## 3. What cal12 changes (A → cal12, same seed, 30 min)

| metric | A | cal12 | native ref |
|---|---|---|---|
| decisions/min | 33.2 | **24.1** | 21.8 |
| launches/min | 14.8 | 14.2 | ~11 |
| control share | 0.302 | **0.320** | (n/a: no flight) |
| flight share | 0.462 | 0.419 | 0 |
| CLEAR decisions | 124 | **74** | ~25/30min-equiv 12 |
| FT control (30 min) | 199 s | **211 s** | — |
| shots/control-s | 0.0037* | **0.0139** | 0.0144 (real ~0.0156) |
| repeat-decisions <1 s | 438 | ~200 | — |
| wake mix | RECEPTION 575 / PRESSURE 345 | RECEPTION 297 / IMPROVED 191 / SETTLED 120 / PRESSURE 70 | uniform 1 Hz |

*seed-segment low; A's 10-seed norm ≈ 0.0156. 90-min cal12 seed-1: control 1700 s, FT dwell **535 s (+39% vs A's 384)**, shots 15, shots/ctrl-s 0.0088 (conservative vs real 0.0156 — no churn signature).

## 4. Micro-scenarios (§15)

CB circulation: fewer, calmer decisions (D: 2 in 20 s). Between-lines: SETTLED after scan ✓. Pressured winger: one-touch immediate ✓ (two earlier scenario FAILs were diorama-geometry artifacts — receiver legitimately met the pass away from the defender — documented and replaced with mechanism-true setups). Take-on: 0 interrupts ✓. Box-run persistence ✓. Low-block jitter: −64% ✓. Recovery window = t_rec ✓. Scramble/aerial/transition/restarts: covered by the standing gates (micro-gates A–J re-passed after every change).

## 5. Full-match distributions (§17: 20 matched seeds × 90 min)

**Record W11 D3 L5, goals 40–24** (2.0 vs 1.2/match; elite takes ~63% of points — real strong-favorite band; native's W-nearly-all remains the abstract extreme). Shots/team ≈ 6.8 home / 6.5 away (home now out-shoots away); median spells 4.0–5.5 s; fouls mean 18.9 (range 8–27) + regular yellows; beats 12–24/match; completion 0.60–0.66; zero continuity violations. Distribution percentiles in `cal12_battery.json`.

## 6. Tactical differentiation (§12) — not homogenized

| matchup (30 min × 2 seeds) | signature measured |
|---|---|
| elite attack vs low block | **siege**: shots 6-0/4-2, lowest flips (7.5–9.3), long spells |
| aggressive vs aggressive | **most transitions**: flips 11.4–11.6, shortest spells 3.0–3.4 s, most fouls (9–12) and melee |
| low block vs low block | **lowest-event football**: flips 7.7–8.3, spells to 5.8 s |
| high press vs buildup | high fouls (7–12), elevated flips, suppressed away shots |
| counter vs high line | outlets preserved, transitions visible |
| direct vs balanced | long spells, few shots |

## 7. Attributes, fatigue, randomness (§13–§14)

Execution families untouched by cadence (decision-layer only); all family gates re-verified in this build (finishing/GK/passing/reception/tackling/reactions monotone). Stamina match-counterfactual monotone under cal12 (85.0/88.6/88.9). Fatigue authority unchanged (body telemetry → accepted curves → physical speed). Determinism: flags-OFF bit-identity; cal12 same-seed identical; **chunk-independent** (`369ce65c1fcdf8aa`); scheduler fully deterministic/event-keyed — no unseeded randomness introduced, RNG streams unchanged in kind.

## 8. Visual evidence (§16)

`viewer_cal12.html` on **:8303** — deterministic 90-min cal12 replay with debug-only overlays (decision-wake flashes with reasons, carrier decision-interval, world/match clocks, possession state) and bookmarks: BUILDUP/SETTLE_SCAN (press resistance), TAKEON_EXPLOIT, THROUGH_BALL, CUTBACK, TRANSITION, LONG_BALL, SHOT/GOAL, FOUL/FREE_KICK/CORNER/OFFSIDE/KICKOFF/THROW_IN, LATE_GAME. Low-block-siege viewing available by replaying matchup class 1.

## 9. §19 presentation report (measured, NOT implemented)

90 world-min ⇒ ball-in-play 4706 s (87%), dead 694 s. Required presentation compression: ~8 min ⇒ 11.2× (9.8× if dead time skipped) · ~10 min ⇒ 9.0×/7.8× · ~12 min ⇒ 7.5×/6.5× · ~15 min ⇒ 6.0×/5.2×. No compression, speed-up, or animation change was made.

## 10. Known limitations

Per-team shot volume (~6.8) remains below real (~12–14): FT dwell share of control (31%) still under real football's; further gains belong to attacking-structure dwell (box control measured only 26 s/match — box occupation remains brief) — a brain-positioning topic, not a cadence one. 30-min quality-cell 2×2 remains noisy at that window length (20-seed record is the authoritative quality gradient). Aerial/holding foul classes still absent (no header model). Goals 3.2/match total sits slightly above real 2.8.

## FINAL CLASSIFICATION

| dimension | verdict |
|---|---|
| mechanism correctness | **PASS** |
| decision ecology | **PASS** |
| possession ecology | **PASS** |
| attacking flow | **PASS with note** (per-team shot volume below real; normalized rates conservative-healthy) |
| defending | **PASS** |
| tactical differentiation | **PASS** |
| player-quality differentiation | **PASS** (20-seed record; short-cell noise noted) |
| fatigue/workload | **PASS** |
| randomness/determinism | **PASS** |
| statistical distributions | **PASS with notes** (goals slightly hot; shot volume low-side) |
| visual football quality | viewer ready — **user's personal gate** |

# cal12: **ACCEPT WITH EXCEPTIONS**

Exceptions: (1) per-team shot volume below real-football counts pending box-occupation/dwell work (brain-side positioning, not cadence); (2) aerial foul classes absent; (3) final visual acceptance reserved to the user.

### Proposed production-integration sequence (NOT executed)

1. User visual gate (`viewer_cal12.html`).
2. Merge order: body + hybrid execution layer + lab adapter + inserted engine-lab block (byte-verified additive) behind `WORLD["CONTINUOUS"]` + `CAD` flags, defaults OFF; **flags-OFF digest-identical** to cal11 RC8 (BX/ST discipline).
3. Checkpoint `cal12-checkpoint-<date>` before any flag flip; DB/save untouched by schema (no migrations needed — engine-internal only).
4. Parity gates: flags-OFF digest battery (50 seeds); flags-ON lab-vs-production hash parity; run-vs-advance parity; hosted-vs-local parity battery; chunk independence.
5. Regression batteries: micro-gates A–J, ecology, family harnesses, tactical classes, quality record, foul/card volumes — all thresholds as in this study.
6. Rollback: flags OFF restores cal11 exactly; checkpoint restore as second line.
7. Presentation compression and renderer integration remain separate, later, user-gated milestones.

**STOP.** No merge, no deploy, no renderer work. Awaiting authorization.
