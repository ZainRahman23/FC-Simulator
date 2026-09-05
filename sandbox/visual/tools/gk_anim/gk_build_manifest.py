#!/usr/bin/env python3
"""Build assets/visual_v1/goalkeeper/GK_ANIM_V1.json from the declarative CLIP_TABLE below, (re)measuring every clip's
per-frame anchors with gk_measure_clip.py. Repeatable: add a PixelLab clip folder under
assets/visual_v1/originals/character_f4838361/anim/<clip>/<direction>/<i>.png, add a row here, rerun.

  python3 gk_build_manifest.py            (from anywhere)

Row fields: family (+ optional families the clip also serves), kind = action | loop | recover, variants = (dir, side,
folder, use = frame indices in play order, contact = POSITION in `use` reached at the simulation contact/arrival,
hold = POSITION shown while the ball is held, ground = ref (frame-0 ground row) | bottom (per-frame), anchor = pivot (canvas centre: PixelLab keeps the character root there; default) | feet (planted-foot x),
ik = True (2-D glove-vs-simulation-hand frame selection) | "y" (height only: side-view art whose horizontal axis is not the lateral one) | False,
stride_m for loops, note = honest description of what the art can and cannot represent)."""
import json, os, subprocess, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))
ASSETS = os.path.join(ROOT, "assets", "visual_v1"); ANIM = "originals/character_f4838361/anim"; ANCH = "goalkeeper/anchors/clips"
MEASURE = os.path.join(os.path.dirname(__file__), "gk_measure_clip.py")
def V(dir, folder, use, contact, hold=None, side=None, ground="ref", anchor="pivot", stride_m=None, note="", ik=True):
    return dict(dir=dir, side=side, folder=folder, use=use, contact=contact, hold=hold if hold is not None else len(use) - 1, ground=ground, anchor=anchor, stride_m=stride_m, note=note, ik=ik)
