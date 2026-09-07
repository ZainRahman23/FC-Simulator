# EVIDENCE for the integrated LEFT far-dive sequence: BEFORE (sequences off) vs INTEGRATED on the same live shots.
#   python3 seq_evidence.py <out_dir> live <before_dir> <after_dir> <shot ids csv>      (live_seq_capture.js records)
#   python3 seq_evidence.py <out_dir> ref  <before_dir> <after_dir>                     (proto_trace.js records of the reference save)
# → per case: side-by-side GIFs (gameplay scale 1x and 2x at 60/24/12 fps), a key-tick strip (2 rows), a 4x slow-motion GIF of the
#   integrated sequence, and checks (sim root identity, drawn-root continuity, planted-foot drift, contact-tick pixel identity, frame order).
import sys, os, json, math, glob
from PIL import Image, ImageDraw, ImageFont, ImageChops
OUT, MODE, BEF, AFT = sys.argv[1:5]; os.makedirs(OUT, exist_ok=True)
F = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 12); FB = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 13)
ROOTDIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", ".."))
SEQ = json.load(open(f"{ROOTDIR}/assets/visual_v1/goalkeeper/sequences/LEFT_FAR/sequence.json"))
ANCH = {}
for e in SEQ["pre"] + SEQ["post"]:
    ANCH[e["key"]] = json.load(open(f"{ROOTDIR}/assets/visual_v1/{e['anchors']}"))
    if e.get("moderate"): ANCH[e["key"] + "m"] = json.load(open(f"{ROOTDIR}/assets/visual_v1/{e['moderate']['anchors']}"))
S_LIVE = 0.4197
def save_gif(frames, path, fps): frames[0].save(path, save_all=True, append_images=frames[1:], duration=int(round(1000 / fps)), loop=0, disposal=2, optimize=False)
def label(im, lines, cols):
    d = ImageDraw.Draw(im); d.rectangle([0, 0, im.width, 14 * len(lines) + 4], fill=(0, 0, 0))
    for j, (txt, col) in enumerate(zip(lines, cols)): d.text((4, 2 + 14 * j), txt, font=F, fill=col)
    return im
def load_case(d, sid):
    if MODE == "live":
        tr = json.load(open(f"{d}/shot{sid:03d}_trace.json")); T = tr["trace"]; frames = {t["tick"]: f"{d}/shot{sid:03d}_t{t['tick']:03d}.png" for t in T}
        frames = {k: v for k, v in frames.items() if os.path.exists(v)}
        t0 = T[0]["now"]; ct = next((t["tick"] for t in T if t.get("contact") and t["contact"]["tickT"] >= t0), None)      # this shot's contact (gk.contact persists from the previous shot)
        return {"trace": T, "commit": tr["commitTick"], "contact": ct, "set": tr["backToSet"], "frames": frames, "tkey": "tick", "meta": {k: tr.get(k) for k in ("key", "c", "origin", "aim", "settle", "run")}}
    tr = json.load(open(f"{d}/trace.json")); T = tr["trace"]; frames = {t["f"]: f"{d}/cur_{t['f']:03d}.png" for t in T}
    import re
    for t in T:
        t["tick"] = t["f"]; a = (t.get("anim") or {}); t["art"] = a.get("art"); t["state"] = a.get("state"); t["u"] = t.get("diveU"); t["place"] = a.get("place")
        m = re.match(r"SEQ (\S+) (\S+)", t["art"] or ""); pm = re.search(r"pres \+([\d.]+) m", t["art"] or "")
        if m: t["seq"] = {"key": m.group(2), "mode": "post" if "+" in (t["art"] or "").split(m.group(2))[1][:6] else "pre", "pres": ({"dm": float(pm.group(1)), "sx": 0, "sy": 0} if pm else None)}
    return {"trace": T, "commit": tr["committedTick"], "contact": tr["contactTick"], "set": tr["backToSet"], "frames": frames, "tkey": "f", "meta": tr["shot"]}
def seq_key(t):
    a = (t.get("art") or "")
    if a.startswith("SEQ"): return a.split()[2]
    if "SAVE POSE" in a: return "CONTACT(live)"
    if "recover" in a: return "recover clip"
    if "SET" in a: return "SET"
    return a[:16]
