"""Authority-workstream before/after viewer data (1800s, seed 789335328).
Bookmarks every mandated class, measured — not curated."""
import json, math, sys, os, collections
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from hybrid import HybridLab, CAL12
import body as Wd
from body import dist, W, H

ARM = sys.argv[1]
L = HybridLab('/Users/zainrahman/Downloads/FC Simulator/simulator/validation/rforensic/mw08_start.json',
              789335328, cad=dict(CAL12))
body, b = L.body, L.body.ball
body.restart = {'kind': 'KICKOFF', 'team': 0, 'spot': (52.5, 34.0), 't': 0.0}
team_of = {p['pid']: p['team'] for p in body.players.values()}

kicks = []
orig_kick = type(body).kick
def kick_spy(self, pid, tx, ty, fam):
    kicks.append((self.t, pid, fam, dist(self.ball['x'], self.ball['y'], tx, ty)))
    return orig_kick(self, pid, tx, ty, fam)
body.kick = kick_spy.__get__(body)

CMD = {}
orig_loc = Wd.Body.locomote
def loc_spy(self, p, tx, ty, speed):
    CMD[p['pid']] = (tx, ty, speed)
    return orig_loc(self, p, tx, ty, speed)
Wd.Body.locomote = loc_spy

recs = []
orig_cb = body.touch_cb
def cb_spy(p, rv, z):
    res = orig_cb(p, rv, z)
    lst = b['last']
    opp = lst is not None and lst != p['pid'] and body.players[lst]['team'] != p['team']
    oppd = min((dist(q['x'],q['y'],p['x'],p['y']) for q in body.players.values()
                if q['team'] != p['team']), default=99)
    recs.append((round(body.t,2), p['pid'], opp, round(rv,1), round(oppd,1),
                 round(body.t-body.last_kick_t,2), res[0] if res else None))
    return res
body.touch_cb = cb_spy

dbl_ticks = []          # two same-team commanded at ball
frozen = []             # (t, nslow) candidates for longest stationary
throw_ts = []
resume_ts = []
prev_restart = None
speed_hist = collections.deque(maxlen=300)
while body.t < 1800.0:
    CMD.clear()
    L.run(1/60)
    rk = body.restart['kind'] if body.restart else None
    if rk == 'THROW_IN' and prev_restart != 'THROW_IN': throw_ts.append(body.t)
    if rk is None and prev_restart is not None: resume_ts.append(body.t)
    prev_restart = rk
    if int(body.t*60) % 6 == 0 and rk is None:
        for team in (0, 1):
            near = [pid for pid, c in CMD.items() if team_of[pid] == team
                    and not body.players[pid]['gk'] and c[2] > 2.0
                    and dist(c[0], c[1], b['x'], b['y']) < 1.5]
            if len(near) >= 2 and b['ctrl'] is None:
                dbl_ticks.append(round(body.t,2))
        sps = [math.hypot(p['vx'], p['vy']) for pid, p in body.players.items()
               if not p['gk']]
        nslow = sum(1 for s in sps if s < 0.3)
        speed_hist.append((body.t, nslow))
        if len(speed_hist) > 240:
            old = [x for x in speed_hist if body.t - 4.0 < x[0] < body.t - 2.5]
            if old and nslow >= 14 and sum(o[1] for o in old)/len(old) < 9:
                frozen.append(round(body.t,2))

seqs = []
got = collections.Counter()
def add(kind, t, cap=2, pre=4.0):
    if got[kind] < cap:
        got[kind] += 1; seqs.append({'kind': kind, 't': round(max(0.0, t-pre), 1)})

# long-ball reception classes (same-team AND opponent-kicked collections)
for t, pid, opp, rv, oppd, fl, res in recs:
    if fl < 0.8 or rv < 8: continue
    if res == 'CONTROL' or res == 'CLEAN': add('LONGBALL_CONTROLLED', t)
for t, pid, opp, rv, oppd, fl, res in recs:
    if fl < 0.8: continue
    if res == 'HEAVY': add('LONGBALL_HEAVY', t)
    if res in ('LOOSE', 'DEFLECT') and oppd > 3.0:
        add('BOUNCE_CHASE_RESIDUAL', t)          # every remaining bounce->chase class
    if res == 'CLEAN' and oppd < 3.0 and rv > 8: add('LONGBALL_PRESSURED', t)
    if res == 'CLEAN' and opp and oppd > 3.0 and rv > 8: add('CLEARANCE_COLLECTED', t)
for t in dbl_ticks[:2]: add('TWO_PLAYER_PURSUIT_RESIDUAL', t)
for t in frozen[:2]: add('STATIONARY_EPISODE', t)
for t in throw_ts[:2]: add('THROW_IN_BOUNDARY', t, pre=2.0)
for t in resume_ts[:2]: add('RESTART_TO_LIVE', t, pre=2.0)
json.dump(L.trace, open(f'{HERE}/trace_auth2_{ARM}.json', 'w'))
json.dump(L.decisions, open(f'{HERE}/decisions_auth2_{ARM}.json', 'w'))
json.dump(sorted(seqs, key=lambda s: s['t']), open(f'{HERE}/sequences_auth2_{ARM}.json', 'w'), indent=0)
print(ARM, dict(got), '| dbl ticks total:', len(dbl_ticks), '| frozen ticks:', len(frozen))
