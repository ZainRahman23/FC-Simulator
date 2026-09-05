#!/usr/bin/env python3
"""Anchor measurement for an 8-rotation POSE state (dive/collapse stills) — gloves may be anywhere (raised, along the
ground), the body may be horizontal. Same output schema as gk_measure_sprites.py plus 'gloves' (all white blobs ≥ 4 px,
[x, y, px]) and 'lead_glove' (the glove farthest from the body centre = the reaching hand), 'body_centre'.
   python3 gk_measure_pose.py <dir_with_direction_pngs> <out.json> [--sheet out.png]"""
import sys, json, os
from PIL import Image, ImageDraw
import numpy as np
D = sys.argv[1]; OUT = sys.argv[2]; SHEET = sys.argv[sys.argv.index("--sheet") + 1] if "--sheet" in sys.argv else None
DIRS = ["south", "south-east", "east", "north-east", "north", "north-west", "west", "south-west"]
def classify(rgb):
    r, g, b = rgb
    if r > 200 and g > 200 and b > 200: return "white"
    if r < 60 and g < 60 and b < 60: return "black"
    if g > 150 and r < 200 and b < 130 and g > r + 30: return "green"
    if r > 120 and r > g + 15 and g > b and b < 200 and r < 250: return "skin"
    return "other"
def blobs(mask):
    H, W = mask.shape; seen = np.zeros_like(mask, dtype=bool); out = []
    for y0 in range(H):
        for x0 in range(W):
            if not mask[y0, x0] or seen[y0, x0]: continue
            stack = [(y0, x0)]; seen[y0, x0] = True; ys = []; xs = []
            while stack:
                y, x = stack.pop(); ys.append(y); xs.append(x)
                for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                    if 0 <= ny < H and 0 <= nx < W and mask[ny, nx] and not seen[ny, nx]: seen[ny, nx] = True; stack.append((ny, nx))
            out.append((len(ys), float(np.mean(ys)), float(np.mean(xs)), max(ys)))
    out.sort(key=lambda b: -b[0]); return out
res = {}
for d in DIRS:
    p = os.path.join(D, d + ".png")
    if not os.path.exists(p): continue
    im = Image.open(p).convert("RGBA"); a = np.array(im); H, W = a.shape[:2]
    alpha = a[:, :, 3] > 8; ys, xs = np.where(alpha)
    top, bot, left, right = int(ys.min()), int(ys.max()), int(xs.min()), int(xs.max())
    cls = np.full((H, W), "", dtype=object)
    for y in range(top, bot + 1):
        for x in range(left, right + 1):
            if alpha[y, x]: cls[y, x] = classify(tuple(int(v) for v in a[y, x, :3]))
    white = blobs(cls == "white"); skin = blobs(cls == "skin"); black = blobs(cls == "black")
    cx, cy = (left + right) / 2.0, (top + bot) / 2.0
    gl = [[b[2], b[1], b[0]] for b in white if b[0] >= 4][:4]
    lead = max(gl, key=lambda g: (g[0] - cx) ** 2 + (g[1] - cy) ** 2) if gl else None
    head = [skin[0][2], skin[0][1]] if skin and skin[0][0] >= 6 else None
    L = [g for g in gl if g[0] < cx]; R = [g for g in gl if g[0] >= cx]
    hands = {"screenLeft": L[0][:2] if L else None, "screenRight": R[0][:2] if R else None}
    feet_px = [[b[2], float(b[3]), b[0]] for b in black if b[0] >= 4 and b[3] >= bot - 3]
    feet = {"screenLeft": next(([f[0], f[1]] for f in feet_px if f[0] < cx), None), "screenRight": next(([f[0], f[1]] for f in feet_px if f[0] >= cx), None)}
    hb = bot - top + 1
    res[d] = {"canvas": [W, H], "bbox": [left, top, right, bot], "height_px": hb, "width_px": right - left + 1, "content_cx": cx, "content_cy": cy, "body_centre": [cx, cy], "foot_row": bot, "bottom_from_canvas_centre": bot - H / 2, "top_row": top,
              "head": head, "hands": hands, "gloves": gl, "lead_glove": lead, "feet": feet,
              "pelvis_row_est": cy, "shoulder_row_est": top + 0.35 * hb, "neck_row_est": top + 0.25 * hb, "counts": {"white": int(len(white)), "black": int(len(black)), "skin": int(len(skin))}}
json.dump(res, open(OUT, "w"), indent=1); print("wrote", OUT)
for d, r in res.items(): print("%-11s bbox %s centre (%.0f,%.0f) head %s lead_glove %s gloves %d" % (d, r["bbox"], r["content_cx"], r["content_cy"], [round(v) for v in r["head"]] if r["head"] else None, [round(v) for v in r["lead_glove"][:2]] if r["lead_glove"] else None, len(r["gloves"])))
if SHEET:
    S = 3; cw = res[DIRS[0]]["canvas"][0] * S; ch = res[DIRS[0]]["canvas"][1] * S; sheet = Image.new("RGBA", (cw * 4, ch * 2), (30, 33, 38, 255)); dr = ImageDraw.Draw(sheet)
    for i, d in enumerate(DIRS):
        if d not in res: continue
        im = Image.open(os.path.join(D, d + ".png")).convert("RGBA"); im = im.resize((im.width * S, im.height * S), Image.NEAREST)
        ox, oy = (i % 4) * cw, (i // 4) * ch; sheet.alpha_composite(im, (ox, oy)); r = res[d]
        def mark(pt, col, rad=4):
            if pt: dr.ellipse([ox + pt[0] * S - rad, oy + pt[1] * S - rad, ox + pt[0] * S + rad, oy + pt[1] * S + rad], outline=col, width=2)
        mark(r["head"], "#ffd24a"); [mark(g, "#7fd0ff") for g in r["gloves"]]; mark(r["lead_glove"], "#38ff9a", 7); mark(r["body_centre"], "#c080ff", 5)
        if r["lead_glove"]: dr.line([ox + r["body_centre"][0] * S, oy + r["body_centre"][1] * S, ox + r["lead_glove"][0] * S, oy + r["lead_glove"][1] * S], fill="#ff4fd8", width=2)
        dr.line([ox, oy + r["foot_row"] * S, ox + cw, oy + r["foot_row"] * S], fill="#ff6060", width=1); dr.text((ox + 4, oy + 4), d, fill="#ffffff")
    sheet.save(SHEET); print("sheet", SHEET)
