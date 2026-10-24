"""Core Loop v2 engine hooks (E1-E4) — ENGINE CHANGE tests.

* flags-off identity: reference fixtures reproduce the pre-change (HEAD
  7861512) event-ledger digests, both untouched and with every new hook
  engaged-but-unset (empty set_pieces, auto corner routine, empty modifiers).
* E1 designated set-piece takers, E2 modifiers + scheduled commands,
  E3 new formations + remaps, E4 corner routines.

Run:  /tmp/tlvenv/bin/python -m pytest tests_engine_v2.py -q

The reference-case builder below deliberately imports nothing from the new
code at module import time, so the same cases can be run against a git-HEAD
export of the engine (``TLV2_ROOT=/tmp/base python tests_engine_v2.py``) to
(re)compute BASELINE_DIGESTS.
"""
from __future__ import annotations

import copy
import hashlib
import json
import os
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = Path(os.environ.get("TLV2_ROOT") or HERE)
sys.path.insert(0, str(ROOT / "simulator"))
sys.path.insert(0, str(ROOT))

FIXTURE = json.loads((HERE / "sandbox" / "visual" / "fixture_liv_eve.json").read_text())

# frontend 433 slot -> 4231 / 4141 frontend slot (same player)
_TO_4231 = {"GK": "GK", "LB": "LB", "LCB": "LCB", "RCB": "RCB", "RB": "RB",
            "LCM": "LDM", "CM": "RDM", "LW": "LW", "RCM": "CAM", "RW": "RW", "ST": "ST"}
_TO_4141 = {"GK": "GK", "LB": "LB", "LCB": "LCB", "RCB": "RCB", "RB": "RB",
            "CM": "CDM", "LW": "LM", "LCM": "LCM", "RCM": "RCM", "RW": "RM", "ST": "ST"}


def _clone_bench(side: dict, slots=("LB", "CM", "LW", "ST", "RCB", "RW")) -> list:
    out = list(side.get("bench") or [])
    for s in slots:
        p = copy.deepcopy(side["lineup"][s])
        p["id"] = p["id"] + "_b2"
        p["name"] = p["name"] + " II"
        p["a"] = {k: max(20.0, float(v) - 4.0) for k, v in p["a"].items()}
        out.append(p)
    return out


def _side(which: str, formation: str = "433", bench_plus: bool = False) -> dict:
    side = copy.deepcopy(FIXTURE[which])
    if bench_plus:
        side["bench"] = _clone_bench(side)
    if formation != "433":
        m = {"4231": _TO_4231, "4141": _TO_4141}[formation]
        side["lineup"] = {m[k]: v for k, v in side["lineup"].items()}
        side["formation"] = formation
    return side


def _req(seed: int, home: dict, away: dict, ai=(False, False)) -> dict:
    return {"fixture_id": "V2-REF", "seed": seed, "mode": "full",
            "config": {"duration_seconds": 5400, "record_rng_audit": False},
            "coach_ai": {"home": ai[0], "away": ai[1]},
            "home_team": home, "away_team": away}


def _full_tactics(**over) -> dict:
    t = {"buildUpTempo": "Balanced", "passingDirectness": "Mixed", "progressionRisk": "Balanced",
         "attackingWidth": "Balanced", "chanceCreationFocus": "Balanced", "boxCommitment": "Balanced",
         "afterWinningPossession": "Balanced", "afterLosingPossession": "Balanced",
         "defensiveBlockHeight": "Mid", "pressingIntensity": "Selective", "defensiveWidth": "Balanced",
         "markingOrientation": "Zonal", "defensiveLineBehavior": "Hold"}
    t.update(over)
    return t


