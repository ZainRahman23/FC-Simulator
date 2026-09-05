#!/usr/bin/env python3
"""Proof manifest: two AIRBORNE_DIVE samples (key MID) — GOAL_LEFT and GOAL_RIGHT — from the extracted PixelLab poses.
   python3 build_proof_manifest.py <gen_dir> <dest_dir>"""
import sys, os, json, shutil
G, D = sys.argv[1:3]; os.makedirs(D, exist_ok=True)
man = {"version": "TWO-POSE PERSPECTIVE PROOF (experimental, not approved)", "canvas": [176, 240], "sprite_scale": 1.0,
       "authoring": "PixelLab edit_image (pro) of the SET keeper on the 1:1 gameplay-camera plate; perspective-preserving prompt; ball at the controlled target; no arrows; keeper extracted, ball removed.",
       "save_poses": {"AIRBORNE_DIVE": {}}}
for side, job in [("GOAL_LEFT", "961c7ed3-215d-4a17-ac42-da4ff40dd1f9"), ("GOAL_RIGHT", "40c0c373-9988-43fc-a380-f75dc9152b90")]:
    an = json.load(open(os.path.join(G, f"pro_{side}_extract_anchors.json"))); an.update({"family": "AIRBORNE_DIVE", "side": side, "key": "MID", "pixellab_job": job})
    shutil.copy(os.path.join(G, f"pro_{side}_extract.png"), os.path.join(D, f"PROOF_{side}.png")); json.dump(an, open(os.path.join(D, f"PROOF_{side}_anchors.json"), "w"), indent=1)
    man["save_poses"]["AIRBORNE_DIVE"][side] = {"samples": {"MID": {"path": f"PROOF_{side}.png", "anchors": f"PROOF_{side}_anchors.json", "candidate": True, "approved": False, "id": job, "note": "perspective proof"}}}
    print(side, "pixels", an["pixels"], "bbox", an["bbox"], "lead", an["lead_glove"], "ball", an.get("ball_how"))
json.dump(man, open(os.path.join(D, "GK_TWO_POSE_PROOF.json"), "w"), indent=1); print("manifest written")
