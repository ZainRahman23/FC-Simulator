#!/usr/bin/env python3
"""Build assets/visual_v1/goalkeeper/GK_ANIM_V1.json from the declarative CLIP_TABLE below, (re)measuring every clip's
per-frame anchors with gk_measure_clip.py. Repeatable: add a PixelLab clip folder under
assets/visual_v1/originals/character_f4838361/anim/<clip>/<direction>/<i>.png, add a row here, rerun.

  python3 gk_build_manifest.py            (from anywhere)

Row fields: family (+ optional families the clip also serves), kind = action | loop | recover, variants = (dir, side,
folder, use = frame indices in play order, contact = POSITION in `use` reached at the simulation contact/arrival,
hold = POSITION shown while the ball is held, ground = ref (frame-0 ground row) | bottom (per-frame), anchor = pivot (canvas centre: PixelLab keeps the character root there; default) | feet (planted-foot x),
ik = True (2-D glove-vs-simulation-hand frame selection) | "y" (height only: side-view art whose horizontal axis is not the lateral one) | False,
stride_m for loops, note = honest description of what the art can and cannot represent)."""
import json, os, subprocess, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))
ASSETS = os.path.join(ROOT, "assets", "visual_v1"); ANIM = "originals/character_f4838361/anim"; ANCH = "goalkeeper/anchors/clips"
MEASURE = os.path.join(os.path.dirname(__file__), "gk_measure_clip.py")
def V(dir, folder, use, contact, hold=None, side=None, ground="ref", anchor="pivot", stride_m=None, note="", ik=True):
    return dict(dir=dir, side=side, folder=folder, use=use, contact=contact, hold=hold if hold is not None else len(use) - 1, ground=ground, anchor=anchor, stride_m=stride_m, note=note, ik=ik)
SIDE_VIEW = "east/west side view: the body extends along the screen x axis (the keeper's FORWARD axis); the real lateral displacement is along screen y and is carried by the simulation root — geometric contact sync is NOT achievable with this art (flagged); needs 'toward/away from viewer' frames"
CLIP_TABLE = {
    "chest_catch": dict(family="CHEST_CATCH", families=["CHEST_CATCH", "SUPPORTED_CATCH"], kind="action", note="hands forward at chest height, absorb into the sternum, hug",
        variants=[V("east", "chest_catch/east", [1, 2, 3, 4, 5, 6, 7, 8], contact=3, hold=7, note="ball-free mime (PixelLab group c2e03d1b); gloves forward at frame 4, hug from frame 6"), V("south", "chest_catch/south", [1, 2, 3, 4, 5, 6, 7, 8], contact=4, hold=7, note="ball-free mime; arms wide 3-5, hands meet at 6, hug 7-8")]),
    "low_gather": dict(family="LOW_GATHER", kind="action", note="deep crouch, gloves to the ground, scoop and clutch",
        variants=[V("east", "low_gather/east", [1, 2, 3, 4, 5, 6, 7, 8], contact=3, hold=7, note="ball-free mime (PixelLab group 3f2dbaef); gloves at the ground 4-6, rise 7-8"), V("south", "low_gather/south", [1, 2, 3, 4, 5, 6, 7, 8], contact=4, hold=7, note="ball-free mime; gloves at the ground 5-6, rise 7-8")]),
    "low_collapse": dict(live=False, retired_note="V1 side-view dive art REJECTED in live review 2026-09-04 (body along the forward axis, same pose at every height); kept for comparison only", family="LOW_COLLAPSE", families=["LOW_COLLAPSE", "FULL_STRETCH_LOW"], kind="action", note="collapse onto the near side, arms down to the ball",
        variants=[V("east", "low_collapse_right/east", [1, 2, 3, 4, 5, 6, 7, 8], contact=6, hold=7, side="RIGHT", note=SIDE_VIEW, ik="y")]),
    "medium_dive": dict(live=False, retired_note="V1 side-view dive art REJECTED in live review 2026-09-04 (body along the forward axis, same pose at every height); kept for comparison only", family="MEDIUM_DIVE", families=["MEDIUM_DIVE", "FULL_STRETCH_MID"], kind="action", note="push off, body horizontal at hip height, arms leading",
        variants=[V("east", "medium_dive_right/east", [1, 2, 3, 4, 5, 6, 7, 8], contact=5, hold=7, side="RIGHT", note=SIDE_VIEW, ik="y")]),
    "high_dive": dict(live=False, retired_note="V1 side-view dive art REJECTED in live review 2026-09-04 (body along the forward axis, same pose at every height); kept for comparison only", family="HIGH_DIVE", families=["HIGH_DIVE", "FULL_STRETCH_HIGH"], kind="action", note="full-stretch launch, arm high, lands on forearm/side",
        variants=[V("east", "high_dive_right/east", [1, 2, 3, 4, 5, 6, 7, 8], contact=6, hold=7, side="RIGHT", note=SIDE_VIEW, ik="y")]),
    "foot_save": dict(family="FOOT_SAVE", kind="action", note="upright reflex leg extension; frames 5-6 (high kick) dropped",
        variants=[V("east", "foot_save_right/east", [1, 2, 3, 4, 7, 8], contact=3, hold=3, side="RIGHT", note="side view: the leg extends forward on screen (the simulation leg tip is lateral); flagged", ik="y")]),
    "shuffle": dict(family="SHUFFLE", families=["SHUFFLE", "CROSSOVER"], kind="loop", note="crouched lateral shuffle cycle; odometer-driven (root travel), reversed for the other side where no mirror applies",
        variants=[V("east", "shuffle_right/east", [1, 2, 3, 4, 5, 6, 7, 8], contact=7, side="RIGHT", anchor="pivot", stride_m=0.9), V("south", "shuffle_right/south", [1, 2, 3, 4, 5, 6, 7, 8], contact=7, side="RIGHT", anchor="pivot", stride_m=0.9),
                  V("south-west", "shuffle_right/south-west", [1, 2, 3, 4, 5, 6, 7, 8], contact=7, side="RIGHT", anchor="pivot", ground="bottom", stride_m=0.9, note="PixelLab group ba999c22 (v3, non-Pro) original frames, authored order; the 2026-09-05 readiness-calibration crouch frames (shuffle_right_crouch/, template T1/T2) were REJECTED in live review and are no longer live — kept on disk as evidence; SW/NW stationary = quiet by decision; ground=bottom keeps the feet on the root row"),
                  V("north-west", "shuffle_right/north-west", [1, 2, 3, 4, 5, 6, 7, 8], contact=7, side="RIGHT", anchor="pivot", ground="bottom", stride_m=0.9, note="PixelLab group ba999c22 (v3, non-Pro) original frames, authored order (the 2026-09-05 re-sequencing 1,2,3,6,7,8,7,6 was withdrawn with the SW crouch: SW/NW stationary = quiet by decision); ground=bottom keeps the feet on the root row")]),
    "recover": dict(family="RECOVER", kind="recover", note="PixelLab 'getting-up' template: sit → kneel → stand; ground = per-frame bottom row",
        variants=[V("east", "recover_getting_up/east", [0, 1, 2, 3, 4], contact=4, ground="bottom"), V("south", "recover_getting_up/south", [0, 1, 2, 3], contact=3, ground="bottom", note="frame 4 dropped (template shows the back of the head)")]),
}
man_path = os.path.join(ASSETS, "goalkeeper", "GK_ANIM_V1.json")
man = json.load(open(man_path)) if os.path.exists(man_path) else {"version": 1}
man["version"] = 2
man["notes"] = ["GK Animation V1 asset manifest. states = full 8-direction pose sets (PixelLab character states of GK_BASE_V1); clips = authored frame sequences (variants per direction/side, mirror derived at runtime). Missing directions within 45° use the nearest authored variant (flagged DIR-APPROX); beyond that the runtime shows a labelled temporary representation.",
                "Generated by sandbox/visual/tools/gk_anim/gk_build_manifest.py — edit the CLIP_TABLE there, not this file."]
