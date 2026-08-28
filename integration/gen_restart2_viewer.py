"""Gate-2 restart viewer: match run + one scripted hot-pursuit ball-out and
one forced goal, with the mandated bookmark set."""
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
forced_goal = False; forced_out = False
out_ticks = []          # (t, worst excursion window info)
prev_restart = None
exc_worst = (0.0, None)
while body.t < 1400.0:
    L.run(1/60)
    r = body.restart
    if r is not None and prev_restart is None and r['kind'] == 'THROW_IN':
        out_ticks.append(body.t)
    prev_restart = r
    if r is not None and r.get('kind') == 'THROW_IN':
        tk = r.get('taker')
        for pid, p in body.players.items():
            if pid == tk: continue
            d_out = max(0-p['x'], p['x']-W, 0-p['y'], p['y']-H, 0.0)
            if d_out > exc_worst[0]: exc_worst = (d_out, body.t)
    # scripted hot-pursuit out at ~300s
    if not forced_out and body.t > 300.0 and r is None and b['ctrl'] is not None:
        cp = body.players[b['ctrl']]
        if 20 < cp['x'] < 85:
            b['ctrl'] = None; b['last'] = b['last'] or 'curtisjones'
            b['vx'], b['vy'], b['vz'] = 0.5, -13.0 if cp['y'] < 34 else 13.0, 0.0
            forced_out = True
    if not forced_goal and body.t > 500.0 and r is None:
        body.restart = {'kind': 'GOAL', 'team': 1, 'spot': (52.5, 34.0), 't': 0.0}
        b['state'] = 'DEAD'; b['ctrl'] = None
        forced_goal = True

seqs = []; got = {}
def once(kind, t, pre=2.0):
    if kind not in got:
        got[kind] = True; seqs.append({'kind': kind, 't': round(max(0.0, t - pre), 1)})

log = getattr(L, 'restart_log', [])
for e in log:
    k, ph, t = e['kind'], e['phase'], e['t']
    if k == 'THROW_IN':
        if ph == 'SETUP':
            once('BALL_OUT_EXACT_TICK', t, pre=1.5)
            once('OPPONENT_PURSUIT_ABORT', t, pre=1.0)
            once('THROW_IN_SETUP', t, pre=0.3)
        if ph == 'READY': once('THROW_IN_READY', t)
        if ph == 'EXECUTED':
            once('THROW_IN_RELEASE', t)
            once('THROW_IN_TO_OPEN_PLAY', t, pre=0.3)
    if k == 'KICKOFF':
        if ph == 'RETURN':
            once('KICKOFF_RETURN_START', t, pre=1.0)
            once('KICKOFF_RETURN_MID', t + 5.0, pre=0.0)
        if ph == 'READY':
            once('KICKOFF_TWO_IN_CIRCLE', t)
            once('KICKOFF_READY', t)
        if ph == 'EXECUTED':
            once('KICKOFF_EXECUTION', t)
            once('KICKOFF_TO_OPEN_PLAY', t, pre=0.3)
if exc_worst[1]: once('WORST_NON_THROWER_EXCURSION', exc_worst[1], pre=2.0)
first_ti = next((e['t'] for e in log if e['kind'] == 'THROW_IN' and e['phase'] == 'SETUP'), None)
if first_ti: once('FULL_THROWIN_SEQUENCE', first_ti, pre=3.0)
for e in log:
    if e['kind'] == 'KICKOFF' and e['phase'] == 'RETURN' and e['t'] > 495:
        once('FULL_GOAL_TO_KICKOFF_SEQUENCE', e['t'] - 3.5, pre=0.0); break
json.dump(L.trace, open(f'{HERE}/trace_rg2_{ARM}.json', 'w'))
json.dump(L.decisions, open(f'{HERE}/decisions_rg2_{ARM}.json', 'w'))
json.dump(sorted(seqs, key=lambda s: s['t']), open(f'{HERE}/sequences_rg2_{ARM}.json', 'w'), indent=0)
print(ARM, sorted(got), '| worst non-thrower excursion in run:', round(exc_worst[0], 2), 'm')
