# technical_control13/tools/tc13_frozen.py — the protected-file check of TECHNICAL-CONTROL-1.3 (transitions / phasing): TECHNICAL-CONTROL-1's protected list
# (frozen_sha256_start.txt: every frozen foundation and protected milestone) + TECHNICAL-CONTROL-1 at 5180c8d0 + TECHNICAL-CONTROL-1.1 at 870804c4 +
# TECHNICAL-CONTROL-1.2 at 7d14872a (code, labs, tools, evidence), hashed from git and compared with the working tree. One file is EXPECTED to differ:
# technical_control11/tc11_body.js, which carries TECHNICAL-CONTROL-1.3's default-neutral hooks — its posed skeleton is proved identical to the committed
# file's by tc13_before_equiv.mjs (26/26 cases, every frame).   python3 tc13_frozen.py <out file>
import hashlib, os, subprocess, sys
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../../.."))
def git(*a): return subprocess.run(["git", "-C", ROOT, *a], capture_output=True, check=True).stdout
HOOKED = {"sandbox/visual/technical_control11/tc11_body.js"}
prot = [l.split() for l in open(os.path.join(ROOT, "review_artifacts/technical_control1/evidence/frozen_sha256_start.txt")) if l.strip() and not l.startswith("#")]
seen = {p for _, p in prot}; rows = [(h, p, "protected") for h, p in prot]
for base, paths in (("5180c8d0", ["sandbox/visual/technical_control1", "sandbox/visual/technical_control1.html", "review_artifacts/technical_control1"]),
                    ("870804c4", ["sandbox/visual/technical_control11", "sandbox/visual/technical_control11.html", "review_artifacts/technical_control11"]),
                    ("7d14872a", ["sandbox/visual/technical_control12", "sandbox/visual/technical_control12.html", "review_artifacts/technical_control12"])):
  for p in git("ls-tree", "-r", "--name-only", base, "--", *paths).decode().split():
    if p in seen: continue
    seen.add(p); rows.append((hashlib.sha256(git("show", f"{base}:{p}")).hexdigest(), p, base))
ok = 0; exp = 0; out = [f"# protected and reference files ({len(rows)}): the working tree vs the recorded hashes"]
for h, p, src in rows:
  fp = os.path.join(ROOT, p); same = os.path.exists(fp) and hashlib.sha256(open(fp, "rb").read()).hexdigest() == h
  if same: ok += 1; out.append("OK   " + p)
  elif p in HOOKED: exp += 1; out.append("HOOK " + p + "  (default-neutral hooks; posed skeleton identical — evidence/tc13_before_equiv_*.json)")
  else: out.append("DIFF " + p + f"  ({src})")
out.append(f"{ok}/{len(rows)} identical; {exp} hooked as expected; {len(rows) - ok - exp} unexpected")
for f in sys.argv[1:]: open(f, "w").write("\n".join(out) + "\n")
print(out[-1]); [print(l) for l in out if l.startswith("DIFF")][:20]