man.setdefault("states", {"base": {"path": "originals/character_f4838361/idle/{direction}.png", "anchors": "goalkeeper/anchors/base.json"},
                          "set": {"path": "originals/character_f4838361/set/{direction}.png", "anchors": "goalkeeper/anchors/set.json", "optional": True, "pixellab_state_id": "0808086b-027d-4114-a53a-efd11a8178f9"}})
clips = {}
os.makedirs(os.path.join(ASSETS, ANCH), exist_ok=True)
for name, row in CLIP_TABLE.items():
    variants = []
    for v in row["variants"]:
        folder = os.path.join(ASSETS, ANIM, v["folder"])
        if not os.path.isdir(folder): print("MISSING", folder); continue
        anch = "%s/%s.json" % (ANCH, v["folder"].replace("/", "_"))
        subprocess.run([sys.executable, MEASURE, folder, os.path.join(ASSETS, anch)], check=True, stdout=subprocess.DEVNULL)
        variants.append({k: v[k] for k in ("dir", "side", "use", "contact", "hold", "ground", "anchor", "stride_m", "note", "ik") if v[k] is not None and v[k] != ""} | {"frames": "%s/%s/{i}.png" % (ANIM, v["folder"]), "anchors": anch})
    clips[name] = {k: row[k] for k in ("family", "families", "kind", "note", "live", "retired_note") if k in row} | {"variants": variants}
man["clips"] = clips
# CONTEXTUAL SAVE POSES (pose salvage, approved live 2026-09-05): salvaged inventory stills drawn through the camera-space save-pose path and
# chosen by gkAnimContextualPick from the committed geometry (screen reach, facing, attacker tightness, near/far post, height class).
# Files: assets/visual_v1/goalkeeper/contextual/<id>.png + <id>_anchors.json (root, gloves, lead_glove, head, reach_screen_unit measured).
# DERIVED CONTEXTUAL POSES: a pose whose live artwork is a pure presentation transform of a preserved source sprite. The source stays in
# contextual/sources/ untouched and replaceable; the transform (nearest-neighbour rotation about a measured body pivot) and the anchors are
# regenerated here, so swapping the source art re-derives everything. No redraw, no limb edit, no scaling, no warp.
def _pose_landmarks(img):
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
    hip = (sum(q[0] for q in seam) / len(seam), sum(q[1] for q in seam) / len(seam)) if seam else None   # jersey/shorts seam = hip
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
    return hip, gloves, [round(sum(q[0] for q in head) / len(head), 1), round(sum(q[1] for q in head) / len(head), 1)]

