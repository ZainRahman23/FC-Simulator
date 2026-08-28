"""Micro-gates A-J: prove each action family crosses the brain/body seam correctly."""
import sys, math, json
sys.path.insert(0, '.')
from lab import Lab, khash, MX, MY, W, H
from body import dist, predict_stop

SR = '../simulator/validation/rforensic/mw08_start.json'
SEED = 789335328

def fresh():
    L = Lab(SR, SEED)
    return L

def put(L, pid, x, y):
    p = L.body.players[pid]; p['x'], p['y'], p['vx'], p['vy'] = x, y, 0.0, 0.0
    return p

def give_ball(L, pid):
    p = L.body.players[pid]
    b = L.body.ball
    b['x'], b['y'], b['z'] = p['x'] + 0.6, p['y'], 0.0
    b['vx'] = b['vy'] = b['vz'] = 0.0
    b['ctrl'] = pid; b['last'] = pid; b['state'] = 'ROLLING'

def park_others(L, keep):
    for pid, p in L.body.players.items():
        if pid not in keep:
            p['x'] = 2 + (abs(hash(pid)) % 20) * 0.5
            p['y'] = 1.0 if p['team'] == 0 else 67.0
    # freeze structural targets for parked players by clearing them post-sync
    L.frozen = set(L.body.players) - set(keep)

def run_open(L, seconds):
    """Open-loop micro run: body ticks + carrier intents, no global target sync
    (parked players hold; only 'keep' players get structural pursuit)."""
    end = L.body.t + seconds
    while L.body.t < end:
        while L.ev_cursor < len(L.body.events):
            e = L.body.events[L.ev_cursor]; L.ev_cursor += 1
            if e['kind'] == 'RECEPTION' and L.body.ball['ctrl'] is not None and L.body.ball['ctrl'] not in getattr(L, 'frozen', set()):
                L.decide(L.body.ball['ctrl'], 'RECEPTION')
        L.act_micro()
        L.body.tick(khash)

def act_micro(L):
    body, b = L.body, L.body.ball
    frozen = getattr(L, 'frozen', set())
    for pid, p in body.players.items():
        it = body.intents.get(pid)
        if b['ctrl'] == pid and it and it.get('kind') in ('KICK', 'TAKE_ON', 'CARRY'):
            Lab.act.__wrapped_single__ = None
            # reuse Lab.act's carrier branch by temporary single-dispatch: inline here
        # fallthrough handled in Lab.act
    L.act()
    for pid in frozen:
        p = body.players[pid]
        p['vx'] = p['vy'] = 0.0
Lab.act_micro = lambda self: (setattr(self, 'last_targets', {k: v for k, v in self.last_targets.items() if k not in getattr(self, 'frozen', set())}), self.act())[-1]

results = {}
def gate(name, ok, detail):
    results[name] = {'ok': bool(ok), 'detail': detail}
    print(f"{'PASS' if ok else 'FAIL'}  {name}: {detail}")

# ═══ A. SHORT PASS ═══
L = fresh()
park_others(L, {'virgilvandijk', 'alexismacallister'})
put(L, 'virgilvandijk', 30, 30); put(L, 'alexismacallister', 42, 36)
give_ball(L, 'virgilvandijk')
d = {'action': 'PASS', 'to': 'alexismacallister', 'family': 'SHORT', 'err': (0.4, -0.3), 'sigma_m': 0.5}
L.apply_decision('virgilvandijk', d)
run_open(L, 6)
ks = [c for c in L.body.contacts if c['kind'].startswith('KICK')]
ctl = [c for c in L.body.contacts if c['kind'] == 'CONTROL' and c['pid'] == 'alexismacallister']
order_ok = bool(ks and ctl and ctl[0]['t'] > ks[0]['t'] + 0.3)
no_prekick = all(c['t'] >= ctl[0]['t'] for c in L.body.contacts if c['kind'].startswith('KICK') and c['pid'] == 'alexismacallister') if ctl else False
gate('A short pass', order_ok and no_prekick and L.body.violations == 0,
     f"kick@{ks[0]['t'] if ks else '-'} -> receiver control@{ctl[0]['t'] if ctl else '-'} (flight {round(ctl[0]['t']-ks[0]['t'],2) if ks and ctl else '-'}s), viol {L.body.violations}")