def reference_cases() -> list[tuple[str, dict, list]]:
    """(name, start_request, commands[{sim_clock, kind, payload}])."""
    cases = []
    fx = copy.deepcopy(FIXTURE)
    fx["mode"] = "full"
    cases.append(("liv_eve", fx, []))
    cases.append(("liv_eve_ai", _req(20260827, _side("home_team", bench_plus=True),
                                     _side("away_team", bench_plus=True), ai=(True, True)), []))
    cases.append(("4231_v_4141_ai", _req(11, _side("home_team", "4231", True),
                                         _side("away_team", "4141", True), ai=(True, True)), []))
    for seed in (101, 202, 303):
        cases.append((f"ai_{seed}", _req(seed, _side("home_team", bench_plus=True),
                                         _side("away_team", "4231", True), ai=(False, True)), []))
    for seed in (9, 55):   # red cards + coach-AI red-card restructuring
        cases.append((f"red_{seed}", _req(seed, _side("home_team", "4141", True),
                                          _side("away_team", bench_plus=True), ai=(True, True)), []))
    home = _side("home_team", bench_plus=True)
    cmds = [
        {"sim_clock": 900, "kind": "formation", "payload": {"team": "HOME", "formation": "4231"}},
        {"sim_clock": 1500, "kind": "instructions", "payload": {
            "team": "HOME", "player_id": home["lineup"]["LB"]["id"],
            "instructions": {"attackRole": "Overlap", "attackEffort": 80,
                             "defenseRole": "Track Runner", "defenseEffort": 60}}},
        {"sim_clock": 2400, "kind": "substitution", "payload": {
            "team": "HOME", "player_off": home["lineup"]["ST"]["id"], "player_on": home["bench"][1]["id"]}},
        {"sim_clock": 3000, "kind": "formation", "payload": {"team": "HOME", "formation": "433"}},
        {"sim_clock": 3300, "kind": "formation", "payload": {"team": "HOME", "formation": "4141"}},
        {"sim_clock": 3600, "kind": "tactics", "payload": {"team": "HOME", "tactics": _full_tactics(
            buildUpTempo="Quick", pressingIntensity="Aggressive", boxCommitment="Commit")}},
    ]
    cases.append(("managed", _req(4242, home, _side("away_team", bench_plus=True), ai=(False, True)), cmds))
    return cases


def engage_unset(req: dict) -> dict:
    """The same request with every v2 hook present but inert."""
    r = copy.deepcopy(req)
    for k in ("home_team", "away_team"):
        r[k]["set_pieces"] = {"corner": None, "free_kick": None, "penalty": None,
                              "corner_routine": {"zone": "auto"}}
    r["modifiers"] = []
    return r


def ledger_digest(engine) -> str:
    blob = json.dumps([e.to_dict() for e in engine.events], sort_keys=True, separators=(",", ":"))
    return hashlib.blake2b(blob.encode()).hexdigest()[:32]


def run_case(req: dict, cmds: list, engaged: bool = False):
    import management
    engine = management.build_engine(engage_unset(req) if engaged else req)
    for c in sorted(cmds, key=lambda c: c["sim_clock"]):
        engine.advance(c["sim_clock"] - engine.clock)
        management.APPLIERS[c["kind"]](engine, c["payload"])
    engine.advance(engine.config.duration_seconds - engine.clock)
    engine.result()
    return engine


# Computed from a `git archive HEAD` export (7861512, pre-E1..E4) with
# `TLV2_ROOT=<export> python tests_engine_v2.py`.
BASELINE_DIGESTS: dict[str, str] = {
    "liv_eve": "e465859f161d8c746ac0c4cfce1e4b88",
    "liv_eve_ai": "14e913817eac92c98f0e7c4f9c46b3e6",
    "4231_v_4141_ai": "80d8db6d0028da576c4442f6cee10bf5",
    "ai_101": "7221e3c25ecd240977bd71f1debec610",
    "ai_202": "47370baccf4ccbe3ee1af6e77258cbaa",
    "ai_303": "1ca773424d3aa366ab294940ed163ecd",
    "red_9": "0b95b156a6e07a935e4b98e04654665b",
    "red_55": "f51246056a2d4bee8b4821d94f41c88e",
    "managed": "837b7257c9ab5f5796ac4ae79040b0ed",
}



