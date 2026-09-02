#!/usr/bin/env python3
"""
Validate returned directional kick art against the import contract.

Usage:
    python3 validate_returned_art.py <returned_art_dir>
    python3 validate_returned_art.py <returned_art_dir> --json report.json

Checks per file:
  - dimensions exactly 140x140
  - RGBA with real transparency (a transparent background)
  - filename matches <set>_<D>_<f>.png with a valid set/direction/frame
  - frame index within the technique's east frame count
  - foot/root registration: opaque content reaches the ground band (~row 117) and is
    horizontally centred near x=70 (loose tolerance — flags gross mis-registration only)
  - "no ball painted in": flags a white+black checkered blob (ball-like) inside the sprite
  - disconnected alpha islands (floating pixels) via 4-connected flood fill

Reports per technique/direction: which frames are present, which are missing, and whether the
CONTACT frame is present. Never installs anything. Exit code 0 = all present files pass.
"""
import sys, os, json, re
try:
    from PIL import Image
    import numpy as np
except ImportError:
    print("Requires Pillow + numpy: pip install pillow numpy"); sys.exit(2)

SETS = {  # set id -> (technique, frame_count, contact_frame)
    "pw_R": ("POWER_R", 12, 7), "in4_R": ("INSIDE_R", 12, 6), "la_R": ("LACES_R", 10, 7),
    "ou_R": ("OUTSIDE_R", 8, 6), "ch_R": ("CHIP_R", 8, 5),
}
DIRS = {"SE", "S", "SW", "NW", "N", "NE"}
CANVAS = (140, 140); CENTER_X = 70; GROUND = 117
FNAME = re.compile(r"^(pw_R|in4_R|la_R|ou_R|ch_R)_(SE|S|SW|NW|N|NE)_(\d+)\.png$")


def islands(mask):
    """Count 4-connected opaque components (>1px). Returns (count, largest_frac)."""
    h, w = mask.shape; seen = np.zeros_like(mask, bool); comps = []
    for y in range(h):
        for x in range(w):
            if mask[y, x] and not seen[y, x]:
                stack = [(y, x)]; seen[y, x] = True; n = 0
                while stack:
                    cy, cx = stack.pop(); n += 1
                    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        ny, nx = cy + dy, cx + dx
                        if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not seen[ny, nx]:
                            seen[ny, nx] = True; stack.append((ny, nx))
                comps.append(n)
    if not comps: return 0, 0.0
    tot = sum(comps)
    return len(comps), max(comps) / tot


