#!/usr/bin/env python3
"""Annotate the camera plates (Animation V1.2 Phases 1–2, 12–13).
  python3 annotate.py <plates_dir> <out_dir>
Outputs: PHASE1_live_camera_proof.png (live camera: SET keeper, goal, goal line, SAVE_GOAL_LEFT/RIGHT, depth, vertical),
GK_SAVE_REFERENCE_LEFT.png / RIGHT.png (1:1 authoring references), gen_<pose>.png (generation plates: ball at the simulated
contact target, arrow feet→target, hand target marker; small legend), plus plates_annotated.json with pixel coordinates."""
import json, sys, os, math
from PIL import Image, ImageDraw, ImageFont
D, OUT = sys.argv[1], sys.argv[2]; os.makedirs(OUT, exist_ok=True)
try: font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 12); fb = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 13); fs = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 10)
except Exception: font = fb = fs = ImageFont.load_default()
def arrow(dr, a, b, col, w=3, head=9, dash=None):
    ax, ay = a; bx, by = b; ang = math.atan2(by - ay, bx - ax)
    if dash: 
        L = math.hypot(bx - ax, by - ay); n = int(L / (dash * 2)); 
        for i in range(n): t0 = i * 2 * dash / L; t1 = min(1, (i * 2 + 1) * dash / L); dr.line([(ax + (bx - ax) * t0, ay + (by - ay) * t0), (ax + (bx - ax) * t1, ay + (by - ay) * t1)], fill=col, width=w)
    else: dr.line([a, b], fill=col, width=w)
    for s in (2.6, -2.6): dr.line([b, (bx - head * math.cos(ang + s), by - head * math.sin(ang + s))], fill=col, width=w)
def label(dr, xy, text, col, f=font, bg=(0, 0, 0)):
    x, y = xy; tw = dr.textlength(text, font=f); dr.rectangle([x - 2, y - 1, x + tw + 2, y + 14], fill=bg); dr.text((x, y), text, fill=col, font=f)
