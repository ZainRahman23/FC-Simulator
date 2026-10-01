# FOOT GATE — builds viewer/data/manifest.js: the review scenarios, each foot's run file, the event the feet are aligned on, and captions
# measured from the recorded channels themselves (so what the page says is what the page shows).
import json, os, re
H = os.path.dirname(os.path.abspath(__file__)); V = os.path.join(H, "../viewer/data"); J = os.path.join(H, "../json")
SEL = json.load(open(os.path.join(J, "viewer_selection.json")))
CH = ["heel", "toeClr", "pitch", "mtp", "mtpTau", "ankleTau", "loadBW"]
def load(fn):
    s = open(os.path.join(V, fn)).read(); return json.loads(s[s.index(".push(") + 6: s.rindex(");")])
def ev(run, k): return next((e for e in run["events"] if e["k"] == k), None)
def chain(run, side, e):
    """late stance of the swinging foot (0.4 s before its liftoff), its pitch at liftoff, the swing's minimum toe clearance, the touchdown"""
    F = run["frames"]; c = lambda f, n: f["ch"][side][CH.index(n)]
    if not e or e["lift"] is None: return {"lift": False}
    pre = [f for f in F if e["lift"] - 0.4 <= f["t"] <= e["lift"]]; tEnd = e["td"] if e["td"] is not None else e["lift"] + 0.4
    sw = [f for f in F if e["lift"] + 0.05 <= f["t"] <= e["lift"] + 0.85 * (tEnd - e["lift"])]
    at = min(F, key=lambda f: abs(f["t"] - e["lift"]))
    mt = [c(f, "mtp") for f in pre if c(f, "mtp") is not None]
    return {"lift": True, "heelMax": max(c(f, "heel") for f in pre) if pre else None, "ankleTau": max(abs(c(f, "ankleTau") or 0) for f in pre) if pre else None,
            "mtpMax": max(mt) if mt else None, "pitchLift": c(at, "pitch"), "minClr": min(c(f, "toeClr") for f in sw) if sw else None,
            "swingT": (e["td"] - e["lift"]) if e["td"] is not None else None, "uAt": e["uAt"]}
def cap(ch, extra=""):
    if not ch.get("lift"): return "the swing never lifted off" + extra
    s = f"late stance: heel up to {ch['heelMax']*100:.1f} cm · ankle τ peak {ch['ankleTau']:.0f} N·m" + (f" · MTP peak {ch['mtpMax']:.0f}°" if ch["mtpMax"] is not None else "")
    s += f"\nliftoff: hindfoot pitch {ch['pitchLift']:.0f}° (− = toes down)\nswing: " + (f"min toe clearance {ch['minClr']*100:.1f} cm" if ch["minClr"] is not None else "re-contact almost at once")
    s += f" · airborne {ch['swingT']:.2f} s · touchdown at {ch['uAt']:.2f} of the planned swing" if ch.get("swingT") is not None and ch.get("uAt") is not None else (" · airborne < planned" if ch.get("swingT") else "")
    return s + extra
FEET = ["F0", "F1", "F2", "F2h"]
def ident_scen(key, title, desc, win, t0, anchor="tSw0", foot_note=""):
    runs = {}
    for f in FEET:
        p = SEL[key][f]; fn = f"ident_{f}_i{p['i']}.js"; R = load(fn); e = ev(R, p["k"]); ch = chain(R, p["sw"], e)
        out = "swing FAILED" if p["fail"] else ("continued" if p["cont"] else "swing completed, but down within two steps")
        runs[f] = {"file": fn, "anchor": e[anchor] if e and e[anchor] is not None else e["tSw0"], "side": p["sw"],
                   "sub": f"identification run {p['i']} (seed 72, own round-1 maps), step {p['k']}: previous step {p['L']:.3f} m, speed {p['v']:.2f} m/s",
                   "caption": cap(ch, f"\noutcome: {out}"), "verdict": {"cls": "good" if p["cont"] else "bad", "txt": out}}
    return {"title": title, "desc": desc, "win": win, "t0": t0, "runs": runs, "foot": foot_note}
S = []
S.append(ident_scen("ordinary", "Ordinary step", "An ordinary step from a MATCHED state: for each foot, the identification transition closest to a 0.24 m previous step at 0.45 m/s (same dithered Controller-A design, every transition kept). Time 0 = the trailing foot's swing start. Watch the trailing foot's late stance, toe-off and swing.", [-0.45, 0.6], 0.0))
S.append(ident_scen("long", "Long step", "A LONG step from a matched state: the transition closest to a 0.40 m previous step at 0.62 m/s. Time 0 = the trailing (rear) foot's swing start; the long step it must recover from has just landed. At this state F0 fails 29 % of swings, F1 20 %, F2 99 %, F2h 35 % (state cells, n 84–132).", [-0.5, 0.55], 0.0))
S.append(ident_scen("long", "Heel rise / late stance", "The same long-step runs, zoomed on the trailing foot's LATE STANCE: time 0 = its liftoff. Rigid feet pivot on their front edge (F0 0.28 m, F1 0.20 m ahead of the ankle); the articulated foot rolls over its MTP (0.15 m) with the toe flat. Compare heel height, ankle torque (dashed line = the 150 N·m limit) and the hindfoot pitch at liftoff.", [-0.45, 0.12], -0.2, anchor="lift"))
# the exact current toe-scuff failure: the same-maps walk from R@0.5, at each foot's first early-touchdown step
SCUFF = {"F0": 8, "F1": 3, "F2": 4, "F2h": 4}; runs = {}
for f in FEET:
    fn = f"walk_same_{f}_R0.5.js"; R = load(fn); k = SCUFF[f]; e = ev(R, k); ch = chain(R, e["sw"], e)
    runs[f] = {"file": fn, "anchor": e["tSw0"], "side": e["sw"], "sub": f"Controller A with F0's maps (Part 1), start R@0.5 — step {k}, the first swing that touched down early",
               "caption": cap(ch), "verdict": {"cls": "bad", "txt": f"touchdown at {e['uAt']:.2f} of the swing"}}
