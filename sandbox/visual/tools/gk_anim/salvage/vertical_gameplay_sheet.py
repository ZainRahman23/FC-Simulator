#!/usr/bin/env python3
"""C — representative vertical-save gameplay sheet: for each case, the SET keeper at the same root (scale reference), the contact tick at
gameplay scale, and 2x / 4x keeper crops with the root, the simulation hand (contact point), the ball and the drawn lead-glove anchor, for
one or more anchoring variants captured by vertical_scan.js.
  python3 vertical_gameplay_sheet.py <out.png> <label1>=<scan_dir1> [<label2>=<scan_dir2> ...] [--cases id,id,...]
"""
import sys, os, json, math
from PIL import Image, ImageDraw, ImageFont
args = [a for a in sys.argv[1:] if not a.startswith("--")]; OUT = args[0]; VARS = [a.split("=", 1) for a in args[1:]]
cases_arg = [a for a in sys.argv[1:] if a.startswith("--cases=")]; CASES = cases_arg[0].split("=", 1)[1].split(",") if cases_arg else None
try: F = ImageFont.truetype("/System/Library/Fonts/Menlo.ttc", 12); FB = ImageFont.truetype("/System/Library/Fonts/Menlo.ttc", 15)
except Exception: F = ImageFont.load_default(); FB = F


def cross(d, p, col, k=5, w=2):
    d.line([(p[0] - k, p[1]), (p[0] + k, p[1])], fill=col, width=w); d.line([(p[0], p[1] - k), (p[0], p[1] + k)], fill=col, width=w)


def circ(d, p, col, k=6, w=2):
    d.ellipse([p[0] - k, p[1] - k, p[0] + k, p[1] + k], outline=col, width=w)


def drawn_glove(c):
    """where the runtime drew the lead-glove anchor: blit origin (sp − root·ps, rounded) + placement + anchor·ps"""
    pi = c["poseInfo"]; s = c["s"]; ps = s * (pi["pixel_scale"] or 1); pl = c["place"] or {"dx": 0, "dy": 0}
    dx0 = round(c["sp"][0] - pi["root"][0] * ps); dy0 = round(c["sp"][1] - pi["root"][1] * ps)
    g = pi["lead"]; return (dx0 + pl["dx"] + g[0] * ps, dy0 + pl["dy"] + g[1] * ps), (dx0 + pl["dx"] + pi["feet"][0] * ps, dy0 + pl["dy"] + pi["feet"][1] * ps) if pi.get("feet") else None


