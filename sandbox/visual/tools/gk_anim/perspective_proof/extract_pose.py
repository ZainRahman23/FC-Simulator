#!/usr/bin/env python3
"""Extract the authored goalkeeper pose from a PixelLab-edited camera plate (Animation V1.2).
  python3 extract_pose.py <input_plate.png> <edited_plate.png> <crop_meta.json> <out_prefix>
The edited plate is compared with the input plate: pixels that changed AND look like the keeper's kit (neon-green jersey,
black shorts/socks/boots, white gloves, skin, dark hair) are kept; the standing keeper's silhouette from the input is
handled by the same rule (its pixels now show grass → rejected). Output: <out_prefix>.png (transparent sprite on the
plate canvas, so the plate's root pixel is the sprite's root), <out_prefix>_anchors.json (root, bbox, gloves, lead glove =
glove nearest the ball target, head, body centre), <out_prefix>_review.png (input | edited | extracted with markers)."""
import sys, json
from PIL import Image, ImageDraw
import numpy as np
src = Image.open(sys.argv[1]).convert("RGB"); out = Image.open(sys.argv[2]).convert("RGB"); meta = json.load(open(sys.argv[3])); pref = sys.argv[4]
if out.size != src.size: out = out.resize(src.size, Image.NEAREST)
a = np.array(src).astype(int); b = np.array(out).astype(int); H, W = a.shape[:2]
diff = np.abs(a - b).sum(axis=2) > 40
r, g, bl = b[:, :, 0], b[:, :, 1], b[:, :, 2]
mx = np.maximum(np.maximum(r, g), bl); mn = np.minimum(np.minimum(r, g), bl); sat = (mx - mn) / np.maximum(1, mx)
# PALETTE CLASSIFICATION: keeper palette = colours of the GK_BASE_V1 SET sprite (all 8 rotations); pitch palette = colours of the
# INPUT plate outside the standing keeper's column. Each output pixel is assigned to the nearer palette (with a margin).
import glob, os
kp = set()
for f in glob.glob(os.path.join(os.path.dirname(os.path.abspath(__file__)) if "__file__" in dir() else ".", "..", "..", "..", "Users") ): pass
SPR = "/Users/zainrahman/Downloads/FC Simulator/assets/visual_v1/originals/character_f4838361/set"
for f in glob.glob(SPR + "/*.png"):
    im = np.array(Image.open(f).convert("RGBA"))
    for c in np.unique(im[im[:, :, 3] > 8][:, :3], axis=0): kp.add(tuple(int(v) for v in c))
kp = np.array(sorted(kp)); 
root = meta["root_in_crop"]; col = np.zeros((H, W), dtype=bool); col[:, max(0, int(root[0]) - 40):int(root[0]) + 40] = True
pp = np.unique(a[~col].reshape(-1, 3), axis=0)
pp = np.vstack([pp, np.array([[255, 140, 60], [82, 201, 240], [255, 255, 0], [255, 80, 220]])])   # plate annotation colours (save arrows, goal line, depth arrow) are never keeper
def nearest(px, pal):
    d = np.sqrt(((px[:, None, :] - pal[None, :, :]) ** 2).sum(axis=2)); return d.min(axis=1)
flat = b.reshape(-1, 3)
dk = nearest(flat, kp).reshape(H, W); dp = nearest(flat, pp).reshape(H, W)
keeper_like = (dk + 6 < dp) | (dk < 14)
jersey = keeper_like & (g > 120) & (g > r + 30) & (g > bl + 30)
jersey_dark = jersey
black = keeper_like & (mx < 70)
white = (mn > 195)
skin = keeper_like & (r > 120) & (r > g + 15) & (g > bl) & (r - bl > 40)
hair = keeper_like & (mx < 60)
# the input plate's standing keeper (kit colours in its column): pixels there may be UNCHANGED where the new pose overlaps the old one
a_flat = a.reshape(-1, 3); dka = nearest(a_flat, kp).reshape(H, W); dpa = nearest(a_flat, pp).reshape(H, W)
old_keeper = col & ((dka + 6 < dpa) | (dka < 14))
changed = diff | old_keeper
kit = keeper_like | white
from scipy import ndimage as ndi
# BODY first: kit colours WITHOUT white (white lines / net / ball must never bridge components); keep components that
# contain jersey pixels. Then attach WHITE blobs (gloves) only if they are small and touch the body.
body_src = changed & (jersey | black | skin | hair)
body_src = ndi.binary_closing(body_src, structure=np.ones((3, 3)), iterations=1) & changed & keeper_like
lab, n = ndi.label(body_src, structure=np.ones((3, 3)))
jers = jersey | jersey_dark
body = np.zeros_like(body_src)
for i in range(1, n + 1):
    comp = lab == i
    if comp.sum() >= 12 and (comp & jers).sum() >= 6: body |= comp
