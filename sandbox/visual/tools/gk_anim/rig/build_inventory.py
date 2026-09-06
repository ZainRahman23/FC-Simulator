# GK COMPONENT INVENTORY — every goalkeeper sprite we own, grouped by RENDERED perspective (not filename), action family, save side,
# height, extension and phase, with component-salvage notes. Reads the neutral GK_POSE inventory plus the live/derived assets.
#   python3 build_inventory.py <outdir>
import sys, os, json, glob
from PIL import Image, ImageDraw, ImageFont
OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True)
inv = {e["id"]: e for e in json.load(open("review_artifacts/gk_pose_inventory/inventory.json"))}
F = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 12); FB = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 16)
E = []   # entries
def add(id_, path, group, persp, family, side, height, ext, phase, use, parts, body_scale=None, live=False, mirror_ok=None):
    E.append(dict(id=id_, path=path, group=group, perspective=persp, family=family, side=side, height=height, extension=ext, phase=phase, use=use, parts=parts, body_scale=body_scale, live=live, mirror_ok=mirror_ok))
BASE = "assets/visual_v1/originals/character_f4838361"
# --- identity states (8 rotations, 3/4 low top-down camera; the rig sources)
for d in ["south","south-east","east","north-east","north","north-west","west","south-west"]:
    add(f"SET/{d}", f"{BASE}/set/{d}.png", "GK_BASE_V1 SET", f"3/4 top-down, facing {d}", "SET", "-", "-", "-", "ready", "rig source for its facing (W = live shooter-facing)", "all 18 W_SET parts cut; other facings uncut", 1.0, True, "E<->W, NE<->NW, SE<->SW are true mirrors (same camera)")
    add(f"IDLE/{d}", f"{BASE}/idle/{d}.png", "GK_BASE_V1 idle", f"3/4 top-down, facing {d}", "IDLE", "-", "-", "-", "idle", "identity reference only", "-", 1.0, True, None)
# --- V1 clips (animate_character v3 of the SET character): side/front views along the FACING axis
CLIPS = {"chest_catch": ("CHEST_CATCH", "-", "MID", "small", ["hands-out"]*4+["absorb"]*4), "low_gather": ("LOW_GATHER", "-", "LOW", "small", ["get-down"]*5+["secure"]*3),
         "low_collapse_right": ("LOW_COLLAPSE", "keeper RIGHT (along facing)", "LOW", "medium", ["load","load","load","push","extend","extend","contact","contact"]),
         "medium_dive_right": ("AIRBORNE_DIVE", "keeper RIGHT (along facing)", "MID", "large", ["load","load","load","push","extend","extend","contact","contact"]),
         "high_dive_right": ("AIRBORNE_DIVE", "keeper RIGHT (along facing)", "HIGH", "large", ["load","load","load","push","push","extend","extend","contact"]),
         "foot_save_right": ("FOOT_SAVE", "keeper RIGHT", "LOW", "medium", ["load","load","leg out","leg out","leg out","contact","contact","recover"]),
         "shuffle_right": ("SHUFFLE", "RIGHT", "-", "-", ["loop"]*8), "shuffle_right_crouch": ("SHUFFLE (crouch, retired)", "RIGHT", "-", "-", ["loop"]*8), "recover_getting_up": ("RECOVER", "-", "-", "-", ["rise"]*5)}
for clip, (fam, side, h, ext, phases) in CLIPS.items():
    for d in sorted(glob.glob(f"{BASE}/anim/{clip}/*/")):
        dn = d.rstrip("/").split("/")[-1]; frames = sorted(glob.glob(d + "*.png"), key=lambda p: int(os.path.basename(p)[:-4]))
        for fp in frames:
            i = int(os.path.basename(fp)[:-4])
            if i == 0: continue
            persp = {"east": "SIDE view, facing screen-right — the lunge runs along the facing (depth) axis: WRONG for W-facing lateral dives, fine for crouch/load frames",
                     "south": "FRONT view (facing the camera)", "south-west": "3/4 front-left", "north-west": "3/4 back-left"}.get(dn, dn)
            ph = phases[i - 1] if i - 1 < len(phases) else "-"
            use = {"load": "anticipation/crouch source (direction-neutral): knees, hips, arm swing", "push": "push-off source: driving leg, trailing leg; torso lean is along the facing axis (use limbs, not the lean)",
                   "extend": "airborne limb sources: extended lead arm, trailing arm, trailing legs (side view)", "contact": "side-view contact — rejected live as a whole; arms/legs reusable as components"}.get(ph, "clip frame")
            live = (clip in ("shuffle_right", "recover_getting_up", "chest_catch", "low_gather", "foot_save_right")) and clip != "shuffle_right_crouch"
            add(f"{clip}/{dn} f{i}", fp, f"V1 clip {clip}", persp, fam, side, h, ext, ph, use, "head, torso, near/far arm, gloves, thighs, shins, boots (uncut)", 1.0, live, "E->W mirror is the runtime's own convention")
