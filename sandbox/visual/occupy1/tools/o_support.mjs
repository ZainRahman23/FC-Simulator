// occupy1/tools/o_support.mjs — §8 SUPPORT: per stance (a foot planted), how far occupancy moved that player's root while the foot stayed
// (the support anchor's reach), and the drawn leg's hip → ankle distance against its length (over-reach). Review cases, OCC.
import { ENV } from "./o_env.mjs";
import { OCASES } from "../o_cases.js";
import { runO } from "../o_run.js";
const DT = 1 / 240, hyp = Math.hypot, ids = process.argv[2] ? process.argv[2].split(",") : OCASES.map((x) => x.id);
for (const id of ids) { const tc = OCASES.find((x) => x.id === id), R = {}; for (const m of ["OLD", "OCC"]) R[m] = runO(ENV, tc, m); const W = R.OCC.W; let worst = { v: 0 }, reachO = 0, reachC = 0;
  for (const [p, key] of [[W.att, "dA"], [W.def, "dD"]]) { const acc = new Map(); for (const x of W.occ.log) { const d = x[key]; if (!(d[0] || d[1])) continue; const P = p.planAt(x.t); for (const X of ["R", "L"]) { const s = P.stances[X].find((q) => q.t0 <= x.t + 1e-9 && q.t1 > x.t + 1e-9); if (!s) continue; const kk = X + s.id + "@" + s.t0.toFixed(4), a = acc.get(kk) || [0, 0]; a[0] += d[0]; a[1] += d[1]; acc.set(kk, a); const v = hyp(a[0], a[1]); if (v > worst.v) worst = { v, who: p.pid, foot: X, t: +(x.t - R.OCC.t0).toFixed(3), conflict: x.conflict }; } } }
  // (the drawn legs: hip joint → ankle, the longest, OLD vs OCC)
  for (const [m, F] of [["OLD", R.OLD.W.frames], ["OCC", W.frames]]) for (const fr of F.values()) for (const b of [fr.a.J, fr.d.J]) for (const X of ["R", "L"]) { const h = b["thigh_" + X].j, a = b["foot_" + X].j, L = hyp(h[0] - a[0], h[1] - a[1], h[2] - a[2]); if (m === "OLD") reachO = Math.max(reachO, L); else reachC = Math.max(reachC, L); }
  console.log(`${id.padEnd(17)} largest root correction within one stance ${(worst.v * 100).toFixed(1).padStart(6)} cm ${worst.who ? `(${worst.who} ${worst.foot} at +${worst.t} s${worst.conflict ? ", CONFLICT" : ""})` : ""} · longest hip→ankle OLD ${(reachO * 100).toFixed(1)} cm, OCC ${(reachC * 100).toFixed(1)} cm`); }
