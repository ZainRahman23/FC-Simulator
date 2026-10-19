# receive_turn1/tools/rt_compose.py — compose captured tiles: a mosaic video + a still grid per group
#   python3 rt_compose.py <clips dir> <ffmpeg> <groups.json>   groups: [{ "id": out name, "tiles": [tile ids], "cols": n, "times": [still names] }]
import json, os, subprocess, sys
OUT, FF, G = sys.argv[1], sys.argv[2], json.load(open(sys.argv[3])); T = os.path.join(OUT, "tiles")
for g in G:
    tiles, cols = g["tiles"], g.get("cols", 2); n = len(tiles); rows = (n + cols - 1) // cols; tw, th = g.get("tw", 640), g.get("th", 360)
    ins = []; [ins.extend(["-i", os.path.join(T, t + ".mp4")]) for t in tiles]
    sc = "".join(f"[{k}:v]scale={tw}:{th}[s{k}];" for k in range(n)); lay = "|".join(f"{(k % cols) * tw}_{(k // cols) * th}" for k in range(n))
    if n == 1: fc = f"[0:v]scale={tw}:{th}[v]"
    else: fc = sc + "".join(f"[s{k}]" for k in range(n)) + f"xstack=inputs={n}:layout={lay}:fill=black[v]"
    subprocess.run([FF, "-loglevel", "error", "-y", *ins, "-filter_complex", fc, "-map", "[v]", "-c:v", "libx264", "-crf", "22", "-pix_fmt", "yuv420p", os.path.join(OUT, g["id"] + ".mp4")], check=True)
    subprocess.run([FF, "-loglevel", "error", "-y", "-ss", str(g.get("poster", 2.4)), "-i", os.path.join(OUT, g["id"] + ".mp4"), "-frames:v", "1", "-vf", "scale=1280:-1", os.path.join(OUT, g["id"] + ".jpg")], check=True)
    times = g.get("times")
    if times:
        sw, sh = g.get("sw", 320), g.get("sh", 180); ins = []
        for t in tiles:
            for s in times: ins.extend(["-i", os.path.join(T, t, f"t{s}.jpg")])
        m = len(tiles) * len(times); sc = "".join(f"[{k}:v]scale={sw}:{sh}[s{k}];" for k in range(m))
        if len(times) == 1: lay = "|".join(f"{(k % cols) * sw}_{(k // cols) * sh}" for k in range(m))     # one moment: the tiles in the mosaic's own layout
        else: lay = "|".join(f"{c * sw}_{r * sh}" for r in range(len(tiles)) for c in range(len(times)))
        subprocess.run([FF, "-loglevel", "error", "-y", *ins, "-filter_complex", sc + "".join(f"[s{k}]" for k in range(m)) + f"xstack=inputs={m}:layout={lay}[o]", "-map", "[o]", "-frames:v", "1", os.path.join(OUT, g["id"] + "_grid.jpg")], check=True)
    print("composed", g["id"])
