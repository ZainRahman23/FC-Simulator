"""Core Loop v2 E3 calibration: outcome drift of each new shape vs 4-3-3.

Paired design (common random numbers): the same seeds and the same XI, the
side under test re-slotted into each shape through the engine's own remap;
the opponent stays 4-3-3. Coach AI off (the shape itself is what is
measured). Drift is REPORTED, not tuned (project principle 2).

Run: /tmp/tlvenv/bin/python simulator/validation/e3_formation_drift.py [N] [workers]
"""
from __future__ import annotations

import json
import copy
import math
import sys
from multiprocessing import Pool
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "simulator"))
sys.path.insert(0, str(ROOT))

SHAPES = ("4-3-3", "4-4-2", "3-4-3", "5-3-2")
SETUPS = {"LIV(home)=shape v LIV-mirror 433": "HOME",   # balanced: same XI both sides
          "LIV(home)=shape v EVE 433": "HOME", "EVE(away)=shape v LIV 433": "AWAY"}


def _mirror(side):
    import copy
    side = copy.deepcopy(side)
    for p in list(side["lineup"].values()) + list(side.get("bench") or []):
        p["id"] = p["id"] + "_m"
        p["name"] = p["name"] + " (M)"
    side["name"] = side.get("name", "") + " Mirror"
    return side


def _job(args):
    setup, shape, seed = args
    import management
    from fc_simulator.formations import slot_map_between
    fixture = json.loads((ROOT / "sandbox" / "visual" / "fixture_liv_eve.json").read_text())
    side_key = "home_team" if SETUPS[setup] == "HOME" else "away_team"
    home = copy.deepcopy(fixture["home_team"])
    away = _mirror(home) if "mirror" in setup else copy.deepcopy(fixture["away_team"])
    if shape != "4-3-3":
        side = home if side_key == "home_team" else away
        remap = slot_map_between("4-3-3", shape, extended=True)
        side["lineup"] = {remap[{"CM": "CDM"}.get(k, k)]: p for k, p in side["lineup"].items()}
        side["formation"] = shape
    eng = management.build_engine({"fixture_id": "V2-REF", "seed": seed, "mode": "full",
                                    "config": {"duration_seconds": 5400, "record_rng_audit": False},
                                    "coach_ai": {"home": False, "away": False},
                                    "home_team": home, "away_team": away})
    eng.advance(5400)
    res = eng.result()
    summ = res.summary()
    me, op = SETUPS[setup], ("AWAY" if SETUPS[setup] == "HOME" else "HOME")
    names = {"HOME": res.home, "AWAY": res.away}
    ts = summ["team_stats"]
    return {"setup": setup, "shape": shape, "seed": seed,
            "gf": eng.score[me], "ga": eng.score[op],
            "xgf": ts[names[me]]["xg"], "xga": ts[names[op]]["xg"],
            "shf": ts[names[me]]["shots"], "sha": ts[names[op]]["shots"],
            "poss": summ["possession"].get(names[me], 0.0),
            "box_f": ts[names[me]]["box_entries"], "box_a": ts[names[op]]["box_entries"],
            "crosses_f": ts[names[me]]["crosses"]}


def _pts(r):
    return 3 if r["gf"] > r["ga"] else 1 if r["gf"] == r["ga"] else 0


def main(n=200, workers=6):
    jobs = [(s, f, seed) for s in SETUPS for f in SHAPES for seed in range(1, n + 1)]
    with Pool(workers) as pool:
        rows = pool.map(_job, jobs, chunksize=4)
    out = {"n": n, "rows": rows}
    (ROOT / "simulator" / "validation" / "e3_formation_drift.json").write_text(json.dumps(out))
    keys = ("gf", "ga", "xgf", "xga", "shf", "sha", "poss", "box_f", "box_a", "crosses_f", "pts")
    lines = []
    for setup in SETUPS:
        base = {r["seed"]: r for r in rows if r["setup"] == setup and r["shape"] == "4-3-3"}
        lines.append(f"\n{setup}  (n={n} paired seeds; mean, and paired delta vs 4-3-3 +- SE)")
        lines.append("shape  | " + " | ".join(keys) + " | W-D-L")
        for shape in SHAPES:
            rs = [r for r in rows if r["setup"] == setup and r["shape"] == shape]
            cells = []
            for k in keys:
                vals = [(_pts(r) if k == "pts" else r[k]) for r in rs]
                m = sum(vals) / len(vals)
                if shape == "4-3-3":
                    cells.append(f"{m:.2f}")
                else:
                    d = [(_pts(r) if k == "pts" else r[k]) - (_pts(base[r['seed']]) if k == "pts" else base[r["seed"]][k]) for r in rs]
                    dm = sum(d) / len(d)
                    se = math.sqrt(sum((x - dm) ** 2 for x in d) / (len(d) - 1) / len(d))
                    cells.append(f"{m:.2f} ({dm:+.2f}+-{se:.2f})")
            w = sum(1 for r in rs if r["gf"] > r["ga"]); dr = sum(1 for r in rs if r["gf"] == r["ga"])
            lines.append(f"{shape} | " + " | ".join(cells) + f" | {w}-{dr}-{len(rs) - w - dr}")
    txt = "\n".join(lines)
    (ROOT / "simulator" / "validation" / "e3_formation_drift.txt").write_text(txt + "\n")
    print(txt)


if __name__ == "__main__":
    main(int(sys.argv[1]) if len(sys.argv) > 1 else 200, int(sys.argv[2]) if len(sys.argv) > 2 else 6)
