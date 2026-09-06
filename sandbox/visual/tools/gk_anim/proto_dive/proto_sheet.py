# Keyframe sheet for the prototype dive: every frame in order at GAMEPLAY scale ×Z (roots aligned, true relative size across art
# lineages), plus native and 4× rows, with labels.  python3 proto_sheet.py <frames_dir> <out.png> [zoom] [--quick]
import sys, os, json
from PIL import Image, ImageDraw, ImageFont
FR, OUT = sys.argv[1], sys.argv[2]; Z = int(sys.argv[3]) if len(sys.argv) > 3 and sys.argv[3].isdigit() else 6; QUICK = "--quick" in sys.argv
ROOTDIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", ".."))
F = lambda s: ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", s); Fr = lambda s: ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", s)
S_LIVE = 0.4197
meta = json.load(open(f"{FR}/frames.json")); frames = list(meta["frames"])
# insert the contact PNG as F10 (the untouched approved asset) in its chronological place
cw20 = f"{ROOTDIR}/assets/visual_v1/goalkeeper/contextual/DIVE_SOUTH_CW20.png"; an = json.load(open(cw20.replace(".png", "_anchors.json")))
contact = {"name": "F10_CONTACT", "phase": "CONTACT — DIVE_SOUTH_CW20 @ 0.85 (untouched)", "t": "u 0.95 → contact tick (live renderer, hand-led placement)", "rig": "PNG", "note": "the approved contact pose exactly as live: the file itself, no edit", "sources": ["DIVE_SOUTH_CW20.png"], "grounded": "airborne", "pixel_scale": an["pixel_scale"], "root": an["root"], "img_path": cw20, "landmarks": {"head": an["head"], "lead_glove": an["lead_glove"][:2], "other_glove": an["gloves"][1][:2]}}
idx = next(i for i, f in enumerate(frames) if f["name"].startswith("F11")); frames.insert(idx, contact)
def load(f):
    return Image.open(f.get("img_path") or f"{FR}/{f['name']}.png").convert("RGBA")
CW, CH = 46 * Z, 62 * Z; RX, RY = CW // 2, CH - 4 * Z          # cell in screen px × Z; root at (RX, RY)
def cell_gameplay(f):
    im = load(f); ps = S_LIVE * f["pixel_scale"]
    g = im.resize((max(1, round(im.width * ps)), max(1, round(im.height * ps))), Image.NEAREST)        # the renderer's raster
    g = g.resize((g.width * Z, g.height * Z), Image.NEAREST)
    c = Image.new("RGB", (CW, CH), (58, 96, 52)); d = ImageDraw.Draw(c)
    for yy in range(0, CH, 8 * Z): d.line([(0, yy), (CW, yy)], fill=(52, 88, 47))
    rx, ry = f["root"]; ox = RX - round(rx * ps) * Z; oy = RY - round(ry * ps) * Z
    c.paste(g, (ox, oy), g)
    d.line([(RX - 10, RY), (RX + 10, RY)], fill=(255, 60, 60), width=2); d.line([(RX, RY - 10), (RX, RY + 10)], fill=(255, 60, 60), width=2)
    lm = f.get("landmarks") or {}
    for key, col in (("lead_glove", (80, 200, 255)), ("other_glove", (255, 180, 60)), ("head", (255, 80, 255))):
        if lm.get(key): x, y = lm[key]; X = ox + round(x * ps) * Z + Z // 2; Y = oy + round(y * ps) * Z + Z // 2; d.ellipse([X - 5, Y - 5, X + 5, Y + 5], outline=col, width=2)
    return c
def cell_native(f, k):
    im = load(f); b = im.getbbox(); im = im.crop(b) if b else im
    up = im.resize((im.width * k, im.height * k), Image.NEAREST); c = Image.new("RGB", (max(up.width, 40), up.height), (30, 32, 36)); c.paste(up, (0, 0), up); return c
cells = [cell_gameplay(f) for f in frames]
W = len(cells) * (CW + 8) + 8; header = 120
rows = [("GAMEPLAY SCALE ×%d — as the renderer draws it (nearest, sprite scale 0.4197 × body scale); red cross = simulation root; blue/orange = gloves, magenta = head" % Z, cells)]
if not QUICK:
    rows.append(("NATIVE ×1 (each frame's own pixel density: GK_BASE_V1 rig frames at 1.0, contact-art frames at the Pro density drawn at 0.85)", [cell_native(f, 1) for f in frames]))
    rows.append(("4× NEAREST-NEIGHBOUR", [cell_native(f, 4) for f in frames]))
H = header + sum(max(c.height for c in r[1]) + 110 for r in rows)
sheet = Image.new("RGB", (max(W, 1800), H), (18, 19, 22)); d = ImageDraw.Draw(sheet)
d.text((12, 10), "PROTOTYPE — full-stretch LEFT (south) dive: keyframes in chronological order", font=F(24), fill=(255, 255, 255))
d.text((12, 44), "W_z190_L18_GOAL_RIGHT: keeper at (102.51, 34) facing west, ball to 1.8 m left / 1.9 m high; commit t 0.293 s, execTime 0.545 s, contact t 0.867 s (tick 51), LAND/RECOVER to t 1.93 s", font=Fr(13), fill=(150, 155, 165))
d.text((12, 62), "F0–F7 W_SET articulated rig (GK_BASE_V1 lineage) · F8–F9 and F11–F14 SOUTH_CW20 contact rig (the approved art's own parts, Pro lineage @0.85) · F10 the untouched contact PNG · F15–F16 V1 recover clip · F17 SET", font=Fr(13), fill=(150, 155, 165))
y = header
for title, cs in rows:
    d.text((12, y), title, font=F(14), fill=(235, 225, 120)); y += 22; x = 8; hmax = max(c.height for c in cs)
    for f, c in zip(frames, cs):
        sheet.paste(c, (x, y + hmax - c.height)); yy = y + hmax + 4
        d.text((x, yy), f["name"], font=F(11), fill=(255, 255, 255)); d.text((x, yy + 13), f["phase"][:34], font=Fr(10), fill=(200, 200, 210)); d.text((x, yy + 25), f["t"][:34], font=Fr(10), fill=(150, 155, 165))
        d.text((x, yy + 37), f"root {f['root']}  {f['grounded']}", font=Fr(10), fill=(150, 155, 165)); d.text((x, yy + 49), (", ".join(f["sources"]))[:36], font=Fr(10), fill=(150, 200, 150)); d.text((x, yy + 61), f"rig {f['rig']} · density {f['pixel_scale']}", font=Fr(10), fill=(150, 155, 165))
        x += c.width + 8
    y += hmax + 88
sheet.save(OUT); print(OUT, sheet.size)
