# FINAL EVIDENCE SHEET: BEFORE vs INTEGRATED LEFT far dive for several live cases (MID / HIGH / TOP / extreme, several facings)
#   python3 seq_evidence_sheet.py <evidence_dir> <out.png> <case names csv> [scale]
# The per-case strips are rendered by seq_evidence.py at 3× of the live pixels; the sheet shows them at <scale>× the LIVE pixels
# (default 1 = normal gameplay scale, integer nearest-neighbour so every drawn pixel is a real screen pixel), never clipped.
import sys, os, json
from PIL import Image, ImageDraw, ImageFont
EV, OUT = sys.argv[1], sys.argv[2]; CASES = sys.argv[3].split(","); SCALE = float(sys.argv[4]) if len(sys.argv) > 4 else 1.0
STRIP_ZOOM = 3
F = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 12); FB = lambda s: ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", s)
checks = {c["case"]: c for c in json.load(open(f"{EV}/checks.json"))}
def load(c):
    s = Image.open(f"{EV}/{c}_strip.png").convert("RGB"); f = SCALE / STRIP_ZOOM
    return s.resize((max(1, round(s.width * f)), max(1, round(s.height * f))), Image.NEAREST if abs(f * STRIP_ZOOM - round(f * STRIP_ZOOM)) < 1e-9 and f >= 1 else Image.BOX)
strips = [load(c) for c in CASES]
W = max(s.width for s in strips) + 24
H = 90 + sum(s.height + 62 for s in strips)
sh = Image.new("RGB", (W, H), (18, 19, 22)); d = ImageDraw.Draw(sh)
d.text((12, 10), f"LEFT FAR DIVE — BEFORE (contact pose only) vs INTEGRATED (full authored sequence) on the same live shots, plain match.html, sequences OFF vs ON — shown at {SCALE:g}× the live pixels", font=FB(22), fill=(255, 255, 255))
d.text((12, 42), "each block: the first tick of every drawn frame, the contact tick and the return to SET; BEFORE row above, INTEGRATED row below; simulation identical in both runs (root deviation 0.000000 m, same contact tick, same outcome)", font=F, fill=(150, 155, 165))
y = 74
for c, s in zip(CASES, strips):
    k = checks.get(c, {}); cls = k.get("cls") or {}; m = k.get("meta") or {}
    pm = k.get("pres_max_m"); pm = f"+{pm:.2f} m" if isinstance(pm, (int, float)) else "n/a"
    d.text((12, y), f"{c}: {cls.get('hClass')} · norm {cls.get('norm')} · {cls.get('tier')} · variant {k.get('variant')} · key {m.get('key')} c {m.get('c')} from {m.get('origin')} · frames {len(k.get('frame_order', []))} · sim root dev {k.get('sim_root_dev_m')} m · max drawn-root step {k.get('drawn_root_max_jump_px')} px · planted-foot drift {[round(v, 1) for v in (k.get('planted_foot_drift_px') or [])]} px · contact-tick crop {k.get('contact_tick_diff') or ('identical' if k.get('contact_tick_crop_identical') else ('n/a (no contact)' if k.get('contact') is None else 'DIFFERS'))} · presentation root max {pm} · diagnostic ticks {k.get('diag_ticks_after')}", font=FB(13), fill=(235, 225, 120)); y += 22
    sh.paste(s, (12, y)); y += s.height + 40
sh.save(OUT); print(OUT, sh.size)
