"""SLIDE CONTACT GEOMETRY V1.2 — top-down geometry plates from an of_slide_geo.js dump (review / diagnosis; reads, never simulates).
    python3 of_slide_plot.py <geo.json> <scenario> <out.png> [--from K] [--to K] [--every N] [--scale PX_PER_M]
Per sampled tick: both rendered skeletons (defender: tackling leg orange, tucked leg cyan, trunk white; attacker: grey, planted foot dot),
the simulation's tackler primitives (thin outlines), the ball, the roots' paths; the contact ticks are marked; the frame is in the pitch
frame (x right, y DOWN = toward the camera, as the game camera shows it)."""
import sys, json, math
from PIL import Image, ImageDraw, ImageFont

a = sys.argv
G, NAME, OUT = a[1], a[2], a[3]
opt = lambda k, d: type(d)(a[a.index(k) + 1]) if k in a else d
K0, K1, EV, SC = opt("--from", -1), opt("--to", -1), opt("--every", 3), opt("--scale", 170.0)
TITLE = opt("--title", "")
D = json.load(open(G))["all"][NAME]
rows = D["rows"]; ev = D["events"]
tk = [e for e in ev if e["kind"] == "TACKLE" and e.get("type") == "SLIDE"]
st = next((e for e in ev if e["kind"] == "TACKLE_START"), None)
bc = [e for e in ev if e["kind"] == "TACKLE_BODY_CONTACT"]
k_launch = st["tick"] if st else 0
k_ball = next((e["tick"] for e in tk if e.get("out") != "MISS"), None)
if K0 < 0: K0 = k_launch
if K1 < 0: K1 = (k_ball or k_launch + 25) + 22
sel = [r for r in rows if K0 <= r["k"] <= K1]
pts = []
for r in sel:
    for J in r["J"]:
        if J: pts += [(v[0], v[1]) for v in J.values()]
    pts.append((r["ball"][0], r["ball"][1]))
x0, x1 = min(p[0] for p in pts) - 0.5, max(p[0] for p in pts) + 0.5
y0, y1 = min(p[1] for p in pts) - 0.6, max(p[1] for p in pts) + 0.5
W, H = int((x1 - x0) * SC), int((y1 - y0) * SC) + 60
im = Image.new("RGB", (W, H), (38, 72, 44)); dr = ImageDraw.Draw(im)
P = lambda v: ((v[0] - x0) * SC, (v[1] - y0) * SC + 50)
for gx in range(math.floor(x0), math.ceil(x1) + 1): dr.line([P((gx, y0)), P((gx, y1))], fill=(52, 88, 58))
for gy in range(math.floor(y0), math.ceil(y1) + 1): dr.line([P((x0, gy)), P((x1, gy))], fill=(52, 88, 58))
def line(a, b, col, w): dr.line([P(a), P(b)], fill=col, width=w)
tsd = st.get("foot") if st else "R"; tuck = st.get("tuck") if st else None
tuck = tuck or ("L" if tsd == "R" else "R")
n = len(sel)
for i, r in enumerate(sel):
    if (r["k"] - K0) % EV and r["k"] not in (k_ball,) and r["k"] != K1: continue
    f = 0.35 + 0.65 * i / max(1, n - 1)
    J = r["J"]
    A, T = J[0], J[1]
    if A:
        c = tuple(int(v * f) for v in (205, 205, 215))
        for s in ("R", "L"): line(A["thigh_" + s], A["shin_" + s], c, 3); line(A["shin_" + s], A["foot_" + s], c, 3); line(A["foot_" + s], A["tip:toe_" + s], c, 3)
        line(A["pelvis"], A["neck"], c, 4)
    if T:
        leg = tuple(int(v * f) for v in (255, 150, 40)); tk_ = tuple(int(v * f) for v in (80, 220, 255)); tr = tuple(int(v * f) for v in (245, 245, 245))
        for s, col in ((tsd, leg), (tuck, tk_)): line(T["thigh_" + s], T["shin_" + s], col, 4); line(T["shin_" + s], T["foot_" + s], col, 4); line(T["foot_" + s], T["tip:toe_" + s], col, 4)
        line(T["pelvis"], T["neck"], tr, 5)
    b = r["ball"]; bx, by = P(b); rr = 0.11 * SC
    dr.ellipse([bx - rr, by - rr, bx + rr, by + rr], outline=(255, 255, 255) if r["k"] != k_ball else (255, 60, 60), width=2 if r["k"] != k_ball else 3)
    if r.get("prims") and (r["k"] == k_ball or r["k"] == K1):
        for q in r["prims"]:
            line(q["a"], q["b"], (255, 255, 0), 1)
