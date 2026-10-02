# G2b overnight review — viewer/data/manifest.js from the recorded runs (captions measured from the frames themselves)
import json, os, sys, numpy as np
H = os.path.dirname(os.path.abspath(__file__)); V = os.path.join(H, "../viewer/data")
def load(fn):
    s = open(os.path.join(V, fn)).read(); return json.loads(s[s.index(".push(") + 6: s.rindex(");")])
def hd(R):
    sx = sz = 0
    for f in R["frames"]:
        x, y, z, w = f["b"][0][3:]; sx += 2 * (x * z + w * y); sz += 1 - 2 * (x * x + y * y)
    h = np.arctan2(sx, sz); return [np.sin(h), np.cos(h)]
def walkcap(R):
    h = hd(R); fall = next((f["t"] for f in R["frames"] if f["com"][1] < 0.75), None)
    v = [f["v"][0] * h[0] + f["v"][2] * h[1] for f in R["frames"] if f["v"] and (fall is None or f["t"] < fall)]; up = [e for e in R["events"] if e["td"] is not None and (fall is None or e["td"] < fall)]
    s = v[len(v) // 4:] if len(v) > 8 else v
    return f"{len(up)} upright touchdowns · forward speed (after the first quarter) {np.mean(s):.2f} ± {np.std(s):.2f} m/s · {'falls at ' + format(fall, '.2f') + ' s' if fall else 'still walking at the end'}"
S = []
# 1. the executors at an identical state
cols = [{"key": "swBase", "name": "Inherited walking swing (with yesterday's pelvis-rate internal model)"}, {"key": "swX", "name": "Swing executor X (pc_swingx.js: re-planned from the actual foot, reach set, arrival-gated descent)"}]
runs = {}
for c in cols:
    fn = f"{c['key']}_R0.6.js"; R = load(fn); e = next(e for e in R["events"] if e["k"] == 4)
    runs[c["key"]] = {"file": fn, "anchor": e["tSw0"], "side": e["sw"], "sub": f"start R@0.6 · step 4 ({e['sw']}) · hash {R['hash']}", "caption": f"liftoff {e['lift'] - e['tSw0']:.3f} s · touchdown {e['td'] - e['tSw0']:.3f} s at {e['uAt']} of the swing" if e["td"] else "no touchdown"}
S.append({"title": "Late shortening at an identical state — inherited swing vs executor X", "desc": "The same body state, the same commanded step (0.27 m, width 0.29 m, single support 0.42 s), then the foothold moved 8 cm SHORTER 0.2 s into the step. Bench over 3 starts × 2 steps: the inherited swing lands ≈ 0.57 of the change (sd 0.4 cm), X ≈ 0.7 (sd 1.5 cm) — X re-plans from the actual foot and descends only once its plan has arrived; its outcome is less predictable, which is why it is not adopted.", "cols": cols, "win": [-0.15, 0.6], "t0": 0.0, "runs": runs})
# 2–3. the controller vs the oracle placement search at the same starts (if recorded)
for st, title, desc in [("R0.5", "A typical failing start (R@0.5) — the best controller vs the oracle placement search", "Left: the unified controller (best configuration of yesterday's review). Watch the stance foot after each heel strike: the CoP stays at the heel for 0.2–0.3 s while the body passes over it, so the body speeds up; once a step starts with the capture point ahead of the sole centre the steps cannot catch it (runaway). Right: the ORACLE (a diagnostic, not a controller) — every step command chosen by trying a grid of commands in the deterministic simulator itself from the identical state."),
                        ("L0.6", "The sustained start (L@0.6) — the best controller vs the oracle placement search", "The one start on which the controller walks all 40 steps of the test (the fall after the last step is the end of the test — stopping is not controlled). Right: the oracle from the same start.")]:
    cc = [{"key": "ctrl", "name": "Unified controller (mU1 maps, continuous in-swing re-decision)"}, {"key": "oracle", "name": "ORACLE placement search (diagnostic: the simulator as a perfect model, commanded steps)"}]
    runs = {}; durs = []
    for c in cc:
        fn = f"{c['key']}_{st}.js"
        if not os.path.exists(os.path.join(V, fn)): continue
        R = load(fn); t0 = R["events"][0]["tSw0"]; durs.append(R["frames"][-1]["t"] - t0)
        runs[c["key"]] = {"file": fn, "anchor": t0, "side": R["events"][0]["sw"], "follow": True, "sub": f"start {st[0]}@{st[1:]} · hash {R['hash']}", "caption": walkcap(R)}
    if runs: S.append({"title": title, "desc": desc, "vd": 0.5, "cols": [c for c in cc if c["key"] in runs], "win": [-0.3, max(durs)], "t0": -0.3, "runs": runs})
FOOT = ("Collider view, side projection onto the walking direction (viewer on the character's left: left leg dark, right leg light; an outline turns green when that foot carries > 5 % BW). "
        "Traces: forward COM speed (dashed: the requested 0.5 m/s), then the focus foot's heel height, toe clearance, ankle plantar-flexion torque (dashed ±150 N·m) and vertical load; ▲ liftoff, ▼ touchdown. All runs are deterministic replays.")
for s in S: s["foot"] = FOOT
open(os.path.join(V, "manifest.js"), "w").write("window.FG_MANIFEST = " + json.dumps({"scenarios": S}, indent=1) + ";\n")
print(len(S), "scenarios")
