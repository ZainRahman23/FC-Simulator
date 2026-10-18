# DRIBBLE-1.5 — The last narrow foundation pass

**Session:** 18 Oct 2026, 02:40–04:00 EEST (17 Oct chronicle day)
**Branch:** `prototype/dribble-1`
**Instruction (verbatim):** `review_artifacts/dribble15/sources/2026-10-18_user_instruction_dribble1_5_last_foundation_pass.md`

**Review page:** `http://127.0.0.1:8361/review_artifacts/dribble15/review/DRIBBLE15_REVIEW.html`. It is local only, because the lab shows real player names.

I cannot play video in real time. Every visual judgement here comes from frame strips and stills.

## Root cause

I traced every 90° right run in D1.2 and D1.4 from the request onwards. D1.4 made its first stage *earlier* (median 0.50 vs 0.61 s after the request), yet released the rest of the cut *later* (1.70 vs 1.33 s). It also needed one more touch to get the ball onto the new line (3 vs 2).

That extra touch was a **second stage**. It happened in 12 of 68 taken 90° right runs, and 4 of 52 at 90° left (D1.2: 6 and 5). Here is the mechanism:

1. A staged 90° cut releases half the turn (to ≈ 45°) and holds the rest.
2. At the next release search, the planner decides whether the rest is still "big" (≥ `stagedMin`, 75°). If it is, it stages again; if not, it releases the full cut.
3. The planner measured that remaining angle from the player's **velocity** heading. That heading lags the commanded stage heading for several hundred milliseconds while TURN-1.2 turns.
4. So a cut with ≈ 45° left looked ≈ 75° away, and the planner staged again a few degrees further — costing one touch and ≈ 0.5 s.

The intent layer's hold already measured the held cut from "the line of the cut so far"; only the planner did not.

Example, seed 83:
- **D1.4** staged to 35°, then again to 49°. The ball was on the line at 2.15 s.
- **D1.5** makes the full inside-left cut to 74° at the same moment, and is clean in 0.91 s.

The three suspected caps were **ruled out**. I restored each alone over 384 matched runs:

| Change | Clean 90° (D1.4: 27) |
|---|---|
| `maxSetups` unlimited | 29 |
| `rStop1` off | 26 |
| `c12CutAtContact` on | 28 |

Earlier "not planner latency" conclusions were masked by this defect.
- **Fix alone:** clean 90° rose from 27 to 39.
- **Fix with planning unbudgeted** (a diagnostic): 50.
- **So** the rest of the gap *is* decision latency.

## Exact change

1. **`plan15.stageLine`** — one planner line.
   - **What changed:** once a stage is in force, the remaining cut is measured from the stage line (`held.line`), the same line the intent's hold uses.
   - **What didn't:** the staged direction and everything downstream.
   - **Effect on 60°:** none — 60° cuts never stage, so they stay bit-identical.
2. **Decision-tick budget 8 → 12 ms** (`plan13.budgetHi` 12000) — a parameter of the same architecture.
   - **When it applies:** only in ticks where a decision is due.
   - **Why this value:** 12 ms beat 8 ms on two independent 384-run blocks; 16 ms was no better.
3. **Flag fix, with no behaviour change:** `rStop1` alone now controls the release search's first-valid stop. D1.3 / 1.4 tied it to `rFirst`, so it could not be tested.

## Before / after (384 cut runs, seeds 1–96)

| Metric | D1.2 | D1.3 | D1.4 | **D1.5** |
|---|---|---|---|---|
| Cuts taken / 384 | 258 | 256 | 273 | **273** |
| Clean cuts / 384 | 129 | 114 | 121 | **140** |
| Clean 60° / 192 | 81 | 84 | 94 | **93** |
| Clean 90° / 192 | 48 | 30 | 27 | **47** |
| 60R per 8 | 6.67 | 6.25 | 6.50 | 6.25 |
| 60L per 8 | 5.42 | 5.42 | 6.25 | 5.92 |
| 90R per 8 | 5.33 | 5.08 | 5.67 | 5.58 |
| 90L per 8 | 4.08 | 4.58 | 4.33 | **5.00** |
| Decisive toe | 8.5 % | 5.1 % | 5.9 % | 6.2 % |
| ≥ 9 m/s decisive cut touches | 0 | 0 | 0 | 0 |
| Set-up attempts / success | 117 / 56 % | 24 / 75 % | 79 / 56 % | 79 / 59 % |
| Straight control | 100 % | 100 % | 100 % | 100 % |
| Immediate same-foot recontact | 0.10 % | 0.10 % | 0.10 % | 0.05 % |
| Average CPU (ms/s) | 205 | 146 | 142 | **144** |
| Worst spike (ms) | 540 | 28 | 27 | 34 |
| Chrome / Node decisions | — | 20 / 20 | 20 / 20 | **20 / 20** |

