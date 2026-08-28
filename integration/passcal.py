"""§6 PASS MATRIX + §12 PASS CALIBRATION GRID + §13 passing attribute sweep.

Controlled trials of the HYBRID pass pipeline:
  cal11 family/geometry (mirrored _pass_type/_pressure) →
  production sigma_m = max(0.20, 2.15 - 0.017*skill + 0.024*d + 1.10*pressure) →
  keyed error draw BEFORE the kick → physical flight → physical reception
  (touch_model) / physical interception races.

Calibration target per cell: cal11's own pass_execution_probability on the
SAME mirrored geometry — the probability philosophy the physics must
reproduce, never a hidden roll.
"""
import json, math, sys
sys.path.insert(0, '.')
from hybrid import HybridLab, khash
from lab import EX, EY, EL
from body import dist, clamp, chase_point

SR = '../simulator/validation/rforensic/mw08_start.json'
SEED = 789335328

PASSER_ELITE, PASSER_WEAK = 'dominikszoboszlai', 'ibrahimakonate'
PASSER_TIERS = ['ibrahimakonate', 'andyrobertson', 'alexismacallister', 'dominikszoboszlai']  # 66/77/82/90
RECEIVER = 'codygakpo'          # fixed reception skill across all cells (bc 85)
PRESSER, CONTESTER = 'bre_gen_rcb', 'bre_gen_lcb'

def build():
    L = HybridLab(SR, SEED)
    return L

def park_all(L):
    for i, pid in enumerate(sorted(L.body.players)):
        p = L.body.players[pid]
        p['x'] = 3.0 + (i % 11) * 1.6
        p['y'] = 1.5 if p['team'] == 0 else 66.5
        if p['gk']: p['x'], p['y'] = (1.5, 8.0) if p['team'] == 0 else (103.5, 60.0)
        p['vx'] = p['vy'] = 0.0
        p['stun'] = p['burst'] = p['touchT'] = 0.0
        L.body.intents[pid] = None

def put(L, pid, x, y, vx=0.0, vy=0.0):
    p = L.body.players[pid]
    p['x'], p['y'], p['vx'], p['vy'] = x, y, vx, vy
    return p

def reset_ball(L, pid):
    p = L.body.players[pid]
    b = L.body.ball
    b['x'], b['y'], b['z'] = p['x'] + 0.5, p['y'], 0.0
    b['vx'] = b['vy'] = b['vz'] = 0.0
    b['ctrl'] = pid; b['last'] = pid; b['held'] = None
    b['exclPid'] = None; b['exclT'] = 0.0; b['state'] = 'ROLLING'
    L.body.restart = None

def mirror(L, carrier_pid):
    pos = {p['pid']: (EX(p['x']), EY(p['y'])) for p in L.body.players.values()}
    L.eng.body_sync(pos, (EX(L.body.ball['x']), EY(L.body.ball['y'])), carrier_pid)

def sigma_and_family(L, passer, receiver):
    car, tgt = L.eng.states[passer], L.eng.states[receiver]
    pressure, _ = L.eng._pressure(car)
    ptype = L.eng._pass_type(car, tgt)
    d_eng = EL.distance_m(car.pos, tgt.pos)
    attr = 'long_passing' if ptype in ('LONG', 'CROSS', 'THROUGH') else 'short_passing'
    skill = EL.effective_attribute(car.player, car, attr)
    sigma = max(0.20, 2.15 - 0.017 * skill + 0.024 * d_eng + 1.10 * pressure)
    p_target = L.eng.pass_execution_probability(car, tgt, pressure)
    return sigma, ptype, pressure, skill, p_target

FAM_MAP = {'SHORT': 'SHORT', 'PROGRESSIVE': 'DRIVEN', 'LONG': 'LOFT',
           'THROUGH': 'THROUGH', 'CROSS': 'CROSS', 'CUTBACK': 'CUTBACK'}

