#!/usr/bin/env python3
"""COORDINATE / VIEW AUDIT (Animation V1.1, Part 3). Inputs: a projection-basis probe JSON (screen vectors of +1 m along pitch
x / y / z at the keeper for one or more cameras), the V1 acceptance records (simulation root/hand per capture + the art
frame shown) and the V1 clip anchors. Outputs: (1) the world→screen movement basis table, (2) per representative save the
decomposition of the SIMULATED displacement into goal-lateral / depth / vertical and the RENDERED glove/body displacement of
the V1 side-view art (screen px and the world-axis interpretation), with the angle between the animation vector and the
projected save vector, (3) axis diagrams for keeper facings S, SE/SW, E/W.
  python3 gk_coord_audit.py <basis_probe2.json> <acceptance_records.json> <anchors_dir> <manifest.json> <out_dir>"""
import json, sys, os, math
from PIL import Image, ImageDraw, ImageFont
basis = json.load(open(sys.argv[1])); recs = json.load(open(sys.argv[2])); AD = sys.argv[3]; MAN = json.load(open(sys.argv[4])); OUT = sys.argv[5]; os.makedirs(OUT, exist_ok=True)
cam = basis["cams"]["live_playtest"]; B = cam["atKeeper"]; ex, ey, ez = B["ex"], B["ey"], B["ez"]; S = cam["spriteScale"]
def proj(dx, dy, dz): return (ex[0] * dx + ey[0] * dy + ez[0] * dz, ex[1] * dx + ey[1] * dy + ez[1] * dz)
def world_from_screen(px, py):  # 2-D → (depth x, lateral y) assuming no vertical component (interpretation only)
    lat = py / ey[1]; dep = (px - ey[0] * lat) / ex[0]; return dep, lat
md = []
md.append("# Coordinate / view audit — why the V1 keeper 'jumped forward'\n")
md.append("Camera: live playtest rig (rail 88 m, zoom 1.25) — the view the review was made in. Keeper at (%.2f, %.2f) facing %.0f° (west = toward the pitch). Sprite scale %.3f screen px per sprite px.\n" % (basis["keeper"]["x"], basis["keeper"]["y"], basis["keeper"]["facingDeg"], S))
md.append("## 1. World → screen movement basis at the keeper (screen px per metre; screen y grows DOWN)\n")
md.append("| world axis | meaning for an east-goal keeper facing west | screen vector (px/m) | length px/m |\n|---|---|---|---|")
md.append("| +x (pitch length) | DEPTH toward his own goal (−x = toward the shooter) | (%.2f, %.2f) | %.1f |" % (ex[0], ex[1], math.hypot(*ex)))
md.append("| +y (pitch width) | GOAL LINE / his LATERAL axis (+y = south = his LEFT; −y = north = his RIGHT) | (%.2f, %.2f) | %.1f |" % (ey[0], ey[1], math.hypot(*ey)))
md.append("| +z (height) | VERTICAL | (%.2f, %.2f) | %.1f |" % (ez[0], ez[1], math.hypot(*ez)))
md.append("\nThe goal line is foreshortened %.1f× relative to depth and %.1f× relative to height: a 2 m lateral dive moves the root only %.0f px on screen, almost straight down/up, while a 1 m body extension along the facing axis moves %.0f px sideways.\n" % (math.hypot(*ex) / math.hypot(*ey), math.hypot(*ez) / math.hypot(*ey), 2 * math.hypot(*ey), math.hypot(*ex)))
for name, c in basis["cams"].items():
    b = c["atKeeper"]; md.append("- camera `%s` (rail %s, zoom %s): ex %s, ey %s, ez %s px/m, sprite scale %s" % (name, c["rail"], c["zoom"], b["ex"], b["ey"], b["ez"], c["spriteScale"]))
# 2. representative saves from the V1 records
anch = {}
for c in MAN["clips"].values():
    for v in c["variants"]: anch[(c["family"] if "families" not in c else c["families"][0], v["dir"])] = v["anchors"]
def clip_glove(clipname, dirname, fidx, mirrored):
    p = os.path.join(AD, "%s_%s.json" % ({"low_collapse": "low_collapse_right", "medium_dive": "medium_dive_right", "high_dive": "high_dive_right", "foot_save": "foot_save_right", "shuffle": "shuffle_right", "recover": "recover_getting_up"}.get(clipname, clipname), dirname))
    if not os.path.exists(p): return None
    m = json.load(open(p)); f = m["frames"][fidx]; W = 148 if dirname == "east" else 140
    piv = W / 2; g = f["lead_glove"]; cxb = f["content_cx"]; gy = m["ground_row"]
    def tx(x): return (W - x) - piv if mirrored else x - piv
    return {"glove": (tx(g[0]), g[1] - gy), "body": (tx(cxb), f["content_cy"] - gy), "head": (tx(f["head"][0]), f["head"][1] - gy) if f["head"] else None}
