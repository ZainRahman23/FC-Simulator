# Action-Choice cal6 Package — ACCEPTED (v0.7-cal5 → v0.7-cal6)

## The discovery that reframed everything
The choice-layer chance signal (raw candidate xG) **ignores block risk**, which
execution prices separately. Measured at candidate moments: "0.10–0.20 xG"
candidates in sieges carry mean p_block 0.71–0.78 → true value ≈ 0.03; the
"24 windows/match at 0.20+" in aggressive-vs-ultra were 0.72-blocked wall
shots. Only the 0.30+ raw band was genuinely open (p_block ~0.3, mostly
transitions). Re-measured on the truthful axis xg_eff = xg·(1−p_block):
- cal5 was far less broken than raw-xG suggested: open-window cash-out already
  63%, and the forensic's "0/70 declined at 0.02–0.05 raw" were overwhelmingly
  CORRECT declines of blocked shots;
- the five SHOT-only formulations exploded aggressive ecologies because they
  amplified the inflated signal — 49–79 mostly-blocked shots feeding rebound
  cascades. Both live-play phenomena share this single cause (§59 satisfied).

## Diagnostics (all artifacts in validation/forensics/)
- Attacking windows (deterministic diagnostic grouping): 5.07 candidates per
  window in the live case; candidates/window 2.1–3.0 across ALL scenarios —
  multiplication is NOT the aggressive differentiator (hypothesis refuted).
- Unique-window supply: aggr-ultra 57.9 "good" raw windows/match vs balanced
  19.6 — but truthful supply is modest everywhere (live-case matchup: 2.7 open
  windows/match at xg_eff ≥ 0.05).
- CARRY architecture: unconditional candidate; ≤2m micro-carries in packed
  boxes (the re-evaluation loop); utility responds to space/pressure/block;
  real per-carry risk (38/51 box possessions died); missing term = opportunity
  cost of holding an open window. Carry chains are mostly rational wall-probing
  (76% neutral, 17% productive, 7% degrading).
- Legacy bonuses: AMBITIOUS cash-out/probe/COUNTER sized against the dead base
  and gated on RAW xg (rewarding wall shots) — documented; left in place after
  the Family C rebase attempt degraded cash-out (48%) and was REJECTED.

## Accepted package (two terms, both on the truthful signal)
1. **SHOT (Family A, k=9.5, saturation 0.13):**
   `xg_eff = xg·(1−p_block)`; `shoot_u = −2.72 + 1.6·xg + 9.5·min(xg_eff, 0.13) + …`
   (existing ST/finishing/tactical modifiers unchanged). Open quality is
   rewarded steeply; walls stay cold; response saturates once a chance is
   clearly good — which also breaks rebound auto-cascades.
2. **CARRY (Family B, k=2.5):** at rel-x ≥ 66,
   `carry_u −= 2.5·max(0, xg·(1−p_block) − 0.03)` — carrying past a genuinely
   open window costs its value; probing against a wall stays free.
Uses the EXISTING `_shot_block_candidate` estimator read-only (no RNG, no
execution change; execution still rolls its own block exactly as before —
the choice layer previously used neither, so nothing is double-counted).

## Dose-response & rejected variants
Uncapped A95B25 → aggr-aggr +85%; cap 0.16 → +44%; cap 0.13 → **+31%**
(smooth, not hypersensitive). Rejected: Family C rebase (guts probe cash-out);
A alone / B alone (each insufficient); all five raw-xg curves (prior phase).

## Validation (all matched seeds)
- **Live-case ecology (50 seeds, user's exact kickoff):** truthful selection
  ladder 3% / 6% / 39% / 59% / 67%; open-window cash-out 63%→**68%**; goals
  1.53→1.98; junk <0.02 selection unchanged (3%); 25m+ 9.6→9.3; carry share
  and chains ≈ unchanged (wall-probing preserved). Exact-seed counterfactual:
  wall-declines preserved (§30 ✓), open windows cash; still 0-0 on that path
  (§29: no result optimization).
- **Canonical matrix (120 seeds):** ultra 0.12→0.13 · controlled 0.56→0.56 ·
  balanced 1.00→0.97 · aggr-ultra 2.93→3.50 (+19%) · aggr-aggr 3.60→4.73
  (+31%, transition share RISES to 73%; durations identical; shots +9-11%).
  Settled identities untouched; sieges are sieges; open football more honest
  about cashing real breakaways (§33 applied).
- **Quality gradient:** shares 0.475/0.648/0.698/0.762 — preserved within
  1–2pt; underdogs alive.
- **Pressing dial:** cal4 shape intact (0.38/0.56/0.62/0.66 for; 0.83→0.40
  conceded) — no dominance regression.
- **Production equivalence:** committed engine code reproduces the validated
  runtime variant bit-for-bit on matched seeds (5/5 MATCH).
- **RNG/regression:** 74 core PASS (incl. openness contract), run-vs-advance
  parity PASS, OVR/same-seed/worker in-suite; application battery below.

## Versions
Engine v0.7 · **Calibration v0.7-cal6** · players-v3-4attrs (unchanged).
Hosted RC1 (cal5) untouched throughout; RC2 staged separately.

## Remaining known items (unchanged scope)
Junk long-shot volume (~9/match from the low-value candidate tail — cosmetic,
watch in live play); AMBITIOUS/probe stack still raw-xg-gated (documented,
future micro-rebase candidate); aggressive-mirror side asymmetry (deferred
diagnostic); marker-glide presentation issue (separate UI item).
