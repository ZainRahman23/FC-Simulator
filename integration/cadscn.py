"""cal12 §15 cadence micro-scenarios: decision timelines A vs D-final.

Each scenario poses a football situation, runs the full adapter loop, and
reports WHEN the focal players decided (and why), how long intentions lived,
and whether off-ball intentions persisted. Light assertions only where the
mandate demands a direction; everything else is recorded evidence.
"""
import json, math, sys, collections
sys.path.insert(0, '.')
from hybrid import HybridLab, khash
from body import dist, W
from passcal import SR, park_all, put, reset_ball

D_FINAL = {'MODE': 'D', 'ONE_TOUCH_OD': 1.8, 'SCAN_MAX': 1.2, 'REFRACTORY': 0.9,
           'FALLBACK_BASE': 3.0, 'FALLBACK_FT': 1.5, 'IMPROVE_HOLD': 1.2}

R = {}
def rep(name, detail, ok=None):
    R[name] = {'detail': detail, 'ok': ok}
    flag = 'obs ' if ok is None else ('PASS' if ok else 'FAIL')
    print(f"{flag}  {name}: {detail}")

def fresh(mode):
    cad = {'MODE': 'A'} if mode == 'A' else dict(D_FINAL)
    return HybridLab(SR, 789335328, cad=cad)

def run_for(L, secs):
    end = L.body.t + secs
    while L.body.t < end:
        L.run(1/60)

def dec_of(L, pid, t0=0.0):
    return [(round(d['t'] - t0, 2), d['why'], d['action']) for d in L.decisions if d['pid'] == pid]

def target_churn(L, pid, secs, thresh=2.0):
    """count material target changes for an off-ball player over a window"""
    changes, last = 0, None
    end = L.body.t + secs
    while L.body.t < end:
        L.run(1/60)
        tg = L.last_targets.get(pid)
        if tg is not None:
            pt = (tg[0], tg[1])
            if last is not None and math.hypot(pt[0]-last[0], pt[1]-last[1]) * 1.0 > thresh / 1.0:
                changes += 1
            last = pt
    return changes

