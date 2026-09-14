#!/usr/bin/env python3
"""Recover the native pixel grid of an UPSCALED pixel-art render (a generator export with ~N px blocks, a noisy opaque background and no
alpha) WITHOUT redrawing: fit the block pitch and phase that minimise within-block colour variance, take each block's central colour
(median of the inner half of the block, so edge bleed and noise are excluded), key the background by colour distance, and record how
faithfully the result reproduces the upload when re-expanded on the same grid. Nothing else is touched: no outline, palette, limb or
transparency edit beyond the background key. Every parameter is written next to the output so the step is reproducible and reviewable.
  python3 extract_native_grid.py <upload.png> <out_dir> [--bg-tol 10] [--pitch-lo 5.5] [--pitch-hi 8.0]
"""
import sys, os, json, argparse, collections
import numpy as np
from PIL import Image

ap = argparse.ArgumentParser(); ap.add_argument("src"); ap.add_argument("out"); ap.add_argument("--bg-tol", type=float, default=10); ap.add_argument("--pitch-lo", type=float, default=5.5); ap.add_argument("--pitch-hi", type=float, default=8.0)
ap.add_argument("--name", default="VERTICAL_HIGH_RAW")
a = ap.parse_args(); os.makedirs(a.out, exist_ok=True)
im = Image.open(a.src).convert("RGB"); A = np.asarray(im).astype(float); H, W, _ = A.shape
# background = the dominant colour of the border band
border = np.concatenate([A[:8].reshape(-1, 3), A[-8:].reshape(-1, 3), A[:, :8].reshape(-1, 3), A[:, -8:].reshape(-1, 3)])
bg = np.median(border, axis=0); dist = np.abs(A - bg).max(axis=2); fg = dist > a.bg_tol
ys, xs = np.where(fg); x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
print("upload", im.size, "background", bg.round(1).tolist(), "foreground bbox", (int(x0), int(y0), int(x1), int(y1)))


def fit_axis(axis):
    """pitch + phase minimising the mean within-block variance of the grey level along one axis (blocks sampled over the foreground)"""
    g = A.mean(axis=2)
    if axis == 0: prof = g[y0:y1 + 1, x0:x1 + 1].mean(axis=0); off = x0        # columns
    else: prof = g[y0:y1 + 1, x0:x1 + 1].mean(axis=1); off = y0                 # rows
    n = len(prof); best = None
    for pitch in np.arange(a.pitch_lo, a.pitch_hi + 1e-9, 0.01):
        for ph in np.arange(0, pitch, 0.25):
            edges = np.arange(-ph, n + pitch, pitch); tot = 0.0; cnt = 0
            for e0, e1 in zip(edges, edges[1:]):
                i0, i1 = int(np.ceil(e0)), int(np.floor(e1))
                if i1 - i0 >= 2 and i0 >= 0 and i1 <= n:
                    seg = prof[i0:i1]; tot += seg.var() * len(seg); cnt += len(seg)
            v = tot / max(1, cnt)
            if best is None or v < best[0]: best = (v, float(pitch), float(ph))
    return best, off


(vx, px_, phx), offx = fit_axis(0); (vy, py_, phy), offy = fit_axis(1)
print("pitch x %.2f phase %.2f (var %.1f) | pitch y %.2f phase %.2f (var %.1f)" % (px_, phx, vx, py_, phy, vy))
# block grid over the whole image, anchored on the foreground bbox phase
def edges(pitch, ph, off, n_img):
    e = [off - ph]
    while e[0] - pitch > -pitch: e.insert(0, e[0] - pitch)
    while e[-1] < n_img + pitch: e.append(e[-1] + pitch)
    return [v for v in e if -pitch < v < n_img + pitch]