def derive_rotated_pose(src_rel, out_stem, cw_deg, root_from_lead_base, note, body_scale=1.0, root_mode="lead"):
    from PIL import Image
    import math
    src_path = os.path.join(ASSETS, "goalkeeper", "contextual", src_rel)
    im = Image.open(src_path).convert("RGBA")
    hip, _, _ = _pose_landmarks(im)
    rot = im.rotate(-cw_deg, resample=Image.NEAREST, expand=True, center=hip)          # negative = clockwise; pixel-preserving
    bb = rot.getbbox(); pad = 4
    out = Image.new("RGBA", (bb[2] - bb[0] + 2 * pad, bb[3] - bb[1] + 2 * pad), (0, 0, 0, 0)); out.paste(rot.crop(bb), (pad, pad))
    _, gloves, head = _pose_landmarks(out)
    obb = out.getbbox(); bottom_root = [round((obb[0] + obb[2] - 1) / 2.0, 1), obb[3] - 1]
    lead = max(gloves, key=lambda g: (g[0] - bottom_root[0]) ** 2 + (g[1] - bottom_root[1]) ** 2)
    # the root calibration is authored in CANONICAL (GK_BASE_V1) sprite px; this art is drawn at body_scale, so its own offset is larger
    root_from_lead = (root_from_lead_base[0] / body_scale, root_from_lead_base[1] / body_scale)
    root = [round(lead[0] + root_from_lead[0], 1), round(lead[1] + root_from_lead[1], 1)]
    if root_mode == "bottom":                      # the authored convention (content centre / bottom row), as tested for this pose
        root = bottom_root; root_from_lead = (round(root[0] - lead[0], 1), round(root[1] - lead[1], 1))
    vx, vy = lead[0] - root[0], lead[1] - root[1]; n = math.hypot(vx, vy) or 1e-6
    an = {"root": root, "bbox": list(obb), "gloves": gloves, "lead_glove": lead + [0], "head": head,
          "reach_screen_unit": [round(vx / n, 3), round(vy / n, 3)], "canvas": list(out.size),
          "source": "sources/" + src_rel.split("/")[-1], "rotation_cw_deg": cw_deg, "rotation_pivot_in_source": [round(hip[0], 1), round(hip[1], 1)],
          "root_offset_from_lead_glove_px": [round(v, 1) for v in root_from_lead], "root_offset_base_px": list(root_from_lead_base),
          "pixel_scale": body_scale, "description": note}
    d = os.path.join(ASSETS, "goalkeeper", "contextual")
    out.save(os.path.join(d, out_stem + ".png")); json.dump(an, open(os.path.join(d, out_stem + "_anchors.json"), "w"), indent=1)
    print("derived", out_stem, out.size, "pivot", [round(v, 1) for v in hip], "root", root, "reach", an["reach_screen_unit"], "body scale", body_scale)

# BODY SCALE 0.72: measured from the goalkeeper's proportions, not the canvas. GK_BASE_V1 standing (set/west.png) is 102 px from head
# top to feet = 1.83 m -> 55.7 px/m. The Pro dive art measures 141.5 px head-top-to-toe along the body axis (~78.6 px/m -> 0.721) and
# 91.3 px head-top-to-hip against the standing sprite's 66.8 px (0.732); the two agree at ~0.72, so the same person is the same size in
# both poses. (Its head is drawn smaller relative to the body than the stylised standing sprite's — that is the art styles differing,
# and matching heads instead would leave the diving body a third too long.)
derive_rotated_pose("sources/DIVE_NORTH_RAW.png", "DIVE_NORTH_CW50", 50, (12.3, 93.7),
    "canonical medium/high airborne dive to the keeper's right (north / GOAL_LEFT). Live artwork = the preserved Pro sprite "
    "sources/DIVE_NORTH_RAW.png rotated 50 degrees clockwise about its hip/torso pivot, nearest-neighbour, expand, no redraw, no limb "
    "edit, no scaling, no warp (approved 2026-09-05 over 35/45/55). root is NOT the bottom-pixel convention, which assumes a grounded "
    "pose: it is offset from the lead glove so the drawn glove meets the simulation's contact point on a representative medium/high "
    "north dive (lateral 1.99 m, contact z 1.52 m) in the live camera; the runtime's bounded hand-led placement absorbs the rest.",
    body_scale=0.72)
