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

def derive_rotated_pose(src_rel, out_stem, cw_deg, root_from_lead_base, note, body_scale=1.0):
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
         note="default contact pose for FAR / high-extension AIRBORNE_DIVE saves to GOAL_LEFT (the keeper's right), at every height class: raw Pro sprite rotated 50 deg CW as a presentation transform. Selected by the simulation's own envelope demand (norm), so an unreachable best-effort dive shows the full attempt. Ground-save actions stay LOW_COLLAPSE and keep the ground stills; the tight-angle and overhead stills keep their own cases by priority; no opposite-side variant exists, so GOAL_RIGHT keeps the ART_MISSING diagnostic"),
    # TOP-LEFT CORNER (2026-09-05): only for genuinely full-stretch TOP-height airborne saves to GOAL_LEFT with real lateral demand — the
    # north far-dive pose keeps ordinary medium/high dives, the ground stills keep low saves, the overhead still keeps mostly-vertical
    # reaches and the tight-angle stills keep their own cases (priority 2 + the openness term).
    dict(id="TOP_LEFT_CORNER", file="TOP_LEFT_CORNER_CW50", inventory_id="PRO_DIVE_SOUTH_V1", role="top_corner", priority=2, facing_deg=180,
         side="GOAL_LEFT", mirror=False, height_classes=["TOP"], source_file="sources/TOP_LEFT_CORNER_RAW.png", rotation_cw_deg=50,
         note="full-stretch top-corner save to GOAL_LEFT: the Pro sprite authored as a south dive attempt, salvaged and rotated 50 deg CW as a presentation transform; no opposite-side variant exists"),
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
json.dump(man, open(man_path, "w"), indent=1); print("wrote", man_path, "clips", len(clips), "variants", sum(len(c["variants"]) for c in clips.values()), "contextual poses", len(ctx_meta))
