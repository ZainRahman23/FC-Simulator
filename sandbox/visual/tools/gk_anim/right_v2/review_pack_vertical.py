# REVIEW PACK — VERTICAL HIGH_CATCH jump sequence (SET → LOAD → CROUCH → PUSH → TOE-OFF → ASCENT → EXTENSION → 25° CONTACT → landing → SET)
#   python3 review_pack_vertical.py <jump_dir> <out_dir>
# jump_dir holds cap_<case>/ (capture_full.js runs), cap_OLD_V_OVER_0/ (the live path without the sequence), frames/ (author_vertical_jump output)
# A  old vs new, full animation at normal gameplay speed (side by side; 60 fps and 30 fps GIFs; 1x window and 3x keeper crop)
# B  new: 4x slow motion keeper crop
# C  complete frame strip SET → CONTACT → LAND → SET (in-engine key ticks + the authored frames)
# D  close-up of the final four ascent frames into the exact 25° contact sprite (in-engine + authored)
# E  simulation root vs presentation body trajectory (pelvis / neck / raised glove / soles), V_OVER_0 and V_EXT_245
# F  foot height + ground contact for takeoff and landing
# H  the other real HIGH_CATCH saves (small lateral offsets, higher / lower balls): key-tick strips, contact-tick sheet, 4x slow-mo GIFs
import sys, os, json, math
from PIL import Image, ImageDraw, ImageFont
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(HERE, "..", "library")); sys.path.insert(0, os.path.join(HERE, "..", "rig"))
JD, OUT = sys.argv[1], sys.argv[2]; os.makedirs(OUT, exist_ok=True)
try: F = ImageFont.truetype("/System/Library/Fonts/Menlo.ttc", 12); FB = ImageFont.truetype("/System/Library/Fonts/Menlo.ttc", 15)
except Exception: F = ImageFont.load_default(); FB = F
S_LIVE = 0.4197
FR = os.path.join(JD, "frames"); meta = json.load(open(os.path.join(FR, "frames.json"))); byk = {f["name"].split("_")[0]: f for f in meta["frames"]}
CREL = meta["contact_rel_root"]
CASES = ["V_OVER_0", "V_L03", "V_R03", "V_EXT_245", "V_HIGH_205"]
def load(case):
    d = os.path.join(JD, "cap_" + case); t = json.load(open(os.path.join(d, "trace.json"))); return d, t
def gif(frames, path, ms): frames[0].save(path, save_all=True, append_images=frames[1:], duration=ms, loop=0, optimize=False)
def label(im, txt, txt2=None):
    im = im.convert("RGB"); d = ImageDraw.Draw(im); d.rectangle([0, 0, im.width, 30 if txt2 else 16], fill=(20, 20, 20)); d.text((4, 2), txt, fill=(255, 255, 255), font=F)
    if txt2: d.text((4, 16), txt2, fill=(255, 230, 120), font=F)
    return im
def dl(e):
    a = (e.get("anim") or {}).get("art") or ""
    if e["mode"] == "post": return f"{e['drawn']} +{e['tl']:.2f} s"
    if e["mode"] == "frame": return f"{e['drawn']} u {e['u']:.2f}"
    if "SAVE POSE" in a: return "CONTACT POSE (live PNG)"
    return "LIVE " + a[:26]
def crop_at(img, clip, sp, w, h, zoom, up=0.82):
    cx, cy = sp[0] - clip["x"], sp[1] - clip["y"]; x0, y0 = int(round(cx - w / 2)), int(round(cy - h * up))
    return img.crop((x0, y0, x0 + w, y0 + h)).resize((w * zoom, h * zoom), Image.NEAREST), (x0, y0)
