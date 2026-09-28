"""SLIDE CONTACT GEOMETRY V1.2 — builds review_artifacts/slide_contact_v1_2/index.html from the runs.
    python3 of_slide_review.py <media dir> <gates dir> <ccd.json> <perf.json> <out dir>
Every number is read from the simulation's own records (TACKLE / TACKLE_BODY_CONTACT / PLAYER_CONTACT events, the challenge contact history,
the contact-tick measurement of the final rendered leg, the per-tick rendered geometry of of_slide_geo.js) and from the gate / CCD / perf runs;
the media are composed here."""
import sys, os, json, math, glob, subprocess, html
from PIL import Image, ImageDraw

M, GD, CCD, PERF, OUT = sys.argv[1:6]; IMG = os.path.join(OUT, "img"); os.makedirs(IMG, exist_ok=True)
HERE = os.path.dirname(os.path.abspath(__file__))
esc = lambda s: html.escape(str(s))
J = lambda f: json.load(open(os.path.join(M, f)))["all"]
GH, GT, GN = J("geo_head.json"), J("geo_tag.json"), J("geo_near.json")
DH, DT, RH, RT = J("geo_def_head.json"), J("geo_def_tag.json"), J("geo_rx_head.json"), J("geo_rx_tag.json")
CORE = ("torso", "head", "thigh_", "shin_", "foot_")
iscore = lambda n: n.startswith(CORE)

# ── metrics from one geometry dump ────────────────────────────────────────────────────────────────────────────────────────────────────
def metrics(r):
    ev = r["events"]; st = next((e for e in ev if e["kind"] == "TACKLE_START"), None)
    tk = next((e for e in ev if e["kind"] == "TACKLE" and e.get("type") == "SLIDE"), None)
    bodies = [e for e in ev if e["kind"] == "TACKLE_BODY_CONTACT"]; reacts = [e for e in ev if e["kind"] in ("PLAYER_CONTACT", "PLAYER_CONTACT_ABSORBED")]
    k0 = (st["tick"] - 1) if st else 0; kc = (tk["contactTick"] - 1) if tk and tk.get("contactTick") else None
    core = [0, 0]; limb = [0, 0]; ballpre = 0; rootmin = 9; torso_att = 0; leg_att = 0
    foot = st.get("foot") if st else "R"
    for q, row in zip(r["pen"], r["rows"]):
        if not q or row["k"] < k0: continue
        cm = max([p[2] for p in q["pairs"] if iscore(p[0]) and iscore(p[1])] or [0]); lm = max([p[2] for p in q["pairs"] if not (iscore(p[0]) and iscore(p[1]))] or [0])
        core[0] = max(core[0], cm); core[1] += cm > 0.05; limb[0] = max(limb[0], lm); limb[1] += lm > 0.05
        torso_att = max([torso_att] + [p[2] for p in q["pairs"] if p[0] in ("torso", "head")])
        leg_att = max([leg_att] + [p[2] for p in q["pairs"] if p[0] in ("thigh_" + foot, "shin_" + foot, "foot_" + foot)])
        if q.get("ball") and (kc is None or row["k"] < kc): ballpre = max(ballpre, q["ball"]["pen"])
        A, D = row["P"][0], row["P"][1]; rootmin = min(rootmin, math.hypot(A["x"] - D["x"], A["y"] - D["y"]))
    dr = next((d.get("v12") for d in r.get("defRecs", []) if d.get("v12")), None)
    man = None
    for row in r["rows"]:
        d = row["P"][1]["def"] if len(row["P"]) > 1 else None
        if d and d.get("manifold"): man = d["manifold"]
    return dict(st=st, tk=tk, bodies=bodies, reacts=reacts, core=core, limb=limb, ballpre=ballpre, rootmin=rootmin, torso=torso_att, leg=leg_att, dr=dr, man=man)
cm = lambda v: f"{v * 100:.1f}"
def leg_s(m):
    s = m["st"]
    if not s: return "—"
    return f'{s["foot"]} (far) / tuck {s["tuck"]} · {s["tech"]}' if s.get("tuck") else f'{s["foot"]} (near, V1)'