near = ndi.binary_dilation(body, structure=np.ones((3, 3)), iterations=2)
wl, wn = ndi.label(changed & white, structure=np.ones((3, 3)))
gloves_mask = np.zeros_like(body)
yy, xx = np.mgrid[0:H, 0:W]; tgt0 = meta["target_in_crop"]; ball = ((xx - tgt0[0]) ** 2 + (yy - tgt0[1]) ** 2) <= 7 ** 2
# BALL IN THE EDIT. (1) If the input ball still matches at the target (normalised correlation of the 15x15 template) the ball
# is unchanged there → exclude that disc. (2) Otherwise PixelLab redrew/moved it: look for a round white blob (area 40-130,
# roundness ≥ 0.6, aspect ≥ 0.75) with a mostly dark outline within 70 px of the target. Lead glove = glove nearest the ball.
import math
def ncc(p, q):
    p = p - p.mean(); q = q - q.mean(); d = math.sqrt((p * p).sum() * (q * q).sum()); return float((p * q).sum() / d) if d > 0 else 0.0
gray_a = a.mean(axis=2); gray_b = b.mean(axis=2); R = 7; tx, ty = int(round(tgt0[0])), int(round(tgt0[1]))
ball_edit = None; ball_how = None
if ty - R >= 0 and tx - R >= 0 and ty + R + 1 <= H and tx + R + 1 <= W:
    same = ncc(gray_a[ty - R:ty + R + 1, tx - R:tx + R + 1], gray_b[ty - R:ty + R + 1, tx - R:tx + R + 1])
    if same >= 0.5: ball_edit = [float(tgt0[0]), float(tgt0[1]), 0, 6.0]; ball_how = "unchanged at target (ncc %.2f)" % same
if ball_edit is None:
    # DISC SEARCH (moved football): a filled round region (white + dark pentagons + grey shading) with a dark outline ring, dark
    # pentagons in its interior, and no jersey pixels around it (a glove hangs off a sleeve; the ball does not)
    darkpx = mx < 70; greypx = (sat < 0.25) & (mx >= 70) & (mn <= 195); jerseypx = (g > 180) & (g > r + 40) & (g > bl + 120)
    ballish = white | darkpx | greypx; bestsc = 0
    cand = ndi.binary_dilation(changed & white, structure=np.ones((3, 3)), iterations=3)
    for cy_ in range(8, H - 8, 2):
        for cx_ in range(8, W - 8, 2):
            if not cand[cy_, cx_]: continue
            for rr_ in (6.5, 7.5, 8.5):
                d2 = (xx - cx_) ** 2 + (yy - cy_) ** 2; inside = d2 <= (rr_ - 1) ** 2; core = d2 <= (rr_ - 3) ** 2; ring = (d2 > rr_ ** 2) & (d2 <= (rr_ + 1.5) ** 2); outer = (d2 > (rr_ + 1) ** 2) & (d2 <= (rr_ + 3.5) ** 2)
                fill = float(ballish[inside].mean()); wf = float(white[inside].mean()); idark = float(darkpx[core].mean()); rdark = float(darkpx[ring].mean()); jr = float(jerseypx[outer].mean())
                if fill >= 0.9 and 0.3 <= wf <= 0.8 and idark >= 0.08 and rdark >= 0.45 and jr <= 0.08:
                    sc = fill + rdark + idark
                    if sc > bestsc: bestsc = sc; ball_edit = [float(cx_), float(cy_), 0, float(rr_)]; ball_how = "moved ball found by disc search (r %.1f, fill %.2f, ring %.2f, pentagons %.2f)" % (rr_, fill, rdark, idark); ball_full = d2 <= rr_ ** 2