def one_trial(L, k, passer, receiver, dlen, pressured, moving, contested):
    park_all(L)
    px, py = 38.0, 34.0
    put(L, passer, px, py)
    rvx = 3.5 if moving else 0.0
    put(L, receiver, px + dlen, py, vx=0.0, vy=0.0)
    chase = []
    if pressured:
        put(L, PRESSER, px - 1.2, py + 0.8)
        chase.append(PRESSER)
    if contested:
        put(L, CONTESTER, px + dlen + 1.8, py + 0.6)
        chase.append(CONTESTER)
    reset_ball(L, passer)
    mirror(L, passer)
    sigma, ptype, pressure, skill, p_target = sigma_and_family(L, passer, receiver)
    err_lat = L.rng.normal('cal.pass.lat', k) * sigma
    err_lon = L.rng.normal('cal.pass.lon', k) * sigma * 0.7
    body, b = L.body, L.body.ball
    lead = clamp(dlen / 16, 0.2, 1.1)
    tx = px + dlen + rvx * lead + err_lon      # along-lane error = longitudinal
    ty = py + err_lat                           # cross-lane error = lateral
    fam = FAM_MAP.get(ptype, 'SHORT')
    if fam == 'LOFT' and dist(px, py, tx, ty) < 20: fam = 'DRIVEN'
    body.set_intent(passer, {'kind': 'KICK', 'tx': tx, 'ty': ty, 'fam': fam,
                             'windup': body.t + 0.28})
    kicked = False
    end = body.t + 8.0
    first_ctrl = None
    while body.t < end:
        p = body.players[passer]
        it = body.intents.get(passer)
        if it is not None and it.get('kind') == 'KICK':
            body.locomote(p, b['x'], b['y'], 1.8)
            if body.t >= it['windup'] and dist(p['x'], p['y'], b['x'], b['y']) < 1.0:
                body.kick(passer, it['tx'], it['ty'], it['fam'])
                body.intents[passer] = None
                kicked = True
        r = body.players[receiver]
        if not kicked and moving:
            body.locomote(r, r['x'] + 10, r['y'], 3.5)
        elif kicked and b['ctrl'] is None:
            cx, cy = chase_point(r, b)
            body.locomote(r, cx, cy, r['vmax'])
        else:
            body.locomote(r, r['x'], r['y'], 0.0)
        for cpid in chase:
            cp = body.players[cpid]
            if kicked and b['ctrl'] is None:
                cx, cy = chase_point(cp, b)
                body.locomote(cp, cx, cy, cp['vmax'])
            elif not kicked and cpid == PRESSER:
                body.locomote(cp, b['x'], b['y'], cp['vmax'] * 0.8)
            else:
                body.locomote(cp, cp['x'], cp['y'], 0.0)
        body.tick(khash)
        if kicked:
            if b['held'] is not None:
                first_ctrl = b['held']; break
            if b['ctrl'] is not None and b['ctrl'] != passer:
                first_ctrl = b['ctrl']; break
            if body.restart is not None:
                break
    if first_ctrl is None:
        outcome = 'OUT' if body.restart is not None else 'DEAD'
    elif first_ctrl == receiver:
        outcome = 'COMPLETE'
    elif body.players[first_ctrl]['team'] == body.players[passer]['team']:
        outcome = 'TEAM'
    else:
        outcome = 'INTERCEPTED'
    return {'outcome': outcome, 'sigma': round(sigma, 2), 'ptype': ptype,
            'pressure': round(pressure, 3), 'skill': skill, 'p_target': round(p_target, 3)}

def run_cell(L, tag, passer, dlen, pressured, moving, contested, n):
    outs = []
    for k in range(n):
        outs.append(one_trial(L, k, passer, RECEIVER, dlen, pressured, moving, contested))
    comp = sum(1 for o in outs if o['outcome'] in ('COMPLETE', 'TEAM')) / n
    itc = sum(1 for o in outs if o['outcome'] == 'INTERCEPTED') / n
    out_ = sum(1 for o in outs if o['outcome'] in ('OUT', 'DEAD')) / n
    return {'tag': tag, 'n': n, 'complete': round(comp, 3), 'intercepted': round(itc, 3),
            'dead_out': round(out_, 3), 'p_target': outs[0]['p_target'],
            'sigma': outs[0]['sigma'], 'ptype': outs[0]['ptype'], 'pressure': outs[0]['pressure'],
            'skill': outs[0]['skill'], 'err': round(comp - outs[0]['p_target'], 3)}

