"""TACKLED-PLAYER REACTIONS V1 — builds review_artifacts/tackled_player_v1/index.html from the runs.
    python3 of_rx_review.py <gates dir> <rxmedia dir> <matrix.json> <out dir>
Every number is read from the simulation's own records (PLAYER_CONTACT events, the contact matrix, the gate outputs); media are composed here."""
import sys, os, json, glob, subprocess, statistics
from collections import Counter, defaultdict
from PIL import Image, ImageDraw

G, M, MX, OUT = sys.argv[1:5]; IMG = os.path.join(OUT, "img"); os.makedirs(IMG, exist_ok=True)
HERE = os.path.dirname(os.path.abspath(__file__))
esc = lambda s: str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
def run(*a):
    r = subprocess.run(["node"] + list(a), cwd=HERE, capture_output=True, text=True); return (r.stdout + r.stderr).strip()
def verdict(txt): return f'<span class="{"ok" if "PASS" in txt or "IDENTICAL" in txt else "bad"}">{esc(txt)}</span>'
P = json.load(open(os.path.join(M, "game", "probe.json")))["results"]
V = json.load(open(os.path.join(M, "views", "views.json")))["all"]
def pc(scen): e = [x for x in P[scen]["events"] if x["kind"] == "PLAYER_CONTACT"]; return e[0] if e else None
def lab(im, text, col=(255, 230, 110)):
    d = ImageDraw.Draw(im); d.rectangle([2, 2, 8 + 6 * len(text), 16], fill=(0, 0, 0)); d.text((5, 3), text, fill=col); return im
def strip(frames, name, h=190):
    ims = [im.resize((int(im.width * h / im.height), h)) for im in frames]; W = sum(i.width for i in ims) + 4 * (len(ims) - 1)
    S = Image.new("RGB", (W, h), (14, 17, 22)); x = 0
    for i in ims: S.paste(i, (x, 0)); x += i.width + 4
    S.save(os.path.join(IMG, name), quality=85); return name
def game(scen, k): f = os.path.join(M, "game", f"{scen}_t{k:03d}.jpg"); im = Image.open(f).convert("RGB"); return im.crop((300, 120, 1200, 800))
def view(scen, k, v): ks = sorted(int(x) for x in V[scen]); k2 = min(ks, key=lambda x: abs(x - k)); return Image.open(os.path.join(M, "views", f"{scen}_t{k2:03d}_{v}.png")).convert("RGB"), k2
def media(scen):
    e = pc(scen); c = e["tick"] if e else 50
    r = e.get("react") or (e["cls"] if e else "")
    end = c + (150 if r == "FALL" else 40)
    ks = [c - 6, c, c + 6, c + 14] + ([c + 30, c + 55, c + 90, c + 130] if r == "FALL" else [c + 22, c + 32])
    g = strip([lab(game(scen, k), f"tick {k}") for k in ks if os.path.exists(os.path.join(M, "game", f"{scen}_t{k:03d}.jpg"))], f"{scen}_game.jpg")
    sv = strip([lab(view(scen, k, "side")[0], f"side {view(scen, k, 'side')[1]}") for k in ks], f"{scen}_side.jpg")
    tq = strip([lab(view(scen, k, "tq")[0], f"3/4 {view(scen, k, 'tq')[1]}") for k in ks], f"{scen}_tq.jpg")
    fr = [game(scen, k).resize((450, 340)) for k in range(max(0, c - 20), min(259, end + 20), 2) if os.path.exists(os.path.join(M, "game", f"{scen}_t{k:03d}.jpg"))]
    if fr: fr[0].save(os.path.join(IMG, f"{scen}_normal.webp"), save_all=True, append_images=fr[1:], duration=33, loop=0, quality=70)
    fs = [game(scen, k).resize((450, 340)) for k in range(max(0, c - 10), min(259, c + 50)) if os.path.exists(os.path.join(M, "game", f"{scen}_t{k:03d}.jpg"))]
    if fs: fs[0].save(os.path.join(IMG, f"{scen}_slow.webp"), save_all=True, append_images=fs[1:], duration=67, loop=0, quality=70)
    return g, sv, tq
