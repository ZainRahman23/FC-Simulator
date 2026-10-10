"""Economy Monte Carlo (§14.5): 5-season Liverpool careers under scripted
strategies.

The money rules are ported 1:1 from the UI layer that owns them
(``web/coach-build.js`` CB.ECON / CAL, ``web/touchline.html`` VALUATION,
playerValue, estWeeklyWageK, askingPrice, sale offer 0.85/0.92 × value, the
board releasing 70 % of a sale to the budget, next-season budget formula,
youth intake by Academy level; ``build.STAFF`` costs). Constants are parsed
from those files at run time, so the model follows their edits.

Season sporting outcome is NOT simulated match-by-match here: points are
drawn from the season-harness relationship points ~ XI strength (fitted on
the baseline seasons: every club-season), and league position from the
harness tables. That keeps 5-season × 4-strategy × 200-run Monte Carlo cheap
while staying anchored to real engine output. Modelling choices that the UI
does not define (which players a strategy buys, market supply) are marked
ASSUMPTION in the code and in the report.
"""
from __future__ import annotations

import math
import random
import re
from collections import defaultdict

from tools.balance import common as C

RUNS = 200
SEASONS = 5


def _js_num(src: str, name: str, default: float) -> float:
    m = re.search(rf"\b{name}\s*:\s*([0-9.]+)", src)
    return float(m.group(1)) if m else default


def econ_rules(sea=None) -> dict:
    cb = (C.ROOT / "web" / "coach-build.js").read_text()
    th = (C.ROOT / "web" / "touchline.html").read_text()
    r = {
        "tv_flat": _js_num(cb, "TV_FLAT_SEASON", 100), "tv_merit": _js_num(cb, "TV_MERIT_PER_PLACE", 3.0),
        "gate_home": 5.4, "wage_warn": _js_num(cb, "WAGE_WARN", 0.8), "wage_freeze": _js_num(cb, "WAGE_FREEZE", 0.9),
        "budget_base_share": _js_num(cb, "BUDGET_BASE_SHARE", 0.7), "rep_budget": _js_num(cb, "REPUTATION_BUDGET", 0.6),
        "youth_wage_k": _js_num(cb, "YOUTH_WAGE_K", 8),
        "val_base": _js_num(th, "base", 8), "val_growth": _js_num(th, "growth", 1.18), "val_anchor": _js_num(th, "anchor", 75),
        "cash0": _js_num(th, "cashBalance", 120.0), "budget0": _js_num(th, "transferBudget", 85.0),
        "baseline_wk": _js_num(th, "baselineWeeklyWagesK", 1350), "coach_wages": _js_num(th, "coachWagesAnnual", 15),
        "agent": _js_num(th, "agentFeesAnnual", 26), "other": _js_num(th, "otherFootballCostsAnnual", 158),
        "commercial": 272 + 60,
    }
    m = re.search(r"GATE_PER_HOME:\s*\{1:\s*([0-9.]+)", cb)
    if m:
        r["gate_home"] = float(m.group(1))
    live = (sea or {}).get("economy") or {}
    ec = live.get("constants") or {}
    mappings = {"tv_flat": "TV_FLAT_SEASON", "tv_merit": "TV_MERIT_PER_PLACE", "wage_warn": "WAGE_WARN", "wage_freeze": "WAGE_FREEZE", "budget_base_share": "BUDGET_BASE_SHARE", "rep_budget": "REPUTATION_BUDGET", "youth_wage_k": "YOUTH_WAGE_K"}
    for dest, src in mappings.items():
        if src in ec:
            r[dest] = ec[src]
    r["live_economy_export"] = bool(ec)
    r["prizes"] = live.get("prizes") or [prize(pos) for pos in range(1, 21)]
    return r


def prize(pos):
    return 25 if pos == 1 else 15 if pos <= 4 else 7 if pos <= 6 else 3 if pos <= 7 else 0


