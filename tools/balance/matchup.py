"""Matchup matrix (§14.4): system vs system at equal squad quality.

For each squad pool (a club's full squad) both teams draw their XI from the
SAME pool (mirror; away ids suffixed), each picking the best-fit XI for its
own system (greedy on build.evaluate's fit matrix, GK slot → a keeper), then
playing that system's formation, 13 tactics and slot roles. Every ordered
pair (home, away) × pools × seeds. Gate: each system's expected points per
match against the field within ±0.15 of the mean (1.36-ish).

  --cards : both sides also carry a CPU build (system deck, normal policy).
"""
from __future__ import annotations

import copy
import math
from collections import defaultdict

from tools.balance import common as C

POOLS = ["FUL", "BHA", "EVE", "NFO"]
COMPAT = {"CB": ("CB",), "LB": ("FB",), "RB": ("FB",), "CDM": ("DM", "CM"), "CM": ("CM", "DM", "AM"),
          "CAM": ("AM", "CM", "W"), "LW": ("W", "AM"), "RW": ("W", "AM"), "LM": ("W", "AM"),
          "RM": ("W", "AM"), "ST": ("ST", "W", "AM")}
SEEDS_PER_PAIR = 10


def _b():
    from tools.balance import adapter
    return adapter.build_mod()


def pick_xi(pool: list[dict], sid: str) -> dict:
    b = _b()
    sysd = b.get_system(sid)
    slots = list(sysd["slots"])
    ev = b.evaluate(pool, {}, sid, {})
    fm = ev["fit_matrix"]
    byid = {str(p["id"]): p for p in pool}
    xi = {}
    used = set()
    gks = [p for p in pool if p.get("pos") == "GK"]
    gk = max(gks, key=lambda p: fm[str(p["id"])].get("GK", 0))
    xi["GK"] = gk
    used.add(str(gk["id"]))
    grp = {s: b.slot_group(b.engine_slot(sysd["formation"], s)) for s in slots}
    pairs = sorted(((fm[pid][s], pid, s) for pid in fm for s in slots if s != "GK"
                    and byid[pid].get("pos") != "GK"), reverse=True)
    for strict in (True, False):          # position-compatible first, then anyone
        for f, pid, s in pairs:
            if s in xi or pid in used:
                continue
            if strict and grp[s] not in COMPAT.get(byid[pid].get("pos"), ()):
                continue
            xi[s] = byid[pid]
            used.add(pid)
    bench = [p for p in pool if str(p["id"]) not in used][:9]
    return {"formation": sysd["formation"], "lineup": {s: xi[s] for s in slots},
            "bench": bench, "tactics": dict(sysd["tactics"]),
            "player_instructions": {str(xi[s]["id"]): {k: sysd["slots"][s][k] for k in
                                    ("attackRole", "attackEffort", "defenseRole", "defenseEffort")} for s in slots}}


def _suffix(side: dict, suf: str) -> dict:
    side = copy.deepcopy(side)
    for s, p in side["lineup"].items():
        p["id"] = str(p["id"]) + suf
    for p in side["bench"]:
        p["id"] = str(p["id"]) + suf
    side["player_instructions"] = {k + suf: v for k, v in side["player_instructions"].items()}
    return side


