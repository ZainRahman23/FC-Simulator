# receive_elite1/tools/re1_sweep_sum.py — the attribute series summarised: per series × level, over the elite set × seeds (medians; turns ≥ 90° separately)
import json, sys, statistics as st
rows = json.load(open(sys.argv[1])); grp = sys.argv[2] if len(sys.argv) > 2 else "all"
def med(xs): xs = [x for x in xs if x is not None]; return round(st.median(xs), 3) if xs else None
def mean(xs): xs = [x for x in xs if x is not None]; return round(sum(xs) / len(xs), 3) if xs else None
def p90(xs): xs = sorted(x for x in xs if x is not None); return round(xs[int(0.9 * (len(xs) - 1))], 2) if xs else None
sel = {"all": lambda r: True, "big": lambda r: abs(r['turn']) >= 90, "stat": lambda r: r['kind'] == 'stationary', "move": lambda r: r['kind'] != 'stationary' and abs(r['turn']) >= 90}[grp]
print(f"[{grp}] series lvl |  n | CLEAN | turnMax med/p90 | turnMean | recvMax | contacts | gapMean | recov | |c0 err| m/s | miss med | vMin | v+1s | tAlign")
for s in ("BC", "DRI", "AGI", "ALL"):
  for v in (99, 90, 80, 70, 60, 50):
    R = [r for r in rows if r['series'] == s and r['level'] == v and sel(r)]
    if not R: continue
    tm = [r['sep']['turn']['max'] for r in R if r['sep']['turn']]; c0 = [abs(r['elite']['errs'][0]) for r in R if r.get('elite') and r['elite']['errs']]
    miss = [m for r in R if r.get('elite') for m in r['elite']['miss'] if m is not None]
    print(f"{s:6} {v:3} | {len(R):3} | {sum(1 for r in R if r['cls5'] == 'CLEAN'):3} | {med(tm)} / {p90(tm)} | {med([r['sep']['turn']['mean'] for r in R if r['sep']['turn']])} | {med([r['sep']['receive']['max'] for r in R if r['sep']['receive']])} | {mean([r['receiveContacts'] for r in R])} | {med([r['gapMean'] for r in R])} | {sum(r['recoveryTouches'] for r in R)} | {med(c0)} | {med(miss)} | {med([r['speed']['min'] for r in R])} | {med([r['speed']['after10'] for r in R])} | {med([r['tAlign'] for r in R])}")