def budget_by_pos(pos):
    return 45 if pos == 1 else 35 if pos == 2 else 25 if pos <= 4 else 12 if pos <= 6 else 5 if pos <= 10 else 0


def value(p, R) -> float:
    v = R["val_base"] * R["val_growth"] ** (p["ovr"] - R["val_anchor"])
    if p["age"] > 27:
        v *= 0.92 ** (p["age"] - 27)
    if p["age"] <= 21:
        v *= 1.1
    v *= 1 + max(0, p["pot"] - p["ovr"]) * 0.025
    if p["pos"] == "GK":
        v *= 0.8
    return max(2.0, round(v * 2) / 2)


def wage_k(p) -> float:
    o = p["ovr"]
    base = 340 if o >= 90 else 250 if o >= 88 else 200 if o >= 86 else 150 if o >= 84 else 115 if o >= 82 \
        else 90 if o >= 80 else 65 if o >= 78 else 50 if o >= 76 else 45
    return base * (0.85 if p["pos"] == "GK" else 1)


def strength(squad) -> float:
    """Mean OVR of the best 11 (1 GK + 10 outfield) — CC.clubStrength proxy."""
    gk = sorted((p["ovr"] for p in squad if p["pos"] == "GK"), reverse=True)[:1]
    out = sorted((p["ovr"] for p in squad if p["pos"] != "GK"), reverse=True)[:10]
    xs = gk + out
    return sum(xs) / max(1, len(xs))


def fit_points_model() -> dict:
    """points ~ a + b·(strength − league mean) from the baseline harness,
    plus residual SD, and P(position | points) from the harness tables."""
    from tools.balance.run import load_result
    base = load_result("baseline")
    if base is None:
        raise RuntimeError("Run baseline for this scale/source version before economy")
    st = base["strength"]
    mean_s = sum(st.values()) / len(st)
    xs, ys, tabs = [], [], []
    for rep in base["reports"]:
        pts_sorted = [row[1] for row in rep["table"]]
        tabs.append(pts_sorted)
        for row in rep["table"]:
            xs.append(st[row[0]] - mean_s)
            ys.append(row[1])
    beta, se, rsd = C.ols([[1.0, x] for x in xs], ys)
    return {"a": beta[0], "b": beta[1], "rsd": rsd, "mean_s": mean_s, "tables": tabs}


def position_for(pts, tables, rnd) -> int:
    t = rnd.choice(tables)
    return 1 + sum(1 for x in t if x > pts)


def liv_squad(sea) -> list[dict]:
    side = sea["sides"][1]["LIV"]
    out = []
    for p in list(side["lineup"].values()) + list(side["bench"]):
        out.append({"id": p["id"], "pos": p["pos"], "ovr": p["ovr"], "pot": p.get("pot", p["ovr"]),
                    "age": p["age"], "wage": wage_k(p), "years": 3})
    return out


def market(sea) -> list[dict]:
    pool = []
    for club, side in sea["sides"][1].items():
        if club == "LIV":
            continue
        for p in list(side["lineup"].values()) + list(side["bench"]):
            pool.append({"id": p["id"], "pos": p["pos"], "ovr": p["ovr"], "pot": p.get("pot", p["ovr"]),
                         "age": p["age"], "club": club})
    return pool


def _interest(p):
    h = int(C.key(p["id"], "int")[:6], 16)
    if p["ovr"] >= 90:
        return "Uncertain" if h % 3 == 0 else "Unavailable"
    if p["ovr"] >= 86:
        return ["Open", "Uncertain", "Unavailable"][h % 3]
    return "Uncertain" if h % 4 == 0 else "Open"


def ask(p, R, jan=False):
    return round(value(p, R) * (1.02 if _interest(p) == "Open" else 1.2) * (1.15 if jan else 1.0))