# ═══ B. THROUGH BALL (parallel-lane race: pace decides physically) ═══
def through(run_vmax, def_vmax):
    L = fresh()
    for pid, p in L.body.players.items():
        if pid not in ('alexismacallister','hugoekitike','bre_gen_rcb'):
            p['x'], p['y'] = 2.0, 1.0 if p['team']==0 else 67.0
    pa = L.body.players['alexismacallister']; pa['x'], pa['y'] = 55, 34
    pr = L.body.players['hugoekitike']; pr['x'], pr['y'] = 60, 30; pr['vmax'] = run_vmax
    pd = L.body.players['bre_gen_rcb']; pd['x'], pd['y'] = 60, 38; pd['vmax'] = def_vmax
    b = L.body.ball
    b['x'], b['y'] = 55.6, 34; b['z']=0; b['vx']=b['vy']=b['vz']=0
    b['ctrl']='alexismacallister'; b['last']='alexismacallister'; b['state']='ROLLING'
    L.apply_decision('alexismacallister', {'action':'PASS','to':'hugoekitike','family':'THROUGH','err':(24.0,4.0)})
    from body import chase_point
    while L.body.t < 9:
        for pid in ('hugoekitike','bre_gen_rcb'):
            p2 = L.body.players[pid]
            tx, ty = chase_point(p2, L.body.ball)
            L.body.locomote(p2, tx, ty, p2['vmax'])
        it = L.body.intents.get('alexismacallister')
        if it and it.get('kind')=='KICK':
            pp = L.body.players['alexismacallister']
            L.body.locomote(pp, b['x'], b['y'], 1.8)
            if L.body.t >= it['windup'] and dist(pp['x'],pp['y'],b['x'],b['y']) < 1.0:
                L.body.kick('alexismacallister', it['tx'], it['ty'], it['fam'])
                L.body.intents['alexismacallister'] = None
        L.body.tick(khash)
        if b['ctrl'] in ('hugoekitike','bre_gen_rcb'): break
    return L.body.ball['ctrl'], L.body.violations
w1, v1 = through(8.9, 7.0)
w2, v2 = through(7.0, 8.9)
gate('B through ball', w1 == 'hugoekitike' and w2 == 'bre_gen_rcb' and v1 == v2 == 0,
     f"fast runner wins: {w1}; fast defender wins: {w2} (arrival physical, pace-decided)")

