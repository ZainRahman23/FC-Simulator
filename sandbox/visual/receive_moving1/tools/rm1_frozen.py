# receive_moving1/tools/rm1_frozen.py — the protected-file check of RECEIVE-MOVING-1: RECEIVE-CONTROL-2's protected list + RECEIVE-CONTROL-2 itself (QUEUE #1, committed
# at 6060e134), hashed from the commit (start) and from the working tree (end).   python3 rm1_frozen.py start|end
import hashlib, os, subprocess, sys
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../../..")); EV = os.path.join(ROOT, "review_artifacts/receive_moving1/evidence"); BASE = "6060e134"
def git(*a): return subprocess.run(["git", "-C", ROOT, *a], capture_output=True, check=True).stdout
if sys.argv[1] == "start":
  rc2 = [l.split()[-1] for l in open(os.path.join(ROOT, "review_artifacts/receive_control2/evidence/frozen_sha256_start.txt")) if l.strip() and not l.startswith("#")]
  q1 = git("ls-tree", "-r", "--name-only", BASE, "--", "sandbox/visual/receive_control2", "sandbox/visual/receive_control2.html", "review_artifacts/receive_control2").decode().split()
  paths = sorted(set(rc2) | set(q1)); out = [f"# RECEIVE-MOVING-1 protected files: RECEIVE-CONTROL-2's list ({len(rc2)}) + RECEIVE-CONTROL-2 at {BASE} ({len(q1)}), hashed from {BASE}"]
  for p in paths: out.append(hashlib.sha256(git("show", f"{BASE}:{p}")).hexdigest() + "  " + p)
  open(os.path.join(EV, "frozen_sha256_start.txt"), "w").write("\n".join(out) + "\n"); print(len(paths), "files")
else:
  rows = [l.split() for l in open(os.path.join(EV, "frozen_sha256_start.txt")) if l.strip() and not l.startswith("#")]; ok = 0; out = ["# end check of RECEIVE-MOVING-1: the working tree vs frozen_sha256_start.txt"]
  for h, p in rows:
    fp = os.path.join(ROOT, p); same = os.path.exists(fp) and hashlib.sha256(open(fp, "rb").read()).hexdigest() == h; ok += same; out.append(("OK  " if same else "DIFF ") + p)
  out.append(f"# {ok}/{len(rows)} identical"); open(os.path.join(EV, "frozen_sha256_end_check.txt"), "w").write("\n".join(out) + "\n"); print(out[-1])
