# summary of a g2walk_diag.js output: survival, speed, execution error, model errors, clamps — per file (several files compare variants)
import json, sys, numpy as np
for fn in sys.argv[1:]:
    d = json.load(open(fn)); ups = [r['upright'] for r in d['runs']]; E, S, V, CL, TS, DS, UA, PE = [], [], [], [], [], [], [], []
    for r in d['runs']:
        for q in r['rows']:
            if not q['upright'] or q['k'] < 1: continue
            x = q['exec']
            if x['err']: E.append(x['err'])
            S.append(x['ach'][0] if x['ach'] else np.nan); V.append(q['truth']['vF']); CL.append(bool(q['dec'] and len(q['dec']['clamped']) > 0)); TS.append(x['Tss'] or np.nan); DS.append(x['ds'] or np.nan); UA.append(x['uAt'] or np.nan)
            m = q.get('model') or {}
            if m.get('e_predAch'): PE.append(m['e_predAch'])
    E = np.array(E) if E else np.zeros((1, 2)); PE = np.array(PE) if PE else np.zeros((1, 2))
    print(f"{fn.split('/')[-1]:34s} upright {np.mean(ups):4.1f} ({min(ups)}–{max(ups)}) | speed {np.nanmean(V):.2f}±{np.nanstd(V):.2f} | step {np.nanmean(S):.2f}±{np.nanstd(S):.2f} | exec err fwd {E[:,0].mean()*100:+.1f}±{E[:,0].std()*100:.1f} lat {E[:,1].mean()*100:+.1f}±{E[:,1].std()*100:.1f} cm | Tss {np.nanmean(TS):.2f} DS {np.nanmean(DS):.2f} uAt {np.nanmean(UA):.2f} | clamped {np.mean(CL)*100:.0f}% | model err (achieved u) fwd {PE[:,0].mean()*100:+.1f}±{PE[:,0].std()*100:.1f} cm")
# swing quality (all steps with a liftoff, k ≥ 1, before the fall)
print("swing quality:")
for fn in sys.argv[1:]:
    d = json.load(open(fn)); Q = [q for r in d['runs'] for q in r['rows'] if q['k'] >= 1 and q.get('swing')]
    up = [q for q in Q if q['upright']]; E = np.array([q['exec']['err'][0] for q in up if q['exec']['err']]); ear = np.mean([1.0 if (q['exec']['uAt'] is not None and q['exec']['uAt'] < 0.8) or not q['upright'] else 0.0 for q in Q])
    clr = np.array([q['swing']['minClr'] for q in up if q['swing']['minClr'] is not None]); vf = np.array([q['swing']['vTdF'] for q in up if q['swing']['vTdF'] is not None]); vy = np.array([q['swing']['vTdY'] for q in up if q['swing']['vTdY'] is not None])
    print(f"  {fn.split('/')[-1]:34s} swings {len(Q):3d} | early/failed {ear*100:4.0f}% | overshoot fwd {E.mean()*100:+.1f}±{E.std()*100:.1f} cm | min toe clr med {np.median(clr)*100:.1f} p10 {np.percentile(clr,10)*100:.1f} cm | foot v at td fwd {np.median(vf):+.2f} vert {np.median(vy):+.2f} m/s | re-contacts {sum(q['swing']['recon'] for q in Q)}")
