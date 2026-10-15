#!/bin/bash
# PVP-1 COLLISION REVIEW renders (presentation only: the frozen canonical PVP-1 records are read; nothing is re-simulated or changed).
# Window: first player–player contact −0.30 s → +0.75 s (steps 46 … 298; first contact = step 118 in both PVP-F2 and PVP-F3).
# Each main panel's camera tracks the smoothed 3-D midpoint of ITS OWN two players' COMs, at a distance that grows with their separation (minimum d at
# contact); the TWIN inset uses the PVP-F2 camera path.
# Angles (az from the tackler's travel: 0 = in front of it, 90 = its left = the side the recipient comes from; el; d; vertical fov 34°):
#   CLOSE    az 60, el 12, d 4.0        the primary clean close view (1×, 0.25×, 0.10×)
#   SIDE     az 90, el 9, d 4.0         perpendicular to the tackle direction
#   FRONT34  az 35, el 16, d 4.0        in front of the tackler, on the recipient's side: both players' legs
#   REAR34   az −140, el 16, d 4.0      behind the tackler, other side: both players' legs
#   DIAG     az 60 / 90, el 18 / 10, d 4.2   colliders, first-contact point, contact normal + force, struck / support foot, both COMs
# Layout: PVP-F2 | PVP-F3 (640 × 540 each) + the TWIN inset (320 × 270, top right). Stills at −100 / −50 / 0 / +25 / +50 / +100 / +200 / +400 ms.
# usage (worktree root): pvp1_collision_render.sh <scratch S> <runs dir> <out review dir>
S=$1; RUNS=$2; OUT=$3; Q=$S/pvp1/collision; rm -rf $Q; mkdir -p $Q/clips $Q/vid $OUT/collision/video $OUT/collision/stills
export LV2_ARCHIVE=$S/lv2arch PUPPETEER_NODE_MODULES=$S/node_r/node_modules MP4_MUXER=$S/node_r/node_modules/mp4-muxer/build/mp4-muxer.js
R=review_artifacts/physical_character_v2/pvp1_running/render
for k in F2 F3; do node $R/pvp1_collision_clip.mjs --run $RUNS/CANON_$k.json.gz --key C_$k --out $Q/clips > $Q/clip_$k.log 2>&1 || { tail -3 $Q/clip_$k.log; exit 1; }; done
node $R/pvp1_collision_clip.mjs --run $RUNS/CANON_TWIN.json.gz --key C_TWIN --out $Q/clips --focus $RUNS/CANON_F2.json.gz > $Q/clip_TWIN.log 2>&1 || { tail -3 $Q/clip_TWIN.log; exit 1; }
python3 - "$Q" <<'PY'
import json, sys
Q = sys.argv[1]; V = []
ANG = { "CLOSE": (60, 12, 4.0), "SIDE": (90, 9, 4.0), "FRONT34": (35, 16, 4.0), "REAR34": (-140, 16, 4.0), "DIAG": (60, 18, 4.2), "DIAGSIDE": (90, 10, 4.2) }
STILLS = [94, 106, 118, 124, 130, 142, 166, 214]
def view(name, every, rate, stills=False):
    az, el, d = ANG[name]; diag = name.startswith("DIAG")
    p = lambda k, l, extra={}: { "k": k, "az": az, "el": el, "d": d, "fov": 34, "diag": diag, "l": l, **extra }
    base = { "every": every, "rate": rate, "fromN": 46, "to": 298 }
    if stills: base["stillsN"] = STILLS
    V.append({ "id": f"{name}_{rate.replace('×','x').replace('.','')}", "W": 640, "H": 540, **base, "panels": [p("C_F2", "PVP-F2 (SP2F2)"), p("C_F3", "PVP-F3 (SP2F3)")] })
    V.append({ "id": f"{name}_{rate.replace('×','x').replace('.','')}_TWIN", "W": 320, "H": 270, **base, "panels": [p("C_TWIN", "TWIN · no tackle")] })
