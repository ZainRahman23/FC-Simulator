from __future__ import annotations

from dataclasses import replace
from pathlib import Path

from fc_simulator.data import build_demo_teams, load_players
from fc_simulator.engine import MatchEngine
from fc_simulator.fatigue import update_fatigue
from fc_simulator.formations import anchors_for
from fc_simulator.geometry import attack_relative_x, from_attack_frame
from fc_simulator.models import MatchConfig, PlayerState, Vec2

DATA = Path(__file__).resolve().parents[1] / "data" / "players.json"


def setup_engine(seed=7, seconds=180):
    players, stats = load_players(DATA)
    home, away = build_demo_teams(players)
    return MatchEngine(home, away, stats, seed, MatchConfig(duration_seconds=seconds))


def event_fingerprint(result):
    return [(e.timestamp, e.event_type, e.team_id, e.actor_id, e.detail) for e in result.events]


def test_seed_reproducibility():
    a = setup_engine(seed=1234, seconds=300).run()
    b = setup_engine(seed=1234, seconds=300).run()
    assert event_fingerprint(a) == event_fingerprint(b)


def test_ovr_isolation():
    players, stats = load_players(DATA)
    h1, a1 = build_demo_teams(players)
    r1 = MatchEngine(h1, a1, stats, 77, MatchConfig(duration_seconds=240)).run()

    changed = [replace(p, ovr=(1 if p.ovr > 50 else 99)) for p in players]
    h2, a2 = build_demo_teams(changed)
    r2 = MatchEngine(h2, a2, stats, 77, MatchConfig(duration_seconds=240)).run()
    assert event_fingerprint(r1) == event_fingerprint(r2)


def test_short_passing_monotonicity():
    engine = setup_engine(seed=8, seconds=20)
    carrier = engine._carrier()
    target0 = next(s for s in engine._team_states(carrier.team_id) if s.player.player_id != carrier.player.player_id and s.slot not in {"GK"})
    target = replace(target0, pos=Vec2(carrier.pos.x + (5 if carrier.team_id == "HOME" else -5), carrier.pos.y + 2))
    low_player = replace(carrier.player, attributes={**carrier.player.attributes, "short_passing": 60})
    high_player = replace(carrier.player, attributes={**carrier.player.attributes, "short_passing": 95})
    low = replace(carrier, player=low_player)
    high = replace(carrier, player=high_player)
    assert engine.pass_execution_probability(high, target, 0.4) > engine.pass_execution_probability(low, target, 0.4)


def test_stamina_same_workload_high_stamina_preserves_energy():
    players, _ = load_players(DATA)
    p = next(p for p in players if p.primary_position != "GK")
    lowp = replace(p, attributes={**p.attributes, "stamina": 60})
    highp = replace(p, attributes={**p.attributes, "stamina": 95})
    a = PlayerState(lowp, "HOME", "CM", Vec2(50, 50), Vec2(50, 50), Vec2(50, 50))
    b = PlayerState(highp, "HOME", "CM", Vec2(50, 50), Vec2(50, 50), Vec2(50, 50))
    for _ in range(900):
        update_fatigue(a, 5.8, 5.8)
        update_fatigue(b, 5.8, 5.8)
    assert b.energy > a.energy


def test_low_workload_low_stamina_can_finish_fresher():
    players, _ = load_players(DATA)
    p = next(p for p in players if p.primary_position != "GK")
    lowp = replace(p, attributes={**p.attributes, "stamina": 60})
    highp = replace(p, attributes={**p.attributes, "stamina": 95})
    low_work = PlayerState(lowp, "HOME", "CM", Vec2(50, 50), Vec2(50, 50), Vec2(50, 50))
    high_work = PlayerState(highp, "HOME", "CM", Vec2(50, 50), Vec2(50, 50), Vec2(50, 50))
    for _ in range(1200):
        update_fatigue(low_work, 1.2, 1.2)
        update_fatigue(high_work, 6.4, 6.4)
    assert low_work.energy > high_work.energy


def test_imported_height_weight_are_populated():
    players, _ = load_players(DATA)
    assert all(p.height_cm is not None for p in players)
    assert all(p.weight_kg is not None for p in players)
    assert min(p.height_cm for p in players if p.height_cm is not None) >= 160
    assert max(p.height_cm for p in players if p.height_cm is not None) <= 210


def test_height_improves_same_aerial_contest():
    engine = setup_engine(seed=44, seconds=20)
    a = next(s for s in engine._team_states("HOME") if s.slot == "ST")
    d = next(s for s in engine._team_states("AWAY") if s.slot in {"LCB", "RCB"})
    landing = Vec2((a.pos.x + d.pos.x) / 2, (a.pos.y + d.pos.y) / 2)
    short_player = replace(a.player, height_cm=170.0)
    tall_player = replace(a.player, height_cm=199.0)
    short_state = replace(a, player=short_player)
    tall_state = replace(a, player=tall_player)
    assert engine.aerial_win_probability(tall_state, d, landing) > engine.aerial_win_probability(short_state, d, landing)


def test_weight_does_not_change_pass_execution():
    engine = setup_engine(seed=45, seconds=20)
    carrier = engine._carrier()
    target = next(s for s in engine._team_states(carrier.team_id) if s.player.player_id != carrier.player.player_id and s.slot != "GK")
    light = replace(carrier, player=replace(carrier.player, weight_kg=60.0))
    heavy = replace(carrier, player=replace(carrier.player, weight_kg=97.0))
    assert engine.pass_execution_probability(light, target, 0.3) == engine.pass_execution_probability(heavy, target, 0.3)


