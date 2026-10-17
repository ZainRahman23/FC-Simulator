"""Card effect table (§14.2) → ``data/card_effects.json`` + card balance
checks (§6.6.4).

For every playable card × every state in the library: ``paired_effect`` with
n common-random futures (the no-card arm per state is shared by all cards).
Outputs per card:
  - regression  y ~ 1 + minute + score_diff + strength_gap   for
    y ∈ {ΔxG for (15'), ΔxG against (15'), Δ expected points}
  - strata (minute × score_diff) pooled means and SEs
  - summary: value per ⚡ (mean |fitted ΔxG net| / cost), min/max Δpts over
    strata, variance (per-future SD of Δpts), "bad context" existence
Plus the raw context grid (one row per card × state).
"""
from __future__ import annotations

import json
import math
import time
from collections import defaultdict
from typing import Any

from tools.balance import common as C
from tools.balance import paired

BAND = (0.05, 0.09)            # value per ⚡ target (spec §6.6.4)
OUT = C.ROOT / "data" / "card_effects.json"


def playable_cards() -> list[dict]:
    from tools.balance import adapter
    cat = adapter.catalog()
    hooks = (cat.get("raw") or {}).get("engine_hooks") or {}
    out = []
    for cid, c in sorted(cat["cards"].items()):
        req = c.get("requires") or []
        if c.get("available") is False:
            continue
        if any(hooks.get(r) is False for r in req):
            continue
        out.append(c)
    return out


def _feat(s: dict) -> list[float]:
    ctx = s.get("ctx") or {}
    g = ctx.get("strength_gap")
    g = s.get("strength_gap_club", 0.0) if g is None else g
    base = [1.0, s["clock"] / 60.0, float(s["score_diff"]), float(g)]
    pair = f"{ctx.get("own_system") or s.get("own_system")}|{ctx.get("opp_system") or s.get("opp_system")}"
    return base + [float(pair == name.removeprefix("system_pair:")) for name in FEATS[4:]]


FEATS = ["const", "minute", "score_diff", "strength_gap"]   # names read by build.table_preview


def compute(lib: list[dict], cards: list[dict], n: int = 16, chunk: int = 20) -> dict[str, dict]:
    """Returns {card_id: {state_id: diff_stats}} (cached arms → resumable)."""
    from tools.balance import adapter
    res: dict[str, dict] = defaultdict(dict)
    # chunk by states so partial progress is cached and resumable
    for i0 in range(0, len(lib), chunk):
        part = lib[i0:i0 + chunk]
        jobs, idx = [], []
        for s in part:
            seeds = C.seed_list(f"state|{s['id']}", n)
            jobs.append((s["id"], s["path"], [], seeds))
            idx.append((s, None))
            for c in cards:
                cmd = adapter.card_command(c["id"], s["side"], s["clock"])
                jobs.append((s["id"], s["path"], [cmd], seeds))
                idx.append((s, c["id"]))
        t0 = time.time()
        arms = paired.run_arms(jobs, label=f"effects states {i0}-{i0 + len(part) - 1}/{len(lib)}")
        base = {}
        for (s, cid), arm in zip(idx, arms):
            if cid is None:
                base[s["id"]] = arm
        for (s, cid), arm in zip(idx, arms):
            if cid is not None:
                d = paired.diff_stats(arm, base[s["id"]], s["side"])
                d["applied_rate"] = sum(1 for a in arm if a.get("applied")) / max(1, len(arm))
                d["result_tv"] = _tv(arm, base[s["id"]], s["side"])
                res[cid][s["id"]] = d
    return res


def _res(a: dict, side: str) -> str:
    o = "AWAY" if side == "HOME" else "HOME"
    return "W" if a["score"][side] > a["score"][o] else "D" if a["score"][side] == a["score"][o] else "L"


def _tv(with_arm, without_arm, side) -> float:
    """Total-variation distance between W/D/L distributions (≈ the share of
    results a card changes)."""
    cw = defaultdict(int); cb = defaultdict(int)
    for a in with_arm:
        cw[_res(a, side)] += 1
    for b in without_arm:
        cb[_res(b, side)] += 1
    n = max(1, len(with_arm))
    return 0.5 * sum(abs(cw[k] - cb[k]) for k in "WDL") / n


