#!/bin/zsh
# Full regression of the physical character (portable copy of the overnight runner, 2026-09-30):
#   V1 (approved) and V1.1 (promoted) Gates A / B / C1 / C2, then C3 (29) and Gate D (7) — each compared with the committed evidence hashes.
# usage: tools/review/regress.sh [outdir]      (run from anywhere; ~2–3 min, sequential, one Node process at a time)
HERE="${0:A:h}"; PC="${HERE:h:h}"; OUT="${1:-$(mktemp -d -t physchar_regress)}"; mkdir -p "$OUT"; cd "$PC" || exit 1
W='{"hingeSoftHz":20,"velSteps":30,"posSteps":4}'
nice -n 10 node tools/gatea_run.js --calib V1 --drops A,B,C,D,E --tsc 240x1 --seconds 6 --world "$W" --out $OUT/rg_a_v1.json >/dev/null 2>&1
nice -n 10 node tools/gateb_run.js --calib V1 --tests all --tsc 240x1 --out $OUT/rg_b_v1.json >/dev/null 2>&1
nice -n 10 node tools/gatec1_run.js --calib V1 --tests all --out $OUT/rg_c1_v1.json >/dev/null 2>&1
nice -n 10 node tools/gatec2_run.js --calib V1 --tests all --out $OUT/rg_c2_v1.json >/dev/null 2>&1
nice -n 10 node tools/gatea_run.js --calib V1.1 --drops A,B,C,D,E --tsc 240x1 --seconds 6 --world "$W" --out $OUT/rg_a_v11.json >/dev/null 2>&1
nice -n 10 node tools/gateb_run.js --calib V1.1 --tests all --tsc 240x1 --out $OUT/rg_b_v11.json >/dev/null 2>&1
nice -n 10 node tools/gatec1_run.js --calib V1.1 --tests all --out $OUT/rg_c1_v11.json >/dev/null 2>&1
nice -n 10 node tools/gatec2_run.js --calib V1.1 --tests all --out $OUT/rg_c2_v11.json >/dev/null 2>&1
nice -n 10 node tools/gatec3_run.js --tests all --out $OUT/rg_c3_v11.json >/dev/null 2>&1
nice -n 10 node tools/gated_run.js --tests all --out $OUT/rg_d_v11.json >/dev/null 2>&1
OUT="$OUT" python3 - <<'EOF'
import json, os
R='results/'; P='../../../review_artifacts/physical_character_v1/v1_1/json/promotion/'; S=os.environ['OUT']+'/'; C3='../../../review_artifacts/physical_character_v1/gate_c3/json/gatec3_V1.1_x3.json'; D='results/v1_1/gated_V1.1.json'
key={'a':'drop','b':'test','c1':'test','c2':'test','c3':'test','d':'test'}
def H(f,g): return {r[key[g]]:r['hash'] for r in json.load(open(f))['results']}
for g,ref,new in [('a',R+'gatea_final_240x1.json',S+'rg_a_v1.json'),('b',R+'gateb_final_240x1.json',S+'rg_b_v1.json'),('c1',R+'gatec1_final_240x1.json',S+'rg_c1_v1.json'),('c2',R+'gatec2_final_240x1.json',S+'rg_c2_v1.json'),
                  ('a',P+'gatea_V1.1.json',S+'rg_a_v11.json'),('b',P+'gateb_V1.1_all.json',S+'rg_b_v11.json'),('c1',P+'gatec1_V1.1_all.json',S+'rg_c1_v11.json'),('c2',P+'gatec2_V1.1_working.json',S+'rg_c2_v11.json'),('c3',C3,S+'rg_c3_v11.json'),('d',D,S+'rg_d_v11.json')]:
  try:
    a=H(ref,g); b=H(new,g); com=[k for k in b if k in a]; diff=[k for k in com if a[k]!=b[k]]
    print(f"{new.split('/')[-1]:16s} vs {ref.split('/')[-1]:28s}: {len(com)-len(diff)}/{len(com)} identical {diff[:6]}")
  except Exception as e: print(new, 'ERR', e)
EOF