md.append("\n## 2. Representative V1 saves: simulated displacement vs what the side-view art drew\n")
md.append("Decomposition of the SIMULATION hand displacement (feet at commit → contact-tick hand) into goal-lateral / depth / vertical, projected to the screen; versus the RENDERED lead-glove offset of the V1 frame that was on screen (root-anchored, mirrored for the west facing), and the same for the drawn body centre. 'world reading' inverts the two screen components assuming no vertical error — it is how a viewer reads the motion.\n")
md.append("| scenario | family / art frame | SIM hand Δ in the keeper frame: lateral (+ = his right) / depth (+ = toward shooter) / vertical vs hand origin (m) | SIM hand on screen (px, from the root) | DRAWN lead glove offset (px) → world reading along pitch x (depth) / pitch y (goal line) (m) | DRAWN body-centre offset (px) → x / y (m) | angle between animation vector and save vector |\n|---|---|---|---|---|---|---|")
import re
for sc in recs:
    rr = [r for r in sc["recs"] if r.get("cur") and r["cur"].get("family") and r["cur"].get("clip") and r["cur"]["clip"]["name"] != "recover" and r["cur"]["clip"]["mode"] != "post"]
    if not rr: continue
    # the capture where the save art was fully extended: first contact capture, else the last reach/hold capture
    ct = [r for r in rr if r.get("contact") and r["contact"]["t"] <= r["t"]]; r = ct[0] if ct else rr[-1]
    cm = r.get("commit"); cur = r["cur"]; cl = cur["clip"]
    if not cm or not r.get("hand"): continue
    feet = cm.get("target") and None
    # simulated hand displacement relative to the root at that capture
    root = r["root"]; hand = r["hand"]; dx, dy, dz = hand[0] - root[0], hand[1] - root[1], hand[2]
    f_commit = next((q["facing"] for q in sc["recs"] if q.get("cur") and q["cur"].get("family")), r["facing"])     # facing frozen at the commit tick
    fr_ = math.radians(f_commit); fx_, fy_ = math.cos(fr_), math.sin(fr_); rx_, ry_ = -fy_, fx_
    lat_k = dx * rx_ + dy * ry_; dep_k = dx * fx_ + dy * fy_                  # keeper frame: + lateral = his RIGHT, + depth = toward the shooter
    sp = proj(dx, dy, dz)
    m = re.match(r"(\w+)/(\w[\w-]*) f(\d+)", cur.get("art") or ""); 
    if not m: continue
    g = clip_glove(m.group(1), m.group(2), int(m.group(3)), cl["mir"])
    if not g: continue
    gpx = (g["glove"][0] * S, g["glove"][1] * S); bpx = (g["body"][0] * S, g["body"][1] * S)
    gd = world_from_screen(*gpx); bd = world_from_screen(*bpx)
    ang = math.degrees(math.atan2(gpx[1], gpx[0]) - math.atan2(sp[1], sp[0])); ang = (ang + 180) % 360 - 180
    md.append("| %d %s | %s / %s | lat %+.2f · depth %+.2f · vert %+.2f | (%+.0f, %+.0f) | (%+.0f, %+.0f) → x %+.2f · y %+.2f | (%+.0f, %+.0f) → x %+.2f · y %+.2f | %.0f° |" % (sc["idx"], sc["name"][:28], cur["family"], (cur.get("art") or "")[:34], lat_k, dep_k, dz - 1.43, sp[0], sp[1], gpx[0], gpx[1], gd[0], gd[1], bpx[0], bpx[1], bd[0], bd[1], abs(ang)))