def fit_card(card: dict, lib: list[dict], per_state: dict[str, dict]) -> dict:
    rows = [(s, per_state[s["id"]]) for s in lib if s["id"] in per_state]
    X = [_feat(s) for s, _ in rows]
    model = {}
    fitted_net = []
    for y in ("dxg_for", "dxg_against", "dpts", "dxg_net"):
        ys = [d[y] for _, d in rows]
        try:
            beta, se, rsd = C.ols(X, ys)
        except Exception:
            beta, se, rsd = [sum(ys) / len(ys)] + [0] * (len(FEATS) - 1), [0] * len(FEATS), 0
        model[y] = {"coef": dict(zip(FEATS, [round(b, 5) for b in beta])),
                    "se": dict(zip(FEATS, [round(b, 5) for b in se])), "resid_sd": round(rsd, 4)}
        if y == "dxg_net":
            fitted_net = [sum(b * x for b, x in zip(beta, xr)) for xr in X]
    strata = defaultdict(list)
    for s, d in rows:
        strata[(s["cell"][0], s["cell"][1])].append(d)
    st_rows = []
    for (mi, sd), ds in sorted(strata.items()):
        ent = {"minute": mi, "score_diff": sd, "n_states": len(ds), "n": sum(d["n"] for d in ds),
               "mean": {}, "se": {}}
        for y in ("dxg_for", "dxg_against", "dpts", "dxg_net"):
            vals = [d[y] for d in ds]
            m = sum(vals) / len(vals)
            # SE of a mean of per-state paired means: combine within-state SEs
            se = math.sqrt(sum(d["se_" + y] ** 2 for d in ds)) / len(ds)
            ent["mean"][y] = round(m, 4)
            ent["se"][y] = round(se, 4)
        st_rows.append(ent)
    cost = card.get("cost", 1) or 0
    mean_abs = sum(abs(v) for v in fitted_net) / max(1, len(fitted_net))
    all_net = [d["dxg_net"] for _, d in rows]
    all_pts = [d["dpts"] for _, d in rows]
    m_net, se_net = C.mean_se(all_net)
    m_pts, se_pts = C.mean_se(all_pts)
    sd_future = [d["se_dpts"] * math.sqrt(d["n"]) for _, d in rows]
    worst = min(st_rows, key=lambda e: e["mean"]["dpts"]) if st_rows else None
    best = max(st_rows, key=lambda e: e["mean"]["dpts"]) if st_rows else None
    summary = {
        "cost": cost, "n_states": len(rows), "n_per_state": rows[0][1]["n"] if rows else 0,
        "mean_abs_fitted_dxg_net": round(mean_abs, 4),
        "per_energy": round(mean_abs / cost, 4) if cost else None,
        "mean_dxg_net": round(m_net, 4), "se_dxg_net": round(se_net, 4),
        "mean_dpts": round(m_pts, 4), "se_dpts": round(se_pts, 4),
        "min_stratum_dpts": worst and {"minute": worst["minute"], "score_diff": worst["score_diff"],
                                       "dpts": worst["mean"]["dpts"], "se": worst["se"]["dpts"]},
        "max_stratum_dpts": best and {"minute": best["minute"], "score_diff": best["score_diff"],
                                      "dpts": best["mean"]["dpts"], "se": best["se"]["dpts"]},
        "has_bad_context": bool(worst and worst["mean"]["dpts"] < 0),
        "has_significant_bad_context": bool(worst and worst["mean"]["dpts"] + 1.96 * worst["se"]["dpts"] < 0),
        "future_sd_dpts": round(sum(sd_future) / max(1, len(sd_future)), 3),
        "applied_rate": round(sum(d["applied_rate"] for _, d in rows) / max(1, len(rows)), 3),
        "mean_result_tv": round(sum(d["result_tv"] for _, d in rows) / max(1, len(rows)), 4),
    }
    return {"card_version": card.get("version") or card.get("v") or None, "cost": cost,
            "type": card.get("type"), "model": model, "strata": st_rows, "summary": summary}


def dominance(table: dict[str, dict]) -> list[dict]:
    """Card A strictly dominates B (same cost) if A's Δpts beats B's in every
    shared (minute, score_diff) stratum."""
    out = []
    ids = sorted(table)
    for a in ids:
        for b in ids:
            if a == b or table[a]["cost"] != table[b]["cost"]:
                continue
            sa = {(e["minute"], e["score_diff"]): e for e in table[a]["strata"]}
            sb = {(e["minute"], e["score_diff"]): e for e in table[b]["strata"]}
            keys = sorted(set(sa) & set(sb))
            if len(keys) < 5:
                continue
            if all(sa[k]["mean"]["dpts"] > sb[k]["mean"]["dpts"] for k in keys):
                # significance: pooled paired difference over strata
                diffs = [sa[k]["mean"]["dpts"] - sb[k]["mean"]["dpts"] for k in keys]
                se = math.sqrt(sum(sa[k]["se"]["dpts"] ** 2 + sb[k]["se"]["dpts"] ** 2 for k in keys)) / len(keys)
                out.append({"dominant": a, "dominated": b, "cost": table[a]["cost"], "strata": len(keys),
                            "mean_gap": round(sum(diffs) / len(diffs), 3), "se": round(se, 3)})
    return out


