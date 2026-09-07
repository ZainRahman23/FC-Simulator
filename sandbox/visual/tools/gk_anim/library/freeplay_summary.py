# Summarise the final ON vs OFF free-play captures for section G: diagnostic-shot identity, per-recorded-shot simulation identity,
# contact ticks, outcomes and contact-tick crop identity (from the gameplay evidence checks).
#   python3 freeplay_summary.py <off_dir> <on_dir> <evidence_dir> <out.json>
import sys, os, json, math
OFF, ON, EV, OUT = sys.argv[1:5]
a = json.load(open(os.path.join(OFF, "freeplay.json"))); b = json.load(open(os.path.join(ON, "freeplay.json")))
da = [s["i"] for s in a["shots"] if s.get("diagTicks")]; db = [s["i"] for s in b["shots"] if s.get("diagTicks")]
rec = [s["i"] for s in b["shots"] if s.get("recorded")]
maxdev = 0.0; with_contact = 0; crop_ok = 0; per = []
checks = {c["case"]: c for c in json.load(open(os.path.join(EV, "checks.json")))} if os.path.exists(os.path.join(EV, "checks.json")) else {}
for i in rec:
    case = f"shot{i:03d}"; ta = os.path.join(OFF, f"{case}_trace.json"); tb = os.path.join(ON, f"{case}_trace.json")
    if not (os.path.exists(ta) and os.path.exists(tb)): continue
    A = json.load(open(ta))["trace"]; B = json.load(open(tb))["trace"]; n = min(len(A), len(B))
    dev = max((math.hypot(x["root"][0] - y["root"][0], x["root"][1] - y["root"][1]) for x, y in zip(A[:n], B[:n]) if x.get("root") and y.get("root")), default=0.0)
    maxdev = max(maxdev, dev)
    c = checks.get(case, {}); ct = c.get("contact")
    if ct: with_contact += 1; crop_ok += 1 if c.get("contact_tick_crop_identical") else 0
    per.append({"shot": i, "root_dev_m": round(dev, 6), "contact": ct, "crop_identical": c.get("contact_tick_crop_identical"), "max_step_px": c.get("drawn_root_max_jump_px"), "frames": len(c.get("frame_order", []))})
summary = {"n": len(a["shots"]), "on": f"{b['n'] if 'n' in b else len(b['shots'])} shots, {len(db)} with diagnostic ticks {db}", "off": f"{len(a['shots'])} shots, {len(da)} with diagnostic ticks {da}",
           "diag_same": da == db, "recorded": len(per), "max_root_dev": maxdev, "with_contact": with_contact, "crop_identical": crop_ok, "per_shot": per}
json.dump(summary, open(OUT, "w"), indent=1); print(json.dumps({k: v for k, v in summary.items() if k != "per_shot"}, indent=1))
