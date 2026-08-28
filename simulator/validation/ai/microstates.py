"""§special-tests: 15 deterministic microstates exposing candidates/utilities/choices."""
import dataclasses, json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
import ai_harness as H
from fc_simulator import engine as EM
from fc_simulator.engine import MatchEngine
from fc_simulator.geometry import Vec2, from_attack_frame, distance_m, attack_relative_x, goal_center, shot_angle_radians

def fresh(flags, seed=42, home_tactics=None, away_tactics=None, clock=None):
    H.set_flags(**flags)
    eng, cmds, _ = H.build_case_engine(seed=seed)
    eng.advance(40)
    if home_tactics: eng.teams["HOME"].tactics = dataclasses.replace(eng.teams["HOME"].tactics, **home_tactics)
    if away_tactics: eng.teams["AWAY"].tactics = dataclasses.replace(eng.teams["AWAY"].tactics, **away_tactics)
    if clock is not None:
        eng.clock = clock
        eng.next_decision_at = clock + 999
    return eng

def park_all(eng, exc=()):
    for s in eng._team_states("HOME"):
        if s not in exc: s.pos = from_attack_frame("HOME", 35.0, 45.0)
    for s in eng._team_states("AWAY"):
        if s not in exc: s.pos = from_attack_frame("AWAY", 30.0, 45.0)

def give_ball(eng, s):
    eng.possession_team = s.team_id
    eng.ball.pos = s.pos
    eng.ball.controlling_player_id = s.player.player_id

ALL = {"F1":True,"F2":True,"F4":True,"F5":True,"F6":True}
report = {}

def carry_plan_of(eng, s):
    name, ux, uy, sp = eng._ai_carry_plan(s)
    return {"chosen_dir": name, "space": round(sp,2)}

# 1-2. winger outside: open diagonal lane / inside lane closed
for label, block_inside in (("winger_open_diagonal", False), ("winger_inside_closed", True)):
    eng = fresh(ALL)
    w = next(s for s in eng._team_states("HOME") if s.slot == "LW")
    d1 = next(s for s in eng._team_states("AWAY") if s.slot == "LB")
    park_all(eng, exc=(w, d1))
    w.pos = from_attack_frame("HOME", 72.0, 14.0)
    d1.pos = from_attack_frame("HOME", 78.0, 14.0)  # straight lane blocked by defender ahead
    if block_inside:
        d2 = next(s for s in eng._team_states("AWAY") if s.slot == "LCB")
        d2.pos = from_attack_frame("HOME", 77.0, 26.0)  # inside diagonal also blocked
    give_ball(eng, w)
    report[label] = carry_plan_of(eng, w)

# 3. central 22m shot opportunity (eligibility + utility presence)
def shot_state(dist_m, y, longshot=None, losing_late=False):
    eng = fresh(ALL)
    st = next(s for s in eng._team_states("HOME") if s.slot == "ST")
    park_all(eng, exc=(st,))
    relx = 100 - dist_m/1.05
    st.pos = from_attack_frame("HOME", relx, y)
    if longshot is not None: st.player.attributes["long_shots"] = longshot
    if losing_late:
        eng.clock = 5100; eng.score["AWAY"] = 1
    give_ball(eng, st)
    d = distance_m(st.pos, goal_center("HOME"))
    a = shot_angle_radians("HOME", st.pos)
    r_max = 24.0 + 4.0 * max(-1.2, min(2.0, eng._g_eff(st, "long_shots")))
    if losing_late: r_max += 6.0
    g = max(0.0, min(1.0, 1-(d-r_max)/6.0)) * max(0.0, min(1.0, (a-0.055)/0.050))
    return {"dist": round(d,1), "angle": round(a,3), "eligible": bool(g >= 0.05), "G": round(g,3)}
report["shot_central_22m"] = shot_state(22, 50)
report["shot_central_28m_elite"] = shot_state(28, 50, longshot=92)
report["shot_central_28m_poor"] = shot_state(28, 50, longshot=45)
report["shot_38m_ordinary"] = shot_state(38, 50)
report["shot_halfway"] = shot_state(52, 50)
report["shot_corner_flag"] = shot_state(12, 4)
report["shot_38m_late_chasing"] = shot_state(38, 50, longshot=92, losing_late=True)

