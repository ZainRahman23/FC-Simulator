# rotation comparison sheet: 0/5/10/15° CW — gameplay scale in the goal, 2x crop, the rotated sprites with pivot, numbers
#   python3 south_v6_rot_sheet.py <capture_dir> <candidates_dir> <out.png>
import sys, json
from PIL import Image, ImageDraw, ImageFont
CAP, CAND, OUTP = sys.argv[1:4]
F = lambda s: ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", s); Fr = lambda s: ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", s)
rec = json.load(open(f"{CAP}/rot_cases.json")); KEYS = ["ROT00", "ROT05", "ROT10", "ROT15"]
def img(n): return Image.open(f"{CAP}/{n}.png").convert("RGB")
def z(im, k): return im.resize((im.width * k, im.height * k), Image.NEAREST)
PAD = 14; CW = 470; W = PAD + 4 * (CW + PAD)
sv = [rec["handSp"][0] - rec["commitSp"][0], rec["handSp"][1] - rec["commitSp"][1]]
import math; svdeg = math.degrees(math.atan2(sv[1], sv[0]))
hdr = Image.new("RGB", (W, 150), (18, 19, 22)); d = ImageDraw.Draw(hdr)
d.text((PAD, 12), "SOUTH V6 mirrored @ 0.80 — whole-sprite clockwise rotation test in the actual goal (presentation only, nothing integrated)", font=F(26), fill=(255, 255, 255))
d.text((PAD, 52), f"one HIGH GOAL_RIGHT dive (lat +2.0 m, z 1.45 m), paused at its own contact tick {rec['tick']} (t = {rec['now']} s, {rec['contact']['volume']} {rec['contact']['outcome']}) · same root, ball and camera in every column", font=Fr(15), fill=(150, 235, 150))
d.text((PAD, 74), "rigid nearest-neighbour rotation about the jersey/shorts-seam hip pivot · anchors re-measured per rotation · root = rotated lead glove + the same canonical offset (−6.0, +54.5) px ÷ 0.80 · body scale 0.80 throughout", font=Fr(15), fill=(150, 235, 150))
d.text((PAD, 98), f"hand-led placement residual 0 px in all four (raw 1.2–2.3 px) — the columns differ in orientation only · sim contact hand at ({sv[0]:+.1f}, {sv[1]:+.1f}) px from the commit root ({svdeg:+.0f}° from horizontal, y down) · goal line runs down-right at ≈66° in this camera", font=Fr(15), fill=(150, 155, 165))
d.text((PAD, 122), "magenta dashed line = keeper root → committed contact target · SET keeper at the same root and today's diagnostic figure at the bottom for reference", font=Fr(15), fill=(150, 155, 165))
rows = []
# row 1: gameplay scale with the goal (1x)
r1 = Image.new("RGB", (W, 360 + 60), (18, 19, 22)); d = ImageDraw.Draw(r1); x = PAD
for k in KEYS:
    im = img(k + "_wide").crop((0, 0, CW, 360)); r1.paste(im, (x, 30)); pl = rec["keys"][k]
    d.text((x, 6), f"{pl['rotation']:g}° CW  — gameplay scale (1x)", font=F(18), fill=(235, 225, 120)); d.text((x, 396), f"body axis {pl['body_axis_deg']}° · placement raw {pl['rawErrPx']} corr {pl['corrPx']} res {pl['finalErrPx']} px", font=Fr(14), fill=(200, 205, 215)); x += CW + PAD
rows.append(r1)
# row 2: 2x crop
r2 = Image.new("RGB", (W, 360 + 50), (18, 19, 22)); d = ImageDraw.Draw(r2); x = PAD
for k in KEYS:
    im = z(img(k), 2); r2.paste(im, (x + (CW - im.width) // 2, 26)); d.text((x, 4), f"{rec['keys'][k]['rotation']:g}° CW — 2x crop", font=F(16), fill=(235, 225, 120)); x += CW + PAD
rows.append(r2)
# row 3: the rotated sprite itself at 2x with the pivot and lead glove marked
r3 = Image.new("RGB", (W, 240), (18, 19, 22)); d = ImageDraw.Draw(r3); x = PAD
for k in KEYS:
    an = json.load(open(f"{CAND}/{k}_anchors.json")); sp = Image.open(f"{CAND}/{k}.png").convert("RGBA"); up = z(sp, 2)
    bg = Image.new("RGB", (up.width, up.height), (238, 238, 240)); bg.paste(up, (0, 0), up); dd = ImageDraw.Draw(bg)
    px_, py_ = an["pivot_in_canvas"]; dd.ellipse([px_ * 2 - 5, py_ * 2 - 5, px_ * 2 + 5, py_ * 2 + 5], outline=(255, 0, 0), width=2)
    lx, ly = an["lead_glove"][:2]; dd.ellipse([lx * 2 - 5, ly * 2 - 5, lx * 2 + 5, ly * 2 + 5], outline=(0, 160, 255), width=2)
    r3.paste(bg, (x + (CW - bg.width) // 2, 22)); d.text((x, 4), f"{an['rotation_cw_deg']:g}° CW sprite {an['canvas'][0]}x{an['canvas'][1]} — red = hip pivot, blue = lead glove", font=Fr(14), fill=(200, 205, 215)); x += CW + PAD
rows.append(r3)
# row 4: references
r4 = Image.new("RGB", (W, 200), (18, 19, 22)); d = ImageDraw.Draw(r4)
for i, (n, lab) in enumerate((("A_today", "TODAY (live default): diagnostic figure"), ("SET_same_root", "SET keeper at the same root (size reference)"))):
    im = img(n).crop((40, 30, 180, 170)); r4.paste(im, (PAD + i * (CW + PAD), 26)); d.text((PAD + i * (CW + PAD), 4), lab, font=Fr(14), fill=(200, 205, 215))
rows.append(r4)
H = hdr.height + sum(r.height + 6 for r in rows); sheet = Image.new("RGB", (W, H), (18, 19, 22)); sheet.paste(hdr, (0, 0)); y = hdr.height
for r in rows: sheet.paste(r, (0, y)); y += r.height + 6
sheet.save(OUTP); print("sheet", sheet.size)
