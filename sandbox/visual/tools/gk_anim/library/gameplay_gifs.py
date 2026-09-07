# C — gameplay GIFs for the review package from the final ON/OFF free-play captures: runs seq_evidence.py (live mode) on the recorded
# shots, then copies one normal-speed BEFORE-vs-INTEGRATED GIF and the 4× slow-motion crop per family into <package>/gameplay/.
#   python3 gameplay_gifs.py <off_dir> <on_dir> <package_dir> <ids csv>
import sys, os, json, subprocess, shutil, glob
OFF, ON, PKG, IDS = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
HERE = os.path.dirname(os.path.abspath(__file__)); EV = os.path.join(PKG, "gameplay", "_evidence"); os.makedirs(EV, exist_ok=True)
subprocess.run([sys.executable, os.path.join(HERE, "..", "proto_dive", "seq_evidence.py"), EV, "live", OFF, ON, IDS], check=False)
# family label per shot from the ON trace (sequence id at commit) — falls back to the contact art label
rows = []
for sid in IDS.split(","):
    case = f"shot{int(sid):03d}"; tp = os.path.join(ON, f"{case}_trace.json")
    if not os.path.exists(tp): rows.append((case, "not recorded", None)); continue
    T = json.load(open(tp)); tr = T["trace"]
    seq = next((t.get("seq", {}).get("key") for t in tr if isinstance(t.get("seq"), dict) and t["seq"].get("key")), None)
    sqid = next(((t.get("art") or "").split()[1] for t in tr if (t.get("art") or "").startswith("SEQ")), None)
    pick = next((t.get("pick", {}).get("id") for t in tr if isinstance(t.get("pick"), dict)), None)
    cls = next((t["cls"] for t in tr if isinstance(t.get("cls"), dict)), {}) or {}
    lc = T.get("lastContact") or {}
    fam = sqid or (pick and f"pose-only {pick}") or (lc.get("state") or "?")
    rows.append((case, fam, {"pick": pick, "family": cls.get("family"), "hClass": cls.get("hClass"), "norm": cls.get("norm"), "outcome": lc.get("outcome")}))
    for pat, suffix in (("_before_vs_integrated_1x_24fps.gif", "_gameplay_before_vs_integrated_24fps.gif"), ("_integrated_4x_slowmo_15fps.gif", "_integrated_4x_slowmo.gif"), ("_strip.png", "_strip.png")):
        src = os.path.join(EV, case + pat)
        if os.path.exists(src): shutil.copy(src, os.path.join(PKG, "gameplay", f"{fam}__{case}{suffix}"))
json.dump(rows, open(os.path.join(PKG, "gameplay", "index.json"), "w"), indent=1)
for r in rows: print(r)
