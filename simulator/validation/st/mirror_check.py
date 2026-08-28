"""Quick mirror-symmetry check: aggressive + controlled mirrors, 12 seeds."""
import json, statistics, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
import st_guardrails as G
import concurrent.futures as cf

if __name__ == "__main__":
    for nm in ("aggressive", "controlled", "balanced"):
        rows = []
        with cf.ProcessPoolExecutor(max_workers=8) as ex:
            for m in ex.map(G._star, [("matrix", nm, 500+i) for i in range(12)]):
                rows.append(m)
        xh = statistics.mean(r["xg"]["HOME"] for r in rows); xa = statistics.mean(r["xg"]["AWAY"] for r in rows)
        winh = sum(1 for r in rows if r["goals"][0] > r["goals"][1]) / len(rows)
        print(f"{nm}: xG {xh:.2f}/{xa:.2f} share {xh/(xh+xa):.3f} winH {winh:.2f}", flush=True)
