"""One-thrower-invariant viewer. Finds a NATURAL multi-chase throw-in
(≥2 players fast near the ball in the second before the whistle) and
bookmarks the full mandated set with 5s pre-roll."""
import json, math, sys, os, collections
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from hybrid import HybridLab, CAL12
from body import dist, W, H

ARM = sys.argv[1]
L = HybridLab('/Users/zainrahman/Downloads/FC Simulator/simulator/validation/rforensic/mw08_start.json',
              789335328, cad=dict(CAL12))
body, b = L.body, L.body.ball
body.restart = {'kind': 'KICKOFF', 'team': 0, 'spot': (52.5, 34.0), 't': 0.0}
if not hasattr(L, 'restart_log'): L.restart_log = []
ring = collections.deque(maxlen=90)     # 1.5s of (t, chasers-near-fast count)
multi_chase_outs = []
prev_restart = None
forced_goal = False
while body.t < 1400.0:
    L.run(1/60)
    r = body.restart
    nfast = sum(1 for p in body.players.values()
                if dist(p['x'], p['y'], b['x'], b['y']) < 6.0
                and math.hypot(p['vx'], p['vy']) > 3.5)
    ring.append((body.t, nfast))
    if r is not None and prev_restart is None and r['kind'] == 'THROW_IN':
        peak = max((n for _, n in ring), default=0)
        multi_chase_outs.append((body.t, peak))
    prev_restart = r
    if not forced_goal and body.t > 500.0 and r is None:
        body.restart = {'kind': 'GOAL', 'team': 1, 'spot': (52.5, 34.0), 't': 0.0}
        b['state'] = 'DEAD'; b['ctrl'] = None
        forced_goal = True

seqs = []; got = {}
def once(kind, t, pre=2.0):
    if kind not in got:
        got[kind] = True; seqs.append({'kind': kind, 't': round(max(0.0, t - pre), 1)})

# best multi-chase throw-in (highest pre-out chaser count)
best = max(multi_chase_outs, key=lambda x: x[1], default=None)
if best:
    once('MULTI_PLAYER_CHASE_BEFORE_OUT', best[0], pre=5.5)
    once('FULL_MULTI_CHASE_THROWIN_SEQUENCE', best[0], pre=6.0)
    once('SAME_SEQUENCE_AFTER_OUT', best[0], pre=0.3)
log = getattr(L, 'restart_log', [])
for e in log:
    k, ph, t = e['kind'], e['phase'], e['t']
    if k == 'THROW_IN':
        if ph == 'SETUP': once('BALL_OUT_EXACT', t, pre=1.0)
        if ph == 'ASSIGNED': once('THROWER_SELECTED', t, pre=0.5); once('ALL_NONTHROWERS_ABORT', t, pre=0.5)
        if ph == 'READY': once('THROW_IN_READY', t); once('THROWER_ONLY_OUTSIDE', t, pre=1.0)
        if ph == 'EXECUTED': once('THROW_RELEASE', t); once('THROW_TO_OPEN_PLAY', t, pre=0.3)
    if k == 'KICKOFF' and ph == 'READY':
        once('KICKOFF_TWO_IN_CIRCLE', t)
json.dump(L.trace, open(f'{HERE}/trace_tf_{ARM}.json', 'w'))
json.dump(L.decisions, open(f'{HERE}/decisions_tf_{ARM}.json', 'w'))
json.dump(sorted(seqs, key=lambda s: s['t']), open(f'{HERE}/sequences_tf_{ARM}.json', 'w'), indent=0)
print(ARM, sorted(got), '| multi-chase outs (t, peak chasers):',
      [(round(t,1), n) for t, n in sorted(multi_chase_outs, key=lambda x: -x[1])[:4]])
