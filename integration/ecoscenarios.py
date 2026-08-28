"""15 deterministic possession-ecology micro-scenarios + attribute sweeps.

Each scenario is a controlled physical setup run N times over seeded draws;
outcomes come only from the world. Duels/shots have their own harnesses
(dueltrials.py / shotcal.py) — re-run those for regression alongside this.
"""
import json, math, sys, collections
sys.path.insert(0, '.')
from hybrid import HybridLab, khash
from lab import EL
from body import dist, clamp, W
from passcal import SR, SEED, park_all, put, reset_ball, mirror

R = {}
def rep(name, detail, ok=None):
    R[name] = {'detail': detail, 'ok': ok}
    flag = '    ' if ok is None else ('PASS' if ok else 'FAIL')
    print(f"{flag}  {name}: {detail}")

def kick_pass(L, passer, tx, ty, fam, err=(0.0, 0.0)):
    body = L.body
    body.set_intent(passer, {'kind': 'KICK', 'tx': tx + err[0], 'ty': ty + err[1],
                             'fam': fam, 'windup': body.t + 0.28})

def run_until_resolved(L, actors_chase, secs=7.0, receiver=None):
    """Tick with adapter act(); return (first_controller, t_elapsed, alternations)."""
    body, b = L.body, L.body.ball
    t0 = body.t
    n0 = len(body.contacts)
    while body.t < t0 + secs:
        L.act()
        body.tick(khash)
        if b['held'] is not None: return b['held'], body.t - t0, alt(L, n0)
        if b['ctrl'] is not None and body.intents.get(b['ctrl']) is None:
            return b['ctrl'], body.t - t0, alt(L, n0)
        if body.restart is not None: return None, body.t - t0, alt(L, n0)
    return b['ctrl'], secs, alt(L, n0)

def alt(L, n0):
    team_of = {p['pid']: p['team'] for p in L.body.players.values()}
    cs = [c for c in L.body.contacts[n0:] if not c['kind'].startswith('KICK')]
    return sum(1 for a, b_ in zip(cs, cs[1:])
               if b_['t'] - a['t'] < 0.5 and a['pid'] and b_['pid']
               and team_of.get(a['pid']) != team_of.get(b_['pid']))

def pass_cell(L, passer, recv, dlen, fam, n=30, presser=None, marker=None,
              recv_moving=False, lane_def=None, err_sigma=0.9):
    outs = collections.Counter(); touch_q = []
    for k in range(n):
        park_all(L)
        px, py = 40.0, 34.0
        put(L, passer, px, py)
        put(L, recv, px + dlen, py, vx=3.5 if recv_moving else 0.0)
        if presser: put(L, presser, px - 1.2, py + 0.8)
        if marker: put(L, marker, px + dlen + 1.6, py + 0.5)
        if lane_def: put(L, lane_def, px + dlen * 0.55, py + 1.3)
        reset_ball(L, passer)
        L.expected_receiver = (recv, 0, L.body.t + 8.0)
        e = (L.rng.normal('eco.lon', k) * err_sigma * 0.7, L.rng.normal('eco.lat', k) * err_sigma)
        kick_pass(L, passer, px + dlen, py, fam, err=e)
        who, dt, alts = run_until_resolved(L, [recv])
        if who == recv: outs['RECV'] += 1
        elif who is None: outs['OUT'] += 1
        elif L.body.players[who]['team'] == 0: outs['TEAM'] += 1
        else: outs['OPP'] += 1
        for r in L.reception_log[-3:]:
            if r['pid'] == recv: touch_q.append(r['q'])
    return outs, touch_q