# ═════════════════════════════ tests ═════════════════════════════════════════
import pickle  # noqa: E402

import pytest  # noqa: E402

_E3 = ("4-4-2", "3-4-3", "5-3-2")
_ALL = ("4-3-3", "4-2-3-1", "4-1-4-1") + _E3


def shaped(side: dict, formation: str) -> dict:
    """The fixture's 4-3-3 XI re-slotted into ``formation`` through the engine's
    own remap (frontend 433 'CM' is engine 'CDM')."""
    from fc_simulator.formations import slot_map_between
    side = copy.deepcopy(side)
    if formation == "4-3-3":
        return side
    m = slot_map_between("4-3-3", formation, extended=True)
    side["lineup"] = {m[{"CM": "CDM"}.get(k, k)]: v for k, v in side["lineup"].items()}
    side["formation"] = formation
    return side


def _events(engine, kind):
    return [e for e in engine.events if e.event_type == kind]


# ── flags-off identity (principle 7) ─────────────────────────────────────────
@pytest.mark.parametrize("name", list(BASELINE_DIGESTS))
def test_flags_off_identity_vs_head(name):
    case = {n: (r, c) for n, r, c in reference_cases()}[name]
    assert ledger_digest(run_case(*case)) == BASELINE_DIGESTS[name]
    assert ledger_digest(run_case(*case, engaged=True)) == BASELINE_DIGESTS[name]


def test_designated_bench_taker_falls_back_identically():
    """E1 fallback: takers who never reach the pitch -> automatic choice, and
    the whole match is bit-identical to HEAD."""
    req = copy.deepcopy(FIXTURE)
    bench = req["home_team"]["bench"][1]["id"]
    req["home_team"]["set_pieces"] = {"corner": bench, "free_kick": bench, "penalty": bench}
    assert ledger_digest(run_case(req, [])) == BASELINE_DIGESTS["liv_eve"]


# ── E1 set-piece takers ──────────────────────────────────────────────────────
def test_designated_takers_are_used():
    req = copy.deepcopy(FIXTURE)
    req["home_team"]["set_pieces"] = {"corner": "liv_gen_lb_01", "free_kick": "hugoekitike",
                                      "penalty": "virgilvandijk"}
    req["away_team"]["set_pieces"] = {"corner": "eve_cb_01", "penalty": "eve_lb_01"}
    eng = run_case(req, [])
    who = {"HOME": {"corner": "liv_gen_lb_01", "fk": "Hugo Ekitike", "pen": "virgilvandijk"},
           "AWAY": {"corner": "eve_cb_01", "pen": "eve_lb_01"}}
    corners = _events(eng, "CORNER")
    assert corners
    for e in corners:
        assert e.actor_id == who[e.team_id]["corner"]
    for e in _events(eng, "PENALTY"):
        assert e.actor_id == who[e.team_id]["pen"]
    fks = [e for e in _events(eng, "FREE_KICK") if e.team_id == "HOME"]
    for e in fks:
        assert e.detail["taker"] == eng.states["hugoekitike"].player.name
    assert ledger_digest(eng) != BASELINE_DIGESTS["liv_eve"]


def test_set_pieces_applier_and_clear():
    import management
    eng = management.build_engine(copy.deepcopy(FIXTURE))
    management.APPLIERS["set_pieces"](eng, {"team": "HOME", "corner": "liv_gen_rb_01"})
    assert eng.set_pieces == {"HOME": {"corner": "liv_gen_rb_01"}}
    management.APPLIERS["set_pieces"](eng, {"team": "HOME", "corner": None})
    assert eng.set_pieces is None
    with pytest.raises(management.BridgeError):
        management.APPLIERS["set_pieces"](eng, {"team": "HOME", "corner": "eve_cb_01"})
    with pytest.raises(management.BridgeError):
        management.APPLIERS["set_pieces"](eng, {"team": "HOME", "corner_routine": {"zone": "sideways"}})


