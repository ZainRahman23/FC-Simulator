# REVIEW PACK — RIGHT V2 retargeted to the 60° NORTH contact (HIGH trunk + TOP branch), before integration.
#   python3 review_pack_v2b.py <cap_new_high> <cap_rejected_v1> <cap_old_v2> <cap_top> <frames_high> <frames_top> <cont_high.json> <cont_top.json> <out_dir>
# A  new V2 (60°) at normal gameplay speed (GIF, 60 fps + 30 fps)         B  4x slow motion, keeper crop following the keeper
# C  F05 → F06 → F07 → F07b → F08 → F09 → 60° CONTACT strip (in-engine crops at the first tick of each frame + the authored frames at live scale)
# D  TOP branch strip through its approved top-corner contact (same layout)   E  rejected V1 | old V2 (50°) | new V2 (60°), same save, per tick
# F  frame-to-frame continuity (drawn = authored + runtime placement) for both branches, and the largest steps
import sys, os, json, math
from PIL import Image, ImageDraw, ImageFont
CAP_NEW, CAP_V1, CAP_OLD, CAP_TOP, FR_HIGH, FR_TOP, CONT_HIGH, CONT_TOP, OUT = sys.argv[1:10]
os.makedirs(OUT, exist_ok=True)
try: FONT = ImageFont.truetype("/System/Library/Fonts/Menlo.ttc", 12); FONT_B = ImageFont.truetype("/System/Library/Fonts/Menlo.ttc", 15)
except Exception: FONT = ImageFont.load_default(); FONT_B = FONT
S_LIVE = 0.4197


def load_cap(d, prefix):
    t = json.load(open(os.path.join(d, "trace.json")))
    frames = []
    for e in t["trace"]:
        p = os.path.join(d, f"{prefix}_{e['f']:03d}.png")
        if os.path.exists(p): frames.append((e, p))
    return t, frames


def label(im, txt, y=2):
    im = im.convert("RGB"); d = ImageDraw.Draw(im); d.rectangle([0, 0, im.width, 16], fill=(20, 20, 20)); d.text((4, y), txt, fill=(255, 255, 255), font=FONT); return im


def gif(frames, path, duration_ms):
    frames[0].save(path, save_all=True, append_images=frames[1:], duration=duration_ms, loop=0, optimize=False)


def keeper_crop(img, e, clip, w=110, h=124, zoom=4):
    sx, sy = e["sp"]; cx = sx - clip["x"]; cy = sy - clip["y"]
    return img.crop((int(cx - w / 2), int(cy - h * 0.78), int(cx + w / 2), int(cy + h * 0.22))).resize((w * zoom, h * zoom), Image.NEAREST)


def drawn_label(e):
    a = (e.get("anim") or {}).get("art") or ""
    if "drawn" in e and e.get("mode") != "live": return f"{e['drawn']} u {e['u']:.2f}" if e.get("u") is not None else e["drawn"]
    if "SEQ " in a: return a.split("  ")[0][:22] + (f" u {e['u']:.2f}" if e.get("u") is not None else "")        # the rejected V1 sequence frames (proto_trace format)
    if "SAVE POSE" in a: return "CONTACT POSE (live)"
    return "LIVE " + a[:26]