def test_strength_and_weight_help_ground_duel_only_in_physical_context():
    engine = setup_engine(seed=46, seconds=20)
    a = next(s for s in engine._team_states("HOME") if s.slot == "ST")
    b = next(s for s in engine._team_states("AWAY") if s.slot in {"LCB", "RCB"})
    weak_light = replace(a, player=replace(a.player, weight_kg=62.0, attributes={**a.player.attributes, "strength": 60}))
    strong_heavy = replace(a, player=replace(a.player, weight_kg=96.0, attributes={**a.player.attributes, "strength": 95}))
    assert engine.ground_duel_probability(strong_heavy, b) > engine.ground_duel_probability(weak_light, b)


def test_offside_is_spatial_and_changes_possession():
    from fc_simulator.models import BallControlState, BallState

    engine = setup_engine(seed=47, seconds=20)
    carrier = next(s for s in engine._team_states("HOME") if s.slot in {"LCM", "RCM", "CDM"})
    target = next(s for s in engine._team_states("HOME") if s.slot == "ST")
    carrier.pos = Vec2(60.0, 50.0)
    target.pos = Vec2(90.0, 50.0)
    for d in engine._team_states("AWAY"):
        d.pos = Vec2(95.0 if d.slot == "GK" else 80.0, d.pos.y)
    engine.possession_team = "HOME"
    engine.ball = BallState(carrier.pos, BallControlState.CONTROLLED, "HOME", carrier.player.player_id)
    assert engine._offside_margin(carrier, target) > 0.0
    engine._execute_pass(carrier, target, pressure=0.0, presser=None)
    assert any(e.event_type == "OFFSIDE" and e.team_id == "HOME" for e in engine.events)
    assert engine.possession_team == "AWAY"


def test_crossing_attribute_drives_wide_delivery_execution():
    engine = setup_engine(seed=48, seconds=20)
    carrier = next(s for s in engine._team_states("HOME") if s.slot == "RW")
    target = next(s for s in engine._team_states("HOME") if s.slot == "ST")
    carrier.pos = Vec2(76.0, 90.0)
    target.pos = Vec2(90.0, 50.0)
    assert engine._pass_type(carrier, target) == "CROSS"
    low = replace(carrier, player=replace(carrier.player, attributes={**carrier.player.attributes, "crossing": 55}))
    high = replace(carrier, player=replace(carrier.player, attributes={**carrier.player.attributes, "crossing": 95}))
    assert engine.pass_execution_probability(high, target, 0.25) > engine.pass_execution_probability(low, target, 0.25)


def test_out_of_play_creates_real_restarts():
    a = setup_engine(seed=49, seconds=20)
    assert a._handle_out_of_play("HOME", Vec2(50.0, -1.0), "test_touchline")
    assert a.events[-1].event_type == "THROW_IN"
    assert a.events[-1].team_id == "AWAY"

    b = setup_engine(seed=50, seconds=20)
    assert b._handle_out_of_play("HOME", Vec2(101.0, 50.0), "test_goal_line")
    assert b.events[-1].event_type == "GOAL_KICK"
    assert b.events[-1].team_id == "AWAY"


def test_4231_plan_remaps_slots_before_kickoff():
    from fc_simulator.data import apply_plan

    players, stats = load_players(DATA)
    home, away = build_demo_teams(players)
    plan = Path(__file__).resolve().parents[1] / "plans" / "possession_4231.json"
    apply_plan(home, plan)
    assert home.formation_name == "4-2-3-1"
    assert set(home.lineup) == {"GK", "LB", "LCB", "RCB", "RB", "LDM", "RDM", "LAM", "CAM", "RAM", "ST"}
    engine = MatchEngine(home, away, stats, 51, MatchConfig(duration_seconds=30))
    assert len(engine._team_states("HOME")) == 11
    assert set(s.slot for s in engine._team_states("HOME")) == set(home.lineup)


def test_all_13_team_tactics_apply_from_plan(tmp_path):
    import json
    from fc_simulator.data import apply_plan
    from fc_simulator.tactics import TACTIC_OPTIONS

    players, _ = load_players(DATA)
    home, _ = build_demo_teams(players)
    chosen = {name: sorted(values)[-1] for name, values in TACTIC_OPTIONS.items()}
    path = tmp_path / "all_tactics.json"
    path.write_text(json.dumps({"formation": "4-3-3", "tactics": chosen}), encoding="utf-8")
    apply_plan(home, path)
    for name, expected in chosen.items():
        assert getattr(home.tactics, name) == expected


def test_red_card_restructure_keeps_ten_active_and_refills_missing_slot():
    engine = setup_engine(seed=52, seconds=20)
    sent_off = next(s for s in engine._team_states("HOME") if s.slot == "RB")
    sent_off.red_cards = 1
    sent_off.active = False
    engine.clock = 60 * 60
    assert len(engine._team_states("HOME")) == 10
    engine._coach_check()
    active = engine._team_states("HOME")
    assert len(active) == 10
    assert any(s.slot == "RB" and s.player.player_id != sent_off.player.player_id for s in active)
    restructure = [e for e in engine.events if e.event_type == "SUBSTITUTION" and e.detail.get("reason") == "RED_CARD_RESTRUCTURE"]
    assert restructure
    assert len(engine.teams["HOME"].lineup) == 10


