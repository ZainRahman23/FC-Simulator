# technical_control12/tools/tc12_frozen.py — the protected-file check of TECHNICAL-CONTROL-1.1 (feet) and 1.2 (carry model): TECHNICAL-CONTROL-1's protected list
# (its frozen_sha256_start.txt: every frozen foundation and protected milestone) + TECHNICAL-CONTROL-1 itself at 5180c8d0 (its code, lab, tools and evidence —
# the reference both build on, unchanged), hashed from git and compared with the working tree.   python3 tc12_frozen.py <out file> [more out files]
import hashlib, os, subprocess, sys
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../../..")); BASE = "5180c8d0"
def git(*a): return subprocess.run(["git", "-C", ROOT, *a], capture_output=True, check=True).stdout
prot = [l.split() for l in open(os.path.join(ROOT, "review_artifacts/technical_control1/evidence/frozen_sha256_start.txt")) if l.strip() and not l.startswith("#")]
own = git("ls-tree", "-r", "--name-only", BASE, "--", "sandbox/visual/technical_control1", "sandbox/visual/technical_control1.html", "review_artifacts/technical_control1").decode().split()
rows = [(h, p) for h, p in prot] + [(hashlib.sha256(git("show", f"{BASE}:{p}")).hexdigest(), p) for p in own if p not in {q for _, q in prot}]
ok = 0; out = [f"# protected files: TECHNICAL-CONTROL-1's list ({len(prot)}) + TECHNICAL-CONTROL-1 at {BASE} ({len(own)}): the working tree vs the recorded hashes"]
for h, p in rows:
  fp = os.path.join(ROOT, p); same = os.path.exists(fp) and hashlib.sha256(open(fp, "rb").read()).hexdigest() == h; ok += same; out.append(("OK  " if same else "DIFF ") + p)
out.append(f"{ok}/{len(rows)} identical")
for f in sys.argv[1:]: open(f, "w").write("\n".join(out) + "\n")
print(out[-1]); [print(l) for l in out if l.startswith("DIFF")][:20]
