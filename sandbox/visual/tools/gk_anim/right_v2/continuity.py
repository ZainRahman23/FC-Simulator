# F — CONTINUITY MEASUREMENTS of an authored pre-contact set + the approved contact pose: per frame (live screen px rel. the root)
# head centre/diameter, shoulder centre/width, torso width, pelvis centre, limb thickness, bbox height (apparent scale), body centre;
# the hand-led placement the runtime would apply (bounded ikW × (sim hand − lead glove), cap 12 sprite px) and the drawn-root step it causes.
#   python3 continuity.py <frames_dir> <out.json> [contact anchors json] [contact png] [contact rig module, default rig_north_cw50] [ikw json]
# adds feet (rig landmarks foot_L/foot_R, contact = the rig's shin distal points) and torso length (neck→waist, apparent body scale).
import sys, os, json, math
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from measure import measure
from PIL import Image
FR, OUT = sys.argv[1], sys.argv[2]; CAN = sys.argv[3] if len(sys.argv) > 3 else None; CPNG = sys.argv[4] if len(sys.argv) > 4 else None
CRIG = sys.argv[5] if len(sys.argv) > 5 else "rig_north_cw50"; IKWJ = json.load(open(sys.argv[6])) if len(sys.argv) > 6 and sys.argv[6] else None
meta = json.load(open(os.path.join(FR, "frames.json")))["frames"]; S_LIVE = 0.4197; CAP = 12 * S_LIVE
IKW = IKWJ or {"F01": 0, "F02": 0, "F03": 0, "F04": 0, "F05": 0.3, "F06": 0.6, "F07": 1, "F07b": 1, "F08": 1, "F09": 1}
rows = []
for f in meta:
    key = f["name"].split("_")[0]
    if key == "F00": continue
    an = {"root": f["root"], "pixel_scale": f.get("pixel_scale", 1.0)}
    m = measure(Image.open(os.path.join(FR, f["name"] + ".png")), an)
    lg = f["screen"]["lead_glove"]; sh = f.get("sim_hand"); ikw = IKW.get(key, 1)
    if sh:
        ex, ey = (sh[0] - lg[0]) * ikw, (sh[1] - lg[1]) * ikw; n = math.hypot(ex, ey)
        if n > CAP: ex, ey = ex / n * CAP, ey / n * CAP
        place = (round(ex, 1), round(ey, 1))
    else: place = (0.0, 0.0)
    # positions from the rig joints (exact); sizes from the image
    m["head_c"] = tuple(f["screen"]["head"]); m["pelvis_c"] = tuple(f["screen"]["pelvis"]); m["shoulder_c"] = tuple(f["screen"]["shoulder"])
    m["foot_L"] = tuple(f["screen"]["foot_L"]) if f["screen"].get("foot_L") else None; m["foot_R"] = tuple(f["screen"]["foot_R"]) if f["screen"].get("foot_R") else None
    m["torso_len"] = round(math.hypot(m["head_c"][0] - m["pelvis_c"][0], m["head_c"][1] - m["pelvis_c"][1]), 2)
    for k in ("head_c", "pelvis_c", "shoulder_c", "foot_L", "foot_R", "body_c"):
        if m.get(k) is not None: m["drawn_" + k] = (round(m[k][0] + place[0], 1), round(m[k][1] + place[1], 1))
    rows.append({"frame": f["name"], "u": f.get("u"), "rig": f["rig"], "place": place, **m, "lead_glove": lg, "sim_hand": sh})
if CAN and CPNG:
    can = json.load(open(CAN)); m = measure(Image.open(CPNG), can)
    # the contact pose's joints from its rig at rest (neck, waist, shoulder), in live screen px rel. the root
    sys.path.insert(0, os.path.join(HERE, "..", "library")); sys.path.insert(0, os.path.join(HERE, "..", "rig"))
    import importlib; CR = importlib.import_module(CRIG); RN, _ = CR.build(); NROOT = CR.ROOT; ps = S_LIVE * (can.get("pixel_scale") or 1.0)
    def J(n): x, y = RN.parts[n].pivot; return (round((x - NROOT[0]) * ps, 1), round((y - NROOT[1]) * ps, 1))
    def D(n): x, y = RN.parts[n].bone["to"]; return (round((x - NROOT[0]) * ps, 1), round((y - NROOT[1]) * ps, 1))
    names = {n for n in RN.order}
    m["head_c"] = J("head"); m["pelvis_c"] = J("pelvis"); m["shoulder_c"] = J("sleeve" if "sleeve" in names else "arm_lead")
    m["foot_L"] = D("shin_R" if "shin_R" in names else "shin_B"); m["foot_R"] = D("shin_L" if "shin_L" in names else "shin_A")   # physical labels (foot_L = keeper's left = trailing screen-right shin), as the authors' LM
    m["torso_len"] = round(math.hypot(m["head_c"][0] - m["pelvis_c"][0], m["head_c"][1] - m["pelvis_c"][1]), 2)
    CPL = tuple(json.load(open(sys.argv[7]))) if len(sys.argv) > 7 else (0.0, 0.0)          # the live contact placement (dx,dy live px) if known
    for k in ("head_c", "pelvis_c", "shoulder_c", "foot_L", "foot_R", "body_c"):
        if m.get(k) is not None: m["drawn_" + k] = (round(m[k][0] + CPL[0], 1), round(m[k][1] + CPL[1], 1))
    rows.append({"frame": "CONTACT (approved)", "u": [1.0, 1.0], "rig": "approved PNG", "place": CPL, **m, "lead_glove": None, "sim_hand": None})