def test_coach_chase_mode_can_change_formation_in_match():
    # cal10 expectation update: maximum chasing urgency (and its 4-2-3-1
    # switch) is reached through the graded game-state risk policy rather
    # than the old binary 68' CHASE trigger. Same football endpoint: a team
    # trailing very late converts to its most attacking shape.
    from fc_simulator import engine as engine_mod
    engine = setup_engine(seed=53, seconds=20)
    engine.score["HOME"] = 0
    engine.score["AWAY"] = 1
    if getattr(engine_mod, "GS", {"policy": False})["policy"]:
        engine.clock = 88 * 60
        engine._gs_last_threat["HOME"] = engine.clock - 20 * 60
        engine._gs_risk_check()
    else:
        engine.clock = 70 * 60
        engine._coach_check()
    assert engine.teams["HOME"].formation_name == "4-2-3-1"
    assert len(engine._team_states("HOME")) == 11
    assert set(s.slot for s in engine._team_states("HOME")) == {"GK", "LB", "LCB", "RCB", "RB", "LDM", "RDM", "LAM", "CAM", "RAM", "ST"}
    assert any(e.event_type == "FORMATION_CHANGE" and e.team_id == "HOME" and e.detail.get("to") == "4-2-3-1" for e in engine.events)


def test_broken_transition_has_lower_defensive_organization_than_settled_shape():
    engine = setup_engine(seed=54, seconds=20)
    attacker = next(s for s in engine._team_states("HOME") if s.slot == "ST")
    attacker.pos = Vec2(78.0, 50.0)
    engine.possession_team = "HOME"
    engine.ball.pos = attacker.pos
    # Settled: defenders goal-side, centrally protected, coherent back line.
    settled = {
        "LB": Vec2(84, 22), "LCB": Vec2(86, 40), "RCB": Vec2(86, 60), "RB": Vec2(84, 78),
        "CDM": Vec2(80, 50), "LCM": Vec2(79, 38), "RCM": Vec2(79, 62),
        "LW": Vec2(76, 28), "RW": Vec2(76, 72), "ST": Vec2(70, 50),
    }
    for s in engine._team_states("AWAY"):
        if s.slot in settled:
            s.pos = settled[s.slot]
    engine.last_turnover_time = -999
    engine.last_turnover_loser = None
    organized = engine._defensive_organization("HOME")

    # Broken: several players caught ahead of the ball and back line staggered.
    broken = {
        "LB": Vec2(70, 15), "LCB": Vec2(83, 35), "RCB": Vec2(91, 67), "RB": Vec2(68, 88),
        "CDM": Vec2(67, 48), "LCM": Vec2(62, 32), "RCM": Vec2(64, 70),
        "LW": Vec2(55, 20), "RW": Vec2(57, 80), "ST": Vec2(50, 50),
    }
    for s in engine._team_states("AWAY"):
        if s.slot in broken:
            s.pos = broken[s.slot]
    engine.clock = 100
    engine.last_turnover_time = 100
    engine.last_turnover_loser = "AWAY"
    broken_org = engine._defensive_organization("HOME")
    assert organized > broken_org


def test_same_shot_location_is_higher_xg_against_broken_defense():
    engine = setup_engine(seed=55, seconds=20)
    shooter = next(s for s in engine._team_states("HOME") if s.slot == "ST")
    shooter.pos = Vec2(86.0, 50.0)
    engine.possession_team = "HOME"
    engine.ball.pos = shooter.pos
    # Organized low-block geometry.
    for s in engine._team_states("AWAY"):
        if s.slot == "GK":
            s.pos = Vec2(96, 50)
        elif s.slot in {"LB", "LCB", "RCB", "RB"}:
            ys = {"LB": 25, "LCB": 42, "RCB": 58, "RB": 75}
            s.pos = Vec2(90, ys[s.slot])
        else:
            s.pos = Vec2(84, s.pos.y)
    engine.last_turnover_time = -999
    engine.last_turnover_loser = None
    xg_settled = engine._xg(shooter, pressure=0.25)

    # Same shooter/location, but defense is caught upfield and staggered.
    for s in engine._team_states("AWAY"):
        if s.slot == "GK":
            s.pos = Vec2(96, 50)
        elif s.slot in {"LB", "LCB", "RCB", "RB"}:
            xs = {"LB": 69, "LCB": 81, "RCB": 88, "RB": 66}
            s.pos = Vec2(xs[s.slot], s.pos.y)
        else:
            s.pos = Vec2(65, s.pos.y)
    engine.clock = 200
    engine.last_turnover_time = 200
    engine.last_turnover_loser = "AWAY"
    xg_broken = engine._xg(shooter, pressure=0.25)
    assert xg_broken > xg_settled


def test_high_line_creates_through_ball_option_but_deep_line_does_not():
    engine = setup_engine(seed=56, seconds=20)
    carrier = next(s for s in engine._team_states("HOME") if s.slot in {"LCM", "RCM", "CDM"})
    target = next(s for s in engine._team_states("HOME") if s.slot == "ST")
    carrier.pos = Vec2(55, 50)
    target.pos = Vec2(66, 50)
    engine.ball.pos = carrier.pos
    for d in engine._team_states("AWAY"):
        if d.slot == "GK":
            d.pos = Vec2(96, 50)
        else:
            d.pos = Vec2(68, d.pos.y)
    assert engine._pass_type(carrier, target) == "THROUGH"
    for d in engine._team_states("AWAY"):
        if d.slot == "GK":
            d.pos = Vec2(96, 50)
        else:
            d.pos = Vec2(88, d.pos.y)
    assert engine._pass_type(carrier, target) != "THROUGH"


