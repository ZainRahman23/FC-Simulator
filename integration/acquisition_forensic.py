"""Acquisition-path comparison: PASS_RECEPTION vs INTERCEPTION vs LOOSE vs
DEFLECTION vs CLEARANCE -> CONTROL. Per-tick successor-state trace, plus
carrier behavior classification for every possession >1s."""
import json, math, sys, collections
sys.path.insert(0, '.')
from hybrid import HybridLab, CAL12
import body as Wd
from body import dist

L = HybridLab('../simulator/validation/rforensic/mw08_start.json', 789335328, cad=dict(CAL12))
body, b = L.body, L.body.ball
body.restart = {'kind': 'KICKOFF', 'team': 0, 'spot': (52.5, 34.0), 't': 0.0}
team_of = {p['pid']: p['team'] for p in body.players.values()}

CMD = {}
orig_loc = Wd.Body.locomote
def loc_spy(self, p, tx, ty, speed):
    CMD[p['pid']] = (round(tx,1), round(ty,1), round(speed,2), sys._getframe(1).f_lineno)
    return orig_loc(self, p, tx, ty, speed)
Wd.Body.locomote = loc_spy

eps = []          # acquisition episodes
cur = None
last_ctrl = None
dec_n = 0

def classify_source(t, pid):
    """Look back over recent contacts to type the acquisition."""
    prior = [c for c in body.contacts[-14:] if c['t'] < t - 1e-9 and t - c['t'] < 3.0]
    kick = next((c for c in reversed(prior) if c['kind'].startswith('KICK')), None)
    mid  = [c for c in prior if not c['kind'].startswith('KICK') and c['t'] > (kick['t'] if kick else -1)]
    if kick is None: return 'OTHER'
    same = team_of.get(kick['pid']) == team_of[pid]
    if any(c['kind'] in ('DEFLECT',) for c in mid): return 'DEFLECTION_RECOVERY'
    if any(c['kind'] in ('TOUCH_LOOSE', 'HEAVY_TOUCH', 'TAKEON_KNOCK') for c in mid): return 'LOOSE_COLLECTION'
    if same and kick['pid'] != pid and t - kick['t'] < 2.5: return 'PASS_RECEPTION'
    if not same and 'CLEAR' in kick['kind']: return 'CLEARANCE_COLLECTION'
    if not same: return 'INTERCEPTION'
    return 'OTHER'

while body.t < 1800.0:
    CMD.clear()
    n_dec0 = len(L.decisions)
    L.run(1/60)
    ctrl = b['ctrl']
    if ctrl != last_ctrl:
        if ctrl is not None:
            cur = {'pid': ctrl, 't0': body.t, 'src': classify_source(body.t, ctrl),
                   'rows': [], 'first_dec': None, 'first_kick': None, 'end': None,
                   'x0': body.players[ctrl]['x'], 'dist': 0.0, 'prog': 0.0,
                   'lastx': body.players[ctrl]['x'], 'lasty': body.players[ctrl]['y']}
        else:
            if cur is not None:
                cur['end'] = body.t; eps.append(cur); cur = None
        last_ctrl = ctrl
    if cur is not None and ctrl == cur['pid']:
        p = body.players[ctrl]
        dt = body.t - cur['t0']
        step = dist(p['x'], p['y'], cur['lastx'], cur['lasty'])
        cur['dist'] += step
        cur['prog'] += (p['x'] - cur['lastx']) * (1 if p['team'] == 0 else -1)
        cur['lastx'], cur['lasty'] = p['x'], p['y']
        for d in L.decisions[n_dec0:]:
            if d['pid'] == ctrl and cur['first_dec'] is None:
                cur['first_dec'] = (round(dt, 2), d['why'], d['action'])
        if dt < 4.0 and int(body.t * 60) % 3 == 0:
            it = body.intents.get(ctrl)
            cur['rows'].append({'dt': round(dt, 2),
                                'sp': round(math.hypot(p['vx'], p['vy']), 2),
                                'cmd': CMD.get(ctrl),
                                'it': (it or {}).get('kind'),
                                'hold': (it or {}).get('hold'),
                                'd2b': round(dist(p['x'], p['y'], b['x'], b['y']), 2)})
json_eps = []
by_src = collections.defaultdict(list)
for e in eps:
    if e['end'] is None: continue
    dur = e['end'] - e['t0']
    if dur < 0.5: continue
    by_src[e['src']].append(e)

print('══ acquisition-path comparison (possessions ≥0.5s) ══')
for src, es in sorted(by_src.items(), key=lambda kv: -len(kv[1])):
    n = len(es)
    v05 = [next((r['sp'] for r in e['rows'] if r['dt'] >= 0.5), None) for e in es]
    v05 = sorted(v for v in v05 if v is not None)
    v15 = [next((r['sp'] for r in e['rows'] if r['dt'] >= 1.5), None) for e in es]
    v15 = sorted(v for v in v15 if v is not None)
    fd = sorted(e['first_dec'][0] for e in es if e['first_dec'])
    dps = sorted(e['dist'] / max(e['end']-e['t0'], 0.3) for e in es)
    print(f"{src:22s} n={n:3d}  sp@0.5s p50 {v05[len(v05)//2] if v05 else '-'}  "
          f"sp@1.5s p50 {v15[len(v15)//2] if v15 else '-'}  "
          f"first-dec p50 {fd[len(fd)//2] if fd else '-'}s  "
          f"dist/s p50 {dps[len(dps)//2]:.2f}")
# carrier behavior classification for possessions > 1s
long_eps = [e for e in eps if e['end'] and e['end']-e['t0'] > 1.0]
still = sum(1 for e in long_eps if e['dist'] < 1.0)
moved = sum(1 for e in long_eps if e['dist'] >= 3.0)
dd = sorted(e['dist'] for e in long_eps)
pg = sorted(e['prog'] for e in long_eps)
print(f'\npossessions >1s: {len(long_eps)} | carrier moved <1m: {still} ({100*still//max(1,len(long_eps))}%) '
      f'| ≥3m: {moved} | dist p50 {dd[len(dd)//2]:.1f}m | progressive p50 {pg[len(pg)//2]:.1f}m')
json.dump([{k: v for k, v in e.items() if k != 'rows'} for e in eps if e['end']],
          open('acquisition_eps.json', 'w'), default=str)
# dump worst interception/loose episodes for tick inspection
worst = sorted([e for e in eps if e['end'] and e['src'] in ('INTERCEPTION','LOOSE_COLLECTION','CLEARANCE_COLLECTION')
                and e['end']-e['t0'] > 1.5],
               key=lambda e: e['dist'])[:4]
healthy = sorted([e for e in eps if e['end'] and e['src'] == 'PASS_RECEPTION' and e['end']-e['t0'] > 1.5],
                 key=lambda e: -e['dist'])[:2]
json.dump({'worst': worst, 'healthy': healthy}, open('acquisition_worst.json', 'w'), default=str)
print('worst loose/interception episodes:', [(e['src'], e['pid'], round(e['t0'],1), round(e['dist'],1)) for e in worst])
