# REVIEW SHEET for the V6 manual cleanup: native | 4x | actual gameplay scale | changed-pixel overlay.
#   python3 v6_cleanup_sheet.py <orig.png> <clean.png> <outdir> <gameplay_clip_dir> <geometry_check.json>
import sys, json
from PIL import Image, ImageDraw, ImageFont
ORIG, CLEAN, OUT, GDIR, GEO = sys.argv[1:6]
F  = lambda s: ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", s)
Fr = lambda s: ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", s)
o = Image.open(ORIG).convert("RGBA"); c = Image.open(CLEAN).convert("RGBA")
geo = json.load(open(GEO)); meta = json.load(open(f"{GDIR}/gameplay_clip.json"))
clip = Image.open(f"{GDIR}/gameplay_set_clip.png").convert("RGB")
bb = o.getbbox(); PAD = 4
crop = (bb[0]-PAD, bb[1]-PAD, bb[2]+PAD, bb[3]+PAD)
oc, cc = o.crop(crop), c.crop(crop)
PLATE = (238, 238, 240)
def plate(img, S):
    up = img.resize((img.width*S, img.height*S), Image.NEAREST)
    bg = Image.new("RGB", up.size, PLATE); bg.paste(up, (0, 0), up); return bg

# ---- changed-pixel overlay: original dimmed to grey, changed pixels in magenta; and the cleanup with changed pixels ringed
changed = set(map(tuple, geo["changed_pixels"]))
dim = Image.new("RGBA", o.size, (0, 0, 0, 0)); dp = dim.load(); op = o.load()
for y in range(o.height):
    for x in range(o.width):
        r, g, b, a = op[x, y]
        if a: 
            l = int(0.3*r + 0.59*g + 0.11*b); l = 120 + l//3
            dp[x, y] = (255, 0, 200, 255) if (x, y) in changed else (l, l, l, 255)
mask = Image.new("RGBA", o.size, (0, 0, 0, 0)); mp = mask.load()
for (x, y) in changed: mp[x, y] = (255, 0, 200, 255)
S4 = 4
ov = plate(dim.crop(crop), S4)
cl4 = plate(cc, S4); d = ImageDraw.Draw(cl4)
for (x, y) in changed:
    X, Y = (x-crop[0])*S4, (y-crop[1])*S4
    d.rectangle([X, Y, X+S4-1, Y+S4-1], outline=(255, 0, 200))
mask.save(f"{OUT}/V6_CLEAN_diffmask.png")

# ---- gameplay scale: the renderer draws round(W*s) with nearest-neighbour; s = sprite scale x body scale
s = meta["spriteScale"]; body = meta["northDivePixelScale"] or 0.72
def game(img, bodyscale):
    dw = round(img.width * s * bodyscale); return img.resize((dw, dw), Image.NEAREST)
go, gc = game(o, body), game(c, body)
gp = clip.copy(); rx, ry = meta["sp"][0]-meta["clip"]["x"], meta["sp"][1]-meta["clip"]["y"]
def paste_at(dst, spr, cx, cy):
    b = spr.getbbox(); w, h = b[2]-b[0], b[3]-b[1]
    dst.paste(spr.crop(b), (int(cx - w/2), int(cy - h/2)), spr.crop(b))
paste_at(gp, go, rx - 150, ry - 24); paste_at(gp, gc, rx - 70, ry - 24)
gd = ImageDraw.Draw(gp)
for X, lab in ((rx-150, "V6"), (rx-70, "V6 CLEANUP"), (rx, "SET (live)")):
    gd.text((X-22, ry+16), lab, font=F(11), fill=(255, 255, 255))
Z = 4
gz = Image.new("RGB", ((go.getbbox()[2]-go.getbbox()[0])*Z*2 + 60, (go.getbbox()[3]-go.getbbox()[1])*Z + 20), PLATE)
for i, im in enumerate((go, gc)):
    b = im.getbbox(); up = im.crop(b).resize(((b[2]-b[0])*Z, (b[3]-b[1])*Z), Image.NEAREST)
    gz.paste(up, (10 + i*((b[2]-b[0])*Z + 40), 10), up)

# ---- assemble
W = 1560; x0 = 30
rows = []
title = "GK SOUTH DIVE V6 — MANUAL PIXEL CLEANUP (readability only, geometry locked)"
sub1 = f"{geo['pixels_changed']} pixels recoloured, 0 alpha changes · silhouette byte-identical · body axis {geo['original']['body_axis_deg']}° → {geo['cleanup']['body_axis_deg']}° · footprint {tuple(geo['original']['footprint'])} → {tuple(geo['cleanup']['footprint'])}"
sub2 = f"head centre Δ{tuple(geo['delta']['head_center'])} · torso centre Δ{tuple(geo['delta']['torso_center'])} · hip centre Δ{tuple(geo['delta']['hip_center'])} · foot endpoints Δ{tuple(geo['delta']['foot_top'])}/{tuple(geo['delta']['foot_right'])} px"
H_HDR = 118
panels = []
n1 = plate(oc, 1); n2 = plate(cc, 1)
panels.append(("NATIVE PIXELS (1x)", [("V6 ORIGINAL", n1), ("V6 MANUAL CLEANUP", n2)], ""))
panels.append(("4x NEAREST-NEIGHBOUR", [("V6 ORIGINAL", plate(oc, 4)), ("V6 MANUAL CLEANUP", plate(cc, 4))], ""))
panels.append((f"ACTUAL GAMEPLAY SCALE — live SET keeper + both versions drawn as the renderer would (sprite scale {s:.4f} × body scale {body}, nearest-neighbour)",
               [("gameplay camera, real pitch", gp), (f"the same on-screen pixels at {Z}x  (original | cleanup)", gz)],
               "body scale 0.72 is the north dive's calibrated value, used here only so the size is representative — V6 has not been scale-calibrated"))
panels.append(("CHANGED PIXELS", [("changed pixels in magenta over the dimmed original (4x)", ov), ("cleanup with every changed pixel ringed (4x)", cl4)], ""))
H = H_HDR + sum(max(p.height for _, p in ps) + 92 + (22 if note else 0) for _, ps, note in panels) + 4
sheet = Image.new("RGB", (W, H), (18, 19, 22)); d = ImageDraw.Draw(sheet)
d.text((x0, 22), title, font=F(30), fill=(255, 255, 255))
d.text((x0, 62), sub1, font=Fr(17), fill=(150, 235, 150))
d.text((x0, 86), sub2, font=Fr(17), fill=(150, 155, 165))
y = H_HDR
for sec, ps, note in panels:
    d.text((x0, y), sec, font=F(20), fill=(235, 225, 120)); y += 30
    if note: d.text((x0, y), note, font=Fr(15), fill=(200, 150, 140)); y += 22
    x = x0; rowh = max(p.height for _, p in ps)
    for lab, p in ps:
        d.rectangle([x-4, y-4, x+p.width+4, y+p.height+4], fill=(30, 32, 37), outline=(64, 68, 76))
        sheet.paste(p, (x, y)); d.text((x, y+p.height+8), lab, font=Fr(16), fill=(160, 166, 178)); x += p.width + 40
    y += rowh + 40
sheet.save(f"{OUT}/V6_CLEANUP_REVIEW_SHEET.png"); print("sheet", sheet.size)
# standalone plates
plate(cc, 4).save(f"{OUT}/V6_CLEAN_x4.png"); plate(oc, 4).save(f"{OUT}/V6_ORIGINAL_x4.png"); ov.save(f"{OUT}/V6_CLEAN_diff_overlay_x4.png"); gp.save(f"{OUT}/V6_gameplay_scale.png")
