# CONTACT RIG — SW_FAR_DIVE (the approved SOUTH-WEST facing far dive, 136x97, body scale 0.74; drawn ORIGINAL for the keeper's LEFT,
# MIRRORED for his RIGHT) cut into parts for bridge / landing frames. The contact frame itself is the untouched PNG.
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "rig"))
from gk_rig import Rig, Part, Source
SWF = "assets/visual_v1/goalkeeper/contextual/SW_FAR_DIVE.png"
ROOT = (67.5, 92.0)
def build():
    src = Source(SWF, label="SW_FAR_DIVE")
    R = Rig("SW_FAR")
    R.add(Part("glove_A",  src, [(100,21),(118,20),(123,31),(117,42),(103,41),(99,30)], pivot=(104,33), parent="sleeve", attach=(104,33), z=15, classes={"W","K","?","S"}, colour=(250,250,250)))
    R.add(Part("glove_B",  src, [(114,26),(119,22),(132,25),(136,40),(129,50),(115,49),(112,38)], pivot=(116,40), parent="sleeve", attach=(116,40), z=14, classes={"W","K","?","S"}, colour=(220,220,220)))
    R.add(Part("head",     src, [(85,2),(109,2),(111,20),(108,32),(96,34),(86,28),(83,16)], pivot=(93,31), parent="torso", attach=(93,31), z=13, classes={"S","K","W","?"}, colour=(230,170,90)))
    R.add(Part("sleeve",   src, [(76,12),(96,11),(104,22),(112,30),(124,44),(122,60),(100,60),(86,52),(74,42),(68,26)], pivot=(82,26), parent="torso", attach=(82,26), z=12, classes={"G","K","?","W"}, colour=(110,210,60), bone={"to":(106,36),"w":12,"rgba":(120,215,30,255)}))
    R.add(Part("thigh_1",  src, [(24,52),(46,50),(48,68),(26,74)], pivot=(42,56), parent="pelvis", attach=(42,56), z=4, classes={"S","K","?","G"}, colour=(220,150,110), bone={"to":(34,66),"w":8,"rgba":(196,140,100,255)}))
    R.add(Part("shin_1",   src, [(2,58),(30,56),(36,74),(22,94),(2,94)], pivot=(32,66), parent="thigh_1", attach=(32,66), z=5, classes={"K","G","S","?"}, colour=(60,60,70), bone={"to":(12,86),"w":8,"rgba":(20,20,22,255)}))
    R.add(Part("thigh_2",  src, [(46,62),(66,62),(72,80),(58,94),(44,84)], pivot=(52,66), parent="pelvis", attach=(52,66), z=6, classes={"S","K","?","G"}, colour=(190,120,90), bone={"to":(58,84),"w":8,"rgba":(196,140,100,255)}))
    R.add(Part("shin_2",   src, [(26,72),(50,72),(54,94),(26,94)], pivot=(50,84), parent="thigh_2", attach=(50,84), z=7, classes={"K","G","S","?"}, colour=(70,70,80), bone={"to":(36,88),"w":8,"rgba":(20,20,22,255)}))
    R.add(Part("pelvis",   src, [(32,44),(62,44),(70,60),(78,66),(76,78),(62,78),(38,76),(28,60)], pivot=(50,58), parent=None, z=8, classes={"K","?","S","G","W"}, colour=(120,120,140)))
    R.add(Part("torso",    src, [(54,22),(80,20),(100,42),(98,62),(64,68),(40,58),(42,42)], pivot=(58,54), parent="pelvis", attach=(58,54), z=10, classes={"G","K","?","S","W"}, colour=(150,230,80), bone={"to":(84,32),"w":18,"rgba":(134,228,24,255)}))
    left = R.assign(); return R, left
if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "."
    R, left = build()
    for k, v in left.items(): print("unassigned", k, len(v), v[:40])
    for n in R.order: print(f"{n:10s} z{R.parts[n].z:2d} pivot {R.parts[n].pivot} parent {R.parts[n].parent} px {len(R.parts[n].pixels)}")
    R.viz(scale=5, canvas=(136,97), title="SW_FAR rig").save(os.path.join(out, "rig_SWFAR_viz.png"))
    img, M = R.render({}, canvas=(136,97)); from PIL import Image
    src = Image.open(SWF).convert("RGBA"); diff = sum(1 for y in range(97) for x in range(136) if src.getpixel((x, y)) != img.getpixel((x, y)) and (src.getpixel((x, y))[3] or img.getpixel((x, y))[3]))
    print("rest-pose pixels differing from the source:", diff)
