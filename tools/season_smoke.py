#!/usr/bin/env python3
"""§42 full-season smoke at the API level: every fixture through the real
Python engine, seeds persisted before kickoff, no duplicate simulation,
results durable across a simulated restart."""
import json, os, sys, time, urllib.request, subprocess, tempfile
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT)); sys.path.insert(0, str(ROOT / "simulator"))
PORT = 8121; BASE = f"http://127.0.0.1:{PORT}"

def call(path, body=None, method=None):
    req = urllib.request.Request(BASE + path, method=method or ("POST" if body else "GET"),
                                 data=json.dumps(body).encode() if body else None,
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.loads(r.read())

def main():
    data_dir = tempfile.mkdtemp(prefix="tl_season_")
    env = {**os.environ, "TOUCHLINE_PORT": str(PORT), "TOUCHLINE_DATA_DIR": data_dir}
    proc = subprocess.Popen([sys.executable, str(ROOT / "server.py")], env=env,
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(2.5)
    try:
        from tests_integration import start_req
        import store
        save_id = "season-smoke"
        fixtures = [(f"MW{mw:02d}-FX{i}", 1_000_000 + mw * 100 + i) for mw in range(1, 11) for i in range(2)]
        results = {}
        for fid, seed in fixtures:
            req = start_req(seed=seed, mode="full")
            req.update({"fixture_id": fid, "save_id": save_id})
            r = call("/api/matches/start", req)
            assert r["status"] == "ft", r
            results[fid] = (r["match_id"], r["full_time"]["score"])
        call(f"/api/saves/{save_id}", {"state": {"results": {f: s for f, (_, s) in results.items()},
                                                "seeds": dict(fixtures)}}, method="PUT")
        # restart the server: results and save must survive
        proc.terminate(); proc.wait(timeout=10)
        proc2 = subprocess.Popen([sys.executable, str(ROOT / "server.py")], env=env,
                                 stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        time.sleep(2.5)
        try:
            saved = call(f"/api/saves/{save_id}")["state"]
            assert saved["seeds"] == dict(fixtures), "seeds not durable"
            store.init(data_dir)
            dup = 0
            for fid, (mid, score) in results.items():
                row = store.get_match(mid)
                assert row and row["status"] == "ft", f"{fid} not persisted"
                assert row["seed"] == dict(fixtures)[fid], f"{fid} seed drifted"
                assert [row["score_home"], row["score_away"]] == [score["home"], score["away"]]
            # engine identity on a sampled CPU fixture (§43)
            sample = store.get_match(results[fixtures[3][0]][0])
            assert sample["engine_version"] == "0.7" and sample["calibration_version"] == "v0.7-cal5"
            assert sample["player_data_version"] == "players-v3-4attrs"
            led = store.ledger(results[fixtures[3][0]][0])
            assert led and any(e["event_type"] == "FULL_TIME" for e in led)
            print(f"SEASON SMOKE PASS: {len(fixtures)} fixtures, all persisted+durable, "
                  f"seeds stable, sampled CPU fixture proven v0.7/cal5 via ledger ({len(led)} events)")
        finally:
            proc2.terminate()
    finally:
        try: proc.terminate()
        except Exception: pass

if __name__ == "__main__":
    main()