def marks(im, e, clip, x0, y0, zoom):
    d = ImageDraw.Draw(im); sp = e["sp"]; cx, cy = (sp[0] - clip["x"] - x0) * zoom, (sp[1] - clip["y"] - y0) * zoom
    d.line([(0, cy), (im.width, cy)], fill=(200, 200, 200), width=1); d.line([(cx - 6, cy), (cx + 6, cy)], fill=(255, 60, 60), width=2); d.line([(cx, cy - 6), (cx, cy + 6)], fill=(255, 60, 60), width=2)
    hn = e.get("handSp"); bq = e.get("ballSp")
    if hn: hx, hy = (hn[0] - clip["x"] - x0) * zoom, (hn[1] - clip["y"] - y0) * zoom; d.ellipse([hx - 7, hy - 7, hx + 7, hy + 7], outline=(255, 240, 0), width=2)
    if bq: bx, by = (bq[0] - clip["x"] - x0) * zoom, (bq[1] - clip["y"] - y0) * zoom; d.ellipse([bx - 9, by - 9, bx + 9, by + 9], outline=(255, 255, 255), width=1)
    return im
def frames_of(d, t, f0=None, f1=None):
    tr = t["trace"]; out = []
    for e in tr:
        if f0 is not None and e["f"] < f0: continue
        if f1 is not None and e["f"] > f1: continue
        p = os.path.join(d, f"new_{e['f']:03d}.png")
        if os.path.exists(p): out.append((e, Image.open(p).convert("RGB")))
    return out

# ── A: old vs new at normal speed ──────────────────────────────────────────────────────────────────────────────────────────────
dN, tN = load("V_OVER_0"); dO, tO = load("OLD_V_OVER_0")
fN = frames_of(dN, tN); fO = frames_of(dO, tO); n = max(len(fN), len(fO))
def side(i, zoom):
    eO, iO = fO[min(i, len(fO) - 1)]; eN, iN = fN[min(i, len(fN) - 1)]
    if zoom == 1: a, b = iO.copy(), iN.copy()
    else: a, _ = crop_at(iO, tO["clip"], eO["sp"], 110, 100, zoom, 0.78); b, _ = crop_at(iN, tN["clip"], eN["sp"], 110, 100, zoom, 0.78)
    a = label(a, f"OLD (live path, no sequence)  tick {eO['f']}", dl(eO)); b = label(b, f"NEW (jump sequence)  tick {eN['f']}", dl(eN))
    sh = Image.new("RGB", (a.width + b.width + 6, max(a.height, b.height)), (20, 20, 20)); sh.paste(a, (0, 0)); sh.paste(b, (a.width + 6, 0)); return sh
A1 = [side(i, 1) for i in range(n)]; gif(A1, os.path.join(OUT, "A_old_vs_new_normal_speed_60fps.gif"), 17); gif(A1, os.path.join(OUT, "A_old_vs_new_30fps.gif"), 33)
A3 = [side(i, 3) for i in range(n)]; gif(A3, os.path.join(OUT, "A_old_vs_new_keeper3x_normal_speed.gif"), 17)
print("A", len(A1), "frames")
# ── B: 4x slow motion keeper crop (new) ────────────────────────────────────────────────────────────────────────────────────────
cm, ct = tN["committedTick"], tN["contactTick"]
B = []
for e, im in frames_of(dN, tN, cm - 4, (tN["backToSet"] or ct + 45) + 6):
    c, (x0, y0) = crop_at(im, tN["clip"], e["sp"], 80, 84, 4, 0.8); c = marks(c, e, tN["clip"], x0, y0, 4)
    ik = e.get("ikPlace"); off = e.get("off"); l2 = dl(e) + (f"   hand-led ({ik['dx']},{ik['dy']}) raw {ik['raw']} res {ik['res']}" if ik else "") + (f"   carry ({off['dx']},{off['dy']})" if off else "") + ("   ◀ BALL CONTACT" if e["f"] == ct else "")
    B.append(label(c, f"4x slow motion  tick {e['f']}  ({(e['f'] - ct) / 60:+.3f} s from contact)", l2))
gif(B, os.path.join(OUT, "B_new_4x_slowmo_keeper.gif"), 67); print("B", len(B), "frames")
# ── C: complete frame strip (in-engine key ticks) + authored frames ────────────────────────────────────────────────────────────
def key_ticks(t):
    picks = []; seen = None
    for e in t["trace"]:
        key = e["drawn"] if e["mode"] != "live" else ("LIVE:" + ((e.get("anim") or {}).get("art") or "")[:18])
        if key != seen or e["f"] == t["contactTick"]: picks.append(e)
        seen = key
    return [e for e in picks if t["committedTick"] - 1 <= e["f"] <= (t["backToSet"] or 10 ** 9) + 1]
