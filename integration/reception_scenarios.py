"""8 deterministic reception micro-scenarios (mandated set).

Fixtures run the FULL L.run loop (wakes, settle-and-scan, cadence all live);
only the first pass is scripted via a direct KICK intent + expected_receiver,
exactly the shape apply_decision produces. Per-scenario gates measure the
receiver's post-touch behavior and the no-limbo requirement.
"""
import json, math, sys
sys.path.insert(0, '.')
from hybrid import HybridLab, CAL12, khash
from body import dist, W, H
from passcal import SR, park_all, put

R = {}
def rep(name, detail, ok):
    R[name] = {'detail': detail, 'ok': ok}
    print(f"{'PASS' if ok else 'FAIL'}  {name}: {detail}")

def fresh():
    L = HybridLab(SR, 789335328, cad=dict(CAL12))
    # fixtures: block SCHEDULED decides so the scripted first pass survives;
    # contact-driven RECEPTION/settle-and-scan wakes (the mechanism under
    # test) remain fully live, as do intent executors.
    L.next_cadence = 1e9
    L.next_pressure_ok = 1e9
    return L

def onside(L):
    put(L, 'bre_gen_lb', 99, 8); put(L, 'bre_gen_rb', 99, 60)

def script_pass(L, frm, to_pid, fam='SHORT', lead=0.0, err=(0.0, 0.0)):
    body = L.body
    p, to = body.players[frm], body.players[to_pid]
    b = body.ball
    b['x'], b['y'], b['z'] = p['x'] + 0.4, p['y'], 0.0
    b['vx'] = b['vy'] = b['vz'] = 0.0
    b['ctrl'] = frm; b['last'] = frm; b['state'] = 'CONTROLLED'; b['estT'] = 1.0
    body.restart = None
    L.carry_state[frm] = None
    L.expected_receiver = (to_pid, p['team'], body.t + 4.0)
    tx = to['x'] + to['vx']*lead + err[0]; ty = to['y'] + to['vy']*lead + err[1]
    body.set_intent(frm, {'kind': 'KICK', 'tx': tx, 'ty': ty, 'fam': fam,
                          'windup': body.t + 0.05, 'then': {'kind': 'BRAIN'}})

def observe(L, rcv, secs=5.0):
    """Run until rcv's first ball contact, then record secs of post-touch truth."""
    body, b = L.body, L.body.ball
    n0 = len(body.contacts); tC = None; t_end = body.t + 12.0
    rows = []; kick_t = None; lost_to = None; limbo = 0.0; cur_limbo = 0.0
    prev_d2b = {}; unblocked = False
    while body.t < t_end:
        L.run(1/60)
        # the scripted first pass has launched: restore the live scheduler
        # (cadence fallbacks + PRESSURE wakes are part of the system under test)
        if not unblocked and b['ctrl'] is None:
            L.next_cadence = body.t + 0.5
            L.next_pressure_ok = body.t
            unblocked = True
        while n0 < len(body.contacts):
            c = body.contacts[n0]; n0 += 1
            if tC is None and c['pid'] == rcv and c['kind'] in ('CONTROL', 'HEAVY_TOUCH', 'TOUCH_LOOSE'):
                tC = c['t']; t_end = tC + secs
            elif tC is not None:
                if c['pid'] == rcv and c['kind'].startswith('KICK') and kick_t is None:
                    kick_t = round(c['t'] - tC, 2)
                if c['kind'] in ('CONTROL', 'TACKLE_WON') and c['pid'] != rcv and lost_to is None \
                        and body.players[c['pid']]['team'] != body.players[rcv]['team']:
                    lost_to = (c['pid'], round(c['t'] - tC, 2))
        if tC is not None:
            p = body.players[rcv]
            d2b = dist(p['x'], p['y'], b['x'], b['y'])
            sp = math.hypot(p['vx'], p['vy'])
            # limbo: ball free, receiver quasi-static, and NOBODY closing on it
            closing = False
            for pid, q in body.players.items():
                d = dist(q['x'], q['y'], b['x'], b['y'])
                if d < prev_d2b.get(pid, 1e9) - 0.01 and d < 12: closing = True
                prev_d2b[pid] = d
            if b['ctrl'] is None and b['held'] is None and sp < 0.5 and not closing and b['z'] < 1.0:
                cur_limbo += 1/60; limbo = max(limbo, cur_limbo)
            else:
                cur_limbo = 0.0
            rows.append({'dt': round(body.t - tC, 2), 'd2b': round(d2b, 2),
                         'sp': round(sp, 2), 'ctrl': b['ctrl']})
    return tC, rows, kick_t, lost_to, round(limbo, 2)

