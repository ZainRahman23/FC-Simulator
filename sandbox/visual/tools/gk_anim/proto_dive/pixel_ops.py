# Pixel-art post-processing for baked component frames (presentation tooling only):
#   stylize(img, k, palette)  — style bridge base → Pro: palette blend, interior dark-line removal, double-outline thinning (strength k 0..1)
#   outline(img, k, dark)     — soft 1-px silhouette outline added to Pro-part frames (k = outline darkness 0..1)
#   cleanup(img)              — manual-cleanup pass: isolated specks, 1-px holes, single-pixel stair-step corners on the silhouette, interior colour specks
# Everything is nearest-neighbour / integer; no filtering, no alpha blending except the explicit palette mix.
from PIL import Image
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "rig"))
from gk_rig import cls_of
N4 = ((1, 0), (-1, 0), (0, 1), (0, -1)); N8 = N4 + ((1, 1), (1, -1), (-1, 1), (-1, -1))
BASE_TO_PRO = {(140, 251, 12): (134, 228, 24), (112, 216, 21): (133, 242, 2), (86, 186, 26): (38, 140, 39), (36, 136, 52): (37, 148, 35), (44, 165, 62): (15, 107, 29),
               (39, 36, 37): (27, 26, 27), (27, 26, 27): (27, 26, 27), (6, 8, 5): (0, 0, 0), (2, 2, 2): (0, 0, 0), (0, 0, 2): (0, 0, 0),
               (172, 110, 77): (146, 113, 89), (214, 142, 97): (196, 156, 124), (143, 88, 63): (126, 99, 70), (222, 155, 111): (196, 156, 124), (175, 171, 168): (186, 165, 126),
               (241, 237, 235): (255, 255, 255), (211, 216, 199): (220, 211, 202), (100, 72, 63): (98, 78, 55), (141, 143, 144): (166, 139, 103), (107, 107, 109): (126, 99, 70)}
def _mix(a, b, k): return tuple(int(round(a[i] + (b[i] - a[i]) * k)) for i in range(3))
def _hash(x, y): return ((x * 73856093) ^ (y * 19349663)) % 1000 / 1000.0
def stylize(img, k, palette=BASE_TO_PRO):
    im = img.copy(); px = im.load(); W, H = im.size
    src = img.load()
    def opaque(x, y): return 0 <= x < W and 0 <= y < H and src[x, y][3] > 0
    def dark(x, y): return opaque(x, y) and cls_of(src[x, y]) == "K"
    # 1) interior dark lines between two fills → the fill (gated by k), and double silhouette outlines → single
    for y in range(H):
        for x in range(W):
            p = src[x, y]
            if p[3] == 0 or cls_of(p) != "K": continue
            fills = [src[x + dx, y + dy] for dx, dy in N4 if opaque(x + dx, y + dy) and cls_of(src[x + dx, y + dy]) not in ("K",)]
            trans = sum(1 for dx, dy in N4 if not opaque(x + dx, y + dy))
            if trans == 0 and len(fills) >= 2 and _hash(x, y) < k:          # interior line (e.g. sleeve/torso, shorts/thigh seams)
                fills.sort(key=lambda c: (c[0] + c[1] + c[2])); px[x, y] = fills[len(fills) // 2]
            elif trans == 0 and len(fills) == 1 and _hash(x, y) < k * 0.6:   # inner edge of a 2-px outline → the fill beside it
                px[x, y] = fills[0]
    # 2) palette blend toward the Pro palette
    for y in range(H):
        for x in range(W):
            p = px[x, y]
            if p[3] == 0: continue
            t = palette.get(p[:3])
            if t: px[x, y] = _mix(p[:3], t, k) + (255,)
    return im
def outline(img, k, dark=(27, 26, 27)):
    """add a 1-px outline around the silhouette, darkness k (1 = the base art's dark outline, 0 = none); for Pro-part bridge frames"""
    if k <= 0: return img.copy()
    im = img.copy(); px = im.load(); src = img.load(); W, H = im.size
    for y in range(H):
        for x in range(W):
            if src[x, y][3]: continue
            nb = [src[x + dx, y + dy] for dx, dy in N4 if 0 <= x + dx < W and 0 <= y + dy < H and src[x + dx, y + dy][3]]
            if nb:
                fill = max(nb, key=lambda c: c[0] + c[1] + c[2]); px[x, y] = _mix(fill[:3], dark, min(1, 0.55 + 0.45 * k)) + (255,) if _hash(x, y) < k else (0, 0, 0, 0)
    return im
def cleanup(img, passes=2):
    im = img.copy()
    for _ in range(passes):
        src = im.load(); W, H = im.size; out = im.copy(); px = out.load()
        def op(x, y): return 0 <= x < W and 0 <= y < H and src[x, y][3] > 0
        for y in range(H):
            for x in range(W):
                p = src[x, y]; n4 = sum(1 for dx, dy in N4 if op(x + dx, y + dy)); n8 = sum(1 for dx, dy in N8 if op(x + dx, y + dy))
                if p[3]:
                    if n8 <= 1: px[x, y] = (0, 0, 0, 0); continue                        # isolated speck
                    if n4 == 1 and n8 <= 2: px[x, y] = (0, 0, 0, 0); continue            # single-pixel stair-step spur on the silhouette
                    if n4 == 4:                                                          # interior colour speck: all 4 neighbours share one colour ≠ mine
                        cols = [src[x + dx, y + dy][:3] for dx, dy in N4]
                        if cols.count(cols[0]) == 4 and cols[0] != p[:3] and cls_of(p) == cls_of(src[x + 1, y]): px[x, y] = cols[0] + (255,)
                else:
                    if n4 >= 3:                                                          # 1-px hole → majority neighbour colour (prefer fills over outline)
                        cols = [src[x + dx, y + dy] for dx, dy in N4 if op(x + dx, y + dy)]
                        fills = [c for c in cols if cls_of(c) != "K"] or cols
                        px[x, y] = max(set(c[:3] for c in fills), key=lambda c: sum(1 for q in fills if q[:3] == c)) + (255,)
        im = out
    return im
