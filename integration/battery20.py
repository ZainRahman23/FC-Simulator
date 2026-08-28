"""20-seed x 90-min battery — same seeds/fields as pursuit_battery2.json.
Aggregates are MEASURED, never tuned. Writes reception_battery.json."""
import json, math, sys, hashlib, collections
sys.path.insert(0, '.')
from hybrid import HybridLab, khash
from ecology import analyze, SR
from body import dist, W

SEEDS = [789335328, 424242, 20260825, 7, 1001, 90210, 555777, 31337, 246810,
         987654, 111, 222, 333, 444, 555, 666, 777, 888, 999, 121212]

def run_match(seed):
    L = HybridLab(SR, seed)
    L.body.restart = {'kind': 'KICKOFF', 'team': 0, 'spot': (52.5, 34.0), 't': 0.0}
    L.run(5400.0)
    body = L.body
    team_of = {p['pid']: p['team'] for p in body.players.values()}
    rep = analyze(L)
    kicks = [c for c in body.contacts if c['kind'].startswith('KICK:')]
    pass_k = [c for c in kicks if not any(f in c['kind'] for f in ('SHOT', 'CLEAR'))]
    ctrls = [(c['t'], team_of[c['pid']]) for c in body.contacts if c['kind'] in ('CONTROL', 'GK_CATCH')]
    comp = sum(1 for c in pass_k if (n := next((x for x in ctrls if x[0] > c['t']), None)) and n[1] == team_of[c['pid']])
    shots = [c for c in kicks if 'SHOT' in c['kind']]
    entries = 0; prev_in = False
    for tr in L.trace:
        bx, ctrlp = tr['b'][0], tr['b'][4]
        if ctrlp is None: prev_in = False; continue
        att = team_of.get(ctrlp)
        inb = ((bx > W - 16.5) if att == 0 else (bx < 16.5)) and abs(tr['b'][1] - 34) < 20.15
        if inb and not prev_in: entries += 1
        prev_in = inb
    cards = [[e.get('card'), e.get('pid')] for e in L.match_events if e.get('card')]
    score = L.trace[-1]['score']
    return {'goals': list(score),
            'shots_home': sum(1 for c in shots if team_of[c['pid']] == 0),
            'shots_away': sum(1 for c in shots if team_of[c['pid']] == 1),
            'completion': round(comp / max(1, len(pass_k)), 3),
            'flips_pm': rep['flips_pm'], 'median_spell_s': rep['median_spell_s'],
            'fouls': sum(1 for e in L.match_events if e['kind'] == 'FOUL'),
            'offsides': sum(1 for e in L.match_events if e['kind'] == 'OFFSIDE'),
            'cards': cards,
            'beats': sum(1 for e in L.match_events if e['kind'] == 'BEAT'),
            'box_entries': entries, 'melee_alt_pm': rep['melee_alt_pm'],
            'violations': rep.get('violations', 0),
            'trace_hash': hashlib.sha256(json.dumps(L.trace).encode()).hexdigest()[:16]}

def main():
    out = {}
    for s in SEEDS:
        out[str(s)] = m = run_match(s)
        print(s, {k: m[k] for k in ('goals', 'shots_home', 'shots_away', 'fouls',
                                    'median_spell_s', 'box_entries')}, flush=True)
    # determinism: seed 1 re-run must hash-match
    again = run_match(SEEDS[0])
    print('determinism:', again['trace_hash'] == out[str(SEEDS[0])]['trace_hash'])
    json.dump(out, open('reception_battery.json', 'w'), indent=1)
    g = [m['goals'] for m in out.values()]
    hw = sum(1 for a, b in g if a > b); dr = sum(1 for a, b in g if a == b)
    print(f"SUMMARY: goals {sum(a for a,_ in g)}-{sum(b for _,b in g)} "
          f"({(sum(a+b for a,b in g))/len(g):.2f}/match) | W{hw} D{dr} L{len(g)-hw-dr}")
    for k in ('shots_home', 'shots_away', 'fouls', 'flips_pm', 'median_spell_s',
              'melee_alt_pm', 'box_entries', 'beats', 'completion'):
        print(f'  {k} {sum(m[k] for m in out.values())/len(out):.2f}')
    print('  violations', sum(m['violations'] for m in out.values()))

if __name__ == '__main__':
    main()
