# Root-motion analysis of a proto_trace.js run: simulation root vs time, animation (drawn) root/anchors vs time, ball vs time,
# discontinuities, phase boundaries. Writes ROOT_MOTION.md + ROOT_MOTION_PLOT.png.   python3 analyze_trace.py <trace_dir> <out_dir>
import sys, json, os, math
T = json.load(open(f"{sys.argv[1]}/trace.json")); OUT = sys.argv[2]; os.makedirs(OUT, exist_ok=True)
tr = T["trace"]; c0 = T["committedTick"]; ct = T["contactTick"]; bs = T["backToSet"]
cm = next(t["committed"] for t in tr if t["committed"]); t0 = cm["t0"]; execEnd = t0 + cm["execTime"]; contactT = next(t["contact"]["tickT"] for t in tr if t["contact"])
rows = []; md = []
md.append(f"# Root motion — {T['shot']['id']}\n")
md.append(f"shot at t=0 from {T['shot']['origin']} (synthetic lat {T['shot']['synth']['lat']} m, z {T['shot']['synth']['z']} m, v {T['shot']['synth']['v']} m/s); keeper start {T['start']['root']} facing {T['start']['facing']*180/math.pi:.1f}°")
md.append(f"commit at tick {c0} (t0 {t0:.4f} s), execTime {cm['execTime']:.4f} s → execEnd {execEnd:.4f} s; tier {cm['tier']} {cm['action']}; feet {cm['feet']} → target {cm['target']} (lateral {math.hypot(cm['target'][0]-cm['feet'][0], cm['target'][1]-cm['feet'][1]):.3f} m ground, z {cm['target'][2]:.2f} m); envNorm {cm['envNorm']}")
md.append(f"contact at tick {ct} (t {contactT:.4f} s = execEnd + {contactT-execEnd:.4f} s): {next(t['contact'] for t in tr if t['contact'])}")
md.append(f"back to SET at tick {bs} (t {tr[bs]['now']:.3f} s)\n")
# per-tick table (compact): t, sim root, Δroot per tick (m and screen px), diveU, anim state/art, drawn root/head/hand anchors, ball
md.append("| tick | t (s) | sim root x,y (m) | Δ per tick (mm) | screen root (px) | diveU | sim state/phase | anim state | art | drawn root | drawn head | drawn hand | hand sim (m) | ball x,y,z |")
md.append("|---|---|---|---|---|---|---|---|---|---|---|---|---|---|")
prev = None; jumps = []
for t in tr:
    d = None
    if prev: d = (math.hypot(t["root"][0]-prev["root"][0], t["root"][1]-prev["root"][1]) * 1000, math.hypot(t["sp"][0]-prev["sp"][0], t["sp"][1]-prev["sp"][1]))
    a = t["anim"] or {}; an = a.get("anchors") or {}
    if d and d[0] > 60: jumps.append((t["f"], d[0]))
    md.append(f"| {t['f']} | {t['now']:.3f} | {t['root'][0]:.3f},{t['root'][1]:.3f} | {'' if d is None else f'{d[0]:.1f} / {d[1]:.1f}px'} | {t['sp'][0]:.1f},{t['sp'][1]:.1f} | {'' if t['diveU'] is None else t['diveU']} | {t['state']}/{t['phase']} | {a.get('state','')}|{a.get('phase','')} | {(a.get('art') or '')[:40]} | {an.get('root')} | {an.get('head')} | {an.get('handL') or an.get('handR')} | {t['hand']} | {t['ball'][0]:.2f},{t['ball'][1]:.2f},{t['ball'][2]:.2f} |")
    prev = t
