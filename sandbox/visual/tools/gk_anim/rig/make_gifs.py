# GIF/strip builders for the dive interpolation test.
#   python3 make_gifs.py frames <frames_dir> <outdir>            — authored frames → strip + GIFs at several speeds (4x nearest)
#   python3 make_gifs.py gameplay <current_dir> <proposed_dir> <outdir> [zoom]   — per-tick screenshots → current / proposed / side-by-side GIFs
import sys, os, json, glob
from PIL import Image, ImageDraw, ImageFont
F = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 13)
def save_gif(frames, path, fps, loop=0):
    dur = int(round(1000 / fps))
    frames[0].save(path, save_all=True, append_images=frames[1:], duration=dur, loop=loop, disposal=2, optimize=False)
def mode_frames(fdir, outdir):
    meta = json.load(open(os.path.join(fdir, "frames.json"))); os.makedirs(outdir, exist_ok=True)
    ims = [Image.open(os.path.join(fdir, f["name"] + ".png")).convert("RGBA") for f in meta["frames"]]
    Z = 4; W = max(i.width for i in ims) * Z; H = max(i.height for i in ims) * Z + 22
    def cell(im, label):
        up = im.resize((im.width * Z, im.height * Z), Image.NEAREST); bg = Image.new("RGB", (W, H), (238, 238, 240)); bg.paste(up, (0, 0), up)
        ImageDraw.Draw(bg).text((4, H - 18), label, font=F, fill=(20, 20, 24)); return bg
    cells = [cell(im, f"{f['name']}  u={f['u']}") for im, f in zip(ims, meta["frames"])]
    for fps, hold in ((6, 1), (12, 1), (24, 1)):
        seq = []
        for c in cells: seq += [c] * hold
        seq += [cells[-1]] * 2   # brief hold on the last frame
        save_gif(seq, os.path.join(outdir, f"authored_frames_{fps}fps_x4.gif"), fps)
    # ping-pong at 12 fps for judging continuity
    save_gif(cells + cells[-2:0:-1], os.path.join(outdir, "authored_frames_pingpong_12fps_x4.gif"), 12)
    print("frame gifs written")
def mode_gameplay(cur_dir, prop_dir, outdir, zoom=2):
    os.makedirs(outdir, exist_ok=True)
    tc = json.load(open(os.path.join(cur_dir, "trace.json"))); tp = json.load(open(os.path.join(prop_dir, "trace.json")))
    n = min(len(tc["trace"]), len(tp["trace"]))
    c0 = tc["committedTick"] or 0; lo = max(0, c0 - 6); hi = min(n, (tc["contactTick"] or c0 + 40) + 50)
    cur = [Image.open(os.path.join(cur_dir, f"cur_{i:03d}.png")).convert("RGB") for i in range(lo, hi)]
    prop = [Image.open(os.path.join(prop_dir, f"prop_{i:03d}.png")).convert("RGB") for i in range(lo, hi)]
    # crop to the keeper area (clip is 460x330 around the root at capture) and zoom with nearest neighbour
    def crop(im): return im.crop((130, 60, 330, 300))
    def label(im, txt, sub):
        d = ImageDraw.Draw(im); d.rectangle([0, 0, im.width, 34], fill=(0, 0, 0)); d.text((6, 2), txt, font=F, fill=(255, 255, 255)); d.text((6, 18), sub, font=F, fill=(180, 220, 180)); return im
    side = []; curz = []; propz = []
    for k, (a, b) in enumerate(zip(cur, prop)):
        i = lo + k; ta = tc["trace"][i]; tb = tp["trace"][i]
        A = crop(a).resize((200 * zoom, 240 * zoom), Image.NEAREST); B = crop(b).resize((200 * zoom, 240 * zoom), Image.NEAREST)
        ua = ta.get("anim") or {}; ub = tb.get("anim") or {}
        A = label(A, f"CURRENT  t={ta['now']:.3f}  u={ta.get('diveU') if ta.get('diveU') is not None else '-'}", (ua.get("art") or "")[:46])
        B = label(B, f"PROPOSED t={tb['now']:.3f}  u={tb.get('u') if tb.get('u') is not None else '-'}  drawn={tb['drawn']}", (ub.get("art") or "")[:46] if tb["drawn"] == "LIVE" else "authored frame " + tb["drawn"])
        s = Image.new("RGB", (A.width * 2 + 8, A.height), (18, 19, 22)); s.paste(A, (0, 0)); s.paste(B, (A.width + 8, 0))
        side.append(s); curz.append(A); propz.append(B)
    for fps in (12, 30, 60):
        save_gif(side, os.path.join(outdir, f"gameplay_side_by_side_{fps}fps.gif"), fps)
    save_gif(curz, os.path.join(outdir, "gameplay_current_30fps.gif"), 30); save_gif(propz, os.path.join(outdir, "gameplay_proposed_30fps.gif"), 30)
    save_gif(side, os.path.join(outdir, "gameplay_side_by_side_slow_8fps.gif"), 8)
    # contact-sheet of the proposed sequence every 3 ticks
    step = 3; cells = propz[::step]; cols = 8; rows = (len(cells) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * (cells[0].width + 6) + 6, rows * (cells[0].height + 6) + 6), (18, 19, 22))
    for k, c in enumerate(cells): sheet.paste(c, (6 + (k % cols) * (c.width + 6), 6 + (k // cols) * (c.height + 6)))
    sheet.save(os.path.join(outdir, "gameplay_proposed_contact_sheet.png"))
    cells = curz[::step]; sheet2 = Image.new("RGB", sheet.size, (18, 19, 22))
    for k, c in enumerate(cells): sheet2.paste(c, (6 + (k % cols) * (c.width + 6), 6 + (k // cols) * (c.height + 6)))
    sheet2.save(os.path.join(outdir, "gameplay_current_contact_sheet.png"))
    # determinism check: the simulation roots must be identical in both runs
    dev = max(abs(tc["trace"][i]["root"][0] - tp["trace"][i]["root"][0]) + abs(tc["trace"][i]["root"][1] - tp["trace"][i]["root"][1]) for i in range(n))
    print(f"gameplay gifs written ({len(side)} frames); max root deviation current vs proposed run: {dev:.6f} m")
if __name__ == "__main__":
    if sys.argv[1] == "frames": mode_frames(sys.argv[2], sys.argv[3])
    else: mode_gameplay(sys.argv[2], sys.argv[3], sys.argv[4], int(sys.argv[5]) if len(sys.argv) > 5 else 2)
