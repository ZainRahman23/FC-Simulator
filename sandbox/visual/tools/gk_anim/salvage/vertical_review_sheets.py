#!/usr/bin/env python3
"""Static review sheets for the new vertical high-save contact sprite (no gameplay needed):
  A  OLD (OVERHEAD_REACH_CW11, live) vs NEW candidate, both at live scale next to the SET keeper, and at 4x
  B  scale / anchor calibration: anatomy table vs GK_BASE_V1 and the calibrated Pro arts, the candidate at a scale bracket beside SET/west,
     the extraction statistics, and the authored anchors drawn on the sprite
  python3 vertical_review_sheets.py <candidate_dir> <stem> <anatomy.json> <extraction.json> <out_dir>
"""
import sys, os, json, math
from PIL import Image, ImageDraw, ImageFont
CAND, STEM, ANAT, EXTR, OUT = sys.argv[1:6]; os.makedirs(OUT, exist_ok=True)
HERE = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.abspath(os.path.join(HERE, "..", "..", "..", "..", ".."))
ASSETS = os.path.join(REPO, "assets", "visual_v1"); S_LIVE = 0.4197
try: F = ImageFont.truetype("/System/Library/Fonts/Menlo.ttc", 12); FB = ImageFont.truetype("/System/Library/Fonts/Menlo.ttc", 15)
except Exception: F = ImageFont.load_default(); FB = F
cand = Image.open(os.path.join(CAND, STEM + ".png")).convert("RGBA"); can = json.load(open(os.path.join(CAND, STEM + "_anchors.json")))
old = Image.open(os.path.join(ASSETS, "goalkeeper/contextual/OVERHEAD_REACH_CW11.png")).convert("RGBA"); oan = json.load(open(os.path.join(ASSETS, "goalkeeper/contextual/OVERHEAD_REACH_CW11_anchors.json")))
setw = Image.open(os.path.join(ASSETS, "originals/character_f4838361/set/west.png")).convert("RGBA"); san = json.load(open(os.path.join(ASSETS, "goalkeeper/anchors/set.json")))["west"]
anat = json.load(open(ANAT)); extr = json.load(open(EXTR))


def at_live(im, ps, zoom):
    return im.resize((max(1, round(im.width * ps * zoom)), max(1, round(im.height * ps * zoom))), Image.NEAREST)


def place(sheet, im, root, ps, zoom, rx, ry):
    live = at_live(im, ps, zoom); sheet.paste(live, (int(rx - root[0] * ps * zoom), int(ry - root[1] * ps * zoom)), live); return live


def cross(d, p, col, k=5):
    d.line([(p[0] - k, p[1]), (p[0] + k, p[1])], fill=col, width=2); d.line([(p[0], p[1] - k), (p[0], p[1] + k)], fill=col, width=2)


# ── A: old vs new at live scale (1x and 4x) with the SET keeper for size
for Z, name in ((1, "A_old_vs_new_1x.png"), (4, "A_old_vs_new_4x.png")):
    W = 200 * Z; H = 130 * Z; sheet = Image.new("RGB", (W * 3 + 20, H + 40), (40, 90, 40)); d = ImageDraw.Draw(sheet)
    cols = [("SET keeper (GK_BASE_V1 set/west, scale 1.0)", setw, (san["content_cx"], san["foot_row"]), 1.0, None),
            ("OLD: OVERHEAD_REACH_CW11 (live, GK_POSE_148 rotated 11° cw, scale 1.0)", old, oan["root"], oan.get("pixel_scale", 1.0), oan),
            ("NEW candidate: user's vertical high-save sprite (native grid, scale %.2f)" % can["pixel_scale"], cand, can["root"], can["pixel_scale"], can)]
    for i, (lab, im, root, ps, an) in enumerate(cols):
        x0 = 6 + i * (W + 4); rx, ry = x0 + W // 2, 30 + int(H * 0.92)
        place(sheet, im, root, ps, Z, rx, ry); d.text((x0, 6), lab[:60], fill=(255, 255, 255), font=F); d.text((x0, 18), lab[60:120], fill=(255, 255, 255), font=F)
        d.line([(x0, ry), (x0 + W, ry)], fill=(255, 80, 80)); cross(d, (rx, ry), (255, 80, 80))
        if an and an.get("lead_glove"):
            g = an["lead_glove"]; cross(d, (rx + (g[0] - root[0]) * ps * Z, ry + (g[1] - root[1]) * ps * Z), (255, 240, 0), 4)
    d.text((6, H + 26), "red line/cross = root (the simulation root on the pitch) · yellow = lead-glove anchor · same live scale for all three (zoom %dx)" % Z, fill=(220, 220, 220), font=F)
    sheet.save(os.path.join(OUT, name))