def agency(lib: list[dict], per_card: dict[str, dict], table: dict[str, dict]) -> dict:
    """Share of results changed by the best card (model-chosen per state):
    TV distance of the W/D/L distribution, averaged over states; and the
    per-match best-moment version (max over a match's sampled states)."""
    from tools.balance import adapter  # noqa: F401
    per_state = []
    by_match = defaultdict(list)
    for s in lib:
        x = _feat(s)
        best, bv = None, -1e9
        for cid, t in table.items():
            if s["id"] not in per_card.get(cid, {}):
                continue
            co = t["model"]["dpts"]["coef"]
            v = sum(co[f] * xi for f, xi in zip(FEATS, x))
            if v > bv:
                best, bv = cid, v
        if best is None:
            continue
        tv = per_card[best][s["id"]]["result_tv"]
        changed = per_card[best][s["id"]]["changed"]
        per_state.append(tv)
        by_match[s.get("seed")].append(changed)
    # placebo floor: TV between two independent 16-future samples of the same
    # distribution is not 0; estimate from the least-effective card
    m, se = C.mean_se(per_state)
    return {"mean_tv_best_card": round(m, 4),
            "agency_method": "Paired changed-result fraction at best sampled moment; in-sample card selection, screening only", "se": round(se, 4), "n_states": len(per_state),
            "paired_changed_best_moment_per_match": round(sum(max(v) for v in by_match.values()) / max(1, len(by_match)), 4)}