# --- V1 rejected axis groups
for gid, (fam, note) in {"gk_dive_toward_viewer_3a06e040": ("AIRBORNE_DIVE toward the camera (rejected axis)", "crouch frames 1-3 usable as load; dive frames extend TOWARD the camera"),
                         "gk_dive_away_from_viewer_3a06e040".replace("3a06e040","3a06e040"): ("", "")}.items(): pass
for gid, fam, note in [("gk_dive_toward_viewer_b9ba4520", "AIRBORNE_DIVE (toward camera, rejected)", "frames 1-3 crouch/load usable; 4-8 dive toward the camera — arm/leg components only"),
                       ("gk_dive_away_from_viewer_3a06e040", "AIRBORNE_DIVE (away from camera, rejected)", "frames 1-5 crouch/load usable; 6-8 leap up-right with one arm raised — strong MID-FLIGHT arm/torso components for an up-screen dive")]:
    for fp in sorted(glob.glob(f"review_artifacts/gk_pose_inventory/pixellab_downloads/{gid}/east/*.png"), key=lambda p: int(os.path.basename(p)[:-4])):
        i = int(os.path.basename(fp)[:-4])
        if i == 0: continue
        add(f"{gid[:22]} f{i}", fp, "V1 rejected group", "SIDE view, facing screen-right (E)", fam, "keeper RIGHT", "MID/HIGH", "large", "load" if i <= 3 else ("push" if i <= 5 else "extend"), note, "arms, legs, torso", 1.0, False, None)
for gid, fam in [("gk_chest_catch_v1_ballbaked_d446b433", "CHEST_CATCH (ball baked in — unusable as-is)"), ("gk_low_gather_v1_ballbaked_cbf8b433", "LOW_GATHER (ball baked in — unusable as-is)")]:
    for d in ("east", "south"):
        for fp in sorted(glob.glob(f"review_artifacts/gk_pose_inventory/pixellab_downloads/{gid}/{d}/*.png"), key=lambda p: int(os.path.basename(p)[:-4])):
            i = int(os.path.basename(fp)[:-4])
            if i == 0: continue
            add(f"{gid[:16]}/{d} f{i}", fp, "V1 rejected group (ball baked)", "SIDE (E)" if d == "east" else "FRONT (S)", fam, "-", "LOW/MID", "small", "-", "ball is baked into the gloves: only head/torso/legs reusable", "head, torso, legs", 1.0, False, None)
# --- V1.1 contact states (Pro, 8 'rotations' of a lying/airborne pose — NOT true 3-D turns of the camera)
STATES = {"low_collapse": ("LOW_COLLAPSE", "LOW", "medium"), "medium_dive": ("AIRBORNE_DIVE", "MID", "large"), "high_dive": ("AIRBORNE_DIVE", "HIGH", "large"), "full_stretch": ("AIRBORNE_DIVE full stretch", "TOP", "full")}
for k in range(113, 145):
    e = inv[f"GK_POSE_{k:03d}"]; st, d = e["label"].replace("state ", "").split(" / ")
    fam, h, ext = STATES[st]
    live = k in (114, 115, 116, 129, 132, 133, 136)
    persp = f"PixelLab '{d}' rotation of the lying pose: the body lies ACROSS the screen for S/N, ALONG the facing for E/W (a re-drawn pose, not a camera turn)"
    use = {"south-east": "LIVE as LOW_SIDE_SW", "east": "LIVE as LOW_SIDE_W", "north-east": "LIVE as LOW_SIDE_NW"}.get(d, "") if st == "low_collapse" else ("LIVE as TIGHT_*_TOP" if live else "")
    use = use or ("W/E rows: extension along the facing = depth axis (AXIS_MISMATCH for the W keeper); N/S rows: body across the screen — component source for lateral dives (arms, legs, torso at full extension)")
    add(e["id"], e["path"], "V1.1 contact state (Pro)", persp, fam, f"keeper RIGHT ({d})", h, ext, "contact", use, "extended arms + gloves, straight trailing legs, arched torso", 0.86 if st == "low_collapse" else None, live, "mirror = the other keeper side, same drawn perspective (the runtime's MIRRORED low variants)")
