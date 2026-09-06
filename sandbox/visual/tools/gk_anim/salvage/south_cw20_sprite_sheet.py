# SOUTH far-dive final adjustment: DIVE_SOUTH_CW15 @0.80 (approved) vs DIVE_SOUTH_CW20 @0.85 (final) — native, 4x NN, gameplay scale,
# with root / lead glove / other glove / head / pivot marked, plus the anchor numbers.   python3 south_cw20_sprite_sheet.py <out.png>
import sys, json, os
from PIL import Image, ImageDraw, ImageFont
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", ".."))
CTX = os.path.join(ROOT, "assets", "visual_v1", "goalkeeper", "contextual")
F = lambda s: ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", s); Fr = lambda s: ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", s)
S_LIVE = 0.4197                                      # sprite scale at the keeper in the gameplay camera
def load(stem):
    return Image.open(f"{CTX}/{stem}.png").convert("RGBA"), json.load(open(f"{CTX}/{stem}_anchors.json"))
def marked(im, an, k):
    big = im.resize((im.width * k, im.height * k), Image.NEAREST).convert("RGB"); d = ImageDraw.Draw(big)
    def dot(p, col, r=2):
        x, y = p[0] * k + k / 2, p[1] * k + k / 2; d.ellipse((x - r * 2, y - r * 2, x + r * 2, y + r * 2), outline=col, width=2)
    dot(an["root"], (255, 60, 60), 3); dot(an["lead_glove"], (80, 200, 255)); dot(an["gloves"][1], (255, 180, 60)); dot(an["head"], (255, 80, 255)); dot(an["pivot_in_canvas"], (255, 255, 0))
    r, g = an["root"], an["lead_glove"]; d.line((r[0] * k + k / 2, r[1] * k + k / 2, g[0] * k + k / 2, g[1] * k + k / 2), fill=(80, 200, 255), width=1)
    return big
A, aA = load("DIVE_SOUTH_CW15"); B, aB = load("DIVE_SOUTH_CW20")
W, H = 1500, 1000; sheet = Image.new("RGB", (W, H), (18, 19, 22)); d = ImageDraw.Draw(sheet)
d.text((12, 10), "SOUTH far dive — final visual adjustment: 15° CW @ 0.80 (approved)  →  20° CW @ 0.85 (final live)", font=F(22), fill=(255, 255, 255))
d.text((12, 40), "both derived by the builder from the same preserved source (sources/SOUTH_V6_CLEAN.png, mirrored) with the same rigid NN rotation about the hip pivot and the same hand-led anchoring: root = lead glove + canonical (−6.0, +54.5) px ÷ body scale", font=Fr(12), fill=(150, 155, 165))
d.text((12, 58), "markers: red = root, blue = lead (contact) glove, orange = other glove, magenta = head, yellow = hip pivot.  Because the root is tied to the lead glove, the lead glove lands on the same screen point in both; the body turns 5° further and grows 6.25 % about that glove.", font=Fr(12), fill=(150, 155, 165))
x = 12
for lab, im, an, col in (("15° CW · body scale 0.80 · DIVE_SOUTH_CW15", A, aA, (200, 200, 200)), ("20° CW · body scale 0.85 · DIVE_SOUTH_CW20", B, aB, (120, 255, 150))):
    d.text((x, 90), lab, font=F(16), fill=col)
    d.text((x, 112), f"canvas {an['canvas'][0]}×{an['canvas'][1]}  root {an['root']}  lead glove {an['lead_glove'][:2]}  other {an['gloves'][1][:2]}  head {an['head']}  pivot {an['pivot_in_canvas']}", font=Fr(11), fill=(190, 190, 200))
    d.text((x, 128), f"reach unit {an['reach_screen_unit']}  root−lead offset (sprite px) {an['root_offset_from_lead_glove_px']} = canonical {an['root_offset_base_px']} ÷ {an['pixel_scale']}", font=Fr(11), fill=(190, 190, 200))
    nat = im.convert("RGB"); sheet.paste(nat, (x, 150)); d.text((x, 150 + nat.height + 4), "native", font=Fr(10), fill=(150, 155, 165))
    m4 = marked(im, an, 4); sheet.paste(m4, (x + 130, 150)); d.text((x + 130, 150 + m4.height + 4), "4× nearest-neighbour + anchors", font=Fr(10), fill=(150, 155, 165))
    ps = S_LIVE * an["pixel_scale"]; gp = im.resize((max(1, round(im.width * ps)), max(1, round(im.height * ps))), Image.NEAREST).convert("RGB")
    sheet.paste(gp, (x + 130 + m4.width + 30, 150)); d.text((x + 130 + m4.width + 30, 150 + gp.height + 4), f"gameplay scale ({gp.width}×{gp.height} px on screen)", font=Fr(10), fill=(150, 155, 165))
    g2 = gp.resize((gp.width * 2, gp.height * 2), Image.NEAREST); sheet.paste(g2, (x + 130 + m4.width + 30, 150 + gp.height + 24)); d.text((x + 130 + m4.width + 30, 150 + gp.height + 24 + g2.height + 4), "2× of the gameplay raster", font=Fr(10), fill=(150, 155, 165))
    x += 740
# overlay: both sprites placed with their lead gloves coincident, at gameplay scale ×4 for visibility
ox, oy = 12, 720; d.text((ox, oy), "overlay with the lead gloves coincident (4× of the gameplay raster): grey = 15°/0.80, colour = 20°/0.85", font=F(13), fill=(255, 255, 255))
def gp_img(im, an):
    ps = S_LIVE * an["pixel_scale"]; g = im.resize((max(1, round(im.width * ps)), max(1, round(im.height * ps))), Image.NEAREST); return g, (an["lead_glove"][0] * ps, an["lead_glove"][1] * ps)
gA, lA = gp_img(A, aA); gB, lB = gp_img(B, aB); K = 4
cv = Image.new("RGBA", (120, 90), (28, 30, 34, 255)); cx, cy = 60, 55
ga = gA.copy(); px = ga.load()
for yy in range(ga.height):
    for xx in range(ga.width):
        r, g, b, a = px[xx, yy]
        if a: v = int(0.3 * r + 0.59 * g + 0.11 * b); px[xx, yy] = (v, v, v, 140)
cv.alpha_composite(ga, (int(round(cx - lA[0])), int(round(cy - lA[1])))); cv.alpha_composite(gB, (int(round(cx - lB[0])), int(round(cy - lB[1]))))
big = cv.resize((cv.width * K, cv.height * K), Image.NEAREST).convert("RGB"); dd = ImageDraw.Draw(big); dd.ellipse((cx * K - 6, cy * K - 6, cx * K + 6, cy * K + 6), outline=(80, 200, 255), width=2)
sheet.paste(big, (ox, oy + 22))
sheet.save(sys.argv[1]); print("sheet", sheet.size)
