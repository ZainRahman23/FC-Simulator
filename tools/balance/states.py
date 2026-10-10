"""State library (§14.1): representative match states sampled from simulated
league matches, stratified by minute (15/30/45/60/75), score difference from
the card-player's side (−2..+2), strength gap (3 bins) and system pair.

Each state is a pickled engine (built with ``build.build_engine`` so it
carries the card runtime) stored under the cache with its context. Engines
are recreated deterministically: same request + same seed → the exact match
the season harness played, advanced to the sampled clock.
"""
from __future__ import annotations

import pickle
from collections import defaultdict
from typing import Any

from tools.balance import common as C

MINUTES = (15, 30, 45, 60, 75)
DIFFS = (-2, -1, 0, 1, 2)
GAP_BINS = ((-99, -2.5, "weaker"), (-2.5, 2.5, "even"), (2.5, 99, "stronger"))
PER_CELL = 6          # 5 x 5 x 3 cells x 6 ≈ 450 before sparse cells → ~400


def gap_bin(g: float) -> str:
    for lo, hi, name in GAP_BINS:
        if lo <= g < hi:
            return name
    return "even"


def _score_at(goals: list, clock: int) -> dict:
    sc = {"HOME": 0, "AWAY": 0}
    for t, team, _ in goals:
        if t <= clock:
            sc[team] += 1
    return sc


def _snap(req: dict, picks: list[tuple[int, str, str]]) -> list[dict]:
    """Worker: build the engine for ``req``, advance, pickle at each clock."""
    import os
    from tools.balance import adapter
    engine = adapter.build_engine(req)
    out = []
    for clock, side, sid in sorted(picks):
        engine.advance(clock - engine.clock)
        blob = pickle.dumps(engine, protocol=pickle.HIGHEST_PROTOCOL)
        path = str(C.CACHE / "states" / C.key(C.engine_digest(), C.build_digest(), C.harness_digest()) / f"{sid}.pkl")
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "wb") as f:
            pickle.dump({"blob": blob}, f, protocol=pickle.HIGHEST_PROTOCOL)
        ctx = adapter.card_context(engine, side)
        other = "AWAY" if side == "HOME" else "HOME"
        out.append({"id": sid, "path": path, "clock": clock, "side": side,
                    "score": dict(engine.score), "score_diff": engine.score[side] - engine.score[other],
                    "ctx": ctx,
                    "formation": {t: engine.teams[t].formation_name for t in ("HOME", "AWAY")}})
    return out


def build_library(matches: list[dict], reqs: list[dict], strength: dict, plan: dict,
                  per_cell: int = PER_CELL, limit: int = 0) -> list[dict]:
    """``matches``: season-harness records (with goal timelines) aligned with
    ``reqs``. Deterministic selection by hash order within each cell."""
    ck = f"statelib/{C.engine_digest()}_{C.build_digest()}_{C.key(reqs, per_cell, limit, C.harness_digest(), C.policy_digest())}.pkl"
    hit = C.cache_get(ck)
    if hit is not None and all(__import__("pathlib").Path(s["path"]).exists() for s in hit):
        return hit
    cells: dict[tuple, list] = defaultdict(list)
    for i, (m, r) in enumerate(zip(matches, reqs)):
        for mi in MINUTES:
            sc = _score_at(m["goals"], mi * 60)
            # alternate the card-player's side by a hash so both sides appear
            side = "HOME" if int(C.key(r["seed"], mi)[:4], 16) % 2 == 0 else "AWAY"
            other = "AWAY" if side == "HOME" else "HOME"
            d = sc[side] - sc[other]
            if d not in DIFFS:
                continue
            me = m["home"] if side == "HOME" else m["away"]
            op = m["away"] if side == "HOME" else m["home"]
            g = (strength.get(me, 78) - strength.get(op, 78))
            cells[(mi, d, gap_bin(g))].append((C.key("state", r, mi), i, mi * 60, side,
                                                g, plan.get(me), plan.get(op)))
    picks_by_match: dict[int, list] = defaultdict(list)
    meta = {}
    for cell, cands in sorted(cells.items()):
        cands.sort()
        diversified = []
        seen_pairs = set()
        for candidate in cands:
            pair = candidate[-2:]
            if pair not in seen_pairs:
                diversified.append(candidate)
                seen_pairs.add(pair)
        cands = diversified + [c for c in cands if c not in diversified]
        used = set()
        for sid, i, clock, side, g, ps, po in cands:
            if len(used) >= per_cell:
                break
            if i in used:
                continue
            used.add(i)
            picks_by_match[i].append((clock, side, sid))
            meta[sid] = {"cell": cell, "strength_gap_club": g, "own_system": ps, "opp_system": po,
                         "fixture": (matches[i]["home"], matches[i]["away"]), "seed": reqs[i]["seed"]}
    items = sorted(picks_by_match.items())
    if limit:
        items = items[:limit]
    res = C.run_map(_snap, [(reqs[i], p) for i, p in items], label="state library")
    lib = []
    for batch in res:
        for s in batch:
            s.update(meta[s["id"]])
            mi, d, gb = s["cell"]
            if s["score_diff"] != d:        # build engine diverged from the harness record
                s["cell_mismatch"] = True
                s["cell"] = (mi, s["score_diff"], gb)
            if s["ctx"].get("strength_gap") is None:
                s["ctx"]["strength_gap"] = s["strength_gap_club"]
            if not s["ctx"].get("own_system"):
                s["ctx"]["own_system"] = s["own_system"]
                s["ctx"]["opp_system"] = s["opp_system"]
            lib.append(s)
    lib.sort(key=lambda s: s["id"])
    C.cache_put(ck, lib)
    return lib


def library_summary(lib: list[dict]) -> dict:
    by = defaultdict(int)
    for s in lib:
        by[(s["cell"][0], s["cell"][1])] += 1
    gaps = defaultdict(int)
    for s in lib:
        gaps[s["cell"][2]] += 1
    return {"n": len(lib), "by_minute_diff": {f"{k[0]}'/{k[1]:+d}": v for k, v in sorted(by.items())},
            "by_gap": dict(gaps)}


def load(a=None) -> list[dict]:
    from tools.balance import league, feel
    from tools.balance.run import seasons
    seas = seasons(1)
    sea = seas[0]
    matches = league.sim_season(sea, opts_fn=feel.cpu_cards_opts, label="CPU season 1 (for states)")
    reqs = [m["request"] for m in matches]
    system_ids = {club: block["system_id"] for club, block in sea["cpu_builds"].items()}
    lib = build_library(matches, reqs, sea["strength"], system_ids,
                        per_cell=C.SCALE["per_cell"], limit=C.SCALE["state_matches"])
    count = getattr(a, "states", 0) if a else 0
    return lib[:count] if count else lib


def cli(a):
    lib = load(a)
    from tools.balance.run import save_result
    s = library_summary(lib)
    save_result("state_library", s)
    print(s)
