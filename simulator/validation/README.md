# FC Simulator v0.7 — Statistical Validation Harness

Deterministic large-sample validation. Never mutates engine logic.

- `scenarios.py` — declarative scenario registry (tactical matrix, quality gaps,
  attribute counterfactuals, workload, effort, structure, integrity).
- `metrics.py` — read-only extraction from `MatchResult` + distribution stats.
- `run_validation.py` — staged runner (`smoke`=8, `baseline`=96, `focus`=400
  matches/scenario), `--workers N` parallelism with a determinism contract:
  single-worker and multi-worker runs produce byte-identical `matches.json`.
- Seeds: `blake2b("fcsim-v0.7-validation-1|<scenario_id>|<index>")` — every
  experiment is reproducible from its name. Coach AI is frozen so measured
  tactics stay fixed for the whole match.
- Outputs: `matches.json` (match-level rows incl. full setup provenance),
  `aggregates.json` (distributions: mean/median/sd/CI95/P10..P90, goal buckets,
  0-0/draw/BTTS/margin rates).

Counterfactual scenarios come in `_control`/`_treated` pairs sharing the same
seed list, so per-seed deltas are matched-seed comparisons.