# TOP-LEFT CORNER (2026-09-05): the Pro sprite authored as a south attempt, salvaged as the far/full-stretch top-corner save. Body scale
# 0.72 measured against GK_BASE_V1 the same way as the north dive (crown-to-toe body axis 138.6 px vs the standing sprite's 99.6 px = 0.719).
# Root offset (canonical GK_BASE_V1 px) calibrated on a real full-stretch top-corner save: keeper root (102.37, 33.16), contact (102.21,
# 32.13, 1.97), envelope demand 0.967.
derive_rotated_pose("sources/TOP_LEFT_CORNER_RAW.png", "TOP_LEFT_CORNER_CW50", 50, (10.4, 114.1),
    "far / full-stretch TOP-LEFT-CORNER airborne save (north top corner, the keeper's right in world terms). Live artwork = the preserved "
    "Pro sprite sources/TOP_LEFT_CORNER_RAW.png rotated 50 degrees clockwise about its hip/torso pivot, nearest-neighbour, no redraw, no limb "
    "edit, no scaling of the body, no warp (approved 2026-09-05 over RAW/35/45/55). The camera's top-corner target vector is (-0.13, -0.99), "
    "97.7 degrees above the horizontal, which is why clockwise is the correct sense. root is offset from the lead glove so the drawn glove "
    "meets the simulation's contact point on a representative full-stretch top-corner save.", body_scale=0.72)
# SOUTH-WEST FAR DIVE (2026-09-05): the Pro sprite authored with a camera-derived pose guide, salvaged for SOUTH-WEST-facing far airborne
# dives. No rotation (0 degrees): the raw pixels pass through, only cropped to content and measured. Body scale 0.74 measured against
# GK_BASE_V1 by head geometry corrected with the north dive's known over-read (the raw body-axis measure over-reads for a foreshortened
# pose: 0.761 raw, 0.740 head-minor corrected, 0.729 head-area corrected). Root = the authored bottom-centre convention, which is exactly
# the placement the live mapping test was approved on.
derive_rotated_pose("sources/SW_FAR_DIVE_RAW.png", "SW_FAR_DIVE", 0, (0, 0),
    "far / high-extension airborne dive for a SOUTH-WEST facing keeper. Live artwork = the preserved Pro sprite "
    "sources/SW_FAR_DIVE_RAW.png with no rotation, no limb edit, no warp; ORIGINAL serves a save to the keeper's physical LEFT and the "
    "runtime-MIRRORED copy his physical RIGHT, as demonstrated on two matched real SW-facing far saves (reach vs the real save vector "
    "11.9 deg / 31.8 deg for the winning orientation in each).", body_scale=0.74, root_mode="bottom")
# FAR / EXTREME LOW DIVE LEFT (2026-09-06): the Pro sprite that failed the south-perspective test, salvaged for far and best-effort LOW
# airborne dives to the keeper's physical LEFT. No rotation: the raw pixels pass through, cropped and measured. Body scale 0.60 (revised
# from 0.70 and then 0.65 in live review; this sprite draws an oversized head and gloves, so its body-axis measure of 0.79 reads too large). The root is
# authored as the CANONICAL (GK_BASE_V1 px) offset from the lead glove that the 0.70 configuration had, so a change of body scale divides it
# by the new scale and the drawn glove - the intended contact placement - stays exactly where it was.
derive_rotated_pose("sources/LOW_DIVE_LEFT_RAW.png", "LOW_DIVE_LEFT", 0, (37.8, 23.8),
    "far / extreme LOW airborne dive to the keeper's physical LEFT. Live artwork = the preserved Pro sprite "
    "sources/LOW_DIVE_LEFT_RAW.png drawn MIRRORED, with no rotation, no limb edit, no warp; the mirrored orientation was the one that "
    "pointed the body at the ball in the live low-left test (35.8 deg from the real save vector on the far case, 18.3 deg on the "
    "best-effort case, against 75.7 and 98.6 for the original).", body_scale=0.60)

