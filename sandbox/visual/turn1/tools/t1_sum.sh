#!/bin/bash
# one line per scenario: slip, reach, speed, joints
node "$(dirname "$0")/t1_metrics.cjs" "$1" 2>&1 | python3 -c "
import sys, json
for line in sys.stdin:
    try: r=json.loads(line)
    except: print(line[:300]); continue
    j=r['joints']; print(f\"{r['id']:<14} slip {r['slipMaxCm']:>6} reach {r['reachMax']:.3f}/{r['reachClampSamples']:<4} vmin {r['speedMin']:>5} hdg {r['headingEnd']:>7} knee {j['knee']} abd {j['hipAbd']} flex {j['hipFlex']}\")
    print('     ', ' '.join(f\"{s['F']}{s['role'][:2]}:{s['slipCm']}\" for s in r['stances'] if s['role']!='RUN' or s['slipCm']>0.5))
"
