import sys, os
from PIL import Image, ImageDraw, ImageFont
IN, OUT, TOP, cols = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4]); names = sys.argv[5:]
try: F = ImageFont.truetype("/System/Library/Fonts/Menlo.ttc", 16)
except Exception: F = ImageFont.load_default()
tiles = []
for n in names:
    im = Image.open(os.path.join(IN, n + ".png")).convert("RGB").crop((0, TOP, 1230, 818)); w = 600; im = im.resize((w, int(im.height * w / im.width)), Image.LANCZOS); tiles.append((im, n))
rows = (len(tiles) + cols - 1) // cols; W = cols * 610 + 10; Hh = rows * (tiles[0][0].height + 36) + 10
S = Image.new("RGB", (W, Hh), (18, 20, 23)); d = ImageDraw.Draw(S)
for i, (t, n) in enumerate(tiles): x = 10 + (i % cols) * 610; y = 10 + (i // cols) * (t.height + 36); d.text((x, y), n, fill=(230, 228, 223), font=F); S.paste(t, (x, y + 24))
S.save(OUT, quality=85); print(OUT, S.size)