md.append("\nReading: for every dive the drawn glove sits 15–25 px along the DEPTH axis (≈ 0.8–1.2 m toward the shooter) and 30–40 px UP, while the simulated hand moved mostly along the goal line, which is only 8 px/m on this camera. The body centre of the art also travels along the depth axis. That is the forward/backward 'jump': the art's body axis was the sprite's facing axis, and the facing axis projects to the screen horizontal, so the eye read a lunge toward the shooter instead of a dive across the goal.\n")
open(os.path.join(OUT, "COORDINATE_AUDIT.md"), "w").write("\n".join(md))
# 3. diagrams
try: font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 12); fb = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 13)
except Exception: font = fb = ImageFont.load_default()
def diagram(facing_name, facing_deg, out):
    W, H = 1180, 560; im = Image.new("RGB", (W, H), (24, 26, 30)); dr = ImageDraw.Draw(im)
    dr.text((10, 8), "Keeper facing %s (%.0f°): world axes vs screen-projected axes, save vector vs animation vector (live camera basis)" % (facing_name, facing_deg), fill=(255, 255, 255), font=fb)
    # left: top-down world sketch (x right, y down), 1 m = 40 px
    ox, oy, k = 230, 300, 40
    dr.text((20, 40), "TOP-DOWN WORLD (1 m = 40 px): x = pitch length (depth), y = goal line (lateral)", fill=(200, 200, 200), font=font)
    dr.line([ox - 150, oy, ox + 150, oy], fill=(90, 90, 90)); dr.line([ox, oy - 150, ox, oy + 150], fill=(90, 90, 90))
    dr.text((ox + 152, oy - 6), "+x depth (own goal)", fill=(127, 208, 255), font=font); dr.text((ox + 4, oy + 152), "+y goal line (south)", fill=(255, 210, 74), font=font)
    f = math.radians(facing_deg); fx, fy = math.cos(f), math.sin(f); rx, ry = -fy, fx
    dr.line([ox, oy, ox + fx * 60, oy + fy * 60], fill=(120, 255, 120), width=3); dr.text((ox + fx * 66, oy + fy * 66), "facing (to shooter)", fill=(120, 255, 120), font=font)
    dr.line([ox, oy, ox + rx * 60, oy + ry * 60], fill=(255, 80, 220), width=2); dr.text((ox + rx * 66, oy + ry * 66), "keeper RIGHT", fill=(255, 80, 220), font=font)
    lat, dz = 1.5, 1.2; sx_, sy_ = rx * lat, ry * lat          # save vector: 1.5 m to the keeper's right (+1.2 m up)
    dr.line([ox, oy, ox + sx_ * k, oy + sy_ * k], fill=(255, 80, 220), width=4); dr.text((ox + sx_ * k + 6, oy + sy_ * k), "save vector: 1.5 m right, hand 1.2 m up", fill=(255, 80, 220), font=font)
    # V1 animation vector: 1.0 m along the facing (side-view art extends along the body's facing axis)
    dr.line([ox, oy, ox + fx * 1.0 * k, oy + fy * 1.0 * k], fill=(255, 120, 40), width=4); dr.text((ox + fx * 1.0 * k + 6, oy + fy * 1.0 * k + 12), "V1 art body axis (1 m along facing)", fill=(255, 120, 40), font=font)
    # right: screen projection
    ox2, oy2 = 830, 330
    dr.text((560, 40), "SCREEN (live camera, px): projected axes at the keeper, save vector, V1 animation vector, V1.1 pose axis", fill=(200, 200, 200), font=font)
    def P(dx, dy, dzz): q = proj(dx, dy, dzz); return (ox2 + q[0] * 3, oy2 + q[1] * 3)     # 3× for legibility
    for (dx, dy, dzz, col, lab) in [(1, 0, 0, (127, 208, 255), "+x depth 1 m"), (0, 1, 0, (255, 210, 74), "+y goal line 1 m"), (0, 0, 1, (255, 255, 255), "+z 1 m")]:
        q = P(dx, dy, dzz); dr.line([ox2, oy2, q[0], q[1]], fill=col, width=2); dr.text((q[0] + 4, q[1] - 6), lab, fill=col, font=font)
    q = P(fx * 0.5, fy * 0.5, 0); dr.line([ox2, oy2, q[0], q[1]], fill=(120, 255, 120), width=3); dr.text((q[0] + 4, q[1] + 4), "facing", fill=(120, 255, 120), font=font)
    q = P(sx_, sy_, dz); dr.line([ox2, oy2, q[0], q[1]], fill=(255, 80, 220), width=4); dr.text((q[0] + 6, q[1] - 14), "projected SAVE vector (%.0f, %.0f px)" % (proj(sx_, sy_, dz)[0], proj(sx_, sy_, dz)[1]), fill=(255, 80, 220), font=font)
    q = P(fx * 1.0, fy * 1.0, 0.9); dr.line([ox2, oy2, q[0], q[1]], fill=(255, 120, 40), width=4); dr.text((q[0] + 6, q[1] + 4), "V1 animation vector (%.0f, %.0f px)" % (proj(fx, fy, 0.9)[0], proj(fx, fy, 0.9)[1]), fill=(255, 120, 40), font=font)
    a1 = math.degrees(math.atan2(*reversed(proj(sx_, sy_, dz)))); a2 = math.degrees(math.atan2(*reversed(proj(fx, fy, 0.9)))); dd = abs((a1 - a2 + 180) % 360 - 180)
    dr.text((560, 480), "angle between V1 animation vector and projected save vector: %.0f°   |   V1.1 rule: the drawn body axis must follow the projected save vector (magenta); rotations are chosen by their MEASURED screen body axis, mismatch > 35° is flagged AXIS_MISMATCH, no art → diagnostic figure" % dd, fill=(230, 230, 230), font=font)
    dr.text((560, 500), "sprite scale %.3f: a 40-px-long authored body spans %.1f m of goal line on this camera vs %.1f m of depth — a lying body drawn along the goal line will always look longer than its physical extent" % (S, 40 / math.hypot(*ey), 40 / math.hypot(*ex)), fill=(180, 180, 180), font=font)
    im.save(out)
diagram("SOUTH (shooter on the by-line, south)", 90, os.path.join(OUT, "axes_facing_S.png"))
diagram("SOUTH-WEST (shooter at 45°)", 135, os.path.join(OUT, "axes_facing_SW.png"))
diagram("WEST (normal: shooter on the pitch)", 180, os.path.join(OUT, "axes_facing_W.png"))
print("wrote", OUT)
