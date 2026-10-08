#!/usr/bin/env python3
# COUNTERFACTUAL DIAGNOSTIC CF-4 — per-step trends of the principal stability quantities (no simulation; reads tools/loco_probe.mjs outputs).
# usage: python3 plot_cf4_trends.py <out.png> <title> <run.json.gz> [<run.json.gz> ...]   (one line per run; label = the run's body)
import sys, json, gzip
import matplotlib; matplotlib.use("Agg"); import matplotlib.pyplot as plt
out, title, files = sys.argv[1], sys.argv[2], sys.argv[3:]
inv = lambda w: sum(v for k, v in (w or {}).items() if k in ("ankle_L.z", "ankle_R.z"))
Q = [  # (panel title, y label, per-step value; steps with a decision and a result)
  ("COM forward speed at swing decision", "mm/s", lambda s: s["cmd"]["swingInit"]["comV"][0] * 1000),
  ("DCM lateral offset from stance centroid at decision (inward +)", "mm", lambda s: abs(s["cmd"]["swingInit"]["xiRelStance"][1]) * 1000),
  ("DCM forward lead over stance centroid at decision", "mm", lambda s: s["cmd"]["swingInit"]["xiRelStance"][0] * 1000),
  ("DCM tracking error, max in transfer", "mm", lambda s: s["transfer"]["xiErrMax"] * 1000),
  ("DCM margin to stance region, min in single support", "mm", lambda s: s["result"]["xiStanceMarginMinSSmm"]),
  ("Touchdown vertical speed", "mm/s", lambda s: s["result"]["tdVel"]["down"] * 1000),
  ("Landing error vs walking-frame target (lateral)", "mm", lambda s: (s["result"].get("walkLanding") or {}).get("latErrMm")),
  ("Actuator saturation per cycle (transfer + step)", "axis-ticks", lambda s: s["transfer"]["sat"] + s["result"]["satAxisTicks"]),
  ("of which ankle inversion (ankle .z)", "axis-ticks", lambda s: inv(s["transfer"]["satWho"]) + inv(s["result"]["satWho"])),
  ("Leg hard-limit margin, min in step", "deg", lambda s: s["result"]["legHardMarginMinDeg"]),
  ("Positive energy-closure residual per cycle", "J", lambda s: s["transfer"]["eClosPos"] + s["result"]["energyClosurePosJ"]),
  ("Foot yaw drift since t = 1 s (L solid, R dashed)", "deg", None),
  ("Stance width in the walking frame at decision", "mm", lambda s: s["cmd"]["init"]["walkFrame"]["widthM"] * 1000),
  ("Step period (touchdown to touchdown)", "s", lambda s: (s["result"].get("cf4") or {}).get("stepPeriodS")),
  ("Max torque-command step (Δτ0) in step", "N·m", lambda s: s["result"]["dTau0MaxNm"]),
  ("Pelvis tilt max in step", "deg", lambda s: s["result"]["pelvisTiltMaxDeg"]),
]
fig, axs = plt.subplots(4, 4, figsize=(18, 14)); axs = axs.ravel()
for f in files:
    d = json.load(gzip.open(f)); st = [s for s in d["steps"] if s.get("result") and s.get("cmd")]; lab = d["run"]["human"]
    for ax, (t, yl, fn) in zip(axs, Q):
        if fn is None:
            ks = [s["k"] for s in st]; l, = ax.plot(ks, [s["cmd"]["init"]["footYawDrift"][0] for s in st], "-o", ms=3, label=lab)
            ax.plot(ks, [s["cmd"]["init"]["footYawDrift"][1] for s in st], "--o", ms=3, color=l.get_color()); continue
        pts = [(s["k"], fn(s)) for s in st]; pts = [(k, v) for k, v in pts if v is not None]
        ax.plot([k for k, _ in pts], [v for _, v in pts], "-o", ms=3, label=lab)
for ax, (t, yl, _) in zip(axs, Q): ax.set_title(t, fontsize=9); ax.set_ylabel(yl, fontsize=8); ax.set_xlabel("step", fontsize=8); ax.tick_params(labelsize=7); ax.grid(alpha=0.3)
axs[0].axhline(2.1, color="k", lw=0.8, ls=":"); axs[0].text(1, 2.6, "CF-3 max 2.1 mm/s", fontsize=7)
axs[0].legend(fontsize=7); fig.suptitle(title, fontsize=12); fig.tight_layout(rect=(0, 0, 1, 0.97)); fig.savefig(out, dpi=80)
print("wrote", out)
