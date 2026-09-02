"""Touchline × FC Simulator v0.7 integration tests.

Run:  .venv/bin/python -m pytest tests_integration.py -q
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / "simulator"))
sys.path.insert(0, str(ROOT))

import bridge
from bridge import ATTR_MAP, ATTACK_ROLE_MAP, DEFENSE_ROLE_MAP, TACTIC_KEY_MAP, TACTIC_VALUE_MAP
from server import app
from fc_simulator.tactics import ATTACK_ROLES, DEFENSE_ROLES, TACTIC_OPTIONS

client = TestClient(app)

HTML = (ROOT / "web" / "touchline.html").read_text(encoding="utf-8")
FRONTEND_PLAYERS = json.loads(re.search(r"const DETAILED_PLAYER_PROFILES = (\[.*?\]);", HTML, re.S).group(1))
BY_NAME = {p["name"]: p for p in FRONTEND_PLAYERS}
BUNDLED = json.loads((ROOT / "simulator" / "data" / "players.json").read_text())
BUNDLED_BY_NAME = {p["name"]: p for p in BUNDLED["players"]}


def generic(pid, name, pos, ht=184, wt=77):
    gk = pos == "GK"
    a = {k: (75.0 if not k.startswith("gk") else (75.0 if gk else 10.0)) for k in ATTR_MAP}
    if gk:
        for k in ("fin", "dri", "cro", "vol", "lsh"):
            a[k] = 20.0
    return {"id": pid, "name": name, "pos": pos, "foot": "R", "wf": 3, "side": "C",
            "ht": ht, "wt": wt, "ovr": 75, "pot": 78, "age": 24, "a": a}


def liverpool_side(formation="433", tactics=None, instructions=None):
    """Real detailed Liverpool players + generic fillers, exactly as the site sends them."""
    det = lambda n: BY_NAME[n]
    slots433 = {
        "GK": det("Alisson"), "LB": generic("liv_gen_lb_01", "Callum Reeve", "LB"),
        "LCB": det("Virgil van Dijk"), "RCB": generic("liv_gen_cb_01", "Elias Whitmore", "CB"),
        "RB": generic("liv_gen_rb_01", "Owen Fairhurst", "RB"),
        "LCM": det("Dominik Szoboszlai"), "CM": det("Ryan Gravenberch"),
        "RCM": generic("liv_gen_cm_01", "Sam Okonkwo", "CM"),
        "LW": generic("liv_gen_lw_01", "Kofi Adjei", "LW"), "ST": det("Hugo Ekitike"),
        "RW": det("Mohamed Salah"),
    }
    if formation == "4231":
        s = slots433
        lineup = {"GK": s["GK"], "LB": s["LB"], "LCB": s["LCB"], "RCB": s["RCB"], "RB": s["RB"],
                  "LDM": s["LCM"], "RDM": s["CM"], "LW": s["LW"], "CAM": s["RCM"],
                  "RW": s["RW"], "ST": s["ST"]}
    elif formation == "4141":
        s = slots433
        lineup = {"GK": s["GK"], "LB": s["LB"], "LCB": s["LCB"], "RCB": s["RCB"], "RB": s["RB"],
                  "CDM": s["CM"], "LM": s["LW"], "LCM": s["LCM"], "RCM": s["RCM"],
                  "RM": s["RW"], "ST": s["ST"]}
    else:
        lineup = slots433
    return {"club_id": "LIV", "name": "Liverpool", "formation": formation,
            "lineup": lineup,
            "bench": [generic("liv_gen_gk_01", "Jack Weaver", "GK", ht=191),
                      generic("liv_gen_st_01", "Danny Hobbs", "ST"),
                      generic("liv_gen_cb_02", "Tom Askew", "CB")],
            "tactics": tactics or {"buildUpTempo": "Balanced", "pressingIntensity": "Selective"},
            "player_instructions": instructions or {}}


def everton_side():
    lineup = {
        "GK": generic("eve_gk_01", "EG One", "GK", ht=190),
        "LB": generic("eve_lb_01", "EL One", "LB"), "LCB": generic("eve_cb_01", "EC One", "CB"),
        "RCB": generic("eve_cb_02", "EC Two", "CB"), "RB": generic("eve_rb_01", "ER One", "RB"),
        "LCM": generic("eve_cm_01", "EM One", "CM"), "CM": generic("eve_cm_02", "EM Two", "CM"),
        "RCM": generic("eve_cm_03", "EM Three", "CM"),
        "LW": generic("eve_lw_01", "EW One", "LW"), "ST": generic("eve_st_01", "ES One", "ST"),
        "RW": generic("eve_rw_01", "EW Two", "RW"),
    }
    return {"club_id": "EVE", "name": "Everton", "formation": "433", "lineup": lineup,
            "bench": [generic("eve_st_02", "ES Two", "ST")],
            "tactics": {"defensiveBlockHeight": "Deep", "pressingIntensity": "Passive"},
            "player_instructions": {}}


def start_req(seed=12345, mode="full", minutes=90, home=None, away=None, coach_ai=None, audit=False):
    return {"fixture_id": "MW01-LIV-EVE", "seed": seed, "mode": mode,
            "config": {"duration_seconds": minutes * 60, "record_rng_audit": audit},
            "coach_ai": coach_ai or {"home": False, "away": True},
            "home_team": home or liverpool_side(), "away_team": away or everton_side()}


# ── health ───────────────────────────────────────────────────────────────────
def test_health():
    r = client.get("/api/health").json()
    assert r["status"] == "ok" and r["engine"] == "FC Simulator" and r["engine_version"] == "0.7"


# ── §59 attribute mapping: frontend Salah ≡ bundled v0.7 Salah ───────────────
def test_attribute_mapping_salah():
    fe = BY_NAME["Mohamed Salah"]
    p = bridge.map_player(fe)
    ref = BUNDLED_BY_NAME["Mohamed Salah"]
    for engine_key, value in p.attributes.items():
        assert value == pytest.approx(float(ref["attributes"][engine_key])), engine_key
    assert p.height_cm == float(ref["height_cm"]) and p.weight_kg == float(ref["weight_kg"])
    # the classic disasters:
    assert p.attributes["standing_tackle"] == float(fe["a"]["sta"])
    assert p.attributes["stamina"] == float(fe["a"]["stam"])
    assert p.attributes["ball_control"] == float(fe["a"]["bco"])
    # players-v3: Balance is a distinct attribute with its own key — the old
    # ambiguous 'bal' key no longer exists anywhere in the contract.
    assert p.attributes["balance"] == float(fe["a"]["bln"])
    assert "bal" not in fe["a"]
    assert p.attributes["free_kick_accuracy"] == float(fe["a"]["fka"])
    assert p.attributes["penalties"] == float(fe["a"]["pen"])
    assert p.attributes["composure"] == float(fe["a"]["cmp"])
    assert p.height_cm == float(fe["ht"]) and p.weight_kg == float(fe["wt"])


# ── §60 all 13 tactics × every frontend value ────────────────────────────────
def test_tactics_mapping_all():
    groups = re.search(r"const TACTIC_GROUPS = \[(.*?)\n\];", HTML, re.S).group(1)
    frontend_options = {}
    for m in re.finditer(r"id:'(\w+)',label:'[^']*',options:\[([^\]]*)\]", groups):
        frontend_options[m.group(1)] = re.findall(r"'([^']+)'", m.group(2))
    assert set(frontend_options) == set(TACTIC_KEY_MAP), "frontend tactics drifted from map"
    for fkey, opts in frontend_options.items():
        for val in opts:
            t = bridge.map_tactics({fkey: val})
            got = getattr(t, TACTIC_KEY_MAP[fkey])
            assert got in TACTIC_OPTIONS[TACTIC_KEY_MAP[fkey]], (fkey, val, got)
            assert got == TACTIC_VALUE_MAP[val]
    with pytest.raises(bridge.BridgeError):
        bridge.map_tactics({"buildUpTempo": "Bogus"})


# ── §61 every frontend role maps to a valid engine enum ──────────────────────
def test_role_mapping_all():
    roles_block = re.search(r"const ROLES = \{(.*?)\n\};", HTML, re.S).group(1)
    atk = set(re.findall(r"atk:\[([^\]]*)\]", roles_block))
    dfn = set(re.findall(r"def:\[([^\]]*)\]", roles_block))
    atk_roles = {r for grp in atk for r in re.findall(r"'([^']+)'", grp)}
    def_roles = {r for grp in dfn for r in re.findall(r"'([^']+)'", grp)}
    assert atk_roles, "no attack roles extracted"
    for r in atk_roles:
        assert r in ATTACK_ROLE_MAP, f"unmapped attack role: {r}"
        assert ATTACK_ROLE_MAP[r] in ATTACK_ROLES
    for r in def_roles:
        assert r in DEFENSE_ROLE_MAP, f"unmapped defense role: {r}"
        assert DEFENSE_ROLE_MAP[r] in DEFENSE_ROLES
    with pytest.raises(bridge.BridgeError):
        bridge.map_instructions({"attackRole": "Galactico", "defenseRole": "Hold Zone"})


# ── §62 formations: all 11 arrive on correct engine slots; no duplicates ─────
@pytest.mark.parametrize("fid,engine_name", [("433", "4-3-3"), ("4231", "4-2-3-1"), ("4141", "4-1-4-1")])
def test_formation_lineups(fid, engine_name):
    team = bridge.build_team(liverpool_side(fid), "HOME")
    assert team.formation_name == engine_name
    assert len(team.lineup) == 11
    assert len({p.player_id for p in team.lineup.values()}) == 11
    from fc_simulator.formations import FORMATIONS as EF
    assert set(team.lineup) == set(EF[engine_name])
    assert team.lineup["GK"].primary_position == "GK"
    salah_slot = next(s for s, p in team.lineup.items() if p.name == "Mohamed Salah")
    assert salah_slot == {"433": "RW", "4231": "RAM", "4141": "RM"}[fid]


# ── §25 unsupported formations are rejected, never remapped ──────────────────
def test_unsupported_formation_rejected():
    side = liverpool_side()
    side["formation"] = "352"
    r = client.post("/api/matches/start", json=start_req(home=side))
    assert r.status_code == 400
    assert "not yet supported" in r.json()["detail"]


# ── §56 same seed ⇒ identical full match via the API ─────────────────────────
def test_same_seed_reproducible():
    a = client.post("/api/matches/start", json=start_req(seed=999)).json()
    b = client.post("/api/matches/start", json=start_req(seed=999)).json()
    assert a["full_time"]["events"] == b["full_time"]["events"]
    assert a["full_time"]["score"] == b["full_time"]["score"]
    assert a["full_time"]["player_stats"] == b["full_time"]["player_stats"]


# ── §57 different seed can differ ────────────────────────────────────────────
def test_different_seed_differs():
    a = client.post("/api/matches/start", json=start_req(seed=1)).json()
    b = client.post("/api/matches/start", json=start_req(seed=2)).json()
    assert a["full_time"]["events"] != b["full_time"]["events"]


# ── §55 OVR is metadata only ─────────────────────────────────────────────────
def test_ovr_only_change_identical():
    def with_ovr(delta):
        home = liverpool_side()
        home = json.loads(json.dumps(home))
        for slot, p in home["lineup"].items():
            p["ovr"] = int(p.get("ovr", 75)) + delta
        return client.post("/api/matches/start", json=start_req(seed=4242, home=home)).json()
    a, b = with_ovr(0), with_ovr(-20)
    assert a["full_time"]["events"] == b["full_time"]["events"]
    assert a["full_time"]["score"] == b["full_time"]["score"]


# ── §58 debug/audit logging does not change football ─────────────────────────
def test_rng_audit_does_not_change_outcomes():
    a = client.post("/api/matches/start", json=start_req(seed=808, audit=False)).json()
    b = client.post("/api/matches/start", json=start_req(seed=808, audit=True)).json()
    assert a["full_time"]["events"] == b["full_time"]["events"]


# ── §63/§9 run-vs-advance parity through the API ─────────────────────────────
def test_api_advance_parity_with_full_run():
    full = client.post("/api/matches/start", json=start_req(seed=31337)).json()
    live = client.post("/api/matches/start", json=start_req(seed=31337, mode="live")).json()
    mid = live["match_id"]
    events = list(live["new_events"])
    last = live["event_count"]
    snap = live
    while snap["status"] != "ft":
        snap = client.post(f"/api/matches/{mid}/advance",
                           json={"seconds": 300, "last_event_index": last}).json()
        events += snap["new_events"]
        last = snap["event_count"]
    assert [e for e in events] == full["full_time"]["events"]
    assert snap["full_time"]["score"] == full["full_time"]["score"]
    client.delete(f"/api/matches/{mid}")


# ── §64 API vs direct Python parity ──────────────────────────────────────────
def test_api_vs_direct_python_parity():
    # The API's instant path runs the CONTINUOUS transport (run_continuous), not
    # the legacy per-second MatchEngine.run() loop. The direct Python reference
    # must therefore be the SAME continuous execution, and must expose the same
    # authoritative event stream the server builds (via _full_event_stream).
    # Comparing against the legacy engine would compare two different engines.
    from fc_simulator.engine import MatchEngine
    from fc_simulator.continuous import run_continuous
    from server import _full_event_stream
    home = bridge.build_team(liverpool_side(), "HOME")
    away = bridge.build_team(everton_side(), "AWAY")
    cfg = bridge.build_config({"duration_seconds": 90 * 60}, {"home": False, "away": True})
    engine = MatchEngine(home, away, bridge.ATTRIBUTE_STATS, 2024, cfg)
    _result, lab = run_continuous(engine)
    engine.result()                      # record FULL_TIME (same as the server path)
    direct_events = _full_event_stream(engine, lab)
    api = client.post("/api/matches/start", json=start_req(seed=2024)).json()
    assert direct_events == api["full_time"]["events"]


# ── §65 tactical change at 60': past is identical, future may diverge ────────
def test_tactical_change_counterfactual():
    control = client.post("/api/matches/start", json=start_req(seed=6060)).json()
    live = client.post("/api/matches/start", json=start_req(seed=6060, mode="live")).json()
    mid = live["match_id"]
    events = list(live["new_events"]); last = live["event_count"]
    snap = live
    while snap["clock_seconds"] < 3600:
        snap = client.post(f"/api/matches/{mid}/advance",
                           json={"seconds": min(600, 3600 - snap["clock_seconds"]), "last_event_index": last}).json()
        events += snap["new_events"]; last = snap["event_count"]
    r = client.post(f"/api/matches/{mid}/tactics", json={
        "team": "HOME",
        "tactics": {"buildUpTempo": "Balanced", "passingDirectness": "Mixed",
                    "progressionRisk": "Ambitious", "attackingWidth": "Balanced",
                    "chanceCreationFocus": "Balanced", "boxCommitment": "Balanced",
                    "afterWinningPossession": "Balanced", "afterLosingPossession": "Balanced",
                    "defensiveBlockHeight": "Mid", "pressingIntensity": "Selective",
                    "defensiveWidth": "Balanced", "markingOrientation": "Hybrid",
                    "defensiveLineBehavior": "Hold"}})
    assert r.status_code == 200
    while snap["status"] != "ft":
        snap = client.post(f"/api/matches/{mid}/advance",
                           json={"seconds": 600, "last_event_index": last}).json()
        events += snap["new_events"]; last = snap["event_count"]
    ctrl_events = control["full_time"]["events"]
    pre_ctrl = [e for e in ctrl_events if e["timestamp"] <= 3600]
    # filter only the MANAGER-issued change (t=3600); engine-internal coach/risk
    # TACTIC_CHANGEs (cal10 GS policy) occur identically in both runs and must
    # stay in the comparison (cal11 seeds can produce them pre-3600).
    pre_live = [e for e in events if e["timestamp"] <= 3600
                and not (e["event_type"] == "TACTIC_CHANGE" and e["detail"].get("mode") == "MANAGER")]
    assert pre_live == pre_ctrl, "management change altered the past"
    client.delete(f"/api/matches/{mid}")


# ── §66 player instruction change at 60' ─────────────────────────────────────
def test_instruction_change_counterfactual():
    control = client.post("/api/matches/start", json=start_req(seed=6161)).json()
    live = client.post("/api/matches/start", json=start_req(seed=6161, mode="live")).json()
    mid = live["match_id"]
    events = list(live["new_events"]); last = live["event_count"]
    snap = live
    while snap["clock_seconds"] < 3600:
        snap = client.post(f"/api/matches/{mid}/advance",
                           json={"seconds": 600, "last_event_index": last}).json()
        events += snap["new_events"]; last = snap["event_count"]
    r = client.post(f"/api/matches/{mid}/instructions", json={
        "team": "HOME", "player_id": BY_NAME["Mohamed Salah"]["id"],
        "instructions": {"attackRole": "Inside Forward", "attackEffort": 80,
                         "defenseRole": "Press Fullback", "defenseEffort": 58}})
    assert r.status_code == 200
    while snap["status"] != "ft":
        snap = client.post(f"/api/matches/{mid}/advance",
                           json={"seconds": 600, "last_event_index": last}).json()
        events += snap["new_events"]; last = snap["event_count"]
    pre_ctrl = [e for e in control["full_time"]["events"] if e["timestamp"] <= 3600]
    pre_live = [e for e in events if e["timestamp"] <= 3600 and e["event_type"] != "INSTRUCTION_CHANGE"]
    assert pre_live == pre_ctrl
    client.delete(f"/api/matches/{mid}")


# ── §36 substitution validation ──────────────────────────────────────────────
def test_substitution_validation():
    live = client.post("/api/matches/start", json=start_req(seed=555, mode="live")).json()
    mid = live["match_id"]
    r = client.post(f"/api/matches/{mid}/substitution", json={
        "team": "HOME", "player_off": "nonexistent", "player_on": "liv_gen_st_01"})
    assert r.status_code == 400
    r = client.post(f"/api/matches/{mid}/substitution", json={
        "team": "HOME", "player_off": BY_NAME["Hugo Ekitike"]["id"], "player_on": "not_on_bench"})
    assert r.status_code == 400
    r = client.post(f"/api/matches/{mid}/substitution", json={
        "team": "HOME", "player_off": BY_NAME["Hugo Ekitike"]["id"], "player_on": "liv_gen_st_01"})
    assert r.status_code == 200 and r.json()["substitutions_used"] == 1
    client.delete(f"/api/matches/{mid}")


# ── validation: duplicates / missing GK / empty slot ─────────────────────────
def test_lineup_validation():
    side = liverpool_side()
    side["lineup"]["LW"] = side["lineup"]["RW"]
    r = client.post("/api/matches/start", json=start_req(home=side))
    assert r.status_code == 400 and "Duplicate" in r.json()["detail"]
    side2 = liverpool_side()
    side2["lineup"]["GK"] = generic("liv_gen_x", "Not A Keeper", "ST")
    r = client.post("/api/matches/start", json=start_req(home=side2))
    assert r.status_code == 400 and "goalkeeper" in r.json()["detail"]


# ── §P8 snapshot carries authoritative management state ──────────────────────
def test_snapshot_management_state():
    live = client.post("/api/matches/start", json=start_req(seed=7001, mode="live")).json()
    mid = live["match_id"]
    m = live["management"]
    for tid in ("HOME", "AWAY"):
        assert m[tid]["formation"] == "4-3-3"
        assert len(m[tid]["players"]) == 11
        assert set(m[tid]["tactics"]) == {
            "build_up_tempo", "passing_directness", "progression_risk", "attacking_width",
            "chance_creation_focus", "box_commitment", "after_winning_possession",
            "after_losing_possession", "defensive_block_height", "pressing_intensity",
            "defensive_width", "marking_orientation", "defensive_line_behavior"}
        for pid, p in m[tid]["players"].items():
            assert p["active"] is True and p["subbed_off"] is False
            assert set(p["instructions"]) == {"attack_role", "attack_effort", "defense_role", "defense_effort"}
    salah = BY_NAME["Mohamed Salah"]["id"]
    assert m["HOME"]["players"][salah]["slot"] == "RW"
    client.delete(f"/api/matches/{mid}")


# ── §P4 formation change returns the authoritative resulting assignment ──────
def test_formation_change_returns_authoritative_state():
    live = client.post("/api/matches/start", json=start_req(seed=7002, mode="live")).json()
    mid = live["match_id"]
    client.post(f"/api/matches/{mid}/advance", json={"seconds": 120, "last_event_index": live["event_count"]})
    r = client.post(f"/api/matches/{mid}/formation", json={"team": "HOME", "formation": "4231"})
    assert r.status_code == 200
    m = r.json()["management"]["HOME"]
    assert m["formation"] == "4-2-3-1"
    from fc_simulator.formations import FORMATIONS as EF
    active = {pid: p for pid, p in m["players"].items() if p["active"]}
    assert len(active) == 11
    assert {p["slot"] for p in active.values()} == set(EF["4-2-3-1"])
    # instructions defaulted per the ENGINE's rules for the new slots, exposed to the UI
    for p in active.values():
        assert p["instructions"]["attack_role"] in ATTACK_ROLES
        assert p["instructions"]["defense_role"] in DEFENSE_ROLES
    # unsupported live transition is rejected and state is unchanged
    r2 = client.post(f"/api/matches/{mid}/formation", json={"team": "HOME", "formation": "4141"})
    assert r2.status_code == 400
    check = client.get(f"/api/matches/{mid}").json()["management"]["HOME"]
    assert check["formation"] == "4-2-3-1"
    client.delete(f"/api/matches/{mid}")


# ── §P1 substitution response carries authoritative state ────────────────────
def test_substitution_returns_management_state():
    live = client.post("/api/matches/start", json=start_req(seed=7003, mode="live")).json()
    mid = live["match_id"]
    out_pid = BY_NAME["Hugo Ekitike"]["id"]
    r = client.post(f"/api/matches/{mid}/substitution", json={
        "team": "HOME", "player_off": out_pid, "player_on": "liv_gen_st_01"})
    assert r.status_code == 200
    m = r.json()["management"]["HOME"]
    assert m["players"][out_pid]["active"] is False and m["players"][out_pid]["subbed_off"] is True
    assert m["players"]["liv_gen_st_01"]["active"] is True
    assert m["players"]["liv_gen_st_01"]["slot"] == "ST"
    assert m["substitutions_used"] == 1
    client.delete(f"/api/matches/{mid}")


# ── §23 snapshot serialization (incl. ball) is observational only ────────────
def test_snapshot_serialization_is_observational():
    control = client.post("/api/matches/start", json=start_req(seed=9100, minutes=20)).json()
    live = client.post("/api/matches/start", json=start_req(seed=9100, minutes=20, mode="live")).json()
    mid = live["match_id"]
    events = list(live["new_events"]); last = live["event_count"]; snap = live
    while snap["status"] != "ft":
        for _ in range(3):                                   # extra read-only snapshots
            g = client.get(f"/api/matches/{mid}").json()
            assert "ball" in g and "management" in g
        snap = client.post(f"/api/matches/{mid}/advance",
                           json={"seconds": 90, "last_event_index": last}).json()
        events += snap["new_events"]; last = snap["event_count"]
    assert events == control["full_time"]["events"], "snapshot serialization altered football"
    assert snap["full_time"]["score"] == control["full_time"]["score"]
    client.delete(f"/api/matches/{mid}")