if ball_edit is None and ty - R >= 0 and tx - R >= 0:
    # global template match of the input ball (its pattern survives a PixelLab move); 5-px stride, then refine
    tpl = gray_a[ty - R:ty + R + 1, tx - R:tx + R + 1]; tpl0 = tpl - tpl.mean(); tn = math.sqrt((tpl0 * tpl0).sum())
    bestc, bestp = 0.0, None
    for cy_ in range(R, H - R):
        for cx_ in range(R, W - R):
            win = gray_b[cy_ - R:cy_ + R + 1, cx_ - R:cx_ + R + 1]; w0 = win - win.mean(); d = math.sqrt((w0 * w0).sum()) * tn
            c = float((w0 * tpl0).sum() / d) if d > 0 else 0.0
            if c > bestc: bestc, bestp = c, (cx_, cy_)
    if bestp is not None and bestc >= 0.6 and math.hypot(bestp[0] - tgt0[0], bestp[1] - tgt0[1]) > 6:
        ball_edit = [float(bestp[0]), float(bestp[1]), 0, 6.5]; ball_how = "moved ball found by template match (ncc %.2f)" % bestc
        ball_full = ((xx - bestp[0]) ** 2 + (yy - bestp[1]) ** 2) <= 6.5 ** 2
if ball_edit is None:
    # FOOTBALL DISC: a white blob whose enclosing circle is filled by white + dark (pentagons/outline) pixels — a glove's circle
    # contains sleeve green, so it fails the fill test
    darkpx = mx < 70; wl3, wn3 = ndi.label(white, structure=np.ones((3, 3))); bestf = 0
    for i in range(1, wn3 + 1):
        comp = wl3 == i; sz = int(comp.sum())
        if sz < 30 or sz > 200: continue
        yy3, xx3 = np.where(comp); w3 = xx3.max() - xx3.min() + 1; h3 = yy3.max() - yy3.min() + 1
        if max(w3, h3) < 9 or max(w3, h3) > 18 or min(w3, h3) / max(w3, h3) < 0.7: continue
        cxm, cym = (xx3.max() + xx3.min()) / 2.0, (yy3.max() + yy3.min()) / 2.0; rr = max(w3, h3) / 2.0
        greypx = (sat < 0.25) & (mx >= 70)
        inside = ((xx - cxm) ** 2 + (yy - cym) ** 2) <= rr * rr; fill = float((white[inside] | darkpx[inside] | greypx[inside]).mean()); wf = float(white[inside].mean())
        jerseypx = (g > 180) & (g > r + 40) & (g > bl + 120); d2c = (xx - cxm) ** 2 + (yy - cym) ** 2
        inner = d2c <= max(1.0, rr - 2) ** 2; ring = (d2c > (rr + 1) ** 2) & (d2c <= (rr + 3) ** 2)
        idark = float(darkpx[inner].mean()) if inner.any() else 0; jring = float(jerseypx[ring].mean()) if ring.any() else 0
        score = fill + idark - 2 * jring
        if fill >= 0.72 and 0.35 <= wf <= 0.9 and idark >= 0.06 and jring <= 0.12 and score > bestf: bestf = score; ball_edit = [float(cxm), float(cym), sz, float(rr)]; ball_how = "football disc found (fill %.2f, white %.2f, pentagons %.2f)" % (fill, wf, idark); ball_full = inside & (white | darkpx)