# ── E2 modifiers + scheduled commands ────────────────────────────────────────
def test_modifiers_seen_by_effective_attribute_and_removed_on_sub():
    import management
    from fc_simulator.fatigue import effective_attribute
    req = _req(7, _side("home_team", bench_plus=True), _side("away_team"))
    eng = management.build_engine(req)
    st = eng.states["mohamedsalah"]
    before = effective_attribute(st.player, st, "crossing")
    management.APPLIERS["modifiers"](eng, {"team": "HOME", "deltas": {"mohamedsalah": {"cro": 4, "vision": 2}}})
    management.APPLIERS["modifiers"](eng, {"team": "HOME", "deltas": {"mohamedsalah": {"crossing": 2}}})
    assert st.mods == {"crossing": 6.0, "vision": 2.0}
    assert effective_attribute(st.player, st, "crossing") > before
    assert st.player.attributes["crossing"] == FIXTURE["home_team"]["lineup"]["RW"]["a"]["cro"]  # base untouched
    eng.advance(600)
    management.APPLIERS["substitution"](eng, {"team": "HOME", "player_off": "mohamedsalah",
                                             "player_on": req["home_team"]["bench"][-1]["id"]})
    assert st.mods is None and not eng._mod_layers
    with pytest.raises(management.BridgeError):   # no longer on the pitch
        management.APPLIERS["modifiers"](eng, {"team": "HOME", "deltas": {"mohamedsalah": {"cro": 1}}})
    with pytest.raises(management.BridgeError):
        management.APPLIERS["modifiers"](eng, {"team": "HOME", "deltas": {"alisson": {"not_an_attr": 1}}})


def test_partner_departure_removes_only_dependent_layers():
    import management
    req = _req(7, _side("home_team", bench_plus=True), _side("away_team"))
    eng = management.build_engine(req)
    salah, partner = "mohamedsalah", "dominikszoboszlai"
    management.APPLIERS["modifiers"](eng, {"team": "HOME", "deltas": {salah: {"cro": 2}}})
    management.APPLIERS["modifiers"](eng, {"team": "HOME", "deltas": {salah: {"cro": 4}, partner: {"sps": 3}},
                                             "dependency_pids": [salah, partner]})
    assert eng.states[salah].mods["crossing"] == 6
    management.APPLIERS["substitution"](eng, {"team": "HOME", "player_off": partner,
                                             "player_on": req["home_team"]["bench"][-1]["id"]})
    assert eng.states[salah].active and eng.states[salah].mods == {"crossing": 2.0}
    assert eng.states[partner].mods is None
    with pytest.raises(management.BridgeError, match="not on the pitch"):
        management.APPLIERS["modifiers"](eng, {"team": "HOME", "deltas": {salah: {"cro": 1}},
                                                 "dependency_pids": [partner]})


def test_red_card_removes_partner_layers(monkeypatch):
    import management
    eng = management.build_engine(_req(7, _side("home_team"), _side("away_team")))
    salah, partner = "mohamedsalah", "dominikszoboszlai"
    eng.add_modifiers("HOME", {salah: {"crossing": 4}}, dependency_pids=[salah, partner])
    monkeypatch.setattr(eng.rng, "uniform", lambda *args, **kwargs: 0.0)
    victim = next(st for st in eng.states.values() if st.team_id == "AWAY" and st.slot != "GK")
    eng._register_foul(eng.states[partner], victim, 0.8, tactical=True)
    assert not eng.states[partner].active and eng.states[partner].red_cards == 1
    assert eng.states[salah].mods is None and not eng._mod_layers


