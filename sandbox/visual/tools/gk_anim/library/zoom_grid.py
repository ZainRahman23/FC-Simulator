# Zoomed view of a sprite with a labelled pixel grid, for reading rig polygon coordinates by eye.
#   python3 zoom_grid.py <sprite.png> <out.png> [zoom] [crop x0,y0,x1,y1]
import sys
from PIL import Image, ImageDraw, ImageFont
src = Image.open(sys.argv[1]).convert("RGBA"); out = sys.argv[2]; Z = int(sys.argv[3]) if len(sys.argv) > 3 else 6
crop = tuple(int(v) for v in sys.argv[4].split(",")) if len(sys.argv) > 4 else (0, 0, src.width, src.height)
x0, y0, x1, y1 = crop; W, H = x1 - x0, y1 - y0
im = Image.new("RGB", (W * Z + 40, H * Z + 40), (235, 235, 240)); d = ImageDraw.Draw(im)
chk = src.crop(crop)
for y in range(H):
    for x in range(W):
        p = chk.getpixel((x, y))
        col = p[:3] if p[3] else ((214, 214, 220) if (x + y) % 2 else (228, 228, 234))
        d.rectangle([40 + x * Z, 40 + y * Z, 40 + (x + 1) * Z - 1, 40 + (y + 1) * Z - 1], fill=col)
f = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 10)
for x in range(0, W + 1):
    gx = 40 + x * Z; sx = x + x0
    if sx % 5 == 0: d.line([(gx, 40), (gx, 40 + H * Z)], fill=(255, 0, 0) if sx % 10 == 0 else (255, 150, 150), width=1)
    if sx % 10 == 0: d.text((gx - 6, 26), str(sx), font=f, fill=(0, 0, 0))
for y in range(0, H + 1):
    gy = 40 + y * Z; sy = y + y0
    if sy % 5 == 0: d.line([(40, gy), (40 + W * Z, gy)], fill=(255, 0, 0) if sy % 10 == 0 else (255, 150, 150), width=1)
    if sy % 10 == 0: d.text((4, gy - 5), str(sy), font=f, fill=(0, 0, 0))
im.save(out); print(out, im.size)
