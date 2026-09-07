# A — GEOMETRY SHEET of the representative far RIGHT save: pitch top-down (world) + screen-space panel over the live frame at commit.
#   python3 geometry_sheet.py <rgeo_dir> <out.png>
import sys, os, json, math
from PIL import Image, ImageDraw, ImageFont
D, OUT = sys.argv[1], sys.argv[2]
G = json.load(open(os.path.join(D, "geometry.json"))); tr = G["trace"]; ct, kt = G["committedTick"], G["contactTick"]; cm = G["commit"]
F = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 12); FB = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 14)
ROOT_A = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "..", "..", "assets", "visual_v1"))
an = json.load(open(os.path.join(ROOT_A, "goalkeeper/contextual/DIVE_NORTH_CW50_anchors.json"))); pose = Image.open(os.path.join(ROOT_A, "goalkeeper/contextual/DIVE_NORTH_CW50.png")).convert("RGBA")
# ── panel 1: pitch top-down, x right (east, toward the goal line at x=105), y down (south); 40 px per metre, window around the keeper
S = 40; x0, y0 = 99.0, 29.5; W1, H1 = int(8.5 * S), int(9 * S)
p1 = Image.new("RGB", (W1, H1), (56, 108, 44)); d = ImageDraw.Draw(p1)
def P(x, y): return (int((x - x0) * S), int((y - y0) * S))
goal = G["set"]["goal"]; d.line([P(goal["lineX"], y0), P(goal["lineX"], y0 + 9)], fill=(240, 240, 240), width=2)
d.rectangle([P(goal["lineX"], goal["centerY"] - 3.66), P(goal["lineX"] + 1.5, goal["centerY"] + 3.66)], outline=(240, 240, 240), width=2); d.text((P(goal["lineX"] + 0.2, goal["centerY"] - 3.5)), "goal", font=F, fill=(255, 255, 255))
for m in range(0, 9): d.line([P(x0, y0 + m), P(x0 + 8.5, y0 + m)], fill=(64, 118, 50)); 
for m in range(0, 9): d.line([P(x0 + m, y0), P(x0 + m, y0 + 9)], fill=(64, 118, 50))
# ball path, root path
bp = [P(t["ball"][0], t["ball"][1]) for t in tr if t["f"] <= (kt or len(tr)) + 2 and t["ball"][0] > x0]
if len(bp) > 1: d.line(bp, fill=(255, 255, 120), width=2)
rp = [P(t["root"][0], t["root"][1]) for t in tr[: (kt or ct + 40) + 1]]; d.line(rp, fill=(255, 90, 90), width=3)
r_set = P(*G["set"]["root"]); r_c = P(*tr[ct]["root"]); r_k = P(*tr[kt]["root"]) if kt else rp[-1]
for pt, col, lab in ((r_set, (255, 255, 255), "root at SET"), (r_c, (255, 200, 80), f"root at commit (tick {ct})"), (r_k, (255, 90, 90), f"root at contact (tick {kt})")):
    d.ellipse([pt[0] - 5, pt[1] - 5, pt[0] + 5, pt[1] + 5], fill=col); d.text((pt[0] + 8, pt[1] - 6), lab, font=F, fill=col)
tg = P(cm["target"][0], cm["target"][1]); d.ellipse([tg[0] - 6, tg[1] - 6, tg[0] + 6, tg[1] + 6], outline=(120, 220, 255), width=2); d.text((tg[0] + 8, tg[1] - 20), f"committed target ({cm['target'][0]:.2f}, {cm['target'][1]:.2f}, z {cm['target'][2]:.2f})", font=F, fill=(120, 220, 255))
cp = tr[kt]["contact"]["point"] if kt and tr[kt].get("contact") else None
if cp: q = P(cp[0], cp[1]); d.ellipse([q[0] - 4, q[1] - 4, q[0] + 4, q[1] + 4], fill=(255, 255, 255)); d.text((q[0] + 8, q[1] + 4), f"contact point z {cp[2]:.2f}", font=F, fill=(255, 255, 255))
def arrow(pt, vec, L, col, lab):
    e = (pt[0] + vec[0] * L, pt[1] + vec[1] * L); d.line([pt, e], fill=col, width=3); d.ellipse([e[0] - 3, e[1] - 3, e[0] + 3, e[1] + 3], fill=col); d.text((e[0] + 4, e[1] - 14), lab, font=F, fill=col)
