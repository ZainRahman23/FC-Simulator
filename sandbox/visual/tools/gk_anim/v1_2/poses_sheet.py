#!/usr/bin/env python3
"""Assemble the V1.2 8-pose review sheet.
   python3 poses_sheet.py <capture_dir> <gen_out> <gen_small> <out_prefix> [notes.json]
   Row per pose: input plate | PixelLab edit | extracted (anchors) | LIVE camera RAW | LIVE camera IK | 1:1 detail RAW | 1:1 detail IK, + sim/placement notes."""
import sys, os, json
from PIL import Image, ImageDraw, ImageFont
CAP, G, GS, OUTP = sys.argv[1:5]; NOTES = json.load(open(sys.argv[5])) if len(sys.argv) > 5 and os.path.exists(sys.argv[5]) else {}
rep = json.load(open(os.path.join(CAP, "poses_sheet.json")))
try: font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 12); fontb = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 13); fonth = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 16)
except Exception: font = fontb = fonth = ImageFont.load_default()
GNAME = {("LOW_COLLAPSE", "GOAL_LEFT"): "LOW_COLLAPSE_GOAL_LEFT_v2", ("AIRBORNE_DIVE", "GOAL_LEFT", "MID"): "AIRBORNE_MID_GOAL_LEFT", ("AIRBORNE_DIVE", "GOAL_LEFT", "HIGH"): "AIRBORNE_HIGH_GOAL_LEFT", ("AIRBORNE_DIVE", "GOAL_LEFT", "TOP"): "AIRBORNE_TOP_GOAL_LEFT",
         ("LOW_COLLAPSE", "GOAL_RIGHT"): "LOW_COLLAPSE_GOAL_RIGHT", ("AIRBORNE_DIVE", "GOAL_RIGHT", "MID"): "AIRBORNE_MID_GOAL_RIGHT", ("AIRBORNE_DIVE", "GOAL_RIGHT", "HIGH"): "AIRBORNE_HIGH_GOAL_RIGHT", ("AIRBORNE_DIVE", "GOAL_RIGHT", "TOP"): "AIRBORNE_TOP_GOAL_RIGHT"}
def gname(r): return GNAME[(r["fam"], r["side"])] if r["fam"] == "LOW_COLLAPSE" else GNAME[(r["fam"], r["side"], r["key"])]
RH = 300; NOTE_H = 74; PAD = 6; BG = (22, 24, 28, 255)
COLS = [("input plate (1:1 camera)", 176), ("PixelLab edit (pro)", 176), ("extracted pose + anchors", 176), ("LIVE gameplay camera — RAW (×2)", 340), ("LIVE gameplay camera — bounded IK (×2)", 340), ("1:1 detail — RAW", 284), ("1:1 detail — bounded IK", 284)]
W = sum(c[1] for c in COLS) + PAD * (len(COLS) + 1)
def fit(im, w, h):
    im = im.convert("RGBA"); sc = min(w / im.width, h / im.height); nw, nh = max(1, int(im.width * sc)), max(1, int(im.height * sc))
    return im.resize((nw, nh), Image.NEAREST if sc >= 1 else Image.LANCZOS)
def build(rows, title, out):
    H = 70 + len(rows) * (RH + NOTE_H + PAD)
    sheet = Image.new("RGBA", (W, H), BG); dr = ImageDraw.Draw(sheet)
    dr.text((PAD, 6), title, fill=(255, 255, 255), font=fonth)
    dr.text((PAD, 28), "GOAL_LEFT = −goal line (north, far post, UP the screen)   GOAL_RIGHT = +goal line (south, near post, DOWN the screen).  Magenta dashed = save vector root→contact target; white ring = contact target; ball drawn at the contact target; red ring = simulation root (detail view). RAW = authored placement at the SET root; IK = hand-led bounded placement (cap 12 sprite px, CAPPED = art geometry does not fit).", fill=(200, 200, 200), font=font)
    x = PAD
    for name, w in COLS: dr.text((x, 50), name, fill=(255, 210, 74), font=fontb); x += w + PAD
    y = 70
    for r in rows:
        gn = gname(r); x = PAD
        strip = Image.open(os.path.join(G, f"pro_{gn}_extract_review.png")).convert("RGBA"); sw = strip.width // 3; sh = strip.height
        panels = [strip.crop((0, 16, sw, sh)), strip.crop((sw + 0, 16, 2 * sw, sh)), strip.crop((2 * sw, 16, 3 * sw, sh))]
        for pnl, (name, w) in zip(panels, COLS[:3]):
            im = fit(pnl, w, RH); sheet.alpha_composite(im, (x, y + (RH - im.height) // 2)); x += w + PAD
        for ik, cam, (name, w) in [("raw", "live", COLS[3]), ("ik", "live", COLS[4]), ("raw", "detail", COLS[5]), ("ik", "detail", COLS[6])]:
            f = r["shots"][ik]["files"].get(cam)
            if f:
                im = Image.open(os.path.join(CAP, f["file"])).convert("RGBA")
                if cam == "live": im = im.resize((im.width * 2, im.height * 2), Image.NEAREST)
                im = fit(im, w, RH); sheet.alpha_composite(im, (x, y + (RH - im.height) // 2))
            x += w + PAD
        st = r["st"]; raw = r["shots"]["raw"]["info"]; ik = r["shots"]["ik"]["info"]
        an = json.load(open(os.path.join(G, f"pro_{gn}_extract_anchors.json")))
        l1 = f'{r["fam"]} {r["side"]} {r["key"]}   lateral {r["lat"]:.2f} m  z {r["z"]:.2f} m   |  simulation: {st.get("action")} / {st.get("tier")}  envNorm {st.get("envNorm")}  commit target {st.get("target")}  keeper {st.get("keeper")} facing {st.get("facingDeg")}°'
        l2 = f'RAW glove→sim hand {raw.get("rawErrPx")} px   |   IK correction {ik.get("corrPx")} px → residual {ik.get("finalErrPx")} px{"  CAPPED (WRONG_CLIP)" if ik.get("capped") else ""}   |   ball in edit: {an.get("ball_how")}   |   glove size vs SET sprite ×{an.get("scale_est_from_gloves")}   |   sprite {an["pixels"]} px, bbox {an["bbox"]}'
        note = NOTES.get(f'{r["fam"]}_{r["side"]}_{r["key"]}', "")
        dr.text((PAD, y + RH + 2), l1, fill=(255, 255, 255), font=fontb); dr.text((PAD, y + RH + 18), l2, fill=(200, 230, 255), font=font)
        if note:
            import textwrap
            for k, ln_ in enumerate(textwrap.wrap("ASSESSMENT: " + note, 250)[:3]): dr.text((PAD, y + RH + 34 + 13 * k), ln_, fill=(255, 190, 120), font=fontb)
        y += RH + NOTE_H + PAD
    sheet.save(out); print("wrote", out, sheet.size)
rows = rep["poses"]
build(rows, "GK ANIMATION V1.2 — 8 CONTACT-POSE CANDIDATES on the gameplay camera (2 save directions × LOW / MID / HIGH / TOP)", OUTP + ".png")
build([r for r in rows if r["side"] == "GOAL_LEFT"], "GK ANIMATION V1.2 — SAVE_GOAL_LEFT candidates (UP the screen, far post)", OUTP + "_LEFT.png")
build([r for r in rows if r["side"] == "GOAL_RIGHT"], "GK ANIMATION V1.2 — SAVE_GOAL_RIGHT candidates (DOWN the screen, near post)", OUTP + "_RIGHT.png")
