# sheet + markdown for the two-sided far-dive matrix: each cell shows GOAL_LEFT | GOAL_RIGHT frames with the pick, so the two authored
# far-dive poses can be compared side by side per lateral demand x height x facing.
#   python3 far_matrix_both_sheet.py <capture_dir> <out_dir>
import sys, json, os
from PIL import Image, ImageDraw, ImageFont
CAP, OUT = sys.argv[1:3]; os.makedirs(OUT, exist_ok=True)
F = lambda s: ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", s); Fr = lambda s: ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", s)
cases = {c["id"]: c for c in json.load(open(f"{CAP}/cases.json"))}
def cell_img(cid, z=1):
    im = Image.open(f"{CAP}/{cid}.png").convert("RGB").crop((30, 30, 210, 190)); return im.resize((im.width * z, im.height * z), Image.NEAREST)
def pick_txt(c): p = c["pick"]; return (p["id"].replace("_MEDHIGH", "").replace("_CORNER", "").replace("_DIVE_LEFT_FAR", "_FAR") + f" {p['score']}") if p else ("— " + (c["cls"]["family"] if c["cls"] else "?"))
COLOUR = {"DIVE_NORTH_MEDHIGH": (120, 200, 255), "DIVE_SOUTH_MEDHIGH": (255, 170, 90), "TOP_LEFT_CORNER": (200, 160, 255), "SW_FAR_DIVE_LEFT": (150, 235, 150), "SW_FAR_DIVE_RIGHT": (150, 235, 150), "LOW_DIVE_LEFT_FAR": (230, 220, 120), "W_LOW_LEFT": (230, 220, 120), "NW_LOW_LEFT": (230, 220, 120)}
def col(c): p = c["pick"]; return COLOUR.get(p["id"], (220, 220, 230)) if p else (150, 155, 165)
blocks = [("WEST-facing keeper (shooter straight in front) — lateral demand 1.2 / 1.8 / 2.4 / 3.0 m × contact height 0.35 (low control) / 0.9 MID / 1.4 HIGH / 1.9 TOP", "W", ["z035", "z090", "z140", "z190"], ["L12", "L18", "L24", "L30"]),
          ("SOUTH-WEST-facing keeper — 1.8 / 2.4 m × 0.9 / 1.4 / 1.9", "SOUTHWEST", ["z090", "z140", "z190"], ["L18", "L24"]),
          ("NORTH-WEST-facing keeper — 1.8 / 2.4 m × 0.9 / 1.4 / 1.9", "NORTHWEST", ["z090", "z140", "z190"], ["L18", "L24"])]
CW, CH = 180, 160; PAD = 8; pairw = CW * 2 + 6
rows = []
md = ["# Two-sided far-dive matrix (plain default page, current selection)", "", "cell = pick (score) for GOAL_LEFT (north, keeper-right) | GOAL_RIGHT (south, keeper-left); simulation classification per cell in brackets", ""]
for title, pre, hs, ls in blocks:
    W = 150 + len(ls) * (pairw + PAD) + PAD; H = 40 + len(hs) * (CH + 44)
    blk = Image.new("RGB", (W, H), (18, 19, 22)); d = ImageDraw.Draw(blk); d.text((PAD, 8), title, font=F(16), fill=(235, 225, 120))
    md += [f"## {title}", "", "| height \\ lateral | " + " | ".join(ls) + " |", "|---|" + "---|" * len(ls)]
    for i, h in enumerate(hs):
        y = 40 + i * (CH + 44); d.text((PAD, y + CH // 2 - 8), h.replace("z", "z ") .replace("035", "0.35").replace("090", "0.9").replace("140", "1.4").replace("190", "1.9") + " m", font=F(14), fill=(220, 220, 230))
        line = f"| {h} |"
        for j, l in enumerate(ls):
            x = 150 + j * (pairw + PAD)
            for k, side in enumerate(("GOAL_LEFT", "GOAL_RIGHT")):
                c = cases[f"{pre}_{h}_{l}_{side}"]; im = cell_img(c["id"]); blk.paste(im, (x + k * (CW + 6), y))
                d.text((x + k * (CW + 6), y + CH + 2), ("N: " if k == 0 else "S: ") + pick_txt(c), font=Fr(12), fill=col(c))
                d.text((x + k * (CW + 6), y + CH + 16), (c["cls"]["family"] + " " + c["cls"]["hClass"] + (" best" if c["cls"]["bestEffort"] else "")) if c["cls"] else "", font=Fr(11), fill=(150, 155, 165))
            cl, cr = cases[f"{pre}_{h}_{l}_GOAL_LEFT"], cases[f"{pre}_{h}_{l}_GOAL_RIGHT"]
            line += f" {pick_txt(cl)} \\| {pick_txt(cr)} <br>[{cl['cls']['family'] if cl['cls'] else '?'} / {cr['cls']['family'] if cr['cls'] else '?'}] |"
        md.append(line)
    md.append("")
    rows.append(blk)
hdr = Image.new("RGB", (max(r.width for r in rows), 96), (18, 19, 22)); d = ImageDraw.Draw(hdr)
d.text((PAD, 10), "FAR-DIVE COVERAGE, BOTH SIDES — each cell: GOAL_LEFT (left) | GOAL_RIGHT (right) at the simulation's own contact tick, live default page", font=F(22), fill=(255, 255, 255))
d.text((PAD, 44), "blue = DIVE_NORTH_MEDHIGH · orange = DIVE_SOUTH_MEDHIGH · purple = TOP_LEFT_CORNER (no counterpart on the south side) · green = SW_FAR_DIVE (SW-facing keeper, both sides) · yellow = low-save sprites (ground / far-low) · grey = not a dive (near-body save / catch) on either side", font=Fr(14), fill=(150, 155, 165))
d.text((PAD, 66), "identical simulation per cell on both sides except the sign of the lateral demand; picks come from the untouched selector", font=Fr(14), fill=(150, 235, 150))
H = hdr.height + sum(r.height + 10 for r in rows); sheet = Image.new("RGB", (hdr.width, H), (18, 19, 22)); sheet.paste(hdr, (0, 0)); y = hdr.height
for r in rows: sheet.paste(r, (0, y)); y += r.height + 10
sheet.save(f"{OUT}/FAR_DIVE_MATRIX_BOTH_SIDES.png"); open(f"{OUT}/FAR_DIVE_MATRIX_BOTH_SIDES.md", "w").write("\n".join(md)); print("sheet", sheet.size)
