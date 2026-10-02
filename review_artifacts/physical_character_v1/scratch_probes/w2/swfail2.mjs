// re-run identification runs whose swing failed after a long previous step from a sane state; trace the failing swing
import fs from "fs"; import { f3, W, spec, M, bi, C, J, poses } from "./lib.mjs";
const { Q, V } = M; const D = JSON.parse(fs.readFileSync(process.argv[2], "utf8")), box = spec.bodies[bi("foot_R")].shapes[0];
const INNER = { kXiAlong: -1, kXiAcross: -1, kXiDS: -1, dsLead: true, dsFlat: false };
let shown = 0;
for (const run of D.runs) { if (shown >= 3) break; const R = Object.fromEntries(run.rows.map(r => [r.k, r]));
  for (const k of Object.keys(R).map(Number)) { const a = R[k], p = R[k - 1]; if (k < 2 || !p || !p.foothold || !a.atStart || !a.upright) continue;
    const fail = a.lift == null || a.td == null || a.td - a.lift < 0.2; const v = a.atStart.v[0]; if (!fail || p.foothold[0] < 0.34 || v < 0.3 || v > 0.65 || Math.abs(a.atStart.xiS[1] - 0.08) > 0.06) continue;
    shown++; const res = C.runChar(J, spec, poses, { speed: 0.6, n: 5, walkOver: INNER, humanOver: D.human || {}, steps: run.steps, push: run.push, seconds: 1.6 + 5 * 0.6 });
    console.log(`== run ${run.i} step ${k}: prev step ${f3(p.foothold[0])} m, v ${f3(v, 2)}, swing ${a.lift != null && a.td != null ? f3(a.td - a.lift, 2) : "none"} (hash ${res.hash === run.hash ? "reproduced" : "DIFFERENT"})`);
    break; } }
