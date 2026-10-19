# technical_control1/tools/tc_sweep_sum.py — a sweep's per-set summary (owner §46): python3 tc_sweep_sum.py <all.jsonl> [out.json] [filter-prefix]
import json, sys, collections, statistics as st
R = [json.loads(l) for l in open(sys.argv[1])]; flt = sys.argv[3] if len(sys.argv) > 3 else ""
by = collections.OrderedDict()
for r in R:
    if 'error' in r or not r['set'].startswith(flt): continue
    by.setdefault(r['set'], []).append(r)
def med(a): a = [x for x in a if x is not None]; return round(st.median(a), 3) if a else None
def mean(a): a = [x for x in a if x is not None]; return round(sum(a) / len(a), 3) if a else None
out = {}
for k, rs in by.items():
    course = [r for r in rs if r['section'] != 'RECEIVE']; turns = [r for r in course if r['section'].startswith('CUT') or r['section'] == 'CONTEST45']; rx = [r for r in rs if r['section'] == 'RECEIVE']
    acts = collections.Counter(a for r in rs for a in r['actions']); surf = collections.Counter(); feet = collections.Counter(); n = 0
    for r in rs:
        for s, v in r['surfaces'].items(): surf[s] += v * r['contacts']
        for f, v in r['feet'].items(): feet[f] += v * r['contacts']
        n += r['contacts']
    o = { 'runs': len(rs), 'failed': sum(1 for r in rs if r['failed']), 'sepMax': round(max(r['sep']['max'] for r in rs), 2), 'sepMaxMed': med([r['sep']['max'] for r in rs]), 'sepMean': mean([r['sep']['mean'] for r in rs]), 'sepP95': med([r['sep']['p95'] for r in rs]),
          'perS': mean([r['perS'] for r in course]), 'gapP50': med([r['gaps']['p50'] for r in course]), 'gapMin': med([r['gaps']['min'] for r in course]),
          'tOrient': mean([r['tOrient'] for r in turns]), 'tTurn': mean([r['tTurnDone'] for r in turns]), 'vLoss': mean([r['speed']['loss'] for r in turns]), 'vExit': mean([r['speed']['exit'] for r in turns]),
          'recovery': sum(r['recovery'] for r in rs), 'prefShare': mean([r['prefShare'] for r in rs]), 'feet': {f: round(v / max(1, n), 3) for f, v in feet.items()}, 'surfaces': {s: round(v / max(1, n), 3) for s, v in surf.most_common()},
          'actions': dict(acts.most_common()), 'rxClean': f"{sum(1 for r in rx if r.get('cls5') == 'CLEAN')}/{len(rx)}", 'rxTCont': mean([r.get('tCont') for r in rx]), 'rxSep': mean([r['sep']['max'] for r in rx]), 'ms': mean([r['ms'] for r in rs]) }
    out[k] = o
    print(f"{k:28s} fail {o['failed']:2d} sepMax {o['sepMax']:5.2f} med {o['sepMaxMed']:.2f} mean {o['sepMean']:.2f} | perS {o['perS']} gap50 {o['gapP50']} | orient {o['tOrient']} turn {o['tTurn']} loss {o['vLoss']} exit {o['vExit']} | rec {o['recovery']:3d} rx {o['rxClean']} tCont {o['rxTCont']} | pref {o['prefShare']} | {' '.join(f'{a}:{c}' for a, c in list(o['actions'].items())[:6])} | {' '.join(f'{s[:3]}{v:.2f}' for s, v in o['surfaces'].items())}")
if len(sys.argv) > 2 and sys.argv[2] != '-': json.dump(out, open(sys.argv[2], 'w'), indent=1)
