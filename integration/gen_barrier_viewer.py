"""Barrier viewer: forced-goal run (matches the rejected trace trajectory),
authority-label sidecar (OPEN/THROWER/RESTART per frame), mandated bookmarks."""
import json, math, sys, os, collections
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from hybrid import HybridLab, CAL12
from body import dist, W, H
import body as WdMod

ARM = sys.argv[1]
CMDV = {}
_orig_loc = WdMod.Body.locomote
def _spy(self, p, tx, ty, speed):
    CMDV[p['pid']] = (tx, ty)
    return _orig_loc(self, p, tx, ty, speed)
WdMod.Body.locomote = _spy
L = HybridLab('/Users/zainrahman/Downloads/FC Simulator/simulator/validation/rforensic/mw08_start.json',
              789335328, cad=dict(CAL12))
body, b = L.body, L.body.ball
body.restart = {'kind': 'KICKOFF', 'team': 0, 'spot': (52.5, 34.0), 't': 0.0}
if not hasattr(L, 'restart_log'): L.restart_log = []
forced_goal = False
labels = []            # (t, taker_or_None, kind_or_None)
ring = collections.deque(maxlen=90)
multi = []
prev_r = None
while body.t < 1400.0:
    L.run(1/60)
    r = body.restart
    if not forced_goal and body.t > 500.0 and r is None:
        body.restart = {'kind': 'GOAL', 'team': 1, 'spot': (52.5, 34.0), 't': 0.0}
        b['state'] = 'DEAD'; b['ctrl'] = None
        forced_goal = True
    if int(body.t * 60) % 6 == 0:
        vecs = None
        if r is not None:
            vecs = {pid: [round(p['vx'],1), round(p['vy'],1),
                          round(CMDV.get(pid, (p['x'], p['y']))[0], 1),
                          round(CMDV.get(pid, (p['x'], p['y']))[1], 1)]
                    for pid, p in body.players.items()}
        labels.append([round(body.t, 2),
                       (r.get('taker') or r.get('kicker')) if r else None,
                       r['kind'] if r else None, vecs])
    nfast = sum(1 for p in body.players.values()
                if dist(p['x'], p['y'], b['x'], b['y']) < 6.0 and math.hypot(p['vx'], p['vy']) > 3.5)
    ring.append(nfast)
    if r is not None and prev_r is None and r['kind'] == 'THROW_IN':
        multi.append((body.t, max(ring)))
    prev_r = r

seqs = [{'kind': 'ORIGINAL_VISUAL_FAILURE_AFTER', 't': 1113.0}]
got = {'ORIGINAL_VISUAL_FAILURE_AFTER': True}
def once(kind, t, pre=2.0):
    if kind not in got:
        got[kind] = True; seqs.append({'kind': kind, 't': round(max(0.0, t - pre), 1)})
best = max(multi, key=lambda x: x[1], default=None)
if best:
    once('FULL_MULTI_CHASE_THROWIN_SEQUENCE', best[0], pre=6.0)
for e in getattr(L, 'restart_log', []):
    k, ph, t = e['kind'], e['phase'], e['t']
    if k == 'THROW_IN':
        if ph == 'SETUP': once('BALL_OUT_EXACT', t, pre=1.5)
        if ph == 'ASSIGNED': once('THROWER_SELECTED', t, pre=0.5)
        if ph == 'READY': once('THROW_IN_READY', t)
        if ph == 'EXECUTED': once('THROW_RELEASE', t); once('THROW_TO_OPEN_PLAY', t, pre=0.3)
    if k == 'KICKOFF' and ph == 'READY': once('KICKOFF_TWO_IN_CIRCLE', t)
json.dump(L.trace, open(f'{HERE}/trace_bar_{ARM}.json', 'w'))
json.dump(L.decisions, open(f'{HERE}/decisions_bar_{ARM}.json', 'w'))
json.dump(labels, open(f'{HERE}/labels_bar_{ARM}.json', 'w'))
json.dump(sorted(seqs, key=lambda s: s['t']), open(f'{HERE}/sequences_bar_{ARM}.json', 'w'), indent=0)
print(ARM, sorted(got))
