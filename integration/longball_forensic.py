"""DEFECT A forensic: long/fast/aerial reception contacts vs short.
Wraps touch_cb to record the full mandated state vector at every contact,
tagged with kick family, flight distance, and arrival geometry."""
import json, math, sys, collections
sys.path.insert(0, '.')
from hybrid import HybridLab, CAL12
from body import dist

def run(seed=789335328, secs=1800.0):
    L = HybridLab('../simulator/validation/rforensic/mw08_start.json', seed, cad=dict(CAL12))
    body, b = L.body, L.body.ball
    body.restart = {'kind': 'KICKOFF', 'team': 0, 'spot': (52.5, 34.0), 't': 0.0}
    team_of = {p['pid']: p['team'] for p in body.players.values()}

    kick_info = {}      # populated at each kick
    orig_kick = type(body).kick
    def kick_spy(self, pid, tx, ty, fam):
        kick_info.update(t=self.t, pid=pid, fam=fam,
                         fx=self.ball['x'], fy=self.ball['y'],
                         D=dist(self.ball['x'], self.ball['y'], tx, ty))
        return orig_kick(self, pid, tx, ty, fam)
    body.kick = kick_spy.__get__(body)

    recs = []
    orig_cb = body.touch_cb
    def cb_spy(p, rv, z):
        res = orig_cb(p, rv, z)
        ki = dict(kick_info) if kick_info and body.t - kick_info.get('t', -9) < 6.0 else {}
        same_team = ki and team_of.get(ki.get('pid')) == p['team'] and ki.get('pid') != p['pid']
        psp = math.hypot(p['vx'], p['vy'])
        bsp = math.hypot(b['vx'], b['vy'])
        inc = math.atan2(b['vy'], b['vx']) if bsp > 0.5 else 0.0
        face_err = abs((p['facing'] - (inc + math.pi) + math.pi*3) % (2*math.pi) - math.pi)
        press = min((dist(q['x'], q['y'], p['x'], p['y'])
                     for q in body.players.values() if q['team'] != p['team']), default=99.0)
        recs.append({
            't': round(body.t, 2), 'pid': p['pid'],
            'fam': ki.get('fam'), 'flightD': round(ki.get('D', 0), 1),
            'flight_t': round(body.t - ki.get('t', body.t), 2),
            'same_team_pass': bool(same_team), 'exp': b.get('_exp') == p['pid'],
            'rv': round(rv, 1), 'z': round(z, 2), 'bvz': round(b['vz'], 1),
            'bsp': round(bsp, 1), 'psp': round(psp, 1),
            'face_err': round(face_err, 2), 'oppd': round(press, 1),
            'bc': L.exec_prof.get(p['pid'], {}).get('ball_control'),
            'res': res[0] if res else None,
            'out_ln': round(res[2], 1) if res else None})
        return res
    body.touch_cb = cb_spy

    while body.t < secs:
        L.run(1/60)
    return recs, L

if __name__ == '__main__':
    recs, L = run()
    json.dump(recs, open('longball_recs.json', 'w'))
    # first friendly-arrival contact per pass, split by class
    seen = set(); firsts = []
    for r in recs:
        key = (r['fam'], round(r['t'] - r['flight_t'], 2))
        if r['same_team_pass'] and key not in seen:
            seen.add(key); firsts.append(r)
    def bucket(rs, name):
        n = len(rs)
        if not n: print(f'{name:26s} n=0'); return
        c = collections.Counter(r['res'] for r in rs)
        print(f'{name:26s} n={n:3d}  CLEAN {100*c["CLEAN"]//n:3d}%  HEAVY {100*c["HEAVY"]//n:3d}%  '
              f'LOOSE {100*c["LOOSE"]//n:3d}%  DEFLECT {100*c["DEFLECT"]//n:3d}%  '
              f'rv_p50 {sorted(r["rv"] for r in rs)[n//2]:5.1f}  z_p50 {sorted(r["z"] for r in rs)[n//2]:.2f}')
    print('── first friendly contact per pass ──')
    bucket([r for r in firsts if r['flightD'] < 18], 'SHORT-range (<18m)')
    bucket([r for r in firsts if 18 <= r['flightD'] < 30], 'MID (18-30m)')
    bucket([r for r in firsts if r['flightD'] >= 30], 'LONG (30m+)')
    bucket([r for r in firsts if r['fam'] == 'LOFT'], 'LOFT family')
    bucket([r for r in firsts if r['fam'] == 'DRIVEN'], 'DRIVEN family')
    bucket([r for r in firsts if r['fam'] == 'THROUGH'], 'THROUGH family')
    print('── LONG (30m+) by state ──')
    lng = [r for r in firsts if r['flightD'] >= 30]
    bucket([r for r in lng if r['rv'] >= 15], '  rv>=15 (auto-cap)')
    bucket([r for r in lng if r['rv'] < 15], '  rv<15')
    bucket([r for r in lng if r['psp'] < 2.0], '  receiver set (psp<2)')
    bucket([r for r in lng if r['psp'] >= 2.0], '  receiver moving')
    bucket([r for r in lng if (r['bc'] or 55) >= 80], '  elite bc>=80')
    bucket([r for r in lng if (r['bc'] or 55) < 70], '  weak bc<70')
    bucket([r for r in lng if r['z'] > 1.0], '  high contact z>1.0')
    bucket([r for r in lng if r['z'] <= 1.0], '  low contact z<=1.0')
