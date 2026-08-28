"""13 deterministic long/loose-ball pursuit scenarios + attribute sweeps."""
import json, math, sys, collections
sys.path.insert(0, '.')
from hybrid import HybridLab, CAL12, khash
from body import dist, W, H, intercept_point, predict_traj
from passcal import SR, park_all, put

R = {}
def rep(name, detail, ok=None):
    R[name] = {'detail': detail, 'ok': ok}
    print(f"{'PASS' if ok else 'FAIL' if ok is False else 'obs '}  {name}: {detail}")

def fresh():
    L = HybridLab(SR, 789335328, cad=dict(CAL12))
    L.next_cadence = 1e9; L.next_pressure_ok = 1e9
    return L

def launch(L, fam, frm, to):
    b = L.body.ball
    b['x'], b['y'], b['z'] = frm[0], frm[1], 0.0
    b['vx'] = b['vy'] = b['vz'] = 0.0
    b['ctrl'] = None; b['last'] = 'curtisjones'; b['state'] = 'ROLLING'; b['estT'] = 0.0
    L.body.restart = None
    from body import FAM
    D = max(0.5, dist(frm[0], frm[1], to[0], to[1]))
    v0, vz = FAM[fam](D)
    b['vx'], b['vy'], b['vz'] = (to[0]-frm[0])/D*v0, (to[1]-frm[1])/D*v0, vz
    b['state'] = 'AIRBORNE' if vz > 0.4 else 'ROLLING'
    L.body.last_kick_t = L.body.t; L.body.last_kicker = 'curtisjones'

def race(L, a_pid, a_pos, b_pid, b_pos, fam, frm, to, secs=8.0, exp=None):
    park_all(L)
    put(L, a_pid, *a_pos); put(L, b_pid, *b_pos)
    launch(L, fam, frm, to)
    body, b = L.body, L.body.ball
    pred = intercept_point(body.players[a_pid], b)
    maxerr = 0.0; maxout = 0.0
    who = None; t0 = body.t
    while body.t < t0 + secs:
        L.act(); body.tick(khash)
        for pid in (a_pid, b_pid):
            p = body.players[pid]
            maxout = max(maxout, -p['x'], p['x']-W, -p['y'], p['y']-H)
        if b['ctrl'] is not None or b['held'] is not None:
            who = b['ctrl'] or b['held']; break
        if body.restart is not None:
            who = 'OUT'; break
    return {'pred': (round(pred[0],1), round(pred[1],1)), 'winner': who,
            'time': round(body.t - t0, 1), 'max_out_m': round(max(0, maxout), 2)}