def test_modifiers_until_clock_and_kickoff():
    import management
    req = copy.deepcopy(FIXTURE)
    req["modifiers"] = [{"team": "HOME", "deltas": {"dominikszoboszlai": {"sps": 3}}},
                        {"team": "AWAY", "deltas": {"eve_st_01": {"fin": 5}}, "until_clock": 900}]
    eng = management.build_engine(req)
    assert eng.states["dominikszoboszlai"].mods == {"short_passing": 3.0}
    assert eng.states["eve_st_01"].mods == {"finishing": 5.0}
    eng.advance(899)
    assert eng.states["eve_st_01"].mods == {"finishing": 5.0}
    eng.advance(1)
    assert eng.states["eve_st_01"].mods is None
    assert eng.states["dominikszoboszlai"].mods == {"short_passing": 3.0}
    assert _events(eng, "MODIFIERS_EXPIRED")[0].timestamp == 900
    # deterministic, and the boost is causal (the match changes)
    a, b = run_case(req, []), run_case(req, [])
    assert ledger_digest(a) == ledger_digest(b) != BASELINE_DIGESTS["liv_eve"]


def test_scheduled_command_equals_command_at_that_clock():
    """A command scheduled at t=600 for 1500 == the same command logged at 1500,
    and survives a pickle checkpoint (rewind/replay path)."""
    import management
    tac = {"team": "HOME", "tactics": _full_tactics(pressingIntensity="Relentless", defensiveBlockHeight="High")}
    direct = run_case(copy.deepcopy(FIXTURE), [{"sim_clock": 1500, "kind": "tactics", "payload": tac}])
    sched = management.scheduled(1500, "tactics", tac)
    via = run_case(copy.deepcopy(FIXTURE), [{"sim_clock": 600, **sched}])
    assert ledger_digest(direct) == ledger_digest(via) != BASELINE_DIGESTS["liv_eve"]
    eng = management.build_engine(copy.deepcopy(FIXTURE))
    eng.advance(600)
    management.apply_command(eng, sched)
    eng.advance(400)
    clone = pickle.loads(pickle.dumps(eng))
    for e in (eng, clone):
        e.advance(5400 - e.clock)
        e.result()
    assert ledger_digest(eng) == ledger_digest(clone) == ledger_digest(direct)


def test_scheduled_invalid_command_is_skipped():
    import management
    eng = management.build_engine(copy.deepcopy(FIXTURE))
    management.apply_command(eng, management.scheduled(120, "instructions", {
        "team": "HOME", "player_id": "nobody", "instructions": {}}))
    eng.advance(200)
    ev = _events(eng, "SCHEDULED_SKIPPED")
    assert len(ev) == 1 and ev[0].timestamp == 120
    with pytest.raises(management.BridgeError):
        management.apply_command(eng, management.scheduled(300, "schedule", {}))


# ── E3 formations ────────────────────────────────────────────────────────────
def test_new_formations_registered_with_defaults():
    import bridge
    from fc_simulator.formations import FORMATIONS, anchors_for
    from fc_simulator.ratings import _SLOT_GROUP
    from fc_simulator.tactics import default_instructions
    from fc_simulator.models import PlayerInstructions
    for fid, name in (("442", "4-4-2"), ("343", "3-4-3"), ("532", "5-3-2")):
        assert bridge.map_formation(fid) == name and len(FORMATIONS[name]) == 11
        for slot in FORMATIONS[name]:
            assert slot in _SLOT_GROUP
            assert default_instructions(slot) != PlayerInstructions() or slot == "GK"
        a = anchors_for("AWAY", name)
        assert all(abs(a[k].x - (100 - v.x)) < 1e-9 for k, v in FORMATIONS[name].items())
    with pytest.raises(bridge.BridgeError):
        bridge.map_formation("352")


def test_remaps_between_all_shapes_are_bijections():
    from fc_simulator.formations import FORMATIONS, slot_map_between
    for a in _ALL:
        for b in _ALL:
            m = slot_map_between(a, b, extended=True)
            assert set(m) == set(FORMATIONS[a]) and sorted(m.values()) == sorted(FORMATIONS[b])
            assert m["GK"] == "GK"
    with pytest.raises(ValueError):          # legacy coach-AI behaviour preserved
        slot_map_between("4-2-3-1", "4-1-4-1")


