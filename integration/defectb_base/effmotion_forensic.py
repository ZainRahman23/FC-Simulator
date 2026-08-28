"""DEFECT B forensic: EFFECTIVE motion, not command existence.
Per player per tick: command authority/target/speed, actual velocity,
desired-direction reversal, target displacement. Detects:
  FREEZE  — synchronized collapse of actual motion right after an active phase
  TWITCH  — high-frequency desired-direction reversal with low net displacement
  CHURN   — command target jumping >3m repeatedly within 1s
Dumps rings for first-causal-tick analysis."""
import json, math, sys, collections
sys.path.insert(0, '.')
from hybrid import HybridLab, CAL12
import body as Wd
from body import dist

SR = '/Users/zainrahman/Downloads/FC Simulator/simulator/validation/rforensic/mw08_start.json'
L = HybridLab(SR, 789335328, cad=dict(CAL12))
body, b = L.body, L.body.ball
body.restart = {'kind': 'KICKOFF', 'team': 0, 'spot': (52.5, 34.0), 't': 0.0}

CMD = {}
orig_loc = Wd.Body.locomote
def loc_spy(self, p, tx, ty, speed):
    CMD[p['pid']] = (tx, ty, speed, sys._getframe(1).f_lineno)
    return orig_loc(self, p, tx, ty, speed)
Wd.Body.locomote = loc_spy

pids = sorted(body.players)
outf = [pid for pid in pids if not body.players[pid]['gk']]
prev_cmd = {}; prev_pos = {}
rev_win = {pid: collections.deque() for pid in pids}      # (t, ) reversal times
pos_1s = {pid: collections.deque(maxlen=60) for pid in pids}
churn_win = {pid: collections.deque() for pid in pids}
speed_hist = collections.deque(maxlen=60*5)               # (t, nslow, mean_speed)
RING = collections.deque(maxlen=60*9)
dumps = []; budget = collections.Counter()
stats = collections.Counter()
twitch_secs = collections.Counter(); freeze_secs = 0.0
cur_freeze = 0.0; freeze_periods = []

def snap(tag=''):
    return {'t': round(body.t, 2), 'tag': tag,
            'ball': (round(b['x'],1), round(b['y'],1), b['ctrl'], b['state']),
            'restart': body.restart is not None,
            'p': {pid: (round(body.players[pid]['x'],1), round(body.players[pid]['y'],1),
                        round(math.hypot(body.players[pid]['vx'], body.players[pid]['vy']),2),
                        (round(CMD[pid][0],1), round(CMD[pid][1],1), round(CMD[pid][2],1), CMD[pid][3]) if pid in CMD else None,
                        (body.intents.get(pid) or {}).get('kind'))
                  for pid in pids}}

while body.t < 1800.0:
    CMD.clear()
    L.run(1/60)
    t = body.t
    open_play = body.restart is None and b['state'] != 'DEAD'
    nslow = 0; spd_sum = 0.0
    for pid in outf:
        p = body.players[pid]
        sp = math.hypot(p['vx'], p['vy'])
        spd_sum += sp
        if sp < 0.3: nslow += 1
        cmd = CMD.get(pid)
        pc = prev_cmd.get(pid)
        if cmd and pc:
            # desired-direction reversal (commanded, not achieved)
            d1 = math.atan2(cmd[1]-p['y'], cmd[0]-p['x'])
            d0 = math.atan2(pc[1]-p['y'], pc[0]-p['x'])
            dd = abs((d1-d0+math.pi*3) % (2*math.pi) - math.pi)
            if dd > 2.5 and cmd[2] > 0.8 and pc[2] > 0.8:
                rev_win[pid].append(t); stats['reversals'] += 1
            if dist(cmd[0], cmd[1], pc[0], pc[1]) > 3.0:
                churn_win[pid].append(t); stats['target_jumps'] += 1
        prev_cmd[pid] = cmd
        pos_1s[pid].append((p['x'], p['y']))
        while rev_win[pid] and t - rev_win[pid][0] > 1.0: rev_win[pid].popleft()
        while churn_win[pid] and t - churn_win[pid][0] > 1.0: churn_win[pid].popleft()
        # TWITCH: >=4 commanded reversals in 1s, net displacement < 0.8m
        if len(rev_win[pid]) >= 4 and len(pos_1s[pid]) >= 55:
            x0, y0 = pos_1s[pid][0]
            if dist(x0, y0, p['x'], p['y']) < 0.8:
                if sp > 1.2:
                    twitch_secs[pid] += 1/60      # VISIBLE thrash
                else:
                    stats['quiet_adjust_ticks'] += 1  # sub-jog foot adjustment
                if budget['TWITCH'] < 5 and int(t*60) % 30 == 0:
                    budget['TWITCH'] += 1
                    dumps.append({'kind': 'TWITCH', 't': round(t,2), 'pid': pid,
                                  'ticks': list(RING)[-240:]})
        if len(churn_win[pid]) >= 4 and budget['CHURN'] < 5 and int(t*60) % 30 == 1:
            budget['CHURN'] += 1
            dumps.append({'kind': 'CHURN', 't': round(t,2), 'pid': pid, 'ticks': list(RING)[-240:]})
    if open_play:
        speed_hist.append((t, nslow, spd_sum/len(outf)))
        # FREEZE: >=14/20 outfielders quasi-static now, but the 3s-ago window was active
        if len(speed_hist) > 240:
            old = [x for x in speed_hist if t - 4.0 < x[0] < t - 2.5]
            if old and nslow >= 14 and sum(o[1] for o in old)/len(old) < 9:
                cur_freeze += 1/60; freeze_secs += 1/60
                if budget['FREEZE'] < 6 and cur_freeze < 0.02:
                    budget['FREEZE'] += 1
                    dumps.append({'kind': 'FREEZE', 't': round(t,2), 'ticks': list(RING)[-300:]})
            else:
                if cur_freeze > 0.3: freeze_periods.append((round(t-cur_freeze,2), round(cur_freeze,2)))
                cur_freeze = 0.0
    RING.append(snap())

print('reversal commands total:', stats['reversals'], '| target jumps >3m:', stats['target_jumps'])
tw = {pid: round(v,1) for pid, v in twitch_secs.most_common(8) if v > 0.2}
print('twitch seconds by player:', tw)
print('freeze seconds total:', round(freeze_secs,1), '| sustained periods:', freeze_periods[:10])
print('dumps:', [(d['kind'], d['t'], d.get('pid')) for d in dumps])
pass
