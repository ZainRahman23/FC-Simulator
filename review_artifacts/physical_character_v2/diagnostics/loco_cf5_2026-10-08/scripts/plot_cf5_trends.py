#!/usr/bin/env python3
# COUNTERFACTUAL DIAGNOSTIC CF-5 — per-step trends of the continuous-walking and stability quantities (no simulation; reads tools/loco_probe.mjs --cf=5 outputs; tail excluded).
# usage: python3 plot_cf5_trends.py <out.png> <title> <run.json.gz> [...]
import sys, json, gzip
import matplotlib; matplotlib.use("Agg"); import matplotlib.pyplot as plt
out, title, files = sys.argv[1], sys.argv[2], sys.argv[3:]
inv = lambda w: sum(v for k, v in (w or {}).items() if k in ("ankle_L.z", "ankle_R.z"))
rc = lambda s: s["result"]["cf4"]
fv = lambda g: None if not g or g.get("comV") is None else g["comV"][0] * 1000
Q = [
  ("COM forward at swing decision", "mm/s", lambda s: fv(s["cmd"]["swingInit"])),
  ("COM forward at measured liftoff", "mm/s", lambda s: fv(rc(s).get("atLift"))),
  ("COM forward 0.1 s before touchdown", "mm/s", lambda s: fv(rc(s).get("preTouchdown"))),
  ("COM forward at touchdown", "mm/s", lambda s: fv(rc(s).get("atTouchdown"))),
  ("COM forward after load acceptance", "mm/s", lambda s: fv(rc(s).get("afterAcceptance"))),
  ("COM forward, minimum in the step (C_min dotted)", "mm/s", lambda s: rc(s).get("vFwdMinStepMmS")),
  ("COM lateral at touchdown (|·|)", "mm/s", lambda s: abs(rc(s)["atTouchdown"]["comV"][1]) * 1000),
  ("Pelvis forward at touchdown", "mm/s", lambda s: rc(s)["atTouchdown"]["pelvisV"][0] * 1000),
  ("DCM rel. stance centroid at decision, forward", "mm", lambda s: s["cmd"]["walk5"]["leadAtDecisionMm"]),
  ("DCM at touchdown rel. old stance (fwd solid, |lat| dashed)", "mm", None),
  ("Walking capture margin at touchdown (both-feet hull)", "mm", lambda s: rc(s)["atTouchdown"]["xiBothFeetHullMarginMm"]),
  ("Single-support VRP r rel. stance (fwd solid, |lat| dashed)", "mm", "r"),
  ("DCM tracking error max: transfer (solid), swing (dashed)", "mm", "err"),
  ("Step length chosen (stance → new foot)", "m", lambda s: s["cmd"]["walk5"].get("chosenStepM")),
  ("Stance width (walking frame) at decision", "mm", lambda s: s["cmd"]["init"]["walkFrame"]["widthM"] * 1000),
  ("Landing error vs walking-frame target, lateral", "mm", lambda s: s["result"]["walkLanding"]["latErrMm"]),
  ("Touchdown vertical speed", "mm/s", lambda s: s["result"]["tdVel"]["down"] * 1000),
  ("Foot slip (transfer + step) max", "mm", lambda s: max(s["result"]["stanceSlipMm"], max(s["transfer"]["footSlip"]) * 1000)),
  ("Trailing-foot load at decision", "% BW", lambda s: s["cmd"]["swingInit"]["trailFzBW"] * 100),
  ("Leg hard-limit margin, min", "deg", lambda s: min(s["result"]["legHardMarginMinDeg"], s["transfer"]["hardMin"])),
  ("Saturation per cycle: all (solid), ankle inversion (dashed)", "axis-ticks", "sat"),
  ("Max torque-command step Δτ0", "N·m", lambda s: max(s["result"]["dTau0MaxNm"], s["transfer"]["dTau0Max"])),
  ("Positive energy-closure residual per cycle", "J", lambda s: s["result"]["energyClosurePosJ"] + s["transfer"]["eClosPos"]),
  ("Foot yaw drift (L solid, R dashed)", "deg", "yaw"),
  ("Step period (touchdown to touchdown)", "s", lambda s: rc(s).get("stepPeriodS")),
]
fig, axs = plt.subplots(5, 5, figsize=(24, 19)); axs = axs.ravel()
for f in files:
    d = json.load(gzip.open(f)); st = [s for s in d["steps"] if s.get("result") and s.get("cmd") and not s.get("tail")]; lab = d["run"]["human"]; ks = [s["k"] for s in st]; col = None
    for ax, (t, yl, fn) in zip(axs, Q):
        if fn is None: a, = ax.plot(ks, [rc(s)["atTouchdown"]["xiRelStance"][0] * 1000 for s in st], "-o", ms=3, label=lab); ax.plot(ks, [abs(rc(s)["atTouchdown"]["xiRelStance"][1]) * 1000 for s in st], "--o", ms=3, color=a.get_color()); continue
        if fn == "r": a, = ax.plot(ks, [s["cmd"]["walk5"]["rRelStanceMm"][0] for s in st], "-o", ms=3, label=lab); ax.plot(ks, [abs(s["cmd"]["walk5"]["rRelStanceMm"][1]) for s in st], "--o", ms=3, color=a.get_color()); continue
        if fn == "err": a, = ax.plot(ks, [s["transfer"]["xiErrMax"] * 1000 for s in st], "-o", ms=3, label=lab); ax.plot(ks, [s["result"]["xiErrMaxMm"] for s in st], "--o", ms=3, color=a.get_color()); continue
        if fn == "sat": a, = ax.plot(ks, [s["transfer"]["sat"] + s["result"]["satAxisTicks"] for s in st], "-o", ms=3, label=lab); ax.plot(ks, [inv(s["transfer"]["satWho"]) + inv(s["result"]["satWho"]) for s in st], "--o", ms=3, color=a.get_color()); continue
        if fn == "yaw": a, = ax.plot(ks, [s["cmd"]["init"]["footYawDrift"][0] for s in st], "-o", ms=3, label=lab); ax.plot(ks, [s["cmd"]["init"]["footYawDrift"][1] for s in st], "--o", ms=3, color=a.get_color()); continue
        pts = [(s["k"], fn(s)) for s in st]; pts = [(k, v) for k, v in pts if v is not None]; ax.plot([k for k, _ in pts], [v for _, v in pts], "-o", ms=3, label=lab)
for ax, (t, yl, _) in zip(axs, Q): ax.set_title(t, fontsize=9); ax.set_ylabel(yl, fontsize=8); ax.set_xlabel("step", fontsize=8); ax.tick_params(labelsize=7); ax.grid(alpha=0.3)
for i in range(6): axs[i].axhline(0, color="k", lw=0.6)
axs[5].axhline(10, color="k", lw=0.8, ls=":"); axs[3].axhline(10, color="k", lw=0.8, ls=":"); axs[3].text(1, 11, "C_min 10 mm/s", fontsize=7)
axs[0].legend(fontsize=7); fig.suptitle(title, fontsize=13); fig.tight_layout(rect=(0, 0, 1, 0.975)); fig.savefig(out, dpi=72); print("wrote", out)
