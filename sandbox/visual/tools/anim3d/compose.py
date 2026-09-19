#!/usr/bin/env python3
"""Compose capture PNGs into review sheets / GIFs.
  python3 compose.py sheet <out.png> <label:dir/prefix> ... --ticks 0,30,...   (side-by-side rows per label, columns per tick)
  python3 compose.py gif <out.gif> <dir/prefix> --fps 24 [--scale 2]           (animated GIF from a tick series)
"""
import sys, os, glob, re
from PIL import Image, ImageDraw, ImageFont
def font(sz=13):
    try: return ImageFont.truetype("/System/Library/Fonts/Menlo.ttc", sz)
    except Exception: return ImageFont.load_default()
def frames(prefix):
    fs = sorted(glob.glob(prefix + "_t*.png")); return [(int(re.search(r"_t(\d+)\.png$", f).group(1)), f) for f in fs]
def opt(k, d=None):
    return sys.argv[sys.argv.index(k) + 1] if k in sys.argv else d
if sys.argv[1] == "sheet":
    out = sys.argv[2]; rows = [x for x in sys.argv[3:] if ":" in x and not x.startswith("--")]; ticks = [int(t) for t in opt("--ticks", "").split(",") if t]
    scale = int(opt("--scale", "1")); title = opt("--title", "")
    data = []
    for r in rows:
        label, prefix = r.split(":", 1); fr = dict(frames(prefix)); imgs = [(t, Image.open(fr[t]).convert("RGBA")) for t in ticks if t in fr]; data.append((label, imgs))
    w, h = data[0][1][0][1].size; W = 140 + len(ticks) * (w * scale + 6); H = 40 + len(data) * (h * scale + 26)
    im = Image.new("RGB", (W, H), (18, 21, 26)); d = ImageDraw.Draw(im); F = font(); d.text((8, 8), title, font=font(15), fill=(255, 220, 120))
    for ri, (label, imgs) in enumerate(data):
        y = 40 + ri * (h * scale + 26); d.text((8, y + h * scale // 2), label, font=F, fill=(255, 255, 255))
        for ci, (t, img) in enumerate(imgs):
            x = 140 + ci * (w * scale + 6); im.paste(img.resize((w * scale, h * scale), Image.NEAREST), (x, y)); d.text((x, y + h * scale + 2), "tick %d" % t, font=F, fill=(180, 180, 180))
    im.save(out); print(out, im.size)
elif sys.argv[1] == "gif":
    out = sys.argv[2]; prefix = sys.argv[3]; fps = float(opt("--fps", "24")); scale = int(opt("--scale", "1")); label = opt("--label", "")
    imgs = []
    for t, f in frames(prefix):
        im = Image.open(f).convert("RGB")
        if scale != 1: im = im.resize((im.width * scale, im.height * scale), Image.NEAREST)
        if label: ImageDraw.Draw(im).text((4, 4), "%s  tick %d  t=%.3f s" % (label, t, t / 60), font=font(12), fill=(255, 255, 255))
        imgs.append(im)
    imgs[0].save(out, save_all=True, append_images=imgs[1:], duration=int(1000 / fps), loop=0, optimize=False); print(out, len(imgs), "frames")
