# SOUTH V6 rotation test candidates: the mirrored cleaned sprite rotated as ONE rigid image (nearest-neighbour, expand) about the
# jersey/shorts-seam hip pivot, landmarks carried through the identical transform (marker image), anchors re-derived per rotation with the
# same canonical root offset, one candidate manifest with all keys. Presentation only.
#   python3 south_v6_rot_candidates.py <outdir> <pixel_scale> <off_x> <off_y> <deg,deg,...>
import sys, os, json, math
from PIL import Image
def _pose_landmarks(img):
    """copy of gk_build_manifest._pose_landmarks (importing the builder would regenerate the live assets): jersey/shorts seam = hip"""
    px = img.load(); W, H = img.size; pts = {k: [] for k in ("green", "glove", "skin", "dark")}
    for y in range(H):
        for x in range(W):
            r, g, b, a = px[x, y]
            if a < 128: continue
            if g > 110 and g > r + 40 and g > b + 40: pts["green"].append((x, y))
            elif r > 230 and g > 230 and b > 200: pts["glove"].append((x, y))
            elif r > 140 and g > 80 and b > 50 and r > g + 40: pts["skin"].append((x, y))
            elif max(r, g, b) < 60: pts["dark"].append((x, y))
    dark, green = set(pts["dark"]), set(pts["green"])
    interior = [q for q in pts["dark"] if sum((q[0] + dx, q[1] + dy) in dark for dx in (-2, -1, 0, 1, 2) for dy in (-2, -1, 0, 1, 2)) >= 14]
    seam = [q for q in interior if any((q[0] + dx, q[1] + dy) in green for dx in (-2, -1, 0, 1, 2) for dy in (-2, -1, 0, 1, 2))]
    hip = (sum(q[0] for q in seam) / len(seam), sum(q[1] for q in seam) / len(seam)) if seam else None
    return hip, None, None
OUT, PS = sys.argv[1], float(sys.argv[2]); OFF = (float(sys.argv[3]), float(sys.argv[4])); DEGS = [float(v) for v in sys.argv[5].split(",")]
os.makedirs(OUT, exist_ok=True)
SRC = "review_artifacts/gk_south_v6_calibration/SOUTH_V6_CLEAN_MIRRORED.png"
im = Image.open(SRC).convert("RGBA"); px = im.load(); W, H = im.size
hip, _, _ = _pose_landmarks(im)                       # jersey/shorts seam centroid = hip pivot (the builder's convention)
white = [(x, y) for y in range(H) for x in range(W) if px[x, y][3] >= 128 and px[x, y][0] > 185 and px[x, y][1] > 185 and px[x, y][2] > 170]
A = [p for p in white if p[1] < 113 and p[0] >= 98]; B = [p for p in white if p[1] >= 113 and p[0] >= 104]
def cen(pts): return (sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts))
LM = {"hip": hip, "gloveA": cen(A), "gloveB": cen(B), "head": (104.6, 88.0)}
COL = {"hip": (255, 0, 0, 255), "gloveA": (0, 0, 255, 255), "gloveB": (0, 255, 255, 255), "head": (255, 0, 255, 255)}
def axis_deg(img):
    p = img.load(); pts = [(x, y) for y in range(img.height) for x in range(img.width) if p[x, y][3] > 0]
    n = len(pts); mx = sum(q[0] for q in pts) / n; my = sum(q[1] for q in pts) / n
    sxx = sum((q[0] - mx) ** 2 for q in pts) / n; syy = sum((q[1] - my) ** 2 for q in pts) / n; sxy = sum((q[0] - mx) * (q[1] - my) for q in pts) / n
    return (math.degrees(0.5 * math.atan2(2 * sxy, sxx - syy))) % 180