def strip_rows(d, t, per=6, zoom=4, w=62, h=72):
    cells = []
    for e in key_ticks(t):
        im = Image.open(os.path.join(d, f"new_{e['f']:03d}.png")).convert("RGB"); c, (x0, y0) = crop_at(im, t["clip"], e["sp"], w, h, zoom, 60 / 72); c = marks(c, e, t["clip"], x0, y0, zoom)
        ik = e.get("ikPlace"); off = e.get("off")
        cells.append(label(c, f"f{e['f']} " + dl(e)[:26], (f"hand-led ({ik['dx']},{ik['dy']}) raw{ik['raw']} res{ik['res']}" if ik else "") + (f" carry ({off['dx']},{off['dy']})" if off else "") + (" BALL CONTACT" if e["f"] == t["contactTick"] else "")))
    rows = []
    for i in range(0, len(cells), per):
        part = cells[i:i + per]; sheet = Image.new("RGB", (w * zoom * per + 4 * (per - 1), h * zoom), (20, 20, 20))
        for j, c in enumerate(part): sheet.paste(c, (j * (w * zoom + 4), 0))
        rows.append(sheet)
    return rows
def authored_cell(f, zoom=4, w=62, h=72, contact=False):
    if contact:
        im = Image.open(os.path.join(HERE, "..", "..", "..", "..", "..", "assets/visual_v1/goalkeeper/contextual/VERTICAL_HIGH_CW25.png")).convert("RGBA"); an = json.load(open(os.path.join(HERE, "..", "..", "..", "..", "..", "assets/visual_v1/goalkeeper/contextual/VERTICAL_HIGH_CW25_anchors.json"))); rx, ry = an["root"]; ps = S_LIVE; name = "CONTACT VERTICAL_HIGH_CW25 (untouched PNG)"
    else: im = Image.open(os.path.join(FR, f["name"] + ".png")).convert("RGBA"); rx, ry = f["root"]; ps = S_LIVE * (f.get("pixel_scale") or 1.0); name = f["name"] + ("  u " + str(f["u"]) if f.get("u") else "  +" + str(f.get("t_post")) + " s")
    cell = Image.new("RGBA", (w * zoom, h * zoom), (40, 90, 40, 255))
    big = im.resize((max(1, round(im.width * ps * zoom)), max(1, round(im.height * ps * zoom))), Image.NEAREST)
    cell.alpha_composite(big, (round((w / 2 - rx * ps) * zoom), round((60 - ry * ps) * zoom)))
    d = ImageDraw.Draw(cell); cx, cy = w / 2 * zoom, 60 * zoom; d.line([(0, cy), (w * zoom, cy)], fill=(200, 200, 200, 120)); d.line([(cx - 6, cy), (cx + 6, cy)], fill=(255, 60, 60, 255), width=2); d.line([(cx, cy - 6), (cx, cy + 6)], fill=(255, 60, 60, 255), width=2)
    if not contact and f.get("sim_hand"): hx, hy = cx + f["sim_hand"][0] * zoom, cy + f["sim_hand"][1] * zoom; d.ellipse([hx - 7, hy - 7, hx + 7, hy + 7], outline=(255, 240, 0, 255), width=2)
    return label(cell, name[:30], (f["phase"][:30] if not contact else "25° CW, scale 1.00, glove-root"))
rows = strip_rows(dN, tN)
auth = [authored_cell(byk[k]) for k in ("J01", "J02", "J03", "J04", "J05", "J06", "J07", "J08")] + [authored_cell(None, contact=True)] + [authored_cell(byk[k]) for k in ("L01", "L02", "L03", "L04", "L05", "L06", "L07", "L08")]
arows = []
for i in range(0, len(auth), 6):
    part = auth[i:i + 6]; sheet = Image.new("RGB", (62 * 4 * 6 + 20, 72 * 4), (20, 20, 20))
    for j, c in enumerate(part): sheet.paste(c, (j * (62 * 4 + 4), 0))
    arows.append(sheet)