S.append({"title": "Toe-scuff failure", "desc": "The EXACT failure of the current walker: Controller A (F0's maps) from start R@0.5. F0's speed creeps from step 7 (speed error +0.03 → +0.15 → +0.44 m/s); the forward foothold request sits at its 0.30 m bound; the achieved step is 0.35–0.43 m; the next swing starts from a fully straight trailing leg (100 %) and the toe meets the turf at 57 % of the swing. The other feet, under the same maps, reach the same failure sooner (F0's maps mis-predict their stance dynamics). Time 0 = the failing swing's start.", "win": [-0.5, 0.7], "t0": 0.0, "runs": runs})
S.append(ident_scen("maxviable", "Maximum viable step", "The MAXIMUM viable step at a matched speed (0.55–0.75 m/s): of all transitions that continued (swing completed AND upright two steps later), the 95th-percentile previous-step length — F0 0.42 m, F1 0.39 m, F2 0.32 m, F2h 0.38 m (continuation after steps ≥ 0.40 m: F0 59 %, F1 38 %, F2 0 %, F2h 21 %). Each column replays the transition nearest that length. Time 0 = the trailing foot's swing start.", [-0.5, 0.6], 0.0))
for tag, title, desc in [("walk_own", "Controller-A walk — own maps", "Part 2 (the SEPARATED recalibration): each foot walks with Controller A fitted to ITS OWN identification data (round 2) and its own measured first step; the controller structure, bounds and inner loop are unchanged. Start R@0.5 for every foot. Six-start means: F0 9.5, F1 5.0, F2 5.0, F2h 6.2 upright steps (F0 with its reference maps: 11.2)."),
                         ("walk_same", "Controller-A walk — F0's maps", "Part 1 (the EQUIVALENT controller): every foot walks with F0's Controller A (maps m8a), start R@0.5. Six-start means: F0 11.2, F1 4.0, F2 4.3, F2h 5.3 upright steps.")]:
    runs = {}
    for f in FEET:
        fn = f"{tag}_{f}_R0.5.js"; R = load(fn); up = [e for e in R["events"] if e["td"] is not None]; t0 = R["events"][0]["tSw0"]
        dur = R["frames"][-1]["t"] - t0
        E = json.load(open(os.path.join(J, f"walkA_{'ownR2' if tag == 'walk_own' else 'sameMaps'}_{f}.json"))); e0 = next(x for x in E["starts"] if x["first"] == "R" and abs(x["at"] - 0.5) < 1e-9)
        assert e0["hash"] == R["hash"], (f, tag)
        ups = [x["upright"] for x in E["starts"]]
        runs[f] = {"file": fn, "anchor": t0, "side": "R", "follow": True, "sub": f"start R@0.5 · {e0['upright']} upright steps ({e0['outcome'].lower()} at {e0['tFall']:.2f} s) · six starts: mean {sum(ups)/len(ups):.1f}, {min(ups)}–{max(ups)}",
                   "caption": f"walking speed {e0['speed']:.2f} m/s · WBAM range {sum(e0['wbamRange'])/max(1,len(e0['wbamRange'])):.3f} m/s (human 0.014 ± 0.003) · ledger residual ≤ {e0['ledger']['resMax']:.3f} N·s", "verdict": {"cls": "good" if e0['upright'] >= 10 else "bad", "txt": f"{e0['upright']} steps"}, "_dur": dur}
    win = [-0.3, max(r["_dur"] for r in runs.values())]
    S.append({"title": title, "desc": desc, "win": win, "t0": -0.3, "runs": runs})
FOOT = ("Collider view, side projection onto the walking direction (viewer on the character's left: left leg dark, right leg light; the F2 toe body amber; an outline turns green when that foot carries > 5 % BW). "
        "The rendered boot mesh is not drawn — this is what the physics touches. Traces: the focus foot (the column's trailing / swing foot) — heel height, toe clearance (lowest front point; for F2 the toe body), MTP angle, ankle plantar-flexion torque (dashed: ±150 N·m limit), vertical load; ▲ liftoff, ▼ touchdown with the swing fraction. "
        "All runs are deterministic replays (hashes identical to the stored measurement files).")
for s in S: s.setdefault("foot", FOOT); s["foot"] = s["foot"] or FOOT
for s in S:
    for r in s["runs"].values(): r.pop("_dur", None)
open(os.path.join(V, "manifest.js"), "w").write("window.FG_MANIFEST = " + json.dumps({"scenarios": S}, indent=1) + ";\n")
print("scenarios", len(S), [s["title"] for s in S])
for s in S[:5]:
    for f, r in s["runs"].items(): print(s["title"][:22], f, r["caption"].replace("\n", " | "))
