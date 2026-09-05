#!/usr/bin/env python3
"""Measure sprite anatomy anchors for the 8 directional sprites of a character.
   python3 measure_sprites.py <dir_with_direction_pngs> <out.json> [--sheet out.png]
Anchors (canvas px, y down): bbox, bottom (foot) row, top row, content centre x, head (top rows: hair/skin), hands (glove
white or skin clusters at the lowest arm extent), feet (dark boot clusters at the bottom), estimated pelvis/shoulder rows."""
import sys, json, os
from PIL import Image, ImageDraw
import numpy as np
D = sys.argv[1]; OUT = sys.argv[2]; SHEET = sys.argv[sys.argv.index("--sheet") + 1] if "--sheet" in sys.argv else None
DIRS = ["south", "south-east", "east", "north-east", "north", "north-west", "west", "south-west"]
def classify(rgb):
    r, g, b = rgb
    if r > 200 and g > 200 and b > 200: return "white"
    if r < 60 and g < 60 and b < 60: return "black"
    if g > 150 and r < 200 and b < 130 and g > r + 30: return "green"
    if r > 150 and g < 90 and b < 90: return "red"
    # skin: warm, r > g > b, moderate
    if r > 120 and r > g + 15 and g > b and b < 200 and r < 250: return "skin"
    return "other"
res = {}
for d in DIRS:
    p = os.path.join(D, d + ".png")
    if not os.path.exists(p): continue
    im = Image.open(p).convert("RGBA"); a = np.array(im); H, W = a.shape[:2]
    alpha = a[:, :, 3] > 8
    ys, xs = np.where(alpha)
    top, bot, left, right = int(ys.min()), int(ys.max()), int(xs.min()), int(xs.max())
    cls = np.full((H, W), "", dtype=object)
    for y in range(top, bot + 1):
        for x in range(left, right + 1):
            if alpha[y, x]: cls[y, x] = classify(tuple(int(v) for v in a[y, x, :3]))
    def cells(k): return np.argwhere(cls == k)
    white = cells("white"); black = cells("black"); skin = cells("skin")
    # head: topmost skin/hair band — take rows top..top+0.2*h; head centre = mean of skin pixels in the top 30% of the body
    hbody = bot - top + 1
    head_rows = skin[skin[:, 0] < top + 0.32 * hbody] if len(skin) else np.zeros((0, 2))
    head = [float(head_rows[:, 1].mean()), float(head_rows[:, 0].mean())] if len(head_rows) else None
    # hands: white pixels (gloves) below the head zone, or skin pixels in the lower half if no gloves
    hand_px = white[white[:, 0] > top + 0.35 * hbody] if len(white) else np.zeros((0, 2))
    if len(hand_px) < 6:
        hand_px = skin[skin[:, 0] > top + 0.45 * hbody] if len(skin) else np.zeros((0, 2))
    hands = None
    if len(hand_px):
        cx = (left + right) / 2
        L = hand_px[hand_px[:, 1] < cx]; R = hand_px[hand_px[:, 1] >= cx]
        hands = {"screenLeft": [float(L[:, 1].mean()), float(L[:, 0].mean())] if len(L) else None,
                 "screenRight": [float(R[:, 1].mean()), float(R[:, 0].mean())] if len(R) else None}
    # feet: black pixels in the bottom 12% of the body
    feet_px = black[black[:, 0] > bot - 0.12 * hbody] if len(black) else np.zeros((0, 2))
    feet = None
    if len(feet_px):
        cx = (left + right) / 2
        L = feet_px[feet_px[:, 1] < cx]; R = feet_px[feet_px[:, 1] >= cx]
        feet = {"screenLeft": [float(L[:, 1].mean()), float(L[:, 0].max())] if len(L) else None,
                "screenRight": [float(R[:, 1].mean()), float(R[:, 0].max())] if len(R) else None}
    res[d] = {"canvas": [W, H], "bbox": [left, top, right, bot], "height_px": hbody, "width_px": right - left + 1,
              "content_cx": (left + right) / 2, "foot_row": bot, "bottom_from_canvas_centre": bot - H / 2, "top_row": top,
              "head": head, "hands": hands, "feet": feet,
              "pelvis_row_est": top + 0.52 * hbody, "shoulder_row_est": top + 0.27 * hbody, "neck_row_est": top + 0.22 * hbody,
              "counts": {"white": int(len(white)), "black": int(len(black)), "skin": int(len(skin))}}
json.dump(res, open(OUT, "w"), indent=1); print("wrote", OUT)
for d, r in res.items(): print("%-11s bbox %s h %d w %d foot %d (centre%+d) head %s hands %s feet %s" % (d, r["bbox"], r["height_px"], r["width_px"], r["foot_row"], r["bottom_from_canvas_centre"], [round(v) for v in r["head"]] if r["head"] else None, {k: [round(x) for x in v] if v else None for k, v in r["hands"].items()} if r["hands"] else None, {k: [round(x) for x in v] if v else None for k, v in r["feet"].items()} if r["feet"] else None))
if SHEET:
    S = 4; cellw = 128 * S; sheet = Image.new("RGBA", (cellw * 4, 128 * S * 2), (30, 33, 38, 255)); dr = ImageDraw.Draw(sheet)
    for i, d in enumerate(DIRS):
        if d not in res: continue
        im = Image.open(os.path.join(D, d + ".png")).convert("RGBA").resize((128 * S, 128 * S), Image.NEAREST)
        ox, oy = (i % 4) * cellw, (i // 4) * 128 * S; sheet.alpha_composite(im, (ox, oy)); r = res[d]
        def mark(pt, col):
            if pt: dr.ellipse([ox + pt[0] * S - 4, oy + pt[1] * S - 4, ox + pt[0] * S + 4, oy + pt[1] * S + 4], outline=col, width=2)
        if r["head"]: mark(r["head"], "#ffd24a")
        for k in ("screenLeft", "screenRight"):
            if r["hands"]: mark(r["hands"][k], "#7fd0ff")
            if r["feet"]: mark(r["feet"][k], "#ff6060")
        dr.line([ox, oy + r["foot_row"] * S, ox + cellw, oy + r["foot_row"] * S], fill="#ff6060", width=1)
        dr.line([ox, oy + r["pelvis_row_est"] * S, ox + cellw, oy + r["pelvis_row_est"] * S], fill="#c080ff", width=1)
        dr.text((ox + 4, oy + 4), d, fill="#ffffff")
    sheet.save(SHEET); print("sheet", SHEET)