W = max(r.width for r in rows + arows); H = 40 + sum(r.height + 6 for r in rows) + 30 + sum(r.height + 6 for r in arows)
sheet = Image.new("RGB", (W + 12, H + 12), (22, 22, 22)); d = ImageDraw.Draw(sheet)
d.text((8, 6), "C — SET → LOAD → CROUCH → PUSH → TOE-OFF → ASCENT → EXTENSION → LATE → 25° CONTACT → follow-through → settle → load → absorb → step → step → ready → SET   (V_OVER_0, in-engine, first tick of every frame; red + = simulation root, yellow ○ = simulation hand, white ○ = ball)", fill=(255, 255, 255), font=FB)
y = 34
for r in rows: sheet.paste(r, (6, y)); y += r.height + 6
d.text((8, y + 4), "authored frames at live scale (red + = planted root; yellow ○ = the simulation hand for the frame's u)", fill=(255, 230, 120), font=FB); y += 30
for r in arows: sheet.paste(r, (6, y)); y += r.height + 6
sheet.save(os.path.join(OUT, "C_frame_strip_SET_CONTACT_LAND_SET.png")); print("C", sheet.size)
# ── D: close-up of the final four ascent frames into the exact contact sprite ───────────────────────────────────────────────────
Z = 6; w, h = 46, 62; cells = []
first = {}
for e in tN["trace"]:
    if e["mode"] == "frame" and e["drawn"] in ("J05", "J06", "J07", "J08") and e["drawn"] not in first: first[e["drawn"]] = e
for k in ("J05", "J06", "J07", "J08"):
    e = first[k]; im = Image.open(os.path.join(dN, f"new_{e['f']:03d}.png")).convert("RGB"); c, (x0, y0) = crop_at(im, tN["clip"], e["sp"], w, h, Z, 0.9); c = marks(c, e, tN["clip"], x0, y0, Z); ik = e["ikPlace"]
    cells.append(label(c, f"{k}  tick {e['f']}  u {e['u']:.2f}", f"hand-led pull ({ik['dx']},{ik['dy']}) raw {ik['raw']} → res {ik['res']} (sprite px)"))
e = tN["trace"][ct]; im = Image.open(os.path.join(dN, f"new_{e['f']:03d}.png")).convert("RGB"); c, (x0, y0) = crop_at(im, tN["clip"], e["sp"], w, h, Z, 0.9); c = marks(c, e, tN["clip"], x0, y0, Z)
pl = (e.get("anim") or {}).get("place") or {}; cells.append(label(c, f"CONTACT (live PNG)  tick {e['f']}", f"placement ({pl.get('dx')},{pl.get('dy')}) raw {pl.get('raw')} res {pl.get('res')}   BALL CONTACT"))
acells = [authored_cell(byk[k], zoom=Z, w=w, h=h) for k in ("J05", "J06", "J07", "J08")] + [authored_cell(None, zoom=Z, w=w, h=h, contact=True)]
sheet = Image.new("RGB", (w * Z * 5 + 4 * 4 + 12, 40 + h * Z * 2 + 40), (22, 22, 22)); d = ImageDraw.Draw(sheet)
d.text((8, 6), "D — the final four ascent frames into the exact 25° contact sprite (6x). Top: in-engine (V_OVER_0). Bottom: the authored frames (contact parts, rolled −18/−11/−6/−2° from the art) and the untouched PNG.", fill=(255, 255, 255), font=FB)
for j, c in enumerate(cells): sheet.paste(c, (6 + j * (w * Z + 4), 30))
for j, c in enumerate(acells): sheet.paste(c, (6 + j * (w * Z + 4), 30 + h * Z + 34))
sheet.save(os.path.join(OUT, "D_closeup_final_four_ascent.png")); print("D", sheet.size)
# ── E + F: trajectories (drawn body vs simulation root) and foot heights from the rigs ──────────────────────────────────────────
from rig_w_set import build as build_set
from rig_vertical_cw25 import build as build_vert
from gk_rig import mat_apply
RS, _ = build_set(OUT); RV, _ = build_vert(True)
def lowest(R, pose, parts, off):
    M = R.world(pose); best = {}
    for n in parts:
        p = R.parts[n]; lo = None
        for (x, y) in p.pixels:
            u, v = mat_apply(M[n], x + 0.5, y + 0.5); v += off[1]; u += off[0]
            if lo is None or v > lo[1]: lo = (u, v)
        best[n] = lo
    return best