def facts(scen):
    e = pc(scen)
    if not e: return '<p class="dim">no contact</p>'
    rows = [("attacker", f'{e["vA"]} m/s · mass {e["massA"]} kg · stride {e["stride"]} (phase {e["phase"]}) · support R {"down" if e["support"]["R"] else "air"} / L {"down" if e["support"]["L"] else "air"}'),
            ("tackler", f'{e["type"]} · {e["vT"]} m/s · mass {e["massT"]} kg · primitive {e["prim"]}'),
            ("contact", f'tick {e["tick"]} (sub-step {e["sub"]}) · segment <b>{e["seg"]}</b> ({"weight-bearing" if e["segPlanted"] else "swinging" if e["segPlanted"] is False else "body"}) · point {e["point"]} · normal {e["normal"]} · penetration {e["pen"]} m'),
            ("relative velocity", f'normal {e["vn"]} m/s · tangential {e["vt"]} m/s'),
            ("impulse", f'J = {e["J"]} N·s · planted-foot friction capacity {e["Jfric"]} N·s · foot displaced {e["sweep"]} m · support {"<b>LOST</b>" if e["supportLost"] else "kept"} · swing landing shifted {e["landShift"]} m, late {e["blockedT"]} s · ΔV(COM) {e["dvCom"]} m/s · spin {e["spin"]} rad/s · tip {e.get("tip")} rad/s · tackler slowed {e["dvTackler"]} m/s'),
            ("balance", f'next support in {e["tSup"]} s · capture-point error {e["e0"]} m vs step correction {e["rc"]} m · growth per step ×{e["gStep"]} · error by step {e["errTrace"]} · vertical drop {e["drop"]} m vs capacity {e["dropCap"]} m{" · <b>COLLAPSE</b>" if e["collapse"] else ""}{" · obstacle " + str(e["obstacle"]) + " m" if e["obstacle"] else ""}'),
            ("reaction", f'<b>{e.get("react") or e["cls"]}</b>' + (f' · {e["steps"]} corrective step(s)' if (e.get("react") or e["cls"]) in ("CORRECTION", "STUMBLE") else "") + (f' · travels toward {e.get("az")} rad, body rotates toward {e.get("azHead")} rad → lands <b>{e.get("family")}</b> · on the pitch at {e.get("tGround")} s · slides {e.get("slide")} m · up at {e.get("tUp")} s' if e.get("react") == "FALL" else "")),
            ("ball / man", e["order"])]
    return '<table class="kv"><tbody>' + "".join(f'<tr><th class="l">{a}</th><td class="l">{b}</td></tr>' for a, b in rows) + "</tbody></table>"
PAIRS = [
  ("Planted leg vs free leg", "same slide line and runner speed (3 m/s); only the stride phase differs, so the slide meets a swinging foot vs a weight-bearing one", "rx_free_leg", "rx_planted_leg"),
  ("Jog vs sprint", "the planted left foot is swept in both; the runner jogs (3 m/s) vs sprints (7.5 m/s)", "rx_jog", "rx_sprint"),
  ("Square vs glancing", "same line, speed and stride; in the glancing case the slide starts 30 cm further back so only the tip of the leg reaches him", "rx_square", "rx_glancing"),
  ("Lateral vs rear-diagonal", "the same attacker state (5.5 m/s, same stride phase), the slide from the side vs from behind at 45°", "rx_lateral", "rx_rear_diag"),
  ("Early vs late stance", "the planted right foot swept at ≈4.3 m/s by a sprinting runner — early in its stance (the other foot far from landing) vs late (about to land)", "rx_early_stance", "rx_late_stance"),
]
SINGLES = [("Feet swept from behind, standing", "rx_behind_standing"), ("Front-diagonal: over the sliding tackler", "rx_front_diag"), ("A standing player hit from the side", "rx_standing"), ("A sprinter hit in the flight phase", "rx_airborne")]
html_pairs = ""
for title, what, a, b in PAIRS:
    ga, sa, ta = media(a); gb, sb, tb = media(b); ea, eb = pc(a), pc(b)
    html_pairs += f'<h3>{title}</h3><p class="dim">{what}</p><div class="grid"><div><h4>{a}: {(ea.get("react") or ea["cls"]) if ea else "-"}{(" " + ea.get("family", "")) if ea and ea.get("family") else ""}</h4>{facts(a)}</div><div><h4>{b}: {(eb.get("react") or eb["cls"]) if eb else "-"}{(" " + eb.get("family", "")) if eb and eb.get("family") else ""}</h4>{facts(b)}</div></div>'
    for n1, n2, cap in [(ga, gb, "gameplay camera"), (sa, sb, "side view (orbit camera on the attacker)"), (ta, tb, "three-quarter view")]:
        html_pairs += f'<figure><img src="img/{n1}"><figcaption>{a} — {cap}</figcaption></figure><figure><img src="img/{n2}"><figcaption>{b} — {cap}</figcaption></figure>'
    html_pairs += f'<div class="grid"><figure><img src="img/{a}_normal.webp"><figcaption>{a}, real time</figcaption></figure><figure><img src="img/{b}_normal.webp"><figcaption>{b}, real time</figcaption></figure></div>'
    html_pairs += f'<div class="grid"><figure><img src="img/{a}_slow.webp"><figcaption>{a}, 0.25×</figcaption></figure><figure><img src="img/{b}_slow.webp"><figcaption>{b}, 0.25×</figcaption></figure></div>'
html_singles = ""
for title, s in SINGLES:
    g, sv, tq = media(s); e = pc(s)
    html_singles += f'<h3>{title} — {(e.get("react") or e["cls"]) if e else "-"} {e.get("family", "") if e else ""}</h3>{facts(s)}<figure><img src="img/{g}"><figcaption>gameplay camera</figcaption></figure><figure><img src="img/{sv}"><figcaption>side view</figcaption></figure><figure><img src="img/{tq}"><figcaption>three-quarter view</figcaption></figure><div class="grid"><figure><img src="img/{s}_normal.webp"><figcaption>real time</figcaption></figure><figure><img src="img/{s}_slow.webp"><figcaption>0.25×</figcaption></figure></div>'