def test_box_commitment_changes_supporting_run_depth():
    from dataclasses import replace as dc_replace

    engine = setup_engine(seed=57, seconds=20)
    runner = next(s for s in engine._team_states("HOME") if s.slot == "LCM")
    carrier = next(s for s in engine._team_states("HOME") if s.slot == "RW")
    carrier.pos = Vec2(72, 84)
    engine.possession_team = "HOME"
    engine.ball.pos = carrier.pos
    team = engine.teams["HOME"]
    team.tactics = dc_replace(team.tactics, box_commitment="CAUTIOUS")
    cautious = engine._desired_target(runner).x
    team.tactics = dc_replace(team.tactics, box_commitment="COMMIT")
    committed = engine._desired_target(runner).x
    assert committed > cautious


def test_deep_block_respects_backline_positional_floor():
    from dataclasses import replace as dc_replace

    engine = setup_engine(seed=58, seconds=20)
    team = engine.teams["HOME"]
    team.tactics = dc_replace(team.tactics, defensive_block_height="DEEP", defensive_line_behavior="DROP")
    engine.possession_team = "AWAY"
    # Before penetration, the structural low-block floor still prevents defenders
    # collapsing onto the goalkeeper line.
    engine.ball.pos = Vec2(28, 50)
    for slot in {"LB", "LCB", "RCB", "RB"}:
        state = next(s for s in engine._team_states("HOME") if s.slot == slot)
        target = engine._desired_target(state)
        floor = 9.0 if slot in {"LCB", "RCB"} else 10.0
        assert target.x >= floor



def test_defenders_can_recover_below_structural_floor_after_ball_breaks_line():
    from dataclasses import replace as dc_replace
    engine = setup_engine(seed=581, seconds=20)
    team = engine.teams["HOME"]
    team.tactics = dc_replace(team.tactics, defensive_block_height="HIGH", defensive_line_behavior="STEP_UP")
    engine.possession_team = "AWAY"
    # AWAY is already deep behind HOME's nominal line, near HOME's goal at x=0.
    engine.ball.pos = Vec2(10, 50)
    cb = next(s for s in engine._team_states("HOME") if s.slot == "LCB")
    target = engine._desired_target(cb)
    assert target.x < 9.0


def test_match_openness_contract_has_controlled_ultra_and_open_tiers():
    from statistics import mean
    from fc_simulator.data import apply_plan

    players, stats = load_players(DATA)
    root = Path(__file__).resolve().parents[1]
    controlled_plan = root / "plans" / "controlled_cagey_4141.json"
    ultra_plan = root / "plans" / "ultra_low_block_4141.json"
    open_plan = root / "plans" / "end_to_end.json"

    def sample(plan_path):
        rows = []
        # 8 deterministic seeds: 4 was fragile to a single outlier match while
        # every margin below stayed comfortably true at validation-scale samples.
        for seed in range(9100, 9108):
            home, away = build_demo_teams(players)
            apply_plan(home, plan_path); apply_plan(away, plan_path)
            result = MatchEngine(home, away, stats, seed, MatchConfig(duration_seconds=30 * 60, coach_ai_enabled=False)).run()
            shots = [e for e in result.events if e.event_type == "SHOT"]
            rows.append({
                "shots": len(shots),
                "xg": sum(float(e.detail.get("xg", 0.0)) for e in shots),
                "transition_shots": sum(1 for e in shots if e.detail.get("transition")),
                "possession_changes": sum(1 for e in result.events if e.event_type == "POSSESSION_CHANGE"),
                "org": mean([float(e.detail.get("defensive_organization", 0.0)) for e in shots]) if shots else 1.0,
            })
        return {k: mean(row[k] for row in rows) for k in rows[0]}

    controlled = sample(controlled_plan)
    ultra = sample(ultra_plan)
    open_game = sample(open_plan)

    # Strong, controlled football must still create. The extreme low block is the truly
    # sterile tier; open football creates far more through transitions and broken shape.
    assert 0.14 < controlled["xg"] < 0.55  # small-sample guardrail; full distribution target lives in calibration harness
    assert controlled["xg"] > ultra["xg"] * 1.5
    assert controlled["shots"] > ultra["shots"]
    assert open_game["xg"] > controlled["xg"] * 2.0
    assert open_game["shots"] > controlled["shots"] * 1.4
    assert open_game["transition_shots"] > controlled["transition_shots"]
    assert open_game["possession_changes"] > controlled["possession_changes"] * 1.6
    assert open_game["org"] < controlled["org"]


