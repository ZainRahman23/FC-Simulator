# GK_ANIMATION_LIBRARY_FINAL_REVIEW generator: master animation sheets (A), coverage matrix (B), perspective sheet (D), counts (F)
# from the live manifest + the family status table below. GIFs (C) and the regression report (G) are added by the capture/regression steps.
#   python3 final_review.py <out_dir>
import sys, os, json, glob
from PIL import Image, ImageDraw, ImageFont
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "..", ".."))
ASSETS = os.path.join(ROOT, "assets", "visual_v1"); OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True)
M = json.load(open(os.path.join(ASSETS, "goalkeeper", "GK_ANIM_V1.json")))
SEQ = M.get("sequences", {}); CTX = {c["id"]: c for c in M.get("contextual_poses", [])}
S_LIVE = 0.4197
F = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 11); FB = lambda s: ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", s)
COL = {"LIVE": (120, 230, 120), "LEGACY": (230, 200, 90), "DEFERRED": (230, 120, 120), "MISSING": (200, 120, 200), "CONTACT-ONLY": (200, 200, 200)}
# ── family table: (family label, side, sequence id or None, contact pose id or None, status, note)
FAMILIES = [
 ("far MID/HIGH/TOP LEFT (generic far dive, W-facing art)", "LEFT", "LEFT_FAR", "DIVE_SOUTH_MEDHIGH", "LIVE", "approved 2026-09-06; + SW/NW anticipation variants"),
 ("far MID/HIGH/TOP RIGHT (generic far dive, W-facing art)", "RIGHT", "RIGHT_FAR", "DIVE_NORTH_MEDHIGH", "LIVE", "new; LOW-MID RIGHT dives also use it (no low-far RIGHT still)"),
 ("full-stretch TOP corner RIGHT", "RIGHT", "RIGHT_TOP", "TOP_LEFT_CORNER", "LIVE", "new; shares the RIGHT_FAR trunk + get-up"),
 ("full-stretch TOP corner LEFT", "LEFT", "LEFT_FAR", "DIVE_SOUTH_MEDHIGH", "LIVE", "no LEFT corner still exists: the generic LEFT far dive serves TOP (NEW KEY ART would add a leaf)"),
 ("south-west facing far dive LEFT", "LEFT", "SW_FAR_LEFT", "SW_FAR_DIVE_LEFT", "LIVE", "new; SW SET-rig trunk, SW_FAR Pro-part bridges/landing"),
 ("south-west facing far dive RIGHT", "RIGHT", "SW_FAR_RIGHT", "SW_FAR_DIVE_RIGHT", "LIVE", "new; the still and its Pro-part frames are mirrored"),
 ("low / ground save, W facing, LEFT (GOAL_RIGHT)", "LEFT", "LOW_W_RIGHT", "W_LOW_RIGHT", "LIVE", "new; no airborne phase"),
 ("low / ground save, W facing, RIGHT (GOAL_LEFT)", "RIGHT", "LOW_W_LEFT", "W_LOW_LEFT", "LIVE", "new"),
 ("low / ground save, SW facing, LEFT", "LEFT", "LOW_SW_RIGHT", "SW_LOW_RIGHT", "LIVE", "new"),
 ("low / ground save, SW facing, RIGHT", "RIGHT", "LOW_SW_LEFT", "SW_LOW_LEFT", "LIVE", "new; bridge mirrored to the still's SE orientation"),
 ("low / ground save, NW facing, LEFT", "LEFT", "LOW_NW_RIGHT", "NW_LOW_RIGHT", "LIVE", "new (the NW still's gloves sit high: known art caveat)"),
 ("low / ground save, NW facing, RIGHT", "RIGHT", "LOW_NW_LEFT", "NW_LOW_LEFT", "LIVE", "new; bridge mirrored"),
 ("low / ground save at S / N / E / NE / SE facings", "both", None, None, "MISSING", "no low still for these facings (audit P0 #3): ART_MISSING diagnostic unchanged — NEW KEY ART REQUIRED"),
 ("low-far / extreme low dive LEFT", "LEFT", "LOW_FAR_LEFT", "LOW_DIVE_LEFT_FAR", "LIVE", "new; shares the LEFT_FAR ground frames + get-up"),
 ("low-far / extreme low dive RIGHT", "RIGHT", None, None, "MISSING", "no still; a mirror of the LEFT still would cross goal sides in the 3/4 camera — NEW KEY ART REQUIRED (RIGHT_FAR serves it meanwhile)"),
 ("tight-angle near-post top, S facing", "near", "TIGHT_S_NEAR", "TIGHT_S_NEAR_TOP", "LIVE", "new; S SET-rig crouch → jump → reach; same lineage, no Pro bridge"),
 ("tight-angle far-post top, S facing", "far", "TIGHT_S_FAR", "TIGHT_S_FAR_TOP", "LIVE", "new"),
 ("tight-angle near-post top, N facing", "near", "TIGHT_N_NEAR", "TIGHT_N_NEAR_TOP", "LIVE", "new"),
 ("tight-angle far-post top, N facing", "far", "TIGHT_N_FAR", "TIGHT_N_FAR_TOP", "LIVE", "new (the N far still reaches up-left: known art caveat)"),
 ("overhead / vertical jump directly under the ball", "central", None, "OVERHEAD_REACH_CW11", "DEFERRED", "DEFERRED — USER REJECTED CURRENT CONTACT SPRITE / NEW ART REQUIRED (behaviour untouched)"),
 ("standing high catch (HIGH_CATCH, no art)", "central", None, None, "DEFERRED", "keeper under the ball reaching straight up: treated as part of the excluded overhead case — DEFERRED / NEW ART REQUIRED"),
 ("chest / supported catch (chest_catch clip E/S)", "central", None, None, "LEGACY", "V1 clip kept (hands out → contact → hug); N facing = TEMP"),
 ("low gather (low_gather clip E/S)", "central", None, None, "LEGACY", "V1 clip kept; N facing = TEMP"),
 ("near-body save (NEAR_BODY_SAVE, no art)", "both", None, None, "MISSING", "not reproduced by six synthetic probes (they classify as SUPPORTED_CATCH / HIGH_CATCH); SET + glove marker retained — NEW KEY ART / rig pose later"),
 ("foot / leg save (foot_save clip, side view)", "both", None, None, "LEGACY", "V1 side-view clip kept (leg along screen x, LEFT = mirrored side-approx); a 3/4-camera leg extension needs NEW KEY ART"),
]
def load_seq_frames(sid):
    sq = SEQ[sid]; rows = []
    for e in sq["pre"]: rows.append(("pre", e))
    rows.append(("contact", None))
    for e in sq["post"]: rows.append(("post", e))
    return sq, rows