fs = G["set"]["facing"]; arrow(r_set, (math.cos(fs), math.sin(fs)), 1.2 * S, (200, 200, 255), f"facing at SET {G['set']['dir']} {fs*180/math.pi:.0f}°")
arrow(r_c, cm["facingVec"], 1.0 * S, (255, 200, 80), f"facing at commit {cm['facingDeg']}°")
arrow(r_c, cm["rightVec"], 1.5 * S, (255, 120, 255), "physical RIGHT (facing + 90°) = north")
d.text((6, 6), "A1 — pitch (top-down, 40 px/m): x east → goal line, y south ↓ (toward the camera)", font=FB, fill=(255, 255, 255))
d.text((6, H1 - 40), f"shot: lat {G['shot']['synth']['lat']} m  z {G['shot']['synth']['z']} m  v {G['shot']['synth']['v']} m/s from {G['shot']['origin']}   |   tier {cm['tier']}  action {cm['action']}  envNorm {cm['envNorm']}  L {cm['cls']['L']} m  execTime {cm['execTime']:.3f} s", font=F, fill=(255, 255, 255))
d.text((6, H1 - 22), f"root travel commit→contact ({tr[kt]['root'][0]-tr[ct]['root'][0]:+.2f}, {tr[kt]['root'][1]-tr[ct]['root'][1]:+.2f}) m = {math.hypot(tr[kt]['root'][0]-tr[ct]['root'][0], tr[kt]['root'][1]-tr[ct]['root'][1]):.2f} m north-west  |  dBody {cm['actionDetail']['dBody']:.2f} m  dArm {cm['actionDetail']['dArm']:.2f} m  |  facing turns {cm['facingDeg']}° → {tr[kt]['facing']*180/math.pi:.0f}° by contact (ball tracking)", font=F, fill=(255, 255, 255))
# ── panel 2: screen space on the live full frame at commit, cropped around the keeper
full = Image.open(os.path.join(D, "full_COMMIT.png")).convert("RGB"); sp_c = tr[ct]["sp"]; cx, cy = int(sp_c[0]), int(sp_c[1])
CX0, CY0 = cx - 200, cy - 210; p2 = full.crop((CX0, CY0, CX0 + 400, CY0 + 300)).resize((800, 600), Image.NEAREST); d2 = ImageDraw.Draw(p2)
def Q(x, y): return ((x - CX0) * 2, (y - CY0) * 2)
d2.line([Q(*t["sp"]) for t in tr[: (kt or ct + 40) + 1]], fill=(255, 90, 90), width=3)
d2.line([Q(*t["handSp"]) for t in tr[ct: (kt or ct + 40) + 1] if t.get("handSp")], fill=(120, 255, 120), width=3)
d2.line([Q(*t["ballSp"]) for t in tr[: (kt or ct + 40) + 3] if abs(t["ballSp"][0] - cx) < 220], fill=(255, 255, 120), width=2)
for f_, col in ((ct, (255, 200, 80)), (kt, (255, 90, 90))):
    if f_ is None: continue
    q = Q(*tr[f_]["sp"]); d2.ellipse([q[0] - 5, q[1] - 5, q[0] + 5, q[1] + 5], fill=col); d2.text((q[0] + 8, q[1] + 2), f"root tick {f_}", font=F, fill=col)
    h = tr[f_].get("handSp")
    if h: q = Q(*h); d2.ellipse([q[0] - 4, q[1] - 4, q[0] + 4, q[1] + 4], fill=(120, 255, 120)); d2.text((q[0] + 8, q[1] - 14), f"sim hand tick {f_}", font=F, fill=(120, 255, 120))
q0 = Q(*sp_c); pr = cm["proj"]
for key, col, lab in (("north", (255, 120, 255), "north / physical RIGHT (1 m)"), ("facing", (200, 200, 255), "facing (1 m)"), ("up", (255, 255, 255), "up (1 m)"), ("east", (255, 180, 120), "east (1 m)")):
    v = pr[key]; e = (q0[0] + v[0] * 2, q0[1] + v[1] * 2); d2.line([q0, e], fill=col, width=3); d2.text((e[0] + 4, e[1] - 8), f"{lab} = ({v[0]:.1f},{v[1]:.1f}) px", font=F, fill=col)
