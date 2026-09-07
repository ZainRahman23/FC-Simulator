# D — PERSPECTIVE SHEET: representative saves from several keeper facings so perspective snaps can be judged: for each facing the
# live SET sprite, the anticipation frames the sequences start from, the first flight/collapse frame, and the contact pose.
#   python3 perspective_sheet.py <out.png>
import sys, os, json
from PIL import Image, ImageDraw, ImageFont
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "..", "..")); ASSETS = os.path.join(ROOT, "assets", "visual_v1")
M = json.load(open(os.path.join(ASSETS, "goalkeeper", "GK_ANIM_V1.json"))); SEQ = M["sequences"]; CTX = {c["id"]: c for c in M["contextual_poses"]}
SET_AN = json.load(open(os.path.join(ASSETS, "goalkeeper/anchors/set.json"))); S_LIVE = 0.4197; Z = 3
F = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 11); FB = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 13)
def pre(sid, key, facing=None):
    for e in SEQ[sid]["pre"]:
        if e["key"] == key:
            v = (e.get("byFacing") or {}).get(facing) if facing else None
            return (v or e)["path"], (v or e)["anchors"]
    return None, None
ROWS = [  # (label, facing, [(kind, spec)...])  kind: set | frame(path,anchors) | pose(id)
 ("WEST — far dive LEFT (approved)", "west", [("seq", ("LEFT_FAR", "F01", None)), ("seq", ("LEFT_FAR", "F03", None)), ("seq", ("LEFT_FAR", "F06", None)), ("pose", "DIVE_SOUTH_MEDHIGH")]),
 ("WEST — far dive RIGHT", "west", [("seq", ("RIGHT_FAR", "F01", None)), ("seq", ("RIGHT_FAR", "F03", None)), ("seq", ("RIGHT_FAR", "F06", None)), ("pose", "DIVE_NORTH_MEDHIGH")]),
 ("SOUTH-WEST — far dive LEFT (SW_FAR pose)", "south-west", [("seq", ("SW_FAR_LEFT", "F01", None)), ("seq", ("SW_FAR_LEFT", "F03", None)), ("seq", ("SW_FAR_LEFT", "F06", None)), ("pose", "SW_FAR_DIVE_LEFT")]),
 ("SOUTH-WEST — far dive RIGHT (SW_FAR pose mirrored)", "south-west", [("seq", ("SW_FAR_RIGHT", "F01", None)), ("seq", ("SW_FAR_RIGHT", "F03", None)), ("seq", ("SW_FAR_RIGHT", "F06", None)), ("pose", "SW_FAR_DIVE_RIGHT")]),
 ("SOUTH-WEST — TOP dive LEFT: SW anticipation variant → W trunk", "south-west", [("seq", ("LEFT_FAR", "F01", "south-west")), ("seq", ("LEFT_FAR", "F03", "south-west")), ("seq", ("LEFT_FAR", "F04", None)), ("pose", "DIVE_SOUTH_MEDHIGH")]),
 ("NORTH-WEST — far dive LEFT: NW anticipation variant → W trunk", "north-west", [("seq", ("LEFT_FAR", "F01", "north-west")), ("seq", ("LEFT_FAR", "F03", "north-west")), ("seq", ("LEFT_FAR", "F04", None)), ("pose", "DIVE_SOUTH_MEDHIGH")]),
 ("NORTH-WEST — far dive RIGHT: NW anticipation variant → W trunk", "north-west", [("seq", ("RIGHT_FAR", "F01", "north-west")), ("seq", ("RIGHT_FAR", "F03", "north-west")), ("seq", ("RIGHT_FAR", "F04", None)), ("pose", "DIVE_NORTH_MEDHIGH")]),
 ("WEST — low save (both sides share the mirrored still)", "west", [("seq", ("LOW_W_LEFT", "F01_LOWER", None)), ("seq", ("LOW_W_LEFT", "F03_COLLAPSE_L", None)), ("seq", ("LOW_W_LEFT", "F04_BRIDGE_STILL", None)), ("pose", "W_LOW_LEFT")]),
 ("SOUTH-WEST — low save RIGHT / LEFT (LEFT's bridge mirrored)", "south-west", [("seq", ("LOW_SW_RIGHT", "F03_COLLAPSE_R", None)), ("seq", ("LOW_SW_RIGHT", "F04_BRIDGE_STILL", None)), ("pose", "SW_LOW_RIGHT"), ("seq", ("LOW_SW_LEFT", "F04_BRIDGE_STILL", None)), ("pose", "SW_LOW_LEFT")]),
 ("NORTH-WEST — low save RIGHT / LEFT", "north-west", [("seq", ("LOW_NW_RIGHT", "F03_COLLAPSE_R", None)), ("seq", ("LOW_NW_RIGHT", "F04_BRIDGE_STILL", None)), ("pose", "NW_LOW_RIGHT"), ("seq", ("LOW_NW_LEFT", "F04_BRIDGE_STILL", None)), ("pose", "NW_LOW_LEFT")]),
 ("SOUTH — tight near / far post", "south", [("seq", ("TIGHT_S_NEAR", "F02_PUSH_near", None)), ("seq", ("TIGHT_S_NEAR", "F04_REACH_near", None)), ("pose", "TIGHT_S_NEAR_TOP"), ("seq", ("TIGHT_S_FAR", "F04_REACH_far", None)), ("pose", "TIGHT_S_FAR_TOP")]),
 ("NORTH — tight near / far post", "north", [("seq", ("TIGHT_N_NEAR", "F02_PUSH_near", None)), ("seq", ("TIGHT_N_NEAR", "F04_REACH_near", None)), ("pose", "TIGHT_N_NEAR_TOP"), ("seq", ("TIGHT_N_FAR", "F04_REACH_far", None)), ("pose", "TIGHT_N_FAR_TOP")]),
]
cw, ch = 80 * Z, 118 * Z; ncol = 6
sheet = Image.new("RGB", (ncol * cw + 300, len(ROWS) * (ch + 22) + 40), (48, 96, 36)); d = ImageDraw.Draw(sheet)
d.text((8, 8), "D — perspective sheet: the live SET sprite of each facing, the frames the sequences start from, a flight/collapse frame and the approved contact pose (red cross = root)", font=FB, fill=(255, 255, 255))
def blit(path, anchors, cx, cy, mirror=False):
    im = Image.open(os.path.join(ASSETS, path)).convert("RGBA"); an = json.load(open(os.path.join(ASSETS, anchors))) if anchors else {}
    ps = S_LIVE * (an.get("pixel_scale") or 1.0); rx, ry = an.get("root", [im.width / 2, im.height - 1])
    if mirror: im = im.transpose(Image.FLIP_LEFT_RIGHT); rx = im.width - rx
    big = im.resize((max(1, round(im.width * ps * Z)), max(1, round(im.height * ps * Z))), Image.NEAREST); sheet.paste(big, (cx - round(rx * ps * Z), cy - round(ry * ps * Z)), big)
    d.line([(cx - 3, cy), (cx + 3, cy)], fill=(255, 60, 60)); d.line([(cx, cy - 3), (cx, cy + 3)], fill=(255, 60, 60))
