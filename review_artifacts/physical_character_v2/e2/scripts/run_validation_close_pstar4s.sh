#!/bin/zsh
# PRIOR-REGRESSION of the velocity-feed-forward rate correction (e2/VFF_RATE_CORRECTION.md §8): the E1b CLOSING VALIDATION battery (e1b_close/E1B_CLOSE_PREREG.md, frozen run lists,
# frozen evaluators and criteria) re-run unchanged under configuration PSTAR4S = PSTAR4 + vffRate "sr" — the official E1b set (E, 28 runs), the E1a set (A, 10 runs),
# the extended battery (set X, 133 runs), the browser = Node set (W, 3 runs). The G0–G3 regression is scripts/regress_battery_pstar2.sh.
# Erratum E1bF-e2 (fixed after the validation): the W viewer-relative paths need four ../ (the 8172 server root is the worktree).
# Runs from a clean copy of the COMMITTED tree (git archive HEAD); refuses to start if the worktree has uncommitted changes under sandbox/visual/physchar2.
W="/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v2"; S=/private/tmp/claude-501/-Users-zainrahman/8af3fa3f-f134-4178-b7ae-7855027dda6e/scratchpad
C=$S/e2vffr/val; T=$C/tree; P=$T/sandbox/visual/physchar2; EV="$W/review_artifacts/physical_character_v2/e2/evidence_regression_pstar4s/e1close"; log() { echo "$(date +%H:%M:%S) $*" | tee -a $C/queue.log; }
mkdir -p $C/{E,A,X,Wn,jobs} $T "$EV"
[ -z "$(cd "$W" && git status --porcelain sandbox/visual/physchar2)" ] || { echo "uncommitted changes under sandbox/visual/physchar2 — refusing"; exit 1; }
(cd "$W" && git rev-parse HEAD > $C/commit.txt && git status --short > $C/tree_status.txt); (cd "$W" && git archive HEAD sandbox/visual/physchar2) | tar -x -C $T
unset V2_KNEE_MODEL V2_KNEE_V2K V2_ANKLE_NEUTRAL_K V2_KNEE_ENVELOPE V2_XSTAND V2_KNEE_CRIT B_TURF
log "start (commit $(cat $C/commit.txt))"
rm -f $C/jobs/*.sh; n=0; job() { n=$((n+1)); printf '#!/bin/zsh\ncd %s\nV2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 %s\n' "$P" "$1" > $C/jobs/$(printf 'j%03d' $n).sh; }
B8=(V2-REF V2-165-62 V2-198-92 V2-175-70 V2-190-85 V2-short-legs V2-long-legs V1-matched); B3=(V2-REF V2-165-62 V2-198-92)
E1B="node tools/e1b_run.mjs --config=PSTAR4S"
# set E: the official E1b protocol (frozen run list)
for b in $B8; do job "$E1B --human=$b --side=L --pert=none --out=$C/E/e1b_${b}_L_none.json.gz > $C/E/e1b_${b}_L_none.log 2>&1"; done
job "$E1B --human=V2-REF --side=R --pert=none --out=$C/E/e1b_V2-REF_R_none.json.gz > $C/E/e1b_V2-REF_R_none.log 2>&1"
job "$E1B --human=V2-REF --side=L --pert=none --out=$C/E/e1b_V2-REF_L_none_rep.json.gz > $C/E/e1b_V2-REF_L_none_rep.log 2>&1"
for b in $B3; do for p in PF PB PL PR YAW P15; do job "$E1B --human=$b --side=L --pert=$p --out=$C/E/e1b_${b}_L_$p.json.gz > $C/E/e1b_${b}_L_$p.log 2>&1"; done; done
# set A: the E1a protocol (frozen run list)
for b in $B8; do job "node tools/e1a_run.mjs --config=PSTAR4S --human=$b --side=L --out=$C/A/e1a_${b}_L.json.gz > $C/A/e1a_${b}_L.log 2>&1"; done
job "node tools/e1a_run.mjs --config=PSTAR4S --human=V2-REF --side=R --out=$C/A/e1a_V2-REF_R.json.gz > $C/A/e1a_V2-REF_R.log 2>&1"
job "node tools/e1a_run.mjs --config=PSTAR4S --human=V2-REF --side=L --out=$C/A/e1a_V2-REF_L_rep.json.gz > $C/A/e1a_V2-REF_L_rep.log 2>&1"
# set X: the extended battery (tools/e1bfix_eval.mjs lists the expected runs)
xr() { job "$E1B --human=$1 --side=$2 --pert=$3 $4 --out=$C/X/e1b_$1_$2_$3$5.json.gz > $C/X/e1b_$1_$2_$3$5.log 2>&1"; }
isoff() { [[ $2 == L && ( $3 == none || ( " $B3 " == *" $1 "* && $3 != YAWN ) ) ]] || [[ $1 == V2-REF && $2 == R && $3 == none ]]; }
for b in $B8; do for sd in L R; do for p in none PF PB PL PR YAW YAWN P15; do [[ $p == none && $sd == L ]] && continue; isoff $b $sd $p && continue; xr $b $sd $p "" ""; done; done; done
for b in $B3; do for hz in 180 480; do for p in YAW YAWN P15; do xr $b L $p "--hz=$hz" "_hz$hz"; done; done; done
for b in $B3; do for k in 0.38 0.9; do for p in YAW YAWN; do xr $b L $p "--yawk=$k" "_k$k"; done; done; done
xr V2-REF L YAW "" "_rep"; xr V2-REF L P15 "" "_rep"
log "jobs: $n"; ls $C/jobs/*.sh | xargs -P 8 -n 1 zsh; log "runs done"
# set W: browser = Node (Node side here; browser side against the review server on 8172, which serves the worktree = the committed tree)
(cd $P && node tools/preswing_char.mjs --manifest="$W/review_artifacts/physical_character_v2/e2/scripts/manifest_w_pstar4s.json" --outdir=$C/Wn > $C/Wn/char.log 2>&1); log "W Node done"
mkdir -p "$EV/w_node"; cp $C/Wn/*.json "$EV/w_node/"
(cd "$W/sandbox/visual/physchar2" && node tools/unload_browser.mjs --ids=W_P15_V2-REF_L,W_PT5_V2-REF_R,W_TUn15_V2-REF_L --results=../../../../review_artifacts/physical_character_v2/e2/evidence_regression_pstar4s/e1close/w_node --manifest=../../../../review_artifacts/physical_character_v2/e2/scripts/manifest_w_pstar4s.json --out=$C/Wn/browser.json > $C/Wn/browser.log 2>&1); log "W browser: $(tail -1 $C/Wn/browser.log)"
# evaluation (frozen tools in the clean copy)
(cd $P && node tools/e1b_eval.mjs --dir=$C/E --config=PSTAR4S --out=$C/e1b_eval.json > $C/e1b_eval.log 2>&1); log "E: $(tail -1 $C/e1b_eval.log)"
(cd $P && node tools/e1a_eval.mjs --dir=$C/A --config=PSTAR4S --out=$C/e1a_eval.json > $C/e1a_eval.log 2>&1); log "A: $(tail -1 $C/e1a_eval.log)"
(cd $P && node tools/e1bfix_eval.mjs --ext=$C/X --official=$C/E --config=PSTAR4S --rateRule=maxJumpSmooth --out=$C/ext_eval.json > $C/ext_eval.log 2>&1); log "X: $(tail -1 $C/ext_eval.log)"
(cd $P && node tools/e1bclose_eval.mjs --official=$C/E --ext=$C/X --e1beval=$C/e1b_eval.json --exteval=$C/ext_eval.json --config=PSTAR4S --out=$C/close_eval.json > $C/close_eval.log 2>&1); log "CLOSE: $(tail -1 $C/close_eval.log)"
(cd $P && node tools/e1bta_checks.mjs --dirs=$C/E,$C/X --out=$C/ta_checks.json > $C/ta_checks.log 2>&1); log "TA: $(tail -1 $C/ta_checks.log)"
# W_P15 must exercise the T-A put-down (prereg §3 W): the Node record has an abort, a put-down log with a T-A record and a contact time
node -e 'const r=JSON.parse(require("fs").readFileSync(process.argv[1])); const ok=r.abortT!=null && r.putDown && r.putDown[0] && r.putDown[0].cap && r.putDown[0].contactT!=null; console.log(ok?"W_P15 EXERCISES T-A":"W_P15 INCOMPLETE (no T-A put-down)", JSON.stringify(r.putDown&&r.putDown[0]&&r.putDown[0].cap?{verdict:r.putDown[0].cap.verdict,Tput:r.putDown[0].cap.Tput,Tr:r.putDown[0].cap.TrFinal}:null));' $C/Wn/W_P15_V2-REF_L.json > $C/Wn/w_p15_check.log 2>&1; log "W_P15: $(cat $C/Wn/w_p15_check.log)"
for f in commit.txt tree_status.txt queue.log e1b_eval.json e1b_eval.log e1a_eval.json e1a_eval.log ext_eval.json ext_eval.log ta_checks.json ta_checks.log close_eval.json close_eval.log; do cp $C/$f "$EV/" 2>/dev/null; done; cp $C/Wn/w_p15_check.log "$EV/w_node/" 2>/dev/null; cp $C/Wn/browser.json $C/Wn/browser.log $C/Wn/char.log "$EV/w_node/" 2>/dev/null
log "ALL DONE"; touch $C/all.done
