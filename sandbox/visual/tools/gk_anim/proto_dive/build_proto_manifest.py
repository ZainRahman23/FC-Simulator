# frames.json (author_frames output) → candidate save-pose manifest + per-frame anchors for the in-engine review capture.
# Each authored frame becomes a CONTEXTUAL/ANY sample keyed by its short name (F00 … F17); the contact frame is NOT included —
# the live renderer draws the approved DIVE_SOUTH_CW20 itself in the contact window.
#   python3 build_proto_manifest.py <frames_dir> <engine_dir>
import sys, os, json, shutil
FR, EN = sys.argv[1], sys.argv[2]; os.makedirs(EN, exist_ok=True)
meta = json.load(open(f"{FR}/frames.json")); samples = {}
for f in meta["frames"]:
    key = f["name"].split("_")[0]; shutil.copy(f"{FR}/{f['name']}.png", f"{EN}/{f['name']}.png")
    lm = f.get("landmarks") or {}
    an = {"root": f["root"], "pixel_scale": f.get("pixel_scale", 1.0), "canvas": list(__import__("PIL.Image", fromlist=["Image"]).open(f"{FR}/{f['name']}.png").size),
          "note": f"prototype authored frame {f['name']} ({f['rig']}): {f['phase']}"}
    if lm.get("lead_glove"):
        lg, og = list(lm["lead_glove"])[:2], list(lm.get("other_glove") or lm["lead_glove"])[:2]
        an["gloves"] = [[lg[0], lg[1], 1], [og[0], og[1], 1]]; an["lead_glove"] = [lg[0], lg[1], 1, 0]
    if lm.get("head"): an["head"] = list(lm["head"])[:2]
    json.dump(an, open(f"{EN}/{f['name']}_anchors.json", "w"), indent=1)
    samples[key] = {"path": f"{f['name']}.png", "anchors": f"{f['name']}_anchors.json", "mirror": False, "approved": True, "candidate": False, "note": an["note"]}
json.dump({"version": 1, "record": "PROTOTYPE full-stretch LEFT dive — review-harness frames only (never a default asset)", "save_poses": {"CONTEXTUAL": {"ANY": {"samples": samples}}}}, open(f"{EN}/candidate_frames.json", "w"), indent=1)
print("manifest keys", list(samples))
