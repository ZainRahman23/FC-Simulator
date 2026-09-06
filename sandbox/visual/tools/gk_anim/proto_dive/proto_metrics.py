# ART-LINEAGE / SIZE CONTINUITY — measures every frame of the prototype (rig frames via their part owner maps; the contact PNG and clip
# frames via colour classes) in SCREEN px: head size, shoulder width, torso length/width, arm thickness, thigh/shin thickness, body scale.
#   python3 proto_metrics.py <frames_dir> <out.md>
import sys, os, json, math
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(HERE, "..", "rig")); sys.path.insert(0, HERE)
from gk_rig import cls_of, mat_apply
from rig_w_set import build as build_set
from rig_south_cw20 import build as build_contact
from PIL import Image
FR, OUT = sys.argv[1], sys.argv[2]
ROOTDIR = os.path.abspath(os.path.join(HERE, "..", "..", "..", "..", ".."))
meta = json.load(open(f"{FR}/frames.json")); S_LIVE = 0.4197
RS, _ = build_set(FR); RC, _ = build_contact()
def bbox(pts): xs = [p[0] for p in pts]; ys = [p[1] for p in pts]; return (min(xs), min(ys), max(xs) + 1, max(ys) + 1) if pts else None
def thickness(pts):
    """typical thickness of a limb part: 2 × median distance-to-edge of its pixels (px)"""
    if not pts: return 0
    S = set(pts); d = {}
    frontier = [p for p in pts if any((p[0] + dx, p[1] + dy) not in S for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))]
    for p in frontier: d[p] = 1
    cur = frontier; k = 1
    while len(d) < len(S) and cur and k < 30:
        k += 1; nxt = []
        for p in cur:
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                q = (p[0] + dx, p[1] + dy)
                if q in S and q not in d: d[q] = k; nxt.append(q)
        cur = nxt
    vals = sorted(d.values()); return 2 * vals[len(vals) // 2] if vals else 0
def width_perp(pts, axis):
    """extent of a pixel set measured perpendicular to a unit axis (px)"""
    if not pts: return 0
    nx, ny = -axis[1], axis[0]; pr = [p[0] * nx + p[1] * ny for p in pts]; return max(pr) - min(pr) + 1
rows = []
for f in meta["frames"] + [None]:
    if f is None:   # the contact PNG
        cw = f"{ROOTDIR}/assets/visual_v1/goalkeeper/contextual/DIVE_SOUTH_CW20.png"; im = Image.open(cw).convert("RGBA"); px = im.load(); ps = S_LIVE * 0.85
        cls = {}
        for y in range(im.height):
            for x in range(im.width):
                c = cls_of(px[x, y]);
                if c != "T": cls.setdefault(c, []).append((x, y))
        # head = skin + hair inside the head box of the contact rig; torso = green inside the torso polygon; use the rig's rest owner map
        own = RC.owner_map({}, canvas=im.size)
        parts = {}
        for (x, y), n in own.items(): parts.setdefault(n, []).append((x, y))
        name = "F10_CONTACT (PNG)"; scale = 0.85
    else:
        im = Image.open(f"{FR}/{f['name']}.png").convert("RGBA"); ps = S_LIVE * f["pixel_scale"]; scale = f["pixel_scale"]; name = f["name"]
        if f["rig"] == "W_SET":
            own = RS.owner_map(f["pose"], canvas=tuple(meta["canvas_set"]), offset=tuple(meta["offset_set"]))
        elif f["rig"] == "SOUTH_CW20":
            own = RC.owner_map(f["pose"], canvas=tuple(meta["canvas_contact"]), offset=tuple(meta["offset_contact"]))
        else:  # clip frame: classify by colour; head = skin+hair rows above the green; report what can be measured
            px = im.load(); own = {}
            for y in range(im.height):
                for x in range(im.width):
                    c = cls_of(px[x, y])
                    if c == "T": continue
                    own[(x, y)] = "green" if c == "G" else "skin" if c == "S" else "dark" if c == "K" else "white" if c == "W" else "other"
        parts = {}
        for (x, y), n in own.items(): parts.setdefault(n, []).append((x, y))
    def P(*names): return sum((parts.get(n, []) for n in names), [])
    if "head" in parts:
        hb = bbox(parts["head"]); head_w, head_h = (hb[2] - hb[0]) * ps, (hb[3] - hb[1]) * ps
        head_d = 2 * math.sqrt(len(parts["head"]) / math.pi) * ps                                # rotation-independent: area-equivalent diameter
        torso = P("torso", "torso_under"); tb = bbox(torso)
        # torso axis = shoulder→hip; for W_SET: near_upper pivot → pelvis pivot; for the contact rig: sleeve pivot → pelvis pivot
        if f is None or f["rig"] == "SOUTH_CW20":
            R = RC; M = R.world({} if f is None else f["pose"]); off = (0, 0) if f is None else tuple(meta["offset_contact"]); sh = mat_apply(M["sleeve"], *R.parts["sleeve"].pivot); hp = mat_apply(M["pelvis"], *R.parts["pelvis"].pivot)
            arm = P("sleeve"); thigh = P("thigh_1", "thigh_2"); shin = P("shin_1", "shin_2")
        else:
            R = RS; M = R.world(f["pose"]); sh = mat_apply(M["near_upper"], *R.parts["near_upper"].pivot); hp = mat_apply(M["pelvis"], *R.parts["pelvis"].pivot)
            arm = P("near_upper", "near_fore"); thigh = P("near_thigh", "near_thigh_edge", "far_thigh"); shin = P("near_shin", "far_shin")
        ax = (hp[0] - sh[0], hp[1] - sh[1]); L = math.hypot(*ax) or 1; ax = (ax[0] / L, ax[1] / L)
        torso_len = L * ps; torso_w = width_perp(torso, ax) * ps
        proj = [((p[0] - sh[0]) * ax[0] + (p[1] - sh[1]) * ax[1]) for p in torso]; lo_, hi_ = min(proj), max(proj)
        shoulder_w = width_perp([p for p, q in zip(torso, proj) if q < lo_ + (hi_ - lo_) * 0.33], ax) * ps      # upper third of the torso
        arm_t = thickness(P("near_upper") if f is not None and f["rig"] == "W_SET" else P("sleeve")) * ps
        thigh_t = thickness(P("far_thigh") if f is not None and f["rig"] == "W_SET" else P("thigh_2")) * ps
        shin_t = thickness(P("far_shin") if f is not None and f["rig"] == "W_SET" else P("shin_2")) * ps
        rows.append((name, scale, head_w, head_h, shoulder_w, torso_len, torso_w, arm_t, thigh_t, shin_t, len(own) * ps * ps, head_d))
    else:   # clip frames: colour-class based
        skin = parts.get("skin", []); dark = parts.get("dark", []); green = parts.get("green", [])
        top = min(p[1] for p in skin) if skin else 0; head = [p for p in skin + dark if p[1] < top + 22] if skin else []
        hb = bbox(head) if head else (0, 0, 0, 0); gb = bbox(green) if green else (0, 0, 0, 0)
        rows.append((name + " (clip, colour-based: head box, shirt box)", scale, (hb[2] - hb[0]) * ps, (hb[3] - hb[1]) * ps, (gb[2] - gb[0]) * ps, (gb[3] - gb[1]) * ps, 0, 0, 0, 0, len(own) * ps * ps, 2 * math.sqrt(max(1, len(head)) / math.pi) * ps))
# order: keep chronological with the PNG after F09
order = [r[0] for r in rows]; png = rows.pop(); idx = next(i for i, r in enumerate(rows) if r[0].startswith("F11")); rows.insert(idx, png)
md = ["# Size / art-lineage continuity — screen px at the gameplay camera (sprite scale 0.4197 × body scale)", "",
      "head = bounding box of the head part (skin + hair); shoulder width = torso width across the shoulder line; torso = shoulder→hip length and width across the body axis; thickness = 2 × median distance-to-edge of the limb part; area = opaque sprite area on screen (px²).", "",
      "| frame | body scale | head w × h (bbox, rotation-dependent) | head Ø (area-equiv.) | shoulder w | torso len (joint→joint) | torso w | upper-arm thick | thigh thick | shin thick | area px² |", "|---|---|---|---|---|---|---|---|---|---|---|"]
for r in rows: md.append(f"| {r[0]} | {r[1]} | {r[2]:.1f} × {r[3]:.1f} | {r[11]:.1f} | {r[4]:.1f} | {r[5]:.1f} | {r[6]:.1f} | {r[7]:.1f} | {r[8]:.1f} | {r[9]:.1f} | {r[10]:.0f} |")
open(OUT, "w").write("\n".join(md) + "\n"); print("\n".join(md[5:]))
