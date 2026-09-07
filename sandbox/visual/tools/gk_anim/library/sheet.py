# Keyframe sheet of an authored frame set: every frame at Z× nearest-neighbour on a pitch-green ground with the root cross and a ground
# line, chronological, with name + phase.   python3 sheet.py <frames_dir> <out.png> [zoom] [names csv]
import sys, os, json
from PIL import Image, ImageDraw, ImageFont
FR, OUT = sys.argv[1], sys.argv[2]; Z = int(sys.argv[3]) if len(sys.argv) > 3 else 3
meta = json.load(open(f"{FR}/frames.json"))["frames"]
names = sys.argv[4].split(",") if len(sys.argv) > 4 else [f["name"] for f in meta]
F = {f["name"]: f for f in meta}; S_LIVE = 0.4197
cell_w, cell_h = 96, 132                          # screen px per cell (1× live); frames are drawn at their live scale × Z
f10 = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 10); fb = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 11)
COLS = int(sys.argv[5]) if len(sys.argv) > 5 else 6
cols = min(COLS, len(names)); rows = (len(names) + cols - 1) // cols
sh = Image.new("RGB", (cols * cell_w * Z + 8, rows * (cell_h * Z + 28) + 8), (24, 26, 30)); d = ImageDraw.Draw(sh)
for i, n in enumerate(names):
    f = F[n]; im = Image.open(f"{FR}/{n}.png").convert("RGBA"); ps = S_LIVE * f.get("pixel_scale", 1.0)
    cx, cy = (i % cols) * cell_w * Z + 4, (i // cols) * (cell_h * Z + 28) + 4
    d.rectangle([cx, cy, cx + cell_w * Z, cy + cell_h * Z], fill=(58, 112, 40))
    rx, ry = cx + cell_w * Z // 2, cy + int(cell_h * Z * 0.78)          # root position in the cell (the drawn root = the simulation root)
    d.line([(cx, ry), (cx + cell_w * Z, ry)], fill=(84, 150, 60))
    # draw the frame with nearest-neighbour at its live scale × Z
    w, h = max(1, round(im.width * ps * Z)), max(1, round(im.height * ps * Z)); big = im.resize((w, h), Image.NEAREST)
    ax, ay = f["root"]; ox, oy = rx - round(ax * ps * Z), ry - round(ay * ps * Z)
    sh.paste(big, (ox, oy), big)
    d.line([(rx - 4, ry), (rx + 4, ry)], fill=(255, 60, 60)); d.line([(rx, ry - 4), (rx, ry + 4)], fill=(255, 60, 60))
    for k, col in (("lead_glove", (255, 255, 0)), ("pelvis", (0, 200, 255)), ("head", (255, 120, 255))):
        s = f.get("screen", {}).get(k)
        if s: px, py = rx + round(s[0] * Z), ry + round(s[1] * Z); d.rectangle([px - 1, py - 1, px + 1, py + 1], outline=col)
    d.text((cx + 3, cy + cell_h * Z + 2), n, font=fb, fill=(255, 255, 255)); d.text((cx + 3, cy + cell_h * Z + 14), (f.get("phase", "") + "  " + f.get("t", ""))[:60], font=f10, fill=(190, 195, 205))
sh.save(OUT); print(OUT, sh.size)