# --- V1.2 camera-space candidates, proofs, tests (drawn in / for the gameplay camera)
CAM = {145: ("LOW_COLLAPSE", "GOAL_LEFT (up-screen)", "LOW", "medium", "contact/land", "landing-frame candidate for a GOAL_LEFT dive (keeper lying up-left)"),
       146: ("AIRBORNE_DIVE", "GOAL_LEFT", "MID", "medium", "extend", "leap up-left, one arm raised — MID-FLIGHT candidate for the north far dive (camera-space)"),
       147: ("AIRBORNE_DIVE", "GOAL_LEFT", "HIGH", "large", "extend", "body inclined up-left, arms forward — early/mid flight candidate"),
       148: ("AIRBORNE_DIVE", "GOAL_LEFT", "TOP", "full", "contact", "LIVE as OVERHEAD_REACH_CW11 (rotated 11°)"),
       149: ("LOW_COLLAPSE", "GOAL_RIGHT (down-screen)", "LOW", "medium", "contact/land", "GOAL_RIGHT low/landing candidate"),
       150: ("AIRBORNE_DIVE", "GOAL_RIGHT", "MID", "medium", "extend", "GOAL_RIGHT mid-flight candidate (faceless)"),
       151: ("AIRBORNE_DIVE", "GOAL_RIGHT", "HIGH", "large", "extend", "GOAL_RIGHT high candidate"),
       152: ("AIRBORNE_DIVE", "GOAL_RIGHT", "TOP", "full", "contact", "GOAL_RIGHT top candidate (vertical)"),
       153: ("AIRBORNE_DIVE", "GOAL_LEFT", "MID", "large", "extend", "sideways diagonal dive with ball — arms/torso components"),
       154: ("LOW_COLLAPSE", "GOAL_LEFT", "LOW", "medium", "contact", "low reach toward shooter (rejected)"),
       155: ("AIRBORNE_DIVE", "GOAL_RIGHT", "TOP", "full", "contact", "sideways top dive (rejected)"), 156: ("AIRBORNE_DIVE", "GOAL_LEFT", "HIGH", "large", "contact", "pixen route, rotated figure (rejected)"),
       157: ("AIRBORNE_DIVE", "GOAL_LEFT", "HIGH", "full", "contact", "PROOF: full diagonal extension up-left, faceless — strong body/arm/leg components for FAR flight frames"),
       158: ("AIRBORNE_DIVE", "GOAL_RIGHT", "HIGH", "full", "contact", "PROOF: full extension down-right, faceless"), 159: ("AIRBORNE_DIVE", "GOAL_RIGHT", "-", "-", "-", "six-figure grid (rejected) — component mine only"),
       160: ("AIRBORNE_DIVE", "GOAL_LEFT", "HIGH", "large", "extend/contact", "pixen W dive up-left with both arms up — nearest existing kin of DIVE_NORTH_CW50; mid-flight candidate"),
       161: ("AIRBORNE_DIVE", "GOAL_RIGHT", "MID", "large", "contact", "pixen W dive down-right"), 162: ("AIRBORNE_DIVE", "SOUTH (down-screen)", "MID", "large", "contact", "N/S roll test")}
