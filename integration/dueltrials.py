"""§8 TAKE-ONS + §9 TACKLES: physical 1v1 duels vs cal11's duel distribution.

The brain declares only the ATTEMPT (TAKE_ON side/burst/knock, tackle lunge);
BEAT/PARTIAL/RETAIN/TACKLED/LOOSE emerge from bodies racing the knocked ball.
Calibration target: cal11's _execute_dribble softmax on the same mirrored 1v1
(FOUL renormalized out — no foul physics in the body; documented exception).
"""
import json, sys
sys.path.insert(0, '.')
from hybrid import HybridLab, khash
from lab import EX, EY, EL
from body import dist, clamp
from passcal import SR, SEED, park_all, put, reset_ball, mirror

CARRIER, DEFENDER = 'mohamedsalah', 'bre_gen_rcb'

def target_probs(L, carrier, defender):
    mirror(L, carrier)
    car, dfe = L.eng.states[carrier], L.eng.states[defender]
    pressure, _ = L.eng._pressure(car)
    g = L.eng._g_eff
    atk = 0.72*g(car,'dribbling') + 0.48*g(car,'agility') + 0.35*g(car,'ball_control') + 0.22*g(car,'acceleration') + 0.18*g(car,'balance')
    deff = 0.52*g(dfe,'defensive_awareness') + 0.40*g(dfe,'agility') + 0.60*g(dfe,'standing_tackle') + 0.18*g(dfe,'acceleration')
    exposure = clamp(car.ball_exposure, 0.0, 1.0)
    space = L.eng._space_ahead(car)
    cover = L.eng._defensive_support_near(car)
    logits = [0.20 + 0.95*atk - 0.72*deff + 0.28*space - 0.58*cover,
              0.45 + 0.48*atk - 0.32*deff + 0.10*space - 0.20*cover,
              0.35 + 0.30*g(car,'ball_control') - 0.22*pressure,
              0.18 + 0.78*deff - 0.63*atk + 0.65*exposure + 0.34*cover,
              -0.05 + 0.20*deff + 0.14*atk + 0.35*pressure + 0.28*cover]
    pr = EL.softmax(logits, temperature=L.eng.cal.dribble_temperature)  # FOUL excluded
    s = sum(pr)
    return {k: v/s for k, v in zip(['BEAT','PARTIAL','RETAIN','TACKLED','LOOSE'], pr)}

def duel_trial(L, carrier, defender):
    park_all(L)
    put(L, carrier, 50.0, 34.0)
    put(L, defender, 52.8, 34.15)
    reset_ball(L, carrier)
    L.cur_presser = defender
    L._challenge_next.pop(defender, None)
    body, b = L.body, L.body.ball
    car = L.eng.states[carrier]
    dfe = L.eng.states[defender]
    d = {'action': 'DRIBBLE', 'def_pid': defender,
         'dribbling': EL.effective_attribute(car.player, car, 'dribbling'),
         'acceleration': EL.effective_attribute(car.player, car, 'acceleration'),
         'agility': EL.effective_attribute(car.player, car, 'agility'),
         'def_agility': EL.effective_attribute(dfe.player, dfe, 'agility')}
    L.apply_decision(carrier, d)
    x0 = body.players[carrier]['x']
    end = body.t + 6.0
    next_sync = body.t
    while body.t < end:
        if body.t >= next_sync:            # match-faithful: cal11 targets at 1 Hz
            L.sync_targets()
            next_sync = body.t + 1.0
        L.act()
        body.tick(khash)
        cp, dp = body.players[carrier], body.players[defender]
        if b['held'] is not None:
            return 'TACKLED' if body.players[b['held']]['team'] != cp['team'] else 'LOOSE'
        if b['ctrl'] == carrier and body.intents.get(carrier) is None:
            if cp['x'] > dp['x'] + 0.5 and cp['x'] - x0 > 3.0: return 'BEAT'
            if cp['x'] - x0 > 1.0: return 'PARTIAL'
            return 'RETAIN'
        if b['ctrl'] is not None and body.players[b['ctrl']]['team'] != cp['team']:
            return 'TACKLED'
        if body.restart is not None:
            return 'LOOSE'
    if b['ctrl'] == carrier:
        cp, dp = body.players[carrier], body.players[defender]
        if cp['x'] > dp['x'] + 0.5 and cp['x'] - x0 > 3.0: return 'BEAT'
        return 'PARTIAL' if cp['x'] - x0 > 1.0 else 'RETAIN'
    return 'LOOSE'