def panel(scan, c, zoom, w=100, h=140, overlay=True):
    img = Image.open(os.path.join(scan, c["id"] + ".png")).convert("RGB"); clip = c["clip"]
    cx = c["sp"][0] - clip["x"]; cy = c["sp"][1] - clip["y"]
    crop = img.crop((int(cx - w / 2), int(cy - h * 0.82), int(cx + w / 2), int(cy + h * 0.18))).resize((w * zoom, h * zoom), Image.NEAREST)
    if not overlay: return crop
    d = ImageDraw.Draw(crop); T = lambda p: ((p[0] - clip["x"] - (cx - w / 2)) * zoom, (p[1] - clip["y"] - (cy - h * 0.82)) * zoom)
    cross(d, T(c["sp"]), (255, 70, 70), 5 * zoom // 2)                           # simulation root
    if c.get("handSp"): circ(d, T(c["handSp"]), (255, 240, 0), 4 * zoom // 2)      # simulation hand = contact point
    circ(d, T(c["ballSp"]), (255, 255, 255), 5 * zoom // 2, 1)                     # ball
    if c.get("poseInfo"):
        g, ft = drawn_glove(c); cross(d, T(g), (255, 80, 255), 4 * zoom // 2)      # drawn lead-glove anchor
        if ft: circ(d, T(ft), (120, 255, 120), 3 * zoom // 2, 1)                   # drawn feet anchor
    return crop


scans = [(lab, json.load(open(os.path.join(d, "cases.json"))), d) for lab, d in VARS]
ids = CASES or [c["id"] for c in scans[0][1]]
W1, H1 = 100, 140; PW = [W1, W1, W1 * 2, W1 * 4]; PH = [H1, H1, H1 * 2, H1 * 4]
rowh = H1 * 4 + 40; colw = sum(PW) + 30
sheet = Image.new("RGB", (colw * len(scans) + 20, 70 + rowh * len(ids)), (22, 22, 22)); D = ImageDraw.Draw(sheet)
D.text((10, 8), "C — representative vertical high saves on the real gameplay camera, frozen at the simulation's contact tick (red + sim root · yellow ○ sim hand = committed contact point · white ○ ball · magenta + drawn lead-glove anchor · green ○ drawn feet anchor)", fill=(255, 255, 255), font=FB)
D.text((10, 28), "per case and anchoring variant: SET keeper at the same root (scale reference) | contact at gameplay scale (1x) | 2x | 4x — the simulation, contact tick and ball are identical in every variant (art swap only)", fill=(200, 200, 200), font=F)
for vi, (lab, cases, d) in enumerate(scans):
    D.text((10 + vi * colw, 46), lab, fill=(255, 230, 120), font=FB)
    byid = {c["id"]: c for c in cases}
    for ri, cid in enumerate(ids):
        c = byid.get(cid)
        if not c: continue
        y0 = 70 + ri * rowh; x = 10 + vi * colw
        setimg = Image.open(os.path.join(d, cid + "_SET.png")).convert("RGB"); sc = {"x": round(c["setSp"][0]) - 160, "y": round(c["setSp"][1]) - 190}
        cxs = c["setSp"][0] - sc["x"]; cys = c["setSp"][1] - sc["y"]
        setcrop = setimg.crop((int(cxs - W1 / 2), int(cys - H1 * 0.82), int(cxs + W1 / 2), int(cys + H1 * 0.18)))
        sheet.paste(setcrop, (x, y0 + 20)); D.text((x, y0 + 4), "SET (ref)", fill=(200, 200, 200), font=F); x += W1 + 6
        for zoom in (1, 2, 4):
            p = panel(d, c, zoom); sheet.paste(p, (x, y0 + 20)); D.text((x, y0 + 4), f"{zoom}x", fill=(200, 200, 200), font=F); x += W1 * zoom + 6
        cl = c["cls"]; pl = c["place"] or {}; ct = c["contact"] or {}
        g, ft = drawn_glove(c) if c.get("poseInfo") else ((0, 0), None)
        res_live = math.hypot(g[0] - c["handSp"][0], g[1] - c["handSp"][1]) if c.get("handSp") else None
        feet_up = (c["sp"][1] - ft[1]) if ft else None
        txt = [f"{cid}: lat {c['lat']} m, z {c['z']} m, v {c['v']} → {cl['family']} {cl['hClass']}, dz {cl['dz']}, L {cl['L']}, norm {cl['norm']}; {c['committed']['tier']} / {c['committed']['action']}",
               f"pick {c['ctx']['id'] if c.get('ctx') else 'NONE'} {c['ctx']['score'] if c.get('ctx') else ''} · contact tick {c['contactTick']} {ct.get('volume')} {ct.get('outcome')} · hand rel root ({c['handSp'][0]-c['sp'][0]:.1f},{c['handSp'][1]-c['sp'][1]:.1f}) live px",
               f"placement raw {pl.get('raw')} corr→ ({pl.get('dx')},{pl.get('dy')}) res {pl.get('res')} sprite px {'WRONG_CLIP (capped)' if pl.get('capped') else ''} · drawn glove→hand {res_live:.1f} live px · drawn feet {feet_up:+.1f} px above the root line" if res_live is not None else "no pose drawn"]
        for k, t in enumerate(txt): D.text((10 + vi * colw, y0 + 20 + H1 * 4 + 2 + k * 13), t[:150], fill=(255, 255, 255) if k else (255, 230, 120), font=F)
sheet.save(OUT); print("wrote", OUT, sheet.size)