# ── B: calibration sheet
b, n, no, sw = anat["base"], anat["new"], anat["north"], anat["sw"]
W = 1900; H = 1000; sheet = Image.new("RGB", (W, H), (22, 22, 22)); d = ImageDraw.Draw(sheet)
d.text((10, 8), "B — scale / anchor calibration of the new vertical high-save sprite (anatomy in native sprite px; scale = GK_BASE_V1 measure ÷ new measure)", fill=(255, 255, 255), font=FB)
rows = [("crown → lowest pixel (px)", b["crown_to_low"], n["crown_to_low"], no["crown_to_low"], sw["crown_to_low"]),
        ("face skin blob w×h (px)", "%dx%d" % (b["face_w"], b["face_h"]), "%dx%d" % (n["face_w"], n["face_h"]), "%dx%d" % (no["face_w"], no["face_h"]), "%dx%d" % (sw["face_w"], sw["face_h"])),
        ("face skin area (px)", b["face_n"], n["face_n"], no["face_n"], sw["face_n"]),
        ("head (face+hair) diag (px)", round(b["head_diag"], 1), round(n["head_diag"], 1), round(no["head_diag"], 1), round(sw["head_diag"], 1)),
        ("chest row width, median (px)", b["chest"], n["chest"], no["chest"], sw["chest"]),
        ("lower-leg dark width (px)", b["boot"], n["boot"], no["boot"], sw["boot"])]
y = 40; d.text((10, y), f"{'measure':32s} {'BASE set/west':>14s} {'NEW vertical':>14s} {'NORTH (0.72)':>14s} {'SW (0.74)':>12s}", fill=(255, 230, 120), font=F); y += 16
for r in rows: d.text((10, y), f"{r[0]:32s} {str(r[1]):>14s} {str(r[2]):>14s} {str(r[3]):>14s} {str(r[4]):>12s}", fill=(255, 255, 255), font=F); y += 15
y += 8
ratios = [("body length (crown→lowest; a full-extension leap with pointed toes ≈ standing height)", b["crown_to_low"] / n["crown_to_low"]),
          ("face width", b["face_w"] / n["face_w"]), ("face height", b["face_h"] / n["face_h"]), ("face area (sqrt)", math.sqrt(b["face_n"] / n["face_n"])),
          ("head diagonal", b["head_diag"] / n["head_diag"]), ("lower-leg thickness", b["boot"] / n["boot"])]
d.text((10, y), "scale implied by each measure (NEW):", fill=(255, 230, 120), font=F); y += 15
for lab, v in ratios: d.text((10, y), f"  {lab:80s} {v:5.2f}", fill=(255, 255, 255), font=F); y += 15
d.text((10, y), "  (the same head/face measures over-read the calibrated Pro arts: NORTH head-diag says %.2f for a body-calibrated 0.72, SW %.2f for 0.74 — those generators draw small heads; body length is the trusted measure when the pose is not foreshortened)" % (b["head_diag"] / no["head_diag"], b["head_diag"] / sw["head_diag"]), fill=(180, 180, 180), font=F); y += 15
d.text((10, y), "  the new sprite is a side view of a near-vertical leap: no depth foreshortening of the body length → body length is the primary measure (1.01); the head/face bracket it at 1.08–1.13; chest width is not comparable (profile vs 3/4 view)", fill=(180, 180, 180), font=F); y += 15
d.text((10, y), "  RECOMMENDED pixel_scale 1.00 (bracket 1.00–1.08), rendered below next to the SET keeper for the eye", fill=(255, 200, 120), font=F); y += 22
# scale bracket render
Z = 4; ry = y + 30 + 118 * Z; x = 20
d.text((10, y), "scale bracket at 4x live scale (red = root line; SET keeper left for reference):", fill=(255, 230, 120), font=F)
rx = x + 60; place(sheet, setw, (san["content_cx"], san["foot_row"]), 1.0, Z, rx, ry); d.text((rx - 40, y + 16), "SET 1.00", fill=(255, 255, 255), font=F); x = rx + 120
for sc in (0.95, 1.00, 1.06, 1.12):
    rx = x + 70; place(sheet, cand, can["root"], sc, Z, rx, ry); d.text((rx - 30, y + 16), "NEW %.2f" % sc, fill=(255, 255, 255), font=F); x = rx + 150