# 4. stationary corner carrier vs passive/aggressive defense: seconds until a defender engages (<4m)
def corner_test(intensity):
    eng = fresh(ALL, away_tactics={"pressing_intensity": intensity})
    w = next(s for s in eng._team_states("HOME") if s.slot == "LW")
    park_all(eng, exc=(w,))
    # realistic block: defenders at their shifted positions ~18-22m away
    for i, s in enumerate(eng._team_states("AWAY")):
        s.pos = from_attack_frame("AWAY", 12.0 + (i%4)*3, 30.0 + (i%5)*8)
    w.pos = from_attack_frame("HOME", 96.0, 8.0)
    give_ball(eng, w)
    eng.next_decision_at = eng.clock + 999
    eng._ai_still = {"pid": w.player.player_id, "x": w.pos.x, "y": w.pos.y, "since": eng.clock}
    for t in range(1, 26):
        eng.advance_one_second()
        eng.ball.pos = w.pos  # keep parked (no decisions)
        dd = min(distance_m(o.pos, w.pos) for o in eng._team_states("AWAY") if o.slot != "GK")
        if dd <= 4.0:
            return {"engaged_after_s": t, "intensity": intensity}
    return {"engaged_after_s": None, "intensity": intensity}
report["corner_vs_passive"] = corner_test("PASSIVE")
report["corner_vs_aggressive"] = corner_test("AGGRESSIVE")

# 5. F1: stranded forward after failed counterpress -> recovery duty; counter outlet spared
def recovery_test(after_winning):
    eng = fresh(ALL, away_tactics={"after_winning_possession": after_winning})
    # HOME attacking deep; AWAY (defending) with 4 players high
    car = next(s for s in eng._team_states("HOME") if s.slot == "ST")
    car.pos = from_attack_frame("HOME", 88.0, 40.0)
    give_ball(eng, car)
    for s in eng._team_states("HOME"):
        if s is not car: s.pos = from_attack_frame("HOME", 70.0, 50.0)
    highs = [s for s in eng._team_states("AWAY") if s.slot in ("ST","LW","RW","CAM","LAM","RAM","LM","RM")][:4]
    lows = [s for s in eng._team_states("AWAY") if s not in highs]
    for s in highs: s.pos = from_attack_frame("AWAY", 55.0, 40.0)
    for s in lows: s.pos = from_attack_frame("AWAY", 20.0, 50.0)
    duty = eng._ai_recovery_duty("AWAY")
    return {"plan": after_winning, "n_high": len(highs), "n_duty": len(duty),
            "outlet_spared": len(duty) < len(highs)}
report["recovery_balanced_plan"] = recovery_test("BALANCED")
report["recovery_counter_plan"] = recovery_test("COUNTER")

# 6. F2: 3v2 break trailing runner / overlap FB intents
eng = fresh(ALL)
car = next(s for s in eng._team_states("HOME") if s.slot == "RW")
rec = next(s for s in eng._team_states("HOME") if s.slot == "ST")
fb = next(s for s in eng._team_states("HOME") if s.slot == "RB")
cm = next(s for s in eng._team_states("HOME") if s.slot == "LCM")
park_all(eng, exc=(car, rec, fb, cm))
car.pos = from_attack_frame("HOME", 62.0, 70.0); rec.pos = from_attack_frame("HOME", 70.0, 55.0)
fb.pos = from_attack_frame("HOME", 58.0, 84.0); cm.pos = from_attack_frame("HOME", 50.0, 52.0)
give_ball(eng, car)
eng._ai_assign_intents("HOME", rec, car)
report["break_intents"] = {s.slot: getattr(s, "ai_intent", None) and s.ai_intent["kind"]
                           for s in (fb, cm)}

json.dump(report, open(H.OUT/"microstates.json","w"), indent=1)
print(json.dumps(report, indent=1))
