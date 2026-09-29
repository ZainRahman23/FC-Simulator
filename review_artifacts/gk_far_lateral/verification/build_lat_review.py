#!/usr/bin/env python3
"""GK far-LATERAL dive review — media (gifs / strips) from the lt_* / ly_* captures + layer plots + verification tables → review_artifacts/gk_far_lateral."""
import json, os, glob, re, math, shutil, subprocess, sys
from PIL import Image, ImageDraw, ImageFont
S = "/private/tmp/claude-501/-Users-zainrahman/8e9ca3e0-10ae-4213-9c09-3ee98f6500ac/scratchpad"
R = "/Users/zainrahman/Downloads/FC Simulator/review_artifacts/gk_far_lateral"; M = R + "/media"; V = R + "/verification"; os.makedirs(M, exist_ok=True); os.makedirs(V, exist_ok=True)
F = lambda sz=12: ImageFont.truetype("/System/Library/Fonts/Menlo.ttc", sz)
def frames(d, kind): fs = sorted(glob.glob(f"{d}/3d_*_{kind}_t*.png")); return [(int(re.search(r"_t(\d+)\.png$", f).group(1)), f) for f in fs]
def gif(out, fr, fps, label, scale=1, every=1, t0=0, t1=10**9):
    ims = []
    for i, (t, f) in enumerate(fr):
        if i % every or t < t0 or t > t1: continue
        im = Image.open(f).convert("RGB")
        if scale != 1: im = im.resize((im.width * scale, im.height * scale), Image.NEAREST)
        ImageDraw.Draw(im).text((4, 4), "%s  tick %d  t=%.2f s" % (label, t, t / 60), font=F(11), fill=(255, 255, 255)); ims.append(im)
    if ims: ims[0].save(out, save_all=True, append_images=ims[1:], duration=int(1000 / fps), loop=0, optimize=False); return len(ims)
