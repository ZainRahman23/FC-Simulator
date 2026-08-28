# NOTES — Structural Possession / Chance-Creation Pass (paused mid-investigation)

**Status: diagnostics phase. ZERO football-engine changes made.** Everything below is
instrumentation + evidence. Baseline is green and untouched.

## Where things stand

- Baseline verified before starting: core 53/53, integration 22/22, E2E 4/4,
  run-vs-advance parity PASS. Calibration `v0.7-cal2` (ratings + GK fixes locked).
- Quality-gap preservation baseline = `validation/out/final_quality` from the previous
  pass (engine code identical, so it remains the valid current reference).

## Instrumentation added this session (all observational, no engine edits)

| File | What it does |
|---|---|
| `simulator/validation/possession.py` | Possession-lifecycle analyzer built **entirely post-hoc over the event ledger** (POSSESSION_CHANGE/RESTART boundaries, staged pass probabilities already logged by the engine). Produces per-possession records, survival curves, termination taxonomy, stage funnels (middle/final/box/shot), per-action turnover hazard, pass-stage decomposition (by type/direction/distance/pressure), recycling stats, settled-vs-transition xG. Instrumentation parity is exact by construction — nothing runs during a match. |
| `simulator/validation/run_possession.py` | Parallel runner over the existing scenario registry (coach AI frozen, deterministic seeds). |
| `simulator/validation/trace_possessions.py` | §26 readable possession traces from fixed seeds (real logged probabilities, no prose guessing). |