def run_cell(L, tag, n=50, carrier=CARRIER, defender=DEFENDER):
    park_all(L); put(L, carrier, 50.0, 34.0); put(L, defender, 52.8, 34.15)
    reset_ball(L, carrier)
    tgt = target_probs(L, carrier, defender)
    outs = {}
    for _ in range(n):
        o = duel_trial(L, carrier, defender)
        outs[o] = outs.get(o, 0) + 1
    emp = {k: round(outs.get(k, 0)/n, 3) for k in ['BEAT','PARTIAL','RETAIN','TACKLED','LOOSE']}
    print(f"{tag:34s} emp BEAT {emp['BEAT']:.2f} PART {emp['PARTIAL']:.2f} RET {emp['RETAIN']:.2f} TKL {emp['TACKLED']:.2f} LSE {emp['LOOSE']:.2f}"
          f"  | tgt BEAT {tgt['BEAT']:.2f} TKL {tgt['TACKLED']:.2f}")
    return {'tag': tag, 'emp': emp, 'tgt': {k: round(v, 3) for k, v in tgt.items()}}

def main():
    L = HybridLab(SR, SEED)
    res = {'base': None, 'sweeps': {}}
    print('═══ §8/§9 BASE DUEL (salah vs gen rcb, n=80) ═══')
    res['base'] = run_cell(L, 'base salah-v-rcb', n=80)

    car_attr = L.eng.states[CARRIER].player.attributes
    dfe_attr = L.eng.states[DEFENDER].player.attributes

    print('\n═══ §13 DRIBBLING SWEEP (carrier dribbling 40/60/80/95) ═══')
    orig = car_attr['dribbling']
    rows = []
    for lvl in (40, 60, 80, 95):
        car_attr['dribbling'] = float(lvl)
        rows.append({'level': lvl, **run_cell(L, f'dribbling={lvl}')})
    car_attr['dribbling'] = orig
    res['sweeps']['dribbling'] = rows

    print('\n═══ §13 TACKLING SWEEP (defender standing_tackle 40/60/80/95) ═══')
    orig = dfe_attr.get('standing_tackle', 75.0); orig_x = L.exec_prof[DEFENDER]['standing_tackle']
    rows = []
    for lvl in (40, 60, 80, 95):
        dfe_attr['standing_tackle'] = float(lvl)
        L.exec_prof[DEFENDER]['standing_tackle'] = float(lvl)
        rows.append({'level': lvl, **run_cell(L, f'tackling={lvl}')})
    dfe_attr['standing_tackle'] = orig; L.exec_prof[DEFENDER]['standing_tackle'] = orig_x
    res['sweeps']['tackling'] = rows

    print('\n═══ §13 REACTIONS SWEEP (defender reactions 40/60/80/95) ═══')
    orig = dfe_attr.get('reactions', 70.0); orig_x = L.exec_prof[DEFENDER]['reactions']
    rows = []
    for lvl in (40, 60, 80, 95):
        dfe_attr['reactions'] = float(lvl)
        L.exec_prof[DEFENDER]['reactions'] = float(lvl)
        rows.append({'level': lvl, **run_cell(L, f'reactions={lvl}')})
    dfe_attr['reactions'] = orig; L.exec_prof[DEFENDER]['reactions'] = orig_x
    res['sweeps']['reactions'] = rows

    print('\n═══ §13 PACE SWEEP (carrier body vmax 6.5/7.5/8.5 vs def 7.5) ═══')
    cb, db = L.body.players[CARRIER], L.body.players[DEFENDER]
    oc, od = cb['vmax'], db['vmax']
    db['vmax'] = 7.5
    rows = []
    for vm in (6.5, 7.5, 8.5):
        cb['vmax'] = vm
        rows.append({'vmax': vm, **run_cell(L, f'pace={vm}')})
    cb['vmax'], db['vmax'] = oc, od
    res['sweeps']['pace'] = rows

    for name, key in (('dribbling', 'BEAT'), ('tackling', 'TACKLED'), ('reactions', 'TACKLED')):
        vals = [r['emp'][key] for r in res['sweeps'][name]]
        mono = all(vals[i] <= vals[i+1] + 0.10 for i in range(len(vals)-1))
        print(f"monotone {name}->{key} (±0.10): {mono}  {vals}")
        res['sweeps'][name + '_monotone'] = mono
    vals = [r['emp']['BEAT'] for r in res['sweeps']['pace']]
    print(f"monotone pace->BEAT (±0.10): {all(vals[i] <= vals[i+1] + 0.10 for i in range(2))}  {vals}")
    json.dump(res, open('duel_results.json', 'w'), indent=1)
    print('saved duel_results.json')

if __name__ == '__main__':
    main()
