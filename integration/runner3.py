"""§17 THREE-WAY 11v11: NATIVE cal11 vs BRAIN-STEERED CFR vs HYBRID-EMERGENT CFR.

Matched seed. NATIVE metrics come from the frozen engine's own 90-minute
result; CFR modes run RUN_S seconds of continuous world and are normalized
per active-play minute. Also: §14 churn decomposition, §16 wake measurement,
determinism (same-seed trace hash) and chunk-independence for the hybrid mode.
"""
import json, math, sys, hashlib, collections
sys.path.insert(0, '.')
from hybrid import HybridLab, khash
from lab import EL
import bridge
from body import dist

SR = '../simulator/validation/rforensic/mw08_start.json'
SEED = 789335328
RUN_S = 1800.0

def native_metrics(seed):
    sr = json.load(open(SR))
    eng = EL.MatchEngine(bridge.build_team(sr['home_team'], 'HOME'),
                         bridge.build_team(sr['away_team'], 'AWAY'),
                         bridge.ATTRIBUTE_STATS, seed,
                         bridge.build_config(sr.get('config'), sr.get('coach_ai')))
    res = eng.run()
    ev = res.events
    mins = res.active_play_seconds / 60.0
    passes = [e for e in ev if e.event_type == 'PASS']
    comp = sum(1 for e in passes if (e.detail or {}).get('outcome') == 'COMPLETED')
    dribbles = [e for e in ev if e.event_type == 'DRIBBLE']
    dout = collections.Counter((e.detail or {}).get('outcome') for e in dribbles)
    shots = [e for e in ev if e.event_type == 'SHOT']
    xg = sum((e.detail or {}).get('xg', 0.0) for e in shots)
    poss = sum(1 for e in ev if e.event_type == 'POSSESSION_CHANGE')
    return {
        'mode': 'NATIVE', 'minutes': round(mins, 1),
        'goals': res.home_score + res.away_score,
        'passes_pm': round(len(passes)/mins, 2), 'completion': round(comp/max(1, len(passes)), 3),
        'poss_changes_pm': round(poss/mins, 2),
        'shots_pm': round(len(shots)/mins, 2), 'xg_total': round(xg, 2),
        'goals_per_shot': round((res.home_score+res.away_score)/max(1, len(shots)), 3),
        'dribbles_pm': round(len(dribbles)/mins, 2),
        'dribble_beat_rate': round((dout.get('BEAT', 0))/max(1, len(dribbles)), 3),
        'tackles_pm': round(sum(1 for e in ev if e.event_type == 'TACKLE')/mins, 2),
    }

def churn_decompose(L):
    """Classify each possession flip by its physical cause (contact+event history)."""
    causes = collections.Counter()
    contacts = L.body.contacts
    team_of = {p['pid']: p['team'] for p in L.body.players.values()}
    runaways = [e['t'] for e in L.body.events if e['kind'] == 'LOOSE_BALL' and e['note'] == 'ran away']
    last_team, last_t = None, -9.0
    for c0 in contacts:
        t, pid, kind = c0['t'], c0['pid'], c0['kind']
        if kind not in ('CONTROL', 'GK_CATCH'): continue
        team = team_of[pid]
        if last_team is not None and team != last_team:
            window = [c for c in contacts if last_t < c['t'] <= t]
            kinds = [c['kind'] for c in window]
            if any(k in ('TACKLE_WON', 'TACKLE_POKE') for k in kinds):
                causes['tackle'] += 1
            elif kind == 'GK_CATCH' or any(k in ('GK_CATCH', 'GK_PARRY') for k in kinds):
                causes['gk_claim'] += 1
            elif any(k.startswith('KICK:CLEAR') for k in kinds):
                causes['clearance'] += 1
            elif any(k == 'TAKEON_KNOCK' for k in kinds):
                causes['takeon_lost'] += 1
            elif any(k in ('HEAVY_TOUCH', 'TOUCH_LOOSE') and team_of.get(c['pid']) == last_team
                     for k, c in zip(kinds, window)):
                causes['failed_reception'] += 1
            elif any(k in ('TOUCH_LOOSE', 'DEFLECT') and team_of.get(c['pid']) == team
                     for k, c in zip(kinds, window)):
                causes['interception'] += 1
            elif any(k.startswith('KICK:') for k in kinds):
                causes['bad_launch'] += 1
            elif any(last_t < rt <= t for rt in runaways) or 'DRIBBLE_TOUCH' in kinds:
                causes['carry_lost'] += 1
            else:
                causes['uncontested_pickup'] += 1
        last_team, last_t = team, t
    return dict(causes)

