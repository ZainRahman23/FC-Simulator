# G2b speed / swing review — builds viewer/data/manifest.js from the recorded runs (captions measured from the frames themselves)
import json, os, numpy as np
H = os.path.dirname(os.path.abspath(__file__)); V = os.path.join(H, "../viewer/data")
def load(fn):
    s = open(os.path.join(V, fn)).read(); return json.loads(s[s.index(".push(") + 6: s.rindex(");")])
def hd(R):
    sx = sz = 0
    for f in R["frames"]:
        q = f["b"][0][3:]; x, y, z, w = q; fz = [2 * (x * z + w * y), 2 * (y * z - w * x), 1 - 2 * (x * x + y * y)]; sx += fz[0]; sz += fz[2]
    h = np.arctan2(sx, sz); return [np.sin(h), np.cos(h)]
def speeds(R):
    h = hd(R); fall = next((f["t"] for f in R["frames"] if f["com"][1] < 0.75), None)
    return [f["v"][0] * h[0] + f["v"][2] * h[1] for f in R["frames"] if f["v"] and (fall is None or f["t"] < fall)], fall
def walkcap(R):
    v, fall = speeds(R); up = [e for e in R["events"] if e["td"] is not None and (fall is None or e["td"] < fall)]
    s = v[len(v) // 4:] if len(v) > 8 else v
    return f"{len(up)} upright touchdowns · forward speed (after the first quarter) {np.mean(s):.2f} ± {np.std(s):.2f} m/s · {'falls at ' + format(fall, '.2f') + ' s' if fall else 'standing at the end'}", fall
S = []
COLS = [{"key": "base", "name": "Baseline — Controller A (M8A), placement only"}, {"key": "reg", "name": "Speed-regulated — capture-point tracking through the ground reaction + speed-derived target (0.5 m/s)"}]
for st in ("R0.5", "L0.6"):
    runs = {}; durs = []
    for c in COLS:
        fn = f"{c['key']}_{st}.js"; R = load(fn); cap, fall = walkcap(R); t0 = R["events"][0]["tSw0"]; durs.append(R["frames"][-1]["t"] - t0)
        runs[c["key"]] = {"file": fn, "anchor": t0, "side": R["events"][0]["sw"], "follow": True, "sub": f"start {st[0]}@{st[1:]} · hash {R['hash']}", "caption": cap}
    S.append({"title": f"Full walk {st[0]}@{st[1:]}", "desc": "The whole walk, same start, side by side. The top trace is the forward COM speed (dashed: 0.5 m/s, the regulated walk's target). Baseline: the speed creeps up until a step at the reach limit ends in a toe catch. Speed-regulated: the speed is held near the target for several steps — the walk still ends (by a stall or a runaway; see the failure tab).", "vd": 0.5, "cols": COLS, "win": [-0.3, max(durs)], "t0": -0.3, "runs": runs})
# terminal failures: the first swing that touched down early (< 0.8) or the last step before the fall
runs = {}
for c in COLS:
    fn = f"{c['key']}_R0.5.js"; R = load(fn); _, fall = walkcap(R)
    e = next((e for e in R["events"] if e["k"] >= 1 and e["uAt"] is not None and e["uAt"] < 0.8), None) or [e for e in R["events"] if fall is None or e["tSw0"] < fall][-1]
    runs[c["key"]] = {"file": fn, "anchor": e["tSw0"], "side": e["sw"], "sub": f"start R@0.5 · step {e['k']} ({e['sw']})", "caption": f"touchdown at {e['uAt']} of the planned swing" if e["uAt"] is not None else "no touchdown"}
S.append({"title": "The terminal failure", "desc": "Each walk's first swing that touched down early (or its last step). Baseline: the speed has crept to ≈ 0.8 m/s, the request sits at its 0.30 m bound, the trailing leg is straight and the toe meets the turf mid-swing. Regulated: the classifier attributes every fall to a time-infeasible swing (too much travel for the air time) or to a stall.", "vd": 0.5, "cols": COLS, "win": [-0.5, 0.7], "t0": 0.0, "runs": runs})
# swing on identical requests
SC = [{"key": "swOld", "name": "Existing swing (clocked from the step start, 50 ms behind real time)"}, {"key": "swLead", "name": "Existing swing + late delay compensation (walk.swingLead \"late\")"}, {"key": "swGen", "name": "Generic swing (pc_swing.js, liftoff-anchored, delay-led) — not adopted"}]
runs = {}
for c in SC:
    fn = f"{c['key']}_R0.5.js"; R = load(fn); e = next(e for e in R["events"] if e["k"] == 1)
    runs[c["key"]] = {"file": fn, "anchor": e["tSw0"], "side": e["sw"], "sub": f"open loop: every step commanded 0.28 m forward, 0.26 m wide, T 0.42 s · step 1", "caption": f"liftoff {e['lift'] - e['tSw0']:.3f} s after the step start · touchdown {e['td'] - e['tSw0']:.3f} s at {e['uAt']} of the swing" if e["td"] else "no touchdown"}
S.append({"title": "Swing: identical requests", "desc": "The same open-loop request (no controller decisions) through three swing executions. Watch the swing foot in the close-up and the toe-clearance trace: the existing swing lags then lands ≈ 7 cm past its target (its trajectory runs 50 ms behind real time); the late delay compensation lands ≈ 3 cm past; the generic swing anchors at the measured liftoff but starts from rest and lags.", "cols": SC, "win": [-0.15, 0.55], "t0": 0.0, "runs": runs})
FOOT = ("Collider view, side projection onto the walking direction (viewer on the character's left: left leg dark, right leg light; an outline turns green when that foot carries > 5 % BW). "
        "Traces: forward COM speed, then the focus foot's heel height, toe clearance, ankle plantar-flexion torque (dashed ±150 N·m) and vertical load; ▲ liftoff, ▼ touchdown. All runs are deterministic replays.")
for s in S: s["foot"] = FOOT
open(os.path.join(V, "manifest.js"), "w").write("window.FG_MANIFEST = " + json.dumps({"scenarios": S}, indent=1) + ";\n")
for s in S:
    print(s["title"]); [print("  ", k, "|", r["caption"]) for k, r in s["runs"].items()]
