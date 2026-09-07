# F — CONTINUITY MEASUREMENTS of an authored pre-contact set + the approved contact pose: per frame (live screen px rel. the root)
# head centre/diameter, shoulder centre/width, torso width, pelvis centre, limb thickness, bbox height (apparent scale), body centre;
# the hand-led placement the runtime would apply (bounded ikW × (sim hand − lead glove), cap 12 sprite px) and the drawn-root step it causes.
#   python3 continuity.py <frames_dir> <out.json> [contact anchors json] [contact png]
import sys, os, json, math
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from measure import measure
from PIL import Image
FR, OUT = sys.argv[1], sys.argv[2]; CAN = sys.argv[3] if len(sys.argv) > 3 else None; CPNG = sys.argv[4] if len(sys.argv) > 4 else None
meta = json.load(open(os.path.join(FR, "frames.json")))["frames"]; S_LIVE = 0.4197; CAP = 12 * S_LIVE
IKW = {"F01": 0, "F02": 0, "F03": 0, "F04": 0, "F05": 0.3, "F06": 0.6, "F07": 1, "F08": 1, "F09": 1}
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
    rows.append({"frame": f["name"], "u": f.get("u"), "rig": f["rig"], "place": place, **m, "lead_glove": lg, "sim_hand": sh})
if CAN and CPNG:
    can = json.load(open(CAN)); m = measure(Image.open(CPNG), can)
    # the contact pose's joints from its rig at rest (neck, waist, shoulder), in live screen px rel. the root
    sys.path.insert(0, os.path.join(HERE, "..", "library")); sys.path.insert(0, os.path.join(HERE, "..", "rig"))
    from rig_north_cw50 import build as bn, ROOT as NROOT
    RN, _ = bn(); ps = S_LIVE * (can.get("pixel_scale") or 1.0)
    def J(n): x, y = RN.parts[n].pivot; return (round((x - NROOT[0]) * ps, 1), round((y - NROOT[1]) * ps, 1))
    m["head_c"] = J("head"); m["pelvis_c"] = J("pelvis"); m["shoulder_c"] = J("sleeve")
    rows.append({"frame": "CONTACT (approved)", "u": [1.0, 1.0], "rig": "approved PNG", "place": (0.0, 0.0), **m, "lead_glove": None, "sim_hand": None})
def delta(a, b, k):
    if a.get(k) is None or b.get(k) is None: return None
    if isinstance(a[k], (list, tuple)): return round(math.hypot(a[k][0] - b[k][0], a[k][1] - b[k][1]), 1)
    return round(b[k] - a[k], 2)
steps = []
for a, b in zip(rows, rows[1:]):
    steps.append({"from": a["frame"], "to": b["frame"], "head_c": delta(a, b, "head_c"), "head_diam": delta(a, b, "head_diam"), "shoulder_c": delta(a, b, "shoulder_c"), "shoulder_w": delta(a, b, "shoulder_w"), "torso_w": delta(a, b, "torso_w"),
                  "pelvis_c": delta(a, b, "pelvis_c"), "limb_w": delta(a, b, "limb_w"), "bbox_h": delta(a, b, "bbox_h"), "body_c": delta(a, b, "body_c"), "root_step": round(math.hypot(b["place"][0] - a["place"][0], b["place"][1] - a["place"][1]), 1)})
worst = {k: max((s[k] for s in steps if s[k] is not None), key=abs, default=None) for k in ("head_c", "head_diam", "shoulder_c", "shoulder_w", "torso_w", "pelvis_c", "limb_w", "bbox_h", "body_c", "root_step")}
json.dump({"rows": rows, "steps": steps, "worst": worst}, open(OUT, "w"), indent=1)
print(f"{'frame':22s} {'head_c':>14s} {'hd':>5s} {'shoulder_c':>14s} {'shw':>5s} {'tw':>5s} {'pelvis_c':>14s} {'lw':>4s} {'bbh':>5s} {'body_c':>14s} {'place':>12s}")
for r in rows: print(f"{r['frame'][:22]:22s} {str(r['head_c']):>14s} {r['head_diam'] or 0:5.1f} {str(r['shoulder_c']):>14s} {r['shoulder_w'] or 0:5.1f} {r['torso_w'] or 0:5.1f} {str(r['pelvis_c']):>14s} {r['limb_w'] or 0:4.1f} {r['bbox_h']:5.1f} {str(r['body_c']):>14s} {str(r['place']):>12s}")
print("\nframe-to-frame steps (px / px of diameter / px of width):")
for s in steps: print(f"  {s['from'][:16]:16s} → {s['to'][:16]:16s}  head {s['head_c']}  Ø{s['head_diam']}  shoulder {s['shoulder_c']} w{s['shoulder_w']}  torso w{s['torso_w']}  pelvis {s['pelvis_c']}  limb {s['limb_w']}  bbox_h {s['bbox_h']}  body {s['body_c']}  ROOT STEP {s['root_step']}")
print("\nWORST:", worst)