Independent validation on seeds 97–192: D1.5 has 282 taken, 146 clean and 90° clean 49. The stage-line fix alone at 8 ms gets 273 / 136 / 42 there.

## Matched-seed analysis (D1.4 → D1.5, 384 runs)

Overall: **46 better · 32 worse · 84 neutral** (different play, same outcome) **· 222 identical.**

| Cut | Better | Worse |
|---|---|---|
| 90° right | 21 | 13 |
| 90° left | 18 | 6 |
| 60° right | 4 | 7 |
| 60° left | 3 | 6 |

- **Matched randomness:** all 180 touches common to both cores in the changed runs draw identical errors (keyed by seed, player, tick, foot).
- **Where 60° changes come from:** only the 12 ms budget (it changes when searches finish). Over 192 seeds they net to −0.1 per 8, and clean 60° is unchanged (188 vs 190 between the 8 ms and 12 ms configurations).

## Representative visual cases

- **Seed 83, 90° right** (`A2_s83_diag`, top camera, ½ speed):
  - **At 3.0 s:** D1.4 plans a second STAGED inside-left touch to 49°. D1.5 plans the full CUT-NOW to 74° for the same moment.
  - **At 4.0 s:** D1.4 still plans a "line 66°" toe touch, while D1.5 is running the 89° line.
- **Seed 37, 90° right** (`B2_s37_zoom`, lost → clean in 0.92 s):
  - **D1.4:** the ball drifts out to the player's side and is lost.
  - **D1.5:** the ball stays in front of him down the new line.
  - No sliding, and no emergency toe contact.
- **Seed 48, 90° left:** lost → clean in 1.23 s.
- **Known case, seed 16, 90° right:** unchanged from D1.4 (stage at 640, cut taken). D1.4's fix is preserved.
- **Suspicious "clean", seed 11, 90° left (FRONT decisive):** an inside-right set-up takes the ball across while the body turns. The FRONT touch is then an ordinary toe push along the new line, not a rescue.
- **Regressions:**
  - *Seed 58, 90° right:* the full 79° cut sends a faster ball that later runs away.
  - *Seed 13, 60° left:* the search finishes sooner and picks a direct −30° outside cut instead of a set-up; ball and body diverge.
  - Both are physical, the risk side of quicker decisions — not a systematic fault.
- **Straight RUN:** bit-identical to D1.4.

## Performance and determinism

- **CPU:** 143.8 ms/s (D1.4 141.8 in the same benchmark; each core in its own process).
- **Spikes:** worst step 34.1 ms (D1.4 27.1). Steps over 20 ms are 0.057 % (D1.4 0.003 %); that is the measured cost of the 12 ms decision budget.
- **Chrome / Node:** decisions 20 / 20 identical.
- **TURN-1.2:** leg pose bit-identical in 112,319 / 112,319 checks; plants 0.0000 mm.
- **Unchanged:** straight 16 / 16; INTERCEPT_RUN 12 / 16; TACKLE_RUN 3 / 16 held — control loss remains.

## Remaining limitations — these now belong to attributes

1. **Turn sharpness.** Clean 90° cuts are back at D1.2's level (47 vs 48). How tight and how quick a 90° turn is now belongs to Agility, Ball Control and pressure.
2. **Preferred / weak foot.** Currently the geometry picks the foot.
3. **Bad-touch severity.** Quicker cuts lose the ball sometimes (seeds 58 and 13). Ball Control should scale execution error through `exec13`.

## Decision

**READY TO FREEZE DRIBBLE-V1 FOUNDATION: YES.**
- **Freeze record:** the core is frozen as `sandbox/visual/dribble15/d15_core.js` at the commit tagged locally `dribble-v1-foundation-1` (see `DRIBBLE15_HANDOFF.md`).
- **Next:** the attribute layer.