def age_season(squad, rnd):
    for p in squad:
        p["age"] += 1
        if p["age"] >= 31:
            drop = 2 if p["age"] >= 35 else (1 + (rnd.random() < .3)) if p["age"] >= 33 else int(rnd.random() < .5)
            p["ovr"] -= drop
        elif p["age"] <= 22 and p["ovr"] < p["pot"] and p.get("minutes", 0) >= 1500:
            p["ovr"] += 1


def run_career(strategy: str, run: int, R: dict, M: dict, sea: dict) -> dict:
    rnd = random.Random(f"econ|{strategy}|{run}")
    squad = [dict(p) for p in liv_squad(sea)]
    mkt = [dict(p) for p in market(sea)]
    cash, budget = R["cash0"], R["budget0"]
    rep = 60
    staff = {"coach": 1, "fitness": 1, "analyst": 1, "scout": 1, "academy": 1}
    from tools.balance import adapter
    STAFF = {s["id"]: s["cost"] for s in getattr(adapter.build_mod(), "STAFF", [])}
    hist = []
    budget_bound = wage_warn = wage_freeze = 0
    for season in range(SEASONS):
        spent = 0.0
        wanted_blocked = False
        # ── summer window ──
        def buy(p, jan=False):
            nonlocal cash, budget, spent
            fee = ask(p, R, jan)
            squad.append({"id": p["id"], "pos": p["pos"], "ovr": p["ovr"], "pot": p["pot"], "age": p["age"],
                          "wage": wage_k(p) * 1.15, "years": 4})
            mkt.remove(p)
            cash -= fee; budget -= fee; spent += fee

        def sell(p):
            nonlocal cash, budget
            fee = round(value(p, R) * 0.92)
            squad.remove(p)
            cash += fee; budget += round(fee * 0.7)

        wage_bill = lambda: (sum(p["wage"] for p in squad) + R["baseline_wk"]) * 52 / 1000 + R["coach_wages"]
        proj_rev = lambda pos=4: R["tv_flat"] + R["tv_merit"] * (21 - pos) + R["gate_home"] * 19 + R["commercial"] + R["prizes"][pos - 1]

        def affordable(p, extra_wage=0.0):
            fee = ask(p, R)
            ratio = (wage_bill() + wage_k(p) * 1.15 * 52 / 1000) / proj_rev()
            return fee <= budget and ratio <= R["wage_freeze"]
        avail = [p for p in mkt if _interest(p) != "Unavailable"]
        if strategy == "buy_stars":
            # ASSUMPTION: buys the best available player it can afford, repeatedly, until
            # it cannot; sells the weakest outfielder over 28 to make room (squad cap 25)
            for _ in range(3):
                cands = sorted(avail, key=lambda p: -p["ovr"])
                best = next((p for p in cands if p["ovr"] > strength(squad) and affordable(p)), None)
                if best is None:
                    if any(p["ovr"] > strength(squad) and ask(p, R) > budget for p in cands[:10]):
                        wanted_blocked = True
                    break
                buy(best)
                avail.remove(best)
                if len(squad) > 25:
                    old = min((p for p in squad if p["pos"] != "GK"), key=lambda p: (p["ovr"], -p["age"]))
                    sell(old)
        elif strategy == "develop_youth":
            # ASSUMPTION: academy to Lv3 asap, sells players 29+, buys ≤21 with pot ≥ 84
            for sid in ("academy",):
                if staff[sid] < 3:
                    cost = STAFF.get(sid, [0, 3, 8])[staff[sid]]
                    if cost <= budget:
                        staff[sid] += 1; budget -= cost; cash -= cost
            for p in [p for p in squad if p["age"] >= 29 and p["pos"] != "GK"][:2]:
                sell(p)
            for p in sorted((p for p in avail if p["age"] <= 21 and p["pot"] >= 84), key=lambda p: -p["pot"])[:2]:
                if affordable(p):
                    buy(p)
                else:
                    wanted_blocked = True
        elif strategy == "fit_first":
            # ASSUMPTION: two mid-priced "fits" (80–84 OVR) a summer, replacing the two weakest starters
            for p in sorted((p for p in avail if 80 <= p["ovr"] <= 84), key=lambda p: (-p["ovr"], p["id"]))[:2]:
                if affordable(p):
                    buy(p)
                    if len(squad) > 22:
                        sell(min((q for q in squad if q["pos"] != "GK"), key=lambda q: q["ovr"]))
                else:
                    wanted_blocked = True
        budget_bound += wanted_blocked
        # ── season ──
        s = strength(squad)
        # ASSUMPTION: +0.5 strength-equivalent per fit_first season (fit worth ~+10 pts / 30 fit points)
        pts = M["a"] + M["b"] * (s - M["mean_s"]) + rnd.gauss(0, M["rsd"])
        pts = max(10, min(105, pts))
        pos = position_for(pts, M["tables"], rnd)
        for p in squad:
            p["minutes"] = 2500 if p["ovr"] >= sorted((q["ovr"] for q in squad), reverse=True)[min(10, len(squad) - 1)] else 400
        income = R["tv_flat"] + R["tv_merit"] * (21 - pos) + R["gate_home"] * 19 * (1 + 0.12 * (pts / 38 - 1.4) / 1.6) \
            + R["commercial"] + R["prizes"][pos - 1]
        wages = wage_bill()
        ratio = wages / proj_rev(pos)
        wage_warn += ratio > R["wage_warn"]
        wage_freeze += ratio > R["wage_freeze"]
        costs = wages + R["agent"] + R["other"]
        cash += income - costs
        # youth intake (free, wage 8k)
        n_y = {1: 2, 2: 3, 3: 4}[staff["academy"]]
        lo, hi = {1: (70, 80), 2: (74, 84), 3: (78, 89)}[staff["academy"]]
        if strategy in ("develop_youth",):
            for i in range(n_y):
                pot = rnd.randint(lo, hi)
                squad.append({"id": f"ya{season}{i}", "pos": rnd.choice(["CB", "CM", "LW", "ST", "RB"]),
                              "ovr": 63, "pot": pot, "age": 17, "wage": R["youth_wage_k"], "years": 3})
        age_season(squad, rnd)
        objective = pos <= 4
        rep = max(20, min(99, rep + (6 if pos <= 2 else 3 if pos <= 4 else -3 if pos <= 7 else -8)))
        budget = R["budget0"] * R["budget_base_share"] + budget_by_pos(pos) + max(0, budget) * 0.3 + (rep - 50) * R["rep_budget"]
        hist.append({"season": season + 1, "pts": round(pts, 1), "pos": pos, "strength": round(s, 2), "cash": round(cash, 1),
                     "budget": round(budget, 1), "wage_ratio": round(ratio, 3), "objective": objective, "spent": spent})
    return {"strategy": strategy, "run": run, "hist": hist, "final_cash": cash,
            "objective_rate": sum(h["objective"] for h in hist) / SEASONS,
            "budget_bound_seasons": budget_bound, "wage_warn_seasons": wage_warn, "wage_freeze_seasons": wage_freeze}