def ball_s(m):
    t = m["tk"]
    if not t: return "—"
    return f'{t["out"]}' + (f' {t.get("region")}' if t.get("region") else "") + (f' @{t["contactTick"]}' if t.get("contactTick") else "")
def react_s(m):
    return ", ".join(f'{e.get("seg")}{"(planted)" if e.get("segPlanted") else ""}→{e.get("react") or e.get("cls")}{" " + e["family"] if e.get("family") else ""}{" [" + e["took"] + "]" if e.get("took") and e["took"] != "REACTION" else ""}' for e in m["reacts"]) or "none"
def pen_cell(v, n, thr=0.05):
    c = "ok" if v <= 0.03 else "warn" if v <= 0.08 else "bad"
    return f'<td class="{c}">{cm(v)} cm · {n}</td>'

# ── image helpers ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
def lab(im, text, xy=(6, 5), col=(255, 230, 110)):
    d = ImageDraw.Draw(im); d.rectangle([xy[0] - 3, xy[1] - 2, xy[0] + 6 * len(text) + 6, xy[1] + 13], fill=(0, 0, 0)); d.text(xy, text, fill=col); return im
CROP = (330, 230, 1170, 780)
def gframe(d, scen, k):
    f = os.path.join(M, d, f"{scen}_t{k:03d}.jpg")
    return Image.open(f).convert("RGB").crop(CROP) if os.path.exists(f) else None
def row_img(ims, gap=4, bg=(14, 17, 22)):
    ims = [i for i in ims if i is not None]; W = sum(i.width for i in ims) + gap * (len(ims) - 1); H = max(i.height for i in ims)
    S = Image.new("RGB", (W, H), bg); x = 0
    for i in ims: S.paste(i, (x, 0)); x += i.width + gap
    return S
def col_img(ims, gap=4, bg=(14, 17, 22)):
    ims = [i for i in ims if i is not None]; W = max(i.width for i in ims); H = sum(i.height for i in ims) + gap * (len(ims) - 1)
    S = Image.new("RGB", (W, H), bg); y = 0
    for i in ims: S.paste(i, (0, y)); y += i.height + gap
    return S
def save(im, name, q=84): im.save(os.path.join(IMG, name), quality=q); return name
def webp(frames, name, dur):
    frames = [f for f in frames if f is not None]
    if not frames: return None
    frames[0].save(os.path.join(IMG, name), save_all=True, append_images=frames[1:], duration=dur, loop=0, quality=68); return name
def clips(d, scen, k0, k1, kc, name, scale=0.62, d2=None, labels=None):
    """real time (every 2nd tick @ 33 ms) and 0.25× (every tick @ 67 ms around the contact); d2: a second source side by side (before / after)"""
    def fr(k):
        a = gframe(d, scen, k)
        if a is None: return None
        a = a.resize((int(a.width * scale), int(a.height * scale)))
        if labels: lab(a, labels[0])
        if d2:
            b = gframe(d2, scen, k)
            if b is None: return None
            b = b.resize((int(b.width * scale), int(b.height * scale)))
            if labels: lab(b, labels[1])
            return row_img([a, b])
        return a
    n = webp([fr(k) for k in range(k0, k1, 2)], name + "_normal.webp", 33)
    s = webp([fr(k) for k in range(max(k0, kc - 12), min(k1, kc + 36))], name + "_slow.webp", 67)
    return n, s
def views(d, scen, ks, vs, size=250, prefix=""):
    rows = []
    for v in vs:
        ims = []
        for k in ks:
            f = os.path.join(M, d, f"{scen}_t{k:03d}_{v}.png")
            if os.path.exists(f): ims.append(lab(Image.open(f).convert("RGB").resize((size, size)), f"{prefix}{v} t{k}"))
        if ims: rows.append(row_img(ims))
    return col_img(rows) if rows else None
def plate(geo, scen, name, title, **kw):
    args = ["python3", os.path.join(HERE, "of_slide_plot.py"), geo, scen, os.path.join(IMG, name), "--title", title.replace("—", "-").replace("·", "-").replace("→", "->").replace("’", "'"), "--every", str(kw.get("every", 2))]
    if kw.get("frm"): args += ["--from", str(kw["frm"])]
    if kw.get("to"): args += ["--to", str(kw["to"])]
    subprocess.run(args, capture_output=True); return name
