#!/bin/zsh
# regression after the Physical Stepper phase edits (all opt-in): regress.sh 12/12, G2W_A8 six hashes, foot gate F0 / F2h slow 42/42
cd "/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v1/sandbox/visual/physchar"
O=/private/tmp/claude-501/-Users-zainrahman-Downloads-FC-Simulator-worktrees-physical-character-v1/d4761610-c35f-4019-9308-cb83973e7b76/scratchpad/x/regress
tools/review/regress.sh $O/rg > $O/regress.txt 2>&1
nice -n 10 node tools/g2walk_eval.js --test G2W_A8 --n 30 --out $O/g2w_a8.json > $O/g2w_a8.log 2>&1
for f in F0 F2h; do nice -n 10 node tools/footgate_steps.js --foot $f --protocol slow --out $O/steps_${f}_slow.json > $O/fg_$f.log 2>&1; done
python3 - <<'PY' > $O/summary.txt
import json
O='/private/tmp/claude-501/-Users-zainrahman-Downloads-FC-Simulator-worktrees-physical-character-v1/d4761610-c35f-4019-9308-cb83973e7b76/scratchpad/x/regress/'
R='/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v1/review_artifacts/physical_character_v1/foot_gate/json/'
g=json.load(open(O+'g2w_a8.json')); hs=[r['hash'] for r in (g['results'] if isinstance(g,dict) and 'results' in g else g)]
ref=['5780483c','17d27b5d','5082d76a','47427dbb','1f5445fd','b373d22e']; print('G2W_A8', hs, 'identical' if sorted(hs)==sorted(ref) else 'DIFF vs '+str(ref))
def H(d):
  out=[]
  def walk(x):
    if isinstance(x,dict):
      if 'hash' in x: out.append(str(x.get('hash')))
      for v in x.values(): walk(v)
    elif isinstance(x,list):
      for v in x: walk(v)
  walk(d); return out
for f in ['F0','F2h']:
  a=H(json.load(open(R+f'steps_{f}_slow.json'))); b=H(json.load(open(O+f'steps_{f}_slow.json'))); same=sum(1 for x,y in zip(a,b) if x==y); print(f'foot gate {f} slow: {same}/{len(a)} identical (new {len(b)})')
PY
cat $O/summary.txt; tail -14 $O/regress.txt
