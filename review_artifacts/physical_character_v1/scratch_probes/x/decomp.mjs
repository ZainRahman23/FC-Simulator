import * as S from "/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v1/sandbox/visual/physchar/tools/stepper/surrogate.mjs";
import { modelPredict } from "/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v1/sandbox/visual/physchar/pc_stepper.js";
const rows = S.loadRows(process.argv.slice(2)), C = { tf: 0, tl: 0.10, tv: 0.45, sv: 0.06 }, J = (z) => S.J0({ "xi.0": z.xi[0], "xi.1": z.xi[1], "v.0": z.v[0] }, C);
const G = S.GROUPS, sets = { "+pose": [...G.cp, ...G.com, ...G.feet, ...G.L, ...G.pose], "+mem": [...G.cp, ...G.com, ...G.feet, ...G.L, ...G.pose, ...G.load, ...G.mem] };
const T = ["xi.0", "xi.1", "v.0", "mem.vBar"], tv = (r, t) => t === "xi.0" ? r.z1.xi[0] : t === "xi.1" ? r.z1.xi[1] : t === "v.0" ? r.z1.v[0] : r.z1.mem.vBar;
for (const [nm, F] of Object.entries(sets)) for (const kind of ["lin", "quad"]) { const starts = [...new Set(rows.map(r => r.start))], sh = { "xi.0": [], "xi.1": [], "v.0": [], "mem.vBar": [] }, cd = { "xi.0": [], "xi.1": [], "v.0": [], "mem.vBar": [] }, spread = { "xi.0": [], "xi.1": [], "v.0": [], "mem.vBar": [] };
  for (const s of starts) { const tr = rows.filter(r => r.start !== s && !r.fell && r.z1 && J(r.z) < 50 && J(r.z1) < 50), M = S.fit(Object.assign(tr, { decisions: [] }), { kind, F, lam: 1 });
    for (const d of rows.decisions.filter(d => d.start === s && J(d.z) < 50)) { const cs = d.cands.filter(r => !r.fell && r.z1 && J(r.z1) < 50); if (cs.length < 4) continue;
      for (const t of T) { const e = cs.map(r => modelPredict(M, r.z, r.u).y[t] - tv(r, t)), m = e.reduce((a, b) => a + b, 0) / e.length, tr_ = cs.map(r => tv(r, t)), mt = tr_.reduce((a, b) => a + b, 0) / tr_.length;
        sh[t].push(m); for (const x of e) cd[t].push(x - m); spread[t].push(Math.sqrt(tr_.reduce((a, b) => a + (b - mt) ** 2, 0) / tr_.length)); } } }
  const rms = (a) => Math.sqrt(a.reduce((x, y) => x + y * y, 0) / a.length), mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  console.log(`${nm.padEnd(12)} ${kind.padEnd(5)} ` + T.map(t => `${t}: shared ${(100 * rms(sh[t])).toFixed(2)} · per-candidate ${(100 * rms(cd[t])).toFixed(2)} · true spread across candidates ${(100 * mean(spread[t])).toFixed(2)} cm`).join(" | ")); }
