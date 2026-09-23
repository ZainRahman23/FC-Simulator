#!/usr/bin/env python3
"""Arm-transition pass: media (3-way sheets BEFORE previous fix → CURRENT body-fixed/arm-broken → AFTER arm correction, gifs, overlay strips, front view) + clearance tables → adds to review_artifacts/gk_far_lateral."""
import json, os, glob, re, math, sys
from PIL import Image, ImageDraw, ImageFont
sys.path.insert(0, "/private/tmp/claude-501/-Users-zainrahman/8e9ca3e0-10ae-4213-9c09-3ee98f6500ac/scratchpad")
import arm_gate as G
S = "/private/tmp/claude-501/-Users-zainrahman/8e9ca3e0-10ae-4213-9c09-3ee98f6500ac/scratchpad"
R = "/Users/zainrahman/Downloads/FC Simulator/review_artifacts/gk_far_lateral"; M = R + "/media"; V = R + "/verification"
F = lambda sz=12: ImageFont.truetype("/System/Library/Fonts/Menlo.ttc", sz)
def frames(d, kind="crop"): fs = sorted(glob.glob(f"{d}/3d_*_{kind}_t*.png")); return [(int(re.search(r"_t(\d+)\.png$", f).group(1)), f) for f in fs]
have = lambda d: os.path.isdir(d) and bool(frames(d))
def gif(out, fr, fps, label, scale=2, t0=0, t1=10**9, crop=None):
    ims = []
    for t, f in fr:
        if t < t0 or t > t1: continue
        im = Image.open(f).convert("RGB")
        if crop: im = im.crop(crop)
        im = im.resize((im.width * scale, im.height * scale), Image.NEAREST); ImageDraw.Draw(im).text((4, 4), "%s  tick %d  t=%.2f s" % (label, t, t / 60), font=F(11), fill=(255, 255, 255)); ims.append(im)
    if ims: ims[0].save(out, save_all=True, append_images=ims[1:], duration=int(1000 / fps), loop=0, optimize=False); return len(ims)