def derive_mirrored_rotated_pose(src_rel, out_stem, cw_deg, root_from_lead_base, body_scale, glove_boxes, head_src, note):
    """SOUTH V6 route: mirror the preserved source horizontally, rotate the whole sprite clockwise about the jersey/shorts-seam hip pivot
    (nearest-neighbour, expand), crop to content (pad 4). Landmarks are measured on the MIRRORED source and carried through the identical
    transform via a marker image, so the anchors are exactly those of the approved rotation test. The two gloves are split by authored
    boxes (the builder's white-blob merge would fuse them); the lead glove is the lower, farther one along the reach. Root = lead glove +
    the canonical GK_BASE_V1-px offset divided by the body scale, like the north dive."""
    from PIL import Image
    import math
    src_path = os.path.join(ASSETS, "goalkeeper", "contextual", src_rel)
    im = Image.open(src_path).convert("RGBA").transpose(Image.FLIP_LEFT_RIGHT); px = im.load(); W, H = im.size
    hip, _, _ = _pose_landmarks(im)
    white = [(x, y) for y in range(H) for x in range(W) if px[x, y][3] >= 128 and px[x, y][0] > 185 and px[x, y][1] > 185 and px[x, y][2] > 170]
    (ax0, ay0, ax1, ay1), (bx0, by0, bx1, by1) = glove_boxes
    A = [q for q in white if ax0 <= q[0] < ax1 and ay0 <= q[1] < ay1]; B = [q for q in white if bx0 <= q[0] < bx1 and by0 <= q[1] < by1]
    cen = lambda pts: (sum(q[0] for q in pts) / len(pts), sum(q[1] for q in pts) / len(pts))
    LM = {"hip": hip, "gloveA": cen(A), "gloveB": cen(B), "head": head_src}
    COL = {"hip": (255, 0, 0, 255), "gloveA": (0, 0, 255, 255), "gloveB": (0, 255, 255, 255), "head": (255, 0, 255, 255)}
    rot = im.rotate(-cw_deg, resample=Image.NEAREST, expand=True, center=hip)
    mk = Image.new("RGBA", (W, H), (0, 0, 0, 0)); mp = mk.load()
    for k, (x, y) in LM.items():
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1): mp[int(round(x)) + dx, int(round(y)) + dy] = COL[k]
    mkr = mk.rotate(-cw_deg, resample=Image.NEAREST, expand=True, center=hip)
    bb = rot.getbbox(); pad = 4
    out = Image.new("RGBA", (bb[2] - bb[0] + 2 * pad, bb[3] - bb[1] + 2 * pad), (0, 0, 0, 0)); out.paste(rot.crop(bb), (pad, pad))
    mko = Image.new("RGBA", out.size, (0, 0, 0, 0)); mko.paste(mkr.crop(bb), (pad, pad)); q = mko.load()
    lm = {}
    for k, c in COL.items():
        pts = [(x, y) for y in range(mko.height) for x in range(mko.width) if q[x, y] == c]
        lm[k] = (round(sum(t[0] for t in pts) / len(pts), 1), round(sum(t[1] for t in pts) / len(pts), 1))
    lead = list(lm["gloveB"]); other = list(lm["gloveA"])
    root_from_lead = (root_from_lead_base[0] / body_scale, root_from_lead_base[1] / body_scale)
    root = [round(lead[0] + root_from_lead[0], 1), round(lead[1] + root_from_lead[1], 1)]
    vx, vy = lead[0] - root[0], lead[1] - root[1]; n = math.hypot(vx, vy) or 1e-6
    an = {"root": root, "bbox": list(out.getbbox()), "gloves": [lead + [len(B)], other + [len(A)]], "lead_glove": lead + [len(B), 0], "head": list(lm["head"]),
          "reach_screen_unit": [round(vx / n, 3), round(vy / n, 3)], "canvas": list(out.size),
          "source": "sources/" + src_rel.split("/")[-1], "mirrored": True, "rotation_cw_deg": cw_deg, "rotation_pivot_in_source": [round(hip[0], 1), round(hip[1], 1)],
          "pivot_in_canvas": list(lm["hip"]), "root_offset_from_lead_glove_px": [round(root[0] - lead[0], 1), round(root[1] - lead[1], 1)],
          "root_offset_base_px": list(root_from_lead_base), "pixel_scale": body_scale, "glove_split_boxes_in_mirrored_source": [list(glove_boxes[0]), list(glove_boxes[1])],
          "description": note}
    d = os.path.join(ASSETS, "goalkeeper", "contextual")
    out.save(os.path.join(d, out_stem + ".png")); json.dump(an, open(os.path.join(d, out_stem + "_anchors.json"), "w"), indent=1)
    print("derived", out_stem, out.size, "pivot", [round(v, 1) for v in hip], "root", root, "lead", lead, "reach", an["reach_screen_unit"], "body scale", body_scale)

# DIVE SOUTH (2026-09-06): the GOAL_RIGHT far-dive counterpart of the north dive. Source chain, all preserved: sources/SOUTH_V6_RAW.png (the
# Pro generation whose near-overhead camera and side roll the user locked as the SOUTH geometry) -> sources/SOUTH_V6_CLEAN.png (the manual
# 76-pixel readability cleanup, RGB only, alpha byte-identical: tools/gk_anim/salvage/v6_manual_cleanup.py) -> live art = that cleaned
# sprite MIRRORED horizontally and rotated clockwise about its hip pivot. 15 degrees at body scale 0.80 was approved 2026-09-06 over
# 0/5/10/15; the user's FINAL visual adjustment the same day is 20 degrees at body scale 0.85 = DIVE_SOUTH_CW20, the live file, derived
# below from the same source with the same anchoring (DIVE_SOUTH_CW15.* stays on disk as the approved-rotation record, unreferenced). Body scale
# by head geometry against GK_BASE_V1 corrected with the body-calibrated Pro dives (DIVE_NORTH 0.72, SW_FAR_DIVE 0.74); the body-length
# measures do not apply to this foreshortened pose. Root offset (canonical px) = the simulation's own root minus contact hand on the
# representative GOAL_RIGHT HIGH dive (lateral +2.0 m, contact z 1.45 m): screen (-2.5, +22.9) px / sprite scale 0.4197.
derive_mirrored_rotated_pose("sources/SOUTH_V6_CLEAN.png", "DIVE_SOUTH_CW20", 20, (-6.0, 54.5), 0.85, ((98, 0, 176, 113), (104, 113, 176, 176)), (104.6, 88.0),
    "canonical medium/high airborne dive to the keeper's left (south / GOAL_RIGHT). Live artwork = the preserved cleaned Pro sprite "
    "sources/SOUTH_V6_CLEAN.png mirrored horizontally and rotated 20 degrees clockwise about its hip/torso pivot as one rigid image, "
    "nearest-neighbour, expand, no redraw, no limb edit, no scaling of the art, no warp (15 deg at body scale 0.80 approved 2026-09-06 over "
    "0/5/10; final visual adjustment the same day: 20 deg at body scale 0.85, re-derived from the same source with the same anchoring). "
    "root is offset from the lead (lower) glove so the drawn glove meets the simulation's contact point on the representative GOAL_RIGHT "
    "HIGH dive (lateral +2.0 m, contact z 1.45 m) in the live camera; the runtime's bounded hand-led placement absorbs the rest.")
