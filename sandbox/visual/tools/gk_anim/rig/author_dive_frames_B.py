# ROUTE B: same W_SET rig for the grounded frames, but the airborne frames borrow the FULL-LENGTH arms of the V1 high-dive frame 8
# (east, mirrored to west): the lead arm (straight, glove up-left) and the trailing arm, seated on the SET torso's shoulders.
#   python3 author_dive_frames_B.py <outdir>
import sys, os, json, math
sys.path.insert(0, os.path.dirname(__file__))
import author_dive_frames as A          # runs route A into the same outdir first (its frames F0-F2 are reused)
from gk_rig import Part, Source, mat_apply
from PIL import Image, ImageDraw, ImageFont
OUT = A.OUT; R = A.R
HD8 = "assets/visual_v1/originals/character_f4838361/anim/high_dive_right/east/8.png"
src8 = Source(HD8, mirror=True, label="high_dive f8 (mirrored)")
# lead arm: shoulder ≈ (68,52) → glove ≈ (30,42) in the mirrored frame; trailing arm: shoulder ≈ (80,56) → glove ≈ (90,84)
R.add(Part("lead_arm_f8",  src8, [(19,32),(46,32),(60,43),(70,48),(70,58),(50,58),(19,52)], pivot=(68,52), parent="torso", attach=(63,43), z=13, classes={"G","W","?","K"}, colour=(120,220,80)))
R.add(Part("trail_arm_f8", src8, [(73,52),(92,52),(99,76),(99,92),(80,92),(73,66)], pivot=(80,55), parent="torso", attach=(77,46), z=3, classes={"G","W","?","K"}, colour=(70,150,60)))
R.assign()
HIDE = ("near_upper", "near_fore", "near_glove", "far_upper", "far_fore", "far_glove")
FR = [f for f in A.FRAMES if f["name"].startswith(("F0", "F1", "F2"))]
def joint(M, n): return mat_apply(M[n], *R.parts[n].pivot)
def frame(name, u, pose, note):
    img, M = R.render(pose, canvas=A.CANVAS, offset=A.OFF, hide=HIDE)
    j = {n: tuple(round(v, 1) for v in joint(M, n)) for n in R.order if n not in HIDE}
    # glove landmarks for the anchors: lead glove = far end of the lead arm, trailing glove = far end of the trailing arm
    lead = mat_apply(M["lead_arm_f8"], 30, 42); trail = mat_apply(M["trail_arm_f8"], 90, 84)
    j["near_glove"] = tuple(round(v, 1) for v in lead); j["far_glove"] = tuple(round(v, 1) for v in trail)
    FR.append({"name": name, "u": u, "pose": pose, "note": note, "root": [A.ROOT[0] + A.OFF[0], A.ROOT[1] + A.OFF[1]], "joints": j, "img": img}); return img
# F3: lead arm from f8 rotated up (its rest points up-left at ~15° above horizontal → +45° more toward vertical), trailing arm swinging forward
p = {"pelvis": {"dy": 1, "dx": -1}, "torso": {"dy": -3}, "lead_arm_f8": {"rot": 40}, "trail_arm_f8": {"rot": 110, "dx": -8},
     "near_thigh": {"rot": -16, "ext": 2}, "near_shin": {"rot": 4, "ext": 3}, "near_boot": {"rot": 6}, "far_thigh": {"rot": -24, "ext": 2}, "far_shin": {"rot": 6, "ext": 4}, "far_boot": {"rot": 8}}
p["near_thigh_edge"] = dict(p["near_thigh"]); frame("F3_EARLY_FLIGHT", 0.45, p, "V1 f8 lead arm (full length) rotated +40° toward vertical; trailing arm swinging forward; legs as route A")
p = {"pelvis": {"dy": 5, "dx": -1}, "torso": {"dy": -5}, "head": {"rot": 2}, "lead_arm_f8": {"rot": 48}, "trail_arm_f8": {"rot": 165, "dx": -14},
     "near_thigh": {"rot": -26, "ext": 4}, "near_shin": {"rot": 6, "ext": 6}, "near_boot": {"rot": 8}, "far_thigh": {"rot": -34, "ext": 4}, "far_shin": {"rot": 8, "ext": 7}, "far_boot": {"rot": 10}}
