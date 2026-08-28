"""Pressing-architecture unit tests (§49): engagement willingness, physical
arrival, vacated-space option visibility, and coverage-by-movement."""
from __future__ import annotations

import dataclasses
from pathlib import Path

from fc_simulator.data import build_demo_teams, load_players
from fc_simulator.engine import MatchEngine
from fc_simulator.geometry import distance_m, from_attack_frame, move_toward
from fc_simulator.models import MatchConfig, Vec2

DATA = Path(__file__).resolve().parents[1] / "data" / "players.json"


def _engine(seed=7):
    players, stats = load_players(DATA)
    home, away = build_demo_teams(players)
    return MatchEngine(home, away, stats, seed, MatchConfig(duration_seconds=120))


def _state(eng, team, slot):
    return next(s for s in eng.states.values() if s.team_id == team and s.slot == slot)


def _set_intensity(eng, team, value):
    eng.teams[team].tactics = dataclasses.replace(eng.teams[team].tactics, pressing_intensity=value)


def test_relentless_engages_where_passive_holds_shape():
    """Identical geometry: a RELENTLESS midfielder chases a carrier 14m away;
    a PASSIVE one keeps his structural target. No attribute differs."""
    results = {}
    for intensity in ("PASSIVE", "RELENTLESS"):
        eng = _engine()
        eng.possession_team = "HOME"
        carrier = _state(eng, "HOME", "ST")
        carrier.pos = from_attack_frame("HOME", 62.0, 50.0)
        eng.ball.pos = carrier.pos
        eng.ball.controlling_player_id = carrier.player.player_id
        _set_intensity(eng, "AWAY", intensity)
        mid = _state(eng, "AWAY", "LCM")
        mid.pos = from_attack_frame("AWAY", 52.0, 50.0)  # ~14m from carrier
        target = eng._desired_target(mid)
        results[intensity] = distance_m(target, carrier.pos)
    assert results["RELENTLESS"] < 1.0          # chases: target is the carrier
    assert results["PASSIVE"] > results["RELENTLESS"] + 4.0  # holds structure


def test_zone_defense_engages_at_any_intensity():
    """A PASSIVE defender still closes a carrier standing in his own zone."""
    eng = _engine()
    eng.possession_team = "HOME"
    carrier = _state(eng, "HOME", "ST")
    _set_intensity(eng, "AWAY", "PASSIVE")
    mid = _state(eng, "AWAY", "LCM")
    struct = eng._desired_target(mid)  # structural target before the carrier arrives
    carrier.pos = Vec2(struct.x, struct.y)
    eng.ball.pos = carrier.pos
    eng.ball.controlling_player_id = carrier.player.player_id
    mid.pos = Vec2(struct.x + 2.0, struct.y)   # 2m off his spot, carrier in his zone
    target = eng._desired_target(mid)
    # cal7 expectation update: zone defense still confronts the carrier at any
    # intensity, but confrontation is now ENGAGE-or-CONTAIN; a containing zone
    # defender holds a goal-side stand-off (~2-3m) instead of standing on the
    # ball. The universal-confrontation intent is unchanged.
    assert distance_m(target, carrier.pos) < 3.6


def test_press_chase_arrival_depends_on_acceleration():
    """Same engagement: accel 90 covers a 12m chase in fewer seconds than accel 50."""
    times = {}
    for accel in (50, 90):
        eng = _engine()
        st_ = _state(eng, "AWAY", "LCM")
        p = st_.player
        st_.player = dataclasses.replace(p, attributes={**p.attributes, "acceleration": accel, "sprint_speed": accel})
        eng._press_active[st_.player.player_id] = {"last": eng.clock, "carrier": "x", "struct_x": 0.0, "struct_y": 0.0}
        pos, tgt, t = Vec2(30.0, 50.0), Vec2(42.0, 50.0), 0
        while distance_m(pos, tgt) > 0.4 and t < 30:
            st_.pos = pos
            st_.target = tgt
            pos, _ = move_toward(pos, tgt, eng._movement_speed(st_))
            t += 1
        times[accel] = t
    assert times[90] < times[50]


def test_press_chase_costs_more_than_positioning():
    """The same 8m move is faster and more tiring as a press chase than as a shuffle."""
    eng = _engine()
    st_ = _state(eng, "AWAY", "LCM")
    st_.pos = Vec2(30.0, 50.0)
    st_.target = Vec2(38.0, 50.0)
    v_pos = eng._movement_speed(st_)
    eng._press_active[st_.player.player_id] = {"last": eng.clock, "carrier": "x", "struct_x": 0.0, "struct_y": 0.0}
    v_chase = eng._movement_speed(st_)
    eng._press_active.clear()
    assert v_chase > v_pos + 1.0  # explosive close vs positional shuffle


def test_beating_engaged_pressers_raises_pass_utility():
    """A forward option past a committed presser gains utility once the presser
    is engaged and displaced — same coordinates, same receiver, same execution."""
    eng = _engine()
    eng.possession_team = "HOME"
    carrier = _state(eng, "HOME", "LCM")
    carrier.pos = from_attack_frame("HOME", 45.0, 50.0)
    eng.ball.pos = carrier.pos
    eng.ball.controlling_player_id = carrier.player.player_id
    receiver = _state(eng, "HOME", "ST")
    receiver.pos = from_attack_frame("HOME", 60.0, 46.0)
    presser = _state(eng, "AWAY", "LCM")
    presser.pos = from_attack_frame("HOME", 48.0, 52.0)  # ball-side of the receiver
    u_plain = eng._pass_option_utility(carrier, receiver, pressure=0.3)
    eng._press_active[presser.player.player_id] = {
        "carrier": carrier.player.player_id, "last": eng.clock,
        "struct_x": presser.pos.x - 9.0, "struct_y": presser.pos.y,  # 9m out of structure
    }
    u_press = eng._pass_option_utility(carrier, receiver, pressure=0.3)
    eng._press_active.clear()
    assert u_press > u_plain + 0.10


def test_cover_reduces_exposure_only_by_moving():
    """No hidden organization credit: defensive organization is a pure function of
    where defenders physically stand. Moving a midfielder into the vacated lane
    changes it; flags/state do not."""
    eng = _engine()
    eng.possession_team = "HOME"
    eng.ball.pos = from_attack_frame("HOME", 70.0, 50.0)
    dm = _state(eng, "AWAY", "CDM") if any(s.slot == "CDM" for s in eng.states.values() if s.team_id == "AWAY") else _state(eng, "AWAY", "LDM")
    dm.pos = from_attack_frame("HOME", 80.0, 50.0)   # start goal-side, protecting the lane
    org_before = eng._defensive_organization("HOME")
    dm.pos = from_attack_frame("HOME", 40.0, 50.0)   # chases out beyond the ball
    org_out = eng._defensive_organization("HOME")
    dm.pos = from_attack_frame("HOME", 80.0, 50.0)   # physically recovers
    org_back = eng._defensive_organization("HOME")
    assert org_out < org_before                       # leaving shape costs real organization
    assert abs(org_back - org_before) < 1e-9          # returning restores it exactly
