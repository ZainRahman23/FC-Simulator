// per-decision IN-SAMPLE smoothness: at one state, fit next-state targets as a quadratic in u over the candidates actually simulated; the residual is
// the part of the response no smooth function of the command (at that state) can represent
import * as S from "/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v1/sandbox/visual/physchar/tools/stepper/surrogate.mjs";
const rows = S.loadRows(process.argv.slice(2)), C = { tf: 0, tl: 0.10, tv: 0.45, sv: 0.06 }, J = (z) => S.J0({ "xi.0": z.xi[0], "xi.1": z.xi[1], "v.0": z.v[0] }, C);
const T = { "xi.0": z => z.xi[0], "xi.1": z => z.xi[1], "v.0": z => z.v[0], dur: null, achF: z => -z.swFoot[0], vBar: z => z.mem ? z.mem.vBar : null }, res = {}, spr = {}, resL = {};
for (const d of rows.decisions) { if (J(d.z) > 50) continue; const cs = d.cands.filter(r => !r.fell && r.z1 && J(r.z1) < 50); if (cs.length < 12) continue;
  const ub = cs.map(r => r.u), X = (u) => [1, u[0], u[1], u[2], u[0] * u[0], u[2] * u[2], u[0] * u[2], u[1] * u[0]], XL = (u) => [1, u[0], u[1], u[2]];
  for (const [t, f] of Object.entries(T)) { const y = cs.map(r => t === "dur" ? r.z1.t - r.z.t : f(r.z1)); if (y.some(v => v == null)) continue;
    for (const [nm, Xf, R] of [["quad", X, res], ["lin", XL, resL]]) { const W = S.ridge(ub.map(Xf), y.map(v => [v]), 1e-6); const e = ub.map((u, i) => Xf(u).reduce((a, x, j) => a + x * W[j][0], 0) - y[i]); (R[t] = R[t] || []).push(...e); }
    const m = y.reduce((a, b) => a + b, 0) / y.length; (spr[t] = spr[t] || []).push(Math.sqrt(y.reduce((a, b) => a + (b - m) ** 2, 0) / y.length)); } }
const rms = (a) => Math.sqrt(a.reduce((x, y) => x + y * y, 0) / a.length), mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
for (const t of Object.keys(res)) console.log(`${t.padEnd(6)} true spread across candidates ${(100 * mean(spr[t])).toFixed(2)} · residual of a per-state LINEAR fit in u ${(100 * rms(resL[t])).toFixed(2)} · QUADRATIC ${(100 * rms(res[t])).toFixed(2)} (cm, cm/s, cs)  [n ${res[t].length}]`);