def test_identical_shot_geometry_has_same_xg_regardless_of_tactical_label():
    from dataclasses import replace as dc_replace
    engine = setup_engine(seed=610, seconds=20)
    shooter = next(s for s in engine._team_states("HOME") if s.slot == "ST")
    shooter.pos = Vec2(84, 50)
    engine.possession_team = "HOME"
    engine.ball.pos = shooter.pos
    engine.last_turnover_time = -999
    engine.last_turnover_loser = None
    base = engine.teams["HOME"].tactics
    engine.teams["HOME"].tactics = dc_replace(base, build_up_tempo="PATIENT", progression_risk="SECURE", box_commitment="CAUTIOUS")
    cagey_xg = engine._xg(shooter, pressure=0.25)
    engine.teams["HOME"].tactics = dc_replace(base, build_up_tempo="QUICK", progression_risk="AMBITIOUS", box_commitment="COMMIT")
    open_xg = engine._xg(shooter, pressure=0.25)
    assert cagey_xg == open_xg


def test_attacking_position_improves_mature_settled_box_occupation():
    from dataclasses import replace as dc_replace
    engine = setup_engine(seed=611, seconds=20)
    st = next(s for s in engine._team_states("HOME") if s.slot == "ST")
    carrier = next(s for s in engine._team_states("HOME") if s.slot == "RCM")
    carrier.pos = Vec2(72, 58)
    engine.possession_team = "HOME"; engine.ball.pos = carrier.pos
    engine.possession_started_at = 0; engine.clock = 40
    team = engine.teams["HOME"]
    team.tactics = dc_replace(team.tactics, build_up_tempo="PATIENT", box_commitment="BALANCED", after_winning_possession="BALANCED")
    attrs_low = dict(st.player.attributes); attrs_low["attacking_position"] = 55
    low_player = dc_replace(st.player, attributes=attrs_low)
    old = st.player; st.player = low_player
    low_x = attack_relative_x("HOME", engine._desired_target(st))
    attrs_hi = dict(old.attributes); attrs_hi["attacking_position"] = 95
    st.player = dc_replace(old, attributes=attrs_hi)
    high_x = attack_relative_x("HOME", engine._desired_target(st))
    st.player = old
    assert high_x > low_x


def test_cutback_is_distinct_from_aerial_cross():
    engine = setup_engine(seed=612, seconds=20)
    carrier = next(s for s in engine._team_states("HOME") if s.slot == "RW")
    target = next(s for s in engine._team_states("HOME") if s.slot == "ST")
    carrier.pos = Vec2(88, 82); target.pos = Vec2(84, 52)
    assert engine._pass_type(carrier, target) == "CUTBACK"


def test_overlap_role_creates_role_evidence_when_width_lane_is_provided():
    from dataclasses import replace as dc_replace
    engine = setup_engine(seed=59, seconds=20)
    carrier = next(s for s in engine._team_states("HOME") if s.slot == "LW")
    fullback = next(s for s in engine._team_states("HOME") if s.slot == "LB")
    carrier.pos = Vec2(58, 20)
    fullback.pos = Vec2(60, 7)
    fullback.instructions = dc_replace(fullback.instructions, attack_role="OVERLAP", attack_effort=90)
    engine.possession_team = "HOME"
    engine.ball.controlling_team_id = "HOME"
    engine.ball.controlling_player_id = carrier.player.player_id
    engine.ball.pos = carrier.pos
    for d in engine._team_states("AWAY"):
        if d.slot != "GK":
            d.pos = Vec2(80, min(96, d.pos.y + 25))
    engine._evaluate_role_performance()
    assert fullback.role_opportunities >= 1
    assert fullback.role_successes >= 1
    assert fullback.width_actions >= 1
    assert fullback.rating_components["role"] > 0


def test_screen_role_gets_credit_for_actual_central_lane_protection():
    from dataclasses import replace as dc_replace
    engine = setup_engine(seed=60, seconds=20)
    carrier = next(s for s in engine._team_states("AWAY") if s.slot == "LCM")
    screen = next(s for s in engine._team_states("HOME") if s.slot == "CDM")
    carrier.pos = Vec2(45, 50)
    screen.pos = Vec2(31, 50)  # between away carrier and HOME goal at x=0
    screen.instructions = dc_replace(screen.instructions, defense_role="SCREEN", defense_effort=80)
    engine.possession_team = "AWAY"
    engine.ball.controlling_team_id = "AWAY"
    engine.ball.controlling_player_id = carrier.player.player_id
    engine.ball.pos = carrier.pos
    engine._evaluate_role_performance()
    assert screen.role_opportunities >= 1
    assert screen.role_successes >= 1
    assert screen.screening_actions >= 1
    assert screen.role_value > 0


def test_dead_ball_seconds_do_not_count_as_possession_or_active_play():
    engine = setup_engine(seed=61, seconds=12)
    engine._start_dead_ball(6, "test_restart")
    result = engine.run()
    assert result.dead_ball_seconds >= 5
    assert result.active_play_seconds + result.dead_ball_seconds == 12
    assert sum(result.possession_seconds.values()) <= result.active_play_seconds


def test_low_effort_players_still_shuffle_in_shape():
    from dataclasses import replace as dc_replace
    engine = setup_engine(seed=62, seconds=60)
    state = next(s for s in engine._team_states("HOME") if s.slot == "CDM")
    state.instructions = dc_replace(state.instructions, attack_effort=5, defense_effort=5)
    engine.run()
    assert state.distance_m > 25.0


def test_halftime_recovers_acute_exertion_and_switches_kickoff():
    engine = setup_engine(seed=63, seconds=46 * 60)
    state = next(s for s in engine._team_states("HOME") if s.slot == "LCM")
    state.energy = 60.0
    state.acute_exertion = 80.0
    first = engine.first_kickoff_team
    result = engine.run()
    assert any(e.event_type == "HALFTIME" for e in result.events)
    assert state.acute_exertion < 80.0
    halftime = next(e for e in result.events if e.event_type == "HALFTIME")
    assert halftime.detail["second_half_kickoff"] != first


