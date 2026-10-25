"""Build-value curves (§14.3) and the §9 "the build matters" gates.

Controlled season experiments. A *test club* plays its 38 league fixtures of
a season with a modified side; every opponent is exactly the app's CPU side;
fixture seeds are the app's. Arms are paired (same fixtures, same seeds), so
per club-season point differences isolate the build change. Test clubs are
mid/low table sides whose XIs are (mostly) fictional, so squads are
comparable. All test clubs play their v2 system (tactics + slot roles from
systems.json, the system matching the club's formation and plan).

Experiments:
  fit          same average attributes, different fit: each starter's outfield
               attribute VALUES are re-assigned across attributes so that the
               slot's demand attributes get the high (λ>0) or low (λ<0) values;
               the per-player mean is exactly preserved. Fit from build.evaluate.
  partnerships 4 level-3 partnerships (CB pair, overlap, one-two, cross & head)
               via build.kickoff_modifiers vs none.
  familiarity  full familiarity all season vs a switch at MW1 (40 → +8/wk +3/match).
  bonuses      each unit bonus: required attributes at threshold+2 vs threshold−6.
  talent       §9 "much better players beat a well-built weaker side": +4 all
               outfield attrs with the club's fit-LOW arrangement vs base
               attributes with the fit-HIGH arrangement.
  training     TP economy: max gains for a young player over a season (build.train).
"""
from __future__ import annotations

import copy
import math
from typing import Any, Callable

from tools.balance import common as C

TEST_CLUBS = ["FUL", "BHA", "WOL", "EVE", "BUR", "SUN", "NFO", "LEE"]
GK_KEYS = {"gkd", "gkh", "gkk", "gkp", "gkr"}


def _b():
    from tools.balance import adapter
    return adapter.build_mod()


def club_system(side: dict, club: str, plan: dict) -> str:
    from tools.balance import career_exp
    from tools.balance import systems_map
    return systems_map.system_for_club(club) if club in systems_map.CLUB_BUILDS else career_exp.system_for(side["formation"], plan.get(club))


def with_system(side: dict, club: str, plan: dict) -> dict:
    from tools.balance import career_exp
    return career_exp.transform("system_tactics", club, side, True, plan)


def outfield_keys(p: dict) -> list[str]:
    return [k for k in p["a"] if k not in GK_KEYS]


def refit_player(p: dict, demand: dict[str, float], lam: float) -> dict:
    """λ=+1: demand attrs (by weight) get the player's highest values;
    λ=−1: the lowest. Linear mix in between. Mean over outfield attrs kept."""
    if p.get("pos") == "GK" or lam == 0:
        return p
    p = copy.deepcopy(p)
    keys = outfield_keys(p)
    vals = sorted((p["a"][k] for k in keys), reverse=True)
    dem = [k for k, w in sorted(demand.items(), key=lambda kv: -kv[1]) if k in keys and w > 0]
    rest = [k for k in keys if k not in dem]
    target = {}
    if lam > 0:
        for k, v in zip(dem, vals[:len(dem)]):
            target[k] = v
        rv = vals[len(dem):]
    else:
        low = vals[::-1]
        for k, v in zip(dem, low[:len(dem)]):
            target[k] = v
        rv = sorted(low[len(dem):], reverse=True)
    # non-demand attrs keep their original rank order
    for k, v in zip(sorted(rest, key=lambda k: -p["a"][k]), rv):
        target[k] = v
    a = abs(lam)
    for k in keys:
        p["a"][k] = round(p["a"][k] + a * (target[k] - p["a"][k]), 2)
    return p


def refit_side(side: dict, sid: str, lam: float) -> dict:
    b = _b()
    dem = b.system_demands(b.get_system(sid))
    side = copy.deepcopy(side)
    for slot, p in side["lineup"].items():
        if p and slot in dem:
            side["lineup"][slot] = refit_player(p, dem[slot], lam)
    return side


