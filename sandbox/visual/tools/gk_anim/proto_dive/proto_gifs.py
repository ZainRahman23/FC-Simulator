# Deliverable builders for the prototype dive:
#   python3 proto_gifs.py <current_dir> <new_dir> <frames_dir> <out_dir>
# → gameplay side-by-side GIFs (60/30/12/6 fps), current-only / new-only GIFs, contact sheets, close-up strips (2x, 4x), authored-frame GIFs.
import sys, os, json
from PIL import Image, ImageDraw, ImageFont
CUR, NEW, FR, OUT = sys.argv[1:5]; os.makedirs(OUT, exist_ok=True)
F = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 12); FB = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 12)
def save_gif(frames, path, fps): frames[0].save(path, save_all=True, append_images=frames[1:], duration=int(round(1000 / fps)), loop=0, disposal=2, optimize=False)
tc = json.load(open(f"{CUR}/trace.json")); tn = json.load(open(f"{NEW}/trace.json"))
n = min(len(tc["trace"]), len(tn["trace"])); c0 = tc["committedTick"]; ct = tc["contactTick"]; bs = tn["backToSet"] or tc["backToSet"] or n - 1
lo, hi = 0, min(n, bs + 8)
BOX = (130, 50, 330, 300)            # keeper area inside the 460x330 capture clip (root at (230,250))
def frame_img(d, pref, i): return Image.open(f"{d}/{pref}_{i:03d}.png").convert("RGB")
def label(im, lines, cols):
    d = ImageDraw.Draw(im); d.rectangle([0, 0, im.width, 14 * len(lines) + 4], fill=(0, 0, 0))
    for k, (txt, col) in enumerate(zip(lines, cols)): d.text((4, 2 + 14 * k), txt, font=F, fill=col)
    return im
side, curz, newz = [], [], []
for i in range(lo, hi):
    a = frame_img(CUR, "cur", i).crop(BOX); b = frame_img(NEW, "new", i).crop(BOX)
    A = a.resize((a.width * 2, a.height * 2), Image.NEAREST); B = b.resize((b.width * 2, b.height * 2), Image.NEAREST)
    ta = tc["trace"][i]; tb = tn["trace"][i]; ua = ta.get("diveU"); ub = tb.get("u")
    A = label(A, [f"CURRENT   tick {i}  t={ta['now']:.3f}  u={'-' if ua is None else ua}", ((ta.get('anim') or {}).get('art') or '')[:44]], [(255, 255, 255), (180, 220, 180)])
    B = label(B, [f"NEW       tick {i}  t={tb['now']:.3f}  u={'-' if ub is None else ub}  {tb['drawn']}{' (ik)' if tb.get('ik') else ''}", ("live: " + ((tb.get('anim') or {}).get('art') or ''))[:44] if tb['drawn'] == "LIVE" else "authored frame " + tb['drawn']], [(255, 255, 255), (180, 220, 180)])
    s = Image.new("RGB", (A.width * 2 + 8, A.height), (18, 19, 22)); s.paste(A, (0, 0)); s.paste(B, (A.width + 8, 0)); side.append(s); curz.append(A); newz.append(B)
