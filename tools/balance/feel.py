"""Variance and "feel" metrics (§14.6) from simulated match records.

- decisions/match: the moments a coach is offered, replicated from
  ``web/coach-match.js`` (goals always; reds, opponent shape changes and the
  60'/75' check-ins subject to the 300 s cooldown and the cap of 8 non-goal
  pauses; the 60'/75' windows only fire if no decision was made yet, which we
  assume, i.e. an upper bound for a passive coach), per side.
- dead-period rate: matches with a 20+ minute gap without a shot (either side).
- comebacks: a side that trailed at any point and did not lose / won.
- agency (share of results changed by the best card at the best moment) is
  computed from the card effect runs in ``effects.py``.
"""
from __future__ import annotations

from typing import Any

from tools.balance import common as C

PAUSE_COOLDOWN = 300
PAUSE_CAP = 8


def _moments(m: dict, me: str) -> int:
    ev = []
    for t, team, _ in m["goals"]:
        ev.append((t, "goal"))
    for t, team in m["reds"]:
        ev.append((t, "red"))
    for t, team in m["shapes"]:
        if team != me:
            ev.append((t, "shape"))
    ev += [(3600, "window"), (4500, "window")]
    ev.sort()
    n = 0
    pauses = 0
    last = -10 ** 9
    for t, k in ev:
        if k == "goal":
            n += 1
            last = t
            continue
        if pauses >= PAUSE_CAP or t - last < PAUSE_COOLDOWN:
            continue
        n += 1
        pauses += 1
        last = t
    return n


def _dead(m: dict, gap_s: int = 1200) -> bool:
    ts = sorted([0] + [t for t, _, _ in m["shots"]] + [5400])
    return any(b - a >= gap_s for a, b in zip(ts, ts[1:]))


def _comeback(m: dict) -> list[tuple[str, str]]:
    """Per side that trailed at some point: (side, 'W'|'D'|'L') final."""
    sc = {"HOME": 0, "AWAY": 0}
    trailed = set()
    for t, team, _ in sorted(m["goals"]):
        sc[team] += 1
        for s, o in (("HOME", "AWAY"), ("AWAY", "HOME")):
            if sc[s] < sc[o]:
                trailed.add(s)
    fh, fa = m["score"]["home"], m["score"]["away"]
    out = []
    for s in trailed:
        gf, ga = (fh, fa) if s == "HOME" else (fa, fh)
        out.append((s, "W" if gf > ga else "D" if gf == ga else "L"))
    return out


def feel_metrics(matches: list[dict]) -> dict[str, Any]:
    if not matches or "goals" not in matches[0]:
        return {}
    mom = [(_moments(m, "HOME") + _moments(m, "AWAY")) / 2 for m in matches]
    dead = sum(_dead(m) for m in matches)
    trailing = [r for m in matches for r in _comeback(m)]
    n_tr = len(trailing)
    won = sum(1 for _, r in trailing if r == "W")
    saved = sum(1 for _, r in trailing if r != "L")
    mm, mse = C.mean_se(mom)
    gaps = []
    for m in matches:
        ts = sorted([0] + [t for t, _, _ in m["shots"]] + [5400])
        gaps.append(max(b - a for a, b in zip(ts, ts[1:])) / 60)
    plays = [len(m.get("plays") or []) for m in matches]
    return {
        "matches": len(matches),
        "moments_per_match": mm, "moments_se": mse,
        "moments_dist": {k: sum(1 for x in mom if round(x) == k) / len(mom) for k in range(0, 11)},
        "dead_rate": dead / len(matches), "dead_ci": C.prop_ci(dead, len(matches))[1:],
        "mean_longest_shotless_min": sum(gaps) / len(gaps),
        "trailed_side_not_lost": saved / max(1, n_tr), "trailed_side_won": won / max(1, n_tr),
        "matches_with_comeback_point": sum(1 for m in matches if any(r != "L" for _, r in _comeback(m))) / len(matches),
        "cpu_card_plays_per_match": sum(plays) / len(plays),
    }


def cpu_cards_opts(f: dict) -> dict | None:
    """Both CPU sides play cards by the build-layer policy (normal difficulty)."""
    from tools.balance import adapter
    if not adapter.available():
        raise RuntimeError("CPU cards requested but build layer unavailable")
    from tools.balance import systems_map
    return {"builds": {"HOME": systems_map.cpu_build(f["home"]),
                       "AWAY": systems_map.cpu_build(f["away"])}}


def cli(a):
    from tools.balance.run import load_result
    r = load_result(a.tag or "baseline")
    print(r and r.get("feel"))
