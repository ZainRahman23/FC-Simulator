# technical_control14/tools/tc14_frozen.py — the protected-file check of TECHNICAL-CONTROL-1.4: TECHNICAL-CONTROL-1's protected list + TECHNICAL-CONTROL-1, 1.1,
# 1.2 and 1.3 at their commits, hashed from git and compared with the working tree. Expected to differ: technical_control13/tools/tc13_phase.mjs (an option
# to run its diagnostics on another simulation, o.make — default unchanged).   python3 tc14_frozen.py <out file>
import hashlib, os, subprocess, sys
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../../.."))
def git(*a): return subprocess.run(["git", "-C", ROOT, *a], capture_output=True, check=True).stdout
HOOKED = {"sandbox/visual/technical_control13/tools/tc13_phase.mjs": "an option o.make (another simulation for the same diagnostics); default unchanged"}
prot = [l.split() for l in open(os.path.join(ROOT, "review_artifacts/technical_control1/evidence/frozen_sha256_start.txt")) if l.strip() and not l.startswith("#")]
seen = {p for _, p in prot}; rows = [(h, p, "protected") for h, p in prot]
for base, paths in (("5180c8d0", ["sandbox/visual/technical_control1", "sandbox/visual/technical_control1.html", "review_artifacts/technical_control1"]),
                    ("870804c4", ["sandbox/visual/technical_control11", "sandbox/visual/technical_control11.html", "review_artifacts/technical_control11"]),
                    ("7d14872a", ["sandbox/visual/technical_control12", "sandbox/visual/technical_control12.html", "review_artifacts/technical_control12"]),
                    ("0e124225", ["sandbox/visual/technical_control13", "sandbox/visual/technical_control13.html", "review_artifacts/technical_control13", "sandbox/visual/technical_control11/tc11_body.js"])):
  for p in git("ls-tree", "-r", "--name-only", base, "--", *paths).decode().split():
    if (p in seen and p != "sandbox/visual/technical_control11/tc11_body.js"): continue
    rows = [r for r in rows if r[1] != p]; seen.add(p); rows.append((hashlib.sha256(git("show", f"{base}:{p}")).hexdigest(), p, base))
ok = 0; exp = 0; out = [f"# protected and reference files ({len(rows)}): the working tree vs the recorded hashes"]
for h, p, src in rows:
  fp = os.path.join(ROOT, p); same = os.path.exists(fp) and hashlib.sha256(open(fp, "rb").read()).hexdigest() == h
  if same: ok += 1; out.append("OK   " + p)
  elif p in HOOKED: exp += 1; out.append("HOOK " + p + "  (" + HOOKED[p] + ")")
  else: out.append("DIFF " + p + f"  ({src})")
out.append(f"{ok}/{len(rows)} identical; {exp} changed as expected; {len(rows) - ok - exp} unexpected")
for f in sys.argv[1:]: open(f, "w").write("\n".join(out) + "\n")
print(out[-1]); [print(l) for l in out if l.startswith("DIFF")][:20]
