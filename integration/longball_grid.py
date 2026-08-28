"""Long-ball control grid: fam x distance x receiver-state x bc tier.
12 keyed seeds per cell; receiver is the called receiver at the landing spot."""
import json, math, sys
sys.path.insert(0, '.')
from hybrid import HybridLab, CAL12, khash
from body import dist
from passcal import SR, park_all, put

SEEDS = [3, 71, 911, 4242, 55555, 123123, 777001, 20260826, 31415, 987, 13579, 8642]

def trial(seed, fam='LOFT', D=40.0, moving=False, bc=None, press=False):
    L = HybridLab(SR, seed, cad=dict(CAL12))
    L.next_cadence = 1e9; L.next_pressure_ok = 1e9
    park_all(L)
    put(L, 'bre_gen_lb', 99, 8); put(L, 'bre_gen_rb', 99, 60)
    kx, ky = 30.0, 34.0
    rx = kx + D
    put(L, 'dominikszoboszlai', kx, ky)
    rcv = 'codygakpo'
    if moving: put(L, rcv, rx - 6, 30, vx=3.0, vy=1.0)
    else:      put(L, rcv, rx, 34)
    if press:  put(L, 'bre_gen_rcb', rx + 1.6, 34.6)
    if bc is not None: L.exec_prof[rcv]['ball_control'] = bc
    body, b = L.body, L.body.ball
    b['x'], b['y'], b['z'] = kx + 0.4, ky, 0.0
    b['vx'] = b['vy'] = b['vz'] = 0.0
    b['ctrl'] = 'dominikszoboszlai'; b['last'] = 'dominikszoboszlai'
    b['state'] = 'CONTROLLED'; b['estT'] = 1.0
    body.restart = None
    L.expected_receiver = (rcv, 0, body.t + 6.0)
    body.set_intent('dominikszoboszlai', {'kind': 'KICK', 'tx': rx, 'ty': 34.0,
                                          'fam': fam, 'windup': body.t + 0.05,
                                          'then': {'kind': 'BRAIN'}})
    n0 = len(body.contacts); unblocked = False
    first = None; ctrl_ok = None
    t_end = body.t + 12.0
    while body.t < t_end:
        L.run(1/60)
        if not unblocked and b['ctrl'] is None:
            L.next_cadence = body.t + 0.5; L.next_pressure_ok = body.t
            unblocked = True
        while n0 < len(body.contacts):
            c = body.contacts[n0]; n0 += 1
            if c['pid'] == rcv and first is None and not c['kind'].startswith('KICK'):
                first = c['kind']; t_end = c['t'] + 3.0
            elif first is not None and c['kind'] == 'CONTROL' and c['pid'] == rcv:
                ctrl_ok = round(c['t'] - (t_end - 3.0), 2)
    return {'first': first, 'ctrl3s': first == 'CONTROL' or ctrl_ok is not None}

def cell(name, **kw):
    rs = [trial(s, **kw) for s in SEEDS]
    import collections
    c = collections.Counter(r['first'] for r in rs)
    got = sum(1 for r in rs if r['first'] is not None)
    clean = c.get('CONTROL', 0)
    rec3 = sum(1 for r in rs if r['ctrl3s'])
    print(f'{name:38s} touched {got:2d}/12  first-touch CLEAN {clean:2d}  '
          f'DEFLECT {c.get("DEFLECT",0):2d}  HEAVY {c.get("HEAVY_TOUCH",0):2d}  LOOSE {c.get("TOUCH_LOOSE",0):2d}  ctrl<=3s {rec3:2d}')
    return {'clean': clean, 'got': got, 'rec3': rec3, 'deflect': c.get('DEFLECT', 0)}

R = {}
print('── set receiver (called), unpressured ──')
R['loft40'] = cell('LOFT 40m set elite(85)', fam='LOFT', D=40)
R['loft55'] = cell('LOFT 55m set elite', fam='LOFT', D=55)
R['drv40']  = cell('DRIVEN 40m set elite', fam='DRIVEN', D=40)
R['loft40_bc95'] = cell('LOFT 40m set bc95', fam='LOFT', D=40, bc=95)
R['loft40_bc65'] = cell('LOFT 40m set bc65', fam='LOFT', D=40, bc=65)
R['loft40_bc45'] = cell('LOFT 40m set bc45', fam='LOFT', D=40, bc=45)
print('── context ──')
R['loft40_mov'] = cell('LOFT 40m receiver arriving late', fam='LOFT', D=40, moving=True)
R['loft40_prs'] = cell('LOFT 40m set + marker 1.6m', fam='LOFT', D=40, press=True)
json.dump(R, open('longball_grid.json', 'w'), indent=1)