SOLES = {}   # frame key → {label: (x, y) live px rel root}
for f in meta["frames"]:
    k = f["name"].split("_")[0]; rx, ry = f["root"]
    if f["rig"] == RS.name:
        off = tuple(meta["offset_set"]); lo = lowest(RS, f["pose"] | {"near_thigh_edge": f["pose"].get("near_thigh", {}), "torso_under": f["pose"].get("torso", {})}, ("near_boot", "far_boot"), off); ps = S_LIVE
        SOLES[k] = {"R (north)": ((lo["near_boot"][0] - rx) * ps, (lo["near_boot"][1] - ry) * ps), "L (south)": ((lo["far_boot"][0] - rx) * ps, (lo["far_boot"][1] - ry) * ps)}
    else:
        off = tuple(meta["offset_contact"]); lo = lowest(RV, f["pose"], ("legs_lower",), off); ps = S_LIVE * f.get("pixel_scale", 1.0)
        SOLES[k] = {"both (side view)": ((lo["legs_lower"][0] - rx) * ps, (lo["legs_lower"][1] - ry) * ps)}
lo = lowest(RS, {}, ("near_boot", "far_boot"), tuple(meta["offset_set"])); rx, ry = 63 + meta["offset_set"][0], 115 + meta["offset_set"][1]
SET_SOLES = {"R (north)": ((lo["near_boot"][0] - rx) * S_LIVE, (lo["near_boot"][1] - ry) * S_LIVE), "L (south)": ((lo["far_boot"][0] - rx) * S_LIVE, (lo["far_boot"][1] - ry) * S_LIVE)}
CON_SOLE = tuple(CREL["sole"]); SETLM = {"pelvis": (1.7, -18.9), "neck": (1.3, -33.6), "glove": (-3.5, -20.5)}
def drawn_series(t):
    rows = []
    for e in t["trace"]:
        if e["f"] < t["committedTick"] - 3 or e["f"] > (t["backToSet"] or 10 ** 9) + 4: continue
        sp = e["sp"]; k = e["drawn"] if e["mode"] != "live" else None
        if k and k in byk:
            f = byk[k]; s = f["screen"]; pl = e.get("ikPlace") or e.get("off") or {"dx": 0, "dy": 0}; dx, dy = pl.get("dx", 0), pl.get("dy", 0)
            rows.append({"f": e["f"], "key": k, "pelvis": (s["pelvis"][0] + dx, s["pelvis"][1] + dy), "neck": (s["head"][0] + dx, s["head"][1] + dy), "glove": (s["lead_glove"][0] + dx, s["lead_glove"][1] + dy), "soles": {n: (v[0] + dx, v[1] + dy) for n, v in SOLES[k].items()}, "grounded": f.get("grounded"), "sp": sp, "hand": [e["handSp"][0] - sp[0], e["handSp"][1] - sp[1]] if e.get("handSp") else None})
        else:
            a = (e.get("anim") or {}); art = a.get("art") or ""; pl = a.get("place") or {"dx": 0, "dy": 0}; dx, dy = pl.get("dx") or 0, pl.get("dy") or 0
            if "SAVE POSE" in art: rows.append({"f": e["f"], "key": "CONTACT", "pelvis": (CREL["pelvis"][0] + dx, CREL["pelvis"][1] + dy), "neck": (CREL["shoulder"][0] + dx, CREL["shoulder"][1] + dy), "glove": (CREL["glove"][0] + dx, CREL["glove"][1] + dy), "soles": {"both (side view)": (CON_SOLE[0] + dx, CON_SOLE[1] + dy)}, "grounded": "both feet (contact art)", "sp": sp, "hand": [e["handSp"][0] - sp[0], e["handSp"][1] - sp[1]] if e.get("handSp") else None})
            else: rows.append({"f": e["f"], "key": "SET", "pelvis": SETLM["pelvis"], "neck": SETLM["neck"], "glove": SETLM["glove"], "soles": dict(SET_SOLES), "grounded": "both feet (SET)", "sp": sp, "hand": None})
    return rows