def spell_stats(L):
    """Possession spell lengths + melee (pinball) indicator from contacts."""
    team_of = {p['pid']: p['team'] for p in L.body.players.values()}
    spells, cur_team, t0 = [], None, None
    for c in L.body.contacts:
        if c['kind'] not in ('CONTROL', 'GK_CATCH'): continue
        team = team_of[c['pid']]
        if cur_team is None:
            cur_team, t0 = team, c['t']
        elif team != cur_team:
            spells.append(c['t'] - t0); cur_team, t0 = team, c['t']
    melee = 0
    cs = [c for c in L.body.contacts if not c['kind'].startswith('KICK')]
    for a, b_ in zip(cs, cs[1:]):
        if b_['t'] - a['t'] < 0.5 and a['pid'] and b_['pid'] and \
           team_of.get(a['pid']) != team_of.get(b_['pid']):
            melee += 1
    return spells, melee

def cfr_metrics(mode, seed, run_s=RUN_S, chunks=1):
    L = HybridLab(SR, seed, steered=(mode == 'STEERED'))
    L.body.restart = {'kind': 'KICKOFF', 'team': 0, 'spot': (52.5, 34.0), 't': 0.0}
    for _ in range(chunks):
        L.run(run_s / chunks)
    body = L.body
    open_t = sum(1 for tr in L.trace if tr['restart'] is None)
    mins = (open_t / max(1, len(L.trace))) * body.t / 60.0
    kicks = [c for c in body.contacts if c['kind'].startswith('KICK:')]
    pass_k = [c for c in kicks if any(f in c['kind'] for f in
              ('SHORT', 'DRIVEN', 'LOFT', 'THROUGH', 'CROSS', 'CUTBACK', 'PUNT'))]
    team_of = {p['pid']: p['team'] for p in body.players.values()}
    ctrls = [(c['t'], team_of[c['pid']]) for c in body.contacts if c['kind'] in ('CONTROL', 'GK_CATCH')]
    completed = 0
    for c in pass_k:
        nxt = next((x for x in ctrls if x[0] > c['t']), None)
        if nxt is not None and nxt[1] == team_of[c['pid']]:
            completed += 1
    shots = [c for c in kicks if 'SHOT' in c['kind']]
    goals = sum(body.score)
    dec = collections.Counter(d['action'] for d in L.decisions)
    poss_flips = sum(1 for e in body.events if e['kind'] == 'POSSESSION_CHANGE')
    spells, melee = spell_stats(L)
    rec = L.reception_log
    reck = collections.Counter(
        ('CLEAN' if r['q'] > (0.30 if r['hostile'] else 0.12) else
         'MID' if r['q'] > -0.12 else 'LOOSE') for r in rec) if rec else {}
    dribs = [d for d in L.decisions if d['action'] == 'DRIBBLE']
    trace_h = hashlib.sha256(json.dumps(L.trace).encode()).hexdigest()[:16]
    n_dec = len(L.decisions)
    # shot locations: join KICK:SHOT contact times against the trace
    shot_d = []
    ti = 0
    for c in shots:
        while ti + 1 < len(L.trace) and L.trace[ti + 1]['t'] <= c['t']: ti += 1
        if ti < len(L.trace):
            bx, by = L.trace[ti]['b'][0], L.trace[ti]['b'][1]
            gx = 105.0 if team_of.get(c['pid']) == 0 else 0.0
            shot_d.append(round(math.hypot(gx - bx, 34.0 - by), 1))
    # workload: distance covered from trace samples (every 6 ticks = 0.1 s)
    dist_cov = collections.defaultdict(float)
    prev = {}
    for tr in L.trace:
        for pr in tr['p']:
            pid = pr[0]
            if pid in prev:
                dist_cov[pid] += math.hypot(pr[1] - prev[pid][0], pr[2] - prev[pid][1])
            prev[pid] = (pr[1], pr[2])
    dpm = sorted(v / (body.t / 60.0) for v in dist_cov.values())
    energies = sorted(st.energy for st in L.eng.states.values() if st.active)
    m = {
        'mode': mode, 'minutes': round(mins, 1), 'world_s': round(body.t, 0),
        'goals': goals,
        'passes_pm': round(len(pass_k)/mins, 2), 'completion': round(completed/max(1, len(pass_k)), 3),
        'poss_changes_pm': round(poss_flips/mins, 2),
        'shots_pm': round(len(shots)/mins, 2),
        'goals_per_shot': round(goals/max(1, len(shots)), 3),
        'dribbles_pm': round(len(dribs)/mins, 2),
        'tackle_attempts': len(L.tackle_log),
        'decisions_pm': round(n_dec/mins, 2),
        'decisions_per_spell': round(n_dec/max(1, len(spells)), 2),
        'wakes': dict(L.wakes),
        'avg_spell_s': round(sum(spells)/max(1, len(spells)), 2),
        'melee_alternations': melee,
        'receptions': dict(reck),
        'violations': body.violations, 'maxjump': round(body.maxjump, 3),
        'trace_hash': trace_h,
        'ball_out_restarts': len(body.placements),
        'shot_dist_m': shot_d,
        'shot_dist_mean': round(sum(shot_d)/max(1, len(shot_d)), 1),
        'dist_pm_median': round(dpm[len(dpm)//2], 1) if dpm else 0,
        'dist_pm_max': round(dpm[-1], 1) if dpm else 0,
        'energy_min': round(energies[0], 1) if energies else None,
        'energy_mean': round(sum(energies)/max(1, len(energies)), 1) if energies else None,
    }
    return m, L

def tactical_cf(seed, run_s=900.0):
    """Tactics must alter states/probabilities across the seam, not script outcomes:
    force AWAY pressing intensity and measure engagement/turnover consequences."""
    out = {}
    for intensity in ('PASSIVE', 'RELENTLESS'):
        L = HybridLab(SR, seed)
        object.__setattr__(L.eng.teams['AWAY'].tactics, 'pressing_intensity', intensity)
        L.body.restart = {'kind': 'KICKOFF', 'team': 0, 'spot': (52.5, 34.0), 't': 0.0}
        L.run(run_s)
        body = L.body
        team_of = {p['pid']: p['team'] for p in body.players.values()}
        away_tkl = [t for t in L.tackle_log if team_of.get(t['d']) == 1]
        kicks = [c for c in body.contacts if c['kind'].startswith('KICK:') and 'SHOT' not in c['kind']
                 and team_of.get(c['pid']) == 0]
        ctrls = [(c['t'], team_of[c['pid']]) for c in body.contacts if c['kind'] in ('CONTROL', 'GK_CATCH')]
        comp = 0
        for c in kicks:
            nxt = next((x for x in ctrls if x[0] > c['t']), None)
            if nxt is not None and nxt[1] == 0: comp += 1
        out[intensity] = {
            'away_challenges': len(away_tkl),
            'away_challenge_pm': round(len(away_tkl) / (run_s / 60), 2),
            'home_completion': round(comp / max(1, len(kicks)), 3),
            'poss_flips_pm': round(sum(1 for e in body.events if e['kind'] == 'POSSESSION_CHANGE') / (run_s / 60), 2),
            'home_goals': body.score[0], 'away_goals': body.score[1],
        }
    return out

def main():
    print('running NATIVE...')
    nat = native_metrics(SEED)
    print('running HYBRID...')
    hyb, Lh = cfr_metrics('HYBRID', SEED)
    print('running HYBRID again (determinism)...')
    hyb2, _ = cfr_metrics('HYBRID', SEED)
    print('running HYBRID chunked (2x900)...')
    hybC, _ = cfr_metrics('HYBRID', SEED, chunks=2)
    print('running HYBRID alt seed...')
    hybS, _ = cfr_metrics('HYBRID', 424242)
    print('running STEERED...')
    ste, Ls = cfr_metrics('STEERED', SEED)

    churn_h = churn_decompose(Lh)
    churn_s = churn_decompose(Ls)

    keys = ['minutes', 'goals', 'passes_pm', 'completion', 'poss_changes_pm', 'shots_pm',
            'goals_per_shot', 'dribbles_pm', 'decisions_pm', 'decisions_per_spell',
            'avg_spell_s', 'melee_alternations', 'violations']
    print(f"\n{'metric':22s} {'NATIVE':>10s} {'STEERED':>10s} {'HYBRID':>10s}")
    for k in keys:
        print(f"{k:22s} {str(nat.get(k, '-')):>10s} {str(ste.get(k, '-')):>10s} {str(hyb.get(k, '-')):>10s}")
    print('\nHYBRID wakes:', hyb['wakes'])
    print('HYBRID receptions:', hyb['receptions'])
    print('HYBRID churn decomposition:', churn_h)
    print('STEERED churn decomposition:', churn_s)
    print('running tactical counterfactual (PASSIVE vs RELENTLESS away press)...')
    tcf = tactical_cf(SEED)
    print('tactical CF:', json.dumps(tcf))
    print('\nHYBRID shot distances:', hyb['shot_dist_m'], 'mean', hyb['shot_dist_mean'])
    print('HYBRID workload m/min median', hyb['dist_pm_median'], 'max', hyb['dist_pm_max'],
          '| energy min/mean', hyb['energy_min'], hyb['energy_mean'])
    print('\ndeterminism same-seed:', hyb['trace_hash'] == hyb2['trace_hash'], hyb['trace_hash'])
    print('chunk-independence:', hyb['trace_hash'] == hybC['trace_hash'])
    print('seed divergence:', hyb['trace_hash'] != hybS['trace_hash'])
    out = {'native': nat, 'hybrid': hyb, 'hybrid_rerun_hash': hyb2['trace_hash'],
           'hybrid_chunked_hash': hybC['trace_hash'], 'hybrid_altseed': hybS,
           'steered': ste, 'churn_hybrid': churn_h, 'churn_steered': churn_s,
           'tactical_cf': tcf}
    json.dump(out, open('runner3_results.json', 'w'), indent=1)
    print('saved runner3_results.json')

if __name__ == '__main__':
    main()