Known analyzer quirks (fixed/known):
- FIXED: turnover-causing PASS events are recorded *after* POSSESSION_CHANGE → now
  attributed back to the possession that ended (first run's `int 0.0%` was this bug).
- OPEN: AERIAL_LONG and CROSS events use different outcome labels than ground passes →
  they pollute the by-direction table (that's why "lateral" shows 20% completion —
  unclassified outcomes counted as failures). Normalize their outcomes before trusting
  direction-mix completion numbers.

## Data artifacts

- `simulator/validation/out/poss_baseline.json` — first run (has the attribution bug; keep for reference only)
- `simulator/validation/out/poss_baseline2.json` — **corrected**, 7 scenarios × 120 matches (840 total)

## Key evidence so far (from poss_baseline2 + traces)

**Possession anatomy (mean/median duration s · final-third reach · xG per final-third possession):**
- ultra_vs_ultra: 38.5 / 28 · 34.7% · 0.0043  ← long possessions ARE mechanically possible when unpressed
- controlled_vs_controlled: 18.8 / 14 · 36.4% · 0.0061
- balanced_vs_balanced: 16.6 / 13 · **54.3%** · **0.0048**  ← possessions MATURE territorially but produce junk
- aggressive_vs_ultra: 14.1 / 10 · 38.0% · **0.0213** (box reach 22.1%) ← siege quality per entry is 4-5× balanced
- aggressive_vs_aggressive: 8.0 / 6 · 56.6% · 0.0098

**Terminations (balanced):** PASS_INTERCEPTED 21.6%, TACKLE_LOST 21.2%, CLEARANCE_LOST 13.8%,
CARRY_LOST 11.5%, SHIELD_LOST 7.6%, RECEIVER_DENIED 5.5%, FIRST_TOUCH_LOST 2.2%.

**Per-action hazard (balanced):** flat/rising ~0.20→0.30 per action — geometric decay,
no stabilization as possessions mature.

**Pass mix & outcomes (balanced, corrected):**
- LONG is 55% of ground passes (35,077 of ~64k); SHORT only 18%. Even CONTROLLED
  (PATIENT/SHORT plan) plays 63.7% forward passes with 24k forward-longs.
- Completion by distance: 0-15m **80.4%** · 15-30m 67.0% · 30-45m 56.8% · 45m+ 38.7%.
  Realized ≈ the engine's own p_exec estimate (consistent staging ✓).
- zero-eligible-interceptor share: 75% of 0-15m passes, 36% of 30-45m (geometry active
  on long balls more than expected — corridor 5.5m).
- **Short circulation is leaky: 73.7% completion on SHORT type; ~12.8% die at first
  touch.** Real-world 10m passes complete ~93%. This kills retention independent of choice.

**Traces** (`trace_possessions.py`): "controlled" teams repeatedly hit 30-48m longs
under pressure to isolated forwards, who then lose the next duel (TACKLE/CARRY_LOST);
sieges include 33m pot-shots with xG 0.008.

## Root-cause hypotheses (current ranking, not yet final)

1. **MATERIAL — pass-choice risk/progress imbalance** (`_pass_option_utility`, engine.py
   ~line 1205): `+1.20 × progress/20` gives a 40m forward ball +2.4 utility vs
   `0.78 × ln(p_exec)` ≈ −0.35 risk charge; softmax T=0.75 → ~14:1 preference for the
   launch over available short options (options DO exist — all recognized teammates ≤49m
   are candidates). Crucially `turnover_consequence` is scoped to own-goal danger only:
   **losing the ball in the opponent's half costs nothing** in the utility. All profiles
   converge to direct football; the settled-probe maturation machinery (which boosts
   high-confidence progression AFTER patient buildup) never engages because nobody is patient.
2. **MATERIAL — short-pass/reception leakiness**: 73-80% completion at short range;
   first-touch loss ~12.8%. Suspects: touch logistic (`1.82 + 1.12·g(bc) + 0.48·g(rea)
   − 1.30·receive_pressure − 0.38·marking − 0.20·err`) and/or pressure/marking arriving
   on nearly every receiver (§13 pressure-arrival not yet measured).
3. **POSSIBLE — aggressive-vs-ultra rebound/second-ball chains**: xG/entry 0.021 —
   rebound-chain decomposition (§16/§17: shots within N s of clearance/parry) NOT yet run.
4. Previously reverted settled-probe coefficients remain the wrong lever (confirmed again:
   possessions don't reach probe age).

## Exactly what I was about to test next

1. **Normalize aerial/cross outcomes** in `possession.py`, then re-read direction tables
   (backward-pass completion is currently untrustworthy).
2. **Pressure-arrival + p_control decomposition** (§13/§15): distribution of
   `receive_pressure`/`marking` on short passes; is a passive/selective block attaching a
   defender to every receiver? Compare p_control by pressure bucket across profiles.
3. **Siege anatomy** (§16-18): for aggressive_vs_ultra, classify shots by preceding event
   (clearance-recovery ≤6s, parry/block rebound ≤6s, cross, settled) to find where the
   0.021 xG/entry comes from.
4. Then, if evidence holds, propose ONE change family per §37 — most likely candidates
   (in the sanctioned action-choice layer, §31): rebalance `_pass_option_utility`
   progress-vs-risk (e.g. progress coeff 1.20↓ and/or ln(p_exec) coeff 0.78↑ and/or a
   small non-zero turnover_consequence floor outside the defensive third — that last one
   extends an existing term's scope, debatable minimality, discuss first), with
   matched-seed before/after on: possession survival, pass mix, funnel xG/entry, the
   full tactical subset (§38 criteria 3-7 especially: ultra must stay dead, aggr-aggr
   must stay transition-heavy), and quality-gap preservation.
   NOTE: fixing choice alone should lengthen possessions AND let the probe machinery
   engage; do NOT touch short-pass execution in the same family (§37 one family at a time —
   reception leakiness is a separate candidate family pending the §13/§15 measurements).

## Commands to resume

```bash
cd "~/Downloads/FC Simulator/simulator"
# rerun structural baseline (deterministic, reproduces poss_baseline2 exactly):
../.venv/bin/python -m validation.run_possession \
  --scenarios matrix/ultra_vs_ultra matrix/controlled_vs_controlled matrix/balanced_vs_balanced \
  matrix/wide_attack_vs_controlled matrix/aggressive_vs_ultra matrix/ultra_vs_aggressive \
  matrix/aggressive_vs_aggressive --matches 120 --workers 8 --out validation/out/poss_baseline2.json
# traces:
../.venv/bin/python validation/trace_possessions.py matrix/controlled_vs_controlled 3 early_death
../.venv/bin/python validation/trace_possessions.py matrix/aggressive_vs_ultra 2 shot
```

No engine files were modified this session. The §29 diagnostic report is not yet
written — findings above are its raw material once items 1-3 land.

---
# RESOLVED (2026-08-19)
Pass completed. All three queued diagnostics ran (outcome normalization, pressure
decomposition, siege anatomy); §29 report + change-family experiments finished.
**Outcome: zero engine changes shipped** — pressure-engagement gating and pass-choice
rebalance were both matched-seed tested and reverted (as was the prior probe attempt).
Decisive finding: cagey/balanced chance creation is chaos-financed; settled penetration
is the missing mechanism — full specification in
`simulator/validation/POSSESSION_STRUCTURAL_REPORT.md`. Engine bit-identical to
v0.7-cal2 (verified); all suites green (53/22/4/parity).
