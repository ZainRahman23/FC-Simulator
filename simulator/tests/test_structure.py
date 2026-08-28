"""Structural unit tests for the settled attacking structure (receiving pockets,
box arrival lanes, second-phase shape retention). All geometry/state assertions —
no probability or scoring math is exercised here."""
from __future__ import annotations

from pathlib import Path

from fc_simulator.data import build_demo_teams, load_players
from fc_simulator.engine import MatchEngine
from fc_simulator.geometry import distance_m, from_attack_frame
from fc_simulator.models import MatchConfig

DATA = Path(__file__).resolve().parents[1] / "data" / "players.json"


def _engine(seed=7, seconds=180):
    players, stats = load_players(DATA)
    home, away = build_demo_teams(players)
    return MatchEngine(home, away, stats, seed, MatchConfig(duration_seconds=seconds))


def _state(eng, team, slot):
    return next(s for s in eng.states.values() if s.team_id == team and s.slot == slot)


def test_support_pocket_moves_away_from_defender_on_target():
    eng = _engine()
    eng.possession_team = "HOME"
    st = _state(eng, "HOME", "ST")
    eng.ball.pos = from_attack_frame("HOME", 70.0, 50.0)
    base_rel, base_y = 74.0, 50.0
    blocker = _state(eng, "AWAY", "LCB")
    blocker.pos = from_attack_frame("HOME", base_rel, base_y)
    rel1, y1 = eng._support_pocket(st, "HOME", base_rel, base_y, 1.0)
    d_refined = distance_m(from_attack_frame("HOME", rel1, y1), blocker.pos)
    d_base = distance_m(from_attack_frame("HOME", base_rel, base_y), blocker.pos)
    assert d_refined > d_base


def test_support_pocket_anti_clump():
    eng = _engine()
    eng.possession_team = "HOME"
    st = _state(eng, "HOME", "ST")
    eng.ball.pos = from_attack_frame("HOME", 70.0, 50.0)
    mate = next(s for s in eng.states.values() if s.team_id == "HOME" and s.slot in {"CAM", "LCM"})
    base_rel, base_y = 74.0, 50.0
    mate.pos = from_attack_frame("HOME", base_rel, base_y)
    rel1, y1 = eng._support_pocket(st, "HOME", base_rel, base_y, 1.0)
    assert distance_m(from_attack_frame("HOME", rel1, y1), mate.pos) > 0.5


def test_pocket_scan_is_deterministic_and_cached():
    eng = _engine()
    eng.possession_team = "HOME"
    st = _state(eng, "HOME", "ST")
    eng.ball.pos = from_attack_frame("HOME", 70.0, 50.0)
    r1 = eng._support_pocket(st, "HOME", 74.0, 50.0, 1.0)
    r2 = eng._support_pocket(st, "HOME", 74.0, 50.0, 1.0)
    assert r1 == r2  # same tick bucket -> cached, identical


def test_shape_credit_second_phase_only():
    eng = _engine()
    st_home = _state(eng, "HOME", "ST")
    cb_away = _state(eng, "AWAY", "LCB")
    eng.possession_team = "HOME"
    eng.possession_started_at = 0
    eng.clock = 20
    cb_away.pos = from_attack_frame("HOME", 80.0, 50.0)
    eng._change_possession("AWAY", cb_away, "tackle")
    assert eng.possession_shape_credit == 0  # ordinary turnover: no credit
    eng.clock = 24
    st_home.pos = from_attack_frame("HOME", 70.0, 45.0)
    eng._change_possession("HOME", st_home, "clearance")
    assert 0 < eng.possession_shape_credit <= 9  # fast high relief regain: bounded credit
    eng.clock = 30
    cb_away.pos = from_attack_frame("AWAY", 30.0, 50.0)
    eng._change_possession("AWAY", cb_away, "interception")
    assert eng.possession_shape_credit == 0  # non-relief regain resets


