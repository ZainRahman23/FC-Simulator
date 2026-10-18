# receive_kill12/tools/rk_compose.py — compose the matched-rating comparison: 2×4 side-by-side video + still grid per case
#   python3 rk_compose.py <compare dir> <ffmpeg>
import subprocess, sys, os
OUT, FF = sys.argv[1], sys.argv[2]; BCS = [40, 50, 60, 70, 75, 80, 90, 99]; TIMES = ["-0.10", "+0.00", "+0.25", "+0.50", "+0.80", "+1.20"]
for cid in ["normal", "hard", "thighM", "chestM", "headM"]:
    T = os.path.join(OUT, "tiles"); ins = []
    for bc in BCS: ins += ["-i", os.path.join(T, f"{cid}_bc{bc}.mp4")]
    subprocess.run([FF, "-loglevel", "error", "-y", *ins, "-filter_complex", "xstack=inputs=8:layout=0_0|w0_0|0_h0|w0_h0|0_h0+h1|w0_h0+h1|0_h0+h1+h2|w0_h0+h1+h2[v]", "-map", "[v]", "-c:v", "libx264", "-crf", "21", "-pix_fmt", "yuv420p", os.path.join(OUT, f"{cid}_compare.mp4")], check=True)
    subprocess.run([FF, "-loglevel", "error", "-y", "-ss", "1.6", "-i", os.path.join(OUT, f"{cid}_compare.mp4"), "-frames:v", "1", "-vf", "scale=960:-1", os.path.join(OUT, f"{cid}_compare.jpg")], check=True)
    ins = []; 
    for bc in BCS:
        for t in TIMES: ins += ["-i", os.path.join(T, f"{cid}_bc{bc}", f"t{t}.jpg")]
    NR = len(BCS); lay = "|".join(f"{k*320}_{r*178}" for r in range(NR) for k in range(6)); sc = "".join(f"[{n}:v]scale=320:178[s{n}];" for n in range(6 * NR)) + "".join(f"[s{n}]" for n in range(6 * NR))
    subprocess.run([FF, "-loglevel", "error", "-y", *ins, "-filter_complex", sc + f"xstack=inputs={6 * NR}:layout={lay}[o]", "-map", "[o]", "-frames:v", "1", os.path.join(OUT, f"{cid}_grid.jpg")], check=True)
    print("composed", cid)
