#!/bin/zsh
# SV-2R (e2/SV2R_PREREG.md): the frozen SV-2 criteria and §6 allowance rule on the TD2C battery's nominal-terrain records of the final configuration PSTAR5CHABTDV
# (tools/sv2r_eval.mjs, a versioned copy of swing_servo_eval2). Run after scripts/run_td2c_val.sh; evaluation only (no runs). Evidence to e2/evidence_sv2r/.
W="/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v2"; S=/private/tmp/claude-501/-Users-zainrahman/8af3fa3f-f134-4178-b7ae-7855027dda6e/scratchpad
C=$S/td2cval/run; RA="$W/review_artifacts/physical_character_v2"; EV="$RA/e2/evidence_sv2r"; mkdir -p "$EV"
(cd "$W" && git rev-parse HEAD > "$EV/commit_eval.txt"); cp $C/commit.txt "$EV/commit_td2c_battery.txt"
(cd "$W/sandbox/visual/physchar2" && node tools/sv2r_eval.mjs --dir=$C/runs --list=$C/list.json --json=$C/sv2r_eval.json > $C/sv2r_eval_summary.txt 2>&1)
cp $C/sv2r_eval_summary.txt "$EV/"; gzip -c $C/sv2r_eval.json > "$EV/sv2r_eval.json.gz"; tail -2 "$EV/sv2r_eval_summary.txt"