tq = (q0[0] + pr["targetRel"][0] * 2, q0[1] + pr["targetRel"][1] * 2); d2.ellipse([tq[0] - 7, tq[1] - 7, tq[0] + 7, tq[1] + 7], outline=(120, 220, 255), width=2); d2.text((tq[0] + 10, tq[1] - 6), f"target ({pr['targetRel'][0]:.1f},{pr['targetRel'][1]:.1f}) px rel commit root", font=F, fill=(120, 220, 255))
# contact art at the contact root (ghost), its lead glove and body axis (shorts → head)
ps = G["set"]["s"] * an["pixel_scale"]; rk = tr[kt]["sp"] if kt else tr[-1]["sp"]; rx, ry = an["root"]
ghost = pose.copy(); ghost.putalpha(ghost.split()[3].point(lambda a: a * 0.45)); gb = ghost.resize((round(pose.width * ps * 2), round(pose.height * ps * 2)), Image.NEAREST)
ox, oy = Q(rk[0] - rx * ps, rk[1] - ry * ps); p2.paste(gb, (int(ox), int(oy)), gb)
gl = an["lead_glove"]; gq = Q(rk[0] + (gl[0] - rx) * ps, rk[1] + (gl[1] - ry) * ps); hq = Q(rk[0] + (an["head"][0] - rx) * ps, rk[1] + (an["head"][1] - ry) * ps); pq = Q(rk[0] + (42 - rx) * ps, rk[1] + (108 - ry) * ps)
d2.line([pq, hq], fill=(255, 255, 255), width=2); d2.ellipse([gq[0] - 5, gq[1] - 5, gq[0] + 5, gq[1] + 5], outline=(255, 255, 255), width=2); d2.text((gq[0] - 120, gq[1] - 24), "approved contact pose ghost at the contact root: glove ○, body axis |", font=F, fill=(255, 255, 255))
d2.text((6, 6), "A2 — screen space (2×): live frame at commit; root path red, sim hand green, ball yellow; projected unit vectors at the keeper", font=FB, fill=(255, 255, 255))
d2.text((6, 578), f"hand rel root: commit ({tr[ct]['handSp'][0]-tr[ct]['sp'][0]:+.1f},{tr[ct]['handSp'][1]-tr[ct]['sp'][1]:+.1f}) → contact ({tr[kt]['handSp'][0]-tr[kt]['sp'][0]:+.1f},{tr[kt]['handSp'][1]-tr[kt]['sp'][1]:+.1f}) px; root travel on screen ({tr[kt]['sp'][0]-tr[ct]['sp'][0]:+.1f},{tr[kt]['sp'][1]-tr[ct]['sp'][1]:+.1f}) px; art glove rel root ({(gl[0]-rx)*ps/G['set']['s']*G['set']['s']:+.1f},{(gl[1]-ry)*ps:+.1f}) px", font=F, fill=(255, 255, 255))
# ── panel 3: per-tick table (u, root, hand, ball) every 3 ticks
rows = [t for t in tr[ct:(kt or ct + 40) + 1] if (t["f"] - ct) % 3 == 0 or t["f"] == kt]
p3 = Image.new("RGB", (800, 22 * (len(rows) + 2) + 10), (24, 26, 30)); d3 = ImageDraw.Draw(p3)
d3.text((6, 4), "A3 — per tick: u · root (screen px rel commit root) · sim hand (rel root) · ball (rel root) · facing · drawn art (current live)", font=FB, fill=(255, 255, 255))
sp0 = tr[ct]["sp"]
for i, t in enumerate(rows):
    h = t["handSp"]; d3.text((6, 28 + i * 22), f"tick {t['f']:3d}  u {t['u']:.2f}  root ({t['sp'][0]-sp0[0]:+5.1f},{t['sp'][1]-sp0[1]:+5.1f})  hand ({(h[0]-t['sp'][0]) if h else 0:+5.1f},{(h[1]-t['sp'][1]) if h else 0:+5.1f})  ball ({t['ballSp'][0]-t['sp'][0]:+6.1f},{t['ballSp'][1]-t['sp'][1]:+5.1f})  facing {t['facing']*180/math.pi:5.0f}°  {(t['anim'] or {}).get('art','')[:40]}", font=F, fill=(230, 230, 230))
W = max(W1 + 820, 820); H = max(H1, 600) + p3.height + 30
sheet = Image.new("RGB", (W, H), (18, 19, 22)); sheet.paste(p1, (0, 0)); sheet.paste(p2, (W1 + 20, 0)); sheet.paste(p3, (0, max(H1, 600) + 20))
sheet.save(OUT); print(OUT, sheet.size)
