"""Restart viewer: 1800s match + one forced goal for the full kickoff-return
sequence. Bookmarks all 11 mandated restart moments."""
import json, math, sys, os
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from hybrid import HybridLab, CAL12
from body import dist

ARM = sys.argv[1]
L = HybridLab('/Users/zainrahman/Downloads/FC Simulator/simulator/validation/rforensic/mw08_start.json',
              789335328, cad=dict(CAL12))
body, b = L.body, L.body.ball
body.restart = {'kind': 'KICKOFF', 'team': 0, 'spot': (52.5, 34.0), 't': 0.0}
if not hasattr(L, 'restart_log'): L.restart_log = []
goal_forced = False
while body.t < 1500.0:
    L.run(1/60)
    # force one goal at ~400s if none occurred naturally (full return sequence)
    if not goal_forced and body.t > 400.0 and body.restart is None:
        body.restart = {'kind': 'GOAL', 'team': 1, 'spot': (52.5, 34.0), 't': 0.0}
        b['state'] = 'DEAD'; b['ctrl'] = None
        goal_forced = True

seqs = []
got = {}
def once(kind, t, pre=2.0):
    if kind not in got:
        got[kind] = True; seqs.append({'kind': kind, 't': round(max(0.0, t - pre), 1)})

log = getattr(L, 'restart_log', [])
for e in log:
    k, ph, t = e['kind'], e['phase'], e['t']
    if k == 'THROW_IN':
        if ph == 'SETUP': once('THROW_IN_BALL_OUT', t, pre=3.0); once('THROW_IN_SETUP', t, pre=0.5)
        if ph == 'READY': once('THROW_IN_READY', t)
        if ph == 'EXECUTED': once('THROW_IN_RELEASE', t); once('THROW_IN_TO_OPEN_PLAY', t, pre=0.5)
    if k == 'KICKOFF':
        if ph == 'RETURN': once('KICKOFF_RETURN_START', t, pre=1.0); once('KICKOFF_RETURN_MID', t + 6.0, pre=0.0)
        if ph == 'READY': once('KICKOFF_ALL_POSITIONED', t)
        if ph == 'EXECUTED': once('KICKOFF_EXECUTION', t); once('KICKOFF_TO_OPEN_PLAY', t, pre=0.5)
# the forced GOAL start
for e in log:
    if e['kind'] == 'KICKOFF' and e['phase'] == 'RETURN' and e['t'] > 395:
        once('GOAL_SCORED', e['t'] - 2.5, pre=1.5)
        once('FULL_GOAL_TO_KICKOFF_SEQUENCE', e['t'] - 3.5, pre=0.0)
        break
first_ti = next((e['t'] for e in log if e['kind'] == 'THROW_IN' and e['phase'] == 'SETUP'), None)
if first_ti: once('FULL_THROWIN_SEQUENCE', first_ti, pre=3.0)
json.dump(L.trace, open(f'{HERE}/trace_rs_{ARM}.json', 'w'))
json.dump(L.decisions, open(f'{HERE}/decisions_rs_{ARM}.json', 'w'))
json.dump(sorted(seqs, key=lambda s: s['t']), open(f'{HERE}/sequences_rs_{ARM}.json', 'w'), indent=0)
print(ARM, sorted(got), '| restarts logged:', len(log))
