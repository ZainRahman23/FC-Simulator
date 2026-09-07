# CONTACT RIG — LOW_DIVE_LEFT (the approved far / extreme LOW dive to the keeper's LEFT, 144x88, body scale 0.60; drawn MIRRORED)
# cut into parts for bridge / landing frames. The contact frame itself is the untouched PNG.
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "rig"))
from gk_rig import Rig, Part, Source
LDL = "assets/visual_v1/goalkeeper/contextual/LOW_DIVE_LEFT.png"
ROOT = (80.5, 88.7)
def build():
    src = Source(LDL, label="LOW_DIVE_LEFT")
    R = Rig("LOW_FAR")
    R.add(Part("glove_A",  src, [(20,37),(67,37),(67,70),(42,72),(22,66)], pivot=(62,46), parent="sleeve", attach=(62,46), z=15, classes={"W","K","?","S"}, colour=(250,250,250)))
    R.add(Part("glove_B",  src, [(3,41),(24,39),(42,64),(42,84),(10,84),(2,70),(2,60)], pivot=(40,68), parent="sleeve", attach=(40,68), z=14, classes={"W","K","?","S"}, colour=(220,220,220)))
    R.add(Part("head",     src, [(9,2),(43,2),(53,15),(53,40),(36,43),(17,41),(9,26)], pivot=(51,34), parent="torso", attach=(51,34), z=13, classes={"S","K","W","?"}, colour=(230,170,90)))
    R.add(Part("sleeve",   src, [(46,35),(70,33),(74,50),(72,72),(52,86),(34,84),(34,66),(42,58)], pivot=(68,46), parent="torso", attach=(68,46), z=12, classes={"G","K","?","W"}, colour=(110,210,60), bone={"to":(50,60),"w":12,"rgba":(120,215,30,255)}))
    R.add(Part("thigh_1",  src, [(108,22),(126,22),(126,46),(108,46)], pivot=(110,34), parent="pelvis", attach=(110,34), z=4, classes={"S","K","?","G"}, colour=(220,150,110), bone={"to":(122,36),"w":8,"rgba":(196,140,100,255)}))
    R.add(Part("shin_1",   src, [(120,20),(142,20),(142,46),(120,46)], pivot=(124,34), parent="thigh_1", attach=(124,34), z=5, classes={"K","G","S","?"}, colour=(60,60,70), bone={"to":(136,32),"w":8,"rgba":(20,20,22,255)}))
    R.add(Part("thigh_2",  src, [(108,46),(126,46),(126,72),(108,72)], pivot=(110,58), parent="pelvis", attach=(110,58), z=6, classes={"S","K","?","G"}, colour=(190,120,90), bone={"to":(120,60),"w":8,"rgba":(196,140,100,255)}))
    R.add(Part("shin_2",   src, [(120,44),(142,44),(142,74),(120,74)], pivot=(124,60), parent="thigh_2", attach=(124,60), z=7, classes={"K","G","S","?"}, colour=(70,70,80), bone={"to":(136,62),"w":8,"rgba":(20,20,22,255)}))
    R.add(Part("pelvis",   src, [(82,24),(112,24),(112,74),(82,76)], pivot=(96,48), parent=None, z=8, classes={"K","?","S","G","W"}, colour=(120,120,140)))
    R.add(Part("torso",    src, [(46,6),(82,6),(102,18),(102,84),(58,86),(44,68)], pivot=(92,48), parent="pelvis", attach=(92,48), z=10, classes={"G","K","?","S","W"}, colour=(150,230,80), bone={"to":(56,40),"w":22,"rgba":(134,228,24,255)}))
    left = R.assign(); return R, left
if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "."
    R, left = build()
    for k, v in left.items(): print("unassigned", k, len(v), v[:40])
    for n in R.order: print(f"{n:10s} z{R.parts[n].z:2d} pivot {R.parts[n].pivot} parent {R.parts[n].parent} px {len(R.parts[n].pixels)}")
    R.viz(scale=5, canvas=(144,88), title="LOW_FAR rig").save(os.path.join(out, "rig_LOWFAR_viz.png"))
    img, M = R.render({}, canvas=(144,88)); from PIL import Image
    src = Image.open(LDL).convert("RGBA"); diff = sum(1 for y in range(88) for x in range(144) if src.getpixel((x, y)) != img.getpixel((x, y)) and (src.getpixel((x, y))[3] or img.getpixel((x, y))[3]))
    print("rest-pose pixels differing from the source:", diff)
