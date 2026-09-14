#!/usr/bin/env python3
"""Derive the review CANDIDATE of the vertical high-save contact pose from the extracted native sprite, exactly the way the builder derives
an unrotated contextual pose (gk_build_manifest.derive_rotated_pose with 0 degrees): crop to content + 4 px pad, measure the glove blobs
and head, choose the lead glove (the raised one, farthest from the bottom root), root = lead glove + the canonical root offset / body
scale, reach = lead − root. Nothing is redrawn. Writes <out>/<stem>.png, <stem>_anchors.json and a review-only save-pose manifest that
swaps the live overhead sample for the candidate with the SAME selection metadata (role, priority, heights, reach unit), so picks and
scores are unchanged and only the art differs.
  python3 derive_vertical_candidate.py <native.png> <out_dir> <stem> <body_scale> <root_dx_canon> <root_dy_canon> [--live-reach]
"""
import sys, os, json, math, argparse
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.abspath(os.path.join(HERE, "..", "..", "..", "..", ".."))
ASSETS = os.path.join(REPO, "assets", "visual_v1")
ap = argparse.ArgumentParser(); ap.add_argument("src"); ap.add_argument("out"); ap.add_argument("stem"); ap.add_argument("scale", type=float); ap.add_argument("rdx", type=float); ap.add_argument("rdy", type=float)
ap.add_argument("--live-reach", action="store_true", help="keep the live overhead pose's reach unit in the manifest metadata (selection identical)")
ap.add_argument("--root-feet", action="store_true", help="root = under the feet (feet centroid x, lowest content row) instead of lead glove + offset; the hand-led placement then lifts the sprite by the jump height")
a = ap.parse_args(); os.makedirs(a.out, exist_ok=True)


def pose_landmarks(img):
    """verbatim builder landmark rule: glove blobs (r>230 g>230 b>200, 5x5 connectivity), head = top skin rows, hip = shorts/jersey seam"""
    px = img.load(); W, H = img.size; pts = {k: [] for k in ("green", "glove", "skin", "dark")}
    for y in range(H):
        for x in range(W):
            r, g, b, al = px[x, y]
            if al < 128: continue
            if g > 110 and g > r + 40 and g > b + 40: pts["green"].append((x, y))
            elif r > 230 and g > 230 and b > 200: pts["glove"].append((x, y))
            elif r > 140 and g > 80 and b > 50 and r > g + 40: pts["skin"].append((x, y))
            elif max(r, g, b) < 60: pts["dark"].append((x, y))
    dark, green = set(pts["dark"]), set(pts["green"])
    interior = [q for q in pts["dark"] if sum((q[0] + dx, q[1] + dy) in dark for dx in (-2, -1, 0, 1, 2) for dy in (-2, -1, 0, 1, 2)) >= 14]
    seam = [q for q in interior if any((q[0] + dx, q[1] + dy) in green for dx in (-2, -1, 0, 1, 2) for dy in (-2, -1, 0, 1, 2))]
    hip = (sum(q[0] for q in seam) / len(seam), sum(q[1] for q in seam) / len(seam)) if seam else None
    gl = set(pts["glove"]); seen = set(); blobs = []
    for q in gl:
        if q in seen: continue
        stack = [q]; seen.add(q); comp = []
        while stack:
            x, y = stack.pop(); comp.append((x, y))
            for dx in (-2, -1, 0, 1, 2):
                for dy in (-2, -1, 0, 1, 2):
                    n = (x + dx, y + dy)
                    if n in gl and n not in seen: seen.add(n); stack.append(n)
        blobs.append(comp)
    blobs.sort(key=len, reverse=True)
    gloves = [[round(sum(q[0] for q in c) / len(c), 1), round(sum(q[1] for q in c) / len(c), 1), len(c)] for c in blobs[:3] if len(c) >= 6]
    skin = pts["skin"]; top = min(q[1] for q in skin); head = [q for q in skin if q[1] < top + 22]
    return hip, gloves, [round(sum(q[0] for q in head) / len(head), 1), round(sum(q[1] for q in head) / len(head), 1)], pts


