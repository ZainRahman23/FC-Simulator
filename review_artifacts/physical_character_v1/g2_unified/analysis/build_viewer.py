# G2b unified review — viewer/data/manifest.js from the recorded runs (captions measured from the frames themselves)
import json, os, numpy as np
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
WC = [{"key": "base", "name": "Controller A (the G2b walker, M8A maps) — placement only, its target a ≈ 0.63 m/s state"}, {"key": "uni", "name": "Unified controller — one target from vd 0.5: stance orbit (funnel) + double-support target + joint map placement under this inner loop, internal-model swing"}]
for st, title, desc in [("L0.6", "Sustained walk — start L@0.6", "The same start, side by side. The unified controller walks all 40 steps of the test at a steady ≈ 0.5 m/s (steps 0.25–0.28 m); the old walker's speed creeps up until a step at its reach limit ends in a toe catch. (The test's 40 steps end at ≈ 22 s; stopping is not controlled yet — G2c — so the fall after the last step is the end of the test, not a walking failure.)"),
                        ("R0.5", "A typical start — R@0.5", "The other five starts end the unified walk after 6–11 steps: a short / long step pair around steps 3–6 starts a forward runaway (or a stall), and the late corrections the controller asks for cannot be executed by the swing. This is the open problem.")]:
    runs = {}; durs = []
    for c in WC:
        fn = f"{c['key']}_{st}.js"; R = load(fn); t0 = R["events"][0]["tSw0"]; durs.append(R["frames"][-1]["t"] - t0)
        runs[c["key"]] = {"file": fn, "anchor": t0, "side": R["events"][0]["sw"], "follow": True, "sub": f"start {st[0]}@{st[1:]} · hash {R['hash']}", "caption": walkcap(R)}
    S.append({"title": title, "desc": desc, "vd": 0.5, "cols": WC, "win": [-0.3, max(durs)], "t0": -0.3, "runs": runs})
def stepcap(R, K):
    e = next(e for e in R["events"] if e["k"] == K); return e
for title, desc, cols, st, K in [
    ("Swing delay — matched state", "Identical body state and request (Controller A's own step 4 from R@0.6). Left: the inherited swing — its hip velocity target uses the 50 ms-old pelvis pitch rate; the pelvis pitches in reaction to the hip's own torque, so the foot runs ahead of its command (up to 7.7 cm) and lands 6.4 cm long. Right: the same swing with the internal forward model of the pelvis rate (learned online from the delayed measurements, realistic latency kept): +1.0 cm.",
     [{"key": "swOld", "name": "Inherited swing (delayed pelvis rate in the velocity target)"}, {"key": "swModel", "name": "Internal-model swing (expected pelvis pitch rate at the command's phase)"}], "R0.6", 4),
    ("Late lengthening (+8 cm at 0.2 s) — matched state", "Identical state, the same step commanded, then its foothold moved 8 cm forward 0.2 s into the step. Left: the inherited descent runs on its clock — the foot (trailing its path by a few cm) reaches the turf 5 cm short. Right: the arrival-gated descent holds a 5 cm floor until the foot is within 4 cm of its landing point: +0.8 cm. A late SHORTENING is still executed only ≈ 40 % (the foot's momentum carries it past).",
     [{"key": "rtBase", "name": "Inherited descent (on the swing's clock)"}, {"key": "rtGate", "name": "Arrival-gated descent (opt-in descentGate)"}], "R0.5", 3)]:
    runs = {}
    for c in cols:
        fn = f"{c['key']}_{st}.js"; R = load(fn); e = stepcap(R, K)
        runs[c["key"]] = {"file": fn, "anchor": e["tSw0"], "side": e["sw"], "sub": f"start {st[0]}@{st[1:]} · step {K} ({e['sw']}) · hash {R['hash']}", "caption": f"liftoff {e['lift'] - e['tSw0']:.3f} s · touchdown {e['td'] - e['tSw0']:.3f} s at {e['uAt']} of the swing" if e["td"] else "no touchdown"}
    S.append({"title": title, "desc": desc, "cols": cols, "win": [-0.15, 0.6], "t0": 0.0, "runs": runs})
FOOT = ("Collider view, side projection onto the walking direction (viewer on the character's left: left leg dark, right leg light; an outline turns green when that foot carries > 5 % BW). "
        "Traces: forward COM speed (dashed: the requested 0.5 m/s), then the focus foot's heel height, toe clearance, ankle plantar-flexion torque (dashed ±150 N·m) and vertical load; ▲ liftoff, ▼ touchdown. All runs are deterministic replays.")
for s in S: s["foot"] = FOOT
open(os.path.join(V, "manifest.js"), "w").write("window.FG_MANIFEST = " + json.dumps({"scenarios": S}, indent=1) + ";\n")
for s in S:
    print(s["title"]); [print("  ", k, "|", r["caption"]) for k, r in s["runs"].items()]
