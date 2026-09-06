# close-up CURRENT vs PROPOSED at the same simulation ticks (zoom 3, tight crop around the keeper)
#   python3 closeup_strip.py <current_dir> <proposed_dir> <out.png> [label]
import sys, json
from PIL import Image, ImageDraw, ImageFont
CUR, PROP, OUT = sys.argv[1:4]; LABEL = sys.argv[4] if len(sys.argv) > 4 else "PROPOSED"
F = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 12)
tc = json.load(open(f"{CUR}/trace.json")); tp = json.load(open(f"{PROP}/trace.json"))
c0 = tc["committedTick"]; ct = tc["contactTick"] or (c0 + 40)
ticks = [c0 - 1] + list(range(c0 + 1, ct + 1, 3)) + [ct + 6, ct + 12]
Z = 3; box = (175, 120, 275, 250); rows = []
for tag, dirn, pref, tr in (("CURRENT (live today)", CUR, "cur", tc), (LABEL, PROP, "prop", tp)):
    cells = []
    for i in ticks:
        if i >= len(tr["trace"]): continue
        im = Image.open(f"{dirn}/{pref}_{i:03d}.png").convert("RGB").crop(box).resize(((box[2] - box[0]) * Z, (box[3] - box[1]) * Z), Image.NEAREST)
        d = ImageDraw.Draw(im); t = tr["trace"][i]; u = t.get("diveU") if pref == "cur" else t.get("u")
        lab = f"f{i} u={'-' if u is None else round(u, 2)}" + ("" if pref == "cur" else f" {t['drawn']}")
        d.rectangle([0, 0, im.width, 15], fill=(0, 0, 0)); d.text((3, 1), lab, font=F, fill=(255, 255, 255)); cells.append(im)
    row = Image.new("RGB", (len(cells) * (cells[0].width + 4) + 4, cells[0].height + 22), (18, 19, 22)); ImageDraw.Draw(row).text((4, 3), tag, font=F, fill=(235, 225, 120))
    for k, c in enumerate(cells): row.paste(c, (4 + k * (c.width + 4), 20))
    rows.append(row)
sheet = Image.new("RGB", (max(r.width for r in rows), sum(r.height for r in rows) + 8), (18, 19, 22)); y = 0
for r in rows: sheet.paste(r, (0, y)); y += r.height + 8
sheet.save(OUT); print(OUT, sheet.size)