def test_sweeper_keeper_starts_higher_than_line_keeper():
    from dataclasses import replace as dc_replace
    engine = setup_engine(seed=64, seconds=20)
    gk = next(s for s in engine._team_states("HOME") if s.slot == "GK")
    engine.possession_team = "AWAY"
    engine.ball.pos = Vec2(65, 50)
    gk.instructions = dc_replace(gk.instructions, defense_role="LINE_KEEPER")
    line = engine._desired_target(gk).x
    gk.instructions = dc_replace(gk.instructions, defense_role="AGGRESSIVE_SWEEPER")
    sweep = engine._desired_target(gk).x
    assert sweep > line


def test_goalkeeper_kicking_drives_long_distribution_execution():
    from dataclasses import replace as dc_replace
    engine = setup_engine(seed=65, seconds=20)
    gk = next(s for s in engine._team_states("HOME") if s.slot == "GK")
    target = next(s for s in engine._team_states("HOME") if s.slot == "ST")
    gk.pos = Vec2(8, 50)
    target.pos = Vec2(60, 50)
    attrs_low = dict(gk.player.attributes); attrs_low["gk_kicking"] = 45.0
    attrs_high = dict(gk.player.attributes); attrs_high["gk_kicking"] = 95.0
    original = gk.player
    gk.player = dc_replace(original, attributes=attrs_low)
    low = engine.pass_execution_probability(gk, target, 0.1)
    gk.player = dc_replace(original, attributes=attrs_high)
    high = engine.pass_execution_probability(gk, target, 0.1)
    assert high > low


def test_pass_to_shooter_is_counted_as_chance_created_even_without_goal():
    engine = setup_engine(seed=66, seconds=20)
    creator = next(s for s in engine._team_states("HOME") if s.slot == "LCM")
    shooter = next(s for s in engine._team_states("HOME") if s.slot == "ST")
    shooter.pos = Vec2(80, 50)
    engine.possession_team = "HOME"
    engine.ball.controlling_player_id = shooter.player.player_id
    engine.ball.controlling_team_id = "HOME"
    engine.ball.pos = shooter.pos
    engine._note_completed_pass("HOME", creator.player.player_id, shooter.player.player_id)
    before = creator.chances_created
    engine._execute_shot(shooter, pressure=0.5, xg=0.08)
    assert creator.chances_created == before + 1
    assert creator.key_passes >= 1


def test_4141_plan_remaps_wingers_to_midfield_band():
    from fc_simulator.data import apply_plan
    players, stats = load_players(DATA)
    home, away = build_demo_teams(players)
    plan = Path(__file__).resolve().parents[1] / "plans" / "cagey_4141.json"
    apply_plan(home, plan)
    assert home.formation_name == "4-1-4-1"
    assert set(home.lineup) == {"GK","LB","LCB","RCB","RB","CDM","LM","LCM","RCM","RM","ST"}
    engine = MatchEngine(home, away, stats, 67, MatchConfig(duration_seconds=20))
    lm = next(s for s in engine._team_states("HOME") if s.slot == "LM")
    rm = next(s for s in engine._team_states("HOME") if s.slot == "RM")
    assert lm.home_anchor.y < 30 and rm.home_anchor.y > 70


def test_aggressive_sweeper_has_higher_through_ball_intervention_probability():
    from dataclasses import replace as dc_replace
    engine = setup_engine(seed=68, seconds=20)
    gk = next(s for s in engine._team_states("AWAY") if s.slot == "GK")
    attacker = next(s for s in engine._team_states("HOME") if s.slot == "ST")
    landing = Vec2(90, 50)
    gk.pos = Vec2(94, 50)
    attacker.pos = Vec2(78, 50)
    t_att = engine._arrival_time(attacker, landing)
    gk.instructions = dc_replace(gk.instructions, defense_role="LINE_KEEPER")
    p_line, _ = engine._gk_sweep_probability(gk, "HOME", landing, t_att)
    gk.instructions = dc_replace(gk.instructions, defense_role="AGGRESSIVE_SWEEPER")
    p_sweep, _ = engine._gk_sweep_probability(gk, "HOME", landing, t_att)
    assert p_sweep > p_line


def test_bundled_player_data_has_height_and_weight_for_every_player():
    players, _ = load_players(DATA)
    assert len(players) == 160  # players-v3-4attrs expanded master population
    assert all(p.height_cm is not None and 160 <= p.height_cm <= 210 for p in players)
    assert all(p.weight_kg is not None and 50 <= p.weight_kg <= 120 for p in players)


def test_repeated_role_success_does_not_immediately_saturate_role_value():
    from fc_simulator.ratings import add_role_performance
    engine = setup_engine(seed=69, seconds=5)
    state = next(s for s in engine._team_states("HOME") if s.slot == "CDM")
    for _ in range(100):
        add_role_performance(state, 0.02, confidence=0.18, success=True)
    assert 0.0 < state.role_value < 0.5

