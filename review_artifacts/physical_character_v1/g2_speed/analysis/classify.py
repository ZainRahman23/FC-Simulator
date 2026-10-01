# G2b speed work — FAILURE CLASSIFICATION (user's C): every step of every run gets one label, and every fall is attributed to the first step
# that was not OK. Definitions (numeric, from the step's own records — tools/g2walk_diag.js):
#   PLANNER-INFEASIBLE  the request could not physically be executed from the state at the decision:
#        reach: the final foothold lies beyond the swing leg's reach at the planned touchdown — horizontal distance from the swing hip
#               (extrapolated from the decision with the COM velocity) > R = √((0.995·L)² − Δy²), Δy = hip height − landing ankle height; or
#        time:  the air time left (planned touchdown − decision − the measured liftoff delay) is shorter than the minimum for the travel
#               distance at the swing leg's acceleration capacity, √(5.77·D / a_max) (a_max = 18 m/s², the same leg property pc_swing uses).
#   SWING-EXECUTION     feasible, but the swing did not get there: no liftoff, an early touchdown (< 80 % of the planned swing), a
#               mid-swing re-contact, or a landing > 8 cm from the final target.
#   CONTACT/TOUCHDOWN   landed where and when asked (≤ 8 cm, ≥ 80 %), but the contact went wrong: a stance slip > 2 cm or a peak vertical
#               load > 2.5 BW in the first 0.1 s.
#   OK                  none of the above.
# A fall is POST-TOUCHDOWN STABILITY when every step up to it was OK (placement succeeded; the following dynamics brought the body down).
import json, sys, numpy as np
L, AMAX = 0.9243, 18.0
def label(q, nxt):
    g, x = q.get("geo") or {}, q["exec"]; sw = q.get("swing") or {}
    if not q["dec"] and q["k"] == 0: pass
    fin = x["final"]
    # feasibility at the decision
    infeas = []
    if fin and g.get("hipDec") and g.get("tTdPlan") is not None and q.get("tDec") is not None:
        dt = g["tTdPlan"] - q["tDec"]; hipX = g["hipDec"][0] + g["comV"] * dt; dy = g["hipDec"][1] - (g["ankTdY"] if g.get("ankTdY") else 0.09)
        R = np.sqrt(max(0.0, (0.995 * L) ** 2 - dy * dy)); land = fin[0] + 0.10   # (ankle ≈ 0.10 m behind the sole centre for this outline)
        if land - hipX > R: infeas.append("reach")
        D = (fin[0] + (nxt_prev_step(q) or 0.3)); airLeft = dt - (x["liftDelay"] or 0.1)
        if airLeft < np.sqrt(5.77 * D / AMAX): infeas.append("time")
    if x["liftDelay"] is None: return ("PLANNER-INFEASIBLE" if infeas else "SWING-EXECUTION"), infeas + ["no liftoff"]
    early = x["uAt"] is not None and x["uAt"] < 0.8; far = x["err"] is not None and np.hypot(*x["err"]) > 0.08; recon = (sw.get("recon") or 0) > 0
    if early or far or recon or not q["upright"]:
        return ("PLANNER-INFEASIBLE" if infeas else "SWING-EXECUTION"), infeas + [w for w, b in (("early", early), ("far", far), ("re-contact", recon), ("no touchdown", not q["upright"])) if b]
    slip = (sw.get("stanceSlip") or 0) > 0.06; peak = (sw.get("tdPeakBW") or 0) > 2.5   # (slip: the p90 of the baseline's stance slip — the stance foot twists ≈ 2 cm per stance normally)
    if slip or peak: return "CONTACT/TOUCHDOWN", [w for w, b in (("slip", slip), ("impact", peak)) if b]
    return "OK", infeas
_prev = {}
def nxt_prev_step(q): return _prev.get(id(q))
def classify(fn):
    d = json.load(open(fn)); falls = {}; steps = {}
    for r in d["runs"]:
        rows = r["rows"]; first_bad = None
        for i, q in enumerate(rows):
            if i > 0 and rows[i - 1]["exec"]["ach"]: _prev[id(q)] = rows[i - 1]["exec"]["ach"][0]
            if q["k"] < 1: continue
            lab, why = label(q, rows[i + 1] if i + 1 < len(rows) else None); q["label"] = (lab, why); steps[lab] = steps.get(lab, 0) + 1
            # (the fall's TERMINAL event: the first step whose swing or contact actually failed — the earlier steps' labels are kept per step)
            if lab in ("SWING-EXECUTION", "CONTACT/TOUCHDOWN") or (lab == "PLANNER-INFEASIBLE" and any(w in why for w in ("early", "far", "re-contact", "no liftoff", "no touchdown"))):
                if first_bad is None: first_bad = (q["k"], lab, why)
            if not q["upright"]: break
        if r["tFall"] is not None:
            key = first_bad[1] if first_bad else "POST-TOUCHDOWN STABILITY"; falls[key] = falls.get(key, 0) + 1; r["attrib"] = first_bad or (None, key, [])
    return d, falls, steps
if __name__ == "__main__":
    for fn in sys.argv[1:]:
        d, falls, steps = classify(fn)
        print(f"{fn.split('/')[-1]}: falls {sum(falls.values())}/{len(d['runs'])} attributed: " + ", ".join(f"{k} {v}" for k, v in sorted(falls.items())) + " | steps: " + ", ".join(f"{k} {v}" for k, v in sorted(steps.items())))
        for r in d["runs"]:
            if r.get("attrib"): print(f"   {r['first']}@{r['at']}: first non-OK step {r['attrib'][0]} → {r['attrib'][1]} {r['attrib'][2]}")
