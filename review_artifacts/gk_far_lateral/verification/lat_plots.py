#!/usr/bin/env python3
"""Per-tick LAYER plots (SVG) for the far-lateral review: sim root / presentation root / authored / redirected / planned / final pelvis, roll per layer, torso assist, IK residual, landing stages."""
import json, math, sys, os
S = "/private/tmp/claude-501/-Users-zainrahman/8e9ca3e0-10ae-4213-9c09-3ee98f6500ac/scratchpad"
OUT = sys.argv[1] if len(sys.argv) > 1 else S + "/lat_plots"; os.makedirs(OUT, exist_ok=True)
def load(p): return {str(r["idx"]): r for r in json.load(open(p))}
def hdist(a, b): return math.hypot(a[0] - b[0], a[2] - b[2])
def series(rec):
    R = rec["rows"]; r0 = next(r for r in R if r.get("simRoot")); root0 = [r0["simRoot"][0], 0, -r0["simRoot"][1]]
    out = {k: [] for k in ["k", "simRootLat", "presLat", "rawPelY", "redirPelY", "planPelY", "finalPelY", "rawPelLat", "redirPelLat", "planPelLat", "finalPelLat", "handY", "targetY", "ballY", "handLat", "targetLat", "ballLat", "rawRoll", "redirRoll", "finalRoll", "torso", "residual", "ikW", "theta", "footRY", "footLY", "pushFootLat"]}
    marks = []; stages = []; last = None; lastPhase = None
    for r in R:
        if not r.get("axis") and not r.get("landing"): 
            if r.get("final") is None: continue
        k = r["k"]; out["k"].append(k)
        root = [r["simRoot"][0], 0, -r["simRoot"][1]]; out["simRootLat"].append(hdist(root, root0))
        out["presLat"].append(r["pres"][2] if r.get("pres") else 0)
        for lay, key in (("raw", "rawPel"), ("redir", "redirPel"), ("plan", "planPel"), ("final", "finalPel")):
            J = r.get(lay); out[key + "Y"].append(J["pelvis"][1] if J else None); out[key + "Lat"].append(hdist(J["pelvis"], root0) if J else None)
        fin = r.get("final"); out["handY"].append(fin["tipHand"][1] if fin else None); out["handLat"].append(hdist(fin["tipHand"], root0) if fin else None)
        out["footRY"].append(fin["foot_R"][1] if fin else None); out["footLY"].append(fin["foot_L"][1] if fin else None)
        tg = r.get("handTargetW"); out["targetY"].append(tg[1] if tg else None); out["targetLat"].append(hdist(tg, root0) if tg else None)
        b = r.get("ball"); out["ballY"].append(b[2] if b else None); out["ballLat"].append(hdist([b[0], 0, -b[1]], root0) if b else None)
        out["rawRoll"].append(r["rawRoll"][2] if r.get("rawRoll") else None); out["redirRoll"].append(r["redirRoll"][2] if r.get("redirRoll") else None); out["finalRoll"].append(r["finalRoll"][2] if r.get("finalRoll") else None)
        out["torso"].append(r.get("torso") or 0); out["residual"].append(r["ik"]["residual"] if r.get("ik") and r["ik"].get("residual") is not None else None); out["ikW"].append(r.get("ikW") or 0)
        out["theta"].append(r["axis"]["theta"] if r.get("axis") else None); out["pushFootLat"].append(None)
        ph = r.get("sub") or r.get("phase")
        if ph != lastPhase and r.get("mode") == "pre": marks.append((k, ph)); lastPhase = ph
        st = r.get("landing")
        if st and st != last: stages.append((k, st)); last = st
        if r.get("contact"): marks.append((k, "CONTACT"))
    return out, marks, stages
PAL = {"sim": "#8ab4f8", "pres": "#c58af9", "raw": "#f28b82", "redir": "#fdd663", "plan": "#81c995", "final": "#9ee8ff", "hand": "#ff8bcb", "target": "#ffa657", "ball": "#e8e8e8", "torso": "#ff7b72", "res": "#79c0ff"}
def svg_panel(title, tracks, ks, ylab, ymin, ymax, marks, stages, W=1100, H=210, unit="m"):
    L, T, Rr, B = 44, 40, 12, 26; pw, ph = W - L - Rr, H - T - B; k0, k1 = ks[0], ks[-1]
    X = lambda k: L + (k - k0) / max(1, k1 - k0) * pw; Y = lambda v: T + (1 - (v - ymin) / (ymax - ymin)) * ph
    s = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" style="background:#0f1216;font-family:Menlo,monospace;font-size:10px">']
    s.append(f'<text x="{L}" y="13" fill="#ffdc78" font-size="11">{title}</text>')
    for si, (k, st) in enumerate(stages):
        s.append(f'<line x1="{X(k):.1f}" y1="{T}" x2="{X(k):.1f}" y2="{T+ph}" stroke="#3a4a5a" stroke-dasharray="3,3"/><text x="{X(k)+2:.1f}" y="{T+ph-3-9*(si%3)}" fill="#6f8aa5" font-size="8">{st}</text>')
    for k, m in marks:
        col = "#ff5252" if m == "CONTACT" else "#5a6a3a"; s.append(f'<line x1="{X(k):.1f}" y1="{T}" x2="{X(k):.1f}" y2="{T+ph}" stroke="{col}"/><text x="{X(k)+2:.1f}" y="{T+9}" fill="{col}" font-size="8" transform="rotate(90 {X(k)+2:.1f},{T+9})">{m}</text>')
    for gv in [ymin + i * (ymax - ymin) / 4 for i in range(5)]:
        s.append(f'<line x1="{L}" y1="{Y(gv):.1f}" x2="{L+pw}" y2="{Y(gv):.1f}" stroke="#222a33"/><text x="2" y="{Y(gv)+3:.1f}" fill="#8a97a6">{gv:.2f}</text>')
    for i in range(0, k1 - k0 + 1, 20): s.append(f'<text x="{X(k0+i)-6:.1f}" y="{H-8}" fill="#8a97a6">{k0+i}</text>')
    s.append(f'<text x="{L+pw-60}" y="{H-8}" fill="#8a97a6">tick (60 Hz)</text><text x="2" y="{T-4}" fill="#8a97a6">{ylab} [{unit}]</text>')
    lx = L + 4; ly = 24
    for lab, vals, col, dash in tracks:
        pts = [(X(k), Y(max(ymin, min(ymax, v)))) for k, v in zip(ks, vals) if v is not None]
        if not pts: continue
        d = "M" + " L".join(f"{x:.1f},{y:.1f}" for x, y in pts); s.append(f'<path d="{d}" fill="none" stroke="{col}" stroke-width="1.4"{" stroke-dasharray=" + chr(34) + dash + chr(34) if dash else ""}/>')
        wlab = 13 + 6.2 * len(lab) + 10
        if lx + wlab > W - 10: lx = L + 4; ly += 11
        s.append(f'<rect x="{lx}" y="{ly-4}" width="10" height="3" fill="{col}"/><text x="{lx+13}" y="{ly}" fill="{col}">{lab}</text>'); lx += wlab
    s.append("</svg>"); return "\n".join(s)