G = lambda f: os.path.join(M, f)

# ── 1. side-on sweep geometry (both sides) ──────────────────────────────────────────────────────────────────────────────────────────
sec_side = ""
for scen, title in [("sw_right", "defender on the attacker's RIGHT"), ("sw_left", "defender on the attacker's LEFT")]:
    m = metrics(GH[scen]); kc = m["tk"]["contactTick"] - 1 if m["tk"] and m["tk"].get("contactTick") else 80
    p = plate(G("geo_head.json"), scen, f"{scen}_plate.png", f"V1.2 · {title}", frm=m["st"]["tick"], to=kc + 20)
    vimg = views("views_head", scen, [64, 70, 74, 77, 79, 82, 88], ["top", "tq", "front", "sideR"], 230)
    vn = save(vimg, f"{scen}_views.jpg") if vimg else None
    n, s = clips("game_head", scen, 55, 180, kc, scen)
    sec_side += f"""<h3>{esc(title)} — {esc(scen)}</h3>
<table class="kv"><tbody><tr><th class="l">technique</th><td class="l">{esc(leg_s(m))} · ball {abs(m["st"]["geo"]["ballLat"]):.2f} m beside the slide line · {esc((m["st"]["geo"] or {}).get("side"))}</td></tr>
<tr><th class="l">ball</th><td class="l">{esc(ball_s(m))} · along the leg {m["tk"].get("legAt")} · normal {m["tk"].get("normal")} · leg velocity there {m["tk"].get("vLeg")} m/s · ball {m["tk"].get("vIn")} → {m["tk"].get("vOut")} m/s</td></tr>
<tr><th class="l">rendered at the contact</th><td class="l">{esc(m["dr"]["patchPart"]) if m["dr"] else "—"} face {cm(m["dr"]["sepContact"]) if m["dr"] else "—"} cm from the ball surface at the contact instant ({cm(m["dr"]["sepFrame"]) if m["dr"] else "—"} cm in the drawn frame) · rendered vs simulated normal {m["dr"]["nAngle"] if m["dr"] else "—"}°</td></tr>
<tr><th class="l">contact sequence</th><td class="l">{esc(" → ".join(f'#{x["n"]} {x["kind"]}' + (" " + x.get("region", "") if x["kind"] == "BALL" else f' {x.get("prim")}→{x.get("seg")} {x.get("cls")}/{x.get("took")}' if x["kind"] == "BODY" else "") for x in (m["man"] or [])))}</td></tr>
<tr><th class="l">bodies</th><td class="l">closest roots {m["rootmin"]:.2f} m · worst core-body overlap {cm(m["core"][0])} cm ({m["core"][1]} ticks &gt; 5 cm) · limb {cm(m["limb"][0])} cm</td></tr></tbody></table>
<figure><img src="img/{p}"><figcaption>Top-down, the rendered skeletons every 2nd tick (older = darker): defender's <b style="color:#ffa028">tackling far leg</b>, <b style="color:#50dcff">tucked near leg</b>, trunk white; attacker grey; the simulation's contact capsules (yellow) at the contact; ball circles (red = contact). Arrows: ball in (blue) / out (red), normal (yellow), leg velocity (orange); magenta = contact patch.</figcaption></figure>
{f'<figure><img src="img/{vn}"><figcaption>Real characters, orbit cameras around the defender: top, three-quarter, front (facing him), and from the side the ATTACKER is on (looking at the defender through the attacker) — launch → drop → sweep → contact → through.</figcaption></figure>' if vn else ""}
<div class="grid"><figure><img src="img/{n}"><figcaption>gameplay camera, real time</figcaption></figure><figure><img src="img/{s}"><figcaption>gameplay camera, 0.25× around the contact</figcaption></figure></div>"""

# ── 2. ball physics ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
BALLS = [("sw_left", "CLEAN SWEEP — the far leg sweeps through the ball, no body contact"), ("sw_right_tight", "SWEEP at the shin, shoulder to shoulder (0.65 m)"),
         ("cf_right", "POKE / CLEAR — the quality law's POKE: the ball knocked away (restitution 0.5)"), ("sw_glance", "GLANCING — a weak slide against a strong, balanced carrier: he rides it"),
         ("blk_front", "BLOCK — head-on, the ball on the slide line: the straight block, the ball driven along the line"), ("sw_right_wide", "MISS — 1.30 m, beyond the sweep")]
