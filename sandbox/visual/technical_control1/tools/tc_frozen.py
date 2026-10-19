# technical_control1/tools/tc_frozen.py — the protected-file check of TECHNICAL-CONTROL-1: RECEIVE-ELITE-1's protected list (RECEIVE-MOVING-1's list +
# RECEIVE-MOVING-1) + RECEIVE-ELITE-1 itself at 140e96f1 (its code, its lab, its evidence), hashed from the commit (start) and the working tree (end).
#   python3 tc_frozen.py start|end
import hashlib, os, subprocess, sys
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../../..")); EV = os.path.join(ROOT, "review_artifacts/technical_control1/evidence"); BASE = "140e96f1"
def git(*a): return subprocess.run(["git", "-C", ROOT, *a], capture_output=True, check=True).stdout
if sys.argv[1] == "start":
  re1 = [l.split()[-1] for l in open(os.path.join(ROOT, "review_artifacts/receive_elite1/evidence/frozen_sha256_start.txt")) if l.strip() and not l.startswith("#")]
  own = git("ls-tree", "-r", "--name-only", BASE, "--", "sandbox/visual/receive_elite1", "sandbox/visual/receive_elite1.html", "review_artifacts/receive_elite1").decode().split()
  paths = sorted(set(re1) | set(own)); out = [f"# TECHNICAL-CONTROL-1 protected files: RECEIVE-ELITE-1's list ({len(re1)}) + RECEIVE-ELITE-1 at {BASE} ({len(own)}), hashed from {BASE}"]
  for p in paths: out.append(hashlib.sha256(git("show", f"{BASE}:{p}")).hexdigest() + "  " + p)
  open(os.path.join(EV, "frozen_sha256_start.txt"), "w").write("\n".join(out) + "\n"); print(len(paths), "files")
else:
  rows = [l.split() for l in open(os.path.join(EV, "frozen_sha256_start.txt")) if l.strip() and not l.startswith("#")]; ok = 0; out = ["# end check of TECHNICAL-CONTROL-1: the working tree vs frozen_sha256_start.txt"]
  for h, p in rows:
    fp = os.path.join(ROOT, p); same = os.path.exists(fp) and hashlib.sha256(open(fp, "rb").read()).hexdigest() == h; ok += same; out.append(("OK  " if same else "DIFF ") + p)
  out.append(f"# {ok}/{len(rows)} identical"); open(os.path.join(EV, "frozen_sha256_end_check.txt"), "w").write("\n".join(out) + "\n"); print(out[-1])