def build(rec, tag, title):
    o, marks, stages = series(rec); ks = o["k"]
    panels = [
      svg_panel(f"{title} — PELVIS HEIGHT by layer", [("authored (V6 keys + sim root)", o["rawPelY"], PAL["raw"], ""), ("after axis redirect", o["redirPelY"], PAL["redir"], ""), ("after launch/landing plan", o["planPelY"], PAL["plan"], ""), ("final (assist + IK)", o["finalPelY"], PAL["final"], ""), ("reach hand tip", o["handY"], PAL["hand"], "4,2"), ("hand target (sim)", o["targetY"], PAL["target"], "2,2"), ("ball", o["ballY"], PAL["ball"], "1,3")], ks, "height", 0, 2.6, marks, stages),
      svg_panel(f"{title} — LATERAL travel from the start root", [("simulation root (authoritative)", o["simRootLat"], PAL["sim"], ""), ("presentation root deviation |dm|", o["presLat"], PAL["pres"], ""), ("authored pelvis", o["rawPelLat"], PAL["raw"], ""), ("redirected pelvis", o["redirPelLat"], PAL["redir"], ""), ("planned pelvis", o["planPelLat"], PAL["plan"], ""), ("final pelvis", o["finalPelLat"], PAL["final"], ""), ("reach hand tip", o["handLat"], PAL["hand"], "4,2"), ("hand target", o["targetLat"], PAL["target"], "2,2")], ks, "lateral", 0, 3.0, marks, stages),
      svg_panel(f"{title} — PELVIS ROLL by layer (deg) and body axis theta", [("authored roll", o["rawRoll"], PAL["raw"], ""), ("redirected roll", o["redirRoll"], PAL["redir"], ""), ("final roll", o["finalRoll"], PAL["final"], ""), ("axis theta (from vertical)", [(-v if v is not None else None) for v in o["theta"]], PAL["sim"], "2,2")], ks, "deg", -100, 20, marks, stages, unit="deg"),
      svg_panel(f"{title} — TORSO ASSIST (deg), IK residual (m×10), IK weight", [("torso assist toward the target", o["torso"], PAL["torso"], ""), ("IK residual ×10", [(v * 10 if v is not None else None) for v in o["residual"]], PAL["res"], ""), ("IK weight ×10", [v * 10 for v in o["ikW"]], PAL["plan"], "2,2"), ("foot R height ×10", [(v * 10 if v is not None else None) for v in o["footRY"]], PAL["redir"], "1,2"), ("foot L height ×10", [(v * 10 if v is not None else None) for v in o["footLY"]], PAL["raw"], "1,2")], ks, "deg / ×10", -25, 25, marks, stages, unit="")]
    p = f"{OUT}/layers_{tag}.svg"; open(p, "w").write('<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="%d">' % (210 * len(panels)) + "".join(f'<g transform="translate(0,{210*i})">{pn}</g>' for i, pn in enumerate(panels)) + "</svg>"); return p
if __name__ == "__main__":
    A = load(S + "/layers_courtois.json"); B = load(S + "/layers_lat_courtois.json")
    for fx in ("2", "13", "15"):
        build(A[fx], f"{fx}_before", f"fixture {fx} {A[fx]['name']} — BEFORE (Courtois)"); build(B[fx], f"{fx}_after", f"fixture {fx} {B[fx]['name']} — AFTER (Courtois)")
    for extra in sys.argv[2:]:
        path, tags = extra.split("=")[0], extra.split("=")[1].split(",")
        E = load(path)
        for t in tags:
            if t in E: rig = "shared test rig" if "_test" in path else "Courtois"; build(E[t], f"{os.path.basename(path).replace('layers_lat_','').replace('.json','')}_{t}", f"{t} {E[t]['name'][:60]} ({rig})")
    print("plots in", OUT)