def main():
    # 1-3 clean/under/overhit long balls: receiver 30m away, LOFT variants
    for name, to in (('1 clean long ball', (78, 34)), ('2 underhit long', (68, 34)),
                     ('3 overhit long', (92, 34))):
        L = fresh()
        r = race(L, 'mohamedsalah', (76, 30), 'bre_gen_lcb', (80, 38), 'LOFT', (45, 34), to)
        rep(name, f"{r}", r['max_out_m'] < 1.0 and r['winner'] not in (None,))
    # 4-5 bounce pursuits: high LOFT lands mid, bounces; chaser from behind
    L = fresh()
    r = race(L, 'codygakpo', (55, 20), 'bre_gen_rb', (70, 28), 'LOFT', (30, 24), (66, 24))
    rep('4 first-bounce pursuit', f"{r}", r['max_out_m'] < 1.0)
    L = fresh()
    r = race(L, 'codygakpo', (50, 20), 'bre_gen_rb', (75, 30), 'PUNT', (20, 24), (70, 24))
    rep('5 second-bounce pursuit', f"{r}", r['max_out_m'] < 1.0)
    # 6-8 arrival races (rolling DRIVEN into space between them)
    L = fresh()
    r = race(L, 'mohamedsalah', (70, 40), 'bre_gen_lcb', (62, 44), 'DRIVEN', (40, 42), (66, 42))
    rep('6 defender first', f"{r}", str(r['winner']).startswith('bre'))
    L = fresh()
    r = race(L, 'mohamedsalah', (62, 44), 'bre_gen_lcb', (70, 40), 'DRIVEN', (40, 42), (66, 42))
    rep('7 attacker first', f"{r}", r['winner'] == 'mohamedsalah')
    L = fresh()
    r = race(L, 'mohamedsalah', (66, 47), 'bre_gen_lcb', (66, 37), 'DRIVEN', (40, 42), (66, 42))
    rep('8 equal race', f"{r}", r['winner'] is not None)
    # 9 GK claim: through ball into box, GK sweeps
    L = fresh()
    park_all(L)
    put(L, 'bre_gen_st', 38, 44); put(L, 'alisson', 4, 34)   # runner OFF the lane
    launch(L, 'THROUGH', (42, 34), (10, 34))   # dies close to the keeper: HIS ball
    body, b = L.body, L.body.ball
    t0 = body.t; who = None
    while body.t < t0 + 6:
        L.act(); body.tick(khash)
        if b['held'] is not None or b['ctrl'] is not None:
            who = b['held'] or b['ctrl']; break
    rep('9 GK/sweeper claim', f"winner {who}", who == 'alisson')
    # 10 destined for touch, unreachable: nobody runs far out
    L = fresh()
    r = race(L, 'codygakpo', (60, 10), 'bre_gen_rb', (60, 20), 'DRIVEN', (55, 6), (75, -8))
    rep('10 out before reachable', f"{r}", r['winner'] == 'OUT' and r['max_out_m'] < 1.2)
    # 11 interceptable just before touch
    L = fresh()
    r = race(L, 'codygakpo', (66, 4.5), 'bre_gen_rb', (80, 20), 'SHORT', (55, 8), (70, 1.5))
    rep('11 cut before line', f"{r}", r['winner'] == 'codygakpo' and r['max_out_m'] < 1.0)
    # 12 deliberate near-touchline pass
    L = fresh()
    r = race(L, 'conorbradley', (70, 65), 'bre_gen_lb', (76, 58), 'SHORT', (58, 63), (72, 66))
    rep('12 touchline pass', f"{r}", r['winner'] is not None and r['max_out_m'] < 1.2)
    # 13 deflected mid-flight: retargeting follows the NEW authoritative path
    L = fresh()
    park_all(L)
    put(L, 'codygakpo', (60), 20); put(L, 'bre_gen_rb', 70, 30)
    launch(L, 'DRIVEN', (45, 24), (78, 24))
    body, b = L.body, L.body.ball
    t0 = body.t; deflected = False; who = None
    from body import intercept_point as ip
    pre = ip(body.players['codygakpo'], b)
    while body.t < t0 + 7:
        L.act(); body.tick(khash)
        if not deflected and body.t > t0 + 0.5:
            b['vx'], b['vy'] = b['vy']*0.8, b['vx']*0.8   # deflection: rotate path
            deflected = True
            post = ip(body.players['codygakpo'], b)
        if b['ctrl'] is not None: who = b['ctrl']; break
    moved = dist(pre[0], pre[1], post[0], post[1])
    rep('13 deflection retarget', f"target moved {moved:.1f}m after deflection, winner {who}", moved > 3.0)
    # sweeps: pace/accel monotone on the equal race
    wins = {}
    for vm in (6.6, 7.6, 8.6):
        c = 0
        for k in range(10):
            L = fresh()
            L.body.players['mohamedsalah']['vmax'] = vm
            r = race(L, 'mohamedsalah', (66, 47 + (k%3)*0.5), 'bre_gen_lcb', (66, 37), 'DRIVEN',
                     (40, 42), (66, 42))
            c += (r['winner'] == 'mohamedsalah')
        wins[vm] = c
    rep('sweep sprint→race wins', f"{wins}", wins[8.6] >= wins[6.6])
    json.dump(R, open('pursuit_scn_results.json', 'w'), indent=1)
    print('FAILURES:', [k for k, v in R.items() if v['ok'] is False] or 'none')

if __name__ == '__main__':
    main()
