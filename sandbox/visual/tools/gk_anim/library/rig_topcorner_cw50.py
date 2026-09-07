# CONTACT RIG — TOP_LEFT_CORNER_CW50 (the approved full-stretch top-corner save to GOAL_LEFT, 115x186, body scale 0.72) cut into parts.
# Bridge / post-contact frames only; the contact frame itself is the untouched PNG. Boots stay with the shins (one part per lower leg).
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "rig"))
from gk_rig import Rig, Part, Source
TC = "assets/visual_v1/goalkeeper/contextual/TOP_LEFT_CORNER_CW50.png"
ROOT = (82.1, 177.2)
def build():
    src = Source(TC, label="TOP_LEFT_CORNER_CW50")
    R = Rig("TOPCORNER_CW50")
    R.add(Part("glove_lead", src, [(53,2),(79,2),(81,22),(79,35),(63,37),(53,24)], pivot=(73,34), parent="arm_lead", attach=(73,34), z=15, classes={"W","K","?","S"}, colour=(250,250,250)))
    R.add(Part("glove_far",  src, [(2,56),(23,56),(29,67),(28,79),(7,79),(2,70)], pivot=(25,75), parent="arm_far", attach=(25,75), z=15, classes={"W","K","?","S"}, colour=(220,220,220)))
    R.add(Part("head",       src, [(53,43),(66,39),(79,43),(81,58),(77,75),(61,77),(53,66)], pivot=(68,75), parent="torso", attach=(68,75), z=14, classes={"S","K","W","?"}, colour=(230,170,90)))
    R.add(Part("arm_lead",   src, [(64,28),(80,26),(90,40),(90,68),(76,70),(68,52)], pivot=(83,66), parent="torso", attach=(83,66), z=13, classes={"G","K","?","W"}, colour=(110,210,60), bone={"to":(74,36),"w":9,"rgba":(120,215,30,255)}))
    R.add(Part("arm_far",    src, [(18,64),(40,64),(62,70),(62,94),(40,94),(20,82)], pivot=(60,82), parent="torso", attach=(60,82), z=12, classes={"G","K","?","W"}, colour=(90,170,60), bone={"to":(27,75),"w":9,"rgba":(110,205,28,255)}))
    R.add(Part("thigh_B",    src, [(83,122),(102,122),(104,143),(88,146)], pivot=(90,126), parent="pelvis", attach=(90,126), z=7, classes={"S","K","?","G"}, colour=(190,120,90), bone={"to":(96,140),"w":9,"rgba":(196,140,100,255)}))
    R.add(Part("shin_B",     src, [(87,140),(103,135),(116,160),(112,173),(93,172)], pivot=(96,140), parent="thigh_B", attach=(96,140), z=8, classes={"K","G","S","?"}, colour=(60,60,70), bone={"to":(104,166),"w":8,"rgba":(20,20,22,255)}))
    R.add(Part("thigh_A",    src, [(61,133),(81,132),(83,151),(65,153)], pivot=(72,136), parent="pelvis", attach=(72,136), z=5, classes={"S","K","?","G"}, colour=(220,150,110), bone={"to":(74,150),"w":9,"rgba":(196,140,100,255)}))
    R.add(Part("shin_A",     src, [(65,149),(83,145),(93,170),(87,185),(69,185)], pivot=(74,150), parent="thigh_A", attach=(74,150), z=6, classes={"K","G","S","?"}, colour=(70,70,80), bone={"to":(82,178),"w":8,"rgba":(20,20,22,255)}))
    R.add(Part("pelvis",     src, [(57,103),(90,101),(101,111),(99,139),(75,141),(59,139)], pivot=(76,108), parent=None, z=9, classes={"K","?","S","G","W"}, colour=(120,120,140)))
    R.add(Part("torso",      src, [(56,66),(72,64),(90,62),(92,80),(90,110),(59,112),(54,90)], pivot=(74,106), parent="pelvis", attach=(74,106), z=10, classes={"G","K","?","S","W"}, colour=(150,230,80), bone={"to":(72,76),"w":20,"rgba":(134,228,24,255)}))
    left = R.assign()
    return R, left
if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "."
    R, left = build()
    for k, v in left.items(): print("unassigned", k, len(v), v[:40])
    for n in R.order: print(f"{n:10s} z{R.parts[n].z:2d} pivot {R.parts[n].pivot} parent {R.parts[n].parent} px {len(R.parts[n].pixels)}")
    R.viz(scale=5, canvas=(115,186), title="TOPCORNER_CW50 rig").save(os.path.join(out, "rig_TOPCORNER_viz.png")); R.legend().save(os.path.join(out, "rig_TOPCORNER_legend.png"))
    img, M = R.render({}, canvas=(115,186)); img.save(os.path.join(out, "rig_TOPCORNER_rest.png"))
    from PIL import Image
    src = Image.open(TC).convert("RGBA"); diff = sum(1 for y in range(186) for x in range(115) if src.getpixel((x, y)) != img.getpixel((x, y)) and (src.getpixel((x, y))[3] or img.getpixel((x, y))[3]))
    print("rest-pose pixels differing from the source:", diff)
