# BEFORE/AFTER sheet for the exact free-play shots that were ART_MISSING: live frame + live overlay strip + key readout, both runs
#   python3 freeplay_before_after_sheet.py <before_dir> <after_dir> <out.png> <shot ids csv>
import sys, json
from PIL import Image, ImageDraw, ImageFont
B, A, OUTP = sys.argv[1:4]; IDS = [int(v) for v in sys.argv[4].split(",")]
F = lambda s: ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", s); Fr = lambda s: ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", s); Fm = lambda s: ImageFont.truetype("/System/Library/Fonts/Supplemental/Courier New.ttf", s)
rb = {r["i"]: r for r in json.load(open(f"{B}/freeplay.json"))["shots"]}; ra = {r["i"]: r for r in json.load(open(f"{A}/freeplay.json"))["shots"]}
KEYN = {"z": "z = SHOT (LACES charge)", "1": "1 = INSIDE", "2": "2 = LACES", "3": "3 = POWER LACES", "5": "5 = CHIP"}
W = 1900; rows = []
for i in IDS:
    b, a = rb[i], ra[i]; c = b["cls"]; s = b["situation"] or {}
    row = Image.new("RGB", (W, 440), (18, 19, 22)); d = ImageDraw.Draw(row)
    d.text((12, 8), f"shot #{i} — {KEYN.get(b['key'], b['key'])} held to charge {b['c']} from {b['origin']} facing the goal at y {b['aim'][1]} · keeper settled {b['settle']} ticks · player {b['run']} after the shot", font=F(18), fill=(235, 225, 120))
    d.text((12, 34), f"live action {c['family']}/{c['side']}  {c['hClass']}  goal side {c['goalSide']}  contact z {c['z']} m  lateral {c['L']} m  norm {c['norm']}  bestEffort {c['bestEffort']} · keeper tracked facing {b['facingAtCommitDeg']}° vs shooter bearing {s.get('facingDeg')}° · attacker angle {s.get('attackerDeg')}°", font=Fr(14), fill=(150, 155, 165))
    for k, (r, dirn, tag, col) in enumerate(((b, B, "BEFORE", (255, 170, 120)), (a, A, "AFTER", (150, 235, 150)))):
        x = 12 + k * 940
        fr = Image.open(f"{dirn}/{r['shot']}_frame.png").convert("RGB"); ov = Image.open(f"{dirn}/{r['shot']}_overlay.png").convert("RGB")
        row.paste(fr, (x, 60)); row.paste(ov.crop((0, 0, 560, 90)), (x + 350, 60))
        d.text((x + 350, 154), "live GK ANIM overlay (S.dbg.anim) at the same tick", font=Fr(11), fill=(150, 155, 165))
        d.text((x, 306), f"{tag}: {r['artAtCapture']}", font=F(13), fill=col)
        p = r["pick"]; d.text((x, 326), "pick: " + (f"{p['id']} {p['score']} — {p['why'][:120]}" if p else "NONE (every candidate rejected → diagnostic figure)"), font=Fm(10), fill=(220, 220, 230))
        top = sorted([q for q in (r["scored"] or []) if q["score"] > 0], key=lambda q: -q["score"])[:4]
        d.text((x, 346), "top candidates: " + "; ".join(f"{q['id']} {q['score']}" for q in top), font=Fm(10), fill=(200, 205, 215))
        d.text((x, 362), "contact: " + (f"{r['contactFinal']['volume']} {r['contactFinal']['outcome']}" if r.get("contactFinal") else "none") + f" · diagnostic drawn on {r.get('diagTicks', 0)} ticks", font=Fm(10), fill=(200, 205, 215))
    rows.append(row)
hdr = Image.new("RGB", (W, 74), (18, 19, 22)); d = ImageDraw.Draw(hdr)
d.text((12, 8), "Live free-play ART_MISSING AIRBORNE_DIVE/LEFT cases — BEFORE vs AFTER the hard side fallback (same shots, same continuous keeper, plain match.html)", font=F(22), fill=(255, 255, 255))
d.text((12, 42), "shots fired through the keyboard path (ptChargeBegin/ptChargeRelease → ptKick); the keeper is never reset between shots; frames captured mid-action with the live overlay on", font=Fr(14), fill=(150, 155, 165))
H = hdr.height + sum(r.height + 6 for r in rows); sheet = Image.new("RGB", (W, H), (18, 19, 22)); sheet.paste(hdr, (0, 0)); y = hdr.height
for r in rows: sheet.paste(r, (0, y)); y += r.height + 6
sheet.save(OUTP); print("sheet", sheet.size)