CONTEXTUAL_POSES = [
    dict(id="TIGHT_S_NEAR_TOP", inventory_id="GK_POSE_129", role="tight_high", priority=2, facing_deg=90, post="near", height_classes=["HIGH", "TOP"], note="SOUTH-facing keeper, tight attacker angle, high save to the near/top corner (V1.1 high_dive/south still)"),
    dict(id="TIGHT_S_FAR_TOP", inventory_id="GK_POSE_136", role="tight_high", priority=2, facing_deg=90, post="far", height_classes=["HIGH", "TOP"], note="SOUTH-facing keeper, tight attacker angle, high save to the far/top corner (V1.1 high_dive/south-west still)"),
    dict(id="TIGHT_N_NEAR_TOP", inventory_id="GK_POSE_132", role="tight_high", priority=2, facing_deg=-90, post="near", height_classes=["HIGH", "TOP"], note="NORTH-facing keeper, tight attacker angle, high save to the near/top corner (V1.1 high_dive/north-east still)"),
    dict(id="TIGHT_N_FAR_TOP", inventory_id="GK_POSE_133", role="tight_high", priority=2, facing_deg=-90, post="far", height_classes=["HIGH", "TOP"], note="NORTH-facing keeper, tight attacker angle, high save to the far/top corner (V1.1 high_dive/north still). Caveat on record: its glove reaches up-left on screen while a ball parked at the actual far top corner projects level-right; approved as-is, future art-replacement candidate"),
    dict(id="OVERHEAD_REACH_CW11", inventory_id="GK_POSE_148", role="overhead", priority=2, height_classes=["HIGH", "TOP"], note="ball above / over the keeper: upward reach with small lateral demand (V1.2 TOP GOAL_LEFT candidate rotated 11 degrees clockwise about its root, pure transform)"),
    # LOW / GROUND side saves (pose salvage 2, 2026-09-05): three V1.1 low_collapse stills chosen for their camera perspective, assigned by the keeper's
    # facing at commit (SW / W / NW) and the classifier's goal side; the second variant of each pair is the same file drawn MIRRORED (runtime transform; SW mirrors for GOAL_RIGHT, W and NW mirror for GOAL_LEFT after the 2026-09-05 live review,
    # validated per side in the gameplay camera). Families LOW_COLLAPSE and low AIRBORNE_DIVE only — gathers, foot saves and standing saves keep their art.
    dict(id="SW_LOW_LEFT", file="LOW_SIDE_SW", pixel_scale=0.86, inventory_id="GK_POSE_114", role="low_side", facing_deg=135, side="GOAL_LEFT", mirror=False, height_classes=["LOW", "LOW-MID"], note="SOUTH-WEST facing keeper, ground-level save to GOAL_LEFT (V1.1 low_collapse/south-east still, original orientation)"),
    dict(id="SW_LOW_RIGHT", file="LOW_SIDE_SW", pixel_scale=0.86, inventory_id="GK_POSE_114", role="low_side", facing_deg=135, side="GOAL_RIGHT", mirror=True, height_classes=["LOW", "LOW-MID"], note="SOUTH-WEST facing keeper, ground-level save to GOAL_RIGHT (same still, mirrored)"),
    dict(id="W_LOW_LEFT", file="LOW_SIDE_W", pixel_scale=0.87, inventory_id="GK_POSE_115", role="low_side", facing_deg=180, side="GOAL_LEFT", mirror=True, height_classes=["LOW", "LOW-MID"], note="WEST facing keeper, ground-level save to GOAL_LEFT (V1.1 low_collapse/east still, MIRRORED — orientations swapped per live review 2026-09-05)"),
    dict(id="W_LOW_RIGHT", file="LOW_SIDE_W", pixel_scale=0.87, inventory_id="GK_POSE_115", role="low_side", facing_deg=180, side="GOAL_RIGHT", mirror=True, reach_mirror=False, height_classes=["LOW", "LOW-MID"], note="WEST facing keeper, ground-level save to GOAL_RIGHT (same still, MIRRORED — live review 2026-09-05 kept BOTH west variants mirrored; reach_mirror=False keeps this row's selection reach vector at its approved value so no score moves)"),
    dict(id="NW_LOW_LEFT", file="LOW_SIDE_NW", pixel_scale=0.86, inventory_id="GK_POSE_116", role="low_side", facing_deg=-135, side="GOAL_LEFT", mirror=False, height_classes=["LOW", "LOW-MID"], note="NORTH-WEST facing keeper, ground-level save to GOAL_LEFT (V1.1 low_collapse/north-east still, ORIGINAL orientation — first-build mapping restored per live review 2026-09-05)"),
    dict(id="NW_LOW_RIGHT", file="LOW_SIDE_NW", pixel_scale=0.86, inventory_id="GK_POSE_116", role="low_side", facing_deg=-135, side="GOAL_RIGHT", mirror=True, height_classes=["LOW", "LOW-MID"], note="NORTH-WEST facing keeper, ground-level save to GOAL_RIGHT (same still, MIRRORED — first-build mapping restored per live review 2026-09-05)"),
    # DIVE NORTH (2026-09-05): the one authored contact pose for a medium/high airborne dive to the keeper's right. Artwork is derived
    # above from the preserved raw sprite; the rotation is recorded here and in the anchors so the source can be replaced later.
    dict(id="DIVE_NORTH_MEDHIGH", file="DIVE_NORTH_CW50", inventory_id="PRO_DIVE_NORTH_V1", role="dive_north", facing_deg=180, side="GOAL_LEFT",
         mirror=False, height_classes=["LOW-MID", "MID", "HIGH", "TOP"], source_file="sources/DIVE_NORTH_RAW.png", rotation_cw_deg=50,
         note="default contact pose for FAR / high-extension AIRBORNE_DIVE saves to GOAL_LEFT (the keeper's right), at every height class: raw Pro sprite rotated 50 deg CW as a presentation transform. Selected by the simulation's own envelope demand (norm), so an unreachable best-effort dive shows the full attempt. Ground-save actions stay LOW_COLLAPSE and keep the ground stills; the tight-angle and overhead stills keep their own cases by priority; the GOAL_RIGHT counterpart is DIVE_SOUTH_MEDHIGH (2026-09-06)"),
    # DIVE SOUTH (2026-09-06): the GOAL_RIGHT counterpart of DIVE_NORTH_MEDHIGH — same role structure and weighting (facing, goal side, the
    # simulation's own envelope demand, the off-ground fade), opposite goal side. Artwork derived above from the preserved cleaned source.
    dict(id="DIVE_SOUTH_MEDHIGH", file="DIVE_SOUTH_CW20", inventory_id="PRO_DIVE_SOUTH_V6", role="dive_south", facing_deg=180, side="GOAL_RIGHT",
         mirror=False, height_classes=["LOW-MID", "MID", "HIGH", "TOP"], source_file="sources/SOUTH_V6_CLEAN.png", rotation_cw_deg=20, mirrored=True,
         note="default contact pose for FAR / high-extension AIRBORNE_DIVE saves to GOAL_RIGHT (the keeper's left), at every height class: the cleaned SOUTH V6 Pro sprite mirrored and rotated 20 deg CW as a presentation transform, body scale 0.85 (final visual adjustment 2026-09-06 from the approved 15 deg / 0.80). Selected exactly like the north pose by the simulation's own envelope demand (norm); ground-save actions stay LOW_COLLAPSE and keep the ground stills, the far low dive keeps LOW_DIVE_LEFT_FAR (priority 2), the tight-angle and overhead stills keep their cases by priority, and a SOUTH-WEST facing keeper keeps SW_FAR_DIVE_LEFT where its facing term wins"),
    # TOP-LEFT CORNER (2026-09-05): only for genuinely full-stretch TOP-height airborne saves to GOAL_LEFT with real lateral demand — the
    # north far-dive pose keeps ordinary medium/high dives, the ground stills keep low saves, the overhead still keeps mostly-vertical
    # reaches and the tight-angle stills keep their own cases (priority 2 + the openness term).
    dict(id="TOP_LEFT_CORNER", file="TOP_LEFT_CORNER_CW50", inventory_id="PRO_DIVE_SOUTH_V1", role="top_corner", priority=2, facing_deg=180,
         side="GOAL_LEFT", mirror=False, height_classes=["TOP"], source_file="sources/TOP_LEFT_CORNER_RAW.png", rotation_cw_deg=50,
         note="full-stretch top-corner save to GOAL_LEFT: the Pro sprite authored as a south dive attempt, salvaged and rotated 50 deg CW as a presentation transform; no opposite-side variant exists"),
    # SOUTH-WEST FAR DIVE (2026-09-05): matched on the keeper's OWN side (cls.side), not the camera's goal side, because the mapping was
    # established from the simulation's keeper-frame classification. Far/high-extension AIRBORNE_DIVE only; the ground stills, tight-angle
    # stills, overhead still, top-corner pose and the north far dive keep their own cases.
    dict(id="SW_FAR_DIVE_LEFT", file="SW_FAR_DIVE", inventory_id="PRO_DIVE_SOUTH_V2", role="sw_far_dive", facing_deg=135, keeper_side="LEFT",
         mirror=False, height_classes=["MID", "HIGH"], source_file="sources/SW_FAR_DIVE_RAW.png",
         note="SOUTH-WEST facing keeper, far airborne dive to his physical LEFT (original orientation; validated live at 11.9 deg from the real save vector)"),
    dict(id="SW_FAR_DIVE_RIGHT", file="SW_FAR_DIVE", inventory_id="PRO_DIVE_SOUTH_V2", role="sw_far_dive", facing_deg=135, keeper_side="RIGHT",
         mirror=True, height_classes=["MID", "HIGH"], source_file="sources/SW_FAR_DIVE_RAW.png",
         note="SOUTH-WEST facing keeper, far airborne dive to his physical RIGHT (same still drawn MIRRORED; 31.8 deg from the real save vector, the weaker of the two pairings)"),
    # FAR / EXTREME LOW DIVE LEFT (2026-09-06): only for AIRBORNE_DIVE at LOW-MID height, to the keeper's own LEFT, at or beyond a full
    # stretch. Ordinary low saves stay LOW_COLLAPSE and keep the approved ground stills; this never touches them.
    dict(id="LOW_DIVE_LEFT_FAR", file="LOW_DIVE_LEFT", inventory_id="PRO_SOUTH_SIDEROLL", role="low_far_dive", priority=2, keeper_side="LEFT",
         mirror=True, height_classes=["LOW-MID"], source_file="sources/LOW_DIVE_LEFT_RAW.png",
         note="far / extreme low airborne dive to the keeper's physical LEFT (the Pro south attempt, salvaged and drawn MIRRORED; ordinary ground-save actions keep the low stills)"),
]
CTX_DIR = os.path.join(ASSETS, "goalkeeper", "contextual")
samples, ctx_meta = {}, []
for cp in CONTEXTUAL_POSES:
    fname = cp.get("file", cp["id"]); an_path = os.path.join(CTX_DIR, fname + "_anchors.json")
    if not os.path.exists(os.path.join(CTX_DIR, fname + ".png")) or not os.path.exists(an_path): print("MISSING contextual pose", cp["id"]); continue
    an = json.load(open(an_path)); mirror = bool(cp.get("mirror", False)); reach = an.get("reach_screen_unit")
    # BODY SCALE: a still drawn at a different pixel density than GK_BASE_V1 carries a measured `pixel_scale` so the same person is the
    # same size in every pose. Declared on the row, written into the authored anchors (both orientations share one anchors file).
    if cp.get("pixel_scale") is not None and an.get("pixel_scale") != cp["pixel_scale"]:
        an["pixel_scale"] = cp["pixel_scale"]
        an["pixel_scale_note"] = ("measured against GK_BASE_V1 set/west.png by head geometry (blob box diagonal and PCA major axis of the "
                                  "head: face skin plus adjacent hair); the body-length measures used for the Pro dive art do not apply to "
                                  "these curled ground poses because their torsos are foreshortened")
        json.dump(an, open(an_path, "w"), indent=1); print("body scale", cp["pixel_scale"], "->", os.path.basename(an_path))
    # the horizontal mirror flips the authored reach, unless a row pins the two apart (reach_mirror) because the live review chose a
    # drawn orientation that differs from the one the authored vector was measured in — selection then keeps its approved reach vector
    if bool(cp.get("reach_mirror", mirror)) and reach: reach = [-reach[0], reach[1]]
    samples[cp["id"]] = {"path": "goalkeeper/contextual/%s.png" % fname, "anchors": "goalkeeper/contextual/%s_anchors.json" % fname, "mirror": mirror, "approved": True, "candidate": False, "id": cp["inventory_id"], "note": cp["note"]}
    ctx_meta.append({k: v for k, v in cp.items() if k not in ("note", "file", "reach_mirror")} | {"path": samples[cp["id"]]["path"], "anchors": samples[cp["id"]]["anchors"], "transform": "MIRRORED" if mirror else "ORIGINAL", "reach_screen_unit": reach})
man["save_poses"] = {"CONTEXTUAL": {"ANY": {"samples": samples}}}
man["contextual_poses"] = ctx_meta
# SEQUENCES (2026-09-06): full authored dive animations keyed to a contact pose. Each folder under goalkeeper/sequences/<ID>/ carries the
# baked frames, per-frame anchors and a sequence.json (schedule in the simulation's own u before contact and seconds after endT,
# hand-led weights, carried-placement factors, the presentation-root continuation). Written by tools/gk_anim/proto_dive/bake_sequence.py.
SEQ_DIR = os.path.join(ASSETS, "goalkeeper", "sequences"); man["sequences"] = {}
if os.path.isdir(SEQ_DIR):
    for sid in sorted(os.listdir(SEQ_DIR)):
        sj = os.path.join(SEQ_DIR, sid, "sequence.json")
        if os.path.exists(sj): man["sequences"][sid] = json.load(open(sj)); print("sequence", sid, len(man["sequences"][sid]["pre"]), "pre +", len(man["sequences"][sid]["post"]), "post frames")
json.dump(man, open(man_path, "w"), indent=1); print("wrote", man_path, "clips", len(clips), "variants", sum(len(c["variants"]) for c in clips.values()), "contextual poses", len(ctx_meta))
