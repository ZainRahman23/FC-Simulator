"""Shared plumbing for the v2 balance harness (§14): paths, cache, pool, stats.

Everything here is deterministic. Results are cached on disk under
``/tmp/v2_balance_cache`` keyed by (engine digest, payload hash) so a re-run
with an unchanged engine and unchanged inputs costs nothing.
"""
from __future__ import annotations

import hashlib
import json
import math
import os
import pickle
import statistics as st
import sys
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path
from typing import Any, Callable, Iterable

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
if str(ROOT / "simulator") not in sys.path:
    sys.path.insert(0, str(ROOT / "simulator"))

CACHE = Path(os.environ.get("V2_BALANCE_CACHE", "/tmp/v2_balance_cache"))
CACHE.mkdir(parents=True, exist_ok=True)


def default_workers() -> int:
    """2 by default (the dev laptop must stay responsive); a remote box passes
    --workers N (or BALANCE_WORKERS)."""
    env = os.environ.get("BALANCE_WORKERS")
    if env:
        return min(2, max(1, int(env))) if sys.platform == "darwin" else max(1, int(env))
    return 2


# Run scale (set by run.py --scale). "smoke" verifies the tooling end to end
# in minutes on 2 workers; "full" is the §14 methodology (hours; remote box).
SCALES = {
    "smoke": {"seasons": 1, "mw_limit": 3, "per_cell": 1, "state_matches": 6, "n": 4, "max_cards": 6,
              "matchup_pools": 1, "matchup_seeds": 1, "matchup_systems": 4, "curve_clubs": 2, "curve_mw_limit": 4,
              "econ_runs": 20, "fit_lams": (-1.0, 0.0, 1.0)},
    "medium": {"seasons": 1, "mw_limit": 0, "per_cell": 1, "state_matches": 0, "n": 8, "max_cards": 0,
               "matchup_pools": 2, "matchup_seeds": 3, "matchup_systems": 8, "curve_clubs": 4, "curve_mw_limit": 0,
               "econ_runs": 100, "fit_lams": (-1.0, 0.0, 1.0)},
    "full": {"seasons": 3, "mw_limit": 0, "per_cell": 6, "state_matches": 0, "n": 16, "max_cards": 0,
             "matchup_pools": 4, "matchup_seeds": 10, "matchup_systems": 8, "curve_clubs": 8, "curve_mw_limit": 0,
             "econ_runs": 200, "fit_lams": (-1.0, -0.5, 0.0, 0.5, 1.0)},
}
SCALE: dict = dict(SCALES["smoke"], name="smoke")


def set_scale(name: str) -> dict:
    SCALE.clear()
    SCALE.update(SCALES[name], name=name)
    return SCALE


# ── digests ─────────────────────────────────────────────────────────────────
def _hash_files(paths: Iterable[Path]) -> str:
    h = hashlib.blake2b(digest_size=8)
    for p in sorted(paths):
        if p.exists():
            h.update(p.name.encode())
            h.update(p.read_bytes())
    return h.hexdigest()


def engine_files_digest() -> str:
    """Hash of the source of everything that decides the football."""
    files = list((ROOT / "simulator" / "fc_simulator").glob("*.py"))
    files += [ROOT / "management.py", ROOT / "bridge.py", ROOT / "labsim.py"]
    return _hash_files(files)


_BEHAVIOUR: dict[str, str] = {}


def engine_digest() -> str:
    """Conservative source digest: reference fixtures cannot prove equivalence
    for other seeds, formations, or enabled build hooks."""
    return engine_files_digest()


def build_digest() -> str:
    """Hash of the manager layer (build.py + data catalogues)."""
    files = [ROOT / "build.py"] + [p for p in (ROOT / "data").glob("*.json") if p.name != "card_effects.json"]
    return _hash_files(files)


def web_digest() -> str:
    """Hash of the JS career layer the request exporter runs."""
    files = list((ROOT / "web").glob("*.js")) + [ROOT / "web" / "touchline.html"]
    return _hash_files(files)


def policy_digest() -> str:
    """Only measured models usable by CPU policy affect football/cache keys.
    Metadata and uncalibrated screening tables do not invalidate matches.
    """
    path = ROOT / "data" / "card_effects.json"
    try:
        table = json.loads(path.read_text())
        cards = {cid: row for cid, row in (table.get("cards") or {}).items()
                 if row.get("calibrated", table.get("calibrated", False))}
        return key(cards) if cards else "heuristic"
    except (OSError, ValueError):
        return "heuristic"


def harness_digest() -> str:
    return _hash_files((ROOT / "tools" / "balance").glob("*.py"))


def provenance() -> dict:
    return json.loads(json.dumps({"engine": engine_digest(), "build": build_digest(), "web": web_digest(),
            "harness": harness_digest(), "policy": policy_digest(), "scale": dict(SCALE)}))


def key(*parts: Any) -> str:
    return hashlib.blake2b(json.dumps(parts, sort_keys=True, default=str).encode(),
                           digest_size=10).hexdigest()


def cache_get(name: str) -> Any | None:
    p = CACHE / name
    if p.exists():
        try:
            with p.open("rb") as f:
                return pickle.load(f)
        except Exception:
            return None
    return None