def side_fit(side: dict, sid: str, build: dict | None = None) -> dict:
    b = _b()
    squad = [p for p in side["lineup"].values() if p] + [p for p in side.get("bench") or [] if p]
    xi = {s: p["id"] for s, p in side["lineup"].items() if p}
    ev = b.evaluate(squad, xi, sid, build or {})
    return {"system_fit": ev["system_fit"], "base_fit": ev["base_fit"],
            "bonuses": [x["id"] for x in ev["bonuses"]]}


def add_mods(side: dict, mods: dict) -> dict:
    side = copy.deepcopy(side)
    for p in list(side["lineup"].values()) + list(side.get("bench") or []):
        if p and str(p["id"]) in mods:
            for k, x in mods[str(p["id"])].items():
                p["a"][k] = min(99, p["a"].get(k, 50) + x)
    return side


def shift_all(side: dict, d: float) -> dict:
    side = copy.deepcopy(side)
    for p in list(side["lineup"].values()) + list(side.get("bench") or []):
        if p:
            for k in p["a"]:
                if (k in GK_KEYS) == (p.get("pos") == "GK") or (p.get("pos") == "GK" and k == "rea"):
                    p["a"][k] = max(5, min(99, p["a"][k] + d))
    return side


# ── running arms ────────────────────────────────────────────────────────────
def club_arm(seas: list[dict], clubs: list[str], side_fn: Callable, label: str) -> dict[tuple, dict]:
    """side_fn(club, mw, side, sea) -> side for the test club. Returns
    {(club, season): {pts, gf, ga, n}}."""
    from tools.balance import league
    reqs, meta = [], []
    for si, sea in enumerate(seas):
        for club in clubs:
            for f in sea["fixtures"]:
                if club not in (f["home"], f["away"]):
                    continue
                sd = sea["sides"][f["mw"]]
                h, a = sd[f["home"]], sd[f["away"]]
                if f["home"] == club:
                    h = side_fn(club, f["mw"], h, sea)
                else:
                    a = side_fn(club, f["mw"], a, sea)
                h, a = copy.deepcopy(h), copy.deepcopy(a)
                build_h = h.pop("_balance_build", None)
                build_a = a.pop("_balance_build", None)
                req = league.fixture_request(sea, f, h, a)
                req["builds"] = {t: bb for t, bb in (("HOME", build_h), ("AWAY", build_a)) if bb}
                reqs.append(req)
                meta.append((club, si, "home" if f["home"] == club else "away"))
    res = league.simulate_matches(reqs, label=label)
    out: dict[tuple, dict] = {}
    for (club, si, side), r in zip(meta, res):
        o = "away" if side == "home" else "home"
        e = out.setdefault((club, si), {"pts": 0, "gf": 0, "ga": 0, "n": 0})
        gf, ga = r["score"][side], r["score"][o]
        e["pts"] += C.points(gf, ga); e["gf"] += gf; e["ga"] += ga; e["n"] += 1
    return out


def paired_diff(a: dict, b: dict) -> dict:
    ks = sorted(set(a) & set(b))
    d = [a[k]["pts"] - b[k]["pts"] for k in ks]
    m, lo, hi = C.ci95(d)
    return {"dpts": round(m, 2), "ci95": (round(lo, 2), round(hi, 2)), "n": len(d),
            "pts_a": round(sum(a[k]["pts"] for k in ks) / len(ks), 2),
            "pts_b": round(sum(b[k]["pts"] for k in ks) / len(ks), 2)}