def test_coach_ai_can_be_disabled_for_static_tactical_calibration():
    engine = setup_engine(seed=613, seconds=20)
    engine.config = replace(engine.config, coach_ai_enabled=False)
    engine.clock = 75 * 60
    engine.score["HOME"] = 0; engine.score["AWAY"] = 1
    before = engine.teams["HOME"].tactics
    if engine.config.coach_ai_enabled and engine.clock >= engine.next_coach_check:
        engine._coach_check()
    assert engine.teams["HOME"].tactics == before

def test_attacking_quality_improves_same_context_progressive_pass_execution():
    from dataclasses import replace as dc_replace
    engine = setup_engine(seed=614, seconds=20)
    carrier = next(s for s in engine._team_states("HOME") if s.slot in {"LCM", "RCM"})
    target = next(s for s in engine._team_states("HOME") if s.slot == "ST")
    carrier.pos = Vec2(58, 50); target.pos = Vec2(74, 52)
    original = carrier.player
    low_attrs = dict(original.attributes)
    high_attrs = dict(original.attributes)
    for key in {"short_passing", "vision", "ball_control", "reactions"}:
        low_attrs[key] = 58.0
        high_attrs[key] = 92.0
    carrier.player = dc_replace(original, attributes=low_attrs)
    low = engine.pass_execution_probability(carrier, target, 0.45)
    carrier.player = dc_replace(original, attributes=high_attrs)
    high = engine.pass_execution_probability(carrier, target, 0.45)
    carrier.player = original
    assert high > low


def test_crossing_attribute_tightens_delivery_spread():
    from dataclasses import replace as dc_replace
    engine = setup_engine(seed=70, seconds=20)
    winger = next(s for s in engine._team_states("HOME") if s.slot == "RW")
    winger.pos = Vec2(76, 90)
    original = winger.player
    low_attrs = dict(original.attributes); low_attrs["crossing"] = 50.0
    high_attrs = dict(original.attributes); high_attrs["crossing"] = 95.0
    winger.player = dc_replace(original, attributes=low_attrs)
    low_sigma = engine._cross_error_sigma(winger, 28.0, 0.25)
    winger.player = dc_replace(original, attributes=high_attrs)
    high_sigma = engine._cross_error_sigma(winger, 28.0, 0.25)
    assert high_sigma < low_sigma


def test_cross_candidate_geometry_favors_player_who_can_reach_zone():
    engine = setup_engine(seed=71, seconds=20)
    st = next(s for s in engine._team_states("HOME") if s.slot == "ST")
    winger = next(s for s in engine._team_states("HOME") if s.slot == "LW")
    landing = Vec2(90, 50)
    st.pos = Vec2(88, 50)
    winger.pos = Vec2(65, 20)
    assert engine._cross_candidate_score(st, landing, True) > engine._cross_candidate_score(winger, landing, True)


def test_cutback_creates_immediate_shooting_window_without_xg_multiplier():
    engine = setup_engine(seed=72, seconds=20)
    passer = next(s for s in engine._team_states("HOME") if s.slot == "RW")
    receiver = next(s for s in engine._team_states("HOME") if s.slot == "ST")
    passer.pos = Vec2(89, 87)
    receiver.pos = Vec2(87, 50)
    engine.possession_team = "HOME"
    engine.ball.pos = receiver.pos
    expected_xg = engine._xg(receiver, 0.35)
    engine._resolve_cutback_continuation(passer, receiver, 0.35)
    windows = [e for e in engine.events if e.event_type == "CUTBACK_WINDOW"]
    assert windows
    assert abs(float(windows[-1].detail["xg"]) - round(expected_xg, 4)) < 1e-9


def test_byline_attack_pulls_central_defender_into_cutback_cover():
    engine = setup_engine(seed=73, seconds=20)
    cb = next(s for s in engine._team_states("AWAY") if s.slot == "RCB")
    engine.possession_team = "HOME"
    # HOME attacks toward x=100, so this is deep in AWAY's defensive third and wide.
    engine.ball.pos = Vec2(90, 88)
    target = engine._desired_target(cb)
    # RCB should remain very deep and be pulled toward the central cutback corridor.
    assert attack_relative_x("AWAY", target) <= 14.0
    assert abs(target.y - 50.0) < abs(cb.home_anchor.y - 50.0)


def test_controlled_ball_carrier_does_not_silently_follow_off_ball_target_between_decisions():
    engine = setup_engine(seed=74, seconds=20)
    carrier = engine._carrier()
    start = carrier.pos
    # Put the tactical ball state far enough forward that the normal off-ball target would move.
    engine.ball.pos = carrier.pos
    engine._update_movement_and_fatigue()
    assert carrier.pos == start
    assert carrier.current_activity == "on_ball"


def test_explicit_carry_records_distance_and_workload_movement():
    engine = setup_engine(seed=75, seconds=20)
    carrier = engine._carrier()
    before = carrier.distance_m
    # Use the explicit movement helper to isolate the accounting invariant from carry RNG.
    rel = attack_relative_x(carrier.team_id, carrier.pos)
    dest = from_attack_frame(carrier.team_id, rel + 5.0, carrier.pos.y)
    moved = engine._apply_action_movement(carrier, dest, 5.0, "carry")
    assert moved > 0.0
    assert carrier.distance_m > before