p["near_thigh_edge"] = dict(p["near_thigh"]); frame("F4_MID_FLIGHT", 0.65, p, "lead arm +48° (up-left toward the contact glove), trailing arm up behind the head; spine extended, legs long")
meta = []
for f in FR:
    f["img"].save(os.path.join(OUT, f["name"] + ".png"))
    R.viz(f["pose"], scale=4, canvas=A.CANVAS, offset=A.OFF, title=f["name"] + " (route B)").save(os.path.join(OUT, f["name"] + "_viz.png"))
    meta.append({k: v for k, v in f.items() if k != "img"})
json.dump({"canvas": A.CANVAS, "offset": A.OFF, "frames": meta}, open(os.path.join(OUT, "frames.json"), "w"), indent=1)
rx, ry = A.ROOT
for f in FR:
    j = f["joints"]; print(f"{f['name']:16s} rel-root head ({j['head'][0]-rx:+.0f},{j['head'][1]-ry:+.0f})  near_glove ({j['near_glove'][0]-rx:+.0f},{j['near_glove'][1]-ry:+.0f})  far_glove ({j['far_glove'][0]-rx:+.0f},{j['far_glove'][1]-ry:+.0f})  near_boot ({j['near_boot'][0]-rx:+.0f},{j['near_boot'][1]-ry:+.0f})  far_boot ({j['far_boot'][0]-rx:+.0f},{j['far_boot'][1]-ry:+.0f})")
# strips (same layout as route A)
F = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 13); S = 3; cells = []
for f in FR:
    im = f["img"]; up = im.resize((im.width * S, im.height * S), Image.NEAREST); bg = Image.new("RGB", (up.width, up.height + 20), (238, 238, 240)); bg.paste(up, (0, 0), up)
    d = ImageDraw.Draw(bg); d.text((4, up.height + 3), f"{f['name']}  u={f['u']}", font=F, fill=(20, 20, 24)); cells.append(bg)
dn = Image.open("assets/visual_v1/goalkeeper/contextual/DIVE_NORTH_CW50.png").convert("RGBA"); dn2 = dn.resize((round(dn.width * 0.72), round(dn.height * 0.72)), Image.NEAREST)
up = dn2.resize((dn2.width * S, dn2.height * S), Image.NEAREST); bg = Image.new("RGB", (up.width, cells[0].height), (238, 238, 240)); bg.paste(up, (0, bg.height - 20 - up.height), up)
ImageDraw.Draw(bg).text((4, bg.height - 17), "F5 CONTACT (existing DIVE_NORTH_CW50 @0.72)", font=F, fill=(20, 20, 24)); cells.append(bg)
W = sum(c.width + 10 for c in cells) + 10; H = max(c.height for c in cells) + 20; strip = Image.new("RGB", (W, H), (18, 19, 22)); x = 10
for c in cells: strip.paste(c, (x, 10)); x += c.width + 10
strip.save(os.path.join(OUT, "STRIP_routeB.png"))
GS = 0.41804; Z = 4; row = []
for f in FR + [None]:
    im = dn if f is None else f["img"]; body = 0.72 if f is None else 1.0
    g = im.resize((round(im.width * GS * body), round(im.height * GS * body)), Image.NEAREST); g = g.crop(g.getbbox()); row.append(g)
Wr = sum(g.width * Z + 12 for g in row) + 12; Hr = max(g.height for g in row) * Z + 40; gs = Image.new("RGB", (Wr, Hr), (238, 238, 240)); x = 12
for g in row: up = g.resize((g.width * Z, g.height * Z), Image.NEAREST); gs.paste(up, (x, Hr - 30 - up.height), up); x += up.width + 12
ImageDraw.Draw(gs).text((6, Hr - 22), "ROUTE B at GAMEPLAY SCALE (0.418, nearest) shown at 4x — F0..F4 then the existing contact pose", font=F, fill=(20, 20, 24)); gs.save(os.path.join(OUT, "STRIP_routeB_gameplay_x4.png"))
print("route B strips written")
