"""RECEIVING + PASSING V1 — review media from of_rp_probe.js frame captures.
For each scenario directory of frames (<scen>_tNNN.png, every tick): a contact STRIP (frames around the reception / pass contact),
a NORMAL-SPEED animated WebP (every 2nd tick at 30 fps = real time) and a SLOW-MOTION WebP (every tick at 15 fps = 0.25x).
    python3 of_rp_media.py <frames dir> <probe.json> <out dir> <scen> [crop x0,y0,x1,y1] [scale]
"""
import sys, json, glob, os
from PIL import Image

def main():
    src, probe, out, scen = sys.argv[1:5]
    crop = [int(v) for v in sys.argv[5].split(",")] if len(sys.argv) > 5 else None
    scale = float(sys.argv[6]) if len(sys.argv) > 6 else 0.5
    mode = sys.argv[7] if len(sys.argv) > 7 else "all"                     # normal | slow | all
    os.makedirs(out, exist_ok=True)
    files = sorted(glob.glob(os.path.join(src, scen + "_t*.png")) + glob.glob(os.path.join(src, scen + "_t*.jpg")))
    if not files: print("no frames", scen); return
    tick = lambda f: int(f.rsplit("_t", 1)[1][:3])
    def load(f):
        im = Image.open(f).convert("RGB")
        if crop: im = im.crop(crop)
        return im.resize((int(im.width * scale), int(im.height * scale)), Image.LANCZOS)
    res = json.load(open(probe))["results"][scen]
    contacts = [r["tick"] for r in res["recv"]] + [r["tick"] for r in res["pass"]]
    frames = {tick(f): f for f in files}
    ks = sorted(frames)
    # normal speed: every 2nd tick at 30 fps; slow motion around the first contact: every tick at 15 fps
    norm = [load(frames[k]) for k in ks if k % 2 == 0] if mode != "slow" else []
    if norm: norm[0].save(os.path.join(out, scen + "_normal.webp"), save_all=True, append_images=norm[1:], duration=33, loop=0, quality=62, method=4)
    for i, c in enumerate(sorted(set(contacts)) if mode != "normal" else []):
        win = [k for k in ks if c - 24 <= k <= c + 20]
        if not win: continue
        slow = [load(frames[k]) for k in win]
        slow[0].save(os.path.join(out, f"{scen}_slow{i}.webp"), save_all=True, append_images=slow[1:], duration=67, loop=0, quality=66, method=4)
        pick = [k for k in win if (k - c) % 4 == 0][:8]
        ims = [load(frames[k]) for k in pick]
        w, h = ims[0].size
        S = Image.new("RGB", (w * len(ims), h), (0, 0, 0))
        for j, im in enumerate(ims): S.paste(im, (j * w, 0))
        S.save(os.path.join(out, f"{scen}_strip{i}.jpg"), quality=84)
    print(scen, "frames", len(files), "contacts", contacts)

main()