def delta(a, b, k):
    if a.get(k) is None or b.get(k) is None: return None
    if isinstance(a[k], (list, tuple)): return round(math.hypot(a[k][0] - b[k][0], a[k][1] - b[k][1]), 1)
    return round(b[k] - a[k], 2)
steps = []
for a, b in zip(rows, rows[1:]):
    steps.append({"from": a["frame"], "to": b["frame"], "head_c": delta(a, b, "head_c"), "head_diam": delta(a, b, "head_diam"), "shoulder_c": delta(a, b, "shoulder_c"), "shoulder_w": delta(a, b, "shoulder_w"), "torso_w": delta(a, b, "torso_w"),
                  "pelvis_c": delta(a, b, "pelvis_c"), "limb_w": delta(a, b, "limb_w"), "bbox_h": delta(a, b, "bbox_h"), "body_c": delta(a, b, "body_c"), "root_step": round(math.hypot(b["place"][0] - a["place"][0], b["place"][1] - a["place"][1]), 1),
                  "foot_L": delta(a, b, "foot_L"), "foot_R": delta(a, b, "foot_R"), "torso_len": delta(a, b, "torso_len"),
                  "drawn_head": delta(a, b, "drawn_head_c"), "drawn_shoulder": delta(a, b, "drawn_shoulder_c"), "drawn_pelvis": delta(a, b, "drawn_pelvis_c"), "drawn_foot_L": delta(a, b, "drawn_foot_L"), "drawn_foot_R": delta(a, b, "drawn_foot_R"), "drawn_body": delta(a, b, "drawn_body_c")})
worst = {k: max((s[k] for s in steps if s[k] is not None), key=abs, default=None) for k in ("head_c", "head_diam", "shoulder_c", "shoulder_w", "torso_w", "pelvis_c", "limb_w", "bbox_h", "body_c", "root_step", "foot_L", "foot_R", "torso_len", "drawn_head", "drawn_shoulder", "drawn_pelvis", "drawn_foot_L", "drawn_foot_R", "drawn_body")}
json.dump({"rows": rows, "steps": steps, "worst": worst}, open(OUT, "w"), indent=1)
print(f"{'frame':22s} {'head_c':>14s} {'hd':>5s} {'shoulder_c':>14s} {'shw':>5s} {'tw':>5s} {'pelvis_c':>14s} {'lw':>4s} {'bbh':>5s} {'body_c':>14s} {'place':>12s}")
for r in rows: print(f"{r['frame'][:22]:22s} feet {str(r.get('foot_L')):>13s}/{str(r.get('foot_R')):>13s} {str(r['head_c']):>14s} {r['head_diam'] or 0:5.1f} {str(r['shoulder_c']):>14s} {r['shoulder_w'] or 0:5.1f} {r['torso_w'] or 0:5.1f} {str(r['pelvis_c']):>14s} {r['limb_w'] or 0:4.1f} {r['bbox_h']:5.1f} {str(r['body_c']):>14s} {str(r['place']):>12s}")
print("\nframe-to-frame steps (px / px of diameter / px of width):")
for s in steps: print(f"  {s['from'][:16]:16s} → {s['to'][:16]:16s}  head {s['head_c']}  Ø{s['head_diam']}  shoulder {s['shoulder_c']} w{s['shoulder_w']}  torso w{s['torso_w']} len{s['torso_len']}  pelvis {s['pelvis_c']}  feet {s['foot_L']}/{s['foot_R']}  limb {s['limb_w']}  bbox_h {s['bbox_h']}  body {s['body_c']}  ROOT STEP {s['root_step']}")
print("\nDRAWN steps (authored + the runtime's hand-led placement = what is on screen):")
for st in steps: print(f"  {st['from'][:16]:16s} → {st['to'][:16]:16s}  head {st['drawn_head']}  shoulder {st['drawn_shoulder']}  pelvis {st['drawn_pelvis']}  feet {st['drawn_foot_L']}/{st['drawn_foot_R']}  body {st['drawn_body']}")
print("\nWORST:", worst)
