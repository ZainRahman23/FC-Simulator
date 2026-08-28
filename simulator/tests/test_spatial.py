"""Spatial-Temporal architecture (cal7) family unit tests.

Each family gets deterministic micro-tests against its actual mechanism; the
football-level consequences are covered by the validation battery
(validation/st/), not re-tested here.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pytest

from fc_simulator import engine as engine_mod
from fc_simulator.data import build_mirrored_demo_teams, load_players
from fc_simulator.engine import MatchEngine
from fc_simulator.geometry import Vec2, attack_relative_x, distance_m, from_attack_frame, goal_center
from fc_simulator.models import MatchConfig

ROOT = Path(__file__).resolve().parents[1]


@pytest.fixture(scope="module")
def eng():
    players, stats = load_players(ROOT / "data" / "players.json")
    home, away = build_mirrored_demo_teams(players)
    e = MatchEngine(home, away, stats, 12345, MatchConfig(duration_seconds=5400, coach_ai_enabled=False))
    e.advance(30)
    return e


def test_flags_default_cal7():
    assert engine_mod.ST["A"] and engine_mod.ST["B"] and engine_mod.ST["C"] and engine_mod.ST["D"] and engine_mod.ST["E"]
    assert engine_mod.ST["A2"] is False  # rejected experiment stays off


def test_reception_ready_bands(eng):
    # clean urgent reception -> +1s; difficult -> +4s; unpressured floor 3s
    eng._schedule_reception_ready(0.10, urgent=True)
    assert eng.next_decision_at == eng.clock + 1
    eng._schedule_reception_ready(0.10, urgent=False)
    assert eng.next_decision_at == eng.clock + 3
    eng._schedule_reception_ready(1.20, urgent=True)
    assert eng.next_decision_at == eng.clock + 4


def test_space_beyond_excludes_duel_defender(eng):
    att = next(s for s in eng._team_states("HOME") if s.slot == "RW")
    dfd = next(s for s in eng._team_states("AWAY") if s.slot == "LB")
    att.pos = from_attack_frame("HOME", 70.0, 80.0)
    dfd.pos = from_attack_frame("HOME", 72.5, 80.0)  # directly in the corridor
    for o in eng._team_states("AWAY"):
        if o is not dfd:
            o.pos = from_attack_frame("AWAY", 10.0, 20.0)
    assert eng._space_ahead(att) < 0.3          # old signal: corridor "closed"
    assert eng._st_space_beyond(att, dfd) == 1.0  # new signal: open behind him


def test_contain_point_is_goal_side(eng):
    carrier = next(s for s in eng._team_states("HOME") if s.slot == "RW")
    carrier.pos = from_attack_frame("HOME", 70.0, 80.0)
    dfd = next(s for s in eng._team_states("AWAY") if s.slot == "LB")
    pt = eng._st_contain_point(dfd, carrier, 2.4)
    goal = goal_center(carrier.team_id)
    # stand-off point lies between carrier and the goal he attacks
    assert distance_m(pt, goal) < distance_m(carrier.pos, goal)
    assert 1.2 <= distance_m(pt, carrier.pos) <= 3.6


def test_primary_engager_deterministic_and_skips_beaten(eng):
    carrier = next(s for s in eng._team_states("HOME") if s.slot == "ST")
    carrier.pos = from_attack_frame("HOME", 60.0, 50.0)
    eng.ball.pos = carrier.pos
    eng._st_primary_cache.clear()
    p1 = eng._st_primary_engager("AWAY", carrier)
    eng._st_primary_cache.clear()
    assert eng._st_primary_engager("AWAY", carrier) == p1  # deterministic
    beaten = next(s for s in eng._team_states("AWAY") if s.player.player_id == p1)
    beaten.st_beaten_until = eng.clock + 3
    eng._st_primary_cache.clear()
    p2 = eng._st_primary_engager("AWAY", carrier)
    assert p2 != p1  # RECOVER state excludes him from ownership
    beaten.st_beaten_until = -999


def test_phase_shift_advances_back_line(eng):
    cb = next(s for s in eng._team_states("HOME") if s.slot == "LCB")
    team = eng.teams["HOME"]
    eng.possession_team = "HOME"
    eng.last_turnover_time = -999  # outside any transition window
    lo = eng._phase_shift(cb, team, 55.0)
    hi = eng._phase_shift(cb, team, 80.0)
    prod80 = (80.0 - 50.0) * 0.24
    assert hi > lo
    assert hi > prod80  # genuine advance beyond the cal6 coupling


def test_phase_shift_transition_exempt(eng):
    cb = next(s for s in eng._team_states("HOME") if s.slot == "LCB")
    team = eng.teams["HOME"]
    eng.possession_team = "HOME"
    eng.last_turnover_time = eng.clock  # inside transition window
    eng.last_turnover_loser = "AWAY"
    assert eng._phase_shift(cb, team, 80.0) == pytest.approx((80.0 - 50.0) * 0.24)
    eng.last_turnover_time = -999


def test_buildup_supporters_count_follows_directness(eng):
    import dataclasses
    eng.possession_team = "HOME"
    carrier = next(s for s in eng._team_states("HOME") if s.slot == "LB")
    eng.ball.pos = carrier.pos
    eng.ball.controlling_player_id = carrier.player.player_id
    for directness, n in (("SHORT", 3), ("MIXED", 2), ("DIRECT", 1)):
        eng.teams["HOME"].tactics = dataclasses.replace(eng.teams["HOME"].tactics, passing_directness=directness)
        eng._st_support_cache.clear()
        assert len(eng._st_buildup_supporters("HOME")) == n
