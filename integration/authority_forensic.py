"""POSSESSION-AUTHORITY / CADENCE FORENSIC (blocking; rejected candidate).

Per-tick instrumentation of the full mandated state vector, with every
movement command attributed to its issuing authority (call-site line).
Online detectors dump ring buffers (t-2s .. t+5s) for failing patterns:
  MAGNETIC   approach->back-off oscillation near the ball
  CHATTER    controller/claimant state flapping
  MICROPASS  kick + same-player re-control with tiny ball travel
  DOUBLECHASE two same-team players commanded at one ball
  HEALTHY    stable reception (for first-divergence comparison)
Plus whole-run counters for H1..H7.
"""
import json, math, sys, collections
sys.path.insert(0, '.')
from hybrid import HybridLab, CAL12, khash
import body as Wd
from body import dist

SR = '../simulator/validation/rforensic/mw08_start.json'
SEED = 789335328

AUTH = {  # lab.py locomote call sites -> authority label
    238: 'KICK_APPROACH', 258: 'TAKEON_DRAW', 284: 'TAKEON_CHASE',
    298: 'CARRY_FOLLOW(R-B)', 300: 'CARRY_CORRIDOR', 307: 'LOOSE_CHASER',
    315: 'STRUCT_TARGET', 318: 'CTRL_FOLLOW(R-C)', 320: 'IDLE_STOP',
    351: 'RESTART', 364: 'RESTART', 368: 'RESTART', 369: 'RESTART',
    387: 'RESTART', 395: 'RESTART',
    499: 'GK', 512: 'GK', 550: 'GK', 552: 'GK',
}

L = HybridLab(SR, SEED, cad=dict(CAL12))
body, b = L.body, L.body.ball
body.restart = {'kind': 'KICKOFF', 'team': 0, 'spot': (52.5, 34.0), 't': 0.0}
team_of = {p['pid']: p['team'] for p in body.players.values()}

CMD = {}          # pid -> (tx, ty, sp, label) for the current tick
orig_loc = Wd.Body.locomote
def loc_spy(self, p, tx, ty, speed):
    ln = sys._getframe(1).f_lineno
    CMD[p['pid']] = (round(tx, 2), round(ty, 2), round(speed, 2), AUTH.get(ln, f'L{ln}'))
    return orig_loc(self, p, tx, ty, speed)
Wd.Body.locomote = loc_spy

sync_ts = []
orig_sync = L.sync_targets
def sync_spy():
    sync_ts.append(round(body.t, 3)); return orig_sync()
L.sync_targets = sync_spy

RING = collections.deque(maxlen=int(7.0 * 60))
DUMPS = []
counters = collections.Counter()
ctrl_log = []                       # (t, old, new)
last_ctrl = None
kick_mem = None                     # (t, pid, bx, by)
per_auth = collections.Counter()    # authority histogram (all players)
frozen_ep, frozen_base = [0, 0], [0, 0]   # [cmd_speed==0 count, total] in/out episodes
mag_state = {}                      # pid -> deque of (t, sign)
ep_hold = 0                         # ticks remaining to attribute 'in episode'
dump_budget = collections.Counter()

def snap():
    return {'t': round(body.t, 3),
            'ball': (round(b['x'], 2), round(b['y'], 2), round(b['z'], 2),
                     round(b['vx'], 2), round(b['vy'], 2), b['state'], b['ctrl'],
                     b.get('_exp'), b.get('exclPid'), round(b.get('estT', 0), 2)),
            'p': {pid: (round(p['x'], 2), round(p['y'], 2), round(p['vx'], 2),
                        round(p['vy'], 2), CMD.get(pid),
                        (body.intents.get(pid) or {}).get('kind'))
                  for pid, p in body.players.items()},
            'pend': L._pending_dec, 'restart': body.restart is not None}

def dump(kind, note=''):
    if dump_budget[kind] >= 6: return
    dump_budget[kind] += 1
    DUMPS.append({'kind': kind, 't': round(body.t, 2), 'note': note,
                  'ticks': list(RING)})

