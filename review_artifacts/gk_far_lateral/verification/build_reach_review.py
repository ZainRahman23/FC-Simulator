#!/usr/bin/env python3
"""Reachability pass media: representative reachable / marginal / clearly-unreachable cases at normal speed and ¼ speed (close rig + gameplay), key-frame strips."""
import json, os, glob, re, sys
from PIL import Image, ImageDraw, ImageFont
S = "/private/tmp/claude-501/-Users-zainrahman/8e9ca3e0-10ae-4213-9c09-3ee98f6500ac/scratchpad"
R = "/Users/zainrahman/Downloads/FC Simulator/review_artifacts/gk_far_lateral"; M = R + "/media"
F = lambda sz=12: ImageFont.truetype("/System/Library/Fonts/Menlo.ttc", sz)
def frames(d, kind="crop"): fs = sorted(glob.glob(f"{d}/3d_*_{kind}_t*.png")); return [(int(re.search(r"_t(\d+)\.png$", f).group(1)), f) for f in fs]
have = lambda d, k="crop": os.path.isdir(d) and bool(frames(d, k))
def gif(out, fr, fps, label, scale=2, t0=0, t1=10**9):
    ims = []
    for t, f in fr:
        if t < t0 or t > t1: continue
        im = Image.open(f).convert("RGB"); im = im.resize((im.width * scale, im.height * scale), Image.NEAREST); ImageDraw.Draw(im).text((4, 4), "%s  tick %d  t=%.2f s" % (label, t, t / 60), font=F(11), fill=(255, 255, 255)); ims.append(im)
    if ims: ims[0].save(out, save_all=True, append_images=ims[1:], duration=int(1000 / fps), loop=0, optimize=False); return len(ims)
def sheet(out, rows, ticks, title, scale=2, labels=None):
    data = []
    for label, fr in rows:
        fd = dict(fr); imgs = [(t, Image.open(fd[t]).convert("RGB")) for t in ticks if t in fd]
        if imgs: data.append((label, imgs))
    if not data: return None
    w, h = data[0][1][0][1].size; W = 170 + len(ticks) * (w * scale + 6); H = 34 + len(data) * (h * scale + 30)
    im = Image.new("RGB", (W, H), (18, 21, 26)); d = ImageDraw.Draw(im); d.text((8, 8), title, font=F(13), fill=(255, 220, 120))
    for ri, (label, imgs) in enumerate(data):
        y = 34 + ri * (h * scale + 30)
        for li, ln in enumerate(label.split("\n")): d.text((8, y + h * scale // 2 - 14 + 13 * li), ln, font=F(11), fill=(255, 255, 255))
        for ci, (t, img) in enumerate(imgs):
            x = 170 + ci * (w * scale + 6); im.paste(img.resize((w * scale, h * scale), Image.NEAREST), (x, y)); lab = "tick %d" % t + ((" " + labels[t]) if labels and t in labels else ""); d.text((x, y + h * scale + 3), lab[:30], font=F(10), fill=(180, 180, 180))
    im.save(out); return im.size
L = {str(r["idx"]): r for r in json.load(open(S + "/layers_reach1_courtois.json"))}
made = {}
CASES = [(0, "reachable top corner R"), (2, "just outside top corner R (simulation-reachable, fingertip)"), (12, "fast wide R — MARGINAL"), (15, "high wide medium R — MARGINAL"), (4, "clearly over the bar R — CLEARLY UNREACHABLE"), (6, "clearly wide of the post R — CLEARLY UNREACHABLE"), (8, "corner flag: very high + very wide R — CLEARLY UNREACHABLE"), (9, "corner flag L (mirror)"), (13, "fast wide L (mirror) — MARGINAL")]
for i, title in CASES:
    rec = L.get(f"adhoc{i}"); o = made.setdefault(str(i), {"title": title})
    if rec:
        c = next((r for r in rec["rows"] if r.get("committed")), None); k0 = c["k"] if c else 0; ex = c["committed"]["exec"] if c else 0.5; kE = k0 + round(ex * 60)
        ticks = sorted(set([max(0, k0 - 6), k0, k0 + 3, k0 + 6, k0 + 10, k0 + 15, k0 + 21, (k0 + kE) // 2, kE, kE + 8, kE + 20, kE + 40])); labels = {k0: "COMMIT", kE: "exec end"}
        rc = next((r["reach"] for r in rec["rows"] if r.get("reach")), None); o["reach"] = rc
    else: ticks, labels, k0, kE = [20, 40, 60, 80, 100, 120], {}, 20, 80
    d = S + f"/lt_rc{i}_cl"; g = S + f"/lt_rc{i}_gp"
    if have(d): fr = frames(d); gif(f"{M}/rc{i}_close_x1.gif", fr, 60, f"{title[:28]} 1×", 2, 0, 160); gif(f"{M}/rc{i}_close_x4.gif", fr, 15, f"{title[:28]} ¼", 2, max(0, k0 - 10), kE + 45); sheet(f"{M}/rc{i}_strip.png", [(title[:22], fr)], ticks, f"{title} — key frames (close rig, Courtois)", 2, labels); o.update(x1=f"media/rc{i}_close_x1.gif", x4=f"media/rc{i}_close_x4.gif", strip=f"media/rc{i}_strip.png")
    if have(g, "full"): gif(f"{M}/rc{i}_game_x1.gif", frames(g, "full"), 60, f"{title[:28]} gameplay 1×", 1, 0, 199); o["game"] = f"media/rc{i}_game_x1.gif"
    dt = S + f"/lt_rc{i}_TEST_cl"
    if have(dt): sheet(f"{M}/rc{i}_TEST_strip.png", [("shared test rig", frames(dt))], ticks, f"{title} — shared test rig (H 1.83)", 2, labels); o["test"] = f"media/rc{i}_TEST_strip.png"
if have(S + "/lt_rc8_dbg"): rec = L["adhoc8"]; c = next(r for r in rec["rows"] if r.get("committed")); k0 = c["k"]; gif(f"{M}/rc8_dbg_x4.gif", frames(S + "/lt_rc8_dbg"), 15, "corner flag — roots / feet ¼", 2, k0 - 6, k0 + 100); made["8"]["dbg"] = "media/rc8_dbg_x4.gif"
json.dump(made, open(S + "/reach_made.json", "w"), indent=1); print({k: list(v.keys()) for k, v in made.items()})