def sheet(out, rows, ticks, title, scale=2, labels=None, crop=None):
    data = []
    for label, fr in rows:
        fd = dict(fr); imgs = []
        for t in ticks:
            if t in fd: im = Image.open(fd[t]).convert("RGB"); imgs.append((t, im.crop(crop) if crop else im))
        if imgs: data.append((label, imgs))
    if not data: return None
    w, h = data[0][1][0][1].size; W = 190 + len(ticks) * (w * scale + 6); H = 34 + len(data) * (h * scale + 30)
    im = Image.new("RGB", (W, H), (18, 21, 26)); d = ImageDraw.Draw(im); d.text((8, 8), title, font=F(13), fill=(255, 220, 120))
    for ri, (label, imgs) in enumerate(data):
        y = 34 + ri * (h * scale + 30)
        for li, ln in enumerate(label.split("\n")): d.text((8, y + h * scale // 2 - 14 + 13 * li), ln, font=F(11), fill=(255, 255, 255))
        for ci, (t, img) in enumerate(imgs):
            x = 190 + ci * (w * scale + 6); im.paste(img.resize((w * scale, h * scale), Image.NEAREST), (x, y)); lab = "tick %d" % t + ((" " + labels[t]) if labels and t in labels else ""); d.text((x, y + h * scale + 3), lab[:30], font=F(10), fill=(180, 180, 180))
    im.save(out); return im.size
D = lambda tag: f"{S}/lt_{tag}"
def layers(path):
    try: return {str(r["idx"]): r for r in json.load(open(path))}
    except Exception: return {}
LF = layers(S + "/layers_armF_courtois.json")
def keyticks(rec, upto="ABSORB"):
    ks = {}; last = None; lastS = None
    for r in rec["rows"]:
        ph = r.get("sub") or r.get("phase")
        if r.get("mode") == "pre" and ph != last: ks.setdefault(ph, r["k"]); last = ph
        st = r.get("landing")
        if isinstance(st, dict) and st.get("L") and st["L"].get("stage") and st["L"]["stage"] != lastS: ks.setdefault(st["L"]["stage"], r["k"]); lastS = st["L"]["stage"]
    order = ["LOAD", "PLANT", "PUSH_MID", "PUSH_END", "TOE_OFF", "EARLY_FLIGHT", "MID_FLIGHT", "FULL_EXTENSION", "DESCENT", "IMPACT", "ABSORB"]
    sel = [(ks[n], n) for n in order if n in ks]; sel.sort(); ticks = []; labels = {}
    for t, n in sel:
        if t not in ticks: ticks.append(t); labels[t] = n
        else: labels[t] += "/" + n
    return ticks, labels
made = {}
UB = (30, 20, 190, 180)   # upper-body crop of the 220 px close frame
for sc in ("15", "13"):
    rec = LF.get(sc); ticks, labels = keyticks(rec) if rec else ([36, 40, 43, 46, 48, 52, 56, 62, 68, 74], {})
    dense = sorted(set(ticks + [t + 2 for t in ticks if labels.get(t) in ("PUSH_MID", "PUSH_END", "TOE_OFF", "EARLY_FLIGHT")]))
    rows = [("1 BEFORE\n(previous resolver)", frames(D(f"{sc}_before_cl"))), ("2 CURRENT\n(body fixed,\narm through\nabdomen)", frames(D(f"{sc}_armbroken_cl"))), ("3 AFTER\n(arm correction)", frames(D(f"{sc}_arm_cl")))]
    rows = [r for r in rows if r[1]]; o = made.setdefault(sc, {})
    if rows:
        sheet(f"{M}/{sc}_arm_3way.png", rows, dense, f"fixture {sc} — arm transition: BEFORE previous fix → CURRENT (body fixed, arm broken) → AFTER arm correction (close rig, upper body ×2)", 2, labels, UB); o["3way"] = f"media/{sc}_arm_3way.png"
        for lab, fr, key in (("before", rows[0][1], "gif_before"), ("current", rows[1][1] if len(rows) > 2 else None, "gif_current"), ("after", rows[-1][1], "gif_after")):
            if fr: gif(f"{M}/{sc}_arm_{lab}_x1.gif", fr, 60, f"{sc} {lab} 1×", 2, 0, 130); gif(f"{M}/{sc}_arm_{lab}_x4.gif", fr, 15, f"{sc} {lab} ¼ speed", 2, max(0, ticks[0] - 8), ticks[-1] + 10); o[key] = f"media/{sc}_arm_{lab}_x1.gif"; o[key + "_slow"] = f"media/{sc}_arm_{lab}_x4.gif"
    fr_rows = [("1 BEFORE", frames(D(f"{sc}_before_fr"))), ("2 CURRENT", frames(D(f"{sc}_armbroken_fr"))), ("3 AFTER", frames(D(f"{sc}_arm_fr")))]; fr_rows = [r for r in fr_rows if r[1]]
    if fr_rows:
        sheet(f"{M}/{sc}_arm_front_3way.png", fr_rows, dense, f"fixture {sc} — front three-quarter close view (camera beyond the goal line): BEFORE → CURRENT → AFTER", 2, labels); o["front3way"] = f"media/{sc}_arm_front_3way.png"
        for lab, fr in fr_rows: gif(f"{M}/{sc}_arm_front_{lab[2:].lower()}_x4.gif", fr, 15, f"{sc} front {lab[2:]} ¼ speed", 2); o["front_" + lab[2:].lower()] = f"media/{sc}_arm_front_{lab[2:].lower()}_x4.gif"
    ov = [("CURRENT\n(arm broken)", frames(D(f"{sc}_armbroken_ov"))), ("AFTER", frames(D(f"{sc}_arm_ov")))]; ov = [r for r in ov if r[1]]
    if ov:
        sheet(f"{M}/{sc}_arm_overlay.png", ov, dense, f"fixture {sc} — self-collision volumes: torso (abdomen / chest / neck / head, white), arm segments coloured by clearance (green ≥ 2 cm, yellow 0–2 cm, red = penetration); shoulder / elbow / wrist rings", 2, labels); o["overlay"] = f"media/{sc}_arm_overlay.png"
        gif(f"{M}/{sc}_arm_overlay_after_x4.gif", ov[-1][1], 15, f"{sc} AFTER overlay ¼ speed", 2); o["overlay_gif"] = f"media/{sc}_arm_overlay_after_x4.gif"
        if len(ov) > 1: gif(f"{M}/{sc}_arm_overlay_current_x4.gif", ov[0][1], 15, f"{sc} CURRENT overlay ¼ speed", 2); o["overlay_gif_current"] = f"media/{sc}_arm_overlay_current_x4.gif"
    if have(D(f"{sc}_arm_gp")): gif(f"{M}/{sc}_arm_game.gif", frames(D(f"{sc}_arm_gp"), "full"), 60, f"{sc} AFTER gameplay 1:1", 1, 0, 179); o["game"] = f"media/{sc}_arm_game.gif"
# control: fixture 2 unchanged (pixel identity vs the previous pass capture) + its overlay
if have(D("2_arm_cl")) and have(D("2_cl")):
    a, b = dict(frames(D("2_arm_cl"))), dict(frames(D("2_cl"))); same = 0; diff = []
    for t in a:
        if t in b:
            ia, ib = Image.open(a[t]).convert("RGB"), Image.open(b[t]).convert("RGB")
            if list(ia.getdata()) == list(ib.getdata()): same += 1
            else: diff.append(t)
    made["2"] = {"identical": same, "diff": diff, "n": len(a)}
    rec2 = LF.get("2"); t2, l2 = keyticks(rec2) if rec2 else ([37, 43, 49, 55, 63, 70, 80, 90], {})
    sheet(f"{M}/2_arm_control.png", [("fixture 2\n(previous pass)", frames(D("2_cl"))), ("fixture 2\n(this pass)", frames(D("2_arm_cl")))], t2, "fixture 2 — CONTROL (below the lateral regime): this pass vs the previous pass, key phases (close rig)", 2, l2); made["2"]["sheet"] = "media/2_arm_control.png"
    if have(D("2_arm_ov")): sheet(f"{M}/2_arm_overlay.png", [("fixture 2", frames(D("2_arm_ov")))], t2, "fixture 2 — self-collision volumes (unchanged authored V6 arm path: the trailing arm crosses the chest here too — approved high-dive regime, not touched)", 2, l2); made["2"]["overlay"] = "media/2_arm_overlay.png"
# mirror (left dive) + test rig
LA = layers(S + "/layers_armF_adhoc.json"); rec6 = LA.get("adhoc6"); t6, l6 = keyticks(rec6) if rec6 else ([9, 12, 14, 15, 19, 20, 26, 32], {})
if have(D("a1_6_arm_cl")): sheet(f"{M}/a1_6_arm_strip.png", [("fixture-15 mirror\nLEFT dive", frames(D("a1_6_arm_cl")))], t6, "fixture-15-like mirror LEFT (lat −1.9 z 1.45 v 22) — AFTER arm correction, key phases (close rig)", 2, l6); made["a1_6"] = {"strip": "media/a1_6_arm_strip.png"}
if have(D("a1_6_arm_ov")): sheet(f"{M}/a1_6_arm_overlay.png", [("mirror LEFT", frames(D("a1_6_arm_ov")))], t6, "mirror LEFT — self-collision volumes AFTER", 2, l6); made["a1_6"]["overlay"] = "media/a1_6_arm_overlay.png"; gif(f"{M}/a1_6_arm_x4.gif", frames(D("a1_6_arm_cl")), 15, "mirror L ¼ speed", 2, 0, 90); made["a1_6"]["gif"] = "media/a1_6_arm_x4.gif"
LT = layers(S + "/layers_armF_test.json"); rt = LT.get("15"); tt, lt = keyticks(rt) if rt else ([36, 40, 43, 46, 48, 52, 56, 62], {})
rows = [("test rig CURRENT\n(arm broken)", frames(D("15_TEST_armbroken_cl"))), ("test rig AFTER", frames(D("15_TEST_arm_cl")))]; rows = [r for r in rows if r[1]]
if rows: sheet(f"{M}/15_TEST_arm.png", rows, tt, "fixture 15 — shared test rig (H 1.83): CURRENT vs AFTER arm correction (upper body ×2)", 2, lt, UB); made["15"]["test"] = "media/15_TEST_arm.png"
if have(D("13_TEST_arm_cl")): rt13 = LT.get("13"); tt13, lt13 = keyticks(rt13) if rt13 else (tt, lt); sheet(f"{M}/13_TEST_arm.png", [("test rig AFTER", frames(D("13_TEST_arm_cl")))], tt13, "fixture 13 — shared test rig AFTER", 2, lt13, UB); made["13"]["test"] = "media/13_TEST_arm.png"
json.dump(made, open(S + "/arm_made.json", "w"), indent=1); print(json.dumps({k: (v if k == "2" else list(v.keys())) for k, v in made.items()}))