def sheet(out, rows, ticks, title, scale=1, labels=None):
    data = []
    for label, fr in rows:
        fd = dict(fr); data.append((label, [(t, Image.open(fd[t]).convert("RGB")) for t in ticks if t in fd]))
    data = [d for d in data if d[1]]
    if not data: return None
    w, h = data[0][1][0][1].size; W = 150 + len(ticks) * (w * scale + 6); H = 34 + len(data) * (h * scale + 36)
    im = Image.new("RGB", (W, H), (18, 21, 26)); d = ImageDraw.Draw(im); d.text((8, 8), title, font=F(13), fill=(255, 220, 120))
    for ri, (label, imgs) in enumerate(data):
        y = 34 + ri * (h * scale + 36); d.text((8, y + h * scale // 2 - 6), label, font=F(12), fill=(255, 255, 255))
        for ci, (t, img) in enumerate(imgs):
            x = 150 + ci * (w * scale + 6); im.paste(img.resize((w * scale, h * scale), Image.NEAREST), (x, y))
            lab = "tick %d" % t + ((" " + labels[t]) if labels and t in labels else ""); d.text((x, y + h * scale + 3), lab[:26], font=F(10), fill=(180, 180, 180))
            if labels and t in labels and len(lab) > 26: d.text((x, y + h * scale + 15), lab[26:52], font=F(10), fill=(180, 180, 180))
    im.save(out); return im.size
def side_by_side(out, gifs, labels):   # two gif frame lists → one gif with frames pasted side by side (same ticks)
    pass
D = lambda tag: f"{S}/lt_{tag}"; LY = lambda tag: f"{S}/ly_{tag}"
have = lambda d, kind: os.path.isdir(d) and bool(frames(d, kind))
def layers(path):
    try: return {str(r["idx"]): r for r in json.load(open(path))}
    except Exception: return {}
LA = layers(S + "/layers_lat_courtois.json"); LB = layers(S + "/layers_courtois.json"); LT = layers(S + "/layers_lat_test.json"); L2 = layers(S + "/layers_lat_adhoc2_courtois.json"); L1 = layers(S + "/layers_lat_adhoc_courtois.json"); LX = layers(S + "/layers_lat_extra_courtois.json"); LADV = layers(S + "/layers_lat_adv_courtois.json")
def keyticks(rec):
    """phase key ticks from a layers record: LOAD, PUSH_MID, TOE_OFF, EARLY_FLIGHT, MID_FLIGHT, FULL_EXTENSION, then IMPACT, SETTLE, BRACE, PUSH_UP"""
    if not rec: return [30, 40, 45, 50, 56, 62, 72, 84, 110, 130], {}
    ks = {}; last = None; lastS = None
    for r in rec["rows"]:
        ph = r.get("sub") or r.get("phase")
        if r.get("mode") == "pre" and ph != last: ks.setdefault(ph, r["k"]); last = ph
        st = r.get("landing")
        if st and st != lastS: ks.setdefault(st, r["k"]); lastS = st
        if r.get("contact"): ks.setdefault("CONTACT", r["k"])
    order = ["LOAD", "PLANT", "PUSH_MID", "PUSH_END", "TOE_OFF", "EARLY_FLIGHT", "MID_FLIGHT", "FULL_EXTENSION", "CONTACT", "DESCENT", "IMPACT", "ABSORB", "SETTLE", "BRACE", "PUSH_UP", "HALF_KNEEL"]
    sel = [(ks[n], n) for n in order if n in ks]; sel.sort(); ticks = []; labels = {}
    for t, n in sel:
        if t not in ticks: ticks.append(t); labels[t] = n
        else: labels[t] += "/" + n
    return ticks, labels
made = {}
def case_media(tag, title, rec, gp=None, cl=None, dbg=None, before=None):
    """A gameplay gif (normal speed), B close gif normal speed, C close slow-mo (¼), D key-phase strip, E diagnostic strip + slow gif"""
    gp = gp or D(tag + "_gp"); cl = cl or D(tag + "_cl"); dbg = dbg or D(tag + "_dbg"); out = {}
    ticks, labels = keyticks(rec)
    if have(gp, "full"): fg = frames(gp, "full"); gif(f"{M}/{tag}_A_game.gif", fg, 60, f"{tag} gameplay 1:1 (normal speed)", 1, 1); out["A"] = f"media/{tag}_A_game.gif"; sheet(f"{M}/{tag}_A_strip.png", [("gameplay", fg)], ticks, f"{title} — gameplay camera, key phases", 1, labels); out["Astrip"] = f"media/{tag}_A_strip.png"
    if have(cl, "crop"):
        fr = frames(cl, "crop"); gif(f"{M}/{tag}_B_close.gif", fr, 60, f"{tag} close (normal speed)", 2, 1); out["B"] = f"media/{tag}_B_close.gif"
        gif(f"{M}/{tag}_C_slow.gif", fr, 15, f"{tag} close (¼ speed)", 2, 1, t0=max(0, ticks[0] - 10) if ticks else 0, t1=(ticks[-1] + 20) if ticks else 10**9); out["C"] = f"media/{tag}_C_slow.gif"
        sheet(f"{M}/{tag}_D_strip.png", [(title[:18], fr)], ticks, f"{title} — key phases (close rig)", 2, labels); out["D"] = f"media/{tag}_D_strip.png"
    if have(dbg, "crop"):
        fd = frames(dbg, "crop"); gif(f"{M}/{tag}_E_diag.gif", fd, 15, f"{tag} diagnostic (¼ speed)", 2, 1); out["E"] = f"media/{tag}_E_diag.gif"
        sheet(f"{M}/{tag}_E_strip.png", [("diagnostic", fd)], ticks, f"{title} — diagnostic: sim root (authoritative), presentation root, pelvis, feet, hand target, ball", 2, labels); out["Estrip"] = f"media/{tag}_E_strip.png"
    if before and have(before, "crop") and have(cl, "crop"):
        sheet(f"{M}/{tag}_before_after.png", [("BEFORE", frames(before, "crop")), ("AFTER", frames(cl, "crop"))], ticks, f"{title} — BEFORE (previous resolver) vs AFTER (far-lateral regime rules)", 2, labels); out["BA"] = f"media/{tag}_before_after.png"
        gif(f"{M}/{tag}_before_close.gif", frames(before, "crop"), 60, f"{tag} BEFORE close (normal speed)", 2, 1); out["Bbefore"] = f"media/{tag}_before_close.gif"
        gif(f"{M}/{tag}_before_slow.gif", frames(before, "crop"), 15, f"{tag} BEFORE close (¼ speed)", 2, 1, t0=max(0, ticks[0] - 10) if ticks else 0, t1=(ticks[-1] + 20) if ticks else 10**9); out["Cbefore"] = f"media/{tag}_before_slow.gif"
        bg = D(tag + "_before_gp")
        if have(bg, "full"): gif(f"{M}/{tag}_before_game.gif", frames(bg, "full"), 60, f"{tag} BEFORE gameplay", 1, 1); out["Abefore"] = f"media/{tag}_before_game.gif"
    made[tag] = out; return out
# ─── cases ───
CASES = [
  ("15", "fixture 15 rocket top corner (UNREACHABLE, right)", LA.get("15"), dict(before=D("15_before_cl"))),
  ("13", "fixture 13 legal under-bar top corner (unreachable, right)", LA.get("13"), dict(before=D("13_before_cl"))),
  ("2", "fixture 2 high corner (CONTROL — not in the lateral regime, unchanged)", LA.get("2"), {}),
  ("42", "fixture 42 V6 reference far dive (FROZEN, unchanged)", LX.get("42") or LT.get("42"), {}),
  ("14", "fixture 14 medium-height far side (lateral regime, unreachable)", LX.get("14") or LT.get("14"), {}),
  ("39", "fixture 39 fingertip deflection (REACHABLE far corner, contact)", LX.get("39") or LT.get("39"), {}),
  ("a2_0", "reachable far corner RIGHT (lat +1.8 z 1.2 v 19) — contact", L2.get("adhoc0"), {}),
  ("a2_1", "reachable far corner LEFT (lat −1.8 z 1.2 v 19) — contact (mirror)", L2.get("adhoc1"), {}),
  ("a2_2", "near-max reach RIGHT (lat +2.1 z 1.4 v 19) — contact", L2.get("adhoc2"), {}),
  ("a2_3", "near-max reach LEFT (lat −2.1 z 1.4 v 19) — contact (mirror)", L2.get("adhoc3"), {}),
  ("a2_8", "beyond reach, fast RIGHT (lat +2.2 z 1.2 v 21)", L2.get("adhoc8"), {}),
  ("a2_9", "beyond reach, fast LEFT (lat −2.2 z 1.2 v 21) (mirror)", L2.get("adhoc9"), {}),
  ("a1_6", "fixture-15-like mirror LEFT (lat −1.9 z 1.45 v 22) — unreachable", L1.get("adhoc6"), {}),
  ("adv8", "SW-facing wide RIGHT high (lat +2.6 z 2.6 v 22) — angled facing: the lateral reads as width", LADV.get("adhoc8"), {}),
  ("adv9", "SW-facing wide LEFT high (lat −2.6 z 2.6 v 22) — angled facing (mirror)", LADV.get("adhoc9"), {}),
]
for tag, title, rec, kw in CASES: case_media(tag, title, rec, **kw)
# test rig
for sc in ("15", "13", "2"):
    d = D(f"{sc}_TEST_cl")
    if have(d, "crop"):
        ticks, labels = keyticks(LT.get(sc)); fr = frames(d, "crop"); gif(f"{M}/{sc}_TEST_close.gif", fr, 60, f"{sc} test rig close", 2); sheet(f"{M}/{sc}_TEST_strip.png", [("test rig", fr)], ticks, f"fixture {sc} — shared test rig, key phases", 2, labels); made.setdefault(sc, {})["TEST"] = f"media/{sc}_TEST_close.gif"; made[sc]["TESTstrip"] = f"media/{sc}_TEST_strip.png"
        if sc == "15" and have(D("15_TEST_before_cl"), "crop"): sheet(f"{M}/15_TEST_before_after.png", [("BEFORE", frames(D("15_TEST_before_cl"), "crop")), ("AFTER", fr)], ticks, "fixture 15 — shared test rig BEFORE vs AFTER", 2, labels); made["15"]["TESTBA"] = "media/15_TEST_before_after.png"
# layer isolation sheets (15 and 2): auth (ly_*_auth, unchanged code path) + redir/launch/noik/final (lt_*_ly_*)
for sc in ("15", "2"):
    ticks, labels = keyticks(LA.get(sc)); rows = []
    if have(LY(f"{sc}_auth"), "crop"): rows.append(("1 authored V6 keys\n+ sim root only", frames(LY(f"{sc}_auth"), "crop")))
    for pre, lab in (("redir", "2 + axis redirect"), ("launch", "3 + launch / landing\n  plan pelvis"), ("noik", "4 + torso assist"), ("final", "5 + glove IK (final)")):
        if have(D(f"{sc}_ly_{pre}"), "crop"): rows.append((lab, frames(D(f"{sc}_ly_{pre}"), "crop")))
    if rows: sheet(f"{M}/{sc}_layers_strip.png", rows, [t for t in ticks if t <= 150], f"fixture {sc} — the resolver layers switched on one at a time (close rig, Courtois)", 2, labels); made.setdefault(sc, {})["layers"] = f"media/{sc}_layers_strip.png"
    if have(LY(f"{sc}_auth"), "crop"): gif(f"{M}/{sc}_auth_slow.gif", frames(LY(f"{sc}_auth"), "crop"), 15, f"{sc} AUTHORED ONLY (¼ speed)", 2, 1, 20, 150); made[sc]["authgif"] = f"media/{sc}_auth_slow.gif"
# fixture 2 unchanged beside the new lateral result
if have(D("2_cl"), "crop") and have(D("15_cl"), "crop"):
    t2, l2 = keyticks(LA.get("2")); t15, l15 = keyticks(LA.get("15"))
    sheet(f"{M}/2_vs_15_strip.png", [("fixture 2 (control)", frames(D("2_cl"), "crop"))], t2, "fixture 2 control (unchanged) — key phases", 2, l2)
    made.setdefault("2", {})["vs15"] = "media/2_vs_15_strip.png"
# layer plots (svg) → copy
os.makedirs(M + "/plots", exist_ok=True)
for f in glob.glob(S + "/lat_plots/*.svg"): shutil.copy(f, M + "/plots/" + os.path.basename(f))
json.dump(made, open(S + "/lat_made.json", "w"), indent=1); print("media:", {k: len(v) for k, v in made.items()})