def draw_frame(sheet, d, path, anchors, cx, cy, Z, mirror=False, label=None):
    im = Image.open(os.path.join(ASSETS, path)).convert("RGBA"); an = json.load(open(os.path.join(ASSETS, anchors))) if anchors else {}
    ps = S_LIVE * (an.get("pixel_scale") or 1.0); rx, ry = an.get("root", [im.width / 2, im.height - 1])
    if mirror: im = im.transpose(Image.FLIP_LEFT_RIGHT); rx = im.width - rx
    big = im.resize((max(1, round(im.width * ps * Z)), max(1, round(im.height * ps * Z))), Image.NEAREST)
    sheet.paste(big, (cx - round(rx * ps * Z), cy - round(ry * ps * Z)), big)
    d.line([(cx - 3, cy), (cx + 3, cy)], fill=(255, 60, 60)); d.line([(cx, cy - 3), (cx, cy + 3)], fill=(255, 60, 60))
    if label: d.text((cx - 30, cy + 8), label, font=F, fill=(230, 230, 230))
def master_sheet(sid, pose_id, out, Z=2):
    sq, rows = load_seq_frames(sid); n = len(rows) + 2; cw, ch = 74 * Z, 120 * Z
    sheet = Image.new("RGB", (n * cw + 8, ch + 56), (48, 96, 36)); d = ImageDraw.Draw(sheet)
    d.text((6, 4), f"{sid}  →  contact pose {pose_id}  (families {sq.get('families')} heights {sq.get('heights')})  —  SET → pre-contact frames by u → LIVE CONTACT POSE → post-contact frames by seconds after endT → SET", font=FB(12), fill=(255, 255, 255))
    y0 = 34 + int(ch * 0.78)
    set_path = "originals/character_f4838361/set/west.png"; set_an = json.load(open(os.path.join(ASSETS, "goalkeeper/anchors/set.json")))
    facing = {"SW_FAR_LEFT": "south-west", "SW_FAR_RIGHT": "south-west", "LOW_SW_LEFT": "south-west", "LOW_SW_RIGHT": "south-west", "LOW_NW_LEFT": "north-west", "LOW_NW_RIGHT": "north-west",
              "TIGHT_S_NEAR": "south", "TIGHT_S_FAR": "south", "TIGHT_N_NEAR": "north", "TIGHT_N_FAR": "north"}.get(sid, "west")
    sa = set_an[facing]; setp = f"originals/character_f4838361/set/{facing}.png"
    def draw_set(cx, label):
        im = Image.open(os.path.join(ASSETS, setp)).convert("RGBA"); big = im.resize((round(im.width * S_LIVE * Z), round(im.height * S_LIVE * Z)), Image.NEAREST)
        sheet.paste(big, (cx - round(sa["content_cx"] * S_LIVE * Z), y0 - round(sa["foot_row"] * S_LIVE * Z)), big); d.text((cx - 30, y0 + 8), label, font=F, fill=(230, 230, 230))
    draw_set(cw // 2 + 4, "SET (live)")
    for i, (kind, e) in enumerate(rows):
        cx = (i + 1) * cw + cw // 2 + 4
        if kind == "contact":
            cp = CTX.get(pose_id)
            if cp: draw_frame(sheet, d, cp["path"], cp.get("anchors"), cx, y0, Z, mirror=bool(cp.get("mirror")), label="CONTACT (live pose)")
            else: d.text((cx - 30, y0), "contact (live)", font=F, fill=(255, 200, 200))
            continue
        lab = e["key"] + (" *" if e.get("shared") else "") + (f"  u {e['from']:.2f}" if kind == "pre" else f"  +{e['from']:.2f} s")
        draw_frame(sheet, d, e["path"], e.get("anchors"), cx, y0, Z, label=lab)
    draw_set((n - 1) * cw + cw // 2 + 4, "SET (live)")
    d.text((6, ch + 40), "* = frame shared from another sequence · red cross = the simulation root (post-contact frames are drawn at the presentation root in play)", font=F, fill=(200, 210, 200))
    sheet.save(out); return sheet.size
sizes = {}
for sid, sq in SEQ.items():
    sizes[sid] = master_sheet(sid, sq.get("pose"), os.path.join(OUT, f"A_master_{sid}.png"))
# ── B coverage matrix (markdown + png)
lines = ["| save family | side | sequence | contact pose | status | note |", "|---|---|---|---|---|---|"]
for fam, side, sid, pose, status, note in FAMILIES: lines.append(f"| {fam} | {side} | {sid or '—'} | {pose or '—'} | **{status}** | {note} |")
open(os.path.join(OUT, "B_coverage_matrix.md"), "w").write("\n".join(lines) + "\n")
img = Image.new("RGB", (1500, 30 + 22 * len(FAMILIES) + 20), (24, 26, 30)); d = ImageDraw.Draw(img)
d.text((8, 6), "B — animation coverage matrix (every save family × side)", font=FB(14), fill=(255, 255, 255))
for i, (fam, side, sid, pose, status, note) in enumerate(FAMILIES):
    y = 32 + i * 22; d.rectangle([8, y + 3, 100, y + 17], fill=COL[status]); d.text((12, y + 4), status, font=F, fill=(20, 20, 20))
    d.text((110, y + 4), f"{fam}  [{side}]  {sid or '—'} → {pose or '—'}", font=F, fill=(235, 235, 235)); d.text((900, y + 4), note[:110], font=F, fill=(180, 190, 180))
img.save(os.path.join(OUT, "B_coverage_matrix.png"))
# ── F counts
new_frames = 0; shared_refs = 0; facing_variants = 0; moderate = 0; files = set()
for sid, sq in SEQ.items():
    for e in sq["pre"] + sq["post"]:
        if e.get("shared"): shared_refs += 1
        else: files.add(e["path"]); new_frames += 1
        if e.get("moderate"): moderate += 1; files.add(e["moderate"]["path"])
        for d_, v in (e.get("byFacing") or {}).items(): facing_variants += 1; files.add(v["path"])
status_counts = {}
for row in FAMILIES: status_counts[row[4]] = status_counts.get(row[4], 0) + 1
counts = {"sequences_live": len(SEQ), "family_rows": len(FAMILIES), "status": status_counts,
          "baked_frame_files_unique": len(files), "sequence_frame_slots_new": new_frames, "sequence_frame_slots_shared": shared_refs, "moderate_variants": moderate, "facing_variants": facing_variants,
          "note": "every baked frame went through the automatic cleanup pass (specks, holes, stair-steps) and, where it bridges lineages, the palette/outline blend; no frame was hand-edited pixel by pixel"}
json.dump(counts, open(os.path.join(OUT, "F_counts.json"), "w"), indent=1)
print(json.dumps(counts, indent=1)); print({k: v for k, v in sizes.items()})
