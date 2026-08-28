"""PHYSICAL POSSESSION ECOLOGY instrumentation.

Classifies EVERY ownership change (player-level control establishment) by its
physical origin, measures spell durations, immediate re-flip probability,
ping-pong sequences (A→B→A within short windows), ball-state occupancy
(CONTROLLED / ESTABLISHING / CONTESTED / UNCONTROLLED / DEAD), loose-ball
rates, melee alternations, and the full §11v11 distribution list.
Pure measurement — no behavior changes live here.
"""
import json, math, sys, collections
sys.path.insert(0, '.')
from hybrid import HybridLab, khash
from body import dist

SR = '../simulator/validation/rforensic/mw08_start.json'
SEED = 789335328

CATS = ['intended_pass_reception', 'bad_first_touch', 'interception', 'tackle_won',
        'partial_tackle_deflection', 'takeon_contact', 'shield_contact_loss',
        'uncontrolled_ricochet', 'loose_ball_race', 'gk_interaction',
        'restart_transition', 'adapter_artifact']

def classify_window(kind, window, kinds, last_pid, last_team, new_pid, new_team,
                    runaway_ts, restart_ts, last_t, t, decisions_by_t):
    """Physical origin of one control establishment, from the contact window."""
    if any(last_t < rt <= t for rt in restart_ts):
        return 'restart_transition'
    if kind == 'GK_CATCH' or any(k in ('GK_CATCH', 'GK_PARRY') for k in kinds):
        return 'gk_interaction'
    if any(k in ('TACKLE_WON',) for k in kinds):
        return 'tackle_won'
    if any(k in ('TACKLE_POKE', 'TACKLE_MISS') for k in kinds):
        return 'partial_tackle_deflection'
    if any(k == 'TAKEON_KNOCK' for k in kinds):
        return 'takeon_contact'
    pass_kick = next((c for c in reversed(window) if c['kind'].startswith('KICK:')
                      and 'SHOT' not in c['kind'] and 'CLEAR' not in c['kind']), None)
    if pass_kick is not None:
        kicker_team = pass_kick['_team']
        after = [c for c in window if c['t'] > pass_kick['t']]
        if new_team == kicker_team:
            if any(c['kind'] in ('HEAVY_TOUCH', 'TOUCH_LOOSE', 'DEFLECT') for c in after):
                return 'bad_first_touch'          # own team recovered its own bad touch
            return 'intended_pass_reception'
        # opponent ends with it
        own_bad = [c for c in after if c['kind'] in ('HEAVY_TOUCH', 'TOUCH_LOOSE')
                   and c['_team'] == kicker_team]
        opp_touch = [c for c in after if c['_team'] == new_team
                     and c['kind'] in ('TOUCH_LOOSE', 'DEFLECT', 'HEAVY_TOUCH')]
        if own_bad and (not opp_touch or own_bad[0]['t'] < opp_touch[0]['t']):
            return 'bad_first_touch'
        return 'interception'
    if any(c['kind'] in ('DEFLECT', 'BOUNCE') for c in window) and \
       sum(1 for c in window if c['kind'] in ('DEFLECT', 'BOUNCE', 'TOUCH_LOOSE')) >= 2:
        return 'uncontrolled_ricochet'
    if any(last_t < rt <= t for rt in runaway_ts):
        return 'adapter_artifact'                 # carry runaway = controller artifact
    if 'DRIBBLE_TOUCH' in kinds and new_team != last_team:
        # carrier lost a dribble touch to contact/shield pressure
        return 'shield_contact_loss'
    if kinds and all(k in ('TOUCH_LOOSE', 'DEFLECT') for k in kinds):
        return 'uncontrolled_ricochet'
    if t - last_t > 1.2 and not kinds:
        return 'loose_ball_race'
    if not kinds:
        return 'loose_ball_race' if t - last_t > 0.6 else 'adapter_artifact'
    return 'loose_ball_race'

