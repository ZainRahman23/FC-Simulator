"""DEFENDING V1 — review media from of_rp_probe.js frame captures (every tick of a scenario).
    python3 of_def_media.py <frames dir> <probe.json> <out dir> <scen> [--crop x0,y0,x1,y1] [--scale 0.5] [--from N --to M] [--extra name:t0,t1,...]
Writes <scen>_strip.jpg (6 frames around the tackle contact — or evenly over the clip when there is none), <scen>_normal.webp (real time:
every 2nd tick at 30 fps) and <scen>_slow.webp (every tick at 15 fps = 0.25x). --extra writes an additional strip of the given ticks."""
import sys, json, glob, os
from PIL import Image, ImageDraw

a = sys.argv
src, probe, out, scen = a[1:5]
opt = lambda k, d=None: a[a.index(k) + 1] if k in a else d
crop = [int(v) for v in opt("--crop").split(",")] if opt("--crop") else None
scale = float(opt("--scale", "0.5"))
os.makedirs(out, exist_ok=True)
files = sorted(glob.glob(os.path.join(src, scen + "_t*.jpg")) + glob.glob(os.path.join(src, scen + "_t*.png")))
tick = lambda f: int(f.rsplit("_t", 1)[1].split(".")[0])
fr = {tick(f): f for f in files}
t0, t1 = int(opt("--from", min(fr))), int(opt("--to", max(fr)))
ks = [k for k in sorted(fr) if t0 <= k <= t1]
def load(k, label=True):
    im = Image.open(fr[k]).convert("RGB")
    if crop: im = im.crop(crop)
    im = im.resize((int(im.width * scale), int(im.height * scale)), Image.LANCZOS)
    if label: ImageDraw.Draw(im).text((8, 6), f"tick {k}", fill=(255, 230, 110))
    return im
R = json.load(open(probe))["results"][scen]
ev = R["events"]; tk = next((e for e in ev if e["kind"] == "TACKLE" and e.get("contactTick")), None)
st = next((e for e in ev if e["kind"] == "TACKLE_START"), None)
def strip(ticks, name):
    ticks = [min(ks, key=lambda k: abs(k - t)) for t in ticks]
    ims = [load(k) for k in ticks]; W = sum(i.width for i in ims) + 6 * (len(ims) - 1); H = ims[0].height
    S = Image.new("RGB", (W, H), (14, 17, 22)); x = 0
    for i in ims: S.paste(i, (x, 0)); x += i.width + 6
    S.save(os.path.join(out, name), quality=86); print("wrote", name, ticks)
if tk:
    c = tk["contactTick"]; s = st["tick"] if st else c - 12
    strip([s, s + (c - s) // 2, c - 3, c, c + 6, c + 18], scen + "_strip.jpg")
elif st:
    s = st["tick"]; strip([s, s + 6, s + 12, s + 20, s + 32, s + 50], scen + "_strip.jpg")
else:
    n = len(ks); strip([ks[int(i * (n - 1) / 5)] for i in range(6)], scen + "_strip.jpg")
for ex in [x for i, x in enumerate(a) if i > 0 and a[i - 1] == "--extra"]:
    nm, tl = ex.split(":"); strip([int(v) for v in tl.split(",")], nm)
norm = [load(k, False) for k in ks[::2]]
norm[0].save(os.path.join(out, scen + "_normal.webp"), save_all=True, append_images=norm[1:], duration=33, loop=0, quality=70); print("wrote", scen + "_normal.webp", len(norm))
if opt("--slow", "on") != "off":
    lo = [load(k, False) for k in ks]
    lo[0].save(os.path.join(out, scen + "_slow.webp"), save_all=True, append_images=lo[1:], duration=67, loop=0, quality=70); print("wrote", scen + "_slow.webp", len(lo))