# ── experiments ─────────────────────────────────────────────────────────────
def exp_fit(seas, clubs, lams=(-1.0, -0.5, 0.0, 0.5, 1.0)) -> dict:
    plan = seas[0]["plan"]
    arms, fits = {}, {}
    for lam in lams:
        def fn(club, mw, side, sea, lam=lam):
            sid = club_system(side, club, plan)
            return refit_side(with_system(side, club, plan), sid, lam)
        arms[lam] = club_arm(seas, clubs, fn, f"fit λ={lam:+.1f}")
        fl = []
        for club in clubs:
            side = seas[0]["sides"][1][club]
            sid = club_system(side, club, plan)
            fl.append(side_fit(fn(club, 1, side, seas[0]), sid)["system_fit"])
        fits[lam] = sum(fl) / len(fl)
    # regress per-club-season points on that club's fit (club fixed effects via
    # differencing against λ=0)
    xs, ys = [], []
    for lam in lams:
        for k, v in arms[lam].items():
            club = k[0]
            side = seas[0]["sides"][1][club]
            sid = club_system(side, club, plan)
            f_lam = side_fit(refit_side(with_system(side, club, plan), sid, lam), sid)["system_fit"]
            f_0 = side_fit(with_system(side, club, plan), sid)["system_fit"]
            xs.append(f_lam - f_0)
            ys.append(v["pts"] - arms[0.0][k]["pts"])
    beta, se, _ = C.ols([[1.0, x] for x in xs], ys)
    hi, lo = max(lams), min(lams)
    return {"fits": fits, "arms": {str(l): {str(k): v for k, v in a.items()} for l, a in arms.items()},
            "hi_vs_lo": paired_diff(arms[hi], arms[lo]), "fit_gap_hi_lo": fits[hi] - fits[lo],
            "pts_per_fit_point": round(beta[1], 3), "se": round(se[1], 3),
            "pts_per_30_fit": round(30 * beta[1], 2), "ci95_per_30": (round(30 * (beta[1] - 1.96 * se[1]), 2),
                                                                    round(30 * (beta[1] + 1.96 * se[1]), 2)),
            "pts_per_15_fit": round(15 * beta[1], 2)}


def _partnerships_for(side: dict) -> list[dict]:
    L = side["lineup"]
    f = side["formation"]
    lw = "LW" if f in ("433", "4231") else "LM"
    mid = {"433": "LCM", "4231": "CAM", "4141": "LCM"}[f]
    pid = lambda s: str(L[s]["id"])
    return [{"pattern": "cb_pair", "members": [pid("LCB"), pid("RCB")], "fam": 95},
            {"pattern": "overlap", "members": [pid("LB"), pid(lw)], "fam": 95},
            {"pattern": "one_two", "members": [pid(mid), pid("ST")], "fam": 95},
            {"pattern": "cross_head", "members": [pid("RB"), pid("ST")], "fam": 95}]


def exp_partnerships(seas, clubs) -> dict:
    plan = seas[0]["plan"]
    b = _b()

    def base(club, mw, side, sea):
        s = with_system(side, club, plan)
        sid = club_system(side, club, plan)
        s["_balance_build"] = {"system_id": sid, "familiarity": {sid: 40}}
        return s

    def l3(club, mw, side, sea):
        s = with_system(side, club, plan)
        sid = club_system(side, club, plan)
        s["_balance_build"] = {"system_id": sid, "partnerships": _partnerships_for(s), "familiarity": {sid: 40}}
        return s
    a0 = club_arm(seas, clubs, base, "partnerships none")
    a3 = club_arm(seas, clubs, l3, "partnerships 4xL3")
    return {"l3_vs_none": paired_diff(a3, a0)}


def exp_familiarity(seas, clubs) -> dict:
    plan = seas[0]["plan"]
    b = _b()

    def fam_arm(fam_of_mw):
        def fn(club, mw, side, sea):
            s = with_system(side, club, plan)
            sid = club_system(side, club, plan)
            s["_balance_build"] = {"system_id": sid, "familiarity": {sid: fam_of_mw(mw)}}
            return s
        return fn
    k = b.CONST
    step = k["sys_week"] + k["sys_per_match"]
    full = club_arm(seas, clubs, fam_arm(lambda mw: 100), "familiarity 100")
    switch = club_arm(seas, clubs, fam_arm(lambda mw: min(100, k["sys_switch"] + step * (mw - 1))), "familiarity switch@MW1")
    none = club_arm(seas, clubs, fam_arm(lambda mw: 40), "familiarity 40 flat")
    return {"full_vs_switch": paired_diff(full, switch), "full_vs_40": paired_diff(full, none),
            "weeks_to_full": math.ceil((100 - k["sys_switch"]) / step)}