samples = {}; table = []
for deg in DEGS:
    rot = im.rotate(-deg, resample=Image.NEAREST, expand=True, center=hip)            # negative = clockwise on screen (PIL rotates CCW for +)
    mk = Image.new("RGBA", (W, H), (0, 0, 0, 0)); mp = mk.load()
    for k, (x, y) in LM.items():
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1): mp[int(round(x)) + dx, int(round(y)) + dy] = COL[k]
    mkr = mk.rotate(-deg, resample=Image.NEAREST, expand=True, center=hip)            # identical transform → identical translation
    bb = rot.getbbox(); pad = 4
    out = Image.new("RGBA", (bb[2] - bb[0] + 2 * pad, bb[3] - bb[1] + 2 * pad), (0, 0, 0, 0)); out.paste(rot.crop(bb), (pad, pad))
    mko = Image.new("RGBA", out.size, (0, 0, 0, 0)); mko.paste(mkr.crop(bb), (pad, pad)); q = mko.load()
    lm = {}
    for k, c in COL.items():
        pts = [(x, y) for y in range(mko.height) for x in range(mko.width) if q[x, y] == c]
        lm[k] = (round(sum(p[0] for p in pts) / len(pts) + 0.0, 1), round(sum(p[1] for p in pts) / len(pts), 1)) if pts else None
    lead = list(lm["gloveB"]); other = list(lm["gloveA"])
    root = [round(lead[0] + OFF[0] / PS, 1), round(lead[1] + OFF[1] / PS, 1)]
    vx, vy = lead[0] - root[0], lead[1] - root[1]; n = math.hypot(vx, vy)
    key = f"ROT{int(deg):02d}"
    an = {"root": root, "bbox": list(out.getbbox()), "gloves": [lead + [len(B)], other + [len(A)]], "lead_glove": lead + [len(B), 0], "head": list(lm["head"]),
          "reach_screen_unit": [round(vx / n, 3), round(vy / n, 3)], "canvas": list(out.size), "source": "SOUTH_V6_CLEAN_MIRRORED.png", "rotation_cw_deg": deg,
          "rotation_pivot_in_source": [round(hip[0], 1), round(hip[1], 1)], "pivot_in_canvas": list(lm["hip"]), "root_offset_from_lead_glove_px": [round(root[0] - lead[0], 1), round(root[1] - lead[1], 1)],
          "root_offset_base_px": list(OFF), "pixel_scale": PS, "body_axis_deg": round(axis_deg(out), 1),
          "description": f"SOUTH V6 mirrored, whole-sprite nearest-neighbour rotation {deg:g} deg clockwise about the hip pivot, body scale {PS}, root re-derived from the rotated lead glove with the same canonical offset {OFF}"}
    out.save(f"{OUT}/{key}.png"); json.dump(an, open(f"{OUT}/{key}_anchors.json", "w"), indent=1)
    samples[key] = {"path": f"{key}.png", "anchors": f"{key}_anchors.json", "mirror": False, "approved": False, "candidate": True, "note": an["description"]}
    table.append((key, deg, out.size, lm, root, an["body_axis_deg"]))
    print(f"{key}: canvas {out.size} pivot→{lm['hip']} lead glove {lead} other {other} head {lm['head']} root {root} body axis {an['body_axis_deg']}° reach unit {an['reach_screen_unit']}")
json.dump({"version": 1, "record": "SOUTH V6 rotation test candidates (review only)", "save_poses": {"CONTEXTUAL": {"ANY": {"samples": samples}}}}, open(f"{OUT}/candidate_manifest.json", "w"), indent=1)
print("hip pivot (source px)", [round(v, 1) for v in hip], "| gloves A", [round(v, 1) for v in LM['gloveA']], "B", [round(v, 1) for v in LM['gloveB']])
# pivot/landmark overlay on the source for the record
from PIL import ImageDraw
z = 6; viz = Image.new("RGB", (W * z, H * z), (238, 238, 240)); up = im.resize((W * z, H * z), Image.NEAREST); viz.paste(up, (0, 0), up); d = ImageDraw.Draw(viz)
for k, (x, y) in LM.items():
    c = COL[k][:3]; d.ellipse([x * z - 7, y * z - 7, x * z + 7, y * z + 7], outline=c, width=3); d.text((x * z + 9, y * z - 6), k, fill=c)
viz.crop((40 * z, 40 * z, 136 * z, 136 * z)).save(f"{OUT}/PIVOT_LANDMARKS.png")
