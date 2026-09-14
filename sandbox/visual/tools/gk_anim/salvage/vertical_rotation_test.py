#!/usr/bin/env python3
"""ROTATION-ONLY TEST of the recovered vertical high-save sprite: rigid nearest-neighbour whole-sprite rotations (clockwise) about the
builder's hip/torso pivot (the jersey/shorts seam, as for DIVE_NORTH), scale fixed at 1.00, no redraw / warp / IK / mirror / palette / cleanup.
For every angle the anchors are re-measured on the rotated sprite (builder rules) and the body landmarks (raised glove, other glove, head,
torso centre, hip, feet) are tracked through the rotation with a marker layer; both anchoring interpretations are derived:
  G = glove-root (root = raised glove + the calibrated canonical offset, the glove meets the simulation hand)
  F = feet-root  (root under the feet: feet centroid x, lowest content row)
and a review-only save-pose manifest is written for each, swapping only the overhead role's art.
  python3 vertical_rotation_test.py <native.png> <out_dir> <angles csv> <glove_root_dx_canon> <glove_root_dy_canon>
"""
import sys, os, json, math
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from derive_vertical_candidate import derive, pose_landmarks
SRC, OUT, ANG = sys.argv[1], sys.argv[2], [int(v) for v in sys.argv[3].split(",")]; GDX, GDY = float(sys.argv[4]), float(sys.argv[5])
os.makedirs(OUT, exist_ok=True)
raw = Image.open(SRC).convert("RGBA")
hip, gloves, head, pts = pose_landmarks(raw)
bottom = [(raw.getbbox()[0] + raw.getbbox()[2] - 1) / 2.0, raw.getbbox()[3] - 1]
lead = max(gloves, key=lambda g: (g[0] - bottom[0]) ** 2 + (g[1] - bottom[1]) ** 2); other = [g for g in gloves if g is not lead][0]
green = pts["green"]; dark = pts["dark"]
sh_y = min(q[1] for q in green if q[1] > head[1]); trunk = [q for q in green if sh_y + 4 <= q[1] <= hip[1]]      # jersey below the shoulder line, above the seam
torso_c = (sum(q[0] for q in trunk) / len(trunk), sum(q[1] for q in trunk) / len(trunk))
low = max(q[1] for q in dark); feet_pts = [q for q in dark if q[1] >= low - 6]; feet = (sum(q[0] for q in feet_pts) / len(feet_pts), sum(q[1] for q in feet_pts) / len(feet_pts))
LM = {"hip": hip, "head": tuple(head), "torso": torso_c, "feet": feet, "glove_lead": tuple(lead[:2]), "glove_other": tuple(other[:2])}
COL = {"hip": (255, 0, 0, 255), "head": (255, 0, 255, 255), "torso": (0, 255, 255, 255), "feet": (0, 0, 255, 255), "glove_lead": (255, 255, 0, 255), "glove_other": (0, 255, 0, 255)}
print("pivot (seam hip)", tuple(round(v, 1) for v in hip), "| landmarks", {k: tuple(round(x, 1) for x in v) for k, v in LM.items()})


def lean(a, b):
    """lean of the axis a→b (b above a) from the screen vertical, degrees, + = clockwise (the top toward screen-right)"""
    dx, dy = b[0] - a[0], b[1] - a[1]; return math.degrees(math.atan2(dx, -dy))


rec = {"source": os.path.abspath(SRC), "pivot_seam_hip": [round(v, 2) for v in hip], "glove_root_offset_canonical": [GDX, GDY], "scale": 1.0, "angles": ANG, "variants": {}}
for cw in ANG:
    rot = raw.rotate(-cw, resample=Image.NEAREST, expand=True, center=hip)            # negative = clockwise, pixel-preserving
    mk = Image.new("RGBA", raw.size, (0, 0, 0, 0)); mp = mk.load()
    for k, (x, y) in LM.items():
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                X, Y = int(round(x)) + dx, int(round(y)) + dy
                if 0 <= X < raw.width and 0 <= Y < raw.height: mp[X, Y] = COL[k]
    mkr = mk.rotate(-cw, resample=Image.NEAREST, expand=True, center=hip)
    bb = rot.getbbox(); pad = 4                                                         # derive() crops the same way
    mko = Image.new("RGBA", (bb[2] - bb[0] + 2 * pad, bb[3] - bb[1] + 2 * pad), (0, 0, 0, 0)); mko.paste(mkr.crop(bb), (pad, pad)); q = mko.load()
    lm = {}
    for k, c in COL.items():
        p = [(x, y) for y in range(mko.height) for x in range(mko.width) if q[x, y] == c]
        lm[k] = (round(sum(t[0] for t in p) / len(p), 2), round(sum(t[1] for t in p) / len(p), 2)) if p else None
    rot.filename = "VERTICAL_HIGH_RAW rotated %d deg CW" % cw
    anG = derive(rot, OUT, f"VH_R{cw:02d}_G", 1.0, GDX, GDY, live_reach=True, root_feet=False)
    anF = derive(rot, OUT, f"VH_R{cw:02d}_F", 1.0, 0, 0, live_reach=True, root_feet=True)
    for an in (anG, anF): an["rotation_cw_deg"] = cw; an["rotation_pivot_in_source"] = [round(v, 1) for v in hip]; an["landmarks_canvas_px"] = lm
    for stem, an in ((f"VH_R{cw:02d}_G", anG), (f"VH_R{cw:02d}_F", anF)): json.dump(an, open(os.path.join(OUT, stem + "_anchors.json"), "w"), indent=1)
    axes = {"torso_hip_head_lean_deg": round(lean(lm["hip"], lm["head"]), 1), "full_feet_head_lean_deg": round(lean(lm["feet"], lm["head"]), 1), "reach_feet_glove_lean_deg": round(lean(lm["feet"], lm["glove_lead"]), 1)}
    rec["variants"][cw] = {"canvas": anG["canvas"], "landmarks_canvas_px": lm, "measured_lead_glove": anG["lead_glove"][:2], "measured_head": anG["head"], "root_G": anG["root"], "root_F": anF["root"], "axes": axes,
                           "check_lead_vs_tracked_px": round(math.hypot(anG["lead_glove"][0] - lm["glove_lead"][0], anG["lead_glove"][1] - lm["glove_lead"][1]), 2)}
    print(f"cw {cw:2d}: canvas {anG['canvas']} lead {anG['lead_glove'][:2]} (tracked {lm['glove_lead']}) head {anG['head']} hip {lm['hip']} torso {lm['torso']} feet {lm['feet']} | root G {anG['root']} F {anF['root']} | lean torso {axes['torso_hip_head_lean_deg']} full {axes['full_feet_head_lean_deg']} reach {axes['reach_feet_glove_lean_deg']}")
json.dump(rec, open(os.path.join(OUT, "rotation_test.json"), "w"), indent=1)