import matplotlib; matplotlib.use("Agg"); import matplotlib.pyplot as plt
def plot_E(case, t, ax1, ax2):
    rows = drawn_series(t); fs = [r["f"] for r in rows]; ct = t["contactTick"]; cm = t["committedTick"]
    sx = [r["sp"][0] - rows[0]["sp"][0] for r in rows]; sy = [r["sp"][1] - rows[0]["sp"][1] for r in rows]
    for ax, comp, lab in ((ax1, 0, "screen x (px, + = right)"), (ax2, 1, "screen y (px, + = down)")):
        base = [r["sp"][comp] - rows[0]["sp"][comp] for r in rows]
        ax.plot(fs, base, "k-", lw=2.5, label="simulation root (feet)")
        for key, col in (("pelvis", "tab:blue"), ("neck", "tab:purple"), ("glove", "tab:pink")):
            ax.plot(fs, [b + r[key][comp] for b, r in zip(base, rows)], "-", color=col, lw=1.4, label=f"drawn {key}")
        ax.plot(fs, [b + (list(r["soles"].values())[-1][comp]) for b, r in zip(base, rows)], "-", color="tab:green", lw=1.4, label="drawn sole (south / both)")
        hs = [(f, b + r["hand"][comp]) for f, b, r in zip(fs, base, rows) if r["hand"]]; ax.plot([q[0] for q in hs], [q[1] for q in hs], "--", color="gold", lw=1.2, label="simulation hand")
        ax.axvline(cm, color="grey", ls=":"); ax.axvline(ct, color="red", ls="--", label="ball contact tick"); ax.axvline(t["backToSet"], color="grey", ls=":")
        ax.set_xlabel("tick (60 Hz)"); ax.set_ylabel(lab + "  (rel. the SET root)"); ax.grid(alpha=0.3); ax.set_title(f"{case}: {lab}")
        if comp == 1: ax.invert_yaxis()
    ax1.legend(fontsize=7, loc="upper right")
fig, axs = plt.subplots(2, 2, figsize=(16, 10))
_, tE = load("V_EXT_245"); plot_E("V_OVER_0 (lat 0, z 2.25 m: root fixed, standing reach)", tN, axs[0][0], axs[0][1]); plot_E("V_EXT_245 (lat 0.25, z 2.45 m: root steps 0.14 m, higher ball)", tE, axs[1][0], axs[1][1])
fig.suptitle("E — simulation root (never moved by the presentation) vs the drawn body: pelvis, neck, raised glove, sole; the glove meets the simulation hand at contact", fontsize=12); fig.tight_layout(); fig.savefig(os.path.join(OUT, "E_root_vs_body_trajectory.png"), dpi=110); plt.close(fig)
# F: foot heights
fig, axs = plt.subplots(2, 1, figsize=(16, 9), sharex=False)
for ax, (case, t) in zip(axs, (("V_OVER_0", tN), ("V_EXT_245", tE))):
    rows = drawn_series(t); ct = t["contactTick"]; cm = t["committedTick"]
    series = {}
    for r in rows:
        for n, v in r["soles"].items(): series.setdefault(n, []).append((r["f"], -v[1]))
    for n, col in (("L (south)", "tab:green"), ("R (north)", "tab:olive"), ("both (side view)", "tab:red")):
        if n in series: ax.plot([q[0] for q in series[n]], [q[1] for q in series[n]], "o-", ms=3, color=col, label=f"sole {n}: height above the root line")
    ax.axhline(0, color="k", lw=1, label="root line (SET south sole)"); ax.axhline(-SET_SOLES["R (north)"][1], color="grey", lw=0.8, ls=":", label="SET north sole (depth offset)"); ax.axhline(-CON_SOLE[1], color="red", lw=0.8, ls=":", label="contact art sole (landing spot)")
    ax.axvline(cm, color="grey", ls=":"); ax.axvline(ct, color="red", ls="--", label="ball contact")
    for r in rows:
        g = r["grounded"] or ""; ax.text(r["f"], 7.2, ("air" if g.startswith("airborne") else ("toe" if "toe" in g else ("1ft" if "in the air" in g else "both"))), fontsize=6, rotation=90, ha="center", va="bottom", color=("tab:red" if g.startswith("airborne") else "k"))
    ax.set_ylim(-8, 10); ax.set_xlabel("tick"); ax.set_ylabel("sole height (live px, + = up)"); ax.set_title(f"F — {case}: takeoff and landing (label above each tick = authored ground state: both / toe / air / 1ft)"); ax.grid(alpha=0.3); ax.legend(fontsize=7, loc="lower right")
