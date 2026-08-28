"""Restart boundary stress suite (mandated worst cases)."""
import json, math, sys, collections
sys.path.insert(0, '.')
from hybrid import HybridLab, CAL12
from body import dist, W, H
from passcal import SR, park_all, put

R = {}
def rep(name, detail, ok):
    R[name] = {'detail': detail, 'ok': ok}
    print(f"{'PASS' if ok else 'FAIL'}  {name}: {detail}")

def fresh():
    L = HybridLab(SR, 789335328, cad=dict(CAL12))
    L.body.restart = {'kind': 'KICKOFF', 'team': 0, 'spot': (52.5, 34.0), 't': 0.0}
    while L.body.t < 20.0: L.run(1/60)
    return L

def case(tag, actors, bx, by, bvx, bvy, last, expect_already_out=()):
    L = fresh(); body, b = L.body, L.body.ball
    park_all(L)
    for a in actors: put(L, *a[:3], vx=a[3], vy=a[4])
    b['x'], b['y'], b['z'] = bx, by, 0.0
    b['vx'], b['vy'], b['vz'] = bvx, bvy, 0.0
    b['ctrl'] = None; b['last'] = last; b['state'] = 'ROLLING'
    body.restart = None
    if hasattr(L, '_claim'): L._claim.clear()
    L.boundary_stats = {'prevented': 0, 'illegal': 0, 'src': {}}
    out_t = None; t0 = body.t; committed = {}
    out_at_whistle = {}; newly = set(); extra = collections.defaultdict(float)
    reentry = {}
    while body.t < t0 + 18.0:
        L.run(1/60)
        r = body.restart
        if r is not None and out_t is None:
            out_t = body.t
            for pid, p in body.players.items():
                d = max(0-p['x'], p['x']-W, 0-p['y'], p['y']-H, 0.0)
                if d > 0.02: out_at_whistle[pid] = d
                else:
                    # physically committed: braking distance exceeds room left
                    d_line = min(p['x'], W-p['x'], p['y'], H-p['y'])
                    v = math.hypot(p['vx'], p['vy'])
                    if v*v/13.0 > d_line - 0.05: committed[pid] = round(v*v/13.0 - d_line, 2)
        if r is not None and body.t > out_t + 0.017:
            tk = r.get('taker')
            for pid, p in body.players.items():
                if pid == tk: continue
                d = max(0-p['x'], p['x']-W, 0-p['y'], p['y']-H, 0.0)
                if d > 0.05:
                    if pid not in out_at_whistle: newly.add(pid)
                    else:
                        extra[pid] = max(extra[pid], d - out_at_whistle[pid])
                elif pid in out_at_whistle and pid not in reentry:
                    reentry[pid] = round(body.t - out_t, 2)
        if r is None and out_t is not None: break
    mx_extra = max(extra.values(), default=0.0)
    preventable = newly - set(committed)
    ok = (out_t is not None and len(preventable) == 0
          and mx_extra < 0.65                    # physics bound: v²/2B braking residual
          and L.boundary_stats['illegal'] == 0)
    rep(tag, f'out@whistle {[(k, round(v,2)) for k,v in out_at_whistle.items()]}, PREVENTABLE-crossed {sorted(preventable)} (committed: {committed}), '
             f'max extra-outward {mx_extra:.2f}m, re-entry {reentry}, prevented {L.boundary_stats["prevented"]}', ok)

case('S1 two perpendicular sprinters', [('mohamedsalah', 55, 8, 0, -7.8), ('codygakpo', 58, 8.5, 0, -7.8)],
     56.5, 4.5, 0.3, -12.5, 'bre_gen_st')
case('S2 three-player chase', [('mohamedsalah', 54, 7, 0.5, -7.5), ('codygakpo', 57, 8, 0, -7.5),
                               ('bre_gen_cm', 55.5, 6, 0.5, -7.2)],
     56.0, 4.0, 0.3, -12.0, 'bre_gen_st')
case('S3 teammate+opponent max speed', [('mohamedsalah', 55, 9, 0, -8.4), ('bre_gen_cm', 57, 9, 0, -8.4)],
     56, 5, 0.3, -13.0, 'bre_gen_st')
case('S4 avoidance directly at line', [('mohamedsalah', 55, 3, 0.5, -6.5), ('codygakpo', 55.8, 2.2, 0.5, -6.0)],
     55.5, 1.5, 0.4, -11.0, 'bre_gen_st')
case('S5 already 0.1m outside at whistle', [('mohamedsalah', 57, -0.1, 0.5, -2.0)],
     61.5, 3.0, 0.3, -12.5, 'bre_gen_st')
case('S6 already 1m outside (live cross)', [('mohamedsalah', 57, -1.0, 0.3, -0.5)],
     56.5, 3.0, 0.3, -12.5, 'bre_gen_st')
case('S7 deflection out', [('bre_gen_cm', 60, 7, -1.0, -6.8)],
     59, 5.0, -2.0, -11.5, 'bre_gen_st')
case('S8 heavy touch out, top line', [('mohamedsalah', 50, 62.5, 1.0, 7.6), ('bre_gen_lb', 52.5, 61.5, 1.0, 7.6)],
     51.5, 64.0, 1.0, 12.0, 'mohamedsalah')
print(json.dumps({k: v['ok'] for k, v in R.items()}))
json.dump(R, open('boundary_stress_results.json', 'w'), indent=1)
