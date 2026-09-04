#!/usr/bin/env python3
"""Failure classification (integration pass item 24) for gk_envelope.js outputs.
Every conceded on-target cell gets causal tags from MEASURED state and one BINDING constraint:
  POSITIONING-LIMITED   ball crosses the keeper plane outside the static envelope from the SET root but inside it from a ±1 m prepared root
  REACTION-LIMITED      usable time (flight − latency) < the causal action time for a 0.3 m standing reach
  PREPARE-LIMITED       a lateral prep step was needed (|Δlat req| > 0.5) but < 40 % of it was completed before commit
  ACTION-TIME-LIMITED   committed action could not finish before the ball (commit + execT > arrival at the point) and the point was inside the envelope
  ABSOLUTE-REACH / LATERAL-REACH / VERTICAL-REACH   selected point outside the envelope (norm > 1): which axis dominates
  PREDICTION-LIMITED    closest approach far from the committed target (> 0.35 m) although the target was reachable and time-feasible
  NO-CONTACT            none of the above explains it (residual)
  FINGERTIP-THROUGH / WEAK-PARRY-THROUGH / BODY-THROUGH / FOOT-LEG-THROUGH / REBOUND-GOAL / HANDLING-FAILURE   contact happened, goal anyway
  python3 gk_failure_classify.py env.json [env2.json ...]
"""
import json, sys, math
from collections import Counter
def classify(D):
    env = D["env"]; out = []
    for c in D["cells"]:
        if c.get("unsolved"): continue
        inframe = c.get("inFrame", True) if D.get("target") == "plane" else True
        if not c.get("goal") or not inframe: continue
        tags = []; ct = c.get("contact"); cm = c.get("commit")
        if ct:
            o = ct["outcome"]
            if o.startswith("FINGERTIP"): tags.append("FINGERTIP-THROUGH")
            elif o.startswith("WEAK PARRY"): tags.append("WEAK-PARRY-THROUGH")
            elif o.startswith("BODY"): tags.append("BODY-THROUGH")
            elif "FOOT" in o or "LEG" in o: tags.append("FOOT/LEG-THROUGH")
            elif o.startswith("CONTROLLED PARRY"): tags.append("REBOUND-GOAL")
            if ct.get("catchScore") is not None and ct.get("catchThresh") is not None and ct["catchScore"] < ct["catchThresh"] and (ct.get("sRel") or 99) < 16: tags.append("HANDLING-FAILURE")
            binding = tags[0] if tags else "CONTACT-GOAL"
        else:
            usable = c["usable"]; lat = abs(c["y"] - c["setY"]); dz = c["z"] - env["handZ"]
            vmax = env["maxVertUp"] if dz >= 0 else env["maxVertDown"]
            normSet = ((lat / env["maxLat"]) ** 2.2 + (abs(dz) / vmax) ** 2.2) ** (1 / 2.2)
            normPrep = ((max(0, lat - 1.0) / env["maxLat"]) ** 2.2 + (abs(dz) / vmax) ** 2.2) ** (1 / 2.2)
            if usable < 0.10: tags.append("REACTION-LIMITED")
            if cm:
                if cm["norm"] is not None and cm["norm"] > 1.0:
                    if abs(dz) / vmax > lat / env["maxLat"] * 1.3: tags.append("VERTICAL-REACH-LIMITED")
                    elif lat / env["maxLat"] > abs(dz) / vmax * 1.3: tags.append("LATERAL-REACH-LIMITED")
                    else: tags.append("ABSOLUTE-REACH-LIMITED")
                if cm.get("feasible") is False or (cm.get("avail") is not None and cm["avail"] + 0.02 < cm["execT"]): tags.append("ACTION-TIME-LIMITED")
                pr = c.get("prep")
                if pr and pr.get("tgt") and abs(pr["tgt"][1] - c["setY"]) > 0.5:
                    done = abs(cm["feet"][1] - c["setY"]) / max(1e-6, abs(pr["tgt"][1] - c["setY"]))
                    if done < 0.4: tags.append("PREPARE-LIMITED")
                cl = c.get("closest")
                if cl and cm["norm"] is not None and cm["norm"] <= 1.0 and cm.get("feasible") and cl["d"] > 0.35: tags.append("PREDICTION-LIMITED")
            else:
                tags.append("COMMIT-LIMITED")
            if normSet > 1.0 and normPrep <= 1.0: tags.append("POSITIONING-LIMITED")
            if not tags: tags.append("NO-CONTACT")
            order = ["REACTION-LIMITED", "VERTICAL-REACH-LIMITED", "LATERAL-REACH-LIMITED", "ABSOLUTE-REACH-LIMITED", "ACTION-TIME-LIMITED", "PREPARE-LIMITED", "PREDICTION-LIMITED", "POSITIONING-LIMITED", "COMMIT-LIMITED", "NO-CONTACT"]
            binding = next(t for t in order if t in tags)
        out.append({"y": c["y"], "z": c["z"], "tags": tags, "binding": binding})
    return out
if __name__ == "__main__":
    for f in sys.argv[1:]:
        D = json.load(open(f)); r = classify(D); m = D["meta"]
        tot = sum(1 for c in D["cells"] if not c.get("unsolved"))
        print("\n%s  %s %s %.1f m %s  — %d on-target concessions of %d cells" % (f, m["profileName"], m["family"], m["dist"], ("flight %s" % m["flight"]) if m.get("flight") else ("speed %s" % m["speed"]), len(r), tot))
        C = Counter(x["binding"] for x in r)
        for k, v in C.most_common(): print("   %-26s %4d  (%.0f%%)" % (k, v, 100 * v / max(1, len(r))))
        T = Counter(t for x in r for t in x["tags"])
        print("   all tags:", dict(T.most_common()))