if ball_edit is None:
    white_er = ndi.binary_erosion(white, structure=np.ones((3, 3)), iterations=2)        # detach the glove (thin) from a redrawn ball disc
    wl2, wn2 = ndi.label(white_er, structure=np.ones((3, 3))); best = 0
    for i in range(1, wn2 + 1):
        comp = wl2 == i; sz = int(comp.sum())
        if sz < 20 or sz > 260: continue
        yy2, xx2 = np.where(comp); cxm, cym = xx2.mean(), yy2.mean(); w2 = xx2.max() - xx2.min() + 1; h2 = yy2.max() - yy2.min() + 1
        if math.hypot(cxm - tgt0[0], cym - tgt0[1]) > 70: continue
        rr = max(w2, h2) / 2.0; roundness = sz / (math.pi * rr * rr); aspect = min(w2, h2) / max(w2, h2)
        full = ndi.binary_dilation(comp, structure=np.ones((3, 3)), iterations=2) & white      # the un-eroded disc
        ring = ndi.binary_dilation(full, structure=np.ones((3, 3)), iterations=2) & ~full; dark = float((mx[ring] < 110).mean()) if ring.any() else 0
        score = roundness * aspect * dark
        if rr <= 9.5 and roundness >= 0.6 and aspect >= 0.75 and dark >= 0.5 and score > best: best = score; ball_full = full; ball_edit = [float(cxm), float(cym), sz, float(rr) + 2.0]; ball_how = "redrawn disc (round %.2f dark ring %.2f)" % (roundness, dark)
moved = ball_edit is not None and not ball_how.startswith("unchanged")
if moved: ball = ndi.binary_dilation(ball_full, structure=np.ones((3, 3)), iterations=2)          # the redrawn disc + its dark outline
elif ball_edit is not None: ball = ((xx - ball_edit[0]) ** 2 + (yy - ball_edit[1]) ** 2) <= (ball_edit[3] + 2.0) ** 2
near_arm = ndi.binary_dilation(body, structure=np.ones((3, 3)), iterations=5)
glove_over_ball = white & ball & near_arm & changed            # a glove drawn over a moved ball stays (it touches the sleeve)
ball_excl = ball if moved else (ball & ~white)                # a moved/redrawn ball is removed whole (a glove overlapping it is lost there; its outer part stays)
for i in range(1, wn + 1):
    comp = wl == i; sz = comp.sum()
    if 3 <= sz <= 140 and (comp & near).any() and not (moved and (comp & ball).sum() > 0.5 * sz): gloves_mask |= comp
keep = (body | gloves_mask) & ~ball_excl
lk, nk = ndi.label(keep, structure=np.ones((3, 3)))
if nk > 1:
    sizes = ndi.sum(keep, lk, range(1, nk + 1)); main = lk == (int(np.argmax(sizes)) + 1)
    near_main = ndi.binary_dilation(main, structure=np.ones((3, 3)), iterations=12)      # a glove cut off by ball removal stays; far line remnants go
    keep = np.zeros_like(keep)
    for i in range(1, nk + 1):
        comp = lk == i; ys5, xs5 = np.where(comp); cw, ch = xs5.max() - xs5.min() + 1, ys5.max() - ys5.min() + 1; szc = int(comp.sum())
        linelike = ch <= 4 and cw >= 20                                   # re-rendered pitch-line remnants
        if linelike: continue
        if szc >= 40 or (comp & near_main).any(): keep |= comp             # a glove severed by ball removal stays; tiny far specks go
mask = keep
import os
if os.environ.get("DBG_BOX"):
    bx0, by0, bx1, by1 = [int(v) for v in os.environ["DBG_BOX"].split(",")]; sl = (slice(by0, by1), slice(bx0, bx1))
    print("DBG box", (bx0, by0, bx1, by1), "changed", int(changed[sl].sum()), "keeper_like", int(keeper_like[sl].sum()), "white", int(white[sl].sum()), "body", int(body[sl].sum()), "gloves_mask", int(gloves_mask[sl].sum()), "ball", int(ball[sl].sum()), "ball_excl", int(ball_excl[sl].sum()), "keep_pre", int(((body | gloves_mask) & ~ball_excl)[sl].sum()), "final", int(mask[sl].sum()))
    wlx, wnx = ndi.label(changed & white, structure=np.ones((3, 3)))
    for i in range(1, wnx + 1):
        yy4, xx4 = np.where(wlx == i)
        if xx4.mean() >= bx0 and xx4.mean() < bx1 and yy4.mean() >= by0 and yy4.mean() < by1: print("   white blob", (round(xx4.mean()), round(yy4.mean())), "size", len(yy4), "touches near", bool(((wlx == i) & near).any()), "in ball", int(((wlx == i) & ball).sum()))
