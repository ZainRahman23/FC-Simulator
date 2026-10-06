#!/bin/zsh
# PRIOR-REGRESSION of the velocity-feed-forward rate correction (e2/VFF_RATE_CORRECTION.md §8): the PRE-SWING / contact-boundary VALIDATION (preswing/PRESWING_VALIDATION_PREREG.md,
# the frozen 924-run manifest + the 32-run external-lift matrix, frozen evaluator tools/preswing_eval.mjs, criteria V1–V15) — the validation of lcVff "lin" itself — re-run with
# vffRate "sr" added to every run that carries lcVff "lin" (the P* runs); the C-arm and REPRO entries keep their own flags (they must reproduce). V15 reads the PSTAR4S G0–G3
# regression (scripts/regress_battery_pstar4s.sh) — run that first. Runs from a clean copy of the COMMITTED tree; refuses with uncommitted changes under physchar2.
W="/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v2"; S=/private/tmp/claude-501/-Users-zainrahman/8af3fa3f-f134-4178-b7ae-7855027dda6e/scratchpad
C=$S/e2vffr/pvS; T=$C/tree; P=$T/sandbox/visual/physchar2; RA="$W/review_artifacts/physical_character_v2"; EV="$RA/e2/evidence_regression_pstar4s/preswing"; log() { echo "$(date +%H:%M:%S) $*" | tee -a $C/queue.log; }
mkdir -p $C/{res,bnd,j,trd} $T "$EV"
[ -z "$(cd "$W" && git status --porcelain sandbox/visual/physchar2)" ] || { echo "uncommitted changes under sandbox/visual/physchar2 — refusing"; exit 1; }
(cd "$W" && git rev-parse HEAD > $C/commit.txt && git status --short > $C/tree_status.txt); (cd "$W" && git archive HEAD sandbox/visual/physchar2) | tar -x -C $T
unset V2_KNEE_MODEL V2_KNEE_V2K V2_ANKLE_NEUTRAL_K V2_KNEE_ENVELOPE V2_XSTAND V2_KNEE_CRIT B_TURF
log "start (commit $(cat $C/commit.txt))"
# the frozen manifest with vffRate "sr" on the lcVff "lin" runs (P* arm); everything else verbatim
node -e 'const fs=require("fs"),[src,dst]=process.argv.slice(1),M=JSON.parse(fs.readFileSync(src));let n=0;for(const r of M.runs) if(r.flags&&r.flags.lcVff==="lin"){r.flags={...r.flags,vffRate:"sr"};n++;} M.generated+=" + vffRate sr on the lcVff lin runs (e2/scripts/run_preswing_pstars.sh)"; fs.writeFileSync(dst,JSON.stringify(M,null,1)); console.log("sr runs",n,"of",M.runs.length);' "$RA/preswing/manifest.json" $C/manifest_pstars.json | tee -a $C/queue.log
cp $C/manifest_pstars.json "$EV/"
N=$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1])).runs.length)' $C/manifest_pstars.json); K=8; per=$(( (N + K - 1) / K ))
for i in $(seq 0 $((K - 1))); do printf '#!/bin/zsh\ncd %s && node tools/preswing_char.mjs --manifest=%s --outdir=%s --from=%d --to=%d > %s 2>&1\n' "$P" $C/manifest_pstars.json $C/res $((i * per)) $(((i + 1) * per)) $C/j/log$i.txt > $C/j/j$i.sh; done
# the external-lift matrix (8 bodies × 30 / 60 N × drop 0 / 2.5 cm) with the P* + sr flags
nb=0; for h in V2-REF V2-165-62 V2-198-92 V2-175-70 V2-190-85 V2-short-legs V2-long-legs V1-matched; do for F in 30 60; do for dz in 0 0.025; do nb=$((nb+1))
  D=""; [ $dz = 0.025 ] && D='"pelvisDrop":{"t0":1.5,"dur":2,"dz":0.025},'
  printf '#!/bin/zsh\ncd %s\nV2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 node tools/boundary_probe.mjs --human=%s --F=%s --stand='"'"'{"lifecycle":true,"ikRefTwist":true,%s"ffLockedAxis":true,"touchRest":true,"lcVff":"lin","lcTouch":{"reseed":true},"vffRate":"sr"}'"'"' %s/bnd/b_%s_F%s_dz%s.json > %s/bnd/b_%s_F%s_dz%s.log 2>&1\n' "$P" $h $F "$D" $C $h $F $dz $C $h $F $dz > $C/j/b$(printf '%02d' $nb).sh; done; done; done
