# IFM-1 CLIP ASSEMBLY (prereg §11) — POST-FREEZE PRESENTATION TOOLING. Encodes the captured lossless frames (ifm1_clip_capture.cjs) into reviewable
# files; nothing is re-rendered, retimed or interpolated (every 60 Hz frame is shown once; durations 17/17/16 ms average 1/60 s).
#   primary/<id>.webp      normal speed, the full 1280 × 720 CAMERA_V1 gameplay frame at zoom 1 (labelled)          — PRIMARY
#   blind/<name>.webp      the same frames with the body version hidden (fixed mapping, IFM1_BLIND_KEY.json)
#   diag/<id>_025x.webp    DIAGNOSTIC: 0.25× (every 1/240 s step at 60 fps), the viewer's own 4× gameplay zoom, overlays; centre crop 640 × 360
#   sheets/<role>*.png     magnified crops (×4, nearest-neighbour: the actual gameplay pixels, no re-render) at fixed instants, per cell
# usage: python3 ifm1_clip_assemble.py <capture dir> <clip prep dir> <out dir>
import json, os, sys, hashlib
from PIL import Image, ImageDraw, ImageFont
CAP, CL, OUT = sys.argv[1:4]
META = json.load(open(os.path.join(CL, "clip_meta.json"))); KEY = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "IFM1_BLIND_KEY.json")))["mapping"]
F = lambda s: ImageFont.truetype("/System/Library/Fonts/SFNS.ttf", s)
DUR = lambda n: ([17, 17, 16] * (n // 3 + 1))[:n]
def frames(cid, var, n): return [Image.open(os.path.join(CAP, "frames", cid, var, "%05d.png" % k)).convert("RGB") for k in range(n)]
def webp(ims, path, q):
    os.makedirs(os.path.dirname(path), exist_ok=True); ims[0].save(path, save_all=True, append_images=ims[1:], duration=DUR(len(ims)), loop=0, quality=q, method=4)
def blindName(c): return (f"C0_{c['state']}_{KEY[c['body']]}" if c["mode"] == "C0" else f"{c['role']}_{c['mode']}_{KEY[c['body']]}")
def text(d, xy, s, size, fill=(238, 244, 240), bg=(8, 12, 10)):
    f = F(size); b = d.textbbox(xy, s, font=f); d.rectangle((b[0] - 4, b[1] - 3, b[2] + 4, b[3] + 3), fill=bg); d.text(xy, s, font=f, fill=fill)
man = {"tool": "ifm1_clip_assemble.py", "files": {}}
clips = {c["id"]: c for c in META["clips"]}
for c in META["clips"]:
    cid = c["id"]; P = json.load(open(os.path.join(CAP, "proj", cid + ".json")))
    webp(frames(cid, "lab", len(P["normal"])), os.path.join(OUT, "primary", cid + ".webp"), 88)
    webp(frames(cid, "blind", len(P["normal"])), os.path.join(OUT, "blind", blindName(c) + ".webp"), 85)
    dg = []
    for k, im in enumerate(frames(cid, "diag", len(P["diag"]))):
        cr = im.crop((320, 180, 960, 540)); d = ImageDraw.Draw(cr); fr = P["diag"][k]
        text(d, (8, 6), f"DIAGNOSTIC 0.25× · 4× zoom crop · {c['role'] or c['state'] + ' control'} · {c['body']} · {c['mode']}", 12)
        text(d, (8, 26), (f"τ = {fr['tauMs']:+.2f} ms · RUN-1 lead-in" if fr["phase"] == "lead" else f"τ = +{fr['tauMs']:.2f} ms · physical step {fr['n']}"), 12, fill=(255, 231, 163))
        dg.append(cr)
    webp(dg, os.path.join(OUT, "diag", cid + "_025x.webp"), 85)
    print(cid, flush=True)
# ── magnified comparison sheets: rows = body × mode, columns = instants; crops centred on the runner (rail camera: screen x ≈ 640) ──
COLS = [("−16.7 ms (RUN-1)", 14), ("0 ms (entry)", 15), ("+16.7 ms", 16), ("+33.3 ms", 17), ("+50 ms", 18), ("+100 ms", 21), ("+150 ms", 24)]
CROP, MAG = 76, 4
def cropAt(cid, var, k):
    P = json.load(open(os.path.join(CAP, "proj", cid + ".json"))); j = P["normal"][k]["proj"]["joint"]; pel = j[1]
    cx, cy = round(pel[0]), round(pel[1]) - 6; im = Image.open(os.path.join(CAP, "frames", cid, var, "%05d.png" % k)).convert("RGB")
    return im.crop((cx - CROP // 2, cy - CROP // 2, cx + CROP // 2, cy + CROP // 2)).resize((CROP * MAG, CROP * MAG), Image.NEAREST)
def sheet(rows, title, path, var):
    cw = CROP * MAG; lw = 230; hh = 64; S = Image.new("RGB", (lw + cw * len(COLS), hh + cw * len(rows) + 30), (15, 20, 18)); d = ImageDraw.Draw(S)
    d.text((10, 8), title, font=F(17), fill=(238, 244, 240))
    for i, (lab, _) in enumerate(COLS): d.text((lw + i * cw + 8, 38), lab, font=F(15), fill=(191, 233, 255) if i == 0 else (255, 231, 163))
    for r, (lab, cid, sub) in enumerate(rows):
        y = hh + r * cw; d.text((10, y + 10), lab, font=F(16), fill=(238, 244, 240)); d.text((10, y + 34), sub, font=F(12), fill=(160, 180, 170))
        for i, (_, k) in enumerate(COLS):
            if cid is None: continue
            S.paste(cropAt(cid, var, k), (lw + i * cw, y))
            P = json.load(open(os.path.join(CAP, "proj", cid + ".json"))); fr = P["normal"][k]
            if fr.get("outsideControl"): d.rectangle((lw + i * cw, y, lw + (i + 1) * cw - 1, y + 7), fill=(255, 150, 70))
    d.text((10, S.height - 22), f"Magnified crops (×{MAG}, nearest-neighbour) of the actual 1× CAMERA_V1 gameplay frames — no re-render. Orange bar = outside the healthy control interval. Pink = diagnostic impactor (not a tackler).", font=F(12), fill=(160, 180, 170))
    os.makedirs(os.path.dirname(path), exist_ok=True); S.save(path, optimize=True)
SCREEN = json.load(open(os.path.join(CAP, "IFM1_SCREEN.json")))
for role, st in (("SW", "S-FLAT"), ("PL", "S-FLAT"), ("SH", "S-FLAT"), ("TP", "S-TOE")):
    rows, brows = [], []
    for b in ("R0", "RH1"):
        for m in ("C0", "N", "W", "X"):
            cid = f"C0_{b}_{st}" if m == "C0" else f"{m}_{role}_{b}"
            if cid not in clips: rows.append((f"{b} · {m}", None, "not run (not permitted / not triggered)")); continue
            sc = "" if m == "C0" else SCREEN["cells"][f"{role}/{b}"]["modes"][m]["screen"]
            sub = "no-contact control" if m == "C0" else f"vs C0, 0–50 ms: ≤ {sc['renderedJoints']['primaryMaxPx']:.2f} px rendered\n≤ {sc['evaluatorPoints']['primaryMaxPx']:.2f} px evaluator points"
            rows.append((f"{b} · {m}", cid, sub))
    for v in ("A", "B"):
        b = [k for k, x in KEY.items() if x == v][0]
        for m in ("C0", "N", "W", "X"):
            cid = f"C0_{b}_{st}" if m == "C0" else f"{m}_{role}_{b}"
            brows.append((f"version {v} · {m}", cid if cid in clips else None, "" if cid in clips else "not run"))
    sheet(rows, f"IFM-1 · {role} ({st}) · gameplay camera, normal-speed instants · R0 / RH1 × C0 / N / W / X", os.path.join(OUT, "sheets", f"{role}_sheet.png"), "lab")
    sheet(brows, f"IFM-1 · {role} ({st}) · VERSION-BLINDED A / B (fixed mapping in IFM1_BLIND_KEY.json — judge before opening)", os.path.join(OUT, "sheets", f"{role}_blind_sheet.png"), "blind")
for root, _, fs in os.walk(OUT):
    for f in sorted(fs):
        p = os.path.join(root, f); man["files"][os.path.relpath(p, OUT)] = {"bytes": os.path.getsize(p), "sha256": hashlib.sha256(open(p, "rb").read()).hexdigest()}
json.dump(man, open(os.path.join(OUT, "CLIPS_MANIFEST.json"), "w"), indent=1)
print(len(man["files"]), "files,", round(sum(v["bytes"] for v in man["files"].values()) / 1e6, 1), "MB")