sec_ball = '<table><thead><tr><th class="l">case</th><th class="l">technique</th><th class="l">outcome · region</th><th>leg velocity at the contact</th><th>normal</th><th>ball in → out (m/s)</th><th>e</th><th>spin z (rad/s, recorded)</th><th>rendered face at contact</th><th>normal Δ</th></tr></thead><tbody>'
for scen, _ in BALLS:
    m = metrics(GH[scen]); t = m["tk"] or {}; d = m["dr"] or {}
    sec_ball += f'<tr><td class="l">{esc(scen)}</td><td class="l">{esc(leg_s(m))}</td><td class="l">{esc(ball_s(m))}</td><td>{t.get("vLeg", "—")}</td><td>{t.get("normal", "—")}</td><td>{t.get("vIn", "—")} → {t.get("vOut", "—")}</td><td>{t.get("e", "—")}</td><td>{t.get("spinZ", "—")}</td><td>{(cm(d["sepContact"]) + " cm " + d["patchPart"]) if d else "—"}</td><td>{str(d.get("nAngle")) + "°" if d else "—"}</td></tr>'
sec_ball += "</tbody></table>"
for scen, title in BALLS:
    m = metrics(GH[scen]); kc = (m["tk"]["contactTick"] - 1) if m["tk"] and m["tk"].get("contactTick") else (m["st"]["tick"] + 20)
    p = plate(G("geo_head.json"), scen, f"{scen}_ball.png", title, frm=max(0, kc - 14), to=kc + 26, every=2)
    n, s = clips("game_head", scen, 55, 190, kc, scen + "_b")
    sec_ball += f'<h3>{esc(title)}</h3><figure><img src="img/{p}"><figcaption>{esc(scen)} — ball path (circles), contact (red); overlays as above.</figcaption></figure><div class="grid"><figure><img src="img/{n}"><figcaption>real time</figcaption></figure><figure><img src="img/{s}"><figcaption>0.25×</figcaption></figure></div>'

# ── 3. body contact ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
BODY = [("GH", "sw_left", "clean ball-only tackle — the body passes beside him"), ("DH", "sl_win", "ball first, then the attacker (the V1 fixture, V1.2 geometry)"),
        ("GH", "blk_front", "the attacker goes over the tackler (head-on: leg → ball → his next step cut short → over → caught on the slider)"),
        ("GH", "sw_right_tight", "weak contact: he corrects a step and runs on"), ("GH", "sw_right", "planted-leg sweep → fall (the sweep takes his planted right foot a tick before the ball)"),
        ("RH", "rx_standing", "a standing player swept: he topples over the slider, the slider is stopped against his legs"), ("GH", "sw_right_early", "miss — no phantom collision")]
SRC = {"GH": (GH, "geo_head.json", "game_head"), "DH": (DH, "geo_def_head.json", "game_head_def"), "RH": (RH, "geo_rx_head.json", "game_head_rx")}
sec_body = '<table><thead><tr><th class="l">case</th><th class="l">ball</th><th class="l">reaction(s)</th><th class="l">contact history</th><th>core overlap · ticks&gt;5cm</th><th>limb overlap · ticks&gt;5cm</th><th>closest roots</th></tr></thead><tbody>'
for key, scen, title in BODY:
    m = metrics(SRC[key][0][scen])
    sec_body += f'<tr><td class="l">{esc(scen)}</td><td class="l">{esc(ball_s(m))}</td><td class="l">{esc(react_s(m))}</td><td class="l">{esc(" → ".join(x["kind"] + (" " + x.get("seg", "") if x["kind"] == "BODY" else "") for x in (m["man"] or [])) or "—")}</td>{pen_cell(m["core"][0], m["core"][1])}{pen_cell(m["limb"][0], m["limb"][1])}<td>{m["rootmin"]:.2f} m</td></tr>'
