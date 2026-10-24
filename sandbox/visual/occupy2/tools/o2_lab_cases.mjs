// occupy2/tools/o2_lab_cases.mjs — the Stage 2 Review Lab's cases computed in node (the same runs, the same live poses): per case and mode the
// deepest resolved penetration, the ticks beyond the hard limit, the outcome, the ball contacts THROUGH a body, the touches / boots blocked, the
// largest support consistency error — the browser check (o2_browser.cjs) compares the page's numbers with these.   node o2_lab_cases.mjs --out f
import { ENV } from "../../occupy1/tools/o_env.mjs";
import { O2CASES } from "../o2_cases.js";
import { runO2, outcomeO2 } from "../o2_run.js";
import { measureRun, summary } from "../../occupy1/tools/o_measure.mjs";
import fs from "node:fs";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, out = [], DT = 1 / 240, hyp = Math.hypot;
// (the Lab's support ledger: the executed root displacement accumulated per planted stance, the largest)
function sceOf(r, E) { const W = r.W, k0 = Math.round(r.clip[0] / DT), k1 = Math.round(r.clip[1] / DT); let mx = 0; for (const [key, p] of [["ATT", W.att], ["DEF", W.def]]) { const led = {};
    for (let k = k0; k <= k1; k++) { if (!W.frames.get(k)) continue; const t = k * DT, P = p.planAt(t), e = E.get(k); for (const X of ["R", "L"]) { const s = P.stances[X].find((q) => q.t0 <= t + 1e-9 && q.t1 > t + 1e-9); if (!s) { led[X] = null; continue; } const kk = X + s.id + "@" + s.t0.toFixed(4); if (!led[X] || led[X].key !== kk) led[X] = { key: kk, v: [0, 0] }; if (e) { led[X].v[0] += e[key][0]; led[X].v[1] += e[key][1]; } mx = Math.max(mx, hyp(led[X].v[0], led[X].v[1])); } } } return mx; }
for (const tc of O2CASES) { const row = { id: tc.id, runs: {} };
  for (const m of ["OLD", "S1", "S2"]) { const E = new Map(), before = (W) => { if (!W.occOn) return; const sp = W.shiftPlan.bind(W); W.shiftPlan = (p, d, t, ...a) => { const P = p.plan, i1 = Math.min(P.n, Math.max(0, Math.round((t - P.t0) / DT)) + 1), b = [P.P[2 * i1], P.P[2 * i1 + 1]], o = sp(p, d, t, ...a), k = Math.round(t / DT), key = p === W.att ? "ATT" : "DEF", q = E.get(k) || { ATT: [0, 0], DEF: [0, 0] }; q[key][0] += P.P[2 * i1] - b[0]; q[key][1] += P.P[2 * i1 + 1] - b[1]; E.set(k, q); return o; }; };
    const r = runO2(ENV, tc, m, { before }), S = summary(measureRun(ENV, r.W, r.clip), r.t0), o = outcomeO2(r.W); row.runs[m] = { best: +Math.max(0, S.best ? S.best.pen : 0).toFixed(5), over5: S.nHard, out: o ? o.kind : null, through: S.through.length, blocked: r.W.occOn ? r.W.occ.blocked : 0, sce: +sceOf(r, E).toFixed(5) }; }
  out.push(row); process.stderr.write("."); }
fs.writeFileSync(arg("out"), JSON.stringify(out, null, 1)); console.log(`\n${out.length} cases → ${arg("out")}`);