def main():
    L = build()
    res = {'matrix': [], 'grid': [], 'sweep': []}

    # ═══ §6 pass matrix: 2 passers × free/pressured × short/long × stat/moving × open/contested ═══
    print('═══ §6 PASS MATRIX (n=30/cell) ═══')
    print(f"{'cell':52s} {'emp':>6s} {'tgt':>6s} {'err':>6s} {'int':>5s} {'out':>5s} {'fam':>11s}")
    for passer in (PASSER_ELITE, PASSER_WEAK):
        for dlen in (12, 26):
            for pressured in (False, True):
                for moving in (False, True):
                    for contested in (False, True):
                        tag = f"{passer[:12]:12s} d{dlen} {'PRS' if pressured else 'fre'} {'MOV' if moving else 'sta'} {'CON' if contested else 'opn'}"
                        c = run_cell(L, tag, passer, dlen, pressured, moving, contested, 30)
                        res['matrix'].append(c)
                        print(f"{tag:52s} {c['complete']:6.2f} {c['p_target']:6.2f} {c['err']:+6.2f} {c['intercepted']:5.2f} {c['dead_out']:5.2f} {c['ptype']:>11s}")

    # ═══ §12 calibration grid: distance × pressure × real skill tier ═══
    print('\n═══ §12 CALIBRATION GRID (n=40/cell, stationary open receiver) ═══')
    print(f"{'cell':40s} {'emp':>6s} {'tgt':>6s} {'err':>6s} {'sigma':>6s}")
    for passer in PASSER_TIERS:
        for dlen in (8, 16, 24, 32):
            for prs in (False, True):
                tag = f"{passer[:14]:14s} d{dlen:2d} {'PRS' if prs else 'fre'}"
                c = run_cell(L, tag, passer, dlen, prs, False, False, 40)
                res['grid'].append(c)
                print(f"{tag:40s} {c['complete']:6.2f} {c['p_target']:6.2f} {c['err']:+6.2f} {c['sigma']:6.2f}")

    # ═══ §13 attribute sweep: synthetic passing 40/60/80/95 on one body ═══
    print('\n═══ §13 PASSING SWEEP (szoboszlai body, synthetic skill, n=40) ═══')
    car = L.eng.states[PASSER_ELITE]
    orig_sp = car.player.attributes.get('short_passing')
    orig_lp = car.player.attributes.get('long_passing')
    for lvl in (40, 60, 80, 95):
        car.player.attributes['short_passing'] = float(lvl)
        car.player.attributes['long_passing'] = float(lvl)
        row = {'level': lvl}
        for dlen in (12, 26):
            c = run_cell(L, f'sweep{lvl}d{dlen}', PASSER_ELITE, dlen, False, False, False, 40)
            row[f'd{dlen}_emp'] = c['complete']; row[f'd{dlen}_tgt'] = c['p_target']
        res['sweep'].append(row)
        print(f"passing={lvl:3d}  d12 emp {row['d12_emp']:.2f} tgt {row['d12_tgt']:.2f}   d26 emp {row['d26_emp']:.2f} tgt {row['d26_tgt']:.2f}")
    car.player.attributes['short_passing'] = orig_sp
    car.player.attributes['long_passing'] = orig_lp

    mono = all(res['sweep'][i]['d12_emp'] <= res['sweep'][i+1]['d12_emp'] + 0.08 for i in range(3))
    mono_l = all(res['sweep'][i]['d26_emp'] <= res['sweep'][i+1]['d26_emp'] + 0.08 for i in range(3))
    print(f"\nmonotonic (±0.08 tolerance): short {mono}, long {mono_l}")
    res['monotonic'] = {'short': mono, 'long': mono_l}
    json.dump(res, open('passcal_results.json', 'w'), indent=1)
    print('saved passcal_results.json')

if __name__ == '__main__':
    main()