for n in ["CLOSE", "SIDE", "FRONT34", "REAR34", "DIAG", "DIAGSIDE"]:
    view(n, 4, "1×"); view(n, 1, "0.25×", stills=True)
for n in ["CLOSE", "DIAG"]: view(n, 1, "0.10×")
json.dump(V, open(Q + "/views.json", "w"), indent=1)
PY
node $R/pvp1_collision_capture.cjs --clips $Q/clips --views $Q/views.json --archive $S/lv2arch --out $Q/vid > $Q/capture.log 2>&1 || { tail -5 $Q/capture.log; exit 1; }
# compose: PVP-F2 | PVP-F3 | TWIN inset (top right, half size); 0.10× = the 0.10× capture with every frame shown 2.5× longer (frame duplication only)
for f in $Q/vid/*_TWIN.mp4; do b=$(basename $f _TWIN.mp4); slow=1; [[ $b == *_010x ]] && slow=2.5
  $S/ffmpeg -loglevel error -y -i $Q/vid/$b.mp4 -i $f -filter_complex "[1:v]crop=320:270:0:0,pad=320:574:0:0:color=0x0b0f0d[t];[0:v][t]hstack=2,setpts=$slow*PTS,fps=60[o]" -map "[o]" -c:v libx264 -pix_fmt yuv420p -crf 18 $OUT/collision/video/$b.mp4 || exit 1; done
cp $Q/vid/CAPTURE.json $OUT/collision/video/CAPTURE.json; cp $Q/clips/meta.json $OUT/collision/video/CLIPS_META.json
# stills: per view, a grid (columns −100 … +400 ms; rows PVP-F2, PVP-F3, TWIN) + every single frame
python3 - "$Q/vid/stills" "$OUT/collision/stills" <<'PY'
import sys, os, glob
from PIL import Image, ImageDraw, ImageFont
FT = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 26); FS = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 18)
src, dst = sys.argv[1], sys.argv[2]; os.makedirs(dst, exist_ok=True)
N = [94, 106, 118, 124, 130, 142, 166, 214]; LB = ["−100 ms", "−50 ms", "CONTACT", "+25 ms", "+50 ms", "+100 ms", "+200 ms", "+400 ms"]
for name in ["CLOSE", "SIDE", "FRONT34", "REAR34", "DIAG", "DIAGSIDE"]:
    cells = []
    for n in N:
        a = Image.open(f"{src}/{name}_025x_n{n}.png").convert("RGB"); t = Image.open(f"{src}/{name}_025x_TWIN_n{n}.png").convert("RGB")
        f2, f3, tw = a.crop((0, 0, 640, 540)), a.crop((640, 0, 1280, 540)), t.crop((0, 0, 320, 270))
        for lab, im in [("F2", f2), ("F3", f3)]: im.save(f"{dst}/{name}_{lab}_{LB[N.index(n)].replace('−','m').replace('+','p').replace(' ','')}.jpg", quality=92)
        cells.append((f2, f3, tw))
    W, H = 400, 338; g = Image.new("RGB", (W * 8, H * 2 + 169 + 40 + 34), (11, 15, 13)); d = ImageDraw.Draw(g)
    for i, (f2, f3, tw) in enumerate(cells):
        d.text((i * W + 12, 6), LB[i], font=FT, fill=(255, 80, 80) if LB[i] == "CONTACT" else (255, 231, 163))
        g.paste(f2.resize((W, H)), (i * W, 40)); g.paste(f3.resize((W, H)), (i * W, 40 + H)); g.paste(tw.resize((200, 169)), (i * W + 100, 40 + 2 * H))
    d.text((10, 40 + 2 * H + 169 + 8), "rows: PVP-F2 · PVP-F3 · TWIN (the same recipient, no tackle; PVP-F2 camera)", font=FS, fill=(200, 210, 205)); g.save(f"{dst}/GRID_{name}.jpg", quality=90)
print("stills written")
PY
ls -la $OUT/collision/video | head -30; ls $OUT/collision/stills | wc -l
