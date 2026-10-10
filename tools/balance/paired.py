"""``paired_effect`` (§14.1): common-random-number counterfactuals.

Same technique as the Decision Lab (``server.decision_lab``/``labsim.finish``):
from a pickled engine at clock t, the SAME list of reseeds is played with and
without a command set. Changing ``engine.rng.seed`` at t leaves the past
untouched and draws a fresh, equally likely future (KeyedRNG, no cursor), so
per-seed differences isolate the decision from the dice.

Each half-match reports the 15-minute window after t (xG, goals) *and* the
full-time result, so one run gives ΔxG/15' (card value) and Δexpected points.
The no-change arm for a (state, seed list) is shared by every card evaluated
from that state and cached.
"""
from __future__ import annotations

import pickle
from functools import lru_cache
from typing import Any

from tools.balance import common as C

WINDOW_S = 900


@lru_cache(maxsize=48)
def _load_blob(path: str) -> bytes:
    with open(path, "rb") as f:
        return pickle.load(f)["blob"]


def _xg(engine, t: str) -> float:
    return sum(s.xg for s in engine.states.values() if s.team_id == t)


def half(blob_path: str, commands: list[dict], reseed: int | None, window_s: int = WINDOW_S) -> dict:
    """Continue a stored state to full time (labsim.finish semantics) and
    also record the window [t, t+window]."""
    import management
    from tools.balance import adapter
    adapter.ensure_appliers()          # registers the 'card' applier (build.py)
    engine = pickle.loads(_load_blob(blob_path))
    t0 = engine.clock
    x0 = {t: _xg(engine, t) for t in ("HOME", "AWAY")}
    g0 = dict(engine.score)
    if reseed is not None:
        engine.rng.seed = int(reseed)
    wend = min(engine.config.duration_seconds, t0 + window_s)
    win = None
    applied = 0
    for cmd in sorted(commands, key=lambda c: int(c["sim_clock"])) + [None]:
        target = wend if cmd is None else int(cmd["sim_clock"])
        if win is None and target >= wend:
            if wend > engine.clock:
                engine.advance(wend - engine.clock)
            win = {"xg": {t: _xg(engine, t) - x0[t] for t in ("HOME", "AWAY")},
                   "goals": {t: engine.score[t] - g0[t] for t in ("HOME", "AWAY")}}
        if cmd is None:
            break
        if target > engine.clock:
            engine.advance(target - engine.clock)
        if engine.is_finished:
            break
        try:
            management.APPLIERS[cmd["kind"]](engine, cmd["payload"])
            applied += 1
        except Exception:
            pass            # no longer valid in this future (e.g. player sent off)
    if win is None:
        win = {"xg": {t: _xg(engine, t) - x0[t] for t in ("HOME", "AWAY")},
               "goals": {t: engine.score[t] - g0[t] for t in ("HOME", "AWAY")}}
    engine.advance(engine.config.duration_seconds - engine.clock)
    return {"win": win, "score": dict(engine.score), "applied": applied,
            "xg_after": {t: _xg(engine, t) - x0[t] for t in ("HOME", "AWAY")}}


def _opp(side: str) -> str:
    return "AWAY" if side == "HOME" else "HOME"


def arm_key(state_id: str, commands: list[dict], seeds: list[int]) -> str:
    return f"arm/{C.engine_digest()}/{state_id}_{C.key(commands, seeds, C.build_digest(), C.harness_digest())}.pkl"


def run_arms(jobs: list[tuple[str, str, list[dict], list[int]]], label: str = "arms") -> list[list[dict]]:
    """jobs: (state_id, blob_path, commands, seeds). Returns per job the list
    of half results (cached per arm)."""
    out: list[Any] = []
    flat, where = [], []
    for j, (sid, path, cmds, seeds) in enumerate(jobs):
        hit = C.cache_get(arm_key(sid, cmds, seeds))
        out.append(hit)
        if hit is None:
            for k, sd in enumerate(seeds):
                future_key = arm_key(sid, cmds, [sd])
                future = C.cache_get(future_key)
                if future is None:
                    flat.append((path, cmds, sd))
                    where.append((j, k))
                else:
                    if out[j] is None:
                        out[j] = [None] * len(seeds)
                    out[j][k] = future[0]
    if flat:
        def persist(i, r):
            j, k = where[i]
            sid, _, cmds, seeds = jobs[j]
            C.cache_put(arm_key(sid, cmds, [seeds[k]]), [r])
        res = C.run_map(half, flat, label=f"{label} ({len(flat)} half-matches)", on_result=persist)
        tmp: dict[int, list] = {}
        for (j, k), r in zip(where, res):
            tmp.setdefault(j, out[j] or [None] * len(jobs[j][3]))[k] = r
        for j, rs in tmp.items():
            out[j] = rs
            sid, _, cmds, seeds = jobs[j]
            C.cache_put(arm_key(sid, cmds, seeds), rs)
    return out


def diff_stats(with_arm: list[dict], without_arm: list[dict], side: str) -> dict:
    """Paired per-seed differences, from ``side``'s perspective."""
    o = _opp(side)
    d = {"dxg_for": [], "dxg_against": [], "dgoals": [], "dpts": [], "dxg_for_ft": [], "dxg_against_ft": [],
         "changed": []}
    pts_w = []
    for a, b in zip(with_arm, without_arm):
        d["dxg_for"].append(a["win"]["xg"][side] - b["win"]["xg"][side])
        d["dxg_against"].append(a["win"]["xg"][o] - b["win"]["xg"][o])
        d["dgoals"].append((a["score"][side] - a["score"][o]) - (b["score"][side] - b["score"][o]))
        pa, pb = C.points(a["score"][side], a["score"][o]), C.points(b["score"][side], b["score"][o])
        d["dpts"].append(pa - pb)
        d["changed"].append(int(pa != pb))
        d["dxg_for_ft"].append(a["xg_after"][side] - b["xg_after"][side])
        d["dxg_against_ft"].append(a["xg_after"][o] - b["xg_after"][o])
        pts_w.append(pa)
    out = {"n": len(d["dpts"])}
    for k, v in d.items():
        m, se = C.mean_se(v)
        out[k] = m
        out["se_" + k] = se
    net = [f - g for f, g in zip(d["dxg_for"], d["dxg_against"])]
    out["dxg_net"], out["se_dxg_net"] = C.mean_se(net)
    out["pts_with"] = sum(pts_w) / max(1, len(pts_w))
    out["pts_without"] = sum(C.points(b["score"][side], b["score"][o]) for b in without_arm) / max(1, len(without_arm))
    return out


def paired_effect(state: dict, commands: list[dict], n: int = 16, side: str | None = None) -> dict:
    """Public primitive: mean/SE of ΔxG for/against (15' window), Δgoals and
    Δexpected points for ``commands`` applied at ``state`` (a state-library
    entry) versus no change, with n common random futures."""
    side = side or state["side"]
    seeds = C.seed_list(f"state|{state['id']}", n)
    w, wo = run_arms([(state["id"], state["path"], commands, seeds),
                      (state["id"], state["path"], [], seeds)], label="paired")
    return diff_stats(w, wo, side)
