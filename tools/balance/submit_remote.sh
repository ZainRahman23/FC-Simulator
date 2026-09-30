#!/usr/bin/env bash
set -euo pipefail
snapshot="${1:?usage: submit_remote.sh FROZEN_SNAPSHOT_DIR}"
cd "$snapshot"
smoke=$(sbatch --parsable --chdir="$snapshot" --nodelist=desktop --cpus-per-task=2 --mem=2G --time=01:00:00 --job-name=touchline-balance-smoke --export="ALL,BALANCE_SNAPSHOT_DIR=$snapshot,BALANCE_SCALE=smoke" tools/balance/slurm.sh)
printf -v e3_command 'cd %q && python3 simulator/validation/e3_formation_drift.py 200 8' "$snapshot"
e3=$(sbatch --parsable --partition=cpu --chdir="$snapshot" --nodelist=desktop --cpus-per-task=8 --mem=4G --time=02:00:00 --job-name=touchline-e3-calibration --output=/mnt/nfs/shared/touchline-e3-%j.out --wrap="$e3_command")
medium=$(sbatch --parsable --chdir="$snapshot" --nodelist=desktop --cpus-per-task=12 --mem=8G --time=12:00:00 --job-name=touchline-balance-medium --dependency="afterok:$smoke" --export="ALL,BALANCE_SNAPSHOT_DIR=$snapshot,BALANCE_SCALE=medium" tools/balance/slurm.sh)
full=$(sbatch --parsable --chdir="$snapshot" --nodelist=desktop --cpus-per-task=12 --mem=8G --time=2-00:00:00 --job-name=touchline-balance-full --dependency="afterok:$medium" --export="ALL,BALANCE_SNAPSHOT_DIR=$snapshot,BALANCE_SCALE=full" tools/balance/slurm.sh)
printf 'snapshot=%s\nsmoke_job=%s\ne3_job=%s\nmedium_job=%s\nfull_job=%s\n' "$snapshot" "$smoke" "$e3" "$medium" "$full"
