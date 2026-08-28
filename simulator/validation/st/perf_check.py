"""§52 performance: per-match wall time OFF vs package."""
import sys, time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
import st_harness as H
for label, flags in (("OFF", {}), ("ABCDE", {"A":True,"B":True,"C":True,"D":True,"E":True})):
    H.set_flags(**flags)
    t0 = time.time()
    for seed in (11, 12, 13):
        eng, cmds, _ = H.build_case_engine(seed=seed)
        H.replay(eng, cmds)
    print(f"{label}: {(time.time()-t0)/3:.2f}s per match")
