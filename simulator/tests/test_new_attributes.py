"""players-v3 four-attribute stage tests (§48): each attribute acts at its
proper event stage, with no effect in irrelevant contexts."""
from __future__ import annotations

import dataclasses
from pathlib import Path

from fc_simulator.data import build_demo_teams, load_players
from fc_simulator.engine import MatchEngine
from fc_simulator.geometry import from_attack_frame
from fc_simulator.models import MatchConfig

DATA = Path(__file__).resolve().parents[1] / "data" / "players.json"


def _engine(seed=7):
    players, stats = load_players(DATA)
    home, away = build_demo_teams(players)
    return MatchEngine(home, away, stats, seed, MatchConfig(duration_seconds=120))


def _with(state, **attrs):
    p = state.player
    state.player = dataclasses.replace(p, attributes={**p.attributes, **attrs})
    return state


def _st(eng, team="HOME", slot="ST"):
    return next(s for s in eng.states.values() if s.team_id == team and s.slot == slot)


def test_data_has_four_new_attributes_and_curve():
    players, stats = load_players(DATA)
    for key in ("free_kick_accuracy", "penalties", "composure", "balance", "curve"):
        assert all(key in p.attributes for p in players)
        assert key in stats and stats[key]["n"] > 0
    # Ball Control and Balance are genuinely distinct values in the population.
    diffs = [p for p in players if p.attributes["ball_control"] != p.attributes["balance"]]
    assert len(diffs) > 100


def test_fk_accuracy_drives_direct_fk_placement_not_open_play():
    """Matched seeds; only free_kick_accuracy differs. Open-play shot detail is
    identical; the direct-FK placement stage responds."""
    def shot_detail(fka, shot_type):
        eng = _engine(seed=99)
        st_ = _with(_st(eng), free_kick_accuracy=fka)
        st_.pos = from_attack_frame("HOME", 76.0, 48.0)
        eng.ball.pos = st_.pos
        eng.possession_team = "HOME"
        eng.ball.controlling_player_id = st_.player.player_id
        eng._execute_shot(st_, pressure=0.12, shot_type=shot_type, distance_override=24.0)
        return next(e.detail for e in reversed(eng.events) if e.event_type == "SHOT")
    lo_fk, hi_fk = shot_detail(50, "DIRECT_FREE_KICK"), shot_detail(95, "DIRECT_FREE_KICK")
    assert hi_fk["p_on_target"] > lo_fk["p_on_target"]
    lo_op, hi_op = shot_detail(50, "OPEN_PLAY"), shot_detail(95, "OPEN_PLAY")
    assert lo_op["p_on_target"] == hi_op["p_on_target"]  # FKA is dead-ball only


def test_penalties_attribute_drives_execution_only():
    def p_goal(pen):
        eng = _engine(seed=41)
        # make the ST the unambiguous designated taker
        for s in eng.states.values():
            if s.team_id == "HOME" and s.slot != "GK":
                _with(s, penalties=40)
        st_ = _with(_st(eng), penalties=pen)
        victim = _st(eng, "HOME", "LCM")
        eng._execute_penalty("HOME", victim)
        ev = next(e for e in reversed(eng.events) if e.event_type == "PENALTY")
        return ev.detail["p_goal"], ev.actor_id
    (lo, taker_lo), (hi, taker_hi) = p_goal(60), p_goal(95)
    assert hi > lo                       # execution responds to Penalties
    assert taker_lo == taker_hi          # designated taker = highest Penalties


def test_balance_matters_in_contact_not_clean_passing():
    eng = _engine()
    a, b = _st(eng), _st(eng, "AWAY", "ST")
    a.pos = from_attack_frame("HOME", 50.0, 50.0); b.pos = from_attack_frame("AWAY", 50.0, 50.0)
    _with(a, balance=50); _with(b, balance=50)
    p_even = eng.ground_duel_probability(a, b)
    _with(a, balance=95)
    p_bal = eng.ground_duel_probability(a, b)
    assert p_bal > p_even + 0.02         # stability wins scrambles
    # clean passing is untouched by Balance
    carrier = _st(eng, "HOME", "LCM")
    target = _st(eng, "HOME", "RCM")
    _with(carrier, balance=50)
    p1 = eng.pass_execution_probability(carrier, target, pressure=0.0)
    _with(carrier, balance=95)
    p2 = eng.pass_execution_probability(carrier, target, pressure=0.0)
    assert p1 == p2


def test_balance_is_not_strength():
    """High Balance narrows but does not flip a decisive Strength/mass deficit
    in the shield force contest."""
    eng = _engine()
    carrier = _with(_st(eng), strength=45, balance=95)
    # shield logits: attacker side must still lose the raw force term to a strong defender
    a_side = 0.72 * eng._g_eff(carrier, "strength") + 0.45 * eng._mass_term(carrier) + 0.38 * eng._g_eff(carrier, "ball_control") + 0.26 * eng._g_eff(carrier, "balance")
    strong = _with(_st(eng, "AWAY", "ST"), strength=95, balance=50)
    d_side = 0.70 * eng._g_eff(strong, "strength") + 0.45 * eng._mass_term(strong) + 0.22 * eng._g_eff(strong, "aggression")
    assert d_side > a_side - 0.35        # balance helps, never dominates force


def test_composure_is_resistance_not_boost():
    eng = _engine(seed=5)
    carrier = _st(eng, "HOME", "LCM")
    target = _st(eng, "HOME", "RCM")
    # zero pressure: composure changes nothing
    _with(carrier, composure=50)
    p0_lo = eng.pass_execution_probability(carrier, target, pressure=0.0)
    _with(carrier, composure=95)
    p0_hi = eng.pass_execution_probability(carrier, target, pressure=0.0)
    assert p0_lo == p0_hi
    # heavy pressure: high composure preserves more execution
    _with(carrier, composure=50)
    pp_lo = eng.pass_execution_probability(carrier, target, pressure=0.7)
    _with(carrier, composure=95)
    pp_hi = eng.pass_execution_probability(carrier, target, pressure=0.7)
    assert pp_hi > pp_lo
    assert pp_hi <= p0_hi                # never better than the unpressured self
    # technical skill remains primary: elite passer + modest composure beats
    # modest passer + elite composure under the same pressure
    _with(carrier, short_passing=88, composure=60)
    elite_tech = eng.pass_execution_probability(carrier, target, pressure=0.7)
    _with(carrier, short_passing=60, composure=95)
    elite_comp = eng.pass_execution_probability(carrier, target, pressure=0.7)
    assert elite_tech > elite_comp