# ── Phase 1: live camera proof
g = json.load(open(os.path.join(D, "geom_live.json"))); im = Image.open(os.path.join(D, "live_camera_raw.png")).convert("RGB"); dr = ImageDraw.Draw(im)
r = g["root"]; ey = [g["ey"][0] - r[0], g["ey"][1] - r[1]]; eyN = [g["eyN"][0] - r[0], g["eyN"][1] - r[1]]; ex = [g["ex"][0] - r[0], g["ex"][1] - r[1]]; ez = [g["ez"][0] - r[0], g["ez"][1] - r[1]]
K = 2.0   # metres shown for the goal-line arrows
dr.line([tuple(g["lineN"]), tuple(g["lineS"])], fill=(255, 255, 0), width=2)
dr.line([tuple(g["postN"]), tuple(g["barN"])], fill=(255, 255, 0), width=1); dr.line([tuple(g["postS"]), tuple(g["barS"])], fill=(255, 255, 0), width=1); dr.line([tuple(g["barN"]), tuple(g["barS"])], fill=(255, 255, 0), width=1)
arrow(dr, (r[0], r[1]), (r[0] + eyN[0] * K, r[1] + eyN[1] * K), (80, 200, 255), 4); label(dr, (r[0] + eyN[0] * K - 60, r[1] + eyN[1] * K - 20), "SAVE_GOAL_LEFT = −goal-line (north, far post) screen (%.1f, %.1f) px/m" % (eyN[0], eyN[1]), (80, 200, 255))
arrow(dr, (r[0], r[1]), (r[0] + ey[0] * K, r[1] + ey[1] * K), (255, 140, 60), 4); label(dr, (r[0] + ey[0] * K + 6, r[1] + ey[1] * K + 4), "SAVE_GOAL_RIGHT = +goal-line (south, near post) screen (%.1f, %.1f) px/m" % (ey[0], ey[1]), (255, 140, 60))
arrow(dr, (r[0], r[1]), (r[0] + ex[0] * 2, r[1] + ex[1] * 2), (255, 80, 220), 3); label(dr, (r[0] + ex[0] * 2 - 150, r[1] + 8), "DEPTH toward shooter (−x) (%.1f, %.1f) px/m" % (ex[0], ex[1]), (255, 80, 220))
arrow(dr, (r[0], r[1]), (r[0] + ez[0] * 2, r[1] + ez[1] * 2), (255, 255, 255), 3); label(dr, (r[0] + ez[0] * 2 + 6, r[1] + ez[1] * 2 - 4), "VERTICAL +2 m (%.1f, %.1f) px/m" % (ez[0], ez[1]), (255, 255, 255))
dr.ellipse([r[0] - 4, r[1] - 4, r[0] + 4, r[1] + 4], outline=(255, 60, 60), width=2); label(dr, (r[0] - 90, r[1] + 26), "GK SET root (D2) — keeper (%.2f, %.2f) facing %.0f°" % (g["keeper"][0], g["keeper"][1], g["facingDeg"]), (255, 120, 120))
label(dr, (g["goalC"][0] - 40, g["goalC"][1] + 40), "goal line x = 105 (yellow), mouth 30.34–37.66", (255, 255, 0))
label(dr, (10, 8), "PHASE 1 PROOF — live playtest camera (rail %s m, zoom %s): the two save directions run ALONG THE GOAL LINE (2 m arrows), not toward the camera" % (g["rail"], g["zoom"]), (255, 255, 255), fb)
label(dr, (10, 26), "goal-line axis is foreshortened: |ey| = %.1f px/m vs depth %.1f px/m and height %.1f px/m — a 2 m lateral dive = %.0f px on screen" % (math.hypot(*ey), math.hypot(*ex), math.hypot(*ez), 2 * math.hypot(*ey)), (220, 220, 220))
# magnified inset (3×) of the keeper/goal region with clean labels, composited over the stands (top-left)
ins_w, ins_h = 300, 170; ix0, iy0 = int(r[0]) - 150, int(r[1]) - 95
inset = Image.open(os.path.join(D, "live_camera_raw.png")).convert("RGB").crop((ix0, iy0, ix0 + ins_w, iy0 + ins_h)).resize((ins_w * 3, ins_h * 3), Image.NEAREST); di = ImageDraw.Draw(inset)
def I(p): return ((p[0] - ix0) * 3, (p[1] - iy0) * 3)
di.line([I(g["lineN"]), I(g["lineS"])], fill=(255, 255, 0), width=3)
arrow(di, I(r), I((r[0] + eyN[0] * K, r[1] + eyN[1] * K)), (80, 200, 255), 6, 16); label(di, (I(r)[0] - 250, I(r)[1] - 80), "SAVE_GOAL_LEFT  −goal line (north, far post)  (%.1f, %.1f) px/m" % (eyN[0], eyN[1]), (80, 200, 255), fb)
arrow(di, I(r), I((r[0] + ey[0] * K, r[1] + ey[1] * K)), (255, 140, 60), 6, 16); label(di, (I(r)[0] + 20, I(r)[1] + 60), "SAVE_GOAL_RIGHT  +goal line (south, near post)  (%.1f, %.1f) px/m" % (ey[0], ey[1]), (255, 140, 60), fb)
arrow(di, I(r), I((r[0] + ex[0] * 2, r[1] + ex[1] * 2)), (255, 80, 220), 5, 14); label(di, (I(r)[0] - 300, I(r)[1] + 8), "DEPTH toward shooter 2 m", (255, 80, 220), fb)
arrow(di, I(r), I((r[0] + ez[0] * 2, r[1] + ez[1] * 2)), (255, 255, 255), 5, 14); label(di, (I(r)[0] + 12, I(r)[1] - 130), "VERTICAL 2 m", (255, 255, 255), fb)
di.ellipse([I(r)[0] - 6, I(r)[1] - 6, I(r)[0] + 6, I(r)[1] + 6], outline=(255, 60, 60), width=3); label(di, (I(r)[0] - 60, I(r)[1] + 22), "GK SET root (D2)", (255, 120, 120), fb)
label(di, (6, 6), "3× magnified: both save arrows (2 m each) run along the yellow goal line", (255, 255, 255), fb)
im.paste(inset, (0, 60)); dr.rectangle([0, 60, ins_w * 3, 60 + ins_h * 3], outline=(255, 255, 255), width=2)
im.save(os.path.join(OUT, "PHASE1_live_camera_proof.png"))
# ── Phase 2: 1:1 authoring references from the clean plate
o = json.load(open(os.path.join(D, "plate_origin.json"))); ga = json.load(open(os.path.join(D, "geom_auth.json")))
ra = ga["root"]; px0, py0 = o["px0"], o["py0"]; rp = (ra[0] - px0, ra[1] - py0)
eyA = [ga["ey"][0] - ra[0], ga["ey"][1] - ra[1]]; eyNA = [ga["eyN"][0] - ra[0], ga["eyN"][1] - ra[1]]; exA = [ga["ex"][0] - ra[0], ga["ex"][1] - ra[1]]; ezA = [ga["ez"][0] - ra[0], ga["ez"][1] - ra[1]]
def plate_ref(side, out):
    im = Image.open(os.path.join(D, "auth_plate_clean.png")).convert("RGB"); dr = ImageDraw.Draw(im)
    v = eyNA if side == "LEFT" else eyA; col = (80, 200, 255) if side == "LEFT" else (255, 140, 60); K = 2.2
    tip = (rp[0] + v[0] * K, rp[1] + v[1] * K)
    arrow(dr, rp, tip, col, 4); label(dr, (min(im.width - 200, max(2, tip[0] - 60)), max(2, tip[1] - 18 if side == "LEFT" else tip[1] + 6)), "SAVE_GOAL_%s: travel across the goal" % side, col, fb)
    arrow(dr, rp, (rp[0] + exA[0] * 1.0, rp[1] + exA[1] * 1.0), (255, 80, 220), 2); label(dr, (rp[0] + exA[0] * 1.0 - 90, rp[1] + 10), "toward shooter", (255, 80, 220), fs)
    arrow(dr, rp, (rp[0] + ezA[0] * 1.0, rp[1] + ezA[1] * 1.0), (255, 255, 255), 2); label(dr, (rp[0] + 6, rp[1] + ezA[1] * 1.0 - 14), "up 1 m", (255, 255, 255), fs)
    dr.ellipse([rp[0] - 3, rp[1] - 3, rp[0] + 3, rp[1] + 3], outline=(255, 60, 60), width=2)
    label(dr, (4, 4), "GK_SAVE_REFERENCE_%s — exact gameplay camera, sprite scale 1:1 (zoom %.2f)" % (side, ga["zoom"]), (255, 255, 255), fs)
    label(dr, (4, 18), "goal line: %.1f px/m along the arrow; height %.1f px/m; depth %.1f px/m" % (math.hypot(*v), math.hypot(*ezA), math.hypot(*exA)), (220, 220, 220), fs)
    im.save(out)
