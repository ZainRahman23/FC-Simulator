# receive_elite1/tools/re1_frozen.py — the protected-file check of RECEIVE-ELITE-1: RECEIVE-MOVING-1's protected list + RECEIVE-MOVING-1 itself (QUEUE #2, committed at
# 036d60ce), hashed from the commit (start) and from the working tree (end).   python3 re1_frozen.py start|end
import hashlib, os, subprocess, sys
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../../..")); EV = os.path.join(ROOT, "review_artifacts/receive_elite1/evidence"); BASE = "036d60ce"
def git(*a): return subprocess.run(["git", "-C", ROOT, *a], capture_output=True, check=True).stdout
if sys.argv[1] == "start":
  rm1 = [l.split()[-1] for l in open(os.path.join(ROOT, "review_artifacts/receive_moving1/evidence/frozen_sha256_start.txt")) if l.strip() and not l.startswith("#")]
  q2 = git("ls-tree", "-r", "--name-only", BASE, "--", "sandbox/visual/receive_moving1", "sandbox/visual/receive_moving1.html", "review_artifacts/receive_moving1").decode().split()
  paths = sorted(set(rm1) | set(q2)); out = [f"# RECEIVE-ELITE-1 protected files: RECEIVE-MOVING-1's list ({len(rm1)}) + RECEIVE-MOVING-1 at {BASE} ({len(q2)}), hashed from {BASE}"]
  for p in paths: out.append(hashlib.sha256(git("show", f"{BASE}:{p}")).hexdigest() + "  " + p)
  open(os.path.join(EV, "frozen_sha256_start.txt"), "w").write("\n".join(out) + "\n"); print(len(paths), "files")
else:
  rows = [l.split() for l in open(os.path.join(EV, "frozen_sha256_start.txt")) if l.strip() and not l.startswith("#")]; ok = 0; out = ["# end check of RECEIVE-ELITE-1: the working tree vs frozen_sha256_start.txt"]
  for h, p in rows:
    fp = os.path.join(ROOT, p); same = os.path.exists(fp) and hashlib.sha256(open(fp, "rb").read()).hexdigest() == h; ok += same; out.append(("OK  " if same else "DIFF ") + p)
  out.append(f"# {ok}/{len(rows)} identical"); open(os.path.join(EV, "frozen_sha256_end_check.txt"), "w").write("\n".join(out) + "\n"); print(out[-1])