rgba = np.zeros((H, W, 4), dtype=np.uint8); rgba[:, :, :3] = b; rgba[:, :, 3] = np.where(mask, 255, 0)
Image.fromarray(rgba, "RGBA").save(pref + ".png")
ys, xs = np.where(mask)
root = meta["root_in_crop"]; tgt = meta["target_in_crop"]
an = {"root": root, "target": tgt, "bbox": [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())] if len(xs) else None, "pixels": int(mask.sum())}
# gloves: white blobs inside the mask; lead glove = nearest to the ball target
wm = mask & white; labw, nw = ndi.label(wm); gl = []
for i in range(1, nw + 1):
    yy, xx = np.where(labw == i)
    if len(yy) >= 4: gl.append([float(xx.mean()), float(yy.mean()), int(len(yy))])
gl.sort(key=lambda q: -q[2]); an["gloves"] = gl[:4]
an["ball_edit"] = ball_edit[:2] if ball_edit is not None else None; an["ball_how"] = ball_how; an["ball_moved_px"] = round(math.hypot(ball_edit[0] - tgt[0], ball_edit[1] - tgt[1]), 1) if ball_edit is not None else None
ref = ball_edit[:2] if ball_edit is not None else tgt
an["lead_glove"] = min(gl, key=lambda q: (q[0] - ref[0]) ** 2 + (q[1] - ref[1]) ** 2) if gl else None
an["glove_area_max"] = gl[0][2] if gl else None; an["scale_est_from_gloves"] = round((gl[0][2] / 53.0) ** 0.5, 2) if gl else None   # SET sprite largest glove ≈ 53 px
sm = mask & skin; labs, ns = ndi.label(sm); heads = []
for i in range(1, ns + 1):
    yy, xx = np.where(labs == i)
    if len(yy) >= 6: heads.append([float(xx.mean()), float(yy.mean()), int(len(yy))])
an["head"] = max(heads, key=lambda q: q[2])[:2] if heads else None
an["body_centre"] = [float(xs.mean()), float(ys.mean())] if len(xs) else None
an["pelvis"] = an["body_centre"]; an["shoulder"] = an["head"]
json.dump(an, open(pref + "_anchors.json", "w"), indent=1)
# review strip: input | edited | extracted (on dark) with markers, 2x
Z = 2; pad = 4; rw = W * Z
strip = Image.new("RGB", (3 * rw + 4 * pad, H * Z + 2 * pad + 16), (24, 26, 30)); dr = ImageDraw.Draw(strip)
strip.paste(src.resize((rw, H * Z), Image.NEAREST), (pad, pad + 16)); strip.paste(out.resize((rw, H * Z), Image.NEAREST), (rw + 2 * pad, pad + 16))
ex = Image.new("RGB", (W, H), (40, 44, 50)); ex.paste(Image.fromarray(rgba, "RGBA"), (0, 0), Image.fromarray(rgba, "RGBA")); strip.paste(ex.resize((rw, H * Z), Image.NEAREST), (2 * rw + 3 * pad, pad + 16))
ox = 2 * rw + 3 * pad; oy = pad + 16
def mark(pt, col, rad=4):
    if pt: dr.ellipse([ox + pt[0] * Z - rad, oy + pt[1] * Z - rad, ox + pt[0] * Z + rad, oy + pt[1] * Z + rad], outline=col, width=2)
mark(root, (255, 60, 60), 5); mark(tgt, (255, 255, 255), 6); mark(an["ball_edit"], (255, 140, 40), 8); [mark(q, (127, 208, 255)) for q in an["gloves"]]; mark(an["lead_glove"], (56, 255, 154), 7); mark(an["head"], (255, 210, 74))
dr.text((pad, 2), "input plate", fill=(220, 220, 220)); dr.text((rw + 2 * pad, 2), "PixelLab edit", fill=(220, 220, 220)); dr.text((2 * rw + 3 * pad, 2), "extracted (red root, white ball target, green lead glove)", fill=(220, 220, 220))
strip.save(pref + "_review.png"); print("extracted", an["pixels"], "px, bbox", an["bbox"], "gloves", len(gl), "lead", an["lead_glove"] and [round(v) for v in an["lead_glove"][:2]], "head", an["head"] and [round(v) for v in an["head"]])