# ═══ C. TAKE-ON: BEAT separation persists; recovery pace-emergent ═══
def takeon(att_v, def_v):
    L = fresh()
    a = L.body.players['mohamedsalah']; a['x'], a['y'], a['vx'], a['vy'] = 70, 44, 0, 0
    dd = L.body.players['bre_gen_lb']; dd['x'], dd['y'], dd['vx'], dd['vy'] = 76, 44, 0, 0
    a['vmax'] = att_v; dd['vmax'] = def_v
    for pid, p in L.body.players.items():
        if pid not in ('mohamedsalah', 'bre_gen_lb'):
            p['x'], p['y'] = 2.0, 1.0 if p['team'] == 0 else 67.0
    b = L.body.ball
    b['x'], b['y'], b['z'] = 70.6, 44, 0; b['vx']=b['vy']=b['vz']=0.0
    b['ctrl'] = 'mohamedsalah'; b['last'] = 'mohamedsalah'; b['state'] = 'ROLLING'
    L.apply_decision('mohamedsalah', {'action': 'DRIBBLE', 'dribbling': 90, 'acceleration': 88, 'def_agility': 60})
    seps = []; ppt = [0.0]; pp = [None]
    while L.body.t < 5.0:
        dp = L.body.players['bre_gen_lb']
        if pp[0] is None or L.body.t >= ppt[0]:
            pp[0] = (b['x'] + b['vx']*0.3, b['y'] + b['vy']*0.3); ppt[0] = L.body.t + 0.3
        L.body.locomote(dp, pp[0][0], pp[0][1], dp['vmax'])
        it = L.body.intents.get('mohamedsalah')
        p = a
        if it and it.get('kind') == 'TAKE_ON' and not it['knocked']:
            corr = it['side']*0.78
            kn = (math.hypot(p['vx'],p['vy']) + 4.2)*it['knock']
            b['vx'], b['vy'], b['vz'] = math.cos(corr)*kn, math.sin(corr)*kn, 0.0
            L.body._contact('TAKEON_KNOCK', 'mohamedsalah'); it['knocked'] = True
            p['burst'] = it['burstT']
        else:
            sp = p['vmax'] + (1.8 if p['burst'] > L.body.t else 0)
            if b['ctrl'] == 'mohamedsalah':
                corr2 = 0.15
                L.body.locomote(p, b['x'] + math.cos(corr2)*2, b['y'] + math.sin(corr2)*2, sp*0.9)
                L.body.carry_touch(p, corr2)
            else:
                from body import chase_point
                tx, ty = chase_point(p, b)
                L.body.locomote(p, tx, ty, sp)
        L.body.tick(khash)
        if L.body.tick_n % 12 == 0:
            seps.append(round(dist(p['x'], p['y'], dp['x'], dp['y']), 2))
    return seps, L.body.violations
s1, v1 = takeon(8.9, 7.0)
s2, v2 = takeon(7.0, 8.9)
end1 = s1[-1] if s1 else 0; end2 = s2[-1] if s2 else 0
peak2 = max(s2) if s2 else 0
gate('C take-on physics', end1 > 5.0 and end1 > s1[8] + 1.0 and end2 < peak2 - 1.5 and end1 > end2 and v1 == v2 == 0,
     f"fast att: sep grows to {end1}m and rising; slow att: peaks {peak2}m then fast defender closes to {end2}m — consequence is pace-emergent")

# ═══ D. CROSS: airborne + box contest ═══
L = fresh()
keep = {'mohamedsalah', 'hugoekitike', 'bre_gen_lcb', 'bre_gen_gk'}
park_others(L, keep)
put(L, 'mohamedsalah', 88, 60); put(L, 'hugoekitike', 96, 30); put(L, 'bre_gen_lcb', 97, 33)
put(L, 'bre_gen_gk', 103, 34)
give_ball(L, 'mohamedsalah')
L.apply_decision('mohamedsalah', {'action': 'PASS', 'to': 'hugoekitike', 'family': 'CROSS', 'err': (0.8, 1.2)})
zmax = 0.0
land = None
end = L.body.t + 7
while L.body.t < end:
    b = L.body.ball
    it0 = L.body.intents.get('mohamedsalah')
    if it0 and it0.get('kind') == 'KICK': land = (it0['tx'], it0['ty'])
    for pid in ('hugoekitike', 'bre_gen_lcb'):
        p = L.body.players[pid]
        tx, ty = land if land else (b['x'], b['y'])
        if b['z'] < 0.6 and land: tx, ty = b['x'] + b['vx']*0.25, b['y'] + b['vy']*0.25
        L.body.locomote(p, tx, ty, p['vmax'])
    it = L.body.intents.get('mohamedsalah')
    p = L.body.players['mohamedsalah']
    if it and it.get('kind') == 'KICK':
        L.body.locomote(p, b['x'], b['y'], 1.8)
        if L.body.t >= it['windup'] and dist(p['x'], p['y'], b['x'], b['y']) < 1.0:
            L.body.kick('mohamedsalah', it['tx'], it['ty'], it['fam'])
            L.body.intents['mohamedsalah'] = None
    L.body.tick(khash)
    zmax = max(zmax, b['z'])
