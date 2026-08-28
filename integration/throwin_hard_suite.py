"""One-thrower invariant hard cases: multi-chaser crossings at speed."""
import json, math, sys, collections
sys.path.insert(0, '.')
from hybrid import HybridLab, CAL12
import body as Wd
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

def case(tag, actors, bx, by, bvx, bvy, last):
    """actors: [(pid, x, y, vx, vy)] sprinting; ball exits fast."""
    L = fresh(); body, b = L.body, L.body.ball
    park_all(L)
    for pid, x, y, vx, vy in actors: put(L, pid, x, y, vx=vx, vy=vy)
    b['x'], b['y'], b['z'] = bx, by, 0.0
    b['vx'], b['vy'], b['vz'] = bvx, bvy, 0.0
    b['ctrl'] = None; b['last'] = last; b['state'] = 'ROLLING'
    body.restart = None
    if hasattr(L, '_claim'): L._claim.clear()
    CMD = {}
    orig = Wd.Body.locomote
    def spy(self, p, tx, ty, speed):
        CMD[p['pid']] = (tx, ty, speed)
        return orig(self, p, tx, ty, speed)
    Wd.Body.locomote = spy
    t0 = body.t; out_t = None; taker = None; sel_tick = None
    thrower_roles = set()
    max_out = collections.defaultdict(float); out_dur = collections.Counter()
    tgt_out_ticks = 0; pursue_dead = 0; ready_outside = None
    first_tick_after = True
    while body.t < t0 + 20.0:
        CMD.clear(); L.run(1/60)
        r = body.restart
        if r is not None and out_t is None:
            out_t = body.t
            first_tick_after = True   # commands captured this run predate whistle
        if r is not None and r.get('kind') == 'THROW_IN':
            tk = r.get('taker')
            if tk and sel_tick is None: sel_tick = round(body.t - out_t, 3)
            if tk: taker = tk; thrower_roles.add(tk)
            if not first_tick_after:
                for pid, p in body.players.items():
                    if pid == taker: continue
                    d_out = max(0-p['x'], p['x']-W, 0-p['y'], p['y']-H, 0.0)
                    if d_out > 0.15:
                        max_out[pid] = max(max_out[pid], d_out); out_dur[pid] += 1
                    c = CMD.get(pid)
                    # a zero-speed brake at the player's own position is not
                    # movement toward outside — only driven outside targets count
                    if c and c[2] > 0.5 and (c[0] < -0.2 or c[0] > W+0.2 or c[1] < -0.2 or c[1] > H+0.2):
                        tgt_out_ticks += 1
                    if c and dist(c[0], c[1], b['x'], b['y']) < 1.2 and c[2] > 3.0 and b['state'] == 'DEAD':
                        pursue_dead += 1
            outs = [pid for pid, p in body.players.items()
                    if max(0-p['x'], p['x']-W, 0-p['y'], p['y']-H) > 0.15]
            ready_outside = outs        # final pre-release snapshot wins
            first_tick_after = False
        if r is None and out_t is not None: break
    Wd.Body.locomote = orig
    worst = max(max_out.values(), default=0.0)
    worst_dur = max(out_dur.values(), default=0) / 60
    ok = (out_t is not None and len(thrower_roles) == 1 and sel_tick is not None and sel_tick <= 0.06
          and tgt_out_ticks == 0 and pursue_dead == 0
          and worst_dur < 1.6                       # brisk abort+re-entry
          and (ready_outside is not None and (ready_outside == [taker] or ready_outside == [])))
    rep(tag, f'thrower-sel +{sel_tick}s roles {len(thrower_roles)}, non-thrower max-out {worst:.2f}m '
             f'dur {worst_dur:.2f}s, tgt-out {tgt_out_ticks}, dead-pursuit {pursue_dead}, '
             f'outside@READY {ready_outside}', ok)

# H1: two teammates sprinting at exiting ball
case('H1 two teammates chase out', [('mohamedsalah', 55, 6, 0.5, -7.5), ('codygakpo', 58, 7, 0.0, -7.5)],
     56.5, 4.0, 0.3, -12.0, 'bre_gen_st')
# H2: two opponents
case('H2 two opponents chase out', [('bre_gen_cm', 55, 6, 0.5, -7.5), ('bre_gen_rcm', 58, 7, 0.0, -7.5)],
     56.5, 4.0, 0.3, -12.0, 'bre_gen_st')
# H3: one from each team
case('H3 one each team', [('mohamedsalah', 55, 6, 0.5, -7.5), ('bre_gen_cm', 58, 7, 0.0, -7.5)],
     56.5, 4.0, 0.3, -12.0, 'bre_gen_st')
# H4: three-player chase near line
case('H4 three-player chase', [('mohamedsalah', 54, 6, 0.5, -7.5), ('codygakpo', 57, 7, 0.0, -7.5),
                               ('bre_gen_cm', 55.5, 5, 0.5, -7.0)],
     56.0, 3.5, 0.3, -11.5, 'bre_gen_st')
# H5: max-speed exit at top line, carrier+defender
case('H5 heavy touch out top line', [('mohamedsalah', 50, 63, 1.0, 7.5), ('bre_gen_lb', 52.5, 62, 1.0, 7.5)],
     51.5, 64.5, 1.0, 11.5, 'mohamedsalah')
# H6: through ball exits, winger+fullback pursuing (both home; away awarded)
case('H6 winger+fullback pursue', [('mohamedsalah', 80, 8, 3.0, -6.5), ('conorbradley', 76, 10, 3.0, -6.5)],
     82, 5.0, 2.0, -11.0, 'mohamedsalah')
# H7: eventual thrower NOT the closest pursuer (closest pursuer is opponent)
case('H7 closest pursuer wrong team', [('bre_gen_cm', 56, 5, 0.3, -7.5), ('mohamedsalah', 62, 12, -1.0, -6.0)],
     56.5, 3.5, 0.3, -12.0, 'bre_gen_st')
print(json.dumps({k: v['ok'] for k, v in R.items()}))
json.dump(R, open('throwin_hard_results.json', 'w'), indent=1)