ex = edges(px_, phx, offx, W); ey = edges(py_, phy, offy, H)
cols = [(ex[i], ex[i + 1]) for i in range(len(ex) - 1)]; rows = [(ey[i], ey[i + 1]) for i in range(len(ey) - 1)]
out = np.zeros((len(rows), len(cols), 4), dtype=np.uint8); recon = np.zeros_like(A)
nfg = 0
for r, (ya, yb) in enumerate(rows):
    for c, (xa, xb) in enumerate(cols):
        i0, i1 = max(0, int(np.ceil(ya))), min(H, int(np.floor(yb))); j0, j1 = max(0, int(np.ceil(xa))), min(W, int(np.floor(xb)))
        if i1 - i0 < 1 or j1 - j0 < 1: continue
        # inner half of the block (centre sample, robust to edge bleed)
        ci0, ci1 = i0 + (i1 - i0) // 4, i1 - (i1 - i0) // 4; cj0, cj1 = j0 + (j1 - j0) // 4, j1 - (j1 - j0) // 4
        if ci1 <= ci0: ci0, ci1 = i0, i1
        if cj1 <= cj0: cj0, cj1 = j0, j1
        blk = A[ci0:ci1, cj0:cj1].reshape(-1, 3); col = np.median(blk, axis=0)
        isbg = np.abs(col - bg).max() <= a.bg_tol
        out[r, c] = (*col.round().astype(int), 0 if isbg else 255)
        fi0, fi1 = max(0, int(round(ya))), min(H, int(round(yb))); fj0, fj1 = max(0, int(round(xa))), min(W, int(round(xb)))      # whole block for the check image
        recon[fi0:fi1, fj0:fj1] = col if not isbg else bg
        if not isbg: nfg += 1
# reproduction score inside the foreground bbox (how much of the upload the extracted grid explains)
sub = A[y0:y1 + 1, x0:x1 + 1]; rsub = recon[y0:y1 + 1, x0:x1 + 1]; err = np.abs(sub - rsub).max(axis=2)
score = {"within_8": float((err <= 8).mean()), "within_16": float((err <= 16).mean()), "within_32": float((err <= 32).mean()), "mean_abs_err": float(err.mean())}
# crop the native sprite to content + 4 px pad
al = out[:, :, 3] > 0; ry, rx = np.where(al); r0, r1, c0, c1 = ry.min(), ry.max(), rx.min(), rx.max()
pad = 4; crop = np.zeros((r1 - r0 + 1 + 2 * pad, c1 - c0 + 1 + 2 * pad, 4), dtype=np.uint8); crop[pad:pad + r1 - r0 + 1, pad:pad + c1 - c0 + 1] = out[r0:r1 + 1, c0:c1 + 1]
nat = Image.fromarray(crop, "RGBA"); nat.save(os.path.join(a.out, a.name + ".png"))
nat.resize((nat.width * 4, nat.height * 4), Image.NEAREST).save(os.path.join(a.out, a.name + "_4x.png"))
Image.fromarray(recon.round().astype(np.uint8)).save(os.path.join(a.out, "check_reexpanded.png"))
pal = collections.Counter(tuple(int(v) for v in crop[y, x, :3]) for y in range(crop.shape[0]) for x in range(crop.shape[1]) if crop[y, x, 3])
rec = {"source": os.path.abspath(a.src), "upload_size": [W, H], "background": [round(float(v), 1) for v in bg], "bg_tolerance": a.bg_tol, "foreground_bbox": [int(x0), int(y0), int(x1), int(y1)],
       "pitch": {"x": px_, "y": py_}, "phase": {"x": phx, "y": phy}, "grid_cells": [len(cols), len(rows)], "native_content": [int(c1 - c0 + 1), int(r1 - r0 + 1)], "native_canvas": [nat.width, nat.height], "pad": pad,
       "foreground_blocks": int(nfg), "distinct_colours": len(pal), "top_colours": [[list(k), v] for k, v in pal.most_common(16)], "reproduction_of_upload": score,
       "method": "block pitch/phase by minimum within-block variance; block colour = median of the inner half of each block; background keyed by max-channel distance <= bg_tolerance; no other edit"}
json.dump(rec, open(os.path.join(a.out, "extraction.json"), "w"), indent=1)
print("native content", rec["native_content"], "canvas", rec["native_canvas"], "blocks", nfg, "colours", len(pal), "reproduction", {k: round(v, 3) for k, v in score.items()})
