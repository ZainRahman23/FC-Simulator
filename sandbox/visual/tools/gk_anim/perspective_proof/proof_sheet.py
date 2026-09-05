#!/usr/bin/env python3
"""Two-pose perspective proof sheets.  python3 proof_sheet.py <composite_dir> <plates_dir> <gen_dir> <out_dir>
   PRIMARY (clean): SET reference | DIVE LEFT RAW | DIVE RIGHT RAW — 1:1 camera (x2), live gameplay camera (x3), raw PixelLab frames (x2).
   DIAGNOSTIC: the same with root / save vector / ball target / glove rings + numbers, and the extraction strips."""
import sys, os, json
from PIL import Image, ImageDraw, ImageFont
C, PL, G, O = sys.argv[1:5]; os.makedirs(O, exist_ok=True)
rep = json.load(open(os.path.join(C, "composite.json"))); plates = json.load(open(os.path.join(PL, "plates.json")))
try: font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 13); fontb = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 14); fonth = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 20)
except Exception: font = fontb = fonth = ImageFont.load_default()
BG = (18, 20, 24); PAD = 10
def up(im, k): return im.resize((im.width * k, im.height * k), Image.NEAREST)
def load(d, f): return Image.open(os.path.join(d, f)).convert("RGB")
def tight(im, root, w, h):   # crop w x h around the root (root placed at 50% x, 68% y)
    x0 = int(root[0] - w * 0.5); y0 = int(root[1] - h * 0.68); return im.crop((x0, y0, x0 + w, y0 + h))
def build(mode, out):
    L = rep["poses"]["GOAL_LEFT"]; R = rep["poses"]["GOAL_RIGHT"]; m = mode
    auth = [tight(load(C, rep["set"]["auth"]["file"]), rep["set"]["auth"]["root"], 300, 300), tight(load(C, L["shots"][m]["files"]["auth"]["file"]), L["shots"][m]["files"]["auth"]["root"], 300, 300), tight(load(C, R["shots"][m]["files"]["auth"]["file"]), R["shots"][m]["files"]["auth"]["root"], 300, 300)]
    live = [load(C, rep["set"]["live"]["file"]), load(C, L["shots"][m]["files"]["live"]["file"]), load(C, R["shots"][m]["files"]["live"]["file"])]
    raw = [load(PL, "crop_SET.png"), load(G, "pro_GOAL_LEFT.png"), load(G, "pro_GOAL_RIGHT.png")]
    cols = ["ORIGINAL SET REFERENCE", "AIRBORNE_DIVE_GOAL_LEFT — RAW", "AIRBORNE_DIVE_GOAL_RIGHT — RAW"]
    rows = [("1:1 authoring camera (sprite scale 1.0, ×2 nearest) — the pose drawn RAW at the simulation root, ball at the controlled target", [up(i, 2) for i in auth]),
            ("LIVE gameplay camera (rail 88, zoom 1.25, ×3 nearest) — exactly as the playtest renders it", [up(i, 3) for i in live]),
            ("PixelLab frames as returned (×2) — column 1 is the input plate that was sent (SET keeper + controlled ball)", [up(i, 2) for i in raw])]
    W = max(sum(i.width for i in r[1]) for r in rows) + PAD * 4; H = 96 + sum(max(i.height for i in r[1]) + 44 for r in rows) + (700 if m == "diag" else 0)
    sheet = Image.new("RGB", (W, H), BG); dr = ImageDraw.Draw(sheet)
    dr.text((PAD, 8), "GK ANIMATION — TWO-POSE PERSPECTIVE PROOF" + ("  (DIAGNOSTIC: red ring = simulation root, magenta dashed = save vector root→contact target, white ring = contact target, green rings = authored gloves)" if m == "diag" else "  (clean — no overlays)"), fill=(255, 255, 255), font=fonth)
    dr.text((PAD, 36), "Same goalkeeper (GK_BASE_V1 SET, facing the shooter), same fixed gameplay camera, same three-quarter body perspective. Each dive is an independent PixelLab pro edit of the SET keeper on the real renderer plate; the ball was never moved by PixelLab (extracted keeper composited by the renderer). No IK, no rotation, no mirroring.", fill=(200, 200, 200), font=font)
    dr.text((PAD, 54), "Controlled target: contact height %.2f m, lateral %.3f m along the goal line (reach norm %.2f of the keeper's envelope) → simulation commit %s / %s. GOAL_LEFT = his RIGHT, far post, away from the camera; GOAL_RIGHT = his LEFT, near post, toward the camera." % (plates["z"], plates["env"]["lat"], plates["norm"], L["sim"]["action"], L["sim"]["tier"]), fill=(200, 200, 200), font=font)
    y = 80
    for title, ims in rows:
        dr.text((PAD, y), title, fill=(255, 210, 74), font=fontb); y += 20; x = PAD
        for c, im in zip(cols, ims):
            dr.text((x, y), c, fill=(255, 255, 255), font=fontb); sheet.paste(im, (x, y + 18)); x += im.width + PAD
        y += max(i.height for i in ims) + 24
    if m == "diag":
        for side, P in [("GOAL_LEFT", L), ("GOAL_RIGHT", R)]:
            s = P["sim"]; i = P["shots"]["diag"]["info"]
            dr.text((PAD, y), "%s: commit target %s  action %s  tier %s  envNorm %s  family %s %s %s  |  RAW authored glove → simulation hand: %s sprite px  |  ball in the PixelLab edit: %s" % (side, s["target"], s["action"], s["tier"], s["envNorm"], s["family"], s["goalSide"], s["heightClass"], i["rawErrSpritePx"], i.get("ball_how")), fill=(200, 230, 255), font=font); y += 18
        try:
            strips = [Image.open(os.path.join(G, f"pro_{sd}_extract_review.png")).convert("RGB") for sd in ["GOAL_LEFT", "GOAL_RIGHT"]]
            k = min(1.0, (W - 3 * PAD) / 2 / strips[0].width); x = PAD
            for st in strips: st2 = st.resize((int(st.width * k), int(st.height * k)), Image.LANCZOS); sheet.paste(st2, (x, y + 4)); x += st2.width + PAD
            y += int(strips[0].height * k) + 8
        except Exception as e: print("no strips", e)
    sheet = sheet.crop((0, 0, W, min(H, y + PAD))); sheet.save(out); print("wrote", out, sheet.size)
build("clean", os.path.join(O, "PERSPECTIVE_PROOF_SHEET.png")); build("diag", os.path.join(O, "PERSPECTIVE_PROOF_SHEET_DIAGNOSTIC.png"))
# individual live-camera composites at a useful large scale (x4 nearest), clean
for side in ["GOAL_LEFT", "GOAL_RIGHT"]:
    f = rep["poses"][side]["shots"]["clean"]["files"]["live"]["file"]; up(load(C, f), 4).save(os.path.join(O, f"LIVE_CAMERA_{side}_RAW_x4.png"))
up(load(C, rep["set"]["live"]["file"]), 4).save(os.path.join(O, "LIVE_CAMERA_SET_REFERENCE_x4.png")); print("individual live composites written")