def placebo_tv(lib: list[dict], n: int = 16) -> dict:
    """Noise floor for TV: the base arm vs a second base arm with a disjoint
    seed list (same state, no card). Any TV below this is indistinguishable
    from dice."""
    jobs = []
    for s in lib:
        jobs.append((s["id"], s["path"], [], C.seed_list(f"state|{s['id']}", n)))
        jobs.append((s["id"], s["path"], [], C.seed_list(f"placebo|{s['id']}", n)))
    arms = paired.run_arms(jobs, label="placebo")
    tvs = [_tv(arms[i], arms[i + 1], lib[i // 2]["side"]) for i in range(0, len(arms), 2)]
    m, se = C.mean_se(tvs)
    return {"mean_tv_noise": round(m, 4), "se": round(se, 4)}


def build_table(lib, cards, n=16) -> dict:
    pairs = sorted({f"{(s.get("ctx") or {}).get("own_system") or s.get("own_system")}|{(s.get("ctx") or {}).get("opp_system") or s.get("opp_system")}" for s in lib})
    FEATS[:] = ["const", "minute", "score_diff", "strength_gap"] + ["system_pair:" + pair for pair in pairs[1:]]
    per_card = compute(lib, cards, n=n)
    table = {c["id"]: fit_card(c, lib, per_card[c["id"]]) for c in cards if per_card.get(c["id"])}
    grid = []
    for c in cards:
        for s in lib:
            d = per_card.get(c["id"], {}).get(s["id"])
            if not d:
                continue
            ctx = s.get("ctx") or {}
            grid.append({"state_id": s["id"], "minute": s["clock"] // 60, "score_diff": s["score_diff"],
                         "strength_gap": round(float(ctx.get("strength_gap") or s.get("strength_gap_club") or 0), 2),
                         "own_system": ctx.get("own_system"), "opp_system": ctx.get("opp_system"),
                         "card_id": c["id"], "dxg_for": round(d["dxg_for"], 4),
                         "dxg_against": round(d["dxg_against"], 4), "dpts": round(d["dpts"], 4),
                         "se_dpts": round(d["se_dpts"], 4), "se_dxg_net": round(d["se_dxg_net"], 4),
                         "result_tv": round(d["result_tv"], 4), "n": d["n"]})
    return {"per_card": per_card, "table": table, "grid": grid}


def holdout_calibration(lib, per_card):
    """Deterministic fixture-level holdout avoids shared-match state leakage.
    Compare predicted net xG against held-out paired estimates and the zero
    baseline. No measured preview is marked calibrated from in-sample fit.
    """
    training = [s for s in lib if int(C.key("holdout", s.get("seed"))[:8], 16) % 5]
    testing = [s for s in lib if s not in training]
    output = {}
    for cid, states in per_card.items():
        train = [s for s in training if s["id"] in states]
        test = [s for s in testing if s["id"] in states]
        if len(train) <= len(FEATS) or len(test) < 20:
            output[cid] = {"pass": False, "reason": "Insufficient independent holdout states", "n_test": len(test)}
            continue
        try:
            coef, _, _ = C.ols([_feat(s) for s in train], [states[s["id"]]["dxg_net"] for s in train])
            by_fixture = defaultdict(list)
            for state in test:
                y = states[state["id"]]["dxg_net"]
                predicted = sum(b * x for b, x in zip(coef, _feat(state)))
                by_fixture[state.get("seed")].append(y * y - (y - predicted) ** 2)
            improvement = [sum(values) / len(values) for values in by_fixture.values()]
            mean, lower, upper = C.ci95(improvement)
            output[cid] = {"pass": len(improvement) >= 20 and lower > 0,
                           "n_test": len(test), "n_test_fixtures": len(improvement), "mse_improvement": mean,
                           "ci95": [lower, upper]}
        except (ValueError, ZeroDivisionError):
            output[cid] = {"pass": False, "reason": "Regression rank/coverage failure"}
    return output


def write_json(table: dict, grid: list, n: int, extra: dict | None = None) -> dict:
    from tools.balance import adapter
    cat = adapter.catalog()
    doc = {"version": 1, "generated": time.strftime("%Y-%m-%d %H:%M"),
           "engine_digest": C.engine_digest(), "build_digest": C.build_digest(),
           "cards_version": cat.get("version"), "n": n, "window_s": paired.WINDOW_S,
           "features": FEATS, "feature_note": "minute = match minute (0-90); score_diff and strength_gap (mean OVR of active XI minus opponent, build.card_context) from the card player's side",
           "band_per_energy": list(BAND), "cards": table, "grid": grid, **(extra or {})}
    doc["calibrated"] = (C.SCALE["name"] == "full" and n >= 16 and len(grid) >= 300 * len(table)
                         and bool(doc.get("calibration")) and all(v["pass"] for v in doc["calibration"].values()))
    for cid, card in table.items():
        calibration = (doc.get("calibration") or {}).get(cid) or {}
        card["calibrated"] = C.SCALE["name"] == "full" and n >= 16 and card["summary"]["n_states"] >= 300 and calibration.get("pass") is True
        card["utility_kind"] = "information" if cid == "read_the_game" else "pitch"
        if cid == "read_the_game":
            card["calibrated"] = False
            card["utility_note"] = "Reveals opponent intent; informational utility is unmeasured by causal xG futures."
    doc["scale"] = C.SCALE["name"]
    doc["limitations"] = "In-sample regression; requires independent holdout calibration before measured UI previews."
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(doc, indent=1))
    return doc


def cli(a):
    from tools.balance import states
    from tools.balance.run import save_result
    lib = states.load(a)
    cards = playable_cards()
    if C.SCALE["max_cards"] and not a.only:
        cards = cards[:C.SCALE["max_cards"]]
    if a.only:
        keep = set(a.only.split(","))
        cards = [c for c in cards if c["id"] in keep]
    print(f"effect table: {len(cards)} cards x {len(lib)} states x n={a.n}")
    out = build_table(lib, cards, n=a.n)
    table = out["table"]
    dom = dominance(table)
    ag = agency(lib, out["per_card"], table)
    pl = placebo_tv(lib, n=a.n)
    calibration = holdout_calibration(lib, out["per_card"])
    write_json(table, out["grid"], a.n, {"dominance": dom, "agency": ag, "placebo": pl, "calibration": calibration})
    save_result("effects_summary", {"summary": {k: v["summary"] for k, v in table.items()},
                                    "dominance": dom, "agency": ag, "placebo": pl,
                                    "n_states": len(lib), "n": a.n, "calibration": calibration})
    for cid, t in sorted(table.items(), key=lambda kv: -(kv[1]["summary"]["per_energy"] or 0)):
        s = t["summary"]
        print(f"{cid:<24} ⚡{s['cost']} value/⚡ {s['per_energy']}  Δpts {s['mean_dpts']:+.3f}±{s['se_dpts']:.3f}"
              f"  worst {s['min_stratum_dpts']}  bad={s['has_bad_context']}")
    print("dominance:", dom)
    print("agency:", ag, "placebo:", pl)
