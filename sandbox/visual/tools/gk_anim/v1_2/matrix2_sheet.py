#!/usr/bin/env python3
"""Two-direction decision matrix sheet + markdown table from matrix2_run.js output.
   python3 matrix2_sheet.py <matrix_dir> <out_png_prefix> <out_md>"""
import sys, os, json
from PIL import Image, ImageDraw, ImageFont
D, OUTP, OUTMD = sys.argv[1:4]
rep = json.load(open(os.path.join(D, "matrix2.json"))); M = rep["matrix"]
try: font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 11); fontb = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 12); fonth = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 15)
except Exception: font = fontb = fonth = ImageFont.load_default()
LATS = ["SMALL", "MED", "LARGE"]; ZS = ["LOW", "MID", "HIGH", "TOP"]
CW, CH = 260, 250; LAB = 62; PAD = 6
def cell(side, ln, zn): return next((m for m in M if m["side"] == side and m["latName"] == ln and m["zName"] == zn), None)
def art_short(m):
    a = (m.get("art") or "")
    if "SAVE POSE" in a: a = a[a.index("SAVE POSE") + 10:]
    return a.replace("CANDIDATE", "cand.").replace("(no IK) glove err", "RAW err")[:70]
for side in ["GOAL_LEFT", "GOAL_RIGHT"]:
    W = PAD + len(ZS) * (CW + PAD) + 90; H = 60 + len(LATS) * (CH + LAB + PAD)
    sheet = Image.new("RGB", (W, H), (22, 24, 28)); dr = ImageDraw.Draw(sheet)
    dr.text((PAD, 6), f"DECISION MATRIX V1.2 — {side} ({'UP the screen, far post' if side=='GOAL_LEFT' else 'DOWN the screen, near post'}) — goal-line synthetic arrivals at {rep['speed']} m/s through the real simulation; art chosen by the runtime classifier", fill=(255, 255, 255), font=fonth)
    dr.text((PAD, 28), "columns: contact height LOW 0.3 / MID 1.0 / HIGH 1.7 / TOP 2.2 m; rows: lateral demand SMALL 0.4 / MED 1.2 / LARGE 2.0 m. Each cell: family + goal side + height class + envelope norm; captured at the contact tick (or max phase).", fill=(200, 200, 200), font=font)
    for j, zn in enumerate(ZS): dr.text((90 + PAD + j * (CW + PAD) + 4, 46), zn, fill=(255, 210, 74), font=fontb)
    for i, ln in enumerate(LATS):
        y = 60 + i * (CH + LAB + PAD); dr.text((PAD, y + CH // 2), ln, fill=(255, 210, 74), font=fontb)
        for j, zn in enumerate(ZS):
            m = cell(side, ln, zn); x = 90 + PAD + j * (CW + PAD)
            if not m: continue
            try: im = Image.open(os.path.join(D, m["crop"])).convert("RGB"); sheet.paste(im, (x, y))
            except Exception: pass
            c = m.get("cls") or {}; ex = c.get("expr") or {}
            l1 = f'{m.get("family") or "no commit"} {m.get("goalSide") or ""} {ex.get("heightClass") or ""}'.strip(); l2 = f'norm {c.get("norm")}  {"planted" if c.get("feetPlanted") else "dive"}  {c.get("action") or ""}'
            l3 = art_short(m); l4 = ("contact " + m["contact"]["vol"] + " " + m["contact"]["out"]) if m.get("contact") else "no contact"
            lc = m.get("lc") or {}; l4 += f'  err {lc.get("errPx")} px' + ("  FLAG" if lc.get("flagged") else "")
            cut = lambda t: t if dr.textlength(t, font=font) <= CW - 2 else (t[:max(8, int(len(t) * (CW - 12) / dr.textlength(t, font=font)))] + "…")
            dr.text((x, y + CH + 1), cut(l1), fill=(255, 255, 255), font=fontb); dr.text((x, y + CH + 14), cut(l2), fill=(200, 230, 255), font=font); dr.text((x, y + CH + 26), cut(l3), fill=(180, 255, 200), font=font); dr.text((x, y + CH + 38), cut(l4), fill=(255, 200, 150), font=font)
    out = f"{OUTP}_{side}.png"; sheet.save(out); print("wrote", out, sheet.size)
with open(OUTMD, "w") as f:
    f.write(f"# Decision matrix V1.2 — two save directions ({rep['speed']} m/s goal-line synthetic arrivals)\n\n")
    for side in ["GOAL_LEFT", "GOAL_RIGHT"]:
        f.write(f"## {side}\n\n| lateral \\ height | " + " | ".join(ZS) + " |\n|---|" + "---|" * len(ZS) + "\n")
        for ln in LATS:
            row = []
            for zn in ZS:
                m = cell(side, ln, zn); c = (m or {}).get("cls") or {}; ex = c.get("expr") or {}
                row.append(f'{m.get("family") if m else "-"} {ex.get("heightClass") or ""} norm {c.get("norm")}<br>{art_short(m) if m else ""}<br>{("contact " + m["contact"]["vol"] + " " + m["contact"]["out"]) if m and m.get("contact") else "no contact"}')
            f.write(f"| {ln} | " + " | ".join(row) + " |\n")
        f.write("\n")
print("wrote", OUTMD)
