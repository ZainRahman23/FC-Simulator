
import json
from PIL import Image, ImageDraw, ImageFont
S = "/private/tmp/claude-501/-Users-zainrahman/8e9ca3e0-10ae-4213-9c09-3ee98f6500ac/scratchpad"; OUT = "review_artifacts/3d_animation_architecture/visual_review"
r = json.load(open(S + "/trace_v2.json"))["rows"]
F = ImageFont.truetype("/System/Library/Fonts/Menlo.ttc", 13); FB = ImageFont.truetype("/System/Library/Fonts/Menlo.ttc", 15); FS = ImageFont.truetype("/System/Library/Fonts/Menlo.ttc", 10)
SURF, INK, INK2, MUTED, GRID, BASE = (26, 26, 25), (255, 255, 255), (195, 194, 183), (137, 135, 129), (44, 44, 42), (56, 56, 53)
S1, S2 = (57, 135, 229), (217, 89, 38)
kmax = r[-1]["k"]; stages = []; last = None
for x in r:
    if x["phase"] != last: stages.append([x["k"], x["phase"]]); last = x["phase"]
def panel(im, d, y0, h, title, series, ymin, ymax, fmt, legend=None):
    x0, x1, y1 = 90, im.width - 40, y0 + h
    d.text((x0, y0 - 24), title, font=FB, fill=INK)
    for gy in range(5):
        v = ymin + (ymax - ymin) * gy / 4; yy = y1 - (v - ymin) / (ymax - ymin) * h
        d.line([x0, yy, x1, yy], fill=GRID, width=1); d.text((x0 - 8 - d.textlength(fmt % v, font=F), yy - 8), fmt % v, font=F, fill=MUTED)
    d.line([x0, y1, x1, y1], fill=BASE, width=1)
    for kt in range(0, kmax + 1, 20): xx = x0 + kt / kmax * (x1 - x0); d.text((xx - 10, y1 + 6), str(kt), font=F, fill=MUTED)
    for i, (k, name) in enumerate(stages):
        xx = x0 + k / kmax * (x1 - x0); d.line([xx, y0, xx, y1], fill=(70, 70, 66), width=1); d.text((xx + 3, y0 + 2 + (i % 3) * 12), name, font=FS, fill=INK2)
    for (pts, col) in series:
        P = [(x0 + k / kmax * (x1 - x0), y1 - (max(ymin, min(ymax, v)) - ymin) / (ymax - ymin) * h) for k, v in pts if v is not None]
        if len(P) > 1: d.line(P, fill=col, width=2)
    if legend:
        lx = x1 - 310
        for i, (name, col) in enumerate(legend): d.rectangle([lx, y0 + 40 + i * 16, lx + 10, y0 + 48 + i * 16], fill=col); d.text((lx + 16, y0 + 36 + i * 16), name, font=F, fill=INK2)
    d.text((x0, y1 + 22), "tick (60 Hz)", font=F, fill=MUTED)
W, H = 1400, 1180; im = Image.new("RGB", (W, H), SURF); d = ImageDraw.Draw(im)
d.text((90, 10), "Scenario 42 — complete lifecycle, SKELETAL_3D backend (v2). Vertical lines = graph stages.", font=FB, fill=(255, 220, 120))
simY0 = r[0]["simY"]
panel(im, d, 60, 220, "Root lateral position along the goal line (m, relative to SET; negative = toward the save side): simulation root vs presentation root (pelvis ground projection)",
      [([(x["k"], x["simY"] - simY0) for x in r], S1), ([(x["k"], x["presY"] - simY0) for x in r], S2)], -1.3, 0.2, "%.1f", [("simulation root (authoritative)", S1), ("presentation root", S2)])
panel(im, d, 340, 180, "|presentation root − simulation root| (m) — continuous, reconciled to 0 during GET-UP / RISE", [([(x["k"], x["presDm"]) for x in r], S2)], 0, 0.8, "%.1f")
panel(im, d, 580, 200, "Pelvis height (m): crouch before commit, launch, ballistic follow-through, touchdown, absorb, settle, get-up, rise", [([(x["k"], x["pelvisH"]) for x in r], S1)], 0.3, 1.6, "%.1f")
panel(im, d, 840, 200, "Foot / ground contact: ankle height above rest (m); bars = foot planted (locked by leg IK, no sliding)",
      [([(x["k"], x["footR"][1] - 0.114) for x in r], S1), ([(x["k"], x["footL"][1] - 0.114) for x in r], S2)], -0.05, 0.5, "%.2f", [("save-side (right) foot", S1), ("opposite (left) foot", S2)])
x0, x1 = 90, W - 40
for side, col, yy in (("R", S1, 1060), ("L", S2, 1074)):
    for x in r:
        if x["feet"][side]["locked"]: xx = x0 + x["k"] / kmax * (x1 - x0); d.rectangle([xx, yy, xx + (x1 - x0) / kmax + 1, yy + 10], fill=col)
    d.text((x0 - 80, yy - 1), "planted " + side, font=F, fill=INK2)
d.text((90, 1100), "Nothing here is written to the simulation: blue = the keeper's own root; orange = what the 3D body draws around it. Max |offset| %.2f m; 0.000 m at SET; no discontinuity at any stage boundary." % max(x["presDm"] for x in r), font=F, fill=INK2)
im.save(OUT + "/v2_09_sim_root_vs_presentation_root_plot.png"); print("plot ok")
