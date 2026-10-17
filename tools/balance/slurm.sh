#!/usr/bin/env bash
#SBATCH --job-name=touchline-v2-balance
#SBATCH --partition=cpu
#SBATCH --cpus-per-task=8
#SBATCH --time=2-00:00:00
#SBATCH --output=/mnt/nfs/shared/touchline-v2-balance-%j.out
set -euo pipefail
# Submit from a frozen snapshot directory under /mnt/nfs/projects.
# Export cache must have been copied from the same snapshot's local browser export.
cd "${BALANCE_SNAPSHOT_DIR:-${SLURM_SUBMIT_DIR:?}}"
export V2_BALANCE_CACHE="${V2_BALANCE_CACHE:-$PWD/balance-cache}"
export TOUCHLINE_WORKERS=0
PYTHON="${BALANCE_PYTHON:-python3}"
WORKERS="${SLURM_CPUS_PER_TASK:-2}"
SCALE="${BALANCE_SCALE:-full}"
"$PYTHON" -m tools.balance.run baseline --scale "$SCALE" --workers "$WORKERS"
"$PYTHON" -m tools.balance.run baseline --scale "$SCALE" --workers "$WORKERS" --cards
"$PYTHON" -m tools.balance.run states --scale "$SCALE" --workers "$WORKERS"
"$PYTHON" -m tools.balance.run effects --scale "$SCALE" --workers "$WORKERS"
"$PYTHON" -m tools.balance.run baseline --scale "$SCALE" --workers "$WORKERS"
"$PYTHON" -m tools.balance.run baseline --scale "$SCALE" --workers "$WORKERS" --cards
"$PYTHON" -m tools.balance.run curves --scale "$SCALE" --workers "$WORKERS"
"$PYTHON" -m tools.balance.run matchup --scale "$SCALE" --workers "$WORKERS" --cards
"$PYTHON" -m tools.balance.run economy --scale "$SCALE" --workers "$WORKERS"
"$PYTHON" -m tools.balance.run report --scale "$SCALE" --workers "$WORKERS"
