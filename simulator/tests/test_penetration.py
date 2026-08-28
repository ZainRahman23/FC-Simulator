"""Penetration & Displacement (cal8) family unit tests (P1 staffing, P2 displacement)."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import dataclasses
import pytest

from fc_simulator import engine as engine_mod
from fc_simulator.data import build_mirrored_demo_teams, load_players
from fc_simulator.engine import MatchEngine
from fc_simulator.geometry import attack_relative_x, from_attack_frame, move_toward
from fc_simulator.models import MatchConfig

ROOT = Path(__file__).resolve().parents[1]


@pytest.fixture(scope="module")
def eng():
    players, stats = load_players(ROOT / "data" / "players.json")
    home, away = build_mirrored_demo_teams(players)
    e = MatchEngine(home, away, stats, 4242, MatchConfig(duration_seconds=5400, coach_ai_enabled=False))
    e.advance(30)
    return e


def _settled(eng, brx=76.0):
    eng.possession_team = "HOME"
    eng.teams["HOME"].tactics = dataclasses.replace(
        eng.teams["HOME"].tactics, progression_risk="AMBITIOUS", box_commitment="COMMIT", passing_directness="SHORT")
    eng.last_turnover_time = -999
    eng.possession_started_at = eng.clock - 25
    carrier = next(s for s in eng._team_states("HOME") if s.slot == "ST")
    carrier.pos = from_attack_frame("HOME", brx, 55.0)
    eng.ball.pos = carrier.pos
    eng.ball.controlling_player_id = carrier.player.player_id
    return carrier


def _max_reach(eng, slot, secs=40):
    s = next(x for x in eng._team_states("HOME") if x.slot == slot)
    orig = s.pos
    best = -1.0
    for _ in range(secs):
        t = eng._desired_target(s)
        s.pos, _m = move_toward(s.pos, t, 4.5)
        eng.clock += 1
        best = max(best, attack_relative_x("HOME", s.pos))
    s.pos = orig
    return best


def test_p1_flags_default_on():
    assert engine_mod.PD["P1"] and engine_mod.PD["P2"]
    assert engine_mod.PD["P3"] is False  # rejected family stays off


def test_p1_cb_can_approach_halfway(eng):
    _settled(eng)
    assert _max_reach(eng, "LCB") >= 47.0  # cal7 ceiling was 45.0


def test_p1_fullback_enters_attacking_half(eng):
    _settled(eng)
    assert _max_reach(eng, "LB") >= 58.0  # cal7 ceiling was 50.4


def test_p1_cb_cap_respects_risk(eng):
    _settled(eng)
    eng.teams["HOME"].tactics = dataclasses.replace(eng.teams["HOME"].tactics, progression_risk="SECURE")
    secure = _max_reach(eng, "LCB")
    eng.teams["HOME"].tactics = dataclasses.replace(eng.teams["HOME"].tactics, progression_risk="AMBITIOUS")
    ambitious = _max_reach(eng, "LCB")
    assert secure < ambitious


def test_p2_block_reference_has_inertia(eng):
    eng._pd_block_ref["AWAY"] = 50.0
    eng.ball.pos = from_attack_frame("HOME", 60.0, 85.0)
    eng._update_movement_and_fatigue()
    ref1 = eng._pd_block_ref["AWAY"]
    assert 50.0 < ref1 < 85.0  # smoothed, not instant


def test_p2_defending_width_pull_amplified(eng):
    d = next(s for s in eng._team_states("AWAY") if s.slot == "LCM")
    eng.possession_team = "HOME"
    eng._pd_block_ref["AWAY"] = 80.0
    carrier = eng._carrier()
    carrier.pos = from_attack_frame("HOME", 40.0, 80.0)
    eng.ball.pos = carrier.pos
    t_on = eng._desired_target(d)
    flag = engine_mod.PD["P2"]
    engine_mod.PD["P2"] = False
    t_off = eng._desired_target(d)
    engine_mod.PD["P2"] = flag
    # with P2, the defender's lateral target sits materially closer to the ball side
    assert abs(t_on.y - 80.0) < abs(t_off.y - 80.0) - 1.0