log "jobs: $K run slices ($N runs) + $nb boundary"
ls $C/j/j*.sh | xargs -P 8 -n 1 zsh; log "runs done $(ls $C/res/*.json | wc -l)"
ls $C/j/b*.sh | xargs -P 8 -n 1 zsh; log "boundary done $(ls $C/bnd/*.json | wc -l)"
# official touch-rest results for V14 (the three REPRO ids)
tar -xzf "$RA/touch_semantics/evidence/results_all_2146.tgz" -C $C/trd; TRD=$(dirname $(find $C/trd -name "L_V2-REF_L_d0.025_r0_R4_B1TR_L0.005.json" | head -1)); log "touch-rest dir $TRD"
# browser = Node (W set) against the review server on 8172 (serves the worktree = the committed tree)
mkdir -p "$EV/results_W"; for id in W_E5_V2-REF_L W_PT4_V2-REF_L W_TUn15_V2-REF_R; do cp $C/res/$id.json "$EV/results_W/"; done
(cd "$W/sandbox/visual/physchar2" && node tools/unload_browser.mjs --ids=W_E5_V2-REF_L,W_PT4_V2-REF_L,W_TUn15_V2-REF_R --results=../../../../review_artifacts/physical_character_v2/e2/evidence_regression_pstar4s/preswing/results_W --manifest=../../../../review_artifacts/physical_character_v2/e2/evidence_regression_pstar4s/preswing/manifest_pstars.json --out=$C/browser_W.json > $C/browser_W.log 2>&1); log "W browser: $(tail -1 $C/browser_W.log)"
RG=$S/vP4S/regress_eval.json; [ -f $RG ] || log "WARNING: PSTAR4S regression eval missing ($RG) — V15 will fail"
(cd $P && node tools/preswing_eval.mjs --manifest=$C/manifest_pstars.json --results=$C/res --touchrest=$TRD --boundary=$C/bnd --browser=$C/browser_W.json --regress=$RG --out=$C/eval.json > $C/eval.log 2>&1); log "EVAL: $(tail -1 $C/eval.log)"
# identity of the runs the correction cannot touch (no commanded swing target): every non-lift P* result vs the official 924 (hash series)
mkdir -p $C/off; tar -xzf "$RA/preswing/evidence/validation/results_924.tgz" -C $C/off
node -e 'const fs=require("fs"),path=require("path"),[res,off,man]=process.argv.slice(1),M=JSON.parse(fs.readFileSync(man));const find=(d,f)=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory()){const r=find(p,f);if(r)return r;}else if(e.name===f)return p;}return null;};let same=0,diff=[],lifts=0,liftDiff=0;for(const r of M.runs){const a=path.join(res,r.id+".json"),b=find(off,r.id+".json");if(!fs.existsSync(a)||!b)continue;const x=JSON.parse(fs.readFileSync(a)).hashes,y=JSON.parse(fs.readFileSync(b)).hashes,eq=JSON.stringify(x)===JSON.stringify(y);if(r.lift){lifts++;if(!eq)liftDiff++;continue;}if(eq)same++;else diff.push(r.id);}console.log(`non-lift runs hash-identical to the official P* validation: ${same}/${same+diff.length}${diff.length?" DIFFER: "+diff.slice(0,10).join(", "):""}; lift runs (commanded target: expected to change) ${liftDiff}/${lifts} changed`);' $C/res $C/off $C/manifest_pstars.json > $C/identity_nonlift.log 2>&1; log "IDENTITY: $(cat $C/identity_nonlift.log)"
for f in commit.txt tree_status.txt queue.log eval.json eval.log browser_W.json browser_W.log identity_nonlift.log; do cp $C/$f "$EV/" 2>/dev/null; done
(cd $C && tar -czf "$EV/results_pstars.tgz" res bnd); log "ALL DONE"; touch $C/all.done