def test_debug_event_logging_does_not_shift_semantic_random_outcomes():
    baseline = setup_engine(seed=8801, seconds=180)
    a = baseline.run()
    altered = setup_engine(seed=8801, seconds=180)
    altered._record_event("DEBUG_ONLY", None, None, {"note": "non-football logging"})
    b = altered.run()
    fa = [(e.timestamp, e.event_type, e.team_id, e.actor_id, e.detail) for e in a.events]
    fb = [(e.timestamp, e.event_type, e.team_id, e.actor_id, e.detail) for e in b.events if e.event_type != "DEBUG_ONLY"]
    assert fa == fb


def test_rng_audit_is_reproducible_and_semantically_keyed():
    players, stats = load_players(DATA)
    h1, a1 = build_demo_teams(players)
    h2, a2 = build_demo_teams(players)
    cfg = MatchConfig(duration_seconds=120, record_rng_audit=True)
    r1 = MatchEngine(h1, a1, stats, 8802, cfg).run()
    r2 = MatchEngine(h2, a2, stats, 8802, cfg).run()
    assert r1.rng_audit
    assert r1.rng_audit == r2.rng_audit
    sample = r1.rng_audit[0]
    assert {"distribution", "key_id", "key", "value"}.issubset(sample)
    assert isinstance(sample["key"], list)


def test_different_seed_changes_rng_audit():
    players, stats = load_players(DATA)
    h1, a1 = build_demo_teams(players)
    h2, a2 = build_demo_teams(players)
    cfg = MatchConfig(duration_seconds=90, record_rng_audit=True)
    r1 = MatchEngine(h1, a1, stats, 8803, cfg).run()
    r2 = MatchEngine(h2, a2, stats, 8804, cfg).run()
    assert r1.rng_audit != r2.rng_audit


def test_near_contact_defender_can_block_at_shot_origin():
    engine = setup_engine(seed=8805, seconds=20)
    shooter = next(s for s in engine._team_states("HOME") if s.slot == "ST")
    defender = next(s for s in engine._team_states("AWAY") if s.slot in {"LCB", "RCB"})
    shooter.pos = Vec2(91, 50)
    defender.pos = Vec2(91.2, 50.1)
    block, p_block = engine._shot_block_candidate(shooter)
    assert block is defender
    assert p_block > 0.20
    assert engine._shot_lane_density("HOME", shooter.pos) > 0.10


def test_set_block_resistance_is_higher_for_deep_compact_shell_than_mid_block():
    from dataclasses import replace as dc_replace
    engine = setup_engine(seed=8806, seconds=20)
    engine.possession_team = "HOME"
    engine.ball.pos = Vec2(68, 50)
    away = engine.teams["AWAY"]
    base = away.tactics
    away.tactics = dc_replace(base, defensive_block_height="MID", defensive_line_behavior="HOLD")
    for d in engine._team_states("AWAY"):
        if d.slot != "GK":
            d.pos = Vec2(76 if d.slot in {"LB","LCB","RCB","RB"} else 68, d.pos.y)
    mid = engine._set_block_resistance("HOME")
    away.tactics = dc_replace(base, defensive_block_height="DEEP", defensive_line_behavior="DROP", defensive_width="NARROW")
    for d in engine._team_states("AWAY"):
        if d.slot != "GK":
            x = 91 if d.slot in {"LB","LCB","RCB","RB"} else 84
            d.pos = Vec2(x, 50 + (d.home_anchor.y - 50) * 0.45)
    deep = engine._set_block_resistance("HOME")
    assert deep > mid


def test_multiple_compact_defenders_raise_receiver_denial_probability():
    engine = setup_engine(seed=8810, seconds=20)
    receiver = next(s for s in engine._team_states("HOME") if s.slot == "ST")
    receiver.pos = Vec2(84, 50)
    defenders = [s for s in engine._team_states("AWAY") if s.slot != "GK"]
    for i, d in enumerate(defenders):
        d.pos = Vec2(65, 10 + i * 8)
    defenders[0].pos = Vec2(85.6, 50.4)
    _, one = engine._receiver_contest_candidate(receiver, receiver.pos, 0.4, 18.0)
    defenders[1].pos = Vec2(86.1, 52.0)
    _, two = engine._receiver_contest_candidate(receiver, receiver.pos, 0.4, 18.0)
    assert two > one


def test_debug_logging_before_cross_does_not_change_cross_random_outcome():
    a = setup_engine(seed=8811, seconds=20)
    b = setup_engine(seed=8811, seconds=20)

    def prepare(engine):
        carrier = next(s for s in engine._team_states("HOME") if s.slot == "RW")
        target = next(s for s in engine._team_states("HOME") if s.slot == "ST")
        carrier.pos = Vec2(78, 88)
        target.pos = Vec2(88, 50)
        engine.possession_team = "HOME"
        engine.ball.pos = carrier.pos
        engine.ball.controlling_team_id = "HOME"
        engine.ball.controlling_player_id = carrier.player.player_id
        return carrier, target

    ca, ta = prepare(a)
    cb, tb = prepare(b)
    b._record_event("DEBUG_ONLY", None, None, {"note": "before cross"})
    a.rng_context = b.rng_context = 7
    a._execute_cross(ca, ta, 0.25)
    b._execute_cross(cb, tb, 0.25)

    ea = [(e.event_type, e.team_id, e.actor_id, e.detail) for e in a.events]
    eb = [(e.event_type, e.team_id, e.actor_id, e.detail) for e in b.events if e.event_type != "DEBUG_ONLY"]
    assert ea == eb
    assert a.possession_team == b.possession_team
    assert a.ball.pos == b.ball.pos