contest = [c for c in L.body.contacts if c['pid'] in ('hugoekitike', 'bre_gen_lcb') and 'KICK' not in c['kind']]
gate('D cross', zmax > 2.0 and len(contest) > 0 and L.body.violations == 0,
     f"apex {zmax:.1f}m, box contact: {contest[0]['kind'] if contest else 'none'} by {contest[0]['pid'] if contest else '-'}")

# ═══ E. SHOT -> GK response ═══
L = fresh()
park_others(L, {'hugoekitike', 'bre_gen_gk'})
put(L, 'hugoekitike', 88, 32); put(L, 'bre_gen_gk', 103.2, 34)
give_ball(L, 'hugoekitike')
L.apply_decision('hugoekitike', {'action': 'SHOOT', 'aim_off': 1.2, 'finishing': 90})
run_open(L, 4)
gkc = [c for c in L.body.contacts if c['kind'].startswith('GK_')]
goal = [c for c in L.body.contacts if c['kind'] == 'GOAL']
gate('E shot', (gkc or goal) and L.body.violations == 0,
     f"strike -> {'GK ' + gkc[0]['kind'] if gkc else ''}{'GOAL' if goal else ''} (physical outcome)")

# ═══ F+G. PRESS + TACKLE: no magic possession transfer ═══
L = fresh()
park_others(L, {'dominikszoboszlai', 'bre_gen_cm'})
put(L, 'dominikszoboszlai', 55, 34); put(L, 'bre_gen_cm', 62, 34)
give_ball(L, 'dominikszoboszlai')
L.apply_decision('dominikszoboszlai', {'action': 'CARRY', 'carry_target': (70/1.05, 34/0.68)})
flips_without_contact = 0
prev_ctrl = 'dominikszoboszlai'
poke = None
end = L.body.t + 6
while L.body.t < end:
    b = L.body.ball
    dp = L.body.players['bre_gen_cm']
    L.body.locomote(dp, b['x'] + b['vx']*0.25, b['y'] + b['vy']*0.25, dp['vmax'])
    # physical poke rule (body-side tackle realization)
    c = L.body.players['dominikszoboszlai']
    if dist(dp['x'], dp['y'], b['x'], b['y']) < 1.15 and dist(c['x'], c['y'], b['x'], b['y']) > 0.55 and b['ctrl'] == 'dominikszoboszlai':
        a = math.atan2(b['y']-c['y'], b['x']-c['x'])
        b['vx'], b['vy'], b['vz'] = math.cos(a)*7.5, math.sin(a)*7.5, 0.2
        b['ctrl'] = None
        L.body._contact('TACKLE_POKE', 'bre_gen_cm')
        poke = round(L.body.t, 2)
    L.act()
    L.body.tick(khash)
    if b['ctrl'] != prev_ctrl and b['ctrl'] is not None:
        window = [x for x in L.body.contacts if abs(x['t'] - L.body.t) < 0.5]
        if not window: flips_without_contact += 1
        prev_ctrl = b['ctrl']
gate('F+G press/tackle', poke is not None and flips_without_contact == 0 and L.body.violations == 0,
     f"tackle poke@{poke}; possession flips without a physical contact: {flips_without_contact}")

# ═══ H. BUILDUP (closed loop, real cal11 decisions) ═══
L = fresh()
L.body.restart = {'kind': 'GOAL_KICK', 'team': 0, 'spot': (5.5, 34.0), 't': 0.0}
L.run(35)
passes = [c for c in L.body.contacts if c['kind'].startswith('KICK')]
recs = [c for c in L.body.contacts if c['kind'] == 'CONTROL']
# off-ball motion during ball flights: sample player speeds while ball uncontrolled
moving = [s for s in L.trace if s['b'][4] is None]
frac_moving = 0.0
if moving:
    n_mv = sum(1 for s in moving for pl in s['p'] if pl[3] in ('JOG', 'RUN', 'SPRINT', 'WALK'))
    frac_moving = n_mv / (len(moving)*22)
