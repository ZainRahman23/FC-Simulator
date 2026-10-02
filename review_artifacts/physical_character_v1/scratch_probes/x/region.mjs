import * as S from "/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v1/sandbox/visual/physchar/tools/stepper/surrogate.mjs";
import { modelPredict } from "/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v1/sandbox/visual/physchar/pc_stepper.js";
const rows = S.loadRows(process.argv.slice(2)), C = { tf: 0, tl: 0.10, tv: 0.45, sv: 0.06 }, J = (z) => S.J0({ "xi.0": z.xi[0], "xi.1": z.xi[1], "v.0": z.v[0] }, C);
const G = S.GROUPS, F = [...G.cp, ...G.com, ...G.feet, ...G.L, ...G.pose];
for (const cap of [Infinity, 200, 50, 25]) { const inR = (r) => J(r.z) < cap, sub = rows.filter(r => inR(r)); const starts = [...new Set(rows.map(r => r.start))], errs = {}, errAll = {};
  for (const s of starts) { const tr = sub.filter(r => r.start !== s && !r.fell && r.z1 && J(r.z1) < cap), te = rows.filter(r => r.start === s && !r.fell && r.z1);
    const M = S.fit(Object.assign(tr, { decisions: [] }), { kind: "quad", F, lam: 1 });
    for (const r of te) { const p = modelPredict(M, r.z, r.u), good = inR(r) && J(r.z1) < 25; for (const t of ["xi.0", "xi.1", "v.0"]) { const e = p.y[t] - (t === "xi.0" ? r.z1.xi[0] : t === "xi.1" ? r.z1.xi[1] : r.z1.v[0]); if (good) (errs[t] = errs[t] || []).push(e); } } }
  console.log(`train cap J<${cap}: ` + Object.entries(errs).map(([t, e]) => `${t} rmse ${(100 * Math.sqrt(e.reduce((a, v) => a + v * v, 0) / e.length)).toFixed(2)} cm med|e| ${(100 * e.map(Math.abs).sort((a, b) => a - b)[e.length >> 1]).toFixed(2)} (n ${e.length})`).join(" · ")); }
