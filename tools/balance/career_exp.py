"""Career-layer experiments: what manager-layer inputs move the league
numbers (§9 league realism)? Every variant only transforms the CPU side
dicts the app would send (squad attributes of fictional players, tactics,
roles, starting condition), never the engine.

  /tmp/tlvenv/bin/python -m tools.balance.run career --only roles,system_tactics --seasons 1

Variants (composable with '+'):
  base            the app as exported
  roles           every CPU slot gets the attack/defence role of its club's v2
                  system (systems.json), formation kept (system chosen to match it)
  system_tactics  roles + the system's 13 tactics (the v2 CPU identity)
  presets         the club's full PRESET tactics instead of the clamped cpuTactics
  away_cond<k>    away starters' condition −k (travel), e.g. away_cond5
  spread<k>       fictional players' outfield attributes += k/10 × (tier − 74.5)
                  (widens the compressed club tiers: tierAdj slope 0.4 → 0.4+k/10)
  ficup<k>        fictional players' outfield attributes += k (all clubs)
"""
from __future__ import annotations

import copy
import json
import re
from functools import lru_cache

from tools.balance import common as C

CLUB_TIER = {"MCI": 80, "ARS": 80, "LIV": 79, "CHE": 78, "NEW": 77, "TOT": 76, "AVL": 76, "MUN": 76,
             "BHA": 75, "NFO": 74, "CRY": 74, "BOU": 73, "BRE": 73, "FUL": 73, "EVE": 72, "WHU": 72,
             "WOL": 71, "LEE": 69, "BUR": 68, "SUN": 68}      # web/coach-career.js CLUB_TIER
GK_KEYS = {"gkd", "gkh", "gkk", "gkp", "gkr"}
# per formation, which v2 system a club with that plan plays (formation must match)
PLAN_FORMATION_SYSTEM = {
    "433": {"High Press": "gegenpress", "Possession": "positional", "End-to-End": "inside_forwards",
            "_": "inside_forwards"},
    "4231": {"Controlled": "total_football", "Balanced": "wing_overload", "Counter Attack": "wing_overload",
             "High Press": "total_football", "Possession": "total_football", "_": "wing_overload"},
    "4141": {"Low Block": "low_block", "Counter Attack": "counter_strike", "Possession": "counter_strike",
             "_": "target_man"},
}


@lru_cache(maxsize=1)
def systems() -> dict:
    return {s["id"]: s for s in json.loads((C.ROOT / "data" / "systems.json").read_text())["systems"]}


@lru_cache(maxsize=1)
def presets() -> dict:
    src = (C.ROOT / "web" / "touchline.html").read_text()
    m = re.search(r"const PRESETS = \{(.*?)\n\};", src, re.S)
    body = "{" + m.group(1) + "}"
    body = re.sub(r"([{,])\s*([A-Za-z]+):", r'\1"\2":', body)
    body = body.replace("'", '"')
    return json.loads(body)


def system_for(formation: str, plan: str | None) -> str:
    m = PLAN_FORMATION_SYSTEM.get(formation, {})
    return m.get(plan or "_", m.get("_"))


def _fictional(p: dict) -> bool:
    return "_sq_" in str(p.get("id", ""))


def _players(side):
    for p in (side.get("lineup") or {}).values():
        if p:
            yield p
    for p in side.get("bench") or []:
        if p:
            yield p