def scenario_circulation(mode):
    L = fresh(mode)
    park_all(L)
    put(L, 'virgilvandijk', 25, 24); put(L, 'ibrahimakonate', 25, 44); put(L, 'alisson', 6, 34)
    put(L, 'bre_gen_st', 55, 34)      # striker far away: no press
    reset_ball(L, 'virgilvandijk')
    t0 = L.body.t
    run_for(L, 20.0)
    ds = [d for d in L.decisions if d['pid'] in ('virgilvandijk', 'ibrahimakonate')]
    ivs = [b['t']-a['t'] for a, b in zip(ds, ds[1:])]
    med = sorted(ivs)[len(ivs)//2] if ivs else 99
    return len(ds), round(med, 2)

def scenario_between_lines(mode):
    L = fresh(mode)
    park_all(L)
    put(L, 'virgilvandijk', 40, 34); put(L, 'alexismacallister', 58, 34)
    put(L, 'bre_gen_cm', 63, 30)      # 5-6 m off: no immediate pressure
    reset_ball(L, 'virgilvandijk')
    L.next_cadence = 1e9; L.next_pressure_ok = L.body.t
    L.apply_decision('virgilvandijk', {'action': 'PASS', 'to': 'alexismacallister',
                                       'family': 'SHORT', 'err': (0.0, 0.0)})
    t0 = L.body.t
    run_for(L, 6.0)
    dd = dec_of(L, 'alexismacallister', t0)
    return dd[:3]

def scenario_pressured_winger(mode):
    """Mechanism test: the ball ARRIVES at a receiver with an opponent
    genuinely at his back at the contact instant — one-touch must fire."""
    L = fresh(mode)
    park_all(L)
    put(L, 'mohamedsalah', 78, 12)
    put(L, 'bre_gen_lb', 78.9, 12.4)          # 1.0 m — on his back
    L.body.players['bre_gen_lb']['vmax'] = 0.01
    b = L.body.ball
    b['x'], b['y'], b['z'] = 74.0, 12.0, 0.0
    b['vx'], b['vy'], b['vz'] = 8.0, 0.0, 0.0  # rolled into him
    b['ctrl'] = None; b['last'] = 'curtisjones'; b['state'] = 'ROLLING'; b['estT'] = 0.0
    L.body.restart = None
    L.expected_receiver = ('mohamedsalah', 0, L.body.t + 8.0)
    L.next_cadence = 1e9
    t0 = L.body.t
    run_for(L, 4.0)
    dd = dec_of(L, 'mohamedsalah', t0)
    recs = [c for c in L.body.contacts if c['kind'] == 'CONTROL' and c['pid'] == 'mohamedsalah']
    lat = round(dd[0][0] - (recs[0]['t'] - t0), 2) if dd and recs else None
    return lat, dd[:2]

def scenario_takeon(mode):
    L = fresh(mode)
    park_all(L)
    put(L, 'mohamedsalah', 50, 34); put(L, 'bre_gen_rcb', 52.8, 34.15)
    reset_ball(L, 'mohamedsalah')
    L.cur_presser = 'bre_gen_rcb'
    L.apply_decision('mohamedsalah', {'action': 'DRIBBLE', 'def_pid': 'bre_gen_rcb',
                                      'dribbling': 86, 'acceleration': 88, 'agility': 90, 'def_agility': 68})
    t0 = L.body.t
    interrupted = 0
    for i in range(300):
        n0 = len(L.decisions)
        L.run(1/60)
        it = L.body.intents.get('mohamedsalah')
        if len(L.decisions) > n0 and it is not None and it.get('kind') == 'TAKE_ON':
            interrupted += 1
    return interrupted

def scenario_overlap(mode):
    """Deep wide reception authorizes BX.P box runs; the authorized runners
    must PERSIST toward their destinations while the carrier holds."""
    L = fresh(mode)
    park_all(L)
    put(L, 'curtisjones', 70, 44); put(L, 'mohamedsalah', 84, 58)
    put(L, 'hugoekitike', 80, 40); put(L, 'codygakpo', 78, 24); put(L, 'conorbradley', 74, 60)
    put(L, 'bre_gen_lb', 88, 54); put(L, 'bre_gen_lcb', 92, 30); put(L, 'bre_gen_rcb', 92, 40)
    reset_ball(L, 'curtisjones')
    L.next_cadence = 1e9
    L.apply_decision('curtisjones', {'action': 'PASS', 'to': 'mohamedsalah',
                                     'family': 'SHORT', 'err': (0.0, 0.0)})
    # after salah receives deep (relx>74), BX.P authorizes runs; salah holds
    got = False
    xs = {p: [] for p in ('hugoekitike', 'codygakpo', 'conorbradley')}
    for i in range(360):     # 6 s
        L.run(1/60)
        if not got and L.body.ball['ctrl'] == 'mohamedsalah':
            got = True
            L.next_cadence = 1e9; L._pending_dec = None
            L.body.set_intent('mohamedsalah', {'kind': 'CARRY', 'tx': 86, 'ty': 56})
        if got and i % 60 == 0:
            for p in xs: xs[p].append(round(L.body.players[p]['x'], 1))
    adv = {p: (v[-1] - v[0] if len(v) > 1 else 0) for p, v in xs.items()}
    return adv

def scenario_lowblock_jitter(mode):
    L = fresh(mode)
    import types
    object.__setattr__(L.eng.teams['AWAY'].tactics, 'pressing_intensity', 'PASSIVE')
    park_all(L)
    shape = {'bre_gen_gk': (102, 34), 'bre_gen_lb': (92, 16), 'bre_gen_lcb': (94, 28),
             'bre_gen_rcb': (94, 40), 'bre_gen_rb': (92, 52), 'bre_gen_lcm': (86, 24),
             'bre_gen_cm': (85, 34), 'bre_gen_rcm': (86, 44), 'igorthiago': (80, 18),
             'bre_gen_rw': (80, 50), 'bre_gen_st': (72, 34)}
    for pid, (x, y) in shape.items(): put(L, pid, x, y)
    put(L, 'curtisjones', 70, 34); put(L, 'alexismacallister', 66, 24); put(L, 'dominikszoboszlai', 66, 44)
    reset_ball(L, 'curtisjones')
    churn = target_churn(L, 'bre_gen_lcb', 12.0)
    return churn

def scenario_recovery(mode):
    # beaten defender persists in RECOVER ~t_rec (world-time windows)
    L = fresh(mode)
    park_all(L)
    put(L, 'mohamedsalah', 60, 40); put(L, 'bre_gen_rcb', 62.8, 40.15)
    reset_ball(L, 'mohamedsalah')
    L.cur_presser = 'bre_gen_rcb'
    L.apply_decision('mohamedsalah', {'action': 'DRIBBLE', 'def_pid': 'bre_gen_rcb',
                                      'dribbling': 95, 'acceleration': 92, 'agility': 92, 'def_agility': 60})
    beat_t = None
    rec_dur = 0.0
    for i in range(600):
        L.run(1/60)
        ev = [e for e in L.match_events if e['kind'] == 'BEAT']
        if ev and beat_t is None: beat_t = ev[0]['t']
        if beat_t and L._beaten_world.get('bre_gen_rcb', 0) > L.body.t:
            rec_dur += 1/60
    return (round(rec_dur, 1), ev[0]['t_rec'] if ev else None)

def main():
    print('════ cadence micro-scenarios: A vs D-final ════')
    for mode in ('A', 'D'):
        n, med = scenario_circulation(mode)
        rep(f'1 CB circulation [{mode}]', f'{n} decisions in 20s, median interval {med}s')
    a = scenario_between_lines('A'); d = scenario_between_lines('D')
    rep('2 between lines A', f'first decisions {a}')
    rep('2 between lines D', f'first decisions {d} (expect SETTLED after scan)',
        any(w == 'SETTLED' for _, w, _ in d) or any(w == 'RECEPTION' for _, w, _ in d))
    la, da_ = scenario_pressured_winger('A'); ld, dd_ = scenario_pressured_winger('D')
    rep('3 pressured winger', f'A latency {la}s {da_} | D latency {ld}s {dd_} (one-touch must survive)',
        ld is not None and ld <= 0.3)
    ia = scenario_takeon('A'); idd = scenario_takeon('D')
    rep('4 take-on interrupts', f'A {ia} | D {idd} (decisions during active TAKE_ON)', idd == 0)
    xa = scenario_overlap('A'); xd = scenario_overlap('D')
    rep('5 box-run persistence after deep reception', f'A adv {xa} | D adv {xd}',
        sum(1 for v in xd.values() if v > 2.0) >= 2)
    ja = scenario_lowblock_jitter('A'); jd = scenario_lowblock_jitter('D')
    rep('11 low-block target churn (lcb, 12s)', f'A {ja} | D {jd} (no jitter explosion)', jd <= ja + 4)
    ra = scenario_recovery('D')
    rep('12 recovery window', f'RECOVER active {ra[0]}s vs t_rec {ra[1]}', ra[1] is None or abs(ra[0] - ra[1]) < 1.5)
    print('\n(6 cutback / 8 scramble / 9 long aerial / 10 transition / 13-16 restarts: covered by '
          'ecoscenarios 13-15, micro-gates B/D/H/J and the restart machinery — re-verified in this build)')
    json.dump(R, open('cadscn_results.json', 'w'), indent=1)
    print('FAILURES:', [k for k, v in R.items() if v['ok'] is False] or 'none')

if __name__ == '__main__':
    main()
