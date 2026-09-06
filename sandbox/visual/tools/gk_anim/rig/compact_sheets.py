# compact gameplay contact sheets (every Nth tick) for the current and proposed captures
#   python3 compact_sheets.py <current_dir> <proposed_dir> <outdir> [step]
import sys, json, os
from PIL import Image, ImageDraw, ImageFont
CUR, PROP, OUT = sys.argv[1:4]; STEP = int(sys.argv[4]) if len(sys.argv) > 4 else 3; os.makedirs(OUT, exist_ok=True)
F = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 11)
for tag, dirn, pref in (("current", CUR, "cur"), ("proposed", PROP, "prop")):
    t = json.load(open(f"{dirn}/trace.json")); c0 = t["committedTick"]; ct = t["contactTick"] or (c0 + 40)
    idx = list(range(max(0, c0 - 3), min(len(t["trace"]), ct + 31), STEP)); cells = []
    for i in idx:
        im = Image.open(f"{dirn}/{pref}_{i:03d}.png").convert("RGB").crop((130, 60, 330, 300)); d = ImageDraw.Draw(im)
        tr = t["trace"][i]; u = tr.get("diveU") if tag == "current" else tr.get("u")
        lab = f"f{i} u={u if u is not None else '-'}" + (f" {tr['drawn']}" if tag == "proposed" else "")
        d.rectangle([0, 0, im.width, 14], fill=(0, 0, 0)); d.text((3, 1), lab, font=F, fill=(255, 255, 255)); cells.append(im)
    cols = 8; rows = (len(cells) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * 204 + 4, rows * 244 + 4), (18, 19, 22))
    for k, c in enumerate(cells): sheet.paste(c, (4 + (k % cols) * 204, 4 + (k // cols) * 244))
    sheet.save(f"{OUT}/sheet_{tag}.png"); print(tag, sheet.size, len(cells))