def transform(variant: str, club: str, side: dict, home: bool, plan: dict) -> dict:
    if variant in ("", "base"):
        return side
    side = copy.deepcopy(side)
    for v in variant.split("+"):
        if v in ("roles", "system_tactics"):
            from tools.balance import systems_map
            sid = systems_map.system_for_club(club) if club in systems_map.CLUB_BUILDS else system_for(side["formation"], plan.get(club))
            sysd = systems()[sid]
            pi = {}
            for slot, p in side["lineup"].items():
                r = sysd["slots"].get(slot)
                if r and p:
                    pi[p["id"]] = {k: r[k] for k in ("attackRole", "attackEffort", "defenseRole", "defenseEffort")}
            side["player_instructions"] = pi
            if v == "system_tactics":
                side["tactics"] = dict(sysd["tactics"])
        elif v == "presets":
            pr = presets().get(plan.get(club) or "Balanced") or presets()["Balanced"]
            side["tactics"] = dict(pr)
        elif v.startswith("away_cond"):
            k = float(v[len("away_cond"):])
            if not home:
                for p in side["lineup"].values():
                    p["cond"] = max(40, (p.get("cond") or 100) - k)
        elif v.startswith("spread"):
            k = float(v[len("spread"):]) / 10.0
            d = k * (CLUB_TIER.get(club, 74) - 74.5)
            for p in _players(side):
                if _fictional(p):
                    for a in p["a"]:
                        if a not in GK_KEYS or p.get("pos") == "GK":
                            p["a"][a] = max(5, min(97, p["a"][a] + d))
        elif v.startswith("ficup"):
            d = float(v[len("ficup"):])
            for p in _players(side):
                if _fictional(p):
                    for a in p["a"]:
                        if a not in GK_KEYS or p.get("pos") == "GK":
                            p["a"][a] = max(5, min(97, p["a"][a] + d))
        else:
            raise ValueError(f"unknown variant {v}")
    return side


def run_variant(variant: str, n_seasons: int) -> dict:
    from tools.balance import league
    from tools.balance.run import seasons
    seas = seasons(n_seasons)
    runs = []
    for i, sea in enumerate(seas):
        plan = sea["plan"]
        side_home = {}

        def ov(club, mw, side, _plan=plan):
            return side  # replaced per fixture below
        reqs = []
        for f in sea["fixtures"]:
            sd = sea["sides"][f["mw"]]
            h = transform(variant, f["home"], sd[f["home"]], True, plan)
            a = transform(variant, f["away"], sd[f["away"]], False, plan)
            reqs.append(league.fixture_request(sea, f, h, a))
        res = league.simulate_matches(reqs, label=f"{variant} s{i + 1}")
        runs.append([{**f, **r} for f, r in zip(sea["fixtures"], res)])
    from tools.balance import feel
    reps = [league.season_report(m) for m in runs]
    return {"variant": variant, "seasons": n_seasons, "gates": league.league_gates(reps),
            "reports": [{k: v for k, v in r.items() if k != "table"} | {"table": r["table"]} for r in reps],
            "feel": feel.feel_metrics([m for r in runs for m in r])}


def headline(res: dict) -> str:
    g = {x["gate"]: x for x in res["gates"]}
    reps = res["reports"]
    pc = sum(r["pass_completion"] for r in reps) / len(reps)
    st = sum(r["slot_goal_share"].get("ST", 0) for r in reps) / len(reps)
    return (f"{res['variant']:<34} D {g['draws']['value']:.1%}  H {g['home win']['value']:.1%}  "
            f"G {g['goals/game']['value']:.2f}  champ {g['champion pts']['per_season']}  "
            f"18th {g['relegation line (18th)']['per_season']}  topshare {g['top scorer share of team goals (max club)']['value']:.0%}"
            f" (mean {g['top scorer share of team goals (max club)']['mean_club']:.0%})  top {g['top scorer tally']['per_season']}"
            f"  5+ {g['blowouts (5+ margin)']['value']:.1%}  pass {pc:.1%}  ST-goal {st:.0%}")


def cli(a):
    from tools.balance.run import save_result, load_result
    variants = (a.only or "base").split(",")
    allres = load_result("career_experiments") or {}
    for v in variants:
        r = run_variant(v, a.seasons)
        allres[f"{v}|{a.seasons}"] = r
        save_result("career_experiments", allres)
        print(headline(r), flush=True)
