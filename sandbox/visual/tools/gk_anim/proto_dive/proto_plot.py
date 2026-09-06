# ROOT MOTION — simulation root vs animation (drawn) root/head/gloves vs ball, current and new, before commit through recovery.
#   python3 proto_plot.py <current_dir> <new_dir> <frames_dir> <out_dir>
import sys, os, json, math
import matplotlib; matplotlib.use("Agg"); import matplotlib.pyplot as plt
CUR, NEW, FR, OUT = sys.argv[1:5]; os.makedirs(OUT, exist_ok=True)
ROOTDIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", ".."))
tc = json.load(open(f"{CUR}/trace.json")); tn = json.load(open(f"{NEW}/trace.json")); meta = json.load(open(f"{FR}/frames.json"))
S_LIVE = 0.4197
fr = {f["name"].split("_")[0]: f for f in meta["frames"]}
an = json.load(open(f"{ROOTDIR}/assets/visual_v1/goalkeeper/contextual/DIVE_SOUTH_CW20_anchors.json")); ps_c = S_LIVE * 0.85
contact_screen = {"head": ((an["head"][0] - an["root"][0]) * ps_c, (an["head"][1] - an["root"][1]) * ps_c), "lead_glove": ((an["lead_glove"][0] - an["root"][0]) * ps_c, (an["lead_glove"][1] - an["root"][1]) * ps_c), "pelvis": ((27 - an["root"][0]) * ps_c, (45 - an["root"][1]) * ps_c)}
set_screen = {"head": (1.3, -33.6), "lead_glove": (-2.1, -23.1), "pelvis": (1.7, -18.9)}
def drawn(tr, t, key):
    """screen positions (absolute) of the drawn root/head/lead glove/pelvis for a tick"""
    sp = t["sp"]; pl = (t.get("anim") or {}).get("place") or {}
    if key == "LIVE":
        art = ((t.get("anim") or {}).get("art") or "")
        if "SAVE POSE" in art: base = contact_screen; dx, dy = pl.get("dx", 0) or 0, pl.get("dy", 0) or 0
        elif "recover" in art: return {"root": (sp[0] + (pl.get("dx", 0) or 0), sp[1] + (pl.get("dy", 0) or 0))}
        else: base = set_screen; dx, dy = 0, 0
    else:
        f = fr[key]; base = f.get("screen") or {}; dx, dy = 0, 0
        if t.get("ikPlace"): dx, dy = t["ikPlace"]["dx"], t["ikPlace"]["dy"]          # the override's own hand-led placement
        elif t.get("off"): dx, dy = t["off"]["dx"], t["off"]["dy"]                     # the frozen contact placement carried into post frames
        if not base: return {"root": (sp[0] + dx, sp[1] + dy)}
    return {"root": (sp[0] + dx, sp[1] + dy), **{k: (sp[0] + dx + v[0], sp[1] + dy + v[1]) for k, v in base.items() if k in ("head", "lead_glove", "pelvis")}}
c0 = tn["committedTick"]; ct = tn["contactTick"]; cm = next(t for t in tc["trace"] if t.get("committed"))["committed"]
t0 = cm["t0"]; execEnd = t0 + cm["execTime"]; contactT = tn["trace"][ct]["contact"]["tickT"]; bs = tn["backToSet"]
fig, ax = plt.subplots(3, 1, figsize=(13, 12), sharex=True)
ts = [t["now"] for t in tn["trace"]]
ax[0].plot(ts, [t["sp"][1] for t in tn["trace"]], "k-", lw=2, label="simulation root (screen y)")
ax[0].plot(ts, [t["sp"][1] + t["pres"]["sy"] if t.get("pres") else float("nan") for t in tn["trace"]], "-", color="tab:orange", lw=2, label="PRESENTATION root (sim root + decaying momentum continuation; review only)")
ax[0].plot(ts, [t["ballSp"][1] for t in tn["trace"]], "--", color="tab:red", label="ball (screen y)")
for tag, tr, col, keyf in (("CURRENT", tc["trace"], "tab:gray", lambda t: "LIVE"), ("NEW", tn["trace"], "tab:blue", lambda t: t["drawn"])):
    D = [drawn(tr, t, keyf(t)) for t in tr]
    ax[0].plot([t["now"] for t in tr], [d["root"][1] for d in D], ".", ms=3, color=col, label=f"{tag} drawn root y (sprite anchor incl. hand-led placement)")
    ax[1].plot([t["now"] for t in tr], [d.get("head", (None, float("nan")))[1] for d in D], ".", ms=3, color=col, label=f"{tag} drawn head y")
    ax[1].plot([t["now"] for t in tr], [d.get("lead_glove", (None, float("nan")))[1] for d in D], "x", ms=3, color=col, label=f"{tag} drawn lead glove y")
    ax[2].plot([t["now"] for t in tr], [d.get("pelvis", (None, float("nan")))[1] for d in D], ".", ms=3, color=col, label=f"{tag} drawn pelvis y")