def test_shape_credit_not_for_slow_or_deep_regains():
    eng = _engine()
    st_home = _state(eng, "HOME", "ST")
    cb_away = _state(eng, "AWAY", "LCB")
    eng.possession_team = "HOME"
    eng.possession_started_at = 0
    eng.clock = 20
    cb_away.pos = from_attack_frame("HOME", 80.0, 50.0)
    eng._change_possession("AWAY", cb_away, "tackle")
    eng.clock = 40  # 20s later: shape has dissolved
    st_home.pos = from_attack_frame("HOME", 70.0, 45.0)
    eng._change_possession("HOME", st_home, "clearance")
    assert eng.possession_shape_credit == 0


def test_restart_clears_shape_credit():
    eng = _engine()
    eng.possession_shape_credit = 7
    gk = _state(eng, "HOME", "GK")
    eng._restart_controlled_possession("HOME", gk, "kickoff")
    assert eng.possession_shape_credit == 0


def test_box_lanes_distinct_arrivals():
    eng = _engine()
    eng.possession_team = "HOME"
    eng.ball.pos = from_attack_frame("HOME", 80.0, 30.0)  # ball wide-left
    st = _state(eng, "HOME", "ST")
    rw = next(s for s in eng.states.values() if s.team_id == "HOME" and s.slot in {"RW", "RM", "RAM"})
    # Uniform space: park every other outfielder far from the candidate region so
    # the role lane preference is the only differentiating term.
    for s in eng.states.values():
        if s is st or s is rw or s.slot == "GK":
            continue
        s.pos = from_attack_frame(s.team_id, 20.0, 10.0 if s.team_id == "HOME" else 90.0)
    base_rel = 82.0
    _, y_st = eng._support_pocket(st, "HOME", base_rel, 50.0, 1.0)
    eng._pocket_cache.clear()
    _, y_rw = eng._support_pocket(rw, "HOME", base_rel, 50.0, 1.0)
    # Ball on the left: ST pulls near post (y<=50), weak-side wide player attacks
    # the far post (y>50) — distinct arrival lanes, not a shared spot.
    assert y_st < 50.0 < y_rw


def _rel_x(team_id, pos):
    from fc_simulator.geometry import attack_relative_x
    return attack_relative_x(team_id, pos)


def test_post_relief_reform_holds_deep_block_lines():
    import dataclasses
    eng = _engine()
    eng.teams["AWAY"].tactics = dataclasses.replace(
        eng.teams["AWAY"].tactics, defensive_block_height="DEEP")
    eng.possession_team = "HOME"
    eng.clock = 100
    # Ball recycled around halfway from the deep block's perspective (rel ~55).
    eng.ball.pos = from_attack_frame("AWAY", 55.0, 50.0)
    mid = _state(eng, "AWAY", "LCM")
    eng._last_relief["AWAY"] = 96  # cleared 4s ago -> inside DEEP 7s window
    reforming = _rel_x("AWAY", eng._desired_target(mid))
    eng._last_relief["AWAY"] = 50  # relief long past -> normal step-up
    normal = _rel_x("AWAY", eng._desired_target(mid))
    assert reforming < normal  # block holds its lines instead of stepping up


def test_post_relief_reform_does_not_touch_high_block():
    import dataclasses
    eng = _engine()
    eng.teams["AWAY"].tactics = dataclasses.replace(
        eng.teams["AWAY"].tactics, defensive_block_height="HIGH")
    eng.possession_team = "HOME"
    eng.clock = 100
    eng.ball.pos = from_attack_frame("AWAY", 55.0, 50.0)
    mid = _state(eng, "AWAY", "LCM")
    eng._last_relief["AWAY"] = 98
    with_relief = _rel_x("AWAY", eng._desired_target(mid))
    eng._last_relief["AWAY"] = 50
    without = _rel_x("AWAY", eng._desired_target(mid))
    assert with_relief == without  # a high press keeps squeezing after a clearance
