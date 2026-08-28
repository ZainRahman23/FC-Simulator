"""§10 SHOOTING + §11 GK: physical shot execution vs cal11 xG as calibration target.

cal11's shot SELECTION stays frozen; here only EXECUTION is physical:
finishing/pressure → angular dispersion (production formula) drawn BEFORE the
strike; flight, GK reaction/positioning/commit/reach/handling, posts and the
goal line decide the result. xG is measured against outcomes, never rolled.
"""
import json, math, sys
sys.path.insert(0, '.')
from hybrid import HybridLab, khash
from lab import EL
from body import dist, clamp, W
from passcal import SR, SEED, park_all, put, reset_ball, mirror

SHOOTER = 'hugoekitike'          # finishing-forward profile
PRESSER = 'bre_gen_rcb'

def gk_pid(L): return L.gk_of[1]

def shot_trial(L, sx, sy, pressured):
    park_all(L)
    put(L, SHOOTER, sx, sy)
    gk = gk_pid(L)
    put(L, gk, W - 1.2, 34.0)
    if pressured:
        put(L, PRESSER, sx - 1.1, sy + 0.7)
    reset_ball(L, SHOOTER)
    mirror(L, SHOOTER)
    st = L.eng.states[SHOOTER]
    pressure, _ = L.eng._pressure(st)
    xg = L.eng._xg(st, pressure)
    fin = EL.effective_attribute(st.player, st, 'finishing')
    disp = max(0.25, 2.6 - 0.022 * fin + 1.2 * pressure)
    aim_off = L.rng.normal('cal.shot.aim') * disp
    L._gk_state.pop(gk, None)
    d = {'action': 'SHOOT', 'aim_off': aim_off}
    L.apply_decision(SHOOTER, d)
    body, b = L.body, L.body.ball
    score0 = body.score[0]
    end = body.t + 4.0
    outcome = None
    while body.t < end:
        L.act()
        body.tick(khash)
        if body.score[0] > score0:
            outcome = 'GOAL'; break
        if b['held'] is not None:
            outcome = 'HELD'; break
        if body.restart is not None:
            outcome = 'OUT'; break
        if b['ctrl'] is not None and b['ctrl'] != SHOOTER:
            outcome = 'CLAIMED'; break
    if outcome is None:
        outcome = 'LOOSE'
    return {'outcome': outcome, 'xg': round(xg, 3), 'disp': round(disp, 2),
            'aim_off': round(aim_off, 2), 'pressure': round(pressure, 3)}

def run_cell(L, tag, sx, sy, pressured, n=100):
    outs = [shot_trial(L, sx, sy, pressured) for _ in range(n)]
    conv = sum(1 for o in outs if o['outcome'] == 'GOAL') / n
    held = sum(1 for o in outs if o['outcome'] in ('HELD', 'CLAIMED')) / n
    out_ = sum(1 for o in outs if o['outcome'] == 'OUT') / n
    parries = sum(1 for e in L.gk_log if not e['held'])
    xg = outs[0]['xg']
    print(f"{tag:34s} conv {conv:5.2f}  xg {xg:5.2f}  err {conv-xg:+5.2f}  held {held:4.2f} out {out_:4.2f} disp {outs[0]['disp']:.2f}")
    return {'tag': tag, 'n': n, 'conv': round(conv, 3), 'xg': xg, 'err': round(conv - xg, 3),
            'held': round(held, 3), 'out': round(out_, 3), 'disp': outs[0]['disp']}

def main():
    L = HybridLab(SR, SEED)
    res = {'grid': [], 'fin_sweep': [], 'gk_reflex_sweep': [], 'gk_handling_sweep': []}

    print('═══ §10 SHOT GRID (conv vs cal11 xG, n=100/cell) ═══')
    for (dx, dy) in ((10, 0), (16, 0), (22, 0), (14, 7)):
        for prs in (False, True):
            sx, sy = W - dx, 34.0 + dy
            tag = f"d{dx:2d}{'+wide' if dy else '     '} {'PRS' if prs else 'fre'}"
            res['grid'].append(run_cell(L, tag, sx, sy, prs))

    sa = L.eng.states[SHOOTER].player.attributes
    print('\n═══ §13 FINISHING SWEEP (d=14 central, free, n=100) ═══')
    orig = sa['finishing']; orig_x = L.exec_prof[SHOOTER]['finishing']
    for lvl in (40, 60, 80, 95):
        sa['finishing'] = float(lvl); L.exec_prof[SHOOTER]['finishing'] = float(lvl)
        res['fin_sweep'].append({'level': lvl, **run_cell(L, f'finishing={lvl}', W - 14, 34.0, False)})
    sa['finishing'] = orig; L.exec_prof[SHOOTER]['finishing'] = orig_x

    ga = L.eng.states[gk_pid(L)].player.attributes
    gx = L.exec_prof[gk_pid(L)]
    print('\n═══ §13 GK REFLEX SWEEP (d=14 central, free, n=100) ═══')
    orig = ga.get('gk_reflexes', 60.0); orig_x = gx['gk_reflexes']
    for lvl in (40, 60, 80, 95):
        ga['gk_reflexes'] = float(lvl); gx['gk_reflexes'] = float(lvl)
        res['gk_reflex_sweep'].append({'level': lvl, **run_cell(L, f'gk_reflexes={lvl}', W - 14, 34.0, False)})
    ga['gk_reflexes'] = orig; gx['gk_reflexes'] = orig_x

    print('\n═══ §13 GK HANDLING SWEEP (d=14 central, free, n=100) ═══')
    orig = ga.get('gk_handling', 60.0); orig_x = gx['gk_handling']
    for lvl in (40, 60, 80, 95):
        ga['gk_handling'] = float(lvl); gx['gk_handling'] = float(lvl)
        res['gk_handling_sweep'].append({'level': lvl, **run_cell(L, f'gk_handling={lvl}', W - 14, 34.0, False)})
    ga['gk_handling'] = orig; gx['gk_handling'] = orig_x

    fs = [r['conv'] for r in res['fin_sweep']]
    rs = [r['conv'] for r in res['gk_reflex_sweep']]
    hs = [r['held'] for r in res['gk_handling_sweep']]
    print(f"\nmonotone finishing->conv up (±0.06): {all(fs[i] <= fs[i+1] + 0.06 for i in range(3))}  {fs}")
    print(f"monotone gk_reflexes->conv down (±0.06): {all(fs2 >= fs3 - 0.06 for fs2, fs3 in zip(rs, rs[1:]))}  {rs}")
    print(f"monotone gk_handling->held up (±0.06): {all(hs[i] <= hs[i+1] + 0.06 for i in range(3))}  {hs}")
    json.dump(res, open('shot_results.json', 'w'), indent=1)
    print('saved shot_results.json')

if __name__ == '__main__':
    main()
