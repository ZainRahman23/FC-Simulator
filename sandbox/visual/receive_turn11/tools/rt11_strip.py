# receive_turn11/tools/rt11_strip.py — compose a frame strip from the event stills of a capture (e01_<event>_t±x.jpg …): one row (or `cols` per row)
#   python3 rt11_strip.py <stills dir> <out.jpg> <ffmpeg> [crop width of the 3D view, 0 = the whole frame] [tile width] [cols]
import glob, os, subprocess, sys
D, OUT, FF = sys.argv[1], sys.argv[2], sys.argv[3]; CW = int(sys.argv[4]) if len(sys.argv) > 4 else 0; TW = int(sys.argv[5]) if len(sys.argv) > 5 else 300; COLS = int(sys.argv[6]) if len(sys.argv) > 6 else 99
fs = sorted(glob.glob(os.path.join(D, "e*.jpg"))) or sorted(glob.glob(os.path.join(D, "t*.jpg")), key=lambda f: float(os.path.basename(f)[1:-4]))
n = len(fs); ins = []; [ins.extend(["-i", f]) for f in fs]
from PIL import Image
w0, h0 = Image.open(fs[0]).size; cw = CW or w0; th = int(round(h0 * TW / cw)); cols = min(COLS, n)
sc = "".join(f"[{i}:v]crop={cw}:{h0}:0:0,scale={TW}:{th}[s{i}];" for i in range(n)); lay = "|".join(f"{(i % cols) * TW}_{(i // cols) * th}" for i in range(n))
fc = sc + "".join(f"[s{i}]" for i in range(n)) + (f"xstack=inputs={n}:layout={lay}:fill=black[o]" if n > 1 else "copy[o]")
subprocess.run([FF, "-loglevel", "error", "-y", *ins, "-filter_complex", fc, "-map", "[o]", "-frames:v", "1", OUT], check=True); print("strip", OUT, n)