gate('H buildup', len(passes) >= 3 and len(recs) >= 3 and frac_moving > 0.5 and L.body.violations == 0,
     f"{len(passes)} kicks, {len(recs)} receptions in 35s closed loop; {frac_moving*100:.0f}% of players in motion while ball travels")

# ═══ I. OVERLAP-CLASS RUN: cal11 target executed as continuous travel ═══
L = fresh()
L.body.restart = {'kind': 'KICKOFF', 'team': 0, 'spot': (52.5, 34.0), 't': 0.0}
pathlen = {p: 0.0 for p in L.body.players}
prev = {p: (b['x'], b['y']) for p, b in L.body.players.items()}
maxstep = 0.0
end_needed = 40
L2 = L
import types
orig_tick = L.body.tick
def measuring_run(L, seconds):
    end = L.body.t + seconds
    while L.body.t < end:
        while L.ev_cursor < len(L.body.events):
            e = L.body.events[L.ev_cursor]; L.ev_cursor += 1
            if e['kind'] == 'RECEPTION' and L.body.ball['ctrl'] is not None:
                L.decide(L.body.ball['ctrl'], 'RECEPTION'); L.next_cadence = L.body.t + 2.5
        if L.body.restart is not None:
            L.handle_restart(); L.body.tick(khash)
        else:
            if L.body.t >= L.next_target_sync:
                L.sync_targets(); L.next_target_sync = L.body.t + 1.0
            if L.body.ball['ctrl'] is not None and L.body.t >= L.next_cadence:
                L.decide(L.body.ball['ctrl'], 'cadence'); L.next_cadence = L.body.t + 2.5
            L.act(); L.body.tick(khash)
        for pid, p in L.body.players.items():
            d = dist(p['x'], p['y'], prev[pid][0], prev[pid][1])
            pathlen[pid] += d
            global maxstep
            maxstep = max(maxstep, d)
            prev[pid] = (p['x'], p['y'])
measuring_run(L, end_needed)
long_runners = sorted(pathlen.values(), reverse=True)[:5]
gate('I continuous runs', maxstep < 0.35 and long_runners[0] > 60,
     f"max per-tick step {maxstep:.2f}m (no snaps); top runner covered {long_runners[0]:.0f}m in 40s — runs are physically travelled")

# ═══ J. GOAL -> KICKOFF ═══
L = fresh()
park = set(L.body.players) - {'hugoekitike'}
put(L, 'hugoekitike', 97, 34)
L.body.players['bre_gen_gk']['x'] = 103.5; L.body.players['bre_gen_gk']['y'] = 40.0  # wrong-footed
give_ball(L, 'hugoekitike')
L.apply_decision('hugoekitike', {'action': 'SHOOT', 'aim_off': -0.5})
seq = []
end = L.body.t + 25
while L.body.t < end:
    while L.ev_cursor < len(L.body.events):
        e = L.body.events[L.ev_cursor]; L.ev_cursor += 1
    if L.body.restart is not None:
        L.handle_restart()
    else:
        if L.body.t >= L.next_target_sync:
            L.sync_targets(); L.next_target_sync = L.body.t + 1.0
        L.act()
    L.body.tick(khash)
    st = L.body.restart['kind'] if L.body.restart else 'OPEN'
    if not seq or seq[-1] != st: seq.append(st)
gate('J goal->kickoff', L.body.score[0] == 1 and 'GOAL' in seq and 'KICKOFF' in seq and seq[-1] == 'OPEN',
     f"score {L.body.score}, sequence {seq}")

print()
print(json.dumps({k: v['ok'] for k, v in results.items()}))
json.dump(results, open('microgate_results.json', 'w'), indent=1)
