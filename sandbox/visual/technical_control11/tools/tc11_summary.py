#!/usr/bin/env python3
# technical_control11/tools/tc11_summary.py — the feet sweep (tc11_sweep.jsonl) summarised per rating × body, per case, with the RUN-1 reference and
# the contacts the body flags as visually infeasible as scheduled.   python3 tc11_summary.py <evidence dir>
import json, sys, os, statistics as st
ev = sys.argv[1]; rows = [json.loads(l) for l in open(os.path.join(ev, "tc11_sweep.jsonl"))]; ref = json.load(open(os.path.join(ev, "tc11_run1_ref.json")))["run1"]
TOL = {"INSIDE": 36, "OUTSIDE": 34, "LACES": 28, "SOLE": 40}
def agg(rs):
    S = [r["sum"] for r in rs]; C = [c for r in rs for c in r["contacts"]]; P = [c for c in C if not c["late"]]; md = lambda a: round(st.median(a), 1) if a else None
    oh = lambda s: sum(s["overHard"].values()); oc = lambda s: sum(s["overComfort"].values())
    return {"runs": len(rs), "ankW_p99_median": md([s["ankW"]["p99"] for s in S]), "ankW_p99_max": max(s["ankW"]["p99"] for s in S), "ankW_max": max(s["ankW"]["max"] for s in S),
        "ankA_p99_median": md([s["ankA"]["p99"] for s in S]), "ankA_p99_max": max(s["ankA"]["p99"] for s in S), "footYawShin_max": max(s["yawShin"]["max"] for s in S),
        "df_min": min(s["df"]["min"] for s in S), "df_max": max(s["df"]["max"] for s in S), "inv_min": min(s["inv"]["min"] for s in S), "inv_max": max(s["inv"]["max"] for s in S),
        "knee_min": min(s["knee"]["min"] for s in S), "kneeLock_pct_max": max(s["kneeLock"] for s in S), "hip_min": min(s["hip"]["min"] for s in S), "hip_max": max(s["hip"]["max"] for s in S),
        "overHard_pct_median": md([oh(s) for s in S]), "overHard_pct_max": round(max(oh(s) for s in S), 2), "overComfort_pct_median": md([oc(s) for s in S]),
        "ballPen_swing_frames": sum(s["ballPen"]["swingFrames"] for s in S), "ballPen_planted_frames": sum(s["ballPen"]["plantedFrames"] for s in S), "ballPen_maxCm": max(max(s["ballPen"]["swingMaxCm"], s["ballPen"]["plantedMaxCm"]) for s in S),
        "slip_mm_max": max(s["slipMm"] for s in S), "slip_mm_median": md([s["slipMm"] for s in S]),
        "contacts": len(C), "late_decisions": sum(1 for c in C if c["late"]), "gap_cm_absmax": max(abs(c["gap"]) for c in C), "gap_cm_within1": sum(1 for c in C if abs(c["gap"]) <= 1.0),
        "face_ok": sum(1 for c in P if c["faceOk"]), "prepared": len(P), "oriErr_median": md([c["oriErr"] for c in P]), "oriErr_max": max(c["oriErr"] for c in P),
        "within_tol": sum(1 for c in P if c["oriErr"] <= TOL.get(c["surface"], 35)),
        "pre50Ank_median": md([c["pre50Ank"] for c in P if c["pre50Ank"] is not None]), "pre50Ank_max": max(c["pre50Ank"] or 0 for c in P), "post50Ank_median": md([c["post50Ank"] for c in P if c["post50Ank"] is not None]), "post50Ank_max": max(c["post50Ank"] or 0 for c in P),
        "pre50Yaw_max": max(c["pre50Yaw"] or 0 for c in P), "post50Yaw_max": max(c["post50Yaw"] or 0 for c in P), "ankWpk_contact_max": max(c["ankWpk"] for c in P),
        "reach_max": max(c["reach"] for c in C), "supKnee_min": min(c["supKnee"] for c in C)}
out = {"run1": ref, "by": {}, "cases": [], "flags": [], "gameplay_identical": None}
for rt in ["99/99/99", "80/80/80", "50/50/50"]:
    for b in ["tc1", "tc11"]: out["by"][f"{rt} {b}"] = agg([r for r in rows if r["ratings"] == rt and r["body"] == b])
pairs = {}
for r in rows: pairs.setdefault((r["key"], r["ratings"]), {})[r["body"]] = r
out["gameplay_identical"] = f'{sum(1 for v in pairs.values() if v["tc1"]["hash"] == v["tc11"]["hash"])}/{len(pairs)}'
for (k, rt), v in pairs.items():
    a, b = v["tc1"]["sum"], v["tc11"]["sum"]; out["cases"].append({"key": k, "ratings": rt, "id": v["tc11"]["id"], "tc1": {"ankW_p99": a["ankW"]["p99"], "ankW_max": a["ankW"]["max"], "dfMax": a["df"]["max"], "kneeMin": a["knee"]["min"], "overHard": round(sum(a["overHard"].values()), 1), "pen": a["ballPen"]["swingFrames"] + a["ballPen"]["plantedFrames"], "slip": a["slipMm"]},
        "tc11": {"ankW_p99": b["ankW"]["p99"], "ankW_max": b["ankW"]["max"], "dfMax": b["df"]["max"], "kneeMin": b["knee"]["min"], "overHard": round(sum(b["overHard"].values()), 2), "pen": b["ballPen"]["swingFrames"] + b["ballPen"]["plantedFrames"], "slip": b["slipMm"], "late": b["contacts"]["late"], "oriMax": b["contacts"]["prepared"]["oriErrMax"]}})
    for c in v["tc11"]["contacts"]:
        why = []
        if c["late"]: why.append("late decision (" + c["late"] + ")")
        if not c["late"] and c["oriErr"] > TOL.get(c["surface"], 35): why.append(f'surface {c["oriErr"]}° off the impulse')
        if not c["late"] and not c["faceOk"]: why.append("nearest boot face " + c["face"])
        if c["reach"] > 0.985: why.append(f'reach {c["reach"]}')
        if why: out["flags"].append({"key": k, "ratings": rt, "t": c["t"], "F": c["F"], "surface": c["surface"], "why": why})
json.dump(out, open(os.path.join(ev, "tc11_summary.json"), "w"), indent=1)
L = [f'gameplay identical (ball every tick + every contact, TC1 body vs TC1.1 body): {out["gameplay_identical"]}', "RUN-1 reference: " + json.dumps(ref)]
keys = list(out["by"]["99/99/99 tc1"].keys())
for k in keys: L.append(f"{k:24s} " + "  ".join(f'{rt.split("/")[0]} {b}: {out["by"][rt + " " + b][k]}' for rt in ["99/99/99", "80/80/80", "50/50/50"] for b in ["tc1", "tc11"]))
L.append(f'flagged contacts: {len(out["flags"])}'); L += [f'  {f["key"]} {f["ratings"]} t {f["t"]} {f["F"]} {f["surface"]}: {"; ".join(f["why"])}' for f in out["flags"]]
open(os.path.join(ev, "tc11_summary.txt"), "w").write("\n".join(L) + "\n"); print("\n".join(L))
