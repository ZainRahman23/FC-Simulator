#!/usr/bin/env python3
"""Assemble the V1.2 camera-space save-pose CANDIDATE manifest from the extracted PixelLab poses.
   python3 build_manifest.py <gen_out> <gen_small> <dest_dir>   (dest = review_artifacts/gk_anim_v1_2/save_poses/)"""
import sys, os, json, shutil
G, GS, D = sys.argv[1:4]; os.makedirs(os.path.join(D, "authored"), exist_ok=True); os.makedirs(os.path.join(D, "inputs"), exist_ok=True)
POSES = [  # family, side, key, gen_out name, plate name, PixelLab job id, lateral (m), z (m)
 ("LOW_COLLAPSE", "GOAL_LEFT", "LOW", "LOW_COLLAPSE_GOAL_LEFT_v2", "LOW_COLLAPSE_GOAL_LEFT", "c905a0e2-4a1c-4be4-bb57-70033522fbaf", 1.2, 0.30),
 ("AIRBORNE_DIVE", "GOAL_LEFT", "MID", "AIRBORNE_MID_GOAL_LEFT", "AIRBORNE_MID_GOAL_LEFT", "9ac5f8bf-5c29-481a-a0e5-ef3b7023e7cc", 1.5, 1.0),
 ("AIRBORNE_DIVE", "GOAL_LEFT", "HIGH", "AIRBORNE_HIGH_GOAL_LEFT", "AIRBORNE_HIGH_GOAL_LEFT", "(pre-interruption job; id not retained)", 1.5, 1.7),
 ("AIRBORNE_DIVE", "GOAL_LEFT", "TOP", "AIRBORNE_TOP_GOAL_LEFT", "AIRBORNE_TOP_GOAL_LEFT", "8652d5cf-7204-4081-8c21-76d1d6089285", 1.8, 2.2),
 ("LOW_COLLAPSE", "GOAL_RIGHT", "LOW", "LOW_COLLAPSE_GOAL_RIGHT", "LOW_COLLAPSE_GOAL_RIGHT", "9a9c8a2e-4b73-423d-9483-dbfd70540af9", 1.2, 0.30),
 ("AIRBORNE_DIVE", "GOAL_RIGHT", "MID", "AIRBORNE_MID_GOAL_RIGHT", "AIRBORNE_MID_GOAL_RIGHT", "415e1560-29cd-461e-850d-1ae1814fb586", 1.5, 1.0),
 ("AIRBORNE_DIVE", "GOAL_RIGHT", "HIGH", "AIRBORNE_HIGH_GOAL_RIGHT", "AIRBORNE_HIGH_GOAL_RIGHT", "b11d1e3b-7b69-4d19-907d-e5a7ca0a6b61", 1.5, 1.7),
 ("AIRBORNE_DIVE", "GOAL_RIGHT", "TOP", "AIRBORNE_TOP_GOAL_RIGHT", "AIRBORNE_TOP_GOAL_RIGHT", "9380da25-630f-4b25-a22a-6ff7d2da5464", 1.8, 2.2)]
man = {"version": "GK Animation V1.2 — camera-space save poses (CANDIDATES, not approved)", "canvas": [176, 240], "sprite_scale": 1.0,
       "authoring": "PixelLab edit_image (pro) on 1:1 gameplay-camera plates (rail 102.2, zoom 2.990; sprite scale 1.0); ball at the simulation's committed contact target; arrow along the projected goal line. No rotations, no mirroring.",
       "convention": {"GOAL_LEFT": "-goal line (north, far post, UP the screen)", "GOAL_RIGHT": "+goal line (south, near post, DOWN the screen)"},
       "anchors": "pixel coordinates on the 176x240 canvas; root = SET feet root of the plate (88,190.23); gloves = white blobs [x,y,area]; lead_glove = glove nearest the ball in the edit",
       "save_poses": {}}
rows = []
for fam, side, key, gname, pname, job, lat, z in POSES:
    src_png = os.path.join(G, f"pro_{gname}_extract.png"); src_an = os.path.join(G, f"pro_{gname}_extract_anchors.json")
    an = json.load(open(src_an)); an.update({"family": fam, "side": side, "key": key, "lateral_m": lat, "z_m": z, "pixellab_job": job, "authored_from": f"authored/pro_{gname}.png", "input_plate": f"inputs/{pname}_c16.png"})
    out_png = f"{fam}_{side}_{key}.png"; out_an = f"{fam}_{side}_{key}_anchors.json"
    shutil.copy(src_png, os.path.join(D, out_png)); json.dump(an, open(os.path.join(D, out_an), "w"), indent=1)
    shutil.copy(os.path.join(G, f"pro_{gname}.png"), os.path.join(D, "authored", f"pro_{gname}.png")); shutil.copy(os.path.join(GS, f"{pname}_c16.png"), os.path.join(D, "inputs", f"{pname}_c16.png"))
    shutil.copy(os.path.join(G, f"pro_{gname}_extract_review.png"), os.path.join(D, "authored", f"pro_{gname}_extract_review.png"))
    man["save_poses"].setdefault(fam, {}).setdefault(side, {"samples": {}})["samples"][key] = {"path": out_png, "anchors": out_an, "candidate": True, "approved": False, "id": job, "note": f"{fam} {side} {key}: lateral {lat} m, z {z} m; PixelLab pro edit"}
    rows.append((fam, side, key, out_png, an["pixels"], an.get("ball_how")))
json.dump(man, open(os.path.join(D, "GK_SAVE_POSES_CANDIDATES.json"), "w"), indent=1)
for r in rows: print(*r)
print("manifest", os.path.join(D, "GK_SAVE_POSES_CANDIDATES.json"))