for k, (fam, side, h, ext, ph, use) in CAM.items():
    e = inv[f"GK_POSE_{k:03d}"]
    add(e["id"], e["path"], "V1.2 / proof camera-space", "GAMEPLAY CAMERA (authored on a renderer plate)" if k <= 159 else "W-facing edit (gameplay camera assumed)", fam, side, h, ext, ph, use, "arms, gloves, torso, legs (faceless heads on 150/157/158)", None, k == 148, "NO mirror across GOAL_LEFT/RIGHT: the camera is asymmetric")
# --- Pro dive art (camera-derived, live) + SOUTH V6
PRO = [("DIVE_NORTH_RAW", "assets/visual_v1/goalkeeper/contextual/sources/DIVE_NORTH_RAW.png", "AIRBORNE_DIVE", "GOAL_LEFT (drawn lateral; live at 50° CW)", "MID/HIGH/FAR", "full", "contact", "LIVE (as DIVE_NORTH_CW50 @0.72): the authored KEY POSE of the first interpolation test", 0.72, True),
       ("TOP_LEFT_CORNER_RAW", "assets/visual_v1/goalkeeper/contextual/sources/TOP_LEFT_CORNER_RAW.png", "AIRBORNE_DIVE full stretch", "GOAL_LEFT top corner", "TOP", "full", "contact", "LIVE (50° CW @0.72)", 0.72, True),
       ("SW_FAR_DIVE_RAW", "assets/visual_v1/goalkeeper/contextual/sources/SW_FAR_DIVE_RAW.png", "AIRBORNE_DIVE", "SW-facing keeper, far dive (orig = his left, mirrored = his right)", "MID/HIGH", "full", "contact", "LIVE @0.74 — the only far-dive key pose for the SW facing", 0.74, True),
       ("LOW_DIVE_LEFT_RAW", "assets/visual_v1/goalkeeper/contextual/sources/LOW_DIVE_LEFT_RAW.png", "AIRBORNE_DIVE low", "GOAL_RIGHT low far (mirrored)", "LOW", "full", "contact", "LIVE mirrored @0.60 as LOW_DIVE_LEFT_FAR", 0.60, True),
       ("SOUTH_V6", "review_artifacts/gk_dive_south_v6/RAW_SOUTH_V6.png", "AIRBORNE_DIVE", "GOAL_RIGHT (south) far dive, near-overhead camera", "MID/HIGH", "full", "contact", "authoritative SOUTH geometry (locked); manual cleanup in gk_south_v6_cleanup — future GOAL_RIGHT key pose", None, False),
       ("SOUTH_V6_CLEAN", "review_artifacts/gk_south_v6_cleanup/V6_CLEAN.png", "AIRBORNE_DIVE", "GOAL_RIGHT (south) far dive", "MID/HIGH", "full", "contact", "V6 + 76-px readability cleanup (awaiting review)", None, False)]
for id_, path, fam, side, h, ext, ph, use, bs, live in PRO:
    add(id_, path, "Pro dive art (camera-derived)", "GAMEPLAY-CAMERA dive, Pro model (denser pixels: body scale " + (str(bs) if bs else "uncalibrated") + ")", fam, side, h, ext, ph, use, "two arms + gloves, head, torso, legs at full extension — key poses", bs, live, "mirror only within the same facing (SW_FAR_DIVE); never across GOAL_LEFT/RIGHT")
for fp in sorted(glob.glob("assets/visual_v1/goalkeeper/contextual/*.png")):
    n = os.path.basename(fp)[:-4]
    add("LIVE/" + n, fp, "LIVE contextual pose", "as drawn in play (build-time rotation/mirror applied)", "contextual save pose", n, "-", "-", "contact", "the 12 live save-pose stills (selector roles: tight_high, overhead, low_side, dive_north, top_corner, sw_far_dive, low_far_dive)", "-", None, True, None)
