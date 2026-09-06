# CURRENT vs PROTOTYPE V1 vs REFINED V2 on the same simulation: gameplay-scale side-by-side GIFs (60/24/12/6 fps), 4x slow-motion keeper
# crops (GIF 15 fps + strips), and the two requested frame strips (in-engine ticks).
#   python3 proto_compare3.py <current_dir> <v1_dir> <v2_dir> <frames_v2_dir> <out_dir>
import sys, os, json
from PIL import Image, ImageDraw, ImageFont
CUR, V1, V2, FR, OUT = sys.argv[1:6]; os.makedirs(OUT, exist_ok=True)
F = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 12); FB = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 13)
def save_gif(frames, path, fps): frames[0].save(path, save_all=True, append_images=frames[1:], duration=int(round(1000 / fps)), loop=0, disposal=2, optimize=False)
T = {k: json.load(open(f"{d}/trace.json")) for k, d in (("cur", CUR), ("v1", V1), ("v2", V2))}
n = min(len(t["trace"]) for t in T.values()); bs = T["v2"]["backToSet"] or n - 1; hi = min(n, bs + 8); c0 = T["v2"]["committedTick"]; ct = T["v2"]["contactTick"]
PREF = {"cur": "cur", "v1": "new", "v2": "new"}; DIRS = {"cur": CUR, "v1": V1, "v2": V2}; LAB = {"cur": "CURRENT", "v1": "PROTOTYPE V1", "v2": "REFINED V2"}
def fimg(k, i): return Image.open(f"{DIRS[k]}/{PREF[k]}_{i:03d}.png").convert("RGB")
def label(im, lines, cols):
    d = ImageDraw.Draw(im); d.rectangle([0, 0, im.width, 14 * len(lines) + 4], fill=(0, 0, 0))
    for j, (txt, col) in enumerate(zip(lines, cols)): d.text((4, 2 + 14 * j), txt, font=F, fill=col)
    return im
BOX = (130, 50, 330, 300)          # keeper area of the 460x330 capture (root at (230,250)) — gameplay scale, 1:1 pixels
side, side2 = [], []
for i in range(0, hi):
    cells = []
    for k in ("cur", "v1", "v2"):
        im = fimg(k, i).crop(BOX); t = T[k]["trace"][i]; u = t.get("diveU") if k == "cur" else t.get("u")
        sub = ((t.get("anim") or {}).get("art") or "")[:30] if k == "cur" or t["drawn"] == "LIVE" else "frame " + t["drawn"]
        cells.append(label(im, [f"{LAB[k]}  tick {i}  t={t['now']:.2f}" + (f"  u={u:.2f}" if u is not None else ""), sub], [(255, 255, 255), (180, 220, 180)]))
    s = Image.new("RGB", (cells[0].width * 3 + 16, cells[0].height), (18, 19, 22))
    for j, c in enumerate(cells): s.paste(c, (j * (c.width + 8), 0))
    side.append(s); side2.append(s.resize((s.width * 2, s.height * 2), Image.NEAREST))
for fps in (60, 24, 12, 6): save_gif(side, f"{OUT}/compare3_gameplay_1x_{fps}fps.gif", fps)
for fps in (24, 12): save_gif(side2, f"{OUT}/compare3_gameplay_2x_{fps}fps.gif", fps)
# 4x keeper crop, slow motion (15 fps = 1/4 speed) and normal (60)
CB = (175, 120, 275, 270); cu = []
for i in range(0, hi):
    cells = []
    for k in ("cur", "v1", "v2"):
        im = fimg(k, i).crop(CB).resize((400, 600), Image.NEAREST); t = T[k]["trace"][i]
        cells.append(label(im, [f"{LAB[k]}  tick {i}  t={t['now']:.3f}" + ("" if k == "cur" else f"  {t['drawn']}")], [(255, 255, 255)]))
    s = Image.new("RGB", (400 * 3 + 16, 600), (18, 19, 22))
    for j, c in enumerate(cells): s.paste(c, (j * 408, 0))
    cu.append(s)
save_gif(cu, f"{OUT}/compare3_closeup_4x_slowmo_15fps.gif", 15); save_gif(cu, f"{OUT}/compare3_closeup_4x_60fps.gif", 60)
# strips: (A) deepest plant → push-off → toe-off → early flight → mid flight → bridge(s) → CONTACT ; (B) CONTACT → landing → recovery → SET
def strip(ticks, title, path, Z=4, box=CB):
    rows = []
    for k in ("cur", "v1", "v2"):
        cells = []
        for i in ticks:
            im = fimg(k, i).crop(box).resize(((box[2] - box[0]) * Z, (box[3] - box[1]) * Z), Image.NEAREST); t = T[k]["trace"][i]; u = t.get("diveU") if k == "cur" else t.get("u")
            d = ImageDraw.Draw(im); d.rectangle([0, 0, im.width, 16], fill=(0, 0, 0)); d.text((3, 1), f"tick {i} t={t['now']:.2f}" + (f" u={u:.2f}" if u is not None else "") + ("" if k == "cur" else f" {t['drawn']}"), font=F, fill=(255, 255, 255)); cells.append(im)
        row = Image.new("RGB", (len(cells) * (cells[0].width + 4) + 4, cells[0].height + 24), (18, 19, 22)); ImageDraw.Draw(row).text((4, 4), LAB[k], font=FB, fill=(235, 225, 120))
        for j, c in enumerate(cells): row.paste(c, (4 + j * (c.width + 4), 22))
        rows.append(row)
    sh = Image.new("RGB", (max(r.width for r in rows), 28 + sum(r.height + 6 for r in rows)), (18, 19, 22)); ImageDraw.Draw(sh).text((6, 6), title, font=FB, fill=(255, 255, 255)); y = 28
    for r in rows: sh.paste(r, (0, y)); y += r.height + 6
    sh.save(path); print(path, sh.size)
# pick the ticks from the V2 schedule: first tick of each drawn key
first = {}
for t in T["v2"]["trace"]:
    if t["drawn"] not in first: first[t["drawn"]] = t["f"]
A = [first[k] for k in ("F03", "F04", "F05", "F05b", "F06", "F07", "F07b", "F08", "F09") if k in first] + [ct]
strip(A, "A — deepest plant → push-off → toe-off → early flight → mid flight → bridges → CONTACT (in-engine ticks, 4x)", f"{OUT}/STRIP_A_plant_to_contact.png")
B = [ct] + [first[k] for k in ("F11", "F11b", "F12", "F12b", "F13", "F13b", "F14", "F15a", "F15a2", "F15b", "F16", "F17") if k in first] + [bs]
strip(B, "B — CONTACT → landing → recovery → SET (in-engine ticks, 4x)", f"{OUT}/STRIP_B_contact_to_set.png", box=(160, 120, 300, 300))
print("compare3 written; ticks", hi)