def run(seas, cards: bool = False, seeds_per_pair: int = SEEDS_PER_PAIR) -> dict:
    from tools.balance import league
    b = _b()
    sids = sorted(b.SYSTEMS)[:C.SCALE["matchup_systems"]]
    pools = POOLS[:C.SCALE["matchup_pools"]]
    sea = seas[0]
    reqs, meta, opts = [], [], []
    xis = {}
    for club in pools:
        side = sea["sides"][1][club]
        pool = [p for p in side["lineup"].values() if p] + [p for p in side["bench"] if p]
        for sid in sids:
            xis[(club, sid)] = pick_xi(pool, sid)
    for club in pools:
        for h in sids:
            for a in sids:
                for k in range(seeds_per_pair):
                    seed = int(C.key("matchup", club, h, a, k)[:8], 16)
                    hs = dict(xis[(club, h)], name=f"{club}-{h}")
                    as_ = dict(_suffix(xis[(club, a)], "_b"), name=f"{club}-{a}")
                    reqs.append({"save_id": "matchup", "fixture_id": f"MM-{club}-{h}-{a}-{k}", "seed": seed,
                                 "mode": "full", "config": {"duration_seconds": 5400},
                                 "coach_ai": {"home": True, "away": True}, "home_team": hs, "away_team": as_})
                    meta.append((club, h, a))
                    opts.append({"builds": {"HOME": {"system_id": h, "control": "cpu", "difficulty": "normal"},
                                            "AWAY": {"system_id": a, "control": "cpu", "difficulty": "normal"}}}
                                if cards else None)
    res = league.simulate_matches(reqs, opts, label="matchup" + (" +cards" if cards else ""))
    cell = defaultdict(list)          # (h, a) -> home pts
    sys_pts = defaultdict(list)
    for (club, h, a), r in zip(meta, res):
        gh, ga = r["score"]["home"], r["score"]["away"]
        ph, pa = C.points(gh, ga), C.points(ga, gh)
        cell[(h, a)].append(ph)
        if h != a:
            sys_pts[h].append(ph)
            sys_pts[a].append(pa)
    allp = [x for v in sys_pts.values() for x in v]
    mean = sum(allp) / len(allp)
    per = {}
    for s in sids:
        m, se = C.mean_se(sys_pts[s])
        per[s] = {"exp_pts": round(m, 3), "se": round(se, 3), "dev": round(m - mean, 3), "n": len(sys_pts[s])}
    ok = all(abs(v["dev"]) <= 0.15 for v in per.values())
    # matrix of row system's expected points vs column system (both venues)
    mat = {}
    for s in sids:
        for t in sids:
            pts = [p for p in cell[(s, t)]] + [3 if x == 0 else 1 if x == 1 else 0 for x in cell[(t, s)]]
            mat[(s, t)] = sum(pts) / len(pts)
    fits = {s: round(sum(b.evaluate([p for p in xis[(c, s)]["lineup"].values()],
                                    {sl: p["id"] for sl, p in xis[(c, s)]["lineup"].items()}, s, {})["system_fit"]
                         for c in pools) / len(pools), 1) for s in sids}
    md = ["| row vs col (exp pts, both venues) | " + " | ".join(s[:10] for s in sids) + " | vs field | dev | fit |",
          "|---|" + "---|" * (len(sids) + 3)]
    for s in sids:
        md.append(f"| **{s}** | " + " | ".join(f"{mat[(s, t)]:.2f}" for t in sids)
                  + f" | {per[s]['exp_pts']:.2f} ± {per[s]['se']:.2f} | {per[s]['dev']:+.2f} | {fits[s]} |")
    hw = sum(1 for (club, h, a), r in zip(meta, res) if r["score"]["home"] > r["score"]["away"]) / len(res)
    dr = sum(1 for r in res if r["score"]["home"] == r["score"]["away"]) / len(res)
    md.append("")
    md.append(f"{len(res)} matches ({len(pools)} squad pools × {len(sids)**2} ordered pairs × {seeds_per_pair} seeds); field mean "
              f"{mean:.3f} pts/match; draws {dr:.1%}, home wins {hw:.1%}.")
    worst = max(per.items(), key=lambda kv: abs(kv[1]["dev"]))
    return {"per_system": per, "matrix": {f"{s}|{t}": round(v, 3) for (s, t), v in mat.items()},
            "field_mean": mean, "pass": ok if C.SCALE["name"] == "full" else None, "fits": fits,
            "verdict": f"max |dev| {abs(worst[1]['dev']):.2f} ({worst[0]})", "markdown": "\n".join(md)}


def cli(a):
    from tools.balance.run import seasons, save_result
    seas = seasons(1)
    r = run(seas, cards=a.cards, seeds_per_pair=C.SCALE["matchup_seeds"])
    save_result("matchup" + ("_cards" if a.cards else ""), r)
    print(r["markdown"])
    print(r["verdict"], "PASS" if r["pass"] else "FAIL")
