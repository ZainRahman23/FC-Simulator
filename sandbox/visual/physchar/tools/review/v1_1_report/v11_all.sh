#!/bin/zsh
SP=/private/tmp/claude-501/-Users-zainrahman-Downloads-FC-Simulator/6a70b682-ea7e-4ecb-991b-1bb65e5cd9c4/scratchpad
WT="/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v1"; PC="$WT/sandbox/visual/physchar"; F="$WT/review_artifacts/physical_character_v1/v1_1/json/final"; OUT="$WT/review_artifacts/physical_character_v1/v1_1"
$SP/v11_batch.sh || exit 1
python3 $SP/v11_tables.py "$F" "$PC/results" > $SP/v11_tables.md 2>&1; cp $SP/v11_tables.md "$OUT/analysis/tables_generated.md"
for f in gatea_V1.1 gateb_V1.1 gatec1_V1.1 gatec2_V1.1_raw gatec2_V1.1_recal gatec2_V1.1_recal_diag; do cp "$F/$f.json" "$PC/results/v1_1/$f.json"; done
cd "$F" && python3 - <<PY
import json
plan=[]
for suite,f,key in [('A','gatea_V1.1.json','drop'),('B','gateb_V1.1.json','test'),('C','gatec1_V1.1.json','test')]:
  for r in json.load(open(f))['results']: plan.append({'calib':'V1.1','suite':suite,'test':r[key],'hash':r['hash']})
for v,f in [('','gatec2_V1.1_raw.json'),('recal','gatec2_V1.1_recal.json'),('diag','gatec2_V1.1_recal_diag.json')]:
  for r in json.load(open(f))['results']: plan.append({'calib':'V1.1','ctrlv':v,'suite':'C2','test':r['test'],'hash':r['hash']})
for r in json.load(open('gatec2_V1.json'))['results']:
  if r['test'] in ('B_hold_R','B_lift_R','J_repeat'): plan.append({'calib':'V1','suite':'C2','test':r['test'],'hash':r['hash']})
json.dump(plan,open('$SP/v11_hashplan.json','w'))
PY
cd $SP && rm -f v11cap/*.png && PUPPETEER_NODE_MODULES=$SP/pptr/node_modules node v11_cap.js --out $SP/v11cap --hash $SP/v11_hashplan.json --shots $SP/v11_shots.json > $SP/v11_capF.log 2>&1
{ echo "V1.1 cross-runtime check — one headless Chrome (harness, same vendored Jolt WASM) vs Node; $(date '+%Y-%m-%d %H:%M')"; grep "IDENTICAL\|DIFFERENT\|cross-runtime" $SP/v11_capF.log; } > "$OUT/crossruntime.txt"
rm -f "$OUT"/stills/*.png; cp $SP/v11cap/*.png "$OUT/stills/"; python3 $SP/v11_sheet.py $SP/v11cap "$OUT" $SP/v11_shots.json
cp $SP/v11_hashplan.json $SP/v11_shots.json "$OUT/analysis/"
echo "PIPELINE DONE $(grep cross-runtime $SP/v11_capF.log) shots $(grep -c '^shot' $SP/v11_capF.log)"
