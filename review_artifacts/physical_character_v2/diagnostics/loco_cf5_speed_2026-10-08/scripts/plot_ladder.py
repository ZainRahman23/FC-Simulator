#!/usr/bin/env python3
# CF-5 SPEED LADDER — per-step trends at each speed level (V2-REF solid, by level; the other bodies dashed) and the per-level gait summary. No simulation.
# usage: python3 plot_ladder.py <out.png> <ladder run dir> <CF-5 evidence dir (L0)>
import sys, os, json, gzip, glob
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); from ladder_analysis import analyse
import matplotlib; matplotlib.use("Agg"); import matplotlib.pyplot as plt
out, dl, d0 = sys.argv[1], sys.argv[2], sys.argv[3]
runs = [("L0", "V2-REF", os.path.join(d0, "V2-REF_s20.json.gz"))] + [(L, "V2-REF", os.path.join(dl, f"{L}_V2-REF_s20.json.gz")) for L in ["L1", "L2", "L2b", "L3"]]
runs += [(L, h, os.path.join(dl, f"{L}_{h}_s20.json.gz")) for L in ["L1", "L2"] for h in ["V2-165-62", "V2-198-92", "V2-long-legs"]]
col = {"L0": "tab:blue", "L1": "tab:green", "L2": "tab:orange", "L2b": "tab:red", "L3": "tab:purple"}; bodyStyle = {"V2-REF": "-", "V2-165-62": "--", "V2-198-92": ":", "V2-long-legs": "-."}
inv = lambda w: sum(v for k, v in (w or {}).items() if k in ("ankle_L.z", "ankle_R.z"))
P = [("DCM lateral offset at swing decision (toward swing side)", "mm", lambda s: abs(s["cmd"]["walk5"]["latAtDecisionMm"]) if s.get("cmd") and s["cmd"].get("walk5") else None),
     ("Ankle-inversion saturation per cycle", "axis-ticks", lambda s: inv(s["transfer"]["satWho"]) + inv(s["result"]["satWho"]) if s.get("result") else None),
     ("Single-support VRP r, lateral", "mm", lambda s: abs(s["cmd"]["walk5"]["rRelStanceMm"][1]) if s.get("cmd") and s["cmd"].get("walk5") and s["cmd"]["walk5"].get("rRelStanceMm") else None),
     ("COM forward at touchdown", "mm/s", lambda s: s["result"]["cf4"]["atTouchdown"]["comV"][0] * 1000 if s.get("result") and (s["result"].get("cf4") or {}).get("atTouchdown") else None),
     ("COM forward, minimum in the step", "mm/s", lambda s: s["result"]["cf4"].get("vFwdMinStepMmS") if s.get("result") and s["result"].get("cf4") else None),
     ("Walking capture margin at touchdown (both-feet hull)", "mm", lambda s: s["result"]["cf4"]["atTouchdown"]["xiBothFeetHullMarginMm"] if s.get("result") and (s["result"].get("cf4") or {}).get("atTouchdown") else None),
     ("DCM tracking error max in the swing", "mm", lambda s: s["result"]["xiErrMaxMm"] if s.get("result") else None),
     ("Leg hard-limit margin, min", "deg", lambda s: min(s["result"]["legHardMarginMinDeg"], s["transfer"]["hardMin"]) if s.get("result") else None),
     ("Foot yaw drift, left (toe-out)", "deg", lambda s: s["cmd"]["init"]["footYawDrift"][0] if s.get("cmd") else None),
     ("Foot slip (transfer + step) max", "mm", lambda s: max(s["result"]["stanceSlipMm"], max(s["transfer"]["footSlip"]) * 1000) if s.get("result") else None),
     ("Stance width (walking frame)", "mm", lambda s: s["cmd"]["init"]["walkFrame"]["widthM"] * 1000 if s.get("cmd") else None),
     ("Energy-closure residual per cycle", "J", lambda s: s["result"]["energyClosurePosJ"] + s["transfer"]["eClosPos"] if s.get("result") else None)]
fig, axs = plt.subplots(4, 4, figsize=(22, 17)); axs = axs.ravel(); summ = []
for L, h, f in runs:
    if not os.path.exists(f): continue
    d = json.load(gzip.open(f)); st = [s for s in d["steps"] if not s.get("tail")]; a = analyse(d); summ.append((L, h, a))
    for ax, (t, yl, fn) in zip(axs, P):
        pts = []
        for s in st:
            try: v = fn(s)
            except Exception: v = None
            if v is not None: pts.append((s["k"], v))
        ax.plot([k for k, _ in pts], [v for _, v in pts], bodyStyle[h], marker="o" if h == "V2-REF" else None, ms=3, color=col[L], lw=1.4 if h == "V2-REF" else 1.0, label=f"{L} {h}{' (failed step ' + str(a['failStep']) + ')' if a['fail'] else ''}")
for ax, (t, yl, _) in zip(axs, P): ax.set_title(t, fontsize=9); ax.set_ylabel(yl, fontsize=8); ax.set_xlabel("step", fontsize=8); ax.tick_params(labelsize=7); ax.grid(alpha=0.3)
axs[0].legend(fontsize=6, ncol=2)
ref = [(L, a) for L, h, a in summ if h == "V2-REF"]; xs = [a["realized"]["speedMmS"] for _, a in ref]
def panel(ax, t, yl, ys, lab=None):
    ax.plot(xs, ys, "-o", color="k"); [ax.annotate(L, (x, y), fontsize=7, textcoords="offset points", xytext=(3, 3)) for (L, _), x, y in zip(ref, xs, ys) if y is not None]; ax.set_title(t, fontsize=9); ax.set_xlabel("realized speed V2-REF, mm/s", fontsize=8); ax.set_ylabel(yl, fontsize=8); ax.grid(alpha=0.3)
panel(axs[12], "Cadence (V2-REF)", "steps / s", [a["realized"]["cadenceHz"] for _, a in ref])
panel(axs[13], "Both feet in contact per cycle (V2-REF); flight = 0 at every level", "s", [a["support"]["bothContactS"][0] if a["support"]["bothContactS"] else None for _, a in ref])
panel(axs[14], "COM forward: cycle minimum (V2-REF)", "mm/s", [a["comCycleMmS"]["min"][0] if a["comCycleMmS"]["min"] else None for _, a in ref])
panel(axs[15], "Ankle-inversion saturation, last executed cycle (V2-REF)", "axis-ticks", [a["trends"].get("satAnkleInv", {}).get("last") for _, a in ref])
fig.suptitle("CF-5 SPEED LADDER (diagnostic) — per-step trends by speed level (V2-REF solid; light / short --, heavy / tall :, long-legs -.) and the V2-REF gait summary", fontsize=12)
fig.tight_layout(rect=(0, 0, 1, 0.97)); fig.savefig(out, dpi=72); print("wrote", out)