ax[1].plot(ts, [t["handSp"][1] if t["handSp"] else float("nan") for t in tn["trace"]], "-", color="tab:green", label="simulation hand (screen y)")
ax[1].plot(ts, [t["ballSp"][1] for t in tn["trace"]], "--", color="tab:red", label="ball (screen y)")
ax[2].plot(ts, [t["sp"][1] for t in tn["trace"]], "k-", lw=2, label="simulation root (screen y)")
ax[2].plot(ts, [t["sp"][1] + t["pres"]["sy"] if t.get("pres") else float("nan") for t in tn["trace"]], "-", color="tab:orange", lw=2, label="presentation root (screen y)")
for a in ax:
    for x, lab, col in ((t0, "commit", "k"), (execEnd, "execEnd", "g"), (contactT, "contact", "r"), (tn["trace"][bs]["now"], "live SET", "b")): a.axvline(x, color=col, ls=":", lw=1)
    a.invert_yaxis(); a.legend(loc="lower left", fontsize=8); a.grid(alpha=0.3)
# frame boundaries for the NEW run
prev = None
for t in tn["trace"]:
    if t["drawn"] != prev: ax[0].text(t["now"], tn["trace"][0]["sp"][1] - 62, t["drawn"], fontsize=6, rotation=90, va="bottom"); prev = t["drawn"]
ax[0].set_title(f"{tn['shot']['id']} — screen y (px, down = +) of the simulation root, the drawn sprite root and the ball; NEW frame keys along the top"); ax[1].set_title("drawn head / lead glove vs the simulation hand and ball"); ax[2].set_title("drawn pelvis (hip) vs the simulation root"); ax[2].set_xlabel("t (s)")
fig.tight_layout(); fig.savefig(f"{OUT}/ROOT_MOTION_CURRENT_VS_NEW.png", dpi=110)
# x as well (lateral / depth on screen)
fig2, ax2 = plt.subplots(1, 1, figsize=(13, 4.5))
ax2.plot(ts, [t["sp"][0] for t in tn["trace"]], "k-", lw=2, label="simulation root (screen x)")
ax2.plot(ts, [t["sp"][0] + t["pres"]["sx"] if t.get("pres") else float("nan") for t in tn["trace"]], "-", color="tab:orange", lw=2, label="presentation root (screen x)")
for tag, tr, col, keyf in (("CURRENT", tc["trace"], "tab:gray", lambda t: "LIVE"), ("NEW", tn["trace"], "tab:blue", lambda t: t["drawn"])):
    D = [drawn(tr, t, keyf(t)) for t in tr]
    ax2.plot([t["now"] for t in tr], [d["root"][0] for d in D], ".", ms=3, color=col, label=f"{tag} drawn root x"); ax2.plot([t["now"] for t in tr], [d.get("head", (float("nan"),))[0] for d in D], "x", ms=3, color=col, label=f"{tag} drawn head x")
for x, lab, col in ((t0, "commit", "k"), (execEnd, "execEnd", "g"), (contactT, "contact", "r"), (tn["trace"][bs]["now"], "live SET", "b")): ax2.axvline(x, color=col, ls=":", lw=1)
ax2.legend(loc="lower left", fontsize=8); ax2.grid(alpha=0.3); ax2.set_title("screen x (px) — the whole action stays within ±12 px of the root laterally"); ax2.set_xlabel("t (s)")
fig2.tight_layout(); fig2.savefig(f"{OUT}/ROOT_MOTION_X.png", dpi=110)
# numeric continuity table (NEW): per drawn-frame boundary, the jump of head / lead glove / pelvis / root in screen px
rows = ["| boundary (tick, t) | head Δ | lead glove Δ | pelvis Δ | drawn root Δ |", "|---|---|---|---|---|"]; prev = None; pd = None
for t in tn["trace"]:
    d = drawn(tn["trace"], t, t["drawn"])
    if prev is not None and t["drawn"] != prev and pd:
        def j(k): return f"{math.hypot(d[k][0] - pd[k][0], d[k][1] - pd[k][1]):.1f}" if k in d and k in pd else "–"
        rows.append(f"| {prev} → {t['drawn']} (tick {t['f']}, t {t['now']:.3f}) | {j('head')} | {j('lead_glove')} | {j('pelvis')} | {j('root')} |")
    prev, pd = t["drawn"], d
open(f"{OUT}/CONTINUITY_TABLE.md", "w").write("# Frame-boundary jumps in the NEW run (screen px at the gameplay camera; the sprite root is the simulation root except where the live hand-led placement shifts the contact pose)\n\n" + "\n".join(rows) + "\n")
print("\n".join(rows))