sec_body += "</tbody></table>"
for key, scen, title in BODY:
    D0, gf, gd = SRC[key]; m = metrics(D0[scen]); kc = (m["bodies"][0]["tick"] - 1) if m["bodies"] else ((m["tk"]["contactTick"] - 1) if m["tk"] and m["tk"].get("contactTick") else m["st"]["tick"] + 20)
    p = plate(G(gf), scen, f"{scen}_body.png", title, frm=max(0, kc - 12), to=kc + 40, every=3)
    k0 = 30 if key == "RH" else 45 if key == "DH" else 55
    n, s = clips(gd, scen, k0, k0 + 130, kc, scen + "_c")
    sec_body += f'<h3>{esc(title)}</h3><figure><img src="img/{p}"><figcaption>{esc(scen)}</figcaption></figure><div class="grid"><figure><img src="img/{n}"><figcaption>real time</figcaption></figure><figure><img src="img/{s}"><figcaption>0.25×</figcaption></figure></div>'

# ── 4. BEFORE / AFTER at identical starting states ─────────────────────────────────────────────────────────────────────────────────
BA = [("G", "sw_right_aim"), ("G", "sw_right"), ("G", "sw_left"), ("G", "blk_front"), ("D", "sl_win"), ("D", "sl_left"), ("D", "sl_from_behind"), ("D", "sl_loose"), ("R", "rx_standing"), ("R", "rx_lateral"),
      ("R", "rx_planted_leg"), ("R", "rx_free_leg"), ("R", "rx_facing_front"), ("R", "rx_front_diag")]
PAIR = {"G": (GT, GH), "D": (DT, DH), "R": (RT, RH)}
sec_ba = '<table><thead><tr><th class="l">fixture</th><th class="l">build</th><th class="l">tackling leg</th><th class="l">ball</th><th class="l">reaction(s)</th><th>core overlap · ticks&gt;5cm</th><th>limb overlap · ticks&gt;5cm</th><th>closest roots</th></tr></thead><tbody>'
for k, scen in BA:
    A_, B_ = PAIR[k]
    for nm, D0 in (("V1 (tackled-player-v1)", A_), ("V1.2", B_)):
        if scen not in D0: continue
        m = metrics(D0[scen])
        sec_ba += f'<tr><td class="l">{esc(scen) if nm.startswith("V1 ") else ""}</td><td class="l">{nm}</td><td class="l">{esc(leg_s(m))}</td><td class="l">{esc(ball_s(m))}</td><td class="l">{esc(react_s(m))}</td>{pen_cell(m["core"][0], m["core"][1])}{pen_cell(m["limb"][0], m["limb"][1])}<td>{m["rootmin"]:.2f} m</td></tr>'
sec_ba += "</tbody></table>"
for scen, frm, to, gt, gh, k0 in [("sw_right_aim", 64, 130, "game_tag", "game_head", 60), ("sw_right", 63, 120, "game_tag", "game_head", 60), ("blk_front", 60, 110, "game_tag", "game_head", 58)]:
    pa = plate(G("geo_tag.json"), scen, f"{scen}_before.png", "BEFORE · V1 (baseline/tackled-player-v1)", frm=frm, to=to, every=3)
    pb = plate(G("geo_head.json"), scen, f"{scen}_after.png", "AFTER · V1.2", frm=frm, to=to, every=3)
    mb = metrics(GH[scen]); kc = (mb["tk"]["contactTick"] - 1) if mb["tk"] and mb["tk"].get("contactTick") else frm + 16
    n, s = clips(gt, scen, k0, k0 + 110, kc, scen + "_ba", scale=0.5, d2=gh, labels=("BEFORE V1", "AFTER V1.2"))
    sec_ba += f'<h3>{esc(scen)} — identical start, identical slide request</h3><div class="grid"><figure><img src="img/{pa}"><figcaption>before</figcaption></figure><figure><img src="img/{pb}"><figcaption>after</figcaption></figure></div><div class="grid"><figure><img src="img/{n}"><figcaption>before | after, real time</figcaption></figure><figure><img src="img/{s}"><figcaption>before | after, 0.25×</figcaption></figure></div>'