plate_ref("LEFT", os.path.join(OUT, "GK_SAVE_REFERENCE_LEFT.png")); plate_ref("RIGHT", os.path.join(OUT, "GK_SAVE_REFERENCE_RIGHT.png"))
# ── Phase 12–13: generation plates (ball already at the target in the screenshot); arrow feet→target + hand target marker
pl = json.load(open(os.path.join(D, "plates.json"))); rec = []
for pz in pl["plates"]:
    c = pz["commit"]; im = Image.open(os.path.join(D, pz["file"])).convert("RGB"); dr = ImageDraw.Draw(im)
    feet = (c["feetScreen"][0] - px0, c["feetScreen"][1] - py0); tg = (c["targetScreen"][0] - px0, c["targetScreen"][1] - py0); tgG = (c["targetGround"][0] - px0, c["targetGround"][1] - py0)
    col = (80, 200, 255) if pz["side"] == "GOAL_LEFT" else (255, 140, 60)
    arrow(dr, feet, tgG, col, 3); dr.line([tgG, tg], fill=col, width=2)
    dr.ellipse([tg[0] - 5, tg[1] - 5, tg[0] + 5, tg[1] + 5], outline=(255, 255, 255), width=2)          # simulated hand/contact target
    dr.ellipse([feet[0] - 3, feet[1] - 3, feet[0] + 3, feet[1] + 3], outline=(255, 60, 60), width=2)
    label(dr, (4, 4), "%s %s — exact gameplay camera; ball = simulated contact point; white ring = hand target" % (pz["fam"], pz["side"]), (255, 255, 255), fs)
    label(dr, (4, 18), "target lat %+.2f m along the goal line, height %.2f m, norm %.2f (%s / %s)" % (pz["laty"], c["target"][2], c["envNorm"], c["action"], c["tier"]), (220, 220, 220), fs)
    out = os.path.join(OUT, "gen_%s.png" % pz["name"]); im.save(out)
    # unannotated copy with only the ball (for generation runs that should not see arrows)
    Image.open(os.path.join(D, pz["file"])).convert("RGB").save(os.path.join(OUT, "gen_%s_noarrow.png" % pz["name"]))
    rec.append({"name": pz["name"], "family": pz["fam"], "side": pz["side"], "laty": pz["laty"], "z": pz["z"], "feet_px": feet, "target_px": tg, "target_ground_px": tgG, "root_px": rp, "commit": {k: c[k] for k in ("feet", "target", "handOrigin", "action", "tier", "envNorm", "maxLat", "execTime")}, "cls": c["cls"], "file": os.path.basename(out)})
json.dump({"plate": {"w": o["PW"], "h": o["PH"], "root_px": rp, "sprite_scale": ga["spriteScale"], "zoom": ga["zoom"], "rail": ga["rail"], "basis_px_per_m": {"goal_line_south": eyA, "goal_line_north": eyNA, "toward_shooter": exA, "up": ezA}}, "poses": rec}, open(os.path.join(OUT, "plates_annotated.json"), "w"), indent=1)
print("annotated", len(rec), "plates; root in plate", rp)