BONUS_RULES = {
    # bonus: (slot group chooser, attribute, threshold const, count)
    "engine_room": ("MID", [("stam", "engine_room_stam")], "engine_room_need"),
    "pace_in_behind": ("FRONT", [("spr", "pace_spr")], "pace_need"),
    "wall": ("CB", [("daw", "wall_daw")], None),
}


def _group_slots(side: dict, group: str) -> list[str]:
    b = _b()
    return [s for s in side["lineup"] if b.slot_group(b.engine_slot(side["formation"], s)) == group] \
        if hasattr(b, "slot_group") else []


def exp_bonuses(seas, clubs) -> dict:
    plan = seas[0]["plan"]
    b = _b()
    K = b.CONST
    out = {}
    for bid, (group, attrs, need_k) in BONUS_RULES.items():
        def mk(delta_fn):
            def fn(club, mw, side, sea):
                s = with_system(side, club, plan)
                slots = _group_slots(s, {"MID": "CM", "FRONT": "W", "CB": "CB"}[group]) or []
                if group == "MID":
                    slots = [x for x in s["lineup"] if b.engine_slot(s["formation"], x) in b.GROUPS["MID"]]
                elif group == "FRONT":
                    slots = [x for x in s["lineup"] if b.engine_slot(s["formation"], x) in b.GROUPS["FRONT"]]
                elif group == "CB":
                    slots = [x for x in s["lineup"] if b.engine_slot(s["formation"], x) in b.GROUPS["CB"]]
                n = K[need_k] if need_k else 2
                s = copy.deepcopy(s)
                for sl in slots[:n]:
                    p = s["lineup"][sl]
                    for a, th in attrs:
                        p["a"][a] = delta_fn(K[th])
                return s
            return fn
        on = club_arm(seas, clubs, mk(lambda th: th + 2), f"bonus {bid} on")
        off = club_arm(seas, clubs, mk(lambda th: th - 6), f"bonus {bid} off")
        out[bid] = paired_diff(on, off)
        out[bid]["fit_points"] = K["bonus_points"]
    return out


def exp_talent(seas, clubs) -> dict:
    """Talent vs build: +4 all attributes but fit-LOW arrangement, against
    base attributes with the fit-HIGH arrangement."""
    plan = seas[0]["plan"]

    def talented(club, mw, side, sea):
        sid = club_system(side, club, plan)
        return shift_all(refit_side(with_system(side, club, plan), sid, -0.5), 4)

    def built(club, mw, side, sea):
        sid = club_system(side, club, plan)
        return refit_side(with_system(side, club, plan), sid, 1.0)
    t = club_arm(seas, clubs, talented, "talent +4 / fit low")
    w = club_arm(seas, clubs, built, "talent 0 / fit high")
    s0 = seas[0]["sides"][1][clubs[0]]
    sid = club_system(s0, clubs[0], plan)
    return {"talent_vs_build": paired_diff(t, w),
            "fit_talented": side_fit(talented(clubs[0], 1, s0, seas[0]), sid)["system_fit"],
            "fit_built": side_fit(built(clubs[0], 1, s0, seas[0]), sid)["system_fit"]}


