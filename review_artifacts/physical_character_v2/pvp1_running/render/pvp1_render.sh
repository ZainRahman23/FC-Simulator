#!/bin/bash
# PVP-1 review renders (presentation only: records are read, nothing is re-simulated). Our renders → pvp1_running/review/video/ (in Git);
# the REFERENCE3 composites → pvp1_running/review/local_reference/ (gitignored: third-party footage never enters Git).
# Window: first player–player contact −0.5 s → +2.0 s. One camera path per condition (the PVP-F2 record's smoothed midpoint of both pelvises),
# identical for PVP-F2, PVP-F3 and the TWIN. Headings: the tackler travels at viewer heading 0, the recipient at −135.
#   R34      rear 3/4 behind the tackler (≈ the REFERENCE3 camera)            RSIDE   the recipient's left side (the sweep and the fall across the frame)
#   RFRONT34 in front of the recipient, 3/4                                   GAME    the gameplay camera (zoom 1.6)
#   DIAG     colliders + joint skeletons of both, turf contacts (recipient feet green), player–player contacts (red), no meshes
# usage (worktree root): pvp1_render.sh <scratch S> <runs dir> <out review dir>
S=$1; RUNS=$2; OUT=$3; Q=$S/pvp1/render; [ -z "$REF_ONLY" ] && rm -rf $Q; mkdir -p $Q/clips $Q/vid $OUT/video $OUT/local_reference
export LV2_ARCHIVE=$S/lv2arch PUPPETEER_NODE_MODULES=$S/node_r/node_modules MP4_MUXER=$S/node_r/node_modules/mp4-muxer/build/mp4-muxer.js
R=review_artifacts/physical_character_v2/pvp1_running
if [ -z "$REF_ONLY" ]; then
for c in CANON EARLY LATE LIGHT STRONG; do for k in F2 F3 TWIN; do node $R/render/pvp1_clip.mjs --run $RUNS/${c}_$k.json.gz --key ${c}_$k --out $Q/clips --focus $RUNS/${c}_F2.json.gz --from -0.5 --to 2.0 > $Q/clip_${c}_$k.log 2>&1 || { tail -3 $Q/clip_${c}_$k.log; exit 1; }; done; done
python3 - "$Q" <<'PY'
import json, sys
Q = sys.argv[1]; V = []
ANG = { "R34": ("rear34", 0), "RSIDE": ("side", -135), "RFRONT34": ("front34", -135) }
def panel(k, view, l, extra=None):
    p = { "k": k, "l": l, "contacts": True, "hud": True }
    if view == "GAME": p.update({ "view": "game", "zoom": 1.6 })
    else: a, hd = ANG[view.replace("DIAG_", "")]; p.update({ "view": "close", "angle": a, "heading": hd })
    if view.startswith("DIAG"): p.update({ "wire": True, "mesh": False })
    if extra: p.update(extra)
    return p
def vid(id, every, panels): V.append({ "id": id, "every": every, "W": 480, "H": 400, "rate": "1×" if every == 4 else "0.25×", "fromN": -1000, "to": 100000, "panels": panels })
LAB = { "F2": "PVP-F2 (SP2F2)", "F3": "PVP-F3 (SP2F3)", "TWIN": "TWIN: same recipient, no tackle" }
for view in ["R34", "RSIDE", "RFRONT34", "GAME"]:
    vid(f"CANON_{view}_1x", 4, [panel("CANON_" + k, view, LAB[k]) for k in ["F2", "F3"]])
for view in ["R34", "RSIDE"]:
    vid(f"CANON_{view}_025x", 1, [panel("CANON_" + k, view, LAB[k]) for k in ["F2", "F3"]])
vid("CANON_DIAG_RSIDE_025x", 1, [panel("CANON_" + k, "DIAG_RSIDE", LAB[k] + " · diagnostic") for k in ["F2", "F3"]])
vid("CANON_DIAG_R34_1x", 4, [panel("CANON_" + k, "DIAG_R34", LAB[k] + " · diagnostic") for k in ["F2", "F3"]])
for view in ["RSIDE", "R34"]:
    vid(f"CANON_TWIN3_{view}_1x", 4, [panel("CANON_" + k, view, LAB[k]) for k in ["F2", "F3", "TWIN"]])
for c in ["EARLY", "LATE", "LIGHT", "STRONG"]:
    vid(f"{c}_RSIDE_1x", 4, [panel(f"{c}_{k}", "RSIDE", f"{c} · {LAB[k]}") for k in ["F2", "F3", "TWIN"]])
    vid(f"{c}_R34_1x", 4, [panel(f"{c}_{k}", "R34", f"{c} · {LAB[k]}") for k in ["F2", "F3"]])
json.dump(V, open(Q + "/views.json", "w"), indent=1)
PY
node $R/render/pvp1_capture.cjs --clips $Q/clips --views $Q/views.json --archive $S/lv2arch --out $Q/vid ${ONLY:+--only $ONLY} > $Q/capture.log 2>&1 || { tail -5 $Q/capture.log; exit 1; }
for f in $Q/vid/*.mp4; do cp "$f" $OUT/video/; done; cp $Q/vid/CAPTURE.json $OUT/video/CAPTURE.json; cp $Q/clips/meta.json $OUT/video/CLIPS_META.json
fi
# REFERENCE3 | PVP-F2 | PVP-F3 (LOCAL ONLY): REFERENCE3 mirrored (it slides on his right side; ours on the left), cropped on the action, its first
# player contact (the slider's boot reaching the attacker's foot, ≈ 0.72 s ± 0.05 s of the clip, 20 fps frame review) aligned with ours; 1× and 0.25×; height padded with the same 34 px strip as ours
REF="/Users/zainrahman/Downloads/FC Simulator worktrees/_preserved_2026-10-14_evidence_outside_git/slide_phys2/reference/REFERENCE3_2026-10-14_21.06.38.mov"; REF_FC=0.72
for v in R34_1x R34_025x RSIDE_1x; do sl=$([ ${v##*_} = 025x ] && echo 4 || echo 1)
  $S/ffmpeg -loglevel error -y -ss $(python3 -c "print($REF_FC-0.5)") -t 2.5 -i "$REF" -i $OUT/video/CANON_$v.mp4 -filter_complex "[0:v]crop=640:533:20:250,hflip,scale=480:400,setpts=$sl*(PTS-STARTPTS),fps=60,pad=480:434:0:0:color=0x121a16,drawtext=text='REFERENCE3 (mirrored, third-party, local only)':x=10:y=410:fontsize=13:fontcolor=white[r];[r][1:v]hstack=2[o]" -map "[o]" -c:v libx264 -pix_fmt yuv420p -crf 20 -shortest $OUT/local_reference/REF_F2_F3_CANON_$v.mp4 || exit 1; done
ls -la $OUT/video | head -40; ls -la $OUT/local_reference
