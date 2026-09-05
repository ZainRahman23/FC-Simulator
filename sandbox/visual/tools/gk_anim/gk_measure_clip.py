#!/usr/bin/env python3
"""Per-frame anchor measurement for an authored GK clip direction (PixelLab frame sequence 0..N-1.png).
   python3 gk_measure_clip.py <clip_dir_with_frames> <out.json> [--ref <reference_frame_index=0>] [--sheet out.png]

Every frame is measured independently (no per-sprite hardcoding):
  bbox, content_cx (bbox centre x), bottom_row (lowest opaque row), ref_foot_row (frame 0's bottom row = the artist's ground
  plane for the whole clip), head (largest skin blob centroid), gloves (white blobs, largest two, plus 'lead' = farthest from
  the bbox centre = the reaching glove), feet (black blobs whose bottom is within 3 px of the frame-0 ground row = planted feet), and the
  baked root displacement dx/dy of the bbox centre relative to frame 0 (the runtime REMOVES it: the simulation owns the root).
Colour classes are the GK_BASE_V1 kit: white gloves, black shorts/socks/boots, neon-green jersey, skin."""
import sys, json, os, glob
from PIL import Image, ImageDraw
import numpy as np
D = sys.argv[1]; OUT = sys.argv[2]
REF = int(sys.argv[sys.argv.index("--ref") + 1]) if "--ref" in sys.argv else 0
SHEET = sys.argv[sys.argv.index("--sheet") + 1] if "--sheet" in sys.argv else None
def classify(rgb):
    r, g, b = rgb
    if r > 200 and g > 200 and b > 200: return "white"
    if r < 60 and g < 60 and b < 60: return "black"
    if g > 150 and r < 200 and b < 130 and g > r + 30: return "green"
    if r > 120 and r > g + 15 and g > b and b < 200 and r < 250: return "skin"
    return "other"
def blobs(mask):
    """4-connected components of a boolean mask → list of (count, cy, cx, ys, xs) sorted by size desc."""
    H, W = mask.shape; seen = np.zeros_like(mask, dtype=bool); out = []
    for y0 in range(H):
        for x0 in range(W):
            if not mask[y0, x0] or seen[y0, x0]: continue
            stack = [(y0, x0)]; seen[y0, x0] = True; ys = []; xs = []
            while stack:
                y, x = stack.pop(); ys.append(y); xs.append(x)
                for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                    if 0 <= ny < H and 0 <= nx < W and mask[ny, nx] and not seen[ny, nx]: seen[ny, nx] = True; stack.append((ny, nx))
            out.append((len(ys), float(np.mean(ys)), float(np.mean(xs)), ys, xs))
    out.sort(key=lambda b: -b[0]); return out
files = sorted(glob.glob(os.path.join(D, "*.png")), key=lambda p: int(os.path.splitext(os.path.basename(p))[0]))
frames = []
for p in files:
    im = Image.open(p).convert("RGBA"); a = np.array(im); H, W = a.shape[:2]
    alpha = a[:, :, 3] > 8; ys, xs = np.where(alpha)
    if not len(ys): frames.append(None); continue
    top, bot, left, right = int(ys.min()), int(ys.max()), int(xs.min()), int(xs.max())
    cls = np.full((H, W), "", dtype=object)
    for y in range(top, bot + 1):
        for x in range(left, right + 1):
            if alpha[y, x]: cls[y, x] = classify(tuple(int(v) for v in a[y, x, :3]))
    white = blobs(cls == "white"); skin = blobs(cls == "skin"); black = blobs(cls == "black")
    cx = (left + right) / 2.0; cy = (top + bot) / 2.0
    gl = [[b[2], b[1], b[0]] for b in white if b[0] >= 4][:3]                       # [x, y, px]
    lead = max(gl, key=lambda g: (g[0] - cx) ** 2 + (g[1] - cy) ** 2) if gl else None
    head = [skin[0][2], skin[0][1]] if skin and skin[0][0] >= 6 else None
    frames.append({"file": os.path.basename(p), "canvas": [W, H], "bbox": [left, top, right, bot], "content_cx": cx, "content_cy": cy,
                   "bottom_row": bot, "top_row": top, "height_px": bot - top + 1, "width_px": right - left + 1,
                   "head": head, "gloves": gl, "lead_glove": lead, "_black": black, "_cls": cls})
ref = frames[REF]; hbody = ref["height_px"]; ground = ref["bottom_row"]
for f in frames:
    if not f: continue
    feet = [[b[2], float(max(b[3])), b[0]] for b in f["_black"] if b[0] >= 4 and max(b[3]) >= ground - 3]        # planted feet only (bottom within 3 px of the ground plane)
    f["feet"] = sorted(feet, key=lambda q: q[0])[:2]
    f["ref_foot_row"] = ground; f["baked_dx"] = f["content_cx"] - ref["content_cx"]; f["baked_dy"] = f["bottom_row"] - ground
    f["pelvis_row_est"] = f["top_row"] + 0.52 * f["height_px"]; f["shoulder_row_est"] = f["top_row"] + 0.27 * f["height_px"]
    f["airborne_px"] = max(0, ground - f["bottom_row"])                              # air under the lowest pixel vs the ground plane
    del f["_black"]; del f["_cls"]
json.dump({"ref_frame": REF, "ground_row": ground, "ref_content_cx": ref["content_cx"], "frames": frames}, open(OUT, "w"), indent=1)
for i, f in enumerate(frames):
    if f: print("%2d bbox %-18s cx %6.1f bottom %3d (air %2d, dx %+5.1f) head %s lead_glove %s gloves %d feet %d" % (i, f["bbox"], f["content_cx"], f["bottom_row"], f["airborne_px"], f["baked_dx"], [round(v) for v in f["head"]] if f["head"] else None, [round(v) for v in f["lead_glove"][:2]] if f["lead_glove"] else None, len(f["gloves"]), len(f["feet"])))
if SHEET:
    S = 3; n = len(frames); w = frames[0]["canvas"][0]; h = frames[0]["canvas"][1]
    sheet = Image.new("RGBA", (n * (w * S + 2), h * S), (30, 33, 38, 255)); dr = ImageDraw.Draw(sheet)
    for i, (p, f) in enumerate(zip(files, frames)):
        if not f: continue
        im = Image.open(p).convert("RGBA").resize((w * S, h * S), Image.NEAREST); ox = i * (w * S + 2); sheet.alpha_composite(im, (ox, 0))
        def mark(pt, col, r=4):
            if pt: dr.ellipse([ox + pt[0] * S - r, pt[1] * S - r, ox + pt[0] * S + r, pt[1] * S + r], outline=col, width=2)
        mark(f["head"], "#ffd24a"); [mark(g, "#7fd0ff") for g in f["gloves"]]; mark(f["lead_glove"], "#38ff9a", 6); [mark(ft, "#ff6060") for ft in f["feet"]]
        dr.line([ox, ground * S, ox + w * S, ground * S], fill="#ff6060", width=1); dr.line([ox + f["content_cx"] * S, 0, ox + f["content_cx"] * S, h * S], fill="#c080ff", width=1)
        dr.text((ox + 4, 4), str(i), fill="#ffffff")
    sheet.save(SHEET); print("sheet", SHEET)