SIDE_VIEW = "east/west side view: the body extends along the screen x axis (the keeper's FORWARD axis); the real lateral displacement is along screen y and is carried by the simulation root — geometric contact sync is NOT achievable with this art (flagged); needs 'toward/away from viewer' frames"
CLIP_TABLE = {
    "chest_catch": dict(family="CHEST_CATCH", families=["CHEST_CATCH", "SUPPORTED_CATCH"], kind="action", note="hands forward at chest height, absorb into the sternum, hug",
        variants=[V("east", "chest_catch/east", [1, 2, 3, 4, 5, 6, 7, 8], contact=3, hold=7, note="ball-free mime (PixelLab group c2e03d1b); gloves forward at frame 4, hug from frame 6"), V("south", "chest_catch/south", [1, 2, 3, 4, 5, 6, 7, 8], contact=4, hold=7, note="ball-free mime; arms wide 3-5, hands meet at 6, hug 7-8")]),
    "low_gather": dict(family="LOW_GATHER", kind="action", note="deep crouch, gloves to the ground, scoop and clutch",
        variants=[V("east", "low_gather/east", [1, 2, 3, 4, 5, 6, 7, 8], contact=3, hold=7, note="ball-free mime (PixelLab group 3f2dbaef); gloves at the ground 4-6, rise 7-8"), V("south", "low_gather/south", [1, 2, 3, 4, 5, 6, 7, 8], contact=4, hold=7, note="ball-free mime; gloves at the ground 5-6, rise 7-8")]),
    "low_collapse": dict(live=False, retired_note="V1 side-view dive art REJECTED in live review 2026-09-04 (body along the forward axis, same pose at every height); kept for comparison only", family="LOW_COLLAPSE", families=["LOW_COLLAPSE", "FULL_STRETCH_LOW"], kind="action", note="collapse onto the near side, arms down to the ball",
        variants=[V("east", "low_collapse_right/east", [1, 2, 3, 4, 5, 6, 7, 8], contact=6, hold=7, side="RIGHT", note=SIDE_VIEW, ik="y")]),
    "medium_dive": dict(live=False, retired_note="V1 side-view dive art REJECTED in live review 2026-09-04 (body along the forward axis, same pose at every height); kept for comparison only", family="MEDIUM_DIVE", families=["MEDIUM_DIVE", "FULL_STRETCH_MID"], kind="action", note="push off, body horizontal at hip height, arms leading",
        variants=[V("east", "medium_dive_right/east", [1, 2, 3, 4, 5, 6, 7, 8], contact=5, hold=7, side="RIGHT", note=SIDE_VIEW, ik="y")]),
    "high_dive": dict(live=False, retired_note="V1 side-view dive art REJECTED in live review 2026-09-04 (body along the forward axis, same pose at every height); kept for comparison only", family="HIGH_DIVE", families=["HIGH_DIVE", "FULL_STRETCH_HIGH"], kind="action", note="full-stretch launch, arm high, lands on forearm/side",
        variants=[V("east", "high_dive_right/east", [1, 2, 3, 4, 5, 6, 7, 8], contact=6, hold=7, side="RIGHT", note=SIDE_VIEW, ik="y")]),
    "foot_save": dict(family="FOOT_SAVE", kind="action", note="upright reflex leg extension; frames 5-6 (high kick) dropped",
        variants=[V("east", "foot_save_right/east", [1, 2, 3, 4, 7, 8], contact=3, hold=3, side="RIGHT", note="side view: the leg extends forward on screen (the simulation leg tip is lateral); flagged", ik="y")]),
    "shuffle": dict(family="SHUFFLE", families=["SHUFFLE", "CROSSOVER"], kind="loop", note="crouched lateral shuffle cycle; odometer-driven (root travel), reversed for the other side where no mirror applies",
        variants=[V("east", "shuffle_right/east", [1, 2, 3, 4, 5, 6, 7, 8], contact=7, side="RIGHT", anchor="pivot", stride_m=0.9), V("south", "shuffle_right/south", [1, 2, 3, 4, 5, 6, 7, 8], contact=7, side="RIGHT", anchor="pivot", stride_m=0.9),
                  V("south-west", "shuffle_right_crouch/south-west", [1, 2, 3, 4, 5, 6, 7, 8], contact=7, side="RIGHT", anchor="pivot", ground="bottom", stride_m=0.9, note="2026-09-05 readiness calibration vs WEST: PixelLab group ba999c22 (v3) shuffle frames; frames 4-6 re-authored as a deep ready crouch and 7 as a slight one with edit_image_pixen (non-Pro, seed 7) so the cycle carries WEST's crouch/rise amplitude in this perspective (shuffle_right_crouch/); ground=bottom keeps the feet on the root row"),
                  V("north-west", "shuffle_right/north-west", [1, 2, 3, 6, 7, 8, 7, 6], contact=7, side="RIGHT", anchor="pivot", ground="bottom", stride_m=0.9, note="2026-09-05 readiness calibration vs WEST: PixelLab group ba999c22 (v3) frames unchanged, re-sequenced 1,2,3,6,7,8,7,6 so the clip's own crouched frames 7-8 form the crouch phase (body 101→92→101 px, WEST 100→90→97); ground=bottom keeps the feet on the root row")]),
    "recover": dict(family="RECOVER", kind="recover", note="PixelLab 'getting-up' template: sit → kneel → stand; ground = per-frame bottom row",
        variants=[V("east", "recover_getting_up/east", [0, 1, 2, 3, 4], contact=4, ground="bottom"), V("south", "recover_getting_up/south", [0, 1, 2, 3], contact=3, ground="bottom", note="frame 4 dropped (template shows the back of the head)")]),
}
man_path = os.path.join(ASSETS, "goalkeeper", "GK_ANIM_V1.json")
man = json.load(open(man_path)) if os.path.exists(man_path) else {"version": 1}
man["version"] = 2
man["notes"] = ["GK Animation V1 asset manifest. states = full 8-direction pose sets (PixelLab character states of GK_BASE_V1); clips = authored frame sequences (variants per direction/side, mirror derived at runtime). Missing directions within 45° use the nearest authored variant (flagged DIR-APPROX); beyond that the runtime shows a labelled temporary representation.",
                "Generated by sandbox/visual/tools/gk_anim/gk_build_manifest.py — edit the CLIP_TABLE there, not this file."]
man.setdefault("states", {"base": {"path": "originals/character_f4838361/idle/{direction}.png", "anchors": "goalkeeper/anchors/base.json"},
                          "set": {"path": "originals/character_f4838361/set/{direction}.png", "anchors": "goalkeeper/anchors/set.json", "optional": True, "pixellab_state_id": "0808086b-027d-4114-a53a-efd11a8178f9"}})
clips = {}
os.makedirs(os.path.join(ASSETS, ANCH), exist_ok=True)
for name, row in CLIP_TABLE.items():
    variants = []
    for v in row["variants"]:
        folder = os.path.join(ASSETS, ANIM, v["folder"])
        if not os.path.isdir(folder): print("MISSING", folder); continue
        anch = "%s/%s.json" % (ANCH, v["folder"].replace("/", "_"))
        subprocess.run([sys.executable, MEASURE, folder, os.path.join(ASSETS, anch)], check=True, stdout=subprocess.DEVNULL)
        variants.append({k: v[k] for k in ("dir", "side", "use", "contact", "hold", "ground", "anchor", "stride_m", "note", "ik") if v[k] is not None and v[k] != ""} | {"frames": "%s/%s/{i}.png" % (ANIM, v["folder"]), "anchors": anch})
    clips[name] = {k: row[k] for k in ("family", "families", "kind", "note", "live", "retired_note") if k in row} | {"variants": variants}
man["clips"] = clips
json.dump(man, open(man_path, "w"), indent=1); print("wrote", man_path, "clips", len(clips), "variants", sum(len(c["variants"]) for c in clips.values()))