def main():
    tn, fn = load_cap(CAP_NEW, "new"); tv, fv = load_cap(CAP_V1, "cur"); to_, fo = load_cap(CAP_OLD, "new"); tt, ft = load_cap(CAP_TOP, "new")
    clip = tn["clip"]; ctk = tn["contactTick"]; cmt = tn["committedTick"]
    # ── A: normal speed (full clip), from 4 ticks before commit to 20 after contact, and 30 fps
    seq = [(e, Image.open(p)) for e, p in fn if cmt - 6 <= e["f"] <= (ctk or cmt + 40) + 24]
    A = [label(im, f"NEW V2 (60°)  tick {e['f']}  {drawn_label(e)}") for e, im in seq]
    gif(A, os.path.join(OUT, "A_new_v2_cw60_normal_speed_60fps.gif"), 17); gif(A, os.path.join(OUT, "A_new_v2_cw60_30fps.gif"), 33)
    # ── B: 4x slow motion keeper crop following the keeper
    B = [label(keeper_crop(im, e, clip), f"NEW V2 4x slow  tick {e['f']}  {drawn_label(e)}") for e, im in seq]
    gif(B, os.path.join(OUT, "B_new_v2_4x_slowmo_keeper.gif"), 67)
    # ── C / D: strips (first tick of each drawn frame + the contact tick), in-engine on top, authored at live scale below
    def strip(t, frames, fr_dir, keys, out_png, title):
        first = {}; seen = None
        for e, p in frames:
            k = e["drawn"] if e.get("mode") != "live" else None
            if k and k != seen and k in keys and k not in first: first[k] = (e, p)
            seen = k
        cells = [(k, first[k]) for k in keys if k in first]
        if t["contactTick"] is not None:
            e = t["trace"][t["contactTick"]]; cells.append(("CONTACT", (e, os.path.join(os.path.dirname(frames[0][1]), f"{os.path.basename(frames[0][1]).split('_')[0]}_{e['f']:03d}.png"))))
        Z = 4; W = 110 * Z; H = 124 * Z
        meta = json.load(open(os.path.join(fr_dir, "frames.json")))["frames"]; byk = {f["name"].split("_")[0]: f for f in meta}
        sheet = Image.new("RGB", (W * len(cells) + 12, H * 2 + 70), (22, 22, 22)); d = ImageDraw.Draw(sheet); d.text((6, 6), title, fill=(255, 255, 255), font=FONT_B)
        for i, (k, (e, p)) in enumerate(cells):
            x0 = 6 + i * W
            im = keeper_crop(Image.open(p).convert("RGB"), e, t["clip"]); sheet.paste(im, (x0, 30)); d.text((x0, 30 + H + 2), f"in-engine tick {e['f']}  {drawn_label(e)}"[:40], fill=(255, 230, 120), font=FONT)
            f = byk.get(k)
            if f:
                a = Image.open(os.path.join(fr_dir, f["name"] + ".png")).convert("RGBA"); ps = S_LIVE * f.get("pixel_scale", 1.0)
                live = a.resize((max(1, round(a.width * ps * Z)), max(1, round(a.height * ps * Z))), Image.NEAREST)
                cell = Image.new("RGB", (W, H), (40, 90, 40)); rx, ry = W // 2, int(H * 0.78); cell.paste(live, (rx - int(f["root"][0] * ps * Z), ry - int(f["root"][1] * ps * Z)), live)
                dd = ImageDraw.Draw(cell); dd.line([(rx - 5, ry), (rx + 5, ry)], fill=(255, 60, 60)); dd.line([(rx, ry - 5), (rx, ry + 5)], fill=(255, 60, 60))
                sheet.paste(cell, (x0, 30 + H + 20)); d.text((x0, 30 + 2 * H + 22), f"authored {f['name'][:22]}  u {f.get('u')}", fill=(200, 200, 200), font=FONT)
            elif k == "CONTACT": d.text((x0, 30 + H + 40), "the untouched approved PNG (live renderer)", fill=(200, 200, 200), font=FONT)
        sheet.save(out_png)
    strip(tn, fn, FR_HIGH, ["F05", "F06", "F07", "F07b", "F08", "F09"], os.path.join(OUT, "C_strip_F05_to_CONTACT_cw60.png"), "C — F05 → F06 → F07 → F07b → F08 → F09 → 60° CONTACT (in-engine, representative HIGH save; below: the authored frames at live scale, red + = root)")
    strip(tt, ft, FR_TOP, ["F05", "F06t", "F07t", "F08t", "F09t"], os.path.join(OUT, "D_strip_TOP_branch.png"), "D — TOP branch: F05 (shared) → F06t → F07t → F08t → F09t → approved top-corner CONTACT (in-engine, representative TOP save)")
    # ── E: three-way, per tick (same simulation: identical commit/contact ticks are asserted)
    assert tv["committedTick"] == to_["committedTick"] == tn["committedTick"] and tv["contactTick"] == to_["contactTick"] == tn["contactTick"], "ticks differ"
    byf = lambda fr: {e["f"]: (e, p) for e, p in fr}
    Bv, Bo, Bn = byf(fv), byf(fo), byf(fn)
    E = []; E4 = []
    for f in range(cmt - 6, ctk + 24):
        if f not in Bv or f not in Bo or f not in Bn: continue
        panels = []
        for name, (e, p) in (("REJECTED V1 (50° contact)", Bv[f]), ("OLD V2 (50° contact)", Bo[f]), ("NEW V2 (60° contact)", Bn[f])):
            panels.append(label(Image.open(p).convert("RGB"), f"{name}  tick {f}  {drawn_label(e)}"))
        W = sum(p.width for p in panels) + 8; H = panels[0].height
        row = Image.new("RGB", (W, H), (0, 0, 0)); x = 0
        for p in panels: row.paste(p, (x, 0)); x += p.width + 4
        E.append(row)
        k4 = []
        for name, (e, p) in (("V1", Bv[f]), ("OLD V2", Bo[f]), ("NEW V2", Bn[f])):
            k4.append(label(keeper_crop(Image.open(p).convert("RGB"), e, clip, zoom=3), f"{name} tick {f} {drawn_label(e)}"[:40]))
        W4 = sum(p.width for p in k4) + 8; row4 = Image.new("RGB", (W4, k4[0].height), (0, 0, 0)); x = 0
        for p in k4: row4.paste(p, (x, 0)); x += p.width + 4
        E4.append(row4)
    gif(E, os.path.join(OUT, "E_rejectedV1_oldV2_newV2_60fps.gif"), 17); gif(E4, os.path.join(OUT, "E_rejectedV1_oldV2_newV2_3x_slow_keeper.gif"), 50)
    # ── F: continuity tables (drawn + authored) for both branches
    def table(cont, title, y, d):
        st = cont["steps"]; d.text((10, y), title, fill=(255, 230, 120), font=FONT_B); y += 22
        d.text((10, y), f"{'step':38s} {'head':>6s} {'shoulder':>9s} {'pelvis':>7s} {'foot L':>7s} {'foot R':>7s} {'body':>6s} | {'root step':>9s} {'torso len':>9s} {'bbox h':>7s}   (DRAWN = authored + runtime hand-led placement, live px)", fill=(200, 200, 200), font=FONT); y += 16
        worst = {}
        for s in st:
            vals = [s.get("drawn_head"), s.get("drawn_shoulder"), s.get("drawn_pelvis"), s.get("drawn_foot_L"), s.get("drawn_foot_R"), s.get("drawn_body")]
            for k, v in zip(("head", "shoulder", "pelvis", "foot L", "foot R", "body"), vals):
                if v is not None and abs(v) > abs(worst.get(k, (0, ""))[0]): worst[k] = (v, s["from"][:12] + "→" + s["to"][:12])
            line = f"{(s['from'][:17] + ' → ' + s['to'][:17]):38s} " + " ".join(f"{(v if v is not None else 0):6.1f}" if i != 1 else f"{(v if v is not None else 0):9.1f}" for i, v in enumerate(vals)) + f" | {s['root_step']:9.1f} {(s.get('torso_len') or 0):9.2f} {(s.get('bbox_h') or 0):7.1f}"
            d.text((10, y), line, fill=(255, 255, 255), font=FONT); y += 15
        d.text((10, y), "largest: " + " · ".join(f"{k} {v[0]:.1f} px ({v[1]})" for k, v in worst.items()), fill=(255, 200, 120), font=FONT); y += 22
        return y
    ch = json.load(open(CONT_HIGH)); ct_ = json.load(open(CONT_TOP))
    img = Image.new("RGB", (1500, 620), (22, 22, 22)); d = ImageDraw.Draw(img)
    d.text((10, 6), "F — frame-to-frame continuity, RIGHT V2 retargeted to the 60° contact (rejected V1 for reference: 7.2–8.7 px drawn-root step at its base→Pro switch)", fill=(255, 255, 255), font=FONT_B)
    y = table(ch, "HIGH trunk → DIVE_NORTH_MEDHIGH @ 60° CW (representative HIGH save)", 30, d)
    y = table(ct_, "TOP branch → TOP_LEFT_CORNER (representative TOP save)", y + 10, d)
    img.save(os.path.join(OUT, "F_continuity.png"))
    print("review pack written:", sorted(os.listdir(OUT)))


if __name__ == "__main__":
    main()
