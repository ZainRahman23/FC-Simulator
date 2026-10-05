// Audit of T-A's decision rule on the official PSTAR3 runs (instrumented re-runs, hash-identical): at each tick after contact and before LOAD_ACCEPT, the
// longest feasible ramp under (a) the frozen rule (acceptance delayed by the 0.04 s margin) and (b) acceptance at the measured-contact debounce (no timing margin);
// before contact, the plan's feasibility under (a) frozen (λ return AND acceptance delayed by the margin) and (b) λ return at the planned touchdown, acceptance delayed.
import fs from "fs"; import zlib from "zlib";
import { captureContext, simulate, TA } from "/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v2/sandbox/visual/physchar2/ctrl/v2_capture.js";
const rd = (f) => JSON.parse(zlib.gunzipSync(fs.readFileSync(f))), K = { dt: 1 / 240, horizon: 2.5, fellBeyond: 0.05, kXi: 1 / 3, minShare: 0.10, acceptDebounce: 0.05, abortDur: 0.6 };
const longest = (cx, o) => { for (let Tr = TA.TrMax; Tr >= TA.TrMin - 1e-9; Tr -= TA.TrStep) if (simulate(cx, { ...o, Tr }).recovers) return +Tr.toFixed(3); return null; };
for (const b of ["V2-long-legs", "V2-REF", "V2-175-70", "V2-165-62"]) { const R = rd(`ta_${b}.json.gz`), C = R.putDown[0].cap, n = C.n, lamFrom = C.lamFrom;
  const ctx = (x) => captureContext({ xi: x.xi, w0: x.dg.w0, p: x.dg.p, polys: x.dg.polys, heading: x.dg.heading }, n, K);
  // the supervisor reads the previous tick's info: decisions at row i use row i−1's dg
  const rows = R.rows.filter(x => x.dg), at = (t) => rows.findIndex(x => x.t >= t - 1e-9);
  console.log(`\n${b}: abort +0, contact +${(C.tContact - C.t0).toFixed(3)}, accept +${(C.tAccept - C.t0).toFixed(3)}; frozen run chose Tput ${C.Tput.toFixed(3)}, TrFinal ${C.TrFinal}, verdict ${C.verdict}`);
  // ramp stage
  for (let i = at(C.tContact); i < at(C.tAccept); i += 3) { const x = rows[i - 1], t = rows[i].t, cx = ctx(x), dl = Math.max(0, 0.05 - (t - C.tContact)), lam0 = C.tContact - t;
    const a = longest(cx, { tc: Math.min(0, lam0), lam0, tAcc: dl + TA.margin, lamFrom, floorRule: "ta" }), bb = longest(cx, { tc: Math.min(0, lam0), lam0, tAcc: dl, lamFrom, floorRule: "ta" });
    console.log(`  ramp stage +${(t - C.t0).toFixed(3)}: longest feasible Tr — frozen (margin on acceptance) ${a ?? "none"} | acceptance at the measured debounce ${bb ?? "none"}`); }
  // descent stage, plan as executed (remaining from the run's T-A record is not logged per tick; use the final plan's end time C.t0 + C.Tput)
  for (const dtA of [0.0, 0.03, 0.08, 0.15]) { const i = at(C.t0 + dtA); if (i < 1) continue; const t = rows[i].t, x = rows[i - 1], cx = ctx(x), rem = Math.max(0.01, C.t0 + C.Tput - t);
    for (const Tr of [0.225, 0.15, 0.10]) { const fz = simulate(cx, { tc: rem + TA.margin, tAcc: rem + TA.margin + 0.05, Tr, lamFrom, floorRule: "ta" }).recovers, cor = simulate(cx, { tc: rem, lam0: rem, tAcc: rem + TA.margin + 0.05, Tr, lamFrom, floorRule: "ta" }).recovers;
      if (Tr === 0.225 || Tr === 0.10) console.log(`  descent +${(t - C.t0).toFixed(3)} rem ${rem.toFixed(3)} Tr ${Tr}: frozen (λ start delayed by margin) ${fz ? "feasible" : "infeasible"} | λ start at the planned touchdown ${cor ? "feasible" : "infeasible"}`); } } }
