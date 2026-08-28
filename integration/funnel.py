"""A. Attacking-quality forensic: possession funnel + shot-window lifetimes.

A physical WINDOW is a carrier-controlled interval in which cal11's own frozen
shot mathematics — evaluated on the mirrored state — says a genuine chance
exists (F6 geometry gate passes and xg_eff = xg·(1−p_block) ≥ XG_EFF_MIN).
We measure whether cal11 ever got to LOOK during each window (decision wake
inside it), what it chose, and why the window closed. Measurement only.
"""
import json, math, sys, collections
sys.path.insert(0, '.')
from hybrid import HybridLab, khash
from lab import EX, EY, EL
from body import dist, W

SR = '../simulator/validation/rforensic/mw08_start.json'
XG_EFF_MIN = 0.05
SAMPLE_EVERY = 10          # ticks (6 Hz sampling)

def relx_of(p):
    return EX(p['x']) if p['team'] == 0 else 100.0 - EX(p['x'])

def eval_shot_view(L, pid):
    """cal11's frozen shot view of the current physical instant (pure math)."""
    body, b = L.body, L.body.ball
    pos = {q['pid']: (EX(q['x']), EY(q['y'])) for q in body.players.values()}
    L.eng.body_sync(pos, (EX(b['x']), EY(b['y'])), pid)
    car = L.eng.states[pid]
    pressure, _ = L.eng._pressure(car)
    xg = L.eng._xg(car, pressure)
    p_blk = L.eng._shot_block_candidate(car)[1]
    d_goal = EL.distance_m(car.pos, EL.goal_center(car.team_id))
    ang = EL.shot_angle_radians(car.team_id, car.pos)
    r_max = 24.0 + 4.0 * max(-1.2, min(2.0, L.eng._g_eff(car, 'long_shots')))
    g_dist = max(0.0, min(1.0, 1.0 - (d_goal - r_max) / 6.0))
    g_ang = max(0.0, min(1.0, (ang - 0.055) / 0.050))
    gate = (g_dist * g_ang) >= 0.05
    return {'xg': xg, 'p_blk': p_blk, 'xg_eff': xg * (1.0 - p_blk), 'gate': gate,
            'd_goal': d_goal, 'pressure': pressure}

def run_funnel(seed, secs=2700.0, home_d=None, away_d=None, label=''):
    L = HybridLab(SR, seed)
    if home_d is not None or away_d is not None:
        from battery2 import apply_quality
        if home_d: apply_quality(L, 0, home_d)
        if away_d: apply_quality(L, 1, away_d)
    L.body.restart = {'kind': 'KICKOFF', 'team': 0, 'spot': (52.5, 34.0), 't': 0.0}
    body, b = L.body, L.body.ball
    team_of = {p['pid']: p['team'] for p in body.players.values()}

    windows = []            # closed window episodes
    cur = None              # open window {pid, t0, xg_eff_max, ...}
    funnel = {0: collections.Counter(), 1: collections.Counter()}
    poss_team, spell_hit = None, {}
    end = body.t + secs
    while body.t < end:
        L.run(1 / 60)
        if body.tick_n % SAMPLE_EVERY: continue
        ctrl = b['ctrl']
        if ctrl is None or body.restart is not None:
            if cur is not None:
                cur['close'] = 'lost_ball'; cur['t1'] = body.t; windows.append(cur); cur = None
            continue
        p = body.players[ctrl]; tm = p['team']
        if tm != poss_team:
            poss_team = tm
            funnel[tm]['possessions'] += 1
            spell_hit = {}
        rx = relx_of(p)
        for stage, thr in (('final_third', 66.0), ('box_approach', 78.0)):
            if rx >= thr and stage not in spell_hit:
                spell_hit[stage] = True
                funnel[tm][stage] += 1
        in_box = (p['x'] > W - 16.5 if tm == 0 else p['x'] < 16.5) and abs(p['y'] - 34) < 20.15
        if in_box and 'box_entry' not in spell_hit:
            spell_hit['box_entry'] = True
            funnel[tm]['box_entry'] += 1
            mates = sum(1 for q in body.players.values() if q['team'] == tm and q is not p
                        and ((q['x'] > W - 16.5) if tm == 0 else (q['x'] < 16.5)) and abs(q['y'] - 34) < 20.15)
            funnel[tm]['box_entry_supported'] += (mates >= 1)
        # window tracking (only worth evaluating in range)
        if rx >= 60.0:
            v = eval_shot_view(L, ctrl)
            open_now = v['gate'] and v['xg_eff'] >= XG_EFF_MIN
            if open_now and cur is None:
                cur = {'pid': ctrl, 'team': tm, 't0': body.t, 'xg_eff_max': v['xg_eff'],
                       'xg_max': v['xg'], 'd_goal': round(v['d_goal'], 1),
                       'press0': round(v['pressure'], 2)}
                funnel[tm]['windows'] += 1
            elif cur is not None:
                if ctrl != cur['pid'] or not open_now:
                    cur['close'] = 'window_shut' if ctrl == cur['pid'] else 'ball_moved_on'
                    cur['t1'] = body.t
                    windows.append(cur); cur = None
                    if open_now:
                        cur = {'pid': ctrl, 'team': tm, 't0': body.t, 'xg_eff_max': v['xg_eff'],
                               'xg_max': v['xg'], 'd_goal': round(v['d_goal'], 1),
                               'press0': round(v['pressure'], 2)}
                        funnel[tm]['windows'] += 1
                else:
                    cur['xg_eff_max'] = max(cur['xg_eff_max'], v['xg_eff'])
        elif cur is not None:
            cur['close'] = 'carried_out'; cur['t1'] = body.t; windows.append(cur); cur = None
    if cur is not None:
        cur['close'] = 'end'; cur['t1'] = body.t; windows.append(cur)

    # post: durations, evaluation coverage, outcomes
    decs = [(d['t'], d['pid'], d['action']) for d in L.decisions]
    shots = [(c['t'], c['pid']) for c in body.contacts if c['kind'] == 'KICK:SHOT']
    for w in windows:
        w['t1'] = w.get('t1', w['t0'])
        w['dur'] = round(w['t1'] - w['t0'], 2)
    stats = {'label': label, 'seed': seed, 'mins': round(body.t / 60, 1),
             'goals': list(body.score),
             'funnel_home': dict(funnel[0]), 'funnel_away': dict(funnel[1])}
    for tm in (0, 1):
        ws = [w for w in windows if w['team'] == tm]
        ev, shot_in = 0, 0
        for w in ws:
            t0, t1 = w['t0'], w.get('t1', w['t0'])
            if any(t0 - 0.05 <= t <= t1 + 0.25 and pid == w['pid'] for t, pid, a in decs):
                ev += 1
            if any(t0 - 0.05 <= t <= t1 + 0.6 and pid == w['pid'] for t, pid in shots):
                shot_in += 1
        key = 'home' if tm == 0 else 'away'
        stats[f'windows_{key}'] = {'n': len(ws), 'evaluated': ev, 'shot_taken': shot_in,
                                   'xg_eff_max_mean': round(sum(x['xg_eff_max'] for x in ws) / max(1, len(ws)), 3)}
    stats['shots'] = {'home': sum(1 for t, pid in shots if team_of[pid] == 0),
                      'away': sum(1 for t, pid in shots if team_of[pid] == 1)}
    return stats, windows, L

if __name__ == '__main__':
    st, ws, L = run_funnel(789335328, secs=1800.0, label='base')
    print(json.dumps(st, indent=1))
