"""cal12 §8 FORENSIC: causal decomposition of the 969 vs 384 FT-dwell gap.

Measures, on the accepted Hybrid-C baseline and the native reference:
  - world-time budget (dead / in-flight / loose / controlled-by-zone)
  - possession-spell zone progression funnel and final-third end causes
  - decision-instant PRESSURE SAMPLING BIAS (are decisions systematically taken
    at worse instants than the world average?)
  - action mix by zone (CLEAR rates etc.) vs native
  - decision ecology (interval distributions, wake reasons, repeat decisions)
Measurement only — no behavior changes.
"""
import json, math, sys, collections
sys.path.insert(0, '.')
from hybrid import HybridLab, khash
from lab import EX, EY, EL
from body import dist, W
import bridge

SR = '../simulator/validation/rforensic/mw08_start.json'

def zone_of(relx):
    return 'own' if relx < 34 else ('mid' if relx < 66 else 'final')

def hybrid_forensic(seed, secs=5400.0):
    L = HybridLab(SR, seed)
    L.body.restart = {'kind': 'KICKOFF', 'team': 0, 'spot': (52.5, 34.0), 't': 0.0}
    body, b = L.body, L.body.ball
    team_of = {p['pid']: p['team'] for p in body.players.values()}
    # per-sample pressure of the CURRENT carrier (world average, unbiased)
    press_samples = []
    budget = collections.Counter()
    zone_ctrl = collections.Counter()      # (team, zone) -> seconds
    ft_spells = []                          # final-third控制 episodes: (team, dur, end_cause)
    cur_ft = None
    last_contact_scan = 0
    while body.t < secs:
        L.run(1 / 60)
        if body.tick_n % 10: continue       # 6 Hz sampling
        dt = 10 / 60.0
        ctrl = b['ctrl']
        if body.restart is not None or b['state'] == 'DEAD':
            budget['dead'] += dt
            if cur_ft is not None:
                ft_spells.append((cur_ft[0], body.t - cur_ft[1], 'dead_ball')); cur_ft = None
            continue
        if ctrl is None and b['held'] is None:
            sp = math.hypot(b['vx'], b['vy'])
            budget['flight' if (b['z'] > 0.15 or sp > 5.5) else 'loose'] += dt
            if cur_ft is not None:
                cur_ft = (cur_ft[0], cur_ft[1], body.t)   # pend: may resume or die
            continue
        pid = ctrl if ctrl is not None else b['held']
        p = body.players[pid]
        tm = p['team']
        relx = EX(p['x']) if tm == 0 else 100.0 - EX(p['x'])
        z = zone_of(relx)
        budget['ctrl'] += dt
        zone_ctrl[(tm, z)] += dt
        # unbiased world pressure for the carrier (sampled, not decision-driven)
        od = min((dist(q['x'], q['y'], p['x'], p['y'])
                  for q in body.players.values() if q['team'] != tm), default=99.0)
        press_samples.append((z, od))
        if z == 'final':
            if cur_ft is None:
                cur_ft = (tm, body.t, body.t)
            elif cur_ft[0] != tm:
                ft_spells.append((cur_ft[0], body.t - cur_ft[1], 'turnover')); cur_ft = (tm, body.t, body.t)
            else:
                cur_ft = (tm, cur_ft[1], body.t)
        else:
            if cur_ft is not None:
                cause = 'recycled_back' if cur_ft[0] == tm else 'turnover'
                ft_spells.append((cur_ft[0], body.t - cur_ft[1], cause)); cur_ft = None
    # decision ecology
    decs = L.decisions
    by_zone = collections.Counter()
    press_at_decision = []
    act_by_zone = collections.Counter()
    for d in decs:
        pid = d['pid']
        # zone at decision from pressure/context recorded? use decision pressure field
        press_at_decision.append(d.get('pressure', 0.0))
        act_by_zone[(d.get('why'), d['action'])] += 1
    ivals = []
    per_pid = collections.defaultdict(list)
    for d in decs:
        per_pid[d['pid']].append(d['t'])
    for pid, ts in per_pid.items():
        ivals += [b2 - a2 for a2, b2 in zip(ts, ts[1:])]
    ivals.sort()
    whys = collections.Counter(d['why'] for d in decs)
    acts = collections.Counter(d['action'] for d in decs)
    out = {
        'seed': seed, 'mins': round(body.t / 60, 1), 'goals': list(body.score),
        'budget_s': {k: round(v, 0) for k, v in budget.items()},
        'zone_ctrl_s': {f"{'H' if k[0]==0 else 'A'}_{k[1]}": round(v, 0) for k, v in zone_ctrl.items()},
        'ft_spells': {
            'n': len(ft_spells),
            'mean_s': round(sum(s[1] for s in ft_spells) / max(1, len(ft_spells)), 2),
            'end_causes': dict(collections.Counter(s[2] for s in ft_spells)),
        },
        'decisions': len(decs), 'wake_mix': dict(whys), 'action_mix': dict(acts),
        'decision_interval_p50_p90': [round(ivals[len(ivals)//2], 2), round(ivals[int(len(ivals)*0.9)], 2)] if ivals else [],
        'repeat_within_1s': sum(1 for iv in ivals if iv < 1.0),
        'pressure_at_decisions_mean': round(sum(press_at_decision)/max(1, len(press_at_decision)), 3),
    }
    # sampling bias: mean nearest-opponent distance, world vs at decisions
    wz = collections.defaultdict(list)
    for z, od in press_samples: wz[z].append(od)
    out['world_nearest_opp_median'] = {z: round(sorted(v)[len(v)//2], 2) for z, v in wz.items()}
    return out, L

def native_forensic(seed):
    sr = json.load(open(SR))
    eng = EL.MatchEngine(bridge.build_team(sr['home_team'], 'HOME'), bridge.build_team(sr['away_team'], 'AWAY'),
                         bridge.ATTRIBUTE_STATS, seed, bridge.build_config(sr.get('config'), sr.get('coach_ai')))
    zone_secs = collections.Counter()
    press_rec = collections.defaultdict(list)
    orig = eng._choose_action
    def spy(carrier, pressure, defender):
        relx = EL.attack_relative_x(carrier.team_id, carrier.pos)
        z = zone_of(relx)
        zone_secs[('H' if carrier.team_id == 'HOME' else 'A', z)] += 1
        press_rec[z].append(pressure)
        return orig(carrier, pressure, defender)
    eng._choose_action = spy
    res = eng.run()
    ec = collections.Counter(e.event_type for e in res.events)
    return {
        'zone_carrier_s': {f'{k[0]}_{k[1]}': v for k, v in zone_secs.items()},
        'pressure_by_zone_mean': {z: round(sum(v)/len(v), 3) for z, v in press_rec.items()},
        'active_s': res.active_play_seconds, 'dead_s': res.dead_ball_seconds,
        'clearances': ec['CLEARANCE'], 'passes': ec['PASS'], 'shots': ec['SHOT'],
        'goals': [res.home_score, res.away_score],
    }

if __name__ == '__main__':
    hy, L = hybrid_forensic(789335328)
    print('HYBRID:', json.dumps(hy, indent=1))
    na = native_forensic(789335328)
    print('NATIVE:', json.dumps(na, indent=1))
    json.dump({'hybrid': hy, 'native': na}, open('cadence_forensic.json', 'w'), indent=1)
