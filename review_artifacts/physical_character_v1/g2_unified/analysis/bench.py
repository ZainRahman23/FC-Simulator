# G2b unified controller — run the matched-state step bench (tools/g2_stepbench.js) in parallel shards and summarise.
# usage: python3 bench.py --tag T --cases cases.json [--shards 6] [--extra "--models m_x_tau --first a,b,c ..."]   (or import run())
import argparse, json, os, subprocess, sys, time, shlex
H = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(H, "../../../..")); PC = os.path.join(ROOT, "sandbox/visual/physchar"); J = os.path.join(H, "../json")
def run(tag, cases, shards=6, extra="", quiet=False):
    os.makedirs(os.path.join(J, "tmp"), exist_ok=True); cf = os.path.join(J, "tmp", f"cases_{tag}.json"); json.dump(cases, open(cf, "w"))
    procs = []
    for k in range(shards):
        cmd = ["nice", "node", "tools/g2_stepbench.js", "--cases", cf, "--shard", f"{k}/{shards}", "--out", os.path.join(J, "tmp", f"sb_{tag}_{k}.json")] + shlex.split(extra)
        procs.append(subprocess.Popen(cmd, cwd=PC, stdout=subprocess.DEVNULL, stderr=open(os.path.join(H, "../logs", f"sb_{tag}_{k}.log"), "w")))
    for p in procs: p.wait()
    rows = []
    for k in range(shards):
        f = os.path.join(J, "tmp", f"sb_{tag}_{k}.json"); rows += json.load(open(f))["rows"]; os.remove(f)
    os.remove(cf); json.dump({"tag": tag, "extra": extra, "rows": rows}, open(os.path.join(J, f"sb_{tag}.json"), "w")); return rows
if __name__ == "__main__":
    ap = argparse.ArgumentParser(); ap.add_argument("--tag", required=True); ap.add_argument("--cases", required=True); ap.add_argument("--shards", type=int, default=6); ap.add_argument("--extra", default="")
    a = ap.parse_args(); t0 = time.time(); rows = run(a.tag, json.load(open(a.cases)), a.shards, a.extra); print(f"{a.tag}: {len(rows)} rows in {time.time()-t0:.0f}s")
