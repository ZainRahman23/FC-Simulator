#!/usr/bin/env python3
"""CONTACT-ORIENTATION TEST — presentation only, review only.

The approved NORTH far-dive contact sprite (DIVE_NORTH_MEDHIGH = sources/DIVE_NORTH_RAW.png rotated 50 deg CW about its measured
hip pivot) at its live orientation and at three flatter orientations: +5 / +10 / +15 deg of tilt toward the projected dive
direction (head toward screen-left, trailing feet toward screen-right), i.e. 45 / 40 / 35 deg CW from the same preserved source.

Every variant is derived exactly the way the live art is (gk_build_manifest.derive_rotated_pose, copied here so nothing under
assets/ is executed or touched): one nearest-neighbour rotation of the preserved source about the measured hip pivot, expand, pad 4,
anchors re-measured on the rotated sprite (glove blobs, head), root re-anchored from the lead glove with the LIVE root offset
(12.3, 93.7 canonical px / body scale 0.72) so the lead glove meets the identical contact point in the live camera. One resample from
the source is the same rigid transform as rotating the live sprite by the tilt about the same pivot, without a second resample.

Landmarks (hip pivot, head, feet, both gloves) are tracked through the rotation with a marker layer (the builder's own technique) and
compared with the re-measured blobs. Rotation preserves foreshortening: nothing is scaled, warped or redrawn.

  python3 derive_tilt.py <out_dir> [cw list, default 50,45,40,35 (round 1); round 2 = 50,55,60,65]
    out_dir/variants/DIVE_NORTH_CW{..}.png, _anchors.json, _landmarks.json
    out_dir/variants/manifest_cw{50,45,40,35}.json   review-only save-pose manifests (load with match.html?savePoses=<page-relative url>)
    out_dir/variants/derivation.json                  method proof: the CW50 variant is byte-identical to the live asset
"""
import sys, os, json, math
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", "..", "..", ".."))
ASSETS = os.path.join(ROOT, "assets", "visual_v1")
CTX = os.path.join(ASSETS, "goalkeeper", "contextual")
SRC = os.path.join(CTX, "sources", "DIVE_NORTH_RAW.png")
LIVE_PNG = os.path.join(CTX, "DIVE_NORTH_CW50.png")
LIVE_AN = os.path.join(CTX, "DIVE_NORTH_CW50_anchors.json")
MANIFEST = os.path.join(ASSETS, "goalkeeper", "GK_ANIM_V1.json")
ROOT_FROM_LEAD_BASE = (12.3, 93.7)     # canonical GK_BASE_V1 px, the live calibration
BODY_SCALE = 0.72
LIVE_CW = 50
TILTS = [0, 5, 10, 15]                 # round 1 (rejected by the user: wrong direction): fewer degrees CW from the source
CW_LIST = [LIVE_CW - k for k in TILTS]  # overridden by argv[2] (comma-separated CW degrees), e.g. 50,55,60,65 for round 2


def _pose_landmarks(img):
    """Verbatim copy of gk_build_manifest._pose_landmarks (hip = jersey/shorts seam, glove blobs, head = top skin)."""
    px = img.load(); W, H = img.size; pts = {k: [] for k in ("green", "glove", "skin", "dark")}
    for y in range(H):
        for x in range(W):
            r, g, b, a = px[x, y]
            if a < 128: continue
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