@pytest.mark.parametrize("formation", _E3)
def test_new_formation_full_match(formation):
    import management
    req = _req(31, shaped(_side("home_team", bench_plus=True), formation),
               shaped(_side("away_team", bench_plus=True), formation), ai=(True, True))
    eng = run_case(req, [])
    assert eng.teams["HOME"].formation_name in {formation, "4-2-3-1", "5-3-2", "4-3-3"}
    assert run_case(req, []).events[-1].to_dict() == eng.events[-1].to_dict()
    shots = sum(1 for e in eng.events if e.event_type == "SHOT")
    assert shots >= 8, shots
    for s in eng.states.values():
        if s.active:
            assert 0.0 <= s.pos.x <= 100.0 and 0.0 <= s.pos.y <= 100.0


def test_manager_formation_changes_through_every_shape():
    import management
    req = _req(77, _side("home_team", bench_plus=True), _side("away_team", bench_plus=True), ai=(False, True))
    order = ["4-4-2", "3-4-3", "5-3-2", "4-2-3-1", "4-4-2", "4-1-4-1", "3-4-3", "4-2-3-1",
             "5-3-2", "4-1-4-1", "5-3-2", "4-3-3"]
    cmds = [{"sim_clock": 300 + 360 * i, "kind": "formation", "payload": {"team": "HOME", "formation": f}}
            for i, f in enumerate(order)]
    cmds.append({"sim_clock": 2000, "kind": "substitution", "payload": {
        "team": "HOME", "player_off": "hugoekitike", "player_on": req["home_team"]["bench"][-1]["id"]}})
    eng = run_case(req, cmds)
    fc = [e.detail["to"] for e in _events(eng, "FORMATION_CHANGE") if e.team_id == "HOME"]
    assert fc == order
    act = [s for s in eng.states.values() if s.team_id == "HOME" and s.active]
    assert len({s.slot for s in act}) == len(act)
    assert set(eng.teams["HOME"].lineup) <= set(__import__("fc_simulator.formations", fromlist=["F"]).FORMATIONS["4-3-3"])


@pytest.mark.parametrize("formation", _E3)
def test_ai_coach_and_red_card_paths_in_new_shapes(formation):
    """Coach-AI chase/protect/risk formation changes, subs and red-card
    restructuring run from every new base shape without errors."""
    import management
    from fc_simulator.formations import FORMATIONS
    for seed in (9, 55):
        req = _req(seed, shaped(_side("home_team", bench_plus=True), formation),
                   shaped(_side("away_team", bench_plus=True), formation), ai=(True, True))
        eng = management.build_engine(req)
        # force a dismissal so the restructure path is exercised deterministically
        eng.advance(2000)
        victim = next(s for s in eng.states.values() if s.team_id == "HOME" and s.active and s.slot == "CB"
                      ) if "CB" in FORMATIONS[formation] else next(
                          s for s in eng.states.values() if s.team_id == "HOME" and s.active and s.slot == "LCB")
        victim.red_cards = 1
        victim.active = False
        eng.advance(5400 - eng.clock)
        eng.result()
        for tid in ("HOME", "AWAY"):
            f = eng.teams[tid].formation_name
            for s in eng.states.values():
                if s.team_id == tid and s.active:
                    assert s.slot in FORMATIONS[f]
        assert any(e.detail.get("reason") == "RED_CARD_RESTRUCTURE" for e in _events(eng, "SUBSTITUTION")) or \
            not eng.teams["HOME"].bench


def test_bench_condition_slot_guard_new_shape():
    import management
    req = _req(3, shaped(_side("home_team", bench_plus=True), "5-3-2"), _side("away_team"))
    eng = management.build_engine(req)
    management.APPLIERS["formation"](eng, {"team": "HOME", "formation": "442"})
    out = next(s for s in eng.states.values() if s.team_id == "HOME" and s.slot == "LST")
    # a stale slot from the old shape (CB) is redirected to the outgoing player's slot
    eng._make_substitution("HOME", out, eng.teams["HOME"].bench[0], target_slot="CB")
    assert eng.states[eng.teams["HOME"].lineup["LST"].player_id].slot == "LST"


