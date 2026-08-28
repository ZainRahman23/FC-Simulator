#!/usr/bin/env python3
"""§34/§54 concurrency + soak: N concurrent live matches through the full HTTP
lifecycle with management operations, plus abandonment; measures latency,
errors, isolation, memory."""
import json, os, sys, time, random, tempfile, subprocess, threading, urllib.request
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT)); sys.path.insert(0, str(ROOT / "simulator"))
PORT = 8131; BASE = f"http://127.0.0.1:{PORT}"
CONCURRENT = int(sys.argv[1]) if len(sys.argv) > 1 else 10
TOTAL = int(sys.argv[2]) if len(sys.argv) > 2 else 30

def call(path, body=None, method=None, timeout=60):
    req = urllib.request.Request(BASE + path, method=method or ("POST" if body else "GET"),
                                 data=json.dumps(body).encode() if body else None,
                                 headers={"Content-Type": "application/json"})
    t0 = time.time()
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read()), (time.time() - t0) * 1000

lat = {"start": [], "advance": [], "snapshot": [], "mgmt": []}
errors = []
lock = threading.Lock()

def play_match(i):
    from tests_integration import start_req
    rng = random.Random(i)
    try:
        req = start_req(seed=5_000_000 + i, mode="live")
        req.update({"fixture_id": f"soak-{i}", "save_id": f"soak-save-{i % 7}"})
        r, ms = call("/api/matches/start", req)
        with lock: lat["start"].append(ms)
        mid = r["match_id"]
        if rng.random() < 0.1:                      # abandoned matches are part of life
            call(f"/api/matches/{mid}", method="DELETE")
            return ("abandoned", mid)
        managed = 0
        while True:
            r, ms = call(f"/api/matches/{mid}/advance", {"seconds": 600})
            with lock: lat["advance"].append(ms)
            if managed < 2 and r["clock_seconds"] >= 1800 * (managed + 1):
                body = {"team": "HOME", "tactics": {"pressingIntensity": rng.choice(["Passive","Aggressive","Relentless"])},
                        "request_id": f"soak-{i}-{managed}"}
                _, ms2 = call(f"/api/matches/{mid}/tactics", body)
                with lock: lat["mgmt"].append(ms2)
                managed += 1
            _, ms3 = call(f"/api/matches/{mid}")
            with lock: lat["snapshot"].append(ms3)
            if "full_time" in r:
                return ("ft", mid, r["full_time"]["score"])
    except Exception as e:
        with lock: errors.append((i, str(e)[:120]))
        return ("error", i)

def main():
    data_dir = tempfile.mkdtemp(prefix="tl_soak_")
    env = {**os.environ, "TOUCHLINE_PORT": str(PORT), "TOUCHLINE_DATA_DIR": data_dir,
           "TOUCHLINE_MAX_SESSIONS": str(max(CONCURRENT + 5, 25))}
    proc = subprocess.Popen([sys.executable, str(ROOT / "server.py")], env=env,
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(2.5)
    import statistics as st
    try:
        t0 = time.time()
        results = []
        from concurrent.futures import ThreadPoolExecutor
        with ThreadPoolExecutor(CONCURRENT) as ex:
            for res in ex.map(play_match, range(TOTAL)):
                results.append(res)
        wall = time.time() - t0
        rss = subprocess.run(["ps", "-o", "rss=", "-p", str(proc.pid)], capture_output=True, text=True)
        mem_mb = int(rss.stdout.strip() or 0) / 1024
        ft = [r for r in results if r[0] == "ft"]; ab = [r for r in results if r[0] == "abandoned"]
        print(f"SOAK: {TOTAL} matches ({CONCURRENT} concurrent) in {wall:.0f}s | ft {len(ft)} abandoned {len(ab)} errors {len(errors)}")
        for k, v in lat.items():
            if v: print(f"  {k:<9} p50 {st.median(v):.0f}ms  p95 {sorted(v)[int(0.95*len(v))]:.0f}ms  n={len(v)}")
        print(f"  server RSS after soak: {mem_mb:.0f} MB")
        import store
        store.init(data_dir)
        s = store.stats()
        print(f"  persisted: {s}")
        # isolation: every ft match has its own row with its own seed
        seeds = set()
        for r in ft:
            row = store.get_match(r[1]); seeds.add(row["seed"])
            assert row["status"] == "ft"
        assert len(seeds) == len(ft), "seed collision across matches!"
        active = json.loads(urllib.request.urlopen(BASE + "/api/health").read())["active_matches"]
        print(f"  active sessions after soak: {active} (leak check)")
        if errors: print("  errors:", errors[:5])
        print("SOAK", "PASS" if not errors and active == 0 else "ISSUES")
    finally:
        proc.terminate()

if __name__ == "__main__":
    main()
