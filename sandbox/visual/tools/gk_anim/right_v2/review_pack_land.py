# REVIEW PACK — RIGHT landing + recovery (post-contact), before integration.
#   python3 review_pack_land.py <cap_full> <frames_land> <ground_contacts.json> <out_dir>
# A  4x slow motion from two ticks before ball contact through landing and settling (keeper crop following the keeper)
# B  strip CONTACT | FOLLOW-THROUGH | DESCENT | FIRST GROUND CONTACT | IMPACT 1 | IMPACT 2 | HIP/SIDE DOWN | SLIDE | SETTLED (in-engine + authored)
# C  ground-contact diagram: which body part touches the pitch on each frame, with tracked heights
# D  presentation-root position / velocity through contact and landing (from the capture trace)
# E  full normal-speed dive SET → dive → contact → landing → recovery → SET
import sys, os, json, math
from PIL import Image, ImageDraw, ImageFont
CAP, FR, GC, OUT = sys.argv[1:5]; os.makedirs(OUT, exist_ok=True)
try: FONT = ImageFont.truetype("/System/Library/Fonts/Menlo.ttc", 12); FONT_B = ImageFont.truetype("/System/Library/Fonts/Menlo.ttc", 15)
except Exception: FONT = ImageFont.load_default(); FONT_B = FONT
S_LIVE = 0.4197
t = json.load(open(os.path.join(CAP, "trace.json"))); tr = t["trace"]; clip = t["clip"]; ctk = t["contactTick"]; cmt = t["committedTick"]
frames = [(e, os.path.join(CAP, f"new_{e['f']:03d}.png")) for e in tr if os.path.exists(os.path.join(CAP, f"new_{e['f']:03d}.png"))]
gc = json.load(open(GC)); meta = json.load(open(os.path.join(FR, "frames.json")))["frames"]


def label(im, txt):
    im = im.convert("RGB"); d = ImageDraw.Draw(im); d.rectangle([0, 0, im.width, 16], fill=(20, 20, 20)); d.text((4, 2), txt, fill=(255, 255, 255), font=FONT); return im


def gif(fr, path, ms): fr[0].save(path, save_all=True, append_images=fr[1:], duration=ms, loop=0, optimize=False)


def keeper_crop(img, e, w=110, h=124, zoom=4, follow_pres=True):
    sx, sy = e["sp"]; pr = e.get("pres") or {}; cx = sx - clip["x"] + (pr.get("sx", 0) if follow_pres else 0); cy = sy - clip["y"] + (pr.get("sy", 0) if follow_pres else 0)
    return img.crop((int(cx - w / 2), int(cy - h * 0.78), int(cx + w / 2), int(cy + h * 0.22))).resize((w * zoom, h * zoom), Image.NEAREST)


def dl(e):
    a = (e.get("anim") or {}).get("art") or ""
    if e.get("mode") == "post": return f"{e['drawn']}  +{e['tl']:.2f} s" + (f"  pres {e['pres']['dm']:.2f} m" if e.get("pres") else "")
    if e.get("mode") == "frame": return f"{e['drawn']}  u {e['u']:.2f}"
    if "SAVE POSE" in a: return "CONTACT POSE (live PNG)"
    return "LIVE " + a[:24]


# ── A: 4x slow motion, 2 ticks before contact through settling (+0.70 s)
seq = [(e, Image.open(p)) for e, p in frames if ctk - 2 <= e["f"] <= ctk + int(0.72 * 60)]
A = [label(keeper_crop(im, e), f"4x slow  tick {e['f']}  {dl(e)}") for e, im in seq]
gif(A, os.path.join(OUT, "A_landing_4x_slowmo.gif"), 67)
# ── E: full normal speed (whole clip), 60 fps and 30 fps
full = [(e, Image.open(p)) for e, p in frames]
E = [label(im, f"NEW RIGHT V2 + landing  tick {e['f']}  {dl(e)}") for e, im in full]
gif(E, os.path.join(OUT, "E_full_dive_normal_speed_60fps.gif"), 17); gif(E, os.path.join(OUT, "E_full_dive_30fps.gif"), 33)
# ── B: strip of the named landing frames (first tick of each) + the authored frames
NAMES = [("CONTACT", None), ("FOLLOW-THROUGH", "P01"), ("DESCENT", "P02"), ("FIRST GROUND CONTACT", "P04"), ("IMPACT 1", "P05"), ("IMPACT 2", "P06"), ("HIP/SIDE DOWN", "P07"), ("SLIDE", "P07b"), ("SETTLED", "P08")]
first = {}; seen = None
for e, p in frames:
    k = e["drawn"] if e.get("mode") == "post" else None
    if k and k != seen and k not in first: first[k] = (e, p)
    seen = k
