# G2b unified — closed-loop dithered identification of the unified controller (tools/g2walk_ident.js --ctrlKind U), sharded
# usage: python3 uident.py --tag T --ucfg JSON [--walk JSON] [--vd 0.35,0.6] [--seed 81] [--n 600] [--shards 8]
import argparse, json, os, subprocess, time
H = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(H, "../../../..")); PC = os.path.join(ROOT, "sandbox/visual/physchar"); J = os.path.join(H, "../json")
ap = argparse.ArgumentParser(); ap.add_argument("--tag", required=True); ap.add_argument("--ucfg", default="{}"); ap.add_argument("--walk", default="{}"); ap.add_argument("--vd", default="0.35,0.6")
ap.add_argument("--seed", type=int, default=81); ap.add_argument("--n", type=int, default=600); ap.add_argument("--shards", type=int, default=8); ap.add_argument("--models", default="m8a_tau"); ap.add_argument("--human", default="{}")
a = ap.parse_args(); t0 = time.time(); step = (a.n + a.shards - 1) // a.shards; procs = []
for k in range(a.shards):
    lo, hi = k * step, min(a.n, (k + 1) * step)
    cmd = ["nice", "node", "tools/g2walk_ident.js", "--mode", "cl", "--slow", "--inner", "v8", "--ctrlKind", "U", "--ucfg", a.ucfg, "--vd", a.vd, "--n", str(a.n), "--seed", str(a.seed), "--models", a.models, "--human", a.human,
           "--range", f"{lo},{hi}", "--walk", a.walk, "--out", os.path.join(J, f"uident_{a.tag}_s{k}.json")]
    procs.append(subprocess.Popen(cmd, cwd=PC, stdout=subprocess.DEVNULL, stderr=open(os.path.join(H, "../logs", f"uident_{a.tag}_s{k}.log"), "w")))
for p in procs: p.wait()
D = None
for k in range(a.shards):
    d = json.load(open(os.path.join(J, f"uident_{a.tag}_s{k}.json"))); D = d if D is None else {**D, "runs": D["runs"] + d["runs"]}; os.remove(os.path.join(J, f"uident_{a.tag}_s{k}.json"))
D["runs"].sort(key=lambda r: r["i"]); D["range"] = None; json.dump(D, open(os.path.join(J, f"uident_{a.tag}.json"), "w"))
print(f"[{time.time()-t0:.0f}s] {a.tag}: {len(D['runs'])} runs, upright steps {sum(sum(1 for q in r['rows'] if q['upright'] and q['td'] is not None) for r in D['runs'])}")
