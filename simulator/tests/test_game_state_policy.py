"""Game-State Risk Policy (cal10) unit tests."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pytest

from fc_simulator import engine as engine_mod
from fc_simulator.data import build_mirrored_demo_teams, load_players
from fc_simulator.engine import MatchEngine
from fc_simulator.models import MatchConfig

ROOT = Path(__file__).resolve().parents[1]

pytestmark = pytest.mark.skipif(not getattr(engine_mod, "GS", {"policy": False})["policy"],
                                reason="cal10 game-state policy not active")


@pytest.fixture()
def eng():
    players, stats = load_players(ROOT / "data" / "players.json")
    home, away = build_mirrored_demo_teams(players)
    e = MatchEngine(home, away, stats, 99, MatchConfig(duration_seconds=5400, coach_ai_enabled=True))
    e.advance(30)
    e._gs_last_threat = {"HOME": e.clock, "AWAY": e.clock}
    return e


def _u(eng, margin, minute):
    eng.score["HOME"] = max(0, margin)
    eng.score["AWAY"] = max(0, -margin)
    eng.clock = minute * 60
    eng._gs_last_threat["HOME"] = eng.clock - 300
    return eng._gs_risk_pressure("HOME")


def test_risk_monotone_in_time_and_margin(eng):
    assert _u(eng, -1, 85) > _u(eng, -1, 60) > _u(eng, -1, 30)
    assert _u(eng, -2, 70) > _u(eng, -1, 70)
    assert _u(eng, 0, 75) < 0.2            # level late: essentially calm
    assert _u(eng, 2, 85) < _u(eng, 1, 85) < 0  # protection grows with lead


def test_level_matches_stay_cal9(eng):
    assert abs(_u(eng, 0, 30)) < 1e-9
    eng._gs_risk_check()
    assert eng._gs_notch["HOME"] == 0
    assert eng.teams["HOME"].tactics == eng.base_tactics["HOME"]


def test_directness_never_changed_by_risk(eng):
    base = eng.base_tactics["HOME"]
    for notch in (-3, -1, 1, 2, 3):
        eng._gs_apply_notch("HOME", notch)
        t = eng.teams["HOME"].tactics
        assert t.passing_directness == base.passing_directness
        assert t.attacking_width == base.attacking_width
        assert t.chance_creation_focus == base.chance_creation_focus
    eng._gs_apply_notch("HOME", 0)


def test_max_chase_reaches_full_commitment(eng):
    eng._gs_apply_notch("HOME", 3)
    t = eng.teams["HOME"].tactics
    assert t.progression_risk == "AMBITIOUS"
    assert t.box_commitment == "COMMIT"
    eng._gs_apply_notch("HOME", 0)


def test_protect_reduces_commitment(eng):
    eng._gs_apply_notch("HOME", -2)
    t = eng.teams["HOME"].tactics
    base = eng.base_tactics["HOME"]
    lad = eng._GS_LADDERS["progression_risk"]
    assert lad.index(t.progression_risk) <= lad.index(base.progression_risk)
    assert t.after_winning_possession == "SECURE"
    eng._gs_apply_notch("HOME", 0)
