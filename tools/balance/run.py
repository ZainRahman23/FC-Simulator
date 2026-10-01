#!/usr/bin/env python3
"""Balance harness entry point (Core Loop v2 §9/§14).

  /tmp/tlvenv/bin/python -m tools.balance.run baseline --seasons 3
  /tmp/tlvenv/bin/python -m tools.balance.run states
  /tmp/tlvenv/bin/python -m tools.balance.run effects [--cards A,B] [--n 16]
  /tmp/tlvenv/bin/python -m tools.balance.run curves | matchup | economy | feel
  /tmp/tlvenv/bin/python -m tools.balance.run report      # regenerate report.md
  /tmp/tlvenv/bin/python -m tools.balance.run all

Every step caches under /tmp/v2_balance_cache keyed by the engine digest (and
build digest where the manager layer is involved), so re-runs are cheap and
results are reproducible from fixed seeds.
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from tools.balance import common as C  # noqa: E402

SEASON_SEED = 20260801
RESULTS = C.CACHE / "results"


def save_result(name: str, obj) -> None:
    RESULTS.mkdir(parents=True, exist_ok=True)
    doc = {"_provenance": C.provenance(), "data": obj}
    path = RESULTS / C.SCALE["name"] / f"{name}.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(doc, indent=1, default=str))
    tmp.replace(path)


def load_result(name: str):
    p = RESULTS / C.SCALE["name"] / f"{name}.json"
    if not p.exists():
        return None
    doc = json.loads(p.read_text())
    if doc.get("_provenance") != C.provenance():
        return None
    return doc["data"]


def seasons(n: int | None = None, mw_limit: int | None = None):
    """Exported seasons (cached). ``mw_limit`` keeps only the first N
    matchweeks (smoke scale)."""
    from tools.balance import league, systems_map
    n = n or C.SCALE["seasons"]
    mw_limit = C.SCALE["mw_limit"] if mw_limit is None else mw_limit
    seas = league.export_seasons([SEASON_SEED + i for i in range(n)])
    systems_map.CLUB_PLAN.update(seas[0]["plan"])
    systems_map.CLUB_BUILDS.update(seas[0].get("cpu_builds") or {})
    if mw_limit:
        seas = [dict(s, fixtures=[f for f in s["fixtures"] if f["mw"] <= mw_limit]) for s in seas]
    return seas


def cmd_baseline(a) -> dict:
    from tools.balance import league, feel
    seas = seasons()
    runs = []
    career_state = {}
    for i, sea in enumerate(seas):
        runs.append(league.sim_season(sea, label=f"baseline s{i + 1}",
                                      opts_fn=(feel.cpu_cards_opts if a.cards else None), career_state=career_state))
    reps = [league.season_report(m) for m in runs]
    out = {"reports": reps, "gates": league.league_gates(reps),
           "feel": feel.feel_metrics([m for r in runs for m in r]),
           "strength": seas[0]["strength"], "plan": seas[0]["plan"],
           "engine": C.engine_digest(), "web": C.web_digest(), "build": C.build_digest(),
           "cards": bool(a.cards), "career_state": career_state if a.cards else None, "when": time.strftime("%Y-%m-%d %H:%M")}
    save_result(a.tag or (("baseline_cards" if a.cards else "baseline")), out)
    for g in out["gates"]:
        print(f"{g['gate']:<44} {g['value']:.3f}  target {g['target']:<10} {('PASS' if g['pass'] else 'FAIL') if g['pass'] is not None else 'UNVERIFIED'}"
              f"  {g.get('per_season', '')}")
    print(json.dumps(out["feel"], indent=1, default=str)[:3000])
    return out


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("step", choices=["baseline", "states", "effects", "curves", "matchup", "economy", "feel", "report", "career", "all"])
    ap.add_argument("--scale", default="smoke", choices=sorted(C.SCALES),
                    help="smoke = minutes on 2 workers (tooling check); full = the §14 methodology (hours)")
    ap.add_argument("--workers", type=int, default=0, help="worker processes (default 2; use cores-2 on a remote box)")
    ap.add_argument("--seasons", type=int, default=0, help="override the scale's season count")
    ap.add_argument("--cards", action="store_true", help="CPU sides play Tactic Cards by policy")
    ap.add_argument("--tag", default="")
    ap.add_argument("--n", type=int, default=0, help="override paired futures per state")
    ap.add_argument("--only", default="", help="comma list of card ids / experiment names")
    ap.add_argument("--states", type=int, default=0, help="limit the state library (0 = all)")
    a = ap.parse_args()
    for field in ("workers", "seasons", "n", "states"):
        if getattr(a, field) < 0:
            ap.error(f"--{field} must be nonnegative")
    C.set_scale(a.scale)
    if a.seasons:
        C.SCALE["seasons"] = a.seasons
    if a.n:
        C.SCALE["n"] = a.n
    a.n = C.SCALE["n"]
    a.seasons = C.SCALE["seasons"]
    if a.workers:
        import os
        os.environ["BALANCE_WORKERS"] = str(a.workers)
    print(f"[balance] scale={a.scale} workers={C.default_workers()} seasons={a.seasons} n={a.n}", file=sys.stderr)
    steps = {"baseline": cmd_baseline}
    for name in ("states", "effects", "curves", "matchup", "economy", "feel", "report", "career"):
        steps[name] = _lazy(name)
    if a.step == "all":
        plain = argparse.Namespace(**vars(a)); plain.cards = False; plain.tag = ""
        cpu = argparse.Namespace(**vars(a)); cpu.cards = True; cpu.tag = ""
        steps["baseline"](plain)
        steps["baseline"](cpu)
        for step in ("states", "effects", "curves", "matchup", "economy", "report"):
            steps[step](cpu if step == "matchup" else plain)
            if step == "effects":
                # Calibrated previews may change the CPU policy. Re-measure
                # baselines under that policy; unchanged tables hit caches.
                steps["baseline"](plain)
                steps["baseline"](cpu)
        return
    steps[a.step](a)


def _lazy(name):
    def run(a):
        import importlib
        mod = importlib.import_module(f"tools.balance.{ {'career': 'career_exp'}.get(name, name) }")
        return mod.cli(a)
    return run


if __name__ == "__main__":
    main()
