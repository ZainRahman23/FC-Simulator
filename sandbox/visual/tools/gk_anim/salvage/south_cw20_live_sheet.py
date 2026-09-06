# SOUTH far dive final adjustment — live evidence from two free-play runs of the SAME seed (old build 15°/0.80 vs new build 20°/0.85):
# the same shots, same simulation, only the drawn contact pose differs.  Picks real DIVE_SOUTH_MEDHIGH saves at MID / HIGH / TOP across
# a spread of far extensions (envelope norm) and lays out OLD frame + 2x crop | NEW frame + 2x crop per case, plus a NEW-only gallery.
#   python3 south_cw20_live_sheet.py <old_run> <new_run> <out_dir> [ids csv]
import sys, json, os, re
from PIL import Image, ImageDraw, ImageFont
OLD, NEW, OUT = sys.argv[1:4]; os.makedirs(OUT, exist_ok=True); IDS = [int(v) for v in sys.argv[4].split(",")] if len(sys.argv) > 4 else None
F = lambda s: ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", s); Fr = lambda s: ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", s)
o = {r["i"]: r for r in json.load(open(f"{OLD}/freeplay.json"))["shots"]}; n = {r["i"]: r for r in json.load(open(f"{NEW}/freeplay.json"))["shots"]}
# determinism: same shot -> same classification / pick in both runs
same = [i for i in n if i in o and (o[i].get("cls") or {}) == (n[i].get("cls") or {}) and ((o[i].get("pick") or {}).get("id"), (o[i].get("pick") or {}).get("score")) == ((n[i].get("pick") or {}).get("id"), (n[i].get("pick") or {}).get("score"))]
diff = [i for i in n if i in o and i not in same]
print(f"shots old {len(o)} new {len(n)}; identical classification+pick {len(same)}; differing {len(diff)} {diff[:20]}")
south = [r for r in n.values() if r.get("pick") and r["pick"]["id"] == "DIVE_SOUTH_MEDHIGH" and r.get("shot")]
print("DIVE_SOUTH_MEDHIGH picks in the new run:", len(south), {h: sum(1 for r in south if r["cls"]["hClass"] == h) for h in ("LOW-MID", "MID", "HIGH", "TOP")})
if IDS: cases = [n[i] for i in IDS]
else:
    cases = []
    for h in ("MID", "HIGH", "TOP"):
        rs = sorted([r for r in south if r["cls"]["hClass"] == h], key=lambda r: r["cls"]["norm"])
        if not rs: continue
        want = [rs[0], rs[len(rs) // 2], rs[-1]] if len(rs) >= 3 else rs           # least / median / most far extension
        # prefer a case with a real contact (save) for the middle slot when one exists in the same norm third
        mid = [r for r in rs[len(rs) // 3: 2 * len(rs) // 3 + 1] if r.get("contact")]
        if len(rs) >= 3 and mid: want[1] = mid[len(mid) // 2]
        seen = set(); cases += [r for r in want if not (r["i"] in seen or seen.add(r["i"]))]
def place(lbl):
    m = re.search(r"place raw ([\d.]+) corr ([\d.]+) res ([\d.]+)px", lbl or ""); return f"placement raw {m.group(1)} → corr {m.group(2)} → residual {m.group(3)} px" if m else (lbl or "")[:60]
def crop2(fr):  # the hunt frames are 340x240 with the keeper root at (170,170)
    return fr.crop((90, 40, 250, 200)).resize((320, 320), Image.NEAREST)
ROW_H = 372; W = 1440; sheet = Image.new("RGB", (W, 96 + ROW_H * len(cases)), (18, 19, 22)); d = ImageDraw.Draw(sheet)
d.text((12, 10), "SOUTH far dive — 15° CW @ 0.80 (approved)  vs  20° CW @ 0.85 (final live) on the same live saves", font=F(22), fill=(255, 255, 255))
d.text((12, 40), "plain match.html, keyboard kick path, continuous keeper, seed 11 on both builds — same shots, same simulation, same selection and hand-led placement; only the drawn contact pose changed", font=Fr(12), fill=(150, 155, 165))
d.text((12, 58), f"determinism check across the two runs: {len(same)} of {len(n)} shots have identical classification and pick ({len(diff)} differ)", font=Fr(12), fill=(150, 155, 165))
for k, r in enumerate(cases):
    y = 96 + k * ROW_H; c = r["cls"]; ro = o.get(r["i"])
    d.text((12, y), f"shot #{r['i']} — {r['key']} charge {r['c']} from {r['origin']} → y{r['aim'][1]} · {c['hClass']} · contact z {c['z']} m · lateral {abs(c['lat'])} m · demand L {c['L']} m · envelope norm {c['norm']} · {c['tier']} {c['action']} · keeper facing {r['facingAtCommitDeg']}° · pick score {r['pick']['score']} · contact {(r.get('contact') or {}).get('volume', 'none')} {(r.get('contact') or {}).get('outcome', '')}", font=F(12), fill=(235, 225, 120))
    for j, (run, rr, lab, col) in enumerate((("old", ro, "15° CW @ 0.80", (200, 200, 200)), ("new", r, "20° CW @ 0.85", (120, 255, 150)))):
        x = 12 + j * 716
        if not rr or not rr.get("shot"): d.text((x, y + 22), "no frame", font=Fr(11), fill=(255, 120, 120)); continue
        fr = Image.open(f"{OLD if run == 'old' else NEW}/{rr['shot']}_frame.png").convert("RGB")
        d.text((x, y + 20), lab, font=F(13), fill=col); d.text((x + 130, y + 21), place(rr.get("artAtCapture")), font=Fr(10), fill=(190, 190, 200))
        sheet.paste(fr, (x, y + 38)); sheet.paste(crop2(fr), (x + 350, y + 38))
        d.text((x, y + 38 + 242), "gameplay scale (live pixels)", font=Fr(10), fill=(150, 155, 165)); d.text((x + 350, y + 38 + 322), "2× of the live pixels", font=Fr(10), fill=(150, 155, 165))
        if rr.get("pick"): d.text((x, y + 38 + 256), f"overlay: {rr['pick']['id']} {rr['pick']['score']}", font=Fr(10), fill=(150, 235, 150))
sheet.save(f"{OUT}/SOUTH_CW20_LIVE_BEFORE_AFTER.png")
# gallery: the new pose only, 2x crops in a grid
cols = 3; rows = (len(cases) + cols - 1) // cols; g = Image.new("RGB", (cols * 336 + 12, 60 + rows * 372), (18, 19, 22)); dg = ImageDraw.Draw(g)
dg.text((12, 10), "SOUTH far dive 20° CW @ 0.85 — live saves at MID / HIGH / TOP, least → most extension (2× of the live pixels)", font=F(18), fill=(255, 255, 255))
for k, r in enumerate(cases):
    x, y = 12 + (k % cols) * 336, 60 + (k // cols) * 372; c = r["cls"]
    g.paste(crop2(Image.open(f"{NEW}/{r['shot']}_frame.png").convert("RGB")), (x, y + 30))
    dg.text((x, y), f"#{r['i']} {c['hClass']} z {c['z']} lat {abs(c['lat'])} norm {c['norm']}", font=F(12), fill=(235, 225, 120)); dg.text((x, y + 14), f"{c['tier']} · facing {r['facingAtCommitDeg']}° · {(r.get('contact') or {}).get('volume', 'no contact')}", font=Fr(10), fill=(190, 190, 200))
g.save(f"{OUT}/SOUTH_CW20_LIVE_GALLERY.png"); print("cases", [r["i"] for r in cases], "sheet", sheet.size, "gallery", g.size)
