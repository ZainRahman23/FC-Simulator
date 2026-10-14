# SP2F3 REFERENCE3 composites (third-party footage → sp2f/v3/review/local_reference/, gitignored; never committed):
#   REF3T_1x / REF3T_025x   REFERENCE3 MIRRORED left↔right (its player slides on his RIGHT side — we see his back and his posting arm is his right — and
#                           its camera is behind him on the posting side: mirrored, it matches our rear 3/4 view of a LEFT-side slide), cropped TIGHT on
#                           the slider's torso + posting arm: the crop centre follows the midpoint of the hand-annotated head and
#                           posting hand (sp2f/v3/evidence/REFERENCE3_arm_annotation.json, linear between annotated frames), 300 × 250 clip px → 480 × 400
#   LREF3_<view>            REFERENCE3 | SP2F2 (current) | SP2F3 (corrected arm), for the rear 3/4 TIGHT and FOCUS views at 1× and 0.25×
# Alignment: clip 0.27 s ↔ sim 0.30 s (≈ 0.12 s before the folded-side landing, clip ≈ 0.40 s ↔ sim ≈ 0.42 s). The clip is shown AS RECORDED ("1×";
# its playback rate is unknown) and 4× slower ("0.25×").
# usage: python3 -I sp2f3_compose_reference.py <ffmpeg> <REFERENCE3 .mov> <annotation json> <our video dir> <out dir>
import json, os, subprocess, sys, tempfile
from PIL import Image, ImageDraw, ImageFont
FF, MOV, ANN, VID, OUT = sys.argv[1:6]; os.makedirs(OUT, exist_ok=True)
A = json.load(open(ANN)); cols = A["cols"]; rows = A["rows"]; ih, iH = cols.index("head"), cols.index("handPost")
pts = [(r[0], ((r[ih][0] + r[iH][0]) / 2, (r[ih][1] + r[iH][1]) / 2)) for r in rows]
def centre(t):
    if t <= pts[0][0]: return pts[0][1]
    for (t0, c0), (t1, c1) in zip(pts, pts[1:]):
        if t <= t1: u = (t - t0) / (t1 - t0); return (c0[0] + (c1[0] - c0[0]) * u, c0[1] + (c1[1] - c0[1]) * u)
    return pts[-1][1]
tmp = tempfile.mkdtemp(); subprocess.run([FF, "-loglevel", "error", "-y", "-ss", "0.27", "-i", MOV, "-vf", "fps=60", "-frames:v", "114", f"{tmp}/f%04d.png"], check=True)
try: font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 16)
except Exception: font = None
os.makedirs(f"{tmp}/c", exist_ok=True)
for i in range(114):
    t = 0.27 + i / 60; im = Image.open(f"{tmp}/f{i + 1:04d}.png").convert("RGB"); cx, cy = centre(t); W, H = 300, 250
    x0 = int(round(min(max(0, cx - W / 2), im.width - W))); y0 = int(round(min(max(0, cy - H / 2), im.height - H)))
    c = im.crop((x0, y0, x0 + W, y0 + H)).resize((480, 400), Image.LANCZOS).transpose(Image.FLIP_LEFT_RIGHT); d = ImageDraw.Draw(c); txt = "REFERENCE3 · MIRRORED · torso + posting arm"
    d.rectangle([4, 4, 12 + (d.textlength(txt, font=font) if font else 300), 26], fill=(0, 0, 0)); d.text((8, 7), txt, fill=(255, 255, 255), font=font); c.save(f"{tmp}/c/c{i:04d}.png")
subprocess.run([FF, "-loglevel", "error", "-y", "-framerate", "60", "-i", f"{tmp}/c/c%04d.png", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", f"{OUT}/REF3T_1x.mp4"], check=True)
subprocess.run([FF, "-loglevel", "error", "-y", "-framerate", "60", "-i", f"{tmp}/c/c%04d.png", "-vf", "setpts=4*PTS,fps=60", "-frames:v", "456", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", f"{OUT}/REF3T_025x.mp4"], check=True)
for v, ref in [("TIGHT_R34_1x", "REF3T_1x"), ("TIGHT_R34_025x", "REF3T_025x"), ("FOCUS_R34_1x", "REF3T_1x"), ("FOCUS_R34_025x", "REF3T_025x")]:
    subprocess.run([FF, "-loglevel", "error", "-y", "-i", f"{OUT}/{ref}.mp4", "-i", f"{VID}/{v}_G.mp4", "-i", f"{VID}/{v}_H.mp4", "-filter_complex",
                    "[0]scale=480:400,setsar=1[r];[1]scale=480:400[a];[2]scale=480:400[b];[r][a][b]hstack=3", "-shortest", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "21", f"{OUT}/LREF3_{v}.mp4"], check=True)
print(sorted(os.listdir(OUT)))
