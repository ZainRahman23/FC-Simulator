# BAKE an authored frame set into a runtime sequence asset (generalized from proto_dive/bake_sequence.py):
#   python3 bake_seq.py <frames_dir> <spec.json>
# spec: {"id": "RIGHT_FAR", "asset_dir": "goalkeeper/sequences/RIGHT_FAR", "pose": "DIVE_NORTH_MEDHIGH", "families": [...], "heights": [...],
#        "liveFrom": 0.95, "contactHold": 0.05, "moderateBelow": 0.8, "pres": {...}, "record": "...",
#        "pre": [[key, from, to, ikW], ...], "moderate": {"F06": "F06m", ...}, "post": [[key, from, to, carry], ...],
#        "shared": {"F01": "goalkeeper/sequences/RIGHT_FAR/F01_WEIGHT_SHIFT.png", ...} (frames referenced from another sequence's files),
#        "mirror": false, "facing_frames": {"south-west": {"dir": "<frames_dir>", "keys": ["F01","F02","F03"], "moderate": {}}} }
# Frames are copied crisp (no resampling); anchors carry root, pixel_scale, canvas, gloves, lead_glove, head, pelvis, shoulder, feet.
import sys, os, json, shutil
from PIL import Image
FR, SPEC = sys.argv[1], json.load(open(sys.argv[2]))
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "..", "..")); ASSETS = os.path.join(ROOT, "assets", "visual_v1")
OUT = os.path.join(ASSETS, SPEC["asset_dir"]); os.makedirs(OUT, exist_ok=True)
meta = json.load(open(f"{FR}/frames.json")); F = {f["name"].split("_")[0]: f for f in meta["frames"]}; F.update({f["name"]: f for f in meta["frames"]})
MIRROR = bool(SPEC.get("mirror", False))
def anchors_of(f, width):
    lm = f.get("landmarks") or {}; root = list(f["root"])
    def X(x): return round(width - x, 1) if MIRROR else x
    an = {"root": [X(root[0]), root[1]], "pixel_scale": f.get("pixel_scale", 1.0), "canvas": None, "phase": f["phase"], "note": f["note"], "rig": f["rig"], "sources": f["sources"], "grounded": f["grounded"], "mirrored": MIRROR}
    if lm.get("lead_glove"):
        lg, og = list(lm["lead_glove"])[:2], list(lm.get("other_glove") or lm["lead_glove"])[:2]
        an["gloves"] = [[X(lg[0]), lg[1], 1], [X(og[0]), og[1], 1]]; an["lead_glove"] = [X(lg[0]), lg[1], 1, 0]
    for k in ("head", "pelvis", "shoulder", "foot_L", "foot_R"):
        if lm.get(k): an[k] = [X(lm[k][0]), lm[k][1]]
    return an
MIRROR_KEYS = set(SPEC.get("mirror_keys") or [])
def bake(key):
    global MIRROR
    f = F[key]; src = f"{FR}/{f['name']}.png"; dst = f"{OUT}/{f['name']}.png"
    im = Image.open(src).convert("RGBA"); saved = MIRROR; MIRROR = saved or (key in MIRROR_KEYS)
    if MIRROR: im = im.transpose(Image.FLIP_LEFT_RIGHT)
    im.save(dst)
    an = anchors_of(f, im.width); an["canvas"] = list(im.size); MIRROR = saved
    json.dump(an, open(f"{OUT}/{f['name']}_anchors.json", "w"), indent=1)
    return {"key": key, "path": f"{SPEC['asset_dir']}/{f['name']}.png", "anchors": f"{SPEC['asset_dir']}/{f['name']}_anchors.json", "phase": f["phase"]}
def bake_from(frames_dir, key, subdir):
    """bake one frame from another authored set into asset_dir/<subdir>/ (per-facing variants)"""
    meta2 = json.load(open(f"{frames_dir}/frames.json")); F2 = {f["name"].split("_")[0]: f for f in meta2["frames"]}; F2.update({f["name"]: f for f in meta2["frames"]})
    f = F2[key]; src = f"{frames_dir}/{f['name']}.png"; od = f"{OUT}/{subdir}"; os.makedirs(od, exist_ok=True)
    im = Image.open(src).convert("RGBA")
    if MIRROR: im = im.transpose(Image.FLIP_LEFT_RIGHT)
    im.save(f"{od}/{f['name']}.png"); an = anchors_of(f, im.width); an["canvas"] = list(im.size); json.dump(an, open(f"{od}/{f['name']}_anchors.json", "w"), indent=1)
    return {"path": f"{SPEC['asset_dir']}/{subdir}/{f['name']}.png", "anchors": f"{SPEC['asset_dir']}/{subdir}/{f['name']}_anchors.json"}
def entry(key):
    sh = (SPEC.get("shared") or {}).get(key)
    if sh: e = {"key": key, "path": sh, "anchors": sh[:-4] + "_anchors.json", "phase": "shared", "shared": True}
    else: e = bake(key)
    # FACING VARIANTS: spec "facing_frames": {"south-west": {"dir": "<frames_dir>", "keys": [...], "moderate": {"F06": "F06m"}}, ...}
    for facing, fs in (SPEC.get("facing_frames") or {}).items():
        if key in fs.get("keys", []):
            v = bake_from(fs["dir"], key, facing)
            mk = (fs.get("moderate") or {}).get(key)
            if mk: v["moderate"] = bake_from(fs["dir"], mk, facing)
            e.setdefault("byFacing", {})[facing] = v
    return e
seq = {k: SPEC[k] for k in ("id", "pose", "families", "heights") if k in SPEC}
seq.update({"record": SPEC.get("record", ""), "liveFrom": SPEC.get("liveFrom", 0.95), "contactHold": SPEC.get("contactHold", 0.05), "moderateBelow": SPEC.get("moderateBelow", 0.8),
            "pres": SPEC.get("pres", {"tau": 0.4, "tLand": 0.55, "tEnd": 1.05}), "pre": [], "post": []})
for opt in ("facings", "mirrorFacings", "skipWhen"):
    if opt in SPEC: seq[opt] = SPEC[opt]
MOD = SPEC.get("moderate") or {}
for key, a, b, ikw in SPEC["pre"]:
    e = entry(key); e.update({"from": a, "to": b, "ik": ikw > 0, "ikW": ikw})
    if key in MOD:
        mk = MOD[key]; sh = (SPEC.get("shared") or {}).get(mk)
        m = {"path": sh, "anchors": sh[:-4] + "_anchors.json"} if sh else (lambda r: {"path": r["path"], "anchors": r["anchors"]})(bake(mk))
        e["moderate"] = m
    seq["pre"].append(e)
for key, a, b, carry in SPEC["post"]:
    e = entry(key); e.update({"from": a, "to": b, "carry": carry}); seq["post"].append(e)
json.dump(seq, open(f"{OUT}/sequence.json", "w"), indent=1)
print("baked", seq["id"], len(seq["pre"]), "pre +", len(seq["post"]), "post →", OUT, "(mirror)" if MIRROR else "")
