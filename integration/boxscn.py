"""§4 Box defense + attacking occupation scenarios.

Five composite cal11-driven scenarios covering the ten mandated situations
(overlap/underlap/late arrivals measured inside the wide/settled sequences).
Full brain on. We measure STRUCTURE — box occupancy, runner tracking,
continued runs — not shots/xG.
"""
import json, math, sys, collections
sys.path.insert(0, '.')
from hybrid import HybridLab, khash
from body import dist, W
from passcal import SR, SEED, park_all, put, reset_ball

def in_box(p, team_attacking):
    if team_attacking == 0:
        return p['x'] > W - 16.5 and abs(p['y'] - 34.0) < 20.15
    return p['x'] < 16.5 and abs(p['y'] - 34.0) < 20.15

ATT_SHAPE = {  # a plausible final-third attacking moment (team 0 attacks +x)
    'alisson': (10, 34), 'virgilvandijk': (55, 26), 'ibrahimakonate': (55, 42),
    'andyrobertson': (78, 8), 'conorbradley': (78, 60), 'curtisjones': (68, 34),
    'alexismacallister': (75, 24), 'dominikszoboszlai': (75, 44),
    'codygakpo': (88, 14), 'mohamedsalah': (88, 54), 'hugoekitike': (90, 34),
}
DEF_SHAPE = {  # away block set around its box (defends x=105 side? NO — away defends +x goal)
    'bre_gen_gk': (103.5, 34), 'bre_gen_lb': (94, 14), 'bre_gen_lcb': (95, 28),
    'bre_gen_rcb': (95, 40), 'bre_gen_rb': (94, 54), 'bre_gen_lcm': (88, 24),
    'bre_gen_cm': (87, 34), 'bre_gen_rcm': (88, 44), 'igorthiago': (78, 16),
    'bre_gen_rw': (78, 52), 'bre_gen_st': (70, 34),
}

def setup(L, ball_holder, moves=None):
    park_all(L)
    for pid, (x, y) in {**ATT_SHAPE, **DEF_SHAPE}.items():
        if pid in L.body.players: put(L, pid, x, y)
    if moves:
        for pid, (x, y) in moves.items(): put(L, pid, x, y)
    reset_ball(L, ball_holder)
    L._roles_t = -9.0
    L.next_cadence = L.body.t + 0.3        # brain takes over almost immediately
    L.next_target_sync = L.body.t

def run_measured(L, secs, att_team=0):
    body = L.body
    end = body.t + secs
    occ_att, occ_def, samples = 0.0, 0.0, 0
    passer_speeds = []          # attacker speed 1 s after releasing a pass
    pending = []                 # (pid, t_kick)
    n0k = len(body.contacts)
    while body.t < end:
        # emulate Lab.run one-tick (reuse run for wake fidelity)
        L.run(1/60)
        if body.tick_n % 30 == 0 and body.restart is None:
            atts = sum(1 for p in body.players.values() if p['team'] == att_team and in_box(p, att_team))
            defs = sum(1 for p in body.players.values() if p['team'] != att_team and not p['gk']
                       and in_box(p, att_team))
            occ_att += atts; occ_def += defs; samples += 1
        for c in body.contacts[n0k:]:
            n0k += 1
            if c['kind'].startswith('KICK:') and 'SHOT' not in c['kind'] and \
               body.players.get(c['pid'], {}).get('team') == att_team:
                pending.append((c['pid'], c['t']))
        for pid, tk in list(pending):
            if body.t >= tk + 1.0:
                q = body.players[pid]
                passer_speeds.append(math.hypot(q['vx'], q['vy']))
                pending.remove((pid, tk))
    return {'att_box_occ': round(occ_att / max(1, samples), 2),
            'def_box_occ': round(occ_def / max(1, samples), 2),
            'passer_v_after_1s': round(sum(passer_speeds) / max(1, len(passer_speeds)), 2),
            'passer_moving_share': round(sum(1 for v in passer_speeds if v > 1.5) / max(1, len(passer_speeds)), 2)}

R = {}
def rep(name, detail, ok):
    R[name] = {'detail': detail, 'ok': bool(ok)}
    print(f"{'PASS' if ok else 'FAIL'}  {name}: {detail}")

