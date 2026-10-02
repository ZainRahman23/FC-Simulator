# Physical Stepper review — viewer/data/manifest.js from the recorded runs (captions measured from the frames themselves)
import json, os, numpy as np
H = os.path.dirname(os.path.abspath(__file__)); V = os.path.join(H, "viewer/data")
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
    cap = f"{len(up)} upright touchdowns · forward speed (after the first quarter) {np.mean(s):.2f} ± {np.std(s):.2f} m/s · {'falls at ' + format(fall, '.2f') + ' s' if fall else 'still walking at the end'}"
    ce = R.get("contactEvents")
    if ce: cap += " · contact events " + ", ".join(f"{k} {sum(1 for e in ce if e['state'] == k)}" for k in ["ACHIEVED", "MISSED", "INTERRUPTED", "EXECUTING"] if any(e["state"] == k for e in ce))
    return cap
def scen(title, desc, cols):
    runs = {}; durs = []
    for c in cols:
        R = load(c["file"]); t0 = R["events"][0]["tSw0"]; durs.append(R["frames"][-1]["t"] - t0)
        runs[c["key"]] = {"file": c["file"], "anchor": t0, "side": R["events"][0]["sw"], "follow": True, "sub": f"start {R['start']} · hash {R['hash']}", "caption": walkcap(R)}
    return {"title": title, "desc": desc, "vd": 0.5, "cols": [{"key": c["key"], "name": c["name"]} for c in cols], "win": [-0.3, max(durs)], "t0": -0.3, "runs": runs}
S = [
 scen("1 · The oracle's fragility — the SAME depth-2 search, L@0.6",
      "Both columns are the depth-2 beam oracle (the simulator as a perfect model; three best first steps each followed by a search of the next). Left: commands committed exactly. Right: the committed foothold rounded to 0.1 mm (yesterday's engine) — this reproduces yesterday's 34 steps bit for bit. The two walks share every decision up to step 4; a 0.1 mm difference then decides between 13 and 34 upright steps. The long walks of the oracle are a fragile path, not a robust strategy.",
      [{"key": "exact", "name": "Depth-2 beam oracle, exact commits", "file": "beamExact_L0.6.js"}, {"key": "round", "name": "Depth-2 beam oracle, commits rounded to 0.1 mm (= yesterday's 34)", "file": "beamRound_L0.6.js"}]),
 scen("2 · What the good oracle preserves — R@0.5: the controller vs the best oracle (Gu)",
      "Left: the unified controller — it walks a short, quick gait (double support ≈ 0.21 s, the COM ≈ 19 cm behind the landing foot at touchdown) and creeps faster stride after stride until it cannot catch itself. Right: the best oracle (two steps ahead, candidates = the controller's own decision ± offsets ∪ the speed-scaled nominal gait) — long commanded steps (≈ 0.35 m), a long braking double support (≈ 0.30 s, the COM ≈ 25 cm behind the landing foot at touchdown), the capture point at the step start held at ≈ 0 ± 3 cm, and a much slower speed drift (+0.016 m/s per stride vs +0.035–0.040 for searches around the controller's own decision) — slower, not zero. On this start it holds all 40 searched steps (including a recovery from a 0.69 m/s excursion at steps 9–12); after the search horizon the controller takes over and the walk ends a few steps later. On L@0.6 the same search crept and collapsed after 29 — not yet robust.",
      [{"key": "ctrl", "name": "Unified controller", "file": "ctrl_R0.5.js"}, {"key": "gu", "name": "ORACLE Gu (depth 2, nominal ∪ feedback candidates; 40 searched steps)", "file": "gu40_R0.5.js"}]),
 scen("3 · The Physical Stepper live (held-out) — R@0.6",
      "Right: the opt-in Physical Stepper deciding in the controller from the feedback view — a quadratic surrogate (trained on the oracle data of the OTHER five starts) predicts each candidate's next step start; two transitions searched, the first executed; each step's support contact event is classified from the sensed touchdown (ACHIEVED / MISSED; the step interrupted by the fall stays EXECUTING — history is not repaired). Its prediction error (≈ 4 cm median on the capture point) is larger than the margins it must choose between; it walks no better than the controller.",
      [{"key": "ctrl", "name": "Unified controller", "file": "ctrl_R0.6.js"}, {"key": "stepper", "name": "Physical Stepper (horizon 2, surrogate held out from this start)", "file": "stepper_R0.6.js"}]),
]
FOOT = ("Collider view, side projection onto the walking direction (viewer on the character's left: left leg dark, right leg light; an outline turns green when that foot carries > 5 % BW). "
        "Traces: forward COM speed (dashed: the requested 0.5 m/s), then the focus foot's heel height, toe clearance, ankle plantar-flexion torque (dashed ±150 N·m) and vertical load; ▲ liftoff, ▼ touchdown. All runs are deterministic replays.")
for s in S: s["foot"] = FOOT
open(os.path.join(V, "manifest.js"), "w").write("window.FG_MANIFEST = " + json.dumps({"scenarios": S}, indent=1) + ";\n")
print(len(S), "scenarios"); [print(" ", s["title"], "|", " / ".join(r["caption"] for r in s["runs"].values())) for s in S]