def cache_put(name: str, obj: Any) -> None:
    p = CACHE / name
    p.parent.mkdir(parents=True, exist_ok=True)
    import tempfile
    fd, tmp_name = tempfile.mkstemp(prefix=p.name, suffix=".tmp", dir=p.parent)
    os.close(fd)
    tmp = Path(tmp_name)
    with tmp.open("wb") as f:
        pickle.dump(obj, f, protocol=pickle.HIGHEST_PROTOCOL)
    tmp.replace(p)


# ── pool ────────────────────────────────────────────────────────────────────
_POOL: ProcessPoolExecutor | None = None


def pool(workers: int | None = None) -> ProcessPoolExecutor:
    global _POOL
    if _POOL is None:
        import multiprocessing as mp
        try:
            ctx = mp.get_context("forkserver")
        except ValueError:
            ctx = mp.get_context("spawn")
        os.environ.setdefault("TOUCHLINE_WORKERS", "0")
        _POOL = ProcessPoolExecutor(max_workers=workers or default_workers(), mp_context=ctx,
                                    initializer=_worker_init, initargs=(os.getpid(),))
    return _POOL


def _worker_init(owner_pid: int) -> None:
    """Workers exit on their own if the harness process dies (no orphans)."""
    import threading
    import time

    def watch() -> None:
        while True:
            time.sleep(2.0)
            try:
                os.kill(owner_pid, 0)
            except ProcessLookupError:
                os._exit(0)
            except PermissionError:
                pass
    threading.Thread(target=watch, daemon=True).start()


def run_map(fn: Callable, args_list: list[tuple], workers: int | None = None,
            label: str = "", chunksize: int = 1, on_result: Callable | None = None) -> list[Any]:
    """Order-preserving parallel map with a progress line on stderr."""
    import time
    if not args_list:
        return []
    ex = pool(workers)
    t0 = time.time()
    futs = [ex.submit(fn, *a) for a in args_list]
    out = []
    step = max(1, len(futs) // 10)
    for i, f in enumerate(futs, 1):
        result = f.result()
        out.append(result)
        if on_result:
            on_result(i - 1, result)
        if label and (i % step == 0 or i == len(futs)):
            print(f"  [{label}] {i}/{len(futs)} · {time.time() - t0:.0f}s", file=sys.stderr, flush=True)
    return out


# ── stats ───────────────────────────────────────────────────────────────────
def mean_se(xs: list[float]) -> tuple[float, float]:
    n = len(xs)
    if n == 0:
        return 0.0, 0.0
    m = sum(xs) / n
    if n < 2:
        return m, 0.0
    return m, st.stdev(xs) / math.sqrt(n)


def ci95(xs: list[float]) -> tuple[float, float, float]:
    m, se = mean_se(xs)
    return m, m - 1.96 * se, m + 1.96 * se


def prop_ci(k: int, n: int) -> tuple[float, float, float]:
    """Wilson 95% interval."""
    if n == 0:
        return 0.0, 0.0, 0.0
    z = 1.96
    p = k / n
    d = 1 + z * z / n
    c = (p + z * z / (2 * n)) / d
    h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return p, c - h, c + h


def ols(X: list[list[float]], y: list[float]) -> tuple[list[float], list[float], float]:
    """Ordinary least squares via normal equations (small p). Returns
    (coefficients, standard errors, residual sd). X includes the intercept."""
    n, p = len(X), len(X[0])
    xtx = [[sum(X[r][i] * X[r][j] for r in range(n)) for j in range(p)] for i in range(p)]
    xty = [sum(X[r][i] * y[r] for r in range(n)) for i in range(p)]
    inv = _inv(xtx)
    beta = [sum(inv[i][j] * xty[j] for j in range(p)) for i in range(p)]
    res = [y[r] - sum(beta[i] * X[r][i] for i in range(p)) for r in range(n)]
    dof = max(1, n - p)
    s2 = sum(e * e for e in res) / dof
    se = [math.sqrt(max(0.0, s2 * inv[i][i])) for i in range(p)]
    return beta, se, math.sqrt(s2)


def _inv(a: list[list[float]]) -> list[list[float]]:
    n = len(a)
    m = [row[:] + [1.0 if i == j else 0.0 for j in range(n)] for i, row in enumerate(a)]
    for c in range(n):
        piv = max(range(c, n), key=lambda r: abs(m[r][c]))
        if abs(m[piv][c]) < 1e-12:
            m[piv][c] += 1e-9           # ridge for a degenerate column
        m[c], m[piv] = m[piv], m[c]
        pv = m[c][c]
        m[c] = [v / pv for v in m[c]]
        for r in range(n):
            if r != c and m[r][c] != 0.0:
                f = m[r][c]
                m[r] = [vr - f * vc for vr, vc in zip(m[r], m[c])]
    return [row[n:] for row in m]


def points(gf: int, ga: int) -> int:
    return 3 if gf > ga else 1 if gf == ga else 0


def seed_list(tag: str, n: int) -> list[int]:
    """The fixed reseed list shared by every arm of a paired comparison."""
    return [int.from_bytes(hashlib.blake2b(f"v2bal|{tag}|{k}".encode(), digest_size=6).digest(), "big")
            for k in range(n)]
