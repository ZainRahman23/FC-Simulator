# CONTACT RIG — DIVE_NORTH_CW50 (the approved RIGHT / GOAL_LEFT far-dive contact pose, 82x181, body scale 0.72) cut into articulated parts.
# Used ONLY for the bridge frames before contact and the post-contact / landing frames: the contact frame itself is the untouched PNG.
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "rig"))
from gk_rig import Rig, Part, Source
CW50 = "assets/visual_v1/goalkeeper/contextual/DIVE_NORTH_CW50.png"
ROOT = (34.2, 151.0)                     # anchors root (sprite px) — the simulation root
def build():
    src = Source(CW50, label="DIVE_NORTH_CW50")
    R = Rig("NORTH_CW50")
    # declaration order = cut priority; z = draw order (low = behind)
    R.add(Part("glove_A",  src, [(3,2),(22,2),(26,13),(22,23),(11,25),(3,16)], pivot=(21,23), parent="sleeve", attach=(21,23), z=15, classes={"W","K","?","S"}, colour=(250,250,250)))   # upper (lead) glove
    R.add(Part("glove_B",  src, [(11,17),(28,13),(38,25),(36,44),(19,45),(11,32)], pivot=(29,42), parent="sleeve", attach=(29,42), z=14, classes={"W","K","?","S"}, colour=(220,220,220)))  # lower glove
    R.add(Part("head",     src, [(32,28),(47,25),(65,29),(66,46),(59,58),(45,59),(35,53),(31,41)], pivot=(46,57), parent="torso", attach=(46,57), z=12, classes={"S","K","W","?"}, colour=(230,170,90)))
    R.add(Part("sleeve",   src, [(5,24),(25,20),(32,34),(39,44),(55,54),(56,66),(46,74),(29,64),(16,60),(10,50),(5,36)], pivot=(49,60), parent="torso", attach=(49,60), z=13, classes={"G","K","?","W"}, colour=(110,210,60), bone={"to":(22,30),"w":10,"rgba":(120,215,30,255)}))
    R.add(Part("thigh_R",  src, [(47,117),(65,116),(69,136),(58,141),(49,139)], pivot=(56,121), parent="pelvis", attach=(56,121), z=6, classes={"S","K","?","G"}, colour=(190,120,90), bone={"to":(60,138),"w":9,"rgba":(196,140,100,255)}))
    R.add(Part("shin_R",   src, [(51,133),(66,131),(80,148),(79,157),(58,158)], pivot=(60,138), parent="thigh_R", attach=(60,138), z=7, classes={"K","G","S","?"}, colour=(60,60,70), bone={"to":(70,160),"w":8,"rgba":(20,20,22,255)}))
    R.add(Part("boot_R",   src, [(57,157),(80,151),(85,173),(66,178)], pivot=(70,160), parent="shin_R", attach=(70,160), z=8, classes={"K","?","G"}, colour=(30,30,40)))
    R.add(Part("thigh_L",  src, [(27,120),(47,119),(51,138),(40,143),(29,141)], pivot=(36,124), parent="pelvis", attach=(36,124), z=3, classes={"S","K","?","G"}, colour=(220,150,110), bone={"to":(42,140),"w":9,"rgba":(196,140,100,255)}))
    R.add(Part("shin_L",   src, [(30,137),(51,135),(56,156),(34,157)], pivot=(42,140), parent="thigh_L", attach=(42,140), z=4, classes={"K","G","S","?"}, colour=(70,70,80), bone={"to":(50,160),"w":8,"rgba":(20,20,22,255)}))
    R.add(Part("boot_L",   src, [(33,156),(58,153),(64,179),(42,182)], pivot=(50,160), parent="shin_L", attach=(50,160), z=5, classes={"K","?","G"}, colour=(40,40,50)))
    R.add(Part("pelvis",   src, [(24,94),(64,93),(66,128),(52,125),(40,129),(25,127)], pivot=(44,100), parent=None, z=9, classes={"K","?","S","G","W"}, colour=(120,120,140)))
    R.add(Part("torso",    src, [(23,50),(46,48),(62,52),(66,66),(64,100),(26,100),(22,72)], pivot=(44,96), parent="pelvis", attach=(44,96), z=10, classes={"G","K","?","S","W"}, colour=(150,230,80), bone={"to":(44,58),"w":20,"rgba":(134,228,24,255)}))
    left = R.assign()
    return R, left
if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "."
    R, left = build()
    for k, v in left.items(): print("unassigned", k, len(v), v[:40])
    for n in R.order: print(f"{n:10s} z{R.parts[n].z:2d} pivot {R.parts[n].pivot} parent {R.parts[n].parent} px {len(R.parts[n].pixels)}")
    R.viz(scale=6, canvas=(82,181), title="NORTH_CW50 rig").save(os.path.join(out, "rig_NORTH_CW50_viz.png")); R.legend().save(os.path.join(out, "rig_NORTH_CW50_legend.png"))
    img, M = R.render({}, canvas=(82,181)); img.save(os.path.join(out, "rig_NORTH_CW50_rest.png"))
    from PIL import Image
    src = Image.open(CW50).convert("RGBA"); diff = sum(1 for y in range(181) for x in range(82) if src.getpixel((x, y)) != img.getpixel((x, y)) and (src.getpixel((x, y))[3] or img.getpixel((x, y))[3]))
    print("rest-pose pixels differing from the source:", diff)