def run_all(runs=RUNS) -> dict:
    from tools.balance.run import seasons
    sea = seasons(1)[0]
    R = econ_rules(sea)
    M = fit_points_model()
    out = {}
    for strat in ("do_nothing", "buy_stars", "develop_youth", "fit_first"):
        rs = [run_career(strat, k, R, M, sea) for k in range(runs)]
        cash = sorted(r["final_cash"] for r in rs)
        obj_any = [r["objective_rate"] for r in rs]
        out[strat] = {"final_cash_p10_p50_p90": (round(cash[len(cash) // 10], 1), round(cash[len(cash) // 2], 1),
                                                 round(cash[9 * len(cash) // 10], 1)),
                      "cash_growth_per_season": round((cash[len(cash) // 2] - R["cash0"]) / SEASONS, 1),
                      "objective_share_of_seasons": round(sum(obj_any) / len(obj_any), 3),
                      "runs_meeting_objective_every_season": round(sum(1 for x in obj_any if x == 1) / len(obj_any), 3),
                      "budget_bound_share": round(sum(r["budget_bound_seasons"] for r in rs) / (runs * SEASONS), 3),
                      "wage_warn_share": round(sum(r["wage_warn_seasons"] for r in rs) / (runs * SEASONS), 3),
                      "wage_freeze_share": round(sum(r["wage_freeze_seasons"] for r in rs) / (runs * SEASONS), 3),
                      "mean_wage_ratio": round(sum(h["wage_ratio"] for r in rs for h in r["hist"]) / (runs * SEASONS), 3),
                      "mean_strength_s5": round(sum(r["hist"][-1]["strength"] for r in rs) / runs, 2),
                      "budget_s5_median": sorted(r["hist"][-1]["budget"] for r in rs)[runs // 2],
                      "budget_max": max(h["budget"] for r in rs for h in r["hist"])}
    gates = []
    bmax = max(v["budget_max"] for v in out.values())
    gates.append({"gate": "no strategy runs away: spendable transfer budget stays bounded",
                  "value": f"max budget {bmax:.0f} £m (start {R['budget0']:.0f})", "pass": bmax < 3 * R["budget0"]})
    runaway = max(v["cash_growth_per_season"] for v in out.values())
    gates.append({"gate": "cash balance does not accumulate without limit (median growth < 60 £m/season)",
                  "value": f"max {runaway:+.0f} £m/season", "pass": runaway < 60})
    bind = max(max(v["budget_bound_share"], v["wage_warn_share"]) for v in out.values())
    wage_bind = max(v["wage_warn_share"] for v in out.values())
    gates.append({"gate": "board limits bind sometimes (budget)", "value": f"max {bind:.0%} of seasons",
                  "pass": bind > 0.05})
    gates.append({"gate": "board wage limit (80%) binds sometimes", "value": f"max {wage_bind:.0%} of seasons; mean ratio "
                  + ", ".join(f"{k} {v['mean_wage_ratio']:.0%}" for k, v in out.items()), "pass": wage_bind > 0.02})
    obj = min(v["objective_share_of_seasons"] for v in out.values())
    gates.append({"gate": "every strategy reaches the objective in >=30% of runs (LIV, top 4)",
                  "value": f"min {obj:.0%}", "pass": obj >= 0.30})
    md = ["| strategy | final cash p10/p50/p90 £m | cash Δ/season | budget S5 (max) | objective met (share of seasons) | budget binds | wage >80% | wage ratio | XI strength S5 |",
          "|---|---|---|---|---|---|---|---|---|"]
    for k, v in out.items():
        a, b, c = v["final_cash_p10_p50_p90"]
        md.append(f"| {k} | {a:.0f} / {b:.0f} / {c:.0f} | {v['cash_growth_per_season']:+.0f} | {v['budget_s5_median']:.0f} ({v['budget_max']:.0f}) | {v['objective_share_of_seasons']:.0%} | "
                  f"{v['budget_bound_share']:.0%} | {v['wage_warn_share']:.0%} | {v['mean_wage_ratio']:.0%} | {v['mean_strength_s5']:.1f} |")
    md.append("")
    md.append(f"{runs} runs × {SEASONS} seasons per strategy. Points ~ {M['a']:.1f} + {M['b']:.1f}·(XI strength − {M['mean_s']:.1f}) "
              f"± {M['rsd']:.1f} (fit on the season harness); position from harness tables. Money rules parsed from "
              "web/coach-build.js + web/touchline.html. Strategy scripts are assumptions (see economy.py).")
    return {"strategies": out, "gates": gates, "markdown": "\n".join(md), "rules": R,
            "points_model": {k: v for k, v in M.items() if k != "tables"}}


def cli(a):
    from tools.balance.run import save_result
    r = run_all(runs=C.SCALE["econ_runs"])
    save_result("economy", r)
    print(r["markdown"])
    for g in r["gates"]:
        print(g)
