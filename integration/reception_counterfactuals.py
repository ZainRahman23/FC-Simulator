"""Reception counterfactual sweeps — attribute/context causality, monotone
gates, NO OVR. Canonical trial: 16m pass to a receiver, 15 keyed seeds/cell."""
import json, math, sys
sys.path.insert(0, '.')
from hybrid import HybridLab, CAL12
from body import dist
from passcal import SR, park_all, put
from reception_scenarios import onside, script_pass

SEEDS = [11, 227, 5081, 90210, 424242, 787878, 1000003, 20260826,
         31337, 555001, 660066, 741852, 8675309, 987123, 13571357]

def trial(seed, bc=None, rea=None, fam='SHORT', press_d=None, energy=None,
          rvx=0.0, passer=('dominikszoboszlai', 48, 30), rx=66, chal_d=None,
          weak=False):
    L = HybridLab(SR, seed, cad=dict(CAL12))
    L.next_cadence = 1e9; L.next_pressure_ok = 1e9
    park_all(L); onside(L)
    rcv = 'bre_gen_st' if weak else 'mohamedsalah'
    if weak:
        # weak-receiver trials: give HIM the ball from his own teammate
        passer = ('bre_gen_lcm', 48, 30)
        for q in ('bre_gen_lb', 'bre_gen_rb'):
            L.body.players[q]['x'], L.body.players[q]['y'] = 3.0, 66.5
        put(L, 'igorthiago', 99, 8); put(L, 'alisson', 5, 34)   # onside line vs home
    put(L, passer[0], passer[1], passer[2])
    put(L, rcv, rx, 30, vx=rvx)
    if press_d is not None:
        opp = 'virgilvandijk' if weak else 'bre_gen_rcb'
        put(L, opp, rx + press_d, 30.6)
    if chal_d is not None:
        opp = 'virgilvandijk' if weak else 'bre_gen_rcb'
        put(L, opp, rx + chal_d, 33)
    if bc is not None:  L.exec_prof[rcv]['ball_control'] = bc
    if rea is not None:
        L.exec_prof[rcv]['reactions'] = rea
        L.body.players[rcv]['_re01'] = min(1.0, rea / 100.0)
    if energy is not None: L.eng.states[rcv].energy = energy
    script_pass(L, passer[0], rcv, fam)
    body, b = L.body, L.body.ball
    n0 = len(body.contacts); tC = None; kind0 = None
    drift = 0.0; reacq = None; auth = None; challenged = None
    unblocked = False
    while body.t < 9.0:
        L.run(1/60)
        if not unblocked and b['ctrl'] is None:
            L.next_cadence = body.t + 0.5; L.next_pressure_ok = body.t
            unblocked = True
        while n0 < len(body.contacts):
            c = body.contacts[n0]; n0 += 1
            if tC is None and c['pid'] == rcv and c['kind'] in ('CONTROL', 'HEAVY_TOUCH', 'TOUCH_LOOSE'):
                tC, kind0 = c['t'], c['kind']
            elif tC is not None and challenged is None and c['pid'] not in (None, rcv) \
                    and body.players[c['pid']]['team'] != body.players[rcv]['team'] \
                    and c['kind'] in ('CONTROL', 'TACKLE_WON', 'TOUCH_LOOSE', 'DEFLECT'):
                challenged = round(c['t'] - tC, 2)
        if tC is not None:
            p = body.players[rcv]
            if b['ctrl'] == rcv:
                drift = max(drift, dist(p['x'], p['y'], b['x'], b['y']))
                if auth is None: auth = round(body.t - tC, 2)
            if auth is not None and reacq is None and b['ctrl'] == rcv \
                    and dist(p['x'], p['y'], b['x'], b['y']) < 1.2 and body.t - tC > 0.3:
                reacq = round(body.t - tC, 2)
            if body.t > tC + 5.0: break
    return {'clean': kind0 == 'CONTROL', 'touched': tC is not None,
            'drift': round(drift, 2), 'auth': auth, 'reacq': reacq, 'chal': challenged}

def cell(name, **kw):
    rs = [trial(s, **kw) for s in SEEDS]
    n = len(rs); touched = sum(r['touched'] for r in rs)
    clean = sum(r['clean'] for r in rs)
    dr = sorted(r['drift'] for r in rs if r['touched'])
    reac = sorted(r['reacq'] for r in rs if r['reacq'] is not None)
    chal = sorted(r['chal'] for r in rs if r['chal'] is not None)
    out = {'clean%': round(100.0*clean/max(1, touched)),
           'drift_p50': dr[len(dr)//2] if dr else None,
           'reacq_p90': reac[int(len(reac)*0.9)] if reac else None,
           'chal_p50': chal[len(chal)//2] if chal else None,
           'touched': touched}
    print(f'{name:34s} {out}')
    return out

R = {}
print('── first touch (ball_control) ──')
for v in (40, 60, 80, 95): R[f'bc{v}'] = cell(f'ball_control {v}', bc=v, fam='DRIVEN')
print('── reactions ──')
for v in (40, 70, 95): R[f're{v}'] = cell(f'reactions {v}', rea=v, fam='DRIVEN')
print('── pass speed ──')
for fam in ('SHORT', 'DRIVEN'): R[f'fam{fam}'] = cell(f'pass fam {fam}', fam=fam)
print('── pressure distance ──')
for v in (6.0, 3.0, 1.5): R[f'pr{v}'] = cell(f'presser at {v}m', press_d=v, fam='DRIVEN')
print('── fatigue ──')
for v in (100, 40): R[f'en{v}'] = cell(f'energy {v}', energy=v, fam='DRIVEN')
print('── receiver motion ──')
for v in (0.0, 4.0, 7.0): R[f'mv{v}'] = cell(f'arriving at {v} m/s', rvx=v, fam='DRIVEN')
print('── weak receiver, defender challenge latency ──')
for v in (2.5, 5.0, 9.0): R[f'ch{v}'] = cell(f'weak rcv, defender {v}m', weak=True, chal_d=v, fam='DRIVEN')
json.dump(R, open('reception_cf.json', 'w'), indent=1)

mono = {
 'bc: clean% rises':      R['bc40']['clean%'] <= R['bc60']['clean%'] <= R['bc80']['clean%'] <= R['bc95']['clean%'],
 'pass speed: SHORT cleaner': R['famSHORT']['clean%'] >= R['famDRIVEN']['clean%'],
 'pressure: closer harder': R['pr6.0']['clean%'] >= R['pr1.5']['clean%'],
 'fatigue: tired worse':   R['en100']['clean%'] >= R['en40']['clean%'],
 'challenge latency rises with distance': (R['ch2.5']['chal_p50'] or 99) <= (R['ch9.0']['chal_p50'] or 99),
}
print(json.dumps(mono, indent=1))
