# frames.json (author_dive_frames output) → candidate save-pose manifest + per-frame anchors for the in-engine review capture
#   python3 build_engine_manifest.py <frames_dir> <engine_dir> <schedule json string>
import sys, os, json, shutil
FR, EN = sys.argv[1], sys.argv[2]; os.makedirs(EN, exist_ok=True)
sched = json.loads(sys.argv[3]) if len(sys.argv) > 3 else None
meta = json.load(open(f"{FR}/frames.json")); samples = {}
for f in meta["frames"]:
    key = f["name"].split("_")[0]; shutil.copy(f"{FR}/{f['name']}.png", f"{EN}/{f['name']}.png")
    j = f["joints"]; ng = list(j["near_glove"]); fg = list(j["far_glove"])
    an = {"root": f["root"], "gloves": [[ng[0], ng[1], 1], [fg[0], fg[1], 1]], "lead_glove": [ng[0], ng[1], 1, 0], "head": list(j["head"]), "pixel_scale": f.get("pixel_scale", 1.0), "canvas": meta["canvas"],
          "note": f"authored articulated frame {f['name']} (W_SET rig); root = SET ground anchor; u≈{f['u']}"}
    json.dump(an, open(f"{EN}/{f['name']}_anchors.json", "w"), indent=1)
    samples[key] = {"path": f"{f['name']}.png", "anchors": f"{f['name']}_anchors.json", "mirror": False, "approved": True, "candidate": False, "note": an["note"]}
json.dump({"version": 1, "record": "GK_DIVE_INTERPOLATION_TEST candidate frames (review only — never a default asset)", "save_poses": {"CONTEXTUAL": {"ANY": {"samples": samples}}}}, open(f"{EN}/candidate_frames.json", "w"), indent=1)
if sched: json.dump(sched, open(f"{EN}/schedule.json", "w"), indent=1)
print("manifest keys", list(samples))
