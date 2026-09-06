# CONTACT RIG — DIVE_SOUTH_CW20 (the approved 20° CW / 0.85 SOUTH far-dive contact pose, 67x114) cut into articulated parts.
# Used ONLY for the bridge frames before contact and the post-contact / landing frames: the contact frame itself is the untouched PNG.
# Every part keeps its original pixels; pixel density = the Pro art's (drawn at body scale 0.85 by the renderer).
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "rig"))
from gk_rig import Rig, Part, Source
CW20 = "assets/visual_v1/goalkeeper/contextual/DIVE_SOUTH_CW20.png"
ROOT = (43.6, 161.7)                     # anchors root (sprite px) — the simulation root
def build():
    src = Source(CW20, label="DIVE_SOUTH_CW20")
    R = Rig("SOUTH_CW20")
    # declaration order = cut priority; z = draw order (low = behind)
    R.add(Part("head",     src, [(41,51),(66,51),(66,78),(52,78),(44,74),(41,66)], pivot=(46,60), parent="torso", attach=(46,60), z=12, classes={"K","S","W","?"}, colour=(230,170,90)))
    R.add(Part("glove_B",  src, [(42,90),(67,86),(67,114),(44,114)], pivot=(46,91), parent="sleeve", attach=(46,91), z=15, classes={"W","S","?","K"}, colour=(250,250,250)))   # lead (lower) glove
    R.add(Part("glove_A",  src, [(37,73),(58,73),(60,90),(42,90),(36,84)], pivot=(41,77), parent="sleeve", attach=(41,77), z=14, classes={"W","S","?","K"}, colour=(220,220,220)))  # other (upper) glove
    R.add(Part("sleeve",   src, [(28,70),(48,68),(52,86),(48,98),(36,98),(28,82)], pivot=(37,70), parent="torso", attach=(37,70), z=13, classes={"G","K","?"}, colour=(110,210,60), bone={"to":(46,92),"w":8,"rgba":(120,215,30,255)}))
    R.add(Part("shin_2",   src, [(10,2),(27,2),(29,22),(17,29),(9,17)], pivot=(22,25), parent="thigh_2", attach=(22,25), z=4, classes={"K","G","S","?"}, colour=(60,60,70), bone={"to":(18,8),"w":6,"rgba":(20,20,22,255)}))
    R.add(Part("thigh_2",  src, [(15,26),(29,22),(35,36),(27,46),(17,40)], pivot=(26,42), parent="pelvis", attach=(26,42), z=5, classes={"K","S","?","G"}, colour=(190,120,90), bone={"to":(22,25),"w":7,"rgba":(28,28,30,255)}))
    R.add(Part("shin_1",   src, [(1,16),(14,14),(18,33),(13,47),(6,49),(1,40)], pivot=(12,38), parent="thigh_1", attach=(12,38), z=6, classes={"K","G","S","?"}, colour=(70,70,80), bone={"to":(6,22),"w":6,"rgba":(20,20,22,255)}))
    R.add(Part("thigh_1",  src, [(9,42),(18,33),(28,44),(24,54),(12,52)], pivot=(24,48), parent="pelvis", attach=(24,48), z=7, classes={"K","S","?","G"}, colour=(220,150,110), bone={"to":(12,38),"w":7,"rgba":(28,28,30,255)}))
    R.add(Part("pelvis",   src, [(16,36),(30,30),(38,42),(30,54),(18,54)], pivot=(27,45), parent=None, z=8, classes={"K","?","S","G","W"}, colour=(120,120,140)))
    R.add(Part("torso",    src, [(17,36),(49,36),(51,72),(38,78),(28,74),(16,58)], pivot=(31,50), parent="pelvis", attach=(31,50), z=10, classes={"G","K","?","S","W"}, colour=(150,230,80), bone={"to":(44,66),"w":18,"rgba":(134,228,24,255)}))
    left = R.assign()
    return R, left
if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "."
    R, left = build()
    for k, v in left.items(): print("unassigned", k, len(v), v[:40])
    for n in R.order: print(f"{n:10s} z{R.parts[n].z:2d} pivot {R.parts[n].pivot} parent {R.parts[n].parent} px {len(R.parts[n].pixels)}")
    R.viz(scale=8, canvas=(67,114), title="SOUTH_CW20 rig").save(os.path.join(out, "rig_SOUTH_CW20_viz.png")); R.legend().save(os.path.join(out, "rig_SOUTH_CW20_legend.png"))
    img, M = R.render({}, canvas=(67,114)); img.save(os.path.join(out, "rig_SOUTH_CW20_rest.png"))
    from PIL import Image
    src = Image.open(CW20).convert("RGBA"); diff = sum(1 for y in range(114) for x in range(67) if src.getpixel((x, y)) != img.getpixel((x, y)) and (src.getpixel((x, y))[3] or img.getpixel((x, y))[3]))
    print("rest-pose pixels differing from the source:", diff)