def source_landmarks(im):
    """Landmarks in the preserved source (canvas px): hip pivot, head, feet (boot end), the two gloves (the glove blob split by x)."""
    hip, gloves, head, pts = _pose_landmarks(im)
    dark = pts["dark"]
    feet_pts = [q for q in dark if q[0] > hip[0] + 35]                      # the boots are the far (screen-right) end of the horizontal diver
    feet = (sum(q[0] for q in feet_pts) / len(feet_pts), sum(q[1] for q in feet_pts) / len(feet_pts))
    gl = pts["glove"]; xs = sorted(q[0] for q in gl); split = xs[len(xs) // 2]
    A = [q for q in gl if q[0] < split]; B = [q for q in gl if q[0] >= split]
    cen = lambda P: (sum(q[0] for q in P) / len(P), sum(q[1] for q in P) / len(P))
    # knees: dark (boot/sock) pixels are not knees; use the green/dark seam of the legs = midpoint hip->feet as a torso/leg reference only
    return {"hip": hip, "head": tuple(head), "feet": feet, "glove_far": cen(A), "glove_near": cen(B), "glove_all": cen(gl),
            "counts": {"glove": len(gl), "skin": len(pts["skin"]), "dark": len(dark), "feet_pts": len(feet_pts)}}


COL = {"hip": (255, 0, 0, 255), "head": (255, 0, 255, 255), "feet": (0, 0, 255, 255), "glove_far": (0, 255, 255, 255), "glove_near": (255, 255, 0, 255), "glove_all": (0, 255, 0, 255)}


def derive(im, cw, lm_src):
    hip = lm_src["hip"]
    rot = im.rotate(-cw, resample=Image.NEAREST, expand=True, center=hip)           # negative = clockwise (PIL rotates CCW for +)
    bb = rot.getbbox(); pad = 4
    out = Image.new("RGBA", (bb[2] - bb[0] + 2 * pad, bb[3] - bb[1] + 2 * pad), (0, 0, 0, 0)); out.paste(rot.crop(bb), (pad, pad))
    # marker layer rotated identically → landmarks re-measured in the output canvas
    mk = Image.new("RGBA", im.size, (0, 0, 0, 0)); mp = mk.load()
    for k, v in lm_src.items():
        if k == "counts": continue
        x, y = v
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                X, Y = int(round(x)) + dx, int(round(y)) + dy
                if 0 <= X < im.width and 0 <= Y < im.height: mp[X, Y] = COL[k]
    mkr = mk.rotate(-cw, resample=Image.NEAREST, expand=True, center=hip)
    mko = Image.new("RGBA", out.size, (0, 0, 0, 0)); mko.paste(mkr.crop(bb), (pad, pad)); q = mko.load()
    lm = {}
    for k, c in COL.items():
        pts = [(x, y) for y in range(mko.height) for x in range(mko.width) if q[x, y] == c]
        lm[k] = (round(sum(t[0] for t in pts) / len(pts), 2), round(sum(t[1] for t in pts) / len(pts), 2)) if pts else None
    # anchors re-measured on the rotated sprite, exactly like the builder
    _, gloves, head, _ = _pose_landmarks(out)
    obb = out.getbbox(); bottom_root = [round((obb[0] + obb[2] - 1) / 2.0, 1), obb[3] - 1]
    lead = max(gloves, key=lambda g: (g[0] - bottom_root[0]) ** 2 + (g[1] - bottom_root[1]) ** 2)
    root_from_lead = (ROOT_FROM_LEAD_BASE[0] / BODY_SCALE, ROOT_FROM_LEAD_BASE[1] / BODY_SCALE)
    root = [round(lead[0] + root_from_lead[0], 1), round(lead[1] + root_from_lead[1], 1)]
    vx, vy = lead[0] - root[0], lead[1] - root[1]; n = math.hypot(vx, vy) or 1e-6
    an = {"root": root, "bbox": list(obb), "gloves": gloves, "lead_glove": lead + [0], "head": head,
          "reach_screen_unit": [round(vx / n, 3), round(vy / n, 3)], "canvas": list(out.size),
          "source": "sources/DIVE_NORTH_RAW.png", "rotation_cw_deg": cw, "rotation_pivot_in_source": [round(hip[0], 1), round(hip[1], 1)],
          "root_offset_from_lead_glove_px": [round(v, 1) for v in root_from_lead], "root_offset_base_px": list(ROOT_FROM_LEAD_BASE),
          "pixel_scale": BODY_SCALE,
          "review_only": True, "tilt_from_live_deg": LIVE_CW - cw, "delta_cw_from_live_deg": cw - LIVE_CW,
          "description": "CONTACT-ORIENTATION TEST variant: the preserved Pro sprite sources/DIVE_NORTH_RAW.png rotated %d degrees clockwise about its hip/torso "
                         "pivot (live = 50), nearest-neighbour, expand, no redraw, no limb edit, no scaling, no warp; anchors re-measured; root re-anchored "
                         "from the lead glove with the live offset so the lead glove meets the identical contact point. Not an asset." % cw}
    an["landmarks_canvas_px"] = lm
    an["landmark_check"] = {"lead_glove_vs_tracked_glove_far_px": round(math.hypot(lead[0] - lm["glove_far"][0], lead[1] - lm["glove_far"][1]), 2) if lm.get("glove_far") else None,
                            "head_measured_vs_tracked_px": round(math.hypot(head[0] - lm["head"][0], head[1] - lm["head"][1]), 2) if lm.get("head") else None}
    return out, an


def main():
    out_dir = sys.argv[1]; vd = os.path.join(out_dir, "variants"); os.makedirs(vd, exist_ok=True)
    cw_list = [int(v) for v in sys.argv[2].split(",")] if len(sys.argv) > 2 else CW_LIST
    im = Image.open(SRC).convert("RGBA")
    lm_src = source_landmarks(im)
    print("source landmarks:", {k: (tuple(round(t, 1) for t in v) if k != "counts" else v) for k, v in lm_src.items()})
    live_an = json.load(open(LIVE_AN)); live_png = Image.open(LIVE_PNG).convert("RGBA")
    man = json.load(open(MANIFEST))
    proof = {}
    for cw in cw_list:
        k = LIVE_CW - cw; stem = "DIVE_NORTH_CW%d" % cw
        out, an = derive(im, cw, lm_src)
        out.save(os.path.join(vd, stem + ".png")); json.dump(an, open(os.path.join(vd, stem + "_anchors.json"), "w"), indent=1)
        json.dump({"tilt": k, "cw": cw, **an["landmarks_canvas_px"], "check": an["landmark_check"]}, open(os.path.join(vd, stem + "_landmarks.json"), "w"), indent=1)
        if cw == LIVE_CW:
            same_px = list(out.getdata()) == list(live_png.getdata()) and out.size == live_png.size
            same_an = all(live_an[f] == an[f] for f in ("root", "bbox", "gloves", "lead_glove", "head", "reach_screen_unit", "canvas", "rotation_pivot_in_source"))
            proof = {"cw50_pixel_identical_to_live": same_px, "cw50_anchors_identical_to_live": same_an}
            print("METHOD PROOF: CW50 pixel-identical", same_px, "anchors identical", same_an)
        # review-only manifest: the live default's save poses (paths made relative to this folder) with DIVE_NORTH_MEDHIGH → the variant
        prefix = "../../../assets/visual_v1/"
        samples = {}
        for pid, smp in man["save_poses"]["CONTEXTUAL"]["ANY"]["samples"].items():
            s2 = dict(smp)
            if pid == "DIVE_NORTH_MEDHIGH": s2["path"] = stem + ".png"; s2["anchors"] = stem + "_anchors.json"; s2["note"] = (smp.get("note") or "") + " [CONTACT-ORIENTATION TEST %+d deg CW from live, CW %d, review only]" % (cw - LIVE_CW, cw)
            else: s2["path"] = prefix + smp["path"]; s2["anchors"] = prefix + smp["anchors"]
            samples[pid] = s2
        ctx = []
        for cp in man["contextual_poses"]:
            c2 = dict(cp)                                     # selection metadata (reach_screen_unit, facing, classes) kept verbatim → pick/score unchanged
            if cp["id"] == "DIVE_NORTH_MEDHIGH": c2["path"] = stem + ".png"; c2["anchors"] = stem + "_anchors.json"; c2["rotation_cw_deg"] = cw; c2["review_delta_cw_deg"] = cw - LIVE_CW
            ctx.append(c2)
        m2 = {"version": man.get("version"), "review_only": "CONTACT-ORIENTATION TEST %+d deg CW from live (CW %d) — presentation only; load with match.html?savePoses=<this file, page-relative>" % (cw - LIVE_CW, cw),
              "save_poses": {"CONTEXTUAL": {"ANY": {"samples": samples}}}, "contextual_poses": ctx}
        json.dump(m2, open(os.path.join(vd, "manifest_cw%d.json" % cw), "w"), indent=1)
        print("variant", stem, "canvas", out.size, "lead", an["lead_glove"][:2], "root", an["root"], "hip", an["landmarks_canvas_px"]["hip"], "head", an["landmarks_canvas_px"]["head"], "feet", an["landmarks_canvas_px"]["feet"], "gloves", len(an["gloves"]), "check", an["landmark_check"])
    json.dump({"source": os.path.relpath(SRC, ROOT), "live": os.path.relpath(LIVE_PNG, ROOT), "cw_list": cw_list, "live_cw": LIVE_CW, "root_from_lead_base": ROOT_FROM_LEAD_BASE, "body_scale": BODY_SCALE,
               "source_landmarks": {k: (list(v) if k != "counts" else v) for k, v in lm_src.items()}, **proof}, open(os.path.join(vd, "derivation.json"), "w"), indent=1)


if __name__ == "__main__":
    main()
