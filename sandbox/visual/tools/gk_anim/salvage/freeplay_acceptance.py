# ACCEPTANCE table + sheet from a free-play run: far airborne MID/HIGH/TOP dives by keeper-frame side x height x keeper facing bucket
#   python3 freeplay_acceptance.py <run_dir> <out_dir>
import sys, json, os, collections
from PIL import Image, ImageDraw, ImageFont
RUN, OUT = sys.argv[1:3]; os.makedirs(OUT, exist_ok=True)
F = lambda s: ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", s); Fr = lambda s: ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", s)
sh = json.load(open(f"{RUN}/freeplay.json"))["shots"]
def bucket(deg):
    if deg is None: return "?"
    d = (deg + 360) % 360
    for name, c in (("W", 180), ("SW", 135), ("S", 90), ("NW", 225), ("N", 270), ("SE", 45), ("NE", 315), ("E", 0)):
        if abs(((d - c + 180) % 360) - 180) <= 22.5: return name
    return "?"
dives = [r for r in sh if (r.get("cls") or {}).get("family") == "AIRBORNE_DIVE"]
tab = collections.OrderedDict(); miss_list = []
for r in dives:
    c = r["cls"]; k = (c["side"], c["hClass"], bucket(r["facingAtCommitDeg"])); t = tab.setdefault(k, {"n": 0, "miss": 0, "picks": collections.Counter(), "ex": None})
    miss = "ART_MISSING" in (r.get("artAtCapture") or "") or (r.get("diagTicks") or 0) > 0
    t["n"] += 1; t["miss"] += miss; t["picks"][(r["pick"] or {}).get("id", "NONE")] += 1
    if miss: miss_list.append(r)
    if t["ex"] is None or (t["ex"]["pick"] is None and r["pick"]): t["ex"] = r
md = ["# Free-play acceptance — far airborne dives by keeper-frame side × height × keeper facing", "", f"run `{os.path.basename(RUN)}`: {len(sh)} shots, {len(dives)} airborne dives, **{len(miss_list)} ART_MISSING**", "",
      "| side | height | keeper facing | dives | ART_MISSING | picks |", "|---|---|---|---|---|---|"]
order = {"MID": 0, "HIGH": 1, "TOP": 2, "LOW-MID": 3}
for (side, h, fb), t in sorted(tab.items(), key=lambda kv: (kv[0][0], order.get(kv[0][1], 9), kv[0][2])):
    md.append(f"| {side} | {h} | {fb} | {t['n']} | {t['miss']} | {', '.join(f'{k} ×{v}' for k, v in t['picks'].most_common())} |")
open(f"{OUT}/ACCEPTANCE.md", "w").write("\n".join(md) + "\n")
# sheet: one frame per (side, height ∈ MID/HIGH/TOP, facing bucket)
cells = []
for (side, h, fb), t in sorted(tab.items(), key=lambda kv: (kv[0][0], order.get(kv[0][1], 9), kv[0][2])):
    if h not in ("MID", "HIGH", "TOP") or not t["ex"] or not t["ex"].get("shot"): continue
    r = t["ex"]; fr = Image.open(f"{RUN}/{r['shot']}_frame.png").convert("RGB"); ov = Image.open(f"{RUN}/{r['shot']}_overlay.png").convert("RGB").crop((0, 0, 560, 90))
    im = Image.new("RGB", (600, 400), (18, 19, 22)); d = ImageDraw.Draw(im)
    d.text((6, 4), f"{side} · {h} · keeper facing {fb} ({r['facingAtCommitDeg']}°)", font=F(15), fill=(235, 225, 120))
    d.text((6, 24), f"{t['n']} dives in this cell, {t['miss']} ART_MISSING · shown: shot #{r['i']} {r['key']} c{r['c']} from {r['origin']} → y{r['aim'][1]} · norm {r['cls']['norm']}" , font=Fr(11), fill=(150, 155, 165))
    im.paste(fr, (6, 42)); im.paste(ov.resize((250, 40), Image.NEAREST), (350, 42))
    d.text((350, 86), "overlay:", font=Fr(10), fill=(150, 155, 165)); d.text((350, 100), (r.get("artAtCapture") or "")[:44], font=Fr(10), fill=(150, 235, 150) if r["pick"] else (255, 120, 120)); d.text((350, 114), (r.get("artAtCapture") or "")[44:88], font=Fr(10), fill=(150, 235, 150) if r["pick"] else (255, 120, 120))
    d.text((6, 290), "pick: " + ((r["pick"]["id"] + " " + str(r["pick"]["score"]) + (" FORCED" if "FORCED" in (r["pick"].get("why") or "") else " FALLBACK" if "FALLBACK" in (r["pick"].get("why") or "") else "")) if r["pick"] else "NONE"), font=Fr(12), fill=(220, 220, 230))
    cells.append(im)
cols = 3; rows = (len(cells) + cols - 1) // cols
sheet = Image.new("RGB", (cols * 606 + 6, 60 + rows * 406), (18, 19, 22)); d = ImageDraw.Draw(sheet)
d.text((8, 8), f"FREE-PLAY ACCEPTANCE — one live frame per side × height × keeper facing ({len(dives)} airborne dives, {len(miss_list)} ART_MISSING)", font=F(22), fill=(255, 255, 255))
d.text((8, 38), "plain match.html, keyboard kick path, continuous keeper; frame = live draw mid-action with the GK ANIM overlay", font=Fr(13), fill=(150, 155, 165))
for k, c in enumerate(cells): sheet.paste(c, (6 + (k % cols) * 606, 60 + (k // cols) * 406))
sheet.save(f"{OUT}/ACCEPTANCE_SHEET.png"); print("acceptance:", len(dives), "dives,", len(miss_list), "missing; cells", len(cells), "; sheet", sheet.size)
print("\n".join(md[4:]))