Z = 4; W = 110 * Z; H = 124 * Z; byk = {f["name"].split("_")[0]: f for f in meta}
sheet = Image.new("RGB", (W * len(NAMES) + 12, 2 * H + 74), (22, 22, 22)); d = ImageDraw.Draw(sheet)
d.text((6, 6), "B — CONTACT | FOLLOW-THROUGH | DESCENT | FIRST GROUND CONTACT | IMPACT 1 | IMPACT 2 | HIP/SIDE DOWN | SLIDE | SETTLED   (top: in-engine at the first tick of each frame, crop following the presentation root; bottom: authored frames at live scale, red + = presentation root)", fill=(255, 255, 255), font=FONT_B)
for i, (nm, key) in enumerate(NAMES):
    x0 = 6 + i * W
    if key is None: e = tr[ctk]; p = os.path.join(CAP, f"new_{ctk:03d}.png")
    elif key in first: e, p = first[key]
    else: continue
    sheet.paste(keeper_crop(Image.open(p).convert("RGB"), e), (x0, 30)); d.text((x0, 30 + H + 2), f"{nm}  tick {e['f']}  {dl(e)}"[:44], fill=(255, 230, 120), font=FONT)
    f = byk.get(key)
    if f:
        a = Image.open(os.path.join(FR, f["name"] + ".png")).convert("RGBA"); ps = S_LIVE * f.get("pixel_scale", 1.0)
        live = a.resize((max(1, round(a.width * ps * Z)), max(1, round(a.height * ps * Z))), Image.NEAREST)
        cell = Image.new("RGB", (W, H), (40, 90, 40)); rx, ry = W // 2, int(H * 0.78); cell.paste(live, (rx - int(f["root"][0] * ps * Z), ry - int(f["root"][1] * ps * Z)), live)
        dd = ImageDraw.Draw(cell); dd.line([(rx - 5, ry), (rx + 5, ry)], fill=(255, 60, 60)); dd.line([(rx, ry - 5), (rx, ry + 5)], fill=(255, 60, 60))
        sheet.paste(cell, (x0, 30 + H + 20)); d.text((x0, 30 + 2 * H + 22), f"authored {f['name'][:22]}  {f['phase'][:28]}", fill=(200, 200, 200), font=FONT)
    elif key is None: d.text((x0, 30 + H + 40), "the untouched approved 60° PNG (live renderer)", fill=(200, 200, 200), font=FONT)
sheet.save(os.path.join(OUT, "B_landing_strip.png"))
# ── C: ground-contact diagram
JOINTS = ["glove", "elbow", "shoulder", "head", "waist", "hipL", "hipR", "kneeL", "kneeR", "ankleL", "ankleR"]
THICK = {"glove": 0.04, "elbow": 0.06, "shoulder": 0.20, "head": 0.12, "waist": 0.16, "hipL": 0.16, "hipR": 0.16, "kneeL": 0.08, "kneeR": 0.08, "ankleL": 0.07, "ankleR": 0.07}
rows = [f for f in gc["frames"] if "world_joints" in f]
cw = 92; ch = 22; x0 = 210; y0 = 60
img = Image.new("RGB", (x0 + cw * len(rows) + 20, y0 + ch * (len(JOINTS) + 2) + 150), (22, 22, 22)); d = ImageDraw.Draw(img)
d.text((10, 6), "C — ground contact per frame: ■ touching the pitch (joint centre at its resting thickness) · number = height of the joint centre above the pitch (m) · presentation-root travel d (m)", fill=(255, 255, 255), font=FONT_B)
d.text((10, 26), "joints are tracked in the world plane along the dive (north) and height; hands/elbow are the lead arm (both arms are one drawn part), L/R = the keeper's left/right leg", fill=(200, 200, 200), font=FONT)
for j, jn in enumerate(JOINTS): d.text((10, y0 + ch * (j + 1) + 4), jn, fill=(255, 230, 120), font=FONT)
for i, f in enumerate(rows):
    x = x0 + i * cw; d.text((x, y0 - 14), f["name"][:11], fill=(255, 255, 255), font=FONT); d.text((x, y0 + 2), f"+{f['t_post'][0]:.2f}s d{f['pres_d']:.2f}", fill=(160, 200, 255), font=FONT)
    for j, jn in enumerate(JOINTS):
        z = f["world_joints"][jn][1]; touch = z <= THICK[jn] + 1e-6; y = y0 + ch * (j + 1)
        d.rectangle([x, y + 2, x + cw - 6, y + ch - 2], fill=(200, 80, 60) if touch else (40, 40, 40), outline=(90, 90, 90))
        d.text((x + 4, y + 4), ("■ " if touch else "  ") + f"{z:.2f}", fill=(255, 255, 255), font=FONT)
    d.text((x, y0 + ch * (len(JOINTS) + 1) + 6), (", ".join(f["touching"]) or "airborne")[:13], fill=(255, 160, 120), font=FONT)