# root paths
for pid, col in ((0, (200, 200, 200)), (1, (255, 170, 60))):
    path = [P((r["P"][pid]["x"], r["P"][pid]["y"])) for r in sel]
    dr.line(path, fill=col, width=1)
# BALL PHYSICS overlay at the simulation's contact: ball velocity before (blue) / after (red), contact normal (yellow), the leg's velocity at the
# contact point (orange), the contact patch (the simulation's leg point, magenta ring); 0.12 m per m/s
tb0 = next((e for e in tk if e.get("out") != "MISS" and e.get("point")), None)
def arrow(p, v, col, k=0.12, w=3):
    a = P(p); b = P((p[0] + v[0] * k, p[1] + v[1] * k)); dr.line([a, b], fill=col, width=w)
    ang = math.atan2(b[1] - a[1], b[0] - a[0]); L = 9
    for s_ in (2.6, -2.6): dr.line([b, (b[0] + L * math.cos(ang + s_), b[1] + L * math.sin(ang + s_))], fill=col, width=w)
if tb0:
    pt = tb0["point"]
    if tb0.get("vIn"): arrow(pt, tb0["vIn"], (90, 160, 255))
    if tb0.get("vOut"): arrow(pt, tb0["vOut"], (255, 70, 70))
    if tb0.get("normal"): arrow(pt, tb0["normal"], (255, 235, 60), k=0.45, w=2)
    if tb0.get("vLeg") and tb0.get("legPoint"): arrow(tb0["legPoint"], tb0["vLeg"], (255, 150, 40), w=2)
    if tb0.get("legPoint"): x_, y_ = P(tb0["legPoint"]); dr.ellipse([x_ - 5, y_ - 5, x_ + 5, y_ + 5], outline=(255, 60, 255), width=2)
fnt = ImageFont.load_default()
tb = next((e for e in tk if e.get("out") != "MISS"), tk[0] if tk else None)
hdr = f"{NAME}  ticks {K0}-{K1}  tackling leg {tsd} (orange)  tucked {tuck} (cyan)  tech {st.get('tech') if st else '-'}  ball contact {'@' + str(k_ball) + ' ' + tb.get('out', '') + ' ' + str(tb.get('region', '')) if tb and k_ball else 'none (MISS)'}"
if TITLE: hdr = TITLE + "   -   " + hdr
dr.rectangle([0, 0, W, 44], fill=(0, 0, 0)); dr.text((6, 4), hdr, fill=(255, 230, 110), font=fnt)
if tb0: dr.text((6, H - 14), f"ball {tb0.get('out')} on the {tb0.get('region')} - v in {tb0.get('vIn')} -> out {tb0.get('vOut')} m/s - normal {tb0.get('normal')} - leg v {tb0.get('vLeg')}   (blue in, red out, yellow normal, orange leg)", fill=(255, 255, 255), font=fnt)
dr.text((6, 20), "body contacts: " + (", ".join(f"@{e['tick']} {e.get('prim')}->{e.get('seg')} ({e.get('took','')})" for e in bc) or "none") + "   grey = attacker, x right, y down (camera side)", fill=(220, 220, 220), font=fnt)
im.save(OUT); print(OUT, W, H)