for scen, gt, gh, k0 in [("sl_left", "game_tag_def", "game_head_def", 50), ("rx_standing", "game_tag_rx", "game_head_rx", 40)]:
    D0 = DH if scen.startswith("sl") else RH; mb = metrics(D0[scen]); kc = (mb["bodies"][0]["tick"] - 1) if mb["bodies"] else k0 + 20
    n, s = clips(gt, scen, k0, k0 + 120, kc, scen + "_ba", scale=0.5, d2=gh, labels=("BEFORE V1", "AFTER V1.2"))
    sec_ba += f'<h3>{esc(scen)}</h3><div class="grid"><figure><img src="img/{n}"><figcaption>before | after, real time</figcaption></figure><figure><img src="img/{s}"><figcaption>before | after, 0.25×</figcaption></figure></div>'

# ── 5. the counterfactual leg test ─────────────────────────────────────────────────────────────────────────────────────────────────
sec_cf = '<table><thead><tr><th class="l">case</th><th class="l">geometry</th><th class="l">ball</th><th>rendered face at contact</th><th>normal Δ</th><th>normal</th><th>ball out (m/s)</th><th>trunk → attacker</th><th>tackling leg → attacker</th><th>core overlap · ticks&gt;5cm</th><th class="l">attacker contacts → reaction</th></tr></thead><tbody>'
for scen in ("cf_right", "cf_left"):
    for nm, D0 in (("A · V1 near leg (straight)", GN), ("B · V1.2 far-leg sweep", GH)):
        m = metrics(D0[scen]); t = m["tk"] or {}; d = m["dr"]
        sec_cf += f'<tr><td class="l">{esc(scen) if nm.startswith("A") else ""}</td><td class="l">{nm}</td><td class="l">{esc(ball_s(m))}</td><td>{(cm(d["sepContact"]) + " cm") if d else "—"}</td><td>{(str(d["nAngle"]) + "°") if d else "—"}</td><td>{t.get("normal", "along the slide (V1)")}</td><td>{t.get("vOut", "—")}</td>{pen_cell(m["torso"], "")}{pen_cell(m["leg"], "")}{pen_cell(m["core"][0], m["core"][1])}<td class="l">{esc(", ".join(e.get("seg", "") for e in m["bodies"]) or "none")} → {esc(react_s(m))}</td></tr>'
sec_cf += "</tbody></table>"
for scen in ("cf_right", "cf_left"):
    pa = plate(G("geo_near.json"), scen, f"{scen}_A.png", "A · V1 near-leg geometry", frm=60, to=110, every=3)
    pb = plate(G("geo_head.json"), scen, f"{scen}_B.png", "B · V1.2 far-leg sweep", frm=60, to=110, every=3)
    va = views("views_cf_near", scen, [74, 78, 82, 90], ["top", "tq"], 220, "A "); vb = views("views_cf_far", scen, [74, 78, 82, 90], ["top", "tq"], 220, "B ")
    vv = save(col_img([va, vb]), f"{scen}_AB_views.jpg") if va and vb else None
    n, s = clips("game_near", scen, 56, 150, 78, scen + "_AB", scale=0.5, d2="game_head", labels=("A near leg", "B far-leg sweep"))
    sec_cf += f'<h3>{esc(scen)}</h3><div class="grid"><figure><img src="img/{pa}"><figcaption>A</figcaption></figure><figure><img src="img/{pb}"><figcaption>B</figcaption></figure></div>' + (f'<figure><img src="img/{vv}"><figcaption>A (top two rows) vs B (bottom two rows), same ticks</figcaption></figure>' if vv else "") + f'<div class="grid"><figure><img src="img/{n}"><figcaption>A | B, real time</figcaption></figure><figure><img src="img/{s}"><figcaption>A | B, 0.25×</figcaption></figure></div>'

# ── 6. gates, CCD, performance ────────────────────────────────────────────────────────────────────────────────────────────────────
def rd(f):
    p = os.path.join(GD, f); return open(p).read().strip() if os.path.exists(p) else "(not run)"
