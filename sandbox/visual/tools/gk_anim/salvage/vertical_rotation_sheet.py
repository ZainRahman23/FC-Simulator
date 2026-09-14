#!/usr/bin/env python3
"""Review sheet for the rotation-only test: columns = clockwise angles, two row groups (glove-root / feet-root). Per cell: gameplay-scale
pose in the real goal with the SET keeper at the same root beside it, a 4x crop with the contact point, ball, root/shadow, drawn lead glove,
hip, head, feet and the body axis, and the measurements. Top strip: the rotated sprites at 4x with the tracked landmarks.
  python3 vertical_rotation_sheet.py <variants_dir> <captures_root> <out.png> <angles csv> <case id>
"""
import sys, os, json, math
from PIL import Image, ImageDraw, ImageFont
VD, CAP, OUT, ANG, CASE = sys.argv[1], sys.argv[2], sys.argv[3], [int(v) for v in sys.argv[4].split(",")], sys.argv[5]
try: F = ImageFont.truetype("/System/Library/Fonts/Menlo.ttc", 12); FB = ImageFont.truetype("/System/Library/Fonts/Menlo.ttc", 15)
except Exception: F = ImageFont.load_default(); FB = F
rt = json.load(open(os.path.join(VD, "rotation_test.json")))


def cross(d, p, col, k=5, w=2): d.line([(p[0] - k, p[1]), (p[0] + k, p[1])], fill=col, width=w); d.line([(p[0], p[1] - k), (p[0], p[1] + k)], fill=col, width=w)
def circ(d, p, col, k=6, w=2): d.ellipse([p[0] - k, p[1] - k, p[0] + k, p[1] + k], outline=col, width=w)
def lean(a, b): return math.degrees(math.atan2(b[0] - a[0], -(b[1] - a[1])))


def load_case(stem):
    d = os.path.join(CAP, stem); cases = json.load(open(os.path.join(d, "cases.json"))); c = [x for x in cases if x["id"] == CASE][0]; return d, c


def drawn(c, an, key):
    pi = c["poseInfo"]; s = c["s"]; ps = s * (pi["pixel_scale"] or 1); pl = c["place"] or {"dx": 0, "dy": 0}
    dx0 = round(c["sp"][0] - pi["root"][0] * ps); dy0 = round(c["sp"][1] - pi["root"][1] * ps)
    p = an["landmarks_canvas_px"][key] if key in an.get("landmarks_canvas_px", {}) else an[key]
    return (dx0 + pl["dx"] + p[0] * ps, dy0 + pl["dy"] + p[1] * ps)


