"""Reception / post-touch follow forensic — measurement only."""
import sys, json, math, collections; sys.path.insert(0, '.')
from hybrid import HybridLab, CAL12, khash
from body import dist, W
import body as Wd

def run(seed=789335328, secs=900.0, build='current'):
    L = HybridLab('../simulator/validation/rforensic/mw08_start.json', seed, cad=dict(CAL12))
    body, b = L.body, L.body.ball
    team_of = {p['pid']: p['team'] for p in body.players.values()}
    # capture locomote targets per tick
    tgts = {}
    orig_loc = Wd.Body.locomote
    def loc_spy(self, p, tx, ty, speed):
        tgts[p['pid']] = (tx, ty, speed)
        return orig_loc(self, p, tx, ty, speed)
    Wd.Body.locomote = loc_spy
    RING = collections.deque(maxlen=60*8)     # 8 s of ticks
    episodes = []
    pending = None
    L.body.restart = {'kind': 'KICKOFF', 'team': 0, 'spot': (52.5, 34.0), 't': 0.0}
    n0 = 0
    while body.t < secs:
        L.run(1/60)
        # ring record (light)
        ct = b['ctrl']
        rec = {'t': round(body.t, 3), 'bx': b['x'], 'by': b['y'],
               'bvx': b['vx'], 'bvy': b['vy'], 'ctrl': ct, 'estT': b.get('estT', 0)}
        if ct is not None:
            p = body.players[ct]
            it = body.intents.get(ct)
            rec.update(px=p['x'], py=p['y'], pvx=p['vx'], pvy=p['vy'],
                       tgt=tgts.get(ct), intent=(it or {}).get('kind'),
                       d2b=dist(p['x'], p['y'], b['x'], b['y']))
        RING.append(rec)
        while n0 < len(body.contacts):
            c = body.contacts[n0]; n0 += 1
            if c['kind'] == 'CONTROL' and body.t - body.last_kick_t < 2.5 and pending is None:
                pending = {'t0': c['t'], 'pid': c['pid'], 'pre': list(RING)[-36:], 'post': []}
        if pending is not None:
            pending['post'].append(rec)
            if body.t - pending['t0'] > 5.0:
                episodes.append(pending); pending = None
    Wd.Body.locomote = orig_loc
    # per-episode metrics
    out = []
    for ep in episodes:
        pid = ep['pid']; t0 = ep['t0']
        post = ep['post']
        # times to events
        def first(cond):
            for r in post:
                if cond(r): return round(r['t'] - t0, 2)
            return None
        drift = max((dist(r['bx'], r['by'], r.get('px', r['bx']), r.get('py', r['by']))
                     for r in post[:90] if r.get('ctrl') == pid), default=0)
        t_move = first(lambda r: r.get('ctrl') == pid and math.hypot(r.get('pvx',0), r.get('pvy',0)) > 2.0)
        t_reach = first(lambda r: r.get('ctrl') == pid and r.get('d2b', 9) < 1.2 and r['t'] - t0 > 0.3)
        # next action = next kick by pid
        out.append({'t0': round(t0,1), 'pid': pid, 'max_drift': round(drift, 1),
                    't_move2': t_move, 't_reacquire': t_reach})
    return out, episodes, L

if __name__ == '__main__':
    out, eps, L = run()
    drifts = sorted(o['max_drift'] for o in out)
    n = len(out)
    print('reception episodes:', n)
    print('post-touch ball drift from receiver p50/p75/p90:',
          [drifts[int(n*q)] for q in (.5, .75, .9)])
    reac = [o['t_reacquire'] for o in out if o['t_reacquire']]
    print('reacquire time p50/p90:', sorted(reac)[len(reac)//2], sorted(reac)[int(len(reac)*.9)] if reac else '-')
    stuck = [o for o in out if o['max_drift'] > 2.5]
    print('episodes with drift>2.5m:', len(stuck), '/', n)
    json.dump({'metrics': out}, open('reception_metrics.json', 'w'))
    # dump the clearest failure timeline
    bad = max(eps, key=lambda e: max((dist(r['bx'],r['by'],r.get('px',r['bx']),r.get('py',r['by']))
                                      for r in e['post'][:120] if r.get('ctrl')==e['pid']), default=0))
    tl = []
    for r in (bad['pre'][-12:] + bad['post'][:150])[::5]:
        tl.append(r)
    json.dump({'pid': bad['pid'], 't0': bad['t0'], 'ticks': tl}, open('reception_worst.json', 'w'))
    print('worst episode:', bad['pid'], 'at t', round(bad['t0'],1))
