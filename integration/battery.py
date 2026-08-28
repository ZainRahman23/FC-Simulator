"""Final-C 11v11 distribution battery.

Seeds × ecology metrics, tactical counterfactual (PASSIVE/BALANCED→SELECTIVE/
AGGRESSIVE away press), technical-quality counterfactual (weak/base/elite HOME
technique), determinism proofs, fatigue telemetry (measurement only), and a
replay trace for visual inspection (viewer_final.html on :8303).
"""
import json, math, sys, hashlib, collections
sys.path.insert(0, '.')
from hybrid import HybridLab, khash
from ecology import analyze, SR, SEED
from body import dist

TECH_ATTRS = ('ball_control', 'short_passing', 'long_passing', 'dribbling', 'composure', 'agility')

def full_run(seed, secs=1800.0, away_press=None, home_tech_delta=None, chunks=1):
    L = HybridLab(SR, seed)
    if away_press is not None:
        object.__setattr__(L.eng.teams['AWAY'].tactics, 'pressing_intensity', away_press)
    if home_tech_delta is not None:
        for st in L.eng._team_states('HOME'):
            a = st.player.attributes
            for k in TECH_ATTRS:
                if k in a: a[k] = max(30.0, min(99.0, a[k] + home_tech_delta))
            xp = L.exec_prof[st.player.player_id]
            for k in ('ball_control', 'technique', 'composure'):
                xp[k] = max(30.0, min(99.0, xp[k] + home_tech_delta))
    L.body.restart = {'kind': 'KICKOFF', 'team': 0, 'spot': (52.5, 34.0), 't': 0.0}
    for _ in range(chunks):
        L.run(secs / chunks)
    rep = analyze(L)
    body = L.body
    team_of = {p['pid']: p['team'] for p in body.players.values()}
    mins = body.t / 60.0
    kicks = [c for c in body.contacts if c['kind'].startswith('KICK:')]
    pass_k = [c for c in kicks if any(f in c['kind'] for f in
              ('SHORT', 'DRIVEN', 'LOFT', 'THROUGH', 'CROSS', 'CUTBACK', 'PUNT'))]
    ctrls = [(c['t'], team_of[c['pid']]) for c in body.contacts if c['kind'] in ('CONTROL', 'GK_CATCH')]
    comp = comp_h = n_h = 0
    for c in pass_k:
        nxt = next((x for x in ctrls if x[0] > c['t']), None)
        ok = nxt is not None and nxt[1] == team_of[c['pid']]
        comp += ok
        if team_of[c['pid']] == 0: n_h += 1; comp_h += ok
    shots = [c for c in kicks if 'SHOT' in c['kind']]
    tackles_alL = [c for c in body.contacts if c['kind'].startswith('TACKLE')]
    tackles_won = [c for c in body.contacts if c['kind'] in ('TACKLE_WON', 'TACKLE_POKE')]
    dribs = [d for d in L.decisions if d['action'] == 'DRIBBLE']
    # possessions & passes per possession
    n_spells = max(1, len([1 for a, b2 in zip(ctrls, ctrls[1:]) if a[1] != b2[1]]))
    # workload telemetry
    dist_cov = collections.defaultdict(float); sprint_t = collections.defaultdict(float)
    prev = {}
    for tr in L.trace:
        for pr in tr['p']:
            pid = pr[0]
            if pid in prev:
                step = math.hypot(pr[1] - prev[pid][0], pr[2] - prev[pid][1])
                dist_cov[pid] += step
                if step > 0.65: sprint_t[pid] += 0.1     # >6.5 m/s over the 0.1 s sample
            prev[pid] = (pr[1], pr[2])
    dpm = sorted(v / mins for v in dist_cov.values())
    energies = sorted(st.energy for st in L.eng.states.values() if st.active)
    clean = sum(1 for r in L.reception_log if not r['hostile'] and r['q'] > 0.12)
    ntot = max(1, sum(1 for r in L.reception_log if not r['hostile']))
    rep.update({
        'goals': list(body.score), 'passes_pm': round(len(pass_k)/mins, 2),
        'completion': round(comp/max(1, len(pass_k)), 3),
        'completion_home': round(comp_h/max(1, n_h), 3),
        'passes_per_spell': round(len(pass_k)/n_spells, 2),
        'shots': len(shots), 'tackle_contacts_pm': round(len(tackles_alL)/mins, 2),
        'tackles_won_pm': round(len(tackles_won)/mins, 2),
        'takeons': len(dribs), 'clean_first_touch_rate': round(clean/ntot, 3),
        'dist_pm_median': round(dpm[len(dpm)//2], 1), 'dist_pm_max': round(dpm[-1], 1),
        'sprint_share': round(sum(sprint_t.values())/max(1e-9, sum(dist_cov.values())/ (sum(dpm)/len(dpm)) )/len(dpm), 3) if dpm else 0,
        'energy_min': round(energies[0], 1), 'energy_mean': round(sum(energies)/len(energies), 1),
        'violations': body.violations,
        'trace_hash': hashlib.sha256(json.dumps(L.trace).encode()).hexdigest()[:16],
    })
    return rep, L

KEYS = ['flips_pm', 'median_spell_s', 'mean_spell_s', 'reflip_within_3s',
        'pingpong_player_PQP_3s', 'loose_events_pm', 'melee_alt_pm', 'passes_pm',
        'completion', 'passes_per_spell', 'shots', 'goals', 'tackle_contacts_pm',
        'takeons', 'clean_first_touch_rate', 'dist_pm_median', 'energy_mean', 'trace_hash']

def show(tag, rep):
    print(f"-- {tag}")
    for k in KEYS:
        print(f"   {k:26s} {rep.get(k)}")
    print(f"   ball_time_share            {rep['ball_time_share']}")
    print(f"   cause_flips                {rep['cause_flips']}")

def main():
    out = {}
    print('=== seeds ===')
    for seed in (SEED, 424242, 20260825):
        rep, L = full_run(seed)
        out[f'seed_{seed}'] = rep
        show(f'seed {seed}', rep)
        if seed == SEED:
            json.dump(L.trace, open('trace_final.json', 'w'))
            json.dump(L.decisions, open('decisions_final.json', 'w'))
    print('=== determinism ===')
    r2, _ = full_run(SEED)
    rc, _ = full_run(SEED, chunks=2)
    base_h = out[f'seed_{SEED}']['trace_hash']
    print('same-seed identical:', r2['trace_hash'] == base_h, base_h)
    print('chunk-independent:', rc['trace_hash'] == base_h)
    print('seed divergence:', out['seed_424242']['trace_hash'] != base_h)
    out['determinism'] = {'same': r2['trace_hash'] == base_h, 'chunk': rc['trace_hash'] == base_h,
                          'diverge': out['seed_424242']['trace_hash'] != base_h}
    print('=== tactical (away press) ===')
    for lbl, inten in (('PASSIVE', 'PASSIVE'), ('BALANCED', 'SELECTIVE'), ('AGGRESSIVE', 'AGGRESSIVE')):
        rep, _ = full_run(SEED, secs=900.0, away_press=inten)
        out[f'tactic_{lbl}'] = {k: rep.get(k) for k in
                                ('flips_pm', 'completion_home', 'tackle_contacts_pm', 'melee_alt_pm',
                                 'median_spell_s', 'goals')}
        print(lbl, out[f'tactic_{lbl}'])
    print('=== technical quality (HOME tech delta) ===')
    for lbl, dl in (('weak', -18.0), ('base', None), ('elite', +12.0)):
        rep, _ = full_run(SEED, secs=900.0, home_tech_delta=dl)
        out[f'tech_{lbl}'] = {k: rep.get(k) for k in
                              ('completion_home', 'clean_first_touch_rate', 'flips_pm',
                               'median_spell_s', 'goals')}
        print(lbl, out[f'tech_{lbl}'])
    json.dump(out, open('battery_results.json', 'w'), indent=1)
    print('saved battery_results.json')

if __name__ == '__main__':
    main()
