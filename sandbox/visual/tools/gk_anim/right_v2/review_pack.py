# RIGHT V2 review pack: (B) keyframe strip native + 4×, (C) in-engine CURRENT LIVE (rejected) vs NEW V2 side-by-side GIFs at normal
# speed, (D) 4× slow-motion crop following the keeper SET → contact, (E) contact-transition close-up (last 4 pre-contact frames + the
# approved contact sprite, from the in-engine capture), (F) measurement table image.
#   python3 review_pack.py <current_dir (proto_trace)> <v2_dir (capture_full)> <frames_dir> <continuity.json> <out_dir>
import sys, os, json, glob, math
from PIL import Image, ImageDraw, ImageFont
CUR, V2, FR, CONT, OUT = sys.argv[1:6]; os.makedirs(OUT, exist_ok=True)
F = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 12); FB = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 13)
S_LIVE = 0.4197
tc = json.load(open(os.path.join(CUR, "trace.json"))); tv = json.load(open(os.path.join(V2, "trace.json")))
cur_frames = sorted(glob.glob(os.path.join(CUR, "cur_*.png"))); v2_frames = sorted(glob.glob(os.path.join(V2, "new_*.png")))
n = min(len(cur_frames), len(v2_frames)); kt = tv["contactTick"]; ct = tv["committedTick"]
def label(im, txt, col=(255, 255, 255)):
    d = ImageDraw.Draw(im); d.rectangle([0, 0, im.width, 16], fill=(0, 0, 0)); d.text((4, 2), txt, font=F, fill=col); return im
def art_of(t): a = t.get("anim") or {}; return (a.get("art") or "")[:34]
def drawn_of(t): return t.get("drawn", "LIVE") + ("" if t.get("mode") in ("frame", "pre", "post") else "(" + art_of(t)[:20] + ")")
# ── C: side-by-side at normal speed (60 fps = 1 tick per frame) and 24 fps; frames up to a few ticks after contact
end = min(n, (kt or ct + 40) + 14)
pairs = []
for i in range(end):
    a = Image.open(cur_frames[i]).convert("RGB"); b = Image.open(v2_frames[i]).convert("RGB")
    a = label(a, f"CURRENT LIVE (rejected)  t{i}  {art_of(tc['trace'][i])}", (255, 200, 120)); b = label(b, f"NEW RIGHT V2  t{i}  u {tv['trace'][i].get('u')}  {drawn_of(tv['trace'][i])}", (150, 255, 150))
    w = Image.new("RGB", (a.width + b.width + 6, a.height), (0, 0, 0)); w.paste(a, (0, 0)); w.paste(b, (a.width + 6, 0)); pairs.append(w)
