"""Classify every goal in the three forensic matches by terminal mechanism."""
import json, math, sys

def home(pid): return not pid.startswith('bre') and pid != 'igorthiago'

def analyze_seed(seed):
    tr = json.load(open(f'trace_90min.json' if seed == 789335328 else f'trace_90_{seed}.json'))
    cons = json.load(open(f'contacts_90_{seed}.json'))
    goals = []
    prev = [0, 0]
    for f in tr:
        if f['score'] != prev:
            team = 0 if f['score'][0] > prev[0] else 1
            goals.append((f['t'], team))
            prev = list(f['score'])
    out = []
    for gt, team in goals:
        win = [c for c in cons if gt - 6.0 <= c['t'] <= gt + 0.1]
        gcon = next((c for c in win if c['kind'] == 'GOAL'), None)
        last_pid = gcon['pid'] if gcon else (win[-1]['pid'] if win else None)
        shot = next((c for c in reversed(win) if c['kind'] == 'KICK:SHOT'), None)
        # scramble length: время ctrl None before the goal
        pre = [f for f in tr if gt - 25 <= f['t'] <= gt]
        scramble = 0.0
        for f in reversed(pre):
            if f['b'][4] is None: scramble += 0.1
            else: break
        # rest defense 8 s before goal: conceding team outfielders goal-side of ball
        f8 = min(pre, key=lambda f: abs(f['t'] - (gt - 8)))
        bx = f8['b'][0]
        gs = sum(1 for p in f8['p'] if (home(p[0]) if team == 1 else not home(p[0]))
                 and p[0] not in ('alisson', 'bre_gen_gk')
                 and ((p[1] < bx) if team == 1 else (p[1] > bx)))
        if shot is not None and gt - shot['t'] < 2.5:
            mech = 'SHOT'
            since = round(gt - shot['t'], 1)
        else:
            k = [c for c in win if c['kind'] not in ('GOAL',)][-3:]
            kk = [c['kind'] for c in k]
            if last_pid is not None and (home(last_pid) if team == 1 else not home(last_pid)):
                mech = 'OWN_TOUCH_LAST'
            elif any('GK_PARRY' in x for x in kk):
                mech = 'PARRY_IN'
            elif any(x in ('TOUCH_LOOSE', 'DEFLECT', 'TACKLE_WON', 'TACKLE_POKE') for x in kk):
                mech = 'POKE/DEFLECT_IN'
            else:
                mech = 'OTHER'
            since = None
        out.append({'seed': seed, 't_min': round(gt/60, 1), 'team': 'HOME' if team == 0 else 'AWAY',
                    'mech': mech, 'last_touch': last_pid, 'shot_dt': since,
                    'scramble_s': round(scramble, 1), 'gs_defenders_8s_before': gs,
                    'tail_contacts': [(c['kind'], c['pid']) for c in win[-4:]]})
    return out

if __name__ == '__main__':
    allg = []
    for seed in (789335328, 424242, 20260825):
        try:
            allg += analyze_seed(seed)
        except FileNotFoundError as e:
            print('missing', e)
    for g in allg:
        print(g)
    import collections
    print('\nby team+mech:', dict(collections.Counter((g['team'], g['mech']) for g in allg)))
    json.dump(allg, open('goal_forensic.json', 'w'), indent=1)