gtxt = rd("gates.txt"); verd = lambda line: f'<span class="{"ok" if ("PASS" in line or "IDENTICAL" in line) else "bad"}">{esc(line)}</span>'
sec_gate = "<pre>" + "\n".join(verd(l) if ("PASS" in l or "FAIL" in l or "IDENTICAL" in l) else esc(l) for l in gtxt.splitlines()) + "</pre>"
cc = json.load(open(CCD)); agg = {}
for x in cc["ball"]:
    a = agg.setdefault(x["vb"], [0, 0, 0, 0]); a[0] += 1; a[1] += x["dense"] is not None; a[2] += x["simMissed"]; a[3] += x["v1Missed"]
sec_ccd = '<table><thead><tr><th>ball speed (m/s)</th><th>crossings</th><th>dense (400 samples/tick) contact</th><th>V1.2 adaptive sub-steps missed</th><th>V1 fixed 4 sub-steps would miss</th></tr></thead><tbody>' + "".join(f"<tr><td>{k}</td><td>{v[0]}</td><td>{v[1]}</td><td class=\"{'ok' if not v[2] else 'bad'}\">{v[2]}</td><td>{v[3]}</td></tr>" for k, v in sorted(agg.items())) + "</tbody></table>"
bm = [x for x in cc["body"] if x["missed"]]
sec_ccd += f'<p>Bodies: {len(cc["body"])} fixtures (side-on and tackled-player), the slider\'s parts against the attacker\'s stride-clock segments re-checked with 64 samples per tick: the simulation\'s 4 sub-steps found the first contact on the same tick in every one (<span class="{"ok" if not bm else "bad"}">{len(bm)} missed</span>). Largest adaptive sub-step count used by the ball test: {max(x["subN"] for x in cc["ball"])}.</p>'
pf = json.load(open(PERF))["out"]
sec_perf = '<table><thead><tr><th class="l">run</th><th>players</th><th>tick (ms)</th><th>max (ms)</th><th>slides</th><th>swept ball contact µs/tick (µs/call)</th><th>contact history µs/tick (µs/call)</th><th>detect µs/tick</th><th>response µs/tick</th><th>slide pose µs/tick</th></tr></thead><tbody>'
for k, r in pf.items():
    per = lambda a, n: f'{a * 1000:.2f} ({(a * 3600 / n * 1000):.1f})' if n else f'{a * 1000:.2f} (—)'
    sec_perf += f'<tr><td class="l">{esc(k)}</td><td>{r["players"]}</td><td>{r["ms"]:.3f}</td><td>{r["max"]:.2f}</td><td>{r["slides"]}</td><td>{per(r["ball"], r["ballCalls"])}</td><td>{per(r["man"], r["manCalls"])}</td><td>{r["detect"] * 1000:.2f}</td><td>{r["resolve"] * 1000:.2f}</td><td>{r["defSolve"] * 1000:.1f}</td></tr>'
sec_perf += "</tbody></table>"

# ── the page ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
tmpl = open(os.path.join(HERE, "of_slide_review_body.html")).read()
page = tmpl.replace("%%SIDE%%", sec_side).replace("%%BALL%%", sec_ball).replace("%%BODY%%", sec_body).replace("%%BA%%", sec_ba).replace("%%CF%%", sec_cf).replace("%%GATES%%", sec_gate).replace("%%CCD%%", sec_ccd).replace("%%PERF%%", sec_perf)
page = page.replace("%%SLIDEGATE%%", "<pre>" + esc(rd("slide_gate_def.txt")) + "\n\n" + esc(rd("slide_gate_slide.txt")) + "\n\n" + esc(rd("slide_gate_react.txt")) + "</pre>")
for key, fn in (("%%STOP%%", "review_stop.html"), ("%%LIMITS%%", "review_limits.html")):   # the verdicts, written after the runs (hand-written, from the numbers above)
    p = os.path.join(HERE, fn); page = page.replace(key, open(p).read() if os.path.exists(p) else "<p class='dim'>(pending)</p>")
p13 = os.path.join(OUT, "section13.html")                                                        # the body-interaction follow-up (of_slide_review13.py), at the top
if os.path.exists(p13): page = page.replace('<h2>0 · Stop conditions</h2>', open(p13).read() + '\n<h2>0 · Stop conditions</h2>', 1)
open(os.path.join(OUT, "index.html"), "w").write(page); print("wrote", os.path.join(OUT, "index.html"), len(page))
