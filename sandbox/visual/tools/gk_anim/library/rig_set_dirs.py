# SET RIGS FOR THE OTHER FACINGS — GK_BASE_V1 set/<dir>.png cut into the same articulated part set as rig_w_set (head, torso, pelvis,
# near_/far_ upper/fore/glove, near_/far_ thigh/shin/boot). "near" = the keeper's RIGHT side, "far" = his LEFT, on every facing, so the
# authoring scripts keep one vocabulary. Polygons are in the sprite's own pixel coordinates (128x128); nothing is resampled.
#   python3 rig_set_dirs.py <facing> [outdir]     facings: south-west, north-west
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "rig"))
from gk_rig import Rig, Part, Source
from PIL import Image
BASE = "assets/visual_v1/originals/character_f4838361/set/"
KIT = (134, 228, 24, 255); SHORTS = (12, 12, 12, 255)
TABLES = {
 "south-west": {   # keeper faces the camera's lower-left: his RIGHT (near) is screen-left, his LEFT (far) is screen-right and nearer the camera
   "underlay": [((53, 57, 38, 60), KIT), ((74, 81, 66, 80), SHORTS)],
   "parts": [
    ("head",        [(53,12),(72,12),(73,30),(69,38),(58,39),(50,36),(50,32)], (63,37), "torso", (63,37), 10, {"K","S","W","?"}, (230,170,90), None),
    ("near_glove",  [(37,56),(50,56),(50,73),(37,73)], (46,59), "near_fore", (46,59), 14, {"W","S","?","K"}, (250,250,250), None),
    ("near_fore",   [(43,50),(56,50),(56,63),(43,63)], (50,50), "near_upper", (50,50), 13, {"G","K","?"}, (110,210,60), {"to":(46,60),"w":5,"rgba":(120,215,30,255)}),
    ("near_upper",  [(45,35),(57,35),(56,50),(45,50)], (52,38), "torso", (52,38), 12, {"G","K","?"}, (60,160,40), {"to":(50,50),"w":6,"rgba":(120,215,30,255)}),
    ("far_glove",   [(72,65),(86,65),(86,81),(72,81)], (79,68), "far_fore", (79,68), 8, {"W","S","?","K"}, (220,220,220), None),
    ("far_fore",    [(74,54),(88,54),(87,68),(73,68)], (82,54), "far_upper", (82,54), 3, {"G","K","?"}, (90,170,60), {"to":(79,67),"w":5,"rgba":(110,205,28,255)}),
    ("far_upper",   [(75,36),(88,36),(88,54),(75,54)], (81,41), "torso", (81,41), 2, {"G","K","?"}, (50,120,40), {"to":(82,54),"w":6,"rgba":(110,205,28,255)}),
    ("near_thigh",  [(45,74),(61,74),(61,86),(45,86)], (54,72), "pelvis", (54,72), 9, {"S","?"}, (220,150,110), {"to":(52,86),"w":5,"rgba":(196,140,100,255)}),
    ("near_thigh_edge", [(45,76),(50,76),(50,86),(45,86)], (54,72), "pelvis", (54,72), 9, {"K"}, (200,130,100), None),
    ("near_shin",   [(43,85),(61,85),(61,97),(43,97)], (52,86), "near_thigh", (52,86), 9, {"K","G","?","S"}, (70,70,80), {"to":(51,97),"w":6,"rgba":(20,20,22,255)}),
    ("near_boot",   [(41,96),(63,96),(63,108),(41,108)], (51,97), "near_shin", (51,97), 11, {"K","?"}, (40,40,50), None),
    ("far_thigh",   [(63,81),(79,81),(79,93),(63,93)], (70,80), "pelvis", (70,80), 4, {"S","?","K"}, (190,120,90), {"to":(70,93),"w":6,"rgba":(190,130,95,255)}),
    ("far_shin",    [(64,90),(81,90),(81,106),(64,106)], (71,93), "far_thigh", (71,93), 4, {"K","G","?","S"}, (60,60,70), {"to":(73,106),"w":7,"rgba":(20,20,22,255)}),
    ("far_boot",    [(63,105),(85,105),(85,118),(63,118)], (73,106), "far_shin", (73,106), 4, {"K","?"}, (30,30,40), None),
    ("pelvis",      [(49,63),(81,63),(81,89),(49,89)], (65,68), None, None, 6, {"K","?","S","W","G"}, (120,120,140), None),
    ("torso",       [(52,31),(78,31),(79,67),(52,67)], (65,64), "pelvis", (65,64), 8, {"G","K","?","S","W"}, (150,230,80), {"to":(64,40),"w":16,"rgba":(134,228,24,255)}),
   ], "torso_under": [(58,40),(74,40),(74,66),(58,66)], "shorts_under": [(62,63),(81,63),(81,82),(62,82)]},
 "north-west": {   # keeper faces away up-left: his RIGHT (near) is screen-right, his LEFT (far) is screen-left and nearer the camera
   "underlay": [((75, 80, 59, 70), KIT), ((54, 58, 38, 62), KIT)],
   "parts": [
    ("head",        [(53,11),(72,11),(72,30),(68,37),(58,37),(53,30)], (63,36), "torso", (63,36), 10, {"K","S","W","?"}, (230,170,90), None),
    ("near_glove",  [(74,58),(85,58),(85,72),(74,72)], (80,61), "near_fore", (80,61), 14, {"W","S","?","K"}, (250,250,250), None),
    ("near_fore",   [(75,50),(88,50),(86,62),(74,62)], (82,50), "near_upper", (82,50), 13, {"G","K","?"}, (110,210,60), {"to":(80,61),"w":5,"rgba":(120,215,30,255)}),
    ("near_upper",  [(75,35),(88,35),(88,50),(75,50)], (81,39), "torso", (81,39), 12, {"G","K","?"}, (60,160,40), {"to":(82,50),"w":6,"rgba":(120,215,30,255)}),
    ("far_glove",   [(35,62),(50,62),(50,80),(35,80)], (46,66), "far_fore", (46,66), 14, {"W","S","?","K"}, (220,220,220), None),
    ("far_fore",    [(43,50),(58,50),(57,68),(42,68)], (52,50), "far_upper", (52,50), 13, {"G","K","?"}, (90,170,60), {"to":(47,64),"w":5,"rgba":(110,205,28,255)}),
    ("far_upper",   [(45,35),(58,35),(58,50),(45,50)], (53,38), "torso", (53,38), 12, {"G","K","?"}, (50,120,40), {"to":(52,50),"w":6,"rgba":(110,205,28,255)}),
    ("far_thigh",   [(48,78),(63,78),(63,90),(48,90)], (56,77), "pelvis", (56,77), 9, {"S","?"}, (220,150,110), {"to":(55,90),"w":5,"rgba":(196,140,100,255)}),
    ("far_shin",    [(45,87),(63,87),(63,101),(45,101)], (55,90), "far_thigh", (55,90), 9, {"K","G","?","S"}, (70,70,80), {"to":(53,101),"w":6,"rgba":(20,20,22,255)}),
    ("far_boot",    [(43,100),(64,100),(64,113),(43,113)], (53,101), "far_shin", (53,101), 11, {"K","?"}, (40,40,50), None),
    ("near_thigh",  [(65,77),(79,77),(79,86),(65,86)], (72,76), "pelvis", (72,76), 4, {"S","?","K"}, (190,120,90), {"to":(72,86),"w":6,"rgba":(190,130,95,255)}),
    ("near_shin",   [(65,85),(83,85),(83,97),(65,97)], (73,86), "near_thigh", (73,86), 4, {"K","G","?","S"}, (60,60,70), {"to":(75,97),"w":7,"rgba":(20,20,22,255)}),
    ("near_boot",   [(64,96),(86,96),(86,109),(64,109)], (75,97), "near_shin", (75,97), 4, {"K","?"}, (30,30,40), None),
    ("pelvis",      [(50,63),(81,63),(81,87),(50,87)], (65,68), None, None, 6, {"K","?","S","W","G"}, (120,120,140), None),
    ("torso",       [(53,31),(79,31),(79,67),(53,67)], (66,64), "pelvis", (66,64), 8, {"G","K","?","S","W"}, (150,230,80), {"to":(65,40),"w":16,"rgba":(134,228,24,255)}),
   ], "torso_under": [(59,40),(75,40),(75,66),(59,66)], "shorts_under": [(52,63),(80,63),(80,84),(52,84)]},
}
def build(facing, scratch_dir="."):
    T = TABLES[facing]; path = BASE + facing + ".png"; src = Source(path, label="SET/" + facing)
    under = Image.new("RGBA", src.im.size, (0, 0, 0, 0)); up = under.load(); sp = src.px
    for (x0, x1, y0, y1), col in T["underlay"]:
        for y in range(y0, y1):
            for x in range(x0, x1):
                if sp[x, y][3]: up[x, y] = col
    upath = os.path.join(scratch_dir, f"set_{facing}_underlay.png"); under.save(upath); usrc = Source(upath, label=f"SET/{facing} underlay")
    R = Rig(facing.upper().replace("-", "_") + "_SET")
    for name, poly, pivot, parent, attach, z, classes, colour, bone in T["parts"]:
        R.add(Part(name, src, poly, pivot=pivot, parent=parent, attach=attach, z=z, classes=classes, colour=colour, bone=bone))
    R.add(Part("torso_under", usrc, T["torso_under"], pivot=R.parts["torso"].pivot, parent="pelvis", z=7, classes=None, colour=(150,230,80)))
    R.add(Part("shorts_under", usrc, T["shorts_under"], pivot=R.parts["pelvis"].pivot, parent="pelvis", z=5, classes=None, colour=(120,120,140)))
    left = R.assign()
    return R, left
if __name__ == "__main__":
    facing = sys.argv[1]; out = sys.argv[2] if len(sys.argv) > 2 else "."
    R, left = build(facing, out)
    for k, v in left.items(): print("unassigned", k, len(v), v[:40])
    for n in R.order: print(f"{n:14s} z{R.parts[n].z:2d} pivot {R.parts[n].pivot} parent {R.parts[n].parent} px {len(R.parts[n].pixels)}")
    R.viz(scale=6, canvas=(128, 128), title=R.name + " rig").save(os.path.join(out, f"rig_{R.name}_viz.png"))
    img, M = R.render({}, canvas=(128, 128)); img.save(os.path.join(out, f"rig_{R.name}_rest.png"))
    src = Image.open(BASE + facing + ".png").convert("RGBA"); diff = sum(1 for y in range(128) for x in range(128) if src.getpixel((x, y)) != img.getpixel((x, y)) and (src.getpixel((x, y))[3] or img.getpixel((x, y))[3]))
    print("rest-pose pixels differing from the source:", diff)
