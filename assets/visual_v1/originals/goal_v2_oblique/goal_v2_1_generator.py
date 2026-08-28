#!/usr/bin/env python3
"""Goal V2.1: deterministic refinement of the accepted V2 sprite.

Keeps V2's measured frame geometry (corners read off the accepted art),
omits the external pole entirely, and rebuilds every net panel as a clean
homography-mapped grid: regular in goal-space, perspective-compressed on
screen, with subtle sag that is zero at every attachment edge.
0 PixelLab generations."""
import math
from PIL import Image, ImageDraw

W, H = 312, 332

# ---- measured V2 frame corners (accepted geometry; do not change) ----
RTN = (42, 40)     # rear top member, near end
RTF = (168, 40)    # rear top member, far end
RBN = (30, 182)    # rear ground rail, near end
RBF = (160, 181)   # rear ground rail, far end
CTN = (105, 183)   # crossbar near end / near post top
CTF = (232, 186)   # crossbar far end  / far post top
GBN = (95, 325)    # near post base
GBF = (222, 320)   # far post base

FRAME = (246, 246, 249, 255)
FRAME_EDGE = (150, 150, 158, 255)
REAR = (204, 204, 210, 255)
KNOB = (253, 253, 255, 255)


def homography(p0, p1, p2, p3):
    """Projective map of the unit square: (0,0)->p0 (1,0)->p1 (1,1)->p2 (0,1)->p3."""
    x0, y0 = p0; x1, y1 = p1; x2, y2 = p2; x3, y3 = p3
    dx1, dy1 = x1 - x2, y1 - y2
    dx2, dy2 = x3 - x2, y3 - y2
    sx = x0 - x1 + x2 - x3
    sy = y0 - y1 + y2 - y3
    den = dx1 * dy2 - dx2 * dy1
    g = (sx * dy2 - sy * dx2) / den
    h = (dx1 * sy - dy1 * sx) / den
    a, b, c = x1 - x0 + g * x1, x3 - x0 + h * x3, x0
    d, e, f = y1 - y0 + g * y1, y3 - y0 + h * y3, y0
    return lambda u, v: ((a * u + b * v + c) / (g * u + h * v + 1),
                         (d * u + e * v + f) / (g * u + h * v + 1))


def bump(u, v):
    """0 at all panel edges, 1 mid-panel — sag never moves attachments."""
    return math.sin(math.pi * u) * math.sin(math.pi * v)


def mesh_panel(corners, nu, nv, colour, sag=(0.0, 0.0), samples=26):
    """One net panel: nu x nv cells, continuous shared cords, subtle sag."""
    hmap = homography(*corners)
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    sx, sy = sag

    def pt(u, v):
        x, y = hmap(u, v)
        b = bump(u, v)
        return (x + sx * b, y + sy * b)

    for i in range(nu + 1):                      # cords along v
        u = i / nu
        d.line([pt(u, k / samples) for k in range(samples + 1)], fill=colour, width=1)
    for j in range(nv + 1):                      # cords along u
        v = j / nv
        d.line([pt(k / samples, v) for k in range(samples + 1)], fill=colour, width=1)
    return layer


def stroke(img_draw, p, q, colour, width, bow=0.0, samples=24):
    """Straight or gently bowed structural member (bow ⊥ to the segment)."""
    px, py = p; qx, qy = q
    L = math.hypot(qx - px, qy - py) or 1
    nx, ny = (qy - py) / L, -(qx - px) / L
    pts = []
    for k in range(samples + 1):
        t = k / samples
        s = math.sin(math.pi * t) * bow
        pts.append((px + (qx - px) * t + nx * s, py + (qy - py) * t + ny * s))
    img_draw.line(pts, fill=colour, width=width, joint="curve")


def knob(d, p, r=3):
    d.ellipse([p[0] - r, p[1] - r, p[0] + r, p[1] + r], fill=KNOB)


out = Image.new("RGBA", (W, H), (0, 0, 0, 0))

# ---- net panels, far to near ----
# back net: hangs from the rear top member to the rear ground rail
# (coarser + dimmer than the roof so the see-through overlap reads as a
# distant net instead of moire)
out = Image.alpha_composite(out, mesh_panel(
    (RTN, RTF, RBF, RBN), 14, 9, (210, 210, 216, 95), sag=(0.0, 2.5)))
# mouth panel: mesh seen between the posts below the crossbar (as in V2)
out = Image.alpha_composite(out, mesh_panel(
    (CTN, CTF, GBF, GBN), 20, 12, (226, 226, 232, 170), sag=(-2.0, 2.0)))
# roof net: rear top member down to the crossbar (nearest surface, brightest).
# Its far edge follows the outward bow of the far depth rail.
def roof_panel():
    hmap = homography(RTN, RTF, CTF, CTN)
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    def pt(u, v):
        x, y = hmap(u, v)
        x += 6.0 * math.sin(math.pi * v) * u * u      # follow the bowed far rail
        y += 3.5 * bump(u, v)                          # subtle roof sag
        return (x, y)
    nu, nv, samples = 20, 8, 26
    for i in range(nu + 1):
        u = i / nu
        d.line([pt(u, k / samples) for k in range(samples + 1)],
               fill=(238, 238, 243, 150), width=1)
    for j in range(nv + 1):
        v = j / nv
        d.line([pt(k / samples, v) for k in range(samples + 1)],
               fill=(238, 238, 243, 150), width=1)
    return layer
out = Image.alpha_composite(out, roof_panel())

# ---- structural frame over the nets ----
frame = Image.new("RGBA", (W, H), (0, 0, 0, 0))
d = ImageDraw.Draw(frame)
stroke(d, RTF, CTF, REAR, 3, bow=6.0)     # far upper depth rail (outward sag as in V2)
stroke(d, RTN, CTN, REAR, 3, bow=-2.0)    # near upper depth rail
stroke(d, RTN, RBN, REAR, 3)              # rear-near upright
stroke(d, RTF, RBF, (196, 196, 203, 190), 2)  # rear-far upright (seen through mesh)
stroke(d, RBN, RBF, REAR, 3)              # rear ground rail
stroke(d, GBN, GBF, (200, 200, 207, 200), 2)  # ground line between post bases
# bright front frame with a 1px darker edge pass for pixel-art depth
for p, q, w in [(RTN, RTF, 5), (CTN, CTF, 5), (CTN, GBN, 5), (CTF, GBF, 5)]:
    stroke(d, (p[0] + 1, p[1] + 2), (q[0] + 1, q[1] + 2), FRAME_EDGE, w)
    stroke(d, p, q, FRAME, w)
for p in [RTN, RTF, CTN, CTF, GBF, RBN, RBF]:
    knob(d, p)
knob(d, GBN)
out = Image.alpha_composite(out, frame)

out.save("OUT_PATH")
print("V2.1 rendered", out.size)