def exp_training(sea=None) -> dict:
    """§9 training economy: TP over one season (camp + 38 weeks) spent on ONE
    young high-potential player, greedily, respecting the weekly load
    threshold; and the same with no load discipline."""
    b = _b()
    K = b.CONST
    p = {"id": "y1", "name": "Youth", "pos": "CM", "age": 19, "ovr": 70, "pot": 86,
         "a": {k: 70 for k in b.LONG}}
    calendar = (sea or {}).get("calendar") or ([{"kind": "camp"}] * 4 + [{"kind": "single"}] * 22 + [{"kind": "double"}] * 8)
    season_tp = sum(b.week_tp({}, week["kind"]) for week in calendar)
    res = {}
    for label, per_week in (("load-disciplined (4 drills/wk)", 4), ("all TP on him", None)):
        build = b.new_build("positional")
        squad = [copy.deepcopy(p)]
        total_gain = {}
        weeks = len(calendar)
        attrs = [k for k in b.LONG if k not in GK_KEYS]
        drills = 0
        for w, week in enumerate(calendar):
            build = b.week_tick(squad, build, [], week["kind"])["build"]
            cap = build["tp"]["wallet"]
            n = cap if per_week is None else min(cap, per_week)
            for _ in range(n):
                # next attribute with room
                best = None
                for a in attrs:
                    if total_gain.get(a, 0) < K["season_cap"] - 1e-6:
                        best = a
                        break
                if best is None:
                    break
                r = b.train(squad, build, [{"kind": "attr", "pid": "y1", "attr": best, "tp": 1}])
                build = r["build"]
                g = (r.get("squad_deltas") or {}).get("y1", {}).get(best, 0)
                squad[0]["a"][best] += g
                total_gain[best] = total_gain.get(best, 0) + g
                drills += 1
            build["load"] = {}
        maxed = [a for a, g in total_gain.items() if g >= K["season_cap"] - 0.05]
        res[label] = {"drills": drills, "season_tp": season_tp, "attrs_at_cap": len(maxed),
                      "sum_gain": round(sum(total_gain.values()), 1),
                      "mean_attr_gain_over_29": round(sum(total_gain.values()) / 29, 2),
                      "max_single_attr": round(max(total_gain.values() or [0]), 2)}
    return res


def exp_training_plans(seas, clubs):
    """Paired season outcomes: same fixtures/seeds, youth vs first-XI TP.
    Opponent scripts identical between arms; each tested club is isolated.
    """
    from tools.balance import league, feel
    arms = {}
    for policy in ("youth", "first_xi"):
        results = {}
        for club in clubs:
            store = {"training_policy": {club: policy}}
            for si, sea in enumerate(seas):
                subset = dict(sea, fixtures=[f for f in sea["fixtures"] if club in (f["home"], f["away"])])
                played = league.sim_progressing_season(subset, feel.cpu_cards_opts, f"training {policy} {club}", store)
                points = sum(C.points(m["score"]["home" if m["home"] == club else "away"], m["score"]["away" if m["home"] == club else "home"]) for m in played)
                results[(club, si)] = {"pts": points, "n": len(played)}
        arms[policy] = results
    return {"youth_vs_first_xi": paired_diff(arms["youth"], arms["first_xi"]),
            "method": "Persistent train/week_tick/new_season; paired fixtures/seeds; controlled CPU scripts"}


def cli(a):
    from tools.balance.run import seasons, save_result, load_result
    seas = seasons(a.seasons)
    only = set((a.only or "fit,partnerships,familiarity,bonuses,talent,training,training_plans").split(","))
    out = load_result("curves") or {}
    clubs = TEST_CLUBS[:C.SCALE["curve_clubs"]]
    if "training" in only:
        out["training"] = exp_training(seas[0]); save_result("curves", out); print("training", out["training"])
    if "training_plans" in only:
        out["training_plans"] = exp_training_plans(seas, clubs); save_result("curves", out); print(out["training_plans"])
    if "fit" in only:
        out["fit"] = exp_fit(seas, clubs, lams=C.SCALE["fit_lams"]); save_result("curves", out)
        print("fit", {k: v for k, v in out["fit"].items() if k != "arms"})
    if "partnerships" in only:
        out["partnerships"] = exp_partnerships(seas, clubs); save_result("curves", out); print(out["partnerships"])
    if "familiarity" in only:
        out["familiarity"] = exp_familiarity(seas, clubs); save_result("curves", out); print(out["familiarity"])
    if "bonuses" in only:
        out["bonuses"] = exp_bonuses(seas, clubs); save_result("curves", out); print(out["bonuses"])
    if "talent" in only:
        out["talent"] = exp_talent(seas, clubs); save_result("curves", out); print(out["talent"])
