# FRAME MEASUREMENTS for perspective / proportion continuity: for a rendered keeper frame (PNG + anchors: root, pixel_scale) compute, in
# LIVE screen px relative to the root: head centre + area-equivalent diameter (skin+hair blob at the top of the figure), shoulder line
# (widest row of the kit in the upper third) width + centre, pelvis (the dark shorts blob) centre, torso width (median kit row width),
# limb thickness (median width of the dark shin/boot columns), body bbox (apparent scale = bbox height, and the root-to-body-centre offset).
# Colour classes come from gk_rig.cls_of (K dark, G green kit, W glove, S skin). Pure measurement; nothing here touches any asset.
#   python3 measure.py <frame.png> <anchors.json>        (or import measure(img, anchors))
import sys, os, json, math
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "rig"))
from gk_rig import cls_of
from PIL import Image
S_LIVE = 0.4197
def components(mask):
    seen = set(); out = []
    for p in mask:
        if p in seen: continue
        st = [p]; seen.add(p); c = []
        while st:
            u, v = st.pop(); c.append((u, v))
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                n = (u + dx, v + dy)
                if n in mask and n not in seen: seen.add(n); st.append(n)
        out.append(c)
    return sorted(out, key=len, reverse=True)
def measure(img, an, mirror=False):
    im = img.convert("RGBA")
    if mirror: im = im.transpose(Image.FLIP_LEFT_RIGHT)
    px = im.load(); W, H = im.size; ps = S_LIVE * (an.get("pixel_scale") or 1.0)
    rx, ry = an.get("root", [W / 2, H - 1])
    if mirror: rx = W - rx
    cl = {}
    for y in range(H):
        for x in range(W):
            if px[x, y][3]: cl[(x, y)] = cls_of(px[x, y])
    if not cl: return None
    xs = [p[0] for p in cl]; ys = [p[1] for p in cl]; bbox = (min(xs), min(ys), max(xs), max(ys))
    # head: the largest skin component; its extent grown by adjacent dark (hair) pixels above/around it
    skin = [c for c in components({p for p, c in cl.items() if c == "S"}) if len(c) >= 12]; head = min(skin, key=lambda c: sum(q[1] for q in c) / len(c)) if skin else []   # the TOPMOST sizeable skin blob is the face
    if head:
        hx = [p[0] for p in head]; hy = [p[1] for p in head]; box = (min(hx) - 6, min(hy) - 8, max(hx) + 6, max(hy) + 2)
        hair = {p for p, c in cl.items() if c == "K" and box[0] <= p[0] <= box[2] and box[1] <= p[1] <= box[3] and p[1] <= max(hy)}
        blob = set(head) | hair
    else: blob = set()
    def cen(pts): return (sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts)) if pts else (None, None)
    hc = cen(blob); hdiam = 2 * math.sqrt(len(blob) / math.pi) if blob else None
    # kit rows: width per row of G pixels; shoulders = widest G row in the top 45 % of the kit extent; torso width = median G row width
    kit = {p for p, c in cl.items() if c == "G"}
    rows = {}
    for x, y in kit: rows.setdefault(y, []).append(x)
    ky = sorted(rows)
    widths = [(y, max(rows[y]) - min(rows[y]) + 1, (max(rows[y]) + min(rows[y])) / 2) for y in ky]
    top = widths[: max(1, int(len(widths) * 0.45))]
    sh = max(top, key=lambda t: t[1]) if top else (None, None, None)
    tw = sorted(w for _, w, _ in widths)[len(widths) // 2] if widths else None
    # pelvis: largest dark component touching the kit's bottom rows (the shorts)
    dark = components({p for p, c in cl.items() if c == "K"})
    kit_bottom = ky[-1] if ky else 0
    shorts = next((c for c in dark if any(abs(p[1] - kit_bottom) <= 3 for p in c) and len(c) > 40), None)
    pc = cen(shorts) if shorts else (None, None)
    # limb thickness: median width of dark columns below the shorts (shins/boots), measured per row
    legs = {p for c in dark for p in c if shorts is None or c is not shorts} if dark else set()
    lrows = {}
    for x, y in legs:
        if pc[1] is not None and y > pc[1] + 4: lrows.setdefault(y, []).append(x)
    lw = []
    for y, xs_ in lrows.items():
        xs_ = sorted(xs_); runs = []; s0 = xs_[0]; prev = xs_[0]
        for x in xs_[1:]:
            if x != prev + 1: runs.append(prev - s0 + 1); s0 = x
            prev = x
        runs.append(prev - s0 + 1); lw.extend(runs)
    limb = sorted(lw)[len(lw) // 2] if lw else None
    body_c = ((bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2)
    def scr(pt): return (round((pt[0] - rx) * ps, 1), round((pt[1] - ry) * ps, 1)) if pt and pt[0] is not None else None
    return {"head_c": scr(hc), "head_diam": round(hdiam * ps, 2) if hdiam else None, "shoulder_c": scr((sh[2], sh[0])) if sh[0] is not None else None, "shoulder_w": round(sh[1] * ps, 2) if sh[1] else None,
            "torso_w": round(tw * ps, 2) if tw else None, "pelvis_c": scr(pc), "limb_w": round(limb * ps, 2) if limb else None,
            "bbox_h": round((bbox[3] - bbox[1] + 1) * ps, 1), "bbox_w": round((bbox[2] - bbox[0] + 1) * ps, 1), "body_c": scr(body_c), "n_px": len(cl)}
if __name__ == "__main__":
    img = Image.open(sys.argv[1]); an = json.load(open(sys.argv[2])) if len(sys.argv) > 2 else {}
    print(json.dumps(measure(img, an, mirror=bool(an.get("mirror"))), indent=1))
