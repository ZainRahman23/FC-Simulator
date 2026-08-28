"""Phases 1-3: shot-supply funnel + box-occupation forensics on D2."""
import json, math, sys, collections
sys.path.insert(0, '.')
from hybrid import HybridLab, CAL12
from funnel import eval_shot_view, relx_of
from lab import EX, EY, EL
from body import dist, W
SR = '../simulator/validation/rforensic/mw08_start.json'

def run(seed=789335328, secs=5400.0):
    L = HybridLab(SR, seed, cad=dict(CAL12))
    L.body.restart = {'kind': 'KICKOFF', 'team': 0, 'spot': (52.5, 34.0), 't': 0.0}
    body, b = L.body, L.body.ball
    team_of = {p['pid']: p['team'] for p in body.players.values()}

    # (b) BX authorization log
    bx_log = []
    orig_bx = L.eng._bx_box_runs
    def bx_spy(team_id, entry_actor):
        before = {pid: getattr(st, 'ai_intent', None) for pid, st in L.eng.states.items()}
        orig_bx(team_id, entry_actor)
        for pid, st in L.eng.states.items():
            it = getattr(st, 'ai_intent', None)
            if it is not None and before.get(pid) is not it:
                bx_log.append({'t': body.t, 'pid': pid, 'kind': it['kind'],
                               'rel_x': it['rel_x'], 'expires': it['expires'],
                               'born_clock': it.get('born'), 'it_id': id(it)})
    L.eng._bx_box_runs = bx_spy

    # (c) intent lifecycle: snapshot around each scheduled sync
    deaths = collections.Counter()
    alive_intents = {}    # pid -> (it_id, born_t, kind)
    arrivals = 0
    orig_sync = L.sync_targets
    def sync_spy():
        pre = {pid: getattr(st, 'ai_intent', None) for pid, st in L.eng.states.items()}
        ball_rel = {0: EX(b['x']), 1: 100.0 - EX(b['x'])}
        orig_sync()
        for pid, st in L.eng.states.items():
            it = getattr(st, 'ai_intent', None)
            was = pre.get(pid)
            if was is not None and it is None and was['kind'].startswith('BOX'):
                # classify the death with pre-state
                tm = 0 if st.team_id == 'HOME' else 1
                if L.eng.clock >= was['expires']:
                    deaths['expired'] += 1
                elif team_of.get(b['ctrl'], None) != tm and b['ctrl'] is not None:
                    deaths['possession_lost'] += 1
                elif ball_rel[tm] < was.get('ball_rel_born', 0) - 8.0:
                    deaths['ball_regressed'] += 1
                else:
                    deaths['occupied_or_other'] += 1
    L.sync_targets = sync_spy

    # (a)+(d)+(e): stage tracking + box receptions + entry outcomes
    box_recepts = []      # (t, pid, od_at_rec, latency, action, xgeff_rec, xgeff_dec)
    entries = []          # (t, team, outcome)
    pend_rec = {}
    prev_inbox = {0: False, 1: False}
    boxctrl = collections.Counter()
    maxocc = []
    while body.t < secs:
        L.run(1/60)
        if body.tick_n % 10: continue
        ctrl = b['ctrl']
        if ctrl is None or body.restart is not None:
            continue
        p = body.players[ctrl]; tm = p['team']
        inb = (p['x'] > W - 16.5 if tm == 0 else p['x'] < 16.5) and abs(p['y'] - 34) < 20.15
        if inb:
            boxctrl[tm] += 1/6
            occ = sum(1 for q in body.players.values() if q['team'] == tm
                      and ((q['x'] > W - 16.5) if tm == 0 else (q['x'] < 16.5)) and abs(q['y'] - 34) < 20.15)
            maxocc.append(occ)
        if inb and not prev_inbox[tm]:
            entries.append([body.t, tm, None])
        prev_inbox[tm] = inb
    # decisions latency for box receptions (post-hoc)
    cons = body.contacts
    decs = L.decisions
    tr = L.trace
    dec_by_pid = collections.defaultdict(list)
    for d in decs: dec_by_pid[d['pid']].append((d['t'], d['why'], d['action']))
    for c in cons:
        if c['kind'] != 'CONTROL': continue
        # position at contact from trace
        f = min(tr, key=lambda x: abs(x['t'] - c['t']))
        pr = next((q for q in f['p'] if q[0] == c['pid']), None)
        if pr is None: continue
        tm = team_of[c['pid']]
        inb = (pr[1] > W - 16.5 if tm == 0 else pr[1] < 16.5) and abs(pr[2] - 34) < 20.15
        if not inb: continue
        nxt = next(((t, w, a) for t, w, a in dec_by_pid[c['pid']] if t >= c['t'] - 0.05), None)
        if nxt:
            box_recepts.append({'t': round(c['t'], 1), 'pid': c['pid'],
                                'latency': round(nxt[0] - c['t'], 2), 'why': nxt[1], 'action': nxt[2]})
    # entry outcomes within 6 s
    goal_ts = []
    prevs = [0, 0]
    for f in tr:
        if f['score'] != prevs:
            goal_ts.append((f['t'], 0 if f['score'][0] > prevs[0] else 1)); prevs = list(f['score'])
    shots = [(c['t'], team_of[c['pid']]) for c in cons if c['kind'] == 'KICK:SHOT']
    for e in entries:
        t0, tm, _ = e
        if any(t0 <= st_ <= t0 + 6 and stm == tm for st_, stm in shots): e[2] = 'shot'
        elif any(t0 <= gt <= t0 + 8 and gtm == tm for gt, gtm in goal_ts): e[2] = 'goal_direct'
        else:
            nxt = next(((c['t'], team_of[c['pid']]) for c in cons
                        if c['t'] > t0 + 0.5 and c['kind'] in ('CONTROL', 'GK_CATCH')), None)
            e[2] = 'kept' if (nxt and nxt[1] == tm) else 'turnover'
    # BX arrival success: authorized runner reached box within intent life
    arr = 0
    for a in bx_log:
        pid = a['pid']; tm = 0 if not pid.startswith('bre') and pid != 'igorthiago' else 1
        life_end = a['t'] + max(1.0, a['expires'] - (a['born_clock'] or 0))
        for f in tr:
            if a['t'] <= f['t'] <= life_end:
                pr = next((q for q in f['p'] if q[0] == pid), None)
                if pr and ((pr[1] > W - 16.5) if tm == 0 else (pr[1] < 16.5)) and abs(pr[2] - 34) < 20.15:
                    arr += 1; break
    out = {
        'seed': seed, 'goals': list(body.score),
        'box_ctrl_s': {('H' if k == 0 else 'A'): round(v, 1) for k, v in boxctrl.items()},
        'box_occ_mean_when_ctrl': round(sum(maxocc)/max(1, len(maxocc)), 2),
        'entries': len(entries),
        'entry_outcomes': dict(collections.Counter(e[2] for e in entries)),
        'bx_authorizations': len(bx_log),
        'bx_arrivals_in_box': arr,
        'bx_kinds': dict(collections.Counter(a['kind'] for a in bx_log)),
        'intent_deaths': dict(deaths),
        'box_receptions': len(box_recepts),
        'box_rec_latency_p50': sorted(r['latency'] for r in box_recepts)[len(box_recepts)//2] if box_recepts else None,
        'box_rec_actions': dict(collections.Counter(r['action'] for r in box_recepts)),
        'box_rec_whys': dict(collections.Counter(r['why'] for r in box_recepts)),
        'shots': len(shots),
    }
    return out, L

if __name__ == '__main__':
    o, L = run()
    print(json.dumps(o, indent=1))
    json.dump(o, open('boxforensic.json', 'w'), indent=1)