def analyze(L):
    body = L.body
    team_of = {p['pid']: p['team'] for p in body.players.values()}
    contacts = []
    for c in body.contacts:
        c2 = dict(c); c2['_team'] = team_of.get(c['pid'])
        contacts.append(c2)
    runaway_ts = [e['t'] for e in body.events if e['kind'] == 'LOOSE_BALL' and e['note'] == 'ran away']
    restart_ts = [p['t'] for p in body.placements]

    # ── ownership timeline: every control establishment ──
    estabs = []            # (t, pid, team, kind)
    for c in contacts:
        if c['kind'] in ('CONTROL', 'GK_CATCH'):
            estabs.append((c['t'], c['pid'], c['_team'], c['kind']))
    owner_changes = []     # player-level ownership changes with cause
    last = None
    for i, (t, pid, team, kind) in enumerate(estabs):
        if last is not None and pid != last[1]:
            lt = last[0]
            window = [c for c in contacts if lt < c['t'] <= t]
            kinds = [c['kind'] for c in window
                     if c['kind'] not in ('CONTROL', 'GK_CATCH')]
            cause = classify_window(kind, window, kinds, last[1], last[2], pid, team,
                                    runaway_ts, restart_ts, lt, t, None)
            owner_changes.append({'t': t, 'from': last[1], 'to': pid,
                                  'flip': team != last[2], 'cause': cause,
                                  'gap': round(t - lt, 2)})
        last = (t, pid, team, kind)

    flips = [o for o in owner_changes if o['flip']]
    cause_all = collections.Counter(o['cause'] for o in owner_changes)
    cause_flip = collections.Counter(o['cause'] for o in flips)

    # ── spells, re-flip, ping-pong ──
    spells = []
    cur_team, t0 = None, None
    flip_ts = []
    for t, pid, team, kind in estabs:
        if cur_team is None: cur_team, t0 = team, t
        elif team != cur_team:
            spells.append(t - t0); flip_ts.append(t); cur_team, t0 = team, t
    reflip3 = sum(1 for a, b in zip(flip_ts, flip_ts[1:]) if b - a < 3.0) / max(1, len(flip_ts) - 1)
    # ping-pong: team A→B→A within 4 s / player P→Q→P within 3 s
    seqT = [(t, team) for t, _, team, _ in estabs]
    ppT = sum(1 for i in range(2, len(seqT))
              if seqT[i][1] == seqT[i-2][1] != seqT[i-1][1] and seqT[i][0] - seqT[i-2][0] < 4.0)
    seqP = [(t, pid) for t, pid, _, _ in estabs]
    ppP = sum(1 for i in range(2, len(seqP))
              if seqP[i][1] == seqP[i-2][1] != seqP[i-1][1] and seqP[i][0] - seqP[i-2][0] < 3.0)

    # ── ball-state occupancy from the 0.1 s trace ──
    occ = collections.Counter()
    est_until = getattr(L, 'est_log', None)
    for i, tr in enumerate(L.trace):
        b = tr['b']
        if tr['restart'] is not None or b[3] == 'DEAD':
            occ['DEAD'] += 1; continue
        if b[4] is not None:
            occ['CONTROLLED'] += 1; continue
        near0 = near1 = 0
        for pr in tr['p']:
            d = math.hypot(pr[1] - b[0], pr[2] - b[1])
            if d < 1.5:
                if team_of[pr[0]] == 0: near0 += 1
                else: near1 += 1
        if near0 and near1: occ['CONTESTED'] += 1
        elif abs(b[2]) > 0.15 or (i > 0 and math.hypot(b[0]-L.trace[i-1]['b'][0],
                                                        b[1]-L.trace[i-1]['b'][1]) > 0.55):
            occ['IN_FLIGHT'] += 1          # airborne or travelling > ~5.5 m/s: a kicked ball
        else: occ['LOOSE'] += 1
    tot = max(1, sum(occ.values()))

    # ── melee + loose rates ──
    melee = 0
    cs = [c for c in contacts if not c['kind'].startswith('KICK')]
    for a, b_ in zip(cs, cs[1:]):
        if b_['t'] - a['t'] < 0.5 and a['pid'] and b_['pid'] and a['_team'] != b_['_team']:
            melee += 1
    loose_ev = sum(1 for e in body.events if e['kind'] == 'LOOSE_BALL')
    mins = body.t / 60.0
    sp = sorted(spells)

    return {
        'world_min': round(mins, 1),
        'owner_changes_pm': round(len(owner_changes) / mins, 2),
        'flips_pm': round(len(flips) / mins, 2),
        'cause_all': dict(cause_all), 'cause_flips': dict(cause_flip),
        'median_spell_s': round(sp[len(sp)//2], 2) if sp else 0,
        'mean_spell_s': round(sum(sp)/max(1, len(sp)), 2),
        'spell_p25_p75_p90': [round(sp[int(len(sp)*q)], 2) for q in (0.25, 0.75, 0.9)] if sp else [],
        'spells_over_10s': sum(1 for s in sp if s > 10.0),
        'reflip_within_3s': round(reflip3, 3),
        'pingpong_team_ABA_4s': ppT, 'pingpong_player_PQP_3s': ppP,
        'ball_time_share': {k: round(v/tot, 3) for k, v in occ.items()},
        'loose_events_pm': round(loose_ev / mins, 2),
        'melee_alt_pm': round(melee / mins, 2),
    }

def run_baseline(seed=SEED, secs=1800.0, label='baseline'):
    L = HybridLab(SR, seed)
    L.body.restart = {'kind': 'KICKOFF', 'team': 0, 'spot': (52.5, 34.0), 't': 0.0}
    L.run(secs)
    rep = analyze(L)
    rep['label'] = label
    rep['trace_hash'] = __import__('hashlib').sha256(json.dumps(L.trace).encode()).hexdigest()[:16]
    return rep, L

if __name__ == '__main__':
    rep, L = run_baseline()
    print(json.dumps(rep, indent=1))
    json.dump(rep, open('ecology_baseline.json', 'w'), indent=1)
