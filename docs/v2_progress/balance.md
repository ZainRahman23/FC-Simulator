# Balance progress — Core Loop v2 §9/§14

Owner: balance. Files: `tools/balance/**`, `tools/season_sim.py`, `data/card_effects.json`.

2026-09-30 resumed and completed CLI/cache plumbing from the interrupted Claude work:

- `python -m tools.balance.run STEP --scale smoke|medium|full --workers N` handles baseline, states, effects, curves, matchup, economy, feel, career, report, all. All scale knobs are wired. macOS caps workers at two; Linux Slurm accepts requested CPUs.
- Cache keys conservatively include source versions. Two reference match hashes cannot establish engine equivalence; source hashing now invalidates engine caches. Build/card/system changes invalidate counterfactual arms too. Individual completed futures/matches are persisted while the pool runs, allowing interrupt/resume.
- Result JSON lives in `/tmp/v2_balance_cache/results/<scale>/`; provenance includes engine/build/web/harness sources and scale parameters. Stale or wrong-scale results are excluded from generated reports. Historical unversioned baseline numbers are not current evidence.
- CPU-card seasons persist `new_build`/`new_season`, camp/weekly TP, `train` squad deltas, first-XI attribute development, CB partnerships, familiarity and `week_tick` progression. This is an explicit scripted manager policy; persistent transfers/injuries are not simulated.
- Card regressions include minute, score diff, strength gap and observed system-pair indicators. JSON marks smoke tables uncalibrated. Agency additionally records the paired changed-result fraction at the best sampled moment; in-sample card selection remains a bias, so agency is screening only.
- Controlled familiarity/partnership experiments use canonical build requests (including runtime dependency expiry), rather than permanently baking all bonuses into raw attributes.
- Exported seasons include actual CB.ECON constants and evaluated prize amounts; economy uses these authoritative constants. Economy is still a Liverpool surrogate, not the required all-club-size certification.
- Report never certifies incomplete seasons, smoke card balance, dominance or agency. Required unmeasured areas are explicit.

Validation so far: compileall passed. Nine harness regression tests passed (`python -m unittest tools.balance.test_harness -v`): partial-season gates, version invalidation, per-future resume, result provenance, common-random no-change equality. Separate 30-match smoke baselines completed; CPU progression produced 6.3 card plays/match. Initial local integrated smoke was stopped while core/UI sources changed. Frozen remote integrated smoke1801 is now running with two CPUs; completed evidence is pending. Log `/tmp/touchline-balance-smoke.log`; results only count as current if matching source provenance.

Remote guidance read: `/Users/dani/CLAUDE.md` and `ssh danilogin 'cat ~/CLAUDE.md'`. Login node prohibits heavy compute; run via Slurm `cpu`, logs under `/mnt/nfs/shared`, code under `/mnt/nfs/projects`. Read-only connection succeeded. Desktop has 16 CPUs. Snapshot frozen, exported and submitted through Slurm; see remote-balance.md for actual jobs1801/1797/1802/1803, dependencies and hashes.

## Commands

```sh
/tmp/tlvenv/bin/python -m tools.balance.run all --scale smoke --workers 2
/tmp/tlvenv/bin/python -m tools.balance.run baseline --scale smoke --workers 2 --cards
/tmp/tlvenv/bin/python -m tools.balance.run report --scale smoke
```

For full methodology, freeze the source snapshot, export three seasons locally from that snapshot using `league.export_seasons([20260801, 20260802, 20260803])`, copy its `export/` cache to the remote snapshot's `balance-cache/export/`, then submit `tools/balance/slurm.sh` from the snapshot with `sbatch --nodelist=desktop tools/balance/slurm.sh`. That script runs full baseline, persistent CPU cards, states, effects n16/all cards, build curves, nine-system matchup cards, five-season economy and report on nine Slurm CPUs (2-day limit). The engine-only worker path needs no Python third-party packages once export cache is staged.

## Remaining definition-of-done gaps

Full season statistical evidence and tuning are pending. Fixture-level heldout prediction calibration is implemented and controls calibrated:true; full heldout evidence is pending; system-pair coverage must be audited. Training now includes paired persistent youth-vs-XI season plans (not yet measured). Economy needs representative club-size objectives and full production transfer rules. No full balance gate pass is claimed.

Calendar correction: exports actual CB.weeks(); CPU progression spends TP in four camp weeks and once per double week, advances familiarity/partnerships with both XIs after the second leg. Concentrated training economy uses the same authoritative wallets/calendar. Fixture-heldout prediction test controls per-card calibrated flags; reveal-only READ THE GAME utility is unmeasured.

Sampler correction: state library now replays immutable prepared kickoff requests from the actual progressed CPU-card season, retaining canonical system IDs and frozen runtime policy. Nine regression tests include exact checkpoint score, canonical context and repeated full-time equality. Prior sampler pipeline1796/1798/1799 canceled; restarted1801→1802→1803, E31797 retained. See remote-balance.md.