# ── E4 corner routines ───────────────────────────────────────────────────────
@pytest.mark.parametrize("zone", ["near", "far", "short"])
def test_corner_routines(zone):
    req = copy.deepcopy(FIXTURE)
    req["home_team"]["set_pieces"] = {"corner_routine": {"zone": zone}}
    eng = run_case(req, [])
    home = [e for e in _events(eng, "CORNER") if e.team_id == "HOME"]
    away = [e for e in _events(eng, "CORNER") if e.team_id == "AWAY"]
    assert home and all(e.detail.get("routine") == zone for e in home)
    assert all("routine" not in e.detail for e in away)
    for e in home:
        x, y = e.detail["landing"]
        if zone == "short":
            assert x >= 89.0 and (y <= 10.0 or y >= 90.0)
            nxt = eng.events[eng.events.index(e) + 1:]
            assert all(n.event_type != "AERIAL_DUEL" or n.timestamp > e.timestamp for n in nxt[:2])
        else:
            assert x >= 90.0 and 30.0 <= y <= 70.0
    assert ledger_digest(eng) != BASELINE_DIGESTS["liv_eve"]


def test_corner_target_pid():
    req = copy.deepcopy(FIXTURE)
    req["home_team"]["set_pieces"] = {"corner_routine": {"zone": "far", "target_pid": "mohamedsalah"},
                                      "corner": "dominikszoboszlai"}
    eng = run_case(req, [])
    home = [e for e in _events(eng, "CORNER") if e.team_id == "HOME"]
    assert home
    for e in home:
        assert e.actor_id == "dominikszoboszlai" and e.detail["target"] == "Mohamed Salah"


if __name__ == "__main__":
    out = {}
    for name, req, cmds in reference_cases():
        eng = run_case(req, cmds)
        out[name] = ledger_digest(eng)
        print(name, out[name], dict(eng.score), len(eng.events), file=sys.stderr)
    print(json.dumps(out, indent=1))


def test_v2_substitution_windows_batch_halftime_and_replay():
    import management
    req = _req(7, _side('home_team', bench_plus=True), _side('away_team'))
    req['builds'] = {'HOME': {'system_id': 'gegenpress'}}
    eng = management.build_engine(req)
    incoming = list(eng.teams['HOME'].bench)
    outgoing = [s.player.player_id for s in eng.states.values()
                if s.team_id == 'HOME' and s.slot != 'GK']
    commands = []
    def sub(i, clock):
        eng.clock = clock
        payload = {'team': 'HOME', 'player_off': outgoing[i],
                   'player_on': incoming[i].player_id}
        management.dispatch(eng, 'substitution', payload)
        commands.append((clock, payload))
    for i, clock in enumerate((100, 200, 300)):
        sub(i, clock)
    eng.clock = 400
    with pytest.raises(management.BridgeError, match='three substitution windows'):
        management.dispatch(eng, 'substitution', {'team': 'HOME',
            'player_off': outgoing[3], 'player_on': incoming[3].player_id})
    # CPU substitutions use the same guard and silently leave the team intact.
    eng._make_substitution('HOME', eng.states[outgoing[3]], incoming[3])
    assert eng.substitutions_used['HOME'] == 3
    sub(3, 300)  # one window can contain multiple players
    sub(4, 2700)  # halftime consumes a player, but no in-play window
    assert eng.substitutions_used['HOME'] == 5
    replay = management.build_engine(req)
    for clock, payload in commands:
        replay.clock = clock
        management.dispatch(replay, 'substitution', payload)
    assert ledger_digest(replay) == ledger_digest(eng)
    # Legacy requests keep their pre-v2 behavior.
    req.pop('builds')
    legacy = management.build_engine(req)
    for i, clock in enumerate((100, 200, 300, 400)):
        legacy.clock = clock
        management.dispatch(legacy, 'substitution', {'team': 'HOME',
            'player_off': outgoing[i], 'player_on': incoming[i].player_id})
    assert legacy.substitutions_used['HOME'] == 4