Z = 4; W1, H1 = 150, 130; W4, H4 = 100 * Z, 140 * Z; colw = max(W1 * 2 + 10, W4) + 16
rowh = 24 + H1 + 8 + H4 + 96
strip_h = 140 * 4 + 40
sheet = Image.new("RGB", (16 + colw * len(ANG), 60 + strip_h + rowh * 2 + 20), (22, 22, 22)); D = ImageDraw.Draw(sheet)
D.text((10, 8), "ROTATION-ONLY TEST — recovered vertical high-save sprite, rigid nearest-neighbour rotation CLOCKWISE about the seam-hip pivot, scale 1.00, no redraw · same simulation, same contact tick in every cell (%s)" % CASE, fill=(255, 255, 255), font=FB)
D.text((10, 28), "red + sim root (shadow centre) · yellow ○ sim hand = committed contact point · white ○ ball · magenta + drawn raised glove · cyan + hip, cyan line hip→head (torso axis) · pink + head · green ○ feet · blue line feet→head (full body axis) · grey ghost = SET keeper at the same root", fill=(200, 200, 200), font=F)
# ── top strip: rotated sprites with landmarks
y0 = 50; D.text((10, y0), "rotated sprites at 4x with the tracked landmarks (lean from vertical, + = clockwise):", fill=(255, 230, 120), font=F)
for i, cw in enumerate(ANG):
    v = rt["variants"][str(cw)]; an = json.load(open(os.path.join(VD, f"VH_R{cw:02d}_G_anchors.json"))); im = Image.open(os.path.join(VD, f"VH_R{cw:02d}_G.png")).convert("RGBA")
    x0 = 8 + i * colw; big = im.resize((im.width * 4, im.height * 4), Image.NEAREST); cell = Image.new("RGB", (colw - 8, strip_h - 20), (40, 90, 40)); cell.paste(big, ((colw - 8 - big.width) // 2, 6), big); d = ImageDraw.Draw(cell)
    ox, oy = (colw - 8 - big.width) // 2, 6
    lm = v["landmarks_canvas_px"]; P = lambda p: (ox + p[0] * 4, oy + p[1] * 4)
    d.line([P(lm["hip"]), P(lm["head"])], fill=(0, 230, 255), width=2); d.line([P(lm["feet"]), P(lm["head"])], fill=(80, 120, 255), width=1)
    cross(d, P(lm["glove_lead"]), (255, 80, 255), 5); cross(d, P(lm["hip"]), (0, 230, 255), 4); cross(d, P(lm["head"]), (255, 120, 255), 4); circ(d, P(lm["feet"]), (120, 255, 120), 4); cross(d, P(lm["torso"]), (255, 255, 255), 3, 1)
    cross(d, P(an["root"]), (255, 80, 80), 5); cross(d, P(json.load(open(os.path.join(VD, f"VH_R{cw:02d}_F_anchors.json")))["root"]), (255, 160, 80), 5)
    sheet.paste(cell, (x0, y0 + 16)); ax = v["axes"]
    D.text((x0, y0 + 16 + strip_h - 18), f"{cw}° CW · torso {ax['torso_hip_head_lean_deg']:+.1f}° · body {ax['full_feet_head_lean_deg']:+.1f}° · reach {ax['reach_feet_glove_lean_deg']:+.1f}° · red + G root · orange + F root", fill=(255, 255, 255), font=F)
# ── row groups
for gi, (suffix, glabel) in enumerate((("G", "GLOVE-ROOT / contact-hand anchoring (root from the raised glove; the glove meets the simulation hand)"), ("F", "FEET / ROOT anchoring (root under the feet; the hand-led placement pulls the glove toward the hand within its cap)"))):
    gy = 60 + strip_h + gi * rowh; D.text((10, gy), glabel, fill=(255, 230, 120), font=FB)
    for i, cw in enumerate(ANG):
        stem = f"VH_R{cw:02d}_{suffix}"; an = json.load(open(os.path.join(VD, stem + "_anchors.json"))); d, c = load_case(stem); x0 = 8 + i * colw
        img = Image.open(os.path.join(d, CASE + ".png")).convert("RGB"); clip = c["clip"]; cx = c["sp"][0] - clip["x"]; cy = c["sp"][1] - clip["y"]
        # gameplay scale (1x) in the real goal: window right of the keeper so the goal frame is in view, SET keeper beside it at the same root height
        g1 = img.crop((int(cx - 40), int(cy - 100), int(cx - 40 + W1), int(cy - 100 + H1)))
        setimg = Image.open(os.path.join(d, CASE + "_SET.png")).convert("RGB"); sx = c["setSp"][0] - (round(c["setSp"][0]) - 160); sy = c["setSp"][1] - (round(c["setSp"][1]) - 190)
        s1 = setimg.crop((int(sx - 40), int(sy - 100), int(sx - 40 + W1), int(sy - 100 + H1)))
        sheet.paste(s1, (x0, gy + 24)); sheet.paste(g1, (x0 + W1 + 10, gy + 24)); D.text((x0, gy + 24 + H1 - 12), "SET (same root)", fill=(230, 230, 230), font=F); D.text((x0 + W1 + 10, gy + 24 + H1 - 12), f"{cw}° CW  contact tick {c['contactTick']}  1x", fill=(230, 230, 230), font=F)
        # 4x crop with overlays + SET ghost
        w, h = 100, 140; crop = img.crop((int(cx - w / 2), int(cy - h * 0.82), int(cx + w / 2), int(cy + h * 0.18))).resize((w * Z, h * Z), Image.NEAREST).convert("RGBA")
        ghost = setimg.crop((int(sx - w / 2), int(sy - h * 0.82), int(sx + w / 2), int(sy + h * 0.18))).resize((w * Z, h * Z), Image.NEAREST).convert("RGBA")
        # ghost: only the keeper's pixels (non-pitch) at 40 % over the crop
        gp = ghost.load(); cp = crop.load()
        for yy in range(ghost.height):
            for xx in range(ghost.width):
                r, g, b, _ = gp[xx, yy]
                if (g > r + 40 and g > b + 40 and g > 150) or (r > 200 and g > 200 and b > 190) or (max(r, g, b) < 60) or (r > 120 and r > g + 25 and r > b + 40):
                    c0 = cp[xx, yy]; cp[xx, yy] = ((c0[0] * 6 + r * 4) // 10, (c0[1] * 6 + g * 4) // 10, (c0[2] * 6 + b * 4) // 10, 255)
        dd = ImageDraw.Draw(crop); T = lambda p: ((p[0] - clip["x"] - (cx - w / 2)) * Z, (p[1] - clip["y"] - (cy - h * 0.82)) * Z)
        cross(dd, T(c["sp"]), (255, 70, 70), 8); circ(dd, T(c["handSp"]), (255, 240, 0), 9); circ(dd, T(c["ballSp"]), (255, 255, 255), 11, 1)
        hip = drawn(c, an, "hip"); head = drawn(c, an, "head"); feet = drawn(c, an, "feet"); glove = drawn(c, an, "glove_lead")
        dd.line([T(feet), T(head)], fill=(80, 120, 255), width=2); dd.line([T(hip), T(head)], fill=(0, 230, 255), width=3)
        cross(dd, T(glove), (255, 80, 255), 7); cross(dd, T(hip), (0, 230, 255), 6); cross(dd, T(head), (255, 120, 255), 6); circ(dd, T(feet), (120, 255, 120), 6)
        sheet.paste(crop.convert("RGB"), (x0, gy + 24 + H1 + 8))
        pl = c["place"] or {}; res_live = math.hypot(glove[0] - c["handSp"][0], glove[1] - c["handSp"][1]); feet_up = c["sp"][1] - feet[1]; body_dx = hip[0] - c["sp"][0]
        lines = [f"{cw}° CW · lean torso {lean(hip, head):+.1f}° · body {lean(feet, head):+.1f}° (drawn, screen)",
                 f"glove→hand {res_live:.1f} px · feet {feet_up:+.1f} px above root line",
                 f"hip {body_dx:+.1f} px from root (x) · placement raw {pl.get('raw')} → ({pl.get('dx')},{pl.get('dy')}) res {pl.get('res')}{' CAPPED' if pl.get('capped') else ''}",
                 f"pick {c['ctx']['id']} {c['ctx']['score']} · {c['contact']['volume']} {c['contact']['outcome']} · hand ({c['handSp'][0]-c['sp'][0]:+.1f},{c['handSp'][1]-c['sp'][1]:+.1f})"]
        for k, t in enumerate(lines): D.text((x0, gy + 24 + H1 + 8 + H4 + 4 + k * 15), t[:52], fill=(255, 255, 255) if k else (255, 230, 120), font=F)
sheet.save(OUT); print("wrote", OUT, sheet.size)