# summary numbers
r0 = tr[c0]["root"]; rE = next(t for t in tr if t["now"] >= execEnd - 1e-6)["root"]; rC = tr[ct]["root"]; rB = tr[bs]["root"]; rEnd = tr[-1]["root"]
sp0 = tr[c0]["sp"]; spE = next(t for t in tr if t["now"] >= execEnd - 1e-6)["sp"]
pre = [t for t in tr if t["f"] < c0]; premove = math.hypot(pre[-1]["root"][0]-pre[0]["root"][0], pre[-1]["root"][1]-pre[0]["root"][1]) if pre else 0
post = [t for t in tr if t["now"] >= execEnd]; postmove = max(math.hypot(t["root"][0]-rE[0], t["root"][1]-rE[1]) for t in post)
summary = [
 "\n## Findings",
 f"- Pre-commit (ticks 0–{c0-1}): root moves {premove*1000:.1f} mm in total (READ/PREPARE); the keeper is effectively standing still.",
 f"- Dive (ticks {c0}–{ct}): root travels from ({r0[0]:.3f},{r0[1]:.3f}) to ({rE[0]:.3f},{rE[1]:.3f}) = {math.hypot(rE[0]-r0[0], rE[1]-r0[1]):.3f} m ground (target lateral {math.hypot(cm['target'][0]-cm['feet'][0], cm['target'][1]-cm['feet'][1]):.3f} m → footFrac ≈ {math.hypot(rE[0]-r0[0], rE[1]-r0[1])/max(1e-6, math.hypot(cm['target'][0]-cm['feet'][0], cm['target'][1]-cm['feet'][1])):.2f}); on screen {math.hypot(spE[0]-sp0[0], spE[1]-sp0[1]):.1f} px ({spE[0]-sp0[0]:+.1f}, {spE[1]-sp0[1]:+.1f}). Smoothstep in u: no per-tick step exceeds {max(math.hypot(tr[i]['root'][0]-tr[i-1]['root'][0], tr[i]['root'][1]-tr[i-1]['root'][1]) for i in range(c0+1, ct+1))*1000:.1f} mm.",
 f"- After execEnd (t ≥ {execEnd:.3f} s, ticks ≥ {next(t['f'] for t in tr if t['now'] >= execEnd - 1e-6)}): root moves at most {postmove*1000:.1f} mm through LAND, RECOVER and the return to SET — the simulation root is FROZEN after the dive completes; the keeper's post-contact body motion has no root support.",
 f"- Root at back-to-SET ({rB[0]:.3f},{rB[1]:.3f}); trace end ({rEnd[0]:.3f},{rEnd[1]:.3f}).",
 f"- Discontinuities (> 60 mm in one tick): {jumps if jumps else 'none'}.",
]
md += summary
open(f"{OUT}/ROOT_MOTION.md", "w").write("\n".join(md) + "\n")
print("\n".join(summary))
# plot
try:
    import matplotlib; matplotlib.use("Agg"); import matplotlib.pyplot as plt
    ts = [t["now"] for t in tr]
    fig, ax = plt.subplots(4, 1, figsize=(12, 13), sharex=True)
    ax[0].plot(ts, [t["root"][0] for t in tr], label="sim root x (m, depth)"); ax[0].plot(ts, [t["root"][1] for t in tr], label="sim root y (m, along goal line, +south)")
    ax[0].plot(ts, [t["ball"][0] for t in tr], "--", label="ball x"); ax[0].plot(ts, [t["ball"][1] for t in tr], "--", label="ball y"); ax[0].plot(ts, [t["ball"][2] for t in tr], ":", label="ball z")
    ax[0].set_ylim(min(33, min(t["root"][1] for t in tr)-0.2), 37); ax[0].set_ylabel("m"); ax[0].legend(loc="upper left", fontsize=8); ax[0].set_title(f"{T['shot']['id']} — simulation keeper root, ball (world)")
    ax[1].plot(ts, [t["sp"][0] for t in tr], label="sim root screen x"); ax[1].plot(ts, [t["sp"][1] for t in tr], label="sim root screen y")
    dr = [(t["anim"] or {}).get("anchors") or {} for t in tr]
    ax[1].plot(ts, [d["root"][0] if d.get("root") else float("nan") for d in dr], ".", ms=3, label="drawn root x"); ax[1].plot(ts, [d["root"][1] if d.get("root") else float("nan") for d in dr], ".", ms=3, label="drawn root y")
    ax[1].plot(ts, [t["ballSp"][0] for t in tr], "--", label="ball screen x"); ax[1].plot(ts, [t["ballSp"][1] for t in tr], "--", label="ball screen y"); ax[1].set_ylabel("screen px"); ax[1].legend(loc="upper left", fontsize=8); ax[1].invert_yaxis()
    ax[2].plot(ts, [d["head"][1] if d.get("head") else float("nan") for d in dr], ".", ms=3, label="drawn head y"); ax[2].plot(ts, [(d.get("handL") or d.get("handR") or [float('nan')]*2)[1] for d in dr], ".", ms=3, label="drawn hand y")
    ax[2].plot(ts, [t["handSp"][1] if t["handSp"] else float("nan") for t in tr], "-", label="sim hand screen y"); ax[2].set_ylabel("screen px (y)"); ax[2].legend(loc="upper left", fontsize=8); ax[2].invert_yaxis()
    ax[3].plot(ts, [t["diveU"] if t["diveU"] is not None else float("nan") for t in tr], label="diveU"); ax[3].set_ylabel("u"); ax[3].set_xlabel("t (s)"); ax[3].legend(loc="upper left", fontsize=8)
    for a in ax:
        for x, lab, col in ((t0, "commit", "k"), (execEnd, "execEnd", "g"), (contactT, "contact", "r"), (tr[bs]["now"], "SET", "b")): a.axvline(x, color=col, ls=":", lw=1); 
    for x, lab, col in ((t0, "commit", "k"), (execEnd, "execEnd", "g"), (contactT, "contact", "r"), (tr[bs]["now"], "SET", "b")): ax[0].text(x, 36.8, lab, color=col, fontsize=8)
    fig.tight_layout(); fig.savefig(f"{OUT}/ROOT_MOTION_PLOT.png", dpi=110); print("plot written")
except Exception as e: print("plot skipped:", e)