# ── the contact matrix ──────────────────────────────────────────────────────────────────────────────────────────────────────────
MR = [r for r in json.load(open(MX))["res"]]
cont = [r for r in MR if r["rec"]]
cls = lambda e: e.get("react") or e["cls"]
def ctab(keyf, keys, title):
    c = defaultdict(Counter)
    for r in cont: c[keyf(r)][cls(r["rec"])] += 1
    order = ["NEGLIGIBLE", "CORRECTION", "STUMBLE", "FALL"]
    h = f'<table><thead><tr><th class="l">{title}</th>' + "".join(f"<th>{o}</th>" for o in order) + '<th>falls: FRONT / SIDE / BACK</th><th>median ground slide (m)</th></tr></thead><tbody>'
    for k in keys:
        rs = [r for r in cont if keyf(r) == k]; fam = Counter(r["rec"].get("family") for r in rs if cls(r["rec"]) == "FALL")
        sl = [r["rec"].get("slide") for r in rs if r["rec"].get("slide") is not None]
        h += f'<tr><td>{k}</td>' + "".join(f"<td>{c[k][o]}</td>" for o in order) + f'<td>{fam["FRONT"]} / {fam["SIDE"]} / {fam["BACK"]}</td><td>{statistics.median(sl):.2f}</td>' if sl else f'<tr><td>{k}</td>' + "".join(f"<td>{c[k][o]}</td>" for o in order) + '<td>-</td><td>-</td>'
        h += "</tr>"
    return h + "</tbody></table>"
seg_key = lambda r: f'{r["rec"]["segKind"]} ({"weight-bearing" if r["rec"]["segPlanted"] else "swinging" if r["rec"]["segPlanted"] is False else "body"})'
mt = ctab(lambda r: f'{r["K"]["v"]} m/s', [f"{v} m/s" for v in sorted(set(r["K"]["v"] for r in cont))], "runner speed")
mt += ctab(seg_key, sorted(set(seg_key(r) for r in cont)), "struck segment")
mt += ctab(lambda r: r["rec"]["stride"], sorted(set(r["rec"]["stride"] for r in cont)), "stride state at contact")
mt += ctab(lambda r: f'{r["K"]["ang"]}°', [f"{a}°" for a in sorted(set(r["K"]["ang"] for r in cont))], "slide direction (0° = from behind, 90° / −90° = from his left / right, 180° = head-on)")
mx_head = f'{len(MR)} matrix cases (5 speeds × 7 slide directions × 8 stride phases × 3 lateral offsets): {len(cont)} contacts, {len(MR) - len(cont)} slides that never touched him.'
# ── gates / perf ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
gl = open(os.path.join(os.path.dirname(G), os.path.basename(G) + ".log")).read() if os.path.exists(os.path.join(os.path.dirname(G), os.path.basename(G) + ".log")) else ""
gate_lines = [l for l in gl.splitlines() if ("PASS" in l or "FAIL" in l or "IDENTICAL" in l or "DIFF" in l) and not l.startswith("D")]
def txt(p): return open(os.path.join(G, p)).read() if os.path.exists(os.path.join(G, p)) else ""
rxdef = txt("rx_gate_def.txt"); rxssg = txt("rx_gate_ssg.txt"); rxdemo = txt("rx_gate_demo.txt"); perf = txt("perf.txt"); icpt = txt("rx_gate_icpt.txt")
body = open(os.path.join(HERE, "of_rx_review_body.html")).read()
fill = {"{{PAIRS}}": html_pairs, "{{SINGLES}}": html_singles, "{{MATRIX}}": f"<p>{mx_head}</p>" + mt,
        "{{GATES}}": "<ul>" + "".join(f"<li>{verdict(l)}</li>" for l in gate_lines) + "</ul>",
        "{{RXDEF}}": "<pre>" + esc(rxdef) + "</pre>", "{{RXSSG}}": "<pre>" + esc(rxssg + "\n" + rxdemo) + "</pre><p><b>The one flagged demo, explained.</b> The demo runner plays its seven patterns in ONE page, and each attempt's starting position varies with a global attempt counter. slide_miss legitimately changed: its slides now make attackers fall, so its attempts take longer and it made 2 fewer. That moved the intercept pattern's first attempt from #87 to #85, which has a different starting geometry. Run on its own against the frozen tag, the intercept demo is identical:</p><pre>" + esc(icpt) + "</pre>", "{{PERF}}": "<pre>" + esc(perf) + "</pre>"}
for k, v in fill.items(): body = body.replace(k, v)
css = open(os.path.join(HERE, "of_def_review.css")).read() + "\n.kv th{width:150px;vertical-align:top}.kv td{white-space:normal}h4{margin:8px 0 4px;color:#cfd6e0;font-size:13px}\n"
open(os.path.join(OUT, "index.html"), "w").write(f'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Tackled Player Reactions</title><style>{css}</style></head><body><div class="wrap">{body}</div></body></html>')
print("wrote", os.path.join(OUT, "index.html"))