d.line([(10, ry), (1000, ry)], fill=(255, 80, 80))
# anchors panel on the right
ax = 1180; ay = 40; Zc = 5; live = cand.resize((cand.width * Zc, cand.height * Zc), Image.NEAREST); sheet.paste(live, (ax, ay), live); dd = ImageDraw.Draw(sheet)
def mark(pt, col, lab):
    p = (ax + pt[0] * Zc, ay + pt[1] * Zc); cross(dd, p, col, 5); dd.text((p[0] + 7, p[1] - 6), lab, fill=col, font=F)
mark(can["lead_glove"], (255, 240, 0), "lead glove (contact)"); mark(can["other_glove"], (200, 200, 0), "other glove")
mark(can["head"], (255, 120, 255), "head"); mark(can["pelvis"], (0, 230, 255), "pelvis (seam)"); mark(can["shoulder"], (120, 200, 255), "shoulder"); mark(can["feet"], (120, 255, 120), "feet")
mark(can["root"], (255, 80, 80), "root (from lead glove)")
dd.text((ax, ay + cand.height * Zc + 6), "anchors (sprite px): root %s · lead glove %s · reach unit %s" % (can["root"], can["lead_glove"][:2], can["reach_screen_unit"]), fill=(220, 220, 220), font=F)
dd.text((ax, ay + cand.height * Zc + 22), "root = lead glove + (%.1f, %.1f) canonical px ÷ scale: the raised glove meets the simulation hand" % tuple(can["root_offset_base_px"]), fill=(220, 220, 220), font=F)
# extraction stats
ey = H - 90
d.text((10, ey), "extraction of the native grid from the generator export (%dx%d RGB, opaque noisy background, no alpha):" % tuple(extr["upload_size"]), fill=(255, 230, 120), font=F); ey += 15
d.text((10, ey), "  block pitch x %.2f / y %.2f px, phase fitted by minimum within-block variance; block colour = median of the inner half of each block; background keyed at max-channel distance ≤ %d" % (extr["pitch"]["x"], extr["pitch"]["y"], extr["bg_tolerance"]), fill=(255, 255, 255), font=F); ey += 15
rp = extr["reproduction_of_upload"]
d.text((10, ey), "  native content %dx%d px (canvas %dx%d incl. 4 px pad) · %d opaque px · %d distinct colours (a ±2 noise around ~40 dominant colours; NO palette snap applied)" % (*extr["native_content"], *extr["native_canvas"], extr["foreground_blocks"], extr["distinct_colours"]), fill=(255, 255, 255), font=F); ey += 15
d.text((10, ey), "  re-expanded on the same grid it reproduces the upload: %.1f%% of foreground-box pixels within ±8, %.1f%% within ±16, mean abs error %.1f (the rest is the export's blurred block edges)" % (rp["within_8"] * 100, rp["within_16"] * 100, rp["mean_abs_err"]), fill=(255, 255, 255), font=F); ey += 15
d.text((10, ey), "  no rotation, mirroring, warp, IK, limb edit or cleanup; the upload is preserved byte-for-byte beside the extracted source", fill=(180, 180, 180), font=F)
sheet.save(os.path.join(OUT, "B_scale_anchor_calibration.png")); print("sheets written")
