# compose the in-camera review sheet for the SOUTH V6 candidate from south_v6_review.js captures
#   python3 south_v6_review_sheet.py <capture_dir> <out_dir> <pixel_scale> <bracket csv>
import sys, json, os
from PIL import Image, ImageDraw, ImageFont
CAP, OUT, PS = sys.argv[1], sys.argv[2], sys.argv[3]; BR = sys.argv[4].split(",")
F = lambda s: ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", s); Fr = lambda s: ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", s)
cases = json.load(open(f"{CAP}/cases.json")); an = json.load(open("review_artifacts/gk_south_v6_calibration/SOUTH_V6_CLEAN_MIRRORED_anchors.json"))
def img(name): return Image.open(f"{CAP}/{name}.png").convert("RGB")
def zoom(im, z): return im.resize((im.width * z, im.height * z), Image.NEAREST)
PAD = 16; W = 1900
rows = []
for c in cases:
    cid = c["id"]; pl = c["placement"]
    wideA = img(f"{cid}_A_live_wide").crop((0, 0, 505, 360)); wideB = img(f"{cid}_B_candidate_IK_wide").crop((0, 0, 505, 360))   # drop the page's side panel
    tA, tB, tC, tD = (zoom(img(f"{cid}_{k}"), 2) for k in ("A_live", "B_candidate_IK", "C_candidate_RAW", "D_SET_same_root"))
    h = wideA.height + 30 + tA.height + 30
    row = Image.new("RGB", (W, h + 70), (18, 19, 22)); d = ImageDraw.Draw(row)
    d.text((PAD, 6), f"{cid} — {c['label']}", font=F(20), fill=(235, 225, 120))
    cls = c["cls"] or {}; sub = f"simulation: {cls.get('family')} {cls.get('hClass')} {cls.get('goalSide')} norm {cls.get('norm')} · committed {c['committed']['tier']} / {c['committed']['action']} · contact {c['contact']['volume'] + ' ' + c['contact']['outcome'] if c['contact'] else 'none (best effort)'} · candidate hand-led placement raw {pl['rawErrPx']} corr {pl['corrPx']} res {pl['finalErrPx']} px{' (CAPPED at 12)' if pl['capped'] else ''}"
    d.text((PAD, 32), sub, font=Fr(15), fill=(160, 166, 178))
    x = PAD; y = 58
    for im, lab in ((wideA, "TODAY (live default): diagnostic figure — no GOAL_RIGHT art"), (wideB, f"CANDIDATE in the live camera: V6 mirrored @ {PS}, hand-led placement, magenta = sim contact target")):
        row.paste(im, (x, y)); d.text((x, y + im.height + 6), lab, font=Fr(15), fill=(220, 220, 230)); x += im.width + PAD
    x = PAD; y = 58 + wideA.height + 30
    for im, lab in ((tA, "today 2x"), (tB, f"candidate @ {PS} (IK) 2x"), (tC, "candidate RAW anchor (no hand-led correction) 2x"), (tD, "SET keeper at the same root 2x — size reference")):
        row.paste(im, (x, y)); d.text((x, y + im.height + 6), lab, font=Fr(14), fill=(200, 205, 215)); x += im.width + PAD
    rows.append(row)
# bracket row for the HIGH case
c = cases[0]; cells = []
for sc in BR + [PS]:
    name = f"{c['id']}_E_scale_{float(sc):.2f}" if sc != PS else f"{c['id']}_B_candidate_IK"
    if not os.path.exists(f"{CAP}/{name}.png"): continue
    cells.append((float(sc), zoom(img(name).crop((30, 20, 190, 160)), 2)))
cells.sort(key=lambda t: t[0]); cells.append((None, zoom(img(f"{c['id']}_D_SET_same_root").crop((30, 20, 190, 160)), 2)))
brow = Image.new("RGB", (W, cells[0][1].height + 90), (18, 19, 22)); d = ImageDraw.Draw(brow)
d.text((PAD, 6), "SCALE BRACKET — same HIGH contact tick, same root, hand-led placement; only the body scale differs (root re-derived from the lead glove each time)", font=F(18), fill=(235, 225, 120))
x = PAD
for sc, im in cells:
    brow.paste(im, (x, 40)); d.text((x, 40 + im.height + 6), (f"body scale {sc:.2f}" + ("  ← calibrated" if f"{sc:.2f}" == f"{float(PS):.2f}" else "")) if sc else "SET keeper (size reference)", font=Fr(15), fill=(150, 235, 150) if (sc and f"{sc:.2f}" == f"{float(PS):.2f}") else (200, 205, 215)); x += im.width + PAD
hdr = Image.new("RGB", (W, 120), (18, 19, 22)); d = ImageDraw.Draw(hdr)
d.text((PAD, 14), "SOUTH V6 — mirrored + scale-calibrated candidate in the actual gameplay camera (nothing integrated)", font=F(30), fill=(255, 255, 255))
d.text((PAD, 56), f"art: V6_CLEAN mirrored horizontally, no other change · body scale {PS} (pixel_scale) · root = lead glove + canonical offset {tuple(an['root_offset_base_px'])} px (÷ scale) measured on the representative GOAL_RIGHT HIGH dive · reach unit {tuple(an['reach_screen_unit'])}", font=Fr(16), fill=(150, 235, 150))
d.text((PAD, 82), "drawn through the live save-pose path's own blit and hand-led placement (review override); simulation, mechanics and contact untouched · magenta dashed line = root → committed contact target", font=Fr(15), fill=(150, 155, 165))
H = hdr.height + sum(r.height + 8 for r in rows) + brow.height + 16
sheet = Image.new("RGB", (W, H), (18, 19, 22)); sheet.paste(hdr, (0, 0)); y = hdr.height
for r in rows: sheet.paste(r, (0, y)); y += r.height + 8
sheet.paste(brow, (0, y)); sheet.save(f"{OUT}/SOUTH_V6_CAMERA_REVIEW_SHEET.png"); print("sheet", sheet.size)