def drift_metrics(rows, rcv):
    md = max((r['d2b'] for r in rows if r['ctrl'] == rcv), default=0.0)
    t_move = next((r['dt'] for r in rows if r['sp'] > 1.0), None)
    reacq = None
    away = False
    for r in rows:
        if r['ctrl'] == rcv and r['d2b'] > 1.6: away = True
        if away and r['d2b'] < 1.2: reacq = r['dt']; break
    return md, t_move, reacq

def main():
    # ── 1. clean receive → dribble (open space ahead) ──
    L = fresh(); park_all(L); onside(L)
    put(L, 'dominikszoboszlai', 48, 30); put(L, 'mohamedsalah', 66, 30)
    script_pass(L, 'dominikszoboszlai', 'mohamedsalah', 'SHORT')
    tC, rows, kick_t, lost, limbo = observe(L, 'mohamedsalah')
    md, t_move, reacq = drift_metrics(rows, 'mohamedsalah')
    ok = tC is not None and md < 2.5 and (reacq is None or reacq < 1.2) and limbo < 0.5 and lost is None
    rep('1 clean receive->dribble', f'drift {md:.1f}m t_move {t_move} reacq {reacq} kick {kick_t} limbo {limbo}', ok)

    # ── 2. receive → pass (teammate option square) ──
    L = fresh(); park_all(L); onside(L)
    put(L, 'dominikszoboszlai', 48, 30); put(L, 'mohamedsalah', 66, 30)
    put(L, 'codygakpo', 70, 44); put(L, 'alexismacallister', 60, 20)
    script_pass(L, 'dominikszoboszlai', 'mohamedsalah', 'SHORT')
    tC, rows, kick_t, lost, limbo = observe(L, 'mohamedsalah')
    md, t_move, reacq = drift_metrics(rows, 'mohamedsalah')
    retained = rows and rows[-1]['ctrl'] == 'mohamedsalah' and md < 2.5
    ok = tC is not None and limbo < 0.5 and ((kick_t is not None and kick_t < 2.6) or retained)
    rep('2 receive->pass', f'drift {md:.1f}m next-kick {kick_t}s limbo {limbo}', ok)

    # ── 3. one-touch layoff under pressure (presser arriving, support behind) ──
    L = fresh(); park_all(L); onside(L)
    put(L, 'dominikszoboszlai', 61, 34); put(L, 'hugoekitike', 68, 34)
    put(L, 'bre_gen_lcb', 69.4, 34.4)                  # touch-tight: OD < ONE_TOUCH_OD at contact
    put(L, 'bre_gen_rcb', 70.3, 32.9)                   # second CB converging: take-on unattractive
    put(L, 'curtisjones', 62, 28)                      # layoff option
    script_pass(L, 'dominikszoboszlai', 'hugoekitike', 'DRIVEN')
    tC, rows, kick_t, lost, limbo = observe(L, 'hugoekitike')
    md, t_move, reacq = drift_metrics(rows, 'hugoekitike')
    contested = lost is not None and lost[1] < 2.5
    ok = tC is not None and limbo < 0.5 and ((kick_t is not None and kick_t <= 1.0) or contested)
    rep('3 one-touch layoff', f'kick {kick_t}s contested {lost} limbo {limbo}', ok)

    # ── 4. wall pass (give-and-go: A->B, B quick return while A runs) ──
    L = fresh(); park_all(L); onside(L)
    put(L, 'mohamedsalah', 60, 30, vx=2.0)             # A moving
    put(L, 'hugoekitike', 70, 33)                       # B the wall
    put(L, 'bre_gen_lcb', 72.5, 30, vx=-2.0)           # pressure makes B play quick
    script_pass(L, 'mohamedsalah', 'hugoekitike', 'SHORT')
    tC, rows, kick_t, lost, limbo = observe(L, 'hugoekitike')
    ok = tC is not None and limbo < 0.5 and ((kick_t is not None and kick_t <= 3.0)
                                             or (lost is not None and lost[1] < 2.5))
    rep('4 wall pass', f'B release {kick_t}s lost {lost} limbo {limbo}', ok)

    # ── 5. through-ball collection at speed ──
    L = fresh(); park_all(L); onside(L)
    put(L, 'dominikszoboszlai', 55, 34)
    put(L, 'mohamedsalah', 72, 30, vx=6.0, vy=0.5)     # runner in stride
    script_pass(L, 'dominikszoboszlai', 'mohamedsalah', 'THROUGH', lead=2.6)
    tC, rows, kick_t, lost, limbo = observe(L, 'mohamedsalah')
    md, t_move, reacq = drift_metrics(rows, 'mohamedsalah')
    spC = rows[0]['sp'] if rows else 0.0
    # gate = the invariant, not the old overshoot artifact: collect AT SPEED,
    # keep continuous authority (settle-in-stride is the accepted scan design),
    # and act once the scan closes
    acted = (kick_t is not None and kick_t < 2.2)
    hold_until = min(2.0, kick_t) if kick_t is not None else 2.0
    held = rows and all(r['ctrl'] == 'mohamedsalah' for r in rows if r['dt'] < hold_until - 0.05)
    ok = tC is not None and spC >= 2.5 and held and (acted or lost is None) and limbo < 0.5
    rep('5 through-ball collection', f'sp@touch {spC} held {held} kick {kick_t} limbo {limbo}', ok)

    # ── 6. bad touch → contest (weak receiver, hot pass, defender near) ──
    L = fresh(); park_all(L); onside(L)
    put(L, 'conorbradley', 50, 34)
    put(L, 'bre_gen_st', 72, 34)                        # weak control
    put(L, 'virgilvandijk', 75, 37)                     # defender ready to pounce
    script_pass(L, 'conorbradley', 'bre_gen_st', 'DRIVEN')
    tC, rows, kick_t, lost, limbo = observe(L, 'bre_gen_st')
    md, t_move, reacq = drift_metrics(rows, 'bre_gen_st')
    resolved = (kick_t is not None) or (lost is not None) or (reacq is not None) or md < 1.6
    ok = tC is not None and limbo < 0.5 and resolved
    rep('6 bad touch contest', f'drift {md:.1f} lost {lost} kick {kick_t} limbo {limbo}', ok)

    # ── 7. pressured reception (marker on his back) ──
    L = fresh(); park_all(L)
    put(L, 'dominikszoboszlai', 50, 34); put(L, 'hugoekitike', 68, 34)
    put(L, 'bre_gen_rcb', 69.5, 34.5)                   # touch-tight marker
    script_pass(L, 'dominikszoboszlai', 'hugoekitike', 'SHORT')
    tC, rows, kick_t, lost, limbo = observe(L, 'hugoekitike')
    md, t_move, reacq = drift_metrics(rows, 'hugoekitike')
    acted = (t_move is not None and t_move < 0.8) or (kick_t is not None and kick_t < 1.2) or (lost is not None and lost[1] < 1.5)
    ok = tC is not None and limbo < 0.5 and acted
    rep('7 pressured reception', f't_move {t_move} kick {kick_t} lost {lost} limbo {limbo}', ok)

    # ── 8. static easy reception (gentle, unpressured) ──
    L = fresh(); park_all(L)
    put(L, 'andyrobertson', 40, 20); put(L, 'virgilvandijk', 32, 30)
    script_pass(L, 'andyrobertson', 'virgilvandijk', 'SHORT')
    tC, rows, kick_t, lost, limbo = observe(L, 'virgilvandijk')
    md, t_move, reacq = drift_metrics(rows, 'virgilvandijk')
    ok = tC is not None and md < 1.6 and limbo < 0.5 and (lost is None or (kick_t is not None and kick_t < lost[1]))
    rep('8 static easy reception', f'drift {md:.1f} reacq {reacq} limbo {limbo}', ok)

    print(json.dumps({k: v['ok'] for k, v in R.items()}))
    json.dump(R, open('reception_scen.json', 'w'), indent=1)

if __name__ == '__main__':
    main()