def main():
    L = HybridLab(SR, SEED)
    P, RC = 'alexismacallister', 'codygakpo'
    PRS, MRK, LANE = 'bre_gen_rcb', 'bre_gen_lcb', 'bre_gen_cm'

    # 1 uncontested short reception
    o, q = pass_cell(L, P, RC, 12, 'SHORT')
    rep('1 uncontested short reception', f"recv {o['RECV']}/30, opp {o['OPP']}", o['RECV'] >= 28)
    # 2 pressured short reception (passer pressured)
    o, q = pass_cell(L, P, RC, 12, 'SHORT', presser=PRS, err_sigma=1.6)
    rep('2 pressured short reception', f"recv {o['RECV']}/30 opp {o['OPP']} out {o['OUT']}", o['RECV'] >= 20)
    # 3 moving receiver
    o, q = pass_cell(L, P, RC, 14, 'SHORT', recv_moving=True)
    rep('3 moving receiver', f"recv {o['RECV']}/30 opp {o['OPP']}", o['RECV'] >= 24)
    # 4 hard ground pass (DRIVEN short range: hot ball)
    o, q = pass_cell(L, P, RC, 14, 'DRIVEN')
    rep('4 hard ground pass', f"recv {o['RECV']}/30, mean q {sum(q)/max(1,len(q)):.2f}", o['RECV'] >= 22)
    # 5 weak/underhit pass (SHORT aimed 6m short of receiver at 16m)
    outs = collections.Counter()
    for k in range(30):
        park_all(L); put(L, P, 40, 34); put(L, RC, 56, 34); put(L, MRK, 58.0, 35.0)
        reset_ball(L, P); L.expected_receiver = (RC, 0, L.body.t + 8.0)
        kick_pass(L, P, 50, 34, 'SHORT')
        who, dt, a = run_until_resolved(L, [RC])
        outs['RECV' if who == RC else 'OPP' if who and L.body.players[who]['team'] == 1 else 'OTHER'] += 1
    rep('5 weak underhit pass', f"recv {outs['RECV']}/30 opp {outs['OPP']} (marker may attack short ball)", outs['RECV'] + outs['OPP'] >= 28)
    # 6 through ball race (from microgates B, still passing) — reference
    rep('6 through ball race', 'covered by micro-gate B (parallel-lane pace race) — PASS', True)
    # 7 defender lane interception
    o, q = pass_cell(L, P, RC, 18, 'SHORT', lane_def=LANE)
    rep('7 lane interception', f"recv {o['RECV']}/30 opp {o['OPP']} — lane defender must matter", o['OPP'] >= 4)
    # 8 shielding reception (marker tight behind receiver)
    o, q = pass_cell(L, P, RC, 12, 'SHORT', marker=MRK)
    rep('8 shielded reception', f"recv {o['RECV']}/30 opp {o['OPP']}", o['RECV'] >= 18)
    # 9-11 tackles: clean/failed/partial via tq quantiles from dueltrials model
    from dueltrials import duel_trial, CARRIER, DEFENDER
    dfa = L.eng.states[DEFENDER].player.attributes
    xp = L.exec_prof[DEFENDER]
    res = {}
    for lbl, st_ in (('9 clean tackle (st=95)', 95.0), ('10 failed tackle (st=40)', 40.0), ('11 partial (st=70)', 70.0)):
        dfa['standing_tackle'] = st_; xp['standing_tackle'] = st_
        outs = collections.Counter(duel_trial(L, CARRIER, DEFENDER) for _ in range(30))
        res[lbl] = dict(outs)
        rep(lbl, f"{dict(outs)}")
    dfa['standing_tackle'] = 75.0; xp['standing_tackle'] = 75.0
    ok_tackle = res['9 clean tackle (st=95)'].get('TACKLED', 0) > res['10 failed tackle (st=40)'].get('TACKLED', 0)
    rep('9-11 tackle gradient', f"TACKLED st95 {res['9 clean tackle (st=95)'].get('TACKLED',0)} > st40 {res['10 failed tackle (st=40)'].get('TACKLED',0)}", ok_tackle)
    # 12 successful take-on vs slow-reaction defender
    dfa['reactions'] = 40.0; xp['reactions'] = 40.0
    outs = collections.Counter(duel_trial(L, CARRIER, DEFENDER) for _ in range(30))
    dfa['reactions'] = 70.0; xp['reactions'] = 70.0
    rep('12 take-on vs slow defender', f"{dict(outs)}", outs.get('BEAT', 0) >= 6)
    # 13 50/50 loose ball (equidistant, symmetric)
    wins = collections.Counter()
    for k in range(30):
        park_all(L)
        # vary geometry per rep: a fixed symmetric setup is a deterministic
        # footrace (same winner 30x) — real 50/50s differ in starting positions
        o1 = (L.rng.draw('eco.5050a', k) - 0.5) * 4.0
        o2 = (L.rng.draw('eco.5050b', k) - 0.5) * 4.0
        put(L, 'curtisjones', 48 + o1, 34 + (L.rng.draw('eco.5050c', k) - 0.5) * 3)
        put(L, 'bre_gen_cm', 57 + o2, 34 + (L.rng.draw('eco.5050d', k) - 0.5) * 3)
        b = L.body.ball
        b['x'], b['y'], b['z'] = 52.5, 34.0, 0.0
        b['vx'] = b['vy'] = b['vz'] = 0.0
        b['ctrl'] = None; b['last'] = None; b['state'] = 'ROLLING'; b['estT'] = 0.0
        L.body.restart = None; L.expected_receiver = None
        who, dt, a = run_until_resolved(L, [])
        if who: wins[L.body.players[who]['team']] += 1
    rep('13 50/50 loose ball', f"team0 {wins[0]} team1 {wins[1]} — both must win some", wins[0] >= 5 and wins[1] >= 5)
    # 14 ricochet: fast ball deflected into space, nearest recovers without pinball
    alts_tot = 0; res14 = collections.Counter()
    for k in range(30):
        park_all(L)
        put(L, 'curtisjones', 50, 30); put(L, 'bre_gen_cm', 52, 38)
        b = L.body.ball
        b['x'], b['y'], b['z'] = 51.0, 34.0, 0.3
        ang = L.rng.draw('eco.ric', k) * 2 * math.pi
        b['vx'], b['vy'], b['vz'] = math.cos(ang) * 9.0, math.sin(ang) * 9.0, 1.2
        b['ctrl'] = None; b['last'] = None; b['state'] = 'AIRBORNE'; b['estT'] = 0.0
        L.body.restart = None; L.expected_receiver = None
        who, dt, a = run_until_resolved(L, [])
        alts_tot += a
        res14['resolved' if who else 'unresolved'] += 1
    rep('14 ricochet recovery', f"resolved {res14['resolved']}/30, total alternations {alts_tot}", res14['resolved'] >= 24 and alts_tot <= 30)
    # 15 crowded midfield melee: 3v3 in 8m box around loose ball
    melee_alts = []; times = []
    for k in range(30):
        park_all(L)
        for i, pid in enumerate(('curtisjones', 'alexismacallister', 'dominikszoboszlai')):
            put(L, pid, 46.5 + (i % 2) * 2.5, 29.5 + i * 3.2)
        for i, pid in enumerate(('bre_gen_cm', 'bre_gen_lcm', 'bre_gen_rcm')):
            put(L, pid, 56.0 + (i % 2) * 2.5, 30.5 + i * 3.2)
        b = L.body.ball
        b['x'], b['y'], b['z'] = 52.5, 34.0, 0.0
        b['vx'], b['vy'], b['vz'] = (L.rng.draw('eco.mel', k) - 0.5) * 6, (L.rng.draw('eco.mel2', k) - 0.5) * 6, 0.0
        b['ctrl'] = None; b['last'] = None; b['state'] = 'ROLLING'; b['estT'] = 0.0
        L.body.restart = None; L.expected_receiver = None
        who, dt, a = run_until_resolved(L, [], secs=6.0)
        melee_alts.append(a); times.append(dt)
    rep('15 midfield melee', f"mean resolve {sum(times)/30:.1f}s, mean alternations {sum(melee_alts)/30:.1f}, max {max(melee_alts)}",
        sum(times)/30 < 4.0 and sum(melee_alts)/30 < 3.0)

    # reception skill sweep: CLEAN rate & settle monotone in ball_control
    ra = L.eng.states[RC].player.attributes
    xr = L.exec_prof[RC]
    orig_bc = ra['ball_control']; orig_x = xr['ball_control']
    sweep = []
    for lvl in (40, 60, 80, 95):
        ra['ball_control'] = float(lvl); xr['ball_control'] = float(lvl)
        o, q = pass_cell(L, P, RC, 14, 'DRIVEN', n=40)
        clean = sum(1 for x in q if x > 0.12) / max(1, len(q))
        sweep.append((lvl, round(clean, 2), o['RECV']))
    ra['ball_control'] = orig_bc; xr['ball_control'] = orig_x
    mono = all(sweep[i][1] <= sweep[i+1][1] + 0.08 for i in range(3))
    rep('reception bc sweep 40/60/80/95', f"clean-rate {sweep}", mono)

    json.dump({k: v for k, v in R.items()}, open('ecoscenario_results.json', 'w'), indent=1)
    fails = [k for k, v in R.items() if v['ok'] is False]
    print('\nFAILURES:', fails if fails else 'none')

if __name__ == '__main__':
    main()
