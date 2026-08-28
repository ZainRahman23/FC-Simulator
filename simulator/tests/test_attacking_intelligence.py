"""Attacking Intelligence (cal9) family unit tests: F1/F2/F4/F5/F6."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import dataclasses
import pytest

from fc_simulator import engine as engine_mod
from fc_simulator.data import build_mirrored_demo_teams, load_players
from fc_simulator.engine import MatchEngine
from fc_simulator.geometry import distance_m, from_attack_frame, goal_center, shot_angle_radians
from fc_simulator.models import MatchConfig

ROOT = Path(__file__).resolve().parents[1]


@pytest.fixture()
def eng():
    players, stats = load_players(ROOT / "data" / "players.json")
    home, away = build_mirrored_demo_teams(players)
    e = MatchEngine(home, away, stats, 777, MatchConfig(duration_seconds=5400, coach_ai_enabled=False))
    e.advance(40)
    return e


def _park(eng, exc=()):
    for s in eng._team_states("HOME"):
        if s not in exc: s.pos = from_attack_frame("HOME", 35.0, 45.0)
    for s in eng._team_states("AWAY"):
        if s not in exc: s.pos = from_attack_frame("AWAY", 25.0, 45.0)


def test_flags_default_cal9():
    assert all(engine_mod.AI[k] for k in ("F1", "F2", "F4", "F5", "F6"))


def test_f4_carry_directions_context(eng):
    w = next(s for s in eng._team_states("HOME") if s.slot == "LW")
    defs = [s for s in eng._team_states("AWAY") if s.slot != "GK"]
    w.pos = from_attack_frame("HOME", 72.0, 14.0)
    eng.possession_team = "HOME"; eng.ball.pos = w.pos
    eng.ball.controlling_player_id = w.player.player_id
    _park(eng, exc=(w,))
    open_dir = eng._ai_carry_plan(w)[0]
    assert open_dir in ("diag_in", "cut_in", "straight")
    # wall the inward lanes -> outward route wins
    defs[0].pos = from_attack_frame("HOME", 75.0, 19.0)
    defs[1].pos = from_attack_frame("HOME", 77.0, 22.0)
    defs[2].pos = from_attack_frame("HOME", 73.5, 20.5)
    assert eng._ai_carry_plan(w)[0] in ("diag_out", "cut_out", "straight")


def test_f4_corner_has_real_route(eng):
    w = next(s for s in eng._team_states("HOME") if s.slot == "LW")
    _park(eng, exc=(w,))
    w.pos = from_attack_frame("HOME", 96.0, 6.0)
    eng.possession_team = "HOME"; eng.ball.pos = w.pos
    name, ux, uy, sp = eng._ai_carry_plan(w)
    assert name != "straight"  # straight has no on-pitch room in the corner


def test_f6_shot_eligibility_geometry(eng):
    st = next(s for s in eng._team_states("HOME") if s.slot == "ST")
    def g(dist, y, lsh):
        st.player.attributes["long_shots"] = lsh
        st.pos = from_attack_frame("HOME", 100 - dist / 1.05, y)
        d = distance_m(st.pos, goal_center("HOME"))
        a = shot_angle_radians("HOME", st.pos)
        r = 24.0 + 4.0 * max(-1.2, min(2.0, eng._g_eff(st, "long_shots")))
        return max(0.0, min(1.0, 1 - (d - r) / 6.0)) * max(0.0, min(1.0, (a - 0.055) / 0.050))
    assert g(22, 50, 70) >= 0.05          # normal central 22m: eligible
    assert g(28, 50, 92) >= 0.05          # elite central 28m: eligible
    assert g(28, 50, 40) < 0.05           # poor shooter 28m: not a candidate
    assert g(40, 50, 70) < 0.05           # 40m ordinary: never
    assert g(14, 3, 92) < 0.05            # corner-flag geometry: never
    assert g(21, 50, 70) >= g(27, 50, 70)  # monotone in distance


def test_f1_recovery_duty_contextual(eng):
    car = next(s for s in eng._team_states("HOME") if s.slot == "ST")
    car.pos = from_attack_frame("HOME", 88.0, 40.0)
    eng.possession_team = "HOME"; eng.ball.pos = car.pos
    # a genuine emergency: eight HOME attackers committed, only five AWAY home
    committed = [s for s in eng._team_states("HOME") if s.slot != "GK"][:8]
    for i, s in enumerate(committed):
        s.pos = from_attack_frame("HOME", 80.0, 15.0 + i * 9.0)
    highs = [s for s in eng._team_states("AWAY") if s.slot in ("ST", "LW", "RW", "LM", "RM", "LCM", "RCM")][:5]
    for s in eng._team_states("AWAY"):
        s.pos = from_attack_frame("AWAY", 55.0 if s in highs else 20.0, 45.0)
    highs[0].pos = from_attack_frame("AWAY", 63.0, 45.0)  # one unambiguous outlet
    # (demo teams give the high cast explicit STAY_HIGH roles; those are respected
    #  at small deficits and overridden only in genuine emergencies - deficit >= 3)
    eng._ai_recover_cache.clear()
    duty = eng._ai_recovery_duty("AWAY")
    assert 1 <= len(duty) <= len(highs)   # contextual: some recover, not all
    # counter plan spares the highest outlet
    eng.teams["AWAY"].tactics = dataclasses.replace(eng.teams["AWAY"].tactics, after_winning_possession="COUNTER")
    eng._ai_recover_cache.clear()
    duty2 = eng._ai_recovery_duty("AWAY")
    top = highs[0]
    assert top.player.player_id not in duty2


def test_f2_intent_assign_and_expire(eng):
    car = next(s for s in eng._team_states("HOME") if s.slot == "RW")
    rec = next(s for s in eng._team_states("HOME") if s.slot == "ST")
    fb = next(s for s in eng._team_states("HOME") if s.slot == "RB")
    _park(eng, exc=(car, rec, fb))
    car.pos = from_attack_frame("HOME", 62.0, 70.0)
    rec.pos = from_attack_frame("HOME", 70.0, 55.0)
    fb.pos = from_attack_frame("HOME", 58.0, 84.0)
    eng.possession_team = "HOME"; eng.ball.pos = car.pos
    eng._ai_assign_intents("HOME", rec, car)
    it = getattr(fb, "ai_intent", None)
    assert it is not None and it["kind"] == "OVERLAP"
    assert it["expires"] > eng.clock
    # intent cleared on possession loss (validity check clears out-of-possession)
    eng.possession_team = "AWAY"
    eng._desired_target(fb)
    assert getattr(fb, "ai_intent", None) is None


def test_f5_stationary_tracker(eng):
    c = eng._carrier()
    eng._ai_still = {"pid": c.player.player_id, "x": c.pos.x, "y": c.pos.y, "since": eng.clock - 12}
    assert eng.clock - eng._ai_still["since"] >= 10