def ball_blob(a):
    """Heuristic for a ball accidentally painted in: a SMALL, COMPACT, near-circular white cluster
    (area ~8-70px, bbox roughly square 6-16px, high fill ratio) that also contains near-black
    pixels (the ball's checker/shadow). The white SOCKS are large, elongated, body-connected
    clusters and are excluded by the size/shape gate."""
    rgb = a[:, :, :3]; al = a[:, :, 3] > 40
    white = al & np.all(rgb > 205, axis=2)
    black = al & np.all(rgb < 45, axis=2)
    if white.sum() < 6: return False
    # connected white components
    h, w = white.shape; seen = np.zeros_like(white, bool)
    for sy in range(h):
        for sx in range(w):
            if not white[sy, sx] or seen[sy, sx]:
                continue
            stack = [(sy, sx)]; seen[sy, sx] = True; pts = []
            while stack:
                cy, cx = stack.pop(); pts.append((cy, cx))
                for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (1, -1), (-1, 1), (-1, -1)):
                    ny, nx = cy + dy, cx + dx
                    if 0 <= ny < h and 0 <= nx < w and white[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True; stack.append((ny, nx))
            n = len(pts)
            if not (8 <= n <= 110):
                continue
            yy = [p[0] for p in pts]; xx = [p[1] for p in pts]
            bh, bw = max(yy) - min(yy) + 1, max(xx) - min(xx) + 1
            if not (5 <= bh <= 18 and 5 <= bw <= 18):
                continue
            if abs(bh - bw) > 5:            # not roughly square -> sock/limb, skip
                continue
            if n / float(bh * bw) < 0.5:    # not a filled disc/ring
                continue
            y0, y1, x0, x1 = max(0, min(yy) - 2), min(h, max(yy) + 3), max(0, min(xx) - 2), min(w, max(xx) + 3)
            if black[y0:y1, x0:x1].any():   # circular white disc with black inside == ball
                return True
    # second signal: a small near-black cluster ENCLOSED by white on >=3 sides (ball checker),
    # in the lower half of the sprite — catches a ball even when its white merges with the sock.
    seen2 = np.zeros_like(black, bool)
    for sy in range(h // 2, h):
        for sx in range(w):
            if not black[sy, sx] or seen2[sy, sx]:
                continue
            stack = [(sy, sx)]; seen2[sy, sx] = True; pts = []
            while stack:
                cy, cx = stack.pop(); pts.append((cy, cx))
                for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    ny, nx = cy + dy, cx + dx
                    if 0 <= ny < h and 0 <= nx < w and black[ny, nx] and not seen2[ny, nx]:
                        seen2[ny, nx] = True; stack.append((ny, nx))
            if not (2 <= len(pts) <= 22):
                continue
            yy = [p[0] for p in pts]; xx = [p[1] for p in pts]
            top = white[max(0, min(yy) - 2):min(yy), min(xx):max(xx) + 1]
            bot = white[max(yy) + 1:max(yy) + 3, min(xx):max(xx) + 1]
            lft = white[min(yy):max(yy) + 1, max(0, min(xx) - 2):min(xx)]
            rgt = white[min(yy):max(yy) + 1, max(xx) + 1:max(xx) + 3]
            sides = sum(1 for s in (top, bot, lft, rgt) if s.size and s.any())
            if sides >= 3:                  # black island ringed by white == ball checker
                return True
    return False


def check(path):
    errs, warns = [], []
    m = FNAME.match(os.path.basename(path))
    if not m:
        return {"file": path, "errors": ["filename does not match <set>_<D>_<f>.png"], "warnings": []}
    setid, d, f = m.group(1), m.group(2), int(m.group(3))
    tech, nframes, contact = SETS[setid]
    if f >= nframes: errs.append(f"frame {f} exceeds {tech} count {nframes} (0..{nframes-1})")
    try:
        im = Image.open(path).convert("RGBA")
    except Exception as e:
        return {"file": path, "errors": [f"cannot open: {e}"], "warnings": []}
    if im.size != CANVAS: errs.append(f"size {im.size} != 140x140")
    a = np.array(im); al = a[:, :, 3] > 40
    if al.all(): errs.append("no transparency (background is opaque)")
    if al.sum() == 0: errs.append("empty (fully transparent)")
    else:
        ys, xs = np.where(al)
        if ys.max() < GROUND - 8: warns.append(f"feet stop at row {ys.max()} — not reaching ground band ~{GROUND}")
        cx = (xs.min() + xs.max()) / 2
        if abs(cx - CENTER_X) > 14: warns.append(f"horizontal centre {cx:.0f} far from {CENTER_X}")
        nc, largest = islands(al)
        if nc > 1 and largest < 0.97: warns.append(f"{nc} alpha islands (largest {largest:.0%}) — possible floating pixels")
        if ball_blob(a): errs.append("possible BALL painted into sprite (white+black blob) — ball must be composited separately")
    return {"file": path, "technique": tech, "dir": d, "frame": f, "contact_frame": contact,
            "is_contact": f == contact, "errors": errs, "warnings": warns}


def main():
    if len(sys.argv) < 2:
        print(__doc__); sys.exit(2)
    root = sys.argv[1]
    jsonout = None
    if "--json" in sys.argv: jsonout = sys.argv[sys.argv.index("--json") + 1]
    files = []
    for dp, _, fn in os.walk(root):
        for f in fn:
            if f.lower().endswith(".png"): files.append(os.path.join(dp, f))
    results = [check(p) for p in sorted(files)]
    # coverage matrix
    present = {}
    for r in results:
        if "technique" in r and not r["errors"]:
            present.setdefault((r["technique"], r["dir"]), set()).add(r["frame"])
    print(f"Scanned {len(files)} PNG(s) under {root}\n")
    nerr = 0
    for r in results:
        tag = "OK " if not r["errors"] else "ERR"
        if r["errors"]: nerr += 1
        extra = ""
        if r.get("is_contact"): extra = "  [CONTACT]"
        print(f"  [{tag}] {os.path.relpath(r['file'], root)}{extra}")
        for e in r["errors"]: print(f"         ERROR:   {e}")
        for w in r["warnings"]: print(f"         warning: {w}")
    print("\nCoverage (present frames / expected, CONTACT flagged):")
    for setid, (tech, nf, c) in SETS.items():
        for d in sorted(DIRS):
            fr = present.get((tech, d), set())
            if not fr: continue
            miss = [i for i in range(nf) if i not in fr]
            ctag = "CONTACT✓" if c in fr else "CONTACT✗ MISSING"
            print(f"  {tech:9} {d:2}: {len(fr)}/{nf}  {ctag}" + (f"  missing {miss}" if miss else "  COMPLETE"))
    if jsonout:
        json.dump({"results": results,
                   "coverage": {f"{t}_{d}": sorted(v) for (t, d), v in present.items()}},
                  open(jsonout, "w"), indent=1)
        print(f"\nwrote {jsonout}")
    print(f"\n{'PASS' if nerr == 0 else 'FAIL'} — {nerr} file(s) with errors")
    sys.exit(1 if nerr else 0)


if __name__ == "__main__":
    main()
