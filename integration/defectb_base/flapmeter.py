"""Visual flap meter: actual-velocity direction reversals (>120deg vs 0.25s ago,
both speeds >0.5) per player; seconds with >=3 flips/s = visible flapping.
Also skid-loop seconds: commanded speed >3 while actual displacement <0.35m/s."""
import json, math, sys, os, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hybrid import HybridLab, CAL12
import body as Wd
from body import dist

SRA = '/Users/zainrahman/Downloads/FC Simulator/simulator/validation/rforensic/mw08_start.json'
L = HybridLab(SRA, 789335328, cad=dict(CAL12))
body, b = L.body, L.body.ball
body.restart = {'kind': 'KICKOFF', 'team': 0, 'spot': (52.5, 34.0), 't': 0.0}
CMD = {}
orig = Wd.Body.locomote
def spy(self, p, tx, ty, speed):
    CMD[p['pid']] = speed
    return orig(self, p, tx, ty, speed)
Wd.Body.locomote = spy
pids = [pid for pid in body.players if not body.players[pid]['gk']]
vhist = {pid: collections.deque(maxlen=16) for pid in pids}
flips = {pid: collections.deque() for pid in pids}
flap = collections.Counter(); skid = collections.Counter()
pos_hist = {pid: collections.deque(maxlen=60) for pid in pids}
while body.t < 1800.0:
    CMD.clear(); L.run(1/60)
    t = body.t
    for pid in pids:
        p = body.players[pid]
        vx, vy = p['vx'], p['vy']
        sp = math.hypot(vx, vy)
        vh = vhist[pid]
        if len(vh) == 16:
            ox, oy = vh[0]
            osp = math.hypot(ox, oy)
            if sp > 0.5 and osp > 0.5 and (vx*ox + vy*oy) < -0.5 * sp * osp:
                flips[pid].append(t)
        vh.append((vx, vy))
        while flips[pid] and t - flips[pid][0] > 1.0: flips[pid].popleft()
        if len(flips[pid]) >= 3: flap[pid] += 1
        pos_hist[pid].append((p['x'], p['y']))
        if len(pos_hist[pid]) == 60 and CMD.get(pid, 0) > 3.0:
            x0, y0 = pos_hist[pid][0]
            if dist(x0, y0, p['x'], p['y']) < 0.35: skid[pid] += 1
print('FLAP seconds (>=3 dir-reversals/s):',
      {k: round(v/60, 1) for k, v in flap.most_common(8) if v > 30})
print('total flap s:', round(sum(flap.values())/60, 1),
      '| SKID-loop s (cmd>3, disp<0.35m/s):', round(sum(skid.values())/60, 1),
      {k: round(v/60,1) for k, v in skid.most_common(5) if v > 30})