ids = [int(x) for x in sys.argv[5].split(",")] if MODE == "live" else [0]
report = []
for sid in ids:
    try: B = load_case(BEF, sid); A = load_case(AFT, sid)
    except Exception as e: print("skip", sid, e); continue
    name = f"shot{sid:03d}" if MODE == "live" else "reference"
    TB = {t["tick"]: t for t in B["trace"]}; TA = {t["tick"]: t for t in A["trace"]}
    ticks = sorted(set(TB) & set(TA) & set(B["frames"]) & set(A["frames"]))
    if not ticks: print("no common ticks", sid); continue
    c0 = A["commit"]; ct = A["contact"]; bs = A["set"] or ticks[-1]
    lo = max(ticks[0], (c0 or ticks[0]) - 8); hi = min(ticks[-1], bs + 6)
    tk = [t for t in ticks if lo <= t <= hi]
    # ── checks
    rootdev = max(abs(TA[t]["root"][0] - TB[t]["root"][0]) + abs(TA[t]["root"][1] - TB[t]["root"][1]) for t in tk)
    order = []; 
    for t in tk:
        k = seq_key(TA[t]); 
        if not order or order[-1][1] != k: order.append((t, k))
    # drawn-root continuity: sp + placement (+ pres) per tick
    def drawn_root(t):
        sp = t["sp"]; pl = t.get("place") or {}; pr = (t.get("seq") or {}).get("pres") if t.get("seq") else None
        dx = (pl.get("dx") or 0) + (pr["sx"] if pr else 0); dy = (pl.get("dy") or 0) + (pr["sy"] if pr else 0); return (sp[0] + dx, sp[1] + dy)
    jumps = []
    for i in range(1, len(tk)):
        a, b = drawn_root(TA[tk[i - 1]]), drawn_root(TA[tk[i]]); j = math.hypot(a[0] - b[0], a[1] - b[1])
        if j > 0.5: jumps.append((tk[i], round(j, 1)))
    maxjump = max([j for _, j in jumps], default=0)
    # planted-foot drift over the ground frames (F03–F05): foot_L screen position from the frame anchors + drawn root
    feet = []
    for t in tk:
        s = TA[t].get("seq"); 
        if s and s["key"] in ("F03", "F04", "F05"):
            an = ANCH[s["key"]]; ps = S_LIVE * an.get("pixel_scale", 1.0); r = drawn_root(TA[t]); fl = an.get("foot_L")
            if fl: feet.append((t, s["key"], round(r[0] + (fl[0] - an["root"][0]) * ps, 1), round(r[1] + (fl[1] - an["root"][1]) * ps, 1)))
    foot_drift = (max(f[2] for f in feet) - min(f[2] for f in feet), max(f[3] for f in feet) - min(f[3] for f in feet)) if feet else None
    # contact-tick pixel identity (keeper crop)
    box = (130, 50, 330, 300)
    ident = None
    if ct in TB and ct in TA:
        ia = Image.open(A["frames"][ct]).convert("RGB").crop(box); ib = Image.open(B["frames"][ct]).convert("RGB").crop(box)
        diff = ImageChops.difference(ia, ib).getbbox(); ident = diff is None
    # ── side-by-side GIFs (1x gameplay pixels, and 2x)
    side, side2, cu = [], [], []
    for t in tk:
        a = Image.open(A["frames"][t]).convert("RGB").crop(box); b = Image.open(B["frames"][t]).convert("RGB").crop(box)
        ta, tb = TA[t], TB[t]
        b = label(b, [f"BEFORE   tick {t}  t={tb['now']:.2f}" + (f"  u={tb['u']}" if tb.get("u") is not None else ""), ((tb.get('art') or '')[:34])], [(255, 255, 255), (180, 220, 180)])
        a = label(a, [f"INTEGRATED tick {t}  t={ta['now']:.2f}" + (f"  u={ta['u']}" if ta.get("u") is not None else ""), ((ta.get('art') or '')[:34])], [(255, 255, 255), (180, 220, 180)])
        s = Image.new("RGB", (a.width * 2 + 8, a.height), (18, 19, 22)); s.paste(b, (0, 0)); s.paste(a, (a.width + 8, 0)); side.append(s); side2.append(s.resize((s.width * 2, s.height * 2), Image.NEAREST))
        c = Image.open(A["frames"][t]).convert("RGB").crop((150, 80, 310, 300)).resize((640, 880), Image.NEAREST); cu.append(label(c, [f"INTEGRATED tick {t} t={ta['now']:.3f}  {seq_key(ta)}"], [(255, 255, 255)]))
    for fps in (60, 24, 12): save_gif(side, f"{OUT}/{name}_before_vs_integrated_1x_{fps}fps.gif", fps)
    save_gif(side2, f"{OUT}/{name}_before_vs_integrated_2x_24fps.gif", 24); save_gif(cu, f"{OUT}/{name}_integrated_4x_slowmo_15fps.gif", 15)
    # ── key-tick strip (first tick of every drawn key + contact + SET)
    keyt = [t for t, k in order] + [ct]; keyt = sorted(set(x for x in keyt if x is not None and x in TA and x in TB))
    Z = 3; cb = (160, 100, 300, 290); rows = []
    for lab, X, d in (("BEFORE (sequences off)", TB, B), ("INTEGRATED (sequences on)", TA, A)):
        cells = []
        for t in keyt:
            im = Image.open(d["frames"][t]).convert("RGB").crop(cb).resize(((cb[2] - cb[0]) * Z, (cb[3] - cb[1]) * Z), Image.NEAREST); dd = ImageDraw.Draw(im)
            dd.rectangle([0, 0, im.width, 16], fill=(0, 0, 0)); dd.text((3, 1), f"t{t} {'u=' + str(X[t]['u']) if X[t].get('u') is not None else ''} {seq_key(X[t])[:14]}", font=F, fill=(255, 255, 255)); cells.append(im)
        row = Image.new("RGB", (len(cells) * (cells[0].width + 4) + 4, cells[0].height + 24), (18, 19, 22)); ImageDraw.Draw(row).text((4, 4), lab, font=FB, fill=(235, 225, 120))
        for k, c in enumerate(cells): row.paste(c, (4 + k * (c.width + 4), 22))
        rows.append(row)
    st = Image.new("RGB", (max(r.width for r in rows), 30 + sum(r.height + 6 for r in rows)), (18, 19, 22)); dd = ImageDraw.Draw(st)
    cls = next((t.get("cls") for t in A["trace"] if t.get("cls")), None) or {}; pk = next((t.get("seqPick") for t in A["trace"] if t.get("seqPick")), None) or {}
    dd.text((6, 6), f"{name} — {A['meta']}  |  {cls.get('family')} {cls.get('side')} {cls.get('hClass')} norm {cls.get('norm')} {cls.get('tier')}  |  sequence variant {pk.get('variant')}  |  commit t{c0} contact t{ct} SET t{bs}", font=FB, fill=(255, 255, 255)); y = 30
    for r in rows: st.paste(r, (0, y)); y += r.height + 6
    st.save(f"{OUT}/{name}_strip.png")
    rec = {"case": name, "meta": A["meta"], "cls": cls, "variant": pk.get("variant"), "commit": c0, "contact": ct, "backToSet": bs, "sim_root_dev_m": round(rootdev, 6), "frame_order": [f"{k}@{t}" for t, k in order],
           "drawn_root_max_jump_px": maxjump, "drawn_root_jumps": jumps[:12], "planted_foot_drift_px": foot_drift, "planted_foot_samples": feet, "contact_tick_crop_identical": ident,
           "pres_max_m": max([((t.get("seq") or {}).get("pres") or {}).get("dm", 0) or 0 for t in A["trace"] if t.get("seq")], default=0), "diag_ticks_after": sum(1 for t in A["trace"] if t.get("diagnostic"))}
    report.append(rec); print(name, "| frames:", " → ".join(rec["frame_order"]), "| root dev", rec["sim_root_dev_m"], "| max drawn-root jump", maxjump, "| foot drift", foot_drift, "| contact crop identical", ident, "| pres max", rec["pres_max_m"])
json.dump(report, open(f"{OUT}/checks.json", "w"), indent=1); print("evidence written to", OUT)