for r, (label, facing, cells) in enumerate(ROWS):
    y = 34 + r * (ch + 22); cy = y + int(ch * 0.82); d.text((8, y + 4), label, font=FB, fill=(255, 255, 255)); d.text((8, y + 20), "facing " + facing, font=F, fill=(210, 220, 210))
    sa = SET_AN[facing]; im = Image.open(os.path.join(ASSETS, f"originals/character_f4838361/set/{facing}.png")).convert("RGBA"); big = im.resize((round(im.width * S_LIVE * Z), round(im.height * S_LIVE * Z)), Image.NEAREST)
    cx = 300 + cw // 2; sheet.paste(big, (cx - round(sa["content_cx"] * S_LIVE * Z), cy - round(sa["foot_row"] * S_LIVE * Z)), big); d.text((cx - 30, cy + 6), "SET (live)", font=F, fill=(230, 230, 230))
    for i, (kind, spec) in enumerate(cells):
        cx = 300 + (i + 1) * cw + cw // 2
        if kind == "seq":
            sid, key, fac = spec; p, a = pre(sid, key, fac)
            if p: blit(p, a, cx, cy); d.text((cx - 36, cy + 6), f"{sid} {key}" + (f" [{fac}]" if fac else ""), font=F, fill=(230, 230, 230))
        else:
            cp = CTX[spec]; blit(cp["path"], cp.get("anchors"), cx, cy, mirror=bool(cp.get("mirror"))); d.text((cx - 36, cy + 6), f"contact {spec}", font=F, fill=(255, 230, 160))
sheet.save(sys.argv[1]); print(sys.argv[1], sheet.size)
