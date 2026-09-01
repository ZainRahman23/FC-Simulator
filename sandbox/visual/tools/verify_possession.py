#!/usr/bin/env python3
"""PERSISTENT POSSESSION + CHALLENGE ROUTING — regression tests (A-H).

Authoritative-body tests driving the same carry execution the brain's CARRY
intent uses (locomote toward ball + 2 m along the corridor, carry_touch with
the corridor). Test E uses a real HybridLab so possession changes only
through the genuine duel machinery. Zero new RNG: retention is
deterministic; E consumes the lab's existing seeded draws.

Run:  .venv/bin/python3 sandbox/visual/tools/verify_possession.py
"""
import json
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "simulator"))
sys.path.insert(0, str(ROOT))
import fc_simulator.world as world
from fc_simulator.world import Body, dist

KH = lambda *a: 0.5
FAIL = []


def check(name, ok, detail):
    print(f"  {'PASS' if ok else 'FAIL'}  {name}: {detail}")
    if not ok:
        FAIL.append(name)


def mk(players):
    b = Body([{'pid': pid, 'team': tm, 'gk': False} for pid, tm in players])
    b.ball.update({'x': 52.5, 'y': 5.0, 'state': 'ROLLING'})
    return b


def give(body, pid):
    p = body.players[pid]
    body.ball.update({'x': p['x'] + 0.4, 'y': p['y'], 'z': 0.0,
                      'vx': 0.0, 'vy': 0.0, 'vz': 0.0, 'ctrl': pid, 'state': 'ROLLING'})


def carry_step(body, pid, tx, ty, speed):
    """The brain's CARRY execution: run through the ball toward the target,
    collecting an overrun ball first (mirrors continuous.py)."""
    p = body.players[pid]
    b = body.ball
    corr = math.atan2(ty - p['y'], tx - p['x'])
    s0 = (b['x'] - p['x']) * math.cos(corr) + (b['y'] - p['y']) * math.sin(corr)
    if b['ctrl'] == pid and s0 < 0.15 and dist(p['x'], p['y'], b['x'], b['y']) > 0.55:
        body.locomote(p, b['x'], b['y'], speed)
    else:
        body.locomote(p, b['x'] + math.cos(corr) * 2, b['y'] + math.sin(corr) * 2, speed)
    body.carry_touch(p, corr)
    body.tick(KH)


print("── A jog carry: no spontaneous control loss ──")
b = mk([('P1', 0)]); b.players['P1'].update(x=40, y=34); give(b, 'P1')
drops = 0
for i in range(480):
    carry_step(b, 'P1', 90, 34, 4.0)
    if b.ball['ctrl'] != 'P1': drops += 1
check("A", drops == 0 and b.ball['ctrl'] == 'P1', f"8 s jog, ctrl drops {drops}")

print("── B sprint carry: longer touches, persistent control ──")
b = mk([('P1', 0)]); b.players['P1'].update(x=20, y=34); give(b, 'P1')
maxd = 0.0; drops = 0
for i in range(480):
    carry_step(b, 'P1', 100, 34, 8.2)
    maxd = max(maxd, dist(b.players['P1']['x'], b.players['P1']['y'],
                          b.ball['x'], b.ball['y']))
    if b.ball['ctrl'] != 'P1': drops += 1
# CONTROLLED DRIBBLING V1: sprint touches are longer than walk touches but
# far shorter than the old ~1 m chain-of-passes (speed-dependent curve)
check("B", drops == 0 and 0.5 < maxd < 1.3, f"max touch distance {maxd:.2f} m, drops {drops}")

print("── C 90-degree turn: corridor redirects, no artificial runaway ──")
b = mk([('P1', 0)]); b.players['P1'].update(x=45, y=40); give(b, 'P1')
for i in range(180): carry_step(b, 'P1', 90, 40, 5.0)          # carry east 3 s
lost = False
for i in range(300):                                            # then target north
    carry_step(b, 'P1', b.players['P1']['x'], 5, 5.0)
    if b.ball['ctrl'] != 'P1': lost = True
by = b.ball['y']
check("C", not lost and by < 38, f"ctrl retained={not lost}, ball moving north (y {by:.1f})")

