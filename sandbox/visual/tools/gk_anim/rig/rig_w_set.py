# W-FACING SET RIG — GK_BASE_V1 set/west.png cut into articulated parts (perspective-specific: valid for the WEST facing only).
# Polygons are in the sprite's own pixel coordinates (128x128 canvas, content x 45-82, y 14-116). Nothing is resampled.
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from gk_rig import Rig, Part, Source
from PIL import Image

SET_W = "assets/visual_v1/originals/character_f4838361/set/west.png"

def build(scratch_dir="."):
    src = Source(SET_W, label="SET/west")
    # underlay patches: flat kit colour behind parts that are drawn over the body (revealed when those parts move)
    under = Image.new("RGBA", src.im.size, (0, 0, 0, 0)); up = under.load(); sp = src.px
    for y in range(43, 53):                       # chest behind the near upper arm (the shoulder cap above row 43 stays with the torso)
        first = None
        for x in range(57, 70):
            if sp[x, y][3]:
                up[x, y] = (134, 228, 24, 255)
                if first is None: first = x
        if first is not None: up[first, y] = (27, 26, 27, 255)      # the chest keeps a dark contour where the sleeve used to be
    for y in range(67, 81):                       # shorts behind the far glove
        for x in range(66, 78):
            if sp[x, y][3]: up[x, y] = (12, 12, 12, 255)
    for y in range(58, 65):                       # torso flank behind the near forearm's upper end
        for x in range(60, 63):
            if sp[x, y][3]: up[x, y] = (134, 228, 24, 255)
    upath = os.path.join(scratch_dir, "set_w_underlay.png"); under.save(upath)
    usrc = Source(upath, label="SET/west underlay (flat kit colour)")

    R = Rig("W_SET")
    # declaration order = cut priority (first matching polygon wins); z = draw order (low = behind)
    R.add(Part("head",        src, [(52,12),(74,12),(74,34),(70,38),(60,38),(53,35)], pivot=(66,35), parent="torso", z=10, classes={"K","S","W","?"}, colour=(230,170,90)))
    R.add(Part("near_glove",  src, [(44,56),(58.5,56),(60,60),(59,72.5),(44,72.5)], pivot=(58,60), parent="near_fore", z=14, classes={"W","S","?","K"}, colour=(250,250,250)))
    R.add(Part("near_fore",   src, [(52.5,52),(62,52),(62,58),(61,64),(52.5,64)], pivot=(62,52), parent="near_upper", z=13, classes={"G","K","?"}, colour=(110,210,60), bone={"to":(58,60),"w":5,"rgba":(120,215,30,255)}))
    R.add(Part("near_upper",  src, [(56.5,43),(70.5,43),(70.5,52),(56.5,52)], pivot=(63,43), parent="torso", z=12, classes={"G","K","?"}, colour=(60,160,40), bone={"to":(62,52),"w":6,"rgba":(120,215,30,255)}))
    R.add(Part("far_glove",   src, [(65.5,66),(78.5,66),(78.5,80),(65.5,80)], pivot=(74,67), parent="far_fore", z=8, classes={"W","S","?","K"}, colour=(220,220,220)))
    R.add(Part("far_fore",    src, [(72.5,56),(83,56),(83,67.5),(70.5,67.5)], pivot=(77,56), parent="far_upper", z=3, classes={"G","K","?"}, colour=(90,170,60), bone={"to":(74,67),"w":5,"rgba":(110,205,28,255)}))
    R.add(Part("far_upper",   src, [(73.5,44),(83,44),(83,56),(73.5,56)], pivot=(77,46), parent="torso", z=2, classes={"G","K","?"}, colour=(50,120,40), bone={"to":(77,56),"w":6,"rgba":(110,205,28,255)}))
    R.add(Part("near_thigh",  src, [(52.5,76),(63.5,76),(63.5,84),(52.5,84)], pivot=(60,72), parent="pelvis", z=9, classes={"S","?"}, colour=(220,150,110), bone={"to":(58,84),"w":5,"rgba":(196,140,100,255)}))
    R.add(Part("near_thigh_edge", src, [(52.5,76),(55,76),(55,84),(52.5,84)], pivot=(60,72), parent="pelvis", z=9, classes={"K"}, colour=(200,130,100)))
    R.add(Part("near_shin",   src, [(53,84),(64,84),(64,95),(53,95)], pivot=(58,84), parent="near_thigh", z=9, classes={"K","G","?","S"}, colour=(70,70,80), bone={"to":(58,95),"w":6,"rgba":(20,20,22,255)}))
    R.add(Part("near_boot",   src, [(49,95),(64.5,95),(64.5,103),(49,103)], pivot=(58,95), parent="near_shin", z=11, classes={"K"}, colour=(40,40,50)))
    R.add(Part("far_thigh",   src, [(61.5,82.5),(74,82.5),(74,92),(61.5,92)], pivot=(68,76), parent="pelvis", z=4, classes={"S","?","K"}, colour=(190,120,90), bone={"to":(67,92),"w":6,"rgba":(190,130,95,255)}))
    R.add(Part("far_shin",    src, [(61.5,91.5),(74.5,91.5),(74.5,102),(61.5,102)], pivot=(67,92), parent="far_thigh", z=4, classes={"K","G","?","S"}, colour=(60,60,70), bone={"to":(68,102),"w":7,"rgba":(20,20,22,255)}))
    R.add(Part("far_boot",    src, [(61,102),(76.5,102),(76.5,116.5),(61,116.5)], pivot=(68,102), parent="far_shin", z=4, classes={"K"}, colour=(30,30,40)))
    R.add(Part("pelvis",      src, [(53,65),(81,65),(81,81),(76,85),(53,85)], pivot=(67,70), parent=None, z=6, classes={"K","?","S","W","G"}, colour=(120,120,140)))
    R.add(Part("torso",       src, [(52,33),(84,33),(84,68),(52,68)], pivot=(67,66), parent="pelvis", z=8, classes={"G","K","?","S","W"}, colour=(150,230,80), bone={"to":(66,40),"w":16,"rgba":(134,228,24,255)}))
    R.add(Part("torso_under", usrc, [(56,42),(71,42),(71,66),(56,66)], pivot=(67,66), parent="pelvis", z=7, classes=None, colour=(150,230,80)))
    R.add(Part("shorts_under", usrc, [(63,65),(80,65),(80,81),(63,81)], pivot=(67,70), parent="pelvis", z=5, classes=None, colour=(120,120,140)))
    left = R.assign()
    return R, left

if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "."
    R, left = build(out)
    for k, v in left.items(): print("unassigned", k, len(v), v[:30])
    for n in R.order: print(f"{n:16s} z{R.parts[n].z:2d} pivot {R.parts[n].pivot} parent {R.parts[n].parent} px {len(R.parts[n].pixels)}")
    viz = R.viz(scale=6, canvas=(128, 128), title="W_SET rig — components, pivots (red), bones"); viz.save(os.path.join(out, "rig_W_SET_viz.png"))
    R.legend().save(os.path.join(out, "rig_W_SET_legend.png"))
    img, M = R.render({}, canvas=(128, 128)); img.save(os.path.join(out, "rig_W_SET_rest.png"))
    # identity check: rest pose must reproduce the source sprite exactly
    src = Image.open(SET_W).convert("RGBA"); diff = sum(1 for y in range(128) for x in range(128) if src.getpixel((x, y)) != img.getpixel((x, y)) and (src.getpixel((x, y))[3] or img.getpixel((x, y))[3]))
    print("rest-pose pixels differing from the source:", diff)