yy = y0 + ch * (len(JOINTS) + 2) + 30
for line in ["order of ground contact: lead hand/forearm (P04, +0.22 s) → elbow / upper arm (P05) → shoulder + side of torso + hips (P06, +0.36 s) → outer thigh, legs laid out behind (P07) → slide to rest (P07b) → settled (P08) → push-up on the forearm (P09) → knee under (P10) → half kneel / kneel / rise on the SET rig (P11–P13) → live SET",
             "no whole-body simultaneous impact: hand +0.22 s, elbow +0.29 s, shoulder/hip +0.36 s, thigh/legs +0.44 s; the feet stay behind and touch down after the hips (trailing), never snapping downward",
             "the head never goes below its ground line; the hands brace ahead of the body (up the dive line = up-screen in this camera, so they overlap the trunk in the drawing)"]:
    d.text((10, yy), line, fill=(200, 200, 200), font=FONT); yy += 16
img.save(os.path.join(OUT, "C_ground_contact_diagram.png"))
# ── D: presentation root position / velocity through contact and landing
pts = [(e["tl"], e["pres"]["dm"], e["pres"]["sx"], e["pres"]["sy"], e["f"], e["drawn"]) for e in tr if e.get("pres") and e.get("tl") is not None]
W2, H2 = 1400, 520; img = Image.new("RGB", (W2, H2), (22, 22, 22)); d = ImageDraw.Draw(img)
d.text((10, 6), "D — presentation root through contact and landing (the simulation root is untouched; the drawn body and its shadow ride on sim root + d(t) along the dive direction)", fill=(255, 255, 255), font=FONT_B)
pres = gc["pres"]; V0 = gc["V0"]
d.text((10, 26), f"d(t) = V0·τ·(1−e^(−t/τ)) for t ≤ tLand, then eased back to 0 by tEnd · V0 = {V0:.2f} m/s (the root's mean dive speed) · τ {pres['tau']} s · tLand {pres['tLand']} s · tEnd {pres['tEnd']} s · velocity = V0·e^(−t/τ) during the landing", fill=(200, 200, 200), font=FONT)
gx0, gy0, gw, gh = 70, 70, 1280, 170
def plot(vals, y_top, title, unit, colour, marks):
    lo = min(v for _, v in vals); hi = max(v for _, v in vals); lo = min(lo, 0); hi = max(hi, 1e-6)
    d.rectangle([gx0, y_top, gx0 + gw, y_top + gh], outline=(90, 90, 90)); d.text((gx0, y_top - 14), title, fill=(255, 230, 120), font=FONT)
    tmax = max(t_ for t_, _ in vals); tmin = min(t_ for t_, _ in vals)
    X = lambda t_: gx0 + (t_ - tmin) / max(1e-6, tmax - tmin) * gw; Y = lambda v: y_top + gh - (v - lo) / max(1e-6, hi - lo) * gh
    prev = None
    for t_, v in vals:
        p = (X(t_), Y(v))
        if prev: d.line([prev, p], fill=colour, width=2)
        prev = p
    d.line([X(0), y_top, X(0), y_top + gh], fill=(255, 80, 80)); d.text((X(0) + 3, y_top + 2), "ball contact (t = 0)", fill=(255, 120, 120), font=FONT)
    for tm, lab in marks:
        if tmin <= tm <= tmax: d.line([X(tm), y_top, X(tm), y_top + gh], fill=(80, 140, 255)); d.text((X(tm) + 2, y_top + gh - 14), lab, fill=(140, 180, 255), font=FONT)
    d.text((gx0 + gw - 120, y_top + 2), f"max {hi:.3f} {unit}", fill=(200, 200, 200), font=FONT); d.text((gx0 - 60, Y(0) - 6), "0", fill=(200, 200, 200), font=FONT)
marks = [(0.22, "hand"), (0.29, "elbow"), (0.36, "shoulder/hip"), (0.44, "thigh"), (0.55, "tLand"), (0.66, "settled"), (1.05, "tEnd")]
pos = [(tl, dm) for tl, dm, *_ in pts]
plot(pos, gy0, "position d(t): metres along the dive direction from the simulation root", "m", (120, 220, 120), marks)
vel = []
for i in range(1, len(pts)):
    dt = pts[i][0] - pts[i - 1][0]
    if dt > 0: vel.append((pts[i][0], (pts[i][1] - pts[i - 1][1]) / dt))
plot(vel, gy0 + gh + 50, "velocity of the presentation root (m/s): decays through airborne → impact → slide, returns negative as the keeper walks back while rising", "m/s", (220, 180, 80), marks)
d.text((10, H2 - 20), "screen offset at tLand: (%.1f, %.1f) px · the shadow follows the same offset" % (max(pts, key=lambda q: q[1])[2], max(pts, key=lambda q: q[1])[3]), fill=(200, 200, 200), font=FONT)
img.save(os.path.join(OUT, "D_presentation_root.png"))
json.dump({"pres_per_tick": [{"f": f_, "tl": tl, "dm": dm, "sx": sx, "sy": sy, "drawn": dr} for tl, dm, sx, sy, f_, dr in pts]}, open(os.path.join(OUT, "D_presentation_root.json"), "w"), indent=1)
print("review pack written:", sorted(os.listdir(OUT)))
