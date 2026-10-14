# SP2D reference crop that FOLLOWS the slider (presentation only; third-party footage → local, gitignored output, never committed).
# For every video frame from <start_s> to the clip end: a W×H window centred on the slider (REFERENCE2_tracks.json slider_auto_tracks: mean of the shirt
# (trunk) and shorts (pelvis) centroids, linearly interpolated between tracked frames, held after the last), scaled to 480×400, written as PNG frames.
# usage: python3 sp2d_ref_track.py <ffmpeg> <ref.mov> <REFERENCE2_tracks.json> <start_s> <out_dir> [W H]
import json, subprocess, sys, os, glob
from PIL import Image
ff, ref, tracks, start, out = sys.argv[1], sys.argv[2], sys.argv[3], float(sys.argv[4]), sys.argv[5]
W, H = (int(sys.argv[6]), int(sys.argv[7])) if len(sys.argv) > 7 else (300, 250)
os.makedirs(out, exist_ok=True); raw = os.path.join(out, "_raw"); os.makedirs(raw, exist_ok=True)
n0 = int(round(start * 60)); subprocess.run([ff, "-loglevel", "error", "-y", "-i", ref, "-vf", f"select='gte(n\\,{n0})'", "-vsync", "0", "-start_number", str(n0), os.path.join(raw, "f%05d.png")], check=True)
T = sorted(((x["frame"], [(x["trunk_shirt_centroid_img"][0] + x["pelvis_shorts_centroid_img"][0]) / 2, (x["trunk_shirt_centroid_img"][1] + x["pelvis_shorts_centroid_img"][1]) / 2])
            for x in json.load(open(tracks))["slider_auto_tracks"] if x.get("trunk_shirt_centroid_img") and x.get("pelvis_shorts_centroid_img")), key=lambda q: q[0])
def centre(n):
    if n <= T[0][0]: return T[0][1]
    for (a, pa), (b, pb) in zip(T, T[1:]):
        if a <= n <= b: u = (n - a) / (b - a); return [pa[0] + u * (pb[0] - pa[0]), pa[1] + u * (pb[1] - pa[1])]
    return T[-1][1]
files = sorted(glob.glob(os.path.join(raw, "f*.png")))
for i, fp in enumerate(files):
    n = int(os.path.basename(fp)[1:6]); im = Image.open(fp).convert("RGB"); cx, cy = centre(n); x0 = int(round(cx - W / 2)); y0 = int(round(cy - H * 0.55))
    x0 = max(0, min(im.width - W, x0)); y0 = max(0, min(im.height - H, y0)); im.crop((x0, y0, x0 + W, y0 + H)).resize((480, 400), Image.LANCZOS).save(os.path.join(out, f"c{i:05d}.png"))
for fp in files: os.remove(fp)
os.rmdir(raw); print("frames", len(files), "from video frame", n0, "track frames", T[0][0], "…", T[-1][0])
