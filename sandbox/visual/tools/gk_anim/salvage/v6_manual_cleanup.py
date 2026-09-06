# MANUAL PIXEL CLEANUP of RAW_SOUTH_V6 — readability only, geometry locked.
# Every edit is an explicit RGB change to an ALREADY-OPAQUE pixel: the alpha channel is never touched, so the
# silhouette, footprint, body axis and foot endpoints are unchanged by construction (asserted at the end).
#   python3 v6_manual_cleanup.py <src.png> <out.png>
import sys
from PIL import Image

SRC = sys.argv[1] if len(sys.argv) > 1 else "review_artifacts/gk_dive_south_v6/RAW_SOUTH_V6.png"
OUT = sys.argv[2] if len(sys.argv) > 2 else "review_artifacts/gk_dive_south_v7/V6_CLEAN.png"

# palette — all taken from V6 itself except FAR_GREEN, one intermediate shade between #268c27 and #0f6b1d
BLACK     = (0, 0, 0)
SEAM_GREEN = (22, 70, 39)      # existing near-black green, used for the seam between the two arms
FAR_GREEN  = (15, 107, 29)     # existing dark green: the far arm, one tone behind the near one
EDGE_GREEN = (37, 148, 35)     # existing mid green: the far arm's lit upper edge
LIT_GREEN  = (134, 228, 24)    # existing lit green: the near arm
SKIN      = (196, 156, 124)
SKIN_SH   = (146, 113, 89)
SKIN_D    = (126, 99, 70)
IRIS      = (98, 78, 55)
GREY_1    = (220, 211, 202)    # glove half-tone
GREY_2    = (201, 185, 159)    # glove shadow

EDITS = [
 # ---------------------------------------------------------------- ARMS
 # V6's own black seam already bounds the near arm against the torso and ends at (79,104); below that the two arms
 # are one merged green tube. Continue that same boundary down the tube. The near arm leaves the tube at the wrist
 # skin (71-74,108-111) into the near glove, so everything below row 111 is the far arm, carried one tone back and
 # on into the lower glove.
 ("arm seam", SEAM_GREEN, [(79,107),(78,108),(77,109),(76,110),(75,111)]),
 ("near arm, lit", LIT_GREEN, [(77,107),(78,107),(76,108),(77,108),(75,109),(76,109),
                               (74,110),(75,110),(73,111),(74,111)]),
 ("far arm, behind", FAR_GREEN, [(80,107),(81,107),
                                 (79,108),(80,108),
                                 (78,109),(79,109),(80,109),
                                 (77,110),(78,110),(79,110),
                                 (76,111),(77,111),(78,111),
                                 (74,112),(75,112),(76,112),(77,112),
                                 (74,113),(75,113),(76,113),
                                 (74,114),(75,114),
                                 (73,115),(74,115),
                                 (73,116),
                                 (68,117),(69,117),(70,117),(71,117),
                                 (68,118),(69,118),(70,118),
                                 (68,119)]),
 ("far arm, lit edge", EDGE_GREEN, [(72,112),(73,112),(72,113),(73,113),(72,114),(73,114),
                                    (72,115),(72,116),(67,117),(67,118),(67,119)]),

 # ---------------------------------------------------------------- GLOVES
 # V6 already breaks the two gloves apart at (52-54,114) and (55-56,115) and outlines the far glove's wrist at
 # (63,117). The span between them is missing, which is what fuses the two white masses into one. Close it, and
 # put a single half-tone row under it so the far glove sits behind the near one.
 ("glove boundary", BLACK, [(57,116),(58,116),(59,117),(60,117),(61,117),(62,117)]),
 ("far glove, behind", GREY_1, [(57,117),(58,117),(59,118),(60,118),(61,118),(62,118)]),
 # ---------------------------------------------------------------- FACE
 # V6's eye is a 3-row black smear. Collapse it to the GK_BASE_V1 language: 1px brow, 1px iris + 1px white,
 # cheek shadow under it. Head footprint, hairline and chin are untouched.
 ("face: stray dot above brow", SKIN,    [(72,89)]),
 ("face: eye socket",           SKIN_D,  [(70,91)]),
 ("face: iris",                 IRIS,    [(71,91)]),
 ("face: skin right of eye",    SKIN,    [(73,91)]),
 ("face: cheek shadow",         SKIN_SH, [(70,92),(71,92)]),
 ("face: cheek",                SKIN,    [(72,92)]),
 ("face: nose",                 SKIN_D,  [(72,94)]),
 ("face: mouth",                SKIN_SH, [(73,96)]),
]

im = Image.open(SRC).convert("RGBA")
before = im.copy()
px = im.load()
n = 0
for name, colour, pts in EDITS:
    for (x, y) in pts:
        if px[x, y][3] == 0:
            raise SystemExit(f"REFUSED: {name} would paint the transparent pixel ({x},{y}) — that changes the silhouette")
        if px[x, y][:3] != colour:
            n += 1
        px[x, y] = colour + (px[x, y][3],)

# hard guarantee: alpha identical everywhere
a0, a1 = before.getchannel("A").tobytes(), im.getchannel("A").tobytes()
assert a0 == a1, "alpha channel changed — silhouette not preserved"
im.save(OUT)
changed = sum(1 for p, q in zip(before.convert("RGBA").getdata(), im.getdata()) if p != q)
print(f"{OUT}: {n} pixel writes, {changed} pixels differ from the source, alpha identical")
