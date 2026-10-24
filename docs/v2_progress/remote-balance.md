# Remote balance run receipts

Frozen snapshot: `/mnt/nfs/projects/touchline-v2-20260930T222510Z` (local copy `/tmp/touchline-v2-20260930T222510Z`). Actual browser exports: seed 20260801 (380 fixtures) and seeds 20260801–20260803 (1140 fixtures), 34-week authoritative calendar, actual `CC.cpuBuilds` system/deck per club. Snapshot export cache: `balance-cache/export/`.

Verified source versions on both hosts: engine `aace2947eae5173e`, build `6d2fb4c483b4ae9b`, web `ed115443923b5f29`, harness `32acbe2d443d0846`, policy `heuristic`. Exporter now waits for `CB.catalog`, preventing the startup race between app boot and build catalog fetch.

Submitted 2026-09-30 UTC. Actual startup checked through `squeue`, `scontrol` and the smoke log:

| Job | Work | Allocation / limit | Dependency | Verified state |
|---|---|---|---|---|
| 1801 | integrated smoke: baselines, states, card effects, curves, matchup, economy, report | desktop, 2 CPUs, 2 GB, 1h | none | RUNNING; baselines completed, 15 CPU states sampled, effects started |
| 1797 | standalone E3 shape drift, 200 paired seeds × 12 setups/shapes | desktop, 8 CPUs, 4 GB, 2h | none | RUNNING |
| 1802 | medium all-card n8 sweep, full 380-fixture baseline/card season | desktop, 12 CPUs, 8 GB, 12h | afterok:1801 | PENDING (Dependency) |
| 1803 | full n16 sweep, three league seasons, full build/matchup/economy experiments | desktop, 12 CPUs, 8 GB, 2 days | afterok:1802 | PENDING (Dependency) |

**Calibration is pending.** The prior sampler pipeline1796/1798/1799 was canceled after detecting plan-label metadata and engine-only replay. The corrected sampler replays the immutable prepared kickoff request of each progressed CPU-card match, including applied system, training, partnership/familiarity modifiers and frozen CPU policy. Nine regression tests passed, including exact checkpoint/full-time scores and canonical system IDs. Historical state/arm caches are invalidated. A narrowly source-verified match-cache compatibility record preserves prior identical football outcomes; exported browser data was unchanged and migrated to the new harness cache key. Running jobs do not establish that integration succeeds or any balance gate passes. Smoke must finish successfully before the expensive sweep can start. Individual completed matches/futures are cached; full n16 can reuse medium n8 futures. The scripts re-measure baselines after effects if newly calibrated policy models change CPU decisions.

Initial attempts are retained for audit: 1792 (smoke) and 1793 (E3) failed before Python could run because Slurm canonicalized login-node `/mnt/nfs` to `/srv/nfs`, which does not exist on desktop. Dependents 1794/1795 were canceled by this task. Corrected scripts pass explicit `--chdir=/mnt/nfs/...` and `BALANCE_SNAPSHOT_DIR`; E3 wraps its own explicit directory change. No direct heavy login-node compute was performed.

Remote guidance read: `/Users/dani/CLAUDE.md` and remote `~/CLAUDE.md`. Heavy work uses Slurm `cpu`; code under `/mnt/nfs/projects`, logs under `/mnt/nfs/shared`. No persistent service or paid service was created.

```sh
ssh danilogin 'squeue -j 1801,1797,1802,1803 -o "%.18i %.32j %.8T %.10M %R"'
ssh danilogin 'sacct -j 1792,1793,1794,1795,1796,1797,1798,1799,1801,1802,1803 --format=JobID,JobName,State,ExitCode,Elapsed,AllocCPUS'
ssh danilogin 'tail -40 /mnt/nfs/shared/touchline-v2-balance-1801.out'
ssh danilogin 'tail -40 /mnt/nfs/shared/touchline-e3-1797.out'
```

Retrieve the snapshot's `tools/balance/report.md`, `data/card_effects.json`, `balance-cache/results/`, and `simulator/validation/e3_formation_drift.{json,txt}` after completion. Validate matching source versions before replacing current working-tree artifacts. To stop this task's active/pending jobs only: `ssh danilogin 'scancel 1801 1797 1802 1803'`.
