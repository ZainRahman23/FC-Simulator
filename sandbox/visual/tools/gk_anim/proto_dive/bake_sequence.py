# BAKE the authored LEFT far-dive frames into a runtime sequence asset: assets/visual_v1/goalkeeper/sequences/LEFT_FAR/
#   frames (crisp PNGs as authored) + per-frame anchors + sequence.json (schedule in the simulation's own u / seconds after endT,
#   hand-led weights, carried-placement factors, presentation-root continuation). The manifest builder merges sequence.json.
#   python3 bake_sequence.py <frames_dir> [asset_dir]
import sys, os, json, shutil
from PIL import Image
FR = sys.argv[1]; ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", ".."))
OUT = sys.argv[2] if len(sys.argv) > 2 else f"{ROOT}/assets/visual_v1/goalkeeper/sequences/LEFT_FAR"; os.makedirs(OUT, exist_ok=True)
meta = json.load(open(f"{FR}/frames.json")); F = {f["name"].split("_")[0]: f for f in meta["frames"]}
# pre-contact frames keyed by the simulation's u (commit → execEnd); the ground preparation is compressed/stretched with execTime by construction
PRE = [("F01", 0.00, 0.05, 0.0), ("F02", 0.05, 0.10, 0.0), ("F03", 0.10, 0.16, 0.0), ("F04", 0.16, 0.25, 0.0), ("F05", 0.25, 0.31, 0.0), ("F05b", 0.31, 0.37, 0.25),
       ("F06", 0.37, 0.46, 0.5), ("F07", 0.46, 0.56, 0.75), ("F07b", 0.56, 0.65, 1.0), ("F07c", 0.65, 0.73, 1.0), ("F08", 0.73, 0.84, 1.0), ("F09", 0.84, 0.95, 1.0)]
MODERATE = {"F06": "F06m", "F07": "F07m"}          # envNorm < moderateBelow → these variants
# post-contact frames keyed by seconds after endT (= max(execEnd, contact tick)); carry = fraction of the frozen contact placement kept
POST = [("F11", 0.05, 0.11, 1.0), ("F11b", 0.11, 0.17, 1.0), ("F12", 0.17, 0.23, 1.0), ("F12b", 0.23, 0.30, 1.0), ("F13", 0.30, 0.37, 1.0), ("F13b", 0.37, 0.45, 1.0), ("F14", 0.45, 0.55, 1.0),
        ("F15a", 0.55, 0.63, 0.85), ("F15a2", 0.63, 0.71, 0.7), ("F15a3", 0.71, 0.79, 0.5), ("F15b", 0.79, 0.88, 0.35), ("F16", 0.88, 0.97, 0.15), ("F17", 0.97, 1.05, 0.0)]
def bake(key):
    f = F[key]; src = f"{FR}/{f['name']}.png"; dst = f"{OUT}/{f['name']}.png"; shutil.copy(src, dst)
    lm = f.get("landmarks") or {}; an = {"root": f["root"], "pixel_scale": f.get("pixel_scale", 1.0), "canvas": list(Image.open(src).size), "phase": f["phase"], "note": f["note"], "rig": f["rig"], "sources": f["sources"], "grounded": f["grounded"]}
    if lm.get("lead_glove"): lg, og = list(lm["lead_glove"])[:2], list(lm.get("other_glove") or lm["lead_glove"])[:2]; an["gloves"] = [[lg[0], lg[1], 1], [og[0], og[1], 1]]; an["lead_glove"] = [lg[0], lg[1], 1, 0]
    for k in ("head", "pelvis", "shoulder", "foot_L", "foot_R"):
        if lm.get(k): an[k] = list(lm[k])[:2]
    json.dump(an, open(f"{OUT}/{f['name']}_anchors.json", "w"), indent=1)
    return {"key": key, "path": f"goalkeeper/sequences/LEFT_FAR/{f['name']}.png", "anchors": f"goalkeeper/sequences/LEFT_FAR/{f['name']}_anchors.json", "phase": f["phase"]}
seq = {"id": "LEFT_FAR", "record": "first production dive sequence: generic far airborne dive to the keeper's LEFT (Refined V2 prototype, 2026-09-06), W-facing rig; the contact keyframe is the live DIVE_SOUTH_CW20 drawn by the save-pose path",
       "pose": "DIVE_SOUTH_MEDHIGH", "families": ["AIRBORNE_DIVE"], "heights": ["MID", "HIGH", "TOP"], "liveFrom": 0.95, "contactHold": 0.05, "moderateBelow": 0.8,
       "pres": {"tau": 0.4, "tLand": 0.55, "tEnd": 1.05, "note": "presentation-only root continuation after execEnd: d(t)=V0·tau·(1-e^(-t/tau)) along the dive direction, V0 = the root's mean dive speed, eased back to the simulation root by tEnd"},
       "pre": [], "post": []}
for key, a, b, ikw in PRE:
    e = bake(key); e.update({"from": a, "to": b, "ik": ikw > 0, "ikW": ikw})
    if key in MODERATE: m = bake(MODERATE[key]); e["moderate"] = {"path": m["path"], "anchors": m["anchors"]}
    seq["pre"].append(e)
for key, a, b, carry in POST:
    e = bake(key); e.update({"from": a, "to": b, "carry": carry}); seq["post"].append(e)
json.dump(seq, open(f"{OUT}/sequence.json", "w"), indent=1)
print("baked", len(seq["pre"]), "pre +", len(seq["post"]), "post frames →", OUT)