for fps in (60, 30, 12, 6): save_gif(side, f"{OUT}/gameplay_side_by_side_{fps}fps.gif", fps)
save_gif(curz, f"{OUT}/gameplay_current_60fps.gif", 60); save_gif(newz, f"{OUT}/gameplay_new_60fps.gif", 60); save_gif(newz, f"{OUT}/gameplay_new_12fps.gif", 12)
# contact sheets every 3 ticks (current / new)
def sheet(cells, path, title):
    cols = 10; rows = (len(cells) + cols - 1) // cols; W, H = cells[0].size
    sh = Image.new("RGB", (cols * (W + 4) + 4, 24 + rows * (H + 4) + 4), (18, 19, 22)); ImageDraw.Draw(sh).text((6, 5), title, font=FB, fill=(255, 255, 255))
    for k, c in enumerate(cells): sh.paste(c, (4 + (k % cols) * (W + 4), 24 + (k // cols) * (H + 4)))
    sh.save(path)
sheet(newz[::3], f"{OUT}/gameplay_new_contact_sheet.png", "NEW — every 3rd tick"); sheet(curz[::3], f"{OUT}/gameplay_current_contact_sheet.png", "CURRENT — every 3rd tick")
# close-up strips: 4x crop following the keeper, current vs new at the same ticks
ticks = list(range(c0 - 12, c0, 4)) + list(range(c0, ct + 1, 3)) + list(range(ct + 4, min(n, bs + 4), 5))
for Z, box, tag in ((4, (175, 120, 275, 270), "4x"), (2, (150, 80, 310, 290), "2x")):
    rows = []
    for name, d, pref, tr in (("CURRENT (live today)", CUR, "cur", tc), ("NEW (prototype)", NEW, "new", tn)):
        cells = []
        for i in ticks:
            if i >= len(tr["trace"]) or i < 0: continue
            im = frame_img(d, pref, i).crop(box).resize(((box[2] - box[0]) * Z, (box[3] - box[1]) * Z), Image.NEAREST)
            t = tr["trace"][i]; u = t.get("diveU") if pref == "cur" else t.get("u")
            dd = ImageDraw.Draw(im); dd.rectangle([0, 0, im.width, 16], fill=(0, 0, 0)); dd.text((3, 1), f"tick {i} u={'-' if u is None else round(u, 2)}" + ("" if pref == "cur" else f" {t['drawn']}"), font=F, fill=(255, 255, 255)); cells.append(im)
        row = Image.new("RGB", (len(cells) * (cells[0].width + 4) + 4, cells[0].height + 24), (18, 19, 22)); ImageDraw.Draw(row).text((4, 4), name, font=FB, fill=(235, 225, 120))
        for k, c in enumerate(cells): row.paste(c, (4 + k * (c.width + 4), 22))
        rows.append(row)
    st = Image.new("RGB", (max(r.width for r in rows), sum(r.height for r in rows) + 8), (18, 19, 22)); y = 0
    for r in rows: st.paste(r, (0, y)); y += r.height + 8
    st.save(f"{OUT}/CLOSEUP_{tag}_current_vs_new.png")
# close-up GIF (4x) of the new animation following the keeper
cu = []
for i in range(lo, hi):
    im = frame_img(NEW, "new", i).crop((175, 120, 275, 270)).resize((400, 600), Image.NEAREST); t = tn["trace"][i]
    cu.append(label(im, [f"tick {i} t={t['now']:.3f} {t['drawn']}"], [(255, 255, 255)]))
save_gif(cu, f"{OUT}/closeup_new_4x_60fps.gif", 60); save_gif(cu, f"{OUT}/closeup_new_4x_15fps.gif", 15)
# authored frames GIF (in order, F10 = contact PNG), 4x, several speeds
meta = json.load(open(f"{FR}/frames.json")); ROOTDIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", ".."))
frs = list(meta["frames"]); cw20 = f"{ROOTDIR}/assets/visual_v1/goalkeeper/contextual/DIVE_SOUTH_CW20.png"; an = json.load(open(cw20.replace(".png", "_anchors.json")))
idx = next(i for i, f in enumerate(frs) if f["name"].startswith("F11")); frs.insert(idx, {"name": "F10_CONTACT", "img_path": cw20, "root": an["root"], "pixel_scale": an["pixel_scale"]})
S_LIVE = 0.4197; Z = 6; CW, CH = 46 * Z, 62 * Z; RX, RY = CW // 2, CH - 4 * Z; cells = []
for f in frs:
    im = Image.open(f.get("img_path") or f"{FR}/{f['name']}.png").convert("RGBA"); ps = S_LIVE * f["pixel_scale"]
    g = im.resize((max(1, round(im.width * ps)), max(1, round(im.height * ps))), Image.NEAREST); g = g.resize((g.width * Z, g.height * Z), Image.NEAREST)
    c = Image.new("RGB", (CW, CH), (58, 96, 52)); rx, ry = f["root"]; c.paste(g, (RX - round(rx * ps) * Z, RY - round(ry * ps) * Z), g)
    d = ImageDraw.Draw(c); d.rectangle([0, 0, CW, 16], fill=(0, 0, 0)); d.text((3, 1), f["name"], font=F, fill=(255, 255, 255)); cells.append(c)
for fps in (2, 4, 8): save_gif(cells + [cells[-1]] * 2, f"{OUT}/authored_frames_{fps}fps_x{Z}.gif", fps)
print("gifs + sheets + close-ups written to", OUT, "| ticks", lo, hi, "| side frames", len(side))
