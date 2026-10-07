#!/bin/bash
# DG-0 identity battery (guard off / default paths), run from physchar2
S=/private/tmp/claude-501/-Users-zainrahman/8af3fa3f-f134-4178-b7ae-7855027dda6e/scratchpad; I=${1:-$S/d1g/id}; mkdir -p $I
(unset V2_KNEE_MODEL V2_ANKLE_NEUTRAL_K; node $S/b/hashcmp.mjs . T5 U:R T7:R:0.25 T8:hold:L:FR:15 > $I/kv0.txt 2>&1; diff -q $I/kv0.txt $S/b/hash_head.txt > /dev/null && echo "KV0 IDENTICAL" > $I/kv0.verdict || echo "KV0 DIFFERS" > $I/kv0.verdict) &
(unset V2_KNEE_MODEL V2_ANKLE_NEUTRAL_K; node tools/v2_component_regressions.mjs > $I/suite.txt 2>&1) &
export V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13
node tools/e2_run.mjs --protocol=step --human=V2-REF --side=L --config=PSTAR5B --nominal=0.07,0 --diag=noclear --out=$I/a.json.gz > $I/a.log 2>&1 &
node tools/e2_run.mjs --protocol=step --human=V2-REF --side=L --config=PSTAR5CH --nominal=0.07,0 --diag=noclear --diagAllow=0,0,0 --out=$I/c.json.gz > $I/c.log 2>&1 &
node tools/swing_servo_val2.mjs --human=V2-REF --side=L --hz=240 --ff=on --traj=R-F --out=$I/sv2.json.gz > $I/sv2.log 2>&1 &
node tools/ab_val.mjs --human=V2-REF --side=L --hz=240 --cfg=PSTAR5CHAB --traj=R-F --out=$I/ab.json.gz > $I/ab.log 2>&1 &
wait
node tools/td2_val.mjs --human=V2-REF --side=L --hz=240 --cfg=PSTAR5CHAB --traj=R-F --out=$I/td2a.json.gz > $I/td2a.log 2>&1 &
node tools/td2b_val.mjs --human=V2-REF --side=L --hz=240 --cfg=PSTAR5CHAB --traj=R-F --out=$I/td2ba.json.gz > $I/td2ba.log 2>&1 &
node tools/td2_val.mjs --human=V2-REF --side=L --hz=240 --cfg=PSTAR5CHABTD --traj=R-F --cond=nominal --out=$I/td2n.json.gz > $I/td2n.log 2>&1 &
node tools/td2_val.mjs --human=V2-198-92 --side=R --hz=480 --cfg=PSTAR5CHABTD --traj=H-D --cond=late --out=$I/td2l.json.gz > $I/td2l.log 2>&1 &
node tools/td2b_val.mjs --human=V2-REF --side=L --hz=240 --cfg=PSTAR5CHABTDB --traj=R-F --cond=nominal --out=$I/td2bn.json.gz > $I/td2bn.log 2>&1 &
node tools/td2b_val.mjs --human=V2-198-92 --side=L --hz=480 --cfg=PSTAR5CHABTDB --traj=H-D --cond=earlyOOE --out=$I/td2bo.json.gz > $I/td2bo.log 2>&1 &
wait
h() { grep -o 'hash [0-9a-f]\{8\}' $1 | tail -1 | cut -d' ' -f2; }
chk() { local got=$(h $I/$1.log); [ "$got" == "$2" ] && echo "PASS $1 $got" || echo "FAIL $1 got=$got want=$2"; }
{ cat $I/kv0.verdict; tail -3 $I/suite.txt; chk a 99c29491; chk c b62309f5; chk sv2 3dd9f13d; chk ab b63184da; chk td2a b63184da; chk td2ba b63184da; chk td2n c76cadc7; chk td2l 56717579; chk td2bn 787cc0c9; chk td2bo 83369114; } > $I/summary.txt
cat $I/summary.txt