print("── D defender on carry line: NO silent ownership inheritance ──")
b = mk([('P1', 0), ('D1', 1)])
b.players['P1'].update(x=40, y=34); b.players['D1'].update(x=43, y=34)
give(b, 'P1')
stolen = False
for i in range(300):
    b.locomote(b.players['D1'], 43, 34, 0.0)
    carry_step(b, 'P1', 70, 34, 5.0)
    if b.ball['ctrl'] == 'D1': stolen = True
evs = [e['kind'] for e in b.events if 'POSSESSION_CHANGE' in e['kind']]
check("D", not stolen and not evs,
      f"defender inherited={stolen}, possession-change events={evs} (bare body, no duel resolver)")

print("── E defender reaches exposed touch: REAL duel logic can win it ──")
import bridge
from fc_simulator.engine import MatchEngine
from fc_simulator.continuous import HybridLab
from fc_simulator.worldflags import CAD_PROFILE
fx = json.loads((ROOT / "sandbox/visual/fixture_liv_eve.json").read_text())
eng = MatchEngine(bridge.build_team(fx["home_team"], "HOME"),
                  bridge.build_team(fx["away_team"], "AWAY"),
                  bridge.ATTRIBUTE_STATS, int(fx["seed"]),
                  bridge.build_config(fx.get("config"), fx.get("coach_ai")))
lab = HybridLab(eng, cad=dict(CAD_PROFILE))
body = lab.body
car = next(p for p in body.players.values() if p['team'] == 0 and not p['gk'])
dfd = next(p for p in body.players.values() if p['team'] == 1 and not p['gk'])
for q in body.players.values():
    q['x'], q['y'], q['vx'], q['vy'] = 5.0, 5.0, 0.0, 0.0     # park everyone away
car.update(x=50, y=34, vx=0, vy=0); dfd.update(x=52, y=34, vx=0, vy=0)
body.ball.update({'x': 50.4, 'y': 34.0, 'z': 0, 'vx': 0, 'vy': 0, 'vz': 0,
                  'ctrl': car['pid'], 'state': 'ROLLING'})
challenged = won = False
for i in range(600):
    body.locomote(dfd, 52, 34, 0.0)
    p = car
    corr = 0.0
    body.locomote(p, body.ball['x'] + 2, 34, 4.5)
    body.carry_touch(p, corr)
    body.tick(KH)
    for e in body.events:
        if 'TACKLE' in e['kind']: challenged = True
        if e['kind'] in ('BALL_CONTACT:TACKLE_WON', 'BALL_CONTACT:TACKLE_POKE'): won = True
    if won: break
check("E", challenged and won,
      f"duel fired={challenged}, possession legitimately contested (won/poked)={won}")

print("── F genuine runaway: escaping ball becomes LOOSE ──")
b = mk([('P1', 0)]); b.players['P1'].update(x=50, y=34); give(b, 'P1')
for i in range(60): carry_step(b, 'P1', 90, 34, 6.0)           # knock it ahead
p = b.players['P1']
lost_at = None
for i in range(600):                                            # walk away north
    b.locomote(p, p['x'], 5, 6.0)
    b.tick(KH)
    if b.ball['ctrl'] is None and lost_at is None:
        lost_at = i / 60.0
loose_ev = [e for e in b.events if e['kind'] == 'LOOSE_BALL']
check("F", lost_at is not None and any('escaped' in e['note'] for e in loose_ev),
      f"went LOOSE after {lost_at}s of walking away, events {[e['note'] for e in loose_ev]}")

print("── G pass releases exactly at kick ──")
b = mk([('P1', 0)]); b.players['P1'].update(x=50, y=34); give(b, 'P1')
b.kick('P1', 70, 34, 'SHORT')
check("G", b.ball['ctrl'] is None, f"ctrl after kick: {b.ball['ctrl']}")

print("── H shot releases exactly at kick ──")
b = mk([('P1', 0)]); b.players['P1'].update(x=90, y=34); give(b, 'P1')
b.kick('P1', 105, 34, 'SHOT')
check("H", b.ball['ctrl'] is None, f"ctrl after kick: {b.ball['ctrl']}")

print()
if FAIL:
    print("FAILED:", FAIL); sys.exit(1)
print("ALL POSSESSION REGRESSION TESTS PASS")