fig.tight_layout(); fig.savefig(os.path.join(OUT, "F_foot_height_ground_contact.png"), dpi=110); plt.close(fig)
json.dump({case: drawn_series(t) for case, t in (("V_OVER_0", tN), ("V_EXT_245", tE))}, open(os.path.join(OUT, "EF_series.json"), "w"), indent=1)
print("E/F written")
# ── H: the other cases ─────────────────────────────────────────────────────────────────────────────────────────────────────────
contact_cells = []
for case in CASES:
    d, t = load(case); rows = strip_rows(d, t)
    sheet = Image.new("RGB", (max(r.width for r in rows) + 12, 34 + sum(r.height + 6 for r in rows)), (22, 22, 22)); dd = ImageDraw.Draw(sheet); dd.text((8, 6), f"H — {case}: in-engine key ticks (shot {json.dumps(t['shot']['synth'])})", fill=(255, 255, 255), font=FB); y = 30
    for r in rows: sheet.paste(r, (6, y)); y += r.height + 6
    sheet.save(os.path.join(OUT, f"H_strip_{case}.png"))
    ct = t["contactTick"]; e = t["trace"][ct]; im = Image.open(os.path.join(d, f"new_{ct:03d}.png")).convert("RGB"); c, (x0, y0) = crop_at(im, t["clip"], e["sp"], 70, 80, 4, 0.82); c = marks(c, e, t["clip"], x0, y0, 4)
    pl = (e.get("anim") or {}).get("place") or {}; contact_cells.append(label(c, f"{case}  contact tick {ct}  {e['contact']['outcome']}", f"lat {t['shot']['synth']['lat']} z {t['shot']['synth']['z']} v {t['shot']['synth']['v']}  place ({pl.get('dx')},{pl.get('dy')}) raw {pl.get('raw')}"))
    B2 = []
    for e, im in frames_of(d, t, t["committedTick"] - 4, (t["backToSet"] or ct + 45) + 6):
        c, (x0, y0) = crop_at(im, t["clip"], e["sp"], 80, 84, 4, 0.8); c = marks(c, e, t["clip"], x0, y0, 4); B2.append(label(c, f"{case} 4x slow  tick {e['f']}", dl(e) + ("   ◀ BALL CONTACT" if e["f"] == ct else "")))
    gif(B2, os.path.join(OUT, f"H_4x_slowmo_{case}.gif"), 67)
sheet = Image.new("RGB", (280 * len(contact_cells) + 4 * (len(contact_cells) - 1) + 12, 320 + 36), (22, 22, 22)); dd = ImageDraw.Draw(sheet); dd.text((8, 6), "H — contact tick on every captured HIGH_CATCH save (4x): the drawn raised glove on the simulation hand (yellow ○) with the ball (white ○); red + = simulation root", fill=(255, 255, 255), font=FB)
for j, c in enumerate(contact_cells): sheet.paste(c, (6 + j * 284, 30))
sheet.save(os.path.join(OUT, "H_contact_ticks_all_cases.png")); print("H done")
