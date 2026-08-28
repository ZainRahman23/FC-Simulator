"""§9 long-run distribution battery: final Hybrid-C vs native cal11.

3 seeds x 90 world-minutes (full metric list incl. fouls/offsides/corners/
box entries/box occupancy/BEAT windows/workload/energy distributions), plus
the §7 quality grid (weak/elite x weak/elite) at 900 s each.
"""
import json, math, sys, hashlib, collections
sys.path.insert(0, '.')
from hybrid import HybridLab, khash
from ecology import analyze, SR, SEED
from body import dist, W

TECH = ('ball_control', 'short_passing', 'long_passing', 'dribbling', 'composure', 'agility',
        'finishing', 'vision', 'standing_tackle', 'reactions')

def apply_quality(L, team, delta):
    tid = 'HOME' if team == 0 else 'AWAY'
    for st in L.eng._team_states(tid):
        a = st.player.attributes
        for k in TECH:
            if k in a: a[k] = max(30.0, min(99.0, a[k] + delta))
        xp = L.exec_prof[st.player.player_id]
        for k in xp:
            if not k.startswith('gk'):
                xp[k] = max(30.0, min(99.0, xp[k] + delta))

def full_match(seed, secs=5400.0, home_d=None, away_d=None):
    L = HybridLab(SR, seed)
    if home_d is not None: apply_quality(L, 0, home_d)
    if away_d is not None: apply_quality(L, 1, away_d)
    L.body.restart = {'kind': 'KICKOFF', 'team': 0, 'spot': (52.5, 34.0), 't': 0.0}
    L.run(secs)
    body = L.body
    team_of = {p['pid']: p['team'] for p in body.players.values()}
    mins = body.t / 60.0
    rep = analyze(L)
    kicks = [c for c in body.contacts if c['kind'].startswith('KICK:')]
    pass_k = [c for c in kicks if not any(f in c['kind'] for f in ('SHOT', 'CLEAR'))]
    ctrls = [(c['t'], team_of[c['pid']]) for c in body.contacts if c['kind'] in ('CONTROL', 'GK_CATCH')]
    comp = sum(1 for c in pass_k if (n := next((x for x in ctrls if x[0] > c['t']), None)) and n[1] == team_of[c['pid']])
    shots = [c for c in kicks if 'SHOT' in c['kind']]
    # shot geometry + box occupancy at shots
    sd, occ_shot, lone = [], [], 0
    ti = 0
    for c in shots:
        while ti + 1 < len(L.trace) and L.trace[ti + 1]['t'] <= c['t']: ti += 1
        tr = L.trace[min(ti, len(L.trace) - 1)]
        bx, by = tr['b'][0], tr['b'][1]
        att = team_of[c['pid']]
        gx = W if att == 0 else 0.0
        sd.append(round(math.hypot(gx - bx, 34.0 - by), 1))
        a = sum(1 for pr in tr['p'] if team_of[pr[0]] == att and
                ((pr[1] > W - 16.5) if att == 0 else (pr[1] < 16.5)) and abs(pr[2] - 34) < 20.15)
        d = sum(1 for pr in tr['p'] if team_of[pr[0]] != att and
                ((pr[1] > W - 16.5) if att == 0 else (pr[1] < 16.5)) and abs(pr[2] - 34) < 20.15)
        occ_shot.append((a, d))
        if a <= 1: lone += 1
    # box entries: controlled ball crossing into a box
    entries = 0
    prev_in = False
    for tr in L.trace:
        bx, ctrlp = tr['b'][0], tr['b'][4]
        if ctrlp is None: prev_in = False; continue
        att = team_of.get(ctrlp)
        inb = ((bx > W - 16.5) if att == 0 else (bx < 16.5)) and abs(tr['b'][1] - 34) < 20.15
        if inb and not prev_in: entries += 1
        prev_in = inb
    ev = collections.Counter(e['kind'] for e in L.match_events)
    shots_h = sum(1 for c in shots if team_of[c['pid']] == 0)
    cards = [e for e in L.match_events if e.get('card')]
    # counters conceded by HOME: away gains possession at x>60 and enters the
    # home box (controlled) within 12 s
    counters_vs_home = counter_goals_vs_home = 0
    gains = []
    lastteam = None
    for c in body.contacts:
        if c['kind'] not in ('CONTROL', 'GK_CATCH'): continue
        tm = team_of[c['pid']]
        if tm == 1 and lastteam == 0:
            gains.append(c['t'])
        lastteam = tm
    goal_ts = []
    prevs = [0, 0]
    for f in L.trace:
        if f['score'] != prevs:
            if f['score'][1] > prevs[1]: goal_ts.append(f['t'])
            prevs = list(f['score'])
    for gt0 in gains:
        tr0 = min(L.trace, key=lambda f: abs(f['t'] - gt0))
        if tr0['b'][0] > 60.0:
            entered = any(f['b'][0] < 16.5 and abs(f['b'][1]-34) < 20.15
                          for f in L.trace if gt0 <= f['t'] <= gt0 + 12.0)
            if entered:
                counters_vs_home += 1
                if any(gt0 <= g <= gt0 + 14.0 for g in goal_ts):
                    counter_goals_vs_home += 1
    restarts = collections.Counter(p['reason'] for p in body.placements)
    beats = [e for e in L.match_events if e['kind'] == 'BEAT']
    es = sorted(st.energy for st in L.eng.states.values() if st.active)
    dist_cov = collections.defaultdict(float); prev = {}
    for tr in L.trace:
        for pr in tr['p']:
            if pr[0] in prev:
                dist_cov[pr[0]] += math.hypot(pr[1] - prev[pr[0]][0], pr[2] - prev[pr[0]][1])
            prev[pr[0]] = (pr[1], pr[2])
    dpm = sorted(v / mins for v in dist_cov.values())
    takeons = sum(1 for d0 in L.decisions if d0['action'] == 'DRIBBLE')
    rep.update({
        'goals': list(body.score), 'shots': len(shots), 'shot_dist_mean': round(sum(sd)/max(1, len(sd)), 1),
        'passes_pm': round(len(pass_k)/mins, 2), 'completion': round(comp/max(1, len(pass_k)), 3),
        'fouls': ev.get('FOUL', 0), 'offsides': ev.get('OFFSIDE', 0), 'beats': len(beats),
        'beat_trec_mean': round(sum(e['t_rec'] for e in beats)/max(1, len(beats)), 1),
        'corners': restarts.get('CORNER', 0), 'throw_ins': restarts.get('THROW_IN', 0),
        'goal_kicks': restarts.get('GOAL_KICK', 0),
        'box_entries': entries, 'box_occ_at_shots': occ_shot, 'lone_striker_shots': lone,
        'takeons': takeons, 'tackle_attempts': len(L.tackle_log),
        'shots_home': shots_h, 'shots_away': len(shots) - shots_h,
        'cards': [(e['card'], e['by']) for e in cards],
        'counters_vs_home': counters_vs_home, 'counter_goals_vs_home': counter_goals_vs_home,
        'energy_min': round(es[0], 1), 'energy_mean': round(sum(es)/len(es), 1),
        'energy_p25': round(es[len(es)//4], 1),
        'dist_pm_median': round(dpm[len(dpm)//2], 1),
        'trace_hash': hashlib.sha256(json.dumps(L.trace).encode()).hexdigest()[:16],
        'violations': body.violations,
    })
    return rep, L

KEYS = ['goals', 'shots', 'shot_dist_mean', 'passes_pm', 'completion', 'flips_pm',
        'median_spell_s', 'reflip_within_3s', 'pingpong_player_PQP_3s', 'melee_alt_pm',
        'fouls', 'offsides', 'beats', 'corners', 'throw_ins', 'box_entries',
        'lone_striker_shots', 'takeons', 'tackle_attempts', 'goal_kicks', 'energy_min', 'energy_mean',
        'dist_pm_median', 'violations', 'trace_hash']

def main():
    out = {}
    for seed in (SEED, 424242, 20260825):
        rep, L = full_match(seed)
        out[f'match_{seed}'] = {k: rep.get(k) for k in KEYS}
        out[f'match_{seed}']['ball_time_share'] = rep['ball_time_share']
        out[f'match_{seed}']['cause_flips'] = rep['cause_flips']
        print(f'== 90min seed {seed}')
        for k in KEYS: print(f'   {k:24s} {rep.get(k)}')
        if seed == SEED:
            json.dump(L.trace, open('trace_90min.json', 'w'))
            json.dump(L.match_events, open('events_90min.json', 'w'))
            json.dump(L.decisions, open('decisions_90min.json', 'w'))
    print('== quality grid (900 s cells)')
    for lbl, hd, ad in (('weakVweak', -15, -15), ('eliteVweak', +10, -15),
                        ('weakVelite', -15, +10), ('eliteVelite', +10, +10)):
        rep, _ = full_match(SEED, secs=900.0, home_d=hd, away_d=ad)
        out[f'quality_{lbl}'] = {k: rep.get(k) for k in
                                 ('goals', 'shots', 'completion', 'flips_pm', 'median_spell_s',
                                  'beats', 'box_entries', 'clean_rate') }
        out[f'quality_{lbl}']['completion'] = rep['completion']
        print(lbl, out[f'quality_{lbl}'])
    json.dump(out, open('battery2_results.json', 'w'), indent=1)
    print('saved battery2_results.json')

if __name__ == '__main__':
    main()
