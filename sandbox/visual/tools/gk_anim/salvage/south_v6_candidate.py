# SOUTH V6 candidate: mirrored cleaned sprite + measured anchors at a given body scale (review manifest only — not an asset).
#   python3 south_v6_candidate.py <pixel_scale> <root_off_base_x> <root_off_base_y>
import sys, json, math
from PIL import Image
PS = float(sys.argv[1]); OFF = (float(sys.argv[2]), float(sys.argv[3]))
D = "review_artifacts/gk_south_v6_calibration"; SPR = f"{D}/SOUTH_V6_CLEAN_MIRRORED.png"
im = Image.open(SPR).convert("RGBA"); px = im.load(); W, H = im.size
white = [(x, y) for y in range(H) for x in range(W) if px[x, y][3] >= 128 and px[x, y][0] > 185 and px[x, y][1] > 185 and px[x, y][2] > 170]
# the two gloves in the mirrored sprite: A (upper, nearer the head) and B (lower-right, the leading hand along the reach)
A = [p for p in white if p[1] < 113 and p[0] >= 98]; B = [p for p in white if p[1] >= 113 and p[0] >= 104]
def cen(pts): return [round(sum(p[0] for p in pts) / len(pts), 1), round(sum(p[1] for p in pts) / len(pts), 1), len(pts)]
gA, gB = cen(A), cen(B); lead = gB
root = [round(lead[0] + OFF[0] / PS, 1), round(lead[1] + OFF[1] / PS, 1)]
vx, vy = lead[0] - root[0], lead[1] - root[1]; n = math.hypot(vx, vy)
head = [104.6, 88.0]
an = {"root": root, "bbox": list(im.getbbox()), "gloves": [gB, gA], "lead_glove": lead + [0], "head": head, "reach_screen_unit": [round(vx / n, 3), round(vy / n, 3)],
      "canvas": [W, H], "source": "review_artifacts/gk_south_v6_cleanup/V6_CLEAN.png (horizontal mirror; RAW_SOUTH_V6 + 76-px readability cleanup)",
      "mirror_applied": True, "rotation_cw_deg": 0, "root_offset_from_lead_glove_px": [round(root[0] - lead[0], 1), round(root[1] - lead[1], 1)],
      "root_offset_base_px": list(OFF), "pixel_scale": PS,
      "description": f"SOUTH V6 candidate (GOAL_RIGHT far dive): cleaned V6 mirrored horizontally, body scale {PS} (head geometry vs GK_BASE_V1, Pro-corrected against DIVE_NORTH/SW_FAR_DIVE), "
                     f"root offset from the lead glove authored in canonical px {OFF} so the drawn glove meets the simulation's contact hand on the representative GOAL_RIGHT HIGH dive (lat +2.0 m, z 1.45 m)"}
json.dump(an, open(f"{D}/SOUTH_V6_CLEAN_MIRRORED_anchors.json", "w"), indent=1)
man = {"version": 1, "record": "SOUTH V6 calibration candidate (review only)", "save_poses": {"CONTEXTUAL": {"ANY": {"samples": {
    "SOUTH_V6": {"path": "SOUTH_V6_CLEAN_MIRRORED.png", "anchors": "SOUTH_V6_CLEAN_MIRRORED_anchors.json", "mirror": False, "approved": False, "candidate": True, "note": an["description"]}}}}}}
json.dump(man, open(f"{D}/candidate_manifest.json", "w"), indent=1)
print("gloves A", gA, "B(lead)", gB, "root", root, "reach unit", an["reach_screen_unit"], "pixel_scale", PS)