def main():
    # 1 settled final-third possession
    L = HybridLab(SR, SEED)
    setup(L, 'curtisjones')
    m = run_measured(L, 25.0)
    rep('1 settled possession', f"{m}",
        m['att_box_occ'] >= 1.2 and m['def_box_occ'] >= 3.0 and m['passer_moving_share'] >= 0.5)

    # 2 wide penetration -> cross/cutback (winger deep, runners mid-box)
    L = HybridLab(SR, SEED)
    setup(L, 'mohamedsalah', moves={'mohamedsalah': (97, 56), 'hugoekitike': (92, 36),
                                    'codygakpo': (90, 28), 'dominikszoboszlai': (84, 40)})
    m = run_measured(L, 20.0)
    # tracking: when attackers are in the box, each has a defender within 4 m (sampled at end-ish)
    body = L.body
    tracked, boxatt = 0, 0
    for p in body.players.values():
        if p['team'] == 0 and in_box(p, 0):
            boxatt += 1
            if any(q for q in body.players.values() if q['team'] == 1 and not q['gk']
                   and dist(q['x'], q['y'], p['x'], p['y']) < 4.0):
                tracked += 1
    rep('2 wide penetration/cross', f"{m} tracked {tracked}/{boxatt}",
        m['att_box_occ'] >= 1.5 and m['def_box_occ'] >= 3.0 and (boxatt == 0 or tracked / boxatt >= 0.6))

    # 3 transition: ball won deep, attackers sparse ahead
    L = HybridLab(SR, SEED)
    setup(L, 'virgilvandijk', moves={'virgilvandijk': (30, 34), 'mohamedsalah': (55, 54),
                                     'codygakpo': (55, 14), 'hugoekitike': (52, 34),
                                     'bre_gen_st': (35, 30), 'igorthiago': (45, 20),
                                     'bre_gen_rw': (45, 48)})
    m = run_measured(L, 20.0)
    # rest defense: away keeps >=4 outfielders within 30 m of its goal line during the attack
    rest = sum(1 for q in L.body.players.values() if q['team'] == 1 and not q['gk'] and q['x'] > W - 42)
    rep('3 transition', f"{m} away players deep at end: {rest}", rest >= 4)

    # 4 numerical overload 4v3 in final quarter
    L = HybridLab(SR, SEED)
    setup(L, 'hugoekitike', moves={'hugoekitike': (84, 34), 'mohamedsalah': (86, 46),
                                   'codygakpo': (86, 22), 'dominikszoboszlai': (80, 34),
                                   'bre_gen_lcb': (93, 28), 'bre_gen_rcb': (93, 40),
                                   'bre_gen_lb': (92, 16),
                                   'bre_gen_rb': (60, 60), 'bre_gen_lcm': (60, 24),
                                   'bre_gen_cm': (58, 34), 'bre_gen_rcm': (60, 44)})
    m = run_measured(L, 15.0)
    passes = sum(1 for c in L.body.contacts if c['kind'].startswith('KICK:') and 'SHOT' not in c['kind']
                 and L.body.players.get(c['pid'], {}).get('team') == 0)
    shots = sum(1 for c in L.body.contacts if 'SHOT' in c['kind'])
    rep('4 overload 4v3', f"{m} passes {passes} shots {shots}",
        m['att_box_occ'] >= 1.5 and passes >= 2)

    # 5 post-BEAT exploitation: real duel, then the beaten defender must not
    # instantly reclaim; carrier continues at speed (BX.Q window)
    L = HybridLab(SR, SEED)
    setup(L, 'mohamedsalah', moves={'mohamedsalah': (72, 50), 'bre_gen_lb': (75, 50)})
    from lab import EL
    car = L.eng.states['mohamedsalah']; dfe = L.eng.states['bre_gen_lb']
    beats = reclaims_2s = cont_speed = n_beat = 0
    for k in range(20):
        put(L, 'mohamedsalah', 72, 50); put(L, 'bre_gen_lb', 75, 50)
        reset_ball(L, 'mohamedsalah')
        L.next_cadence = 1e9; L.next_pressure_ok = 1e9
        L.cur_presser = 'bre_gen_lb'; L._roles_t = -9.0
        L.apply_decision('mohamedsalah', {'action': 'DRIBBLE', 'def_pid': 'bre_gen_lb',
                                          'dribbling': 86, 'acceleration': 88, 'agility': 90, 'def_agility': 68})
        t_beat = None
        for i in range(360):
            L.act(); L.body.tick(khash)
            sal, lb = L.body.players['mohamedsalah'], L.body.players['bre_gen_lb']
            b = L.body.ball
            if t_beat is None and b['ctrl'] == 'mohamedsalah' and \
               L.body.intents.get('mohamedsalah') is None and sal['x'] > lb['x'] + 0.5:
                t_beat = L.body.t; n_beat += 1
                L.body.set_intent('mohamedsalah', {'kind': 'CARRY', 'tx': 95, 'ty': 45})
            if t_beat is not None:
                if b['ctrl'] == 'bre_gen_lb' and L.body.t < t_beat + 2.0:
                    reclaims_2s += 1; break
                if L.body.t >= t_beat + 1.5:
                    cont_speed += math.hypot(sal['vx'], sal['vy']); break
    rep('5 post-BEAT continuation',
        f"beats {n_beat}/20, beaten-def reclaims<2s {reclaims_2s}, carrier v@+1.5s {cont_speed/max(1,n_beat-reclaims_2s):.1f} m/s",
        n_beat >= 4 and reclaims_2s <= max(1, n_beat // 4))

    json.dump(R, open('boxscn_results.json', 'w'), indent=1)
    print('\nFAILURES:', [k for k, v in R.items() if not v['ok']] or 'none')

if __name__ == '__main__':
    main()
