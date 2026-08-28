"""RNG integrity for the exp package: run-vs-advance parity, same-seed repro (flags ON)."""
import hashlib, json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
import st_harness as H
from fc_simulator.engine import MatchEngine
import bridge, sqlite3

def build(seed):
    H.set_flags(A=True, B=True, C=True, D=True, E=True)
    row, cmds, _ = H.load_case()
    sr = json.loads(row["start_request_json"])
    home = bridge.build_team(sr["home_team"], "HOME")
    away = bridge.build_team(sr["away_team"], "AWAY")
    config = bridge.build_config(sr.get("config"), sr.get("coach_ai"))
    return MatchEngine(home, away, bridge.ATTRIBUTE_STATS, seed, config)

def dig(eng):
    ev = [e.to_dict() for e in eng.events]
    return hashlib.blake2b(json.dumps(ev, sort_keys=True).encode()).hexdigest()[:24], eng.score.copy()

ok = True
for seed in (4242, 777, 20260823):
    e1 = build(seed); e1.run(); e1.result(); d1, s1 = dig(e1)
    e2 = build(seed)
    while not e2.is_finished:
        e2.advance(7)
    e2.result(); d2, s2 = dig(e2)
    e3 = build(seed); e3.run(); e3.result(); d3, s3 = dig(e3)
    good = d1 == d2 == d3 and s1 == s2 == s3
    ok &= good
    print(f"seed {seed}: run {d1} adv {d2} rerun {d3} score {s1['HOME']}-{s1['AWAY']} {'PARITY+REPRO OK' if good else 'MISMATCH'}")
print("ST-PARITY", "PASS" if ok else "FAIL")