im = Image.open(a.src).convert("RGBA"); bb = im.getbbox(); pad = 4
out = Image.new("RGBA", (bb[2] - bb[0] + 2 * pad, bb[3] - bb[1] + 2 * pad), (0, 0, 0, 0)); out.paste(im.crop(bb), (pad, pad))
hip, gloves, head, pts = pose_landmarks(out)
obb = out.getbbox(); bottom_root = [round((obb[0] + obb[2] - 1) / 2.0, 1), obb[3] - 1]
lead = max(gloves, key=lambda g: (g[0] - bottom_root[0]) ** 2 + (g[1] - bottom_root[1]) ** 2)
other = [g for g in gloves if g is not lead]
root_from_lead = (a.rdx / a.scale, a.rdy / a.scale)
root = [round(lead[0] + root_from_lead[0], 1), round(lead[1] + root_from_lead[1], 1)]
dark0 = pts["dark"]; low0 = max(q[1] for q in dark0); feet0 = [q for q in dark0 if q[1] >= low0 - 6]
if a.root_feet:
    root = [round(sum(q[0] for q in feet0) / len(feet0), 1), obb[3] - 1]; root_from_lead = (root[0] - lead[0], root[1] - lead[1])
vx, vy = lead[0] - root[0], lead[1] - root[1]; n = math.hypot(vx, vy) or 1e-6
# body reference: pelvis = shorts seam (builder hip), shoulder = top of the jersey below the head, feet = lowest dark pixels
green = pts["green"]; gy = min(q[1] for q in green if q[1] > head[1]) if any(q[1] > head[1] for q in green) else head[1] + 10
shoulder = [round(sum(q[0] for q in green if q[1] < gy + 6) / max(1, len([q for q in green if q[1] < gy + 6])), 1), round(gy + 3, 1)]
dark = pts["dark"]; low = max(q[1] for q in dark); feet = [q for q in dark if q[1] >= low - 6]
feet_c = [round(sum(q[0] for q in feet) / len(feet), 1), round(sum(q[1] for q in feet) / len(feet), 1)]
an = {"root": root, "bbox": list(obb), "gloves": gloves, "lead_glove": lead + [0], "other_glove": (other[0] if other else None), "head": head, "pelvis": [round(hip[0], 1), round(hip[1], 1)] if hip else None,
      "shoulder": shoulder, "feet": feet_c, "reach_screen_unit": [round(vx / n, 3), round(vy / n, 3)], "canvas": list(out.size), "source": os.path.basename(a.src), "rotation_cw_deg": 0,
      "root_offset_from_lead_glove_px": [round(v, 1) for v in root_from_lead], "root_offset_base_px": ([round(v * a.scale, 1) for v in root_from_lead] if a.root_feet else [a.rdx, a.rdy]), "root_mode": ("feet" if a.root_feet else "lead"), "pixel_scale": a.scale, "candidate": True,
      "description": "REVIEW CANDIDATE vertical high-save contact pose: the user's approved sprite, native grid extracted from the generator export (extract_native_grid.py), no rotation, no redraw; root offset from the raised (lead) glove so it meets the simulation's contact point on a representative overhead save; body scale %.2f (see the calibration sheet)" % a.scale}
out.save(os.path.join(a.out, a.stem + ".png")); json.dump(an, open(os.path.join(a.out, a.stem + "_anchors.json"), "w"), indent=1)
# review manifest: the live default with OVERHEAD_REACH_CW11's sample replaced by the candidate (metadata unchanged)
man = json.load(open(os.path.join(ASSETS, "goalkeeper", "GK_ANIM_V1.json"))); prefix = "../../../assets/visual_v1/"
samples = {}
for pid, smp in man["save_poses"]["CONTEXTUAL"]["ANY"]["samples"].items():
    s2 = dict(smp)
    if pid == "OVERHEAD_REACH_CW11": s2["path"] = a.stem + ".png"; s2["anchors"] = a.stem + "_anchors.json"; s2["note"] = "REVIEW CANDIDATE: new vertical high-save sprite in the overhead role"
    else: s2["path"] = prefix + smp["path"]; s2["anchors"] = prefix + smp["anchors"]
    samples[pid] = s2
ctx = []
for cp in man["contextual_poses"]:
    c2 = dict(cp)
    if cp["id"] == "OVERHEAD_REACH_CW11":
        c2["path"] = a.stem + ".png"; c2["anchors"] = a.stem + "_anchors.json"
        if not a.live_reach: c2["reach_screen_unit"] = an["reach_screen_unit"]
    ctx.append(c2)
json.dump({"version": man.get("version"), "review_only": "vertical high-save candidate in the overhead role (art swap only)", "save_poses": {"CONTEXTUAL": {"ANY": {"samples": samples}}}, "contextual_poses": ctx},
          open(os.path.join(a.out, "manifest_" + a.stem + ".json"), "w"), indent=1)
print("candidate", a.stem, "canvas", out.size, "lead glove", lead, "other", other, "head", head, "pelvis", an["pelvis"], "shoulder", shoulder, "feet", feet_c, "root", root, "reach", an["reach_screen_unit"], "scale", a.scale)
