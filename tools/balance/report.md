# Touchline v2 balance report

Run scale: **smoke**. Source versions: `{"build": "6d2fb4c483b4ae9b", "engine": "aace2947eae5173e", "harness": "215075ebcf18d445", "policy": "heuristic", "scale": {"curve_clubs": 2, "curve_mw_limit": 4, "econ_runs": 20, "fit_lams": [-1.0, 0.0, 1.0], "matchup_pools": 1, "matchup_seeds": 1, "matchup_systems": 4, "max_cards": 6, "mw_limit": 3, "n": 4, "name": "smoke", "per_cell": 1, "seasons": 1, "state_matches": 6}, "web": "ed115443923b5f29"}`.

Release balance is **not certified**. Extreme match outcomes and historical scorer concentration require completed calibration and tuning before release. Only results matching the current engine, build, web, harness and scale are included. Smoke verifies tooling; it cannot certify season totals, card bands, dominance or agency. An in-band point estimate alone is not statistical support for a gate.

## Coverage and rerun commands

Current matching results: none. All missing areas are **UNVERIFIED**.

```sh
/tmp/tlvenv/bin/python -m tools.balance.run all --scale smoke --workers 2
# Full run on a Slurm CPU allocation, using a frozen source snapshot:
python -m tools.balance.run baseline --scale full --workers 8
python -m tools.balance.run baseline --scale full --workers 8 --cards
python -m tools.balance.run states --scale full --workers 8
python -m tools.balance.run effects --scale full --workers 8
python -m tools.balance.run curves --scale full --workers 8
python -m tools.balance.run matchup --scale full --workers 8 --cards
python -m tools.balance.run economy --scale full --workers 8
python -m tools.balance.run report --scale full
```

## Method limits

The season exporter samples CPU squads at each matchweek from a fixed browser save. CPU-card baselines then persist authoritative TP training, partnerships and familiarity; It does not advance persistent injuries or transfers. Build curves control kickoff inputs rather than simulate manager choices. Economy is a scripted Liverpool surrogate fitted to league output, not all club sizes or the full production economy. Training includes paired persistent youth versus first-XI plans. Consequently §9/§14 definition of done remains open even after a full screening run.
