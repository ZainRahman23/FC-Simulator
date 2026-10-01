# G2b speed work — ONE ITERATION of the measured-response loop for an inner-loop / controller configuration:
#   1. closed-loop identification (Controller A + seeded dither, decisions at the step start) with the configuration's options, in parallel shards
#   2. the maps fitted from it (fit_maps.py, linT, τ = 0 … 0.25) and the measured first step (first_step.py)
#   3. a six-start evaluation (tools/g2walk_diag.js) of the walker with those maps and that first step
# Every file is kept (g2_speed/json/ident_<tag>*.json, g2_walker/json/m_<tag>_tau*.json, g2_speed/json/diag_<tag>.json).
# usage: python3 iterate.py --tag T --models m8a_tau [--ctrlX JSON] [--human JSON] [--walk JSON] [--seed 91] [--n 600] [--shards 4] [--evalCtrl JSON] [--foot F0]
import argparse, json, os, re, subprocess, sys, time
H = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(H, "../../../..")); PC = os.path.join(ROOT, "sandbox/visual/physchar")
J = os.path.join(H, "../json"); GW = os.path.join(H, "../../g2_walker/analysis")
ap = argparse.ArgumentParser(); ap.add_argument("--tag", required=True); ap.add_argument("--models", default="m8a_tau"); ap.add_argument("--ctrlX", default="{}"); ap.add_argument("--human", default="{}")
ap.add_argument("--walk", default="{}"); ap.add_argument("--seed", type=int, default=91); ap.add_argument("--n", type=int, default=600); ap.add_argument("--shards", type=int, default=4); ap.add_argument("--evalCtrl", default=None)
ap.add_argument("--foot", default="F0"); ap.add_argument("--skipIdent", action="store_true"); ap.add_argument("--inSwing", default=None); ap.add_argument("--identOnly", action="store_true")
a = ap.parse_args(); t0 = time.time(); tag = a.tag
def sh(cmd, cwd=PC, out=None):
    return subprocess.Popen(cmd, cwd=cwd, stdout=open(out, "w") if out else subprocess.DEVNULL, stderr=subprocess.STDOUT)
os.makedirs(os.path.join(J, "logs"), exist_ok=True)
merged = os.path.join(J, f"ident_{tag}.json")
if not a.skipIdent:
    step = (a.n + a.shards - 1) // a.shards; procs = []
    for k in range(a.shards):
        lo, hi = k * step, min(a.n, (k + 1) * step)
        cmd = ["nice", "node", "tools/g2walk_ident.js", "--mode", "cl", "--slow", "--inner", "v8", "--n", str(a.n), "--seed", str(a.seed), "--models", a.models, "--range", f"{lo},{hi}",
               "--ctrlX", a.ctrlX, "--human", a.human, "--walk", a.walk, "--foot", a.foot, "--out", os.path.join(J, f"ident_{tag}_s{k}.json")]
        if a.inSwing: cmd += ["--inSwing", a.inSwing]
        procs.append(sh(cmd, out=os.path.join(J, "logs", f"ident_{tag}_s{k}.log")))
    for p in procs: p.wait()
    D = None
    for k in range(a.shards):
        d = json.load(open(os.path.join(J, f"ident_{tag}_s{k}.json")))
        if D is None: D = d
        else: D["runs"] += d["runs"]
    D["runs"].sort(key=lambda r: r["i"]); D["range"] = None; json.dump(D, open(merged, "w"))
    for k in range(a.shards): os.remove(os.path.join(J, f"ident_{tag}_s{k}.json"))
    print(f"[{time.time()-t0:5.0f}s] identification: {len(D['runs'])} runs → {merged}", flush=True)
sw = subprocess.run(["python3", os.path.join(H, "swing_fail.py"), merged], capture_output=True, text=True).stdout; print(sw.strip())
if a.identOnly: sys.exit(0)
fit = subprocess.run(["python3", "fit_maps.py", f"m_{tag}_tau", merged], cwd=GW, capture_output=True, text=True).stdout
print(fit.strip().split("\n")[0]); print(fit.strip().split("\n")[3] if len(fit.strip().split("\n")) > 3 else "")
fs_out = subprocess.run(["python3", "first_step.py", merged], cwd=GW, capture_output=True, text=True).stdout
m = re.search(r"target \[0\.05, 0\.07\] → first step u0 \[([-\d. ]+)\]", fs_out); first = ",".join(x for x in m.group(1).split() if x) if m else "0.224,0.343,0.47"
print("first step", first)
ev = ["node", "tools/g2walk_diag.js", "--models", f"m_{tag}_tau", "--first", first, "--human", a.human, "--walk", a.walk, "--foot", a.foot, "--out", os.path.join(J, f"diag_{tag}.json")]
ev += ["--ctrl", a.evalCtrl if a.evalCtrl else a.ctrlX]
r = subprocess.run(ev, cwd=PC, capture_output=True, text=True); print(r.stdout.strip())
s = subprocess.run(["python3", os.path.join(H, "dsum.py"), os.path.join(J, f"diag_{tag}.json")], capture_output=True, text=True).stdout; print(s.strip())
print(f"[{time.time()-t0:5.0f}s] done {tag}")