json.dump(E, open(f"{OUT}/GK_COMPONENT_INVENTORY.json", "w"), indent=1)
# ---- sheet: grouped rows
groups = []
for g in dict.fromkeys(e["group"] for e in E): groups.append((g, [e for e in E if e["group"] == g]))
S = 1; TH = 132; CW = 118; cols = 12
rows_img = []
for g, es in groups:
    n = len(es); r = (n + cols - 1) // cols
    img = Image.new("RGB", (cols * CW + 8, 26 + r * (TH + 40)), (18, 19, 22)); d = ImageDraw.Draw(img)
    persps = list(dict.fromkeys(e["perspective"].split(" — ")[0][:40] for e in es))
    d.text((6, 4), f"{g}  ({n})  — perspective: " + (persps[0][:100] if len(persps) == 1 else "MIXED per cell: " + " | ".join(persps)[:120]), font=FB, fill=(235, 225, 120))
    for i, e in enumerate(es):
        try: im = Image.open(e["path"]).convert("RGBA")
        except Exception: continue
        b = im.getbbox(); c = im.crop(b) if b else im
        bs = e["body_scale"] or 1.0
        if bs != 1.0: c = c.resize((max(1, round(c.width * bs)), max(1, round(c.height * bs))), Image.NEAREST)   # canonical body scale for size comparison only
        sc = min((CW - 8) / c.width, (TH - 4) / c.height, 1.0); c = c.resize((max(1, int(c.width * sc)), max(1, int(c.height * sc))), Image.NEAREST)
        x = 4 + (i % cols) * CW; y = 26 + (i // cols) * (TH + 40)
        d.rectangle([x, y, x + CW - 4, y + TH + 36], fill=(30, 32, 37) if not e["live"] else (28, 44, 32), outline=(64, 68, 76))
        img.paste(c, (x + (CW - 4 - c.width) // 2, y + 2 + (TH - c.height) // 2), c)
        d.text((x + 3, y + TH + 2), e["id"][:19], font=F, fill=(220, 220, 230)); d.text((x + 3, y + TH + 14), f"{e['family'][:11]} {e['height']}", font=F, fill=(160, 200, 160))
        d.text((x + 3, y + TH + 25), f"{e['phase'][:9]} {e['extension'][:6]}"[:18], font=F, fill=(150, 155, 165))
    rows_img.append(img)
W = max(i.width for i in rows_img); H = sum(i.height + 8 for i in rows_img) + 60
sheet = Image.new("RGB", (W, H), (18, 19, 22)); d = ImageDraw.Draw(sheet)
d.text((8, 8), f"GK COMPONENT INVENTORY — {len(E)} sprites, grouped by lineage; each cell: id / family height / phase extension; green cells = LIVE in play; thumbnails at canonical body scale (Pro art shown at its pixel_scale)", font=FB, fill=(255, 255, 255))
d.text((8, 32), "perspective is the RENDERED one (see the .md for the reading per group) — filenames such as 'north' on V1.1 states are PixelLab's pose re-draws, not camera turns", font=F, fill=(200, 150, 140))
y = 56
for i in rows_img: sheet.paste(i, (0, y)); y += i.height + 8
sheet.save(f"{OUT}/GK_COMPONENT_INVENTORY_SHEET.png"); print("inventory", len(E), "sheet", sheet.size)
# ---- markdown
md = ["# GK COMPONENT INVENTORY", "", f"{len(E)} goalkeeper sprites on disk, grouped by lineage. Perspective is what the sprite actually shows in the gameplay camera, not its filename.", "",
      "| group | count | rendered perspective | families | usable as | component notes |", "|---|---|---|---|---|---|"]
for g, es in groups:
    fams = sorted(set(e["family"] for e in es)); uses = sorted(set(e["phase"] for e in es))
    persps = list(dict.fromkeys(e["perspective"].split(" — ")[0][:60] for e in es))
    md.append(f"| {g} | {len(es)} | {' / '.join(persps)[:150]} | {', '.join(fams)[:90]} | {', '.join(uses)[:60]} | {es[0]['parts'][:90]} |")
md += ["", "## Per-sprite table", "", "| id | path | perspective | family | side | height | extension | phase | body scale | live | use / notes |", "|---|---|---|---|---|---|---|---|---|---|---|"]
for e in E:
    md.append(f"| {e['id']} | `{e['path']}` | {e['perspective'][:70]} | {e['family']} | {e['side']} | {e['height']} | {e['extension']} | {e['phase']} | {e['body_scale'] if e['body_scale'] else '?'} | {'LIVE' if e['live'] else ''} | {e['use'][:110]} |")
open(f"{OUT}/GK_COMPONENT_INVENTORY.md", "w").write("\n".join(md)); print("md written")