pairs[0].save(os.path.join(OUT, "C_current_vs_v2_60fps.gif"), save_all=True, append_images=pairs[1:], duration=1000 // 60, loop=0)
pairs[0].save(os.path.join(OUT, "C_current_vs_v2_24fps.gif"), save_all=True, append_images=pairs[1:], duration=1000 // 24, loop=0)
# ── D: 4× slow-motion crop following the keeper (V2), SET → contact (+6 ticks), 15 fps of every tick = 4× slower than real time
crops = []
for i in range(end):
    t = tv["trace"][i]; sp = t["sp"]; clip = tv["clip"]; cx, cy = sp[0] - clip["x"], sp[1] - clip["y"]
    im = Image.open(v2_frames[i]).convert("RGB").crop((int(cx - 60), int(cy - 90), int(cx + 60), int(cy + 30))).resize((480, 480), Image.NEAREST)
    crops.append(label(im, f"V2 4× slow  t{i}  u {t.get('u')}  {drawn_of(t)}", (150, 255, 150)))
crops[0].save(os.path.join(OUT, "D_v2_4x_slowmo_keeper_crop.gif"), save_all=True, append_images=crops[1:], duration=1000 // 15, loop=0)
# ── E: contact-transition close-up: the first tick of each of the last 4 pre-contact frames + the contact tick, keeper crop at 6×
seq = []; last = None
for t in tv["trace"]:
    k = t.get("drawn"); 
    if k != last: seq.append((k, t["f"])); last = k
pre = [s for s in seq if s[0] and s[0].startswith("F")][-4:]
cells = [(k, f) for k, f in pre] + [("CONTACT (approved, live renderer)", kt)]
Z = 6; sheet = Image.new("RGB", (len(cells) * 100 * Z, 130 * Z + 30), (24, 26, 30)); d = ImageDraw.Draw(sheet)
for i, (k, f) in enumerate(cells):
    t = tv["trace"][f]; sp = t["sp"]; clip = tv["clip"]; cx, cy = sp[0] - clip["x"], sp[1] - clip["y"]
    im = Image.open(v2_frames[f]).convert("RGB").crop((int(cx - 50), int(cy - 100), int(cx + 50), int(cy + 30))).resize((100 * Z, 130 * Z), Image.NEAREST)
    sheet.paste(im, (i * 100 * Z, 30)); d.text((i * 100 * Z + 6, 6), f"{k}  tick {f}  u {t.get('u')}", font=FB, fill=(255, 255, 255))
sheet.save(os.path.join(OUT, "E_contact_transition_6x.png"))
# ── B: keyframe strip from the authored frames (native + 4×) with the approved contact sprite at the end
meta = json.load(open(os.path.join(FR, "frames.json")))["frames"]; ROOT_A = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "..", "..", "assets", "visual_v1"))
can = json.load(open(os.path.join(ROOT_A, "goalkeeper/contextual/DIVE_NORTH_CW50_anchors.json"))); cpng = Image.open(os.path.join(ROOT_A, "goalkeeper/contextual/DIVE_NORTH_CW50.png")).convert("RGBA")
names = ["SET", "LOAD", "PLANT", "PUSH", "TOE-OFF", "EARLY", "MID", "LATE", "FULL EXT", "LATE B", "CONTACT"]
items = [(f, os.path.join(FR, f["name"] + ".png"), f["root"], f.get("pixel_scale", 1.0)) for f in meta] + [(None, None, can["root"], can["pixel_scale"])]
for Zs, tag in ((1, "native"), (4, "4x")):
    cw, ch = 70 * Zs, 120 * Zs; sheet = Image.new("RGB", (len(items) * cw, ch + 18), (56, 108, 44)); d = ImageDraw.Draw(sheet)
    for i, (f, path, root, ps_) in enumerate(items):
        im = (Image.open(path).convert("RGBA") if path else cpng); ps = S_LIVE * ps_
        big = im.resize((max(1, round(im.width * ps * Zs)), max(1, round(im.height * ps * Zs))), Image.NEAREST)
        cx, cy = i * cw + cw // 2, int(ch * 0.8); sheet.paste(big, (cx - round(root[0] * ps * Zs), cy - round(root[1] * ps * Zs)), big)
        d.line([(cx - 2 * Zs, cy), (cx + 2 * Zs, cy)], fill=(255, 60, 60)); d.text((i * cw + 3, ch + 2), names[i] if i < len(names) else "", font=F, fill=(255, 255, 255))
    sheet.save(os.path.join(OUT, f"B_keyframe_strip_{tag}.png"))
# ── F: measurement table image
C = json.load(open(CONT)); rows = C["rows"]; steps = C["steps"]
img = Image.new("RGB", (1500, 26 * (len(rows) + len(steps)) + 120), (24, 26, 30)); d = ImageDraw.Draw(img); y = 8
d.text((8, y), "F — per frame (live screen px rel. root): head (neck joint) · head Ø · shoulder joint · shoulder width · torso width · pelvis (waist joint) · limb width · bbox height · runtime placement", font=FB, fill=(255, 255, 255)); y += 24
for r in rows:
    d.text((8, y), f"{r['frame'][:24]:24s} head {str(r['head_c']):>14s} Ø{(r['head_diam'] or 0):4.1f}  shoulder {str(r['shoulder_c']):>14s} w{(r['shoulder_w'] or 0):4.1f}  torso w{(r['torso_w'] or 0):4.1f}  pelvis {str(r['pelvis_c']):>14s}  limb {(r['limb_w'] or 0):3.1f}  bbox_h {r['bbox_h']:4.1f}  place {str(r['place']):>12s}", font=F, fill=(230, 230, 230)); y += 22
y += 10; d.text((8, y), "frame-to-frame steps: head · Ø head · shoulder · shoulder width · torso width · pelvis · limb · bbox height · body centre · DRAWN-ROOT STEP (the placement change the runtime would apply)", font=FB, fill=(255, 255, 255)); y += 24
for s in steps:
    col = (255, 150, 150) if (s["root_step"] or 0) > 3 else (230, 230, 230)
    d.text((8, y), f"{s['from'][:16]:16s} → {s['to'][:16]:16s}  head {s['head_c']}  Ø{s['head_diam']}  shoulder {s['shoulder_c']} w{s['shoulder_w']}  torso w{s['torso_w']}  pelvis {s['pelvis_c']}  limb {s['limb_w']}  bbox_h {s['bbox_h']}  body {s['body_c']}  ROOT STEP {s['root_step']}", font=F, fill=col); y += 22
y += 8; w = C["worst"]; d.text((8, y), f"WORST: head {w['head_c']} px · head Ø {w['head_diam']} px · shoulder {w['shoulder_c']} px · torso width {w['torso_w']} px · pelvis {w['pelvis_c']} px · root step {w['root_step']} px   (rejected V1: 7.2–8.7 px root step at the base→Pro switch)", font=FB, fill=(255, 230, 120))
img.save(os.path.join(OUT, "F_measurements.png")); print("review pack written:", os.listdir(OUT))