n0 = 0
recent_ctrl_changes = collections.deque()
healthy_pending = None
while body.t < 900.0:
    CMD.clear()
    L.run(1/60)
    RING.append(snap())
    # ── ctrl transition log ──
    if b['ctrl'] != last_ctrl:
        ctrl_log.append((round(body.t, 3), last_ctrl, b['ctrl']))
        recent_ctrl_changes.append(body.t)
        last_ctrl = b['ctrl']
    while recent_ctrl_changes and body.t - recent_ctrl_changes[0] > 3.0:
        recent_ctrl_changes.popleft()
    if len(recent_ctrl_changes) >= 5:
        dump('CHATTER', f'{len(recent_ctrl_changes)} ctrl changes in 3s')
        counters['chatter_eps'] += 1; recent_ctrl_changes.clear(); ep_hold = 90
    # ── contacts: micropass detection ──
    while n0 < len(body.contacts):
        c = body.contacts[n0]; n0 += 1
        if c['kind'].startswith('KICK'):
            kick_mem = (c['t'], c['pid'], b['x'], b['y'])
        elif c['kind'] == 'CONTROL' and kick_mem is not None:
            kt, kp, kx, ky = kick_mem
            trav = dist(kx, ky, b['x'], b['y'])
            if c['pid'] == kp and c['t'] - kt < 1.5 and trav < 4.0:
                dump('MICROPASS', f'{kp} kicked t={kt:.2f}, re-controlled after {trav:.1f}m')
                counters['micropass'] += 1; ep_hold = 90
            kick_mem = None
    # ── magnetic detection: controller (or last controller) radial reversals ──
    focus = b['ctrl'] or (ctrl_log[-1][1] if ctrl_log else None)
    if focus is not None:
        p = body.players[focus]
        d2b = dist(p['x'], p['y'], b['x'], b['y'])
        rad = ((b['x'] - p['x']) * p['vx'] + (b['y'] - p['y']) * p['vy'])
        sgn = 1 if rad > 0.35 else (-1 if rad < -0.35 else 0)
        dq = mag_state.setdefault(focus, collections.deque())
        if sgn != 0 and 0.4 < d2b < 3.5:
            if not dq or dq[-1][1] != sgn:
                dq.append((body.t, sgn))
        while dq and body.t - dq[0][0] > 2.0:
            dq.popleft()
        if len(dq) >= 5:
            dump('MAGNETIC', f'{focus} {len(dq)} radial reversals in 2s at d2b {d2b:.2f}')
            counters['magnetic_eps'] += 1; dq.clear(); ep_hold = 90
    # ── double-chase: two same-team players commanded at the ball ──
    if int(body.t * 60) % 15 == 0:
        for team in (0, 1):
            near_cmd = [pid for pid, cmd in CMD.items()
                        if cmd and team_of[pid] == team and cmd[2] > 2.0
                        and dist(cmd[0], cmd[1], b['x'], b['y']) < 1.5
                        and not body.players[pid]['gk']]
            if len(near_cmd) >= 2:
                counters['doublechase_ticks'] += 1
                if counters['doublechase_ticks'] % 40 == 1:
                    dump('DOUBLECHASE', f'team{team} {near_cmd} ctrl={b["ctrl"]}')
                ep_hold = max(ep_hold, 30)
    # ── freeze accounting: commanded speed 0 among non-focal players ──
    if int(body.t * 60) % 6 == 0 and body.restart is None:
        focal = {b['ctrl'], b.get('_exp')} | {pid for pid, cmd in CMD.items()
                 if cmd and cmd[3] in ('LOOSE_CHASER', 'KICK_APPROACH', 'CARRY_FOLLOW(R-B)')}
        tgt_bucket = frozen_ep if ep_hold > 0 else frozen_base
        for pid, cmd in CMD.items():
            if pid in focal or body.players[pid]['gk']: continue
            tgt_bucket[1] += 1
            if cmd and cmd[2] < 0.05: tgt_bucket[0] += 1
    if ep_hold > 0: ep_hold -= 1
    # ── healthy sample: stable control >= 2 s, low drift ──
    if b['ctrl'] is not None and healthy_pending is None and counters['healthy'] < 3:
        healthy_pending = (b['ctrl'], body.t)
    if healthy_pending is not None:
        hp, ht = healthy_pending
        if b['ctrl'] != hp:
            healthy_pending = None
        elif body.t - ht > 2.0:
            counters['healthy'] += 1
            dump('HEALTHY', f'{hp} stable 2s')
            healthy_pending = None
    for pid, cmd in CMD.items():
        if cmd: per_auth[cmd[3]] += 1

print('== counters ==', dict(counters))
print('== ctrl transitions total ==', len(ctrl_log))
gaps = [t2 - t1 for (t1, _, a), (t2, _, c) in zip(ctrl_log, ctrl_log[1:])]
fast = sum(1 for g in gaps if g < 0.5)
print(f'   transitions <0.5s apart: {fast}/{len(gaps)}')
print('== authority histogram ==')
for k, v in per_auth.most_common(14): print(f'   {k:20s} {v}')
fb = frozen_base; fe = frozen_ep
print(f'== zero-command share: baseline {fb[0]}/{fb[1]} ({100*fb[0]/max(1,fb[1]):.1f}%) '
      f'vs episode {fe[0]}/{fe[1]} ({100*fe[0]/max(1,fe[1]):.1f}%)')
print('== sync cadence: n=%d, max gap %.2fs' % (len(sync_ts),
      max((b2 - a2 for a2, b2 in zip(sync_ts, sync_ts[1:])), default=0)))
print('== dumps ==', [(d['kind'], d['t'], d['note']) for d in DUMPS])
json.dump({'dumps': DUMPS, 'ctrl_log': ctrl_log[:400], 'counters': dict(counters),
           'auth': dict(per_auth)}, open('authority_forensic.json', 'w'))
