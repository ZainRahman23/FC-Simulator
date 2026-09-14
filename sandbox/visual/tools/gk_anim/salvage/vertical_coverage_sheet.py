#!/usr/bin/env python3
"""Coverage sheet for the vertical HIGH_CATCH work: every contextual-scan case (45) and every two-sided far-dive matrix case (56) with the
pick before (frozen library reference) and after (current build); the only allowed change is the overhead role's art id
(OVERHEAD_REACH_CW11 → VERTICAL_HIGH) with its score. Writes a markdown table and a PNG.
  python3 vertical_coverage_sheet.py <scan_ref.json> <scan_now.json> <matrix_ref.json> <matrix_now cases.json> <out_stem>"""
import sys, json
from PIL import Image, ImageDraw, ImageFont
SR, SN, MR, MN, OUT = sys.argv[1:6]
try: F = ImageFont.truetype("/System/Library/Fonts/Menlo.ttc", 12); FB = ImageFont.truetype("/System/Library/Fonts/Menlo.ttc", 14)
except Exception: F = ImageFont.load_default(); FB = F
RENAME = {"OVERHEAD_REACH_CW11": "VERTICAL_HIGH"}
A = json.load(open(SR)); B = json.load(open(SN)); MA = json.load(open(MR)); MB = json.load(open(MN))
def pk(c):
    p = c.get("pick") or c.get("ctx")
    if isinstance(p, dict): return p.get("id"), p.get("score")
    return p, None
rows = []; bad = 0
for a, b in zip(A["cases"], B["cases"]):
    assert a["id"] == b["id"]
    pa, sa = pk(a); pb, sb = pk(b); same = (RENAME.get(pa, pa) == pb) and a["cls"] == b["cls"] and (a.get("contact") or {}).get("outcome") == (b.get("contact") or {}).get("outcome") and a.get("committed") == b.get("committed")
    if not same: bad += 1
    rows.append(("scan", a["id"], f"{a['cls']['family']} {a['cls']['hClass']} {a['cls'].get('goalSide','')}", a.get("committed", {}).get("action"), (a.get("contact") or {}).get("outcome"), pa, sa, pb, sb, "unchanged" if same and pa == pb else ("art id renamed (overhead role)" if same else "CHANGED")))
ma = MA["cases"] if isinstance(MA, dict) and "cases" in MA else MA; mb = MB["cases"] if isinstance(MB, dict) and "cases" in MB else MB
DA = {c["id"]: c for c in ma}; DB = {c["id"]: c for c in mb}
for k in DA:
    a, b = DA[k], DB.get(k)
    if b is None: rows.append(("matrix", k, "", "", "", pk(a)[0], pk(a)[1], None, None, "MISSING")); bad += 1; continue
    pa, sa = pk(a); pb, sb = pk(b); same = (RENAME.get(pa, pa) == pb) and a.get("cls") == b.get("cls") and (a.get("contact") or {}).get("outcome") == (b.get("contact") or {}).get("outcome")
    if not same: bad += 1
    rows.append(("matrix", k, f"{(a.get('cls') or {}).get('family','')} {(a.get('cls') or {}).get('hClass','')} {(a.get('cls') or {}).get('goalSide','')}", (a.get("committed") or {}).get("action"), (a.get("contact") or {}).get("outcome"), pa, sa, pb, sb, "unchanged" if same and pa == pb else ("art id renamed (overhead role)" if same else "CHANGED")))
with open(OUT + ".md", "w") as fh:
    fh.write(f"# Coverage: contextual scan ({len(A['cases'])} cases) + two-sided far-dive matrix ({len(DA)} cases) — reference (frozen library) vs current build\n\n")
    fh.write(f"Cases with a changed pick / classifier / committed action / contact outcome (beyond the overhead art id rename): **{bad}**\n\n")
    fh.write("| set | case | class | action | outcome | pick before | score | pick after | score | verdict |\n|---|---|---|---|---|---|---|---|---|---|\n")
    for r in rows: fh.write("| " + " | ".join("" if v is None else str(v) for v in r) + " |\n")
# PNG
H = 26 + 16 * (len(rows) + 2); im = Image.new("RGB", (1500, H), (22, 22, 22)); d = ImageDraw.Draw(im)
d.text((8, 5), f"COVERAGE — every scan + far-dive matrix case: pick before → after (only the overhead role's art id changed: OVERHEAD_REACH_CW11 → VERTICAL_HIGH). Cases changed beyond the rename: {bad}", fill=(255, 255, 255), font=FB)
cols = [(8, "set"), (60, "case"), (230, "class"), (470, "action"), (580, "outcome"), (740, "pick before"), (900, "score"), (960, "pick after"), (1120, "score"), (1180, "verdict")]
for x, t in cols: d.text((x, 26), t, fill=(255, 230, 120), font=F)
for i, r in enumerate(rows):
    y = 44 + i * 16; col = (255, 255, 255) if r[-1] == "unchanged" else ((120, 255, 160) if "renamed" in r[-1] else (255, 90, 90))
    for (x, _), v in zip(cols, r): d.text((x, y), ("" if v is None else str(v))[:34], fill=col, font=F)
im.save(OUT + ".png"); print("rows", len(rows), "changed beyond rename:", bad, "->", OUT + ".md/.png")
