"""DEFENDING V1.1 — slide-tackle review media: before (V1 pose, kept as the review-only `reckless_v1` variant) / after (the researched
normal slide) at IDENTICAL authoritative states (the simulation is the same; only the presentation variant differs).
    python3 of_def_slide_media.py <media2 dir> <out img dir>
Inputs (from run3): <media2>/new, <media2>/old (gameplay-camera frames, every tick), views_new / views_old / views_more (orbit renders)."""
import sys, os, json, glob
from PIL import Image, ImageDraw

M, OUT = sys.argv[1:3]; os.makedirs(OUT, exist_ok=True)
CROP = (420, 200, 1080, 720)
def lab(im, text, xy=(8, 6), col=(255, 230, 110)):
    d = ImageDraw.Draw(im); d.rectangle([xy[0] - 4, xy[1] - 3, xy[0] + 7 * len(text) + 4, xy[1] + 13], fill=(0, 0, 0)); d.text(xy, text, fill=col); return im
def game(src, scen, k, scale=0.55):
    f = os.path.join(M, src, f"{scen}_t{k:03d}.jpg"); im = Image.open(f).convert("RGB").crop(CROP); return im.resize((int(im.width * scale), int(im.height * scale)), Image.LANCZOS)
def view(src, scen, k, v, size=300):
    f = os.path.join(M, src, f"{scen}_t{k:03d}_{v}.png"); im = Image.open(f).convert("RGB"); return im.resize((size, size), Image.LANCZOS)
def grid(rows, name, gap=4):
    W = max(sum(i.width for i in r) + gap * (len(r) - 1) for r in rows); H = sum(r[0].height for r in rows) + gap * (len(rows) - 1)
    S = Image.new("RGB", (W, H), (14, 17, 22)); y = 0
    for r in rows:
        x = 0
        for i in r: S.paste(i, (x, y)); x += i.width + gap
        y += r[0].height + gap
    S.save(os.path.join(OUT, name), quality=86); print("wrote", name, S.size)

# 1. before / after, gameplay camera, identical ticks (left-foot and right-foot slides)
for scen in ["sl_win", "sl_left"]:
    ks = [56, 62, 67, 72, 100, 165]
    grid([[lab(game("old", scen, k), f"V1  tick {k}") for k in ks], [lab(game("new", scen, k), f"V1.1 tick {k}") for k in ks]], f"slide_ba_game_{scen}.jpg")
# 2. before / after at the contact tick from four cameras
for scen in ["sl_win", "sl_left"]:
    vs = ["side", "front", "tq", "top"]
    grid([[lab(view("views_old", scen, 67, v), f"V1 contact {v}") for v in vs], [lab(view("views_new", scen, 67, v), f"V1.1 contact {v}") for v in vs]], f"slide_ba_views_{scen}.jpg")
# 3. the revised slide through its phases (side and three-quarter), left foot
ph = [(56, "launch"), (60, "early slide"), (64, "approach"), (67, "CONTACT"), (72, "after contact"), (100, "ground slide"), (150, "ground"), (165, "get-up: kneel"), (180, "crouch -> up")]
grid([[lab(view("views_new", "sl_win", k, "side", 240), f"{n} ({k})") for k, n in ph], [lab(view("views_new", "sl_win", k, "tq", 240), f"{n} ({k})") for k, n in ph]], "slide_new_phases.jpg")
grid([[lab(view("views_old", "sl_win", k, "side", 240), f"V1 {n} ({k})") for k, n in ph]], "slide_old_phases.jpg")
# 4. left / right mirror at the contact tick
grid([[lab(view("views_new", "sl_win", 67, v), f"LEFT foot {v}") for v in ["front", "tq", "top"]], [lab(view("views_new", "sl_left", 67, v), f"RIGHT foot {v}") for v in ["front", "tq", "top"]]], "slide_mirror.jpg")
# 5. the other situations with the revised slide (same simulation as V1)
for scen, ks in [("sl_late", [30, 45, 60, 80, 110, 150]), ("sl_early", [18, 30, 45, 60, 90, 130]), ("sl_loose", [20, 60, 80, 90, 100, 140]), ("sl_from_behind", [60, 75, 85, 90, 110, 150])]:
    ev = json.load(open(os.path.join(M, "new", "probe.json")))["results"][scen]["events"]
    st = next((e["tick"] for e in ev if e["kind"] == "TACKLE_START"), None); tk = next((e for e in ev if e["kind"] == "TACKLE"), None); bc = next((e["tick"] for e in ev if e["kind"] == "TACKLE_BODY_CONTACT"), None)
    if st is not None:
        c = tk["contactTick"] if tk and tk.get("contactTick") else (bc if bc else st + 30); ks = [st, st + 6, c - 4, c, c + 12, c + 50]
    avail = sorted(int(os.path.basename(f).rsplit("_t", 1)[1][:3]) for f in glob.glob(os.path.join(M, "new", scen + "_t*.jpg")))
    ks = [min(avail, key=lambda a: abs(a - k)) for k in ks]
    grid([[lab(game("new", scen, k), f"tick {k}") for k in ks]], f"slide_new_{scen}.jpg")
# 6. animated: revised slide, real time and 0.25x (gameplay camera), and V1 real time for comparison
def anim(src, scen, name, step, dur, k0=40, k1=200):
    fr = [game(src, scen, k, 0.6) for k in range(k0, k1, step) if os.path.exists(os.path.join(M, src, f"{scen}_t{k:03d}.jpg"))]
    fr[0].save(os.path.join(OUT, name), save_all=True, append_images=fr[1:], duration=dur, loop=0, quality=72); print("wrote", name, len(fr))
anim("new", "sl_win", "slide_new_normal.webp", 2, 33); anim("new", "sl_win", "slide_new_slow.webp", 1, 67, 50, 130); anim("old", "sl_win", "slide_old_normal.webp", 2, 33)
anim("new", "sl_left", "slide_new_right_normal.webp", 2, 33)
